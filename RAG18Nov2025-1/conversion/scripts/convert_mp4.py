import sys
import os
import subprocess
import tempfile
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler
from utils.model_loader import ModelLoader

class MP4Transcriber:
    def __init__(self, output_dir, models_dir, engine="parakeet"):
        self.file_handler = FileHandler(output_dir)
        self.model_loader = ModelLoader.get_instance(models_dir)
        self.engine = engine
        
    def extract_audio(self, video_path, output_audio_path, duration_minutes=None):
        progress = ProgressTracker("Extracting audio", "frames")
        pbar = progress.create_bar(100, unit="%")
        
        if duration_minutes:
            print(f"🎬 Extracting first {duration_minutes} minute(s) of audio from video...")
            pbar.set_description(f"Extracting first {duration_minutes}min of audio")
        else:
            print("🎬 Extracting full audio from video...")
            pbar.set_description("Extracting audio from video")
        
        try:
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
            ]
            
            if duration_minutes:
                duration_seconds = duration_minutes * 60
                cmd.extend(['-t', str(duration_seconds)])
            
            cmd.extend([
                '-vn',
                '-acodec', 'libmp3lame',
                '-q:a', '2',
                '-y',
                str(output_audio_path)
            ])
            
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg failed: {result.stderr}")
            
            pbar.update(100)
            pbar.close()
            print("✅ Audio extraction complete!")
            
            return output_audio_path
            
        except FileNotFoundError:
            raise RuntimeError("ffmpeg not found. Install with: brew install ffmpeg")
        except Exception as e:
            raise RuntimeError(f"Audio extraction failed: {str(e)}")
    
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
    
    def transcribe(self, video_path, fallback=True, duration_minutes=None):
        video_path = self.file_handler.validate_input_file(
            video_path, 
            allowed_extensions=['.mp4', '.avi', '.mov', '.mkv', '.webm']
        )
        
        print(f"\n{'='*60}")
        print(f"📹 VIDEO TRANSCRIPTION")
        print(f"{'='*60}")
        print(f"File: {video_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(video_path):.2f} MB")
        print(f"Engine: {self.engine}")
        if duration_minutes:
            print(f"Duration limit: First {duration_minutes} minute(s) only")
        print(f"{'='*60}\n")
        
        temp_audio = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
                temp_audio = tmp.name
            
            self.extract_audio(video_path, temp_audio, duration_minutes)
            print()
            
            print("🎯 Starting transcription...\n")
            try:
                if self.engine == "parakeet":
                    text = self.transcribe_with_parakeet(temp_audio)
                elif self.engine == "whisper":
                    text = self.transcribe_with_whisper(temp_audio)
                else:
                    raise ValueError(f"Unknown engine: {self.engine}")
                    
            except Exception as e:
                if fallback and self.engine == "parakeet":
                    print(f"\n⚠️  Parakeet failed: {str(e)}")
                    print("🔄 Falling back to Whisper...\n")
                    text = self.transcribe_with_whisper(temp_audio)
                else:
                    raise
            
            output_path = self.file_handler.get_output_path(
                video_path,
                suffix="_transcript",
                extension=".txt"
            )
            
            self.file_handler.save_text(text, output_path)
            
            print(f"\n{'='*60}")
            print(f"✅ TRANSCRIPTION COMPLETE")
            print(f"{'='*60}")
            print(f"Output: {output_path}")
            print(f"{'='*60}\n")
            return str(output_path)
            
        finally:
            if temp_audio and os.path.exists(temp_audio):
                os.remove(temp_audio)
                print("🗑️  Temporary audio file cleaned up")

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_mp4.py <video_file> [engine] [duration_minutes]")
        print("  engine: 'parakeet' (default) or 'whisper'")
        print("  duration_minutes: optional, process only first N minutes (e.g., 2, 10)")
        print("\nExamples:")
        print("  python convert_mp4.py video.mp4 whisper 2    # First 2 minutes")
        print("  python convert_mp4.py video.mp4 whisper      # Full video")
        sys.exit(1)
    
    video_file = sys.argv[1]
    engine = sys.argv[2] if len(sys.argv) > 2 else "parakeet"
    duration_minutes = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    transcriber = MP4Transcriber(
        output_dir=output_dir,
        models_dir=models_dir,
        engine=engine
    )
    
    try:
        transcriber.transcribe(video_file, fallback=True, duration_minutes=duration_minutes)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

