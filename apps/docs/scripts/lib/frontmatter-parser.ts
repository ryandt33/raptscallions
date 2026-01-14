// apps/docs/scripts/lib/frontmatter-parser.ts

import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import path from 'node:path';
import type { DocMetadata } from './types.js';

// Use JSON_SCHEMA which doesn't include timestamp parsing
// This prevents gray-matter from auto-converting invalid date strings
// like "2026-13-45" into valid dates through JavaScript's date rolling
// JSON_SCHEMA still parses booleans, numbers, and null correctly
const matterOptions = {
  engines: {
    yaml: {
      parse: (str: string) => yaml.load(str, { schema: yaml.JSON_SCHEMA }),
      stringify: yaml.dump,
    },
  },
};

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
    const { data } = matter(content, matterOptions);

    // Extract required fields
    const title = typeof data.title === 'string' ? data.title : 'Untitled';
    const description =
      typeof data.description === 'string' ? data.description : '';

    // Extract optional staleness fields
    const relatedCode = Array.isArray(data.related_code)
      ? data.related_code.filter(
          (item): item is string => typeof item === 'string'
        )
      : undefined;

    // Handle last_verified - with FAILSAFE_SCHEMA it will always be a string if present
    let lastVerified: string | undefined;
    if (typeof data.last_verified === 'string') {
      lastVerified = data.last_verified;
    } else {
      lastVerified = undefined;
    }

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
  if (isNaN(date.getTime())) {
    return false;
  }

  // Verify that the date components are valid (e.g., month 13 is invalid)
  // by checking if the parsed date, when converted back, matches the original
  const isoString = date.toISOString().split('T')[0];
  return isoString === dateString;
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
    files.forEach((file) => expandedPaths.add(file));
  }

  return Array.from(expandedPaths);
}
