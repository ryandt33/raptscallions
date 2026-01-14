import { describe, it, expect } from 'vitest';
import {
  validateDocsWorkflow,
  getRequiredPathFilters,
  isValidDocsJob,
  validateJobDependencies,
} from '../../lib/ci/workflow-validator.js';

/**
 * Tests for CI workflow validation helper
 *
 * These tests verify that the CI workflow YAML is correctly structured
 * for documentation validation, including path filters, job configuration,
 * and dependencies.
 *
 * Validation Rules (based on acceptance criteria):
 * - AC1: Must have docs job with docs:build step
 * - AC4: Must have fetch-depth: 0 for staleness detection (requires git history)
 * - AC6: Staleness step must have continue-on-error: true (non-blocking)
 * - AC8: Must have artifact upload step for build preview
 *
 * All complete docs workflows must satisfy ALL requirements.
 * There is no "minimal" vs "full" mode - either it's valid or it's not.
 */

describe('workflow-validator', () => {
  /**
   * Helper to create a valid complete workflow for testing.
   * Modify specific fields to test error conditions.
   */
  function createCompleteWorkflow() {
    return {
      name: 'CI',
      on: {
        push: { branches: ['main', 'develop'] },
        pull_request: { branches: ['main', 'develop'] },
      },
      jobs: {
        docs: {
          name: 'Docs Validation',
          'runs-on': 'ubuntu-latest',
          'timeout-minutes': 10,
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4',
              with: { 'fetch-depth': 0 },
            },
            { name: 'Build documentation', run: 'pnpm docs:build' },
            {
              name: 'Upload docs build artifacts',
              uses: 'actions/upload-artifact@v4',
              with: {
                name: 'docs-build',
                path: 'apps/docs/src/.vitepress/dist',
              },
            },
          ],
        },
      },
    };
  }

  describe('validateDocsWorkflow', () => {
    it('should validate a complete docs workflow with all required elements', () => {
      const workflow = createCompleteWorkflow();

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when docs job is missing', () => {
      const workflow = {
        name: 'CI',
        on: {
          push: { branches: ['main'] },
          pull_request: { branches: ['main'] },
        },
        jobs: {
          build: { name: 'Build', 'runs-on': 'ubuntu-latest', steps: [] },
        },
      };

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing docs job in workflow');
    });

    it('should return error when checkout does not have fetch-depth: 0', () => {
      const workflow = createCompleteWorkflow();
      // Remove fetch-depth from checkout
      workflow.jobs.docs.steps[0] = {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        // Missing with: { 'fetch-depth': 0 }
      };

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Checkout step should use fetch-depth: 0 for staleness detection'
      );
    });

    it('should return error when fetch-depth is not zero', () => {
      const workflow = createCompleteWorkflow();
      workflow.jobs.docs.steps[0] = {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: { 'fetch-depth': 1 }, // Shallow clone, not full history
      };

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Checkout step should use fetch-depth: 0 for staleness detection'
      );
    });

    it('should return error when build step is missing', () => {
      const workflow = createCompleteWorkflow();
      // Remove build step
      workflow.jobs.docs.steps = [
        workflow.jobs.docs.steps[0], // checkout
        workflow.jobs.docs.steps[2], // artifact upload
      ];

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing docs:build step in docs job');
    });

    it('should return error when artifact upload is missing', () => {
      const workflow = createCompleteWorkflow();
      // Remove artifact upload step
      workflow.jobs.docs.steps = [
        workflow.jobs.docs.steps[0], // checkout
        workflow.jobs.docs.steps[1], // build
      ];

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing artifact upload step for docs build (AC8)'
      );
    });

    it('should return error when timeout is too short', () => {
      const workflow = createCompleteWorkflow();
      workflow.jobs.docs['timeout-minutes'] = 1;

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Docs job timeout should be at least 5 minutes'
      );
    });

    it('should allow missing timeout (uses GitHub default)', () => {
      const workflow = createCompleteWorkflow();
      delete workflow.jobs.docs['timeout-minutes'];

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(true);
    });

    it('should return multiple errors when multiple issues exist', () => {
      const workflow = {
        name: 'CI',
        on: { push: { branches: ['main'] } },
        jobs: {
          docs: {
            name: 'Docs Validation',
            'runs-on': 'ubuntu-latest',
            'timeout-minutes': 2,
            steps: [
              { name: 'Checkout code', uses: 'actions/checkout@v4' },
              // Missing build step and artifact upload
            ],
          },
        },
      };

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        'Checkout step should use fetch-depth: 0 for staleness detection'
      );
      expect(result.errors).toContain('Missing docs:build step in docs job');
      expect(result.errors).toContain(
        'Missing artifact upload step for docs build (AC8)'
      );
      expect(result.errors).toContain(
        'Docs job timeout should be at least 5 minutes'
      );
    });
  });

  describe('staleness step validation', () => {
    it('should validate when staleness step has continue-on-error: true', () => {
      const workflow = createCompleteWorkflow();
      // Add staleness step with continue-on-error
      workflow.jobs.docs.steps.splice(2, 0, {
        name: 'Check documentation staleness',
        run: 'pnpm docs:check-stale',
        'continue-on-error': true,
      });

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(true);
    });

    it('should return error when staleness step does not have continue-on-error', () => {
      const workflow = createCompleteWorkflow();
      // Add staleness step WITHOUT continue-on-error
      workflow.jobs.docs.steps.splice(2, 0, {
        name: 'Check documentation staleness',
        run: 'pnpm docs:check-stale',
        // Missing continue-on-error: true
      });

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Staleness check step should have continue-on-error: true (AC6)'
      );
    });

    it('should detect staleness step by command pattern', () => {
      const workflow = createCompleteWorkflow();
      // Add staleness step with different name but same command
      workflow.jobs.docs.steps.splice(2, 0, {
        name: 'Run stale docs check',
        run: 'cd apps/docs && pnpm tsx scripts/check-staleness.ts',
        // Missing continue-on-error
      });

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Staleness check step should have continue-on-error: true (AC6)'
      );
    });

    it('should detect staleness step by name containing "staleness"', () => {
      const workflow = createCompleteWorkflow();
      workflow.jobs.docs.steps.splice(2, 0, {
        name: 'Documentation Staleness Check',
        run: 'node scripts/check.js',
        // Missing continue-on-error
      });

      const result = validateDocsWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Staleness check step should have continue-on-error: true (AC6)'
      );
    });
  });

  describe('getRequiredPathFilters', () => {
    it('should return required path filters for docs validation', () => {
      const filters = getRequiredPathFilters();

      expect(filters).toContain('apps/docs/**');
    });

    it('should include packages path for staleness detection', () => {
      const filters = getRequiredPathFilters();

      expect(filters).toContain('packages/**');
    });

    it('should include apps/api path for staleness detection', () => {
      const filters = getRequiredPathFilters();

      expect(filters).toContain('apps/api/**');
    });

    it('should return all essential paths', () => {
      const filters = getRequiredPathFilters();

      expect(filters).toHaveLength(3); // docs, packages, apps/api
    });
  });

  describe('isValidDocsJob', () => {
    it('should return true for valid docs job with required fields', () => {
      const job = {
        name: 'Docs Validation',
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': 10,
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
            with: { 'fetch-depth': 0 },
          },
          { name: 'Build documentation', run: 'pnpm docs:build' },
          {
            name: 'Upload docs build artifacts',
            uses: 'actions/upload-artifact@v4',
          },
        ],
      };

      expect(isValidDocsJob(job)).toBe(true);
    });

    it('should return false when runs-on is missing', () => {
      const job = {
        name: 'Docs Validation',
        'timeout-minutes': 10,
        steps: [{ name: 'Build', run: 'pnpm docs:build' }],
      };

      expect(isValidDocsJob(job)).toBe(false);
    });

    it('should return false when steps are missing', () => {
      const job = {
        name: 'Docs Validation',
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': 10,
      };

      expect(isValidDocsJob(job)).toBe(false);
    });

    it('should return false when steps is empty array', () => {
      const job = {
        name: 'Docs Validation',
        'runs-on': 'ubuntu-latest',
        steps: [],
      };

      expect(isValidDocsJob(job)).toBe(false);
    });
  });

  describe('validateJobDependencies', () => {
    it('should validate all-checks includes docs job', () => {
      const workflow = {
        jobs: {
          typecheck: { name: 'Typecheck' },
          lint: { name: 'Lint' },
          test: { name: 'Test' },
          build: { name: 'Build' },
          docs: { name: 'Docs Validation' },
          'all-checks': {
            name: 'All Checks Passed',
            needs: ['typecheck', 'lint', 'test', 'build', 'docs'],
          },
        },
      };

      const result = validateJobDependencies(workflow);

      expect(result.valid).toBe(true);
    });

    it('should return error when all-checks does not include docs', () => {
      const workflow = {
        jobs: {
          typecheck: { name: 'Typecheck' },
          lint: { name: 'Lint' },
          test: { name: 'Test' },
          build: { name: 'Build' },
          docs: { name: 'Docs Validation' },
          'all-checks': {
            name: 'All Checks Passed',
            needs: ['typecheck', 'lint', 'test', 'build'],
            // Missing docs!
          },
        },
      };

      const result = validateJobDependencies(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'all-checks job should include docs in its needs array'
      );
    });

    it('should pass when there is no all-checks job', () => {
      const workflow = {
        jobs: {
          docs: { name: 'Docs Validation' },
          build: { name: 'Build' },
        },
      };

      const result = validateJobDependencies(workflow);

      expect(result.valid).toBe(true);
    });

    it('should pass when there is no docs job', () => {
      const workflow = {
        jobs: {
          build: { name: 'Build' },
          'all-checks': {
            name: 'All Checks Passed',
            needs: ['build'],
          },
        },
      };

      const result = validateJobDependencies(workflow);

      // No docs job, so nothing to validate
      expect(result.valid).toBe(true);
    });
  });
});
