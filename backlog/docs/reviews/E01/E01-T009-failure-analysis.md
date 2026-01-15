# Integration Failure Analysis: E01-T009

## Summary

Docker Compose command configuration uses incorrect syntax, causing Node.js to attempt loading "bash" as a JavaScript module instead of executing the migration shell script.

## Root Cause

**Category:** Implementation

**Subcategory:** Infrastructure Configuration Bug

## Evidence

### What Was Expected

The spec (lines 176-196) defined the Docker Compose migrate service configuration:

```yaml
migrate:
  command: ["bash", "scripts/migrate-with-signal.sh"]
```

**Expected behavior:**
- Docker executes the bash shell script
- Script runs `pnpm db:migrate` to apply migrations
- Script creates `/tmp/migration-complete` signal file
- Healthcheck detects signal file and marks service as complete

### What Actually Happened

**Actual behavior:**
```
Error: Cannot find module '/app/packages/db/bash'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
```

**Execution context:**
- Dockerfile uses `node:20-alpine` base image (Dockerfile line 4)
- No explicit ENTRYPOINT set in Dockerfile
- Inherits default Node.js entrypoint: `["node"]`
- Docker Compose command array treated as Node.js arguments
- Results in: `node bash scripts/migrate-with-signal.sh`
- Node.js attempts to load "bash" as JavaScript module

### Key Discrepancy

**The spec assumed** the command array would execute the bash script directly.

**The reality is** that without an explicit entrypoint override, Docker Compose commands are appended to the inherited Node.js entrypoint, resulting in Node.js module loading behavior instead of shell execution.

### Why This Is An Implementation Bug

1. **Tests couldn't catch this:** Unit tests don't execute Docker containers
2. **Spec was technically incomplete:** Didn't account for inherited entrypoint behavior
3. **Script itself is correct:** `migrate-with-signal.sh` works when executed properly
4. **Migration logic is correct:** `migrate.ts` and `migrate-check.ts` work outside Docker
5. **Only the Docker Compose command configuration is wrong**

This is not a test assumption error - the tests correctly validated the migration scripts work. This is a Docker configuration bug that can only be discovered during actual container execution.

## Resolution Path

**Next State:** IMPLEMENTING

**Issue Type:** Infrastructure configuration bug (not core logic bug)

### Required Changes

#### Fix 1: Update docker-compose.yml command syntax (RECOMMENDED)

**File:** `docker-compose.yml` line 61

**Current:**
```yaml
command: ["bash", "scripts/migrate-with-signal.sh"]
```

**Fixed (Option A - Shell form, simplest):**
```yaml
command: sh -c "bash scripts/migrate-with-signal.sh"
```

**Explanation:** Shell form (string) bypasses entrypoint and executes in shell context.

**Fixed (Option B - Entrypoint override, more explicit):**
```yaml
entrypoint: ["/bin/sh", "-c"]
command: ["bash scripts/migrate-with-signal.sh"]
```

**Explanation:** Explicitly sets shell as entrypoint, command becomes shell argument.

#### Fix 2: Alternative - Use pnpm directly (simpler healthcheck)

**File:** `docker-compose.yml` lines 61, 64-69

**Replace command and healthcheck:**
```yaml
command: ["pnpm", "db:migrate"]
# Remove healthcheck - pnpm command will exit when complete
# restart: "no" already ensures one-shot execution
```

**Explanation:**
- `pnpm` executable exists in PATH (installed via corepack)
- Command array works correctly with pnpm (no shell needed)
- Simpler than shell script + signal file pattern
- Service exits cleanly on success/failure
- Docker's `restart: "no"` ensures one-shot behavior
- API service's `depends_on: migrate: condition: service_completed_successfully` waits for clean exit

**Trade-offs:**
- ✅ Simpler configuration (no shell script, no healthcheck)
- ✅ Direct error propagation (pnpm exit code = container exit code)
- ❌ Loses explicit `/tmp/migration-complete` signal file
- ❌ Healthcheck pattern not demonstrated

#### Fix 3: Update Dockerfile to set explicit shell entrypoint (NOT RECOMMENDED)

**Reason:** Would affect all services using the Dockerfile. The migrate service is the only one needing shell execution - API service correctly uses Node.js entrypoint.

### Recommended Approach

**Use Fix 2 (pnpm direct command)** for these reasons:

1. **Simplicity:** Removes unnecessary complexity (shell script + signal file)
2. **Clarity:** Direct pnpm command is easier to understand
3. **Robustness:** Fewer moving parts means fewer failure points
4. **Exit code clarity:** pnpm exit code directly signals success/failure
5. **Aligns with Docker best practices:** One-shot migration services don't need healthchecks

