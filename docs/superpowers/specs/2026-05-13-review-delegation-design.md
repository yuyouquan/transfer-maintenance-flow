# 维护审核委派功能设计文档

- **日期**:2026-05-13
- **作者**:youquan.yu (与 Claude 协作)
- **状态**:已确认,待写实施计划

## 背景与目标

资料录入阶段已经支持「单条 / 多条委派」给任意用户。被委派人能在自己的录入页折叠区内查看和操作委派项。

现在需要在 **维护审核阶段** 也加上同等能力:

- 角色审核负责人可以把审核项委派给任意用户
- 被委派人可以在审核页对委派项进行 **通过 / 驳回** 操作
- 被委派人也可以转委派给他人(replace 语义)
- 委派范围覆盖 **CheckList** 与 **评审要素** 两类条目

## 不在范围内(显式)

- 不做委派/转委派的历史/审计记录(产品方向是历史精简)
- 不做多人同时委派(数据模型保留 `ReadonlyArray<string>`,UI 只用 1 人)
- 不做 SQA 审核阶段的委派(未来如需要,沿用相同模式加 `sqaDelegatedTo`)
- 不抽 `useDelegation` hook 或新增 Context action(`updateChecklistItems` / `updateReviewElements` 已足够)
- 不改变角色级审核进度的计算口径

## 已确认的需求边界

| 维度 | 决议 |
|---|---|
| 委派范围 | CheckList + 评审要素都可委派 |
| 委派发起人 | 角色审核负责人 + 已被委派人(允许转委派) |
| 被委派人范围 | 任意用户 |
| 被委派人操作权限 | 仅可对委派项单条 通过 / 驳回 |
| 历史记录 | 不入历史,仅在条目上显示当前被委派人 |
| 可见性 | 角色审核负责人:看到本角色全貌 + 「委派给我的」Collapse;<br/>非角色审核负责人但有被委派项:仅显示「委派给我的」Collapse |

## 设计

### 1. 数据模型

在 `src/types/index.ts` 的 `CheckListItem` 和 `ReviewElement` 上各增加一个可选字段:

```ts
readonly reviewDelegatedTo?: ReadonlyArray<string>
```

- 与录入阶段的 `delegatedTo` 并列、互不干扰
- 字段为可选,旧数据 / 未委派条目即为 `undefined`,与现状兼容
- 委派、取消委派、转委派都直接覆盖该字段(replace 语义)
- UI 层只允许选 1 人,但保留数组形态以便未来扩展

**为什么不复用 `delegatedTo`**:录入阶段进入审核后,`delegatedTo` 应该视为录入历史的一部分,不该影响审核可见性。隔离字段避免阶段切换时的清空逻辑,语义更直白。

### 2. 共享组件 `DelegateModal`

新增 `src/components/shared/DelegateModal.tsx`,接口:

| Prop | 类型 | 说明 |
|---|---|---|
| `open` | `boolean` | 受控显示 |
| `title` | `string` | 默认「委派」;审核场景传「委派审核」 |
| `selectedCount` | `number` | 已选条目数,展示在文案中 |
| `users` | `User[]` | 候选人列表,允许传任意用户(由调用方筛选/排序) |
| `currentAssignee?` | `string \| null` | 当前被委派人 ID,用于回填 |
| `onConfirm` | `(toUserId: string \| null) => void` | `null` 代表「取消委派」 |
| `onCancel` | `() => void` | 关闭对话框 |

实现要点:
- 内部使用 Ant Design `Modal` + `Select`(单选 + 关键词搜索 + 姓名 / 角色显示)
- 底部按钮:**取消**、**清空委派**(等价 `onConfirm(null)`)、**确定**(等价 `onConfirm(selected)`)
- 不持有领域状态,仅触发回调

**同步重构**:把 `entry/page.tsx`(第 1026-1059 行)的内联对话框替换为 `DelegateModal`。这是抽组件的必然代价,但收益是两端 UI/行为一致。

### 3. 审核页 UI

`src/app/workbench/[id]/review/page.tsx` 改动:

1. **行操作列加「委派」按钮**:可见条件为「当前用户是角色审核负责人 或 当前条目的 `reviewDelegatedTo` 包含当前用户」
2. **顶部加「批量委派」按钮**:与现状的多选机制对齐,选中条目数 > 0 时启用
3. **顶部 Collapse「委派给我的(N 项)」**:跨角色聚合显示当前用户被委派的所有 ReviewElement / CheckListItem;Collapse 内每行支持「通过」「驳回」「(转)委派」
4. **可见性放开**:任何在当前应用上有被委派项的用户(且非角色审核负责人)也允许打开本页

