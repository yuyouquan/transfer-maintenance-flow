import { DEFAULT_TRANSFER_ROLES } from '@/types/config';
import type { TemplateRow, TransferConfigurations } from '@/types/config';
import { resolveTemplateRole } from '@/lib/configuration';
import { MOCK_CHECKLIST_TEMPLATES } from './checklist-template';
import { MOCK_REVIEW_ELEMENT_TEMPLATES } from './review-element-template';

function groupLegacyRows(rows: ReadonlyArray<Omit<TemplateRow, 'seq'>>): ReadonlyArray<TemplateRow> {
  const sequences = new Map<string, string>();
  return rows.map(row => {
    if (!sequences.has(row.content)) sequences.set(row.content, `V-${String(sequences.size + 1).padStart(2, '0')}`);
    return { ...row, seq: sequences.get(row.content)!, responsibleRole: resolveTemplateRole(row.responsibleRole, DEFAULT_TRANSFER_ROLES)!, entryRole: resolveTemplateRole(row.entryRole, DEFAULT_TRANSFER_ROLES)!, reviewRole: resolveTemplateRole(row.reviewRole, DEFAULT_TRANSFER_ROLES)! };
  });
}

const checklist = groupLegacyRows(MOCK_CHECKLIST_TEMPLATES.map(row => ({ id: row.id, content: row.checkItem, type: row.type, responsibleRole: row.responsibleRole, entryRole: row.entryRole, reviewRole: row.reviewRole, aiCheckRule: row.aiCheckRule })));
const review = groupLegacyRows(MOCK_REVIEW_ELEMENT_TEMPLATES.map(row => ({ id: row.id, content: row.description, type: row.standard, remark: row.remark, responsibleRole: row.responsibleRole, entryRole: row.entryRole, reviewRole: row.reviewRole, aiCheckRule: row.aiCheckRule })));
const createdAt = '2026-09-28T00:00:00.000Z';

export const MOCK_CONFIGURATIONS: TransferConfigurations = {
  device: { roles: DEFAULT_TRANSFER_ROLES.map(role => ({ ...role })), checklistVersions: [{ id: 'device-checklist-v1', version: 'v1.0', createdAt, rows: checklist }], reviewVersions: [{ id: 'device-review-v1', version: 'v1.0', createdAt, rows: review }] },
  tos: {
    roles: DEFAULT_TRANSFER_ROLES.filter(role => ['SPM', '系统', '测试'].includes(role.id)).map(role => ({ ...role })),
    checklistVersions: [{ id: 'tos-checklist-v1', version: 'v1.0', createdAt, rows: [
      { id: 'tos-cl-001', seq: 'V-01', content: '【演示】tOS版本发布与维护计划已交接', type: '检查项', responsibleRole: 'SPM', entryRole: 'SPM', reviewRole: 'SPM', aiCheckRule: '演示规则：检查维护计划说明是否完整' },
      { id: 'tos-cl-002', seq: 'V-02', content: '【演示】tOS版本分支及构建文档已归档', type: '交接资料', responsibleRole: '系统', entryRole: '系统', reviewRole: '系统', aiCheckRule: '演示规则：检查版本分支与构建文档入口' },
      { id: 'tos-cl-003', seq: 'V-03', content: '【演示】tOS回归测试结论已交接', type: '检查项', responsibleRole: '测试', entryRole: '测试', reviewRole: '测试', aiCheckRule: '演示规则：检查回归测试结论' },
    ] }], reviewVersions: [],
  },
};
