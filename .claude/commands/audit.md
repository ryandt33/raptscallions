---
description: Analyze a specific agent output for quality and completeness (standard review)
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
---

# /audit - Agent Output Quality Review

Analyze a specific agent output for quality and completeness. Use this for standard quality checks. For deeper analysis when an agent goes significantly off-base, use `/postmortem` instead.

## Usage

```bash
/audit <agent-type> <artifact-path>
```

### Arguments

- **`agent-type`** (required) - The type of agent to audit (e.g., `qa`, `reviewer`, `analyst`, `developer`, `designer`)
- **`artifact-path`** (required) - Path to the agent output to review

### Examples

```bash
# Audit a QA report
/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md

# Audit a code review
/audit reviewer backlog/docs/reviews/E01/E01-T009-code-review.md

# Audit an implementation spec
/audit analyst backlog/docs/specs/E01/E01-T009-spec.md

# Audit a UI review
/audit designer backlog/docs/reviews/E01/E01-T009-ui-review.md
```

## What This Command Does

1. Reads the specified agent output (review, report, spec, etc.)
2. Reads the corresponding agent definition file (`.claude/agents/{agent-type}.md`)
3. Evaluates the output against quality criteria:
   - **Completeness** - Are all expected sections present?
   - **Clarity** - Is the output clear and actionable?
   - **Adherence** - Did the agent follow its instructions?
   - **Effectiveness** - Does the output serve its intended purpose?
4. Generates a balanced feedback report with:
   - Strengths (what worked well)
   - Gaps (what was missing or incomplete)
   - Inefficiencies (what could be streamlined)
   - Specific, actionable recommendations
5. Writes the audit report to `backlog/docs/training/{agent-type}-audit-{timestamp}.md`

## When to Use `/audit`

✅ **Use `/audit` for:**
- Standard quality checks on agent outputs
- Verifying agent followed its instructions
- Identifying areas for improvement in a balanced way
- Building a catalog of agent performance over time

❌ **Don't use `/audit` for:**
- Deep failure analysis (use `/postmortem` instead)
- Pattern detection across multiple outputs (use `/refine-agent` instead)
- Applying improvements to agent files (use `/apply-improvements` instead)

## Process

Load the trainer agent: @trainer

The trainer agent will:

1. **Parse arguments** to extract agent-type and artifact-path
2. **Validate inputs:**
   - Check that agent-type is valid (qa, reviewer, analyst, developer, designer, etc.)
   - Check that artifact-path exists
3. **Read the artifact** using the Read tool
4. **Read the agent definition** from `.claude/agents/{agent-type}.md`
5. **Evaluate against quality criteria:**
   - Completeness: All expected sections present?
   - Clarity: Clear, actionable language?
   - Adherence: Follows agent's instructions?
   - Effectiveness: Serves intended purpose?
6. **Generate balanced feedback:**
   - Strengths: What worked well (be specific)
   - Gaps: What was missing or incomplete
   - Inefficiencies: What could be streamlined
   - Recommendations: Actionable improvements with impact/effort ratings
7. **Write audit report** to `backlog/docs/training/{agent-type}-audit-{timestamp}.md`
8. **Display summary** to user with path to full report

## Output Format

The audit report will be saved as a markdown file with this structure:

```markdown
# {Agent Type} Audit - {Task ID}

**Artifact:** {path}
**Date:** {timestamp}
**Overall Assessment:** [STRONG / ADEQUATE / NEEDS IMPROVEMENT]

## Strengths
- [Specific things that worked well]
- [...]

## Gaps
- [Specific things that were missing or incomplete]
- [...]

## Inefficiencies
- [Specific things that could be streamlined]
- [...]

## Recommendations
1. [Specific, actionable improvement]
   - **Impact:** [High/Medium/Low]
   - **Effort:** [Low/Medium/High]
2. [...]

## Next Steps
- For high-impact recommendations, consider running `/refine-agent {agent-type}` to analyze patterns
- For immediate fixes, manually update `.claude/agents/{agent-type}.md`
```

## Example Output

After running `/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md`, you might see:

```
Audit complete! Report saved to:
backlog/docs/training/qa-audit-20260115-143022.md

Overall Assessment: ADEQUATE

Key Findings:
✓ All acceptance criteria tested
✓ Clear pass/fail results
⚠ Missing edge case testing
⚠ No security considerations
⚠ Inconsistent formatting

2 high-impact recommendations identified.
Consider running `/refine-agent qa` to analyze patterns across multiple QA reports.
```

## Error Handling

### Missing Required Argument
```
Error: Missing required argument.

Usage: /audit <agent-type> <artifact-path>

Example: /audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md
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

### File Not Found
```
Error: File not found: backlog/docs/reviews/E01/E01-T009-qa-report.md

Verify:
- Path is correct
- File exists in repository
- You have read permissions
```

## Next Steps After Audit

1. **Review the audit report** - Check the findings and recommendations
2. **For high-impact issues** - Consider running `/refine-agent {agent-type}` to see if it's a pattern
3. **For immediate fixes** - Manually update `.claude/agents/{agent-type}.md`
4. **For systematic improvements** - Use `/refine-agent` to create an improvement plan

## Notes

- Audit reports are stored in `backlog/docs/training/` directory
- Each report is timestamped for version tracking
- Reports are markdown files for easy reading and version control
- The trainer agent uses a balanced, constructive tone
- Focus is on specific, actionable feedback (not vague observations)

---

**Related Commands:**
- `/postmortem` - Deep failure analysis when agent goes off-base
- `/refine-agent` - Analyze patterns across multiple outputs
- `/apply-improvements` - Apply approved changes to agent files
