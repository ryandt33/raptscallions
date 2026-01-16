# Implementation Spec: E06-T013

## Task Summary

Create the KB folder structure and navigation for the "AI-Assisted Development" section documenting how RaptScallions uses AI agents throughout its development workflow.

## Selected Approach

**Approach A: Full Structure with Placeholder Indexes** (Analyst Recommended)

### Rationale

1. **Matches user specification exactly** — Creates all requested folders including agents/current, agents/deprecated, concepts, patterns, decisions, commands, workflows, troubleshooting
2. **Clean handoff to T014-T016** — Content tasks have their folders ready and only need to add pages
3. **Sidebar completeness** — Users can navigate the full structure even before content is populated
4. **Minimal coordination** — T014-T016 don't need to create folders, reducing scope creep

### Rejected Approaches

- **Approach B (Minimal Structure)**: Would require T014/T015 to create folders, increasing coordination burden and deviating from user-specified structure
- **Approach C (Workflow Subfolders)**: Over-engineered for single-page workflow docs; conflicts with T015/T016 which specify single files

## Architecture Constraints

### Folder Structure

```
apps/docs/src/ai-development/
├── index.md                    # Section overview
├── concepts/
│   └── index.md               # Core concepts overview
├── patterns/
│   └── index.md               # Reusable patterns overview
├── decisions/
│   └── index.md               # ADRs overview
├── agents/
│   ├── index.md               # Agents overview
│   ├── current/
│   │   └── index.md           # Current agents (content from T014)
│   └── deprecated/
│       └── index.md           # Deprecated agents (content from T015)
├── commands/
│   └── index.md               # Slash commands reference (content from T014)
├── workflows/
│   └── index.md               # Workflow overview
└── troubleshooting/
    └── index.md               # Common issues and solutions
```

### Section Title

Use **"AI-Assisted Development"** as the section title:
- Clear that AI assists our development process
- Distinguishes from "AI Development" (building AI features)
- Aligns with industry terminology

### Sidebar Position

Add after "Contributing" section but before "Improvements & Recommendations":
- Logical grouping with other meta-documentation
- Contributing explains how to contribute; AI-Assisted Development explains how we develop

### Index Page Pattern

Follow existing domain index pattern from `/auth/index.md`:

**Main Section Index (`ai-development/index.md`):**
- Architecture overview table (Agent, Hook Point, Purpose)
- Visual workflow diagram (Agent flow)
- Quick Start section (running common commands)
- Key Files table linking to `.claude/` sources
- Section links (Concepts, Patterns, Decisions, etc.)
- Implementation tasks table (T014-T016)

**Subsection Indexes (`concepts/index.md`, etc.):**
- Brief description of what the section contains
- Topics list with planned pages
- Quick reference table where applicable
- Related sections links

### Source Synchronization Pattern

KB pages derived from `.claude/` files must include frontmatter tracking:

```yaml
---
title: Developer Agent
source_file: .claude/agents/developer.md
source_synced_at: 2026-01-16
---
```

**Note:** This task creates placeholder pages without `source_file`/`source_synced_at`. Content tasks (T014-T016) will add these fields when populating real content.

### Placeholder Content Guidelines

Each placeholder index should:
1. Have proper frontmatter (title, description)
2. Include H1 matching title
3. Provide 1-2 sentence description of what will go there
4. Reference which content task will populate it (T014/T015/T016)
5. List expected topics with "Coming Soon" markers
6. Include "Related Sections" navigation

Example placeholder:

```markdown
---
title: Current Agents
description: Documentation for active agents in the RaptScallions development workflow
---

# Current Agents

This section documents the active agents used in RaptScallions development.

::: info Coming Soon
Content for this section will be added in [E06-T014](/backlog/tasks/E06/E06-T014.md).
:::

## Expected Topics

- Analyst agent
- Developer agent
- Designer agent
- (additional agents...)

## Related Sections

- [Deprecated Agents](/ai-development/agents/deprecated/) — Historical agents no longer in use
- [Commands](/ai-development/commands/) — Slash commands that invoke agents
```

## Implementation Steps

### Step 1: Create Directory Structure

Create all folders under `apps/docs/src/ai-development/`:
- `concepts/`
- `patterns/`
- `decisions/`
- `agents/`
- `agents/current/`
- `agents/deprecated/`
- `commands/`
- `workflows/`
- `troubleshooting/`

### Step 2: Create Main Section Index

Create `apps/docs/src/ai-development/index.md` with:
- Frontmatter (title: "AI-Assisted Development", description)
- Architecture overview table (Agent types, hook points, purpose)
- Agent workflow diagram (text-based or ASCII)
- Quick Start examples (common slash commands)
- Key Files table (pointing to `.claude/` directory)
- Section links to all subsections
- Implementation tasks table (T013-T016)
- Related Domains (Contributing, Testing)

