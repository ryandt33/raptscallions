import { defineConfig } from "vitepress";

export default defineConfig({
  // Site metadata
  title: "RaptScallions KB",
  description:
    "Knowledge base for RaptScallions platform architecture, patterns, and decisions",

  // Clean URLs (no .html extension)
  cleanUrls: true,

  // Last updated timestamp from git
  lastUpdated: true,

  // Head configuration for font preconnect
  head: [
    // Preconnect to Google Fonts CDN for faster font loading
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
  ],

  // Theme configuration
  themeConfig: {
    // Site navigation (top nav bar)
    nav: [{ text: "Home", link: "/" }],

    // Sidebar navigation
    sidebar: [
      {
        text: "Authentication & Authorization",
        collapsed: false,
        items: [
          { text: "Overview", link: "/auth/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/auth/concepts/" }],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/auth/patterns/" }],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/auth/decisions/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/auth/troubleshooting/" }],
          },
        ],
      },
      {
        text: "Database & ORM",
        collapsed: false,
        items: [
          { text: "Overview", link: "/database/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/database/concepts/" }],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/database/patterns/" }],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/database/decisions/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [
              { text: "Coming Soon", link: "/database/troubleshooting/" },
            ],
          },
        ],
      },
      {
        text: "API Design & Patterns",
        collapsed: false,
        items: [
          { text: "Overview", link: "/api/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/api/concepts/" }],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/api/patterns/" }],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/api/decisions/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/api/troubleshooting/" }],
          },
        ],
      },
      {
        text: "AI Gateway Integration",
        collapsed: false,
        items: [
          { text: "Overview", link: "/ai/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/ai/concepts/" }],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/ai/patterns/" }],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/ai/decisions/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/ai/troubleshooting/" }],
          },
        ],
      },
      {
        text: "Testing",
        collapsed: false,
        items: [
          { text: "Overview", link: "/testing/" },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/testing/patterns/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/testing/troubleshooting/" }],
          },
        ],
      },
      {
        text: "Contributing",
        items: [
          { text: "Overview", link: "/contributing/" },
          { text: "KB Page Design", link: "/contributing/kb-page-design" },
          { text: "Design System", link: "/contributing/design-system" },
        ],
      },
    ],

    // Social links
    socialLinks: [
      { icon: "github", link: "https://github.com/ryandt33/raptscallions" },
    ],

    // Search configuration (local search enabled)
    search: {
      provider: "local",
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: "Search KB",
            buttonAriaLabel: "Search documentation",
          },
          modal: {
            displayDetails: "Display detailed list",
            resetButtonTitle: "Reset search",
            noResultsText: "No results for",
            footer: {
              selectText: "to select",
              navigateText: "to navigate",
              closeText: "to close",
            },
          },
        },
      },
    },

    // Edit link (points to GitHub)
    editLink: {
      pattern:
        "https://github.com/ryandt33/raptscallions/edit/main/apps/docs/src/:path",
      text: "Edit this page on GitHub",
    },

    // Footer
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 RaptScallions",
    },
  },
});
