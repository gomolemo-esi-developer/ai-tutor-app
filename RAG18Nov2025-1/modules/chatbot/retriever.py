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
    
    num_documents = len(document_ids)
    
    # Strategy: Retrieve enough chunks to guarantee at least 1-2 per document
    # If we have N documents, retrieve at least N * 3 chunks to have buffer for diversity
    if num_documents > 10:
        # Large module: get 3 chunks per document minimum
        extended_top_k = min(num_documents * 3, 150)
    else:
        # Small selection: standard multiplier
        extended_top_k = max(top_k * 5, num_documents * 3)
    
    logger.info(f"[Retriever] Retrieving {extended_top_k} chunks from {num_documents} documents (target: {top_k} final)")
    
    matches = query_with_filter(query_embedding, document_ids, extended_top_k)
    
    if not matches:
        logger.warning(f"[Retriever] No matches found for query in {num_documents} documents")
        return ""
    
    # Group matches by document
    matches_by_doc = {}
    for match in matches:
        metadata = match.get('metadata', {})
        doc_id = metadata.get('document_id', 'unknown')
        if doc_id not in matches_by_doc:
            matches_by_doc[doc_id] = []
        matches_by_doc[doc_id].append(match)
    
    logger.info(f"[Retriever] Found matches from {len(matches_by_doc)} documents out of {len(document_ids)} selected")
    
    # Diversity-first selection: guarantee all documents are represented
    selected_matches = []
    docs_covered = set()
    
    # Phase 1: Take the best chunk from each document in the request order
    for doc_id in document_ids:
        if len(selected_matches) >= top_k:
            break
        if doc_id in matches_by_doc and matches_by_doc[doc_id]:
            # Take the best (most similar) chunk from this document
            selected_matches.append(matches_by_doc[doc_id][0])
            docs_covered.add(doc_id)
    
    # Phase 2: If we still have slots, take second-best chunks from documents
    # that weren't represented yet
    if len(selected_matches) < top_k:
        for doc_id in document_ids:
            if len(selected_matches) >= top_k:
                break
            if doc_id not in docs_covered and doc_id in matches_by_doc:
                # Try to get a second chunk from this document
                if len(matches_by_doc[doc_id]) > 1:
                    selected_matches.append(matches_by_doc[doc_id][1])
                    docs_covered.add(doc_id)
    
    # Phase 3: Fill remaining slots with best chunks from any document
    if len(selected_matches) < top_k:
        for match in matches:
            if len(selected_matches) >= top_k:
                break
            if match not in selected_matches:
                selected_matches.append(match)
    
    # Build context from selected matches
    context_parts = []
    for match in selected_matches:
        metadata = match.get('metadata', {})
        text = metadata.get('text', '')
        doc_name = metadata.get('document_name', 'Unknown Document')
        
        if text:
            context_parts.append(f"[Source: {doc_name}]\n{text}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    coverage_percentage = (len(docs_covered) / num_documents * 100) if num_documents > 0 else 0
    logger.info(f"[Retriever] Retrieved context: {len(context)} characters from {len(context_parts)} chunks covering {len(docs_covered)}/{num_documents} documents ({coverage_percentage:.0f}%)")
    return context

