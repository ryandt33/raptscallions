---
description: Review design guides for UI alignment and theming, create if missing
allowed-tools:
  - Read
  - Glob
  - Grep
  - mcp__backlog__document_list
  - mcp__backlog__document_view
  - mcp__backlog__document_create
  - mcp__backlog__document_update
  - mcp__backlog__document_search
---

# Align Design

Review existing design guides to ensure UI alignment and theming standards are documented. If design guides are missing, create comprehensive guides in the Knowledge Base.

## Usage

```
/align-design
/align-design --domain ui
/align-design --create
```

## Process

1. Load the designer agent: `@designer`
2. Search for existing design documentation in the KB:
   - Check for `ui/` domain in `apps/docs/src/`
   - Search for design system, theming, component guides
   - Search backlog documents for design specs
3. **If design guides exist:**
   - Review for completeness and alignment
   - Check coverage of: design system, theming, components, accessibility, responsiveness
   - Identify gaps or outdated content
   - Recommend updates or create tasks for improvements
4. **If design guides are missing:**
   - Create comprehensive design guide structure in KB
   - Document design system principles
   - Document theming standards (colors, typography, spacing)
   - Document component patterns and usage
   - Document accessibility guidelines
   - Document responsive design patterns
5. Write findings to backlog document: `design-alignment-{timestamp}.md`

## What to Review/Create

### Design System Foundations
- **Color System**: Primary, secondary, accent, semantic colors (success, error, warning, info)
- **Typography**: Font families, scales, weights, line heights
- **Spacing**: Spacing scale (4px, 8px, 16px, etc.)
- **Elevation**: Shadow system for depth
- **Border Radius**: Rounding scale for components
- **Transitions**: Animation timing and easing

### Theme Architecture
- **CSS Variables**: How theming is implemented (`--color-primary`, etc.)
- **Dark/Light Modes**: Theme switching approach
- **Theme Provider**: React context setup
- **Group-Level Theming**: How groups customize themes
- **Brand Guidelines**: Logo usage, brand colors

### Component Guidelines
- **shadcn/ui Usage**: Which components are used, how they're configured
- **Custom Components**: When to create vs. use shadcn
- **Component Composition**: How to build complex UIs from primitives
- **Variant Patterns**: How to handle component variations
- **States**: Hover, focus, active, disabled, loading states

### Accessibility Standards
- **WCAG Compliance**: Level AA minimum
- **Keyboard Navigation**: Focus management, tab order
- **Screen Readers**: ARIA labels, semantic HTML
- **Color Contrast**: Minimum contrast ratios
- **Focus Indicators**: Visible focus styles

### Responsive Design
- **Breakpoints**: Mobile, tablet, desktop breakpoints
- **Mobile-First**: Mobile-first approach
- **Touch Targets**: Minimum 44x44px for touch
- **Responsive Typography**: Fluid type scales
- **Layout Patterns**: Grid, flexbox usage

### Frontend Technology Alignment
- **React Patterns**: Component structure, hooks usage
- **TanStack Router**: Route-based layouts
- **Tailwind CSS**: Utility-first patterns
- **Form Patterns**: react-hook-form with Zod

## KB Structure for Design Domain

If creating new design docs, use this structure:

```
apps/docs/src/
└── ui/                           # New domain for UI/design
    ├── index.md                  # Overview
    ├── concepts/
    │   ├── index.md              # Concepts overview
    │   ├── design-system.md      # Design system principles
    │   ├── theming.md            # Theming architecture
    │   └── accessibility.md      # Accessibility standards
    ├── patterns/
    │   ├── index.md              # Patterns overview
    │   ├── components.md         # Component patterns
    │   ├── layouts.md            # Layout patterns
    │   ├── forms.md              # Form patterns
    │   └── responsive.md         # Responsive patterns
    ├── decisions/
    │   ├── index.md              # Decisions overview
    │   ├── shadcn-ui.md          # Why shadcn/ui
    │   ├── tailwind.md           # Why Tailwind CSS
    │   └── theme-system.md       # Theme architecture decisions
    └── troubleshooting/
        ├── index.md              # Troubleshooting overview
        ├── theming-issues.md     # Theme switching problems
        └── responsive-issues.md  # Responsive layout fixes
```

## Arguments

- `--domain <name>` - Focus on specific domain (ui, auth, etc.)
- `--create` - Force creation of missing guides even if some exist
- `--review-only` - Only review existing guides, don't create new ones

## Output

Creates a backlog document with:
- **Status**: Current state of design documentation
- **Coverage**: What exists, what's missing
- **Recommendations**: Specific improvements needed
- **Created Guides**: List of new KB pages created (if any)
- **Follow-up Tasks**: Suggested tasks for addressing gaps

## Integration with Workflow

This command can be run:
- **Before a project starts**: Ensure design foundations are documented
- **During UI implementation**: Validate alignment with standards
- **After review-ui**: If design inconsistencies are found
- **Periodically**: Quarterly design guide audits

## Examples

### Check existing design docs
```
/align-design --review-only
```

### Create missing design guides for UI domain
```
/align-design --domain ui --create
```

### Full alignment check and creation
```
/align-design
```
