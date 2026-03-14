'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Modal,
  Upload,
  Tooltip,
  Tag,
  message,
  Space,
  Breadcrumb,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  ImportOutlined,
  ExportOutlined,
  DiffOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MOCK_CHECKLIST_TEMPLATES } from '@/mock';
import type { CheckListTemplate } from '@/types';

// --- Mock version data ---

interface TemplateVersion {
  readonly version: string;
  readonly date: string;
  readonly itemCount: number;
  readonly isCurrent: boolean;
}

const MOCK_VERSIONS: ReadonlyArray<TemplateVersion> = [
  { version: 'v3.0', date: '2026-03-10', itemCount: 52, isCurrent: true },
  { version: 'v2.0', date: '2026-02-15', itemCount: 48, isCurrent: false },
  { version: 'v1.0', date: '2026-01-20', itemCount: 45, isCurrent: false },
];

interface VersionDiffItem {
  readonly checkItem: string;
  readonly status: '新增' | '修改' | '删除';
}

const MOCK_VERSION_DIFF: ReadonlyArray<VersionDiffItem> = [
  { checkItem: '项目风险清单确认', status: '新增' },
  { checkItem: '客户反馈问题清单已交接', status: '新增' },
  { checkItem: '版本分支管理策略确认', status: '新增' },
  { checkItem: '知识库文档归档确认', status: '新增' },
  { checkItem: '自动化测试用例交接确认', status: '新增' },
  { checkItem: 'Jenkins编译界面所有参数需更新到准确', status: '修改' },
  { checkItem: '确认OTA首版到最新量升版本中间无断开', status: '修改' },
  { checkItem: '旧版测试环境说明', status: '删除' },
];

// --- Constants ---

const AI_RULE_TRUNCATE_LENGTH = 20;

const STATUS_COLOR_MAP: Record<string, string> = {
  '新增': 'green',
  '修改': 'blue',
  '删除': 'red',
};

// --- Component ---

export default function ChecklistConfigPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('v3.0');
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffFromVersion, setDiffFromVersion] = useState('v2.0');
  const [diffToVersion, setDiffToVersion] = useState('v3.0');

  const filteredData = useMemo(() => {
    if (!searchText.trim()) {
      return MOCK_CHECKLIST_TEMPLATES;
    }
    const keyword = searchText.trim().toLowerCase();
    return MOCK_CHECKLIST_TEMPLATES.filter((item) =>
      item.checkItem.toLowerCase().includes(keyword)
    );
  }, [searchText]);

  const handleImportUpload: UploadProps['onChange'] = useCallback((info: Parameters<NonNullable<UploadProps['onChange']>>[0]) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 导入成功`);
    }
  }, []);

  const handleExport = useCallback(() => {
    message.success('导出成功，文件已下载');
  }, []);

  const handleOpenDiffModal = useCallback(() => {
    setDiffModalOpen(true);
  }, []);

  const handleCloseDiffModal = useCallback(() => {
    setDiffModalOpen(false);
  }, []);

  const columns: ColumnsType<CheckListTemplate> = useMemo(
    () => [
      {
        title: '序号',
        key: 'seq',
        width: 70,
        align: 'center',
        render: (_: unknown, __: CheckListTemplate, index: number) => index + 1,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: string) => (
          <Tag color={type === '检查项' ? 'blue' : 'orange'}>{type}</Tag>
        ),
      },
      {
        title: '评审要素',
        dataIndex: 'checkItem',
        key: 'checkItem',
        ellipsis: true,
      },
      {
        title: '责任角色',
        dataIndex: 'responsibleRole',
        key: 'responsibleRole',
        width: 90,
        render: (role: string) => <Tag>{role}</Tag>,
      },
      {
        title: '资料录入-责任人',
        dataIndex: 'entryRole',
        key: 'entryRole',
        width: 160,
      },
      {
        title: '人工审核-责任人',
        dataIndex: 'reviewRole',
        key: 'reviewRole',
        width: 160,
      },
      {
        title: '智能检查规则',
        dataIndex: 'aiCheckRule',
        key: 'aiCheckRule',
        width: 200,
        render: (rule: string) => {
          if (rule.length <= AI_RULE_TRUNCATE_LENGTH) {
            return rule;
          }
          return (
            <Tooltip title={rule}>
              <span>{rule.slice(0, AI_RULE_TRUNCATE_LENGTH)}...</span>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  const diffColumns: ColumnsType<VersionDiffItem> = useMemo(
    () => [
      {
        title: '评审要素',
        dataIndex: 'checkItem',
        key: 'checkItem',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        render: (status: string) => (
          <Tag color={STATUS_COLOR_MAP[status] ?? 'default'}>{status}</Tag>
        ),
      },
    ],
    []
  );

  const versionOptions = useMemo(
    () =>
      MOCK_VERSIONS.map((v) => ({
        value: v.version,
        label: `${v.version} (${v.date}, ${v.itemCount}条${v.isCurrent ? ', 当前' : ''})`,
      })),
    []
  );

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        items={[
          {
            title: (
              <a onClick={() => router.push('/config')}>配置中心</a>
            ),
          },
          { title: '转维材料配置' },
        ]}
        style={{ marginBottom: 24 }}
      />

      <Card
        title="转维材料配置"
        extra={
          <Space>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              onChange={handleImportUpload}
              customRequest={({ onSuccess }) => {
                setTimeout(() => onSuccess?.('ok'), 500);
              }}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Select
              value={selectedVersion}
              onChange={setSelectedVersion}
              options={versionOptions}
              style={{ width: 280 }}
            />
            <Button
              icon={<DiffOutlined />}
              onClick={handleOpenDiffModal}
            >
              版本对比
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索转维材料..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
        </div>

        <Table<CheckListTemplate>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title="版本对比"
        open={diffModalOpen}
        onCancel={handleCloseDiffModal}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>对比版本：</span>
            <Select
              value={diffFromVersion}
              onChange={setDiffFromVersion}
              options={versionOptions}
              style={{ width: 220 }}
            />
            <span>→</span>
            <Select
              value={diffToVersion}
              onChange={setDiffToVersion}
              options={versionOptions}
              style={{ width: 220 }}
            />
          </Space>
        </div>

        <Table<VersionDiffItem>
          columns={diffColumns}
          dataSource={MOCK_VERSION_DIFF}
          rowKey="checkItem"
          size="small"
          pagination={false}
        />
      </Modal>
    </div>
  );
}
