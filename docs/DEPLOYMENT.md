# Cloud Deployment & DevOps Guide — AuthSphere

This document specifies the deployment architectures, infrastructure strategies, configuration standards, and operational workflows for AuthSphere across serverless (AWS Lambda), containerized (AWS ECS Fargate), and edge (Vercel) environments.

---

## 1. High-Level Architecture Overview

AuthSphere implements a decoupled architecture: an edge-hosted Single-Page Application (SPA) frontend, two distinct backend compute deployment models, and managed serverless cloud data services.

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (Vercel — Edge Reverse Proxy)"]
        UI["React 19 SPA (apps/web)"]
        Proxy["Vercel Edge Rewrite Proxy<br/>(/api/*)"]
        UI -->|Same-Origin /api/*| Proxy
    end

    subgraph Data ["Managed Cloud Data Services"]
        Neon["Neon Serverless PostgreSQL<br/>(Pooled Port 5432)"]
        Upstash["Upstash Serverless Redis<br/>(Rate Limiting, State & Leeway Cache)"]
        Resend["Resend API<br/>(Transactional Email Service)"]
    end

    subgraph ComputeOptions ["Backend Compute Architectures"]
        direction TB
        subgraph Serverless ["Primary Serverless Architecture: AWS Lambda + Function URL"]
            FURL["Lambda Function URL<br/>(Native Free Dual-Stack HTTPS Ingress)"]
            Lambda["Lambda Function (authsphere-api)<br/>(Node 24, Serverless Express, Awaited Email)"]
            FURL --> Lambda
        end

        subgraph Container ["Reference Container Architecture: AWS ECS Fargate"]
            ALB["Application Load Balancer"]
            ECS_API["authsphere-api Container<br/>(Express 5 REST API)"]
            ECS_Worker["authsphere-worker Container<br/>(BullMQ Background Queue Daemon)"]
            ALB --> ECS_API
        end
    end

    Proxy -->|HTTPS Proxy Bridge| FURL
    Proxy -->|HTTPS Proxy Bridge| ALB

    Lambda --> Neon
    Lambda --> Upstash
    Lambda -->|Synchronous Delivery| Resend

    ECS_API --> Neon
    ECS_API --> Upstash
    ECS_API -.->|Variant 1a: Enqueue| Upstash
    ECS_Worker -->|Variant 1a: Dequeue| Upstash
    ECS_Worker -->|Variant 1a: Dispatch| Resend
    ECS_API -.->|Variant 1b Toggle: Inline| Resend
```

### Compute Model Comparison

| Dimension                     | Serverless (AWS Lambda + Function URL)                                                | Containers (AWS ECS Fargate)                                                                       |
| :---------------------------- | :------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------- |
| **Operational Model**         | Automated scale-to-zero serverless                                                    | Long-running container tasks                                                                       |
| **Idle Infrastructure Cost**  | **$0.00 / month** (Function URL has no gateway charge; uses serverless free tier)     | Continuous Fargate compute allocation + ALB hourly charges                                         |
| **Email Processing Strategy** | Synchronous delivery within request lifecycle (`QUEUE_DRIVER=sync`)                   | Decoupled queue worker (`QUEUE_DRIVER=bullmq`) or inline (`QUEUE_DRIVER=inline`)                   |
| **HTTPS Endpoint**            | Native HTTPS via Lambda Function URL (`.lambda-url.<region>.on.aws`)                  | ALB provides HTTP; HTTPS requires custom domain + ACM certificate                                  |
| **Request Timeout**           | Handled directly by Lambda function without an intermediate API Gateway proxy timeout | Subject to ALB idle timeout configuration                                                          |
| **Infrastructure as Code**    | AWS SAM template ([infra/lambda/template.yaml](../infra/lambda/template.yaml))        | ECS Task Definitions ([infra/ecs/api-task-definition.json](../infra/ecs/api-task-definition.json)) |
| **Engineering Value**         | Serverless Express adapter, socket management, cold-start connection reuse            | Container lifecycle, signal forwarding, decoupled worker architecture                              |

---

## 2. Serverless Architecture: AWS Lambda + Function URL

### 2.1. Runtime Mechanics

AuthSphere separates the Express application definition ([apps/api/src/app.ts](../apps/api/src/app.ts)) from HTTP server binding ([apps/api/src/server.ts](../apps/api/src/server.ts)). On AWS Lambda, the application is invoked via `@codegenie/serverless-express` in [apps/api/src/lambda.ts](../apps/api/src/lambda.ts).

#### Core Technical Mechanics:

1. **Direct Function URL Ingress:**
   Lambda Function URLs provide native HTTPS endpoints directly on the function without needing an API Gateway resource or separate per-request gateway fee.
2. **Standardized Node 24 Runtime:** Operates on `nodejs24.x` across serverless, container builds, and CI workflows.
3. **Event Loop Non-Blocking Teardown:**
   ```ts
   // apps/api/src/lambda.ts
   context.callbackWaitsForEmptyEventLoop = false;
   ```
   PostgreSQL and Redis maintain persistent TCP keepalive connections. Setting `callbackWaitsForEmptyEventLoop = false` allows Lambda to freeze the container and finish the invocation immediately when the HTTP response is sent, preventing functions from hanging until timeout.
4. **Connection Initialization & Degradation:**
   Prisma and Redis clients initialize outside the request handler and persist across warm invocations. Connections are warmed safely:
   - If Redis is temporarily unreachable during startup, initialization continues. Rate limiting fails open and permissions fall back to database queries.
   - If PostgreSQL is temporarily unreachable during startup, initialization still completes. Non-database endpoints (like `/health/live`) continue working, while database-dependent endpoints return structured 500/503 errors.
5. **Synchronous Email Delivery on Lambda (`QUEUE_DRIVER=sync`):**
   Because Lambda pauses execution when the HTTP response completes, background tasks (such as `setImmediate`) cannot run reliably after the response. Setting `QUEUE_DRIVER=sync` ensures emails are awaited via Resend during the request before returning the response.

### 2.2. Scale-Out Roadmap: Amazon SQS + Worker Lambda

For high-volume serverless environments requiring decoupled queuing, the cloud-native serverless equivalent of the BullMQ worker daemon is **Amazon SQS + Event-Driven Consumer Lambda**:

```mermaid
flowchart LR
    API["Express API Lambda"] -->|1. sqs.sendMessage| SQS["Amazon SQS FIFO/Standard"]
    API -->|2. HTTP 201 Created| Client["Client Browser"]
    SQS -->|3. Event Source Trigger| WorkerLambda["Email Consumer Lambda"]
    WorkerLambda -->|4. Dispatch Email| Resend["Resend API"]
```

- **Scale-to-Zero:** SQS costs $0 when empty; the consumer Lambda executes only for the duration of the email dispatch call.
- **Native Retries:** Utilizes AWS Dead-Letter Queues (DLQ) and native exponential backoff without requiring running daemon infrastructure.

### 2.3. Initial Setup & Infrastructure Bootstrapping

Deployments are executed via GitHub Actions CI/CD or the AWS Web Console, requiring **no local AWS CLI installation**.

#### Step 1: Database Migration & Baseline RBAC Seeding

Run once against production Neon before launching the application:

```bash
# 1. Apply schema migrations via direct (unpooled) Neon connection
DATABASE_URL="<NEON_DIRECT_CONNECTION_STRING>" npm run db:migrate:deploy --workspace=@authsphere/api

# 2. Seed baseline system roles (USER, ADMIN) and permissions
DATABASE_URL="<NEON_DIRECT_CONNECTION_STRING>" npm run db:seed --workspace=@authsphere/api
```

#### Step 2: Automated Deployment via GitHub Actions or SAM

Configure GitHub Repository Secrets (`production` environment):

- `DATABASE_URL_PRODUCTION`: Pooled Neon connection URL
- `REDIS_URL_PRODUCTION`: Upstash Redis connection URL
- `AWS_DEPLOY_ROLE_ARN`: AWS IAM OIDC Role ARN

SAM builds the Lambda ZIP artifact from `apps/api` (no Docker required for production serverless) and deploys the stack:

```bash
sam deploy --stack-name authsphere-serverless --capabilities CAPABILITY_IAM
```

_Note the output `FunctionUrl` URL (e.g. `https://<url-id>.lambda-url.ap-south-1.on.aws/`)._

---

## 3. Reference Container Architecture: AWS ECS Fargate

### 3.1. Architectural Variants

#### Variant 1a: Clustered Enterprise Standard (API + Standalone BullMQ Worker)

- **Producer–Consumer Separation:** The API container handles incoming HTTP requests and enqueues email tasks to Redis. Responses return without waiting for third-party email API roundtrips.
- **Failure Isolation:** Outbound email delivery interruptions or provider rate limits do not block HTTP connections or exhaust database connection pools.
- **Retry Resilience:** BullMQ executes with up to 4 exponential backoff retries across 5 total delivery attempts (delays: 2s, 4s, 8s, 16s via `delay: 2000`) and stores failed jobs in retention storage for operational diagnosis.
- **Independent Scaling:** API tasks scale based on HTTP request concurrency and ALB target group CPU; Worker tasks scale independently based on Redis queue depth (`authsphere-email`).

#### Variant 1b: Pragmatic Cost-Saving Toggle (Single-Container Inline)

- Set `QUEUE_DRIVER=inline` in the API container environment.
- Set the worker ECS service task count to `0`.
- The API dispatches jobs asynchronously in-process via `setImmediate()` directly to Resend.
- **Cost Impact:** Eliminates dedicated worker compute and stops continuous BullMQ Redis polling on Upstash.

### 3.2. Docker Image & Lean Container Design

The production container build ([Dockerfile](../Dockerfile)) uses a multi-stage Alpine pipeline:

```mermaid
flowchart LR
    Base["Stage 1: Base<br/>(node:24-alpine, libc6, openssl)"] --> Builder["Stage 2: Builder<br/>(Generate Prisma & tsc compile)"]
    Builder --> Prune["npm prune --omit=dev<br/>(Strip Prisma CLI development binary)"]
    Prune --> Runner["Stage 3: Runner<br/>(dumb-init PID 1, non-root user)"]
```

#### Container Engineering Highlights:

1. **Build-Time Prisma Compilation:** Prisma Client is generated and compiled into JavaScript during Stage 2 (`npm run build -w @authsphere/api`). The final runner stage receives pre-compiled native JavaScript, meaning **zero client generation overhead on container startup** and zero runtime dependency on the heavy `prisma` CLI development package.
2. **Frontend Isolation:** `apps/web` is excluded via [.dockerignore](../.dockerignore), ensuring frontend dependencies (`framer-motion`, `tailwindcss`, Vite) never enter the backend image.
3. **Signal Forwarding & PID 1 Reaping:** Utilizes `dumb-init` as the container entrypoint to correctly propagate `SIGTERM` and `SIGINT` signals for graceful Express and Redis termination.
4. **External Health Checks:** ALB Target Groups evaluate container health over HTTP at `/health/live`. In-container Docker `HEALTHCHECK` polling is omitted to conserve vCPU cycles on minimal 0.25 vCPU Fargate tasks.

### 3.3. Networking Topology

- **VPC:** 1 VPC spanning at least 2 Availability Zones (`ap-south-1a`, `ap-south-1b`).
- **Subnets:**
  - Public Subnets (2x): Host the Internet-Facing Application Load Balancer (ALB).
  - Private Subnets (2x): Host ECS Fargate tasks (`authsphere-api` and `authsphere-worker`).
- **Security Groups (Stateful Traffic):**
  - `ALB-SG`: Ingress HTTP (80) from `0.0.0.0/0`. AWS Security Groups are stateful; return traffic to browsers is automatically allowed.
  - `ECS-API-SG`: Ingress TCP 3000 restricted to `ALB-SG`. Return traffic to the ALB is automatically tracked. Egress `0.0.0.0/0` allows outbound HTTPS (443) calls to Neon, Upstash, and Resend.
  - `ECS-Worker-SG`: Zero inbound ingress required. Egress `0.0.0.0/0` allows outbound HTTPS (443) calls to Upstash and Resend.

### 3.4. Initial Setup & Infrastructure Bootstrapping (ECS Fargate)

To deploy the reference container architecture, initialize the foundational AWS resources once:

#### Step 1: Create ECS Cluster & IAM Roles

- Create an ECS cluster named `authsphere-cluster`.
- Create an ECS task execution role (`ecsTaskExecutionRole`) granting permissions to pull images from GHCR/ECR and read SSM parameters.

#### Step 2: Configure ALB & Target Group

- Create an Application Load Balancer in public subnets with `ALB-SG`.
- Create a Target Group (target type: IP, protocol: HTTP, port: 3000, health check path: `/health/live`).
- Add a listener forwarding port 80 to the target group.

#### Step 3: Register Task Definitions & Create Services

- Register the task definitions from [infra/ecs/api-task-definition.json](../infra/ecs/api-task-definition.json) and [infra/ecs/worker-task-definition.json](../infra/ecs/worker-task-definition.json).
- Create the `authsphere-api` service in private subnets, attaching it to the ALB target group (desired tasks: 1).
- (Optional for Variant 1a) Create the `authsphere-worker` service in private subnets without load balancer attachment (desired tasks: 1).

Subsequent deployments are handled automatically by GitHub Actions when `DEPLOY_TARGET=ecs`.

---

## 4. Frontend Deployment: Vercel Edge Reverse Proxy

When deploying the frontend on Vercel and the backend on an AWS endpoint without a shared custom domain, standard cross-origin setups encounter strict browser security boundaries. AuthSphere resolves these through Vercel's Edge Reverse Proxy:

### 4.1. Browser Security Resolution Matrix

| Security Dimension             | Cross-Origin Direct Challenge                                                                                           | Vercel Edge Reverse Proxy Solution                                                                                                                                                |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTPS Mixed Content**        | Default AWS ALB DNS provides plain HTTP. Modern browsers block insecure HTTP requests initiated from an HTTPS frontend. | Vercel terminates SSL on the frontend origin. The edge proxy rewrites `/api/*` to the backend without triggering mixed-content blocks.                                            |
| **Cookie Privacy & Isolation** | Browsers treat disparate origins as third-party contexts, restricting ambient cookie sharing.                           | Requests route to `https://<project>.vercel.app/api/*`. Cookies remain strictly **first-party same-origin**, operating reliably under `SameSite=Lax`.                             |
| **CORS & Preflight Latency**   | Cross-origin requests trigger browser `OPTIONS` preflight roundtrips, adding roundtrip latency to API calls.            | Because requests are same-origin, browser preflight `OPTIONS` requests are completely eliminated.                                                                                 |
| **CSRF Defense**               | Relying on `SameSite=None; Secure` increases exposure across ambient cross-site contexts.                               | Preserves `SameSite=Lax` protection. AuthSphere's [originValidation](../apps/api/src/middlewares/origin-validation.ts) middleware verifies `sec-fetch-site` and `origin` headers. |

### 4.2. Vercel Configuration ([apps/web/vercel.json](../apps/web/vercel.json))

Point the destination URL in `apps/web/vercel.json` to your backend Lambda Function URL or ALB endpoint:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://<lambda-url-id>.lambda-url.ap-south-1.on.aws/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4.3. GitOps Deployment Workflow

1. In the Vercel dashboard, connect your GitHub repository and set the **Root Directory** to `apps/web`.
2. Ensure `apps/web/vercel.json` points to your active backend endpoint.
3. Every push to `main` automatically triggers an optimized production build and deployment on Vercel.

---

## 5. Managed Cloud Data Strategy

### 5.1. Neon PostgreSQL: Connection Pooling Architecture

Neon serverless PostgreSQL enforces distinct connection modes depending on the execution context:

- **Runtime Compute (AWS Lambda / ECS Fargate):**
  - **Connection String:** Configured with the **Pooled Connection Host** (contains `-pooler`, e.g. `postgresql://user:pass@ep-xyz-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require`).
  - **Purpose:** Neon's PgBouncer proxy pools transactional connections across concurrent Lambda invocations and container instances, preventing connection exhaustion. With Prisma 7 and `@prisma/adapter-pg`, legacy `?pgbouncer=true` flags are not required.
- **Database Migrations (CI/CD / CLI):**
  - **Connection String:** Configured with the **Direct Connection Host** (without `-pooler`, e.g. `postgresql://user:pass@ep-xyz.ap-south-1.aws.neon.tech/neondb?sslmode=require`).
  - **Purpose:** Prisma migration operations (`prisma migrate deploy`) require session-level advisory locks and transactional DDL that PgBouncer transaction pooling does not support.

### 5.2. Upstash Redis: Operational Profile & Command Budget

- **Responsibilities:** Powers sliding-window rate limiting, OAuth 2.0 PKCE state verification, token leeway grace periods, and BullMQ queue transport.
- **Background Bleed Elimination:** Under the Primary Serverless Architecture (Lambda) or Variant 1b (Inline), BullMQ polling loops are inactive, completely eliminating the continuous background command consumption of idle queue polling.
- **Active Traffic Command Scaling:** Active API requests consume atomic Redis commands for sliding-window rate limiting, RBAC permission lookup caching, and refresh token leeway verification, scaling strictly with incoming request volume rather than elapsed time.

---

## 6. Unified Environment Variable & Secrets Reference

All environment variables follow a unified schema validated at startup via Zod in [apps/api/src/config/env.ts](../apps/api/src/config/env.ts):

| Variable                            | Target Location                | Classification            | Description                                                                             |
| :---------------------------------- | :----------------------------- | :------------------------ | :-------------------------------------------------------------------------------------- |
| `NODE_ENV`                          | Task Definition / SAM Globals  | Plain Text                | Application mode (`development`, `production`, `test`)                                  |
| `APP_ROLE`                          | Task Definition / SAM Globals  | Plain Text                | Process role (`api` or `worker`)                                                        |
| `QUEUE_DRIVER`                      | Task Definition / SAM Globals  | Plain Text                | Delivery mode (`bullmq`, `inline`, `sync`)                                              |
| `PORT`                              | Task Definition / SAM Globals  | Plain Text                | API listening port (default: `3000`)                                                    |
| `HOST`                              | Task Definition / SAM Globals  | Plain Text                | API listening host (default: `0.0.0.0`)                                                 |
| `TRUST_PROXY`                       | Task Definition / SAM Globals  | Plain Text                | Reverse proxy hop trust (`true`, `false`, or subnet list)                               |
| `JWT_ACCESS_EXPIRES_IN`             | Task Definition / SAM Globals  | Plain Text                | Access token expiration duration (default: `15m`)                                       |
| `JWT_REFRESH_EXPIRES_IN`            | Task Definition / SAM Globals  | Plain Text                | Refresh token expiration duration (default: `30d`)                                      |
| `AUTH_REUSE_DELETION_MODE`          | Task Definition / SAM Globals  | Plain Text                | Refresh token compromise policy (`SESSION` or `GLOBAL`)                                 |
| `AUTH_REFRESH_TOKEN_LEEWAY_SECONDS` | Task Definition / SAM Globals  | Plain Text                | Multi-tab refresh concurrency grace window (default: `30`)                              |
| `DATABASE_URL`                      | SAM Parameters / Secrets / SSM | `SecureString`            | PostgreSQL connection string (pooled for runtime)                                       |
| `REDIS_URL`                         | SAM Parameters / Secrets / SSM | `SecureString`            | Redis connection URL                                                                    |
| `FRONTEND_URL`                      | SAM Parameters / Secrets / SSM | `String`                  | Base URL of frontend application (e.g. `https://<project>.vercel.app`)                  |
| `JWT_ACCESS_SECRET`                 | SAM Parameters / Secrets / SSM | `SecureString`            | Cryptographic secret for signing access JWTs                                            |
| `JWT_REFRESH_SECRET`                | SAM Parameters / Secrets / SSM | `SecureString`            | Cryptographic secret for signing refresh JWTs                                           |
| `MFA_ENCRYPTION_KEY`                | SAM Parameters / Secrets / SSM | `SecureString`            | AES-256-GCM symmetric key for MFA secrets at rest (min 16 chars)                        |
| `RESEND_API_KEY`                    | SAM Parameters / Secrets / SSM | `SecureString`            | Resend service API key                                                                  |
| `EMAIL_FROM`                        | SAM Parameters / Secrets / SSM | `String`                  | Sender address (use `AuthSphere <onboarding@resend.dev>` for zero-cost sandbox testing) |
| `GOOGLE_CLIENT_ID` / `_SECRET`      | SAM Parameters / Secrets / SSM | `String` / `SecureString` | Google OAuth 2.0 PKCE credentials                                                       |
| `GITHUB_CLIENT_ID` / `_SECRET`      | SAM Parameters / Secrets / SSM | `String` / `SecureString` | GitHub OAuth 2.0 PKCE credentials                                                       |
| `OAUTH_CALLBACK_BASE_URL`           | SAM Parameters / Secrets / SSM | `String`                  | OAuth callback base URL (`https://<project>.vercel.app/api/auth/oauth`)                 |
| `VITE_API_URL`                      | `apps/web/.env`                | Client-Exposed            | Web client API target (leave empty for Vite proxy / Vercel Edge proxy)                  |

---

## 7. Continuous Integration & Deployment (GitHub Actions)

AuthSphere includes two automated workflows in `.github/workflows/`:

### 7.1. Quality CI Workflow ([.github/workflows/ci.yml](../.github/workflows/ci.yml))

Triggered on push to `dev`/`main` and pull requests to `main`:

1. Spawns isolated service containers: PostgreSQL 16 Alpine and Redis 8 Alpine.
2. Installs dependencies via `npm ci` on Node 24.
3. Executes monorepo typecheck across all workspaces (`npm run typecheck`).
4. Applies Prisma migrations against the test database (`npm run db:migrate:deploy --workspace=@authsphere/api`). Baseline RBAC roles and permissions are seeded automatically by the test setup lifecycle (`ensureBaselineSeed()`).
5. Executes the comprehensive test suite across all modules (`npm test`).
6. Compiles production build artifacts across all workspaces (`npm run build`).
7. Tests Docker container buildability using Docker Buildx.

### 7.2. Release & Deploy Workflow ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml))

Triggered on push to `main`:

1. Runs full test verification and builds container images.
2. Pushes container image to GitHub Container Registry (`ghcr.io/<owner>/backend:<sha>`).
3. Assumes AWS IAM deployment role via OpenID Connect (OIDC) (`aws-actions/configure-aws-credentials`).
4. Applies production database migrations against Neon (`DATABASE_URL_PRODUCTION`) to synchronize relational schema with application models. Initial system role seeding is performed once during initial bootstrapping (or idempotently re-run via `prisma/seed.ts` when adding new permissions).
5. **Deployment Target Dispatch (`DEPLOY_TARGET` Toggle):**
   - **Default / Serverless (`DEPLOY_TARGET != 'ecs'`):** Deploys the primary serverless stack via AWS SAM (`sam deploy --no-confirm-changeset`) targeting AWS Lambda + Function URL.
   - **Reference Containers (`DEPLOY_TARGET == 'ecs'`):** Renders ECS task definitions with the newly published GHCR image tag and deploys to Amazon ECS Fargate services (`authsphere-api` and `authsphere-worker`).

---

## 8. Local Development Quickstart

### 8.1. Start Infrastructure

```bash
# Start local PostgreSQL 16 and Redis 8 containers
docker compose -f docker/docker-compose.dev.yml up -d
```

_(Alternatively, configure `DATABASE_URL` and `REDIS_URL` in `apps/api/.env` to point to existing local instances or cloud services)._

### 8.2. Configure Environment Files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 8.3. Database Migrations & Initial Seeding

```bash
# Apply schema migrations to local database
npm run db:migrate:deploy --workspace=@authsphere/api

# Seed baseline system roles (USER, ADMIN) and permissions
npm run db:seed --workspace=@authsphere/api
```

### 8.4. Start Development Servers

```bash
# 1. Start Express REST API (port 3000)
npm run dev --workspace=@authsphere/api

# 2. (Optional) Start BullMQ Email Worker (when QUEUE_DRIVER=bullmq)
npm run dev:email-worker --workspace=@authsphere/api

# 3. Start Vite React Frontend (port 5173 with /api proxy to port 3000)
npm run dev --workspace=@authsphere/web
```
