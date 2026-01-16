FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/

# Environment
ENV NODE_ENV=production
ENV PORT=3008

EXPOSE 3008

CMD ["node", "dist/server.js"]
