'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type {
  TransferApplication, CheckListItem, ReviewElement, TeamMember, PipelineRole, RoleNodeStatus, AICheckStatus,
} from '@/types';
import {
  MOCK_APPLICATIONS, MOCK_CHECKLIST_ITEMS, MOCK_REVIEW_ELEMENTS,
} from '@/mock';
import { MOCK_CHECKLIST_TEMPLATES } from '@/mock/checklist-template';
import { MOCK_REVIEW_ELEMENT_TEMPLATES } from '@/mock/review-element-template';

// --- Role mapping for person assignment ---

const ROLE_TO_TEAM_ROLE: Record<string, string> = {
  SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统', '影像': '影像',
};

function findMemberByPipelineRole(
  members: ReadonlyArray<TeamMember>,
  pipelineRole: PipelineRole,
): TeamMember | undefined {
  const teamRole = ROLE_TO_TEAM_ROLE[pipelineRole];
  return members.find((m) => m.role === teamRole);
}

// --- Generate checklist items from templates ---

function generateChecklistItems(
  applicationId: string,
  research: ReadonlyArray<TeamMember>,
  maintenance: ReadonlyArray<TeamMember>,
): ReadonlyArray<CheckListItem> {
  return MOCK_CHECKLIST_TEMPLATES.map((tpl, idx) => {
    const entryPerson = findMemberByPipelineRole(research, tpl.responsibleRole);
    const reviewPerson = findMemberByPipelineRole(maintenance, tpl.responsibleRole);
    return {
      id: `${applicationId}-cli-${String(idx + 1).padStart(3, '0')}`,
      applicationId,
      seq: idx + 1,
      type: tpl.type,
      checkItem: tpl.checkItem,
      responsibleRole: tpl.responsibleRole,
      entryPerson: entryPerson?.name ?? '-',
      entryPersonId: entryPerson?.id ?? '',
      reviewPerson: reviewPerson?.name ?? '-',
      reviewPersonId: reviewPerson?.id ?? '',
      aiCheckRule: tpl.aiCheckRule,
      deliverables: [],
      entryStatus: 'not_entered' as const,
      aiCheckStatus: 'not_started' as const,
      reviewStatus: 'not_reviewed' as const,
    };
  });
}

// --- Generate review elements from templates ---

function generateReviewElements(
  applicationId: string,
  research: ReadonlyArray<TeamMember>,
  maintenance: ReadonlyArray<TeamMember>,
): ReadonlyArray<ReviewElement> {
  return MOCK_REVIEW_ELEMENT_TEMPLATES.map((tpl, idx) => {
    const role = tpl.responsibleRole as PipelineRole;
    const entryPerson = findMemberByPipelineRole(research, role);
    const reviewPerson = findMemberByPipelineRole(maintenance, role);
    return {
      id: `${applicationId}-rei-${String(idx + 1).padStart(3, '0')}`,
      applicationId,
      seq: idx + 1,
      standard: tpl.standard,
      description: tpl.description,
      remark: tpl.remark,
      responsibleRole: role,
      entryPerson: entryPerson?.name ?? '-',
      entryPersonId: entryPerson?.id ?? '',
      reviewPerson: reviewPerson?.name ?? '-',
      reviewPersonId: reviewPerson?.id ?? '',
      aiCheckRule: tpl.aiCheckRule,
      deliverables: [],
      entryStatus: 'not_entered' as const,
      aiCheckStatus: 'not_started' as const,
      reviewStatus: 'not_reviewed' as const,
    };
  });
}

// --- Compute roleProgress from items ---

const PIPELINE_ROLES: ReadonlyArray<PipelineRole> = ['SPM', '测试', '底软', '系统', '影像'];

function computeRoleEntryStatus(
  items: ReadonlyArray<CheckListItem | ReviewElement>,
  role: PipelineRole,
): RoleNodeStatus {
  const roleItems = items.filter((i) => i.responsibleRole === role);
  if (roleItems.length === 0) return 'not_started';

  const anyEntered = roleItems.some(
    (i) => i.entryStatus === 'draft' || i.entryStatus === 'entered',
  );
  const allEnteredAndPassed = roleItems.every(
    (i) => i.entryStatus === 'entered' && i.aiCheckStatus === 'passed',
  );

  if (allEnteredAndPassed) return 'completed';
  if (anyEntered) return 'in_progress';
  return 'not_started';
}

function computeRoleReviewStatus(
  items: ReadonlyArray<CheckListItem | ReviewElement>,
  role: PipelineRole,
): RoleNodeStatus {
  const roleItems = items.filter((i) => i.responsibleRole === role);
  if (roleItems.length === 0) return 'not_started';

  const anyReviewing = roleItems.some((i) => i.reviewStatus === 'reviewing');
  const anyReviewed = roleItems.some(
    (i) => i.reviewStatus === 'passed' || i.reviewStatus === 'rejected',
  );
  const allPassed = roleItems.every((i) => i.reviewStatus === 'passed');
  const anyRejected = roleItems.some((i) => i.reviewStatus === 'rejected');

  if (allPassed) return 'completed';
  if (anyRejected) return 'rejected';
  if (anyReviewed || anyReviewing) return 'in_progress';
  return 'not_started';
}

