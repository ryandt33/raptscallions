import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),

    // OAuth - Google
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // OAuth - Microsoft
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),

    // OAuth Redirect Base URL
    OAUTH_REDIRECT_BASE: z.string().url().default("http://localhost:3000"),
  })
  .refine(
    (data) => {
      // If Google OAuth is partially configured, both must be set
      const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
      const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
      return hasGoogleId === hasGoogleSecret; // Both true or both false
    },
    {
      message:
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be unset",
    }
  )
  .refine(
    (data) => {
      // Same for Microsoft
      const hasMsId = !!data.MICROSOFT_CLIENT_ID;
      const hasMsSecret = !!data.MICROSOFT_CLIENT_SECRET;
      return hasMsId === hasMsSecret;
    },
    {
      message:
        "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must both be set or both be unset",
    }
  );

export type Env = z.infer<typeof envSchema>;

// Parse and validate on first access
// This allows tests to import the schema without requiring valid environment
let _config: Env | undefined;

function parseConfig(): Env {
  if (!_config) {
    _config = envSchema.parse(process.env);
  }
  return _config;
}

// Proxy-based config that parses on first property access
// This provides fail-fast behavior while allowing tests to import the module
export const config = new Proxy({} as Env, {
  get(_target, prop: string | symbol): unknown {
    if (typeof prop === "symbol") {
      return undefined;
    }
    const parsed = parseConfig();
    return parsed[prop as keyof Env];
  },
  ownKeys(): ArrayLike<string | symbol> {
    const parsed = parseConfig();
    return Object.keys(parsed);
  },
  getOwnPropertyDescriptor(_target, prop): PropertyDescriptor | undefined {
    const parsed = parseConfig();
    if (prop in parsed) {
      return {
        enumerable: true,
        configurable: true,
        value: parsed[prop as keyof Env],
      };
    }
    return undefined;
  },
});
