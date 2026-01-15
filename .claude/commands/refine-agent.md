---
description: Analyze patterns across agent outputs and create improvement plan with optional task creation
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
---

# /refine-agent - Pattern Analysis & Improvement Planning

Analyze patterns across multiple agent outputs and create a systematic improvement plan. Optionally creates backlog tasks for high-priority improvements.

## Usage

```bash
/refine-agent <agent-type> [--all] [--since DATE] [--epic EPIC-ID]
```

### Arguments

- **`agent-type`** (required) - The type of agent to analyze (e.g., `qa`, `reviewer`, `developer`)
- **`--all`** (optional) - Analyze all outputs (no time limit)
- **`--since DATE`** (optional) - Analyze outputs after specific date (format: YYYY-MM-DD)
- **`--epic EPIC-ID`** (optional) - Analyze outputs for specific epic only (e.g., E01)

**Default scope:** Last 30 days if no flags provided.

### Examples

```bash
# Analyze QA agent (default: last 30 days)
/refine-agent qa

# Analyze all QA reports ever created
/refine-agent qa --all

# Analyze reviewer outputs since January 1, 2026
/refine-agent reviewer --since 2026-01-01

# Analyze analyst outputs for Epic E01 only
/refine-agent analyst --epic E01

# Analyze developer outputs for Epic E01 since December 2025
/refine-agent developer --epic E01 --since 2025-12-01
```

## What This Command Does

1. Finds agent outputs based on scope flags (default: last 30 days)
2. Reads and analyzes each artifact for recurring patterns:
   - Recurring gaps (same sections missing repeatedly)
   - Common errors (same mistakes across outputs)
   - Inconsistencies (different formats or approaches)
3. Reads the current agent definition (`.claude/agents/{agent-type}.md`)
4. Identifies root causes:
   - Unclear instructions in agent definition
   - Missing examples or templates
   - Ambiguous process steps
   - Missing checklists or guidelines
5. Proposes specific improvements prioritized by impact (High/Medium/Low)
6. For high-priority improvements:
   - Asks: "Create backlog tasks for {count} high-priority improvements? [yes/no]"
   - If yes, creates tasks at `backlog/tasks/E06/E06-TXXX.md`
7. Writes improvement plan to `backlog/docs/training/{agent-type}-improvements-{timestamp}.md`

## When to Use `/refine-agent`

✅ **Use `/refine-agent` when:**
- You notice the same issues appearing in multiple agent outputs
- You want to systematically improve an agent
- You've completed several `/audit` or `/postmortem` reports and see patterns
- You want to create a roadmap for agent improvements
- An epic is complete and you want to learn from it

❌ **Don't use `/refine-agent` for:**
- Single-output quality checks (use `/audit` instead)
- Deep failure analysis on one output (use `/postmortem` instead)
- Applying improvements (use `/apply-improvements` instead)

## Process

Load the trainer agent: @trainer

The trainer agent will:

1. **Parse arguments** to extract agent-type and scope flags
2. **Determine scope:**
   - If `--all`: Search all of `backlog/docs/reviews/`
   - If `--since DATE`: Filter outputs after date (check file timestamps)
   - If `--epic EPIC-ID`: Filter outputs in `backlog/docs/reviews/{EPIC-ID}/`
   - Default: Last 30 days
3. **Find agent outputs** using Glob:
   - Pattern: `backlog/docs/reviews/**/*-{agent-type}-*.md` or similar
   - Filter by epic/date as needed
4. **Read and analyze each artifact:**
   - Look for recurring gaps (missing sections)
   - Identify common errors (misinterpretations)
   - Note inconsistencies (format variations)
5. **Calculate frequencies:**
   - How many outputs have issue X? (e.g., "5/8 reports missing edge cases")
6. **Read current agent definition** from `.claude/agents/{agent-type}.md`
7. **Identify root causes:**
   - Why is this happening?
   - What's unclear in the agent definition?
   - What examples are missing?
8. **Propose specific improvements:**
   - Exact changes to agent definition
   - New examples or templates to add
   - Process refinements
9. **Prioritize improvements:**
   - High: Frequent (50%+), high impact, safety/security
   - Medium: Moderate frequency (20-50%), consistency improvements
   - Low: Rare (<20%), minor refinements
10. **Ask about task creation:**
    - Count high-priority improvements
    - Ask: "Create backlog tasks for {count} high-priority improvements? [yes/no]"
    - If yes, use Glob to find next available E06-TXXX ID
    - Create task files with proper frontmatter and structure
11. **Write improvement plan** to `backlog/docs/training/{agent-type}-improvements-{timestamp}.md`
12. **Display summary** with key findings and next steps

## Output Format

The improvement plan will be saved as a markdown file with this structure:

```markdown
# {Agent Type} Improvement Plan

**Analysis Date:** {timestamp}
**Scope:** {scope description}
**Outputs Analyzed:** {count}

## Pattern Analysis

### High-Frequency Issues
1. **{Issue name}** ({X}/{total} outputs, {percentage}%)
   - Description: {what's happening}
   - Examples: {specific task IDs where this occurred}
   - Impact: {how it affects quality}

2. [...]

### Root Causes
1. **{Root cause}**
   - Current state: {what the agent definition says now}
   - Gap: {what's missing or unclear}

## Proposed Improvements

### High Priority
1. **{Improvement title}**
   - **Current:** {current agent instruction/section}
   - **Proposed:** {new/updated instruction}
   - **Rationale:** {why this helps}
   - **Expected Impact:** {what will improve}
   - **Effort:** {low/medium/high}

### Medium Priority
[...]

### Low Priority (Optional)
[...]

## Implementation Guide
Use `/apply-improvements backlog/docs/training/{agent-type}-improvements-{timestamp}.md` to implement these changes.

## Tasks Created
- [E06-T015] Improve QA agent edge case testing (High priority)
- [E06-T016] Add security checklist to QA agent (High priority)
```

