export type ProjectType = 'device' | 'tos';
export type TemplateKind = 'checklist' | 'review_element';

export interface TransferRole {
  readonly id: string;
  readonly name: string;
  readonly ipmRoleCode: string;
  readonly isSpm?: boolean;
}

/** Role fields hold stable role IDs; seq is the user-provided business identifier. */
export interface TemplateRow {
  readonly id: string;
  readonly seq: string;
  readonly content: string;
  readonly type: string;
  readonly remark?: string;
  readonly responsibleRole: string;
  readonly entryRole: string;
  readonly reviewRole: string;
  readonly aiCheckRule: string;
}

export interface MaterialTemplateVersion {
  readonly id: string;
  readonly version: string;
  readonly createdAt: string;
  readonly rows: ReadonlyArray<TemplateRow>;
}

export interface ProjectConfiguration {
  readonly roles: ReadonlyArray<TransferRole>;
  readonly checklistVersions: ReadonlyArray<MaterialTemplateVersion>;
  readonly reviewVersions: ReadonlyArray<MaterialTemplateVersion>;
}

export type TransferConfigurations = Readonly<Record<ProjectType, ProjectConfiguration>>;

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  device: '整机产品项目',
  tos: 'tOS版本项目',
};

/** Demonstration mappings only: replace these with real IPM codes at integration time. */
export const DEFAULT_TRANSFER_ROLES: ReadonlyArray<TransferRole> = [
  { id: 'SPM', name: 'SPM', ipmRoleCode: 'MOCK_SPM', isSpm: true },
  { id: '测试', name: '测试', ipmRoleCode: 'MOCK_TPM' },
  { id: '底软', name: '底软', ipmRoleCode: 'MOCK_BSP' },
  { id: '系统', name: '系统', ipmRoleCode: 'MOCK_SYSTEM' },
  { id: '影像', name: '影像', ipmRoleCode: 'MOCK_IMAGE' },
];
