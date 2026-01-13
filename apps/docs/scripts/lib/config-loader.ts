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
    validated.ignore = config.ignore.filter(
      (item): item is string => typeof item === 'string'
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

    if (
      output.format === 'json' ||
      output.format === 'markdown' ||
      output.format === 'both'
    ) {
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
