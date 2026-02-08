from pinecone import Pinecone, ServerlessSpec
import config
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

_pinecone_client = None
_index = None

def get_pinecone_client():
    global _pinecone_client
    if _pinecone_client is None:
        _pinecone_client = Pinecone(api_key=config.PINECONE_API_KEY)
        logger.info("✅ Pinecone client initialized")
    return _pinecone_client

def get_pinecone_index():
    global _index
    if _index is None:
        pc = get_pinecone_client()
        
        if config.PINECONE_INDEX_NAME not in pc.list_indexes().names():
            logger.info(f"Creating index: {config.PINECONE_INDEX_NAME}")
            pc.create_index(
                name=config.PINECONE_INDEX_NAME,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=config.PINECONE_ENVIRONMENT
                )
            )
        
        _index = pc.Index(config.PINECONE_INDEX_NAME)
        logger.info(f"✅ Connected to index: {config.PINECONE_INDEX_NAME}")
    
    return _index

