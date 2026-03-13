'use client';

import React, { useState, useMemo } from 'react';
import {
  Card, Table, Tabs, Tag, Button, Space, Modal, Input, Select,
  Form, DatePicker, message, Alert, Tooltip, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import {
  MOCK_APPLICATIONS, MOCK_CHECKLIST_ITEMS, MOCK_REVIEW_ELEMENTS, MOCK_USERS,
} from '@/mock';
import type {
  CheckListItem, ReviewElement, ReviewStatus,
} from '@/types';

const { TextArea } = Input;

// --- 状态标签渲染 ---

function renderEntryStatus(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    not_entered: { color: 'default', text: '未录入' },
    draft: { color: 'orange', text: '已暂存' },
    entered: { color: 'green', text: '已录入' },
  };
  const s = map[status] ?? { color: 'default', text: status };
  return <Tag color={s.color}>{s.text}</Tag>;
}

function renderAIStatus(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    not_started: { color: 'default', text: '-' },
    in_progress: { color: 'blue', text: '进行中' },
    passed: { color: 'green', text: '通过' },
    failed: { color: 'red', text: '不通过' },
  };
  const s = map[status] ?? { color: 'default', text: status };
  return <Tag color={s.color}>{s.text}</Tag>;
}

function renderReviewStatus(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    not_reviewed: { color: 'default', text: '未审核' },
    reviewing: { color: 'blue', text: '审核中' },
    passed: { color: 'green', text: '通过' },
    rejected: { color: 'red', text: '不通过' },
  };
  const s = map[status] ?? { color: 'default', text: status };
  return <Tag color={s.color}>{s.text}</Tag>;
}

// --- Block任务表单项 ---
interface BlockTaskForm {
  description: string;
  resolution: string;
  responsiblePerson: string;
  department: string;
  deadline: string;
}

// --- 遗留任务表单项 ---
interface LegacyTaskForm {
  responsiblePerson: string;
  department: string;
  description: string;
  deadline: string;
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const application = MOCK_APPLICATIONS.find((a) => a.id === id);

  // 审核数据状态（不可变更新）
  const [checklistItems, setChecklistItems] = useState<CheckListItem[]>(
    () => MOCK_CHECKLIST_ITEMS.filter((i) => i.applicationId === id)
  );
  const [reviewElements, setReviewElements] = useState<ReviewElement[]>(
    () => MOCK_REVIEW_ELEMENTS.filter((i) => i.applicationId === id)
  );

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState('checklist');

  // Modal状态
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [wantLegacy, setWantLegacy] = useState(false);

  // 不通过表单
  const [reviewComment, setReviewComment] = useState('');
  const [blockTasks, setBlockTasks] = useState<BlockTaskForm[]>([
    { description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' },
  ]);

  // 遗留任务表单
  const [legacyTasks, setLegacyTasks] = useState<LegacyTaskForm[]>([
    { responsiblePerson: '', department: '', description: '', deadline: '' },
  ]);

  // 委派
  const [delegatePersons, setDelegatePersons] = useState<string[]>([]);

  if (!application) {
    return <Card><Alert type="error" message="未找到该转维申请记录" /></Card>;
  }

  // 当前审核角色（示例用SPM）
  const currentRole = 'SPM';
  const roleLeader = application.team.maintenance.find((m) => m.role === currentRole);

  // --- 单条通过/不通过 ---
  const handleItemReview = (itemId: string, type: 'checklist' | 'review_element', newStatus: ReviewStatus) => {
    if (type === 'checklist') {
      setChecklistItems((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, reviewStatus: newStatus } : item)
      );
    } else {
      setReviewElements((prev) =>
        prev.map((item) => item.id === itemId ? { ...item, reviewStatus: newStatus } : item)
      );
    }
    message.success(newStatus === 'passed' ? '已通过' : '已标记为不通过');
  };

