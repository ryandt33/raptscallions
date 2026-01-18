---
title: Production S3 Setup
description: Complete guide to configuring S3 storage for production deployment
related_code:
  - scripts/validate-s3.ts
  - packages/storage/src/backends/s3.backend.ts
  - .env.example
implements_task: E05-T003d
last_verified: 2026-01-18
---

# Production S3 Setup

This guide covers configuring S3-compatible storage for production deployments, including provider selection, credential configuration, CORS, lifecycle policies, and validation.

## Overview

RaptScallions uses S3-compatible storage for file uploads (user content, attachments, exports). While MinIO provides local development storage, production deployments require a cloud S3 provider.

The `@raptscallions/storage` package supports any S3-compatible service:

- **AWS S3** — The original, most compatible
- **DigitalOcean Spaces** — Simple pricing, good performance
- **Backblaze B2** — Lowest cost storage
- **Cloudflare R2** — Zero egress fees

## Provider Comparison

| Provider | Storage Cost | Egress Cost | Free Tier | S3 Compatibility |
|----------|-------------|-------------|-----------|------------------|
| **AWS S3** | $0.023/GB/month | $0.09/GB | 5GB for 12 months | Native |
| **DigitalOcean Spaces** | $5/month for 250GB | $0.01/GB | None | Excellent |
| **Backblaze B2** | $0.006/GB/month | $0.01/GB (or free via Cloudflare) | 10GB | Good |
| **Cloudflare R2** | $0.015/GB/month | **FREE** | 10GB | Good |

### Recommendations

- **Budget-conscious**: Backblaze B2 + Cloudflare CDN (free egress)
- **Simplicity**: DigitalOcean Spaces (flat $5/month)
- **Zero egress**: Cloudflare R2 (no bandwidth charges)
- **Enterprise/compliance**: AWS S3 (most features, integrations)

## Provider-Specific Setup

### AWS S3

**1. Create S3 Bucket**

```bash
# Via AWS CLI
aws s3 mb s3://raptscallions-prod --region us-east-1

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket raptscallions-prod \
  --versioning-configuration Status=Enabled
```

Or via AWS Console:
1. Go to S3 → Create bucket
2. Choose region close to your servers
3. Block public access (files served via signed URLs)
4. Enable versioning for safety

**2. Create IAM User**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::raptscallions-prod",
        "arn:aws:s3:::raptscallions-prod/*"
      ]
    }
  ]
}
```

**3. Configure Environment**

```bash
# .env
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=raptscallions-prod
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Note: No STORAGE_S3_ENDPOINT needed for AWS S3
```

::: tip Virtual-Hosted URLs
AWS S3 uses virtual-hosted style URLs (`bucket.s3.region.amazonaws.com`). The S3 backend automatically uses this when no custom endpoint is set.
:::

---

### DigitalOcean Spaces

**1. Create Space**

1. Go to DigitalOcean → Spaces → Create Space
2. Choose datacenter region (nyc3, sfo3, etc.)
3. Name your Space (e.g., `raptscallions-prod`)
4. Set permissions to "Restrict File Listing"

**2. Generate API Keys**

1. Go to API → Spaces access keys
2. Generate new key
3. Save both key and secret

**3. Configure Environment**

```bash
# .env
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
STORAGE_S3_BUCKET=raptscallions-prod
STORAGE_S3_REGION=nyc3
STORAGE_S3_ACCESS_KEY_ID=DO00EXAMPLE1234567890
STORAGE_S3_SECRET_ACCESS_KEY=abcdefghijklmnop1234567890ExampleKey
```

::: warning Region Matching
The region in `STORAGE_S3_REGION` must match the datacenter in your endpoint URL (e.g., `nyc3` in both).
:::

---

### Backblaze B2

**1. Create Bucket**

1. Go to Backblaze B2 → Buckets → Create a Bucket
2. Set "Files in Bucket are" to Private
3. Enable Object Lock (optional, for compliance)

**2. Create Application Key**

1. Go to App Keys → Add a New Application Key
2. Allow access to your bucket only
3. Enable all capabilities: `listBuckets`, `listFiles`, `readFiles`, `writeFiles`, `deleteFiles`
4. Save the keyID and applicationKey

**3. Find S3-Compatible Endpoint**

B2 provides S3-compatible endpoints per region:
- `s3.us-west-000.backblazeb2.com`
- `s3.us-west-004.backblazeb2.com`
- `s3.eu-central-003.backblazeb2.com`

Your bucket's endpoint is shown in Bucket Details.

**4. Configure Environment**

```bash
# .env
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
STORAGE_S3_BUCKET=raptscallions-prod
STORAGE_S3_REGION=us-west-004
STORAGE_S3_ACCESS_KEY_ID=00abcdef1234567890000000a
STORAGE_S3_SECRET_ACCESS_KEY=K000AbCdEfGhIjKlMnOpQrStUvWxYz
```

---

### Cloudflare R2

**1. Create R2 Bucket**

1. Go to Cloudflare Dashboard → R2 → Create bucket
2. Choose a name (e.g., `raptscallions-prod`)
3. Choose location hint closest to your servers

**2. Generate API Token**

1. Go to R2 → Manage R2 API Tokens
2. Create token with:
   - Object Read & Write permissions
   - Apply to specific bucket

**3. Find Account ID**

Your account ID is shown in the Cloudflare dashboard URL and R2 settings.

**4. Configure Environment**

```bash
# .env
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=https://1234567890abcdef1234567890abcdef.r2.cloudflarestorage.com
STORAGE_S3_BUCKET=raptscallions-prod
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef
STORAGE_S3_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef1234567890
```

::: tip Auto Region
Cloudflare R2 uses `auto` for the region. The R2 endpoint includes your account ID.
:::

## CORS Configuration

CORS (Cross-Origin Resource Sharing) is required for:
- Browser-based direct uploads using signed PUT URLs
- Downloading files via signed URLs from a different origin

### AWS S3 CORS Policy

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply via AWS CLI:

```bash
aws s3api put-bucket-cors \
  --bucket raptscallions-prod \
  --cors-configuration file://cors.json
```

### DigitalOcean Spaces CORS

Configure in Space Settings → CORS Configurations:

- **Origin**: `https://yourdomain.com`
- **Allowed Methods**: GET, PUT, HEAD
- **Allowed Headers**: `*`
- **Max Age**: 3600

### Backblaze B2 CORS

Configure in Bucket Settings → CORS Rules:

```json
[
  {
    "corsRuleName": "raptscallions",
    "allowedOrigins": ["https://yourdomain.com"],
    "allowedOperations": ["s3_get", "s3_put", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

### Cloudflare R2 CORS

Configure in R2 → Bucket → Settings → CORS:

- **Allowed Origins**: `https://yourdomain.com`
- **Allowed Methods**: GET, PUT, HEAD
- **Allowed Headers**: `*`
- **Max Age**: 3600

::: warning Production Origins
Always specify exact origins in production. Never use `*` for AllowedOrigins in production as it allows any website to access your files.
:::

## Lifecycle Policies

Lifecycle policies automate cleanup of:
- Soft-deleted files (after retention period)
- Incomplete multipart uploads
- Old versions (if versioning enabled)

### AWS S3 Lifecycle

```json
{
  "Rules": [
    {
      "ID": "cleanup-soft-deleted",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "deleted/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "cleanup-incomplete-uploads",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

### DigitalOcean Spaces

DigitalOcean Spaces doesn't support lifecycle policies directly. Implement cleanup via:
1. Scheduled job that deletes files in `deleted/` prefix older than 30 days
2. Use `mc` (MinIO Client) for S3-compatible lifecycle management

### Backblaze B2

B2 supports lifecycle rules via bucket settings:
1. Go to Bucket → Lifecycle Settings
2. "Keep only the last version of the file" for cleanup
3. "Keep prior versions for this number of days: 30"

### Cloudflare R2

R2 supports lifecycle rules:
1. Go to R2 → Bucket → Settings → Object lifecycle rules
2. Add rule: Delete objects with prefix `deleted/` after 30 days

## Credential Rotation

Periodically rotate S3 credentials for security. This process ensures zero downtime.

### Rotation Procedure

1. **Create new credentials** in your provider's console
2. **Deploy with both credentials** - Update your deployment to use the new credentials
3. **Verify new credentials work** - Run `pnpm validate:s3`
4. **Remove old credentials** - After confirming, delete old credentials from provider

### AWS IAM Rotation

```bash
# Create new access key
aws iam create-access-key --user-name raptscallions-storage

# Update .env with new credentials
# Deploy and verify

# Delete old access key
aws iam delete-access-key \
  --user-name raptscallions-storage \
  --access-key-id OLD_ACCESS_KEY_ID
```

### Secrets Management

For production, use secrets management:

- **AWS**: Secrets Manager or Parameter Store
- **Kubernetes**: External Secrets Operator
- **Docker Swarm**: Docker secrets
- **Heroku**: Config vars

Never commit credentials to git. The `.env` file is gitignored.

## Validation

Validate your production S3 configuration before deployment.

### Running Validation

```bash
# Validate S3 credentials and operations
pnpm validate:s3
```

**Successful Output:**

```
╔══════════════════════════════════════════════════════════════════╗
║                S3 Production Validation Report                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Provider: AWS S3                                                 ║
║  Bucket:   raptscallions-prod                                     ║
║  Region:   us-east-1                                              ║
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

### What Validation Tests

1. **Configuration** — Required environment variables present
2. **Connectivity** — Network connectivity to S3 endpoint
3. **File upload** — Write permissions (PutObject)
4. **File download** — Read permissions (GetObject)
5. **Signed URL GET** — Pre-signed download URLs work
6. **Signed URL PUT** — Pre-signed upload URLs work
7. **File delete** — Delete permissions (DeleteObject)
8. **Cleanup verified** — Files actually deleted

### CI Integration

The validation script skips gracefully in CI when S3 isn't configured:

```yaml
# GitHub Actions example
- name: Validate S3 (if configured)
  run: pnpm validate:s3
  env:
    CI: true
    STORAGE_BACKEND: ${{ secrets.STORAGE_BACKEND || '' }}
    STORAGE_S3_BUCKET: ${{ secrets.STORAGE_S3_BUCKET || '' }}
    # ... other S3 vars
```

## Troubleshooting

### Connection Refused

```
❌ Connectivity FAILED
   Error: Storage service unavailable (ECONNREFUSED)
```

**Causes:**
- Endpoint URL is incorrect
- Firewall blocking outbound connections
- VPN required for private endpoints

**Fix:** Verify `STORAGE_S3_ENDPOINT` URL is correct and accessible.

### DNS Resolution Failed

```
❌ Connectivity FAILED
   Error: Storage service unavailable (ENOTFOUND)
```

**Causes:**
- Endpoint URL has a typo
- DNS not resolving (network issue)

**Fix:** Check spelling of endpoint URL. Test with `curl`.

### Authentication Failed

```
❌ Connectivity FAILED
   Error: Storage authentication failed
```

**Causes:**
- Access key ID is incorrect
- Secret access key is incorrect
- Credentials were revoked

**Fix:** Regenerate credentials in provider console. Check for whitespace.

### Bucket Not Found

```
❌ Connectivity FAILED
   Error: Storage operation failed: NoSuchBucket
```

**Causes:**
- Bucket name is wrong
- Bucket is in a different region
- Bucket doesn't exist

**Fix:** Verify bucket name and region. Create bucket if needed.

### Access Denied

```
❌ File upload FAILED
   Error: Storage operation failed: AccessDenied
```

**Causes:**
- IAM policy missing required permissions
- Bucket policy restricts access
- Wrong bucket configured

**Fix:** Check IAM policy includes `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`.

### CORS Errors (Browser)

If signed URLs work from the server but fail from browsers:

**Causes:**
- CORS not configured on bucket
- Wrong origin in CORS policy
- Missing methods in CORS policy

**Fix:** Configure CORS as described above. Use browser dev tools to see exact error.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_BACKEND` | Yes | `local` | Set to `s3` for S3 storage |
| `STORAGE_S3_BUCKET` | Yes | — | Bucket name |
| `STORAGE_S3_REGION` | Yes | — | AWS region or equivalent |
| `STORAGE_S3_ACCESS_KEY_ID` | Yes | — | Access key ID |
| `STORAGE_S3_SECRET_ACCESS_KEY` | Yes | — | Secret access key |
| `STORAGE_S3_ENDPOINT` | No | — | Custom endpoint (required for non-AWS) |
| `STORAGE_SIGNED_URL_EXPIRATION_SECONDS` | No | `900` | Default signed URL expiration |
| `STORAGE_MAX_FILE_SIZE_BYTES` | No | `10485760` | Max upload size (10MB) |
| `STORAGE_QUOTA_BYTES` | No | `1073741824` | Per-user quota (1GB) |

## Related Pages

- [S3-Compatible Backend](/storage/patterns/s3-backend) — Using the S3StorageBackend
- [Configuration](/storage/concepts/configuration) — Storage configuration system
- [Backend Interface](/storage/concepts/backend-interface) — The `IStorageBackend` contract

**Implementation:**
- [E05-T003d: Production S3 credentials and validation](/backlog/completed/E05/E05-T003d.md) ([spec](/backlog/docs/specs/E05/E05-T003d-spec.md))
- [E05-T003a: S3-compatible storage backend](/backlog/completed/E05/E05-T003a.md) ([spec](/backlog/docs/specs/E05/E05-T003a-spec.md))
- [E05-T003b: MinIO Docker Compose integration](/backlog/completed/E05/E05-T003b.md) ([spec](/backlog/docs/specs/E05/E05-T003b-spec.md))
- [E05-T003c: MinIO integration tests](/backlog/completed/E05/E05-T003c.md) ([spec](/backlog/docs/specs/E05/E05-T003c-spec.md))

**Source Files:**
- [validate-s3.ts](https://github.com/ryandt33/raptscallions/blob/main/scripts/validate-s3.ts) - S3 production validation script
- [s3.backend.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/backends/s3.backend.ts) - S3StorageBackend implementation
