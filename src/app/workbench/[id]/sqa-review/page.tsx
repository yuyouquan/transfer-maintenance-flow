'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import {
  Alert,
  Card,
  Descriptions,
  Table,
  Tag,
  Avatar,
  Button,
  Modal,
  Empty,
  Input,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyOutlined,
  SyncOutlined,
  FileTextOutlined,
  TeamOutlined,
  AuditOutlined,
  StopOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import EntryContentRenderer from '@/components/shared/EntryContentRenderer';
import {
  MOCK_BLOCK_TASKS,
  MOCK_LEGACY_TASKS,
  MOCK_CHECKLIST_ITEMS,
  MOCK_REVIEW_ELEMENTS,
} from '@/mock';
import { useApplications } from '@/context/ApplicationContext';
import type {
  TransferApplication,
  CheckListItem,
  ReviewElement,
  BlockTask,
  LegacyTask,
  TeamMember,
  EntryStatus,
  AICheckStatus,
  ReviewStatus,
  CloseReviewRow,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

// --- Status configs ---

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
  failed: { color: 'red', label: '已失败' },
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

const ROLE_DISPLAY_MAP: Record<string, string> = {
  SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统', '影像': '影像',
};

// --- Team member card ---

const ROLE_SORT_ORDER: Record<string, number> = {
  SPM: 1, TPM: 2, '底软': 3, '系统': 4, '影像': 4.5, SQA: 5,
};

const sortTeamMembers = (members: ReadonlyArray<TeamMember>): ReadonlyArray<TeamMember> =>
  [...members].sort((a, b) => (ROLE_SORT_ORDER[a.role] ?? 9) - (ROLE_SORT_ORDER[b.role] ?? 9));

const ROLE_AVATAR_COLOR: Record<string, string> = {
  SPM: '#1677ff', TPM: '#52c41a', SQA: '#faad14', '底软': '#722ed1', '系统': '#eb2f96', '影像': '#7c3aed',
};

function TeamMemberCard({ member }: { readonly member: TeamMember }) {
  const avatarColor = ROLE_AVATAR_COLOR[member.role] ?? '#999';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0',
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

// --- Build close review rows ---

function buildCloseReviewRows(app: TransferApplication): ReadonlyArray<CloseReviewRow> {
  const conclusionMap: Record<string, 'N/A' | 'PASS' | 'Fail'> = {
    not_started: 'N/A', in_progress: 'N/A', completed: 'PASS', rejected: 'Fail',
  };

  return app.pipeline.roleProgress.map((rp) => {
    const maintenanceMember = app.team.maintenance.find(
      (m) => m.role === rp.role || (rp.role === '测试' && m.role === 'TPM')
    );
    let comment = 'N/A';
    if (rp.reviewStatus === 'rejected') {
      const rejectedItem = [
        ...MOCK_CHECKLIST_ITEMS.filter((i) => i.applicationId === app.id && i.responsibleRole === rp.role),
        ...MOCK_REVIEW_ELEMENTS.filter((i) => i.applicationId === app.id && i.responsibleRole === rp.role),
      ].find((i) => i.reviewStatus === 'rejected' && i.reviewComment);
      comment = rejectedItem?.reviewComment ?? '审核不通过';
    } else if (rp.reviewStatus === 'completed') {
      comment = '审核通过，资料完整';
    }
    return {
      role: (ROLE_DISPLAY_MAP[rp.role] ?? rp.role) as CloseReviewRow['role'],
      responsiblePerson: maintenanceMember?.name ?? '-',
      conclusion: conclusionMap[rp.reviewStatus] ?? 'N/A',
      comment,
    };
  });
}

// --- Render helpers ---

function renderEntryContent(record: { entryContent?: string }): React.ReactNode {
  return <EntryContentRenderer content={record.entryContent} />;
}

// --- Floating anchor navigation ---

const ANCHOR_SECTIONS = [
  { id: 'sqa-section-pipeline', label: '流水线', icon: <SyncOutlined /> },
  { id: 'sqa-section-info', label: '项目信息', icon: <FileTextOutlined /> },
  { id: 'sqa-section-team', label: '团队信息', icon: <TeamOutlined /> },
  { id: 'sqa-section-checklist', label: 'CheckList', icon: <CheckCircleOutlined /> },
  { id: 'sqa-section-review', label: '评审要素', icon: <AuditOutlined /> },
  { id: 'sqa-section-block', label: 'Block任务', icon: <StopOutlined /> },
  { id: 'sqa-section-legacy', label: '遗留任务', icon: <PushpinOutlined /> },
  { id: 'sqa-section-sqa', label: 'SQA评审', icon: <SafetyOutlined /> },
] as const;

function FloatingAnchor() {
  const [activeId, setActiveId] = useState<(typeof ANCHOR_SECTIONS)[number]['id']>(ANCHOR_SECTIONS[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      let currentId: (typeof ANCHOR_SECTIONS)[number]['id'] = ANCHOR_SECTIONS[0].id;
      for (const section of ANCHOR_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.offsetTop <= scrollY) {
          currentId = section.id;
        }
      }
      setActiveId(currentId);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }
  }, []);

  return (
    <div style={{ position: 'sticky', top: 80, width: 140, flexShrink: 0 }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '12px 0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#999',
          padding: '0 16px 8px', borderBottom: '1px solid #f5f5f5',
          marginBottom: 4, letterSpacing: 1,
        }}>
          页面导航
        </div>
        {ANCHOR_SECTIONS.map((section) => {
          const isActive = activeId === section.id;
          return (
            <div
              key={section.id}
              onClick={() => handleClick(section.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 16px', cursor: 'pointer', fontSize: 13,
                color: isActive ? '#4338ca' : '#666',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? '#f0edff' : 'transparent',
                borderLeft: isActive ? '3px solid #4338ca' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{section.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {section.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main page ---

export default function SqaReviewPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { applications, checklistItems: ctxChecklist, reviewElements: ctxReview, updateApplication } = useApplications();

  const [sqaComment, setSqaComment] = useState('');
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const application = applications.find((app) => app.id === id);
  const checklistItems = ctxChecklist.filter((item) => item.applicationId === id);
  const reviewElements = ctxReview.filter((item) => item.applicationId === id);
  const blockTasks = MOCK_BLOCK_TASKS.filter((task) => task.applicationId === id);
  const legacyTasks = MOCK_LEGACY_TASKS.filter((task) => task.applicationId === id);

  const showResultModal = useCallback((title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
  }, []);

  const handleApprove = useCallback(() => {
    updateApplication(id, (app) => ({
      ...app,
      pipeline: {
        ...app.pipeline,
        sqaReview: 'success',
        infoChange: 'in_progress',
      },
      updatedAt: new Date().toISOString(),
    }));
    message.success('SQA审核通过，流水线进入信息变更阶段');
    setApproveModalVisible(false);
    router.push(`/workbench/${id}`);
  }, [id, updateApplication, router]);

  const handleReject = useCallback(() => {
    if (!sqaComment.trim()) {
      message.warning('请填写SQA评审建议');
      return;
    }
    // SQA 不通过即终态：整个转维流程失败并结束
    updateApplication(id, (app) => ({
      ...app,
      status: 'failed',
      failureReason: sqaComment.trim(),
      pipeline: {
        ...app.pipeline,
        sqaReview: 'failed',
      },
      updatedAt: new Date().toISOString(),
    }));
    message.success('SQA审核不通过，转维流程已终止');
    setRejectModalVisible(false);
    router.push(`/workbench/${id}`);
  }, [id, sqaComment, updateApplication, router]);

  if (!application) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/workbench')} style={{ marginBottom: 16 }}>
          返回
        </Button>
        <Empty description="未找到该转维申请" />
      </div>
    );
  }

  const statusConfig = PIPELINE_STATUS_CONFIG[application.status] ?? { color: 'default', label: application.status };
  const reviewRows = buildCloseReviewRows(application);

  // --- Table columns ---

  const checklistColumns: ColumnsType<CheckListItem> = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center' },
    { title: '检查项目名称', dataIndex: 'checkItem', key: 'checkItem', width: 280, ellipsis: true },
    { title: '所属角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center' },
    { title: '责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 80, align: 'center' },
    { title: '交付件', dataIndex: 'deliverables', key: 'deliverables', width: 180, render: (_: unknown, record: CheckListItem) => renderEntryContent(record) },
    {
      title: '录入状态', dataIndex: 'entryStatus', key: 'entryStatus', width: 90, align: 'center',
      render: (_: unknown, record: CheckListItem) => {
        const config = ENTRY_STATUS_CONFIG[record.entryStatus];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', dataIndex: 'aiCheckStatus', key: 'aiCheckStatus', width: 100, align: 'center',
      render: (_: unknown, record: CheckListItem) => {
        const config = AI_CHECK_STATUS_CONFIG[record.aiCheckStatus];
        if (record.aiCheckStatus === 'failed') {
          return <Tag color={config.color} style={{ cursor: 'pointer' }} onClick={() => showResultModal('AI检查结果', record.aiCheckResult ?? '暂无详情')}>{config.label}</Tag>;
        }
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '维护审核状态', dataIndex: 'reviewStatus', key: 'reviewStatus', width: 100, align: 'center',
      render: (_: unknown, record: CheckListItem) => {
        const config = REVIEW_STATUS_CONFIG[record.reviewStatus];
        if (record.reviewStatus === 'rejected') {
          return <Tag color={config.color} style={{ cursor: 'pointer' }} onClick={() => showResultModal('审核意见', record.reviewComment ?? '暂无详情')}>{config.label}</Tag>;
        }
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  const reviewElementColumns: ColumnsType<ReviewElement> = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center' },
    { title: '类型', dataIndex: 'standard', key: 'standard', width: 100 },
    { title: '评审要素', dataIndex: 'description', key: 'description', width: 280, ellipsis: true },
    { title: '责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 80, align: 'center' },
    { title: '交付件', dataIndex: 'deliverables', key: 'deliverables', width: 180, render: (_: unknown, record: ReviewElement) => renderEntryContent(record) },
    {
      title: '录入状态', dataIndex: 'entryStatus', key: 'entryStatus', width: 90, align: 'center',
      render: (_: unknown, record: ReviewElement) => {
        const config = ENTRY_STATUS_CONFIG[record.entryStatus];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', dataIndex: 'aiCheckStatus', key: 'aiCheckStatus', width: 100, align: 'center',
      render: (_: unknown, record: ReviewElement) => {
        const config = AI_CHECK_STATUS_CONFIG[record.aiCheckStatus];
        if (record.aiCheckStatus === 'failed') {
          return <Tag color={config.color} style={{ cursor: 'pointer' }} onClick={() => showResultModal('AI检查结果', record.aiCheckResult ?? '暂无详情')}>{config.label}</Tag>;
        }
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '维护审核状态', dataIndex: 'reviewStatus', key: 'reviewStatus', width: 100, align: 'center',
      render: (_: unknown, record: ReviewElement) => {
        const config = REVIEW_STATUS_CONFIG[record.reviewStatus];
        if (record.reviewStatus === 'rejected') {
          return <Tag color={config.color} style={{ cursor: 'pointer' }} onClick={() => showResultModal('审核意见', record.reviewComment ?? '暂无详情')}>{config.label}</Tag>;
        }
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  const blockTaskColumns: ColumnsType<BlockTask> = [
    { title: '序号', key: 'index', width: 60, align: 'center', render: (_: unknown, __: BlockTask, index: number) => index + 1 },
    { title: '问题描述', dataIndex: 'description', key: 'description', width: 280, ellipsis: true },
    { title: '解决方案', dataIndex: 'resolution', key: 'resolution', width: 280, ellipsis: true },
    { title: '责任人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 80, align: 'center' },
    { title: '部门', dataIndex: 'department', key: 'department', width: 100, align: 'center' },
    { title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 110, align: 'center' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90, align: 'center',
      render: (_: unknown, record: BlockTask) => {
        const config = BLOCK_TASK_STATUS_CONFIG[record.status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, align: 'center', render: (val: string) => val.slice(0, 10) },
  ];

  const legacyTaskColumns: ColumnsType<LegacyTask> = [
    { title: '序号', key: 'index', width: 60, align: 'center', render: (_: unknown, __: LegacyTask, index: number) => index + 1 },
    { title: '任务描述', dataIndex: 'description', key: 'description', width: 300, ellipsis: true },
    { title: '责任人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 80, align: 'center' },
    { title: '部门', dataIndex: 'department', key: 'department', width: 100, align: 'center' },
    { title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 110, align: 'center' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90, align: 'center',
      render: (_: unknown, record: LegacyTask) => {
        const config = LEGACY_TASK_STATUS_CONFIG[record.status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, align: 'center', render: (val: string) => val.slice(0, 10) },
  ];

  const closeReviewColumns: ColumnsType<CloseReviewRow> = [
    { title: '审核角色', dataIndex: 'role', key: 'role', width: 80, align: 'center' },
    { title: '责任人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 80, align: 'center' },
    {
      title: '评审结论', dataIndex: 'conclusion', key: 'conclusion', width: 90, align: 'center',
      render: (conclusion: CloseReviewRow['conclusion']) => {
        const config: Record<string, { color: string }> = {
          PASS: { color: 'success' }, Fail: { color: 'error' }, 'N/A': { color: 'default' },
        };
        return <Tag color={config[conclusion]?.color ?? 'default'}>{conclusion}</Tag>;
      },
    },
    {
      title: '评审意见', dataIndex: 'comment', key: 'comment', width: 200,
      render: (comment: string) => (
        <span style={{ fontSize: 13, color: comment === 'N/A' ? '#999' : undefined }}>{comment}</span>
      ),
    },
  ];

  const isSqaInProgress = application.pipeline.sqaReview === 'in_progress';
  const anyRoleRejected = application.pipeline.roleProgress.some((rp) => rp.reviewStatus === 'rejected');
  // 拒绝模式：维护审核中有角色被拒绝，SQA只能执行不通过
  const isRejectionMode = application.pipeline.maintenanceReview === 'in_progress' && anyRoleRejected;
  // 申请已终止（失败/已完成/已取消）则不可操作
  const isTerminated = application.status !== 'in_progress';
  // 可操作：未终止 且（正常SQA审核进行中 或 拒绝模式）
  const canOperate = !isTerminated && (isSqaInProgress || isRejectionMode);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/workbench')}>
            返回
          </Button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            <SafetyOutlined style={{ marginRight: 8, color: '#faad14' }} />
            SQA审核
          </h2>
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

      {/* 1. Pipeline */}
      <Card id="sqa-section-pipeline" style={{ marginBottom: 20 }}>
        <PipelineProgress pipeline={application.pipeline} showRoleDots />
      </Card>

      {/* 2. Project info */}
      <Card id="sqa-section-info" title="项目信息" style={{ marginBottom: 20 }}>
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

      {/* 3. Team info */}
      <div id="sqa-section-team" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
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

      {/* 4. CheckList (readonly) */}
      <Card id="sqa-section-checklist" title="转维CheckList" style={{ marginBottom: 20 }}>
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

      {/* 5. Review elements (readonly) */}
      <Card id="sqa-section-review" title="转维要素评审列表" style={{ marginBottom: 20 }}>
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

      {/* 6. Block tasks */}
      <Card id="sqa-section-block" title="Block任务列表" style={{ marginBottom: 20 }}>
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

      {/* 7. Legacy tasks */}
      <Card id="sqa-section-legacy" title="遗留任务列表" style={{ marginBottom: 20 }}>
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

      {/* 8. SQA Review Section */}
      <Card
        id="sqa-section-sqa"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: '#faad14' }} />
            <span>SQA评审</span>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        {/* Review status table */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 12, color: '#333' }}>各角色评审状态</div>
          <Table<CloseReviewRow>
            columns={closeReviewColumns}
            dataSource={[...reviewRows]}
            rowKey="role"
            pagination={false}
            size="small"
            bordered
          />
        </div>

        {/* SQA comment */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 8, color: '#333' }}>SQA评审建议</div>
          <TextArea
            rows={4}
            placeholder="请输入SQA评审建议（不通过时必填）"
            value={sqaComment}
            onChange={(e) => setSqaComment(e.target.value)}
            maxLength={500}
            showCount
            disabled={!canOperate}
          />
        </div>

        {/* Rejection mode alert */}
        {isRejectionMode && (
          <Alert
            type="warning"
            showIcon
            title="当前处于驳回处理模式"
            description="维护审核中有角色被拒绝，请核实情况后决定是否终止转维流程。SQA 不通过后流程将直接终止，申请人可在详情页发起重开。"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Action buttons */}
        {canOperate && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setRejectModalVisible(true)}
            >
              不通过
            </Button>
            {!isRejectionMode && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => setApproveModalVisible(true)}
              >
                通过
              </Button>
            )}
          </div>
        )}

        {!canOperate && (
          <div style={{ textAlign: 'center', color: '#999', padding: '12px 0' }}>
            {application.pipeline.sqaReview === 'success' && <Tag color="success">SQA审核已通过</Tag>}
            {application.pipeline.sqaReview === 'failed' && <Tag color="error">SQA审核未通过</Tag>}
            {application.pipeline.sqaReview === 'not_started' && <Tag color="default">SQA审核未开始</Tag>}
          </div>
        )}
      </Card>

        </div>

        {/* Right: floating anchor nav */}
        <FloatingAnchor />
      </div>

      {/* Approve confirmation modal */}
      <Modal
        title="确认通过SQA审核"
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        onOk={handleApprove}
        okText="确认通过"
        cancelText="取消"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
      >
        <p>确认通过SQA审核？通过后流水线将进入「信息变更」阶段。</p>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal
        title="确认不通过SQA审核"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={handleReject}
        okText="确认不通过"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确认不通过 SQA 审核？<strong style={{ color: '#ff4d4f' }}>此操作将终止整个转维流程</strong>，申请状态变为"已失败"，不可继续审核。如需重新启动，申请人可在详情页点击"重新发起转维申请"。</p>
        {!sqaComment.trim() && (
          <p style={{ color: '#ff4d4f', fontSize: 13 }}>请先在评审建议中填写不通过原因</p>
        )}
      </Modal>

      {/* Result detail modal */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>,
        ]}
      >
        <p style={{ whiteSpace: 'pre-wrap' }}>{modalContent}</p>
      </Modal>
    </div>
  );
}
