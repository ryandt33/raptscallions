# Available Commands

This directory contains all available slash commands that can be used with Claude Code in this project.

## Task Workflow Commands

These commands guide tasks through the development workflow:

| Command | Agent | Description | When to Use |
|---------|-------|-------------|-------------|
| `/plan` | pm | Break down goals into epics and tasks | Starting a new phase or feature |
| `/replan-task` | pm | Refactor poorly-written task to outcome-focused format | When task has too much implementation detail or is too large |
| `/analyze` | analyst | Write implementation spec from task | After task creation (DRAFT → ANALYZING) |
| `/review-ux` | designer | Review spec for UX concerns | After spec written (ANALYZED → UX_REVIEW) |
| `/review-plan` | architect | Validate implementation plan | After UX review (UX_REVIEW → PLAN_REVIEW) |
| `/write-tests` | developer | Write tests (TDD red phase) | After plan approval (APPROVED → WRITING_TESTS) |
| `/implement` | developer | Implement code to pass tests | After tests written (TESTS_READY → IMPLEMENTING) |
| `/review-ui` | designer | Review implemented UI | After implementation (IMPLEMENTED → UI_REVIEW) |
| `/review-code` | reviewer | Fresh-eyes code review | After UI review (UI_REVIEW → CODE_REVIEW) |
| `/qa` | qa | Run QA validation (unit tests, build) | After code review (CODE_REVIEW → QA_REVIEW) |
| `/integration-test` | qa | Run integration tests against Docker | After QA (QA_REVIEW → INTEGRATION_TESTING) |
| `/investigate-failure` | qa | Analyze integration failure root cause | After failure (INTEGRATION_FAILED) |
| `/update-docs` | writer | Update documentation | After integration passes (INTEGRATION_TESTING → DOCS_UPDATE) |
| `/commit-and-pr` | git-agent | Commit changes and create pull request | After docs updated (DOCS_UPDATE → PR_READY) |
| `/align-design` | designer | Review/create design guides for UI alignment | Before project start or periodically |
| `/document` | writer + reviewer | Write and review KB documentation | For documentation tasks (E06-T005+) |

## Epic Management Commands

Commands for managing epics and planning:

| Command | Agent | Description | Usage |
|---------|-------|-------------|-------|
| `/roadmap` | pm | View or update project roadmap | `/roadmap` or `/roadmap plan-next` |
| `/epic-review` | pm | Review completed epic, create follow-ups | `/epic-review E01 --create` |

## Task Discovery Commands

Commands for finding and tracking tasks:

| Command | Agent | Description | Usage |
|---------|-------|-------------|-------|
| `/next-task` | - | Find next ready task | `/next-task` or `/next-task E01` |
| `/task-status` | - | View task board or specific task | `/task-status` or `/task-status E01-T003` |

## Agent Training & Improvement Commands

Commands for auditing and improving agent definitions:

| Command | Agent | Description | Usage |
|---------|-------|-------------|-------|
| `/audit` | trainer | Analyze agent output for quality | `/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md` |
| `/postmortem` | trainer | Technical post-mortem when agent goes off-base | `/postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md` |
| `/refine-agent` | trainer | Analyze patterns and create improvement plan | `/refine-agent qa --epic E01` |
| `/apply-improvements` | trainer | Apply approved improvements to agent files | `/apply-improvements backlog/docs/training/qa-improvements-20260115.md` |

## Command Details

### Planning & Breakdown

**`/plan [goal/feature description]`**
- Creates epics and tasks from high-level goals
- Defines dependencies and priorities
- Writes outcome-focused task files with acceptance criteria
- Example: `/plan "Add user authentication system"`

**`/replan-task [task-id]`** (Optional Quality Step)
- Refactors tasks that contain too much implementation detail
- Removes code from task descriptions and acceptance criteria
- Splits oversized tasks into appropriately-scoped subtasks
- Rewrites to outcome-focused format (WHAT + WHY instead of HOW)
- Use when tasks have 15+ AC, contain TypeScript/SQL code, or prescribe implementation
- Example: `/replan-task E05-T006`
- Example: `/replan-task E03-T003 --split` (force split)

### Analysis & Specs

