import type { CheckListItem, ReviewElement, TransferApplication } from '@/types';
import type { ProjectConfiguration, TemplateRow } from '@/types/config';
import { findRoleMember, getItemRole } from './workflow-roles';

export function generateApplicationMaterials(app: TransferApplication, config: ProjectConfiguration) {
  const checklistVersion = config.checklistVersions.find(version => version.id === app.templateVersions?.checklist) ?? config.checklistVersions[0];
  const reviewVersion = config.reviewVersions.find(version => version.id === app.templateVersions?.review_element) ?? config.reviewVersions[0];
  function common(row: TemplateRow, kind: 'cl' | 're') {
    const entry = findRoleMember(app, 'research', row.entryRole);
    const review = findRoleMember(app, 'maintenance', row.reviewRole);
    return {
      id: `${app.id}-${kind}-${row.id}`, applicationId: app.id, templateItemId: row.id,
      seq: row.seq, responsibleRole: row.responsibleRole, entryRoleId: row.entryRole, reviewRoleId: row.reviewRole,
      entryPerson: entry?.name ?? '-', entryPersonId: entry?.id ?? '',
      reviewPerson: review?.name ?? '-', reviewPersonId: review?.id ?? '',
      aiCheckRule: row.aiCheckRule, deliverables: [],
      entryStatus: 'not_entered' as const, aiCheckStatus: 'not_started' as const, reviewStatus: 'not_reviewed' as const,
    };
  }
  const checklist: CheckListItem[] = (checklistVersion?.rows ?? []).map(row => ({ ...common(row, 'cl'), type: row.type, checkItem: row.content }));
  const review: ReviewElement[] = app.projectType === 'tos' ? [] : (reviewVersion?.rows ?? []).map(row => ({
    ...common(row, 're'), standard: row.type, description: row.content, remark: row.remark ?? '',
  }));
  return { checklist, review };
}

function materialKey(item: CheckListItem | ReviewElement) {
  return JSON.stringify([
    'checkItem' in item ? 'checklist' : 'review',
    'checkItem' in item ? item.checkItem : item.description,
    'type' in item ? item.type : item.standard,
    'remark' in item ? item.remark : '', item.responsibleRole,
    getItemRole(item, 'entry'), getItemRole(item, 'review'), item.aiCheckRule,
  ]);
}

/** Only an unambiguous one-to-one semantic match can carry old entry content forward. */
export function backfillMaterialItems<T extends CheckListItem | ReviewElement>(fresh: ReadonlyArray<T>, previous: ReadonlyArray<T>): T[] {
  const oldByKey = new Map<string, T[]>();
  const freshCounts = new Map<string, number>();
  previous.forEach(item => { const key = materialKey(item); oldByKey.set(key, [...(oldByKey.get(key) ?? []), item]); });
  fresh.forEach(item => { const key = materialKey(item); freshCounts.set(key, (freshCounts.get(key) ?? 0) + 1); });
  return fresh.map(item => {
    const key = materialKey(item);
    const matches = oldByKey.get(key);
    if (matches?.length !== 1 || freshCounts.get(key) !== 1) return item;
    const match = matches[0];
    return {
      ...item, entryContent: match.entryContent, deliverables: match.deliverables, entryStatus: match.entryStatus,
      aiCheckStatus: match.entryStatus === 'entered' ? 'in_progress' : 'not_started',
    };
  });
}
