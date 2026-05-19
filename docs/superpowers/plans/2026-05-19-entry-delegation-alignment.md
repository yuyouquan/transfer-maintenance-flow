# 录入页委派交互对齐审核页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把资料录入页（`/workbench/[id]/entry`）的"被委派"相关界面交互对齐到维护审核页（`/workbench/[id]/review`），统一委派语义、视觉表达与访问控制。

**Architecture:** 单页 Next.js App Router 路由组件 + 共享 `DelegateModal` + Mock 数据驱动。改动集中在三个文件：录入页主组件、共享 Modal、Mock 数据。无后端调用，无新增依赖。

**Tech Stack:** Next.js 15 App Router、React 19、Ant Design 6、TypeScript（strict）、Tailwind CSS 4。验证方式：`npm run type-check` + `npm run lint` + 手动登录多个 mock 用户在浏览器验证。

**Spec:** `docs/superpowers/specs/2026-05-18-entry-delegation-alignment-design.md`

---

## File Structure

| 文件 | 角色 | 改动范围 |
|---|---|---|
| `src/components/shared/DelegateModal.tsx` | 共享委派弹窗 | 新增 `allowClear` prop，控制底部「清空委派」按钮渲染 |
| `src/mock/applications.ts` | Mock 应用数据 | 删除 app-001 三处 `entryPersonOverride`，保留 `delegatedTo` |
| `src/app/workbench/[id]/entry/page.tsx` | 录入页主组件 | 委派 handler、列渲染、跨角色聚合、访问控制、顶部 Collapse、操作列权限 |

不动：`src/types/index.ts`（类型不需要新增字段，`delegatedTo` 已有）；`src/context/ApplicationContext.tsx`（无新衍生状态）。

---

## Task 1: DelegateModal 新增 `allowClear` prop

**Files:**
- Modify: `src/components/shared/DelegateModal.tsx`

- [ ] **Step 1: 在 `DelegateModalProps` 接口加 `allowClear` 字段**

打开 `src/components/shared/DelegateModal.tsx`，把 interface 改成：

```tsx
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
  /** 是否显示底部「清空委派」按钮(默认 true)。录入场景传 false 屏蔽。 */
  allowClear?: boolean;
}
```

- [ ] **Step 2: 在解构 props 时加默认值**

把组件起始处的解构改成：

```tsx
export default function DelegateModal(props: DelegateModalProps) {
  const {
    open,
    title = '委派任务',
    selectedCount,
    currentAssignee,
    excludeUserIds,
    onConfirm,
    onCancel,
    allowClear = true,
  } = props;
```

- [ ] **Step 3: 根据 `allowClear` 条件渲染底部清空按钮**

把 footer 内的 `<Button danger type="text" ...>清空委派</Button>` 替换为条件渲染。footer 整段改成：

```tsx
footer={
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {allowClear ? (
      <Button danger type="text" onClick={handleClear} disabled={!currentAssignee}>
        清空委派
      </Button>
    ) : (
      <span />
    )}
    <div>
      <Button onClick={onCancel} style={{ marginRight: 8 }}>取消</Button>
      <Button type="primary" onClick={handleOk} disabled={!value}>确认委派</Button>
    </div>
  </div>
}
```

说明：保留左侧占位 `<span />` 以维持 `justify-content: space-between` 的布局对齐（右侧两个按钮仍贴右）。

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误、无警告。

- [ ] **Step 5: 提交**

```bash
git add src/components/shared/DelegateModal.tsx
git commit -m "feat(delegate-modal): 新增 allowClear prop 控制清空委派按钮"
```

---

## Task 2: Mock 数据迁移 —— 移除 `entryPersonOverride`

**Files:**
- Modify: `src/mock/applications.ts:553-554,567`

- [ ] **Step 1: 修改 APP001_CL_OVERRIDES[36]**

在 `src/mock/applications.ts` line 553，把：

```ts
  36: { entryContent: '散热方案文档整理中\n\\\\192.168.1.100\\projects\\x6870\\thermal', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'], entryPersonOverride: { id: 'u001', name: '张三' } },
```

改为（移除末尾 `, entryPersonOverride: { id: 'u001', name: '张三' }`）：

