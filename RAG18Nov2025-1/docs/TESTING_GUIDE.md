# Testing Guide - ChromaDB (Fully Local)

## ✅ System Now 100% Local (No Pinecone!)

Perfect for TUT's requirement: **No cloud vector database, no credit cards!**

---

## 🚀 How to Test (3 Steps)

### Step 1: Install Dependencies

```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG"

# Run setup
./setup.sh
```

This installs ChromaDB and all dependencies.

### Step 2: Configure OpenAI API Key

**You only need ONE API key now** (no Pinecone!):

```bash
nano .env
```

Add:
```
OPENAI_API_KEY=sk-your_actual_key_here
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=tut_documents
```

Get OpenAI key: https://platform.openai.com/api-keys

### Step 3: Run the Critical Test

```bash
python 3_tests/3.3_test_metadata_filter.py
```

**What this test does:**
1. Creates 3 test documents about different topics
2. Uploads them to **local ChromaDB** with unique document IDs
3. Queries for photosynthesis, selecting only doc_1 and doc_3
4. Verifies doc_2 (geology) is filtered out correctly

**Expected Output:**
```
🎯 CRITICAL TEST: Metadata Filtering for Dynamic Document Selection
================================================================================

Step 1: Creating 3 test documents...
✅ Created 3 test documents

Step 2: Processing and uploading documents to ChromaDB...
  ✅ Uploaded test_doc_1.txt with ID: test_doc_1
  ✅ Uploaded test_doc_2.txt with ID: test_doc_2
  ✅ Uploaded test_doc_3.txt with ID: test_doc_3

Step 3: Testing metadata filtering...
  Query: 'Tell me about photosynthesis'
  Selected documents: [test_doc_1, test_doc_3]
  Expected: Only results from doc_1 and doc_3 (NOT doc_2)

  Retrieved 2 matches

Step 4: Verifying results...
  Match 1:
    Document ID: test_doc_1
    Document Name: test_doc_1.txt
    Score: 0.8234
    Text: This is document 1 about photosynthesis...

VALIDATION RESULTS:
================================================================================
✅ PASSED: No results from test_doc_2 (correctly filtered)
✅ PASSED: Found results from selected documents (test_doc_1 or test_doc_3)

================================================================================
🎉 SUCCESS: Metadata filtering works correctly with ChromaDB!
✅ R&D Concept Validated: Dynamic document selection via metadata filtering
✅ FULLY LOCAL - No cloud dependencies!
================================================================================
```

---

## 🎯 What This Proves

✅ **Per-document vectorization works**
✅ **Metadata filtering works locally** (same as Pinecone)
✅ **Dynamic document selection works**
✅ **No cloud dependencies needed**

This is your **proof-of-concept** for the client!

---

## 📊 Optional: Run All Tests

```bash
# Test 1: Document loading
python 3_tests/3.1_test_document_upload.py

# Test 2: Chunking & embeddings
python 3_tests/3.2_test_vectorization.py

# Test 3: Metadata filtering (CRITICAL)
python 3_tests/3.3_test_metadata_filter.py
```

---

## 🖥️ Start the API Server

```bash
uvicorn main:app --reload
```

Expected output:
```
✅ Configuration validated
✅ Using model: gpt-4
✅ Using embeddings: text-embedding-3-small
✅ ChromaDB storage: ./chroma_db
✅ FULLY LOCAL - No cloud dependencies!

INFO:     Uvicorn running on http://127.0.0.1:8000
```

Visit: http://localhost:8000/docs

Test the health endpoint:
- GET `/health/` - Check system status
- GET `/health/config` - View configuration (shows "ChromaDB (Local)")

---

## 📁 Where Data Is Stored

```
./chroma_db/           ← All vectors (local disk)
./0_data/input/        ← Uploaded documents
```

**Backup:** Just copy these folders!

---

## 🐛 Troubleshooting

### "Module not found" error

```bash
export PYTHONPATH="/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG:$PYTHONPATH"
```

### "ChromaDB not installed"

```bash
pip install chromadb==0.4.22
```

### "OpenAI API error"

- Check your API key is correct
- Verify you have credits: https://platform.openai.com/account/usage
- Try gpt-4o-mini instead (cheaper)

---

## ✅ Success Criteria

You know it's working when:

1. ✅ Test 3.3 prints "SUCCESS: Metadata filtering works correctly"
2. ✅ Server starts and shows "FULLY LOCAL"
3. ✅ Health endpoint returns `{"status": "healthy"}`
4. ✅ Config shows `"vector_db": "ChromaDB (Local)"`

---

## 💰 Cost Comparison

| Component | Pinecone (Before) | ChromaDB (Now) |
|-----------|-------------------|----------------|
| Vector DB | $70+/month | FREE |
| Storage | Cloud | Local disk |
| Credit Card | Required | Not required |
| Internet | Required | Not required* |
| Setup | Complex | Simple |

*Only OpenAI API needs internet

---

## 📋 For the Client (TUT)

**Question:** "Can we avoid cloud dependencies and fees?"

**Answer:** ✅ **YES!**

- Vector database is now fully local (ChromaDB)
- No Pinecone account needed
- No monthly fees for storage
- Only pay for OpenAI usage (pay-as-you-go)
- All student data stays on your servers

**R&D Question:** "Does metadata filtering still work?"

**Answer:** ✅ **YES!**

**Proof:** Run `python 3_tests/3.3_test_metadata_filter.py`

---

## 🎉 Ready to Test?

```bash
# 1. Setup
./setup.sh

# 2. Add OpenAI key to .env

# 3. Run critical test
python 3_tests/3.3_test_metadata_filter.py

# 4. Start server
uvicorn main:app --reload
```

**That's it!** No Pinecone, no cloud, no problem! 🚀

