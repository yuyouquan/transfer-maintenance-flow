**修订记录**

<lark-table rows="3" cols="5" column-widths="121,121,121,236,358">

  <lark-tr>
    <lark-td>
      版本 {align="center"}
    </lark-td>
    <lark-td>
      日期 {align="center"}
    </lark-td>
    <lark-td>
      图表/章节号 {align="center"}
    </lark-td>
    <lark-td>
      简要描述 {align="center"}
    </lark-td>
    <lark-td>
      修订者 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      V1.0.0 {align="center"}
    </lark-td>
    <lark-td>
      2026-04-03 {align="center"}
    </lark-td>
    <lark-td>
      初始化 {align="center"}
    </lark-td>
    <lark-td>
      系统概要设计初稿 {align="center"}
    </lark-td>
    <lark-td>
      于佑全 {align="center"}
    </lark-td>
  </lark-tr>

</lark-table>

---

# 1 引言

## 1.1 编写目的

本文档为转维电子流系统的概要设计文档，覆盖前后端完整技术方案，目标如下：
- 定义系统整体架构、前后端分层结构与模块划分
- 明确 5 阶段流水线（项目初始化 → 资料录入与 AI 检查 → 维护评审 → SQA 审核 → 信息变更）的全链路实现方案
- 阐述 5 角色并行（SPM/测试/底软/系统/影像）的协作模型与状态机设计
- 明确 CheckList/评审要素模板化配置、AI 辅助检查、委托机制等关键技术方案
- 指导后续详细设计与编码实现，作为技术评审依据

## 1.2 术语和缩略语

<lark-table rows="18" cols="3" column-widths="80,200,400">

  <lark-tr>
    <lark-td>
      序号 {align="center"}
    </lark-td>
    <lark-td>
      术语或缩略语 {align="center"}
    </lark-td>
    <lark-td>
      说明性定义 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      转维
    </lark-td>
    <lark-td>
      Transfer Maintenance，将软件项目从研发团队交接至维护团队的过程
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      电子流
    </lark-td>
    <lark-td>
      线上化的审批/交接流程，替代传统线下沟通方式
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      流水线（Pipeline）
    </lark-td>
    <lark-td>
      转维流程的 5 个阶段：项目初始化 → 资料录入 → 维护评审 → SQA 审核 → 信息变更
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      SPM
    </lark-td>
    <lark-td>
      Software Project Manager，软件项目经理，转维流程发起人
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      5
    </lark-td>
    <lark-td>
      TPM
    </lark-td>
    <lark-td>
      Test Project Manager，测试项目经理，对应"测试"角色
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      6
    </lark-td>
    <lark-td>
      SQA
    </lark-td>
    <lark-td>
      Software Quality Assurance，软件质量保证，负责最终审核
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      7
    </lark-td>
    <lark-td>
      底软/系统/影像
    </lark-td>
    <lark-td>
      三个技术领域的集成开发代表角色
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      8
    </lark-td>
    <lark-td>
      CheckList
    </lark-td>
    <lark-td>
      检查清单，转维交接中需逐项确认的检查项和交接资料
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      9
    </lark-td>
    <lark-td>
      评审要素
    </lark-td>
    <lark-td>
      Review Element，维护团队评审时使用的评价标准项
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      10
    </lark-td>
    <lark-td>
      Block Task
    </lark-td>
    <lark-td>
      阻塞任务，评审中发现的阻塞性问题，需在转维完成前解决
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      11
    </lark-td>
    <lark-td>
      Legacy Task
    </lark-td>
    <lark-td>
      遗留任务，评审通过后遗留的待跟进事项
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      12
    </lark-td>
    <lark-td>
      PDTList
    </lark-td>
    <lark-td>
      项目管理系统中的项目交付物清单，转维完成后需更新
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      13
    </lark-td>
    <lark-td>
      COLA
    </lark-td>
    <lark-td>
      Clean Object-oriented and Layered Architecture，后端分层架构 5.x
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      14
    </lark-td>
    <lark-td>
      Flowable
    </lark-td>
    <lark-td>
      BPMN 2.0 流程引擎 7.x，用于审核流程编排
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      15
    </lark-td>
    <lark-td>
      qiankun
    </lark-td>
    <lark-td>
      蚂蚁集团微前端框架，用于将本系统接入主平台
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      16
    </lark-td>
    <lark-td>
      MobX
    </lark-td>
    <lark-td>
      响应式状态管理库，Observable/Action/Computed 模式
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      17
    </lark-td>
    <lark-td>
      AI Check
    </lark-td>
    <lark-td>
      AI 辅助检查，基于预设规则对录入内容进行自动化质量检查
    </lark-td>
  </lark-tr>

</lark-table>

---

# 2 需求分析

## 2.1 软件背景

**用户痛点**：传声集团内部手机 OS 项目从研发阶段转入维护阶段时，交接流程依赖线下沟通，存在以下问题：
1. 交接材料不统一，频繁遗漏关键文档和信息
2. 多角色并行协作缺乏可视化追踪，沟通成本高
3. 评审进度不透明，责任归属难追溯
4. 无 AI 辅助质量检查能力，全靠人工逐项核对
5. 检查清单和评审标准分散，无法统一管理和版本化