// --- Context ---

type ItemUpdater<T> = (prev: ReadonlyArray<T>) => ReadonlyArray<T>;

interface ApplicationContextValue {
  readonly applications: ReadonlyArray<TransferApplication>;
  readonly checklistItems: ReadonlyArray<CheckListItem>;
  readonly reviewElements: ReadonlyArray<ReviewElement>;
  readonly addApplication: (app: TransferApplication) => void;
  readonly updateApplication: (id: string, updater: (app: TransferApplication) => TransferApplication) => void;
  readonly updateChecklistItems: (updater: ItemUpdater<CheckListItem>) => void;
  readonly updateReviewElements: (updater: ItemUpdater<ReviewElement>) => void;
  readonly reopenApplication: (sourceId: string, newApp: TransferApplication) => void;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

// --- Simulate AI check on auto-triggered items (reopen flow) ---
// Mirrors entry page simulateAiCheck: 1-2s delay, 90% pass / 10% fail, silent (no toast).
function scheduleAutoAiCheck<T extends CheckListItem | ReviewElement>(
  itemId: string,
  setter: React.Dispatch<React.SetStateAction<ReadonlyArray<T>>>,
): void {
  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    const passed = Math.random() > 0.1;
    const aiCheckStatus: AICheckStatus = passed ? 'passed' : 'failed';
    const aiCheckResult = passed
      ? 'AI检查通过，内容符合要求。'
      : 'AI检查不通过，请检查内容是否完整或链接是否有效。';
    setter((prev) =>
      prev.map((item) =>
        item.id === itemId ? ({ ...item, aiCheckStatus, aiCheckResult } as T) : item,
      ),
    );
  }, delay);
}

