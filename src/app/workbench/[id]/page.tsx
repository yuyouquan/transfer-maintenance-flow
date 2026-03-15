'use client';

import React, { useState, use } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Tabs,
  Avatar,
  Alert,
  Timeline,
  Badge,
  Button,
  Modal,
  Tooltip,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MinusOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import {
  MOCK_APPLICATIONS,
  MOCK_CHECKLIST_ITEMS,
  MOCK_REVIEW_ELEMENTS,
  MOCK_BLOCK_TASKS,
  MOCK_LEGACY_TASKS,
  MOCK_HISTORY,
} from '@/mock';
import type {
  TransferApplication,
  CheckListItem,
  ReviewElement,
  BlockTask,
  LegacyTask,
  HistoryRecord,
  EntryStatus,
  AICheckStatus,
  ReviewStatus,
  Deliverable,
  TeamMember,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';

// --- 状态标签渲染 ---

const ENTRY_STATUS_CONFIG: Record<EntryStatus, { color: string; label: string }> = {
  not_entered: { color: 'default', label: '未录入' },
  draft: { color: 'orange', label: '草稿' },
  entered: { color: 'green', label: '已录入' },
};

const AI_CHECK_STATUS_CONFIG: Record<AICheckStatus, { color: string; label: string }> = {
  not_started: { color: 'default', label: '-' },
  in_progress: { color: 'blue', label: '检查中' },
  passed: { color: 'green', label: '通过' },
  failed: { color: 'red', label: '未通过' },
};

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { color: string; label: string }> = {
  not_reviewed: { color: 'default', label: '未审核' },
  reviewing: { color: 'blue', label: '审核中' },
  passed: { color: 'green', label: '通过' },
  rejected: { color: 'red', label: '未通过' },
};

const PIPELINE_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  in_progress: { color: 'blue', label: '进行中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
};

const BLOCK_TASK_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: 'red', label: '未解决' },
  resolved: { color: 'green', label: '已解决' },
  cancelled: { color: 'default', label: '已取消' },
};

const LEGACY_TASK_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: 'orange', label: '待处理' },
  resolved: { color: 'green', label: '已完成' },
  cancelled: { color: 'default', label: '已取消' },
};

function renderEntryStatusTag(status: EntryStatus): React.ReactNode {
  const config = ENTRY_STATUS_CONFIG[status];
  return <Tag color={config.color}>{config.label}</Tag>;
}

function renderAICheckStatusTag(
  status: AICheckStatus,
  result?: string,
  onClickFailed?: () => void,
): React.ReactNode {
  const config = AI_CHECK_STATUS_CONFIG[status];
  if (status === 'failed' && onClickFailed) {
    return (
      <Tag
        color={config.color}
        style={{ cursor: 'pointer' }}
        onClick={onClickFailed}
      >
        {config.label}
      </Tag>
    );
  }
  return <Tag color={config.color}>{config.label}</Tag>;
}

function renderReviewStatusTag(
  status: ReviewStatus,
  comment?: string,
  onClickRejected?: () => void,
): React.ReactNode {
  const config = REVIEW_STATUS_CONFIG[status];
  if (status === 'rejected' && onClickRejected) {
    return (
      <Tag
        color={config.color}
        style={{ cursor: 'pointer' }}
        onClick={onClickRejected}
      >
        {config.label}
      </Tag>
    );
  }
  return <Tag color={config.color}>{config.label}</Tag>;
}

function renderDeliverables(deliverables: ReadonlyArray<Deliverable>): React.ReactNode {
  if (deliverables.length === 0) {
    return <span style={{ color: '#999' }}>-</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {deliverables.map((d) => (
        <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
          {d.type === 'file' ? <FileTextOutlined style={{ marginRight: 4 }} /> : <LinkOutlined style={{ marginRight: 4 }} />}
          {d.name}
        </a>
      ))}
    </div>
  );
}

// --- 团队成员卡片 ---

const ROLE_SORT_ORDER: Record<string, number> = {
  SPM: 1, TPM: 2, '底软': 3, '系统': 4, SQA: 5,
};

const sortTeamMembers = (members: ReadonlyArray<TeamMember>): ReadonlyArray<TeamMember> =>
  [...members].sort((a, b) => (ROLE_SORT_ORDER[a.role] ?? 9) - (ROLE_SORT_ORDER[b.role] ?? 9));

const ROLE_AVATAR_COLOR: Record<string, string> = {
  SPM: '#1677ff',
  TPM: '#52c41a',
  SQA: '#faad14',
  '底软': '#722ed1',
  '系统': '#eb2f96',
};

function TeamMemberCard({ member }: { readonly member: TeamMember }) {
  const avatarColor = ROLE_AVATAR_COLOR[member.role] ?? '#999';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 8,
      background: '#fafafa',
      border: '1px solid #f0f0f0',
    }}>
      <Avatar style={{ backgroundColor: avatarColor, flexShrink: 0 }} size={34}>
        {member.name.slice(0, 1)}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{member.name}</div>
        <div style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {member.role}{member.department ? ` · ${member.department}` : ''}
        </div>
      </div>
    </div>
  );
}

