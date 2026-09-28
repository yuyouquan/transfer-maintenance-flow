'use client';

import { useMemo, useState } from 'react';
import { Alert, App, Button, Input, Modal, Pagination, Select, Space, Tag, Upload } from 'antd';
import { DiffOutlined, DownloadOutlined, ExportOutlined, UploadOutlined } from '@ant-design/icons';
import type { ProjectType, TemplateKind, TemplateRow } from '@/types/config';
import { PROJECT_TYPE_LABELS } from '@/types/config';
import { useConfiguration } from '@/context/ConfigurationContext';
import { compareTemplateRows, filterTemplateGroups, groupTemplateRows, paginateTemplateGroups } from '@/lib/template-groups';
import { roleLabel } from '@/lib/configuration';
import { downloadTemplateWorkbook, exportTemplateWorkbook, parseTemplateWorkbook, TEMPLATE_HEADERS } from '@/lib/template-workbook';
import { TemplateRowsTable } from './TemplateRowsTable';
import { VersionCompareModal } from './VersionCompareModal';

export function TemplateManager({ projectType, kind }: { projectType: ProjectType; kind: TemplateKind }) {
  const { configurations, importTemplate } = useConfiguration();
  const { message } = App.useApp();
  const configuration = configurations[projectType];
  const versions = kind === 'checklist' ? configuration.checklistVersions : configuration.reviewVersions;
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const version = versions.find(item => item.id === selectedVersion) ?? versions[0];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingRows, setPendingRows] = useState<ReadonlyArray<TemplateRow> | null>(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const label = kind === 'checklist' ? 'CheckList' : '评审要素';
  const groups = useMemo(() => filterTemplateGroups(groupTemplateRows(version?.rows ?? []), search, configuration.roles), [version, search, configuration.roles]);
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(groups.length / pageSize)));
  const pageRows = paginateTemplateGroups(groups, visiblePage, pageSize);
  const fields = (['seq', 'content', 'type', ...(kind === 'review_element' ? ['remark'] : []), 'responsibleRole', 'entryRole', 'reviewRole', 'aiCheckRule']).map((key, index) => ({ key, title: TEMPLATE_HEADERS[kind][index], width: key === 'content' || key === 'aiCheckRule' ? 240 : 130 }));
  const download = (blank: boolean) => {
    try {
      const bytes = exportTemplateWorkbook(blank ? [] : version?.rows ?? [], kind, configuration.roles);
      downloadTemplateWorkbook(bytes, `${PROJECT_TYPE_LABELS[projectType]}-${label}-${blank ? '导入模板' : version?.version ?? '导出'}.xlsx`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '下载失败'); }
  };
  const confirmImport = () => {
    if (!pendingRows) return;
    try {
      importTemplate(projectType, kind, pendingRows);
      setPendingRows(null); setSelectedVersion(undefined); setSearch(''); setPage(1); setError('');
      message.success('模板导入成功，已生成新版本');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '导入失败'); }
  };
  const computeDiff = (baseId: string, targetId: string) => {
    const roleFields = ['responsibleRole', 'entryRole', 'reviewRole'] as const;
    return compareTemplateRows(versions.find(item => item.id === baseId)?.rows ?? [], versions.find(item => item.id === targetId)?.rows ?? []).map(row => ({
      ...row,
      ...Object.fromEntries(roleFields.map(field => [field, roleLabel(configuration.roles, row[field])])),
      fieldDiffs: row.fieldDiffs.map(diff => roleFields.some(field => field === diff.field)
        ? { ...diff, oldValue: roleLabel(configuration.roles, diff.oldValue), newValue: roleLabel(configuration.roles, diff.newValue) }
        : diff),
    }));
  };
  return <Space orientation="vertical" size={16} style={{ width: '100%' }}>
    <Alert type="info" showIcon title="序号由您填写；同一序号与标准／评审要素一一对应，多条明细可重复填写或纵向合并前两列。" description="导入成功后生成独立版本；角色引用当前项目类型的转维团队。历史版本角色名随当前配置更新，已删除角色保留 ID 标识。" />
    {error && <Alert type="error" title={error} showIcon closable onClose={() => setError('')} />}
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <Space wrap>
        <Input.Search aria-label="搜索模板明细" placeholder="搜索序号、内容、角色或规则" allowClear value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} style={{ width: 300 }} />
        <Select aria-label="模板版本" style={{ width: 215 }} value={version?.id} onChange={id => { setSelectedVersion(id); setPage(1); }} options={versions.map((item, index) => ({ value: item.id, label: `${item.version}${index === 0 ? '（当前有效）' : ''} · ${item.rows.length}条` }))} />
        <Tag>{groups.length}组 / {groups.reduce((count, group) => count + group.rows.length, 0)}条明细</Tag>
      </Space>
      <Space wrap>
        <Button icon={<DownloadOutlined />} onClick={() => download(true)}>下载模板</Button>
        <Button icon={<ExportOutlined />} onClick={() => download(false)} disabled={!version}>导出</Button>
        <Button icon={<DiffOutlined />} onClick={() => setCompareOpen(true)} disabled={versions.length < 2}>版本对比</Button>
        <Upload accept=".xls,.xlsx" showUploadList={false} beforeUpload={async file => {
          setError(''); setPendingRows(null);
          if (!/\.(xlsx|xls)$/i.test(file.name)) { setError('请选择 XLS 或 XLSX 文件'); return false; }
          if (file.size > 10 * 1024 * 1024) { setError('文件大小不能超过10MB'); return false; }
          setParsing(true);
          try { setPendingRows(parseTemplateWorkbook(await file.arrayBuffer(), kind, configuration.roles)); }
          catch (reason) { setError(reason instanceof Error ? reason.message : '导入解析失败'); }
          finally { setParsing(false); }
          return false;
        }}><Button type="primary" icon={<UploadOutlined />} loading={parsing}>导入</Button></Upload>
      </Space>
    </div>
    {version && <span style={{ color: '#6b7280', fontSize: 12 }}>版本创建时间：{new Date(version.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</span>}
    <TemplateRowsTable rows={pageRows} roles={configuration.roles} kind={kind} />
    <Pagination current={visiblePage} pageSize={pageSize} total={groups.length} showSizeChanger pageSizeOptions={[5, 10, 20, 50]} showTotal={total => `共 ${total} 组，分页保持组内明细完整`} onChange={(next, size) => { setPage(next); setPageSize(size); }} />
    <Modal open={!!pendingRows} title={`确认导入${label}`} onCancel={() => setPendingRows(null)} onOk={confirmImport} okText="确认导入并生成版本" cancelText="取消" width={1100}>
      <Alert style={{ marginBottom: 16 }} type="success" showIcon title={`已通过校验：${groupTemplateRows(pendingRows ?? []).length} 组，${pendingRows?.length ?? 0} 条明细`} description={`将替换${PROJECT_TYPE_LABELS[projectType]}当前有效的${label}模板，已有申请和历史版本保持原快照。`} />
      <div style={{ maxHeight: '55vh', overflow: 'auto' }}><TemplateRowsTable rows={groupTemplateRows(pendingRows ?? []).flatMap(group => group.rows)} roles={configuration.roles} kind={kind} /></div>
    </Modal>
    {compareOpen && <VersionCompareModal open onClose={() => setCompareOpen(false)} title={`${label}版本对比`} versions={versions.map(item => ({ value: item.id, label: item.version }))} fields={fields} computeDiff={computeDiff} />}
  </Space>;
}
