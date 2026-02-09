# ChromaDB Setup - Complete Implementation Guide

## Status: ✅ READY TO POPULATE

The persistent disk is attached to the Render RAG service. Now add documents to it.

---

## What Was Done

### 1. Persistent Disk Created ✅
- **Location:** Render tutorverse-rag service
- **Size:** 10 GB
- **Mount Path:** `/app/chroma_db`
- **Purpose:** Store vector embeddings for quiz generation

### 2. Configuration Ready ✅
- RAG service configured to use `/app/chroma_db`
- ChromaDB automatically initializes on disk
- Vectors persist across container restarts

### 3. Upload Endpoints Ready ✅
- `POST /educator/upload` - Upload documents
- `GET /educator/verify/{id}` - Verify vectors stored
- `GET /educator/documents` - List uploaded files
- `GET /educator/chunks/{id}` - Get indexed chunks

---

## Documents to Add (Choose Your Approach)

### Approach A: Upload Individual Documents (Recommended for Testing)

```powershell
# Windows PowerShell
.\test_chromadb_upload.ps1 -DocumentPath "C:\Users\Username\Documents\sample.pdf"
```

```bash
# Mac/Linux
./test_chromadb_upload.sh https://tutorverse-rag.onrender.com sample.pdf
```

### Approach B: Upload Multiple Documents

Create a script to upload all course materials:

```bash
#!/bin/bash

RAG_URL="https://tutorverse-rag.onrender.com"
DOCS_DIR="./course_materials"

for file in "$DOCS_DIR"/*; do
    echo "Uploading $(basename "$file")..."
    curl -X POST "$RAG_URL/educator/upload" -F "file=@$file"
    echo ""
    sleep 2
done
```

### Approach C: Pre-populate During Deployment

Add documents to git, then create initialization script in Dockerfile.

See: **CHROMADB_INITIALIZATION.md** for detailed implementation.

---

## Next Steps (Do This Now)

### 1. Prepare Documents
- Gather course materials (PDF, DOCX, etc.)
- Organize by module/topic
- Naming format: `Module_Name_Topic.pdf`

### 2. Upload Documents
Use the test script or cURL commands from CHROMADB_QUICK_START.md

```bash
# Example
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@course_materials.pdf"
```

### 3. Verify Vectors Stored
```bash
# Get document_id from upload response
curl "https://tutorverse-rag.onrender.com/educator/verify/{DOCUMENT_ID}"

# Should return:
# {"vectorsStored": true, "vectorCount": 250}
```

### 4. Test Quiz Generation
1. Go to TutorVerse frontend
2. Navigate to a module
3. Request quiz generation
4. Should now return questions from your documents

### 5. Confirm Disk Persistence
```bash
# SSH into Render service (from dashboard)
df -h /app/chroma_db
# Should show 10GB disk mounted
```

---

## Document Organization Strategy

### Option 1: Flat Structure (Simple)
```
Upload documents one by one, same way for all:
- Mathematics_Chapter1.pdf
- Mathematics_Chapter2.pdf
- Physics_Chapter1.pdf
- Physics_Chapter2.pdf
```

### Option 2: Module-Based (Recommended)
Map documents to your module structure:
```
Module 1: Math Fundamentals
  ├── Introduction.pdf (document_id: uuid-1)
  └── Exercises.pdf (document_id: uuid-2)

Module 2: Algebra
  ├── Concepts.pdf (document_id: uuid-3)
  └── Problems.pdf (document_id: uuid-4)
```

Then when students request "Module 2 Quiz", filter by module_id.

### Option 3: Topic-Based
Organize by learning topics:
```
Topic: Functions → Functions_Guide.pdf
Topic: Calculus → Calculus_Fundamentals.pdf
Topic: Statistics → Stats_Handbook.pdf
```

---

## Data Flow (How It Works)

```
┌─────────────────────────────────────────────────────────────┐
│                   TutorVerse Frontend                        │
│                                                              │
│         Student requests: "Generate quiz for Module 2"       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST /api/quiz/generate
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                          │
│                                                              │
│         Receives request, forwards to RAG service            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST /api/quiz/generate
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  RAG Service (Python)                        │
│                                                              │
│  1. Search ChromaDB for Module 2 documents                  │
│  2. Retrieve top 10 relevant chunks                         │
│  3. Create context from chunks                             │
│  4. Send to LLM: "Generate 5 quiz questions from context"  │
│  5. Return generated quiz to backend                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
         ┌─────────────────────────────────┐
         │     ChromaDB on Persistent      │
         │     Disk (/app/chroma_db)       │
         │                                 │
         │  chroma/                        │
         │  ├── data.parquet              │
         │  └── index/                    │
         │      └── embeddings            │
         │                                 │
         │  Stores:                        │
         │  • Vector embeddings (384-dim) │
         │  • Chunk text                  │
         │  • Metadata (module, topic)    │
         └─────────────────────────────────┘
                       ↑
                       │ Stores to
                       │
         ┌─────────────────────────────────┐
         │      Embedding Service          │
         │   (Sentence Transformers)       │
         │                                 │
         │  Converts text → 384-d vectors │
         └─────────────────────────────────┘
                       ↑
                       │ Generates
                       │
         ┌─────────────────────────────────┐
         │      Text Chunker               │
         │                                 │
         │  Splits text into semantic     │
         │  chunks (~512 tokens each)     │
         └─────────────────────────────────┘
                       ↑
                       │ Chunks
                       │
         ┌─────────────────────────────────┐
         │    File Converter               │
         │                                 │
         │  PDF → Text                    │
         │  DOCX → Text                   │
         │  Audio → Transcript             │
         │  Images → OCR Text              │
         └─────────────────────────────────┘
                       ↑
                       │ Converts
                       │
         ┌─────────────────────────────────┐
         │    Document Upload              │
         │   (Educator API)                │
         │                                 │
         │  POST /educator/upload          │
         │  ← File submitted               │
         └─────────────────────────────────┘
```