**Implementation:**
```yaml
migrate:
  build:
    context: .
    dockerfile: Dockerfile
    target: build
  container_name: raptscallions-migrate
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://raptscallions:raptscallions@postgres:5432/raptscallions
    NODE_ENV: development
  working_dir: /app/packages/db
  command: ["pnpm", "db:migrate"]
  restart: "no"
```

**Verification steps:**
1. `docker compose down -v` - Clean slate
2. `docker compose up -d` - Start services
3. `docker compose logs migrate` - Should show "✅ Migrations completed successfully"
4. `docker compose ps` - Migrate should show "Exited (0)"
5. API service should start successfully (depends_on satisfied)

### Alternative: If signal file pattern is required

If the healthcheck + signal file pattern is important for learning/demonstration:

**Use Fix 1 Option A:**
```yaml
command: sh -c "bash scripts/migrate-with-signal.sh"
healthcheck:
  test: ["CMD-SHELL", "test -f /tmp/migration-complete"]
  interval: 5s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**Important:** Also update `migrate-with-signal.sh` line 8 to fix the exit code check bug:

**Current (BUGGY):**
```bash
if [ $? -eq 0 ]; then
```

**Fixed:**
```bash
# Check exit code immediately after pnpm command
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
```

**Why:** `$?` captures the exit code of the *most recent* command, which is the `if` test itself, not `pnpm db:migrate`. The exit code must be captured immediately.

## Additional Notes

### Why Tests Passed But Integration Failed

1. **Unit tests validate logic:** Migration scripts (`migrate.ts`, `migrate-check.ts`) work correctly
2. **Integration tests validate deployment:** Docker Compose configuration wasn't testable in unit tests
3. **QA phase caught ESM bug:** Fixed successfully (fileURLToPath/dirname)
4. **Integration phase caught Docker bug:** Can only be discovered with container execution

This is the expected workflow - different phases catch different types of issues.

### Files Affected

**Primary:**
- `docker-compose.yml` line 61 (command configuration)

**Secondary (if keeping shell script approach):**
- `packages/db/scripts/migrate-with-signal.sh` line 8 (exit code capture bug)

**Not affected (all working correctly):**
- `packages/db/scripts/migrate.ts` ✅
- `packages/db/scripts/migrate-check.ts` ✅
- `packages/db/package.json` ✅
- Migration SQL files ✅
- Unit tests ✅
- TypeScript/linting/build ✅

### Lessons Learned

1. **Docker command arrays inherit entrypoint:** Always verify the base image's ENTRYPOINT behavior
2. **Shell scripts need shell context:** Use shell form command or explicit shell entrypoint
3. **`$?` is tricky:** Capture exit codes immediately in variables
4. **Integration testing is essential:** Some bugs only appear during actual deployment
5. **Simpler is better:** Direct pnpm command > shell script + signal file for one-shot services

### Spec Update Recommendation

The spec should be updated to include:

**Section: Docker Integration Considerations**

```markdown
### Docker Compose Command Syntax

When using command arrays in docker-compose.yml, be aware of entrypoint inheritance:

- **Base image:** `node:20-alpine` has default entrypoint `["node"]`
- **Command array:** Appended to entrypoint, not executed directly
- **Shell script execution:** Requires shell form command or entrypoint override

**Correct patterns:**
```yaml
# Pattern 1: Shell form (string, not array)
command: sh -c "bash scripts/script.sh"

# Pattern 2: Entrypoint override
entrypoint: ["/bin/sh", "-c"]
command: ["bash scripts/script.sh"]

# Pattern 3: Direct executable (if in PATH)
command: ["pnpm", "db:migrate"]
```

**Incorrect pattern:**
```yaml
# ❌ This attempts to load "bash" as Node.js module
command: ["bash", "scripts/script.sh"]
```
```

## Implementation Guidance

For the developer fixing this:

1. **Quick fix (5 minutes):** Use Fix 2 (pnpm direct command)
   - Update `docker-compose.yml` line 61
   - Remove healthcheck (lines 64-69)
   - Test with `docker compose down -v && docker compose up -d`

2. **If preserving shell script pattern:** Use Fix 1 Option A
   - Update command to shell form
   - Fix exit code bug in `migrate-with-signal.sh`
   - Keep healthcheck as-is

3. **After fix:**
   - Run full integration test again
   - Verify all ACs pass
   - Update integration report with success results
   - Transition to DOCS_UPDATE state

## Confidence Level

**High confidence** this is the complete root cause:

- Error message clearly indicates Node.js module loading
- Docker configuration analysis confirms entrypoint inheritance
- Script verification shows file exists and is executable
- Recommended fix addresses the exact issue
- Alternative fixes provided for different trade-off preferences

**No other issues blocking integration testing** - once Docker command is fixed, infrastructure will start and all ACs can be validated.
