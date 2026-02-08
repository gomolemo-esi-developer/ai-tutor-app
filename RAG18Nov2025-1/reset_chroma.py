#!/usr/bin/env python3
"""
Reset ChromaDB - clears all vectors and collections.

Use this to start fresh before repopulating with educator uploads.
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from modules.shared.chroma_client import reset_collection
from modules.shared.logger import setup_logger

logger = setup_logger(__name__)

if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Resetting ChromaDB")
    logger.info("="*60)
    
    try:
        collection = reset_collection()
        logger.info("✅ ChromaDB reset successfully")
        logger.info("All vectors and collections have been cleared")
        logger.info("Ready for fresh population")
    except Exception as e:
        logger.error(f"❌ Error resetting ChromaDB: {e}")
        sys.exit(1)
