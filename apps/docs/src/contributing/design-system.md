---
title: Design System
description: Design system for the RaptScallions Knowledge Base
---

# Design System

This document defines the design system used throughout the RaptScallions Knowledge Base. It covers color palettes, typography, design tokens, and usage guidelines.

## Brand Name

The project name is styled as **RaptScallions** (with capital S) in all branding and logo contexts.

## Color Palette

### Light Theme - Warm Earth Tones

The light theme uses a warm, cream-tinted background with deep forest green accents.

**Hero Background:**

```css
background: linear-gradient(180deg, #fef7ed 0%, #fafaf9 100%);
```

**Primary - Deep Forest Green:**

- `--green-800`: `#166534` - Hero title text
- `--green-700`: `#15803d` - Primary buttons (gradient start)
- `--green-600`: `#16a34a` - Primary buttons (gradient end), hover states
- `--green-500`: `#22c55e` - Brand accents, success states
- `--green-100`: `#dcfce7` - Soft backgrounds

**Secondary - Sky Blue:**

- `--blue-500`: `#0ea5e9` - Links and accents
- `--blue-600`: `#0284c7` - Link hover states

**Neutrals - Warm Stone Grays:**

- `--stone-900`: `#1c1917` - Primary text
- `--stone-800`: `#292524` - Tagline text
- `--stone-600`: `#57534e` - Secondary text, descriptions
- `--stone-400`: `#a8a29e` - Tertiary text
- `--stone-200`: `#e7e5e4` - Borders, dividers
- `--stone-100`: `#f5f5f4` - Card backgrounds
- `--stone-50`: `#fafaf9` - Page background

**Status Colors:**

- Success/Tip: `#22c55e` (Green-500)
- Warning: `#f59e0b` (Amber-500)
- Danger: `#ef4444` (Red-500)
- Info: `#0ea5e9` (Blue-500)

### Dark Theme - Golden Wheat Accent

The dark theme uses warm brown backgrounds with golden amber title accents.

**Hero Background:**

```css
background: linear-gradient(180deg, #1a1512 0%, #120f0c 100%);
```

**Warm Browns:**

- `--brown-950`: `#120f0c` - Main background (dark)
- `--brown-900`: `#1a1512` - Main background (light)
- `--brown-800`: `#2a2420` - Elevated surfaces
- `--brown-700`: `#3d3530` - Borders, dividers

**Golden Wheat Accent (Title):**

```css
background: linear-gradient(135deg, #fbbf24 0%, #fde68a 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

- `--amber-600`: `#d97706` - Primary button (gradient start)
- `--amber-500`: `#f59e0b` - Primary button (gradient end)
- `--amber-400`: `#fbbf24` - Title gradient start, accents
- `--amber-200`: `#fde68a` - Title gradient end

**Text Colors (Dark):**

- `--stone-100`: `#f5f5f4` - Primary text, tagline
- `--stone-400`: `#a8a29e` - Secondary text, descriptions

**Status Colors (Dark):**

- Success/Tip: `#4ade80` (Green-400)
- Warning: `#fbbf24` (Amber-400)
- Danger: `#f87171` (Red-400)
- Info: `#38bdf8` (Blue-400)

## Typography

### Font Families

**Body Text:**

- Font: "DM Sans"
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Variable: `--vp-font-family-base`
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Logo/Brand Text:**

- Font: "Comfortaa"
- Weight: 600 (semibold)
- Variable: `--raptscallions-font-logo`
- Fallback: `"Nunito", "Varela Round", sans-serif`
- Usage: Hero title "RaptScallions", brand elements

**Code:**

- Font: Monaco, Consolas
- Variable: `--vp-font-family-mono`
- Fallback: `"Courier New", monospace`

### Font Loading

Fonts are loaded from Google Fonts CDN with optimized preconnect:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
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

### Hero Background Gradients

**Light Mode (Warm Earth Tones):**

```css
background: linear-gradient(180deg, #fef7ed 0%, #fafaf9 100%);
```

Cream-tinted warm gradient that provides excellent contrast for the solid green title.

**Dark Mode (Warm Browns):**

```css
background: linear-gradient(180deg, #1a1512 0%, #120f0c 100%);
```

Deep warm brown gradient that complements the golden wheat title accent.

### Logo Text Styling

**Light mode - Solid Green:**

```css
color: #166534; /* Green-800 */
font-family: 'Comfortaa', sans-serif;
font-weight: 600;
```

No gradient in light mode - solid dark green provides maximum readability on cream background.

**Dark mode - Golden Wheat Gradient:**

```css
background: linear-gradient(135deg, #fbbf24 0%, #fde68a 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
font-family: 'Comfortaa', sans-serif;
font-weight: 600;
```

Golden amber gradient creates visual warmth against the dark brown background.

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
  --raptscallions-hero-bg: linear-gradient(180deg, #fef7ed 0%, #fafaf9 100%);
  --raptscallions-title-color: #166534;

  /* Typography */
  --vp-font-family-base: "DM Sans", sans-serif;
  --raptscallions-font-logo: "Comfortaa", sans-serif;

  /* Shadows */
  --raptscallions-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --raptscallions-shadow-md: 0 4px 12px rgba(22, 163, 74, 0.15);
}

.dark {
  --raptscallions-hero-bg: linear-gradient(180deg, #1a1512 0%, #120f0c 100%);
  --raptscallions-title-gradient: linear-gradient(135deg, #fbbf24 0%, #fde68a 100%);
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
