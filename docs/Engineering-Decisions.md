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

| Module | Domain | Key Endpoints |
|---|---|---|
| `auth/` | Authentication & session management | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh-token`, etc. |
| `authorization/` | Permission resolution & caching | Internal service (consumed by `auth` middleware) |
| `users/` | User profile & role assignment | `GET /users/:id`, `PATCH /users/:id/role` |
| `roles/` | Role-permission management | `PUT /roles/:roleName/permissions` |
| `health/` | Operational health monitoring | `GET /health` |
| `email/` | Email dispatch (verification, reset) | Internal service |

### Module File Convention

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
import { AppError, asyncHandler, UnauthorizedError } from "../../common/errors/index.js";
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

export const validate = (schema: ZodType, target: ValidationTarget = ValidationTarget.BODY) => {
  return asyncHandler(async (req, _res, next) => {
    const input = schema.safeParse(req[target]);
    if (!input.success) throw new ValidationError(formatZodError(input.error));
    req[target] = input.data;
    next();
  });
};

// Usage — multiple targets chainable on a single route:
router.put("/:roleName/permissions",
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

| Parameter | Value |
|---|---|
| Memory Cost | 65,536 KiB (64 MiB) |
| Time Cost | 3 iterations |
| Parallelism | 4 threads |
| Hash Length | 32 bytes |

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
- **Refresh Token:** Path `/auth/refresh-token` (scoped to refresh endpoint only), `maxAge` = `JWT_REFRESH_EXPIRES_IN_MS`.
- Both use `priority: "high"` to prevent browser eviction.

### Rationale

- **XSS Protection:** `httpOnly` prevents JS token theft.
- **CSRF Mitigation:** `sameSite: "lax"` blocks cross-origin POST cookies.
- **Minimal Exposure:** Refresh token scoped to `/auth/refresh-token` only.

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

| Property | Value |
|---|---|
| Key Pattern | `role:permissions:<ROLE_NAME>` |
| Value | JSON-serialized `PermissionName[]` |
| TTL | 24 hours |
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

| Guard | Logic | Use Case |
|---|---|---|
| `requireRole(...roles)` | OR — at least one role | Admin-only endpoints |
| `requirePermission(...permissions)` | AND — all permissions required | Fine-grained capability checks |
| `requireSelfOrPermission(permission)` | Self OR permission | User profile endpoints |

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
permissions: z.enum(PERMISSIONS).array().transform((items) => Array.from(new Set(items)))
```

### Rationale

- **Boundary Enforcement:** Normalization at the earliest point keeps downstream layers clean.
- **Idempotent API:** Duplicates produce the same result as unique entries — client-friendly.
- Alternative: `.refine()` rejects duplicates with `400` (stricter but less forgiving).
