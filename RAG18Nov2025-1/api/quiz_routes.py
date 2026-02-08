from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
from pathlib import Path
import json
from datetime import datetime

sys.path.append(str(Path(__file__).parent.parent))

from modules.chatbot.retriever import retrieve_context
from modules.shared.openai_client import get_openai_client, get_current_model
from modules.shared.logger import setup_logger
import config

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = setup_logger(__name__)

class QuizRequest(BaseModel):
    moduleId: str
    contentId: str
    title: Optional[str] = None
    numQuestions: Optional[int] = 20
    questionTypes: Optional[List[str]] = ["single-select", "multi-select", "fill-blank", "true-false"]
    documentIds: Optional[List[str]] = None

@router.post("/generate")
async def generate_quiz(request: QuizRequest):
    try:
        logger.info(f"Quiz request received - documentIds: {request.documentIds}")
        if not request.documentIds:
            raise HTTPException(
                status_code=400,
                detail="Please select at least one document to generate a quiz."
            )
        
        query = f"key concepts, important topics, and main ideas from the content"
        
        context = retrieve_context(
            query=query,
            document_ids=request.documentIds,
            top_k=config.RETRIEVAL_TOP_K
        )
        
        if not context.strip():
            raise HTTPException(
                status_code=400,
                detail="No content available. Please upload documents first or select valid documents."
            )
        
        title = request.title or f"Quiz for {request.contentId}"
        quiz_id = f"quiz_{int(datetime.now().timestamp())}_{request.contentId}"
        
        quiz_schema = {
            "type": "object",
            "properties": {
                "quiz": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "moduleId": {"type": "string"},
                        "contentId": {"type": "string"},
                        "questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {"type": "string", "enum": ["single-select", "multi-select", "fill-blank", "true-false"]},
                                    "question": {"type": "string"},
                                    "options": {"type": "array", "items": {"type": "string"}},
                                    "correctAnswer": {"type": "string"},
                                    "correctAnswers": {"type": "array", "items": {"type": "string"}},
                                    "explanation": {"type": "string"},
                                    "points": {"type": "number"}
                                },
                                "required": ["type", "question", "options", "correctAnswer", "correctAnswers", "explanation", "points"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["id", "title", "moduleId", "contentId", "questions"],
                    "additionalProperties": False
                }
            },
            "required": ["quiz"],
            "additionalProperties": False
        }
        
        prompt = f"""Based on the following course content, generate a comprehensive quiz with {request.numQuestions} questions.

Content from course materials:
{context[:8000]}

Requirements:
- Generate exactly {request.numQuestions} questions
- Distribute evenly across question types: {', '.join(request.questionTypes)}
- For single-select questions: provide exactly 4 options array, set correctAnswer to ONE correct answer (string)
- For multi-select questions: provide 4-5 options array, set correctAnswers array with 2-3 correct answers (use correctAnswers, leave correctAnswer as empty string)
- For fill-blank questions: provide empty options array [], short word/phrase answer in correctAnswer (string), leave correctAnswers empty
- For true-false questions: provide ["True", "False"] as options, set correctAnswer to "True" or "False" (string), leave correctAnswers empty
- Every question MUST include: type, question, options (array, can be empty), correctAnswer (string), explanation, and points (1-3)
- Use quiz ID: {quiz_id}
- Module ID: {request.moduleId}
- Content ID: {request.contentId}
- Title: {title}

CRITICAL JSON FORMAT RULES:
1. ALWAYS include ALL fields: type, question, options, correctAnswer, correctAnswers, explanation, points
2. For single-select, fill-blank, true-false: set correctAnswer (string), set correctAnswers to empty array []
3. For multi-select: set correctAnswers to array of correct answers, set correctAnswer to empty string ""
4. options must always be a string array (can be empty [] for fill-blank)
5. Each value must match its schema type exactly - options is array, correctAnswer is string, correctAnswers is array

Focus on key concepts, important facts, and critical thinking questions from the actual course content provided.
Ensure variety in question types to test different levels of understanding (recall, understanding, application)."""
        
        client = get_openai_client()
        current_model = get_current_model()
        
        params = {
            "model": current_model,
            "messages": [
                {"role": "system", "content": "You are an expert educational quiz generator. Create high-quality quiz questions based on course content in the specified JSON format."},
                {"role": "user", "content": prompt}
            ]
        }
        
        if not config.OFFLINE_MODE and current_model.startswith("gpt-"):
            params["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "quiz_schema",
                    "strict": True,
                    "schema": quiz_schema
                }
            }
            params["temperature"] = config.LLM_TEMPERATURE  # FIX (2026-01-23): Use config value
        else:
            params["temperature"] = config.LLM_TEMPERATURE  # FIX (2026-01-23): Use config value
            if config.OFFLINE_MODE:
                params["max_tokens"] = -1
            else:
                params["max_tokens"] = 2000
        
        response = client.chat.completions.create(**params)
        
        result = response.choices[0].message.content
        
        if config.OFFLINE_MODE or not current_model.startswith("gpt-"):
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()
        
        quiz_json = json.loads(result)
        
        logger.info(f"✅ Generated quiz with {len(quiz_json['quiz']['questions'])} questions")
        return quiz_json
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

