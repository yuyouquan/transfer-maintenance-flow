# 维护审核委派功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在维护审核页(`/workbench/[id]/review`)加入与资料录入页对称的「委派 / 批量委派 / 转委派」能力,并让被委派人能在审核页直接对委派项做通过/驳回;同时把录入页的内联对话框抽出为共享组件。

**Architecture:** 数据层新增 `reviewDelegatedTo?: ReadonlyArray<string>` 字段(`CheckListItem` 和 `ReviewElement` 各加一份),与录入阶段的 `delegatedTo` 隔离。UI 层抽出 `src/components/shared/DelegateModal.tsx`,录入页和审核页共用。审核页放开可见性,加上「委派给我的」跨角色 Collapse。状态变更复用 `ApplicationContext.updateChecklistItems` / `updateReviewElements`,不引入新 action。

**Tech Stack:** Next.js App Router · React 19 · Ant Design 6 · TypeScript strict · Tailwind 4

**测试策略:** 本项目未配置自动化测试框架(无 jest/vitest)。验证以 `npm run type-check`、`npm run lint`、以及 dev-server 手测(切换 mock 用户 + 关键截屏)为主。每完成 1-2 个 Task 提交一次。

**Spec:** `docs/superpowers/specs/2026-05-13-review-delegation-design.md`

---

## 设计文件结构与责任

| 文件 | 责任 | 改动类型 |
|---|---|---|
| `src/types/index.ts` | 领域类型,加 `reviewDelegatedTo` 字段 | 修改 |
| `src/components/shared/DelegateModal.tsx` | 共享委派对话框 UI(无领域状态) | 新增 |
| `src/app/workbench/[id]/entry/page.tsx` | 录入页:把内联委派对话框替换为 `DelegateModal`,逻辑不变 | 修改 |
| `src/app/workbench/[id]/review/page.tsx` | 审核页:可见性放开、加委派入口、加「委派给我的」Collapse | 修改 |
| `src/app/workbench/page.tsx` | 工作台:把 `reviewDelegatedTo` 纳入"被委派"判定 | 修改 |
| `src/mock/checklistItems.ts` 或同类 mock 文件 | 加一条审核阶段已委派的样本数据,便于手测 | 修改 |

---

### Task 1: 扩展领域类型,加入 `reviewDelegatedTo` 字段

**Files:**
- Modify: `src/types/index.ts:99-119` (CheckListItem) 与 `src/types/index.ts:123-144` (ReviewElement)

- [ ] **Step 1: 编辑 `CheckListItem`,在 `delegatedTo` 之后新增字段**

在 `src/types/index.ts` 中,把 `CheckListItem` 改为:

```ts
export interface CheckListItem {
  readonly id: string;
  readonly applicationId: string;
  readonly seq: number;
  readonly type: string;
  readonly checkItem: string;
  readonly responsibleRole: PipelineRole;
  readonly entryPerson: string;
  readonly entryPersonId: string;
  readonly reviewPerson: string;
  readonly reviewPersonId: string;
  readonly aiCheckRule: string;
  readonly deliverables: ReadonlyArray<Deliverable>;
  readonly entryContent?: string;
  readonly entryStatus: EntryStatus;
  readonly aiCheckStatus: AICheckStatus;
  readonly aiCheckResult?: string;
  readonly reviewStatus: ReviewStatus;
  readonly reviewComment?: string;
  readonly delegatedTo?: ReadonlyArray<string>;
  readonly reviewDelegatedTo?: ReadonlyArray<string>;
}
```

- [ ] **Step 2: 同样修改 `ReviewElement`**

在 `src/types/index.ts` 中,把 `ReviewElement` 改为(只展示尾部新加字段位置):

```ts
export interface ReviewElement {
  // ...existing fields unchanged...
  readonly delegatedTo?: ReadonlyArray<string>;
  readonly reviewDelegatedTo?: ReadonlyArray<string>;
}
```

- [ ] **Step 3: 跑类型检查**

