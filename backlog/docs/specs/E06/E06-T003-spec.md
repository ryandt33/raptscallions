# Implementation Spec: E06-T003

**Task:** Staleness Tracking Schema and Detection Logic
**Epic:** E06 - Knowledge Base Documentation
**Status:** Analyzed
**Created:** 2026-01-13

---

## Overview

Implement an automated staleness detection system for KB documentation that flags when docs may be out of sync with code changes. Documents declare their related code files in frontmatter, and a CLI script compares modification dates to identify potentially stale content. This prevents documentation drift and ensures developers and agents have accurate implementation guidance.

**Key Goals:**
1. Define frontmatter schema for doc-code relationships
2. Build CLI scanner that detects staleness via git history
3. Generate actionable reports in JSON and Markdown formats
4. Support configurable staleness thresholds and ignore patterns
5. Integrate with pnpm workspace scripts for CI/local use
6. Complete in under 30 seconds for typical KB size (~100 docs)

---

## Approach

### Technical Strategy

**Frontmatter Schema Design:**
- Add `related_code` array field to existing KB frontmatter
- Add `last_verified` date field for staleness comparison baseline
- Maintain backward compatibility (fields are optional)
- Use ISO 8601 date format (YYYY-MM-DD) for consistency
- Support glob patterns for related code files (e.g., `packages/auth/**/*.ts`)

**Git Integration:**
- Use `git log --format=%ci --max-count=1 -- <file>` to get last commit date per file
- Requires git repository (fails gracefully in non-git environments)
- Parse ISO 8601 timestamps from git output
- Cache git results to avoid redundant subprocess calls

**Staleness Detection Algorithm:**
1. Scan all `.md` files in `apps/docs/src/` recursively
2. Parse frontmatter using `gray-matter` library
3. Expand glob patterns in `related_code` to absolute file paths
4. Query git for last commit date of each related code file
5. Compare code file's last commit date vs doc's `last_verified` date
6. Flag as stale if: `codeLastModified > (docLastVerified + threshold)`
7. Generate report with stale docs, fresh docs, and unchecked docs counts

**Configuration System:**
- YAML config file at `apps/docs/.docs-staleness.yml`
- Command-line overrides via flags (e.g., `--threshold 7`)
- Sensible defaults (7-day threshold)
- Ignore patterns support (regex or glob)

**Output Formats:**
- JSON: Machine-readable for CI integration, JSON Schema validated
- Markdown: Human-readable with tables, suitable for PR comments
- Exit codes: 0 (no stale docs), 1 (stale docs found), 2 (error)

**CLI Command:**
- Add `docs:check-stale` script to root `package.json`
- Delegates to TypeScript CLI in `apps/docs/scripts/check-staleness.ts`
- Use `tsx` for zero-config TypeScript execution
- Support `--help`, `--config`, `--format`, `--threshold`, `--output` flags

---

## Files to Create

| File | Purpose |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/check-staleness.ts` | Main CLI script for staleness detection |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/frontmatter-parser.ts` | Parse frontmatter and extract related_code |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/git-helper.ts` | Query git for file last modified dates |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/staleness-checker.ts` | Core staleness detection logic |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/report-generator.ts` | Generate JSON and Markdown reports |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/config-loader.ts` | Load and merge configuration from YAML and CLI |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/types.ts` | TypeScript types for config, reports, and scan results |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.docs-staleness.yml` | Default configuration file (optional) |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/check-staleness.test.ts` | Unit tests for CLI entry point |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/frontmatter-parser.test.ts` | Unit tests for frontmatter parsing |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/git-helper.test.ts` | Unit tests for git integration |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/staleness-checker.test.ts` | Unit tests for staleness logic |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/report-generator.test.ts` | Unit tests for report generation |

---

## Files to Modify

| File | Changes |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/package.json` | Add `docs:check-stale` script to root workspace |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/package.json` | Add `gray-matter`, `glob`, `yargs`, `js-yaml` dev dependencies |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/kb-page-design.md` | Document `related_code` and `last_verified` frontmatter fields |
| `/home/ryan/Documents/coding/claude-box/raptscallions/.github/workflows/docs-staleness.yml` | (Optional) Add CI workflow for automatic staleness checks |

---

## Dependencies

### Required Packages

**Production Dependencies:** (None - all dev dependencies)

**Dev Dependencies:**
```json
{
  "gray-matter": "^4.0.3",     // Parse YAML frontmatter
  "glob": "^10.3.10",          // File pattern matching
  "yargs": "^17.7.2",          // CLI argument parsing
  "js-yaml": "^4.1.0"          // Parse YAML config file
}
```

### Task Dependencies
- **Requires:** E06-T002 (KB folder structure) - DONE
- **Blocks:** E06-T004 (Staleness CI integration)

### System Dependencies
- Git (version 2.0+) must be installed and repository initialized
- Node.js 20+ (already required by project)
- pnpm 9+ (already required by project)

---

## Detailed Implementation

### 1. Frontmatter Schema

**Purpose:** Extend VitePress frontmatter to declare doc-code relationships and verification dates.

**Schema Definition:**
```yaml
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
related_code:
  - packages/auth/src/session.service.ts
  - apps/api/src/middleware/session.middleware.ts
  - packages/auth/src/lucia.ts
last_verified: 2026-01-12
---
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `related_code` | `string[]` | No | Array of file paths or glob patterns relative to repo root |
| `last_verified` | `string` | No | ISO 8601 date (YYYY-MM-DD) when doc was last verified against code |

**Glob Pattern Support:**
- `packages/auth/**/*.ts` - All TypeScript files in auth package
- `apps/api/src/services/*.service.ts` - All service files
- `packages/*/src/index.ts` - All package entry points

**Validation Rules:**
- `related_code` must be an array of strings (not a single string)
- `last_verified` must be a valid ISO 8601 date (YYYY-MM-DD format)
- Empty arrays are allowed but treated as "unchecked"
- Paths must be relative to repository root (no leading `/`)

**TypeScript Type:**
```typescript
interface DocFrontmatter {
  title: string;
  description: string;
  related_code?: string[];
  last_verified?: string; // ISO 8601 date string
  // ... other VitePress fields
}
```

---

### 2. Configuration System

**Purpose:** Allow customizable staleness detection behavior via YAML config and CLI flags.

**Config File Location:** `apps/docs/.docs-staleness.yml`

**Config Schema:**
```yaml
# Staleness Detection Configuration
# This file configures the docs:check-stale command behavior.

