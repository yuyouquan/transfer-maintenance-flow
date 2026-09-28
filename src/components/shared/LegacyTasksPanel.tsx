'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApplications } from '@/context/ApplicationContext';
import { useCurrentUser } from '@/context/UserContext';
import {
  LEGACY_TASK_STATUS_CONFIG, canChangeLegacyTaskStatus, createLegacyTask,
  getLegacyTaskAccess, updateLegacyTaskStatus,
} from '@/lib/legacy-tasks';
import type { LegacyTaskInput, LegacyTaskMode, LegacyTaskStatus } from '@/lib/legacy-tasks';
import type { LegacyTask, TransferApplication } from '@/types';
import { LongTextCell } from './LongTextCell';

interface LegacyTasksPanelProps {
  readonly application: TransferApplication;
  readonly mode: LegacyTaskMode;
  readonly id?: string;
}

export default function LegacyTasksPanel({ application, mode, id }: LegacyTasksPanelProps) {
  const { applications, legacyTasks, updateLegacyTasks, addHistoryRecord } = useApplications();
  const { currentUser, allUsers } = useCurrentUser();
  const [form] = Form.useForm<LegacyTaskInput>();
  const [addOpen, setAddOpen] = useState(false);
  const [statusEdit, setStatusEdit] = useState<{ taskId: string; status: LegacyTaskStatus } | null>(null);
  const liveApplication = applications.find(item => item.id === application.id);
  const live = useRef({ application: liveApplication, currentUser, allUsers, legacyTasks, mode });
  useLayoutEffect(() => {
    live.current = { application: liveApplication, currentUser, allUsers, legacyTasks, mode };
  }, [liveApplication, currentUser, allUsers, legacyTasks, mode]);

  const tasks = legacyTasks.filter(task => task.applicationId === application.id);
  const access = getLegacyTaskAccess(liveApplication, currentUser, mode);
  const editingTask = tasks.find(task => task.id === statusEdit?.taskId);
  const editingAccess = getLegacyTaskAccess(liveApplication, currentUser, mode, editingTask);
  const canSaveStatus = Boolean(editingTask && statusEdit
    && canChangeLegacyTaskStatus(liveApplication, currentUser, mode, editingTask, statusEdit.status));

  const handleCreate = (values: LegacyTaskInput) => {
    // Form validation may finish after a user switch; read the committed context again.
    const snapshot = live.current;
    const taskId = `lt-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const result = createLegacyTask(snapshot.application, snapshot.currentUser, snapshot.mode, values, snapshot.allUsers, taskId, createdAt);
    if (!result.task) {
      message.warning(result.error);
      return;
    }
    const task = result.task;
    updateLegacyTasks(previous => {
      const latest = live.current;
      const checked = createLegacyTask(latest.application, latest.currentUser, latest.mode, values, latest.allUsers, taskId, createdAt);
      if (!checked.task || previous.some(item => item.applicationId === task.applicationId && item.id === taskId)) return previous;
      return [...previous, checked.task];
    });
    addHistoryRecord({
      applicationId: task.applicationId,
      action: '新增遗留任务',
      operator: snapshot.currentUser.name,
      detail: `新增遗留任务「${task.description}」（${task.id}），责任人：${task.responsiblePerson}，状态：未创建 → 未解决；操作者：${snapshot.currentUser.name}（${snapshot.currentUser.id}）`,
    });
    setAddOpen(false);
    form.resetFields();
    message.success('遗留任务已新增');
  };

  const handleStatusSave = () => {
    if (!statusEdit) return;
    const snapshot = live.current;
    const result = updateLegacyTaskStatus(snapshot.legacyTasks, snapshot.application, snapshot.currentUser, snapshot.mode, statusEdit.taskId, statusEdit.status);
    if (!result.task || !result.previousStatus) {
      message.warning(result.error);
      return;
    }
    const task = result.task;
    updateLegacyTasks(previous => {
      const latest = live.current;
      return updateLegacyTaskStatus(previous, latest.application, latest.currentUser, latest.mode, statusEdit.taskId, statusEdit.status).tasks;
    });
    addHistoryRecord({
      applicationId: task.applicationId,
      action: '修改遗留任务状态',
      operator: snapshot.currentUser.name,
      detail: `遗留任务「${task.description}」（${task.id}）：${LEGACY_TASK_STATUS_CONFIG[result.previousStatus].label} → ${LEGACY_TASK_STATUS_CONFIG[task.status].label}；操作者：${snapshot.currentUser.name}（${snapshot.currentUser.id}）`,
    });
    setStatusEdit(null);
    message.success('遗留任务状态已更新');
  };

  const columns: ColumnsType<LegacyTask> = [
    { title: '序号', key: 'index', width: 60, align: 'center', render: (_: unknown, __: LegacyTask, index: number) => index + 1 },
    { title: '任务描述', dataIndex: 'description', key: 'description', width: 300,
      render: (value: string) => <LongTextCell text={value} /> },
    { title: '责任人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 90, align: 'center' },
    { title: '部门', dataIndex: 'department', key: 'department', width: 100, align: 'center' },
    { title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 110, align: 'center' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, align: 'center',
      render: (status: LegacyTaskStatus) => <Tag color={LEGACY_TASK_STATUS_CONFIG[status].color}>{LEGACY_TASK_STATUS_CONFIG[status].label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, align: 'center', render: (value: string) => value.slice(0, 10) },
    { title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_: unknown, task: LegacyTask) => {
        const taskAccess = getLegacyTaskAccess(liveApplication, currentUser, mode, task);
        if (taskAccess.canEditStatus) {
          return <Button type="link" size="small" onClick={() => setStatusEdit({ taskId: task.id, status: task.status })}>修改状态</Button>;
        }
        if (taskAccess.canResolve) {
          return <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => setStatusEdit({ taskId: task.id, status: 'resolved' })}>标记已解决</Button>;
        }
        return <span style={{ color: '#bfbfbf' }}>-</span>;
      } },
  ];

  return (
    <>
      <Card id={id} title="遗留任务列表" style={{ marginBottom: 20 }} extra={access.canAdd && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增遗留任务</Button>
      )}>
        <Table<LegacyTask> rowKey="id" columns={columns} dataSource={tasks} size="small" pagination={false}
          scroll={{ x: 1090 }} locale={{ emptyText: '暂无遗留任务' }} />
      </Card>
      <Modal title="新增遗留任务" open={addOpen} onCancel={() => setAddOpen(false)}
        onOk={() => form.submit()} okText="保存" cancelText="取消" okButtonProps={{ disabled: !access.canAdd }} destroyOnHidden>
        {!access.canAdd && <Alert type="warning" showIcon title="当前用户或申请状态已变化，无法新增遗留任务" style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={handleCreate} preserve={false}>
          <Form.Item name="responsiblePersonId" label="责任人" rules={[{ required: true, message: '请选择责任人' }]}>
            <Select showSearch optionFilterProp="label" placeholder="请选择责任人"
              options={allUsers.map(user => ({ value: user.id, label: `${user.name}${user.department ? ` · ${user.department}` : ''}` }))}
              onChange={userId => form.setFieldValue('department', allUsers.find(user => user.id === userId)?.department ?? '')} />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true, whitespace: true, message: '请输入部门' }]}>
            <Input placeholder="请输入责任人部门" />
          </Form.Item>
          <Form.Item name="description" label="任务描述" rules={[{ required: true, whitespace: true, message: '请输入任务描述' }]}>
            <Input.TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期" rules={[{ required: true, message: '请选择截止日期' }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={editingAccess.canEditStatus ? '修改遗留任务状态' : '标记任务为已解决'} open={Boolean(statusEdit)}
        onCancel={() => setStatusEdit(null)} onOk={handleStatusSave} okText="确认" cancelText="取消"
        okButtonProps={{ disabled: !canSaveStatus }} destroyOnHidden>
        {editingTask && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{editingTask.description}</p>}
        {editingAccess.canEditStatus ? (
          <Form layout="vertical">
            <Form.Item label="任务状态" style={{ marginBottom: 0 }}>
              <Select value={statusEdit?.status} onChange={status => setStatusEdit(previous => previous ? { ...previous, status } : null)}
                options={Object.entries(LEGACY_TASK_STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }))} />
            </Form.Item>
          </Form>
        ) : editingAccess.canResolve ? <p>确认该遗留任务已解决？操作后状态将更新为「已解决」。</p>
          : <Alert type="warning" showIcon title="当前用户、申请或任务状态已变化，无法修改任务状态" />}
      </Modal>
    </>
  );
}
