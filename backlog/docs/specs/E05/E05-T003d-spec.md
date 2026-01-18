# E05-T003d Implementation Specification

**Task:** Production S3 credentials and validation
**Epic:** E05 - Storage System
**Selected Approach:** A - Standalone Node.js Validation Script
**Architect:** architect
**Date:** 2026-01-18

## Summary

Create a standalone validation script that tests production S3 credentials against real cloud storage. This task bridges the gap between local MinIO testing and production deployment by verifying credentials work correctly with the S3 backend before going live.

## Selected Approach Rationale

**Approach A: Standalone Node.js Validation Script** was selected because:

1. **Reuses Proven Code** - The `S3StorageBackend` class (E05-T003a) is thoroughly tested with 42 unit tests and 17 integration tests. The validation script wraps it in a CLI interface.

2. **Standard DevOps Pattern** - A standalone validation script is industry-standard for infrastructure validation. It can be run independently of the application lifecycle.

3. **Simple and Maintainable** - Lower complexity than Approach B (interactive wizard), while providing more value than Approach C (documentation-only).

4. **CI/CD Compatible** - The script can be incorporated into deployment pipelines for pre-deployment verification.

**Rejected Alternatives:**
- **Approach B (Interactive Wizard)** - Nice-to-have but adds dependency (`inquirer`/`prompts`) and complexity not needed for MVP.
- **Approach C (Documentation-Only)** - Insufficient; integration tests require MinIO and don't validate production credentials.

## Architecture

### Script Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      scripts/validate-s3.ts                         │
├─────────────────────────────────────────────────────────────────────┤
│  1. Load environment variables (dotenv)                             │
│  2. Create S3StorageBackend via createS3Backend() factory           │
│  3. Run validation tests sequentially:                              │
│     a. validateConfig()      - Check required env vars present      │
│     b. testConnectivity()    - HeadObject on dummy key              │
│     c. testUpload()          - Upload small test file               │
│     d. testDownload()        - Download and verify content          │
│     e. testSignedUrlGet()    - Generate GET URL, fetch via HTTP     │
│     f. testSignedUrlPut()    - Generate PUT URL, upload via HTTP    │
│     g. testDelete()          - Delete test file                     │
│     h. verifyCleanup()       - Confirm file no longer exists        │
│  4. Output colorful pass/fail results                               │
│  5. Exit with appropriate code (0 = all pass, 1 = any fail)         │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
raptscallions/
├── scripts/
│   └── validate-s3.ts              # NEW: Validation script
├── .env.example                    # MODIFIED: Add production S3 templates
└── apps/docs/src/storage/
    └── patterns/
        └── production-s3-setup.md  # NEW: Production deployment guide
```

## Implementation Details

### Phase 1: Validation Script (`scripts/validate-s3.ts`)

#### Interface Design

```typescript
interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: string;
}

interface ValidationSummary {
  results: ValidationResult[];
  allPassed: boolean;
  totalDuration: number;
}
```

#### Test Implementations

Each test follows this pattern:
1. Record start time
2. Execute operation (wrapped in try/catch)
3. Return `ValidationResult` with pass/fail and timing

**Test: validateConfig**
- Purpose: Verify all required S3 environment variables are set
- Method: Check for `STORAGE_BACKEND=s3`, `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY`
- Fail Message: Lists missing variables

**Test: testConnectivity**
- Purpose: Verify network connectivity and bucket access
- Method: Call `backend.exists("__validation-probe__")` (HeadObject on dummy key)
- Pass: Operation completes (true or false doesn't matter)
- Fail Reasons: ECONNREFUSED, ENOTFOUND, InvalidAccessKeyId, bucket not found

**Test: testUpload**
- Purpose: Verify write access to bucket
- Method: `backend.upload({ key: testKey, body: Buffer.from(testContent), contentType: "text/plain" })`
- Test Key: `validation-test/${timestamp}-probe.txt`
- Pass: Returns etag

**Test: testDownload**
- Purpose: Verify read access and content integrity
- Method: `backend.download(testKey)` → stream to string → compare
- Pass: Downloaded content matches uploaded content exactly

**Test: testSignedUrlGet**
- Purpose: Verify signed URL generation works for downloads
- Method: `backend.getSignedUrl(testKey)` → `fetch(url)` → compare content
- Pass: HTTP 200, content matches
- Note: Tests actual HTTP fetch, not just URL generation

**Test: testSignedUrlPut**
- Purpose: Verify signed URL generation works for uploads
- Method:
  1. Generate PUT URL: `backend.getSignedUrl(putTestKey, { method: "PUT", contentType: "text/plain" })`
  2. Upload via HTTP: `fetch(url, { method: "PUT", body: content })`
  3. Download and verify: `backend.download(putTestKey)`
- Pass: Upload succeeds, download matches
- Test Key: `validation-test/${timestamp}-signed-put.txt`

**Test: testDelete**
- Purpose: Verify delete permissions
- Method: `backend.delete(testKey)` for all test keys
- Pass: No errors thrown

**Test: verifyCleanup**
- Purpose: Confirm deletion worked
- Method: `backend.exists(testKey)` for all test keys
- Pass: All return `false`

#### Output Format

```
╔══════════════════════════════════════════════════════════════════╗
║                S3 Production Validation Report                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Provider: s3 (custom endpoint)                                  ║
║  Bucket:   raptscallions-prod                                    ║
║  Region:   us-east-1                                             ║
╚══════════════════════════════════════════════════════════════════╝

  ✅ Configuration        PASSED    (2ms)
  ✅ Connectivity          PASSED    (156ms)
  ✅ File upload           PASSED    (89ms)
  ✅ File download         PASSED    (45ms)
  ✅ Signed URL (GET)      PASSED    (201ms)
  ✅ Signed URL (PUT)      PASSED    (312ms)
  ✅ File delete           PASSED    (34ms)
  ✅ Cleanup verified      PASSED    (28ms)

