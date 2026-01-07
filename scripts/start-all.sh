#!/bin/bash

# ============================================
# VerifyDev - Start All Services
# ============================================

echo "🚀 Starting VerifyDev Services..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Start Auth Service
echo -e "${BLUE}Starting Auth Service on :3001...${NC}"
cd auth-service && npm run dev > ../logs/auth.log 2>&1 &
AUTH_PID=$!
cd ..

# Start User Service
echo -e "${BLUE}Starting User Service on :3002...${NC}"
cd user-service && npm run dev > ../logs/user.log 2>&1 &
USER_PID=$!
cd ..

# Start Job Service
echo -e "${BLUE}Starting Job Service on :3004...${NC}"
cd job-service && npm run dev > ../logs/job.log 2>&1 &
JOB_PID=$!
cd ..

# Start Recruiter Service
echo -e "${BLUE}Starting Recruiter Service on :3005...${NC}"
cd recruiter-service && npm run dev > ../logs/recruiter.log 2>&1 &
RECRUITER_PID=$!
cd ..

# Save PIDs
echo "$AUTH_PID" > logs/auth.pid
echo "$USER_PID" > logs/user.pid
echo "$JOB_PID" > logs/job.pid
echo "$RECRUITER_PID" > logs/recruiter.pid

echo ""
echo -e "${GREEN}✅ All services starting...${NC}"
echo ""
echo "Services:"
echo "  Auth Service:      http://localhost:3001 (PID: $AUTH_PID)"
echo "  User Service:      http://localhost:3002 (PID: $USER_PID)"
echo "  Job Service:       http://localhost:3004 (PID: $JOB_PID)"
echo "  Recruiter Service: http://localhost:3005 (PID: $RECRUITER_PID)"
echo ""
echo "Logs: ./logs/"
echo "Stop: ./scripts/stop-all.sh"
