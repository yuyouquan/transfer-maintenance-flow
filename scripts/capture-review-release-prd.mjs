// Capture updated PRD illustrations while preserving mock state across user switches.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const base = process.env.FLOW_BASE_URL ?? 'http://localhost:3001';
const output = new URL('../docs/screenshots/2026-09-10-prd/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({headless: true, executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', defaultViewport:{width:1800,height:1100}});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
async function user(name) {
  await page.click('.ant-layout-header .ant-dropdown-trigger');
  await page.waitForSelector('.ant-dropdown-menu-item', {visible:true});
  await page.evaluate(name => [...document.querySelectorAll('.ant-dropdown-menu-item:not(.ant-dropdown-menu-item-disabled)')].find(el => el.textContent.includes(name))?.click(), name);
  await page.waitForFunction(name => document.querySelector('.ant-layout-header .ant-dropdown-trigger')?.textContent.includes(name), {}, name);
  await page.mouse.move(400,80);
  await page.waitForSelector('.ant-dropdown-menu', {hidden:true});
}
async function click(selector,text) {
  assert.ok(await page.evaluate((selector,text)=>{
    const el=[...document.querySelectorAll(selector)].find(el=>el.getClientRects().length && el.textContent.replace(/\s/g,'')===text);
    el?.click();return Boolean(el);
  },selector,text),`Missing ${text}`);
}
async function shot(name,selector) {
  await page.waitForSelector('.ant-message-notice',{hidden:true});
  if(selector) await page.$eval(selector,el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-84));
  await page.screenshot({path:new URL(name,output).pathname});
}
try {
  await page.goto(`${base}/workbench/app-008`,{waitUntil:'networkidle0'});
  await shot('detail-team.png','#section-team');
  await page.goto(`${base}/workbench/app-002/review`,{waitUntil:'networkidle0'});
  await user('赵六');
  await page.evaluate(()=>document.querySelectorAll('.ant-table-content').forEach(el=>{el.scrollLeft=el.scrollWidth;}));
  await shot('review-owner-delegation.png','.ant-tabs');
  await click('.ant-tabs-tabpane-active tr[data-row-key] button','委派');
  await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])',{visible:true});
  await shot('review-delegate-modal.png');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])',{hidden:true});
  for(const el of (await page.$$('.ant-tabs-tabpane-active tr[data-row-key] input[type=checkbox]')).slice(0,2)) await el.click();
  await shot('review-batch.png','.ant-tabs');
  await user('周九');
  await shot('review-delegate-only.png');
  assert.equal(await page.$$eval('tr[data-row-key]',rows=>rows.length),2);
  await page.goto(`${base}/workbench/app-001/entry`,{waitUntil:'networkidle0'});
  await shot('entry-owner-delegation.png');
  await click('.ant-tabs-tabpane-active tr[data-row-key] button','委派');
  await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])',{visible:true});
  await shot('entry-delegate-modal.png');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])',{hidden:true});
  await user('孙八');
  await shot('entry-delegate-only.png');
  assert.equal(await page.$('.ant-tabs-tabpane-active'),null);
  assert.deepEqual(errors,[]);
  console.log('PASS: current PRD detail, review and entry delegation screenshots captured');
} finally {
  const timer=setTimeout(()=>browser.process()?.kill('SIGKILL'),10000);timer.unref();
  try {await page.close();await browser.close();} finally {clearTimeout(timer);}
}
