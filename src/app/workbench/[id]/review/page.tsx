'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table, Tabs, Tag, Button, Space, Modal, Input, Select,
  message, Tooltip, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, UserSwitchOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import { MOCK_USERS } from '@/mock';
import { useApplications } from '@/context/ApplicationContext';
import type {
  CheckListItem, ReviewElement, ReviewStatus,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { useCurrentUser } from '@/context/UserContext';
import EntryContentRenderer from '@/components/shared/EntryContentRenderer';
import { useColumnSearch } from '@/components/shared/useColumnSearch';

// Map team role to checklist responsibleRole
const TEAM_ROLE_TO_RESPONSIBLE: Record<string, string> = {
  SPM: 'SPM',
  TPM: '测试',
  '底软': '底软',
  '系统': '系统',
  '影像': '影像',
};

const { TextArea } = Input;

// --- Status rendering helpers ---

const ENTRY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_entered: { label: '未录入', color: 'default' },
  draft: { label: '暂存', color: 'orange' },
  entered: { label: '已录入', color: 'green' },
};

const AI_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_started: { label: '-', color: 'default' },
  in_progress: { label: '检查中', color: 'processing' },
  passed: { label: '通过', color: 'success' },
  failed: { label: '不通过', color: 'error' },
};

const REVIEW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_reviewed: { label: '未审核', color: 'default' },
  reviewing: { label: '审核中', color: 'processing' },
  passed: { label: '通过', color: 'success' },
  rejected: { label: '不通过', color: 'error' },
};

// --- Block task form ---
interface BlockTaskForm {
  description: string;
  resolution: string;
  responsiblePerson: string;
  department: string;
  deadline: string;
}

// --- Legacy task form ---
interface LegacyTaskForm {
  responsiblePerson: string;
  department: string;
  description: string;
  deadline: string;
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const {
    applications, checklistItems: ctxChecklist, reviewElements: ctxReview,
    updateChecklistItems, updateReviewElements,
  } = useApplications();

  const application = useMemo(
    () => applications.find((a) => a.id === id),
    [applications, id],
  );

  // Determine user's responsible role from the maintenance team
  const userResponsibleRole = useMemo(() => {
    if (!application) return null;
    const member = application.team.maintenance.find((m) => m.id === currentUser.id);
    if (!member) return null;
    return TEAM_ROLE_TO_RESPONSIBLE[member.role] ?? null;
  }, [application, currentUser.id]);

  // Derived from context
  const allChecklistItems = useMemo(
    () => ctxChecklist.filter((i) => i.applicationId === id) as CheckListItem[],
    [ctxChecklist, id],
  );
  const allReviewElements = useMemo(
    () => ctxReview.filter((i) => i.applicationId === id) as ReviewElement[],
    [ctxReview, id],
  );

  // Wrappers to update context directly
  const setAllChecklistItems = useCallback(
    (updater: (prev: CheckListItem[]) => CheckListItem[]) => {
      updateChecklistItems((all) => {
        const others = all.filter((i) => i.applicationId !== id);
        const current = all.filter((i) => i.applicationId === id) as CheckListItem[];
        return [...others, ...updater(current)];
      });
    },
    [updateChecklistItems, id],
  );
  const setAllReviewElements = useCallback(
    (updater: (prev: ReviewElement[]) => ReviewElement[]) => {
      updateReviewElements((all) => {
        const others = all.filter((i) => i.applicationId !== id);
        const current = all.filter((i) => i.applicationId === id) as ReviewElement[];
        return [...others, ...updater(current)];
      });
    },
    [updateReviewElements, id],
  );

  // Role-filtered views
  const checklistItems = useMemo(() => {
    if (!userResponsibleRole) return allChecklistItems;
    return allChecklistItems.filter((i) =>
      i.responsibleRole === userResponsibleRole
      || i.reviewPersonId === currentUser.id
      || i.delegatedTo?.includes(currentUser.id)
    );
  }, [allChecklistItems, userResponsibleRole, currentUser.id]);

