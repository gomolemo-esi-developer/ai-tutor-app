import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from modules.shared.chroma_client import get_chroma_collection
from modules.content_processing.document_loader import load_document
from modules.content_processing.text_extractor import extract_text
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.chroma_uploader import upload_to_chroma
from modules.content_processing.embeddings_generator import generate_embeddings

DEFAULT_DOCUMENTS = [
    {
        "path": "data/input/$100M Leads-Alex Hormozi.txt",
        "id": "hormozi_leads",
        "name": "$100M Leads by Alex Hormozi"
    },
    {
        "path": "data/input/100mmoneymodels.txt",
        "id": "hormozi_money_models",
        "name": "$100M Money Models by Alex Hormozi"
    },
    {
        "path": "data/input/Building a StoryBrand - Clarify Your Message So Customers -- Donal.txt",
        "id": "storybrand",
        "name": "Building a StoryBrand"
    }
]

def check_document_exists(doc_id: str) -> bool:
    try:
        collection = get_chroma_collection()
        results = collection.get(where={"document_id": doc_id}, limit=1)
        return len(results['ids']) > 0
    except:
        return False

def add_document(doc_path: str, doc_id: str, doc_name: str):
    print(f"  Processing: {doc_name}")
    
    doc = load_document(doc_path)
    text = extract_text(doc)
    chunks = chunk_text_with_metadata(text, doc_id, doc_name)
    
    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts)
    
    success = upload_to_chroma(chunks, embeddings, doc_id)
    
    if success:
        print(f"  [OK] Added: {doc_name} ({len(chunks)} chunks)")
    else:
        print(f"  [ERROR] Failed to add: {doc_name}")

def ensure_default_documents():
    print("\n" + "="*70)
    print("Test documents disabled - using educator-uploaded files only")
    print("="*70 + "\n")

if __name__ == "__main__":
    ensure_default_documents()

