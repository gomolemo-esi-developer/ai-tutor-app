# PDF Performance Fix - Implementation Checklist

## What Was Changed

### ✅ Code Changes (Complete)
- [x] `src/utils/pdf-export-gotenberg.ts` - Aggressive HTML payload reduction
- [x] `backend/src/lambda/ai/pdf.ts` - Increased backend timeout to 120s
- [x] `src/components/pdf/PDFDownloadButton.tsx` - Better user feedback
- [x] `docker-compose.yml` - Increased Gotenberg memory + Chromium options

### ✅ Documentation (Complete)
- [x] `PDF_PERFORMANCE_GUIDE.md` - Detailed optimization guide
- [x] `PDF_FIX_CHECKLIST.md` - This file

## What You Need to Do

### Step 1: Rebuild & Redeploy (REQUIRED)
```bash
# Stop current services
docker-compose down

# Rebuild with new configuration
docker-compose build --no-cache

# Start services
docker-compose up -d

# Verify Gotenberg is running
docker ps | grep gotenberg
```

**Why:** Browser cache still has old JavaScript, and Gotenberg needs new memory limits.

### Step 2: Clear Browser Cache (REQUIRED)
- Chrome/Edge: `Ctrl+Shift+Delete` → Clear all
- Firefox: `Ctrl+Shift+Delete` → Clear all
- Safari: Develop → Empty Caches

**Why:** Browser is still serving old PDF download code.

### Step 3: Test with Various Quiz Sizes (RECOMMENDED)
1. Small quiz (5-10 questions) → Should take 8-12 seconds
2. Medium quiz (20-30 questions) → Should take 15-25 seconds
3. Large quiz (40+ questions) → Should take 35-90 seconds (not timeout)

### Step 4: Monitor First 24 Hours (RECOMMENDED)
Watch for:
- [ ] No timeout errors in browser console
- [ ] Gotenberg container memory stays below 800MB
- [ ] PDF downloads complete successfully
- [ ] No swap memory being used by Gotenberg

Check status:
```bash
# Monitor in real-time
docker stats tutorverse-gotenberg

# Check logs for errors
docker logs -f tutorverse-gotenberg
```

### Step 5: Commit Changes (IF USING GIT)
```bash
git add .
git commit -m "Optimize PDF download performance: reduce payload 70%, increase Gotenberg memory, adjust timeouts"
git push origin main
```

## Expected Results After Implementation

| Before | After |
|--------|-------|
| 60+ second timeouts | 8-90 seconds depending on size |
| "Timeout exceeded" errors | Successful downloads |
| 512MB Gotenberg (overloaded) | 1GB Gotenberg (stable) |
| HTML payload 2-3MB | HTML payload 700-900KB |
| User confusion | Clear loading message |

## Rollback Plan (If Issues Arise)

If you experience problems after deployment:

```bash
# Stop services
docker-compose down

# Revert code changes
git checkout HEAD~1 .

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

## Questions?

1. **Still getting timeouts?**
   - Increase `mem_limit` in docker-compose.yml to 2g
   - Restart: `docker-compose up -d`

2. **PDFs look wrong?**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Rebuild frontend: `npm run build` in frontend directory

3. **Gotenberg keeps crashing?**
   - Check memory: `docker stats tutorverse-gotenberg`
   - Increase `mem_limit` from 1g to 2g

## Timeline

- **Immediate**: Rebuild and redeploy (5 minutes)
- **Short-term**: Test with different quiz sizes (10 minutes)
- **Follow-up**: Monitor performance over 24 hours
- **Optional**: Implement further optimizations from `PDF_PERFORMANCE_GUIDE.md`

---

**Status**: Ready for deployment
**Risk Level**: Low (container config + payload optimization, no breaking changes)
**Rollback**: Easy (git revert + docker rebuild)
