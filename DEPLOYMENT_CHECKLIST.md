# Video Upload Fix - Deployment Checklist

## Changes Applied
✅ Nginx proxy timeouts increased from 300s to 900s (15 minutes)
✅ Backend RAG config timeout increased from 120s to 900s (15 minutes)
✅ Frontend upload timeout increased from 600s to 900s (15 minutes)
✅ Retry delay improved for better streaming support
✅ Enhanced logging for debugging stream abort errors

## Pre-Deployment Steps

### 1. Verify Code Changes
- [ ] Check `nginx.conf` for timeout changes (lines 35-39)
- [ ] Check `backend/src/config/rag.config.ts` for timeout defaults (lines 16, 48, 52)
- [ ] Check `tutorverse-hub-main/src/services/EducatorService.ts` for frontend timeout (line 334)
- [ ] Check `backend/src/services/rag.service.ts` for retry logic improvements

### 2. Update Environment Variables
Update `.env.backend` with these values:
```bash
RAG_TIMEOUT=900000              # 15 minutes in milliseconds
RAG_RETRY_DELAY_MS=2000        # 2 seconds between retries
RAG_RETRY_ATTEMPTS=3            # Keep at 3 retries
```

### 3. Build and Test Locally
```bash
# Rebuild backend
npm run build:backend

# Rebuild frontend
npm run build:frontend

# Start containers
docker-compose up --build

# Monitor logs
docker-compose logs -f backend rag frontend
```

## Deployment Steps

### Option A: Docker Compose (Local/Staging)
1. Update environment variables in `.env.backend`
2. Run: `docker-compose down`
3. Run: `docker-compose up --build`
4. Wait for services to be ready (~2-3 minutes)

### Option B: Render.com (Production)
1. Update `.env.backend` with new timeout values
2. Commit changes to Git
3. Push to main branch (triggers auto-deployment)
4. Monitor Render dashboard for build/deploy status
5. Check application logs after deployment

## Testing Checklist

### Basic Tests
- [ ] Upload small text file (< 1 MB) - should complete in 10-20 seconds
- [ ] Upload small video (< 5 MB) - should complete in 2-3 minutes
- [ ] Upload medium video (5-10 MB) - should complete in 4-5 minutes
- [ ] Check browser console for errors
- [ ] Check backend logs for "[RAG] Upload successful"

### Stress Tests (Optional)
- [ ] Try uploading large video (20+ MB) - should complete in 10-15 minutes
- [ ] Check database for chunks being created
- [ ] Verify RAG document processing completes fully
- [ ] Test chat/search on uploaded content

### Monitoring
1. **Check Render Logs** (if using Render.com):
   - Look for "proxy_read_timeout" messages
   - Verify no "stream has been aborted" errors
   - Confirm "[RAG] Upload successful" messages

2. **Check Backend Logs**:
   ```
   [RAG] Upload attempt 1/3
   Converting video file: ...
   ✅ Transcribed ... chars
   [RAG] Upload successful
   ```

3. **Check Database**:
   - Verify file records are created with `ragDocumentId`
   - Verify chunks are stored in Chroma database

## Rollback Plan

If issues occur:

1. **Quick Rollback (5 minutes)**:
   ```bash
   git revert HEAD
   git push
   # Services auto-redeploy on Render
   ```

2. **Manual Rollback**:
   ```bash
   # Revert specific files
   git checkout HEAD~1 -- nginx.conf
   git checkout HEAD~1 -- ai-tutor-app/backend/src/config/rag.config.ts
   git checkout HEAD~1 -- ai-tutor-app/tutorverse-hub-main/src/services/EducatorService.ts
   
   git commit -m "Revert timeout fixes"
   git push
   ```

## Monitoring After Deployment

### Logs to Monitor
```
# Backend logs
[RAG] Upload attempt 1/3
[RAG] Upload failed
[RAG] Upload successful
proxy_read_timeout exceeded

# Frontend logs
📤 Starting file upload
Failed to save file
File metadata saved
```

### Success Indicators
- ✅ Video files upload without timeout errors
- ✅ RAG document chunks are created
- ✅ Document search/chat works on uploaded content
- ✅ No "stream has been aborted" errors in logs

### Issues to Watch For
- ❌ "stream has been aborted" - check RAG service health
- ❌ "proxy_read_timeout" - indicates timeout still too short
- ❌ "RAG response is empty" - check RAG service logs
- ❌ Database constraints - ensure database has disk space

## Performance Metrics

Expected upload times (approximate):
- 1 MB file: 30-45 seconds
- 5 MB file: 2-3 minutes
- 10 MB file: 4-6 minutes
- 20 MB file: 8-12 minutes

If uploads take longer than expected:
1. Check RAG service logs for transcription issues
2. Verify disk space on RAG service container
3. Check network connectivity between services
4. Monitor CPU/memory usage during transcription

## Support

If issues persist after deployment:
1. Check TIMEOUT_FIXES.md for detailed explanation
2. Review RAG service logs: `docker logs rag`
3. Check Render dashboard for service health
4. Review FFmpeg/Whisper installation in RAG service

## Sign-Off

- [ ] Code reviewed and approved
- [ ] Environment variables updated
- [ ] Containers built successfully
- [ ] Basic tests passed
- [ ] Ready for production deployment
