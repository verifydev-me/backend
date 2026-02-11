FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git + gcc/musl-dev (needed for CGO / tree-sitter)
RUN apk add --no-cache git gcc musl-dev

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Build with CGO enabled (required for go-tree-sitter)
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o analyzer ./cmd/main.go

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
