#!/usr/bin/env tsx
/**
 * S3 Production Validation Script
 *
 * Tests S3-compatible storage credentials against real cloud storage.
 * Validates connectivity, upload/download, signed URLs, and cleanup.
 *
 * Usage:
 *   pnpm validate:s3
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 *   2 - Configuration missing (skip mode for CI)
 *
 * @example
 * ```bash
 * # Run validation
 * pnpm validate:s3
 *
 * # With verbose output
 * DEBUG=validate-s3 pnpm validate:s3
 * ```
 */

import "dotenv/config";
import type { Readable } from "node:stream";

// ANSI escape codes for terminal colors
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
} as const;

// Debug mode - enabled via DEBUG=validate-s3 or DEBUG=*
const DEBUG_ENABLED =
  process.env.DEBUG === "validate-s3" ||
  process.env.DEBUG === "*" ||
  process.env.DEBUG?.includes("validate-s3");

// Per-test timeout in milliseconds (30 seconds per spec)
const TEST_TIMEOUT_MS = 30_000;

// Validation test result
interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: string;
  hints?: string[];
}

// Overall validation summary
interface ValidationSummary {
  results: ValidationResult[];
  allPassed: boolean;
  totalDuration: number;
  provider: string;
  bucket: string;
  region: string;
}

// Environment variable names for S3 configuration
const REQUIRED_ENV_VARS = [
  "STORAGE_BACKEND",
  "STORAGE_S3_BUCKET",
  "STORAGE_S3_REGION",
  "STORAGE_S3_ACCESS_KEY_ID",
  "STORAGE_S3_SECRET_ACCESS_KEY",
] as const;

// Test file settings
const TEST_PREFIX = "validation-test";
const TEST_CONTENT = "RaptScallions S3 validation probe - safe to delete";

/**
 * Print colorized output to console.
 */
function log(message: string, color?: keyof typeof ANSI): void {
  if (color) {
    console.log(`${ANSI[color]}${message}${ANSI.reset}`);
  } else {
    console.log(message);
  }
}

/**
 * Print debug message if debug mode is enabled.
 */
function debug(message: string): void {
  if (DEBUG_ENABLED) {
    console.log(`${ANSI.dim}[DEBUG] ${message}${ANSI.reset}`);
  }
}

/**
 * Wrap a promise with a timeout.
 * @throws Error if the operation times out
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation "${operationName}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Validate a URL string format.
 * Returns an error message if invalid, or null if valid.
 */
function validateEndpointUrl(endpoint: string): string | null {
  // Empty is valid (means use AWS default)
  if (!endpoint) {
    return null;
  }

  try {
    const url = new URL(endpoint);

    // Must be http or https
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return `Invalid protocol "${url.protocol}" - must be http: or https:`;
    }

    // Must have a hostname
    if (!url.hostname) {
      return "Missing hostname in endpoint URL";
    }

    // Should not have a path (other than /)
    if (url.pathname && url.pathname !== "/") {
      return `Endpoint should not include a path (got "${url.pathname}")`;
    }

    // Should not have query params
    if (url.search) {
      return `Endpoint should not include query parameters (got "${url.search}")`;
    }

    return null;
  } catch {
    return `Invalid URL format: "${endpoint}"`;
  }
}

/**
 * Generate unique test key with timestamp.
 */
function generateTestKey(suffix: string): string {
  const timestamp = Date.now();
  return `${TEST_PREFIX}/${timestamp}-${suffix}`;
}

/**
 * Convert a readable stream to string.
 */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Map error messages to user-friendly hints.
 */
function getErrorHints(error: Error): string[] {
  const message = error.message.toLowerCase();
  const name = error.name;

  if (message.includes("econnrefused")) {
    return [
      "STORAGE_S3_ENDPOINT may be incorrect",
      "Network firewall may be blocking outbound connections",
      "VPN may be required for private endpoints",
    ];
  }

  if (message.includes("enotfound")) {
    return [
      "STORAGE_S3_ENDPOINT URL may have a typo",
      "DNS resolution failed - check network connectivity",
    ];
  }

  if (
    name === "InvalidAccessKeyId" ||
    message.includes("access key") ||
    message.includes("authentication")
  ) {
    return [
      "Check STORAGE_S3_ACCESS_KEY_ID is correct",
      "Verify the access key has not been revoked",
    ];
  }

  if (name === "SignatureDoesNotMatch" || message.includes("signature")) {
    return [
      "Check STORAGE_S3_SECRET_ACCESS_KEY is correct",
      "Ensure no extra whitespace in credentials",
    ];
  }

  if (message.includes("nosuchbucket") || message.includes("bucket")) {
    return [
      "Check STORAGE_S3_BUCKET name is correct",
      "Bucket may be in a different region",
      "Bucket may not exist yet - create it first",
    ];
  }

  if (message.includes("accessdenied") || message.includes("access denied")) {
    return [
      "IAM policy may be missing required permissions",
      "Bucket policy may be restricting access",
      "Check s3:PutObject, s3:GetObject, s3:DeleteObject permissions",
    ];
  }

  if (message.includes("cors")) {
    return [
      "CORS may not be configured on the bucket",
      "See production-s3-setup.md for CORS configuration",
    ];
  }

  return ["Check error message for details", "See production-s3-setup.md for troubleshooting"];
}

/**
 * Print the validation report header.
 */
function printHeader(provider: string, bucket: string, region: string): void {
  const border = "═".repeat(66);
  const topBorder = `╔${border}╗`;
  const bottomBorder = `╚${border}╝`;
  const separator = `╠${border}╣`;

  log(topBorder, "cyan");
  log(
    `║${ANSI.bold}                S3 Production Validation Report                  ${ANSI.reset}${ANSI.cyan}║`,
    "cyan"
  );
  log(separator, "cyan");
  log(`║  Provider: ${provider.padEnd(53)}║`, "cyan");
  log(`║  Bucket:   ${bucket.padEnd(53)}║`, "cyan");
  log(`║  Region:   ${region.padEnd(53)}║`, "cyan");
  log(bottomBorder, "cyan");
  console.log();
}

/**
 * Print a test result line.
 */
function printResult(result: ValidationResult): void {
  const icon = result.passed ? "✅" : "❌";
  const status = result.passed ? "PASSED" : "FAILED";
  const statusColor = result.passed ? ANSI.green : ANSI.red;
  const duration = `(${result.duration}ms)`;

  console.log(
    `  ${icon} ${result.name.padEnd(20)} ${statusColor}${status.padEnd(10)}${ANSI.reset}${ANSI.dim}${duration}${ANSI.reset}`
  );

  if (!result.passed && result.details) {
    console.log();
    log(`     Error: ${result.details}`, "red");
    console.log();
  }

  if (!result.passed && result.hints && result.hints.length > 0) {
    log("     Possible causes:", "yellow");
    for (const hint of result.hints) {
      log(`     • ${hint}`, "dim");
    }
    console.log();
  }
}

/**
 * Print the final summary.
 */
function printSummary(summary: ValidationSummary): void {
  const divider = "─".repeat(66);
  console.log(divider);

  const passed = summary.results.filter((r) => r.passed).length;
  const total = summary.results.length;

  if (summary.allPassed) {
    log(`  All ${total} tests passed in ${summary.totalDuration}ms`, "green");
    console.log();
    log("  ✓ S3 storage is ready for production!", "green");
  } else {
    const failed = total - passed;
    log(`  ${failed} of ${total} tests failed`, "red");
    console.log();
    log("  ✗ S3 storage validation failed. See errors above.", "red");
  }

  console.log();
}

/**
 * Test 1: Validate configuration - check all required env vars are present.
 */
function validateConfig(): ValidationResult {
  const start = Date.now();
  const missing: string[] = [];

  debug("Checking STORAGE_BACKEND value...");

  // Check STORAGE_BACKEND is s3
  if (process.env.STORAGE_BACKEND !== "s3") {
    return {
      name: "Configuration",
      passed: false,
      message: "STORAGE_BACKEND must be 's3'",
      duration: Date.now() - start,
      details: `STORAGE_BACKEND is '${process.env.STORAGE_BACKEND || "(not set)"}', expected 's3'`,
      hints: ["Set STORAGE_BACKEND=s3 in your .env file"],
    };
  }

  debug("Checking required environment variables...");

  // Check required vars
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    return {
      name: "Configuration",
      passed: false,
      message: "Missing required environment variables",
      duration: Date.now() - start,
      details: `Missing: ${missing.join(", ")}`,
      hints: ["Add the missing variables to your .env file", "See .env.example for templates"],
    };
  }

  // Validate endpoint URL format if provided
  const endpoint = process.env.STORAGE_S3_ENDPOINT;
  if (endpoint) {
    debug(`Validating endpoint URL: ${endpoint}`);
    const urlError = validateEndpointUrl(endpoint);
    if (urlError) {
      return {
        name: "Configuration",
        passed: false,
        message: "Invalid STORAGE_S3_ENDPOINT URL",
        duration: Date.now() - start,
        details: urlError,
        hints: [
          "Use format: https://hostname or https://hostname:port",
          "Do not include paths like /bucket-name",
          "See .env.example for provider-specific examples",
        ],
      };
    }
  }

  debug("Configuration validated successfully");

  return {
    name: "Configuration",
    passed: true,
    message: "All required environment variables present",
    duration: Date.now() - start,
  };
}

/**
 * Test 2: Test connectivity - attempt to check if a dummy key exists.
 */
async function testConnectivity(
  backend: import("@raptscallions/storage").IStorageBackend
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug("Testing connectivity with exists() call...");

    // Use exists() on a key that won't exist - this tests connectivity
    await withTimeout(
      backend.exists("__validation-probe__"),
      TEST_TIMEOUT_MS,
      "connectivity check"
    );

    debug("Connectivity test successful");

    return {
      name: "Connectivity",
      passed: true,
      message: "Successfully connected to S3 service",
      duration: Date.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "Connectivity",
      passed: false,
      message: "Failed to connect to S3 service",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 3: Test upload - upload a small test file.
 */
async function testUpload(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKey: string
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug(`Uploading test file to key: ${testKey}`);

    const result = await withTimeout(
      backend.upload({
        key: testKey,
        body: Buffer.from(TEST_CONTENT),
        contentType: "text/plain",
      }),
      TEST_TIMEOUT_MS,
      "file upload"
    );

    if (!result.key) {
      return {
        name: "File upload",
        passed: false,
        message: "Upload did not return key",
        duration: Date.now() - start,
      };
    }

    debug(`Upload successful, key: ${result.key}`);

    return {
      name: "File upload",
      passed: true,
      message: "Successfully uploaded test file",
      duration: Date.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "File upload",
      passed: false,
      message: "Failed to upload test file",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 4: Test download - download the test file and verify content.
 */
async function testDownload(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKey: string
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug(`Downloading test file from key: ${testKey}`);

    const stream = await withTimeout(backend.download(testKey), TEST_TIMEOUT_MS, "file download");
    const content = await streamToString(stream);

    debug(`Downloaded ${content.length} bytes`);

    if (content !== TEST_CONTENT) {
      return {
        name: "File download",
        passed: false,
        message: "Downloaded content does not match",
        duration: Date.now() - start,
        details: `Expected "${TEST_CONTENT}", got "${content}"`,
      };
    }

    return {
      name: "File download",
      passed: true,
      message: "Successfully downloaded and verified content",
      duration: Date.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "File download",
      passed: false,
      message: "Failed to download test file",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 5: Test signed URL GET - generate URL and fetch via HTTP.
 */
async function testSignedUrlGet(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKey: string
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug("Generating signed GET URL...");

    const signedUrl = await withTimeout(
      backend.getSignedUrl(testKey, { expiresIn: 60 }),
      TEST_TIMEOUT_MS,
      "signed URL generation"
    );

    debug(`Fetching content via signed URL...`);

    // Fetch the URL via HTTP with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
      const response = await fetch(signedUrl.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          name: "Signed URL (GET)",
          passed: false,
          message: `HTTP ${response.status} when fetching signed URL`,
          duration: Date.now() - start,
          details: `Status: ${response.status} ${response.statusText}`,
          hints: getErrorHints(new Error(`HTTP ${response.status}`)),
        };
      }

      const content = await response.text();

      debug(`Fetched ${content.length} bytes via signed URL`);

      if (content !== TEST_CONTENT) {
        return {
          name: "Signed URL (GET)",
          passed: false,
          message: "Content fetched via signed URL does not match",
          duration: Date.now() - start,
          details: `Expected "${TEST_CONTENT}", got "${content}"`,
        };
      }

      return {
        name: "Signed URL (GET)",
        passed: true,
        message: "Successfully fetched content via signed URL",
        duration: Date.now() - start,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "Signed URL (GET)",
      passed: false,
      message: "Failed to generate or use signed URL",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 6: Test signed URL PUT - generate PUT URL and upload via HTTP.
 */
async function testSignedUrlPut(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKey: string
): Promise<ValidationResult> {
  const start = Date.now();
  const putContent = "Signed URL PUT test content";

  try {
    debug("Generating signed PUT URL...");

    const signedUrl = await withTimeout(
      backend.getSignedUrl(testKey, {
        method: "PUT",
        contentType: "text/plain",
        expiresIn: 60,
      }),
      TEST_TIMEOUT_MS,
      "signed PUT URL generation"
    );

    debug("Uploading content via signed PUT URL...");

    // Upload via HTTP PUT with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
      const response = await fetch(signedUrl.url, {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
        },
        body: putContent,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          name: "Signed URL (PUT)",
          passed: false,
          message: `HTTP ${response.status} when uploading via signed URL`,
          duration: Date.now() - start,
          details: `Status: ${response.status} ${response.statusText}`,
          hints: getErrorHints(new Error(`HTTP ${response.status}`)),
        };
      }

      debug("Verifying uploaded content...");

      // Verify the content was uploaded correctly
      const stream = await withTimeout(
        backend.download(testKey),
        TEST_TIMEOUT_MS,
        "verification download"
      );
      const downloadedContent = await streamToString(stream);

      if (downloadedContent !== putContent) {
        return {
          name: "Signed URL (PUT)",
          passed: false,
          message: "Content uploaded via signed URL does not match",
          duration: Date.now() - start,
          details: `Expected "${putContent}", got "${downloadedContent}"`,
        };
      }

      debug("Signed PUT URL test successful");

      return {
        name: "Signed URL (PUT)",
        passed: true,
        message: "Successfully uploaded via signed URL",
        duration: Date.now() - start,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "Signed URL (PUT)",
      passed: false,
      message: "Failed to generate or use signed PUT URL",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 7: Test delete - delete the test files.
 */
async function testDelete(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKeys: string[]
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug(`Deleting ${testKeys.length} test files...`);

    for (const key of testKeys) {
      debug(`Deleting key: ${key}`);
      await withTimeout(backend.delete(key), TEST_TIMEOUT_MS, `delete ${key}`);
    }

    debug("All test files deleted");

    return {
      name: "File delete",
      passed: true,
      message: "Successfully deleted test files",
      duration: Date.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "File delete",
      passed: false,
      message: "Failed to delete test files",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Test 8: Verify cleanup - confirm files no longer exist.
 */
async function verifyCleanup(
  backend: import("@raptscallions/storage").IStorageBackend,
  testKeys: string[]
): Promise<ValidationResult> {
  const start = Date.now();

  try {
    debug(`Verifying cleanup of ${testKeys.length} test files...`);

    for (const key of testKeys) {
      debug(`Checking if key exists: ${key}`);
      const exists = await withTimeout(backend.exists(key), TEST_TIMEOUT_MS, `exists check ${key}`);
      if (exists) {
        return {
          name: "Cleanup verified",
          passed: false,
          message: "Test file still exists after deletion",
          duration: Date.now() - start,
          details: `Key "${key}" was not deleted`,
        };
      }
    }

    debug("Cleanup verification complete - all files removed");

    return {
      name: "Cleanup verified",
      passed: true,
      message: "All test files successfully cleaned up",
      duration: Date.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      name: "Cleanup verified",
      passed: false,
      message: "Failed to verify cleanup",
      duration: Date.now() - start,
      details: err.message,
      hints: getErrorHints(err),
    };
  }
}

/**
 * Cleanup test files (best-effort, called in finally block).
 */
async function cleanupTestFiles(
  backend: import("@raptscallions/storage").IStorageBackend | null,
  testKeys: string[]
): Promise<void> {
  if (!backend) return;

  for (const key of testKeys) {
    try {
      await backend.delete(key);
    } catch {
      // Ignore cleanup errors - best effort
    }
  }
}

/**
 * Determine provider name from endpoint.
 */
function getProviderName(): string {
  const endpoint = process.env.STORAGE_S3_ENDPOINT;

  if (!endpoint) {
    return "AWS S3";
  }

  if (endpoint.includes("digitaloceanspaces.com")) {
    return "DigitalOcean Spaces";
  }

  if (endpoint.includes("backblazeb2.com")) {
    return "Backblaze B2";
  }

  if (endpoint.includes("r2.cloudflarestorage.com")) {
    return "Cloudflare R2";
  }

  if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
    return "MinIO (local)";
  }

  return `S3-compatible (${new URL(endpoint).hostname})`;
}

/**
 * Main validation function.
 */
async function runValidation(): Promise<void> {
  const results: ValidationResult[] = [];
  const testKeys: string[] = [];
  let backend: import("@raptscallions/storage").IStorageBackend | null = null;
  const startTime = Date.now();

  try {
    // Test 1: Configuration
    const configResult = validateConfig();
    results.push(configResult);

    if (!configResult.passed) {
      // Skip remaining tests if config is invalid
      printHeader(
        getProviderName(),
        process.env.STORAGE_S3_BUCKET || "(not set)",
        process.env.STORAGE_S3_REGION || "(not set)"
      );

      for (const result of results) {
        printResult(result);
      }

      printSummary({
        results,
        allPassed: false,
        totalDuration: Date.now() - startTime,
        provider: getProviderName(),
        bucket: process.env.STORAGE_S3_BUCKET || "(not set)",
        region: process.env.STORAGE_S3_REGION || "(not set)",
      });

      process.exit(1);
    }

    // Import storage module and create backend
    const { createS3Backend, registerBuiltInConfigs } = await import("@raptscallions/storage");
    registerBuiltInConfigs();
    backend = createS3Backend();

    const provider = getProviderName();
    const bucket = process.env.STORAGE_S3_BUCKET!;
    const region = process.env.STORAGE_S3_REGION!;

    // Print header
    printHeader(provider, bucket, region);

    // Print config result
    printResult(configResult);

    // Test 2: Connectivity
    const connectResult = await testConnectivity(backend);
    results.push(connectResult);
    printResult(connectResult);

    if (!connectResult.passed) {
      // Skip remaining tests if connectivity fails
      printSummary({
        results,
        allPassed: false,
        totalDuration: Date.now() - startTime,
        provider,
        bucket,
        region,
      });
      process.exit(1);
    }

    // Generate test keys
    const uploadTestKey = generateTestKey("probe.txt");
    const signedPutTestKey = generateTestKey("signed-put.txt");
    testKeys.push(uploadTestKey, signedPutTestKey);

    // Test 3: Upload
    const uploadResult = await testUpload(backend, uploadTestKey);
    results.push(uploadResult);
    printResult(uploadResult);

    if (uploadResult.passed) {
      // Test 4: Download
      const downloadResult = await testDownload(backend, uploadTestKey);
      results.push(downloadResult);
      printResult(downloadResult);

      // Test 5: Signed URL GET
      const signedGetResult = await testSignedUrlGet(backend, uploadTestKey);
      results.push(signedGetResult);
      printResult(signedGetResult);
    }

    // Test 6: Signed URL PUT
    const signedPutResult = await testSignedUrlPut(backend, signedPutTestKey);
    results.push(signedPutResult);
    printResult(signedPutResult);

    // Test 7: Delete
    const deleteResult = await testDelete(backend, testKeys);
    results.push(deleteResult);
    printResult(deleteResult);

    // Test 8: Verify cleanup
    const cleanupResult = await verifyCleanup(backend, testKeys);
    results.push(cleanupResult);
    printResult(cleanupResult);

    // Print summary
    const allPassed = results.every((r) => r.passed);
    printSummary({
      results,
      allPassed,
      totalDuration: Date.now() - startTime,
      provider,
      bucket,
      region,
    });

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    // Unexpected error
    console.error();
    log("Unexpected error during validation:", "red");
    console.error(error);
    process.exit(1);
  } finally {
    // Best-effort cleanup
    await cleanupTestFiles(backend, testKeys);
  }
}

/**
 * Check if S3 storage is configured (for CI skip mode).
 */
function isS3Configured(): boolean {
  return (
    process.env.STORAGE_BACKEND === "s3" &&
    !!process.env.STORAGE_S3_BUCKET &&
    !!process.env.STORAGE_S3_REGION &&
    !!process.env.STORAGE_S3_ACCESS_KEY_ID &&
    !!process.env.STORAGE_S3_SECRET_ACCESS_KEY
  );
}

// Entry point
async function main(): Promise<void> {
  console.log();

  if (DEBUG_ENABLED) {
    log("🔍 Debug mode enabled (DEBUG=validate-s3)", "dim");
    log(`   Timeout per test: ${TEST_TIMEOUT_MS}ms`, "dim");
    console.log();
  }

  // In CI mode, skip gracefully if S3 not configured
  if (process.env.CI && !isS3Configured()) {
    log("⚠️  S3 storage not configured - skipping validation in CI mode", "yellow");
    log("   Set STORAGE_BACKEND=s3 and S3 credentials to enable validation", "dim");
    console.log();
    process.exit(0);
  }

  await runValidation();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
