// Run against a production server: npm run build; npm run start -- --port 3001
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW_BASE_URL ?? 'http://localhost:3001';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  defaultViewport: { width: 1800, height: 1100 },
});
const page = await browser.newPage();
const output = new URL('../docs/screenshots/maintenance-spm-review/', import.meta.url);
await mkdir(output, { recursive: true });
const section = '#maintenance-spm-section-approval';
const dialog = '.ant-modal-wrap:not([style*="display: none"])';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

async function clickText(selector, text) {
  const clicked = await page.evaluate((selector, text) => {
    const el = [...document.querySelectorAll(selector)].find(el => el.getClientRects().length
      && el.textContent.replace(/\s/g, '') === text.replace(/\s/g, ''));
    el?.click();
    return Boolean(el);
  }, selector, text);
  assert.ok(clicked, `Missing action: ${text}`);
}

async function switchUser(name) {
  await page.click('.ant-layout-header .ant-dropdown-trigger');
  await page.waitForSelector('.ant-dropdown-menu-item', { visible: true });
  await page.evaluate(name => {
    [...document.querySelectorAll('.ant-dropdown-menu-item:not(.ant-dropdown-menu-item-disabled)')].find(el => el.textContent.includes(name))?.click();
  }, name);
  await page.waitForFunction(name => document.querySelector('.ant-layout-header .ant-dropdown-trigger')?.textContent.includes(name), {}, name);
  await page.mouse.move(400, 80);
  await page.waitForSelector('.ant-dropdown-menu', { hidden: true });
}

async function actionTexts(selector) {
  return page.$$eval(`${selector} button`, els => els.filter(el => el.getClientRects().length).map(el => el.textContent.replace(/\s/g, '')));
}

async function assertTeam(selector) {
  const text = await page.$eval(selector, el => el.innerText);
  assert.ok(!text.includes('SQA'), 'Saved team must not contain SQA');
  assert.equal(await page.$$eval(`${selector} .ant-avatar`, els => els.length), 10, 'Two teams each have five members');
}

async function screenshot(name, selector) {
  await page.waitForSelector('.ant-message-notice', { hidden: true });
  if (selector) await page.$eval(selector, el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: new URL(name, output).pathname });
}

async function returnWorkbench() {
  await clickText('.ant-menu-item', '转维项目');
  await page.waitForFunction(() => location.pathname === '/workbench');
  await page.waitForSelector('tr[data-row-key="app-008"]');
}

