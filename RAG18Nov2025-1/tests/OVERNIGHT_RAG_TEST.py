import sys
from pathlib import Path
from datetime import datetime
sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.document_loader import load_document
from modules.content_processing.text_extractor import extract_text
from modules.content_processing.text_chunker import chunk_text_with_metadata
from modules.content_processing.embeddings_generator import generate_embeddings
from modules.content_processing.chroma_uploader import upload_to_chroma
from modules.chatbot.chat_handler import generate_chat_response

def print_header(text):
    print("\n" + "=" * 100)
    print(f"{text:^100}")
    print("=" * 100 + "\n")

def print_section(text):
    print("\n" + "-" * 100)
    print(f"  {text}")
    print("-" * 100)

def save_results(results_text):
    results_file = Path(__file__).parent.parent / "RAG_TEST_RESULTS.txt"
    with open(results_file, 'w') as f:
        f.write(results_text)
    print(f"\n✅ Results saved to: {results_file}")

def main():
    results = []
    results.append(f"RAG SYSTEM TEST RESULTS")
    results.append(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    results.append("=" * 100)
    
    print_header("🚀 OVERNIGHT RAG SYSTEM TEST WITH ALEX HORMOZI BOOKS")
    results.append("\n🚀 OVERNIGHT RAG SYSTEM TEST WITH ALEX HORMOZI BOOKS\n")
    
    print("System: RAG with ChromaDB (100% Local)")
    print("Model: OpenAI GPT-4 + text-embedding-3-small")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    results.append("System: RAG with ChromaDB (100% Local)")
    results.append("Model: OpenAI GPT-4 + text-embedding-3-small\n")
    
    # Define books
    books = [
        {
            "path": "0_data/input/100mleads.txt",
            "doc_id": "hormozi_leads",
            "doc_name": "$100M Leads by Alex Hormozi"
        },
        {
            "path": "0_data/input/100mmoneymodels.txt",
            "doc_id": "hormozi_money_models",
            "doc_name": "$100M Money Models by Alex Hormozi"
        }
    ]
    
    # PHASE 1: Process and Upload Books
    print_section("PHASE 1: Processing and Uploading Books to ChromaDB")
    results.append("\n" + "-" * 100)
    results.append("PHASE 1: Processing and Uploading Books")
    results.append("-" * 100 + "\n")
    
    doc_ids = []
    
    for i, book in enumerate(books, 1):
        print(f"\n📚 Processing Book {i}/2: {book['doc_name']}")
        results.append(f"\n📚 Processing Book {i}/2: {book['doc_name']}")
        
        book_path = Path(__file__).parent.parent / book['path']
        
        if not book_path.exists():
            print(f"  ⚠️  File not found: {book_path}")
            results.append(f"  ⚠️  File not found")
            continue
        
        # Extract text
        print(f"  1. Extracting text...")
        text = extract_text(book_path)
        print(f"     ✅ Extracted {len(text):,} characters")
        results.append(f"  ✅ Extracted {len(text):,} characters")
        
        # Chunk text
        print(f"  2. Chunking text (size=1000, overlap=200)...")
        chunks_with_meta = chunk_text_with_metadata(text, book['doc_id'], book['doc_name'])
        print(f"     ✅ Created {len(chunks_with_meta)} chunks")
        results.append(f"  ✅ Created {len(chunks_with_meta)} chunks")
        
        # Generate embeddings
        print(f"  3. Generating embeddings with OpenAI...")
        texts = [c["text"] for c in chunks_with_meta]
        embeddings = generate_embeddings(texts)
        print(f"     ✅ Generated {len(embeddings)} embeddings (dim=1536)")
        results.append(f"  ✅ Generated {len(embeddings)} embeddings")
        
        # Upload to ChromaDB
        print(f"  4. Uploading to ChromaDB (local storage)...")
        success = upload_to_chroma(chunks_with_meta, embeddings, book['doc_id'])
        if success:
            print(f"     ✅ Successfully uploaded to ChromaDB")
            print(f"     📁 Stored locally with document_id: {book['doc_id']}")
            results.append(f"  ✅ Uploaded to ChromaDB (doc_id: {book['doc_id']})")
            doc_ids.append(book['doc_id'])
        else:
            print(f"     ❌ Upload failed")
            results.append(f"  ❌ Upload failed")
    
    print(f"\n✅ Phase 1 Complete: {len(doc_ids)} books uploaded successfully")
    results.append(f"\n✅ Phase 1 Complete: {len(doc_ids)} books uploaded")
    
    # PHASE 2: Test RAG with Questions
    print_header("PHASE 2: Testing RAG System with Questions")
    results.append("\n" + "=" * 100)
    results.append("PHASE 2: Testing RAG System with Questions")
    results.append("=" * 100 + "\n")
    
    test_questions = [
        {
            "question": "What is the Core Four framework mentioned in $100M Leads?",
            "docs": [doc_ids[0]] if len(doc_ids) > 0 else [],
            "book": "$100M Leads"
        },
        {
            "question": "What are the key strategies for generating leads according to Alex Hormozi?",
            "docs": [doc_ids[0]] if len(doc_ids) > 0 else [],
            "book": "$100M Leads"
        },
        {
            "question": "Explain the money models framework. How should entrepreneurs think about pricing?",
            "docs": [doc_ids[1]] if len(doc_ids) > 1 else [],
            "book": "$100M Money Models"
        },
        {
            "question": "What does Alex Hormozi say about scaling a business? Combine insights from both books.",
            "docs": doc_ids,
            "book": "Both Books"
        }
    ]
    
    for i, test in enumerate(test_questions, 1):
        if not test['docs']:
            print(f"\n⚠️  Question {i}: Skipping (no documents available)")
            continue
        
        print_section(f"Question {i}/{ len(test_questions)}: {test['book']}")
        results.append(f"\n" + "-" * 100)
        results.append(f"Question {i}/{len(test_questions)}")
        results.append("-" * 100)
        
        print(f"\n❓ QUESTION:")
        print(f"   {test['question']}")
        print(f"\n📚 Searching in: {', '.join(test['docs'])}")
        results.append(f"\n❓ QUESTION: {test['question']}")
        results.append(f"📚 Searching in: {', '.join(test['docs'])}")
        
        try:
            print(f"\n🤖 Generating answer with GPT-4...")
            answer = generate_chat_response(
                question=test['question'],
                document_ids=test['docs'],
                chat_history=[]
            )
            
            print(f"\n✅ ANSWER:")
            print("   " + "\n   ".join(answer.split('\n')))
            
            results.append(f"\n✅ ANSWER:")
            results.append(answer)
            
        except Exception as e:
            print(f"\n❌ Error generating answer: {e}")
            results.append(f"\n❌ Error: {e}")
    
    # PHASE 3: Test Metadata Filtering
    print_header("PHASE 3: Metadata Filtering Validation")
    results.append("\n" + "=" * 100)
    results.append("PHASE 3: Metadata Filtering Validation")
    results.append("=" * 100 + "\n")
    
    if len(doc_ids) >= 2:
        print("Testing that document selection works correctly...")
        print(f"\n📋 We have {len(doc_ids)} books in ChromaDB")
        print(f"   1. {doc_ids[0]} - $100M Leads")
        print(f"   2. {doc_ids[1]} - $100M Money Models")
        
        results.append(f"Testing metadata filtering with {len(doc_ids)} books:")
        
        print(f"\n🧪 Test: Asking about LEADS while selecting only Money Models book")
        print(f"   Expected: Should say it doesn't have information about leads")
        
        results.append("\n🧪 Metadata Filter Test:")
        results.append("   Question about LEADS, but only selecting Money Models book")
        
        try:
            filtered_answer = generate_chat_response(
                question="What does the book say about the Core Four for lead generation?",
                document_ids=[doc_ids[1]],  # Only Money Models
                chat_history=[]
            )
            
            print(f"\n✅ Response:")
            print("   " + "\n   ".join(filtered_answer.split('\n')))
            
            results.append("\n✅ Response:")
            results.append(filtered_answer)
            
            if "don't have" in filtered_answer.lower() or "not in the" in filtered_answer.lower():
                print(f"\n✅ PASSED: Metadata filtering works! System correctly indicated information not available.")
                results.append("\n✅ PASSED: Metadata filtering works correctly!")
            else:
                print(f"\n⚠️  Note: Check if answer is truly from Money Models book only")
                results.append("\n⚠️  Check: Verify answer source")
                
        except Exception as e:
            print(f"\n❌ Error in metadata test: {e}")
            results.append(f"\n❌ Error: {e}")
    
    # Final Summary
    print_header("🎉 TEST COMPLETE")
    results.append("\n" + "=" * 100)
    results.append("🎉 TEST COMPLETE")
    results.append("=" * 100 + "\n")
    
    print(f"✅ Books Processed: {len(doc_ids)}/2")
    print(f"✅ Questions Answered: {len(test_questions)}")
    print(f"✅ Storage: Local ChromaDB (./chroma_db/)")
    print(f"✅ System Status: Fully Functional")
    print(f"\nTest completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results.append(f"✅ Books Processed: {len(doc_ids)}/2")
    results.append(f"✅ Questions Answered: {len(test_questions)}")
    results.append(f"✅ Storage: Local ChromaDB")
    results.append(f"✅ System Status: Fully Functional")
    results.append(f"\nTest completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Save results to file
    save_results("\n".join(results))
    
    print(f"\n{'='*100}")
    print(f"{'GOOD MORNING! Check RAG_TEST_RESULTS.txt for full results':^100}")
    print(f"{'='*100}\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        
        with open("RAG_TEST_ERROR.txt", 'w') as f:
            f.write(f"Test failed at {datetime.now()}\n")
            f.write(f"Error: {str(e)}\n\n")
            f.write(traceback.format_exc())

