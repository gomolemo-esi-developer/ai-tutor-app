# RAG Tutoring Chatbot - Documentation Overview

## You Are Here 👈

If you're seeing errors during file upload, start with:

1. **[QUICK_FIX.md](QUICK_FIX.md)** ← Start here (5 min)
2. **[INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)** ← Detailed guide
3. **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** ← Full setup instructions

---

## Quick Status

| Task | Status | File |
|------|--------|------|
| **Install & Run** | ✅ Ready | SETUP_AND_RUN.md |
| **Fix Upload Errors** | ✅ Fixed | QUICK_FIX.md |
| **Dependencies** | ✅ Documented | INSTALL_DEPENDENCIES.md |
| **Import Fixes** | ✅ Applied | IMPORT_FIXES_SUMMARY.md |
| **API Ready** | ✅ Yes | http://localhost:8000/docs |

---

## Common Tasks

### "How do I start the app?"
→ See [SETUP_AND_RUN.md](SETUP_AND_RUN.md) - "Start the Application"

### "Audio/video upload errors"
→ See [QUICK_FIX.md](QUICK_FIX.md) - 5 minute fix

### "What dependencies do I need?"
→ See [INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)

### "How do I upload a document?"
→ See [SETUP_AND_RUN.md](SETUP_AND_RUN.md) - "Common Commands"

### "What files can I upload?"
→ See [INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md) - "File Support"

### "FFmpeg installation help"
→ See [INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md) - "System Dependencies"

### "What got fixed?"
→ See [IMPORT_FIXES_SUMMARY.md](IMPORT_FIXES_SUMMARY.md)

---

## Project Structure

```
RAG18Nov2025-1/
├── api/                    # API routes (educators, students, quiz, etc)
├── modules/               # Core logic (chatbot, processing, RAG, etc)
├── conversion/            # File conversion (audio, video, PDF, images)
├── data/input/            # Your uploaded documents go here
├── chroma_db/             # Vector database (auto-created)
├── frontend/              # React UI (optional)
├── tests/                 # Test scripts
├── config.py              # Configuration file
├── main.py                # FastAPI app entry point
├── requirements.txt       # Minimal dependencies
├── requirements_full.txt  # All dependencies (recommended)
└── [Documentation files below]
```

---

## Documentation Files

### Setup & Installation
- **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** - Complete setup guide
- **[QUICK_FIX.md](QUICK_FIX.md)** - 5-minute fix for upload errors
- **[INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)** - Detailed dependency guide

### Fixes & Changes
- **[IMPORT_FIXES_SUMMARY.md](IMPORT_FIXES_SUMMARY.md)** - What was fixed
- **[DEPENDENCY_FIX_SUMMARY.md](DEPENDENCY_FIX_SUMMARY.md)** - Dependency fixes

### Installation Scripts
- **[install_all_windows.bat](install_all_windows.bat)** - Auto-installer for Windows
- **[install_all.sh](install_all.sh)** - Auto-installer for Mac/Linux

---

## 3-Step Quick Start

### 1️⃣ Install Everything
```bash
pip install -r requirements_full.txt
```

### 2️⃣ Install FFmpeg
- **Windows**: `choco install ffmpeg`
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### 3️⃣ Run the App
```bash
uvicorn main:app --reload
```

Then visit: **http://localhost:8000/docs**

---

## Supported File Types

After full installation, you can upload:

✅ **Text** - .txt, .md, .csv  
✅ **Code** - .py, .java, .cpp, .js, .ts, .go, .rs, .rb, etc  
✅ **Documents** - .pdf, .docx  
✅ **Presentations** - .pptx, .ppt  
✅ **Images** - .jpg, .png, .gif, .bmp, .tiff  
✅ **Audio** - .mp3, .wav, .m4a, .flac, .ogg  
✅ **Video** - .mp4, .avi, .mov, .mkv, .webm  

---

## Environment Setup

Create `.env` file in project root:
```
OPENAI_API_KEY=sk-your-key-here
```

Optional settings:
```
LLM_MODEL=gpt-4.1-nano
CHROMA_PERSIST_DIR=./chroma_db
CONVERSION_MODELS_DIR=./conversion/models
CONVERSION_OUTPUT_DIR=./conversion/output
```

---

## API Endpoints

After running `uvicorn main:app --reload`, visit:

- **API Docs** (Interactive): http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Upload Document**: `POST /educator/upload`
- **Ask Question**: `POST /student/chat`
- **Generate Quiz**: `POST /quiz/generate`

See http://localhost:8000/docs for full API documentation.

---

## Troubleshooting

### Upload Errors
See **[QUICK_FIX.md](QUICK_FIX.md)** or **[INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)**

### Module Import Errors
See **[IMPORT_FIXES_SUMMARY.md](IMPORT_FIXES_SUMMARY.md)**

### FFmpeg Not Found
See **[INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)** - System Dependencies

### Missing Python Packages
```bash
pip install -r requirements_full.txt
```

---

## Need Help?

1. **Quick answers** → [QUICK_FIX.md](QUICK_FIX.md)
2. **Detailed guide** → [INSTALL_DEPENDENCIES.md](INSTALL_DEPENDENCIES.md)
3. **Setup issues** → [SETUP_AND_RUN.md](SETUP_AND_RUN.md)
4. **Import problems** → [IMPORT_FIXES_SUMMARY.md](IMPORT_FIXES_SUMMARY.md)

---

## What's Been Done

✅ Fixed all import paths (0_data → data, 4_ui → ui, etc)  
✅ Created comprehensive dependency documentation  
✅ Built automated installation scripts  
✅ Updated setup guides with fixes  
✅ Added troubleshooting sections  

---

**Ready to get started?** → Start with [QUICK_FIX.md](QUICK_FIX.md) or [SETUP_AND_RUN.md](SETUP_AND_RUN.md)

---

*Last updated: 2025-11-28*