```ts
  36: { entryContent: '散热方案文档整理中\n\\\\192.168.1.100\\projects\\x6870\\thermal', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
```

- [ ] **Step 2: 修改 APP001_CL_OVERRIDES[37]**

line 554，原：

```ts
  37: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'], entryPersonOverride: { id: 'u001', name: '张三' } },
```

改为：

```ts
  37: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
```

- [ ] **Step 3: 修改 APP001_RE_OVERRIDES[6]**

line 567，原：

```ts
  6: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'], entryPersonOverride: { id: 'u001', name: '张三' } },
```

改为：

```ts
  6: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
```

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误、无警告（`entryPersonOverride` 类型字段定义仍存在，但不会被这三条样本使用，无影响）。

- [ ] **Step 5: 提交**

```bash
git add src/mock/applications.ts
git commit -m "chore(mock): 委派后保留原录入责任人,移除 entryPersonOverride"
```

---

## Task 3: 改造 `handleDelegateConfirm` —— 委派不再覆盖 entryPerson

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx:334-362`

- [ ] **Step 1: 替换 handleDelegateConfirm 实现**

在 `src/app/workbench/[id]/entry/page.tsx`，把现有 `handleDelegateConfirm`（约 line 334-362）整体替换为：

```tsx
  const handleDelegateConfirm = useCallback((toUserId: string | null) => {
    if (!delegateTarget) return;

    // 录入页传 allowClear={false},DelegateModal 不会回传 null;
    // 保留这条防御性兜底,行为是直接忽略以维持类型签名。
    if (!toUserId) return;

    const targetUser = MOCK_USERS.find((u) => u.id === toUserId);
    if (!targetUser) return;

    const idSet = new Set(delegateTarget.ids);
    const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
      if (!idSet.has(item.id)) return item;
      // 单人替换式: delegatedTo 始终为新被委派人;不再修改 entryPerson/entryPersonId
      return {
        ...item,
        delegatedTo: [targetUser.id],
      };
    };

    if (delegateTarget.tab === 'checklist') {
      setChecklistItems((prev) => prev.map(updateItem));
    } else {
      setReviewElements((prev) => prev.map(updateItem));
    }

    setDelegateModalVisible(false);
    setDelegateTarget(null);
    message.success(`已委派给 ${targetUser.name}`);
  }, [delegateTarget, setChecklistItems, setReviewElements]);
```

差异要点：
- 不再设置 `entryPerson` / `entryPersonId`
- `delegatedTo` 改为 `[targetUser.id]` 单人替换，不再累加
- `message.success` 文案去掉"录入责任人已更新"

- [ ] **Step 2: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "refactor(entry): 委派改为单人替换式,保留原 entryPerson"
```

---

## Task 4: 新增跨角色被委派项聚合 + `canAccessPage`

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx`（在 `delegatedReviewElements` useMemo 之后插入新衍生值）

- [ ] **Step 1: 添加跨角色聚合 + canAccessPage 衍生**

在 `delegatedReviewElements` useMemo（约 line 147-153）后面、`blockTasks` useMemo（约 line 156）之前，插入：

```tsx
  // --- 跨角色被委派给当前用户的项(用于顶部「委派给我的」Collapse) ---
  const delegatedChecklistForMe = useMemo(
    () => checklistItems.filter((i) => i.delegatedTo?.includes(currentUser.id)),
    [checklistItems, currentUser.id],
  );

  const delegatedReviewElementsForMe = useMemo(
    () => reviewElements.filter((i) => i.delegatedTo?.includes(currentUser.id)),
    [reviewElements, currentUser.id],
  );

  const hasDelegatedItems
    = delegatedChecklistForMe.length > 0 || delegatedReviewElementsForMe.length > 0;

  const canAccessPage = userResponsibleRoles.length > 0 || hasDelegatedItems;
