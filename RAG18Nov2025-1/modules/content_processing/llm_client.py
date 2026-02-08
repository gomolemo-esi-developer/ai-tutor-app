"""
LLM client for generating responses using OpenAI GPT models.
"""

from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))

from openai import OpenAI
from modules.shared.logger import setup_logger
import config

logger = setup_logger(__name__)

_client = None

def get_llm_client():
    """Get or initialize OpenAI client."""
    global _client
    if _client is None:
        _client = OpenAI(api_key=config.OPENAI_API_KEY)
    return _client


def call_llm(system_prompt: str, messages: list, model: str = None, temperature: float = 0.7, max_tokens: int = 1000) -> str:
    """
    Call LLM with system prompt and conversation history.
    
    Args:
        system_prompt: System role/instruction
        messages: List of message dicts with 'role' and 'content' keys
        model: Model name (defaults to config.LLM_MODEL)
        temperature: Creativity level (0-1)
        max_tokens: Max response length
        
    Returns:
        Generated text response
    """
    try:
        if not model:
            model = config.LLM_MODEL
        
        client = get_llm_client()
        
        # Build message list with system prompt
        all_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history
        if messages:
            all_messages.extend(messages)
        
        logger.debug(f"Calling {model} with {len(all_messages)} messages")
        
        response = client.chat.completions.create(
            model=model,
            messages=all_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        answer = response.choices[0].message.content
        logger.debug(f"LLM response: {len(answer)} characters")
        
        return answer
        
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise


def generate_quiz_questions(context: str, num_questions: int = 5, difficulty: str = "medium") -> list:
    """
    Generate quiz questions from context.
    
    Args:
        context: Educational material to create questions from
        num_questions: Number of questions to generate
        difficulty: Question difficulty (easy, medium, hard)
        
    Returns:
        List of question dicts with question, options, and correct_answer
    """
    try:
        system_prompt = f"""You are an expert educational content creator. Generate {num_questions} multiple-choice quiz questions 
        at {difficulty} difficulty level from the provided course material.
        
        Return a JSON array with this structure:
        [
          {{
            "question": "What is...?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0,
            "explanation": "Explanation why this answer is correct"
          }}
        ]
        
        Only return the JSON array, no other text."""
        
        messages = [
            {"role": "user", "content": f"Course material:\n\n{context}"}
        ]
        
        response_text = call_llm(system_prompt, messages, max_tokens=2000)
        
        # Parse JSON response
        import json
        questions = json.loads(response_text)
        
        logger.info(f"Generated {len(questions)} quiz questions")
        return questions
        
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise


def generate_summary(text: str, max_length: int = 500) -> str:
    """
    Generate a concise summary of text.
    
    Args:
        text: Text to summarize
        max_length: Max summary length
        
    Returns:
        Summary text
    """
    try:
        system_prompt = f"""You are an expert summarizer. Create a concise summary of the provided text.
        Keep the summary to approximately {max_length} characters and capture the key points."""
        
        messages = [
            {"role": "user", "content": text}
        ]
        
        summary = call_llm(system_prompt, messages, max_tokens=max_length // 4)
        
        logger.debug(f"Generated summary: {len(summary)} characters")
        return summary
        
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise
