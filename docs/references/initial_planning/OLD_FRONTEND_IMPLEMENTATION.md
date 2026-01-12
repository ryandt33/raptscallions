# Raptscallions Frontend Implementation Guide

Complete implementation guide for the Raptscallions frontend using Vite, React, TypeScript, TanStack Router, and TanStack Query.

---

## Table of Contents

1. [Project Structure](#project-structure)
1. [Theme System](#theme-system)
1. [Routing](#routing)
1. [State Management](#state-management)
1. [Component Library](#component-library)

---

## Project Structure

```
apps/web/
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── groups/
│   │   │   └── $groupId/
│   │   │       ├── index.tsx
│   │   │       ├── classes/
│   │   │       │   ├── index.tsx
│   │   │       │   └── $classId/
│   │   │       │       ├── index.tsx
│   │   │       │       ├── assignments.tsx
│   │   │       │       └── roster.tsx
│   │   │       ├── tools/
│   │   │       │   ├── index.tsx
│   │   │       │   └── create.tsx
│   │   │       └── settings/
│   │   │           ├── index.tsx
│   │   │           └── theme.tsx
│   │   ├── tools/
│   │   │   ├── index.tsx
│   │   │   └── $toolId.tsx
│   │   ├── sessions/
│   │   │   └── $sessionId.tsx
│   │   ├── runs/
│   │   │   └── $runId.tsx
│   │   └── admin/
│   │       ├── users.tsx
│   │       ├── ai-models.tsx
│   │       ├── ai-usage.tsx
│   │       └── oneroster.tsx
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── theme/
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ThemeEditor.tsx
│   │   │   └── ThemeTemplates.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── Message.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── SessionList.tsx
│   │   ├── assignments/
│   │   │   ├── AssignmentCard.tsx
│   │   │   ├── AssignmentForm.tsx
│   │   │   └── SubmissionTable.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Breadcrumbs.tsx
│   │       └── Footer.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── theme.ts
│   │   └── utils.ts
│   ├── stores/
│   │   └── auth.ts
│   └── hooks/
│       ├── useSession.ts
│       ├── useSubmissions.ts
│       └── useTools.ts
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Theme System

### Theme Provider

#### src/components/theme/ThemeProvider.tsx

```tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ThemeConfig } from "@raptscallions/core/schemas";

interface ThemeProviderProps {
  groupId: string;
  children: React.ReactNode;
}

export function ThemeProvider({ groupId, children }: ThemeProviderProps) {
  const { data: theme } = useQuery({
    queryKey: ["groups", groupId, "theme"],
    queryFn: async () => {
      const response = await api.get<ThemeConfig>(
        `/groups/${groupId}/theme/resolved`
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;

    // Apply brand colors
    if (theme.primary) {
      const hsl = hexToHSL(theme.primary);
      root.style.setProperty("--brand-primary", hsl);
      root.style.setProperty("--primary", hsl);
    }

    if (theme.secondary) {
      const hsl = hexToHSL(theme.secondary);
      root.style.setProperty("--brand-secondary", hsl);
    }

    if (theme.accent) {
      const hsl = hexToHSL(theme.accent);
      root.style.setProperty("--brand-accent", hsl);
      root.style.setProperty("--accent", hsl);
    }

    // Apply font family
    if (theme.fontFamily) {
      root.style.setProperty("--font-family", theme.fontFamily);
    }

    // Apply CSS overrides
    if (theme.cssOverrides) {
      Object.entries(theme.cssOverrides).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }

    // Inject custom CSS
    if (theme.customCss) {
      const styleId = `custom-theme-${groupId}`;
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = sanitizeCSS(theme.customCss);
    }

    // Load custom font
    if (theme.fontUrl) {
      const linkId = `custom-font-${groupId}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = theme.fontUrl;
        document.head.appendChild(link);
      }
    }

    // Update favicon
    if (theme.favicon) {
      const favicon = document.querySelector(
        'link[rel="icon"]'
      ) as HTMLLinkElement;
      if (favicon) {
        favicon.href = theme.favicon;
      }
    }
  }, [theme, groupId]);

  return <>{children}</>;
}

function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

function sanitizeCSS(css: string): string {
  // Remove potentially dangerous patterns
  const dangerous = [
    "javascript:",
    "expression(",
    "import",
    "@import",
    "behavior:",
    "<script",
    "</script>",
  ];

  let safe = css;
  dangerous.forEach((pattern) => {
    safe = safe.replace(new RegExp(pattern, "gi"), "");
  });

  return safe;
}
```

### Theme Editor

#### src/components/theme/ThemeEditor.tsx

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { HexColorPicker } from "react-colorful";
import {
  updateThemeSchema,
  type ThemeConfig,
} from "@raptscallions/core/schemas";
import { api } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ThemeTemplates } from "./ThemeTemplates";

interface ThemeEditorProps {
  groupId: string;
}

export function ThemeEditor({ groupId }: ThemeEditorProps) {
  const queryClient = useQueryClient();

  const { data: currentTheme } = useQuery({
    queryKey: ["groups", groupId, "theme"],
    queryFn: async () => {
      const response = await api.get<ThemeConfig>(
        `/groups/${groupId}/theme/resolved`
      );
      return response.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(updateThemeSchema),
    defaultValues: currentTheme,
  });

  const updateTheme = useMutation({
    mutationFn: async (data: Partial<ThemeConfig>) => {
      const response = await api.patch(`/groups/${groupId}/theme`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "theme"] });
      toast.success("Theme updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update theme");
    },
  });

  const applyTemplate = (template: ThemeConfig) => {
    form.reset(template);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Theme Settings</h2>
        <p className="text-muted-foreground">
          Customize the appearance of your platform
        </p>
      </div>

      <ThemeTemplates onApply={applyTemplate} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => updateTheme.mutate(data))}
          className="space-y-6"
        >
          <Tabs defaultValue="colors">
            <TabsList>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="logo">Logo & Assets</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <HexColorPicker
                            color={field.value}
                            onChange={field.onChange}
                          />
                          <Input {...field} placeholder="#0066CC" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <HexColorPicker
                            color={field.value}
                            onChange={field.onChange}
                          />
                          <Input {...field} placeholder="#64748B" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <HexColorPicker
                            color={field.value}
                            onChange={field.onChange}
                          />
                          <Input {...field} placeholder="#10B981" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Preview</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button style={{ backgroundColor: form.watch("primary") }}>
                      Primary Button
                    </Button>
                    <Button
                      variant="outline"
                      style={{ borderColor: form.watch("secondary") }}
                    >
                      Secondary Button
                    </Button>
                    <Button style={{ backgroundColor: form.watch("accent") }}>
                      Accent Button
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logo" className="space-y-6">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input {...field} placeholder="https://..." />
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Logo preview"
                            className="h-16"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Recommended size: 200x50px
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoDark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo (Dark Mode)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input {...field} placeholder="https://..." />
                        {field.value && (
                          <div className="bg-slate-900 p-4 rounded">
                            <img
                              src={field.value}
                              alt="Dark logo preview"
                              className="h-16"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="favicon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Favicon URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormDescription>
                      Recommended size: 32x32px or 64x64px
                    </FormDescription>
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="typography" className="space-y-6">
              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Family</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-set Google Fonts URL
                        const fontUrl = `https://fonts.googleapis.com/css2?family=${value.replace(
                          " ",
                          "+"
                        )}:wght@400;500;600;700&display=swap`;
                        form.setValue("fontUrl", fontUrl);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose font" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Montserrat">Montserrat</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {form.watch("fontFamily") && (
                <Alert>
                  <AlertDescription>
                    Font URL: {form.watch("fontUrl")}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Preview</h3>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      fontFamily: form.watch("fontFamily") || "Inter",
                    }}
                  >
                    <h1 className="text-4xl font-bold mb-2">
                      The quick brown fox
                    </h1>
                    <p className="text-lg">
                      jumps over the lazy dog. 0123456789
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Advanced Customization</AlertTitle>
                <AlertDescription>
                  Custom CSS is applied globally. Test thoroughly before saving.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="customCss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom CSS</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={15}
                        className="font-mono text-sm"
                        placeholder=".custom-class { ... }"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum 50KB. Dangerous patterns will be sanitized.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" disabled={updateTheme.isPending}>
              {updateTheme.isPending ? "Saving..." : "Save Theme"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

### Theme Templates

#### src/components/theme/ThemeTemplates.tsx

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { ThemeConfig } from "@raptscallions/core/schemas";

const templates: Record<string, ThemeConfig & { name: string }> = {
  default: {
    name: "Raptscallions Default",
    primary: "#0066CC",
    secondary: "#64748B",
    accent: "#10B981",
    fontFamily: "Inter",
  },
  vibrant: {
    name: "Vibrant",
    primary: "#8B5CF6",
    secondary: "#EC4899",
    accent: "#F59E0B",
    fontFamily: "Poppins",
  },
  professional: {
    name: "Professional",
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#0891B2",
    fontFamily: "Roboto",
  },
  nature: {
    name: "Nature",
    primary: "#059669",
    secondary: "#84CC16",
    accent: "#FBBF24",
    fontFamily: "Open Sans",
  },
  sunset: {
    name: "Sunset",
    primary: "#DC2626",
    secondary: "#F97316",
    accent: "#FBBF24",
    fontFamily: "Montserrat",
  },
};

interface ThemeTemplatesProps {
  onApply: (theme: ThemeConfig) => void;
}

export function ThemeTemplates({ onApply }: ThemeTemplatesProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Theme Templates</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(templates).map(([key, template]) => (
          <Card
            key={key}
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => onApply(template)}
          >
            <CardContent className="p-4">
              <div className="flex gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: template.primary }}
                />
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: template.secondary }}
                />
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: template.accent }}
                />
              </div>
              <p className="font-semibold text-sm">{template.name}</p>
              <p className="text-xs text-muted-foreground">
                {template.fontFamily}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Routing

### Root Route

#### src/routes/\_\_root.tsx

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/stores/auth";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Outlet />;
  }

  // Get primary group for theme
  const groupId = user.primaryGroupId || "system";

  return (
    <ThemeProvider groupId={groupId}>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
```

### Group Settings Route

#### src/routes/groups/$groupId/settings/theme.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ThemeEditor } from "@/components/theme/ThemeEditor";

export const Route = createFileRoute("/groups/$groupId/settings/theme")({
  component: ThemeSettingsPage,
});

function ThemeSettingsPage() {
  const { groupId } = Route.useParams();

  return (
    <div className="max-w-5xl mx-auto">
      <ThemeEditor groupId={groupId} />
    </div>
  );
}
```

---

## State Management

### Auth Store

#### src/stores/auth.ts

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
  primaryGroupId?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const response = await api.post("/auth/login", { email, password });
        const { user, token } = response.data;

        set({ user, token });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: "auth",
    }
  )
);
```

---

## API Client

### Main API Client

#### src/lib/api.ts

```typescript
import axios from "axios";
import { useAuth } from "@/stores/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuth.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

## Configuration Files

### Vite Config

#### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(), // Auto-generates route types
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/core": path.resolve(__dirname, "../../packages/core/src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

### Tailwind Config

#### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand colors (CSS variables)
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
          accent: "hsl(var(--brand-accent))",
        },
        // shadcn defaults
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-family)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### Global CSS

#### src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Default theme colors */
    --brand-primary: 221 83% 53%;
    --brand-secondary: 215 20% 65%;
    --brand-accent: 142 71% 45%;
    --font-family: "Inter", sans-serif;

    /* shadcn defaults */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 142 71% 45%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221 83% 53%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 221 83% 53%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 142 71% 45%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 221 83% 53%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-family);
  }
}
```

### Package.json

#### package.json

```json
{
  "name": "@raptscallions/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "@raptscallions/core": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-router": "^1.80.0",
    "@tanstack/react-query": "^5.62.0",
    "zustand": "^5.0.2",
    "axios": "^1.7.9",
    "zod": "^3.24.1",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.1",
    "react-colorful": "^5.6.1",
    "sonner": "^1.3.1",
    "lucide-react": "^0.309.0",
    "tailwind-merge": "^2.2.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "@tanstack/router-vite-plugin": "^1.80.1",
    "vite": "^6.0.3",
    "typescript": "^5.7.2",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33",
    "eslint": "^8.56.0"
  }
}
```

---

## Chat Interface Example

### Chat Interface Component

#### src/components/chat/ChatInterface.tsx

```tsx
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ChatInterfaceProps {
  sessionId: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["sessions", sessionId, "messages"],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/messages`);
      return response.data as Message[];
    },
    refetchInterval: (data) => {
      // Poll faster when waiting for AI response
      const lastMessage = data?.[data.length - 1];
      if (lastMessage?.role === "user") {
        return 1000; // 1 second
      }
      return false; // Stop polling
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/sessions/${sessionId}/messages`, {
        content,
      });
      return response.data;
    },
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["sessions", sessionId, "messages"],
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData([
        "sessions",
        sessionId,
        "messages",
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ["sessions", sessionId, "messages"],
        (old: Message[] | undefined) => [
          ...(old || []),
          {
            id: "temp",
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
        ]
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ["sessions", sessionId, "messages"],
          context.previous
        );
      }
    },
    onSettled: () => {
      // Refetch to get AI response
      queryClient.invalidateQueries({
        queryKey: ["sessions", sessionId, "messages"],
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle>{session?.tool?.name || "Chat"}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages?.map((message) => (
          <Message key={message.id} {...message} />
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-4 border-t">
        <ChatInput
          onSend={(content) => sendMessage.mutate(content)}
          disabled={sendMessage.isPending}
        />
      </div>
    </Card>
  );
}
```

---

This completes the frontend implementation documentation. The next file will cover theme features in detail.