──────────────────────────────────────────────────────────────────
  All 8 tests passed in 867ms

  ✓ S3 storage is ready for production!
```

**Failure Output Example:**

```
╔══════════════════════════════════════════════════════════════════╗
║                S3 Production Validation Report                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Provider: s3 (custom endpoint)                                  ║
║  Bucket:   my-bucket                                             ║
║  Region:   us-east-1                                             ║
╚══════════════════════════════════════════════════════════════════╝

  ✅ Configuration        PASSED    (1ms)
  ❌ Connectivity          FAILED    (5023ms)

     Error: Storage service unavailable (ECONNREFUSED)

     Possible causes:
     • STORAGE_S3_ENDPOINT is incorrect
     • Network firewall blocking outbound connections
     • VPN required for private endpoints
     • Wrong region specified

──────────────────────────────────────────────────────────────────
  1 of 8 tests failed

  ✗ S3 storage validation failed. See errors above.
```

#### CLI Output Styling

Use ANSI escape codes directly (no `chalk` dependency):

```typescript
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
} as const;
```

#### Error Message Mapping

The script maps `StorageError` messages to user-friendly troubleshooting hints:

| Error Pattern | User Message | Hints |
|---------------|--------------|-------|
| `unavailable` + `ECONNREFUSED` | Storage service unavailable | Endpoint incorrect, firewall, VPN |
| `unavailable` + `ENOTFOUND` | Storage endpoint not found | Endpoint URL typo, DNS issue |
| `authentication failed` | Invalid credentials | Check access key/secret, IAM policy |
| `NoSuchBucket` | Bucket not found | Bucket name wrong, different region |
| `AccessDenied` | Access denied | IAM policy missing permissions |

### Phase 2: Production .env Template

Update `.env.example` with commented production S3 sections:

```bash
# ============================================
# PRODUCTION S3 STORAGE CONFIGURATION
# ============================================
# Uncomment and configure ONE provider section below.
# For local development, use the MinIO section at the top of this file.

# --- AWS S3 ---
# STORAGE_BACKEND=s3
# STORAGE_S3_BUCKET=your-bucket-name
# STORAGE_S3_REGION=us-east-1
# STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
# STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Note: AWS S3 does not require STORAGE_S3_ENDPOINT

# --- DigitalOcean Spaces ---
# STORAGE_BACKEND=s3
# STORAGE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
# STORAGE_S3_BUCKET=your-space-name
# STORAGE_S3_REGION=nyc3
# STORAGE_S3_ACCESS_KEY_ID=your-spaces-key
# STORAGE_S3_SECRET_ACCESS_KEY=your-spaces-secret

# --- Backblaze B2 ---
# STORAGE_BACKEND=s3
# STORAGE_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
# STORAGE_S3_BUCKET=your-bucket-name
# STORAGE_S3_REGION=us-west-004
# STORAGE_S3_ACCESS_KEY_ID=your-b2-key-id
# STORAGE_S3_SECRET_ACCESS_KEY=your-b2-application-key

