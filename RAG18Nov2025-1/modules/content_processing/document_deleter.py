from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.chroma_client import get_chroma_collection

logger = setup_logger(__name__)

def delete_document_from_chroma(document_id: str) -> bool:
    try:
        collection = get_chroma_collection()
        
        collection.delete(
            where={"document_id": document_id}
        )
        
        logger.info(f"✅ Deleted document from ChromaDB: {document_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        return False

def list_documents_in_chroma():
    try:
        collection = get_chroma_collection()
        count = collection.count()
        logger.info(f"Total vectors in collection: {count}")
        return {"total_vectors": count}
    except Exception as e:
        logger.error(f"Failed to get collection stats: {e}")
        return None
