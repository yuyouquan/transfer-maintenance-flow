'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Input,
  Button,
  Tag,
  Space,
  Modal,
  Card,
  Typography,
  Badge,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  EditOutlined,
  AuditOutlined,
  CloseCircleOutlined,
  RightOutlined,
  LeftOutlined,
  CarryOutOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  TransferApplication,
  TodoItem,
  PipelineStatus,
  PipelineNodeStatus,
  CloseReviewRow,
} from '@/types';
import { MOCK_APPLICATIONS, MOCK_TODOS } from '@/mock';
import { useCurrentUser } from '@/context/UserContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- Constants ---

const PAGE_SIZE = 10;

const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, { color: string; label: string }> = {
  in_progress: { color: 'processing', label: '进行中' },
  completed: { color: 'success', label: '已完成' },
  cancelled: { color: 'default', label: '已关闭' },
};

const NODE_STATUS_CONFIG: Record<PipelineNodeStatus, { color: string; label: string }> = {
  not_started: { color: 'default', label: '未开始' },
  in_progress: { color: 'processing', label: '进行中' },
  success: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

const TODO_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  entry: { color: '#1677ff', label: '录入' },
  review: { color: '#52c41a', label: '评审' },
};

// --- Helpers ---

const getCurrentNodeLabel = (app: TransferApplication): string => {
  const { pipeline } = app;
  if (pipeline.infoChange === 'in_progress' || pipeline.infoChange === 'success') return '信息变更';
  if (pipeline.maintenanceReview === 'in_progress' || pipeline.maintenanceReview === 'success') return '维护审核';
  if (pipeline.dataEntry === 'in_progress' || pipeline.dataEntry === 'success') return '资料录入与AI检查';
  if (pipeline.projectInit === 'in_progress' || pipeline.projectInit === 'success') return '项目发起';
  return '未开始';
};

const getCurrentNodeStatus = (app: TransferApplication): PipelineNodeStatus => {
  const { pipeline } = app;
  if (pipeline.infoChange !== 'not_started') return pipeline.infoChange;
  if (pipeline.maintenanceReview !== 'not_started') return pipeline.maintenanceReview;
  if (pipeline.dataEntry !== 'not_started') return pipeline.dataEntry;
  return pipeline.projectInit;
};

const hasAnyRoleEnteredReview = (app: TransferApplication): boolean => {
  return app.pipeline.roleProgress.some(
    (rp) => rp.reviewStatus === 'completed' || rp.reviewStatus === 'in_progress'
  );
};

const buildCloseReviewRows = (app: TransferApplication): ReadonlyArray<CloseReviewRow> => {
  return app.pipeline.roleProgress.map((rp) => {
    const conclusionMap: Record<string, 'N/A' | 'PASS' | 'Fail'> = {
      not_started: 'N/A',
      in_progress: 'N/A',
      completed: 'PASS',
      rejected: 'Fail',
    };
    const maintenanceMember = app.team.maintenance.find(
      (m) => m.role === rp.role || (rp.role === '测试' && m.role === 'TPM')
    );
    return {
      role: rp.role,
      responsiblePerson: maintenanceMember?.name ?? '-',
      conclusion: conclusionMap[rp.reviewStatus] ?? 'N/A',
      comment: '',
    };
  });
};

// --- Component ---

