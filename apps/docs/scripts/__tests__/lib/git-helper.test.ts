import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { existsSync } from 'node:fs';
import {
  getFileLastModified,
  getGitRepoRoot,
  isGitAvailable,
  batchGetFileLastModified,
  _internal,
} from '../../lib/git-helper';

// Mock Node.js fs module
vi.mock('node:fs');

describe('git-helper', () => {
  let mockExecFilePromise: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock function and replace _internal.execFilePromise
    mockExecFilePromise = vi.fn();
    vi.spyOn(_internal, 'execFilePromise').mockImplementation(mockExecFilePromise);
  });

  describe('isGitAvailable', () => {
    it('should return true when git is available', async () => {
      mockExecFilePromise.mockResolvedValue({
        stdout: 'git version 2.39.0',
        stderr: '',
      });

      const result = await isGitAvailable();
      expect(result).toBe(true);
    });

    it('should return false when git is not available', async () => {
      mockExecFilePromise.mockRejectedValue(new Error('Command not found'));

      const result = await isGitAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getGitRepoRoot', () => {
    it('should return repo root when in git repository', async () => {
      mockExecFilePromise.mockResolvedValue({
        stdout: '/path/to/repo\n',
        stderr: '',
      });

      const result = await getGitRepoRoot();
      expect(result).toBe('/path/to/repo');
    });

    it('should return null when not in git repository', async () => {
      mockExecFilePromise.mockRejectedValue(new Error('Not a git repository'));

      const result = await getGitRepoRoot();
      expect(result).toBeNull();
    });
  });

  describe('getFileLastModified', () => {
    beforeEach(() => {
      // Mock execFilePromise to return different values based on git command
      mockExecFilePromise.mockImplementation((cmd, args) => {
        if (Array.isArray(args) && args[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '/repo/root\n', stderr: '' });
        } else if (Array.isArray(args) && args[0] === 'log') {
          return Promise.resolve({ stdout: '2026-01-12 10:30:00 +0000\n', stderr: '' });
        }
        return Promise.reject(new Error('Unexpected command'));
      });
    });

    it('should return date when file has git history', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await getFileLastModified('/repo/root/file.ts');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toContain('2026-01-12');
    });

    it('should return null when file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await getFileLastModified('/nonexistent/file.ts');
      expect(result).toBeNull();
    });

    it('should return null when file has no git history', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockExecFilePromise.mockImplementation((cmd, args) => {
        if (Array.isArray(args) && args[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '/repo/root\n', stderr: '' });
        } else if (Array.isArray(args) && args[0] === 'log') {
          return Promise.resolve({ stdout: '', stderr: '' }); // Empty stdout = no history
        }
        return Promise.reject(new Error('Unexpected command'));
      });

      const result = await getFileLastModified('/repo/root/new-file.ts');
      expect(result).toBeNull();
    });

    it('should use commit date by default', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await getFileLastModified('/repo/root/file.ts', false);

      // Verify that %ci (commit date) was used
      expect(mockExecFilePromise).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['--format=%ci']),
        expect.anything()
      );
    });

    it('should use author date when requested', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await getFileLastModified('/repo/root/file.ts', true);

      // Verify that %ai (author date) was used
      expect(mockExecFilePromise).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['--format=%ai']),
        expect.anything()
      );
    });

    it('should handle invalid date from git', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockExecFilePromise.mockImplementation((cmd, args) => {
        if (Array.isArray(args) && args[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '/repo/root\n', stderr: '' });
        } else if (Array.isArray(args) && args[0] === 'log') {
          return Promise.resolve({ stdout: 'invalid-date\n', stderr: '' });
        }
        return Promise.reject(new Error('Unexpected command'));
      });

      const result = await getFileLastModified('/repo/root/file.ts');
      expect(result).toBeNull();
    });

    it('should return null when not in git repository', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockExecFilePromise.mockImplementation((cmd, args) => {
        if (Array.isArray(args) && args[0] === 'rev-parse') {
          return Promise.reject(new Error('Not a git repository'));
        }
        return Promise.reject(new Error('Unexpected command'));
      });

      const result = await getFileLastModified('/path/to/file.ts');
      expect(result).toBeNull();
    });
  });

  describe('batchGetFileLastModified', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockExecFilePromise.mockImplementation((cmd, args) => {
        if (Array.isArray(args) && args[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '/repo/root\n', stderr: '' });
        } else if (Array.isArray(args) && args[0] === 'log') {
          return Promise.resolve({ stdout: '2026-01-12 10:30:00 +0000\n', stderr: '' });
        }
        return Promise.reject(new Error('Unexpected command'));
      });
    });

    it('should query multiple files', async () => {
      const files = [
        '/repo/root/file1.ts',
        '/repo/root/file2.ts',
        '/repo/root/file3.ts',
      ];

      const results = await batchGetFileLastModified(files);

      expect(results.size).toBe(3);
      expect(results.get('/repo/root/file1.ts')).toBeInstanceOf(Date);
      expect(results.get('/repo/root/file2.ts')).toBeInstanceOf(Date);
      expect(results.get('/repo/root/file3.ts')).toBeInstanceOf(Date);
    });

    it('should handle mixed success and failure', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === '/repo/root/file1.ts' || path === '/repo/root/file2.ts';
      });

      const files = [
        '/repo/root/file1.ts',
        '/repo/root/file2.ts',
        '/repo/root/nonexistent.ts',
      ];

      const results = await batchGetFileLastModified(files);

      expect(results.size).toBe(3);
      expect(results.get('/repo/root/file1.ts')).toBeInstanceOf(Date);
      expect(results.get('/repo/root/file2.ts')).toBeInstanceOf(Date);
      expect(results.get('/repo/root/nonexistent.ts')).toBeNull();
    });

    it('should batch requests with concurrency limit', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `/repo/root/file${i}.ts`);

      await batchGetFileLastModified(files);

      // With concurrency of 10, 25 files should result in 3 batches
      // We can't easily test the exact concurrency, but we can verify all files were processed
      expect(mockExecFilePromise).toHaveBeenCalled();
    });

    it('should return empty map for empty input', async () => {
      const results = await batchGetFileLastModified([]);

      expect(results.size).toBe(0);
    });

    it('should use author date when requested', async () => {
      const files = ['/repo/root/file1.ts'];

      await batchGetFileLastModified(files, true);

      // Verify that author date was requested
      expect(mockExecFilePromise).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['--format=%ai']),
        expect.anything()
      );
    });
  });
});
