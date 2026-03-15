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
  SPM: 'SPM', '测试': 'TPM', '底软': '底软', '系统': '系统',
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
      entryPerson: entryPerson?.name ?? '-',
      entryPersonId: entryPerson?.id ?? '',
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
      entryPerson: entryPerson?.name ?? '-',
      entryPersonId: entryPerson?.id ?? '',
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
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM' as const, department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软' as const, department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统' as const, department: '系统集成部' },
  ],
};

const TEAM_APP002 = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软' as const, department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统' as const, department: '系统集成部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
  ],
};

const TEAM_APP003 = {
  research: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM' as const, department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软' as const, department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统' as const, department: '系统集成部' },
  ],
};

const TEAM_APP004 = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM' as const, department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA' as const, department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软' as const, department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统' as const, department: '系统集成部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM' as const, department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM' as const, department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软' as const, department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统' as const, department: '系统集成部' },
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
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'in_progress', reviewStatus: 'not_started' },
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
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'in_progress' },
        { role: '测试', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'in_progress' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'completed' },
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
      infoChange: 'not_started',
      roleProgress: [
        { role: 'SPM', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '测试', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'not_started', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'not_started', reviewStatus: 'not_started' },
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
      infoChange: 'success',
      roleProgress: [
        { role: 'SPM', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '测试', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '底软', entryStatus: 'completed', reviewStatus: 'completed' },
        { role: '系统', entryStatus: 'completed', reviewStatus: 'completed' },
      ],
    },
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-28T17:00:00Z',
  },
];

// ============================================================
// app-001: X6870 — 资料录入进行中（各角色部分录入）
// SPM(25条): 前5条已录入通过, 其余未录入
// 测试(11条): 前3条已录入通过, 其余未录入
// 底软(11条): 第1条暂存, 其余未录入
// 系统(5条): 第1条已录入但AI检查失败, 其余未录入
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
  // 底软: indices 36-46, 第1条(36)暂存
  36: { entryContent: '散热方案文档整理中\n\\\\192.168.1.100\\projects\\x6870\\thermal', entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed' },
  // 系统: indices 47-51, 第1条(47)已录入但AI失败
  47: { entryContent: '系统集成配置文档：https://feishu.cn/docs/xxx', entryStatus: 'entered', aiCheckStatus: 'failed', aiCheckResult: '未检测到有效的系统编译配置文档链接，提供的链接无法访问', reviewStatus: 'not_reviewed' },
};

