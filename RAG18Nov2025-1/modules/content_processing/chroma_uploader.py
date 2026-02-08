from typing import List, Dict
import uuid
from datetime import datetime
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.chroma_client import get_chroma_collection

logger = setup_logger(__name__)

def upload_to_chroma(
    chunks_with_metadata: List[Dict],
    embeddings: List[List[float]],
    document_id: str
) -> bool:
    try:
        collection = get_chroma_collection()
        
        ids = []
        texts = []
        metadatas = []
        embeddings_list = []
        
        for i, (chunk_data, embedding) in enumerate(zip(chunks_with_metadata, embeddings)):
            vector_id = f"{document_id}_chunk_{i}"
            
            metadata = chunk_data["metadata"].copy()
            metadata["upload_date"] = datetime.now().isoformat()
            
            ids.append(vector_id)
            texts.append(chunk_data["text"])
            metadatas.append(metadata)
            embeddings_list.append(embedding)
        
        collection.add(
            ids=ids,
            embeddings=embeddings_list,
            metadatas=metadatas,
            documents=texts
        )
        
        logger.info(f"✅ Uploaded {len(ids)} vectors to ChromaDB")
        
        # CRITICAL: Verify vectors were actually persisted before returning success
        if not verify_vectors_persisted(document_id, len(ids)):
            logger.error(f"❌ Verification failed: Vectors were not persisted for document {document_id}")
            return False
        
        logger.info(f"✅ Verified {len(ids)} vectors persisted to disk for document {document_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to upload to ChromaDB: {e}")
        return False


def verify_vectors_persisted(document_id: str, expected_chunk_count: int) -> bool:
    """
    Verify that vectors were actually persisted to ChromaDB for a document.
    
    This prevents the 'hasVectors flag without actual vectors' bug where:
    - RAG service returns success
    - Node.js marks hasVectors=true
    - But vectors aren't actually on disk
    
    Args:
        document_id: The document ID to verify
        expected_chunk_count: Number of chunks that should be stored
        
    Returns:
        True if all expected vectors are found, False otherwise
    """
    try:
        collection = get_chroma_collection()
        
        # Query for vectors with this document_id
        results = collection.get(
            where={"document_id": document_id},
            include=["embeddings", "metadatas"]
        )
        
        stored_count = len(results['ids']) if results['ids'] else 0
        
        if stored_count != expected_chunk_count:
            logger.error(
                f"Vector persistence verification failed: "
                f"Expected {expected_chunk_count} vectors for document {document_id}, "
                f"but found {stored_count}"
            )
            return False
        
        logger.debug(f"✅ Verified {stored_count} vectors persisted for document {document_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verifying vector persistence: {e}")
        return False

def generate_document_id(document_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"doc_{timestamp}_{unique_id}"

