# Architecture Decision Records (ADR) — AuthSphere

This document records the architectural and engineering decisions made during the design, development, and evolution of **AuthSphere** — a production-grade, highly secure authentication and session management platform.

> **Companion Documentation Suite:**
>
> - [System Architecture & Design (ARCHITECTURE.md)](ARCHITECTURE.md) — High-level mental model, layered component architecture, domain entity relationships, and core authentication lifecycles.
> - [OAuth 2.0 Architecture & Integration Guide (OAUTH.md)](OAUTH.md) — Authoritative protocol specification for federated identity providers, PKCE browser-cookie binding, and identity resolution.
> - [Cloud Deployment & Operations Guide (DEPLOYMENT.md)](DEPLOYMENT.md) — Operational runbooks for dual-target compute (AWS Lambda vs. ECS Fargate), database connection topologies, CI/CD, and disaster recovery.
> - [Testing & Quality Assurance Guide (TESTING.md)](TESTING.md) — Hermetic testing pyramid, test environment isolation, and security invariant verification suites.

---

## Index of Decisions

### By Domain Category

<details open id="architecture--project-boundaries">
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
- [ADR-077: Process-Aware Environment Partitioning and Least Privilege Secret Isolation](#adr-077--process-aware-environment-partitioning-and-least-privilege-secret-isolation)
- [ADR-083: Standardized REST API Response Envelope Contract (`ApiResponse`)](#adr-083--standardized-rest-api-response-envelope-contract-apiresponse)
- [ADR-084: Pure TypeScript Safe Transactional Email Templating Engine](#adr-084--pure-typescript-safe-transactional-email-templating-engine)
- [ADR-085: Code-First Edge Reverse Proxy Configuration via `@vercel/config/v1`](#adr-085--code-first-edge-reverse-proxy-configuration-via-vercelconfigv1)
- [ADR-086: Development-to-Production Reverse Proxy Parity via Vite Local Server](#adr-086--development-to-production-reverse-proxy-parity-via-vite-local-server)

</details>

<details open id="security-cryptography--credentials">
<summary><b>🔐 Security, Cryptography & Credentials</b></summary>

- [ADR-022: Mitigating Login Timing Differences via Dummy Password Verification](#adr-022--mitigating-login-timing-differences-via-dummy-password-verification)
- [ADR-023: Silent Return for Enumeration-Sensitive Endpoints](#adr-023--silent-return-for-enumeration-sensitive-endpoints)
- [ADR-031: Argon2id Password Hashing with Benchmarked Security Profile](#adr-031--argon2id-password-hashing-with-benchmarked-security-profile)
- [ADR-032: Social Login Account Guarding](#adr-032--social-login-account-guarding)
- [ADR-033: Cookie-Based Token Transport](#adr-033--cookie-based-token-transport)
- [ADR-040: AES-256-GCM Symmetric Encryption for MFA Secrets at Rest](#adr-040--aes-256-gcm-symmetric-encryption-for-mfa-secrets-at-rest)
- [ADR-042: Refresh Token Cookie Path Scoped to `/auth`](#adr-042--refresh-token-cookie-path-scoped-to-auth)
- [ADR-044: Explicit JSON Body Size Limit](#adr-044--explicit-json-body-size-limit)
- [ADR-056: API-Tuned Security Headers via Helmet Configuration](#adr-056--api-tuned-security-headers-via-helmet-configuration)
- [ADR-060: Redis-Backed Ephemeral OAuth State with Atomic Single-Use Invalidation](#adr-060--redis-backed-ephemeral-oauth-state-with-atomic-single-use-invalidation)
- [ADR-062: Verified Email Enforcement for Social Identity Providers](#adr-062--verified-email-enforcement-for-social-identity-providers)
- [ADR-065: Magic Link Token Lifecycle, Dual-Purpose Email Verification, and Atomic Consumption](#adr-065--magic-link-token-lifecycle-dual-purpose-email-verification-and-atomic-consumption)
- [ADR-080: Browser-Bound PKCE (RFC 7636 / RFC 9700) and Per-Transaction Cookie Architecture](#adr-080--browser-bound-pkce-rfc-7636--rfc-9700-and-per-transaction-cookie-architecture)
- [ADR-087: WebCrypto JOSE Token Engine with Dual-Secret Isolation (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`)](#adr-087--webcrypto-jose-token-engine-with-dual-secret-isolation-jwt_access_secret-vs-jwt_refresh_secret)
- [ADR-088: Runtime Egress Data Sanitization Firewall via Zod Response Schemas](#adr-088--runtime-egress-data-sanitization-firewall-via-zod-response-schemas)
- [ADR-089: Asynchronous Security Event Notification Pipeline for High-Risk Credential Mutations](#adr-089--asynchronous-security-event-notification-pipeline-for-high-risk-credential-mutations)
- [ADR-090: Keyless Cloud Deployment via AWS IAM OpenID Connect (OIDC) Federation](#adr-090--keyless-cloud-deployment-via-aws-iam-openid-connect-oidc-federation)

</details>

<details open id="authentication--session-management">
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
- [ADR-076: Refresh Token Rotation with Atomic CAS and Ephemeral Leeway Window](#adr-076--refresh-token-rotation-with-atomic-cas-and-ephemeral-leeway-window)
- [ADR-082: Pre-Resolution Session Gate for Authenticated Account Linking](#adr-082--pre-resolution-session-gate-for-authenticated-account-linking)
- [ADR-092: Configurable Replay Revocation Scope (`AUTH_REUSE_DELETION_MODE`)](#adr-092--configurable-replay-revocation-scope-auth_reuse_deletion_mode)

</details>

<details open id="multi-factor-authentication-mfa">
<summary><b>🛡️ Multi-Factor Authentication (MFA)</b></summary>

- [ADR-045: Ephemeral MFA Challenge Tokens for Two-Step Authentication](#adr-045--ephemeral-mfa-challenge-tokens-for-two-step-authentication)
- [ADR-046: Monotonic Window Tracking for TOTP Replay Prevention](#adr-046--monotonic-window-tracking-for-totp-replay-prevention)
- [ADR-047: SHA-256 Hashed Recovery Codes with Atomic Single-Use Consumption](#adr-047--sha-256-hashed-recovery-codes-with-atomic-single-use-consumption)
- [ADR-048: Dual-Factor Enforcement on Sensitive Credential Mutations](#adr-048--dual-factor-enforcement-on-sensitive-credential-mutations)
- [ADR-049: Proactive Low Recovery Code Warning Threshold](#adr-049--proactive-low-recovery-code-warning-threshold)
- [ADR-057: Ephemeral Multi-Challenge MFA Architecture with Single-Use Invalidation](#adr-057--ephemeral-multi-challenge-mfa-architecture-with-single-use-invalidation)
- [ADR-091: Polymorphic Unified MFA Input Resolution (TOTP vs Recovery Code)](#adr-091--polymorphic-unified-mfa-input-resolution-totp-vs-recovery-code)
- [ADR-101: Zero-Side-Effect Client MFA State Introspection via Current User Profile Contract](#adr-101--zero-side-effect-client-mfa-state-introspection-via-current-user-profile-contract)

</details>

<details open id="validation-middleware--authorization">
<summary><b>⚙️ Validation, Middleware & Authorization</b></summary>

- [ADR-003: Single-Source Environment Configuration](#adr-003--single-source-environment-configuration)
- [ADR-004: Strict Runtime Schema Validation for Config](#adr-004--strict-runtime-schema-validation-for-config)
- [ADR-017: Human-Readable Duration Synchronization](#adr-017--human-readable-duration-synchronization)
- [ADR-021: Structured `req.auth` Context Object](#adr-021--structured-reqauth-context-object)
- [ADR-026: Multi-Target Middleware Validation with Zod 4](#adr-026--multi-target-middleware-validation-with-zod-4)
- [ADR-035: Redis Permission Caching with Fail-Safe Bypass](#adr-035--redis-permission-caching-with-fail-safe-bypass)
- [ADR-036: Middleware-Based Authorization Guards](#adr-036--middleware-based-authorization-guards)
- [ADR-038: Validation-Layer Input Normalization via Zod Transforms](#adr-038--validation-layer-input-normalization-via-zod-transforms)
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting via Atomic Lua Scripting](#adr-050--redis-backed-fixed-window-rate-limiting-via-atomic-lua-scripting)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Proxy-Derived Client IP Resolution via Express `req.ip`](#adr-054--proxy-derived-client-ip-resolution-via-express-reqip)
- [ADR-055: Resource Isolation & Origin Validation for State-Changing Requests](#adr-055--resource-isolation--origin-validation-for-state-changing-requests)
- [ADR-066: Multi-Tier Rate Limiting for OAuth Callbacks and Passwordless Magic Links](#adr-066--multi-tier-rate-limiting-for-oauth-callbacks-and-passwordless-magic-links)
- [ADR-067: Atomic Last-Admin Demotion Guard via Exclusive Role Row-Locking](#adr-067--atomic-last-admin-demotion-guard-via-exclusive-role-row-locking)
- [ADR-071: Code-First OpenAPI 3.1 Specification and Interactive Swagger UI Documentation via Zod Registry](#adr-071--code-first-openapi-31-specification-and-interactive-swagger-ui-documentation-via-zod-registry)
- [ADR-099: Paginated Administrative User Directory and Standard Offset Query Strategy](#adr-099--paginated-administrative-user-directory-and-standard-offset-query-strategy)
- [ADR-100: Dedicated Role Permission Introspection with Cached Read Path and Administrative Immutability](#adr-100--dedicated-role-permission-introspection-with-cached-read-path-and-administrative-immutability)

</details>

<details open id="data-access-orm--transactions">
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
- [ADR-093: Universal UUIDv7 Primary Key Strategy Across Relational Entities](#adr-093--universal-uuidv7-primary-key-strategy-across-relational-entities)
- [ADR-094: Relational Deletion Cascades and Administrative Role Immutability](#adr-094--relational-deletion-cascades-and-administrative-role-immutability)
- [ADR-095: Dual Database Connection Strategy (Neon Direct Migrations vs Pooled Runtime)](#adr-095--dual-database-connection-strategy-neon-direct-migrations-vs-pooled-runtime)

</details>

<details open id="observability-reliability--operations">
<summary><b>📊 Observability, Reliability & Operations</b></summary>

- [ADR-008: Hierarchical Error Handling Pipeline](#adr-008--hierarchical-error-handling-pipeline)
- [ADR-009: Structured Observability with Pino & Request Context](#adr-009--structured-observability-with-pino--request-context)
- [ADR-010: Multi-Resource Graceful Shutdown](#adr-010--multi-resource-graceful-shutdown)
- [ADR-011: Operational Health Monitoring Pattern](#adr-011--operational-health-monitoring-pattern)
- [ADR-043: Request ID Sanitization with Context Preservation](#adr-043--request-id-sanitization-with-context-preservation)
- [ADR-069: Multi-Phase Security Audit Logging, Standardized Helper Encapsulation, and Indexed User History Retrieval](#adr-069--multi-phase-security-audit-logging-standardized-helper-encapsulation-and-indexed-user-history-retrieval)
- [ADR-072: Asynchronous Email Delivery via BullMQ Task Queue](#adr-072--asynchronous-email-delivery-via-bullmq-task-queue)
- [ADR-075: Email Worker Retry Policy and Failed-Job Retention](#adr-075--email-worker-retry-policy-and-failed-job-retention)
- [ADR-078: Dual-Driver Background Job Architecture and Cloud Migration Path](#adr-078--dual-driver-background-job-architecture-and-cloud-migration-path)
- [ADR-079: Serverless Lambda Runtime, Synchronous Execution Guard, and Reverse-Proxy Cookie Bridge](#adr-079--serverless-lambda-runtime-synchronous-execution-guard-and-reverse-proxy-cookie-bridge)
- [ADR-081: Cumulative Upstream Provider Abort Deadline and Gateway Timeout Mapping](#adr-081--cumulative-upstream-provider-abort-deadline-and-gateway-timeout-mapping)
- [ADR-096: Multi-Stage Container Architecture with Non-Root Execution and PID 1 Signal Reaping (`dumb-init`)](#adr-096--multi-stage-container-architecture-with-non-root-execution-and-pid-1-signal-reaping-dumb-init)
- [ADR-097: Single-File Tree-Shaken ESM Lambda Bundling with Native C++ Addon Externalization (`tsup`)](#adr-097--single-file-tree-shaken-esm-lambda-bundling-with-native-c-addon-externalization-tsup)
- [ADR-098: Unified Dual-Target Deployment Pipeline (Serverless Lambda vs Containerized ECS Fargate)](#adr-098--unified-dual-target-deployment-pipeline-serverless-lambda-vs-containerized-ecs-fargate)

</details>

<details open id="testing-quality--security-invariants">
<summary><b>🧪 Testing, Quality & Security Invariants</b></summary>

- [ADR-070: High-Signal Hermetic Testing Architecture across Unit, Integration, and E2E Pyramids](#adr-070--high-signal-hermetic-testing-architecture-across-unit-integration-and-e2e-pyramids)

</details>

---

### Chronological Numerical Index

<details>
<summary><b>View Full Sequential Index (ADR-001 to ADR-101)</b></summary>

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
- [ADR-022: Mitigating Login Timing Differences via Dummy Password Verification](#adr-022--mitigating-login-timing-differences-via-dummy-password-verification)
- [ADR-023: Silent Return for Enumeration-Sensitive Endpoints](#adr-023--silent-return-for-enumeration-sensitive-endpoints)
- [ADR-024: Atomic Token Verification Transactions](#adr-024--atomic-token-verification-transactions)
- [ADR-025: Idempotent Token Re-issuance via Upsert](#adr-025--idempotent-token-re-issuance-via-upsert)
- [ADR-026: Multi-Target Middleware Validation with Zod 4](#adr-026--multi-target-middleware-validation-with-zod-4)
- [ADR-027: Session Revocation on Password Change and Reset](#adr-027--session-revocation-on-password-change-and-reset)
- [ADR-028: Password Change Distinctness Enforcement](#adr-028--password-change-distinctness-enforcement)
- [ADR-029: `deleteMany` for Idempotent Session Deletion](#adr-029--deletemany-for-idempotent-session-deletion)
- [ADR-030: `passwordChangedAt` Audit Timestamp](#adr-030--passwordchangedat-audit-timestamp)
- [ADR-031: Argon2id Password Hashing with Benchmarked Security Profile](#adr-031--argon2id-password-hashing-with-benchmarked-security-profile)
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
- [ADR-050: Redis-Backed Fixed-Window Rate Limiting via Atomic Lua Scripting](#adr-050--redis-backed-fixed-window-rate-limiting-via-atomic-lua-scripting)
- [ADR-051: Centralized Rate Limit Policy Dictionary](#adr-051--centralized-rate-limit-policy-dictionary)
- [ADR-052: Dual-Key Rate Limiting (IP vs Authenticated User)](#adr-052--dual-key-rate-limiting-ip-vs-authenticated-user)
- [ADR-053: Zod-Validated Proxy Trust Configuration](#adr-053--zod-validated-proxy-trust-configuration)
- [ADR-054: Proxy-Derived Client IP Resolution via Express `req.ip`](#adr-054--proxy-derived-client-ip-resolution-via-express-reqip)
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
- [ADR-075: Email Worker Retry Policy and Failed-Job Retention](#adr-075--email-worker-retry-policy-and-failed-job-retention)
- [ADR-076: Refresh Token Rotation with Atomic CAS and Ephemeral Leeway Window](#adr-076--refresh-token-rotation-with-atomic-cas-and-ephemeral-leeway-window)
- [ADR-077: Process-Aware Environment Partitioning and Least Privilege Secret Isolation](#adr-077--process-aware-environment-partitioning-and-least-privilege-secret-isolation)
- [ADR-078: Dual-Driver Background Job Architecture and Cloud Migration Path](#adr-078--dual-driver-background-job-architecture-and-cloud-migration-path)
- [ADR-079: Serverless Lambda Runtime, Synchronous Execution Guard, and Reverse-Proxy Cookie Bridge](#adr-079--serverless-lambda-runtime-synchronous-execution-guard-and-reverse-proxy-cookie-bridge)
- [ADR-080: Browser-Bound PKCE (RFC 7636 / RFC 9700) and Per-Transaction Cookie Architecture](#adr-080--browser-bound-pkce-rfc-7636--rfc-9700-and-per-transaction-cookie-architecture)
- [ADR-081: Cumulative Upstream Provider Abort Deadline and Gateway Timeout Mapping](#adr-081--cumulative-upstream-provider-abort-deadline-and-gateway-timeout-mapping)
- [ADR-082: Pre-Resolution Session Gate for Authenticated Account Linking](#adr-082--pre-resolution-session-gate-for-authenticated-account-linking)
- [ADR-083: Standardized REST API Response Envelope Contract (`ApiResponse`)](#adr-083--standardized-rest-api-response-envelope-contract-apiresponse)
- [ADR-084: Pure TypeScript Safe Transactional Email Templating Engine](#adr-084--pure-typescript-safe-transactional-email-templating-engine)
- [ADR-085: Code-First Edge Reverse Proxy Configuration via `@vercel/config/v1`](#adr-085--code-first-edge-reverse-proxy-configuration-via-vercelconfigv1)
- [ADR-086: Development-to-Production Reverse Proxy Parity via Vite Local Server](#adr-086--development-to-production-reverse-proxy-parity-via-vite-local-server)
- [ADR-087: WebCrypto JOSE Token Engine with Dual-Secret Isolation (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`)](#adr-087--webcrypto-jose-token-engine-with-dual-secret-isolation-jwt_access_secret-vs-jwt_refresh_secret)
- [ADR-088: Runtime Egress Data Sanitization Firewall via Zod Response Schemas](#adr-088--runtime-egress-data-sanitization-firewall-via-zod-response-schemas)
- [ADR-089: Asynchronous Security Event Notification Pipeline for High-Risk Credential Mutations](#adr-089--asynchronous-security-event-notification-pipeline-for-high-risk-credential-mutations)
- [ADR-090: Keyless Cloud Deployment via AWS IAM OpenID Connect (OIDC) Federation](#adr-090--keyless-cloud-deployment-via-aws-iam-openid-connect-oidc-federation)
- [ADR-091: Polymorphic Unified MFA Input Resolution (TOTP vs Recovery Code)](#adr-091--polymorphic-unified-mfa-input-resolution-totp-vs-recovery-code)
- [ADR-092: Configurable Replay Revocation Scope (`AUTH_REUSE_DELETION_MODE`)](#adr-092--configurable-replay-revocation-scope-auth_reuse_deletion_mode)
- [ADR-093: Universal UUIDv7 Primary Key Strategy Across Relational Entities](#adr-093--universal-uuidv7-primary-key-strategy-across-relational-entities)
- [ADR-094: Relational Deletion Cascades and Administrative Role Immutability](#adr-094--relational-deletion-cascades-and-administrative-role-immutability)
- [ADR-095: Dual Database Connection Strategy (Neon Direct Migrations vs Pooled Runtime)](#adr-095--dual-database-connection-strategy-neon-direct-migrations-vs-pooled-runtime)
- [ADR-096: Multi-Stage Container Architecture with Non-Root Execution and PID 1 Signal Reaping (`dumb-init`)](#adr-096--multi-stage-container-architecture-with-non-root-execution-and-pid-1-signal-reaping-dumb-init)
- [ADR-097: Single-File Tree-Shaken ESM Lambda Bundling with Native C++ Addon Externalization (`tsup`)](#adr-097--single-file-tree-shaken-esm-lambda-bundling-with-native-c-addon-externalization-tsup)
- [ADR-098: Unified Dual-Target Deployment Pipeline (Serverless Lambda vs Containerized ECS Fargate)](#adr-098--unified-dual-target-deployment-pipeline-serverless-lambda-vs-containerized-ecs-fargate)
- [ADR-099: Paginated Administrative User Directory and Standard Offset Query Strategy](#adr-099--paginated-administrative-user-directory-and-standard-offset-query-strategy)
- [ADR-100: Dedicated Role Permission Introspection with Cached Read Path and Administrative Immutability](#adr-100--dedicated-role-permission-introspection-with-cached-read-path-and-administrative-immutability)
- [ADR-101: Zero-Side-Effect Client MFA State Introspection via Current User Profile Contract](#adr-101--zero-side-effect-client-mfa-state-introspection-via-current-user-profile-contract)

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

Unstructured `console.log` degrades event-loop performance and is difficult to query in log aggregators.

### Decision

Use **Pino** for structured JSON logging, integrated with Express via `pino-http` and `requestId` middleware using `X-Request-Id` headers.

### Rationale

- **Low Overhead:** Pino's stream-based asynchronous JSON serialization minimizes logging overhead on request processing.
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

- **Bounded Request Draining:** Minimizes dropped in-flight requests by providing active HTTP connections a 10-second drain window to finish processing before forced process exit.
- **Resource Cleanliness:** Disconnects persistent database pools and Redis sockets cleanly, preventing orphaned server connections.

---

## ADR-011 — Operational Health Monitoring Pattern

**Status:** Accepted

### Context

Container orchestrators and AWS Application Load Balancers (ALBs) require health probes. Health check probe failure on external dependency blips must not trigger cascading container termination or target group deregulation.

### Decision

Decouple process liveness from external dependency readiness:

- `GET /health/live` (and root alias `GET /health`): Pure in-memory process liveness probe returning `200 OK` with `{ status: "UP", timestamp }`. Zero database or Redis I/O.
- `GET /health/ready`: Dependency readiness probe concurrently evaluating PostgreSQL (`prisma.$queryRaw\`SELECT 1\``) and Redis (`redis.ping()`). Returns `200 OK`when all dependencies are UP, or`503 Service Unavailable` when any dependency is DOWN.

### Rationale

- **AWS ALB Alignment:** AWS strongly recommends ALB health checks be lightweight and verify process responsiveness. Deep dependency probes on ALBs cause catastrophic target group deregulation during transient database maintenance.
- **Granular Observability:** Returns explicit per-dependency status (`database`, `redis`) on readiness failures without crashing the API process.
- **Driver-Managed Resilience:** Leverages PostgreSQL connection pool timeouts and Redis client timeouts natively without artificial wrapping.

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

**Status:** Accepted _(Extended by ADR-076)_

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

**Status:** Accepted _(Extended by ADR-093)_

### Context

JWT Access Tokens include the Session ID (`sid`). Database-generated primary keys require a multi-step roundtrip before token signing. Furthermore, while Node.js 24.16.0+ introduced `crypto.randomUUIDv7()`, AuthSphere targets `node: "24.x || 25.x"` and standardizes on the portable `uuidv7` package to guarantee deterministic execution across all supported runtime environments.

### Decision

Generate Session IDs in the service layer using `import { uuidv7 } from "uuidv7"` _before_ database insertion or JWT signing:

```typescript
const sessionId = existingSessionId ?? uuidv7();
```

### Rationale

- **Time-Ordered:** UUIDv7's millisecond timestamp prefix guarantees sequential B-Tree index placement in PostgreSQL, preventing random disk page splits.
- **Atomic Pre-Signing:** Enables constructing signed JWTs (`sid`) and persisting the session record in a single database write without roundtrip latency.
- **Fail-Secure Lifecycle:** Prevents orphaned database records if token generation or signing fails.
- **Ecosystem Evolution:** Standardized application pre-persistence generation serves as the precursor to the universal database entity strategy formalized in [ADR-093](#adr-093--universal-uuidv7-primary-key-strategy-across-relational-entities).

---

## ADR-016 — Centralized Auth Cookie Sanitization in Error Middleware

**Status:** Accepted _(Amended for Silent Token Rotation)_

### Context

Stale auth cookies after authentication failure cause redundant failed requests. However, unconditionally clearing both `accessToken` and `refreshToken` cookies on any `UnauthorizedError` destroyed valid 7-day `refreshToken` cookies when short-lived 15-minute access tokens expired on protected routes, breaking silent refresh token rotation.

### Decision

In the global `errorHandler`, catch `UnauthorizedError` and call `clearAccessTokenCookie(res)`, clearing only `accessToken` while preserving `refreshToken`. Cookie clearing reuses the standard `CookieOptions` defined in `common/utils/cookie.ts`.

In contrast, refresh token failure, replay rejection, explicit logout (`POST /auth/logout`), "Sign Out Everywhere" (`POST /auth/logout-all`), password change, MFA disablement, and current session revocation explicitly clear both cookies (`clearAuthCookies(res)`).

### Rationale

- Automatically purges expired/invalid access tokens on protected request failure.
- Preserves the valid `refreshToken` cookie so the client Axios response interceptor can seamlessly execute silent token rotation (`POST /auth/refresh-token`).
- Explicitly purges both cookies when a refresh token fails validation or when sessions are intentionally terminated.

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

**Status:** Accepted _(Codebase Standard & Convention)_

> **Category Note:** This record captures a repository-wide coding standard and export convention rather than a distributed architectural decision. Maintained here for historical codebase convention tracking.

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

**Status:** Accepted _(Codebase Standard & Convention)_

> **Category Note:** This record captures a TypeScript/Node.js native ESM module resolution convention rather than a distributed architectural decision. Maintained here for historical codebase convention tracking.

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

## ADR-022 — Mitigating Login Timing Differences via Dummy Password Verification

**Status:** Accepted

### Context

Fast "user not found" responses versus slow "wrong password" calculations (Argon2id hashing) enable email enumeration via response timing differences.

### Decision

When user is not found, execute a dummy `verifyPassword(DUMMY_PASSWORD_HASH, input.password)` before throwing. `DUMMY_PASSWORD_HASH` is pre-computed at module load time (top-level `await`).

### Rationale

- **Timing Disparity Mitigation:** Both "user not found" and "wrong password" execution paths perform an Argon2id verification, significantly reducing timing side-channels that could leak user existence (mitigates timing variance, though not mathematically constant-time across varying system loads).
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

## ADR-031 — Argon2id Password Hashing with Benchmarked Security Profile

**Status:** Accepted

### Context

Storing plaintext or weakly hashed passwords exposes user credentials to offline dictionary and GPU rainbow table attacks if the database is breached.

### Decision

**Argon2id** configured with project-selected and benchmarked security parameters exceeding baseline recommendations:

| Parameter   | Value                     |
| ----------- | ------------------------- |
| Memory Cost | 65,536 KiB (64 MiB)       |
| Time Cost   | 3 iterations              |
| Parallelism | 4 (degree of parallelism) |
| Hash Length | 32 bytes                  |

### Rationale

- **GPU Brute-Force & Side-Channel Resistance:** Selected profile significantly raises attacker memory and computational cost, resisting both side-channel and dedicated GPU cracking hardware.
- **Explicit Config:** Prevents silent regressions or environmental drift if library defaults change.

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

**Status:** Accepted _(Cookie paths superseded by ADR-042 and ADR-079)_

### Context

Tokens can be transported via headers, localStorage, or cookies — each with different security tradeoffs.

### Decision

Transport both tokens exclusively via `httpOnly`, `secure`, `sameSite: "lax"` cookies. Never exposed to client-side JS or response bodies.

- **Access Token:** Path `/`, `maxAge` = `JWT_ACCESS_EXPIRES_IN_MS`.
- **Refresh Token:** Path `/` (originally `/auth/refresh-token`, subsequently widened to `/auth` in ADR-042, and finalized to `/` in ADR-079), `maxAge` = `JWT_REFRESH_EXPIRES_IN_MS`.
- Both use `priority: "high"` to prevent browser eviction.

> [!NOTE]
> **Cookie Path Progression:**
>
> 1. Initial implementation scoped refresh token cookie to `path: "/auth/refresh-token"`.
> 2. [ADR-042](#adr-042--refresh-token-cookie-path-scoped-to-auth) widened path to `/auth` to enable `POST /auth/logout` session revocation.
> 3. [ADR-079](#adr-079--serverless-lambda-runtime-synchronous-execution-guard-and-reverse-proxy-cookie-bridge) finalized path to root `/` to survive reverse-proxy prefix rewriting (`/api/*` -> backend `/auth/*`).

### Rationale

- **XSS Protection:** `httpOnly` prevents JS token theft.
- **CSRF Mitigation:** `sameSite: "lax"` blocks cross-origin POST cookies.
- **Root Scoping Parity:** Scoping both cookies to `/` ensures reliable transport across reverse proxies, while CSRF protection is strictly enforced via `SameSite=Lax` and `originValidation` middleware.

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

**Status:** Accepted _(Extended by ADR-100)_

### Context

Every authenticated request resolves role to permissions. Querying PostgreSQL on every request introduces database overhead for data that changes infrequently.

### Decision

Cache role permissions in Redis under `role:permissions:<ROLE_NAME>` with a 24-hour TTL. The service verifies `redis.status === "ready"` before reads and writes, falling back to PostgreSQL if Redis is unavailable or on cache misses. Cache invalidation (`DEL`) executes only after successful database permission updates.

### Rationale

- **Database Offload:** Caches frequently read, rarely changed role permissions in memory.
- **Fail-Safe Resilience:** Inability to reach Redis triggers a direct database query rather than failing the client request.
- **Transactional Consistency:** Evicting the cache only after database writes succeed ensures the cache never holds uncommitted data.

---

## ADR-036 — Middleware-Based Authorization Guards

**Status:** Accepted

### Context

Scattering authorization checks within controller functions mixes access control logic with request handling and business orchestration.

### Decision

Implement composable Express middleware factories in `apps/api/src/modules/authorization/authorization.middleware.ts`:

- `requireRole(...roles)`: Allows access if the authenticated user has at least one of the specified roles (OR logic).
- `requirePermission(...permissions)`: Allows access only if the user holds all specified permissions (AND logic).
- `requireSelfOrPermission(permission)`: Allows access if the requested resource matches `req.auth.userId` or if the user has the specified permission.

Middleware is ordered predictably: `auth` -> `validate` -> `requireRole` / `requirePermission` -> `controller`.

### Rationale

- **Declarative Route Boundaries:** Access control rules are visible directly on route definitions.
- **Principle of Least Privilege:** `requirePermission` enforces that all required capabilities are present.
- **Fail-Secure Defaults:** All guards verify `req.auth` exists, returning `401 Unauthorized` if unauthenticated.

---

## ADR-037 — Atomic Role-Permission Replacement via Nested Prisma Mutations

**Status:** Accepted _(Extended by ADR-100)_

### Context

Updating a role's permissions requires removing obsolete assignments and creating new ones. Executing these as separate operations risks partial updates if an intermediate write fails.

### Decision

Execute role permission replacement within a single nested Prisma mutation (`prisma.role.update` with `rolePermissions: { deleteMany: {}, create: ... }`). Catches Prisma `P2025` to return a `404 Not Found` error if the role does not exist.

### Rationale

- **Atomic Execution:** PostgreSQL applies nested updates within an implicit transaction, ensuring all-or-nothing consistency.
- **Concise Orchestration:** Replaces manual multi-query transaction orchestration with native Prisma nested writes.
- **Integrity Validation:** Connecting permissions by name validates that all referenced permissions exist.

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

**Status:** Superseded by ADR-079

> [!IMPORTANT]
> **Superseded Status Note:**
> This decision broadened the refresh token cookie path from `/auth/refresh-token` (ADR-033) to `/auth`. However, when routing through reverse-proxy topologies (such as Vercel Edge rewriting `/api/:path*` to backend compute), the browser-facing path is `/api/auth/*` while backend Express routing is mounted at `/auth/*`. Cookies scoped to `/auth` are never delivered by browsers on `/api/*` requests. Consequently, [ADR-079](#adr-079--serverless-lambda-runtime-synchronous-execution-guard-and-reverse-proxy-cookie-bridge) superseded this decision by broadening `refreshTokenCookieOptions.path` to root `"/"`.

### Context

The refresh token cookie was originally scoped to `path: "/auth/refresh-token"` [ADR-033], which prevented the browser from sending it to `POST /auth/logout`. The logout endpoint reads `req.cookies.refreshToken` to identify and delete the session, but the cookie was absent due to path mismatch.

### Decision

Broaden the refresh token cookie path from `/auth/refresh-token` to `/auth`. The cookie is sent to all endpoints under the `/auth` prefix, including `/auth/refresh-token`, `/auth/logout`, and `/auth/logout-all`.

### Rationale

- **Functional Correctness:** Logout can now read and revoke the refresh token session.
- **Consistency:** Both token refresh and session revocation endpoints receive the cookie without requiring the client to pass it in the request body.
- **Evolutionary Step:** Served as the intermediate progression (`/auth/refresh-token` -> `/auth` -> `/`) before edge reverse proxy parity required root scoping in [ADR-079](#adr-079--serverless-lambda-runtime-synchronous-execution-guard-and-reverse-proxy-cookie-bridge).

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

**Status:** Accepted _(Cardinality extended by ADR-057)_

### Context

During primary authentication (`POST /auth/login`), users with MFA enabled complete credential verification (first factor) but cannot be granted a full session before completing the second factor. Passing raw user IDs or email addresses to the subsequent `/auth/mfa/verify` endpoint exposes the API to unauthenticated TOTP brute-forcing attacks against arbitrary accounts.

### Decision

Generate a short-lived (5-minute expiration) intermediate `MfaChallenge` record (`mfaToken` UUIDv7) upon successful primary credential verification. Return `{ mfaRequired: true, mfaToken }` to the client without issuing JWT access or refresh tokens. The client must present `mfaToken` alongside the TOTP or recovery code to `POST /auth/mfa/verify`. The challenge is atomically deleted (`deleteMfaChallenge`) immediately upon verification.

> [!NOTE]
> **Cardinality Evolution (ADR-057):**
> While ADR-045 establishes the ephemeral challenge mechanism and single-use verification token contract, [ADR-057](#adr-057--ephemeral-multi-challenge-mfa-architecture-with-single-use-invalidation) evolved the relational schema from 1:1 to 1:Many (`User` -> `mfaChallenges MfaChallenge[]`) to allow concurrent login challenges across browser tabs without overwriting earlier pending tokens.

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

## ADR-050 — Redis-Backed Fixed-Window Rate Limiting via Atomic Lua Scripting

**Status:** Accepted

### Context

HTTP rate limiting requires coordinating counter increments and window expirations in a shared store. Executing `INCR` and `EXPIRE` as separate commands introduces race conditions where counters can leak if expiration fails. Furthermore, multi-command transaction blocks (`MULTI`/`EXEC`) multiply roundtrips and Redis command consumption per request.

### Decision

Execute counter increments and conditional expiration atomically in a single Redis command using an embedded Lua script (`redis.eval`) in `src/middlewares/rate-limit.ts`. The script sets the expiration TTL only on window initiation (`if count == 1`). Liveness probes (`/health/live`) bypass rate limiting to prevent infrastructure health checks from consuming Redis resources.

```typescript
// Atomically increments counter and sets window expiration on first hit
const count = await redis.eval(
  `local count = redis.call('INCR', KEYS[1])
   if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
   return count`,
  1,
  redisKey,
  secondsRemainingInWindow,
);
```

### Rationale

- **Single Atomic Command:** Replaces multi-command transactions with a single Lua script execution, eliminating roundtrip latency and command multiplication.
- **Strict Atomicity:** Guarantees counter increment and TTL initialization occur as an indivisible unit without external locking.
- **Window Precision:** Setting TTL exclusively when `count == 1` prevents window drift on subsequent requests.
- **Probe Isolation:** Exempting `/health/live` ensures infrastructure monitoring remains responsive even during Redis degradation.

---

## ADR-051 — Centralized Rate Limit Policy Dictionary

**Status:** Accepted

### Context

Rate limit parameters (window duration, request quota, key strategy) scattered across individual route files creates inconsistency and complicates tuning.

### Decision

Define all rate limit policies as a single typed constant `RATE_LIMIT_POLICIES` in `src/middlewares/rate-limit.ts`, typed via `as const satisfies Record<string, RateLimitPolicy>`. The `rateLimiter(policy)` middleware factory consumes any policy from the dictionary.

Policy tiers define standard quotas and keying strategies across endpoints (Global Baseline, Standard Reads, Administrative Queries, Authentication, Account Mutations, and Token Dispatches). For the authoritative mapping of routes and access tiers to rate-limiting policies, see [ARCHITECTURE.md (Complete Route Inventory)](ARCHITECTURE.md#21-complete-route-inventory--openapi-31-operation-registry-33-operations).

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

## ADR-054 — Proxy-Derived Client IP Resolution via Express `req.ip`

**Status:** Accepted

### Context

Client IP resolution is required for rate limiting, session tracking, and audit logging. However, in modern deployment topologies (e.g. edge rewrites, CDN layers, or direct backend access), manually parsing `X-Forwarded-For` headers (`req.headers["x-forwarded-for"].split(",")[0]`) is vulnerable to IP spoofing if client-supplied headers are trusted naively.

### Decision

Replace manual `X-Forwarded-For` string splitting with `getClientIp(req)` in `src/common/utils/ip.ts`, returning `req.ip || "127.0.0.1"`. Express `req.ip` delegates to `proxy-addr`, which traverses the proxy chain right-to-left based on configured `TRUST_PROXY` boundaries `[ADR-053]`.

### Rationale

- **Structured Proxy Traversal:** Prevents naive leftmost-header injection by validating hops against configured `trust proxy` settings.
- **Proxy-Derived Best-Effort Attribution:** Recognizes that `req.ip` is proxy-derived and relies on the integrity of the ingress topology. Where direct backend ingress or varying proxy hop counts exist, IP-based rate limiting and audit attribution are treated as best-effort controls rather than verified client identifiers.
- **Centralized Resolution:** Ensures all consumers (rate limiters, session tracking, audit logs) resolve IP addresses through a consistent utility.

---

## ADR-055 — Resource Isolation & Origin Validation for State-Changing Requests

**Status:** Accepted

### Context

Cross-Site Request Forgery (CSRF) and cross-origin state mutations exploit ambient browser credentials (cookies) to execute actions (`POST`, `PUT`, `PATCH`, `DELETE`). While CORS policies restrict cross-origin response reading, simple HTTP requests (`<form>` POST, body-less `POST`) bypass CORS preflights (`OPTIONS`) entirely, executing state mutations on the server before CORS headers are evaluated. Furthermore, deployment architectures hosting frontends separately from backend APIs require cross-domain cookie transport (`SameSite=None`), making server-side request origin verification mandatory.

### Decision

Implement global `originValidation` middleware (`src/middlewares/origin-validation.ts`) mounted after CORS and logging, but before global rate-limiting and body/cookie parsing:

1. **State-Changing Scope**: Evaluates mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`). Idempotent read methods (`GET`, `HEAD`, `OPTIONS`) pass through immediately.
2. **Fetch Metadata Fast-Path**: Leverages unforgeable browser `Sec-Fetch-Site` headers — `same-origin` and `same-site` requests pass immediately without URL parsing overhead.
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

**Status:** Accepted _(Extends ADR-045)_

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

Define a unified `OAuthProviderStrategy` interface in `oauth.types.ts` implemented by isolated provider singletons (`googleOAuthProvider`, `githubOAuthProvider`). Each strategy encapsulates provider-specific endpoints, accepts cryptographic PKCE parameters, cooperates with cancellation timeouts, and normalizes external user identity into a standard `OAuthProfile` DTO:

```typescript
export interface OAuthProviderStrategy {
  getAuthorizationUrl(state: string, codeChallenge?: string): Promise<URL>;
  getUserProfile(
    code: string,
    codeVerifier?: string,
    signal?: AbortSignal,
  ): Promise<OAuthProfile>;
}
```

The core service (`oauth.service.ts`) dispatches requests dynamically via a provider strategy dictionary (`getOAuthStrategy(provider)`), propagating the PKCE challenge, verifier, and abort signal to upstream provider implementations [ADR-080, ADR-081].

> [!NOTE]
> **Relying Party Trust Boundary (Google):**
> AuthSphere acts strictly as an OAuth 2.0 / OIDC Relying Party (Client). For Google social login, user identity claims (`email`, `email_verified`, `sub`) are retrieved directly from Google's authenticated UserInfo endpoint (`https://openidconnect.googleapis.com/v1/userinfo`) over TLS using the bearer access token [ADR-062], rather than locally verifying cryptographic signatures of Google's `id_token` against Google JWKS. Full protocol contracts are specified in [OAUTH.md](OAUTH.md).
> **Client Trust Boundary (Google):**
> AuthSphere acts strictly as an OAuth 2.0 Client implementing Authorization Code Flow with PKCE (RFC 7636 / RFC 9700). For Google social login, user identity claims (`email`, `email_verified`, `sub`) are retrieved directly from Google's authenticated UserInfo endpoint (`https://openidconnect.googleapis.com/v1/userinfo`) over TLS using the bearer access token [ADR-062], rather than locally verifying cryptographic signatures of Google's `id_token` against Google JWKS. AuthSphere does not claim full OIDC Relying Party compliance. Full protocol contracts are specified in [OAUTH.md](OAUTH.md).

### Rationale

- **Extensibility & Decoupling:** New OAuth providers require only implementing `OAuthProviderStrategy` without modifying core session, token, or controller layers.
- **Normalized Domain Contract:** Standardizes divergent provider payloads (e.g., Google OpenID `sub` vs GitHub numeric `id`) into a consistent `OAuthProfile`.
- **Isolated Error Boundaries:** Provider-specific HTTP failure modes and API errors remain encapsulated within their respective strategy classes.
- **Detailed Integration Guide:** Complete flow sequences, provider strategies, and verification test specifications are documented in [OAUTH.md](OAUTH.md).

---

## ADR-060 — Redis-Backed Ephemeral OAuth State with Atomic Single-Use Invalidation

**Status:** Accepted

### Context

OAuth 2.0 authorization flows require cryptographic state parameters to prevent Cross-Site Request Forgery (CSRF). Persisting state in browser cookies introduces cross-domain edge cases, while database storage causes unnecessary I/O overhead. Furthermore, authorization codes and state parameters must be consumed exactly once to prevent replay attacks.

### Decision

Store 32-byte cryptographically random state strings in Redis under `oauth:state:<state>` with a strict 10-minute TTL. The state value encapsulates flow metadata (`OAuthStateData`: `provider`, optional `userId`, and optional `sessionId` for session revalidation). Browser binding is established via a paired ephemeral cookie `oauth_verifier_${state}` (`Path=/api/auth/oauth`, `HttpOnly`, `SameSite=Lax`, 10-minute TTL) containing the PKCE code verifier [ADR-080]. During authorization callback processing, state is atomically fetched and deleted via Redis `GETDEL` (`redis.getDel`) before verifying provider matching:

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

Enforce a strict Pre-Resolution Session Gate followed by a four-case identity resolution matrix in `oauth.service.ts` (`handleOAuthCallback`):

#### Phase 0: Pre-Resolution Session Gate

Whenever state data indicates an authenticated account-linking intent (`stateData.userId` or `stateData.sessionId` present), verify that the session exists in the database, has not expired (`expiresAt > NOW()`), and belongs to `stateData.userId` **prior to evaluating any identity resolution branch** [ADR-082]. If invalid, expired, or revoked, terminate immediately with `401 Unauthorized` (`AppError("Session has expired or was revoked. Please log in again to link your account.", 401)`). The flow is never downgraded to an unauthenticated login.

#### Phase 1: Identity Resolution Matrix (Evaluated after Phase 0)

| Flow Case                                  | Conditions                                         | Resolution Action                                                                                                           |
| :----------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Case 1: Existing Link**                  | `OAuthAccount` exists for `(provider, providerId)` | Authenticate linked user (triggers `MfaChallenge` if `user.mfaEnabled`); reject (`409 Conflict`) if `state.userId` differs. |
| **Case 2: Account Linking**                | `state.userId` present & account not linked        | Link `OAuthAccount` to authenticated user.                                                                                  |
| **Case 3: Unauthenticated Email Conflict** | Email exists in DB without `OAuthAccount` link     | Reject (`409 Conflict`), requiring user to log in with password and link in settings.                                       |
| **Case 4: New User Registration**          | Email does not exist in DB                         | Atomically create `User` (`isEmailVerified: true`) and `OAuthAccount` in a single transaction.                              |

### Rationale

- **Anti-Account Takeover (ATO):** Prohibits implicit auto-linking on unauthenticated flows, requiring explicit credential validation before associating social accounts.
- **Revocation Integrity:** Pre-resolution session revalidation prevents revoked sessions from resurrecting through social login callbacks when an OAuth account was previously linked.
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

1. **Google (`google.provider.ts`):** Validates `email_verified: true` from Google OpenID UserInfo (`/userinfo`), rejecting unverified accounts with `400 Bad Request`. Claims are retrieved directly from the authenticated UserInfo endpoint using the access token rather than validating ID token signatures.
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
export const initiateOAuthHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    // Generates PKCE verifier + challenge, calls initiateOAuth, sets verifier cookie, redirects
  });

export const oauthCallbackHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    // Reads + clears verifier cookie, calls handleOAuthCallback, sets auth cookies, returns ApiResponse
  });
```

Specific provider controllers (`googleInitiate`, `googleCallback`, `githubInitiate`, `githubCallback`) are instantiated from these factories and exported for explicit route binding.

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

Add specialized rate limit policies (`OAUTH_INITIATE`, `OAUTH_CALLBACK`, `MAGIC_LINK_REQUEST`, `MAGIC_LINK_VERIFY`) to `RATE_LIMIT_POLICIES` in `src/middlewares/rate-limit.ts`. For exact endpoint rate limits, quotas, and keying strategies, see [ARCHITECTURE.md (Complete Route Inventory)](ARCHITECTURE.md#21-complete-route-inventory--openapi-31-operation-registry-33-operations).

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
- **Index-Backed Query Execution:** Composite index on `(userId, createdAt DESC)` eliminates table scans for user event history.
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
   - Mock all email dispatches (`tests/helpers/email.ts`) using Vitest spies (`vi.mock("../src/modules/email/email.queue.js")` in `tests/setup.ts`), capturing verification tokens and magic links in an in-memory outbox to eliminate network dependencies while enabling direct token assertion.

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

**Status:** Accepted _(Extended by ADR-078)_

### Context

Executing outbound email delivery synchronously within HTTP request handlers couples authentication response latency to third-party network roundtrips, timeouts, and provider rate limits. Transient network blips or external API outages cause request timeouts, degrading user experience and risking orphaned database transactions or client retries.

The system requires moving email dispatch out of the synchronous request-response lifecycle while preserving transactional database guarantees for primary authentication state changes.

### Decision

Decouple email delivery from HTTP requests using a Redis-backed BullMQ task queue (`authsphere-email`):

1. **Post-Commit Best-Effort Publication:** All database state mutations (user record creation, verification tokens, password reset tokens, security audit logs) must commit successfully before enqueuing an email job. The system intentionally accepts an asynchronous failure window between PostgreSQL commit and Redis enqueue: if the server process terminates abruptly after commit but before enqueue, the email remains unsent while database state remains authoritative. This trade-off is accepted to avoid the architectural overhead of a transactional outbox table and polling daemon.
2. **Dedicated Queue Helpers:** Encapsulate queue publication within typed helpers (`enqueueVerificationEmail`, `enqueuePasswordResetEmail`, `enqueueMagicLinkEmail`, `enqueueSecurityNotificationEmail`) carrying minimal data payloads (`{ email, token }` or `{ email, eventType }`) rather than whole entity models.
3. **Security Transit Perimeter:** Background queue payloads carry sensitive credentials (raw email verification tokens, password-reset tokens, and magic-link tokens). Redis is therefore classified as a sensitive data perimeter requiring TLS in transit, authenticated access, and network isolation from untrusted environments.
4. **Supported Deployment Capability:** BullMQ represents a supported deployment capability for horizontally decoupled background workers (`APP_ROLE=worker`). Active default production deployments utilize `QUEUE_DRIVER=sync` on AWS Lambda (to prevent event-loop freeze upon response completion [ADR-079]) and `QUEUE_DRIVER=inline` on single-container ECS Fargate deployments (to eliminate idle Redis polling churn [ADR-078]), with BullMQ activated when dedicated horizontal worker compute is provisioned.

```typescript
export const enqueueVerificationEmail = (email: string, token: string) =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.VERIFICATION,
    email,
    token,
  });
```

### Rationale

- **Structural Latency Decoupling:** Eliminates variable third-party SMTP/REST network roundtrips from user-facing authentication request lifecycles, maintaining rapid client response times.
- **Fault Isolation:** External email service downtime or transient rate limits do not disrupt primary registration, password reset, or magic link database mutations.
- **Minimal Payload Contracts:** Queued jobs contain only primitive identifiers and tokens rather than complex database entity objects, preventing serialization churn and stale state discrepancies.
- **Configurable Runtime Footprint:** Operates as a supported capability within the tri-driver background job architecture ([ADR-078](#adr-078--dual-driver-background-job-architecture-and-cloud-migration-path)), allowing lightweight deployments to run without worker overhead while preserving a zero-code-change path to full BullMQ worker scaling.

---

## ADR-073 — Provider-Agnostic Email Abstraction with Resend Implementation

**Status:** Accepted

### Context

Directly coupling application modules and worker processes to a specific third-party email SDK leads to vendor lock-in, leaky abstractions, and complex mocking during test execution. A clean architectural boundary is necessary to encapsulate third-party SDK quirks, configuration, and error schemas behind a stable domain contract.

### Decision

Establish an `EmailProvider` interface contract, domain `EmailDeliveryError`, and pluggable delivery adapters orchestrated through a dynamic provider factory `getEmailProvider()`:

1. **Provider Contract (`src/modules/email/email.types.ts`)**: Enforces an agnostic signature accepting `{ to, subject, html }` and returning `{ id }`.
2. **Normalized Error Classification:** Define a provider-agnostic domain error `EmailDeliveryError` containing `isPermanent: boolean`. Concrete providers categorize third-party responses into transient failures (429 rate limits, 5xx outages, network timeouts) versus permanent failures (4xx client validation, unverified domain, malformed recipient address) and throw `EmailDeliveryError`.
3. **Pluggable Concrete Adapters**:
   - **Resend Adapter (`src/modules/email/resend.provider.ts`)**: Implements `resendProvider: EmailProvider` using the official Resend SDK (`resend`).
   - **Gmail OAuth2 Adapter (`src/modules/email/gmail.provider.ts`)**: Implements `gmailOAuthProvider: EmailProvider` using Nodemailer and Google OAuth2 refresh tokens (`GMAIL_USER`, `GMAIL_REFRESH_TOKEN`).
4. **Dynamic Provider Resolution (`src/modules/email/email.factory.ts`)**: `getEmailProvider()` lazily imports and returns the configured provider based on `EMAIL_PROVIDER` or available credentials, decoupling callers from specific SDK dependencies.
5. **Decoupled Worker Processing:** Queue workers and dispatch services depend strictly on `emailService` and `getEmailProvider()`, never importing specific provider SDKs.

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
2. **Atomic Middleware Rate Limiting:** Counter increments and window expirations execute via atomic Lua scripting (`redis.eval`) directly within middleware [ADR-050], eliminating multi-command transaction overhead while maintaining atomic execution.
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

## ADR-075 — Email Worker Retry Policy and Failed-Job Retention

**Status:** Accepted

### Context

Asynchronous background jobs interacting with external networks inevitably encounter transient failures such as network interruptions, third-party 5xx errors, and rate limit throttling. Conversely, executing retries on permanent failures (such as malformed email addresses, unsupported job types, or non-existent recipient domains) wastes queue capacity and CPU cycles while risking upstream provider penalties.

The task processing subsystem requires a resilient retry policy paired with failed-job retention storage for operational inspection.

### Decision

Implement an exponential backoff retry policy in BullMQ, combined with permanent-failure fast-failing and at-least-once delivery guarantees:

1. **Exponential Backoff:** Configure default job options with 5 total delivery attempts (1 initial attempt + up to 4 backoff retries with delays at 2s, 4s, 8s, 16s via `delay: 2000`).
2. **Permanent Failure Fast-Path:** In the worker processor, when `EmailDeliveryError.isPermanent` or corrupted/unsupported job types are encountered, throw BullMQ's built-in `UnrecoverableError`. This immediately transitions the job to the failed state, bypassing remaining retry attempts.
3. **Failed-Job Retention Storage:** Configure `removeOnComplete: true` to prune successful executions and `removeOnFail: { count: 500 }` to retain the last 500 failed jobs with stack traces and payload metadata in BullMQ's internal failed-job set for operational debugging.
4. **Graceful Worker Shutdown with Watchdog:** Register `SIGINT`, `SIGTERM`, and unhandled exception listeners that call `await worker.close()` with an unreferenced 10-second watchdog timer (`timer.unref()`), allowing active jobs to finish processing while guaranteeing shutdown completion.
5. **At-Least-Once Delivery Reality:** Processing adheres to at-least-once delivery semantics; if a worker terminates after provider acceptance but before BullMQ marks the job complete, the job may be re-dispatched upon recovery. Downstream email recipients must tolerate occasional duplicate messages during abrupt worker crashes.

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
- **Zero In-Flight Job Corruption:** Graceful worker shutdown permits in-flight email dispatches to complete, minimizing duplicate deliveries on process termination.
- **Production Auditability:** Retaining failed jobs in Redis allows operators to inspect payloads, failure reasons, and timestamps via standard queue inspection tools.

---

## ADR-076 — Refresh Token Rotation with Atomic CAS and Ephemeral Leeway Window

**Status:** Accepted _(Extends ADR-014)_

### Context

Refresh Token Rotation (RFC 6819) invalidates the consumed refresh token upon first exchange to prevent token replay attacks. In modern Single Page Applications (SPAs) and multi-tab browser environments, components and background queries frequently emit concurrent or rapid back-to-back API requests when an access token expires. Under strict single-winner rotation without concurrency tolerance, parallel refresh requests cause a race condition where one request succeeds while the others present the now-invalidated token, triggering false-positive session revocations ("ghost logouts").

Conversely, relaxing reuse detection entirely creates an unacceptable vulnerability window for stolen credential replay. The authentication subsystem requires an atomic, transaction-free mutation pattern that collapses concurrent client requests into a synchronized response while maintaining strict replay detection.

### Decision

Implement single-statement atomic Compare-And-Swap (CAS) session rotation paired with an ephemeral Redis leeway cache (`auth:refresh-leeway:{sessionId}:{oldTokenHash}`) configured with a 30-second TTL (`AUTH_REFRESH_TOKEN_LEEWAY_SECONDS`).

> [!IMPORTANT]
> **Sensitive Credential Perimeter:** While PostgreSQL strictly stores SHA-256 token digests (`tokenHash`), Redis temporarily caches the unhashed plaintext token pair (`JSON.stringify(tokens)`) during the 30-second concurrency window to collapse concurrent client requests. Redis is therefore classified as an active, sensitive credential perimeter requiring TLS in transit, password authentication, and strict network isolation from untrusted environments.

Because PostgreSQL CAS and Redis cache publication are separate operations, execution handles the concurrency gap explicitly:

1. **Pre-CAS Leeway Check with Active Session Verification:** When a refresh request arrives, it checks Redis for cached tokens under the old token hash. If found, it queries PostgreSQL to confirm the session remains active (`findSessionById(payload.sid)`). If the session was explicitly revoked (via logout, password reset, or admin termination), the request is rejected with `401 Unauthorized ("Invalid session")`. If active, the cached tokens are returned immediately.
1. **Pre-CAS Leeway Check with Active Session Verification & Dead Key Purge:** When a refresh request arrives, it checks Redis for cached tokens under the old token hash. If found, it queries PostgreSQL to confirm the session remains active (`findSessionById(payload.sid)`). If the session was explicitly revoked (via logout, password reset, or admin termination), the dead leeway key is immediately purged from Redis (`redis.del(leewayKey)`) and the request is rejected with `401 Unauthorized ("Invalid session")`. Furthermore, explicit session termination (`logout()`, `logoutAll()`) proactively purges any active leeway key. If active, the cached tokens are returned immediately.
1. **Atomic CAS Mutation:** If not cached, the request generates new tokens and executes an atomic CAS update on PostgreSQL via `prisma.session.updateMany` conditioned on both `id` and `tokenHash`.
1. **Winner Publication:** The winning caller (`rotated.count > 0`) stores the newly generated token pair in Redis with a 30-second TTL and returns the tokens.
1. **Loser Bounded Cache-Retry:** If the CAS returns 0 (a concurrent request won the database update), the loser does not immediately revoke the session. It checks the leeway cache; if not yet populated (winner is mid-publication), it waits 150ms and polls Redis once more. If populated, it returns the winner's cached tokens.
1. **Replay Revocation & Redis Degraded Behavior:** If the leeway cache remains unpopulated after the bounded retry, the request is treated as a token replay outside the leeway window, triggering session revocation (either local session or global account revocation governed by `AUTH_REUSE_DELETION_MODE` [ADR-092]). If Redis is unavailable or unpopulated, concurrent requests cannot be collapsed; under this degraded scenario, strict replay security takes precedence over concurrency tolerance, resulting in session revocation.

```typescript
const cached = await getLeewayCache(leewayKey);
if (cached) {
  const activeSession = await authRepository.findSessionById(payload.sid);
  if (!activeSession || activeSession.userId !== payload.sub) {
    await redis.del(leewayKey).catch(() => {});
    throw new UnauthorizedError("Invalid session");
  }
  return JSON.parse(cached) as AuthTokens;
}

// Atomic CAS update on PostgreSQL
const rotated = await authRepository.rotateSession(session.id, oldTokenHash, { ... });
if (rotated) {
  await setLeewayCache(
    leewayKey,
    JSON.stringify(tokens),
    env.AUTH_REFRESH_TOKEN_LEEWAY_SECONDS,
  );
  return tokens;
}

// CAS failed: check if a concurrent winner populated leeway cache (with 150ms retry)
let concurrentTokens = await getLeewayCache(leewayKey);
if (!concurrentTokens) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  concurrentTokens = await getLeewayCache(leewayKey);
}
if (concurrentTokens) {
  return JSON.parse(concurrentTokens) as AuthTokens;
}

// Replay detected outside leeway or during cache unavailability: revoke session
await revokeCompromisedSession(session);
if (env.AUTH_REUSE_DELETION_MODE === "GLOBAL") {
  await authRepository.deleteAllSessionsByUserId(session.userId);
} else {
  await authRepository.deleteSessionById(session.id);
}
throw new UnauthorizedError("Compromised session detected");
```

### Rationale

- **Ghost Logout Elimination:** Ephemeral leeway caching collapses concurrent SPA requests into a single synchronized token pair, preventing false-positive revocations across parallel tabs.
- **Revocation Safety:** Verifying session validity on leeway cache hits ensures that explicit logouts or remote session terminations cannot be bypassed by presenting an old token during the remaining 30-second cache TTL.
- **Race Gap Mitigation via Bounded Retry:** Bounded 150ms polling absorbs the microsecond gap between PostgreSQL CAS commit and Redis key publication.
- **Zero Multi-Statement Transaction Overhead:** Single-statement atomic Compare-And-Swap leverages PostgreSQL's row-level write lock, preventing race conditions without database transaction overhead.
- **Durable Replay Attack Detection:** Any presentation of an invalidated token outside the 30-second grace window triggers immediate session revocation, upholding OAuth 2.0 Security BCP (RFC 6819 / RFC 8725).
- **Explicit Degradation Trade-Off:** If Redis is down, concurrency tolerance degrades safely into strict replay protection, ensuring credential theft cannot be exploited even during cache outages.

---

## ADR-077 — Process-Aware Environment Partitioning and Least Privilege Secret Isolation

**Status:** Accepted _(Extends ADR-003, ADR-004)_

### Context

AuthSphere compiles a single unified container image (`ghcr.io/utkarshj014/authsphere:v1`) that powers two distinct runtime workloads: an internet-facing Express REST API and an asynchronous BullMQ background email worker. Each process role requires a fundamentally different subset of credentials. The public HTTP API requires database connection strings, JWT signing keys, and OAuth provider secrets, but never initiates outbound email dispatches. Conversely, the private background worker requires email provider API keys and sender addresses, but never interacts with the primary PostgreSQL database or token signing keys.

Jamming all environment variables into a single monolithic schema or forcing them across both processes creates a severe breach of the Principle of Least Privilege. Exposing email dispatch keys inside public-facing HTTP containers increases threat surface unnecessarily, while requiring database credentials inside background workers prevents isolated worker deployment. The configuration subsystem requires role-aware schema partitioning that enforces strict credential boundaries at process boot without requiring separate Docker images or runtime fallback hacks.

### Decision

Partition environment configuration in `apps/api/src/config/env.ts` into three discrete Zod schemas: `sharedConfig` (infrastructure common to both: `NODE_ENV`, `APP_ROLE`, `FRONTEND_URL`, `REDIS_URL`), `apiConfig` (database, JWT, OAuth, MFA), and `workerConfig` (`RESEND_API_KEY`, `EMAIL_FROM`).

At startup, the runtime inspects `process.env.APP_ROLE` to construct a dedicated active schema. The API server strictly validates `sharedConfig + apiConfig`, while the background worker strictly validates `sharedConfig + workerConfig`. Zod's default undeclared key-stripping automatically purges any extraneous variables passed to a container, ensuring neither workload leaks or accesses credentials belonging to the other.

```typescript
const apiSchema = sharedConfig.extend(apiConfig.shape).transform((c) => ({
  ...c,
  JWT_ACCESS_EXPIRES_IN_MS: parseDurationToMs(c.JWT_ACCESS_EXPIRES_IN),
  JWT_REFRESH_EXPIRES_IN_MS: parseDurationToMs(c.JWT_REFRESH_EXPIRES_IN),
}));
const workerSchema = sharedConfig.extend(workerConfig.shape);
const activeSchema = isWorker ? workerSchema : apiSchema;
const parsed = activeSchema.safeParse(process.env);
```

### Rationale

- **Principle of Least Privilege:** Public API containers never hold or require third-party email dispatch keys (`RESEND_API_KEY`), and background workers never hold database credentials (`DATABASE_URL`).
- **Unified Container Portability:** A single immutable container image runs either role simply by declaring `APP_ROLE`, eliminating multi-image build complexity in CI/CD.
- **Natural Secret Stripping:** Leverages Zod's native undeclared key stripping to discard cross-role environment pollution without fragile `.partial()` extensions or defensive runtime fallback hacks.
- **Fail-Fast Process Boot:** Each process role immediately validates its exact mandatory credentials at boot (`process.exit(1)`), preventing silent runtime failures during user requests or background job processing.

---

## ADR-078 — Dual-Driver Background Job Architecture and Cloud Migration Path

**Status:** Accepted _(Extends ADR-072, ADR-075, ADR-077)_

### Context

Operating a dedicated BullMQ background worker daemon provides robust job retries and dead-letter retention. However, serverless Redis providers bill per command and disconnect idle TCP sockets. Continuous polling by an idle worker generates command churn without delivering user value. Conversely, booting on-demand tasks introduces cold-start latency that delays transactional emails. The system requires an operational model that avoids polling overhead in low-traffic or single-container environments while retaining a production-grade queue driver and clear cloud migration path.

### Decision

Implement a configurable background job architecture governed by `QUEUE_DRIVER`:

1. **Inline Event-Loop (`QUEUE_DRIVER=inline`):** In low-traffic or single-container deployments, `enqueueEmailJob()` offloads dispatch asynchronously to the Node.js event loop via `setImmediate()`, executing non-blocking with zero Redis command consumption.
2. **Dedicated Queue Daemon (`QUEUE_DRIVER=bullmq`):** In clustered environments, jobs publish to BullMQ (`emailQueue.add()`) with exponential backoff retries [ADR-072, ADR-075] and relaxed polling intervals (`drainDelay: 30s`, `stalledInterval: 5m`).
3. **Synchronous Fallback (`QUEUE_DRIVER=sync`):** Awaits job processing directly within the request handler, required in serverless environments to prevent runtime freezes [ADR-079].
4. **Accepted In-Process Failure Window:** The inline driver accepts an in-process failure window: if the container terminates abruptly between HTTP response and event-loop execution, the email is not retried.
5. **Cloud Evolution:** AWS SQS and Lambda provide the target cloud architecture when horizontal elasticity is needed.

```typescript
export const enqueueEmailJob = async (data: EmailJobData): Promise<void> => {
  if (env.QUEUE_DRIVER === "sync") return processDirectly(data);
  if (env.QUEUE_DRIVER === "inline")
    return void setImmediate(() => processDirectly(data));
  await emailQueue.add(data.type, data);
};
```

### Rationale

- **Eliminates Idle Polling:** The inline driver eliminates background Redis polling commands when idle.
- **Low-Latency Dispatch:** Offloading dispatch via `setImmediate()` delivers transactional emails promptly without blocking HTTP response lifecycles.
- **Hermetic Testing:** Avoids physical Redis connections in offline unit test environments.
- **Target Cloud Architecture:** Defines an evolutionary path to AWS SQS and Lambda without premature cloud SDK coupling.

---

## ADR-079 — Serverless Lambda Runtime, Synchronous Execution Guard, and Reverse-Proxy Cookie Bridge

**Status:** Accepted _(Extends ADR-002, ADR-010, ADR-078)_

### Context

Deploying Express applications to serverless AWS Lambda introduces two constraints:

1. **Runtime Execution Freezes:** AWS Lambda freezes execution immediately upon HTTP response completion. Asynchronous background promises scheduled via `setImmediate()` freeze mid-flight and may be silently dropped or executed unpredictably during subsequent invocations.
2. **Cross-Origin Topologies:** When frontend and API reside on separate origins without a shared custom domain, browsers enforce cross-origin restrictions, require preflight `OPTIONS` requests, and restrict cookie transmission under default `SameSite` policies.

### Decision

Implement a serverless runtime adapter and reverse-proxy architecture:

1. **Serverless Express Adapter (`apps/api/src/lambda.ts`):** Adapt Express (`app.ts`) to AWS Lambda via `@codegenie/serverless-express`. Cold starts initialize Redis eagerly with fallback to degraded mode; warm invocations use a 100ms timeout guard to recover disconnected sockets.
2. **Synchronous Execution Guard (`QUEUE_DRIVER=sync`):** In AWS Lambda (`isLambdaRuntime` detected via environment), `enqueueEmailJob()` awaits email dispatch directly within the handler before response completion, preventing tasks from freezing mid-flight.
3. **Edge Reverse Proxy (`apps/web/vercel.ts` via `@vercel/config/v1` [ADR-085]):** Configure edge rewrites (`/api/:path*` -> backend endpoint). Browsers interact strictly same-origin (`/api/*`), preserving `SameSite=Lax` cookies and eliminating CORS preflights.
4. **Root Cookie Scoping (`path: "/"`):** Because reverse-proxy rewrites map public `/api/auth/*` to Express `/auth/*`, authentication cookies are scoped to root `path: "/"` to ensure consistent delivery across edge proxies [superseding ADR-042].

```typescript
// apps/api/src/lambda.ts
export const handler = async (event: unknown, context: any) => {
  if (!serverlessHandler) {
    if (redis.status === "wait") await redis.connect().catch(() => {});
    serverlessHandler = configureServerless({ app });
  } else if (redis.status !== "ready") {
    if (redis.status === "end") redis.connect().catch(() => {});
    await once(redis, "ready", { signal: AbortSignal.timeout(100) }).catch(
      () => {},
    );
  }
  return serverlessHandler(event, context);
};
```

### Rationale

- **Deterministic Execution:** Awaiting email dispatch within the Lambda lifecycle guarantees completion before the runtime environment freezes.
- **Same-Origin Security:** Edge reverse proxy enables strict `SameSite=Lax` cookies and eliminates CORS preflight latency without requiring a custom domain.
- **Unified Codebase:** The same Express application routes, middleware, and validation run across both persistent container and serverless Lambda environments.

---

## ADR-080 — Browser-Bound PKCE (RFC 7636 / RFC 9700) and Per-Transaction Cookie Architecture

**Status:** Accepted _(Extends ADR-059, ADR-060)_

### Context

Standard confidential OAuth 2.0 clients rely on a random `state` parameter to prevent Cross-Site Request Forgery (CSRF). However, if an authorization code is intercepted or injected across browser contexts (Login-CSRF), a state parameter alone does not cryptographically bind the authorization response to the user agent that initiated the exchange. Furthermore, when users open concurrent OAuth authentication flows across multiple browser tabs, global or static verifier cookies overwrite each other, causing race conditions and false-positive authentication rejections.

While RFC 9700 (OAuth 2.0 Security Best Current Practice) recommends Proof Key for Code Exchange (PKCE, RFC 7636) for confidential clients, AuthSphere establishes an architectural policy mandating PKCE across all confidential and public OAuth 2.0 flows to prevent authorization code injection and cross-browser code redemption.

### Decision

Mandate PKCE across all confidential OAuth 2.0 providers (Google and GitHub) and bind the exchange to the initiating browser via a per-transaction, state-keyed verifier cookie:

1. **Initiation (`initiateOAuth` / `initiateOAuthHandler`):**
   - Generate a cryptographically secure 32-byte `codeVerifier` and compute its SHA-256 base64url challenge (`codeChallenge = s256(codeVerifier)`).
   - Pass `code_challenge` and `code_challenge_method=S256` to the provider's authorization endpoint.
   - Issue an ephemeral, HttpOnly cookie named uniquely per transaction: `oauth_verifier_${state}` via `setOAuthVerifierCookie(res, state, verifier)`.
   - Scope the cookie strictly to `Path=/api/auth/oauth`, `SameSite=Lax`, `maxAge=600000` (10 minutes), with `Secure` enabled in production (`env.NODE_ENV === "production"`).

2. **Callback Consumption (`handleOAuthCallback` / `oauthCallbackHandler`):**
   - Extract the verifier from `req.cookies[getOAuthVerifierCookieName(state)]`.
   - Immediately clear the cookie via `clearOAuthVerifierCookie(res, state)`.
   - If the cookie is absent (e.g., callback opened in a different browser, incognito session, or cookie expired), immediately reject the request with `400 Bad Request` (`AppError("Missing or expired OAuth transaction cookie", 400)`).
   - Supply the extracted `codeVerifier` in the token exchange payload to the upstream identity provider.

### Rationale

- **Cryptographic User-Agent Binding:** Enforces that only the exact browser instance that initiated the OAuth transaction can redeem the resulting authorization code, neutralizing authorization code injection and Login-CSRF attacks (aligning with RFC 9700 §2.1.1 recommendations).
- **Concurrency Isolation:** Keying cookie names by state (`oauth_verifier_${state}`) guarantees that simultaneous OAuth flows in distinct tabs do not overwrite each other's verifiers.
- **Symmetric Cookie Disposal:** Centralized helpers (`setOAuthVerifierCookie`, `clearOAuthVerifierCookie` in `cookie.ts`) enforce identical cookie attributes (`Path=/api/auth/oauth`, `HttpOnly`, `SameSite=Lax`), preventing orphaned cookies on client devices.
- **Zero External Framework Overhead:** Implements full PKCE security without requiring external session middleware or client-side storage frameworks.
- **Operational Flow & Testing:** End-to-end sequence diagrams, cookie lifecycle specs, and provider-specific tests are detailed in [OAUTH.md](OAUTH.md).

---

## ADR-081 — Cumulative Upstream Provider Abort Deadline and Gateway Timeout Mapping

**Status:** Accepted _(Extends ADR-008, ADR-059)_

### Context

OAuth authentication requires sequential HTTP roundtrips to external third-party identity providers: token exchange, user profile inspection, and secondary verified email retrieval (e.g. GitHub `/user/emails`). During upstream network latency spikes or provider degradation, unbounded or loosely configured timeouts can tie up backend compute threads, exceed serverless execution limits (e.g. AWS Lambda's 15-second ceiling), and leave users facing indefinite browser spinner delays.

Furthermore, generic JavaScript fetch timeout rejections emit unmapped `AbortError` exceptions that default to internal server errors (HTTP 500), obscuring upstream degradation from monitoring and API clients.

### Decision

Enforce a single, cumulative 7-second abort deadline across all external HTTP interactions within an OAuth transaction and explicitly map timeout aborts to HTTP 504 Gateway Timeout:

1. **Unified Abort Controller:** Instantiate a single `AbortController` with a bounded timer (`setTimeout(() => controller.abort(), 7000)`) at the start of callback resolution.
2. **Pervasive Signal Propagation:** Pass `signal: AbortSignal` into every external `fetch` request, including token exchange, user profile fetching, and email queries.
3. **Stream Consumption Budgeting:** Await all response body parsing (`response.json()`) under the same deadline, ensuring slow upstream chunked transfers cannot stall execution.
4. **Explicit 504 Gateway Timeout Mapping:** In the callback handler or service layer, catch `AbortError` or timeout exceptions from upstream fetches and throw an `AppError("OAuth provider request timed out. Please try again.", 504)`.
5. **Deterministic Cleanup:** Clear the timeout in a `finally` block to prevent lingering timers on warm serverless execution threads.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 7000);

try {
  const profile = await strategy.getUserProfile(code, verifier, controller.signal);
  return await resolveIdentity(profile, ...);
} catch (err: unknown) {
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    throw new AppError("OAuth provider request timed out. Please try again.", 504);
  }
  throw err;
} finally {
  clearTimeout(timeoutId);
}
```

### Rationale

- **Deterministic Serverless Headroom:** Capping cumulative upstream latency at 7 seconds guarantees at least 8 seconds of execution budget remains within AWS Lambda's 15-second ceiling for database transactions, session creation, and security audit logging.
- **Semantic HTTP Error Contracts:** Accurately reports third-party dependency timeouts as `504 Gateway Timeout` rather than misattributing failures to AuthSphere internals (`500 Internal Server Error`).
- **Resource Starvation Prevention:** Aborts hung TCP sockets immediately when upstream providers degrade, conserving socket pools and Node.js event-loop capacity.

---

## ADR-082 — Pre-Resolution Session Gate for Authenticated Account Linking

**Status:** Accepted _(Extends ADR-012, ADR-018, ADR-061)_

### Context

AuthSphere supports linking third-party OAuth identities (e.g. Google, GitHub) to existing accounts when initiated by an authenticated user. The user's active `userId` and `sessionId` are recorded in ephemeral Redis state during flow initiation.

However, a race condition exists: if an authenticated user initiates account linking but their session is revoked (e.g. via security logout in another tab, password reset, or admin action) while they are on the provider's consent screen, completing the OAuth flow must not bypass that revocation. If the external OAuth identity was already linked to that user in the past, an identity resolution strategy that processes existing accounts first (Case 1) would find the existing record and authenticate the user, re-issuing fresh credentials and silently resurrecting a revoked session.

### Decision

Enforce a **Pre-Resolution Session Gate** in `oauth.service.ts` that executes before evaluating any identity resolution branch whenever state metadata indicates an authenticated initiation intent (`stateData.userId` or `stateData.sessionId` present):

1. **Mandatory Session Validation:** Prior to querying `OAuthAccount` or evaluating user identity, query PostgreSQL (`sessionRepository.findSessionById`) for `stateData.sessionId`.
2. **Strict Invalidation Check:** If the session does not exist, has expired (`expiresAt <= NOW()`), or belongs to a different `userId`, immediately terminate the flow with `401 Unauthorized`:
   ```typescript
   throw new AppError(
     "Session has expired or was revoked. Please log in again to link your account.",
     401,
   );
   ```
3. **No Unauthenticated Downgrades:** The transaction is never permitted to downgrade to a standard unauthenticated social login. A revoked linking attempt must fail completely.
4. **Verified Access Token Clarification:** In `optionalAuth` middleware, the presence of a valid access token in `req.auth` signals authenticated intent for initiation; the Pre-Resolution Session Gate in the callback establishes whether the underlying database session remains active.

### Rationale

- **Complete Revocation Integrity:** Guarantees that session revoking, password changes, and administrator terminations cannot be circumvented via OAuth callback completion.
- **Fail-Secure Security Invariant:** Enforces that flows initiated in an authenticated context must complete in that same authenticated context, preventing session resurrection and unauthorized account association.
- **Predictable Error Semantics:** Returns a clear, actionable `401 Unauthorized` response instructing the user to re-authenticate, rather than silently creating conflicting accounts or linking to stale sessions.

---

## ADR-083 — Standardized REST API Response Envelope Contract (`ApiResponse`)

**Status:** Accepted _(Extends ADR-008)_

### Context

In REST APIs, returning disparate response shapes—such as bare JSON objects, naked arrays, or differing error payloads across controllers—complicates client-side consumption. Frontend HTTP interceptors must implement heuristic checks to determine whether an operation succeeded, whether an error occurred, or how to extract pagination metadata. Furthermore, generating uniform OpenAPI 3.1 documentation requires a consistent response envelope schema.

### Decision

Enforce a standardized JSend-inspired response envelope across all HTTP endpoints via `ApiResponse` (`apps/api/src/common/responses/api-response.ts`) and global `errorHandler` (`apps/api/src/common/errors/error-handler.ts`):

1. **Successful Responses (`ApiResponse.success(res, data, message, statusCode)`):**
   ```typescript
   {
     "success": true,
     "message": "Operation description",
     "data": T | null
   }
   ```
2. **Error Responses (`errorHandler` & `ApiResponse.error`):**
   - **Centralized `errorHandler` Middleware (Primary):** Emits structured DTOs with optional validation issue details:
     ```typescript
     {
       "success": false,
       "message": "Human-readable error explanation",
       "errors": [
         { "field": "email", "message": "Invalid email address format" }
       ] // Optional: included for ValidationError (400)
     }
     ```
   - **Static `ApiResponse.error(res, data, message, statusCode)`:** Used for static route fallbacks (e.g. 404 handler) returning `{ success: false, message: string, data: null }`.

### Rationale

- **Predictable Client Consumption:** Frontend clients (`apps/web/src/api/client.ts`) evaluate `response.data.success` uniformly, unwrapping payload data or surfacing `response.data.message` directly in UI notifications.
- **Normalized Validation Errors:** Validation middleware formats Zod schema violations into a consistent `errors: [{ field, message }]` array via `formatZodError`, allowing frontend form libraries (React Hook Form) to bind errors directly to specific form inputs.
- **Explicit Payload Distinctions:** Guarantees unambiguous differentiation between empty operations (`data: null` with `200 OK`) and missing resources (`404 Not Found`).

---

## ADR-084 — Pure TypeScript Safe Transactional Email Templating Engine

**Status:** Accepted _(Extends ADR-073)_

### Context

Generating responsive, cross-client HTML emails (for email verification, password resets, magic links, and security alerts) often leads developers to adopt third-party templating libraries such as Handlebars, Mustache, Pug, or EJS. However, runtime template engines introduce significant drawbacks:

1. **Security Vulnerabilities:** Runtime AST parsing exposes applications to Server-Side Template Injection (SSTI) and Remote Code Execution (RCE) if template strings incorporate untrusted inputs.
2. **Cold-Start Bloat:** Compiling template engines increases Lambda package size and slows cold-start initialization.
3. **Loss of Static Typing:** Template parameters (tokens, URLs, event types) are untyped strings, allowing typos and missing variables to slip through to production unnoticed.

### Decision

Implement pure TypeScript transactional email template functions in `apps/api/src/modules/email/email.templates.ts` using tagged template literals and strict character entity escaping:

1. **Strict HTML Entity Escaping:** All dynamic inputs pass through `escapeHtml()` mapping `&`, `<`, `>`, `'`, and `"` to HTML character entities, preventing XSS and injection.
2. **Base Layout Isolation:** Encapsulate structural styling within `baseTemplate(title, bodyContent)`: enforces centered, table-based layouts (max-width 580px, system sans-serif font stack, `#0f172a` header, `#f8fafc` security footer) compatible with Outlook, Apple Mail, and Gmail.
3. **Strongly-Typed Template API:** Export pure functions (`verification`, `passwordReset`, `magicLink`, `securityNotification`) that validate required arguments at compile time and return `{ subject: string, html: string }`.

### Rationale

- **Zero-Engine Security:** Eliminates third-party template parsing engines entirely, achieving compile-time safety and total immunity to SSTI exploits.
- **Zero Runtime Overhead:** String interpolation executes at native V8 engine speeds with zero AST compilation latency or memory footprint during serverless invocations.
- **High-Fidelity Rendering:** Universal table-based formatting with inline CSS ensures consistent visual rendering across desktop, web, and mobile email clients.

---

## ADR-085 — Code-First Edge Reverse Proxy Configuration via `@vercel/config/v1`

**Status:** Accepted _(Extends ADR-079)_

### Context

Deploying AuthSphere to Vercel requires routing client requests (`/api/*`) to external backend infrastructure (AWS Lambda Function URLs or ECS ALB endpoints) while serving the Single-Page Application (SPA) on root routes. Standard Vercel configuration relies on static `vercel.json` files. However, static JSON cannot read deployment-time environment variables (`BACKEND_URL`). Hardcoding backend URLs into repository JSON files prevents automated preview branch deployments and leaks infrastructure endpoints into source control.

### Decision

Author Vercel edge reverse proxy routing using code-first TypeScript via `@vercel/config/v1` in `apps/web/vercel.ts`:

```typescript
import { deploymentEnv, routes, type VercelConfig } from "@vercel/config/v1";

const backendUrl = deploymentEnv("BACKEND_URL");

export const config: VercelConfig = {
  redirects: [
    {
      source: "/api/docs",
      destination: "/api/docs/",
      permanent: true,
    },
  ],
  rewrites: [
    routes.rewrite("/api/(.*)", `${backendUrl}/$1`),
    routes.rewrite("/(.*)", "/index.html"),
  ],
};
```

### Rationale

- **Dynamic Environment Resolution:** `deploymentEnv("BACKEND_URL")` injects the correct backend endpoint dynamically during Vercel deployment without committing static URLs or credentials to git.
- **Type-Safe Routing Contracts:** Validates redirect and rewrite structures at build time against official Vercel schema definitions.
- **Swagger UI Asset Integrity:** Enforces a permanent redirect from `/api/docs` to `/api/docs/`, ensuring relative CSS/JS asset paths resolve properly within OpenAPI documentation.

---

## ADR-086 — Development-to-Production Reverse Proxy Parity via Vite Local Server

**Status:** Accepted _(Extends ADR-079, ADR-085)_

### Context

In production, client code routes API requests through relative `/api/*` paths, which edge reverse proxies rewrite to backend endpoints. If local development requires browsers to communicate directly with `http://localhost:3000` via absolute URLs, frontend code accumulates environment conditionals, CORS configurations diverge, and cookie delivery behaves inconsistently across ports.

### Decision

Configure Vite's development server in `apps/web/vite.config.ts` to mirror production edge proxying by forwarding `/api/*` requests to the local backend:

```typescript
// apps/web/vite.config.ts
server: {
  proxy: {
    "/api": {
      target: process.env.VITE_API_URL || "http://localhost:3000",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
    },
  },
}
```

The frontend API client (`apps/web/src/api/client.ts`) targets `baseURL: "/api"` universally with `withCredentials: true`.

### Rationale

- **Environment Parity:** The frontend codebase operates exclusively on same-origin `/api` relative URLs across development, staging, and production.
- **Local Origin Parity:** Vite terminates cross-port differences (e.g. port 5173 to 3000), eliminating CORS preflights and ensuring identical `HttpOnly; SameSite=Lax` cookie delivery in development.

---

## ADR-087 — WebCrypto JOSE Token Engine with Dual-Secret Isolation (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`)

**Status:** Accepted _(Extends ADR-003, ADR-012, ADR-039)_

### Context

Common Node.js authentication architectures rely on legacy libraries (`jsonwebtoken`) that depend on Node.js-specific crypto internals and frequently reuse a single `JWT_SECRET` for both access and refresh tokens. This architecture presents two major security risks:

1. **Monolithic Secret Blast Radius:** If a single shared `JWT_SECRET` is compromised, an attacker can forge both access tokens and stateful, long-lived (30d) refresh tokens, establishing persistent session hijacking across database restarts.
2. **Algorithm Confusion Exploits:** Accepting tokens without strict, hardcoded algorithm binding exposes servers to key-confusion attacks (e.g. public RSA key treated as HMAC secret, or `none` algorithm bypass).

### Decision

Adopt `jose` (standard Web Cryptography API) and enforce dual-secret cryptographic isolation in `apps/api/src/lib/jwt/`:

1. **Access Token Pipeline (`access-token.ts`):** Signs short-lived (15m) access tokens using `JWT_ACCESS_SECRET`, strictly pinning `{ alg: "HS256" }`, `sub: userId`, `sid: sessionId`, `role: roleName`, and unique `jti: crypto.randomUUID()`.
2. **Refresh Token Pipeline (`refresh-token.ts`):** Signs stateful (30d) refresh tokens using a completely isolated secret `JWT_REFRESH_SECRET`, pinning `{ alg: "HS256" }`.
3. **Strict Algorithm Enforcement:** Token verification via `jwtVerify` validates signatures against the dedicated secret and enforces that the token header specifies `HS256`, rejecting any non-matching algorithm.

### Rationale

- **Bounded Blast Radius via Key Separation:** Isolating access and refresh signing keys confines the impact of a compromised `JWT_ACCESS_SECRET`. While an exposed access secret permits an attacker to continuously mint forged access tokens embedding arbitrary `role` claims (each with a 15-minute TTL) for as long as the secret remains unrotated, permissions are resolved downstream through the authorization layer. The compromise does not automatically expire after 15 minutes; active minting persists until `JWT_ACCESS_SECRET` is rotated in deployment configuration, after which any previously minted tokens expire within at most 15 minutes. Crucially, access secret compromise cannot forge refresh tokens or hijack persistent database sessions. Revoking or rotating `JWT_ACCESS_SECRET` instantly invalidates all forged access tokens upon rotation without corrupting legitimate database sessions. Conversely, compromise of `JWT_REFRESH_SECRET` alone does not permit direct forging of valid access tokens.
- **Algorithm Confusion Immunity:** Explicit header algorithm enforcement (`alg: "HS256"`) eliminates signature downgrade and key confusion attack vectors.
- **Universal Runtime Execution:** `jose` relies exclusively on the standard Web Cryptography API (`crypto.subtle`), executing natively across Node.js 24, AWS Lambda, and edge runtimes without native compilation dependencies.

---

## ADR-088 — Runtime Egress Data Sanitization Firewall via Zod Response Schemas

**Status:** Accepted _(Extends ADR-004, ADR-026, ADR-038; Extended by ADR-099, ADR-101)_

### Context

When database entities (such as `User`) are retrieved via Prisma, records contain highly sensitive credential attributes (`passwordHash`, `mfaSecret`, `mfaLastUsedWindow`). Relying on manual field deletion (`delete user.passwordHash`) or controller-level mapping is fragile: a single developer oversight or schema addition can accidentally leak credential hashes, MFA secrets, or PII into public API JSON responses (CWE-200 / CWE-209).

### Decision

Enforce mandatory runtime egress data sanitization at the service layer boundary using explicit Zod response schemas (`src/modules/users/users.validation.ts`, `src/modules/auth/auth.validation.ts`):

```typescript
// apps/api/src/modules/users/users.service.ts
const getUser = async (userId: string): Promise<UserProfileResponse> => {
  const user = await usersRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  // Runtime egress sanitization firewall on sensitive user profile record
  return usersResponseSchema.userProfile.parse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    mfaEnabled: user.mfaEnabled,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  });
};
```

Identical schema-enforced runtime sanitization applies across `usersResponseSchema.paginatedUsers` (for `GET /users` [ADR-099]) and `authResponseSchema.currentUserProfile` (for `GET /auth/me` [ADR-101]), guaranteeing that only non-sensitive attributes (such as `mfaEnabled` boolean status) are returned to the client while internal cryptographic secrets remain unexposed.

### Rationale

- **Fail-Secure Output Defense:** Guarantees that sensitive columns (`passwordHash`, `mfaSecret`) cannot reach HTTP responses even if an ORM query executes `SELECT *`.
- **Strict Response Contracts:** Enforces compile-time TypeScript type fidelity and runtime shape compliance for OpenAPI generation.

---

## ADR-089 — Asynchronous Security Event Notification Pipeline for High-Risk Credential Mutations

**Status:** Accepted _(Extends ADR-069, ADR-072, ADR-078)_

### Context

When a user account undergoes critical security mutations—such as password reset, password change, or MFA disablement—the legitimate account owner must be alerted out-of-band via email. If an attacker gains temporary access or social-engineers credential changes, lack of immediate notification leaves the victim unaware of account takeover.

### Decision

Implement an event notification pipeline triggered automatically inside `apps/api/src/modules/auth/auth.service.ts`:

- On `resetPassword`: dispatches `enqueueSecurityNotificationEmail(email, "PASSWORD_RESET")`.
- On `changePassword`: dispatches `enqueueSecurityNotificationEmail(email, "PASSWORD_CHANGED")`.
- On `mfaDisable`: dispatches `enqueueSecurityNotificationEmail(email, "MFA_DISABLED")`.

Dispatch routing and delivery guarantees are governed by `QUEUE_DRIVER` `[ADR-078]`:

- `bullmq`: Asynchronous durable delivery via Redis queue. Incurs minimal latency overhead (~1–2ms job enqueue); failed jobs are retried with exponential backoff and persist across process restarts.
- `inline`: Deferred in-process execution via `setImmediate`. Incurs zero client latency penalty, but execution is ephemeral and jobs can be lost if the process crashes or terminates before delivery.
- `sync`: Synchronous in-band execution. Directly blocks the client HTTP request until SMTP/API email transport completes (introducing network latency penalty); intended for local development and deterministic integration testing.

In all modes, email delivery failures are isolated and do not abort or roll back already-committed PostgreSQL credential mutations.

### Rationale

- **Account Takeover (ATO) Rapid Incident Response:** Alerts users out-of-band to credential changes, providing immediate actionable warnings if the action was unauthorized.
- **Explicit Driver Semantics & Non-Blocking Resilience:** Prevents notification delivery failures from blocking primary authentication workflows, while clarifying latency characteristics and durability trade-offs across queue modes.

---

## ADR-090 — Keyless Cloud Deployment via AWS IAM OpenID Connect (OIDC) Federation

**Status:** Accepted _(Extends ADR-077, ADR-079)_

### Context

Traditional CI/CD deployment pipelines store static AWS IAM user credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) as repository secrets. Static credentials do not expire, are vulnerable to credential theft from CI build logs or compromised actions, and require routine manual secret rotation.

### Decision

Configure keyless AWS deployment in `.github/workflows/deploy.yml` using OpenID Connect (OIDC) identity federation:

1. Configure GitHub Actions workflow permissions: `id-token: write` and `contents: read`.
2. Authenticate to AWS via `aws-actions/configure-aws-credentials@v6`, assuming an IAM role (`role-to-assume: AWS_DEPLOY_ROLE_ARN`) via GitHub's cryptographic OIDC token.
3. Configure the IAM role trust policy subject condition to match the deployment repository and main branch reference (e.g. `repo:utkarshj014@*/authsphere@*:ref:refs/heads/main` or exact `repo:utkarshj014/authsphere:ref:refs/heads/main`).
4. Zero static AWS access keys are created or stored in repository secrets.

### Rationale

- **Zero Static Secret Sprawl:** Eliminates long-lived access keys in GitHub Secrets, removing credential theft risks and key rotation overhead.
- **Short-Lived Ephemeral Credentials:** STS tokens issued by AWS IAM are short-lived (15–60 minutes) and cryptographically bound to GitHub Actions OIDC identity assertions for the target repository and branch.
- **Permission Scope Realism:** OIDC provides keyless authentication; the deployment role inherently carries broad provisioning capabilities (CloudFormation, Lambda, ECS, ECR) necessary for release automation, rather than fine-grained runtime least privilege.
- **Deployment Architecture:** Complete IAM trust policy templates, AWS credentials setup, and GitHub Actions permissions are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## ADR-091 — Polymorphic Unified MFA Input Resolution (TOTP vs Recovery Code)

**Status:** Accepted _(Extends ADR-046, ADR-047, ADR-057)_

### Context

Multi-Factor Authentication requires supporting both standard time-based one-time passwords (TOTP 6-digit codes) and emergency 10-character alphanumeric recovery codes. Forcing clients or users to specify whether they are submitting a TOTP code vs recovery code via different endpoints or form fields complicates client UI state, leaks fallback mechanisms, and degrades recovery UX.

### Decision

Implement a unified polymorphic resolution algorithm in `auth.service.ts` (`verifyMfaCodeOrRecoveryCode`) accepting a single `code: string` parameter:

1. **TOTP Format Inspection:** Test if the string matches 6-digit numeric TOTP (`totp.isTotpCode(code)`). If so, decrypt the MFA secret and verify against time windows; if valid, atomically advance `mfaLastUsedWindow` [ADR-046].
2. **Recovery Code Fallback:** If the code fails TOTP or is alphanumeric, compute SHA-256 hash `hashToken(code)` and attempt single-use consumption in `authRepository.verifyAndConsumeRecoveryCode` (`usedAt: null -> usedAt: now()`) [ADR-047].
3. **Unified Rejection:** If neither verification succeeds, throw a single generic `400 Bad Request` ("Invalid or expired MFA code or recovery code").

### Rationale

- **Streamlined Frontend UX:** A single input field handles both normal TOTP tokens and emergency recovery codes without requiring the user to toggle modes.
- **Timing Attack & Enumeration Resistance:** Polymorphic evaluation prevents revealing whether an account has exhausted its recovery codes.

---

## ADR-092 — Configurable Replay Revocation Scope (`AUTH_REUSE_DELETION_MODE`)

**Status:** Accepted _(Extends ADR-014, ADR-076)_

### Context

When a rotated refresh token is replayed outside the leeway grace window (RFC 6819 token theft detection), the server must revoke credentials. However, operational requirements diverge based on threat models:

- Single-Session Invalidation (`SESSION`): Only the compromised session is terminated, allowing legitimate active sessions on other devices (e.g. mobile app while desktop was attacked) to remain uninterrupted.
- Global Invalidation (`GLOBAL`): All sessions across all devices are immediately revoked, prioritizing absolute containment at the cost of cross-device user disruption.

### Decision

Implement configurable revocation blast-radius governed by `AUTH_REUSE_DELETION_MODE: z.enum(["SESSION", "GLOBAL"]).default("SESSION")` in `apps/api/src/config/env.ts` and `apps/api/src/modules/auth/auth.service.ts`:

- `SESSION` mode executes `authRepository.deleteSessionById(session.id)`.
- `GLOBAL` mode executes `authRepository.deleteAllSessionsByUserId(session.userId)`.

> [!WARNING]
> **Redis Outage Degradation Behavior:**
> When Redis is unavailable or unpopulated, the 30-second leeway grace window cannot be cached or evaluated. Consequently, concurrent SPA requests fail the atomic CAS database check and fall directly through to replay revocation. In `SESSION` mode, only the single active device session is terminated. However, in `GLOBAL` mode during a Redis outage, concurrent tab refreshes immediately invoke `deleteAllSessionsByUserId`, revoking all active sessions across all devices for that user.

### Rationale

- **Flexible Security Posture:** Allows low-friction consumer deployments to minimize cross-device disruption while giving enterprise or zero-trust deployments full global containment capability without code changes.
- **Fail-Secure Threat Containment:** Ensures that even during Redis cache outages, the system fails closed by enforcing replay protection rather than permitting unauthorized token re-issuance.

---

## ADR-093 — Universal UUIDv7 Primary Key Strategy Across Relational Entities

**Status:** Accepted _(Extends ADR-005, ADR-015, ADR-058)_

### Context

Traditional auto-incrementing integer IDs leak creation volume, allow competitive business intelligence extraction, and permit enumeration attacks. Random UUIDv4 identifiers prevent enumeration, but their complete lack of ordering causes severe B-tree index fragmentation, random disk I/O, and insert performance degradation in PostgreSQL tables exceeding available RAM.

### Decision

Standardize on UUIDv7 (`@id @default(uuid(7))` in Prisma) as the ubiquitous primary key across all 11 relational entities in `apps/api/prisma/schema.prisma` (`User`, `Role`, `Permission`, `Session`, `EmailVerificationToken`, `PasswordResetToken`, `MfaChallenge`, `MfaRecoveryCode`, `OAuthAccount`, `MagicLinkToken`, `SecurityEvent`).

### Rationale

- **B-Tree Index Locality:** Time-ordered high bits ensure sequential index inserts and significantly reduce B-tree fragmentation and page splits compared to random UUIDv4, maintaining optimal PostgreSQL cache and index locality.
- **Anti-Enumeration & Identifier Unpredictability:** Retains 74 bits of entropy to prevent sequential identifier harvesting and resource enumeration (while authorization checks enforce access boundaries against IDOR attacks).
- **Pre-Persistence Independence:** Allows services to generate IDs in memory (`uuidv7()`) before persistence without roundtrip latency.

---

## ADR-094 — Relational Deletion Cascades and Administrative Role Immutability

**Status:** Accepted _(Extends ADR-005, ADR-013, ADR-037; Extended by ADR-100)_

### Context

When a user account is deleted, failure to purge dependent tokens, sessions, and MFA credentials causes orphaned records and database bloat. Deleting child records also involves trade-offs between clean data deletion and retaining historical security audit logs (`SecurityEvent`). Furthermore, unintended modification of foundational system roles (specifically the `ADMIN` role) could compromise role-based access control.

### Decision

Enforce relational integrity constraints at the PostgreSQL schema and service levels:

1. **Atomic Deletion Cascades:** All user-dependent child models (`Session`, `OAuthAccount`, `EmailVerificationToken`, `PasswordResetToken`, `MfaChallenge`, `MfaRecoveryCode`, `MagicLinkToken`, `SecurityEvent`) specify `onDelete: Cascade` in `schema.prisma`. Deleting a `User` cascades atomically in a single database transaction. This reflects a deliberate architectural trade-off prioritizing automated orphan cleanup and complete user record removal over immutable audit log preservation.
2. **Role Deletion Restrict:** `User.role` enforces `onDelete: Restrict`, prohibiting the deletion of any role currently assigned to one or more users.
3. **Admin Role Permission Guard:** `roles.service.ts` explicitly guards the `ADMIN` role permissions from mutation via the API: `if (roleName === ROLES.ADMIN) throw new ForbiddenError("Cannot update permissions for the admin role.");` (while read-only inspection is exposed via `GET /roles/:roleName/permissions` [ADR-100]).

### Rationale

- **Database-Level Atomicity:** Offloads user-associated orphan cleanup to native PostgreSQL foreign keys, guaranteeing zero dangling auth tokens or sessions.
- **Audit-Retention Trade-Off:** Cascading `SecurityEvent` deletion prioritizes complete user data removal upon deletion, trading persistent audit history for automated database cleanliness unless separate out-of-band audit export is configured.
- **Administrative Permission Protection:** Guarantees that foundational admin role permissions cannot be altered or degraded via the API.

---

## ADR-095 — Dual Database Connection Strategy (Neon Direct Migrations vs Pooled Runtime)

**Status:** Accepted _(Extends ADR-005, ADR-079)_

### Context

Serverless PostgreSQL providers (Neon) provide two connection modes:

1. Transaction Pooled (`-pooler.region.neon.tech` via PgBouncer): multiplexes hundreds of transient application sockets over a small physical pool, essential for serverless Lambda execution.
2. Direct Connection (`.region.neon.tech`): direct connection to the PostgreSQL compute instance.

PgBouncer in transaction mode multiplexes connections per transaction and does not support session-level features or session-scoped advisory locks (`pg_advisory_lock`) required by `prisma migrate deploy` to prevent concurrent migration collisions. Running migrations through a transaction pooler can lead to migration lock errors or pooled connection mismatches.

### Decision

Partition database connection strings based on execution lifecycle:

- Runtime Compute (API, Worker, Lambda): Runtime environments inject the pooled connection string into `DATABASE_URL` (supplied via GitHub Secret `DATABASE_URL_POOLED`) with bounded pool sizing in `src/lib/prisma.ts`.
- Schema Migrations (CI/CD Pipeline): The deployment workflow (`.github/workflows/deploy.yml`) explicitly overrides `DATABASE_URL: ${{ secrets.DATABASE_URL_DIRECT }}` when running `npm run db:migrate:deploy`.

### Rationale

- **Reliable Schema Migrations:** Direct connection enables Prisma Migrate to acquire session-scoped migration advisory locks and execute schema changes reliably without transaction-pool routing issues.
- **Serverless Socket Safety:** Runtime compute connects exclusively through the pooler, preventing PostgreSQL backend exhaustion during traffic spikes.

---

## ADR-096 — Multi-Stage Container Architecture with Non-Root Execution and PID 1 Signal Reaping (`dumb-init`)

**Status:** Accepted _(Extends ADR-010)_

### Context

Running Node.js as the primary process in Docker containers introduces two critical production hazards:

1. Elevated Container Privileges: By default, containers execute as `root`. If application vulnerabilities or container escapes are exploited, running as root grants attackers maximum privileges inside the container environment.
2. PID 1 Signal Trap: As PID 1, Node.js does not reap zombie child processes and does not handle standard Linux signals (`SIGTERM`, `SIGINT`) properly unless explicit signal listeners are bound, preventing clean container draining during ECS task deployments.

### Decision

Standardize on a hardened 3-stage `Dockerfile` (`base` -> `builder` -> `runner`):

1. Multi-Stage Pruning: The `builder` compiles TypeScript and runs `npm prune --omit=dev` to remove TypeScript and Prisma CLI from the final image.
2. Non-Root User: The `runner` stage creates and switches to `USER node`.
3. Signal Reaping: Installs and sets `ENTRYPOINT ["dumb-init", "--"]`, ensuring `dumb-init` runs as PID 1 to reap orphaned child processes and proxy `SIGTERM` signals directly to Node.js for ADR-010 graceful shutdown.

### Rationale

- **Least Privilege Container Execution:** Running as `USER node` reduces process privileges and limits the blast radius of container breakouts, preventing immediate in-container root access.
- **Deterministic Task Draining:** `dumb-init` ensures AWS ECS task stop signals cleanly trigger the 10-second graceful shutdown draining logic in `src/server.ts`.
- **Minimal Image Footprint:** Removing devDependencies and source files reduces image attack surface and deployment transfer time.

---

## ADR-097 — Single-File Tree-Shaken ESM Lambda Bundling with Native C++ Addon Externalization (`tsup`)

**Status:** Accepted _(Extends ADR-077, ADR-079)_

### Context

Deploying Express applications to AWS Lambda typically requires bundling `node_modules`. Zipping unbundled dependencies yields large deployment archives that slow upload and cold-start transfer times. However, naïve JavaScript bundlers encounter two constraints:

1. Native C++ binary addons (`argon2`) cannot be bundled into JavaScript files and must load their compiled `.node` binaries from filesystem paths.
2. CommonJS dependencies bundled into Node.js ESM output fail without a compatibility require shim (`ReferenceError: require is not defined`).

### Decision

Configure `tsup` in `apps/api/tsup.config.ts` for AWS Lambda deployment:

- Target `node24`, format `esm`, minified single bundle `lambda.mjs`.
- Bundles all pure JS/TS dependencies (`noExternal: [/^(?!argon2).*$/]`).
- Externalizes `argon2` native addon (`external: ["argon2"]`), preserving only argon2 in Lambda's local `node_modules`.
- Injects an ESM CommonJS compatibility banner:
  ```javascript
  import { createRequire } from "node:module";
  const require = createRequire(import.meta.url);
  ```

### Rationale

- **Reduced Package Size:** Bundling shrinks deployment package size, reducing cold-start S3 artifact download and initialization latency.
- **Native Binary Stability:** Preserves native C++ compilation bindings for Argon2id hashing without compilation errors.
- **ESM/CJS Compatibility:** Enables CommonJS packages (`@codegenie/serverless-express`) to execute cleanly in native Node.js 24 ESM Lambda runtimes.

---

## ADR-098 — Unified Dual-Target Deployment Pipeline (Serverless Lambda vs Containerized ECS Fargate)

**Status:** Accepted _(Extends ADR-078, ADR-079, ADR-090, ADR-095, ADR-096, ADR-097)_

### Context

Different deployment topologies require different compute profiles: on-demand serverless execution (AWS Lambda via SAM) suits intermittent or scale-to-zero traffic, while persistent container compute (AWS ECS Fargate with Application Load Balancers and worker daemons) suits steady-state throughput. Maintaining separate deployment workflows or branching application code across targets introduces configuration drift and operational overhead.

### Decision

Implement a unified GitHub Actions deployment pipeline (`.github/workflows/deploy.yml`) controlled by `DEPLOY_TARGET: serverless | ecs`:

1. **Shared Validation:** Both targets execute identical linting, typechecking, hermetic testing, and build verification.
2. **Dedicated Migrations:** Migrations run via direct database connection (`DATABASE_URL_DIRECT`) between artifact creation and service deployment.
3. **Serverless Path (`serverless`):** Builds tree-shaken `lambda.mjs` via `tsup`, packages zip, and deploys via AWS SAM (`sam deploy`) to Lambda with native Function URLs.
4. **Container Path (`ecs`):** Builds multi-stage Docker image, pushes to GitHub Container Registry (GHCR), renders task definitions, and deploys API and Worker services to AWS ECS Fargate.
5. **Automated Verification:** Post-deploy step queries `/health/live` and `/health/ready` to verify service availability before completing the release.

### Rationale

- **Single Pipeline Source of Truth:** A declarative workflow manages both serverless and container deployments.
- **Infrastructure Portability:** Deployment targets can be switched between AWS Lambda and AWS ECS Fargate via repository configuration without code modifications.
- **Operations & Runbooks:** Full SAM parameters, task definitions, rollback procedures, and environment matrix are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## ADR-099 — Paginated Administrative User Directory and Standard Offset Query Strategy

**Status:** Accepted _(Extends ADR-026, ADR-036, ADR-051, ADR-088)_

### Context

Back-office administration consoles require global visibility across registered user accounts. Returning unpaginated datasets causes unbounded memory consumption, query latency, and payload bloat. Administrative workflows require arbitrary page jumps, bidirectional traversal, and total record counts (`totalCount`, `totalPages`) that cursor-based pagination cannot satisfy without traversing intermediate pages.

### Decision

Implement an administrative user directory endpoint at `GET /users` with standardized offset pagination. The endpoint accepts validated `page` (default `1`) and `limit` (default `20`, max `100`) query parameters, executes `usersRepository.findUsersPaginated` concurrently with `prisma.user.count()` via `Promise.all`, and returns a structured `{ users, pagination }` metadata envelope. Route access is restricted to `ADMIN` roles and throttled by user-keyed rate limiting (`USERS_LIST`). For complete route definitions, see [ARCHITECTURE.md](ARCHITECTURE.md#21-complete-route-inventory--openapi-31-operation-registry-33-operations).

### Consequences

- **Positive:** Enables arbitrary page navigation, total record estimation, and standardized dashboard table controls.
- **Negative:** Deep offset traversal (`OFFSET > 1000`) incurs increasing relational scan costs, mitigated by capping `limit` at 100 and applying strict user-keyed rate limits.

### Security Invariants

- **Role Boundary:** Guarded by `requireRole(ROLES.ADMIN)`; unauthorized requests or non-admin users receive immediate `403 Forbidden`.
- **Egress Sanitization:** Output is strictly filtered via `usersResponseSchema.paginatedUsers` [ADR-088], stripping `passwordHash`, `mfaSecret`, and internal security attributes.
- **Anti-Scraping Defense:** Throttled via `RATE_LIMIT_POLICIES.USERS_LIST` (30 req/min, keyed by authenticated user ID) to prevent bulk account harvesting.

---

## ADR-100 — Dedicated Role Permission Introspection with Cached Read Path and Administrative Immutability

**Status:** Accepted _(Extends ADR-035, ADR-036, ADR-037, ADR-051, ADR-094)_

### Context

AuthSphere uses dynamic Role-Based Access Control (RBAC) where permissions are assigned to roles. While permissions could be modified via `PUT /roles/:roleName/permissions`, the system lacked a dedicated, idempotent read-only endpoint for inspecting assigned permissions, forcing admin consoles and audit tools to infer state or query data stores directly.

### Decision

Implement a dedicated read-only role permission introspection endpoint at `GET /roles/:roleName/permissions` guarded by `auth`, `requireRole(ROLES.ADMIN)`, and `rateLimiter(ROLE_READ_PERMISSIONS)`. Read requests resolve permissions via `authorizationService.getPermissionsByRole`, backed by 24-hour Redis caching (`role:permissions:<roleName>`) with transparent fallback to PostgreSQL. On permission updates (`PUT /roles/:roleName/permissions`), atomic database updates immediately invalidate the cached Redis key (`redis.del`). Updates targeting the foundational `ADMIN` role are rejected at the service layer. For route specifications, see [ARCHITECTURE.md](ARCHITECTURE.md#21-complete-route-inventory--openapi-31-operation-registry-33-operations).

### Consequences

- **Positive:** Completes read/write API symmetry, eliminates repeated relational joins on hot authorization read paths (~1ms cached), and guarantees zero stale privilege windows upon permission modification.
- **Negative:** Couples permission mutation workflows directly to Redis cache key eviction logic.

### Security Invariants

- **Administrative Immutability:** Server enforces rejection (`403 Forbidden`) of any modification attempt against the `ADMIN` role's permissions, preserving system integrity and preventing lockout.
- **Synchronous Cache Invalidation:** Updating role permissions invalidates the cache synchronously, ensuring all active sessions evaluate updated privileges on their subsequent request.
- **Fail-Open Resilience:** Redis connectivity failures degrade transparently to direct PostgreSQL queries without rejecting administrative inspection requests.

---

## ADR-101 — Zero-Side-Effect Client MFA State Introspection via Current User Profile Contract

**Status:** Accepted _(Extends ADR-040, ADR-045, ADR-057, ADR-088, ADR-091)_

### Context

Frontend applications need to ascertain the user's Multi-Factor Authentication (MFA) posture to render dynamic security settings, post-login reminders, and step-up authentication prompts. Previously, clients had to infer enrollment by invoking setup endpoints (`POST /auth/mfa/setup`) or tracking fragile client-side flags. Calling mutation endpoints to probe status generates ephemeral secrets, polluting database state and introducing cryptographic overhead.

### Decision

Expose `mfaEnabled: boolean` as a first-class attribute in the authenticated user profile returned by `GET /auth/me`. The field is read directly from the `User` database record and validated via `authResponseSchema.currentUserProfile` [ADR-088]. Parity is maintained across administrative user endpoints (`GET /users/:id` and `GET /users` [ADR-099]). For the complete API route map, see [ARCHITECTURE.md](ARCHITECTURE.md#21-complete-route-inventory--openapi-31-operation-registry-33-operations).

### Consequences

- **Positive:** Provides idempotent, zero-side-effect posture introspection on application bootstrap and navigation without creating challenge records or generating ephemeral secrets.
- **Negative:** Expands the user profile response schema contract, requiring synchronized types across frontend clients.

### Security Invariants

- **Cryptographic Secret Sealing:** Only the boolean enrollment flag is exposed; internal encrypted secrets (`mfaSecret`), IVs, auth tags, monotonic counter windows, and recovery codes remain sealed within the database boundary.
- **Runtime Egress Sanitization:** All profile responses pass through strict Zod output validation schemas (`currentUserProfile`, `userProfile`, `paginatedUsers`), preventing accidental column leakage.
- **Zero Mutation Side-Effects:** Read-only inspection generates no challenge tokens, modifies no database rows, and cannot interfere with ongoing MFA enrollment lifecycles.