**业务目标**：建设转维电子流系统，实现转维全流程数字化闭环，目标降低转维周期 30%+。

## 2.2 软件目标

**用户场景**：传声集团 OS 项目研发团队（SPM/测试/底软/系统/影像）与维护团队之间的标准化交接流程。

**解决方案**：构建前后端分离的 B/S 架构系统。后端采用 Spring Boot 3.x + COLA 5.x，集成 Flowable 7.x 编排评审流程；前端采用 React 18 SPA，通过 qiankun 接入主平台。核心功能包括：
- 5 阶段流水线可视化（项目初始化 → 资料录入与 AI 检查 → 维护评审 → SQA 审核 → 信息变更）
- 5 角色并行处理（SPM/测试/底软/系统/影像，每个角色独立推进录入和评审）
- CheckList / 评审要素模板化配置与版本管理
- AI 辅助质量检查（基于预设规则自动校验录入内容）
- Block 任务 / Legacy 任务管理
- 完整操作审计与飞书通知

**关键指标**：
- API 响应时间 ≤ 500ms，列表接口 ≤ 1s
- 前端首屏加载 ≤ 2s
- 支持 100+ 并发用户
- 5 角色并行录入/评审无状态冲突

## 2.3 依赖和约束

<lark-table rows="11" cols="3" column-widths="150,250,400">

  <lark-tr>
    <lark-td>
      类别 {align="center"}
    </lark-td>
    <lark-td>
      依赖项/版本规格 {align="center"}
    </lark-td>
    <lark-td>
      描述与约束说明 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      后端运行环境
    </lark-td>
    <lark-td>
      JDK 17 LTS + Spring Boot 3.x
    </lark-td>
    <lark-td>
      COLA 5.x 模块化单体架构
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      前端运行环境
    </lark-td>
    <lark-td>
      Chrome 90+ / Edge 90+
    </lark-td>
    <lark-td>
      内部系统，仅需支持现代浏览器
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      前端核心框架
    </lark-td>
    <lark-td>
      React 18 + JavaScript (ES6+)
    </lark-td>
    <lark-td>
      CRA + CRACO 构建，qiankun 微前端接入
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      数据库
    </lark-td>
    <lark-td>
      MySQL 8.0（主从）
    </lark-td>
    <lark-td>
      业务表 + Flowable 引擎内置表
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      缓存
    </lark-td>
    <lark-td>
      Redis Cluster
    </lark-td>
    <lark-td>
      枚举缓存、分布式锁、模板缓存
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      流程引擎
    </lark-td>
    <lark-td>
      Flowable 7.x
    </lark-td>
    <lark-td>
      用于评审流程编排（维护评审 + SQA 审核）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      注册/配置中心
    </lark-td>
    <lark-td>
      Nacos
    </lark-td>
    <lark-td>
      服务注册、配置管理
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      文件存储
    </lark-td>
    <lark-td>
      OSS 对象存储
    </lark-td>
    <lark-td>
      交接资料文件存储
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      微前端
    </lark-td>
    <lark-td>
      qiankun
    </lark-td>
    <lark-td>
      作为子应用接入主平台
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      可观测性
    </lark-td>
    <lark-td>
      CAT + ELK
    </lark-td>
    <lark-td>
      链路追踪 + 日志收集分析
    </lark-td>
  </lark-tr>

</lark-table>

## 2.4 功能需求分析

### 2.4.1 需求总体描述

系统面向 6 类角色（SPM/TPM/SQA/底软/系统/影像），围绕 5 阶段流水线 × 5 角色并行展开核心业务：

**SPM（项目经理）**：发起转维申请 → 录入 SPM 维度 CheckList → 关闭流水线
**TPM（测试经理）**：录入测试维度 CheckList → 测试维度维护评审
**SQA（质量保证）**：SQA 最终审核 → 关闭流水线
**底软/系统/影像（开发代表）**：各自录入对应维度 CheckList → 对应维度维护评审

**5 阶段流水线**：
```
项目初始化(自动) → 资料录入与AI检查(5角色并行) → 维护评审(5角色并行) → SQA审核 → 信息变更(自动)
```

### 2.4.2 功能需求描述

**F1 - 工作台**
- 转维申请列表展示（搜索、筛选、分页）
- 待办面板（我的录入待办、我的评审待办）
- 按钮权限：详情（所有人）、录入（分配人/角色负责人）、评审（维护团队对应角色）、关闭流水线（SPM/SQA）

**F2 - 创建转维申请**
- 选择项目 → 自动带出研发/维护团队成员
- 设置计划评审日期、备注
- 创建后自动完成"项目初始化"：根据模板生成 CheckList 和评审要素，按角色自动分配人员

**F3 - 转维详情与流水线可视化**
- 5 阶段流水线进度条（状态着色：灰色未开始/蓝色进行中/绿色完成/红色失败）
- 每个阶段下方展示 5 个角色的子进度点
- 基本信息展示（项目、发起人、团队、计划日期）
- 操作日志时间线

