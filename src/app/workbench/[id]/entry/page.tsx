'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table, Button, Tag, Tabs, Select, Modal, Input, Space, Alert, message, Tooltip, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, UploadOutlined, DownloadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, LoadingOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import {
  MOCK_APPLICATIONS, MOCK_CHECKLIST_ITEMS, MOCK_REVIEW_ELEMENTS, MOCK_USERS,
  MOCK_BLOCK_TASKS,
} from '@/mock';
import type {
  CheckListItem, ReviewElement, EntryStatus, AICheckStatus, ReviewStatus,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { useCurrentUser } from '@/context/UserContext';

// Map team role to checklist responsibleRole
const TEAM_ROLE_TO_RESPONSIBLE: Record<string, string> = {
  SPM: 'SPM',
  TPM: '测试',
  '底软': '底软',
  '系统': '系统',
};

const { TextArea } = Input;

// --- Status rendering helpers ---

const ENTRY_STATUS_MAP: Record<EntryStatus, { label: string; color: string }> = {
  not_entered: { label: '未录入', color: 'default' },
  draft: { label: '暂存', color: 'orange' },
  entered: { label: '已录入', color: 'green' },
};

const AI_CHECK_STATUS_MAP: Record<AICheckStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: '未开始', color: 'default', icon: <ClockCircleOutlined /> },
  in_progress: { label: '检查中', color: 'processing', icon: <LoadingOutlined /> },
  passed: { label: '通过', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { label: '不通过', color: 'error', icon: <ExclamationCircleOutlined /> },
};

const REVIEW_STATUS_MAP: Record<ReviewStatus, { label: string; color: string }> = {
  not_reviewed: { label: '未审核', color: 'default' },
  reviewing: { label: '审核中', color: 'processing' },
  passed: { label: '通过', color: 'success' },
  rejected: { label: '不通过', color: 'error' },
};

// --- Helper to render deliverables ---

function renderDeliverables(deliverables: ReadonlyArray<{ name: string; url: string }>) {
  if (deliverables.length === 0) return <span style={{ color: '#999' }}>-</span>;
  return (
    <Space direction="vertical" size={0}>
      {deliverables.map((d) => (
        <a key={d.name} href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
          {d.name}
        </a>
      ))}
    </Space>
  );
}

// --- Main Page Component ---

