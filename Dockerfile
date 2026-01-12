# =============================================================================
# Stage 1: Base image with pnpm
# =============================================================================
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Set working directory
WORKDIR /app

# =============================================================================
# Stage 2: Install all dependencies and build
# =============================================================================
FROM base AS build

# Copy all package.json files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/ai/package.json ./packages/ai/
COPY packages/modules/package.json ./packages/modules/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build all packages and apps
RUN pnpm build

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM base AS runtime

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/ai/package.json ./packages/ai/
COPY packages/modules/package.json ./packages/modules/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from build stage
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --from=build /app/packages/telemetry/dist ./packages/telemetry/dist
COPY --from=build /app/packages/ai/dist ./packages/ai/dist
COPY --from=build /app/packages/modules/dist ./packages/modules/dist

# Copy drizzle config and migrations for runtime migrations
COPY --from=build /app/packages/db/drizzle.config.ts ./packages/db/
COPY --from=build /app/packages/db/src/migrations ./packages/db/src/migrations
# Copy both TS source and compiled JS for drizzle-kit compatibility
COPY --from=build /app/packages/db/src/schema ./packages/db/src/schema
COPY --from=build /app/packages/db/dist/schema ./packages/db/src/schema

# Change ownership to non-root user
RUN chown -R api:nodejs /app

# Switch to non-root user
USER api

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the API server
CMD ["node", "apps/api/dist/index.js"]
