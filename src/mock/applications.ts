import type {
  TransferApplication,
  CheckListItem,
  ReviewElement,
  BlockTask,
  LegacyTask,
  HistoryRecord,
  TodoItem,
  PipelineRole,
  TeamMember,
  EntryStatus,
  AICheckStatus,
  ReviewStatus,
} from '@/types';
import { MOCK_CHECKLIST_TEMPLATES } from './checklist-template';
import { MOCK_REVIEW_ELEMENT_TEMPLATES } from './review-element-template';

// ============================================================
// Role mapping helpers (same logic as ApplicationContext)
// ============================================================

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

// ============================================================
// Item generation from templates
// ============================================================

interface ItemOverride {
  readonly entryContent?: string;
  readonly entryStatus: EntryStatus;
  readonly aiCheckStatus: AICheckStatus;
  readonly aiCheckResult?: string;
  readonly reviewStatus: ReviewStatus;
  readonly reviewComment?: string;
  readonly delegatedTo?: ReadonlyArray<string>;
  readonly reviewDelegatedTo?: ReadonlyArray<string>;
  readonly entryPersonOverride?: { readonly id: string; readonly name: string };
}

function generateChecklist(
  applicationId: string,
  research: ReadonlyArray<TeamMember>,
  maintenance: ReadonlyArray<TeamMember>,
  overrides: Record<number, ItemOverride> = {},
): CheckListItem[] {
  return MOCK_CHECKLIST_TEMPLATES.map((tpl, idx) => {
    const entryPerson = findMemberByPipelineRole(research, tpl.responsibleRole);
    const reviewPerson = findMemberByPipelineRole(maintenance, tpl.responsibleRole);
    const ov = overrides[idx];
    return {
      id: `${applicationId}-cli-${String(idx + 1).padStart(3, '0')}`,
      applicationId,
      seq: idx + 1,
      type: tpl.type,
      checkItem: tpl.checkItem,
      responsibleRole: tpl.responsibleRole,
      entryPerson: ov?.entryPersonOverride?.name ?? entryPerson?.name ?? '-',
      entryPersonId: ov?.entryPersonOverride?.id ?? entryPerson?.id ?? '',
      reviewPerson: reviewPerson?.name ?? '-',
      reviewPersonId: reviewPerson?.id ?? '',
      aiCheckRule: tpl.aiCheckRule,
      deliverables: [],
      entryContent: ov?.entryContent,
      entryStatus: ov?.entryStatus ?? 'not_entered',
      aiCheckStatus: ov?.aiCheckStatus ?? 'not_started',
      aiCheckResult: ov?.aiCheckResult,
      reviewStatus: ov?.reviewStatus ?? 'not_reviewed',
      reviewComment: ov?.reviewComment,
      delegatedTo: ov?.delegatedTo,
      reviewDelegatedTo: ov?.reviewDelegatedTo,
    };
  });
}

function generateReviewEls(
  applicationId: string,
  research: ReadonlyArray<TeamMember>,
  maintenance: ReadonlyArray<TeamMember>,
  overrides: Record<number, ItemOverride> = {},
): ReviewElement[] {
  return MOCK_REVIEW_ELEMENT_TEMPLATES.map((tpl, idx) => {
    const role = tpl.responsibleRole as PipelineRole;
    const entryPerson = findMemberByPipelineRole(research, role);
    const reviewPerson = findMemberByPipelineRole(maintenance, role);
    const ov = overrides[idx];
    return {
      id: `${applicationId}-rei-${String(idx + 1).padStart(3, '0')}`,
      applicationId,
      seq: idx + 1,
      standard: tpl.standard,
      description: tpl.description,
      remark: tpl.remark,
      responsibleRole: role,
      entryPerson: ov?.entryPersonOverride?.name ?? entryPerson?.name ?? '-',
      entryPersonId: ov?.entryPersonOverride?.id ?? entryPerson?.id ?? '',
      reviewPerson: reviewPerson?.name ?? '-',
      reviewPersonId: reviewPerson?.id ?? '',
      aiCheckRule: tpl.aiCheckRule,
      deliverables: [],
      entryContent: ov?.entryContent,
      entryStatus: ov?.entryStatus ?? 'not_entered',
      aiCheckStatus: ov?.aiCheckStatus ?? 'not_started',
      aiCheckResult: ov?.aiCheckResult,
      reviewStatus: ov?.reviewStatus ?? 'not_reviewed',
      reviewComment: ov?.reviewComment,
      delegatedTo: ov?.delegatedTo,
      reviewDelegatedTo: ov?.reviewDelegatedTo,
    };
  });
}

// ============================================================
// Helper: batch override for "all entered+passed+reviewed"
// ============================================================

const ENTERED_PASSED: ItemOverride = {
  entryContent: '已录入，详见相关文档',
  entryStatus: 'entered',
  aiCheckStatus: 'passed',
  reviewStatus: 'not_reviewed',
};

const ENTERED_PASSED_REVIEWED: ItemOverride = {
  entryContent: '已录入，详见相关文档',
  entryStatus: 'entered',
  aiCheckStatus: 'passed',
  reviewStatus: 'passed',
};

const ENTERED_PASSED_REVIEWING: ItemOverride = {
  entryContent: '已录入，详见相关文档',
  entryStatus: 'entered',
  aiCheckStatus: 'passed',
  reviewStatus: 'reviewing',
};