```

说明：
- 与现有 `delegatedChecklist` / `delegatedReviewElements`（line 139-153）的差异：现有那两个只筛"非自己角色"且"entryPersonId === currentUser.id 或 delegatedTo 含 currentUser.id"。跨角色版只看 `delegatedTo`，更纯粹（与审核页 `reviewDelegatedTo` 一致）。
- 两组衍生暂时并存，下一个 Task 会把旧的 `delegatedChecklist` / `delegatedReviewElements` 删掉。

- [ ] **Step 2: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 可能有 unused var 警告（如果旧的 `delegatedChecklist` 等之后不用），允许通过；type-check 必须干净。

- [ ] **Step 3: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "feat(entry): 加跨角色 hasDelegatedItems 与 canAccessPage 衍生"
```

---

## Task 5: 顶部独立「委派给我的」Collapse + 移除 Tab 内 Collapse

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx`

- [ ] **Step 1: 在驳回提示 Collapse 之后、主卡片之前插入顶部 Collapse**

找到 `{/* Main card */}` 注释那一行（约 line 836），在其之前插入：

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
                          dataSource={delegatedChecklistForMe as CheckListItem[]}
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
                          dataSource={delegatedReviewElementsForMe as ReviewElement[]}
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

说明：定位顺序确保为 pipeline → 驳回提示（条件渲染）→ 委派给我的（条件渲染）→ 主卡片。

- [ ] **Step 2: 删除 Tab 内的两个旧 Collapse**

在 `checklist` tab 的 `children`（约 line 877-918），把现有的：

```tsx
              children: (
                <>
                  <Table<CheckListItem>
                    rowKey="id"
                    columns={checklistColumns}
                    dataSource={ownRoleChecklist as CheckListItem[]}
                    pagination={false}
                    scroll={{ x: 1600 }}
                    size="middle"
                    rowSelection={{
                      selectedRowKeys: selectedChecklistKeys,
                      onChange: setSelectedChecklistKeys,
                    }}
                  />
                  {/* Delegated checklist items */}
                  {delegatedChecklist.length > 0 && (
                    <Collapse
                      style={{ marginTop: 16 }}
                      items={[{
                        key: 'delegated-cl',
                        label: (
                          <Space>
                            <span>委派给我的转维材料</span>
                            <Tag color="purple">{delegatedChecklist.length}</Tag>
                            <span style={{ color: '#999', fontSize: 12 }}>（来自其他角色的委派任务，不影响本角色提交审核）</span>
                          </Space>
                        ),
                        children: (
                          <Table<CheckListItem>
                            rowKey="id"
                            columns={checklistColumns}
                            dataSource={delegatedChecklist as CheckListItem[]}
                            pagination={false}
                            scroll={{ x: 1600 }}
                            size="middle"
                          />
                        ),
                      }]}
                    />
                  )}
                </>
              ),
```

替换为：

```tsx
              children: (
                <Table<CheckListItem>
                  rowKey="id"
                  columns={checklistColumns}
                  dataSource={ownRoleChecklist as CheckListItem[]}
                  pagination={false}
                  scroll={{ x: 1600 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedChecklistKeys,
                    onChange: setSelectedChecklistKeys,
                  }}
                />
              ),
```

同样地，在 `review` tab 的 `children`（约 line 932-972），把现有：

```tsx
              children: (
                <>
                  <Table<ReviewElement>
                    rowKey="id"
                    columns={reviewElementColumns}
                    dataSource={ownRoleReviewElements as ReviewElement[]}
                    pagination={false}
                    scroll={{ x: 1700 }}
                    size="middle"
                    rowSelection={{
                      selectedRowKeys: selectedReviewKeys,
                      onChange: setSelectedReviewKeys,
                    }}
                  />
                  {/* Delegated review elements */}
                  {delegatedReviewElements.length > 0 && (
                    <Collapse
                      style={{ marginTop: 16 }}
                      items={[{
                        key: 'delegated-re',
                        label: (
                          <Space>
                            <span>委派给我的评审要素</span>
                            <Tag color="purple">{delegatedReviewElements.length}</Tag>
                            <span style={{ color: '#999', fontSize: 12 }}>（来自其他角色的委派任务，不影响本角色提交审核）</span>
                          </Space>
                        ),
                        children: (
                          <Table<ReviewElement>
                            rowKey="id"
                            columns={reviewElementColumns}
                            dataSource={delegatedReviewElements as ReviewElement[]}
                            pagination={false}
                            scroll={{ x: 1700 }}
                            size="middle"
                          />
                        ),
                      }]}
                    />
                  )}
                </>
              ),