# Threshold in days - code changes older than this are considered stale
threshold: 7

# Ignore patterns - docs matching these patterns are excluded from checks
ignore:
  - '**/references/**'           # Reference docs are stable
  - '**/drafts/**'               # Draft docs aren't ready
  - '**/contributing/index.md'   # Overview pages exempt

# Root directory for documentation (relative to config file)
docs_root: './src'

# Output options
output:
  format: 'both'  # 'json' | 'markdown' | 'both'
  json_file: '.docs-staleness-report.json'
  markdown_file: 'docs-staleness-report.md'

# Git options
git:
  use_author_date: false  # Use commit date instead of author date
  include_uncommitted: false  # Treat uncommitted files as changed
```

**TypeScript Type:**
```typescript
interface StalenessConfig {
  threshold: number;
  ignore: string[];
  docs_root: string;
  output: {
    format: 'json' | 'markdown' | 'both';
    json_file: string;
    markdown_file: string;
  };
  git: {
    use_author_date: boolean;
    include_uncommitted: boolean;
  };
}
```

**Default Values (if config file missing):**
```typescript
const DEFAULT_CONFIG: StalenessConfig = {
  threshold: 7,
  ignore: [],
  docs_root: './src',
  output: {
    format: 'both',
    json_file: '.docs-staleness-report.json',
    markdown_file: 'docs-staleness-report.md',
  },
  git: {
    use_author_date: false,
    include_uncommitted: false,
  },
};
```

**CLI Override Support:**
```bash
# Override threshold
pnpm docs:check-stale --threshold 14

# Override output format
pnpm docs:check-stale --format json

# Override output file
pnpm docs:check-stale --output ./reports/staleness.json

# Use custom config file
pnpm docs:check-stale --config ./custom-config.yml

# Show help
pnpm docs:check-stale --help
```

---

### 3. CLI Entry Point (`check-staleness.ts`)

**Purpose:** Command-line interface that orchestrates staleness detection.

**Implementation:**
```typescript
#!/usr/bin/env node
// apps/docs/scripts/check-staleness.ts

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from './lib/config-loader.js';
import { scanDocuments } from './lib/frontmatter-parser.js';
import { checkStaleness } from './lib/staleness-checker.js';
import { generateReport } from './lib/report-generator.js';
import type { StalenessConfig, StalenessReport } from './lib/types.js';

/**
 * Main CLI entry point for staleness detection
 */
async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('check-staleness')
    .usage('Usage: $0 [options]')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to config file',
      default: '.docs-staleness.yml',
    })
    .option('threshold', {
      alias: 't',
      type: 'number',
      description: 'Staleness threshold in days',
    })
    .option('format', {
      alias: 'f',
      type: 'string',
      choices: ['json', 'markdown', 'both'] as const,
      description: 'Output format',
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output file path',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Verbose logging',
      default: false,
    })
    .help('h')
    .alias('h', 'help')
    .version()
    .parse();

  try {
    // Load configuration with CLI overrides
    const config = await loadConfig(argv.config as string, {
      threshold: argv.threshold,
      output: {
        format: argv.format as 'json' | 'markdown' | 'both' | undefined,
      },
    });

    if (argv.verbose) {
      console.log('Configuration:', JSON.stringify(config, null, 2));
    }

    // Scan all documentation files
    console.log('Scanning documentation files...');
    const docs = await scanDocuments(config.docs_root, config.ignore);
    console.log(`Found ${docs.length} documentation files`);

    // Check for staleness
    console.log('Checking for stale documentation...');
    const report = await checkStaleness(docs, config);

    // Generate reports
    console.log('Generating reports...');
    await generateReport(report, config);

    // Print summary
    console.log('\n--- Staleness Check Summary ---');
    console.log(`Fresh docs: ${report.fresh}`);
    console.log(`Stale docs: ${report.stale.length}`);
    console.log(`Unchecked docs: ${report.unchecked}`);

    if (report.stale.length > 0) {
      console.log('\nStale documentation detected!');
      console.log(`Run with --verbose to see detailed report`);
      process.exit(1); // Exit with error for CI
    }

    console.log('\nAll documentation is up to date! ✓');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(2); // Exit with error code 2 for script errors
  }
}

// Run CLI
main().catch((error: unknown) => {
  console.error('Unhandled error:', error);
  process.exit(2);
});
```

**Type Safety:**
- All CLI arguments typed via yargs TypeScript definitions
- Use strict null checks and unknown type for errors
- No `any` types - use type guards or Zod validation if needed

---

### 4. Frontmatter Parser (`frontmatter-parser.ts`)

**Purpose:** Scan documentation files and extract frontmatter metadata.

**Implementation:**
```typescript
// apps/docs/scripts/lib/frontmatter-parser.ts

import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import path from 'node:path';
import type { DocMetadata } from './types.js';

/**
 * Scan documentation directory and extract frontmatter from all .md files
 */
export async function scanDocuments(
  docsRoot: string,
  ignorePatterns: string[]
): Promise<DocMetadata[]> {
  // Find all markdown files
  const pattern = path.join(docsRoot, '**/*.md');
  const files = await glob(pattern, {
    ignore: ignorePatterns,
    absolute: true,
  });

  // Parse frontmatter from each file
  const docs: DocMetadata[] = [];
  for (const filePath of files) {
    const metadata = await parseDocFrontmatter(filePath);
    if (metadata) {
      docs.push(metadata);
    }
  }

  return docs;
}

/**
 * Parse frontmatter from a single markdown file
 */
export async function parseDocFrontmatter(
  filePath: string
): Promise<DocMetadata | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { data } = matter(content);

    // Extract required fields
    const title = typeof data.title === 'string' ? data.title : 'Untitled';
    const description = typeof data.description === 'string' ? data.description : '';

    // Extract optional staleness fields
    const relatedCode = Array.isArray(data.related_code)
      ? data.related_code.filter((item): item is string => typeof item === 'string')
      : undefined;

    const lastVerified = typeof data.last_verified === 'string'
      ? data.last_verified
      : undefined;

    // Validate date format if present
    if (lastVerified && !isValidISODate(lastVerified)) {
      console.warn(`Invalid date format in ${filePath}: ${lastVerified}`);
      return null;
    }

    return {
      filePath,
      title,
      description,
      relatedCode,
      lastVerified,
    };
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate ISO 8601 date format (YYYY-MM-DD)
 */
