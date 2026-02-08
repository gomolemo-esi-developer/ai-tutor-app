from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import config
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from api.health_routes import router as health_router
from api.educator_routes import router as educator_router
from api.student_routes import router as student_router
from api.document_list_routes import router as document_router
from api.settings_routes import router as settings_router
from api.quiz_routes import router as quiz_router

app = FastAPI(
    title="RAG Tutoring Chatbot",
    description="AI-powered tutoring with dynamic document selection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(educator_router)
app.include_router(student_router)
app.include_router(document_router, prefix="/api", tags=["documents"])
app.include_router(settings_router, prefix="/api", tags=["settings"])
app.include_router(quiz_router)

# Serve static UI files
ui_path = Path(__file__).parent / "ui"
if ui_path.exists():
    app.mount("/ui", StaticFiles(directory=str(ui_path)), name="ui")

@app.on_event("startup")
async def startup_event():
    config.validate_config()
    print("✅ Configuration validated")
    print(f"✅ Using model: {config.LLM_MODEL}")
    print(f"✅ Using embeddings: {config.EMBEDDING_MODEL}")
    print(f"✅ ChromaDB storage: {config.CHROMA_PERSIST_DIR}")
    print("✅ FULLY LOCAL - No cloud dependencies!")
    
    from startup_init import ensure_default_documents
    ensure_default_documents()

@app.get("/")
async def root():
    """Serve the UI"""
    ui_file = Path(__file__).parent / "ui" / "index.html"
    if ui_file.exists():
        return FileResponse(str(ui_file))
    return {
        "message": "RAG Tutoring Chatbot API",
        "status": "running",
        "version": "1.0.0",
        "docs_url": "/docs",
        "ui_url": "/ui"
    }

