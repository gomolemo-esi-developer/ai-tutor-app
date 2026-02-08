from fastapi import APIRouter
from typing import List, Dict
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))
from modules.shared.chroma_client import get_chroma_collection

router = APIRouter()

@router.get("/documents", response_model=List[Dict[str, str]])
async def list_documents():
    """
    Get list of all available documents in ChromaDB
    Returns: [{"id": "doc_id", "name": "Document Name"}, ...]
    """
    try:
        collection = get_chroma_collection()
        results = collection.get()
        
        doc_info = {}
        for metadata in results['metadatas']:
            doc_id = metadata.get('document_id')
            doc_name = metadata.get('document_name', 'Unknown Document')
            if doc_id and doc_id not in doc_info:
                doc_info[doc_id] = doc_name
        
        documents = [
            {"id": doc_id, "name": doc_name}
            for doc_id, doc_name in sorted(doc_info.items())
        ]
        
        return documents
    except Exception as e:
        return [{"error": str(e)}]

