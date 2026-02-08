import sys
from pathlib import Path
import asyncio
import json

sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.file_converter import FileConverter
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.embeddings_generator import generate_embeddings
from modules.content_processing.chroma_uploader import upload_to_chroma
import config

def test_file_types():
    print("\n" + "="*70)
    print("END-TO-END FILE TYPE CONVERSION TEST")
    print("="*70)
    
    converter = FileConverter(
        models_dir=config.CONVERSION_MODELS_DIR,
        output_dir=config.CONVERSION_OUTPUT_DIR
    )
    
    content_types_dir = Path(__file__).parent.parent / "0_data" / "contenttypes"
    
    test_files = [
        ("CameraController.cs", "code"),
        ("CHAPTER 1 - WHAT IS INTERACTION DESIGN.pptx", "pptx"),
    ]
    
    results = []
    
    for filename, expected_type in test_files:
        file_path = content_types_dir / filename
        
        if not file_path.exists():
            print(f"\n⚠️  Skipping {filename} (not found)")
            continue
        
        print(f"\n{'='*70}")
        print(f"Testing: {filename}")
        print(f"{'='*70}")
        
        try:
            file_type = converter.get_file_type(file_path)
            print(f"1. Detected type: {file_type} (expected: {expected_type})")
            
            print(f"2. Converting to text...")
            text = converter.convert_to_text(str(file_path))
            
            if not text:
                print(f"   ✗ Conversion returned None")
                results.append((filename, "FAILED", "No text extracted"))
                continue
            
            print(f"   ✓ Extracted {len(text)} characters")
            print(f"   Preview: {text[:150]}...")
            
            print(f"3. Chunking text...")
            document_id = f"test-{filename}"
            chunks = chunk_text_with_metadata(text, document_id, filename)
            print(f"   ✓ Created {len(chunks)} chunks")
            
            print(f"4. Generating embeddings...")
            texts = [chunk["text"] for chunk in chunks]
            embeddings = generate_embeddings(texts)
            print(f"   ✓ Generated {len(embeddings)} embeddings")
            
            print(f"5. Uploading to ChromaDB...")
            success = upload_to_chroma(chunks, embeddings, document_id)
            
            if success:
                print(f"   ✓ Successfully uploaded to database")
                results.append((filename, "SUCCESS", len(chunks)))
            else:
                print(f"   ✗ Failed to upload to database")
                results.append((filename, "FAILED", "Upload failed"))
            
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
            results.append((filename, "ERROR", str(e)))
    
    print(f"\n{'='*70}")
    print("TEST SUMMARY")
    print(f"{'='*70}")
    
    for filename, status, detail in results:
        status_icon = "✓" if status == "SUCCESS" else "✗"
        print(f"{status_icon} {filename}: {status}")
        if status == "SUCCESS":
            print(f"  → {detail} chunks created and uploaded")
        else:
            print(f"  → {detail}")
    
    print(f"{'='*70}\n")
    
    success_count = sum(1 for _, status, _ in results if status == "SUCCESS")
    print(f"Results: {success_count}/{len(results)} tests passed\n")
    
    return success_count == len(results)

if __name__ == "__main__":
    try:
        success = test_file_types()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

