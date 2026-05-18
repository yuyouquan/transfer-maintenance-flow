# 资料录入页委派交互对齐审核页

- 创建日期：2026-05-18
- 涉及文件：
  - `src/app/workbench/[id]/entry/page.tsx`
  - `src/components/shared/DelegateModal.tsx`
  - `src/mock/applications.ts`
- 参照实现：`src/app/workbench/[id]/review/page.tsx`（最近 5 次 commit f995c17 / b8129da / dcf3b91 / 55fac06 / 1debd19 已完成）

## 背景

维护审核页（`/workbench/[id]/review`）最近几次迭代把"委派"相关的界面交互整理得相对完整：顶部「委派给我的」跨角色聚合 Collapse、责任人列同时显示原责任人与被委派人姓名、无角色但有被委派项也可访问页面。

资料录入页（`/workbench/[id]/entry`）的委派交互停留在更早的版本：「委派给我的」散布在两个 Tab 内、责任人列只显示「已委派」紫色 Tag 不显示被委派人姓名、委派行为会直接覆盖 `entryPerson`、没有跨角色访问保护。两边表现不一致，被委派人在两个阶段看到的界面差异较大。

## 目标

资料录入页的"被委派"相关界面交互与维护审核页保持一致。明确**不在范围内**的是：录入流程本身（录入 Modal、AI 检查、Block 任务驳回提示等录入页独有内容）。

## 变更概览

### 1. 顶部「委派给我的」Collapse

- 把 Tab 内（`tab=checklist` 和 `tab=review` 各一份的）`委派给我的转维材料 / 委派给我的评审要素` 两个 Collapse **删除**
- 新增**顶部独立 Collapse 卡片**（与审核页 `review/page.tsx:747-799` 等价）：
  - 位置：pipeline 卡片下方、驳回提示卡片下方、主卡片上方
  - 跨角色聚合：从所有 `responsibleRole` 的 items 中筛 `delegatedTo?.includes(currentUser.id)`（与 effectiveRole 无关）
  - 默认展开（`defaultActiveKey: ['delegated-to-me']`）
  - 标题：`委派给我的 (X 项)`，加粗
  - 内部按类型分两段：
    - 转维材料块：标题 + 表格（用 `checklistColumns`）
    - 评审要素块：标题 + 表格（用 `reviewElementColumns`）
  - 两段表格 `size="small"`、`pagination={false}`

### 2. 责任人列

`资料录入-责任人` 列：在原 `entryPerson` 名字旁同时显示两个 Tag：
- 紫色 `已委派` Tag（保留现有，条件 `delegatedTo && delegatedTo.length > 0`）
- 蓝色 `录入委派→<被委派人姓名>` Tag（新增，渲染 `MOCK_USERS.find(u => u.id === delegatedTo?.[0])?.name`）

转维材料、评审要素两套 columns 都改。视觉与审核页 `review/page.tsx:460-480` 对应位置一致，仅文案 `审核委派→` 改为 `录入委派→`。

### 3. 委派语义改为单人替换式

当前 `handleDelegateConfirm`（entry/page.tsx:334-362）：把 `entryPerson/entryPersonId` 覆盖为被委派人，`delegatedTo` 累加去重。

改为与审核页 `reviewDelegatedTo` 完全一致的语义：

```ts
const updateItem = <T>(item: T): T => {
  if (!delegateTarget.ids.includes(item.id)) return item;
  return {
    ...item,
    delegatedTo: toUserId ? [toUserId] : undefined,
    // 不再修改 entryPerson / entryPersonId
  };
};
```

- `entryPerson` / `entryPersonId` 保持原值
- `delegatedTo` 始终是单人或 undefined（替换不累加）
- 单条委派时打开 Modal 回填 `currentAssignee` 支持转委派（与审核页 `openDelegateModal` 一致）
- 不开放清空委派（见改动 4）

### 4. DelegateModal 支持 `allowClear`

`DelegateModal.tsx` 现有底部 `清空委派` 按钮按 `currentAssignee` 是否存在 enable/disable。本次新增 prop：

```ts
export interface DelegateModalProps {
  // ...existing
  /** 是否展示底部「清空委派」按钮，默认 true（审核场景）；录入场景传 false 屏蔽 */
  allowClear?: boolean;
}
```

- 录入页传 `allowClear={false}` → 底部「清空委派」按钮不渲染
- 审核页不传或传 `allowClear={true}` → 维持现状
- `handleDelegateConfirm` 收到 `null` 的情况，录入页早返回（防御性兜底）

### 5. 访问控制

`entry/page.tsx` 新增：

