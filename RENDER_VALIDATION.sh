#!/bin/bash

# TutorVerse Render Deployment Validation Script
# Run this after all services are deployed to verify everything works

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "TutorVerse Render Deployment Validator"
echo "======================================"
echo ""

# Prompt for service URLs
read -p "Enter RAG service URL (e.g., https://tutorverse-rag.onrender.com): " RAG_URL
read -p "Enter Backend service URL (e.g., https://tutorverse-backend.onrender.com): " BACKEND_URL
read -p "Enter Frontend service URL (e.g., https://tutorverse-frontend.onrender.com): " FRONTEND_URL

echo ""
echo "Validating deployment..."
echo ""

# Test 1: RAG Service Health
echo -n "1. Testing RAG Service Health... "
if curl -sf "$RAG_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "   Issue: RAG service not responding to health check"
    echo "   Fix: Check RAG service logs in Render dashboard"
fi

# Test 2: Backend Service Health
echo -n "2. Testing Backend Service Health... "
if curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "   Issue: Backend service not responding to health check"
    echo "   Fix: Check Backend service logs in Render dashboard"
fi

# Test 3: Frontend Service Health
echo -n "3. Testing Frontend Service... "
FRONTEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_HTTP" = "200" ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED (HTTP $FRONTEND_HTTP)${NC}"
    echo "   Issue: Frontend not responding correctly"
    echo "   Fix: Check Frontend service logs"
fi

# Test 4: Backend can reach RAG
echo -n "4. Testing Backend → RAG Connectivity... "
# This would require an API endpoint that calls RAG
# For now, just check if backend is up
if curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC} (Backend is running)"
    echo "   Note: Full connectivity test requires API endpoint"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test 5: Check nginx configuration in frontend
echo -n "5. Testing Frontend nginx Configuration... "
FRONTEND_CONTENT=$(curl -s "$FRONTEND_URL" | head -20)
if echo "$FRONTEND_CONTENT" | grep -q "<!DOCTYPE html\|<html"; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "   Frontend is serving HTML correctly"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "   Issue: Frontend not serving HTML"
fi

# Summary
echo ""
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo ""
echo "Service URLs:"
echo "  Frontend:  $FRONTEND_URL"
echo "  Backend:   $BACKEND_URL"
echo "  RAG:       $RAG_URL"
echo ""
echo "Next steps:"
echo "  1. Open $FRONTEND_URL in your browser"
echo "  2. Open browser DevTools (F12)"
echo "  3. Check Network tab for API calls"
echo "  4. Verify calls go to: $BACKEND_URL"
echo "  5. Check Console for any errors"
echo ""
echo "If tests failed:"
echo "  1. Go to Render Dashboard"
echo "  2. Check service Logs tabs"
echo "  3. Look for startup or connection errors"
echo "  4. Verify environment variables are set correctly"
echo ""
echo "Common Issues:"
echo "  - Frontend can't reach Backend: Check BACKEND_URL env var"
echo "  - Backend can't reach RAG: Check RAG_SERVICE_URL env var"
echo "  - Services won't start: Check logs and free disk space"
echo "  - Health checks timeout: Increase start period to 60s"
echo ""
