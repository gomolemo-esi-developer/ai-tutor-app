# Video Upload Timeout Fixes

## Problem
Video files were failing to upload to the RAG service with "stream has been aborted" errors. The issue was caused by timeout settings that were too short for video transcription processing.

## Root Cause
- **Nginx proxy timeout**: 300 seconds (5 minutes) - too short for video transcription
- **Axios/RAG timeout**: 120 seconds (2 minutes) - far too short
- **Stream processing**: Video-to-text transcription with Whisper can take 30-60 seconds per 10MB

## Changes Made

### 1. Nginx Configuration (`nginx.conf`)
- **Before**: `proxy_read_timeout 300s;` (5 minutes)
- **After**: `proxy_read_timeout 900s;` (15 minutes)
- **Before**: `proxy_send_timeout 300s;` (5 minutes)
- **After**: `proxy_send_timeout 900s;` (15 minutes)
- **Before**: `proxy_connect_timeout 60s;`
- **After**: `proxy_connect_timeout 120s;` (doubled for safety)

### 2. Backend RAG Config (`backend/src/config/rag.config.ts`)
- **Before**: Default timeout `120000ms` (2 minutes)
- **After**: Default timeout `900000ms` (15 minutes)
- **Before**: Default retry delay `1000ms`
- **After**: Default retry delay `2000ms` (longer delay between retries for streaming)

### 3. Frontend EducatorService (`tutorverse-hub-main/src/services/EducatorService.ts`)
- **Before**: `timeout: 10 * 60 * 1000` (10 minutes)
- **After**: `timeout: 15 * 60 * 1000` (15 minutes)

### 4. Backend RAG Service (`backend/src/services/rag.service.ts`)
- Added explicit timeout override per request for video uploads
- Improved error logging and retry logic
- Better handling of stream abort errors

## Environment Variables to Update

Make sure these are set in your `.env.backend` file:

```bash
# RAG Service Configuration
RAG_TIMEOUT=900000                 # 15 minutes in milliseconds
RAG_RETRY_DELAY_MS=2000          # 2 seconds between retries
RAG_RETRY_ATTEMPTS=3              # Number of retries
```

If not set, the defaults are now:
- `RAG_TIMEOUT`: 900000 (15 minutes)
- `RAG_RETRY_DELAY_MS`: 2000 (2 seconds)
- `RAG_RETRY_ATTEMPTS`: 3

## Expected Behavior After Fix

For a 10MB video file:
1. File uploaded to S3 (fast)
2. RAG service processes file:
   - Video → Audio conversion: ~5-10 seconds
   - Audio → Text transcription (Whisper): ~30-60 seconds
   - Text chunking: ~5 seconds
   - Embedding generation: ~10-30 seconds
   - Database storage: ~5 seconds
3. Total expected time: 60-120 seconds per 10MB file
4. With 3 retries and exponential backoff, complete timeout: 15 minutes

## Testing

To test large video uploads:

1. **Small test (1-2 MB)**: Should complete in 30-60 seconds
2. **Medium test (5-10 MB)**: Should complete in 2-5 minutes
3. **Large test (20+ MB)**: Should complete in 5-10 minutes

Monitor the logs for:
```
[RAG] Upload attempt 1/3
[RAG] Converting video file: ...
✅ Transcribed ... (chars)
[RAG] Upload successful
```

If you see "stream has been aborted" errors, the issue is likely:
1. RAG service is overloaded (check RAG service logs)
2. Network connectivity issues (check Docker/cloud network settings)
3. Disk space issues on the RAG service container

## Rollback

If these changes cause issues:
1. Revert timeout values in `nginx.conf`, `rag.config.ts`, and `EducatorService.ts`
2. Reset `.env.backend` to previous values
3. Rebuild and redeploy containers
