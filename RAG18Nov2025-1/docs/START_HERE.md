# 🚀 Quick Start Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API Key

## Step-by-Step Startup

### 1️⃣ Backend Setup (First Time Only)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2️⃣ Frontend Setup (First Time Only)

```bash
cd frontend
npm install
cd ..
```

### 3️⃣ Daily Startup (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG"
source venv/bin/activate
uvicorn main:app --reload
```
✅ Backend running at http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG/frontend"
npm run dev
```
✅ Frontend running at http://localhost:5173

### 4️⃣ Open Browser

Navigate to: **http://localhost:5173**

You should see:
- 📚 Document list on the left sidebar
- 💬 Chat interface on the right
- ✅ Green status indicator showing the model

## Troubleshooting

### Backend Issues
- **ModuleNotFoundError**: Make sure virtual environment is activated
- **OpenAI Error**: Check your API key in `.env`
- **Port 8000 in use**: Kill the process or use a different port

### Frontend Issues
- **Cannot connect to backend**: Make sure backend is running on port 8000
- **No documents showing**: Check backend logs, ensure documents are uploaded
- **Port 5173 in use**: Kill the process or Vite will auto-select another port

## Testing

### Terminal Chat (Alternative Interface)
```bash
python3 3_tests/terminal_chat.py
```

With detailed logging:
```bash
python3 3_tests/terminal_chat.py --insights=true
```

### Add Documents
```bash
python3 3_tests/add_document.py
```

## Current Model
The system is currently using: **gpt-4.1-nano** (fastest, cheapest)

To change the model, edit `.env`:
```
LLM_MODEL=gpt-4o-mini  # or gpt-4, gpt-4-turbo, etc.
```

## Features

✅ Dynamic document selection with checkboxes  
✅ Real-time chat with RAG  
✅ Response time benchmarking  
✅ Conversation history  
✅ Multi-document querying  
✅ Modern dark theme UI  
✅ 100% Local ChromaDB storage  

## Need Help?

- API Docs: `/5_docs/5.1_API_DOCUMENTATION.md`
- Setup Guide: `/5_docs/5.4_SETUP.md`
- Testing Guide: `/5_docs/TESTING_GUIDE.md`

