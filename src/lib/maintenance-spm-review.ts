import type { TransferApplication } from '@/types';

/** 工作台入口、待办和审核确认共用同一套责任人及阶段规则。 */
export function getMaintenanceSpmReviewAccess(
  application: TransferApplication | undefined,
  userId: string,
) {
  const reviewer = application?.team.maintenance.find(member => member.role === 'SPM');
  const isReviewer = reviewer?.id === userId;
  const isActive = application?.status === 'in_progress';
  const roleProgress = application?.pipeline.roleProgress ?? [];
  const allRolesPassed = roleProgress.length > 0
    && roleProgress.every(role => role.reviewStatus === 'completed');
  const isFinalReviewOpen = application?.pipeline.maintenanceSpmReview === 'not_started'
    || application?.pipeline.maintenanceSpmReview === 'in_progress';
  const isRejectionMode = isFinalReviewOpen && application?.pipeline.maintenanceReview === 'in_progress'
    && application.pipeline.roleProgress.some(role => role.reviewStatus === 'rejected');
  const isReviewReady = application?.pipeline.maintenanceSpmReview === 'in_progress'
    && allRolesPassed;

  return {
    reviewer,
    isReviewer,
    isRejectionMode,
    canApprove: Boolean(isReviewer && isActive && isReviewReady && !isRejectionMode),
    canReject: Boolean(isReviewer && isActive && (isReviewReady || isRejectionMode)),
  };
}
