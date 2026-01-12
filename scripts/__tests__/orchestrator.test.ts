/**
 * Orchestrator Test Suite
 *
 * Tests the workflow orchestrator's core logic:
 * - State transitions (happy path and rejections)
 * - Dependency checking
 * - Epic completion detection
 * - Task sorting and prioritization
 */

import { describe, it, expect, beforeEach } from "vitest";

// =============================================================================
// TYPES (copied from orchestrator.ts for testing)
// =============================================================================

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

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  workflow_state: WorkflowState;
  epic: string;
  depends_on: string[];
  blocks: string[];
  breakpoint: boolean;
}

// =============================================================================
// FUNCTIONS UNDER TEST (extracted from orchestrator.ts)
// =============================================================================

const STATE_COMMANDS: Record<WorkflowState, string | null> = {
  BACKLOG: "plan",
  BREAKING_DOWN: null,
  DRAFT: "analyze",
  ANALYZING: null,
  ANALYZED: "review-ux",
  UX_REVIEW: null,
  PLAN_REVIEW: "review-plan",
  APPROVED: "write-tests",
  WRITING_TESTS: null,
  TESTS_READY: "implement",
  TESTS_REVISION_NEEDED: "write-tests",
  IMPLEMENTING: null,
  IMPLEMENTED: "review-ui",
  UI_REVIEW: null,
  CODE_REVIEW: "review-code",
  QA_REVIEW: "qa",
  INTEGRATION_TESTING: "integration-test",
  INTEGRATION_FAILED: "investigate-failure",
  DOCS_UPDATE: "update-docs",
  PR_READY: "commit-and-pr",
  PR_CREATED: null,
  PR_REVIEW: null,
  PR_FAILED: null,
  DONE: null,
};

const STATE_TRANSITIONS: Record<WorkflowState, WorkflowState | null> = {
  BACKLOG: "BREAKING_DOWN",
  BREAKING_DOWN: "DRAFT",
  DRAFT: "ANALYZING",
  ANALYZING: "ANALYZED",
  ANALYZED: "UX_REVIEW",
  UX_REVIEW: "PLAN_REVIEW",
  PLAN_REVIEW: "APPROVED",
  APPROVED: "WRITING_TESTS",
  WRITING_TESTS: "TESTS_READY",
  TESTS_READY: "IMPLEMENTING",
  TESTS_REVISION_NEEDED: "TESTS_READY",
  IMPLEMENTING: "IMPLEMENTED",
  IMPLEMENTED: "UI_REVIEW",
  UI_REVIEW: "CODE_REVIEW",
  CODE_REVIEW: "QA_REVIEW",
  QA_REVIEW: "INTEGRATION_TESTING",
  INTEGRATION_TESTING: "DOCS_UPDATE",
  INTEGRATION_FAILED: null,
  DOCS_UPDATE: "PR_READY",
  PR_READY: "PR_CREATED",
  PR_CREATED: "DONE",
  PR_REVIEW: "DONE",
  PR_FAILED: null,
  DONE: null,
};

function getNextCommand(state: WorkflowState): string | null {
  return STATE_COMMANDS[state] || null;
}

function getNextState(
  currentState: WorkflowState,
  rejected: boolean = false
): WorkflowState | null {
  if (rejected) {
    if (currentState === "UX_REVIEW") return "ANALYZING";
    if (currentState === "PLAN_REVIEW") return "ANALYZING";
    if (currentState === "UI_REVIEW") return "IMPLEMENTING";
    if (currentState === "CODE_REVIEW") return "IMPLEMENTING";
    if (currentState === "QA_REVIEW") return "IMPLEMENTING";
    if (currentState === "INTEGRATION_TESTING") return "INTEGRATION_FAILED";
  }
  return STATE_TRANSITIONS[currentState];
}

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
  return (
    epicTasks.length > 0 && epicTasks.every((t) => t.workflow_state === "DONE")
  );
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

function needsFreshContext(state: WorkflowState): boolean {
  return (
    state === "UI_REVIEW" || state === "CODE_REVIEW" || state === "QA_REVIEW"
  );
}

