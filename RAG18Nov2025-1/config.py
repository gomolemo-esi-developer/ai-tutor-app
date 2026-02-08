import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "tut_documents")

# FIX (2026-01-23): Made these configurable via environment variables
# Allows different deployments to use different models/parameters without code changes
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "15"))

# LLM Model Options:
# GPT-5 Series:
# - "gpt-5" - Latest GPT-5, best quality
# - "gpt-5-mini" - GPT-5 mini, faster, cheaper
# - "gpt-5-nano" - GPT-5 nano, fastest, cheapest
# GPT-4 Series:
# - "gpt-4.1-nano" - Latest nano model, fastest, cheapest (~$0.0001/1K tokens)
# - "gpt-4.1-mini" - Latest mini model, fast, very cheap (~$0.0002/1K tokens)
# - "gpt-4" - Best quality, slower, more expensive (~$0.03/1K tokens)
# - "gpt-4-turbo" - Faster GPT-4, better quality (~$0.01/1K tokens)
# - "gpt-4o" - Latest GPT-4 optimized model (~$0.005/1K tokens)
# - "gpt-4o-mini" - Fast, cheap, good quality (~$0.00015/1K tokens)
# - "gpt-3.5-turbo" - Legacy, very fast, cheaper (~$0.0015/1K tokens)
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4.1-nano")

AVAILABLE_MODELS = [
    {"id": "gpt-5", "name": "GPT-5", "description": "Latest, best quality"},
    {"id": "gpt-5-mini", "name": "GPT-5 Mini", "description": "Fast, cheaper"},
    {"id": "gpt-5-nano", "name": "GPT-5 Nano", "description": "Fastest, cheapest"},
    {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano", "description": "Current default"},
    {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", "description": "Fast & cheap"},
    {"id": "gpt-4o", "name": "GPT-4o", "description": "Optimized GPT-4"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "Very cheap"},
    {"id": "gpt-4", "name": "GPT-4", "description": "Best GPT-4"},
    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Faster GPT-4"},
]

CUSTOM_SYSTEM_PROMPT = os.getenv("CUSTOM_SYSTEM_PROMPT", "")
QUIZ_GENERATION_PROMPT = os.getenv("QUIZ_GENERATION_PROMPT", "")

# FIX (2026-01-23): Made temperature and offline mode configurable
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
OFFLINE_MODE = os.getenv("OFFLINE_MODE", "False").lower() in ("true", "1", "yes")
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://192.168.0.134:1234/v1")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "openai/gpt-oss-20b")

CONVERSION_MODELS_DIR = os.getenv("CONVERSION_MODELS_DIR", "./conversion/models")
CONVERSION_OUTPUT_DIR = os.getenv("CONVERSION_OUTPUT_DIR", "./conversion/output")
CONVERSION_ENGINES = {
    "audio": "whisper",
    "ocr": "easyocr"
}

def validate_config():
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not found in environment")
    
    persist_dir = Path(CHROMA_PERSIST_DIR)
    persist_dir.mkdir(parents=True, exist_ok=True)
    
    return True

