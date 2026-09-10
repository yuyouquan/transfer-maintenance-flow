# 审核备注实施计划

**Goal:** 单条和批量审核可选填备注，并在录入与审核页逐条共享展示。

**Architecture:** 使用条目级 reviewRemark，维护审核页统一管理待确认记录快照与备注弹窗，确认后通过现有 Context 更新；表格复用 LongTextCell。

**Tech Stack:** Next.js、React、Ant Design、TypeScript、Puppeteer。

- [x] 新增浏览器检查脚本，先验证点击单条操作应打开备注框且尚未改变状态，确认旧实现未满足要求。
- [x] 在 CheckListItem、ReviewElement 中增加 `readonly reviewRemark?: string`。
- [x] 统一单条／批量审核的待确认状态，保存 ids、条目类型、结果、操作者和批量标识；弹窗确认时校验可审核记录，通过 Context 同时更新 `reviewStatus` 和 `reviewRemark`。
- [x] 两页四套表格增加“备注”列，使用 `LongTextCell`；原模板“备注”改为“模板备注”，调整横向滚动宽度。
- [x] 运行浏览器检查：两种表格、两种结果、单条与批量、空白、取消、权限切换、委派、跨页读回和重新录入保留备注；生成独立截图。
- [x] 运行 `npm run lint`、`npm run type-check`、`npm run build`，检查最终差异并记录验证结果。


## 验证结果（2026-09-10）

- 旧实现验证：点击单条“拒绝”后没有备注弹窗，浏览器断言按预期失败。
- `npm run type-check`：通过。
- `npm run build`：通过，全部 9 个静态页面生成完成。
- `npx eslint 'src/app/workbench/[id]/review/page.tsx' 'src/app/workbench/[id]/entry/page.tsx' src/types/index.ts scripts/verify-review-remarks.mjs`：本次修改文件通过。
- `npm run lint`：8 个既有错误、13 个警告，涉及旧截图脚本、`.claude/worktrees` 中的副本及 `VersionCompareModal.tsx` 未转义引号。本次没有修改这些文件。
- 使用生产构建启动 `npm run start -- --port 3001` 后运行 `node scripts/verify-review-remarks.mjs`：7 组检查通过，覆盖单条可选备注／取消、两类表格的批量通过与不通过、纯委派审核、跨页读回／重新录入／模板备注保留、纯委派录入及浏览器运行错误检查；退出码 0。
- 开发模式中观察到原有 Ant Design Divider.type、Collapse.expandIconPosition 弃用警告；生产版本无浏览器运行或控制台错误。
- 截图：`docs/screenshots/review-remarks/remark-modal.png`、`review-saved.png`、`entry-rejected-remarks.png`，已检查显示。
- `git diff --check`：通过；已有未提交改动保持原状。功能在本地 dev，未推送或部署。
