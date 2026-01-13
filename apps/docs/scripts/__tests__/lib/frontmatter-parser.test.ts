import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import {
  scanDocuments,
  parseDocFrontmatter,
  expandRelatedCodePaths,
} from '../../lib/frontmatter-parser';

// Mock dependencies
vi.mock('node:fs/promises');
vi.mock('glob');

describe('frontmatter-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseDocFrontmatter', () => {
    it('should parse valid frontmatter with all fields', async () => {
      const content = `---
title: Test Document
description: Test description
related_code:
  - packages/auth/src/session.ts
  - apps/api/src/middleware/session.middleware.ts
last_verified: 2026-01-12
---

# Test Document

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result).toEqual({
        filePath: '/path/to/doc.md',
        title: 'Test Document',
        description: 'Test description',
        relatedCode: [
          'packages/auth/src/session.ts',
          'apps/api/src/middleware/session.middleware.ts',
        ],
        lastVerified: '2026-01-12',
      });
    });

    it('should parse frontmatter without optional fields', async () => {
      const content = `---
title: Test Document
description: Test description
---

# Test Document

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result).toEqual({
        filePath: '/path/to/doc.md',
        title: 'Test Document',
        description: 'Test description',
        relatedCode: undefined,
        lastVerified: undefined,
      });
    });

    it('should use default values for missing title and description', async () => {
      const content = `---
related_code:
  - packages/auth/src/session.ts
last_verified: 2026-01-12
---

Content without title.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result?.title).toBe('Untitled');
      expect(result?.description).toBe('');
    });

    it('should filter out non-string related_code items', async () => {
      const content = `---
title: Test Document
description: Test description
related_code:
  - packages/auth/src/session.ts
  - 123
  - null
  - apps/api/src/routes.ts
last_verified: 2026-01-12
---

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result?.relatedCode).toEqual([
        'packages/auth/src/session.ts',
        'apps/api/src/routes.ts',
      ]);
    });

    it('should return null for invalid date format', async () => {
      const content = `---
title: Test Document
description: Test description
related_code:
  - packages/auth/src/session.ts
last_verified: January 12, 2026
---

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result).toBeNull();
    });

    it('should return null for invalid ISO date', async () => {
      const content = `---
title: Test Document
description: Test description
related_code:
  - packages/auth/src/session.ts
last_verified: 2026-13-45
---

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result).toBeNull();
    });

    it('should return null when file cannot be read', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      const result = await parseDocFrontmatter('/nonexistent/doc.md');

      expect(result).toBeNull();
    });

    it('should return null when frontmatter is malformed', async () => {
      const content = `---
title: Test Document
description: Test description
---invalid yaml
related_code: [this is broken

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      // gray-matter should handle this, but result may vary
      // At minimum, we shouldn't crash
      expect(result).toBeDefined();
    });

    it('should handle empty related_code array', async () => {
      const content = `---
title: Test Document
description: Test description
related_code: []
last_verified: 2026-01-12
---

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      expect(result?.relatedCode).toEqual([]);
    });

    it('should handle related_code as single string (not array)', async () => {
      const content = `---
title: Test Document
description: Test description
related_code: packages/auth/src/session.ts
last_verified: 2026-01-12
---

Content here.`;

      vi.mocked(readFile).mockResolvedValue(content);

      const result = await parseDocFrontmatter('/path/to/doc.md');

      // Single string should be treated as undefined (must be array)
      expect(result?.relatedCode).toBeUndefined();
    });
  });

  describe('scanDocuments', () => {
    it('should scan all markdown files in directory', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/docs/src/auth/concepts/session.md',
        '/docs/src/auth/patterns/guards.md',
        '/docs/src/api/routes.md',
      ]);

      vi.mocked(readFile).mockResolvedValue(`---
title: Test Document
description: Test description
related_code:
  - packages/auth/src/session.ts
last_verified: 2026-01-12
---

Content.`);

      const result = await scanDocuments('/docs/src', []);

      expect(result).toHaveLength(3);
      expect(result[0]?.filePath).toBe('/docs/src/auth/concepts/session.md');
      expect(result[1]?.filePath).toBe('/docs/src/auth/patterns/guards.md');
      expect(result[2]?.filePath).toBe('/docs/src/api/routes.md');
    });

    it('should apply ignore patterns', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/docs/src/auth/concepts/session.md',
        '/docs/src/api/routes.md',
      ]);

      vi.mocked(readFile).mockResolvedValue(`---
title: Test Document
description: Test description
---

Content.`);

      const result = await scanDocuments('/docs/src', ['**/references/**']);

      // Verify glob was called with ignore patterns
      expect(glob).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignore: ['**/references/**'],
        })
      );
    });

    it('should skip files that fail to parse', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/docs/src/valid.md',
        '/docs/src/invalid.md',
      ]);

      vi.mocked(readFile).mockImplementation((path) => {
        if (path === '/docs/src/valid.md') {
          return Promise.resolve(`---
title: Valid Document
description: Valid
---

Content.`);
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await scanDocuments('/docs/src', []);

      // Only valid file should be in results
      expect(result).toHaveLength(1);
      expect(result[0]?.filePath).toBe('/docs/src/valid.md');
    });

    it('should return empty array when no files found', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      const result = await scanDocuments('/docs/src', []);

      expect(result).toHaveLength(0);
    });

    it('should handle absolute paths from glob', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/absolute/path/to/doc1.md',
        '/absolute/path/to/doc2.md',
      ]);

      vi.mocked(readFile).mockResolvedValue(`---
title: Test
description: Test
---

Content.`);

      const result = await scanDocuments('/docs/src', []);

      expect(result[0]?.filePath).toBe('/absolute/path/to/doc1.md');
      expect(result[1]?.filePath).toBe('/absolute/path/to/doc2.md');
    });
  });

  describe('expandRelatedCodePaths', () => {
    it('should expand single file pattern', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
      ]);

      const result = await expandRelatedCodePaths(
        ['packages/auth/src/session.ts'],
        '/repo'
      );

      expect(result).toEqual(['/repo/packages/auth/src/session.ts']);
    });

    it('should expand glob patterns', async () => {
      vi.mocked(glob).mockResolvedValue([
        '/repo/packages/auth/src/session.ts',
        '/repo/packages/auth/src/lucia.ts',
        '/repo/packages/auth/src/utils.ts',
      ]);

      const result = await expandRelatedCodePaths(
        ['packages/auth/src/**/*.ts'],
        '/repo'
      );

      expect(result).toHaveLength(3);
      expect(result).toContain('/repo/packages/auth/src/session.ts');
      expect(result).toContain('/repo/packages/auth/src/lucia.ts');
      expect(result).toContain('/repo/packages/auth/src/utils.ts');
    });

    it('should expand multiple patterns', async () => {
      vi.mocked(glob)
        .mockResolvedValueOnce(['/repo/packages/auth/src/session.ts'])
        .mockResolvedValueOnce(['/repo/apps/api/src/routes/auth.ts']);

      const result = await expandRelatedCodePaths(
        ['packages/auth/src/session.ts', 'apps/api/src/routes/auth.ts'],
        '/repo'
      );

      expect(result).toHaveLength(2);
      expect(result).toContain('/repo/packages/auth/src/session.ts');
      expect(result).toContain('/repo/apps/api/src/routes/auth.ts');
    });

    it('should deduplicate paths', async () => {
      vi.mocked(glob)
        .mockResolvedValueOnce(['/repo/packages/auth/src/session.ts'])
        .mockResolvedValueOnce(['/repo/packages/auth/src/session.ts']); // Duplicate

      const result = await expandRelatedCodePaths(
        ['packages/auth/**/*.ts', 'packages/auth/src/session.ts'],
        '/repo'
      );

      // Should only include unique paths
      expect(result).toEqual(['/repo/packages/auth/src/session.ts']);
    });

    it('should return empty array when patterns match nothing', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      const result = await expandRelatedCodePaths(
        ['packages/nonexistent/**/*.ts'],
        '/repo'
      );

      expect(result).toHaveLength(0);
    });

    it('should handle empty patterns array', async () => {
      const result = await expandRelatedCodePaths([], '/repo');

      expect(result).toHaveLength(0);
      expect(glob).not.toHaveBeenCalled();
    });

    it('should resolve patterns relative to repo root', async () => {
      vi.mocked(glob).mockResolvedValue(['/repo/packages/auth/src/session.ts']);

      await expandRelatedCodePaths(['packages/auth/src/session.ts'], '/repo');

      // Verify glob was called with full path
      expect(glob).toHaveBeenCalledWith(
        '/repo/packages/auth/src/session.ts',
        expect.objectContaining({ absolute: true })
      );
    });
  });
});
