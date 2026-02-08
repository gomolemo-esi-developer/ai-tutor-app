from typing import List, Dict, Any
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.chroma_client import get_chroma_collection

logger = setup_logger(__name__)

def create_document_filter(document_ids: List[str]) -> Dict[str, Any]:
    if not document_ids:
        logger.warning("Empty document_ids list provided")
        return {}
    
    if len(document_ids) == 1:
        filter_dict = {"document_id": {"$eq": document_ids[0]}}
    else:
        filter_dict = {"document_id": {"$in": document_ids}}
    
    logger.info(f"Created filter for {len(document_ids)} documents")
    return filter_dict

def query_with_filter(
    query_embedding: List[float],
    document_ids: List[str],
    top_k: int = 5
) -> List[Dict]:
    try:
        collection = get_chroma_collection()
        
        filter_dict = create_document_filter(document_ids)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_dict,
            include=["documents", "metadatas", "distances"]
        )
        
        matches = []
        if results and results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                match = {
                    'id': results['ids'][0][i],
                    'score': 1 - results['distances'][0][i],
                    'metadata': results['metadatas'][0][i]
                }
                match['metadata']['text'] = results['documents'][0][i]
                matches.append(match)
        
        logger.info(f"Retrieved {len(matches)} matches from ChromaDB")
        return matches
        
    except Exception as e:
        logger.error(f"Query failed: {e}")
        return []

def extract_texts_from_matches(matches: List[Dict]) -> List[str]:
    texts = []
    for match in matches:
        metadata = match.get('metadata', {})
        text = metadata.get('text', '')
        if text:
            texts.append(text)
    return texts
