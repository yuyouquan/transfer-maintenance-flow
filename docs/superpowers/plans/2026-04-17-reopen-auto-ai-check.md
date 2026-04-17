# 重开申请自动触发 AI 检查 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当 SPM/管理员重开一个失败的转维申请时，对源申请中已录入（`entryStatus === 'entered'`）的条目自动触发一次 AI 检查（mock 模拟），无需用户再逐条点击提交。

**Architecture:** 只改动 `src/context/ApplicationContext.tsx` 中的 `reopenApplication`。在回填条目时对 `entered` 条目设置 `aiCheckStatus: 'in_progress'`，并把这些新条目的 id 收集起来；state 写入后，对每个 id 调度独立 `setTimeout` 模拟 AI 检查完成（90% 通过 / 10% 失败），与现有 entry 页 `simulateAiCheck` 的行为对齐。

**Tech Stack:** TypeScript, React 19, Next.js App Router，全量 mock 数据（无后端、无测试框架）。

**Spec:** `docs/superpowers/specs/2026-04-17-reopen-auto-ai-check-design.md`

**测试方式说明:** 本项目没有配置自动化测试框架（package.json 无 jest/vitest），质量验证通过：
1. `npm run type-check` — 类型正确性
2. `npm run lint` — 代码规范
3. 手动 UI 验证 — 按指定步骤在浏览器中复现重开流程并观察状态变化

---

## Task 1: 修改 reopenApplication 以自动触发 AI 检查

**Files:**
- Modify: `src/context/ApplicationContext.tsx:245-298` (函数 `reopenApplication`)

### Step 1: 读取现有实现以对齐改动位置

- [ ] **读取现有 `reopenApplication` 代码**

打开 `src/context/ApplicationContext.tsx`，定位 `reopenApplication` 函数（约第 245–298 行）。当前逻辑：

```ts
const reopenApplication = useCallback((sourceId: string, newApp: TransferApplication) => {
  // Generate fresh items from the latest templates for the new application.
  const freshChecklist = generateChecklistItems(
    newApp.id, newApp.team.research, newApp.team.maintenance,
  );
  const freshReviewElements = generateReviewElements(
    newApp.id, newApp.team.research, newApp.team.maintenance,
  );

  setChecklistItems((prev) => {
    const sourceItems = prev.filter((i) => i.applicationId === sourceId);
    const sourceByKey = new Map(
      sourceItems.map((i) => [`${i.type}::${i.checkItem}::${i.responsibleRole}`, i]),
    );
    const backfilled = freshChecklist.map((item) => {
      const match = sourceByKey.get(`${item.type}::${item.checkItem}::${item.responsibleRole}`);
      if (!match) return item;
      return {
        ...item,
        entryContent: match.entryContent,
        deliverables: match.deliverables,
        entryStatus: match.entryStatus,
      };
    });
    return [...prev, ...backfilled];
  });

  setReviewElements((prev) => {
    const sourceItems = prev.filter((i) => i.applicationId === sourceId);
    const sourceByKey = new Map(
      sourceItems.map((i) => [`${i.standard}::${i.responsibleRole}`, i]),
    );
    const backfilled = freshReviewElements.map((item) => {
      const match = sourceByKey.get(`${item.standard}::${item.responsibleRole}`);
      if (!match) return item;
      return {
        ...item,
        entryContent: match.entryContent,
        deliverables: match.deliverables,
        entryStatus: match.entryStatus,
      };
    });
    return [...prev, ...backfilled];
  });

  setBaseApplications((prev) => [
    newApp,
    ...prev.map((app) =>
      app.id === sourceId ? { ...app, reopenedAsId: newApp.id } : app,
    ),
  ]);
}, []);
```

确认位置后进入下一步。

### Step 2: 添加 AI 检查模拟辅助函数

- [ ] **在 `reopenApplication` 之前新增一个模块级辅助函数 `simulateAutoAiCheck`**

在 `src/context/ApplicationContext.tsx` 中，紧挨 `reopenApplication` 上方（约第 244 行，即 `addApplication` 的 `}, []);` 之后、`const reopenApplication = ...` 之前）插入：

```ts
// --- Simulate AI check on auto-triggered items (reopen flow) ---
// Mirrors entry page simulateAiCheck: 1-2s delay, 90% pass / 10% fail, silent (no toast).
function scheduleAutoAiCheck<T extends CheckListItem | ReviewElement>(
  itemId: string,
  setter: React.Dispatch<React.SetStateAction<ReadonlyArray<T>>>,
): void {
  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    const passed = Math.random() > 0.1;
    const aiCheckStatus: AICheckStatus = passed ? 'passed' : 'failed';
    const aiCheckResult = passed
      ? 'AI检查通过，内容符合要求。'
      : 'AI检查不通过，请检查内容是否完整或链接是否有效。';
    setter((prev) =>
      prev.map((item) =>
        item.id === itemId ? ({ ...item, aiCheckStatus, aiCheckResult } as T) : item,
      ),
    );
  }, delay);
}
```

