import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkStaleness } from '../../lib/staleness-checker';
import { expandRelatedCodePaths } from '../../lib/frontmatter-parser';
import { batchGetFileLastModified, getGitRepoRoot } from '../../lib/git-helper';
import type { DocMetadata, StalenessConfig } from '../../lib/types';

// Mock dependencies
vi.mock('../../lib/frontmatter-parser');
vi.mock('../../lib/git-helper');

describe('staleness-checker', () => {
  let mockConfig: StalenessConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default config for tests
    mockConfig = {
      threshold: 7,
      ignore: [],
      docs_root: '/repo/apps/docs/src',
      output: {
        format: 'both',
        json_file: '/repo/report.json',
        markdown_file: '/repo/report.md',
      },
      git: {
        use_author_date: false,
        include_uncommitted: false,
      },
    };

    // Mock git repo root
    vi.mocked(getGitRepoRoot).mockResolvedValue('/repo');
  });

  describe('checkStaleness', () => {
    it('should detect stale documentation', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // Code modified 10 days after doc verification (exceeds 7-day threshold)
      const codeModDate = new Date('2026-01-11T10:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', codeModDate]])
      );

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(1);
      expect(report.stale[0]?.doc).toBe('/repo/apps/docs/src/test.md');
      expect(report.stale[0]?.title).toBe('Test Document');
      expect(report.stale[0]?.relatedChanges).toHaveLength(1);
      expect(report.stale[0]?.relatedChanges[0]?.file).toBe(
        '/repo/packages/auth/src/session.ts'
      );
      expect(report.fresh).toBe(0);
      expect(report.unchecked).toBe(0);
    });

    it('should detect fresh documentation', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-10',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // Code modified only 2 days after doc verification (within 7-day threshold)
      const codeModDate = new Date('2026-01-12T10:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', codeModDate]])
      );

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(1);
      expect(report.unchecked).toBe(0);
    });

    it('should mark docs without related_code as unchecked', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          // No relatedCode field
          lastVerified: '2026-01-10',
        },
      ];

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(0);
      expect(report.unchecked).toBe(1);
    });

    it('should mark docs without last_verified as unchecked', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          // No lastVerified field
        },
      ];

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(0);
      expect(report.unchecked).toBe(1);
    });

    it('should mark docs with empty related_code as unchecked', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: [],
          lastVerified: '2026-01-10',
        },
      ];

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(0);
      expect(report.unchecked).toBe(1);
    });

    it('should handle multiple related code files', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: [
            'packages/auth/src/session.ts',
            'packages/auth/src/lucia.ts',
          ],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
        '/repo/packages/auth/src/lucia.ts',
      ]);

      // Both files modified after doc verification
      const sessionModDate = new Date('2026-01-10T10:00:00Z');
      const luciaModDate = new Date('2026-01-12T10:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([
          ['/repo/packages/auth/src/session.ts', sessionModDate],
          ['/repo/packages/auth/src/lucia.ts', luciaModDate],
        ])
      );

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(1);
      expect(report.stale[0]?.relatedChanges).toHaveLength(2);
    });

    it('should handle code files with no git history', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // File has no git history (returns null)
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', null]])
      );

      const report = await checkStaleness(docs, mockConfig);

      // Doc should be considered fresh (no verifiable changes)
      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(1);
      expect(report.unchecked).toBe(0);
    });

    it('should use custom threshold from config', async () => {
      mockConfig.threshold = 14; // 14-day threshold

      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // Code modified 10 days after doc verification (within 14-day threshold)
      const codeModDate = new Date('2026-01-11T10:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', codeModDate]])
      );

      const report = await checkStaleness(docs, mockConfig);

      // Should be fresh with 14-day threshold
      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(1);
      expect(report.threshold).toBe(14);
    });

    it('should calculate daysSinceVerified correctly', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // Code modified exactly 10 days after verification
      const codeModDate = new Date('2026-01-11T00:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', codeModDate]])
      );

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(1);
      expect(report.stale[0]?.relatedChanges[0]?.daysSinceVerified).toBe(10);
    });

    it('should include scannedAt timestamp', async () => {
      const docs: DocMetadata[] = [];

      const report = await checkStaleness(docs, mockConfig);

      expect(report.scannedAt).toBeDefined();
      expect(new Date(report.scannedAt).getTime()).toBeGreaterThan(0);
    });

    it('should throw error when not in git repository', async () => {
      vi.mocked(getGitRepoRoot).mockResolvedValue(null);

      const docs: DocMetadata[] = [];

      await expect(checkStaleness(docs, mockConfig)).rejects.toThrow(
        'Not a git repository'
      );
    });

    it('should mark doc as unchecked when glob pattern matches no files', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/nonexistent/**/*.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      // Pattern matches no files
      vi.mocked(expandRelatedCodePaths).mockResolvedValue([]);

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(0);
      expect(report.unchecked).toBe(1);
    });

    it('should handle mixed stale, fresh, and unchecked docs', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/stale.md',
          title: 'Stale Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
        {
          filePath: '/repo/apps/docs/src/fresh.md',
          title: 'Fresh Document',
          description: 'Test',
          relatedCode: ['packages/db/src/schema.ts'],
          lastVerified: '2026-01-15',
        },
        {
          filePath: '/repo/apps/docs/src/unchecked.md',
          title: 'Unchecked Document',
          description: 'Test',
          // No relatedCode
        },
      ];

      vi.mocked(expandRelatedCodePaths)
        .mockResolvedValueOnce(['/repo/packages/auth/src/session.ts'])
        .mockResolvedValueOnce(['/repo/packages/db/src/schema.ts']);

      vi.mocked(batchGetFileLastModified)
        .mockResolvedValueOnce(
          new Map([
            ['/repo/packages/auth/src/session.ts', new Date('2026-01-10T10:00:00Z')],
          ])
        )
        .mockResolvedValueOnce(
          new Map([
            ['/repo/packages/db/src/schema.ts', new Date('2026-01-16T10:00:00Z')],
          ])
        );

      const report = await checkStaleness(docs, mockConfig);

      expect(report.stale).toHaveLength(1);
      expect(report.fresh).toBe(1);
      expect(report.unchecked).toBe(1);
    });

    it('should use author date when configured', async () => {
      mockConfig.git.use_author_date = true;

      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-01',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      vi.mocked(batchGetFileLastModified).mockResolvedValue(new Map());

      await checkStaleness(docs, mockConfig);

      // Verify use_author_date was passed to batchGetFileLastModified
      expect(batchGetFileLastModified).toHaveBeenCalledWith(
        expect.any(Array),
        true
      );
    });

    it('should handle docs with code modified before verification date', async () => {
      const docs: DocMetadata[] = [
        {
          filePath: '/repo/apps/docs/src/test.md',
          title: 'Test Document',
          description: 'Test',
          relatedCode: ['packages/auth/src/session.ts'],
          lastVerified: '2026-01-10',
        },
      ];

      vi.mocked(expandRelatedCodePaths).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      // Code modified BEFORE doc verification (doc is up to date)
      const codeModDate = new Date('2026-01-05T10:00:00Z');
      vi.mocked(batchGetFileLastModified).mockResolvedValue(
        new Map([['/repo/packages/auth/src/session.ts', codeModDate]])
      );

      const report = await checkStaleness(docs, mockConfig);

      // Should be fresh (code hasn't changed since verification)
      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(1);
    });
  });
});