try {
  await page.goto(`${base}/workbench`, { waitUntil: 'networkidle0' });
  const content = await page.$eval('body', el => el.innerText);
  assert.ok(content.includes('维护SPM审核'), 'The final node must be named 维护SPM审核');
  assert.ok(!content.includes('SQA审核'));
  assert.ok(!(await actionTexts('tr[data-row-key="app-008"]')).includes('维护SPM审核'), 'Research SPM cannot approve maintenance SPM review');
  await switchUser('孙八');
  assert.ok((await actionTexts('tr[data-row-key="app-008"]')).includes('维护SPM审核'));
  assert.equal(await page.$$eval('.ant-tag', els => els.filter(el => !el.closest('table') && el.textContent.trim() === '维护SPM审核').length), 1, 'Maintenance SPM receives one final review todo');
  await screenshot('workbench-maintenance-spm.png');
  await clickText('tr[data-row-key="app-008"] button', '维护SPM审核');
  await page.waitForFunction(() => location.pathname.endsWith('/maintenance-spm-review'));
  await page.waitForSelector(section);
  await assertTeam('#maintenance-spm-section-team');
  assert.deepEqual(await actionTexts(section), ['不通过', '通过']);
  await screenshot('final-review.png', section);
  await clickText(`${section} button`, '通过');
  await page.waitForSelector(dialog, { visible: true });
  await clickText(`${dialog} .ant-modal-footer button`, '确认通过');
  await page.waitForFunction(() => location.pathname === '/workbench/app-008');
  await page.waitForSelector('#section-team');
  await assertTeam('#section-team');
  assert.ok((await page.$eval('body', el => el.innerText)).includes('维护SPM审核通过，进入信息变更阶段'));
  await returnWorkbench();
  assert.ok(!(await actionTexts('tr[data-row-key="app-008"]')).includes('维护SPM审核'));
  assert.equal(await page.$$eval('.ant-tag', els => els.filter(el => !el.closest('table') && el.textContent.trim() === '维护SPM审核').length), 0, 'Completed approval removes its todo');
  console.log('PASS: task-specific maintenance SPM access, dynamic todo and approval transition');

  // Reload a fresh fixture and verify both new and legacy routes enforce permissions.
  await page.goto(`${base}/workbench/app-008/sqa-review`, { waitUntil: 'networkidle0' });
  assert.ok(page.url().endsWith('/maintenance-spm-review'));
  for (const user of ['张三', '王五', '李四']) {
    await switchUser(user);
    assert.deepEqual(await actionTexts(section), []);
    assert.equal(await page.$eval(`${section} textarea`, el => el.disabled), true);
  }
  await switchUser('孙八');
  await clickText(`${section} button`, '不通过');
  await page.waitForSelector(dialog, { visible: true });
  await clickText(`${dialog} .ant-modal-footer button`, '确认不通过');
  assert.ok(page.url().endsWith('/maintenance-spm-review'), 'Empty rejection reason cannot terminate the task');
  await clickText(`${dialog} .ant-modal-footer button`, '取消');
  await page.waitForSelector(dialog, { hidden: true });
  await page.type(`${section} textarea`, '最终交接资料未达到维护要求');
  await clickText(`${section} button`, '不通过');
  await page.waitForSelector(dialog, { visible: true });
  await clickText(`${dialog} .ant-modal-footer button`, '确认不通过');
  await page.waitForFunction(() => location.pathname === '/workbench/app-008');
  await page.waitForSelector('#section-team');
  const failed = await page.$eval('body', el => el.innerText);
  assert.ok(failed.includes('维护SPM审核未通过，转维流程已终止'));
  assert.ok(failed.includes('最终交接资料未达到维护要求'));
  console.log('PASS: legacy-route permissions, rejection reason required and failed state read-back');

  // A domain rejection only offers termination, never final approval.
  await page.goto(`${base}/workbench/app-002/maintenance-spm-review`, { waitUntil: 'networkidle0' });
  assert.deepEqual(await actionTexts(section), ['不通过']);
  await page.type(`${section} textarea`, '领域整改未完成，重新发起');
  await clickText(`${section} button`, '不通过');
  await page.waitForSelector(dialog, { visible: true });
  await clickText(`${dialog} .ant-modal-footer button`, '确认不通过');
  await page.waitForFunction(() => location.pathname === '/workbench/app-002');
  await clickText('button', '重新发起转维申请');
  await page.waitForFunction(() => location.pathname === '/workbench/apply');
  await page.waitForSelector('form .ant-card .ant-select');
  assert.equal(await page.$$eval('form .ant-card .ant-select', els => els.length), 10);
  assert.ok(!(await page.$eval('form', el => el.innerText)).includes('SQA'));
  await screenshot('reopen-team.png');
  console.log('PASS: rejection mode and reopened task configuration omit SQA');

  // A new application persists exactly the five paired roles and chosen maintenance SPM.
  await page.goto(`${base}/workbench/apply`, { waitUntil: 'networkidle0' });
  await page.click('#projectId');
  await page.waitForSelector('.ant-select-item-option', { visible: true });
  await page.evaluate(() => [...document.querySelectorAll('.ant-select-item-option')].find(el => el.textContent.includes('X6980'))?.click());
  await page.waitForSelector('form .ant-card .ant-select');
  assert.equal(await page.$$eval('form .ant-card .ant-select', els => els.length), 10);
  assert.ok(!(await page.$eval('form', el => el.innerText)).includes('SQA'));
  // Clear maintenance SPM and make sure form validation blocks an ownerless final review.
  const maintenanceSpmSelect = (await page.$$('form .ant-card .ant-select'))[1];
  await maintenanceSpmSelect.hover();
  await (await maintenanceSpmSelect.$('.ant-select-clear')).click();
  await page.type('#plannedReviewDate', '2026-10-01');
  await page.keyboard.press('Enter');
  await clickText('button', '提交');
  await page.waitForFunction(() => document.body.innerText.includes('请选择维护SPM，负责维护SPM审核'));
  assert.ok(page.url().endsWith('/apply'));
  await (await page.$$('form .ant-card .ant-select'))[1].click();
  // Ant Design can retain the hidden project dropdown while the member dropdown opens.
  await page.waitForFunction(() => [...document.querySelectorAll('.ant-select-item-option')]
    .some(el => el.getClientRects().length && el.textContent.includes('冯十二')));
  await page.evaluate(() => [...document.querySelectorAll('.ant-select-item-option')].find(el => el.getClientRects().length && el.textContent.includes('冯十二'))?.click());
  await screenshot('create-team.png');
  await clickText('button', '提交');
  await page.waitForFunction(() => location.pathname === '/workbench');
  const createdId = await page.$$eval('tr[data-row-key]', els => els.find(el => /^app-\d{10,}$/.test(el.dataset.rowKey))?.dataset.rowKey);
  assert.ok(createdId, 'New task was saved');
  await clickText(`tr[data-row-key="${createdId}"] button`, '详情');
  await page.waitForSelector('#section-team');
  await assertTeam('#section-team');
  assert.ok((await page.$eval('#section-info', el => el.innerText)).includes('冯十二'));
  await screenshot('saved-team.png', '#section-team');
  console.log('PASS: creation, required maintenance SPM and saved five-role team');
  assert.deepEqual(errors, []);
  console.log('PASS: no browser runtime or console errors');
} catch (error) {
  console.error(error);
  throw error;
} finally {
  const timeout = setTimeout(() => browser.process()?.kill('SIGKILL'), 10000);
  timeout.unref();
  try { await page.close(); await browser.close(); } finally { clearTimeout(timeout); }
}
