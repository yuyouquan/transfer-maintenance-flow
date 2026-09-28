'use client';

import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TemplateKind, TemplateRow, TransferRole } from '@/types/config';
import { LongTextCell } from '@/components/shared/LongTextCell';
import { roleLabel } from '@/lib/configuration';

export function TemplateRowsTable({ rows, roles, kind }: { rows: ReadonlyArray<TemplateRow>; roles: ReadonlyArray<TransferRole>; kind: TemplateKind }) {
  const rowSpans = new Map<string, number>();
  for (let index = 0; index < rows.length;) {
    let end = index + 1;
    while (end < rows.length && rows[end].seq === rows[index].seq && rows[end].content === rows[index].content) end++;
    rowSpans.set(rows[index].id, end - index);
    for (let child = index + 1; child < end; child++) rowSpans.set(rows[child].id, 0);
    index = end;
  }
  const groupCell = (row: TemplateRow) => ({ rowSpan: rowSpans.get(row.id) ?? 1 });
  const columns: ColumnsType<TemplateRow> = [
    { title: '序号', dataIndex: 'seq', width: 100, onCell: groupCell },
    { title: kind === 'checklist' ? '标准' : '评审要素', dataIndex: 'content', width: 300, onCell: groupCell, render: (text: string) => <LongTextCell text={text} /> },
    { title: '类型', dataIndex: 'type', width: 115, render: (text: string) => <LongTextCell text={text} /> },
    ...(kind === 'review_element' ? [{ title: '备注', dataIndex: 'remark', width: 220, render: (text: string) => <LongTextCell text={text} /> }] : []),
    ...(['responsibleRole', 'entryRole', 'reviewRole'] as const).map((field, index) => ({ title: ['责任角色', '资料录入-责任人', '人工审核-责任人'][index], dataIndex: field, width: index ? 150 : 110, render: (id: string) => roleLabel(roles, id) })),
    { title: '智能检查规则', dataIndex: 'aiCheckRule', width: 280, render: (text: string) => <LongTextCell text={text} /> },
  ];
  return <Table<TemplateRow> columns={columns} dataSource={[...rows]} rowKey="id" bordered size="small" pagination={false} scroll={{ x: kind === 'checklist' ? 1300 : 1520 }} />;
}
