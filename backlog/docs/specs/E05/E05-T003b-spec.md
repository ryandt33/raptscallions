# Implementation Spec: E05-T003b

## Overview

Add MinIO (S3-compatible object storage) to the Docker Compose development environment so developers can test S3 storage locally without cloud credentials. The setup includes automatic bucket creation via an init container, proper health checks, and documentation updates.

## Selected Approach

**Approach A: MinIO with Init Container for Bucket Creation**

This approach was selected because:

1. **Follows existing patterns**: The codebase already uses the "init container" pattern with the `migrate` service which runs once, creates database state, then exits. The `minio-init` container follows this exact pattern.

2. **Satisfies all acceptance criteria**: Auto-bucket creation (AC4) is handled by the init container using `mc mb --ignore-existing`, which is idempotent and safe for repeated runs.

3. **Uses official tooling**: Both `minio/minio` and `minio/mc` are official MinIO images, eliminating the need for custom scripts that require maintenance.

4. **Separation of concerns**: The MinIO server and initialization logic are separate, making debugging easier and following the single-responsibility principle.

5. **Recommended health check**: Uses `mc ready local` which is MinIO's official, purpose-built health check command rather than a generic HTTP check.

## Files to Create

None - this task only modifies existing files.

## Files to Modify

| File | Changes |
| ---- | ------- |
| `docker-compose.yml` | Add `minio` service, `minio-init` service, `minio_data` volume, and update `api` service dependencies |
| `.env.example` | Add MinIO and storage environment variables with documentation |
| `README.md` | Add MinIO console access instructions |

## Dependencies

- Requires: None (no task dependencies)
- Docker images:
  - `minio/minio:latest` - MinIO server
  - `minio/mc:latest` - MinIO client for bucket initialization

## Test Strategy

### Manual Verification Steps

Since this is an infrastructure task, testing is manual:

1. **Service startup**: Run `docker compose up -d` and verify MinIO starts without errors
2. **API accessibility**: Verify port 9000 responds to requests (`curl http://localhost:9000/minio/health/live`)
3. **Console accessibility**: Open http://localhost:9001 in browser, login with minioadmin/minioadmin
4. **Bucket creation**: Verify `raptscallions-files` bucket exists in MinIO console
5. **Data persistence**: Stop containers, start again, verify bucket still exists
6. **Init container idempotency**: Run `docker compose up -d` multiple times, no errors on bucket creation
7. **API dependency**: Verify API waits for MinIO before starting (check container ordering in logs)

### Integration Tests

Integration tests with actual S3 operations will be covered in E05-T003c.

## Acceptance Criteria Breakdown

### Service Configuration (AC1-AC3, AC6)

**AC1: MinIO service starts with `docker compose up`**
- Add `minio` service to docker-compose.yml
- Use official `minio/minio:latest` image
- Configure with `restart: unless-stopped` matching other services

**AC2: MinIO API is accessible on port 9000**
```yaml
ports:
  - "${MINIO_API_PORT:-9000}:9000"
```
- Default to port 9000, but allow override via env var (matching POSTGRES_PORT pattern)

**AC3: MinIO web console is accessible on port 9001 for debugging**
```yaml
ports:
  - "${MINIO_CONSOLE_PORT:-9001}:9001"
command: server /data --console-address ":9001"
```

**AC6: API service waits for MinIO health check before starting**
```yaml
api:
  depends_on:
    minio:
      condition: service_healthy
    minio-init:
      condition: service_completed_successfully
```

### Bucket Auto-Creation (AC4)

**AC4: Default bucket is automatically created on first startup**
- Add `minio-init` service using `minio/mc:latest` image
- Use `mc mb --ignore-existing` for idempotent bucket creation
- Configure `depends_on: minio: condition: service_healthy`
- Use `restart: "no"` to run once then exit

### Data Persistence (AC5)

**AC5: MinIO data persists across container restarts (volume mount)**
```yaml
volumes:
  - minio_data:/data

# At top level
volumes:
  minio_data:
    driver: local
```

### Documentation (AC7-AC8)

**AC7: Environment variables are documented in .env.example**
```bash
# MinIO Configuration (Docker)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=raptscallions-files

# Storage Configuration (Application)
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_REGION=us-east-1
STORAGE_S3_BUCKET=raptscallions-files
STORAGE_S3_ACCESS_KEY_ID=minioadmin
STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
STORAGE_S3_FORCE_PATH_STYLE=true
```

**AC8: README includes instructions for accessing MinIO console**
- Add section to README about MinIO console
- Include default credentials
- Explain how to view uploaded files during development

## Detailed Implementation

### docker-compose.yml Changes

Add the following services and volume after the `redis` service:

