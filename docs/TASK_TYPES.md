# Task Type System

## Overview

Tasks in Raptscallions are classified by the `task_type` field to automatically determine which workflow steps are applicable. This prevents unnecessary UI/UX reviews for backend-only work.

## Task Types

| Type         | Description                          | UX Review | UI Review | Examples                                    |
| ------------ | ------------------------------------ | --------- | --------- | ------------------------------------------- |
| **backend**  | Server-side only, no UI changes      | ❌ Skip   | ❌ Skip   | API endpoint, database schema, service      |
| **frontend** | UI-only, minimal/no backend changes  | ✅ Run    | ✅ Run    | Component styling, UI refactor              |
| **fullstack**| Both UI and backend changes          | ✅ Run    | ✅ Run    | Full CRUD feature with UI and API           |

## Workflow Behavior

### Backend Tasks (task_type: "backend")

**Automatic Skip:**
- When a backend task reaches `ANALYZED` state, it automatically skips `UX_REVIEW` and proceeds directly to `PLAN_REVIEW`
- When a backend task reaches `IMPLEMENTED` state, it automatically skips `UI_REVIEW` and proceeds directly to `CODE_REVIEW`

**Orchestrator logs:**
```
[SKIP] E01-T001: Skipping UX_REVIEW (backend-only task) → PLAN_REVIEW
[SKIP] E01-T001: Skipping UI_REVIEW (backend-only task) → CODE_REVIEW
```

**Designer Agent:**
If the designer agent is manually invoked on a backend task (e.g., via `/review-ux E01-T001`), it will:
1. Read the task frontmatter
2. See `task_type: "backend"`
3. Create a minimal NOT_APPLICABLE review
4. Update workflow state to skip to next stage
5. Exit immediately

### Frontend/Fullstack Tasks

These tasks proceed through all workflow stages normally:
- `ANALYZED` → `UX_REVIEW` → `PLAN_REVIEW` → ...
- `IMPLEMENTED` → `UI_REVIEW` → `CODE_REVIEW` → ...

The designer agent performs full UX/UI reviews for these tasks.

## Setting Task Type (PM Agent)

When creating tasks, the PM agent must set the `task_type` field accurately:

### Backend Task Example

```yaml
---
id: "E01-T001"
title: "Create User Schema"
task_type: "backend"  # ← No UI work
labels:
  - backend
  - database
---
```

### Frontend Task Example

```yaml
---
id: "E01-T002"
title: "User Profile Component"
task_type: "frontend"  # ← UI work only
labels:
  - frontend
---
```

### Fullstack Task Example

```yaml
---
id: "E01-T003"
title: "User CRUD with UI"
task_type: "fullstack"  # ← Both UI and backend
labels:
  - frontend
  - backend
---
```

## Guidelines for PM Agent

### Choose "backend" when:
- No user-facing UI changes
- API endpoints only
- Database schema/migrations
- Services, utilities, middleware
- Infrastructure, DevOps, CI/CD
- Background jobs, queues

### Choose "frontend" when:
- UI components only
- Styling/theming changes
- Client-side logic
- Minor UI refactors
- Component library additions

### Choose "fullstack" when:
- Feature includes both API and UI
- Forms that submit to backend
- Pages that fetch data from API
- Any work that touches both layers

## Benefits

1. **Efficiency** - Backend tasks don't wait for unnecessary UI reviews
2. **Clarity** - Clear indication of what each task involves
3. **Automation** - Orchestrator automatically routes tasks correctly
4. **Time Savings** - Designer agent doesn't spend time on non-UI work

## Migration for Existing Tasks

For existing tasks without `task_type`, the designer agent falls back to checking:
- Labels (presence of `frontend` label)
- Code files (presence of `.tsx` files)

**Recommendation:** Update all tasks to include explicit `task_type` field.

## Example Workflow

### Backend Task Flow

```
DRAFT
  ↓
ANALYZING (analyst writes spec)
  ↓
ANALYZED
  ↓
[SKIP UX_REVIEW] ← Automatic skip
  ↓
PLAN_REVIEW (architect review)
  ↓
APPROVED
  ↓
WRITING_TESTS (developer writes tests)
  ↓
TESTS_READY
  ↓
IMPLEMENTING (developer implements)
  ↓
IMPLEMENTED
  ↓
[SKIP UI_REVIEW] ← Automatic skip
  ↓
CODE_REVIEW (reviewer checks code)
  ↓
QA_REVIEW (qa validates)
  ↓
...
```

### Frontend Task Flow

```
DRAFT
  ↓
ANALYZING (analyst writes spec)
  ↓
ANALYZED
  ↓
UX_REVIEW (designer reviews spec UX)
  ↓
PLAN_REVIEW (architect review)
  ↓
APPROVED
  ↓
WRITING_TESTS (developer writes tests)
  ↓
TESTS_READY
  ↓
IMPLEMENTING (developer implements)
  ↓
IMPLEMENTED
  ↓
UI_REVIEW (designer reviews UI quality)
  ↓
CODE_REVIEW (reviewer checks code)
  ↓
QA_REVIEW (qa validates)
  ↓
...
```

## Technical Implementation

### Files Modified

1. **`.claude/agents/pm.md`**
   - Added `task_type` field to task template
   - Added task type documentation

2. **`.claude/agents/designer.md`**
   - Added task_type check as first step
   - Automatic NOT_APPLICABLE for backend tasks
   - Updated workflow state transitions

3. **`scripts/orchestrator.ts`**
   - Added `task_type` to `TaskFrontmatter` interface
   - Added `shouldSkipUIReview()` function
   - Updated `getNextState()` to skip UI states for backend tasks
   - Updated `runWorkflowStep()` to auto-skip UI review states
   - Added logging for skipped states

### Functions Added

```typescript
function shouldSkipUIReview(task: Task, state: WorkflowState): boolean {
  // Backend-only tasks skip UX_REVIEW and UI_REVIEW
  if (task.task_type === "backend") {
    return state === "UX_REVIEW" || state === "UI_REVIEW";
  }
  return false;
}
```

## Testing

To test the task type system:

1. Create a backend task with `task_type: "backend"`
2. Run workflow: `pnpm workflow:run E01-T001`
3. Verify orchestrator logs show "Skipping UX_REVIEW" and "Skipping UI_REVIEW"
4. Verify task goes directly from ANALYZED → PLAN_REVIEW
5. Verify task goes directly from IMPLEMENTED → CODE_REVIEW

## FAQ

**Q: What if I forget to set task_type?**
A: The designer agent will fall back to checking labels and code files, but it's less efficient. Always set task_type explicitly.

**Q: Can I change task_type mid-workflow?**
A: Yes, but only before the UX_REVIEW or UI_REVIEW states. Changing it mid-workflow may cause confusion.

**Q: What if a backend task later needs UI work?**
A: Create a new frontend/fullstack task for the UI work. Don't change existing task types.

**Q: Do backend tasks still get code review and QA?**
A: Yes! Only UI/UX reviews are skipped. All backend tasks still go through code review and QA.
