# File Conversion System

A modular, offline file conversion system that converts various content types (audio, video, PDFs, PowerPoint, code, images) to text format using cutting-edge local AI models.

## Features

- **Offline Processing**: All models run locally after initial download
- **Multiple Transcription Engines**: Support for both Parakeet v3 and Faster-Whisper
- **Advanced OCR**: Uses Qwen2.5-VL for high-quality text extraction
- **Progress Tracking**: Real-time progress bars with time estimates
- **Modular Design**: Each content type has its own isolated script
- **Mac Optimized**: Leverages Apple Silicon acceleration

## Directory Structure

```
6_conversion/
├── scripts/          # Conversion scripts
│   ├── convert_mp3.py
│   ├── convert_mp4.py
│   ├── convert_pdf.py
│   ├── convert_pptx.py
│   ├── convert_code.py
│   └── convert_image.py
├── utils/            # Shared utilities
│   ├── progress_tracker.py
│   ├── model_loader.py
│   └── file_handler.py
├── models/           # Downloaded models cache
├── output/           # Converted text files
└── tests/            # Test scripts
```

## Installation

### System Dependencies

```bash
brew install ffmpeg poppler
```

### Python Dependencies

```bash
pip install -r requirements.txt
```

### Required Packages

- `parakeet-mlx` - Parakeet v3 transcription (Apple Silicon optimized)
- `faster-whisper` - Fast Whisper transcription
- `transformers` - For Qwen VL models
- `torch` - Deep learning framework
- `pdf2image` - PDF to image conversion
- `python-pptx` - PowerPoint text extraction
- `pillow` - Image processing
- `tqdm` - Progress bars
- `qwen-vl-utils` - Qwen VL utilities

## Usage

### MP3/Audio Transcription

```bash
python scripts/convert_mp3.py <audio_file> [engine]
```

**Engines**: `parakeet` (default) or `whisper`

**Example**:
```bash
python scripts/convert_mp3.py "../0_data/contenttypes/Audio Science Fundamentals - Sound Waves.mp3" parakeet
```

### MP4/Video Transcription

```bash
python scripts/convert_mp4.py <video_file> [engine]
```

**Example**:
```bash
python scripts/convert_mp4.py "../0_data/contenttypes/IPN117V Class-20230303_170730-Meeting Recording.mp4" whisper
```

### PDF to Text (OCR)

```bash
python scripts/convert_pdf.py <pdf_file> [model_name]
```

**Models**: 
- `Qwen/Qwen2.5-VL-7B-Instruct` (default, best quality)
- `Qwen/Qwen2.5-VL-2B-Instruct` (lighter, faster)

**Example**:
```bash
python scripts/convert_pdf.py "../0_data/contenttypes/Computed-Tomography.pdf"
```

### PowerPoint to Text

```bash
python scripts/convert_pptx.py <pptx_file>
```

**Example**:
```bash
python scripts/convert_pptx.py "../0_data/contenttypes/CHAPTER 1 - WHAT IS INTERACTION DESIGN.pptx"
```

### Code File Extraction

```bash
python scripts/convert_code.py <code_file>
```

Supports: `.cs`, `.py`, `.java`, `.cpp`, `.js`, `.ts`, and many more

**Example**:
```bash
python scripts/convert_code.py "../0_data/contenttypes/CameraController.cs"
```

### Image OCR

```bash
python scripts/convert_image.py <image_file> [model_name]
```

**Example**:
```bash
python scripts/convert_image.py "../0_data/contenttypes/Java-Cheat-Sheet-For-Programmers-Infographic.jpg"
```

## Testing

Individual test scripts are provided for each converter:

```bash
cd tests

python test_mp3.py
python test_mp4.py
python test_pdf.py
python test_pptx.py
python test_code.py
python test_image.py
```

## Model Downloads

### First Run

On first run, models will be automatically downloaded:

- **Parakeet v3**: Downloads via `parakeet-mlx`
- **Faster-Whisper**: Downloads from HuggingFace (~1.5-3GB)
- **Qwen2.5-VL**: Downloads from HuggingFace (~4-14GB depending on model)

Models are cached in the `models/` directory for offline use.

### Recommended Models for 48GB RAM MacBook

- **Transcription**: Parakeet v3 (best) or Whisper `large-v3`
- **OCR**: Qwen2.5-VL-7B-Instruct for best quality

## Output Format

All converters output to `.txt` files in the `output/` directory with descriptive suffixes:

- MP3/MP4: `{filename}_transcript.txt`
- PDF: `{filename}_extracted.txt`
- PPTX: `{filename}_slides.txt`
- Code: `{filename}_code.txt`
- Image: `{filename}_ocr.txt`

## Error Handling

- **Automatic Fallback**: MP3/MP4 scripts fall back to Whisper if Parakeet fails
- **Graceful Failures**: Clear error messages with troubleshooting hints
- **File Validation**: Checks file existence and format before processing

## Performance Notes

- **Parakeet v3**: Fastest transcription on Apple Silicon (25 languages)
- **Whisper large-v3**: Best accuracy but slower
- **Qwen2.5-VL-7B**: Best OCR quality, requires more RAM
- **Qwen2.5-VL-2B**: Faster OCR, lower RAM usage, good quality

## Troubleshooting

### ffmpeg not found
```bash
brew install ffmpeg
```

### poppler not found (for PDF conversion)
```bash
brew install poppler
```

### Out of memory
Use lighter models:
- Whisper: Use `medium` instead of `large-v3`
- Qwen: Use `Qwen2.5-VL-2B-Instruct` instead of 7B

### Parakeet not working
The system will automatically fall back to Whisper, or you can explicitly use:
```bash
python scripts/convert_mp3.py <file> whisper
```

## Integration with RAG System

These converters are designed to preprocess files before uploading to the RAG system. Once text is extracted, it can be:

1. Chunked using existing text chunker
2. Embedded and stored in ChromaDB/Pinecone
3. Used for semantic search and retrieval

## Future Enhancements

- Batch processing support
- Automatic content type detection
- Direct RAG pipeline integration
- GPU acceleration support
- Additional language support

