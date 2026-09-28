'use client';

import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ProjectType, TransferRole } from '@/types/config';
import { useConfiguration } from '@/context/ConfigurationContext';

export function TeamConfiguration({ projectType }: { projectType: ProjectType }) {
  const { configurations, saveRole, removeRole } = useConfiguration();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<TransferRole | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm<{ name: string; ipmRoleCode: string }>();
  const configuration = configurations[projectType];
  const rows = [...(configuration.checklistVersions[0]?.rows ?? []), ...(configuration.reviewVersions[0]?.rows ?? [])];
  const referenced = (id: string) => rows.some(row => [row.responsibleRole, row.entryRole, row.reviewRole].includes(id));
  const showEditor = (role: TransferRole | null) => {
    setEditing(role); setError(''); form.setFieldsValue({ name: role?.name ?? '', ipmRoleCode: role?.ipmRoleCode ?? '' }); setOpen(true);
  };
  return <Space orientation="vertical" size={16} style={{ width: '100%' }}>
    <Alert showIcon type="info" title="同一套角色同时用于在研团队和维护团队。系统 SPM 承担最终审核，可修改名称和 Code，但不能删除。" description="当前 Code 为 MOCK 演示映射。配置变更仅影响新申请，已有申请使用创建时的角色与成员快照。" />
    <Button type="primary" icon={<PlusOutlined />} onClick={() => showEditor(null)}>新增角色</Button>
    <Table<TransferRole> rowKey="id" dataSource={[...configuration.roles]} pagination={false} columns={[
      { title: '角色名', dataIndex: 'name', render: (name: string, role) => <Space>{name}{role.isSpm && <Tag color="purple">系统SPM</Tag>}</Space> },
      { title: 'IPM角色Code', dataIndex: 'ipmRoleCode' },
      { title: '模板引用', render: (_, role) => referenced(role.id) ? '当前有效模板已引用' : '未引用' },
      { title: '操作', width: 190, render: (_, role) => <Space><Button type="link" onClick={() => showEditor(role)}>编辑</Button><Popconfirm title={`删除角色「${role.name}」？`} disabled={!!role.isSpm || referenced(role.id)} onConfirm={() => {
        try { removeRole(projectType, role.id); message.success('角色已删除'); } catch (reason) { message.error(reason instanceof Error ? reason.message : '删除失败'); }
      }}><Button type="link" danger disabled={!!role.isSpm || referenced(role.id)}>删除</Button></Popconfirm></Space> },
    ]} />
    <Modal title={editing ? '编辑角色' : '新增角色'} open={open} onCancel={() => setOpen(false)} okText="保存" cancelText="取消" onOk={async () => {
      try {
        const values = await form.validateFields();
        saveRole(projectType, { id: editing?.id ?? crypto.randomUUID(), ...values, isSpm: editing?.isSpm });
        setOpen(false); message.success('角色已保存');
      } catch (reason) { if (reason instanceof Error) setError(reason.message); }
    }}>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical"><Form.Item name="name" label="角色名" rules={[{ required: true, whitespace: true, message: '请输入角色名' }]}><Input maxLength={50} /></Form.Item><Form.Item name="ipmRoleCode" label="IPM角色Code" rules={[{ required: true, whitespace: true, message: '请输入IPM角色Code' }]}><Input maxLength={100} /></Form.Item></Form>
    </Modal>
  </Space>;
}