**F4 - 资料录入与 AI 检查（dataEntry）**
- 按角色 Tab 切换（SPM/测试/底软/系统/影像）
- CheckList 表格：逐项录入内容、上传交接资料
- 评审要素表格：逐项录入评价内容
- 录入状态：未录入 → 草稿（暂存）→ 已录入（提交）
- AI 检查：录入提交后自动触发，基于预设规则检查（未开始 → 检查中 → 通过/不通过）
- 委托功能：可将某项录入委托给其他用户
- 角色级提交：该角色所有项录入完成且 AI 检查通过后，可提交进入评审

**F5 - 维护评审（maintenanceReview）**
- 按角色 Tab 切换，维护团队对应角色审核
- 逐项审核 CheckList 和评审要素（通过/驳回 + 评审意见）
- 驳回项退回至录入阶段重新填写
- 评审中可创建 Block 任务（阻塞性问题）
- 评审通过后可创建 Legacy 任务（遗留事项）
- 角色级提交：该角色所有项审核完成后提交

**F6 - SQA 审核（sqaReview）**
- 所有角色维护评审完成后触发
- 展示所有角色的评审结论（N/A / PASS / Fail）
- SQA 最终审核决策
- 可创建 Block 任务

**F7 - 关闭流水线**
- 评审前：SPM 可关闭（需填写取消原因）
- 评审后：SQA 可关闭（展示各角色评审结论 + 填写关闭原因）

**F8 - 信息变更（infoChange）**
- SQA 审核通过后自动触发
- 更新项目管理系统 PDTList
- 更新售后系统权限
- 标记转维完成

**F9 - 配置中心**
- CheckList 模板管理（增删改查、版本管理）
- 评审要素模板管理（增删改查、版本管理）
- 按角色分类：SPM 25 项、测试 11 项、底软 11 项、系统 5 项、影像 8 项

**F10 - 飞书通知**
- 关键节点变更自动发送飞书消息
- Outbox Pattern 保证可靠送达

### 2.4.3 功能需求汇总

<lark-table rows="11" cols="4" column-widths="120,200,350,80">

  <lark-tr>
    <lark-td>
      需求编号 {align="center"}
    </lark-td>
    <lark-td>
      需求标题 {align="center"}
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
      转维列表、待办面板、按钮权限控制
    </lark-td>
    <lark-td>
      高
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
      选择项目、自动初始化模板和人员分配
    </lark-td>
    <lark-td>
      高
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
      5 阶段 + 5 角色子进度可视化
    </lark-td>
    <lark-td>
      高
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
      CheckList/评审要素录入、AI 自动检查、委托机制
    </lark-td>
    <lark-td>
      高
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
      逐项审核、驳回退回、Block/Legacy 任务
    </lark-td>
    <lark-td>
      高
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
      最终审核决策、汇总各角色评审结论
    </lark-td>
    <lark-td>
      高
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
      高
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
      CheckList/评审要素模板管理、版本管理
    </lark-td>
    <lark-td>
      高
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
      中
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
      中
    </lark-td>
  </lark-tr>

</lark-table>

## 2.5 非功能需求分析

### 2.5.1 性能需求
- 后端 API 响应（P95）≤ 500ms，列表接口 ≤ 1s
- 前端首屏 FCP ≤ 1.5s，LCP ≤ 2.5s
- 5 角色并行录入/评审无状态冲突，后端乐观锁保证

### 2.5.2 稳定性需求
- 录入草稿自动保存，浏览器意外关闭后可恢复
- AI 检查异步执行，失败可重试
- 外部系统（PDTList/售后系统）故障不阻塞主流程

### 2.5.3 安全需求
- 企业 SSO/OIDC 认证，JWT Token
- 前端权限仅做 UI 控制，后端强校验
- 操作审计日志完整记录

---

# 3 软件设计

## 3.1 总体架构

### 3.1.1 系统整体架构

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          用户浏览器 (Chrome/Edge)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │               主平台 (qiankun 主应用)                                 │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │            转维电子流子应用 (React 18 SPA)                       │  │  │
│  │  │  路由: React Router v6                                         │  │  │
│  │  │  页面: 工作台 | 申请 | 详情 | 录入 | 评审 | SQA审核 | 配置中心    │  │  │
│  │  │  组件: PipelineProgress | CheckListTable | ReviewTable          │  │  │
│  │  │  状态: MobX 6 (applicationStore | userStore | templateStore)   │  │  │
│  │  │  服务: Axios (applicationService | entryService | reviewService)│  │  │
│  │  └────────────────────────────┬───────────────────────────────────┘  │  │
│  └───────────────────────────────┼──────────────────────────────────────┘  │
└──────────────────────────────────┼─────────────────────────────────────────┘
                                   │ HTTPS/JSON (Bearer Token)
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          SLB / Ingress                                     │
│                  ┌────────┴────────┐                                       │
│          ┌───────┴──────┐  ┌───────┴──────┐                                │
│          │ 转维系统 Pod-1│  │ 转维系统 Pod-N│  (无状态水平扩展)               │
│          └──────┬───────┘  └──────┬───────┘                                │
│   ┌─────────────┼─────────────────┼──────────────────────┐                 │
│   │  COLA 5.x 四层架构                                     │                 │
│   │  Adapter: REST Controller + Auth + VO                 │                 │
│   │  App: 用例编排 + 事务 + 事件 + AI检查调度               │                 │
│   │  Domain: 转维申请聚合 + 流水线状态机 + CheckList + 评审  │                 │
│   │  Infrastructure: MySQL + Redis + Flowable + Feign + OSS│                 │
│   └───────────────────────────────────────────────────────┘                 │
│            │            │            │                                       │
│     ┌──────┴──┐  ┌─────┴─────┐  ┌───┴────┐                                │
│     │ MySQL   │  │  Redis    │  │ Nacos  │                                 │
│     │ 主从    │  │  Cluster  │  │        │                                 │
│     └─────────┘  └───────────┘  └────────┘                                 │
│                                                                             │
│   外部系统集成:                                                              │
│   ┌────────────┬──────────────┬──────────────┬──────────┐                  │
│   │ AI检查服务  │ PDTList系统   │ 售后权限系统  │ 飞书      │                  │
│   │ Feign异步  │ Feign同步    │ Feign同步     │ Outbox   │                  │
│   └────────────┴──────────────┴──────────────┴──────────┘                  │
│                                                                             │
│   可观测性: CAT (链路追踪) + ELK (Filebeat → ES → Kibana)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.1.2 逻辑功能模块描述