function isValidISODate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Expand glob patterns in related_code to absolute file paths
 */
export async function expandRelatedCodePaths(
  patterns: string[],
  repoRoot: string
): Promise<string[]> {
  const expandedPaths: Set<string> = new Set();

  for (const pattern of patterns) {
    const fullPattern = path.join(repoRoot, pattern);
    const files = await glob(fullPattern, { absolute: true });
    files.forEach(file => expandedPaths.add(file));
  }

  return Array.from(expandedPaths);
}
```

**Type Definitions:**
```typescript
export interface DocMetadata {
  filePath: string;      // Absolute path to documentation file
  title: string;         // Document title from frontmatter
  description: string;   // Document description
  relatedCode?: string[]; // Array of code file patterns
  lastVerified?: string; // ISO 8601 date string
}
```

**Error Handling:**
- Log warnings for malformed frontmatter (don't fail entire scan)
- Skip files that can't be parsed
- Validate date formats and warn on invalid dates
- Return null for unparseable files

---

### 5. Git Helper (`git-helper.ts`)

**Purpose:** Query git for last modification dates of code files.

**Implementation:**
```typescript
// apps/docs/scripts/lib/git-helper.ts

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

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
      throw new Error('Not a git repository');
    }

    // Get relative path from repo root
    const relativePath = path.relative(repoRoot, filePath);

    // Query git for last commit date
    const dateFormat = useAuthorDate ? '%ai' : '%ci'; // Author vs Commit date
    const { stdout } = await execFileAsync('git', [
      'log',
      '--format=' + dateFormat,
      '--max-count=1',
      '--',
      relativePath,
    ], {
      cwd: repoRoot,
    });

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
 * Get git repository root directory
 */
export async function getGitRepoRoot(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', [
      'rev-parse',
      '--show-toplevel',
    ]);
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<boolean> {
  try {
    await execFileAsync('git', ['--version']);
    return true;
  } catch {
    return false;
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
```

**Performance Optimization:**
- Batch git queries with concurrency limit (10 concurrent processes)
- Cache git repo root lookup
- Use promisified child_process for async/await support
- Return null on errors (graceful degradation)

**Error Handling:**
- Check if git is available before running commands
- Verify files exist before querying git
- Handle "file not in git history" case (returns null)
- Log warnings for git errors but don't fail entire check

---

### 6. Staleness Checker (`staleness-checker.ts`)

**Purpose:** Core staleness detection logic comparing doc verification dates with code modification dates.

**Implementation:**
```typescript
// apps/docs/scripts/lib/staleness-checker.ts

import { expandRelatedCodePaths } from './frontmatter-parser.js';
import { batchGetFileLastModified, getGitRepoRoot } from './git-helper.js';
import type {
  DocMetadata,
  StalenessConfig,
  StalenessReport,
  StaleDoc,
  RelatedCodeChange
} from './types.js';

/**
 * Check documentation for staleness
 */
export async function checkStaleness(
  docs: DocMetadata[],
  config: StalenessConfig
): Promise<StalenessReport> {
  const repoRoot = await getGitRepoRoot();
  if (!repoRoot) {
    throw new Error('Not a git repository - staleness check requires git');
  }

  const stale: StaleDoc[] = [];
  let freshCount = 0;
  let uncheckedCount = 0;

  for (const doc of docs) {
    // Skip docs without related_code or last_verified
    if (!doc.relatedCode || doc.relatedCode.length === 0 || !doc.lastVerified) {
      uncheckedCount++;
      continue;
    }

    // Expand glob patterns to absolute file paths
    const codePaths = await expandRelatedCodePaths(doc.relatedCode, repoRoot);
    if (codePaths.length === 0) {
      console.warn(`No code files found for ${doc.filePath}`);
      uncheckedCount++;
      continue;
    }

    // Get last modified dates for all related code files
    const codeModDates = await batchGetFileLastModified(
      codePaths,
      config.git.use_author_date
    );

    // Check for staleness
    const docVerifiedDate = new Date(doc.lastVerified);
    const thresholdMs = config.threshold * 24 * 60 * 60 * 1000; // Convert days to ms
    const relatedChanges: RelatedCodeChange[] = [];

    for (const [codePath, modDate] of codeModDates.entries()) {
      if (!modDate) {
        // File has no git history or doesn't exist
        continue;
      }

      const timeDiff = modDate.getTime() - docVerifiedDate.getTime();
      if (timeDiff > thresholdMs) {
        // Code changed after doc was verified + threshold
        relatedChanges.push({
          file: codePath,
          lastModified: modDate.toISOString().split('T')[0], // YYYY-MM-DD
          daysSinceVerified: Math.floor(timeDiff / (24 * 60 * 60 * 1000)),
        });
      }
    }

    if (relatedChanges.length > 0) {
      // Doc is stale
      stale.push({
        doc: doc.filePath,
        title: doc.title,
        lastVerified: doc.lastVerified,
        relatedChanges,
      });
    } else {
      // Doc is fresh
      freshCount++;
    }
  }

  return {
    stale,
    fresh: freshCount,
    unchecked: uncheckedCount,
    scannedAt: new Date().toISOString(),
    threshold: config.threshold,
  };
}
```

**Type Definitions:**
```typescript
export interface StaleDoc {
  doc: string;                         // Absolute path to stale doc
  title: string;                       // Document title
  lastVerified: string;                // ISO date doc was verified
  relatedChanges: RelatedCodeChange[]; // Code files that changed
}

export interface RelatedCodeChange {
  file: string;           // Absolute path to changed code file
  lastModified: string;   // ISO date file was last modified
  daysSinceVerified: number; // Days between verification and modification
}

export interface StalenessReport {
  stale: StaleDoc[];
  fresh: number;
  unchecked: number;
  scannedAt: string; // ISO timestamp
  threshold: number; // Threshold in days
}
```

**Algorithm Breakdown:**

1. **Categorization:** Each doc falls into one of three categories:
   - **Stale:** Has `related_code` + `last_verified`, code changed after `last_verified + threshold`
   - **Fresh:** Has `related_code` + `last_verified`, code unchanged or within threshold
   - **Unchecked:** Missing `related_code` or `last_verified` (can't verify)

2. **Staleness Calculation:**
   ```
   For each code file related to doc:
     codeLastModified = git log --format=%ci --max-count=1 -- <file>
     daysSinceVerified = (codeLastModified - docLastVerified) / (1 day in ms)
     if daysSinceVerified > threshold:
       Mark doc as stale with this code change
   ```

3. **Glob Pattern Expansion:**
   - `packages/auth/**/*.ts` → List of all matching .ts files
   - Each file checked individually for modification date
   - Empty results treated as unchecked (pattern matched nothing)

---

### 7. Report Generator (`report-generator.ts`)

**Purpose:** Generate JSON and Markdown reports from staleness check results.

**Implementation:**
```typescript
// apps/docs/scripts/lib/report-generator.ts

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { StalenessReport, StalenessConfig } from './types.js';

/**
 * Generate staleness reports in configured formats
 */
export async function generateReport(
  report: StalenessReport,
  config: StalenessConfig
): Promise<void> {
  const { format, json_file, markdown_file } = config.output;

  // Ensure output directory exists
  const outputDir = path.dirname(json_file);
  await mkdir(outputDir, { recursive: true });

  if (format === 'json' || format === 'both') {
    await generateJsonReport(report, json_file);
  }

  if (format === 'markdown' || format === 'both') {
    await generateMarkdownReport(report, markdown_file);
  }
}

/**
 * Generate JSON report
 */
async function generateJsonReport(
  report: StalenessReport,
  outputPath: string
): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await writeFile(outputPath, json, 'utf-8');
  console.log(`JSON report written to: ${outputPath}`);
}

/**
 * Generate Markdown report
 */
async function generateMarkdownReport(
  report: StalenessReport,
  outputPath: string
): Promise<void> {
  const lines: string[] = [];

  // Title
  lines.push('# Documentation Staleness Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.scannedAt).toLocaleString()}`);
  lines.push(`**Threshold:** ${report.threshold} days`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Fresh:** ${report.fresh} documents`);
  lines.push(`- **Stale:** ${report.stale.length} documents`);
  lines.push(`- **Unchecked:** ${report.unchecked} documents`);
  lines.push('');

  // Stale docs table
  if (report.stale.length > 0) {
    lines.push('## Stale Documentation');
    lines.push('');
    lines.push('The following documents may be out of sync with code changes:');
    lines.push('');
    lines.push('| Document | Last Verified | Related Changes |');
    lines.push('|----------|---------------|-----------------|');

    for (const staleDoc of report.stale) {
      const changesSummary = staleDoc.relatedChanges
        .map((change) => `\`${path.basename(change.file)}\` (${change.daysSinceVerified}d ago)`)
        .join('<br>');

      lines.push(`| [${staleDoc.title}](${staleDoc.doc}) | ${staleDoc.lastVerified} | ${changesSummary} |`);
    }

    lines.push('');
    lines.push('### Details');
    lines.push('');

    for (const staleDoc of report.stale) {
      lines.push(`#### ${staleDoc.title}`);
      lines.push('');
      lines.push(`**File:** \`${staleDoc.doc}\``);
      lines.push(`**Last Verified:** ${staleDoc.lastVerified}`);
      lines.push('');
      lines.push('**Related Code Changes:**');
      lines.push('');

      for (const change of staleDoc.relatedChanges) {
        lines.push(`- \`${change.file}\``);
        lines.push(`  - Last Modified: ${change.lastModified}`);
        lines.push(`  - Days Since Verification: ${change.daysSinceVerified}`);
        lines.push('');
      }
    }
  } else {
    lines.push('## ✅ All Documentation Up to Date');
    lines.push('');
    lines.push('No stale documentation detected. All docs are fresh!');
    lines.push('');
  }

  // Write report
  const markdown = lines.join('\n');
  await writeFile(outputPath, markdown, 'utf-8');
  console.log(`Markdown report written to: ${outputPath}`);
}
```

**JSON Report Example:**
```json
{
  "stale": [
    {
      "doc": "/home/ryan/.../apps/docs/src/auth/concepts/session-lifecycle.md",
      "title": "Session Lifecycle",
      "lastVerified": "2026-01-10",
      "relatedChanges": [
        {
          "file": "/home/ryan/.../packages/auth/src/session.service.ts",
          "lastModified": "2026-01-12",
          "daysSinceVerified": 2
        }
      ]
    }
  ],
  "fresh": 42,
  "unchecked": 5,
  "scannedAt": "2026-01-13T10:30:00.000Z",
  "threshold": 7
}
```

**Markdown Report Example:**
```markdown
# Documentation Staleness Report

