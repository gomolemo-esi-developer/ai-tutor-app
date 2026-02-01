#!/bin/bash
# Automated cleanup script for production deployment
# Run this BEFORE committing to git
# Usage: bash CLEANUP_SCRIPT.sh

set -e  # Exit on error

echo "======================================"
echo "Tutorverse Production Cleanup Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track changes
DELETED=0
VERIFIED=0

# Function to safely delete
safe_delete() {
  local path=$1
  local description=$2
  
  if [ -e "$path" ]; then
    echo -e "${YELLOW}[DELETE]${NC} $description"
    rm -rf "$path"
    ((DELETED++))
    echo -e "${GREEN}✓ Deleted${NC}"
  else
    echo -e "${YELLOW}[SKIP]${NC} $description (not found)"
  fi
  echo ""
}

# Function to verify file exists
verify_exists() {
  local path=$1
  local description=$2
  
  if [ -e "$path" ]; then
    echo -e "${GREEN}✓ Found${NC} $description: $path"
    ((VERIFIED++))
  else
    echo -e "${RED}✗ Missing${NC} $description: $path"
  fi
  echo ""
}

# ============================================
# PHASE 1: Backend Cleanup
# ============================================
echo "PHASE 1: Backend Cleanup"
echo "================================"

safe_delete "ai-tutor-app/backend/dist" "Backend compiled output (dist/)"
safe_delete "ai-tutor-app/backend/node_modules" "Backend dependencies (node_modules/)"
safe_delete "ai-tutor-app/backend/backend.log" "Backend log file"
safe_delete "ai-tutor-app/backend/lambda-code.tar.gz" "Lambda artifact (tar.gz)"
safe_delete "ai-tutor-app/backend/lambda-code.zip" "Lambda artifact (zip)"

# ============================================
# PHASE 2: Frontend Cleanup
# ============================================
echo "PHASE 2: Frontend Cleanup"
echo "================================"

safe_delete "ai-tutor-app/tutorverse-hub-main/dist" "Frontend build output (dist/)"
safe_delete "ai-tutor-app/tutorverse-hub-main/node_modules" "Frontend dependencies (node_modules/)"

# ============================================
# PHASE 3: RAG Service Cleanup
# ============================================
echo "PHASE 3: RAG Service Cleanup"
echo "================================"

safe_delete "RAG18Nov2025-1/venv" "Python virtual environment"
safe_delete "RAG18Nov2025-1/__pycache__" "Python cache"
safe_delete "RAG18Nov2025-1/chroma_db" "Local Chroma database (will use Docker volume)"
safe_delete "RAG18Nov2025-1/.git" "Separate git repo (if consolidating)"

# Windows batch scripts
safe_delete "RAG18Nov2025-1/clear_metadata.bat" "Windows batch script (clear metadata)"
safe_delete "RAG18Nov2025-1/install_all_windows.bat" "Windows batch script (install)"
safe_delete "RAG18Nov2025-1/populate_chroma.bat" "Windows batch script (populate chroma)"
safe_delete "RAG18Nov2025-1/populate_chroma_educator.bat" "Windows batch script (populate educator)"
safe_delete "RAG18Nov2025-1/reset_and_populate.bat" "Windows batch script (reset)"

# Local data files
safe_delete "RAG18Nov2025-1/educator_files_list.json" "Local educator files list"
safe_delete "RAG18Nov2025-1/chroma_population_dynamodb_summary.json" "Local DynamoDB summary"
safe_delete "RAG18Nov2025-1/chroma_population_summary.json" "Local population summary"

# Duplicate requirements
safe_delete "RAG18Nov2025-1/requirements_full.txt" "Unused requirements (full)"
safe_delete "RAG18Nov2025-1/requirements_simple.txt" "Unused requirements (simple)"

# ============================================
# PHASE 4: AWS Directory Cleanup (Optional)
# ============================================
echo "PHASE 4: AWS Directory Cleanup"
echo "================================"
echo -e "${YELLOW}[CONFIRM]${NC} Delete AWS directory? (only if using Docker, not Lambda)"
read -p "Delete ai-tutor-app/aws/? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  safe_delete "ai-tutor-app/aws" "AWS Lambda configuration (if not needed)"
else
  echo -e "${YELLOW}[SKIP]${NC} Keeping AWS directory"
fi
echo ""

# ============================================
# PHASE 5: Backup Directory Cleanup (Optional)
# ============================================
echo "PHASE 5: Backup Directory Cleanup"
echo "================================"
echo -e "${YELLOW}[CONFIRM]${NC} Delete backups directory? (old development files)"
read -p "Delete ai-tutor-app/backups/? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  safe_delete "ai-tutor-app/backups" "Development backups"
else
  echo -e "${YELLOW}[SKIP]${NC} Keeping backups directory"
fi
echo ""

# ============================================
# PHASE 6: Configuration Fixes
# ============================================
echo "PHASE 6: Configuration Fixes"
echo "================================"

echo "Checking Docker configuration files..."
echo ""

verify_exists "Dockerfile.backend" "Backend Dockerfile"
verify_exists "Dockerfile.frontend" "Frontend Dockerfile"
verify_exists "Dockerfile.rag" "RAG Dockerfile"
verify_exists "docker-compose.yml" "Docker Compose file"

# ============================================
# PHASE 7: Verify Source Code Exists
# ============================================
echo "PHASE 7: Verify Source Code"
echo "================================"

verify_exists "ai-tutor-app/backend/package.json" "Backend package.json"
verify_exists "ai-tutor-app/backend/src" "Backend source code"
verify_exists "ai-tutor-app/tutorverse-hub-main/package.json" "Frontend package.json"
verify_exists "ai-tutor-app/tutorverse-hub-main/src" "Frontend source code"
verify_exists "RAG18Nov2025-1/requirements.txt" "RAG requirements"
verify_exists "RAG18Nov2025-1/main.py" "RAG main entry point"

# ============================================
# PHASE 8: Git Preparation
# ============================================
echo "PHASE 8: Git Preparation"
echo "================================"

echo -e "${YELLOW}[INFO]${NC} Review these commands to remove .env files from git history:"
echo ""
echo "  # Remove .env files from git tracking:"
echo "  git rm --cached ai-tutor-app/backend/.env 2>/dev/null || true"
echo "  git rm --cached RAG18Nov2025-1/.env 2>/dev/null || true"
echo ""
echo "  # Update .gitignore"
echo "  echo '.env*' >> .gitignore"
echo "  echo '.env.backend' >> .gitignore"
echo "  echo '.env.frontend' >> .gitignore"
echo "  echo '.env.rag' >> .gitignore"
echo ""
echo "  # Commit"
echo "  git add . && git commit -m 'Cleanup for production deployment'"
echo ""

# ============================================
# Summary
# ============================================
echo "======================================"
echo "CLEANUP COMPLETE"
echo "======================================"
echo -e "${GREEN}Files Deleted: $DELETED${NC}"
echo -e "${GREEN}Files Verified: $VERIFIED${NC}"
echo ""
echo "Next steps:"
echo "1. Review the deletions above"
echo "2. Run the git commands shown above"
echo "3. Test locally: docker-compose build && docker-compose up"
echo "4. Push to GitHub when ready"
echo ""
