from typing import List, Dict
import uuid
from datetime import datetime
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.pinecone_client import get_pinecone_index

logger = setup_logger(__name__)

def upload_to_pinecone(
    chunks_with_metadata: List[Dict],
    embeddings: List[List[float]],
    document_id: str
) -> bool:
    try:
        index = get_pinecone_index()
        
        vectors_to_upsert = []
        for i, (chunk_data, embedding) in enumerate(zip(chunks_with_metadata, embeddings)):
            vector_id = f"{document_id}_chunk_{i}"
            
            metadata = chunk_data["metadata"].copy()
            metadata["text"] = chunk_data["text"]
            metadata["upload_date"] = datetime.now().isoformat()
            
            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding,
                "metadata": metadata
            })
        
        index.upsert(vectors=vectors_to_upsert)
        
        logger.info(f"✅ Uploaded {len(vectors_to_upsert)} vectors to Pinecone")
        return True
        
    except Exception as e:
        logger.error(f"Failed to upload to Pinecone: {e}")
        return False

def generate_document_id(document_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"doc_{timestamp}_{unique_id}"

