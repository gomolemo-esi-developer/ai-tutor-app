import logging
import sys

def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    
    # Check if root logger level is CRITICAL (insights mode disabled)
    root_logger = logging.getLogger()
    if root_logger.level >= logging.CRITICAL:
        logger.setLevel(logging.CRITICAL)
        logger.propagate = False
        # Don't add any handlers
        return logger
    
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

