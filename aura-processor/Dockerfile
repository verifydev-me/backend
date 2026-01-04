FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma and generate with correct binary target
COPY prisma ./prisma/
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

# Copy source
COPY . .

CMD ["npm", "run", "dev"]
