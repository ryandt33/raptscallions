# RaptScallions Component Architecture

## Core Principle

**One component library, infinite theme expressions.**

Components define _structure and behavior_. Themes define _appearance and personality_.

---

## Table of Contents

1. [Design Token Structure](#1-design-token-structure)
2. [Core Components](#2-core-components)
3. [Layout Components](#3-layout-components)
4. [Data Display Components](#4-data-display-components)
5. [Navigation Components](#5-navigation-components)
6. [Feedback Components](#6-feedback-components)
7. [Theme-Specific Assets](#7-theme-specific-assets)
8. [Component API Reference](#8-component-api-reference)

---

## 1. Design Token Structure

Both themes implement the same token interface. The theme provider swaps values.

```typescript
interface ThemeTokens {
  // ============================================
  // COLORS
  // ============================================
  colors: {
    // Brand colors (required)
    primary: ColorScale; // Main brand color (greens)
    secondary: ColorScale; // Supporting color
    accent: ColorScale; // Highlight/CTA color

    // Semantic colors (required)
    success: string;
    warning: string;
    error: string;
    info: string;

    // Neutrals (required)
    neutral: ColorScale;

    // Background (required)
    background: {
      base: string; // Page background
      subtle: string; // Card backgrounds
      muted: string; // Disabled states
    };

    // Theme-specific (optional)
    extended?: {
      earth?: ColorScale; // Option A: soil, roots
      sky?: ColorScale; // Option A: clouds, atmosphere
      cream?: string; // Option A: parchment feel
    };
  };

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    fontFamily: {
      display: string; // Headings, buttons, emphasis
      body: string; // Body text, inputs
      mono?: string; // Code blocks (optional)
    };

    fontSize: {
      xs: string; // 12px
      sm: string; // 14px
      base: string; // 16px
      lg: string; // 18px
      xl: string; // 20px
      "2xl": string; // 24px
      "3xl": string; // 30px
      "4xl": string; // 36px
      "5xl": string; // 48px
    };

    fontWeight: {
      normal: number; // 400
      medium: number; // 500
      semibold: number; // 600
      bold: number; // 700
    };

    lineHeight: {
      tight: number; // 1.25
      normal: number; // 1.5
      relaxed: number; // 1.75
    };
  };

  // ============================================
  // SPACING & SIZING
  // ============================================
  spacing: {
    px: string;
    0.5: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    8: string;
    10: string;
    12: string;
    16: string;
    20: string;
    24: string;
  };

  // ============================================
  // BORDERS & RADIUS
  // ============================================
  borders: {
    width: {
      none: string;
      thin: string; // 1px (B) / 2px (A)
      medium: string; // 2px (B) / 3px (A)
      thick: string; // 3px (B) / 4px (A)
    };

    radius: {
      none: string;
      sm: string; // 4px (B) / 8px (A)
      md: string; // 8px (B) / 12px (A)
      lg: string; // 12px (B) / 16px (A)
      xl: string; // 16px (B) / 24px (A)
      "2xl": string; // 20px (B) / 32px (A)
      full: string; // 9999px
    };
  };

  // ============================================
  // SHADOWS & EFFECTS
  // ============================================
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;

    // Theme-specific shadow style
    style: "soft" | "hard"; // B: soft (blur) / A: hard (offset)

    // For "bouncy" button effect (Option A)
    button?: string;
  };

  // ============================================
  // MOTION & ANIMATION
  // ============================================
  motion: {
    duration: {
      fast: string; // 100ms
      normal: string; // 200ms
      slow: string; // 300ms
    };

    easing: {
      default: string;
      bounce?: string; // Option A only
    };

    // Theme personality
    enableBounce: boolean; // Buttons bounce on hover (A: true, B: false)
    enableWiggle: boolean; // Idle animations (A: true, B: false)
  };

  // ============================================
  // THEME METADATA
  // ============================================
  meta: {
    name: string;
    variant: "garden" | "modern" | "custom";
    intensity: "minimal" | "moderate" | "full";

    // Feature flags
    features: {
      mascot: boolean;
      illustrations: boolean;
      decorativeElements: boolean;
      gamification: boolean;
      seasonalThemes: boolean;
    };
  };
}

// Color scale type (50-900)
interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}
```

---

## 2. Core Components

### 2.1 Button

**Structure:** Clickable element with optional icon, loading state, and variants.

| Prop           | Type                                                          | Description           |
| -------------- | ------------------------------------------------------------- | --------------------- |
| `variant`      | `'primary' \| 'secondary' \| 'accent' \| 'ghost' \| 'danger'` | Visual style          |
| `size`         | `'sm' \| 'md' \| 'lg'`                                        | Size preset           |
| `icon`         | `LucideIcon`                                                  | Optional leading icon |
| `iconPosition` | `'left' \| 'right'`                                           | Icon placement        |
| `loading`      | `boolean`                                                     | Show loading spinner  |
| `disabled`     | `boolean`                                                     | Disabled state        |
| `fullWidth`    | `boolean`                                                     | Fill container width  |

**Theme Variations:**

| Property       | Option A (Garden)       | Option B (Modern)        |
| -------------- | ----------------------- | ------------------------ |
| Border radius  | `2xl` (24px)            | `xl` (16px)              |
| Border width   | `3px`                   | `0` or `2px`             |
| Shadow         | Hard offset (`0 4px 0`) | Soft blur (`0 4px 14px`) |
| Hover effect   | Translate Y + bounce    | Subtle lift              |
| Font           | Display (Fredoka)       | Display (DM Serif)       |
| Text transform | None                    | None                     |

```tsx
// Component (theme-agnostic)
interface ButtonProps {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Theme styling applied via:
// - CSS variables
// - Tailwind classes with theme prefixes
// - Style objects from theme context
```

---

### 2.2 Card

**Structure:** Container with optional header, body, and footer sections.

| Prop        | Type                                                | Description          |
| ----------- | --------------------------------------------------- | -------------------- |
| `variant`   | `'default' \| 'elevated' \| 'outlined' \| 'filled'` | Visual style         |
| `hoverable` | `boolean`                                           | Enable hover effects |
| `clickable` | `boolean`                                           | Show pointer cursor  |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                    | Internal padding     |

**Theme Variations:**

| Property      | Option A (Garden) | Option B (Modern) |
| ------------- | ----------------- | ----------------- |
| Border radius | `3xl` (32px)      | `2xl` (20px)      |
| Border        | `3px solid`       | `1px solid`       |
| Shadow        | Hard offset       | Soft subtle       |
| Hover         | Scale up          | Shadow increase   |
| Background    | Gradient options  | Solid white       |

**Sub-components:**

- `Card.Header` — Title area with optional action
- `Card.Body` — Main content area
- `Card.Footer` — Actions or metadata

---

### 2.3 Badge

**Structure:** Inline label for status, categories, or counts.

| Prop      | Type                                                        | Description           |
| --------- | ----------------------------------------------------------- | --------------------- |
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | Color scheme          |
| `size`    | `'sm' \| 'md'`                                              | Size preset           |
| `icon`    | `LucideIcon`                                                | Optional leading icon |
| `dot`     | `boolean`                                                   | Show status dot       |

**Theme Variations:**

| Property      | Option A (Garden) | Option B (Modern) |
| ------------- | ----------------- | ----------------- |
| Border radius | `full`            | `full`            |
| Border        | `2px solid`       | `0`               |
| Font          | Display (bold)    | Body (medium)     |
| Padding       | More generous     | Compact           |

---

### 2.4 Input

**Structure:** Text input with label, helper text, and validation states.

| Prop          | Type         | Description          |
| ------------- | ------------ | -------------------- |
| `label`       | `string`     | Field label          |
| `placeholder` | `string`     | Placeholder text     |
| `helperText`  | `string`     | Helper/error message |
| `error`       | `boolean`    | Error state          |
| `disabled`    | `boolean`    | Disabled state       |
| `icon`        | `LucideIcon` | Leading icon         |

**Theme Variations:**

| Property      | Option A (Garden) | Option B (Modern) |
| ------------- | ----------------- | ----------------- |
| Border radius | `2xl`             | `xl`              |
| Border width  | `3px`             | `1px`             |
| Focus ring    | Thick, colorful   | Thin, subtle      |
| Background    | White             | White/transparent |

---

### 2.5 Avatar

**Structure:** User representation with image, initials, or icon fallback.

| Prop     | Type                              | Description           |
| -------- | --------------------------------- | --------------------- |
| `src`    | `string`                          | Image URL             |
| `name`   | `string`                          | For initials fallback |
| `size`   | `'sm' \| 'md' \| 'lg' \| 'xl'`    | Size preset           |
| `shape`  | `'circle' \| 'rounded'`           | Shape variant         |
| `status` | `'online' \| 'offline' \| 'busy'` | Status indicator      |

**Theme Variations:**

| Property      | Option A (Garden) | Option B (Modern)   |
| ------------- | ----------------- | ------------------- |
| Border        | `3px solid`       | `2px solid` or none |
| Shape default | `rounded` (2xl)   | `circle`            |
| Status dot    | Larger, bordered  | Small, subtle       |

---

### 2.6 Progress

**Structure:** Visual progress indicator (linear or circular).

| Prop        | Type                                | Description     |
| ----------- | ----------------------------------- | --------------- |
| `value`     | `number`                            | Progress 0-100  |
| `variant`   | `'linear' \| 'circular' \| 'plant'` | Display type    |
| `size`      | `'sm' \| 'md' \| 'lg'`              | Size preset     |
| `showLabel` | `boolean`                           | Show percentage |
| `color`     | `string`                            | Override color  |

**Theme Variations:**

| Property        | Option A (Garden)     | Option B (Modern)         |
| --------------- | --------------------- | ------------------------- |
| Linear height   | `12px`                | `6px`                     |
| Circular stroke | `8px`                 | `4px`                     |
| Plant variant   | ✅ Shows emoji stages | ❌ Falls back to circular |
| Animation       | Bouncy fill           | Smooth ease               |

**Plant Stages (Option A only):**

```
0-24%   → 🌱 Seed
25-49%  → 🌿 Sprout
50-74%  → 🪴 Growing
75-99%  → 🌻 Blooming
100%    → 🌳 Flourished
```

---

## 3. Layout Components

### 3.1 AppShell

**Structure:** Main application layout with sidebar, header, and content area.

```tsx
interface AppShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}
```

**Sub-components:**

- `AppShell.Sidebar` — Fixed left navigation
- `AppShell.Header` — Top bar with actions
- `AppShell.Content` — Main scrollable area

**Theme Variations:**

| Property      | Option A (Garden)      | Option B (Modern) |
| ------------- | ---------------------- | ----------------- |
| Sidebar width | `288px` (72)           | `256px` (64)      |
| Sidebar bg    | Gradient + decorations | Subtle gradient   |
| Header height | `80px`                 | `64px`            |
| Content bg    | Sky gradient           | Neutral gray      |
| Decorations   | Grass, clouds, sun     | None              |

---

### 3.2 PageHeader

**Structure:** Page title with optional subtitle, breadcrumbs, and actions.

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string; // Option A shows, Option B hides
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}
```

---

### 3.3 Grid

**Structure:** Responsive grid layout system.

```tsx
interface GridProps {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: "sm" | "md" | "lg";
  children: React.ReactNode;
}
```

_(No theme variation — purely structural)_

---

### 3.4 Stack

**Structure:** Vertical or horizontal flex layout.

```tsx
interface StackProps {
  direction?: "horizontal" | "vertical";
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  children: React.ReactNode;
}
```

_(No theme variation — purely structural)_

---

## 4. Data Display Components

### 4.1 StatCard

**Structure:** Metric display with label, value, and optional trend.

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  emoji?: string; // Option A: shown, Option B: hidden
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  sublabel?: string;
}
```

**Theme Variations:**

| Property       | Option A (Garden) | Option B (Modern) |
| -------------- | ----------------- | ----------------- |
| Icon display   | Emoji preferred   | Lucide icon       |
| Icon container | Large, colorful   | Small, muted      |
| Value font     | Display, larger   | Display, standard |
| Trend badge    | Playful           | Minimal           |

---

### 4.2 DataTable

**Structure:** Tabular data display with sorting, filtering, and pagination.

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortable?: boolean;
  filterable?: boolean;
  pagination?: PaginationConfig;
  emptyState?: React.ReactNode;
}
```

**Theme Variations:**

| Property  | Option A (Garden) | Option B (Modern) |
| --------- | ----------------- | ----------------- |
| Header bg | Primary light     | Neutral light     |
| Row hover | Warm highlight    | Cool highlight    |
| Borders   | Rounded, thick    | Sharp, thin       |

---

### 4.3 List / ListItem

**Structure:** Vertical list of items with optional icons, actions, and metadata.

```tsx
interface ListItemProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}
```

---

### 4.4 ActivityFeed

**Structure:** Chronological list of events/activities.

```tsx
interface ActivityItem {
  id: string;
  emoji?: string;
  icon?: LucideIcon;
  title: string;
  timestamp: Date;
  type: "success" | "warning" | "info" | "default";
  metadata?: Record<string, any>;
}
```

**Theme Variations:**

| Property    | Option A (Garden)      | Option B (Modern)        |
| ----------- | ---------------------- | ------------------------ |
| Item style  | Card with bg color     | Minimal with left border |
| Emoji       | Prominent              | Hidden or small          |
| Time format | Friendly ("2 min ago") | Same                     |

---

## 5. Navigation Components

### 5.1 Sidebar

**Structure:** Vertical navigation menu with sections and items.

```tsx
interface SidebarProps {
  items: NavItem[];
  footer?: React.ReactNode;
  header?: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  emoji?: string; // Option A shows emoji, B shows icon
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: NavItem[];
}
```

**Theme Variations:**

| Property         | Option A (Garden)        | Option B (Modern)       |
| ---------------- | ------------------------ | ----------------------- |
| Active style     | Gradient bg, shadow lift | White bg, subtle shadow |
| Icon display     | Emoji                    | Lucide icon             |
| Decorations      | Grass border, widgets    | Clean, minimal          |
| Active indicator | None (bg is enough)      | Dot on right            |

---

### 5.2 TopBar

**Structure:** Horizontal header with title, search, notifications, and user menu.

```tsx
interface TopBarProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  user: UserInfo;
  customContent?: React.ReactNode; // Weather widget (A), etc.
}
```

**Theme Variations:**

| Property     | Option A (Garden)    | Option B (Modern) |
| ------------ | -------------------- | ----------------- |
| Background   | Sky gradient         | White/blur        |
| Height       | `80px`               | `64px`            |
| Title font   | Display + emoji      | Display           |
| Custom slot  | Weather widget       | Empty             |
| User display | Emoji avatar + level | Initials + role   |

---

### 5.3 Breadcrumbs

**Structure:** Hierarchical navigation path.

```tsx
interface BreadcrumbsProps {
  items: { label: string; href?: string }[];
  separator?: React.ReactNode;
}
```

**Theme Variations:**

| Property  | Option A (Garden) | Option B (Modern) |
| --------- | ----------------- | ----------------- |
| Separator | `→` or emoji      | `>` or `/`        |
| Style     | Playful           | Minimal           |

---

## 6. Feedback Components

### 6.1 Toast / Notification

**Structure:** Temporary feedback message.

```tsx
interface ToastProps {
  title: string;
  description?: string;
  variant: "success" | "error" | "warning" | "info";
  duration?: number;
  action?: { label: string; onClick: () => void };
}
```

**Theme Variations:**

| Property      | Option A (Garden) | Option B (Modern) |
| ------------- | ----------------- | ----------------- |
| Border radius | `2xl`             | `xl`              |
| Icon          | Emoji             | Lucide icon       |
| Animation     | Bounce in         | Slide in          |

---

### 6.2 Modal / Dialog

**Structure:** Overlay dialog for focused interactions.

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}
```

**Theme Variations:**

| Property      | Option A (Garden)  | Option B (Modern) |
| ------------- | ------------------ | ----------------- |
| Border radius | `3xl`              | `2xl`             |
| Shadow        | Large, colorful    | Subtle, neutral   |
| Backdrop      | Warm tint          | Dark tint         |
| Header        | Can include mascot | Clean text        |

---

### 6.3 EmptyState

**Structure:** Placeholder for empty data states.

```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  emoji?: string;
  illustration?: "default" | "search" | "error" | "success";
  action?: { label: string; onClick: () => void };
}
```

**Theme Variations:**

| Property     | Option A (Garden)    | Option B (Modern) |
| ------------ | -------------------- | ----------------- |
| Illustration | Mascot or themed     | Abstract or icon  |
| Emoji        | Large, centered      | Hidden            |
| Tone         | Encouraging, playful | Neutral, helpful  |

---

## 7. Theme-Specific Assets

These assets exist _only_ within theme packages and are conditionally rendered.

### 7.1 Mascot (Option A only)

```tsx
interface MascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  emotion?: "happy" | "excited" | "thinking" | "proud" | "encouraging" | "sad";
  animate?: boolean;
}

// Rendered via theme context
const Mascot = () => {
  const { features } = useTheme();
  if (!features.mascot) return null;
  return <MascotImplementation {...props} />;
};
```

### 7.2 Decorative Elements (Option A only)

```tsx
// Conditionally rendered based on theme
<ThemeDecoration type="clouds" position="top" />
<ThemeDecoration type="grass" position="bottom" />
<ThemeDecoration type="sun" position="top-right" />
```

### 7.3 Progress Plant (Option A only)

Falls back to `ProgressCircular` in Option B.

```tsx
const ProgressIndicator = ({ value, variant = "auto" }) => {
  const { features } = useTheme();

  if (variant === "plant" && features.gamification) {
    return <ProgressPlant value={value} />;
  }

  return <ProgressCircular value={value} />;
};
```

### 7.4 Reward Badges (Option A only)

```tsx
// Vegetable badges for gamification
interface RewardBadgeProps {
  type: "carrot" | "tomato" | "corn" | "broccoli" | "eggplant";
  count: number;
}

// Falls back to simple count badge in Option B
```

---

## 8. Component API Reference

### Complete Component List

| Component      | Category | Theme Variance | Notes                     |
| -------------- | -------- | -------------- | ------------------------- |
| `Button`       | Core     | High           | Border, shadow, animation |
| `Card`         | Core     | High           | Border, radius, shadow    |
| `Badge`        | Core     | Medium         | Border, padding           |
| `Input`        | Core     | Medium         | Border, focus ring        |
| `Avatar`       | Core     | Medium         | Shape, border             |
| `Progress`     | Core     | High           | Has plant variant         |
| `AppShell`     | Layout   | High           | Decorations, sizing       |
| `PageHeader`   | Layout   | Medium         | Emoji display             |
| `Grid`         | Layout   | None           | Structural only           |
| `Stack`        | Layout   | None           | Structural only           |
| `StatCard`     | Data     | High           | Emoji vs icon             |
| `DataTable`    | Data     | Medium         | Colors, borders           |
| `List`         | Data     | Low            | Spacing only              |
| `ActivityFeed` | Data     | Medium         | Item styling              |
| `Sidebar`      | Nav      | High           | Decorations, icons        |
| `TopBar`       | Nav      | High           | Custom slots              |
| `Breadcrumbs`  | Nav      | Low            | Separator style           |
| `Toast`        | Feedback | Medium         | Animation, icons          |
| `Modal`        | Feedback | Medium         | Radius, shadow            |
| `EmptyState`   | Feedback | High           | Illustration              |
| `Mascot`       | Asset    | A only         | Conditional render        |
| `Decoration`   | Asset    | A only         | Conditional render        |
| `RewardBadge`  | Asset    | A only         | Conditional render        |

---

## Implementation Strategy

### 1. Create Base Components

```
packages/
  ui/
    src/
      components/
        Button/
          Button.tsx         # Logic & structure
          Button.styles.ts   # Theme-aware styles
          Button.types.ts    # TypeScript interfaces
          index.ts
        Card/
        Badge/
        ...
      themes/
        tokens/
          base.ts            # Shared defaults
          garden.ts          # Option A tokens
          modern.ts          # Option B tokens
        ThemeProvider.tsx
        useTheme.ts
```

### 2. Theme Provider Pattern

```tsx
// Usage
<ThemeProvider theme="garden" intensity="full">
  <App />
</ThemeProvider>

// Or with custom tokens
<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

### 3. Styled Component Pattern

```tsx
// Button.styles.ts
export const getButtonStyles = (
  theme: ThemeTokens,
  variant: string,
  size: string
) => ({
  base: {
    fontFamily: theme.typography.fontFamily.display,
    borderRadius: theme.borders.radius[variant === "ghost" ? "lg" : "xl"],
    transition: `all ${theme.motion.duration.normal} ${theme.motion.easing.default}`,
  },
  variants: {
    primary: {
      background: `linear-gradient(135deg, ${theme.colors.primary[400]}, ${theme.colors.primary[500]})`,
      color: "white",
      boxShadow: theme.shadows.button || theme.shadows.md,
    },
    // ...
  },
  hover: {
    transform: theme.motion.enableBounce
      ? "translateY(-2px)"
      : "translateY(-1px)",
  },
});
```

---

## Next Steps

1. **Finalize token values** for both themes
2. **Build base components** with theme hooks
3. **Create Storybook** with theme switcher
4. **Document usage patterns** for each component
5. **Build page templates** using components
6. **Test theme switching** at runtime

---

_Document Version: 1.0_
_Status: Architecture Specification_
