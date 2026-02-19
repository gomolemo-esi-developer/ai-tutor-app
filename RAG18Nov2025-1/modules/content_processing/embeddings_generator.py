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
    
    # FIX (2026-02-19): Process embeddings in batches to reduce memory usage
    # This prevents loading all embeddings into memory at once
    batch_size = 50  # Process 50 texts at a time
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = embeddings_model.embed_documents(batch)
        all_embeddings.extend(batch_embeddings)
        logger.info(f"✅ Generated embeddings for batch {i//batch_size + 1} ({len(batch)} texts)")
    
    logger.info(f"✅ Generated embeddings for {len(texts)} total texts")
    return all_embeddings

def generate_single_embedding(text: str) -> List[float]:
    embeddings_model = get_embeddings_model()
    embedding = embeddings_model.embed_query(text)
    return embedding

