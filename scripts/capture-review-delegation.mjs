// 维护审核委派功能截图:4 张视图
// 运行(dev server 必须先在 :3000 跑):node scripts/capture-review-delegation.mjs

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

// 切换用户:点击 header 右侧 avatar 的 parent (.ant-dropdown-trigger),
// 然后点击 dropdown 菜单中的名字。**仅在当前页内 React 状态更新,不触发 reload**。
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
// 14. 维护审核 - 角色负责人视角:行委派按钮 + 审核委派→XX Tag
// 直接打开 review 页(默认 张三 SPM 也有访问权),然后切到赵六(底软),
// 这样页面在切换时只重新渲染 React,不刷新,所以不会丢 user state。
// ===========================================================================
console.log('14. role-owner view (赵六/底软) - 含审核委派→王五 Tag')
await page.goto(`${BASE}/workbench/app-002/review`, { waitUntil: 'networkidle0', timeout: 30000 })
await sleep(1500)
await switchUser('赵六')
// 切换后 React 重新渲染,等表格刷新
await sleep(800)
await shot('14-review-role-owner-with-delegation')

// ===========================================================================
// 15. DelegateModal 弹窗(单条委派)
// ===========================================================================
console.log('15. DelegateModal opened')
await page.evaluate(() => {
  // 行内的「委派」按钮
  const btns = Array.from(document.querySelectorAll('.ant-table-tbody button')).filter(
    (b) => (b.textContent || '').trim() === '委派',
  )
  btns[0]?.click()
})
await sleep(600)
await shot('15-delegate-modal')

// 关闭弹窗(按 Escape)
await page.keyboard.press('Escape')
await sleep(500)

// ===========================================================================
// 16. 批量委派:多选 + 顶部「批量委派」按钮
// ===========================================================================
console.log('16. batch delegate')
// 勾选前 3 行(行内复选框)
await page.evaluate(() => {
  const checkboxes = Array.from(document.querySelectorAll('.ant-table-tbody .ant-checkbox-input'))
  for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
    checkboxes[i].click()
  }
})
await sleep(800)
await shot('16-batch-delegate-bar')

// 清除勾选
await page.evaluate(() => {
  const headerCb = document.querySelector('.ant-table-thead .ant-checkbox-input')
  if (headerCb?.checked) headerCb.click()
})
await sleep(400)

// ===========================================================================
// 17. 被委派人视角(王五):只看到「委派给我的」Collapse
// ===========================================================================
console.log('17. delegate-only view (王五)')
await switchUser('王五')
await sleep(1000)
await shot('17-delegated-to-me-only-view')

await browser.close()
console.log('\n4 张委派功能截图完成,输出到:', OUT)
