import type { CheckListItem, ReviewElement, RoleNodeStatus, TeamType, TransferApplication } from '@/types';
import { DEFAULT_TRANSFER_ROLES } from '@/types/config';

type ApplicationTeam = Pick<TransferApplication, 'team' | 'roles'>;
type Material = CheckListItem | ReviewElement;

export function getApplicationRoles(app: Pick<TransferApplication, 'roles'> | undefined) {
  return app?.roles ?? DEFAULT_TRANSFER_ROLES;
}

export function findRoleMember(app: ApplicationTeam | undefined, team: TeamType, roleId: string) {
  const legacyId = !app?.roles && roleId === '测试' ? 'TPM' : roleId;
  return app?.team[team].find(member => member.role === legacyId);
}

export function getSpmMember(app: ApplicationTeam | undefined, team: TeamType) {
  const role = getApplicationRoles(app).find(candidate => candidate.isSpm);
  return role ? findRoleMember(app, team, role.id) : undefined;
}

export function getUserRoles(app: ApplicationTeam | undefined, team: TeamType, userId: string) {
  return getApplicationRoles(app).filter(role => findRoleMember(app, team, role.id)?.id === userId).map(role => role.id);
}

export function getRoleName(app: Pick<TransferApplication, 'roles'> | undefined, roleId: string) {
  return getApplicationRoles(app).find(role => role.id === roleId)?.name ?? roleId;
}

export function getItemRole(item: Material, axis: 'entry' | 'review'): string {
  return (axis === 'entry' ? item.entryRoleId : item.reviewRoleId) ?? item.responsibleRole;
}

export function computeRoleEntryStatus(items: ReadonlyArray<Material>, role: string): RoleNodeStatus {
  const roleItems = items.filter(item => getItemRole(item, 'entry') === role);
  if (!roleItems.length) return 'completed';
  if (roleItems.some(item => item.reviewStatus === 'rejected')) return 'rejected';
  if (roleItems.every(item => item.entryStatus === 'entered' && item.aiCheckStatus === 'passed')) return 'completed';
  return roleItems.some(item => item.entryStatus === 'draft' || item.entryStatus === 'entered') ? 'in_progress' : 'not_started';
}

export function computeRoleReviewStatus(items: ReadonlyArray<Material>, role: string): RoleNodeStatus {
  const roleItems = items.filter(item => getItemRole(item, 'review') === role);
  if (!roleItems.length) return 'completed';
  if (roleItems.some(item => item.reviewStatus === 'rejected')) return 'rejected';
  if (roleItems.every(item => item.reviewStatus === 'passed')) return 'completed';
  return roleItems.some(item => item.reviewStatus === 'reviewing' || item.reviewStatus === 'passed') ? 'in_progress' : 'not_started';
}