  const reviewElements = useMemo(() => {
    if (!userResponsibleRole) return allReviewElements;
    return allReviewElements.filter((i) =>
      i.responsibleRole === userResponsibleRole
      || i.reviewPersonId === currentUser.id
      || i.delegatedTo?.includes(currentUser.id)
    );
  }, [allReviewElements, userResponsibleRole, currentUser.id]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState('checklist');

  // Modals
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [wantLegacy, setWantLegacy] = useState(false);

  // Delegate modal & delegated reviewer display
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [delegatePersonId, setDelegatePersonId] = useState<string | undefined>(undefined);
  const [delegatedReviewerName, setDelegatedReviewerName] = useState<string | null>(null);

  // Fail form
  const [reviewComment, setReviewComment] = useState('');
  const [blockTasks, setBlockTasks] = useState<BlockTaskForm[]>([
    { description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' },
  ]);

  // Legacy task form
  const [legacyTasks, setLegacyTasks] = useState<LegacyTaskForm[]>([
    { responsiblePerson: '', department: '', description: '', deadline: '' },
  ]);

  // --- All hooks must be above the early return ---

  const currentRole = userResponsibleRole ?? 'SPM';
  const maintenanceMember = application?.team.maintenance.find((m) => m.id === currentUser.id);

  // --- Single item review ---
  const handleItemReview = useCallback((itemId: string, type: 'checklist' | 'review_element', newStatus: ReviewStatus) => {
    if (type === 'checklist') {
      setAllChecklistItems((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, reviewStatus: newStatus } : item)
      );
    } else {
      setAllReviewElements((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, reviewStatus: newStatus } : item)
      );
    }
    message.success(newStatus === 'passed' ? '已通过' : '已标记为不通过');
  }, [setAllChecklistItems, setAllReviewElements]);

  // --- Batch review ---
  const handleBatchReview = useCallback((newStatus: ReviewStatus) => {
    if (activeTab === 'checklist') {
      setAllChecklistItems((prev) =>
        prev.map((item) =>
          selectedRowKeys.includes(item.id) ? { ...item, reviewStatus: newStatus } : item
        )
      );
    } else {
      setAllReviewElements((prev) =>
        prev.map((item) =>
          selectedRowKeys.includes(item.id) ? { ...item, reviewStatus: newStatus } : item
        )
      );
    }
    setSelectedRowKeys([]);
    message.success(`批量${newStatus === 'passed' ? '通过' : '不通过'} ${selectedRowKeys.length} 条记录`);
  }, [activeTab, selectedRowKeys, setAllChecklistItems, setAllReviewElements]);

