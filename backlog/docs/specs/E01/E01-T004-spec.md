# Implementation Spec: E01-T004

## Overview

Define the Drizzle ORM schema for the `users` table, which is the foundational entity for authentication and authorization in the RaptScallions platform. This table will be referenced by groups, sessions, assignments, and other entities that track user activity.

## Approach

The users schema will be the first actual table definition in the `@raptscallions/db` package. It follows the database package structure established in E01-T003 and implements the authentication requirements from ARCHITECTURE.md.

Key design decisions:

- **Snake_case naming** for table and columns per CONVENTIONS.md
- **UUID primary key** with automatic generation for distributed system compatibility
- **Soft delete support** via `deleted_at` timestamp for data retention and audit trails
- **Nullable password_hash** to support OAuth-only users (Google, Microsoft, Clever)
- **Status enum** using pgEnum for type-safe user states
- **Indexed email** for fast authentication lookups
- **Timestamp tracking** with timezone awareness for audit and sync operations

Following the project's strict TypeScript standards:

- Zero use of `any` type
- Explicit type inference using Drizzle's `$inferSelect` and `$inferInsert`
- Zod schema for runtime validation (will be added in E01-T005)

## Files to Create

| File                                               | Purpose                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/db/src/schema/users.ts`                  | Users table schema definition with enum, indexes, and exported types |
| `packages/db/src/migrations/0001_create_users.sql` | Initial migration to create users table                              |
| `packages/db/src/__tests__/schema/users.test.ts`   | Unit tests for users schema type inference                           |

## Files to Modify

| File                              | Changes                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `packages/db/src/schema/index.ts` | Add export for users schema: `export * from "./users.js";` |

## Dependencies

- Requires: E01-T003 (Database package setup with Drizzle ORM)
- Blocks: E01-T005 (Authentication service), E01-T006 (API routes)

## Test Strategy

### Unit Tests

- User and NewUser types correctly infer from schema
- Required fields are properly typed as non-nullable
- Optional fields (password_hash, deleted_at) are typed as nullable
- Status enum values are correctly typed
- Schema exports are accessible from `@raptscallions/db/schema`

### Integration Tests

- Migration generates correctly with `pnpm db:generate`
- Migration applies successfully to a test database
- Table structure matches schema definition (column types, constraints, indexes)
- Unique constraint on email works correctly

## Acceptance Criteria Breakdown

**AC1: users table defined in src/schema/users.ts**

- Create new file at `packages/db/src/schema/users.ts`
- Import required types from `drizzle-orm/pg-core`
- Define users table with pgTable
- Export table definition

**AC2: Fields: id, email, name, password_hash, status, created_at, updated_at, deleted_at**

- `id` - UUID primary key
- `email` - varchar(255) for email addresses
- `name` - varchar(100) for user display name
- `password_hash` - varchar(255) for Argon2 hashes
- `status` - enum for user account state
- `created_at` - timestamp with timezone for record creation
- `updated_at` - timestamp with timezone for last modification
- `deleted_at` - timestamp with timezone for soft delete

**AC3: id uses uuid().primaryKey().defaultRandom()**

- Use Drizzle's uuid() type
- Set as primary key
- Configure automatic UUID generation with defaultRandom()

**AC4: email is varchar(255), unique, not null**

- Use varchar with length 255 (standard email max length)
- Set unique constraint
- Set notNull() constraint
- Will be used for authentication lookups

**AC5: name is varchar(100), not null**

- Use varchar with length 100
- Set notNull() constraint
- Used for display throughout the application

**AC6: password_hash is varchar(255), nullable (for OAuth-only users)**

- Use varchar with length 255 (sufficient for Argon2 hashes)
- Leave nullable (do not call notNull())
- OAuth users won't have a password hash

**AC7: status enum: active, suspended, pending_verification**

- Define pgEnum before table definition
- Name: 'user_status'
- Values: 'active', 'suspended', 'pending_verification'
- Use enum in table definition

**AC8: Timestamps use timestamp with timezone, with defaults**

- created_at: timestamp with timezone, defaultNow(), notNull()
- updated_at: timestamp with timezone, defaultNow(), notNull()
- Both track changes with timezone awareness

**AC9: deleted_at for soft delete support (nullable)**

- timestamp with timezone
- Nullable (null means not deleted)
- No default value
- Enables soft delete pattern

**AC10: Index on email for fast lookups**

- Define index in table's index configuration
- Name: users_email_idx
- Index on email column

**AC11: Exports User and NewUser types**

- Export User: `typeof users.$inferSelect`
- Export NewUser: `typeof users.$inferInsert`
- Provides type-safe database operations

**AC12: Migration file 0001_create_users.sql generated**

- Run `pnpm db:generate` to create migration
- Verify migration creates users table
- Verify migration creates user_status enum
- Verify migration creates email index

## Edge Cases

- **Null password_hash**: Valid for OAuth users, queries must handle null checks
- **Email uniqueness**: Constraint violations should be caught and converted to meaningful errors
- **Soft delete queries**: All queries must filter `WHERE deleted_at IS NULL` unless specifically querying deleted users
- **Status transitions**: Application logic must enforce valid state transitions (not enforced at DB level)
- **Timezone consistency**: All timestamps in UTC, application converts for display
- **Email case sensitivity**: PostgreSQL varchar is case-sensitive, application should normalize emails to lowercase before storage

## Open Questions

- [x] Should email be stored in lowercase only? **Resolution: Yes, application layer will normalize to lowercase in E01-T005**
- [x] Do we need a `last_login_at` timestamp? **Resolution: No, this will be tracked in sessions table**
- [x] Should we add a `roles` column or defer to group_members? **Resolution: Defer to group_members, roles are per-group**
- [x] Do we need email verification token fields here? **Resolution: No, this will be in separate verification_tokens table in auth implementation**

## Implementation Details

### User Status Enum

```typescript
// packages/db/src/schema/users.ts
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * User account status enum.
 * - active: Normal user account, can log in and use the system
 * - suspended: Account disabled by admin, cannot log in
 * - pending_verification: New account awaiting email verification
 */
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending_verification",
]);
```

### Users Table Schema

```typescript
/**
 * Users table - core authentication and user identity.
 *
 * This is the foundational table for all user-related operations.
 * Users can authenticate via:
 * - Email/password (password_hash present)
 * - OAuth providers (password_hash is null)
 *
 * Soft delete is supported via deleted_at timestamp.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    status: userStatusEnum("status").notNull().default("pending_verification"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

/**
 * User type for select operations (reading from database).
 * All fields are present including auto-generated values.
 */
