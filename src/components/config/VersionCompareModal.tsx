'use client';

import React, { useState, useMemo } from 'react';
import { Modal, Button, Select, Space, Checkbox, Table, Tooltip } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export type ChangeType = '新增' | '修改' | '删除' | '未变更';

export interface FieldDiff {
  readonly field: string;
  readonly oldValue: string;
  readonly newValue: string;
}

export interface CompareRow {
  readonly key: string;
  readonly changeType: ChangeType;
  readonly fieldDiffs: ReadonlyArray<FieldDiff>;
  readonly modifier?: string;
  readonly modifyTime?: string;
  readonly [field: string]: unknown;
}

export interface DiffField {
  readonly key: string;
  readonly title: string;
  readonly width?: number;
}

interface VersionOption {
  readonly value: string;
  readonly label: string;
}

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly versions: ReadonlyArray<VersionOption>;
  readonly defaultBaseVersion?: string;
  readonly defaultTargetVersion?: string;
  readonly fields: ReadonlyArray<DiffField>;
  /** 计算两版本对比结果。base/target 取自 versions 选中值。 */
  readonly computeDiff: (baseVersion: string, targetVersion: string) => ReadonlyArray<CompareRow>;
}

const ROW_BG: Record<ChangeType, string | undefined> = {
  '新增': '#f6ffed',
  '修改': '#e6f4ff',
  '删除': '#fff2f0',
  '未变更': undefined,
};

const TYPE_TAG_COLOR: Record<ChangeType, { color: string; bg: string }> = {
  '新增': { color: '#52c41a', bg: '#f6ffed' },
  '删除': { color: '#ff4d4f', bg: '#fff2f0' },
  '修改': { color: '#1890ff', bg: '#e6f4ff' },
  '未变更': { color: '#8c8c8c', bg: '#fafafa' },
};

const STATS_DEFS: ReadonlyArray<{
  readonly label: string;
  readonly key: 'all' | ChangeType;
  readonly color: string;
}> = [
  { label: '变更总计', key: 'all', color: '#1890ff' },
  { label: '新增', key: '新增', color: '#52c41a' },
  { label: '修改', key: '修改', color: '#1890ff' },
  { label: '删除', key: '删除', color: '#ff4d4f' },
];