// --- 主页面 ---

export default function ApplicationDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const application = MOCK_APPLICATIONS.find((app) => app.id === id);

  const checklistItems = MOCK_CHECKLIST_ITEMS.filter((item) => item.applicationId === id);
  const reviewElements = MOCK_REVIEW_ELEMENTS.filter((item) => item.applicationId === id);
  const blockTasks = MOCK_BLOCK_TASKS.filter((task) => task.applicationId === id);
  const legacyTasks = MOCK_LEGACY_TASKS.filter((task) => task.applicationId === id);
  const historyRecords = MOCK_HISTORY.filter((record) => record.applicationId === id);

  const showResultModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
  };

  if (!application) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/workbench')}
          style={{ marginBottom: 16 }}
        >
          返回
        </Button>
        <Empty description="未找到该转维申请" />
      </div>
    );
  }

  // --- CheckList表格列 ---

  const checklistColumns: ColumnsType<CheckListItem> = [
    {
      title: '序号',
      dataIndex: 'seq',
      key: 'seq',
      width: 60,
      align: 'center',
    },
    {
      title: '检查项目名称',
      dataIndex: 'checkItem',
      key: 'checkItem',
      width: 280,
      ellipsis: true,
    },
    {
      title: '所属角色',
      dataIndex: 'responsibleRole',
      key: 'responsibleRole',
      width: 80,
      align: 'center',
    },
    {
      title: '责任人',
      dataIndex: 'entryPerson',
      key: 'entryPerson',
      width: 80,
      align: 'center',
    },
    {
      title: '交付件',
      dataIndex: 'deliverables',
      key: 'deliverables',
      width: 180,
      render: (_: unknown, record: CheckListItem) => renderDeliverables(record.deliverables),
    },
    {
      title: '录入状态',
      dataIndex: 'entryStatus',
      key: 'entryStatus',
      width: 90,
      align: 'center',
      render: (_: unknown, record: CheckListItem) => renderEntryStatusTag(record.entryStatus),
    },
    {
      title: 'AI检查状态',
      dataIndex: 'aiCheckStatus',
      key: 'aiCheckStatus',
      width: 100,
      align: 'center',
      render: (_: unknown, record: CheckListItem) =>
        renderAICheckStatusTag(
          record.aiCheckStatus,
          record.aiCheckResult,
          record.aiCheckStatus === 'failed'
            ? () => showResultModal('AI检查结果', record.aiCheckResult ?? '暂无详情')
            : undefined,
        ),
    },
    {
      title: '维护审核状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
      align: 'center',
      render: (_: unknown, record: CheckListItem) =>
        renderReviewStatusTag(
          record.reviewStatus,
          record.reviewComment,
          record.reviewStatus === 'rejected'
            ? () => showResultModal('审核意见', record.reviewComment ?? '暂无详情')
            : undefined,
        ),
    },
  ];

  // --- 评审要素表格列 ---

  const reviewElementColumns: ColumnsType<ReviewElement> = [
    {
      title: '序号',
      dataIndex: 'seq',
      key: 'seq',
      width: 60,
      align: 'center',
    },
    {
      title: '类型',
      dataIndex: 'standard',
      key: 'standard',
      width: 100,
    },
    {
      title: '评审要素',
      dataIndex: 'description',
      key: 'description',
      width: 280,
      ellipsis: true,
    },
    {
      title: '责任人',
      dataIndex: 'entryPerson',
      key: 'entryPerson',
      width: 80,
      align: 'center',
    },
    {
      title: '交付件',
      dataIndex: 'deliverables',
      key: 'deliverables',
      width: 180,
      render: (_: unknown, record: ReviewElement) => renderDeliverables(record.deliverables),
    },
    {
      title: '录入状态',
      dataIndex: 'entryStatus',
      key: 'entryStatus',
      width: 90,
      align: 'center',
      render: (_: unknown, record: ReviewElement) => renderEntryStatusTag(record.entryStatus),
    },
    {
      title: 'AI检查状态',
      dataIndex: 'aiCheckStatus',
      key: 'aiCheckStatus',
      width: 100,
      align: 'center',
      render: (_: unknown, record: ReviewElement) =>
        renderAICheckStatusTag(
          record.aiCheckStatus,
          record.aiCheckResult,
          record.aiCheckStatus === 'failed'
            ? () => showResultModal('AI检查结果', record.aiCheckResult ?? '暂无详情')
            : undefined,
        ),
    },
    {
      title: '维护审核状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
      align: 'center',
      render: (_: unknown, record: ReviewElement) =>
        renderReviewStatusTag(
          record.reviewStatus,
          record.reviewComment,
          record.reviewStatus === 'rejected'
            ? () => showResultModal('审核意见', record.reviewComment ?? '暂无详情')
            : undefined,
        ),
    },
  ];

  // --- Block任务表格列 ---

  const blockTaskColumns: ColumnsType<BlockTask> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: unknown, __: BlockTask, index: number) => index + 1,
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      width: 280,
      ellipsis: true,
    },
    {
      title: '解决方案',
      dataIndex: 'resolution',
      key: 'resolution',
      width: 280,
      ellipsis: true,
    },
    {
      title: '责任人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 80,
      align: 'center',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      align: 'center',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: (_: unknown, record: BlockTask) => {
        const config = BLOCK_TASK_STATUS_CONFIG[record.status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      align: 'center',
      render: (val: string) => val.slice(0, 10),
    },
  ];

  // --- 遗留任务表格列 ---

  const legacyTaskColumns: ColumnsType<LegacyTask> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_: unknown, __: LegacyTask, index: number) => index + 1,
    },
    {
      title: '任务描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
    },
    {
      title: '责任人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 80,
      align: 'center',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      align: 'center',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: (_: unknown, record: LegacyTask) => {
        const config = LEGACY_TASK_STATUS_CONFIG[record.status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      align: 'center',
      render: (val: string) => val.slice(0, 10),
    },
  ];

  // --- 历史记录图标 ---

  const getTimelineIcon = (action: string) => {
    if (action.includes('创建')) return <ExclamationCircleOutlined style={{ color: '#1677ff' }} />;
    if (action.includes('通过')) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (action.includes('Block') || action.includes('不通过')) return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    if (action.includes('录入')) return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    return <ClockCircleOutlined style={{ color: '#1677ff' }} />;
  };

  const statusConfig = PIPELINE_STATUS_CONFIG[application.status] ?? { color: 'default', label: application.status };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* 顶部返回按钮 + 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/workbench')}
          >
            返回
          </Button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            项目转维进展详情页
          </h2>
        </div>
      </div>

      {/* 取消提示横幅 */}
      {application.status === 'cancelled' && application.cancelReason && (
        <Alert
          title="该转维申请已取消"
          description={`取消原因：${application.cancelReason}`}
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* 5.1 项目流水线 */}
      <Card style={{ marginBottom: 20 }}>
        <PipelineProgress pipeline={application.pipeline} showRoleDots />
      </Card>

      {/* 5.2 项目基础信息 */}
      <Card title="项目信息" style={{ marginBottom: 20 }}>
        <Descriptions column={4} size="small" styles={{ label: { fontWeight: 500, color: '#666' } }}>
          <Descriptions.Item label="项目名">{application.projectName}</Descriptions.Item>
          <Descriptions.Item label="项目编号">{application.projectId}</Descriptions.Item>
          <Descriptions.Item label="项目负责人">{application.applicant}</Descriptions.Item>
          <Descriptions.Item label="转维负责人">
            {application.team.maintenance.find((m) => m.role === 'SPM')?.name ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="转维启动时间">{application.createdAt.slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="转维截止时间">{application.plannedReviewDate}</Descriptions.Item>
          <Descriptions.Item label="项目状态">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="备注">{application.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 5.3 团队信息：在研团队 + 维护团队 左右布局 */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <Card title="在研团队" size="small" style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {sortTeamMembers(application.team.research).map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </Card>
        <Card title="维护团队" size="small" style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {sortTeamMembers(application.team.maintenance).map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </Card>
      </div>

      {/* 5.4 转维CheckList */}
      <Card title="转维CheckList" style={{ marginBottom: 20 }}>
        <Table<CheckListItem>
          columns={checklistColumns}
          dataSource={checklistItems}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
          locale={{ emptyText: '暂无检查项' }}
        />
      </Card>

      {/* 5.5 转维要素评审列表 */}
      <Card title="转维要素评审列表" style={{ marginBottom: 20 }}>
        <Table<ReviewElement>
          columns={reviewElementColumns}
          dataSource={reviewElements}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
          locale={{ emptyText: '暂无评审要素' }}
        />
      </Card>

      {/* 5.6 Block任务列表 */}
      <Card title="Block任务列表" style={{ marginBottom: 20 }}>
        <Table<BlockTask>
          columns={blockTaskColumns}
          dataSource={blockTasks}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无Block任务' }}
        />
      </Card>

      {/* 5.7 遗留任务列表 */}
      <Card title="遗留任务列表" style={{ marginBottom: 20 }}>
        <Table<LegacyTask>
          columns={legacyTaskColumns}
          dataSource={legacyTasks}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无遗留任务' }}
        />
      </Card>

      {/* 5.8 历史记录 */}
      <Card title="历史记录" style={{ marginBottom: 20 }}>
        {historyRecords.length === 0 ? (
          <Empty description="暂无历史记录" />
        ) : (
          <Timeline
            items={historyRecords.map((record) => ({
              dot: getTimelineIcon(record.action),
              children: (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{record.action}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>
                      {record.operator} - {record.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                    {record.detail}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* 结果详情弹窗 */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <p style={{ whiteSpace: 'pre-wrap' }}>{modalContent}</p>
      </Modal>
    </div>
  );
}
