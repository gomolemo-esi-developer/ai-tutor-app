import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.document_loader import load_document
from modules.content_processing.text_extractor import extract_text
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.embeddings_generator import generate_embeddings
from modules.content_processing.chroma_uploader import upload_to_chroma
import uuid

def add_document_to_rag(file_path: str, document_id: str = None, document_name: str = None):
    """
    Complete pipeline to add a new document to the RAG system.
    
    Steps:
    1. Load document (PDF/TXT/DOCX)
    2. Extract text
    3. Chunk text (1000 chars, 200 overlap)
    4. Generate embeddings (OpenAI)
    5. Upload to ChromaDB
    
    Args:
        file_path: Path to document file
        document_id: Optional custom ID (auto-generated if not provided)
        document_name: Optional name (uses filename if not provided)
    
    Returns:
        document_id: The ID assigned to this document
    """
    
    print(f"\n{'='*80}")
    print(f"📄 Adding Document to RAG System".center(80))
    print(f"{'='*80}\n")
    
    # Step 1: Load document
    print("1️⃣  Loading document...")
    doc_path = load_document(file_path)
    if not doc_path:
        print("   ❌ Failed to load document")
        return None
    
    if document_name is None:
        document_name = doc_path.name
    
    if document_id is None:
        document_id = f"doc_{uuid.uuid4().hex[:8]}"
    
    print(f"   ✅ Loaded: {document_name}")
    print(f"   📝 Document ID: {document_id}")
    
    # Step 2: Extract text
    print("\n2️⃣  Extracting text...")
    text = extract_text(doc_path)
    if not text or len(text.strip()) == 0:
        print("   ❌ No text extracted from document")
        return None
    
    print(f"   ✅ Extracted {len(text):,} characters")
    
    # Step 3: Chunk text
    print("\n3️⃣  Chunking text...")
    chunks_with_meta = chunk_text_with_metadata(text, document_id, document_name)
    if not chunks_with_meta:
        print("   ❌ Failed to create chunks")
        return None
    
    print(f"   ✅ Created {len(chunks_with_meta)} chunks")
    
    # Step 4: Generate embeddings
    print("\n4️⃣  Generating embeddings...")
    texts = [chunk["text"] for chunk in chunks_with_meta]
    embeddings = generate_embeddings(texts)
    if not embeddings:
        print("   ❌ Failed to generate embeddings")
        return None
    
    print(f"   ✅ Generated {len(embeddings)} embeddings")
    
    # Step 5: Upload to ChromaDB
    print("\n5️⃣  Uploading to ChromaDB...")
    success = upload_to_chroma(chunks_with_meta, embeddings, document_id)
    
    if success:
        print(f"\n✅ SUCCESS! Document added to RAG system")
        print(f"   📁 Document ID: {document_id}")
        print(f"   📄 Document Name: {document_name}")
        print(f"   📊 Chunks: {len(chunks_with_meta)}")
        print(f"\n💡 You can now search this document in the terminal chat!")
        return document_id
    else:
        print("   ❌ Failed to upload to ChromaDB")
        return None

if __name__ == "__main__":
    print("\n" + "="*80)
    print("📚 ADD NEW DOCUMENT TO RAG SYSTEM".center(80))
    print("="*80)
    print("\nUsage:")
    print("  python3 3_tests/add_document.py")
    print("\nOr import and use:")
    print("  from add_document import add_document_to_rag")
    print("  add_document_to_rag('path/to/file.pdf')")
    print("\n" + "="*80)
    
    # Example: If run directly, prompt for file
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        document_id = sys.argv[2] if len(sys.argv) > 2 else None
        document_name = sys.argv[3] if len(sys.argv) > 3 else None
        
        add_document_to_rag(file_path, document_id, document_name)
    else:
        print("\n💡 Run with: python3 3_tests/add_document.py <file_path> [document_id] [document_name]")
        print("\nExample:")
        print("  python3 3_tests/add_document.py 0_data/input/mybook.txt")
        print("  python3 3_tests/add_document.py 0_data/input/mybook.txt custom_id 'My Book Name'")

