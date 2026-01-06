#!/bin/bash

# ==================================================
# VerifyDev Complete Platform Startup Script
# ==================================================
# Builds and starts ALL services including:
# - Infrastructure (Redis, RabbitMQ, MinIO)
# - Backend Services (Auth, User, Job, Recruiter, Aura)
# - Go Services (Project Analyzer, Resume Service)
# - API Gateway (Nginx)
# ==================================================

set -e

echo "🚀 Starting Complete VerifyDev Platform..."
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Load environment variables
source .env

echo "📦 Building and starting all services..."
echo "   This may take a few minutes on first run..."
echo ""

# Build and start all services
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
echo "   This may take 30-60 seconds..."
sleep 30

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ All Services are starting up!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SERVICE URLS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 API Gateway:"
echo "   → HTTP: http://localhost"
echo "   → Health: http://localhost/health"
echo ""
echo "🔐 Backend Services:"
echo "   → Auth Service: http://localhost:3001"
echo "   → User Service: http://localhost:3002"
echo "   → Job Service: http://localhost:3004"
echo "   → Recruiter Service: http://localhost:3005"
echo ""
echo "🔧 Go Services:"
echo "   → Project Analyzer: http://localhost:8001"
echo "   → Resume Service: http://localhost:8003"
echo ""
echo "💾 Infrastructure:"
echo "   → Redis: localhost:6379"
echo "   → RabbitMQ: amqp://localhost:5672"
echo "   → RabbitMQ Admin: http://localhost:15672"
echo "      Username: guest"
echo "      Password: guest"
echo "   → MinIO Console: http://localhost:9001"
echo "      Username: minioadmin"
echo "      Password: minioadmin"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 USEFUL COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   View all logs:"
echo "   $ docker-compose logs -f"
echo ""
echo "   View specific service logs:"
echo "   $ docker-compose logs -f job-service"
echo ""
echo "   Stop all services:"
echo "   $ docker-compose down"
echo ""
echo "   Restart a service:"
echo "   $ docker-compose restart job-service"
echo ""
echo "   Rebuild a service:"
echo "   $ docker-compose up -d --build job-service"
echo ""
echo "   Check service status:"
echo "   $ docker-compose ps"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TEST API ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   # Health checks"
echo "   curl http://localhost/health"
echo "   curl http://localhost:3004/health"
echo ""
echo "   # List jobs (requires auth)"
echo "   curl http://localhost:3004/api/v1/jobs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Platform is ready! Happy coding!"
echo ""
