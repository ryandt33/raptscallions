---
title: Validation Patterns
description: Zod schema validation with Fastify type provider integration
related_code:
  - packages/core/src/schemas/**/*.ts
  - apps/api/src/routes/auth.routes.ts
  - apps/api/src/config.ts
  - packages/core/src/schemas/message-meta.schema.ts
last_verified: 2026-01-14
---

# Validation Patterns

RaptScallions uses Zod for all input validation. Zod provides runtime validation with TypeScript type inference, ensuring that validated data is correctly typed throughout the codebase.

## Why Zod?

| Feature | Zod | JSON Schema | Joi/Yup |
|---------|-----|-------------|---------|
| TypeScript inference | Native | Requires tooling | Limited |
| Runtime validation | Yes | Requires AJV | Yes |
| Composable schemas | Excellent | Limited | Moderate |
| Error messages | Customizable | Basic | Customizable |
| Bundle size | ~12kb | +AJV ~50kb | ~25kb |

## Basic Schema Definition

Schemas live in `packages/core/src/schemas/`:

```typescript
// packages/core/src/schemas/auth.schema.ts
import { z } from "zod";

/**
 * Schema for user registration.
 * Validates email format, name length, and password strength.
 */
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password too long"),
});

// Type inference - no manual type definition needed
export type RegisterInput = z.infer<typeof registerSchema>;
```

## Schema Composition

### Extending Schemas

```typescript
// Base schema
export const userBaseSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// Extended for creation (add password)
export const createUserSchema = userBaseSchema.extend({
  password: z.string().min(8),
});

// Partial for updates (all fields optional)
export const updateUserSchema = userBaseSchema.partial();
```

### Picking and Omitting

```typescript
// Pick specific fields
const emailOnlySchema = userBaseSchema.pick({ email: true });

// Omit specific fields
const userWithoutEmailSchema = userBaseSchema.omit({ email: true });
```

### Merging Schemas

```typescript
const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

const userWithTimestamps = userBaseSchema.merge(timestampSchema);
```

## Fastify Integration

The Zod type provider connects Zod schemas to Fastify's validation:

```typescript
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { registerSchema, type RegisterInput } from "@raptscallions/core";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Enable Zod type provider for this plugin
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/register",
    {
      schema: { body: registerSchema },
    },
    async (request, reply) => {
      // request.body is typed as RegisterInput
      const { email, name, password } = request.body;

      // TypeScript knows these are strings
      console.log(email.toLowerCase()); // No error
    }
  );
};
```

### Server Setup

The type provider is configured in server.ts:

```typescript
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

const app = fastify({ /* options */ });

// Set up Zod type provider globally
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
```

## Validating Different Request Parts

### Request Body

```typescript
const bodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

typedApp.post("/users", {
  schema: { body: bodySchema },
}, handler);
```

### Route Parameters

```typescript
const paramsSchema = z.object({
  userId: z.string().uuid(),
});

typedApp.get("/users/:userId", {
  schema: { params: paramsSchema },
}, handler);
```

### Query String

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

typedApp.get("/users", {
  schema: { querystring: querySchema },
}, handler);
```

::: tip Use z.coerce for Query Params
Query parameters are always strings. Use `z.coerce.number()` to convert them to numbers automatically.
:::

### Headers

```typescript
const headersSchema = z.object({
  "x-api-key": z.string().min(1),
});

typedApp.get("/protected", {
  schema: { headers: headersSchema },
}, handler);
```

## Common Validation Patterns

### Email Validation

```typescript
z.string().email("Invalid email format")
```

### Password Validation

```typescript
z.string()
  .min(8, "Password must be at least 8 characters")
  .max(255, "Password too long")
  // Optional: require complexity
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/[0-9]/, "Password must contain number")
```

### UUID Validation

```typescript
z.string().uuid("Invalid UUID format")
```

### Enum Validation

```typescript
const roleSchema = z.enum(["student", "teacher", "group_admin", "system_admin"]);
```

### Date Validation

```typescript
// ISO string to Date
z.string().datetime().transform((s) => new Date(s))

// Coerce various inputs to Date
z.coerce.date()
```

### Optional with Default

```typescript
z.string().optional().default("default value")
z.number().default(10)
```

### Arrays

```typescript
z.array(z.string().email()).min(1).max(10)
```

### Nested Objects

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string().length(2), // ISO country code
});

const userSchema = z.object({
  name: z.string(),
  address: addressSchema.optional(),
});
```

## Environment Validation

Environment variables are validated at startup:

```typescript
// apps/api/src/config.ts
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  // OAuth - both must be set or both unset
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
```

### Refinements for Complex Rules

```typescript
envSchema.refine(
  (data) => {
    const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
    return hasGoogleId === hasGoogleSecret; // Both true or both false
  },
  {
    message:
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be unset",
  }
);
```

## Validation Error Responses

When Zod validation fails, Fastify returns a 400 response:

```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body/email Invalid email format"
}
```

### Custom Error Formatting

You can customize error messages in the schema:

```typescript
z.string()
  .email({ message: "Please enter a valid email address" })
  .min(1, { message: "Email is required" });
```

## Schema Organization

### Directory Structure

```
packages/core/src/schemas/
├── index.ts          # Re-exports all schemas
├── auth.schema.ts    # Login, register schemas
├── user.schema.ts    # User CRUD schemas
├── group.schema.ts   # Group schemas
└── oauth.schema.ts   # OAuth callback schemas
```

