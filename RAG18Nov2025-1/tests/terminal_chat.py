import sys
from pathlib import Path
import time
import os
import logging
sys.path.append(str(Path(__file__).parent.parent))

# ANSI color codes
BLUE = '\033[94m'
RESET = '\033[0m'

# Check for insights flag BEFORE importing modules
SHOW_INSIGHTS = False
if len(sys.argv) > 1:
    for arg in sys.argv[1:]:
        if 'insights' in arg.lower():
            if '=' in arg:
                value = arg.split('=')[1].lower()
                SHOW_INSIGHTS = value in ['1', 'true', 'yes', 'on']
            else:
                SHOW_INSIGHTS = True

# Configure logging BEFORE importing modules
if not SHOW_INSIGHTS:
    # Suppress all module logs
    logging.basicConfig(level=logging.CRITICAL)
    for logger_name in ['modules', 'modules.content_processing', 'modules.chatbot', 'modules.dynamic_engine', 'modules.shared']:
        logging.getLogger(logger_name).setLevel(logging.CRITICAL)
else:
    # Enable INFO level logging with blue color
    class BlueFormatter(logging.Formatter):
        def format(self, record):
            original = super().format(record)
            return f"{BLUE}{original}{RESET}"
    
    handler = logging.StreamHandler()
    handler.setFormatter(BlueFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s', 
                                       datefmt='%Y-%m-%d %H:%M:%S'))
    
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    for logger_name in ['modules', 'modules.content_processing', 'modules.chatbot', 'modules.dynamic_engine', 'modules.shared']:
        logging.getLogger(logger_name).setLevel(logging.INFO)

# NOW import modules after logging is configured
from modules.chatbot.chat_handler import generate_chat_response
from modules.shared.chroma_client import get_chroma_collection
import config

def print_header():
    print("\n" + "="*80)
    print("🤖 RAG TUTORING CHATBOT - Terminal Interface".center(80))
    print("="*80)
    print(f"📚 System: ChromaDB (Local) | Model: {config.LLM_MODEL} | Embeddings: {config.EMBEDDING_MODEL}")
    if SHOW_INSIGHTS:
        print(f"🔍 Insights Mode: {BLUE}ENABLED{RESET}")
    print("="*80 + "\n")

def list_available_documents():
    """List all documents in ChromaDB"""
    try:
        collection = get_chroma_collection()
        results = collection.get()
        
        if not results['ids']:
            print("⚠️  No documents found in ChromaDB. Please upload documents first.")
            return []
        
        # Extract unique document IDs and names
        doc_info = {}
        for metadata in results['metadatas']:
            doc_id = metadata.get('document_id')
            doc_name = metadata.get('document_name', 'Unknown')
            if doc_id and doc_id not in doc_info:
                doc_info[doc_id] = doc_name
        
        return doc_info
    except Exception as e:
        print(f"❌ Error listing documents: {e}")
        return {}

def select_documents(available_docs):
    """Let user select which documents to search"""
    if not available_docs:
        return []
    
    print("\n📚 Available Documents:")
    doc_list = list(available_docs.items())
    for i, (doc_id, doc_name) in enumerate(doc_list, 1):
        print(f"  {i}. {doc_name}")
    
    print(f"\n  {len(doc_list) + 1}. Search ALL documents")
    print(f"  0. Refresh document list")
    
    while True:
        try:
            choice = input("\n🔍 Select document number: ").strip().lower()
            
            if choice == '0':
                return 'refresh'
            
            if choice == 'all' or choice == str(len(doc_list) + 1):
                selected_names = [doc_name for _, doc_name in doc_list]
                print(f"\n✅ Selected: {', '.join(selected_names)}")
                return list(available_docs.keys())
            
            # Single number selection
            choice_num = int(choice)
            if 1 <= choice_num <= len(doc_list):
                selected_doc_id = doc_list[choice_num - 1][0]
                selected_name = doc_list[choice_num - 1][1]
                print(f"\n✅ Selected: {selected_name}")
                return [selected_doc_id]
            else:
                print(f"⚠️  Invalid choice. Please enter 1-{len(doc_list) + 1} or 0")
        except ValueError:
            print("⚠️  Invalid input. Please enter a number.")
        except Exception as e:
            print(f"⚠️  Error: {e}")

def chat_loop():
    """Main chat loop"""
    print_header()
    
    # Get available documents
    available_docs = list_available_documents()
    if not available_docs:
        print("\n💡 Tip: Run OVERNIGHT_RAG_TEST.py first to load documents into ChromaDB")
        return
    
    # Select documents
    selected_docs = select_documents(available_docs)
    if not selected_docs:
        return
    
    # Chat history
    chat_history = []
    
    print("\n" + "="*80)
    print("💬 Chat started! Type 'quit' to exit, 'clear' to reset, 'change' to switch docs")
    print("="*80 + "\n")
    
    while True:
        try:
            # Get user input
            user_input = input("👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye! Chat session ended.\n")
                break
            
            if user_input.lower() in ['clear', 'reset']:
                chat_history = []
                print("\n🔄 Chat history cleared.\n")
                continue
            
            if user_input.lower() in ['change', 'switch']:
                available_docs = list_available_documents()
                selected_docs = select_documents(available_docs)
                if selected_docs == 'refresh':
                    available_docs = list_available_documents()
                    selected_docs = select_documents(available_docs)
                if not selected_docs:
                    return
                chat_history = []
                print("\n🔄 Documents changed. Chat history cleared.\n")
                continue
            
            if user_input.lower() in ['help', 'h', '?']:
                print("\n📖 Commands:")
                print("  quit/exit/q  - Exit the chat")
                print("  clear/reset  - Clear chat history")
                print("  change/switch - Change selected documents")
                print("  help/h/?     - Show this help\n")
                continue
            
            # Generate response with benchmarking
            print("\n🤖 Assistant: ", end="", flush=True)
            
            try:
                start_time = time.time()
                
                response = generate_chat_response(
                    question=user_input,
                    document_ids=selected_docs,
                    chat_history=chat_history
                )
                
                end_time = time.time()
                total_time = end_time - start_time
                
                print(response)
                
                # Show benchmark
                print(f"\n⏱️  Response time: {total_time:.2f}s", end="")
                if total_time < 2:
                    print(" ⚡ (Fast!)")
                elif total_time < 5:
                    print(" ✅ (Good)")
                elif total_time < 10:
                    print(" ⏳ (Normal)")
                else:
                    print(" 🐌 (Slow - check connection)")
                
                # Update chat history
                chat_history.append({
                    "role": "user",
                    "content": user_input
                })
                chat_history.append({
                    "role": "assistant",
                    "content": response
                })
                
            except Exception as e:
                print(f"❌ Error: {e}")
                print("💡 Tip: Check your OpenAI API key and ChromaDB status")
            
            print()  # Empty line for spacing
            
        except KeyboardInterrupt:
            print("\n\n👋 Chat interrupted. Goodbye!\n")
            break
        except EOFError:
            print("\n\n👋 Chat ended. Goodbye!\n")
            break

def main():
    try:
        # Validate configuration
        config.validate_config()
        chat_loop()
    except Exception as e:
        print(f"\n❌ Startup Error: {e}")
        print("💡 Make sure your .env file is configured with OPENAI_API_KEY\n")

if __name__ == "__main__":
    main()

