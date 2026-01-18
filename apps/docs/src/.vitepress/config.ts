import { defineConfig } from "vitepress";

export default defineConfig({
  // Site metadata
  title: "RaptScallions KB",
  description:
    "Knowledge base for Raptscallions platform architecture, patterns, and decisions",

  // Clean URLs (no .html extension)
  cleanUrls: true,

  // Last updated timestamp from git
  lastUpdated: true,

  // Exclude backlog directory from VitePress processing
  // Backlog files are served as raw markdown, not processed as VitePress pages
  srcExclude: ["backlog/**"],

  // Ignore dead links for template examples and backlog references
  // Backlog files are copied at build time and may not be available during link checking
  ignoreDeadLinks: [
    /^\/domain\//,
    /^\/backlog\//,
  ],

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
            items: [
              { text: "Overview", link: "/database/concepts/" },
              { text: "File Storage Schema", link: "/database/concepts/file-storage-schema" },
            ],
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
        text: "Storage",
        collapsed: false,
        items: [
          { text: "Overview", link: "/storage/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [
              { text: "Overview", link: "/storage/concepts/" },
              {
                text: "Backend Interface",
                link: "/storage/concepts/backend-interface",
              },
              { text: "Configuration", link: "/storage/concepts/configuration" },
            ],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [
              { text: "Overview", link: "/storage/patterns/" },
              { text: "S3-Compatible Backend", link: "/storage/patterns/s3-backend" },
              { text: "Production S3 Setup", link: "/storage/patterns/production-s3-setup" },
              { text: "Custom Backends", link: "/storage/patterns/custom-backends" },
            ],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Coming Soon", link: "/storage/troubleshooting/" }],
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
          { text: "Ubuntu Setup", link: "/contributing/ubuntu-setup" },
          { text: "Documentation Guide", link: "/contributing/documentation" },
          { text: "KB Page Design", link: "/contributing/kb-page-design" },
          { text: "Design System", link: "/contributing/design-system" },
          { text: "CI Validation", link: "/contributing/ci-validation" },
          { text: "ESLint Configuration", link: "/contributing/eslint-setup" },
          { text: "Improvements Policy", link: "/contributing/improvements-policy" },
        ],
      },
      {
        text: "AI-Assisted Development",
        collapsed: false,
        items: [
          { text: "Overview", link: "/ai-development/" },
          {
            text: "Concepts",
            collapsed: true,
            items: [{ text: "Overview", link: "/ai-development/concepts/" }],
          },
          {
            text: "Patterns",
            collapsed: true,
            items: [{ text: "Overview", link: "/ai-development/patterns/" }],
          },
          {
            text: "Decisions",
            collapsed: true,
            items: [{ text: "Overview", link: "/ai-development/decisions/" }],
          },
          {
            text: "Agents",
            collapsed: true,
            items: [
              { text: "Overview", link: "/ai-development/agents/" },
              {
                text: "Current Agents",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/ai-development/agents/current/" },
                  { text: "Analyst", link: "/ai-development/agents/current/analyst" },
                  { text: "Architect", link: "/ai-development/agents/current/architect" },
                  { text: "Designer", link: "/ai-development/agents/current/designer" },
                  { text: "Developer", link: "/ai-development/agents/current/developer" },
                  { text: "Git Agent", link: "/ai-development/agents/current/git-agent" },
                  { text: "PM", link: "/ai-development/agents/current/pm" },
                  { text: "QA", link: "/ai-development/agents/current/qa" },
                  { text: "Reviewer", link: "/ai-development/agents/current/reviewer" },
                  { text: "Trainer", link: "/ai-development/agents/current/trainer" },
                  { text: "Writer", link: "/ai-development/agents/current/writer" },
                ],
              },
              {
                text: "Deprecated Agents",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/ai-development/agents/deprecated/" },
                  { text: "Analyst", link: "/ai-development/agents/deprecated/analyst" },
                  { text: "Architect", link: "/ai-development/agents/deprecated/architect" },
                  { text: "Designer", link: "/ai-development/agents/deprecated/designer" },
                  { text: "Developer", link: "/ai-development/agents/deprecated/developer" },
                  { text: "Git Agent", link: "/ai-development/agents/deprecated/git-agent" },
                  { text: "PM", link: "/ai-development/agents/deprecated/pm" },
                  { text: "QA", link: "/ai-development/agents/deprecated/qa" },
                  { text: "Reviewer", link: "/ai-development/agents/deprecated/reviewer" },
                  { text: "Trainer", link: "/ai-development/agents/deprecated/trainer" },
                  { text: "Writer", link: "/ai-development/agents/deprecated/writer" },
                ],
              },
            ],
          },
          {
            text: "Commands",
            collapsed: true,
            items: [
              { text: "Overview", link: "/ai-development/commands/" },
              { text: "Analyst", link: "/ai-development/commands/analyst" },
              { text: "Architect", link: "/ai-development/commands/architect" },
              { text: "Designer", link: "/ai-development/commands/designer" },
              { text: "Developer", link: "/ai-development/commands/developer" },
              { text: "PM", link: "/ai-development/commands/pm" },
              { text: "QA", link: "/ai-development/commands/qa" },
              { text: "Reviewer", link: "/ai-development/commands/reviewer" },
              { text: "Trainer", link: "/ai-development/commands/trainer" },
              { text: "Utility", link: "/ai-development/commands/utility" },
              { text: "Writer", link: "/ai-development/commands/writer" },
              { text: "Archived Commands", link: "/ai-development/commands/archived" },
            ],
          },
          {
            text: "Workflows",
            collapsed: true,
            items: [
              { text: "Overview", link: "/ai-development/workflows/" },
              { text: "Deliberative (Current)", link: "/ai-development/workflows/deliberative" },
              { text: "Prescriptive (Archived)", link: "/ai-development/workflows/prescriptive" },
            ],
          },
          {
            text: "Troubleshooting",
            collapsed: true,
            items: [{ text: "Overview", link: "/ai-development/troubleshooting/" }],
          },
        ],
      },
      {
        text: "Improvements & Recommendations",
        collapsed: true,
        items: [
          { text: "Overview", link: "/improvements/" },
          { text: "Authentication", link: "/improvements/auth" },
          { text: "Database", link: "/improvements/database" },
          { text: "API Design", link: "/improvements/api" },
          { text: "AI Gateway", link: "/improvements/ai" },
          { text: "Testing", link: "/improvements/testing" },
          { text: "Infrastructure", link: "/improvements/infrastructure" },
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
