# Implementation Spec: E01-T002

## Overview

Set up the `@raptscallions/core` package as the foundation for shared TypeScript types and Zod validation schemas across the monorepo. This package will provide type-safe validation and consistent error handling for all other packages and applications.

## Approach

The core package will serve as the single source of truth for:
- TypeScript interfaces and types
- Zod validation schemas with runtime type inference
- Custom error classes for consistent error handling
- Composable schemas that can be extended for create/update operations

Following the project's strict TypeScript standards:
- Zero use of `any` type (using `unknown` instead)
- Explicit typing with `import type` for type-only imports
- Interfaces for objects, types for unions/utilities
- Base schemas that can be extended with `.partial()` for updates

## Files to Create

| File | Purpose |
| --- | --- |
| `packages/core/src/types/index.ts` | Export barrel for all TypeScript types |
| `packages/core/src/types/user.types.ts` | User-related TypeScript interfaces |
| `packages/core/src/types/group.types.ts` | Group-related TypeScript interfaces |
| `packages/core/src/schemas/index.ts` | Export barrel for all Zod schemas |
| `packages/core/src/schemas/user.schema.ts` | User validation schemas and inferred types |
| `packages/core/src/schemas/group.schema.ts` | Group validation schemas and inferred types |
| `packages/core/src/errors/index.ts` | Export barrel for error classes |
| `packages/core/src/errors/base.error.ts` | Base AppError class and error codes enum |
| `packages/core/src/errors/common.error.ts` | Common error classes (ValidationError, NotFoundError, etc.) |

## Files to Modify

| File | Changes |
| --- | --- |
| `packages/core/package.json` | Add Zod 3.x dependency |
| `packages/core/src/index.ts` | Export types, schemas, and errors from respective directories |

## Dependencies

- Requires: E01-T001 (Basic monorepo structure setup)
- New packages: `zod@^3.22.4`

## Test Strategy

### Unit Tests

- Schema validation tests for each Zod schema
  - Valid input passes validation
  - Invalid input fails with appropriate error messages
  - Partial schemas work correctly for updates
- Error class instantiation and inheritance
- Type inference verification (compile-time tests)

### Integration Tests

- Schema composition (base schemas extended for create/update)
- Error serialization/deserialization
- Cross-package import validation

## Acceptance Criteria Breakdown

**AC1: Package exports from src/index.ts**
- Create main index.ts that exports types, schemas, and errors
- Ensure TypeScript compilation works correctly
- Verify imports work from other packages

**AC2: src/types/ directory for TypeScript interfaces**
- Create types directory with index.ts barrel export
- Implement user.types.ts with base User interface
- Implement group.types.ts with base Group interface
- Use interfaces for object shapes, types for unions

**AC3: src/schemas/ directory for Zod schemas**
- Create schemas directory with index.ts barrel export
- Implement user.schema.ts with userBaseSchema and variants
- Implement group.schema.ts with groupBaseSchema and variants
- Schemas should be composable and extensible

**AC4: Zod 3.x installed as dependency**
- Add `"zod": "^3.22.4"` to package.json dependencies
- Ensure proper ESM compatibility

**AC5: Types inferred from Zod schemas using z.infer<>**
- Export inferred types alongside schemas
- Use `import type` for type-only imports
- Maintain strict TypeScript compliance

**AC6: Initial schemas: userSchema, groupSchema (basic structure)**
- userBaseSchema: email (email validation), name (1-100 chars)
- groupBaseSchema: name, parentId (optional), settings (default empty object)
- createSchema and updateSchema variants for each
- Proper TypeScript inference for all schemas

**AC7: src/errors/ directory with typed error classes**
- Base AppError class with code, message, statusCode, details
- ValidationError, NotFoundError, UnauthorizedError classes
- Error codes enum for consistent identification
- Proper inheritance hierarchy

**AC8: Package builds with tsup or tsc**
- Configure build script to use TypeScript compiler
- Output both .js files and .d.ts declaration files
- Ensure clean dist/ output

**AC9: Exports both ESM and CJS formats**
- Configure package.json for proper module exports
- Use "type": "module" for ESM-first approach
- Provide both import and require compatibility

**AC10: Package can be imported from other workspace packages**
- Test import from other packages in workspace
- Verify TypeScript resolution works correctly
- Ensure no circular dependencies

## Edge Cases

