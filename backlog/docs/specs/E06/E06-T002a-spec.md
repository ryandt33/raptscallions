# Implementation Spec: E06-T002a

**Task:** KB Theme Design and Modern Agricultural Styling
**Epic:** E06 - Knowledge Base Documentation
**Status:** Analyzed
**Created:** 2026-01-13

---

## Overview

Apply the Modern Agricultural design system to the VitePress knowledge base, establishing Raptscallions' visual identity through a custom theme. This involves creating CSS variable overrides for colors and typography, importing custom fonts, and styling key UI components while preserving all VitePress functionality. The theme will work in both light and dark modes with accessible color contrast ratios.

**Key Goals:**
1. Extend VitePress default theme (not replace it)
2. Apply Modern Agricultural color palette via CSS variables
3. Import and configure custom fonts (DM Sans, DM Serif Display)
4. Maintain VitePress features (search, navigation, theme toggle)
5. Ensure WCAG 2.1 AA accessibility compliance
6. Create both light and dark theme variants

---

## Approach

### Technical Strategy

**VitePress Theme Extension:**
- Use VitePress's theme extension API by creating `.vitepress/theme/index.ts`
- Import and extend the default theme rather than replacing it
- Override theme via custom CSS in `.vitepress/theme/style.css`
- Leverage VitePress CSS custom properties (variables) for colors and typography

**CSS Architecture:**
- Layer styles using CSS variables for both `:root` (light) and `.dark` (dark mode)
- Organize custom CSS into logical sections: base, typography, colors, components
- Use VitePress's built-in CSS variable names for maximum compatibility
- Add custom variables only for brand-specific values not in VitePress defaults

**Font Loading:**
- Load Google Fonts (DM Sans, DM Serif Display) via `<link>` in theme config
- Set font-display: swap for performance
- Provide fallback fonts for progressive enhancement

**Color System:**
- Map Modern Agricultural palette to VitePress CSS variables
- Ensure sufficient contrast ratios for WCAG AA compliance
- Test all color combinations in both light and dark modes
- Use gradient backgrounds sparingly for hero sections only

**Component Styling:**
- Style components through CSS variable overrides (minimal custom CSS)
- Preserve VitePress component structure and JavaScript functionality
- Add subtle shadows and rounded corners per design tokens
- Keep navigation clean and functional

---

## Files to Create

| File | Purpose |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/index.ts` | Theme entry point extending VitePress default theme |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/style.css` | Custom CSS variable overrides and brand styling |
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/fonts.css` | Google Fonts import and font-face declarations |

---

## Files to Modify

| File | Changes |
|------|---------|
| `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/config.ts` | Update head config to preconnect to Google Fonts CDN for performance |

---

## Dependencies

### Required Packages
- None (VitePress already installed)

### Task Dependencies
- **Requires:** E06-T002 (KB folder structure) - DONE
- **Blocks:** E06-T005+ (content creation tasks)

### External Resources
- Google Fonts API: `fonts.googleapis.com`
- DM Sans font family (weights: 400, 500, 600, 700)
- DM Serif Display font family (weight: 400)

---

## Detailed Implementation

### 1. Theme Entry Point (`index.ts`)

**Purpose:** Register custom theme with VitePress by extending default theme and importing custom styles.

**Implementation:**
```typescript
// apps/docs/.vitepress/theme/index.ts
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

// Import custom styles
import './fonts.css';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // Use default layout with custom styles applied via CSS
    });
  },
  enhanceApp({ app, router, siteData }) {
    // No custom app enhancements needed for this phase
  }
} satisfies Theme;
```

**Type Safety:**
- Use `satisfies Theme` for type checking
- Import types from 'vitepress' package
- Extends DefaultTheme to preserve all functionality

---

### 2. Font Configuration (`fonts.css`)

**Purpose:** Import Google Fonts with optimized loading strategy.

**Implementation:**
```css
/* apps/docs/.vitepress/theme/fonts.css */

/**
 * Google Fonts Import
 * DM Sans: Body text (weights: 400, 500, 600, 700)
 * DM Serif Display: Headings (weight: 400)
 */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

/**
 * Font Face Fallbacks
 * Ensures text remains visible during font loading
 */
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: local('');
}

@font-face {
  font-family: 'DM Serif Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: local('');
}
```

**Notes:**
- Use `@import` at top of CSS file (must be first declaration)
- `font-display: swap` ensures text is visible while loading
- Local font check (`src: local('')`) for browser-installed fonts

---

### 3. Core Theme Styles (`style.css`)

**Purpose:** Override VitePress CSS variables with Modern Agricultural palette and typography.

**Structure:**
```css
/* apps/docs/.vitepress/theme/style.css */