**后端模块（COLA 5.x）**：

<lark-table rows="5" cols="3" column-widths="200,250,300">

  <lark-tr>
    <lark-td>
      模块 {align="center"}
    </lark-td>
    <lark-td>
      Maven 制品 {align="center"}
    </lark-td>
    <lark-td>
      职责 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Adapter 层
    </lark-td>
    <lark-td>
      transfer-maint-adapter
    </lark-td>
    <lark-td>
      REST Controller、认证鉴权、VO 转换、参数校验、OpenAPI 文档
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      App 层
    </lark-td>
    <lark-td>
      transfer-maint-app
    </lark-td>
    <lark-td>
      用例编排、事务边界、AI 检查调度、事件发布
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Domain 层
    </lark-td>
    <lark-td>
      transfer-maint-domain
    </lark-td>
    <lark-td>
      聚合根（TransferApplication）、流水线状态机、CheckList/评审要素实体、角色进度计算、Block/Legacy 任务
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Infrastructure 层
    </lark-td>
    <lark-td>
      transfer-maint-infrastructure
    </lark-td>
    <lark-td>
      MyBatis 持久化、Redis 缓存/锁、Flowable 集成、Feign 客户端（AI/PDTList/售后/飞书）、OSS、定时任务
    </lark-td>
  </lark-tr>

</lark-table>

**前端模块**：

<lark-table rows="8" cols="3" column-widths="200,250,300">

  <lark-tr>
    <lark-td>
      模块 {align="center"}
    </lark-td>
    <lark-td>
      关键组件 {align="center"}
    </lark-td>
    <lark-td>
      职责 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      工作台模块
    </lark-td>
    <lark-td>
      Workbench、TodoPanel
    </lark-td>
    <lark-td>
      转维列表、待办面板、按钮权限
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      申请模块
    </lark-td>
    <lark-td>
      ApplyPage、ProjectSelector
    </lark-td>
    <lark-td>
      创建转维申请、团队自动带出
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      详情模块
    </lark-td>
    <lark-td>
      DetailPage、PipelineProgress
    </lark-td>
    <lark-td>
      流水线可视化、基本信息、操作日志
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      录入模块
    </lark-td>
    <lark-td>
      EntryPage、CheckListTable、ReviewElementTable
    </lark-td>
    <lark-td>
      按角色 Tab 录入、AI 检查、委托
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      评审模块
    </lark-td>
    <lark-td>
      ReviewPage、SqaReviewPage
    </lark-td>
    <lark-td>
      逐项审核、Block/Legacy 任务创建
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      配置中心模块
    </lark-td>
    <lark-td>
      CheckListConfig、ReviewElementConfig
    </lark-td>
    <lark-td>
      模板 CRUD、版本管理
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      状态管理
    </lark-td>
    <lark-td>
      applicationStore、userStore、templateStore
    </lark-td>
    <lark-td>
      MobX 6 全局状态，角色进度自动计算
    </lark-td>
  </lark-tr>

</lark-table>

### 3.1.3 总体运行机制

**核心状态机——流水线阶段流转**：

```
                     ┌─────────────────────────────────────────────────────┐
                     │            5 角色并行              5 角色并行          │
                     │                                                     │
项目初始化(自动完成) → 资料录入与AI检查 ──(所有角色完成)──→ 维护评审 ──(所有角色完成)──→ SQA审核 → 信息变更(自动)
                     │    SPM ──→│                 │    SPM ──→│            │
                     │    测试 ──→│                 │    测试 ──→│            │
                     │    底软 ──→│                 │    底软 ──→│            │
                     │    系统 ──→│                 │    系统 ──→│            │
                     │    影像 ──→│                 │    影像 ──→│            │
                     └────────────┘                 └────────────┘
```

**角色级状态流转**：
```
录入阶段: not_started → in_progress → completed
评审阶段: not_started → in_progress → completed / rejected
    └── rejected 时退回录入阶段重新填写
```

