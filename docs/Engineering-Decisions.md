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
- [ADR-019: Standalone Function Export Pattern](#adr-019--standalone-function-export-pattern)
- [ADR-020: Barrel Index Re-Exports with Explicit ESM Extensions](#adr-020--barrel-index-re-exports-with-explicit-esm-extensions)
- [ADR-021: Structured `req.auth` Context Object](#adr-021--structured-reqauth-context-object)
- [ADR-022: Constant-Time Login Response (Timing Attack Mitigation)](#adr-022--constant-time-login-response-timing-attack-mitigation)
- [ADR-023: Silent Return for Enumeration-Sensitive Endpoints](#adr-023--silent-return-for-enumeration-sensitive-endpoints)
- [ADR-024: Atomic Token Verification Transactions](#adr-024--atomic-token-verification-transactions)
- [ADR-025: Idempotent Token Re-issuance via Upsert](#adr-025--idempotent-token-re-issuance-via-upsert)
- [ADR-026: Middleware-Based Request Validation with Zod 4](#adr-026--middleware-based-request-validation-with-zod-4)
- [ADR-027: Session Revocation on Password Change and Reset](#adr-027--session-revocation-on-password-change-and-reset)
- [ADR-028: Password Change Distinctness Enforcement](#adr-028--password-change-distinctness-enforcement)
- [ADR-029: `deleteMany` for Idempotent Session Deletion](#adr-029--deletemany-for-idempotent-session-deletion)
- [ADR-030: `passwordChangedAt` Audit Timestamp](#adr-030--passwordchangedat-audit-timestamp)
- [ADR-031: Argon2id Password Hashing with OWASP Parameters](#adr-031--argon2id-password-hashing-with-owasp-parameters)
- [ADR-032: Social Login Account Guarding](#adr-032--social-login-account-guarding)
- [ADR-033: Cookie-Based Token Transport](#adr-033--cookie-based-token-transport)

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

Organize backend code inside `apps/api/src/modules/` by feature domains (`auth/`, `health/`, `email/`). Each module encapsulates its routes, controllers, services, repositories, validation schemas, and types.

### Rationale

- **High Cohesion:** Keeps related logic, validation, and data access tightly coupled within the module.
- **Maintainability:** Adding or refactoring a feature is contained within a single directory.
- **Scalability:** Easily scales as new domain modules are added without cluttering global directories.

### Module File Convention

Each module follows a consistent internal file naming convention:

| File | Responsibility |
|---|---|
| `*.route.ts` | Express router with route definitions and middleware wiring |
| `*.controller.ts` | HTTP request/response handling, cookie management, response formatting |
| `*.service.ts` | Business logic, orchestration, error decisions |
| `*.repository.ts` | Database queries and transactional mutations via Prisma |
| `*.validation.ts` | Zod schemas and inferred TypeScript types for request input |
| `*.types.ts` | Shared TypeScript type definitions for the module |
| `index.ts` | Barrel re-export for external consumers |

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
- Supports inline value transformations (e.g., converting string duration `"15m"` to numeric milliseconds via `.transform()`).

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

Instantiate and export infrastructure singletons strictly inside `src/lib/` (`prisma.ts`, `redis.ts`, `logger.ts`). Domain-specific library code is organized into sub-directories (`lib/crypto/`, `lib/jwt/`).

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

### Error Class Hierarchy

```
AppError (base — carries statusCode)
├── ValidationError (400 — carries errors[] array of field-level details)
└── UnauthorizedError (401 — triggers cookie cleanup in error middleware)
```

### Rationale

- **Dry Controllers:** `asyncHandler` wraps every controller, automatically catching thrown errors and forwarding them to the global error middleware — eliminates all manual `try/catch` blocks.
- **Consistent Response DTO:** Guarantees all API errors return a standardized `{ success: false, message, errors? }` response body.
- **Information Leak Protection:** Masks unhandled system errors (500) as `"Internal Server Error"` in production while providing detailed error fields (name, message, stack) in non-production environments.
- **Semantic Error Routing:** The error middleware discriminates between `ValidationError` (returns field-level errors array), `UnauthorizedError` (clears auth cookies and returns 401), and generic `AppError` (returns status and message).

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

- **Simplicity:** An active session maps 1-to-1 with a valid refresh token.
- **Performance:** Eliminates cross-table JOINs and multi-query transactions during refresh token verification and rotation.
- **Security:** Stores only strong cryptographic hashes (`sha256`) of refresh tokens in persistent storage rather than raw tokens.

---

## ADR-013 — Hard Deletion Strategy for Session Revocation

**Status:** Accepted

### Context

Soft-deleting sessions (`isRevoked` flags) leaves sensitive token fingerprints and expired session rows indefinitely in primary database tables, inflating table size and increasing query latency.

### Decision

Revoke sessions by performing hard database deletions (`DELETE`) upon user logout, token reuse detection, password change, password reset, or session termination.

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

### Implementation Detail

During refresh, the service performs a defense-in-depth check: it verifies that the JWT's `sub` (user ID) matches `session.userId`. A mismatch indicates a compromised session and is rejected immediately.

### Rationale

- Limits the window of exposure for any single token.
- **Reuse Detection:** Automatically detects stolen token replay attempts and invalidates compromised sessions (configured via `AUTH_REUSE_DELETION_MODE` — `"SESSION"` deletes only the affected session, `"GLOBAL"` deletes all sessions for the user).
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

### Implementation Detail

Cookie clearing reuses the same `CookieOptions` configuration (path, httpOnly, secure, sameSite) defined in `common/utils/cookie.ts` — stripping only the `maxAge` property via destructuring — to guarantee attributes match between `setCookie` and `clearCookie` calls.

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

Specify token expirations in environment variables using human-readable duration strings (e.g., `JWT_ACCESS_EXPIRES_IN="15m"`, `JWT_REFRESH_EXPIRES_IN="7d"`). Automatically parse these at startup into numeric milliseconds (`JWT_ACCESS_EXPIRES_IN_MS`, `JWT_REFRESH_EXPIRES_IN_MS`) via Zod's `.transform()` in `config/env.ts`.

### Rationale

- **Single Source of Truth:** JWT `exp` claims, Express cookie `maxAge`, and database `expiresAt` fields share identical duration parameters derived from the same environment variables.
- **Operations Friendly:** Token lifetimes can be adjusted centrally via `.env` without code changes.

---

## ADR-018 — Repository-Level Filtering of Expired Sessions

**Status:** Accepted

### Context

Relying on service-layer code to filter out expired database sessions risks accidental security bugs if a developer forgets an `expiresAt` check in a new endpoint.

### Decision

Enforce expiration filtering directly in repository lookup methods (e.g., `authRepository.findSessionById` filters `where: { id: sessionId, expiresAt: { gt: new Date() } }`). Similarly, token lookup methods (`findFirst`) filter `where: { tokenHash, expiresAt: { gte: new Date() } }`.

### Rationale

- **Defense in Depth:** Expired sessions and tokens are filtered at the query level and never leak into the service layer.
- Keeps domain services clean, focused on business logic rather than database timestamp checks.

---

## ADR-019 — Standalone Function Export Pattern

**Status:** Accepted

### Context

Module files can export functionality using multiple patterns: inline object methods, individual named exports, or standalone function declarations with a bottom-level namespace export object. The team needed a consistent convention across the codebase.

### Alternatives Considered

1. **Inline object methods** — `export const authService = { signup: async () => { ... } }`. Cons: deeply nested, harder to read, cannot self-reference without `this`.
2. **Individual named exports** — `export const signup = ...`. Cons: no logical grouping at import site; consumers must import each function individually.
3. **Standalone functions + bottom export object** — Functions defined as `const` at module scope, grouped into a single named export object at the bottom of the file.

### Decision

Adopt pattern (3) across all module files: `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.validation.ts`.

```typescript
const signup = async (input: SignupInput) => { ... };
const login = async (input: LoginInput) => { ... };

export const authService = {
  signup,
  login,
};
```

### Rationale

- **Readability:** Functions are defined at the top-level scope with flat indentation — no nesting inside an object literal.
- **Self-reference:** Functions can call each other directly by name (no `this` binding issues).
- **Grouped imports:** Consumers import a single named namespace (`authService.signup`) providing clear provenance at the call site.
- **Consistency:** Applied uniformly across controller, service, repository, and validation layers.

---

## ADR-020 — Barrel Index Re-Exports with Explicit ESM Extensions

**Status:** Accepted

### Context

With native Node.js ES Modules (`"type": "module"`), every import must include the explicit `.js` file extension. As the codebase grows, consumers repeatedly import from deeply nested paths like `../../common/errors/app-error.js`, `../../common/errors/async-handler.js`, etc.

### Alternatives Considered

1. **Node.js `#imports` subpath aliases** — Eliminates relative paths but still requires explicit file targets. Needs corresponding `tsconfig.json` `paths` mapping.
2. **TypeScript path aliases (`@common/*`)** — Works at compile time but fails at runtime under native ESM without a module resolver loader.
3. **Barrel `index.ts` files** — Consolidates re-exports; consumers import from `../../common/errors/index.js`.

### Decision

Adopt barrel `index.ts` files at directory boundaries (`common/errors/index.ts`, `common/utils/index.ts`, `common/responses/index.ts`, `lib/crypto/index.ts`, `lib/jwt/index.ts`). Consumers import from the barrel using the explicit `index.js` extension required by native ESM.

```typescript
// Before (multiple deep imports)
import { AppError } from "../../common/errors/app-error.js";
import { asyncHandler } from "../../common/errors/async-handler.js";
import { UnauthorizedError } from "../../common/errors/unauthorized-error.js";

// After (single barrel import)
import { AppError, asyncHandler, UnauthorizedError } from "../../common/errors/index.js";
```

### Rationale

- **Zero runtime dependencies:** No external module resolvers, loaders, or build tools required — fully compliant with Node.js native ESM.
- **Cleaner imports:** Reduces import statement count and shortens paths.
- **Encapsulation:** Barrel files serve as the public API surface of a directory; internal file reorganization does not break external consumers.
- The explicit `index.js` extension remains necessary because Node.js ESM does not support automatic directory index resolution (unlike CommonJS).

---

## ADR-021 — Structured `req.auth` Context Object

**Status:** Accepted

### Context

Originally, the `auth` middleware attached a single `req.userId` property. As more authenticated context was needed (session ID, user role), adding individual properties to the Express `Request` interface created a flat, unstructured surface prone to name collisions and required nullable types (`userId?: string`) leading to non-null assertions (`userId!`) in controllers.

### Decision

Replace `req.userId` with a structured `req.auth` object populated by the `auth` middleware from the verified JWT payload:

```typescript
// express.d.ts
interface Request {
  id: string;
  auth: {
    userId: string;
    sessionId: string;
    role: RoleName;
  };
}

// middlewares/auth.ts
req.auth = {
  userId: payload.sub,
  sessionId: payload.sid,
  role: payload.role,
};
```

### Rationale

- **Type Safety:** Controllers access `req.auth.userId` without non-null assertions — the `auth` middleware guarantees the object exists on protected routes.
- **Namespace Isolation:** All authenticated context lives under `req.auth`, preventing property name collisions with Express internals or other middleware.
- **Extensibility:** New authenticated context fields (e.g., permissions, organization ID) can be added to the `auth` object without polluting the top-level `Request` interface.
- **Industry Standard:** Follows the pattern used by production auth providers (Clerk, Auth0, Kinde).

---

## ADR-022 — Constant-Time Login Response (Timing Attack Mitigation)

**Status:** Accepted

### Context

When a login attempt uses a non-existent email, the server could return immediately without performing password hashing. An attacker measuring response times can distinguish "email not found" (fast) from "wrong password" (slow, due to Argon2 hashing), enabling email enumeration.

### Decision

When a user is not found during login, execute a dummy password verification against a pre-computed hash (`DUMMY_PASSWORD_HASH`) before returning the error:

```typescript
if (!user) {
  await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
  throw new UnauthorizedError("Invalid credentials");
}
```

### Implementation Detail

`DUMMY_PASSWORD_HASH` is computed once at module load time (top-level `await`) using the same Argon2id parameters, avoiding expensive hash generation overhead during request processing.

### Rationale

- **Timing Attack Prevention:** Ensures both "user not found" and "wrong password" paths take approximately equal time (~100ms with Argon2id), preventing email enumeration via timing analysis.
- **Identical Error Messages:** Both paths return the same `"Invalid credentials"` message, providing no oracle for distinguishing the two failure modes.

---

## ADR-023 — Silent Return for Enumeration-Sensitive Endpoints

**Status:** Accepted

### Context

Endpoints like "Forgot Password", "Resend Verification Token", and "Logout" could reveal whether an email is registered in the system based on differential error responses or HTTP status codes.

### Decision

Enumeration-sensitive endpoints return identical success responses regardless of whether the target user exists, is already verified, or uses social login:

- `forgotPassword`: Returns silently if the user doesn't exist or has no password (social login account).
- `resendVerificationToken`: Returns silently if the user doesn't exist or is already verified.
- `logout`: Returns silently if the session has already been deleted.
- `logoutAll`: Returns silently if the user doesn't exist.

### Rationale

- **Account Enumeration Prevention:** An attacker cannot distinguish "email registered" from "email not registered" based on API response or status code.
- **Idempotency:** Repeated calls to these endpoints are safe and produce no side effects if the target state is already reached.

---

## ADR-024 — Atomic Token Verification Transactions

**Status:** Accepted

### Context

Email verification and password reset both involve a "find token → mutate user → delete token" sequence. If these steps are executed as separate queries, two concurrent requests using the same token can both read it as valid, leading to race conditions.

### Decision

Wrap token lookup, user mutation, and token deletion inside Prisma `$transaction` blocks:

- `verifyEmailAndDeleteToken`: Finds the verification token, marks the user as verified, and deletes the token — all within a single transaction.
- `resetPasswordAndDeleteToken`: Finds the reset token, updates the password hash, deletes the token, and revokes all sessions — all within a single transaction.

Both catch Prisma `P2025` errors ("Record to delete not found") to handle the case where a concurrent transaction already consumed the token, returning a clean `400 Bad Request` instead of an unhandled `500`.

### Rationale

- **ACID Guarantees:** The read-update-delete sequence is atomic. A concurrent duplicate request either sees the token or fails cleanly.
- **Race Safety:** The `P2025` catch clause handles concurrent token consumption gracefully, ensuring exactly one request succeeds.
- **Data Integrity:** User state mutations and token cleanup are never partially applied.

---

## ADR-025 — Idempotent Token Re-issuance via Upsert

**Status:** Accepted

### Context

Users may click "Resend Verification Email" or "Forgot Password" multiple times. If the database uses `create` for token insertion, repeated clicks throw unique constraint violations on the `userId` column (since both `EmailVerificationToken` and `PasswordResetToken` enforce `@unique` on `userId`).

### Decision

Use Prisma `upsert` for token re-issuance:

```typescript
prisma.emailVerificationToken.upsert({
  where: { userId },
  update: { tokenHash, expiresAt, createdAt: new Date() },
  create: { tokenHash, userId, expiresAt },
});
```

The same pattern is applied for `PasswordResetToken`.

### Rationale

- **Idempotency:** Repeated clicks safely update the existing token record rather than throwing constraint violations.
- **Token Refresh:** Each re-issuance resets `createdAt` and `expiresAt`, giving the user a fresh window.
- **Single Token Per User:** The `@unique` constraint on `userId` guarantees at most one active token per user per token type, preventing token accumulation.

---

## ADR-026 — Middleware-Based Request Validation with Zod 4

**Status:** Accepted

### Context

Validating request bodies inside controllers creates repetitive boilerplate and mixes validation concerns with HTTP handling logic.

### Decision

Implement a `validate` middleware factory that accepts a `ZodType` schema and returns an Express middleware. The middleware validates `req.body` via `schema.safeParse()`, replaces `req.body` with the parsed output (stripping unknown fields), and calls `next()` on success or throws a `ValidationError` on failure.

```typescript
export const validate = (schema: ZodType) => {
  return asyncHandler(async (req, _res, next) => {
    const input = schema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }
    req.body = input.data;
    next();
  });
};

// Usage in routes:
router.post("/signup", validate(authSchema.signup), authController.signup);
```

### Implementation Details

- Uses `ZodType` (not the deprecated `ZodSchema` alias) for forward compatibility with Zod v4+.
- Validation schemas are defined in `auth.validation.ts` as a single `authSchema` namespace object.
- Shared sub-schemas (e.g., `password = z.string().min(8).max(128)`) are extracted as reusable constants to enforce consistent constraints across `signup`, `login`, `resetPassword`, and `changePassword`.
- TypeScript types are inferred from schemas via `z.infer<typeof authSchema.signup>`, ensuring validation and type definitions never drift apart.

### Rationale

- **DRY Validation:** Each route's validation logic is declared once as a schema and wired via middleware.
- **Clean Controllers:** Controllers receive pre-validated, strongly typed `req.body` data.
- **Stripping Unknown Fields:** `safeParse` output contains only declared fields, preventing mass-assignment vulnerabilities.
- **Higher-Order Function Composition:** The `validate()` factory returns a curried middleware, composable with Express's middleware chain.

---

## ADR-027 — Session Revocation on Password Change and Reset

**Status:** Accepted

### Context

When a user changes or resets their password, existing sessions authenticated with the old credentials should no longer be valid. Leaving them active creates a window where a compromised session can still be used.

### Decision

Both `changePassword` and `resetPasswordAndDeleteToken` repository methods atomically delete all user sessions (`sessions: { deleteMany: {} }`) as part of the same database update operation. The controller additionally calls `clearAuthCookies(res)` to purge the current browser's cookies.

### Rationale

- **Immediate Invalidation:** All sessions across all devices are terminated instantly when credentials change.
- **Atomic Operation:** Session deletion happens in the same database write as the password update — no window where old sessions remain valid with the new password.
- **Clean Client State:** Cookie clearing ensures the current browser doesn't attempt requests with stale tokens.

---

## ADR-028 — Password Change Distinctness Enforcement

**Status:** Accepted

### Context

Users may attempt to "change" their password to their current password, which provides no security benefit and may indicate confusion or misuse.

### Decision

During `changePassword`, after verifying the old password, the service verifies that the new password is different from the current one by running `verifyPassword(user.passwordHash, input.newPassword)`. If they match, a `400 Bad Request` is returned.

### Rationale

- **Security Hygiene:** Prevents users from performing no-op password changes that create a false sense of security.
- **Correct Error Semantics:** Uses `AppError` (400) rather than `UnauthorizedError` (401) because the user is already authenticated — only the input is invalid.

---

## ADR-029 — `deleteMany` for Idempotent Session Deletion

**Status:** Accepted

### Context

Prisma's `session.delete({ where: { id } })` throws a `P2025` error ("Record to delete does not exist") if the session has already been deleted by a concurrent request or has already expired and been cleaned up.

### Decision

Use `session.deleteMany({ where: { id: sessionId } })` for single-session deletion instead of `session.delete()`.

### Rationale

- **Idempotency:** `deleteMany` returns `{ count: 0 }` instead of throwing if the record doesn't exist.
- **Race Safety:** Concurrent logout requests or token reuse detection can safely attempt to delete the same session without error handling overhead.
- **Simpler Code:** Eliminates the need for try-catch blocks around session deletion operations.

---

## ADR-030 — `passwordChangedAt` Audit Timestamp

**Status:** Accepted

### Context

Tracking when a user's password was last changed is important for security auditing, compliance reporting, and potential future features like forced password rotation policies.

### Decision

Add a `passwordChangedAt` (`DateTime?`) column to the `User` model. It is updated atomically during both `resetPasswordAndDeleteToken` and `changePassword` repository operations.

### Rationale

- **Audit Trail:** Provides a persistent record of the last credential change timestamp.
- **Future-Proofing:** Enables features like "require password change after N days" or "invalidate sessions created before password change".
- **Nullable Design:** `null` indicates the password has never been changed since account creation.

---

## ADR-031 — Argon2id Password Hashing with OWASP Parameters

**Status:** Accepted

### Context

Password hashing algorithm and parameter selection directly impact the security of stored credentials. Weak algorithms (MD5, SHA-256) or insufficient work factors make brute-force attacks feasible.

### Decision

Use **Argon2id** with OWASP-recommended parameters:

| Parameter | Value |
|---|---|
| Algorithm | Argon2id |
| Memory Cost | 65,536 KiB (64 MiB) |
| Time Cost | 3 iterations |
| Parallelism | 4 threads |
| Hash Length | 32 bytes |

Configuration is explicitly declared in `ARGON2_OPTIONS` rather than relying on library defaults.

### Rationale

- **OWASP Compliance:** Parameters align with OWASP Password Storage Cheat Sheet recommendations.
- **Argon2id Variant:** Provides resistance against both side-channel (timing) attacks and GPU-based brute-force attacks.
- **Explicit Configuration:** Declaring parameters prevents silent security regressions if library defaults change across versions.

---

## ADR-032 — Social Login Account Guarding

**Status:** Accepted

### Context

Users who register via social login (OAuth) have a `null` `passwordHash`. Allowing password-based operations on these accounts leads to confusing errors or security issues.

### Decision

Guard all password-dependent flows against social login accounts:

- **Login:** Returns `403 Forbidden` with a message directing the user to their social login provider.
- **Forgot Password:** Returns silently (same as "user not found") to prevent enumeration.
- **Change Password:** Returns `403 Forbidden` with an explicit message explaining that social login accounts cannot change passwords.

### Rationale

- **User Experience:** Clear, actionable error messages guide social login users to the correct authentication flow.
- **Enumeration Prevention:** `forgotPassword` treats social login accounts identically to non-existent accounts (silent return).
- **Data Integrity:** Prevents setting a password on an account that was never intended to use password-based authentication.

---

## ADR-033 — Cookie-Based Token Transport

**Status:** Accepted

### Context

Authentication tokens can be transported via HTTP headers (`Authorization: Bearer`), local storage, or HTTP cookies. Each approach has different security tradeoffs.

### Decision

Transport both access tokens and refresh tokens exclusively via `httpOnly`, `secure`, `sameSite: "lax"` cookies. Tokens are never exposed to client-side JavaScript or returned in response bodies.

### Implementation Details

- **Access Token Cookie:** Scoped to path `/`, available to all API routes. `maxAge` synchronized with `JWT_ACCESS_EXPIRES_IN_MS`.
- **Refresh Token Cookie:** Scoped to path `/auth/refresh-token`, restricting its transmission to only the refresh endpoint. `maxAge` synchronized with `JWT_REFRESH_EXPIRES_IN_MS`.
- Both cookies use `priority: "high"` to prevent browser eviction under storage pressure.

### Rationale

- **XSS Protection:** `httpOnly` prevents client-side JavaScript from reading tokens, eliminating the primary XSS token theft vector.
- **CSRF Mitigation:** `sameSite: "lax"` prevents cookies from being sent on cross-origin POST requests.
- **Minimal Exposure:** Scoping the refresh token cookie to `/auth/refresh-token` ensures it is only transmitted when refreshing, reducing the attack surface.
- **Automatic Transport:** Browsers automatically include cookies on matching requests, simplifying client-side implementation.
