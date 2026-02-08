from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
import config

logger = setup_logger(__name__)

def create_text_splitter():
    return RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

def chunk_text(text: str) -> List[str]:
    if not text or len(text.strip()) == 0:
        logger.warning("Empty text provided for chunking")
        return []
    
    splitter = create_text_splitter()
    chunks = splitter.split_text(text)
    
    logger.info(f"✅ Created {len(chunks)} chunks from text")
    return chunks

def chunk_text_with_metadata(text: str, document_id: str, document_name: str) -> List[dict]:
    chunks = chunk_text(text)
    
    chunks_with_metadata = []
    for idx, chunk in enumerate(chunks):
        chunks_with_metadata.append({
            "text": chunk,
            "metadata": {
                "document_id": document_id,
                "document_name": document_name,
                "chunk_index": idx,
                "chunk_total": len(chunks)
            }
        })
    
    return chunks_with_metadata

