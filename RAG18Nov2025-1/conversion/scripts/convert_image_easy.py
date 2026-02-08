import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler

class ImageConverterEasy:
    def __init__(self, output_dir):
        self.file_handler = FileHandler(output_dir)
        self.reader = None
        
    def extract_text_with_easyocr(self, image_path):
        try:
            import easyocr
            
            if self.reader is None:
                print("🔧 Loading EasyOCR model (this may take a moment on first run)...")
                self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                print("✅ EasyOCR model loaded\n")
            
            print("🔍 Running OCR on image...")
            result = self.reader.readtext(str(image_path), detail=0, paragraph=False)
            
            if not result:
                return "No text detected in image"
            
            return "\n".join(result)
            
        except Exception as e:
            raise RuntimeError(f"EasyOCR extraction failed: {str(e)}")
    
    def convert(self, image_path):
        image_extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', 
            '.tiff', '.tif', '.webp'
        ]
        
        image_path = self.file_handler.validate_input_file(
            image_path, 
            allowed_extensions=image_extensions
        )
        
        print(f"\n{'='*60}")
        print(f"🖼️  IMAGE OCR CONVERSION (EasyOCR)")
        print(f"{'='*60}")
        print(f"File: {image_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(image_path):.2f} MB")
        print(f"{'='*60}\n")
        
        progress = ProgressTracker("Processing image", "step")
        pbar = progress.create_bar(100, unit="%")
        
        pbar.set_description("Loading image")
        pbar.update(10)
        
        pbar.set_description("Running EasyOCR")
        extracted_text = self.extract_text_with_easyocr(image_path)
        pbar.update(80)
        
        pbar.set_description("Saving results")
        output_path = self.file_handler.get_output_path(
            image_path,
            suffix="_ocr",
            extension=".txt"
        )
        
        self.file_handler.save_text(extracted_text, output_path)
        
        pbar.update(10)
        pbar.close()
        
        print(f"\n{'='*60}")
        print(f"✅ IMAGE OCR COMPLETE")
        print(f"{'='*60}")
        print(f"Output: {output_path}")
        print(f"Text lines extracted: {len(extracted_text.splitlines())}")
        print(f"{'='*60}\n")
        
        return str(output_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_image_easy.py <image_file>")
        print("\nThis uses EasyOCR for text extraction from images")
        sys.exit(1)
    
    image_file = sys.argv[1]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    
    converter = ImageConverterEasy(output_dir=output_dir)
    
    try:
        converter.convert(image_file)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

