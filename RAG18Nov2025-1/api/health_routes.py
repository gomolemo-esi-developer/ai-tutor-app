from fastapi import APIRouter
import config

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "RAG Tutoring Chatbot",
        "version": "1.0.0"
    }

@router.get("/config")
async def config_check():
    return {
        "vector_db": "ChromaDB (Local)",
        "chroma_collection": config.CHROMA_COLLECTION_NAME,
        "chroma_persist_dir": config.CHROMA_PERSIST_DIR,
        "embedding_model": config.EMBEDDING_MODEL,
        "llm_model": config.LLM_MODEL,
        "chunk_size": config.CHUNK_SIZE,
        "local_only": True
    }

