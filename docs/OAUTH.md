# AuthSphere OAuth 2.0 — Architecture & Flow Reference

> Comprehensive technical reference for AuthSphere's OAuth 2.0 implementation covering Google and GitHub provider integrations.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [OAuth Flow Sequence](#2-oauth-flow-sequence)
3. [Phase 1 — Initiation](#3-phase-1--initiation)
4. [Phase 2 — External Consent](#4-phase-2--external-consent)
5. [Phase 3 — State Verification & Profile Exchange](#5-phase-3--state-verification--profile-exchange)
6. [Phase 4 — Identity Resolution Matrix](#6-phase-4--identity-resolution-matrix)
7. [Phase 5 — MFA Challenge or Session Issuance](#7-phase-5--mfa-challenge-or-session-issuance)
8. [Provider-Specific Behavior](#8-provider-specific-behavior)
9. [File Reference Map](#9-file-reference-map)
10. [Security Properties & ADR Cross-References](#10-security-properties--adr-cross-references)

---

## 1. System Overview

AuthSphere supports two OAuth 2.0 authorization-code flows:

| Provider | Initiation Endpoint      | Callback Endpoint                 |
| :------- | :----------------------- | :-------------------------------- |
| Google   | `GET /auth/oauth/google` | `GET /auth/oauth/google/callback` |
| GitHub   | `GET /auth/oauth/github` | `GET /auth/oauth/github/callback` |

Both flows share the same state management, identity resolution, session issuance, and cookie delivery infrastructure. Only the provider strategy layer (authorization URL construction, token exchange, and profile normalization) differs.

**Participants:**

| Component             | Role                                                                    |
| :-------------------- | :---------------------------------------------------------------------- |
| **Client (Browser)**  | Initiates flow, receives redirect, carries cookies                      |
| **AuthSphere API**    | Orchestrates state, exchanges codes, resolves identity, issues sessions |
| **Redis**             | Stores ephemeral OAuth state tokens (10-minute TTL)                     |
| **External Provider** | Authenticates user, returns authorization code and profile data         |
| **PostgreSQL**        | Persists `User`, `OAuthAccount`, `Session` records                      |

---

## 2. OAuth Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser
    participant API as AuthSphere API
    participant Redis as Redis
    participant Provider as Google / GitHub
    participant DB as PostgreSQL

    Note over Client, Provider: Phase 1 — Initiation
    Client->>API: GET /auth/oauth/:provider (may carry accessToken cookie)
    API->>API: optionalAuth: extract userId if logged in
    API->>Redis: SET oauth:state:&lt;hex&gt; {provider, userId?} EX 600
    API-->>Client: 302 Redirect → Provider authorization URL

    Note over Client, Provider: Phase 2 — External Consent
    Client->>Provider: User authenticates and grants consent
    Provider-->>Client: 302 Redirect → /auth/oauth/:provider/callback?code=…&state=…

    Note over API, DB: Phase 3 — State Verification & Profile Exchange
    Client->>API: GET /auth/oauth/:provider/callback?code=…&state=…
    API->>Redis: GETDEL oauth:state:&lt;hex&gt; (atomic single-use consumption)
    Redis-->>API: {provider, userId?} or null (→ 400)
    API->>Provider: POST token endpoint (exchange code for access_token)
    Provider-->>API: access_token
    API->>Provider: GET userinfo / user + emails endpoint
    Provider-->>API: Profile data

    Note over API, DB: Phase 4 — Identity Resolution
    API->>DB: SELECT OAuthAccount WHERE (provider, providerId)
    alt Existing OAuthAccount
        API->>API: Resolve linked user
    else No OAuthAccount + userId in state
        API->>DB: INSERT OAuthAccount (link to existing user)
    else No OAuthAccount + no userId + email matches existing user
        API-->>Client: 409 Conflict
    else No OAuthAccount + no userId + new email
        API->>DB: INSERT User + OAuthAccount (atomic)
    end

    Note over API, Client: Phase 5 — MFA Challenge or Session Issuance
    alt User has MFA enabled (user.mfaEnabled === true)
        API->>DB: INSERT MfaChallenge (UUIDv7 mfaToken, 5m TTL)
        API-->>Client: 200 OK { mfaRequired: true, mfaToken } (Client completes via /auth/mfa/verify)
    else User has MFA disabled
        API->>DB: INSERT Session (UUIDv7, tokenHash, ip, userAgent, expiresAt)
        API-->>Client: Set-Cookie: accessToken, refreshToken (httpOnly) + 200 OK
    end
```

---

## 3. Phase 1 — Initiation

**Route:** `GET /auth/oauth/google` or `GET /auth/oauth/github`

**Middleware pipeline:** `optionalAuth` → controller

### 3.1 Optional Authentication Detection

The `optionalAuth` middleware (`apps/api/src/middlewares/auth.ts`) inspects `req.cookies.accessToken`:

- **Token present and valid**: Decodes JWT, populates `req.auth = { userId, role, sessionId, permissions }`. This signals an **account-linking flow** — the user is already logged in and wants to connect a social account.
- **Token absent or invalid**: `req.auth` remains `undefined`. This signals an **unauthenticated login/signup flow**.
- Unlike `auth` middleware, `optionalAuth` never throws — invalid tokens are silently ignored.

### 3.2 State Token Generation

`createOAuthState()` (`apps/api/src/modules/auth/oauth/oauth.service.ts`):

1. Generates **32 bytes of cryptographic randomness** via `crypto.randomBytes(32).toString("hex")` → 64-character hex string.
2. Serializes the payload: `{ provider: "GOOGLE" | "GITHUB", userId?: string }`.
3. Stores in Redis at key `oauth:state:<hex>` with `EX 600` (10-minute TTL).

The `userId` field is present only during account-linking flows.

### 3.3 Authorization URL Construction

The provider strategy (`google.provider.ts` or `github.provider.ts`) builds the full authorization URL:

**Google:**

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<GOOGLE_CLIENT_ID>
  &redirect_uri=<OAUTH_CALLBACK_BASE_URL>/google/callback
  &response_type=code
  &scope=openid email profile
  &state=<hex>
  &access_type=offline
  &prompt=select_account
```

**GitHub:**

```
https://github.com/login/oauth/authorize
  ?client_id=<GITHUB_CLIENT_ID>
  &redirect_uri=<OAUTH_CALLBACK_BASE_URL>/github/callback
  &scope=read:user user:email
  &state=<hex>
```

### 3.4 Redirect

The controller responds with `res.redirect(authorizationUrl)` (HTTP 302), sending the browser to the external provider.

---

## 4. Phase 2 — External Consent

This phase happens entirely outside AuthSphere:

1. The browser navigates to the provider's consent screen.
2. The user authenticates (or selects an existing session) and approves the requested scopes.
3. The provider redirects the browser back to AuthSphere's callback endpoint:
   ```
   GET /auth/oauth/:provider/callback?code=<authorization_code>&state=<state_token>
   ```

AuthSphere has no control over this phase. The `state` parameter is the only mechanism binding this redirect to the original initiation request.

---

## 5. Phase 3 — State Verification & Profile Exchange

**Route:** `GET /auth/oauth/google/callback` or `GET /auth/oauth/github/callback`

### 5.1 Anti-Replay State Verification

`consumeOAuthState()` performs an **atomic fetch-and-delete** via `redis.getDel(key)`:

- **Key exists**: Returns the parsed `OAuthStateData` and atomically deletes the key. The state can never be consumed again.
- **Key missing** (expired or replayed): Throws `400 Bad Request`.
- **Provider mismatch** (e.g., state created for GOOGLE but consumed on GITHUB callback): Throws `400 Bad Request`.

This single Redis command (`GETDEL`) eliminates any race condition between concurrent callback attempts.

### 5.2 Authorization Code Exchange

The provider strategy exchanges the authorization code for an access token via a server-to-server POST:

|                    | Google                                                                                | GitHub                                               |
| :----------------- | :------------------------------------------------------------------------------------ | :--------------------------------------------------- |
| **Token endpoint** | `https://oauth2.googleapis.com/token`                                                 | `https://github.com/login/oauth/access_token`        |
| **Content-Type**   | `application/x-www-form-urlencoded`                                                   | `application/x-www-form-urlencoded`                  |
| **Accept**         | `application/json`                                                                    | `application/json`                                   |
| **Body params**    | `code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code` | `code`, `client_id`, `client_secret`, `redirect_uri` |

Error responses are logged internally via Pino (`logger.error`) and never exposed to the client. The API returns a generic `"Google/GitHub authorization failed"` message.

### 5.3 Profile Retrieval & Email Verification

**Google:**

1. Fetches `https://openidconnect.googleapis.com/v1/userinfo` with the access token.
2. Enforces `email_verified === true` — rejects unverified Google emails.
3. Uses `sub` (OpenID Connect subject identifier) as `providerId`.

**GitHub:**

1. Fetches `https://api.github.com/user` for profile data (id, name, avatar).
2. **Always** fetches `https://api.github.com/user/emails` to resolve a verified email — the `/user` endpoint does not expose verification status, so the public email cannot be trusted alone.
3. Selects email by priority: primary + verified → any verified → reject with `400`.
4. Uses `String(id)` (GitHub's numeric user ID) as `providerId`.

### 5.4 Profile Normalization

Both providers produce the same `OAuthProfile`:

```typescript
{
  providerId: string,  // Google sub or GitHub id (stringified)
  email: string,       // Lowercase, trimmed, verified
  firstName: string | null,
  lastName: string | null,
  avatarUrl: string | null
}
```

---

## 6. Phase 4 — Identity Resolution Matrix

The service layer (`handleOAuthCallback` in `oauth.service.ts`) processes the normalized profile through a deterministic resolution matrix:

```
                    ┌──────────────────────────────┐
                    │  Query OAuthAccount           │
                    │  (provider, providerId)        │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────┴──────────┐
                  FOUND              NOT FOUND
                    │                    │
            ┌───────┴───────┐    ┌───────┴────────┐
            │ state.userId  │    │  state.userId   │
            │ present AND   │    │  present?       │
            │ differs from  │    └───────┬─────────┘
            │ linked user?  │        ┌───┴───┐
            └───────┬───────┘      YES     NO
                    │               │       │
               409 Conflict    Link to   ┌──┴──────┐
               (already       existing   │ Email    │
                linked to     user       │ exists   │
                another)                 │ in DB?   │
                                         └──┬──────┘
                                         ┌──┴──┐
                                        YES   NO
                                         │     │
                                    409       Create
                                  Conflict    User +
                                  (require    OAuthAccount
                                   password   (atomic)
                                   login +
                                   link)
```

### Resolution Cases

| Case                         | Conditions                                                              | Action                                                                                                                                                                 |
| :--------------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Returning OAuth User** | `OAuthAccount(provider, providerId)` exists                             | Authenticate the linked user. If `state.userId` is present and differs from the linked user → `409 Conflict`.                                                          |
| **B1 — Account Linking**     | No `OAuthAccount`, `state.userId` present                               | Create `OAuthAccount(userId, provider, providerId)` linking to the authenticated user.                                                                                 |
| **B2 — Email Conflict**      | No `OAuthAccount`, no `state.userId`, existing user with matching email | **409 Conflict**. The user must log in with their password and link the account explicitly. This is a critical security boundary against pre-housing account takeover. |
| **B3 — New User Signup**     | No `OAuthAccount`, no `state.userId`, no existing user                  | Atomically create `User` (`isEmailVerified: true`, `verifiedAt: NOW`, `passwordHash: null`) + `OAuthAccount`.                                                          |

---

## 7. Phase 5 — MFA Challenge or Session Issuance

After identity resolution, AuthSphere determines whether secondary authentication is required:

### 7.1 MFA-Enabled Users (`user.mfaEnabled === true`)

If the user has multi-factor authentication enabled on their account (and this is not an in-session account linking flow):

1. **MFA Challenge Token**: Creates an ephemeral `MfaChallenge` record (`mfaToken` UUIDv7) with a 5-minute TTL via `authRepository.createMfaChallenge`.
2. **Challenge Response**: Returns HTTP `200 OK` with `{ mfaRequired: true, mfaToken: challenge.id }` and message `"MFA verification required to complete login"`.
3. **Completion**: The client prompts for the second factor and posts to `POST /auth/mfa/verify` using `mfaToken` and the 6-digit TOTP code or backup recovery code to receive final session cookies.

### 7.2 Standard Users (MFA Disabled or In-Session Linking)

If MFA is not enabled (or during in-session account linking):

1. **Session Record**: Creates a `Session` row in PostgreSQL with UUIDv7 id, hashed refresh token, IP address, user agent, and 30-day expiration via `generateAuthTokensAndSession()`.
2. **Access Token**: Signs a 15-minute JWT containing `{ sub: userId, sid: sessionId, role: roleName }`.
3. **Refresh Token**: Signs a 30-day JWT with the same claims.
4. **HTTP-Only Cookies**: `setAuthCookies()` sets:
   - `accessToken` on path `/` (15m `maxAge`, `httpOnly`, `secure` in production, `sameSite: lax`)
   - `refreshToken` on path `/auth` (30d `maxAge`, same security flags)
5. **JSON Response**: Returns `200 OK` with `ApiResponse.success(res, null, "Authenticated successfully via ... OAuth")`.

---

## 8. Provider-Specific Behavior

### 8.1 Google

| Aspect                     | Detail                                                       |
| :------------------------- | :----------------------------------------------------------- |
| **Authorization endpoint** | `https://accounts.google.com/o/oauth2/v2/auth`               |
| **Token endpoint**         | `https://oauth2.googleapis.com/token`                        |
| **Profile endpoint**       | `https://openidconnect.googleapis.com/v1/userinfo`           |
| **Scopes**                 | `openid email profile`                                       |
| **Provider ID source**     | `sub` (OIDC subject identifier)                              |
| **Email verification**     | `email_verified === true` enforced at provider layer         |
| **Name parsing**           | `given_name` / `family_name`, falls back to splitting `name` |

### 8.2 GitHub

| Aspect                     | Detail                                                                                             |
| :------------------------- | :------------------------------------------------------------------------------------------------- |
| **Authorization endpoint** | `https://github.com/login/oauth/authorize`                                                         |
| **Token endpoint**         | `https://github.com/login/oauth/access_token`                                                      |
| **Profile endpoint**       | `https://api.github.com/user`                                                                      |
| **Email endpoint**         | `https://api.github.com/user/emails`                                                               |
| **Scopes**                 | `read:user user:email`                                                                             |
| **Provider ID source**     | `String(id)` (GitHub's stable numeric user ID)                                                     |
| **Email verification**     | Always fetches `/user/emails`; selects primary+verified, then any verified. Rejects if none found. |
| **Name parsing**           | `name` field split on space, falls back to `login`                                                 |
| **User-Agent header**      | `AuthSphere-API` (required by GitHub API)                                                          |

---

## 9. File Reference Map

```
apps/api/src/
├── config/
│   └── env.ts                           # Zod schema: GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, OAUTH_CALLBACK_BASE_URL
├── middlewares/
│   └── auth.ts                          # auth (required) + optionalAuth (pass-through) middlewares
└── modules/auth/
    ├── auth.route.ts                    # Mounts GET /oauth/google[/callback], GET /oauth/github[/callback]
    ├── auth.openapi.ts                  # OpenAPI 3.1 specifications for OAuth initiate and callback endpoints
    ├── auth.repository.ts               # findOAuthAccount, createUserWithOAuthAccount, createOAuthAccount
    ├── auth.service.ts                  # generateAuthTokensAndSession (shared session helper)
    └── oauth/
        ├── oauth.types.ts               # OAuthStateData, OAuthProfile, OAuthProviderStrategy interfaces
        ├── oauth.service.ts             # createOAuthState, consumeOAuthState, initiateOAuth, handleOAuthCallback
        ├── oauth.controller.ts          # initiateOAuthHandler & oauthCallbackHandler factory functions
        ├── google.provider.ts           # GoogleOAuthProvider implements OAuthProviderStrategy
        └── github.provider.ts           # GitHubOAuthProvider implements OAuthProviderStrategy
```

---

## 10. Security Properties & ADR Cross-References

| Property                           | Mechanism                                                                                       | Authoritative Decision |
| :--------------------------------- | :---------------------------------------------------------------------------------------------- | :--------------------- |
| **Provider-Agnostic Architecture** | Unified `OAuthProviderStrategy` interface with normalized `OAuthProfile` DTO                    | `[ADR-059]`            |
| **CSRF Prevention**                | 32-byte cryptographic state token bound to Redis with 10-minute TTL                             | `[ADR-060]`            |
| **State Replay Prevention**        | `redis.getDel()` atomic single-use state consumption with provider validation                   | `[ADR-060]`            |
| **Account Takeover Prevention**    | Email-matching existing users are never auto-linked during unauthenticated flows (409 Conflict) | `[ADR-061]`            |
| **Identity Stability**             | Google `sub` (OIDC) and GitHub numeric `id` used as immutable `providerId`                      | `[ADR-059, ADR-061]`   |
| **Email Verification Enforcement** | Google: `email_verified === true`. GitHub: always queries `/user/emails` for verified status    | `[ADR-062]`            |
| **Controller Decoupling**          | Higher-order controller factories eliminate route boilerplate while retaining explicit exports  | `[ADR-063]`            |
| **Rate Limiting Protection**       | Dedicated `OAUTH_INITIATE` (20/1m) and `OAUTH_CALLBACK` (20/1m) IP-based rate limiting          | `[ADR-051, ADR-066]`   |
| **Information Leakage Prevention** | Provider HTTP errors logged via Pino internally; clients receive generic status codes           | `[ADR-008, ADR-009]`   |
| **Session & Cookie Transport**     | Standard AuthSphere session with HTTP-only, secure, SameSite=Lax cookies                        | `[ADR-033, ADR-042]`   |
| **Provider Credential Isolation**  | Client secrets validated via Zod schema at startup; never exposed to browser clients            | `[ADR-003, ADR-004]`   |