Run: `npm run type-check`
Expected: PASS(此 step 不会引入类型错误,因字段为可选)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): 增加 reviewDelegatedTo 字段用于维护审核委派"
```

---

### Task 2: 创建共享组件 `DelegateModal`

**Files:**
- Create: `src/components/shared/DelegateModal.tsx`

- [ ] **Step 1: 创建文件 `src/components/shared/DelegateModal.tsx`**

写入以下内容:

```tsx
'use client';

import React from 'react';
import { Modal, Select, Button } from 'antd';
import { MOCK_USERS } from '@/mock';

export interface DelegateModalProps {
  /** 受控显示 */
  open: boolean;
  /** 弹窗标题,默认「委派任务」;审核场景可传「委派审核」 */
  title?: string;
  /** 已选条目数,显示在底部 */
  selectedCount: number;
  /** 当前已委派给的用户 ID(若有),用于回填 */
  currentAssignee?: string | null;
  /** 排除的用户 ID(通常是当前用户自己) */
  excludeUserIds?: ReadonlyArray<string>;
  /** 确认回调;参数为新选择的用户 ID,或 null 表示「取消委派」 */
  onConfirm: (toUserId: string | null) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export default function DelegateModal(props: DelegateModalProps) {
  const {
    open,
    title = '委派任务',
    selectedCount,
    currentAssignee,
    excludeUserIds,
    onConfirm,
    onCancel,
  } = props;

  const [value, setValue] = React.useState<string | undefined>(currentAssignee ?? undefined);

  React.useEffect(() => {
    if (open) {
      setValue(currentAssignee ?? undefined);
    }
  }, [open, currentAssignee]);

  const excluded = React.useMemo(
    () => new Set(excludeUserIds ?? []),
    [excludeUserIds],
  );

  const options = React.useMemo(
    () =>
      MOCK_USERS
        .filter((u) => !excluded.has(u.id))
        .map((u) => ({ value: u.id, label: `${u.name} (${u.role} - ${u.department})` })),
    [excluded],
  );

  const handleOk = () => {
    if (!value) return;
    onConfirm(value);
  };

  const handleClear = () => {
    onConfirm(null);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={500}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button danger type="text" onClick={handleClear} disabled={!currentAssignee}>
            清空委派
          </Button>
          <div>
            <Button onClick={onCancel} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" onClick={handleOk} disabled={!value}>确认委派</Button>
          </div>
        </div>
      }
    >
      <div style={{ marginBottom: 8, color: '#666' }}>
        选择委派人员
      </div>
      <Select
        style={{ width: '100%' }}
        placeholder="搜索/选择委派人员"
        showSearch
        value={value}
        onChange={setValue}
        options={options}
        optionFilterProp="label"
      />
      <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
        将委派 {selectedCount} 项任务
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/DelegateModal.tsx
git commit -m "feat(shared): 抽出 DelegateModal 共享委派对话框"
```

---

### Task 3: 录入页改用 `DelegateModal`(重构,行为不变)

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx:1025-1059` (内联 Modal),并删除已不再使用的内联 state/render

> **重要**:本 Task 仅做替换,不改委派语义。`delegatedTo` 数组的合并行为保留(`new Set([...existing, newId])`),`entryPerson` / `entryPersonId` 替换行为保留。

- [ ] **Step 1: 在文件顶部加入 import**

在 `src/app/workbench/[id]/entry/page.tsx` 现有 import 块加入:

```ts
import DelegateModal from '@/components/shared/DelegateModal';
```

- [ ] **Step 2: 改造 `handleDelegateConfirm` 的签名**

把 `handleDelegateConfirm` 从「无参,从 state 读 `delegatePersonId`」改为「接收一个参数 `toUserId: string | null`」,并兼容「清空委派」(传 null 时不替换 `entryPerson`,而是把 `delegatedTo` 里的当前被委派人移除,保持 `entryPerson` 不变;若本来就没有 `delegatedTo`,清空无操作 — 因为录入页没有"清空"按钮入口走到这条路径,但 DelegateModal 把按钮 `disabled` 了,所以这里不必特殊处理 null)。

把第 336-365 行替换为:

```tsx
const handleDelegateConfirm = useCallback((toUserId: string | null) => {
  if (!delegateTarget) return;

  // 录入页不允许「清空委派」(底部按钮 disabled),此处 null 直接忽略以维持类型签名
  if (!toUserId) return;

  const targetUser = MOCK_USERS.find((u) => u.id === toUserId);
  if (!targetUser) return;

  const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
    if (!delegateTarget.ids.includes(item.id)) return item;
    return {
      ...item,
      entryPerson: targetUser.name,
      entryPersonId: targetUser.id,
      delegatedTo: [...new Set([...(item.delegatedTo ?? []), targetUser.id])],
    };
  };

  if (delegateTarget.tab === 'checklist') {
    setChecklistItems((prev) => prev.map(updateItem));
  } else {
    setReviewElements((prev) => prev.map(updateItem));
  }

  setDelegateModalVisible(false);
  setDelegateTarget(null);
  setDelegatePersonId(undefined);
  message.success(`已委派给 ${targetUser.name},录入责任人已更新`);
}, [delegateTarget, setChecklistItems, setReviewElements]);
```

- [ ] **Step 3: 把内联 Modal 替换为 `<DelegateModal />`**

把 `src/app/workbench/[id]/entry/page.tsx:1025-1059` 整段(`{/* Delegate Modal */}` 注释到对应 `</Modal>`)替换为:

```tsx
{/* Delegate Modal */}
<DelegateModal
  open={delegateModalVisible}
  title="委派任务"
  selectedCount={delegateTarget?.ids.length ?? 0}
  excludeUserIds={[currentUser.id]}
  onConfirm={handleDelegateConfirm}
  onCancel={() => {
    setDelegateModalVisible(false);
    setDelegateTarget(null);
    setDelegatePersonId(undefined);
  }}
/>
```

- [ ] **Step 4: 删除已不用的 `delegatePersonId` state(若 grep 后未在别处引用)**

Run:
```bash
grep -n "delegatePersonId" src/app/workbench/[id]/entry/page.tsx
```

如果只剩声明(`useState`)、`openDelegateModal` 中的 reset、Modal cancel 中的 reset 这三处,则把这个 state 彻底删掉(包括三处引用)。如果还在别处用,则保留。

- [ ] **Step 5: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS。如出错,根据错误信息调整(常见:删除 `delegatePersonId` 后忘删某处引用)

- [ ] **Step 6: 启动 dev 服务器手测录入页委派**

```bash
npm run dev
```

然后用浏览器:
1. 打开任一进行中应用的录入页
2. 点行内「委派」单条委派
3. 点顶部批量委派
4. 验证委派后录入责任人变更、`已委派` Tag 出现

通过后,Ctrl+C 关闭 dev。

- [ ] **Step 7: Commit**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "refactor(entry): 录入页改用共享 DelegateModal"
```

---

### Task 4: 审核页放开可见性 + 引入 DelegateModal 依赖

**Files:**
- Modify: `src/app/workbench/[id]/review/page.tsx`

- [ ] **Step 1: 加 import**

在 `src/app/workbench/[id]/review/page.tsx` 顶部 import 块加入:

```ts
import DelegateModal from '@/components/shared/DelegateModal';
import { Collapse } from 'antd';
```

`Collapse` 是 Ant Design 已经在用的组件,但本页面尚未引入。

- [ ] **Step 2: 在已有 hooks 之后新增"被委派项"派生 memo**

在 `src/app/workbench/[id]/review/page.tsx:145`(`reviewElements` memo 之后)插入:

```tsx
// --- 被委派给当前用户的项目(跨角色聚合) ---
const delegatedChecklistForMe = useMemo(
  () => allChecklistItems.filter(
    (i) => i.reviewDelegatedTo?.includes(currentUser.id),
  ),
  [allChecklistItems, currentUser.id],
);

const delegatedReviewElementsForMe = useMemo(
  () => allReviewElements.filter(
    (i) => i.reviewDelegatedTo?.includes(currentUser.id),
  ),
  [allReviewElements, currentUser.id],
);

const hasDelegatedItems =
  delegatedChecklistForMe.length > 0 || delegatedReviewElementsForMe.length > 0;
```

- [ ] **Step 3: 在 `currentRole` 计算之后,补一个"页面访问权"判断**

在 `src/app/workbench/[id]/review/page.tsx:168` 附近(`const currentRole = userResponsibleRole ?? 'SPM';` 之前 / 之后即可):

```tsx
const canAccessPage = Boolean(userResponsibleRole) || hasDelegatedItems;
```

- [ ] **Step 4: 调整 early-return 段,允许"仅被委派人"进入**

把 `src/app/workbench/[id]/review/page.tsx:380-398` 这段(早 return,application.status !== 'in_progress' 的分支)保留不变。
**新增**一段早 return,放在它之前(紧接 `if (!application) { ... }` 块之后):

```tsx
if (!canAccessPage) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <Alert
        type="warning"
        showIcon
        message="无权访问"
        description="您不是当前应用任一维护审核角色的负责人,也无被委派项"
        style={{ maxWidth: 560, margin: '0 auto 16px' }}
      />
      <Button onClick={() => router.push('/workbench')}>返回工作台</Button>
    </div>
  );
}
```

> **注意**:`Alert` 的 prop 在该项目中已使用 `title` / `description` 还是 `message` / `description`,请按现有 alert 用法对齐(grep `<Alert` 看一下)。本计划默认 `message` + `description`,因为 Ant Design v6 推荐 `message`。

- [ ] **Step 5: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/workbench/[id]/review/page.tsx
git commit -m "feat(review): 放开可见性,允许被委派人访问审核页"
```