export default function WorkbenchPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [todoCollapsed, setTodoCollapsed] = useState(false);

  // Close pipeline modal
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closeTargetApp, setCloseTargetApp] = useState<TransferApplication | null>(null);
  const [closeReason, setCloseReason] = useState('');

  const filteredApplications = useMemo(() => {
    if (!searchKeyword.trim()) return MOCK_APPLICATIONS;
    const keyword = searchKeyword.trim().toLowerCase();
    return MOCK_APPLICATIONS.filter((app) =>
      app.projectName.toLowerCase().includes(keyword)
    );
  }, [searchKeyword]);

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

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleNavigateToDetail = useCallback((id: string) => { router.push(`/workbench/${id}`); }, [router]);
  const handleNavigateToEntry = useCallback((id: string) => { router.push(`/workbench/${id}/entry`); }, [router]);
  const handleNavigateToReview = useCallback((id: string) => { router.push(`/workbench/${id}/review`); }, [router]);
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
      if (todo.type === 'entry') {
        router.push(`/workbench/${todo.applicationId}/entry`);
      } else {
        router.push(`/workbench/${todo.applicationId}/review`);
      }
    },
    [router]
  );

  // Close modal review table columns
  const closeReviewColumns: ColumnsType<CloseReviewRow> = [
    { title: '角色', dataIndex: 'role', key: 'role', width: 100 },
    { title: '负责人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 100 },
    {
      title: '评审结论', dataIndex: 'conclusion', key: 'conclusion', width: 100,
      render: (conclusion: CloseReviewRow['conclusion']) => {
        const config: Record<string, { color: string }> = {
          PASS: { color: 'success' }, Fail: { color: 'error' }, 'N/A': { color: 'default' },
        };
        return <Tag color={config[conclusion]?.color ?? 'default'}>{conclusion}</Tag>;
      },
    },
    { title: '备注', dataIndex: 'comment', key: 'comment', render: () => '-' },
  ];

  // Main table columns
  const columns: ColumnsType<TransferApplication> = [
    {
      title: '项目名', dataIndex: 'projectName', key: 'projectName', width: 240, ellipsis: true,
      render: (text: string) => <Text strong style={{ color: '#1677ff' }}>{text}</Text>,
    },
    { title: '发起人', dataIndex: 'applicant', key: 'applicant', width: 100 },
    {
      title: '节点', key: 'node', width: 160,
      render: (_: unknown, record: TransferApplication) => getCurrentNodeLabel(record),
    },
    {
      title: '节点状态', key: 'nodeStatus', width: 100,
      render: (_: unknown, record: TransferApplication) => {
        if (record.status === 'cancelled') return <Tag color="default">已关闭</Tag>;
        const status = getCurrentNodeStatus(record);
        const config = NODE_STATUS_CONFIG[status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '最后更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      }),
    },
    {
      title: '备注', dataIndex: 'remark', key: 'remark', width: 180, ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_: unknown, record: TransferApplication) => {
        const isApplicant = record.applicantId === currentUser.id;
        const isInProgress = record.status === 'in_progress';
        const isSQA = record.team.research.some(
          (m) => m.role === 'SQA' && m.id === currentUser.id
        );

        // 录入按钮：资料录入阶段 + 当前用户是录入责任人或角色负责人
        const isInDataEntry = record.pipeline.dataEntry === 'in_progress';
        const hasEntryRole = record.pipeline.roleProgress.some((rp) => {
          if (rp.entryStatus === 'completed' && rp.reviewStatus !== 'rejected') return false;
          const roleMap: Record<string, string> = { SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统' };
          return record.team.research.some(
            (m) => m.id === currentUser.id && m.role === roleMap[rp.role]
          );
        });
        const showEntry = isInProgress && isInDataEntry && hasEntryRole;

        // 评审按钮：维护审核阶段 + 当前用户是对应角色的维护审核人
        const isInReview = record.pipeline.maintenanceReview === 'in_progress';
        const hasReviewRole = record.pipeline.roleProgress.some((rp) => {
          if (rp.reviewStatus !== 'in_progress') return false;
          const roleMap: Record<string, string> = { SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统' };
          return record.team.maintenance.some(
            (m) => m.id === currentUser.id && m.role === roleMap[rp.role]
          );
        });
        const showReview = isInProgress && isInReview && hasReviewRole;

        // 关闭流水线按钮
        const anyRoleInReview = record.pipeline.roleProgress.some(
          (rp) => rp.reviewStatus === 'in_progress' || rp.reviewStatus === 'completed'
        );
        const showClose = isInProgress && (
          (!anyRoleInReview && isApplicant) ||
          (anyRoleInReview && isSQA)
        );

        return (
          <Space size="small" wrap>
            <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleNavigateToDetail(record.id)}>详情</Button>
            {showEntry && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleNavigateToEntry(record.id)}>录入</Button>}
            {showReview && <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => handleNavigateToReview(record.id)}>评审</Button>}
            {showClose && <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleOpenCloseModal(record)}>关闭流水线</Button>}
          </Space>
        );
      },
    },
  ];

  const closeReviewRows = closeTargetApp ? buildCloseReviewRows(closeTargetApp) : [];
  const showReviewTable = closeTargetApp ? hasAnyRoleEnteredReview(closeTargetApp) : false;

  // Todo panel width
  const TODO_PANEL_WIDTH = 320;

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>工作台</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleNavigateToApply}>
          项目转维申请
        </Button>
      </div>

      {/* Main content: left-right layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: Application list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card
            title={
              <Space>
                <Text strong>转维申请列表</Text>
                <Tag>{filteredApplications.length} 条记录</Tag>
              </Space>
            }
            extra={
              <Input.Search
                placeholder="搜索项目名"
                allowClear
                enterButton={<><SearchOutlined /> 搜索</>}
                size="small"
                style={{ width: 280 }}
                onSearch={handleSearch}
                onChange={(e) => { if (!e.target.value) handleSearch(''); }}
              />
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table<TransferApplication>
              columns={columns}
              dataSource={paginatedData}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: PAGE_SIZE,
                total: filteredApplications.length,
                onChange: handlePageChange,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
              }}
              scroll={{ x: 1060 }}
              size="small"
              rowClassName={(record) => record.status === 'cancelled' ? 'ant-table-row-cancelled' : ''}
            />
          </Card>
        </div>

        {/* Right: Todo panel */}
        <div
          style={{
            width: todoCollapsed ? 48 : TODO_PANEL_WIDTH,
            flexShrink: 0,
            transition: 'width 0.3s ease',
          }}
        >
          {todoCollapsed ? (
            /* Collapsed: vertical badge button */
            <div
              onClick={() => setTodoCollapsed(false)}
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: '16px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: '1px solid #f0f0f0',
              }}
            >
              <Badge count={userTodos.length} size="small">
                <CarryOutOutlined style={{ fontSize: 20, color: '#4338ca' }} />
              </Badge>
              <div
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#333',
                  letterSpacing: 2,
                }}
              >
                待办任务
              </div>
              <LeftOutlined style={{ fontSize: 11, color: '#999' }} />
            </div>
          ) : (
            /* Expanded: full todo panel */
            <Card
              title={
                <Space>
                  <CarryOutOutlined style={{ color: '#4338ca' }} />
                  <span>待办任务</span>
                  <Badge
                    count={userTodos.length}
                    style={{ background: userTodos.length > 0 ? '#ff4d4f' : '#d9d9d9' }}
                  />
                </Space>
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  onClick={() => setTodoCollapsed(true)}
                  title="收起"
                />
              }
              styles={{ body: { padding: 0, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' } }}
              style={{ borderRadius: 8 }}
            >
              {userTodos.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <Text type="secondary">暂无待办</Text>
                </div>
              ) : (
                userTodos.map((todo) => {
                  const typeConfig = TODO_TYPE_CONFIG[todo.type];
                  return (
                    <div
                      key={todo.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f5f5f5',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        borderLeft: `3px solid ${typeConfig.color}`,
                      }}
                      onClick={() => handleTodoAction(todo)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong ellipsis style={{ fontSize: 13, flex: 1 }}>
                          {todo.projectName}
                        </Text>
                        <Tag color={typeConfig.color} style={{ margin: 0, fontSize: 11 }}>
                          {typeConfig.label}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {todo.node}
                        </Text>
                        <RightOutlined style={{ fontSize: 10, color: '#bbb' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
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
