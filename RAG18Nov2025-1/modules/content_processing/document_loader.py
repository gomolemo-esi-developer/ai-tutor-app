import os
from pathlib import Path
from typing import Optional
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

SUPPORTED_EXTENSIONS = {
    '.pdf', '.txt', '.docx',
    '.mp3', '.wav', '.m4a', '.flac', '.ogg',
    '.mp4', '.avi', '.mov', '.mkv', '.webm',
    '.pptx', '.ppt',
    '.cs', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.rb',
    '.php', '.swift', '.kt', '.scala', '.r', '.m', '.mm',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.md', '.csv'
}

def load_document(file_path: str) -> Optional[Path]:
    path = Path(file_path)
    
    if not path.exists():
        logger.error(f"File not found: {file_path}")
        return None
    
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        logger.error(f"Unsupported file type: {path.suffix}")
        return None
    
    logger.info(f"✅ Loaded document: {path.name}")
    return path

def get_supported_formats():
    return list(SUPPORTED_EXTENSIONS)

def validate_file(file_path: str) -> bool:
    path = Path(file_path)
    return path.exists() and path.suffix.lower() in SUPPORTED_EXTENSIONS

