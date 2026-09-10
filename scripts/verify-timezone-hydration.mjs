// Run against a server built with TZ=UTC to exercise server/browser timezone differences.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const base = process.env.FLOW_BASE_URL ?? 'http://localhost:3002';
const browser = await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const timezone of ['Asia/Shanghai','America/Los_Angeles']) {
    const page=await browser.newPage();
    await page.emulateTimezone(timezone);
    const errors=[];
    page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
    for(const route of ['/workbench','/workbench/app-002']) {
      await page.goto(base+route,{waitUntil:'networkidle0'});
    }
    console.log(timezone,JSON.stringify(errors));
    assert.deepEqual(errors,[],`Server and browser render identical dates in ${timezone}`);
    // The task history uses the same explicit business timezone in every browser.
    assert.match(await page.$eval('#section-history',el=>el.innerText),/2026\/2\/20 17:00:00/);
    await page.close();
  }
  console.log('PASS: workbench and detail hydration across browser timezones');
} finally {
  const timer=setTimeout(()=>browser.process()?.kill('SIGKILL'),10000);timer.unref();
  try {await browser.close();} finally {clearTimeout(timer);}
}