**CheckList 项级状态流转**：
```
录入状态: not_entered → draft(暂存) → entered(提交)
AI检查:  not_started → in_progress → passed / failed
评审状态: not_reviewed → reviewing → passed / rejected
    └── rejected 时该项退回 not_entered 重新录入
```

**流水线自动推进逻辑**（后端 Domain 层）：
1. 某角色所有 CheckList 项 entryStatus=entered 且 aiCheckStatus=passed → 该角色 entryStatus=completed
2. 所有 5 角色 entryStatus=completed → pipeline.dataEntry=success，pipeline.maintenanceReview 开始
3. 某角色所有 CheckList 项 reviewStatus=passed → 该角色 reviewStatus=completed
4. 所有 5 角色 reviewStatus=completed → pipeline.maintenanceReview=success，pipeline.sqaReview 开始
5. SQA 审核通过 → pipeline.sqaReview=success → pipeline.infoChange 自动执行

### 3.1.4 对外接口

**REST API 接口清单**：

<lark-table rows="20" cols="4" column-widths="80,260,220,180">

  <lark-tr>
    <lark-td>
      方法 {align="center"}
    </lark-td>
    <lark-td>
      路径 {align="center"}
    </lark-td>
    <lark-td>
      说明 {align="center"}
    </lark-td>
    <lark-td>
      备注 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET
    </lark-td>
    <lark-td>
      /api/v1/applications
    </lark-td>
    <lark-td>
      获取转维申请列表
    </lark-td>
    <lark-td>
      分页、搜索、筛选
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/applications
    </lark-td>
    <lark-td>
      创建转维申请
    </lark-td>
    <lark-td>
      自动初始化模板
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}
    </lark-td>
    <lark-td>
      获取转维详情（含流水线状态）
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/cancel
    </lark-td>
    <lark-td>
      关闭/取消流水线
    </lark-td>
    <lark-td>
      SPM 或 SQA
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/checklist
    </lark-td>
    <lark-td>
      获取 CheckList 列表
    </lark-td>
    <lark-td>
      按角色筛选
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      PUT
    </lark-td>
    <lark-td>
      /api/v1/checklist/{itemId}/entry
    </lark-td>
    <lark-td>
      录入/暂存 CheckList 项
    </lark-td>
    <lark-td>
      draft / entered
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/checklist/{itemId}/delegate
    </lark-td>
    <lark-td>
      委托录入给其他用户
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/checklist/{itemId}/ai-check
    </lark-td>
    <lark-td>
      触发 AI 检查
    </lark-td>
    <lark-td>
      异步执行
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      PUT
    </lark-td>
    <lark-td>
      /api/v1/checklist/{itemId}/review
    </lark-td>
    <lark-td>
      提交评审意见
    </lark-td>
    <lark-td>
      passed / rejected
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/entry/submit/{role}
    </lark-td>
    <lark-td>
      角色级录入提交
    </lark-td>
    <lark-td>
      触发评审阶段
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/review/submit/{role}
    </lark-td>
    <lark-td>
      角色级评审提交
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/review-elements
    </lark-td>
    <lark-td>
      获取评审要素列表
    </lark-td>
    <lark-td>
      按角色筛选
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/sqa-review
    </lark-td>
    <lark-td>
      SQA 审核提交
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET/POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/block-tasks
    </lark-td>
    <lark-td>
      获取/创建 Block 任务
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET/POST
    </lark-td>
    <lark-td>
      /api/v1/applications/{id}/legacy-tasks
    </lark-td>
    <lark-td>
      获取/创建 Legacy 任务
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET
    </lark-td>
    <lark-td>
      /api/v1/todos
    </lark-td>
    <lark-td>
      获取当前用户待办
    </lark-td>
    <lark-td>
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET/POST/PUT/DELETE
    </lark-td>
    <lark-td>
      /api/v1/config/checklist-templates
    </lark-td>
    <lark-td>
      CheckList 模板 CRUD
    </lark-td>
    <lark-td>
      含版本管理
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      GET/POST/PUT/DELETE
    </lark-td>
    <lark-td>
      /api/v1/config/review-element-templates
    </lark-td>
    <lark-td>
      评审要素模板 CRUD
    </lark-td>
    <lark-td>
      含版本管理
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      POST
    </lark-td>
    <lark-td>
      /api/v1/upload
    </lark-td>
    <lark-td>
      文件上传（交接资料）
    </lark-td>
    <lark-td>
      OSS
    </lark-td>
  </lark-tr>

</lark-table>

### 3.1.5 对外依赖

<lark-table rows="5" cols="4" column-widths="120,150,200,280">

  <lark-tr>
    <lark-td>
      外部系统 {align="center"}
    </lark-td>
    <lark-td>
      触发时机 {align="center"}
    </lark-td>
    <lark-td>
      交互方式 {align="center"}
    </lark-td>
    <lark-td>
      故障策略 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      AI 检查服务
    </lark-td>
    <lark-td>
      录入提交后
    </lark-td>
    <lark-td>
      Feign POST 异步
    </lark-td>
    <lark-td>
      重试 3 次，失败可手动重新触发
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      PDTList 系统
    </lark-td>
    <lark-td>
      信息变更阶段
    </lark-td>
    <lark-td>
      Feign POST 同步
    </lark-td>
    <lark-td>
      失败不阻塞主流程，异步重试 + 告警
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      售后权限系统
    </lark-td>
    <lark-td>
      信息变更阶段
    </lark-td>
    <lark-td>
      Feign POST 同步
    </lark-td>
    <lark-td>
      同上
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      飞书
    </lark-td>
    <lark-td>
      全流程关键节点
    </lark-td>
    <lark-td>
      Outbox 异步 REST
    </lark-td>
    <lark-td>
      指数退避重试（最多 3 次）
    </lark-td>
  </lark-tr>

