# ChromaDB Document Mapping & Configuration Guide

## Overview

This guide explains how documents are indexed, stored, and retrieved in ChromaDB on the persistent disk, and how they map to your TutorVerse application.

## Architecture Diagram

```
TutorVerse Frontend
        ↓
Backend API (Render)
        ↓
RAG Service (Render)
        ↓
Document Upload Endpoint
        ↓
File Converter (PDF/DOCX/TXT → Text)
        ↓
Text Chunker (Create semantic pieces)
        ↓
Embedding Generator (Create vectors)
        ↓
ChromaDB Storage → Persistent Disk (/app/chroma_db)
        ↓
Quiz Generation / Student Queries
```

## Document Indexing Flow

### 1. Document Upload

**Endpoint:** `POST /educator/upload`

```bash
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@document.pdf"
```

**What happens:**
- File is saved to `/app/data/input/` (container storage)
- Gets UUID as document_id: `550e8400-e29b-41d4-a716-446655440000`
- Processing begins immediately

### 2. File Conversion

Supported formats:
- **PDF** → Text extraction + OCR if needed
- **DOCX** → Text extraction
- **PPT/PPTX** → Slide text extraction
- **Audio/Video** → Transcription (with Whisper)
- **TXT** → Direct use
- **Images** → OCR extraction

### 3. Text Chunking

Text is split into semantic chunks with metadata:

```json
{
  "text": "Chapter content...",
  "metadata": {
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "document_name": "Math101-Chapter3.pdf",
    "chunk_index": 0,
    "chunk_size": 512,
    "source": "document"
  }
}
```

**Chunk size:** ~512 tokens (adjustable in `modules/content_processing/text_chunker.py`)

### 4. Embedding Generation

Each chunk gets a vector embedding:
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (default)
- **Vector size:** 384 dimensions
- **Embedding time:** ~10-50ms per chunk

### 5. ChromaDB Storage

Vectors are stored with this schema:

```
ChromaDB Collection: "documents"
├── id: "chunk-550e8400-e29b-41d4-a716-446655440000-0"
├── document: "Chapter content..." (text)
├── embedding: [0.234, -0.123, ...] (384 dimensions)
└── metadata:
    ├── document_id: "550e8400-e29b-41d4-a716-446655440000"
    ├── document_name: "Math101-Chapter3.pdf"
    ├── chunk_index: 0
    └── source: "document"
```

Storage location on persistent disk:
```
/app/chroma_db/
├── chroma/          (Vector embeddings + metadata)
├── index/           (Chroma internal indexes)
└── .venv/           (Dependencies)
```

## Data Mapping in TutorVerse

### Flow: Student → Backend → RAG → Quiz Generation

```
1. Student requests quiz for Module A
   ↓
2. Backend sends to RAG:
   POST /api/quiz/generate
   {
     "moduleId": "module-001",
     "topicId": "topic-algebra",
     "numQuestions": 5
   }
   ↓
3. RAG searches ChromaDB:
   - Find documents tagged with module_id or topic_id
   - Retrieve 5-10 most relevant chunks
   - Use embeddings for semantic search
   ↓
4. LLM generates quiz from retrieved context
   ↓
5. Quiz returned to student
```

## Document Organization Strategies

### Strategy 1: By Module (Recommended)

**Directory structure:**
```
/data/input/
├── Module_1_Fundamentals.pdf
├── Module_2_Algebra.pdf
├── Module_3_Calculus.pdf
└── Resources_General.pdf
```

**Upload metadata mapping:**
Each upload should tag which module it belongs to:
```
Document: Module_1_Fundamentals.pdf
├── document_id: AUTO-GENERATED (UUID)
├── module_id: "module-001"
├── subject: "Mathematics"
└── level: "101"
```

### Strategy 2: By Course

```
/data/input/
├── Course_CS101_Intro/
│   ├── Chapter_1.pdf
│   ├── Chapter_2.pdf
│   └── Resources.pdf
└── Course_CS201_Advanced/
    ├── Chapter_1.pdf
    └── Chapter_2.pdf
```

### Strategy 3: By Topic

```
/data/input/
├── Topic_Algebra/
├── Topic_Geometry/
├── Topic_Calculus/
└── Topic_Linear_Algebra/
```

## Metadata Schema for Proper Mapping

The metadata attached to each chunk enables filtering and retrieval:

```python
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",  # UUID, auto-generated
  "document_name": "Module_1_Fundamentals.pdf",             # Original filename
  "chunk_index": 0,                                         # Sequential chunk number
  "chunk_size": 512,                                        # Tokens in chunk
  "source": "document",                                     # Always "document" for uploads
  
  # Custom metadata (add these for better filtering)
  "module_id": "module-001",                               # Optional: for filtering
  "subject": "Mathematics",                                # Optional: subject area
  "level": "101",                                          # Optional: difficulty level
  "created_at": "2025-02-09T10:30:00Z"                    # Optional: upload timestamp
}
```

