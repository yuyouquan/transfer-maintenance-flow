import type { ProjectTeam, TeamMember } from '@/types';
import type { ProjectConfiguration, ProjectType, TransferRole } from '@/types/config';

export function matchConfiguredMember(members: ReadonlyArray<TeamMember>, role: TransferRole): TeamMember | null {
  return members.find(member => member.ipmRoleCode === role.ipmRoleCode) ?? null;
}

export function validateApplicationTeam(team: ProjectTeam, config: ProjectConfiguration, type: ProjectType): string | undefined {
  const spm = config.roles.find(role => role.isSpm);
  if (!spm) return '请先配置维护SPM角色';
  const rows = [...(config.checklistVersions[0]?.rows ?? []), ...(type === 'device' ? config.reviewVersions[0]?.rows ?? [] : [])];
  if (!rows.length || !config.checklistVersions[0]?.rows.length) return '请先配置 CheckList 模板';
  for (const [axis, roleIds] of [
    ['research', new Set(rows.map(row => row.entryRole))],
    ['maintenance', new Set([spm.id, ...rows.map(row => row.reviewRole)])],
  ] as const) {
    for (const id of roleIds) {
      if (!team[axis].some(member => member.role === id)) {
        return `请选择${axis === 'research' ? '在研' : '维护'}团队的${config.roles.find(role => role.id === id)?.name ?? id}`;
      }
    }
  }
}
