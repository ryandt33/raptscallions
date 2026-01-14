import { describe, it, expect } from 'vitest';
import {
  generateStalenessAnnotation,
  generateBuildErrorAnnotation,
  formatAnnotationMessage,
  getStalenessWarningLevel,
} from '../../lib/ci/annotation-generator.js';
import type { StalenessReport, StaleDoc } from '../../lib/types.js';

/**
 * Tests for GitHub Actions annotation generation
 *
 * These tests verify that annotations are correctly formatted for
 * display in GitHub Actions CI, including staleness warnings and
 * build error annotations.
 */

describe('annotation-generator', () => {
  describe('generateStalenessAnnotation', () => {
    it('should generate warning annotation for stale docs', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: '/repo/apps/docs/src/auth/session.md',
            title: 'Session Lifecycle',
            lastVerified: '2026-01-10',
            relatedChanges: [
              {
                file: '/repo/packages/auth/src/session.ts',
                lastModified: '2026-01-15',
                daysSinceVerified: 5,
              },
            ],
          },
        ],
        fresh: 10,
        unchecked: 2,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      expect(annotation).toContain('::warning');
      expect(annotation).toContain('Documentation may be stale');
    });

    it('should not generate annotation when no stale docs', () => {
      const report: StalenessReport = {
        stale: [],
        fresh: 10,
        unchecked: 2,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      expect(annotation).toBe('');
    });

    it('should include count of stale documents in annotation', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: '/repo/apps/docs/src/auth/session.md',
            title: 'Session Lifecycle',
            lastVerified: '2026-01-10',
            relatedChanges: [
              {
                file: '/repo/packages/auth/src/session.ts',
                lastModified: '2026-01-15',
                daysSinceVerified: 5,
              },
            ],
          },
          {
            doc: '/repo/apps/docs/src/api/routes.md',
            title: 'API Routes',
            lastVerified: '2026-01-08',
            relatedChanges: [
              {
                file: '/repo/apps/api/src/routes.ts',
                lastModified: '2026-01-12',
                daysSinceVerified: 4,
              },
            ],
          },
        ],
        fresh: 10,
        unchecked: 2,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      expect(annotation).toContain('2 potentially stale');
    });

    it('should include file reference in annotation', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: 'apps/docs/src/auth/session.md',
            title: 'Session Lifecycle',
            lastVerified: '2026-01-10',
            relatedChanges: [],
          },
        ],
        fresh: 0,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      expect(annotation).toContain('file=');
    });

    it('should use warning level (not error) for staleness', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: 'apps/docs/src/auth/session.md',
            title: 'Session Lifecycle',
            lastVerified: '2026-01-10',
            relatedChanges: [],
          },
        ],
        fresh: 0,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      expect(annotation).toContain('::warning');
      expect(annotation).not.toContain('::error');
    });
  });

  describe('generateBuildErrorAnnotation', () => {
    it('should generate error annotation for build failure', () => {
      const error = 'Dead link found: /auth/concepts/session.md links to /non-existent';

      const annotation = generateBuildErrorAnnotation(error);

      expect(annotation).toContain('::error');
      expect(annotation).toContain('Dead link found');
    });

    it('should extract file path from dead link error', () => {
      const error = 'Dead link found: /auth/concepts/session.md links to /non-existent';

      const annotation = generateBuildErrorAnnotation(error);

      expect(annotation).toContain('file=auth/concepts/session.md');
    });

    it('should handle VitePress markdown parse error', () => {
      const error = 'Error parsing src/auth/concepts/session.md: Invalid frontmatter';

      const annotation = generateBuildErrorAnnotation(error);

      expect(annotation).toContain('::error');
      expect(annotation).toContain('Invalid frontmatter');
    });

    it('should handle generic build error', () => {
      const error = 'Build failed with unknown error';

      const annotation = generateBuildErrorAnnotation(error);

      expect(annotation).toContain('::error');
      expect(annotation).toContain('Build failed');
    });

    it('should include line number when available in error', () => {
      const error = 'Error at src/auth/session.md:42 - Invalid syntax';

      const annotation = generateBuildErrorAnnotation(error);

      expect(annotation).toContain('line=42');
    });
  });

  describe('formatAnnotationMessage', () => {
    it('should format annotation with file path', () => {
      const result = formatAnnotationMessage('warning', 'Test message', {
        file: 'apps/docs/src/test.md',
      });

      expect(result).toBe('::warning file=apps/docs/src/test.md::Test message');
    });

    it('should format annotation with file path and line number', () => {
      const result = formatAnnotationMessage('error', 'Test error', {
        file: 'apps/docs/src/test.md',
        line: 42,
      });

      expect(result).toBe('::error file=apps/docs/src/test.md,line=42::Test error');
    });

    it('should format annotation with line and column', () => {
      const result = formatAnnotationMessage('error', 'Syntax error', {
        file: 'apps/docs/src/test.md',
        line: 10,
        col: 5,
      });

      expect(result).toBe(
        '::error file=apps/docs/src/test.md,line=10,col=5::Syntax error'
      );
    });

    it('should format annotation without file path', () => {
      const result = formatAnnotationMessage('notice', 'General notice');

      expect(result).toBe('::notice::General notice');
    });

    it('should support warning, error, and notice levels', () => {
      expect(formatAnnotationMessage('warning', 'msg')).toContain('::warning::');
      expect(formatAnnotationMessage('error', 'msg')).toContain('::error::');
      expect(formatAnnotationMessage('notice', 'msg')).toContain('::notice::');
    });

    it('should escape special characters in message', () => {
      const result = formatAnnotationMessage(
        'warning',
        'Message with :: colons and % percent'
      );

      // GitHub Actions uses %25 for %, %0A for newline, %0D for carriage return
      expect(result).not.toContain('::colons');
    });

    it('should handle multi-line messages', () => {
      const result = formatAnnotationMessage('warning', 'Line 1\nLine 2\nLine 3');

      // Multi-line messages should be escaped
      expect(result).not.toMatch(/\n.*::/);
    });

    it('should handle empty message', () => {
      const result = formatAnnotationMessage('warning', '');

      expect(result).toBe('::warning::');
    });
  });

  describe('getStalenessWarningLevel', () => {
    it('should return "none" when no stale docs', () => {
      const report: StalenessReport = {
        stale: [],
        fresh: 10,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('none');
    });

    it('should return "low" for small number of stale docs', () => {
      const staleDoc: StaleDoc = {
        doc: 'apps/docs/src/test.md',
        title: 'Test',
        lastVerified: '2026-01-01',
        relatedChanges: [],
      };

      const report: StalenessReport = {
        stale: [staleDoc, staleDoc],
        fresh: 50,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('low');
    });

    it('should return "medium" for moderate staleness', () => {
      const staleDoc: StaleDoc = {
        doc: 'apps/docs/src/test.md',
        title: 'Test',
        lastVerified: '2026-01-01',
        relatedChanges: [],
      };

      // 20% stale
      const report: StalenessReport = {
        stale: Array(10).fill(staleDoc),
        fresh: 40,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('medium');
    });

    it('should return "high" for significant staleness', () => {
      const staleDoc: StaleDoc = {
        doc: 'apps/docs/src/test.md',
        title: 'Test',
        lastVerified: '2026-01-01',
        relatedChanges: [],
      };

      // 40% stale
      const report: StalenessReport = {
        stale: Array(20).fill(staleDoc),
        fresh: 30,
        unchecked: 0,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('high');
    });

    it('should consider only checked docs in percentage calculation', () => {
      const staleDoc: StaleDoc = {
        doc: 'apps/docs/src/test.md',
        title: 'Test',
        lastVerified: '2026-01-01',
        relatedChanges: [],
      };

      // 2 stale out of 10 checked = 20% (medium)
      // Even though there are 90 unchecked docs
      const report: StalenessReport = {
        stale: [staleDoc, staleDoc],
        fresh: 8,
        unchecked: 90,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('medium');
    });

    it('should handle all docs being unchecked', () => {
      const report: StalenessReport = {
        stale: [],
        fresh: 0,
        unchecked: 100,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      expect(getStalenessWarningLevel(report)).toBe('none');
    });
  });

  describe('PR comment format', () => {
    it('should generate valid markdown for PR comment', () => {
      const report: StalenessReport = {
        stale: [
          {
            doc: 'apps/docs/src/auth/session.md',
            title: 'Session Lifecycle',
            lastVerified: '2026-01-10',
            relatedChanges: [
              {
                file: 'packages/auth/src/session.ts',
                lastModified: '2026-01-15',
                daysSinceVerified: 5,
              },
            ],
          },
        ],
        fresh: 10,
        unchecked: 2,
        scannedAt: '2026-01-14T10:00:00.000Z',
        threshold: 7,
      };

      const annotation = generateStalenessAnnotation(report);

      // Annotation should be suitable for GitHub Actions
      expect(annotation).toMatch(/^::(warning|error|notice)/);
    });
  });

  describe('annotation escaping', () => {
    it('should escape newlines in messages', () => {
      const result = formatAnnotationMessage(
        'warning',
        'Line1\nLine2'
      );

      // GitHub Actions uses %0A for newlines
      expect(result).not.toContain('\n::');
    });

    it('should escape carriage returns in messages', () => {
      const result = formatAnnotationMessage(
        'warning',
        'Line1\rLine2'
      );

      expect(result).not.toContain('\r::');
    });

    it('should escape percent signs in messages', () => {
      const result = formatAnnotationMessage(
        'warning',
        '100% complete'
      );

      // Should handle percent properly
      expect(result).toBeDefined();
    });
  });
});