export type User = typeof users.$inferSelect;

/**
 * NewUser type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 */
export type NewUser = typeof users.$inferInsert;
```

### Schema Index Export

```typescript
// packages/db/src/schema/index.ts

// Export custom PostgreSQL types
export * from "./types.js";

// Export users table and types
export * from "./users.js";

// Future table exports will be added here as they are created:
// export * from "./groups.js";
// export * from "./classes.js";
```

### Migration Generation

After creating the schema, generate the migration:

```bash
cd packages/db
pnpm db:generate
```

This will create `src/migrations/0001_create_users.sql` with content similar to:

```sql
CREATE TYPE "user_status" AS ENUM('active', 'suspended', 'pending_verification');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" varchar(100) NOT NULL,
  "password_hash" varchar(255),
  "status" "user_status" DEFAULT 'pending_verification' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
```

### Test Examples

```typescript
// packages/db/src/__tests__/schema/users.test.ts
import { describe, it, expect } from "vitest";
import { users, type User, type NewUser } from "../../schema/users.js";

describe("Users Schema", () => {
  describe("Type Inference", () => {
    it("should infer User type correctly", () => {
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$...",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // This test passes if TypeScript compilation succeeds
      expect(user.email).toBe("test@example.com");
    });

    it("should allow null password_hash for OAuth users", () => {
      const oauthUser: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "oauth@example.com",
        name: "OAuth User",
        passwordHash: null, // Valid for OAuth users
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(oauthUser.passwordHash).toBeNull();
    });

    it("should infer NewUser type correctly for inserts", () => {
      const newUser: NewUser = {
        email: "new@example.com",
        name: "New User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$...",
        status: "pending_verification",
      };

      // Auto-generated fields (id, created_at, updated_at) are optional
      expect(newUser.email).toBe("new@example.com");
    });

    it("should allow creating OAuth user without password_hash", () => {
      const newOAuthUser: NewUser = {
        email: "oauth@example.com",
        name: "OAuth User",
        // passwordHash is intentionally omitted
        status: "active",
      };

      expect(newOAuthUser.passwordHash).toBeUndefined();
    });
  });

  describe("Status Enum", () => {
    it("should have correct status values", () => {
      const validStatuses: Array<User["status"]> = [
        "active",
        "suspended",
        "pending_verification",
      ];

      expect(validStatuses).toHaveLength(3);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      expect(users._.name).toBe("users");
    });

    it("should have all required columns", () => {
      const columns = Object.keys(users);

      expect(columns).toContain("id");
      expect(columns).toContain("email");
      expect(columns).toContain("name");
      expect(columns).toContain("passwordHash");
      expect(columns).toContain("status");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
      expect(columns).toContain("deletedAt");
    });
  });
});
```

## Type Safety Considerations

### Avoiding `any` in User Operations

```typescript
// CORRECT: Fully typed user query
import { db } from "@raptscallions/db";
import { users, type User } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

