from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from pathlib import Path
from typing import List, Optional
import sys
import shutil
import uuid
import json
import asyncio
import httpx

sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.document_loader import load_document
from modules.content_processing.text_extractor import extract_text
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.chroma_uploader import upload_to_chroma, verify_vectors_persisted
from modules.content_processing.embeddings_generator import generate_embeddings
from modules.shared.chroma_client import get_chroma_collection
import config

router = APIRouter(prefix="/educator", tags=["educator"])

DATA_INPUT_DIR = Path(__file__).parent.parent / "data" / "input"
DATA_INPUT_DIR.mkdir(parents=True, exist_ok=True)

async def process_document_with_progress(
    file_path: Path, 
    document_id: str, 
    document_name: str,
    callback_url: Optional[str] = None
):
    from modules.content_processing.file_converter import FileConverter
    
    converter = FileConverter(
        models_dir=config.CONVERSION_MODELS_DIR,
        output_dir=config.CONVERSION_OUTPUT_DIR
    )
    
    progress_messages = []
    
    def progress_callback(message: str):
        progress_messages.append(message)
    
    try:
        yield json.dumps({"status": "uploading", "progress": 5, "message": "File uploaded successfully"}) + "\n"
        await asyncio.sleep(0.1)
        
        file_ext = file_path.suffix.lower()
        file_type = converter.get_file_type(file_path)
        
        yield json.dumps({"status": "detecting", "progress": 10, "message": f"Detected {file_type} file"}) + "\n"
        await asyncio.sleep(0.1)
        
        yield json.dumps({"status": "converting", "progress": 15, "message": f"Converting {file_type} to text..."}) + "\n"
        await asyncio.sleep(0.1)
        
        text = converter.convert_to_text(str(file_path), progress_callback)
        
        if not text:
            raise ValueError("Failed to extract text from file")
        
        for msg in progress_messages:
            yield json.dumps({"status": "converting", "progress": 40, "message": msg}) + "\n"
            await asyncio.sleep(0.05)
        
        yield json.dumps({"status": "conversion_complete", "progress": 50, "message": f"Extracted {len(text)} characters"}) + "\n"
        await asyncio.sleep(0.1)
        
        yield json.dumps({"status": "chunking", "progress": 60, "message": "Splitting text into chunks..."}) + "\n"
        await asyncio.sleep(0.1)
        
        chunks = chunk_text_with_metadata(text, document_id, document_name)
        
        yield json.dumps({"status": "chunking_complete", "progress": 70, "message": f"Created {len(chunks)} chunks"}) + "\n"
        await asyncio.sleep(0.1)
        
        yield json.dumps({"status": "embedding", "progress": 75, "message": "Generating embeddings..."}) + "\n"
        await asyncio.sleep(0.1)
        
        texts = [chunk["text"] for chunk in chunks]
        embeddings = generate_embeddings(texts)
        
        yield json.dumps({"status": "embedding_complete", "progress": 85, "message": f"Generated {len(embeddings)} embeddings"}) + "\n"
        await asyncio.sleep(0.1)
        
        yield json.dumps({"status": "storing", "progress": 90, "message": "Storing in database..."}) + "\n"
        await asyncio.sleep(0.1)
        
        success = upload_to_chroma(chunks, embeddings, document_id)
        
        if not success:
            raise ValueError("Failed to upload to database")
        
        yield json.dumps({"status": "storing_complete", "progress": 95, "message": "Data stored successfully"}) + "\n"
        await asyncio.sleep(0.1)
        
        completion_data = {
            "status": "complete",
            "progress": 100,
            "message": "Processing complete!",
            "document_id": document_id,
            "filename": document_name,
            "chunks": len(chunks),
            "text_length": len(text),
            "file_type": file_type
        }
        
        yield json.dumps(completion_data) + "\n"
        
        # FIX (2026-01-23): Send webhook callback if provided
        if callback_url:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(
                        callback_url,
                        json={
                            "documentId": document_id,
                            "status": "COMPLETE",
                            "chunks": len(chunks),
                            "textLength": len(text),
                            "fileType": file_type,
                            "error": None
                        }
                    )
            except Exception as webhook_error:
                print(f"[RAG] Webhook callback failed: {webhook_error}")
                # Don't fail the upload if webhook fails - it's non-critical
        
    except Exception as e:
        error_msg = str(e)
        yield json.dumps({
            "status": "error",
            "progress": 0,
            "message": f"Error: {error_msg}"
        }) + "\n"
        
        # FIX (2026-01-23): Send error webhook callback if provided
        if callback_url:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(
                        callback_url,
                        json={
                            "documentId": document_id,
                            "status": "FAILED",
                            "chunks": 0,
                            "textLength": 0,
                            "fileType": None,
                            "error": error_msg
                        }
                    )
            except Exception as webhook_error:
                print(f"[RAG] Webhook callback failed: {webhook_error}")

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    callback_url: Optional[str] = Query(None)
):
    """
    Upload a document for processing.
    
    FIX (2026-01-23): Added callback_url query parameter for webhook notifications.
    
    Args:
        file: The document file to upload
        callback_url: Optional URL to POST completion status to
        
    Returns:
        Streaming NDJSON response with progress updates
    """
    try:
        file_path = DATA_INPUT_DIR / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        document_id = str(uuid.uuid4())
        document_name = file.filename
        
        return StreamingResponse(
            process_document_with_progress(file_path, document_id, document_name, callback_url),
            media_type="application/x-ndjson"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_documents():
    try:
        files = []
        for f in DATA_INPUT_DIR.iterdir():
            if f.is_file():
                files.append({
                    "id": f.stem,
                    "name": f.name,
                    "size": f.stat().st_size
                })
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview/{filename}")
async def preview_document(filename: str, max_chars: int = 100000):
    try:
        file_path = DATA_INPUT_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        from modules.content_processing.file_converter import FileConverter
        
        converter = FileConverter(
            models_dir=config.CONVERSION_MODELS_DIR,
            output_dir=config.CONVERSION_OUTPUT_DIR
        )
        
        if not converter.is_supported(str(file_path)):
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        file_type = converter.get_file_type(file_path)
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        is_truncated = False
        truncation_message = None
        
        output_dir = Path(config.CONVERSION_OUTPUT_DIR)
        file_stem = file_path.stem
        
        possible_output_files = [
            output_dir / f"{file_stem}_transcript.txt",
            output_dir / f"{file_stem}_code.txt",
            output_dir / f"{file_stem}_slides.txt",
            output_dir / f"{file_stem}_extracted.txt",
            output_dir / f"{file_stem}_ocr.txt",
            output_dir / f"{file_stem}_ocr_1.txt",
            output_dir / f"{file_stem}.txt",
        ]
        
        existing_output = None
        for output_file in possible_output_files:
            if output_file.exists():
                existing_output = output_file
                break
        
        if existing_output:
            try:
                with open(existing_output, 'r', encoding='utf-8') as f:
                    text = f.read()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read converted file: {str(e)}")
        else:
            if file_type in ['audio', 'video']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Audio/video preview requires file to be converted first. Upload this file through the upload endpoint to convert it, then preview will be available."
                )
            
            if file_type == 'pdf' and file_size_mb > 10:
                from pdf2image import convert_from_path
                import easyocr
                
                try:
                    images = convert_from_path(str(file_path), last_page=5)
                    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                    
                    extracted_pages = []
                    for i, image in enumerate(images, 1):
                        result = reader.readtext(image, detail=0, paragraph=False)
                        page_text = "\n".join(result) if result else ""
                        extracted_pages.append(f"--- Page {i} ---\n{page_text}")
                    
                    text = "\n\n".join(extracted_pages)
                    is_truncated = True
                    truncation_message = f"\n\n[Preview limited to first 5 pages due to file size ({file_size_mb:.1f} MB)]"
                    
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"PDF preview failed: {str(e)}")
            else:
                text = converter.convert_to_text(str(file_path))
                
                if not text:
                    raise HTTPException(status_code=500, detail="Failed to extract text")
        
        is_truncated = len(text) > max_chars
        if is_truncated:
            text = text[:max_chars]
            if not truncation_message:
                truncation_message = f"\n\n[Preview truncated at {max_chars:,} characters. Full text is available to students via chat.]"
        
        if is_truncated and truncation_message:
            text += truncation_message
        
        return {
            "filename": filename,
            "file_type": file_type,
            "text": text,
            "length": len(text),
            "lines": len(text.splitlines()),
            "is_truncated": is_truncated,
            "file_size_mb": round(file_size_mb, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{document_id}")
async def verify_document_vectors(document_id: str):
    """
    Verify that vectors for a document are actually stored in ChromaDB.
    
    This endpoint is critical for debugging the 'hasVectors flag without actual vectors' issue.
    
    Returns:
        - vectorsStored: True if vectors exist for this document
        - vectorCount: Number of vectors found
        - status: detailed status message
    """
    try:
        collection = get_chroma_collection()
        
        # Query for all vectors with this document_id
        results = collection.get(
            where={"document_id": document_id},
            include=["embeddings", "metadatas"]
        )
        
        vector_count = len(results['ids']) if results['ids'] else 0
        vectors_stored = vector_count > 0
        
        return {
            "document_id": document_id,
            "vectorsStored": vectors_stored,
            "vectorCount": vector_count,
            "status": f"Found {vector_count} vectors" if vectors_stored else "No vectors found",
            "details": {
                "ids": results['ids'][:5] if results['ids'] else [],  # Show first 5 IDs
                "metadata_sample": results['metadatas'][0] if results['metadatas'] else None
            }
        }
    except Exception as e:
        return {
            "document_id": document_id,
            "vectorsStored": False,
            "vectorCount": 0,
            "status": "error",
            "error": str(e)
        }

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document from the RAG system by document_id.
    Removes all chunks and embeddings from Chroma DB.
    
    Args:
        document_id: The unique document ID to delete
        
    Returns:
        Success message with deletion details
    """
    try:
        collection = get_chroma_collection()
        
        # Get all chunks for this document to count before deletion
        results = collection.get(
            where={"document_id": document_id},
            include=[]
        )
        
        chunk_count = len(results['ids']) if results['ids'] else 0
        
        if chunk_count == 0:
            raise HTTPException(status_code=404, detail=f"No chunks found for document {document_id}")
        
        # Delete all chunks for this document from Chroma DB
        collection.delete(
            where={"document_id": document_id}
        )
        
        return {
            "message": f"Deleted document {document_id}",
            "document_id": document_id,
            "chunks_deleted": chunk_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chunks/{document_id}")
async def get_document_chunks(document_id: str, limit: int = 100):
    """
    Retrieve chunks for a document by document_id.
    
    Args:
        document_id: The document ID to retrieve chunks for
        limit: Maximum number of chunks to return (default 100)
        
    Returns:
        List of chunks with their text content, metadata, and chunk index
    """
    try:
        collection = get_chroma_collection()
        
        # Query for all vectors with this document_id
        results = collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
            limit=limit
        )
        
        if not results['ids']:
            raise HTTPException(status_code=404, detail=f"No chunks found for document {document_id}")
        
        # Format chunks with their metadata
        chunks = []
        for i, (chunk_id, text, metadata) in enumerate(zip(
            results['ids'],
            results['documents'],
            results['metadatas']
        )):
            chunks.append({
                "index": i,
                "chunk_id": chunk_id,
                "text": text,
                "length": len(text),
                "metadata": metadata
            })
        
        return {
            "document_id": document_id,
            "total_chunks": len(chunks),
            "chunks": chunks
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
