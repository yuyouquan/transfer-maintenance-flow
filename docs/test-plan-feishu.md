# 被测对象分析

## 概述

**原方案痛点：** 传声集团内部手机 OS 项目从研发团队交接至维护团队时，全程依赖线下沟通和手工操作，存在以下问题：
1. 交接材料不统一，频繁遗漏关键文档，交接质量参差不齐
2. 多角色（SPM/测试/底软/系统/影像）并行协作缺乏可视化追踪，沟通成本极高
3. 评审进度不透明，驳回退回靠口头通知，责任归属难追溯
4. 无 AI 辅助质量检查能力，CheckList 全靠人工逐项核对，效率低且易遗漏
5. 检查清单和评审标准分散在各部门，无法统一管理和版本化

**改善方向：**
1. 建设 5 阶段流水线（项目初始化 → 资料录入与 AI 检查 → 维护评审 → SQA 审核 → 信息变更）
2. 支持 5 角色并行处理（SPM/测试/底软/系统/影像），各角色独立推进录入和评审
3. AI 辅助检查自动校验录入内容质量，降低人工核对工作量
4. CheckList / 评审要素模板化配置与版本管理
5. 集成外部系统（AI 检查服务/PDTList/售后权限/飞书）实现信息自动变更

## 输入文档清单

**1. 产品需求文档**
《转维电子流系统-PRD》（docs/产品设计/PRD-产品需求文档.md）

**2. 概设等研发文档**
《转维电子流系统-概要设计》V1.0.0
《转维电子流系统-前端开发设计文档》（docs/开发设计/前端开发设计文档.md）

**3. 测试代码路径**
/Users/shswyuyouquan/Documents/work/transfer-maintenance-flow/src/mock/ （前端 Mock 数据）

## 术语及缩写

