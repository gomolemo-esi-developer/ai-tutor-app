# Quick Start with ChromaDB (Fully Local!)

## ✅ No Cloud Dependencies!

**Perfect for TUT:** Everything runs on your machine. No Pinecone, no credit cards, no cloud fees!

## ⚡ Get Started in 3 Minutes

### Step 1: Install (1 min)

```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG"
./setup.sh
```

### Step 2: Add OpenAI API Key (1 min)

Edit `.env`:
```bash
nano .env
```

Add:
```
OPENAI_API_KEY=sk-your_key_here
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=tut_documents
```

**That's ALL you need!** No Pinecone account required.

### Step 3: Test (1 min)

```bash
python 3_tests/3.3_test_metadata_filter.py
```

Expected:
```
✅ PASSED: Metadata filtering works
🎉 SUCCESS: ChromaDB works locally!
✅ FULLY LOCAL - No cloud dependencies!
```

### Step 4: Run Server

```bash
uvicorn main:app --reload
```

Visit: http://localhost:8000/docs

---

## 🎯 What Makes This Perfect for TUT

| Feature | Status |
|---------|--------|
| Cloud dependencies | ❌ None |
| Credit card required | ❌ No |
| Internet required | ⚠️ Only for OpenAI API |
| Data storage | ✅ Local disk |
| Metadata filtering | ✅ Works perfectly |
| Cost | ✅ Only OpenAI usage |
| Privacy | ✅ All data local |

## 📊 Where Data Is Stored

```
./chroma_db/           ← All vectors stored here (local disk)
./0_data/input/        ← Your uploaded documents
```

Backup = just copy these folders!

## 🧪 The Critical Test

Run this to prove metadata filtering works locally:

```bash
python 3_tests/3.3_test_metadata_filter.py
```

This test:
1. Creates 3 test documents
2. Stores them locally in ChromaDB
3. Queries selecting only 2 documents
4. Verifies filtering works correctly

**If this passes, you're good to go!**

---

## 💰 Cost Breakdown

| Component | Cost |
|-----------|------|
| ChromaDB | FREE (local) |
| Vector storage | FREE (your disk) |
| OpenAI API | Pay-as-you-go |
| - Embeddings | ~$0.0001 per 1K tokens |
| - GPT-4 | ~$0.03 per 1K tokens |

**Example:** 100 documents + 1000 chat queries ≈ $5-10/month

No monthly fees, no credit card on file (except OpenAI).

---

## 🔧 Technical Details

### ChromaDB Setup
```python
# Automatically created on first use
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("tut_documents")
```

### Metadata Filtering (Same as Pinecone!)
```python
# Query with document filter
results = collection.query(
    query_embeddings=[embedding],
    where={"document_id": {"$in": ["doc_1", "doc_2"]}},
    n_results=5
)
```

### Storage Location
- Database: `./chroma_db/`
- Documents: `./0_data/input/`
- Both can be backed up by copying folders

---

## 🚀 Ready to Test?

```bash
# 1. Install
./setup.sh

# 2. Add OpenAI key to .env

# 3. Test
python 3_tests/3.3_test_metadata_filter.py

# 4. Run
uvicorn main:app --reload
```

**No Pinecone account needed!** 🎉

