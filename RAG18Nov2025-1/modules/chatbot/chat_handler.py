from typing import List, Dict
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.openai_client import get_openai_client, get_current_model
from modules.chatbot.retriever import retrieve_context
from modules.chatbot.prompt_templates import get_chat_prompt
import config

logger = setup_logger(__name__)

def format_chat_history(messages: List[Dict]) -> str:
    if not messages:
        return "No previous conversation"
    
    formatted = []
    for msg in messages[-5:]:
        role = msg.get("role", "")
        content = msg.get("content", "")
        formatted.append(f"{role.capitalize()}: {content}")
    
    return "\n".join(formatted)

def generate_chat_response(
    question: str,
    document_ids: List[str],
    chat_history: List[Dict] = None
) -> str:
    if chat_history is None:
        chat_history = []
    
    context = retrieve_context(question, document_ids, top_k=config.RETRIEVAL_TOP_K)
    
    if not context:
        return "I don't have access to any course materials to answer your question. Please select some documents first."
    
    formatted_history = format_chat_history(chat_history)
    
    prompt_template = get_chat_prompt()
    prompt = prompt_template.format(
        context=context,
        chat_history=formatted_history,
        question=question
    )
    
    try:
        client = get_openai_client()
        current_model = get_current_model()
        
        params = {
            "model": current_model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI tutor."},
                {"role": "user", "content": prompt}
            ],
        }
        
        if config.OFFLINE_MODE:
            params["temperature"] = 0.7
            params["max_tokens"] = -1
        elif current_model.startswith("gpt-5"):
            params["max_completion_tokens"] = 1000
        else:
            params["temperature"] = 0.7
            params["max_tokens"] = 1000
        
        response = client.chat.completions.create(**params)
        
        answer = response.choices[0].message.content
        logger.info(f"Generated chat response: {len(answer)} characters")
        return answer
        
    except Exception as e:
        logger.error(f"Chat generation failed: {e}")
        return f"I encountered an error generating a response: {str(e)}"

