# AuthSphere

Production-grade Authentication & Authorization Platform.

---

## Documentation

- [System Architecture & Design](./docs/ARCHITECTURE.md) — Topology, component boundaries, database ERD, and core sequence flows.
- [Architecture Decision Records (ADR)](./docs/Engineering-Decisions.md) — Comprehensive log of 67 architectural decisions, security trade-offs, and technical rationale.
- [OAuth 2.0 Reference](./docs/OAUTH.md) — Identity resolution matrix, anti-replay state verification, and provider integrations.

---

## Monorepo Structure

```text
authsphere/
├── apps/
│   ├── api/       # Express.js REST API (Node.js >22, TypeScript, Prisma 7)
│   └── web/       # React & Vite frontend application
├── packages/
│   └── shared/    # Domain constants (ROLES, PERMISSIONS) & shared types
├── docker/        # Development infrastructure (PostgreSQL, Redis)
└── docs/          # Architecture, ADRs, and OAuth documentation
```

---

## Quickstart

### 1. Prerequisites

- Node.js >= 22
- Docker & Docker Compose
- npm >= 10

### 2. Start Infrastructure

```bash
docker compose -f docker/docker-compose.infra.yml up -d
```

### 3. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp apps/api/.env.example apps/api/.env
```

### 4. Database Setup & Seeding

```bash
# Generate Prisma Client & apply database migrations
npx --prefix apps/api prisma migrate dev

# Seed default roles (USER, ADMIN) and permissions
npx --prefix apps/api prisma db seed
```

### 5. Start Development Servers

```bash
# Start API service
npm run dev --workspace=@authsphere/api

# Start Web application
npm run dev --workspace=@authsphere/web
```
