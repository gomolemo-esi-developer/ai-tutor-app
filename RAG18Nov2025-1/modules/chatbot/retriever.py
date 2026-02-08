from typing import List
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.content_processing.embeddings_generator import generate_single_embedding
from modules.dynamic_engine.metadata_filter import query_with_filter

logger = setup_logger(__name__)

def retrieve_context(
    query: str,
    document_ids: List[str],
    top_k: int = 5
) -> str:
    if not document_ids:
        logger.warning("No documents selected for retrieval")
        return ""
    
    query_embedding = generate_single_embedding(query)
    
    matches = query_with_filter(query_embedding, document_ids, top_k)
    
    context_parts = []
    for match in matches:
        metadata = match.get('metadata', {})
        text = metadata.get('text', '')
        doc_name = metadata.get('document_name', 'Unknown Document')
        
        if text:
            context_parts.append(f"[Source: {doc_name}]\n{text}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    logger.info(f"Retrieved context: {len(context)} characters from {len(context_parts)} chunks")
    return context

