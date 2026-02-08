import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.document_loader import load_document
from modules.content_processing.text_extractor import extract_text
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.embeddings_generator import generate_embeddings
from modules.content_processing.chroma_uploader import upload_to_chroma
from modules.dynamic_engine.metadata_filter import query_with_filter
from modules.content_processing.embeddings_generator import generate_single_embedding

def create_test_document(filename: str, content: str):
    test_dir = Path(__file__).parent.parent / "0_data" / "input"
    test_dir.mkdir(parents=True, exist_ok=True)
    test_file = test_dir / filename
    with open(test_file, 'w') as f:
        f.write(content)
    return test_file

def test_metadata_filtering():
    print("\n" + "="*80)
    print("🎯 CRITICAL TEST: Metadata Filtering for Dynamic Document Selection")
    print("="*80 + "\n")
    
    print("Step 1: Creating 3 test documents...")
    doc1_path = create_test_document("test_doc_1.txt", "This is document 1 about photosynthesis. Plants convert sunlight into energy.")
    doc2_path = create_test_document("test_doc_2.txt", "This is document 2 about geology. Rocks are formed through various processes.")
    doc3_path = create_test_document("test_doc_3.txt", "This is document 3 about mathematics. Algebra involves solving equations.")
    print("✅ Created 3 test documents")
    
    print("\nStep 2: Processing and uploading documents to ChromaDB...")
    
    docs_info = []
    for doc_id, doc_path, doc_name in [
        ("test_doc_1", doc1_path, "test_doc_1.txt"),
        ("test_doc_2", doc2_path, "test_doc_2.txt"),
        ("test_doc_3", doc3_path, "test_doc_3.txt")
    ]:
        text = extract_text(doc_path)
        chunks_with_meta = chunk_text_with_metadata(text, doc_id, doc_name)
        texts = [c["text"] for c in chunks_with_meta]
        embeddings = generate_embeddings(texts)
        
        success = upload_to_chroma(chunks_with_meta, embeddings, doc_id)
        docs_info.append({"doc_id": doc_id, "doc_name": doc_name, "success": success})
        print(f"  ✅ Uploaded {doc_name} with ID: {doc_id}")
    
    print("\nStep 3: Testing metadata filtering...")
    print("  Query: 'Tell me about photosynthesis'")
    print("  Selected documents: [test_doc_1, test_doc_3]")
    print("  Expected: Only results from doc_1 and doc_3 (NOT doc_2)")
    
    query = "Tell me about photosynthesis"
    query_embedding = generate_single_embedding(query)
    
    selected_docs = ["test_doc_1", "test_doc_3"]
    matches = query_with_filter(query_embedding, selected_docs, top_k=5)
    
    print(f"\n  Retrieved {len(matches)} matches")
    
    print("\nStep 4: Verifying results...")
    doc_ids_in_results = set()
    for i, match in enumerate(matches[:5]):
        doc_id = match['metadata']['document_id']
        doc_name = match['metadata']['document_name']
        text_preview = match['metadata']['text'][:100]
        score = match['score']
        doc_ids_in_results.add(doc_id)
        print(f"\n  Match {i+1}:")
        print(f"    Document ID: {doc_id}")
        print(f"    Document Name: {doc_name}")
        print(f"    Score: {score:.4f}")
        print(f"    Text: {text_preview}...")
    
    print("\n" + "="*80)
    print("VALIDATION RESULTS:")
    print("="*80)
    
    success = True
    if "test_doc_2" in doc_ids_in_results:
        print("❌ FAILED: Found results from test_doc_2 (should be filtered out)")
        success = False
    else:
        print("✅ PASSED: No results from test_doc_2 (correctly filtered)")
    
    if "test_doc_1" in doc_ids_in_results or "test_doc_3" in doc_ids_in_results:
        print("✅ PASSED: Found results from selected documents (test_doc_1 or test_doc_3)")
    else:
        print("❌ FAILED: No results from selected documents")
        success = False
    
    print("\n" + "="*80)
    if success:
        print("🎉 SUCCESS: Metadata filtering works correctly with ChromaDB!")
        print("✅ R&D Concept Validated: Dynamic document selection via metadata filtering")
        print("✅ FULLY LOCAL - No cloud dependencies!")
    else:
        print("⚠️  FAILED: Metadata filtering needs debugging")
    print("="*80 + "\n")
    
    return success

if __name__ == "__main__":
    try:
        test_metadata_filtering()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