**Generated:** 1/13/2026, 10:30:00 AM
**Threshold:** 7 days

## Summary

- **Fresh:** 42 documents
- **Stale:** 1 documents
- **Unchecked:** 5 documents

## Stale Documentation

The following documents may be out of sync with code changes:

| Document | Last Verified | Related Changes |
|----------|---------------|-----------------|
| [Session Lifecycle](/home/ryan/.../auth/concepts/session-lifecycle.md) | 2026-01-10 | `session.service.ts` (2d ago) |

### Details

#### Session Lifecycle

**File:** `/home/ryan/.../apps/docs/src/auth/concepts/session-lifecycle.md`
**Last Verified:** 2026-01-10

**Related Code Changes:**

- `/home/ryan/.../packages/auth/src/session.service.ts`
  - Last Modified: 2026-01-12
  - Days Since Verification: 2
```

---

### 8. Config Loader (`config-loader.ts`)

**Purpose:** Load configuration from YAML file and merge with CLI overrides.

**Implementation:**
```typescript
// apps/docs/scripts/lib/config-loader.ts

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import yaml from 'js-yaml';
import path from 'node:path';
import type { StalenessConfig } from './types.js';

const DEFAULT_CONFIG: StalenessConfig = {
  threshold: 7,
  ignore: [],
  docs_root: './src',
  output: {
    format: 'both',
    json_file: '.docs-staleness-report.json',
    markdown_file: 'docs-staleness-report.md',
  },
  git: {
    use_author_date: false,
    include_uncommitted: false,
  },
};

/**
 * Load configuration from file and merge with CLI overrides
 */