```ts
const delegatedChecklistForMe = ...   // 跨角色筛
const delegatedReviewElementsForMe = ...
const hasDelegatedItems = ... > 0;

const canAccessPage = userResponsibleRoles.length > 0 || hasDelegatedItems;
```

- 无 `userResponsibleRoles` 且无 `hasDelegatedItems` → 渲染"无权访问"Alert（复用审核页文案模板）
- 无 `userResponsibleRoles` 但有委派项 → Header（返回按钮、标题、项目名称）和 Pipeline 卡片正常渲染，只渲染顶部「委派给我的」Collapse；不渲染 Role Segmented Tag / 主 Tab 卡片 / 提交按钮 / 驳回提示（与审核页 `userResponsibleRole && (...)` 守卫一致）
- 有 `userResponsibleRoles` → 现有逻辑保留

操作列按钮可见性按审核页 `review/page.tsx:520-552` 模式：

```ts
const isDelegatedToMe = record.delegatedTo?.includes(currentUser.id) ?? false;
const isRoleOwner = userResponsibleRoles.includes(record.responsibleRole as PipelineRole);
const canEdit = isRoleOwner || isDelegatedToMe;
```

- `录入` / `委派` 按钮仅在 `canEdit && reviewStatus !== 'passed'` 时显示
- `reviewStatus === 'passed'` 时仍显示 `-`（保留现状，与审核页"已通过保留按钮"差异化：录入语义下通过后无需再录入）

### 6. 顶部区域排序

竖直顺序（自上而下）：

1. Header（返回按钮、标题、Role Segmented）
2. Pipeline 卡片
3. 驳回提示 Collapse（仅 `hasRejectedItems` 时）
4. **委派给我的 Collapse**（新增，仅 `hasDelegatedItems` 时）
5. 主卡片（Tabs：转维材料 / 评审要素）

### 7. Mock 数据迁移

`src/mock/applications.ts`：
- `APP001_CL_OVERRIDES[36]`、`[37]`、`APP001_RE_OVERRIDES[6]` 三处现有委派样本依赖旧语义（用 `entryPersonOverride` 把 entryPerson 直接换成"张三"）
- 移除三处 `entryPersonOverride: { id: 'u001', name: '张三' }`
- 保留 `delegatedTo: ['u001']`
- 迁移后效果：
  - 原责任人（赵六/底软，u004）在录入页看到 `entryPerson = 赵六` + `[已委派][录入委派→张三]` 双 Tag
  - 张三（u001）在录入页顶部「委派给我的」Collapse 看到这 3 条跨角色委派项
  - 张三本职角色（SPM）的主表格不受影响

## 不动的范围

明确不修改：
- AI 检查列、AI 检查详情 Modal
- 录入 Modal 本身（暂存 / 确认 / 触发 AI 检查的流程）
- Block 任务驳回提示 Collapse 的样式与内容
- 提交审核流程（含 Modal.confirm 文案、二次提交 Block 任务关闭逻辑）
- 角色 Segmented / 单角色 Tag 切换
- `批量委派` 入口位置（保持在 tabBarExtraContent）
- `操作列已通过保留按钮` —— 录入页保持 `-` 显示（与审核页差异化，因为录入通过后无需再录入）

## 验证场景（实施完成后）

切换为以下用户登录并打开 app-001 录入页：

1. **u004 赵六（底软）** —— 主表格看到 index 36/37 行的 entryPerson 是自己，多出蓝色 `录入委派→张三` Tag；无顶部「委派给我的」Collapse
2. **u001 张三（SPM）** —— SPM 主表格正常显示自己负责的项；顶部出现「委派给我的 (3 项)」Collapse，含转维材料 2 条 + 评审要素 1 条
3. **u005 钱七（系统）** —— 无被委派项，无顶部 Collapse；主表格只显示系统角色项
4. **审核页 u003 王五（SQA）登录 app-002** —— 验证审核页未受 DelegateModal `allowClear` prop 影响，仍可正常清空委派

## 风险与回滚

- `delegatedTo` 字段语义变更（从"累加列表"变成"单人替换"）—— 仅影响录入页的委派 handler，类型定义本身 `ReadonlyArray<string>` 不变；现有 mock 中所有 `delegatedTo` 都是长度 ≤ 1，无破坏性
- mock 数据移除 `entryPersonOverride` 后，若其他页面依赖"被委派后 entryPerson 已被覆盖"的隐式语义，会显示原始责任人 —— 已 grep `entryPersonOverride`，只在 mock 模板使用，无外部依赖
- `DelegateModal` 加 prop 默认 `true`，对审核页零影响
