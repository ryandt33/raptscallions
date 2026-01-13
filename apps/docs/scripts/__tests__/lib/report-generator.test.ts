import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { writeFile, mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { generateReport } from '../../lib/report-generator';
import type { StalenessReport, StalenessConfig } from '../../lib/types';

// Mock dependencies
vi.mock('node:fs/promises');

describe('report-generator', () => {
  let mockConfig: StalenessConfig;
  let mockReport: StalenessReport;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      threshold: 7,
      ignore: [],
      docs_root: '/repo/apps/docs/src',
      output: {
        format: 'both',
        json_file: '/tmp/report.json',
        markdown_file: '/tmp/report.md',
      },
      git: {
        use_author_date: false,
        include_uncommitted: false,
      },
    };

    mockReport = {
      stale: [
        {
          doc: '/repo/apps/docs/src/auth/session.md',
          title: 'Session Lifecycle',
          lastVerified: '2026-01-10',
          relatedChanges: [
            {
              file: '/repo/packages/auth/src/session.ts',
              lastModified: '2026-01-12',
              daysSinceVerified: 2,
            },
          ],
        },
      ],
      fresh: 42,
      unchecked: 5,
      scannedAt: '2026-01-13T10:30:00.000Z',
      threshold: 7,
    };
  });

  describe('generateReport', () => {
    it('should generate JSON report when format is json', async () => {
      mockConfig.output.format = 'json';

      await generateReport(mockReport, mockConfig);

      // Verify mkdir was called
      expect(mkdir).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );

      // Verify JSON file was written
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/report.json',
        expect.stringContaining('"stale"'),
        'utf-8'
      );

      // Verify markdown file was NOT written
      expect(writeFile).not.toHaveBeenCalledWith(
        '/tmp/report.md',
        expect.anything(),
        expect.anything()
      );
    });

    it('should generate Markdown report when format is markdown', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      // Verify markdown file was written
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/report.md',
        expect.stringContaining('# Documentation Staleness Report'),
        'utf-8'
      );

      // Verify JSON file was NOT written
      expect(writeFile).not.toHaveBeenCalledWith(
        '/tmp/report.json',
        expect.anything(),
        expect.anything()
      );
    });

    it('should generate both reports when format is both', async () => {
      mockConfig.output.format = 'both';

      await generateReport(mockReport, mockConfig);

      // Verify both files were written
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/report.json',
        expect.any(String),
        'utf-8'
      );
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/report.md',
        expect.any(String),
        'utf-8'
      );
    });

    it('should create output directory if it does not exist', async () => {
      await generateReport(mockReport, mockConfig);

      expect(mkdir).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should generate valid JSON report', async () => {
      mockConfig.output.format = 'json';

      await generateReport(mockReport, mockConfig);

      // Get the JSON string that was written
      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.json'
      );
      expect(writeCall).toBeDefined();

      const jsonString = writeCall?.[1] as string;
      const parsed = JSON.parse(jsonString);

      expect(parsed.stale).toHaveLength(1);
      expect(parsed.fresh).toBe(42);
      expect(parsed.unchecked).toBe(5);
      expect(parsed.threshold).toBe(7);
    });

    it('should generate Markdown report with correct structure', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      // Get the markdown string that was written
      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      expect(writeCall).toBeDefined();

      const markdown = writeCall?.[1] as string;

      // Verify markdown structure
      expect(markdown).toContain('# Documentation Staleness Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('**Fresh:** 42 documents');
      expect(markdown).toContain('**Stale:** 1 documents');
      expect(markdown).toContain('**Unchecked:** 5 documents');
      expect(markdown).toContain('## Stale Documentation');
    });

    it('should generate Markdown report with no stale docs message', async () => {
      mockConfig.output.format = 'markdown';
      mockReport.stale = [];
      mockReport.fresh = 100;

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('## ✅ All Documentation Up to Date');
      expect(markdown).toContain('No stale documentation detected');
    });

    it('should include stale doc details in Markdown report', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('Session Lifecycle');
      expect(markdown).toContain('2026-01-10');
      expect(markdown).toContain('session.ts');
      expect(markdown).toContain('2d ago');
    });

    it('should handle multiple stale docs in Markdown report', async () => {
      mockConfig.output.format = 'markdown';
      mockReport.stale.push({
        doc: '/repo/apps/docs/src/api/routes.md',
        title: 'API Routes',
        lastVerified: '2026-01-08',
        relatedChanges: [
          {
            file: '/repo/apps/api/src/routes/users.ts',
            lastModified: '2026-01-15',
            daysSinceVerified: 7,
          },
        ],
      });

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('Session Lifecycle');
      expect(markdown).toContain('API Routes');
    });

    it('should handle multiple related changes per doc in Markdown report', async () => {
      mockConfig.output.format = 'markdown';
      mockReport.stale[0]?.relatedChanges.push({
        file: '/repo/packages/auth/src/lucia.ts',
        lastModified: '2026-01-14',
        daysSinceVerified: 4,
      });

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('session.ts');
      expect(markdown).toContain('lucia.ts');
      expect(markdown).toContain('2d ago');
      expect(markdown).toContain('4d ago');
    });

    it('should format dates correctly in Markdown report', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      // Check for properly formatted dates
      expect(markdown).toContain('2026-01-10');
    });

    it('should include threshold in Markdown report', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('**Threshold:** 7 days');
    });

    it('should include generated timestamp in Markdown report', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      expect(markdown).toContain('**Generated:**');
    });

    it('should create valid Markdown table syntax', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      // Check for table structure
      expect(markdown).toContain('| Document | Last Verified | Related Changes |');
      expect(markdown).toContain('|----------|---------------|-----------------|');
    });

    it('should pretty-print JSON with indentation', async () => {
      mockConfig.output.format = 'json';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.json'
      );
      const jsonString = writeCall?.[1] as string;

      // Check for indentation (2 spaces)
      expect(jsonString).toContain('  "stale"');
      expect(jsonString).toContain('  "fresh"');
    });

    it('should handle empty stale array in JSON report', async () => {
      mockConfig.output.format = 'json';
      mockReport.stale = [];

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.json'
      );
      const jsonString = writeCall?.[1] as string;
      const parsed = JSON.parse(jsonString);

      expect(parsed.stale).toHaveLength(0);
    });

    it('should preserve all report fields in JSON', async () => {
      mockConfig.output.format = 'json';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.json'
      );
      const jsonString = writeCall?.[1] as string;
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty('stale');
      expect(parsed).toHaveProperty('fresh');
      expect(parsed).toHaveProperty('unchecked');
      expect(parsed).toHaveProperty('scannedAt');
      expect(parsed).toHaveProperty('threshold');
    });

    it('should use basename for file references in Markdown summary', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      // Extract only the summary section (before Details)
      const summarySection = markdown.split('### Details')[0];

      // Check that only basename is shown in summary section
      expect(summarySection).toContain('session.ts');
      expect(summarySection).not.toContain('/repo/packages/auth/src/session.ts');
    });

    it('should show full paths in Markdown details section', async () => {
      mockConfig.output.format = 'markdown';

      await generateReport(mockReport, mockConfig);

      const writeCall = vi.mocked(writeFile).mock.calls.find(
        (call) => call[0] === '/tmp/report.md'
      );
      const markdown = writeCall?.[1] as string;

      // Details section should have full paths
      expect(markdown).toContain('/repo/packages/auth/src/session.ts');
    });
  });
});