**`/analyze [task-id]`**
- Reads task description and acceptance criteria
- Explores codebase for context
- Writes detailed implementation spec
- Example: `/analyze E01-T003`

### Design Reviews

**`/review-ux [task-id]`**
- Reviews spec from UX perspective
- Checks for usability and accessibility
- Can approve or reject with feedback
- Example: `/review-ux E01-T005`

**`/review-ui [task-id]`**
- Reviews implemented UI/components
- Validates design consistency
- Checks accessibility compliance
- Example: `/review-ui E01-T005`

**`/align-design [--domain <name>] [--create] [--review-only]`** ⭐ **NEW**
- Reviews existing design guides for completeness
- Creates comprehensive design guides if missing
- Ensures UI alignment and theming standards
- Documents design system, components, accessibility
- Example: `/align-design` or `/align-design --domain ui --create`

### Architecture Review

**`/review-plan [task-id]`**
- Validates implementation approach
- Checks architectural consistency
- Verifies patterns and best practices
- Example: `/review-plan E01-T003`

### Development

**`/write-tests [task-id]`**
- Writes tests first (TDD red phase)
- Creates comprehensive test coverage
- Follows AAA pattern
- Example: `/write-tests E01-T003`

**`/implement [task-id]`**
- Implements code to pass tests
- TDD green phase (make tests pass)
- Refactors for quality
- Example: `/implement E01-T003`

### Code Quality

**`/review-code [task-id]`**
- Fresh-eyes code review
- Checks conventions and best practices
- Identifies issues by severity
- Example: `/review-code E01-T003`

**`/qa [task-id]`**
- Runs unit tests, build, and typecheck
- Validates against acceptance criteria
- Verifies code quality before integration
- Example: `/qa E01-T003`

### Integration Testing

**`/integration-test [task-id]`**
- Spins up Docker infrastructure (Postgres, Redis, API)
- Runs real HTTP requests against acceptance criteria
- Validates implementation works in real environment
- Example: `/integration-test E01-T003`

**`/investigate-failure [task-id]`**
- Analyzes why integration tests failed
- Determines if tests or implementation are wrong
- Routes to TESTS_REVISION_NEEDED or IMPLEMENTING
- Example: `/investigate-failure E01-T003`

### Documentation

**`/update-docs [task-id]`**
- Updates docs after implementation
- Ensures consistency with code
- Adds examples and usage notes
- Example: `/update-docs E01-T003`

**`/document [task-id]`** ⭐ **NEW**
- Two-phase workflow for KB documentation tasks
- Phase 1: Writer researches and writes documentation
- Phase 2: Reviewer verifies accuracy and completeness
- Automatic revision loop until approved
- Use for E06 KB documentation tasks (E06-T005+)
- Example: `/document E06-T010`

### GitHub Integration

**`/commit-and-pr [task-id]`**
- Commits changes following conventions
- Runs CI checks locally (`pnpm ci:check`)
- Creates feature branch if needed
- Creates pull request with template
- Configures automerge (low/medium priority)
- Example: `/commit-and-pr E01-T003`

### Epic Management

**`/roadmap`**
- Shows current project roadmap
- Displays epic progress
- Example: `/roadmap`

**`/roadmap plan-next`**
- Plans the next unplanned epic
- Creates tasks from roadmap goals
- Example: `/roadmap plan-next`

**`/epic-review [epic-id]`** ⭐ **NEW**
- Reviews all completed tasks in epic
- Analyzes all review documents
- Extracts outstanding issues
- Creates comprehensive report
- Example: `/epic-review E01`

**`/epic-review [epic-id] --create`**
- Same as above, plus:
- Automatically creates follow-up tasks
- For critical and high-priority issues
- Example: `/epic-review E01 --create --threshold high`

**Epic Review Flags:**
- `--create` - Automatically create follow-up tasks
- `--threshold [critical|high|medium|low]` - Minimum severity for task creation (default: high)

### Task Discovery

**`/next-task`**
- Shows all ready tasks
- Sorted by priority
- Shows blocked tasks
- Example: `/next-task` or `/next-task E01`

**`/task-status`**
- Shows task board by state
- Or details for specific task
- Example: `/task-status` or `/task-status E01-T003`

