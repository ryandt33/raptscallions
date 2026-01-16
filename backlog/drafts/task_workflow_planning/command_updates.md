# Command & Agent Updates Required

> **Status:** Pending
> **Created:** 2026-01-16
> **Context:** Changes needed to support new workflow categories

## Overview

These updates apply to **shared infrastructure** (commands/agents used across multiple workflow categories). Changes here affect all workflows that use these components.

## Key Requirements

1. **PM decides workflow and category** when creating/reviewing tasks
2. **Commands organized by agent type:** `.claude/commands/{agent_type}/{command}.md`
3. **Agents end with explicit next step:** "Run `/command {task-id}` (agent)"
4. **Human can override** agent's suggested next step
5. **Agent can push back once** if command seems wrong, then follow human's decision
6. **Commands stay focused** - PM's workflow selection determines which commands to run; commands can warn but don't block based on category

---

## 1. Merge Integration Testing into QA

### Current State

- `/qa` command runs unit tests, outputs `INTEGRATION_TESTING` state
- `/integration-test` command runs Docker/real HTTP tests, outputs `DOCS_UPDATE` state
- Two separate phases, two separate reports

### Proposed Change

Merge into single `/qa` phase that does both unit and integration testing.

### Files to Update

#### `/qa` command (`.claude/commands/qa.md`)

**Changes:**
1. Add Docker infrastructure steps from `/integration-test`:
   - `pnpm docker:up`
   - Wait for healthy services
   - Execute real HTTP requests
   - `pnpm docker:down`
2. Change output state: `INTEGRATION_TESTING` → `DOCS_UPDATE`
3. Remove "Next Step" section about integration testing
4. Update report format to include integration results

#### `qa` agent (`.claude/agents/qa.md`)

**Changes:**
1. Add "Integration Testing" section with:
   - Docker setup instructions
   - Real HTTP request execution
   - Prerequisites checklist (from current `/integration-test`)
   - Authentication setup for protected endpoints
2. Update report template to include:
   - Integration test results section
   - Prerequisites checklist
   - Infrastructure notes
3. Note: Agent already outputs `DOCS_UPDATE` (command was inconsistent)

#### `/integration-test` command (`.claude/commands/integration-test.md`)

**Options:**
- **Deprecate:** Add note that this is now part of `/qa`
- **Remove:** Delete the file entirely
- **Keep for manual use:** Rename to indicate standalone usage

**Recommendation:** Deprecate with note, keep for edge cases where someone wants integration-only testing.

---

## 2. State Transition Fix

### Current Inconsistency

| File | Pass State |
|------|------------|
| `/qa` command | `INTEGRATION_TESTING` |
| `qa` agent | `DOCS_UPDATE` |

Command and agent disagree. This should be unified to `DOCS_UPDATE` after the merge.

---

## 3. `/commit-and-pr` Command

### Current State

Command exists at `.claude/commands/commit-and-pr.md`

### Workflow Decision

PR creation is now a **manual step** (human creates PR after DOCS_UPDATE).

### Options

1. **Keep command:** Available for manual use when human wants automated PR
2. **Remove command:** Enforce manual PR creation
3. **Rename:** `/create-pr` to indicate it's optional/manual

**Recommendation:** Keep for now, but remove from workflow documentation. Human can use it if they want automation.

---

## 4. Workflows That Use QA

After the merge, which workflows include the QA phase?

| Category | Uses QA? | Notes |
|----------|----------|-------|
| `development` | ✅ Yes | Full unit + integration |
| `schema` | ✅ Yes | Migrations need real DB validation |
| `bugfix` | ✅ Yes | Verify fix works |
| `infrastructure` | ❌ No | Config/tooling, no ACs |
| `documentation` | ❌ No | No code to test |

---

## 5. Implementation Order

1. **Define all workflow categories first** - Understand full scope
2. **Make shared infrastructure changes** - Update `/qa`, `qa` agent
3. **Deprecate `/integration-test`** - Add deprecation note
4. **Update workflow docs** - Reflect new state transitions

---

## Open Questions

1. Should `/integration-test` be kept for standalone use?
2. Should QA be optional for `schema` tasks (simple migrations vs complex)?
3. Any other commands that need updates based on new workflows?

---

## 6. New Commands Required

### Developer Commands

| Command | Purpose | Used In |
|---------|---------|---------|
| `/investigate` | Diagnose bug root cause | bugfix |

### Writer Commands

| Command | Purpose | Used In |
|---------|---------|---------|
| `/outline` | Create document structure | documentation |
| `/write-docs` | Write standalone documentation | documentation |
| `/review-docs` | Technical accuracy review | documentation |

### QA Commands

| Command | Purpose | Used In |
|---------|---------|---------|
| `/verify-fix` | Verify bug is fixed | bugfix |

### Analyst Commands

| Command | Purpose | Used In |
|---------|---------|---------|
| `/analyze-schema` | Schema analysis with tech debt focus | schema |

### Reviewer Commands

| Command | Purpose | Used In |
|---------|---------|---------|
| `/review-migration` | Migration safety review | schema |

---

## 7. Command Directory Structure

Reorganize commands by agent type:

```
.claude/commands/
├── analyst/
│   ├── analyze.md
│   └── analyze-schema.md       # NEW
├── architect/
│   └── review-plan.md
├── developer/
│   ├── write-tests.md
│   ├── implement.md
│   └── investigate.md          # NEW
├── reviewer/
│   ├── review-code.md
│   ├── review-docs.md          # NEW (or keep in writer?)
│   └── review-migration.md     # NEW
├── qa/
│   ├── qa.md
│   └── verify-fix.md           # NEW
├── writer/
│   ├── outline.md              # NEW
│   ├── write-docs.md           # NEW
│   └── update-docs.md
├── designer/
│   ├── review-ux.md
│   └── review-ui.md
└── pm/
    └── plan.md
```

**Decision needed:** Should `/review-docs` be in `reviewer/` or `writer/`?
- Per earlier decision: Writer does technical review (has context)
- So: `writer/review-docs.md`

---

## 8. PM Agent Updates

The PM agent needs workflow selection logic:

### Category Selection Criteria

```markdown
## Category Selection

When creating or reviewing a task, determine category:

| If task involves... | Category |
|---------------------|----------|
| API routes, services, business logic | `development` |
| Database tables, migrations, schema changes | `schema` |
| Config files, CI/CD, tooling, scripts | `infrastructure` |
| KB pages, guides, docs without code changes | `documentation` |
| Fixing bugs, defects, regressions | `bugfix` |

## Variant Selection

After category, determine if simple variant applies:

| Category | Simple Criteria |
|----------|-----------------|
| infrastructure | Config-only, no logic, tool validates |
| documentation | Updating existing, narrow scope |
| bugfix | Fix is obvious, no investigation needed |
| schema | Simple migration, PM judgment |

## Modifier Labels

Apply modifier labels as needed:

| Label | When to Apply |
|-------|---------------|
| `frontend` | Task involves UI components |
| `security` | Task involves secrets, auth, permissions |
```

### Task File Updates

PM should document workflow selection:

```markdown
## Workflow

- **Category:** development
- **Variant:** standard
- **Labels:** frontend
- **Rationale:** New API route with React UI component
```

---

## 9. Agent Output Format

All agents must end with explicit next step:

```markdown
## Next Step

Based on the **{category}** workflow ({variant}):

Run `/command {task-id}` (agent-type)

---

*Alternative: If you believe a different command is appropriate, you may override this suggestion.*
```

### Workflow-Aware Next Step Logic

Agent should:
1. Read task category and labels from task file
2. Determine current phase from task status
3. Look up next phase in workflow
4. Output appropriate command

Example for development workflow after CODE_REVIEW:
```markdown
## Next Step

Based on the **development** workflow (standard):

Run `/qa E01-T015` (qa agent)
```

Example for bugfix workflow after FIXING:
```markdown
## Next Step

Based on the **bugfix** workflow (standard):

Run `/review-code E06-T020` (reviewer agent)
```

---

## 10. Human Override Handling

When human runs unexpected command, agent should:

1. **Check if command matches workflow** - Is this the expected next step?
2. **If mismatch, push back once:**
   ```
   ⚠️ This task is using the **bugfix (standard)** workflow.
   Current status is FIXING, expected next command is `/review-code`.

   You're running `/qa` which typically comes after code review.

   Should I proceed with `/qa` anyway, or would you like to run `/review-code` first?
   ```
3. **If human confirms, proceed** - Human decision is final
4. **Log the override** - Note in task file that workflow was modified

---

## 11. Full Command Inventory

### Existing Commands (to update)

| Command | Agent | Updates Needed |
|---------|-------|----------------|
| `/analyze` | analyst | Add next step output |
| `/review-plan` | architect | Add next step output |
| `/write-tests` | developer | Add next step output |
| `/implement` | developer | Add next step output, workflow-aware |
| `/review-code` | reviewer | Add next step output |
| `/qa` | qa | Merge integration testing, add next step |
| `/update-docs` | writer | Add next step output |
| `/review-ux` | designer | Add next step output |
| `/review-ui` | designer | Add next step output |
| `/plan` | pm | Add category/workflow selection |

### New Commands (to create)

| Command | Agent | Purpose |
|---------|-------|---------|
| `/analyze-schema` | analyst | Schema analysis with tech debt |
| `/investigate` | developer | Bug root cause diagnosis |
| `/review-migration` | reviewer | Migration safety review |
| `/outline` | writer | Document structure |
| `/write-docs` | writer | Standalone documentation |
| `/review-docs` | writer | Technical accuracy review |
| `/verify-fix` | qa | Bug fix verification |

### Commands to Deprecate

| Command | Reason |
|---------|--------|
| `/integration-test` | Merged into `/qa` |

---

## 12. Implementation Priority

### Phase 1: Foundation
1. Create `.claude/workflows/README.md` ✅
2. Update `command_updates.md` with full scope ✅
3. Define command directory structure

### Phase 2: PM Updates
4. Update PM agent with workflow selection
5. Update `/plan` command with category output

### Phase 3: New Commands
6. Create `/investigate` (developer)
7. Create `/verify-fix` (qa)
8. Create `/outline`, `/write-docs`, `/review-docs` (writer)
9. Create `/analyze-schema`, `/review-migration` (analyst/reviewer)

### Phase 4: Existing Command Updates
10. Add next step output to all existing commands
11. Merge integration testing into `/qa`
12. Deprecate `/integration-test`

### Phase 5: Agent Updates
13. Update all agents with next step format
14. Add human override handling
