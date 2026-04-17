# 重开申请自动触发 AI 检查 — 设计文档

- 日期：2026-04-17
- 范围：`src/context/ApplicationContext.tsx` 中的 `reopenApplication`

## 背景

当前 `reopenApplication`（`src/context/ApplicationContext.tsx:245`）在重开失败的转维申请时，会生成新的 checklist / review-element 条目，并从源申请按业务键（`type::checkItem::responsibleRole` / `standard::responsibleRole`）回填 `entryContent`、`deliverables`、`entryStatus`。但 `aiCheckStatus` 始终由 `generateChecklistItems` / `generateReviewElements` 默认为 `'not_started'`，导致原本已通过 AI 检查的条目在重开后需要用户逐条重新触发——体验割裂，且与重开"接着原流程走"的直觉不符。

## 目标

重开时，对源申请中 `entryStatus === 'entered'` 的条目，在新申请里自动触发一次 AI 检查（等价于用户主动提交一次），无需人工介入。

## 非目标

- 不处理 `entryStatus === 'draft'` 或 `'not_entered'` 的条目（草稿语义上未完成录入，跑 AI 检查可能产生误导性结果；与现有流程中 `draft` 不触发 AI 检查保持一致）。
- 不修改 entry 页的 `simulateAiCheck`（仅处理用户主动提交场景，保持原状）。
- 不改动 entry 页的表格 UI 或列配置（现有 `AI_CHECK_STATUS_MAP` 已覆盖 `in_progress` 态）。
- 不修改 `roleProgress` 或管道状态推导逻辑（Context 的 `useMemo` 在条目变更时自动重算，`in_progress` 不计入 `allEnteredAndPassed`，语义正确）。
- 不持久化、不接入真实 AI 服务（当前全量 mock）。

## 设计

### 触发时机

在 `reopenApplication` 内、新条目 state 写入后**立即**异步触发，与重开动作一并完成。用户此时可能仍在 apply 页、也可能还未导航到新申请的 entry 页，均不影响检查推进——状态由 Context 承载，任何消费组件在挂载时都能读到最新的进度。

### 条目筛选

回填阶段，对每一条 `match.entryStatus === 'entered'` 的条目，额外将 `aiCheckStatus` 置为 `'in_progress'`、`aiCheckResult` 清空：

```ts
const shouldAutoCheck = match.entryStatus === 'entered';
return {
  ...item,
  entryContent: match.entryContent,
  deliverables: match.deliverables,
  entryStatus: match.entryStatus,
  aiCheckStatus: shouldAutoCheck ? 'in_progress' : item.aiCheckStatus,
  aiCheckResult: shouldAutoCheck ? undefined : item.aiCheckResult,
};
```

其它条目（`draft` / `not_entered`）走模板默认的 `'not_started'`，无副作用。

### 异步完成

为每一条 `in_progress` 条目单独 `setTimeout(1000 + Math.random() * 1000)`，回调内按与 entry 页 `simulateAiCheck` 对齐的规则判定：

- 90% 概率 `'passed'`，`aiCheckResult = 'AI检查通过，内容符合要求。'`
- 10% 概率 `'failed'`，`aiCheckResult = 'AI检查不通过，请检查内容是否完整或链接是否有效。'`

回调内通过 `setChecklistItems` / `setReviewElements` 更新对应条目（按 `id` 匹配新条目）。

### 跨 checklist / review-element 的协同

两类条目收集逻辑分开处理：
- 在生成 `backfilled` 数组时同步收集需要自动检查的新条目 `id` 列表
- 写入 `setChecklistItems` / `setReviewElements` 之后，对两个列表分别调度 setTimeout

这样两侧互不阻塞、互不依赖彼此的回填结果。

### 失败处理

AI 检查失败（10% 概率）只是更新单条状态为 `'failed'`，不阻断其它条目、不发 message 提示（重开场景是后台自动触发，弹出 toast 会打扰用户）。用户进入 entry 页时会看到对应条目为"不通过"，点击标签可查看 `aiCheckResult`，走现有的整改 → 重新提交路径。

### 无 entered 条目的边界

若回填后没有任何 `'entered'` 条目（极端情况，例如源申请本就未录入即被驳回），两个 id 列表均为空，不调度任何 timeout，无副作用。

## 测试思路

- **单元层面**：`ApplicationContext` 目前无独立测试。手动验证路径：
  1. 找一个 SQA 失败且含 `entered` + `aiCheckStatus: 'passed'` 条目的 mock 申请
  2. 以其 SPM 身份登录，点击重开、提交
  3. 跳到新申请的 entry 页：entered 条目的 AI 检查状态应先显示"检查中"，1–2s 内变成"通过"或"不通过"
  4. `draft` / `not_entered` 条目保持原有 `'not_started'` 状态
  5. `roleProgress` 在全部检查完成前不应为 100%
- **回归**：entry 页用户主动提交的 AI 检查路径不应受影响。

## 实现影响面

仅需改动：
- `src/context/ApplicationContext.tsx` 内 `reopenApplication` 函数

不改动：
- `src/app/workbench/apply/page.tsx`（重开入口，调用方）
- `src/app/workbench/[id]/entry/page.tsx`（消费方，已支持 in_progress 展示）
- 类型、模板、mock 数据、其它 Context 逻辑