### 4. 可见性规则

| 当前用户身份 | 看到内容 |
|---|---|
| 某角色 X 审核负责人 + 有被委派项 | 角色 X Tab 全貌 + 顶部「委派给我的」Collapse |
| 某角色 X 审核负责人,无被委派项 | 仅角色 X Tab 全貌(现状) |
| 不是任何角色审核人,但有被委派项 | 仅显示「委派给我的」Collapse;Tab 区隐藏或显示空态提示 |
| 都不是 | 无权访问(现状) |

### 5. 操作权限矩阵(maintenanceReview 阶段)

| 操作 | 角色审核负责人 | 被委派人(单条) | 其他人 |
|---|---|---|---|
| 单条 通过/驳回:**非委派项** | ✅ | ❌ | ❌ |
| 单条 通过/驳回:**委派给自己的项** | ✅(可推翻) | ✅ | ❌ |
| 单条/批量委派:**非委派项** | ✅ | ❌ | ❌ |
| 转委派:**委派给自己的项** | ✅ | ✅ | ❌ |
| 角色级提交审核 | ✅ | ❌ | ❌ |

- 角色审核负责人对委派项保留最终覆盖权,因为他对角色级提交负责
- 被委派人不能发起角色级提交
- 转委派使用 replace 语义,链路不保留(与「不入历史」一致)

### 6. 进度联动

- 单条审核状态 (`ReviewStatus`) 推进 `roleProgress`,与现状一致
- 委派与否不影响推进逻辑
- `ApplicationContext` 的 `useEffect` 自动重算,无需改动

### 7. 工作台待办联动

`src/app/workbench/page.tsx` 的查询条件由:

```ts
delegatedTo?.includes(currentUser.id)
```

扩展为:

```ts
(delegatedTo ?? []).includes(uid) || (reviewDelegatedTo ?? []).includes(uid)
```

待办跳转规则:
- 项处于 `dataEntry` 阶段 → 跳录入页
- 项处于 `maintenanceReview` 阶段 → 跳审核页

### 8. 状态变更入口

委派 / 取消委派 / 转委派都通过现有的 `ApplicationContext.updateReviewElements` / `updateChecklistItems` 完成。调用方负责构造新的 `reviewDelegatedTo` 数组,不引入新的 Context action。

## 文件改动清单

**新增**:
- `src/components/shared/DelegateModal.tsx` — 共享委派对话框

**修改**:
- `src/types/index.ts` — `CheckListItem` 和 `ReviewElement` 各加 `reviewDelegatedTo?: ReadonlyArray<string>`
- `src/app/workbench/[id]/review/page.tsx` — 引入 DelegateModal;行加「委派」按钮、顶部批量按钮、「委派给我的」Collapse;放开可见性
- `src/app/workbench/[id]/entry/page.tsx` — 内联委派对话框替换为 `DelegateModal`(同步重构)
- `src/app/workbench/page.tsx` — 待办与查询扩展 `reviewDelegatedTo`

**Mock 数据(可选)**:
- `src/mock/applications.ts` — 增加一条审核阶段已委派项,便于人工验证被委派视角

## 验收点

1. 录入页与审核页共用 `DelegateModal`,UI / 行为一致(选人 / 搜索 / 取消委派)
2. 角色审核负责人能委派、批量委派、转委派,且可推翻被委派人的判定
3. 被委派人(非角色审核负责人)登录进审核页,仅看到「委派给我的」Collapse,可对委派项通过 / 驳回
4. 被委派人同时是另一角色审核负责人时,两块视图并存
5. 委派 / 取消 / 转委派操作不写入主时间线
6. 工作台待办把审核阶段委派项也纳入
7. `npm run lint` 与 `npm run type-check` 通过

## 风险与未决项

- **风险**:可见性规则放开后,无关用户若被随意委派可能短暂看到敏感项。当前业务下风险低(企业内 15 个 mock 用户),但生产化后应配合工作台入口的「确认接受委派」流程。这一点本次不做。
- **未决项**:`reviewDelegatedTo` 字段为空数组与未定义的区分,实现时统一用 `undefined` 表示"未委派",避免空数组语义歧义。
