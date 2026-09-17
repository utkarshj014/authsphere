# ==========================================
# Stage 1: Base & Dependencies
# ==========================================
FROM node:22-alpine AS base
WORKDIR /app

# Install native dependencies required by Prisma and Alpine libc
RUN apk add --no-cache openssl libc6-compat

# Copy workspace configuration and manifests for cached dependency installation
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install all dependencies across workspaces
RUN npm ci

# ==========================================
# Stage 2: Builder
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy source trees for shared library and API
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared package first to establish type definitions and build artifacts
RUN npm run build:shared

# Generate Prisma Client and compile API + Worker
RUN npm run build -w @authsphere/api

# Remove devDependencies to produce a minimal runtime footprint
RUN npm prune --omit=dev

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime utilities (dumb-init for signal handling and PID 1 reaping)
RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production

# Run container as non-root user
USER node

# Copy production dependencies and compiled outputs
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/apps/api/prisma.config.js ./apps/api/prisma.config.js
COPY --chown=node:node --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 4000

# dumb-init forwards SIGTERM/SIGINT signals to Node.js processes for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]

# Default entrypoint launches API HTTP server
CMD ["node", "--enable-source-maps", "dist/server.js"]