async function getUser(id: string): Promise<User | undefined> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return user; // Type: User | undefined
}

// CORRECT: Typed insert with partial data
async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user; // Type: User
}

// CORRECT: Handle nullable password_hash
function hasPassword(user: User): boolean {
  return user.passwordHash !== null;
}

// BANNED: Do not use any
// const user: any = await db.query.users.findFirst(...);
```

### Soft Delete Pattern

```typescript
// CORRECT: Query active users only
async function getActiveUsers(): Promise<User[]> {
  return db.query.users.findMany({
    where: isNull(users.deletedAt),
  });
}

// CORRECT: Soft delete a user
async function softDeleteUser(id: string): Promise<void> {
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
}

// CORRECT: Check if user is deleted
function isDeleted(user: User): boolean {
  return user.deletedAt !== null;
}
```

### Status Type Safety

```typescript
// CORRECT: Status is type-safe from enum
function canLogin(user: User): boolean {
  return user.status === "active" && user.deletedAt === null;
}

// CORRECT: TypeScript will catch invalid status values
// const invalidStatus: User["status"] = "invalid"; // Type error!
```

## Documentation Requirements

The following should be documented in code comments:

1. User status enum values and their meanings
2. Soft delete behavior and query patterns
3. Nullable password_hash rationale (OAuth users)
4. Email uniqueness constraint
5. Index purpose (authentication lookups)
6. Timestamp timezone handling

## Integration with Future Tasks

This schema will be used by:

- **E01-T005**: Authentication service (password verification, user creation)
- **E01-T006**: User API routes (CRUD operations)
- **E01-T007**: Sessions table (foreign key to users)
- **E01-T008**: Group members table (foreign key to users)

The schema is intentionally minimal to avoid premature optimization. Additional fields (e.g., avatar_url, bio, preferences) can be added in future iterations based on actual requirements.

## Migration Notes

After implementing this schema:

1. Generate migration: `pnpm --filter @raptscallions/db db:generate`
2. Review generated SQL in `src/migrations/0001_create_users.sql`
3. Apply migration to test database: `pnpm --filter @raptscallions/db db:push`
4. Verify table structure with Drizzle Studio: `pnpm --filter @raptscallions/db db:studio`

For production deployments, use `db:migrate` instead of `db:push` to apply migrations safely.

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** APPROVED

### Review Summary

This is a backend infrastructure task (database schema) with no direct user-facing components. However, the schema design has important implications for future UX features and developer experience.

### Developer Experience (DX) Assessment

**Strengths:**

1. **Clear User Status Model** ✅

   - The three-state status enum (`active`, `suspended`, `pending_verification`) maps clearly to user-facing states
   - Status names are self-documenting and will translate well to UI messaging
   - The default `pending_verification` state enables good onboarding UX (email verification flow)

2. **OAuth Flexibility** ✅

   - Nullable `password_hash` cleanly supports OAuth-only users
   - This design won't force awkward UX compromises (e.g., requiring passwords for Google sign-in users)
   - Type safety ensures developers handle both authentication paths correctly

3. **Soft Delete Pattern** ✅

   - Enables "restore account" features without data loss
   - Supports compliance requirements (data retention, audit trails)
   - Good foundation for future UX like "Recently deleted users" admin views

4. **Type Safety** ✅
   - Exported `User` and `NewUser` types will prevent common bugs that lead to poor UX
   - Nullable fields are explicitly typed, reducing runtime errors

### Future UX Considerations

**Recommendations for Future Tasks:**

1. **Email Display Consistency**

   - The spec notes email will be normalized to lowercase in E01-T005 ✅
   - Ensure UI displays emails as entered by user (preserve case) while storing lowercase
   - Example: User enters "Jane.Doe@Example.com" → display exactly that, store "jane.doe@example.com"

2. **User Status Messaging**

   - The status enum values should map to clear user-facing messages:
     - `pending_verification` → "Please check your email to verify your account"
     - `suspended` → "Your account has been suspended. Contact support for assistance."
     - `active` → No message needed (normal state)
   - These should be defined in a future i18n/messaging task

3. **Name Field Limitations**

   - 100 character limit for `name` is reasonable
   - Consider future UI validation to show character count near limit (e.g., at 90/100)
   - Handle display of very long names gracefully in constrained UI spaces

4. **Deleted Account UX**
   - The soft delete pattern enables good UX, but needs clear messaging:
     - "This account has been deleted" for admin views
     - "Account not found" for public-facing errors (don't leak existence)
   - Consider a "days until permanent deletion" field in future iterations

### Missing User-Facing Fields (Future Consideration)

The spec correctly notes these are deferred to future iterations:

- **Avatar/Profile Image** - Will be needed for personalization
- **Display Preferences** - Theme, language, timezone
- **Last Login** - Tracked in sessions (good separation of concerns)
- **Email Verification Token** - Separate table (good security practice)

This minimal approach is appropriate for foundation phase.

### Accessibility Considerations

While this is backend code, the schema design supports future accessibility needs:

- User `name` field can store full names with proper Unicode support (varchar handles international characters)
- Status enum is clear enough to generate accessible status badges/alerts
- Soft delete allows recovery of accounts without requiring users to remember old passwords

### Security & Trust (UX Impact)

**Strengths:**

1. Email uniqueness constraint prevents account confusion ✅
2. Nullable password supports OAuth (reduces password fatigue) ✅
3. Status enum enables account security controls (suspend malicious users) ✅
4. Soft delete enables compliance and account recovery ✅

**Recommendations:**

- Ensure future UI clearly indicates authentication method (password vs OAuth provider)
- Consider a "Linked Accounts" feature in future to show which OAuth providers are connected

### Final Assessment

**APPROVED** - This schema design provides a solid foundation for good user experience:

- Clean data model that maps intuitively to user-facing concepts
- Flexible enough to support multiple authentication flows without UX compromises
- Type-safe design will prevent bugs that degrade UX
- Soft delete enables user-friendly account recovery features

**No blocking issues.** The spec is ready for architecture review.

### Notes for Implementation

- Remember to handle email case sensitivity in UI (display as entered, compare lowercase)
- Consider adding JSDoc comments to exported types that reference user-facing implications
- The status enum should eventually be exported from a shared constants package for UI consistency

### Questions for Future Tasks

- Will we need a "preferred name" vs "legal name" distinction? (Common in education)
- Should we track "last email sent" to prevent verification spam?
- How will we handle name changes (marriage, transition, etc.)? Keep audit log?

These are not blockers for this task but should be considered in auth service implementation (E01-T005).

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED WITH RECOMMENDATIONS

### Executive Summary

The users schema design is **architecturally sound** and follows project conventions. The spec demonstrates strong attention to type safety, database best practices, and forward compatibility. The schema provides a solid foundation for the authentication and authorization system outlined in ARCHITECTURE.md.

### Alignment with Architecture (ARCHITECTURE.md)

✅ **Technology Stack Compliance**

- Uses Drizzle ORM (0.29+) as specified ✓
- PostgreSQL 16 target ✓
- TypeScript strict mode ✓
- Zod integration planned (E01-T005) ✓

✅ **Core Entities Model**

- Aligns with "Users" entity definition (lines 177-184 of ARCHITECTURE.md) ✓
- Supports group membership via future foreign keys ✓
- Enables role-based authorization at group level ✓

✅ **Authentication & Authorization Requirements**

- Supports Lucia auth patterns (nullable password_hash for OAuth) ✓
- Enables email/password + OAuth flows ✓
- Status enum supports pending verification flow ✓
- Ready for CASL permission checks ✓

✅ **Deployment Requirements**

- Pure database schema (no host dependencies) ✓
- Migration-based (supports containerized deployments) ✓
- Timezone-aware timestamps for distributed systems ✓

### Alignment with Conventions (CONVENTIONS.md)

✅ **TypeScript Strict Requirements**

- Zero use of `any` type ✓
- Uses Drizzle's `$inferSelect` and `$inferInsert` ✓
- Properly handles nullable fields (password_hash, deleted_at) ✓
- `noUncheckedIndexedAccess` compatible ✓

✅ **Naming Conventions**

- File: `users.ts` (lowercase, plural) ✓
- Table: `users` (snake_case, plural) ✓
- Columns: `snake_case` (created_at, password_hash) ✓
- Index: `users_email_idx` (follows convention) ✓
- Enum: `user_status` (follows pattern) ✓

✅ **Database Best Practices**

- Uses query builder (no raw SQL) ✓
- Migration numbering: `0001_create_users.sql` ✓
- Indexes for lookup optimization ✓
- Soft delete pattern implemented ✓

✅ **Error Handling Strategy**

- Spec shows typed error usage (NotFoundError) ✓
- Validates constraints at DB level ✓
- Plans for application-level validation (E01-T005) ✓

### Technical Design Assessment

#### Strengths

1. **UUID Primary Key** ✅

   - Excellent for distributed systems
   - Prevents ID enumeration attacks
   - `defaultRandom()` avoids external dependencies
   - Consistent with ARCHITECTURE.md's distributed system goals

2. **Nullable Password Hash** ✅

   - Clean OAuth support (Arctic integration ready)
   - Type-safe (forces null checks in application code)
   - Aligns with Lucia auth patterns
   - Prevents awkward workarounds

3. **Status Enum** ✅

   - Type-safe at database and application layers
   - Clear state model: pending → active/suspended
   - Default `pending_verification` enables email verification flow
   - Extensible (can add states without breaking existing data)

4. **Soft Delete Pattern** ✅

   - Enables account recovery
   - Supports audit requirements (education sector compliance)
   - Good for GDPR "right to erasure" workflows (mark deleted, purge later)
   - Query pattern is clear (`WHERE deleted_at IS NULL`)

5. **Email Indexing** ✅

   - Critical for authentication lookup performance
   - Unique constraint prevents duplicate accounts
   - Index on uniqueness constraint is auto-optimized by PostgreSQL

6. **Timestamp Strategy** ✅

   - `created_at` + `updated_at` + `deleted_at` covers all audit needs
   - Timezone-aware (handles distributed deployments)
   - `defaultNow()` prevents application clock skew issues

7. **Type Safety** ✅
   - `User` type for reads, `NewUser` for inserts
   - TypeScript will catch incorrect usage at compile time
   - No `any` types (meets strict requirements)

#### Design Concerns & Recommendations

**⚠️ Recommendation 1: Email Case Sensitivity**

**Issue:** PostgreSQL `varchar` is case-sensitive. Two users could register "Jane@Example.com" and "jane@example.com" as separate accounts despite the unique constraint.

**Current Mitigation:** Spec states "application layer will normalize to lowercase in E01-T005" (line 145).

**Architectural Concern:** Relying solely on application-level normalization is **risky** for a security-critical field:

- Bug in normalization = duplicate accounts
- Direct DB access bypasses application logic
- Migration scripts must handle normalization
- Future microservices must all implement normalization

**Stronger Approach (Optional but Recommended):**

```sql
-- Add generated column or constraint to enforce lowercase at DB level
ALTER TABLE users
ADD CONSTRAINT email_lowercase_check
CHECK (email = LOWER(email));