```

替换为：

```tsx
              children: (
                <Table<ReviewElement>
                  rowKey="id"
                  columns={reviewElementColumns}
                  dataSource={ownRoleReviewElements as ReviewElement[]}
                  pagination={false}
                  scroll={{ x: 1700 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedReviewKeys,
                    onChange: setSelectedReviewKeys,
                  }}
                />
              ),
```

- [ ] **Step 3: 删除旧的 `delegatedChecklist` 与 `delegatedReviewElements` useMemo**

约 line 139-153，删除两个旧 useMemo：

```tsx
  // --- Delegated items (items from OTHER roles where user is entryPerson/delegated) ---

  const delegatedChecklist = useMemo(() => {
    const ownRoles = new Set(userResponsibleRoles);
    return checklistItems.filter((item) =>
      !ownRoles.has(item.responsibleRole) &&
      (item.entryPersonId === currentUser.id || item.delegatedTo?.includes(currentUser.id))
    );
  }, [checklistItems, userResponsibleRoles, currentUser.id]);

  const delegatedReviewElements = useMemo(() => {
    const ownRoles = new Set(userResponsibleRoles);
    return reviewElements.filter((item) =>
      !ownRoles.has(item.responsibleRole) &&
      (item.entryPersonId === currentUser.id || item.delegatedTo?.includes(currentUser.id))
    );
  }, [reviewElements, userResponsibleRoles, currentUser.id]);
```

整段删除（包括上方 `// --- Delegated items` 注释行）。注意：紧接其后的"跨角色被委派给当前用户的项"注释和 `delegatedChecklistForMe` / `delegatedReviewElementsForMe`（Task 4 加的）保留。

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误，无 unused 警告。

- [ ] **Step 5: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "feat(entry): 顶部新增「委派给我的」Collapse,移除 Tab 内旧实现"
```

---

## Task 6: 责任人列加蓝色「录入委派→XX」Tag

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx` 两处 columns 定义

- [ ] **Step 1: 改造 checklistColumns 的 entryPerson 列 render**

找到 `checklistColumns` useMemo 内的 `资料录入-责任人` 列（约 line 489-498），把 render 替换为：

```tsx
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 140, align: 'center',
      render: (text: string, record: CheckListItem) => {
        const delegatee = record.delegatedTo?.[0];
        const delegateeName = delegatee
          ? MOCK_USERS.find((u) => u.id === delegatee)?.name
          : null;
        return (
          <Space size={4} wrap>
            <span>{text}</span>
            {record.delegatedTo && record.delegatedTo.length > 0 && (
              <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
            )}
            {delegateeName && (
              <Tag color="blue" style={{ fontSize: 11, marginRight: 0 }}>
                录入委派→{delegateeName}
              </Tag>
            )}
          </Space>
        );
      },
```

变更点：宽度 `130 → 140` 容纳新 Tag；Space 加 `wrap` 防止溢出；新增蓝色 Tag 渲染逻辑。

- [ ] **Step 2: 改造 reviewElementColumns 的 entryPerson 列 render**

找到 `reviewElementColumns` useMemo 内的 `资料录入-责任人` 列（约 line 597-606），同样替换为：

```tsx
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 140, align: 'center',
      render: (text: string, record: ReviewElement) => {
        const delegatee = record.delegatedTo?.[0];
        const delegateeName = delegatee
          ? MOCK_USERS.find((u) => u.id === delegatee)?.name
          : null;
        return (
          <Space size={4} wrap>
            <span>{text}</span>
            {record.delegatedTo && record.delegatedTo.length > 0 && (
              <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
            )}
            {delegateeName && (
              <Tag color="blue" style={{ fontSize: 11, marginRight: 0 }}>
                录入委派→{delegateeName}
              </Tag>
            )}
          </Space>
        );
      },
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "feat(entry): 责任人列加「录入委派→XX」蓝色标签"
```

---