---

## Monitoring Disk Usage

### Check Available Space
```bash
# SSH into Render service
df -h /app/chroma_db

# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/nvme0n1    10G   2.5G  7.5G  25% /app/chroma_db
```

### Estimated Capacity
- **Per chunk:** ~2 KB (vector storage)
- **Per average PDF:** ~250 chunks = 500 KB
- **10 GB disk capacity:** ~20,000 PDFs equivalent

### When to Expand
- If usage > 80%: Consider expanding disk in Render
- If uploading large dataset: Expand before starting

---

## Implementation Files Created

1. **CHROMADB_QUICK_START.md** ← Start here for quick reference
2. **CHROMADB_INITIALIZATION.md** - Detailed setup procedures
3. **CHROMADB_DOCUMENT_MAPPING.md** - Architecture & data structures
4. **test_chromadb_upload.ps1** - Windows upload test script
5. **test_chromadb_upload.sh** - Mac/Linux upload test script
6. **DEPLOYMENT_ERRORS_AND_SOLUTIONS.md** - Updated with complete solution

---

## Testing Checklist

- [ ] Persistent disk mounted at `/app/chroma_db`
- [ ] Upload a test document via `/educator/upload`
- [ ] Verify vectors stored with `/educator/verify/{id}`
- [ ] Confirm vectorCount > 0
- [ ] Generate quiz through TutorVerse interface
- [ ] Quiz questions appear from your documents
- [ ] Stop and restart RAG service
- [ ] Verify documents still exist (persistence confirmed)

---

## Troubleshooting

### Issue: Upload returns 500 error
```bash
# Check RAG service logs in Render
# Common causes:
# - File too large
# - Unsupported format
# - Disk full
```

### Issue: Vectors show as 0 after upload
```bash
# Check service logs
# Might be:
# - File unreadable (corrupted)
# - Memory limit exceeded
# - Embedding service failing
```

### Issue: Quiz still returns empty
```bash
# Verify:
1. At least 1 document has vectors: GET /educator/verify/{id}
2. vectorCount > 0
3. Disk not full: df -h /app/chroma_db
4. Restart RAG service
```

### Issue: Documents disappear after restart
```bash
# Check persistent disk mounting:
# In Render dashboard → tutorverse-rag → Disks
# Should show: chroma-db at /app/chroma_db
```

---

## Success Indicators

### ✅ Everything Working
1. Documents upload without errors
2. Verification shows vectors stored
3. Quiz generation returns questions
4. Documents persist after restart
5. Disk usage growing with uploads

### ⚠️ Partially Working
1. Uploads successful but 0 vectors
   → Check file format/size
2. Quiz returns generic questions
   → Ensure documents indexed
3. Documents disappear
   → Disk not persistent

---

## FAQ

**Q: How long does upload take?**
A: 5-30 seconds for typical PDF, depends on file size.

**Q: Can I delete a document?**
A: Yes, `DELETE /educator/documents/{filename}`

**Q: What if I upload wrong file?**
A: Delete it and re-upload: `DELETE /educator/documents/{filename}`

**Q: Do vectors persist if service restarts?**
A: Yes, they're on the persistent disk.

**Q: Can I export indexed documents?**
A: Yes, download from `/educator/preview/{filename}`

**Q: What's max file size?**
A: ~500 MB recommended (larger files take longer)

---

## Next Actions (In Order)

1. **Right now:**
   - Review CHROMADB_QUICK_START.md
   - Prepare 1-2 test documents

2. **Within 1 hour:**
   - Upload test documents
   - Verify vectors stored
   - Test quiz generation

3. **Today:**
   - Upload all course materials
   - Test with students
   - Confirm persistence

4. **This week:**
   - Monitor disk usage
   - Add more documents
   - Refine module mapping

---

## Support Resources

| Document | Purpose |
|----------|---------|
| CHROMADB_QUICK_START.md | Quick reference commands |
| CHROMADB_INITIALIZATION.md | Detailed implementation |
| CHROMADB_DOCUMENT_MAPPING.md | Architecture details |
| DEPLOYMENT_ERRORS_AND_SOLUTIONS.md | Full solution history |
| test_chromadb_upload.ps1 | Windows testing tool |
| test_chromadb_upload.sh | Mac/Linux testing tool |

---

## Architecture Summary

```
Render.com Cloud Infrastructure
│
├── Frontend (ai-tutor-ocue.onrender.com)
│   └── Vite React app
│
├── Backend (tutorverse-backend-kpls.onrender.com)
│   └── Node.js Express server
│
└── RAG Service (tutorverse-rag.onrender.com)
    ├── FastAPI Python server
    │
    └── ChromaDB
        └── Persistent Disk: /app/chroma_db (10GB)
            ├── chroma/ (vector store)
            └── index/ (metadata indexes)
```

**All components cloud-hosted, no local installation needed.**

---

## Ready to Go! 🚀

Everything is set up. Start uploading documents and your quiz generation will work immediately.

Begin with: **CHROMADB_QUICK_START.md**
