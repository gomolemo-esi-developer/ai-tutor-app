import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from modules.content_processing.file_converter import FileConverter
import config

def test_converter():
    print("\n" + "="*60)
    print("TESTING FILE CONVERTER INTEGRATION")
    print("="*60)
    
    converter = FileConverter(
        models_dir=config.CONVERSION_MODELS_DIR,
        output_dir=config.CONVERSION_OUTPUT_DIR
    )
    
    print("\n1. Testing converter initialization...")
    print(f"   Models dir: {converter.models_dir}")
    print(f"   Output dir: {converter.output_dir}")
    print("   ✓ Converter initialized")
    
    print("\n2. Testing file type detection...")
    test_files = {
        "document.pdf": "pdf",
        "audio.mp3": "audio",
        "video.mp4": "video",
        "presentation.pptx": "pptx",
        "code.py": "code",
        "image.jpg": "image",
        "text.txt": "text"
    }
    
    for filename, expected_type in test_files.items():
        detected = converter.get_file_type(Path(filename))
        status = "✓" if detected == expected_type else "✗"
        print(f"   {status} {filename}: {detected}")
    
    print("\n3. Testing supported extensions...")
    extensions = converter.get_supported_extensions()
    for category, exts in extensions.items():
        print(f"   {category}: {len(exts)} types")
    
    print("\n4. Testing is_supported method...")
    test_supported = [
        ("file.pdf", True),
        ("file.mp3", True),
        ("file.mp4", True),
        ("file.pptx", True),
        ("file.py", True),
        ("file.jpg", True),
        ("file.xyz", False)
    ]
    
    for filename, should_be_supported in test_supported:
        is_supported = converter.is_supported(filename)
        status = "✓" if is_supported == should_be_supported else "✗"
        print(f"   {status} {filename}: {is_supported}")
    
    print("\n5. Testing actual file conversion (code file)...")
    content_types_dir = Path(__file__).parent.parent / "0_data" / "contenttypes"
    cs_file = content_types_dir / "CameraController.cs"
    
    if cs_file.exists():
        try:
            print(f"   Converting: {cs_file.name}")
            text = converter.convert_to_text(str(cs_file))
            if text:
                print(f"   ✓ Extracted {len(text)} characters")
                print(f"   Preview: {text[:200]}...")
            else:
                print("   ✗ Conversion returned None")
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
    else:
        print(f"   ⚠ Test file not found: {cs_file}")
    
    print("\n" + "="*60)
    print("INTEGRATION TEST COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        test_converter()
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

