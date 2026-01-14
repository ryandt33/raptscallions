// apps/docs/scripts/lib/ci/annotation-generator.ts

/**
 * GitHub Actions annotation generator
 *
 * Generates annotations for display in GitHub Actions CI,
 * including staleness warnings and build error annotations.
 */

import type { StalenessReport } from '../types.js';

/** Annotation level */
type AnnotationLevel = 'warning' | 'error' | 'notice';

/** Annotation options */
interface AnnotationOptions {
  file?: string;
  line?: number;
  col?: number;
}

/**
 * Escapes special characters for GitHub Actions annotation messages
 *
 * GitHub Actions uses:
 * - %25 for %
 * - %0A for newline
 * - %0D for carriage return
 * - %3A%3A for ::
 */
function escapeMessage(message: string): string {
  return message
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/::/g, '%3A%3A');
}

/**
 * Formats a GitHub Actions annotation message
 *
 * @param level - Annotation level (warning, error, or notice)
 * @param message - The message to display
 * @param options - Optional file, line, and column information
 * @returns Formatted annotation string
 */
export function formatAnnotationMessage(
  level: AnnotationLevel,
  message: string,
  options?: AnnotationOptions
): string {
  let annotation = `::${level}`;

  if (
    options?.file ||
    options?.line !== undefined ||
    options?.col !== undefined
  ) {
    const parts: string[] = [];
    if (options.file) {
      parts.push(`file=${options.file}`);
    }
    if (options.line !== undefined) {
      parts.push(`line=${options.line}`);
    }
    if (options.col !== undefined) {
      parts.push(`col=${options.col}`);
    }
    if (parts.length > 0) {
      annotation += ` ${parts.join(',')}`;
    }
  }

  annotation += `::${escapeMessage(message)}`;

  return annotation;
}

/**
 * Generates a staleness annotation for GitHub Actions
 *
 * Returns empty string if no stale docs are found.
 * Uses warning level (not error) as staleness should not block merge.
 */
export function generateStalenessAnnotation(report: StalenessReport): string {
  if (report.stale.length === 0) {
    return '';
  }

  const count = report.stale.length;
  const plural = count === 1 ? 'doc' : 'docs';
  const message = `Documentation may be stale: ${count} potentially stale ${plural} detected. See staleness report artifact for details.`;

  // Use the first stale doc's path as the file reference
  const firstStaleDoc = report.stale[0];
  // Strip leading /repo/ prefix if present for cleaner paths
  const file = firstStaleDoc.doc.replace(/^\/repo\//, '');

  return formatAnnotationMessage('warning', message, { file });
}

/**
 * Generates a build error annotation for GitHub Actions
 *
 * Parses VitePress error messages to extract file paths and line numbers.
 */
export function generateBuildErrorAnnotation(error: string): string {
  // Try to extract file path from dead link error
  // Format: "Dead link found: /path/to/file.md links to /non-existent"
  const deadLinkMatch = error.match(/Dead link found: \/([^\s]+\.md)/);
  if (deadLinkMatch) {
    const file = deadLinkMatch[1];
    return formatAnnotationMessage('error', error, { file });
  }

  // Try to extract file path from parse error
  // Format: "Error parsing src/path/file.md: message"
  const parseMatch = error.match(/Error parsing ([^\s:]+\.md)/);
  if (parseMatch) {
    const file = parseMatch[1];
    return formatAnnotationMessage('error', error, { file });
  }

  // Try to extract file path and line number
  // Format: "Error at src/path/file.md:42 - message"
  const lineMatch = error.match(/(?:at |in )?([^\s:]+\.md):(\d+)/);
  if (lineMatch) {
    const file = lineMatch[1];
    const line = parseInt(lineMatch[2], 10);
    return formatAnnotationMessage('error', error, { file, line });
  }

  // Fallback: generic error without file info
  return formatAnnotationMessage('error', error);
}

/**
 * Gets the staleness warning level based on report data
 *
 * Returns:
 * - 'none' if no stale docs
 * - 'low' if less than 10% of checked docs are stale
 * - 'medium' if 10-30% of checked docs are stale
 * - 'high' if more than 30% of checked docs are stale
 */
export function getStalenessWarningLevel(
  report: StalenessReport
): 'none' | 'low' | 'medium' | 'high' {
  const staleCount = report.stale.length;

  if (staleCount === 0) {
    return 'none';
  }

  // Calculate percentage based on checked docs only (fresh + stale)
  const checkedCount = report.fresh + staleCount;

  if (checkedCount === 0) {
    return 'none';
  }

  const stalePercentage = (staleCount / checkedCount) * 100;

  if (stalePercentage >= 30) {
    return 'high';
  }

  if (stalePercentage >= 10) {
    return 'medium';
  }

  return 'low';
}
