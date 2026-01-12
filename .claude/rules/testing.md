---
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/__tests__/**"
---

# Test Code Rules

When working with test files:

## Framework

- **Vitest** for unit and integration tests
- **Testing Library** for React components
- **MSW** for API mocking (if needed)

## Test Structure (AAA)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("UserService", () => {
  let service: UserService;
  let mockDb: MockedDb;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new UserService(mockDb);
    vi.clearAllMocks();
  });

  describe("getById", () => {
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

    it("should throw NotFoundError when user not found", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getById("123")).rejects.toThrow(NotFoundError);
    });
  });
});
```

## Naming

- Test files: `{name}.test.ts` next to source or in `__tests__/`
- Describe blocks: Class/function name
- It blocks: "should [expected behavior] when [condition]"

## Mocking

```typescript
// ✅ Mock at module level
vi.mock("@raptscallions/db", () => ({
  db: createMockDb(),
}));

// ✅ Mock functions
const mockFn = vi.fn();
mockFn.mockResolvedValue(result);
mockFn.mockRejectedValue(new Error("fail"));

// ✅ Spy on methods
vi.spyOn(service, "validate").mockReturnValue(true);
```

## Test Factories

```typescript
// ✅ Create test data factories
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date(),
    ...overrides,
  };
}
```

## React Component Tests

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  it("should display user name", () => {
    const user = createMockUser({ name: "Jane Doe" });

    render(<UserCard user={user} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("should call onSelect when clicked", async () => {
    const user = createMockUser();
    const onSelect = vi.fn();

    render(<UserCard user={user} onSelect={onSelect} />);
    await fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith(user);
  });
});
```

## What to Test

- ✅ Happy path for each function
- ✅ Error cases and edge cases
- ✅ Validation failures
- ✅ Permission checks
- ✅ Component rendering and interactions

## What NOT to Test

- ❌ Implementation details
- ❌ Third-party library internals
- ❌ Trivial getters/setters
- ❌ Type definitions

## Assertions

```typescript
// ✅ Specific assertions
expect(result).toEqual({ id: "123", name: "Test" });
expect(error.message).toContain("not found");
expect(mockFn).toHaveBeenCalledTimes(1);

// ❌ Vague assertions
expect(result).toBeTruthy();
expect(result).toBeDefined();
```
