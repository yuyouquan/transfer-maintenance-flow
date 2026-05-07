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

### Components

- `src/components/layout/AppLayout.tsx` — Header + navigation (workbench, config)
- `src/components/pipeline/PipelineProgress.tsx` — 5-stage pipeline visualization
- `src/components/shared/` — Reusable hooks and renderers (useColumnSearch, EntryContentRenderer)

### Styling

Ant Design + Tailwind CSS. Primary color: `#4338ca` (indigo). Custom overrides for Ant Design components in `src/app/globals.css`.

## Documentation

- `docs/需求文档-转维电子流系统.md` — Requirements specification
- `docs/system-hld-feishu.md` — High-level design
- `docs/test-plan-feishu.md` — Test plan
- `docs/操作说明.md` — User operation guide
