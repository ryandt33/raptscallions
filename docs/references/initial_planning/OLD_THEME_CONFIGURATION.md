# RaptScallions Theme System Documentation

Complete guide to the hierarchical, customizable theme system that allows organizations to brand RaptScallions at any level.

---

## Table of Contents

1. [Overview](#overview)
1. [Key Features](#key-features)
1. [Usage Guide](#usage-guide)
1. [Technical Details](#technical-details)
1. [API Reference](#api-reference)
1. [Best Practices](#best-practices)
1. [Troubleshooting](#troubleshooting)

---

## Overview

RaptScallions’s theme system enables multi-tenant branding with hierarchical inheritance. Each group (district, school, class) can customize the platform’s appearance while maintaining visual consistency with parent organizations.

### Hierarchy Example

```
District Theme (primary: #003DA5, logo: district-logo.png)
  ├─ High School (primary: #8B0000) ← overrides district blue
  │   └─ Class of 2025 (accent: #FFD700) ← inherits red, adds gold accent
  └─ Middle School (inherits all from district)
```

**Result:**

- Class of 2025 sees: District logo + High School primary color + Class accent color
- Middle School sees: District logo + District colors (full inheritance)

---

## Key Features

### 1. Hierarchical Theme Inheritance

Themes cascade from parent to child groups, allowing:

- **District-wide branding** that applies to all schools
- **School-level customization** without breaking brand guidelines
- **Class-level personality** while maintaining consistency

**How it works:**

```typescript
// Theme resolution merges from root to leaf
System Default → District → School → Class
```

Only specified overrides are applied; unset properties inherit from parents.

---

### 2. Visual Theme Editor

Point-and-click interface requiring **no coding**:

| Feature              | Description                | Use Case              |
| -------------------- | -------------------------- | --------------------- |
| **Color Picker**     | Visual hex color selection | Brand color matching  |
| **Logo Upload**      | Drag-and-drop with preview | School/district logos |
| **Font Selection**   | Google Fonts library       | Typography branding   |
| **Live Preview**     | See changes immediately    | Test before saving    |
| **Template Library** | Pre-built themes           | Quick start options   |

**Access:** Group Settings → Theme Editor (Group Admin only)

---

### 3. Customization Options

#### Basic Branding

| Property            | Purpose                 | Format | Example         |
| ------------------- | ----------------------- | ------ | --------------- |
| **Primary Color**   | Buttons, links, headers | Hex    | `#0066CC`       |
| **Secondary Color** | Secondary elements      | Hex    | `#64748B`       |
| **Accent Color**    | Highlights, badges      | Hex    | `#10B981`       |
| **Logo**            | Light mode logo         | URL    | 200x50px PNG    |
| **Logo (Dark)**     | Dark mode variant       | URL    | 200x50px PNG    |
| **Favicon**         | Browser tab icon        | URL    | 32x32px ICO/PNG |

#### Typography

| Option          | Fonts Available                                     |
| --------------- | --------------------------------------------------- |
| **Font Family** | Inter, Roboto, Open Sans, Poppins, Montserrat, Lato |
| **Font URL**    | Auto-populated from Google Fonts                    |

#### Advanced (Power Users)

| Feature               | Limit | Security                                       |
| --------------------- | ----- | ---------------------------------------------- |
| **Custom CSS**        | 50KB  | Sanitized (no `<script>`, `javascript:`, etc.) |
| **Custom JS**         | 10KB  | For analytics/tracking only                    |
| **Background Images** | N/A   | Hero images, login screens                     |

---

### 4. Pre-built Templates

Start quickly with tested color schemes:

#### Default

- **Primary:** Blue `#0066CC`
- **Secondary:** Gray `#64748B`
- **Accent:** Green `#10B981`
- **Font:** Inter
- **Best for:** General use

#### Vibrant

- **Primary:** Purple `#8B5CF6`
- **Secondary:** Pink `#EC4899`
- **Accent:** Orange `#F59E0B`
- **Font:** Poppins
- **Best for:** Creative fields, arts programs

#### Professional

- **Primary:** Navy `#1E40AF`
- **Secondary:** Slate `#475569`
- **Accent:** Cyan `#0891B2`
- **Font:** Roboto
- **Best for:** Corporate, business schools

#### Nature

- **Primary:** Green `#059669`
- **Secondary:** Lime `#84CC16`
- **Accent:** Yellow `#FBBF24`
- **Font:** Open Sans
- **Best for:** Environmental programs

#### Sunset

- **Primary:** Red `#DC2626`
- **Secondary:** Orange `#F97316`
- **Accent:** Gold `#FBBF24`
- **Font:** Montserrat
- **Best for:** Arts, creativity-focused

---

### 5. Security Features

#### CSS Sanitization

Automatic removal of dangerous patterns:

- `<script>` tags
- `javascript:` URLs
- `@import` statements
- `expression()` calls
- `behavior:` properties

#### File Validation

- **Type checking:** Images only (JPEG, PNG, GIF, SVG)
- **Size limits:** 10MB max per file
- **Optional:** Virus scanning integration

#### Access Control

- **Edit permission:** Group Admins only
- **Instant propagation:** Changes apply to descendants immediately
- **Audit logging:** All theme changes tracked

---

## Usage Guide

### For District Admins

**Setting District-Wide Branding:**

1. Navigate to: `Settings → Theme`
1. Upload district logo (200x50px recommended)
1. Set primary color to match district brand
1. Choose professional font (e.g., Roboto)
1. Click “Save Theme”

**Result:** All schools inherit this theme automatically.

**Allowing School Customization:**

Schools can override specific properties while keeping inherited values:

- High School changes primary to school color
- Elementary keeps district defaults
- Both maintain visual connection via logo and secondary colors

---

### For School Admins

**Customizing School Theme:**

1. Go to: `[School Name] → Settings → Theme`
1. Review inherited district theme (shown as defaults)
1. Override only what you need:

- Change primary to school color
- Add school logo (optional)
- Keep district font

1. Click “Save Theme”

**Result:** Classes in your school inherit the merged theme (district + school).

**Example:**

```
District: Blue (#0066CC) + District Logo + Inter
School Override: Red (#8B0000) + School Logo
Final Theme: Red (#8B0000) + School Logo + Inter (inherited)
```

---

### For Teachers

**Class-Level Theming:**

Create unique identity for special programs:

| Program             | Customization                  |
| ------------------- | ------------------------------ |
| AP Computer Science | Tech-themed colors (blue/cyan) |
| Art Class           | Vibrant palette (purple/pink)  |
| STEM Program        | Professional (navy/green)      |

**How:**

1. Go to: `[Class Name] → Settings → Theme`
1. Choose accent color (keeps school primary)
1. Optional: Custom background image for projects
1. Click “Save Theme”

**Limitations:**

- Cannot change primary/secondary (school-controlled)
- Accent and background only
- No custom CSS (accessibility)

---

## Technical Details

### CSS Variables

Themes use CSS custom properties for instant, no-reload updates:

```css
:root {
  /* Brand colors in HSL format */
  --brand-primary: 221 83% 53%;
  --brand-secondary: 215 20% 65%;
  --brand-accent: 142 71% 45%;

  /* Typography */
  --font-family: "Inter", sans-serif;
}
```

**Why HSL instead of Hex?**

- Easier color variant generation (hover states: `hsl(221 83% 45%)`)
- Better accessibility calculations (contrast ratios)
- Native Tailwind CSS compatibility

---

### Theme Resolution Algorithm

```typescript
async function resolveGroupTheme(groupId: string): Promise<ThemeConfig> {
  // 1. Start with system defaults
  let theme = getSystemDefaults();

  // 2. Get group hierarchy path (using ltree)
  const groupPath = await getGroupPath(groupId);

  // 3. Fetch all ancestors + self (ordered root → leaf)
  const hierarchy = await db
    .select()
    .from(groups)
    .where(sql`path @> ${groupPath} OR path = ${groupPath}`)
    .orderBy(sql`nlevel(path)`);

  // 4. Merge themes (later overrides earlier)
  for (const group of hierarchy) {
    if (group.theme) {
      theme = { ...theme, ...group.theme };
    }
  }

  return theme;
}
```

**Example Execution:**

```
Group Path: district.highschool.class2025
Hierarchy: [district, highschool, class2025]

Merge:
  System: { primary: '#0066CC', secondary: '#64748B', ... }
  District: { logo: 'district-logo.png' }
  High School: { primary: '#8B0000' }
  Class 2025: { accent: '#FFD700' }

Result:
  {
    primary: '#8B0000',        // from High School
    secondary: '#64748B',      // from System
    accent: '#FFD700',         // from Class 2025
    logo: 'district-logo.png', // from District
    ...
  }
```

---

### Performance Optimization

#### Caching Strategy

```
┌─────────────┐
│ Redis Cache │ 1 hour TTL
└─────────────┘
       ↓
┌─────────────┐
│   Browser   │ 5 minutes
└─────────────┘
```

**Cache Keys:**

```
theme:{groupId} → Serialized ThemeConfig
```

**Invalidation:**

- On theme update: Invalidate group + all descendants
- Uses ltree query: `path <@ parent_path`

**Performance Metrics:**

- Theme resolution (cache miss): <50ms
- Theme resolution (cache hit): <5ms
- CSS injection: <10ms
- Total page load impact: <10ms

---

### Browser Compatibility

| Feature       | Chrome | Firefox | Safari  | Edge   | IE11 |
| ------------- | ------ | ------- | ------- | ------ | ---- |
| CSS Variables | ✅ 49+ | ✅ 31+  | ✅ 9.1+ | ✅ 15+ | ❌   |
| Google Fonts  | ✅     | ✅      | ✅      | ✅     | ✅   |
| Custom CSS    | ✅     | ✅      | ✅      | ✅     | ⚠️   |
| File Upload   | ✅     | ✅      | ✅      | ✅     | ⚠️   |

**Note:** IE11 not officially supported (CSS variables required).

---

## API Reference

### Get Resolved Theme

```http
GET /groups/:groupId/theme/resolved
```

Returns merged theme from all ancestors.

**Response:**

```json
{
  "primary": "#0066CC",
  "secondary": "#64748B",
  "accent": "#10B981",
  "logo": "https://cdn.example.com/logo.png",
  "logoDark": "https://cdn.example.com/logo-dark.png",
  "favicon": "https://cdn.example.com/favicon.ico",
  "fontFamily": "Inter",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700",
  "layoutStyle": "modern",
  "sidebarPosition": "left"
}
```

---

### Update Theme

```http
PATCH /groups/:groupId/theme
Content-Type: application/json
```

**Request:**

```json
{
  "primary": "#8B0000",
  "logo": "https://cdn.example.com/school-logo.png"
}
```

**Response:**

```json
{
  "primary": "#8B0000",
  "secondary": "#64748B", // inherited
  "accent": "#10B981", // inherited
  "logo": "https://cdn.example.com/school-logo.png",
  "fontFamily": "Inter" // inherited
}
```

**Side Effects:**

- Cache invalidation for group + descendants
- Immediate application to all active sessions

---

### Delete Theme

```http
DELETE /groups/:groupId/theme
```

Reverts to parent theme (removes all overrides).

**Response:**

```http
204 No Content
```

---

### Get Templates

```http
GET /theme-templates
```

Returns all pre-built theme templates.

**Response:**

```json
{
  "default": {
    "name": "RaptScallions Default",
    "primary": "#0066CC",
    "secondary": "#64748B",
    "accent": "#10B981",
    "fontFamily": "Inter"
  },
  "vibrant": {
    "name": "Vibrant",
    "primary": "#8B5CF6",
    "secondary": "#EC4899",
    "accent": "#F59E0B",
    "fontFamily": "Poppins"
  },
  ...
}
```

---

## Best Practices

### For Districts

#### DO ✅

- Set logo and primary color at district level
- Choose readable, professional font
- Test theme on mobile devices
- Verify color contrast ratios (WCAG AA: 4.5:1 minimum)
- Document brand guidelines for schools

#### DON’T ❌

- Use custom CSS at district level (hard to maintain)
- Override every color (allow school flexibility)
- Use multiple fonts (consistency)
- Set overly restrictive budgets
- Ignore accessibility guidelines

---

### For Schools

#### DO ✅

- Honor district logo placement
- Use school colors for primary
- Test theme with real content
- Communicate changes to teachers
- Maintain contrast ratios

#### DON’T ❌

- Replace district logo entirely
- Use drastically different fonts
- Override too many inherited values
- Forget to preview on mobile
- Ignore accessibility warnings

---

### For Teachers

#### DO ✅

- Use accent color for class personality
- Add backgrounds for special projects
- Keep it simple and readable
- Test with student accounts
- Consider colorblind students

#### DON’T ❌

- Change primary/secondary colors
- Upload large images (>1MB)
- Use custom CSS (breaks accessibility)
- Override school branding
- Use low-contrast colors

---

## Accessibility

All themes automatically meet **WCAG 2.1 Level AA** standards:

### Color Contrast

**Requirements:**

- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt): 3:1 minimum
- UI components: 3:1 minimum

**Auto-adjustments:**

```typescript
// System validates and adjusts if needed
if (getContrastRatio(primary, "#FFFFFF") < 4.5) {
  primary = adjustForContrast(primary, "#FFFFFF", 4.5);
  warn("Primary color adjusted for accessibility");
}
```

### Font Sizes

- Minimum body text: **16px**
- Scalable with browser zoom: **200%**
- Mobile-optimized: **16px minimum**

### Focus Indicators

- Visible keyboard navigation
- Color-independent (uses outline)
- 2px minimum thickness

### Screen Reader Support

- Semantic HTML
- ARIA labels on interactive elements
- Alt text on images (including logos)

---

## Troubleshooting

### Theme Not Applying

**Symptoms:** Changes not visible after saving

**Check:**

1. **Browser cache:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
1. **Group membership:** Verify you’re in the group
1. **Redis cache:** Admin can invalidate via API
1. **CSS errors:** Check browser console for errors

**Solution:**

```bash
# Admin: Invalidate cache manually
curl -X POST https://api.raptscallions.org/admin/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"pattern": "theme:*"}'
```

---

### Colors Look Different Across Devices

**Cause:** Monitor calibration, color profiles

**Solution:**

- Use standard sRGB colors
- Test on multiple devices
- Avoid extreme saturation (>80%)
- Use web-safe colors when possible

**Tools:**

- [Coolors.co](https://coolors.co) - Color palette generator
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

### Custom CSS Not Working

**Symptoms:** Custom styles not applying

**Cause:** Sanitization removed code

**Check:**

1. No `<script>` tags
1. No `javascript:` URLs
1. No `@import` statements
1. No `expression()` calls
1. Valid CSS syntax

**Example - What Works:**

```css
/* ✅ Valid */
.custom-header {
  background: linear-gradient(to right, #0066cc, #10b981);
  padding: 2rem;
}

.custom-button:hover {
  transform: scale(1.05);
}
```

**Example - What Doesn’t:**

```css
/* ❌ Sanitized out */
@import url("malicious.css");

.custom {
  background: url('javascript:alert("XSS")');
  behavior: url("htc-file.htc");
}
```

---

### Logo Not Displaying

**Symptoms:** Broken image icon or no logo

**Check:**

1. **File format:** PNG, JPEG, GIF, SVG only
1. **CORS headers:** CDN must allow cross-origin
1. **File size:** < 10MB
1. **URL validity:** Must be publicly accessible
1. **Permissions:** Check file read permissions

**Solution:**

```bash
# Test URL accessibility
curl -I https://cdn.example.com/logo.png

# Should return:
# HTTP/1.1 200 OK
# Content-Type: image/png
# Access-Control-Allow-Origin: *
```

---

### Font Not Loading

**Symptoms:** Default font displayed instead of custom

**Check:**

1. **Google Fonts URL:** Valid and accessible
1. **Font name:** Exact match (case-sensitive)
1. **Network:** Not blocked by firewall
1. **Browser cache:** Clear and reload

**Correct Google Fonts URL:**

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
```

**Common Mistakes:**

```
❌ https://fonts.google.com/specimen/Inter
❌ https://fonts.googleapis.com/css?family=inter
✅ https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700
```

---

## Future Enhancements

### Planned Features

1. **Dark/Light Mode Toggle**

- Per-user preference
- Automatic based on system preference
- Separate color schemes for each mode

1. **Theme Versioning**

- Rollback to previous versions
- Compare versions side-by-side
- Scheduled theme changes

1. **A/B Testing**

- Test multiple themes with user groups
- Analytics on user engagement
- Statistical significance testing

1. **Theme Marketplace**

- Community-contributed themes
- Rating and review system
- One-click installation

1. **Advanced Color Tools**

- Automatic contrast checking
- Color blindness simulation
- Palette generator from logo

1. **Animation Support**

- Custom transitions
- Loading animations
- Micro-interactions

---

## Summary

RaptScallions’s theme system provides:

✅ **Hierarchical inheritance** - Set once, apply everywhere
✅ **Visual editor** - No coding required
✅ **Instant updates** - No page reload needed
✅ **Security** - Automatic sanitization
✅ **Performance** - Cached resolution (<10ms)
✅ **Accessibility** - WCAG AA compliant
✅ **Flexibility** - From districts to individual classes

**Key Advantage over Moodle:**

- Moodle: Upload CSS file → Restart server → Hope it works
- RaptScallions: Visual editor → Live preview → Instant deployment

**Getting Started:**

1. Choose a template (or start from default)
1. Customize colors and logo
1. Save and see changes immediately
1. Schools/classes inherit and customize

For technical support, see [Troubleshooting](#troubleshooting) or contact your system administrator.
