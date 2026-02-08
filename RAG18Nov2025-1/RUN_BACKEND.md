# 🚀 How to Run the Backend (Simple Instructions)

## Quick Start (2 Steps)

### Step 1: Activate the Virtual Environment
Open Terminal and run:
```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG"
source venv/bin/activate
```

You'll see `(venv)` appear at the start of your terminal line - that means it's activated! ✅

### Step 2: Start the Server
Run this command:
```bash
uvicorn main:app --reload
```

---

## ✅ What Success Looks Like

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
✅ Configuration validated
✅ Using model: gpt-4.1-nano
✅ Using embeddings: text-embedding-3-small
✅ ChromaDB storage: chroma_db
✅ FULLY LOCAL - No cloud dependencies!
```

The backend is now running at: **http://localhost:8000**

---

## 🌐 Access Points

- **Frontend UI:** http://localhost:8000 (if you built the React frontend)
- **API Docs:** http://localhost:8000/docs (interactive API documentation)
- **Health Check:** http://localhost:8000/health

---

## 🛑 To Stop the Server

Press `CTRL + C` in the terminal

---

## 🔧 Troubleshooting

**If you see "command not found: uvicorn":**
```bash
pip install uvicorn
```

**If you see import errors:**
```bash
pip install -r requirements.txt
```

**If you see Python version errors:**
Make sure you're using Python 3.11:
```bash
python3.11 --version
```