## Customizing Document Metadata

To add custom metadata, modify `text_chunker.py`:

```python
# In modules/content_processing/text_chunker.py

def chunk_text_with_metadata(text, doc_id, doc_name, **kwargs):
    chunks = []
    
    for i, chunk in enumerate(split_text(text)):
        chunks.append({
            "text": chunk,
            "metadata": {
                "document_id": doc_id,
                "document_name": doc_name,
                "chunk_index": i,
                "chunk_size": len(chunk.split()),
                "source": "document",
                
                # Add custom fields
                "module_id": kwargs.get("module_id"),
                "subject": kwargs.get("subject"),
                "level": kwargs.get("level"),
                "tags": kwargs.get("tags", []),
            }
        })
    
    return chunks
```

Then when uploading, pass the extra metadata:

```python
# In educator_routes.py upload handler
chunks = chunk_text_with_metadata(
    text, 
    document_id, 
    document_name,
    module_id="module-001",      # Add custom fields
    subject="Mathematics",
    level="101",
    tags=["algebra", "equations"]
)
```

## Quiz Generation Mapping

When quiz is requested for a module:

```python
# Backend receives request
{
  "moduleId": "module-001",
  "numQuestions": 5,
  "difficulty": "medium"
}

# RAG searches ChromaDB with filters
results = collection.query(
    query_texts=["Create 5 algebra questions"],
    n_results=10,
    where={"module_id": "module-001"},  # Filter by module
    where_document={"$contains": "algebra"}
)

# Retrieved context is used for quiz generation
context = "\n".join([doc for doc in results["documents"][0]])

# LLM generates quiz
quiz = llm.generate_quiz(context, num_questions=5)
```

## Current Document Status

To check what documents are indexed:

```bash
# List uploaded files
curl "https://tutorverse-rag.onrender.com/educator/documents"

# Get chunks for a document
curl "https://tutorverse-rag.onrender.com/educator/chunks/{document_id}"

# Verify vectors exist
curl "https://tutorverse-rag.onrender.com/educator/verify/{document_id}"
```

## Persistent Disk Verification

Verify the persistent disk is properly mounted:

1. **In Render dashboard:**
   - Go to tutorverse-rag service
   - Click "Disks" tab
   - Confirm disk mounted at `/app/chroma_db` with 10GB size

2. **Via SSH:**
   ```bash
   # SSH into Render service
   df -h | grep chroma_db
   
   # Should output:
   # /dev/nvme0n1p1  10G  100M  9.9G   1% /app/chroma_db
   ```

3. **Check ChromaDB directory:**
   ```bash
   ls -la /app/chroma_db/
   
   # Should contain:
   # chroma/
   # index/
   # .venv/
   ```

## Troubleshooting Document Mapping

### Problem: Documents upload but don't appear in quiz
**Check:**
1. Vectors actually stored: `GET /educator/verify/{document_id}`
2. Correct vector count returned
3. ChromaDB filters working correctly
4. Module ID matches between upload and quiz request

### Problem: Quiz generation returns empty results
**Check:**
1. At least 1 document indexed: `GET /educator/documents`
2. Vectors exist: `GET /educator/verify/{document_id}`
3. Disk space available: `df -h /app/chroma_db`
4. RAG service logs for errors

### Problem: Vectors lost after service restart
**Check:**
1. Persistent disk is mounted: `df -h /app/chroma_db`
2. Disk mount path is `/app/chroma_db` (matches `CHROMA_PERSIST_DIR`)
3. Chroma config uses correct path (see `config.py`)

## Performance Considerations

| Metric | Value |
|--------|-------|
| Max file size | ~500 MB recommended |
| Avg upload time | 5-30 seconds |
| Avg chunk generation | 10-50ms per chunk |
| Embedding generation | 100-500ms per 10 chunks |
| Total upload for 100KB file | ~5 seconds |
| Vector storage per chunk | ~2 KB (384 dims × 4 bytes) |
| Max documents (10GB disk) | ~500k chunks |

## Next Steps

1. ✅ Persistent disk attached to RAG service
2. Upload documents via: `POST /educator/upload`
3. Verify vectors: `GET /educator/verify/{document_id}`
4. Test quiz generation
5. Monitor disk usage: `df -h /app/chroma_db`

## Example Complete Flow

```bash
# 1. Upload a document
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@Mathematics_Algebra.pdf" \
  > upload_response.json

# Extract document_id from response
DOC_ID=$(jq -r '.document_id' upload_response.json)

# 2. Verify vectors are stored
curl "https://tutorverse-rag.onrender.com/educator/verify/$DOC_ID" | jq .

# 3. View indexed chunks
curl "https://tutorverse-rag.onrender.com/educator/chunks/$DOC_ID?limit=5" | jq .

# 4. Test quiz generation (from backend)
curl -X POST "https://tutorverse-backend-kpls.onrender.com/api/quiz/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "module-001",
    "topicId": "algebra",
    "numQuestions": 5
  }' | jq .
```
