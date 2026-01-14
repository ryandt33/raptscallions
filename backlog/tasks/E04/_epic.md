---
id: "E04"
title: "AI Gateway & Chat Runtime"
description: "OpenRouter integration, session management, chat message flow, and basic tool execution"
status: "planned"
priority: 4
estimated_weeks: 2
depends_on_epics: ["E02", "E03"]
---

# Epic E04: AI Gateway & Chat Runtime

## Goals

Integrate OpenRouter as the AI gateway, implement chat session management with message persistence, and create the runtime that executes Chat-type tools with streaming responses.

## Success Criteria

- [ ] OpenRouter client configured with model selection and streaming
- [ ] Session and message schemas support chat history
- [ ] Chat message flow handles user input → AI response → persistence
- [ ] SSE streaming from AI to client works reliably
- [ ] Tool YAML definitions control model selection and behavior
- [ ] Usage tracking records tokens and costs per request
- [ ] Error handling for AI failures (rate limits, timeouts, invalid responses)
- [ ] Integration tests verify end-to-end chat flow

## Tasks

| ID       | Title                                     | Priority | Depends On       |
| -------- | ----------------------------------------- | -------- | ---------------- |
| E04-T001 | Sessions and messages schemas             | critical | -                |
| E04-T002 | OpenRouter client with streaming          | critical | -                |
| E04-T003 | Usage tracking schema and service         | high     | E04-T002         |
| E04-T004 | SessionService with message persistence   | high     | E04-T001         |
| E04-T005 | Chat message flow and context building    | critical | E04-T002, E04-T004 |
| E04-T006 | SSE streaming endpoint                    | high     | E04-T005         |
| E04-T007 | Chat API routes                           | high     | E04-T006         |
| E04-T008 | Chat integration tests                    | high     | E04-T007         |
| E04-T009 | Chat schema enhancements (E04-T001 follow-up) | medium | E04-T001 |
| E04-T010 | Chat forking support (branch conversations) | medium | E04-T001, E04-T009 |
| E04-T011 | Message attachments schema (uploaded files) | medium | E04-T001, E04-T009 |

## Out of Scope

- Module system hooks (deferred to later epic focused on modules)
- Product tool runtime (deferred to later epic)
- WebSocket real-time (SSE is sufficient for MVP)
- Chat history search/filtering (future enhancement)
- Message editing/deletion (future enhancement)
- File upload/storage service implementation (E04-T011 is schema only)
- Chat fork UI/navigation (E04-T010 is schema only)

## Risks

| Risk                                    | Mitigation                                            |
| --------------------------------------- | ----------------------------------------------------- |
| OpenRouter rate limits in development   | Implement local rate limiting, graceful backoff       |
| SSE connection stability                | Add reconnection logic, message buffering             |
| Streaming token counting accuracy       | Use OpenRouter's usage metadata in final response     |
| Long conversation context limits        | Truncate old messages, provide clear error to user    |
| AI response quality/safety              | Basic validation (non-empty), defer safety to modules |

## Notes

This epic focuses on the Chat runtime only. Product runtime (single input → output) will be implemented in a later epic once the foundational chat flow is solid.

**Architecture:**

```
User → POST /sessions/:id/messages (SSE)
         ↓
    Build context (system + history + user message)
         ↓
    Call OpenRouter with streaming
         ↓
    Stream chunks to client via SSE
         ↓
    Persist user + assistant messages
         ↓
    Track usage (tokens, cost)
```

**OpenRouter Integration:**

- Use OpenAI-compatible API (same SDK)
- Model specified in tool YAML definition
- Fallback to env var AI_DEFAULT_MODEL if not specified
- Track usage via response metadata

**Session Management:**

- Sessions have state: active, paused, completed
- Messages stored with role (user, assistant, system) and sequence number
- System message built from tool behavior definition
- History context limited to last N messages (configurable)

**Streaming:**

- SSE format with data: prefix
- Chunks sent as they arrive from OpenRouter
- Final message includes usage metadata
- Connection closed after complete response

**Usage Tracking:**

- Record every AI request in ai_usage table
- Fields: user_id, group_id, tool_id, session_id, model, input_tokens, output_tokens, cost
- Cost calculated from model pricing in ai_models table
- Enables budget monitoring and analytics (future epic)

All chat operations respect CASL permissions and require active session ownership.
