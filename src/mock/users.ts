import type { TeamMember, Project, ProjectTeam } from '@/types';

// ============================================================
// Mock用户数据
// ============================================================

export const MOCK_USERS: ReadonlyArray<TeamMember> = [
  { id: 'u001', name: '张三', role: 'SPM', avatar: '', department: '项目管理部' },
  { id: 'u002', name: '李四', role: 'TPM', avatar: '', department: '测试部' },
  { id: 'u003', name: '王五', role: 'SQA', avatar: '', department: '质量部' },
  { id: 'u004', name: '赵六', role: '底软', avatar: '', department: '底软开发部' },
  { id: 'u005', name: '钱七', role: '系统', avatar: '', department: '系统集成部' },
  { id: 'u006', name: '孙八', role: 'SPM', avatar: '', department: '项目管理部' },
  { id: 'u007', name: '周九', role: 'TPM', avatar: '', department: '测试部' },
  { id: 'u008', name: '吴十', role: '底软', avatar: '', department: '底软开发部' },
  { id: 'u009', name: '郑十一', role: '系统', avatar: '', department: '系统集成部' },
  { id: 'u010', name: '冯十二', role: 'SPM', avatar: '', department: '项目管理部' },
  { id: 'u011', name: '陈十三', role: 'TPM', avatar: '', department: '测试部' },
  { id: 'u012', name: '褚十四', role: '底软', avatar: '', department: '底软开发部' },
  { id: 'u013', name: '卫十五', role: '系统', avatar: '', department: '系统集成部' },
  { id: 'u014', name: '蒋十六', role: '影像', avatar: '', department: '影像开发部' },
  { id: 'u015', name: '沈十七', role: '影像', avatar: '', department: '影像开发部' },
];

/** 当前登录用户 */
export const CURRENT_USER: TeamMember = MOCK_USERS[0];

// ============================================================
// Mock项目数据
// ============================================================

const TEAM_1: ProjectTeam = {
  research: [
    { id: 'u001', name: '张三', role: 'SPM', department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM', department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA', department: '质量部' },
    { id: 'u004', name: '赵六', role: '底软', department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统', department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像', department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u006', name: '孙八', role: 'SPM', department: '项目管理部' },
    { id: 'u007', name: '周九', role: 'TPM', department: '测试部' },
    { id: 'u008', name: '吴十', role: '底软', department: '底软开发部' },
    { id: 'u009', name: '郑十一', role: '系统', department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像', department: '影像开发部' },
  ],
};

const TEAM_2: ProjectTeam = {
  research: [
    { id: 'u010', name: '冯十二', role: 'SPM', department: '项目管理部' },
    { id: 'u011', name: '陈十三', role: 'TPM', department: '测试部' },
    { id: 'u003', name: '王五', role: 'SQA', department: '质量部' },
    { id: 'u012', name: '褚十四', role: '底软', department: '底软开发部' },
    { id: 'u013', name: '卫十五', role: '系统', department: '系统集成部' },
    { id: 'u014', name: '蒋十六', role: '影像', department: '影像开发部' },
  ],
  maintenance: [
    { id: 'u001', name: '张三', role: 'SPM', department: '项目管理部' },
    { id: 'u002', name: '李四', role: 'TPM', department: '测试部' },
    { id: 'u004', name: '赵六', role: '底软', department: '底软开发部' },
    { id: 'u005', name: '钱七', role: '系统', department: '系统集成部' },
    { id: 'u015', name: '沈十七', role: '影像', department: '影像开发部' },
  ],
};

export const MOCK_PROJECTS: ReadonlyArray<Project> = [
  { id: 'proj001', name: 'X6870_H1234(Android16)', code: 'X6870_H1234', team: TEAM_1 },
  { id: 'proj002', name: 'X6768_H5678(Android15)', code: 'X6768_H5678', team: TEAM_2 },
  { id: 'proj003', name: 'X6980_H9012(Android17)', code: 'X6980_H9012', team: TEAM_1 },
  { id: 'proj005', name: 'X7100_H4567(Android17)', code: 'X7100_H4567', team: TEAM_1 },
  { id: 'proj006', name: 'X7200_H7890(Android16)', code: 'X7200_H7890', team: TEAM_1 },
  { id: 'proj007', name: 'X7300_H2345(Android15)', code: 'X7300_H2345', team: TEAM_2 },
];