export async function loadConfig(
  configPath: string,
  overrides: Partial<StalenessConfig> = {}
): Promise<StalenessConfig> {
  let fileConfig: Partial<StalenessConfig> = {};

  // Load config file if it exists
  if (existsSync(configPath)) {
    try {
      const content = await readFile(configPath, 'utf-8');
      const parsed = yaml.load(content) as unknown;
      fileConfig = validateConfig(parsed);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
  }

  // Merge: defaults < file < CLI overrides
  const config: StalenessConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...overrides,
    output: {
      ...DEFAULT_CONFIG.output,
      ...fileConfig.output,
      ...overrides.output,
    },
    git: {
      ...DEFAULT_CONFIG.git,
      ...fileConfig.git,
      ...overrides.git,
    },
  };

  // Resolve relative paths to absolute
  config.docs_root = path.resolve(config.docs_root);
  config.output.json_file = path.resolve(config.output.json_file);
  config.output.markdown_file = path.resolve(config.output.markdown_file);

  return config;
}

/**
 * Validate and type-check parsed config
 */
function validateConfig(parsed: unknown): Partial<StalenessConfig> {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config must be an object');
  }

  const config = parsed as Record<string, unknown>;
  const validated: Partial<StalenessConfig> = {};

  // Validate threshold
  if (typeof config.threshold === 'number' && config.threshold > 0) {
    validated.threshold = config.threshold;
  }

  // Validate ignore patterns
  if (Array.isArray(config.ignore)) {
    validated.ignore = config.ignore.filter((item): item is string =>
      typeof item === 'string'
    );
  }

  // Validate docs_root
  if (typeof config.docs_root === 'string') {
    validated.docs_root = config.docs_root;
  }

  // Validate output config
  if (typeof config.output === 'object' && config.output !== null) {
    const output = config.output as Record<string, unknown>;
    validated.output = {};

    if (output.format === 'json' || output.format === 'markdown' || output.format === 'both') {
      validated.output.format = output.format;
    }

    if (typeof output.json_file === 'string') {
      validated.output.json_file = output.json_file;
    }

    if (typeof output.markdown_file === 'string') {
      validated.output.markdown_file = output.markdown_file;
    }
  }

  // Validate git config
  if (typeof config.git === 'object' && config.git !== null) {
    const git = config.git as Record<string, unknown>;
    validated.git = {};

    if (typeof git.use_author_date === 'boolean') {
      validated.git.use_author_date = git.use_author_date;
    }

    if (typeof git.include_uncommitted === 'boolean') {
      validated.git.include_uncommitted = git.include_uncommitted;
    }
  }

  return validated;
}
```

**Config Priority (low to high):**
1. DEFAULT_CONFIG (hardcoded defaults)
2. File config (`.docs-staleness.yml`)
3. CLI overrides (`--threshold`, `--format`, etc.)

**Error Handling:**
- Invalid YAML syntax: Log warning, use defaults
- Invalid config values: Skip invalid fields, use defaults
- Missing config file: Silently use defaults (file is optional)

---

### 9. Type Definitions (`types.ts`)

**Purpose:** Centralized TypeScript types for the staleness system.

**Implementation:**
```typescript
// apps/docs/scripts/lib/types.ts

/**
 * Parsed documentation metadata
 */
export interface DocMetadata {
  filePath: string;      // Absolute path to doc file
  title: string;         // Document title
  description: string;   // Document description
  relatedCode?: string[]; // Code file patterns
  lastVerified?: string; // ISO 8601 date (YYYY-MM-DD)
}

/**
 * Configuration for staleness detection
 */
export interface StalenessConfig {
  threshold: number;       // Days after which code changes are considered stale
  ignore: string[];        // Glob patterns for docs to ignore
  docs_root: string;       // Root directory for documentation
  output: {
    format: 'json' | 'markdown' | 'both';
    json_file: string;     // Output path for JSON report
    markdown_file: string; // Output path for Markdown report
  };
  git: {
    use_author_date: boolean;      // Use author date vs commit date
    include_uncommitted: boolean;  // Treat uncommitted files as changed
  };
}

/**
 * Code file change detected during staleness check
 */
export interface RelatedCodeChange {
  file: string;              // Absolute path to changed code file
  lastModified: string;      // ISO date file was last modified
  daysSinceVerified: number; // Days between doc verification and code change
}

/**
 * Stale documentation entry
 */
export interface StaleDoc {
  doc: string;                         // Absolute path to stale doc
  title: string;                       // Document title
  lastVerified: string;                // ISO date doc was verified
  relatedChanges: RelatedCodeChange[]; // Code files that changed
}

/**
 * Staleness check report
 */
export interface StalenessReport {
  stale: StaleDoc[];    // Stale documentation entries
  fresh: number;        // Count of fresh docs
  unchecked: number;    // Count of docs without staleness metadata
  scannedAt: string;    // ISO timestamp of scan
  threshold: number;    // Threshold used (in days)
}
```

**Type Design Principles:**
- All paths stored as absolute paths (no relative path ambiguity)
- All dates stored as ISO 8601 strings (YYYY-MM-DD or full ISO timestamp)
- Use branded types for type safety where needed
- Export all interfaces for use in tests and other modules

---

## Acceptance Criteria Breakdown

### AC1: Frontmatter schema defined for doc-code relationships

**Implementation:**
- Add `related_code: string[]` and `last_verified: string` to frontmatter
- Document schema in KB page design guide
- Validate dates are ISO 8601 format

**Testing:**
```yaml
# Test frontmatter
---
title: Test Doc
description: Test
related_code:
  - packages/auth/src/session.service.ts
  - apps/api/src/middleware/*.ts
last_verified: 2026-01-12
---
```

**Done When:**
- Schema documented in `kb-page-design.md`
- Parser correctly extracts `related_code` and `last_verified`
- Invalid dates are rejected with warnings

---

### AC2: Docs can declare related code paths in frontmatter

**Implementation:**
- Support absolute paths from repo root
- Support glob patterns (`**/*.ts`)
- Support multiple related files per doc

**Testing:**
```typescript
const doc = await parseDocFrontmatter('test.md');
expect(doc.relatedCode).toEqual([
  'packages/auth/src/session.service.ts',
  'apps/api/src/middleware/*.ts',
]);
```

**Done When:**
- Multiple code paths supported
- Glob patterns expand correctly
- Paths validated relative to repo root

---

### AC3: Script scans all docs in apps/docs/src/ and extracts relationships

**Implementation:**
- Use `glob` to find all `.md` files
- Parse frontmatter with `gray-matter`
- Skip files with parsing errors (log warning)

**Testing:**
```bash
pnpm docs:check-stale --verbose
# Should output: "Found X documentation files"
```

**Done When:**
- All `.md` files in `src/` scanned recursively
- Frontmatter extracted from each file
- Errors logged but don't stop scan

---

### AC4: Script compares doc verification date with code file last-modified

**Implementation:**
- Query git for last commit date of each related code file
- Compare `codeLastModified > (docLastVerified + threshold)`
- Flag as stale if threshold exceeded

**Testing:**
```typescript
// Mock scenario:
// Doc verified: 2026-01-01
// Code changed: 2026-01-10
// Threshold: 7 days
// Expected: Stale (9 days > 7 days)

