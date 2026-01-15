import {
  storageConfig,
  resetStorageConfig,
  resetConfigRegistry,
  registerBuiltInConfigs,
  registerBackendConfig,
  getBackendConfig,
} from "./packages/storage/dist/index.js";
import { z } from "zod";

console.log("=== Integration Test: GCS, Aliyun, Custom Backend & Custom Settings ===\n");

// Test 8: GCS backend
console.log("Test 8: GCS backend validation");
try {
  resetStorageConfig();
  resetConfigRegistry();
  registerBuiltInConfigs();
  
  process.env.STORAGE_BACKEND = "gcs";
  process.env.STORAGE_GCS_PROJECT_ID = "my-gcp-project";
  process.env.STORAGE_GCS_BUCKET = "my-bucket";
  
  const backend = storageConfig.STORAGE_BACKEND;
  const backendConfig = getBackendConfig();
  
  console.log("  STORAGE_BACKEND:", backend);
  console.log("  Backend config:", JSON.stringify(backendConfig));
  
  if (backendConfig.STORAGE_GCS_PROJECT_ID !== "my-gcp-project") {
    throw new Error("Expected my-gcp-project");
  }
  console.log("  ✅ PASS: GCS config validated correctly\n");
} catch (e) {
  console.log("  ❌ FAIL:", e.message, e.stack);
  process.exit(1);
}

delete process.env.STORAGE_BACKEND;
delete process.env.STORAGE_GCS_PROJECT_ID;
delete process.env.STORAGE_GCS_BUCKET;

// Test 9: Aliyun backend
console.log("Test 9: Aliyun backend validation");
try {
  resetStorageConfig();
  
  process.env.STORAGE_BACKEND = "aliyun";
  process.env.STORAGE_ALIYUN_REGION = "cn-hangzhou";
  process.env.STORAGE_ALIYUN_BUCKET = "aliyun-bucket";
  process.env.STORAGE_ALIYUN_ACCESS_KEY_ID = "aliyun-key-id";
  process.env.STORAGE_ALIYUN_SECRET_ACCESS_KEY = "aliyun-secret";
  
  const backend = storageConfig.STORAGE_BACKEND;
  const backendConfig = getBackendConfig();
  
  console.log("  STORAGE_BACKEND:", backend);
  console.log("  Backend config:", JSON.stringify(backendConfig));
  
  if (backendConfig.STORAGE_ALIYUN_REGION !== "cn-hangzhou") {
    throw new Error("Expected cn-hangzhou");
  }
  console.log("  ✅ PASS: Aliyun config validated correctly\n");
} catch (e) {
  console.log("  ❌ FAIL:", e.message);
  process.exit(1);
}

delete process.env.STORAGE_BACKEND;
delete process.env.STORAGE_ALIYUN_REGION;
delete process.env.STORAGE_ALIYUN_BUCKET;
delete process.env.STORAGE_ALIYUN_ACCESS_KEY_ID;
delete process.env.STORAGE_ALIYUN_SECRET_ACCESS_KEY;

// Test 10: Custom common settings
console.log("Test 10: Custom common settings");
try {
  resetStorageConfig();
  
  process.env.STORAGE_BACKEND = "local";
  process.env.STORAGE_MAX_FILE_SIZE_BYTES = "52428800";
  process.env.STORAGE_QUOTA_BYTES = "5368709120";
  process.env.STORAGE_SIGNED_URL_EXPIRATION_SECONDS = "3600";
  
  const maxFileSize = storageConfig.STORAGE_MAX_FILE_SIZE_BYTES;
  const quota = storageConfig.STORAGE_QUOTA_BYTES;
  const signedUrlExp = storageConfig.STORAGE_SIGNED_URL_EXPIRATION_SECONDS;
  
  console.log("  STORAGE_MAX_FILE_SIZE_BYTES:", maxFileSize);
  console.log("  STORAGE_QUOTA_BYTES:", quota);
  console.log("  STORAGE_SIGNED_URL_EXPIRATION_SECONDS:", signedUrlExp);
  
  if (maxFileSize !== 52428800) throw new Error("Expected 50MB");
  if (quota !== 5368709120) throw new Error("Expected 5GB");
  if (signedUrlExp !== 3600) throw new Error("Expected 1 hour");
  console.log("  ✅ PASS: Custom settings applied correctly\n");
} catch (e) {
  console.log("  ❌ FAIL:", e.message);
  process.exit(1);
}

delete process.env.STORAGE_BACKEND;
delete process.env.STORAGE_MAX_FILE_SIZE_BYTES;
delete process.env.STORAGE_QUOTA_BYTES;
delete process.env.STORAGE_SIGNED_URL_EXPIRATION_SECONDS;

// Test 11: Custom backend registration (AC7)
console.log("Test 11: Custom backend registration (extensibility)");
try {
  resetStorageConfig();
  resetConfigRegistry();
  registerBuiltInConfigs();
  
  const customBackendSchema = z.object({
    STORAGE_CUSTOM_ENDPOINT: z.string().url(),
    STORAGE_CUSTOM_API_KEY: z.string().min(1),
  });
  
  registerBackendConfig("custom-backend", customBackendSchema);
  
  process.env.STORAGE_BACKEND = "custom-backend";
  process.env.STORAGE_CUSTOM_ENDPOINT = "https://custom-storage.example.com";
  process.env.STORAGE_CUSTOM_API_KEY = "custom-api-key-123";
  
  const backend = storageConfig.STORAGE_BACKEND;
  const backendConfig = getBackendConfig();
  
  console.log("  STORAGE_BACKEND:", backend);
  console.log("  Backend config:", JSON.stringify(backendConfig));
  
  if (backend !== "custom-backend") throw new Error("Expected custom-backend");
  if (backendConfig.STORAGE_CUSTOM_ENDPOINT !== "https://custom-storage.example.com") {
    throw new Error("Expected custom endpoint");
  }
  console.log("  ✅ PASS: Custom backend config registered and validated\n");
} catch (e) {
  console.log("  ❌ FAIL:", e.message, e.stack);
  process.exit(1);
}

delete process.env.STORAGE_BACKEND;
delete process.env.STORAGE_CUSTOM_ENDPOINT;
delete process.env.STORAGE_CUSTOM_API_KEY;

console.log("=== All Backend & Custom Settings Tests Passed ===");