```yaml
  # ==========================================================================
  # MinIO Object Storage (S3-compatible)
  # ==========================================================================
  minio:
    image: minio/minio:latest
    container_name: raptscallions-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "${MINIO_API_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ==========================================================================
  # MinIO Bucket Initialization (runs once then exits)
  # ==========================================================================
  minio-init:
    image: minio/mc:latest
    container_name: raptscallions-minio-init
    depends_on:
      minio:
        condition: service_healthy
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
      MINIO_BUCKET: ${MINIO_BUCKET:-raptscallions-files}
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD};
      mc mb --ignore-existing myminio/$${MINIO_BUCKET};
      echo 'Bucket $${MINIO_BUCKET} ready';
      "
    restart: "no"
```

Update the `api` service `depends_on`:

```yaml
  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
      minio:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
```

Add the storage environment variables to the `api` service:

```yaml
      # Storage (MinIO)
      STORAGE_BACKEND: ${STORAGE_BACKEND:-s3}
      STORAGE_S3_ENDPOINT: http://minio:9000
      STORAGE_S3_REGION: ${STORAGE_S3_REGION:-us-east-1}
      STORAGE_S3_BUCKET: ${MINIO_BUCKET:-raptscallions-files}
      STORAGE_S3_ACCESS_KEY_ID: ${MINIO_ROOT_USER:-minioadmin}
      STORAGE_S3_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin}
      STORAGE_S3_FORCE_PATH_STYLE: "true"
```

Add the volume declaration:

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
```

### .env.example Changes

Add the following section after the Redis configuration:

```bash
# MinIO Configuration (Docker containers)
# These control the MinIO container directly
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=raptscallions-files

# Storage Configuration (Application)
# When running app outside Docker (pnpm dev), use localhost:${MINIO_API_PORT}
# When running inside Docker (docker compose up), the API container uses minio:9000 automatically
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_REGION=us-east-1
STORAGE_S3_BUCKET=raptscallions-files
STORAGE_S3_ACCESS_KEY_ID=minioadmin
STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
STORAGE_S3_FORCE_PATH_STYLE=true
```

### README.md Changes

Add a new section "MinIO Object Storage" after the "Getting Started" section:

```markdown
## MinIO Object Storage

The development environment includes MinIO, an S3-compatible object storage service for testing file uploads locally.

### Accessing the MinIO Console

When running with Docker Compose, the MinIO web console is available at:

- **URL**: http://localhost:9001
- **Username**: minioadmin (or `MINIO_ROOT_USER` if set)
- **Password**: minioadmin (or `MINIO_ROOT_PASSWORD` if set)

The console allows you to:
- Browse uploaded files
- Create/delete buckets
- Manage access policies
- View storage metrics

### Storage Configuration

The API server connects to MinIO automatically when using Docker Compose. When running the app outside Docker (`pnpm dev`), ensure MinIO is running and update your `.env`:

```bash
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_BUCKET=raptscallions-files
```

