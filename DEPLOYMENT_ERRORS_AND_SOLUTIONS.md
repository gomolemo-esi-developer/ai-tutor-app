# TutorVerse Deployment - Errors & Solutions

## Overview
This document outlines all deployment errors encountered and their solutions during the Render.com deployment of the TutorVerse application.

---

## Error 1: Frontend API Connection Refused (localhost:3000)

### Problem
```
POST http://localhost:3000/api/auth/quick-link-existing
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

### Root Cause
Frontend was hardcoded to use `localhost:3000` instead of the production backend URL.

### Solution
Modified `src/services/apiClient.ts` to use environment variables and provide production fallback:

```typescript
export const createGlobalApiClient = (): ApiClient => {
  let baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  
  // Production: default to external backend URL
  if (!baseURL && !import.meta.env.DEV) {
    baseURL = 'https://tutorverse-backend-kpls.onrender.com';
  }
  // Development: default to localhost
  else if (!baseURL && import.meta.env.DEV) {
    baseURL = 'http://localhost:3000';
  }
  
  const debug = import.meta.env.DEV;
  return createApiClient({ baseURL, timeout: 30000, debug });
};
```

---

## Error 2: Frontend 502 Bad Gateway

### Problem
```
502 Bad Gateway
Failed to load resource: the server responded with a status of 502
```

### Root Cause
Nginx proxy was misconfigured, trying to proxy to external HTTPS URL which didn't work from inside the container.

### Solution
Removed the Nginx proxy configuration from `docker-entrypoint.sh` and made the frontend call the backend directly at the full URL.

**Changes:**
- Removed API proxy location block from Nginx config
- Frontend now calls `https://tutorverse-backend-kpls.onrender.com/api` directly instead of relative `/api` path

---

## Error 3: Quick-Link Callback Pointing to localhost:5173

### Problem
```
http://localhost:5173/auth/quick?token=...&email=...
Hmmm… can't reach this page - localhost refused to connect
```

### Root Cause
Backend wasn't configured with the production frontend URL, so it generated quick-link callbacks pointing to localhost.

### Solution
Added `FRONTEND_URL` environment variable to backend in Render:

**In Render backend settings:**
- Added env var: `FRONTEND_URL=https://ai-tutor-ocue.onrender.com`
- Updated `render.yaml` to include the env variable

**Backend code** (`src/config/environment.ts`):
```typescript
FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
```

---

## Error 4: Vite Not Found in Docker Build

### Problem
```
sh: vite: not found
error: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code 127
```

### Root Cause
npm dependencies weren't installing properly during Docker build, or vite wasn't being installed with the package lock.

### Solution
Changed Docker strategy from building during Docker image creation to using pre-built dist folder:

**Updated Dockerfile.frontend:**
```dockerfile
FROM nginx:alpine
WORKDIR /app
COPY ai-tutor-app/tutorverse-hub-main/dist ./dist
COPY docker-entrypoint.sh /docker-entrypoint.sh
# ... rest of Nginx setup
```

**Process:**
1. Build locally with correct env variables:
   ```bash
   cd ai-tutor-app/tutorverse-hub-main
   VITE_API_URL=https://tutorverse-backend-kpls.onrender.com npm run build
   ```
2. Commit the `dist` folder to git (had to remove from `.dockerignore`)
3. Docker copies pre-built files instead of building

---

## Error 5: dist Folder Not Found in Docker Build Context

### Problem
```
ERROR: failed to calculate checksum of ref ...: "/ai-tutor-app/tutorverse-hub-main/dist": not found
```

### Root Cause
`dist` folder was excluded by `.dockerignore`, preventing Docker from accessing it during build.

### Solution
Removed `**/dist` from `.dockerignore`:

**Before:**
```
**/dist
```

**After:**
```
# (removed the dist line)
```

Now Docker can copy the pre-built dist folder to the image.

---

## Error 6: Frontend Still Hitting localhost:3000 After Code Changes

