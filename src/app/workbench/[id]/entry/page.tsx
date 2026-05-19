'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table, Button, Tag, Tabs, Modal, Input, Space, Alert, message, Tooltip, Segmented, Collapse, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, UploadOutlined, DownloadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, LoadingOutlined,
} from '@ant-design/icons';
import EntryContentRenderer from '@/components/shared/EntryContentRenderer';
import { useColumnSearch } from '@/components/shared/useColumnSearch';
import DelegateModal from '@/components/shared/DelegateModal';
import { useRouter } from 'next/navigation';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import { MOCK_USERS } from '@/mock';
import { useApplications } from '@/context/ApplicationContext';
import type {
  CheckListItem, ReviewElement, EntryStatus, AICheckStatus, ReviewStatus, PipelineRole,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { useCurrentUser } from '@/context/UserContext';

// Map team role to checklist responsibleRole
const TEAM_ROLE_TO_RESPONSIBLE: Record<string, string> = {
  SPM: 'SPM',
  TPM: '测试',
  '底软': '底软',
  '系统': '系统',
  '影像': '影像',
};

const { TextArea } = Input;

// --- Status rendering helpers ---

const ENTRY_STATUS_MAP: Record<EntryStatus, { label: string; color: string }> = {
  not_entered: { label: '未录入', color: 'default' },
  draft: { label: '暂存', color: 'orange' },
  entered: { label: '已录入', color: 'green' },
};

const AI_CHECK_STATUS_MAP: Record<AICheckStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: '未开始', color: 'default', icon: <ClockCircleOutlined /> },
  in_progress: { label: '检查中', color: 'processing', icon: <LoadingOutlined /> },
  passed: { label: '通过', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { label: '不通过', color: 'error', icon: <ExclamationCircleOutlined /> },
};

const REVIEW_STATUS_MAP: Record<ReviewStatus, { label: string; color: string }> = {
  not_reviewed: { label: '未审核', color: 'default' },
  reviewing: { label: '审核中', color: 'processing' },
  passed: { label: '通过', color: 'success' },
  rejected: { label: '不通过', color: 'error' },
};

// --- Main Page Component ---

