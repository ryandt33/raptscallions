import { defineConfig, mergeConfig } from "vitest/config";
import rootConfig from "../../vitest.config.js";

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      name: "@raptscallions/api",
      include: ["src/__tests__/**/*.test.ts"],
    },
  })
);
