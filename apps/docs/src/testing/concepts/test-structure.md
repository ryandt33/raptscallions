---
title: Test Structure
description: AAA pattern, describe blocks, naming conventions, and test organization
related_code:
  - packages/auth/__tests__/abilities.test.ts
  - apps/api/src/__tests__/middleware/error-handler.test.ts
  - apps/api/src/__tests__/config.test.ts
last_verified: 2026-01-14
---

# Test Structure

All tests in RaptScallions follow the AAA (Arrange/Act/Assert) pattern with consistent naming conventions and logical grouping using `describe` blocks.

## AAA Pattern

Every test should have three clearly labeled sections:

```typescript
it("should return user when found", async () => {
  // Arrange
  const expectedUser = createMockUser({ id: "123" });
  mockDb.query.users.findFirst.mockResolvedValue(expectedUser);

  // Act
  const result = await service.getById("123");

  // Assert
  expect(result).toEqual(expectedUser);
  expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
    where: expect.any(Object),
  });
});
```

### Arrange

Set up the test preconditions:

- Create mock data using factory functions
- Configure mock return values
- Set up environment variables
- Initialize services or instances under test

```typescript
// Arrange
const expectedUser = createMockUser({ id: "123" });
mockDb.query.users.findFirst.mockResolvedValue(expectedUser);
```

### Act

Execute the code being tested — typically one function call:

```typescript
// Act
const result = await service.getById("123");
```

::: tip Single Action
The "Act" section should contain exactly one action. If you need multiple actions, you probably need multiple tests.
:::

### Assert

Verify the expected outcomes:

```typescript
// Assert
expect(result).toEqual(expectedUser);
expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
  where: expect.any(Object),
});
```

**Assert both:**
- The return value (what the function returns)
- Side effects (what the function called)

## Describe Blocks

Group related tests using nested `describe` blocks:

```typescript
describe("UserService", () => {
  describe("getById", () => {
    it("should return user when found", async () => {
      // ...
    });

    it("should throw NotFoundError when user not found", async () => {
      // ...
    });
  });

  describe("create", () => {
    it("should create user with valid data", async () => {
      // ...
    });

    it("should throw ValidationError for duplicate email", async () => {
      // ...
    });
  });
});
```

### Hierarchy Guidelines

| Level | Purpose | Example |
|-------|---------|---------|
| Top `describe` | Class, module, or file | `UserService`, `auth.routes.ts` |
| Nested `describe` | Method or function | `getById`, `create` |
| `it` | Single behavior | "should return user when found" |

## Naming Conventions

### Test Files

- Use `.test.ts` extension
- Place in `__tests__/` directories
- Mirror source file names

```
src/
├── services/
│   └── user.service.ts
└── __tests__/
    └── services/
        └── user.service.test.ts
```

### Test Descriptions

Use "should [expected behavior] when [condition]" format:

```typescript
// Good
it("should return 401 when session cookie is missing")
it("should throw ValidationError when email is invalid")
it("should create user with hashed password")

// Avoid
it("returns 401")  // Missing "should" and context
it("test user creation")  // Not descriptive
it("works")  // Completely unclear
```

## Setup and Teardown

### beforeEach / afterEach

Reset state between tests:

```typescript
describe("UserService", () => {
  let service: UserService;
  let mockDb: MockedDb;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new UserService(mockDb);
    vi.clearAllMocks();
  });

  // Tests...
});
```

### beforeAll / afterAll

For expensive setup shared across tests:

```typescript
describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { createServer } = await import("../../server.js");
    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests...
});
```

::: warning Always Clean Up
Always call `vi.clearAllMocks()` in `beforeEach` to reset mock call counts and implementations between tests. For Fastify apps, always call `app.close()` in `afterAll`.
:::

## Real Examples from the Codebase

### Unit Test: Error Handler

From `apps/api/src/__tests__/middleware/error-handler.test.ts`:

```typescript
describe("Error Handler Middleware", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.resetModules();

    mockRequest = {
      id: "test-request-id",
      method: "GET",
      url: "/test",
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe("AppError handling", () => {
    it("should handle ValidationError and return 400", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new ValidationError("Invalid input", { field: "email" });

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        details: { field: "email" },
      });
    });
  });
});
```

### Unit Test: CASL Abilities

From `packages/auth/__tests__/abilities.test.ts`:

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
      expect(ability.can("delete", "User")).toBe(true);
      expect(ability.can("create", "Group")).toBe(true);
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
      expect(ability.can("create", subject("Tool", { groupId: "group-2" }))).toBe(false);
    });
  });
});
```

### Test with Data-Driven Cases

From `apps/api/src/__tests__/middleware/error-handler.test.ts`:

```typescript
describe("HTTP status codes", () => {
  it("should map error types to correct status codes", async () => {
    // Arrange
    const { errorHandler } = await import("../../middleware/error-handler.js");

    const testCases = [
      { error: new ValidationError("Test"), expectedStatus: 400 },
      { error: new UnauthorizedError(), expectedStatus: 401 },
      { error: new NotFoundError("Resource", "id"), expectedStatus: 404 },
      { error: new AppError("Test", "CODE", 418), expectedStatus: 418 },
      { error: new Error("Generic"), expectedStatus: 500 },
    ];

    for (const { error, expectedStatus } of testCases) {
      // Reset mocks
      (mockReply.status as Mock).mockClear();

      // Act
      errorHandler(error, mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(expectedStatus);
    }
  });
});
```

## Anti-Patterns to Avoid

### Missing AAA Comments

```typescript
// Bad - no clear sections
it("should work", async () => {
  const user = createMockUser();
  mockDb.findFirst.mockResolvedValue(user);
  const result = await service.get("123");
  expect(result).toEqual(user);
});

// Good - clear sections
it("should return user when found", async () => {
  // Arrange
  const user = createMockUser();
  mockDb.findFirst.mockResolvedValue(user);

  // Act
  const result = await service.get("123");

  // Assert
  expect(result).toEqual(user);
});
```

### Multiple Actions

```typescript
// Bad - multiple actions
it("should create and update user", async () => {
  const user = await service.create({ email: "test@example.com" });
  const updated = await service.update(user.id, { name: "New Name" });
  expect(updated.name).toBe("New Name");
});

// Good - separate tests
it("should create user", async () => {
  const user = await service.create({ email: "test@example.com" });
  expect(user.email).toBe("test@example.com");
});

it("should update user name", async () => {
  const user = createMockUser({ id: "123" });
  mockDb.findFirst.mockResolvedValue(user);

  const updated = await service.update("123", { name: "New Name" });
  expect(updated.name).toBe("New Name");
});
```

### Vague Assertions

```typescript
// Bad - vague
expect(result).toBeTruthy();
expect(result).toBeDefined();

// Good - specific
expect(result).toEqual({ id: "123", name: "Test" });
expect(error.message).toContain("not found");
expect(mockFn).toHaveBeenCalledTimes(1);
```

## Related Pages

- [Vitest Monorepo Setup](/testing/concepts/vitest-setup) — Configuration hierarchy
- [Test Factories](/testing/patterns/factories) — Creating mock data
- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
- [Testing Overview](/testing/) — All testing patterns

## References

**Key Files:**
- [abilities.test.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/__tests__/abilities.test.ts) — Unit test example
- [error-handler.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/middleware/error-handler.test.ts) — Middleware test example
- [config.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/config.test.ts) — Config validation tests

**Implements:** E02-T008 (Auth integration tests)
