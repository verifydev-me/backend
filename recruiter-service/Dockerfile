# ============================================
# Recruiter Service - Production Dockerfile
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy dependencies first for caching
COPY recruiter-service/package*.json ./
RUN npm install

# Copy shared source code (for gRPC utilities)
COPY shared ./shared

# Copy proto definitions (for gRPC)
COPY proto ./proto

# Copy service source code
COPY recruiter-service ./recruiter-service


# Explicitly set workdir to service to run prisma
WORKDIR /app/recruiter-service
RUN npx prisma generate

# Build from service directory (tsconfig references ..)
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN apk add --no-cache dumb-init curl openssl

# Copy proto files for gRPC
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Copy node_modules from builder (pruned for production)
COPY --from=builder --chown=nodejs:nodejs /app/recruiter-service/node_modules ./node_modules

# Copy built dist from service directory
COPY --from=builder --chown=nodejs:nodejs /app/recruiter-service/dist ./dist

# Copy prisma from service directory
COPY --from=builder --chown=nodejs:nodejs /app/recruiter-service/prisma ./prisma

# Copy package.json
COPY --from=builder --chown=nodejs:nodejs /app/recruiter-service/package.json ./

ENV NODE_ENV=production
ENV PORT=3005

RUN npx prisma generate


USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

EXPOSE 3005 50054

CMD ["dumb-init", "node", "dist/recruiter-service/src/server.js"]