  // Helper: update all items of current role to a given reviewStatus
  const applyRoleReviewStatus = useCallback((newStatus: ReviewStatus) => {
    const isMyRoleItem = (item: CheckListItem | ReviewElement) =>
      item.responsibleRole === userResponsibleRole;

    // 驳回时重置 aiCheckStatus，强制研发侧重新修改并触发AI检查后才能再提交
    const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
      if (!isMyRoleItem(item)) return item;
      if (newStatus === 'rejected') {
        return { ...item, reviewStatus: newStatus, aiCheckStatus: 'not_started' as const };
      }
      return { ...item, reviewStatus: newStatus };
    };

    setAllChecklistItems((prev) => prev.map(updateItem));
    setAllReviewElements((prev) => prev.map(updateItem));
  }, [setAllChecklistItems, setAllReviewElements, userResponsibleRole]);

  // --- Pass confirm ---
  const handlePassConfirm = useCallback(() => {
    if (wantLegacy) {
      const hasEmpty = legacyTasks.some(
        (t) => !t.responsiblePerson || !t.department || !t.description || !t.deadline
      );
      if (hasEmpty) {
        message.warning('请填写完整所有遗留任务信息');
        return;
      }
    }
    applyRoleReviewStatus('passed');
    message.success('审核通过，已提交');
    setPassModalOpen(false);
    setWantLegacy(false);
    setLegacyTasks([{ responsiblePerson: '', department: '', description: '', deadline: '' }]);
    router.push(`/workbench/${id}`);
  }, [wantLegacy, legacyTasks, applyRoleReviewStatus, router, id]);

  // --- Fail confirm ---
  const handleFailConfirm = useCallback(() => {
    if (!reviewComment.trim()) {
      message.warning('请填写评审意见');
      return;
    }
    const hasEmpty = blockTasks.some(
      (t) => !t.description || !t.resolution || !t.responsiblePerson || !t.department || !t.deadline
    );
    if (hasEmpty) {
      message.warning('请填写完整所有Block任务信息');
      return;
    }
    applyRoleReviewStatus('rejected');
    message.success('已拒绝并创建Block任务，已回退到资料录入阶段');
    setFailModalOpen(false);
    setReviewComment('');
    setBlockTasks([{ description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' }]);
    router.push(`/workbench/${id}`);
  }, [reviewComment, blockTasks, applyRoleReviewStatus, router, id]);

  // --- Block task CRUD ---
  const addBlockTask = useCallback(() => {
    setBlockTasks((prev) => [
      ...prev,
      { description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' },
    ]);
  }, []);
  const removeBlockTask = useCallback((index: number) => {
    setBlockTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const updateBlockTask = useCallback((index: number, field: keyof BlockTaskForm, value: string) => {
    setBlockTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }, []);

  // --- Legacy task CRUD ---
  const addLegacyTask = useCallback(() => {
    setLegacyTasks((prev) => [
      ...prev,
      { responsiblePerson: '', department: '', description: '', deadline: '' },
    ]);
  }, []);
  const removeLegacyTask = useCallback((index: number) => {
    setLegacyTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const updateLegacyTask = useCallback((index: number, field: keyof LegacyTaskForm, value: string) => {
    setLegacyTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }, []);

  // --- Delegate: assign all review items of current role to another person ---
  const openDelegateModal = useCallback(() => {
    setDelegatePersonId(undefined);
    setDelegateModalOpen(true);
  }, []);

  const handleDelegateConfirm = useCallback(() => {
    if (!delegatePersonId) {
      message.warning('请选择委派人员');
      return;
    }
    const targetUser = MOCK_USERS.find((u) => u.id === delegatePersonId);
    if (!targetUser) return;

    const isMyItem = (item: CheckListItem | ReviewElement) =>
      item.responsibleRole === userResponsibleRole
      || item.reviewPersonId === currentUser.id;

    const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
      if (!isMyItem(item)) return item;
      return {
        ...item,
        reviewPerson: targetUser.name,
        reviewPersonId: targetUser.id,
        delegatedTo: [...new Set([...(item.delegatedTo ?? []), targetUser.id])],
      };
    };

    setAllChecklistItems((prev) => prev.map(updateItem));
    setAllReviewElements((prev) => prev.map(updateItem));
    setDelegatedReviewerName(targetUser.name);

    setDelegateModalOpen(false);
    setDelegatePersonId(undefined);
    message.success(`已将${currentRole}角色的审核任务委派给 ${targetUser.name}`);
  }, [delegatePersonId, userResponsibleRole, currentUser.id, currentRole, setAllChecklistItems, setAllReviewElements]);

  // --- User options for selectors ---
  const userOptions = useMemo(
    () => MOCK_USERS.map((u) => ({ label: `${u.name} (${u.role} - ${u.department})`, value: u.id })),
    [],
  );

  // --- Column search ---
  const { getColumnSearchProps: getClSearchProps } = useColumnSearch<CheckListItem>();
  const { getColumnSearchProps: getReSearchProps } = useColumnSearch<ReviewElement>();

  // --- Early return after all hooks ---
  if (!application) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>未找到转维申请</h2>
        <Button onClick={() => router.push('/workbench')}>返回</Button>
      </div>
    );
  }

  // --- Checklist columns ---
  const checklistColumns: ColumnsType<CheckListItem> = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
    {
      title: '评审要素', dataIndex: 'checkItem', key: 'checkItem', width: 260,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      ...getClSearchProps('checkItem'),
    },
    { title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center' },
    { title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 110, align: 'center' },
    {
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 130, align: 'center',
      render: (text: string, record: CheckListItem) => (
        <Space size={4}>
          <span>{text}</span>
          {record.delegatedTo && record.delegatedTo.length > 0 && (
            <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '交付件', key: 'deliverables', width: 180,
      render: (_: unknown, record: CheckListItem) => <EntryContentRenderer content={record.entryContent} />,
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      filters: [
        { text: '未录入', value: 'not_entered' },
        { text: '暂存', value: 'draft' },
        { text: '已录入', value: 'entered' },
      ],
      onFilter: (value, record) => record.entryStatus === String(value),
      render: (_: unknown, record: CheckListItem) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s?.color}>{s?.label ?? record.entryStatus}</Tag>;
      },
    },
    {
      title: 'AI检查', key: 'aiCheckStatus', width: 90, align: 'center',
      filters: [
        { text: '-', value: 'not_started' },
        { text: '检查中', value: 'in_progress' },
        { text: '通过', value: 'passed' },
        { text: '不通过', value: 'failed' },
      ],
      onFilter: (value, record) => record.aiCheckStatus === String(value),
      render: (_: unknown, record: CheckListItem) => {
        const s = AI_STATUS_MAP[record.aiCheckStatus];
        return <Tag color={s?.color}>{s?.label ?? record.aiCheckStatus}</Tag>;
      },
    },
    {
      title: '审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_: unknown, record: CheckListItem) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s?.color}>{s?.label ?? record.reviewStatus}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 140, align: 'center', fixed: 'right',
      render: (_: unknown, record: CheckListItem) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<CheckCircleOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleItemReview(record.id, 'checklist', 'passed')}>
            通过
          </Button>
          <Button type="link" size="small" danger icon={<CloseCircleOutlined />}
            onClick={() => handleItemReview(record.id, 'checklist', 'rejected')}>
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  // --- Review element columns ---
  const reviewElementColumns: ColumnsType<ReviewElement> = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center' },
    { title: '标准', dataIndex: 'standard', key: 'standard', width: 100 },
    {
      title: '说明', dataIndex: 'description', key: 'description', width: 220,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      ...getReSearchProps('description'),
    },
    {
      title: '备注', dataIndex: 'remark', key: 'remark', width: 140,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    { title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center' },
    { title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 110, align: 'center' },
    {
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 130, align: 'center',
      render: (text: string, record: ReviewElement) => (
        <Space size={4}>
          <span>{text}</span>
          {record.delegatedTo && record.delegatedTo.length > 0 && (
            <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '交付件', key: 'deliverables', width: 120,
      render: (_: unknown, record: ReviewElement) => <EntryContentRenderer content={record.entryContent} />,
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      filters: [
        { text: '未录入', value: 'not_entered' },
        { text: '暂存', value: 'draft' },
        { text: '已录入', value: 'entered' },
      ],
      onFilter: (value, record) => record.entryStatus === String(value),
      render: (_: unknown, record: ReviewElement) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s?.color}>{s?.label ?? record.entryStatus}</Tag>;
      },
    },
    {
      title: 'AI检查', key: 'aiCheckStatus', width: 90, align: 'center',
      filters: [
        { text: '-', value: 'not_started' },
        { text: '检查中', value: 'in_progress' },
        { text: '通过', value: 'passed' },
        { text: '不通过', value: 'failed' },
      ],
      onFilter: (value, record) => record.aiCheckStatus === String(value),
      render: (_: unknown, record: ReviewElement) => {
        const s = AI_STATUS_MAP[record.aiCheckStatus];
        return <Tag color={s?.color}>{s?.label ?? record.aiCheckStatus}</Tag>;
      },
    },
    {
      title: '审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_: unknown, record: ReviewElement) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s?.color}>{s?.label ?? record.reviewStatus}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 140, align: 'center', fixed: 'right',
      render: (_: unknown, record: ReviewElement) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<CheckCircleOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleItemReview(record.id, 'review_element', 'passed')}>
            通过
          </Button>
          <Button type="link" size="small" danger icon={<CloseCircleOutlined />}
            onClick={() => handleItemReview(record.id, 'review_element', 'rejected')}>
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div style={{ padding: '16px 24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>维护审核</h2>
        <span style={{ color: '#888', fontSize: 14 }}>{application.projectName}</span>
        {userResponsibleRole && (
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 13 }}>
            {currentRole}角色
          </Tag>
        )}
      </div>

      {/* Pipeline */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '8px 24px', marginBottom: 16 }}>
        <PipelineProgress pipeline={application.pipeline} />
      </div>

      {/* Sticky review action bar */}
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: '12px 20px',
        marginBottom: 16,
        position: 'sticky',
        top: 56,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            评审角色：<Tag color="blue" style={{ fontSize: 13 }}>{currentRole}</Tag>
          </span>
          <span style={{ color: '#666', fontSize: 13 }}>
            负责人：{delegatedReviewerName ?? maintenanceMember?.name ?? '-'}
            {delegatedReviewerName && (
              <Tag color="purple" style={{ fontSize: 11, marginLeft: 6 }}>已委派</Tag>
            )}
          </span>
        </div>
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
              <Divider type="vertical" />
            </>
          )}
          <Button icon={<UserSwitchOutlined />} onClick={openDelegateModal}>
            委派
          </Button>
          <Divider type="vertical" />
          <Button danger onClick={() => setFailModalOpen(true)} icon={<CloseCircleOutlined />}>
            不通过
          </Button>
          <Button type="primary" onClick={() => setPassModalOpen(true)} icon={<CheckCircleOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}>
            通过
          </Button>
        </Space>
      </div>

      {/* Main content */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSelectedRowKeys([]); }}
          items={[
            {
              key: 'checklist',
              label: `转维材料 (${checklistItems.length})`,
              children: (
                <Table<CheckListItem>
                  rowKey="id"
                  columns={checklistColumns}
                  dataSource={checklistItems}
                  rowSelection={rowSelection}
                  scroll={{ x: 1600 }}
                  pagination={false}
                  size="middle"
                />
              ),
            },
            {
              key: 'review_element',
              label: `评审要素 (${reviewElements.length})`,
              children: (
                <Table<ReviewElement>
                  rowKey="id"
                  columns={reviewElementColumns}
                  dataSource={reviewElements}
                  rowSelection={rowSelection}
                  scroll={{ x: 1700 }}
                  pagination={false}
                  size="middle"
                />
              ),
            },
          ]}
        />
      </div>

      {/* Pass Modal */}
      <Modal
        title="确认审核通过"
        open={passModalOpen}
        onCancel={() => { setPassModalOpen(false); setWantLegacy(false); }}
        onOk={handlePassConfirm}
        okText="确认通过"
        cancelText="取消"
        width={700}
        destroyOnHidden
      >
        {!wantLegacy ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 15, marginBottom: 20 }}>是否需要创建遗留任务？</p>
            <Space size={16}>
              <Button size="large" onClick={handlePassConfirm}>
                否，直接通过
              </Button>
              <Button size="large" type="primary" onClick={() => setWantLegacy(true)}>
                是，创建遗留任务
              </Button>
            </Space>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>创建遗留任务</span>
              <span style={{ color: '#999', fontSize: 13, marginLeft: 8 }}>可添加一个或多个遗留任务</span>
            </div>
            {legacyTasks.map((task, index) => (
              <div key={index} style={{
                border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 12,
                background: '#fafafa',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500, color: '#333' }}>遗留任务 {index + 1}</span>
                  {legacyTasks.length > 1 && (
                    <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => removeLegacyTask(index)} />
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>责任人 *</div>
                    <Select style={{ width: '100%' }} placeholder="选择责任人" options={userOptions}
                      value={task.responsiblePerson || undefined}
                      onChange={(v) => updateLegacyTask(index, 'responsiblePerson', v)} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>部门 *</div>
                    <Input placeholder="输入部门" value={task.department}
                      onChange={(e) => updateLegacyTask(index, 'department', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>问题描述 *</div>
                  <TextArea rows={2} placeholder="描述遗留问题" value={task.description}
                    onChange={(e) => updateLegacyTask(index, 'description', e.target.value)} />
                </div>
                <div>
                  <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>完成时间 *</div>
                  <Input type="date" value={task.deadline} style={{ width: '100%' }}
                    onChange={(e) => updateLegacyTask(index, 'deadline', e.target.value)} />
                </div>
              </div>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addLegacyTask}>
              新增任务行
            </Button>
          </div>
        )}
      </Modal>

      {/* Fail Modal */}
      <Modal
        title="创建 Block 任务"
        open={failModalOpen}
        onCancel={() => setFailModalOpen(false)}
        onOk={handleFailConfirm}
        okText="确认并保存"
        cancelText="取消"
        width={750}
        destroyOnHidden
      >
        <p style={{ color: '#999', marginBottom: 16 }}>若检查项未通过，可添加一个或多个 Block 任务以便跟踪整改。</p>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>评审意见 *</div>
          <TextArea rows={3} placeholder="请填写评审意见" value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)} />
        </div>
        {blockTasks.map((task, index) => (
          <div key={index} style={{
            border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 12,
            background: '#fafafa',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 500, color: '#333' }}>Block 任务 {index + 1}</span>
              {blockTasks.length > 1 && (
                <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => removeBlockTask(index)} />
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>Block 点描述 *</div>
              <TextArea rows={2} placeholder="描述Block点" value={task.description}
                onChange={(e) => updateBlockTask(index, 'description', e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>解除措施 *</div>
              <TextArea rows={2} placeholder="描述解除措施" value={task.resolution}
                onChange={(e) => updateBlockTask(index, 'resolution', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>责任人 *</div>
                <Select style={{ width: '100%' }} placeholder="选择责任人" options={userOptions}
                  value={task.responsiblePerson || undefined}
                  onChange={(v) => updateBlockTask(index, 'responsiblePerson', v)} />
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>部门 *</div>
                <Input placeholder="输入部门" value={task.department}
                  onChange={(e) => updateBlockTask(index, 'department', e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>完成时间 *</div>
              <Input type="date" value={task.deadline} style={{ width: '100%' }}
                onChange={(e) => updateBlockTask(index, 'deadline', e.target.value)} />
            </div>
          </div>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={addBlockTask}>
          新增 Block 行
        </Button>
      </Modal>

      {/* Delegate Modal */}
      <Modal
        title="委派审核任务"
        open={delegateModalOpen}
        onCancel={() => {
          setDelegateModalOpen(false);
          setDelegatePersonId(undefined);
        }}
        onOk={handleDelegateConfirm}
        okText="确认委派"
        cancelText="取消"
        width={500}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16, color: '#666' }}>
          将 <Tag color="blue">{currentRole}</Tag> 角色的所有审核任务委派给其他人员，委派后该人员将成为新的审核责任人。
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="选择委派人员"
          value={delegatePersonId}
          onChange={setDelegatePersonId}
          options={(() => {
            const alreadyDelegated = new Set(
              [...checklistItems, ...reviewElements]
                .flatMap((i) => i.delegatedTo ?? [])
            );
            return MOCK_USERS
              .filter((u) => u.id !== currentUser.id && !alreadyDelegated.has(u.id))
              .map((u) => ({ value: u.id, label: `${u.name} (${u.role} - ${u.department})` }));
          })()}
          optionFilterProp="label"
          showSearch
        />
      </Modal>
    </div>
  );
}
