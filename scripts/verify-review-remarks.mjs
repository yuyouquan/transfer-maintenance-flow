// Build and start the production server on :3001, then run this script.
// Override the server with REMARKS_BASE_URL when needed.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const base = process.env.REMARKS_BASE_URL ?? 'http://localhost:3001';
const output = new URL('../docs/screenshots/review-remarks/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  defaultViewport: { width: 1800, height: 1100 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
const main = '.ant-tabs-tabpane-active';
const dialog = '.ant-modal-wrap:not([style*="display: none"])';

async function clickText(selector, text) {
  const clicked = await page.evaluate((selector, text) => {
    const target = [...document.querySelectorAll(selector)].find(el =>
      el.getClientRects().length && el.textContent.replace(/\s+/g, '') === text.replace(/\s+/g, ''));
    target?.click();
    return Boolean(target);
  }, selector, text);
  assert.ok(clicked, `Missing button: ${text}`);
}

async function rows() {
  return page.$$eval(`${main} tr[data-row-key]`, els => els.map(el => ({
    id: el.dataset.rowKey,
    text: el.innerText,
  })));
}

async function openSingle(id, action) {
  await clickText(`${main} tr[data-row-key="${id}"] button`, action);
  await page.waitForSelector(`${dialog} textarea`, { visible: true, timeout: 2000 });
  assert.match(await page.$eval(dialog, el => el.innerText), /备注.*选填/);
}

async function confirm(remark = '') {
  if (remark) await page.type(`${dialog} textarea`, remark);
  await clickText(`${dialog} .ant-modal-footer button`, '确认');
  await page.waitForSelector(`${dialog} textarea`, { hidden: true });
}

async function switchTab(prefix) {
  await page.evaluate(prefix => {
    [...document.querySelectorAll('.ant-tabs-tab-btn')].find(el => el.textContent.startsWith(prefix))?.click();
  }, prefix);
  await page.waitForFunction(prefix => document.querySelector('.ant-tabs-tab-active')?.textContent.startsWith(prefix), {}, prefix);
}

async function switchUser(name) {
  await page.click('.ant-layout-header .ant-dropdown-trigger');
  await page.waitForSelector('.ant-dropdown-menu-item', { visible: true });
  await page.evaluate(name => {
    [...document.querySelectorAll('.ant-dropdown-menu-item')].find(el => el.textContent.includes(name))?.click();
  }, name);
  await page.waitForFunction(name => document.querySelector('.ant-layout-header .ant-dropdown-trigger')?.textContent.includes(name), {}, name);
}

async function cell(id, title, scope = main) {
  return page.$eval(`${scope} tr[data-row-key="${id}"]`, (row, title) => {
    const headers = [...row.closest('table').querySelectorAll('thead th')];
    const index = headers.findIndex(th => th.textContent === title);
    if (index < 0) throw new Error(`Missing column: ${title}`);
    return row.querySelectorAll('td')[index].innerText;
  }, title);
}

async function select(ids) {
  for (const id of ids) await page.click(`${main} tr[data-row-key="${id}"] input[type="checkbox"]`);
}

async function screenshot(name, fullPage = false) {
  await page.evaluate(() => document.querySelectorAll('.ant-table-content').forEach(el => { el.scrollLeft = el.scrollWidth; }));
  await page.waitForSelector('.ant-message-notice', { hidden: true });
  await page.screenshot({ path: new URL(name, output).pathname, fullPage });
}

async function verifyBatch(label) {
  const before = await rows();
  const ids = before.slice(0, 2).map(row => row.id);
  for (const action of ['通过', '不通过']) {
    await select(ids);
    await clickText('button', `批量${action} (2)`);
    await page.waitForSelector(`${dialog} textarea`, { visible: true });
    if (action === '通过') {
      await page.keyboard.press('Escape');
      await page.waitForSelector(`${dialog} textarea`, { hidden: true });
      assert.deepEqual(await rows(), before);
      assert.equal(await page.$$eval(`${main} input[type="checkbox"]:checked`, els => els.length), 2);
      await clickText('button', '批量通过 (2)');
      await page.waitForSelector(`${dialog} textarea`, { visible: true });
    }
    await confirm(`${label}批量${action}备注`);
    for (const id of ids) {
      assert.equal(await cell(id, '备注'), `${label}批量${action}备注`);
      assert.equal(await cell(id, '审核状态'), action);
    }
    assert.deepEqual((await rows()).slice(2), before.slice(2), 'Batch must preserve unselected rows');
    assert.equal(await page.$$eval(`${main} input[type="checkbox"]:checked`, els => els.length), 0);
  }
  console.log(`PASS: ${label} batch pass/reject, remark fan-out, cancellation and selection cleanup`);
  return ids;
}

async function openEntryFromWorkbench(appId) {
  await clickText('.ant-menu-item', '转维项目');
  await page.waitForSelector(`tr[data-row-key="${appId}"]`);
  await clickText(`tr[data-row-key="${appId}"] button`, '录入');
  await page.waitForFunction(() => location.pathname.endsWith('/entry'));
  await page.waitForSelector('tr[data-row-key]');
}

try {
  await page.goto(`${base}/workbench/app-002/review`, { waitUntil: 'networkidle0' });
  await page.waitForSelector(`${main} tr[data-row-key]`);
  const before = await rows();
  const first = before[0];
  await openSingle(first.id, '拒绝');
  assert.deepEqual(await rows(), before, 'Opening the remark modal must not update records');
  await page.type(`${dialog} textarea`, '取消时不保存');
  await clickText(`${dialog} .ant-modal-footer button`, '取消');
  await page.waitForSelector(`${dialog} textarea`, { hidden: true });
  assert.deepEqual(await rows(), before, 'Cancelling must leave every record unchanged');
  await openSingle(first.id, '拒绝');
  assert.equal(await page.$eval(`${dialog} textarea`, el => el.value), '');
  await confirm('  请补充归档链接\n并检查访问权限  ');
  const after = await rows();
  assert.match(after[0].text, /请补充归档链接\s+并检查访问权限/);
  assert.equal(await page.$eval(`${main} tr[data-row-key="${first.id}"] td:nth-last-child(2)`, el => el.textContent), '请补充归档链接\n并检查访问权限');
  assert.match(after[0].text, /不通过/);
  assert.deepEqual(after.slice(1), before.slice(1), 'Single review must only update its target');
  await openSingle(first.id, '通过');
  await confirm('   ');
  assert.doesNotMatch((await rows())[0].text, /请补充归档链接/);
  console.log('PASS: single review, optional remarks, cancellation and targeted updates');
  const checklistIds = await verifyBatch('转维材料');
  await switchTab('评审要素');
  const elementBefore = await rows();
  const elementId = elementBefore[0].id;
  const templateRemark = await cell(elementId, '模板备注');
  for (const action of ['通过', '拒绝']) {
    await openSingle(elementId, action);
    await confirm(`评审要素单条${action}备注`);
    assert.equal(await cell(elementId, '备注'), `评审要素单条${action}备注`);
    assert.equal(await cell(elementId, '审核状态'), action === '拒绝' ? '不通过' : '通过');
  }
  const elementIds = await verifyBatch('评审要素');
  assert.equal(await cell(elementId, '模板备注'), templateRemark);
  await screenshot('review-saved.png', true);
  await openSingle(elementId, '通过');
  await page.type(`${dialog} textarea`, '已核对交付材料，符合要求。');
  await screenshot('remark-modal.png');
  await page.keyboard.press('Escape');
  await page.waitForSelector(`${dialog} textarea`, { hidden: true });

  // Pure delegated reviewer has no maintenance role, but can review both item types.
  await switchUser('周九');
  assert.equal(await page.$(main), null);
  const delegatedIds = await page.$$eval('tr[data-row-key]', els => els.map(el => el.dataset.rowKey));
  assert.equal(delegatedIds.length, 2);
  for (const id of delegatedIds) {
    await clickText(`tr[data-row-key="${id}"] button`, '拒绝');
    await page.waitForSelector(`${dialog} textarea`, { visible: true });
    await confirm('委派审核：请补充材料');
    assert.equal(await cell(id, '备注', 'body'), '委派审核：请补充材料');
  }
  console.log('PASS: delegate-only review and remark display for both item types');

  // Navigate through existing UI so context state is preserved across pages.
  await switchUser('冯十二');
  await openEntryFromWorkbench('app-002');
  for (const id of checklistIds) assert.equal(await cell(id, '备注'), '转维材料批量不通过备注');
  await screenshot('entry-rejected-remarks.png', true);
  await clickText(`${main} tr[data-row-key="${checklistIds[0]}"] button`, '录入');
  await page.waitForSelector(`${dialog} textarea`, { visible: true });
  await clickText(`${dialog} .ant-modal-footer button`, '暂存');
  await page.waitForSelector(`${dialog} textarea`, { hidden: true });
  assert.equal(await cell(checklistIds[0], '备注'), '转维材料批量不通过备注');
  assert.equal(await cell(checklistIds[0], '维护审核状态'), '未审核');
  await switchTab('评审要素');
  for (const id of elementIds) assert.equal(await cell(id, '备注'), '评审要素批量不通过备注');
  assert.equal(await cell(elementId, '模板备注'), templateRemark);
  console.log('PASS: entry-page read-back, template preservation and remarks retained during re-entry');

  // app-001 checklist sequence 29 is delegated for entry to 孙八, who has no research role.
  await page.goto(`${base}/workbench/app-001/review`, { waitUntil: 'networkidle0' });
  await switchUser('周九');
  const entryDelegateId = await page.$eval(`${main} tr[data-row-key]`, firstRow => {
    const target = [...firstRow.closest('tbody').querySelectorAll('tr[data-row-key]')]
      .find(row => row.querySelectorAll('td')[1]?.textContent === '29');
    return target?.dataset.rowKey;
  });
  assert.ok(entryDelegateId);
  await openSingle(entryDelegateId, '拒绝');
  await confirm('录入委派项：请补充交付文档');
  await switchUser('孙八');
  await openEntryFromWorkbench('app-001');
  assert.equal(await page.$(main), null);
  assert.equal(await cell(entryDelegateId, '备注', 'body'), '录入委派项：请补充交付文档');
  console.log('PASS: delegate-only entry page reads the matching rejection remark');
  assert.deepEqual(errors, [], 'Browser runtime and console errors');
  console.log('PASS: no browser runtime or console errors');
} catch (error) {
  console.error(error);
  throw error;
} finally {
  const closeTimeout = setTimeout(() => browser.process()?.kill('SIGKILL'), 10000);
  closeTimeout.unref();
  try {
    await page.close();
    await browser.close();
  } finally {
    clearTimeout(closeTimeout);
  }
}
