---
title: AI Gateway Integration
description: OpenRouter client, streaming, error handling, and usage patterns
---

# AI Gateway Integration

The AI domain covers the OpenRouter client implementation, streaming patterns, error handling, and AI model usage. The system uses OpenRouter as a unified gateway to multiple AI providers (Anthropic, OpenAI, etc.).

## What's Here

**Concepts** — Streaming vs non-streaming, usage metadata, model selection, token counting, finish reasons

**Patterns** — OpenRouter client usage, async generator streaming, error handling, retry strategies

**Decisions** — Why OpenRouter over direct provider APIs, OpenAI SDK for compatibility, streaming-first approach

**Troubleshooting** — Rate limit errors, timeout issues, invalid responses, model availability problems

## Coming Soon

This section is currently being populated with documentation from the OpenRouter client implementation (E04-T002).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Chat runtime and streaming endpoints
- [Testing](/testing/) — Testing AI integrations
