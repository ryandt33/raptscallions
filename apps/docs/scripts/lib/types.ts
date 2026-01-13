// apps/docs/scripts/lib/types.ts

/**
 * Parsed documentation metadata
 */
export interface DocMetadata {
  filePath: string; // Absolute path to doc file
  title: string; // Document title
  description: string; // Document description
  relatedCode?: string[]; // Code file patterns
  lastVerified?: string; // ISO 8601 date (YYYY-MM-DD)
}

/**
 * Configuration for staleness detection
 */
export interface StalenessConfig {
  threshold: number; // Days after which code changes are considered stale
  ignore: string[]; // Glob patterns for docs to ignore
  docs_root: string; // Root directory for documentation
  output: {
    format: 'json' | 'markdown' | 'both';
    json_file: string; // Output path for JSON report
    markdown_file: string; // Output path for Markdown report
  };
  git: {
    use_author_date: boolean; // Use author date vs commit date
    include_uncommitted: boolean; // Treat uncommitted files as changed
  };
}

/**
 * Code file change detected during staleness check
 */
export interface RelatedCodeChange {
  file: string; // Absolute path to changed code file
  lastModified: string; // ISO date file was last modified
  daysSinceVerified: number; // Days between doc verification and code change
}

/**
 * Stale documentation entry
 */
export interface StaleDoc {
  doc: string; // Absolute path to stale doc
  title: string; // Document title
  lastVerified: string; // ISO date doc was verified
  relatedChanges: RelatedCodeChange[]; // Code files that changed
}

/**
 * Staleness check report
 */
export interface StalenessReport {
  stale: StaleDoc[]; // Stale documentation entries
  fresh: number; // Count of fresh docs
  unchecked: number; // Count of docs without staleness metadata
  scannedAt: string; // ISO timestamp of scan
  threshold: number; // Threshold used (in days)
}
