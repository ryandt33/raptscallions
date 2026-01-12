/**
 * Test factory utilities for creating mock data
 * Used by unit tests to create valid test data structures
 */

// Mock User factory
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  };
}

// Mock Group factory
export function createMockGroup(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Group",
    parentId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
    settings: {},
    ...overrides,
  };
}

// Mock CreateUser factory (same as user for now)
export function createMockCreateUser(overrides: Record<string, unknown> = {}) {
  return createMockUser(overrides);
}

// Mock UpdateUser factory (partial user)
export function createMockUpdateUser(overrides: Record<string, unknown> = {}) {
  return {
    ...overrides,
  };
}

// Mock CreateGroup factory
export function createMockCreateGroup(overrides: Record<string, unknown> = {}) {
  return createMockGroup(overrides);
}

// Mock UpdateGroup factory (partial group)
export function createMockUpdateGroup(overrides: Record<string, unknown> = {}) {
  return {
    ...overrides,
  };
}

// Invalid data factories for testing validation errors
export const invalidUserData = {
  missingEmail: { name: "Test User" },
  missingName: { email: "test@example.com" },
  invalidEmail: { email: "not-an-email", name: "Test User" },
  emptyName: { email: "test@example.com", name: "" },
  nameTooLong: {
    email: "test@example.com",
    name: "a".repeat(101) // Exceeds 100 char limit
  },
};

export const invalidGroupData = {
  missingName: { settings: {} },
  emptyName: { name: "", settings: {} },
  nameTooLong: {
    name: "a".repeat(101), // Exceeds 100 char limit
    settings: {}
  },
  invalidParentId: {
    name: "Test Group",
    parentId: "not-a-uuid",
    settings: {}
  },
};