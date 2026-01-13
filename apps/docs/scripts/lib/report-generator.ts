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

  // Ensure output directories exist for both files
  const jsonDir = path.dirname(json_file);
  const markdownDir = path.dirname(markdown_file);

  await mkdir(jsonDir, { recursive: true });
  if (markdownDir !== jsonDir) {
    await mkdir(markdownDir, { recursive: true });
  }

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
        .map(
          (change) =>
            `\`${path.basename(change.file)}\` (${change.daysSinceVerified}d ago)`
        )
        .join('<br>');

      lines.push(
        `| [${staleDoc.title}](${staleDoc.doc}) | ${staleDoc.lastVerified} | ${changesSummary} |`
      );
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
