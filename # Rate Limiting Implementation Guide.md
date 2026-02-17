# Rate Limiting Implementation Guide

## Overview

Rate limiting protects your application from abuse and uncontrolled costs by restricting how many requests a user or IP address can make within a specific time window.

**Why this matters for your app:**
- **Cost control**: Prevents attackers from making thousands of API calls that drive up hosting costs
- **Security**: Blocks brute force attacks on login/registration
- **Performance**: Prevents server overload from request floods
- **Fair usage**: Ensures all users get fair access to resources

---

## What Was Added

### 1. New Dependency
**File**: `backend/package.json`

Added `express-rate-limit` library - the industry standard for rate limiting in Express.js applications.

```json
"express-rate-limit": "^7.1.5"
```

**Install with**: `npm install`

---

### 2. Rate Limiting Middleware
**File**: `backend/src/middleware/rate-limit.middleware.ts` (NEW)

This file defines 5 different rate limiters, each with different rules for different types of endpoints.

---

## The 5 Rate Limiters Explained

### 1. **General Limiter** - All Endpoints
```typescript
windowMs: 15 * 60 * 1000,  // 15 minutes
max: 100,                   // 100 requests per window
```

**Applied to**: Every single request to your API (global fallback)

**How it works**: 
- Limits each IP address to 100 requests per 15 minutes
- Example: If someone makes 100 requests from IP `192.168.1.1`, requests #101 onwards are blocked until the 15-minute window expires

**What it prevents**: General spam, basic DDoS attempts

**Who it affects**: Legitimate users won't hit this limit (100 requests in 15 min = ~0.1 req/second)

---

### 2. **Auth Limiter** - Login/Register/Verification
```typescript
windowMs: 15 * 60 * 1000,  // 15 minutes
max: 5,                     // 5 attempts per window
keyGenerator: req.body?.email  // Limit by email, not IP
```

**Applied to**:
- `/api/auth/register` (POST)
- `/api/auth/login` (POST)
- `/api/auth/refresh` (POST)
- `/api/auth/verify-email` (POST)
- `/api/auth/register-activation` (POST)
- `/api/auth/verify-activation` (POST)
- `/api/auth/check-activation/:staffNumber` (GET)

**How it works**:
- Limits to **5 attempts per email address per 15 minutes**
- Tracks by email instead of IP (smarter than IP-based)
- After 5 failed login attempts, that email is blocked for 15 minutes

**What it prevents**: 
- Brute force password guessing attacks
- Automated credential stuffing

**Example scenario**:
```
Time: 10:00 AM
Attacker tries: user@example.com with wrong password (attempt 1)
Attacker tries: user@example.com with wrong password (attempt 2)
... (attempts 3, 4, 5)
Attacker tries: user@example.com with wrong password (attempt 6)
❌ BLOCKED: "Too many authentication attempts"
```

---

### 3. **Chat Limiter** - AI Chat Messages
```typescript
windowMs: 60 * 1000,        // 1 minute
max: 30,                    // 30 requests per minute
keyGenerator: req.userId    // Limit by authenticated user
```

**Applied to**:
- `/api/chat` (POST, GET) - Create/list chat sessions
- `/api/chat/:sessionId` (GET, DELETE) - Get/delete specific chat
- `/api/chat/:sessionId/messages` (GET, POST) - View/send messages

**How it works**:
- Limits each **authenticated user** to 30 requests per minute
- Tracks by user ID (only works for logged-in users)
- Prevents one student from spamming the AI tutor

**What it prevents**: 
- Expensive AI API calls that drive up costs
- Resource hogging (AI responses use CPU)

**Example scenario**:
```
Student A sends 30 messages in 1 minute
Student A tries to send message #31
❌ BLOCKED: "Too many chat requests, please slow down"
⏳ Unblocks after 1 minute has passed
```

**Why 30/min?** 
- Real students naturally send 1-2 messages per minute
- 30/min = 1800 messages/hour = clearly abusive

---

### 4. **Quiz Limiter** - Quiz Generation/Submission
```typescript
windowMs: 60 * 1000,        // 1 minute
max: 10,                    // 10 requests per minute
keyGenerator: req.userId    // Limit by authenticated user
```

**Applied to**:
- `/api/quiz/generate` (POST) - Generate quiz
- `/api/quiz/:quizId` (GET) - Retrieve quiz
- `/api/quiz/:quizId/submit` (POST) - Submit answers
- `/api/summary/generate` (POST) - Generate summary

**How it works**:
- Limits each **authenticated user** to 10 requests per minute
- Stricter than chat (10 vs 30) because quiz generation is more expensive

**What it prevents**: 
- Spamming quiz generation
- Overloading summarization service

---

### 5. **Upload Limiter** - File Uploads
```typescript
windowMs: 10 * 60 * 1000,   // 10 minutes
max: 5,                      // 5 uploads per window
keyGenerator: req.userId    // Limit by authenticated user
```

**Applied to**:
- `/api/educator/files` (POST) - Upload course materials

**How it works**:
- Limits each **authenticated educator** to 5 uploads per 10 minutes
- Prevents storage quota abuse and bandwidth waste

**What it prevents**: 
- Filling up storage with spam files
- Overwhelming the upload service

---

## Error Responses

