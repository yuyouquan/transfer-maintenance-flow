# Project-Type Templates, Teams and Legacy Tasks Implementation Plan

> **For agentic workers:** Execute these tasks in the current session. Use dispatching-parallel-agents for the independent configuration and legacy-task modules after the shared contract is defined; verify specification and code quality before integration and release.

**Goal:** Deliver the approved 2026-09-22 design, then commit dev, merge main with --no-ff, publish Vercel and verify production.

**Architecture:** A shared configuration provider owns independent device/tOS template versions and stable team roles. Applications snapshot configuration and derive workflow roles from that snapshot. Shared legacy-task UI and permission helpers serve final review and detail pages.

**Tech Stack:** Next.js 16, React 19, Ant Design 6, TypeScript, Node assertion tests, existing browser verification tools, XLS/XLSX parsing library.

---

## Task 1 — Shared contract and regression baseline

- [x] Preserve the recorded dirty-file list. Run `npm run type-check`, source ESLint, and `node scripts/test-maintenance-spm-access.mjs` before edits; distinguish existing failures.
- [x] Add `src/types/config.ts` with `ProjectType = 'device' | 'tos'`, `TransferRole = {id,name,ipmRoleCode,isSpm?}`, `TemplateKind = 'checklist' | 'review_element'`, and `TemplateRow = {id,seq,content,type,remark?,responsibleRole,entryRole,reviewRole,aiCheckRule}`. The three role properties store stable role IDs.
- [x] Extend `src/types/index.ts` for optional application project type, role snapshot, version IDs and item template IDs / axis role IDs; allow dynamic role names and string business sequence numbers while preserving existing fixtures.
- [x] Write behavior tests before implementation for custom-role assignment, no-task completion and safe unique reopen matching. Compile TS to temporary JS with the existing TypeScript runtime for Node tests.

## Task 2 — Configuration and workbook IO (independent module)

Owned paths: `src/context/ConfigurationContext.tsx`, `src/lib/template-*.ts`, `src/lib/configuration.ts`, `src/mock/configuration.ts`, `src/components/config/`, `src/app/config/`, template assets, `scripts/test-template-*.mjs`.

- [x] Export `useConfiguration()` with `{ configurations, saveRole(projectType, role), removeRole(projectType, roleId), importTemplate(projectType, kind, rows) }`. Each project configuration has `{roles,checklistVersions,reviewVersions}`; versions have `{id,version,createdAt,rows}` and newest is first.
- [x] Convert existing mock rows into stable `TemplateRow` values preserving original IDs/content; assign grouped text sequence numbers to identical content. Create an independent tOS sample and clearly mark mock role codes.
- [x] Before parsing implementation, exercise actual workbooks: grouped V-01 preserved, invalid pairs rejected, merged-cell continuations expanded, ordinary blank grouping cells rejected, unknown roles rejected, duplicate role IDs/names/code rejected.
- [x] Implement real XLS/XLSX import, exact header order, import preview and atomic version creation. Match workbook role labels (including legacy labels) to stable IDs; export human-readable current names. Download/export workbooks using same schema and real merge ranges.
- [x] Provide project and nested configuration tabs, old-route compatibility, group-preserving search/pagination, actual version selection and comparison. Keep long-text preview. tOS has no review-elements page.
- [x] Role CRUD permits name/Code edit with stable ID, protects SPM identity and used roles; reflect renamed labels in templates. Verify config state persists across client navigation.

## Task 3 — Role-aware applications and pipeline (primary integration)

Owned paths: `src/lib/workflow-roles.ts`, `src/lib/application-materials.ts`, `src/context/ApplicationContext.tsx`, `src/app/layout.tsx`, `src/app/workbench/`, `src/components/pipeline/`, `src/mock/users.ts`, focused workflow tests.

- [x] `getApplicationRoles(app)` resolves snapshot or legacy defaults; `findRoleMember(app,team,roleId)` matches stable IDs and legacy aliases; `getItemRole(item,'entry'|'review')` resolves axis ownership. Use stable SPM identity for final review.
- [x] Wrap application provider in configuration provider. Generate material rows from selected project-type versions with text sequence, unique template ID, axis roles and assigned personnel. tOS generates zero review elements.
- [x] Apply form takes project ID/type context, creates both team columns from role configuration, matches Code for defaults, allows actual user selection, validates required personnel and snapshots roles/version IDs. Add independent tOS project fixtures.
- [x] Replace fixed five-role maps in entry, review, list/todos, detail, final review and pipeline. Zero-task roles do not block; custom roles remain actionable. Do not change entry/review delegation replacement and original-person visibility.
- [x] Hide review-element tabs, cards, anchors, guides and counts in tOS applications. Rename material tab/column labels consistently.
- [x] Reopen from current configuration, copying content only by unique business identity; never merge multiple group rows into one or reuse another role's inputs.

## Task 4 — Legacy tasks (independent reusable component)

Owned paths: `src/components/shared/LegacyTasksPanel.tsx`, `src/lib/legacy-tasks.ts`, `scripts/test-legacy-tasks.mjs`. Primary integrates component into pages and connects role-review creation.

- [x] Test assigned maintenance SPM vs unrelated/global roles; terminal application still editable in detail; owner only open→resolved; foreign application tasks rejected; mutable current-user checks prevent stale-dialog writes.
- [x] Add a shared panel taking `{application, mode:'detail'|'review', id?:string}`. Resolve current user/context live. Provide new-task modal with user ID, department, description, date; status switch across existing three values for SPM only.
- [x] Persist task changes in shared context with audit records. Preserve ID-first owner checks and legacy name fallback. New tasks default open.
- [x] Integrate panel in detail/final-review pages; final review mode gate follows review access while detail ignores stage lock. Role-review pass-and-create writes tasks instead of only a success message.

## Task 5 — Review, browser regression and release

- [x] Run `npm run type-check`, `npx eslint src`, all new Node assertion tests, relevant existing tests, `npm run build`. Fix errors introduced by this change; keep pre-existing unrelated dirty assets intact.
- [x] Use browser to import a grouped workbook, add a role (rename behavior covered by rule tests), create both project types, complete a tOS flow and check permissions for SPM/owner/unrelated users. Verify old application snapshots and delegation fixtures. Inspect browser runtime errors.
- [x] Dispatch read-only specification review, then code-quality review. Resolve blocking findings and rerun affected checks.
- [ ] Stage only owned changed files; commit Conventional Commit on dev and push. Inspect remote head and tree.
- [ ] Create a native managed release worktree from origin/main, merge dev with `--no-ff -m "Merge branch 'dev': project-type templates, teams and legacy tasks"`. Check merge tree parity, run release checks, push main without merging main into dev.
- [ ] Verify Vercel project identity, deployment Ready, Production alias and Git SHA. Use existing Git integration deployment, falling back to authenticated Vercel deployment only if needed.
- [ ] Verify named production flows and console/runtime health. Record commit IDs, deployment URL, tests and any remaining limitations in a release evidence document and final report.