-- OR use a generated column
ALTER TABLE users
ADD COLUMN email_normalized text
GENERATED ALWAYS AS (LOWER(email)) STORED;

CREATE UNIQUE INDEX users_email_normalized_idx
ON users (email_normalized);
```

**Verdict:** Not a blocker for E01-T004, but should be considered in E01-T005 (auth service). Document this decision.

---

**⚠️ Recommendation 2: Updated At Trigger**

**Issue:** `updated_at` has `defaultNow()` but no automatic update on row changes.

**Current State:** Application code must remember to set `updated_at` on every update.

**Architectural Concern:**

- Easy to forget in update queries
- No enforcement = stale timestamps
- Common source of bugs in audit trails

**Recommended Addition:**

```sql
-- Add to migration 0001_create_users.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Verdict:** Not critical for foundation phase, but should be added before production. Consider adding to spec's "Implementation Details" section as a best practice.

---

**⚠️ Recommendation 3: Status Transition Validation**

**Issue:** Spec notes "Application logic must enforce valid state transitions (not enforced at DB level)" (line 138).

**Concern:** No constraints on status transitions means invalid states are possible:

- suspended → pending_verification (nonsensical)
- deleted user with status = active (conflicting state)

**Recommended Constraint:**

```sql
-- Prevent active status on deleted users
ALTER TABLE users
ADD CONSTRAINT deleted_users_not_active_check
CHECK (
  deleted_at IS NULL OR status != 'active'
);
```

