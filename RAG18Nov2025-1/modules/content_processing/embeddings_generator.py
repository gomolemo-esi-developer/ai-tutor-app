from typing import List
from langchain_openai import OpenAIEmbeddings
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
import config

logger = setup_logger(__name__)

_embeddings_model = None

def get_embeddings_model():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = OpenAIEmbeddings(
            model=config.EMBEDDING_MODEL,
            openai_api_key=config.OPENAI_API_KEY
        )
        logger.info(f"✅ Initialized embeddings model: {config.EMBEDDING_MODEL}")
    return _embeddings_model

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    
    embeddings_model = get_embeddings_model()
    embeddings = embeddings_model.embed_documents(texts)
    
    logger.info(f"✅ Generated embeddings for {len(texts)} texts")
    return embeddings

def generate_single_embedding(text: str) -> List[float]:
    embeddings_model = get_embeddings_model()
    embedding = embeddings_model.embed_query(text)
    return embedding

