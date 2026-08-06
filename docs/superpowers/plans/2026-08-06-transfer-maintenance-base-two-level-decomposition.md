# 项目转维 Base 两级需求改写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将飞书 Base“项目管理-转维系统”的 25 条平铺需求改写为 6 条一级与 12 条二级需求，并完成 SR、人月、模块、父子关系和删除后的全量验收。

**Architecture:** 仅修改飞书 Base 的目标记录，不修改产品代码。先用真实系统关联字段锁定 25 条记录并校验字段结构，再串行更新一级和二级记录；二级通过自关联字段指向一级。只有 18 条保留记录全部读回正确后，才删除 7 条被合并的旧细项，最终从不带视图过滤的系统关联查询完成验收。

**Tech Stack:** `lark-cli base +...`、飞书多维表格、zsh、JSON、`jq`

---

## 文件与外部资源范围

- 设计依据：`docs/superpowers/specs/2026-08-06-transfer-maintenance-base-two-level-decomposition-design.md`
- 计划文件：`docs/superpowers/plans/2026-08-06-transfer-maintenance-base-two-level-decomposition.md`
- 产品代码：不修改。
- 飞书 Base：`🛠️ 2026工程化需求管理`
- 数据表：`需求管理`（`tblvWsd8bT9zoBe9`）
- 目标系统关联记录：`项目管理-转维系统`（`recvrcwsUUm51J`）
- 目标链接：`https://transsioner.feishu.cn/wiki/Od6ywYmnNiSTgwkSqoucSloRnSe?table=tblvWsd8bT9zoBe9&view=vewMnpNgGD`

## 固定字段映射

| 字段 | 字段 ID | 类型 | 本次写法 |
|---|---|---|---|
| 需求功能点 | `fldSJQfqQD` | text | 字符串 |
| 需求描述 | `flds1MYCsl` | text | 字符串 |
| SR编号 | `fldU23uL8Y` | text | 字符串，多个编号用顿号分隔 |
| 人力预估（人月） | `fldKgBwG8Q` | text | 一位小数字符串 |
| 所属模块 | `fld3X2QqLk` | multi-select | 单元素字符串数组 |
| 父记录 2 | `fldmMjgOJf` | self-link | 一级为 `null`；二级为 `[{"id":"父记录ID"}]` |
| 备注 | `flda1fMBtg` | text | 一级/二级统计口径说明 |
| 所属系统 | `fldboFiGvi` | link | 保留现值，不写入 |

### Task 1: 认证、Base 坐标和变更范围预检

**Files:**
- Read: `docs/superpowers/specs/2026-08-06-transfer-maintenance-base-two-level-decomposition-design.md`
- Modify: 飞书 Base 之外无文件修改

- [ ] **Step 1: 验证用户身份和 Base 权限**

Run:

```bash
LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 \
  lark-cli auth status --json --verify
```

Expected: 退出码为 0，`identity` 为 `user`，`verified` 为 `true`，并包含 `base:record:read`、`base:record:update`、`base:record:delete`。

- [ ] **Step 2: 从原始 Wiki URL 解析 Base token**

Run:

```bash
LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 \
  lark-cli base +url-resolve \
  --url 'https://transsioner.feishu.cn/wiki/Od6ywYmnNiSTgwkSqoucSloRnSe?table=tblvWsd8bT9zoBe9&view=vewMnpNgGD' \
  --as user --format json
```

Expected: `data.base_token` 为 `GOHObh72Xafl33sFASecyds1nic`，标题为 `🛠️ 2026工程化需求管理`。若 token 或表 ID 与本计划不同，停止写入并重新核对目标。

- [ ] **Step 3: 读取真实字段结构**

Run:

```bash
lark-cli base +field-list \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --limit 200 --as user --format json
```

Expected: 固定字段映射中的 8 个字段均存在；`需求功能点`、`需求描述`、`SR编号`、`人力预估（人月）`、`备注` 为 text，`所属模块` 为多选，`父记录 2` 与 `所属系统` 为 link。

