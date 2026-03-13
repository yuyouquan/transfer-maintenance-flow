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
  Row,
  Col,
  Typography,
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  TransferApplication,
  TodoItem,
  PipelineStatus,
  PipelineNodeStatus,
  CloseReviewRow,
} from '@/types';
import { MOCK_APPLICATIONS, MOCK_TODOS, CURRENT_USER } from '@/mock';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- 常量 ---

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

// --- 辅助函数 ---

const getCurrentNodeLabel = (app: TransferApplication): string => {
  const { pipeline } = app;
  if (pipeline.infoChange === 'in_progress' || pipeline.infoChange === 'success') {
    return '信息变更';
  }
  if (pipeline.maintenanceReview === 'in_progress' || pipeline.maintenanceReview === 'success') {
    return '维护审核';
  }
  if (pipeline.dataEntry === 'in_progress' || pipeline.dataEntry === 'success') {
    return '资料录入与AI检查';
  }
  if (pipeline.projectInit === 'in_progress' || pipeline.projectInit === 'success') {
    return '项目发起';
  }
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

// --- 组件 ---

export default function WorkbenchPage() {
  const router = useRouter();

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);

  // 关闭流水线弹窗状态
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closeTargetApp, setCloseTargetApp] = useState<TransferApplication | null>(null);
  const [closeReason, setCloseReason] = useState('');

  // 过滤后的申请列表
  const filteredApplications = useMemo(() => {
    if (!searchKeyword.trim()) return MOCK_APPLICATIONS;
    const keyword = searchKeyword.trim().toLowerCase();
    return MOCK_APPLICATIONS.filter((app) =>
      app.projectName.toLowerCase().includes(keyword)
    );
  }, [searchKeyword]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredApplications.slice(start, start + PAGE_SIZE);
  }, [filteredApplications, currentPage]);

  // 当前用户的待办
  const userTodos = useMemo(() => {
    return MOCK_TODOS.filter((todo) => todo.responsiblePerson === CURRENT_USER.name);
  }, []);

  // 事件处理
  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleNavigateToDetail = useCallback(
    (id: string) => {
      router.push(`/workbench/${id}`);
    },
    [router]
  );

  const handleNavigateToEntry = useCallback(
    (id: string) => {
      router.push(`/workbench/${id}/entry`);
    },
    [router]
  );

  const handleNavigateToReview = useCallback(
    (id: string) => {
      router.push(`/workbench/${id}/review`);
    },
    [router]
  );

  const handleNavigateToApply = useCallback(() => {
    router.push('/workbench/apply');
  }, [router]);

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

  // 关闭弹窗中的评审状态表格列定义
  const closeReviewColumns: ColumnsType<CloseReviewRow> = [
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 100,
    },
    {
      title: '评审结论',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 100,
      render: (conclusion: CloseReviewRow['conclusion']) => {
        const config: Record<string, { color: string }> = {
          PASS: { color: 'success' },
          Fail: { color: 'error' },
          'N/A': { color: 'default' },
        };
        return <Tag color={config[conclusion]?.color ?? 'default'}>{conclusion}</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'comment',
      key: 'comment',
      render: () => '-',
    },
  ];

  // 主表格列定义
  const columns: ColumnsType<TransferApplication> = [
    {
      title: '项目名',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 240,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ color: '#1677ff' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '发起人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 100,
    },
    {
      title: '节点',
      key: 'node',
      width: 160,
      render: (_: unknown, record: TransferApplication) => getCurrentNodeLabel(record),
    },
    {
      title: '节点状态',
      key: 'nodeStatus',
      width: 100,
      render: (_: unknown, record: TransferApplication) => {
        if (record.status === 'cancelled') {
          return <Tag color="default">已关闭</Tag>;
        }
        const status = getCurrentNodeStatus(record);
        const config = NODE_STATUS_CONFIG[status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '最后更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => {
        const date = new Date(text);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_: unknown, record: TransferApplication, index: number) => {
        const isApplicant = record.applicantId === CURRENT_USER.id;
        const isInProgress = record.status === 'in_progress';
        const showEntry = index === 0 && isInProgress;
        const showReview = index === 1 && isInProgress;
        const showClose = index === 0 && isApplicant && isInProgress;

        return (
          <Space size="small" wrap>
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleNavigateToDetail(record.id)}
            >
              详情
            </Button>
            {showEntry && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleNavigateToEntry(record.id)}
              >
                录入
              </Button>
            )}
            {showReview && (
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                onClick={() => handleNavigateToReview(record.id)}
              >
                评审
              </Button>
            )}
            {showClose && (
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleOpenCloseModal(record)}
              >
                关闭流水线
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // 关闭弹窗中的评审行数据
  const closeReviewRows = closeTargetApp ? buildCloseReviewRows(closeTargetApp) : [];
  const showReviewTable = closeTargetApp ? hasAnyRoleEnteredReview(closeTargetApp) : false;

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 页面标题区域 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          工作台
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleNavigateToApply}
        >
          项目转维申请
        </Button>
      </div>

      {/* 待办任务区域 */}
      {userTodos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            待办任务
            <Tag color="red" style={{ marginLeft: 8, borderRadius: 10 }}>
              {userTodos.length}
            </Tag>
          </Title>
          <Row gutter={[16, 16]}>
            {userTodos.map((todo) => {
              const typeConfig = TODO_TYPE_CONFIG[todo.type];
              return (
                <Col key={todo.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      borderLeft: `3px solid ${typeConfig.color}`,
                    }}
                    styles={{
                      body: { padding: '12px 16px' },
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                        {todo.projectName}
                      </Text>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        节点：
                      </Text>
                      <Text style={{ fontSize: 12 }}>{todo.node}</Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        负责人：
                      </Text>
                      <Text style={{ fontSize: 12 }}>{todo.responsiblePerson}</Text>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Tag color={typeConfig.color} style={{ margin: 0 }}>
                        {typeConfig.label}
                      </Tag>
                      <Button
                        type="link"
                        size="small"
                        icon={<RightOutlined />}
                        onClick={() => handleTodoAction(todo)}
                      >
                        操作
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* 搜索区域 */}
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索项目名"
          allowClear
          enterButton={<><SearchOutlined /> 搜索</>}
          size="middle"
          style={{ maxWidth: 400 }}
          onSearch={handleSearch}
          onChange={(e) => {
            if (!e.target.value) {
              handleSearch('');
            }
          }}
        />
      </div>

      {/* 申请列表表格 */}
      <Card
        title={
          <Space>
            <Text strong>转维申请列表</Text>
            <Tag>{filteredApplications.length} 条记录</Tag>
          </Space>
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
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1060 }}
          size="middle"
          rowClassName={(record) =>
            record.status === 'cancelled' ? 'ant-table-row-cancelled' : ''
          }
        />
      </Card>

      {/* 关闭流水线弹窗 */}
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
                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  各角色评审状态：
                </Text>
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
              <Text
                type="secondary"
                style={{ display: 'block', marginBottom: 8 }}
              >
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
