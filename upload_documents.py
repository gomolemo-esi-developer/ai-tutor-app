#!/usr/bin/env python3
"""
Upload local documents to Render.com persistent disk
"""

import os
import requests
import json
from pathlib import Path

RAG_URL = "https://tutorverse-rag.onrender.com"
DOCS_DIR = "RAG18Nov2025-1/data/input"

def main():
    print("=" * 50)
    print("Migrate Local ChromaDB to Render")
    print("=" * 50)
    print()
    
    print("Configuration:")
    print(f"  RAG Service: {RAG_URL}")
    print(f"  Documents Dir: {DOCS_DIR}")
    print()
    
    # Check directory exists
    docs_path = Path(DOCS_DIR)
    if not docs_path.exists():
        print(f"Error: Directory not found: {DOCS_DIR}")
        return 1
    
    # Get documents
    documents = list(docs_path.glob("*"))
    documents = [f for f in documents if f.is_file()]
    
    if not documents:
        print(f"Error: No documents found in {DOCS_DIR}")
        return 1
    
    print(f"Found {len(documents)} document(s):")
    for doc in documents:
        size_mb = doc.stat().st_size / (1024 * 1024)
        print(f"  - {doc.name} ({size_mb:.2f} MB)")
    print()
    
    print("Starting upload...")
    print()
    
    success_count = 0
    failed_count = 0
    uploaded_docs = []
    
    for doc in documents:
        filename = doc.name
        filesize_mb = doc.stat().st_size / (1024 * 1024)
        
        print(f"Uploading: {filename} ({filesize_mb:.2f} MB)")
        
        try:
            with open(doc, 'rb') as f:
                files = {'file': (filename, f)}
                response = requests.post(f"{RAG_URL}/educator/upload", files=files, timeout=300)
            
            if response.status_code == 200:
                # Parse streaming response
                lines = response.text.split('\n')
                last_json = None
                
                for line in lines:
                    if line.strip():
                        try:
                            last_json = json.loads(line)
                        except:
                            pass
                
                if last_json and last_json.get('status') == 'complete':
                    chunks = last_json.get('chunks', 0)
                    doc_id = last_json.get('document_id', '')
                    print(f"  SUCCESS: {chunks} chunks indexed")
                    print(f"  ID: {doc_id}")
                    success_count += 1
                    uploaded_docs.append({
                        'name': filename,
                        'doc_id': doc_id,
                        'chunks': chunks
                    })
                else:
                    print(f"  FAILED: Status={last_json.get('status') if last_json else 'unknown'}")
                    if last_json and 'error' in last_json:
                        print(f"  Error: {last_json.get('error')}")
                    failed_count += 1
            else:
                print(f"  FAILED: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                failed_count += 1
                
        except Exception as e:
            print(f"  ERROR: {str(e)}")
            failed_count += 1
        
        print()
    
    # Summary
    print("=" * 50)
    print("Migration Complete")
    print("=" * 50)
    print()
    print(f"Successful: {success_count}")
    print(f"Failed: {failed_count}")
    print()
    
    if uploaded_docs:
        print("Verification:")
        for doc in uploaded_docs:
            print(f"  curl \"{RAG_URL}/educator/verify/{doc['doc_id']}\"")
        print()
        print("SUCCESS: Chunks migrated to Render disk!")
        print("Quiz/Chat now use online chunks from Render")
    
    return 0

if __name__ == "__main__":
    exit(main())
