# Analysis: E06-T013

## Problem Statement

The KB needs a new "AI-Assisted Development" section (or "Agentic Development") to document the development practices used by RaptScallions. This involves creating the folder structure, index pages, and sidebar navigation. The section documents how we use AI to develop, not AI development itself.

## Context

### Related Code

- `/apps/docs/src/.vitepress/config.ts:42-290` - Existing sidebar configuration showing section and subsection patterns
- `/apps/docs/src/auth/index.md` - Example domain index page with architecture overview table, request flow, quick start, key files, and concept/pattern links
- `/apps/docs/src/auth/concepts/index.md` - Example subsection index page with topic list and quick reference table
- `/apps/docs/src/contributing/kb-page-design.md` - KB page design patterns including frontmatter, headings, and VitePress features

### Existing Patterns

- **Domain index pattern** in `/apps/docs/src/auth/index.md` - Full overview with table, flow diagram, quick start examples, key files table, and links to subsections
- **Subsection index pattern** in `/apps/docs/src/auth/concepts/index.md` - Simpler overview with topic list and quick reference table
- **Sidebar structure pattern** in `.vitepress/config.ts` - Top-level sections with collapsed subsections containing items

### Content Tasks Overview

This task (T013) creates the structure. Content comes from dependent tasks:

| Task | Content | Output Location |
|------|---------|-----------------|
| T014 | Current agents and commands | `agents/current/`, `commands/` |
| T015 | Historical prescriptive workflow | `workflows/prescriptive.md`, `agents/deprecated/` |
| T016 | Current deliberative workflow | `workflows/deliberative.md` |

### Constraints from Task

- AC1: Folder structure at `apps/docs/src/ai-development/` with specified subfolders
- AC2: Index pages for section and each subfolder
- AC3: Sidebar must be updated in `.vitepress/config.ts`
- AC4: `pnpm docs:build` must succeed with no errors
- Out of scope: Actual content for agents, commands, workflows (covered by T014-T016)

### User Clarifications

1. **No linking to `.claude/` files** - KB must duplicate content (for reference only)
2. **Deep navigation structure** confirmed with specific folders
3. **No example schemas** in placeholders
4. **Source tracking required** - KB pages need to track when content was copied from `.claude/` and establish update patterns

### Source Synchronization Pattern

Since KB pages duplicate content from `.claude/` source files, we need a pattern for:
- Tracking which source file the content came from
- Recording when the content was last synchronized
- Signaling when source files have been updated

**Proposed frontmatter pattern:**
```yaml
---
title: Developer Agent
source_file: .claude/agents/developer.md
source_synced_at: 2026-01-16
---
```

**Chosen approach: Manual sync with frontmatter tracking**

KB pages derived from `.claude/` files will include frontmatter that tracks:
- `source_file`: Path to the original `.claude/` file
- `source_synced_at`: Date when content was last synchronized

This establishes a pattern that content tasks (T014-T016) will follow. Future improvements (CI automation, single-source includes) can build on this foundation.

## Proposed Structure

Based on user direction, the structure will be:

```
apps/docs/src/ai-development/
├── index.md                    # Section overview
├── concepts/
│   └── index.md               # Core concepts (agent architecture, workflow states, etc.)
├── patterns/
│   └── index.md               # Reusable patterns (TDD workflow, multi-agent handoff)
├── decisions/
│   └── index.md               # ADRs for agentic development choices
├── agents/
│   ├── index.md               # Agent overview
│   ├── current/
│   │   └── index.md           # Current/active agents (content from T014)
│   └── deprecated/
│       └── index.md           # Historical/archived agents (content from T015)
├── commands/
│   └── index.md               # Slash commands reference (content from T014)
├── workflows/
│   └── index.md               # Workflow overview (prescriptive vs deliberative)
└── troubleshooting/
    └── index.md               # Common issues and solutions
```

## Proposed Approaches

### Approach A: Full Structure with Placeholder Indexes (Recommended)

**Summary:** Create the complete folder structure with all index pages as placeholders. Each index describes what will go there and links to the relevant content task.

**How it works:**
- Create all 10 index pages (main + 9 subsection indexes)
- Main index provides overview of agentic development philosophy
- Subsection indexes have "Coming Soon" or brief descriptions
- Sidebar fully configured with collapsed sections
- T014-T016 fill in content, may add additional pages

