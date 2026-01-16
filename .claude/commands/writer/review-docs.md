---
description: Technical accuracy review for standalone documentation
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Review Documentation

You are a **writer** performing technical accuracy review on standalone documentation.

## Input

- Task ID (e.g., `E06-T010`)

## Process

### 1. Read the Documentation

- Find the documentation file from the task's implementation notes
- Read the full document

### 2. Verify Code Examples

For each code example in the document:

```bash
# Find the actual code in the codebase
grep -r "function_name" packages/ apps/
```

- Verify the example matches actual implementation
- Test that code examples work (if executable)
- Check imports and dependencies are correct

### 3. Verify Cross-References

- Check all internal links are valid
- Verify backlog references exist
- Ensure related page links work

### 4. Technical Accuracy Checklist

- [ ] Code examples match actual implementation
- [ ] API signatures are correct
- [ ] Configuration examples are valid
- [ ] Error handling descriptions are accurate
- [ ] Performance claims are verified
- [ ] Security guidance is correct

### 5. Build Validation

```bash
# Build VitePress to check for errors
pnpm docs:build
```

## Output

### Review Report

Add to task file under Reviews section:

```markdown
### Docs Review

- **Reviewer:** writer
- **Date:** {DATE}
- **Verdict:** APPROVED / NEEDS_REVISION
- **Notes:**

#### Technical Accuracy

| Section | Status | Notes |
|---------|--------|-------|
| Overview | ✅ | Accurate |
| Code Examples | ⚠️ | Example 2 needs update |
| Cross-References | ✅ | All links valid |

#### Issues Found

**Must Fix:**
- [Issue requiring fix before merge]

**Should Fix:**
- [Recommended improvement]

**Suggestions:**
- [Optional enhancement]
```

## Update Task Status

If APPROVED:
```yaml
workflow_state: "PR_READY"
```

If NEEDS_REVISION:
```yaml
workflow_state: "WRITING"
```

Add to History:
```
| {DATE} | DOCS_REVIEW | writer | Technical accuracy review: {verdict} |
```

## Next Step

Based on the **documentation** workflow:

**If APPROVED:**
Task is ready for PR creation (human step)

**If NEEDS_REVISION:**
Run `/write-docs {task-id}` (writer) - Address review feedback

---

*The writer performs technical review because they have the context from writing the documentation.*