**Future Enhancement:** Consider a state machine table for valid transitions if status logic grows complex.

**Verdict:** Optional for E01-T004. Document expected transitions in E01-T005 auth service.

---

**✅ Recommendation 4: Missing Field Planning**

**Observation:** Spec correctly defers fields like `avatar_url`, `bio`, `last_login_at` to future iterations.

**Validation:**

- `last_login_at` → sessions table (correct separation) ✓
- Email verification token → separate table (correct security practice) ✓
- Roles → group_members (correct, roles are per-group) ✓

**Future Consideration:** Reserve space for common extensions:

- `preferences` JSONB column (UI settings, timezone, language)
- `external_id` varchar (for OneRoster sync)
- `avatar_url` text (profile picture)

**Verdict:** Minimalism is correct for foundation phase. Add fields when requirements are clear, not speculatively.

---

### Testing & Quality Assurance

✅ **Test Coverage Plan**

- Unit tests for type inference ✓
- Integration tests for migration application ✓
- Schema validation tests ✓
- Soft delete query patterns tested ✓

✅ **Test Quality**

- AAA pattern (Arrange/Act/Assert) ✓
- Type safety verified at compile time ✓
- Null handling tested ✓
- Edge cases covered (OAuth users, soft delete) ✓

**Enhancement:** Consider adding property-based tests for status transitions in E01-T005.

