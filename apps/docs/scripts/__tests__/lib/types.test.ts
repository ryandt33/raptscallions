import { describe, it, expect } from 'vitest';
import type {
  DocMetadata,
  StalenessConfig,
  RelatedCodeChange,
  StaleDoc,
  StalenessReport,
} from '../../lib/types';

/**
 * Type definition tests
 *
 * These tests verify that our types are correctly defined and can be instantiated
 * with valid values. Since TypeScript types are compile-time only, these tests
 * mainly verify type compatibility and serve as documentation.
 */

describe('types', () => {
  describe('DocMetadata', () => {
    it('should accept valid doc metadata', () => {
      const metadata: DocMetadata = {
        filePath: '/path/to/doc.md',
        title: 'Test Document',
        description: 'Test description',
        relatedCode: ['packages/auth/src/session.ts'],
        lastVerified: '2026-01-12',
      };

      expect(metadata.filePath).toBe('/path/to/doc.md');
      expect(metadata.title).toBe('Test Document');
      expect(metadata.relatedCode).toEqual(['packages/auth/src/session.ts']);
      expect(metadata.lastVerified).toBe('2026-01-12');
    });

    it('should accept doc metadata without optional fields', () => {
      const metadata: DocMetadata = {
        filePath: '/path/to/doc.md',
        title: 'Test Document',
        description: 'Test description',
      };

      expect(metadata.filePath).toBe('/path/to/doc.md');
      expect(metadata.relatedCode).toBeUndefined();
      expect(metadata.lastVerified).toBeUndefined();
    });
  });

  describe('StalenessConfig', () => {
    it('should accept valid config', () => {
      const config: StalenessConfig = {
        threshold: 7,
        ignore: ['**/references/**'],
        docs_root: '/path/to/docs',
        output: {
          format: 'both',
          json_file: '/path/to/report.json',
          markdown_file: '/path/to/report.md',
        },
        git: {
          use_author_date: false,
          include_uncommitted: false,
        },
      };

      expect(config.threshold).toBe(7);
      expect(config.output.format).toBe('both');
      expect(config.git.use_author_date).toBe(false);
    });

    it('should accept all output formats', () => {
      const formats: Array<StalenessConfig['output']['format']> = [
        'json',
        'markdown',
        'both',
      ];

      formats.forEach((format) => {
        const config: StalenessConfig = {
          threshold: 7,
          ignore: [],
          docs_root: '/path/to/docs',
          output: {
            format,
            json_file: '/path/to/report.json',
            markdown_file: '/path/to/report.md',
          },
          git: {
            use_author_date: false,
            include_uncommitted: false,
          },
        };

        expect(config.output.format).toBe(format);
      });
    });
  });

  describe('RelatedCodeChange', () => {
    it('should accept valid code change', () => {
      const change: RelatedCodeChange = {
        file: '/path/to/code.ts',
        lastModified: '2026-01-12',
        daysSinceVerified: 5,
      };

      expect(change.file).toBe('/path/to/code.ts');
      expect(change.lastModified).toBe('2026-01-12');
      expect(change.daysSinceVerified).toBe(5);
    });
  });

  describe('StaleDoc', () => {
    it('should accept valid stale doc', () => {
      const staleDoc: StaleDoc = {
        doc: '/path/to/doc.md',
        title: 'Test Document',
        lastVerified: '2026-01-10',
        relatedChanges: [
          {
            file: '/path/to/code.ts',
            lastModified: '2026-01-12',
            daysSinceVerified: 2,
          },
        ],
      };

      expect(staleDoc.doc).toBe('/path/to/doc.md');
      expect(staleDoc.relatedChanges).toHaveLength(1);
    });

    it('should accept multiple related changes', () => {
      const staleDoc: StaleDoc = {
        doc: '/path/to/doc.md',
        title: 'Test Document',
        lastVerified: '2026-01-10',
        relatedChanges: [
          {
            file: '/path/to/code1.ts',
            lastModified: '2026-01-12',
            daysSinceVerified: 2,
          },
          {
            file: '/path/to/code2.ts',
            lastModified: '2026-01-13',
            daysSinceVerified: 3,
          },
        ],
      };

      expect(staleDoc.relatedChanges).toHaveLength(2);
    });
  });

  describe('StalenessReport', () => {
    it('should accept valid report', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: '/path/to/doc.md',
            title: 'Test Document',
            lastVerified: '2026-01-10',
            relatedChanges: [
              {
                file: '/path/to/code.ts',
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

      expect(report.stale).toHaveLength(1);
      expect(report.fresh).toBe(42);
      expect(report.unchecked).toBe(5);
      expect(report.threshold).toBe(7);
    });

    it('should accept report with no stale docs', () => {
      const report: StalenessReport = {
        stale: [],
        fresh: 100,
        unchecked: 0,
        scannedAt: '2026-01-13T10:30:00.000Z',
        threshold: 7,
      };

      expect(report.stale).toHaveLength(0);
      expect(report.fresh).toBe(100);
    });
  });
});
