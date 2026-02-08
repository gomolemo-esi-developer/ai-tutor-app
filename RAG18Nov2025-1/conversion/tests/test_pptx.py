import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.convert_pptx import PPTXConverter

def test_pptx_conversion():
    sample_files = [
        "../../0_data/contenttypes/CHAPTER 1 - WHAT IS INTERACTION DESIGN.pptx"
    ]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    
    print("=" * 60)
    print("Testing PPTX Text Extraction")
    print("=" * 60 + "\n")
    
    converter = PPTXConverter(output_dir=output_dir)
    
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
    test_pptx_conversion()