---

### Task 5: 在审核页接入 DelegateModal 状态与处理函数

**Files:**
- Modify: `src/app/workbench/[id]/review/page.tsx`

- [ ] **Step 1: 加 state**

在 `src/app/workbench/[id]/review/page.tsx:147` (`selectedRowKeys` state 附近)新增:

```tsx
// Delegate modal
const [delegateModalOpen, setDelegateModalOpen] = useState(false);
const [delegateTarget, setDelegateTarget] = useState<{
  ids: ReadonlyArray<string>;
  tab: 'checklist' | 'review_element';
} | null>(null);
const [delegateCurrentAssignee, setDelegateCurrentAssignee] = useState<string | null>(null);
```

- [ ] **Step 2: 加 `openDelegateModal` 辅助**

紧随 `handleBatchReview`(`src/app/workbench/[id]/review/page.tsx:250` 之后)加入:

```tsx
const openDelegateModal = useCallback(
  (ids: ReadonlyArray<string>, tab: 'checklist' | 'review_element') => {
    // 当对单条委派(ids.length === 1)且该条已有 reviewDelegatedTo,回填以便支持转委派
    let current: string | null = null;
    if (ids.length === 1) {
      const item = tab === 'checklist'
        ? allChecklistItems.find((i) => i.id === ids[0])
        : allReviewElements.find((i) => i.id === ids[0]);
      current = item?.reviewDelegatedTo?.[0] ?? null;
    }
    setDelegateTarget({ ids, tab });
    setDelegateCurrentAssignee(current);
    setDelegateModalOpen(true);
  },
  [allChecklistItems, allReviewElements],
);

const handleDelegateConfirm = useCallback((toUserId: string | null) => {
  if (!delegateTarget) return;
  const idSet = new Set(delegateTarget.ids);

  const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
    if (!idSet.has(item.id)) return item;
    return {
      ...item,
      reviewDelegatedTo: toUserId ? [toUserId] : undefined,
    };
  };

  if (delegateTarget.tab === 'checklist') {
    setAllChecklistItems((prev) => prev.map(updateItem));
  } else {
    setAllReviewElements((prev) => prev.map(updateItem));
  }

  setDelegateModalOpen(false);
  setDelegateTarget(null);
  setDelegateCurrentAssignee(null);
  setSelectedRowKeys([]);
  if (toUserId) {
    const u = MOCK_USERS.find((x) => x.id === toUserId);
    message.success(`已委派给 ${u?.name ?? '指定人员'}`);
  } else {
    message.success('已取消委派');
  }
}, [delegateTarget, setAllChecklistItems, setAllReviewElements]);
```

