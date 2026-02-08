# Quick Start Guide

## Installation Steps

### 1. Install System Dependencies

```bash
brew install ffmpeg poppler
```

### 2. Install Python Dependencies

From the `6_conversion` directory:

```bash
pip install -r requirements.txt
```

**Note**: First time installation may take a while as it downloads ML libraries.

## Testing Individual Converters

### Quick Test: Code File (Fastest)

```bash
cd tests
python test_code.py
```

This will extract text from the CameraController.cs file. No model download required!

### Test: PowerPoint Extraction

```bash
cd tests
python test_pptx.py
```

Extracts text from slides. No heavy models required.

### Test: Audio Transcription (Parakeet v3)

```bash
cd tests
python test_mp3.py
```

**First run**: Downloads Parakeet v3 model (~600MB)
**Runtime**: Depends on audio length

### Test: Video Transcription

```bash
cd tests
python test_mp4.py
```

Extracts audio and transcribes it. Uses same models as MP3.

### Test: PDF OCR

```bash
cd tests
python test_pdf.py
```

**First run**: Downloads Qwen2.5-VL-2B model (~4GB)
**Warning**: This is the most resource-intensive test

### Test: Image OCR

```bash
cd tests
python test_image.py
```

Uses same Qwen2.5-VL model as PDF test.

## Running Converters Manually

All converters can be run directly:

```bash
cd scripts

python convert_code.py "../../0_data/contenttypes/CameraController.cs"

python convert_pptx.py "../../0_data/contenttypes/CHAPTER 1 - WHAT IS INTERACTION DESIGN.pptx"

python convert_mp3.py "../../0_data/contenttypes/Audio Science Fundamentals - Sound Waves.mp3" parakeet

python convert_mp4.py "../../0_data/contenttypes/IPN117V Class-20230303_170730-Meeting Recording.mp4" whisper

python convert_pdf.py "../../0_data/contenttypes/Computed-Tomography.pdf"

python convert_image.py "../../0_data/contenttypes/Java-Cheat-Sheet-For-Programmers-Infographic.jpg"
```

## Output Location

All converted files are saved to: `6_conversion/output/`

## Choosing Transcription Engine

### Parakeet v3 (Recommended for Mac)
- Optimized for Apple Silicon
- Fast and accurate
- 25 language support

```bash
python scripts/convert_mp3.py <file> parakeet
```

### Faster-Whisper (Fallback)
- More widely compatible
- Very accurate
- Automatic fallback if Parakeet fails

```bash
python scripts/convert_mp3.py <file> whisper
```

## Choosing OCR Model

### Qwen2.5-VL-7B (Best Quality)
```bash
python scripts/convert_pdf.py <file> "Qwen/Qwen2.5-VL-7B-Instruct"
```

### Qwen2.5-VL-2B (Faster, Lighter)
```bash
python scripts/convert_pdf.py <file> "Qwen/Qwen2.5-VL-2B-Instruct"
```

## Troubleshooting

### Models not downloading?

Ensure you have internet connection on first run. Models are cached for offline use after initial download.

### Out of memory?

Use lighter models:
- For OCR: Use 2B instead of 7B model
- For transcription: Use Whisper `medium` size

### ffmpeg error?

```bash
brew install ffmpeg
```

### PDF conversion error?

```bash
brew install poppler
```

## Recommended Testing Order

1. **test_code.py** - Fastest, no model download
2. **test_pptx.py** - Fast, no model download  
3. **test_mp3.py** - Downloads transcription model
4. **test_image.py** - Downloads OCR model (large)
5. **test_pdf.py** - Uses OCR model from step 4
6. **test_mp4.py** - Uses transcription model from step 3

## Next Steps

After testing, you can:

1. Process your own files using the scripts
2. Integrate converters into your RAG pipeline
3. Batch process multiple files
4. Use converted text files directly with existing RAG system

All text files in `output/` are ready to be:
- Chunked with your existing text chunker
- Embedded and stored in ChromaDB
- Used for semantic search and Q&A

