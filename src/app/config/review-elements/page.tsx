'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
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
  ExportOutlined,
  DiffOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { MOCK_REVIEW_ELEMENT_TEMPLATES } from '@/mock';
import type { ReviewElementTemplate } from '@/types';
import { VersionCompareModal, type CompareRow } from '@/components/config/VersionCompareModal';

// --- Mock version data ---

interface TemplateVersion {
  readonly version: string;
  readonly date: string;
  readonly itemCount: number;
  readonly isCurrent: boolean;
}

const MOCK_VERSIONS: ReadonlyArray<TemplateVersion> = [
  { version: 'v3.0', date: '2026-03-10', itemCount: 15, isCurrent: true },
  { version: 'v2.0', date: '2026-02-15', itemCount: 12, isCurrent: false },
  { version: 'v1.0', date: '2026-01-20', itemCount: 10, isCurrent: false },
];

// --- Mock 版本对比数据 ---

const MOCK_DIFF_v2_to_v3: ReadonlyArray<CompareRow> = [
  // 新增
  { key: 'add-1', changeType: '新增', fieldDiffs: [], standard: 'B07', description: '确认安全启动链路完整', responsibleRole: '底软', aiCheckRule: '检查安全启动验证报告存在' },
  { key: 'add-2', changeType: '新增', fieldDiffs: [], standard: 'B08', description: '确认底软已知问题清单已完整交接', responsibleRole: '底软', aiCheckRule: '检查问题清单文档存在' },
  { key: 'add-3', changeType: '新增', fieldDiffs: [], standard: 'C05', description: '确认系统兼容性问题已记录', responsibleRole: '系统', aiCheckRule: '检查兼容性矩阵文档' },
  // 修改：归档要求更详细
  {
    key: 'mod-1',
    changeType: '修改',
    standard: 'A03',
    description: '确认项目关键文档已归档到指定服务器并标注更新时间',
    responsibleRole: 'SPM',
    aiCheckRule: '检查归档目录可访问且最后修改时间在 30 日内',
    modifier: '王五',
    modifyTime: '2026-03-08 16:20',
    fieldDiffs: [
      {
        field: 'description',
        oldValue: '确认项目关键文档已归档到指定服务器',
        newValue: '确认项目关键文档已归档到指定服务器并标注更新时间',
      },
      {
        field: 'aiCheckRule',
        oldValue: '检查归档目录可访问',
        newValue: '检查归档目录可访问且最后修改时间在 30 日内',
      },
    ],
  },
  // 修改：OTA 责任角色调整
  {
    key: 'mod-2',
    changeType: '修改',
    standard: 'A05',
    description: '确认OTA版本链路完整，无断链',
    responsibleRole: '测试',
    aiCheckRule: '检查 OTA 部署表完整且每个版本节点都有连接',
    modifier: '李四',
    modifyTime: '2026-03-09 10:05',
    fieldDiffs: [
      { field: 'responsibleRole', oldValue: 'SPM', newValue: '测试' },
    ],
  },
  // 删除
  { key: 'del-1', changeType: '删除', fieldDiffs: [], standard: 'B99', description: '旧版驱动交接要求', responsibleRole: '底软', aiCheckRule: '已废弃' },
  // 未变更（少量举例）
  { key: 'un-1', changeType: '未变更', fieldDiffs: [], standard: 'A01', description: 'IPM 系统版本计划与实际上市时间一致', responsibleRole: 'SPM', aiCheckRule: '检查 IPM 项目报告存在' },
  { key: 'un-2', changeType: '未变更', fieldDiffs: [], standard: 'A02', description: '客户定制需求均已记录在 SPD 系统', responsibleRole: 'SPM', aiCheckRule: '检查 SPD 项目链接' },
];

const computeReviewElementDiff = (
  baseVersion: string,
  targetVersion: string,
): ReadonlyArray<CompareRow> => {
  void baseVersion;
  void targetVersion;
  return MOCK_DIFF_v2_to_v3;
};

const DIFF_FIELDS = [
  { key: 'standard', title: '标准', width: 80 },
  { key: 'description', title: '说明', width: 320 },
  { key: 'responsibleRole', title: '责任角色', width: 80 },
  { key: 'aiCheckRule', title: '智能检查规则', width: 320 },
];

// --- Constants ---

const AI_RULE_TRUNCATE_LENGTH = 20;

// --- Component ---

export default function ReviewElementsConfigPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('v3.0');
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) {
      return MOCK_REVIEW_ELEMENT_TEMPLATES;
    }
    const keyword = searchText.trim().toLowerCase();
    return MOCK_REVIEW_ELEMENT_TEMPLATES.filter(
      (item) =>
        item.description.toLowerCase().includes(keyword) ||
        item.standard.toLowerCase().includes(keyword)
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

  const columns: ColumnsType<ReviewElementTemplate> = useMemo(
    () => [
      {
        title: '序号',
        key: 'seq',
        width: 70,
        align: 'center',
        render: (_: unknown, __: ReviewElementTemplate, index: number) =>
          index + 1,
      },
      {
        title: '标准',
        dataIndex: 'standard',
        key: 'standard',
        width: 120,
        render: (standard: string) => <Tag color="purple">{standard}</Tag>,
      },
      {
        title: '说明',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        width: 200,
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
          { title: '评审要素配置' },
        ]}
        style={{ marginBottom: 24 }}
      />

      <Card
        title="评审要素配置"
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
              style={{ width: 260 }}
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
            placeholder="搜索评审标准或说明..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
        </div>

        <Table<ReviewElementTemplate>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <VersionCompareModal
        open={diffModalOpen}
        onClose={handleCloseDiffModal}
        title="评审要素配置 · 历史版本对比"
        versions={versionOptions}
        defaultBaseVersion="v2.0"
        defaultTargetVersion="v3.0"
        fields={DIFF_FIELDS}
        computeDiff={computeReviewElementDiff}
      />
    </div>
  );
}