- [ ] **Step 3: 在 JSX 末尾(`</div>` 关闭前)插入 `<DelegateModal />`**

找到 `src/app/workbench/[id]/review/page.tsx` 中 review 页面 return 的最外层 `</div>` 关闭标签之前(即文件靠近底部 last `</Modal>` 之后),加入:

```tsx
<DelegateModal
  open={delegateModalOpen}
  title="委派审核"
  selectedCount={delegateTarget?.ids.length ?? 0}
  currentAssignee={delegateCurrentAssignee}
  excludeUserIds={[currentUser.id]}
  onConfirm={handleDelegateConfirm}
  onCancel={() => {
    setDelegateModalOpen(false);
    setDelegateTarget(null);
    setDelegateCurrentAssignee(null);
  }}
/>
```

- [ ] **Step 4: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS。常见错误是 `Set` 类型推断,若报错就显式写 `new Set<string>(delegateTarget.ids)`

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/[id]/review/page.tsx
git commit -m "feat(review): 接入 DelegateModal 状态与委派处理"
```

---

### Task 6: 行操作列新增「委派」按钮 + 顶部「批量委派」按钮

**Files:**
- Modify: `src/app/workbench/[id]/review/page.tsx`

- [ ] **Step 1: 修改 checklist 表的操作列**

把 `src/app/workbench/[id]/review/page.tsx:462-481`(checklist 操作列)替换为:

```tsx
{
  title: '操作', key: 'actions', width: 200, align: 'center', fixed: 'right',
  render: (_: unknown, record: CheckListItem) => {
    const isDelegatedToMe = record.reviewDelegatedTo?.includes(currentUser.id) ?? false;
    const isRoleOwner = !!userResponsibleRole && record.responsibleRole === userResponsibleRole;
    const canReviewItem = isRoleOwner || isDelegatedToMe;
    const canDelegate = isRoleOwner || isDelegatedToMe;

    if (record.reviewStatus === 'passed') {
      return <span style={{ color: '#bfbfbf' }}>-</span>;
    }
    return (
      <Space size={4}>
        {canReviewItem && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleItemReview(record.id, 'checklist', 'passed')}>
              通过
            </Button>
            <Button type="link" size="small" danger icon={<CloseCircleOutlined />}
              onClick={() => handleItemReview(record.id, 'checklist', 'rejected')}>
              拒绝
            </Button>
          </>
        )}
        {canDelegate && (
          <Button type="link" size="small"
            onClick={() => openDelegateModal([record.id], 'checklist')}>
            委派
          </Button>
        )}
      </Space>
    );
  },
},
```

- [ ] **Step 2: 同样修改评审要素表的操作列**

把 `src/app/workbench/[id]/review/page.tsx:550-570` 替换为(`'checklist'` 改为 `'review_element'`,`CheckListItem` 改为 `ReviewElement`):

```tsx
{
  title: '操作', key: 'actions', width: 200, align: 'center', fixed: 'right',
  render: (_: unknown, record: ReviewElement) => {
    const isDelegatedToMe = record.reviewDelegatedTo?.includes(currentUser.id) ?? false;
    const isRoleOwner = !!userResponsibleRole && record.responsibleRole === userResponsibleRole;
    const canReviewItem = isRoleOwner || isDelegatedToMe;
    const canDelegate = isRoleOwner || isDelegatedToMe;

    if (record.reviewStatus === 'passed') {
      return <span style={{ color: '#bfbfbf' }}>-</span>;
    }
    return (
      <Space size={4}>
        {canReviewItem && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleItemReview(record.id, 'review_element', 'passed')}>
              通过
            </Button>
            <Button type="link" size="small" danger icon={<CloseCircleOutlined />}
              onClick={() => handleItemReview(record.id, 'review_element', 'rejected')}>
              拒绝
            </Button>
          </>
        )}
        {canDelegate && (
          <Button type="link" size="small"
            onClick={() => openDelegateModal([record.id], 'review_element')}>
            委派
          </Button>
        )}
      </Space>
    );
  },
},
```

- [ ] **Step 3: 在 sticky 操作栏中加「批量委派」按钮**

把 `src/app/workbench/[id]/review/page.tsx:622-643`(`<Space size={8}>` 那块)修改为:

```tsx
<Space size={8}>
  {selectedRowKeys.length > 0 && (
    <>
      <Button size="small" onClick={() => handleBatchReview('passed')}
        style={{ color: '#52c41a', borderColor: '#b7eb8f' }}>
        批量通过 ({selectedRowKeys.length})
      </Button>
      <Button size="small" danger onClick={() => handleBatchReview('rejected')}>
        批量不通过 ({selectedRowKeys.length})
      </Button>
      {userResponsibleRole && (
        <Button size="small"
          onClick={() => openDelegateModal(
            selectedRowKeys.map(String),
            activeTab as 'checklist' | 'review_element',
          )}>
          批量委派 ({selectedRowKeys.length})
        </Button>
      )}
      <Divider type="vertical" />
    </>
  )}
  <Button danger onClick={() => setFailModalOpen(true)} icon={<CloseCircleOutlined />}>
    不通过
  </Button>
  <Button type="primary" onClick={() => setPassModalOpen(true)} icon={<CheckCircleOutlined />}
    style={{ background: '#52c41a', borderColor: '#52c41a' }}>
    通过
  </Button>
