from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.chroma_search import (
    search_chunks,
    get_document_chunks,
    get_chunk_by_id,
    search_across_modules
)
from modules.shared.chroma_client import get_chroma_collection
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/student", tags=["student"])

class ChatRequest(BaseModel):
    question: str
    document_ids: List[str]
    chat_history: Optional[List[Dict]] = None

class SummaryRequest(BaseModel):
    document_ids: List[str]

class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    top_k: int = 5
    module_code: Optional[str] = None


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint that searches ChromaDB for relevant context and generates responses.
    
    - Searches available documents for relevant chunks
    - Uses LLM to generate answers based on retrieved context
    - Falls back to general knowledge if no documents are provided
    """
    try:
        import time
        
        if not request.question or len(request.question.strip()) == 0:
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        start_time = time.time()
        
        logger.info(f"📖 Chat request: '{request.question}'")
        logger.info(f"   Document IDs: {request.document_ids or 'None (general knowledge)'}")
        
        # Search for relevant chunks based on the question
        relevant_chunks = []
        if request.document_ids and len(request.document_ids) > 0:
            relevant_chunks = search_chunks(
                query=request.question,
                top_k=5,
                document_ids=request.document_ids
            )
            logger.info(f"   Found {len(relevant_chunks)} relevant chunks")
        else:
            logger.info("   No documents specified - using general knowledge")
        
        # Prepare context from retrieved chunks
        context = ""
        if relevant_chunks:
            context = "\n\n".join([
                f"[{chunk['metadata'].get('document_name', 'Unknown')} - Chunk {chunk['metadata'].get('chunk_index', 0)}]\n{chunk['text']}"
                for chunk in relevant_chunks[:3]  # Limit to top 3 chunks
            ])
        
        # Generate response using LLM
        try:
            from modules.chatbot.chat_handler import generate_chat_response
            
            answer = generate_chat_response(
                question=request.question,
                document_ids=request.document_ids,
                chat_history=request.chat_history or []
            )
        except Exception as e:
            logger.warning(f"Chat handler error: {e}, attempting direct LLM call")
            # Fallback: Use direct LLM call
            from modules.content_processing.llm_client import call_llm
            
            system_prompt = f"""You are a comprehensive and detailed AI tutor. Provide thorough, educational explanations that help students deeply understand the topic.

Guidelines:
- Give detailed explanations with examples and analogies when helpful
- Use clear structure with headings and bullet points for complex topics
- Provide context and background information to build understanding
- Include practical applications when relevant
- Format your response clearly with proper markdown
- Use bold, italics, and lists to improve readability
- Aim for substantive answers (not brief - be comprehensive)

If course materials are provided, use them as the primary source. If no materials are provided, use your general knowledge.

Course Materials Context:
{context if context else 'No specific course materials provided.'}

Always be accurate, educational, and encourage deep learning."""
            
            messages = request.chat_history or []
            messages.append({"role": "user", "content": request.question})
            
            answer = call_llm(system_prompt, messages)
        
        response_time = time.time() - start_time
        
        return {
            "success": True,
            "answer": answer,
            "document_ids_used": request.document_ids,
            "chunks_used": len(relevant_chunks),
            "response_time": round(response_time, 2),
            "used_course_materials": len(relevant_chunks) > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")

@router.post("/summary")
async def summary(request: SummaryRequest):
    try:
        return {
            "summary": "Summary endpoint ready - implementation pending module imports",
            "document_ids_used": request.document_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_available_documents():
    return {
        "message": "Document listing endpoint ready",
        "documents": []
    }


# NEW ENDPOINTS FOR STUDENT CHUNK ACCESS

@router.post("/search")
async def search_documents(request: SearchRequest):
    """
    Search ChromaDB for relevant chunks based on a query.
    
    Can search across all documents or specific document IDs.
    Returns relevant chunks with similarity scores.
    """
    try:
        if not request.query or len(request.query.strip()) == 0:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        logger.info(f"📖 Student search: '{request.query}'")
        logger.info(f"   Document IDs: {request.document_ids or 'All'}")
        logger.info(f"   Top K: {request.top_k}")
        
        chunks = search_chunks(
            query=request.query,
            top_k=request.top_k,
            document_ids=request.document_ids,
            filter_by_module=request.module_code
        )
        
        return {
            "success": True,
            "query": request.query,
            "total_results": len(chunks),
            "chunks": chunks,
            "filtered_by": {
                "document_ids": request.document_ids,
                "module_code": request.module_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/chunks")
async def get_document_all_chunks(
    document_id: str,
    limit: Optional[int] = Query(None, ge=1, le=100)
):
    """
    Get all chunks for a specific document.
    
    Useful for viewing all content from a single uploaded file/document.
    """
    try:
        logger.info(f"Fetching chunks for document: {document_id}")
        
        chunks = get_document_chunks(document_id, limit=limit)
        
        if not chunks:
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found for document {document_id}"
            )
        
        return {
            "success": True,
            "document_id": document_id,
            "total_chunks": len(chunks),
            "limit_applied": limit,
            "chunks": chunks
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chunks/{chunk_id}")
async def get_chunk(chunk_id: str):
    """
    Get a specific chunk by its ID.
    
    Used when student wants to view or reference a specific chunk.
    """
    try:
        logger.info(f"Fetching chunk: {chunk_id}")
        
        chunk = get_chunk_by_id(chunk_id)
        
        if not chunk:
            raise HTTPException(
                status_code=404,
                detail=f"Chunk not found: {chunk_id}"
            )
        
        return {
            "success": True,
            "chunk": chunk
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chunk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search-modules")
async def search_across_student_modules(request: SearchRequest):
    """
    Search across multiple modules for relevant content.
    
    Groups results by module for comparison across courses.
    """
    try:
        if not request.query or len(request.query.strip()) == 0:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        if not request.document_ids or len(request.document_ids) == 0:
            raise HTTPException(
                status_code=400,
                detail="document_ids (module IDs) required for multi-module search"
            )
        
        logger.info(f"📚 Multi-module search: '{request.query}'")
        logger.info(f"   Modules: {len(request.document_ids)}")
        
        results = search_across_modules(
            query=request.query,
            module_ids=request.document_ids,
            top_k=request.top_k
        )
        
        return {
            "success": True,
            "query": request.query,
            "modules_searched": len(request.document_ids),
            "modules_with_results": len([r for r in results if r['chunks']]),
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching modules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_chroma_stats():
    """
    Get statistics about available documents and chunks in ChromaDB.
    
    Shows how much content is available for students.
    """
    try:
        collection = get_chroma_collection()
        
        # Get all documents and chunks
        all_data = collection.get()
        
        if not all_data or not all_data['ids']:
            return {
                "success": True,
                "total_vectors": 0,
                "total_documents": 0,
                "documents": []
            }
        
        # Group by document_id
        documents = {}
        for metadata in all_data['metadatas']:
            doc_id = metadata.get('document_id', 'unknown')
            if doc_id not in documents:
                documents[doc_id] = {
                    "document_id": doc_id,
                    "document_name": metadata.get('document_name', 'Unknown'),
                    "chunk_count": 0,
                    "document_index": metadata.get('chunk_index', -1)
                }
            documents[doc_id]['chunk_count'] += 1
        
        return {
            "success": True,
            "total_vectors": len(all_data['ids']),
            "total_documents": len(documents),
            "documents": list(documents.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

