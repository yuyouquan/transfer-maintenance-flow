/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * 批量生成 PRD 文档所用截图。
 *
 * 前提：
 *   - Next.js dev server 已运行在 http://localhost:3001
 *   - 已安装 puppeteer-core (使用本地 Chrome)
 *
 * 运行：  node scripts/take-screenshots.js
 *
 * 输出：  docs/screenshots/v2/*.png
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'v2');
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };
const CHROME_EXECUTABLE =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_FILE = path.resolve(
  __dirname,
  '..',
  'src',
  'mock',
  'applications.ts',
);
const APP_BACKUP = APP_FILE + '.bak-screenshots';

const STATUS = { succeeded: [], skipped: [], failed: [] };

// ---------- 工具 ----------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function outPath(name) {
  return path.join(OUT_DIR, name);
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label, opts = {}) {
  const { retries = 1 } = opts;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log(`  ! attempt ${i + 1} failed for ${label}: ${err.message}`);
      await wait(500);
    }
  }
  throw lastErr;
}

async function closeAnyModal(page) {
  // Try closing whatever modal/dropdown might be open.
  try {
    await page.keyboard.press('Escape');
    await wait(250);
    await page.keyboard.press('Escape');
    await wait(250);
    // Force-click any visible modal mask to dismiss stragglers.
    await page.evaluate(() => {
      document.querySelectorAll('.ant-modal-wrap').forEach((w) => {
        const el = w;
        // close if visible
        const s = window.getComputedStyle(el);
        if (s.display !== 'none' && s.visibility !== 'hidden') {
          // click close button if present
          const closeBtn = el.querySelector('.ant-modal-close');
          if (closeBtn) closeBtn.click();
        }
      });
    });
    await wait(200);
  } catch {}
}

/** Wait until an Ant Design modal is visible in DOM. Handles both AntD v5 and v6 class names. */
async function waitForModal(page, timeout = 6000) {
  await page.waitForFunction(
    () => {
      const sel = '.ant-modal-container, .ant-modal-content, .ant-modal-confirm';
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return true;
      }
      return false;
    },
    { timeout },
  );
}

async function goto(page, url, opts = {}) {
  const full = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  await page.goto(full, {
    waitUntil: 'networkidle0',
    timeout: 30000,
    ...opts,
  });
  // Give Ant Design a beat to finalize.
  await wait(400);
}

/** Switch current user by clicking the header dropdown. */
async function switchUser(page, userId) {
  // Dropdown is the avatar container in the header.
  // Click it to open.
  const dropdownHandle = await page.$('header .ant-dropdown-trigger, header [class*="ant-dropdown"], header .ant-avatar');
  // Fallback: find the element with user name style
  const avatar = dropdownHandle || (await page.$('header >>> *'));
  if (!avatar) {
    // Click by text search
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return;
      // the user pill is the last child of the header (div containing Avatar)
      const kids = Array.from(header.children);
      const pill = kids[kids.length - 1];
      if (pill) (pill).click();
    });
  } else {
    await avatar.click();
  }
  // Wait for the dropdown menu
  await page.waitForSelector('.ant-dropdown-menu', { visible: true, timeout: 5000 });
  // Click the item with matching data key
  const clicked = await page.evaluate((uid) => {
    const items = Array.from(document.querySelectorAll('.ant-dropdown-menu-item'));
    for (const el of items) {
      // Ant Design tags menu items with data-menu-id ending in '-' + id
      const mid = el.getAttribute('data-menu-id') || '';
      if (mid.endsWith('-' + uid) || mid === uid) {
        (el).click();
        return true;
      }
    }
    return false;
  }, userId);
  if (!clicked) {
    throw new Error(`Could not click user menu item for ${userId}`);
  }
  // Close dropdown if still open
  await wait(300);
  await closeAnyModal(page);
  await wait(300);
}

