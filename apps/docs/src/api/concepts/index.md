---
title: API Concepts
description: Core mental models for understanding the Fastify API layer
---

# API Concepts

This section covers the foundational concepts for understanding the RaptScallions API architecture. These are the mental models that inform how the API is structured.

## Available Concepts

- [Fastify Setup](/api/concepts/fastify-setup) — Server initialization, configuration, and graceful shutdown
- [Plugin Architecture](/api/concepts/plugin-architecture) — How Fastify plugins encapsulate functionality
- [Request Lifecycle](/api/concepts/request-lifecycle) — Hook execution order from request to response

## Quick Reference

| Concept | Key Idea |
|---------|----------|
| **Fastify Setup** | Factory function creates isolated, testable server instances |
| **Plugin Architecture** | Plugins provide encapsulation; use `fastify-plugin` to break it |
| **Request Lifecycle** | Hooks run in order: onRequest → preHandler → handler → onResponse |

## Return to Overview

See the [API Overview](/api/) for patterns, decisions, and troubleshooting guides.