### Index Re-exports

```typescript
// packages/core/src/schemas/index.ts
export * from "./auth.schema.js";
export * from "./user.schema.js";
export * from "./group.schema.js";
export * from "./oauth.schema.js";
```

### Usage in Routes

```typescript
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "@raptscallions/core";
```

## Best Practices

### Keep schemas in @raptscallions/core

Schemas are shared between frontend and backend. Keeping them in the core package ensures consistency.

### Export types alongside schemas

Always export the inferred type:

```typescript
export const mySchema = z.object({ /* ... */ });
export type MyInput = z.infer<typeof mySchema>;
```

### Use custom error messages

Default Zod messages can be cryptic. Provide user-friendly messages:

```typescript
// BAD
z.string().min(8)
// Error: "String must contain at least 8 character(s)"

// GOOD
z.string().min(8, "Password must be at least 8 characters")
// Error: "Password must be at least 8 characters"
```

### Validate at boundaries

Validate data at system boundaries:

- API request bodies
- Environment variables
- External API responses
- User uploads

Don't re-validate data that's already been validated.

### Use .partial() for updates

For PATCH endpoints where any field can be updated:

```typescript
const updateSchema = createSchema.partial();
```

## Message Meta Validation

The message metadata field in chat sessions uses a Zod schema for extensible validation with type safety.

### Schema Definition

```typescript [packages/core/src/schemas/message-meta.schema.ts]
import { z } from "zod";

export const extractionSchema = z.object({
  type: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
});

export const messageMetaSchema = z
  .object({
    tokens: z.number().int().positive().optional(),
    model: z.string().optional(),
    latency_ms: z.number().nonnegative().optional(),
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    finish_reason: z
      .enum(["stop", "length", "content_filter", "error"])
      .optional(),
    extractions: z.array(extractionSchema).optional(),
  })
  .passthrough(); // Allow additional fields

export type MessageMeta = z.infer<typeof messageMetaSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
```

### Using .passthrough() for Extensibility

The `.passthrough()` modifier allows additional fields beyond those explicitly defined. This is useful for extensible metadata where future features may add new fields without schema changes.

**Example:**

```typescript
// Valid - known fields
const meta1: MessageMeta = {
  tokens: 150,
  model: "claude-sonnet-4",
  latency_ms: 432,
};

// Valid - with additional custom fields
const meta2: MessageMeta = {
  tokens: 150,
  custom_field: "custom_value",
  nested: { data: 123 },
};

// Validation allows both
messageMetaSchema.parse(meta1); // ✓
messageMetaSchema.parse(meta2); // ✓
```

::: tip When to Use .passthrough()
Use `.passthrough()` for JSONB fields that need extensibility. Use `.strict()` for API inputs where unknown fields should be rejected.
:::

### Validation Helpers

The schema exports helper functions for safe validation:

```typescript
import {
  parseMessageMeta,
  safeParseMessageMeta,
} from "@raptscallions/core/schemas";

// Throws ZodError on validation failure
const validMeta = parseMessageMeta(unknownData);

// Returns success/error result without throwing
const result = safeParseMessageMeta(unknownData);
if (result.success) {
  console.log(result.data.tokens); // Type-safe access
} else {
  console.error(result.error); // ZodError
}
```

### Example Usage

**Validating message metadata before storage:**

```typescript
import { messageMetaSchema, type MessageMeta } from "@raptscallions/core";

// Chat service
async function saveAssistantMessage(
  sessionId: string,
  content: string,
  aiResponse: AIResponse
) {
  // Build metadata from AI response
  const meta: MessageMeta = {
    tokens: aiResponse.usage.total_tokens,
    prompt_tokens: aiResponse.usage.prompt_tokens,
    completion_tokens: aiResponse.usage.completion_tokens,
    model: aiResponse.model,
    latency_ms: aiResponse.latency,
    finish_reason: aiResponse.finish_reason,
  };

  // Validate before storing
  const validatedMeta = messageMetaSchema.parse(meta);

  // Store in database
  await db.insert(messages).values({
    sessionId,
    role: "assistant",
    content,
    seq: nextSeq,
    meta: validatedMeta, // JSONB field
  });
}
```

**Extracting validated metadata from stored messages:**

```typescript
import { safeParseMessageMeta } from "@raptscallions/core";

const message = await db.query.messages.findFirst({
  where: eq(messages.id, messageId),
});

// Safely parse JSONB meta field
const result = safeParseMessageMeta(message.meta);

if (result.success) {
  // Type-safe access to validated fields
  const tokenUsage = result.data.tokens ?? 0;
  const model = result.data.model ?? "unknown";

  // Analytics
  await trackTokenUsage(tokenUsage, model);
}
```

::: info Related Documentation
See [Chat Sessions Schema](/database/concepts/chat-schema#message-metadata) for more details on the messages table and metadata field usage.
:::

## Related Pages

- [Route Handlers](/api/patterns/route-handlers) — Using schemas in routes
- [Error Handling](/api/patterns/error-handling) — Validation error responses
- [Fastify Setup](/api/concepts/fastify-setup) — Type provider configuration
- [Chat Sessions Schema](/database/concepts/chat-schema) — Message metadata field details
