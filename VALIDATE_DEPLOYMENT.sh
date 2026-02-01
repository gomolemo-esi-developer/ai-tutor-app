#!/bin/bash
# Pre-deployment validation script
# Checks all critical configurations before deployment

set -e

echo "=========================================="
echo "Tutorverse Deployment Validation"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0
PASSES=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSES++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((ERRORS++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

section() {
  echo ""
  echo -e "${BLUE}$1${NC}"
  echo "=========================================="
}

# ========================================
# 1. File Structure Validation
# ========================================
section "1. File Structure Validation"

# Core directories
if [ -d "ai-tutor-app/backend" ]; then
  check_pass "Backend directory exists"
else
  check_fail "Backend directory missing"
fi

if [ -d "ai-tutor-app/tutorverse-hub-main" ]; then
  check_pass "Frontend directory exists"
else
  check_fail "Frontend directory missing"
fi

if [ -d "RAG18Nov2025-1" ]; then
  check_pass "RAG directory exists"
else
  check_fail "RAG directory missing"
fi

# ========================================
# 2. Docker Files Validation
# ========================================
section "2. Docker Configuration"

if [ -f "Dockerfile.backend" ]; then
  check_pass "Dockerfile.backend exists"
else
  check_fail "Dockerfile.backend missing"
fi

if [ -f "Dockerfile.frontend" ]; then
  check_pass "Dockerfile.frontend exists"
else
  check_fail "Dockerfile.frontend missing"
fi

if [ -f "Dockerfile.rag" ]; then
  check_pass "Dockerfile.rag exists"
else
  check_fail "Dockerfile.rag missing"
fi

if [ -f "docker-compose.yml" ]; then
  check_pass "docker-compose.yml exists"
else
  check_fail "docker-compose.yml missing"
fi

# ========================================
# 3. Source Code Validation
# ========================================
section "3. Source Code Files"

# Backend
if [ -f "ai-tutor-app/backend/package.json" ]; then
  check_pass "Backend package.json exists"
else
  check_fail "Backend package.json missing"
fi

if [ -d "ai-tutor-app/backend/src" ]; then
  check_pass "Backend src/ directory exists"
else
  check_fail "Backend src/ directory missing"
fi

if [ -f "ai-tutor-app/backend/tsconfig.json" ]; then
  check_pass "Backend tsconfig.json exists"
else
  check_fail "Backend tsconfig.json missing"
fi

# Frontend
if [ -f "ai-tutor-app/tutorverse-hub-main/package.json" ]; then
  check_pass "Frontend package.json exists"
else
  check_fail "Frontend package.json missing"
fi

if [ -d "ai-tutor-app/tutorverse-hub-main/src" ]; then
  check_pass "Frontend src/ directory exists"
else
  check_fail "Frontend src/ directory missing"
fi

if [ -f "ai-tutor-app/tutorverse-hub-main/vite.config.ts" ]; then
  check_pass "Frontend vite.config.ts exists"
else
  check_fail "Frontend vite.config.ts missing"
fi

# RAG
if [ -f "RAG18Nov2025-1/requirements.txt" ]; then
  check_pass "RAG requirements.txt exists"
else
  check_fail "RAG requirements.txt missing"
fi

if [ -f "RAG18Nov2025-1/main.py" ]; then
  check_pass "RAG main.py exists"
else
  check_fail "RAG main.py missing"
fi

# ========================================
# 4. Build Artifacts (Should NOT exist)
# ========================================
section "4. Build Artifacts Check (should be deleted)"

if [ -d "ai-tutor-app/backend/node_modules" ]; then
  check_warn "Backend node_modules/ still exists (will be large in git)"
else
  check_pass "Backend node_modules/ deleted"
fi

if [ -d "ai-tutor-app/backend/dist" ]; then
  check_warn "Backend dist/ still exists (should be regenerated in Docker)"
else
  check_pass "Backend dist/ deleted"
fi

if [ -d "ai-tutor-app/tutorverse-hub-main/node_modules" ]; then
  check_warn "Frontend node_modules/ still exists"
else
  check_pass "Frontend node_modules/ deleted"
fi

if [ -d "ai-tutor-app/tutorverse-hub-main/dist" ]; then
  check_warn "Frontend dist/ still exists (should be regenerated in Docker)"
else
  check_pass "Frontend dist/ deleted"
fi

if [ -d "RAG18Nov2025-1/venv" ]; then
  check_warn "RAG venv/ still exists"
else
  check_pass "RAG venv/ deleted"
fi

if [ -d "RAG18Nov2025-1/__pycache__" ]; then
  check_warn "RAG __pycache__/ still exists"
else
  check_pass "RAG __pycache__/ deleted"
fi

if [ -d "RAG18Nov2025-1/chroma_db" ]; then
  check_warn "RAG chroma_db/ still exists (should use Docker volume)"
else
  check_pass "RAG chroma_db/ deleted"
fi

# ========================================
# 5. Secrets Files (Should NOT be tracked)
# ========================================
section "5. Secrets & Environment Files"

if [ -f "ai-tutor-app/backend/.env" ]; then
  check_warn "Backend .env exists (should use .env.example template)"
else
  check_pass "Backend .env not in repo"
fi

if [ -f "RAG18Nov2025-1/.env" ]; then
  check_warn "RAG .env exists (should use template)"
else
  check_pass "RAG .env not in repo"
fi

if [ -f ".env.backend" ]; then
  check_warn ".env.backend in root (should not be tracked)"
else
  check_pass ".env.backend not in root"
fi

if [ -f ".env.frontend" ]; then
  check_warn ".env.frontend in root (should not be tracked)"
else
  check_pass ".env.frontend not in root"
fi

if [ -f ".env.rag" ]; then
  check_warn ".env.rag in root (should not be tracked)"
else
  check_pass ".env.rag not in root"
fi

# ========================================
# 6. Example Templates
# ========================================
section "6. Environment Templates"

if [ -f "ai-tutor-app/backend/.env.example" ]; then
  check_pass "Backend .env.example template exists"
  
  # Check for required variables
  if grep -q "NODE_ENV" "ai-tutor-app/backend/.env.example"; then
    check_pass "  └─ NODE_ENV defined"
  else
    check_warn "  └─ NODE_ENV not in template"
  fi
  
  if grep -q "RAG_SERVICE_URL" "ai-tutor-app/backend/.env.example"; then
    check_pass "  └─ RAG_SERVICE_URL defined"
  else
    check_warn "  └─ RAG_SERVICE_URL not in template"
  fi
else
  check_fail "Backend .env.example template missing"
fi

# ========================================
# 7. Git Configuration
# ========================================
section "7. Git Configuration"

if [ -f ".gitignore" ]; then
  check_pass ".gitignore exists"
  
  if grep -q "\.env" ".gitignore"; then
    check_pass "  └─ .env* in .gitignore"
  else
    check_warn "  └─ .env* NOT in .gitignore (critical!)"
  fi
  
  if grep -q "node_modules" ".gitignore"; then
    check_pass "  └─ node_modules in .gitignore"
  else
    check_warn "  └─ node_modules NOT in .gitignore"
  fi
  
  if grep -q "dist/" ".gitignore"; then
    check_pass "  └─ dist/ in .gitignore"
  else
    check_warn "  └─ dist/ NOT in .gitignore"
  fi
else
  check_warn ".gitignore missing (not critical but recommended)"
fi

# ========================================
# 8. Package Dependencies
# ========================================
section "8. Package Management"

# Check backend build script
if [ -f "ai-tutor-app/backend/package.json" ]; then
  if grep -q '"build"' "ai-tutor-app/backend/package.json"; then
    check_pass "Backend has build script"
  else
    check_warn "Backend missing build script (might fail in Docker)"
  fi
fi

# Check frontend package.json
if [ -f "ai-tutor-app/tutorverse-hub-main/package.json" ]; then
  if grep -q '"build"' "ai-tutor-app/tutorverse-hub-main/package.json"; then
    check_pass "Frontend has build script"
  else
    check_warn "Frontend missing build script (might fail in Docker)"
  fi
fi

# Check RAG requirements
if [ -f "RAG18Nov2025-1/requirements.txt" ]; then
  LINES=$(wc -l < "RAG18Nov2025-1/requirements.txt")
  if [ "$LINES" -gt 0 ]; then
    check_pass "RAG requirements.txt has content ($LINES packages)"
  else
    check_warn "RAG requirements.txt is empty"
  fi
else
  check_fail "RAG requirements.txt missing"
fi

# ========================================
# 9. Docker Image Issues
# ========================================
section "9. Dockerfile Issues"

# Check for bun.lockb in frontend
if grep -q "bun.lockb" "Dockerfile.frontend"; then
  check_warn "Dockerfile.frontend references bun.lockb but uses npm"
  echo "         (Consider removing line 7 from Dockerfile.frontend)"
else
  check_pass "Dockerfile.frontend package consistency OK"
fi

# Check for Alpine base (good for size)
if grep -q "alpine" "Dockerfile.backend"; then
  check_pass "Backend uses Alpine base (good for size)"
else
  check_warn "Backend not using Alpine base (image might be large)"
fi

if grep -q "alpine" "Dockerfile.frontend"; then
  check_pass "Frontend uses Alpine base (good for size)"
else
  check_warn "Frontend not using Alpine base (image might be large)"
fi

if grep -q "slim" "Dockerfile.rag"; then
  check_pass "RAG uses slim Python base (good for size)"
else
  check_warn "RAG not using slim base (image might be large)"
fi

# Check for health checks
if grep -q "HEALTHCHECK" "Dockerfile.backend"; then
  check_pass "Backend has HEALTHCHECK"
else
  check_warn "Backend missing HEALTHCHECK"
fi

if grep -q "HEALTHCHECK" "Dockerfile.frontend"; then
  check_pass "Frontend has HEALTHCHECK"
else
  check_warn "Frontend missing HEALTHCHECK"
fi

if grep -q "HEALTHCHECK" "Dockerfile.rag"; then
  check_pass "RAG has HEALTHCHECK"
else
  check_warn "RAG missing HEALTHCHECK"
fi

# ========================================
# 10. docker-compose Configuration
# ========================================
section "10. Docker Compose Configuration"

if [ -f "docker-compose.yml" ]; then
  if grep -q "frontend" "docker-compose.yml"; then
    check_pass "docker-compose defines frontend service"
  else
    check_fail "docker-compose missing frontend service"
  fi
  
  if grep -q "backend" "docker-compose.yml"; then
    check_pass "docker-compose defines backend service"
  else
    check_fail "docker-compose missing backend service"
  fi
  
  if grep -q "rag-service" "docker-compose.yml"; then
    check_pass "docker-compose defines rag-service"
  else
    check_fail "docker-compose missing rag-service"
  fi
  
  # Check ports
  if grep -q "3000:3000" "docker-compose.yml"; then
    check_pass "Frontend port 3000 configured"
  fi
  
  if grep -q "3001:3000\|3000:3001" "docker-compose.yml"; then
    check_pass "Backend port 3001 configured"
  fi
  
  if grep -q "8000:8000" "docker-compose.yml"; then
    check_pass "RAG port 8000 configured"
  fi
  
  # Check for volumes
  if grep -q "chroma_data\|rag_data" "docker-compose.yml"; then
    check_pass "docker-compose defines volumes for persistence"
  else
    check_warn "docker-compose missing volume definitions"
  fi
fi

# ========================================
# Summary
# ========================================
section "VALIDATION SUMMARY"

TOTAL=$((PASSES + ERRORS + WARNINGS))

echo ""
echo -e "${GREEN}✓ Passed${NC}: $PASSES"
echo -e "${YELLOW}⚠ Warnings${NC}: $WARNINGS"
echo -e "${RED}✗ Errors${NC}: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ Validation complete with warnings. Review above and fix if needed.${NC}"
  exit 0
else
  echo -e "${RED}✗ Validation failed. Fix errors above before deployment.${NC}"
  exit 1
fi
