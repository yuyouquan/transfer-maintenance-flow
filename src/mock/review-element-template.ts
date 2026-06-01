import type { ReviewElementTemplate } from '@/types';

// ============================================================
// 评审要素模板数据（来自评审要素模板.xlsx）
// ============================================================

export const MOCK_REVIEW_ELEMENT_TEMPLATES: ReadonlyArray<ReviewElementTemplate> = [
  // === SPM角色 (5条) ===
  {
    id: 're-001',
    standard: '项目管理',
    description: `遗留问题：
1. 转维前超过一周的必解问题：必须闭环清零（close状态）。不影响版本外发且短期无法闭环的问题.如果有明确解决计划.可以由原owner跟踪闭环.不影响转维。
2. 转维前一周内新增的必解问题：原owner继续跟踪解决.但不影响转维。
3. 转维前的非必解问题（随主干解决、下个tOS版本解决）：原owner继续跟踪。后续若该类问题升级为必解问题.维护部门负责解决。
4. 已知机动场测问题（机动场测问题需要在机动场测人员离开前解决）=0
5. 谷歌pip（performance improve program）问题=0`,
    remark: `project IN (X6873-H972, tOS15.1.0) AND issuetype = Bug AND resolution is empty AND "Affect Project" = X6873-H972  AND (priority = Blocker OR Tag  IN ("MP Block", "MR1 Block", "MR Block", "量升必解", "MR2必解", "MR3必解") OR "Must Resolve" = "MP Block") AND created < "-7d"

project IN (X6873-H972-AeeExpAuto) AND issuetype = Bug AND resolution is empty AND "Affect Project" = X6873-H972  AND (priority = Blocker OR Tag  IN ("MP Block", "MR1 Block", "MR Block", "量升必解", "MR2必解", "MR3必解") OR "Must Resolve" = "MP Block") AND created < "-7d"`,
    responsibleRole: 'SPM',
    entryRole: '在研SPM',
    reviewRole: '维护SPM',
    aiCheckRule: `1）填写内容形态（必须满足其一）

提供可追溯入口：JIRA查询链接（推荐含 jql=）或直接粘贴JQL语句；可分“项目库/Monkey库/tOS库(含 Affect Project)/海外库/粉丝库”多段给出。
允许仅填“项目库必解问题（JIRA链接）”这类简写，但链接需能打开到对应查询结果页。
2）查询逻辑完整性校验（能做则做，做不到则降级为文本逻辑校验）

必解/Block清零查询：JQL/链接中应包含以下任意组合来覆盖标准口径：
priority = Blocker 或 Tag in ("MP Block","MR Block","MR1 Block",…,"必解","量升必解"等)
issuetype = Bug（或等价）
状态需覆盖非Close态（常见：Open/In Progress/Reopened/Resolved/Fixed/Verified 等）
tOS库必须包含：project = tOS库 且 "Affect Project" = <项目代号>（或等价字段）。
B/C类待验证清零查询：JQL/链接中应能识别“待验证口径”，如 status in (Resolved, Verified) 且 priority in (Critical, Major)（或等价的B/C映射条件）。
3）结果判定（系统若可拉取JIRA结果则以结果为准）

通过：
各库（适用范围内）的“必解/MP/MR/Block/Blocker”查询结果 = 0；且“B/C待验证”查询结果 = 0；
或用户明确写明“遗留0/清零/无”，同时提供上述查询入口（链接/JQL）且逻辑完整。
条件通过（有遗留但可转维）：当查询/文本显示非0时，需满足说明中的例外并在备注/正文写清：
超过7天的必解问题：原则应 Close=0；若仍未闭环，必须列出 issue key + 当前状态 + 不影响版本外发说明 + 明确解决计划/owner（原owner继续跟踪）。
一周内新增必解问题：可不阻转维，但必须列出 issue key + 由原owner继续跟踪的说明。
非必解问题：允许遗留，但需写“由原owner继续跟踪/随主干或下个tOS解决”的归属说明。
额外约束（如有填写口径则校验）：
已知机动场测问题 = 0；Google PIP问题 = 0（可用JIRA查询或文本“0/无”确认）。`,
  },
  {
    id: 're-002',
    standard: '文档归档',
    description: '确认项目关键文档已归档到指定服务器',
    remark: '包括项目计划、SPD、产品价值表等',
    responsibleRole: 'SPM',
    entryRole: '在研SPM',
    reviewRole: '维护SPM',
    aiCheckRule: '检查文本中是否包含归档服务器链接，并验证文档可访问',
  },
  {
    id: 're-003',
    standard: '版本管理',
    description: '确认OTA版本链路完整，无断链',
    remark: '需提供OTA部署表',
    responsibleRole: 'SPM',
    entryRole: '在研SPM',
    reviewRole: '维护SPM',
    aiCheckRule: '检查OTA部署表是否完整，版本链路是否连续',
  },
  {
    id: 're-004',
    standard: '客户交付',
    description: '确认所有客户定制需求已记录在SPD中',
    remark: '运营商定制、区域定制等',
    responsibleRole: 'SPM',
    entryRole: '在研SPM',
    reviewRole: '维护SPM',
    aiCheckRule: '检查SPD文档中是否包含客户定制需求记录',
  },
  {
    id: 're-005',
    standard: '安全合规',
    description: '确认安全补丁计划已制定',
    remark: '需包含未来12个月的补丁计划',
    responsibleRole: 'SPM',
    entryRole: '在研SPM',
    reviewRole: '维护SPM',
    aiCheckRule: '检查文本中是否包含安全补丁更新计划',
  },

  // === 底软角色 (5条) ===
  {
    id: 're-006',
    standard: '驱动完整性',
    description: `APR大数据各模块指标在正常范围内
澄清模板：稳定性相关指标数据汇总
注：
1.确保符合前后端部门共同制定的放行标准。（若后续因放行标准过低引发问题.需由前端部门负责澄清。）
2.记录APR各模块转维时具体指标达成情况.作为转维后基准值。
3.达不到放行标准的需要提供风险评估交付件 & 改善方案导入完成。（参考模板：软件风险评估报告模板）`,
    remark: '来自评审要素模板.xlsx 的长文样例，用于验证配置中心说明、备注、智能检查规则字段的两行截断与悬浮全文效果。',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: `1）输入形态与可追溯性

通过条件：提供【稳定性大数据平台链接/报表链接】或【截图】或【文本列出各模块APR数值】。
若仅写“截图/已达标”但无法识别任何“APR/模块/数值/版本号(或项目名)”信息 ⇒ 需补充（低置信/不通过）。
2）必填信息完整性（缺一则提示补齐）

至少能获得：模块名 + APR数值；建议同时包含版本号/项目名/统计周期或使用时长（作为转维基准值）。
模块覆盖（需能对应到以下口径）：
modem子系统、Phone、内核稳定性、系统稳定性、开关机(stucklogo)、应用稳定性(自研，不含预装)
3）阈值比对（OCR/解析文本后自动判定）

modem子系统：APR < 0.1
Phone：APR < 0.5
内核稳定性：APR < 0.24
系统稳定性：APR < 0.5
开关机(stucklogo)：APR < 0.5
应用稳定性(自研)：Transsion标准 APR < 0.5；放行标准 APR < 10
截图中若阈值已写在列名如“系统APR(<0.5)”则以其为准；否则按上述固定阈值。

4）结论判定

GO（通过）：所有模块均满足对应放行标准；且证据可追溯（链接可打开/截图可读/文本数值齐全）。`,
  },
  {
    id: 're-007',
    standard: '热设计方案',
    description: '确认硬件散热方案和温控策略已完整交接',
    remark: '包括散热方案、限流参数、CPU thermal参数',
    responsibleRole: '底软',
    entryRole: '在研底软集成开发代表',
    reviewRole: '维护底软集成开发代表',
    aiCheckRule: '检查文本中是否包含温升/散热/thermal相关文档链接',
  },
  {
    id: 're-008',
    standard: '功耗管理',
    description: '确认功耗优化方案已完整交接',
    remark: '包括待机功耗、使用功耗优化策略',
    responsibleRole: '底软',
    entryRole: '在研底软集成开发代表',
    reviewRole: '维护底软集成开发代表',
    aiCheckRule: '检查文本中是否包含功耗优化方案文档',
  },
  {
    id: 're-009',
    standard: '安全启动',
    description: '确认安全启动链路完整',
    remark: '包括Bootloader、签名密钥管理',
    responsibleRole: '底软',
    entryRole: '在研底软集成开发代表',
    reviewRole: '维护底软集成开发代表',
    aiCheckRule: '检查文本中是否包含安全启动配置和密钥管理信息',
  },
  {
    id: 're-010',
    standard: '问题跟踪',
    description: '确认底软已知问题清单已完整交接',
    remark: '包括Workaround方案',
    responsibleRole: '底软',
    entryRole: '在研底软集成开发代表',
    reviewRole: '维护底软集成开发代表',
    aiCheckRule: '检查文本中是否包含底软已知问题清单和Workaround方案',
  },

  // === 系统角色 (5条) ===
  {
    id: 're-011',
    standard: '系统集成',
    description: '确认系统集成编译配置已完整记录',
    remark: '包括编译环境、参数配置',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: '检查文本中是否包含系统编译配置文档',
  },
  {
    id: 're-012',
    standard: '定制化管理',
    description: '确认系统级定制化修改已完整记录',
    remark: '包括Framework层修改',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: '检查文本中是否包含系统定制化修改清单',
  },
  {
    id: 're-013',
    standard: '性能优化',
    description: '确认系统性能优化方案已交接',
    remark: '包括启动优化、内存优化等',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: '检查文本中是否包含系统性能优化方案',
  },
  {
    id: 're-014',
    standard: '兼容性',
    description: '确认系统兼容性问题已记录',
    remark: '包括GMS兼容性、第三方应用兼容性',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: '检查文本中是否包含兼容性问题清单',
  },
  {
    id: 're-015',
    standard: '问题跟踪',
    description: '确认系统级已知问题清单已完整交接',
    remark: '包括Workaround方案',
    responsibleRole: '系统',
    entryRole: '在研系统集成开发代表',
    reviewRole: '维护系统集成开发代表',
    aiCheckRule: '检查文本中是否包含系统已知问题清单',
  },

  // === 影像角色 (5条) ===
  {
    id: 're-016',
    standard: '影像质量',
    description: '确认影像质量测试报告已完整交接',
    remark: '包括各场景图像质量评测结果',
    responsibleRole: '影像',
    entryRole: '在研影像开发代表',
    reviewRole: '维护影像开发代表',
    aiCheckRule: '检查文本中是否包含影像质量测试报告',
  },
  {
    id: 're-017',
    standard: '摄像头驱动',
    description: '确认摄像头驱动及HAL层代码已完整交接',
    remark: '包括驱动源码、HAL接口文档',
    responsibleRole: '影像',
    entryRole: '在研影像开发代表',
    reviewRole: '维护影像开发代表',
    aiCheckRule: '检查文本中是否包含摄像头驱动源码仓库和HAL文档链接',
  },
  {
    id: 're-018',
    standard: '算法交接',
    description: '确认影像算法参数及调优策略已完整交接',
    remark: '包括ISP参数、3A算法、特效算法',
    responsibleRole: '影像',
    entryRole: '在研影像开发代表',
    reviewRole: '维护影像开发代表',
    aiCheckRule: '检查文本中是否包含影像算法参数和调优文档',
  },
  {
    id: 're-019',
    standard: '调试工具',
    description: '确认影像调试工具及方法已完整交接',
    remark: '包括Tuning工具、抓图工具',
    responsibleRole: '影像',
    entryRole: '在研影像开发代表',
    reviewRole: '维护影像开发代表',
    aiCheckRule: '检查文本中是否包含影像调试工具文档',
  },
  {
    id: 're-020',
    standard: '问题跟踪',
    description: '确认影像已知问题清单已完整交接',
    remark: '包括Workaround方案',
    responsibleRole: '影像',
    entryRole: '在研影像开发代表',
    reviewRole: '维护影像开发代表',
    aiCheckRule: '检查文本中是否包含影像已知问题清单和Workaround方案',
  },
];