### Agent Training & Improvement

**`/audit <agent-type> <artifact-path>`** ⭐ **NEW**
- Analyzes a specific agent output for quality and completeness
- Evaluates against quality criteria (completeness, clarity, adherence, effectiveness)
- Generates balanced feedback with strengths, gaps, and recommendations
- Use for standard quality checks
- Example: `/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md`

**`/postmortem <agent-type> <artifact-path> [--context <path>]`** ⭐ **NEW**
- Deep dive technical analysis when an agent goes significantly off-base
- Performs root cause analysis and traces failure back to agent instructions
- Proposes specific, targeted fixes to prevent recurrence
- Use when agent produced incorrect output or completely misunderstood task
- Example: `/postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md`

**`/refine-agent <agent-type> [--all] [--since DATE] [--epic EPIC-ID]`** ⭐ **NEW**
- Analyzes patterns across multiple agent outputs
- Identifies recurring gaps, common errors, and inconsistencies
- Creates systematic improvement plan with prioritized recommendations
- Optionally creates backlog tasks for high-priority improvements
- Example: `/refine-agent qa --epic E01`
- Example: `/refine-agent reviewer --since 2026-01-01`

**`/apply-improvements <plan-path> [--items 1,3,5]`** ⭐ **NEW**
- Applies approved improvements to agent definition files
- Always shows diffs and requires explicit confirmation before modifying files
- Creates changelog for rollback capability
- Can apply all improvements or specific items only
- Example: `/apply-improvements backlog/docs/training/qa-improvements-20260115.md`
- Example: `/apply-improvements backlog/docs/training/qa-improvements-20260115.md --items 1,2`

## Orchestrator Integration

The orchestrator (`pnpm workflow:run`) automatically calls these commands in sequence:

```
Task State Flow:
DRAFT → [optional: /replan-task] → /analyze → ANALYZING → ANALYZED
  → /review-ux → UX_REVIEW → PLAN_REVIEW
  → /review-plan → APPROVED
  → /write-tests → WRITING_TESTS → TESTS_READY
  → /implement → IMPLEMENTING → IMPLEMENTED
  → /review-ui → UI_REVIEW → CODE_REVIEW
  → /review-code → QA_REVIEW
  → /qa → INTEGRATION_TESTING
  → /integration-test → DOCS_UPDATE
  → /update-docs → PR_READY
  → /commit-and-pr → PR_CREATED → DONE

Integration Failure Flow:
  /integration-test fails → INTEGRATION_FAILED
  → /investigate-failure → analyzes root cause
  → TESTS_REVISION_NEEDED (tests assumed wrong behavior)
     OR IMPLEMENTING (implementation has bugs)

Epic Completion Flow:
All tasks DONE → /epic-review {epic} --create
  → Follow-up tasks created
  → Follow-up tasks processed
  → [If continuous] /roadmap plan-next
```

**Note on `/replan-task`:** This is an optional quality step that's not part of the automated workflow. Use it when:
- Task contains TypeScript, SQL, or implementation code in description
- Task has 15+ acceptance criteria (too large)
- Task prescribes specific libraries, patterns, or approaches
- Task mixes multiple domains (schema + API + UI)
- Acceptance criteria describe code structure instead of behavior

Run it before `/analyze` to give the analyst a clean, outcome-focused task to work from.

## Usage Examples

### Manual Task Workflow

```bash
# Start with a task in DRAFT state
claude -p "/analyze E01-T003"

# (Optional) If task is poorly written, refactor it first:
claude -p "/replan-task E01-T003"

# After spec is written
claude -p "/review-ux E01-T003"

# After UX approval
claude -p "/review-plan E01-T003"

# Continue through workflow...
```

### Automatic Workflow

```bash
# Run single task through entire workflow
pnpm workflow:run E01-T003

# Run all ready tasks
pnpm workflow:run --auto

# Run all tasks + epic review + next epic
pnpm workflow:run --continuous
```

### Epic Review

```bash
# Review epic manually (report only)
claude -p "/epic-review E01"

# Review and create follow-up tasks
claude -p "/epic-review E01 --create"

# Create tasks for medium+ severity issues
claude -p "/epic-review E01 --create --threshold medium"
```

