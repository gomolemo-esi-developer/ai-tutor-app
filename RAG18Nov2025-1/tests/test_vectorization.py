import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.text_chunker import chunk_text, chunk_text_with_metadata
from modules.content_processing.embeddings_generator import generate_embeddings

def test_vectorization():
    print("\n" + "="*60)
    print("TEST: Text Chunking and Vectorization")
    print("="*60 + "\n")
    
    sample_text = """
    Photosynthesis is the process by which plants convert light energy into chemical energy.
    This process takes place in the chloroplasts of plant cells.
    The main equation for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2.
    Plants use carbon dioxide from the air and water from the soil.
    The glucose produced is used for energy and growth.
    """
    
    print("Test 1: Chunking text...")
    chunks = chunk_text(sample_text)
    print(f"✅ Created {len(chunks)} chunks")
    print(f"   Sample chunk: {chunks[0][:100]}...")
    
    print("\nTest 2: Chunking with metadata...")
    chunks_with_meta = chunk_text_with_metadata(
        sample_text,
        document_id="test_doc_001",
        document_name="photosynthesis.txt"
    )
    print(f"✅ Created {len(chunks_with_meta)} chunks with metadata")
    print(f"   Metadata: {chunks_with_meta[0]['metadata']}")
    
    print("\nTest 3: Generating embeddings...")
    texts = [c["text"] for c in chunks_with_meta]
    embeddings = generate_embeddings(texts)
    print(f"✅ Generated {len(embeddings)} embeddings")
    print(f"   Embedding dimension: {len(embeddings[0])}")
    print(f"   Expected dimension: 1536 (for text-embedding-3-small)")
    
    if len(embeddings[0]) == 1536:
        print("✅ Embedding dimensions correct!")
    else:
        print(f"⚠️  Warning: Unexpected embedding dimension")
    
    print("\n" + "="*60)
    print("Vectorization tests completed")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        test_vectorization()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