- [ ] **Step 4: 通过所属系统关联锁定当前 25 条记录**

Run:

```bash
lark-cli base +record-list \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --filter-json '{"logic":"and","conditions":[["fldboFiGvi","intersects",[{"id":"recvrcwsUUm51J"}]]]}' \
  --field-id fldSJQfqQD \
  --field-id flds1MYCsl \
  --field-id fldU23uL8Y \
  --field-id fldKgBwG8Q \
  --field-id fld3X2QqLk \
  --field-id fldmMjgOJf \
  --field-id flda1fMBtg \
  --field-id fldboFiGvi \
  --field-id fldXLgDFbC \
  --field-id fldeFXWrBP \
  --field-id fldfEvXpqo \
  --field-id fldy2fKtpW \
  --field-id fldl4EsNYi \
  --field-id fldrcs9dZA \
  --limit 200 --as user --format json
```

Expected: `has_more=false`、`record_id_list` 恰好 25 条，并与设计文档中的 18 条复用 ID 和 7 条删除 ID 完全一致。若多一条、少一条或出现未知 ID，停止写入。

### Task 2: Dry-run 并更新 6 条一级记录

**Files:**
- Modify: 飞书 Base `需求管理`中的 6 条一级记录

- [ ] **Step 1: 定义串行更新函数**

Run in the same zsh session as subsequent update calls:

```bash
TRANSFER_BASE_TOKEN='GOHObh72Xafl33sFASecyds1nic'
TRANSFER_TABLE_ID='tblvWsd8bT9zoBe9'

update_transfer_record() {
  local transfer_record_id="$1"
  local transfer_payload="$2"
  local transfer_mode="$3"
  local -a transfer_extra_args
  transfer_extra_args=()
  if [[ "$transfer_mode" == 'dry-run' ]]; then
    transfer_extra_args+=(--dry-run)
  fi
  lark-cli base +record-upsert \
    --base-token "$TRANSFER_BASE_TOKEN" \
    --table-id "$TRANSFER_TABLE_ID" \
    --record-id "$transfer_record_id" \
    --json "$transfer_payload" \
    --as user --format json \
    "${transfer_extra_args[@]}"
}
```

Expected: 函数定义成功且不产生输出。

- [ ] **Step 2: 对 6 条一级记录执行 dry-run**

Run:

```bash
update_transfer_record 'recvreBFKYxMI9' '{"fldSJQfqQD":"[转维能力]工作台、申请与流程总览","flds1MYCsl":"建设转维统一入口，覆盖工作台、项目转维申请、团队初始化、五阶段流水线、流程详情和历史追溯。","fldU23uL8Y":"SR-202604-000577、SR-202604-000579","fldKgBwG8Q":"1.5","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
update_transfer_record 'recvreBFKYci2j' '{"fldSJQfqQD":"[转维能力]资料录入、AI 检查与录入委派","flds1MYCsl":"建设研发侧资料交付能力，覆盖双表录入、角色提交、交付件、AI 检查和委派协同。","fldU23uL8Y":"SR-202604-000576、SR-202604-000577、SR-202604-000578","fldKgBwG8Q":"2.4","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
update_transfer_record 'recvri3WJSKqb8' '{"fldSJQfqQD":"[转维能力]维护审核与问题闭环","flds1MYCsl":"建设维护团队分角色审核能力，覆盖多粒度审核、审核委派、驳回整改和问题闭环。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"2.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
update_transfer_record 'recvri3WJSzUw3' '{"fldSJQfqQD":"[转维能力]SQA 审核与流程终态管理","flds1MYCsl":"建设最终质量决策和生命周期管理能力，覆盖 SQA 审核、关闭、失败终态与流程重开。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.2","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
update_transfer_record 'recvreBFKYtVy9' '{"fldSJQfqQD":"[转维能力]模板配置与 AI 规则管理","flds1MYCsl":"建设转维配置中心，统一管理双模板、AI 规则、批量导入导出和版本生命周期。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"1.8","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
update_transfer_record 'recvri3WJSBDM9' '{"fldSJQfqQD":"[转维能力]待办通知与外部系统集成","flds1MYCsl":"建设流程协同和系统衔接能力，覆盖个人待办、飞书通知、信息变更及外部系统数据同步。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"2.2","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'dry-run'
```