const ENTERED_PASSED_REJECTED: ItemOverride = {
  entryContent: '已录入，详见相关文档',
  entryStatus: 'entered',
  aiCheckStatus: 'passed',
  reviewStatus: 'rejected',
  reviewComment: '资料不完整，需要补充更多详细信息',
};

function rangeOverrides(
  start: number,
  end: number,
  ov: ItemOverride,
): Record<number, ItemOverride> {
  const result: Record<number, ItemOverride> = {};
  for (let i = start; i <= end; i++) {
    result[i] = ov;
  }
  return result;
}

// ============================================================
// Mock转维电子流申请数据
// ============================================================

// --- Teams ---
const TEAM_APP001 = {
  research: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM' as const, department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软' as const, department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

const TEAM_APP002 = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软' as const, department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

const TEAM_APP003 = {
  research: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM' as const, department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软' as const, department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

const TEAM_APP004 = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软' as const, department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

// --- app-005/006 Team (same as TEAM_1 structure) ---
const TEAM_APP005 = {
  research: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM' as const, department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软' as const, department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

const TEAM_APP006 = TEAM_APP005;

// --- app-007 Team (same as TEAM_2 structure, 张三在维护侧) ---
const TEAM_APP007 = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软' as const, department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统' as const, department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像' as const, department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像' as const, department: '影像开发部' },
  ],
};

export const MOCK_APPLICATIONS: TransferApplication[] = [
  {
    id: 'app-001',
    projectId: 'proj001',
    projectName: 'X6870_H1234(Android16)',
    applicant: '张三',
    applicantId: 'u001',
    team: TEAM_APP001,
    plannedReviewDate: '2026-04-15',
    remark: 'X6870项目Android16转维，计划4月中旬完成',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'in_progress',
      maintenanceReview: 'not_started',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '影像', entryStatus: 'in_progress', reviewStatus: 'not_started' },
      ],
    },
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-13T08:30:00Z',
  },
  {
    id: 'app-002',
    projectId: 'proj002',
    projectName: 'X6768_H5678(Android15)',
    applicant: '冯十二',
    applicantId: 'u010',
    team: TEAM_APP002,
    plannedReviewDate: '2026-03-30',
    remark: 'X6768项目转维申请',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'success',
      maintenanceReview: 'in_progress',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'rejected' },
        { role: '测试', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'in_progress' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '影像', entryStatus: 'completed', reviewStatus: 'completed' },
      ],
    },
    createdAt: '2026-02-20T09:00:00Z',
    updatedAt: '2026-03-12T16:00:00Z',
  },
  {
    id: 'app-003',
    projectId: 'proj003',
    projectName: 'X6980_H9012(Android17)',
    applicant: '张三',
    applicantId: 'u001',
    team: TEAM_APP003,
    plannedReviewDate: '2026-05-01',
    remark: '',
    status: 'cancelled',
    cancelReason: '项目计划变更，暂缓转维',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'not_started',
      maintenanceReview: 'not_started',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '影像', entryStatus: 'not_started', reviewStatus: 'not_started' },
      ],
    },
    createdAt: '2026-03-05T14:00:00Z',
    updatedAt: '2026-03-08T10:00:00Z',
  },
  {
    id: 'app-004',
    projectId: 'proj004',
    projectName: 'X6650_H3456(Android14)',
    applicant: '冯十二',
    applicantId: 'u010',
    team: TEAM_APP004,
    plannedReviewDate: '2026-02-28',
    remark: 'X6650 Android14转维已全部完成，信息变更已归档',
    status: 'completed',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'success',
      maintenanceReview: 'success',
      sqaReview: 'success',
      infoChange: 'success',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '测试', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '影像', entryStatus: 'completed', reviewStatus: 'completed' },
      ],
    },
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-28T17:00:00Z',
  },
  // ============================================================
  // app-005: X7100 — SPM(张三)所有资料已录入通过，可提交审核
  // SPM: 25条CL全部entered+passed, 5条RE全部entered+passed
  // 测试: 6条CL entered+passed
  // 底软: 4条CL entered+passed, 2条draft
  // 系统: 2条CL entered+passed, 1条failed
  // 影像: 2条CL entered+passed/draft
  // ============================================================
  {
    id: 'app-005',
    projectId: 'proj005',
    projectName: 'X7100_H4567(Android17)',
    applicant: '张三',
    applicantId: 'u001',
    team: TEAM_APP005,
    plannedReviewDate: '2026-05-10',
    remark: 'X7100项目Android17转维，SPM资料已全部录入完成，待提交审核',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'in_progress',
      maintenanceReview: 'not_started',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '影像', entryStatus: 'in_progress', reviewStatus: 'not_started' },
      ],
    },
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-14T16:00:00Z',
  },
  // ============================================================
  // app-006: X7200 — 底软(赵六)和系统(钱七)可提交审核
  // SPM: 15条CL entered+passed, 3条RE entered+passed
  // 测试: 8条CL entered+passed
  // 底软: 11条CL全部entered+passed, 5条RE全部entered+passed
  // 系统: 5条CL全部entered+passed, 5条RE全部entered+passed
  // 影像: 全部未录入(not_started)
  // ============================================================
  {
    id: 'app-006',
    projectId: 'proj006',
    projectName: 'X7200_H7890(Android16)',
    applicant: '张三',
    applicantId: 'u001',
    team: TEAM_APP006,
    plannedReviewDate: '2026-04-20',
    remark: 'X7200项目底软和系统资料已全部录入完成，待提交审核',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'in_progress',
      maintenanceReview: 'not_started',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '影像', entryStatus: 'not_started', reviewStatus: 'not_started' },
      ],
    },
    createdAt: '2026-02-25T10:00:00Z',
    updatedAt: '2026-03-15T11:00:00Z',
  },
  // ============================================================
  // app-007: X7300 — 冯十二(SPM)和褚十四(底软)可提交审核
  // 张三在维护侧担任SPM审核角色
  // SPM: 25条CL全部entered+passed, 5条RE全部entered+passed
  // 测试: 4条CL entered+passed
  // 底软: 11条CL全部entered+passed, 5条RE全部entered+passed
  // 系统: 3条CL entered+passed, 2条RE entered+passed
  // ============================================================
  {
    id: 'app-007',
    projectId: 'proj007',
    projectName: 'X7300_H2345(Android15)',
    applicant: '冯十二',
    applicantId: 'u010',
    team: TEAM_APP007,
    plannedReviewDate: '2026-04-30',
    remark: 'X7300项目SPM和底软资料已全部录入完成，待提交审核',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'in_progress',
      maintenanceReview: 'not_started',
      sqaReview: 'not_started',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '影像', entryStatus: 'not_started', reviewStatus: 'not_started' },
      ],
    },
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-15T14:00:00Z',
  },
  // ============================================================
  // app-008: X7400 — 所有角色审核通过，SQA审核进行中
  // 用于测试SQA审核流程
  // ============================================================
  {
    id: 'app-008',
    projectId: 'proj008',
    projectName: 'X7400_H6789(Android16)',
    applicant: '张三',
    applicantId: 'u001',
    team: TEAM_APP005,
    plannedReviewDate: '2026-04-25',
    remark: 'X7400项目维护审核已全部通过，进入SQA审核阶段',
    status: 'in_progress',
    pipeline: {
      projectInit: 'success',
      dataEntry: 'success',
      maintenanceReview: 'success',
      sqaReview: 'in_progress',
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '测试', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '影像', entryStatus: 'completed', reviewStatus: 'completed' },
      ],
    },
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z',
  },
];

