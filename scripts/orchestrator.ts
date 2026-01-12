#!/usr/bin/env node

/**
 * Raptscallions Workflow Orchestrator
 *
 * Automates task progression through the development workflow using Claude Code.
 *
 * Usage:
 *   pnpm workflow:run <task-id>     - Run workflow for a specific task
 *   pnpm workflow:run --auto        - Auto-run all ready tasks
 *   pnpm workflow:status            - Show task board
 *   pnpm workflow:status <task-id>  - Show specific task
 *   pnpm workflow:next              - Show next available tasks
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// ============================================================================
// TYPES
// ============================================================================

interface TaskFrontmatter {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  task_type?: "frontend" | "backend" | "fullstack";
  labels: string[];
  workflow_state: WorkflowState;
  epic: string;
  depends_on: string[];
  blocks: string[];
  breakpoint: boolean;
  skip_github?: boolean; // Skip GitHub automation (manual git/PR)
  assigned_agent: string;
  created_at: string;
  updated_at: string;
  started_at: string;
  completed_at: string;
  spec_file: string;
  test_files: string[];
  code_files: string[];
  pr_url: string;
}

interface Task extends TaskFrontmatter {
  filepath: string;
  body: string;
}

type WorkflowState =
  | "BACKLOG"
  | "BREAKING_DOWN"
  | "DRAFT"
  | "ANALYZING"
  | "ANALYZED"
  | "UX_REVIEW"
  | "PLAN_REVIEW"
  | "APPROVED"
  | "WRITING_TESTS"
  | "TESTS_READY"
  | "TESTS_REVISION_NEEDED"
  | "IMPLEMENTING"
  | "IMPLEMENTED"
  | "UI_REVIEW"
  | "CODE_REVIEW"
  | "QA_REVIEW"
  | "INTEGRATION_TESTING"
  | "INTEGRATION_FAILED"
  | "DOCS_UPDATE"
  | "PR_READY"
  | "PR_CREATED"
  | "PR_REVIEW"
  | "PR_FAILED"
  | "DONE";

interface WorkflowConfig {
  states: StateConfig[];
  agents: Record<string, AgentConfig>;
  default_breakpoints: WorkflowState[];
  failure_handling: FailureConfig;
}

interface StateConfig {
  id: WorkflowState;
  description: string;
  agent: string | null;
  next: WorkflowState | null;
  can_reject?: boolean;
  reject_to?: WorkflowState;
  requires_fresh_context?: boolean;
  terminal?: boolean;
}

interface AgentConfig {
  name: string;
  claude_agent: string;
  fresh_context?: boolean;
}

interface FailureConfig {
  max_retries: number;
}

interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  newState?: WorkflowState;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT_DIR = process.cwd();
const BACKLOG_DIR = path.join(ROOT_DIR, "backlog", "tasks");
const COMPLETED_DIR = path.join(ROOT_DIR, "backlog", "completed");
const WORKFLOW_CONFIG_PATH = path.join(
  ROOT_DIR,
  "backlog",
  "docs",
  ".workflow",
  "config.yaml"
);

// State to agent command mapping
// The command runs when entering a state, then transitions to the next state
const STATE_COMMANDS: Record<WorkflowState, string | null> = {
  BACKLOG: "plan", // PM agent breaks down goals into tasks
  BREAKING_DOWN: null, // Agent is running
  DRAFT: "analyze",
  ANALYZING: null, // Agent is running
  ANALYZED: "review-ux", // Designer UX review
  UX_REVIEW: null, // Agent is running
  PLAN_REVIEW: "review-plan", // Architect review (runs on entry)
  APPROVED: "write-tests",
  WRITING_TESTS: null, // Agent is running
  TESTS_READY: "implement",
  TESTS_REVISION_NEEDED: "write-tests", // Send back to test writing phase
  IMPLEMENTING: null, // Agent is running
  IMPLEMENTED: "review-ui", // Designer UI review
  UI_REVIEW: null, // Agent is running
  CODE_REVIEW: "review-code", // Code review (runs on entry)
  QA_REVIEW: "qa",
  INTEGRATION_TESTING: "integration-test", // Run real integration tests
  INTEGRATION_FAILED: "investigate-failure", // Investigate failure root cause
  DOCS_UPDATE: "update-docs",
  PR_READY: "commit-and-pr", // Commit and create PR
  PR_CREATED: null, // PR created, CI running (manual monitoring)
  PR_REVIEW: null, // Awaiting PR review (manual)
  PR_FAILED: null, // CI failed (manual investigation)
  DONE: null, // Terminal
};

// Command to agent name mapping
const COMMAND_AGENTS: Record<string, string> = {
  plan: "pm",
  analyze: "analyst",
  "review-ux": "designer",
  "review-plan": "architect",
  "write-tests": "developer",
  implement: "developer",
  "review-ui": "designer",
  "review-code": "reviewer",
  qa: "qa",
  "integration-test": "qa",
  "investigate-failure": "qa",
  "update-docs": "writer",
  "commit-and-pr": "git-agent",
  "epic-review": "pm",
  roadmap: "pm",
};

// State transitions
const STATE_TRANSITIONS: Record<WorkflowState, WorkflowState | null> = {
  BACKLOG: "BREAKING_DOWN",
  BREAKING_DOWN: "DRAFT",
  DRAFT: "ANALYZING",
  ANALYZING: "ANALYZED",
  ANALYZED: "UX_REVIEW",
  UX_REVIEW: "PLAN_REVIEW", // or ANALYZING on rejection
  PLAN_REVIEW: "APPROVED", // or ANALYZING on rejection
  APPROVED: "WRITING_TESTS",
  WRITING_TESTS: "TESTS_READY",
  TESTS_READY: "IMPLEMENTING",
  TESTS_REVISION_NEEDED: "TESTS_READY", // After tests are fixed, back to ready state
  IMPLEMENTING: "IMPLEMENTED",
  IMPLEMENTED: "UI_REVIEW",
  UI_REVIEW: "CODE_REVIEW", // or TESTS_READY on rejection
  CODE_REVIEW: "QA_REVIEW", // or TESTS_READY on rejection
  QA_REVIEW: "INTEGRATION_TESTING", // or TESTS_READY on rejection
  INTEGRATION_TESTING: "DOCS_UPDATE", // or INTEGRATION_FAILED on rejection
  INTEGRATION_FAILED: null, // Agent decides: TESTS_REVISION_NEEDED or IMPLEMENTING
  DOCS_UPDATE: "PR_READY",
  PR_READY: "PR_CREATED",
  PR_CREATED: "DONE", // Auto-transitions to DONE (or manually set to PR_REVIEW/PR_FAILED)
  PR_REVIEW: "DONE", // Manual review complete, merge manually
  PR_FAILED: null, // CI failed, manual investigation (can go to IMPLEMENTING or TESTS_REVISION_NEEDED)
  DONE: null,
};

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(msg: string) {
  console.log(msg);
}

function logInfo(msg: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function logSuccess(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logWarning(msg: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function logError(msg: string) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`);
}

function logStep(step: string, msg: string) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

// ============================================================================
// FILE PARSING
// ============================================================================

function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  try {
    const frontmatter = yaml.parse(match[1] as string);
    return { frontmatter, body: match[2] as string };
  } catch (e) {
    logError(`Failed to parse frontmatter: ${e instanceof Error ? e.message : String(e)}`);
    return { frontmatter: {}, body: content };
  }
}

function serializeFrontmatter(
  frontmatter: Record<string, any>,
  body: string
): string {
  const yamlStr = yaml.stringify(frontmatter, { lineWidth: 0 });
  return `---\n${yamlStr}---\n${body}`;
}

function loadTask(filepath: string): Task | undefined {
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      ...(frontmatter as TaskFrontmatter),
      filepath,
      body,
    };
  } catch (e) {
    logError(`Failed to load task ${filepath}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

function saveTask(task: Task): void {
  const { filepath, body, ...frontmatter } = task;
  const content = serializeFrontmatter(frontmatter, body);
  fs.writeFileSync(filepath, content);
}

function loadAllTasks(): Task[] {
  const tasks: Task[] = [];

  // Load from both tasks and completed directories
  const directories = [BACKLOG_DIR, COMPLETED_DIR];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const epics = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const epic of epics) {
      const epicDir = path.join(dir, epic);
      const files = fs
        .readdirSync(epicDir)
        .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

      for (const file of files) {
        const task = loadTask(path.join(epicDir, file));
        if (task) {
          tasks.push(task);
        }
      }
    }
  }

  return tasks;
}

function loadWorkflowConfig(): WorkflowConfig | null {
  try {
    const content = fs.readFileSync(WORKFLOW_CONFIG_PATH, "utf-8");
    return yaml.parse(content) as WorkflowConfig;
  } catch (e) {
    logError(`Failed to load workflow config: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ============================================================================
// DEPENDENCY CHECKING
// ============================================================================

function getCompletedTaskIds(tasks: Task[]): Set<string> {
  return new Set(
    tasks.filter((t) => t.workflow_state === "DONE").map((t) => t.id)
  );
}

function canStartTask(task: Task, completedIds: Set<string>): boolean {
  if (task.workflow_state === "DONE") return false;
  if (!task.depends_on || task.depends_on.length === 0) return true;

  return task.depends_on.every((dep) => completedIds.has(dep));
}

function getReadyTasks(tasks: Task[]): Task[] {
  const completedIds = getCompletedTaskIds(tasks);

  return tasks.filter(
    (t) =>
      canStartTask(t, completedIds) &&
      t.workflow_state !== "DONE" &&
      !t.breakpoint
  );
}

function getBlockedTasks(tasks: Task[]): { task: Task; blockedBy: string[] }[] {
  const completedIds = getCompletedTaskIds(tasks);

  return tasks
    .filter(
      (t) => t.workflow_state !== "DONE" && !canStartTask(t, completedIds)
    )
    .map((t) => ({
      task: t,
      blockedBy: (t.depends_on || []).filter((dep) => !completedIds.has(dep)),
    }));
}

// ============================================================================
// CLAUDE CODE EXECUTION
// ============================================================================

async function runClaudeCode(
  command: string,
  taskId: string,
  _freshContext: boolean = false
): Promise<RunResult> {
  const args = [
    "-p", // Headless/print mode
    `/${command} ${taskId}`,
    "--output-format",
    "stream-json", // Use streaming JSON for real-time output
  ];

  // For fresh context, we don't resume any session
  // For continuous context, we could add --resume here

  logStep("CLAUDE", `Running: claude ${args.join(" ")}`);

  return new Promise((resolve) => {
    let output = "";
    let errorOutput = "";
    let buffer = "";

    const proc = spawn("claude", args, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    proc.stdout.on("data", (data) => {
      buffer += data.toString();

      // Process complete JSON lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line);
          output += line + "\n";

          // Display based on event type
          switch (event.type) {
            case "assistant":
              // Assistant text output
              if (event.message?.content) {
                for (const block of event.message.content) {
                  if (block.type === "text" && block.text) {
                    process.stdout.write(colors.gray + block.text + colors.reset);
                  } else if (block.type === "tool_use") {
                    log(
                      `${colors.cyan}[TOOL]${colors.reset} ${block.name}`
                    );
                  }
                }
              }
              break;

            case "content_block_delta":
              // Streaming text delta
              if (event.delta?.text) {
                process.stdout.write(colors.gray + event.delta.text + colors.reset);
              }
              break;

            case "result":
              // Final result
              if (event.result) {
                log("");
                log(`${colors.green}[RESULT]${colors.reset} ${event.result.slice(0, 100)}...`);
              }
              break;

            case "error":
              log(`${colors.red}[ERROR]${colors.reset} ${event.error?.message || "Unknown error"}`);
              break;

            default:
              // Log other event types for debugging
              if (process.env.DEBUG) {
                log(`${colors.gray}[${event.type}]${colors.reset}`);
              }
          }
        } catch {
          // Not JSON, output as-is
          process.stdout.write(colors.gray + line + colors.reset + "\n");
        }
      }
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(colors.red + text + colors.reset);
    });

    proc.on("close", (code) => {
      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === "result" && event.result) {
            log(`${colors.green}[DONE]${colors.reset}`);
          }
        } catch {
          // Ignore
        }
      }

      log(""); // Newline after streaming output

      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({
          success: false,
          output,
          error: errorOutput || `Process exited with code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output,
        error: `Failed to start claude: ${err.message}`,
      });
    });
  });
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

function getNextCommand(state: WorkflowState): string | null {
  return STATE_COMMANDS[state] || null;
}

function shouldSkipUIReview(task: Task, state: WorkflowState): boolean {
  // Backend-only tasks skip UX_REVIEW and UI_REVIEW
  if (task.task_type === "backend") {
    return state === "UX_REVIEW" || state === "UI_REVIEW";
  }
  return false;
}

function getNextState(
  currentState: WorkflowState,
  rejected: boolean = false,
  task?: Task
): WorkflowState | null {
  if (rejected) {
    // Rejection paths
    // Note: Rejections go to TESTS_READY (not IMPLEMENTING) so the implement command runs
    if (currentState === "UX_REVIEW") return "ANALYZING";
    if (currentState === "PLAN_REVIEW") return "ANALYZING";
    if (currentState === "UI_REVIEW") return "TESTS_READY";
    if (currentState === "CODE_REVIEW") return "TESTS_READY";
    if (currentState === "QA_REVIEW") return "TESTS_READY";
    if (currentState === "INTEGRATION_TESTING") return "INTEGRATION_FAILED";
  }

  const nextState = STATE_TRANSITIONS[currentState];

  // If task is backend-only, skip UI review states
  if (task && nextState && shouldSkipUIReview(task, nextState)) {
    // Skip to the state after the UI review
    if (nextState === "UX_REVIEW") {
      return STATE_TRANSITIONS["UX_REVIEW"]; // Skip to PLAN_REVIEW
    }
    if (nextState === "UI_REVIEW") {
      return STATE_TRANSITIONS["UI_REVIEW"]; // Skip to CODE_REVIEW
    }
  }

  return nextState;
}

function needsFreshContext(state: WorkflowState): boolean {
  return state === "UI_REVIEW" || state === "CODE_REVIEW" || state === "QA_REVIEW";
}

function updateTaskHistory(
  task: Task,
  fromState: WorkflowState,
  toState: WorkflowState,
  agent: string
): void {
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const historyLine = `| ${timestamp} | ${fromState} → ${toState} | ${agent} |`;

  // Find the History table and append
  const historyMatch = task.body.match(
    /(## History\n\n\|[^\n]+\n\|[^\n]+\n)([\s\S]*?)(\n\n##|$)/
  );
  if (historyMatch && historyMatch.index !== undefined && historyMatch[1] && historyMatch[2]) {
    const matchIndex = historyMatch.index;
    const beforeHistory = task.body.slice(
      0,
      matchIndex + historyMatch[1].length
    );
    const existingRows = historyMatch[2];
    const afterHistory = task.body.slice(
      matchIndex + historyMatch[0].length
    );

    task.body =
      beforeHistory +
      existingRows +
      historyLine +
      "\n" +
      (afterHistory.startsWith("\n\n##")
        ? afterHistory
        : "\n\n##" + afterHistory.slice(2));
  }
}

async function runWorkflowStep(
  task: Task,
  _config: WorkflowConfig
): Promise<boolean> {
  const currentState = task.workflow_state;

  // Check for breakpoint
  if (task.breakpoint) {
    logWarning(`Task ${task.id} has breakpoint at ${currentState}. Skipping.`);
    return false;
  }

  // Check if this is a terminal state
  if (currentState === "DONE") {
    logInfo(`Task ${task.id} is already complete.`);
    return false;
  }

  // Check if current state should be skipped for backend-only tasks
  if (shouldSkipUIReview(task, currentState)) {
    const nextState = getNextState(currentState, false, task);
    if (nextState) {
      logStep(
        "SKIP",
        `${task.id}: Skipping ${currentState} (backend-only task) → ${nextState}`
      );
      task.workflow_state = nextState;
      task.updated_at = new Date().toISOString();
      saveTask(task);
      return true; // Continue to next step
    }
    return false;
  }

  // Check if GitHub automation should be skipped
  if (task.skip_github && currentState === "PR_READY") {
    logWarning(
      `Task ${task.id} has skip_github=true. Skipping GitHub automation.`
    );
    logInfo(
      `Please manually commit and create PR for ${task.id}, then set workflow_state to DONE.`
    );
    return false; // Stop here, manual intervention required
  }

  // Get the command to run for this state
  const command = getNextCommand(currentState);

  if (!command) {
    // This is an intermediate state, auto-transition
    const nextState = getNextState(currentState, false, task);
    if (nextState) {
      logStep("TRANSITION", `${task.id}: ${currentState} → ${nextState}`);
      task.workflow_state = nextState;
      task.updated_at = new Date().toISOString();
      saveTask(task);
      return true; // Continue to next step
    }
    return false;
  }

  // Determine agent from the command being run
  const agentName = COMMAND_AGENTS[command] || "unknown";

  logStep("RUNNING", `${task.id}: ${command} (${agentName} agent)`);

  // Update task as in-progress
  task.assigned_agent = agentName;
  task.updated_at = new Date().toISOString();
  if (!task.started_at) {
    task.started_at = new Date().toISOString();
  }
  saveTask(task);

  // Run Claude Code
  const freshContext = needsFreshContext(currentState);
  const result = await runClaudeCode(command, task.id, freshContext);

  if (!result.success) {
    logError(`Agent failed for ${task.id}: ${result.error}`);
    task.assigned_agent = "";
    saveTask(task);
    return false;
  }

  // Reload task (agent may have modified it)
  const updatedTask = loadTask(task.filepath);
  if (!updatedTask) {
    logError(`Failed to reload task ${task.id} after agent run`);
    return false;
  }

  // Check if agent updated the state
  if (updatedTask.workflow_state !== currentState) {
    logSuccess(`${task.id}: ${currentState} → ${updatedTask.workflow_state}`);
    return updatedTask.workflow_state !== "DONE"; // Continue if not done
  }

  // Agent didn't update state - do it ourselves
  const nextState = getNextState(currentState, false, updatedTask);
  if (nextState) {
    logStep("TRANSITION", `${task.id}: ${currentState} → ${nextState}`);
    updatedTask.workflow_state = nextState;
    updatedTask.assigned_agent = "";
    updatedTask.updated_at = new Date().toISOString();
    updateTaskHistory(updatedTask, currentState, nextState, agentName);
    saveTask(updatedTask);
    return nextState !== "DONE";
  }

  return false;
}

async function runFullWorkflow(
  taskId: string,
  config: WorkflowConfig
): Promise<void> {
  const tasks = loadAllTasks();
  let task = tasks.find((t) => t.id === taskId);

  if (!task) {
    logError(`Task not found: ${taskId}`);
    return;
  }

  // Check dependencies
  const completedIds = getCompletedTaskIds(tasks);
  if (!canStartTask(task, completedIds)) {
    const blockedBy = (task.depends_on || []).filter(
      (d) => !completedIds.has(d)
    );
    logError(`Task ${taskId} is blocked by: ${blockedBy.join(", ")}`);
    return;
  }

  log("");
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  log(`${colors.bold}  Running Workflow: ${task.id}${colors.reset}`);
  log(`${colors.bold}  ${task.title}${colors.reset}`);
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  log("");

  const taskFilepath = task.filepath;
  let currentTask: Task | undefined = task;
  let continueWorkflow = true;
  let iterations = 0;
  const maxIterations = 20; // Safety limit

  while (continueWorkflow && iterations < maxIterations) {
    iterations++;

    // Reload task to get latest state
    currentTask = loadTask(taskFilepath);
    if (!currentTask) {
      logError("Failed to reload task");
      break;
    }

    // Check for default breakpoints
    if (
      config.default_breakpoints.includes(currentTask.workflow_state) &&
      !currentTask.breakpoint
    ) {
      logWarning(
        `Default breakpoint at ${currentTask.workflow_state}. Use --force to continue.`
      );
      break;
    }

    continueWorkflow = await runWorkflowStep(currentTask, config);

    if (continueWorkflow) {
      log(""); // Spacing between steps
    }
  }

  // Final status
  const finalTask = loadTask(taskFilepath);
  if (finalTask) {
    log("");
    if (finalTask.workflow_state === "DONE") {
      logSuccess(`Task ${finalTask.id} completed!`);
    } else {
      logInfo(`Task ${finalTask.id} paused at ${finalTask.workflow_state}`);
    }
  }
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

function showStatus(taskId?: string): void {
  const tasks = loadAllTasks();

  if (taskId) {
    // Show specific task
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      logError(`Task not found: ${taskId}`);
      return;
    }

    const completedIds = getCompletedTaskIds(tasks);
    const depsStatus = (task.depends_on || []).map(
      (d) => `${completedIds.has(d) ? "✅" : "⏳"} ${d}`
    );
    const blocksStatus = (task.blocks || []).map((b) => {
      const blocked = tasks.find((t) => t.id === b);
      return `⏳ ${b} (${blocked?.workflow_state || "unknown"})`;
    });

    log("");
    log(`${colors.bold}📋 ${task.id}: ${task.title}${colors.reset}`);
    log("");
    log(`State:    ${colors.cyan}${task.workflow_state}${colors.reset}`);
    log(`Epic:     ${task.epic}`);
    log(`Priority: ${task.priority}`);
    log(`Agent:    ${task.assigned_agent || "none"}`);
    log("");

    if (depsStatus.length > 0) {
      log("Dependencies:");
      depsStatus.forEach((d) => log(`  ${d}`));
      log("");
    }

    if (blocksStatus.length > 0) {
      log("Blocks:");
      blocksStatus.forEach((b) => log(`  ${b}`));
      log("");
    }

    if (task.spec_file) log(`Spec:  ${task.spec_file}`);
    if (task.test_files?.length) log(`Tests: ${task.test_files.join(", ")}`);
    if (task.code_files?.length) log(`Code:  ${task.code_files.join(", ")}`);
  } else {
    // Show board
    const byState = new Map<WorkflowState, Task[]>();

    for (const task of tasks) {
      const state = task.workflow_state;
      if (!byState.has(state)) {
        byState.set(state, []);
      }
      byState.get(state)!.push(task);
    }

    log("");
    log(`${colors.bold}📊 Raptscallions Task Board${colors.reset}`);
    log("");

    const stateOrder: WorkflowState[] = [
      "BACKLOG",
      "BREAKING_DOWN",
      "DRAFT",
      "ANALYZING",
      "ANALYZED",
      "UX_REVIEW",
      "PLAN_REVIEW",
      "APPROVED",
      "WRITING_TESTS",
      "TESTS_READY",
      "TESTS_REVISION_NEEDED",
      "IMPLEMENTING",
      "IMPLEMENTED",
      "UI_REVIEW",
      "CODE_REVIEW",
      "QA_REVIEW",
      "INTEGRATION_TESTING",
      "INTEGRATION_FAILED",
      "DOCS_UPDATE",
      "PR_READY",
      "PR_CREATED",
      "PR_REVIEW",
      "PR_FAILED",
      "DONE",
    ];

    for (const state of stateOrder) {
      const stateTasks = byState.get(state) || [];
      const color =
        state === "DONE"
          ? colors.green
          : state.includes("REVIEW")
          ? colors.yellow
          : colors.cyan;

      log(`${color}${state}${colors.reset} (${stateTasks.length})`);

      for (const task of stateTasks) {
        const breakpointIndicator = task.breakpoint
          ? ` ${colors.yellow}[BREAKPOINT]${colors.reset}`
          : "";
        log(`  └── ${task.id}: ${task.title}${breakpointIndicator}`);
      }

      if (stateTasks.length === 0) {
        log(`  ${colors.gray}(empty)${colors.reset}`);
      }
      log("");
    }
  }
}

function showNext(): void {
  const tasks = loadAllTasks();
  const ready = getReadyTasks(tasks);
  const blocked = getBlockedTasks(tasks);

  log("");
  log(`${colors.bold}📋 Ready Tasks${colors.reset}`);
  log("");

  if (ready.length === 0) {
    log(`  ${colors.gray}No tasks ready${colors.reset}`);
  } else {
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    ready.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const task of ready) {
      const command = getNextCommand(task.workflow_state);
      const nextStep = command ? `/${command} ${task.id}` : "auto-transition";

      log(`${colors.green}${task.id}${colors.reset}: ${task.title}`);
      log(`  State: ${task.workflow_state} | Priority: ${task.priority}`);
      log(`  Next: ${colors.cyan}${nextStep}${colors.reset}`);
      log("");
    }
  }

  // Show breakpoint tasks
  const breakpointTasks = tasks.filter(
    (t) => t.breakpoint && t.workflow_state !== "DONE"
  );
  if (breakpointTasks.length > 0) {
    log(`${colors.bold}⏸️  Paused (breakpoint)${colors.reset}`);
    log("");
    for (const task of breakpointTasks) {
      log(`  ${task.id}: ${task.title}`);
      log(`    State: ${task.workflow_state}`);
    }
    log("");
  }

  // Show blocked
  if (blocked.length > 0) {
    log(`${colors.bold}🚫 Blocked${colors.reset}`);
    log("");
    for (const { task, blockedBy } of blocked.slice(0, 5)) {
      log(`  ${colors.gray}${task.id}${colors.reset}: ${task.title}`);
      log(`    Blocked by: ${blockedBy.join(", ")}`);
    }
    if (blocked.length > 5) {
      log(`  ${colors.gray}... and ${blocked.length - 5} more${colors.reset}`);
    }
  }
}

function setBreakpoint(taskId: string, enable: boolean): void {
  const tasks = loadAllTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    logError(`Task not found: ${taskId}`);
    return;
  }

  task.breakpoint = enable;
  task.updated_at = new Date().toISOString();
  saveTask(task);

  if (enable) {
    logSuccess(`Breakpoint set on ${taskId}`);
  } else {
    logSuccess(`Breakpoint cleared on ${taskId}`);
  }
}

function setSkipGitHub(taskId: string, enable: boolean): void {
  const tasks = loadAllTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    logError(`Task not found: ${taskId}`);
    return;
  }

  task.skip_github = enable;
  task.updated_at = new Date().toISOString();
  saveTask(task);

  if (enable) {
    logSuccess(`GitHub automation disabled for ${taskId}`);
    logInfo(`Task will pause at PR_READY for manual git/PR workflow`);
  } else {
    logSuccess(`GitHub automation enabled for ${taskId}`);
  }
}

// ============================================================================
// EPIC UTILITIES
// ============================================================================

function getTasksByEpic(tasks: Task[]): Map<string, Task[]> {
  const byEpic = new Map<string, Task[]>();
  for (const task of tasks) {
    const epic = task.epic;
    if (!byEpic.has(epic)) {
      byEpic.set(epic, []);
    }
    byEpic.get(epic)!.push(task);
  }
  return byEpic;
}

function isEpicComplete(epicTasks: Task[]): boolean {
  return epicTasks.length > 0 && epicTasks.every((t) => t.workflow_state === "DONE");
}

function getCompletedEpics(tasks: Task[]): Set<string> {
  const byEpic = getTasksByEpic(tasks);
  const completed = new Set<string>();
  for (const [epicId, epicTasks] of Array.from(byEpic.entries())) {
    if (isEpicComplete(epicTasks)) {
      completed.add(epicId);
    }
  }
  return completed;
}

// ============================================================================
// MAIN
// ============================================================================

async function runAutoMode(
  config: WorkflowConfig,
  continuous: boolean = false
): Promise<void> {
  log("");
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  log(
    `${colors.bold}  ${continuous ? "Continuous" : "Auto"} Mode - Running All Ready Tasks${colors.reset}`
  );
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  log("");

  let tasksProcessed = 0;
  let epicsCompleted = 0;
  let continueLoop = true;
  const reviewedEpics = new Set<string>(); // Track which epics we've already reviewed

  while (continueLoop) {
    const tasks = loadAllTasks();
    const ready = getReadyTasks(tasks);

    // Sort by epic first (complete earlier epics before starting new ones), then by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    ready.sort((a, b) => {
      // First by epic (complete earlier epics first)
      if (a.epic !== b.epic) {
        return a.epic.localeCompare(b.epic);
      }
      // Then by priority
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (ready.length === 0) {
      // Check if there are any epics that are complete but not yet reviewed
      const completedEpics = getCompletedEpics(tasks);
      const unreviewedEpics = Array.from(completedEpics).filter((e) => !reviewedEpics.has(e));

      if (unreviewedEpics.length > 0) {
        // Run epic review for each unreviewed completed epic
        for (const epicId of unreviewedEpics) {
          logSuccess(`All tasks in epic ${epicId} completed!`);
          epicsCompleted++;

          log("");
          logStep("EPIC REVIEW", `Running epic review for ${epicId}...`);

          // Run epic review with PM agent
          const reviewResult = await runClaudeCode(
            "epic-review",
            `${epicId} --create --threshold high`,
            false
          );

          reviewedEpics.add(epicId);

          if (reviewResult.success) {
            logSuccess(`Epic ${epicId} review complete. Follow-up tasks created if needed.`);

            // Reload tasks to pick up any new follow-up tasks
            const updatedTasks = loadAllTasks();
            const newReady = getReadyTasks(updatedTasks);

            if (newReady.length > 0) {
              logInfo(`Found ${newReady.length} follow-up task(s) from epic review. Processing...`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              break; // Break inner loop to restart outer while loop
            }
          } else {
            logWarning(`Epic review failed: ${reviewResult.error}`);
            logInfo(`You may want to run manually: claude -p '/epic-review ${epicId}'`);
          }
        }

        // If we processed epic reviews, check for more ready tasks
        const afterReviewTasks = loadAllTasks();
        const afterReviewReady = getReadyTasks(afterReviewTasks);
        if (afterReviewReady.length > 0) {
          continue; // Loop back to process follow-up tasks
        }
      }

      // Check if ALL epics are complete (for continuous mode)
      const allEpicsComplete = tasks.length > 0 &&
        Array.from(getTasksByEpic(tasks).values()).every((epicTasks) => isEpicComplete(epicTasks));

      if (allEpicsComplete && continuous) {
        log("");
        logStep("CONTINUOUS", "All current epics complete. Creating next epic via PM agent...");

        // Call PM agent to create next epic based on roadmap
        const result = await runClaudeCode("roadmap", "plan-next", false);

        if (result.success) {
          logSuccess("Next epic created. Continuing...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue; // Loop back to process new tasks
        } else {
          logWarning("Failed to create next epic. Stopping.");
          logInfo("Run manually: claude -p '/plan <next-goal>'");
          continueLoop = false;
        }
      } else if (!allEpicsComplete) {
        logInfo("No ready tasks. Blocked or waiting for dependencies.");
        // Show which tasks are blocking progress
        const byEpic = getTasksByEpic(tasks);
        for (const [epicId, epicTasks] of Array.from(byEpic.entries())) {
          const incomplete = epicTasks.filter((t) => t.workflow_state !== "DONE");
          if (incomplete.length > 0) {
            const states = incomplete.map((t) => `${t.id}:${t.workflow_state}`).join(", ");
            logInfo(`  ${epicId}: ${states}`);
          }
        }
        continueLoop = false;
      } else {
        log("");
        logInfo("All tasks complete. To create the next epic, run: claude -p '/plan <next-goal>'");
        logInfo("Or use --continuous flag to auto-create next epics");
        continueLoop = false;
      }
      break;
    }

    // Pick the highest priority ready task
    const nextTask = ready[0];
    if (!nextTask) {
      continueLoop = false;
      break;
    }

    log("");
    logStep("AUTO", `Picking next task: ${nextTask.id} (${nextTask.priority})`);

    await runFullWorkflow(nextTask.id, config);
    tasksProcessed++;

    // Reload to check if task completed or hit breakpoint
    const updatedTask = loadTask(nextTask.filepath);
    if (updatedTask?.breakpoint) {
      logWarning(`Task ${nextTask.id} hit breakpoint. Stopping auto mode.`);
      continueLoop = false;
    }

    // Small delay between tasks
    if (continueLoop) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  log("");
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  logSuccess(
    `${continuous ? "Continuous" : "Auto"} mode complete. Processed ${tasksProcessed} task(s), ${epicsCompleted} epic(s).`
  );
  log(
    `${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Load config
  const config = loadWorkflowConfig();
  if (!config) {
    logError("Failed to load workflow configuration");
    process.exit(1);
  }

  switch (command) {
    case "run": {
      const taskId = args[1];
      const hasContinuous =
        args.includes("--continuous") || args.includes("-c");

      if (taskId === "--auto" || taskId === "-a") {
        await runAutoMode(config, hasContinuous);
        break;
      }
      if (taskId === "--continuous" || taskId === "-c") {
        await runAutoMode(config, true);
        break;
      }
      if (!taskId) {
        logError("Usage: pnpm workflow:run <task-id> | --auto | --continuous");
        process.exit(1);
      }
      await runFullWorkflow(taskId, config);
      break;
    }

    case "status": {
      const taskId = args[1];
      showStatus(taskId);
      break;
    }

    case "next": {
      showNext();
      break;
    }

    case "breakpoint": {
      const taskId = args[1];
      const action = args[2]; // 'set' or 'clear'
      if (!taskId || !action || !["set", "clear"].includes(action)) {
        logError("Usage: pnpm workflow:breakpoint <task-id> <set|clear>");
        process.exit(1);
      }
      setBreakpoint(taskId, action === "set");
      break;
    }

    case "skip-github": {
      const taskId = args[1];
      const action = args[2]; // 'set' or 'clear'
      if (!taskId || !action || !["set", "clear"].includes(action)) {
        logError("Usage: pnpm workflow:skip-github <task-id> <set|clear>");
        process.exit(1);
      }
      setSkipGitHub(taskId, action === "set");
      break;
    }

    case "help":
    default: {
      log("");
      log(`${colors.bold}Raptscallions Workflow Orchestrator${colors.reset}`);
      log("");
      log("Commands:");
      log("  pnpm workflow:run <task-id>              Run workflow for a task");
      log("  pnpm workflow:run --auto                 Auto-run all ready tasks");
      log("  pnpm workflow:run --continuous           Auto-run and create next epics");
      log(
        "  pnpm workflow:status [task-id]           Show task board or specific task"
      );
      log(
        "  pnpm workflow:next                       Show next available tasks"
      );
      log("  pnpm workflow:breakpoint <id> set|clear  Set or clear breakpoint");
      log("  pnpm workflow:skip-github <id> set|clear Skip GitHub automation");
      log("");
      log("Flags:");
      log("  --auto, -a         Run all ready tasks in priority order");
      log("  --continuous, -c   Like --auto, but also creates next epic when done");
      log("");
      log("Epic Completion Flow:");
      log("  1. All tasks in epic reach DONE");
      log("  2. PM agent runs epic review (analyzes all reviews)");
      log("  3. Follow-up tasks created for unresolved issues");
      log("  4. Follow-up tasks processed");
      log("  5. [If continuous] Next epic created and started");
      log("");
      log("Stops when:");
      log("  - All tasks are complete (or next epic created in continuous mode)");
      log("  - A task hits a breakpoint");
      log("  - No more ready tasks (blocked by dependencies)");
      log("");
    }
  }
}

main().catch((err: unknown) => {
  logError(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