export function ApplicationProvider({ children }: { readonly children: React.ReactNode }) {
  const [baseApplications, setBaseApplications] = useState<ReadonlyArray<TransferApplication>>(
    () => [...MOCK_APPLICATIONS],
  );
  const [checklistItems, setChecklistItems] = useState<ReadonlyArray<CheckListItem>>(
    () => [...MOCK_CHECKLIST_ITEMS],
  );
  const [reviewElements, setReviewElements] = useState<ReadonlyArray<ReviewElement>>(
    () => [...MOCK_REVIEW_ELEMENTS],
  );

  // Derive applications with synced roleProgress from items (no useEffect needed)
  const applications = useMemo(() =>
    baseApplications.map((app) => {
      if (app.status !== 'in_progress') return app;

      const appItems: ReadonlyArray<CheckListItem | ReviewElement> = [
        ...checklistItems.filter((i) => i.applicationId === app.id),
        ...reviewElements.filter((i) => i.applicationId === app.id),
      ];

      const newRoleProgress = PIPELINE_ROLES.map((role) => ({
        role,
        entryStatus: computeRoleEntryStatus(appItems, role),
        reviewStatus: computeRoleReviewStatus(appItems, role),
      }));

      // Derive main pipeline node statuses from roleProgress
      const allEntryCompleted = newRoleProgress.every((rp) => rp.entryStatus === 'completed');
      const anyEntryStarted = newRoleProgress.some(
        (rp) => rp.entryStatus === 'in_progress' || rp.entryStatus === 'completed',
      );
      const newDataEntry = allEntryCompleted
        ? 'success' as const
        : anyEntryStarted ? 'in_progress' as const : app.pipeline.dataEntry;

      const allReviewCompleted = newRoleProgress.every((rp) => rp.reviewStatus === 'completed');
      const anyReviewStarted = newRoleProgress.some(
        (rp) => rp.reviewStatus === 'in_progress' || rp.reviewStatus === 'completed' || rp.reviewStatus === 'rejected',
      );
      const newMaintenanceReview = allReviewCompleted
        ? 'success' as const
        : anyReviewStarted ? 'in_progress' as const : app.pipeline.maintenanceReview;

      // Auto-transition: when maintenanceReview becomes success, start sqaReview
      const newSqaReview = (newMaintenanceReview === 'success' && app.pipeline.sqaReview === 'not_started')
        ? 'in_progress' as const
        : app.pipeline.sqaReview;

      // Check if anything actually changed
      const changed = newRoleProgress.some((rp, idx) => {
        const old = app.pipeline.roleProgress[idx];
        return !old || old.entryStatus !== rp.entryStatus || old.reviewStatus !== rp.reviewStatus;
      }) || app.pipeline.dataEntry !== newDataEntry || app.pipeline.maintenanceReview !== newMaintenanceReview || app.pipeline.sqaReview !== newSqaReview;

      if (!changed) return app;

      return {
        ...app,
        pipeline: {
          ...app.pipeline,
          roleProgress: newRoleProgress,
          dataEntry: newDataEntry,
          maintenanceReview: newMaintenanceReview,
          sqaReview: newSqaReview,
        },
      };
    }),
  [baseApplications, checklistItems, reviewElements]);

  const updateChecklistItems = useCallback((updater: ItemUpdater<CheckListItem>) => {
    setChecklistItems(updater);
  }, []);

  const updateReviewElements = useCallback((updater: ItemUpdater<ReviewElement>) => {
    setReviewElements(updater);
  }, []);

  const updateApplication = useCallback((id: string, updater: (app: TransferApplication) => TransferApplication) => {
    setBaseApplications((prev) => prev.map((app) => app.id === id ? updater(app) : app));
  }, []);

  const addApplication = useCallback((app: TransferApplication) => {
    setBaseApplications((prev) => [app, ...prev]);

    const newChecklistItems = generateChecklistItems(
      app.id, app.team.research, app.team.maintenance,
    );
    const newReviewElements = generateReviewElements(
      app.id, app.team.research, app.team.maintenance,
    );

    setChecklistItems((prev) => [...prev, ...newChecklistItems]);
    setReviewElements((prev) => [...prev, ...newReviewElements]);
  }, []);

  const reopenApplication = useCallback((sourceId: string, newApp: TransferApplication) => {
    // Generate fresh items from the latest templates for the new application.
    const freshChecklist = generateChecklistItems(
      newApp.id, newApp.team.research, newApp.team.maintenance,
    );
    const freshReviewElements = generateReviewElements(
      newApp.id, newApp.team.research, newApp.team.maintenance,
    );

    // Backfill previously-entered content keyed by business fields, so that template
    // additions/removals are honored while preserving the user's inputs where possible.
    let checklistAutoCheckIds: string[] = [];
    setChecklistItems((prev) => {
      const sourceItems = prev.filter((i) => i.applicationId === sourceId);
      const sourceByKey = new Map(
        sourceItems.map((i) => [`${i.type}::${i.checkItem}::${i.responsibleRole}`, i]),
      );
      const localIds: string[] = [];
      const backfilled = freshChecklist.map((item) => {
        const match = sourceByKey.get(`${item.type}::${item.checkItem}::${item.responsibleRole}`);
        if (!match) return item;
        const shouldAutoCheck = match.entryStatus === 'entered';
        if (shouldAutoCheck) localIds.push(item.id);
        return {
          ...item,
          entryContent: match.entryContent,
          deliverables: match.deliverables,
          entryStatus: match.entryStatus,
          aiCheckStatus: shouldAutoCheck ? ('in_progress' as const) : item.aiCheckStatus,
          aiCheckResult: shouldAutoCheck ? undefined : item.aiCheckResult,
        };
      });
      checklistAutoCheckIds = localIds;
      return [...prev, ...backfilled];
    });

    let reviewAutoCheckIds: string[] = [];
    setReviewElements((prev) => {
      const sourceItems = prev.filter((i) => i.applicationId === sourceId);
      const sourceByKey = new Map(
        sourceItems.map((i) => [`${i.standard}::${i.responsibleRole}`, i]),
      );
      const localIds: string[] = [];
      const backfilled = freshReviewElements.map((item) => {
        const match = sourceByKey.get(`${item.standard}::${item.responsibleRole}`);
        if (!match) return item;
        const shouldAutoCheck = match.entryStatus === 'entered';
        if (shouldAutoCheck) localIds.push(item.id);
        return {
          ...item,
          entryContent: match.entryContent,
          deliverables: match.deliverables,
          entryStatus: match.entryStatus,
          aiCheckStatus: shouldAutoCheck ? ('in_progress' as const) : item.aiCheckStatus,
          aiCheckResult: shouldAutoCheck ? undefined : item.aiCheckResult,
        };
      });
      reviewAutoCheckIds = localIds;
      return [...prev, ...backfilled];
    });

    setBaseApplications((prev) => [
      newApp,
      ...prev.map((app) =>
        app.id === sourceId ? { ...app, reopenedAsId: newApp.id } : app,
      ),
    ]);

    checklistAutoCheckIds.forEach((id) => scheduleAutoAiCheck(id, setChecklistItems));
    reviewAutoCheckIds.forEach((id) => scheduleAutoAiCheck(id, setReviewElements));
  }, []);

  const value = useMemo(
    () => ({ applications, checklistItems, reviewElements, addApplication, updateApplication, updateChecklistItems, updateReviewElements, reopenApplication }),
    [applications, checklistItems, reviewElements, addApplication, updateApplication, updateChecklistItems, updateReviewElements, reopenApplication],
  );

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplications(): ApplicationContextValue {
  const ctx = useContext(ApplicationContext);
  if (!ctx) {
    throw new Error('useApplications must be used within ApplicationProvider');
  }
  return ctx;
}
