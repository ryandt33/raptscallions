# Analysis: E05-T003b

## Problem Statement

Add MinIO (S3-compatible object storage) to the Docker Compose development environment so developers can test S3 storage locally without cloud credentials. The setup should include automatic bucket creation, health checks, and proper documentation.

## Context

### Related Code

- `/docker-compose.yml:1-116` - Existing Docker Compose configuration with postgres and redis patterns
- `/.env.example:1-53` - Current environment variable documentation
- `/backlog/tasks/E05/_epic.md:143-157` - MinIO service example in epic notes
- `/packages/storage/src/config.ts` - Storage configuration system (E05-T002b)
- `/packages/storage/src/config-registry.ts` - Backend config schema registry

### Existing Patterns

**Docker Compose Service Pattern (from postgres/redis):**
```yaml
service-name:
  image: official-image:version-alpine
  container_name: raptscallions-{name}
  restart: unless-stopped
  environment:
    # Environment variables for service
  ports:
    - "${HOST_PORT:-default}:container_port"
  volumes:
    - {name}_data:/data/path
  healthcheck:
    test: ["CMD", "health-check-command"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: {Xs}
```

**Volume Declaration Pattern:**
```yaml
volumes:
  service_data:
    driver: local
```

### Constraints from Task

- AC1: MinIO service starts with `docker compose up`
- AC2: MinIO API accessible on port 9000
- AC3: MinIO web console accessible on port 9001
- AC4: Default bucket automatically created on first startup
- AC5: MinIO data persists across container restarts
- AC6: API service waits for MinIO health check before starting
- AC7: Environment variables documented in .env.example
- AC8: README includes MinIO console access instructions
- No secrets in docker-compose.yml (use .env)
- Health check must be MinIO-specific (not generic HTTP)
- Bucket auto-creation must be idempotent

### Environment Variable Naming Convention

From E05 epic and existing storage config (packages/storage):
```bash
# Storage backend selection
STORAGE_BACKEND=s3

# S3-specific configuration (from config-registry.ts)
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_REGION=us-east-1
STORAGE_S3_BUCKET=raptscallions-files
STORAGE_S3_ACCESS_KEY_ID=minioadmin
STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
STORAGE_S3_FORCE_PATH_STYLE=true
```

Note: The existing storage config uses `STORAGE_S3_*` prefix, not bare `S3_*` as shown in epic notes. We should align with the implemented config system.

## Proposed Approaches

### Approach A: MinIO with Init Container for Bucket Creation (Recommended)

**Summary:** Add MinIO service with a separate init container that creates the default bucket using the MinIO Client (mc) CLI. The init container runs once, creates the bucket idempotently, then exits.

**How it works:**
1. MinIO server starts as main service with persistent volume
2. `minio-init` container waits for MinIO health check, then runs `mc` commands to create bucket
3. The `mc mb --ignore-existing` flag ensures idempotent bucket creation
4. API service depends on both MinIO health and init container completion

**Docker Compose additions:**
```yaml
# MinIO Object Storage (S3-compatible)
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

# MinIO bucket initialization (runs once)
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
    echo 'Bucket created or already exists';
    "
  restart: "no"
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Idempotent bucket creation (`--ignore-existing`) | Two containers for MinIO setup |
| Clear separation of concerns | Slightly more complex compose file |
| Follows existing `migrate` container pattern | Init container stays in "exited" state |
| Official MinIO images for both server and client | |
| `mc ready local` is official health check method | |

**Risks:**
- `mc ready local` requires MinIO 2023+ images - verified this is the recommended approach in MinIO docs
- Init container will show as "exited" in `docker compose ps` (expected behavior)

### Approach B: MinIO with Entrypoint Script for Bucket Creation

**Summary:** Create a custom entrypoint script that starts MinIO server and creates the bucket in the background using the MinIO SDK or mc installed in the image.

**How it works:**
1. Mount a custom entrypoint script via volumes
2. Script starts MinIO, waits for it to be ready, creates bucket, then continues
3. All in single container

**File structure additions:**
```
scripts/
└── minio-entrypoint.sh
```

**entrypoint script:**
```bash
#!/bin/sh
# Start MinIO in background
minio server /data --console-address ":9001" &
MINIO_PID=$!

# Wait for MinIO to be ready
until mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; do
  sleep 1
