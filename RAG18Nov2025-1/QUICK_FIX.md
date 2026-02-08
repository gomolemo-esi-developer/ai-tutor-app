# Quick Fix - 5 Minute Setup

## Your Problem
You got these errors uploading audio/video:
- `faster-whisper not installed`
- `[WinError 2] The system cannot find the file specified` (FFmpeg missing)

## Solution

### Step 1: Install Python Packages (2 minutes)

**Copy and paste this command:**

```bash
pip install -r requirements_full.txt
```

Done. All Python dependencies installed.

### Step 2: Install FFmpeg (1-3 minutes)

**Windows - Choose ONE option:**

**Option A (Easiest - Chocolatey):**
```bash
choco install ffmpeg
```
If you don't have Chocolatey, get it first:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
```

**Option B (Winget):**
```bash
winget install ffmpeg
```

**Option C (Manual):**
1. Download: https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your Windows PATH
4. Restart terminal

---

**Mac:**
```bash
brew install ffmpeg
```

---

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Linux (Fedora/RHEL):**
```bash
sudo yum install ffmpeg
```

### Step 3: Restart Server (1 minute)

1. Stop current server: Press `Ctrl+C`
2. Start fresh:
```bash
uvicorn main:app --reload
```

### Step 4: Test It (1 minute)

Try uploading an audio or video file through the API.

---

## That's It!

Total time: **5-10 minutes**

Your audio/video uploads should now work. ✅

## Verify Installation

```bash
# Should print version info
ffmpeg -version

# Should print "✓ OK"
python -c "from faster_whisper import WhisperModel; print('✓ faster-whisper OK')"

# Should print "✓ OK"
python -c "import easyocr; print('✓ easyocr OK')"
```

## Still Having Issues?

See **INSTALL_DEPENDENCIES.md** for detailed troubleshooting.

---

## What's Being Installed

| Component | What It Does | File Types |
|-----------|-------------|-----------|
| `faster-whisper` | Converts audio to text | .mp3, .wav, .m4a, .flac, .ogg |
| `ffmpeg` | Extracts audio from video | .mp4, .avi, .mov, .mkv, .webm |
| `easyocr` | Extracts text from images/PDFs | Images, PDFs |
| `pillow` | Image processing | .jpg, .png, .gif, etc. |
| `python-pptx` | PowerPoint support | .pptx, .ppt |

---

## Performance Notes

**First time you upload audio/video:**
- Model downloads (~1.4 GB): 2-10 minutes
- Processing: 30 seconds to 2 minutes
- Then cached locally for future use

**Subsequent uploads:**
- Processing: 30 seconds to 1 minute
- No re-downloading

**Optimization tips:**
- Upload one file at a time
- Don't restart server between uploads
- Close unnecessary apps to free RAM
