FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git (needed for go-git)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o analyzer ./cmd/main.go

# Production image
FROM alpine:latest

WORKDIR /app

# Install git (needed for cloning repos)
RUN apk add --no-cache git ca-certificates

# Create temp directory for cloning
RUN mkdir -p /tmp/repos

# Copy binary
COPY --from=builder /app/analyzer .

EXPOSE 8001

CMD ["./analyzer"]