</Space>
```

> **说明**:批量委派只对「角色审核负责人」开放(`userResponsibleRole` 真值时);被委派人不参与批量委派,只能单条转委派(与权限矩阵一致)。

- [ ] **Step 4: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/[id]/review/page.tsx
git commit -m "feat(review): 行内委派 + 批量委派入口"
```

---

### Task 7: 加「委派给我的」Collapse

**Files:**
- Modify: `src/app/workbench/[id]/review/page.tsx`

- [ ] **Step 1: 在主内容区上方插入 Collapse**

找到 `src/app/workbench/[id]/review/page.tsx:646` 附近 `{/* Main content */}` 注释位置,在主 Tabs 区上方插入一段:

```tsx
{/* 委派给我的(跨角色聚合) */}
{hasDelegatedItems && (
  <div style={{ background: '#fff', borderRadius: 8, padding: 0, marginBottom: 16 }}>
    <Collapse
      defaultActiveKey={['delegated-to-me']}
      items={[
        {
          key: 'delegated-to-me',
          label: (
            <span style={{ fontWeight: 600 }}>
              委派给我的 ({delegatedChecklistForMe.length + delegatedReviewElementsForMe.length} 项)
            </span>
          ),
          children: (
            <div>
              {delegatedChecklistForMe.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>
                    转维材料 ({delegatedChecklistForMe.length})
                  </div>
                  <Table<CheckListItem>
                    rowKey="id"
                    columns={checklistColumns}
                    dataSource={delegatedChecklistForMe}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1600 }}
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}
              {delegatedReviewElementsForMe.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>
                    评审要素 ({delegatedReviewElementsForMe.length})
                  </div>
                  <Table<ReviewElement>
                    rowKey="id"
                    columns={reviewElementColumns}
                    dataSource={delegatedReviewElementsForMe}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1700 }}
                  />
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  </div>
)}
```

- [ ] **Step 2: 当用户**不是**任何角色审核负责人时,隐藏角色 Tab 区**

把 `src/app/workbench/[id]/review/page.tsx:646-684`(主内容 `<Tabs>` 块) 用条件包裹:

```tsx
{userResponsibleRole && (
  <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
    <Tabs
      activeKey={activeTab}
      onChange={(key) => { setActiveTab(key); setSelectedRowKeys([]); }}
      items={[
        // ...existing items unchanged
      ]}
    />
  </div>
)}
```

也就是:**只有当 `userResponsibleRole` 真值,才显示角色 Tab 区**。否则只显示「委派给我的」Collapse + 顶部 header/pipeline。

- [ ] **Step 3: 顶部 sticky 操作栏也应只在角色审核负责人时显示**

把 `src/app/workbench/[id]/review/page.tsx:599-643`(sticky review action bar 那块 `<div>`)用同样条件包裹:

```tsx
{userResponsibleRole && (
  <div style={{ /* sticky styles unchanged */ }}>
    {/* ...unchanged content... */}
  </div>
)}
```

> 理由:角色级"通过/不通过"按钮和"评审角色"展示对纯被委派人没意义。

- [ ] **Step 4: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/[id]/review/page.tsx
git commit -m "feat(review): 顶部新增「委派给我的」Collapse 视图"
```

---

### Task 8: 工作台待办纳入 `reviewDelegatedTo`

**Files:**
- Modify: `src/app/workbench/page.tsx:460-468`

- [ ] **Step 1: 修改 `isDelegatedEntry` 判断**

把 `src/app/workbench/page.tsx:460-467` 替换为:

```tsx
const isDelegatedEntry = [
  ...MOCK_CHECKLIST_ITEMS.filter((i) => i.applicationId === record.id),
  ...MOCK_REVIEW_ELEMENTS.filter((i) => i.applicationId === record.id),
].some(
  (i) =>
    (i.entryPersonId === currentUser.id
      || i.delegatedTo?.includes(currentUser.id))
    && (i.reviewStatus === 'not_reviewed' || i.reviewStatus === 'rejected'),
);
```

(保持现状,无需改 — 这是**录入阶段**的委派判定。)

- [ ] **Step 2: 在其后新增 `isDelegatedReview` 判断**

紧接 `isDelegatedEntry` 之后插入:

```tsx
const isDelegatedReview = [
  ...MOCK_CHECKLIST_ITEMS.filter((i) => i.applicationId === record.id),
  ...MOCK_REVIEW_ELEMENTS.filter((i) => i.applicationId === record.id),
].some((i) => i.reviewDelegatedTo?.includes(currentUser.id));
```

- [ ] **Step 3: 修改 `showReview` 判断**

把 `src/app/workbench/page.tsx:476` 这一行:

```tsx
const showReview = isInProgress && isInReview && hasReviewRole;
```

改为:

```tsx
const showReview = isInProgress && isInReview && (hasReviewRole || isDelegatedReview);
```

- [ ] **Step 4: 跑类型检查 & lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/workbench/page.tsx
git commit -m "feat(workbench): 把审核阶段委派项纳入操作入口"
```

