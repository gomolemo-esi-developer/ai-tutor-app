import os
from pathlib import Path

class FileHandler:
    def __init__(self, output_dir):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_input_file(self, filepath, allowed_extensions=None):
        path = Path(filepath)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        if not path.is_file():
            raise ValueError(f"Not a file: {filepath}")
        
        if allowed_extensions:
            if path.suffix.lower() not in allowed_extensions:
                raise ValueError(f"Invalid file type. Allowed: {allowed_extensions}")
        
        return path
    
    def get_output_path(self, input_path, suffix="_output", extension=".txt"):
        input_path = Path(input_path)
        base_name = input_path.stem
        output_filename = f"{base_name}{suffix}{extension}"
        output_path = self.output_dir / output_filename
        
        counter = 1
        while output_path.exists():
            output_filename = f"{base_name}{suffix}_{counter}{extension}"
            output_path = self.output_dir / output_filename
            counter += 1
        
        return output_path
    
    def save_text(self, content, output_path):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    def get_file_size_mb(self, filepath):
        return os.path.getsize(filepath) / (1024 * 1024)

