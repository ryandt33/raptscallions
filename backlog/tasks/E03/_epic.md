---
id: "E03"
title: "Core Entity CRUD"
description: "Groups, Classes, Tools, and Assignments services and API routes with full CRUD operations"
status: "planned"
priority: 3
estimated_weeks: 2
depends_on_epics: ["E01", "E02"]
---

# Epic E03: Core Entity CRUD

## Goals

Implement the core domain entities (Groups, Classes, Tools, Assignments) with complete CRUD services, API routes, and business logic. This epic focuses on data management and API layer, not runtime execution.

## Success Criteria

- [ ] Groups API supports hierarchy navigation (ancestors, descendants, children)
- [ ] Classes API supports roster management (add/remove students, teachers)
- [ ] Tools API supports YAML definition parsing and validation
- [ ] Assignments API links tools to classes with configuration
- [ ] All entities respect group-based permissions via CASL
- [ ] Services encapsulate business logic with proper error handling
- [ ] 80%+ test coverage for all services and routes
- [ ] API follows RESTful conventions with consistent error responses

## Tasks

| ID       | Title                                 | Priority | Depends On |
| -------- | ------------------------------------- | -------- | ---------- |
| E03-T001 | Classes and class_members schemas     | critical | -          |
| E03-T002 | Tools schema with YAML storage        | critical | -          |
| E03-T003 | Assignments and submissions schemas   | high     | E03-T001, E03-T002 |
| E03-T004 | Groups service and API routes         | high     | E03-T001   |
| E03-T005 | Classes service and API routes        | high     | E03-T001   |
| E03-T006 | Tools service with YAML parsing       | high     | E03-T002   |
| E03-T007 | Assignments service and API routes    | high     | E03-T003   |
| E03-T008 | Theme service with inheritance logic  | medium   | E03-T004   |

## Out of Scope

- Tool execution runtime (covered in E04)
- Real-time collaboration features (future epic)
- Import/export functionality (future epic)
- Analytics and reporting (future epic)
- OneRoster sync (Phase 3)

## Risks

| Risk                                       | Mitigation                                              |
| ------------------------------------------ | ------------------------------------------------------- |
| YAML parsing complexity for tool definitions | Use well-tested library (js-yaml), validate with Zod   |
| Group hierarchy queries performance         | Use GiST indexes on ltree, test with large hierarchies |
| Tool versioning complexity                  | Start simple (latest version only), add versioning later |
| Assignment configuration flexibility        | Use JSONB for config, validate with JSON Schema        |

## Notes

This epic builds on the authentication foundation from E02 to create the core data management layer. Key architectural decisions:

**Groups:**
- Use ltree for hierarchy (already implemented in E01)
- Support arbitrary depth (Districts → Schools → Departments → ...)
- Settings and themes cascade down hierarchy
- Permissions scoped to group and descendants

**Classes:**
- Belong to a single group
- Have roster (many-to-many with users via class_members)
- Differentiate teachers from students in roster
- Can have multiple teachers (team teaching)

**Tools:**
- Two types: Chat (multi-turn) and Product (single I/O)
- Defined in YAML with JSON Schema validation
- Portable and version-controlled
- Can be shared across groups or private

**Assignments:**
- Link a tool to a class
- Include configuration (due dates, max attempts, time limits)
- Track submissions via submissions table
- Support both chat sessions and product runs

**Tool YAML Example:**
```yaml
name: Socratic Algebra Tutor
type: chat
version: 1.0.0
behavior: |
  Act as a Socratic tutor for algebra.
  Never give direct answers.
model: anthropic/claude-sonnet-4-20250514
constraints:
  topics: [linear equations, quadratics]
modules:
  - struggle-detector
  - safety-filter
```

All entities must respect CASL permissions and include comprehensive error handling following CONVENTIONS.md patterns.
