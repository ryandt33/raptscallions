## Summary

Implements a comprehensive CASL-based authorization system with role-based permissions for all four role types (system_admin, group_admin, teacher, student). Adds Fastify middleware to build user abilities from group memberships and enforce permissions on routes.

## Task Reference

- **Epic:** E02 - Foundation Infrastructure
- **Task:** E02-T005 - CASL permission definitions and middleware
- **Spec:** `backlog/docs/specs/E02/E02-T005-spec.md`

## Changes Made

### Authorization Core (`packages/auth/`)
- **abilities.ts** - CASL ability definitions for all four roles with ltree hierarchy support
- **permissions.ts** - Fastify middleware plugin with permission decorators and helpers
- **types.ts** - Permission types, AppAbility definition, and Fastify augmentation

### Error Handling (`packages/core/src/errors/`)
- **base.error.ts** - Added `FORBIDDEN` error code constant
- **common.error.ts** - Added `ForbiddenError` class for 403 responses
- **index.ts** - Exported `ForbiddenError`

### API Integration (`apps/api/`)
- **server.ts** - Registered permission middleware after auth middleware

### Documentation (`docs/`)
- **ARCHITECTURE.md** - Comprehensive authorization section with:
  - CASL implementation details
  - Permission middleware documentation
  - Role permission breakdown
  - Group hierarchy permission examples
  - Usage patterns and code examples

## Implementation Highlights

### Four-Role Permission Model
1. **System Admin** - Full `manage all` access (bypasses all checks)
2. **Group Admin** - Manage groups, users, classes, assignments in their groups (includes ltree hierarchy)
3. **Teacher** - Create tools/assignments, manage owned resources, read group resources
4. **Student** - Read assigned tools/assignments, manage own sessions/runs

### Group Hierarchy Support
- Uses PostgreSQL ltree for hierarchical group permissions
- Group admins can manage descendant groups (e.g., district admin manages all schools)
- `canManageGroupHierarchy()` helper for ltree path matching

### Fastify Middleware Features
- `request.ability` - User's CASL ability instance (available on all requests)
- `app.requirePermission(action, subject)` - Route-level permission guard
- `app.checkResourcePermission(ability, action, subject, resource)` - Resource-level check helper
- `app.getGroupPaths(groupIds)` - Fetch ltree paths for hierarchy checks

### Type Safety
- Uses `createMongoAbility` for MongoDB-style query operators (`$in`)
- Full TypeScript types with Fastify augmentation
- Zero `any` types

## Testing

- [x] Unit tests pass (`pnpm test`) - 136/136 passing
- [x] Type checking passes (`pnpm typecheck`) - Zero errors
- [x] Linting passes (`pnpm lint`) - Zero warnings
- [x] Build succeeds (`pnpm build`) - All packages build successfully
- [x] Integration tests pass - Middleware properly registered and functional
- [x] Manual testing completed - Permission checks work across all roles

## Test Coverage

**Package: @raptscallions/auth**
- `abilities.test.ts` - 37 tests covering all roles and hierarchy scenarios
- `permissions.test.ts` - 99 tests covering middleware, decorators, and integration
- **Total:** 136 tests, 100% passing

## Breaking Changes

None - This is a new feature addition with no breaking changes to existing code.

## Deployment Notes

### Required Dependencies
The following dependency was added to `packages/auth/package.json`:
- `@casl/ability: ^6.5.0` - CASL authorization library

Install with:
```bash
pnpm install
```

### No Environment Variables Required
This feature uses existing session and database infrastructure. No new environment variables needed.

### Database Schema
Uses existing tables:
- `users` - User identity
- `groups` - Hierarchical organization with ltree paths
- `group_members` - User roles in groups

No migrations required.

## Acceptance Criteria Met

- [x] **AC1:** CASL ability definitions for all four roles (system_admin, group_admin, teacher, student)
- [x] **AC2:** Abilities account for group-scoped permissions using ltree hierarchy
- [x] **AC3:** buildAbility helper creates ability instance from user + memberships
- [x] **AC4:** Permission check helper validates user can perform action on resource
- [x] **AC5:** Fastify decorator adds `ability` property to request object (with `.can()` method)
- [x] **AC6:** requirePermission middleware blocks requests without permission (throws ForbiddenError)
- [x] **AC7:** System admins bypass all permission checks (first check in buildAbility)
- [x] **AC8:** Group admins can manage descendant groups via ltree queries (canManageGroupHierarchy)
- [x] **AC9:** Teachers can access resources in their groups (group-scoped permissions)
- [x] **AC10:** Students can only access assigned resources (assignedTo conditions)

## Reviews Completed

- ✅ **UX Review** - APPROVED with recommendations (designer)
- ✅ **Architecture Review** - APPROVED after addressing 3 blocking issues (architect)
- ✅ **Code Review** - APPROVED with zero blocking issues (reviewer)
- ✅ **QA Review** - PASSED after integration fix (qa)
- ✅ **Integration Testing** - PASSED after middleware registration (qa)
- ✅ **Documentation** - UPDATED and complete (writer)

## Related Tasks

- **Depends on:** E02-T002 (Sessions and auth middleware) - ✅ Complete
- **Blocks:** E02-T006 (Future tasks requiring permissions)

## Usage Examples

### Route-Level Permission Check
```typescript
app.post('/tools', {
  preHandler: [
    app.requireAuth,
    app.requirePermission('create', 'Tool')
  ]
}, async (request, reply) => {
  // Only users who can create Tools reach here
});
```

### Resource-Level Permission Check
```typescript
app.delete('/tools/:id', {
  preHandler: [app.requireAuth]
}, async (request, reply) => {
  const tool = await db.query.tools.findFirst({
    where: eq(tools.id, request.params.id)
  });

  if (!tool) throw new NotFoundError('Tool', request.params.id);

  if (!app.checkResourcePermission(request.ability, 'delete', 'Tool', tool)) {
    throw new ForbiddenError('You cannot delete this tool');
  }

  await toolService.delete(tool.id);
  return reply.status(204).send();
});
```

### Group Hierarchy Check
```typescript
const memberships = await db.query.groupMembers.findMany({
  where: and(
    eq(groupMembers.userId, request.user.id),
    eq(groupMembers.role, 'group_admin')
  )
});

const adminPaths = await app.getGroupPaths(memberships.map(m => m.groupId));

if (!canManageGroupHierarchy(request.ability, targetGroup.id, adminPaths, targetGroup.path)) {
  throw new ForbiddenError('You cannot manage this group');
}
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