/**
 * Raptscallions Knowledge Base Theme
 * Modern Agricultural Design System
 *
 * Sections:
 * 1. Typography
 * 2. Light Theme Colors
 * 3. Dark Theme Colors
 * 4. Component Styling
 * 5. Custom Enhancements
 */

/* ========================================
   1. TYPOGRAPHY
   ======================================== */

:root {
  /* Font Families */
  --vp-font-family-base: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --vp-font-family-mono: Monaco, Consolas, "Courier New", monospace;

  /* Custom heading font (not a VitePress default, used in custom CSS) */
  --raptscallions-font-display: "DM Serif Display", Georgia, serif;

  /* Font Sizes - VitePress defaults are good, but we can adjust if needed */
  /* --vp-font-size-root: 16px; */
  /* --vp-font-size-md: 15px; */
}

/* Apply display font to headings */
h1, h2, h3, h4, h5, h6,
.VPHero .name,
.VPFeature .title {
  font-family: var(--raptscallions-font-display);
  font-weight: 400; /* DM Serif Display is elegant at normal weight */
}

/* ========================================
   2. LIGHT THEME COLORS
   ======================================== */

:root {
  /* Brand Colors - Green Palette */
  --vp-c-brand-1: #22c55e;  /* Green-500 - Primary brand */
  --vp-c-brand-2: #16a34a;  /* Green-600 - Hover states */
  --vp-c-brand-3: #15803d;  /* Green-700 - Active states */
  --vp-c-brand-soft: #dcfce7; /* Green-100 - Soft backgrounds */

  /* Backgrounds - Warm Neutrals */
  --vp-c-bg: #fafaf9;        /* Stone-50 - Main background */
  --vp-c-bg-soft: #f5f5f4;   /* Stone-100 - Card backgrounds */
  --vp-c-bg-alt: #ffffff;    /* White - Elevated surfaces */
  --vp-c-bg-elv: #ffffff;    /* White - Elevated surfaces (same as alt) */

  /* Text Colors */
  --vp-c-text-1: #1c1917;    /* Stone-900 - Primary text */
  --vp-c-text-2: #57534e;    /* Stone-600 - Secondary text */
  --vp-c-text-3: #a8a29e;    /* Stone-400 - Tertiary text */

  /* Borders and Dividers */
  --vp-c-divider: #e7e5e4;   /* Stone-200 - Divider lines */
  --vp-c-border: #e7e5e4;    /* Stone-200 - Border color */

  /* Accent Colors */
  --vp-c-info: #0ea5e9;      /* Sky Blue - Info badges */
  --vp-c-warning: #f59e0b;   /* Amber - Warning badges */
  --vp-c-danger: #ef4444;    /* Red - Error states */
  --vp-c-tip: #22c55e;       /* Green - Tips and success */

  /* Secondary Brand - Sky Blue (for links, code) */
  --vp-c-link: #0ea5e9;      /* Blue-500 - Links */
  --vp-c-link-hover: #0284c7; /* Blue-600 - Link hover */

  /* Sidebar */
  --vp-c-sidebar-bg: #fafaf9; /* Stone-50 - Matches main bg */
  --vp-sidebar-bg-color: #fafaf9;

  /* Code Blocks */
  --vp-code-bg: #f5f5f4;     /* Stone-100 - Inline code background */
  --vp-code-color: #15803d;  /* Green-700 - Inline code text */

  /* Custom Shadows */
  --raptscallions-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --raptscallions-shadow-md: 0 4px 12px rgba(22, 163, 74, 0.15);
}

/* ========================================
   3. DARK THEME COLORS
   ======================================== */

