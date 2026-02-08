import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import json
import uuid

sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.openai_client import get_openai_client
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

class QuizGenerator:
    def __init__(self):
        self.client = get_openai_client()
    
    def generate_quiz(
        self,
        content: str,
        module_id: str,
        content_id: str,
        title: str = None,
        num_questions: int = 5,
        question_types: List[str] = None
    ) -> Dict[str, Any]:
        if question_types is None:
            question_types = ["multiple-choice", "true-false"]
        
        if title is None:
            title = f"Quiz for {content_id}"
        
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
                                    "type": {"type": "string", "enum": ["multiple-choice", "true-false"]},
                                    "question": {"type": "string"},
                                    "options": {"type": "array", "items": {"type": "string"}},
                                    "correctAnswer": {"type": "string"},
                                    "explanation": {"type": "string"},
                                    "points": {"type": "number"}
                                },
                                "required": ["type", "question", "correctAnswer", "explanation", "points"]
                            }
                        }
                    },
                    "required": ["id", "title", "moduleId", "contentId", "questions"]
                }
            },
            "required": ["quiz"]
        }
        
        prompt = f"""Generate a quiz with {num_questions} questions based on the following content.

Content:
{content[:8000]}

Requirements:
- Generate {num_questions} questions
- Mix of question types: {', '.join(question_types)}
- For multiple-choice questions, provide 4 options
- For true-false questions, only provide "True" and "False" as options
- Each question should have a clear explanation
- Assign appropriate points (1-5) based on difficulty
- Use quiz ID: quiz_{int(datetime.now().timestamp())}_{content_id}
- Module ID: {module_id}
- Content ID: {content_id}
- Title: {title}

Focus on key concepts, important facts, and critical thinking questions."""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a quiz generation expert. Generate educational quizzes in the specified JSON format."},
                    {"role": "user", "content": prompt}
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "quiz_schema",
                        "strict": True,
                        "schema": quiz_schema
                    }
                },
                temperature=0.7
            )
            
            quiz_json = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Generated quiz with {len(quiz_json['quiz']['questions'])} questions")
            
            return quiz_json
            
        except Exception as e:
            logger.error(f"Quiz generation failed: {str(e)}")
            raise
    
    def generate_summary(
        self,
        content: str,
        module_id: str,
        content_id: str,
        title: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        if title is None:
            title = f"Summary of {content_id}"
        
        if description is None:
            description = f"AI-generated summary of content"
        
        summary_schema = {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "moduleId": {"type": "string"},
                        "contentId": {"type": "string"},
                        "createdAt": {"type": "string"},
                        "generatedBy": {"type": "string"},
                        "sections": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "content": {"type": "string"},
                                    "keyPoints": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    }
                                },
                                "required": ["title", "content", "keyPoints"]
                            }
                        }
                    },
                    "required": ["id", "title", "description", "moduleId", "contentId", "createdAt", "generatedBy", "sections"]
                }
            },
            "required": ["summary"]
        }
        
        timestamp = int(datetime.now().timestamp())
        summary_id = f"sum_{timestamp}_{content_id}"
        created_at = datetime.now().isoformat() + "Z"
        
        prompt = f"""Generate a comprehensive summary of the following content.

Content:
{content[:8000]}

Requirements:
- Create 3-5 main sections covering key topics
- Each section should have a title, content paragraph, and 3-5 key points
- Use summary ID: {summary_id}
- Title: {title}
- Description: {description}
- Module ID: {module_id}
- Content ID: {content_id}
- Created at: {created_at}
- Generated by: local-llm-v1

Focus on the most important concepts and make it easy to understand."""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a content summarization expert. Generate clear, structured summaries in the specified JSON format."},
                    {"role": "user", "content": prompt}
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "summary_schema",
                        "strict": True,
                        "schema": summary_schema
                    }
                },
                temperature=0.5
            )
            
            summary_json = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Generated summary with {len(summary_json['summary']['sections'])} sections")
            
            return summary_json
            
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
            raise