## Task 7: 操作列权限收紧 + 行内委派回填 currentAssignee

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx`

- [ ] **Step 1: 加 `openDelegateModal` 的 currentAssignee 回填**

找到 `openDelegateModal` useCallback（约 line 329-332）和它附近的 `delegateTarget` 状态声明（约 line 179-180）。先扩展状态：

把：

```tsx
  // Delegate modal - single select, reassign entry person
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<{ ids: ReadonlyArray<string>; tab: 'checklist' | 'review' } | null>(null);
```

后面追加一个 `delegateCurrentAssignee` 状态：

```tsx
  // Delegate modal - single select, reassign entry person
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<{ ids: ReadonlyArray<string>; tab: 'checklist' | 'review' } | null>(null);
  const [delegateCurrentAssignee, setDelegateCurrentAssignee] = useState<string | null>(null);
```

- [ ] **Step 2: 重写 `openDelegateModal`**

把现有的（约 line 329-332）：

```tsx
  const openDelegateModal = useCallback((ids: ReadonlyArray<string>, tab: 'checklist' | 'review') => {
    setDelegateTarget({ ids, tab });
    setDelegateModalVisible(true);
  }, []);
```

替换为：

```tsx
  const openDelegateModal = useCallback(
    (ids: ReadonlyArray<string>, tab: 'checklist' | 'review') => {
      // 单条委派且该条已有 delegatedTo 时,回填以支持「转委派」展示
      let current: string | null = null;
      if (ids.length === 1) {
        const item = tab === 'checklist'
          ? checklistItems.find((i) => i.id === ids[0])
          : reviewElements.find((i) => i.id === ids[0]);
        current = item?.delegatedTo?.[0] ?? null;
      }
      setDelegateTarget({ ids, tab });
      setDelegateCurrentAssignee(current);
      setDelegateModalVisible(true);
    },
    [checklistItems, reviewElements],
  );
```

- [ ] **Step 3: 在 `handleDelegateConfirm` 结束时重置 currentAssignee**

`handleDelegateConfirm`（Task 3 改好的版本）末尾紧跟 `setDelegateTarget(null);` 之后，加 `setDelegateCurrentAssignee(null);`。

具体把：

```tsx
    setDelegateModalVisible(false);
    setDelegateTarget(null);
    message.success(`已委派给 ${targetUser.name}`);
```

改为：

```tsx
    setDelegateModalVisible(false);
    setDelegateTarget(null);
    setDelegateCurrentAssignee(null);
    message.success(`已委派给 ${targetUser.name}`);
```

- [ ] **Step 4: 收紧操作列权限 —— checklistColumns**

找到 `checklistColumns` 内"操作"列（约 line 555-572），把 render 替换为：

```tsx
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => {
        if (record.reviewStatus === 'passed') {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        const isDelegatedToMe = record.delegatedTo?.includes(currentUser.id) ?? false;
        const isRoleOwner = userResponsibleRoles.includes(record.responsibleRole as PipelineRole);
        const canEdit = isRoleOwner || isDelegatedToMe;
        if (!canEdit) {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'checklist')}>
              录入
            </Button>
            <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'checklist')}>
              委派
            </Button>
          </Space>
        );
      },
```

- [ ] **Step 5: 收紧操作列权限 —— reviewElementColumns**

找到 `reviewElementColumns` 内"操作"列（约 line 664-680），同样替换为：

```tsx
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => {
        if (record.reviewStatus === 'passed') {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        const isDelegatedToMe = record.delegatedTo?.includes(currentUser.id) ?? false;
        const isRoleOwner = userResponsibleRoles.includes(record.responsibleRole as PipelineRole);
        const canEdit = isRoleOwner || isDelegatedToMe;
        if (!canEdit) {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'review')}>
              录入
            </Button>
            <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'review')}>
              委派
            </Button>
          </Space>
        );
      },
