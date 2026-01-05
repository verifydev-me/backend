FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o resume-service ./cmd/main.go

# Production with Chrome for PDF generation
FROM alpine:latest

WORKDIR /app

# Install Chrome for PDF generation
RUN apk add --no-cache chromium chromium-chromedriver ca-certificates

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

COPY --from=builder /app/resume-service .
COPY --from=builder /app/assets ./assets

EXPOSE 8003

CMD ["./resume-service"]
