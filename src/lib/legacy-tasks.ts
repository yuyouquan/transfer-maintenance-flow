import type { LegacyTask, TeamMember, TransferApplication } from '@/types';
import { getMaintenanceSpmReviewAccess } from './maintenance-spm-review';

export type LegacyTaskMode = 'detail' | 'review';
export type LegacyTaskStatus = LegacyTask['status'];

export const LEGACY_TASK_STATUS_CONFIG: Record<LegacyTaskStatus, { color: string; label: string }> = {
  open: { color: 'warning', label: '未解决' },
  resolved: { color: 'success', label: '已解决' },
  cancelled: { color: 'default', label: '已取消' },
};

export interface LegacyTaskInput {
  readonly responsiblePersonId: string;
  readonly department: string;
  readonly description: string;
  readonly deadline: string;
}

type ValidatedTaskInput = LegacyTaskInput & { readonly responsiblePerson: string };
type ValidationResult = { readonly values: ValidatedTaskInput; readonly error?: never }
  | { readonly values?: never; readonly error: string };

/** Permissions are scoped to the actual application member, never a global role. */
export function getLegacyTaskAccess(
  application: TransferApplication | undefined,
  user: Pick<TeamMember, 'id' | 'name'>,
  mode: LegacyTaskMode,
  task?: LegacyTask,
) {
  const review = getMaintenanceSpmReviewAccess(application, user.id);
  const canAdd = Boolean(application && (mode === 'detail'
    ? review.isReviewer : mode === 'review' && (review.canApprove || review.canReject)));
  const isApplicationTask = Boolean(application && task?.applicationId === application.id);
  const isOwner = task?.responsiblePersonId
    ? task.responsiblePersonId === user.id : task?.responsiblePerson === user.name;
  return {
    canAdd,
    canEditStatus: canAdd && isApplicationTask,
    canResolve: Boolean(mode === 'detail' && isApplicationTask && isOwner && task?.status === 'open'),
  };
}

export function canChangeLegacyTaskStatus(
  application: TransferApplication | undefined,
  user: Pick<TeamMember, 'id' | 'name'>,
  mode: LegacyTaskMode,
  task: LegacyTask,
  nextStatus: string,
): nextStatus is LegacyTaskStatus {
  if (!Object.hasOwn(LEGACY_TASK_STATUS_CONFIG, nextStatus) || task.status === nextStatus) return false;
  const access = getLegacyTaskAccess(application, user, mode, task);
  return access.canEditStatus || (access.canResolve && nextStatus === 'resolved');
}

export function validateLegacyTaskInput(input: LegacyTaskInput, users: ReadonlyArray<TeamMember>): ValidationResult {
  const responsiblePersonId = (input.responsiblePersonId ?? '').trim();
  const department = (input.department ?? '').trim();
  const description = (input.description ?? '').trim();
  const deadline = (input.deadline ?? '').trim();
  const responsiblePerson = users.find(user => user.id === responsiblePersonId);
  if (!responsiblePerson) return { error: '请选择有效的责任人' };
  if (!department) return { error: '请输入部门' };
  if (!description) return { error: '请输入任务描述' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline.startsWith('0000-')) {
    return { error: '请选择有效的截止日期' };
  }
  const parsedDate = new Date(`${deadline}T00:00:00.000Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== deadline) {
    return { error: '请选择有效的截止日期' };
  }
  return { values: { responsiblePersonId, responsiblePerson: responsiblePerson.name, department, description, deadline } };
}

export function createLegacyTask(
  application: TransferApplication | undefined,
  user: Pick<TeamMember, 'id' | 'name'>,
  mode: LegacyTaskMode,
  input: LegacyTaskInput,
  users: ReadonlyArray<TeamMember>,
  id: string,
  createdAt: string,
): { readonly task?: LegacyTask; readonly error?: string } {
  if (!application || !getLegacyTaskAccess(application, user, mode).canAdd) {
    return { error: '当前用户或申请状态已变化，无法新增遗留任务' };
  }
  const validated = validateLegacyTaskInput(input, users);
  if (validated.error) return { error: validated.error };
  return { task: { ...validated.values!, id, applicationId: application.id, status: 'open', createdAt } };
}

/** Run against the latest task array so stale dialogs cannot change a different or completed task. */
export function updateLegacyTaskStatus(
  tasks: ReadonlyArray<LegacyTask>,
  application: TransferApplication | undefined,
  user: Pick<TeamMember, 'id' | 'name'>,
  mode: LegacyTaskMode,
  taskId: string,
  nextStatus: string,
): { readonly tasks: ReadonlyArray<LegacyTask>; readonly task?: LegacyTask; readonly previousStatus?: LegacyTaskStatus; readonly error?: string } {
  const task = tasks.find(item => item.applicationId === application?.id && item.id === taskId);
  if (!task || !canChangeLegacyTaskStatus(application, user, mode, task, nextStatus)) {
    return { tasks, error: '当前用户、申请或任务状态已变化，无法修改任务状态' };
  }
  const updated: LegacyTask = { ...task, status: nextStatus };
  return {
    tasks: tasks.map(item => item.applicationId === application?.id && item.id === taskId ? updated : item),
    task: updated,
    previousStatus: task.status,
  };
}
