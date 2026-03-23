// ============================================================
// 转维电子流系统 - 核心类型定义
// ============================================================

// --- 枚举类型 ---

/** 流水线主节点状态 */
export type PipelineNodeStatus = 'not_started' | 'in_progress' | 'success' | 'failed';

/** 角色子节点状态 */
export type RoleNodeStatus = 'not_started' | 'in_progress' | 'completed' | 'rejected';

/** 录入状态 */
export type EntryStatus = 'not_entered' | 'draft' | 'entered';

/** AI检查状态 */
export type AICheckStatus = 'not_started' | 'in_progress' | 'passed' | 'failed';

/** 维护审核状态 */
export type ReviewStatus = 'not_reviewed' | 'reviewing' | 'passed' | 'rejected';

/** 流水线整体状态 */
export type PipelineStatus = 'in_progress' | 'completed' | 'cancelled';

/** 角色类型 */
export type RoleType = 'SPM' | 'TPM' | 'SQA' | '底软' | '系统' | '影像';

/** 流水线角色（五个并行角色） */
export type PipelineRole = 'SPM' | '测试' | '底软' | '系统' | '影像';

/** 团队类型 */
export type TeamType = 'research' | 'maintenance';

// --- 人员相关 ---

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: RoleType;
  readonly avatar?: string;
  readonly department?: string;
}

export interface ProjectTeam {
  readonly research: ReadonlyArray<TeamMember>;
  readonly maintenance: ReadonlyArray<TeamMember>;
}

// --- 项目相关 ---

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly team: ProjectTeam;
}

// --- 转维电子流申请 ---

export interface TransferApplication {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly applicant: string;
  readonly applicantId: string;
  readonly team: ProjectTeam;
  readonly plannedReviewDate: string;
  readonly remark: string;
  readonly status: PipelineStatus;
  readonly cancelReason?: string;
  readonly pipeline: PipelineState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- 流水线状态 ---

export interface RoleProgress {
  readonly role: PipelineRole;
  readonly entryStatus: RoleNodeStatus;
  readonly reviewStatus: RoleNodeStatus;
}

export interface PipelineState {
  readonly projectInit: PipelineNodeStatus;
  readonly dataEntry: PipelineNodeStatus;
  readonly maintenanceReview: PipelineNodeStatus;
  readonly sqaReview: PipelineNodeStatus;
  readonly infoChange: PipelineNodeStatus;
  readonly roleProgress: ReadonlyArray<RoleProgress>;
}

// --- CheckList（转维材料） ---

export interface CheckListItem {
  readonly id: string;
  readonly applicationId: string;
  readonly seq: number;
  readonly type: string;
  readonly checkItem: string;
  readonly responsibleRole: PipelineRole;
  readonly entryPerson: string;
  readonly entryPersonId: string;
  readonly reviewPerson: string;
  readonly reviewPersonId: string;
  readonly aiCheckRule: string;
  readonly deliverables: ReadonlyArray<Deliverable>;
  readonly entryContent?: string;
  readonly entryStatus: EntryStatus;
  readonly aiCheckStatus: AICheckStatus;
  readonly aiCheckResult?: string;
  readonly reviewStatus: ReviewStatus;
  readonly reviewComment?: string;
  readonly delegatedTo?: ReadonlyArray<string>;
}

// --- 评审要素 ---

export interface ReviewElement {
  readonly id: string;
  readonly applicationId: string;
  readonly seq: number;
  readonly standard: string;
  readonly description: string;
  readonly remark: string;
  readonly responsibleRole: PipelineRole;
  readonly entryPerson: string;
  readonly entryPersonId: string;
  readonly reviewPerson: string;
  readonly reviewPersonId: string;
  readonly aiCheckRule: string;
  readonly deliverables: ReadonlyArray<Deliverable>;
  readonly entryContent?: string;
  readonly entryStatus: EntryStatus;
  readonly aiCheckStatus: AICheckStatus;
  readonly aiCheckResult?: string;
  readonly reviewStatus: ReviewStatus;
  readonly reviewComment?: string;
  readonly delegatedTo?: ReadonlyArray<string>;
}

// --- 交付件 ---

export interface Deliverable {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly type: 'file' | 'link';
}

// --- Block任务 ---

export interface BlockTask {
  readonly id: string;
  readonly applicationId: string;
  readonly description: string;
  readonly resolution: string;
  readonly responsiblePerson: string;
  readonly department: string;
  readonly deadline: string;
  readonly status: 'open' | 'resolved' | 'cancelled';
  readonly createdAt: string;
}

// --- 遗留任务 ---

export interface LegacyTask {
  readonly id: string;
  readonly applicationId: string;
  readonly responsiblePerson: string;
  readonly department: string;
  readonly description: string;
  readonly deadline: string;
  readonly status: 'open' | 'resolved' | 'cancelled';
  readonly createdAt: string;
}

// --- 历史记录 ---

export interface HistoryRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly action: string;
  readonly operator: string;
  readonly detail: string;
  readonly timestamp: string;
}

// --- 待办任务 ---

export interface TodoItem {
  readonly id: string;
  readonly applicationId: string;
  readonly projectName: string;
  readonly node: string;
  readonly responsiblePerson: string;
  readonly type: 'entry' | 'review';
}

// --- 配置中心模板 ---

export interface CheckListTemplate {
  readonly id: string;
  readonly type: string;
  readonly checkItem: string;
  readonly responsibleRole: PipelineRole;
  readonly entryRole: string;
  readonly reviewRole: string;
  readonly aiCheckRule: string;
}

export interface ReviewElementTemplate {
  readonly id: string;
  readonly standard: string;
  readonly description: string;
  readonly remark: string;
  readonly responsibleRole: string;
  readonly entryRole: string;
  readonly reviewRole: string;
  readonly aiCheckRule: string;
}

export interface TemplateVersion {
  readonly id: string;
  readonly version: string;
  readonly type: 'checklist' | 'review_element';
  readonly createdAt: string;
  readonly createdBy: string;
  readonly itemCount: number;
}

// --- 关闭流水线评审状态 ---

export interface CloseReviewRow {
  readonly role: PipelineRole | 'TPM';
  readonly responsiblePerson: string;
  readonly conclusion: 'N/A' | 'PASS' | 'Fail';
  readonly comment: string;
}

// --- 列表查询参数 ---

export interface ApplicationListParams {
  readonly keyword?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedResult<T> {
  readonly data: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
