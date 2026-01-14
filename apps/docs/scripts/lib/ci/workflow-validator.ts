// apps/docs/scripts/lib/ci/workflow-validator.ts

/**
 * CI workflow validation helper
 *
 * Validates GitHub Actions workflow YAML structure for documentation validation,
 * including path filters, job configuration, and dependencies.
 *
 * Validation Rules (based on acceptance criteria):
 * - AC1: Must have docs job with docs:build step
 * - AC4: Must have fetch-depth: 0 for staleness detection (requires git history)
 * - AC6: Staleness step must have continue-on-error: true (non-blocking)
 * - AC8: Must have artifact upload step for build preview
 */

/** Workflow step configuration */
interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  'continue-on-error'?: boolean;
}

/** Workflow job configuration */
interface WorkflowJob {
  name?: string;
  'runs-on'?: string;
  'timeout-minutes'?: number;
  steps?: WorkflowStep[];
  needs?: string[];
  if?: string;
}

/** GitHub Actions workflow structure */
interface Workflow {
  name?: string;
  on?: unknown;
  jobs?: Record<string, WorkflowJob>;
}

/** Validation result */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a docs workflow structure
 *
 * Checks for required docs job, proper checkout configuration,
 * build step, artifact upload, staleness check, and timeout settings.
 */
export function validateDocsWorkflow(workflow: Workflow): ValidationResult {
  const errors: string[] = [];

  // Check for docs job
  if (!workflow.jobs?.docs) {
    errors.push('Missing docs job in workflow');
    return { valid: false, errors };
  }

  const docsJob = workflow.jobs.docs;

  // Find key steps
  const checkoutStep = docsJob.steps?.find((step) =>
    step.uses?.startsWith('actions/checkout')
  );
  const buildStep = docsJob.steps?.find((step) =>
    step.run?.includes('docs:build')
  );
  const artifactStep = docsJob.steps?.find((step) =>
    step.uses?.startsWith('actions/upload-artifact')
  );
  const stalenessStep = docsJob.steps?.find(
    (step) =>
      step.run?.includes('docs:check-stale') ||
      step.run?.includes('check-staleness') ||
      step.name?.toLowerCase().includes('staleness')
  );

  // Check checkout step has fetch-depth: 0
  if (!checkoutStep || checkoutStep.with?.['fetch-depth'] !== 0) {
    errors.push(
      'Checkout step should use fetch-depth: 0 for staleness detection'
    );
  }

  // Check for docs:build step
  if (!buildStep) {
    errors.push('Missing docs:build step in docs job');
  }

  // Check for artifact upload step
  if (!artifactStep) {
    errors.push('Missing artifact upload step for docs build (AC8)');
  }

  // Check timeout (if specified, must be reasonable)
  if (
    docsJob['timeout-minutes'] !== undefined &&
    docsJob['timeout-minutes'] < 5
  ) {
    errors.push('Docs job timeout should be at least 5 minutes');
  }

  // Check staleness step has continue-on-error (if present)
  if (stalenessStep && stalenessStep['continue-on-error'] !== true) {
    errors.push(
      'Staleness check step should have continue-on-error: true (AC6)'
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns required path filters for docs validation
 *
 * These paths should trigger the docs validation workflow.
 */
export function getRequiredPathFilters(): string[] {
  return ['apps/docs/**', 'packages/**', 'apps/api/**'];
}

/**
 * Validates if a job configuration is a valid docs job
 *
 * Checks for required runs-on and non-empty steps array.
 */
export function isValidDocsJob(job: WorkflowJob): boolean {
  // Must have runs-on
  if (!job['runs-on']) {
    return false;
  }

  // Must have steps
  if (!job.steps || job.steps.length === 0) {
    return false;
  }

  return true;
}

/**
 * Validates job dependencies
 *
 * Checks if all-checks job includes docs in its needs array.
 */
export function validateJobDependencies(workflow: Workflow): ValidationResult {
  const errors: string[] = [];

  // Check if all-checks job exists
  const allChecksJob = workflow.jobs?.['all-checks'];
  if (!allChecksJob) {
    // No all-checks job is valid (not required)
    return { valid: true, errors: [] };
  }

  // Check if docs job exists
  if (!workflow.jobs?.docs) {
    // No docs job means nothing to validate
    return { valid: true, errors: [] };
  }

  // Check if docs is in the needs array
  if (allChecksJob.needs && !allChecksJob.needs.includes('docs')) {
    errors.push('all-checks job should include docs in its needs array');
  }

  return { valid: errors.length === 0, errors };
}
