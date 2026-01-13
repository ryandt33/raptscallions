// apps/docs/scripts/lib/staleness-checker.ts

import { expandRelatedCodePaths } from './frontmatter-parser.js';
import { batchGetFileLastModified, getGitRepoRoot } from './git-helper.js';
import type {
  DocMetadata,
  StalenessConfig,
  StalenessReport,
  StaleDoc,
  RelatedCodeChange,
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
    if (
      !doc.relatedCode ||
      doc.relatedCode.length === 0 ||
      !doc.lastVerified
    ) {
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
