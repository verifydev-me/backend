# 🚀 VerifyDev Job Service - Docker Commands

## Build and Start Commands

### Option 1: Quick Start (Recommended)
```bash
# From project root
cd /Users/keshavsharma/verifybackend

# Start infrastructure + job service
docker-compose up -d --build redis rabbitmq minio job-service

# Wait for services to be healthy (30 seconds)
sleep 30

# Check status
docker-compose ps

# View logs
docker-compose logs -f job-service
```

### Option 2: Step by Step

```bash
# 1. Start infrastructure
docker-compose up -d redis rabbitmq minio

# 2. Build job service
docker-compose build job-service

# 3. Start job service
docker-compose up -d job-service

# 4. Check logs
docker-compose logs -f job-service
```

### Option 3: Start Everything

```bash
# Start all services
docker-compose up -d --build

# This starts:
# - Gateway (Nginx)
# - Auth, User, Job, Recruiter services
# - Project Analyzer, Resume Service
# - Redis, RabbitMQ, MinIO
```

## Verify Services Are Running

```bash
# Check all running containers
docker-compose ps

# Health check
curl http://localhost:3004/health

# Expected response:
# {"status":"ok","service":"job-service","timestamp":"..."}
```

## View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f job-service

# Last 100 lines
docker-compose logs --tail=100 job-service
```

## Restart Service

```bash
# Restart job service
docker-compose restart job-service

# Rebuild and restart
docker-compose up -d --build job-service
```

## Stop Services

```bash
# Stop all
docker-compose down

# Stop but keep volumes
docker-compose stop

# Clean everything (including volumes)
docker-compose down -v
```

## Troubleshooting

### Build Fails

```bash
# Clean build
docker-compose down
docker-compose build --no-cache job-service
docker-compose up -d job-service
```

### Port Already in Use

```bash
# Check what's using port 3004
lsof -i :3004

# Or use docker-compose to check
docker-compose ps
```

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs job-service

# Access container shell
docker exec -it verifydev-job sh

# Inside container, check Prisma
npx prisma generate --schema=prisma/job-schema.prisma
```

### Database Connection Issues

```bash
# Verify environment variable
docker exec verifydev-job env | grep DATABASE_URL

# Should show MongoDB connection string
```

## Development Mode

The job service is configured to run in development mode with:
- Hot reload enabled
- Source maps
- Detailed error messages
- Volume mounting for live code changes

To make changes:
1. Edit files in `./job-service/src/`
2. Service will auto-reload
3. Check logs: `docker-compose logs -f job-service`

## Test API

```bash
# Health check
curl http://localhost:3004/health

# List jobs (requires auth token)
curl http://localhost:3004/api/v1/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create job (requires auth)
curl -X POST http://localhost:3004/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Senior Backend Developer",
    "description": "We are looking for...",
    "requirements": "5+ years experience",
    "responsibilities": "Design and build APIs",
    "type": "FULL_TIME",
    "level": "SENIOR",
    "location": "Remote",
    "isRemote": true,
    "requiredSkills": [
      {"skillName": "Node.js", "minScore": 80, "isRequired": true},
      {"skillName": "MongoDB", "minScore": 70, "isRequired": true}
    ],
    "minAuraScore": 500,
    "salaryMin": 100000,
    "salaryMax": 150000,
    "salaryCurrency": "USD"
  }'
```

## Service URLs

| Service | URL | Port |
|---------|-----|------|
| Job Service API | http://localhost:3004 | 3004 |
| Redis | localhost | 6379 |
| RabbitMQ | amqp://localhost | 5672 |
| RabbitMQ Admin | http://localhost:15672 | 15672 |
| MinIO API | http://localhost:9000 | 9000 |
| MinIO Console | http://localhost:9001 | 9001 |

## Environment Variables

Set in `.env`:

```bash
# MongoDB
MONGODB_CONNECTION_STRING=mongodb+srv://...

# JWT
JWT_ACCESS_SECRET=supersecretaccesskey32characters!
JWT_REFRESH_SECRET=supersecretrefreshkey32characters
```

## Quick Reference

```bash
# Build
docker-compose build job-service

# Start
docker-compose up -d job-service

# Restart
docker-compose restart job-service

# Logs
docker-compose logs -f job-service

# Stop
docker-compose stop job-service

# Remove
docker-compose down

# Clean rebuild
docker-compose down && docker-compose up -d --build job-service
```

## 🎯 Ready to Go!

Your job service is now containerized and ready to run with Docker Compose!
