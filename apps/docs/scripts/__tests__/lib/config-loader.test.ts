import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadConfig } from '../../lib/config-loader';
import type { StalenessConfig } from '../../lib/types';

// Mock dependencies
vi.mock('node:fs/promises');
vi.mock('node:fs');

describe('config-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const config = await loadConfig('.docs-staleness.yml');

      expect(config.threshold).toBe(7);
      expect(config.ignore).toEqual([]);
      expect(config.output.format).toBe('both');
      expect(config.git.use_author_date).toBe(false);
    });

    it('should load and parse valid YAML config', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: 14
ignore:
  - '**/references/**'
  - '**/drafts/**'
docs_root: './src'
output:
  format: json
  json_file: custom-report.json
  markdown_file: custom-report.md
git:
  use_author_date: true
  include_uncommitted: true
`);

      const config = await loadConfig('.docs-staleness.yml');

      expect(config.threshold).toBe(14);
      expect(config.ignore).toEqual(['**/references/**', '**/drafts/**']);
      expect(config.output.format).toBe('json');
      expect(config.output.json_file).toMatch(/custom-report\.json$/);
      expect(config.git.use_author_date).toBe(true);
      expect(config.git.include_uncommitted).toBe(true);
    });

    it('should merge file config with CLI overrides', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: 14
output:
  format: json
`);

      const overrides: Partial<StalenessConfig> = {
        threshold: 30,
        output: {
          format: 'markdown',
          json_file: 'override.json',
          markdown_file: 'override.md',
        },
      };

      const config = await loadConfig('.docs-staleness.yml', overrides);

      // CLI overrides should take precedence
      expect(config.threshold).toBe(30);
      expect(config.output.format).toBe('markdown');
      expect(config.output.json_file).toMatch(/override\.json$/);
    });

    it('should use defaults when config file is invalid YAML', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: 14
this is: [invalid yaml
  not properly: closed
`);

      const config = await loadConfig('.docs-staleness.yml');

      // Should fall back to defaults
      expect(config.threshold).toBe(7);
      expect(config.output.format).toBe('both');
    });

    it('should skip invalid config values', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: -5
ignore: "not an array"
output:
  format: invalid_format
git:
  use_author_date: "not a boolean"
`);

      const config = await loadConfig('.docs-staleness.yml');

      // Invalid values should be replaced with defaults
      expect(config.threshold).toBe(7); // Invalid threshold ignored
      expect(config.ignore).toEqual([]); // Invalid ignore ignored
      expect(config.output.format).toBe('both'); // Invalid format ignored
      expect(config.git.use_author_date).toBe(false); // Invalid boolean ignored
    });

    it('should filter out non-string items from ignore array', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
ignore:
  - '**/references/**'
  - 123
  - null
  - '**/drafts/**'
`);

      const config = await loadConfig('.docs-staleness.yml');

      expect(config.ignore).toEqual(['**/references/**', '**/drafts/**']);
    });

    it('should resolve relative paths to absolute', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
docs_root: ./src
output:
  json_file: ./reports/report.json
  markdown_file: ./reports/report.md
`);

      const config = await loadConfig('.docs-staleness.yml');

      // Paths should be absolute
      expect(config.docs_root).toMatch(/^\/.*\/src$/);
      expect(config.output.json_file).toMatch(/^\/.*\/reports\/report\.json$/);
      expect(config.output.markdown_file).toMatch(/^\/.*\/reports\/report\.md$/);
    });

    it('should accept all valid output formats', async () => {
      const formats = ['json', 'markdown', 'both'] as const;

      for (const format of formats) {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFile).mockResolvedValue(`
output:
  format: ${format}
`);

        const config = await loadConfig('.docs-staleness.yml');
        expect(config.output.format).toBe(format);
      }
    });

    it('should accept positive threshold values', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: 30
`);

      const config = await loadConfig('.docs-staleness.yml');
      expect(config.threshold).toBe(30);
    });

    it('should reject zero and negative threshold values', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
threshold: 0
`);

      const config = await loadConfig('.docs-staleness.yml');
      expect(config.threshold).toBe(7); // Falls back to default
    });

    it('should merge nested output config correctly', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
output:
  format: json
`);

      const overrides: Partial<StalenessConfig> = {
        output: {
          markdown_file: 'override.md',
        } as never, // Partial override
      };

      const config = await loadConfig('.docs-staleness.yml', overrides);

      // Should merge output config, not replace
      expect(config.output.format).toBe('json'); // From file
      expect(config.output.markdown_file).toMatch(/override\.md$/); // From override
      expect(config.output.json_file).toMatch(/\.docs-staleness-report\.json$/); // From default
    });

    it('should merge nested git config correctly', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
git:
  use_author_date: true
`);

      const overrides: Partial<StalenessConfig> = {
        git: {
          include_uncommitted: true,
        } as never, // Partial override
      };

      const config = await loadConfig('.docs-staleness.yml', overrides);

      // Should merge git config, not replace
      expect(config.git.use_author_date).toBe(true); // From file
      expect(config.git.include_uncommitted).toBe(true); // From override
    });

    it('should handle config file read error gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'));

      const config = await loadConfig('.docs-staleness.yml');

      // Should fall back to defaults
      expect(config.threshold).toBe(7);
      expect(config.output.format).toBe('both');
    });

    it('should handle config that is not an object', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue('just a string');

      const config = await loadConfig('.docs-staleness.yml');

      // Should fall back to defaults
      expect(config.threshold).toBe(7);
      expect(config.output.format).toBe('both');
    });

    it('should handle empty config file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue('');

      const config = await loadConfig('.docs-staleness.yml');

      // Should use defaults
      expect(config.threshold).toBe(7);
      expect(config.output.format).toBe('both');
    });

    it('should preserve boolean false values', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(`
git:
  use_author_date: false
  include_uncommitted: false
`);

      const config = await loadConfig('.docs-staleness.yml');

      expect(config.git.use_author_date).toBe(false);
      expect(config.git.include_uncommitted).toBe(false);
    });
  });
});