const APP001_RE_OVERRIDES: Record<number, ItemOverride> = {
  // SPM评审要素: indices 0-4, 第1条已录入通过
  0: { entryContent: 'IPM系统版本计划与实际上市时间一致，详见附件', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
  // 底软评审要素: indices 5-9, 第1条已录入通过
  5: { entryContent: 'BSP驱动源码仓库：https://git.internal/bsp/x6870', entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed' },
};

// ============================================================
// app-002: X6768 — 资料全部录入完成，维护审核进行中
// 所有checklist和review elements均已录入通过
// SPM: 审核中(reviewing)
// 测试: 已通过
// 底软: 审核中(reviewing)
// 系统: 已通过
// ============================================================

function makeApp002ClOverrides(): Record<number, ItemOverride> {
  const ov: Record<number, ItemOverride> = {};
  // SPM (0-24): all entered+passed, reviewStatus=reviewing
  for (let i = 0; i <= 24; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  // 测试 (25-35): all entered+passed, reviewStatus=passed
  for (let i = 25; i <= 35; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  // 底软 (36-46): all entered+passed, reviewStatus=reviewing
  for (let i = 36; i <= 46; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  // 系统 (47-51): all entered+passed, reviewStatus=passed
  for (let i = 47; i <= 51; i++) ov[i] = ENTERED_PASSED_REVIEWED;
  return ov;
}

function makeApp002ReOverrides(): Record<number, ItemOverride> {
  const ov: Record<number, ItemOverride> = {};
  // SPM (0-4): reviewing
  for (let i = 0; i <= 4; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  // 底软 (5-9): reviewing
  for (let i = 5; i <= 9; i++) ov[i] = ENTERED_PASSED_REVIEWING;
  // 系统 (10-14): passed
  for (let i = 10; i <= 14; i++) ov[i] = ENTERED_PASSED_REVIEWED;
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
// Generate complete items
// ============================================================

export const MOCK_CHECKLIST_ITEMS: CheckListItem[] = [
  ...generateChecklist('app-001', TEAM_APP001.research, TEAM_APP001.maintenance, APP001_CL_OVERRIDES),
  ...generateChecklist('app-002', TEAM_APP002.research, TEAM_APP002.maintenance, makeApp002ClOverrides()),
  // app-003: cancelled, no items needed (but generate empty for consistency)
  ...generateChecklist('app-004', TEAM_APP004.research, TEAM_APP004.maintenance, makeApp004Overrides(52)),
];

export const MOCK_REVIEW_ELEMENTS: ReviewElement[] = [
  ...generateReviewEls('app-001', TEAM_APP001.research, TEAM_APP001.maintenance, APP001_RE_OVERRIDES),
  ...generateReviewEls('app-002', TEAM_APP002.research, TEAM_APP002.maintenance, makeApp002ReOverrides()),
  ...generateReviewEls('app-004', TEAM_APP004.research, TEAM_APP004.maintenance, makeApp004Overrides(15)),
];

// ============================================================
// Mock Block任务
// ============================================================

export const MOCK_BLOCK_TASKS: BlockTask[] = [
  {
    id: 'bt-001', applicationId: 'app-001',
    description: '核心服务模块响应时间过长，影响用户操作',
    resolution: '对数据库查询进行索引优化，并引入缓存机制',
    responsiblePerson: '赵六', department: '底软开发部',
    deadline: '2026-03-20', status: 'open', createdAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'bt-002', applicationId: 'app-001',
    description: '系统编译配置文档链接无法访问',
    resolution: '重新整理编译配置文档并上传到飞书云盘',
    responsiblePerson: '钱七', department: '系统集成部',
    deadline: '2026-03-18', status: 'open', createdAt: '2026-03-12T11:00:00Z',
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

export const MOCK_HISTORY: HistoryRecord[] = [
  { id: 'h001', applicationId: 'app-001', action: '创建转维申请', operator: '张三', detail: '创建了X6870_H1234(Android16)的转维申请', timestamp: '2026-03-10T10:00:00Z' },
  { id: 'h002', applicationId: 'app-001', action: '项目发起完成', operator: '系统', detail: '自动完成项目发起节点，进入资料录入阶段', timestamp: '2026-03-10T10:00:05Z' },
  { id: 'h003', applicationId: 'app-001', action: '资料录入', operator: '张三', detail: 'SPM角色：录入了"IPM/SPUG项目信息完整无误"的资料', timestamp: '2026-03-11T09:30:00Z' },
  { id: 'h004', applicationId: 'app-001', action: 'AI检查通过', operator: '系统', detail: 'SPM角色：IPM/SPUG项目信息检查通过', timestamp: '2026-03-11T09:31:00Z' },
  { id: 'h005', applicationId: 'app-001', action: '资料录入', operator: '李四', detail: '测试角色：录入了"确认OTA首版到最新量升版本中间无断开"的资料', timestamp: '2026-03-11T14:00:00Z' },
  { id: 'h006', applicationId: 'app-001', action: 'AI检查不通过', operator: '系统', detail: '系统角色：AI检查不通过，系统编译配置文档链接无法访问，已创建Block任务', timestamp: '2026-03-12T11:00:00Z' },
];

// ============================================================
// Mock待办任务
// ============================================================

export const MOCK_TODOS: TodoItem[] = [
  { id: 'todo-001', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '张三', type: 'entry' },
  { id: 'todo-002', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '赵六', type: 'entry' },
  { id: 'todo-003', applicationId: 'app-002', projectName: 'X6768_H5678(Android15)', node: '维护审核', responsiblePerson: '张三', type: 'review' },
  { id: 'todo-004', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '钱七', type: 'entry' },
];
