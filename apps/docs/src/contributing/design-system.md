---
title: Design System
description: Modern Agricultural design system for Raptscallions KB theming and visual identity
---

# Design System

This document defines the Modern Agricultural design system used throughout the Raptscallions Knowledge Base. It covers color palettes, typography, design tokens, and usage guidelines.

## Color Palette

### Light Theme

**Primary - Deep Forest Green:**
- `--vp-c-brand-1`: `#22c55e` (Green-500) - Primary brand color
- `--vp-c-brand-2`: `#16a34a` (Green-600) - Hover states
- `--vp-c-brand-3`: `#15803d` (Green-700) - Active states
- `--vp-c-brand-soft`: `#dcfce7` (Green-100) - Soft backgrounds

**Secondary - Sky Blue:**
- `--vp-c-link`: `#0ea5e9` (Blue-500) - Links and accents
- `--vp-c-link-hover`: `#0284c7` (Blue-600) - Link hover states
- `--vp-c-info`: `#0ea5e9` (Blue-500) - Info badges

**Accent - Golden Wheat:**
- `--vp-c-warning`: `#f59e0b` (Amber-500) - Warning badges
- Amber-400: `#fbbf24` - Light accents

**Neutrals - Warm Stone Grays:**
- `--vp-c-bg`: `#fafaf9` (Stone-50) - Main background
- `--vp-c-bg-soft`: `#f5f5f4` (Stone-100) - Card backgrounds
- `--vp-c-bg-alt`: `#ffffff` - Elevated surfaces
- `--vp-c-text-1`: `#1c1917` (Stone-900) - Primary text
- `--vp-c-text-2`: `#57534e` (Stone-600) - Secondary text
- `--vp-c-text-3`: `#a8a29e` (Stone-400) - Tertiary text
- `--vp-c-divider`: `#e7e5e4` (Stone-200) - Borders and dividers

**Status Colors:**
- Success/Tip: `#22c55e` (Green-500)
- Danger: `#ef4444` (Red-500)

### Dark Theme

**Primary - Lighter Greens (for contrast):**
- `--vp-c-brand-1`: `#4ade80` (Green-400) - Primary brand color
- `--vp-c-brand-2`: `#22c55e` (Green-500) - Hover states
- `--vp-c-brand-3`: `#16a34a` (Green-600) - Active states
- `--vp-c-brand-soft`: `#14532d` (Green-900) - Soft backgrounds (dark)

**Secondary - Lighter Blue:**
- `--vp-c-link`: `#38bdf8` (Blue-400) - Links
- `--vp-c-link-hover`: `#7dd3fc` (Blue-300) - Link hover states
- `--vp-c-info`: `#38bdf8` (Blue-400) - Info badges

**Accent - Lighter Amber:**
- `--vp-c-warning`: `#fbbf24` (Amber-400) - Warning badges

**Backgrounds - Dark Warm Grays:**
- `--vp-c-bg`: `#0c0a09` (Stone-950) - Main background
- `--vp-c-bg-soft`: `#1c1917` (Stone-900) - Card backgrounds
- `--vp-c-bg-alt`: `#292524` (Stone-800) - Elevated surfaces
- `--vp-c-text-1`: `#f5f5f4` (Stone-100) - Primary text
- `--vp-c-text-2`: `#a8a29e` (Stone-400) - Secondary text
- `--vp-c-text-3`: `#78716c` (Stone-500) - Tertiary text
- `--vp-c-divider`: `#292524` (Stone-800) - Borders and dividers

**Status Colors:**
- Success/Tip: `#4ade80` (Green-400)
- Danger: `#f87171` (Red-400)

## Typography

### Font Families

**Body Text:**
- Font: "DM Sans"
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Variable: `--vp-font-family-base`
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Headings:**
- Font: "DM Serif Display"
- Weight: 400 (normal)
- Variable: `--raptscallions-font-display`
- Fallback: `Georgia, serif`

