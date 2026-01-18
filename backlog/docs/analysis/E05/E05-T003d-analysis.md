# E05-T003d Analysis: Production S3 Credentials and Validation

**Task:** Production S3 credentials and validation
**Epic:** E05 - Storage System
**Analyst:** analyst
**Date:** 2026-01-18
**Status:** ANALYZED

## Executive Summary

This task requires user interaction to obtain production S3 credentials, create a validation script to verify the S3 backend works with real cloud storage, and document the setup process. Unlike E05-T003a-c which focused on implementation and local testing with MinIO, this task bridges the gap to production deployment.

**Key Insight:** The S3 backend code (E05-T003a) and integration tests (E05-T003c) are complete and thoroughly tested against MinIO. The remaining work is primarily:
1. Credential collection workflow
2. A standalone validation script for production verification
3. Production deployment documentation (CORS, lifecycle policies, credential rotation)

## Context Analysis

### What Exists

| Component | Status | Location |
|-----------|--------|----------|
| S3StorageBackend class | ✅ Complete | `packages/storage/src/backends/s3.backend.ts` |
| Configuration system | ✅ Complete | `packages/storage/src/config.ts` |
| MinIO Docker setup | ✅ Complete | `docker-compose.yml` |
| Integration tests | ✅ Complete (17 tests) | `packages/storage/src/__tests__/integration/` |
| KB documentation | ✅ Complete | `apps/docs/src/storage/` |
| .env.example | ✅ Partial | Contains MinIO config, needs production template |

### What's Missing

1. **Validation Script** - A standalone CLI tool to verify production S3 credentials
2. **Production .env Section** - Template for real S3 providers (AWS, DO Spaces, Backblaze, R2)
3. **CORS Documentation** - Provider-specific CORS configuration guides
4. **Lifecycle Policies** - Soft-delete cleanup configuration guidance
5. **Credential Rotation** - Documentation for rotating S3 access keys
6. **Deployment Guide** - End-to-end production S3 setup documentation

### Acceptance Criteria Mapping

| AC | Description | Approach |
|----|-------------|----------|
| AC1 | User provides S3 credentials | User interaction prompt |
| AC2 | Credentials stored securely in .env | Validation script + documentation |
| AC3 | Validation script tests operations | New CLI script |
| AC4 | Clear pass/fail output | CLI output formatting |
| AC5 | CORS configuration | Documentation only |
| AC6 | Lifecycle policies documented | KB documentation |
| AC7 | Credential rotation procedure | KB documentation |
| AC8 | Production env vars documented | Deployment guide update |

## Approach Analysis

### Approach A: Standalone Node.js Validation Script

**Description:** Create a self-contained validation script (`scripts/validate-s3.ts`) that tests all S3 operations against production credentials. The script runs independently of the application.

**Implementation:**
- New file: `scripts/validate-s3.ts`
- Uses the existing `S3StorageBackend` class directly
- Reads from `.env` or CLI arguments
- Tests: connectivity, upload, download, delete, exists, signed URLs (GET/PUT)
- Colorful CLI output with pass/fail indicators
- Non-destructive: uses `validation-test/` prefix, cleans up after

**Pros:**
- Reuses existing proven code (`S3StorageBackend`)
- Can be run independently before application startup
- Simple to understand and maintain
- Matches existing integration test patterns
- Easy to extend with additional checks

**Cons:**
- Requires TypeScript compilation or `tsx` runtime
- Slight code overlap with integration tests

**Effort:** Low (1-2 hours implementation)
**Risk:** Low (reuses proven code)
**Recommendation:** ✅ **Recommended** - Most practical, reuses existing infrastructure

---

### Approach B: Interactive CLI Wizard with Provider Templates

**Description:** Create an interactive CLI wizard (`scripts/setup-s3.ts`) that walks users through S3 setup, auto-generates `.env` entries, and runs validation.

**Implementation:**
- Uses `inquirer` or `prompts` for interactive CLI
- Provider selection (AWS, DigitalOcean, Backblaze, Cloudflare, custom)
- Auto-fills endpoint and region based on provider
- Validates credentials in real-time
- Outputs `.env` entries ready to copy/paste
- Optional: Writes directly to `.env.local` file

