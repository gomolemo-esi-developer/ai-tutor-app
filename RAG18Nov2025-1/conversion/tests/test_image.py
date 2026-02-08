import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.convert_image import ImageConverter

def test_image_conversion():
    sample_files = [
        "../../0_data/contenttypes/Java-Cheat-Sheet-For-Programmers-Infographic.jpg"
    ]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    print("=" * 60)
    print("Testing Image OCR")
    print("=" * 60)
    print("\nNote: This test uses Qwen2.5-VL-2B-Instruct (lighter model)")
    print("Use Qwen2.5-VL-7B-Instruct for better quality\n")
    
    converter = ImageConverter(
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
    test_image_conversion()