Expected: 6 次均退出码 0，请求路径均为对应 `record_id` 的 PATCH；payload 只包含 7 个确认字段，且 `父记录 2` 均为 `null`。

- [ ] **Step 3: 串行写入 6 条一级记录**

Run the same six calls, changing only the final mode from `dry-run` to `write`:

```bash
update_transfer_record 'recvreBFKYxMI9' '{"fldSJQfqQD":"[转维能力]工作台、申请与流程总览","flds1MYCsl":"建设转维统一入口，覆盖工作台、项目转维申请、团队初始化、五阶段流水线、流程详情和历史追溯。","fldU23uL8Y":"SR-202604-000577、SR-202604-000579","fldKgBwG8Q":"1.5","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
update_transfer_record 'recvreBFKYci2j' '{"fldSJQfqQD":"[转维能力]资料录入、AI 检查与录入委派","flds1MYCsl":"建设研发侧资料交付能力，覆盖双表录入、角色提交、交付件、AI 检查和委派协同。","fldU23uL8Y":"SR-202604-000576、SR-202604-000577、SR-202604-000578","fldKgBwG8Q":"2.4","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
update_transfer_record 'recvri3WJSKqb8' '{"fldSJQfqQD":"[转维能力]维护审核与问题闭环","flds1MYCsl":"建设维护团队分角色审核能力，覆盖多粒度审核、审核委派、驳回整改和问题闭环。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"2.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
update_transfer_record 'recvri3WJSzUw3' '{"fldSJQfqQD":"[转维能力]SQA 审核与流程终态管理","flds1MYCsl":"建设最终质量决策和生命周期管理能力，覆盖 SQA 审核、关闭、失败终态与流程重开。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.2","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
update_transfer_record 'recvreBFKYtVy9' '{"fldSJQfqQD":"[转维能力]模板配置与 AI 规则管理","flds1MYCsl":"建设转维配置中心，统一管理双模板、AI 规则、批量导入导出和版本生命周期。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"1.8","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
update_transfer_record 'recvri3WJSBDM9' '{"fldSJQfqQD":"[转维能力]待办通知与外部系统集成","flds1MYCsl":"建设流程协同和系统衔接能力，覆盖个人待办、飞书通知、信息变更及外部系统数据同步。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"2.2","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":null,"flda1fMBtg":"一级汇总项；人力为子项合计，统计时勿与子项重复累计。"}' 'write'
```

Expected: 6 次返回均为 `ok=true`、`updated=true`，没有 `ignored_fields`。

### Task 3: Dry-run 并更新 12 条二级记录

**Files:**
- Modify: 飞书 Base `需求管理`中的 12 条二级记录

- [ ] **Step 1: 对前 6 条二级记录执行 dry-run**

Run:

