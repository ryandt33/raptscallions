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
            items: [
              { text: "Overview", link: "/auth/concepts/" },
              { text: "Session Lifecycle", link: "/auth/concepts/sessions" },
              { text: "Lucia Configuration", link: "/auth/concepts/lucia" },
              { text: "OAuth Providers", link: "/auth/concepts/oauth" },
              { text: "CASL Permissions", link: "/auth/concepts/casl" },
            ],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [
              { text: "Overview", link: "/auth/patterns/" },
              { text: "Authentication Guards", link: "/auth/patterns/guards" },
              { text: "Rate Limiting", link: "/auth/patterns/rate-limiting" },
            ],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/auth/decisions/" }],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [
              { text: "Overview", link: "/auth/troubleshooting/" },
              { text: "Session Issues", link: "/auth/troubleshooting/session-issues" },
            ],
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
            items: [
              { text: "Overview", link: "/api/concepts/" },
              { text: "Fastify Setup", link: "/api/concepts/fastify-setup" },
              {
                text: "Plugin Architecture",
                link: "/api/concepts/plugin-architecture",
              },
              {
                text: "Request Lifecycle",
                link: "/api/concepts/request-lifecycle",
              },
            ],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [
              { text: "Overview", link: "/api/patterns/" },
              { text: "Route Handlers", link: "/api/patterns/route-handlers" },
              { text: "Error Handling", link: "/api/patterns/error-handling" },
              { text: "Validation", link: "/api/patterns/validation" },
              { text: "Middleware", link: "/api/patterns/middleware" },
            ],
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
            text: "Concepts",
            collapsed: true,
            items: [
              {
                text: "Vitest Monorepo Setup",
                link: "/testing/concepts/vitest-setup",
              },
              { text: "Test Structure", link: "/testing/concepts/test-structure" },
            ],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [
              { text: "Overview", link: "/testing/patterns/" },
              { text: "Mocking", link: "/testing/patterns/mocking" },
              { text: "Test Factories", link: "/testing/patterns/factories" },
              {
                text: "Fastify Testing",
                link: "/testing/patterns/fastify-testing",
              },
              {
                text: "Fastify Plugin Encapsulation",
                link: "/testing/patterns/fastify-plugin-encapsulation",
              },
              {
                text: "Integration Tests",
                link: "/testing/patterns/integration-tests",
              },
            ],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [
              { text: "Common Issues", link: "/testing/troubleshooting/common-issues" },
            ],
          },
        ],
      },
      {
        text: "Contributing",
        items: [
          { text: "Overview", link: "/contributing/" },
          { text: "Documentation Guide", link: "/contributing/documentation" },
          { text: "KB Page Design", link: "/contributing/kb-page-design" },
          { text: "Design System", link: "/contributing/design-system" },
          { text: "CI Validation", link: "/contributing/ci-validation" },
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
