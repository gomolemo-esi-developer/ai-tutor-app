# TutorVerse - AI-Powered Tutoring Platform

An intelligent tutoring system combining React frontend, Node.js backend, and Python RAG (Retrieval-Augmented Generation) service for personalized AI-assisted learning.

## Project Overview

TutorVerse is a three-tier microservices application that provides:

- **Interactive Frontend**: React-based student/educator interface with real-time chat
- **Scalable Backend**: Node.js/Express API for user management, authentication, and orchestration
- **AI RAG Service**: Python/FastAPI service using ChromaDB for intelligent document retrieval and AI responses

### Architecture

```
┌─────────────────────────────────────────────────┐
│             TutorVerse Application              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────┐  ┌────────────────┐         │
│  │    Frontend    │  │    Backend     │         │
│  │  React/Vite   │  │  Node/Express  │         │
│  │  Port 3000    │  │  Port 3001     │         │
│  └────────────────┘  └────────────────┘         │
│         │                    │                  │
│         └────────┬───────────┘                  │
│                  │                              │
│          ┌───────▼────────┐                    │
│          │  RAG Service   │                    │
│          │ Python/FastAPI │                    │
│          │  Port 8000     │                    │
│          └────────────────┘                    │
│                                                 │
│  Volumes: chroma_data, rag_data                 │
│  Network: Docker bridge network                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Prerequisites

### Local Development
- Node.js 20+ (for frontend and backend)
- Python 3.11+ (for RAG service)
- npm or yarn package manager

### Docker (Recommended)
- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/tutorverse.git
cd tutorverse-21

# Start all services
docker-compose up --build

# Wait for all services to start (30-60 seconds)
# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
# - RAG API: http://localhost:8000
```

Test health endpoints:
```bash
curl http://localhost:3000           # Frontend
curl http://localhost:3001/health    # Backend health check
curl http://localhost:8000/health    # RAG health check
```

### Option 2: Local Development

#### Frontend
```bash
cd ai-tutor-app/tutorverse-hub-main
npm install
npm run dev
# Available at http://localhost:5173
```

#### Backend
```bash
cd ai-tutor-app/backend
npm install
npm run dev
# Available at http://localhost:3000
```

#### RAG Service
```bash
cd RAG18Nov2025-1
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python main.py
# Available at http://localhost:8000
```

## Stopping Services

### Docker
```bash
docker-compose down
```

### Local Development
- Press `Ctrl+C` in each terminal running a service

## Project Structure

```
tutorverse-21/
├── ai-tutor-app/
│   ├── backend/                 # Node.js/Express API
│   │   ├── src/                 # TypeScript source
│   │   ├── package.json         # Dependencies
│   │   └── tsconfig.json        # TypeScript config
│   └── tutorverse-hub-main/     # React/Vite frontend
│       ├── src/                 # React components
│       ├── public/              # Static assets
│       ├── package.json         # Dependencies
│       └── vite.config.ts       # Vite config
│
├── RAG18Nov2025-1/              # Python FastAPI RAG service
│   ├── main.py                  # FastAPI app entry point
│   ├── api/                     # Route handlers
│   ├── modules/                 # Core RAG modules
│   ├── requirements.txt         # Python dependencies
│   └── data/                    # Data directory (mounted as volume)
│
├── docker-compose.yml           # Docker service orchestration
├── Dockerfile.frontend          # Frontend container
├── Dockerfile.backend           # Backend container
├── Dockerfile.rag               # RAG service container
└── README.md                    # This file
```

## Configuration

### Environment Variables

Create `.env` files in each service directory:

#### Backend (`ai-tutor-app/backend/.env`)
```
NODE_ENV=production
AWS_REGION=us-east-2
RAG_SERVICE_URL=http://rag-service:8000
RAG_ENABLE=true
RAG_TIMEOUT=30000
RAG_RETRY_ATTEMPTS=3
```

#### Frontend (`ai-tutor-app/tutorverse-hub-main/.env`)
```
VITE_API_URL=http://localhost:3001
```

#### RAG Service (`RAG18Nov2025-1/.env`)
```
OPENAI_API_KEY=your_openai_key
ENVIRONMENT=production
CHROMA_PERSIST_DIR=/app/chroma_db
```

## Testing

### Health Checks
All services include health endpoints:
```bash
# Backend
GET http://localhost:3001/health

# RAG Service
GET http://localhost:8000/health

# Frontend (HTTP root)
GET http://localhost:3000
```

### Validation Script
```bash
bash VALIDATE_DEPLOYMENT.sh
```

## Build & Production

### Building Docker Images
```bash
docker-compose build
```

### Production Build
```bash
docker-compose up -d
```

Services automatically restart on failure (`restart: unless-stopped`).

## Deployment

### Render.com (Recommended)
1. Push code to GitHub
2. Create 3 Render services (Frontend, Backend, RAG)
3. Set environment variables
4. Configure health checks
5. Deploy

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

### Other Platforms
- DigitalOcean App Platform
- Railway.app
- AWS ECS/Fargate
- Kubernetes

## Logs

### Docker
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs rag-service
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

### Local Development
Logs output to console in each terminal.

## Security

- Non-root users in all containers
- Secrets stored in `.env` files (not in git)
- CORS configured for production
- Health checks for availability monitoring
- Signal handling for graceful shutdown

## Documentation

- `DEPLOYMENT_SUMMARY.md` - Quick deployment overview
- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- `DEPLOYMENT_READINESS_REPORT.md` - Detailed analysis
- `PRE_DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification

## Troubleshooting

### Docker won't build
```bash
docker-compose build --no-cache
```

### Services won't start
```bash
docker-compose logs
docker system prune  # Clean up unused images/volumes
```

### Health checks failing
- Verify endpoints: `/health` (backend), `/health` (rag)
- Check environment variables
- Review container logs

### Port already in use
Change ports in `docker-compose.yml` or kill existing process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

## Environment Variables Reference

| Variable | Service | Required | Default |
|----------|---------|----------|---------|
| `NODE_ENV` | Backend | Yes | `production` |
| `OPENAI_API_KEY` | RAG | Yes | - |
| `AWS_REGION` | Backend | No | `us-east-2` |
| `RAG_SERVICE_URL` | Backend | No | `http://rag-service:8000` |
| `VITE_API_URL` | Frontend | No | `http://localhost:3001` |

---

**Last Updated**: February 3, 2026  
**Status**: Production Ready (with Docker)  
**Version**: 1.0.0
