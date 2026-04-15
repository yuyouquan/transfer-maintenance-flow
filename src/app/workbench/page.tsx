'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, Input, Button, Tag, Space, Modal, Card, Typography, Badge, message, Segmented, Progress, Tooltip,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, EditOutlined,
  AuditOutlined, CloseCircleOutlined, RightOutlined, LeftOutlined,
  CarryOutOutlined, ProjectOutlined, SyncOutlined, CheckCircleOutlined,
  StopOutlined, ClockCircleOutlined, SafetyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  TransferApplication, TodoItem, PipelineStatus, PipelineNodeStatus, CloseReviewRow,
} from '@/types';
import { MOCK_TODOS, MOCK_CHECKLIST_ITEMS, MOCK_REVIEW_ELEMENTS } from '@/mock';
import { useCurrentUser } from '@/context/UserContext';
import { useApplications } from '@/context/ApplicationContext';

const { Text } = Typography;
const { TextArea } = Input;

// --- Constants ---

const PAGE_SIZE = 10;

const PIPELINE_NODES = ['项目发起', '资料录入与AI检查', '维护审核', 'SQA审核', '信息变更'] as const;

const NODE_STATUS_CONFIG: Record<PipelineNodeStatus, { color: string; label: string }> = {
  not_started: { color: 'default', label: '未开始' },
  in_progress: { color: 'processing', label: '进行中' },
  success: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

const TODO_TYPE_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  entry: { color: '#1677ff', label: '录入', icon: <EditOutlined /> },
  review: { color: '#52c41a', label: '评审', icon: <AuditOutlined /> },
  sqa_review: { color: '#faad14', label: 'SQA审核', icon: <SafetyOutlined /> },
};

const ROLE_DISPLAY_MAP: Record<string, string> = {
  SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统', '影像': '影像',
};

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'cancelled';

// --- Helpers ---

const getCurrentNodeIndex = (app: TransferApplication): number => {
  const { pipeline } = app;
  if (pipeline.infoChange !== 'not_started') return 4;
  if (pipeline.sqaReview !== 'not_started') return 3;
  if (pipeline.maintenanceReview !== 'not_started') return 2;
  if (pipeline.dataEntry !== 'not_started') return 1;
  return 0;
};

const getCurrentNodeLabel = (app: TransferApplication): string => {
  return PIPELINE_NODES[getCurrentNodeIndex(app)];
};

const getCurrentNodeStatus = (app: TransferApplication): PipelineNodeStatus => {
  const { pipeline } = app;
  if (pipeline.infoChange !== 'not_started') return pipeline.infoChange;
  if (pipeline.sqaReview !== 'not_started') return pipeline.sqaReview;
  if (pipeline.maintenanceReview !== 'not_started') return pipeline.maintenanceReview;
  if (pipeline.dataEntry !== 'not_started') return pipeline.dataEntry;
  return pipeline.projectInit;
};

const getPipelinePercent = (app: TransferApplication): number => {
  const idx = getCurrentNodeIndex(app);
  const status = getCurrentNodeStatus(app);
  const basePercent = (idx / 5) * 100;
  const stepPercent = status === 'success' ? 20 : status === 'in_progress' ? 10 : 0;
  return Math.min(basePercent + stepPercent, 100);
};

const hasAnyRoleEnteredReview = (app: TransferApplication): boolean => {
  return app.pipeline.roleProgress.some(
    (rp) => rp.reviewStatus === 'completed' || rp.reviewStatus === 'in_progress'
  );
};

const buildCloseReviewRows = (app: TransferApplication): ReadonlyArray<CloseReviewRow> => {
  const conclusionMap: Record<string, 'N/A' | 'PASS' | 'Fail'> = {
    not_started: 'N/A', in_progress: 'N/A', completed: 'PASS', rejected: 'Fail',
  };

  const rows: CloseReviewRow[] = app.pipeline.roleProgress.map((rp) => {
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
    }
    return {
      role: (ROLE_DISPLAY_MAP[rp.role] ?? rp.role) as CloseReviewRow['role'],
      responsiblePerson: maintenanceMember?.name ?? '-',
      conclusion: conclusionMap[rp.reviewStatus] ?? 'N/A',
      comment,
    };
  });

  return rows;
};

// --- Stat Card ---

interface StatCardProps {
  readonly title: string;
  readonly count: number;
  readonly icon: React.ReactNode;
  readonly color: string;
  readonly bgColor: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
}

function StatCard({ title, count, icon, color, bgColor, active, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? bgColor : '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        border: active ? `2px solid ${color}` : '1px solid #f0f0f0',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.1 }}>{count}</div>
        <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>{title}</div>
      </div>
    </div>
  );
}

