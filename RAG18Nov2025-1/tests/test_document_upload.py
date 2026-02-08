import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.document_loader import load_document, validate_file

def test_document_loading():
    print("\n" + "="*60)
    print("TEST: Document Loading")
    print("="*60 + "\n")
    
    test_dir = Path(__file__).parent.parent / "0_data" / "input"
    test_dir.mkdir(parents=True, exist_ok=True)
    
    test_file = test_dir / "test_sample.txt"
    with open(test_file, 'w') as f:
        f.write("This is a test document for validation.")
    
    print(f"Created test file: {test_file.name}")
    
    print("\nTest 1: Loading valid document...")
    result = load_document(str(test_file))
    if result:
        print(f"✅ Successfully loaded: {result.name}")
    else:
        print("❌ Failed to load document")
    
    print("\nTest 2: Validating file...")
    is_valid = validate_file(str(test_file))
    if is_valid:
        print(f"✅ File validation passed")
    else:
        print("❌ File validation failed")
    
    print("\nTest 3: Invalid file extension...")
    invalid_path = test_dir / "invalid.xyz"
    is_valid = validate_file(str(invalid_path))
    if not is_valid:
        print("✅ Correctly rejected invalid extension")
    else:
        print("❌ Should have rejected invalid extension")
    
    print("\n" + "="*60)
    print("Document loading tests completed")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_document_loading()

