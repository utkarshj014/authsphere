# Architecture & System Design — AuthSphere

This document provides a comprehensive overview of **AuthSphere's** system architecture, component interactions, data models, and core execution flows for an authentication and session-management platform with production-oriented security controls.

> **AuthSphere Architecture & Engineering Documentation Suite:**
>
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — System Design, Component Topology & Core Data Models
> - [Engineering-Decisions.md](./Engineering-Decisions.md) — 98 Formal ADRs, Security Invariants & Technical Trade-offs
> - [OAUTH.md](./OAUTH.md) — OAuth 2.0 PKCE Social Authentication & Integration Protocols
> - [DEPLOYMENT.md](./DEPLOYMENT.md) — Cloud Infrastructure, Dual-Compute (Lambda/ECS) & Runbooks
> - [TESTING.md](./TESTING.md) — Hermetic Test Pyramid, Invariant Verification & CI Strategies

---

## 1. System Overview & Monorepo Architecture

AuthSphere is organized as a multi-package monorepo managed via npm workspaces:

```text
authsphere/ (Monorepo Root)
├── apps/
│   ├── api/                  # Express.js REST API service (Node.js >=24)
│   │   ├── prisma/           # Database schema, migrations, and seed script
│   │   └── src/
│   │       ├── common/       # Global errors, utilities, ApiResponse envelopes, OpenAPI registry
│   │       ├── config/       # Process-aware environment validation (env.ts)
│   │       ├── generated/    # Explicitly generated Prisma client
│   │       ├── lib/          # Singleton infrastructure clients (Prisma, Redis, Logger, Crypto, JWT, TOTP, Queue)
│   │       ├── middlewares/  # Security, tracing, origin guard, rate limiting, RBAC middlewares
│   │       ├── modules/      # Feature modules (auth, authorization, sessions, roles, users, health, email)
│   │       ├── types/        # Express ambient type declarations
│   │       ├── workers/      # Standalone background queue worker (email.worker.ts)
│   │       ├── app.ts        # Pure Express application setup
│   │       ├── server.ts     # HTTP server entrypoint (ECS Fargate container)
│   │       └── lambda.ts     # AWS Lambda serverless entrypoint (@codegenie/serverless-express)
│   └── web/                  # React & Vite frontend application
│       ├── vercel.ts         # Code-first edge reverse proxy configuration (@vercel/config/v1)
│       └── vite.config.ts    # Development reverse proxy configuration
├── packages/
│   └── shared/               # Shared domain constants (ROLES, PERMISSIONS, etc.) and TypeScript types
├── infra/                    # Infrastructure as Code
│   ├── ecs/                  # AWS ECS Task Definitions (API & Worker)
│   └── lambda/               # AWS SAM / CloudFormation Template & build scripts
├── docker/                   # Multi-container local orchestration (docker-compose.dev.yml, docker-compose.infra.yml)
└── Dockerfile                # Multi-stage production container build (base -> builder -> runner)
```