// --- Determine user's node based on their role in the pipeline ---

const TEAM_ROLE_TO_PIPELINE: Record<string, string> = {
  SPM: 'SPM', TPM: '测试', '底软': '底软', '系统': '系统', '影像': '影像',
};

function getUserNodeInfo(
  app: TransferApplication,
  userId: string,
): { nodeIndex: number; nodeStatus: PipelineNodeStatus; roleLabel?: string } {
  // Check if user is in the research team (entry role)
  const researchMember = app.team.research.find((m) => m.id === userId);
  if (researchMember) {
    const pipelineRole = TEAM_ROLE_TO_PIPELINE[researchMember.role];
    if (pipelineRole) {
      const rp = app.pipeline.roleProgress.find((r) => r.role === pipelineRole);
      if (rp) {
        // If entry not completed, user is at data entry node
        if (rp.entryStatus !== 'completed') {
          return { nodeIndex: 1, nodeStatus: app.pipeline.dataEntry, roleLabel: researchMember.role };
        }
      }
    }
  }

  // Check if user is in the maintenance team (review role)
  const maintenanceMember = app.team.maintenance.find((m) => m.id === userId);
  if (maintenanceMember) {
    const pipelineRole = TEAM_ROLE_TO_PIPELINE[maintenanceMember.role];
    if (pipelineRole) {
      const rp = app.pipeline.roleProgress.find((r) => r.role === pipelineRole);
      if (rp) {
        if (rp.reviewStatus !== 'completed') {
          return { nodeIndex: 2, nodeStatus: app.pipeline.maintenanceReview };
        }
      }
    }
  }

  // SQA user: show sqaReview node when in progress
  const isSQAUser = app.team.research.some((m) => m.role === 'SQA' && m.id === userId);
  if (isSQAUser && app.pipeline.sqaReview === 'in_progress') {
    return { nodeIndex: 3, nodeStatus: app.pipeline.sqaReview };
  }

  // No specific role - show global progress
  return { nodeIndex: getCurrentNodeIndex(app), nodeStatus: getCurrentNodeStatus(app) };
}

// --- Mini Pipeline ---

function MiniPipeline({ app, userId }: { readonly app: TransferApplication; readonly userId: string }) {
  const { nodeIndex, nodeStatus } = getUserNodeInfo(app, userId);
  const percent = getPipelinePercent(app);
  const strokeColor = nodeStatus === 'success' ? '#52c41a' : nodeStatus === 'failed' ? '#ff4d4f' : '#1677ff';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
      <Progress
        percent={percent}
        size="small"
        strokeColor={strokeColor}
        railColor="#f0f0f0"
        showInfo={false}
        style={{ flex: 1, margin: 0 }}
      />
      <Tag
        color={NODE_STATUS_CONFIG[nodeStatus].color}
        style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
      >
        {PIPELINE_NODES[nodeIndex]}
      </Tag>
    </div>
  );
}

// --- Component ---