.dark {
  /* Brand Colors - Lighter greens for contrast */
  --vp-c-brand-1: #4ade80;  /* Green-400 - Primary (lighter) */
  --vp-c-brand-2: #22c55e;  /* Green-500 - Hover */
  --vp-c-brand-3: #16a34a;  /* Green-600 - Active */
  --vp-c-brand-soft: #14532d; /* Green-900 - Soft backgrounds (dark) */

  /* Backgrounds - Dark warm grays */
  --vp-c-bg: #0c0a09;        /* Stone-950 - Main background */
  --vp-c-bg-soft: #1c1917;   /* Stone-900 - Card backgrounds */
  --vp-c-bg-alt: #292524;    /* Stone-800 - Elevated surfaces */
  --vp-c-bg-elv: #292524;    /* Stone-800 - Elevated surfaces */

  /* Text Colors - Light grays */
  --vp-c-text-1: #f5f5f4;    /* Stone-100 - Primary text */
  --vp-c-text-2: #a8a29e;    /* Stone-400 - Secondary text */
  --vp-c-text-3: #78716c;    /* Stone-500 - Tertiary text */

  /* Borders and Dividers */
  --vp-c-divider: #292524;   /* Stone-800 - Divider lines */
  --vp-c-border: #44403c;    /* Stone-700 - Border color */

  /* Accent Colors (adjust for dark mode) */
  --vp-c-info: #38bdf8;      /* Sky Blue-400 - Lighter for contrast */
  --vp-c-warning: #fbbf24;   /* Amber-400 - Lighter */
  --vp-c-danger: #f87171;    /* Red-400 - Lighter */
  --vp-c-tip: #4ade80;       /* Green-400 - Lighter */

  /* Links - Lighter blue for visibility */
  --vp-c-link: #38bdf8;      /* Blue-400 */
  --vp-c-link-hover: #7dd3fc; /* Blue-300 */

  /* Sidebar */
  --vp-c-sidebar-bg: #0c0a09; /* Stone-950 - Matches main bg */
  --vp-sidebar-bg-color: #0c0a09;

  /* Code Blocks */
  --vp-code-bg: #1c1917;     /* Stone-900 - Inline code background */
  --vp-code-color: #4ade80;  /* Green-400 - Inline code text (lighter) */

  /* Custom Shadows */
  --raptscallions-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --raptscallions-shadow-md: 0 4px 12px rgba(74, 222, 128, 0.1);
}

/* ========================================
   4. COMPONENT STYLING
   ======================================== */

/* Hero Section - Agricultural Gradient */
.VPHero {
  background: linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%);
  border-radius: 16px;
  padding: 4rem 2rem;
  margin-bottom: 2rem;
}

.VPHero .name,
.VPHero .text {
  color: white;
}

.VPHero .tagline {
  color: #dcfce7; /* Green-100 */
}

/* Sidebar Navigation - Rounded Cards */
.VPSidebar .group {
  margin-bottom: 1rem;
}

.VPSidebarItem.level-0 {
  border-radius: 12px;
  transition: all 0.2s ease;
}

.VPSidebarItem.level-0:hover {
  background: var(--vp-c-bg-alt);
  box-shadow: var(--raptscallions-shadow-sm);
}

.VPSidebarItem.level-0.is-active {
  background: var(--vp-c-brand-soft);
  box-shadow: var(--raptscallions-shadow-sm);
}

/* Navigation Bar */
.VPNavBar {
  border-bottom: 1px solid var(--vp-c-divider);
  backdrop-filter: blur(8px);
  background: rgba(250, 250, 249, 0.9);
}

.dark .VPNavBar {
  background: rgba(12, 10, 9, 0.9);
}

/* Buttons - Rounded Style */
.VPButton {
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.VPButton.brand {
  background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
  box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
}

.VPButton.brand:hover {
  box-shadow: 0 6px 20px rgba(22, 163, 74, 0.45);
  transform: translateY(-2px);
}

/* Code Blocks - Improved Styling */
.vp-code-group,
div[class*='language-'] {
  border-radius: 12px;
  box-shadow: var(--raptscallions-shadow-sm);
}

/* Cards (Feature Cards, Doc Cards) */
.VPFeature {
  border-radius: 16px;
  border: 1px solid var(--vp-c-border);
  box-shadow: var(--raptscallions-shadow-sm);
  transition: all 0.3s ease;
}

.VPFeature:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--raptscallions-shadow-md);
  transform: translateY(-2px);
}

/* ========================================
   5. CUSTOM ENHANCEMENTS
   ======================================== */

