# ChromaDB Initialization on Render with Persistent Disk

## Overview
Now that the persistent disk is attached to the RAG service on Render, you need to populate it with indexed documents. The RAG service has document upload endpoints that will automatically store embeddings to the persistent disk.

## Architecture

```
Render RAG Service
├── /app/chroma_db (Persistent Disk - 10GB)
│   ├── chroma/  (Vector embeddings + metadata)
│   └── index/   (Chroma indexes)
└── /app/data/input/ (Uploaded files, container storage)
```

## Two Methods to Initialize ChromaDB

### Method 1: Upload Documents via RAG API (Recommended)

The RAG service exposes an upload endpoint that automatically:
1. Accepts file upload
2. Converts file to text (PDF, DOCX, TXT, etc.)
3. Chunks text into semantic pieces
4. Generates embeddings
5. Stores vectors to the persistent disk

**Steps:**

1. **Get your RAG service URL** (from Render dashboard):
   ```
   https://tutorverse-rag.onrender.com
   ```

2. **Prepare documents** (PDF, DOCX, TXT, etc.)

3. **Upload via curl or API client**:
   ```bash
   # Upload a single document
   curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
     -F "file=@/path/to/document.pdf"
   ```

   Or use your frontend's upload form to upload documents.

4. **Monitor progress**:
   The endpoint returns streaming NDJSON with progress:
   ```json
   {"status": "uploading", "progress": 5}
   {"status": "converting", "progress": 15}
   {"status": "chunking", "progress": 60}
   {"status": "embedding", "progress": 75}
   {"status": "storing", "progress": 90}
   {"status": "complete", "progress": 100, "chunks": 250}
   ```

5. **Verify documents are stored**:
   ```bash
   # Check what documents are in ChromaDB
   curl "https://tutorverse-rag.onrender.com/educator/documents"
   
   # Verify vectors were actually stored
   curl "https://tutorverse-rag.onrender.com/educator/verify/{document_id}"
   ```

### Method 2: Pre-populate Disk Before Deployment (For Bulk Initialization)

If you have many documents to index, you can create a one-time initialization script:

1. **Create initialization script** (`initialize_chromadb.py`):
   ```python
   import sys
   from pathlib import Path
   sys.path.append('/app')
   
   from modules.content_processing.document_loader import load_document
   from modules.content_processing.text_extractor import extract_text
   from modules.content_processing.text_chunker import chunk_text_with_metadata
   from modules.content_processing.embeddings_generator import generate_embeddings
   from modules.content_processing.chroma_uploader import upload_to_chroma
   from modules.shared.chroma_client import get_chroma_collection
   import uuid
   
   # List of documents to index on startup
   DOCUMENTS_TO_INDEX = [
       {
           "path": "/app/data/input/course_module_1.txt",
           "name": "Course Module 1"
       },
       {
           "path": "/app/data/input/course_module_2.txt",
           "name": "Course Module 2"
       },
   ]
   
   def initialize_documents():
       print("Initializing ChromaDB with documents...")
       
       for doc in DOCUMENTS_TO_INDEX:
           if not Path(doc["path"]).exists():
               print(f"⚠️  Document not found: {doc['path']}")
               continue
           
           doc_id = str(uuid.uuid4())
           print(f"\n📄 Processing: {doc['name']}")
           
           # Load and process
           doc_obj = load_document(doc["path"])
           text = extract_text(doc_obj)
           chunks = chunk_text_with_metadata(text, doc_id, doc["name"])
           
           # Generate embeddings
           texts = [chunk["text"] for chunk in chunks]
           embeddings = generate_embeddings(texts)
           
           # Store to ChromaDB
           success = upload_to_chroma(chunks, embeddings, doc_id)
           
           if success:
               print(f"✅ Indexed: {doc['name']} ({len(chunks)} chunks)")
           else:
               print(f"❌ Failed to index: {doc['name']}")
       
       print("\n✅ Initialization complete!")
   
   if __name__ == "__main__":
       initialize_documents()
   ```

2. **Add to Dockerfile.rag** to run on startup:
   ```dockerfile
   # After installing dependencies...
   COPY initialize_chromadb.py /app/
   
   # Run initialization before starting server
   RUN python /app/initialize_chromadb.py || true
   
   CMD ["python", "/app/main.py"]
   ```

3. **Add documents to git** in `/data/input/` before deploying.

## Verification Steps

### 1. Check persistent disk is working:
```bash
# SSH into Render service and check disk mount
df -h

# You should see:
/dev/nvme0n1  10G  100M  9.9G   1%  /app/chroma_db
```

### 2. Check ChromaDB is using the persistent disk:
```bash
# SSH into service
ls -la /app/chroma_db/

# You should see:
# chroma/
# index/
```

### 3. Query ChromaDB status:
```bash
curl "https://tutorverse-rag.onrender.com/health"
```

### 4. List indexed documents:
```bash
curl "https://tutorverse-rag.onrender.com/educator/documents"
```

### 5. Verify vectors exist for a document:
```bash
curl "https://tutorverse-rag.onrender.com/educator/verify/{document_id}"

# Response should include:
# {
#   "vectorsStored": true,
#   "vectorCount": 250,
#   "status": "Found 250 vectors"
# }
```

## Data Flow

```
Document Upload
     ↓
File Converter (PDF/DOCX → Text)
     ↓
Text Chunker (Split into semantic chunks)
     ↓
Embedding Generator (Create vectors)
     ↓
ChromaDB Uploader → Persistent Disk (/app/chroma_db)
                         ↓
                    Quiz Generation
                         ↓
                    Student Queries
```

## Important Notes

1. **Persistent disk is automatically mounted** to `/app/chroma_db` by Render
2. **ChromaDB is configured** to use this path (see `config.py` - `CHROMA_PERSIST_DIR`)
3. **Data persists across restarts** - once indexed, documents stay in the disk
4. **Disk usage**: Monitor with `df -h` on the service
5. **No rebuild needed** for document changes - upload via API

## Recommended Workflow

1. ✅ Disk is attached to RAG service
2. Deploy RAG service to Render (should have persistent disk mounted)
3. Verify disk mount: Check `/app/chroma_db` exists with `chroma/` subdirectory
4. Upload documents via:
   - RAG upload API: `POST /educator/upload`
   - Frontend: Through your TutorVerse interface
5. Verify vectors stored: `GET /educator/verify/{document_id}`
6. Test quiz generation: Should now work with indexed documents

## Debugging

If quiz generation still fails after documents are uploaded:

1. Check RAG service logs for errors
2. Verify document upload completed without errors
3. Run verification endpoint to confirm vectors exist
4. Check disk space: `df -h /app/chroma_db`
5. Restart RAG service to reload ChromaDB from disk

## Example: Complete Upload Flow

```bash
# 1. Prepare document
cp ~/Documents/course_materials.pdf ./temp/

# 2. Upload to RAG service
curl -X POST "https://tutorverse-rag.onrender.com/educator/upload" \
  -F "file=@./temp/course_materials.pdf" \
  --progress-bar

# 3. Wait for response showing "complete" status

# 4. Verify vectors were stored
curl "https://tutorverse-rag.onrender.com/educator/verify/{document_id_from_upload_response}"

# 5. Test quiz generation
# Now quiz generation should work with the indexed content
```