export default function WorkbenchPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { applications: allApplications } = useApplications();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [todoCollapsed, setTodoCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Close pipeline modal
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closeTargetApp, setCloseTargetApp] = useState<TransferApplication | null>(null);
  const [closeReason, setCloseReason] = useState('');

  // Stats
  const stats = useMemo(() => ({
    total: allApplications.length,
    inProgress: allApplications.filter((a) => a.status === 'in_progress').length,
    completed: allApplications.filter((a) => a.status === 'completed').length,
    cancelled: allApplications.filter((a) => a.status === 'cancelled').length,
  }), [allApplications]);

  const filteredApplications = useMemo(() => {
    let list: ReadonlyArray<TransferApplication> = allApplications;
    if (statusFilter !== 'all') {
      list = list.filter((app) => app.status === statusFilter);
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      list = list.filter((app) => app.projectName.toLowerCase().includes(keyword));
    }
    return list;
  }, [allApplications, searchKeyword, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredApplications.slice(start, start + PAGE_SIZE);
  }, [filteredApplications, currentPage]);

  const userTodos = useMemo(() => {
    return MOCK_TODOS.filter((todo) => todo.responsiblePerson === currentUser.name);
  }, [currentUser.name]);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleNavigateToDetail = useCallback((id: string) => { router.push(`/workbench/${id}`); }, [router]);
  const handleNavigateToEntry = useCallback((id: string) => { router.push(`/workbench/${id}/entry`); }, [router]);
  const handleNavigateToReview = useCallback((id: string) => { router.push(`/workbench/${id}/review`); }, [router]);
  const handleNavigateToSqaReview = useCallback((id: string) => { router.push(`/workbench/${id}/sqa-review`); }, [router]);
  const handleNavigateToApply = useCallback(() => { router.push('/workbench/apply'); }, [router]);

  const handleOpenCloseModal = useCallback((app: TransferApplication) => {
    setCloseTargetApp(app);
    setCloseReason('');
    setCloseModalVisible(true);
  }, []);

  const handleCloseModalCancel = useCallback(() => {
    setCloseModalVisible(false);
    setCloseTargetApp(null);
    setCloseReason('');
  }, []);

  const handleCloseModalConfirm = useCallback(() => {
    if (!closeReason.trim()) {
      message.warning('请填写关闭原因');
      return;
    }
    message.success('流水线已关闭');
    setCloseModalVisible(false);
    setCloseTargetApp(null);
    setCloseReason('');
  }, [closeReason]);

  const handleTodoAction = useCallback(
    (todo: TodoItem) => {
      const route = todo.type === 'entry' ? 'entry' : todo.type === 'sqa_review' ? 'sqa-review' : 'review';
      router.push(`/workbench/${todo.applicationId}/${route}`);
    },
    [router]
  );

  // Close modal review table columns
  const closeReviewColumns: ColumnsType<CloseReviewRow> = [
    { title: '评审角色', dataIndex: 'role', key: 'role', width: 80, align: 'center' },
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
        <Text type={comment === 'N/A' ? 'secondary' : undefined} style={{ fontSize: 13 }}>{comment}</Text>
      ),
    },
  ];

  // Main table columns
  const columns: ColumnsType<TransferApplication> = [
    {
      title: '项目名称', dataIndex: 'projectName', key: 'projectName', width: 260,
      render: (text: string, record: TransferApplication) => (
        <div
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => handleNavigateToDetail(record.id)}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: record.status === 'cancelled' ? '#f5f5f5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: record.status === 'cancelled' ? '#bbb' : '#fff',
            fontSize: 14, fontWeight: 600, flexShrink: 0,
          }}>
            {text.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 600, fontSize: 13, color: record.status === 'cancelled' ? '#999' : '#1a1a2e',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {text}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {record.applicant} · {new Date(record.updatedAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '流水线进度', key: 'pipeline', width: 280,
      render: (_: unknown, record: TransferApplication) => {
        if (record.status === 'cancelled') {
          return <Tag color="default" icon={<StopOutlined />}>已关闭</Tag>;
        }
        return <MiniPipeline app={record} userId={currentUser.id} />;
      },
    },
    {
      title: '计划评审日期', dataIndex: 'plannedReviewDate', key: 'plannedReviewDate', width: 120, align: 'center',
      render: (text: string) => text || '-',
    },
    {
      title: '备注', dataIndex: 'remark', key: 'remark', width: 160,
      ellipsis: { showTitle: false },
      render: (text: string) => text ? <Tooltip title={text}>{text}</Tooltip> : <Text type="secondary">-</Text>,
    },
    {
      title: '角色进度', key: 'roleProgress', width: 200,
      render: (_: unknown, record: TransferApplication) => {
        if (record.status === 'cancelled') return <Text type="secondary">-</Text>;
        return (
          <Space size={4} wrap>
            {record.pipeline.roleProgress.map((rp) => {
              const displayRole = ROLE_DISPLAY_MAP[rp.role] ?? rp.role;
              const isActive = rp.entryStatus === 'in_progress' || rp.reviewStatus === 'in_progress';
              const isDone = rp.reviewStatus === 'completed';
              const isFail = rp.reviewStatus === 'rejected';
              const color = isDone ? 'success' : isFail ? 'error' : isActive ? 'processing' : 'default';
              return (
                <Tag key={rp.role} color={color} style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                  {displayRole}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_: unknown, record: TransferApplication) => {
        const isApplicant = record.applicantId === currentUser.id;
        const isInProgress = record.status === 'in_progress';
        const isSQA = record.team.research.some((m) => m.role === 'SQA' && m.id === currentUser.id);

        const isInDataEntry = record.pipeline.dataEntry === 'in_progress';
        const hasEntryRole = record.pipeline.roleProgress.some((rp) => {
          if (rp.entryStatus === 'completed' && rp.reviewStatus !== 'rejected') return false;
          const roleMap: Record<string, string> = { SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统', '影像': '影像' };
          return record.team.research.some((m) => m.id === currentUser.id && m.role === roleMap[rp.role]);
        });
        const isDelegatedEntry = [
          ...MOCK_CHECKLIST_ITEMS.filter((i) => i.applicationId === record.id),
          ...MOCK_REVIEW_ELEMENTS.filter((i) => i.applicationId === record.id),
        ].some((i) => i.entryPersonId === currentUser.id || i.delegatedTo?.includes(currentUser.id));
        const showEntry = isInProgress && isInDataEntry && (hasEntryRole || isDelegatedEntry);

        const isInReview = record.pipeline.maintenanceReview === 'in_progress';
        const hasReviewRole = record.pipeline.roleProgress.some((rp) => {
          if (rp.reviewStatus !== 'in_progress') return false;
          const roleMap: Record<string, string> = { SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统', '影像': '影像' };
          return record.team.maintenance.some((m) => m.id === currentUser.id && m.role === roleMap[rp.role]);
        });
        const showReview = isInProgress && isInReview && hasReviewRole;

        const anyRoleInReview = record.pipeline.roleProgress.some(
          (rp) => rp.reviewStatus === 'in_progress' || rp.reviewStatus === 'completed' || rp.reviewStatus === 'rejected'
        );
        const anyRoleRejected = record.pipeline.roleProgress.some(
          (rp) => rp.reviewStatus === 'rejected'
        );

        // SQA审核按钮：所有角色审核通过(墨绿) / 角色拒绝流程(red) / 正常流程(amber)
        const allRoleReviewCompleted = record.pipeline.roleProgress.every(
          (rp) => rp.reviewStatus === 'completed'
        );
        const showSqaNormal = isInProgress && record.pipeline.sqaReview === 'in_progress' && isSQA;
        const showSqaRejected = isInProgress && isInReview && anyRoleRejected && isSQA;
        const showSqaReview = showSqaNormal || showSqaRejected;
        const sqaButtonColor = showSqaRejected ? '#ff4d4f' : allRoleReviewCompleted ? '#006d5b' : '#faad14';

        // 关闭按钮：仅申请人在无角色进入审核时可关闭
        const showClose = isInProgress && record.pipeline.sqaReview !== 'in_progress' && (
          !anyRoleInReview && isApplicant
        );

        return (
          <Space size={4}>
            <Button type="text" size="small" icon={<FileTextOutlined />}
              style={{ color: '#666' }}
              onClick={() => handleNavigateToDetail(record.id)}>
              详情
            </Button>
            {showEntry && (
              <Button type="text" size="small" icon={<EditOutlined />}
                style={{ color: '#1677ff' }}
                onClick={() => handleNavigateToEntry(record.id)}>
                录入
              </Button>
            )}
            {showReview && (
              <Button type="text" size="small" icon={<AuditOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleNavigateToReview(record.id)}>
                评审
              </Button>
            )}
            {showSqaReview && (
              <Button type="text" size="small" icon={<SafetyOutlined />}
                style={{ color: sqaButtonColor }}
                onClick={() => handleNavigateToSqaReview(record.id)}>
                SQA审核
              </Button>
            )}
            {showClose && (
              <Button type="text" size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => handleOpenCloseModal(record)}>
                关闭
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const closeReviewRows = closeTargetApp ? buildCloseReviewRows(closeTargetApp) : [];
  const showReviewTable = closeTargetApp ? hasAnyRoleEnteredReview(closeTargetApp) : false;

  const TODO_PANEL_WIDTH = 340;

  return (
    <div style={{ padding: '20px 24px', background: '#f5f5f7', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>工作台</h2>
          <Text type="secondary" style={{ fontSize: 13 }}>
            欢迎回来，{currentUser.name}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleNavigateToApply}
          style={{ height: 42, paddingInline: 24, fontSize: 14, fontWeight: 600, borderRadius: 8 }}>
          项目转维申请
        </Button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <StatCard
          title="全部项目" count={stats.total}
          icon={<ProjectOutlined />} color="#6366f1" bgColor="#eef2ff"
          active={statusFilter === 'all'} onClick={() => handleStatusFilter('all')}
        />
        <StatCard
          title="进行中" count={stats.inProgress}
          icon={<SyncOutlined />} color="#1677ff" bgColor="#e6f4ff"
          active={statusFilter === 'in_progress'} onClick={() => handleStatusFilter('in_progress')}
        />
        <StatCard
          title="已完成" count={stats.completed}
          icon={<CheckCircleOutlined />} color="#52c41a" bgColor="#f6ffed"
          active={statusFilter === 'completed'} onClick={() => handleStatusFilter('completed')}
        />
        <StatCard
          title="已关闭" count={stats.cancelled}
          icon={<StopOutlined />} color="#8c8c8c" bgColor="#fafafa"
          active={statusFilter === 'cancelled'} onClick={() => handleStatusFilter('cancelled')}
        />
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: Application list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: '#fff', borderRadius: 12, overflow: 'hidden',
            border: '1px solid #f0f0f0',
          }}>
            {/* Table header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Space>
                <Text strong style={{ fontSize: 15 }}>转维申请列表</Text>
                <Tag style={{ borderRadius: 10, fontSize: 12 }}>{filteredApplications.length} 条</Tag>
              </Space>
              <Input.Search
                placeholder="搜索项目名称..."
                allowClear
                size="middle"
                style={{ width: 260 }}
                onSearch={handleSearch}
                onChange={(e) => { if (!e.target.value) handleSearch(''); }}
              />
            </div>

            <Table<TransferApplication>
              columns={columns}
              dataSource={paginatedData}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: PAGE_SIZE,
                total: filteredApplications.length,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
                style: { marginRight: 16 },
              }}
              scroll={{ x: 1200 }}
              size="middle"
              rowClassName={(record) =>
                record.status === 'cancelled' ? 'row-cancelled' : ''
              }
            />
          </div>
        </div>

        {/* Right: Todo panel */}
        <div style={{
          width: todoCollapsed ? 48 : TODO_PANEL_WIDTH,
          flexShrink: 0,
          transition: 'width 0.3s ease',
        }}>
          {todoCollapsed ? (
            <div
              onClick={() => setTodoCollapsed(false)}
              style={{
                background: '#fff', borderRadius: 12, padding: '16px 8px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8,
                border: '1px solid #f0f0f0',
              }}
            >
              <Badge count={userTodos.length} size="small">
                <CarryOutOutlined style={{ fontSize: 20, color: '#6366f1' }} />
              </Badge>
              <div style={{ writingMode: 'vertical-rl', fontSize: 13, fontWeight: 600, color: '#333', letterSpacing: 2 }}>
                待办任务
              </div>
              <LeftOutlined style={{ fontSize: 11, color: '#999' }} />
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 12, overflow: 'hidden',
              border: '1px solid #f0f0f0',
            }}>
              {/* Todo header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Space>
                  <CarryOutOutlined style={{ color: '#6366f1', fontSize: 16 }} />
                  <Text strong style={{ fontSize: 15 }}>待办任务</Text>
                  <Badge
                    count={userTodos.length}
                    style={{ background: userTodos.length > 0 ? '#ff4d4f' : '#d9d9d9' }}
                  />
                </Space>
                <Button type="text" size="small" icon={<RightOutlined />}
                  onClick={() => setTodoCollapsed(true)} title="收起"
                  style={{ color: '#999' }}
                />
              </div>

              {/* Todo list */}
              <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                {userTodos.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <ClockCircleOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 12 }} />
                    <div style={{ color: '#999', fontSize: 13 }}>暂无待办任务</div>
                  </div>
                ) : (
                  userTodos.map((todo) => {
                    const typeConfig = TODO_TYPE_CONFIG[todo.type];
                    return (
                      <div
                        key={todo.id}
                        style={{
                          padding: '14px 20px',
                          borderBottom: '1px solid #f8f8f8',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          borderLeft: `3px solid ${typeConfig.color}`,
                        }}
                        onClick={() => handleTodoAction(todo)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {todo.projectName}
                          </Text>
                          <Tag
                            color={typeConfig.color}
                            icon={typeConfig.icon}
                            style={{ margin: 0, fontSize: 11, borderRadius: 4, lineHeight: '18px', padding: '0 6px' }}
                          >
                            {typeConfig.label}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{todo.node}</Text>
                          <RightOutlined style={{ fontSize: 10, color: '#d9d9d9' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close pipeline modal */}
      <Modal
        title="关闭流水线"
        open={closeModalVisible}
        onCancel={handleCloseModalCancel}
        onOk={handleCloseModalConfirm}
        okText="确认关闭"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        width={showReviewTable ? 640 : 480}
        destroyOnClose
      >
        {closeTargetApp && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">项目：</Text>
              <Text strong>{closeTargetApp.projectName}</Text>
            </div>
            {showReviewTable && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>各角色评审状态：</Text>
                <Table<CloseReviewRow>
                  columns={closeReviewColumns}
                  dataSource={[...closeReviewRows]}
                  rowKey="role"
                  pagination={false}
                  size="small"
                  bordered
                />
              </div>
            )}
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                关闭原因 <Text type="danger">*</Text>
              </Text>
              <TextArea
                rows={4}
                placeholder="请输入关闭流水线的原因"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                maxLength={500}
                showCount
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
