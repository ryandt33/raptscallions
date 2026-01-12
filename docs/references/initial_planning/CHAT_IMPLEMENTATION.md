## Chat Runtime Implementation Design

**Version:** 1.0.0
**Status:** Design Specification
**Last Updated:** January 2025

---

### Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Component Architecture](#2-component-architecture)
3. [Session Lifecycle](#3-session-lifecycle)
4. [Context Assembly](#4-context-assembly)
5. [Message Flow](#5-message-flow)
6. [Hook Execution](#6-hook-execution)
7. [Streaming Architecture](#7-streaming-architecture)
8. [Tool Execution](#8-tool-execution)
9. [Persistence Strategy](#9-persistence-strategy)
10. [Error Handling](#10-error-handling)
11. [API Surface](#11-api-surface)
12. [Schema Additions](#12-schema-additions)
13. [Open Considerations](#13-open-considerations)

---

### 1. Executive Summary

#### Purpose

This document specifies the Chat Runtime—the core execution engine that handles conversation flow between users and AI. It bridges the existing module system, AI gateway, and persistence layers.

#### Scope

| In Scope                               | Out of Scope                                 |
| -------------------------------------- | -------------------------------------------- |
| Session creation and lifecycle         | AI Tool (formerly Product) execution chains  |
| Message sending and streaming          | Form builder / input validation UI           |
| Hook integration (before_ai, after_ai) | DURING phase / real-time stream modification |
| Tool function calling                  | Third-party module sandboxing                |
| Message and audit persistence          | Rate limiting (handled at API gateway level) |
| Usage tracking                         | Billing integration                          |

#### Key Decisions Summary

| Decision                 | Choice                              | Rationale                                                 |
| ------------------------ | ----------------------------------- | --------------------------------------------------------- |
| Session start            | Always explicit                     | Enables tracking, timing, assignment validation           |
| Session states           | `active` → `completed` only         | Simplicity; "paused" adds complexity without v1 value     |
| Streaming protocol       | Server-Sent Events (SSE)            | Industry standard for LLM streaming, good browser support |
| DURING phase             | Dropped for v1                      | Complexity vs value; before/after hooks sufficient        |
| Original content storage | Separate audit table                | Clean separation, admin-only access, compliance-friendly  |
| Tool permissions         | Inherit user's platform permissions | Principle of least surprise                               |
| Config cascade           | Org → Tool → Task → Assignment      | CSS-like specificity, familiar pattern                    |

---

### 2. Component Architecture

#### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
│  POST /sessions                                                          │
│  POST /sessions/:id/messages (SSE)                                      │
│  POST /sessions/:id/complete                                            │
│  POST /sessions/:id/cancel                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CHAT ORCHESTRATOR                               │
│                                                                          │
│  Coordinates the full message flow:                                     │
│  validate → context → hooks → AI → hooks → persist → respond            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Session  │  │ Context  │  │  Module  │  │  Stream  │  │ Message  │
   │ Service  │  │ Builder  │  │Supervisor│  │ Service  │  │ Service  │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
         │              │              │              │              │
         └──────────────┴──────────────┴──────────────┴──────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                      │
│  PostgreSQL: sessions, messages, message_audit, extractions, ai_usage   │
│  Redis: active streams, rate limits (future)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Component Responsibilities

| Component             | Responsibility                                               | Dependencies                                      |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| **Session Service**   | Create, retrieve, complete sessions; validate access         | Database, Module Supervisor (for lifecycle hooks) |
| **Context Builder**   | Assemble HookContext from session state; build system prompt | Database (users, tools, assignments, messages)    |
| **Stream Service**    | Manage AI gateway streaming; handle SSE protocol             | AI Gateway (OpenRouter), Redis (stream tracking)  |
| **Message Service**   | Persist messages; manage audit trail                         | Database                                          |
| **Tool Executor**     | Execute AI function calls; permission checking               | Platform permission system                        |
| **Chat Orchestrator** | Coordinate full flow; error handling                         | All of the above                                  |

#### Why This Separation?

1. **Testability**: Each component can be unit tested in isolation
2. **Single Responsibility**: Changes to streaming don't affect session logic
3. **Reusability**: Context Builder can be reused for AI Tools (non-chat)
4. **Substitutability**: Stream Service could swap AI providers without touching other components

---

### 3. Session Lifecycle

#### State Machine

```
                    ┌─────────────────┐
                    │                 │
    POST /sessions  │     active      │  User interacts
    ───────────────▶│                 │◀─────────────
                    │                 │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
      User closes     Assignment        Timeout (24h)
      explicitly      submitted         background job
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │                 │
                    │    completed    │
                    │                 │
                    └─────────────────┘
```

#### Creation Flow

```
1. Client calls POST /sessions with { toolId, assignmentId? }

2. Session Service:
   a. Load tool definition
   b. Validate user has access to tool (group membership)
   c. If assignmentId provided:
      - Validate user enrolled in class
      - Validate assignment is available (availableAt, closesAt)
      - Link to submission record
   d. Create session record (state: 'active')
   e. Fire session:start hook (async, non-blocking)

3. Return session { id, toolId, state, startedAt }
```

#### Resume Behavior

When user returns to an existing tool context:

```
1. Client calls GET /sessions?toolId=X&state=active

2. If active session exists:
   - Return existing session
   - Client continues conversation

3. If no active session:
   - Client must call POST /sessions to start new
```

**Design Note**: We always return the most recent active session for a tool+user pair. This supports the "continue where you left off" requirement for assignments.

#### Completion Triggers

| Trigger               | Actor  | Notes                               |
| --------------------- | ------ | ----------------------------------- |
| Explicit close        | User   | POST /sessions/:id/complete         |
| Assignment submission | User   | Submission flow calls complete      |
| Timeout               | System | Background job after 24h inactivity |
| Session limit reached | System | If tool defines maxMessages         |

#### Configuration Cascade

Session behavior can be configured at multiple levels:

```
Org (Group) Settings
    ↓ override
Tool Definition
    ↓ override
Assignment Config
    ↓ (most specific wins)
Final Session Config
```

**Example**:

- Org sets `maxSessionDuration: 60min` (default for all tools)
- Tool doesn't override
- Assignment sets `maxSessionDuration: 30min` (stricter for this test)
- Result: 30 minute limit for this session

---

### 4. Context Assembly

#### What is HookContext?

The `HookContext` is the standardized data structure passed to all module hooks. It contains everything a module needs to make decisions without additional database queries.

#### Context Composition

```
┌─────────────────────────────────────────────────────────────────┐
│                         HookContext                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request Context                                                 │
│  ├── requestId (UUID, for tracing)                              │
│  ├── hook (which hook is executing)                             │
│  └── timestamp                                                   │
│                                                                  │
│  User Context                                                    │
│  ├── id, email, name                                            │
│  └── role (student | teacher | admin)                           │
│                                                                  │
│  Scope Context (all optional)                                    │
│  ├── group { id, name, path, settings }                         │
│  ├── class { id, name }                                         │
│  └── assignment { id, name, instructions, config }              │
│                                                                  │
│  Tool Context                                                    │
│  ├── id, name, type                                             │
│  └── definition { behavior, model, constraints, modules }       │
│                                                                  │
│  Session Context                                                 │
│  ├── id, state, startedAt                                       │
│  └── messageCount                                                │
│                                                                  │
│  Conversation Context                                            │
│  ├── messages[] (full history)                                  │
│  └── currentMessage { id, role, content, seq }                  │
│                                                                  │
│  Response Context (after_ai only)                                │
│  └── response (AI's response text)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### System Prompt Assembly

The system prompt is built from multiple sources in a defined order:

```
┌─────────────────────────────────────────────────────────────────┐
│                       SYSTEM PROMPT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Core Behavior                                                │
│  {tool.definition.behavior}                                      │
│                                                                  │
│  ## Assignment Context (if present)                              │
│  {assignment.instructions}                                       │
│                                                                  │
│  ## Constraints (if defined)                                     │
│  - topics: [allowed topics]                                      │
│  - no_direct_answers: true                                       │
│                                                                  │
│  ## Additional Guidance (from modules)                           │
│  {systemPromptAdditions from before_ai hooks}                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Design Note**: Sections are clearly delimited for debuggability. When investigating unexpected AI behavior, operators can trace which section influenced the response.

#### Message History Inclusion

**Decision**: Token-budgeted with fallback to last N messages.

**Rationale**:

- Including all messages can exceed context window
- Simple "last N" may cut important context
- Token budgeting maximizes useful history within limits

**Algorithm**:

1. Calculate available tokens: `maxContext - systemPrompt - responseBuffer - currentMessage`
2. Iterate from most recent message backwards
3. Include messages until budget exhausted
4. Always include at least the current message

**Fallback**: If token counting unavailable, use last 50 messages as heuristic.

---

### 5. Message Flow

#### Happy Path Sequence

```
User                   Orchestrator              Modules                AI Gateway
  │                         │                       │                       │
  │ POST /messages          │                       │                       │
  │ {content}               │                       │                       │
  │────────────────────────▶│                       │                       │
  │                         │                       │                       │
  │                         │ chat:on_message       │                       │
  │                         │ (async, fire & forget)│                       │
  │                         │──────────────────────▶│                       │
  │                         │                       │                       │
  │                         │ chat:before_ai        │                       │
  │                         │ (sync, blocking)      │                       │
  │                         │──────────────────────▶│                       │
  │                         │◀──────────────────────│                       │
  │                         │ {action, modifications}                       │
  │                         │                       │                       │
  │                         │ Save user message     │                       │
  │                         │──────┐                │                       │
  │                         │◀─────┘                │                       │
  │                         │                       │                       │
  │                         │ Stream request        │                       │
  │                         │──────────────────────────────────────────────▶│
  │                         │                       │                       │
  │ SSE: chunk              │◀──────────────────────────────────────────────│
  │◀────────────────────────│                       │                       │
  │ SSE: chunk              │◀──────────────────────────────────────────────│
  │◀────────────────────────│                       │                       │
  │ SSE: done               │◀──────────────────────────────────────────────│
  │                         │                       │                       │
  │                         │ chat:after_ai         │                       │
  │                         │ (sync, blocking)      │                       │
  │                         │──────────────────────▶│                       │
  │                         │◀──────────────────────│                       │
  │                         │                       │                       │
  │                         │ Save assistant message│                       │
  │                         │──────┐                │                       │
  │◀────────────────────────│◀─────┘                │                       │
  │ SSE: complete           │                       │                       │
  │                         │                       │                       │
```

#### Blocked Message Flow

When `before_ai` hook returns `action: 'block'`:

```
User                   Orchestrator              Modules
  │                         │                       │
  │ POST /messages          │                       │
  │ {content}               │                       │
  │────────────────────────▶│                       │
  │                         │                       │
  │                         │ chat:before_ai        │
  │                         │──────────────────────▶│
  │                         │◀──────────────────────│
  │                         │ {action: 'block',     │
  │                         │  directResponse: '...'}
  │                         │                       │
  │                         │ Save user message     │
  │                         │ (content: '[blocked]')│
  │                         │──────┐                │
  │                         │◀─────┘                │
  │                         │                       │
  │                         │ Save assistant message│
  │                         │ (directResponse)      │
  │                         │──────┐                │
  │◀────────────────────────│◀─────┘                │
  │ {blocked response}      │                       │
  │                         │                       │
  │                         │ ⚠️ NO AI call made   │
```

**Design Note**: Blocked messages are still persisted for audit purposes, but the content is replaced with `[blocked]` in the messages table. Original content goes to `message_audit`.

---

### 6. Hook Execution

#### Hook Points

| Hook              | Phase             | Blocking | Purpose                              |
| ----------------- | ----------------- | -------- | ------------------------------------ |
| `session:start`   | Session created   | No       | Initialize module state, emit events |
| `session:end`     | Session completed | No       | Cleanup, generate summaries          |
| `chat:on_message` | Message received  | No       | Async observation, analytics         |
| `chat:before_ai`  | Before AI call    | Yes      | Modify input, block, add context     |
| `chat:after_ai`   | After AI response | Yes      | Modify output, filter, extract       |

#### Hook Result Contract

```typescript
interface HookResult {
  action: "continue" | "block";

  // Only for 'continue' action
  modifications?: {
    messageContent?: string; // Replace user message content
    responseContent?: string; // Replace AI response (after_ai only)
    systemPromptAdditions?: string[]; // Inject into system prompt
  };

  // Only for 'block' action
  blockReason?: string; // For logging/audit
  directResponse?: string; // What to show user

  // Both actions
  extractions?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;

  // If content was modified
  audit?: {
    originalContent: string;
    redactionReason: string;
    patternsMatched?: string[];
  };
}
```

#### Execution Order

Modules execute in priority order (lower number = earlier):

```
Priority 1-10:   Safety filters (must run first)
Priority 20-40:  Content modifiers (PII filter, normalization)
Priority 50:     Default (most modules)
Priority 60-80:  Enrichment (add context, lookup data)
Priority 90-99:  Logging/analytics (run last, observe final state)
```

#### Error Handling in Hooks

**Policy**: Hook failures should not block the conversation.

```
If hook throws exception:
  1. Log error with full context
  2. Emit module:hook_error event
  3. Continue with original content (no modifications)
  4. Track failure for module health monitoring
```

**Rationale**: A broken analytics module shouldn't prevent students from learning. Safety-critical modules should be designed to fail-safe (block on error if needed).

---

### 7. Streaming Architecture

#### Protocol Choice: Server-Sent Events (SSE)

**Decision**: Use SSE over WebSocket or raw HTTP chunking.

| Option        | Pros                                                          | Cons                                 |
| ------------- | ------------------------------------------------------------- | ------------------------------------ |
| **SSE**       | Standard for LLM streaming, structured events, auto-reconnect | One-way only                         |
| WebSocket     | Bidirectional                                                 | Overkill for our needs, more complex |
| HTTP chunking | Simplest                                                      | No structure, harder to parse events |

**Rationale**: SSE is the industry standard for LLM streaming (OpenAI, Anthropic use it). It provides structured events, good browser support, and automatic reconnection. We don't need bidirectional communication—the client sends a request, server streams a response.

#### Event Types

```typescript
type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "tool_call"; toolCall: { id; name; args } }
  | { type: "tool_result"; toolResult: { id; result } }
  | { type: "done"; meta: { model; tokens; latencyMs } }
  | { type: "error"; error: string };
```

#### Stream Cancellation

**Mechanisms**:

1. **Client disconnect**: When SSE connection drops, server aborts AI request
2. **Explicit cancel**: `POST /sessions/:id/cancel` endpoint

**Implementation**:

- Each stream registered in `StreamManager` with `AbortController`
- Session ID → AbortController mapping
- Redis tracking for multi-instance deployments

**Cleanup**: On completion or cancellation:

1. Remove from StreamManager
2. Delete Redis key
3. Persist partial content if any

#### Error During Stream

**Scenario**: AI gateway fails mid-stream.

**Handling**:

1. Emit `{ type: 'error', error: 'Stream interrupted' }`
2. Save partial content with error metadata
3. User message already saved, so conversation state is consistent
4. Client can retry by sending same message again

---

### 8. Tool Execution

#### Overview

AI can call functions during response generation. These execute inline and results feed back to the AI.

```
AI: "Let me check the time for you..."
    → tool_call: getCurrentTime({timezone: "America/New_York"})
    ← result: {iso: "2025-01-15T10:30:00Z", formatted: "10:30 AM EST"}
AI: "It's currently 10:30 AM Eastern Time."
```

#### Tool Categories

| Category   | Sync | Example                           | Permission Model                     |
| ---------- | ---- | --------------------------------- | ------------------------------------ |
| **Query**  | Yes  | getCurrentTime, getAssignmentInfo | User's read permissions              |
| **Create** | No   | createTodo, createNote            | User's write permissions (self only) |
| **Search** | Yes  | searchPriorSessions               | User's data only                     |

**Sync**: AI waits for result before continuing.
**Async**: AI acknowledges action, execution happens in background.

#### Permission Model

**Principle**: Tools inherit the user's platform permissions. AI cannot do more than the user could do manually.

```
User has permission: todos:write:self
  → createTodo can create todos for this user only

User has permission: sessions:read:self
  → searchPriorSessions can only search this user's sessions

User does NOT have: users:read:all
  → No tool can retrieve other users' data
```

**Implementation**: Tool executor receives user's permission list, checks against tool's required permissions.

#### Standard Library (Placeholder)

For v1, we define the tool interface and register placeholder implementations. Actual integrations deferred.

| Tool                  | Description                 | Deferred To              |
| --------------------- | --------------------------- | ------------------------ |
| `getCurrentTime`      | Current date/time           | Implemented              |
| `createTodo`          | Create todo item            | Todo system integration  |
| `createNote`          | Save a note                 | Notes system integration |
| `getAssignmentInfo`   | Current assignment details  | Implemented              |
| `searchPriorSessions` | Search conversation history | Search integration       |

---

### 9. Persistence Strategy

#### Message Persistence

**Timing**:

- User message: Saved immediately after `before_ai` hooks (before AI call)
- Assistant message: Saved after stream complete and `after_ai` hooks

**Rationale**: User message represents intent—save it even if AI call fails. Assistant message represents final response—only save after all modifications applied.

#### Audit Trail

**Table**: `message_audit`

**Contents**:

- Original pre-redaction content
- Which module performed redaction
- Why (reason string)
- What patterns matched (for debugging)

**Access**: Admin-only at API layer. Schema doesn't enforce access control—application does.

**Retention**: Same as messages. Consider separate retention policy for audit data (compliance requirement).

#### Extractions

**What**: Structured data emitted by modules during hook execution.

**Examples**:

- `pii_detected`: { location: 'user_message', types: ['email', 'phone'] }
- `struggle_detected`: { indicators: ['repeated_errors'], topic: 'algebra' }
- `misconception_identified`: { concept: 'fractions', misconception: 'adding denominators' }

**Storage**: `extractions` table (already defined in module system spec).

**Purpose**: Powers teacher dashboards, analytics, intervention triggers.

#### Usage Tracking

**What**: Every AI call logged with tokens and cost.

**Where**: `ai_usage` table (already defined).

**Granularity**: Per-message (not per-session). Enables detailed cost attribution.

---

### 10. Error Handling

#### Error Categories

| Category          | Example                   | Response            | Recovery                   |
| ----------------- | ------------------------- | ------------------- | -------------------------- |
| **Validation**    | Invalid session ID        | 400 Bad Request     | Client fixes input         |
| **Authorization** | User not in class         | 403 Forbidden       | Client redirects           |
| **Not Found**     | Session deleted           | 404 Not Found       | Client handles             |
| **Conflict**      | Session already completed | 409 Conflict        | Client refreshes state     |
| **AI Gateway**    | OpenRouter down           | 502 Bad Gateway     | Client retries             |
| **Timeout**       | AI response too slow      | 504 Gateway Timeout | Client retries             |
| **Internal**      | Unexpected exception      | 500 Internal Error  | Log, alert, client retries |

#### Retry Guidance

**Client-side retry**: For 502, 504, 500—exponential backoff with jitter.

**Idempotency**: Sending the same message twice should be safe. We don't deduplicate—two identical messages create two conversation turns (intentional for pedagogy).

#### Graceful Degradation

**If module supervisor unavailable**:

- Log error
- Continue without hooks
- AI call proceeds with original content
- User experience preserved, but no module features

**If Redis unavailable**:

- Stream cancellation may not work across instances
- Session still functions (core data in Postgres)

---

### 11. API Surface

#### Endpoints

```
POST   /sessions
       Create new session
       Body: { toolId, assignmentId?, submissionId? }
       Response: { id, toolId, state, startedAt }

GET    /sessions/:id
       Get session details
       Response: { id, toolId, state, startedAt, messageCount }

GET    /sessions
       List user's sessions
       Query: ?toolId=X&state=active&limit=50
       Response: { sessions: [...] }

POST   /sessions/:id/messages
       Send message (SSE streaming response)
       Body: { content }
       Response: SSE stream of events

POST   /sessions/:id/complete
       Complete session
       Response: { id, state: 'completed', endedAt }

POST   /sessions/:id/cancel
       Cancel active stream
       Response: { cancelled: true }

GET    /sessions/:id/messages
       Get message history
       Response: { messages: [...] }

GET    /admin/sessions/:id/audit
       Get audit trail (admin only)
       Response: { auditRecords: [...] }
```

#### Authentication

All endpoints require authentication. Session ownership verified on every request.

Admin endpoints (`/admin/*`) require system admin role.

---

### 12. Schema Additions

#### New Tables

```sql
-- Audit trail for redacted content (admin only)
CREATE TABLE message_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  redaction_module TEXT NOT NULL,
  redaction_reason TEXT,
  patterns_matched JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_audit_message ON message_audit(message_id);

-- Tool calls made during conversation
CREATE TABLE tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  tool_name TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  tool_result JSONB,
  state TEXT NOT NULL DEFAULT 'pending', -- pending, success, error
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX idx_tool_calls_session ON tool_calls(session_id);
```

#### Schema Modifications

```sql
-- Remove 'paused' from valid states (documentation only)
-- sessions.state: 'active' | 'completed'

-- No structural changes to existing tables
```

---

### 13. Open Considerations

#### Future Enhancements

| Enhancement                   | Notes                                                | Priority |
| ----------------------------- | ---------------------------------------------------- | -------- |
| Message editing               | Allow user to edit last message, regenerate response | Medium   |
| Branching conversations       | Fork from any point, explore alternatives            | Low      |
| Multi-model routing           | Different models for different message types         | Low      |
| Streaming to multiple clients | Multiple tabs, teacher observation                   | Medium   |
| DURING phase hooks            | Real-time stream modification                        | Deferred |

#### Performance Considerations

| Concern                  | Mitigation                                |
| ------------------------ | ----------------------------------------- |
| Context assembly latency | Parallel database queries                 |
| Large message histories  | Token budgeting, pagination               |
| Hook execution overhead  | Timeout enforcement, async where possible |
| Stream backpressure      | Respect client consumption rate           |

#### Monitoring Requirements

| Metric                          | Purpose                     |
| ------------------------------- | --------------------------- |
| Session creation rate           | Capacity planning           |
| Message latency (p50, p95, p99) | User experience             |
| Hook execution time by module   | Identify slow modules       |
| AI gateway error rate           | Provider health             |
| Stream cancellation rate        | User experience indicator   |
| Block rate by module            | Safety system effectiveness |

---

### Document History

| Version | Date     | Author | Changes               |
| ------- | -------- | ------ | --------------------- |
| 1.0.0   | Jan 2025 | —      | Initial specification |

---