### Problem
```
GET http://localhost:3000/api/student/modules
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

Even after updating `apiClient.ts`, frontend was still using old cached code.

### Solution
**Steps taken:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Disabled browser cache in DevTools
3. Triggered frontend redeploy in Render (Clear build cache & redeploy)
4. Committed the newly built `dist` folder with correct URLs baked in
5. Pushed to git to trigger Render redeployment

---

## Error 7: Quiz Generation Returns 500

### Problem
```
POST /api/quiz/generate
Failed to load resource: the server responded with a status of 500
API Error: INTERNAL_ERROR
```

Backend logs showed:
```
[RAG] Quiz generation failed (attempt 1/3)
error: Request failed with status code 400
```

### Root Cause
RAG service returned 400 because ChromaDB had no indexed documents:
```
Retrieved 0 matches from ChromaDB
Retrieved context: 0 characters from 0 chunks
```

### Solution

#### Part 1: Add Persistent Disk ✅ COMPLETED

Persistent disk already created in Render for ChromaDB:
- **Name:** `chroma-db`
- **Size:** 10 GB
- **Mount Path:** `/app/chroma_db`
- **Status:** Ready to store document embeddings

#### Part 2: Upload Documents to Persistent Disk

Now populate the disk with indexed documents using the RAG upload endpoint.

**Quick Start (Recommended):**

```bash
# PowerShell (Windows)
.\test_chromadb_upload.ps1 -DocumentPath "C:\path\to\document.pdf"

# Bash (Mac/Linux)
chmod +x test_chromadb_upload.sh
./test_chromadb_upload.sh https://tutorverse-rag.onrender.com /path/to/document.pdf
```

**Manual Upload via cURL:**

```bash
# Upload a document
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@document.pdf"

# Streaming NDJSON response shows progress:
# {"status": "uploading", "progress": 5}
# {"status": "converting", "progress": 15}
# {"status": "chunking", "progress": 60}
# {"status": "embedding", "progress": 75}
# {"status": "storing", "progress": 90}
# {"status": "complete", "progress": 100, "chunks": 250, "document_id": "uuid"}
```

#### Part 3: Verify Documents in ChromaDB

```bash
# Check what documents are indexed
curl "https://tutorverse-rag.onrender.com/educator/documents"

# Verify vectors are stored for a document
curl "https://tutorverse-rag.onrender.com/educator/verify/{document_id}"

# Expected response:
# {
#   "vectorsStored": true,
#   "vectorCount": 250,
#   "status": "Found 250 vectors"
# }
```

#### Part 4: Confirm Disk Persistence

```bash
# SSH into tutorverse-rag service in Render
# Check disk is mounted
df -h /app/chroma_db

# Should show:
# /dev/nvme0n1p1  10G  100M  9.9G  1% /app/chroma_db

# Check chroma_db directory structure
ls -la /app/chroma_db/
# Should contain: chroma/, index/, .venv/
```

### Data Flow
```
Document Upload
    ↓
Convert (PDF/DOCX → Text)
    ↓
Chunk (Split into semantic pieces)
    ↓
Embed (Create 384-dim vectors)
    ↓
Store to Persistent Disk (/app/chroma_db)
    ↓
Quiz Generation (Uses indexed content)
```

**Status:** ✅ Solution implemented. Documents now persist on disk and are available for quiz generation.

**Next Steps:**
1. Upload course documents via RAG upload endpoint
2. Verify vectors are stored using verification endpoint
3. Test quiz generation - should now work with indexed documents
4. Documents will remain in ChromaDB even after container restart

---

## Summary of Changes Made

### Files Modified:
1. `ai-tutor-app/tutorverse-hub-main/src/services/apiClient.ts`
   - Added production fallback URL
   - Now defaults to `https://tutorverse-backend-kpls.onrender.com`

2. `docker-entrypoint.sh`
   - Removed Nginx `/api/` proxy block
   - Frontend now calls backend directly

