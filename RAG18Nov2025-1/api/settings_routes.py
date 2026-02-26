from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, Dict, Any
import sys
sys.path.append(str(Path(__file__).parent.parent))
import config

router = APIRouter(prefix="/settings", tags=["settings"])


class ModelUpdate(BaseModel):
    model_id: str


class TemperatureUpdate(BaseModel):
    temperature: float


class EmbeddingUpdate(BaseModel):
    embedding_model: str


class PromptUpdate(BaseModel):
    custom_prompt: Optional[str] = None
    quiz_prompt: Optional[str] = None


class RetrievalUpdate(BaseModel):
    top_k: int


class OfflineModeUpdate(BaseModel):
    offline_mode: bool
    lm_studio_url: Optional[str] = None
    lm_studio_model: Optional[str] = None

@router.get("/config")
async def get_all_settings():
    """Get all RAG settings in one call"""
    return {
        "llm_model": config.LLM_MODEL,
        "temperature": config.LLM_TEMPERATURE,
        "embedding_model": config.EMBEDDING_MODEL,
        "retrieval_top_k": config.RETRIEVAL_TOP_K,
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT,
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL,
        "available_models": config.AVAILABLE_MODELS
    }


@router.get("/models")
async def get_available_models():
    """Get current and available models"""
    return {
        "current": config.LLM_MODEL,
        "available": config.AVAILABLE_MODELS
    }


@router.post("/model")
async def update_model(update: ModelUpdate):
    """Update LLM model and persist to .env"""
    config.LLM_MODEL = update.model_id
    config.persist_setting("LLM_MODEL", config.LLM_MODEL)
    return {
        "success": True,
        "model": config.LLM_MODEL
    }


@router.post("/temperature")
async def update_temperature(update: TemperatureUpdate):
    """Update temperature and persist to .env"""
    if not (0.0 <= update.temperature <= 2.0):
        raise HTTPException(status_code=400, detail="Temperature must be between 0.0 and 2.0")
    
    config.LLM_TEMPERATURE = update.temperature
    config.persist_setting("LLM_TEMPERATURE", config.LLM_TEMPERATURE)
    return {
        "success": True,
        "temperature": config.LLM_TEMPERATURE
    }


@router.post("/embedding")
async def update_embedding(update: EmbeddingUpdate):
    """Update embedding model and persist to .env"""
    config.EMBEDDING_MODEL = update.embedding_model
    config.persist_setting("EMBEDDING_MODEL", config.EMBEDDING_MODEL)
    return {
        "success": True,
        "embedding_model": config.EMBEDDING_MODEL
    }


@router.get("/prompts")
async def get_prompts():
    """Get current system and quiz prompts"""
    return {
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }


@router.post("/prompts")
async def update_prompts(update: PromptUpdate):
    """Update prompts and persist to .env"""
    if update.custom_prompt is not None:
        config.CUSTOM_SYSTEM_PROMPT = update.custom_prompt
        config.persist_setting("CUSTOM_SYSTEM_PROMPT", config.CUSTOM_SYSTEM_PROMPT)
    
    if update.quiz_prompt is not None:
        config.QUIZ_GENERATION_PROMPT = update.quiz_prompt
        config.persist_setting("QUIZ_GENERATION_PROMPT", config.QUIZ_GENERATION_PROMPT)
    
    return {
        "success": True,
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }


@router.get("/retrieval")
async def get_retrieval_config():
    """Get retrieval settings (top-k)"""
    return {
        "top_k": config.RETRIEVAL_TOP_K
    }


@router.post("/retrieval")
async def update_retrieval_config(update: RetrievalUpdate):
    """Update retrieval settings and persist to .env"""
    if not (5 <= update.top_k <= 100):
        raise HTTPException(status_code=400, detail="top_k must be between 5 and 100")
    
    config.RETRIEVAL_TOP_K = update.top_k
    config.persist_setting("RETRIEVAL_TOP_K", config.RETRIEVAL_TOP_K)
    return {
        "success": True,
        "top_k": config.RETRIEVAL_TOP_K
    }


@router.get("/offline")
async def get_offline_config():
    """Get offline mode settings"""
    return {
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }


@router.post("/offline")
async def update_offline_config(update: OfflineModeUpdate):
    """Update offline mode settings and persist to .env"""
    config.OFFLINE_MODE = update.offline_mode
    config.persist_setting("OFFLINE_MODE", str(config.OFFLINE_MODE))
    
    if update.lm_studio_url:
        config.LM_STUDIO_BASE_URL = update.lm_studio_url
        config.persist_setting("LM_STUDIO_BASE_URL", config.LM_STUDIO_BASE_URL)
    
    if update.lm_studio_model:
        config.LM_STUDIO_MODEL = update.lm_studio_model
        config.persist_setting("LM_STUDIO_MODEL", config.LM_STUDIO_MODEL)
    
    # Reset clients to pick up new settings
    try:
        import modules.shared.openai_client as client_module
        client_module._online_client = None
        client_module._offline_client = None
    except Exception as e:
        print(f"[Settings] Warning: Could not reset clients: {e}")
    
    return {
        "success": True,
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }

