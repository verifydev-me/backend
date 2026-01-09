# ============================================
# Auth Service - Production Dockerfile
# ============================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune devDependencies after build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling and openssl for Prisma
RUN apk add --no-cache dumb-init curl openssl

# Copy built assets
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Regenerate Prisma client for Alpine Linux
RUN npx prisma generate

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "-r", "module-alias/register", "dist/server.js"]