async function screenshot(page, name, opts = {}) {
  const file = outPath(name);
  try {
    await page.screenshot({ path: file, ...opts });
    log(`  ✓ ${name}`);
    STATUS.succeeded.push(name);
  } catch (err) {
    log(`  ✗ ${name}: ${err.message}`);
    STATUS.failed.push({ name, err: err.message });
  }
}

async function runStep(name, fn) {
  log(`\n» ${name}`);
  try {
    await fn();
  } catch (err) {
    log(`  ✗ step failed: ${err.message}`);
    STATUS.failed.push({ name, err: err.message });
  }
}

// ---------- Mock 变更 ----------

function mutateAppFailed() {
  if (!fs.existsSync(APP_BACKUP)) {
    fs.copyFileSync(APP_FILE, APP_BACKUP);
  }
  let src = fs.readFileSync(APP_FILE, 'utf8');
  // Replace the app-002 block's status: 'in_progress' line with 'failed' + failureReason.
  // Use a targeted regex around the app-002 id.
  const MARKER_START = src.indexOf("id: 'app-002'");
  if (MARKER_START === -1) throw new Error('app-002 not found');
  // Find first occurrence of "status: 'in_progress'," after MARKER_START
  const statusIdx = src.indexOf("status: 'in_progress',", MARKER_START);
  if (statusIdx === -1) throw new Error("status not found for app-002");
  const replacement =
    "status: 'failed',\n    failureReason: 'SQA 审核意见：整体材料质量不达标，详细问题清单见附件，请整改后重新发起。',";
  src =
    src.slice(0, statusIdx) +
    replacement +
    src.slice(statusIdx + "status: 'in_progress',".length);
  fs.writeFileSync(APP_FILE, src, 'utf8');
  log('  (mock) app-002 -> status: failed');
}

function restoreAppFile() {
  if (fs.existsSync(APP_BACKUP)) {
    fs.copyFileSync(APP_BACKUP, APP_FILE);
    fs.unlinkSync(APP_BACKUP);
    log('  (mock) applications.ts restored from backup');
  }
}

// ---------- 主流程 ----------

