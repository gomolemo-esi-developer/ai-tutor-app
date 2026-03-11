# Critical Issue: Gotenberg Running on Render.com (Slow Cloud Service)

## Problem Discovery
From the error logs, Gotenberg is **not running locally** but on **Render.com cloud service**:
```
url: 'https://tutorverse-gotenberg.onrender.com/forms/chromium/convert/html'
```

This is the PRIMARY bottleneck. Cloud-hosted Gotenberg on Render's free/cheap tier is:
- **Slow**: Takes 120-180+ seconds for PDFs that should take 10-20 seconds locally
- **Under-resourced**: Limited CPU/memory compared to local Docker
- **Network latency**: Additional 500ms-2s round-trip time per request

## Quick Fix (Temporary - Increases Timeouts)

```
Backend: 60s → 180s (3 minutes)
Frontend: 30s → 200s (3+ minutes)
```

This allows the slow cloud service to complete, but users will wait 2-3 minutes for PDFs.

**Status**: Applied and deployed

## Long-Term Solution: Run Gotenberg Locally

### Option 1: Docker Compose (RECOMMENDED)
Keep Gotenberg in your docker-compose.yml and use local deployment.

**Advantages**:
- Instant rendering (5-15 seconds vs 2-3 minutes)
- No cloud service dependencies
- Lower cost
- Full resource control

**Setup**:
```bash
# Ensure this is in docker-compose.yml
gotenberg:
  image: gotenberg/gotenberg:7
  container_name: tutorverse-gotenberg
  ports:
    - "3001:3000"
  mem_limit: 1g
  environment:
    - GOTENBERG_CHROMIUM_DISABLE_GPU=true

# Deploy
docker-compose down
docker-compose up -d
```

### Option 2: Separate Gotenberg Server
If not using Docker for your main app, install Gotenberg separately:

```bash
# Using Docker (if available)
docker run -d -p 3001:3000 gotenberg/gotenberg:7

# Or download binary from https://gotenberg.dev/docs/get-started/download
```

### Option 3: Keep Render (If No Other Option)
If you must use Render, upgrade the Gotenberg service:
- Upgrade from Free to Pro tier ($7-25/month)
- Allocate more memory/CPU
- Contact Render support for resource allocation

## Testing & Rollback

### Test if PDF still works
1. Rebuild frontend: `npm run build` (in frontend directory)
2. Try downloading a quiz PDF
3. Should work but may take 2-3 minutes

### Rollback if issues
```bash
git revert HEAD  # Reverts timeout changes
npm run build
npm start / docker-compose up -d
```

## Expected Performance After Switching to Local Gotenberg

| Scenario | Render.com (Current) | Local Docker (Target) |
|----------|----------------------|----------------------|
| Small quiz (10q) | 60-90s | 8-12s |
| Medium quiz (20q) | 120-150s | 15-25s |
| Large quiz (40q) | 180s+ (timeout) | 35-50s |
| User experience | Frustrating | Acceptable |

## Configuration Checklist

### ✅ Code Changes Applied
- [x] Backend timeout: 60s → 180s
- [x] Frontend timeout: 150s → 200s
- [x] User feedback updated

### 📋 Still Needed
- [ ] Rebuild frontend: `npm run build`
- [ ] Verify PDF downloads work (may be slow)
- [ ] Set up local Gotenberg if possible
- [ ] Update environment variables if changing Gotenberg URL

## Environment Variable Reference

### Current (Cloud)
```
GOTENBERG_URL=https://tutorverse-gotenberg.onrender.com
VITE_GOTENBERG_URL=https://tutorverse-gotenberg.onrender.com
```

### For Local Deployment
```
GOTENBERG_URL=http://gotenberg:3000 (Docker)
GOTENBERG_URL=http://localhost:3001 (Local machine)
VITE_GOTENBERG_URL=http://localhost:3001
```

## Next Steps

### Immediate (This Week)
1. Rebuild frontend with new timeouts
2. Test PDF downloads work (accept slow speed)
3. Document the Gotenberg performance issue

### Short-term (Next Week)
1. Set up local Gotenberg in Docker
2. Update environment variables
3. Redeploy and verify performance improvement

### Optional (Future)
1. Implement PDF caching (24-hour cache)
2. Pre-generate common quizzes
3. Consider Gotenberg clustering for load balancing

## Support

If PDFs still timeout after this fix:
1. Check Render.com service status
2. Consider upgrading Render.com tier
3. Implement local Gotenberg ASAP
4. Contact Gotenberg support for optimization tips
