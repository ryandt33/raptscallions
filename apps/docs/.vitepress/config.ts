import { defineConfig } from 'vitepress';

export default defineConfig({
  // Site metadata
  title: 'Raptscallions KB',
  description: 'Knowledge base for Raptscallions platform architecture, patterns, and decisions',

  // Source directory
  srcDir: './src',

  // Clean URLs (no .html extension)
  cleanUrls: true,

  // Last updated timestamp from git
  lastUpdated: true,

  // Theme configuration
  themeConfig: {
    // Site navigation (top nav bar)
    nav: [
      { text: 'Home', link: '/' }
    ],

    // Sidebar navigation (placeholder - will be expanded in E06-T002)
    sidebar: [],

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ryandt33/raptscallions' }
    ],

    // Search configuration (local search enabled)
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: 'Search KB',
            buttonAriaLabel: 'Search documentation'
          },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset search',
            noResultsText: 'No results for',
            footer: {
              selectText: 'to select',
              navigateText: 'to navigate',
              closeText: 'to close'
            }
          }
        }
      }
    },

    // Edit link (points to GitHub)
    editLink: {
      pattern: 'https://github.com/ryandt33/raptscallions/edit/main/apps/docs/src/:path',
      text: 'Edit this page on GitHub'
    },

    // Footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Raptscallions'
    }
  }
});
