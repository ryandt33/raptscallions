import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config before importing oauth module
vi.mock("@raptscallions/core/config", () => ({
  config: {
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    MICROSOFT_CLIENT_ID: "test-microsoft-client-id",
    MICROSOFT_CLIENT_SECRET: "test-microsoft-secret",
    OAUTH_REDIRECT_BASE: "http://localhost:3000",
  },
}));

// Mock Arctic classes
const mockGoogleClient = {
  createAuthorizationURL: vi.fn(),
  validateAuthorizationCode: vi.fn(),
};

const mockMicrosoftClient = {
  createAuthorizationURL: vi.fn(),
  validateAuthorizationCode: vi.fn(),
};

vi.mock("arctic", () => ({
  Google: vi.fn(() => mockGoogleClient),
  MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
  generateState: vi.fn(() => "mock-state"),
}));

describe("oauth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("googleOAuthClient", () => {
    it("should initialize Google client with correct config", async () => {
      // Dynamically import to get fresh module with mocks
      const { Google } = await import("arctic");

      // Import the oauth module (will trigger IIFE)
      await import("../oauth.js");

      // Assert
      expect(Google).toHaveBeenCalledWith(
        "test-google-client-id",
        "test-google-secret",
        "http://localhost:3000/auth/google/callback"
      );
    });

    it("should export Google client instance when configured", async () => {
      // Import oauth module
      const { googleOAuthClient } = await import("../oauth.js");

      // Assert
      expect(googleOAuthClient).toBeTruthy();
      expect(googleOAuthClient).toEqual(mockGoogleClient);
    });
  });

  describe("microsoftOAuthClient", () => {
    it("should initialize Microsoft client with correct config", async () => {
      // Reset modules to get fresh imports with constructor calls tracked
      vi.resetModules();

      // Re-mock arctic after reset
      vi.doMock("arctic", () => ({
        Google: vi.fn(() => mockGoogleClient),
        MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
        generateState: vi.fn(() => "mock-state"),
      }));

      // Dynamically import to get fresh module with mocks
      const { MicrosoftEntraId } = await import("arctic");

      // Import the oauth module (will trigger constructor calls)
      await import("../oauth.js");

      // Assert - MicrosoftEntraId takes tenantId as first param
      expect(MicrosoftEntraId).toHaveBeenCalledWith(
        "common", // Tenant ID
        "test-microsoft-client-id",
        "test-microsoft-secret",
        "http://localhost:3000/auth/microsoft/callback"
      );
    });

    it("should export Microsoft client instance when configured", async () => {
      // Import oauth module
      const { microsoftOAuthClient } = await import("../oauth.js");

      // Assert
      expect(microsoftOAuthClient).toBeTruthy();
      expect(microsoftOAuthClient).toEqual(mockMicrosoftClient);
    });
  });

  describe("requireGoogleOAuth", () => {
    it("should return Google client when configured", async () => {
      // Import oauth module
      const { requireGoogleOAuth } = await import("../oauth.js");

      // Act
      const client = requireGoogleOAuth();

      // Assert
      expect(client).toEqual(mockGoogleClient);
    });

    it("should throw AppError with 503 when Google not configured", async () => {
      // Re-mock config with missing Google credentials
      vi.resetModules();
      vi.doMock("@raptscallions/core/config", () => ({
        config: {
          GOOGLE_CLIENT_ID: undefined,
          GOOGLE_CLIENT_SECRET: undefined,
          OAUTH_REDIRECT_BASE: "http://localhost:3000",
        },
      }));
      // Also need to re-mock arctic for fresh module
      vi.doMock("arctic", () => ({
        Google: vi.fn(() => mockGoogleClient),
        MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
      }));

      // Import fresh module
      const { requireGoogleOAuth } = await import("../oauth.js");

      // Act & Assert
      expect(() => requireGoogleOAuth()).toThrow("Google OAuth not configured");

      try {
        requireGoogleOAuth();
      } catch (error: any) {
        // Check AppError properties directly (instanceof check fails after module reset)
        expect(error.name).toBe("AppError");
        expect(error.statusCode).toBe(503);
        expect(error.code).toBe("OAUTH_NOT_CONFIGURED");
      }
    });
  });

  describe("requireMicrosoftOAuth", () => {
    it("should return Microsoft client when configured", async () => {
      // Reset and re-setup mocks
      vi.resetModules();
      vi.doMock("@raptscallions/core/config", () => ({
        config: {
          MICROSOFT_CLIENT_ID: "test-microsoft-client-id",
          MICROSOFT_CLIENT_SECRET: "test-microsoft-secret",
          OAUTH_REDIRECT_BASE: "http://localhost:3000",
        },
      }));
      vi.doMock("arctic", () => ({
        Google: vi.fn(() => mockGoogleClient),
        MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
      }));

      // Import fresh module
      const { requireMicrosoftOAuth } = await import("../oauth.js");

      // Act
      const client = requireMicrosoftOAuth();

      // Assert
      expect(client).toBeTruthy();
    });

    it("should throw AppError with 503 when Microsoft not configured", async () => {
      // Re-mock config with missing Microsoft credentials
      vi.resetModules();
      vi.doMock("@raptscallions/core/config", () => ({
        config: {
          MICROSOFT_CLIENT_ID: undefined,
          MICROSOFT_CLIENT_SECRET: undefined,
          OAUTH_REDIRECT_BASE: "http://localhost:3000",
        },
      }));
      vi.doMock("arctic", () => ({
        Google: vi.fn(() => mockGoogleClient),
        MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
      }));

      // Import fresh module
      const { requireMicrosoftOAuth } = await import("../oauth.js");

      // Act & Assert
      expect(() => requireMicrosoftOAuth()).toThrow(
        "Microsoft OAuth not configured"
      );

      try {
        requireMicrosoftOAuth();
      } catch (error: any) {
        // Check AppError properties directly (instanceof check fails after module reset)
        expect(error.name).toBe("AppError");
        expect(error.statusCode).toBe(503);
        expect(error.code).toBe("OAUTH_NOT_CONFIGURED");
      }
    });
  });
});

describe("oauth - unconfigured clients", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should set googleOAuthClient to null when credentials missing", async () => {
    // Mock config without Google credentials
    vi.doMock("@raptscallions/core/config", () => ({
      config: {
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        MICROSOFT_CLIENT_ID: "test-microsoft-client-id",
        MICROSOFT_CLIENT_SECRET: "test-microsoft-secret",
        OAUTH_REDIRECT_BASE: "http://localhost:3000",
      },
    }));
    vi.doMock("arctic", () => ({
      Google: vi.fn(() => mockGoogleClient),
      MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
    }));

    // Import fresh module
    const { googleOAuthClient } = await import("../oauth.js");

    // Assert
    expect(googleOAuthClient).toBeNull();
  });

  it("should set microsoftOAuthClient to null when credentials missing", async () => {
    // Mock config without Microsoft credentials
    vi.doMock("@raptscallions/core/config", () => ({
      config: {
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-secret",
        MICROSOFT_CLIENT_ID: undefined,
        MICROSOFT_CLIENT_SECRET: undefined,
        OAUTH_REDIRECT_BASE: "http://localhost:3000",
      },
    }));
    vi.doMock("arctic", () => ({
      Google: vi.fn(() => mockGoogleClient),
      MicrosoftEntraId: vi.fn(() => mockMicrosoftClient),
    }));

    // Import fresh module
    const { microsoftOAuthClient } = await import("../oauth.js");

    // Assert
    expect(microsoftOAuthClient).toBeNull();
  });
});