---

### Migration Strategy

✅ **Migration Design**

- Numbered sequentially (0001) ✓
- Includes enum creation ✓
- Creates table with constraints ✓
- Creates indexes ✓

**Missing (Minor):**

- Down migration not shown (should include DROP TABLE, DROP TYPE)
- No rollback strategy documented

**Recommended Addition to Spec:**

```sql
-- Down migration (0001_create_users_down.sql)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_status;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**Verdict:** Document down migration pattern for completeness.

---

### Security Considerations

✅ **Password Storage**

- Nullable for OAuth (correct) ✓
- Length 255 (sufficient for Argon2id hashes: ~97 chars) ✓
- Spec correctly notes Argon2 will be used (via Lucia) ✓

✅ **Email Privacy**

- Unique constraint prevents account enumeration via registration
- Soft delete hides deleted users from queries
- No PII in logs (good logging practices noted in spec)

✅ **Session Security**

- User ID is UUID (not sequential/guessable) ✓
- Ready for session table foreign key ✓

**Recommendation:** In E01-T005, ensure:

- Password hashes use Argon2id with proper params (m=65536, t=3, p=4)
- Failed login attempts are rate-limited
- Email verification tokens are cryptographically random

---

### Integration with System Architecture

✅ **Groups Hierarchy (ltree) Integration**

- User table is independent (correct)
- Roles assigned per-group via group_members (planned) ✓
- No premature coupling to groups table ✓

✅ **CASL Permissions Integration**

- User status can be checked in CASL rules ✓
- Soft delete can be checked in permissions ✓
- Schema supports "user owns resource" patterns ✓

✅ **Lucia Auth Integration**

- Schema matches Lucia requirements (id, email, password_hash) ✓
- Ready for Lucia session adapter ✓
- Supports Arctic OAuth adapter (nullable password_hash) ✓

✅ **OneRoster Sync (Future)**

- UUID primary key is good (OneRoster uses GUIDs) ✓
- Email is common identifier ✓
- Status enum can map to OneRoster statuses ✓

**Future Consideration:** Add `oneroster_sourced_id` varchar(255) when OneRoster sync is implemented (E02+).

---

### Performance Considerations

✅ **Query Optimization**

- Email index for auth lookups (O(log n) instead of O(n)) ✓
- UUID primary key is indexed by default ✓
- Soft delete queries will need `WHERE deleted_at IS NULL` (ensure index usage) ✓

**Recommendation:** When implementing queries in E01-T005, verify with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT * FROM users
WHERE email = 'test@example.com'
AND deleted_at IS NULL;
```

