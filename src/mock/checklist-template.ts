import type { CheckListTemplate } from '@/types';

// ============================================================
// 转维材料CheckList模板数据（来自CheckList模板.xlsx）
// ============================================================

export const MOCK_CHECKLIST_TEMPLATES: ReadonlyArray<CheckListTemplate> = [
  // === SPM 角色 (25条) ===
  { id: 'cl-001', type: '检查项', checkItem: 'IPM/SPUG项目信息完整无误、版本流程全部走完', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '通过IPM系统获取项目的所有版本计划的上市时间小于当前时间' },
  { id: 'cl-002', type: '检查项', checkItem: 'Super空间大小：规划N代升级预留N/GB大小', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本是否为描述当前项目的Super空间剩余大小' },
  { id: 'cl-003', type: '检查项', checkItem: '项目计划已文控归档（交接时提供截图）', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '如果是飞书链接，则检查飞书表格或者文档内容是否包含项目计划表；如果是截图，则提取图中内容，检查是否包含项目计划表' },
  { id: 'cl-004', type: '检查项', checkItem: '交接时，所有市场项目最新归档版本的GMS包需要与市场项目的最新配置保持一致', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述符合评审要素即可' },
  { id: 'cl-005', type: '检查项', checkItem: 'Jenkins编译界面所有参数需更新到准确', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '确认给出的文本里包含Jenkins链接即可' },
  { id: 'cl-006', type: '检查项', checkItem: '项目资料在固定服务器完成归档', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本里包含归档的飞书文档链接或NAS目录链接即可' },
  { id: 'cl-007', type: '检查项', checkItem: '项目客制化需求必须在SPD中有记录', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '如提供了SPD链接则检查SPD文档真实存在即可' },
  { id: 'cl-008', type: '检查项', checkItem: '确认OTA首版到最新量升版本中间无断开', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查OTA部署表文档真实存在即可' },
  { id: 'cl-009', type: '检查项', checkItem: '确认历史版本是否全市场推送', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查OTA部署表文档真实存在即可' },
  { id: 'cl-010', type: '检查项', checkItem: '转维前所有关键器件已经寿命结束前完成替代方案', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述符合评审要素即可' },
  { id: 'cl-011', type: '检查项', checkItem: '项目转维后续维护计划已确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述是否包含维护计划相关内容' },
  { id: 'cl-012', type: '检查项', checkItem: '售后系统权限已确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述是否包含售后系统权限确认相关内容' },
  { id: 'cl-013', type: '检查项', checkItem: 'PDTList信息更新确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述是否包含PDTList更新确认相关内容' },
  { id: 'cl-014', type: '检查项', checkItem: '版本命名规范确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查是否包含版本命名规范说明' },
  { id: 'cl-015', type: '检查项', checkItem: '出货国家清单确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述是否包含出货国家清单' },
  { id: 'cl-016', type: '检查项', checkItem: 'OTA服务端配置确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含OTA配置确认相关内容' },
  { id: 'cl-017', type: '检查项', checkItem: '三方应用升级策略确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含三方应用策略相关内容' },
  { id: 'cl-018', type: '检查项', checkItem: '安全补丁计划确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含安全补丁更新计划' },
  { id: 'cl-019', type: '检查项', checkItem: 'GMS认证状态确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含GMS认证状态信息' },
  { id: 'cl-020', type: '检查项', checkItem: '运营商定制需求确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本描述运营商定制相关内容' },
  { id: 'cl-021', type: '检查项', checkItem: '编译环境配置文档确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查是否包含编译环境配置文档链接' },
  { id: 'cl-022', type: '检查项', checkItem: '项目风险清单确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含项目风险相关内容' },
  { id: 'cl-023', type: '检查项', checkItem: '客户反馈问题清单已交接', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含客户反馈问题清单' },
  { id: 'cl-024', type: '检查项', checkItem: '版本分支管理策略确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含版本分支管理相关内容' },
  { id: 'cl-025', type: '检查项', checkItem: '知识库文档归档确认', responsibleRole: 'SPM', entryRole: '在研SPM', reviewRole: '维护SPM', aiCheckRule: '检查文本包含知识库归档链接' },

  // === 测试角色 (11条) ===
  { id: 'cl-026', type: '检查项', checkItem: '确认OTA首版到最新量升版本中间无断开', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查OTA部署表文档真实存在即可' },
  { id: 'cl-027', type: '检查项', checkItem: '确认历史版本是否全市场推送', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查OTA部署表文档真实存在即可' },
  { id: 'cl-028', type: '交接资料', checkItem: '测试用例库交接', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含测试用例库链接' },
  { id: 'cl-029', type: '交接资料', checkItem: '自动化测试脚本交接', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含自动化脚本仓库链接' },
  { id: 'cl-030', type: '交接资料', checkItem: '测试环境配置文档', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含测试环境配置文档链接' },
  { id: 'cl-031', type: '检查项', checkItem: '遗留Bug清单确认', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含遗留Bug清单链接' },
  { id: 'cl-032', type: '检查项', checkItem: '兼容性测试报告确认', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含兼容性测试报告' },
  { id: 'cl-033', type: '检查项', checkItem: '性能测试基线确认', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含性能测试基线数据' },
  { id: 'cl-034', type: '交接资料', checkItem: '测试工具和许可证交接', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含测试工具和许可证信息' },
  { id: 'cl-035', type: '检查项', checkItem: '回归测试策略确认', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含回归测试策略' },
  { id: 'cl-036', type: '检查项', checkItem: '测试报告模板确认', responsibleRole: '测试', entryRole: '在研TPM', reviewRole: '维护TPM', aiCheckRule: '检查文本包含测试报告模板' },

  // === 底软角色 (11条) ===
  { id: 'cl-037', type: '交接资料', checkItem: '硬件散热方案/限流参数/CPU thermal参数/温升特殊软件策略', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含温升/热设计相关文档链接' },
  { id: 'cl-038', type: '交接资料', checkItem: 'BSP驱动源码及编译文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含BSP驱动源码仓库链接' },
  { id: 'cl-039', type: '交接资料', checkItem: '硬件原理图和Layout文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含硬件文档链接' },
  { id: 'cl-040', type: '交接资料', checkItem: '关键驱动模块技术文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含驱动技术文档链接' },
  { id: 'cl-041', type: '检查项', checkItem: 'Kernel定制化补丁清单', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含Kernel补丁清单' },
  { id: 'cl-042', type: '交接资料', checkItem: '功耗优化方案文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含功耗优化文档链接' },
  { id: 'cl-043', type: '检查项', checkItem: '外设驱动兼容性列表', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含外设兼容性列表' },
  { id: 'cl-044', type: '交接资料', checkItem: '安全启动配置文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含安全启动配置信息' },
  { id: 'cl-045', type: '检查项', checkItem: 'Bootloader版本及升级策略', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含Bootloader相关信息' },
  { id: 'cl-046', type: '交接资料', checkItem: '底软调试工具和方法文档', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含调试工具文档' },
  { id: 'cl-047', type: '检查项', checkItem: '底软已知问题清单', responsibleRole: '底软', entryRole: '在研底软集成开发代表', reviewRole: '维护底软集成开发代表', aiCheckRule: '检查文本包含底软已知问题清单' },

  // === 系统角色 (5条) ===
  { id: 'cl-048', type: '交接资料', checkItem: '系统集成编译配置文档', responsibleRole: '系统', entryRole: '在研系统集成开发代表', reviewRole: '维护系统集成开发代表', aiCheckRule: '检查文本包含系统集成编译配置' },
  { id: 'cl-049', type: '交接资料', checkItem: '系统定制化方案文档', responsibleRole: '系统', entryRole: '在研系统集成开发代表', reviewRole: '维护系统集成开发代表', aiCheckRule: '检查文本包含系统定制化方案' },
  { id: 'cl-050', type: '检查项', checkItem: '系统级别已知问题清单', responsibleRole: '系统', entryRole: '在研系统集成开发代表', reviewRole: '维护系统集成开发代表', aiCheckRule: '检查文本包含系统已知问题清单' },
  { id: 'cl-051', type: '交接资料', checkItem: 'Framework定制化修改清单', responsibleRole: '系统', entryRole: '在研系统集成开发代表', reviewRole: '维护系统集成开发代表', aiCheckRule: '检查文本包含Framework修改清单' },
  { id: 'cl-052', type: '交接资料', checkItem: '系统性能优化方案', responsibleRole: '系统', entryRole: '在研系统集成开发代表', reviewRole: '维护系统集成开发代表', aiCheckRule: '检查文本包含系统性能优化方案' },
];
