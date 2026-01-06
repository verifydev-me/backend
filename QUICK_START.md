# 🚀 Quick Start Guide - VerifyDev Platform

## Prerequisites

- Docker Desktop installed and running
- Git
- Node.js 20+ (for local development)
- Minimum 4GB RAM available for Docker

## Option 1: Start Only Job Service (Fastest)

Perfect for testing just the job portal features:

```bash
# From project root
./scripts/start-job-service.sh
```

This starts:
- ✅ Job Service (Port 3004)
- ✅ Redis (Port 6379)
- ✅ RabbitMQ (Port 5672, Admin: 15672)
- ✅ MinIO (Port 9000, Console: 9001)

**Test it:**
```bash
curl http://localhost:3004/health
```

## Option 2: Start Complete Platform (All Services)

For full platform with all features:

```bash
# From project root
./scripts/start-all-services.sh
```

This starts:
- ✅ API Gateway (Nginx)
- ✅ Auth Service
- ✅ User Service
- ✅ Job Service
- ✅ Recruiter Service
- ✅ Aura Processor
- ✅ Project Analyzer (Go)
- ✅ Resume Service (Go)
- ✅ All infrastructure (Redis, RabbitMQ, MinIO)

**Test it:**
```bash
curl http://localhost/health
curl http://localhost:3004/api/v1/jobs
```

## Option 3: Manual Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Gateway | http://localhost | API Gateway (Nginx) |
| Auth | http://localhost:3001 | Authentication & OAuth |
| User | http://localhost:3002 | User profiles & data |
| Job | http://localhost:3004 | **Job portal APIs** |
| Recruiter | http://localhost:3005 | Recruiter management |
| Analyzer | http://localhost:8001 | Project analysis (Go) |
| Resume | http://localhost:8003 | Resume generation (Go) |
| RabbitMQ Admin | http://localhost:15672 | Message queue (guest/guest) |
| MinIO Console | http://localhost:9001 | Object storage (minioadmin/minioadmin) |
| Frontend | http://localhost:5173 | React app (dev mode) |

## Job Service API Endpoints

### Jobs
- `GET /api/v1/jobs` - List all jobs
- `POST /api/v1/jobs` - Create job (recruiter)
- `GET /api/v1/jobs/:id` - Get job details
- `PATCH /api/v1/jobs/:id` - Update job
- `POST /api/v1/jobs/:id/publish` - Publish job
- `POST /api/v1/jobs/:id/close` - Close job
- `DELETE /api/v1/jobs/:id` - Delete job
- `GET /api/v1/jobs/:id/stats` - Job statistics
- `POST /api/v1/jobs/:id/save` - Bookmark job

### Applications
- `POST /api/v1/applications` - Apply to job
- `GET /api/v1/applications/my-applications` - User's applications
- `GET /api/v1/applications/:id` - Application details
- `PATCH /api/v1/applications/:id/status` - Update status
- `POST /api/v1/applications/:id/notes` - Add recruiter notes
- `POST /api/v1/applications/:id/withdraw` - Withdraw application
- `GET /api/v1/applications/job/:jobId` - Applications for job

### Interviews
- `POST /api/v1/interviews` - Schedule interview
- `GET /api/v1/interviews/:id` - Interview details
- `GET /api/v1/interviews/upcoming` - Upcoming interviews
- `POST /api/v1/interviews/:id/confirm` - Confirm interview
- `POST /api/v1/interviews/:id/reschedule` - Reschedule
- `POST /api/v1/interviews/:id/cancel` - Cancel interview
- `POST /api/v1/interviews/:id/complete` - Mark completed
- `POST /api/v1/interviews/:id/feedback` - Add feedback

### Messages
- `POST /api/v1/messages` - Send message
- `GET /api/v1/messages/inbox` - Get inbox
- `GET /api/v1/messages/sent` - Sent messages
- `GET /api/v1/messages/conversation/:userId` - Conversation
- `POST /api/v1/messages/:id/read` - Mark as read
- `GET /api/v1/messages/unread-count` - Unread count

## Useful Commands

```bash
# View logs for specific service
docker-compose logs -f job-service

# Restart a service
docker-compose restart job-service

# Rebuild and restart
docker-compose up -d --build job-service

# Stop everything
docker-compose down

# Clean up (removes volumes)
docker-compose down -v

# Check service status
docker-compose ps

# Access service shell
docker exec -it verifydev-job sh
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3004
lsof -i :3004

# Kill the process
kill -9 <PID>
```

### Service Won't Start
```bash
# Check logs
docker-compose logs job-service

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache job-service
docker-compose up -d job-service
```

### Database Connection Issues
- Verify MongoDB Atlas connection string in `.env`
- Check network connectivity
- Ensure IP whitelist is configured in MongoDB Atlas

### Prisma Issues
```bash
# Regenerate Prisma client
cd job-service
npx prisma generate --schema=prisma/job-schema.prisma
```

## Environment Variables

Required in `.env`:

```bash
# MongoDB (Atlas)
MONGODB_CONNECTION_STRING=mongodb+srv://...

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# JWT Secrets
JWT_ACCESS_SECRET=supersecretaccesskey32characters!
JWT_REFRESH_SECRET=supersecretrefreshkey32characters
```

## Next Steps

1. ✅ Start the services using one of the scripts above
2. ✅ Access frontend at http://localhost:5173
3. ✅ Test job APIs using curl or Postman
4. ✅ Check RabbitMQ admin at http://localhost:15672
5. ✅ Monitor logs with `docker-compose logs -f`

## 🎉 You're Ready!

The complete job portal backend is now running with:
- Smart matching algorithm
- Interview scheduling
- In-platform messaging
- Application tracking
- Job bookmarking
- Privacy controls

Happy coding! 🚀
