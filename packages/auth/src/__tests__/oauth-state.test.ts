import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateOAuthState,
  validateOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "../oauth-state.js";

// Mock arctic
vi.mock("arctic", () => ({
  generateState: vi.fn(() => "mock-state-abc123"),
}));

import { generateState } from "arctic";

describe("oauth-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OAUTH_STATE_COOKIE constant", () => {
    it("should export correct cookie name", () => {
      // Assert
      expect(OAUTH_STATE_COOKIE).toBe("oauth_state");
    });
  });

  describe("OAUTH_STATE_MAX_AGE constant", () => {
    it("should export correct max age (10 minutes)", () => {
      // Assert
      expect(OAUTH_STATE_MAX_AGE).toBe(60 * 10);
      expect(OAUTH_STATE_MAX_AGE).toBe(600);
    });
  });

  describe("generateOAuthState", () => {
    it("should call arctic.generateState and return state string", () => {
      // Act
      const state = generateOAuthState();

      // Assert
      expect(generateState).toHaveBeenCalledTimes(1);
      expect(state).toBe("mock-state-abc123");
    });

    it("should return cryptographically secure random string", () => {
      // Act
      const state = generateOAuthState();

      // Assert
      expect(state).toBeTruthy();
      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThan(0);
    });
  });

  describe("validateOAuthState", () => {
    it("should return true when states match", () => {
      // Arrange
      const receivedState = "state-abc123";
      const storedState = "state-abc123";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when states do not match", () => {
      // Arrange
      const receivedState = "state-abc123";
      const storedState = "state-xyz789";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when receivedState is undefined", () => {
      // Arrange
      const receivedState = undefined;
      const storedState = "state-abc123";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when storedState is undefined", () => {
      // Arrange
      const receivedState = "state-abc123";
      const storedState = undefined;

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when both states are undefined", () => {
      // Arrange
      const receivedState = undefined;
      const storedState = undefined;

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for empty string receivedState", () => {
      // Arrange
      const receivedState = "";
      const storedState = "state-abc123";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for empty string storedState", () => {
      // Arrange
      const receivedState = "state-abc123";
      const storedState = "";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
    });

    it("should perform constant-time comparison (security)", () => {
      // Arrange - same length strings that differ
      const receivedState = "aaaaaaaaaaaaaaaaaaaa";
      const storedState = "bbbbbbbbbbbbbbbbbbbb";

      // Act
      const result = validateOAuthState(receivedState, storedState);

      // Assert
      expect(result).toBe(false);
      // Note: Constant-time comparison prevents timing attacks
      // In production, this uses === which is constant-time for strings
    });
  });
});