```bash
update_transfer_record 'recvreBFKYkqEN' '{"fldSJQfqQD":"工作台、转维申请与团队初始化","flds1MYCsl":"提供转维统计、检索和角色化操作入口；支持从项目空间锁定项目发起申请，带出并调整研发/维护团队，按模板初始化任务与责任人。","fldU23uL8Y":"SR-202604-000577、SR-202604-000579","fldKgBwG8Q":"0.7","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":[{"id":"recvreBFKYxMI9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSGNZS' '{"fldSJQfqQD":"五阶段流水线、详情与历史追溯","flds1MYCsl":"展示项目发起、资料录入、维护审核、SQA 审核、信息变更五阶段及角色进度，汇总项目、团队、任务、状态和节点级历史。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.8","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":[{"id":"recvreBFKYxMI9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSJQqu' '{"fldSJQfqQD":"双表资料录入、角色提交与录入委派","flds1MYCsl":"支持 CheckList 和评审要素按角色录入、暂存、提交和重新录入；支持单条/批量委派、被委派视图及角色级提交准入校验。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.1","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":[{"id":"recvreBFKYci2j"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJS9bLz' '{"fldSJQfqQD":"交付件管理、AI 检查与结果闭环","flds1MYCsl":"支持交付件上传、识别、预览和下载，接入 AI 检查服务并管理检查中、通过、不通过、结果详情和修改后复检。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"1.3","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":[{"id":"recvreBFKYci2j"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJS2B9d' '{"fldSJQfqQD":"多粒度维护审核与审核委派","flds1MYCsl":"支持逐项、批量和整角色通过/驳回，记录评审意见；支持审核任务委派、转委派、清空委派及委派专属访问权限。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":[{"id":"recvri3WJSKqb8"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSGIfO' '{"fldSJQfqQD":"驳回重录、Block 与遗留任务闭环","flds1MYCsl":"驳回时创建 Block 任务并退回研发侧重录，二次提交时确认问题已解决；审核通过时登记遗留任务并跟踪到关闭。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":[{"id":"recvri3WJSKqb8"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
```

Expected: 6 次退出码均为 0，二级父链接依次指向前 3 条一级记录，每条 payload 只包含 7 个确认字段。

- [ ] **Step 2: 对后 6 条二级记录执行 dry-run**

Run:

```bash
update_transfer_record 'recvri3WJSoib5' '{"fldSJQfqQD":"SQA 决策、流水线关闭与终态处理","flds1MYCsl":"全部角色审核完成后进入 SQA 决策；支持通过进入信息变更、不通过进入失败终态，以及在允许阶段填写原因关闭流水线。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.6","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":[{"id":"recvri3WJSzUw3"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJScADQ' '{"fldSJQfqQD":"失败流程重开与历史资料回填","flds1MYCsl":"支持项目 SPM 或管理员对失败申请重开一次，按最新模板重建任务，回填原录入内容并重新触发 AI 检查。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.6","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":[{"id":"recvri3WJSzUw3"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSTHv3' '{"fldSJQfqQD":"CheckList 与评审要素模板管理","flds1MYCsl":"管理 CheckList 和评审要素模板字段、责任角色、录入/审核责任及生效快照，为新申请生成标准任务。","fldU23uL8Y":"SR-202604-000578","fldKgBwG8Q":"0.9","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":[{"id":"recvreBFKYtVy9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSigDz' '{"fldSJQfqQD":"AI 规则、导入导出与版本管理","flds1MYCsl":"梳理并配置 AI 判定规则，支持模板导入校验、导出、草稿/生效/历史版本管理及新增、修改、删除差异对比。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"0.9","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":[{"id":"recvreBFKYtVy9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJSRbW9' '{"fldSJQfqQD":"个人待办与飞书通知","flds1MYCsl":"汇总资料录入、维护审核和 SQA 待办并支持节点直达；在申请、委派、提交、驳回、通过、关闭和重开时发送可靠飞书提醒。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"0.9","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":[{"id":"recvri3WJSBDM9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
update_transfer_record 'recvri3WJS0nzN' '{"fldSJQfqQD":"信息变更、PDTList 与售后系统集成","flds1MYCsl":"SQA 通过后触发信息变更，幂等更新 PMS PDTList 和售后权限，提供失败重试、补偿、状态回写和审计记录。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"1.3","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":[{"id":"recvri3WJSBDM9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'dry-run'
```

Expected: 6 次退出码均为 0，二级父链接依次指向后 3 条一级记录。

- [ ] **Step 3: 串行写入全部 12 条二级记录**

Run:

```bash
update_transfer_record 'recvreBFKYkqEN' '{"fldSJQfqQD":"工作台、转维申请与团队初始化","flds1MYCsl":"提供转维统计、检索和角色化操作入口；支持从项目空间锁定项目发起申请，带出并调整研发/维护团队，按模板初始化任务与责任人。","fldU23uL8Y":"SR-202604-000577、SR-202604-000579","fldKgBwG8Q":"0.7","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":[{"id":"recvreBFKYxMI9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSGNZS' '{"fldSJQfqQD":"五阶段流水线、详情与历史追溯","flds1MYCsl":"展示项目发起、资料录入、维护审核、SQA 审核、信息变更五阶段及角色进度，汇总项目、团队、任务、状态和节点级历史。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.8","fld3X2QqLk":["转维工作台与申请"],"fldmMjgOJf":[{"id":"recvreBFKYxMI9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSJQqu' '{"fldSJQfqQD":"双表资料录入、角色提交与录入委派","flds1MYCsl":"支持 CheckList 和评审要素按角色录入、暂存、提交和重新录入；支持单条/批量委派、被委派视图及角色级提交准入校验。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.1","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":[{"id":"recvreBFKYci2j"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJS9bLz' '{"fldSJQfqQD":"交付件管理、AI 检查与结果闭环","flds1MYCsl":"支持交付件上传、识别、预览和下载，接入 AI 检查服务并管理检查中、通过、不通过、结果详情和修改后复检。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"1.3","fld3X2QqLk":["资料录入与 AI 检查"],"fldmMjgOJf":[{"id":"recvreBFKYci2j"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJS2B9d' '{"fldSJQfqQD":"多粒度维护审核与审核委派","flds1MYCsl":"支持逐项、批量和整角色通过/驳回，记录评审意见；支持审核任务委派、转委派、清空委派及委派专属访问权限。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":[{"id":"recvri3WJSKqb8"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSGIfO' '{"fldSJQfqQD":"驳回重录、Block 与遗留任务闭环","flds1MYCsl":"驳回时创建 Block 任务并退回研发侧重录，二次提交时确认问题已解决；审核通过时登记遗留任务并跟踪到关闭。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"1.0","fld3X2QqLk":["维护审核"],"fldmMjgOJf":[{"id":"recvri3WJSKqb8"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSoib5' '{"fldSJQfqQD":"SQA 决策、流水线关闭与终态处理","flds1MYCsl":"全部角色审核完成后进入 SQA 决策；支持通过进入信息变更、不通过进入失败终态，以及在允许阶段填写原因关闭流水线。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.6","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":[{"id":"recvri3WJSzUw3"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJScADQ' '{"fldSJQfqQD":"失败流程重开与历史资料回填","flds1MYCsl":"支持项目 SPM 或管理员对失败申请重开一次，按最新模板重建任务，回填原录入内容并重新触发 AI 检查。","fldU23uL8Y":"SR-202604-000577","fldKgBwG8Q":"0.6","fld3X2QqLk":["SQA 与终态"],"fldmMjgOJf":[{"id":"recvri3WJSzUw3"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSTHv3' '{"fldSJQfqQD":"CheckList 与评审要素模板管理","flds1MYCsl":"管理 CheckList 和评审要素模板字段、责任角色、录入/审核责任及生效快照，为新申请生成标准任务。","fldU23uL8Y":"SR-202604-000578","fldKgBwG8Q":"0.9","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":[{"id":"recvreBFKYtVy9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSigDz' '{"fldSJQfqQD":"AI 规则、导入导出与版本管理","flds1MYCsl":"梳理并配置 AI 判定规则，支持模板导入校验、导出、草稿/生效/历史版本管理及新增、修改、删除差异对比。","fldU23uL8Y":"SR-202604-000576、SR-202604-000578","fldKgBwG8Q":"0.9","fld3X2QqLk":["模板与规则"],"fldmMjgOJf":[{"id":"recvreBFKYtVy9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJSRbW9' '{"fldSJQfqQD":"个人待办与飞书通知","flds1MYCsl":"汇总资料录入、维护审核和 SQA 待办并支持节点直达；在申请、委派、提交、驳回、通过、关闭和重开时发送可靠飞书提醒。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"0.9","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":[{"id":"recvri3WJSBDM9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
update_transfer_record 'recvri3WJS0nzN' '{"fldSJQfqQD":"信息变更、PDTList 与售后系统集成","flds1MYCsl":"SQA 通过后触发信息变更，幂等更新 PMS PDTList 和售后权限，提供失败重试、补偿、状态回写和审计记录。","fldU23uL8Y":"SR-202604-000579","fldKgBwG8Q":"1.3","fld3X2QqLk":["通知与集成"],"fldmMjgOJf":[{"id":"recvri3WJSBDM9"}],"flda1fMBtg":"二级功能项；人力已计入所属一级汇总。"}' 'write'
```