  // --- 批量操作 ---
  const handleBatchReview = (newStatus: ReviewStatus) => {
    if (activeTab === 'checklist') {
      setChecklistItems((prev) =>
        prev.map((item) =>
          selectedRowKeys.includes(item.id) ? { ...item, reviewStatus: newStatus } : item
        )
      );
    } else {
      setReviewElements((prev) =>
        prev.map((item) =>
          selectedRowKeys.includes(item.id) ? { ...item, reviewStatus: newStatus } : item
        )
      );
    }
    setSelectedRowKeys([]);
    message.success(`批量${newStatus === 'passed' ? '通过' : '不通过'} ${selectedRowKeys.length} 条记录`);
  };

  // --- 全部通过 ---
  const handlePassConfirm = () => {
    if (wantLegacy) {
      const hasEmpty = legacyTasks.some(
        (t) => !t.responsiblePerson || !t.department || !t.description || !t.deadline
      );
      if (hasEmpty) {
        message.warning('请填写完整所有遗留任务信息');
        return;
      }
    }
    message.success('审核通过，已提交');
    setPassModalOpen(false);
    setWantLegacy(false);
    setLegacyTasks([{ responsiblePerson: '', department: '', description: '', deadline: '' }]);
  };

  // --- 全部不通过 ---
  const handleFailConfirm = () => {
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
    message.success('已拒绝并创建Block任务，已回退到资料录入阶段');
    setFailModalOpen(false);
    setReviewComment('');
    setBlockTasks([{ description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' }]);
  };

  // --- Block任务动态操作 ---
  const addBlockTask = () => {
    setBlockTasks((prev) => [
      ...prev,
      { description: '', resolution: '', responsiblePerson: '', department: '', deadline: '' },
    ]);
  };
  const removeBlockTask = (index: number) => {
    setBlockTasks((prev) => prev.filter((_, i) => i !== index));
  };
  const updateBlockTask = (index: number, field: keyof BlockTaskForm, value: string) => {
    setBlockTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  // --- 遗留任务动态操作 ---
  const addLegacyTask = () => {
    setLegacyTasks((prev) => [
      ...prev,
      { responsiblePerson: '', department: '', description: '', deadline: '' },
    ]);
  };
  const removeLegacyTask = (index: number) => {
    setLegacyTasks((prev) => prev.filter((_, i) => i !== index));
  };
  const updateLegacyTask = (index: number, field: keyof LegacyTaskForm, value: string) => {
    setLegacyTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  // --- 表格列定义 ---
  const checklistColumns = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
    {
      title: '评审要素', dataIndex: 'checkItem', key: 'checkItem', width: 250,
      render: (text: string) => (
        <Tooltip title={text}><span style={{ display: 'block', maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span></Tooltip>
      ),
    },
    { title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80 },
    { title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 120 },
    { title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 120 },
    {
      title: '交付件', dataIndex: 'deliverables', key: 'deliverables', width: 120,
      render: (deliverables: CheckListItem['deliverables']) =>
        deliverables.length > 0
          ? deliverables.map((d) => <a key={d.id} style={{ marginRight: 4 }}>{d.name}</a>)
          : '-',
    },
    {
      title: '录入状态', dataIndex: 'entryStatus', key: 'entryStatus', width: 90,
      render: renderEntryStatus,
    },
    {
      title: 'AI检查状态', dataIndex: 'aiCheckStatus', key: 'aiCheckStatus', width: 100,
      render: renderAIStatus,
    },
    {
      title: '维护审核状态', dataIndex: 'reviewStatus', key: 'reviewStatus', width: 110,
      render: renderReviewStatus,
    },
    {
      title: '操作', key: 'action', width: 140, fixed: 'right' as const,
      render: (_: unknown, record: CheckListItem) => (
        <Space size="small">
          <Button
            type="link" size="small"
            icon={<CheckCircleOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleItemReview(record.id, 'checklist', 'passed')}
          >
            通过
          </Button>
          <Button
            type="link" size="small" danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleItemReview(record.id, 'checklist', 'rejected')}
          >
            不通过
          </Button>
        </Space>
      ),
    },
  ];

  const reviewElementColumns = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 60 },
    { title: '标准', dataIndex: 'standard', key: 'standard', width: 100 },
    {
      title: '说明', dataIndex: 'description', key: 'description', width: 200,
      render: (text: string) => (
        <Tooltip title={text}><span style={{ display: 'block', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span></Tooltip>
      ),
    },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 120 },
    { title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80 },
    { title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 120 },
    { title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 120 },
    {
      title: '交付件', dataIndex: 'deliverables', key: 'deliverables', width: 120,
      render: (deliverables: ReviewElement['deliverables']) =>
        deliverables.length > 0
          ? deliverables.map((d) => <a key={d.id} style={{ marginRight: 4 }}>{d.name}</a>)
          : '-',
    },
    {
      title: '录入状态', dataIndex: 'entryStatus', key: 'entryStatus', width: 90,
      render: renderEntryStatus,
    },
    {
      title: 'AI检查状态', dataIndex: 'aiCheckStatus', key: 'aiCheckStatus', width: 100,
      render: renderAIStatus,
    },
    {
      title: '维护审核状态', dataIndex: 'reviewStatus', key: 'reviewStatus', width: 110,
      render: renderReviewStatus,
    },
    {
      title: '操作', key: 'action', width: 140, fixed: 'right' as const,
      render: (_: unknown, record: ReviewElement) => (
        <Space size="small">
          <Button
            type="link" size="small"
            icon={<CheckCircleOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleItemReview(record.id, 'review_element', 'passed')}
          >
            通过
          </Button>
          <Button
            type="link" size="small" danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleItemReview(record.id, 'review_element', 'rejected')}
          >
            不通过
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const userOptions = MOCK_USERS.map((u) => ({ label: `${u.name} (${u.department})`, value: u.id }));

  return (
    <div style={{ padding: 24 }}>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => router.push(`/workbench/${id}`)}
      >
        返回详情
      </Button>

      {/* 流水线进度 */}
      <Card style={{ marginBottom: 16 }}>
        <PipelineProgress pipeline={application.pipeline} />
      </Card>

      {/* 固定顶部审核操作栏 */}
      <Card
        style={{
          marginBottom: 16,
          position: 'sticky',
          top: 64,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              评审角色：<Tag color="blue">{currentRole}</Tag>
            </span>
            <span>负责人：{roleLeader?.name ?? '-'}</span>
            <Button size="small" onClick={() => setDelegateModalOpen(true)}>委派</Button>
          </div>
          <Space>
            {selectedRowKeys.length > 0 && (
              <>
                <Button onClick={() => handleBatchReview('passed')} style={{ color: '#52c41a', borderColor: '#52c41a' }}>
                  批量通过 ({selectedRowKeys.length})
                </Button>
                <Button danger onClick={() => handleBatchReview('rejected')}>
                  批量不通过 ({selectedRowKeys.length})
                </Button>
                <Divider type="vertical" />
              </>
            )}
            <Button danger onClick={() => setFailModalOpen(true)}>不通过</Button>
            <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => setPassModalOpen(true)}>
              通过
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tab切换 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSelectedRowKeys([]); }}
          items={[
            {
              key: 'checklist',
              label: '转维材料',
              children: (
                <Table
                  rowKey="id"
                  columns={checklistColumns}
                  dataSource={checklistItems}
                  rowSelection={rowSelection}
                  scroll={{ x: 1400 }}
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
                  size="small"
                />
              ),
            },
            {
              key: 'review_element',
              label: '评审要素',
              children: (
                <Table
                  rowKey="id"
                  columns={reviewElementColumns}
                  dataSource={reviewElements}
                  rowSelection={rowSelection}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
                  size="small"
                />
              ),
            },
          ]}
        />
      </Card>

      {/* ===== 通过Modal ===== */}
      <Modal
        title="确认审核通过"
        open={passModalOpen}
        onCancel={() => { setPassModalOpen(false); setWantLegacy(false); }}
        onOk={handlePassConfirm}
        okText="确认通过"
        cancelText="取消"
        width={700}
      >
        {!wantLegacy ? (
          <div>
            <p>是否需要创建遗留任务？</p>
            <Space>
              <Button onClick={handlePassConfirm}>否，直接通过</Button>
              <Button type="primary" onClick={() => setWantLegacy(true)}>是，创建遗留任务</Button>
            </Space>
          </div>
        ) : (
          <div>
            <h4>创建遗留任务</h4>
            <p style={{ color: '#999', marginBottom: 16 }}>可为该检查项添加一个或多个遗留任务</p>
            {legacyTasks.map((task, index) => (
              <Card key={index} size="small" style={{ marginBottom: 12 }}
                extra={legacyTasks.length > 1 && (
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeLegacyTask(index)} />
                )}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>责任人 *</label>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="选择责任人"
                      options={userOptions}
                      value={task.responsiblePerson || undefined}
                      onChange={(v) => updateLegacyTask(index, 'responsiblePerson', v)}
                    />
                  </div>
                  <div>
                    <label>部门 *</label>
                    <Input
                      placeholder="输入部门"
                      value={task.department}
                      onChange={(e) => updateLegacyTask(index, 'department', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label>问题描述 *</label>
                  <TextArea
                    rows={2}
                    placeholder="描述遗留问题"
                    value={task.description}
                    onChange={(e) => updateLegacyTask(index, 'description', e.target.value)}
                  />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label>完成时间 *</label>
                  <Input
                    type="date"
                    value={task.deadline}
                    onChange={(e) => updateLegacyTask(index, 'deadline', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </Card>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addLegacyTask}>
              新增任务行
            </Button>
          </div>
        )}
      </Modal>

      {/* ===== 不通过Modal ===== */}
      <Modal
        title="创建 Block 任务"
        open={failModalOpen}
        onCancel={() => setFailModalOpen(false)}
        onOk={handleFailConfirm}
        okText="确认并保存"
        cancelText="取消"
        width={750}
      >
        <p style={{ color: '#999' }}>若检查项未通过，可添加一个或多个 Block 任务以便跟踪整改。</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600 }}>评审意见 *</label>
          <TextArea
            rows={3}
            placeholder="请填写评审意见"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>

        {blockTasks.map((task, index) => (
          <Card key={index} size="small" style={{ marginBottom: 12 }}
            title={`Block 任务 ${index + 1}`}
            extra={blockTasks.length > 1 && (
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeBlockTask(index)} />
            )}
          >
            <div style={{ marginBottom: 8 }}>
              <label>Block 点描述 *</label>
              <TextArea
                rows={2}
                placeholder="描述Block点"
                value={task.description}
                onChange={(e) => updateBlockTask(index, 'description', e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>解除措施 *</label>
              <TextArea
                rows={2}
                placeholder="描述解除措施"
                value={task.resolution}
                onChange={(e) => updateBlockTask(index, 'resolution', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>责任人 *</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择责任人"
                  options={userOptions}
                  value={task.responsiblePerson || undefined}
                  onChange={(v) => updateBlockTask(index, 'responsiblePerson', v)}
                />
              </div>
              <div>
                <label>部门 *</label>
                <Input
                  placeholder="输入部门"
                  value={task.department}
                  onChange={(e) => updateBlockTask(index, 'department', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label>完成时间 *</label>
              <Input
                type="date"
                value={task.deadline}
                onChange={(e) => updateBlockTask(index, 'deadline', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </Card>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={addBlockTask}>
          新增 Block 行
        </Button>
      </Modal>

      {/* ===== 委派Modal ===== */}
      <Modal
        title="委派协作人"
        open={delegateModalOpen}
        onCancel={() => setDelegateModalOpen(false)}
        onOk={() => {
          if (delegatePersons.length === 0) {
            message.warning('请选择至少一个协作人');
            return;
          }
          message.success(`已委派 ${delegatePersons.length} 人`);
          setDelegateModalOpen(false);
          setDelegatePersons([]);
        }}
        okText="确认"
        cancelText="取消"
      >
        <p>选择协作人参与审核：</p>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择人员"
          options={userOptions}
          value={delegatePersons}
          onChange={setDelegatePersons}
        />
      </Modal>
    </div>
  );
}
