"""
ChromaDB search functionality for RAG queries.

Provides semantic search over stored documents/chunks.
"""

from typing import List, Dict, Optional
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))

from modules.shared.chroma_client import get_chroma_collection
from modules.shared.logger import setup_logger
from modules.content_processing.embeddings_generator import generate_single_embedding
import config

logger = setup_logger(__name__)


def search_chunks(
    query: str,
    top_k: int = 5,
    document_ids: Optional[List[str]] = None,
    filter_by_module: Optional[str] = None
) -> List[Dict]:
    """
    Search ChromaDB for relevant chunks based on a query.
    
    Args:
        query: Search query text
        top_k: Number of top results to return
        document_ids: Optional list of specific document IDs to search in
        filter_by_module: Optional module code to filter by
        
    Returns:
        List of relevant chunks with metadata
    """
    try:
        logger.debug(f"Searching ChromaDB: query='{query}', top_k={top_k}")
        
        collection = get_chroma_collection()
        
        # Generate embedding for the query
        query_embedding = generate_single_embedding(query)
        
        # Build where filter if needed
        where_filter = None
        if document_ids or filter_by_module:
            where_filter = {}
            
            if document_ids:
                # Search only in specified documents
                where_filter["document_id"] = {"$in": document_ids}
            
            if filter_by_module:
                # Additionally filter by module
                where_filter["module_code"] = filter_by_module
        
        # Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["embeddings", "metadatas", "documents", "distances"]
        )
        
        if not results or not results['ids'] or len(results['ids']) == 0:
            logger.debug(f"No results found for query: {query}")
            return []
        
        # Format results
        chunks = []
        for i, (chunk_id, text, metadata, distance) in enumerate(
            zip(
                results['ids'][0],
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )
        ):
            # Calculate similarity score (inverse of distance)
            # ChromaDB uses cosine distance, so similarity = 1 - distance
            similarity_score = 1 - distance
            
            chunk = {
                "id": chunk_id,
                "text": text,
                "similarity": round(similarity_score, 4),
                "distance": round(distance, 4),
                "metadata": metadata,
                "rank": i + 1
            }
            chunks.append(chunk)
            
            logger.debug(
                f"Result {i+1}: similarity={chunk['similarity']}, "
                f"doc={metadata.get('document_id', 'unknown')}"
            )
        
        logger.info(f"✅ Found {len(chunks)} chunks for query: '{query}'")
        return chunks
        
    except Exception as e:
        logger.error(f"❌ Error searching ChromaDB: {e}")
        return []


def get_document_chunks(
    document_id: str,
    limit: Optional[int] = None
) -> List[Dict]:
    """
    Get all chunks for a specific document.
    
    Args:
        document_id: The document ID to get chunks for
        limit: Optional limit on number of chunks to return
        
    Returns:
        List of all chunks for the document
    """
    try:
        logger.debug(f"Getting chunks for document: {document_id}")
        
        collection = get_chroma_collection()
        
        # Query for all chunks with this document_id
        results = collection.get(
            where={"document_id": document_id},
            include=["metadatas", "documents"]
        )
        
        if not results or not results['ids']:
            logger.debug(f"No chunks found for document: {document_id}")
            return []
        
        # Format chunks
        chunks = []
        for chunk_id, text, metadata in zip(
            results['ids'],
            results['documents'],
            results['metadatas']
        ):
            chunk = {
                "id": chunk_id,
                "text": text,
                "metadata": metadata
            }
            chunks.append(chunk)
        
        # Apply limit if specified
        if limit:
            chunks = chunks[:limit]
        
        logger.info(f"✅ Retrieved {len(chunks)} chunks for document {document_id}")
        return chunks
        
    except Exception as e:
        logger.error(f"❌ Error getting document chunks: {e}")
        return []


def get_chunk_by_id(chunk_id: str) -> Optional[Dict]:
    """
    Get a specific chunk by its ID.
    
    Args:
        chunk_id: The chunk ID
        
    Returns:
        Chunk data or None if not found
    """
    try:
        logger.debug(f"Getting chunk: {chunk_id}")
        
        collection = get_chroma_collection()
        
        results = collection.get(
            ids=[chunk_id],
            include=["embeddings", "metadatas", "documents"]
        )
        
        if not results or not results['ids'] or len(results['ids']) == 0:
            logger.debug(f"Chunk not found: {chunk_id}")
            return None
        
        chunk = {
            "id": chunk_id,
            "text": results['documents'][0],
            "metadata": results['metadatas'][0]
        }
        
        logger.debug(f"✅ Retrieved chunk: {chunk_id}")
        return chunk
        
    except Exception as e:
        logger.error(f"❌ Error getting chunk: {e}")
        return None


def search_across_modules(
    query: str,
    module_ids: List[str],
    top_k: int = 5
) -> List[Dict]:
    """
    Search across multiple modules/documents.
    
    Args:
        query: Search query
        module_ids: List of module/document IDs to search
        top_k: Number of results per module
        
    Returns:
        Grouped results by module
    """
    try:
        logger.debug(f"Searching across {len(module_ids)} modules")
        
        collection = get_chroma_collection()
        query_embedding = generate_single_embedding(query)
        
        # Get results grouped by document
        results_by_module = {}
        
        for module_id in module_ids:
            try:
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where={"document_id": module_id},
                    include=["metadatas", "documents", "distances"]
                )
                
                if results and results['ids'] and len(results['ids'][0]) > 0:
                    chunks = []
                    for i, (chunk_id, text, metadata, distance) in enumerate(
                        zip(
                            results['ids'][0],
                            results['documents'][0],
                            results['metadatas'][0],
                            results['distances'][0]
                        )
                    ):
                        chunks.append({
                            "id": chunk_id,
                            "text": text,
                            "similarity": round(1 - distance, 4),
                            "metadata": metadata,
                            "rank": i + 1
                        })
                    
                    results_by_module[module_id] = {
                        "module_id": module_id,
                        "query_matches": len(chunks),
                        "chunks": chunks
                    }
                    
            except Exception as e:
                logger.warning(f"Error searching module {module_id}: {e}")
                results_by_module[module_id] = {
                    "module_id": module_id,
                    "error": str(e),
                    "chunks": []
                }
        
        logger.info(f"✅ Searched {len(module_ids)} modules, found results in {len([m for m in results_by_module.values() if m['chunks']])} modules")
        return list(results_by_module.values())
        
    except Exception as e:
        logger.error(f"❌ Error searching across modules: {e}")
        return []
