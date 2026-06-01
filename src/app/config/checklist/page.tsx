'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Upload,
  Tag,
  message,
  Space,
  Breadcrumb,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  ExportOutlined,
  DiffOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MOCK_CHECKLIST_TEMPLATES } from '@/mock';
import type { CheckListTemplate } from '@/types';
import { VersionCompareModal, type CompareRow } from '@/components/config/VersionCompareModal';
import { LongTextCell } from '@/components/shared/LongTextCell';

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

// --- Mock 版本对比数据 ---

const MOCK_DIFF_v2_to_v3: ReadonlyArray<CompareRow> = [
  // 新增
  { key: 'add-1', changeType: '新增', fieldDiffs: [], type: '检查项', checkItem: '项目风险清单确认', responsibleRole: 'SPM', aiCheckRule: '检查风险清单文档是否真实存在' },
  { key: 'add-2', changeType: '新增', fieldDiffs: [], type: '检查项', checkItem: '客户反馈问题清单已交接', responsibleRole: 'SPM', aiCheckRule: '检查飞书文档链接可访问' },
  { key: 'add-3', changeType: '新增', fieldDiffs: [], type: '交接资料', checkItem: '版本分支管理策略确认', responsibleRole: '系统', aiCheckRule: '检查分支策略文档存在' },
  { key: 'add-4', changeType: '新增', fieldDiffs: [], type: '交接资料', checkItem: '知识库文档归档确认', responsibleRole: 'SPM', aiCheckRule: '检查归档路径有效' },
  { key: 'add-5', changeType: '新增', fieldDiffs: [], type: '交接资料', checkItem: '自动化测试用例交接确认', responsibleRole: '测试', aiCheckRule: '检查 testcase 仓库可访问' },
  // 修改：Jenkins 检查规则更具体
  {
    key: 'mod-1',
    changeType: '修改',
    type: '检查项',
    checkItem: 'Jenkins编译界面所有参数需更新到准确',
    responsibleRole: 'SPM',
    aiCheckRule: '检查给定文本中包含 Jenkins 链接、参数 OWNER 与 BRANCH 已设置且非默认值',
    modifier: '张三',
    modifyTime: '2026-03-08 14:32',
    fieldDiffs: [
      {
        field: 'aiCheckRule',
        oldValue: '确认给出的文本里包含 Jenkins 链接即可',
        newValue: '检查给定文本中包含 Jenkins 链接、参数 OWNER 与 BRANCH 已设置且非默认值',
      },
    ],
  },
  // 修改：OTA 责任角色调整
  {
    key: 'mod-2',
    changeType: '修改',
    type: '检查项',
    checkItem: '确认OTA首版到最新量升版本中间无断开',
    responsibleRole: '测试',
    aiCheckRule: '检查 OTA 部署表文档真实存在并核对版本链路完整',
    modifier: '李四',
    modifyTime: '2026-03-09 10:05',
    fieldDiffs: [
      { field: 'responsibleRole', oldValue: 'SPM', newValue: '测试' },
      { field: 'aiCheckRule', oldValue: '检查OTA部署表文档真实存在即可', newValue: '检查 OTA 部署表文档真实存在并核对版本链路完整' },
    ],
  },
  // 删除
  { key: 'del-1', changeType: '删除', fieldDiffs: [], type: '交接资料', checkItem: '旧版测试环境说明', responsibleRole: '测试', aiCheckRule: '已废弃' },
  // 未变更（少量举例）
  { key: 'un-1', changeType: '未变更', fieldDiffs: [], type: '检查项', checkItem: 'IPM/SPUG项目信息完整无误', responsibleRole: 'SPM', aiCheckRule: '检查 IPM 系统截图可读' },
  { key: 'un-2', changeType: '未变更', fieldDiffs: [], type: '检查项', checkItem: '版本编译参数全部正确归档', responsibleRole: 'SPM', aiCheckRule: '检查归档目录可访问' },
];

const computeChecklistDiff = (
  baseVersion: string,
  targetVersion: string,
): ReadonlyArray<CompareRow> => {
  // 当前 mock 仅演示 v2.0 → v3.0；其它组合返回相同集合（占位）
  void baseVersion;
  void targetVersion;
  return MOCK_DIFF_v2_to_v3;
};

const DIFF_FIELDS = [
  { key: 'type', title: '类型', width: 80 },
  { key: 'checkItem', title: '检查项 / 评审要素', width: 280 },
  { key: 'responsibleRole', title: '责任角色', width: 80 },
  { key: 'aiCheckRule', title: '智能检查规则', width: 380 },
];

// --- Component ---

export default function ChecklistConfigPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('v3.0');
  const [diffModalOpen, setDiffModalOpen] = useState(false);

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
        width: 300,
        render: (checkItem: string) => (
          <LongTextCell text={checkItem} />
        ),
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
        width: 320,
        render: (aiCheckRule: string) => (
          <LongTextCell text={aiCheckRule} />
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
          <Space wrap>
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
            <Button
              icon={<DownloadOutlined />}
              href="/templates/checklist-import-template.xls"
              download="转维材料配置导入模板.xls"
            >
              下载导入模板
            </Button>
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

      <VersionCompareModal
        open={diffModalOpen}
        onClose={handleCloseDiffModal}
        title="转维材料配置 · 历史版本对比"
        versions={versionOptions}
        defaultBaseVersion="v2.0"
        defaultTargetVersion="v3.0"
        fields={DIFF_FIELDS}
        computeDiff={computeChecklistDiff}
      />
    </div>
  );
}
