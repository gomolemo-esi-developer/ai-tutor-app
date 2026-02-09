# ChromaDB Quick Start Guide

## In 3 Steps

### Step 1: Upload a Document (Choose One)

**Windows PowerShell:**
```powershell
.\test_chromadb_upload.ps1 -DocumentPath "C:\path\to\your\document.pdf"
```

**Mac/Linux Bash:**
```bash
./test_chromadb_upload.sh https://tutorverse-rag.onrender.com /path/to/document.pdf
```

**Any OS (cURL):**
```bash
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@document.pdf"
```

**Browser:**
- Go to https://tutorverse-rag.onrender.com/docs
- Find `POST /educator/upload`
- Click "Try it out"
- Select file and execute

### Step 2: Verify Upload (Copy the document_id from Step 1)

```bash
curl "https://tutorverse-rag.onrender.com/educator/verify/{DOCUMENT_ID}"
```

Look for:
```json
{
  "vectorsStored": true,
  "vectorCount": 250
}
```

### Step 3: Test Quiz Generation

Go to TutorVerse and request a quiz. It should now work with the indexed documents.

---

## Common Commands

### List all documents
```bash
curl "https://tutorverse-rag.onrender.com/educator/documents"
```

### Get chunks from a document
```bash
curl "https://tutorverse-rag.onrender.com/educator/chunks/{DOCUMENT_ID}"
```

### Check RAG service health
```bash
curl "https://tutorverse-rag.onrender.com/health"
```

### Check persistent disk (SSH into Render service)
```bash
df -h /app/chroma_db
ls -la /app/chroma_db/
```

---

## File Types Supported

✅ PDF  
✅ DOCX (Word)  
✅ PPTX (PowerPoint)  
✅ TXT (Text)  
✅ MP4/MP3 (Audio/Video - transcribed)  
✅ Images (OCR extracted)  

---

## What Happens During Upload

```
1. File sent to RAG service
2. Text extracted from file (5-15 seconds)
3. Text split into chunks (1-2 seconds)
4. Embeddings generated for each chunk (5-10 seconds)
5. Vectors stored to persistent disk (1-2 seconds)
   ↓
   DONE! File is now searchable for quizzes
```

---

## Troubleshooting

### Upload fails: "Cannot reach RAG service"
- Check URL: should be `https://tutorverse-rag.onrender.com` (no trailing slash)
- Check Render dashboard: is service running?
- Try `/health` endpoint first

### Upload succeeds but vectors show as 0
- File might be too large or unsupported format
- Check RAG service logs in Render
- Try with a simple .txt file first

### Quiz generation still returns 500 error
1. Check vectors exist: `curl .../verify/{doc_id}`
2. Confirm `vectorCount > 0`
3. Check that at least 1 document is verified
4. Restart RAG service and try again

### Documents disappear after restart
- Persistent disk might not be mounted
- Check Render dashboard: Disks section
- Should show `chroma-db` mounted at `/app/chroma_db`

---

## Document Management

### Delete a document
```bash
curl -X DELETE "https://tutorverse-rag.onrender.com/educator/documents/{FILENAME}"
```

### Preview file before upload
```bash
curl "https://tutorverse-rag.onrender.com/educator/preview/{FILENAME}?max_chars=5000"
```

---

## Monitoring

### Check disk space
```bash
# SSH into service
df -h /app/chroma_db
```

**10 GB disk can hold:**
- ~500,000 chunks
- ~250 large PDF files
- ~1000 course modules

### Check ChromaDB status
```bash
curl "https://tutorverse-rag.onrender.com/health" | jq .
```

---

## Best Practices

1. **Upload course materials first**
   - Each module as separate document
   - Clear, descriptive filenames

2. **Verify after each upload**
   - Run verification endpoint
   - Confirm vectorCount > 0

3. **Test quiz generation**
   - Request quiz for uploaded topic
   - Should get questions from your content

4. **Monitor disk usage**
   - Check `df -h /app/chroma_db` weekly
   - Delete old documents if running low

5. **Keep backups**
   - The persistent disk is your backup
   - But also keep source files

---

## API Reference (Quick)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/educator/upload` | POST | Upload document |
| `/educator/documents` | GET | List uploaded files |
| `/educator/verify/{id}` | GET | Check vectors stored |
| `/educator/chunks/{id}` | GET | Get chunks for document |
| `/educator/preview/{file}` | GET | Preview file content |
| `/educator/documents/{file}` | DELETE | Delete file |
| `/health` | GET | Check service status |
| `/docs` | GET | Full API documentation |

Full docs: https://tutorverse-rag.onrender.com/docs

---

## Example Workflow

```bash
# 1. Upload document
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@Math_101_Chapter3.pdf" \
  > upload.json

# 2. Extract ID
DOC_ID=$(jq -r '.document_id' upload.json)
echo "Uploaded as: $DOC_ID"

# 3. Wait a moment, then verify
sleep 2
curl "https://tutorverse-rag.onrender.com/educator/verify/$DOC_ID"

# 4. Check chunks were created
curl "https://tutorverse-rag.onrender.com/educator/chunks/$DOC_ID?limit=3"

# 5. Go to TutorVerse and generate a quiz!
```

---

## Getting Help

1. Check `/docs` endpoint: https://tutorverse-rag.onrender.com/docs
2. Read CHROMADB_INITIALIZATION.md for detailed guide
3. Read CHROMADB_DOCUMENT_MAPPING.md for architecture
4. Check Render service logs for errors
