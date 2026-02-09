#!/bin/bash

# Upload local documents to Render.com persistent disk

RAG_URL="https://tutorverse-rag.onrender.com"
DOCS_DIR="RAG18Nov2025-1/data/input"

echo "========================================"
echo "Migrate Local ChromaDB to Render"
echo "========================================"
echo ""
echo "Configuration:"
echo "  RAG Service: $RAG_URL"
echo "  Documents Dir: $DOCS_DIR"
echo ""

# Check if directory exists
if [ ! -d "$DOCS_DIR" ]; then
    echo "Error: Directory not found: $DOCS_DIR"
    exit 1
fi

# Count documents
COUNT=$(find "$DOCS_DIR" -type f | wc -l)

echo "Found $COUNT document(s):"
find "$DOCS_DIR" -type f -exec bash -c 'echo "  - $(basename "{}")"' \;
echo ""

echo "Starting upload..."
echo ""

SUCCESS=0
FAILED=0

find "$DOCS_DIR" -type f | while read FILE; do
    FILENAME=$(basename "$FILE")
    FILESIZE=$(du -h "$FILE" | cut -f1)
    
    echo "Uploading: $FILENAME ($FILESIZE)"
    
    RESPONSE=$(curl -s -X POST "$RAG_URL/educator/upload" -F "file=@$FILE")
    
    if echo "$RESPONSE" | grep -q '"status":"complete"'; then
        CHUNKS=$(echo "$RESPONSE" | grep -o '"chunks":[0-9]*' | head -1 | cut -d: -f2)
        echo "  SUCCESS: $CHUNKS chunks indexed"
        ((SUCCESS++))
    else
        echo "  FAILED: Check RAG service"
        ((FAILED++))
    fi
    
    echo ""
done

echo "========================================"
echo "Migration Complete"
echo "========================================"
echo ""
echo "Documents uploaded to Render disk!"
echo "Quiz/Chat now use online chunks from Render"
echo ""