### Step 3: Create Subsection Indexes

Create 9 index files with placeholder content:

| File | Title | Content Task |
|------|-------|--------------|
| `concepts/index.md` | AI Development Concepts | T014 |
| `patterns/index.md` | Development Patterns | T014 |
| `decisions/index.md` | Architecture Decisions | (future) |
| `agents/index.md` | Agent Documentation | T014/T015 |
| `agents/current/index.md` | Current Agents | T014 |
| `agents/deprecated/index.md` | Deprecated Agents | T015 |
| `commands/index.md` | Slash Commands | T014 |
| `workflows/index.md` | Development Workflows | T015/T016 |
| `troubleshooting/index.md` | Troubleshooting | (future) |

### Step 4: Update VitePress Sidebar

Edit `apps/docs/src/.vitepress/config.ts`:

```typescript
{
  text: "AI-Assisted Development",
  collapsed: false,
  items: [
    { text: "Overview", link: "/ai-development/" },
    {
      text: "Concepts",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/concepts/" }],
    },
    {
      text: "Patterns",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/patterns/" }],
    },
    {
      text: "Decisions",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/decisions/" }],
    },
    {
      text: "Agents",
      collapsed: true,
      items: [
        { text: "Overview", link: "/ai-development/agents/" },
        { text: "Current Agents", link: "/ai-development/agents/current/" },
        { text: "Deprecated Agents", link: "/ai-development/agents/deprecated/" },
      ],
    },
    {
      text: "Commands",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/commands/" }],
    },
    {
      text: "Workflows",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/workflows/" }],
    },
    {
      text: "Troubleshooting",
      collapsed: true,
      items: [{ text: "Overview", link: "/ai-development/troubleshooting/" }],
    },
  ],
},
```

Insert after "Contributing" section (before "Improvements & Recommendations").

### Step 5: Verify Build

Run `pnpm docs:build` and verify:
- No build errors
- All pages accessible in sidebar
- Internal links work (dev server check)

## File Changes

### New Files (10)

| File | Purpose |
|------|---------|
| `apps/docs/src/ai-development/index.md` | Main section index |
| `apps/docs/src/ai-development/concepts/index.md` | Concepts subsection index |
| `apps/docs/src/ai-development/patterns/index.md` | Patterns subsection index |
| `apps/docs/src/ai-development/decisions/index.md` | Decisions subsection index |
| `apps/docs/src/ai-development/agents/index.md` | Agents subsection index |
| `apps/docs/src/ai-development/agents/current/index.md` | Current agents index |
| `apps/docs/src/ai-development/agents/deprecated/index.md` | Deprecated agents index |
| `apps/docs/src/ai-development/commands/index.md` | Commands subsection index |
| `apps/docs/src/ai-development/workflows/index.md` | Workflows subsection index |
| `apps/docs/src/ai-development/troubleshooting/index.md` | Troubleshooting subsection index |

### Modified Files (1)

| File | Change |
|------|--------|
| `apps/docs/src/.vitepress/config.ts` | Add sidebar section for AI-Assisted Development |

## Testing Requirements

### Acceptance Criteria Verification

| AC | Verification Method |
|----|---------------------|
| AC1: Folder structure created | File system inspection |
| AC2: 10 index pages created | File count and content review |
| AC3: Sidebar updated | Visual inspection in dev server |
| AC4: Build succeeds | `pnpm docs:build` exits 0 |

### Manual Testing

1. Run `pnpm docs:dev`
2. Navigate to each new page via sidebar
3. Verify all internal links work
4. Verify page titles display correctly
5. Run `pnpm docs:build` and verify success

## Out of Scope

- Agent content (E06-T014)
- Command content (E06-T014)
- Workflow content (E06-T015, E06-T016)
- Actual documentation beyond placeholder structure
- Future improvements (CI sync checking, single-source includes)

## Dependencies

- **Depends on:** E06-T002 (VitePress setup) ✅ Complete
- **Blocks:** E06-T014, E06-T015, E06-T016 (content tasks)

## Risks

| Risk | Mitigation |
|------|------------|
| Build failure from malformed markdown | Run `pnpm docs:build` after each major change |
| Sidebar configuration errors | Follow existing patterns exactly |
| Inconsistent placeholder content | Use template for all subsection indexes |

## Complexity Assessment

**Low complexity** — File/folder creation and configuration changes only. No business logic, no tests required (documentation task). Follows well-established patterns from existing KB sections.
