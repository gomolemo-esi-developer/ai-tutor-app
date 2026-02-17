import sys
from pathlib import Path
sys.path.append(str(Path.cwd() / "RAG18Nov2025-1"))

from RAG18Nov2025-1.modules.content_processing.embeddings_generator import generate_single_embedding
from RAG18Nov2025-1.modules.chatbot.retriever import retrieve_context

# Test with sample document IDs (from your logs)
test_docs = [
    '8d999158-3794-40f0-a5e0-b3af11f791b1',
    'be954652-b8dc-4d6c-87fe-0bcbf5e74aa4',
    'a61f3dc1-8a60-4bb9-9902-e0ed3f139359',
    'fc2e62f8-19a5-4a04-9756-ab6ff965a95c'
]

result = retrieve_context("Summarize all the documents in module", test_docs, top_k=15)
print("Retrieved context length:", len(result) if result else 0)
print("Result preview:", result[:200] if result else "NO RESULTS")
