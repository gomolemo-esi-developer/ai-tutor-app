# TutorVerse Deployment to Render.com

This guide walks you through deploying all three services (Frontend, Backend, RAG) to Render.com.

## Prerequisites

1. **GitHub Account**: Repository must be pushed to GitHub (public or private)
2. **Render Account**: Create free account at https://render.com
3. **Environment Variables**: Prepare all required `.env` variables

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

Your repository must be publicly accessible or Render must have access to your private repos.

## Step 2: Create Render Services

You need to create **3 separate services** on Render.com:

### A. Deploy RAG Service First (Backend Dependency)

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `tutorverse-rag` |
| **Environment** | Docker |
| **Region** | Choose closest to you |
| **Branch** | main |
| **Build Command** | (leave empty, uses Dockerfile) |
| **Dockerfile Path** | `./Dockerfile.rag` |
| **Start Command** | (leave empty, uses Dockerfile) |

5. **Important: Under Advanced → Docker:**
   - Runtime: `Linux`
   - Dockerfile Context: `.` (root)

6. **Environment Variables** (Advanced tab):
   ```
   OPENAI_API_KEY=<your_openai_api_key>
   ENVIRONMENT=production
   PYTHONUNBUFFERED=1
   CHROMA_PERSIST_DIR=/app/chroma_db
   ```

7. **Instance Type**: Free or Starter (depending on needs)

8. Click **Create Web Service**

⏳ **Wait for RAG service to finish deploying** (5-10 minutes)

### B. Deploy Backend Service

1. Click **New +** → **Web Service**
2. Connect repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `tutorverse-backend` |
| **Environment** | Docker |
| **Region** | Same as RAG service |
| **Branch** | main |
| **Dockerfile Path** | `./Dockerfile.backend` |

4. **Environment Variables** (Advanced tab):
   ```
   NODE_ENV=production
   AWS_REGION=us-east-2
   ENVIRONMENT=production
   RAG_SERVICE_URL=https://tutorverse-rag.onrender.com
   RAG_ENABLE=true
   RAG_TIMEOUT=30000
   RAG_RETRY_ATTEMPTS=3
   ```

   *Replace `tutorverse-rag.onrender.com` with your actual RAG service URL from Step A*

5. **Port**: 3000 (should auto-detect from Dockerfile)

6. Click **Create Web Service**

⏳ **Wait for Backend service to finish deploying**

### C. Deploy Frontend Service

1. Click **New +** → **Web Service**
2. Connect repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `tutorverse-frontend` |
| **Environment** | Docker |
| **Region** | Same as other services |
| **Branch** | main |
| **Dockerfile Path** | `./Dockerfile.frontend` |

4. **Environment Variables** (Advanced tab):
   ```
   VITE_API_URL=https://tutorverse-backend.onrender.com
   NODE_ENV=production
   ```

   *Replace `tutorverse-backend.onrender.com` with your actual backend service URL from Step B*

5. **Port**: 3000

6. Click **Create Web Service**

## Step 3: Verify Deployments

Once all services finish deploying:

1. **Check service health:**
   - Frontend: Visit `https://tutorverse-frontend.onrender.com`
   - Backend health: `https://tutorverse-backend.onrender.com/health`
   - RAG health: `https://tutorverse-rag.onrender.com/health`

2. **View logs** in Render dashboard (Logs tab for each service)

3. **Test API endpoints** using cURL or Postman

## Step 4: Monitor & Manage

### Important Settings

1. **Auto-deploy on Push**: Enabled by default (redeploy on git push)
2. **Health Checks**: Configured in Dockerfiles
3. **Resource Limits**: Free tier has limits; upgrade Instance Type if needed

### Useful Commands

Monitor via Render Dashboard:
- **Metrics**: CPU, Memory, Disk usage
- **Logs**: Real-time service logs
- **Events**: Deployment history
- **Environment**: Manage variables without redeployment

## Troubleshooting

### Services Not Starting

1. **Check logs**: Dashboard → Service → Logs tab
2. **Common issues**:
   - Missing environment variables
   - Image build failures
   - Port conflicts

### Health Checks Failing

1. Verify health endpoints exist:
   - Backend: `GET /health`
   - RAG: `GET /health`
2. Check service logs for errors
3. Ensure RAG service URL is correct in Backend

### Services Can't Communicate

1. Use full HTTPS URLs (not localhost):
   - `https://tutorverse-rag.onrender.com` (NOT `http://localhost:8000`)
2. Verify environment variables point to correct URLs
3. Check CORS settings if frontend can't reach backend

### Database/Volume Issues

Render's free tier has limitations:
- No persistent volumes (data lost on redeploy)
- 0.5 GB storage limit per service
- If you need persistent data, upgrade to paid tier or use external database

### Timeout Issues

If deployments timeout (>60 minutes):
1. Check build logs for stuck processes
2. Reduce image size by removing unnecessary dependencies
3. Upgrade to faster instance tier

## Cost Optimization

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Frontend** | ✅ Sufficient | Static files only |
| **Backend** | ⚠️ Limited | 512MB RAM may be tight |
| **RAG** | ❌ Not recommended | Needs more resources for ML |

**Recommendation**: 
- Frontend: Free tier
- Backend: Starter ($12/month minimum)
- RAG: Standard or higher ($25/month+) for ML workloads

## Production Checklist

- [ ] All environment variables set correctly
- [ ] Health endpoints working
- [ ] Frontend can communicate with Backend
- [ ] Backend can communicate with RAG
- [ ] Logs reviewed for errors
- [ ] OPENAI_API_KEY configured
- [ ] Domain/CNAME configured (if using custom domain)
- [ ] Backups enabled (if using persistent storage)

## Advanced: Custom Domain

1. In Render dashboard, go to Service → Settings
2. Add Custom Domain
3. Follow DNS configuration instructions
4. Update Frontend `VITE_API_URL` to use custom backend domain

## Rolling Back

If deployment fails:
1. Dashboard → Service → Deployments
2. Click earlier successful deployment
3. Click **Deploy**

Render will rebuild from that Git commit.

## Next Steps

1. Monitor service health daily
2. Check logs for errors
3. Upgrade instance types if needed
4. Add monitoring/alerting
5. Set up automated backups for critical data

---

**Support**: 
- Render docs: https://render.com/docs
- GitHub integration help: https://render.com/docs/github
- Service configuration: https://render.com/docs/web-services