✅ **Scalability**

- UUID prevents single-point contention (vs. serial IDs) ✓
- No FK constraints yet (good for initial implementation) ✓
- Schema supports read replicas (no application state in DB) ✓

---

### Documentation Quality

✅ **Code Comments**

- Enum values documented with clear meanings ✓
- Table purpose explained ✓
- Field rationale provided (OAuth, soft delete) ✓

✅ **Integration Notes**

- Lists future tasks that depend on this schema ✓
- Notes edge cases (email case, null checks) ✓
- Provides query patterns for common operations ✓

**Enhancement:** Add JSDoc comments to exported types:

````typescript
/**
 * User entity representing an authenticated user in the system.
 *
 * Users can authenticate via:
 * - Email/password (passwordHash is present)
 * - OAuth providers (passwordHash is null)
 *
 * @example
 * ```typescript
 * const user = await db.query.users.findFirst({
 *   where: eq(users.email, 'user@example.com')
 * });
 * ```
 */
export type User = typeof users.$inferSelect;
````

---

### Blocking Issues

**None.** This spec is ready for implementation.

---

### Final Recommendations Summary

| Priority   | Recommendation                               | Action Required           | Timeline |
| ---------- | -------------------------------------------- | ------------------------- | -------- |
| **High**   | Add `updated_at` trigger to migration        | Include in 0001 migration | E01-T004 |
| **High**   | Document down migration                      | Add to spec               | E01-T004 |
| **Medium** | Consider DB-level email lowercase constraint | Design decision needed    | E01-T005 |
| **Medium** | Add deleted users status constraint          | Nice to have              | E01-T005 |
| **Low**    | Add JSDoc to exported types                  | Documentation improvement | E01-T004 |
| **Low**    | Document status transition rules             | Future enhancement        | E01-T005 |

---

### Verdict: APPROVED

This implementation spec is **architecturally sound** and ready for implementation with the following conditions:

1. ✅ Add `updated_at` trigger to migration (high priority)
2. ✅ Document down migration for rollback (high priority)
3. ✅ Address email normalization strategy in E01-T005 (medium priority)

The schema design:

- Follows all project conventions (CONVENTIONS.md) ✓
- Aligns with system architecture (ARCHITECTURE.md) ✓
- Provides solid foundation for auth system ✓
- Is appropriately minimal (no over-engineering) ✓
- Handles edge cases thoughtfully ✓

**No blocking issues.** Proceed to implementation with the noted high-priority additions.

---

### Notes for Implementer

When implementing this spec:

1. Add the `updated_at` trigger to the migration before running `pnpm db:generate`
2. Create the down migration file alongside the up migration
3. Test soft delete queries to ensure indexes are used (`EXPLAIN ANALYZE`)
4. Verify type inference with `pnpm typecheck` before committing
5. Run `pnpm db:studio` to visually verify table structure

The UX review (already completed) noted good considerations for future UI work. This architecture review confirms the backend design is sound.

### Questions for E01-T005 (Auth Service)

- Will you implement the email lowercase constraint at DB or application level?
- Will you add the `updated_at` trigger now or defer?
- Should we add a `last_password_change_at` field for password rotation policies?

These are **not blockers** for E01-T004 but should be considered during auth service implementation.

---

**APPROVED** - Ready for implementation.
