import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/db',
  'packages/modules',
  'packages/telemetry',
  'packages/ai',
  'packages/auth',
  // Apps:
  'apps/api',
  // Future apps:
  // 'apps/worker',
  // 'apps/web',
  // Scripts:
  'scripts',
]);
