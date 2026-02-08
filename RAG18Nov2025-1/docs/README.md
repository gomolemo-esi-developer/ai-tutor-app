# RAG Tutoring Chatbot System

AI-powered tutoring chatbot with dynamic document selection using RAG (Retrieval-Augmented Generation).

## Architecture

- **Per-document vectorization** with metadata filtering
- **ChromaDB** - LOCAL vector database (no cloud, no fees!)
- **LangChain** for RAG orchestration
- **OpenAI** GPT-4 for chat and embeddings
- **FastAPI** backend with **React** frontend
- **100% Local Storage** - Perfect for university environment

## Quick Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Keys

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
OPENAI_API_KEY=sk-...
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=tut_documents
```

**That's it! No Pinecone account needed - fully local!**

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Run Both Backend and Frontend

**Terminal 1 - Backend:**
```bash
source venv/bin/activate  # If using virtual environment
uvicorn main:app --reload
```
Backend API runs at: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend UI runs at: http://localhost:5173

Open http://localhost:5173 in your browser to use the chatbot!

## Project Structure

```
/RAG
├── 0_data/              # Test documents
├── 1_modules/           # Core modules (numbered)
├── 2_api/               # FastAPI routes
├── 3_tests/             # Test scripts
├── frontend/            # React + Vite + Tailwind UI
├── 4_ui/                # Legacy HTML/CSS/JS interface (deprecated)
└── 5_docs/              # Documentation
```

## Testing Documents

Place test documents in `/0_data/input/`:
- PDF files
- TXT files
- DOCX files

## Development Phases

**Phase 1** (Current): Basic RAG chatbot with document upload and chat
**Phase 2** (Later): Quiz generation and performance optimization

## Usage

1. Upload documents via educator interface
2. Documents are automatically vectorized and stored
3. Students select documents and chat with AI
4. AI answers questions based only on selected documents

## Key Features

- ✅ Dynamic document selection via metadata filtering
- ✅ Per-document vectorization (no re-processing needed)
- ✅ Multi-document queries in single search
- ✅ Conversation history support
- ✅ Summary generation

## API Documentation

See `/5_docs/5.1_API_DOCUMENTATION.md` for detailed API reference.