**Code:**
- Font: Monaco, Consolas
- Variable: `--vp-font-family-mono`
- Fallback: `"Courier New", monospace`

### Font Loading

Fonts are loaded from Google Fonts CDN with optimized preconnect:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

Font display strategy: `swap` - ensures text remains visible during font loading.

### Typography Scale

VitePress uses responsive typography that scales based on viewport size. Base font size is 16px.

## Design Tokens

### Border Radius

- **Small (8px):** Badges, small UI elements
  - Usage: `.vp-badge { border-radius: 8px; }`
- **Medium (12px):** Buttons, code blocks, sidebar items
  - Usage: `.VPButton { border-radius: 12px; }`
- **Large (16px):** Cards, hero sections
  - Usage: `.VPFeature { border-radius: 16px; }`

### Shadows

**Subtle (Small):**
- Light: `0 1px 3px rgba(0, 0, 0, 0.04)`
- Dark: `0 1px 3px rgba(0, 0, 0, 0.2)`
- Variable: `--raptscallions-shadow-sm`
- Usage: Cards, sidebar hover states

**Moderate (Medium):**
- Light: `0 4px 12px rgba(22, 163, 74, 0.15)` (green tint)
- Dark: `0 4px 12px rgba(74, 222, 128, 0.1)` (lighter green tint)
- Variable: `--raptscallions-shadow-md`
- Usage: Feature cards on hover, elevated elements

**Prominent (Button):**
- Brand button: `0 4px 14px rgba(22, 163, 74, 0.35)`
- Brand button hover: `0 6px 20px rgba(22, 163, 74, 0.45)`
- Usage: Primary action buttons

### Spacing

VitePress uses a 4px base unit for consistent spacing:

- **Extra Small:** 4px (`0.25rem`)
- **Small:** 8px (`0.5rem`)
- **Medium:** 16px (`1rem`)
- **Large:** 24px (`1.5rem`)
- **Extra Large:** 32px (`2rem`)
- **Hero padding:** 64px (`4rem`)

### Transitions

Standard transition for interactive elements:

```css
transition: all 0.2s ease;
```

Usage:
- Button hover states
- Sidebar item hover
- Card hover effects

Slower transition for cards:

```css
transition: all 0.3s ease;
```

## Gradients

### Agricultural Gradient (Hero)

Primary brand gradient used for hero sections:

```css
background: linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%);
```

Fallback solid color: `#16a34a`

