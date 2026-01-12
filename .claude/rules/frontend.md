---
globs:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.ts"
---

# Frontend Code Rules

When working with frontend code in `apps/web/`:

## Framework Stack

- **React 18** with functional components
- **Vite** for bundling
- **TanStack Router** for routing (file-based)
- **TanStack Query** for server state
- **shadcn/ui** + Tailwind for components

## Components

```tsx
// ✅ Correct pattern
import { type FC } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onSelect }) => {
  return (
    <Card onClick={() => onSelect?.(user)}>
      <CardHeader>{user.name}</CardHeader>
      <CardContent>{user.email}</CardContent>
    </Card>
  );
};
```

## Data Fetching

```tsx
// ✅ Use TanStack Query
import { useQuery, useMutation } from "@tanstack/react-query";

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => api.users.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.users.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

## Routing

```tsx
// routes/$userId.tsx - TanStack Router file-based
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/users/$userId")({
  component: UserPage,
  loader: ({ params }) => fetchUser(params.userId),
});

function UserPage() {
  const { userId } = Route.useParams();
  const user = Route.useLoaderData();
  // ...
}
```

## Forms

```tsx
// Use react-hook-form with Zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@raptscallions/core/schemas";

const form = useForm({
  resolver: zodResolver(createUserSchema),
  defaultValues: { email: "", name: "" },
});
```

## Styling

- Use Tailwind utility classes
- Use shadcn/ui components as base
- Use CSS variables for theming (defined in ThemeProvider)
- No inline styles, no CSS modules

## File Organization

```
apps/web/src/
├── routes/           # TanStack Router pages
├── components/
│   ├── ui/          # shadcn components
│   └── {feature}/   # Feature components
├── hooks/           # Custom hooks
├── lib/             # Utilities, API client
└── stores/          # Zustand stores (if needed)
```

## State Management

- Server state: TanStack Query (preferred)
- Local UI state: useState/useReducer
- Global client state: Zustand (only if needed)