async function main() {
  ensureDir(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_EXECUTABLE,
    defaultViewport: VIEWPORT,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  // Handle dialogs (window.confirm / prompt) automatically.
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  // Silence runtime errors so they don't abort us.
  page.on('pageerror', (err) => log(`  (page error) ${err.message}`));

  // ============================================================
  // Part A — no-failed-app screenshots
  // ============================================================

  // --- 20 顶栏-正常态 ---
  await runStep('20-顶栏-正常态', async () => {
    await goto(page, '/workbench');
    await page.waitForSelector('header', { timeout: 5000 });
    await wait(500);
    await screenshot(page, '20-顶栏-正常态.png', {
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: 64 },
    });
  });

  // --- 21 顶栏-用户切换下拉 ---
  await runStep('21-顶栏-用户切换下拉', async () => {
    await goto(page, '/workbench');
    // Open dropdown
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return;
      const pill = header.children[header.children.length - 1];
      if (pill) (pill).click();
    });
    await page.waitForSelector('.ant-dropdown-menu', { visible: true, timeout: 5000 });
    await wait(300);
    await screenshot(page, '21-顶栏-用户切换下拉.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 22 工作台-全览 (u001) ---
  await runStep('22-工作台-全览', async () => {
    await switchUser(page, 'u001');
    await goto(page, '/workbench');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(600);
    await screenshot(page, '22-工作台-全览.png', { fullPage: false });
  });

  // --- 23 工作台-待办面板展开 (u001) ---
  await runStep('23-工作台-待办面板展开', async () => {
    // todo panel is expanded by default; collapse first then expand again to capture
    // The task says "click expand on collapsed narrow sidebar". We'll first collapse, then expand.
    // Collapse: click the collapse button (right icon) at top of panel
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    // Click the collapse button - find button near 待办任务 header with RightOutlined
    const collapsed = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[title="收起"]'));
      if (btns.length) {
        (btns[0]).click();
        return true;
      }
      return false;
    });
    if (collapsed) {
      await wait(500);
      // Now click the collapsed narrow sidebar to expand.
      await page.evaluate(() => {
        const el = document.querySelector('div[style*="writing-mode"], div[style*="writingMode"]');
        if (el && el.parentElement) (el.parentElement).click();
      });
      await wait(500);
    }
    await screenshot(page, '23-工作台-待办面板展开.png', { fullPage: false });
  });

  // --- 24 工作台-关闭弹窗 (u001) ---
  await runStep('24-工作台-关闭弹窗', async () => {
    await goto(page, '/workbench');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Find a row with 关闭 button, click it.
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ant-table-row button'));
      for (const b of btns) {
        if ((b.textContent || '').trim() === '关闭') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('没有找到"关闭"按钮');
    await waitForModal(page);
    await wait(600);
    await screenshot(page, '24-工作台-关闭弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 26 申请-空态 (u001) ---
  await runStep('26-申请-空态', async () => {
    await goto(page, '/workbench/apply');
    await page.waitForSelector('.ant-form', { timeout: 10000 });
    await wait(400);
    await screenshot(page, '26-申请-空态.png', { fullPage: false });
  });

  // --- 27 申请-选中项目后 (u001) ---
  await runStep('27-申请-选中项目后', async () => {
    await goto(page, '/workbench/apply');
    await page.waitForSelector('.ant-select', { timeout: 10000 });
    await wait(400);
    // Click the project Select to open
    const clicked = await page.evaluate(() => {
      // AntD v6: use .ant-select-content; v5: .ant-select-selector. Fall back to .ant-select.
      const sel =
        document.querySelector('.ant-form-item .ant-select .ant-select-content') ||
        document.querySelector('.ant-form-item .ant-select-selector') ||
        document.querySelector('.ant-form-item .ant-select');
      if (sel) (sel).click();
      return !!sel;
    });
    if (!clicked) throw new Error('找不到项目选择');
    await wait(600);
    // Click the first option
    await page.evaluate(() => {
      const opt = document.querySelector('.ant-select-dropdown .ant-select-item-option');
      if (opt) (opt).click();
    });
    await wait(800);
    await screenshot(page, '27-申请-选中项目后.png', { fullPage: true });
  });

  // --- 29 详情-进行中 (u001 / app-001) ---
  await runStep('29-详情-进行中', async () => {
    await goto(page, '/workbench/app-001');
    await page.waitForSelector('#section-pipeline', { timeout: 10000 });
    await wait(800);
    await screenshot(page, '29-详情-进行中.png', { fullPage: true });
  });

  // --- 32 详情-已取消 (u001 / app-003) ---
  await runStep('32-详情-已取消', async () => {
    await goto(page, '/workbench/app-003');
    await page.waitForSelector('#section-pipeline', { timeout: 10000 });
    await wait(600);
    await screenshot(page, '32-详情-已取消.png', { fullPage: true });
  });

  // --- 33 详情-历史记录 (u001 / app-001) ---
  await runStep('33-详情-历史记录', async () => {
    await goto(page, '/workbench/app-001');
    await page.waitForSelector('#section-history', { timeout: 10000 });
    await page.evaluate(() => {
      const el = document.querySelector('#section-history');
      if (el) (el).scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await wait(600);
    await screenshot(page, '33-详情-历史记录.png', { fullPage: false });
  });

  // --- 34 录入-全览 (u002 / app-001/entry) ---
  await runStep('34-录入-全览', async () => {
    await switchUser(page, 'u002');
    await goto(page, '/workbench/app-001/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '34-录入-全览.png', { fullPage: false });
  });

  // --- 35 录入-角色切换Segmented ---
  await runStep('35-录入-角色切换Segmented', async () => {
    // Switch to u001 (SPM + has items delegated to 张三 on app-001, so might see Segmented)
    // But u001 is SPM role only; try u001 on app-001/entry which has delegated items
    await switchUser(page, 'u001');
    await goto(page, '/workbench/app-001/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(600);
    const hasSeg = await page.$('.ant-segmented');
    if (!hasSeg) {
      log('  (skip) 未出现 Segmented 控件');
      STATUS.skipped.push('35-录入-角色切换Segmented.png (no segmented control visible)');
      return;
    }
    // Clip region around the Segmented + role header
    const box = await page.evaluate(() => {
      const seg = document.querySelector('.ant-segmented');
      if (!seg) return null;
      const r = seg.getBoundingClientRect();
      return { x: Math.max(0, r.x - 40), y: Math.max(0, r.y - 20), w: r.width + 200, h: r.height + 60 };
    });
    if (!box) {
      await screenshot(page, '35-录入-角色切换Segmented.png');
      return;
    }
    await screenshot(page, '35-录入-角色切换Segmented.png', {
      clip: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.min(VIEWPORT.width - Math.round(box.x), Math.round(box.w)),
        height: Math.round(box.h),
      },
    });
  });

  // --- 36 录入-录入弹窗 (u002 / app-001) ---
  await runStep('36-录入-录入弹窗', async () => {
    await switchUser(page, 'u002');
    await goto(page, '/workbench/app-001/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ant-table-row button'));
      for (const b of btns) {
        if ((b.textContent || '').trim() === '录入') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到"录入"按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '36-录入-录入弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 37 录入-委派弹窗 (u002) ---
  await runStep('37-录入-委派弹窗', async () => {
    await goto(page, '/workbench/app-001/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ant-table-row button'));
      for (const b of btns) {
        if ((b.textContent || '').trim() === '委派') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到"委派"按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '37-录入-委派弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 38 录入-AI详情弹窗 (u002) ---
  await runStep('38-录入-AI详情弹窗', async () => {
    // u002 is TPM (测试角色). Check app-001 has 测试's items - but AI detail is for any tag with status.
    // Better: use app-005 where u001 (SPM) has 25 items with AI passed.
    await switchUser(page, 'u001');
    await goto(page, '/workbench/app-005/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Click an AI tag that is NOT "not_started"
    const ok = await page.evaluate(() => {
      // Find all Tag elements in the AI status column with cursor pointer
      const tags = Array.from(document.querySelectorAll('.ant-table-row .ant-tag'));
      for (const t of tags) {
        const style = (t).style.cursor || window.getComputedStyle(t).cursor;
        if (style === 'pointer') {
          (t).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到可点击的 AI 标签');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '38-录入-AI详情弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 39 录入-提交确认弹窗 (u001 / app-005/entry — SPM ready to submit) ---
  await runStep('39-录入-提交确认弹窗', async () => {
    await switchUser(page, 'u001');
    await goto(page, '/workbench/app-005/entry');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Find "提交{角色}审核" button
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const t = (b.textContent || '').trim();
        if (t.startsWith('提交') && t.endsWith('审核')) {
          if (b.disabled) return false;
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) {
      log('  (skip) 提交按钮不可用或未找到');
      STATUS.skipped.push('39-录入-提交确认弹窗.png (submit button unavailable)');
      return;
    }
    // Modal.confirm renders as .ant-modal-confirm
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '39-录入-提交确认弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 40 维护审核-全览 (u001 is maintenance SPM for app-002 which is maintenanceReview in_progress) ---
  await runStep('40-维护审核-全览', async () => {
    await switchUser(page, 'u001');
    await goto(page, '/workbench/app-002/review');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '40-维护审核-全览.png', { fullPage: false });
  });

  // --- 41 维护审核-批量选中 ---
  await runStep('41-维护审核-批量选中', async () => {
    await goto(page, '/workbench/app-002/review');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Click 2 row checkboxes
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('.ant-table-tbody .ant-checkbox-input'));
      for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        (checkboxes[i]).click();
      }
    });
    await wait(400);
    await screenshot(page, '41-维护审核-批量选中.png', { fullPage: false });
  });

  // --- 42 维护审核-通过弹窗 ---
  await runStep('42-维护审核-通过弹窗', async () => {
    await goto(page, '/workbench/app-002/review');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Find the page-level "通过" button (primary button, not batch, near the right side)
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.textContent || '').trim();
        if (txt === '通过' && b.classList.contains('ant-btn-primary')) {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到通过按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '42-维护审核-通过弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 43 维护审核-驳回弹窗 ---
  await runStep('43-维护审核-驳回弹窗', async () => {
    await goto(page, '/workbench/app-002/review');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.textContent || '').trim();
        if (txt === '不通过' && b.classList.contains('ant-btn-dangerous')) {
          (b).click();
          return true;
        }
      }
      // fallback: any "不通过" button
      for (const b of btns) {
        if ((b.textContent || '').trim() === '不通过') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到不通过按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '43-维护审核-驳回弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 44 维护审核-委派弹窗 ---
  await runStep('44-维护审核-委派弹窗', async () => {
    await goto(page, '/workbench/app-002/review');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    // Click page-level 委派 button
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.textContent || '').trim();
        // page-level button contains only "委派"; table-row 委派 also exists. Prefer bigger button.
        if (txt === '委派') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到委派按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '44-维护审核-委派弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 45 SQA审核-正常 (u003 / app-008/sqa-review) ---
  await runStep('45-SQA审核-正常', async () => {
    await switchUser(page, 'u003');
    await goto(page, '/workbench/app-008/sqa-review');
    await page.waitForSelector('#sqa-section-info', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '45-SQA审核-正常.png', { fullPage: true });
  });

  // --- 46 SQA审核-驳回处理模式 (u003 / app-002/sqa-review since app-002 has role rejected + maintenanceReview in progress) ---
  await runStep('46-SQA审核-驳回处理模式', async () => {
    await switchUser(page, 'u003');
    await goto(page, '/workbench/app-002/sqa-review');
    await page.waitForSelector('#sqa-section-info', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '46-SQA审核-驳回处理模式.png', { fullPage: true });
  });

  // --- 47 SQA审核-通过弹窗 (u003 / app-008) ---
  await runStep('47-SQA审核-通过弹窗', async () => {
    await switchUser(page, 'u003');
    await goto(page, '/workbench/app-008/sqa-review');
    await page.waitForSelector('#sqa-section-info', { timeout: 10000 });
    await wait(500);
    // Scroll to bottom where action bar is
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(400);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        if ((b.textContent || '').trim() === '通过' && b.classList.contains('ant-btn-primary')) {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到 SQA 通过按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '47-SQA审核-通过弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 48 SQA审核-驳回弹窗 ---
  await runStep('48-SQA审核-驳回弹窗', async () => {
    await switchUser(page, 'u003');
    await goto(page, '/workbench/app-008/sqa-review');
    await page.waitForSelector('#sqa-section-info', { timeout: 10000 });
    await wait(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(400);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.textContent || '').trim();
        if (txt === '不通过' && b.classList.contains('ant-btn-dangerous')) {
          (b).click();
          return true;
        }
      }
      for (const b of btns) {
        if ((b.textContent || '').trim() === '不通过') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到 SQA 不通过按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '48-SQA审核-驳回弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 49 配置中心-索引 ---
  await runStep('49-配置中心-索引', async () => {
    await switchUser(page, 'u001');
    await goto(page, '/config');
    await wait(700);
    await screenshot(page, '49-配置中心-索引.png', { fullPage: false });
  });

  // --- 50 配置中心-Checklist列表 ---
  await runStep('50-配置中心-Checklist列表', async () => {
    await goto(page, '/config/checklist');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '50-配置中心-Checklist列表.png', { fullPage: false });
  });

  // --- 51 配置中心-版本对比弹窗 ---
  await runStep('51-配置中心-版本对比弹窗', async () => {
    await goto(page, '/config/checklist');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(500);
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        if ((b.textContent || '').trim() === '版本对比') {
          (b).click();
          return true;
        }
      }
      return false;
    });
    if (!ok) throw new Error('未找到版本对比按钮');
    await waitForModal(page);
    await wait(500);
    await screenshot(page, '51-配置中心-版本对比弹窗.png', { fullPage: false });
    await closeAnyModal(page);
  });

  // --- 52 配置中心-评审要素列表 ---
  await runStep('52-配置中心-评审要素列表', async () => {
    await goto(page, '/config/review-elements');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '52-配置中心-评审要素列表.png', { fullPage: false });
  });

  // ============================================================
  // Part B — require mutated app-002 (status: failed)
  // ============================================================

  log('\n== Mutating applications.ts (app-002 -> failed) ==');
  try {
    mutateAppFailed();
  } catch (err) {
    log(`  mutate failed: ${err.message}`);
  }
  // Let Next.js HMR pick it up
  await wait(3500);

  // Re-open workbench to observe new state
  await switchUser(page, 'u001');

  // --- 25 工作台-重开按钮态 ---
  await runStep('25-工作台-重开按钮态', async () => {
    await goto(page, '/workbench');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await wait(600);
    // Filter by 已失败 to ensure row visible
    const ok = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      for (const d of cards) {
        if ((d.textContent || '').trim() === '已失败') {
          // Climb up to the clickable stat card
          let cur = d;
          for (let i = 0; i < 5 && cur.parentElement; i++) {
            cur = cur.parentElement;
            if (cur.getAttribute('onclick') || (cur).onclick) break;
          }
          (cur).click();
          return true;
        }
      }
      return false;
    });
    // Ignore — just wait and capture full page (row with 重开 should appear)
    await wait(600);
    await screenshot(page, '25-工作台-重开按钮态.png', { fullPage: false });
  });

  // --- 28 申请-重开模式 ---
  await runStep('28-申请-重开模式', async () => {
    await goto(page, '/workbench/apply?from=app-002');
    await wait(1200);
    await screenshot(page, '28-申请-重开模式.png', { fullPage: true });
  });

  // --- 30 详情-SQA驳回可重开 ---
  await runStep('30-详情-SQA驳回可重开', async () => {
    await goto(page, '/workbench/app-002');
    await page.waitForSelector('#section-pipeline', { timeout: 10000 });
    await wait(700);
    await screenshot(page, '30-详情-SQA驳回可重开.png', { fullPage: true });
  });

  // --- 31 详情-已重开 (skip, no mock data) ---
  log('\n» 31-详情-已重开  (skipped — no reopened app in mock data)');
  STATUS.skipped.push('31-详情-已重开.png (no reopened app exists in mock data)');

  // ============================================================
  // Cleanup
  // ============================================================

  log('\n== Restoring applications.ts ==');
  try {
    restoreAppFile();
  } catch (err) {
    log(`  restore failed: ${err.message}`);
  }

  await browser.close();

  // ---------- Report ----------

  log('\n================ Summary ================');
  log(`Succeeded: ${STATUS.succeeded.length}`);
  for (const n of STATUS.succeeded) log(`  ✓ ${n}`);
  log(`Skipped:   ${STATUS.skipped.length}`);
  for (const n of STATUS.skipped) log(`  - ${n}`);
  log(`Failed:    ${STATUS.failed.length}`);
  for (const n of STATUS.failed) log(`  ✗ ${n.name || n}: ${n.err || ''}`);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', err);
  try {
    restoreAppFile();
  } catch {}
  process.exit(1);
});