- **Empty/null values**: Schemas properly handle required vs optional fields
- **Large strings**: Validate string length limits work correctly
- **Invalid UUIDs**: UUID validation fails gracefully with clear error messages
- **Circular imports**: Prevent circular dependencies between schema files
- **Version compatibility**: Ensure Zod version compatibility with TypeScript version

## Open Questions

- [ ] Should we include additional common schemas (dates, pagination) in initial setup?
- [ ] Do we need custom Zod transforms for consistent date handling?
- [ ] Should error classes include stack trace sanitization?
- [ ] Any specific validation rules needed for email domains or name patterns?

## Implementation Details

### User Schema Structure
```typescript
// Basic user schema covering AC6 requirements
export const userBaseSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export const createUserSchema = userBaseSchema;
export const updateUserSchema = userBaseSchema.partial();

export type User = z.infer<typeof userBaseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
```

### Group Schema Structure
```typescript
// Basic group schema covering AC6 requirements
export const groupBaseSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).default({}),
});

export const createGroupSchema = groupBaseSchema;
export const updateGroupSchema = groupBaseSchema.partial();

export type Group = z.infer<typeof groupBaseSchema>;
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
```

### Error Class Structure
```typescript
// Base error with proper typing
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

### Build Configuration
- Use TypeScript compiler (tsc) as specified in AC8
- Generate declaration files for type checking
- Configure proper module resolution for monorepo
- Ensure ESM/CJS compatibility through package.json exports

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** NOT_APPLICABLE

This task has no user-facing components. It creates the `@raptscallions/core` package containing TypeScript types, Zod validation schemas, and error classes - all of which are developer-facing infrastructure code consumed by other packages. No UX review is required.

---

## Architectural Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** NEEDS_CHANGES

### Executive Summary

The implementation spec demonstrates strong architectural understanding and correctly follows our monorepo conventions, technology stack, and design patterns. However, there are **3 critical TypeScript strictness violations** that must be fixed before implementation can proceed.

### Architectural Compliance Assessment

✅ **Technology Stack Alignment**
- Correctly uses Zod 3.x as mandated in our architecture
- Follows TypeScript strict mode requirements
- Proper ESM-first approach with package.json exports

✅ **Monorepo Structure**
- Perfect adherence to `packages/core/` convention
- Correct file organization with barrel exports
- Proper dependency declaration on E01-T001

✅ **Design Patterns**
- Uses interfaces for objects, types for unions (our convention)
- Follows our error handling hierarchy
- Composable schema design aligns with functional programming principles

✅ **Testing Strategy**
- Comprehensive test coverage plan
- Follows our AAA pattern and Vitest standards
- Includes both unit and integration test scenarios

### BLOCKING Issues (Must Fix)

**1. TypeScript Strictness Violation - Line 158**
```diff
// Current (FAILS with noUncheckedIndexedAccess)
- settings: z.record(z.unknown()).default({}),
// Required Fix
+ settings: z.record(z.string(), z.unknown()).default({}),
```
**Impact:** Our `noUncheckedIndexedAccess` TypeScript setting requires explicit key types for record types.

**2. Error Class Type Safety - Line 177**
```diff
// Current (too vague for strict mode)
- public details?: unknown
// Required Fix
+ public details?: Record<string, unknown> | string | undefined
```
**Impact:** More specific typing required for proper error handling.

**3. Missing Explicit Package Dependency**
The spec mentions adding Zod but doesn't show the actual package.json changes.
**Required:** Show explicit addition of `"zod": "^3.22.4"` to dependencies section.

### Architectural Strengths

- **Foundation Quality:** Creates a solid foundation for our type system
- **Composability:** Schema design enables clean extension patterns
- **Error Handling:** Properly implements our typed error hierarchy
- **Export Strategy:** Correct ESM/CJS dual compatibility approach
- **Dependency Management:** Clean separation and proper workspace references

### Performance Considerations

✅ **Bundle Size:** Zod adds ~12KB gzipped - acceptable for the type safety benefits
✅ **Tree Shaking:** Proper ESM exports enable dead code elimination
✅ **Runtime Validation:** Validates only when needed, not on every type operation

### Security Assessment

✅ **Input Validation:** Zod schemas provide runtime validation at system boundaries
✅ **Type Safety:** Strict TypeScript prevents many classes of runtime errors
✅ **Error Leakage:** Error classes properly encapsulate sensitive details

### Recommendation

**Status:** Send back to `ANALYZING` for the 3 critical fixes listed above.

Once these TypeScript strictness issues are resolved, this spec represents excellent architectural design and can be **APPROVED** for implementation. The foundation it creates will serve the project well throughout development.