export function VersionCompareModal(props: Props) {
  const [baseVersion, setBaseVersion] = useState(
    props.defaultBaseVersion ?? props.versions[1]?.value ?? '',
  );
  const [targetVersion, setTargetVersion] = useState(
    props.defaultTargetVersion ?? props.versions[0]?.value ?? '',
  );
  const [computed, setComputed] = useState<ReadonlyArray<CompareRow> | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [filterType, setFilterType] = useState<'all' | ChangeType>('all');

  const handleStartCompare = () => {
    setComputed(props.computeDiff(baseVersion, targetVersion));
  };

  const stats = useMemo(() => {
    if (!computed) {
      return { total: 0, added: 0, modified: 0, deleted: 0, unchanged: 0 };
    }
    return {
      total: computed.filter((r) => r.changeType !== '未变更').length,
      added: computed.filter((r) => r.changeType === '新增').length,
      modified: computed.filter((r) => r.changeType === '修改').length,
      deleted: computed.filter((r) => r.changeType === '删除').length,
      unchanged: computed.filter((r) => r.changeType === '未变更').length,
    };
  }, [computed]);

  const filteredData = useMemo(() => {
    if (!computed) return [];
    let data = showUnchanged ? computed : computed.filter((r) => r.changeType !== '未变更');
    if (filterType !== 'all') {
      data = data.filter((r) => r.changeType === filterType);
    }
    return data;
  }, [computed, showUnchanged, filterType]);

  const renderDiffCell = (row: CompareRow, fieldKey: string) => {
    const value = row[fieldKey];
    const text = value == null || value === '' ? '-' : String(value);
    const diff = row.fieldDiffs.find((d) => d.field === fieldKey);
    if (row.changeType === '修改' && diff) {
      return (
        <Tooltip
          title={
            <div style={{ fontSize: 12 }}>
              {row.modifier && <div>修改人：{row.modifier}</div>}
              {row.modifyTime && <div>修改时间：{row.modifyTime}</div>}
            </div>
          }
        >
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ color: '#ff4d4f', fontSize: 11, textDecoration: 'line-through', opacity: 0.7 }}>
              {diff.oldValue || '-'}
            </div>
            <div style={{ color: '#1890ff', fontWeight: 600, fontSize: 12 }}>
              {diff.newValue || '-'}
            </div>
          </div>
        </Tooltip>
      );
    }
    if (row.changeType === '新增') {
      return <span style={{ color: '#52c41a', fontWeight: 500 }}>{text}</span>;
    }
    if (row.changeType === '删除') {
      return <span style={{ color: '#ff4d4f', textDecoration: 'line-through', opacity: 0.7 }}>{text}</span>;
    }
    return <span style={{ color: '#4b5563' }}>{text}</span>;
  };

  const compareColumns: ColumnsType<CompareRow> = [
    {
      title: '序号',
      key: 'idx',
      width: 60,
      align: 'center',
      render: (_unused, _row, idx) => (
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>{idx + 1}</span>
      ),
    },
    {
      title: '变更类型',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 90,
      render: (val: ChangeType) => {
        const c = TYPE_TAG_COLOR[val];
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              color: c.color,
              background: c.bg,
              border: `1px solid ${c.color}40`,
            }}
          >
            {val}
          </span>
        );
      },
    },
    ...props.fields.map((f) => ({
      title: f.title,
      dataIndex: f.key,
      key: f.key,
      width: f.width ?? 160,
      render: (_unused: unknown, row: CompareRow) => renderDiffCell(row, f.key),
    })),
  ];

  const handleClose = () => {
    setComputed(null);
    setShowUnchanged(false);
    setFilterType('all');
    props.onClose();
  };

  return (
    <Modal
      title={props.title ?? '历史版本对比'}
      open={props.open}
      onCancel={handleClose}
      footer={null}
      width={1200}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>基准版本</span>
        <Select
          value={baseVersion}
          onChange={setBaseVersion}
          options={[...props.versions]}
          style={{ width: 220 }}
        />
        <span style={{ color: '#999' }}>→</span>
        <span style={{ color: '#666', fontSize: 13 }}>对比版本</span>
        <Select
          value={targetVersion}
          onChange={setTargetVersion}
          options={[...props.versions]}
          style={{ width: 220 }}
        />
        <Button
          type="primary"
          onClick={handleStartCompare}
          disabled={baseVersion === targetVersion}
          style={{ background: '#4338ca', borderColor: '#4338ca' }}
        >
          开始对比
        </Button>
      </div>

      {!computed ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#bfbfbf' }}>
          <HistoryOutlined style={{ fontSize: 36, display: 'block', marginBottom: 12, color: '#e5e7eb' }} />
          <div style={{ fontSize: 14, color: '#9ca3af' }}>选择两个版本后点击"开始对比"查看差异</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {STATS_DEFS.map((s) => {
              const value =
                s.key === 'all'
                  ? stats.total
                  : s.key === '新增'
                    ? stats.added
                    : s.key === '修改'
                      ? stats.modified
                      : stats.deleted;
              const isActive = filterType === s.key;
              return (
                <div
                  key={s.key}
                  onClick={() => setFilterType(s.key)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? `${s.color}10` : '#fafafa',
                    border: isActive ? `1px solid ${s.color}` : '1px solid #f3f4f6',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>共 {filteredData.length} 条记录</span>
            <Space size={12}>
              <Checkbox checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)}>
                <span style={{ fontSize: 12 }}>显示未变更项（{stats.unchanged}）</span>
              </Checkbox>
            </Space>
          </div>

          <Table<CompareRow>
            columns={compareColumns}
            dataSource={[...filteredData]}
            rowKey="key"
            size="small"
            bordered
            pagination={filteredData.length > 15 ? { pageSize: 15, size: 'small', showTotal: (t) => `共 ${t} 条` } : false}
            scroll={{ x: 1100, y: 420 }}
            onRow={(record) => ({
              style: { background: ROW_BG[record.changeType] },
            })}
          />
        </>
      )}
    </Modal>
  );
}
