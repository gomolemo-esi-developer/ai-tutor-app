from pathlib import Path
from typing import Optional
import PyPDF2
import docx
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

def extract_text_from_pdf(file_path: Path) -> str:
    text = ""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        logger.info(f"✅ Extracted {len(text)} chars from PDF")
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""

def extract_text_from_txt(file_path: Path) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            text = file.read()
        logger.info(f"✅ Extracted {len(text)} chars from TXT")
        return text
    except Exception as e:
        logger.error(f"TXT extraction failed: {e}")
        return ""

def extract_text_from_docx(file_path: Path) -> str:
    try:
        doc = docx.Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        logger.info(f"✅ Extracted {len(text)} chars from DOCX")
        return text
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""

def extract_text(file_path: Path) -> Optional[str]:
    suffix = file_path.suffix.lower()
    
    if suffix == '.pdf':
        return extract_text_from_pdf(file_path)
    elif suffix == '.txt':
        return extract_text_from_txt(file_path)
    elif suffix == '.docx':
        return extract_text_from_docx(file_path)
    else:
        logger.error(f"Unsupported file type: {suffix}")
        return None