**Pros:**
- Excellent developer experience
- Provider-specific guidance built-in
- Less room for configuration errors
- Self-documenting through prompts

**Cons:**
- Additional dependency (`inquirer` or `prompts`)
- More complex implementation
- May not fit all deployment scenarios (e.g., CI/CD, Docker)

**Effort:** Medium (3-4 hours implementation)
**Risk:** Low-Medium (new dependency, but well-tested libraries)
**Recommendation:** Nice-to-have enhancement, but not required for MVP

---

### Approach C: Documentation-Only with Manual Testing

**Description:** Rely on existing integration tests and provide comprehensive documentation for manual production validation.

**Implementation:**
- Extend `apps/docs/src/storage/` with production deployment guide
- Add provider-specific configuration examples
- Document manual validation steps using existing integration tests
- Add troubleshooting guide for common production issues

**Pros:**
- No new code to maintain
- Leverages existing integration tests
- Flexibility for advanced users

**Cons:**
- Higher barrier for less technical users
- More error-prone manual process
- Harder to verify in CI/CD pipelines
- Integration tests require MinIO, not ideal for production validation

**Effort:** Low (1-2 hours documentation)
**Risk:** Medium (relies on user following docs correctly)
**Recommendation:** Not sufficient as standalone - documentation is needed but validation script adds significant value

## Recommended Approach: A (Standalone Validation Script)

### Rationale

1. **Reuses Proven Code:** The `S3StorageBackend` class is thoroughly tested (42 unit tests, 17 integration tests). The validation script wraps it in a CLI interface.

2. **Production-Ready Pattern:** A standalone validation script is standard practice for infrastructure validation. It can be:
   - Run manually after credential setup
   - Added to CI/CD pipelines for pre-deployment checks
   - Used by operations teams without application knowledge

3. **Clear User Workflow:**
   ```
   1. User provides credentials (manual or via task prompt)
   2. User adds to .env file
   3. User runs: pnpm validate:s3
   4. Script outputs pass/fail with helpful messages
   5. If all pass, storage is production-ready
   ```

4. **Documentation Completeness:** The script output serves as living documentation - it tests exactly what the backend needs.

### Implementation Plan

#### Phase 1: Validation Script (~1 hour)

**File:** `scripts/validate-s3.ts`

```typescript
// Script structure
1. Read config from environment
2. Create S3StorageBackend with production credentials
3. Run validation tests:
   - Test bucket connectivity (exists check on dummy key)
   - Test upload (small text file with validation-test/ prefix)
   - Test download (verify content matches)
   - Test signed URL (generate and fetch)
   - Test delete (cleanup)
4. Output results with colors:
   ✅ Bucket access: PASSED
   ✅ File upload: PASSED
   ✅ File download: PASSED
   ✅ Signed URL: PASSED
   ✅ File delete: PASSED

   Production S3 configuration is valid!
```

**Package scripts:**
```json
{
  "validate:s3": "tsx scripts/validate-s3.ts"
}
```

#### Phase 2: Production .env Template (~30 min)

**Update:** `.env.example`

Add commented sections for each provider:
```bash
# ============================================
# PRODUCTION S3 CONFIGURATION
# Uncomment and configure for your provider
# ============================================

# --- AWS S3 ---
# STORAGE_BACKEND=s3
# STORAGE_S3_BUCKET=your-bucket-name
# STORAGE_S3_REGION=us-east-1
# STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
# STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# --- DigitalOcean Spaces ---
# STORAGE_BACKEND=s3
# STORAGE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
# STORAGE_S3_BUCKET=your-space-name
# STORAGE_S3_REGION=nyc3
# ...

# --- Backblaze B2 ---
# ...

# --- Cloudflare R2 ---
# ...
```

#### Phase 3: Production Deployment Documentation (~1-2 hours)

**New file:** `apps/docs/src/storage/patterns/production-s3-setup.md`

