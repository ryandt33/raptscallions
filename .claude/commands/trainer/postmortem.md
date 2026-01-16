---
description: Technical post-mortem analysis when an agent goes off-base or produces incorrect output
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
---

# /postmortem - Agent Failure Analysis

Deep dive technical analysis when an agent significantly deviates from expectations, produces incorrect output, or completely misunderstands the task. This command performs root cause analysis and proposes specific fixes.

## Usage

```bash
/postmortem <agent-type> <artifact-path> [--context <additional-context-path>]
```

### Arguments

- **`agent-type`** (required) - The type of agent to analyze (e.g., `developer`, `qa`, `analyst`)
- **`artifact-path`** (required) - Path to the problematic output
- **`--context <path>`** (optional) - Path to additional context (task file, requirements, etc.)

### Examples

```bash
# Post-mortem on incorrect code implementation
/postmortem developer packages/db/src/schema.ts

# Post-mortem with task context
/postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md

# Post-mortem on QA report that missed critical issues
/postmortem qa backlog/docs/reviews/E01/E01-T009-qa-report.md --context backlog/tasks/E01/E01-T009.md

# Post-mortem on spec that misunderstood requirements
/postmortem analyst backlog/docs/specs/E01/E01-T010-spec.md --context backlog/tasks/E01/E01-T010.md
```

## What This Command Does

1. Reads the problematic agent output
2. Reads the corresponding agent definition file
3. Optionally reads additional context (task files, requirements, etc.)
4. Performs deep root cause analysis:
   - What exactly went wrong (technical specifics)
   - What the agent did (step-by-step trace)
   - What the agent should have done (correct approach)
   - Why it failed (root cause)
5. Traces the failure back to agent instructions:
   - Which instruction was misinterpreted?
   - Which instruction was missing?
   - What example would have prevented this?
6. Proposes specific, targeted fixes to prevent recurrence
7. Writes a comprehensive post-mortem report to `backlog/docs/training/{agent-type}-postmortem-{timestamp}.md`

## When to Use `/postmortem`

✅ **Use `/postmortem` when:**
- Agent produced technically incorrect output (wrong APIs, wrong patterns)
- Agent completely misunderstood the task
- Agent skipped critical steps in its process
- Agent made invalid assumptions
- Agent's output required significant rework
- You need to understand WHY something went wrong (not just WHAT)

❌ **Don't use `/postmortem` for:**
- Standard quality checks (use `/audit` instead)
- Minor formatting issues or style inconsistencies
- Outputs that are correct but could be improved
- Pattern detection across multiple outputs (use `/refine-agent` instead)

## Difference from `/audit`

| Aspect       | `/audit` (Quality Review)        | `/postmortem` (Failure Analysis)     |
| ------------ | -------------------------------- | ------------------------------------ |
| **When**     | Normal quality check             | Agent went significantly off-base    |
| **Focus**    | Completeness, clarity            | Root cause, technical correctness    |
| **Depth**    | Surface-level review             | Deep dive into what went wrong       |
| **Output**   | Strengths/Gaps/Recommendations   | Root cause → Instruction gaps → Fixes |
| **Tone**     | Balanced (strengths + gaps)      | Problem-focused (what failed + why)  |
| **Context**  | Not required                     | Often helpful (`--context` flag)     |

## Process

Load the trainer agent: @trainer

The trainer agent will:

1. **Parse arguments** to extract agent-type, artifact-path, and optional context path
2. **Validate inputs:**
   - Check that agent-type is valid
   - Check that artifact-path exists
   - If --context provided, check that context path exists
3. **Read the problematic artifact** using the Read tool
4. **Read the agent definition** from `.claude/agents/{agent-type}.md`
5. **Read additional context** (if provided)
6. **Perform root cause analysis:**
   - What went wrong: Specific technical failures
   - What the agent did: Step-by-step breakdown
   - What the agent should have done: Correct approach
   - Why it went wrong: Root cause
7. **Trace failure to agent instructions:**
   - Which specific instruction was misinterpreted?
   - Which instruction was missing?
   - Which example would have prevented this?
8. **Propose specific fixes:**
   - Exact text to add/modify in agent definition
   - Which section to update
   - Why this prevents the issue
9. **Write post-mortem report** to `backlog/docs/training/{agent-type}-postmortem-{timestamp}.md`
10. **Display summary** to user with severity and key findings

## Output Format

The post-mortem report will be saved as a markdown file with this structure:

```markdown
# Post-Mortem: {Agent Type} - {Task ID}

**Artifact:** {path}
**Date:** {timestamp}
**Severity:** [CRITICAL / MAJOR / MODERATE]

## Executive Summary
[1-2 sentence summary of what went wrong and why]

## What Went Wrong

### Expected Behavior
[What the agent should have produced]

### Actual Behavior
[What the agent actually produced]

### Impact
[What this failure caused: rework needed, incorrect implementation, wasted time]

## Root Cause Analysis

### Agent Actions (Step-by-Step)
1. [What the agent did first]
2. [What the agent did next]
3. [Where the agent deviated from expected behavior]
4. [...]

### Why It Failed

**Primary Root Cause:**
[Main reason for failure]

**Contributing Factors:**
- [Factor 1]
- [Factor 2]

### Instruction Gaps

**Missing Guidance:**
[Which instructions were absent from agent definition]

**Ambiguous Instructions:**
[Which instructions could be misinterpreted]

**Missing Examples:**
[What examples would have clarified correct behavior]

## Technical Analysis

### Code/Output Review
[Specific technical issues in the output]

**Example Issue 1:**
```
[Code/text the agent produced]
```
**Should have been:**
```
[Correct code/text]
```
**Why this matters:** [Explanation]

### Pattern Analysis
[Is this a one-off mistake or a pattern?]

## Proposed Fixes

### High Priority (Prevent Recurrence)
1. **{Fix title}**
   - **Agent Definition Section:** {where to add/modify}
   - **Current State:** {what it says now or "missing"}
   - **Proposed Change:**
     ```
     [Exact text to add/modify in agent definition]
     ```
   - **Rationale:** {why this prevents the issue}

### Medium Priority (Improve Clarity)
[...]

### Examples to Add
1. **{Example title}**
   - **Location:** {where in agent definition}
   - **Content:**
     ```
     [Example showing correct approach]
     ```

## Validation

### How to Test Fix
[Steps to verify the proposed fixes work]

### Success Criteria
- [ ] Agent correctly handles similar scenarios
- [ ] Agent no longer makes the same mistake
- [ ] Agent's output aligns with expectations

## Next Steps
1. Review proposed fixes
2. Run `/apply-improvements` to implement fixes
3. Test agent on similar task
4. Monitor future outputs for improvement

## Related Issues
[Links to similar failures or patterns]
```

## Example Output

After running `/postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md`, you might see:

```
Post-mortem complete! Report saved to:
backlog/docs/training/developer-postmortem-20260115-144055.md

Severity: MAJOR

Executive Summary:
Developer agent used Prisma ORM syntax instead of Drizzle ORM when creating foreign key relationships in the schema, causing build errors. Root cause: agent definition lacks Drizzle-specific examples.

Key Findings:
- Agent misinterpreted "add foreign key" as Prisma syntax
- Developer agent definition has no Drizzle ORM examples
- 3 high-priority fixes proposed

Proposed fixes will add:
1. Drizzle foreign key relationship examples
2. Explicit "NOT Prisma" constraint
3. Database schema pattern guide

Run `/apply-improvements` to implement these fixes.
```

## Error Handling

### Missing Required Argument
```
Error: Missing required argument.

Usage: /postmortem <agent-type> <artifact-path> [--context <path>]

Example: /postmortem developer packages/db/src/schema.ts --context backlog/tasks/E01/E01-T010.md
```

### Invalid Agent Type
```
Error: Unknown agent type: "dev"

Valid agent types:
- developer
- qa
- reviewer
- analyst
- designer
- architect
- writer
- pm
```

### File Not Found
```
Error: File not found: packages/db/src/schema.ts

Verify:
- Path is correct
- File exists in repository
- You have read permissions
```

### Context File Not Found
```
Error: Context file not found: backlog/tasks/E01/E01-T010.md

Verify:
- Path after --context is correct
- File exists in repository
```

## When to Provide `--context`

The `--context` flag is optional but highly recommended when:

✅ **Provide context when:**
- The task file contains requirements that the agent should have followed
- There's a spec or design document that defines expected behavior
- The original request provides important constraints or examples
- You want to compare "what was asked" vs "what was delivered"

❌ **Skip context when:**
- The failure is obvious from the output alone
- No task file or requirements document exists
- The agent definition itself is clearly insufficient (no need for external context)

## Next Steps After Post-Mortem

1. **Review the post-mortem report** - Understand the root cause and proposed fixes
2. **Validate the proposed fixes** - Ensure they make sense and address the issue
3. **Implement fixes** - Use `/apply-improvements` if a follow-up improvement plan was created
4. **Test the agent** - Run the agent on a similar task to verify the fix works
5. **Monitor future outputs** - Watch for recurrence of the same issue

## Notes

- Post-mortem reports are stored in `backlog/docs/training/` directory
- Each report is timestamped for version tracking
- Reports are markdown files for easy reading and version control
- The trainer agent uses a problem-focused but constructive tone
- Focus is on understanding WHY things failed, not blaming the agent
- Proposed fixes are specific and actionable (exact text to add/modify)

---

**Related Commands:**
- `/audit` - Standard quality review (use for non-failure cases)
- `/refine-agent` - Analyze patterns across multiple outputs
- `/apply-improvements` - Apply approved changes to agent files
