---
id: task-001
title: VitePress setup and configuration
status: Done
assignee: []
created_date: '2026-01-13 06:56'
labels:
  - docs
  - infrastructure
milestone: E06
agentic_style: "prescriptive"
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up VitePress as a new workspace app at `apps/docs/` for the project's knowledge base. This provides a browsable, searchable interface for all documentation with fast development iteration.

Developers and agents need a way to quickly find and navigate documentation. Plain markdown files in a folder lack search, navigation, and visual hierarchy. VitePress transforms the docs into a professional documentation site that's easy to browse and search.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/docs/ workspace created with package.json
- [ ] #2 VitePress installed as dependency in apps/docs
- [ ] #3 pnpm-workspace.yaml updated to include apps/docs
- [ ] #4 VitePress config created at apps/docs/.vitepress/config.ts
- [ ] #5 pnpm --filter docs dev starts local development server
- [ ] #6 pnpm --filter docs build generates static site
- [ ] #7 Root package.json has docs:dev and docs:build scripts
- [ ] #8 Homepage (apps/docs/src/index.md) renders correctly
- [ ] #9 Local search functionality enabled and working
- [ ] #10 Dark/light theme toggle present (VitePress default)
- [ ] #11 Build outputs added to .gitignore
<!-- AC:END -->