## Task Creation Format

For each high-priority improvement, a task file is created:

```markdown
---
title: Improve {agent-type} agent - {improvement area}
status: To Do
priority: medium
labels:
  - agent-improvement
  - {agent-type}
  - training
dependencies: []
assignee: []
---

# {Task Title}

**Generated by:** Senior Trainer agent
**Source Plan:** backlog/docs/training/{agent-type}-improvements-{timestamp}.md

## Description

{Improvement description from plan}

## Acceptance Criteria

- [ ] Agent definition updated with proposed changes
- [ ] Changes tested by running agent on sample inputs
- [ ] Agent outputs show improvement in identified areas

## Implementation Notes

**Current State:**
{current agent instruction}

**Proposed Change:**
{proposed instruction}

**Rationale:**
{why this helps}

## Related Analysis

See improvement plan for full context: backlog/docs/training/{agent-type}-improvements-{timestamp}.md
```

## Example Output

After running `/refine-agent qa --epic E01`, you might see:

```
Analyzing QA agent outputs for Epic E01...

Found 8 QA reports in backlog/docs/reviews/E01/

Pattern analysis complete! Improvement plan saved to:
backlog/docs/training/qa-improvements-20260115-150033.md

Key Patterns Identified:
📊 High-frequency issues (50%+ of outputs):
  • Missing edge case testing (6/8 reports, 75%)
  • No security considerations (5/8 reports, 63%)

🔍 Root causes:
  • QA agent prompt doesn't explicitly require edge case testing
  • Security checklist is optional, not mandatory

💡 Proposed improvements:
  • High priority: 2
  • Medium priority: 1
  • Low priority: 2

Create backlog tasks for 2 high-priority improvements? [yes/no]
> yes

Created tasks:
  ✓ E06-T015: Improve QA agent edge case testing
  ✓ E06-T016: Add security checklist to QA agent

Next steps:
1. Review improvement plan: backlog/docs/training/qa-improvements-20260115-150033.md
2. Implement changes: /apply-improvements backlog/docs/training/qa-improvements-20260115-150033.md
3. Test improved agent on sample QA tasks
```

## Error Handling

### Missing Required Argument
```
Error: Missing required argument.

Usage: /refine-agent <agent-type> [--all] [--since DATE] [--epic EPIC-ID]

Example: /refine-agent qa --epic E01
```

### Invalid Agent Type
```
Error: Unknown agent type: "qaa"

Valid agent types:
- qa
- reviewer
- analyst
- developer
- designer
- architect
- writer
- pm
```

### Invalid Date Format
```
Error: Invalid date format: "01-15-2026"

Expected format: YYYY-MM-DD
Example: --since 2026-01-15
```

### Invalid Epic ID
```
Error: Invalid epic ID: "E1"

Expected format: E## (e.g., E01, E02, E10)
```

### No Outputs Found
```
No outputs found for qa with scope: Epic E01

Suggestions:
- Check agent-type spelling (available: qa, reviewer, analyst, developer, designer)
- Try broader scope (--all instead of --epic)
- Verify outputs exist in backlog/docs/reviews/
- Check that epic ID is correct (E01, E02, etc.)
```

## Scope Examples

### Last 30 Days (Default)
```bash
/refine-agent qa
```
Analyzes all QA reports modified in the last 30 days.

### All Time
```bash
/refine-agent qa --all
```
Analyzes every QA report in the repository.

### Since Specific Date
```bash
/refine-agent reviewer --since 2026-01-01
```
Analyzes reviewer outputs created/modified on or after January 1, 2026.

### Specific Epic
```bash
/refine-agent analyst --epic E01
```
Analyzes only analyst outputs in `backlog/docs/reviews/E01/`.

### Combined Flags
```bash
/refine-agent developer --epic E01 --since 2025-12-15
```
Analyzes developer outputs in Epic E01 that were created/modified on or after December 15, 2025.

## Next Steps After Refinement

1. **Review the improvement plan** - Read the full analysis and proposed improvements
2. **Validate the patterns** - Ensure the identified issues are real and frequent
3. **Prioritize implementation** - Decide which improvements to tackle first
4. **Implement improvements:**
   - For automated application: `/apply-improvements backlog/docs/training/{agent-type}-improvements-{timestamp}.md`
   - For manual edits: Edit `.claude/agents/{agent-type}.md` directly
5. **Test the improved agent** - Run on sample tasks to verify improvements
6. **Monitor future outputs** - Watch for reduction in identified issues

## Tips for Effective Refinement

✅ **Best Practices:**
- Run after completing an epic (--epic flag) to learn from that epic
- Use `--all` for comprehensive system-wide analysis
- Use `--since` to focus on recent patterns (after last refinement)
- Review improvement plans before applying changes
- Test improved agents on sample inputs before deploying

❌ **Avoid:**
- Running on too few outputs (<3) - patterns won't be meaningful
- Ignoring low-frequency issues - they might still be important
- Applying all improvements at once - test incrementally
- Skipping the improvement plan review - always validate first

## Notes

- Improvement plans are stored in `backlog/docs/training/` directory
- Each plan is timestamped for version tracking
- Plans are markdown files for easy reading and version control
- The trainer agent looks for statistical patterns (frequencies, percentages)
- High-priority improvements can auto-generate backlog tasks
- Tasks are created in Epic E06 (Agent Improvements)
- Next available task ID is found automatically using Glob

---

**Related Commands:**
- `/audit` - Review a single agent output for quality
- `/postmortem` - Deep failure analysis when agent goes off-base
- `/apply-improvements` - Apply approved changes to agent files
