// apps/docs/scripts/lib/git-helper.ts

import { execFile, type ExecFileException } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Helper to promisify execFile with proper typing
function execFilePromise(
  cmd: string,
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Export for testing - allows mocking this function
export const _internal = {
  execFilePromise,
};

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<boolean> {
  try {
    await _internal.execFilePromise('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git repository root directory
 */
export async function getGitRepoRoot(): Promise<string | null> {
  try {
    const { stdout } = await _internal.execFilePromise('git', [
      'rev-parse',
      '--show-toplevel',
    ]);
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get last commit date for a file using git log
 */
export async function getFileLastModified(
  filePath: string,
  useAuthorDate = false
): Promise<Date | null> {
  try {
    // Verify file exists
    if (!existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }

    // Get git repository root
    const repoRoot = await getGitRepoRoot();
    if (!repoRoot) {
      return null;
    }

    // Get relative path from repo root
    const relativePath = path.relative(repoRoot, filePath);

    // Query git for last commit date
    const dateFormat = useAuthorDate ? '%ai' : '%ci'; // Author vs Commit date
    const { stdout } = await _internal.execFilePromise(
      'git',
      ['log', `--format=${dateFormat}`, '--max-count=1', '--', relativePath],
      {
        cwd: repoRoot,
      }
    );

    const dateString = stdout.trim();
    if (!dateString) {
      // File has no git history (new/untracked)
      return null;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date from git for ${filePath}: ${dateString}`);
      return null;
    }

    return date;
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to get git history for ${filePath}:`, error.message);
    }
    return null;
  }
}

/**
 * Batch query git for multiple files (optimization)
 */
export async function batchGetFileLastModified(
  filePaths: string[],
  useAuthorDate = false
): Promise<Map<string, Date | null>> {
  const results = new Map<string, Date | null>();

  // Query files in parallel (with concurrency limit)
  const CONCURRENCY = 10;
  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (filePath) => ({
      filePath,
      date: await getFileLastModified(filePath, useAuthorDate),
    }));

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ filePath, date }) => {
      results.set(filePath, date);
    });
  }

  return results;
}
