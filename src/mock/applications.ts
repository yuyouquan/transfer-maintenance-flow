import type {
  TransferApplication,
  CheckListItem,
  ReviewElement,
  BlockTask,
  LegacyTask,
  HistoryRecord,
  TodoItem,
} from '@/types';

// ============================================================
// Mock转维电子流申请数据
// ============================================================

export const MOCK_APPLICATIONS: TransferApplication[] = [
  {
    id: 'app-001',
    projectId: 'proj001',
    projectName: 'X6870_H1234(Android16)',
    applicant: '张三',
    applicantId: 'u001',
    team: {
      research: [
        { id: 'u001', name: '张三', role: 'SPM', department: '项目管理部' },
        { id: 'u002', name: '李四', role: 'TPM', department: '测试部' },
        { id: 'u003', name: '王五', role: 'SQA', department: '质量部' },
        { id: 'u004', name: '赵六', role: '底软', department: '底软开发部' },
        { id: 'u005', name: '钱七', role: '系统', department: '系统集成部' },
      ],
      maintenance: [
        { id: 'u006', name: '孙八', role: 'SPM', department: '项目管理部' },
        { id: 'u007', name: '周九', role: 'TPM', department: '测试部' },
        { id: 'u008', name: '吴十', role: '底软', department: '底软开发部' },
        { id: 'u009', name: '郑十一', role: '系统', department: '系统集成部' },
      ],
    },
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
        { role: '测试', entryStatus: 'completed', reviewStatus: 'not_started' },
        { role: '底软', entryStatus: 'in_progress', reviewStatus: 'not_started' },
        { role: '系统', entryStatus: 'rejected', reviewStatus: 'not_started' },
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
    team: {
      research: [
        { id: 'u010', name: '冯十二', role: 'SPM', department: '项目管理部' },
        { id: 'u011', name: '陈十三', role: 'TPM', department: '测试部' },
        { id: 'u003', name: '王五', role: 'SQA', department: '质量部' },
        { id: 'u012', name: '褚十四', role: '底软', department: '底软开发部' },
        { id: 'u013', name: '卫十五', role: '系统', department: '系统集成部' },
      ],
      maintenance: [
        { id: 'u001', name: '张三', role: 'SPM', department: '项目管理部' },
        { id: 'u002', name: '李四', role: 'TPM', department: '测试部' },
        { id: 'u004', name: '赵六', role: '底软', department: '底软开发部' },
        { id: 'u005', name: '钱七', role: '系统', department: '系统集成部' },
      ],
    },
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
    team: {
      research: [
        { id: 'u001', name: '张三', role: 'SPM', department: '项目管理部' },
        { id: 'u002', name: '李四', role: 'TPM', department: '测试部' },
        { id: 'u003', name: '王五', role: 'SQA', department: '质量部' },
        { id: 'u004', name: '赵六', role: '底软', department: '底软开发部' },
        { id: 'u005', name: '钱七', role: '系统', department: '系统集成部' },
      ],
      maintenance: [
        { id: 'u006', name: '孙八', role: 'SPM', department: '项目管理部' },
        { id: 'u007', name: '周九', role: 'TPM', department: '测试部' },
        { id: 'u008', name: '吴十', role: '底软', department: '底软开发部' },
        { id: 'u009', name: '郑十一', role: '系统', department: '系统集成部' },
      ],
    },
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
];

// ============================================================
// Mock CheckList数据（app-001的部分数据）
// ============================================================

export const MOCK_CHECKLIST_ITEMS: CheckListItem[] = [
  {
    id: 'cli-001', applicationId: 'app-001', seq: 1,
    type: '检查项', checkItem: 'IPM/SPUG项目信息完整无误、版本流程全部走完',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '通过IPM系统获取项目的所有版本计划的上市时间小于当前时间',
    deliverables: [{ id: 'd001', name: 'IPM项目截图.png', url: '#', type: 'file' }],
    entryContent: 'IPM系统确认所有版本计划已完成，上市时间均在当前时间之前',
    entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-002', applicationId: 'app-001', seq: 2,
    type: '检查项', checkItem: 'Super空间大小：规划N代升级预留N/GB大小',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '检查文本是否为描述当前项目的Super空间剩余大小',
    deliverables: [],
    entryContent: 'Super空间剩余3.2GB，规划2代升级预留',
    entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-003', applicationId: 'app-001', seq: 3,
    type: '检查项', checkItem: '项目计划已文控归档（交接时提供截图）',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '检查是否包含项目计划表',
    deliverables: [{ id: 'd003', name: '项目计划归档截图.png', url: '#', type: 'file' }],
    entryStatus: 'entered', aiCheckStatus: 'in_progress', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-004', applicationId: 'app-001', seq: 4,
    type: '检查项', checkItem: 'Jenkins编译界面所有参数需更新到准确',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '确认给出的文本里包含Jenkins链接即可',
    deliverables: [],
    entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-005', applicationId: 'app-001', seq: 5,
    type: '检查项', checkItem: '确认OTA首版到最新量升版本中间无断开',
    responsibleRole: '测试', entryPerson: '李四', entryPersonId: 'u002',
    reviewPerson: '周九', reviewPersonId: 'u007',
    aiCheckRule: '检查OTA部署表文档真实存在即可',
    deliverables: [{ id: 'd005', name: 'OTA部署表.xlsx', url: '#', type: 'file' }],
    entryContent: '确认OTA版本链路完整，无断开情况',
    entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-006', applicationId: 'app-001', seq: 6,
    type: '交接资料', checkItem: '硬件散热方案/限流参数/CPU thermal参数',
    responsibleRole: '底软', entryPerson: '赵六', entryPersonId: 'u004',
    reviewPerson: '吴十', reviewPersonId: 'u008',
    aiCheckRule: '检查文本包含温升/热设计相关文档链接',
    deliverables: [],
    entryStatus: 'draft', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed',
  },
  {
    id: 'cli-007', applicationId: 'app-001', seq: 7,
    type: '交接资料', checkItem: '系统集成编译配置文档',
    responsibleRole: '系统', entryPerson: '钱七', entryPersonId: 'u005',
    reviewPerson: '郑十一', reviewPersonId: 'u009',
    aiCheckRule: '检查文本包含系统集成编译配置',
    deliverables: [],
    entryContent: '系统集成配置文档：https://feishu.cn/docs/xxx',
    entryStatus: 'entered', aiCheckStatus: 'failed',
    aiCheckResult: '未检测到有效的系统编译配置文档链接，提供的链接无法访问',
    reviewStatus: 'not_reviewed',
  },
];

// ============================================================
// Mock评审要素数据
// ============================================================

export const MOCK_REVIEW_ELEMENTS: ReviewElement[] = [
  {
    id: 'rei-001', applicationId: 'app-001', seq: 1,
    standard: '项目管理', description: '查看项目版本计划与实际上市时间是否一致',
    remark: '需提供IPM系统截图或链接',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '检查文本是否包含IPM系统截图或链接',
    deliverables: [{ id: 'rd001', name: 'IPM版本计划.pdf', url: '#', type: 'file' }],
    entryContent: 'IPM系统版本计划与实际上市时间一致，详见附件',
    entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed',
  },
  {
    id: 'rei-002', applicationId: 'app-001', seq: 2,
    standard: '文档归档', description: '确认项目关键文档已归档到指定服务器',
    remark: '包括项目计划、SPD、产品价值表等',
    responsibleRole: 'SPM', entryPerson: '张三', entryPersonId: 'u001',
    reviewPerson: '孙八', reviewPersonId: 'u006',
    aiCheckRule: '检查文本中是否包含归档服务器链接',
    deliverables: [],
    entryStatus: 'not_entered', aiCheckStatus: 'not_started', reviewStatus: 'not_reviewed',
  },
  {
    id: 'rei-003', applicationId: 'app-001', seq: 3,
    standard: '驱动完整性', description: '确认所有关键驱动模块已完整交接',
    remark: '包括源码、文档、调试工具',
    responsibleRole: '底软', entryPerson: '赵六', entryPersonId: 'u004',
    reviewPerson: '吴十', reviewPersonId: 'u008',
    aiCheckRule: '检查文本是否包含驱动源码仓库链接和技术文档',
    deliverables: [],
    entryContent: 'BSP驱动源码仓库：https://git.internal/bsp/x6870',
    entryStatus: 'entered', aiCheckStatus: 'passed', reviewStatus: 'not_reviewed',
  },
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
  { id: 'h006', applicationId: 'app-001', action: '创建Block任务', operator: '郑十一', detail: '系统角色维护审核不通过，创建Block任务：系统编译配置文档链接无法访问', timestamp: '2026-03-12T11:00:00Z' },
];

// ============================================================
// Mock待办任务
// ============================================================

export const MOCK_TODOS: TodoItem[] = [
  { id: 'todo-001', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '张三', type: 'entry' },
  { id: 'todo-002', applicationId: 'app-001', projectName: 'X6870_H1234(Android16)', node: '资料录入与AI检查', responsiblePerson: '赵六', type: 'entry' },
  { id: 'todo-003', applicationId: 'app-002', projectName: 'X6768_H5678(Android15)', node: '维护审核', responsiblePerson: '张三', type: 'review' },
];
