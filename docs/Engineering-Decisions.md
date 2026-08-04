# Architecture Decision Records (ADR) — AuthSphere

This document records the architectural and engineering decisions made during the design, development, and evolution of **AuthSphere** — a production-grade, highly secure authentication and session management platform.

---

## Index of Decisions

- [ADR-001: Monorepo Architecture](#adr-001--monorepo-architecture)
- [ADR-002: Feature-Based Modular Architecture](#adr-002--feature-based-modular-architecture)
- [ADR-003: Single-Source Environment Configuration](#adr-003--single-source-environment-configuration)
- [ADR-004: Strict Runtime Schema Validation for Config](#adr-004--strict-runtime-schema-validation-for-config)
- [ADR-005: Prisma 7 ORM with Native PostgreSQL Driver Adapter](#adr-005--prisma-7-orm-with-native-postgresql-driver-adapter)
- [ADR-006: Explicit Generated Prisma Client Location](#adr-006--explicit-generated-prisma-client-location)
- [ADR-007: Infrastructure Client Isolation](#adr-007--infrastructure-client-isolation)
- [ADR-008: Hierarchical Error Handling Pipeline](#adr-008--hierarchical-error-handling-pipeline)
- [ADR-009: Structured Observability with Pino & Request Context](#adr-009--structured-observability-with-pino--request-context)
- [ADR-010: Multi-Resource Graceful Shutdown](#adr-010--multi-resource-graceful-shutdown)
- [ADR-011: Operational Health Monitoring Pattern](#adr-011--operational-health-monitoring-pattern)
- [ADR-012: Unified Session Model (Session + Refresh Token)](#adr-012--unified-session-model-session--refresh-token)
- [ADR-013: Hard Deletion Strategy for Session Revocation](#adr-013--hard-deletion-strategy-for-session-revocation)
- [ADR-014: Refresh Token Rotation with Automatic Reuse Detection](#adr-014--refresh-token-rotation-with-automatic-reuse-detection)
- [ADR-015: Pre-Persistence UUIDv7 Session Identifiers](#adr-015--pre-persistence-uuidv7-session-identifiers)
- [ADR-016: Centralized Auth Cookie Sanitization in Error Middleware](#adr-016--centralized-auth-cookie-sanitization-in-error-middleware)
- [ADR-017: Human-Readable Duration Synchronization](#adr-017--human-readable-duration-synchronization)
- [ADR-018: Repository-Level Filtering of Expired Sessions](#adr-018--repository-level-filtering-of-expired-sessions)

---

## ADR-001 — Monorepo Architecture

**Status:** Accepted

### Context

AuthSphere consists of backend API services, potential frontend clients, shared type definitions, validation schemas, and domain constants. Managing these in separate repositories leads to version drift, duplicated contracts, and cumbersome development workflows.

### Decision

Use an **npm workspace monorepo** structure (`apps/*`, `packages/*`).

### Rationale

- Enables seamless code sharing (e.g., `@authsphere/shared` for domain roles, validation types, and shared constants).
- Guarantees strict type safety across application boundaries.
- Simplifies dependency management and unified linting/formatting pipelines.

---

## ADR-002 — Feature-Based Modular Architecture

**Status:** Accepted

### Context

Traditional layer-first folder structures (`controllers/`, `services/`, `models/`) cause fragmentation as the application grows, requiring developers to touch multiple distant directories for a single domain change.

### Decision

Organize backend code inside `apps/api/src/modules/` by feature domains (`auth/`, `health/`, `email/`). Each module encapsulates its routes, controllers, services, repositories, schemas, and types.

### Rationale

- **High Cohesion:** Keeps related logic, validation, and data access tightly coupled within the module.
- **Maintainability:** Adding or refactoring a feature is contained within a single directory.
- **Scalability:** Easily scales as new domain modules are added without cluttering global directories.

---

## ADR-003 — Single-Source Environment Configuration

**Status:** Accepted

### Context

Direct usage of `process.env` scattered across codebase files leads to hidden runtime dependencies, missing environment variables at runtime, and untyped configuration values.

### Decision

Access all environment variables exclusively through `src/config/env.ts`. Direct calls to `process.env` outside this file are prohibited.

### Rationale

- Establishes a single source of truth for application configuration.
- Facilitates central auditing of required and optional environment variables.
- Ensures configuration defaults and type coercions are applied predictably.

---

## ADR-004 — Strict Runtime Schema Validation for Config

**Status:** Accepted

### Context

Starting an application with invalid or missing configuration (e.g., malformed database URIs, missing JWT secrets) causes latent runtime crashes during user requests instead of at startup.

### Decision

Validate environment variables at process startup using **Zod** (`envSchema.safeParse(process.env)`). The process fails fast (`process.exit(1)`) with clear, formatted diagnostic logs if validation fails.

### Rationale

- **Fail-Fast:** Guarantees invalid configurations prevent application boot.
- **Type Safety:** Exports a strongly typed `env` object consumed across the application.
- Supports inline value transformations (e.g., converting string duration `"15m"` to numeric milliseconds).

---

## ADR-005 — Prisma 7 ORM with Native PostgreSQL Driver Adapter

**Status:** Accepted

### Context

Database access requires type safety, robust migration support, and high performance connection handling.

### Decision

Adopt **Prisma 7** configured with `@prisma/adapter-pg` and `pg` pool connections.

### Rationale

- Delivers end-to-end TypeScript safety generated directly from `schema.prisma`.
- `@prisma/adapter-pg` leverages native Node.js PostgreSQL driver connection pools for optimal performance.
- Declarative migration workflow via Prisma CLI.

---

## ADR-006 — Explicit Generated Prisma Client Location

**Status:** Accepted

### Context

Default Prisma client generation outputs into `node_modules/@prisma/client`, which can suffer from path resolution issues in monorepos or pnpm/npm workspace hoisting environments.

### Decision

Generate the Prisma Client explicitly inside `apps/api/src/generated/prisma` via `generator client { output = "../src/generated/prisma" }`.

### Rationale

- Ensures explicit and reliable imports (`import { Prisma } from "../../generated/prisma/client.js"`).
- Prevents workspace package hoisting conflicts or missing module resolution errors in CI/CD.
- Keeps generated artifacts versioned or explicitly ignored within the project workspace boundary.

---

## ADR-007 — Infrastructure Client Isolation

**Status:** Accepted

### Context

Mixing infrastructure initialization (Prisma client instance, Redis connection, Pino logger) with business logic or route handlers hampers testability and clean separation of concerns.

### Decision

Instantiate and export infrastructure singletons strictly inside `src/lib/` (`prisma.ts`, `redis.ts`, `logger.ts`).

### Rationale

- Decouples infrastructure setup from feature modules and controllers.
- Enables central configuration for connection pools, reconnect strategies, and logging handlers.
- Simplifies mocking or swapping infrastructure clients during integration testing.

---

## ADR-008 — Hierarchical Error Handling Pipeline

**Status:** Accepted

### Context

Handling errors inconsistently across controllers leads to repetitive `try/catch` boilerplate, leaking internal stack traces to clients, and non-standard HTTP status codes.

### Decision

Implement a custom error hierarchy extending `AppError` (`ValidationError`, `UnauthorizedError`), coupled with an `asyncHandler` higher-order function and a global Express error middleware (`errorHandler`).

### Rationale

- **Dry Controllers:** Eliminates manual `try/catch` blocks in controllers.
- **Consistent Response DTO:** Guarantees all API errors return a standardized `{ success: false, message, errors? }` response body.
- **Information Leak Protection:** Masks unhandled system errors (500) as `"Internal Server Error"` in production while providing detailed error fields in non-production environments.

---

## ADR-009 — Structured Observability with Pino & Request Context

**Status:** Accepted

### Context

Unstructured `console.log` statements degrade performance and are difficult to index, query, and trace in production log aggregators (e.g., Datadog, ELK stack).

### Decision

Use **Pino** for high-performance structured JSON logging, integrated with Express via `pino-http` and custom `requestId` middleware using `X-Request-Id` headers.

### Rationale

- **Performance:** Pino is significantly faster than traditional loggers like Winston.
- **Traceability:** Every incoming HTTP request is assigned (or inherits) a unique `requestId` (`req.id`), which automatically correlates all log lines associated with that request lifecycle.

---

## ADR-010 — Multi-Resource Graceful Shutdown

**Status:** Accepted

### Context

Abruptly terminating application processes (e.g., during Kubernetes rolling updates or SIGTERM signals) leads to dropped active HTTP requests and orphaned database/Redis connection sockets.

### Decision

Implement a graceful shutdown lifecycle in `server.ts` that intercepts `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection`.

### Rationale

1. Stops accepting new HTTP connections via `server.close()`.
2. Drains active connections using `server.closeIdleConnections()` with a 10-second hard timeout buffer.
3. Concurrently disconnects Prisma (`prisma.$disconnect()`) and Redis (`redis.quit()`) using `Promise.allSettled`.
4. Guarantees zero connection leaks and safe state persistence on shutdown.

---

## ADR-011 — Operational Health Monitoring Pattern

**Status:** Accepted

### Context

Container orchestrators (Kubernetes, AWS ECS) rely on liveness and readiness probes to determine service health. Throwing unhandled exceptions on health check failures can trigger crash loops.

### Decision

The `/health` endpoint executes active connection checks against PostgreSQL (`prisma.$queryRaw`) and Redis (`redis.ping()`), returning explicit JSON status reports (`200 OK` when healthy, `503 Service Unavailable` when degraded).

### Rationale

- Communicates granular infrastructure operational state (`"UP"` vs `"DOWN"`).
- Provides deterministic HTTP status codes suitable for load balancer health probes without throwing unhandled application exceptions.

---

## ADR-012 — Unified Session Model (Session + Refresh Token)

**Status:** Accepted

### Context

Maintaining separate `Session` and `RefreshToken` database models requires cross-table joins, multi-step database operations, and complex state synchronization.

### Decision

Merge `Session` and `RefreshToken` into a single, unified `Session` entity that stores the hashed refresh token (`tokenHash`), expiration timestamp (`expiresAt`), client metadata (`ipAddress`, `userAgent`), and user relationship.

### Rationale

- **Simplicity:** A active session maps 1-to-1 with a valid refresh token.
- **Performance:** Eliminates cross-table JOINs and multi-query transactions during refresh token verification and rotation.
- **Security:** Stores only strong cryptographic hashes (`sha256`) of refresh tokens in persistent storage rather than raw tokens.

---

## ADR-013 — Hard Deletion Strategy for Session Revocation

**Status:** Accepted

### Context

Soft-deleting sessions (`isRevoked` flags) leaves sensitive token fingerprints and expired session rows indefinitely in primary database tables, inflating table size and increasing query latency.

### Decision

Revoke sessions by performing hard database deletions (`DELETE`) upon user logout, token reuse detection, or session termination.

### Rationale

- Instantly removes token fingerprints from storage, preventing post-revocation hash leakage.
- Keeps the `Session` table lean and fast for high-throughput authentication queries.
- Audit history, if required, is delegated to dedicated asynchronous audit log tables.

---

## ADR-014 — Refresh Token Rotation with Automatic Reuse Detection

**Status:** Accepted

### Context

Long-lived refresh tokens present a major security risk if stolen or intercepted by malicious actors.

### Decision

Implement strict **Refresh Token Rotation (RTR)**. Every refresh request generates a new access token and refresh token pair while invalidating the old token. If a previously invalidated refresh token is presented, it is flagged as a potential breach (Token Reuse), triggering immediate session revocation.

### Rationale

- Limits the window of exposure for any single token.
- **Reuse Detection:** Automatically detects stolen token replay attempts and invalidates compromised sessions (configured via `AUTH_REUSE_DELETION_MODE` to delete the single session or all user sessions).
- Follows OAuth 2.0 Security Best Current Practices (RFC 6819 / RFC 8725).

---

## ADR-015 — Pre-Persistence UUIDv7 Session Identifiers

**Status:** Accepted

### Context

Signed JWT Access Tokens include the Session ID (`sid`) in their payload. If the database auto-generates the primary key upon insert, signing JWTs requires a multi-step database roundtrip.

### Decision

Generate the Session ID (`crypto.randomUUIDv7()`) in the service layer _before_ performing database creation or signing JWT tokens.

### Rationale

- **Time-Ordered Sorting:** UUIDv7 contains a time-based prefix, ensuring efficient B-Tree index placement in PostgreSQL.
- **Atomic Operations:** Enables constructing signed Access and Refresh JWTs and persisting the session in a single database write step.
- Prevents orphaned database records if JWT signing or parameter assembly fails.

---

## ADR-016 — Centralized Auth Cookie Sanitization in Error Middleware

**Status:** Accepted

### Context

When authentication fails (e.g., expired refresh token, compromised session), stale authentication cookies (`accessToken`, `refreshToken`) remain in the user's browser, leading to redundant failed requests.

### Decision

Clear authentication cookies inside the global `errorHandler` middleware whenever an `UnauthorizedError` is caught.

### Rationale

- **Clean State:** Automatically purges invalid authentication cookies from the client browser on authentication failure.
- **DRY Architecture:** Eliminates duplicated `res.clearCookie()` calls across individual controllers and routes.
- Ensures consistent cookie clearing attributes (`path`, `httpOnly`, `secure`, `sameSite`).

---

## ADR-017 — Human-Readable Duration Synchronization

**Status:** Accepted

### Context

Defining token and session lifetimes as separate numeric literals across JWT signers, cookie configurations, and database query calculations causes subtle synchronization mismatches.

### Decision

Specify token expirations in environment variables using human-readable duration strings (e.g., `JWT_ACCESS_EXPIRES_IN="15m"`, `JWT_REFRESH_EXPIRES_IN="7d"`). Automatically parse these at startup into numeric milliseconds (`JWT_ACCESS_EXPIRES_IN_MS`, `JWT_REFRESH_EXPIRES_IN_MS`) in `config/env.ts`.

### Rationale

- **Single Source of Truth:** JWT `exp` claims, Express cookie `maxAge`, and database `expiresAt` fields share identical duration parameters.
- **Operations Friendly:** Token lifetimes can be adjusted centrally via `.env` without code changes.

---

## ADR-018 — Repository-Level Filtering of Expired Sessions

**Status:** Accepted

### Context

Relying on service-layer code to filter out expired database sessions risks accidental security bugs if a developer forgets an `expiresAt` check in a new endpoint.

### Decision

Enforce expiration filtering directly in repository lookup methods (e.g., `authRepository.findSessionById` filters `where: { id: sessionId, expiresAt: { gt: new Date() } }`).

### Rationale

- **Defense in Depth:** Expired sessions are filtered at the query level and never leak into the service layer.
- Keeps domain services clean, focused on business logic rather than database timestamp checks.