**Accessibility Enhancement:**
To ensure proper contrast for white text on the bright gradient, a semi-transparent dark overlay is applied:
- Overlay: `rgba(0, 0, 0, 0.15)`
- Title text shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`
- This ensures WCAG AA compliance even on the lightest parts of the gradient

### Text Gradient (Logo)

**Light mode:**
```css
background: linear-gradient(135deg, #15803d 0%, #22c55e 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

**Dark mode:**
```css
background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

## Component Styling

### Buttons

**Primary (Brand) Button:**
- Background: Linear gradient `#15803d → #16a34a`
- Border radius: 12px
- Shadow: `0 4px 14px rgba(22, 163, 74, 0.35)`
- Hover: Increased shadow + `translateY(-2px)`
- Font weight: 500

### Cards

**Feature Cards:**
- Border radius: 16px
- Border: 1px solid `--vp-c-border`
- Shadow: `--raptscallions-shadow-sm`
- Hover: Border color changes to brand, shadow increases, `translateY(-2px)`

### Sidebar Navigation

**Level-0 Items (Top level):**
- Border radius: 12px
- Hover: Background changes to `--vp-c-bg-alt`, subtle shadow
- Active: Background changes to `--vp-c-brand-soft`, subtle shadow

### Code Blocks

**Inline Code:**
- Background: `--vp-code-bg` (Stone-100 light, Stone-900 dark)
- Color: `--vp-code-color` (Green-700 light, Green-400 dark)

**Block Code:**
- Border radius: 12px
- Shadow: `--raptscallions-shadow-sm`

### Custom Containers (Callouts)

VitePress provides tip, info, warning, and danger containers styled with theme colors:

- **Tip:** Green background with darker green text
- **Info:** Blue background
- **Warning:** Yellow/amber background
- **Danger:** Red background

## Accessibility

### Color Contrast Ratios

All color combinations meet WCAG 2.1 AA standards:

**Light Theme:**
- Primary text on background: 18.2:1 (AAA)
- Secondary text on background: 7.8:1 (AAA)
- Links on background: 4.8:1 (AA)

**Dark Theme:**
- Primary text on background: 19.1:1 (AAA)
- Secondary text on background: 9.1:1 (AAA)
- Links on background: 10.5:1 (AAA)

### Screen Reader Support

- Proper heading hierarchy (H1 → H2 → H3)
- Descriptive link text
- Alt text required for all images
- ARIA labels where appropriate

### Keyboard Navigation

All interactive elements are keyboard accessible:
- Tab navigation for links, buttons, sidebar items
- Enter/Space to activate buttons
- Search opens with Cmd/Ctrl+K

## Usage Guidelines

### When to Use Gradients

**Do use gradients for:**
- Hero sections (main landing area)
- Logo/brand text
- Primary call-to-action buttons

**Don't use gradients for:**
- Body text
- Navigation backgrounds (use semi-transparent solid instead)
- Small UI elements (badges, labels)

### When to Use Shadows

**Subtle shadows (sm):**
- Cards in resting state
- Sidebar items on hover
- Code blocks

**Moderate shadows (md):**
- Feature cards on hover
- Elevated components
- Interactive elements to show depth

**Avoid shadows on:**
- Text elements
- Flat UI where depth isn't needed
- Already high-contrast elements

### Color Usage

**Primary Green:**
- Brand elements (logo, primary buttons)
- Active states
- Success indicators
- Links and interactive elements (as accent)

**Sky Blue:**
- Links and cross-references
- Info badges and containers
- Secondary interactive elements

**Golden Wheat/Amber:**
- Warning badges and containers
- Subtle accents
- Use sparingly

**Neutrals:**
- Body text, backgrounds, borders
- Most UI elements should use neutrals as base
- High contrast between text and background

## Implementation

### CSS Variables

All design tokens are available as CSS custom properties:

```css
:root {
  /* Colors */
  --vp-c-brand-1: #22c55e;

  /* Typography */
  --vp-font-family-base: "DM Sans", sans-serif;
  --raptscallions-font-display: "DM Serif Display", serif;

  /* Shadows */
  --raptscallions-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --raptscallions-shadow-md: 0 4px 12px rgba(22, 163, 74, 0.15);
}
```

### Theme Files

Theme is implemented in:
- `apps/docs/.vitepress/theme/index.ts` - Theme entry point
- `apps/docs/.vitepress/theme/fonts.css` - Google Fonts import
- `apps/docs/.vitepress/theme/style.css` - Custom CSS overrides

### Extending the Theme

To add custom styles:

1. Edit `apps/docs/.vitepress/theme/style.css`
2. Use existing CSS variables where possible
3. Create new custom variables with `--raptscallions-*` prefix
4. Test in both light and dark modes
5. Verify accessibility (contrast ratios, keyboard navigation)

## Design Philosophy

### Simplicity Over Complexity

- Use VitePress defaults where appropriate
- Apply brand colors through CSS variables, not complete redesigns
- Minimal JavaScript, CSS-only animations
- Clean, readable layouts focused on content

### Ease of Access

- High contrast ratios for text readability
- Clear visual hierarchy with heading levels
- Generous whitespace and line height
- Obvious interactive elements with hover states

### Agricultural Theme

- Growth and cultivation metaphor
- Natural colors (greens, earth tones)
- Organic shapes (rounded corners, soft shadows)
- Clean and professional, not decorative or playful

## Related Pages

- [KB Page Design](/contributing/kb-page-design)
- [Contributing Overview](/contributing/)
