# Cleanup & Containerization Plan

## Project Architecture

**Three Microservices:**
1. **Frontend** (ai-tutor-app/tutorverse-hub-main) - React/Vite/TypeScript
2. **Backend** (ai-tutor-app/backend) - Node.js/Express/TypeScript
3. **RAG Service** (RAG18Nov2025-1) - Python/FastAPI

---

## PHASE 1: CLEANUP (Before Git & Docker)

### 1.1 Frontend (ai-tutor-app/tutorverse-hub-main) - React/Vite

**REMOVE:**
- `node_modules/` - Will be reinstalled in Docker (large, OS-specific)
- `dist/` - Built artifacts (regenerated on build)
- `.env` & `.env.local` - Environment files with secrets
- `bun.lockb` - Package manager lock file (if not using bun)

**KEEP:**
- `.env.local.example` - Template for environment
- `package.json` & `package-lock.json` - Dependency management
- `src/` - Source code
- `public/` - Static assets
- `vite.config.ts`, `tsconfig.json` - Configuration
- `.gitignore` - Version control rules

### 1.2 Backend (ai-tutor-app/backend) - Node.js/Express

**REMOVE:**
- `node_modules/` - Will be reinstalled in Docker (large, OS-specific)
- `dist/` - Built artifacts (regenerated on build)
- `*.tar.gz` & `*.zip` - Build artifacts (lambda-code.tar.gz, lambda-code.zip)
- `backend.log` - Local logs
- `.env` - Already have `.env.example` (secrets protection)

**KEEP:**
- `.env.example` - Template for deployment
- `package.json` & `package-lock.json` - Dependency management
- `.gitignore` - Version control rules
- All source code (`src/`, `config/`, `tests/`, `scripts/`)

### 1.3 RAG Service (RAG18Nov2025-1) - Python/FastAPI

**REMOVE:**
- `venv/` - Virtual environment (recreated in Docker)
- `__pycache__/` - Python cache
- `chroma_db/` - Local database (should mount as volume or reinitialize)
- `.git/` - Separate Git repo (flatten into main repo if needed)
- `.env` - Secrets protection
- `*.bat` - Windows-specific scripts (use shell scripts in Docker)
- Local development data/artifacts:
  - `educator_files_list.json`
  - `chroma_population_dynamodb_summary.json`
  - `chroma_population_summary.json`
  - `*.log` files

**KEEP:**
- `.gitignore` - Version control rules
- `requirements.txt` - Python dependencies
- All source code (`api/`, `modules/`, `frontend/`, `ui/`)
- Configuration templates
- Documentation files
- `main.py` - Application entry point

### 1.4 Additional Cleanup

**CONSIDER REMOVING:**
- `backups/` - Development artifacts (if old/obsolete)
- `aws/` - AWS-specific files (keep only if needed for deployment)

---

## PHASE 2: DOCKER SETUP

### 2.1 Frontend Dockerfile (React/Vite)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY ai-tutor-app/tutorverse-hub-main/package*.json ./
RUN npm ci
COPY ai-tutor-app/tutorverse-hub-main/src ./src
COPY ai-tutor-app/tutorverse-hub-main/ ./
RUN npm run build

FROM node:20-alpine
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Key Points:**
- Multi-stage build (smaller final image)
- Node Alpine base for small size
- Vite build output in dist/
- Serve to run production build
- Port 3000

### 2.2 Backend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY ai-tutor-app/backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY ai-tutor-app/backend/src ./src
COPY ai-tutor-app/backend/config ./config
COPY ai-tutor-app/backend/tsconfig.json ./.

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD npm run health || exit 1

# Start app
CMD ["node", "dist/app.js"]
```

### 2.2 RAG Service Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY RAG18Nov2025-1/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY RAG18Nov2025-1/ .

# Create data/chroma directories for volumes
RUN mkdir -p /app/data /app/chroma_db

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 docker-compose.yml

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: .
      dockerfile: ./Dockerfile.frontend
    container_name: tutorverse-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    networks:
      - tutorverse
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: ./Dockerfile.backend
    container_name: tutorverse-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
      - ENVIRONMENT=production
      - RAG_SERVICE_URL=http://rag-service:8000
      - RAG_ENABLE=true
    env_file:
      - .env.backend
    depends_on:
      - rag-service
    networks:
      - tutorverse
    restart: unless-stopped

  rag-service:
    build:
      context: .
      dockerfile: ./Dockerfile.rag
    container_name: tutorverse-rag
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - ENVIRONMENT=production
    env_file:
      - .env.rag
    volumes:
      - chroma_data:/app/chroma_db
      - rag_data:/app/data
    networks:
      - tutorverse
    restart: unless-stopped

volumes:
  chroma_data:
  rag_data:

networks:
  tutorverse:
    driver: bridge
```

