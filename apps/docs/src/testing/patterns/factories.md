---
title: Test Factories
description: Creating reusable mock data with factory functions
related_code:
  - packages/auth/__tests__/abilities.test.ts
  - apps/api/src/__tests__/integration/auth.routes.test.ts
last_verified: 2026-01-14
---

# Test Factories

Test factories create consistent mock data across tests. They provide sensible defaults while allowing easy customization for specific test cases.

## Basic Factory Pattern

A factory function returns a complete mock object with default values:

```typescript
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    passwordHash: "hashed-password",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
```

### Usage

```typescript
// Use defaults
const user = createMockUser();

// Override specific fields
const admin = createMockUser({
  id: "admin-456",
  email: "admin@example.com",
});

// Override for specific test case
const suspendedUser = createMockUser({
  status: "suspended",
});
```

## Why Factories

### Without Factories

```typescript
// Repetitive, error-prone
it("should return user when found", async () => {
  const user = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    passwordHash: "hashed-password",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  mockDb.findFirst.mockResolvedValue(user);
  // ...
});

it("should reject suspended user", async () => {
  const user = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    passwordHash: "hashed-password",
    status: "suspended",  // Only difference
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  mockDb.findFirst.mockResolvedValue(user);
  // ...
});
```

### With Factories

```typescript
// Clean, focused on what matters
it("should return user when found", async () => {
  const user = createMockUser();
  mockDb.findFirst.mockResolvedValue(user);
  // ...
});

it("should reject suspended user", async () => {
  const user = createMockUser({ status: "suspended" });
  mockDb.findFirst.mockResolvedValue(user);
  // ...
});
```

## Real Examples from the Codebase

### User Factory

From `packages/auth/__tests__/abilities.test.ts`:

```typescript
import type { SessionUser } from "../src/types.js";

function createMockUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  } as SessionUser;
}
```

### Group Membership Factory

```typescript
import type { GroupMember } from "@raptscallions/db/schema";

function createMockGroupMembership(
  overrides: Partial<GroupMember> = {}
): GroupMember {
  return {
    id: "membership-123",
    userId: "user-123",
    groupId: "group-1",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### Usage in Tests

```typescript
describe("buildAbility", () => {
  let mockUser: SessionUser;

  beforeEach(() => {
    mockUser = createMockUser();
  });

  describe("system_admin", () => {
    it("should allow manage all when user has system_admin role", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({
          role: "system_admin",
          groupId: "group-1",
        }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("manage", "all")).toBe(true);
    });
  });

  describe("teacher", () => {
    it("should allow creating tools in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(true);
    });
  });
});
```

## Factory Best Practices

### 1. Place in Test Files or Shared Utils

For tests in a single file:
```typescript
// At top of test file
function createMockUser(overrides: Partial<User> = {}): User { ... }
```

For shared across files:
```typescript
// __tests__/utils/factories.ts
export function createMockUser(overrides: Partial<User> = {}): User { ... }
export function createMockGroup(overrides: Partial<Group> = {}): Group { ... }
```

### 2. Use TypeScript for Type Safety

```typescript
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    // TypeScript ensures all required fields are present
    ...overrides,
  };
}
```

### 3. Keep Defaults Realistic

```typescript
// Good - realistic defaults
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date(),
    ...overrides,
  };
}

// Bad - placeholder values that don't match real data
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "",
    email: "",
    name: "",
    createdAt: null,  // Type error!
    ...overrides,
  };
}
```

### 4. Use Unique IDs When Needed

For tests that need multiple distinct entities:

```typescript
let idCounter = 0;

function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? `user-${++idCounter}`;
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    ...overrides,
  };
}
```

Or use a library like `nanoid`:

```typescript
import { nanoid } from "nanoid";

function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? `user-${nanoid(8)}`;
  return {
    id,
    email: `${id}@example.com`,
    ...overrides,
  };
}
```

## Nested Factories

For complex objects with relationships:

```typescript
function createMockSession(overrides: Partial<Session> = {}): Session {
  const userId = overrides.userId ?? "user-123";
  return {
    id: "session-123",
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    fresh: false,
    ...overrides,
  };
}

function createMockSessionWithUser(
  sessionOverrides: Partial<Session> = {},
  userOverrides: Partial<User> = {}
): { session: Session; user: User } {
  const user = createMockUser(userOverrides);
  const session = createMockSession({
    userId: user.id,
    ...sessionOverrides,
  });
  return { session, user };
}
```

Usage:
```typescript
it("should attach user to request for valid session", async () => {
  const { session, user } = createMockSessionWithUser();
  mockSessionService.validate.mockResolvedValue({ session, user });
  // ...
});
```

## Mock Database Responses

Factories can also create Drizzle query mock responses:

```typescript
function createMockDbInsertResponse<T>(data: T): {
  values: Mock<(...args: unknown[]) => { returning: Mock<() => Promise<T[]>> }>;
} {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([data]),
    }),
  };
}
```

Usage:
```typescript
it("should create user", async () => {
  const user = createMockUser();
  mockDb.insert.mockReturnValue(createMockDbInsertResponse(user));
  // ...
});
```

## Factory Composition

Build complex scenarios from simple factories:

```typescript
function createMockTeacherInSchool(schoolId: string) {
  const user = createMockUser();
  const membership = createMockGroupMembership({
    userId: user.id,
    groupId: schoolId,
    role: "teacher",
  });
  return { user, membership };
}

function createMockStudentWithClasses(classIds: string[]) {
  const user = createMockUser();
  const memberships = classIds.map((classId) =>
    createMockGroupMembership({
      userId: user.id,
      groupId: classId,
      role: "student",
    })
  );
  return { user, memberships };
}
```

## Related Pages

- [Test Structure](/testing/concepts/test-structure) — AAA pattern and describe blocks
- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
- [Integration Tests](/testing/patterns/integration-tests) — Using factories in integration tests
- [Testing Overview](/testing/) — All testing patterns

## References

**Key Files:**
- [abilities.test.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts) — Factory examples
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts) — Integration test factories

**Implements:** E02-T008 (Auth integration tests)
