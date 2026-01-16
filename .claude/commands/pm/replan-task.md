---
description: Refactor a poorly-written task into outcome-focused format
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---

# Replan Task

Analyze a task that contains too much implementation detail, is too large, or doesn't follow the outcome-focused format, then refactor it into proper format (potentially splitting into subtasks).

## Usage

```bash
/replan-task E05-T006
/replan-task E03-T003 --split  # Force split into subtasks
```

## What This Command Does

This command takes an existing task and:
1. **Identifies problems** with the current task definition
2. **Removes implementation details** (code, schemas, specific approaches)
3. **Splits oversized tasks** into appropriately-scoped subtasks (E##-T###a, E##-T###b, etc.)
4. **Rewrites to outcome-focused format** (WHAT + WHY instead of HOW)
5. **Preserves critical context** without prescribing solutions

---

## Common Task Problems

### Problem 1: Too Much Implementation Code

**Signs:**
- Task contains TypeScript/SQL code in description or acceptance criteria
- Specifies exact schemas, field names, column types
- Includes complete class/function implementations
- Prescribes specific libraries or patterns

**Example:**
```markdown
## Technical Notes
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').notNull()...
  [100 more lines of code]
});
```

**Fix:** Remove all code. Replace with constraints and requirements:
```markdown
## Constraints
- Must link assignments to classes with referential integrity
- Must track creation timestamp and creator
- Performance: Query "assignments for class" must load in <100ms
```

---

### Problem 2: Task Too Large

**Signs:**
- 15+ acceptance criteria
- Multiple distinct responsibilities (schema + API + UI)
- Would touch 10+ files
- Estimated at 4+ hours of work
- Mixes infrastructure with features

**Example:**
```markdown
E05-T006: File service with three-tier limits and quotas
- [ ] AC1: FileLimitsService class...
- [ ] AC7: uploadFile method...
- [ ] AC14: getFile method...
- [ ] AC19: softDeleteFile method...
- [ ] AC23: listFiles method...
- [ ] AC26: getUserQuota method...
[35 acceptance criteria total!]
```

**Fix:** Split into focused subtasks:
- `E05-T006a`: File storage limits resolution service
- `E05-T006b`: File upload with quota tracking
- `E05-T006c`: File download with signed URLs
- `E05-T006d`: File deletion and quota updates
- `E05-T006e`: File listing and quota queries

---

### Problem 3: Implementation-Focused Acceptance Criteria

**Signs:**
- Acceptance criteria specify class names, method signatures
- Criteria describe code structure instead of behavior
- "AC: Implements X pattern" instead of "AC: System does Y"

**Example:**
```markdown
- [ ] AC1: FileLimitsService class with getEffectiveLimits(userId) method
- [ ] AC2: Limit resolution follows priority: user override → group role → system default
```

**Fix:** Focus on observable behavior:
```markdown
- [ ] AC1: System enforces file size limits based on user, role, or system defaults
- [ ] AC2: User-specific limits override role-based and system defaults
- [ ] AC3: Admin can set custom limits for individual users
```

---

### Problem 4: Missing "Why This Matters"

**Signs:**
- No explanation of user value
- No business justification
- Just describes technical changes

**Example:**
```markdown
## Description
Create ai_usage table and UsageService to track tokens, costs, and metadata.
```

**Fix:** Add business context:
```markdown
## Description
Enable tracking of AI usage (tokens, costs) per user and group for billing, quota enforcement, and analytics.

## Why This Matters
Schools need to monitor AI costs to stay within budget. Teachers need visibility into student usage. System admins need usage reports for capacity planning and cost allocation.
```

---

### Problem 5: Vague or Missing Constraints

**Signs:**
- No performance requirements
- No security considerations
- No integration requirements
- No data integrity rules

**Example:**
```markdown
## Acceptance Criteria
- [ ] Users can upload files
- [ ] Files are stored in database
```

**Fix:** Add clear constraints:
```markdown
## Constraints
- Performance: Upload must complete in <30s for 50MB file
- Security: Must validate MIME type server-side (not just client)
- Quota: Must check quota BEFORE upload (fail fast)
- Concurrency: Multiple simultaneous uploads must not corrupt quota
- Data integrity: Upload failure must not leave orphaned storage
```

---

### Problem 6: Missing or Incomplete Workflow Section

**Signs:**
- No Workflow section at all
- Workflow section missing "Phases" list
- `task_type` or `workflow` missing from frontmatter
- Phases list doesn't match the workflow category

**Example:**
```markdown
## Workflow

- **Category:** development
- **Variant:** standard

### First Command

Run `/analyze E01-T003` (analyst)
```

**Problem:** Missing the Phases list. Agents and humans don't know what commands come after `/analyze`.

**Fix:** Add complete workflow section with phases from `.claude/workflows/{category}.md`:
```markdown
## Workflow

**Category:** `development` (standard)

**Rationale:** New API route with React component requiring full TDD workflow.

**Phases:**
1. `/analyze` - Research codebase and write analysis
2. Human approval of approach
3. `/review-plan` - Architect validates approach
4. `/write-tests` - TDD red phase
5. `/implement` - Write code to pass tests
6. `/review-code` - Fresh-eyes code review
7. `/qa` - Validation and integration tests
8. `/update-docs` - Update documentation
9. PR creation
```

---

## Process

1. **Load the pm agent:** `@pm`
2. **Read the task:**
   - Load task at `backlog/tasks/{epic}/{task-id}.md`
   - Read [plan.md](.claude/commands/plan.md) for quality guidelines
3. **Identify problems:**
   - Count acceptance criteria (>10 = likely too large)
   - Check for code in description/AC/notes
   - Check for implementation prescriptions
   - Check for missing "Why This Matters"
   - Check for vague or missing constraints
   - Check for missing/incomplete Workflow section (must have Phases list)
   - Check that `task_type` and `workflow` are in frontmatter
4. **Determine if split needed:**
   - If 15+ AC → definitely split
   - If multiple domains (DB + API + UI) → split
   - If estimated >3 hours → consider splitting
   - Ask user if unsure about split
5. **For splits:**
   - Create subtasks with IDs: `E##-T###a`, `E##-T###b`, etc.
   - Each subtask should be 1-3 hours, 5-10 AC
   - Update original task to reference subtasks
   - Set proper dependencies between subtasks
6. **Rewrite each task:**
   - **Description:** WHAT capability, outcome-focused
   - **Why This Matters:** User value, business justification
   - **Acceptance Criteria:** Observable behaviors, 5-10 items
   - **Constraints:** Performance, security, integration requirements
   - **Workflow:** Category, Rationale, and full Phases list from `.claude/workflows/{category}.md`
   - **Out of Scope:** What this explicitly doesn't include
   - **Context:** Relevant docs, patterns, WITHOUT implementation code
7. **Preserve metadata:**
   - Keep original frontmatter (id, priority, labels, etc.)
   - Keep history entries
   - Keep review sections
8. **Update dependencies:**
   - If split, update `depends_on` and `blocks` in affected tasks
9. **Ask user to review** before finalizing

---

## Rewrite Template

```markdown
---
id: "E05-T006a"  # Original ID with subtask suffix if split
title: "Concise, outcome-focused title"
status: "todo"
priority: "critical"
task_type: "backend"  # backend | frontend | fullstack
workflow: "development"  # development | schema | infrastructure | documentation | bugfix
labels: [backend, service]
epic: "E05"
depends_on: ["E05-T001"]
blocks: ["E05-T006b"]
---

# [Title]

## Description

2-3 sentences describing WHAT capability this adds.
Focus on the outcome, not the implementation approach.

## Why This Matters

1-2 sentences explaining user value or business impact.
Why does this task exist? What can users do after it's done?

## Acceptance Criteria

5-10 observable, testable outcomes (NO implementation details):
- [ ] AC1: System behavior X occurs when Y
- [ ] AC2: Users can perform action Z
- [ ] AC3: Error handling for edge case W
- [ ] AC4: Data persists correctly under condition V
- [ ] AC5: Integration with system U works as expected

## Constraints

Technical/business requirements (NO prescribed solutions):
- Performance: Query completes in <100ms for N records
- Security: Must validate input against XSS
- Concurrency: Handles M simultaneous operations without race conditions
- Data integrity: Maintains referential integrity with entity X

## Workflow

**Category:** `development` (standard)

**Rationale:** [1-2 sentences explaining why this category/variant applies]

**Phases:**
1. `/analyze` - Research codebase and write analysis
2. Human approval of approach
3. `/review-plan` - Architect validates approach
4. `/write-tests` - TDD red phase
5. `/implement` - Write code to pass tests
6. `/review-code` - Fresh-eyes code review
7. `/qa` - Validation and integration tests
8. `/update-docs` - Update documentation
9. PR creation

## Out of Scope

What this task does NOT include:
- Related feature A (covered in E05-T007)
- Future enhancement B (deferred to E06)

## Context

Relevant architecture, patterns, or integration points:
- See ARCHITECTURE.md for entity relationships
- Integrates with auth system from E02-T003
- Follows pattern established in E04-T002

## History

| Date | State | Agent | Notes |
| ---- | ----- | ----- | ----- |
| 2026-01-13 | REPLANNED | pm | Original task too large, split into subtasks |
| 2026-01-13 | DRAFT | pm | Task created for Epic E05 |
```

**CRITICAL: The Workflow section MUST include the Phases list.** Consult `.claude/workflows/{category}.md` for the correct phases for each workflow category (development, schema, infrastructure, documentation, bugfix).

---

## Example Replanning

### Input: E05-T006 (Original - Too Large)

```markdown
---
id: "E05-T006"
title: "File service with three-tier limits and quotas"
---

# E05-T006: File service with three-tier limits and quotas

## Description
Implement FileService with three-tier limit resolution (system defaults →
role-based → user overrides), quota tracking with atomic updates, CASL
permission checks, and file lifecycle management (upload, download, delete).

## Acceptance Criteria
- [ ] AC1: FileLimitsService class with getEffectiveLimits(userId) method
- [ ] AC2: Limit resolution follows priority: user override → group role → system default
[... 33 more acceptance criteria ...]

## Technical Notes
[400 lines of TypeScript implementation code]
```

**Problems identified:**
- 35 acceptance criteria (too many!)
- Contains 400 lines of implementation code
- Mixes multiple responsibilities (limits service + file service + quota tracking)
- Implementation-focused AC ("FileLimitsService class")
- Missing "Why This Matters" section

---

### Output: Split into 5 Subtasks

#### E05-T006a: File storage limits resolution

```markdown
---
id: "E05-T006a"
title: "File storage limits resolution service"
epic: "E05"
depends_on: ["E05-T001"]
blocks: ["E05-T006b"]
---

# File Storage Limits Resolution Service

## Description
Enable the system to determine effective file size and quota limits for any user
by resolving three-tier priority: user-specific overrides, role-based group
limits, and system defaults.

## Why This Matters
Different user roles need different storage limits (teachers get more than
students). Admins need the ability to grant exceptions to individual users.
The system must resolve these priorities consistently.

## Acceptance Criteria
- [ ] AC1: System returns effective limits (max file size, storage quota) for any user
- [ ] AC2: User-specific overrides take priority over role and system defaults
- [ ] AC3: Role-based limits take priority over system defaults
- [ ] AC4: System defaults apply when no overrides or role limits exist
- [ ] AC5: Limit source is identified (user_override, role_based, system_default)
- [ ] AC6: Admins can set user-specific overrides with audit trail
- [ ] AC7: Admins can remove user-specific overrides (revert to role/system)
- [ ] AC8: Current used storage is included in limit response

## Constraints
- Performance: Limit resolution must complete in <50ms
- Caching: Results should be cacheable (limits don't change frequently)
- Audit: Override changes must record who, when, and why
- Data integrity: Invalid limits (negative, zero) rejected

## Out of Scope
- Actual file upload/download (E05-T006b, E05-T006c)
- Quota enforcement (E05-T006b)
- Background quota reconciliation (E05-T010)

## Context
See E05-T001 for schema design. Integrates with groups.settings JSONB for
role-based limits and user_storage_limits table for overrides.
```

#### E05-T006b: File upload with quota tracking

```markdown
---
id: "E05-T006b"
title: "File upload with quota enforcement"
epic: "E05"
depends_on: ["E05-T006a", "E05-T003"]
blocks: ["E05-T007"]
---

# File Upload with Quota Enforcement

## Description
Enable users to upload files with automatic enforcement of file size limits and
storage quotas, CASL permission checks, and atomic quota updates to prevent
race conditions.

## Why This Matters
Users need to attach files to assignments, sessions, and profiles. The system
must prevent users from exceeding their storage limits and ensure only
authorized uploads succeed.

## Acceptance Criteria
- [ ] AC1: Users can upload files within their effective size limit
- [ ] AC2: Upload fails immediately if file exceeds size limit (fail fast)
- [ ] AC3: Upload fails if user's quota would be exceeded (checked before upload)
- [ ] AC4: Only allowed MIME types are accepted (server-side validation)
- [ ] AC5: CASL permissions enforce upload authorization (group, entity)
- [ ] AC6: File metadata is stored (name, size, MIME type, uploader, timestamps)
- [ ] AC7: Storage quota is updated atomically after successful upload
- [ ] AC8: Upload failure rolls back storage and does not consume quota
- [ ] AC9: Concurrent uploads do not cause quota corruption

## Constraints
- Performance: Upload processing overhead <5% of upload time
- Security: MIME type validated server-side (not trusted from client)
- Concurrency: Multiple simultaneous uploads from same user handled correctly
- Atomicity: Storage upload + DB insert + quota update in transaction
- Size: Must handle files up to configured maximum (e.g., 100MB)

## Out of Scope
- File download (E05-T006c)
- File deletion (E05-T006d)
- Progress tracking for large uploads
- Resumable uploads
- Virus scanning

## Context
Uses FileLimitsService from E05-T006a for limit resolution. Integrates with
storage backend from E05-T003. Follows CASL patterns from E02.
```

#### E05-T006c: File download with signed URLs

```markdown
---
id: "E05-T006c"
title: "File download with signed URLs"
epic: "E05"
depends_on: ["E05-T006b", "E05-T003"]
blocks: ["E05-T008"]
---

# File Download with Signed URLs

## Description
Enable authorized users to download files via secure, time-limited signed URLs
that bypass the API server for better performance.

## Why This Matters
Large file downloads through Node.js are inefficient and consume server
resources. Signed URLs allow direct downloads from storage backend while
maintaining access control.

## Acceptance Criteria
- [ ] AC1: Authorized users can retrieve file metadata and download URL
- [ ] AC2: CASL permissions enforce download authorization
- [ ] AC3: Signed URLs expire after configured time (e.g., 15 minutes)
- [ ] AC4: Soft-deleted files are not accessible for download
- [ ] AC5: Download requests for non-existent files return 404
- [ ] AC6: Unauthorized download attempts return 403
- [ ] AC7: URL generation works with all configured storage backends

## Constraints
- Performance: URL generation must complete in <100ms
- Security: Permission check occurs once at URL generation (not at download)
- Expiration: URL lifetime configurable (default 15 minutes)
- Compatibility: Works with S3, MinIO, and local storage backends

## Out of Scope
- File upload (E05-T006b)
- File deletion (E05-T006d)
- Download tracking/analytics
- Bandwidth throttling
- Streaming partial content (range requests)

## Context
Uses storage backend signed URL generation from E05-T003. Follows CASL
patterns from E02. See ARCHITECTURE.md for signed URL strategy.
```

#### E05-T006d: File deletion with quota updates

```markdown
---
id: "E05-T006d"
title: "File deletion and quota recovery"
epic: "E05"
depends_on: ["E05-T006b"]
blocks: ["E05-T010"]
---

# File Deletion and Quota Recovery

## Description
Enable authorized users to soft-delete files, automatically recover storage quota,
and maintain data integrity for downstream references.

## Why This Matters
Users need to remove unwanted files to free up storage quota. Soft deletion
preserves records for audit and prevents breaking references from assignments
or submissions.

## Acceptance Criteria
- [ ] AC1: Authorized users can delete files they have permission for
- [ ] AC2: CASL permissions enforce deletion authorization
- [ ] AC3: Deletion is soft (status='soft_deleted', deleted_at set)
- [ ] AC4: User's storage quota is immediately decremented
- [ ] AC5: Quota update is atomic (no race conditions)
- [ ] AC6: Soft-deleted files do not appear in file listings
- [ ] AC7: Soft-deleted files cannot be downloaded
- [ ] AC8: Multiple simultaneous deletions do not corrupt quota

## Constraints
- Atomicity: Status update + quota decrement in transaction
- Concurrency: Multiple deletions from same user handled correctly
- Data integrity: Quota cannot go negative
- Performance: Deletion completes in <100ms

## Out of Scope
- Hard deletion from storage (E05-T010 background job)
- Undelete/restore functionality
- Cascade deletion of related entities
- Batch deletion

## Context
Soft delete allows background cleanup job (E05-T010) to remove from storage
after retention period. Quota recovery is immediate but storage cleanup is deferred.
```

#### E05-T006e: File listing and quota queries

```markdown
---
id: "E05-T006e"
title: "File listing and quota status queries"
epic: "E05"
depends_on: ["E05-T006b"]
blocks: ["E05-T008"]
---

# File Listing and Quota Status Queries

## Description
Enable users to list their files with filtering and pagination, and view their
current storage quota usage.

## Why This Matters
Users need to see what files they've uploaded and how much storage they're
using. Teachers need to view files attached to assignments. Admins need to
audit storage usage.

## Acceptance Criteria
- [ ] AC1: Users can list their uploaded files
- [ ] AC2: Listing supports filters (entity type, entity ID, group, status)
- [ ] AC3: Results use cursor-based pagination for performance
- [ ] AC4: Soft-deleted files excluded from default listings (unless explicitly included)
- [ ] AC5: Users can query their current quota (used/limit/remaining)
- [ ] AC6: Quota response includes source (user_override, role_based, system_default)
- [ ] AC7: Listing respects CASL permissions (users see only authorized files)
- [ ] AC8: Pagination handles large result sets efficiently (1000+ files)

## Constraints
- Performance: First page loads in <100ms for typical user (100 files)
- Performance: Quota query completes in <50ms
- Pagination: Cursor-based (not offset) for large datasets
- Filtering: Efficient indexes support common filter combinations

## Out of Scope
- File upload (E05-T006b)
- File content search (full-text, OCR)
- Sorting options beyond creation date
- Export to CSV/JSON
- Admin dashboard views (separate task)

## Context
Uses standard cursor pagination pattern from CONVENTIONS.md. CASL filtering
follows patterns from E02 auth implementation.
```

---

## Split Decision Guidelines

**When to split a task:**
- 15+ acceptance criteria
- Multiple distinct operations (CRUD = 4 subtasks)
- Multiple services/classes (each service = 1 subtask)
- Estimated >3 hours of work
- Mixes infrastructure with features

**Subtask naming:**
- Original: `E05-T006`
- Subtasks: `E05-T006a`, `E05-T006b`, `E05-T006c`, etc.
- Keep original as "parent" with links to subtasks, or retire it

**Dependency chaining:**
```
E05-T006a (limits) → E05-T006b (upload) → E05-T006c (download)
                                        → E05-T006d (delete)
                                        → E05-T006e (listing)
```

---

## Quality Checklist (After Replanning)

✅ Each task should have:
- [ ] Clear, outcome-focused description (WHAT, not HOW)
- [ ] "Why This Matters" section explaining value
- [ ] 5-10 observable acceptance criteria
- [ ] Constraints section (performance, security, etc.)
- [ ] **Workflow section with Category, Rationale, and Phases list**
- [ ] Out of scope section
- [ ] Context without code
- [ ] Appropriate size (1-3 hours)
- [ ] No implementation details in AC
- [ ] No code in description or notes
- [ ] `task_type` and `workflow` fields in frontmatter

---

## Arguments

- `$ARGUMENTS` — The task ID to replan (e.g., E05-T006)
- `--split` — Force split into subtasks even if borderline