const report = await checkStaleness(docs, { threshold: 7 });
expect(report.stale.length).toBe(1);
```

**Done When:**
- Git queries return accurate last commit dates
- Date comparison logic is correct
- Threshold applied correctly

---

### AC5: Report generated listing potentially stale docs

**Implementation:**
- Generate JSON report with structured data
- Generate Markdown report with tables
- Include doc path, title, related changes

**Testing:**
```bash
pnpm docs:check-stale --format both
# Check output files exist
ls .docs-staleness-report.json
ls docs-staleness-report.md
```

**Done When:**
- JSON report is valid JSON
- Markdown report is well-formatted
- Both reports contain same data
- Reports are human-readable

---

### AC6: Configurable threshold for staleness (e.g., code changed 7+ days after doc)

**Implementation:**
- Load threshold from config file
- Allow CLI override with `--threshold` flag
- Default to 7 days if not specified

**Testing:**
```bash
# Use default threshold (7 days)
pnpm docs:check-stale

# Override threshold via CLI
pnpm docs:check-stale --threshold 14

# Override threshold via config file
echo "threshold: 14" > .docs-staleness.yml
pnpm docs:check-stale
```

**Done When:**
- Threshold can be set in config file
- Threshold can be overridden via CLI
- Default threshold is 7 days
- Threshold applied consistently

---

### AC7: Ignore patterns supported (e.g., stable reference docs)

**Implementation:**
- Load ignore patterns from config file
- Use glob patterns to match paths
- Skip matching files during scan

**Testing:**
```yaml
# Config file
ignore:
  - '**/references/**'
  - '**/drafts/**'
```

```bash
pnpm docs:check-stale
# Should not scan files in references/ or drafts/
```

**Done When:**
- Ignore patterns work with glob syntax
- Ignored files excluded from scan
- Multiple patterns supported

---

### AC8: JSON/markdown output format for integration with CI

**Implementation:**
- JSON format for machine parsing
- Markdown format for human readability
- Both formats contain same data

**Testing:**
```bash
# Generate JSON only
pnpm docs:check-stale --format json

# Generate Markdown only
pnpm docs:check-stale --format markdown

# Generate both (default)
pnpm docs:check-stale --format both
```

**Done When:**
- JSON report is valid JSON
- Markdown report is valid Markdown
- Both formats are complete and accurate

---

### AC9: `pnpm docs:check-stale` command available

**Implementation:**
- Add script to root `package.json`
- Delegate to TypeScript CLI via `tsx`
- Support `--help` flag for usage

**Testing:**
```bash
pnpm docs:check-stale --help
# Should display help message