---

### Task 9: 添加 mock 数据样例,便于人工验证被委派视角

**Files:**
- Modify: `src/mock/*.ts`(找出 `MOCK_CHECKLIST_ITEMS` 与 `MOCK_REVIEW_ELEMENTS` 所在文件)

- [ ] **Step 1: 定位 mock 文件**

Run:
```bash
grep -rln "MOCK_CHECKLIST_ITEMS\s*=" src/mock/
grep -rln "MOCK_REVIEW_ELEMENTS\s*=" src/mock/
```

记下实际文件路径(假设是 `src/mock/checklistItems.ts` 与 `src/mock/reviewElements.ts`,但以 grep 结果为准)。

- [ ] **Step 2: 找到一条处于 `maintenanceReview` 阶段且 `reviewStatus` 为 `reviewing` 或 `not_reviewed` 的样本条目**

Run:
```bash
grep -E "reviewStatus:\s*'(reviewing|not_reviewed)'" -n src/mock/*.ts | head -5
```

挑第一条匹配项所在的 item。**记录** 其 `applicationId` 和 `responsibleRole`,然后:

1. 打开该 mock 文件
2. 在该条目对象内,紧接 `delegatedTo`(如有)或 `reviewStatus` 字段之后,加入新字段:

```ts
reviewDelegatedTo: ['u-research-spm-001'],  // 实际写入时:挑 src/mock 中 MOCK_USERS 一个**不在**该 application.team.maintenance 中的用户 ID
```