Expected: 12 次均返回 `ok=true`、`updated=true`，没有 `ignored_fields`。若发生 `1254291`，仅对失败的当前记录短暂等待后串行重试，不并发重放已成功记录。

### Task 4: 删除前读回与风险门禁

**Files:**
- Read: 飞书 Base 18 条保留记录
- Delete candidate: 飞书 Base 7 条被合并记录

- [ ] **Step 1: 重新读取目标系统的全部 25 条记录**

Run:

```bash
lark-cli base +record-list \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --filter-json '{"logic":"and","conditions":[["fldboFiGvi","intersects",[{"id":"recvrcwsUUm51J"}]]]}' \
  --field-id fldSJQfqQD \
  --field-id flds1MYCsl \
  --field-id fldU23uL8Y \
  --field-id fldKgBwG8Q \
  --field-id fld3X2QqLk \
  --field-id fldmMjgOJf \
  --field-id flda1fMBtg \
  --field-id fldboFiGvi \
  --field-id fldXLgDFbC \
  --field-id fldeFXWrBP \
  --field-id fldfEvXpqo \
  --field-id fldy2fKtpW \
  --field-id fldl4EsNYi \
  --field-id fldrcs9dZA \
  --limit 200 --as user --format json
```

Expected: 仍为 25 条；6 条一级 `父记录 2=null`，12 条二级各有一个父链接，7 条待删记录仍存在。若 18 条保留记录任一字段或父链接不符，停止删除并修复对应记录。

- [ ] **Step 2: dry-run 精确删除请求**

Run:

```bash
lark-cli base +record-delete \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --record-id recvri3WJSnxLv \
  --record-id recvri3WJSDD74 \
  --record-id recvri3WJS1hqT \
  --record-id recvri3WJSxlZt \
  --record-id recvri3WJS8sJM \
  --record-id recvri3WJSn1XL \
  --record-id recvri3WJSaVok \
  --dry-run --as user --format json
```

Expected: 请求体中只有上述 7 个 record ID，表 ID 为 `tblvWsd8bT9zoBe9`。用户已在书面设计中确认删除这 7 条，因此请求完全一致时可进入下一步；任何 ID 漂移都必须停止。

- [ ] **Step 3: 通过高风险门禁删除 7 条记录**

Run:

```bash
lark-cli base +record-delete \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --record-id recvri3WJSnxLv \
  --record-id recvri3WJSDD74 \
  --record-id recvri3WJS1hqT \
  --record-id recvri3WJSxlZt \
  --record-id recvri3WJS8sJM \
  --record-id recvri3WJSn1XL \
  --record-id recvri3WJSaVok \
  --yes --as user --format json
```

Expected: 退出码为 0、`ok=true`，返回 7 条删除结果。删除后不可通过本流程自动恢复，因此不得扩大 ID 范围。

### Task 5: 全量读回和验收

**Files:**
- Read: 飞书 Base `需求管理`
- Modify: 无

- [ ] **Step 1: 读取不受原视图隐藏条件影响的最终结果**

Run:

```bash
lark-cli base +record-list \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --filter-json '{"logic":"and","conditions":[["fldboFiGvi","intersects",[{"id":"recvrcwsUUm51J"}]]]}' \
  --field-id fldSJQfqQD \
  --field-id flds1MYCsl \
  --field-id fldU23uL8Y \
  --field-id fldKgBwG8Q \
  --field-id fld3X2QqLk \
  --field-id fldmMjgOJf \
  --field-id flda1fMBtg \
  --field-id fldboFiGvi \
  --limit 200 --as user --format json
```

Expected: `has_more=false`，总数 18；需求功能点、需求描述、SR、人月、模块、备注、所属系统均非空。

- [ ] **Step 2: 验证精确父子映射**

Expected mapping:

```text
recvreBFKYxMI9 <- recvreBFKYkqEN, recvri3WJSGNZS
recvreBFKYci2j <- recvri3WJSJQqu, recvri3WJS9bLz
recvri3WJSKqb8 <- recvri3WJS2B9d, recvri3WJSGIfO
recvri3WJSzUw3 <- recvri3WJSoib5, recvri3WJScADQ
recvreBFKYtVy9 <- recvri3WJSTHv3, recvri3WJSigDz
recvri3WJSBDM9 <- recvri3WJSRbW9, recvri3WJS0nzN
```

Expected: 一级 6 条且父记录为空；二级 12 条且每条只有一个父记录；每个一级恰好有两个二级，不存在孤儿二级。

- [ ] **Step 3: 验证人月与模块口径**

Expected:

```text
转维工作台与申请: 0.7 + 0.8 = 1.5
资料录入与 AI 检查: 1.1 + 1.3 = 2.4
维护审核: 1.0 + 1.0 = 2.0
SQA 与终态: 0.6 + 0.6 = 1.2
模板与规则: 0.9 + 0.9 = 1.8
通知与集成: 0.9 + 1.3 = 2.2
一级合计: 11.1
二级合计: 11.1
```

Expected: 所有人月均为一位小数字符串和 0.1 的整数倍；一级与对应二级使用相同模块；统计总量时只取一级或二级一层，不重复累计。

- [ ] **Step 4: 验证未授权字段未被改写**

Run:

```bash
lark-cli base +record-get \
  --base-token GOHObh72Xafl33sFASecyds1nic \
  --table-id tblvWsd8bT9zoBe9 \
  --record-id recvreBFKYxMI9 \
  --record-id recvreBFKYci2j \
  --record-id recvri3WJSKqb8 \
  --record-id recvri3WJSzUw3 \
  --record-id recvreBFKYtVy9 \
  --record-id recvri3WJSBDM9 \
  --record-id recvreBFKYkqEN \
  --record-id recvri3WJSGNZS \
  --record-id recvri3WJSJQqu \
  --record-id recvri3WJS9bLz \
  --record-id recvri3WJS2B9d \
  --record-id recvri3WJSGIfO \
  --record-id recvri3WJSoib5 \
  --record-id recvri3WJScADQ \
  --record-id recvri3WJSTHv3 \
  --record-id recvri3WJSigDz \
  --record-id recvri3WJSRbW9 \
  --record-id recvri3WJS0nzN \
  --field-id fldXLgDFbC \
  --field-id fldeFXWrBP \
  --field-id fldfEvXpqo \
  --field-id fldy2fKtpW \
  --field-id fldl4EsNYi \
  --field-id fldrcs9dZA \
  --as user --format json
```

Compare all six projected values for every retained record with the Task 1 Step 4 preflight response.

Expected: 所有更新响应均无 `ignored_fields` 或额外字段；复用记录的 IR、提出人、部门、专项、日期、状态保持原值。

- [ ] **Step 5: 交付结果**

Report the actual readback values, not only request success:

```text
最终记录数：18
一级：6
二级：12
一级人月：11.1
二级人月：11.1
删除：7
父子关系：6 组全部通过
```

Include the original Base URL and explain that the first-level effort is a rollup of second-level effort and must not be double-counted.
