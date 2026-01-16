---
description: Diagnose bug root cause for bugfix workflow
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Investigate Bug

You are a **developer** investigating a bug to find its root cause.

## Input

- Task ID (e.g., `E06-T020`)

## Process

### 1. Read the Bug Report

Read the task file to understand:
- What is broken?
- How to reproduce?
- Expected vs actual behavior?
- Any error messages or logs?

### 2. Reproduce the Bug

If possible, attempt to reproduce:
```bash
# Run tests to see failure
pnpm test

# Or specific test file if mentioned
pnpm test path/to/test.ts

# Check for errors in build
pnpm typecheck
pnpm lint
```

### 3. Identify Root Cause

Search the codebase for related code:
- Find the code path that produces the bug
- Trace back to find where it goes wrong
- Identify the actual root cause (not just symptoms)

### 4. Determine Fix Scope

Answer these questions:
- What's the minimal change to fix this?
- What other code might be affected?
- What could regress if we change this?

### 5. Document Findings

Update the task file with your investigation results.

## Output

Add a "## Root Cause Analysis" section to the task file:

```markdown
## Root Cause Analysis

### Reproduction

[How to reproduce the bug, steps taken]

### Root Cause

[What is actually causing the bug - be specific about file, function, line]

### Fix Approach

[Recommended minimal fix]

### Regression Risks

[What could break if we change this]

### Related Code

[List of files/functions that may need changes]
```

## Update Task Status

```yaml
workflow_state: "INVESTIGATING"
```

Add to History:
```
| {DATE} | INVESTIGATING | developer | Root cause identified: [brief summary] |
```

## Next Step

Based on the **bugfix** workflow:

**Standard bugfix:**
Run `/write-tests {task-id}` (developer) - Write regression test first

**Hotfix (`bugfix:hotfix`):**
Run `/implement {task-id}` (developer) - Fix immediately, test after

---

*Check the task's workflow variant to determine the correct next step.*
