'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type {
  TransferApplication, CheckListItem, ReviewElement, AICheckStatus, BlockTask, LegacyTask, HistoryRecord,
} from '@/types';
import {
  MOCK_APPLICATIONS, MOCK_CHECKLIST_ITEMS, MOCK_REVIEW_ELEMENTS, MOCK_BLOCK_TASKS, MOCK_LEGACY_TASKS, MOCK_HISTORY,
} from '@/mock';
import { useConfiguration } from '@/context/ConfigurationContext';
import { getApplicationRoles, computeRoleEntryStatus, computeRoleReviewStatus } from '@/lib/workflow-roles';
import { generateApplicationMaterials, backfillMaterialItems } from '@/lib/application-materials';

// --- Context ---

type ItemUpdater<T> = (prev: ReadonlyArray<T>) => ReadonlyArray<T>;

interface ApplicationContextValue {
  readonly applications: ReadonlyArray<TransferApplication>;
  readonly checklistItems: ReadonlyArray<CheckListItem>;
  readonly reviewElements: ReadonlyArray<ReviewElement>;
  readonly blockTasks: ReadonlyArray<BlockTask>;
  readonly legacyTasks: ReadonlyArray<LegacyTask>;
  readonly history: ReadonlyArray<HistoryRecord>;
  readonly addApplication: (app: TransferApplication) => void;
  readonly updateApplication: (id: string, updater: (app: TransferApplication) => TransferApplication) => void;
  readonly updateChecklistItems: (updater: ItemUpdater<CheckListItem>) => void;
  readonly updateReviewElements: (updater: ItemUpdater<ReviewElement>) => void;
  readonly updateBlockTasks: (updater: ItemUpdater<BlockTask>) => void;
  readonly updateLegacyTasks: (updater: ItemUpdater<LegacyTask>) => void;
  readonly addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
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
  const { configurations } = useConfiguration();
  const [baseApplications, setBaseApplications] = useState<ReadonlyArray<TransferApplication>>(
    () => [...MOCK_APPLICATIONS],
  );
  const [checklistItems, setChecklistItems] = useState<ReadonlyArray<CheckListItem>>(
    () => [...MOCK_CHECKLIST_ITEMS],
  );
  const [reviewElements, setReviewElements] = useState<ReadonlyArray<ReviewElement>>(
    () => [...MOCK_REVIEW_ELEMENTS],
  );
  const [blockTasks, setBlockTasks] = useState<ReadonlyArray<BlockTask>>(
    () => [...MOCK_BLOCK_TASKS],
  );
  const [legacyTasks, setLegacyTasks] = useState<ReadonlyArray<LegacyTask>>(
    () => [...MOCK_LEGACY_TASKS],
  );
  const [history, setHistory] = useState<ReadonlyArray<HistoryRecord>>(
    () => [...MOCK_HISTORY],
  );

  // Derive applications with synced roleProgress from items (no useEffect needed)
  const applications = useMemo(() =>
    baseApplications.map((app) => {
      if (app.status !== 'in_progress') return app;

      const appItems: ReadonlyArray<CheckListItem | ReviewElement> = [
        ...checklistItems.filter((i) => i.applicationId === app.id),
        ...reviewElements.filter((i) => i.applicationId === app.id),
      ];

      if (appItems.length === 0) return app;
      const newRoleProgress = getApplicationRoles(app).map(({ id: role }) => ({
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
      const anyReviewStarted = appItems.some(item => item.reviewStatus !== 'not_reviewed');
      const newMaintenanceReview = allReviewCompleted
        ? 'success' as const
        : anyReviewStarted ? 'in_progress' as const : app.pipeline.maintenanceReview;

      // Auto-transition: when maintenanceReview becomes success, start maintenanceSpmReview
      const newMaintenanceSpmReview = (newMaintenanceReview === 'success' && app.pipeline.maintenanceSpmReview === 'not_started')
        ? 'in_progress' as const
        : app.pipeline.maintenanceSpmReview;

      // Check if anything actually changed
      const changed = newRoleProgress.length !== app.pipeline.roleProgress.length || newRoleProgress.some((rp, idx) => {
        const old = app.pipeline.roleProgress[idx];
        return !old || old.role !== rp.role || old.entryStatus !== rp.entryStatus || old.reviewStatus !== rp.reviewStatus;
      }) || app.pipeline.dataEntry !== newDataEntry || app.pipeline.maintenanceReview !== newMaintenanceReview || app.pipeline.maintenanceSpmReview !== newMaintenanceSpmReview;

      if (!changed) return app;

      return {
        ...app,
        pipeline: {
          ...app.pipeline,
          roleProgress: newRoleProgress,
          dataEntry: newDataEntry,
          maintenanceReview: newMaintenanceReview,
          maintenanceSpmReview: newMaintenanceSpmReview,
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

  const updateBlockTasks = useCallback((updater: ItemUpdater<BlockTask>) => {
    setBlockTasks(updater);
  }, []);

  const updateLegacyTasks = useCallback((updater: ItemUpdater<LegacyTask>) => {
    setLegacyTasks(updater);
  }, []);

  const addHistoryRecord = useCallback(
    (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
      setHistory((prev) => [
        ...prev,
        {
          ...record,
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const updateApplication = useCallback((id: string, updater: (app: TransferApplication) => TransferApplication) => {
    setBaseApplications((prev) => prev.map((app) => app.id === id ? updater(app) : app));
  }, []);

  const addApplication = useCallback((app: TransferApplication) => {
    const materials = generateApplicationMaterials(app, configurations[app.projectType ?? 'device']);
    setBaseApplications((prev) => [app, ...prev]);
    setChecklistItems((prev) => [...prev, ...materials.checklist]);
    setReviewElements((prev) => [...prev, ...materials.review]);
  }, [configurations]);

  const reopenApplication = useCallback((sourceId: string, newApp: TransferApplication) => {
    const fresh = generateApplicationMaterials(newApp, configurations[newApp.projectType ?? 'device']);
    const checklist = backfillMaterialItems(fresh.checklist, checklistItems.filter(i => i.applicationId === sourceId));
    const review = backfillMaterialItems(fresh.review, reviewElements.filter(i => i.applicationId === sourceId));
    setChecklistItems(prev => [...prev, ...checklist]);
    setReviewElements(prev => [...prev, ...review]);
    setBaseApplications(prev => [newApp, ...prev.map(app => app.id === sourceId ? { ...app, reopenedAsId: newApp.id } : app)]);
    checklist.filter(i => i.aiCheckStatus === 'in_progress').forEach(i => scheduleAutoAiCheck(i.id, setChecklistItems));
    review.filter(i => i.aiCheckStatus === 'in_progress').forEach(i => scheduleAutoAiCheck(i.id, setReviewElements));
  }, [configurations, checklistItems, reviewElements]);

  const value = useMemo(
    () => ({ applications, checklistItems, reviewElements, blockTasks, legacyTasks, history, addApplication, updateApplication, updateChecklistItems, updateReviewElements, updateBlockTasks, updateLegacyTasks, addHistoryRecord, reopenApplication }),
    [applications, checklistItems, reviewElements, blockTasks, legacyTasks, history, addApplication, updateApplication, updateChecklistItems, updateReviewElements, updateBlockTasks, updateLegacyTasks, addHistoryRecord, reopenApplication],
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
