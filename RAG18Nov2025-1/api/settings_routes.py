from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import sys
sys.path.append(str(Path(__file__).parent.parent))
import config

router = APIRouter(prefix="/settings", tags=["settings"])

class ModelUpdate(BaseModel):
    model_id: str

class PromptUpdate(BaseModel):
    custom_prompt: Optional[str] = None
    quiz_prompt: Optional[str] = None

class RetrievalUpdate(BaseModel):
    top_k: int

class OfflineModeUpdate(BaseModel):
    offline_mode: bool
    lm_studio_url: Optional[str] = None
    lm_studio_model: Optional[str] = None

@router.get("/models")
async def get_available_models():
    return {
        "current": config.LLM_MODEL,
        "available": config.AVAILABLE_MODELS
    }

@router.post("/model")
async def update_model(update: ModelUpdate):
    config.LLM_MODEL = update.model_id
    return {
        "success": True,
        "model": config.LLM_MODEL
    }

@router.get("/prompts")
async def get_prompts():
    return {
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }

@router.post("/prompts")
async def update_prompts(update: PromptUpdate):
    if update.custom_prompt is not None:
        config.CUSTOM_SYSTEM_PROMPT = update.custom_prompt
    if update.quiz_prompt is not None:
        config.QUIZ_GENERATION_PROMPT = update.quiz_prompt
    return {
        "success": True,
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }

@router.get("/retrieval")
async def get_retrieval_config():
    return {
        "top_k": config.RETRIEVAL_TOP_K
    }

@router.post("/retrieval")
async def update_retrieval_config(update: RetrievalUpdate):
    config.RETRIEVAL_TOP_K = update.top_k
    return {
        "success": True,
        "top_k": config.RETRIEVAL_TOP_K
    }

@router.get("/offline")
async def get_offline_config():
    return {
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }

@router.post("/offline")
async def update_offline_config(update: OfflineModeUpdate):
    config.OFFLINE_MODE = update.offline_mode
    if update.lm_studio_url:
        config.LM_STUDIO_BASE_URL = update.lm_studio_url
    if update.lm_studio_model:
        config.LM_STUDIO_MODEL = update.lm_studio_model
    
    import modules.shared.openai_client as client_module
    client_module._online_client = None
    client_module._offline_client = None
    
    return {
        "success": True,
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }

