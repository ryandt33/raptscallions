# RaptScallions Module System Implementation Specification

**Version:** 1.0.0  
**Status:** Implementation Specification  
**Architecture:** Worker Threads with Hot Reload

---

## Table of Contents

1. [Overview](#1-overview)
2. [Module Structure](#2-module-structure)
3. [Module SDK](#3-module-sdk)
4. [Module Supervisor](#4-module-supervisor)
5. [Hook Execution Engine](#5-hook-execution-engine)
6. [Database Access Layer](#6-database-access-layer)
7. [Module Configuration UI](#7-module-configuration-ui)
8. [Built-in Modules](#8-built-in-modules)
9. [Testing & Debugging](#9-testing--debugging)
10. [Deployment Guide](#10-deployment-guide)

---

## 1. Overview

### Design Principles

| Principle              | Implementation                                                  |
| ---------------------- | --------------------------------------------------------------- |
| **Vibe-code friendly** | Single `defineModule()` pattern, TypeScript, clear examples     |
| **No server restarts** | File watcher triggers hot reload via worker termination/respawn |
| **Isolation**          | Each module runs in separate Worker Thread                      |
| **Fail independently** | Supervisor catches crashes, restarts with backoff               |
| **Simple deployment**  | Drop folder in `/modules`, automatic discovery                  |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MAIN PROCESS                                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      MODULE SUPERVISOR                              │ │
│  │                                                                     │ │
│  │  • File Watcher (chokidar) ──► Detects module changes              │ │
│  │  • Worker Pool Manager ──► Spawns/kills worker threads             │ │
│  │  • Health Monitor ──► Tracks status, restarts crashed modules      │ │
│  │  • Config Manager ──► Loads/validates module.yaml                  │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│           │                │                │                │          │
│           │ Worker Thread  │ Worker Thread  │ Worker Thread  │          │
│           ▼                ▼                ▼                ▼          │
│     ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│     │  Module  │    │  Module  │    │  Module  │    │  Module  │      │
│     │ Worker 1 │    │ Worker 2 │    │ Worker 3 │    │ Worker N │      │
│     │──────────│    │──────────│    │──────────│    │──────────│      │
│     │pii-filter│    │ struggle │    │  safety  │    │  custom  │      │
│     │          │    │ detector │    │  filter  │    │          │      │
│     └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│           │                │                │                │          │
│           └────────────────┴────────────────┴────────────────┘          │
│                                    │                                     │
│                    ┌───────────────▼───────────────┐                    │
│                    │       MESSAGE BRIDGE          │                    │
│                    │  • Serializes HookContext     │                    │
│                    │  • Routes to relevant workers │                    │
│                    │  • Collects/merges results    │                    │
│                    │  • Handles timeouts           │                    │
│                    └───────────────────────────────┘                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/
├── modules/
│   ├── src/
│   │   ├── index.ts                 # Public exports
│   │   ├── supervisor.ts            # Module supervisor
│   │   ├── worker-host.ts           # Worker thread entry point
│   │   ├── message-bridge.ts        # IPC message handling
│   │   ├── hook-executor.ts         # Hook execution orchestration
│   │   ├── config-loader.ts         # module.yaml parser
│   │   ├── health-monitor.ts        # Health checks & restart logic
│   │   └── types.ts                 # Shared types
│   ├── package.json
│   └── tsconfig.json
├── module-sdk/
│   ├── src/
│   │   ├── index.ts                 # defineModule, types
│   │   ├── context.ts               # HookContext helpers
│   │   ├── database.ts              # Sandboxed DB access
│   │   ├── events.ts                # Event emitting
│   │   └── testing.ts               # Test utilities
│   ├── package.json
│   └── tsconfig.json
└── module-ui/
    ├── src/
    │   ├── components/
    │   │   ├── ModuleList.tsx
    │   │   ├── ModuleCard.tsx
    │   │   ├── ModuleConfig.tsx
    │   │   └── ModuleLogs.tsx
    │   └── hooks/
    │       └── useModules.ts
    └── package.json

modules/                              # Runtime module directory
├── pii-filter/
│   ├── module.yaml
│   └── index.ts
├── struggle-detector/
│   ├── module.yaml
│   └── index.ts
└── my-custom-module/                 # User drops folder here
    ├── module.yaml
    └── index.ts
```

---

## 2. Module Structure

### File Layout

Every module is a folder containing at minimum:

```
my-module/
├── module.yaml          # Required: metadata, hooks, config schema
├── index.ts             # Required: module implementation
├── README.md            # Optional: documentation
└── test.ts              # Optional: tests
```

### module.yaml Specification

```yaml
# module.yaml - Complete specification

# ─────────────────────────────────────────────────────────────────────
# REQUIRED FIELDS
# ─────────────────────────────────────────────────────────────────────

name: my-module # Unique identifier (lowercase, hyphens)
version: 1.0.0 # Semver version
description: What this module does # Brief description

# Which hooks this module handles
hooks:
  - chat:before_ai # Before AI call (can modify/block)
  - chat:after_ai # After AI response (can modify)
  - chat:on_message # Any message (async, observing)
  - session:start # Session created
  - session:end # Session completed
  - product:before_ai # Product tool before AI
  - product:after_ai # Product tool after AI
  - run:complete # Product run finished

# ─────────────────────────────────────────────────────────────────────
# OPTIONAL FIELDS
# ─────────────────────────────────────────────────────────────────────

# Display information
displayName: My Awesome Module # Human-readable name
author: Your Name
license: MIT
repository: https://github.com/...
icon: shield # Lucide icon name

# Hook priorities (lower = runs first, default = 50)
priorities:
  chat:before_ai: 10 # Run early (e.g., safety filters)
  chat:after_ai: 90 # Run late (e.g., logging)

# Blocking behavior (default = true for before/after, false for others)
blocking:
  chat:before_ai: true # Must complete before continuing
  chat:on_message: false # Fire and forget

# Timeout per hook in milliseconds (default = 5000)
timeouts:
  chat:before_ai: 3000
  chat:after_ai: 5000

# Configuration schema (JSON Schema format)
config:
  type: object
  properties:
    enabled:
      type: boolean
      default: true
      description: Enable or disable this module
    sensitivity:
      type: string
      enum: [low, medium, high]
      default: medium
      description: Detection sensitivity level
    customPatterns:
      type: array
      items:
        type: string
      default: []
      description: Additional regex patterns to detect
    notifyTeacher:
      type: boolean
      default: true
      description: Send notifications to teacher
  required: []

# Default configuration values
defaults:
  enabled: true
  sensitivity: medium
  customPatterns: []
  notifyTeacher: true

# Scope restrictions
scope:
  allowGlobal: true # Can be enabled system-wide
  allowGroup: true # Can be enabled per-group
  allowClass: true # Can be enabled per-class
  allowTool: true # Can be enabled per-tool

# Required permissions
permissions:
  - extractions:write # Can write to extractions table
  - events:emit # Can emit events
  - sessions:read # Can read session data

# Resource limits (per-execution)
limits:
  maxMemoryMB: 128 # Memory limit
  maxExecutionMs: 10000 # Max execution time

# Dependencies on other modules
dependencies:
  - pii-filter # Requires pii-filter to run first

# Tags for filtering
tags:
  - safety
  - content-moderation
```

### index.ts Implementation Pattern

```typescript
// index.ts - The pattern modules use
import {
  defineModule,
  HookContext,
  HookResult,
} from "@raptscallions/module-sdk";

export default defineModule({
  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE HOOKS (optional)
  // ─────────────────────────────────────────────────────────────────

  async onLoad(config) {
    console.log("Module loaded with config:", config);
  },

  async onUnload() {
    console.log("Module unloading, cleaning up...");
  },

  // ─────────────────────────────────────────────────────────────────
  // MAIN HOOK HANDLER
  // ─────────────────────────────────────────────────────────────────

  async handle(hook: string, ctx: HookContext): Promise<HookResult> {
    // Access configuration
    const { sensitivity, customPatterns } = this.config;

    // Route to specific handlers
    switch (hook) {
      case "chat:before_ai":
        return this.handleBeforeAI(ctx);
      case "chat:after_ai":
        return this.handleAfterAI(ctx);
      case "session:end":
        return this.handleSessionEnd(ctx);
      default:
        return { action: "continue" };
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // CUSTOM HANDLER METHODS
  // ─────────────────────────────────────────────────────────────────

  async handleBeforeAI(ctx: HookContext): Promise<HookResult> {
    const message = ctx.message.content;
    const issues = this.detectIssues(message);

    if (issues.length > 0) {
      // Emit extraction (saved to database)
      ctx.emit("issues_detected", {
        messageId: ctx.message.id,
        issues,
        timestamp: new Date().toISOString(),
      });

      // Low severity: modify and continue
      if (issues.every((i) => i.severity === "low")) {
        return {
          action: "continue",
          modifications: {
            message: { ...ctx.message, content: this.sanitize(message) },
          },
        };
      }

      // High severity: block
      if (issues.some((i) => i.severity === "critical")) {
        return {
          action: "block",
          reason: "content_violation",
          directResponse: "I cannot process that request.",
        };
      }
    }

    return { action: "continue" };
  },

  async handleAfterAI(ctx: HookContext): Promise<HookResult> {
    return {
      action: "continue",
      modifications: {
        response: this.sanitize(ctx.response),
      },
    };
  },

  async handleSessionEnd(ctx: HookContext): Promise<HookResult> {
    const analysis = await this.analyzeSession(ctx.session.id);
    ctx.emit("session_analysis", analysis);
    return { action: "continue" };
  },

  // ─────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────

  detectIssues(text: string) {
    const issues = [];
    // Detection logic here
    return issues;
  },

  sanitize(text: string) {
    // Sanitization logic here
    return text;
  },

  async analyzeSession(sessionId: string) {
    const patterns = this.state.get(sessionId) || [];
    this.state.delete(sessionId);
    return { messageCount: patterns.length };
  },
});
```

---

## 3. Module SDK

### Package Definition

```json
{
  "name": "@raptscallions/module-sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./testing": "./dist/testing.js"
  },
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

### Core Types

```typescript
// packages/module-sdk/src/types.ts

export interface ModuleConfig {
  [key: string]: unknown;
}

export interface HookContext {
  // Request context
  requestId: string;
  hook: string;
  timestamp: Date;

  // User & scope
  user: {
    id: string;
    email: string;
    name: string;
    role: "student" | "teacher" | "admin";
  };

  group?: {
    id: string;
    name: string;
    path: string;
  };

  class?: {
    id: string;
    name: string;
  };

  assignment?: {
    id: string;
    name: string;
    config: Record<string, unknown>;
  };

  // Tool & session
  tool: {
    id: string;
    name: string;
    type: "chat" | "product";
    definition: {
      behavior: string;
      model: string;
      constraints?: Record<string, unknown>;
      modules?: string[];
      meta?: Record<string, unknown>;
    };
  };

  session?: {
    id: string;
    state: "active" | "paused" | "completed";
    startedAt: Date;
    messageCount: number;
  };

  messages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    seq: number;
    createdAt: Date;
  }>;

  message?: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    seq: number;
  };

  response?: string;

  // Product tools
  run?: {
    id: string;
    state: "pending" | "complete" | "failed";
    createdAt: Date;
  };

  input?: Record<string, unknown>;
  output?: Record<string, unknown>;

  // Actions
  emit: (type: string, data: Record<string, unknown>) => void;
  db: ModuleDatabase;
  log: {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
  };
}

export interface HookResult {
  action: "continue" | "block" | "skip";

  modifications?: {
    message?: { content: string; [key: string]: unknown };
    response?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    systemPromptAdditions?: string[];
  };

  reason?: string;
  directResponse?: string;

  extractions?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

export interface ModuleDefinition {
  onLoad?: (config: ModuleConfig) => Promise<void>;
  onUnload?: () => Promise<void>;
  handle: (hook: string, ctx: HookContext) => Promise<HookResult>;
  [key: string]: unknown;
}

export interface LoadedModule extends ModuleDefinition {
  config: ModuleConfig;
  state: Map<string, unknown>;
}
```

### defineModule Function

```typescript
// packages/module-sdk/src/index.ts

import { ModuleDefinition, LoadedModule, ModuleConfig } from "./types";

export * from "./types";
export * from "./context";
export * from "./database";

export function defineModule<T extends ModuleDefinition>(
  definition: T
): T & LoadedModule {
  const module = {
    ...definition,
    config: {} as ModuleConfig,
    state: new Map<string, unknown>(),
  };

  // Bind all methods to the module instance
  for (const key of Object.keys(definition)) {
    const value = definition[key];
    if (typeof value === "function") {
      (module as any)[key] = value.bind(module);
    }
  }

  return module as T & LoadedModule;
}
```

### Context Helpers

```typescript
// packages/module-sdk/src/context.ts

import { HookContext } from "./types";

export function isStudent(ctx: HookContext): boolean {
  return ctx.user.role === "student";
}

export function isTeacher(ctx: HookContext): boolean {
  return ctx.user.role === "teacher";
}

export function getUserMessageCount(ctx: HookContext): number {
  if (!ctx.messages) return 0;
  return ctx.messages.filter((m) => m.role === "user").length;
}

export function getRecentMessages(ctx: HookContext, count: number) {
  if (!ctx.messages) return [];
  return ctx.messages.slice(-count);
}

export function isFirstMessage(ctx: HookContext): boolean {
  return ctx.session?.messageCount === 1;
}

export function getSessionDuration(ctx: HookContext): number {
  if (!ctx.session) return 0;
  return Date.now() - ctx.session.startedAt.getTime();
}

export function containsPattern(
  text: string,
  patterns: (string | RegExp)[]
): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(text);
  });
}

export function redactPatterns(
  text: string,
  patterns: Array<{ pattern: RegExp; replacement: string }>
): string {
  let result = text;
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
```

### Sandboxed Database Access

```typescript
// packages/module-sdk/src/database.ts

export interface ModuleDatabase {
  getSessionExtractions(sessionId: string): Promise<Extraction[]>;
  getUserExtractions(userId: string, classId: string): Promise<Extraction[]>;
  getExtractionsByType(
    type: string,
    options?: {
      sessionId?: string;
      userId?: string;
      limit?: number;
    }
  ): Promise<Extraction[]>;
  countExtractions(options: {
    type?: string;
    sessionId?: string;
    userId?: string;
    since?: Date;
  }): Promise<number>;
}

export interface Extraction {
  id: string;
  module: string;
  type: string;
  data: Record<string, unknown>;
  sessionId?: string;
  runId?: string;
  createdAt: Date;
}

export class ModuleDatabaseImpl implements ModuleDatabase {
  private moduleContext: {
    moduleName: string;
    sessionId?: string;
    userId: string;
    classId?: string;
  };

  constructor(context: typeof this.moduleContext) {
    this.moduleContext = context;
  }

  async getSessionExtractions(sessionId: string): Promise<Extraction[]> {
    return this.query("getSessionExtractions", { sessionId });
  }

  async getUserExtractions(
    userId: string,
    classId: string
  ): Promise<Extraction[]> {
    if (userId !== this.moduleContext.userId) {
      throw new Error("Cannot access other users' extractions");
    }
    return this.query("getUserExtractions", { userId, classId });
  }

  async getExtractionsByType(
    type: string,
    options?: { sessionId?: string; userId?: string; limit?: number }
  ): Promise<Extraction[]> {
    return this.query("getExtractionsByType", { type, ...options });
  }

  async countExtractions(options: {
    type?: string;
    sessionId?: string;
    userId?: string;
    since?: Date;
  }): Promise<number> {
    return this.query("countExtractions", options);
  }

  private async query(
    method: string,
    params: Record<string, unknown>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      // @ts-ignore - postMessage available in worker context
      postMessage({
        type: "db_query",
        requestId,
        method,
        params,
        moduleContext: this.moduleContext,
      });

      const handler = (event: MessageEvent) => {
        if (
          event.data.type === "db_response" &&
          event.data.requestId === requestId
        ) {
          removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      addEventListener("message", handler);

      setTimeout(() => {
        removeEventListener("message", handler);
        reject(new Error("Database query timeout"));
      }, 5000);
    });
  }
}
```

---

## 4. Module Supervisor

### Main Supervisor Implementation

```typescript
// packages/modules/src/supervisor.ts

import { Worker } from "worker_threads";
import { watch, FSWatcher } from "chokidar";
import { EventEmitter } from "events";
import * as path from "path";
import * as fs from "fs/promises";
import * as yaml from "yaml";
import { HookContext, HookResult } from "./types";

type ModuleStatus = "starting" | "ready" | "error" | "disabled" | "stopping";

interface ModuleManifest {
  name: string;
  version: string;
  description: string;
  hooks: string[];
  displayName?: string;
  priorities?: Record<string, number>;
  blocking?: Record<string, boolean>;
  timeouts?: Record<string, number>;
  config?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  limits?: { maxMemoryMB?: number; maxExecutionMs?: number };
  dependencies?: string[];
}

interface ManagedModule {
  name: string;
  version: string;
  manifest: ModuleManifest;
  worker: Worker;
  status: ModuleStatus;
  restartCount: number;
  lastError?: string;
  lastErrorAt?: Date;
  loadedAt: Date;
  directory: string;
}

export interface SupervisorConfig {
  modulesDir: string;
  watchEnabled: boolean;
  maxRestarts: number;
  defaultTimeout: number;
  debug: boolean;
}

export class ModuleSupervisor extends EventEmitter {
  private modules = new Map<string, ManagedModule>();
  private watcher?: FSWatcher;
  private config: SupervisorConfig;
  private isShuttingDown = false;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: HookResult) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(config: Partial<SupervisorConfig> = {}) {
    super();
    this.config = {
      modulesDir: config.modulesDir || path.join(process.cwd(), "modules"),
      watchEnabled: config.watchEnabled ?? true,
      maxRestarts: config.maxRestarts ?? 5,
      defaultTimeout: config.defaultTimeout ?? 5000,
      debug: config.debug ?? false,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
    this.log("info", "Starting module supervisor...");

    await fs.mkdir(this.config.modulesDir, { recursive: true });

    const entries = await fs.readdir(this.config.modulesDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const moduleDir = path.join(this.config.modulesDir, entry.name);
        try {
          await this.loadModule(moduleDir);
        } catch (err) {
          this.log("error", `Failed to load module ${entry.name}:`, err);
          this.emit("module:load_error", { name: entry.name, error: err });
        }
      }
    }

    if (this.config.watchEnabled) {
      this.startWatcher();
    }

    this.log(
      "info",
      `Module supervisor started. ${this.modules.size} modules loaded.`
    );
    this.emit("supervisor:started", { moduleCount: this.modules.size });
  }

  async stop(): Promise<void> {
    this.log("info", "Stopping module supervisor...");
    this.isShuttingDown = true;

    if (this.watcher) {
      await this.watcher.close();
    }

    const unloadPromises = Array.from(this.modules.keys()).map((name) =>
      this.unloadModule(name)
    );

    await Promise.allSettled(unloadPromises);

    this.log("info", "Module supervisor stopped.");
    this.emit("supervisor:stopped");
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODULE LOADING
  // ═══════════════════════════════════════════════════════════════════

  async loadModule(moduleDir: string): Promise<void> {
    const manifestPath = path.join(moduleDir, "module.yaml");

    try {
      await fs.access(manifestPath);
    } catch {
      throw new Error(`No module.yaml found in ${moduleDir}`);
    }

    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest: ModuleManifest = yaml.parse(manifestContent);

    if (this.modules.has(manifest.name)) {
      throw new Error(`Module ${manifest.name} is already loaded`);
    }

    const worker = new Worker(path.join(__dirname, "worker-host.js"), {
      workerData: {
        moduleDir,
        manifest,
        config: manifest.defaults || {},
      },
      resourceLimits: {
        maxYoungGenerationSizeMb: manifest.limits?.maxMemoryMB || 128,
        maxOldGenerationSizeMb: manifest.limits?.maxMemoryMB || 128,
      },
    });

    const managed: ManagedModule = {
      name: manifest.name,
      version: manifest.version,
      manifest,
      worker,
      status: "starting",
      restartCount: 0,
      loadedAt: new Date(),
      directory: moduleDir,
    };

    this.attachWorkerHandlers(worker, managed);
    this.modules.set(manifest.name, managed);
  }

  private attachWorkerHandlers(worker: Worker, managed: ManagedModule): void {
    worker.on("message", (msg) => {
      switch (msg.type) {
        case "ready":
          managed.status = "ready";
          this.log("info", `Module ${managed.name} loaded successfully`);
          this.emit("module:ready", {
            name: managed.name,
            version: managed.version,
          });
          break;

        case "hook_result":
          this.handleHookResult(msg);
          break;

        case "extraction":
          this.emit("extraction", {
            module: msg.module,
            type: msg.extractionType,
            data: msg.data,
            sessionId: msg.sessionId,
            runId: msg.runId,
            userId: msg.userId,
            timestamp: new Date(),
          });
          break;

        case "log":
          this.emit("module:log", msg);
          break;

        case "db_query":
          this.handleDatabaseQuery(worker, msg);
          break;

        case "unloaded":
          // Worker acknowledged unload
          break;

        case "error":
          this.emit("module:error", { name: managed.name, error: msg.error });
          break;
      }
    });

    worker.on("error", (err) => {
      this.handleWorkerError(managed, err);
    });

    worker.on("exit", (code) => {
      if (code !== 0 && !this.isShuttingDown && managed.status !== "stopping") {
        this.handleWorkerError(
          managed,
          new Error(`Worker exited with code ${code}`)
        );
      }
    });
  }

  async unloadModule(name: string): Promise<void> {
    const managed = this.modules.get(name);
    if (!managed) {
      throw new Error(`Module ${name} is not loaded`);
    }

    this.log("info", `Unloading module ${name}...`);
    managed.status = "stopping";

    managed.worker.postMessage({ type: "unload" });

    await new Promise<void>((resolve) => {
      const handler = (msg: any) => {
        if (msg.type === "unloaded") {
          managed.worker.off("message", handler);
          resolve();
        }
      };
      managed.worker.on("message", handler);
      setTimeout(resolve, 5000);
    });

    await managed.worker.terminate();
    this.modules.delete(name);

    this.log("info", `Module ${name} unloaded`);
    this.emit("module:unloaded", { name });
  }

  async reloadModule(name: string): Promise<void> {
    const managed = this.modules.get(name);
    if (!managed) {
      throw new Error(`Module ${name} is not loaded`);
    }

    const moduleDir = managed.directory;

    this.log("info", `Hot reloading module ${name}...`);
    this.emit("module:reloading", { name });

    await this.unloadModule(name);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.loadModule(moduleDir);

    this.emit("module:reloaded", { name });
  }

  // ═══════════════════════════════════════════════════════════════════
  // HOT RELOAD WATCHER
  // ═══════════════════════════════════════════════════════════════════

  private startWatcher(): void {
    this.watcher = watch(this.config.modulesDir, {
      ignoreInitial: true,
      depth: 2,
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
    });

    const changeTimers = new Map<string, NodeJS.Timeout>();

    const handleChange = (filePath: string, event: string) => {
      const relativePath = path.relative(this.config.modulesDir, filePath);
      const moduleName = relativePath.split(path.sep)[0];

      if (!moduleName) return;

      const existingTimer = changeTimers.get(moduleName);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        changeTimers.delete(moduleName);

        const moduleDir = path.join(this.config.modulesDir, moduleName);
        const manifestPath = path.join(moduleDir, "module.yaml");

        try {
          await fs.access(manifestPath);

          if (this.modules.has(moduleName)) {
            await this.reloadModule(moduleName);
          } else {
            await this.loadModule(moduleDir);
          }
        } catch (err) {
          if (event === "unlink" && this.modules.has(moduleName)) {
            await this.unloadModule(moduleName);
          } else {
            this.log("error", `Hot reload failed for ${moduleName}:`, err);
            this.emit("module:reload_error", { name: moduleName, error: err });
          }
        }
      }, 500);

      changeTimers.set(moduleName, timer);
    };

    this.watcher.on("add", (filePath) => handleChange(filePath, "add"));
    this.watcher.on("change", (filePath) => handleChange(filePath, "change"));
    this.watcher.on("unlink", (filePath) => handleChange(filePath, "unlink"));

    this.log("info", "File watcher started for hot reload");
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR HANDLING & RECOVERY
  // ═══════════════════════════════════════════════════════════════════

  private handleWorkerError(managed: ManagedModule, error: Error): void {
    managed.status = "error";
    managed.lastError = error.message;
    managed.lastErrorAt = new Date();
    managed.restartCount++;

    this.log("error", `Module ${managed.name} error:`, error);
    this.emit("module:error", {
      name: managed.name,
      error: error.message,
      restartCount: managed.restartCount,
    });

    if (managed.restartCount <= this.config.maxRestarts) {
      const delay = Math.min(
        1000 * Math.pow(2, managed.restartCount - 1),
        30000
      );

      this.log(
        "info",
        `Restarting module ${managed.name} in ${delay}ms (attempt ${managed.restartCount})`
      );

      setTimeout(async () => {
        if (this.isShuttingDown) return;

        try {
          this.modules.delete(managed.name);
          await this.loadModule(managed.directory);

          const newManaged = this.modules.get(managed.name);
          if (newManaged) {
            newManaged.restartCount = managed.restartCount;
          }
        } catch (err) {
          this.log("error", `Failed to restart module ${managed.name}:`, err);
        }
      }, delay);
    } else {
      managed.status = "disabled";
      this.log(
        "warn",
        `Module ${managed.name} disabled after ${managed.restartCount} failures`
      );
      this.emit("module:disabled", {
        name: managed.name,
        reason: "Too many crashes",
        restartCount: managed.restartCount,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HOOK EXECUTION
  // ═══════════════════════════════════════════════════════════════════

  async executeHook(hookName: string, ctx: HookContext): Promise<HookResult> {
    const relevantModules = Array.from(this.modules.values())
      .filter(
        (m) => m.status === "ready" && m.manifest.hooks.includes(hookName)
      )
      .sort((a, b) => {
        const priorityA = a.manifest.priorities?.[hookName] ?? 50;
        const priorityB = b.manifest.priorities?.[hookName] ?? 50;
        return priorityA - priorityB;
      });

    if (relevantModules.length === 0) {
      return { action: "continue" };
    }

    let currentCtx = ctx;
    const allExtractions: Array<{ module: string; type: string; data: any }> =
      [];

    for (const managed of relevantModules) {
      const isBlocking =
        managed.manifest.blocking?.[hookName] ??
        (hookName.includes("before_ai") || hookName.includes("after_ai"));

      const timeout =
        managed.manifest.timeouts?.[hookName] ?? this.config.defaultTimeout;

      try {
        if (isBlocking) {
          const result = await this.callWorkerHook(
            managed,
            hookName,
            currentCtx,
            timeout
          );

          if (result.extractions) {
            allExtractions.push(
              ...result.extractions.map((e) => ({
                ...e,
                module: managed.name,
              }))
            );
          }

          if (result.action === "block") {
            return { ...result, extractions: allExtractions };
          }

          if (result.modifications) {
            currentCtx = this.applyModifications(
              currentCtx,
              result.modifications
            );
          }
        } else {
          this.callWorkerHook(managed, hookName, currentCtx, timeout).catch(
            (err) => {
              this.log(
                "warn",
                `Async hook ${hookName} failed in ${managed.name}:`,
                err
              );
            }
          );
        }
      } catch (err) {
        this.log(
          "error",
          `Hook ${hookName} failed in module ${managed.name}:`,
          err
        );
        this.emit("module:hook_error", {
          module: managed.name,
          hook: hookName,
          error: (err as Error).message,
        });
      }
    }

    return {
      action: "continue",
      modifications: this.extractModifications(ctx, currentCtx),
      extractions: allExtractions,
    };
  }

  private callWorkerHook(
    managed: ManagedModule,
    hook: string,
    ctx: HookContext,
    timeoutMs: number
  ): Promise<HookResult> {
    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Hook ${hook} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const { emit, db, log, ...serializableCtx } = ctx as any;

      managed.worker.postMessage({
        type: "execute_hook",
        requestId,
        hook,
        ctx: serializableCtx,
      });
    });
  }

  private handleHookResult(msg: {
    requestId: string;
    result?: HookResult;
    error?: string;
  }): void {
    const pending = this.pendingRequests.get(msg.requestId);
    if (!pending) return;

    this.pendingRequests.delete(msg.requestId);
    clearTimeout(pending.timeout);

    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.result!);
    }
  }

  private applyModifications(
    ctx: HookContext,
    mods: HookResult["modifications"]
  ): HookContext {
    if (!mods) return ctx;

    const newCtx = { ...ctx };

    if (mods.message && newCtx.message) {
      newCtx.message = { ...newCtx.message, ...mods.message };
    }
    if (mods.response !== undefined) {
      newCtx.response = mods.response;
    }
    if (mods.input && newCtx.input) {
      newCtx.input = { ...newCtx.input, ...mods.input };
    }
    if (mods.output && newCtx.output) {
      newCtx.output = { ...newCtx.output, ...mods.output };
    }

    return newCtx;
  }

  private extractModifications(
    original: HookContext,
    modified: HookContext
  ): HookResult["modifications"] {
    const mods: HookResult["modifications"] = {};

    if (modified.message?.content !== original.message?.content) {
      mods.message = modified.message;
    }
    if (modified.response !== original.response) {
      mods.response = modified.response;
    }

    return Object.keys(mods).length > 0 ? mods : undefined;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DATABASE QUERY HANDLING
  // ═══════════════════════════════════════════════════════════════════

  private async handleDatabaseQuery(
    worker: Worker,
    msg: {
      requestId: string;
      method: string;
      params: any;
      moduleContext: any;
    }
  ): Promise<void> {
    try {
      const result = await this.executeDatabaseQuery(
        msg.method,
        msg.params,
        msg.moduleContext
      );
      worker.postMessage({
        type: "db_response",
        requestId: msg.requestId,
        result,
      });
    } catch (error) {
      worker.postMessage({
        type: "db_response",
        requestId: msg.requestId,
        error: (error as Error).message,
      });
    }
  }

  private async executeDatabaseQuery(
    method: string,
    params: any,
    moduleContext: any
  ): Promise<any> {
    // Dynamic import to avoid circular dependencies
    const { db } = await import("@raptscallions/db");
    const { extractions } = await import("@raptscallions/db/schema");
    const { eq, and, desc, sql } = await import("drizzle-orm");

    switch (method) {
      case "getSessionExtractions":
        return db.query.extractions.findMany({
          where: eq(extractions.sessionId, params.sessionId),
          orderBy: desc(extractions.createdAt),
        });

      case "getUserExtractions":
        if (params.userId !== moduleContext.userId) {
          throw new Error("Access denied");
        }
        return db.query.extractions.findMany({
          where: and(
            eq(extractions.userId, params.userId),
            eq(extractions.classId, params.classId)
          ),
          orderBy: desc(extractions.createdAt),
        });

      case "getExtractionsByType":
        const conditions = [eq(extractions.type, params.type)];
        if (params.sessionId)
          conditions.push(eq(extractions.sessionId, params.sessionId));
        if (params.userId)
          conditions.push(eq(extractions.userId, params.userId));
        return db.query.extractions.findMany({
          where: and(...conditions),
          limit: params.limit || 100,
          orderBy: desc(extractions.createdAt),
        });

      case "countExtractions":
        const countConditions = [];
        if (params.type)
          countConditions.push(eq(extractions.type, params.type));
        if (params.sessionId)
          countConditions.push(eq(extractions.sessionId, params.sessionId));
        if (params.userId)
          countConditions.push(eq(extractions.userId, params.userId));
        const result = await db
          .select({ count: sql`count(*)` })
          .from(extractions)
          .where(
            countConditions.length > 0 ? and(...countConditions) : undefined
          );
        return Number(result[0].count);

      default:
        throw new Error(`Unknown database method: ${method}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATUS & MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  getModuleStatuses() {
    return Array.from(this.modules.values()).map((m) => ({
      name: m.name,
      version: m.version,
      status: m.status,
      hooks: m.manifest.hooks,
      restartCount: m.restartCount,
      lastError: m.lastError,
      lastErrorAt: m.lastErrorAt,
      loadedAt: m.loadedAt,
    }));
  }

  getModuleStatus(name: string) {
    const managed = this.modules.get(name);
    if (!managed) return null;

    return {
      name: managed.name,
      version: managed.version,
      status: managed.status,
      manifest: managed.manifest,
      restartCount: managed.restartCount,
      lastError: managed.lastError,
      lastErrorAt: managed.lastErrorAt,
      loadedAt: managed.loadedAt,
    };
  }

  async updateModuleConfig(
    name: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const managed = this.modules.get(name);
    if (!managed) throw new Error(`Module ${name} is not loaded`);

    managed.worker.postMessage({ type: "config_update", config });
    this.emit("module:config_updated", { name, config });
  }

  async enableModule(name: string): Promise<void> {
    const managed = this.modules.get(name);
    if (!managed) throw new Error(`Module ${name} is not loaded`);
    if (managed.status !== "disabled")
      throw new Error(`Module ${name} is not disabled`);

    this.modules.delete(name);
    await this.loadModule(managed.directory);
    this.emit("module:enabled", { name });
  }

  async disableModule(name: string): Promise<void> {
    const managed = this.modules.get(name);
    if (!managed) throw new Error(`Module ${name} is not loaded`);

    managed.status = "disabled";
    managed.worker.postMessage({ type: "disable" });
    this.emit("module:disabled", { name, reason: "Manual disable" });
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    ...args: any[]
  ): void {
    if (level === "debug" && !this.config.debug) return;
    console[level](`[ModuleSupervisor]`, message, ...args);
    this.emit("log", { level, message, args, timestamp: new Date() });
  }
}

// Singleton
let supervisor: ModuleSupervisor | null = null;

export function getModuleSupervisor(
  config?: Partial<SupervisorConfig>
): ModuleSupervisor {
  if (!supervisor) {
    supervisor = new ModuleSupervisor(config);
  }
  return supervisor;
}
```

### Worker Host (Runs in Worker Thread)

```typescript
// packages/modules/src/worker-host.ts

import { parentPort, workerData } from "worker_threads";
import * as path from "path";
import { ModuleDatabaseImpl } from "@raptscallions/module-sdk/database";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

const { moduleDir, manifest, config } = workerData;

let moduleInstance: any = null;

async function loadModule() {
  const modulePath = path.join(moduleDir, "index.ts");
  const imported = await import(modulePath);
  moduleInstance = imported.default;

  moduleInstance.config = config;

  if (moduleInstance.onLoad) {
    await moduleInstance.onLoad(config);
  }

  parentPort!.postMessage({ type: "ready" });
}

parentPort.on("message", async (msg) => {
  switch (msg.type) {
    case "execute_hook":
      await handleExecuteHook(msg);
      break;
    case "config_update":
      moduleInstance.config = { ...moduleInstance.config, ...msg.config };
      break;
    case "unload":
      if (moduleInstance.onUnload) await moduleInstance.onUnload();
      parentPort!.postMessage({ type: "unloaded" });
      break;
    case "disable":
      break;
  }
});

async function handleExecuteHook(msg: {
  requestId: string;
  hook: string;
  ctx: any;
}) {
  const { requestId, hook, ctx } = msg;

  try {
    const extractions: any[] = [];

    const enrichedCtx = {
      ...ctx,
      emit: (type: string, data: any) => {
        extractions.push({ type, data });
        parentPort!.postMessage({
          type: "extraction",
          module: manifest.name,
          extractionType: type,
          data,
          sessionId: ctx.session?.id,
          runId: ctx.run?.id,
          userId: ctx.user?.id,
        });
      },
      db: new ModuleDatabaseImpl({
        moduleName: manifest.name,
        sessionId: ctx.session?.id,
        userId: ctx.user?.id,
        classId: ctx.class?.id,
      }),
      log: createLogger(manifest.name),
    };

    const result = await moduleInstance.handle(hook, enrichedCtx);

    parentPort!.postMessage({
      type: "hook_result",
      requestId,
      result: { ...result, extractions },
    });
  } catch (error) {
    parentPort!.postMessage({
      type: "hook_result",
      requestId,
      error: (error as Error).message,
    });
  }
}

function createLogger(moduleName: string) {
  const log = (level: string, message: string, data?: any) => {
    parentPort!.postMessage({
      type: "log",
      module: moduleName,
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    debug: (msg: string, data?: any) => log("debug", msg, data),
    info: (msg: string, data?: any) => log("info", msg, data),
    warn: (msg: string, data?: any) => log("warn", msg, data),
    error: (msg: string, data?: any) => log("error", msg, data),
  };
}

process.on("uncaughtException", (error) => {
  parentPort!.postMessage({
    type: "error",
    error: error.message,
    stack: error.stack,
  });
});

process.on("unhandledRejection", (reason) => {
  parentPort!.postMessage({ type: "error", error: String(reason) });
});

loadModule().catch((error) => {
  parentPort!.postMessage({ type: "load_error", error: error.message });
});
```

---

## 5. Hook Execution Engine

### Integration with Chat Service

```typescript
// apps/api/src/services/chat.service.ts

import { getModuleSupervisor } from "@raptscallions/modules";
import { db } from "@raptscallions/db";
import { aiService } from "./ai.service";

export class ChatService {
  private moduleSupervisor = getModuleSupervisor();

  async sendMessage(sessionId: string, content: string, userId: string) {
    const session = await this.loadSession(sessionId);
    const tool = await this.loadTool(session.toolId);
    const allMessages = await this.loadMessages(sessionId);

    const baseCtx = {
      requestId: crypto.randomUUID(),
      hook: "",
      timestamp: new Date(),
      user: await this.loadUser(userId),
      tool: {
        id: tool.id,
        name: tool.name,
        type: "chat",
        definition: tool.definition,
      },
      session: {
        id: session.id,
        state: session.state,
        startedAt: session.startedAt,
        messageCount: allMessages.length,
      },
      messages: allMessages,
      message: {
        id: crypto.randomUUID(),
        role: "user",
        content,
        seq: allMessages.length + 1,
      },
    };

    // HOOK: chat:on_message (async)
    this.moduleSupervisor
      .executeHook("chat:on_message", { ...baseCtx, hook: "chat:on_message" })
      .catch((err) => console.error("chat:on_message failed:", err));

    // HOOK: chat:before_ai (blocking)
    const beforeResult = await this.moduleSupervisor.executeHook(
      "chat:before_ai",
      { ...baseCtx, hook: "chat:before_ai" }
    );
    const allExtractions = beforeResult.extractions || [];

    if (beforeResult.action === "block") {
      await this.saveMessage(
        sessionId,
        "user",
        content,
        allMessages.length + 1
      );
      const directResponse =
        beforeResult.directResponse || "I cannot process that request.";
      await this.saveMessage(
        sessionId,
        "assistant",
        directResponse,
        allMessages.length + 2
      );
      return { response: directResponse, extractions: allExtractions };
    }

    let processedContent =
      beforeResult.modifications?.message?.content || content;

    // AI CALL
    const aiResponse = await aiService.call(
      {
        messages: this.buildAIMessages(
          tool.definition,
          allMessages,
          processedContent,
          beforeResult.modifications?.systemPromptAdditions
        ),
        model: tool.definition.model,
      },
      { userId, sessionId, requestType: "chat" }
    );

    // HOOK: chat:after_ai (blocking)
    const afterResult = await this.moduleSupervisor.executeHook(
      "chat:after_ai",
      { ...baseCtx, hook: "chat:after_ai", response: aiResponse.content }
    );
    if (afterResult.extractions)
      allExtractions.push(...afterResult.extractions);

    let finalResponse =
      afterResult.modifications?.response || aiResponse.content;

    await this.saveMessage(sessionId, "user", content, allMessages.length + 1);
    await this.saveMessage(
      sessionId,
      "assistant",
      finalResponse,
      allMessages.length + 2
    );

    return { response: finalResponse, extractions: allExtractions };
  }

  private buildAIMessages(
    toolDef: any,
    prev: any[],
    current: string,
    additions?: string[]
  ) {
    let systemPrompt = toolDef.behavior;
    if (additions?.length)
      systemPrompt += `\n\nAdditional context:\n${additions.join("\n")}`;
    return [
      { role: "system", content: systemPrompt },
      ...prev.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: current },
    ];
  }
}
```

---

## 6. Database Schema for Modules

```sql
-- Module configuration per-scope
CREATE TABLE module_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id UUID,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_name, scope_type, scope_id)
);

-- Module logs
CREATE TABLE module_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  session_id UUID REFERENCES sessions(id),
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_logs_module ON module_logs(module_name, created_at DESC);
```

---

## 7. Built-in Modules

### PII Filter

```typescript
// modules/pii-filter/index.ts
import { defineModule, redactPatterns } from "@raptscallions/module-sdk";

const PII_PATTERNS = [
  { pattern: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: "[PHONE]" },
  { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, replacement: "[SSN]" },
];

export default defineModule({
  async handle(hook, ctx) {
    if (!this.config.enabled) return { action: "continue" };

    if (hook === "chat:before_ai") {
      const filtered = redactPatterns(ctx.message?.content || "", PII_PATTERNS);
      if (filtered !== ctx.message?.content) {
        ctx.emit("pii_detected", { location: "user_message" });
        return {
          action: "continue",
          modifications: { message: { ...ctx.message!, content: filtered } },
        };
      }
    }

    if (hook === "chat:after_ai") {
      const filtered = redactPatterns(ctx.response || "", PII_PATTERNS);
      if (filtered !== ctx.response) {
        return { action: "continue", modifications: { response: filtered } };
      }
    }

    return { action: "continue" };
  },
});
```

### Struggle Detector

```typescript
// modules/struggle-detector/index.ts
import { defineModule, getSessionDuration } from "@raptscallions/module-sdk";

export default defineModule({
  async handle(hook, ctx) {
    if (!this.config.enabled || hook !== "chat:on_message")
      return { action: "continue" };

    const sessionId = ctx.session?.id;
    if (!sessionId) return { action: "continue" };

    const indicators = (this.state.get(sessionId) as any[]) || [];
    const content = ctx.message?.content?.toLowerCase() || "";

    if (/i don'?t (understand|get it)|confused|stuck|help/i.test(content)) {
      indicators.push({ type: "frustration", timestamp: Date.now() });
    }

    this.state.set(sessionId, indicators);

    const recent = indicators.filter((i) => Date.now() - i.timestamp < 300000);
    if (recent.length >= this.config.threshold) {
      ctx.emit("struggle_detected", {
        sessionId,
        indicators: recent,
        duration: getSessionDuration(ctx),
      });
    }

    return { action: "continue" };
  },
});
```

---

## 8. Testing Utilities

```typescript
// packages/module-sdk/src/testing.ts
import { HookContext, HookResult } from "./types";

export function createMockContext(
  overrides: Partial<HookContext> = {}
): HookContext {
  const extractions: any[] = [];
  return {
    requestId: "test-request",
    hook: "chat:before_ai",
    timestamp: new Date(),
    user: {
      id: "user-1",
      email: "test@test.com",
      name: "Test",
      role: "student",
    },
    tool: {
      id: "tool-1",
      name: "Test Tool",
      type: "chat",
      definition: { behavior: "Test", model: "test" },
    },
    session: {
      id: "session-1",
      state: "active",
      startedAt: new Date(),
      messageCount: 1,
    },
    message: { id: "msg-1", role: "user", content: "Hello", seq: 1 },
    emit: (type, data) => extractions.push({ type, data }),
    db: {
      getSessionExtractions: async () => [],
      getUserExtractions: async () => [],
      getExtractionsByType: async () => [],
      countExtractions: async () => 0,
    },
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    ...overrides,
    _extractions: extractions,
  } as any;
}

export async function testModule(
  module: any,
  hook: string,
  ctx = {},
  config = {}
) {
  module.config = { enabled: true, ...config };
  const mockCtx = createMockContext({ ...ctx, hook });
  const result = await module.handle(hook, mockCtx);
  return { result, extractions: (mockCtx as any)._extractions };
}
```

---

## 9. Deployment

### Add a Module

```bash
mkdir -p modules/my-module

cat > modules/my-module/module.yaml << 'EOF'
name: my-module
version: 1.0.0
description: My module
hooks:
  - chat:before_ai
defaults:
  enabled: true
EOF

cat > modules/my-module/index.ts << 'EOF'
import { defineModule } from '@raptscallions/module-sdk'
export default defineModule({
  async handle(hook, ctx) {
    console.log('My module:', hook)
    return { action: 'continue' }
  }
})
EOF
# Hot reload picks it up automatically!
```

### Docker Compose

```yaml
services:
  api:
    image: ghcr.io/raptscallions/raptscallions:latest
    volumes:
      - ./modules:/app/modules
    environment:
      DATABASE_URL: postgresql://postgres:pass@db:5432/raptscallions
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]
```

---

## Summary

| Component          | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `defineModule()`   | Single entry point for module creation           |
| `module.yaml`      | Declarative config for hooks, priorities, schema |
| `ModuleSupervisor` | Manages worker lifecycle, hot reload             |
| `Worker Threads`   | Isolation - crashes don't affect main process    |
| `HookContext`      | All data modules need (user, session, messages)  |
| `ctx.emit()`       | Save extractions for analytics/dashboards        |
| `ctx.log`          | Structured logging per module                    |
| `ctx.db`           | Sandboxed database access                        |

### Hook Execution Flow

```
User Message → chat:on_message (async) → chat:before_ai (sync, can block/modify)
    → AI Call → chat:after_ai (sync, can modify) → Response to User
```

### Best Practices

1. **One module, one purpose** - Keep focused
2. **Use priorities** - Safety early (1-10), logging late (90-99)
3. **Emit extractions** - For teacher dashboards and analytics
4. **Handle errors gracefully** - Log and continue, never crash
5. **Test with SDK utilities** - `testModule()` helper
