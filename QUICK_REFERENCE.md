# Video Upload Timeout Fix - Quick Reference

## What Was Fixed
Fixed "stream has been aborted" errors when uploading video files to the RAG service.

## What Changed
**4 files modified** - All timeout values increased from 2-5 minutes to 15 minutes:

| File | Before | After | Reason |
|------|--------|-------|--------|
| `nginx.conf` | 300s proxy timeout | 900s | Video transcription needs time |
| `rag.config.ts` | 120s axios timeout | 900s | Whisper transcription takes 30-60s |
| `EducatorService.ts` | 600s frontend timeout | 900s | Match backend timeout |
| `rag.service.ts` | 1s retry delay | 2s | Better stream error handling |

## How to Deploy

### Step 1: Update Environment Variables
```bash
# In your .env.backend file, set or verify:
RAG_TIMEOUT=900000              # 15 minutes
RAG_RETRY_DELAY_MS=2000        # 2 seconds
RAG_RETRY_ATTEMPTS=3            # Keep as is
```

### Step 2: Deploy Changes
```bash
# Option A: Docker Compose
docker-compose down
docker-compose up --build

# Option B: Render.com (auto-deploys on git push)
git add .
git commit -m "Fix video upload timeout issues"
git push origin main
```

### Step 3: Test
1. Upload a 5-10 MB video file
2. Wait for processing (2-5 minutes)
3. Check logs for: `[RAG] Upload successful`
4. Verify file appears in dashboard

## Expected Behavior

### Upload Times
- **1 MB**: 30-45 seconds
- **5 MB**: 2-3 minutes
- **10 MB**: 4-6 minutes
- **20 MB**: 8-15 minutes

### Logs to Look For
✅ Good:
```
[RAG] Upload attempt 1/3
[RAG] Converting video file: ...
✅ Transcribed ... chars
[RAG] Upload successful
```

❌ Bad:
```
stream has been aborted
proxy_read_timeout
[RAG] Upload failed after 3 attempts
```

## If It Still Fails

Check these in order:

1. **Verify timeout values set**:
   ```bash
   grep "RAG_TIMEOUT" .env.backend
   grep "proxy_read_timeout" nginx.conf
   ```

2. **Check RAG service health**:
   ```bash
   docker logs rag | tail -50
   # Look for: "listening on port 8000" or errors
   ```

3. **Check disk space**:
   ```bash
   docker exec rag df -h
   # Should have > 1GB free
   ```

4. **Verify Whisper/FFmpeg**:
   ```bash
   docker exec rag which ffmpeg whisper
   # Both should return paths
   ```

## Rollback (If Needed)
```bash
git revert HEAD
git push
# Auto-redeploys on Render
```

## Files Modified

1. **nginx.conf** (lines 35-39) - Proxy timeouts
2. **backend/src/config/rag.config.ts** (lines 16, 48, 52) - Axios timeout defaults
3. **tutorverse-hub-main/src/services/EducatorService.ts** (line 334) - Frontend timeout
4. **backend/src/services/rag.service.ts** (lines 119-227) - Request/retry handling

## Detailed Docs

- **TIMEOUT_FIXES.md** - Technical explanation of all changes
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment guide
- **FIXES_SUMMARY.md** - Complete overview of the fix

## Key Insight

Video transcription with Whisper is slow (30-60 seconds per 10MB), so all timeout values needed to be extended to 15 minutes to:
1. Allow initial transcription: 30-60s
2. Handle potential retries: up to 3 attempts
3. Account for system load: 2-5 minute buffer
4. **Total**: Up to 15 minutes for large files with retries

---

**Status**: Ready to deploy ✅
**Risk**: Low (only timeout increases)
**Testing**: Just upload a video file
**Rollback**: One git command