<lark-table rows="12" cols="2" column-widths="200,600">

  <lark-tr>
    <lark-td>
      **名词概念** {align="center"}
    </lark-td>
    <lark-td>
      **释义** {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      转维
    </lark-td>
    <lark-td>
      将软件项目从研发团队交接至维护团队的过程
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      流水线（Pipeline）
    </lark-td>
    <lark-td>
      5 阶段：项目初始化 → 资料录入与 AI 检查 → 维护评审 → SQA 审核 → 信息变更
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SPM / TPM / SQA
    </lark-td>
    <lark-td>
      软件项目经理 / 测试项目经理 / 软件质量保证
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      底软/系统/影像
    </lark-td>
    <lark-td>
      三个技术领域的集成开发代表角色
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CheckList
    </lark-td>
    <lark-td>
      检查清单，转维交接中需逐项确认的检查项和交接资料（共 60 项模板）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      评审要素
    </lark-td>
    <lark-td>
      维护团队评审时使用的评价标准项
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Block Task
    </lark-td>
    <lark-td>
      阻塞任务，评审中发现的阻塞性问题，需在转维完成前解决
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Legacy Task
    </lark-td>
    <lark-td>
      遗留任务，评审通过后遗留的待跟进事项
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI Check
    </lark-td>
    <lark-td>
      基于预设规则对录入内容进行自动化质量检查
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      委托（Delegate）
    </lark-td>
    <lark-td>
      将某项录入任务委托给其他用户代为填写
    </lark-td>
  </lark-tr>

</lark-table>

---

# 测试需求分析

## 特性价值及竞品分析

**特性价值：**
1. 流程标准化：5 阶段流水线 + 5 角色并行，将非结构化交接过程转为可追踪的电子流
2. 质量保障：60 项 CheckList 模板 + AI 辅助检查，确保交接材料完整性和准确性
3. 效率提升：5 角色并行处理 + 自动化初始化/信息变更，目标降低转维周期 30%+
4. 可追溯性：完整操作日志 + 评审意见记录，支持事后审计和责任追溯

**竞争分析：**
行业内项目交接流程管理主要依赖 Jira/Confluence 等通用工具配合线下流程。本系统的差异化价值在于：针对 OS 项目转维场景的深度定制化流程，内置 AI 质量检查，支持多角色并行协作的可视化流水线。

## 需求分析

### 需求背景与需求汇总

<lark-table rows="11" cols="4" column-widths="100,200,350,100">

  <lark-tr>
    <lark-td>
      需求编号 {align="center"}
    </lark-td>
    <lark-td>
      需求名称 {align="center"}
    </lark-td>
    <lark-td>
      需求描述 {align="center"}
    </lark-td>
    <lark-td>
      优先级 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-001
    </lark-td>
    <lark-td>
      工作台与待办
    </lark-td>
    <lark-td>
      转维列表、待办面板（录入待办/评审待办）、按钮权限
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-002
    </lark-td>
    <lark-td>
      创建转维申请
    </lark-td>
    <lark-td>
      选择项目、自动初始化 60 项 CheckList 模板 + 人员分配
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-003
    </lark-td>
    <lark-td>
      流水线可视化
    </lark-td>
    <lark-td>
      5 阶段进度条 + 5 角色子进度点，状态着色
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-004
    </lark-td>
    <lark-td>
      资料录入与 AI 检查
    </lark-td>
    <lark-td>
      按角色 Tab 录入 CheckList/评审要素、草稿暂存、AI 自动检查、委托
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-005
    </lark-td>
    <lark-td>
      维护评审
    </lark-td>
    <lark-td>
      逐项审核 CheckList/评审要素、驳回退回、Block/Legacy 任务
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-006
    </lark-td>
    <lark-td>
      SQA 审核
    </lark-td>
    <lark-td>
      汇总各角色评审结论、最终审核决策
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-007
    </lark-td>
    <lark-td>
      关闭流水线
    </lark-td>
    <lark-td>
      评审前 SPM 关闭 / 评审后 SQA 关闭
    </lark-td>
    <lark-td>
      P0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-008
    </lark-td>
    <lark-td>
      配置中心
    </lark-td>
    <lark-td>
      CheckList/评审要素模板 CRUD、版本管理
    </lark-td>
    <lark-td>
      P1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-009
    </lark-td>
    <lark-td>
      飞书通知
    </lark-td>
    <lark-td>
      关键节点变更飞书消息（Outbox 异步）
    </lark-td>
    <lark-td>
      P1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SR-010
    </lark-td>
    <lark-td>
      信息变更集成
    </lark-td>
    <lark-td>
      PDTList 更新、售后系统权限变更
    </lark-td>
    <lark-td>
      P1
    </lark-td>
  </lark-tr>

</lark-table>

## 历史问题分析

本系统为全新开发项目，无历史版本。基于转维业务场景和类似流程管理系统的常见问题，需重点关注：
1. 5 角色并行录入/评审的状态一致性（角色级进度自动计算是否准确）
2. 驳回退回后重新录入的状态流转正确性
3. AI 检查异步结果返回时序与前端展示同步
4. 模板初始化时人员自动分配的准确性
5. 流水线关闭时机和权限控制的严格性

## 技术特色

<lark-table rows="7" cols="3" column-widths="200,250,300">

  <lark-tr>
    <lark-td>
      技术点 {align="center"}
    </lark-td>
    <lark-td>
      实现方案 {align="center"}
    </lark-td>
    <lark-td>
      测试关注点 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      5 角色并行流水线
    </lark-td>
    <lark-td>
      每个角色独立推进录入和评审，角色进度由 CheckList 项状态自动计算
    </lark-td>
    <lark-td>
      并行状态互不影响、进度计算准确、阶段自动推进
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI 辅助检查
    </lark-td>
    <lark-td>
      录入提交后异步调用 AI 检查服务，基于预设 aiCheckRule 校验
    </lark-td>
    <lark-td>
      异步结果回调正确性、passed/failed 场景、超时重试
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      模板自动初始化
    </lark-td>
    <lark-td>
      创建申请时从最新模板版本快照生成 60 项 CheckList + 评审要素
    </lark-td>
    <lark-td>
      模板快照不受后续变更影响、角色人员自动分配
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      委托机制
    </lark-td>
    <lark-td>
      录入人可将某项委托给其他用户代为填写
    </lark-td>
    <lark-td>
      委托后被委托人可编辑、原分配人仍可查看
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      驳回退回
    </lark-td>
    <lark-td>
      评审驳回单项退回至录入阶段，重新填写后再次提交
    </lark-td>
    <lark-td>
      驳回项状态重置、已通过项不受影响、重新 AI 检查
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      流水线关闭控制
    </lark-td>
    <lark-td>
      评审前 SPM 可关闭（取消）/ 评审后 SQA 可关闭（含各角色评审结论）
    </lark-td>
    <lark-td>
      权限控制、关闭后状态不可变更、各阶段关闭入口
    </lark-td>
  </lark-tr>

</lark-table>

## 测试环境依赖分析

<lark-table rows="7" cols="4" column-widths="150,200,200,200">

  <lark-tr>
    <lark-td>
      依赖项 {align="center"}
    </lark-td>
    <lark-td>
      环境要求 {align="center"}
    </lark-td>
    <lark-td>
      测试环境方案 {align="center"}
    </lark-td>
    <lark-td>
      备注 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      后端服务
    </lark-td>
    <lark-td>
      Spring Boot 3.x + JDK 17
    </lark-td>
    <lark-td>
      K8s 测试集群部署
    </lark-td>
    <lark-td>
      COLA 5.x + Flowable 7.x
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      MySQL
    </lark-td>
    <lark-td>
      MySQL 8.0（13 张业务表 + Flowable 表）
    </lark-td>
    <lark-td>
      测试专用实例
    </lark-td>
    <lark-td>
      需初始化 DDL + 模板基础数据
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Redis
    </lark-td>
    <lark-td>
      Redis Cluster
    </lark-td>
    <lark-td>
      测试 Redis 实例
    </lark-td>
    <lark-td>
      分布式锁、模板缓存
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI 检查服务
    </lark-td>
    <lark-td>
      异步检查 API
    </lark-td>
    <lark-td>
      Mock 服务（模拟 passed/failed/超时）
    </lark-td>
    <lark-td>
      需模拟不同 AI 返回场景
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      PDTList / 售后系统
    </lark-td>
    <lark-td>
      信息变更 API
    </lark-td>
    <lark-td>
      Mock 或测试环境
    </lark-td>
    <lark-td>
      需模拟成功/失败场景
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      飞书
    </lark-td>
    <lark-td>
      IM 消息 API
    </lark-td>
    <lark-td>
      飞书测试机器人
    </lark-td>
    <lark-td>
      验证通知内容和接收人
    </lark-td>
  </lark-tr>

</lark-table>

---

# 研发方案设计

## 整体思路和架构

- **前端**：React 18 SPA + qiankun 微前端，MobX 6 状态管理，Ant Design 5 UI
- **后端**：Spring Boot 3.x + COLA 5.x 模块化单体，Flowable 7.x 流程引擎
- **存储**：MySQL 8.0 主从 + Redis Cluster + OSS
- **外部系统**：AI 检查服务（Feign 异步）、PDTList/售后系统（Feign 同步）、飞书（Outbox 异步）

## 逻辑架构视图

```
┌────────────────────────────────────────────────────────────┐
│  前端 (React 18 + qiankun)                                  │
│  Pages: 工作台 | 申请 | 详情 | 录入 | 评审 | SQA审核 | 配置   │
│  Components: PipelineProgress | CheckListTable | ReviewTable │
│  State: MobX 6 (applicationStore | userStore)               │
├────────────────────────────────────────────────────────────┤
│  后端 COLA 5.x                                              │
│  Adapter: REST Controller + Auth                            │
│  App: 用例编排 + AI检查调度 + 事务                            │
│  Domain: TransferApplication聚合 + 流水线状态机 + 角色进度     │
│  Infrastructure: MySQL + Redis + Flowable + Feign + OSS     │
├────────────────────────────────────────────────────────────┤
│  外部: AI检查 | PDTList | 售后权限 | 飞书                     │
└────────────────────────────────────────────────────────────┘
```

## 层次和模块设计

**核心数据表（13 张）**：
- 核心：t_transfer_application、t_checklist_item、t_review_element
- 交付物：t_deliverable
- 任务：t_block_task、t_legacy_task
- 日志：t_operation_log
- 模板：t_checklist_template、t_review_element_template、t_template_version
- 通知：t_notification_outbox、t_notification_log
- AI：t_ai_check_task

---

# 测试设计

## 功能 & 场景测试

### 4.1.1 功能模块——工作台与待办

<lark-table rows="9" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-001
    </lark-td>
    <lark-td>
      转维列表展示
    </lark-td>
    <lark-td>
      登录 → 进入工作台
    </lark-td>
    <lark-td>
      展示所有转维申请列表，含项目名称、申请人、状态、流水线进度
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-002
    </lark-td>
    <lark-td>
      待办面板——录入待办
    </lark-td>
    <lark-td>
      底软开发代表登录 → 查看待办面板
    </lark-td>
    <lark-td>
      展示分配给该用户的未完成录入项，点击可跳转至录入页面
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-003
    </lark-td>
    <lark-td>
      待办面板——评审待办
    </lark-td>
    <lark-td>
      维护团队底软代表登录 → 查看待办面板
    </lark-td>
    <lark-td>
      展示待评审的项，点击可跳转至评审页面
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-004
    </lark-td>
    <lark-td>
      按钮权限——录入按钮
    </lark-td>
    <lark-td>
      非分配人且非角色负责人登录 → 查看某转维申请
    </lark-td>
    <lark-td>
      "录入"按钮不显示
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-005
    </lark-td>
    <lark-td>
      按钮权限——评审按钮
    </lark-td>
    <lark-td>
      维护团队底软代表登录 → 查看底软录入已提交的转维申请
    </lark-td>
    <lark-td>
      "评审"按钮可见
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-006
    </lark-td>
    <lark-td>
      按钮权限——关闭流水线（评审前）
    </lark-td>
    <lark-td>
      SPM（申请人）登录 → 查看进行中的转维申请
    </lark-td>
    <lark-td>
      "关闭流水线"按钮可见；非 SPM 用户不可见
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-007
    </lark-td>
    <lark-td>
      按钮权限——关闭流水线（评审后）
    </lark-td>
    <lark-td>
      SQA 登录 → 查看已进入 SQA 审核的转维申请
    </lark-td>
    <lark-td>
      "关闭流水线"按钮可见；非 SQA 用户不可见
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      WB-008
    </lark-td>
    <lark-td>
      搜索与筛选
    </lark-td>
    <lark-td>
      输入项目名称关键字 → 搜索
    </lark-td>
    <lark-td>
      列表正确过滤，仅显示匹配的转维申请
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.2 功能模块——创建转维申请与自动初始化

<lark-table rows="8" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-001
    </lark-td>
    <lark-td>
      SPM 创建转维申请
    </lark-td>
    <lark-td>
      SPM 登录 → 点击"创建转维申请" → 选择项目 → 设置计划评审日期 → 填写备注 → 提交
    </lark-td>
    <lark-td>
      创建成功，项目初始化自动完成，流水线进入"资料录入"阶段
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-002
    </lark-td>
    <lark-td>
      自动初始化——CheckList 生成
    </lark-td>
    <lark-td>
      创建申请后 → 进入录入页面 → 切换各角色 Tab
    </lark-td>
    <lark-td>
      各角色 CheckList 项从模板生成：SPM 25 项、测试 11 项、底软 11 项、系统 5 项、影像 8 项
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-003
    </lark-td>
    <lark-td>
      自动初始化——人员分配
    </lark-td>
    <lark-td>
      查看各 CheckList 项的录入人和审核人
    </lark-td>
    <lark-td>
      录入人=研发团队对应角色成员，审核人=维护团队对应角色成员
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-004
    </lark-td>
    <lark-td>
      自动初始化——团队自动带出
    </lark-td>
    <lark-td>
      选择项目后
    </lark-td>
    <lark-td>
      自动展示该项目的研发团队和维护团队成员列表
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-005
    </lark-td>
    <lark-td>
      模板版本快照
    </lark-td>
    <lark-td>
      创建申请 → 修改 CheckList 模板（新增一项）→ 查看已创建的申请
    </lark-td>
    <lark-td>
      已创建的申请仍使用旧模板（60 项），不受新模板影响
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-006
    </lark-td>
    <lark-td>
      必填项校验
    </lark-td>
    <lark-td>
      不选择项目 → 点击提交
    </lark-td>
    <lark-td>
      提示"请选择项目"，提交被阻止
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AP-007
    </lark-td>
    <lark-td>
      飞书通知
    </lark-td>
    <lark-td>
      创建成功后
    </lark-td>
    <lark-td>
      所有研发团队和维护团队成员收到飞书通知
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.3 功能模块——资料录入与 AI 检查

<lark-table rows="14" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-001
    </lark-td>
    <lark-td>
      按角色 Tab 切换
    </lark-td>
    <lark-td>
      进入录入页面 → 依次点击 SPM/测试/底软/系统/影像 Tab
    </lark-td>
    <lark-td>
      每个 Tab 展示对应角色的 CheckList 和评审要素
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-002
    </lark-td>
    <lark-td>
      逐项录入 CheckList
    </lark-td>
    <lark-td>
      底软代表 → 填写某项 entryContent → 上传交接资料
    </lark-td>
    <lark-td>
      内容保存成功，文件上传至 OSS
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-003
    </lark-td>
    <lark-td>
      草稿暂存（draft）
    </lark-td>
    <lark-td>
      填写部分内容 → 点击"暂存"
    </lark-td>
    <lark-td>
      entryStatus=draft，内容已保存，可继续编辑
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-004
    </lark-td>
    <lark-td>
      提交录入（entered）
    </lark-td>
    <lark-td>
      填写完成 → 点击"提交"
    </lark-td>
    <lark-td>
      entryStatus=entered，自动触发 AI 检查
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-005
    </lark-td>
    <lark-td>
      AI 检查——通过
    </lark-td>
    <lark-td>
      提交后等待 AI 检查完成
    </lark-td>
    <lark-td>
      aiCheckStatus=passed，展示通过标记
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-006
    </lark-td>
    <lark-td>
      AI 检查——不通过
    </lark-td>
    <lark-td>
      提交不符合 aiCheckRule 的内容
    </lark-td>
    <lark-td>
      aiCheckStatus=failed，展示 AI 检查意见（aiCheckResult），用户可修改后重新提交
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-007
    </lark-td>
    <lark-td>
      委托录入
    </lark-td>
    <lark-td>
      录入人 → 点击"委托" → 选择被委托人 → 确认
    </lark-td>
    <lark-td>
      被委托人可编辑该项，delegatedTo 字段记录委托关系
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-008
    </lark-td>
    <lark-td>
      被委托人录入
    </lark-td>
    <lark-td>
      被委托人登录 → 进入录入页面
    </lark-td>
    <lark-td>
      可看到委托给自己的项并编辑提交
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-009
    </lark-td>
    <lark-td>
      非分配人不可编辑
    </lark-td>
    <lark-td>
      非该项分配人也非被委托人 → 查看该项
    </lark-td>
    <lark-td>
      该项以只读模式展示
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-010
    </lark-td>
    <lark-td>
      角色级提交
    </lark-td>
    <lark-td>
      底软角色所有项 entryStatus=entered 且 aiCheckStatus=passed → 点击"角色提交"
    </lark-td>
    <lark-td>
      roleProgress.底软.entryStatus=completed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-011
    </lark-td>
    <lark-td>
      角色提交阻断
    </lark-td>
    <lark-td>
      某项 AI 检查 failed → 点击"角色提交"
    </lark-td>
    <lark-td>
      提交失败，提示"存在未通过 AI 检查的项"
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-012
    </lark-td>
    <lark-td>
      5 角色全部完成 → 阶段推进
    </lark-td>
    <lark-td>
      5 个角色依次完成录入提交
    </lark-td>
    <lark-td>
      pipeline.dataEntry=success，pipeline.maintenanceReview 自动开始
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      EN-013
    </lark-td>
    <lark-td>
      评审要素录入
    </lark-td>
    <lark-td>
      切换到评审要素 Tab → 逐项填写
    </lark-td>
    <lark-td>
      评审要素与 CheckList 独立管理，均需完成才可角色提交
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.4 功能模块——维护评审

<lark-table rows="10" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-001
    </lark-td>
    <lark-td>
      维护团队逐项审核
    </lark-td>
    <lark-td>
      维护团队底软代表 → 进入评审页面 → 查看底软 CheckList → 逐项选择通过/驳回 + 填写意见
    </lark-td>
    <lark-td>
      每项 reviewStatus 更新，评审意见保存
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-002
    </lark-td>
    <lark-td>
      审核通过
    </lark-td>
    <lark-td>
      所有项选择"通过" → 提交
    </lark-td>
    <lark-td>
      该角色评审完成，roleProgress.底软.reviewStatus=completed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-003
    </lark-td>
    <lark-td>
      审核驳回——单项退回
    </lark-td>
    <lark-td>
      某项选择"驳回" → 填写驳回原因 → 提交
    </lark-td>
    <lark-td>
      该项 reviewStatus=rejected，entryStatus 重置为 not_entered，退回录入阶段
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-004
    </lark-td>
    <lark-td>
      驳回后重新录入
    </lark-td>
    <lark-td>
      录入人修改被驳回项 → 重新提交 → AI 检查通过
    </lark-td>
    <lark-td>
      该项重新进入评审，reviewStatus=not_reviewed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-005
    </lark-td>
    <lark-td>
      创建 Block 任务
    </lark-td>
    <lark-td>
      评审中发现阻塞问题 → 点击"创建 Block 任务" → 填写描述/负责人/截止日期 → 保存
    </lark-td>
    <lark-td>
      Block 任务创建成功，关联到当前转维申请
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-006
    </lark-td>
    <lark-td>
      创建 Legacy 任务
    </lark-td>
    <lark-td>
      评审通过后 → 点击"创建 Legacy 任务" → 填写描述/负责人/截止日期 → 保存
    </lark-td>
    <lark-td>
      Legacy 任务创建成功
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-007
    </lark-td>
    <lark-td>
      非维护团队不可评审
    </lark-td>
    <lark-td>
      研发团队底软代表 → 进入评审页面
    </lark-td>
    <lark-td>
      以只读模式展示，无审核操作按钮
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-008
    </lark-td>
    <lark-td>
      5 角色全部评审完成 → SQA 审核
    </lark-td>
    <lark-td>
      5 个角色依次完成评审提交
    </lark-td>
    <lark-td>
      pipeline.maintenanceReview=success，pipeline.sqaReview 自动开始
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      RV-009
    </lark-td>
    <lark-td>
      部分角色驳回不阻塞其他角色
    </lark-td>
    <lark-td>
      底软评审驳回某项 → 同时系统角色继续评审
    </lark-td>
    <lark-td>
      系统角色评审不受底软驳回影响，各角色独立推进
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.5 功能模块——SQA 审核与关闭流水线

<lark-table rows="8" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SQ-001
    </lark-td>
    <lark-td>
      SQA 审核页面
    </lark-td>
    <lark-td>
      SQA 登录 → 进入 SQA 审核页面
    </lark-td>
    <lark-td>
      展示所有 5 角色的评审结论（N/A / PASS / Fail）汇总表
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SQ-002
    </lark-td>
    <lark-td>
      SQA 审核通过
    </lark-td>
    <lark-td>
      所有角色 PASS → SQA 点击"审核通过"
    </lark-td>
    <lark-td>
      pipeline.sqaReview=success → 信息变更自动执行 → application.status=completed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SQ-003
    </lark-td>
    <lark-td>
      信息变更——PDTList 更新
    </lark-td>
    <lark-td>
      SQA 审核通过后
    </lark-td>
    <lark-td>
      自动调用 PDTList 系统更新项目交付物清单
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      SQ-004
    </lark-td>
    <lark-td>
      信息变更——售后权限更新
    </lark-td>
    <lark-td>
      SQA 审核通过后
    </lark-td>
    <lark-td>
      自动调用售后系统更新权限
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CL-001
    </lark-td>
    <lark-td>
      SPM 关闭流水线（评审前）
    </lark-td>
    <lark-td>
      录入阶段 → SPM 点击"关闭流水线" → 填写取消原因 → 确认
    </lark-td>
    <lark-td>
      application.status=cancelled，cancelReason 保存，流水线终止
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CL-002
    </lark-td>
    <lark-td>
      SQA 关闭流水线（评审后）
    </lark-td>
    <lark-td>
      SQA 审核阶段 → SQA 点击"关闭流水线" → 展示各角色评审结论 → 填写原因 → 确认
    </lark-td>
    <lark-td>
      application.status=cancelled，记录各角色评审结论和关闭原因
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CL-003
    </lark-td>
    <lark-td>
      关闭后不可操作
    </lark-td>
    <lark-td>
      流水线已关闭 → 尝试录入/评审操作
    </lark-td>
    <lark-td>
      所有操作按钮禁用，页面以只读模式展示
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.6 功能模块——配置中心

<lark-table rows="7" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-001
    </lark-td>
    <lark-td>
      CheckList 模板列表
    </lark-td>
    <lark-td>
      进入配置中心 → CheckList 模板管理
    </lark-td>
    <lark-td>
      展示所有模板项，按角色分类，含当前版本号
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-002
    </lark-td>
    <lark-td>
      新增模板项
    </lark-td>
    <lark-td>
      点击"新增" → 填写检查项/类型/角色/AI 规则 → 保存
    </lark-td>
    <lark-td>
      模板项创建成功，版本号自动递增
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-003
    </lark-td>
    <lark-td>
      编辑模板项
    </lark-td>
    <lark-td>
      选择某项 → 修改 → 保存
    </lark-td>
    <lark-td>
      修改成功，不影响已创建的转维申请
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-004
    </lark-td>
    <lark-td>
      删除模板项
    </lark-td>
    <lark-td>
      选择某项 → 删除 → 确认
    </lark-td>
    <lark-td>
      删除成功，不影响已创建的转维申请
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-005
    </lark-td>
    <lark-td>
      评审要素模板管理
    </lark-td>
    <lark-td>
      进入评审要素模板 → 增删改查
    </lark-td>
    <lark-td>
      同 CheckList 模板管理逻辑
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CF-006
    </lark-td>
    <lark-td>
      版本管理
    </lark-td>
    <lark-td>
      查看版本历史
    </lark-td>
    <lark-td>
      展示所有历史版本及其模板项数量，可查看版本详情
    </lark-td>
  </lark-tr>

</lark-table>

### 4.1.7 场景测试——端到端全流程

<lark-table rows="5" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      测试场景 {align="center"}
    </lark-td>
    <lark-td>
      测试步骤 {align="center"}
    </lark-td>
    <lark-td>
      预期结果 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      E2E-001
    </lark-td>
    <lark-td>
      Happy Path：完整转维流程
    </lark-td>
    <lark-td>
      SPM 创建申请 → 5 角色分别完成录入（AI 全部通过）→ 5 角色分别完成评审（全部通过）→ SQA 审核通过 → 信息变更完成
    </lark-td>
    <lark-td>
      全流程 5 阶段顺序完成，application.status=completed，所有飞书通知正确发送
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      E2E-002
    </lark-td>
    <lark-td>
      驳回 + 重新录入流程
    </lark-td>
    <lark-td>
      5 角色完成录入 → 底软评审驳回 2 项 → 底软录入人修改重新提交 → AI 检查通过 → 底软评审再次通过 → 其他角色均通过 → SQA 通过
    </lark-td>
    <lark-td>
      驳回项正确退回、重新录入后正确推进、最终完成
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      E2E-003
    </lark-td>
    <lark-td>
      评审前关闭流水线
    </lark-td>
    <lark-td>
      SPM 创建申请 → 部分角色开始录入 → SPM 关闭流水线
    </lark-td>
    <lark-td>
      流水线终止，status=cancelled，所有操作不可继续
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      E2E-004
    </lark-td>
    <lark-td>
      5 角色并行录入
    </lark-td>
    <lark-td>
      5 个角色同时登录 → 各自在自己的角色 Tab 下录入 → 各自独立提交
    </lark-td>
    <lark-td>
      各角色独立推进，互不影响，角色进度分别正确更新
    </lark-td>
  </lark-tr>

</lark-table>

## 接口测试

### 后端 REST API 接口测试

#### 转维申请 API

<lark-table rows="6" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      PreCondition {align="center"}
    </lark-td>
    <lark-td>
      Steps {align="center"}
    </lark-td>
    <lark-td>
      ExpectResult {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      API-01
    </lark-td>
    <lark-td>
      SPM Token
    </lark-td>
    <lark-td>
      POST /api/v1/applications {projectId, plannedReviewDate, remark}
    </lark-td>
    <lark-td>
      code=0，t_transfer_application 创建，t_checklist_item 生成 60 项，pipeline.projectInit=success
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      API-02
    </lark-td>
    <lark-td>
      录入人 Token
    </lark-td>
    <lark-td>
      PUT /api/v1/checklist/{itemId}/entry {entryContent, status:"entered"}
    </lark-td>
    <lark-td>
      code=0，entryStatus=entered，t_ai_check_task 创建
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      API-03
    </lark-td>
    <lark-td>
      非分配人 Token
    </lark-td>
    <lark-td>
      PUT /api/v1/checklist/{itemId}/entry {entryContent}
    </lark-td>
    <lark-td>
      返回 403 Forbidden
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      API-04
    </lark-td>
    <lark-td>
      维护团队 Token
    </lark-td>
    <lark-td>
      PUT /api/v1/checklist/{itemId}/review {reviewStatus:"passed", reviewComment:"OK"}
    </lark-td>
    <lark-td>
      code=0，reviewStatus=passed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      API-05
    </lark-td>
    <lark-td>
      维护团队 Token
    </lark-td>
    <lark-td>
      PUT /api/v1/checklist/{itemId}/review {reviewStatus:"rejected", reviewComment:"内容不完整"}
    </lark-td>
    <lark-td>
      code=0，reviewStatus=rejected，entryStatus 重置为 not_entered
    </lark-td>
  </lark-tr>

</lark-table>

#### 并发与状态一致性测试

<lark-table rows="4" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      PreCondition {align="center"}
    </lark-td>
    <lark-td>
      Steps {align="center"}
    </lark-td>
    <lark-td>
      ExpectResult {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CON-01
    </lark-td>
    <lark-td>
      5 角色并行录入
    </lark-td>
    <lark-td>
      5 个角色同时提交各自的 CheckList 项
    </lark-td>
    <lark-td>
      各角色状态独立更新，无冲突，角色进度正确
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CON-02
    </lark-td>
    <lark-td>
      同一项并发编辑
    </lark-td>
    <lark-td>
      录入人和被委托人同时提交同一 CheckList 项
    </lark-td>
    <lark-td>
      乐观锁冲突检测，一个成功一个失败
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      CON-03
    </lark-td>
    <lark-td>
      角色进度自动计算
    </lark-td>
    <lark-td>
      底软 11 项中 10 项 entered + AI passed，1 项 draft → 检查角色状态
    </lark-td>
    <lark-td>
      roleProgress.底软.entryStatus=in_progress（非 completed）
    </lark-td>
  </lark-tr>

</lark-table>

#### AI 检查服务集成测试

<lark-table rows="5" cols="4" column-widths="80,200,300,300">

  <lark-tr>
    <lark-td>
      用例编号 {align="center"}
    </lark-td>
    <lark-td>
      PreCondition {align="center"}
    </lark-td>
    <lark-td>
      Steps {align="center"}
    </lark-td>
    <lark-td>
      ExpectResult {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI-01
    </lark-td>
    <lark-td>
      AI 服务正常
    </lark-td>
    <lark-td>
      提交录入 → 等待 AI 检查回调
    </lark-td>
    <lark-td>
      aiCheckStatus 从 in_progress 变为 passed/failed
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI-02
    </lark-td>
    <lark-td>
      AI 服务超时
    </lark-td>
    <lark-td>
      模拟 AI 服务无响应
    </lark-td>
    <lark-td>
      t_ai_check_task 重试 3 次，最终状态可手动重新触发
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI-03
    </lark-td>
    <lark-td>
      AI 服务不可用
    </lark-td>
    <lark-td>
      模拟 AI 服务 500 错误
    </lark-td>
    <lark-td>
      重试机制正确工作，用户可手动触发重新检查
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI-04
    </lark-td>
    <lark-td>
      AI 检查 failed 后修改重新提交
    </lark-td>
    <lark-td>
      AI failed → 修改内容 → 重新提交
    </lark-td>
    <lark-td>
      aiCheckStatus 重置为 in_progress，重新触发 AI 检查
    </lark-td>
  </lark-tr>

</lark-table>

---

## 公共测试需求确认

<lark-table rows="7" cols="4" column-widths="150,100,300,200">

  <lark-tr>
    <lark-td>
      测试类型 {align="center"}
    </lark-td>
    <lark-td>
      是否需要 {align="center"}
    </lark-td>
    <lark-td>
      说明 {align="center"}
    </lark-td>
    <lark-td>
      责任人 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      性能测试
    </lark-td>
    <lark-td>
      是
    </lark-td>
    <lark-td>
      API ≤500ms（P95），5 角色并行录入无阻塞
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      安全测试
    </lark-td>
    <lark-td>
      是
    </lark-td>
    <lark-td>
      权限越权测试、XSS/SQL 注入、文件上传安全
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      兼容性测试
    </lark-td>
    <lark-td>
      是
    </lark-td>
    <lark-td>
      Chrome 90+、Edge 90+，1280×720~3840×2160
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      可靠性测试
    </lark-td>
    <lark-td>
      是
    </lark-td>
    <lark-td>
      后端 Pod 重启状态恢复、AI 服务降级、外部系统不可用
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      国际化测试
    </lark-td>
    <lark-td>
      是
    </lark-td>
    <lark-td>
      UI 中英文切换
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      数据迁移测试
    </lark-td>
    <lark-td>
      否
    </lark-td>
    <lark-td>
      全新系统，无历史数据迁移
    </lark-td>
    <lark-td>
      —
    </lark-td>
  </lark-tr>

</lark-table>

---

# 耦合测试方案

<lark-table rows="6" cols="6" column-widths="120,150,100,100,100,100">

  <lark-tr>
    <lark-td>
      **模块耦合点** {align="center"}
    </lark-td>
    <lark-td>
      **场景** {align="center"}
    </lark-td>
    <lark-td>
      **涉及部门** {align="center"}
    </lark-td>
    <lark-td>
      **责任人** {align="center"}
    </lark-td>
    <lark-td>
      **方案链接** {align="center"}
    </lark-td>
    <lark-td>
      **备注** {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI 检查服务
    </lark-td>
    <lark-td>
      录入提交后异步调用 AI 检查，返回 passed/failed + 检查意见
    </lark-td>
    <lark-td>
      AI 平台团队
    </lark-td>
    <lark-td>
      待定
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      异步任务 + 重试 3 次
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      PDTList 系统
    </lark-td>
    <lark-td>
      SQA 审核通过后更新项目交付物清单
    </lark-td>
    <lark-td>
      项目管理团队
    </lark-td>
    <lark-td>
      待定
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      失败不阻塞 + 异步重试
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      售后权限系统
    </lark-td>
    <lark-td>
      SQA 审核通过后更新售后系统权限
    </lark-td>
    <lark-td>
      售后团队
    </lark-td>
    <lark-td>
      待定
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      失败不阻塞 + 异步重试
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      飞书 IM
    </lark-td>
    <lark-td>
      关键节点变更（创建/录入完成/评审完成/驳回/关闭）发送通知
    </lark-td>
    <lark-td>
      飞书平台
    </lark-td>
    <lark-td>
      待定
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      Outbox + 指数退避重试
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      主平台 qiankun
    </lark-td>
    <lark-td>
      前端作为子应用接入主平台，共享认证 Token
    </lark-td>
    <lark-td>
      前端平台组
    </lark-td>
    <lark-td>
      待定
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      样式隔离 + JS 沙箱
    </lark-td>
  </lark-tr>

</lark-table>

---

# 测试方案融合 Review

**基于测试设计 & 耦合测试方案，各测试单位分工如下：**

<lark-table rows="6" cols="3" column-widths="200,350,200">

  <lark-tr>
    <lark-td>
      测试维度 {align="center"}
    </lark-td>
    <lark-td>
      测试内容 {align="center"}
    </lark-td>
    <lark-td>
      负责团队/人 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      功能 + 场景测试
    </lark-td>
    <lark-td>
      工作台、创建申请、录入/AI 检查、维护评审、SQA 审核、关闭流水线、配置中心、端到端全流程
    </lark-td>
    <lark-td>
      转维系统测试团队
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      接口测试
    </lark-td>
    <lark-td>
      REST API 正向/异常、权限校验、并发一致性、AI 检查集成
    </lark-td>
    <lark-td>
      转维系统测试团队
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      外部系统联调
    </lark-td>
    <lark-td>
      AI 检查服务 / PDTList / 售后权限 集成测试
    </lark-td>
    <lark-td>
      转维系统 + 各外部系统团队
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      性能 + 安全
    </lark-td>
    <lark-td>
      并发压测（5 角色并行）、API 响应指标、安全扫描
    </lark-td>
    <lark-td>
      待定
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      兼容性 + UI
    </lark-td>
    <lark-td>
      浏览器兼容、分辨率适配、国际化、微前端集成
    </lark-td>
    <lark-td>
      转维系统前端测试
    </lark-td>
  </lark-tr>

</lark-table>