</lark-table>

## 3.2 第 1 层设计描述

### 3.2.1 逻辑视图

#### 3.2.1.1 领域模型（后端 DDD）

**聚合关系**：
```
TransferApplication (聚合根) 1:1 → PipelineState
  │
  ├── 1:N → CheckListItem (每个角色多项)
  ├── 1:N → ReviewElement (每个角色多项)
  ├── 1:N → BlockTask
  ├── 1:N → LegacyTask
  └── 1:N → OperationLog

PipelineState 1:5 → RoleProgress (SPM/测试/底软/系统/影像)

CheckListTemplate / ReviewElementTemplate → 配置域（独立聚合）
TemplateVersion → 模板版本管理
```

**核心实体说明**：

- **TransferApplication**：聚合根，含 id、projectId、applicant、team（研发+维护）、status（in_progress/completed/cancelled）、pipeline
- **PipelineState**：含 5 个阶段状态（projectInit/dataEntry/maintenanceReview/sqaReview/infoChange）+ 5 个角色进度（RoleProgress）
- **RoleProgress**：role + entryStatus + reviewStatus，由 CheckList 项状态自动计算
- **CheckListItem**：含 seq、type（检查项/交接资料）、responsibleRole、entryPerson/reviewPerson、entryContent、deliverables、aiCheckRule/Status/Result、reviewStatus/Comment、delegatedTo
- **ReviewElement**：含 standard、description、remark，录入/AI 检查/评审状态同 CheckListItem
- **BlockTask / LegacyTask**：description、resolution、responsiblePerson、deadline、status

#### 3.2.1.2 权限控制设计

**按钮权限矩阵**：

<lark-table rows="6" cols="3" column-widths="150,250,350">

  <lark-tr>
    <lark-td>
      按钮 {align="center"}
    </lark-td>
    <lark-td>
      可见条件 {align="center"}
    </lark-td>
    <lark-td>
      说明 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      详情
    </lark-td>
    <lark-td>
      始终可见
    </lark-td>
    <lark-td>
      所有人均可查看转维详情
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      录入
    </lark-td>
    <lark-td>
      当前用户是分配人且有未完成项 / 当前用户是角色负责人且该角色未进入评审
    </lark-td>
    <lark-td>
      仅显示给需要录入的用户
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      评审
    </lark-td>
    <lark-td>
      当前用户角色对应的录入已提交进入评审
    </lark-td>
    <lark-td>
      仅显示给维护团队对应角色
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      关闭流水线（评审前）
    </lark-td>
    <lark-td>
      当前用户是申请人（SPM）
    </lark-td>
    <lark-td>
      需填写取消原因
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      关闭流水线（评审后）
    </lark-td>
    <lark-td>
      当前用户是 SQA
    </lark-td>
    <lark-td>
      展示各角色评审结论 + 填写关闭原因
    </lark-td>
  </lark-tr>

</lark-table>

### 3.2.2 开发视图

#### 3.2.2.1 前端代码模型

```
src/
├── index.js                        # 入口（qiankun 生命周期）
├── App.js                          # 根组件
├── router/routes.js                # 路由配置（React.lazy）
├── pages/
│   ├── Workbench/                  # 工作台（列表 + 待办）
│   ├── Apply/                      # 创建转维申请
│   ├── Detail/                     # 转维详情（流水线可视化）
│   ├── Entry/                      # 资料录入与 AI 检查
│   ├── Review/                     # 维护评审
│   ├── SqaReview/                  # SQA 审核
│   └── Config/
│       ├── CheckList/              # CheckList 模板配置
│       └── ReviewElements/         # 评审要素模板配置
├── components/
│   ├── layout/AppLayout.js         # 全局侧边栏布局
│   ├── pipeline/PipelineProgress.js # 流水线可视化（5 阶段 + 5 角色子进度）
│   ├── CheckListTable.js           # CheckList 表格（录入/评审复用）
│   ├── ReviewElementTable.js       # 评审要素表格
│   ├── EntryContentRenderer.js     # 录入内容渲染 + 查看弹窗
│   ├── BlockTaskModal.js           # Block 任务创建弹窗
│   └── LegacyTaskModal.js          # Legacy 任务创建弹窗
├── stores/
│   ├── applicationStore.js         # 转维申请状态（含角色进度自动计算）
│   ├── userStore.js                # 当前用户
│   └── templateStore.js            # 模板配置
├── services/
│   ├── request.js                  # Axios 实例 + 拦截器
│   ├── applicationService.js       # 转维申请 API
│   ├── entryService.js             # 录入 API
│   ├── reviewService.js            # 评审 API
│   └── templateService.js          # 模板配置 API
├── constants/
│   ├── enums.js                    # 状态枚举 + 角色配置
│   └── statusConfig.js             # 状态 → 颜色/标签映射
├── hooks/
│   ├── usePermission.js            # 按钮权限 Hook
│   └── useAutoSave.js              # 草稿自动保存
└── i18n/                           # 国际化
```

