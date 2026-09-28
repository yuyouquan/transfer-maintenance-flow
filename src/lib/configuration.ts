import type { ProjectType, TemplateKind, TemplateRow, TransferConfigurations, TransferRole } from '@/types/config';

const ROLE_FIELDS = ['responsibleRole', 'entryRole', 'reviewRole'] as const;

export function validateTemplateRows(rows: ReadonlyArray<TemplateRow>, roles: ReadonlyArray<TransferRole>, sourceRowNumbers?: ReadonlyArray<number>): ReadonlyArray<TemplateRow> {
  if (!Array.isArray(rows) || !rows.length) throw new Error('模板至少需要一条明细');
  const seqContents = new Map<string, string>();
  const contentSeqs = new Map<string, string>();
  const ids = new Set<string>();
  const roleIds = new Set(roles.map(role => role.id));
  for (const [index, row] of rows.entries()) {
    const location = `第${sourceRowNumbers?.[index] ?? index + 2}行`;
    for (const [key, label] of [['id', '明细ID'], ['seq', '序号'], ['content', '标准／评审要素'], ['type', '类型']] as const) {
      if (typeof row[key] !== 'string' || !row[key].trim()) throw new Error(`${location}：${label}不能为空`);
    }
    if (ids.has(row.id)) throw new Error(`${location}：明细ID重复`);
    ids.add(row.id);
    if (seqContents.has(row.seq) && seqContents.get(row.seq) !== row.content) throw new Error(`${location}：序号「${row.seq}」对应不同标准／评审要素`);
    if (contentSeqs.has(row.content) && contentSeqs.get(row.content) !== row.seq) throw new Error(`${location}：同一标准／评审要素不能对应不同序号`);
    seqContents.set(row.seq, row.content); contentSeqs.set(row.content, row.seq);
    for (const key of ROLE_FIELDS) if (!roleIds.has(row[key])) throw new Error(`${location}：角色「${row[key] || ''}」未在当前项目类型的转维团队中配置`);
    if (typeof row.aiCheckRule !== 'string') throw new Error(`${location}：智能检查规则格式不正确`);
    if (row.remark !== undefined && typeof row.remark !== 'string') throw new Error(`${location}：备注格式不正确`);
  }
  return rows;
}

function currentConfiguration(configurations: TransferConfigurations, projectType: ProjectType) {
  if (projectType !== 'device' && projectType !== 'tos') throw new Error('项目类型不正确');
  return configurations[projectType];
}

export function saveConfigurationRole(configurations: TransferConfigurations, projectType: ProjectType, role: TransferRole): TransferConfigurations {
  const configuration = currentConfiguration(configurations, projectType);
  const existing = configuration.roles.find(item => item.id === role.id);
  if (!role.id?.trim()) throw new Error('角色ID不能为空');
  if (!role.name?.trim()) throw new Error('角色名不能为空');
  if (!role.ipmRoleCode?.trim()) throw new Error('IPM角色Code不能为空');
  if (!!role.isSpm !== !!existing?.isSpm || (role.id === 'SPM' && !existing)) throw new Error('不可更改或伪造系统SPM角色身份');
  const saved = { ...role, name: role.name.trim(), ipmRoleCode: role.ipmRoleCode.trim(), isSpm: existing?.isSpm };
  for (const other of configuration.roles) {
    if (other.id === role.id) continue;
    if (other.name === saved.name) throw new Error('角色名不能重复');
    if (other.ipmRoleCode === saved.ipmRoleCode) throw new Error('IPM角色Code不能重复');
    if (other.id === saved.name || other.name === saved.id) throw new Error('角色名与已有角色ID冲突');
  }
  const roles = existing ? configuration.roles.map(item => item.id === role.id ? saved : item) : [...configuration.roles, saved];
  return { ...configurations, [projectType]: { ...configuration, roles } };
}

export function removeConfigurationRole(configurations: TransferConfigurations, projectType: ProjectType, roleId: string): TransferConfigurations {
  const configuration = currentConfiguration(configurations, projectType);
  const role = configuration.roles.find(item => item.id === roleId);
  if (!role) throw new Error('角色不存在');
  if (role.isSpm || role.id === 'SPM') throw new Error('系统SPM角色不能删除');
  const activeRows = [...(configuration.checklistVersions[0]?.rows ?? []), ...(configuration.reviewVersions[0]?.rows ?? [])];
  if (activeRows.some(row => ROLE_FIELDS.some(field => row[field] === roleId))) throw new Error('角色被当前有效模板引用，请先调整模板');
  return { ...configurations, [projectType]: { ...configuration, roles: configuration.roles.filter(item => item.id !== roleId) } };
}

export function importConfigurationTemplate(configurations: TransferConfigurations, projectType: ProjectType, kind: TemplateKind, rows: ReadonlyArray<TemplateRow>): TransferConfigurations {
  const configuration = currentConfiguration(configurations, projectType);
  if (kind !== 'checklist' && kind !== 'review_element') throw new Error('模板类别不正确');
  if (projectType === 'tos' && kind === 'review_element') throw new Error('tOS版本项目不支持评审要素');
  validateTemplateRows(rows, configuration.roles);
  const key = kind === 'checklist' ? 'checklistVersions' : 'reviewVersions';
  const existing = configuration[key];
  const version = { id: crypto.randomUUID(), version: `v${existing.length + 1}.0`, createdAt: new Date().toISOString(), rows: rows.map(row => ({ ...row })) };
  return { ...configurations, [projectType]: { ...configuration, [key]: [version, ...existing] } };
}

/** Versions reference stable IDs; names follow current configuration, removed historical IDs stay explicit. */
export function roleLabel(roles: ReadonlyArray<TransferRole>, id: string): string {
  return roles.find(role => role.id === id)?.name ?? `${id}（已删除角色）`;
}

export function resolveTemplateRole(value: string, roles: ReadonlyArray<TransferRole>): string | undefined {
  const label = value.trim();
  const direct = roles.find(role => role.name === label || role.id === label);
  if (direct) return direct.id;
  const unprefixed = label.replace(/^(在研|维护)/, '');
  const legacyAliases: Record<string, string> = { TPM: '测试', 底软集成开发代表: '底软', 系统集成开发代表: '系统', 影像开发代表: '影像' };
  const alias = legacyAliases[unprefixed] ?? unprefixed;
  return roles.find(role => role.id === alias || role.name === alias)?.id;
}
