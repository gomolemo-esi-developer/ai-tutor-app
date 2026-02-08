import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler
from utils.model_loader import ModelLoader

class MP3Transcriber:
    def __init__(self, output_dir, models_dir, engine="parakeet"):
        self.file_handler = FileHandler(output_dir)
        self.model_loader = ModelLoader.get_instance(models_dir)
        self.engine = engine
        
    def transcribe_with_parakeet(self, audio_path):
        try:
            from parakeet_mlx import ParakeetModel
            progress = ProgressTracker("Transcribing with Parakeet v3", "seconds")
            pbar = progress.create_file_bar(audio_path)
            
            pbar.set_description("Loading Parakeet model")
            pbar.update(10)
            
            model = ParakeetModel.from_pretrained()
            pbar.update(30)
            
            pbar.set_description("Transcribing audio")
            result = model.transcribe(str(audio_path))
            pbar.update(50)
            
            if isinstance(result, dict) and 'text' in result:
                text = result['text']
            elif isinstance(result, str):
                text = result
            else:
                text = str(result)
            
            pbar.update(10)
            pbar.close()
            
            return text
            
        except Exception as e:
            raise RuntimeError(f"Parakeet transcription failed: {str(e)}")
    
    def transcribe_with_whisper(self, audio_path, model_size="medium"):
        try:
            progress = ProgressTracker(f"Transcribing with Whisper {model_size}", "segments")
            pbar = progress.create_file_bar(audio_path)
            
            pbar.set_description("Loading Whisper model")
            pbar.update(10)
            
            model = self.model_loader.load_faster_whisper(model_size=model_size)
            pbar.update(20)
            
            pbar.set_description("Transcribing audio")
            segments, info = model.transcribe(str(audio_path), beam_size=5)
            pbar.update(20)
            
            transcription_parts = []
            total_duration = info.duration
            
            for segment in segments:
                transcription_parts.append(segment.text)
                progress_pct = (segment.end / total_duration) * 50
                pbar.n = min(50 + progress_pct, 100)
                pbar.refresh()
            
            pbar.n = 100
            pbar.close()
            
            return " ".join(transcription_parts)
            
        except Exception as e:
            raise RuntimeError(f"Whisper transcription failed: {str(e)}")
    
    def transcribe(self, audio_path, fallback=True):
        audio_path = self.file_handler.validate_input_file(
            audio_path, 
            allowed_extensions=['.mp3', '.wav', '.m4a', '.flac', '.ogg']
        )
        
        print(f"\nTranscribing: {audio_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(audio_path):.2f} MB")
        print(f"Engine: {self.engine}\n")
        
        try:
            if self.engine == "parakeet":
                text = self.transcribe_with_parakeet(audio_path)
            elif self.engine == "whisper":
                text = self.transcribe_with_whisper(audio_path)
            else:
                raise ValueError(f"Unknown engine: {self.engine}")
                
        except Exception as e:
            if fallback and self.engine == "parakeet":
                print(f"\n⚠️  Parakeet failed: {str(e)}")
                print("Falling back to Whisper...\n")
                text = self.transcribe_with_whisper(audio_path)
            else:
                raise
        
        output_path = self.file_handler.get_output_path(
            audio_path,
            suffix="_transcript",
            extension=".txt"
        )
        
        self.file_handler.save_text(text, output_path)
        
        print(f"\n✅ Transcription saved to: {output_path}")
        return str(output_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_mp3.py <audio_file> [engine]")
        print("  engine: 'parakeet' (default) or 'whisper'")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    engine = sys.argv[2] if len(sys.argv) > 2 else "parakeet"
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    transcriber = MP3Transcriber(
        output_dir=output_dir,
        models_dir=models_dir,
        engine=engine
    )
    
    try:
        transcriber.transcribe(audio_file, fallback=True)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