### 3.2.3 运行视图

#### 3.2.3.1 核心业务流程

**流程 1：创建转维申请（自动初始化）**

```
SPM 选择项目 → 填写计划评审日期
  → POST /api/v1/applications
  → 后端：
    1. 创建 TransferApplication 记录
    2. 读取最新版本 CheckList 模板（60 项）
    3. 按角色自动分配 entryPerson（研发团队）和 reviewPerson（维护团队）
    4. 生成 CheckListItem × 60 + ReviewElement × N
    5. pipeline.projectInit = success（自动完成）
    6. pipeline.dataEntry = in_progress（开始录入阶段）
    7. 飞书通知所有团队成员
```

**流程 2：资料录入与 AI 检查（5 角色并行）**

```
底软开发代表进入录入页面 → Tab 切换到"底软"
  → 逐项填写 CheckListItem.entryContent
  → 上传交接资料（deliverables）
  → 暂存（draft）或提交（entered）
  → 提交后自动触发 AI 检查
      → 后端异步调用 AI 检查服务
      → AI 返回 passed/failed + 检查意见
  → 所有项 entered + AI passed
  → 点击"角色提交" → roleProgress.底软.entryStatus = completed

同时：SPM、测试、系统、影像 各自独立并行完成

→ 所有 5 角色 entryStatus=completed
→ pipeline.dataEntry = success
→ pipeline.maintenanceReview = in_progress
→ 飞书通知维护团队
```

**流程 3：维护评审 + SQA 审核**

```
维护团队底软代表进入评审页面
  → 逐项审核 CheckList（passed/rejected + 评审意见）
  → rejected 项退回至录入阶段
  → 可创建 Block 任务
  → 所有项 passed → 角色评审完成

→ 所有 5 角色 reviewStatus=completed
→ pipeline.maintenanceReview = success
→ SQA 进入审核
  → 查看所有角色评审结论
  → SQA 最终审核通过
→ pipeline.sqaReview = success
→ pipeline.infoChange 自动执行（更新 PDTList + 售后权限）
→ application.status = completed
→ 飞书通知全员
```

### 3.2.4 数据库设计

#### 3.2.4.1 数据表总览

<lark-table rows="14" cols="3" column-widths="80,250,420">

  <lark-tr>
    <lark-td>
      序号 {align="center"}
    </lark-td>
    <lark-td>
      表名 {align="center"}
    </lark-td>
    <lark-td>
      说明 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      t_transfer_application
    </lark-td>
    <lark-td>
      转维申请主表（项目、申请人、团队、状态、流水线 JSON）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      t_checklist_item
    </lark-td>
    <lark-td>
      CheckList 项（applicationId、角色、录入人、审核人、内容、AI 检查状态/结果、评审状态/意见）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      t_review_element
    </lark-td>
    <lark-td>
      评审要素（applicationId、角色、标准、描述、录入/AI 检查/评审状态）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      t_deliverable
    </lark-td>
    <lark-td>
      交接资料文件（checklistItemId、fileName、storageUrl、fileSize）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      5
    </lark-td>
    <lark-td>
      t_block_task
    </lark-td>
    <lark-td>
      Block 阻塞任务（applicationId、description、resolution、deadline、status）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      6
    </lark-td>
    <lark-td>
      t_legacy_task
    </lark-td>
    <lark-td>
      Legacy 遗留任务（applicationId、description、deadline、status）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      7
    </lark-td>
    <lark-td>
      t_operation_log
    </lark-td>
    <lark-td>
      操作日志（applicationId、operator、action、detail）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      8
    </lark-td>
    <lark-td>
      t_checklist_template
    </lark-td>
    <lark-td>
      CheckList 模板（type、checkItem、responsibleRole、entryRole、reviewRole、aiCheckRule）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      9
    </lark-td>
    <lark-td>
      t_review_element_template
    </lark-td>
    <lark-td>
      评审要素模板（standard、description、remark、responsibleRole）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      10
    </lark-td>
    <lark-td>
      t_template_version
    </lark-td>
    <lark-td>
      模板版本（type、version、createdBy、itemCount）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      11
    </lark-td>
    <lark-td>
      t_notification_outbox
    </lark-td>
    <lark-td>
      飞书通知发件箱（Outbox Pattern）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      12
    </lark-td>
    <lark-td>
      t_notification_log
    </lark-td>
    <lark-td>
      通知发送日志
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      13
    </lark-td>
    <lark-td>
      t_ai_check_task
    </lark-td>
    <lark-td>
      AI 检查异步任务（checklistItemId、taskStatus、result、retryCount）
    </lark-td>
  </lark-tr>

</lark-table>

#### 3.2.4.2 核心表 ER 关系

