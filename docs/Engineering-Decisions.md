# Engineering Decisions (ADR)

## ADR-001 — Monorepo

**Decision**

Use an npm workspace monorepo.

**Reason**

- Shared code
- Better scalability
- Clean separation between applications and packages

---

## ADR-002 — Feature-Based Architecture

**Decision**

Organize backend by feature modules instead of technical layers.

**Reason**

- Better scalability
- Higher cohesion
- Easier maintenance
- Industry-standard structure

---

## ADR-003 — Configuration Layer

**Decision**

Access environment variables only through `config/env.ts`.

**Reason**

- Single source of truth
- Runtime validation
- Fail-fast startup

---

## ADR-004 — Runtime Validation

**Decision**

Use Zod to validate configuration.

**Reason**

Prevent invalid configuration from reaching production.

---

## ADR-005 — Prisma ORM

**Decision**

Use Prisma 7 with `@prisma/adapter-pg`.

**Reason**

- Modern architecture
- Type safety
- Better PostgreSQL integration

---

## ADR-006 — Generated Prisma Client

**Decision**

Generate Prisma Client inside `src/generated/prisma`.

**Reason**

- Explicit imports
- Stable project structure
- Generated code remains part of the project

---

## ADR-007 — Infrastructure Clients

**Decision**

Place initialized clients in `src/lib`.

**Reason**

Separate infrastructure clients from application configuration.

---

## ADR-008 — Error Handling

**Decision**

Use `AppError`, `asyncHandler`, and a global error middleware.

**Reason**

Centralized, consistent error handling.

---

## ADR-009 — Logging

**Decision**

Use Pino with structured logging and request logging.

**Reason**

Production-grade observability.

---

## ADR-010 — Graceful Shutdown

**Decision**

Gracefully close HTTP server, Prisma, and Redis before exit.

**Reason**

Prevent resource leaks and interrupted requests.

---

## ADR-011 — Health Check

**Decision**

Health endpoint reports infrastructure status instead of throwing errors.

**Reason**

Health checks communicate service state, not application exceptions.
