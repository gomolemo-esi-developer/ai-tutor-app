import sys
from pathlib import Path
import time
sys.path.append(str(Path(__file__).parent.parent))

from modules.shared.chroma_client import get_chroma_collection
from modules.dynamic_engine.metadata_filter import create_chroma_metadata_filter
from modules.chatbot.retriever import retrieve_context
from modules.shared.openai_client import get_openai_client
from modules.chatbot.prompt_templates import CHAT_PROMPT_TEMPLATE
import config

def benchmark_rag_pipeline(question: str, document_ids: list, num_runs: int = 3):
    """
    Benchmark the RAG pipeline with detailed timing breakdown
    """
    print("\n" + "="*80)
    print("⏱️  RAG SYSTEM BENCHMARK".center(80))
    print("="*80)
    print(f"\n📊 Test Configuration:")
    print(f"   Question: {question}")
    print(f"   Documents: {len(document_ids)} selected")
    print(f"   Runs: {num_runs}")
    print(f"   Model: {config.LLM_MODEL}")
    print(f"   Embeddings: {config.EMBEDDING_MODEL}")
    
    results = {
        'retrieval_times': [],
        'generation_times': [],
        'total_times': [],
        'chunk_counts': [],
        'context_lengths': []
    }
    
    for run in range(1, num_runs + 1):
        print(f"\n{'─'*80}")
        print(f"🏃 Run {run}/{num_runs}")
        print(f"{'─'*80}")
        
        # STEP 1: Document Retrieval
        print("\n1️⃣  Retrieving relevant chunks from ChromaDB...")
        retrieval_start = time.time()
        
        try:
            collection = get_chroma_collection()
            filter_dict = create_chroma_metadata_filter(document_ids)
            
            # Perform retrieval
            context_docs = retrieve_context(
                question=question,
                document_ids=document_ids,
                k=5
            )
            
            retrieval_time = time.time() - retrieval_start
            results['retrieval_times'].append(retrieval_time)
            
            # Get context stats
            context_text = "\n\n".join([doc.page_content for doc in context_docs])
            chunk_count = len(context_docs)
            context_length = len(context_text)
            
            results['chunk_counts'].append(chunk_count)
            results['context_lengths'].append(context_length)
            
            print(f"   ✅ Retrieved: {chunk_count} chunks ({context_length:,} characters)")
            print(f"   ⏱️  Time: {retrieval_time:.3f}s")
            
        except Exception as e:
            print(f"   ❌ Retrieval failed: {e}")
            continue
        
        # STEP 2: LLM Generation
        print("\n2️⃣  Generating response with GPT-4...")
        generation_start = time.time()
        
        try:
            client = get_openai_client()
            
            # Build prompt
            prompt = CHAT_PROMPT_TEMPLATE.format(
                context=context_text,
                question=question
            )
            
            # Call OpenAI
            response = client.chat.completions.create(
                model=config.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            
            generation_time = time.time() - generation_start
            results['generation_times'].append(generation_time)
            
            answer = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            print(f"   ✅ Generated: {len(answer)} characters")
            print(f"   🎫 Tokens used: {tokens_used} (prompt: {response.usage.prompt_tokens}, completion: {response.usage.completion_tokens})")
            print(f"   ⏱️  Time: {generation_time:.3f}s")
            
        except Exception as e:
            print(f"   ❌ Generation failed: {e}")
            continue
        
        # Total time
        total_time = retrieval_time + generation_time
        results['total_times'].append(total_time)
        
        print(f"\n✅ Total time: {total_time:.3f}s")
        print(f"   • Retrieval: {retrieval_time:.3f}s ({(retrieval_time/total_time*100):.1f}%)")
        print(f"   • Generation: {generation_time:.3f}s ({(generation_time/total_time*100):.1f}%)")
    
    # Calculate averages
    if results['total_times']:
        print("\n" + "="*80)
        print("📈 BENCHMARK SUMMARY".center(80))
        print("="*80)
        
        avg_retrieval = sum(results['retrieval_times']) / len(results['retrieval_times'])
        avg_generation = sum(results['generation_times']) / len(results['generation_times'])
        avg_total = sum(results['total_times']) / len(results['total_times'])
        avg_chunks = sum(results['chunk_counts']) / len(results['chunk_counts'])
        avg_context = sum(results['context_lengths']) / len(results['context_lengths'])
        
        print(f"\n⏱️  Average Response Time: {avg_total:.3f}s")
        print(f"\n📊 Breakdown:")
        print(f"   • Retrieval:  {avg_retrieval:.3f}s ({(avg_retrieval/avg_total*100):.1f}%) {'⚡' if avg_retrieval < 0.5 else '✅' if avg_retrieval < 1 else '⏳'}")
        print(f"   • Generation: {avg_generation:.3f}s ({(avg_generation/avg_total*100):.1f}%) {'⚡' if avg_generation < 2 else '✅' if avg_generation < 5 else '⏳'}")
        
        print(f"\n📚 Context Statistics:")
        print(f"   • Chunks retrieved: {avg_chunks:.1f}")
        print(f"   • Context length: {avg_context:,.0f} characters")
        
        print(f"\n💡 Performance Rating:")
        if avg_total < 2:
            print("   ⚡⚡⚡ EXCELLENT - Lightning fast!")
        elif avg_total < 5:
            print("   ✅✅✅ GOOD - Optimal for user experience")
        elif avg_total < 10:
            print("   ⏳⏳ ACCEPTABLE - Normal for RAG systems")
        else:
            print("   🐌 SLOW - Consider optimization")
        
        print(f"\n🎯 Optimization Suggestions:")
        if avg_retrieval > 1:
            print("   • Retrieval is slow - check ChromaDB indexing")
        if avg_generation > 5:
            print("   • Generation is slow - consider using gpt-4o-mini for faster responses")
        if avg_chunks < 3:
            print("   • Low chunk retrieval - consider increasing k parameter")
        if avg_context > 10000:
            print("   • Large context - consider reducing chunk size or k parameter")
        
        if avg_total < 5 and avg_chunks >= 5:
            print("   ✅ System is well optimized! No changes needed.")
        
        print("\n" + "="*80 + "\n")
    else:
        print("\n❌ No successful runs to benchmark.")

def main():
    print("\n🔍 RAG System Performance Benchmark")
    print("="*80)
    
    # Get document IDs from ChromaDB
    try:
        collection = get_chroma_collection()
        results = collection.get()
        
        if not results['ids']:
            print("⚠️  No documents in ChromaDB. Please upload documents first.")
            return
        
        doc_ids = list(set([m.get('document_id') for m in results['metadatas'] if m.get('document_id')]))
        print(f"✅ Found {len(doc_ids)} document(s) in ChromaDB")
        
    except Exception as e:
        print(f"❌ Error accessing ChromaDB: {e}")
        return
    
    # Test questions
    test_questions = [
        "What is the money model framework?",
        "How should I think about pricing my product?",
        "What are the key strategies for scaling a business?"
    ]
    
    print(f"\n📝 Running benchmarks with {len(test_questions)} test questions...")
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n{'='*80}")
        print(f"TEST {i}/{len(test_questions)}".center(80))
        benchmark_rag_pipeline(question, doc_ids, num_runs=3)
        
        if i < len(test_questions):
            time.sleep(1)  # Brief pause between tests

if __name__ == "__main__":
    try:
        config.validate_config()
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

