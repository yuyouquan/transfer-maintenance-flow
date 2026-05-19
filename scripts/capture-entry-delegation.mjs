// 录入页委派功能截图:4 张视图
// 运行(dev server 必须先在 :3000 跑):node scripts/capture-entry-delegation.mjs

import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:3000'
const OUT = '/Users/shswyuyouquan/Documents/work/transfer-maintenance-flow/docs/screenshots/prd-pms-integration'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  defaultViewport: { width: 1600, height: 1000 },
})
const page = await browser.newPage()
page.on('pageerror', (err) => console.log('[pageerror]', err.message))

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`  ✓ ${name}.png`)
}

const switchUser = async (chineseName) => {
  const opened = await page.evaluate(() => {
    const avatar = document.querySelector('.ant-layout-header .ant-avatar')
    const trigger = avatar?.parentElement
    if (trigger) {
      trigger.click()
      return true
    }
    return false
  })
  if (!opened) throw new Error('user dropdown trigger not found')
  await page.waitForSelector('.ant-dropdown-menu', { timeout: 3000 })
  await sleep(300)
  const clicked = await page.evaluate((n) => {
    const items = Array.from(document.querySelectorAll('.ant-dropdown-menu-item'))
    const target = items.find((i) => (i.textContent || '').includes(n))
    if (target) {
      target.click()
      return true
    }
    return false
  }, chineseName)
  if (!clicked) throw new Error(`menu item for "${chineseName}" not found`)
  await sleep(1200)
}

// ===========================================================================
// 18. 录入页 - 角色负责人 + 被委派:SPM 张三在 app-001
// 张三是 SPM 责任人,且收到 3 项底软委派(36/37/6)
// 顶部「委派给我的」Collapse + SPM 主表格同时呈现
// ===========================================================================
console.log('18. role-owner + delegated view (SPM 张三 app-001)')
await page.goto(`${BASE}/workbench/app-001/entry`, { waitUntil: 'networkidle0', timeout: 30000 })
await sleep(1500)
// 张三是默认用户(MOCK_USERS[0]),不需切换
await shot('18-entry-spm-with-delegation')

// ===========================================================================
// 19. 录入页 - 角色负责人(底软 赵六)视角,行内蓝色「录入委派→张三」Tag
// ===========================================================================
console.log('19. role-owner with delegation tag (底软 赵六 app-001)')
await switchUser('赵六')
await sleep(1200)
await shot('19-entry-role-owner-delegated-tag')

// ===========================================================================
// 20. 录入页 DelegateModal 弹窗(无清空委派按钮)
// 切回张三,进入 app-001,点击「委派给我的」行内委派按钮
// ===========================================================================
console.log('20. DelegateModal (no clear button)')
await switchUser('张三')
await sleep(1200)
// 点击「委派给我的」Collapse 中第一行的「委派」按钮
const opened = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).filter(
    (b) => (b.textContent || '').trim() === '委派'
  )
  if (btns[0]) {
    btns[0].click()
    return true
  }
  return false
})
if (!opened) console.log('  [warn] 委派 button not found')
await sleep(700)
await shot('20-entry-delegate-modal-no-clear')

// 关闭弹窗
await page.keyboard.press('Escape')
await sleep(500)

// ===========================================================================
// 21. 录入页 - 无角色但有被委派(纯 Collapse 视图)
// 切换到 u006 孙八(app-001 maintenance SPM,不在 research 团队)。
// app-001 CL index 28 委派给 u006,因此他能进 entry 页但仅显示「委派给我的」Collapse。
// ===========================================================================
console.log('21. delegate-only view (孙八 app-001 entry)')
await switchUser('孙八')
await sleep(1200)
// 滚动到顶部
await page.evaluate(() => window.scrollTo(0, 0))
await sleep(300)
await shot('21-entry-delegated-to-me-only')

await browser.close()
console.log('\n4 张录入页委派截图完成,输出到:', OUT)