// Helper to create test tasks
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "E01-T001",
    title: "Test Task",
    status: "todo",
    priority: "medium",
    workflow_state: "DRAFT",
    epic: "E01",
    depends_on: [],
    blocks: [],
    breakpoint: false,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe("Orchestrator", () => {
  describe("State Transitions", () => {
    describe("Happy Path", () => {
      it("should transition through all states from DRAFT to DONE", () => {
        const expectedPath: WorkflowState[] = [
          "DRAFT",
          "ANALYZING",
          "ANALYZED",
          "UX_REVIEW",
          "PLAN_REVIEW",
          "APPROVED",
          "WRITING_TESTS",
          "TESTS_READY",
          "IMPLEMENTING",
          "IMPLEMENTED",
          "UI_REVIEW",
          "CODE_REVIEW",
          "QA_REVIEW",
          "INTEGRATION_TESTING",
          "DOCS_UPDATE",
          "PR_READY",
          "PR_CREATED",
          "DONE",
        ];

        let currentState: WorkflowState = "DRAFT";
        const actualPath: WorkflowState[] = [currentState];

        while (currentState !== "DONE") {
          const nextState = getNextState(currentState);
          expect(nextState).not.toBeNull();
          currentState = nextState!;
          actualPath.push(currentState);
        }

        expect(actualPath).toEqual(expectedPath);
      });

      it("should have no next state from DONE", () => {
        expect(getNextState("DONE")).toBeNull();
      });

      it("should transition TESTS_REVISION_NEEDED back to TESTS_READY", () => {
        expect(getNextState("TESTS_REVISION_NEEDED")).toBe("TESTS_READY");
      });

      it("should have no automatic next state from INTEGRATION_FAILED", () => {
        expect(getNextState("INTEGRATION_FAILED")).toBeNull();
      });
    });

    describe("Rejection Paths", () => {
      it("should reject UX_REVIEW back to ANALYZING", () => {
        expect(getNextState("UX_REVIEW", true)).toBe("ANALYZING");
      });

      it("should reject PLAN_REVIEW back to ANALYZING", () => {
        expect(getNextState("PLAN_REVIEW", true)).toBe("ANALYZING");
      });

      it("should reject UI_REVIEW back to IMPLEMENTING", () => {
        expect(getNextState("UI_REVIEW", true)).toBe("IMPLEMENTING");
      });

      it("should reject CODE_REVIEW back to IMPLEMENTING", () => {
        expect(getNextState("CODE_REVIEW", true)).toBe("IMPLEMENTING");
      });

      it("should reject QA_REVIEW back to IMPLEMENTING", () => {
        expect(getNextState("QA_REVIEW", true)).toBe("IMPLEMENTING");
      });

      it("should reject INTEGRATION_TESTING to INTEGRATION_FAILED", () => {
        expect(getNextState("INTEGRATION_TESTING", true)).toBe(
          "INTEGRATION_FAILED"
        );
      });

      it("should not affect states without rejection paths", () => {
        expect(getNextState("DRAFT", true)).toBe("ANALYZING");
        expect(getNextState("IMPLEMENTING", true)).toBe("IMPLEMENTED");
      });
    });

    describe("Complete Workflow Paths", () => {
      it("should handle UX rejection cycle correctly", () => {
        // Start at UX_REVIEW, get rejected, go back through analysis
        let state: WorkflowState = "UX_REVIEW";

        // Rejection
        state = getNextState(state, true)!;
        expect(state).toBe("ANALYZING");

        // Re-analyze
        state = getNextState(state)!;
        expect(state).toBe("ANALYZED");

        // Back to UX review
        state = getNextState(state)!;
        expect(state).toBe("UX_REVIEW");
      });

      it("should handle integration failure investigation cycle", () => {
        // Integration testing fails
        let state: WorkflowState = "INTEGRATION_TESTING";
        state = getNextState(state, true)!;
        expect(state).toBe("INTEGRATION_FAILED");

        // Investigation determines tests are wrong
        // Agent would manually set to TESTS_REVISION_NEEDED
        state = "TESTS_REVISION_NEEDED";
        state = getNextState(state)!;
        expect(state).toBe("TESTS_READY");

        // Back through implementation
        state = getNextState(state)!;
        expect(state).toBe("IMPLEMENTING");
      });

      it("should handle QA rejection and recovery", () => {
        let state: WorkflowState = "QA_REVIEW";

        // QA rejects
        state = getNextState(state, true)!;
        expect(state).toBe("IMPLEMENTING");

        // Fix and go through reviews again
        state = getNextState(state)!;
        expect(state).toBe("IMPLEMENTED");

        state = getNextState(state)!;
        expect(state).toBe("UI_REVIEW");

        state = getNextState(state)!;
        expect(state).toBe("CODE_REVIEW");

        state = getNextState(state)!;
        expect(state).toBe("QA_REVIEW");

        // This time QA passes
        state = getNextState(state)!;
        expect(state).toBe("INTEGRATION_TESTING");
      });
    });
  });

  describe("Command Mapping", () => {
    it("should return correct command for each actionable state", () => {
      expect(getNextCommand("DRAFT")).toBe("analyze");
      expect(getNextCommand("ANALYZED")).toBe("review-ux");
      expect(getNextCommand("PLAN_REVIEW")).toBe("review-plan");
      expect(getNextCommand("APPROVED")).toBe("write-tests");
      expect(getNextCommand("TESTS_READY")).toBe("implement");
      expect(getNextCommand("TESTS_REVISION_NEEDED")).toBe("write-tests");
      expect(getNextCommand("IMPLEMENTED")).toBe("review-ui");
      expect(getNextCommand("CODE_REVIEW")).toBe("review-code");
      expect(getNextCommand("QA_REVIEW")).toBe("qa");
      expect(getNextCommand("INTEGRATION_TESTING")).toBe("integration-test");
      expect(getNextCommand("INTEGRATION_FAILED")).toBe("investigate-failure");
      expect(getNextCommand("DOCS_UPDATE")).toBe("update-docs");
    });

    it("should return null for intermediate states", () => {
      expect(getNextCommand("BREAKING_DOWN")).toBeNull();
      expect(getNextCommand("ANALYZING")).toBeNull();
      expect(getNextCommand("UX_REVIEW")).toBeNull();
      expect(getNextCommand("WRITING_TESTS")).toBeNull();
      expect(getNextCommand("IMPLEMENTING")).toBeNull();
      expect(getNextCommand("UI_REVIEW")).toBeNull();
      expect(getNextCommand("DONE")).toBeNull();
    });

    it("should have commands for all states that need agent action", () => {
      const statesNeedingCommands: WorkflowState[] = [
        "BACKLOG",
        "DRAFT",
        "ANALYZED",
        "PLAN_REVIEW",
        "APPROVED",
        "TESTS_READY",
        "TESTS_REVISION_NEEDED",
        "IMPLEMENTED",
        "CODE_REVIEW",
        "QA_REVIEW",
        "INTEGRATION_TESTING",
        "INTEGRATION_FAILED",
        "DOCS_UPDATE",
      ];

      for (const state of statesNeedingCommands) {
        expect(getNextCommand(state)).not.toBeNull();
      }
    });
  });

  describe("Dependency Checking", () => {
    it("should mark task with no dependencies as startable", () => {
      const task = createTask({ depends_on: [] });
      const completedIds = new Set<string>();

      expect(canStartTask(task, completedIds)).toBe(true);
    });

    it("should block task when dependencies are not complete", () => {
      const task = createTask({ depends_on: ["E01-T001", "E01-T002"] });
      const completedIds = new Set<string>(["E01-T001"]);

      expect(canStartTask(task, completedIds)).toBe(false);
    });

    it("should allow task when all dependencies are complete", () => {
      const task = createTask({ depends_on: ["E01-T001", "E01-T002"] });
      const completedIds = new Set<string>(["E01-T001", "E01-T002"]);

      expect(canStartTask(task, completedIds)).toBe(true);
    });

    it("should not start already completed tasks", () => {
      const task = createTask({ workflow_state: "DONE", depends_on: [] });
      const completedIds = new Set<string>();

      expect(canStartTask(task, completedIds)).toBe(false);
    });

    it("should correctly identify completed task IDs", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", workflow_state: "DONE" }),
        createTask({ id: "E01-T002", workflow_state: "IMPLEMENTING" }),
        createTask({ id: "E01-T003", workflow_state: "DONE" }),
        createTask({ id: "E01-T004", workflow_state: "DRAFT" }),
      ];

      const completedIds = getCompletedTaskIds(tasks);

      expect(completedIds.has("E01-T001")).toBe(true);
      expect(completedIds.has("E01-T002")).toBe(false);
      expect(completedIds.has("E01-T003")).toBe(true);
      expect(completedIds.has("E01-T004")).toBe(false);
    });
  });

  describe("Ready Tasks", () => {
    it("should return tasks that have no blockers", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", depends_on: [] }),
        createTask({ id: "E01-T002", depends_on: [] }),
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(2);
    });

    it("should exclude tasks with incomplete dependencies", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", depends_on: [] }),
        createTask({ id: "E01-T002", depends_on: ["E01-T001"] }),
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(1);
      expect(ready[0]?.id).toBe("E01-T001");
    });

    it("should include tasks when dependencies are complete", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", workflow_state: "DONE", depends_on: [] }),
        createTask({ id: "E01-T002", depends_on: ["E01-T001"] }),
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(1);
      expect(ready[0]?.id).toBe("E01-T002");
    });

    it("should exclude completed tasks", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", workflow_state: "DONE", depends_on: [] }),
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(0);
    });

    it("should exclude tasks with breakpoints", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", breakpoint: true, depends_on: [] }),
        createTask({ id: "E01-T002", breakpoint: false, depends_on: [] }),
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(1);
      expect(ready[0]?.id).toBe("E01-T002");
    });

    it("should handle complex dependency chains", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", workflow_state: "DONE", depends_on: [] }),
        createTask({
          id: "E01-T002",
          workflow_state: "DONE",
          depends_on: ["E01-T001"],
        }),
        createTask({ id: "E01-T003", depends_on: ["E01-T002"] }),
        createTask({ id: "E01-T004", depends_on: ["E01-T003"] }), // Blocked by T003
      ];

      const ready = getReadyTasks(tasks);

      expect(ready.length).toBe(1);
      expect(ready[0]?.id).toBe("E01-T003");
    });
  });

  describe("Epic Management", () => {
    describe("getTasksByEpic", () => {
      it("should group tasks by epic", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E01-T002", epic: "E01" }),
          createTask({ id: "E02-T001", epic: "E02" }),
        ];

        const byEpic = getTasksByEpic(tasks);

        expect(byEpic.size).toBe(2);
        expect(byEpic.get("E01")?.length).toBe(2);
        expect(byEpic.get("E02")?.length).toBe(1);
      });

      it("should handle empty task list", () => {
        const byEpic = getTasksByEpic([]);

        expect(byEpic.size).toBe(0);
      });
    });

    describe("isEpicComplete", () => {
      it("should return true when all tasks are DONE", () => {
        const epicTasks: Task[] = [
          createTask({ id: "E01-T001", workflow_state: "DONE" }),
          createTask({ id: "E01-T002", workflow_state: "DONE" }),
        ];

        expect(isEpicComplete(epicTasks)).toBe(true);
      });

      it("should return false when any task is not DONE", () => {
        const epicTasks: Task[] = [
          createTask({ id: "E01-T001", workflow_state: "DONE" }),
          createTask({ id: "E01-T002", workflow_state: "IMPLEMENTING" }),
        ];

        expect(isEpicComplete(epicTasks)).toBe(false);
      });

      it("should return false for empty epic", () => {
        expect(isEpicComplete([])).toBe(false);
      });

      it("should return false when only some tasks are DONE", () => {
        const epicTasks: Task[] = [
          createTask({ id: "E01-T001", workflow_state: "DONE" }),
          createTask({ id: "E01-T002", workflow_state: "DONE" }),
          createTask({ id: "E01-T003", workflow_state: "DRAFT" }),
        ];

        expect(isEpicComplete(epicTasks)).toBe(false);
      });
    });

    describe("getCompletedEpics", () => {
      it("should return set of completed epic IDs", () => {
        const tasks: Task[] = [
          // E01 - complete
          createTask({ id: "E01-T001", epic: "E01", workflow_state: "DONE" }),
          createTask({ id: "E01-T002", epic: "E01", workflow_state: "DONE" }),
          // E02 - incomplete
          createTask({ id: "E02-T001", epic: "E02", workflow_state: "DONE" }),
          createTask({
            id: "E02-T002",
            epic: "E02",
            workflow_state: "IMPLEMENTING",
          }),
          // E03 - complete
          createTask({ id: "E03-T001", epic: "E03", workflow_state: "DONE" }),
        ];

        const completed = getCompletedEpics(tasks);

        expect(completed.size).toBe(2);
        expect(completed.has("E01")).toBe(true);
        expect(completed.has("E02")).toBe(false);
        expect(completed.has("E03")).toBe(true);
      });

      it("should return empty set when no epics are complete", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01", workflow_state: "DRAFT" }),
          createTask({
            id: "E02-T001",
            epic: "E02",
            workflow_state: "IMPLEMENTING",
          }),
        ];

        const completed = getCompletedEpics(tasks);

        expect(completed.size).toBe(0);
      });
    });

    describe("Epic Ordering in Auto Mode", () => {
      // Helper: simulates the sorting logic from runAutoMode
      function sortTasksForAutoMode(tasks: Task[]): Task[] {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return [...tasks].sort((a, b) => {
          // First by epic (complete earlier epics first)
          if (a.epic !== b.epic) {
            return a.epic.localeCompare(b.epic);
          }
          // Then by priority
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      }

      it("should prioritize earlier epics before later ones", () => {
        const tasks: Task[] = [
          createTask({ id: "E03-T001", epic: "E03", priority: "critical" }),
          createTask({ id: "E01-T001", epic: "E01", priority: "low" }),
          createTask({ id: "E02-T001", epic: "E02", priority: "high" }),
        ];

        const sorted = sortTasksForAutoMode(tasks);

        expect(sorted[0]?.id).toBe("E01-T001"); // E01 first despite low priority
        expect(sorted[1]?.id).toBe("E02-T001"); // E02 second
        expect(sorted[2]?.id).toBe("E03-T001"); // E03 last despite critical
      });

      it("should sort by priority within same epic", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01", priority: "low" }),
          createTask({ id: "E01-T002", epic: "E01", priority: "critical" }),
          createTask({ id: "E01-T003", epic: "E01", priority: "high" }),
        ];

        const sorted = sortTasksForAutoMode(tasks);

        expect(sorted[0]?.id).toBe("E01-T002"); // Critical first
        expect(sorted[1]?.id).toBe("E01-T003"); // High second
        expect(sorted[2]?.id).toBe("E01-T001"); // Low last
      });

      it("should prioritize incomplete E01 tasks over E02 tasks", () => {
        const tasks: Task[] = [
          // E01 - not complete
          createTask({ id: "E01-T001", epic: "E01", workflow_state: "DONE" }),
          createTask({
            id: "E01-T002",
            epic: "E01",
            workflow_state: "IMPLEMENTING",
          }),
          // E02 - also ready
          createTask({ id: "E02-T001", epic: "E02", workflow_state: "DRAFT" }),
        ];

        // E01 is not complete
        expect(isEpicComplete(tasks.filter((t) => t.epic === "E01"))).toBe(
          false
        );

        // Both E01-T002 (IMPLEMENTING) and E02-T001 (DRAFT) are "ready"
        // because they have no unmet dependencies
        const ready = getReadyTasks(tasks);
        expect(ready.length).toBe(2);

        // When sorted, E01-T002 comes before E02-T001 due to epic ordering
        const sorted = sortTasksForAutoMode(ready);
        expect(sorted[0]?.id).toBe("E01-T002"); // E01 task first
        expect(sorted[1]?.id).toBe("E02-T001"); // E02 task second
      });

      it("should only start E02 after all E01 tasks are DONE", () => {
        const tasks: Task[] = [
          // E01 - complete
          createTask({ id: "E01-T001", epic: "E01", workflow_state: "DONE" }),
          createTask({ id: "E01-T002", epic: "E01", workflow_state: "DONE" }),
          // E02 - now can start
          createTask({ id: "E02-T001", epic: "E02", workflow_state: "DRAFT" }),
          createTask({ id: "E02-T002", epic: "E02", workflow_state: "DRAFT" }),
        ];

        expect(isEpicComplete(tasks.filter((t) => t.epic === "E01"))).toBe(
          true
        );

        const ready = getReadyTasks(tasks);
        const sorted = sortTasksForAutoMode(ready);

        // E02 tasks should be in sorted order by priority
        expect(sorted.every((t) => t.epic === "E02")).toBe(true);
        expect(sorted.length).toBe(2);
      });

      it("should process multiple epics in order E01 → E02 → E03", () => {
        const tasks: Task[] = [
          createTask({ id: "E03-T001", epic: "E03" }),
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E02-T001", epic: "E02" }),
          createTask({ id: "E02-T002", epic: "E02" }),
          createTask({ id: "E01-T002", epic: "E01" }),
        ];

        const sorted = sortTasksForAutoMode(tasks);

        // All E01 tasks first
        expect(sorted[0]?.epic).toBe("E01");
        expect(sorted[1]?.epic).toBe("E01");
        // Then E02
        expect(sorted[2]?.epic).toBe("E02");
        expect(sorted[3]?.epic).toBe("E02");
        // Then E03
        expect(sorted[4]?.epic).toBe("E03");
      });

      it("should handle tasks with dependencies across epics correctly", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01", workflow_state: "DONE" }),
          createTask({
            id: "E02-T001",
            epic: "E02",
            depends_on: ["E01-T001"],
          }),
        ];

        const ready = getReadyTasks(tasks);

        // E02-T001 should be ready since E01-T001 is DONE
        expect(ready.length).toBe(1);
        expect(ready[0]?.id).toBe("E02-T001");
      });

      it("should block E02 tasks if they depend on incomplete E01 tasks", () => {
        const tasks: Task[] = [
          createTask({
            id: "E01-T001",
            epic: "E01",
            workflow_state: "IMPLEMENTING",
          }),
          createTask({
            id: "E02-T001",
            epic: "E02",
            depends_on: ["E01-T001"],
          }),
        ];

        const ready = getReadyTasks(tasks);

        // E01-T001 is ready (IMPLEMENTING, no deps)
        // E02-T001 is NOT ready because E01-T001 is not DONE
        expect(ready.length).toBe(1);
        expect(ready[0]?.id).toBe("E01-T001");
      });
    });

    describe("Task Resolution Order Simulation", () => {
      // Simulates the orchestrator picking tasks one by one
      function simulateAutoMode(initialTasks: Task[]): string[] {
        const tasks = initialTasks.map((t) => ({ ...t })); // Clone
        const processOrder: string[] = [];
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

        let iterations = 0;
        const maxIterations = 100;

        while (iterations < maxIterations) {
          iterations++;

          // Get ready tasks (not DONE, dependencies met, no breakpoint)
          const completedIds = getCompletedTaskIds(tasks);
          const ready = tasks.filter(
            (t) =>
              canStartTask(t, completedIds) &&
              t.workflow_state !== "DONE" &&
              !t.breakpoint
          );

          if (ready.length === 0) break;

          // Sort by epic then priority
          ready.sort((a, b) => {
            if (a.epic !== b.epic) {
              return a.epic.localeCompare(b.epic);
            }
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });

          // Pick the first one and mark as DONE
          const picked = ready[0];
          if (!picked) break;

          processOrder.push(picked.id);

          // Mark as done
          const taskIndex = tasks.findIndex((t) => t.id === picked.id);
          if (taskIndex >= 0 && tasks[taskIndex]) {
            tasks[taskIndex].workflow_state = "DONE";
          }
        }

        return processOrder;
      }

      it("should process E01 completely before starting E02", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E01-T002", epic: "E01" }),
          createTask({ id: "E02-T001", epic: "E02" }),
          createTask({ id: "E02-T002", epic: "E02" }),
        ];

        const order = simulateAutoMode(tasks);

        // E01 tasks should come first
        expect(order[0]).toBe("E01-T001");
        expect(order[1]).toBe("E01-T002");
        // Then E02
        expect(order[2]).toBe("E02-T001");
        expect(order[3]).toBe("E02-T002");
      });

      it("should respect dependencies within an epic", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E01-T002", epic: "E01", depends_on: ["E01-T001"] }),
          createTask({
            id: "E01-T003",
            epic: "E01",
            depends_on: ["E01-T001", "E01-T002"],
          }),
        ];

        const order = simulateAutoMode(tasks);

        expect(order).toEqual(["E01-T001", "E01-T002", "E01-T003"]);
      });

      it("should respect cross-epic dependencies", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({
            id: "E02-T001",
            epic: "E02",
            depends_on: ["E01-T001"],
          }),
          createTask({ id: "E01-T002", epic: "E01" }),
        ];

        const order = simulateAutoMode(tasks);

        // E01-T001 and E01-T002 first (E01 tasks), then E02-T001
        expect(order.indexOf("E01-T001")).toBeLessThan(
          order.indexOf("E02-T001")
        );
        expect(order.indexOf("E01-T002")).toBeLessThan(
          order.indexOf("E02-T001")
        );
      });

      it("should prioritize higher priority tasks within same epic", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01", priority: "low" }),
          createTask({ id: "E01-T002", epic: "E01", priority: "critical" }),
          createTask({ id: "E01-T003", epic: "E01", priority: "high" }),
        ];

        const order = simulateAutoMode(tasks);

        expect(order[0]).toBe("E01-T002"); // Critical
        expect(order[1]).toBe("E01-T003"); // High
        expect(order[2]).toBe("E01-T001"); // Low
      });

      it("should handle mixed priorities across epics correctly", () => {
        const tasks: Task[] = [
          createTask({ id: "E02-T001", epic: "E02", priority: "critical" }),
          createTask({ id: "E01-T001", epic: "E01", priority: "low" }),
          createTask({ id: "E01-T002", epic: "E01", priority: "high" }),
        ];

        const order = simulateAutoMode(tasks);

        // E01 tasks first regardless of priority, then E02
        expect(order[0]).toBe("E01-T002"); // E01, high priority
        expect(order[1]).toBe("E01-T001"); // E01, low priority
        expect(order[2]).toBe("E02-T001"); // E02, critical (but E01 first)
      });

      it("should not skip incomplete epics even with later epic tasks ready", () => {
        const tasks: Task[] = [
          // E01 with one task needing a dependency
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E01-T002", epic: "E01", depends_on: ["E01-T001"] }),
          // E02 with no dependencies (could run immediately)
          createTask({ id: "E02-T001", epic: "E02", priority: "critical" }),
        ];

        const order = simulateAutoMode(tasks);

        // Should complete E01 before starting E02
        expect(order[0]).toBe("E01-T001");
        expect(order[1]).toBe("E01-T002");
        expect(order[2]).toBe("E02-T001");
      });

      it("should handle breakpoints stopping processing", () => {
        const tasks: Task[] = [
          createTask({ id: "E01-T001", epic: "E01" }),
          createTask({ id: "E01-T002", epic: "E01", breakpoint: true }),
          createTask({ id: "E01-T003", epic: "E01" }),
        ];

        // The simulation should skip E01-T002 due to breakpoint
        const order = simulateAutoMode(tasks);

        expect(order).toContain("E01-T001");
        expect(order).not.toContain("E01-T002"); // Skipped due to breakpoint
        expect(order).toContain("E01-T003");
      });
    });
  });

  describe("Fresh Context", () => {
    it("should require fresh context for review states", () => {
      expect(needsFreshContext("UI_REVIEW")).toBe(true);
      expect(needsFreshContext("CODE_REVIEW")).toBe(true);
      expect(needsFreshContext("QA_REVIEW")).toBe(true);
    });

    it("should not require fresh context for other states", () => {
      expect(needsFreshContext("DRAFT")).toBe(false);
      expect(needsFreshContext("IMPLEMENTING")).toBe(false);
      expect(needsFreshContext("INTEGRATION_TESTING")).toBe(false);
      expect(needsFreshContext("INTEGRATION_FAILED")).toBe(false);
      expect(needsFreshContext("DONE")).toBe(false);
    });
  });

  describe("Workflow Consistency", () => {
    it("should have matching states in STATE_COMMANDS and STATE_TRANSITIONS", () => {
      const commandStates = Object.keys(STATE_COMMANDS) as WorkflowState[];
      const transitionStates = Object.keys(
        STATE_TRANSITIONS
      ) as WorkflowState[];

      expect(commandStates.sort()).toEqual(transitionStates.sort());
    });

    it("should have valid next states in STATE_TRANSITIONS", () => {
      const allStates = new Set(Object.keys(STATE_TRANSITIONS));

      for (const [state, nextState] of Object.entries(STATE_TRANSITIONS)) {
        if (nextState !== null) {
          expect(allStates.has(nextState)).toBe(true);
        }
      }
    });

    it("should only have DONE, INTEGRATION_FAILED, and PR_FAILED as terminal states", () => {
      const terminalStates = Object.entries(STATE_TRANSITIONS)
        .filter(([_, next]) => next === null)
        .map(([state, _]) => state);

      expect(terminalStates.sort()).toEqual(
        ["DONE", "INTEGRATION_FAILED", "PR_FAILED"].sort()
      );
    });

    it("should have rejection paths for all review states", () => {
      const reviewStates: WorkflowState[] = [
        "UX_REVIEW",
        "PLAN_REVIEW",
        "UI_REVIEW",
        "CODE_REVIEW",
        "QA_REVIEW",
        "INTEGRATION_TESTING",
      ];

      for (const state of reviewStates) {
        const rejectionTarget = getNextState(state, true);
        expect(rejectionTarget).not.toBeNull();
        expect(rejectionTarget).not.toBe(getNextState(state, false));
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle task with undefined depends_on", () => {
      const task = createTask();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (task as any).depends_on = undefined;

      const completedIds = new Set<string>();

      // Should not throw, should treat as no dependencies
      expect(canStartTask(task, completedIds)).toBe(true);
    });

    it("should handle empty string epic", () => {
      const tasks: Task[] = [
        createTask({ id: "T001", epic: "", workflow_state: "DONE" }),
      ];

      const byEpic = getTasksByEpic(tasks);
      const completed = getCompletedEpics(tasks);

      expect(byEpic.get("")?.length).toBe(1);
      expect(completed.has("")).toBe(true);
    });

    it("should handle circular dependency detection", () => {
      // While the orchestrator doesn't explicitly detect cycles,
      // tasks with circular deps should never become ready
      const tasks: Task[] = [
        createTask({ id: "E01-T001", depends_on: ["E01-T002"] }),
        createTask({ id: "E01-T002", depends_on: ["E01-T001"] }),
      ];

      const ready = getReadyTasks(tasks);

      // Neither task should be ready
      expect(ready.length).toBe(0);
    });

    it("should handle self-referential dependency", () => {
      const tasks: Task[] = [
        createTask({ id: "E01-T001", depends_on: ["E01-T001"] }),
      ];

      const ready = getReadyTasks(tasks);

      // Task depending on itself should never be ready
      expect(ready.length).toBe(0);
    });
  });
});
