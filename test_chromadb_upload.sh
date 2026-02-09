#!/bin/bash

# Test ChromaDB Upload & Verification Script
# Usage: ./test_chromadb_upload.sh <RAG_SERVICE_URL> <PATH_TO_DOCUMENT>
# Example: ./test_chromadb_upload.sh https://tutorverse-rag.onrender.com ~/Documents/sample.pdf

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Arguments
RAG_URL="${1:-https://tutorverse-rag.onrender.com}"
DOCUMENT_PATH="${2}"

# Trim trailing slash from URL
RAG_URL="${RAG_URL%/}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}ChromaDB Upload & Verification Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Validate inputs
if [ -z "$DOCUMENT_PATH" ]; then
    echo -e "${RED}Error: Document path required${NC}"
    echo "Usage: $0 <RAG_SERVICE_URL> <DOCUMENT_PATH>"
    echo "Example: $0 https://tutorverse-rag.onrender.com ~/Documents/sample.pdf"
    exit 1
fi

if [ ! -f "$DOCUMENT_PATH" ]; then
    echo -e "${RED}Error: Document not found: $DOCUMENT_PATH${NC}"
    exit 1
fi

FILENAME=$(basename "$DOCUMENT_PATH")
FILE_SIZE=$(du -h "$DOCUMENT_PATH" | cut -f1)

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   RAG Service URL: $RAG_URL"
echo "   Document: $FILENAME"
echo "   File Size: $FILE_SIZE"
echo ""

# Step 1: Check service health
echo -e "${YELLOW}1️⃣  Checking RAG Service Health...${NC}"
if HEALTH=$(curl -s -w "\n%{http_code}" "$RAG_URL/health"); then
    STATUS=$(echo "$HEALTH" | tail -n1)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "404" ]; then
        echo -e "${GREEN}✅ Service is online (HTTP $STATUS)${NC}"
    else
        echo -e "${RED}❌ Service returned HTTP $STATUS${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Cannot reach RAG service at $RAG_URL${NC}"
    exit 1
fi
echo ""

# Step 2: List current documents
echo -e "${YELLOW}2️⃣  Listing Current Documents in Storage...${NC}"
CURRENT_DOCS=$(curl -s "$RAG_URL/educator/documents")
echo "Current documents:"
echo "$CURRENT_DOCS" | jq '.' 2>/dev/null || echo "$CURRENT_DOCS"
echo ""

# Step 3: Upload document with progress
echo -e "${YELLOW}3️⃣  Uploading Document...${NC}"
echo "This may take a few minutes depending on file size..."
echo ""

UPLOAD_RESPONSE=$(curl -s -N "$RAG_URL/educator/upload" \
    -F "file=@$DOCUMENT_PATH" \
    -w "\n%{http_code}")

# Extract HTTP status (last line)
HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

# Parse the streamed responses
DOCUMENT_ID=""
CHUNK_COUNT=""
TEXT_LENGTH=""
FILE_TYPE=""
FINAL_STATUS=""

echo "Upload progress:"
echo "$RESPONSE_BODY" | while IFS= read -r line; do
    if [ -z "$line" ]; then continue; fi
    
    # Parse JSON line
    STATUS=$(echo "$line" | jq -r '.status // empty' 2>/dev/null)
    PROGRESS=$(echo "$line" | jq -r '.progress // empty' 2>/dev/null)
    MESSAGE=$(echo "$line" | jq -r '.message // empty' 2>/dev/null)
    
    # Extract final results
    if echo "$line" | jq -e '.document_id' >/dev/null 2>&1; then
        DOCUMENT_ID=$(echo "$line" | jq -r '.document_id')
    fi
    if echo "$line" | jq -e '.chunks' >/dev/null 2>&1; then
        CHUNK_COUNT=$(echo "$line" | jq -r '.chunks')
    fi
    if echo "$line" | jq -e '.text_length' >/dev/null 2>&1; then
        TEXT_LENGTH=$(echo "$line" | jq -r '.text_length')
    fi
    if echo "$line" | jq -e '.file_type' >/dev/null 2>&1; then
        FILE_TYPE=$(echo "$line" | jq -r '.file_type')
    fi
    if echo "$line" | jq -e '.status' >/dev/null 2>&1; then
        FINAL_STATUS=$(echo "$line" | jq -r '.status')
    fi
    
    # Print progress with bar
    if [ -n "$PROGRESS" ] && [ -n "$MESSAGE" ]; then
        PERCENT=$((PROGRESS / 5))
        BAR=$(printf '%*s' $PERCENT | tr ' ' '█')
        printf "   [%-20s] %3d%% - %s\n" "$BAR" "$PROGRESS" "$MESSAGE"
    fi
done

echo ""

# Extract document ID from last line
DOCUMENT_ID=$(echo "$RESPONSE_BODY" | jq -r '.document_id // empty' 2>/dev/null | tail -n1)
FINAL_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status // empty' 2>/dev/null | tail -n1)
CHUNK_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.chunks // empty' 2>/dev/null | tail -n1)

if [ "$HTTP_STATUS" = "200" ] && [ "$FINAL_STATUS" = "complete" ]; then
    echo -e "${GREEN}✅ Upload Successful${NC}"
    echo "   Document ID: $DOCUMENT_ID"
    echo "   Chunks Created: $CHUNK_COUNT"
    echo "   Text Length: $TEXT_LENGTH"
    echo "   File Type: $FILE_TYPE"
else
    echo -e "${RED}❌ Upload Failed${NC}"
    echo "   HTTP Status: $HTTP_STATUS"
    echo "   Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Step 4: Verify vectors are stored
if [ -n "$DOCUMENT_ID" ]; then
    echo -e "${YELLOW}4️⃣  Verifying Vectors in ChromaDB...${NC}"
    
    VERIFY_RESPONSE=$(curl -s "$RAG_URL/educator/verify/$DOCUMENT_ID")
    VECTORS_STORED=$(echo "$VERIFY_RESPONSE" | jq -r '.vectorsStored // false')
    VECTOR_COUNT=$(echo "$VERIFY_RESPONSE" | jq -r '.vectorCount // 0')
    
    if [ "$VECTORS_STORED" = "true" ]; then
        echo -e "${GREEN}✅ Vectors Successfully Stored${NC}"
        echo "   Vector Count: $VECTOR_COUNT"
        echo "   Response:"
        echo "$VERIFY_RESPONSE" | jq '.' | sed 's/^/      /'
    else
        echo -e "${RED}⚠️  No vectors found in ChromaDB${NC}"
        echo "   This might indicate a storage issue"
        echo "   Response:"
        echo "$VERIFY_RESPONSE" | jq '.' | sed 's/^/      /'
    fi
else
    echo -e "${YELLOW}⚠️  Could not extract document ID for verification${NC}"
fi
echo ""

# Step 5: Check disk space (local test)
echo -e "${YELLOW}5️⃣  Disk Space Check:${NC}"
if command -v df &> /dev/null; then
    DISK_INFO=$(df -h "$(pwd)" | tail -n1)
    echo "   $DISK_INFO"
else
    echo "   (df command not available)"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. If vectors are stored ✅, quiz generation should now work"
echo "2. Upload more documents with the same script"
echo "3. Test quiz generation in the TutorVerse interface"
echo "4. Check Render dashboard for persistent disk mount at /app/chroma_db"
echo ""
