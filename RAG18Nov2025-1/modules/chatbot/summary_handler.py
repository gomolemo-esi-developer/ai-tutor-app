from typing import List
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger
from modules.shared.openai_client import get_openai_client, get_current_model
from modules.chatbot.retriever import retrieve_context
from modules.chatbot.prompt_templates import get_summary_prompt
import config

logger = setup_logger(__name__)

def generate_summary(document_ids: List[str]) -> str:
    context = retrieve_context(
        query="Provide a comprehensive overview of all key concepts",
        document_ids=document_ids,
        top_k=config.RETRIEVAL_TOP_K * 2
    )
    
    if not context:
        return "No content available to summarize. Please select some documents first."
    
    prompt_template = get_summary_prompt()
    prompt = prompt_template.format(context=context)
    
    try:
        client = get_openai_client()
        current_model = get_current_model()
        
        params = {
            "model": current_model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI tutor creating summaries."},
                {"role": "user", "content": prompt}
            ],
        }
        
        if config.OFFLINE_MODE:
            params["temperature"] = 0.5
            params["max_tokens"] = -1
        elif current_model.startswith("gpt-5"):
            params["max_completion_tokens"] = 1500
        else:
            params["temperature"] = 0.5
            params["max_tokens"] = 1500
        
        response = client.chat.completions.create(**params)
        
        summary = response.choices[0].message.content
        logger.info(f"Generated summary: {len(summary)} characters")
        return summary
        
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return f"I encountered an error generating the summary: {str(e)}"