Contents:
- Provider comparison table (cost, features)
- Step-by-step setup for each provider
- CORS configuration (provider-specific UI/CLI)
- Bucket lifecycle policies for soft-delete cleanup
- Credential rotation procedure
- Troubleshooting guide

#### Phase 4: .env.example Updates (~15 min)

Add production S3 section with all provider examples (commented out).

### Validation Script Design

```typescript
// scripts/validate-s3.ts

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

async function runValidation(): Promise<void> {
  const results: ValidationResult[] = [];

  // 1. Config Check
  results.push(await validateConfig());

  // 2. Connectivity
  results.push(await testConnectivity());

  // 3. Upload
  results.push(await testUpload());

  // 4. Download
  results.push(await testDownload());

  // 5. Signed URL (GET)
  results.push(await testSignedUrlGet());

  // 6. Signed URL (PUT)
  results.push(await testSignedUrlPut());

  // 7. Delete
  results.push(await testDelete());

  // 8. Cleanup verification
  results.push(await verifyCleanup());

  // Output results
  printResults(results);
}
```

### Error Message Examples

**Connection failure:**
```
❌ Bucket access: FAILED
   Error: Storage service unavailable (ECONNREFUSED)

   Possible causes:
   - STORAGE_S3_ENDPOINT is incorrect
   - Firewall blocking outbound connections
   - VPN required for private endpoints
```

**Authentication failure:**
```
❌ Bucket access: FAILED
   Error: Storage authentication failed

   Possible causes:
   - STORAGE_S3_ACCESS_KEY_ID is incorrect
   - STORAGE_S3_SECRET_ACCESS_KEY is incorrect
   - IAM policy doesn't allow s3:ListBucket
```

**Missing bucket:**
```
❌ Bucket access: FAILED
   Error: Bucket not found

   Possible causes:
   - STORAGE_S3_BUCKET name is incorrect
   - Bucket doesn't exist (create it first)
   - Bucket is in a different region
```

## Dependencies

### Required for Implementation

| Dependency | Purpose | Already Installed |
|------------|---------|-------------------|
| `tsx` | Run TypeScript scripts | Yes (dev dependency) |
| `chalk` | Colorful CLI output | No (optional) |
| `@raptscallions/storage` | S3StorageBackend | Yes |

**Note:** `chalk` is optional - can use ANSI escape codes directly for zero dependencies.

### Task Dependencies

- **E05-T003a** (Completed): S3StorageBackend implementation
- **E05-T003c** (Completed): Integration tests proving the backend works

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User provides invalid credentials | Low | Clear error messages with troubleshooting |
| Script fails silently | Medium | Explicit error handling with stack traces |
| CORS misconfiguration | Low | Document common CORS patterns per provider |
| Credential exposure in logs | High | Backend already sanitizes auth errors |
| Path-style vs virtual-hosted URLs | Medium | Auto-detection based on endpoint presence |

## Out of Scope

Per task definition:
- Automated credential provisioning (Terraform)
- Multi-region replication
- Backup/disaster recovery
- CDN setup

## Questions for User

Before implementation, need clarification on:

1. **Provider Preference:** Do you have a preferred S3 provider for documentation examples? (AWS S3 is the reference, but we can emphasize others)

2. **Chalk Dependency:** Should we add `chalk` for colorful output, or prefer zero dependencies using raw ANSI codes?

3. **Interactive Mode:** Would you like Approach B's interactive wizard as a future enhancement?

## Appendix: Provider Comparison

| Provider | Cost (GB/mo) | Free Tier | Egress | Notes |
|----------|--------------|-----------|--------|-------|
| AWS S3 | $0.023 | 5GB/12mo | $0.09/GB | Most compatible, complex pricing |
| DigitalOcean | $5/250GB | None | 1TB included | Simple pricing, good DX |
| Backblaze B2 | $0.006 | 10GB | $0.01/GB | Cheapest storage, S3-compatible |
| Cloudflare R2 | $0.015 | 10GB | Free | No egress fees, newest |

## Next Steps

1. User reviews this analysis
2. User confirms approach preference (A recommended)
3. Proceed to `/architect:review-plan` for implementation spec
4. **BREAKPOINT:** User provides production credentials
5. Implementation and validation
