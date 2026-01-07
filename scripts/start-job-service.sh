#!/bin/bash

# ==================================================
# VerifyDev Job Service Startup Script
# ==================================================
# This script builds and starts the job service
# with all required dependencies
# ==================================================

set -e

echo "🚀 Starting VerifyDev Job Service..."
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required environment variables"
    exit 1
fi

echo "📦 Building and starting services..."
echo ""

# Build and start only the required services for job-service
docker-compose up -d --build \
    redis \
    rabbitmq \
    minio \
    job-service

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Job Service is starting up!"
echo ""
echo "📊 Service URLs:"
echo "   🔹 Job Service API: http://localhost:3004"
echo "   🔹 Health Check: http://localhost:3004/health"
echo "   🔹 Redis: localhost:6379"
echo "   🔹 RabbitMQ Admin: http://localhost:15672 (guest/guest)"
echo "   🔹 MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f job-service"
echo "   Stop all: docker-compose down"
echo "   Restart: docker-compose restart job-service"
echo ""
echo "🎯 To test the API:"
echo "   curl http://localhost:3004/health"
echo ""