```

- [ ] **Step 6: 更新两个 columns 的 useMemo 依赖**

`checklistColumns` 的 useMemo 依赖数组（约 line 572）原来是：

```tsx
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getClSearchProps]);
```

改为加入 `currentUser.id` 和 `userResponsibleRoles`：

```tsx
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getClSearchProps, currentUser.id, userResponsibleRoles]);
```

`reviewElementColumns` 的依赖数组（约 line 681）同样：

```tsx
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getReSearchProps]);
```

改为：

```tsx
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getReSearchProps, currentUser.id, userResponsibleRoles]);
```

- [ ] **Step 7: 把 `allowClear={false}` 与 `currentAssignee` 传给 DelegateModal**

找到 page 末尾的 `<DelegateModal ...>`（约 line 1023-1033），把：

```tsx
      <DelegateModal
        open={delegateModalVisible}
        title="委派任务"
        selectedCount={delegateTarget?.ids.length ?? 0}
        excludeUserIds={[currentUser.id]}
        onConfirm={handleDelegateConfirm}
        onCancel={() => {
          setDelegateModalVisible(false);
          setDelegateTarget(null);
        }}
      />
```

替换为：

```tsx
      <DelegateModal
        open={delegateModalVisible}
        title="委派任务"
        selectedCount={delegateTarget?.ids.length ?? 0}
        currentAssignee={delegateCurrentAssignee}
        excludeUserIds={[currentUser.id]}
        allowClear={false}
        onConfirm={handleDelegateConfirm}
        onCancel={() => {
          setDelegateModalVisible(false);
          setDelegateTarget(null);
          setDelegateCurrentAssignee(null);
        }}
      />
```

- [ ] **Step 8: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误。

- [ ] **Step 9: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "feat(entry): 操作列权限收紧 + 单条委派回填 currentAssignee"
```

---

## Task 8: 访问控制 —— 无角色但有被委派项的渲染分支

**Files:**
- Modify: `src/app/workbench/[id]/entry/page.tsx`

- [ ] **Step 1: 加 canAccessPage 的"无权访问"分支**

找到现有的早返回守卫（`if (!application)` 与 `if (application.status !== 'in_progress')`，约 line 685-706）。在 `application.status !== 'in_progress'` 守卫之后、`const selectedKeys = ...` 之前，加入：

```tsx
  if (!canAccessPage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert
          type="warning"
          showIcon
          title="无权访问"
          description="您不是当前应用任一资料录入角色的负责人,也无被委派项"
          style={{ maxWidth: 560, margin: '0 auto 16px' }}
        />
        <Button onClick={() => router.push('/workbench')}>返回工作台</Button>
      </div>
    );
  }
```

说明：`Alert` 使用 `title=` 属性键，与现有 entry 页 line 702 `<Alert ... title={statusText} description="..." />` 保持一致。

- [ ] **Step 2: 守卫主卡片渲染（无角色时不渲染 Role Segmented / 主 Tab / 提交按钮 / 驳回提示）**

修改 Header 区的 Role 选择器（约 line 720-739），在外层加 `userResponsibleRoles.length > 0` 守卫：

把：

```tsx
        {/* Role selector: Segmented for multi-role, Tag for single role */}
        {userResponsibleRoles.length > 1 ? (
          <Segmented
            ...
          />
        ) : effectiveRole ? (
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 13 }}>
            {effectiveRole}角色
          </Tag>
        ) : null}
```

保持现状（`userResponsibleRoles.length > 1` 与 `effectiveRole` 两个分支本来在无角色时就回 `null`，无需改）。

找到驳回提示 Collapse 块（约 line 748）。把 `{hasRejectedItems && (` 改为：

```tsx
      {userResponsibleRoles.length > 0 && hasRejectedItems && (
```

找到主卡片（约 line 836 `{/* Main card */}`）。把 `<div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>` 整段（直到匹配 `</div>`，包含 `<Tabs ...>` 整块）外层包一个条件：

```tsx
      {/* Main card */}
      {userResponsibleRoles.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
          <Tabs
            ...
          />
        </div>
      )}
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npm run type-check && npm run lint`
Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
git add src/app/workbench/[id]/entry/page.tsx
git commit -m "feat(entry): canAccessPage 守卫 + 无角色但有委派项的精简渲染"
```

---

## Task 9: 手动验证（不可省略）

**Files:** 不修改文件，只在浏览器验证。

- [ ] **Step 1: 起开发服务器**

Run: `npm run dev`
Expected: 端口 3000 启动，无编译错误。

- [ ] **Step 2: 切换 u004 赵六（底软）登录 app-001 录入页**

操作：
1. 浏览器打开 `http://localhost:3000/workbench`
2. 点击右上角用户切换到 u004 赵六
3. 进入 app-001（X6870）的 `资料录入与AI检查` 页面，切到"底软"角色