同时确认文件顶部 import 需要包含 `AICheckStatus`。打开当前 imports（约第 4–6 行）：

```ts
import type {
  TransferApplication, CheckListItem, ReviewElement, TeamMember, PipelineRole, RoleNodeStatus,
} from '@/types';
```

改为：

```ts
import type {
  TransferApplication, CheckListItem, ReviewElement, TeamMember, PipelineRole, RoleNodeStatus, AICheckStatus,
} from '@/types';
```

### Step 3: 在 checklist 回填中标记需要自动检查的条目

- [ ] **修改 checklist 的 `setChecklistItems` 块，收集需要自动检查的 id**

定位到 checklist 回填块（现有 `setChecklistItems((prev) => { ... })`），把整块替换为：

```ts
  let checklistAutoCheckIds: string[] = [];
  setChecklistItems((prev) => {
    const sourceItems = prev.filter((i) => i.applicationId === sourceId);
    const sourceByKey = new Map(
      sourceItems.map((i) => [`${i.type}::${i.checkItem}::${i.responsibleRole}`, i]),
    );
    const localIds: string[] = [];
    const backfilled = freshChecklist.map((item) => {
      const match = sourceByKey.get(`${item.type}::${item.checkItem}::${item.responsibleRole}`);
      if (!match) return item;
      const shouldAutoCheck = match.entryStatus === 'entered';
      if (shouldAutoCheck) localIds.push(item.id);
      return {
        ...item,
        entryContent: match.entryContent,
        deliverables: match.deliverables,
        entryStatus: match.entryStatus,
        aiCheckStatus: shouldAutoCheck ? ('in_progress' as const) : item.aiCheckStatus,
        aiCheckResult: shouldAutoCheck ? undefined : item.aiCheckResult,
      };
    });
    checklistAutoCheckIds = localIds;
    return [...prev, ...backfilled];
  });
```

**关键点：**
- `let checklistAutoCheckIds` 声明必须在 `setChecklistItems(...)` 之前、函数体作用域内，后续 Step 5 才能访问
- `localIds` 在 setter 回调内重新创建，赋值给外部变量；React StrictMode 可能二次调用更新函数，每次都用最新的 `localIds` 覆盖，语义一致

### Step 4: 对 review elements 做同样处理

- [ ] **修改 `setReviewElements` 块，收集 review element 的自动检查 id**

以相同模式改写 review elements 的 setter：

```ts
  let reviewAutoCheckIds: string[] = [];
  setReviewElements((prev) => {
    const sourceItems = prev.filter((i) => i.applicationId === sourceId);
    const sourceByKey = new Map(
      sourceItems.map((i) => [`${i.standard}::${i.responsibleRole}`, i]),
    );
    const localIds: string[] = [];
    const backfilled = freshReviewElements.map((item) => {
      const match = sourceByKey.get(`${item.standard}::${item.responsibleRole}`);
      if (!match) return item;
      const shouldAutoCheck = match.entryStatus === 'entered';
      if (shouldAutoCheck) localIds.push(item.id);
      return {
        ...item,
        entryContent: match.entryContent,
        deliverables: match.deliverables,
        entryStatus: match.entryStatus,
        aiCheckStatus: shouldAutoCheck ? ('in_progress' as const) : item.aiCheckStatus,
        aiCheckResult: shouldAutoCheck ? undefined : item.aiCheckResult,
      };
    });
    reviewAutoCheckIds = localIds;
    return [...prev, ...backfilled];
  });
```

### Step 5: setBaseApplications 之后调度模拟任务

- [ ] **在 `setBaseApplications(...)` 之后调用 `scheduleAutoAiCheck`**

在 `reopenApplication` 的末尾（`setBaseApplications((prev) => [...])` 之后、`}, []);` 之前）添加：

```ts
  checklistAutoCheckIds.forEach((id) => scheduleAutoAiCheck(id, setChecklistItems));
  reviewAutoCheckIds.forEach((id) => scheduleAutoAiCheck(id, setReviewElements));
```

### Step 6: 类型检查

- [ ] **运行 `npm run type-check`**

Run: `npm run type-check`

