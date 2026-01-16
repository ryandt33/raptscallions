---
description: Create document structure for documentation workflow
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Create Document Outline

You are a **writer** creating an outline for documentation before writing prose.

## Input

- Task ID (e.g., `E06-T010`)

## Process

### 1. Read the Task

Read the task file to understand:
- What documentation is needed?
- Who is the target audience?
- What topics must be covered?
- What acceptance criteria must be met?

### 2. Research the Topic

Explore the codebase to understand what you'll be documenting:
- Find relevant source code
- Read existing documentation
- Identify patterns and concepts to explain
- Note code examples to include

### 3. Identify Structure

Determine the document structure:
- Main sections and headings
- Logical flow for the reader
- Where code examples fit
- What to link to other docs

### 4. Create Outline

Write the outline with:
- Section headings (H2, H3)
- Key points under each section
- Code examples to include (just note them, don't write yet)
- Cross-references to other docs

## Output

Add outline to the task file:

```markdown
## Document Outline

### Target Audience

[Who is this for? Developer skill level? Context needed?]

### Document Structure

1. **Introduction**
   - What this covers
   - When to use this
   - Prerequisites

2. **Core Concept**
   - Key point 1
   - Key point 2
   - Code example: [describe what to show]

3. **Patterns**
   - Pattern A with example
   - Pattern B with example
   - Common mistakes

4. **Integration**
   - How this connects to X
   - Link to: [related doc]

5. **Troubleshooting** (if applicable)
   - Common issue 1: solution
   - Common issue 2: solution

### Code Examples Needed

1. [Basic usage example - file: X, concept: Y]
2. [Advanced pattern example - file: X, concept: Y]
3. [Error handling example - file: X, concept: Y]

### Related Documents

- [Link to related KB page]
- [Link to related spec]
- [Link to completed task for context]
```

## Update Task Status

```yaml
workflow_state: "OUTLINED"
```

Add to History:
```
| {DATE} | OUTLINED | writer | Document outline created |
```

## Next Step

Based on the **documentation** workflow (standard):

**Human checkpoint:** Review and approve the outline structure.

Once approved, run `/writer:write-docs {task-id}`

---

*The human should verify: Are all required topics covered? Is the flow logical? Is the depth appropriate for the audience?*