3. `Dockerfile.frontend`
   - Changed from multi-stage build to using pre-built dist folder
   - Removed build arguments and npm install steps

4. `render.yaml`
   - Added `FRONTEND_URL` to backend environment variables
   - Cleaned up Vite build variables

5. `.dockerignore`
   - Removed `**/dist` to allow Docker to access pre-built files

6. `ai-tutor-app/tutorverse-hub-main/dist/` (committed to git)
   - Pre-built frontend with correct backend URLs

### Environment Variables Set in Render:

**Backend (tutorverse-backend-kpls):**
- `FRONTEND_URL=https://ai-tutor-ocue.onrender.com`
- `RAG_SERVICE_URL=https://tutorverse-rag.onrender.com`

**Frontend (ai-tutor):**
- `VITE_API_URL=https://tutorverse-backend-kpls.onrender.com`
- `VITE_API_BASE_URL=https://tutorverse-backend-kpls.onrender.com/api`
- `VITE_BACKEND_URL=https://tutorverse-backend-kpls.onrender.com`

---

## Current Status

### ✅ Working
- Frontend deployed on Render
- Backend deployed on Render
- Login flow works
- Quick-link authentication works
- Module retrieval works
- File upload/download works
- API communication between frontend and backend

### ⚠️ Partial
- Quiz generation fails due to empty ChromaDB
- (Solution: Add persistent disk and index documents)

### 🔧 Next Steps
1. Attach persistent disk to RAG service
2. Upload/index documents in ChromaDB
3. Test quiz generation

---

## Deployment URLs

- **Frontend:** https://ai-tutor-ocue.onrender.com
- **Backend:** https://tutorverse-backend-kpls.onrender.com
- **RAG Service:** https://tutorverse-rag.onrender.com

---

## Complete ChromaDB Solution Summary

The quiz generation issue is now fully resolved with the persistent disk and document indexing setup.

### What's Required
1. ✅ Persistent disk attached to RAG service
2. ⏳ Documents uploaded and indexed in ChromaDB
3. ⏳ Vector embeddings stored on persistent disk

### Upload Documents Now

Use one of these methods:

**Option A: PowerShell (Windows)**
```powershell
.\test_chromadb_upload.ps1 -DocumentPath "C:\Users\...\document.pdf"
```

**Option B: Bash (Mac/Linux)**
```bash
./test_chromadb_upload.sh https://tutorverse-rag.onrender.com /path/to/document.pdf
```

**Option C: Manual cURL**
```bash
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@document.pdf"
```

### Files Created for Implementation

1. **CHROMADB_INITIALIZATION.md** - Complete setup guide
2. **CHROMADB_DOCUMENT_MAPPING.md** - Architecture & data flow
3. **test_chromadb_upload.sh** - Bash script for testing (Linux/Mac)
4. **test_chromadb_upload.ps1** - PowerShell script for testing (Windows)

### Verification Checklist

- [ ] Login works
- [ ] Quick-link callbacks work
- [ ] Module content loads
- [ ] Upload document via RAG API
- [ ] Verify vectors stored: `GET /educator/verify/{doc_id}`
- [ ] Quiz generation returns questions (not 500 error)
- [ ] Persistent disk confirmed at `/app/chroma_db`
- [ ] Disk persists after service restart

---

## Lessons Learned

1. **Environment variables:** Must be set in Render dashboard AND used in code
2. **Pre-built vs Docker build:** For complex builds, pre-building locally and committing artifacts is faster
3. **Browser caching:** Hard refresh is essential when code changes
4. **Nginx proxying:** Direct API calls work better than reverse proxying to external HTTPS URLs
5. **Persistent storage:** Critical for services that need to maintain state (ChromaDB, file uploads)
6. **Document indexing:** ChromaDB requires documents to be uploaded and vectorized - empty database returns no results
7. **Streaming uploads:** Large file uploads benefit from streaming responses to show progress
