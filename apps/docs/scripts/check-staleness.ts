#!/usr/bin/env node
// apps/docs/scripts/check-staleness.ts

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from './lib/config-loader.js';
import { scanDocuments } from './lib/frontmatter-parser.js';
import { checkStaleness } from './lib/staleness-checker.js';
import { generateReport } from './lib/report-generator.js';
import type { StalenessConfig } from './lib/types.js';

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
    // Build config overrides from CLI arguments
    const overrides: Partial<StalenessConfig> = {};

    if (argv.threshold !== undefined) {
      overrides.threshold = argv.threshold;
    }

    if (argv.format !== undefined || argv.output !== undefined) {
      overrides.output = {};

      if (argv.format !== undefined) {
        overrides.output.format = argv.format as 'json' | 'markdown' | 'both';
      }

      // Handle --output flag
      if (argv.output !== undefined) {
        const outputPath = argv.output as string;
        const format = argv.format as 'json' | 'markdown' | 'both' | undefined;

        if (format === 'json') {
          // JSON only - use output path directly
          overrides.output.json_file = outputPath;
        } else if (format === 'markdown') {
          // Markdown only - use output path directly
          overrides.output.markdown_file = outputPath;
        } else {
          // Both formats (or format not specified) - add appropriate extensions
          // Replace extension if present, otherwise append
          const baseOutput = outputPath.replace(/\.(json|md)$/, '');
          overrides.output.json_file = `${baseOutput}.json`;
          overrides.output.markdown_file = `${baseOutput}.md`;
        }
      }
    }

    // Load configuration with CLI overrides
    const config = await loadConfig(argv.config as string, overrides);

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
