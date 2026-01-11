# ============================================
# Aura Processor - Production Dockerfile
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN apk add --no-cache dumb-init openssl

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

ENV NODE_ENV=production

RUN npx prisma generate

USER nodejs

CMD ["dumb-init", "node", "dist/index.js"]
