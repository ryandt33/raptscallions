// apps/docs/scripts/lib/ci/vitepress-config.ts

/**
 * VitePress configuration validation helper
 *
 * Validates VitePress configuration for documentation validation in CI,
 * including dead link detection settings.
 */

/** VitePress theme configuration */
interface ThemeConfig {
  nav?: unknown[];
  sidebar?: unknown;
  search?: {
    provider?: string;
  };
}

/** VitePress site configuration */
interface VitePressConfig {
  title?: string;
  description?: string;
  cleanUrls?: boolean;
  lastUpdated?: boolean;
  ignoreDeadLinks?: boolean | 'localhostLinks' | (string | RegExp)[];
  themeConfig?: ThemeConfig;
}

/** Validation result */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a VitePress configuration
 *
 * Checks for required metadata, recommended settings,
 * and dead link detection configuration.
 */
export function validateVitePressConfig(
  config: VitePressConfig
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.title) {
    errors.push('VitePress config must have a title');
  }

  if (!config.description) {
    errors.push('VitePress config must have a description');
  }

  // Check recommended settings
  if (config.cleanUrls === false) {
    warnings.push('cleanUrls: true recommended for better URLs');
  }

  if (config.lastUpdated === false) {
    warnings.push('lastUpdated: true recommended for git-based timestamps');
  }

  // Check dead link detection
  if (config.ignoreDeadLinks === true) {
    warnings.push(
      'ignoreDeadLinks: true disables dead link detection (AC3 requirement)'
    );
  }

  // Check theme config
  if (!config.themeConfig) {
    warnings.push('themeConfig recommended for navigation and sidebar');
  } else if (!config.themeConfig.search) {
    warnings.push('themeConfig.search recommended for searchability');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Checks if dead link detection is enabled
 *
 * VitePress 1.5+ enables dead link detection by default.
 * Returns false only when ignoreDeadLinks is explicitly true.
 */
export function hasDeadLinkDetection(config: VitePressConfig): boolean {
  // Dead link detection is enabled by default
  // Only disabled when explicitly set to true
  if (config.ignoreDeadLinks === true) {
    return false;
  }

  // 'localhostLinks' still enables detection for non-localhost links
  // An array of patterns still enables detection for non-matching links
  // false or undefined means detection is enabled
  return true;
}

/**
 * Gets the ignored dead link patterns from config
 *
 * Returns:
 * - Empty array if no patterns are ignored
 * - Array of patterns if specific patterns are ignored
 * - 'all' if all dead links are ignored
 * - 'localhostLinks' if only localhost links are ignored
 */
export function getIgnoredDeadLinkPatterns(
  config: VitePressConfig
): (string | RegExp)[] | 'all' | 'localhostLinks' {
  if (
    config.ignoreDeadLinks === undefined ||
    config.ignoreDeadLinks === false
  ) {
    return [];
  }

  if (config.ignoreDeadLinks === true) {
    return 'all';
  }

  if (config.ignoreDeadLinks === 'localhostLinks') {
    return 'localhostLinks';
  }

  // Array of patterns
  return config.ignoreDeadLinks;
}

/**
 * Checks if site metadata is valid
 *
 * Title and description must be non-empty strings.
 */
export function isValidSiteMetadata(config: VitePressConfig): boolean {
  // Title must be non-empty string
  if (
    typeof config.title !== 'string' ||
    config.title.trim().length === 0
  ) {
    return false;
  }

  // Description must be non-empty string
  if (
    typeof config.description !== 'string' ||
    config.description.trim().length === 0
  ) {
    return false;
  }

  return true;
}
