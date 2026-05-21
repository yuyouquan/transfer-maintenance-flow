# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

转维电子流系统 (Transfer Maintenance Flow System) — a digitalized project transfer/handover workflow from research teams to maintenance teams. Built with Next.js App Router, React 19, Ant Design 6, Tailwind CSS 4, TypeScript (strict mode). All data is currently mock-based (no backend).

## Commands

```bash
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run clean        # Remove .next
npm run clean:all    # Remove .next and node_modules
npm run reinstall    # Fresh node_modules reinstall
```

Node >= 18.0.0 required. Path alias: `@/*` → `./src/*`.

## Architecture

### Routing (Next.js App Router)

- `/workbench` — Main dashboard: project list, statistics, todo panel
- `/workbench/apply` — New transfer application form
- `/workbench/[id]` — Application detail view with timeline/history
- `/workbench/[id]/entry` — Data entry phase (research team, 5 parallel roles)
- `/workbench/[id]/review` — Maintenance review phase (pass/reject)
- `/workbench/[id]/sqa-review` — SQA quality assurance sign-off
- `/config` — Configuration center (checklist & review element templates)

All interactive pages use `'use client'`. Root layout provides AntdRegistry for server-side rendering.

### State Management (React Context)

**UserContext** (`src/context/UserContext.tsx`): Current user, user switching (15 mock users for role-based testing). Hook: `useCurrentUser()`.

**ApplicationContext** (`src/context/ApplicationContext.tsx`): Core state hub managing applications, checklistItems, and reviewElements. Key behavior:
- Auto-computes `roleProgress` from checklist/review element item statuses
- Auto-derives pipeline node statuses (dataEntry → maintenanceReview → sqaReview)
- Cascading transitions: maintenanceReview success → starts sqaReview
- Uses changed-flag check to prevent redundant updates

### Pipeline & Status Model

5-stage pipeline: `projectInit → dataEntry → maintenanceReview → sqaReview → infoChange`

5 parallel roles per stage: `SPM | 测试 | 底软 | 系统 | 影像`

Status enums (in `src/types/index.ts`):
- `PipelineNodeStatus`: not_started / in_progress / success / failed
- `EntryStatus`: not_entered / draft / entered
- `AICheckStatus`: not_started / in_progress / passed / failed
- `ReviewStatus`: not_reviewed / reviewing / passed / rejected

Status flows are hierarchical: application → pipeline → role → individual item.

### Key Types

All domain types in `src/types/index.ts`: `TransferApplication`, `PipelineState`, `CheckListItem`, `ReviewElement`, `BlockTask`, `LegacyTask`. Types use `Readonly<>` for immutability.

### Mock Data

`src/mock/` — 15 users across 6 roles, 2 projects, applications at various pipeline stages, checklist/review element templates. Mock data is the sole data source (no API layer yet).

Key delegation fixtures (for testing the 委派给我的 / 录入委派 / 审核委派 features):

- **Entry delegation in app-001**:
  - CL[36], CL[37], RE[6] → `delegatedTo: ['u001']` (delegated to 张三, who is also SPM in research team)
  - CL[28] → `delegatedTo: ['u006']` (孙八 is app-001 maintenance SPM, **not** in research; verifies "no role + has delegation" branch)
- **Review delegation in app-002**:
  - CL[36], RE[5] → `reviewDelegatedTo: ['u003']` (王五 is not in maintenance team; pure delegate-only audit view)
  - CL[37], CL[38], RE[6] → `reviewDelegatedTo: ['u001']` (张三 is SPM in maintenance; verifies "own role + delegated" combined view)
- `entryPersonOverride` field on `ItemOverride` interface still exists (line 47) but is unused — kept for symmetry/future extension.

## Delegation Semantics (Entry vs Review)

Both `delegatedTo` (entry) and `reviewDelegatedTo` (review) are typed `ReadonlyArray<string>` but treated as **single-element arrays** in practice. Delegating replaces (never accumulates); transferring just overwrites with a new array.

| Axis | Entry page | Review page |
|---|---|---|
| Field | `delegatedTo` | `reviewDelegatedTo` |
| Modify `entryPerson` on delegate? | **No** (preserves original assignee) | N/A |
| Allow clear delegation? | **No** — `DelegateModal allowClear={false}` | Yes (default) |
| Operation column gate | `isRoleOwner \|\| isDelegatedToMe` | Same |
| Access page when only delegated (no role)? | Yes (`canAccessPage = userResponsibleRoles.length > 0 \|\| hasDelegatedItems`) | Yes (mirrors entry; see `review/page.tsx`) |
| Top-level "委派给我的" Collapse | Yes (above main card, default expanded, cross-role aggregated) | Yes (same pattern) |
| Responsibility column tag | 紫色「已委派」 + 蓝色「录入委派→XX」 | 紫色「已委派」 + 蓝色「审核委派→XX」 |

When a user has no role for the page but does have delegated items, the page renders only `Header → Pipeline → 委派给我的 Collapse` — main card, sticky bar, rejection prompt are all gated by `userResponsibleRoles.length > 0`.

### Components

- `src/components/layout/AppLayout.tsx` — Header + navigation (workbench, config)
- `src/components/pipeline/PipelineProgress.tsx` — 5-stage pipeline visualization
- `src/components/shared/` — Reusable hooks, renderers, modals:
  - `useColumnSearch` — column header search dropdown
  - `EntryContentRenderer` — render entry content (link/path/text)
  - `DelegateModal` — **shared between entry & review pages**; takes `allowClear` prop (default `true`) to control bottom "清空委派" button. Entry page passes `allowClear={false}` because entry delegation is replace-only (no clear). Review page leaves default to allow clearing `reviewDelegatedTo`.

### Styling

Ant Design + Tailwind CSS. Primary color: `#4338ca` (indigo). Custom overrides for Ant Design components in `src/app/globals.css`.

## Documentation

- `docs/需求文档-转维电子流系统.md` — Requirements specification
- `docs/system-hld-feishu.md` — High-level design
- `docs/test-plan-feishu.md` — Test plan
- `docs/操作说明.md` — User operation guide
- **PRD on 飞书**: `https://transsioner.feishu.cn/docx/AiG6dzi5WoI6HyxyrjrcOwlSnCf` — canonical PRD; §5.5.8 = 录入页委派, §5.6.9 = 审核页委派. State diagram for §5.5.8.8 lives in whiteboard token `SimLwAU3ohwOpYbNRIZcCaFhnSK`. Use `lark-cli docs +fetch` / `+update` to read/edit programmatically.
- `docs/superpowers/specs/`, `docs/superpowers/plans/` — design specs and implementation plans for past feature work (e.g., `2026-05-18-entry-delegation-alignment-design.md`).

## Screenshot Pipeline

PRD screenshots live in `docs/screenshots/prd-pms-integration/` and are generated by Puppeteer scripts:

- `scripts/capture-review-delegation.mjs` — produces `14-17` (审核页委派)
- `scripts/capture-entry-delegation.mjs` — produces `18-21` (录入页委派)

Both scripts require `npm run dev` running on `:3000`. They switch users via Antd avatar dropdown (no page reload) so React state is preserved across shots. Add a new shot script when adding a feature area; do not retrofit existing scripts.

## Workflow Convention

- Work happens on `dev`; `main` integrates via `--no-ff` merge commits with descriptive subject lines (`Merge branch 'dev': <topic>`).
- `main` is never merged back into `dev`; dev continues forward on its own history.
- Commit messages use Conventional Commits prefixes (`feat`, `fix`, `refactor`, `chore`, `docs`).