3. 选 ID 的方法:打开 `src/mock/users.ts`(或对应文件),挑任何角色 ≠ 该条目 responsibleRole 的研发侧用户 ID 即可。**目的是制造一个"被委派人不是角色审核员"的样本**,以便验证 Task 7 的 Collapse 隐藏 Tab 区行为。

只需 1 条样本即可。第二条同色 / 同人样本可选。

- [ ] **Step 3: 跑类型检查**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 4: dev server 手测被委派视角**

```bash
npm run dev
```

切换到上一步选定的"被委派 mock 用户",从工作台进入该应用的审核页:
- 验证「委派给我的」Collapse 显示该条目
- 点「通过」/「拒绝」可正常生效
- 顶部 sticky 操作栏 + 角色 Tab 区不出现(因该用户不是任何角色审核负责人)

通过后 Ctrl+C。

- [ ] **Step 5: Commit**

```bash
git add src/mock/
git commit -m "chore(mock): 加入维护审核被委派样本数据"
```

---

### Task 10: 端到端验证 + 合并到 main

**Files:**
- 无新改动

- [ ] **Step 1: 跑完整检查**

Run:
```bash
npm run type-check
npm run lint
npm run build
```

Expected: 全部 PASS

- [ ] **Step 2: 手动 UI 走查清单**

启动 `npm run dev`,完成下列剧本:

1. **角色审核负责人视角**(挑某维护角色的 mock 用户):
   - 进入审核页 → 行内「委派」按钮可见
   - 点击单条委派 → 弹出 DelegateModal → 选另一人 → 确认 → 「人工审核-责任人」列旁出现「已委派」Tag
   - 选中多条 → 顶部「批量委派」按钮出现 → 委派给同一人
   - 顶部 sticky 栏「通过/不通过」按钮仍工作(走整角色提交)

2. **被委派人视角**(切换到刚被委派的人,该人不是任一角色审核负责人):
   - 工作台「转维管理」列出现「审核」操作入口
   - 点进审核页 → 仅显示「委派给我的」Collapse
   - 顶部 sticky 操作栏隐藏、角色 Tab 区隐藏
   - 「委派给我的」表格的「通过」/「拒绝」/「委派」(用于转委派)可正常操作

3. **转委派**(在被委派视角):
   - 对已委派给自己的条目点「委派」→ DelegateModal 回填当前被委派人 + 「清空委派」按钮可用
   - 把它转委派给第三人 → 自己的「委派给我的」清单消失,新被委派人能在自己视角看到

4. **录入页回归**(回切到任一研发用户):
   - 进入录入页 → 行内委派、批量委派、AI 检查、提交流程一切如常

- [ ] **Step 3: Commit(若有调整)**

```bash
git status
# 如果有未提交的调整(例如手测发现的样式微调),用合适的 message 提交
```

- [ ] **Step 4: 推送 dev**

```bash
git push origin dev
```

- [ ] **Step 5: 合并到 main 并推送**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff dev -m "Merge branch 'dev' into main"
git push origin main
git checkout dev
```

- [ ] **Step 6: Done**

整理可以包含的截图 / 验证记录,通报完成。

---

## 自查记录

- **Spec 覆盖**:✅
  - 数据模型 → Task 1
  - 共享 Modal → Task 2
  - 录入页同步重构 → Task 3
  - 可见性规则放开 → Task 4 + Task 7
  - 审核页委派 UI → Task 5/6
  - 「委派给我的」Collapse → Task 7
  - 工作台待办联动 → Task 8
  - mock 样本 → Task 9
  - 端到端验收 → Task 10

- **Placeholder 扫描**:无 "TBD/TODO/implement later"
- **类型一致性**:`reviewDelegatedTo` 在 Task 1 定义为 `ReadonlyArray<string>`,后续任务一致使用;DelegateModal `onConfirm` 签名 `(toUserId: string | null) => void` 在录入/审核两端保持一致
- **风险点**:Task 4 Step 4 中 `Alert` 的 prop name(`message` vs `title`)需根据现有用法对齐,已在 Step 注释中标注
