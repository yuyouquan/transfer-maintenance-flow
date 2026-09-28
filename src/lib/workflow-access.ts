import type { CheckListItem, ReviewElement, TransferApplication } from '@/types';
import { getItemRole, getUserRoles } from './workflow-roles';

export function getMaterialActions(app: TransferApplication, items: ReadonlyArray<CheckListItem | ReviewElement>, userId: string) {
  const active = app.status === 'in_progress' && app.pipeline.maintenanceSpmReview !== 'success';
  const ownEntry = getUserRoles(app, 'research', userId);
  const ownReview = getUserRoles(app, 'maintenance', userId);
  const current = items.filter(item => item.applicationId === app.id);
  const canEnter = active && current.some(item =>
    (ownEntry.includes(getItemRole(item, 'entry')) || item.delegatedTo?.includes(userId))
    && (item.reviewStatus === 'not_reviewed' || item.reviewStatus === 'rejected'));
  const canReview = active && current.some(item =>
    (ownReview.includes(getItemRole(item, 'review')) || item.reviewDelegatedTo?.includes(userId))
    && item.entryStatus === 'entered' && item.aiCheckStatus === 'passed'
    && item.reviewStatus === 'reviewing');
  return { canEnter, canReview };
}