> **Related Architectural Decisions:** See [Architecture & Project Boundaries ADRs](./Engineering-Decisions.md#architecture--project-boundaries) for monorepo boundary principles and feature-based modular design.

---

## 2. Layered Component Architecture

HTTP requests traversing AuthSphere pass through a deterministic pipeline across distinct architectural boundaries. Global security and ingress middlewares run ahead of route matching, while protected endpoints evaluate authentication prior to user-keyed rate limiting and authorization guards:

```mermaid
flowchart TD
    Client["HTTP Client / Browser"] -->|"Public Requests /api/*"| Vercel["Vercel Edge Reverse Proxy"]
    Vercel -->|"Rewrites /api/(.*) to /(.*)"| Express["Express.js App"]

    subgraph GlobalPipeline ["1. Global Ingress Middleware Pipeline (app.ts)"]
        Helmet["Helmet Security Headers"]
        CORS["CORS (Strict FRONTEND_URL and Credentials)"]
        ReqID["Request ID Sanitization and Pino Logger"]
        OriginGuard["Origin and Sec-Fetch-Site Guard (State Mutations)"]
        HealthBypass{"Route is /health/* ?"}
        HealthHandler["In-Memory Health Probes (/health/live)"]
        GlobalRL["Global Rate Limiter (100 req/min via Atomic Lua)"]
        BodyParser["Body Parser (16kb Limit) and Cookie Parser"]

        Helmet --> CORS
        CORS --> ReqID
        ReqID --> OriginGuard
        OriginGuard --> HealthBypass
        HealthBypass -->|"Yes"| HealthHandler
        HealthBypass -->|"No"| GlobalRL
        GlobalRL --> BodyParser
    end

    subgraph RoutePipelines ["2. Route-Level Execution Pipelines"]
        Router{"Target Route Type"}

        AuthGuard["Auth Middleware (Verifies Access JWT, attaches req.auth)"]
        UserRL["Route Rate Limiter (Dual-Key: Authenticated userId)"]
        ZodValProtected["Zod Validation (Params, Query, Body)"]
        RBACGuard["RBAC Authorization Guard (requireRole / requirePermission)"]

        IPRL["Route Rate Limiter (Dual-Key: Client IP)"]
        ZodValPublic["Zod Validation (Body, Params)"]

        Router -->|"Protected (/sessions, /roles, etc.)"| AuthGuard
        AuthGuard --> UserRL
        UserRL --> ZodValProtected
        ZodValProtected --> RBACGuard

        Router -->|"Public (/auth/signup, /login, etc.)"| IPRL
        IPRL --> ZodValPublic
    end

    subgraph FeatureLayer ["3. Feature Module Layer"]
        Controller["Module Controller (HTTP Translation and ApiResponse Envelopes)"]
        Service["Module Service (Domain Logic and Security Decisions)"]
        Repository["Module Repository (Prisma 7 ORM and SQL Queries)"]

        Controller --> Service
        Service --> Repository
    end

    subgraph InfraLayer ["4. Infrastructure Layer"]
        Redis[("Redis Cache and Store")]
        QueueSystem["Queue Dispatcher (BullMQ / Inline / Sync)"]
        Worker["Email Worker Daemon"]
        EmailGateway["Email Provider Strategy (Gmail OAuth2 / Resend)"]
        CryptoLib["Crypto Library (WebCrypto HS256 / Argon2id / AES-256-GCM)"]
        Postgres[("PostgreSQL Database: Neon and PgBouncer")]

        QueueSystem -->|"QUEUE_DRIVER=bullmq"| Redis
        Worker -->|"Poll and Dequeue"| Redis
        Worker -->|"Dispatch"| EmailGateway
        QueueSystem -->|"QUEUE_DRIVER=inline or sync"| EmailGateway
    end

    Express --> Helmet
    BodyParser --> Router
    RBACGuard --> Controller
    ZodValPublic --> Controller

    GlobalRL -->|"Atomic Pipeline"| Redis
    UserRL -->|"Atomic Pipeline"| Redis
    IPRL -->|"Atomic Pipeline"| Redis
    Service -->|"Permission and Leeway Cache"| Redis
    Service -->|"Enqueue Email Jobs"| QueueSystem
    Service -->|"Argon2id and AES-256-GCM"| CryptoLib
    Repository -->|"Prisma Pg Adapter"| Postgres
```

### Layer Responsibilities

| Architectural Layer            | Primary Responsibility                                                                                                                                                                                                                        | Architectural Rule                                                                                                                                         |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Middleware Pipeline** | Request tracing, CORS validation, origin and `Sec-Fetch-Site` verification, health check bypass, global IP rate limiting, and deferred payload parsing (16kb limit).                                                                          | Rejects malformed, oversized, untrusted-origin, or rate-limited requests before JSON parsing or route matching.                                            |
| **Route Middleware Pipeline**  | JWT authentication, user-keyed vs IP-keyed rate limiting, multi-target Zod input validation, and RBAC authorization guards.                                                                                                                   | Enforces `auth -> rateLimiter -> validate -> requireRole/requirePermission`. Authentication runs ahead of user-keyed rate limits and authorization guards. |
| **Controller Layer**           | HTTP protocol translation, extracting pre-validated input, setting/clearing HTTP-only cookies, and returning standardized API response envelopes (`ApiResponse`: `{ success: boolean, message: string, data: T \| null, errors?: unknown }`). | Pure HTTP orchestration with zero business logic or direct database access. Delegates all state mutations to services.                                     |
| **Service Layer**              | Core authentication and session orchestration, password verification, cryptographic operations, MFA challenge resolution, session generation, and cache invalidation.                                                                         | Independent of Express `req`/`res`. Throws domain-specific `AppError` subclasses.                                                                          |
| **Repository Layer**           | Data persistence using Prisma 7 ORM with PostgreSQL adapter (`@prisma/adapter-pg` + `pg.Pool`). Translates database errors (e.g. `P2002` duplicate key) into domain errors.                                                                   | Encapsulates all database operations and transactions. No business logic.                                                                                  |
| **Infrastructure Layer**       | Singleton clients for PostgreSQL (`prisma`), Redis (`ioredis`), Logging (`pino`), and background email delivery (`emailQueue` / `emailService`).                                                                                              | Singletons instantiated in `src/lib/`. Decoupled from application framework.                                                                               |

> **Related Architectural Decisions:** See [Validation, Middleware & Authorization ADRs](./Engineering-Decisions.md#validation-middleware--authorization) for pipeline ordering, Zod validation contracts, and rate limiting policies.

---

## 3. Data Architecture & Entity-Relationship Model

AuthSphere models user identity, active sessions, multi-factor authentication, role-based permissions, OAuth federated accounts, and security audit events across 12 Prisma models:

```mermaid
erDiagram
    User ||--o{ Session : "holds active"
    User ||--o| EmailVerificationToken : "has pending"
    User ||--o| PasswordResetToken : "has pending"
    User ||--o{ MfaRecoveryCode : "owns"
    User ||--o{ MfaChallenge : "has pending"
    User ||--o{ OAuthAccount : "federated with"
    User ||--o| MagicLinkToken : "has pending"
    User ||--o{ SecurityEvent : "audited by"
    User }|--|| Role : "assigned"
    Role ||--o{ RolePermission : "contains"
    Permission ||--o{ RolePermission : "granted to"

    User {
        string id PK "UUIDv7"
        string email UK "Normalized lowercase"
        string passwordHash "Argon2id (Null for pure social)"
        boolean isEmailVerified "Default false"
        string firstName "Nullable"
        string lastName "Nullable"
        string roleId FK "onDelete: Restrict"
        datetime lastLoginAt "Nullable"
        datetime verifiedAt "Nullable"
        datetime passwordChangedAt "Nullable"
        boolean mfaEnabled "Default false"
        string mfaSecret "AES-256-GCM Encrypted"
        int mfaLastUsedWindow "Monotonic Window Index"
        datetime createdAt
        datetime updatedAt
    }

    Role {
        string id PK "UUIDv7"
        enum name UK "USER | ADMIN"
        string description "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    Permission {
        string id PK "UUIDv7"
        string name UK "e.g. user.read"
        string description "Nullable"
        datetime createdAt
        datetime updatedAt
    }

    RolePermission {
        string roleId PK,FK "onDelete: Cascade"
        string permissionId PK,FK "onDelete: Cascade"
    }

    Session {
        string id PK "UUIDv7"
        string userId FK "onDelete: Cascade"
        string tokenHash UK "SHA-256 Digest"
        string ipAddress "Nullable"
        string userAgent "Nullable"
        datetime expiresAt "Indexed"
        datetime createdAt
    }

    EmailVerificationToken {
        string id PK "UUIDv7"
        string userId UK,FK "onDelete: Cascade"
        string tokenHash UK "SHA-256 Digest"
        datetime expiresAt "Indexed"
        datetime createdAt
    }

    PasswordResetToken {
        string id PK "UUIDv7"
        string userId UK,FK "onDelete: Cascade"
        string tokenHash UK "SHA-256 Digest"
        datetime expiresAt "Indexed"
        datetime createdAt
    }

    MfaRecoveryCode {
        string id PK "UUIDv7"
        string userId FK "onDelete: Cascade"
        string codeHash UK "SHA-256 Digest"
        datetime usedAt "Nullable"
        datetime createdAt
    }

    MfaChallenge {
        string id PK "UUIDv7"
        string userId FK "onDelete: Cascade"
        datetime expiresAt "Indexed (5m TTL)"
        datetime createdAt
    }

    OAuthAccount {
        string id PK "UUIDv7"
        string userId FK "onDelete: Cascade"
        enum provider "GOOGLE | GITHUB"
        string providerId "External Sub/ID"
        datetime createdAt
        datetime updatedAt
    }

    MagicLinkToken {
        string id PK "UUIDv7"
        string userId UK,FK "onDelete: Cascade"
        string tokenHash UK "SHA-256 Digest"
        datetime expiresAt "Indexed (15m TTL)"
        datetime createdAt
    }

    SecurityEvent {
        string id PK "UUIDv7"
        string userId FK "onDelete: Cascade"
        enum type "LOGIN_SUCCESS | LOGOUT | MFA_..."
        string ipAddress "Nullable"
        string userAgent "Nullable"
        json metadata "Nullable audit context"
        datetime createdAt "Indexed desc with userId"
    }
```

### Relational & Key Invariants

1. **Universal UUIDv7 Primary Keys & Composite Join Keys:** AuthSphere defines 12 Prisma models. All 11 independent database entities (`User`, `Role`, `Permission`, `Session`, `EmailVerificationToken`, `PasswordResetToken`, `MfaRecoveryCode`, `MfaChallenge`, `OAuthAccount`, `MagicLinkToken`, and `SecurityEvent`) use time-ordered UUIDv7 identifiers (`@default(uuid(7))`). UUIDv7 embeds a 48-bit Unix millisecond timestamp in the high bits, ensuring sequential B-tree index insertion locality and minimizing page splits while providing cryptographically random entropy to prevent ID enumeration. The 12th model, `RolePermission`, is a relational join entity utilizing a composite primary key (`@@id([roleId, permissionId])`).
2. **Explicit Deletion Cascade Policy:** Deleting a `User` cascades to all user-owned dependent entities (`Session`, `EmailVerificationToken`, `PasswordResetToken`, `MfaRecoveryCode`, `MfaChallenge`, `OAuthAccount`, `MagicLinkToken`, and `SecurityEvent`). Conversely, `User.roleId` enforces `onDelete: Restrict` to prevent accidental deletion of assigned roles. Deleting `SecurityEvent` records on account purge represents a deliberate operational audit-retention trade-off.
3. **PostgreSQL Token Persistence:** Relational persistence in PostgreSQL stores exclusively one-way cryptographic SHA-256 digests (`tokenHash`, `codeHash`). Raw verification and magic link tokens are never written in plaintext to the PostgreSQL database. Note that raw tokens transit Redis in job payloads during BullMQ email queue delivery; whether these payloads touch disk depends on the underlying Redis snapshotting/append-only file configuration (RDB/AOF), so disk-level persistence guarantees apply strictly to the PostgreSQL database.

> **Related Architectural Decisions:** See [Data Access, ORM & Transactions ADRs](./Engineering-Decisions.md#data-access-orm--transactions) for UUIDv7 selection rationale, foreign key cascade policies, and unique constraint error handling.

---

## 4. End-to-End Core System Flows

### 4.1 Primary Authentication & Token Refresh Flow

The standard authentication lifecycle pairs short-lived access JWTs with database-backed refresh tokens governed by atomic Compare-And-Swap (CAS) rotation and an ephemeral Redis leeway cache:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    Note over Client, Redis: Phase 1 — Standard Login (MFA Disabled)
    Client->>API: POST /auth/login { email, password }
    API->>DB: findUserByEmail(email)
    API->>API: Verify Argon2id password hash (or dummy verify on miss)
    API->>DB: createSession(UUIDv7 sid, SHA-256 tokenHash)
    API-->>Client: 200 OK + Set-Cookie: accessToken (15m, path="/"), refreshToken (30d, path="/")

    Note over Client, Redis: Phase 2 — Authenticated Request
    Client->>API: GET /auth/me (accessToken cookie)
    API->>API: Verify access JWT signature and claims (sub, sid, role)
    API->>Redis: GET role:permissions:USER
    alt Cache Miss
        Redis-->>API: null
        API->>DB: Query permissions for role
        API->>Redis: SETEX role:permissions:USER 86400 [...]
    else Cache Hit
        Redis-->>API: ["profile.read", "profile.update"]
    end
    API->>API: Attach req.auth context { userId, role, sid, permissions }
    API-->>Client: 200 OK { success: true, data: userProfile }

    Note over Client, Redis: Phase 3 — Refresh Token Rotation (CAS + Bounded Cache Retry)
    Client->>API: POST /auth/refresh-token (refreshToken cookie)
    API->>API: Verify refresh JWT and compute SHA-256 oldTokenHash
    API->>Redis: GET auth:refresh-leeway:{sid}:{oldTokenHash}
    opt Leeway Cache Hit (Recent Rotation Grace Period)
        Redis-->>API: Cached AuthTokens
        API->>DB: findSessionById(sid) (Validate active session persistence)
        alt Active Session Exists
            API-->>Client: 200 OK (Return synchronized token pair)
        else Session Revoked/Purged
            API->>Redis: DEL auth:refresh-leeway:{sid}:{oldTokenHash} (Purge dead leeway cache)
            API-->>Client: 401 Unauthorized ("Invalid session")
        end
    end

    API->>DB: findSessionById(sid) and verify ownership
    API->>DB: Atomic CAS: rotateSession(id=sid, tokenHash=oldTokenHash)
    alt CAS Succeeded (Winner)
        API->>Redis: SET auth:refresh-leeway:{sid}:{oldTokenHash} (EX 30s)
        API-->>Client: 200 OK + Set-Cookie (Rotated token pair)
    else CAS Failed (Loser / Concurrent Contention)
        API->>Redis: GET auth:refresh-leeway:{sid}:{oldTokenHash}
        opt Cache Miss on First Check (Publication Lag)
            API->>API: Bounded sleep (150ms backoff)
            API->>Redis: GET auth:refresh-leeway:{sid}:{oldTokenHash}
        end
        alt Cached Tokens Retrieved (Concurrent Win)
            API-->>Client: 200 OK (Return winner's cached token pair)
        else Cache Still Empty or Redis Unavailable (Replay Breach)
            alt Replay Deletion Mode is GLOBAL
                API->>DB: deleteAllSessionsByUserId(userId) (Revoke all active sessions)
            else Replay Deletion Mode is SESSION
                API->>DB: deleteSessionById(sid) (Revoke compromised session)
            end
            API-->>Client: 401 Unauthorized ("Compromised session detected")
        end
    end
```

> **Related Architectural Decisions:** See [Authentication & Session Management ADRs](./Engineering-Decisions.md#authentication--session-management) for token rotation invariants, CAS concurrency semantics, and replay scope policies.

---

### 4.2 Multi-Factor Authentication (MFA) & Ephemeral Challenge Flow

When MFA is enabled on an account, primary credential verification yields an ephemeral 5-minute challenge token (`mfaToken`) instead of active session cookies, withholding session issuance until the second factor succeeds:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Browser
    participant API as API Server
    participant DB as PostgreSQL

    Note over Client, DB: Step 1 — Primary Authentication (First Factor)
    Client->>API: POST /auth/login { email, password }
    API->>DB: findUserByEmail(email) and verify Argon2id hash
    API->>DB: createMfaChallenge(userId, 5m TTL)
    API-->>Client: 200 OK { mfaRequired: true, mfaToken: "UUIDv7" }

    Note over Client, DB: Step 2 — Unified Second Factor Verification
    Client->>API: POST /auth/mfa/verify { mfaToken, code }
    API->>DB: findMfaChallengeById(mfaToken)
    alt Challenge Expired or Missing
        API-->>Client: 400 Bad Request ("Invalid or expired MFA challenge")
    else Challenge Valid
        alt Code matches 6-digit TOTP (totp.isTotpCode)
            API->>API: Decrypt mfaSecret (AES-256-GCM)
            API->>API: Verify TOTP time window
            API->>DB: Atomically advance mfaLastUsedWindow (Monotonic Replay Guard)
        else Code is 10-char Alphanumeric Recovery Code
            API->>API: Compute SHA-256 codeHash
            API->>DB: Atomic single-use burn: verifyAndConsumeRecoveryCode (usedAt: null to NOW)
        end
        API->>DB: deleteMfaChallenge(mfaToken)
        API->>DB: createSession(UUIDv7 sid, SHA-256 tokenHash)
        API-->>Client: 200 OK + Set-Cookie: accessToken, refreshToken
    end
```

> **Related Architectural Decisions:** See [Multi-Factor Authentication ADRs](./Engineering-Decisions.md#multi-factor-authentication-mfa) for symmetric secret encryption, monotonic replay windows, and polymorphic TOTP vs recovery code resolution.

---

### 4.3 OAuth 2.0 PKCE & Identity Resolution Architecture

AuthSphere acts strictly as an **OAuth 2.0 Client** using the **Authorization Code Flow with PKCE (RFC 7636 / RFC 9700)**, enabling federated social authentication and account linking across external identity providers (Google and GitHub):

- **Protocol Standard:** Implements the OAuth 2.0 Authorization Code Grant with Proof Key for Code Exchange (RFC 7636 / RFC 9700 PKCE using `S256`).
- **Cryptographic Binding:** The 32-byte code verifier is stored in a browser-bound, per-transaction HttpOnly cookie (`oauth_verifier_<state>`) scoped to `/api/auth/oauth` with a 10-minute TTL, isolating multi-tab authentication flows.
- **Atomic Single-Use State:** Random 32-byte CSRF state tokens are cached in Redis (`oauth:state:<state>`, 600s TTL) and consumed atomically via `GETDEL` upon callback processing to prevent replay attacks.
- **Pre-Resolution Session Gate:** If initiating linking from an authenticated state, AuthSphere validates the active session in PostgreSQL before token exchange; revoked or invalid sessions fail immediately with `401 Unauthorized`.
- **Anti-Account Takeover Guard:** Unauthenticated OAuth logins attempting to claim an existing local password-registered email are rejected with `409 Conflict`, requiring password verification before linking.
- **Provider Normalization & Trust Boundary:** User profiles are retrieved over authenticated TLS (Google via authenticated UserInfo endpoint over TLS without local ID-token signature validation against JWKS; GitHub via user emails API) and normalized into unified identity records.

For complete end-to-end sequence flows, provider attribute matrices, security invariants, and curl test scripts, refer to the authoritative specification in [OAUTH.md](./OAUTH.md).

> **Related Architectural Decisions:** See [Security, Cryptography & Credentials ADRs](./Engineering-Decisions.md#security-cryptography--credentials) for OAuth strategy patterns, atomic state invalidation, and conflict-guarded identity workflows.

---

### 4.4 Passwordless Magic Link Authentication Flow

Magic link authentication provides enumeration-safe token generation with single-use atomic consumption:

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant API as AuthSphere API
    participant DB as PostgreSQL
    participant Queue as Email Dispatcher

    Note over Client, Queue: Step 1 — Request Flow
    Client->>API: POST /auth/magic-link { email }
    API->>API: Rate Limiter (5 req / 15m) and Zod email validation
    API->>DB: findUserByEmail(email)
    alt User Exists
        API->>API: Generate 32-byte crypto token and SHA-256 digest
        API->>DB: UPSERT MagicLinkToken (userId @unique, 15m TTL)
        API->>Queue: enqueueMagicLinkEmail(rawToken, email)
    else User Not Found
        Note over API: Early return to prevent account enumeration
    end
    API-->>Client: 200 OK ("If an account exists, a magic link has been sent")

    Note over Client, DB: Step 2 — Verification & Session Issuance
    Client->>API: POST /auth/magic-link/verify { token }
    API->>API: Rate Limiter (10 req / 5m) and SHA-256 digest
    API->>DB: findMagicLinkTokenWithUser(tokenHash) (expiresAt >= NOW)
    alt Token Invalid, Expired, or Consumed
        API-->>Client: 400 Bad Request ("Invalid or expired magic link token")
    else Token Valid and MFA Enabled
        API->>DB: Atomic consume: user.update(magicLinkToken: { delete: {} })
        API->>DB: createMfaChallenge(userId, 5m TTL)
        API-->>Client: 200 OK { mfaRequired: true, mfaToken }
    else Token Valid and MFA Disabled
        API->>DB: Atomic consume: user.update(magicLinkToken: { delete: {} }, isEmailVerified: true)
        API->>DB: createSession(UUIDv7 sid, SHA-256 tokenHash)
        API-->>Client: 200 OK + Set-Cookie: accessToken, refreshToken
    end
```

> **Related Architectural Decisions:** See [Security, Cryptography & Credentials ADRs](./Engineering-Decisions.md#security-cryptography--credentials) for silent enumeration-safe returns and 1-to-1 token lifecycle guarantees.

---

### 4.5 Active Session Management & Revocation Flow

Users can inspect active login sessions across devices and revoke individual remote sessions or perform global revocation:

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant API as AuthSphere API
    participant DB as PostgreSQL

    Note over Client, DB: 1. Listing Active Sessions
    Client->>API: GET /sessions (accessToken cookie)
    API->>API: auth middleware attaches req.auth { userId, sid }
    API->>DB: findActiveSessionsByUserId(userId, expiresAt > NOW)
    API-->>Client: 200 OK [ { id, ipAddress, userAgent, createdAt, expiresAt, isCurrent } ]

    Note over Client, DB: 2. Revoking a Session
    Client->>API: DELETE /sessions/:id (accessToken cookie)
    API->>API: auth middleware and Zod UUIDv7 param validation
    API->>DB: findSessionById(sessionId)
    alt Session Not Found
        API-->>Client: 404 Not Found ("Session not found")
    else Session Belongs to Another User (session.userId !== req.auth.userId)
        API-->>Client: 403 Forbidden ("You cannot revoke another user's session")
    else Current Session Revoked (sessionId === req.auth.sid)
        API->>DB: deleteSessionById(sessionId)
        API->>DB: createSecurityEvent(LOGOUT, { isCurrentSession: true })
        API-->>Client: 200 OK + Clear Auth Cookies ("Session revoked successfully")
    else Remote Session Revoked (sessionId !== req.auth.sid)
        API->>DB: deleteSessionById(sessionId)
        API->>DB: createSecurityEvent(LOGOUT, { isCurrentSession: false })
        API-->>Client: 200 OK ("Session revoked successfully")
    end
```

> **Related Architectural Decisions:** See [Authentication & Session Management ADRs](./Engineering-Decisions.md#authentication--session-management) for hard-deletion strategies and ownership-enforced revocation.

---

### 4.6 Outbound Email Dispatch Architecture (Tri-Driver Queue)

Outbound email delivery is decoupled from the synchronous HTTP request-response cycle via a configurable tri-driver queue architecture:

```mermaid
flowchart TD
    API["API Handler (POST /auth/signup, magic-link, etc.)"] -->|"enqueueEmailJob"| Dispatcher{"QUEUE_DRIVER Switch"}

    Dispatcher -->|"Driver: bullmq"| BullMQQueue["BullMQ Queue in Redis"]
    Dispatcher -->|"Driver: inline"| EventLoop["In-Process Asynchronous setImmediate"]
    Dispatcher -->|"Driver: sync"| InBand["Synchronous Execution Guard in AWS Lambda"]

    subgraph RedisTransit ["Redis Storage Perimeter"]
        BullMQQueue
    end

    subgraph DedicatedWorker ["Dedicated Container (APP_ROLE=worker)"]
        BullMQWorker["BullMQ Worker Process"]
        EmailServiceWorker["Email Service (Template Rendering)"]
    end

    subgraph ApiProcess ["API Container / Lambda Instance"]
        EventLoop --> EmailServiceInline["Email Service (Template Rendering)"]
        InBand --> EmailServiceSync["Email Service (Awaited before response)"]
    end

    BullMQQueue -->|"Poll and Dequeue"| BullMQWorker
    BullMQWorker --> EmailServiceWorker

    EmailServiceWorker --> Gateway{"Email Provider Strategy"}
    EmailServiceInline --> Gateway
    EmailServiceSync --> Gateway

    Gateway -->|"Provider: resend"| ResendAPI["Resend HTTPS API"]
    Gateway -->|"Provider: gmail"| GmailOAuth["Gmail OAuth2 via Nodemailer"]
```

| Queue Driver | Runtime Environment                    | Delivery Characteristics                                                                                      | Failure & Retry Semantics                                                                                                     |
| :----------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| **`bullmq`** | AWS ECS Fargate / Clustered Containers | Asynchronous background offload. Completely isolates HTTP response latency from email transit.                | Up to 4 exponential retries across 5 total attempts. Failed jobs retained in dead-letter storage. Requires `APP_ROLE=worker`. |
| **`inline`** | Single-Container / Development / Demos | Asynchronous event-loop offload via `setImmediate()`. Eliminates Redis command overhead on serverless tiers.  | Ephemeral in-process execution. Jobs may be lost on unexpected container termination.                                         |
| **`sync`**   | AWS Lambda (`isLambdaRuntime`)         | Awaits email dispatch in-band before completing the Lambda handler invocation to prevent mid-flight freezing. | Bounded by Lambda invocation timeout. Delivery remains subject to network timeouts and provider errors.                       |

> **Related Architectural Decisions:** See [Observability, Reliability & Operations ADRs](./Engineering-Decisions.md#observability-reliability--operations) for queue driver migration, Lambda runtime guards, and failed-job retention policies.

---

## 5. Security & Ingress Architecture

### 5.1 Cryptographic & Credential Security Profile

| Security Domain           | Architectural Mechanism                                              | Implementation Details                                                                                                                                                                                        |
| :------------------------ | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Password Hashing**      | Argon2id with chosen benchmarked parameters                          | Parameters: 64MB memory, 3 iterations, degree of parallelism 4. Mitigates login timing differences via pre-computed dummy verification on non-existent accounts.                                              |
| **Secret Isolation**      | Dual-secret separation (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`) | Completely partitions cryptographic keys. Access tokens use short 15-minute TTLs with dynamic permission evaluation. Access secret compromise cannot forge 30-day refresh tokens or hijack database sessions. |
| **MFA Secret Encryption** | AES-256-GCM authenticated encryption at rest                         | Secrets encrypted before storage (`ivHex:authTagHex:ciphertextHex`). 32-byte key derived from `env.MFA_ENCRYPTION_KEY` using SHA-256.                                                                         |
| **Replay Protection**     | Monotonic integer window indexing                                    | Tracks `mfaLastUsedWindow` in PostgreSQL to reject TOTP re-submissions within the active 30s window and locks out preceding time steps. Single-use hashed backup recovery codes (`XXXXX-XXXXX`).              |
| **Token Cryptography**    | Native WebCrypto JOSE (HS256)                                        | Pinned to HMAC-SHA256 (`HS256`) via WebCrypto JOSE, avoiding native C++ bindings for portability across Node.js and AWS Lambda.                                                                               |

### 5.2 Ingress, Proxy & Anti-Abuse Controls

1. **Reverse Proxy Parity & Root Cookie Scoping:**
   - **Production Edge Proxy:** Configured via code-first TypeScript specification (`apps/web/vercel.ts` using `@vercel/config/v1`), rewriting `/api/:path*` to the backend. Browsers communicate strictly same-origin (`/api/*`), preserving `SameSite=Lax` cookies and eliminating CORS preflights.
   - **Development Proxy Parity:** Vite dev server mirrors the `/api` reverse proxy route identically.
   - **Root Cookie Scoping:** Authentication cookies are scoped to root `path: "/"` to ensure uniform delivery across proxy rewrites.
2. **Proxy Trust & Client IP Resolution:**
   - `TRUST_PROXY` environment variable validated and type-coerced at startup via Zod.
   - Client IP resolution relies on Express `req.ip` (`proxy-addr`), treating client attribution and IP rate limiting as proxy-derived under the ingress topology.
3. **Resource Isolation & Origin Validation:**
   - Evaluates all state-changing HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) using browser `Sec-Fetch-Site` metadata paired with normalized `Origin`/`Referer` header checking against `env.FRONTEND_URL`.
   - Fast-paths `same-origin`/`same-site` requests, blocks explicit `cross-site` mutations from untrusted origins, and rejects opaque `Origin: "null"` sandboxed iframe requests.
4. **Multi-Tiered Atomic Lua Rate Limiting:**
   - Redis-backed rate limiting using an atomic Lua script (`INCR` + conditional `EXPIRE` in 1 command via `redis.eval`), reducing Redis roundtrips by 75%.
   - Centralized `RATE_LIMIT_POLICIES` dictionary defines per-endpoint quotas. Dual-key strategy uses IP for unauthenticated routes and `userId` for authenticated routes.
   - Fail-open resilience: Redis connectivity blips bypass rate limiting transparently rather than blocking legitimate traffic.
5. **Process-Aware Environment Partitioning:**
   - Configuration schemas partition validation into `sharedConfig`, `apiConfig`, and `workerConfig` based on `APP_ROLE: api | worker`, preventing code from referencing unvalidated cross-role variables, while deployment pipelines inject only required secrets per task definition.

> **Related Architectural Decisions:** See [Security, Cryptography & Credentials ADRs](./Engineering-Decisions.md#security-cryptography--credentials) and [Validation, Middleware & Authorization ADRs](./Engineering-Decisions.md#validation-middleware--authorization) for complete cryptographic profiles, origin guards, and rate limiting specifications.

---

## 6. Infrastructure & Deployment Architecture

AuthSphere implements a **Shared Backing State, Interchangeable Compute** model. Both serverless (AWS Lambda) and containerized (AWS ECS Fargate) compute targets compile from a single TypeScript codebase and run against the exact same managed cloud backing tier:

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Tier (Edge)"]
        Browser["User Browser (React 19 SPA)"]
        VercelProxy["Vercel Edge Reverse Proxy (/api/*)<br/>Same-Origin Ingress · HttpOnly Cookies · Zero CORS"]
        Browser -->|"Same-Origin HTTPS"| VercelProxy
    end

    subgraph Compute ["Interchangeable Backend Compute Tier (AWS ap-south-1)"]
        subgraph Option1 ["Option 1: Primary Serverless Compute (AWS Lambda)"]
            FURL["Lambda Function URL<br/>Direct HTTPS Access · AuthType: NONE"]
            Lambda["AWS Lambda Function (authsphere-api)<br/>Node.js 24 · 512 MB · Single ESM Bundle"]
            FURL --> Lambda
        end

        subgraph Option2 ["Option 2: Reference Container Compute (AWS ECS Fargate)"]
            ALB["Application Load Balancer (Port 80)<br/>Public DNS · Layer 4 Security Perimeter"]
            ECS_API["authsphere-api Task (Node.js 24 Alpine)<br/>Continuous libuv Event Loop · Port 3000"]
            ECS_Worker["authsphere-worker Task (BullMQ Daemon)<br/>Optional Decoupled Background Worker"]
            ALB --> ECS_API
        end
    end

    subgraph BackingTier ["Shared Managed Cloud Backing Tier"]
        Neon["Neon Serverless PostgreSQL<br/>PgBouncer Transaction Pooling (Port 5432)"]
        Upstash["Upstash Serverless Redis<br/>TLS Encrypted (rediss://) · Atomic Lua Scripts"]
        EmailService["Transactional Email Service<br/>Google Gmail OAuth2 (Port 465) or Resend API (HTTPS)"]
    end

    VercelProxy -->|"Encrypted Upstream HTTPS"| FURL
    VercelProxy -->|"Plaintext HTTP Port 80 (Demo Leg)"| ALB

    Lambda -->|"Pooled Connection (pg.Pool max: 2)"| Neon
    Lambda -->|"Fail-Fast Atomic Lua"| Upstash
    Lambda -->|"Synchronous Delivery (QUEUE_DRIVER=sync)"| EmailService

    ECS_API -->|"Pooled Connection (pg.Pool max: 10)"| Neon
    ECS_API -->|"Persistent Connection"| Upstash
    ECS_API -->|"Inline Dispatch (QUEUE_DRIVER=inline)"| EmailService

    ECS_API -.->|"Optional: Enqueue (QUEUE_DRIVER=bullmq)"| Upstash
    ECS_Worker -.->|"Optional: Dequeue and Retries"| Upstash
    ECS_Worker -.->|"Optional: Worker Dispatch"| EmailService
```

### Key Infrastructure Invariants

1. **Dual Database Connections:** Migrations require session-scoped advisory locks (`pg_advisory_lock`) that transaction poolers do not support. CI/CD pipelines connect directly (`DATABASE_URL_DIRECT`). Runtime compute (API, Worker, Lambda) connects exclusively through the PgBouncer transaction pooler (`DATABASE_URL_POOLED` mapped to `DATABASE_URL`) with bounded socket limits (Lambda max 2, ECS max 10).
2. **Deterministic Release Sequencing:** The CI/CD release pipeline executes strictly in order: **validate -> build/package artifact -> direct database migrations -> deploy -> automated smoke test** (`/health/live`, `/health/ready`). Artifacts are built and validated before migrations touch the database schema.
3. **Container & Serverless Deployment Mechanisms:**
   - **AWS Lambda Deployments:** Compiled via `tsup` into a single tree-shaken ESM bundle (`lambda.mjs`) externalizing native C++ bindings (`argon2`), packaged with `@codegenie/serverless-express`, and deployed via AWS SAM (`sam deploy` using `template.yaml`).
   - **AWS ECS Deployments:** Multi-stage Docker image built and pushed to GitHub Container Registry (GHCR), dynamically rendered via `aws-actions/amazon-ecs-render-task-definition@v1`, and deployed via `aws-actions/amazon-ecs-deploy-task-definition@v2`.
4. **Hardened Container Runtime:** Containers run as non-root `USER node` with `dumb-init` as PID 1 to proxy signals and reap zombie child processes, bounding request draining to a 10-second graceful window.
5. **Decoupled Health Probes:** Decouples process liveness (`/health/live`, zero-I/O in-memory probe for load balancers) from dependency readiness (`/health/ready`, concurrent evaluation of PostgreSQL and Redis), preventing cascading service deregulation during temporary dependency blips.

For complete cloud configurations, SAM templates, task definitions, migration commands, and operational runbooks, refer to [DEPLOYMENT.md](./DEPLOYMENT.md).

> **Related Architectural Decisions:** See [Observability, Reliability & Operations ADRs](./Engineering-Decisions.md#observability-reliability--operations) for dual-database pooling strategy, container signal handling, and release pipeline sequencing.

---

## 7. Testing Architecture & Invariant Verification

AuthSphere enforces a hermetic, 3-layer test pyramid combining **Vitest** and **Supertest** to verify all system boundaries and security invariants without external network dependencies:

```mermaid
graph TD
    subgraph TP ["Test Pyramid Architecture"]
        E2E["Layer 3: E2E User Journeys"]
        INT["Layer 2: Critical Integration Tests"]
        UNIT["Layer 1: Focused Unit Tests"]
    end

    subgraph HI ["Hermetic Isolation"]
        TestDB[("Dedicated Test Database: authsphere_test")]
        TestRedis[("Dedicated Redis: DB Index 1")]
        EmailSpy["In-Memory Email Spy Outbox"]
        PureMemory["Pure In-Memory / Spied Mocks (Zero I/O)"]

        E2E --> TestDB
        INT --> TestDB
        E2E --> TestRedis
        INT --> TestRedis
        E2E --> EmailSpy
        INT --> EmailSpy
        UNIT -.-> PureMemory
    end
```

### Verification Philosophy

- **Layer 1: Focused Unit Tests (Zero I/O):** Pure in-memory verification of cryptographic primitives (Argon2id, AES-256-GCM, HMAC), TOTP RFC 6238 window stepping, Zod input sanitization, OpenAPI 3.1 router parity, email template rendering, BullMQ enqueue semantics, and the deterministic ADR-076 CAS vs. Redis race condition state machine (verified hermetically via method spies in `refresh-token-race.test.ts`).
- **Layer 2: Critical Integration Tests (Database & Redis DB 1):** Full-stack HTTP request lifecycles across registration, login, MFA challenge/verify/disable, OAuth strategies, active sessions, RBAC guards, rate limits, error envelopes, the live ADR-076 rotation race window, and Redis fail-open degradation (in `auth.test.ts`).
- **Layer 3: Stateful E2E User Journeys:** Multi-step workflows verifying the complete auth lifecycle (signup -> verify -> login -> refresh -> logout), multi-device session revocation, and administrative privilege elevation and demotion.
- **Deterministic Controls:** Test suites run with `fileParallelism: false` to eliminate database contention. `cleanTestState()` performs cascade truncations on user tables and flushes Redis DB 1 between tests while preserving baseline roles and permissions. Outbound emails are captured via in-memory spies with zero network calls.

For complete test execution commands, coverage thresholds, and hermetic setup patterns, refer to [TESTING.md](./TESTING.md).

> **Related Architectural Decisions:** See [Testing, Quality & Security Invariants ADRs](./Engineering-Decisions.md#testing-quality--security-invariants) for test pyramid specifications and deterministic test environment isolation.
