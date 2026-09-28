import type { TemplateRow, TransferRole } from '@/types/config';
import { roleLabel } from './configuration';

export interface TemplateGroup { readonly key: string; readonly rows: ReadonlyArray<TemplateRow> }

export function groupTemplateRows(rows: ReadonlyArray<TemplateRow>): ReadonlyArray<TemplateGroup> {
  const groups = new Map<string, TemplateRow[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.seq, row.content]);
    const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
  }
  return Array.from(groups, ([key, groupRows]) => ({ key, rows: groupRows }));
}

export function filterTemplateGroups(groups: ReadonlyArray<TemplateGroup>, search: string, roles: ReadonlyArray<TransferRole>): ReadonlyArray<TemplateGroup> {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return groups;
  return groups.map(group => ({ ...group, rows: group.rows.filter(row => [row.seq, row.content, row.type, row.remark, row.aiCheckRule, ...[row.responsibleRole, row.entryRole, row.reviewRole].map(id => roleLabel(roles, id))].join('\n').toLocaleLowerCase().includes(query)) })).filter(group => group.rows.length);
}

/** Page size counts groups, so multi-detail groups remain intact. */
export function paginateTemplateGroups(groups: ReadonlyArray<TemplateGroup>, page: number, pageSize: number): ReadonlyArray<TemplateRow> {
  return groups.slice((page - 1) * pageSize, page * pageSize).flatMap(group => group.rows);
}

export const TEMPLATE_DIFF_FIELDS = ['seq', 'content', 'type', 'remark', 'responsibleRole', 'entryRole', 'reviewRole', 'aiCheckRule'] as const;
export function compareTemplateRows(base: ReadonlyArray<TemplateRow>, target: ReadonlyArray<TemplateRow>) {
  const remaining = new Set(base);
  const detailKey = (row: TemplateRow) => JSON.stringify([row.seq, row.type, row.responsibleRole, row.entryRole, row.reviewRole]);
  const matches = new Map<TemplateRow, TemplateRow>();
  const match = (predicate: (previous: TemplateRow, row: TemplateRow) => boolean) => {
    for (const row of target) {
      if (matches.has(row)) continue;
      const previous = Array.from(remaining).find(item => predicate(item, row));
      if (previous) { matches.set(row, previous); remaining.delete(previous); }
    }
  };
  match((previous, row) => previous.id === row.id);
  match((previous, row) => TEMPLATE_DIFF_FIELDS.every(field => (previous[field] ?? '') === (row[field] ?? '')));
  match((previous, row) => detailKey(previous) === detailKey(row));
  match((previous, row) => previous.seq === row.seq);
  const result = target.map((row, index) => {
    const previous = matches.get(row);
    const fieldDiffs = previous ? TEMPLATE_DIFF_FIELDS.filter(field => (previous[field] ?? '') !== (row[field] ?? '')).map(field => ({ field, oldValue: previous[field] ?? '', newValue: row[field] ?? '' })) : [];
    return { ...row, key: `target-${index}`, changeType: !previous ? '新增' as const : fieldDiffs.length ? '修改' as const : '未变更' as const, fieldDiffs };
  });
  return [...result, ...Array.from(remaining, (row, index) => ({ ...row, key: `deleted-${index}`, changeType: '删除' as const, fieldDiffs: [] }))];
}
