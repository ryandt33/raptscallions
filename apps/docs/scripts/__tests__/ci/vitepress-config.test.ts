import { describe, it, expect } from 'vitest';
import {
  validateVitePressConfig,
  hasDeadLinkDetection,
  getIgnoredDeadLinkPatterns,
  isValidSiteMetadata,
} from '../../lib/ci/vitepress-config.js';

/**
 * Tests for VitePress configuration validation
 *
 * These tests verify that the VitePress configuration is correctly set up
 * for documentation validation in CI, including dead link detection settings.
 */

describe('vitepress-config', () => {
  describe('validateVitePressConfig', () => {
    it('should validate a correct VitePress config', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Knowledge base documentation',
        cleanUrls: true,
        lastUpdated: true,
        themeConfig: {
          nav: [],
          sidebar: [],
        },
      };

      const result = validateVitePressConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when title is missing', () => {
      const config = {
        description: 'Knowledge base documentation',
        cleanUrls: true,
      };

      const result = validateVitePressConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VitePress config must have a title');
    });

    it('should return error when description is missing', () => {
      const config = {
        title: 'RaptScallions KB',
        cleanUrls: true,
      };

      const result = validateVitePressConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VitePress config must have a description');
    });

    it('should recommend cleanUrls for better UX', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Knowledge base documentation',
        cleanUrls: false,
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).toContain(
        'cleanUrls: true recommended for better URLs'
      );
    });

    it('should recommend lastUpdated for git timestamps', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Knowledge base documentation',
        lastUpdated: false,
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).toContain(
        'lastUpdated: true recommended for git-based timestamps'
      );
    });
  });

  describe('hasDeadLinkDetection', () => {
    it('should return true when ignoreDeadLinks is not set (default enabled)', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
      };

      expect(hasDeadLinkDetection(config)).toBe(true);
    });

    it('should return false when ignoreDeadLinks is true', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: true,
      };

      expect(hasDeadLinkDetection(config)).toBe(false);
    });

    it('should return true when ignoreDeadLinks is false', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: false,
      };

      expect(hasDeadLinkDetection(config)).toBe(true);
    });

    it('should return true when ignoreDeadLinks is an array (specific patterns only)', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: [/^https?:\/\/localhost/],
      };

      expect(hasDeadLinkDetection(config)).toBe(true);
    });

    it('should return false when ignoreDeadLinks is "localhostLinks"', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: 'localhostLinks',
      };

      // localhostLinks still enables dead link detection for non-localhost
      expect(hasDeadLinkDetection(config)).toBe(true);
    });
  });

  describe('getIgnoredDeadLinkPatterns', () => {
    it('should return empty array when no ignoreDeadLinks set', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
      };

      const patterns = getIgnoredDeadLinkPatterns(config);

      expect(patterns).toEqual([]);
    });

    it('should return empty array when ignoreDeadLinks is false', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: false,
      };

      const patterns = getIgnoredDeadLinkPatterns(config);

      expect(patterns).toEqual([]);
    });

    it('should return patterns when ignoreDeadLinks is an array', () => {
      const localhostPattern = /^https?:\/\/localhost/;
      const apiPattern = /^\/api\//;
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: [localhostPattern, apiPattern],
      };

      const patterns = getIgnoredDeadLinkPatterns(config);

      expect(patterns).toHaveLength(2);
      expect(patterns).toContain(localhostPattern);
      expect(patterns).toContain(apiPattern);
    });

    it('should return "all" when ignoreDeadLinks is true', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: true,
      };

      const patterns = getIgnoredDeadLinkPatterns(config);

      expect(patterns).toBe('all');
    });

    it('should return special value when ignoreDeadLinks is "localhostLinks"', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: 'localhostLinks',
      };

      const patterns = getIgnoredDeadLinkPatterns(config);

      expect(patterns).toBe('localhostLinks');
    });
  });

  describe('isValidSiteMetadata', () => {
    it('should return true for valid metadata', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Knowledge base for RaptScallions platform',
        cleanUrls: true,
        lastUpdated: true,
      };

      expect(isValidSiteMetadata(config)).toBe(true);
    });

    it('should return false when title is empty', () => {
      const config = {
        title: '',
        description: 'Knowledge base',
      };

      expect(isValidSiteMetadata(config)).toBe(false);
    });

    it('should return false when description is empty', () => {
      const config = {
        title: 'RaptScallions KB',
        description: '',
      };

      expect(isValidSiteMetadata(config)).toBe(false);
    });

    it('should return false when title is whitespace only', () => {
      const config = {
        title: '   ',
        description: 'Knowledge base',
      };

      expect(isValidSiteMetadata(config)).toBe(false);
    });

    it('should return false for null/undefined title', () => {
      const config = {
        title: null as unknown as string,
        description: 'Knowledge base',
      };

      expect(isValidSiteMetadata(config)).toBe(false);
    });
  });

  describe('dead link detection in CI', () => {
    it('should detect dead links when config enables it (default)', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
      };

      expect(hasDeadLinkDetection(config)).toBe(true);

      // VitePress 1.5+ fails build on dead links by default
      const result = validateVitePressConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should warn when dead link detection is fully disabled', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: true,
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).toContain(
        'ignoreDeadLinks: true disables dead link detection (AC3 requirement)'
      );
    });

    it('should not warn when only specific patterns are ignored', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        ignoreDeadLinks: [/^\/api\//],
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).not.toContain(
        'ignoreDeadLinks: true disables dead link detection (AC3 requirement)'
      );
    });
  });

  describe('theme config validation', () => {
    it('should validate themeConfig has nav and sidebar', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        themeConfig: {
          nav: [{ text: 'Home', link: '/' }],
          sidebar: [],
        },
      };

      const result = validateVitePressConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should warn when themeConfig is missing', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).toContain(
        'themeConfig recommended for navigation and sidebar'
      );
    });

    it('should warn when search is not configured', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        themeConfig: {
          nav: [],
          sidebar: [],
        },
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).toContain(
        'themeConfig.search recommended for searchability'
      );
    });

    it('should not warn when search is configured', () => {
      const config = {
        title: 'RaptScallions KB',
        description: 'Documentation',
        themeConfig: {
          nav: [],
          sidebar: [],
          search: {
            provider: 'local',
          },
        },
      };

      const result = validateVitePressConfig(config);

      expect(result.warnings).not.toContain(
        'themeConfig.search recommended for searchability'
      );
    });
  });
});
