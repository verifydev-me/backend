# ============================================
# Job Service - Production Dockerfile
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY prisma ./prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN apk add --no-cache dumb-init curl openssl

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3004

RUN npx prisma generate --schema=prisma/schema.prisma

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

EXPOSE 3004

CMD ["dumb-init", "node", "dist/server.js"]
