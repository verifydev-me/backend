# VerifyDev API Gateway

Nginx-based API Gateway for all VerifyDev microservices.

## Features

- ✅ **Reverse Proxy** - Route requests to appropriate services
- ✅ **Rate Limiting** - Protect against abuse
- ✅ **CORS Handling** - Cross-origin support
- ✅ **Load Balancing** - Distribute traffic (least connections)
- ✅ **Compression** - Gzip responses
- ✅ **Security Headers** - XSS, CSRF protection
- ✅ **Health Checks** - Monitor service status
- ✅ **Error Handling** - Graceful error responses
- ✅ **SSL Ready** - HTTPS configuration template

## Routes

| Route | Service | Rate Limit |
|-------|---------|------------|
| `/api/v1/auth/*` | auth-service:3001 | 20/min |
| `/api/v1/users/*` | user-service:3002 | 100/sec |
| `/api/v1/u/*` | user-service:3002 | 100/sec (public) |
| `/api/v1/projects/*` | user-service:3002 | 100/sec |
| `/api/v1/jobs/*` | job-service:3004 | 100/sec |
| `/api/v1/applications/*` | job-service:3004 | 10/min |
| `/api/v1/recruiter/*` | recruiter-service:3005 | 100/sec |
| `/api/v1/candidates/*` | recruiter-service:3005 | 100/sec |
| `/api/v1/resumes/*` | resume-service:8003 | 100/sec |

## Usage

### With Docker Compose

```bash
docker-compose up gateway
```

### Standalone

```bash
docker build -t verifydev-gateway .
docker run -p 80:80 verifydev-gateway
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NGINX_WORKER_PROCESSES` | auto | Number of worker processes |

### SSL Setup

1. Place certificates in `ssl/` folder
2. Rename `ssl.conf.template` to `ssl.conf`
3. Update certificate paths

## Health Check

```bash
curl http://localhost/health
```

## Logs

```bash
# Access logs (JSON format)
docker logs verifydev-gateway

# Error logs
docker exec verifydev-gateway cat /var/log/nginx/error.log
```