// ============================================================
// app-001: X6870 — 资料录入进行中（各角色部分录入）
// SPM(25条): 前5条已录入通过, 其余未录入
// 测试(11条): 前3条已录入通过, 其余未录入
// 底软(11条): 第1条暂存, 其余未录入
// 系统(5条): 第1条已录入但AI检查失败, 其余未录入
// 影像(8条): 前1条已录入通过, 第2条暂存, 其余未录入
// ============================================================

const APP001_CL_OVERRIDES: Record<number, ItemOverride> = {
  // SPM: indices 0-24, 前5条(0-4)已录入通过
  0: { entryContent: 'IPM系统确认所有版本计划已完成，上市时间均在当前时间之前\nhttps://feishu.cn/docs/x6870-ipm-project-screenshot', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  1: { entryContent: 'Super空间剩余3.2GB，规划2代升级预留', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  2: { entryContent: '项目计划已归档\nhttps://feishu.cn/docs/x6870-project-plan-archive', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  3: { entryContent: 'GMS包配置已与最新市场项目保持一致', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  4: { entryContent: 'Jenkins编译参数已更新\nhttps://jenkins.internal/job/x6870/', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 测试: indices 25-35, 前3条(25-27)已录入通过
  25: { entryContent: '确认OTA版本链路完整，无断开情况\nhttps://feishu.cn/docs/x6870-ota-deployment-table', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  26: { entryContent: '确认历史版本已全市场推送\nhttps://feishu.cn/docs/x6870-ota-push-record', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  27: { entryContent: '测试用例库已交接\nhttps://feishu.cn/docs/x6870-test-cases', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 底软: indices 36-46, 前2条委派给张三(u001)
  36: { entryContent: '散热方案文档整理中\n\\\\192.168.1.100\\projects\\x6870\\thermal', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
  37: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
  // 系统: indices 47-51, 第1条(47)已录入但AI失败
  47: { entryContent: '系统集成配置文档：https://feishu.cn/docs/xxx', entryStatus: 'entered', aiCheckStatus: 'failed', aiCheckResult: '未检测到有效的系统编译配置文档链接，提供的链接无法访问', reviewStatus: 'not_reviewed' },
  // 影像: indices 52-59, 前2条(52-53)已录入, 第53条暂存
  52: { entryContent: '影像ISP调试参数已完成归档\nhttps://feishu.cn/docs/x6870-isp-params', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  53: { entryContent: '摄像头标定数据整理中', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed' },
};

const APP001_RE_OVERRIDES: Record<number, ItemOverride> = {
  // SPM评审要素: indices 0-4, 第1条已录入通过
  0: { entryContent: 'IPM系统版本计划与实际上市时间一致，详见附件', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 底软评审要素: indices 5-9, 第1条已录入通过, 第2条委派给张三
  5: { entryContent: 'BSP驱动源码仓库：https://git.internal/bsp/x6870', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  6: { entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed', delegatedTo: ['u001'] },
};

// ============================================================
// app-002: X6768 — 资料全部录入完成，维护审核进行中
// 所有checklist和review elements均已录入通过
// SPM: 审核中(reviewing)
// 测试: 已通过
// 底软: 审核中(reviewing)
// 系统: 已通过
// ============================================================

// SPM 角色级驳回意见：本次驳回作为一次评审事件，整角色共用同一条评审意见
const APP002_SPM_REVIEW_COMMENT
  = 'SPM 提交资料存在多处问题：项目计划归档截图不清晰，OTA 版本链路缺少 V2.1→V2.3 升级路径，文档归档服务器链接已失效，详见 Block 任务列表。';

function makeApp002ClOverrides(): Record<number, ItemOverride> {
  const ov: Record<number, ItemOverride> = {};
  // SPM (0-24): 第2、7条被拒绝；其余角色项一并回退到「待审核」等待研发侧修改后重新提交
  for (let i = 0; i <= 24; i++) ov[i] = ENTERED_PASSED;
  ov[2] = { ...ENTERED_PASSED_REJECTED, reviewComment: APP002_SPM_REVIEW_COMMENT };
  ov[7] = { ...ENTERED_PASSED_REJECTED, reviewComment: APP002_SPM_REVIEW_COMMENT };
  // 测试 (25-35): all entered+passed, reviewStatus=passed
  for (let i = 25; i <= 35; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  // 底软 (36-46): all entered+passed, reviewStatus=reviewing
  // index 36: 被委派给 u003(王五/SQA)，王五不在 app-002 维护团队，用于测试「委派给我的」Collapse
  for (let i = 36; i <= 46; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  ov[36] = { ...ENTERED_PASSED_REVIEWING, reviewDelegatedTo: ['u003'] };
  // 系统 (47-51): all entered+passed, reviewStatus=passed
  for (let i = 47; i <= 51; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  // 影像 (52-59): all entered+passed, reviewStatus=passed
  for (let i = 52; i <= 59; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  return ov;
}

function makeApp002ReOverrides(): Record<number, ItemOverride> {
  const ov: Record<number, ItemOverride> = {};
  // SPM (0-4): 第1条被拒绝；其余角色项回退到「待审核」
  for (let i = 0; i <= 4; i++) ov[i] = ENTERED_PASSED;
  ov[1] = { ...ENTERED_PASSED_REJECTED, reviewComment: APP002_SPM_REVIEW_COMMENT };
  // 底软 (5-9): reviewing
  // index 5: 被委派给 u003(王五/SQA)，王五不在 app-002 维护团队，用于测试「委派给我的」Collapse
  for (let i = 5; i <= 9; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  ov[5] = { ...ENTERED_PASSED_REVIEWING, reviewDelegatedTo: ['u003'] };
  // 系统 (10-14): passed
  for (let i = 10; i <= 14; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  // 影像 (15-19): passed
  for (let i = 15; i <= 19; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  return ov;
}

// ============================================================
// app-004: X6650 — 全部完成
// ============================================================

function makeApp004Overrides(count: number): Record<number, ItemOverride> {
  const ov: Record<number, ItemOverride> = {};
  for (let i = 0; i < count; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  return ov;
}

// ============================================================
// app-005: X7100 — SPM(张三)可提交审核
// ============================================================

const APP005_CL_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-24): ALL entered+passed — 张三可提交审核
  ...rangeOverrides(0, 24, ENTERED_PASSED),
  // 部分SPM项提供具体内容
  0: { entryContent: 'IPM系统确认X7100所有版本计划已完成，上市时间均在当前时间之前\nhttps://feishu.cn/docs/x7100-ipm-project', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  1: { entryContent: 'Super空间剩余4.5GB，规划3代升级预留', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  4: { entryContent: 'Jenkins编译参数已更新\nhttps://jenkins.internal/job/x7100/', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  7: { entryContent: 'OTA版本链路完整无断开\nhttps://feishu.cn/docs/x7100-ota-deployment', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  17: { entryContent: '安全补丁计划：2026年4月-2027年3月，月度更新\nhttps://feishu.cn/docs/x7100-security-patch', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 测试 (25-35): 前6条 entered+passed, 其余未录入
  ...rangeOverrides(25, 30, ENTERED_PASSED),
  // 底软 (36-46): 前4条 entered+passed, 40-41 暂存, 其余未录入
  ...rangeOverrides(36, 39, ENTERED_PASSED),
  40: { entryContent: '功耗优化方案整理中...', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed' },
  41: { entryContent: '外设兼容性列表待补充', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed' },
  // 系统 (47-51): 前2条 entered+passed, 第3条 AI检查失败, 其余未录入
  ...rangeOverrides(47, 48, ENTERED_PASSED),
  49: { entryContent: '系统已知问题清单链接：https://feishu.cn/docs/expired-link', entryStatus: 'entered', aiCheckStatus: 'failed', aiCheckResult: '提供的文档链接已失效，请更新有效的系统已知问题清单链接', reviewStatus: 'not_reviewed' },
  // 影像 (52-59): 前2条 entered+passed, 第3条暂存
  52: { entryContent: '影像ISP参数调试文档\nhttps://feishu.cn/docs/x7100-isp', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  53: { entryContent: '摄像头模组兼容性测试记录整理中', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed' },
};

const APP005_RE_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-4): ALL entered+passed
  ...rangeOverrides(0, 4, ENTERED_PASSED),
  0: { entryContent: 'IPM系统版本计划与实际上市时间一致，详见项目管理报告\nhttps://feishu.cn/docs/x7100-project-report', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  3: { entryContent: '客户定制需求均已记录在SPD系统\nhttps://spd.internal/project/x7100', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  4: { entryContent: '安全补丁计划已制定，覆盖未来12个月\nhttps://feishu.cn/docs/x7100-security-plan', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 底软 (5-9): 前2条 entered+passed, 其余未录入
  ...rangeOverrides(5, 6, ENTERED_PASSED),
  // 系统 (10-14): 第1条 entered+passed, 其余未录入
  10: ENTERED_PASSED,
};

// ============================================================
// app-006: X7200 — 底软(赵六)和系统(钱七)可提交审核
// ============================================================

const APP006_CL_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-24): 前15条 entered+passed, 其余未录入
  ...rangeOverrides(0, 14, ENTERED_PASSED),
  0: { entryContent: 'IPM系统确认X7200全部版本计划已完成\nhttps://feishu.cn/docs/x7200-ipm', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 测试 (25-35): 前8条 entered+passed, 其余未录入
  ...rangeOverrides(25, 32, ENTERED_PASSED),
  // 底软 (36-46): ALL entered+passed — 赵六可提交审核
  ...rangeOverrides(36, 46, ENTERED_PASSED),
  36: { entryContent: '硬件散热方案/限流参数/CPU thermal参数完整归档\nhttps://feishu.cn/docs/x7200-thermal', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  37: { entryContent: 'BSP驱动源码仓库：https://git.internal/bsp/x7200\n编译文档：https://feishu.cn/docs/x7200-bsp-build', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 系统 (47-51): ALL entered+passed — 钱七可提交审核
  ...rangeOverrides(47, 51, ENTERED_PASSED),
  47: { entryContent: '系统集成编译配置文档\nhttps://feishu.cn/docs/x7200-system-build', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
};

const APP006_RE_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-4): 前3条 entered+passed, 其余未录入
  ...rangeOverrides(0, 2, ENTERED_PASSED),
  // 底软 (5-9): ALL entered+passed
  ...rangeOverrides(5, 9, ENTERED_PASSED),
  5: { entryContent: '所有关键驱动模块已完整交接，源码+文档+调试工具\nhttps://git.internal/bsp/x7200', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 系统 (10-14): ALL entered+passed
  ...rangeOverrides(10, 14, ENTERED_PASSED),
  10: { entryContent: '系统集成编译配置完整记录\nhttps://feishu.cn/docs/x7200-system-config', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
};

// ============================================================
// app-007: X7300 — 冯十二(SPM)和褚十四(底软)可提交审核
// ============================================================

const APP007_CL_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-24): ALL entered+passed — 冯十二可提交审核
  ...rangeOverrides(0, 24, ENTERED_PASSED),
  0: { entryContent: 'IPM系统确认X7300所有版本流程已走完\nhttps://feishu.cn/docs/x7300-ipm', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  5: { entryContent: '项目资料已归档至NAS\n\\\\192.168.1.100\\projects\\x7300', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 测试 (25-35): 前4条 entered+passed, 其余未录入
  ...rangeOverrides(25, 28, ENTERED_PASSED),
  // 底软 (36-46): ALL entered+passed — 褚十四可提交审核
  ...rangeOverrides(36, 46, ENTERED_PASSED),
  36: { entryContent: '散热方案文档完整归档\nhttps://feishu.cn/docs/x7300-thermal', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 系统 (47-51): 前3条 entered+passed, 其余未录入
  ...rangeOverrides(47, 49, ENTERED_PASSED),
};

const APP007_RE_OVERRIDES: Record<number, ItemOverride> = {
  // SPM (0-4): ALL entered+passed
  ...rangeOverrides(0, 4, ENTERED_PASSED),
  // 底软 (5-9): ALL entered+passed
  ...rangeOverrides(5, 9, ENTERED_PASSED),
  // 系统 (10-14): 前2条 entered+passed, 其余未录入
  ...rangeOverrides(10, 11, ENTERED_PASSED),
};

// ============================================================
// Generate complete items
// ============================================================

export const MOCK_CHECKLIST_ITEMS: CheckListItem[] = [
  ...generateChecklist('app-001', TEAM_APP001.research, TEAM_APP001.maintenance, APP001_CL_OVERRIDES),
  ...generateChecklist('app-002', TEAM_APP002.research, TEAM_APP002.maintenance, makeApp002ClOverrides()),
  // app-003: cancelled, no items needed (but generate empty for consistency)
  ...generateChecklist('app-004', TEAM_APP004.research, TEAM_APP004.maintenance, makeApp004Overrides(60)),
  ...generateChecklist('app-005', TEAM_APP005.research, TEAM_APP005.maintenance, APP005_CL_OVERRIDES),
  ...generateChecklist('app-006', TEAM_APP006.research, TEAM_APP006.maintenance, APP006_CL_OVERRIDES),
  ...generateChecklist('app-007', TEAM_APP007.research, TEAM_APP007.maintenance, APP007_CL_OVERRIDES),
  ...generateChecklist('app-008', TEAM_APP005.research, TEAM_APP005.maintenance, makeApp004Overrides(60)),
];

export const MOCK_REVIEW_ELEMENTS: ReviewElement[] = [
  ...generateReviewEls('app-001', TEAM_APP001.research, TEAM_APP001.maintenance, APP001_RE_OVERRIDES),
  ...generateReviewEls('app-002', TEAM_APP002.research, TEAM_APP002.maintenance, makeApp002ReOverrides()),
  ...generateReviewEls('app-004', TEAM_APP004.research, TEAM_APP004.maintenance, makeApp004Overrides(20)),
  ...generateReviewEls('app-005', TEAM_APP005.research, TEAM_APP005.maintenance, APP005_RE_OVERRIDES),
  ...generateReviewEls('app-006', TEAM_APP006.research, TEAM_APP006.maintenance, APP006_RE_OVERRIDES),
  ...generateReviewEls('app-007', TEAM_APP007.research, TEAM_APP007.maintenance, APP007_RE_OVERRIDES),
  ...generateReviewEls('app-008', TEAM_APP005.research, TEAM_APP005.maintenance, makeApp004Overrides(20)),
];

// ============================================================
// Mock Block任务
// ============================================================

export const MOCK_BLOCK_TASKS: BlockTask[] = [
  {
    id: 'bt-001', applicationId: 'app-001', responsibleRole: '底软',
    description: '核心服务模块响应时间过长，影响用户操作',
    resolution: '对数据库查询进行索引优化，并引入缓存机制',
    responsiblePerson: '赵六', department: '底软开发部',
    deadline: '2026-03-20', status: 'open', createdAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'bt-002', applicationId: 'app-001', responsibleRole: '系统',
    description: '系统编译配置文档链接无法访问',
    resolution: '重新整理编译配置文档并上传到飞书云盘',
    responsiblePerson: '钱七', department: '系统集成部',
    deadline: '2026-03-18', status: 'open', createdAt: '2026-03-12T11:00:00Z',
  },
  {
    id: 'bt-003', applicationId: 'app-005', responsibleRole: '系统',
    description: '系统已知问题清单文档链接失效',
    resolution: '重新整理系统已知问题清单并更新有效链接',
    responsiblePerson: '钱七', department: '系统集成部',
    deadline: '2026-03-25', status: 'open', createdAt: '2026-03-14T15:00:00Z',
  },
  {
    id: 'bt-004', applicationId: 'app-002', responsibleRole: 'SPM',
    description: '项目计划归档截图不清晰，无法识别版本节点',
    resolution: '使用高分辨率截图重新归档，并补充每个版本节点的说明',
    responsiblePerson: '冯十二', department: '项目管理部',
    deadline: '2026-03-22', status: 'open', createdAt: '2026-03-12T15:30:00Z',
  },
  {
    id: 'bt-005', applicationId: 'app-002', responsibleRole: 'SPM',
    description: 'OTA 版本链路从 V2.1 到 V2.3 缺少升级路径',
    resolution: '补齐 V2.2 中间版本的升级链路并验证回滚方案',
    responsiblePerson: '冯十二', department: '项目管理部',
    deadline: '2026-03-25', status: 'open', createdAt: '2026-03-12T15:35:00Z',
  },
];

// ============================================================
// Mock遗留任务
// ============================================================

export const MOCK_LEGACY_TASKS: LegacyTask[] = [
  {
    id: 'lt-001', applicationId: 'app-002',
    responsiblePerson: '张三', department: '项目管理部',
    description: '优化系统登录流程，提升用户体验',
    deadline: '2026-04-15', status: 'open', createdAt: '2026-03-10T10:00:00Z',
  },
];

// ============================================================
// Mock历史记录
// ============================================================

// 历史记录只保留大节点级事件：
// - 创建转维申请
// - {角色} 资料录入与AI检查完毕（提交审核时）
// - {角色} 维护审核通过 / {角色} 维护审核被拒绝
// - SQA审核通过 / SQA关闭流水线
// - 申请已取消（项目级关闭）
export const MOCK_HISTORY: HistoryRecord[] = [
  // app-001: dataEntry 进行中，尚未有角色完成提交
  { id: 'h001', applicationId: 'app-001', action: '创建转维申请', operator: '张三', detail: '创建了 X6870_H1234(Android16) 的转维申请', timestamp: '2026-03-10T10:00:00Z' },

  // app-002: 资料录入全部完成；测试/系统/影像 维护审核通过；SPM 维护审核被拒绝；底软审核中（无终态事件）
  { id: 'h101', applicationId: 'app-002', action: '创建转维申请', operator: '冯十二', detail: '创建了 X6768_H5678(Android15) 的转维申请', timestamp: '2026-02-20T09:00:00Z' },
  { id: 'h102', applicationId: 'app-002', action: 'SPM 资料录入与AI检查完毕', operator: '冯十二', detail: 'SPM 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-08T10:00:00Z' },
  { id: 'h103', applicationId: 'app-002', action: '测试 资料录入与AI检查完毕', operator: '陈十三', detail: '测试 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-08T15:00:00Z' },
  { id: 'h104', applicationId: 'app-002', action: '底软 资料录入与AI检查完毕', operator: '褚十四', detail: '底软 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-09T09:30:00Z' },
  { id: 'h105', applicationId: 'app-002', action: '系统 资料录入与AI检查完毕', operator: '卫十五', detail: '系统 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-09T11:00:00Z' },
  { id: 'h106', applicationId: 'app-002', action: '影像 资料录入与AI检查完毕', operator: '蒋十六', detail: '影像 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-09T14:00:00Z' },
  { id: 'h107', applicationId: 'app-002', action: '测试 维护审核通过', operator: '李四', detail: '测试 角色维护审核全部通过', timestamp: '2026-03-10T10:00:00Z' },
  { id: 'h108', applicationId: 'app-002', action: '系统 维护审核通过', operator: '钱七', detail: '系统 角色维护审核全部通过', timestamp: '2026-03-10T14:00:00Z' },
  { id: 'h109', applicationId: 'app-002', action: '影像 维护审核通过', operator: '沈十七', detail: '影像 角色维护审核全部通过', timestamp: '2026-03-11T09:00:00Z' },
  { id: 'h110', applicationId: 'app-002', action: 'SPM 维护审核被拒绝', operator: '张三', detail: 'SPM 角色维护审核被拒绝；驳回原因：项目计划归档截图不清晰、OTA 版本链路存在断链、文档归档服务器链接已失效', timestamp: '2026-03-12T16:00:00Z' },

  // app-003: 已取消
  { id: 'h201', applicationId: 'app-003', action: '创建转维申请', operator: '张三', detail: '创建了 X6980_H9012(Android17) 的转维申请', timestamp: '2026-03-05T14:00:00Z' },
  { id: 'h202', applicationId: 'app-003', action: '申请已取消', operator: '张三', detail: '取消原因：项目计划变更，暂缓转维', timestamp: '2026-03-08T10:00:00Z' },

  // app-004: 全流程完成（含 SQA 通过）
  { id: 'h301', applicationId: 'app-004', action: '创建转维申请', operator: '冯十二', detail: '创建了 X6650_H3456(Android14) 的转维申请', timestamp: '2026-01-15T09:00:00Z' },
  { id: 'h302', applicationId: 'app-004', action: 'SPM 资料录入与AI检查完毕', operator: '冯十二', detail: 'SPM 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-02-08T10:00:00Z' },
  { id: 'h303', applicationId: 'app-004', action: '测试 资料录入与AI检查完毕', operator: '陈十三', detail: '测试 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-02-09T11:00:00Z' },
  { id: 'h304', applicationId: 'app-004', action: '底软 资料录入与AI检查完毕', operator: '褚十四', detail: '底软 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-02-10T15:00:00Z' },
  { id: 'h305', applicationId: 'app-004', action: '系统 资料录入与AI检查完毕', operator: '卫十五', detail: '系统 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-02-11T10:00:00Z' },
  { id: 'h306', applicationId: 'app-004', action: '影像 资料录入与AI检查完毕', operator: '蒋十六', detail: '影像 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-02-12T14:00:00Z' },
  { id: 'h307', applicationId: 'app-004', action: 'SPM 维护审核通过', operator: '张三', detail: 'SPM 角色维护审核全部通过', timestamp: '2026-02-18T10:00:00Z' },
  { id: 'h308', applicationId: 'app-004', action: '测试 维护审核通过', operator: '李四', detail: '测试 角色维护审核全部通过', timestamp: '2026-02-19T11:00:00Z' },
  { id: 'h309', applicationId: 'app-004', action: '底软 维护审核通过', operator: '赵六', detail: '底软 角色维护审核全部通过', timestamp: '2026-02-20T09:00:00Z' },
  { id: 'h310', applicationId: 'app-004', action: '系统 维护审核通过', operator: '钱七', detail: '系统 角色维护审核全部通过', timestamp: '2026-02-22T15:00:00Z' },
  { id: 'h311', applicationId: 'app-004', action: '影像 维护审核通过', operator: '沈十七', detail: '影像 角色维护审核全部通过', timestamp: '2026-02-24T11:00:00Z' },
  { id: 'h312', applicationId: 'app-004', action: 'SQA 审核通过', operator: '王五', detail: 'SQA 审核全部通过，转维流程完成', timestamp: '2026-02-28T10:00:00Z' },

  // app-005/006/007: 进入资料录入阶段，尚无角色完成提交（SPM/底软/系统等虽已 entered+passed，但 reviewStatus 仍为 not_started，未点击提交审核）
  { id: 'h401', applicationId: 'app-005', action: '创建转维申请', operator: '张三', detail: '创建了 X7100_H4567(Android17) 的转维申请', timestamp: '2026-03-01T09:00:00Z' },
  { id: 'h501', applicationId: 'app-006', action: '创建转维申请', operator: '张三', detail: '创建了 X7200_H7890(Android16) 的转维申请', timestamp: '2026-02-25T10:00:00Z' },
  { id: 'h601', applicationId: 'app-007', action: '创建转维申请', operator: '冯十二', detail: '创建了 X7300_H2345(Android15) 的转维申请', timestamp: '2026-03-05T08:00:00Z' },

  // app-008: 5 角色资料录入完毕 + 5 角色维护审核通过；SQA 审核进行中（未出 SQA 终态事件）
  { id: 'h701', applicationId: 'app-008', action: '创建转维申请', operator: '张三', detail: '创建了 X7400_H6789(Android16) 的转维申请', timestamp: '2026-02-10T09:00:00Z' },
  { id: 'h702', applicationId: 'app-008', action: 'SPM 资料录入与AI检查完毕', operator: '张三', detail: 'SPM 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-01T10:00:00Z' },
  { id: 'h703', applicationId: 'app-008', action: '测试 资料录入与AI检查完毕', operator: '李四', detail: '测试 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-02T11:00:00Z' },
  { id: 'h704', applicationId: 'app-008', action: '底软 资料录入与AI检查完毕', operator: '赵六', detail: '底软 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-03T15:00:00Z' },
  { id: 'h705', applicationId: 'app-008', action: '系统 资料录入与AI检查完毕', operator: '钱七', detail: '系统 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-04T10:00:00Z' },
  { id: 'h706', applicationId: 'app-008', action: '影像 资料录入与AI检查完毕', operator: '蒋十六', detail: '影像 角色资料全部录入并通过 AI 检查，已提交维护审核', timestamp: '2026-03-05T14:00:00Z' },
  { id: 'h707', applicationId: 'app-008', action: 'SPM 维护审核通过', operator: '孙八', detail: 'SPM 角色维护审核全部通过', timestamp: '2026-03-15T10:00:00Z' },
  { id: 'h708', applicationId: 'app-008', action: '测试 维护审核通过', operator: '周九', detail: '测试 角色维护审核全部通过', timestamp: '2026-03-15T14:00:00Z' },
  { id: 'h709', applicationId: 'app-008', action: '底软 维护审核通过', operator: '吴十', detail: '底软 角色维护审核全部通过', timestamp: '2026-03-16T11:00:00Z' },
  { id: 'h710', applicationId: 'app-008', action: '系统 维护审核通过', operator: '郑十一', detail: '系统 角色维护审核全部通过', timestamp: '2026-03-17T10:00:00Z' },
  { id: 'h711', applicationId: 'app-008', action: '影像 维护审核通过', operator: '沈十七', detail: '影像 角色维护审核全部通过', timestamp: '2026-03-18T09:00:00Z' },
];

// ============================================================
// Mock待办任务
// ============================================================

export const MOCK_TODOS: TodoItem[] = [
  // === app-001: 资料录入进行中，全部角色录入中 (TEAM_APP001 研发侧) ===
  { id: 'todo-001', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '张三', type: 'entry' },
  { id: 'todo-002', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '李四', type: 'entry' },
  { id: 'todo-003', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '赵六', type: 'entry' },
  { id: 'todo-004', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '钱七', type: 'entry' },
  { id: 'todo-005', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '蒋十六', type: 'entry' },
  // === app-002: 维护审核进行中 (TEAM_APP002 维护侧) ===
  // 赵六：底软审核中(reviewing)
  { id: 'todo-006', applicationId: 'app-002', projectName: 'X6768_H5678(Android15)', node: '维护审核', responsiblePerson: '赵六', type: 'review' },
  // 王五(SQA)：SPM角色审核被拒绝，需SQA介入处理
  { id: 'todo-007', applicationId: 'app-002', projectName: 'X6768_H5678(Android15)', node: 'SQA审核', responsiblePerson: '王五', type: 'sqa_review' },
  // === app-005: 资料录入进行中，SPM已完成，其余角色继续 (TEAM_APP005 研发侧) ===
  { id: 'todo-008', applicationId: 'app-005', projectName: 'X7100_H4567(Android17)', node: '资料录入与AI检查', responsiblePerson: '李四', type: 'entry' },
  { id: 'todo-009', applicationId: 'app-005', projectName: 'X7100_H4567(Android17)', node: '资料录入与AI检查', responsiblePerson: '赵六', type: 'entry' },
  { id: 'todo-010', applicationId: 'app-005', projectName: 'X7100_H4567(Android17)', node: '资料录入与AI检查', responsiblePerson: '钱七', type: 'entry' },
  { id: 'todo-011', applicationId: 'app-005', projectName: 'X7100_H4567(Android17)', node: '资料录入与AI检查', responsiblePerson: '蒋十六', type: 'entry' },
  // === app-006: 资料录入进行中，底软/系统已完成 (TEAM_APP006 研发侧) ===
  { id: 'todo-012', applicationId: 'app-006', projectName: 'X7200_H7890(Android16)', node: '资料录入与AI检查', responsiblePerson: '张三', type: 'entry' },
  { id: 'todo-013', applicationId: 'app-006', projectName: 'X7200_H7890(Android16)', node: '资料录入与AI检查', responsiblePerson: '李四', type: 'entry' },
  { id: 'todo-014', applicationId: 'app-006', projectName: 'X7200_H7890(Android16)', node: '资料录入与AI检查', responsiblePerson: '蒋十六', type: 'entry' },
  // === app-007: 资料录入进行中，SPM/底软已完成 (TEAM_APP007 研发侧) ===
  { id: 'todo-015', applicationId: 'app-007', projectName: 'X7300_H2345(Android15)', node: '资料录入与AI检查', responsiblePerson: '陈十三', type: 'entry' },
  { id: 'todo-016', applicationId: 'app-007', projectName: 'X7300_H2345(Android15)', node: '资料录入与AI检查', responsiblePerson: '卫十五', type: 'entry' },
  { id: 'todo-017', applicationId: 'app-007', projectName: 'X7300_H2345(Android15)', node: '资料录入与AI检查', responsiblePerson: '蒋十六', type: 'entry' },
  // === app-008: SQA审核进行中 ===
  { id: 'todo-018', applicationId: 'app-008', projectName: 'X7400_H6789(Android16)', node: 'SQA审核', responsiblePerson: '王五', type: 'sqa_review' },
];
