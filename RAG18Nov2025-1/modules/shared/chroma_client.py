import chromadb
from chromadb.config import Settings
import config
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

_chroma_client = None
_collection = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=config.CHROMA_PERSIST_DIR,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        logger.info(f"✅ ChromaDB client initialized at {config.CHROMA_PERSIST_DIR}")
    return _chroma_client

def get_chroma_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        
        try:
            _collection = client.get_collection(name=config.CHROMA_COLLECTION_NAME)
            logger.info(f"✅ Connected to existing collection: {config.CHROMA_COLLECTION_NAME}")
        except:
            _collection = client.create_collection(
                name=config.CHROMA_COLLECTION_NAME,
                metadata={"description": "TUT RAG documents"}
            )
            logger.info(f"✅ Created new collection: {config.CHROMA_COLLECTION_NAME}")
    
    return _collection

def reset_collection():
    global _collection
    client = get_chroma_client()
    try:
        client.delete_collection(name=config.CHROMA_COLLECTION_NAME)
        logger.info(f"Deleted collection: {config.CHROMA_COLLECTION_NAME}")
    except:
        pass
    _collection = None
    return get_chroma_collection()