pnpm docs:check-stale
# Should run staleness check
```

**Done When:**
- Command runs from repo root
- Help message is clear and accurate
- All CLI flags work correctly

---

## Test Strategy

### Unit Tests

**Module:** `frontmatter-parser.ts`
```typescript
describe('frontmatter-parser', () => {
  it('should parse valid frontmatter', async () => {
    const doc = await parseDocFrontmatter('test.md');
    expect(doc?.relatedCode).toEqual(['packages/auth/src/session.ts']);
    expect(doc?.lastVerified).toBe('2026-01-12');
  });

  it('should reject invalid date formats', async () => {
    const doc = await parseDocFrontmatter('test-invalid-date.md');
    expect(doc).toBeNull();
  });

  it('should expand glob patterns', async () => {
    const paths = await expandRelatedCodePaths(['packages/**/*.ts'], '/repo');
    expect(paths.length).toBeGreaterThan(0);
  });
});
```

**Module:** `git-helper.ts`
```typescript
describe('git-helper', () => {
  it('should get file last modified date', async () => {
    const date = await getFileLastModified('/path/to/file.ts');
    expect(date).toBeInstanceOf(Date);
  });

  it('should return null for non-existent files', async () => {
    const date = await getFileLastModified('/does/not/exist.ts');
    expect(date).toBeNull();
  });

  it('should detect git repository', async () => {
    const isAvailable = await isGitAvailable();
    expect(isAvailable).toBe(true);
  });
});
```

**Module:** `staleness-checker.ts`
```typescript
describe('staleness-checker', () => {
  it('should detect stale documentation', async () => {
    const docs: DocMetadata[] = [
      {
        filePath: '/docs/test.md',
        title: 'Test',
        description: 'Test',
        relatedCode: ['packages/auth/src/session.ts'],
        lastVerified: '2026-01-01',
      },
    ];

    const config: StalenessConfig = {
      threshold: 7,
      // ... other config
    };

    const report = await checkStaleness(docs, config);
    expect(report.stale.length).toBeGreaterThanOrEqual(0);
  });

  it('should categorize docs correctly', async () => {
    // Test fresh, stale, and unchecked categorization
  });
});
```

**Module:** `report-generator.ts`
```typescript
describe('report-generator', () => {
  it('should generate valid JSON report', async () => {
    const report: StalenessReport = {
      stale: [],
      fresh: 42,
      unchecked: 5,
      scannedAt: new Date().toISOString(),
      threshold: 7,
    };

    await generateJsonReport(report, '/tmp/report.json');
    const content = await readFile('/tmp/report.json', 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(report);
  });

  it('should generate valid Markdown report', async () => {
    // Test Markdown generation
  });
});
```

---

### Integration Tests

**End-to-End Test:**
```bash
# Test full staleness check workflow
pnpm docs:check-stale --config test-config.yml --format both

# Verify reports generated
test -f .docs-staleness-report.json
test -f docs-staleness-report.md

# Verify exit code
if pnpm docs:check-stale; then
  echo "No stale docs found"
else
  echo "Stale docs detected"
fi
```

**Test Scenarios:**
1. **No stale docs:** All docs fresh, exit code 0
2. **Stale docs found:** Some docs stale, exit code 1
3. **Missing config:** Use defaults, run successfully
4. **Invalid config:** Log warning, use defaults
5. **Git not available:** Fail with clear error message
6. **No related_code:** Docs counted as unchecked
7. **Glob pattern matching:** Expands to multiple files

---

## Edge Cases

### 1. File in `related_code` but not in git history

**Scenario:** File is new and hasn't been committed yet.

**Impact:** Can't determine last modified date.

**Handling:**
- `getFileLastModified()` returns `null`
- Skip this file in staleness check
- Don't flag doc as stale based on uncommitted files
- Log warning: "File has no git history: path/to/file.ts"

**Test:**
```bash
# Create new file
echo "export const test = 'new';" > new-file.ts

# Add to doc frontmatter
# related_code: ['new-file.ts']

# Run check
pnpm docs:check-stale
# Should log warning and skip file
```

---

### 2. Glob pattern matches no files

**Scenario:** `related_code` contains `packages/nonexistent/**/*.ts` which matches nothing.

**Impact:** No code files to check.

**Handling:**
- `expandRelatedCodePaths()` returns empty array
- Count doc as "unchecked" (not stale, not fresh)
- Log warning: "No code files found for pattern: packages/nonexistent/**/*.ts"

**Test:**
```yaml
related_code:
  - 'packages/does-not-exist/**/*.ts'
```

---

### 3. Doc has `related_code` but no `last_verified`

**Scenario:** Developer added `related_code` but forgot `last_verified`.

**Impact:** Can't determine if doc is stale (no baseline).

**Handling:**
- Count doc as "unchecked"
- Don't flag as stale
- Consider logging info message suggesting adding `last_verified`

**Test:**
```yaml
related_code:
  - 'packages/auth/src/session.ts'
# Missing last_verified
```

---

### 4. Doc has `last_verified` but no `related_code`

**Scenario:** Developer added `last_verified` but no `related_code`.

**Impact:** No code files to check against.

**Handling:**
- Count doc as "unchecked"
- Both fields required for staleness check

---

### 5. Invalid date format in `last_verified`

**Scenario:** `last_verified: "January 12, 2026"` (not ISO 8601).

**Impact:** Can't parse date for comparison.

**Handling:**
- `isValidISODate()` returns false
- Log warning: "Invalid date format in path/to/doc.md: January 12, 2026"
- Skip doc (return null from `parseDocFrontmatter`)
- Don't include in report

**Test:**
```yaml
last_verified: "January 12, 2026"  # Invalid format
```

---

### 6. Git repository not initialized

**Scenario:** Run in non-git directory or git not installed.

**Impact:** Can't query file modification dates.

**Handling:**
- `isGitAvailable()` returns false
- CLI exits with error: "Not a git repository - staleness check requires git"
- Exit code: 2 (script error, not stale docs)

**Test:**
```bash
cd /tmp
mkdir test-no-git
cd test-no-git
pnpm docs:check-stale
# Should fail with clear error message
```

---

### 7. Ignore pattern matches all docs

**Scenario:** Config has `ignore: ['**/*']` which matches everything.

**Impact:** No docs scanned.

**Handling:**
- `scanDocuments()` returns empty array
- Report shows: fresh=0, stale=0, unchecked=0
- Log info: "No documentation files found (all may be ignored)"

---

### 8. Code file deleted but still in `related_code`

**Scenario:** File was deleted from codebase but doc still references it.

**Impact:** File doesn't exist on filesystem.

**Handling:**
- `existsSync()` returns false in `getFileLastModified()`
- Return null (can't get modification date)
- Skip file in staleness check
- Log warning: "File not found: packages/auth/src/deleted.ts"

---

### 9. Very large codebase (1000+ docs)

**Scenario:** Scanning takes longer than 30 seconds.

**Impact:** Timeout or slow CI builds.

**Handling:**
- Batch git queries with concurrency limit (10 concurrent)
- Cache git results within single run
- Use `--verbose` flag to show progress
- Consider adding progress bar for UX

**Optimization:**
```typescript
// Batch queries instead of sequential
const codeModDates = await batchGetFileLastModified(codePaths);
```

---

### 10. Relative vs absolute paths in config

**Scenario:** Config has relative paths: `docs_root: './src'`.

**Impact:** Path resolution depends on CWD.

**Handling:**
- Always resolve to absolute paths in `loadConfig()`
- Use `path.resolve()` for all paths
- No ambiguity about where files are

**Implementation:**
```typescript
config.docs_root = path.resolve(config.docs_root);
```

---

## Open Questions

### Q1: Should we support uncommitted changes detection?

**Context:** Currently only committed code changes trigger staleness. Uncommitted changes in working directory are ignored.

**Options:**
1. Keep current behavior (committed changes only)
2. Add `--include-uncommitted` flag to detect working directory changes
3. Use file modification time from filesystem if git fails

**Recommendation:** Keep current behavior for MVP. Uncommitted changes are developer's local work-in-progress and shouldn't affect staleness for other team members.

**Decision Needed From:** PM/Developer

---

### Q2: Should we add automatic doc verification date updates?

**Context:** Current implementation only *detects* staleness. It doesn't auto-update `last_verified` dates.

**Options:**
1. Read-only (current): Only report staleness
2. Write-back: Add `--fix` flag that updates `last_verified` to today
3. Interactive: Prompt user to confirm verification before updating

**Recommendation:** Read-only for MVP (E06-T003). Add write-back feature in follow-up task (E06-T004 or later).

**Decision Needed From:** PM

---

### Q3: Should we integrate with GitHub Actions for PR comments?

**Context:** CI could post staleness reports as PR comments.

**Options:**
1. Manual only (current): Run locally or in CI, check exit code
2. PR comments: Post Markdown report as PR comment when stale docs found
3. Status checks: Block PR merge if stale docs detected

**Recommendation:** Manual for MVP (E06-T003). PR integration in E06-T004.

**Decision Needed From:** PM

---

### Q4: How to handle monorepo packages that don't affect docs?

**Context:** Changes to `apps/worker/` may not affect KB docs about `packages/auth/`.

**Options:**
1. Granular: Docs only track relevant code files (current approach)
2. Automatic: Detect dependencies and track transitively
3. Package-level: Track entire package directories

**Recommendation:** Keep granular approach (current). Developers must explicitly declare relevant files in `related_code`. This is more accurate than automatic detection.

**Decision Needed From:** Developer preference

---

### Q5: Should we support custom git branches for comparison?

**Context:** Currently compares against last commit on current branch.

**Options:**
1. Current branch only (current)
2. Compare against `main` branch (docs verified against stable code)
3. CLI flag: `--branch main`

**Recommendation:** Current branch for MVP. Branch comparison is edge case.

**Decision Needed From:** PM

---

## Implementation Steps

### Phase 1: Foundation (Critical)

**Step 1:** Install dependencies
```bash
cd apps/docs
pnpm add -D gray-matter glob yargs js-yaml
pnpm add -D @types/yargs @types/js-yaml
```

**Step 2:** Create type definitions (`types.ts`)
- Define all interfaces
- Export for use in other modules

**Step 3:** Create git helper (`git-helper.ts`)
- Implement `getFileLastModified()`
- Implement `isGitAvailable()`
- Implement `getGitRepoRoot()`
- Add unit tests

**Step 4:** Create frontmatter parser (`frontmatter-parser.ts`)
- Implement `scanDocuments()`
- Implement `parseDocFrontmatter()`
- Implement `expandRelatedCodePaths()`
- Add unit tests

**Estimated Time:** 2-3 hours

---

### Phase 2: Core Logic (High Priority)

**Step 5:** Create staleness checker (`staleness-checker.ts`)
- Implement `checkStaleness()` algorithm
- Handle all edge cases
- Add unit tests

**Step 6:** Create report generator (`report-generator.ts`)
- Implement JSON report generation
- Implement Markdown report generation
- Add unit tests

**Step 7:** Create config loader (`config-loader.ts`)
- Implement YAML config loading
- Implement CLI override merging
- Add validation
- Add unit tests

**Estimated Time:** 3-4 hours

---

### Phase 3: CLI Integration (Medium Priority)

**Step 8:** Create CLI entry point (`check-staleness.ts`)
- Implement argument parsing with yargs
- Wire up all modules
- Add error handling
- Add verbose logging

**Step 9:** Add pnpm script to root package.json
```json
{
  "scripts": {
    "docs:check-stale": "cd apps/docs && tsx scripts/check-staleness.ts"
  }
}
```

**Step 10:** Test CLI end-to-end
```bash
pnpm docs:check-stale --help
pnpm docs:check-stale
pnpm docs:check-stale --verbose
pnpm docs:check-stale --format json
```

**Estimated Time:** 2-3 hours

---

### Phase 4: Documentation and Polish (Low Priority)

**Step 11:** Document frontmatter schema
- Update `kb-page-design.md` with `related_code` and `last_verified` fields
- Add examples and usage guidelines

**Step 12:** Create example config file
- Add `.docs-staleness.yml` with commented defaults
- Document all config options

**Step 13:** Add integration tests
- Test full workflow end-to-end
- Test edge cases
- Test error scenarios

**Step 14:** Update CONVENTIONS.md
- Document staleness check workflow
- Add to KB documentation standards

**Step 15:** Final QA
- Go through all acceptance criteria
- Test all CLI flags
- Verify reports are accurate
- Check performance on full KB

**Estimated Time:** 2-3 hours

---

### Total Estimated Time: 9-13 hours

---

## Success Metrics

### Functionality
- [ ] All 9 acceptance criteria met
- [ ] CLI runs without errors
- [ ] Reports generated accurately
- [ ] Edge cases handled gracefully
- [ ] Exit codes correct

### Performance
- [ ] Scans 100 docs in under 30 seconds
- [ ] Git queries batched efficiently
- [ ] No memory leaks
- [ ] Reasonable CPU usage

### Code Quality
- [ ] Zero TypeScript errors (`pnpm typecheck`)
- [ ] Zero linting errors (`pnpm lint`)
- [ ] 80%+ test coverage
- [ ] All unit tests passing
- [ ] Integration tests passing

### Documentation
- [ ] Frontmatter schema documented
- [ ] Config file documented
- [ ] CLI help message clear
- [ ] README or CONVENTIONS.md updated

### User Experience
- [ ] Clear error messages
- [ ] Helpful warnings
- [ ] Progress indication (verbose mode)
- [ ] Reports easy to understand

---

## Related Documentation

- [VitePress Frontmatter](https://vitepress.dev/guide/frontmatter)
- [gray-matter Documentation](https://github.com/jonschlinkert/gray-matter)
- [glob Documentation](https://github.com/isaacs/node-glob)
- [yargs Documentation](https://yargs.js.org/)
- Git man pages: `man git-log`
- ISO 8601 Date Format: [Wikipedia](https://en.wikipedia.org/wiki/ISO_8601)

---

## Notes for Developer

### Helpful Commands

```bash
# Development
pnpm docs:check-stale --help              # Show help
pnpm docs:check-stale --verbose           # Verbose output
pnpm docs:check-stale --format json       # JSON output only
pnpm docs:check-stale --threshold 14      # Custom threshold

# Testing
pnpm test apps/docs                       # Run unit tests
pnpm test:watch apps/docs                 # Watch mode

# Type checking
pnpm typecheck                            # Check all types

# Debugging
tsx --inspect scripts/check-staleness.ts  # Debug with DevTools
```

### Git Commands for Testing

```bash
# Get last commit date of file
git log --format=%ci --max-count=1 -- path/to/file.ts

# Get repository root
git rev-parse --show-toplevel

# Check if git is available
git --version
```

### TypeScript Best Practices

```typescript
// Use type guards for unknown values
function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Use Zod for complex validation if needed
import { z } from 'zod';
const frontmatterSchema = z.object({
  related_code: z.array(z.string()).optional(),
  last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Never use 'any' - use 'unknown' and narrow
function parseConfig(raw: unknown): StalenessConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid config');
  }
  // Type narrowing...
}
```

### Debugging Tips

- Use `--verbose` flag to see detailed scan progress
- Check git output manually to verify dates
- Use `console.log` strategically (remove before committing)
- Test with small subset of docs first
- Verify glob patterns with `glob` CLI

---

## File Locations Summary

**New Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/check-staleness.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/frontmatter-parser.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/git-helper.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/staleness-checker.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/report-generator.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/config-loader.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/lib/types.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.docs-staleness.yml` (optional config)
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/scripts/__tests__/*.test.ts` (unit tests)

**Modified Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/package.json` (add `docs:check-stale` script)
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/package.json` (add dev dependencies)
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/kb-page-design.md` (document schema)

---

**Spec Status:** ✅ Complete
**Ready for Developer:** Yes
**Estimated Complexity:** Medium-High
**Estimated Time:** 9-13 hours