### Planning

```bash
# View roadmap
claude -p "/roadmap"

# Plan next epic from roadmap
claude -p "/roadmap plan-next"

# Create custom epic/tasks
claude -p "/plan 'Build real-time chat feature'"

# Refactor a poorly-written task (optional quality step)
claude -p "/replan-task E05-T006"
```

### Design System Alignment

```bash
# Review existing design documentation
claude -p "/align-design --review-only"

# Create missing design guides for UI domain
claude -p "/align-design --domain ui --create"

# Full alignment check and creation
claude -p "/align-design"

# Focus on specific domain
claude -p "/align-design --domain auth"
```

### Documentation Tasks

```bash
# Run KB documentation workflow (write + review)
claude -p "/document E06-T010"

# Writer phase:
# - Researches code and specs
# - Writes KB documentation pages
# - Updates task to DOC_REVIEW

# Reviewer phase:
# - Verifies accuracy and completeness
# - Checks pattern adherence
# - Either approves or requests changes

# If changes requested, automatically loops back to writer
```

### Agent Training & Improvement

```bash
# Audit a single QA report for quality
claude -p "/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md"

# Deep dive when developer wrote incorrect code
claude -p "/postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md"

# Analyze QA patterns across Epic E01
claude -p "/refine-agent qa --epic E01"

# Analyze all reviewer outputs ever
claude -p "/refine-agent reviewer --all"

# Analyze analyst outputs since January 2026
claude -p "/refine-agent analyst --since 2026-01-01"

# Apply all improvements from a plan
claude -p "/apply-improvements backlog/docs/training/qa-improvements-20260115.md"

# Apply only specific improvements (items 1 and 2)
claude -p "/apply-improvements backlog/docs/training/qa-improvements-20260115.md --items 1,2"
```

## Agent Context

Each command runs in a specific agent context with:

- **Agent-specific instructions**: From `.claude/agents/{agent}.md`
- **Full conversation history**: If running manually
- **Fresh context option**: For review agents (no prior context bias)
- **Specialized tools**: Read, Write, Glob, Grep, Bash (varies by agent)

## Adding New Commands

To add a new command:

1. Create `.claude/commands/{command-name}.md`
2. Include frontmatter with `description` and `allowed-tools`
3. Document the command's purpose and process
4. Add to `COMMAND_AGENTS` in `orchestrator.ts` if needed
5. Update this README

Example:

```markdown
---
description: Brief command description
allowed-tools:
  - Read
  - Write
  - Glob
---

# Command Name

[Command documentation...]
```

## Command Files

All commands are defined in this directory:

```
.claude/commands/
├── README.md              # This file
├── plan.md               # Break down goals into tasks
├── replan-task.md        # Refactor poorly-written tasks
├── analyze.md            # Write implementation specs
├── review-ux.md          # UX review of specs
├── review-plan.md        # Architecture review
├── write-tests.md        # TDD test writing
├── implement.md          # Code implementation
├── review-ui.md          # UI/design review
├── align-design.md       # Design guide alignment
├── review-code.md        # Code review
├── qa.md                 # QA validation (unit tests, build)
├── integration-test.md   # Integration tests against Docker
├── investigate-failure.md # Analyze integration failures
├── update-docs.md        # Documentation updates
├── document.md           # KB documentation workflow
├── commit-and-pr.md      # Commit and create PR
├── roadmap.md            # Roadmap management
├── epic-review.md        # Epic review
├── next-task.md          # Find next ready task
├── task-status.md        # Task board and status
├── audit.md              # Audit agent output quality (NEW)
├── postmortem.md         # Post-mortem failure analysis (NEW)
├── refine-agent.md       # Pattern analysis & improvement planning (NEW)
└── apply-improvements.md # Apply improvements to agent files (NEW)
```

## Related Documentation

- [EPIC_REVIEW.md](../../docs/EPIC_REVIEW.md) - Detailed epic review process
- [../../scripts/orchestrator.ts](../../scripts/orchestrator.ts) - Workflow automation
- [../.claude/agents/](../.claude/agents/) - Agent definitions
- [CLAUDE.md](../../CLAUDE.md) - Project instructions
