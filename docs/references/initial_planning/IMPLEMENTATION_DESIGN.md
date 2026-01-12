# Raptscallions Component System: Implementation Design Guide

## Document Purpose

This document provides the architectural blueprint for building a theme-switchable component library for Raptscallions. It defines the shared component API, theme token structure, and implementation patterns without prescribing specific code.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Theme Token Architecture](#2-theme-token-architecture)
3. [Component Inventory](#3-component-inventory)
4. [Component Specifications](#4-component-specifications)
5. [Theme Variance Matrix](#5-theme-variance-matrix)
6. [Asset Management](#6-asset-management)
7. [Implementation Patterns](#7-implementation-patterns)
8. [Migration & Extensibility](#8-migration--extensibility)

---

## 1. Design Philosophy

### Core Principle

> **Components define structure and behavior. Themes define appearance and personality.**

Every component in the system should be fully functional regardless of which theme is active. The theme layer applies visual styling, but never alters component logic or data flow.

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPONENT LAYER                          │
│  • Props interface (what data it accepts)                   │
│  • State management (internal behavior)                     │
│  • Event handlers (user interactions)                       │
│  • Accessibility (ARIA, keyboard nav)                       │
│  • Children/slot composition                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      STYLING LAYER                           │
│  • Reads theme tokens from context                          │
│  • Applies conditional styles based on theme variant        │
│  • Handles responsive breakpoints                           │
│  • Manages CSS-in-JS or Tailwind classes                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       THEME LAYER                            │
│  • Token definitions (colors, spacing, typography)          │
│  • Feature flags (mascot, decorations, gamification)        │
│  • Asset references (fonts, illustrations)                  │
│  • Motion preferences (bounce, wiggle)                      │
└─────────────────────────────────────────────────────────────┘
```

### Design Goals

| Goal                     | Description                                       |
| ------------------------ | ------------------------------------------------- |
| **Theme Parity**         | Both themes support identical functionality       |
| **Runtime Switching**    | Themes can be changed without page reload         |
| **Graceful Degradation** | Theme-specific features (mascot) degrade silently |
| **Accessibility First**  | WCAG AA compliance regardless of theme            |
| **Performance**          | Theme switching should not cause layout shift     |
| **Extensibility**        | Third parties can create custom themes            |

---

## 2. Theme Token Architecture

### Token Categories

Tokens are organized into semantic categories that both themes must implement.

#### 2.1 Color Tokens

```
colors/
├── primary/          # Brand color scale (50-900)
├── secondary/        # Supporting color scale
├── accent/           # Highlight/CTA color scale
├── neutral/          # Gray scale for text, borders
├── semantic/
│   ├── success       # Positive actions, completion
│   ├── warning       # Caution states
│   ├── error         # Error states
│   └── info          # Informational states
├── background/
│   ├── base          # Page background
│   ├── subtle        # Card backgrounds
│   └── muted         # Disabled/inactive areas
└── extended/         # Theme-specific (optional)
    ├── earth         # Option A: soil tones
    ├── sky           # Option A: atmosphere
    └── cream         # Option A: parchment
```

#### Color Comparison

| Token             | Option A (Garden)      | Option B (Modern)         |
| ----------------- | ---------------------- | ------------------------- |
| `primary.500`     | `#6b8f4e` (Warm sage)  | `#22c55e` (Vibrant green) |
| `secondary.400`   | `#ffda03` (Sunflower)  | `#38bdf8` (Sky blue)      |
| `accent.400`      | `#ff6347` (Tomato)     | `#fbbf24` (Golden wheat)  |
| `neutral.100`     | `#f8f6f1` (Warm cream) | `#f5f5f4` (Cool stone)    |
| `background.base` | `#fff8dc` (Cream)      | `#fafaf9` (Off-white)     |

#### 2.2 Typography Tokens

```
typography/
├── fontFamily/
│   ├── display       # Headings, buttons, emphasis
│   ├── body          # Body text, inputs, labels
│   └── mono          # Code blocks (optional)
├── fontSize/         # Scale from xs (12px) to 5xl (48px)
├── fontWeight/       # normal, medium, semibold, bold
└── lineHeight/       # tight, normal, relaxed
```

| Token                | Option A (Garden) | Option B (Modern)     |
| -------------------- | ----------------- | --------------------- |
| `fontFamily.display` | Fredoka           | DM Serif Display      |
| `fontFamily.body`    | Nunito            | DM Sans               |
| Character            | Rounded, playful  | Elegant, professional |

#### 2.3 Spacing & Layout Tokens

```
spacing/              # Consistent scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
layout/
├── sidebarWidth      # 288px (A) / 256px (B)
├── headerHeight      # 80px (A) / 64px (B)
├── maxContentWidth   # 1280px (both)
└── containerPadding  # 24px (both)
```

#### 2.4 Border Tokens

```
borders/
├── width/
│   ├── thin          # 2px (A) / 1px (B)
│   ├── medium        # 3px (A) / 2px (B)
│   └── thick         # 4px (A) / 3px (B)
└── radius/
    ├── sm            # 12px (A) / 8px (B)
    ├── md            # 16px (A) / 12px (B)
    ├── lg            # 20px (A) / 16px (B)
    ├── xl            # 24px (A) / 20px (B)
    ├── 2xl           # 32px (A) / 24px (B)
    └── full          # 9999px (both)
```

**Key Insight:** Option A uses larger radii and thicker borders for a "softer," more tactile feel. Option B uses tighter values for precision.

#### 2.5 Shadow Tokens

```
shadows/
├── style             # 'hard' (A) / 'soft' (B)
├── sm                # Subtle elevation
├── md                # Card elevation
├── lg                # Modal/dropdown elevation
├── xl                # Popover elevation
└── button            # Interactive element shadow
```

**Shadow Style Comparison:**

| Style     | Option A (Hard)         | Option B (Soft)        |
| --------- | ----------------------- | ---------------------- |
| Technique | Solid offset, no blur   | Blur with transparency |
| Button    | `0 4px 0 {darkerColor}` | `0 4px 14px rgba(...)` |
| Card      | `0 4px 0 {borderColor}` | `0 1px 3px rgba(...)`  |
| Feel      | Tactile, game-like      | Floating, modern       |

#### 2.6 Motion Tokens

```
motion/
├── duration/
│   ├── fast          # 150ms (A) / 100ms (B)
│   ├── normal        # 250ms (A) / 200ms (B)
│   └── slow          # 350ms (A) / 300ms (B)
├── easing/
│   ├── default       # cubic-bezier (A) / ease-out (B)
│   └── bounce        # Option A only
└── flags/
    ├── enableBounce  # true (A) / false (B)
    └── enableWiggle  # true (A) / false (B)
```

#### 2.7 Feature Flags

```
features/
├── mascot            # Show Sprout character
├── illustrations     # Show decorative illustrations
├── decorativeElements # Clouds, sun, grass borders
├── gamification      # Plant progress, vegetable badges
├── showEmoji         # Emoji in nav, headers, badges
└── seasonalThemes    # Holiday/seasonal variations
```

| Flag                 | Option A | Option B |
| -------------------- | -------- | -------- |
| `mascot`             | ✅       | ❌       |
| `illustrations`      | ✅       | ❌       |
| `decorativeElements` | ✅       | ❌       |
| `gamification`       | ✅       | ❌       |
| `showEmoji`          | ✅       | ❌       |

---

## 3. Component Inventory

### Complete Component List

Components are organized by category and tagged with their theme variance level.

#### Core Components (Primitives)

| Component    | Purpose                     | Theme Variance |
| ------------ | --------------------------- | -------------- |
| `Button`     | Primary interaction element | 🔴 High        |
| `IconButton` | Icon-only button            | 🟡 Medium      |
| `Card`       | Content container           | 🔴 High        |
| `Badge`      | Status/category label       | 🟡 Medium      |
| `Input`      | Text input field            | 🟡 Medium      |
| `Textarea`   | Multi-line input            | 🟡 Medium      |
| `Select`     | Dropdown selection          | 🟡 Medium      |
| `Checkbox`   | Boolean toggle              | 🟡 Medium      |
| `Radio`      | Single selection            | 🟡 Medium      |
| `Switch`     | On/off toggle               | 🟡 Medium      |
| `Avatar`     | User representation         | 🟡 Medium      |
| `Tooltip`    | Contextual hint             | 🟢 Low         |

#### Layout Components

| Component    | Purpose              | Theme Variance |
| ------------ | -------------------- | -------------- |
| `AppShell`   | Main app structure   | 🔴 High        |
| `Sidebar`    | Navigation container | 🔴 High        |
| `TopBar`     | Header bar           | 🔴 High        |
| `PageHeader` | Page title section   | 🟡 Medium      |
| `Container`  | Max-width wrapper    | 🟢 Low         |
| `Grid`       | Responsive grid      | 🟢 None        |
| `Stack`      | Flex layout helper   | 🟢 None        |
| `Divider`    | Visual separator     | 🟢 Low         |

#### Data Display Components

| Component      | Purpose             | Theme Variance |
| -------------- | ------------------- | -------------- |
| `StatCard`     | Metric display      | 🔴 High        |
| `DataTable`    | Tabular data        | 🟡 Medium      |
| `List`         | Vertical item list  | 🟢 Low         |
| `ListItem`     | Single list entry   | 🟡 Medium      |
| `ActivityFeed` | Event timeline      | 🟡 Medium      |
| `EmptyState`   | No data placeholder | 🔴 High        |

#### Progress & Status Components

| Component       | Purpose               | Theme Variance    |
| --------------- | --------------------- | ----------------- |
| `Progress`      | Progress indicator    | 🔴 High           |
| `ProgressBar`   | Linear progress       | 🟡 Medium         |
| `ProgressRing`  | Circular progress     | 🟡 Medium         |
| `ProgressPlant` | Plant growth (A only) | 🔴 Theme-specific |
| `Spinner`       | Loading indicator     | 🟡 Medium         |
| `Skeleton`      | Content placeholder   | 🟢 Low            |

#### Feedback Components

| Component | Purpose                | Theme Variance |
| --------- | ---------------------- | -------------- |
| `Toast`   | Temporary notification | 🟡 Medium      |
| `Alert`   | Inline message         | 🟡 Medium      |
| `Modal`   | Dialog overlay         | 🟡 Medium      |
| `Drawer`  | Slide-in panel         | 🟡 Medium      |
| `Popover` | Contextual popup       | 🟢 Low         |

#### Navigation Components

| Component     | Purpose          | Theme Variance |
| ------------- | ---------------- | -------------- |
| `NavItem`     | Sidebar nav link | 🔴 High        |
| `Breadcrumbs` | Path navigation  | 🟢 Low         |
| `Tabs`        | Tab navigation   | 🟡 Medium      |
| `Pagination`  | Page navigation  | 🟢 Low         |

#### Theme-Specific Components (Option A only)

| Component        | Purpose             | Fallback (Option B) |
| ---------------- | ------------------- | ------------------- |
| `Mascot`         | Sprout character    | `null` (hidden)     |
| `Decoration`     | Clouds, sun, grass  | `null` (hidden)     |
| `ProgressPlant`  | Plant growth stages | `ProgressRing`      |
| `RewardBadge`    | Vegetable rewards   | `Badge`             |
| `HarvestCounter` | Points display      | `StatCard`          |

---

## 4. Component Specifications

### 4.1 Button

**Purpose:** Primary interactive element for actions.

**Props Interface:**

| Prop           | Type                                                          | Default     | Description          |
| -------------- | ------------------------------------------------------------- | ----------- | -------------------- |
| `variant`      | `'primary' \| 'secondary' \| 'accent' \| 'ghost' \| 'danger'` | `'primary'` | Visual style         |
| `size`         | `'sm' \| 'md' \| 'lg'`                                        | `'md'`      | Size preset          |
| `icon`         | `IconComponent`                                               | —           | Leading icon         |
| `iconPosition` | `'left' \| 'right'`                                           | `'left'`    | Icon placement       |
| `loading`      | `boolean`                                                     | `false`     | Show spinner         |
| `disabled`     | `boolean`                                                     | `false`     | Disable interactions |
| `fullWidth`    | `boolean`                                                     | `false`     | Fill container       |
| `children`     | `ReactNode`                                                   | —           | Button label         |

**Theme Variance:**

| Property         | Option A (Garden)        | Option B (Modern)      |
| ---------------- | ------------------------ | ---------------------- |
| Border radius    | `xl` (24px)              | `lg` (16px)            |
| Border           | 3px solid (darker shade) | None                   |
| Shadow           | Hard offset (0 4px 0)    | Soft blur (0 4px 14px) |
| Hover transform  | translateY(-2px) + scale | translateY(-1px)       |
| Active transform | translateY(0)            | translateY(0)          |
| Font family      | Display (Fredoka)        | Display (DM Serif)     |
| Font weight      | Bold (700)               | Semibold (600)         |

**Accessibility:**

- Focus visible ring (2px offset)
- `aria-disabled` when loading
- `aria-busy` when loading
- Keyboard: Enter/Space to activate

---

### 4.2 Card

**Purpose:** Container for grouped content.

**Props Interface:**

| Prop        | Type                                                | Default     | Description         |
| ----------- | --------------------------------------------------- | ----------- | ------------------- |
| `variant`   | `'default' \| 'elevated' \| 'outlined' \| 'filled'` | `'default'` | Visual style        |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                    | `'md'`      | Internal padding    |
| `hoverable` | `boolean`                                           | `false`     | Enable hover state  |
| `clickable` | `boolean`                                           | `false`     | Show pointer cursor |
| `children`  | `ReactNode`                                         | —           | Card content        |

**Sub-components:**

- `Card.Header` — Title row with optional action slot
- `Card.Body` — Main content area
- `Card.Footer` — Bottom action area

**Theme Variance:**

| Property         | Option A (Garden)          | Option B (Modern)     |
| ---------------- | -------------------------- | --------------------- |
| Border radius    | `2xl` (32px)               | `xl` (20px)           |
| Border           | 3px solid neutral.200      | 1px solid neutral.200 |
| Shadow (default) | 0 4px 0 neutral.200        | 0 1px 3px rgba        |
| Shadow (hover)   | 0 6px 0 + translateY(-2px) | 0 10px 15px           |
| Background       | White or gradient          | White                 |

---

### 4.3 Progress

**Purpose:** Visual indicator of completion or progress.

**Props Interface:**

| Prop        | Type                         | Default | Description     |
| ----------- | ---------------------------- | ------- | --------------- |
| `value`     | `number`                     | `0`     | Progress 0-100  |
| `variant`   | `'bar' \| 'ring' \| 'plant'` | `'bar'` | Display type    |
| `size`      | `'sm' \| 'md' \| 'lg'`       | `'md'`  | Size preset     |
| `showLabel` | `boolean`                    | `false` | Show percentage |
| `color`     | `string`                     | —       | Override color  |

**Theme Variance:**

| Property      | Option A (Garden)     | Option B (Modern)  |
| ------------- | --------------------- | ------------------ |
| Bar height    | 12px                  | 6px                |
| Bar radius    | Full                  | Full               |
| Ring stroke   | 8px                   | 4px                |
| Plant variant | ✅ Shows emoji stages | Falls back to ring |
| Animation     | Bouncy ease           | Smooth ease        |

**Plant Stages (Option A):**

| Progress | Emoji | Label      |
| -------- | ----- | ---------- |
| 0-24%    | 🌱    | Seed       |
| 25-49%   | 🌿    | Sprout     |
| 50-74%   | 🪴    | Growing    |
| 75-99%   | 🌻    | Blooming   |
| 100%     | 🌳    | Flourished |

---

### 4.4 StatCard

**Purpose:** Display a key metric with optional trend.

**Props Interface:**

| Prop       | Type                                           | Default | Description      |
| ---------- | ---------------------------------------------- | ------- | ---------------- |
| `label`    | `string`                                       | —       | Metric name      |
| `value`    | `string \| number`                             | —       | Metric value     |
| `icon`     | `IconComponent`                                | —       | Lucide icon      |
| `emoji`    | `string`                                       | —       | Emoji (Option A) |
| `trend`    | `{ value: number, direction: 'up' \| 'down' }` | —       | Change indicator |
| `sublabel` | `string`                                       | —       | Secondary text   |

**Theme Variance:**

| Property        | Option A (Garden)         | Option B (Modern)      |
| --------------- | ------------------------- | ---------------------- |
| Icon display    | Emoji preferred           | Lucide icon            |
| Icon container  | Large (64px), colorful bg | Small (40px), muted bg |
| Value font size | 3xl                       | 2xl                    |
| Trend style     | Playful badge             | Minimal inline         |
| Sublabel        | Encouraging ("Great!")    | Neutral                |

---

### 4.5 Sidebar / NavItem

**Purpose:** Primary navigation structure.

**NavItem Props:**

| Prop     | Type               | Default | Description        |
| -------- | ------------------ | ------- | ------------------ |
| `label`  | `string`           | —       | Nav item text      |
| `icon`   | `IconComponent`    | —       | Lucide icon        |
| `emoji`  | `string`           | —       | Emoji (Option A)   |
| `href`   | `string`           | —       | Link destination   |
| `active` | `boolean`          | `false` | Currently selected |
| `badge`  | `string \| number` | —       | Notification count |

**Theme Variance:**

| Property            | Option A (Garden)            | Option B (Modern)        |
| ------------------- | ---------------------------- | ------------------------ |
| Icon display        | Emoji (🏡, 🛠️)               | Lucide icon              |
| Active state        | Gradient bg + shadow lift    | White bg + subtle shadow |
| Active indicator    | None (bg is indicator)       | Dot on right side        |
| Font                | Display (Fredoka)            | Body (DM Sans)           |
| Sidebar decorations | Grass border, harvest widget | None                     |

---

## 5. Theme Variance Matrix

### Visual Summary

```
                    VARIANCE LEVEL
Component           None    Low    Medium    High
─────────────────────────────────────────────────
Grid                 ●
Stack                ●
Container                    ●
Divider                      ●
Tooltip                      ●
Skeleton                     ●
Breadcrumbs                  ●
Badge                               ●
Input                               ●
Avatar                              ●
ListItem                            ●
Toast                               ●
Modal                               ●
Tabs                                ●
Button                                        ●
Card                                          ●
Progress                                      ●
StatCard                                      ●
Sidebar                                       ●
TopBar                                        ●
EmptyState                                    ●
AppShell                                      ●
```

### Variance Definitions

| Level      | Description                   | Example Changes                        |
| ---------- | ----------------------------- | -------------------------------------- |
| **None**   | Purely structural             | Grid columns, Stack direction          |
| **Low**    | Minor token differences       | Separator color, tooltip bg            |
| **Medium** | Notable visual differences    | Border width, radius, shadows          |
| **High**   | Significant personality shift | Emoji vs icon, decorations, animations |

---

## 6. Asset Management

### 6.1 Font Loading Strategy

Each theme declares required fonts. The theme provider handles loading.

| Theme  | Display Font     | Body Font | Source       |
| ------ | ---------------- | --------- | ------------ |
| Garden | Fredoka          | Nunito    | Google Fonts |
| Modern | DM Serif Display | DM Sans   | Google Fonts |

**Loading Approach:**

1. Theme provider detects active theme
2. Injects appropriate `<link>` tag
3. Uses `font-display: swap` for performance
4. Falls back to system fonts during load

### 6.2 Icon Strategy

Both themes use **Lucide React** as the icon library. However, Option A may substitute emojis in certain contexts.

**Decision Logic:**

```
if (theme.features.showEmoji && emoji prop provided) {
  render emoji
} else {
  render Lucide icon
}
```

**Emoji Mapping (Option A):**

| Context      | Emoji | Lucide Fallback |
| ------------ | ----- | --------------- |
| Dashboard    | 🏡    | Home            |
| Classes      | 🎒    | Users           |
| Tools        | 🛠️    | Layers          |
| Assignments  | 📋    | BookOpen        |
| Chat         | 💬    | MessageSquare   |
| Achievements | 🏆    | Award           |
| Success      | ✅    | CheckCircle     |
| Warning      | ⚠️    | AlertTriangle   |

### 6.3 Illustration Assets (Option A only)

| Asset           | Usage                             | Format              |
| --------------- | --------------------------------- | ------------------- |
| Mascot (Sprout) | Welcome areas, empty states, chat | SVG/React component |
| Sun             | Top bar decoration                | SVG                 |
| Clouds          | Background decoration             | SVG                 |
| Grass           | Footer/border decoration          | SVG                 |
| Plant stages    | Progress indicator                | Emoji               |
| Vegetables      | Reward badges                     | Emoji               |

**Conditional Rendering:**

```
<Decoration type="sun" />
// Renders in Option A, returns null in Option B
```

### 6.4 Theme-Specific Widgets

| Widget          | Option A                      | Option B              |
| --------------- | ----------------------------- | --------------------- |
| Harvest Counter | Points + vegetable collection | Hidden or simple stat |
| Weather Widget  | "Perfect growing day!"        | Hidden                |
| Level Indicator | "Level 12 Gardener 🌟"        | Role text only        |
| Progress Plants | Emoji growth stages           | Circular progress     |

---

## 7. Implementation Patterns

### 7.1 Theme Context Pattern

The theme system uses React Context to provide tokens globally.

```
ThemeProvider
├── Provides: theme tokens, feature flags
├── Handles: font loading, CSS variable injection
└── Children: entire app tree
```

**Consumer Patterns:**

1. `useTheme()` hook — access full theme object
2. `useThemeVariant()` hook — get 'garden' | 'modern'
3. `useFeature(flag)` hook — check specific feature

### 7.2 Conditional Feature Pattern

Theme-specific features should degrade gracefully.

**Pattern:**

```
const Mascot = (props) => {
  const { features } = useTheme();
  if (!features.mascot) return null;
  return <MascotImplementation {...props} />;
};
```

**Fallback Pattern:**

```
const ProgressIndicator = ({ variant, ...props }) => {
  const { features } = useTheme();

  if (variant === 'plant' && !features.gamification) {
    variant = 'ring'; // Fallback
  }

  return <ProgressImplementation variant={variant} {...props} />;
};
```

### 7.3 Style Composition Pattern

Components compute styles based on theme tokens.

**Approach Options:**

| Method              | Pros                | Cons                    |
| ------------------- | ------------------- | ----------------------- |
| CSS Variables       | Native, performant  | Limited logic           |
| Tailwind + variants | Familiar, optimized | Class string complexity |
| CSS-in-JS (styled)  | Full JS power       | Runtime cost            |
| Style objects       | Simple, portable    | No pseudo-classes       |

**Recommended:** Tailwind with CSS variables for tokens, with escape hatches to style objects for complex computed values.

### 7.4 Component Slot Pattern

Complex components expose slots for customization.

**Example: Card**

```
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Action><Button>Edit</Button></Card.Action>
  </Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

This allows theme styling at each slot level without changing structure.

---

## 8. Migration & Extensibility

### 8.1 Adding a New Theme

To create a new theme (e.g., "Rustic" or "Science"):

1. **Define token file** implementing full token interface
2. **Set feature flags** for optional features
3. **Provide font references**
4. **Create any theme-specific assets** (optional)
5. **Register theme** in theme registry

**Minimum Required:**

- All color scales (primary, secondary, accent, neutral)
- Typography (display + body fonts)
- Border definitions
- Shadow definitions
- Feature flags (all false for minimal theme)

### 8.2 Theme Intensity Levels

Themes can support intensity variants:

| Intensity  | Description           | Features Enabled  |
| ---------- | --------------------- | ----------------- |
| `minimal`  | Professional, subdued | None              |
| `moderate` | Balanced              | Emoji, some color |
| `full`     | Maximum expression    | All features      |

**Implementation:**

```
<ThemeProvider theme="garden" intensity="moderate">
```

This allows a single theme to scale from "professional elementary" to "full playful."

### 8.3 Runtime Theme Switching

Themes can be switched at runtime without page reload.

**Requirements:**

- CSS variables for all color references
- Font preloading for both themes (optional, improves UX)
- State management for active theme
- Smooth transition (opacity fade recommended)

### 8.4 White-Labeling Support

Districts may want custom themes. The system supports:

1. **Token overrides** — Change colors, fonts only
2. **Feature flag overrides** — Enable/disable features
3. **Asset replacement** — Custom logos, mascots
4. **Full custom themes** — Complete token sets

**Hierarchy:**

```
Base Theme (Garden/Modern)
  └── District Overrides
      └── School Overrides
          └── Class Overrides
```

This aligns with the existing Raptscallions theme configuration system.

---

## Summary

### Key Decisions

| Decision          | Choice                  | Rationale                        |
| ----------------- | ----------------------- | -------------------------------- |
| Token structure   | Semantic categories     | Maintainability, clarity         |
| Shadow approach   | Hard (A) vs Soft (B)    | Defines tactile vs floating feel |
| Icon strategy     | Emoji (A) vs Lucide (B) | Personality expression           |
| Feature flags     | Boolean toggles         | Simple conditional rendering     |
| Fallback behavior | Graceful degradation    | Never break on missing feature   |

### Implementation Priority

1. **Phase 1:** Theme token system + provider
2. **Phase 2:** Core components (Button, Card, Input, Badge)
3. **Phase 3:** Layout components (AppShell, Sidebar, TopBar)
4. **Phase 4:** Data components (StatCard, Progress, List)
5. **Phase 5:** Theme-specific assets (Mascot, Decorations)
6. **Phase 6:** Documentation + Storybook

### Success Criteria

- [ ] All components render correctly in both themes
- [ ] Theme switch completes in <100ms
- [ ] No layout shift during theme change
- [ ] WCAG AA compliance in both themes
- [ ] Feature flags correctly hide/show elements
- [ ] Third-party themes can be loaded

---

_Document Version: 1.0_
_Status: Implementation Design_
_Next: Component Development_