export default function DataEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const {
    applications, checklistItems: allCtxChecklist, reviewElements: allCtxReview,
    blockTasks: allCtxBlockTasks,
    updateChecklistItems, updateReviewElements, updateBlockTasks, addHistoryRecord,
  } = useApplications();

  // Find application from context
  const application = useMemo(
    () => applications.find((a) => a.id === id),
    [applications, id],
  );

  // Determine ALL responsible roles for the current user in research team
  const userResponsibleRoles = useMemo<PipelineRole[]>(() => {
    if (!application) return [];
    const roles = application.team.research
      .filter((m) => m.id === currentUser.id)
      .map((m) => TEAM_ROLE_TO_RESPONSIBLE[m.role])
      .filter((r): r is string => r != null) as PipelineRole[];
    return [...new Set(roles)];
  }, [application, currentUser.id]);

  // Active role state — for role switching when user has multiple roles
  // Initialize to first role, sync when roles change via controlled state
  const [activeRole, setActiveRole] = useState<PipelineRole | null>(null);

  const effectiveRole = useMemo(() => {
    if (activeRole && userResponsibleRoles.includes(activeRole)) return activeRole;
    return userResponsibleRoles[0] ?? null;
  }, [activeRole, userResponsibleRoles]);

  // Derived from context
  const checklistItems = useMemo(
    () => allCtxChecklist.filter((item) => item.applicationId === id),
    [allCtxChecklist, id],
  );
  const reviewElements = useMemo(
    () => allCtxReview.filter((item) => item.applicationId === id),
    [allCtxReview, id],
  );

  // Wrappers to update context directly
  const setChecklistItems = useCallback(
    (updater: (prev: ReadonlyArray<CheckListItem>) => ReadonlyArray<CheckListItem>) => {
      updateChecklistItems((all) => {
        const others = all.filter((i) => i.applicationId !== id);
        const current = all.filter((i) => i.applicationId === id);
        return [...others, ...updater(current)];
      });
    },
    [updateChecklistItems, id],
  );
  const setReviewElements = useCallback(
    (updater: (prev: ReadonlyArray<ReviewElement>) => ReadonlyArray<ReviewElement>) => {
      updateReviewElements((all) => {
        const others = all.filter((i) => i.applicationId !== id);
        const current = all.filter((i) => i.applicationId === id);
        return [...others, ...updater(current)];
      });
    },
    [updateReviewElements, id],
  );

  // --- Own role items (items belonging to effectiveRole) ---

  const ownRoleChecklist = useMemo(
    () => checklistItems.filter((item) => item.responsibleRole === effectiveRole),
    [checklistItems, effectiveRole],
  );
  const ownRoleReviewElements = useMemo(
    () => reviewElements.filter((item) => item.responsibleRole === effectiveRole),
    [reviewElements, effectiveRole],
  );

  // --- 跨角色被委派给当前用户的项(用于顶部「委派给我的」Collapse) ---
  const delegatedChecklistForMe = useMemo(
    () => checklistItems.filter((i) => i.delegatedTo?.includes(currentUser.id)),
    [checklistItems, currentUser.id],
  );

  const delegatedReviewElementsForMe = useMemo(
    () => reviewElements.filter((i) => i.delegatedTo?.includes(currentUser.id)),
    [reviewElements, currentUser.id],
  );

  const hasDelegatedItems
    = delegatedChecklistForMe.length > 0 || delegatedReviewElementsForMe.length > 0;

  const canAccessPage = userResponsibleRoles.length > 0 || hasDelegatedItems;

  // Block tasks for current role (open only) — driven by context so they update on resolve
  const blockTasks = useMemo(
    () => allCtxBlockTasks.filter(
      (t) => t.applicationId === id
        && t.responsibleRole === effectiveRole
        && t.status === 'open',
    ),
    [allCtxBlockTasks, id, effectiveRole],
  );


  // Tab
  const [activeTab, setActiveTab] = useState<string>('checklist');

  // Selection
  const [selectedChecklistKeys, setSelectedChecklistKeys] = useState<React.Key[]>([]);
  const [selectedReviewKeys, setSelectedReviewKeys] = useState<React.Key[]>([]);

  // Entry modal
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryModalTarget, setEntryModalTarget] = useState<{ id: string; tab: 'checklist' | 'review' } | null>(null);
  const [entryContent, setEntryContent] = useState('');

  // Delegate modal - single select, reassign entry person
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<{ ids: ReadonlyArray<string>; tab: 'checklist' | 'review' } | null>(null);
  const [delegateCurrentAssignee, setDelegateCurrentAssignee] = useState<string | null>(null);
  // AI check detail modal
  const [aiDetailModalVisible, setAiDetailModalVisible] = useState(false);
  const [aiDetailContent, setAiDetailContent] = useState('');


  // --- canSubmitReview: only checks own role items for effectiveRole ---

  const isItemReady = (item: { entryStatus: EntryStatus; aiCheckStatus: AICheckStatus }) =>
    item.entryStatus === 'entered' && item.aiCheckStatus === 'passed';

  const pendingChecklistCount = useMemo(
    () => ownRoleChecklist.filter((i) => !isItemReady(i)).length,
    [ownRoleChecklist],
  );
  const pendingReviewCount = useMemo(
    () => ownRoleReviewElements.filter((i) => !isItemReady(i)).length,
    [ownRoleReviewElements],
  );

  const canSubmitReview = useMemo(() => {
    if (!effectiveRole) return false;
    const hasAny = ownRoleChecklist.length > 0 || ownRoleReviewElements.length > 0;
    return hasAny && pendingChecklistCount === 0 && pendingReviewCount === 0;
  }, [effectiveRole, ownRoleChecklist.length, ownRoleReviewElements.length, pendingChecklistCount, pendingReviewCount]);

  const submitTooltip = useMemo(() => {
    if (!effectiveRole) return '';
    if (canSubmitReview) {
      return `「${effectiveRole}」角色所有录入项已通过AI检查，可以提交审核`;
    }
    if (ownRoleChecklist.length === 0 && ownRoleReviewElements.length === 0) {
      return `「${effectiveRole}」角色没有任何待录入条目`;
    }
    const parts: string[] = [];
    if (pendingChecklistCount > 0) parts.push(`转维材料 ${pendingChecklistCount} 项`);
    if (pendingReviewCount > 0) parts.push(`评审要素 ${pendingReviewCount} 项`);
    return `还有未完成项：${parts.join('、')}（需录入并通过AI检查）`;
  }, [effectiveRole, canSubmitReview, ownRoleChecklist.length, ownRoleReviewElements.length, pendingChecklistCount, pendingReviewCount]);

  // --- Has rejected items (own role, show block alert) ---

  const hasRejectedItems = useMemo(
    () => ownRoleChecklist.some((i) => i.reviewStatus === 'rejected')
      || ownRoleReviewElements.some((i) => i.reviewStatus === 'rejected'),
    [ownRoleChecklist, ownRoleReviewElements],
  );

  // 角色级驳回评审意见：同一次驳回事件下所有被驳回项 reviewComment 一致，取首个非空即可
  const roleReviewComment = useMemo(() => {
    const all = [...ownRoleChecklist, ...ownRoleReviewElements];
    const rejected = all.find((i) => i.reviewStatus === 'rejected' && i.reviewComment);
    return rejected?.reviewComment ?? '';
  }, [ownRoleChecklist, ownRoleReviewElements]);

  // --- Entry modal handlers ---

  const openEntryModal = useCallback((itemId: string, tab: 'checklist' | 'review') => {
    const items = tab === 'checklist' ? checklistItems : reviewElements;
    const item = items.find((i) => i.id === itemId);
    setEntryContent(item?.entryContent ?? '');
    setEntryModalTarget({ id: itemId, tab });
    setEntryModalVisible(true);
  }, [checklistItems, reviewElements]);

  // 模拟AI检查完成：1-2秒后自动判定 passed 或 failed
  const simulateAiCheck = useCallback((itemId: string, tab: 'checklist' | 'review') => {
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      // 90% 通过, 10% 失败
      const passed = Math.random() > 0.1;
      const result: AICheckStatus = passed ? 'passed' : 'failed';
      const aiResult = passed
        ? 'AI检查通过，内容符合要求。'
        : 'AI检查不通过，请检查内容是否完整或链接是否有效。';

      const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T =>
        item.id === itemId ? { ...item, aiCheckStatus: result, aiCheckResult: aiResult } as T : item;

      if (tab === 'checklist') {
        setChecklistItems((prev) => prev.map(updateItem));
      } else {
        setReviewElements((prev) => prev.map(updateItem));
      }

      if (passed) {
        message.success('AI检查通过');
      } else {
        message.error('AI检查不通过，请修改后重新提交');
      }
    }, delay);
  }, [setChecklistItems, setReviewElements]);

  const handleEntrySave = useCallback((mode: 'draft' | 'confirm') => {
    if (!entryModalTarget) return;
    if (!entryContent.trim()) {
      message.warning('请输入内容');
      return;
    }

    const newEntryStatus: EntryStatus = mode === 'draft' ? 'draft' : 'entered';
    const newAiCheckStatus: AICheckStatus = mode === 'confirm' ? 'in_progress' : 'not_started';

    // 若该项之前被维护审核驳回，重新录入后回到「待审核」状态，
    // 同时清掉旧的评审意见，避免对新内容产生误导。
    const resetReviewIfRejected = <T extends { reviewStatus: ReviewStatus; reviewComment?: string }>(
      item: T,
    ): T => (
      item.reviewStatus === 'rejected'
        ? { ...item, reviewStatus: 'not_reviewed' as const, reviewComment: undefined }
        : item
    );

    if (entryModalTarget.tab === 'checklist') {
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === entryModalTarget.id
            ? resetReviewIfRejected({ ...item, entryContent, entryStatus: newEntryStatus, aiCheckStatus: newAiCheckStatus, aiCheckResult: undefined })
            : item,
        ),
      );
    } else {
      setReviewElements((prev) =>
        prev.map((item) =>
          item.id === entryModalTarget.id
            ? resetReviewIfRejected({ ...item, entryContent, entryStatus: newEntryStatus, aiCheckStatus: newAiCheckStatus, aiCheckResult: undefined })
            : item,
        ),
      );
    }

    // 确认模式下触发模拟AI检查
    if (mode === 'confirm') {
      simulateAiCheck(entryModalTarget.id, entryModalTarget.tab);
    }

    setEntryModalVisible(false);
    setEntryModalTarget(null);
    setEntryContent('');

    if (mode === 'draft') {
      message.success('已暂存');
    } else {
      message.success('已确认提交，AI检查进行中...');
    }
  }, [entryModalTarget, entryContent, setChecklistItems, setReviewElements, simulateAiCheck]);

  // --- Delegate modal handlers ---

  const openDelegateModal = useCallback(
    (ids: ReadonlyArray<string>, tab: 'checklist' | 'review') => {
      // 单条委派且该条已有 delegatedTo 时,回填以支持「转委派」展示
      let current: string | null = null;
      if (ids.length === 1) {
        const item = tab === 'checklist'
          ? checklistItems.find((i) => i.id === ids[0])
          : reviewElements.find((i) => i.id === ids[0]);
        current = item?.delegatedTo?.[0] ?? null;
      }
      setDelegateTarget({ ids, tab });
      setDelegateCurrentAssignee(current);
      setDelegateModalVisible(true);
    },
    [checklistItems, reviewElements],
  );

  const handleDelegateConfirm = useCallback((toUserId: string | null) => {
    if (!delegateTarget) return;

    // 录入页传 allowClear={false},DelegateModal 不会回传 null;
    // 保留这条防御性兜底,行为是直接忽略以维持类型签名。
    if (!toUserId) return;

    const targetUser = MOCK_USERS.find((u) => u.id === toUserId);
    if (!targetUser) return;

    const idSet = new Set(delegateTarget.ids);
    const updateItem = <T extends CheckListItem | ReviewElement>(item: T): T => {
      if (!idSet.has(item.id)) return item;
      // 单人替换式: delegatedTo 始终为新被委派人;不再修改 entryPerson/entryPersonId
      return {
        ...item,
        delegatedTo: [targetUser.id],
      };
    };

    if (delegateTarget.tab === 'checklist') {
      setChecklistItems((prev) => prev.map(updateItem));
    } else {
      setReviewElements((prev) => prev.map(updateItem));
    }

    setDelegateModalVisible(false);
    setDelegateTarget(null);
    setDelegateCurrentAssignee(null);
    message.success(`已委派给 ${targetUser.name}`);
  }, [delegateTarget, setChecklistItems, setReviewElements]);

  // --- Submit review (per active role) ---

  const handleSubmitReview = useCallback(() => {
    if (!effectiveRole) return;

    // 二次校验：确认所有 items 都已 entered + passed
    const roleClItems = checklistItems.filter((i) => i.responsibleRole === effectiveRole);
    const roleReItems = reviewElements.filter((i) => i.responsibleRole === effectiveRole);
    const allItems = [...roleClItems, ...roleReItems];
    const allReady = allItems.length > 0 && allItems.every(
      (i) => i.entryStatus === 'entered' && i.aiCheckStatus === 'passed',
    );
    if (!allReady) {
      message.warning('仍有未完成录入或AI检查未通过的条目，请先完成所有录入');
      return;
    }

    // 是否为驳回后的二次提交：决定弹窗文案和是否需要解决 Block 任务
    const isResubmission = hasRejectedItems;
    const openBlockCount = allCtxBlockTasks.filter(
      (t) => t.applicationId === id
        && t.responsibleRole === effectiveRole
        && t.status === 'open',
    ).length;

    Modal.confirm({
      title: isResubmission ? '确认 Block 任务已解决' : '确认提交审核',
      content: isResubmission
        ? (
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>
              「{effectiveRole}」角色当前共有 <strong style={{ color: '#ff4d4f' }}>{openBlockCount}</strong> 项未关闭的 Block 任务。
            </div>
            <div style={{ marginTop: 6 }}>
              点击确认提交后，这些 Block 任务会被标记为「已解决」，资料进入维护审核阶段。
            </div>
            <div style={{ marginTop: 6, color: '#666' }}>
              请确保所有 Block 问题都已实际处理完毕，否则维护审核仍可能再次驳回。
            </div>
          </div>
        )
        : `提交后「${effectiveRole}」角色将完成资料录入，进入维护审核阶段，确认提交？`,
      okText: isResubmission ? '确认已解决并提交' : '确认提交',
      cancelText: '取消',
      onOk: () => {
        setChecklistItems((prev) =>
          prev.map((item) =>
            item.responsibleRole === effectiveRole
              ? { ...item, reviewStatus: 'reviewing' as const }
              : item,
          ),
        );
        setReviewElements((prev) =>
          prev.map((item) =>
            item.responsibleRole === effectiveRole
              ? { ...item, reviewStatus: 'reviewing' as const }
              : item,
          ),
        );

        // 二次提交：把当前角色下所有 open 的 Block 任务转为 resolved
        if (isResubmission) {
          updateBlockTasks((prev) =>
            prev.map((bt) =>
              bt.applicationId === id
              && bt.responsibleRole === effectiveRole
              && bt.status === 'open'
                ? { ...bt, status: 'resolved' as const }
                : bt,
            ),
          );
        }

        addHistoryRecord({
          applicationId: id,
          action: `${effectiveRole} 资料录入与AI检查完毕`,
          operator: currentUser.name,
          detail: isResubmission
            ? `${effectiveRole} 角色按驳回意见修改资料，重新通过 AI 检查并提交维护审核（${openBlockCount} 项 Block 任务标记为已解决）`
            : `${effectiveRole} 角色资料全部录入并通过 AI 检查，已提交维护审核`,
        });

        message.success(
          isResubmission
            ? `「${effectiveRole}」角色已提交维护审核，${openBlockCount} 项 Block 任务标记为已解决`
            : `「${effectiveRole}」角色已提交维护审核`,
        );
        router.push(`/workbench/${id}`);
      },
    });
  }, [effectiveRole, router, id, setChecklistItems, setReviewElements, checklistItems, reviewElements, hasRejectedItems, allCtxBlockTasks, updateBlockTasks, addHistoryRecord, currentUser.name]);

  // --- AI check detail ---

  const showAiCheckDetail = useCallback((item: CheckListItem | ReviewElement) => {
    if (item.aiCheckStatus === 'not_started') return;
    const detail = item.aiCheckResult
      ?? (item.aiCheckStatus === 'passed' ? 'AI检查通过，内容符合要求。' : 'AI检查进行中...');
    setAiDetailContent(detail);
    setAiDetailModalVisible(true);
  }, []);

  // --- Column search ---
  const { getColumnSearchProps: getClSearchProps } = useColumnSearch<CheckListItem>();
  const { getColumnSearchProps: getReSearchProps } = useColumnSearch<ReviewElement>();

  // --- Table columns for checklist ---

  const checklistColumns: ColumnsType<CheckListItem> = useMemo(() => [
    {
      title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center',
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
    },
    {
      title: '评审要素', dataIndex: 'checkItem', key: 'checkItem', width: 260,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      ...getClSearchProps('checkItem'),
    },
    {
      title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center',
    },
    {
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 140, align: 'center',
      render: (text: string, record: CheckListItem) => {
        const delegatee = record.delegatedTo?.[0];
        const delegateeName = delegatee
          ? MOCK_USERS.find((u) => u.id === delegatee)?.name
          : null;
        return (
          <Space size={4} wrap>
            <span>{text}</span>
            {record.delegatedTo && record.delegatedTo.length > 0 && (
              <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
            )}
            {delegateeName && (
              <Tag color="blue" style={{ fontSize: 11, marginRight: 0 }}>
                录入委派→{delegateeName}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 110, align: 'center',
    },
    {
      title: '智能检查规则', dataIndex: 'aiCheckRule', key: 'aiCheckRule', width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '交付件', key: 'deliverables', width: 180,
      render: (_, record) => <EntryContentRenderer content={record.entryContent} />,
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      filters: [
        { text: '未录入', value: 'not_entered' },
        { text: '暂存', value: 'draft' },
        { text: '已录入', value: 'entered' },
      ],
      onFilter: (value, record) => record.entryStatus === value,
      render: (_, record) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', key: 'aiCheckStatus', width: 100, align: 'center',
      filters: [
        { text: '未开始', value: 'not_started' },
        { text: '检查中', value: 'in_progress' },
        { text: '通过', value: 'passed' },
        { text: '不通过', value: 'failed' },
      ],
      onFilter: (value, record) => record.aiCheckStatus === value,
      render: (_, record) => {
        const s = AI_CHECK_STATUS_MAP[record.aiCheckStatus];
        return (
          <Tag
            color={s.color}
            icon={s.icon}
            style={{ cursor: record.aiCheckStatus !== 'not_started' ? 'pointer' : 'default' }}
            onClick={() => showAiCheckDetail(record)}
          >
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: '维护审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => {
        if (record.reviewStatus === 'passed') {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        const isDelegatedToMe = record.delegatedTo?.includes(currentUser.id) ?? false;
        const isRoleOwner = userResponsibleRoles.includes(record.responsibleRole as PipelineRole);
        const canEdit = isRoleOwner || isDelegatedToMe;
        if (!canEdit) {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'checklist')}>
              录入
            </Button>
            <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'checklist')}>
              委派
            </Button>
          </Space>
        );
      },
    },
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getClSearchProps, currentUser.id, userResponsibleRoles]);

  // --- Table columns for review elements ---

  const reviewElementColumns: ColumnsType<ReviewElement> = useMemo(() => [
    {
      title: '序号', dataIndex: 'seq', key: 'seq', width: 60, align: 'center',
    },
    {
      title: '标准', dataIndex: 'standard', key: 'standard', width: 100,
    },
    {
      title: '说明', dataIndex: 'description', key: 'description', width: 220,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      ...getReSearchProps('description'),
    },
    {
      title: '备注', dataIndex: 'remark', key: 'remark', width: 160,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '责任角色', dataIndex: 'responsibleRole', key: 'responsibleRole', width: 80, align: 'center',
    },
    {
      title: '资料录入-责任人', dataIndex: 'entryPerson', key: 'entryPerson', width: 140, align: 'center',
      render: (text: string, record: ReviewElement) => {
        const delegatee = record.delegatedTo?.[0];
        const delegateeName = delegatee
          ? MOCK_USERS.find((u) => u.id === delegatee)?.name
          : null;
        return (
          <Space size={4} wrap>
            <span>{text}</span>
            {record.delegatedTo && record.delegatedTo.length > 0 && (
              <Tag color="purple" style={{ fontSize: 11, marginRight: 0 }}>已委派</Tag>
            )}
            {delegateeName && (
              <Tag color="blue" style={{ fontSize: 11, marginRight: 0 }}>
                录入委派→{delegateeName}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '人工审核-责任人', dataIndex: 'reviewPerson', key: 'reviewPerson', width: 110, align: 'center',
    },
    {
      title: '智能检查规则', dataIndex: 'aiCheckRule', key: 'aiCheckRule', width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '交付件', key: 'deliverables', width: 180,
      render: (_, record) => <EntryContentRenderer content={record.entryContent} />,
    },
    {
      title: '录入状态', key: 'entryStatus', width: 90, align: 'center',
      filters: [
        { text: '未录入', value: 'not_entered' },
        { text: '暂存', value: 'draft' },
        { text: '已录入', value: 'entered' },
      ],
      onFilter: (value, record) => record.entryStatus === value,
      render: (_, record) => {
        const s = ENTRY_STATUS_MAP[record.entryStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'AI检查状态', key: 'aiCheckStatus', width: 100, align: 'center',
      filters: [
        { text: '未开始', value: 'not_started' },
        { text: '检查中', value: 'in_progress' },
        { text: '通过', value: 'passed' },
        { text: '不通过', value: 'failed' },
      ],
      onFilter: (value, record) => record.aiCheckStatus === value,
      render: (_, record) => {
        const s = AI_CHECK_STATUS_MAP[record.aiCheckStatus];
        return (
          <Tag
            color={s.color}
            icon={s.icon}
            style={{ cursor: record.aiCheckStatus !== 'not_started' ? 'pointer' : 'default' }}
            onClick={() => showAiCheckDetail(record)}
          >
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: '维护审核状态', key: 'reviewStatus', width: 100, align: 'center',
      render: (_, record) => {
        const s = REVIEW_STATUS_MAP[record.reviewStatus];
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 130, align: 'center', fixed: 'right',
      render: (_, record) => {
        if (record.reviewStatus === 'passed') {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        const isDelegatedToMe = record.delegatedTo?.includes(currentUser.id) ?? false;
        const isRoleOwner = userResponsibleRoles.includes(record.responsibleRole as PipelineRole);
        const canEdit = isRoleOwner || isDelegatedToMe;
        if (!canEdit) {
          return <span style={{ color: '#bfbfbf' }}>-</span>;
        }
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => openEntryModal(record.id, 'review')}>
              录入
            </Button>
            <Button type="link" size="small" onClick={() => openDelegateModal([record.id], 'review')}>
              委派
            </Button>
          </Space>
        );
      },
    },
  ], [openEntryModal, openDelegateModal, showAiCheckDetail, getReSearchProps, currentUser.id, userResponsibleRoles]);

  // --- Render ---

  if (!application) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>未找到转维申请</h2>
        <Button onClick={() => router.push('/workbench')}>返回</Button>
      </div>
    );
  }

  if (application.status !== 'in_progress') {
    const statusText = application.status === 'failed'
      ? 'SQA 审核未通过，流程已终止'
      : application.status === 'cancelled'
        ? '该转维申请已取消'
        : '该转维申请已完成';
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert type="warning" showIcon title={statusText} description="不可再进行资料录入操作" style={{ maxWidth: 560, margin: '0 auto 16px' }} />
        <Button onClick={() => router.push(`/workbench/${id}`)}>返回详情</Button>
      </div>
    );
  }

  const selectedKeys = activeTab === 'checklist' ? selectedChecklistKeys : selectedReviewKeys;

  return (
    <div style={{ padding: '16px 24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>资料录入与AI检查</h2>
        <span style={{ color: '#888', fontSize: 14 }}>{application.projectName}</span>

        {/* Role selector: Segmented for multi-role, Tag for single role */}
        {userResponsibleRoles.length > 1 ? (
          <Segmented
            value={effectiveRole ?? ''}
            onChange={(val) => {
              setActiveRole(val as PipelineRole);
              setSelectedChecklistKeys([]);
              setSelectedReviewKeys([]);
            }}
            options={userResponsibleRoles.map((r) => ({
              label: `${r}角色`,
              value: r,
            }))}
            style={{ marginLeft: 8 }}
          />
        ) : effectiveRole ? (
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 13 }}>
            {effectiveRole}角色
          </Tag>
        ) : null}
      </div>

      {/* Pipeline Progress */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '8px 24px', marginBottom: 16 }}>
        <PipelineProgress pipeline={application.pipeline} />
      </div>

      {/* 维护审核驳回提示：默认收起，展开后显示评审意见（一条）+ Block 任务列表（多条） */}
      {hasRejectedItems && (
        <Collapse
          className="rejection-collapse"
          style={{
            marginBottom: 16,
            background: 'linear-gradient(180deg, #fff5f5 0%, #fff8f7 100%)',
            border: '1px solid #ffccc7',
            borderRadius: 8,
            boxShadow: '0 2px 6px rgba(255, 77, 79, 0.08)',
          }}
          expandIconPosition="end"
          items={[{
            key: 'rejection',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#ff4d4f', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ExclamationCircleOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                    「{effectiveRole}」角色维护审核不通过
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                    请按评审意见修改资料后重新提交审核
                  </div>
                </div>
                <Space size={6} style={{ flexShrink: 0 }}>
                  <Tag color="error" style={{ margin: 0 }}>
                    Block 未关闭 {blockTasks.length}
                  </Tag>
                  <Tag color="default" style={{ margin: 0 }}>评审意见 1</Tag>
                </Space>
              </div>
            ),
            children: (
              <div style={{ paddingTop: 4 }}>
                <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#595959' }}>
                  评审意见
                </div>
                <div
                  style={{
                    marginBottom: 16,
                    padding: '10px 14px',
                    background: '#fff',
                    border: '1px solid #ffe7e6',
                    borderLeft: '3px solid #ff4d4f',
                    borderRadius: 4,
                    color: '#333',
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {roleReviewComment || '（未填写）'}
                </div>
                <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#595959' }}>
                  Block 任务列表
                  <Tag color="error" style={{ marginLeft: 8 }}>未关闭 {blockTasks.length}</Tag>
                </div>
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={blockTasks}
                  style={{ background: '#fff', borderRadius: 4, overflow: 'hidden' }}
                  columns={[
                    { title: '序号', key: 'index', width: 60, align: 'center', render: (_, __, idx) => idx + 1 },
                    { title: '问题描述', dataIndex: 'description', key: 'description' },
                    { title: '解决方案', dataIndex: 'resolution', key: 'resolution' },
                    { title: '责任人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 90, align: 'center' },
                    { title: '部门', dataIndex: 'department', key: 'department', width: 110, align: 'center' },
                    { title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 110, align: 'center' },
                  ]}
                  locale={{ emptyText: '暂无 Block 任务' }}
                />
              </div>
            ),
          }]}
        />
      )}

      {/* 委派给我的(跨角色聚合) */}
      {hasDelegatedItems && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 0, marginBottom: 16 }}>
          <Collapse
            defaultActiveKey={['delegated-to-me']}
            items={[
              {
                key: 'delegated-to-me',
                label: (
                  <span style={{ fontWeight: 600 }}>
                    委派给我的 ({delegatedChecklistForMe.length + delegatedReviewElementsForMe.length} 项)
                  </span>
                ),
                children: (
                  <div>
                    {delegatedChecklistForMe.length > 0 && (
                      <>
                        <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>
                          转维材料 ({delegatedChecklistForMe.length})
                        </div>
                        <Table<CheckListItem>
                          rowKey="id"
                          columns={checklistColumns}
                          dataSource={delegatedChecklistForMe as CheckListItem[]}
                          pagination={false}
                          size="small"
                          scroll={{ x: 1600 }}
                          style={{ marginBottom: 16 }}
                        />
                      </>
                    )}
                    {delegatedReviewElementsForMe.length > 0 && (
                      <>
                        <div style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>
                          评审要素 ({delegatedReviewElementsForMe.length})
                        </div>
                        <Table<ReviewElement>
                          rowKey="id"
                          columns={reviewElementColumns}
                          dataSource={delegatedReviewElementsForMe as ReviewElement[]}
                          pagination={false}
                          size="small"
                          scroll={{ x: 1700 }}
                        />
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
        {/* Tabs: 转维材料 / 评审要素 */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setSelectedChecklistKeys([]);
            setSelectedReviewKeys([]);
          }}
          tabBarExtraContent={
            <Space size={8}>
              {selectedKeys.length > 0 && (
                <Button size="small" onClick={() => openDelegateModal(selectedKeys as string[], activeTab as 'checklist' | 'review')}>
                  全部委派 ({selectedKeys.length})
                </Button>
              )}
              {effectiveRole && (
                <Tooltip title={submitTooltip}>
                  <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={handleSubmitReview} disabled={!canSubmitReview}>
                    提交{effectiveRole}审核
                  </Button>
                </Tooltip>
              )}
              <Button icon={<UploadOutlined />} size="small">导入</Button>
              <Button icon={<DownloadOutlined />} size="small">导出</Button>
            </Space>
          }
          items={[
            {
              key: 'checklist',
              label: (
                <Space size={6}>
                  <span>转维材料 ({ownRoleChecklist.length})</span>
                  {pendingChecklistCount > 0 && (
                    <Tooltip title={`还有 ${pendingChecklistCount} 项未录入或AI检查未通过`}>
                      <Badge count={pendingChecklistCount} size="small" />
                    </Tooltip>
                  )}
                </Space>
              ),
              children: (
                <Table<CheckListItem>
                  rowKey="id"
                  columns={checklistColumns}
                  dataSource={ownRoleChecklist as CheckListItem[]}
                  pagination={false}
                  scroll={{ x: 1600 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedChecklistKeys,
                    onChange: setSelectedChecklistKeys,
                  }}
                />
              ),
            },
            {
              key: 'review',
              label: (
                <Space size={6}>
                  <span>评审要素 ({ownRoleReviewElements.length})</span>
                  {pendingReviewCount > 0 && (
                    <Tooltip title={`还有 ${pendingReviewCount} 项未录入或AI检查未通过`}>
                      <Badge count={pendingReviewCount} size="small" />
                    </Tooltip>
                  )}
                </Space>
              ),
              children: (
                <Table<ReviewElement>
                  rowKey="id"
                  columns={reviewElementColumns}
                  dataSource={ownRoleReviewElements as ReviewElement[]}
                  pagination={false}
                  scroll={{ x: 1700 }}
                  size="middle"
                  rowSelection={{
                    selectedRowKeys: selectedReviewKeys,
                    onChange: setSelectedReviewKeys,
                  }}
                />
              ),
            },
          ]}
        />
      </div>

      {/* Entry Modal */}
      <Modal
        title="资料录入"
        open={entryModalVisible}
        onCancel={() => {
          setEntryModalVisible(false);
          setEntryModalTarget(null);
          setEntryContent('');
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setEntryModalVisible(false);
              setEntryModalTarget(null);
              setEntryContent('');
            }}>
              取消
            </Button>
            <Button onClick={() => handleEntrySave('draft')} style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>
              暂存
            </Button>
            <Button type="primary" onClick={() => handleEntrySave('confirm')}>
              确认
            </Button>
          </Space>
        }
        width={600}
        destroyOnHidden
      >
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>录入内容</div>
          <TextArea
            rows={8}
            placeholder="请输入资料内容，支持粘贴飞书文档链接、Samba路径或其他URL..."
            value={entryContent}
            onChange={(e) => setEntryContent(e.target.value)}
          />
          <div style={{ marginTop: 6, color: '#999', fontSize: 12 }}>
            支持识别飞书文档链接、Samba服务器路径（\\server\path）及其他URL
          </div>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <DelegateModal
        open={delegateModalVisible}
        title="委派任务"
        selectedCount={delegateTarget?.ids.length ?? 0}
        currentAssignee={delegateCurrentAssignee}
        excludeUserIds={[currentUser.id]}
        allowClear={false}
        onConfirm={handleDelegateConfirm}
        onCancel={() => {
          setDelegateModalVisible(false);
          setDelegateTarget(null);
          setDelegateCurrentAssignee(null);
        }}
      />

      {/* AI Check Detail Modal */}
      <Modal
        title="AI检查详情"
        open={aiDetailModalVisible}
        onCancel={() => setAiDetailModalVisible(false)}
        footer={<Button onClick={() => setAiDetailModalVisible(false)}>关闭</Button>}
        width={500}
      >
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {aiDetailContent}
        </div>
      </Modal>
    </div>
  );
}
