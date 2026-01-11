#!/bin/bash
# ============================================
# VerifyDev Gateway Health Check Script
# ============================================

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost}"

echo "🔍 Checking Gateway Health..."

# Check Gateway
if curl -sf "$GATEWAY_URL/health" > /dev/null; then
    echo "✅ Gateway: Healthy"
else
    echo "❌ Gateway: Unhealthy"
    exit 1
fi

# Check Services through Gateway
services=(
    "/api/v1/auth/health:Auth"
    "/api/v1/users/health:User"
    "/api/v1/jobs/health:Job"
    "/api/v1/recruiter/health:Recruiter"
    "/api/v1/resumes/health:Resume"
)

for service in "${services[@]}"; do
    path="${service%%:*}"
    name="${service##*:}"
    
    if curl -sf "$GATEWAY_URL$path" > /dev/null 2>&1; then
        echo "✅ $name Service: Healthy"
    else
        echo "⚠️  $name Service: Unavailable"
    fi
done

echo ""
echo "🎉 Health check complete!"
