# 维护SPM审核实施计划

**Goal:** 替换最终审核节点及权限，移除 SQA 流程人员配置。

**Architecture:** 统一 maintenanceSpmReview 状态模型，用共享权限函数驱动工作台入口、动态待办和审核确认。新审核路由承载页面，旧路由跳转兼容。申请表和团队展示仅保留五个领域。

- [x] 编写浏览器回归脚本，覆盖工作台和最终审核节点替换。
- [x] 替换节点类型、页面标签、模拟数据和新旧路由；为权限和阶段校验建立共用函数。
- [x] 工作台入口、待办、审核确认使用同一责任人／阶段校验。
- [x] 移除创建、重开和详情的 SQA 团队项；维护 SPM 必选；清理 SQA 委派候选和样本。
- [x] 补齐浏览器正反向检查并复测备注功能。
- [x] 类型检查、静态检查、生产构建、浏览器运行检查；更新本地说明和验证记录。

## 验证记录（2026-09-10）

- `npm run build`、`npm run type-check`、本次修改文件的 ESLint 和 `git diff --check` 通过。
- `node scripts/test-maintenance-spm-access.mjs` 通过：指定责任人、其他角色、领域拒绝、终态、空角色及责任人变更。
- `node scripts/verify-maintenance-spm-review.mjs` 在本地生产预览通过：任务对应的维护 SPM 权限及待办、通过进入信息变更、拒绝理由必填及失败状态回读、旧地址跳转、重开和新建任务移除 SQA、维护 SPM 必选且所选人员保存成功。浏览器无运行时或控制台错误。
- `node scripts/verify-review-remarks.mjs` 回归通过，覆盖单条、批量、可选备注、取消、委派审核及录入页回读。
- 全量 `npm run lint` 仍有原有的 8 个错误和 13 个警告，位于旧截图脚本及 `VersionCompareModal.tsx` 等未修改文件；本次修改文件无静态检查错误。
- 截图保存在 `docs/screenshots/maintenance-spm-review/`。已更新本地需求和操作说明；未发布部署，未更新飞书文档。数据仍使用现有模拟状态。
