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
- [ADR-059: Provider-Agnostic OAuth 2.0 Strategy Pattern](#adr-059--provider-agnostic-oauth-20-strategy-pattern)
- [ADR-063: Higher-Order Controller Factories for Provider-Agnostic OAuth Handlers](#adr-063--higher-order-controller-factories-for-provider-agnostic-oauth-handlers)
- [ADR-073: Provider-Agnostic Email Abstraction with Resend Implementation](#adr-073--provider-agnostic-email-abstraction-with-resend-implementation)
- [ADR-074: Unified Redis Architecture (ioredis Migration)](#adr-074--unified-redis-architecture-ioredis-migration)

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
- [ADR-056: API-Tuned Security Headers via Helmet Configuration](#adr-056--api-tuned-security-headers-via-helmet-configuration)
- [ADR-060: Redis-Backed Ephemeral OAuth State with Atomic Single-Use Invalidation](#adr-060--redis-backed-ephemeral-oauth-state-with-atomic-single-use-invalidation)
- [ADR-062: Verified Email Enforcement for Social Identity Providers](#adr-062--verified-email-enforcement-for-social-identity-providers)
- [ADR-065: Magic Link Token Lifecycle, Dual-Purpose Email Verification, and Atomic Consumption](#adr-065--magic-link-token-lifecycle-dual-purpose-email-verification-and-atomic-consumption)

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
- [ADR-061: Strict Conflict-Guarded OAuth Identity Resolution Workflow](#adr-061--strict-conflict-guarded-oauth-identity-resolution-workflow)
- [ADR-068: Active Session Introspection, Ownership-Enforced Revocation, and Safe Cookie Invalidation](#adr-068--active-session-introspection-ownership-enforced-revocation-and-safe-cookie-invalidation)

</details>

<details open>
<summary><b>🛡️ Multi-Factor Authentication (MFA)</b></summary>

- [ADR-045: Ephemeral MFA Challenge Tokens for Two-Step Authentication](#adr-045--ephemeral-mfa-challenge-tokens-for-two-step-authentication)
- [ADR-046: Monotonic Window Tracking for TOTP Replay Prevention](#adr-046--monotonic-window-tracking-for-totp-replay-prevention)
- [ADR-047: SHA-256 Hashed Recovery Codes with Atomic Single-Use Consumption](#adr-047--sha-256-hashed-recovery-codes-with-atomic-single-use-consumption)
- [ADR-048: Dual-Factor Enforcement on Sensitive Credential Mutations](#adr-048--dual-factor-enforcement-on-sensitive-credential-mutations)
- [ADR-049: Proactive Low Recovery Code Warning Threshold](#adr-049--proactive-low-recovery-code-warning-threshold)
- [ADR-057: Ephemeral Multi-Challenge MFA Architecture with Single-Use Invalidation](#adr-057--ephemeral-multi-challenge-mfa-architecture-with-single-use-invalidation)

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
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting via Atomic Transactions (MULTI/EXEC)](#adr-050--redis-backed-fixed-window-rate-limiting-via-atomic-transactions-multiexec)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Secure Client IP Resolution via Express `req.ip`](#adr-054--secure-client-ip-resolution-via-express-reqip)
- [ADR-055: Resource Isolation & Origin Validation for State-Changing Requests](#adr-055--resource-isolation--origin-validation-for-state-changing-requests)
- [ADR-066: Multi-Tier Rate Limiting for OAuth Callbacks and Passwordless Magic Links](#adr-066--multi-tier-rate-limiting-for-oauth-callbacks-and-passwordless-magic-links)
- [ADR-067: Atomic Last-Admin Demotion Guard via Exclusive Role Row-Locking](#adr-067--atomic-last-admin-demotion-guard-via-exclusive-role-row-locking)
- [ADR-071: Code-First OpenAPI 3.1 Specification and Interactive Swagger UI Documentation via Zod Registry](#adr-071--code-first-openapi-31-specification-and-interactive-swagger-ui-documentation-via-zod-registry)

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
- [ADR-058: Entity-Based Timestamp Strategy Across Database Schemas](#adr-058--entity-based-timestamp-strategy-across-database-schemas)
- [ADR-064: 1-to-1 Database Relation and Upsert Invalidation for Magic Link Tokens](#adr-064--1-to-1-database-relation-and-upsert-invalidation-for-magic-link-tokens)

</details>

<details open>
<summary><b>📊 Observability, Reliability & Operations</b></summary>

- [ADR-008: Hierarchical Error Handling Pipeline](#adr-008--hierarchical-error-handling-pipeline)
- [ADR-009: Structured Observability with Pino & Request Context](#adr-009--structured-observability-with-pino--request-context)
- [ADR-010: Multi-Resource Graceful Shutdown](#adr-010--multi-resource-graceful-shutdown)
- [ADR-011: Operational Health Monitoring Pattern](#adr-011--operational-health-monitoring-pattern)
- [ADR-069: Multi-Phase Security Audit Logging, Standardized Helper Encapsulation, and Indexed User History Retrieval](#adr-069--multi-phase-security-audit-logging-standardized-helper-encapsulation-and-indexed-user-history-retrieval)
- [ADR-072: Asynchronous Email Delivery via BullMQ Task Queue](#adr-072--asynchronous-email-delivery-via-bullmq-task-queue)
- [ADR-075: Email Worker Retry Policy and Dead-Letter Retention](#adr-075--email-worker-retry-policy-and-dead-letter-retention)

</details>

<details open>
<summary><b>🧪 Testing, Quality & Security Invariants</b></summary>

- [ADR-070: High-Signal Hermetic Testing Architecture across Unit, Integration, and E2E Pyramids](#adr-070--high-signal-hermetic-testing-architecture-across-unit-integration-and-e2e-pyramids)

</details>

---

### Chronological Numerical Index

<details>
<summary><b>View Full Sequential Index (ADR-001 to ADR-075)</b></summary>

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
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting via Atomic Transactions (MULTI/EXEC)](#adr-050--redis-backed-fixed-window-rate-limiting-via-atomic-transactions-multiexec)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Secure Client IP Resolution via Express `req.ip`](#adr-054--secure-client-ip-resolution-via-express-reqip)
- [ADR-055: Resource Isolation & Origin Validation for State-Changing Requests](#adr-055--resource-isolation--origin-validation-for-state-changing-requests)
- [ADR-056: API-Tuned Security Headers via Helmet Configuration](#adr-056--api-tuned-security-headers-via-helmet-configuration)
- [ADR-057: Ephemeral Multi-Challenge MFA Architecture with Single-Use Invalidation](#adr-057--ephemeral-multi-challenge-mfa-architecture-with-single-use-invalidation)
- [ADR-058: Entity-Based Timestamp Strategy Across Database Schemas](#adr-058--entity-based-timestamp-strategy-across-database-schemas)
- [ADR-059: Provider-Agnostic OAuth 2.0 Strategy Pattern](#adr-059--provider-agnostic-oauth-20-strategy-pattern)
- [ADR-060: Redis-Backed Ephemeral OAuth State with Atomic Single-Use Invalidation](#adr-060--redis-backed-ephemeral-oauth-state-with-atomic-single-use-invalidation)
- [ADR-061: Strict Conflict-Guarded OAuth Identity Resolution Workflow](#adr-061--strict-conflict-guarded-oauth-identity-resolution-workflow)
- [ADR-062: Verified Email Enforcement for Social Identity Providers](#adr-062--verified-email-enforcement-for-social-identity-providers)
- [ADR-063: Higher-Order Controller Factories for Provider-Agnostic OAuth Handlers](#adr-063--higher-order-controller-factories-for-provider-agnostic-oauth-handlers)
- [ADR-064: 1-to-1 Database Relation and Upsert Invalidation for Magic Link Tokens](#adr-064--1-to-1-database-relation-and-upsert-invalidation-for-magic-link-tokens)
- [ADR-065: Magic Link Token Lifecycle, Dual-Purpose Email Verification, and Atomic Consumption](#adr-065--magic-link-token-lifecycle-dual-purpose-email-verification-and-atomic-consumption)
- [ADR-066: Multi-Tier Rate Limiting for OAuth Callbacks and Passwordless Magic Links](#adr-066--multi-tier-rate-limiting-for-oauth-callbacks-and-passwordless-magic-links)
- [ADR-067: Atomic Last-Admin Demotion Guard via Exclusive Role Row-Locking](#adr-067--atomic-last-admin-demotion-guard-via-exclusive-role-row-locking)
- [ADR-068: Active Session Introspection, Ownership-Enforced Revocation, and Safe Cookie Invalidation](#adr-068--active-session-introspection-ownership-enforced-revocation-and-safe-cookie-invalidation)
- [ADR-069: Multi-Phase Security Audit Logging, Standardized Helper Encapsulation, and Indexed User History Retrieval](#adr-069--multi-phase-security-audit-logging-standardized-helper-encapsulation-and-indexed-user-history-retrieval)
- [ADR-070: High-Signal Hermetic Testing Architecture across Unit, Integration, and E2E Pyramids](#adr-070--high-signal-hermetic-testing-architecture-across-unit-integration-and-e2e-pyramids)
- [ADR-071: Code-First OpenAPI 3.1 Specification and Interactive Swagger UI Documentation via Zod Registry](#adr-071--code-first-openapi-31-specification-and-interactive-swagger-ui-documentation-via-zod-registry)
- [ADR-072: Asynchronous Email Delivery via BullMQ Task Queue](#adr-072--asynchronous-email-delivery-via-bullmq-task-queue)
- [ADR-073: Provider-Agnostic Email Abstraction with Resend Implementation](#adr-073--provider-agnostic-email-abstraction-with-resend-implementation)
- [ADR-074: Unified Redis Architecture (ioredis Migration)](#adr-074--unified-redis-architecture-ioredis-migration)
- [ADR-075: Email Worker Retry Policy and Dead-Letter Retention](#adr-075--email-worker-retry-policy-and-dead-letter-retention)

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

| Module           | Domain Boundary                                                 |
| ---------------- | --------------------------------------------------------------- |
| `auth/`          | Credential verification, signup, login, OAuth, magic links, MFA |
| `sessions/`      | Active device session tracking, listing, and remote revocation  |
| `authorization/` | Role and permission resolution, caching, and evaluation         |
| `users/`         | User identity, profile management, and administrative roles     |
| `roles/`         | System role and permission definition mappings                  |
| `health/`        | Operational liveness and readiness dependency probing           |
| `email/`         | In-memory and external transactional notification dispatch      |

### Module File Convention

| File              | Responsibility                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| `*.route.ts`      | Express router with route definitions and middleware wiring              |
| `*.controller.ts` | HTTP request/response handling, cookie management, response formatting   |
| `*.service.ts`    | Business logic, orchestration, error decisions                           |
| `*.repository.ts` | Database queries and transactional mutations via Prisma                  |
| `*.validation.ts` | Zod schemas and inferred TypeScript types for request input              |
| `*.openapi.ts`    | OpenAPI 3.1 endpoint registrations and co-located documentation metadata |
| `*.types.ts`      | Shared TypeScript type definitions for the module                        |
| `index.ts`        | Barrel re-export for external consumers                                  |

---

## ADR-003 — Single-Source Environment Configuration

**Status:** Accepted

### Context

Scattered `process.env` usage leads to hidden runtime dependencies, missing variables, and untyped values.

### Decision

Access all environment variables exclusively through `src/config/env.ts`. Direct `process.env` calls outside this file are prohibited.

### Rationale

- **Single Source of Truth:** Centralized access prevents hidden `process.env` dependencies across modules.
- **Auditable Defaults:** Default values, optional flags, and types are consolidated in one schema.
- **Predictable Coercion:** Uniform transformations prevent divergent environment parsing.

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

- **End-to-End Type Safety:** Types are generated directly from `schema.prisma`.
- **Connection Efficiency:** Native `pg` driver pools optimize database throughput.
- **Declarative Migrations:** Standardized CLI migration workflows ensure schema reproducibility.

---

## ADR-006 — Explicit Generated Prisma Client Location

**Status:** Accepted

### Context

Default Prisma client output into `node_modules/@prisma/client` suffers from path resolution issues in monorepo hoisting environments.

### Decision

Generate client into `apps/api/src/generated/prisma` via `generator client { output = "../src/generated/prisma" }`.

### Rationale

- **Explicit Import Resolution:** Resolves package hoisting conflicts across monorepo workspace packages.
- **Build Reproducibility:** Keeps generated Prisma client artifacts within the project boundary.

---

## ADR-007 — Infrastructure Client Isolation

**Status:** Accepted

### Context

Mixing infrastructure initialization (Prisma, Redis, Pino) with business logic hampers testability.

### Decision

Instantiate and export infrastructure singletons strictly inside `src/lib/` (`prisma.ts`, `redis.ts`, `logger.ts`). Domain-specific library code lives in sub-directories (`lib/crypto/`, `lib/jwt/`).

### Rationale

- **Modular Decoupling:** Separates low-level connection infrastructure from domain feature services.
- **Centralized Lifecycles:** Unifies connection pools, retry policies, and reconnect strategies in singleton instances.
- **Test Isolation:** Enables mocking infrastructure singletons without touching business modules.

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
├── ForbiddenError (403)
└── TooManyRequestsError (429)
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

### Rationale

- **Zero Dropped In-Flight Requests:** Gives existing HTTP requests a 10-second window to complete before termination.
- **Resource Cleanliness:** Disconnects persistent database pools and Redis sockets cleanly, preventing orphaned server connections.

---

## ADR-011 — Operational Health Monitoring Pattern

**Status:** Accepted

### Context

Container orchestrators rely on liveness/readiness probes. Health check failures should not trigger crash loops.

### Decision

`/health` executes active checks against PostgreSQL (`prisma.$queryRaw`) and Redis (`redis.ping()`), returning `200 OK` or `503 Service Unavailable` with granular `"UP"`/`"DOWN"` status per dependency.

### Rationale

- **Orchestrator Compatibility:** Provides standard liveness/readiness probes for Kubernetes, Docker, and cloud load balancers.
- **Dependency Isolation:** Identifies which infrastructure dependency is degraded without crashing the API process.

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

- **Exposure Window Limitation:** Frequent rotation limits token lifetime and window of vulnerability.
- **Reuse Detection:** Stolen token replay triggers immediate session revocation across the device or account.
- **RFC Compliance:** Adheres to OAuth 2.0 Security Best Current Practices (RFC 6819 / RFC 8725).

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
req.auth = {
  userId: payload.sub,
  role: payload.role,
  sessionId: payload.sid,
  permissions: await authorizationService.getPermissionsByRole(payload.role),
};
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

- **Constant Time Execution:** Both "user not found" and "wrong password" execution paths consume approximately equal time (~100ms), mitigating timing attacks.
- **Oracle Elimination:** Returning identical `"Invalid credentials"` messaging prevents email enumeration.

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

`validate` middleware factory accepts a `ZodType` schema and explicit `ValidationTarget` (`BODY`, `PARAMS`, `QUERY`):

```typescript
export const validate = (
  schema: ZodType,
  target: ValidationTarget = ValidationTarget.BODY,
) =>
  asyncHandler(async (req, _res, next) => {
    const input = schema.safeParse(req[target]);
    if (!input.success) throw new ValidationError(formatZodError(input.error));
    req[target] = input.data;
    next();
  });
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

- **No-Op Prevention:** Prevents redundant password updates to identical values.
- **Semantic Status Code:** Emits `AppError(400)` rather than `401` because the client identity is verified and the input itself is invalid.

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

### Rationale

- **Audit Traceability:** Distinguishes legacy accounts from recently rotated credentials during security audits.
- **Policy Foundation:** Provides necessary timestamp data for forced periodic credential rotation or stale session termination.

---

## ADR-031 — Argon2id Password Hashing with OWASP Parameters

**Status:** Accepted

### Context

Storing plaintext or weakly hashed passwords exposes user credentials to offline dictionary and GPU rainbow table attacks if the database is breached.

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

### Rationale

- **Clear User Guidance:** Directs social identity users to their respective OAuth provider rather than failing with confusing database errors.
- **Credential Integrity:** Enforces that password-based mutations apply strictly to accounts maintaining local password hashes.

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
  // signs accessToken & refreshToken, persists new or rotates existing session
  return { accessToken, refreshToken };
};
```

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

### Rationale

- **Defense in Depth:** Database compromise no longer yields usable TOTP seeds.
- **Tamper Resistance:** Authenticated encryption (GCM mode) detects any ciphertext alteration via the 128-bit authentication tag.
- **Deterministic Derivation:** SHA-256 key derivation ensures reliable key length from environment configuration.

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
const id = sanitizedId || randomUUID();
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

## ADR-050 — Redis-Backed Fixed-Window Rate Limiting via Atomic Transactions (MULTI/EXEC)

**Status:** Accepted

### Context

HTTP-level rate limiting requires atomic counter management in a shared store. Performing `INCR` and `EXPIRE` as disconnected Redis commands introduces race conditions where a key could be incremented without an expiration being set, causing permanent counter leaks.

### Decision

Atomically execute counter increment and window expiration in a single Redis transaction block using `redis.multi().incr(redisKey).expire(redisKey, secondsRemainingInWindow, "NX").exec()` within `src/middlewares/rate-limit.ts`. The `"NX"` flag on `EXPIRE` ensures TTL is set only on the initial request of the window, while fixed-window bucket keys (`rl:${policy.name}:${identifier}:${bucket}`) ensure mathematical window boundaries without TTL drift.

```typescript
const results = await redis
  .multi()
  .incr(redisKey)
  .expire(redisKey, secondsRemainingInWindow, "NX")
  .exec();

const count = Number(results?.[0]?.[1] ?? 0);
```

### Rationale

- **Strict Atomicity:** `MULTI / EXEC` ensures `INCR` and `EXPIRE` are executed together without intermediate operations.
- **Single Roundtrip:** Commands are pipelined across the network in a single request-response cycle.
- **Pure Infrastructure Decoupling:** Eliminates custom Lua scripts and module augmentation from `src/lib/redis.ts`, keeping the Redis client generic and standard.

---

## ADR-051 — Centralized Rate Limit Policy Dictionary

**Status:** Accepted

### Context

Rate limit parameters (window duration, request quota, key strategy) scattered across individual route files creates inconsistency and complicates tuning.

### Decision

Define all rate limit policies as a single typed constant `RATE_LIMIT_POLICIES` in `src/middlewares/rate-limit.ts`, typed via `as const satisfies Record<string, RateLimitPolicy>`. The `rateLimiter(policy)` middleware factory consumes any policy from the dictionary.

| Policy Tier           | Quota Window | Key Strategy | Primary Protection Scope                                   |
| :-------------------- | :----------- | :----------- | :--------------------------------------------------------- |
| **Global Baseline**   | 100 / 1 min  | IP           | All incoming HTTP traffic via top-level Express middleware |
| **Standard Reads**    | 60 / 1 min   | User ID / IP | Profile queries, session introspection, audit history      |
| **Authentication**    | 10–20 / 1m   | IP           | Login, MFA challenge verification, token rotation          |
| **Account Mutations** | 5–10 / 1m    | User ID      | Role assignments, permission updates                       |
| **Token Dispatches**  | 5 / 15 min   | IP / User ID | Password resets, email verification, magic link dispatches |

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

---

## ADR-056 — API-Tuned Security Headers via Helmet Configuration

**Status:** Accepted

### Context

Default Helmet settings are designed for monolithic server-rendered applications. The default `Cross-Origin-Resource-Policy` (`same-origin`) blocks cross-domain frontends from reading API resources under strict browser COEP/CORP rules. Conversely, default `X-Frame-Options` (`SAMEORIGIN`) is overly permissive for a pure REST API service that never renders HTML frames.

### Decision

Configure `helmet()` in `app.ts` with explicit API-oriented options:

```typescript
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: { action: "deny" },
  }),
);
```

### Rationale

- **Cross-Domain API Compatibility:** Setting `crossOriginResourcePolicy: "cross-origin"` allows CORS-whitelisted frontend applications on distinct hostnames/ports to load API resources without browser CORP policy conflicts.
- **Strict Clickjacking Defense:** Setting `xFrameOptions: "deny"` completely prohibits embedding any API endpoint within an `<iframe>`, providing maximum clickjacking protection for a non-HTML JSON API.
- **Defensive Defaults:** Preserves all standard Helmet security defaults (`nosniff`, `HSTS`, `no-referrer`, `CSP`) while fine-tuning rules for API boundaries.

---

## ADR-057 — Ephemeral Multi-Challenge MFA Architecture with Single-Use Invalidation

**Status:** Accepted

### Context

Enforcing a strict 1-to-1 relationship (`userId @unique`) on MFA challenges causes race conditions and UI glitches when users attempt concurrent logins across multiple tabs or devices, as subsequent login attempts overwrite earlier pending challenge tokens. Conversely, unconstrained token records introduce table bloat and orphaned record risks.

### Decision

Maintain `MfaChallenge` as a 1-to-Many entity on `User` in `schema.prisma` with a 5-minute time-to-live (`expiresAt`). Each login attempt issues a unique, cryptographically random `mfaToken` (`id`). Verification (`POST /auth/mfa/verify`) atomically consumes and deletes the specific challenge (`deleteMfaChallenge`). Rate limiting on `/auth/login` (`RATE_LIMIT_POLICIES.LOGIN`) and short expiration windows prevent table flooding.

### Rationale

- **Multi-Device & Multi-Tab Resilience:** Prevents concurrent logins across tabs or devices from invalidating earlier active challenges.
- **Atomic Single-Use Invalidation:** Deletes the specific `mfaToken` immediately upon successful verification, preventing challenge replay.
- **DoS & Inflation Mitigation:** Combines short 5-minute expiration windows with IP-based login rate limiting to cap active database challenges per account.
- **Domain Model Differentiation:** Differentiates multi-session ephemeral challenges (`MfaChallenge`, `Session`) from single-instance identity state flows (`EmailVerificationToken`, `PasswordResetToken`).

---

## ADR-058 — Entity-Based Timestamp Strategy Across Database Schemas

**Status:** Accepted

### Context

Inconsistent timestamp fields across database models (e.g. `EmailVerificationToken` tracking `updatedAt` while `PasswordResetToken` omitted it) create schema noise and unnecessary write overhead. Clear rules are required to standardize timestamp fields based on entity lifecycle semantics.

### Decision

Enforce entity-based timestamp conventions across `schema.prisma`:

1. **Persistent Domain Entities** (`User`, `OAuthAccount`, `Role`, `Permission`): Maintain both `createdAt` and `updatedAt` for full audit traceability.
2. **Ephemeral Token & Challenge Models** (`EmailVerificationToken`, `PasswordResetToken`, `MagicLinkToken`, `Session`, `MfaChallenge`): Maintain strictly `createdAt` and `expiresAt`, omitting `updatedAt`.

### Rationale

- **Schema Consistency:** Standardizes timestamp conventions across all identity and authentication models.
- **Write Optimization:** Eliminates redundant `@updatedAt` trigger overhead on short-lived single-use token tables.
- **Audit Traceability:** Ensures long-lived domain models (`Role`, `Permission`) maintain mutation timestamps for RBAC auditing.

---

## ADR-059 — Provider-Agnostic OAuth 2.0 Strategy Pattern

**Status:** Accepted

### Context

Integrating diverse third-party identity providers (Google, GitHub, and future social platforms) requires managing differing authorization endpoints, token exchange formats, and user profile schemas. Embedding provider-specific HTTP logic directly within service workflows creates tight coupling and makes introducing new identity providers error-prone.

### Decision

Define a unified `OAuthProviderStrategy` interface in `oauth.types.ts` implemented by isolated provider singletons (`googleOAuthProvider`, `githubOAuthProvider`). Each strategy encapsulates provider-specific endpoints and normalizes external user identity into a standard `OAuthProfile` DTO:

```typescript
export interface OAuthProviderStrategy {
  getAuthorizationUrl(state: string): Promise<URL>;
  getUserProfile(code: string): Promise<OAuthProfile>;
}
```

The core service (`oauth.service.ts`) dispatches requests dynamically via a provider strategy dictionary (`getOAuthStrategy(provider)`).

### Rationale

- **Extensibility & Decoupling:** New OAuth providers require only implementing `OAuthProviderStrategy` without modifying core session, token, or controller layers.
- **Normalized Domain Contract:** Standardizes divergent provider payloads (e.g., Google OpenID `sub` vs GitHub numeric `id`) into a consistent `OAuthProfile`.
- **Isolated Error Boundaries:** Provider-specific HTTP failure modes and API errors remain encapsulated within their respective strategy classes.

---

## ADR-060 — Redis-Backed Ephemeral OAuth State with Atomic Single-Use Invalidation

**Status:** Accepted

### Context

OAuth 2.0 authorization flows require cryptographic state parameters to prevent Cross-Site Request Forgery (CSRF). Persisting state in browser cookies introduces cross-domain edge cases, while database storage causes unnecessary I/O overhead. Furthermore, authorization codes and state parameters must be consumed exactly once to prevent replay attacks.

### Decision

Store 32-byte cryptographically random state strings in Redis under `oauth:state:<state>` with a strict 10-minute TTL. The state value encapsulates flow metadata (`OAuthStateData`: `provider` and optional `userId`). During authorization callback processing, state is atomically fetched and deleted via Redis `GETDEL` (`redis.getDel`) before verifying provider matching:

```typescript
const rawData = await redis.getDel(`oauth:state:${state}`);
if (!rawData)
  throw new AppError("Invalid, expired, or already consumed OAuth state", 400);

const data = JSON.parse(rawData) as OAuthStateData;
if (data.provider !== expectedProvider) {
  throw new AppError("OAuth state provider mismatch", 400);
}
return data;
```

### Rationale

- **Zero-Window Replay Protection:** Atomic `GETDEL` retrieval and deletion guarantees state can never be reused across concurrent callback attempts.
- **Cross-Provider Mismatch Prevention:** Enforces that state issued for one provider cannot be used to authenticate against another.
- **In-Memory Performance:** Eliminates database writes for ephemeral authentication flows, automatically expiring stale or abandoned attempts.

---

## ADR-061 — Strict Conflict-Guarded OAuth Identity Resolution Workflow

**Status:** Accepted

### Context

Social login authentication flows interact with existing local credentials. Automatically linking third-party OAuth identities to existing user accounts solely by email address exposes users to pre-account takeover and identity collision vulnerabilities if an attacker registers an unverified third-party account with a victim's email address.

### Decision

Enforce a strict four-case identity resolution matrix in `oauth.service.ts` (`handleOAuthCallback`):

| Flow Case                                  | Conditions                                         | Resolution Action                                                                                                           |
| :----------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Case 1: Existing Link**                  | `OAuthAccount` exists for `(provider, providerId)` | Authenticate linked user (triggers `MfaChallenge` if `user.mfaEnabled`); reject (`409 Conflict`) if `state.userId` differs. |
| **Case 2: Account Linking**                | `state.userId` present & account not linked        | Link `OAuthAccount` to authenticated user.                                                                                  |
| **Case 3: Unauthenticated Email Conflict** | Email exists in DB without `OAuthAccount` link     | Reject (`409 Conflict`), requiring user to log in with password and link in settings.                                       |
| **Case 4: New User Registration**          | Email does not exist in DB                         | Atomically create `User` (`isEmailVerified: true`) and `OAuthAccount` in a single transaction.                              |

### Rationale

- **Anti-Account Takeover (ATO):** Prohibits implicit auto-linking on unauthenticated flows, requiring explicit credential validation before associating social accounts.
- **Unified MFA Enforcement:** Guarantees that users with MFA enabled (`user.mfaEnabled === true`) cannot bypass secondary authentication via social login.
- **Explicit User Consent:** Account linking requires an active session (`state.userId`), preventing unauthorized account associations.
- **Transactional Atomicity:** User and OAuth account creation execute in a single Prisma write, eliminating orphaned records.

---

## ADR-062 — Verified Email Enforcement for Social Identity Providers

**Status:** Accepted

### Context

Third-party OAuth providers handle email privacy and verification differently. GitHub allows users to keep their email private (returning `null` in public user profiles) or configure unverified email addresses. Trusting unverified emails or failing when public profile email is absent introduces security vulnerabilities and broken authentication flows.

### Decision

Enforce email verification guarantees across all OAuth provider implementations:

1. **Google (`google.provider.ts`):** Validates `email_verified: true` from Google OpenID userinfo, rejecting unverified accounts with `400 Bad Request`.
2. **GitHub (`github.provider.ts`):** Always queries `https://api.github.com/user/emails` using the OAuth access token. Filters strictly for `verified: true`, prioritizing the primary verified email, and falls back to any verified email. If no verified email exists, the callback is rejected with `400 Bad Request`.

### Rationale

- **Impersonation Defense:** Guarantees accounts created via social providers have cryptographically verified ownership of the claimed email address.
- **Seamless GitHub Integration:** Resolves private GitHub email addresses without requiring users to make their primary email publicly visible.
- **Uniform Identity Invariant:** Enforces `isEmailVerified: true` consistency across all social authentication channels.

---

## ADR-063 — Higher-Order Controller Factories for Provider-Agnostic OAuth Handlers

**Status:** Accepted

### Context

OAuth initiation and callback handlers perform identical HTTP-layer responsibilities across providers: extracting IP and user-agent metadata, reading query parameters, setting auth cookies, and sending standard JSON responses. Writing separate controller functions for each provider duplicates routing and cookie handling boilerplate.

### Decision

Implement higher-order controller factories `initiateOAuthHandler` and `oauthCallbackHandler` in `oauth.controller.ts` parameterised by `OAuthProviderName`:

```typescript
export const oauthCallbackHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    const result = await handleOAuthCallback(
      provider,
      req.query.code,
      req.query.state,
      getClientIp(req),
      req.header("user-agent"),
    );
    if (result.mfaRequired)
      return ApiResponse.success(res, result, "MFA verification required", 200);
    setAuthCookies(res, result.tokens);
    return ApiResponse.success(
      res,
      null,
      `Authenticated successfully via ${provider} OAuth`,
      200,
    );
  });
```

Specific provider controllers (`googleInitiate`, `googleCallback`, `githubInitiate`, `githubCallback`) are instantiated and exported for explicit route binding.

### Rationale

- **DRY Controller Layer:** Eliminates duplicated request parsing, cookie assignment, and response formatting across OAuth routes.
- **Explicit Route Mounting:** Retains named controller exports for declarative and transparent route definitions in `auth.route.ts`.
- **Consistent Response Schema:** Ensures all OAuth provider flows return identical cookie structures and response DTOs.

---

## ADR-064 — 1-to-1 Database Relation and Upsert Invalidation for Magic Link Tokens

**Status:** Accepted

### Context

Passwordless magic link authentication allows users to request login links via email. A 1-to-many relationship allows multiple valid tokens to accumulate per user, increasing attack surface and causing database bloat. Furthermore, requesting a new link should invalidate previously issued links sent to the user's inbox.

### Decision

Model `MagicLinkToken` as a strict 1-to-1 relationship on `User` in `schema.prisma` with a `userId @unique` constraint:

```prisma
model MagicLinkToken {
  id        String   @id @default(uuid(7))
  tokenHash String   @unique @map("token_hash")
  userId    String   @unique @map("user_id")
  expiresAt DateTime @map("expires_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("magic_link_tokens")
}
```

Token creation (`createMagicLinkToken`) uses Prisma `upsert`, atomically replacing the existing token hash and updating `expiresAt` (15-minute TTL).

### Rationale

- **Automatic Prior Link Revocation:** Requesting a fresh magic link immediately invalidates any prior link sent to the user's inbox.
- **Zero Orphan Accumulation:** Limits active tokens to at most one per user, preventing table bloat without requiring cron cleanup for superseded tokens.
- **Model Uniformity:** Aligns `MagicLinkToken` with `EmailVerificationToken` and `PasswordResetToken` in schema structure and lifecycle semantics.

---

## ADR-065 — Magic Link Token Lifecycle, Dual-Purpose Email Verification, and Atomic Consumption

**Status:** Accepted

### Context

Magic link authentication provides a passwordless entry mechanism that must handle concurrent replay attacks, token expiration without unnecessary write churn, dual-purpose email verification for unverified users, and seamless support across both password and social-login-created accounts.

### Decision

Implement a clean two-phase lookup and consumption workflow in `auth.repository.ts` and `auth.service.ts`:

1. **Non-Mutating Validity & Expiration Check:**
   Query `findMagicLinkTokenWithUser` checking `tokenHash` and `expiresAt: { gte: new Date() }`. Expired or non-existent tokens return `null` without throwing or executing database writes. Expired records are retained for scheduled batch cleanup.

2. **Atomic Consumption with Dual-Purpose Email Verification:**
   Upon valid token resolution, `consumeMagicLinkToken` executes an atomic `prisma.user.update` with `magicLinkToken: { delete: {} }` and conditional email verification (`isEmailVerified: true`, `verifiedAt: new Date()` if unverified). Concurrent consumption attempts encounter Prisma `P2025` and are rejected with a 400 Bad Request error.

3. **Universal Account Support:**
   Magic links are available to any existing account, enabling users created via OAuth or password to log in passwordlessly.

```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    ...(shouldMarkEmailVerified
      ? { isEmailVerified: true, verifiedAt: new Date() }
      : {}),
    magicLinkToken: { delete: {} },
  },
});
```

### Rationale

- **No Delete-on-Read Race Conditions:** Reading expired tokens produces zero database mutations, preserving records for centralized lifecycle cleanup without spurious write locks.
- **Atomic Concurrency Defense:** Utilizing 1-to-1 nested deletion (`magicLinkToken: { delete: {} }`) guarantees that concurrent requests using the same token fail with an optimistic lock error (`P2025`).
- **Implicit Proof of Ownership:** Receiving and opening a link sent to an email inbox conclusively proves email ownership, eliminating redundant secondary verification steps for unverified accounts.
- **Universal Passwordless Access:** Extends magic link flexibility to all registered users regardless of authentication credential origin (password vs OAuth).

---

## ADR-066 — Multi-Tier Rate Limiting for OAuth Callbacks and Passwordless Magic Links

**Status:** Accepted

### Context

OAuth initiation, OAuth callback redirection, magic link request, and magic link verification endpoints present distinct attack surfaces. Without specialized rate limiting, attackers can exhaust third-party OAuth provider API quotas, spam user inboxes with magic links, or attempt brute-force token verification.

### Decision

Add specialized rate limit policies to `RATE_LIMIT_POLICIES` in `src/middlewares/rate-limit.ts`:

| Policy               | Quota | Window | Key Type | Target Endpoints                     |
| :------------------- | :---- | :----- | :------- | :----------------------------------- |
| `OAUTH_INITIATE`     | 20    | 1 min  | IP       | `GET /auth/oauth/:provider`          |
| `OAUTH_CALLBACK`     | 20    | 1 min  | IP       | `GET /auth/oauth/:provider/callback` |
| `MAGIC_LINK_REQUEST` | 5     | 15 min | IP       | `POST /auth/magic-link`              |
| `MAGIC_LINK_VERIFY`  | 10    | 5 min  | IP       | `POST /auth/magic-link/verify`       |

### Rationale

- **Abuse Prevention:** Throttles outbound email dispatch to protect SMTP quotas and prevent inbox flooding.
- **Provider API Quota Protection:** Prevents rapid authorization code exchanges from triggering third-party OAuth rate limits.
- **Brute-Force Mitigation:** Restricts magic link token submission attempts to 10 per 5 minutes per IP address.

---

## ADR-067 — Atomic Last-Admin Demotion Guard via Exclusive Role Row-Locking

**Status:** Accepted

### Context

Demoting an administrator role requires ensuring at least one active administrator remains in the system. Under PostgreSQL's default `READ COMMITTED` transaction isolation, evaluating an aggregate count across user rows without locking creates a write-skew race condition: two administrators demoting each other simultaneously each read a count of two, pass the guard, and update different rows without lock contention, leaving the system with zero administrators.

### Decision

Enforce the last-admin demotion guard inside an interactive database transaction in `users.repository.ts`. When demoting away from `ADMIN`, the transaction touches the single `ADMIN` record in the `roles` table (`tx.role.update`), acquiring an exclusive row-level lock that serializes all concurrent demotion attempts before evaluating `tx.user.count`:

```typescript
await prisma.$transaction(async (tx) => {
  if (roleName !== ROLES.ADMIN) {
    await tx.role.update({
      where: { name: ROLES.ADMIN },
      data: { updatedAt: new Date() },
    });
  }
  const adminCount = await tx.user.count({
    where: { role: { name: ROLES.ADMIN } },
  });
  if (adminCount <= 1) throw new ForbiddenError("Cannot demote the last admin");
  return tx.user.update({
    where: { id: userId },
    data: { role: { connect: { name: roleName } } },
  });
});
```

### Rationale

- **Write-Skew Elimination:** Mutexing on the unique `ADMIN` role record serializes concurrent demotions without table-wide locks or complex advisory lock SQL.
- **Strict Invariant Guarantee:** Guarantees mathematically that active administrator count cannot drop below one under any concurrency load.
- **Pure ORM Portability:** Relies entirely on standard Prisma client transactional constructs without dialect-specific raw queries.

---

## ADR-068 — Active Session Introspection, Ownership-Enforced Revocation, and Safe Cookie Invalidation

**Status:** Accepted

### Context

Users require visibility into their active device sessions and the ability to remotely revoke suspicious sessions. Exposing sensitive internal token hashes or allowing users to delete sessions belonging to other accounts represents severe security vulnerabilities. Furthermore, revoking the session corresponding to the currently active client request must properly clear the client's HTTP authentication cookies to avoid stale authentication state.

### Decision

Implement dedicated `/sessions` endpoints (`GET /sessions`, `DELETE /sessions/:id`) in a dedicated `sessions` module (`src/modules/sessions`):

1. **Safe Metadata Query:**
   Query active sessions filtering out expired records (`expiresAt: { gt: new Date() }`), selecting only `{ id, ipAddress, userAgent, createdAt, expiresAt }`, and annotating `isCurrent: session.id === req.auth.sessionId`. `tokenHash` is strictly excluded from response DTOs.

2. **Strict Ownership Verification:**
   Before deletion, verify session existence (throwing `404 AppError` if missing) and user ownership (`session.userId === req.auth.userId`, throwing `403 ForbiddenError` on mismatch). Deletion executes via `deleteSessionByIdAndUserId(sessionId, userId)`.

3. **Current-Session Cookie Invalidation:**
   If `isCurrent` is true, invoke `clearAuthCookies(res)` in the controller to wipe access and refresh token cookies.

```typescript
const session = await sessionsRepository.findSessionById(sessionId);
if (!session) throw new AppError("Session not found", 404);
if (session.userId !== userId)
  throw new ForbiddenError("You cannot revoke another user's session");

await sessionsRepository.deleteSessionByIdAndUserId(sessionId, userId);
await recordSecurityEvent(
  userId,
  SECURITY_EVENT_TYPES.LOGOUT,
  ipAddress,
  userAgent,
  {
    revokedSessionId: sessionId,
    isCurrentSession: sessionId === currentSessionId,
  },
);
return { isCurrent: sessionId === currentSessionId };
```

### Rationale

- **Zero Hash Leakage:** Exposes only device/network metadata without internal cryptographic tokens.
- **Strict Ownership Defense:** Direct database-level ownership filtering and explicit 403 Forbidden checks prevent cross-user session tampering.
- **Safe Client Synchronization:** Automatic cookie clearance on current session revocation prevents client authentication desynchronization.

---

## ADR-069 — Multi-Phase Security Audit Logging, Standardized Helper Encapsulation, and Indexed User History Retrieval

**Status:** Accepted

### Context

Security compliance and user trust require an immutable audit trail of authentication events (logins, failed attempts, logouts, credential changes, 2FA mutations). In multi-step flows (e.g. OAuth or Magic Link with MFA enabled), single-point event recording loses the distinction between the primary identity provider exchange and the subsequent second-factor verification. Furthermore, ad-hoc event creation leads to code duplication and optional property typing inconsistencies.

### Decision

Introduce the `SecurityEvent` model with composite index `@@index([userId, createdAt(sort: Desc)])` and `SecurityEventType` enum:

1. **Standardized Helper Encapsulation:**
   Provide a centralized `recordSecurityEvent(userId, type, ipAddress?, userAgent?, metadata?)` helper in `auth.service.ts` that handles optional property shaping uniformly.

2. **Multi-Phase Audit Logging:**
   Record `OAUTH_LOGIN` / `MAGIC_LINK_LOGIN` with `{ mfaRequired: true }` upon primary challenge generation, followed by `LOGIN_SUCCESS` with `{ usedRecoveryCode }` upon second-factor verification.

3. **Indexed Paginated Retrieval:**
   Expose `GET /auth/security-events` with Zod-defaulted pagination (`page` default 1, `limit` default 20 max 100), fetching user events sorted by `createdAt DESC`.

```typescript
export const recordSecurityEvent = async (
  userId: string,
  type: SecurityEventTypeName,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
) => {
  await authRepository.createSecurityEvent({
    userId,
    type,
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent }),
    ...(metadata && { metadata }),
  });
};
```

### Rationale

- **Multi-Phase Traceability:** Preserves the complete authentication provenance across two-factor challenges.
- **Sub-Millisecond Query Performance:** Composite index on `(userId, createdAt DESC)` eliminates table scans for user event history.
- **Zero Code Duplication:** Standardized helper eliminates object-spread boilerplate and guarantees uniform optional field mapping.

---

## ADR-070 — High-Signal Hermetic Testing Architecture across Unit, Integration, and E2E Pyramids

**Status:** Accepted

### Context

Validating authentication, session management, and authorization requires proving critical security invariants (session revocation, token rotation reuse detection, Last-Admin demotion protection, and rate-limit degradation) without flaky tests, excessive mock maintenance, or coupling tests to live third-party services like email providers. Shared database state and concurrent test runners frequently cause non-deterministic failures and state leaks.

### Decision

Implement a 3-layer test pyramid utilizing **Vitest** and **Supertest** configured with strict environmental separation and hermetic boundaries:

1. **Environmental & State Isolation:**
   - Dedicated PostgreSQL database (`authsphere_test`) and dedicated Redis index (`redis://localhost:6379/1`).
   - Dynamic configuration loading (`apps/api/src/config/env.ts`) reading `.env.test` under `NODE_ENV === "test"`.
   - Deterministic serial test execution (`fileParallelism: false`) with atomic cascade truncations of mutable user tables preserving seeded roles and permissions (`cleanTestState()`) and self-healing baseline role seeding (`ensureBaselineSeed()`).

2. **In-Memory Outbox & Spy Email Layer:**
   - Mock all email dispatches (`tests/helpers/email.ts`) using Vitest spies (`vi.mock("../../modules/email/demo.js")`), capturing verification tokens and magic links in an in-memory outbox to eliminate network dependencies while enabling direct token assertion.

3. **Three-Tier Pyramid:**
   - **Focused Unit Tests (Pure In-Memory):** Direct execution of cryptography (Argon2id, AES-256-GCM, SHA-256 HMAC), TOTP generation, time parsing, Zod boundary schemas, and OpenAPI 3.1 specification generation / 1:1 bidirectional Express route parity.
   - **Critical Integration Tests:** HTTP request/response validation through Express routes, controllers, middleware, PostgreSQL, and Redis.
   - **E2E User Journeys:** Stateful multi-step workflows verifying complete auth lifecycles, cross-device session introspection/revocation, and administrative privilege elevation/demotion.

### Rationale

- **Zero Flakiness:** Isolated databases, serial execution, and deterministic cleanups eliminate cross-test data pollution.
- **Hermetic Third-Party Decoupling:** In-memory email mocks prevent external network requests while keeping verification and magic link tokens directly inspectable.
- **Architectural Proof:** Validates database constraints, Redis fail-open resilience, and cryptographic token rotation invariants under production-identical routing.

---

## ADR-071 — Code-First OpenAPI 3.1 Specification and Interactive Swagger UI Documentation via Zod Registry

**Status:** Accepted

### Context

Manual OpenAPI or Swagger documentation maintained in YAML or JSON inevitably drifts from runtime validation schemas, generating inaccurate API client contracts, misleading endpoint consumers, and imposing high maintenance overhead. Conversely, decorating Express routing controllers with inline annotations or reflection mechanisms couples HTTP request handlers to documentation metadata and breaches AuthSphere's modular layer separation principles. The system requires an automated contract generation pipeline that reuses runtime Zod validation schemas to minimize schema drift, isolates documentation from request handlers, and avoids repeated serialization traversal on live endpoints.

### Decision

Generate an OpenAPI 3.1 specification code-first using `@asteasolutions/zod-to-openapi` (v9.1.0) and serve interactive documentation via `swagger-ui-express` at `/docs` alongside raw JSON at `/openapi.json`:

1. **Central OpenAPIRegistry (`apps/api/src/common/openapi/registry.ts`)**: Extends Zod via `extendZodWithOpenApi(z)` and registers cookie-based security schemes (`accessTokenCookie`, `refreshTokenCookie`) modeled as `apiKey` in `cookie`. Swagger UI is configured to reflect that authentication is governed by browser-managed HttpOnly cookies rather than manual Bearer token pasting.
2. **Reusable Envelopes, DRY Builders & Response Schemas (`apps/api/src/common/openapi/schemas.ts`)**: Registers shared universal envelopes (`MessageOnlyResponse`, `ErrorResponse`, `ValidationErrorResponse`) and exports type-safe composable builders (`jsonContent`, `successEnvelope`, `successResponse`, `messageResponse`, `errorResponse`, `jsonBody`). Domain response schemas originate directly in `*.validation.ts` (e.g. `authResponseSchema`, `userResponseSchema`, `sessionResponseSchema`), providing compile-time `Promise<T>` service typing and runtime `schema.parse()` egress validation on sensitive user endpoints, while being registered as named OpenAPI components in co-located `*.openapi.ts` via `.openapi(...)`. Common HTTP errors are DRYly centralized into `standardErrors` (400, 429, 500) and `authedErrors` (+401), while `403 Forbidden` is documented explicitly with precise domain descriptions on endpoints that genuinely enforce RBAC or business guards.
3. **Co-located Module Path Declarations (`apps/api/src/modules/*/*.openapi.ts`)**: Modules register endpoints onto the shared registry without modifying underlying controller, service, or validation files. Side-effect aggregator `routes.ts` is protected against tree-shaker drops via `"sideEffects": true` in `package.json`.
4. **Memoized Document Generation with Development Hot-Reload Bypass (`apps/api/src/common/openapi/index.ts`)**: `getOpenApiDocument()` builds and memoizes the OpenAPI 3.1 document on initial invocation in production and test environments, eliminating repetitive AST compilation on live endpoints. When `NODE_ENV === "development"`, caching is bypassed so schema edits are immediately reflected across `/openapi.json` and `/docs` without restarting the server.
5. **Bidirectional Express Parity Enforcement (`apps/api/tests/unit/openapi.test.ts`)**: Automated unit tests dynamically extract mounted Express route layers and assert a strict 1:1 invariant ensuring every Express route is documented and every documented operation maps to an active Express route.

```typescript
export const successResponse = <T extends z.ZodTypeAny>(
  description: string,
  dataSchema: T,
) => ({
  description,
  content: jsonContent(successEnvelope(dataSchema)),
});

export const authedErrors = {
  ...standardErrors,
  401: {
    description: "Unauthorized — missing or invalid access token cookie",
    content: jsonContent(ErrorResponseSchema),
  },
} as const;
```

### Rationale

- **Single Source of Truth & Zero Schema Drift:** Derives OpenAPI schemas directly from active Zod validation schemas across all request bodies and response payloads. Services strictly type returns via compile-time `Promise<T>` inference and sanitize sensitive user records at runtime via `schema.parse()`, eliminating contract drift across services, controllers, and documentation.
- **Isolated Route Declarations:** Documentation declarations are isolated in dedicated `*.openapi.ts` files imported as side-effects, keeping Express controllers and routes free of documentation clutter.
- **Automated Parity Verification:** Dynamic tests assert 1:1 bidirectional alignment between Express route stacks and OpenAPI path registrations, catching route omissions or phantom documentation entries.
- **Environment-Aware Document Caching:** Caching the generated specification eliminates repeated schema traversal and AST compilation overhead in production while development mode bypasses cache for instant DX feedback.
- **Tree-Shaking Safety:** Declaring `"sideEffects": true` ensures production bundlers and minifiers never discard route registration side-effect imports.
- **Truthful, Granular Error Typing:** Shared status codes (400, 401, 429, 500) are centralized via `standardErrors` and `authedErrors`. Endpoint-specific 403 authorization failures are documented explicitly where business guards actually exist, avoiding phantom 403 documentation on standard authenticated endpoints.
- **Accurate Cookie Security Modeling:** Explicitly documents HttpOnly cookie transport (`apiKey` in `cookie`) while establishing clear expectations that authentication is browser-managed rather than token-input driven.

---

## ADR-072 — Asynchronous Email Delivery via BullMQ Task Queue

**Status:** Accepted

### Context

Executing outbound email delivery synchronously within HTTP request handlers couples authentication response latency to third-party network roundtrips, timeouts, and provider rate limits. Transient network blips or external API outages cause request timeouts, degrading user experience and risking orphaned database transactions or client retries.

The system requires moving email dispatch out of the synchronous request-response lifecycle while preserving transactional database guarantees for primary authentication state changes.

### Decision

Decouple email delivery from HTTP requests using a Redis-backed BullMQ task queue (`authsphere-email`):

1. **Transactional Invariant:** All database state mutations (user record creation, verification tokens, password reset tokens, security audit logs) must commit successfully before enqueuing an email job.
2. **At-Most-Once Queue Hand-off:** The HTTP handler awaits the fast local Redis enqueue operation (`emailQueue.add()`) before returning an HTTP response. Queue publication is not transactionally bound to PostgreSQL (no two-phase commit); failures during queue enqueue log errors without rolling back committed database credentials.
3. **Dedicated Queue Helpers:** Encapsulate queue publication within typed helpers (`enqueueVerificationEmail`, `enqueuePasswordResetEmail`, `enqueueMagicLinkEmail`, `enqueueSecurityNotificationEmail`) carrying minimal data payloads (`{ email, token }` or `{ email, eventType }`) rather than whole entity models.

```typescript
export const enqueueVerificationEmail = (email: string, token: string) =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.VERIFICATION,
    email,
    token,
  });
```

### Rationale

- **Sub-100ms Request Latency:** Eliminates 300–1500ms SMTP/REST delivery latency from user-facing authentication flows, ensuring rapid client response times.
- **Fault Isolation:** External email service downtime or transient rate limits do not disrupt primary registration, password reset, or magic link database mutations.
- **Minimal Payload Contracts:** Queued jobs contain only primitive identifiers and tokens rather than complex database entity objects, preventing serialization churn and stale state discrepancies.

---

## ADR-073 — Provider-Agnostic Email Abstraction with Resend Implementation

**Status:** Accepted

### Context

Directly coupling application modules and worker processes to a specific third-party email SDK leads to vendor lock-in, leaky abstractions, and complex mocking during test execution. A clean architectural boundary is necessary to encapsulate third-party SDK quirks, configuration, and error schemas behind a stable domain contract.

### Decision

Establish an `EmailProvider` interface contract, domain `EmailDeliveryError`, and a concrete `resendProvider` adapter using the official Resend SDK (`resend`):

1. **Provider Contract (`src/modules/email/email.types.ts`)**: Enforces an agnostic signature accepting `{ to, subject, html }` and returning `{ id }`.
2. **Normalized Error Classification:** Define a provider-agnostic domain error `EmailDeliveryError` containing `isPermanent: boolean`. Concrete providers (like `resendProvider`) categorize third-party responses into transient failures (429 rate limits, 5xx outages, network timeouts) versus permanent failures (4xx client validation, unverified domain, malformed recipient address) and throw `EmailDeliveryError`.
3. **Functional Provider Adapter (`src/modules/email/resend.provider.ts`)**: Implement `resendProvider: EmailProvider` as a plain typed object, adhering directly to the functional object conventions used across AuthSphere services and repositories.
4. **Decoupled Worker Processing:** The worker process has zero imports from Resend or SDK adapters; it depends purely on `emailService` and `resendProvider`.

```typescript
export class EmailDeliveryError extends Error {
  readonly isPermanent: boolean;

  constructor(message: string, isPermanent = false) {
    super(message);
    this.name = "EmailDeliveryError";
    this.isPermanent = isPermanent;
  }
}

export interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<EmailSendResult>;
}
```

### Rationale

- **Zero Vendor Lock-In:** Swapping or adding secondary delivery providers (e.g., AWS SES, Postmark, SMTP) requires only a new `EmailProvider` implementation without touching worker logic or queue schemas.
- **Deterministic Hermetic Testing:** Unit and worker tests inject a mock `EmailProvider` directly, verifying HTML template rendering, XSS sanitization, and parameter bindings without issuing live network requests or requiring API keys.
- **Centralized Error Normalization:** SDK-specific response payloads and error shapes are converted into unified `EmailDeliveryError` exceptions at the provider boundary.

---

## ADR-074 — Unified Redis Architecture (ioredis Migration)

**Status:** Accepted

### Context

The application initially utilized `redis` (node-redis v6) for fixed-window rate limiting, OAuth ephemeral state storage, and role permission caching. Introducing BullMQ for asynchronous task queue processing mandated `ioredis`, as BullMQ relies on `ioredis` features including atomic queue scripts, cluster/sentinel support, and connection state events. Operating dual Redis client libraries within a single monorepo introduces duplicate connection pools, conflicting configuration conventions, memory bloat, and Developer Experience confusion.

### Decision

Migrate all Redis operations across the codebase to `ioredis` and uninstall `redis` (node-redis):

1. **Unified Client Instance (`src/lib/redis.ts`)**: A single lightweight `ioredis` instance manages application-level operations, configured with `lazyConnect: true` and `maxRetriesPerRequest: null`, completely decoupled from specific middleware scripts.
2. **Atomic Middleware Transactions:** Rate limiting counter increments and window expirations execute via `redis.multi().incr().expire(..., "NX").exec()` directly within middleware [ADR-050], eliminating custom Lua scripts and interface augmentation.
3. **Dedicated Queue & Worker Connections (`src/lib/queue.ts`)**: BullMQ Workers and Queues spawn dedicated `ioredis` connections via `createBullMQConnection()`, isolating blocking queue operations (e.g. `BRPOPLPUSH`/`BLMOVE`) from general caching and rate limiting requests.
4. **Lifecycle & Status Alignment:** Leverage native `redis.status === "ready"` directly for fail-safe connectivity checks across rate limiter middleware and cache access layers, ensuring fail-open resilience without custom wrapper properties.

```typescript
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});
```

### Rationale

- **Single Dependency Footprint:** Eliminates client library divergence, redundant documentation, and dual-driver maintenance overhead.
- **BullMQ Native Compatibility:** `ioredis` is the officially supported, battle-tested driver for BullMQ, eliminating adapter layer instability.
- **Connection Isolation:** Standard application commands execute on the shared pool while worker polling runs on isolated blocking connections, preventing rate limit starvation.

---

## ADR-075 — Email Worker Retry Policy and Dead-Letter Retention

**Status:** Accepted

### Context

Asynchronous background jobs interacting with external networks inevitably encounter transient failures such as network interruptions, third-party 5xx errors, and rate limit throttling. Conversely, executing retries on permanent failures (such as malformed email addresses, unsupported job types, or non-existent recipient domains) wastes queue capacity and CPU cycles while risking upstream provider penalties.

The task processing subsystem requires a resilient retry policy paired with dead-letter job retention for operational inspection.

### Decision

Implement an exponential backoff retry policy in BullMQ, combined with permanent-failure fast-failing:

1. **Exponential Backoff:** Configure default job options with 5 retry attempts and exponential backoff (`delay: 2000`, doubling to 2s, 4s, 8s, 16s, 32s).
2. **Permanent Failure Fast-Path:** In the worker processor, when `EmailDeliveryError.isPermanent` or corrupted/unsupported job types are encountered, throw BullMQ's built-in `UnrecoverableError`. This immediately transitions the job to the failed state, bypassing remaining retry attempts.
3. **Dead-Letter Retention:** Configure `removeOnComplete: true` to prune successful executions and `removeOnFail: { count: 500 }` to retain the last 500 failed jobs with stack traces and payload metadata in Redis for operational debugging.
4. **Graceful Worker Shutdown with Watchdog:** Register `SIGINT`, `SIGTERM`, and unhandled exception listeners that call `await worker.close()` with an unreferenced 10-second watchdog timer (`timer.unref()`), allowing active jobs to finish processing while guaranteeing shutdown completion.

```typescript
export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    try {
      await emailService.processJob(job.data, resendProvider);
    } catch (err: unknown) {
      if (err instanceof UnrecoverableError) throw err;
      if (err instanceof EmailDeliveryError && err.isPermanent) {
        throw new UnrecoverableError(err.message);
      }
      throw err; // BullMQ retries transient errors with exponential backoff
    }
  },
  { connection, concurrency: 5 },
);
```

### Rationale

- **Resilience to Transient Outages:** Exponential backoff gracefully absorbs short-lived network glitches and third-party rate limiting without losing queued emails.
- **Resource Conservation:** Immediate failure classification prevents futile retries on unrecoverable validation errors.
- **Zero In-Flight Job Corruption:** Graceful worker shutdown permits in-flight email dispatches to complete, preventing duplicate deliveries on process termination.
- **Production Auditability:** Retaining failed jobs in Redis allows operators to inspect payloads, failure reasons, and timestamps via standard queue inspection tools.
