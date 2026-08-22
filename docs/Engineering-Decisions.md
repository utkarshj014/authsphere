# Architecture Decision Records (ADR) — AuthSphere

This document records the architectural and engineering decisions made during the design, development, and evolution of **AuthSphere** — a production-grade, highly secure authentication and session management platform.

---

## Index of Decisions

### By Domain Category

<details open>
<summary><b>🏗️ Architecture & Project Boundaries</b></summary>

- [ADR-001: Monorepo Architecture](#adr-001--monorepo-architecture)
- [ADR-002: Feature-Based Modular Architecture](#adr-002--feature-based-modular-architecture)
- [ADR-006: Explicit Generated Prisma Client Location](#adr-006--explicit-generated-prisma-client-location)
- [ADR-007: Infrastructure Client Isolation](#adr-007--infrastructure-client-isolation)
- [ADR-019: Standalone Function Export Pattern](#adr-019--standalone-function-export-pattern)
- [ADR-020: Barrel Index Re-Exports with Explicit ESM Extensions](#adr-020--barrel-index-re-exports-with-explicit-esm-extensions)
- [ADR-034: Shared Domain Constants via `@authsphere/shared`](#adr-034--shared-domain-constants-via-authsphereshared)

</details>

<details open>
<summary><b>🔐 Security, Cryptography & Credentials</b></summary>

- [ADR-022: Constant-Time Login Response (Timing Attack Mitigation)](#adr-022--constant-time-login-response-timing-attack-mitigation)
- [ADR-023: Silent Return for Enumeration-Sensitive Endpoints](#adr-023--silent-return-for-enumeration-sensitive-endpoints)
- [ADR-031: Argon2id Password Hashing with OWASP Parameters](#adr-031--argon2id-password-hashing-with-owasp-parameters)
- [ADR-032: Social Login Account Guarding](#adr-032--social-login-account-guarding)
- [ADR-033: Cookie-Based Token Transport](#adr-033--cookie-based-token-transport)
- [ADR-040: AES-256-GCM Symmetric Encryption for MFA Secrets at Rest](#adr-040--aes-256-gcm-symmetric-encryption-for-mfa-secrets-at-rest)
- [ADR-042: Refresh Token Cookie Path Scoped to `/auth`](#adr-042--refresh-token-cookie-path-scoped-to-auth)
- [ADR-044: Explicit JSON Body Size Limit](#adr-044--explicit-json-body-size-limit)

</details>

<details open>
<summary><b>🔑 Authentication & Session Management</b></summary>

- [ADR-012: Unified Session Model (Session + Refresh Token)](#adr-012--unified-session-model-session--refresh-token)
- [ADR-013: Hard Deletion Strategy for Session Revocation](#adr-013--hard-deletion-strategy-for-session-revocation)
- [ADR-014: Refresh Token Rotation with Automatic Reuse Detection](#adr-014--refresh-token-rotation-with-automatic-reuse-detection)
- [ADR-015: Pre-Persistence UUIDv7 Session Identifiers](#adr-015--pre-persistence-uuidv7-session-identifiers)
- [ADR-016: Centralized Auth Cookie Sanitization in Error Middleware](#adr-016--centralized-auth-cookie-sanitization-in-error-middleware)
- [ADR-027: Session Revocation on Password Change and Reset](#adr-027--session-revocation-on-password-change-and-reset)
- [ADR-028: Password Change Distinctness Enforcement](#adr-028--password-change-distinctness-enforcement)
- [ADR-029: `deleteMany` for Idempotent Session Deletion](#adr-029--deletemany-for-idempotent-session-deletion)
- [ADR-039: Centralized Auth Token and Session Generation](#adr-039--centralized-auth-token-and-session-generation)

</details>

<details open>
<summary><b>🛡️ Multi-Factor Authentication (MFA)</b></summary>

- [ADR-045: Ephemeral MFA Challenge Tokens for Two-Step Authentication](#adr-045--ephemeral-mfa-challenge-tokens-for-two-step-authentication)
- [ADR-046: Monotonic Window Tracking for TOTP Replay Prevention](#adr-046--monotonic-window-tracking-for-totp-replay-prevention)
- [ADR-047: SHA-256 Hashed Recovery Codes with Atomic Single-Use Consumption](#adr-047--sha-256-hashed-recovery-codes-with-atomic-single-use-consumption)
- [ADR-048: Dual-Factor Enforcement on Sensitive Credential Mutations](#adr-048--dual-factor-enforcement-on-sensitive-credential-mutations)
- [ADR-049: Proactive Low Recovery Code Warning Threshold](#adr-049--proactive-low-recovery-code-warning-threshold)

</details>

<details open>
<summary><b>⚙️ Validation, Middleware & Authorization</b></summary>

- [ADR-003: Single-Source Environment Configuration](#adr-003--single-source-environment-configuration)
- [ADR-004: Strict Runtime Schema Validation for Config](#adr-004--strict-runtime-schema-validation-for-config)
- [ADR-017: Human-Readable Duration Synchronization](#adr-017--human-readable-duration-synchronization)
- [ADR-021: Structured `req.auth` Context Object](#adr-021--structured-reqauth-context-object)
- [ADR-026: Multi-Target Middleware Validation with Zod 4](#adr-026--multi-target-middleware-validation-with-zod-4)
- [ADR-035: Redis Permission Caching with Fail-Safe Bypass](#adr-035--redis-permission-caching-with-fail-safe-bypass)
- [ADR-036: Middleware-Based Authorization Guards](#adr-036--middleware-based-authorization-guards)
- [ADR-038: Validation-Layer Input Normalization via Zod Transforms](#adr-038--validation-layer-input-normalization-via-zod-transforms)
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting with Lua Scripting](#adr-050--redis-backed-fixed-window-rate-limiting-with-lua-scripting)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Secure Client IP Resolution via Express `req.ip`](#adr-054--secure-client-ip-resolution-via-express-reqip)
- [ADR-055: Origin Validation for State-Changing Requests](#adr-055--origin-validation-for-state-changing-requests)

</details>

<details open>
<summary><b>🗄️ Data Access, ORM & Transactions</b></summary>

- [ADR-005: Prisma 7 ORM with Native PostgreSQL Driver Adapter](#adr-005--prisma-7-orm-with-native-postgresql-driver-adapter)
- [ADR-018: Repository-Level Filtering of Expired Sessions](#adr-018--repository-level-filtering-of-expired-sessions)
- [ADR-024: Atomic Token Verification Transactions](#adr-024--atomic-token-verification-transactions)
- [ADR-025: Idempotent Token Re-issuance via Upsert](#adr-025--idempotent-token-re-issuance-via-upsert)
- [ADR-030: `passwordChangedAt` Audit Timestamp](#adr-030--passwordchangedat-audit-timestamp)
- [ADR-037: Atomic Role-Permission Replacement via Nested Prisma Mutations](#adr-037--atomic-role-permission-replacement-via-nested-prisma-mutations)
- [ADR-041: Repository-Level Unique Constraint Error Handling](#adr-041--repository-level-unique-constraint-error-handling)

</details>

<details open>
<summary><b>📊 Observability, Reliability & Operations</b></summary>

- [ADR-008: Hierarchical Error Handling Pipeline](#adr-008--hierarchical-error-handling-pipeline)
- [ADR-009: Structured Observability with Pino & Request Context](#adr-009--structured-observability-with-pino--request-context)
- [ADR-010: Multi-Resource Graceful Shutdown](#adr-010--multi-resource-graceful-shutdown)
- [ADR-011: Operational Health Monitoring Pattern](#adr-011--operational-health-monitoring-pattern)
- [ADR-043: Request ID Sanitization with Context Preservation](#adr-043--request-id-sanitization-with-context-preservation)

</details>

---

### Chronological Numerical Index

<details>
<summary><b>View Full Sequential Index (ADR-001 to ADR-055)</b></summary>

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
- [ADR-026: Multi-Target Middleware Validation with Zod 4](#adr-026--multi-target-middleware-validation-with-zod-4)
- [ADR-027: Session Revocation on Password Change and Reset](#adr-027--session-revocation-on-password-change-and-reset)
- [ADR-028: Password Change Distinctness Enforcement](#adr-028--password-change-distinctness-enforcement)
- [ADR-029: `deleteMany` for Idempotent Session Deletion](#adr-029--deletemany-for-idempotent-session-deletion)
- [ADR-030: `passwordChangedAt` Audit Timestamp](#adr-030--passwordchangedat-audit-timestamp)
- [ADR-031: Argon2id Password Hashing with OWASP Parameters](#adr-031--argon2id-password-hashing-with-owasp-parameters)
- [ADR-032: Social Login Account Guarding](#adr-032--social-login-account-guarding)
- [ADR-033: Cookie-Based Token Transport](#adr-033--cookie-based-token-transport)
- [ADR-034: Shared Domain Constants via `@authsphere/shared`](#adr-034--shared-domain-constants-via-authsphereshared)
- [ADR-035: Redis Permission Caching with Fail-Safe Bypass](#adr-035--redis-permission-caching-with-fail-safe-bypass)
- [ADR-036: Middleware-Based Authorization Guards](#adr-036--middleware-based-authorization-guards)
- [ADR-037: Atomic Role-Permission Replacement via Nested Prisma Mutations](#adr-037--atomic-role-permission-replacement-via-nested-prisma-mutations)
- [ADR-038: Validation-Layer Input Normalization via Zod Transforms](#adr-038--validation-layer-input-normalization-via-zod-transforms)
- [ADR-039: Centralized Auth Token and Session Generation](#adr-039--centralized-auth-token-and-session-generation)
- [ADR-040: AES-256-GCM Symmetric Encryption for MFA Secrets at Rest](#adr-040--aes-256-gcm-symmetric-encryption-for-mfa-secrets-at-rest)
- [ADR-041: Repository-Level Unique Constraint Error Handling](#adr-041--repository-level-unique-constraint-error-handling)
- [ADR-042: Refresh Token Cookie Path Scoped to `/auth`](#adr-042--refresh-token-cookie-path-scoped-to-auth)
- [ADR-043: Request ID Sanitization with Context Preservation](#adr-043--request-id-sanitization-with-context-preservation)
- [ADR-044: Explicit JSON Body Size Limit](#adr-044--explicit-json-body-size-limit)
- [ADR-045: Ephemeral MFA Challenge Tokens for Two-Step Authentication](#adr-045--ephemeral-mfa-challenge-tokens-for-two-step-authentication)
- [ADR-046: Monotonic Window Tracking for TOTP Replay Prevention](#adr-046--monotonic-window-tracking-for-totp-replay-prevention)
- [ADR-047: SHA-256 Hashed Recovery Codes with Atomic Single-Use Consumption](#adr-047--sha-256-hashed-recovery-codes-with-atomic-single-use-consumption)
- [ADR-048: Dual-Factor Enforcement on Sensitive Credential Mutations](#adr-048--dual-factor-enforcement-on-sensitive-credential-mutations)
- [ADR-049: Proactive Low Recovery Code Warning Threshold](#adr-049--proactive-low-recovery-code-warning-threshold)
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting with Lua Scripting](#adr-050--redis-backed-fixed-window-rate-limiting-with-lua-scripting)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Secure Client IP Resolution via Express `req.ip`](#adr-054--secure-client-ip-resolution-via-express-reqip)
- [ADR-055: Origin Validation for State-Changing Requests](#adr-055--origin-validation-for-state-changing-requests)

</details>

---

## ADR-001 — Monorepo Architecture

**Status:** Accepted

### Context

AuthSphere consists of API services, frontend clients, shared types, validation schemas, and domain constants. Separate repositories cause version drift and duplicated contracts.

### Decision

Use an **npm workspace monorepo** (`apps/*`, `packages/*`).

### Rationale

- Enables seamless code sharing (`@authsphere/shared` for roles, permissions, types).
- Guarantees strict type safety across application boundaries.
- Simplifies dependency management and unified linting/formatting.

---

## ADR-002 — Feature-Based Modular Architecture

**Status:** Accepted

### Context

Layer-first folder structures (`controllers/`, `services/`, `models/`) fragment related logic across distant directories as the application grows.

### Decision

Organize backend code inside `apps/api/src/modules/` by feature domain. Each module encapsulates its routes, controllers, services, repositories, validation schemas, and types.

### Current Modules

| Module           | Domain                               | Key Endpoints                                                             |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `auth/`          | Authentication & session management  | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh-token`, etc. |
| `authorization/` | Permission resolution & caching      | Internal service (consumed by `auth` middleware)                          |
| `users/`         | User profile & role assignment       | `GET /users/:id`, `PATCH /users/:id/role`                                 |
| `roles/`         | Role-permission management           | `PUT /roles/:roleName/permissions`                                        |
| `health/`        | Operational health monitoring        | `GET /health`                                                             |
| `email/`         | Email dispatch (verification, reset) | Internal service                                                          |

### Module File Convention

| File              | Responsibility                                                         |
| ----------------- | ---------------------------------------------------------------------- |
| `*.route.ts`      | Express router with route definitions and middleware wiring            |
| `*.controller.ts` | HTTP request/response handling, cookie management, response formatting |
| `*.service.ts`    | Business logic, orchestration, error decisions                         |
| `*.repository.ts` | Database queries and transactional mutations via Prisma                |
| `*.validation.ts` | Zod schemas and inferred TypeScript types for request input            |
| `*.types.ts`      | Shared TypeScript type definitions for the module                      |
| `index.ts`        | Barrel re-export for external consumers                                |

---

## ADR-003 — Single-Source Environment Configuration

**Status:** Accepted

### Context

Scattered `process.env` usage leads to hidden runtime dependencies, missing variables, and untyped values.

### Decision

Access all environment variables exclusively through `src/config/env.ts`. Direct `process.env` calls outside this file are prohibited.

### Rationale

- Single source of truth for configuration.
- Central auditing of required/optional variables.
- Predictable defaults and type coercions.

---

## ADR-004 — Strict Runtime Schema Validation for Config

**Status:** Accepted

### Context

Starting with invalid configuration (malformed URIs, missing JWT secrets) causes latent runtime crashes during user requests.

### Decision

Validate environment variables at startup using **Zod** (`envSchema.safeParse(process.env)`). Fails fast (`process.exit(1)`) with formatted diagnostics if validation fails.

### Rationale

- **Fail-Fast:** Invalid config prevents boot.
- **Type Safety:** Exports a strongly typed `env` object.
- Supports inline transformations (e.g., `"15m"` → milliseconds via `.transform()`).

---

## ADR-005 — Prisma 7 ORM with Native PostgreSQL Driver Adapter

**Status:** Accepted

### Context

Database access requires type safety, migration support, and performant connection handling.

### Decision

Adopt **Prisma 7** with `@prisma/adapter-pg` and `pg` pool connections.

### Rationale

- End-to-end TypeScript safety from `schema.prisma`.
- Native PostgreSQL driver pools for optimal performance.
- Declarative migration workflow via Prisma CLI.

---

## ADR-006 — Explicit Generated Prisma Client Location

**Status:** Accepted

### Context

Default Prisma client output into `node_modules/@prisma/client` suffers from path resolution issues in monorepo hoisting environments.

### Decision

Generate client into `apps/api/src/generated/prisma` via `generator client { output = "../src/generated/prisma" }`.

### Rationale

- Explicit, reliable imports (`import { Prisma } from "../../generated/prisma/client.js"`).
- Prevents workspace hoisting conflicts in CI/CD.
- Keeps generated artifacts within the project boundary.

---

## ADR-007 — Infrastructure Client Isolation

**Status:** Accepted

### Context

Mixing infrastructure initialization (Prisma, Redis, Pino) with business logic hampers testability.

### Decision

Instantiate and export infrastructure singletons strictly inside `src/lib/` (`prisma.ts`, `redis.ts`, `logger.ts`). Domain-specific library code lives in sub-directories (`lib/crypto/`, `lib/jwt/`).

### Rationale

- Decouples infrastructure from feature modules.
- Centralizes connection pool configuration and reconnect strategies.
- Simplifies mocking during testing.

---

## ADR-008 — Hierarchical Error Handling Pipeline

**Status:** Accepted

### Context

Inconsistent error handling leads to repetitive try/catch, leaked stack traces, and non-standard HTTP codes.

### Decision

Custom error hierarchy extending `AppError`, coupled with `asyncHandler` HOF and global `errorHandler` middleware.

```
AppError (base — carries statusCode)
├── ValidationError (400 — carries errors[] array)
├── UnauthorizedError (401 — triggers cookie cleanup)
└── ForbiddenError (403)
```

### Rationale

- **Dry Controllers:** `asyncHandler` wraps every controller, forwarding thrown errors to global middleware.
- **Consistent DTO:** All errors return `{ success: false, message, errors? }`.
- **Information Leak Protection:** Masks 500 errors as `"Internal Server Error"` in production.
- **Semantic Routing:** `ValidationError` → field errors, `UnauthorizedError` → cookie cleanup + 401.

---

## ADR-009 — Structured Observability with Pino & Request Context

**Status:** Accepted

### Context

Unstructured `console.log` degrades performance and is difficult to query in log aggregators.

### Decision

Use **Pino** for structured JSON logging, integrated with Express via `pino-http` and `requestId` middleware using `X-Request-Id` headers.

### Rationale

- **Performance:** Pino is significantly faster than Winston.
- **Traceability:** Every request gets a unique `requestId` that correlates all associated log lines.

---

## ADR-010 — Multi-Resource Graceful Shutdown

**Status:** Accepted

### Context

Abrupt process termination drops active requests and orphans database/Redis connections.

### Decision

Intercept `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection` in `server.ts` to:

1. Stop accepting new connections (`server.close()`).
2. Drain active connections with a 10-second hard timeout.
3. Concurrently disconnect Prisma and Redis via `Promise.allSettled`.

---

## ADR-011 — Operational Health Monitoring Pattern

**Status:** Accepted

### Context

Container orchestrators rely on liveness/readiness probes. Health check failures should not trigger crash loops.

### Decision

`/health` executes active checks against PostgreSQL (`prisma.$queryRaw`) and Redis (`redis.ping()`), returning `200 OK` or `503 Service Unavailable` with granular `"UP"`/`"DOWN"` status per dependency.

---

## ADR-012 — Unified Session Model (Session + Refresh Token)

**Status:** Accepted

### Context

Separate `Session` and `RefreshToken` models require cross-table joins and complex state synchronization.

### Decision

Merge into a single `Session` entity storing hashed refresh token (`tokenHash`), expiration (`expiresAt`), and client metadata (`ipAddress`, `userAgent`).

### Rationale

- **1-to-1 Mapping:** Active session = valid refresh token.
- **Performance:** No cross-table JOINs during refresh verification.
- **Security:** Stores only `sha256` hashes of refresh tokens.

---

## ADR-013 — Hard Deletion Strategy for Session Revocation

**Status:** Accepted

### Context

Soft-deleting sessions leaves sensitive token fingerprints indefinitely, inflating table size.

### Decision

Revoke sessions via hard `DELETE` upon logout, token reuse detection, password change/reset, or session termination.

### Rationale

- Instantly removes token fingerprints from storage.
- Keeps `Session` table lean for high-throughput auth queries.
- Audit history delegated to dedicated audit log tables.

---

## ADR-014 — Refresh Token Rotation with Automatic Reuse Detection

**Status:** Accepted

### Context

Long-lived refresh tokens present major security risk if stolen.

### Decision

Strict **Refresh Token Rotation (RTR)**: every refresh generates a new token pair while invalidating the old. Reuse of an invalidated token triggers immediate session revocation. Defense-in-depth: JWT `sub` must match `session.userId`.

### Rationale

- Limits single-token exposure window.
- **Reuse Detection:** Stolen token replay → session revocation (configurable: `"SESSION"` or `"GLOBAL"` deletion mode).
- Follows OAuth 2.0 Security Best Current Practices (RFC 6819 / RFC 8725).

---

## ADR-015 — Pre-Persistence UUIDv7 Session Identifiers

**Status:** Accepted

### Context

JWT Access Tokens include Session ID (`sid`). Database-generated PKs require a multi-step roundtrip before signing.

### Decision

Generate Session ID (`crypto.randomUUIDv7()`) in the service layer _before_ database insertion or JWT signing.

### Rationale

- **Time-Ordered:** UUIDv7's time prefix ensures efficient B-Tree index placement in PostgreSQL.
- **Atomic:** Enables constructing JWTs and persisting the session in a single write.
- Prevents orphaned records if JWT signing fails.

---

## ADR-016 — Centralized Auth Cookie Sanitization in Error Middleware

**Status:** Accepted

### Context

Stale auth cookies after authentication failure cause redundant failed requests.

### Decision

Clear `accessToken` and `refreshToken` cookies in the global `errorHandler` whenever `UnauthorizedError` is caught. Cookie clearing reuses the same `CookieOptions` (path, httpOnly, secure, sameSite) defined in `common/utils/cookie.ts`.

### Rationale

- Automatically purges invalid cookies on auth failure.
- Eliminates duplicated `res.clearCookie()` across controllers.
- Guarantees matching cookie attributes between set and clear.

---

## ADR-017 — Human-Readable Duration Synchronization

**Status:** Accepted

### Context

Defining token lifetimes as separate numeric literals across JWT signers, cookies, and DB queries causes synchronization mismatches.

### Decision

Specify expirations as human-readable strings in `.env` (`JWT_ACCESS_EXPIRES_IN="15m"`). Parse into milliseconds at startup via Zod `.transform()`.

### Rationale

- **Single Source of Truth:** JWT `exp`, cookie `maxAge`, and DB `expiresAt` share identical durations.
- **Ops Friendly:** Adjustable via `.env` without code changes.

---

## ADR-018 — Repository-Level Filtering of Expired Sessions

**Status:** Accepted

### Context

Service-layer expiration filtering risks accidental omission in new endpoints.

### Decision

Enforce expiration filtering in repository lookups (e.g., `where: { expiresAt: { gt: new Date() } }`). Expired sessions never leak into the service layer.

### Rationale

- **Defense in Depth:** Query-level filtering prevents expired records from reaching business logic.
- Keeps services focused on domain logic, not timestamp checks.

---

## ADR-019 — Standalone Function Export Pattern

**Status:** Accepted

### Context

Module files need a consistent export convention across controller, service, repository, and validation layers.

### Decision

Define functions as `const` at module scope, grouped into a single named export object at the bottom:

```typescript
const signup = async (input: SignupInput) => { ... };
const login = async (input: LoginInput) => { ... };

export const authService = { signup, login };
```

### Rationale

- **Readability:** Flat indentation, no object literal nesting.
- **Self-reference:** Functions call each other by name (no `this` binding).
- **Grouped imports:** `authService.signup` provides clear provenance at the call site.

---

## ADR-020 — Barrel Index Re-Exports with Explicit ESM Extensions

**Status:** Accepted

### Context

Native Node.js ESM requires explicit `.js` extensions. Deep imports become verbose as the codebase grows.

### Decision

Barrel `index.ts` files at directory boundaries consolidate re-exports. Consumers import from `../../common/errors/index.js`.

```typescript
// Single barrel import replaces multiple deep imports
import {
  AppError,
  asyncHandler,
  UnauthorizedError,
} from "../../common/errors/index.js";
```

### Rationale

- **Zero runtime dependencies:** Fully compliant with Node.js native ESM.
- **Cleaner imports:** Fewer statements, shorter paths.
- **Encapsulation:** Internal reorganization doesn't break consumers.

---

## ADR-021 — Structured `req.auth` Context Object

**Status:** Accepted

### Context

Individual properties (`req.userId`, `req.sessionId`, `req.role`) on the Express `Request` interface create a flat, collision-prone, nullable surface.

### Decision

Populate a structured `req.auth` object from the JWT payload and authorization service:

```typescript
// express.d.ts
auth: {
  userId: string;
  role: RoleName;
  sessionId: string;
  permissions: PermissionName[];
};

// middlewares/auth.ts
const payload = await verifyAccessToken(accessToken);
const permissions = await authorizationService.getPermissionsByRole(payload.role);
req.auth = { userId: payload.sub, role: payload.role, sessionId: payload.sid, permissions };
```

### Rationale

- **Type Safety:** No non-null assertions — `auth` middleware guarantees the object on protected routes.
- **Namespace Isolation:** All auth context under `req.auth`, no collisions with Express internals.
- **Eager Permission Loading:** Permissions resolved once during authentication, available to all downstream guards.

---

## ADR-022 — Constant-Time Login Response (Timing Attack Mitigation)

**Status:** Accepted

### Context

Fast "user not found" vs. slow "wrong password" (Argon2 hashing) enables email enumeration via response timing.

### Decision

When user is not found, execute a dummy `verifyPassword(DUMMY_PASSWORD_HASH, input.password)` before throwing. `DUMMY_PASSWORD_HASH` is pre-computed at module load time (top-level `await`).

### Rationale

- Both "user not found" and "wrong password" paths take ~equal time (~100ms).
- Identical `"Invalid credentials"` message on both paths — no oracle for distinguishing failure modes.

---

## ADR-023 — Silent Return for Enumeration-Sensitive Endpoints

**Status:** Accepted

### Context

Endpoints like "Forgot Password" and "Resend Verification" could reveal whether an email is registered.

### Decision

Return identical success responses regardless of user existence, verification status, or social login:

- `forgotPassword` / `resendVerificationToken`: Silent return if user doesn't exist or is already verified.
- `logout` / `logoutAll`: Silent return if session already deleted.

### Rationale

- **Enumeration Prevention:** No differential response between registered and unregistered emails.
- **Idempotency:** Repeated calls are safe with no unintended side effects.

---

## ADR-024 — Atomic Token Verification Transactions

**Status:** Accepted

### Context

"Find token → mutate user → delete token" as separate queries allows race conditions where two concurrent requests both read the same token as valid.

### Decision

Wrap in Prisma `$transaction` blocks:

- `verifyEmailAndDeleteToken`: Find token + mark user verified + delete token.
- `resetPasswordAndDeleteToken`: Find token + update password + delete token + revoke sessions.

Both catch `P2025` to handle concurrent token consumption gracefully.

### Rationale

- **ACID:** Read-update-delete is atomic; concurrent duplicates fail cleanly with `400 Bad Request`.
- **Data Integrity:** User state mutations and token cleanup are never partially applied.

---

## ADR-025 — Idempotent Token Re-issuance via Upsert

**Status:** Accepted

### Context

Repeated "Resend Verification" or "Forgot Password" clicks would throw unique constraint violations on `userId`.

### Decision

Use Prisma `upsert` for token re-issuance — existing records get updated, new ones get created.

### Rationale

- **Idempotency:** Repeated clicks safely update existing tokens.
- **Token Refresh:** Each re-issuance resets `expiresAt`, giving a fresh window.
- **Single Token Per User:** `@unique` on `userId` guarantees at most one active token per type.

---

## ADR-026 — Multi-Target Middleware Validation with Zod 4

**Status:** Accepted

### Context

Validation inside controllers creates boilerplate and must target different request properties (`body`, `params`, `query`).

### Decision

`validate` middleware factory accepts a `ZodType` schema and explicit `ValidationTarget` enum:

```typescript
export enum ValidationTarget {
  BODY = "body",
  PARAMS = "params",
  QUERY = "query",
}

export const validate = (
  schema: ZodType,
  target: ValidationTarget = ValidationTarget.BODY,
) => {
  return asyncHandler(async (req, _res, next) => {
    const input = schema.safeParse(req[target]);
    if (!input.success) throw new ValidationError(formatZodError(input.error));
    req[target] = input.data;
    next();
  });
};

// Usage — multiple targets chainable on a single route:
router.put(
  "/:roleName/permissions",
  validate(rolesSchema.updatePermissionsParams, ValidationTarget.PARAMS),
  validate(rolesSchema.updatePermissionsBody, ValidationTarget.BODY),
  rolesController.updatePermissions,
);
```

### Rationale

- **DRY:** Schema declared once per route, wired via middleware.
- **Clean Controllers:** Pre-validated, typed data. Unknown fields stripped (mass-assignment prevention).
- **Multi-Target:** Single factory handles `body`, `params`, `query` without separate utilities.
- Types inferred via `z.infer<>` — validation and type definitions never drift.

---

## ADR-027 — Session Revocation on Password Change and Reset

**Status:** Accepted

### Context

Existing sessions authenticated with old credentials should be invalidated immediately on password change/reset.

### Decision

Both `changePassword` and `resetPasswordAndDeleteToken` atomically delete all user sessions (`sessions: { deleteMany: {} }`) in the same database write. Controller additionally clears auth cookies.

### Rationale

- **Immediate Invalidation:** All sessions across all devices terminated instantly.
- **Atomic:** No window where old sessions remain valid with the new password.

---

## ADR-028 — Password Change Distinctness Enforcement

**Status:** Accepted

### Context

Changing password to the current password provides no security benefit.

### Decision

After verifying the old password, verify the new password differs via `verifyPassword(user.passwordHash, input.newPassword)`. If identical, return `400 Bad Request`.

### Rationale

- Prevents no-op password changes.
- Uses `AppError(400)` not `UnauthorizedError(401)` — user is authenticated, only the input is invalid.

---

## ADR-029 — `deleteMany` for Idempotent Session Deletion

**Status:** Accepted

### Context

`session.delete()` throws `P2025` if the record doesn't exist (already deleted or expired).

### Decision

Use `session.deleteMany({ where: { id: sessionId } })` — returns `{ count: 0 }` instead of throwing.

### Rationale

- **Idempotent:** Concurrent logout/reuse-detection requests don't need error handling.
- Eliminates try-catch around session deletion.

---

## ADR-030 — `passwordChangedAt` Audit Timestamp

**Status:** Accepted

### Context

Tracking last password change is needed for security auditing and potential forced-rotation policies.

### Decision

`passwordChangedAt` (`DateTime?`) column on `User`, updated atomically during both `resetPassword` and `changePassword`. `null` = never changed since creation.

---

## ADR-031 — Argon2id Password Hashing with OWASP Parameters

**Status:** Accepted

### Decision

**Argon2id** with explicit OWASP-recommended parameters:

| Parameter   | Value               |
| ----------- | ------------------- |
| Memory Cost | 65,536 KiB (64 MiB) |
| Time Cost   | 3 iterations        |
| Parallelism | 4 threads           |
| Hash Length | 32 bytes            |

### Rationale

- **OWASP Compliance:** Resists both side-channel and GPU brute-force attacks.
- **Explicit Config:** Prevents silent regressions if library defaults change.

---

## ADR-032 — Social Login Account Guarding

**Status:** Accepted

### Context

Social login users have `null` `passwordHash`. Password operations on these accounts cause confusing errors.

### Decision

Guard all password-dependent flows:

- **Login:** `403` directing user to their social provider.
- **Forgot Password:** Silent return (same as "user not found").
- **Change Password:** `403` explaining social accounts cannot change passwords.

---

## ADR-033 — Cookie-Based Token Transport

**Status:** Accepted

### Context

Tokens can be transported via headers, localStorage, or cookies — each with different security tradeoffs.

### Decision

Transport both tokens exclusively via `httpOnly`, `secure`, `sameSite: "lax"` cookies. Never exposed to client-side JS or response bodies.

- **Access Token:** Path `/`, `maxAge` = `JWT_ACCESS_EXPIRES_IN_MS`.
- **Refresh Token:** Path `/auth` (covers `/auth/refresh-token` and `/auth/logout`), `maxAge` = `JWT_REFRESH_EXPIRES_IN_MS`.
- Both use `priority: "high"` to prevent browser eviction.

### Rationale

- **XSS Protection:** `httpOnly` prevents JS token theft.
- **CSRF Mitigation:** `sameSite: "lax"` blocks cross-origin POST cookies.
- **Minimal Exposure:** Refresh token scoped to `/auth` — covers refresh and logout endpoints but excluded from unrelated routes.

---

## ADR-034 — Shared Domain Constants via `@authsphere/shared`

**Status:** Accepted

### Context

Role names and permission strings referenced across the API, middleware, validation, and clients. Scattered string literals cause duplication and type-unsafe comparisons.

### Decision

Define domain constants in `@authsphere/shared` as `as const` object maps with inferred union types:

```typescript
export const ROLES = { USER: "USER", ADMIN: "ADMIN" } as const;
export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  PROFILE_READ: "profile.read",
  USER_READ: "user.read",
  ROLE_MANAGE: "role.manage",
  // ...
} as const;
export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

### Rationale

- **Standard JS:** `as const` objects — no transpiler transformations, ESM and tree-shaking compatible.
- **Zod 4 Native:** `z.enum(ROLES)` accepts `as const` object maps directly.
- TS `enum` reserved for internal framework options (e.g., `ValidationTarget`); `as const` for domain data.

---

## ADR-035 — Redis Permission Caching with Fail-Safe Bypass

**Status:** Accepted

### Context

Every authenticated request resolves role → permissions. Querying PostgreSQL on every request adds unnecessary latency for rarely-changing data.

### Decision

Cache via `authorizationService.getPermissionsByRole()` in Redis. Fall back to DB on cache miss or Redis unavailability.

| Property     | Value                                                |
| ------------ | ---------------------------------------------------- |
| Key Pattern  | `role:permissions:<ROLE_NAME>`                       |
| Value        | JSON-serialized `PermissionName[]`                   |
| TTL          | 24 hours                                             |
| Invalidation | `DEL` via `invalidateRolePermissionsCache(roleName)` |

### Fail-Safe

Checks `redis.isOpen` before every read/write. Redis outages → transparent DB fallback, zero downtime. Cache bypass logged at `debug` level.

### Invalidation

Cache invalidation occurs **only after** the DB transaction succeeds:

```
PUT /roles/:roleName/permissions → DB update → Redis DEL
```

---

## ADR-036 — Middleware-Based Authorization Guards

**Status:** Accepted

### Context

Authorization checks scattered in controllers mix access control with business logic.

### Decision

Composable Express middleware factories in `authorization.middleware.ts`:

| Guard                                 | Logic                          | Use Case                       |
| ------------------------------------- | ------------------------------ | ------------------------------ |
| `requireRole(...roles)`               | OR — at least one role         | Admin-only endpoints           |
| `requirePermission(...permissions)`   | AND — all permissions required | Fine-grained capability checks |
| `requireSelfOrPermission(permission)` | Self OR permission             | User profile endpoints         |

Each guard includes defensive `if (!req.auth)` → `UnauthorizedError`.

### Middleware Pipeline Ordering

```
auth → validate(params) → validate(body) → requireRole/requirePermission → controller
```

Validation before authorization ensures malformed input returns `400` not `403`.

### Rationale

- **Declarative:** Authorization visible in route definitions.
- **AND vs OR:** `requirePermission` uses `.every()` (Least Privilege); `requireRole` uses `.includes()` (single role).

---

## ADR-037 — Atomic Role-Permission Replacement via Nested Prisma Mutations

**Status:** Accepted

### Context

Updating role permissions requires deleting existing mappings and inserting new ones. Separate queries risk partial application.

### Decision

Single atomic `role.update()` with nested writes:

```typescript
prisma.role.update({
  where: { name: roleName },
  data: {
    rolePermissions: {
      deleteMany: {},
      create: permissionNames.map((name) => ({
        permission: { connect: { name } },
      })),
    },
  },
});
```

`P2025` caught → `AppError("Role not found", 404)`.

### Rationale

- **Atomic:** Implicit transaction — all-or-nothing.
- **Minimal Code:** Replaces ~40 lines of manual `$transaction` orchestration.
- **Relation Integrity:** `connect: { name }` validates each permission exists.

---

## ADR-038 — Validation-Layer Input Normalization via Zod Transforms

**Status:** Accepted

### Context

Duplicate array entries (e.g., `["profile.read", "profile.read"]`) cause unique constraint violations on composite PKs.

### Decision

Apply `.transform()` in Zod to silently deduplicate at the validation boundary:

```typescript
permissions: z.enum(PERMISSIONS)
  .array()
  .transform((items) => Array.from(new Set(items)));
```

### Rationale

- **Boundary Enforcement:** Normalization at the earliest point keeps downstream layers clean.
- **Idempotent API:** Duplicates produce the same result as unique entries — client-friendly.
- Alternative: `.refine()` rejects duplicates with `400` (stricter but less forgiving).

---

## ADR-039 — Centralized Auth Token and Session Generation

**Status:** Accepted

### Context

JWT signing, refresh token hashing, and session persistence logic was duplicated across `login`, `mfaVerifyLogin`, and `refreshToken` flows in `auth.service.ts`. Each instance independently constructed token payloads, computed hashes, and called different repository methods for session creation versus rotation.

### Decision

Consolidate into a single private helper `generateAuthTokensAndSession` that handles both session creation and rotation via an optional `existingSessionId` parameter:

```typescript
const generateAuthTokensAndSession = async (
  userId: string,
  roleName: RoleName,
  ipAddress?: string,
  userAgent?: string,
  existingSessionId?: string,
): Promise<AuthTokens> => {
  const sessionId = existingSessionId ?? uuidv7();
  // ... sign tokens, hash refresh token, build session payload ...
  if (existingSessionId) {
    await authRepository.rotateSession(sessionId, sessionPayload);
  } else {
    await authRepository.createSession(userId, {
      id: sessionId,
      ...sessionPayload,
    });
  }
  return { accessToken, refreshToken };
};
```

Private helpers (`generateAuthTokensAndSession`, `verifyMfaCodeOrRecoveryCode`) are grouped at the top of the service file under a `// Private Helpers` section, above the public service functions.

### Rationale

- **DRY:** Token signing, hashing, and session writes defined once.
- **Consistency:** All auth flows produce identically structured tokens and sessions.
- **Dual-Mode:** `existingSessionId` differentiates creation from rotation without separate functions.

---

## ADR-040 — AES-256-GCM Symmetric Encryption for MFA Secrets at Rest

**Status:** Accepted

### Context

TOTP secrets stored as plaintext in the `users` table expose all MFA seeds if the database is compromised. Unlike passwords and single-use tokens, TOTP secrets cannot be hashed because the server must recover the original Base32 key to verify 6-digit codes via HMAC-SHA1.

### Decision

Encrypt TOTP secrets at rest using **AES-256-GCM** (authenticated encryption) via `lib/crypto/mfa-encryption.ts`. The encryption key is derived from `env.MFA_ENCRYPTION_KEY` using SHA-256 to produce a consistent 32-byte key.

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| Algorithm      | AES-256-GCM                                          |
| IV             | 96-bit (12 bytes), randomly generated per encryption |
| Auth Tag       | 128-bit (16 bytes)                                   |
| Storage Format | `ivHex:authTagHex:ciphertextHex`                     |
| Key Derivation | `SHA-256(MFA_ENCRYPTION_KEY)` → 32 bytes             |

### Implementation Detail

- `encryptMfaSecret(plaintext)` is called during `mfaSetup` before persisting the secret to the database. The raw plaintext is returned to the user for QR code generation.
- `decryptMfaSecret(secret)` is called during `mfaVerifySetup` and `verifyMfaCodeOrRecoveryCode` before passing the secret to `totp.verifyCode()`.
- **Fail-Safe:** `decryptMfaSecret` returns the input unchanged if it does not match the `iv:tag:ciphertext` format, enabling transparent backward compatibility with pre-encryption plaintext secrets.

### Rationale

- **Defense in Depth:** Database compromise no longer yields usable TOTP seeds.
- **Authenticated Encryption:** GCM mode detects tampering via the auth tag.
- **Backward Compatible:** Fail-safe decryption handles legacy plaintext secrets gracefully.

---

## ADR-041 — Repository-Level Unique Constraint Error Handling

**Status:** Accepted

### Context

The signup flow performs a `findUserByEmail` check before `createUserWithVerificationToken`. Concurrent signup requests with the same email can both pass the existence check, causing the second `prisma.user.create` to throw a raw Prisma `P2002` unique constraint error, which surfaces as an unhandled 500 response.

### Decision

Catch `Prisma.PrismaClientKnownRequestError` with code `P2002` inside `createUserWithVerificationToken` in `auth.repository.ts` and rethrow as `AppError("Email already in use", 409)`. The service-layer `findUserByEmail` check remains as a fast-path optimization.

```typescript
catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError("Email already in use", 409);
  }
  throw error;
}
```

### Rationale

- **Race-Safe:** Concurrent duplicate signups produce clean `409 Conflict` responses.
- **Repository Pattern:** Database constraint errors are translated at the data-access layer, not leaked to services or clients.
- **Defense in Depth:** Combines application-level check (fast path) with database-level constraint (correctness guarantee).

---

## ADR-042 — Refresh Token Cookie Path Scoped to `/auth`

**Status:** Accepted _(Supersedes the `/auth/refresh-token` path specified in ADR-033)_

### Context

The refresh token cookie was originally scoped to `path: "/auth/refresh-token"`, which prevented the browser from sending it to `POST /auth/logout`. The logout endpoint reads `req.cookies.refreshToken` to identify and delete the session, but the cookie was absent due to path mismatch.

### Decision

Broaden the refresh token cookie path from `/auth/refresh-token` to `/auth`. The cookie is now sent to all endpoints under the `/auth` prefix, including `/auth/refresh-token`, `/auth/logout`, and `/auth/logout-all`.

### Rationale

- **Functional Correctness:** Logout can now read and revoke the refresh token session.
- **Minimal Exposure:** The cookie is still excluded from non-auth routes (`/users`, `/roles`, `/health`).
- **Consistency:** Both token refresh and session revocation endpoints receive the cookie without requiring the client to pass it in the request body.

---

## ADR-043 — Request ID Sanitization with Context Preservation

**Status:** Accepted

### Context

The `requestId` middleware accepts client-supplied `X-Request-Id` headers to preserve distributed tracing context from upstream proxies, load balancers, and observability tools (e.g., OpenTelemetry, Datadog). However, accepting arbitrary strings without validation exposes the application to log injection and header injection attacks via control characters or excessively long values.

### Decision

Sanitize incoming `X-Request-Id` values by stripping control characters (`\x00-\x1F`, including `\r\n`) and capping length at 128 characters. If the sanitized result is empty, generate a server-side `crypto.randomUUID()` fallback. No format validation (e.g., UUID regex) is enforced.

```typescript
const sanitizedId =
  typeof incomingId === "string"
    ? incomingId
        .replace(/[\r\n\x00-\x1F]/g, "")
        .trim()
        .slice(0, 128)
    : "";
const id = sanitizedId !== "" ? sanitizedId : randomUUID();
```

### Rationale

- **Injection Prevention:** Stripping control characters eliminates log injection and HTTP header injection vectors.
- **Context Preservation:** Non-restrictive format acceptance supports W3C Trace Context, OpenTelemetry trace IDs, and custom correlation IDs without rejecting valid distributed tracing headers.
- **Bounded Length:** 128-character cap prevents memory abuse from oversized header values.

---

## ADR-044 — Explicit JSON Body Size Limit

**Status:** Accepted

### Context

The default `express.json()` body parser accepts payloads up to 100 KB, which is excessive for an authentication API where request bodies contain only credentials, tokens, and short metadata fields.

### Decision

Set an explicit body size limit of `16kb` via `express.json({ limit: "16kb" })` in `app.ts`.

### Rationale

- **Resource Protection:** Prevents oversized JSON payloads from consuming server memory.
- **Auth-Appropriate:** Authentication payloads (email, password, TOTP codes, recovery codes) are well within 16 KB.
- **Explicit Configuration:** Avoids reliance on framework defaults that may change across Express versions.

---

## ADR-045 — Ephemeral MFA Challenge Tokens for Two-Step Authentication

**Status:** Accepted

### Context

During primary authentication (`POST /auth/login`), users with MFA enabled complete credential verification (first factor) but cannot be granted a full session before completing the second factor. Passing raw user IDs or email addresses to the subsequent `/auth/mfa/verify` endpoint exposes the API to unauthenticated TOTP brute-forcing attacks against arbitrary accounts.

### Decision

Generate a short-lived (5-minute expiration) intermediate `MfaChallenge` record (`mfaToken` UUIDv7) upon successful primary credential verification. Return `{ mfaRequired: true, mfaToken }` to the client without issuing JWT access or refresh tokens. The client must present `mfaToken` alongside the TOTP or recovery code to `POST /auth/mfa/verify`. The challenge is atomically deleted (`deleteMfaChallenge`) immediately upon verification.

### Rationale

- **First-Factor Verification Proof:** `mfaToken` proves the user successfully passed password verification before attempting the second factor.
- **Brute-Force Isolation:** Direct TOTP verification on arbitrary user IDs is impossible without a valid, unexpired challenge token.
- **Single-Use Enforcement:** Hard deletion of the challenge token prevents challenge replay attacks.

---

## ADR-046 — Monotonic Window Tracking for TOTP Replay Prevention

**Status:** Accepted

### Context

TOTP tokens remain mathematically valid across their 30-second time window (plus allowed clock-skew tolerance). An attacker intercepting a valid 6-digit TOTP code within the same 30-second window could replay it on a parallel request to gain unauthorized access.

### Decision

Track the last successfully verified TOTP time window index on the user model (`mfaLastUsedWindow` integer column). During verification, calculate `matchedWindow = currentWindow + delta` (where `delta` is the window offset from `otplib.verifyCode`). Perform an atomic conditional database update:

```typescript
await prisma.user.updateMany({
  where: {
    id: userId,
    OR: [
      { mfaLastUsedWindow: null },
      { mfaLastUsedWindow: { lt: matchedWindow } },
    ],
  },
  data: { mfaLastUsedWindow: matchedWindow },
});
```

If `updateMany` returns `{ count: 0 }`, the code is rejected as replayed or stale.

### Rationale

- **Replay Protection:** Prevents a single TOTP code from being reused within the same 30-second time window.
- **Monotonic Clock Security:** Using a future window index immediately invalidates all preceding window codes.
- **Atomic Concurrency Guard:** `updateMany` with conditional `WHERE` clause eliminates race conditions across concurrent verification requests.

---

## ADR-047 — SHA-256 Hashed Recovery Codes with Atomic Single-Use Consumption

**Status:** Accepted

### Context

Users losing access to their authenticator device require backup recovery codes. Storing recovery codes in plaintext introduces severe risk during database compromise, while un-orchestrated consumption allows double-use race conditions.

### Decision

Generate formatted 11-character recovery codes (`XXXXX-XXXXX`) via `crypto.randomBytes(5)`. Store only SHA-256 digests (`recoveryCodeHashes`) in the `mfa_recovery_codes` table. Consume codes via atomic conditional updates (`verifyAndConsumeRecoveryCode`):

```typescript
await prisma.mfaRecoveryCode.updateMany({
  where: { userId, codeHash, usedAt: null },
  data: { usedAt: new Date() },
});
```

Regenerating recovery codes (`mfaRegenerateRecoveryCodes`) hard-deletes all existing user recovery codes and creates 10 fresh hashed codes in a single `$transaction`.

### Rationale

- **At-Rest Protection:** SHA-256 hashing ensures plaintext recovery codes are never stored in the database.
- **Atomic Single-Use:** `updateMany` checking `usedAt: null` guarantees each recovery code can be consumed exactly once.
- **Transactional Regeneration:** Overwriting recovery codes is atomic, ensuring no window where old and new codes coexist.

---

## ADR-048 — Dual-Factor Enforcement on Sensitive Credential Mutations

**Status:** Accepted

### Context

Allowing password change or password reset to complete without verifying MFA when MFA is enabled on an account creates a security bypass vector where a compromised session or email account can override the account's security credentials.

### Decision

Require MFA verification during `changePassword` and `resetPassword` if `user.mfaEnabled === true`. If the client submits a request without a `code` field, return `{ mfaRequired: true }`. The client must resubmit with the 6-digit TOTP or 11-character recovery code alongside the old/new password or reset token.

### Rationale

- **Bypass Prevention:** Second-factor security cannot be bypassed by password changes or email-based resets.
- **Consistent DX:** Uses the same `verifyMfaCodeOrRecoveryCode` helper and payload structure as the login flow.
- **Defense in Depth:** Protects accounts against session hijacking and email account takeover.

---

## ADR-049 — Proactive Low Recovery Code Warning Threshold

**Status:** Accepted

### Context

Users consuming recovery codes may deplete their backup codes without realizing it, leaving them locked out if their primary authenticator device is lost.

### Decision

When an authentication request (`mfaVerifyLogin`) succeeds via a recovery code, count the user's remaining unused recovery codes (`countUnusedRecoveryCodes`). If `remainingRecoveryCodes <= 2`, include `lowRecoveryCodesWarning: true` and `remainingRecoveryCodes` in the API response.

### Rationale

- **Proactive UX:** Alerts the client application to prompt the user to regenerate backup codes before running out.
- **Zero Overhead:** Count query is executed only when a recovery code is actually consumed, adding zero latency to standard TOTP logins.

---

## ADR-050 — Redis-Backed Fixed-Window Rate Limiting with Lua Scripting

**Status:** Accepted

### Context

HTTP-level rate limiting requires atomic counter management in a shared store. Performing `INCR`, `EXPIRE`, and `TTL` as separate Redis commands introduces race conditions where a key could be incremented without an expiration being set, causing permanent counter leaks.

### Decision

Implement a server-side Lua script registered via `defineScript()` in `src/lib/redis.ts` that atomically executes `INCR`, conditional `EXPIRE` (only on first increment), and `TTL` in a single Redis roundtrip. The script is registered on the Redis client via the `scripts` option, enabling automatic `EVALSHA` execution with transparent `NOSCRIPT` fallback to `EVAL`.

```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('TTL', KEYS[1]) }
```

### Rationale

- **Atomicity:** Single Lua execution guarantees `INCR` + `EXPIRE` are never partially applied.
- **Performance:** `EVALSHA` sends only the SHA1 digest after initial script caching, reducing network payload on repeated calls.
- **Fail-Safe:** `defineScript` handles `NOSCRIPT` errors transparently, re-uploading the script on Redis restarts.

---

## ADR-051 — Centralized Rate Limit Policy Dictionary

**Status:** Accepted

### Context

Rate limit parameters (window duration, request quota, key strategy) scattered across individual route files creates inconsistency and complicates tuning.

### Decision

Define all rate limit policies as a single typed constant `RATE_LIMIT_POLICIES` in `src/middlewares/rate-limit.ts`, typed via `as const satisfies Record<string, RateLimitPolicy>`. The `rateLimiter(policy)` middleware factory consumes any policy from the dictionary.

| Policy                    | Limit | Window | Key Type | Scope                                       |
| ------------------------- | ----- | ------ | -------- | ------------------------------------------- |
| `GLOBAL`                  | 100   | 1 min  | IP       | All routes via `app.use`                    |
| `HEALTH`                  | 60    | 1 min  | IP       | `GET /health`                               |
| `SIGNUP`                  | 5     | 15 min | IP       | `POST /auth/signup`                         |
| `LOGIN`                   | 10    | 1 min  | IP       | `POST /auth/login`                          |
| `FORGOT_PASSWORD`         | 5     | 15 min | IP       | `POST /auth/forgot-password`                |
| `CHANGE_PASSWORD`         | 5     | 15 min | User     | `POST /auth/change-password`                |
| `MFA_VERIFY`              | 10    | 1 min  | IP       | `POST /auth/mfa/verify`                     |
| `MFA_VERIFY_SETUP`        | 5     | 5 min  | User     | `POST /auth/mfa/setup`, `/mfa/verify-setup` |
| `ROLE_UPDATE_PERMISSIONS` | 10    | 1 min  | User     | `PUT /roles/:roleName/permissions`          |

### Rationale

- **Single Source of Truth:** All rate limit parameters are visible and auditable in one location.
- **Type Safety:** `as const satisfies Record<string, RateLimitPolicy>` enables IDE autocompletion while preserving literal types.
- **Tunable:** Adjusting quotas requires editing one dictionary entry — no route file changes.

---

## ADR-052 — Dual-Key Rate Limiting (IP vs Authenticated User)

**Status:** Accepted

### Context

IP-based rate limiting alone is insufficient for authenticated endpoints. Behind shared networks (NAT, corporate proxies, VPNs), many legitimate users share a single IP address, causing false-positive throttling. Conversely, unauthenticated endpoints have no user identity to key on.

### Decision

Each `RateLimitPolicy` declares a `keyType` (`"ip"` or `"user"`). The middleware resolves the rate limit key as follows:

1. `keyType: "ip"` → Uses `getClientIp(req)` (Express `req.ip`) for unauthenticated public endpoints.
2. `keyType: "user"` → Uses `req.auth.userId` (populated by `auth` middleware) for authenticated endpoints. Falls back to IP if `req.auth` is unavailable.

Authenticated routes wire `auth` middleware _before_ `rateLimiter` in the Express chain to ensure `req.auth.userId` is resolved.

### Rationale

- **Precision:** Authenticated user-based keys prevent shared-IP false positives in corporate/VPN environments.
- **Graceful Degradation:** User-keyed policies fall back to IP-based limiting if `req.auth` is unexpectedly absent.
- **Declarative:** `keyType` is part of the policy definition, not embedded in route wiring logic.

---

## ADR-053 — Zod-Validated Proxy Trust Configuration

**Status:** Accepted

### Context

Express `trust proxy` accepts multiple value types (boolean, integer hop count, CSV subnet strings, or arrays). Passing an invalid or unchecked raw string from `process.env` to `app.set("trust proxy", ...)` causes silent misconfiguration, leading to either IP spoofing vulnerabilities (over-trusting) or incorrect client IP resolution (under-trusting).

### Decision

Validate and transform `TRUST_PROXY` at startup in `src/config/env.ts` using Zod `.transform()`. The transformer coerces the raw string into the correct Express-compatible type:

| Input Value        | Output Type   | Example                            |
| ------------------ | ------------- | ---------------------------------- |
| `"false"` / empty  | `false`       | Direct client connections          |
| `"true"`           | `true`        | Single reverse proxy (e.g., Nginx) |
| `"2"`              | `2` (integer) | Two proxy hops                     |
| `"10.0.0.0/8,..."` | `string[]`    | Trusted subnet allowlist           |

Defaults to `"false"` when omitted.

### Rationale

- **Fail-Fast:** Invalid proxy configuration is caught at boot, not during the first user request.
- **Type-Safe:** `env.TRUST_PROXY` is strongly typed as `boolean | number | string | string[]`, matching the Express `trust proxy` API.
- **Centralized:** Follows the single-source environment configuration pattern `[ADR-003, ADR-004]`.

---

## ADR-054 — Secure Client IP Resolution via Express `req.ip`

**Status:** Accepted

### Context

Manually parsing `X-Forwarded-For` headers (`req.headers["x-forwarded-for"].split(",")[0]`) is a well-known IP spoofing vulnerability. An attacker can inject a crafted `X-Forwarded-For: 1.2.3.4, attacker-ip` header to bypass IP-based rate limiting or impersonate a different client IP in session metadata.

### Decision

Replace all manual `X-Forwarded-For` parsing with `getClientIp(req)` in `src/common/utils/ip.ts`, which returns `req.ip || "127.0.0.1"`. Express `req.ip` uses the `proxy-addr` module, which walks the proxy chain from right-to-left and only trusts hops explicitly configured via `app.set("trust proxy", ...)` `[ADR-053]`.

### Rationale

- **Spoofing Prevention:** `proxy-addr` validates proxy chain trust boundaries, rejecting untrusted left-most entries that attackers inject.
- **Consistency:** All IP consumers (rate limiter, session metadata, audit logs) share the same verified IP via a single utility function.
- **Defense in Depth:** Combined with `TRUST_PROXY` Zod validation `[ADR-053]`, the system rejects both misconfigured trust settings and spoofed headers.

---

## ADR-055 — Resource Isolation & Origin Validation for State-Changing Requests

**Status:** Accepted

### Context

Cross-Site Request Forgery (CSRF) and cross-origin state mutations exploit ambient browser credentials (cookies) to execute actions (`POST`, `PUT`, `PATCH`, `DELETE`). While CORS policies restrict cross-origin response reading, simple HTTP requests (`<form>` POST, body-less `POST`) bypass CORS preflights (`OPTIONS`) entirely, executing state mutations on the server before CORS headers are evaluated. Furthermore, deployment architectures hosting frontends separately from backend APIs require cross-domain cookie transport (`SameSite=None`), making server-side request origin verification mandatory.

### Decision

Implement global `originValidation` middleware (`src/middlewares/origin-validation.ts`) mounted after CORS and logging, but before global rate-limiting and body/cookie parsing:

1. **State-Changing Scope**: Evaluates mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`). Idempotent read methods (`GET`, `HEAD`, `OPTIONS`) pass through immediately.
2. **Fetch Metadata Fast-Path**: Leverages unforgeable browser `Sec-Fetch-Site` headers — `same-origin` and `same-site` requests pass with 0ms overhead.
3. **Cross-Site & Opaque Guard**: Explicit `Sec-Fetch-Site: cross-site` requests or opaque/null origins (`Origin: "null"` from sandboxed iframes) are blocked unless the origin explicitly matches `TRUSTED_ORIGIN` (`new URL(env.FRONTEND_URL).origin`).
4. **Non-Browser Passthrough**: Requests without origin metadata (cURL, Postman, mobile apps) proceed unhindered.

### Rationale

- **Primary CSRF Defense**: Protects state-changing endpoints (e.g. `/auth/logout-all`, `/auth/change-password`) against preflight-bypassing simple POST requests.
- **Resource Optimization**: Mounted before `express.json()` and `cookieParser()` to drop untrusted requests (403) and floods (429) before memory allocation or JSON/cookie parsing.
- **Unforgeable Browser Metadata**: Utilizes `Sec-Fetch-Site` headers that JavaScript execution environments cannot manipulate.
- **Sandboxed Attack Mitigation**: Blocks opaque `Origin: "null"` headers originating from untrusted iframe embeds.

