#!/bin/bash

# ==================== gRPC TESTING SCRIPT ====================
# Test gRPC endpoints using grpcurl

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing gRPC Endpoints${NC}\n"

# Check if grpcurl is installed
if ! command -v grpcurl &> /dev/null; then
    echo -e "${RED}❌ grpcurl not found. Installing...${NC}"
    echo "   macOS: brew install grpcurl"
    echo "   Linux: go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest"
    exit 1
fi

# Configuration
USER_SERVICE_ADDR="${USER_SERVICE_GRPC:-localhost:50051}"
PROTO_DIR="$(pwd)/proto"

echo -e "${BLUE}📡 Testing User Service at $USER_SERVICE_ADDR${NC}\n"

# Test 1: List available services
echo -e "${YELLOW}Test 1: List available services${NC}"
grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \
    "$USER_SERVICE_ADDR" list

echo -e "\n${YELLOW}Test 2: Describe UserService${NC}"
grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \
    "$USER_SERVICE_ADDR" describe user.UserService

# Test 3: GetUser
echo -e "\n${YELLOW}Test 3: GetUser (replace USER_ID with actual ID)${NC}"
echo -e "${BLUE}Command:${NC}"
echo 'grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \'
echo '  -d '"'"'{"user_id": "YOUR_USER_ID"}'"'"' \'
echo '  "$USER_SERVICE_ADDR" user.UserService/GetUser'

# Test 4: BatchGetUsers
echo -e "\n${YELLOW}Test 4: BatchGetUsers${NC}"
echo -e "${BLUE}Command:${NC}"
echo 'grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \'
echo '  -d '"'"'{"user_ids": ["USER_ID_1", "USER_ID_2"]}'"'"' \'
echo '  "$USER_SERVICE_ADDR" user.UserService/BatchGetUsers'

# Test 5: SearchCandidates
echo -e "\n${YELLOW}Test 5: SearchCandidates${NC}"
echo -e "${BLUE}Command:${NC}"
echo 'grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \'
echo '  -d '"'"'{"skills": ["React", "Node.js"], "min_aura_score": 800, "pagination": {"page": 1, "limit": 10}}'"'"' \'
echo '  "$USER_SERVICE_ADDR" user.UserService/SearchCandidates'

echo -e "\n${GREEN}✅ Test commands generated!${NC}"
echo -e "${BLUE}💡 Replace USER_ID placeholders with actual IDs from your database${NC}\n"

# Interactive test
read -p "Do you want to run a live test? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Running SearchCandidates with sample data...${NC}"
    
    grpcurl -plaintext -import-path "$PROTO_DIR" -proto user/user_service.proto \
        -d '{"pagination": {"page": 1, "limit": 5}}' \
        "$USER_SERVICE_ADDR" user.UserService/SearchCandidates || \
        echo -e "${RED}Test failed. Make sure the service is running!${NC}"
fi