**Directory structure:**
```
ai-development/
├── index.md
├── concepts/index.md
├── patterns/index.md
├── decisions/index.md
├── agents/
│   ├── index.md
│   ├── current/index.md
│   └── deprecated/index.md
├── commands/index.md
├── workflows/index.md
└── troubleshooting/index.md
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Complete structure ready for content tasks | 10 placeholder pages to maintain |
| Sidebar fully navigable from day 1 | Some empty sections until T014-T016 complete |
| Clear pattern for content contributors | More upfront work |
| Matches user-specified structure exactly | |

**Risks:** Minimal - placeholder content is expected and documented in task scope.

### Approach B: Minimal Structure - Core Indexes Only

**Summary:** Create only the essential indexes (main + top-level subsections), deferring nested folders like `agents/current/` and `agents/deprecated/` to T014/T015.

**How it works:**
- Create 7 index pages (main + concepts/patterns/decisions/agents/commands/workflows/troubleshooting)
- Skip `agents/current/` and `agents/deprecated/` - let T014/T015 create them
- Sidebar has top-level entries only
- Less complete but less placeholder content

**Directory structure:**
```
ai-development/
├── index.md
├── concepts/index.md
├── patterns/index.md
├── decisions/index.md
├── agents/index.md           # No current/deprecated yet
├── commands/index.md
├── workflows/index.md
└── troubleshooting/index.md
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Fewer placeholder pages | Doesn't match user-specified structure |
| Less upfront work | T014/T015 must create folders |
| Still provides foundation | Sidebar incomplete until content tasks |
| | Coordination burden on content tasks |

**Risks:** T014/T015 need to know they're responsible for folder creation, increasing their scope.

### Approach C: Structure with Workflow-Specific Subfolders

**Summary:** Same as Approach A but add dedicated subfolders for the two workflow styles (prescriptive/deliberative) under workflows/.

**How it works:**
- Create full structure as in Approach A
- Add `workflows/prescriptive/` and `workflows/deliberative/` folders
- Each workflow style gets its own index and room for detailed pages
- Better organized if workflow documentation is extensive

**Directory structure (workflows section):**
```
workflows/
├── index.md
├── prescriptive/
│   └── index.md              # Historical workflow style
└── deliberative/
    └── index.md              # Current workflow style
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Maximum organization | May be over-structured for single-page workflows |
| Room for workflow deep-dives | T015/T016 specify single files, not folders |
| Parallel structure to agents | Deviates from T015/T016 output locations |

**Risks:** T015/T016 acceptance criteria specify single files (`workflows/prescriptive.md`, `workflows/deliberative.md`), not subdirectories. Would require updating those tasks.

## Acceptance Criteria Mapping

| AC | Approach A | Approach B | Approach C |
|----|------------|------------|------------|
| AC1: Folder structure | Complete with all specified subfolders | Missing agents/current, agents/deprecated | Complete + extra workflow subfolders |
| AC2: Index pages | 10 comprehensive placeholder indexes | 7 indexes (defers nesting) | 12+ indexes |
| AC3: Sidebar update | Fully configured | Partially configured | Fully configured + extra items |
| AC4: Build succeeds | Yes | Yes | Yes |

## Edge Cases

- **Empty subsections**: Handled with placeholder content referencing dependent tasks
- **Future content growth**: Approach A provides clear expansion points
- **Cross-task coordination**: Approach A minimizes; Approach B increases

## Analyst Recommendation

**Approach A (Full Structure with Placeholder Indexes)** is recommended:

1. **Matches user specification**: Creates exactly the structure requested (concepts, patterns, decisions, agents/current, agents/deprecated, commands, workflows, troubleshooting)

2. **Clear handoff to T014-T016**: Content tasks have their folders ready; they just add pages

3. **Sidebar completeness**: Users can see the full KB structure even before content is added

4. **Minimal coordination**: T014-T016 don't need to create folders, just populate them

5. **Naming**: Use "AI-Assisted Development" or "Agentic Development" as section title (not "AI in Development" which could be confused with "AI Development")

**Complexity estimate**: Low - File/folder creation and configuration updates. The 10 index pages are placeholders with consistent structure.

**Suggested section title options:**
- "AI-Assisted Development" - Clear that AI assists our development
- "Agentic Development" - Emphasizes the agent-based workflow
- "Development with AI" - Alternative phrasing
