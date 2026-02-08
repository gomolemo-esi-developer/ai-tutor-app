import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler

class CodeConverter:
    def __init__(self, output_dir):
        self.file_handler = FileHandler(output_dir)
        
    def read_code_file(self, file_path):
        encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                return content, encoding
            except (UnicodeDecodeError, UnicodeError):
                continue
        
        raise RuntimeError(f"Unable to decode file with any of the attempted encodings: {encodings}")
    
    def convert(self, code_path):
        code_extensions = [
            '.cs', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
            '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.rb',
            '.php', '.swift', '.kt', '.scala', '.r', '.m', '.mm'
        ]
        
        code_path = self.file_handler.validate_input_file(
            code_path, 
            allowed_extensions=code_extensions
        )
        
        print(f"\nExtracting code: {code_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(code_path):.2f} MB")
        print(f"Type: {code_path.suffix}\n")
        
        progress = ProgressTracker("Reading file", "bytes")
        pbar = progress.create_bar(100, unit="%")
        
        pbar.set_description("Reading code file")
        pbar.update(30)
        
        content, encoding = self.read_code_file(code_path)
        pbar.update(50)
        
        metadata = f"File: {code_path.name}\n"
        metadata += f"Type: {code_path.suffix}\n"
        metadata += f"Encoding: {encoding}\n"
        metadata += f"Lines: {len(content.splitlines())}\n"
        metadata += "=" * 50 + "\n\n"
        
        full_content = metadata + content
        
        pbar.update(20)
        
        output_path = self.file_handler.get_output_path(
            code_path,
            suffix="_code",
            extension=".txt"
        )
        
        self.file_handler.save_text(full_content, output_path)
        
        pbar.close()
        
        print(f"\n✅ Code extracted to: {output_path}")
        return str(output_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_code.py <code_file>")
        print("  Supported: .cs, .py, .java, .cpp, .js, .ts, and many more")
        sys.exit(1)
    
    code_file = sys.argv[1]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    
    converter = CodeConverter(output_dir=output_dir)
    
    try:
        converter.convert(code_file)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