done

# Create bucket
mc mb --ignore-existing local/$MINIO_BUCKET

# Bring MinIO back to foreground
wait $MINIO_PID
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Single container | Custom script to maintain |
| Cleaner `docker compose ps` output | `mc` must be in server image (not always available) |
| All initialization in one place | More complex entrypoint logic |
| | Signal handling requires careful PID management |
| | Harder to debug if something goes wrong |

**Risks:**
- MinIO server image may not include `mc` CLI (requires `minio/minio:latest` not `minio/minio:RELEASE.*`)
- Signal propagation and graceful shutdown more complex with background process

### Approach C: MinIO with Docker API for Post-Start Hook

**Summary:** Use MinIO alone and rely on application code to create bucket on first connection, with a development seed script alternative.

**How it works:**
1. MinIO starts as simple service without bucket pre-creation
2. S3 backend (E05-T003a) creates bucket if not exists on first operation
3. Alternatively, provide a `pnpm db:seed:storage` script that creates bucket

**Docker Compose additions (minimal):**
```yaml
minio:
  image: minio/minio:latest
  container_name: raptscallions-minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

**Trade-offs:**

| Pros | Cons |
|------|------|
| Simplest Docker Compose | Bucket creation deferred to code/manual step |
| No extra containers | Doesn't satisfy AC4 (automatic bucket creation) |
| Standard curl health check | First upload requires bucket to exist |
| | More DX friction for new developers |

**Risks:**
- Does not satisfy AC4 - "Default bucket is automatically created on first startup"
- Requires application code changes in E05-T003a or manual bucket creation
- New developers need extra setup step

## Acceptance Criteria Mapping

| AC | Approach A | Approach B | Approach C |
|----|------------|------------|------------|
| AC1: MinIO starts with docker compose up | Yes | Yes | Yes |
| AC2: API on port 9000 | Yes | Yes | Yes |
| AC3: Console on port 9001 | Yes | Yes | Yes |
| AC4: Auto bucket creation | Yes (init container) | Yes (entrypoint) | No (manual/code) |
| AC5: Data persistence | Yes (volume) | Yes (volume) | Yes (volume) |
| AC6: API depends on MinIO health | Yes | Yes | Yes |
| AC7: Env vars documented | Yes | Yes | Yes |
| AC8: README instructions | Yes | Yes | Yes |

## Edge Cases

- **Port conflicts**: Ports 9000/9001 may be in use. Solution: Make ports configurable via env vars
- **Multiple developers**: Each developer's MinIO is isolated in their Docker environment
- **Data migration**: Volume data persists format changes; clearing `minio_data` volume resets storage
- **Credential changes**: If credentials change, existing volume may have different auth
- **Network isolation**: MinIO accessible only within Docker network by default (secure), host ports for debugging

## Analyst Recommendation

**Approach A (MinIO with Init Container)** is recommended:

1. **Follows existing patterns**: The `migrate` service already demonstrates the "run once then exit" init container pattern with `service_completed_successfully` condition

2. **Satisfies all ACs**: Automatic bucket creation via init container meets AC4 exactly as specified

3. **Official tooling**: Uses official `minio/minio` and `minio/mc` images - no custom scripts to maintain

4. **Idempotent by design**: The `mc mb --ignore-existing` flag ensures safe repeated runs

5. **Clear health check**: `mc ready local` is MinIO's recommended health check method

6. **Separation of concerns**: Server and initialization are separate, making debugging easier

**Implementation details:**

1. **MinIO health check**: Use `mc ready local` which is purpose-built for container health checks

2. **Environment variables**: Align with existing storage config using `STORAGE_S3_*` prefix in .env.example, but use simpler `MINIO_*` for Docker-internal credentials

3. **Port configurability**: Use `${MINIO_API_PORT:-9000}` pattern matching existing `${POSTGRES_PORT:-5432}`

4. **Volume naming**: Use `minio_data` following `postgres_data` and `redis_data` pattern

5. **API service dependency**: Add MinIO to API service's depends_on with health condition

**Complexity estimate**: Low - follows established patterns, uses official images, minimal new code.

**Files to modify:**
- `docker-compose.yml` - Add minio and minio-init services
- `.env.example` - Document MINIO_* and STORAGE_S3_* variables
- `README.md` - Add MinIO console access instructions
