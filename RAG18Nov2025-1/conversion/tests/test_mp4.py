import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.convert_mp4 import MP4Transcriber

def test_mp4_conversion():
    sample_files = [
        "../../0_data/contenttypes/IPN117V Class-20230303_170730-Meeting Recording.mp4"
    ]
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    print("=" * 60)
    print("Testing MP4 Video Transcription")
    print("=" * 60)
    
    for engine in ["parakeet", "whisper"]:
        print(f"\n{'=' * 60}")
        print(f"Testing with engine: {engine}")
        print(f"{'=' * 60}\n")
        
        transcriber = MP4Transcriber(
            output_dir=output_dir,
            models_dir=models_dir,
            engine=engine
        )
        
        for sample_file in sample_files:
            file_path = Path(__file__).parent / sample_file
            
            if not file_path.exists():
                print(f"⚠️  Sample file not found: {file_path}")
                continue
            
            try:
                output_path = transcriber.transcribe(str(file_path), fallback=True)
                print(f"\nSuccess! Output: {output_path}\n")
            except Exception as e:
                print(f"\n❌ Failed with {engine}: {str(e)}\n")
        
        if engine == "parakeet":
            break

if __name__ == "__main__":
    test_mp4_conversion()

