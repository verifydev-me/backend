#!/bin/bash

# ==================== PROTO CODE GENERATION SCRIPT ====================
# Generates TypeScript code from Protocol Buffer definitions

set -e

echo "🔄 Generating gRPC code from proto files..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo -e "${RED}❌ protoc not found. Please install Protocol Buffer compiler:${NC}"
    echo "   macOS: brew install protobuf"
    echo "   Linux: apt-get install protobuf-compiler"
    exit 1
fi

# Check if grpc_tools_node_protoc is installed
if ! command -v grpc_tools_node_protoc &> /dev/null; then
    echo -e "${BLUE}📦 Installing grpc-tools...${NC}"
    npm install -g grpc-tools
fi

# Paths
PROTO_DIR="$(pwd)/proto"
SERVICES=("user-service" "job-service" "recruiter-service" "auth-service")

echo -e "${BLUE}📁 Proto directory: $PROTO_DIR${NC}"

# Generate code for each service
for SERVICE in "${SERVICES[@]}"; do
    if [ -d "$SERVICE" ]; then
        echo -e "${BLUE}🔨 Generating code for $SERVICE...${NC}"
        
        OUTPUT_DIR="$SERVICE/src/generated"
        mkdir -p "$OUTPUT_DIR"
        
        # Generate JavaScript code
        grpc_tools_node_protoc \
            --js_out=import_style=commonjs,binary:"$OUTPUT_DIR" \
            --grpc_out=grpc_js:"$OUTPUT_DIR" \
            --plugin=protoc-gen-grpc=$(which grpc_tools_node_protoc_plugin) \
            -I "$PROTO_DIR" \
            "$PROTO_DIR"/**/*.proto
        
        # Generate TypeScript definitions
        grpc_tools_node_protoc \
            --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
            --ts_out=grpc_js:"$OUTPUT_DIR" \
            -I "$PROTO_DIR" \
            "$PROTO_DIR"/**/*.proto
        
        echo -e "${GREEN}✅ Generated code for $SERVICE${NC}"
    else
        echo -e "${RED}⚠️  Service directory $SERVICE not found, skipping...${NC}"
    fi
done

echo -e "${GREEN}✅ All proto files compiled successfully!${NC}"