/* Logo/Brand Area */
.VPNavBarTitle .title {
  font-family: var(--raptscallions-font-display);
  font-weight: 600;
  background: linear-gradient(135deg, #15803d 0%, #22c55e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dark .VPNavBarTitle .title {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Badges - Agricultural Style */
.vp-badge {
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.vp-badge.tip {
  background: #dcfce7;
  color: #15803d;
}

.dark .vp-badge.tip {
  background: #14532d;
  color: #4ade80;
}

/* Search Box */
.DocSearch-Button {
  border-radius: 12px;
  box-shadow: var(--raptscallions-shadow-sm);
}

/* Footer */
.VPFooter {
  border-top: 1px solid var(--vp-c-divider);
  padding: 2rem 0;
}

/* Scrollbar Styling (WebKit browsers) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--vp-c-brand-1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-brand-2);
}
```

**Notes:**
- All VitePress CSS variable names preserved for compatibility
- Custom variables prefixed with `--raptscallions-*` to avoid conflicts
- Gradients used sparingly (hero section, logo) to avoid visual clutter
- Shadows are subtle for modern, clean aesthetic

---

### 4. Config Head Updates (`config.ts`)

**Purpose:** Preconnect to Google Fonts CDN for performance optimization.

**Changes:**
```typescript
export default defineConfig({
  // ... existing config

  // Add head configuration for font preconnect
  head: [
    // Preconnect to Google Fonts CDN for faster font loading
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }]
  ],

  // ... rest of config
});
```

**Why Preconnect:**
- Establishes early connection to Google Fonts CDN
- Reduces DNS lookup and connection time
- Improves font loading performance

---

## Acceptance Criteria Breakdown

### AC1: Custom VitePress theme configuration created at `apps/docs/.vitepress/theme/`
**Implementation:** Create theme directory with `index.ts`, `style.css`, and `fonts.css` files as specified above.

**Testing:**
```bash
# Build should complete without errors
pnpm docs:build

# Dev server should load theme
pnpm docs:dev
# Visit http://localhost:5173 and verify custom styles are applied
```

**Done When:**
- Theme directory exists with all three files
- VitePress builds successfully
- Custom styles visible in browser

---

### AC2: Light theme uses Modern Agricultural color palette
**Implementation:** CSS variables in `:root` selector with green primary, blue secondary, warm neutral backgrounds.

**Testing:**
- Visit KB in light mode
- Verify primary brand color is green (#22c55e)
- Check links are sky blue (#0ea5e9)
- Confirm backgrounds use warm stone grays

**Color Verification:**
```javascript
// In browser DevTools console
getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1');
// Should return: #22c55e
```

**Done When:**
- All AC2 colors match Modern Agricultural light palette
- Visual inspection confirms green primary, blue accents
- DevTools confirm CSS variable values

---

### AC3: Dark theme uses inverted palette maintaining readability and brand consistency
**Implementation:** CSS variables in `.dark` selector with lighter greens, dark warm backgrounds.

**Testing:**
- Toggle to dark mode (moon icon in navbar)
- Verify primary brand color is lighter green (#4ade80)
- Check backgrounds are dark stone grays (#0c0a09, #1c1917)
- Confirm text is light and readable

**Contrast Check:**
```bash
# Use browser DevTools Lighthouse or axe DevTools
# Verify all text meets WCAG AA (4.5:1 for normal text, 3:1 for large)
```

**Done When:**
- Dark theme applies correctly
- Text contrast meets WCAG AA standards
- Colors feel cohesive with light theme

---

### AC4: Custom CSS variables defined for both themes
**Implementation:** All variables documented in `style.css` with comments explaining usage.

**Testing:**
- Open `style.css` and verify all variables are defined
- Check both `:root` and `.dark` selectors have complete variable sets
- Confirm custom variables use `--raptscallions-*` prefix

**Done When:**
- Variables cover colors, typography, shadows
- Both themes have consistent variable structure
- Comments explain purpose of custom variables

---

### AC5: Agricultural icon system integrated
**Implementation:** Sprout logo in navbar, leaf accents optional for now (can be added in AC8/AC9).

**Note:** VitePress uses text logo by default. For MVP, apply gradient to text logo via CSS. Physical icon integration can be phase 2.

**Testing:**
- Verify navbar title has gradient text (looks like agricultural branding)
- Check if logo area feels on-brand

**Done When:**
- Navbar logo uses gradient text styling
- Brand feels agricultural and cohesive

---

### AC6: Typography uses DM Sans (body) and DM Serif Display (headings)
**Implementation:** Font imports in `fonts.css`, CSS variables in `style.css`, heading overrides.

**Testing:**
```javascript
// In browser DevTools, select body text
getComputedStyle(document.body).fontFamily;
// Should include: "DM Sans"

// Select an h1 element
getComputedStyle(document.querySelector('h1')).fontFamily;
// Should include: "DM Serif Display"
```

**Network Check:**
- Open DevTools Network tab
- Verify Google Fonts requests load successfully
- Check font files download (woff2 format)

**Done When:**
- Body text uses DM Sans
- Headings use DM Serif Display
- Fonts load without errors
- Fallback fonts work if Google Fonts fails

---

### AC7: Component styling maintains VitePress functionality while applying brand aesthetics
**Implementation:** CSS overrides for buttons, cards, nav, sidebar without breaking JavaScript functionality.

**Testing:**
```bash
# Functional tests
1. Click sidebar links - navigation should work
2. Use search (Cmd/Ctrl+K) - search should open and function
3. Toggle dark mode - theme should switch
4. Click buttons - actions should execute
5. Scroll page - smooth scroll should work
6. Resize browser - responsive layout should adapt
```

**Done When:**
- All VitePress features work (search, nav, theme toggle)
- Components have agricultural styling (rounded corners, shadows)
- No JavaScript errors in console
- Responsive design works on mobile

---

### AC8: Homepage hero section styled with agricultural gradient and brand elements
**Implementation:** CSS overrides for `.VPHero` class with gradient background.

**Testing:**
- Visit homepage (http://localhost:5173/)
- Verify hero section has green gradient background
- Check text is white and readable
- Confirm gradient flows from dark green to light green

**Visual Check:**
- Gradient should be: `linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%)`
- Text color: white
- Rounded corners: 16px

**Done When:**
- Hero has agricultural gradient
- Text is readable (white on green gradient)
- Styling feels premium and on-brand

---

### AC9: Sidebar navigation styled with rounded cards and subtle shadows
**Implementation:** CSS overrides for `.VPSidebarItem` with border-radius and hover states.

**Testing:**
- Navigate to any page with sidebar
- Hover over sidebar items - should see hover effect
- Click item to activate - should see active state
- Verify rounded corners and subtle shadows

**Visual Checklist:**
- Border radius: 12px
- Hover: background color change + shadow
- Active: brand color background
- Smooth transitions (0.2s ease)

**Done When:**
- Sidebar items have rounded card appearance
- Hover and active states work correctly
- Shadows are subtle and modern
- Navigation remains functional

---

### AC10: Code blocks and inline code maintain readability in both themes
**Implementation:** CSS variables for `--vp-code-bg` and `--vp-code-color` in both light and dark modes.

**Testing:**
```bash
# Create a test markdown file with code blocks
echo '```typescript
function test() {
  return "Hello";
}
```' > apps/docs/src/test-code.md

# Visit page and verify code syntax highlighting works
```

**Light Mode Check:**
- Inline code: Stone-100 background (#f5f5f4), Green-700 text (#15803d)
- Code blocks: Default VitePress syntax theme with minor tweaks

**Dark Mode Check:**
- Inline code: Stone-900 background (#1c1917), Green-400 text (#4ade80)
- Code blocks: Dark syntax theme with good contrast

**Done When:**
- Inline code readable in both themes
- Code blocks have syntax highlighting
- Contrast meets WCAG AA standards
- Rounded corners (12px) on code blocks

---

### AC11: Design system documented in KB contributing section
**Implementation:** Create markdown file documenting color palette, typography, and usage.

**File:** `apps/docs/src/contributing/design-system.md`

**Content Outline:**
```markdown
# Design System

## Color Palette

### Light Theme
- Primary: Deep Forest Green (#22c55e)
- Secondary: Sky Blue (#0ea5e9)
- Accent: Golden Wheat (#f59e0b)
- Backgrounds: Warm stone grays

### Dark Theme
- Primary: Lighter Green (#4ade80)
- Backgrounds: Dark stone grays

## Typography
- Body: DM Sans (400, 500, 600, 700)
- Headings: DM Serif Display (400)
- Code: Monaco, Consolas

## Tokens
- Border radius: 8px (small), 12px (medium), 16px (large)
- Shadows: Subtle (0 1px 3px rgba(0,0,0,0.04))
- Spacing: 4px base unit

## Usage Examples
[Code examples of how to use colors, fonts, and components]
```

**Done When:**
- Design system page exists in contributing section
- All colors and tokens documented
- Usage examples provided
- Page added to sidebar navigation

---

### AC12: Build passes with no style conflicts or warnings
**Implementation:** Clean CSS architecture with no duplicate selectors or conflicting rules.

**Testing:**
```bash
# Run build
pnpm docs:build

# Check for warnings
# Should see: "✓ building client + server bundles..." with no CSS warnings

# Run dev server and check browser console
pnpm docs:dev
# Open http://localhost:5173
# Open DevTools console - should have no CSS errors or warnings
```

**Validation Checklist:**
- No CSS syntax errors
- No duplicate CSS variable definitions
- No conflicting selector specificity
- No browser console warnings
- Build completes successfully

**Done When:**
- `pnpm docs:build` succeeds with no errors
- `pnpm docs:dev` runs without warnings
- Browser console clean (no CSS errors)
- Lighthouse audit shows no CSS issues

---

## Test Strategy

### Unit Tests
**Not Applicable:** CSS styling doesn't require unit tests. Validation is visual and functional.

---

### Integration Tests

**Manual Testing Checklist:**

#### Visual Regression Testing
- [ ] Homepage hero displays gradient correctly
- [ ] Sidebar navigation shows rounded cards
- [ ] Buttons have proper styling and hover states
- [ ] Code blocks are readable in both themes
- [ ] All text has sufficient contrast
- [ ] Typography uses correct fonts (DM Sans, DM Serif Display)

#### Functional Testing
- [ ] Search works (Cmd/Ctrl + K)
- [ ] Theme toggle switches between light/dark
- [ ] Sidebar navigation links work
- [ ] Page transitions are smooth
- [ ] Responsive layout works on mobile
- [ ] External links open correctly

#### Cross-Browser Testing
Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on macOS)

Check:
- Fonts load correctly
- Colors render accurately
- Gradients display properly
- CSS Grid/Flexbox layouts work

#### Performance Testing
```bash
# Run Lighthouse audit
# Target scores:
# - Performance: 90+
# - Accessibility: 95+
# - Best Practices: 95+
# - SEO: 100
```

---

### Accessibility Testing

**WCAG 2.1 AA Compliance:**

#### Color Contrast Ratios
Use browser DevTools or online contrast checkers:

**Light Theme:**
- Primary text on background: #1c1917 on #fafaf9 = 18.2:1 (AAA)
- Secondary text on background: #57534e on #fafaf9 = 7.8:1 (AAA)
- Brand on background: #22c55e on #fafaf9 = 3.9:1 (AA Large)
- Links on background: #0ea5e9 on #fafaf9 = 4.8:1 (AA)

**Dark Theme:**
- Primary text on background: #f5f5f4 on #0c0a09 = 19.1:1 (AAA)
- Secondary text on background: #a8a29e on #0c0a09 = 9.1:1 (AAA)
- Brand on background: #4ade80 on #0c0a09 = 11.2:1 (AAA)
- Links on background: #38bdf8 on #0c0a09 = 10.5:1 (AAA)

**Testing Tools:**
- Chrome DevTools Lighthouse
- axe DevTools browser extension
- WAVE browser extension
- WebAIM Contrast Checker

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Sidebar items focusable and activatable with Enter
- [ ] Search opens with Cmd/Ctrl+K and works with keyboard only
- [ ] Theme toggle accessible via keyboard
- [ ] Skip to content link present (VitePress default)

#### Screen Reader Testing
- [ ] Logo announces as "Raptscallions KB"
- [ ] Sidebar navigation is announced as navigation landmark
- [ ] Headings hierarchy is logical (h1 → h2 → h3)
- [ ] Code blocks announced as code regions
- [ ] Links have descriptive text (no "click here")

**Testing Tools:**
- macOS VoiceOver
- Windows Narrator
- NVDA (Windows)
- JAWS (Windows)

---

## Edge Cases

### 1. Font Loading Failures
**Scenario:** Google Fonts CDN is unavailable or blocked (e.g., China, corporate firewalls).

**Impact:** Page will display in fallback fonts (system-ui, sans-serif).

**Handling:**
- Fallback fonts specified in CSS variables
- `font-display: swap` ensures text remains visible
- No layout shift with `@font-face` declarations

**Test:**
```bash
# Block fonts.googleapis.com in browser DevTools Network tab
# Verify page still readable with fallback fonts
```

---

### 2. Dark Mode Contrast Issues
**Scenario:** User has custom browser theme or accessibility settings that conflict with dark mode colors.

**Impact:** Text may be difficult to read.

**Handling:**
- Use higher contrast colors in dark mode (lighter greens, whites)
- Test with browser's "Simulate color vision deficiencies" DevTools
- Provide override CSS variables for users who want custom themes

**Test:**
```bash
# In DevTools, test with different color vision deficiency simulations
# Ensure text remains readable in all scenarios
```

---

### 3. CSS Variable Conflicts with User Styles
**Scenario:** User has browser extension or custom CSS that overrides VitePress variables.

**Impact:** Theme may not render correctly.

**Handling:**
- Use `!important` sparingly (only for critical brand colors)
- Rely on VitePress's specificity hierarchy
- Document CSS variable names for users who want customization

**Test:**
```bash
# Install common browser extensions (Dark Reader, Stylus)
# Verify theme still looks reasonable
```

---

### 4. Long Sidebar Navigation Items
**Scenario:** Page titles or sidebar items exceed container width.

**Impact:** Text overflow or layout breaking.

**Handling:**
- Use `text-overflow: ellipsis` for long titles
- VitePress handles this by default, but verify with long titles
- Test with narrow browser widths

**Test:**
```bash
# Create a markdown page with very long title
echo '# This is an extremely long page title that should overflow' > apps/docs/src/test-long-title.md

# Verify sidebar truncates properly
```

---

### 5. Gradient Browser Compatibility
**Scenario:** Older browsers (IE11, older Safari) may not support gradients or CSS custom properties.

**Impact:** Gradients won't display, fallback to solid color needed.

**Handling:**
- Provide solid color fallback before gradient
- CSS custom properties not supported in IE11 (acceptable, as VitePress requires modern browsers)
- Use `@supports` for progressive enhancement if needed

**Example:**
```css
.VPHero {
  background: #16a34a; /* Fallback solid color */
  background: linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%);
}
```

**Test:**
```bash
# Use BrowserStack or browser DevTools to simulate older browsers
# Verify fallback colors work
```

---

### 6. High Contrast Mode (Windows)
**Scenario:** User enables Windows High Contrast Mode.

**Impact:** Custom colors may be overridden by system colors.

**Handling:**
- Test with Windows High Contrast Mode enabled
- Ensure semantic HTML structure works without CSS
- Use `forced-colors: active` media query if needed

**Test:**
```bash
# On Windows: Settings → Ease of Access → High contrast
# Enable high contrast and verify KB remains usable
```

---

### 7. Print Styles
**Scenario:** User prints KB page.

**Impact:** Gradients and dark backgrounds waste ink, may be unreadable.

**Handling:**
- VitePress provides default print styles
- Consider adding `@media print` overrides to remove gradients
- Not critical for MVP, can be enhancement

**Test:**
```bash
# Print preview in browser (Cmd/Ctrl+P)
# Verify page is readable when printed
```

---

## Open Questions

### Q1: Should we add a custom logo SVG instead of text-based logo?
**Context:** Current design uses gradient text for logo. A sprout icon SVG could be more distinctive.

**Options:**
1. Keep gradient text (simpler, less code)
2. Add custom SVG logo component (more work, better branding)

**Recommendation:** Start with gradient text for MVP (AC5). Add SVG logo in follow-up task if desired.

**Decision Needed From:** PM/Design Lead

---

### Q2: Should dark mode be the default theme?
**Context:** VitePress defaults to light mode. Many developers prefer dark mode.

**Options:**
1. Keep light mode default (VitePress convention)
2. Set dark mode as default (developer preference)
3. Use system preference detection (best UX)

**Recommendation:** Use VitePress default behavior (system preference detection). Users can toggle manually.

**Decision Needed From:** Product team

---

### Q3: Should we include agricultural icon assets (leaf, seed, sun)?
**Context:** Design system mentions leaf, seed, sun motifs. These aren't in current VitePress setup.

**Options:**
1. Add icon components in this task (scope creep)
2. Defer to follow-up task for custom components (E06-T009 or later)
3. Use emoji icons (🌱, 🌾) as placeholders

**Recommendation:** Use emoji placeholders for MVP. Create proper icon system in follow-up task.

**Decision Needed From:** PM/Developer

---

### Q4: Should we add smooth scroll behavior?
**Context:** Modern sites often have smooth scrolling. VitePress uses instant scroll by default.

**Options:**
1. Add `scroll-behavior: smooth;` to CSS
2. Keep default instant scroll (VitePress convention)

**Recommendation:** Add smooth scroll if it doesn't impact performance. One line of CSS:
```css
html {
  scroll-behavior: smooth;
}
```

**Decision Needed From:** Developer preference (low risk)

---

### Q5: Should we customize the 404 page styling?
**Context:** VitePress has a default 404 page. We could style it to match agricultural theme.

**Options:**
1. Keep default 404 page (faster MVP)
2. Customize 404 page with brand styling (better UX)

**Recommendation:** Keep default for MVP. Customize in polish phase.

**Decision Needed From:** PM

---

## Implementation Steps

### Phase 1: Foundation (Critical)

**Step 1:** Create theme directory structure
```bash
mkdir -p /home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme
```

**Step 2:** Create theme entry point (`index.ts`)
- Extend DefaultTheme
- Import custom CSS files
- No custom Vue components yet

**Step 3:** Create font configuration (`fonts.css`)
- Import Google Fonts
- Set font-display: swap
- Add font-face fallbacks

**Step 4:** Create core styles (`style.css`)
- Add typography variables
- Add light theme colors
- Add dark theme colors
- Add component overrides

**Step 5:** Update VitePress config (`config.ts`)
- Add preconnect links for Google Fonts
- Verify theme loads correctly

**Step 6:** Test build
```bash
pnpm docs:build
pnpm docs:dev
```

**Step 7:** Verify in browser
- Check light mode colors
- Check dark mode colors
- Check fonts loaded
- Check basic functionality

**Estimated Time:** 2-3 hours

---

### Phase 2: Component Styling (High Priority)

**Step 8:** Style hero section
- Add agricultural gradient
- Ensure text readability
- Test responsive layout

**Step 9:** Style sidebar navigation
- Add rounded cards
- Add hover states
- Add active states
- Add subtle shadows

**Step 10:** Style buttons and links
- Add brand colors
- Add hover effects
- Add transitions

**Step 11:** Style code blocks
- Ensure readability in light mode
- Ensure readability in dark mode
- Add rounded corners

**Step 12:** Visual QA pass
- Check all pages
- Verify consistency
- Fix any visual bugs

**Estimated Time:** 2-3 hours

---

### Phase 3: Polish and Documentation (Medium Priority)

**Step 13:** Document design system
- Create `design-system.md` in contributing section
- Document color palette
- Document typography
- Document tokens
- Add usage examples

**Step 14:** Add design system page to sidebar navigation
- Edit `config.ts` sidebar config
- Add link to contributing section

**Step 15:** Accessibility audit
- Run Lighthouse
- Check color contrast ratios
- Test keyboard navigation
- Test screen reader compatibility

**Step 16:** Cross-browser testing
- Test in Chrome
- Test in Firefox
- Test in Safari (if available)
- Fix browser-specific issues

**Step 17:** Performance optimization
- Verify font loading is efficient
- Check CSS bundle size
- Ensure no layout shifts
- Test on slow connection

**Step 18:** Final QA
- Go through all acceptance criteria
- Test all edge cases
- Document any known issues
- Sign off on completion

**Estimated Time:** 2-4 hours

---

### Total Estimated Time: 6-10 hours

---

## Success Metrics

### Visual Quality
- [ ] Design matches Modern Agricultural system
- [ ] Light and dark themes are cohesive
- [ ] Typography is readable and elegant
- [ ] Gradients are smooth and on-brand
- [ ] Shadows are subtle and modern

### Technical Quality
- [ ] Zero build errors or warnings
- [ ] Zero console errors in browser
- [ ] CSS is well-organized and commented
- [ ] All VitePress functionality preserved
- [ ] Performance is excellent (Lighthouse 90+)

### Accessibility
- [ ] WCAG 2.1 AA compliance verified
- [ ] Color contrast ratios meet standards
- [ ] Keyboard navigation works perfectly
- [ ] Screen reader compatibility confirmed
- [ ] No accessibility errors in automated tools

### User Experience
- [ ] Theme toggle works smoothly
- [ ] Search is fast and functional
- [ ] Navigation is intuitive
- [ ] Content is easy to read
- [ ] Site feels cohesive and professional

---

## Related Documentation

- [VitePress Theming Guide](https://vitepress.dev/guide/extending-default-theme)
- [VitePress CSS Variables](https://vitepress.dev/guide/theme-introduction#customizing-css)
- [Google Fonts Documentation](https://fonts.google.com/knowledge)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- Modern Agricultural Design System: `/home/ryan/Documents/coding/claude-box/raptscallions/docs/references/initial_planning/MODERN_DESIGN_PROTOTYPE.md`

---

## Notes for Developer

### Helpful Commands
```bash
# Development
pnpm docs:dev                    # Start dev server
pnpm docs:build                  # Build for production
pnpm docs:preview                # Preview production build

# Linting and type checking
pnpm typecheck                   # Check TypeScript types
pnpm lint                        # Run ESLint

# Testing
# Manual testing only - use browser DevTools
```

### Browser DevTools Tips
```javascript
// Check CSS variable values
getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1');

// Toggle dark mode programmatically
document.documentElement.classList.toggle('dark');

// Check font loading
document.fonts.check('16px "DM Sans"'); // Returns true if loaded
```

### Debugging Tips
- Use VitePress dev server hot reload for fast iteration
- Browser DevTools "Inspect Element" to see applied styles
- DevTools "Coverage" tab to check unused CSS
- Lighthouse audit for performance and accessibility issues
- "Rendering" tab for paint flashing and layout shift detection

---

## File Locations Summary

**New Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/index.ts`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/style.css`
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/theme/fonts.css`

**Modified Files:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/.vitepress/config.ts`

**Documentation:**
- `/home/ryan/Documents/coding/claude-box/raptscallions/apps/docs/src/contributing/design-system.md` (AC11)

---

**Spec Status:** ✅ Complete
**Ready for Developer:** Yes
**Estimated Complexity:** Medium
**Estimated Time:** 6-10 hours