期望：
- 顶部**无**「委派给我的」Collapse（赵六没收到委派）
- 主表格转维材料 tab 看到 index 36/37 两行：
  - 责任人列：`赵六` + 紫色 `已委派` Tag + 蓝色 `录入委派→张三` Tag
  - 操作列：录入 + 委派 按钮
- 评审要素 tab 看到 index 6 类似的展示

- [ ] **Step 3: 切换 u001 张三（SPM）登录同一应用**

操作：切换用户为 u001 张三，进入同一应用的录入页。

期望：
- 顶部出现「委派给我的 (3 项)」Collapse，默认展开
  - 转维材料 (2)：index 36/37 两行；entryPerson 仍是「赵六」+ 两个 Tag
  - 评审要素 (1)：index 6 一行
- 主卡片 SPM 角色 tab 正常显示 SPM 自己的项，不受影响
- 操作列在「委派给我的」Collapse 中可见 录入 + 委派 按钮（因为张三是 isDelegatedToMe）

- [ ] **Step 4: 验证「转委派」回填**

操作：作为 u001 张三登录，在「委派给我的」Collapse 中对 index 36 行点击「委派」。

期望：
- DelegateModal 打开，选择框预填「赵六（u004）」—— 实际上预填的是 `delegatedTo[0] = u001 张三` 自己，但 `excludeUserIds=[currentUser.id]` 会从选项中过滤掉张三自己；预填值与可选项不一致是已知行为，因为张三被排除后下拉里看不到自己；这里实际验证点是**底部「清空委派」按钮不出现**（`allowClear={false}`）
- 选择另一个用户（如 u002 李四）→ 确认 → message 提示「已委派给 李四」
- 关闭 Modal 后表格中该行紫蓝 Tag 更新：`录入委派→李四`

> 修正项：第 4 步原本想验证 `currentAssignee` 回填的视觉效果，但因为 `excludeUserIds` 包含 currentUser 自己，且 currentAssignee 也是自己，预填值不在选项里。这个组合在实际产品中不会出现（张三不会去委派给自己），属于 mock 场景的边界。**真正要验证的是：DelegateModal 底部清空按钮不出现** —— 这是 `allowClear={false}` 的核心效果。

- [ ] **Step 5: 切换 u005 钱七（系统角色），验证无被委派时的行为**

操作：切换到 u005 钱七，进入 app-001 录入页。

期望：
- 顶部**无**「委派给我的」Collapse
- 主表格切到"系统"角色显示自己负责的项
- 责任人列若 entryPerson 是钱七自己且 `delegatedTo` 为空，不显示任何 Tag

- [ ] **Step 6: 验证审核页未受 DelegateModal 改动影响**

操作：切换到 u003 王五（SQA），进入 app-002（X6768）的 `维护审核` 页面。

期望：
- 审核页顶部「委派给我的」Collapse 正常展示
- 对任一被委派的项打开「委派」Modal，**底部「清空委派」按钮仍然存在**（审核页未传 `allowClear={false}`，使用默认 true）

- [ ] **Step 7: 验证无角色用户的访问保护（可选场景）**

操作：从 `src/context/UserContext.tsx` 或工作台切换一个**没有任何应用角色**且**没有被委派任何录入项**的用户（按 mock 当前覆盖，所有用户都至少在一个 team 里，所以这一步可能没法构造；若不可构造，跳过即可）。

期望：录入页显示「无权访问」Alert + 返回工作台按钮。

- [ ] **Step 8: 关掉 dev server**

按 `Ctrl+C` 终止 `npm run dev`。

- [ ] **Step 9: 跑最终 type-check + lint + build**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 三个命令全部通过，build 产物正常生成。

- [ ] **Step 10: 验证 git 状态干净**

Run: `git status`
Expected: 无未提交改动；分支领先 main / dev 8 个 commit（task 1-8 各一个，共 8）。

---

## 完成标志

- 所有 Task 1-8 提交都已落地；Task 9 手动验证全部通过
- `npm run build` 在 dev 分支干净通过
- spec 中"验证场景"4 项全部走通