# --- Cloudflare R2 ---
# STORAGE_BACKEND=s3
# STORAGE_S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
# STORAGE_S3_BUCKET=your-bucket-name
# STORAGE_S3_REGION=auto
# STORAGE_S3_ACCESS_KEY_ID=your-r2-access-key
# STORAGE_S3_SECRET_ACCESS_KEY=your-r2-secret-key
```

### Phase 3: Production Deployment Documentation

Create `apps/docs/src/storage/patterns/production-s3-setup.md`:

#### Sections

1. **Overview** - What this guide covers
2. **Provider Comparison** - Cost, features table (AWS, DO, Backblaze, R2)
3. **Provider-Specific Setup**
   - AWS S3: Create bucket, IAM user, policy
   - DigitalOcean Spaces: Create Space, API keys
   - Backblaze B2: Create bucket, application key
   - Cloudflare R2: Create bucket, API token
4. **CORS Configuration** - Per-provider instructions
5. **Lifecycle Policies** - Soft-delete cleanup configuration
6. **Credential Rotation** - Procedure for rotating keys without downtime
7. **Validation** - How to run `pnpm validate:s3`
8. **Troubleshooting** - Common errors and solutions

### Phase 4: Package Script

Add to root `package.json`:

```json
{
  "scripts": {
    "validate:s3": "tsx scripts/validate-s3.ts"
  }
}
```

## Constraints

### Security

1. **No Credential Logging** - Never log access keys or secrets (backend already sanitizes)
2. **Clean Test Keys** - Always use `validation-test/` prefix for test files
3. **Guaranteed Cleanup** - Delete all test files even on script failure (finally block)
4. **Exit Codes** - Exit 0 on success, 1 on failure (for CI integration)

### Compatibility

1. **Provider Agnostic** - Must work with any S3-compatible service
2. **Path-Style Support** - Auto-detect based on endpoint presence (already handled by `createS3Backend`)
3. **HTTP/HTTPS** - Support both (for local MinIO vs production)

### Performance

1. **Timeout Handling** - 30s timeout per test to catch hung connections
2. **Sequential Tests** - Run tests in order (upload before download)
3. **Small Test Files** - Use minimal content ("RaptScallions validation probe")

## Dependencies

### Existing (No New Dependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `tsx` | dev | Run TypeScript scripts directly |
| `@raptscallions/storage` | workspace | S3StorageBackend, errors |
| `dotenv` | existing | Load `.env` file |

### No New Dependencies Required

The script uses:
- ANSI escape codes for colors (no `chalk`)
- Native `fetch` for signed URL testing (Node 18+)
- Existing storage package infrastructure

## Testing Strategy

This task follows the infrastructure workflow - the validation script IS the test. However, we should verify:

1. **Manual Testing** - Run against MinIO first, then production credentials
2. **Error Scenarios** - Test with:
   - Missing credentials (should fail at config)
   - Wrong endpoint (should fail at connectivity)
   - Invalid credentials (should fail at connectivity)
   - Wrong bucket name (should fail at connectivity)
3. **CI Consideration** - Script should skip gracefully if no S3 configured (exit 0 with message)

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1: User provides credentials | Task prompt in description + documentation |
| AC2: Credentials stored in .env | `.env.example` template + documentation |
| AC3: Validation script tests operations | `scripts/validate-s3.ts` with 8 tests |
| AC4: Clear pass/fail output | ANSI colored output with timing and hints |
| AC5: CORS configuration | Documentation in `production-s3-setup.md` |
| AC6: Lifecycle policies documented | Documentation in `production-s3-setup.md` |
| AC7: Credential rotation procedure | Documentation in `production-s3-setup.md` |
| AC8: Production env vars documented | `.env.example` + KB documentation |

## Implementation Order

1. **Create validation script** (`scripts/validate-s3.ts`)
   - Implement test functions
   - Add output formatting
   - Handle errors gracefully
2. **Update `.env.example`** with production S3 templates
3. **Add package script** (`pnpm validate:s3`)
4. **Create production documentation** (`production-s3-setup.md`)
5. **Update KB sidebar** to include new documentation

## Out of Scope

Per task definition, the following are NOT included:
- Automated credential provisioning (Terraform, Pulumi)
- Multi-region replication configuration
- Backup/disaster recovery setup
- CDN setup for file serving
- Interactive CLI wizard (Approach B - future enhancement)

## Breakpoint Handling

This task has a **BREAKPOINT** after analysis, before implementation:

1. User provides production S3 credentials
2. User adds to their local `.env` file
3. Agent creates validation script
4. User runs `pnpm validate:s3` to verify

The script should work with MinIO for development/testing purposes before production credentials are available.
