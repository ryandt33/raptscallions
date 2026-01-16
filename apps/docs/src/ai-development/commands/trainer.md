---
title: Trainer Commands
description: Commands for agent quality auditing and improvement
source_synced_at: 2026-01-16
---

# Trainer Commands

Commands that invoke the [Trainer Agent](/ai-development/agents/current/trainer) for agent quality improvement.

## Overview

Trainer commands handle meta-level quality: auditing agent outputs, investigating failures, analyzing patterns, and implementing improvements to agent definitions.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/audit` | Review specific agent output for quality | Quality checks |
| `/postmortem` | Deep dive on agent failure | Failure analysis |
| `/refine-agent` | Analyze patterns across outputs | Improvement planning |
| `/apply-improvements` | Implement approved agent changes | Agent updates |
| `/write-improvement` | Write and track technical improvements | KB improvements |

---

## `/audit`

Review a specific agent output for quality.

### Purpose

Standard quality check assessing:
- Clarity (clear role, unambiguous)
- Completeness (all sections, edge cases)
- Adherence (follows instructions, conventions)
- Effectiveness (serves purpose, actionable)

### Invocation

```bash
/audit qa backlog/docs/reviews/E01/E01-T001-qa-report.md
```

### Input

- Agent type (e.g., `qa`, `reviewer`, `developer`)
- Path to artifact

### Process

1. Read the artifact
2. Read agent definition at `.claude/agents/{agent-type}.md`
3. Compare against expectations
4. Generate balanced feedback
5. Write audit report

### Output

Audit report at `backlog/docs/training/{agent-type}-audit-{timestamp}.md`:

```markdown
# {Agent Type} Audit - {Task ID}

**Overall Assessment:** STRONG | ADEQUATE | NEEDS IMPROVEMENT

## Strengths
- [What worked well]

## Gaps
- [What was missing]

## Inefficiencies
- [What could be streamlined]

## Recommendations
1. [Improvement]
   - **Impact:** High/Medium/Low
   - **Effort:** Low/Medium/High
```

### Source Reference

`.claude/commands/trainer/audit.md`

---

## `/postmortem`

Deep dive when an agent significantly deviates from expectations.

### Purpose

Root cause analysis for:
- Technically incorrect output
- Complete task misunderstanding
- Skipped critical steps
- Output requiring significant rework

### Invocation

```bash
/postmortem developer backlog/docs/specs/E01/E01-T001-spec.md
/postmortem developer backlog/docs/specs/E01/E01-T001-spec.md --context path/to/context.md
```

### Input

- Agent type
- Path to problematic artifact
- Optional: `--context` with additional context

### Process

1. Read problematic artifact
2. Read agent definition
3. Perform root cause analysis
4. Trace back to instructions
5. Propose specific fixes
6. Write post-mortem report

### Output

Post-mortem at `backlog/docs/training/{agent-type}-postmortem-{timestamp}.md`:

```markdown
# Post-Mortem: {Agent Type} - {Task ID}

**Severity:** CRITICAL | MAJOR | MODERATE

## What Went Wrong
### Expected Behavior
[What should have happened]

### Actual Behavior
[What actually happened]

## Root Cause Analysis
**Primary Root Cause:** [Main reason]

### Instruction Gaps
**Missing Guidance:** [What was absent]
**Ambiguous Instructions:** [What could be misinterpreted]

## Proposed Fixes
1. **{Fix title}**
   - **Section:** {where to modify}
   - **Proposed Change:** [exact text]
```

### Source Reference

`.claude/commands/trainer/postmortem.md`

---

## `/refine-agent`

Analyze patterns across multiple agent outputs.

### Purpose

Systematic improvement planning:
- Identify recurring gaps
- Find common errors
- Detect inconsistencies
- Propose prioritized improvements

### Invocation

```bash
/refine-agent qa                    # Last 30 days
/refine-agent qa --all              # All outputs
/refine-agent qa --since 2026-01-01 # Since date
/refine-agent qa --epic E01         # Specific epic
```

### Input

- Agent type
- Scope flags (optional)

### Process

1. Find agent outputs based on scope
2. Analyze for patterns
3. Read current agent definition
4. Identify root causes
5. Propose prioritized improvements
6. Optionally create backlog tasks
7. Write improvement plan

### Output

Improvement plan at `backlog/docs/training/{agent-type}-improvements-{timestamp}.md`:

```markdown
# {Agent Type} Improvement Plan

**Outputs Analyzed:** {count}

## Pattern Analysis
### High-Frequency Issues
1. **{Issue}** ({X}/{total} outputs)
   - Description: [what's happening]
   - Impact: [how it affects quality]

## Proposed Improvements

### High Priority
1. **{Improvement}**
   - **Current:** [current instruction]
   - **Proposed:** [new instruction]
   - **Impact:** [what will improve]
```

### Source Reference

`.claude/commands/trainer/refine-agent.md`

---

## `/apply-improvements`

Implement approved improvements to agent files.

### Purpose

Apply changes to agent definitions with:
- Before/after diffs
- Explicit confirmation for each change
- Changelog for rollback

### Invocation

```bash
/apply-improvements backlog/docs/training/qa-improvements-20260115.md
/apply-improvements backlog/docs/training/qa-improvements-20260115.md --items 1,3,5
```

### Input

- Path to improvement plan
- Optional: `--items` to apply specific items

### Safety Requirements

::: warning Confirmation Required
- ⚠️ Always shows diff before applying
- ⚠️ Always requires explicit confirmation
- ⚠️ Never auto-applies without approval
- ⚠️ Creates changelog for rollback
:::

### Output

Changelog at `backlog/docs/training/{agent-type}-changelog-{timestamp}.md`

### Source Reference

`.claude/commands/trainer/apply-improvements.md`

---

## `/write-improvement`

Write and track technical improvements in the KB.

### Purpose

Document proposed improvements to the KB system, tracking status and rationale.

### Invocation

```bash
/write-improvement "Add automated sync checking for KB pages"
```

### Source Reference

`.claude/commands/trainer/write-improvement.md`

---

## Related Commands

- All agent commands — Trainer can audit any agent's output
- [PM Commands](/ai-development/commands/pm) — May create tasks for improvements
