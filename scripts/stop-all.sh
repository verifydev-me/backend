#!/bin/bash

# Stop all services
echo "Stopping all services..."

if [ -f logs/auth.pid ]; then kill $(cat logs/auth.pid) 2>/dev/null; fi
if [ -f logs/user.pid ]; then kill $(cat logs/user.pid) 2>/dev/null; fi
if [ -f logs/job.pid ]; then kill $(cat logs/job.pid) 2>/dev/null; fi
if [ -f logs/recruiter.pid ]; then kill $(cat logs/recruiter.pid) 2>/dev/null; fi

# Kill any remaining node processes on our ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:3004 | xargs kill -9 2>/dev/null
lsof -ti:3005 | xargs kill -9 2>/dev/null

rm -f logs/*.pid

echo "✅ All services stopped"