---

## PHASE 3: ENVIRONMENT SETUP

### 3.1 Create .env files for deployment

**Backend (.env.backend):**
- Copy from `.env.example`
- Update `RAG_SERVICE_URL=http://rag-service:8000`
- Update `NODE_ENV=production`
- Set actual API keys and secrets

**RAG Service (.env.rag):**
- Set `OPENAI_API_KEY`
- Set any other required env variables
- Check `config.py` for all required vars

### 3.2 Update .gitignore

Add to both repos:
```
# Build artifacts
dist/
build/
*.egg-info/

# Dependency directories
node_modules/
venv/
env/

# Virtual environments
.venv
__pycache__/

# Logs
*.log
backend.log

# Local development
.DS_Store
Thumbs.db
*.swp
*.swo

# Docker
.dockerignore
```

---

## PHASE 4: DEPLOYMENT TO RENDER.COM

### 4.1 Build Docker images

```bash
docker-compose build
```

### 4.2 Push to Docker registry (DockerHub or similar)

```bash
docker tag tutorverse-backend:latest yourdockeruser/tutorverse-backend:latest
docker push yourdockeruser/tutorverse-backend:latest

docker tag tutorverse-rag:latest yourdockeruser/tutorverse-rag:latest
docker push yourdockeruser/tutorverse-rag:latest
```

### 4.3 Deploy to Render

1. **Create Backend Service**
   - Connect to Docker image repo
   - Set environment variables from `.env.backend`
   - Expose port 3000
   - Set health check endpoint

2. **Create RAG Service**
   - Connect to Docker image repo
   - Set environment variables from `.env.rag`
   - Expose port 8000
   - Mount persistent volumes for chroma_db and data
   - Set health check endpoint

3. **Update Backend Config**
   - Change `RAG_SERVICE_URL` to point to deployed RAG service

---

## CLEANUP CHECKLIST

### Frontend (ai-tutor-app/tutorverse-hub-main)
- [ ] Delete `node_modules/` (large, reinstalled in Docker)
- [ ] Delete `dist/` (regenerated on build)
- [ ] Delete `.env` and `.env.local` (keep .env.local.example)
- [ ] Keep: `src/`, `public/`, `index.html`, `package.json`, `vite.config.ts`

### Backend (ai-tutor-app/backend)
- [ ] Delete `node_modules/` 
- [ ] Delete `dist/` 
- [ ] Delete `lambda-code.tar.gz` and `lambda-code.zip`
- [ ] Delete `backend.log`
- [ ] Delete `.env` (keep .env.example)

### RAG Service (RAG18Nov2025-1)
- [ ] Delete `venv/`
- [ ] Delete `__pycache__/`
- [ ] Delete `chroma_db/`
- [ ] Delete `.env` (keep template)
- [ ] Delete `.git/` (if consolidating repos)
- [ ] Delete local data files

### Optional Review
- [ ] Review `backups/` directory (old development files?)
- [ ] Delete if not needed

### Docker Setup
- [ ] Update `.gitignore` files to exclude dev artifacts
- [ ] Create Dockerfile.frontend ✓
- [ ] Create Dockerfile.backend ✓
- [ ] Create Dockerfile.rag ✓
- [ ] Create docker-compose.yml ✓
- [ ] Create `.dockerignore` ✓

### Configuration Templates
- [ ] Create .env.frontend ✓
- [ ] Create .env.backend ✓
- [ ] Create .env.rag ✓

### Testing & Deployment
- [ ] Test Docker builds locally
- [ ] Commit cleaned code to GitHub
- [ ] Push Docker images to registry (3 services now)
- [ ] Deploy to Render.com (frontend, backend, RAG)

---

## NEXT STEPS

1. Start with Phase 1: Cleanup
2. Verify .gitignore rules
3. Create Phase 2 Docker files
4. Test locally with docker-compose
5. Push to GitHub
6. Set up Docker registry (DockerHub)
7. Deploy to Render.com
