# Migrate Local ChromaDB to Render - Manual Instructions

## Status
Attempted automatic migration, but RAG service needs manual restart on Render to be accessible for uploads.

## Documents to Migrate

You have **5 documents** in `RAG18Nov2025-1/data/input/`:

1. Audio Science Fundamentals - Sound Waves.mp3 (7.76 MB)
2. GOVERNMENT GAZETTE, 22 August 2025.pdf (0.39 MB)
3. Interesting facts about The Human Body.mp4 (11.50 MB)
4. Peter Pan.pdf (0.04 MB)
5. ProductViewModel.cs (0.00 MB)

## Step 1: Restart RAG Service on Render

1. Go to **https://dashboard.render.com**
2. Select **tutorverse-rag** service
3. Click **Manual Deploy** → **Deploy latest commit**
   - OR click the 3-dot menu → **Restart**
4. Wait for service to start (2-3 minutes)
5. Confirm service is running

## Step 2: Verify Service is Online

```bash
curl https://tutorverse-rag.onrender.com/health
```

Should return status code 200.

## Step 3: Upload Documents

### Option A: Use the Python Script (Recommended)

```bash
python upload_documents.py
```

This will automatically upload all 5 documents and show:
- Document ID for each
- Number of chunks created
- Verification commands

### Option B: Upload One Document with cURL

```bash
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@RAG18Nov2025-1/data/input/Peter\ Pan.pdf"
```

### Option C: Use Browser

1. Go to https://tutorverse-rag.onrender.com/docs
2. Find `POST /educator/upload`
3. Click "Try it out"
4. Select file and click "Execute"

## Step 4: Verify Upload Success

After upload, you'll get a response like:
```json
{
  "status": "complete",
  "document_id": "550e8400-e29b-41d4-a716",
  "chunks": 250,
  "filename": "Peter Pan.pdf"
}
```

## Step 5: Confirm Vectors are Stored

```bash
curl "https://tutorverse-rag.onrender.com/educator/verify/{DOCUMENT_ID}"
```

Should return:
```json
{
  "vectorsStored": true,
  "vectorCount": 250,
  "status": "Found 250 vectors"
}
```

## Step 6: Test Quiz Generation

1. Go to TutorVerse frontend
2. Request a quiz
3. Quiz should now be generated from your documents

## Files Created for This Migration

1. **upload_documents.py** - Main migration script (Python)
2. **migrate_local_chunks.bat** - Alternative batch script (Windows)
3. **upload_documents.sh** - Alternative bash script (Linux/Mac)
4. **migrate_local_chunks_to_render.ps1** - PowerShell script
5. **MIGRATION_INSTRUCTIONS.md** - This file

## What Happens After Upload

```
Your Documents (Local)
    ↓
Upload to Render RAG Service
    ↓
Convert to Text (handles PDF, MP4, MP3, CS files, etc.)
    ↓
Split into Chunks (512 tokens each)
    ↓
Generate Embeddings (384-dimensional vectors)
    ↓
Store to Persistent Disk (/app/chroma_db)
    ↓
DONE - Data persists forever
    ↓
Quiz Generation uses these chunks (online)
Chat uses these chunks (online)
Summary uses these chunks (online)
```

## Troubleshooting

### RAG Service not accessible
- Check service status in Render dashboard
- Look at Recent Logs for errors
- Click "Manual Deploy" to restart

### Upload returns HTTP 500
- Check RAG service logs
- Service might be out of memory with large files
- Try smaller files first

### Vectors show as 0
- File might be corrupted
- Try uploading a text file first to test
- Check service logs for conversion errors

### Documents disappear after restart
- Persistent disk might not be mounted
- Check Render dashboard → tutorverse-rag → Disks
- Verify disk is at `/app/chroma_db` with 10GB

## Summary

**What you're doing:**
- Moving local ChromaDB chunks from your computer to Render.com persistent disk
- Enabling quiz, chat, and summary to use online data
- Ensuring data persists forever

**Expected time:** 15-30 minutes (depending on file sizes)

**Result:** All 5 documents indexed and available for quiz/chat/summary online

---

## Quick Commands

```bash
# Upload all documents
python upload_documents.py

# Check if service is online
curl https://tutorverse-rag.onrender.com/health

# List uploaded documents
curl https://tutorverse-rag.onrender.com/educator/documents

# Verify vectors stored
curl https://tutorverse-rag.onrender.com/educator/verify/{DOCUMENT_ID}

# Get chunks from a document
curl https://tutorverse-rag.onrender.com/educator/chunks/{DOCUMENT_ID}
```

---

## When Service Comes Back Online

Run this command to migrate everything automatically:

```bash
python upload_documents.py
```

All 5 documents will be uploaded, indexed, and stored on the persistent disk.