Expected: `tsc --noEmit` 无错误退出（exit 0）。如果出现错误：
- 若提示 `AICheckStatus` 未导出或找不到：检查 `src/types/index.ts` 中确认有 `export type AICheckStatus = ...`，并确认 Step 2 的 import 修改已保存
- 若提示 `scheduleAutoAiCheck` 泛型 setter 类型不匹配：确认 `React.Dispatch<React.SetStateAction<ReadonlyArray<T>>>` 与 `useState<ReadonlyArray<CheckListItem>>` 的 setter 签名一致（它们应一致）
- 若提示 `as T` 断言报错：检查 setter 的 T 是否被正确推断

### Step 7: Lint 检查

- [ ] **运行 `npm run lint`**

Run: `npm run lint`

Expected: ESLint 无 error，仅允许已有的 warnings。

### Step 8: 手动 UI 验证

- [ ] **启动 dev server 并验证重开自动 AI 检查**

前置：由于 mock 数据里没有 `status: 'failed'` 的申请，需要先构造一个。选以下任一路径：

**路径 A（推荐，走完整流程）：**
1. `npm run dev`（如尚未运行）
2. 打开 `http://localhost:3001`（或当前端口）
3. 找一个处于 `sqaReview` 阶段的申请（例如 app-002 或 app-005，需要实际查看 mock 状态）。若没有现成的，可走 app-001 的完整录入→审核→SQA 路径
4. 切换到 SQA 角色用户，打开对应申请的 SQA 审核页，点击"不通过"并填写理由 → 提交
5. 申请 status 变为 `failed`，回到工作台列表
6. 切换到该申请的项目 SPM 或管理员
7. 在列表/详情页点击"重开"
8. 在 apply 页填写必要字段（预填保留），点击提交
9. **验证点**：跳转到新申请的详情/录入页后，打开 checklist 或 review 元素 tab，**原 entered 条目应显示"检查中"状态（蓝色进度图标）**，1–2 秒内逐个变为"通过"或"不通过"
10. 验证 `draft` 条目仍为"未开始"（白色），`not_entered` 条目也是"未开始"

**路径 B（快速，直接构造失败态 mock）：**
1. 在 `src/mock/applications.ts` 找一个有 `entered` 条目的申请（例如 app-002）
2. 临时将其 `status` 改为 `'failed'`、`currentStage` 改为 `'sqaReview'`（或保留原 stage），保存
3. `npm run dev`，列表应显示"失败"申请
4. 切到该申请 SPM → 点击重开 → 提交
5. 进入新申请，验证同路径 A 的第 9 步
6. **验证完成后恢复 mock 数据**：`git checkout src/mock/applications.ts`

**不符合预期的排查：**
- 若所有条目都停在"检查中"不变：检查 Step 5 的 `forEach` 调用是否被 commit，浏览器控制台看是否有 JS 报错
- 若完全看不到"检查中"（直接就是"未开始"）：Step 3/4 的 `aiCheckStatus: 'in_progress'` 没生效，检查是否覆盖到了回填分支
- 若 `draft` 条目也被误改为"检查中"：检查 `shouldAutoCheck = match.entryStatus === 'entered'` 的判断是否完整

### Step 9: 回归验证（entry 页主动提交）

- [ ] **验证原有 entry 页提交 AI 检查未受影响**

在任一 `in_progress` 申请的 entry 页：
1. 打开一个 `not_entered` 条目的录入弹窗
2. 填入内容，点击"确认提交"
3. 应看到 toast "已确认提交，AI检查进行中..."，条目变"检查中"
4. 1–2s 后 toast "AI检查通过"（或不通过），条目变为终态

这条路径走的是 entry 页的 `simulateAiCheck`（未改动），应保持原样。

### Step 10: 提交

- [ ] **提交改动**

```bash
git add src/context/ApplicationContext.tsx
git commit -m "$(cat <<'EOF'
feat: 重开申请时自动触发已录入条目的 AI 检查

重开失败转维申请时，对源申请中 entryStatus='entered' 的条目
自动进入 in_progress 并在 1-2s 后模拟判定 passed/failed，
与 entry 页主动提交的 AI 检查行为一致。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review 记录

- **Spec 覆盖**：Spec 中「触发时机 / 条目筛选 / 异步完成 / 跨两类条目协同 / 失败处理 / 无 entered 边界」均由 Task 1 的 Step 2–5 实现；测试思路由 Step 8–9 覆盖。
- **占位符**：无 TBD/TODO；代码块完整可复制。
- **类型一致**：`AICheckStatus` 已在 import 中加入；setter 类型 `React.Dispatch<React.SetStateAction<ReadonlyArray<T>>>` 与现有 `useState<ReadonlyArray<CheckListItem>>` / `useState<ReadonlyArray<ReviewElement>>` 匹配。
- **命名一致**：`scheduleAutoAiCheck` / `checklistAutoCheckIds` / `reviewAutoCheckIds` 在所有 step 中拼写一致。