See `.env.example` for all storage configuration options.
```

## Edge Cases

1. **Port conflicts**: Ports 9000 and 9001 may already be in use. The env vars `MINIO_API_PORT` and `MINIO_CONSOLE_PORT` allow developers to change ports. Documentation should mention this.

2. **Init container shows "exited"**: After running once, `minio-init` container shows as "Exited (0)" in `docker compose ps`. This is expected behavior - the container completed successfully.

3. **Credential mismatch**: If a developer changes `MINIO_ROOT_USER` or `MINIO_ROOT_PASSWORD` after initial setup, the existing MinIO data volume may have different credentials. Solution: `docker compose down -v` to reset volumes, or use MinIO console to update credentials.

4. **Volume data format**: MinIO stores data in a specific format. Switching MinIO versions might require clearing the volume: `docker volume rm raptscallions_minio_data`.

5. **Network isolation**: MinIO is only accessible within Docker network by service name (`minio`). Host access requires the exposed ports. This is the secure default.

6. **Environment variable precedence**: The `$${VAR}` syntax in the entrypoint escapes the `$` for shell expansion within the container (not docker-compose interpolation). This matches the migrate service pattern.

7. **Multiple developers**: Each developer's MinIO instance is isolated in their local Docker environment. No shared state concerns.

## Security Considerations

1. **Default credentials**: The default `minioadmin/minioadmin` credentials are only suitable for local development. Production deployments must use strong, unique credentials.

2. **No SSL/TLS**: Local development uses HTTP. Production S3/MinIO should use HTTPS.

3. **No user management**: Only root credentials are configured. Production should use MinIO's user/policy system.

4. **Credentials in docker-compose.yml**: Environment variable defaults in docker-compose.yml are visible in version control. Actual credentials should be in `.env` (gitignored).

## Environment Variable Naming

Two sets of variables are used for clarity:

| Prefix | Purpose | Used by |
|--------|---------|---------|
| `MINIO_*` | Docker container configuration | MinIO container, minio-init container |
| `STORAGE_S3_*` | Application configuration | API server, storage package |

This separation allows:
- Docker internal communication: `minio:9000` (container name)
- Host access for debugging: `localhost:9000` (mapped port)
- Clear distinction between infrastructure and application config

The `STORAGE_S3_*` prefix aligns with the storage configuration system implemented in E05-T002b.

## Open Questions

*To be resolved during implementation or code review.*

### Q1: Should we pin the MinIO image version?

**Options:**
- A) Use `minio/minio:latest` and `minio/mc:latest` (current approach)
- B) Pin to specific version like `minio/minio:RELEASE.2024-01-01T00-00-00Z`

**Recommendation: Use `latest` for development.**

Rationale:
- Other development services (postgres, redis) use version tags (`16-alpine`, `7-alpine`)
- MinIO RELEASE tags are timestamp-based and awkward
- Development environments benefit from getting security updates
- Production deployments would use separate compose/k8s configs with pinned versions

Counter-argument: Pinned versions ensure reproducibility across developer machines.

---

### Q2: Should we add HTTPS configuration for MinIO?

**Recommendation: No, defer to production config.**

Rationale:
- This task is explicitly for local development (see task constraints)
- SSL adds complexity and requires certificate management
- All traffic is local (no network exposure)
- Production S3 (AWS, etc.) will use HTTPS by default

---

## Constraints Verification

| Constraint | How Addressed |
|------------|---------------|
| No secrets in docker-compose.yml | Uses env vars with defaults; actual secrets in `.env` |
| Health check must be MinIO-specific | Uses `mc ready local` command |
| Bucket auto-creation must be idempotent | Uses `mc mb --ignore-existing` flag |
| Must not conflict with existing ports | Uses configurable ports via env vars |

## Summary

This spec adds MinIO to the Docker Compose development environment following established patterns:

1. **Service pattern**: Matches postgres/redis configuration structure
2. **Init container pattern**: Matches migrate service for one-time initialization
3. **Environment variable pattern**: Uses defaults with override capability
4. **Documentation pattern**: Updates .env.example and README consistently

The implementation enables developers to test S3 storage locally without cloud credentials, with automatic bucket creation and persistent storage.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-16
**Verdict:** APPROVED

### Summary

The spec follows established Docker Compose patterns exactly, uses official MinIO tooling, and provides proper developer experience with automatic bucket creation. The init container pattern mirrors the existing `migrate` service, ensuring consistency.

### Checklist Results

| Area | Status | Notes |
|------|--------|-------|
| Architecture Fit | ✅ PASS | Follows established docker-compose patterns |
| Infrastructure Config | ✅ PASS | Proper health checks, volumes, dependencies |
| Environment Variables | ✅ PASS | Clear naming separation (MINIO_* vs STORAGE_S3_*) |
| Documentation | ✅ PASS | Updates to .env.example and README planned |
| Security | ✅ PASS | Development-only; appropriate security notes included |
| Dependencies | ✅ PASS | Uses official Docker Hub images |

### Detailed Findings

**Strengths:**

1. **Pattern Consistency** - The spec correctly mirrors existing patterns:
   - Service structure matches postgres/redis exactly
   - Init container pattern matches migrate service
   - Port configurability follows POSTGRES_PORT pattern
   - Volume declaration follows existing naming

2. **Official Tooling** - No custom scripts:
   - Uses `minio/minio:latest` for server
   - Uses `minio/mc:latest` for initialization
   - Uses `mc ready local` for health check (MinIO's recommended approach)

3. **Environment Variable Strategy** - Well thought out:
   - `MINIO_*` for Docker-level config (clear ownership)
   - `STORAGE_S3_*` for application config (aligns with E05-T002b)
   - Proper escaping (`$${VAR}`) for shell vs compose interpolation

4. **API Service Integration** - Correctly configured:
   - API depends on both `service_healthy` (MinIO ready) and `service_completed_successfully` (bucket created)
   - Storage env vars injected into API container

5. **Developer Experience** - Good consideration:
   - Configurable ports for conflict avoidance
   - Console access documented
   - Clear instructions for local development vs Docker

**Minor Notes (Non-Blocking):**

1. The spec correctly identifies that `minio-init` will show "Exited (0)" status - this matches `migrate` behavior and is expected.

2. Edge case about credential changes requiring volume reset is well documented.

### Open Questions Resolution

- **Q1 (Image versioning)**: Agree with using `latest` for development - matches the practical needs of dev environments while acknowledging production would differ.
- **Q2 (HTTPS)**: Agree with deferring - out of scope for local development task.

### Approved

The developer should proceed with implementation. This is a straightforward infrastructure task that follows all established patterns.