export default function DataEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  // Find application
  const application = useMemo(
    () => MOCK_APPLICATIONS.find((a) => a.id === id),
    [id],
  );

  // Determine user's responsible role from the research team
  const userResponsibleRole = useMemo(() => {
    if (!application) return null;
    const member = application.team.research.find((m) => m.id === currentUser.id);
    if (!member) return null;
    return TEAM_ROLE_TO_RESPONSIBLE[member.role] ?? null;
  }, [application, currentUser.id]);

  // Local state for checklist items and review elements - filtered by user's role
  const [checklistItems, setChecklistItems] = useState<ReadonlyArray<CheckListItem>>(
    () => MOCK_CHECKLIST_ITEMS.filter((item) => item.applicationId === id),
  );
  const [reviewElements, setReviewElements] = useState<ReadonlyArray<ReviewElement>>(
    () => MOCK_REVIEW_ELEMENTS.filter((item) => item.applicationId === id),
  );

  // Show items matching current user's role OR delegated to current user
  const roleFilteredChecklist = useMemo(() => {
    if (!userResponsibleRole) return checklistItems;
    return checklistItems.filter((item) =>
      item.responsibleRole === userResponsibleRole
      || item.entryPersonId === currentUser.id
      || item.delegatedTo?.includes(currentUser.id)
    );
  }, [checklistItems, userResponsibleRole, currentUser.id]);

  const roleFilteredReviewElements = useMemo(() => {
    if (!userResponsibleRole) return reviewElements;
    return reviewElements.filter((item) =>
      item.responsibleRole === userResponsibleRole
      || item.entryPersonId === currentUser.id
      || item.delegatedTo?.includes(currentUser.id)
    );
  }, [reviewElements, userResponsibleRole, currentUser.id]);

  // Block tasks for rejected alert
  const blockTasks = useMemo(
    () => MOCK_BLOCK_TASKS.filter((t) => t.applicationId === id && t.status === 'open'),
    [id],
  );

  // Filter states
  const [entryStatusFilter, setEntryStatusFilter] = useState<string>('all');
  const [aiCheckStatusFilter, setAiCheckStatusFilter] = useState<string>('all');

  // Tab
  const [activeTab, setActiveTab] = useState<string>('checklist');

  // Selection
  const [selectedChecklistKeys, setSelectedChecklistKeys] = useState<React.Key[]>([]);
  const [selectedReviewKeys, setSelectedReviewKeys] = useState<React.Key[]>([]);

  // Entry modal
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryModalTarget, setEntryModalTarget] = useState<{ id: string; tab: 'checklist' | 'review' } | null>(null);
  const [entryContent, setEntryContent] = useState('');

  // Delegate modal - single select, reassign entry person
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<{ ids: ReadonlyArray<string>; tab: 'checklist' | 'review' } | null>(null);
  const [delegatePersonId, setDelegatePersonId] = useState<string | undefined>(undefined);

  // AI check detail modal
  const [aiDetailModalVisible, setAiDetailModalVisible] = useState(false);
  const [aiDetailContent, setAiDetailContent] = useState('');

  // --- Filtered data ---

  const filteredChecklist = useMemo(() => {
    return roleFilteredChecklist.filter((item) => {
      if (entryStatusFilter !== 'all' && item.entryStatus !== entryStatusFilter) return false;
      if (aiCheckStatusFilter !== 'all' && item.aiCheckStatus !== aiCheckStatusFilter) return false;
      return true;
    });
  }, [roleFilteredChecklist, entryStatusFilter, aiCheckStatusFilter]);

  const filteredReviewElements = useMemo(() => {
    return roleFilteredReviewElements.filter((item) => {
      if (entryStatusFilter !== 'all' && item.entryStatus !== entryStatusFilter) return false;
      if (aiCheckStatusFilter !== 'all' && item.aiCheckStatus !== aiCheckStatusFilter) return false;
      return true;
    });
  }, [roleFilteredReviewElements, entryStatusFilter, aiCheckStatusFilter]);

  // --- Check if all items for this role are entered and AI passed ---

  const allChecklistReady = useMemo(
    () => roleFilteredChecklist.length > 0 && roleFilteredChecklist.every(
      (item) => item.entryStatus === 'entered' && item.aiCheckStatus === 'passed',
    ),
    [roleFilteredChecklist],
  );

  const allReviewElementsReady = useMemo(
    () => roleFilteredReviewElements.length > 0 && roleFilteredReviewElements.every(
      (item) => item.entryStatus === 'entered' && item.aiCheckStatus === 'passed',
    ),
    [roleFilteredReviewElements],
  );

  const canSubmitReview = allChecklistReady && allReviewElementsReady;

  // --- Has rejected items (show block alert) ---

  const hasRejectedItems = useMemo(
    () => roleFilteredChecklist.some((i) => i.reviewStatus === 'rejected')
      || roleFilteredReviewElements.some((i) => i.reviewStatus === 'rejected'),
    [roleFilteredChecklist, roleFilteredReviewElements],
  );

  // --- Entry modal handlers ---

  const openEntryModal = useCallback((itemId: string, tab: 'checklist' | 'review') => {
    const items = tab === 'checklist' ? checklistItems : reviewElements;
    const item = items.find((i) => i.id === itemId);
    setEntryContent(item?.entryContent ?? '');
    setEntryModalTarget({ id: itemId, tab });
    setEntryModalVisible(true);
  }, [checklistItems, reviewElements]);

  const handleEntrySave = useCallback((mode: 'draft' | 'confirm') => {
    if (!entryModalTarget) return;
    if (!entryContent.trim()) {
      message.warning('请输入内容');
      return;
    }

    const newEntryStatus: EntryStatus = mode === 'draft' ? 'draft' : 'entered';
    const newAiCheckStatus: AICheckStatus = mode === 'confirm' ? 'in_progress' : 'not_started';

    if (entryModalTarget.tab === 'checklist') {
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === entryModalTarget.id
            ? { ...item, entryContent, entryStatus: newEntryStatus, aiCheckStatus: newAiCheckStatus }
            : item,
        ),
      );
    } else {
      setReviewElements((prev) =>
        prev.map((item) =>
          item.id === entryModalTarget.id
            ? { ...item, entryContent, entryStatus: newEntryStatus, aiCheckStatus: newAiCheckStatus }
            : item,
        ),
      );
    }

    setEntryModalVisible(false);
    setEntryModalTarget(null);
    setEntryContent('');

    if (mode === 'draft') {
      message.success('已暂存');
    } else {
      message.success('已确认提交，AI检查已触发');
    }
  }, [entryModalTarget, entryContent]);

  // --- Delegate modal handlers ---

  const openDelegateModal = useCallback((ids: ReadonlyArray<string>, tab: 'checklist' | 'review') => {
    setDelegateTarget({ ids, tab });
    setDelegatePersonId(undefined);
    setDelegateModalVisible(true);
  }, []);

  const handleDelegateConfirm = useCallback(() => {
    if (!delegateTarget || !delegatePersonId) {
      message.warning('请选择委派人员');
      return;
    }

    const targetUser = MOCK_USERS.find((u) => u.id === delegatePersonId);
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
    message.success(`已委派给 ${targetUser.name}，录入责任人已更新`);
  }, [delegateTarget, delegatePersonId]);

  // --- Submit review ---

  const handleSubmitReview = useCallback(() => {
    Modal.confirm({
      title: '确认提交审核',
      content: '提交后将进入维护审核阶段，确认提交？',
      okText: '确认提交',
      cancelText: '取消',
      onOk: () => {
        message.success('已提交维护审核');
      },
    });
  }, []);

  // --- AI check detail ---

  const showAiCheckDetail = useCallback((item: CheckListItem | ReviewElement) => {
    if (item.aiCheckStatus === 'not_started') return;
    const detail = item.aiCheckResult
      ?? (item.aiCheckStatus === 'passed' ? 'AI检查通过，内容符合要求。' : 'AI检查进行中...');
    setAiDetailContent(detail);
    setAiDetailModalVisible(true);
  }, []);

  // --- Table columns for checklist ---

  const checklistColumns: ColumnsType<CheckListItem> = useMemo(() => [
    {
      title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center',
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
    },
    {
      title: '评审要素', dataIndex: 'checkItem', key: 'checkItem', width: 260,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center',
    },
    {
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 130, align: 'center',
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
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 110, align: 'center',
    },
    {
      title: '智能检查规则', dataIndex: 'aiCheckRule', key: 'aiCheckRule', width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '交付件', key: 'deliverables', width: 120,
      render: (_, record) => renderDeliverables(record.deliverables),
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      render: (_, record) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', key: 'aiCheckStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = AI_CHECK_STATUS_MAP[record.aiCheckStatus];
        return (
          <Tag
            color={s.color}
            icon={s.icon}
            style={{ cursor: record.aiCheckStatus !== 'not_started' ? 'pointer' : 'default' }}
            onClick={() => showAiCheckDetail(record)}
          >
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: '维护审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'checklist')}>
            录入
          </Button>
          <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'checklist')}>
            委派
          </Button>
        </Space>
      ),
    },
  ], [openEntryModal, openDelegateModal, showAiCheckDetail]);

  // --- Table columns for review elements ---

  const reviewElementColumns: ColumnsType<ReviewElement> = useMemo(() => [
    {
      title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center',
    },
    {
      title: '标准', dataIndex: 'standard', key: 'standard', width: 100,
    },
    {
      title: '说明', dataIndex: 'description', key: 'description', width: 220,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '备注', dataIndex: 'remark', key: 'remark', width: 160,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center',
    },
    {
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 130, align: 'center',
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
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 110, align: 'center',
    },
    {
      title: '智能检查规则', dataIndex: 'aiCheckRule', key: 'aiCheckRule', width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '交付件', key: 'deliverables', width: 120,
      render: (_, record) => renderDeliverables(record.deliverables),
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      render: (_, record) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', key: 'aiCheckStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = AI_CHECK_STATUS_MAP[record.aiCheckStatus];
        return (
          <Tag
            color={s.color}
            icon={s.icon}
            style={{ cursor: record.aiCheckStatus !== 'not_started' ? 'pointer' : 'default' }}
            onClick={() => showAiCheckDetail(record)}
          >
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: '维护审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'review')}>
            录入
          </Button>
          <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'review')}>
            委派
          </Button>
        </Space>
      ),
    },
  ], [openEntryModal, openDelegateModal, showAiCheckDetail]);

  // --- Render ---

  if (!application) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>未找到转维申请</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const selectedKeys = activeTab === 'checklist' ? selectedChecklistKeys : selectedReviewKeys;
  const setSelectedKeys = activeTab === 'checklist' ? setSelectedChecklistKeys : setSelectedReviewKeys;
  const currentTab = activeTab as 'checklist' | 'review';

  return (
    <div style={{ padding: '16px 24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>资料录入与AI检查</h2>
        <span style={{ color: '#888', fontSize: 14 }}>{application.projectName}</span>
        {userResponsibleRole && (
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 13 }}>
            {userResponsibleRole}角色
          </Tag>
        )}
      </div>

      {/* Pipeline Progress */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '8px 24px', marginBottom: 16 }}>
        <PipelineProgress pipeline={application.pipeline} />
      </div>

      {/* Rejected alert with block tasks */}
      {hasRejectedItems && blockTasks.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="维护审核不通过，存在未解决的Block任务"
          description={
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {blockTasks.map((bt) => (
                <li key={bt.id}>
                  <strong>{bt.description}</strong> - 责任人: {bt.responsiblePerson}，
                  截止时间: {bt.deadline}
                </li>
              ))}
            </ul>
          }
        />
      )}

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
        {/* Top controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space size={12} wrap>
            <Select
              style={{ width: 160 }}
              value={entryStatusFilter}
              onChange={setEntryStatusFilter}
              options={[
                { value: 'all', label: '全部录入状态' },
                { value: 'not_entered', label: '未录入' },
                { value: 'draft', label: '暂存' },
                { value: 'entered', label: '已录入' },
              ]}
            />
            <Select
              style={{ width: 180 }}
              value={aiCheckStatusFilter}
              onChange={setAiCheckStatusFilter}
              options={[
                { value: 'all', label: '全部AI检查状态' },
                { value: 'not_started', label: '未开始' },
                { value: 'in_progress', label: '检查中' },
                { value: 'passed', label: '通过' },
                { value: 'failed', label: '不通过' },
              ]}
            />
          </Space>

          <Space size={8}>
            <Tooltip title={canSubmitReview ? '所有录入项已通过AI检查，可以提交审核' : '需要所有录入项的录入状态和AI检查都通过后才能提交'}>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmitReview} disabled={!canSubmitReview}>
                提交审核
              </Button>
            </Tooltip>
            {selectedKeys.length > 0 && (
              <Button onClick={() => openDelegateModal(selectedKeys as string[], currentTab)}>
                全部委派 ({selectedKeys.length})
              </Button>
            )}
            <Button icon={<UploadOutlined />}>导入</Button>
            <Button icon={<DownloadOutlined />}>导出</Button>
          </Space>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setSelectedChecklistKeys([]);
            setSelectedReviewKeys([]);
          }}
          items={[
            {
              key: 'checklist',
              label: `转维材料 (${roleFilteredChecklist.length})`,
              children: (
                <Table<CheckListItem>
                  rowKey="id"
                  columns={checklistColumns}
                  dataSource={filteredChecklist as CheckListItem[]}
                  pagination={false}
                  scroll={{ x: 1600 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedChecklistKeys,
                    onChange: setSelectedChecklistKeys,
                  }}
                />
              ),
            },
            {
              key: 'review',
              label: `评审要素 (${roleFilteredReviewElements.length})`,
              children: (
                <Table<ReviewElement>
                  rowKey="id"
                  columns={reviewElementColumns}
                  dataSource={filteredReviewElements as ReviewElement[]}
                  pagination={false}
                  scroll={{ x: 1700 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedReviewKeys,
                    onChange: setSelectedReviewKeys,
                  }}
                />
              ),
            },
          ]}
        />
      </div>

      {/* Entry Modal */}
      <Modal
        title="资料录入"
        open={entryModalVisible}
        onCancel={() => {
          setEntryModalVisible(false);
          setEntryModalTarget(null);
          setEntryContent('');
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setEntryModalVisible(false);
              setEntryModalTarget(null);
              setEntryContent('');
            }}>
              取消
            </Button>
            <Button onClick={() => handleEntrySave('draft')} style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>
              暂存
            </Button>
            <Button type="primary" onClick={() => handleEntrySave('confirm')}>
              确认
            </Button>
          </Space>
        }
        width={600}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>录入内容</div>
          <TextArea
            rows={6}
            placeholder="请输入资料内容..."
            value={entryContent}
            onChange={(e) => setEntryContent(e.target.value)}
          />
        </div>
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>附件上传</div>
          <Upload>
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <Modal
        title="委派任务"
        open={delegateModalVisible}
        onCancel={() => {
          setDelegateModalVisible(false);
          setDelegateTarget(null);
          setDelegatePersonId(undefined);
        }}
        onOk={handleDelegateConfirm}
        okText="确认委派"
        cancelText="取消"
        width={500}
        destroyOnClose
      >
        <div style={{ marginBottom: 8, color: '#666' }}>
          选择委派人员（将替换当前录入责任人）
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="选择委派人员"
          value={delegatePersonId}
          onChange={setDelegatePersonId}
          options={MOCK_USERS.filter((u) => u.id !== currentUser.id).map((u) => ({
            value: u.id,
            label: `${u.name} (${u.role} - ${u.department})`,
          }))}
          optionFilterProp="label"
        />
        {delegateTarget && (
          <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
            将委派 {delegateTarget.ids.length} 项任务
          </div>
        )}
      </Modal>

      {/* AI Check Detail Modal */}
      <Modal
        title="AI检查详情"
        open={aiDetailModalVisible}
        onCancel={() => setAiDetailModalVisible(false)}
        footer={<Button onClick={() => setAiDetailModalVisible(false)}>关闭</Button>}
        width={500}
      >
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {aiDetailContent}
        </div>
      </Modal>
    </div>
  );
}
