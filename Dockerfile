# ==========================================
# Stage 1: Base & Dependencies
# ==========================================
FROM node:24-alpine AS base
WORKDIR /app

# Install native dependencies required by Prisma and Alpine libc
RUN apk add --no-cache openssl libc6-compat

# Copy root and backend workspace manifests (excluding apps/web to keep backend image lean)
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install backend dependencies across workspaces
RUN npm ci

# ==========================================
# Stage 2: Builder
# ==========================================
FROM base AS builder
WORKDIR /app

# Provide build-time fallback DATABASE_URL required for Prisma Client generation during build
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authsphere_build
ENV DATABASE_URL=${DATABASE_URL}

# Copy source trees for shared library and API
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared package first to establish type definitions and build artifacts
RUN npm run build:shared

# Generate Prisma Client and compile API + Worker
RUN npm run build -w @authsphere/api

# Remove devDependencies (including Prisma CLI) to produce a minimal runtime footprint
RUN npm prune --omit=dev

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

# Install runtime utilities (dumb-init for signal handling and PID 1 reaping)
RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production
ENV APP_ROLE=api
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PATH="/app/node_modules/.bin:${PATH}"

# Copy production dependencies and compiled outputs
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

WORKDIR /app/apps/api

# Run container as non-root user
USER node

EXPOSE 3000

# dumb-init forwards SIGTERM/SIGINT signals to Node.js processes for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]

# Default entrypoint launches API HTTP server
CMD ["node", "--enable-source-maps", "dist/server.js"]