When a user hits a rate limit, they receive:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Too many authentication attempts, please try again later"
}
```

The `429` HTTP status code is the standard "Too Many Requests" response.

---

## How Rate Limiting Works Under the Hood

### Memory-Based Counting

The current implementation stores rate limit counters **in memory** (RAM). This works great for development and single-server deployments:

```
When request arrives:
1. Extract the "key" (IP, user ID, or email)
2. Check how many requests from that key in current window
3. If count < max: allow request, increment counter
4. If count >= max: block request with 429 status
5. Reset counter when time window expires
```

### Time Windows

Each limiter has its own sliding window:

```
Chat Limiter (30 req/min):
|-------- 1 minute window --------|
Request 1  ✅
Request 2  ✅
...
Request 30 ✅
Request 31 ❌ (blocked until window slides)

After 1 second, the oldest request falls out of the window
So new room opens up for new requests
```

---

## Testing Rate Limits

### 1. Test Auth Limiter (5 attempts/15min)

```bash
# Attempt 1-5: Should succeed or fail based on password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Attempt 6: Should get 429
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Response:
# HTTP 429
# "Too many authentication attempts, please try again later"
```

### 2. Test General Limiter (100 req/15min)

```bash
# Loop that makes 101 requests
for i in {1..101}; do
  curl http://localhost:3000/health
done

# Request #101 will get 429
```

### 3. Test Chat Limiter (30 req/min)

```bash
# Make 30 chat requests with valid auth token
for i in {1..30}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"moduleId":"module1"}'
done

# Request #31 will get 429
```

---

## Customizing Rate Limits

Edit `backend/src/middleware/rate-limit.middleware.ts` to change limits:

### Example: Make Auth Limiter Stricter
```typescript
// Change from 5 to 3 attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,  // ← Changed from 5 to 3
  // ... rest stays the same
});
```

### Example: Make Chat Limiter More Lenient
```typescript
// Change from 30 to 60 requests per minute
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,  // ← Changed from 30 to 60
  // ... rest stays the same
});
```

### Example: Change Time Windows
```typescript
// Change from 15 minutes to 30 minutes
export const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,  // ← Changed from 15*60*1000
  max: 5,
  // ... rest stays the same
});
```

---

## Production Considerations

### Current Limitation: In-Memory Storage
⚠️ **Issue**: Rate limit counters are stored in server memory
- Each server instance has its own counters
- If you have multiple servers, limits aren't shared
- Server restart clears all counters

### Solution for Multi-Server Deployments
For production with multiple servers, use a distributed store:

**Option 1: Redis** (Recommended)
```typescript
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
});
```

**Option 2: MongoDB**
```typescript
import MongoStore from 'rate-limit-mongo';

export const authLimiter = rateLimit({
  store: new MongoStore({
    uri: 'mongodb://localhost:27017',
    expireTimeMs: 15 * 60 * 1000,
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
});
```

**For your current Render deployment**: If using Render's managed services, add Redis or PostgreSQL store later when scaling.

---

## Monitoring & Alerts

### Log Rate Limit Violations

Add logging to `rate-limit.middleware.ts`:

```typescript
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  handler: (req, res) => {
    LoggerUtil.warn('Rate limit exceeded', {
      path: req.path,
      userId: req.userId,
      ip: req.ip,
    });
    res.status(429).json({ error: 'Too many requests' });
  },
});
```

### Monitor for Attacks

Track 429 responses in your logs:
```bash
# Find IPs making too many requests
grep "429" your-api.log | grep -o '"ip":"[^"]*"' | sort | uniq -c | sort -rn
```

---

## FAQ

### Q: Will this affect legitimate users?
**A**: No. Normal usage patterns are well below all limits:
- Normal login: 1 attempt (5 allowed per 15min)
- Normal chat: 1-2 messages per minute (30 allowed)
- Normal file upload: 1-2 per session (5 allowed per 10min)

### Q: Can I allow certain users to have higher limits?
**A**: Yes, add a check in the middleware:
```typescript
export const chatLimiter = rateLimit({
  skip: (req) => req.role === 'ADMIN',  // Skip for admins
  windowMs: 60 * 1000,
  max: 30,
});
```

### Q: What if a user legitimately needs more requests?
**A**: Contact you to upgrade their tier or temporarily whitelist them:
```typescript
skip: (req) => {
  const whitelistedUsers = ['premium-user-id-123'];
  return whitelistedUsers.includes(req.userId);
}
```

### Q: How do I remove rate limiting?
**A**: Remove the limiter middleware from the route:
```typescript
// Old:
app.post('/api/chat', authMiddleware, chatLimiter, handler);

// New (without limiter):
app.post('/api/chat', authMiddleware, handler);
```

---

## Summary

| Limiter | Applies To | Limit | Tracks By | Purpose |
|---------|-----------|-------|-----------|---------|
| **General** | All endpoints | 100 req/15min | IP | Baseline protection |
| **Auth** | Login/Register | 5 attempts/15min | Email | Brute force protection |
| **Chat** | AI messages | 30 req/min | User ID | Cost control |
| **Quiz** | Quiz generation | 10 req/min | User ID | Cost control |
| **Upload** | File uploads | 5 uploads/10min | User ID | Storage protection |

---

## Next Steps

1. **Test locally**: Run `npm install` and test rate limits before deploying
2. **Deploy**: Push to Render
3. **Monitor**: Watch logs for 429 errors (indicates abuse)
4. **Adjust**: Tweak limits based on real usage patterns
5. **Scale**: Move to Redis store when you have multiple servers