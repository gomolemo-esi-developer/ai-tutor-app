import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.convert_pdf import PDFConverter

def test_pdf_conversion():
    sample_files = [
        "../../0_data/contenttypes/Computed-Tomography.pdf",
        "../../0_data/contenttypes/Java Programming 6th Edition.pdf"
    ]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    print("=" * 60)
    print("Testing PDF OCR Conversion")
    print("=" * 60)
    print("\nNote: This test uses Qwen2.5-VL-2B-Instruct (lighter model)")
    print("Use Qwen2.5-VL-7B-Instruct for better quality\n")
    
    converter = PDFConverter(
        output_dir=output_dir,
        models_dir=models_dir,
        model_name="Qwen/Qwen2.5-VL-2B-Instruct"
    )
    
    for sample_file in sample_files:
        file_path = Path(__file__).parent / sample_file
        
        if not file_path.exists():
            print(f"⚠️  Sample file not found: {file_path}")
            continue
        
        try:
            output_path = converter.convert(str(file_path))
            print(f"\nSuccess! Output: {output_path}\n")
            print("=" * 60 + "\n")
        except Exception as e:
            print(f"\n❌ Failed: {str(e)}\n")
            print("=" * 60 + "\n")

if __name__ == "__main__":
    test_pdf_conversion()