```
t_transfer_application (1) ──< (N) t_checklist_item
                                      │
                                 (1:N) ▼
                               t_deliverable

t_transfer_application (1) ──< (N) t_review_element
t_transfer_application (1) ──< (N) t_block_task
t_transfer_application (1) ──< (N) t_legacy_task
t_transfer_application (1) ──< (N) t_operation_log

t_checklist_template ←── t_template_version (版本管理)
t_review_element_template ←── t_template_version
```

### 3.2.5 部署视图

```
SLB / Ingress
  ├── 转维系统 Pod × N（Spring Boot 3.x + JDK 17，无状态水平扩展）
  ├── MySQL 主从（13 张业务表 + Flowable 引擎表）
  ├── Redis Cluster（分布式锁、模板缓存、枚举缓存）
  ├── Nacos（服务注册 + 配置管理）
  ├── OSS（交接资料文件存储）
  └── ELK（Filebeat → ES → Kibana）

前端部署：
  npm run build (CRACO + Webpack) → CDN/Nginx
  → qiankun 主应用注册子应用
```

---

# 4 软件约束

## 4.1 技术栈要求

**后端**：JDK 17 + Spring Boot 3.x + COLA 5.x + Flowable 7.x + MySQL 8.0 + Redis Cluster + Nacos + OpenFeign + SpringDoc OpenAPI + CAT + ELK

**前端**：React 18 + JavaScript (ES6+) + Webpack (CRA + CRACO) + Ant Design 5 + Less/Sass + MobX 6 + React Router v6 + Axios + qiankun + ECharts + AntV (G6/X6) + ahooks + react-intl + framer-motion/GSAP

## 4.2 安全合规约束

- 认证：企业 SSO/OIDC + JWT
- 前端权限仅做 UI 控制，后端强校验
- 文件上传：前后端双重校验 + OSS 预签名 URL
- 操作审计：t_operation_log 全操作记录

---

# 5 软件风险

<lark-table rows="7" cols="5" column-widths="50,120,260,170,250">

  <lark-tr>
    <lark-td>
      序号 {align="center"}
    </lark-td>
    <lark-td>
      维度 {align="center"}
    </lark-td>
    <lark-td>
      风险描述 {align="center"}
    </lark-td>
    <lark-td>
      影响范围 {align="center"}
    </lark-td>
    <lark-td>
      风险应对措施 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      5 角色并发
    </lark-td>
    <lark-td>
      5 个角色同时录入/评审同一转维申请下的不同 CheckList 项
    </lark-td>
    <lark-td>
      数据竞争/状态不一致
    </lark-td>
    <lark-td>
      每个 CheckList 项独立乐观锁，角色级进度由后端自动计算
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      AI 检查服务
    </lark-td>
    <lark-td>
      AI 检查服务不可用或响应超时
    </lark-td>
    <lark-td>
      录入提交后阻塞
    </lark-td>
    <lark-td>
      异步任务 + 重试 3 次 + 手动重新触发 + 降级为人工审核
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      模板变更
    </lark-td>
    <lark-td>
      进行中的转维使用旧模板，模板更新后不影响已创建的项
    </lark-td>
    <lark-td>
      数据一致性
    </lark-td>
    <lark-td>
      创建时快照模板，不受后续模板变更影响（版本化）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      外部系统集成
    </lark-td>
    <lark-td>
      PDTList/售后系统不可用导致信息变更失败
    </lark-td>
    <lark-td>
      转维无法完成
    </lark-td>
    <lark-td>
      信息变更失败不阻塞主流程，异步重试 + 人工介入
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      5
    </lark-td>
    <lark-td>
      微前端兼容
    </lark-td>
    <lark-td>
      qiankun 样式污染或 JS 沙箱冲突
    </lark-td>
    <lark-td>
      UI 异常
    </lark-td>
    <lark-td>
      strictStyleIsolation + CSS Modules + 避免全局变量
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      6
    </lark-td>
    <lark-td>
      驳回循环
    </lark-td>
    <lark-td>
      评审驳回后反复退回重新录入，可能导致流程停滞
    </lark-td>
    <lark-td>
      转维周期延长
    </lark-td>
    <lark-td>
      设置驳回次数告警阈值，超过 N 次自动通知 SQA 介入
    </lark-td>
  </lark-tr>

</lark-table>

---

# 6 参考文档

<lark-table rows="5" cols="3" column-widths="60,350,350">

  <lark-tr>
    <lark-td>
      序号 {align="center"}
    </lark-td>
    <lark-td>
      文档名称 {align="center"}
    </lark-td>
    <lark-td>
      说明 {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      《转维电子流系统-PRD》
    </lark-td>
    <lark-td>
      产品需求文档，定义业务流程和功能需求
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      《转维电子流系统-前端开发设计文档》
    </lark-td>
    <lark-td>
      前端架构设计，页面/组件/状态管理详细设计
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      《独立应用发布系统-后端技术方案设计》v3.0
    </lark-td>
    <lark-td>
      后端技术栈参考（COLA 5.x + Flowable 7.x + 通知/权限/日志方案）
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      tOS 软件概要设计模板 V2.0.1
    </lark-td>
    <lark-td>
      概要设计文档模板
    </lark-td>
  </lark-tr>

</lark-table>
