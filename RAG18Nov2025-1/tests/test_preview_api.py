import sys
from pathlib import Path
import requests

sys.path.append(str(Path(__file__).parent.parent))

API_BASE = "http://localhost:8000"

def test_preview_api():
    print("\n" + "="*70)
    print("TESTING PREVIEW API")
    print("="*70)
    
    print("\n1. Getting list of documents...")
    try:
        response = requests.get(f"{API_BASE}/educator/documents")
        if response.status_code == 200:
            documents = response.json()
            print(f"   ✓ Found {len(documents)} documents")
            
            if documents:
                for doc in documents[:3]:
                    print(f"   - {doc['name']} (ID: {doc['id']})")
            else:
                print("   ⚠ No documents found. Upload a document first.")
                return
        else:
            print(f"   ✗ Failed to get documents: {response.status_code}")
            return
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return
    
    print("\n2. Testing preview for first document...")
    first_doc = documents[0]
    filename = first_doc['name']
    
    try:
        response = requests.get(f"{API_BASE}/educator/preview/{filename}")
        
        if response.status_code == 200:
            preview = response.json()
            print(f"   ✓ Preview loaded successfully")
            print(f"   File: {preview['filename']}")
            print(f"   Type: {preview['file_type']}")
            print(f"   Length: {preview['length']:,} characters")
            print(f"   Lines: {preview['lines']:,}")
            print(f"\n   Preview (first 300 chars):")
            print(f"   {'-'*66}")
            print(f"   {preview['text'][:300]}...")
            print(f"   {'-'*66}")
        else:
            error = response.json()
            print(f"   ✗ Failed to get preview: {error.get('detail', 'Unknown error')}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    print("\n" + "="*70)
    print("TEST COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    print("\n⚠️  Make sure the backend is running (python main.py)")
    print("⚠️  Make sure you have uploaded at least one document\n")
    
    try:
        test_preview_api()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

