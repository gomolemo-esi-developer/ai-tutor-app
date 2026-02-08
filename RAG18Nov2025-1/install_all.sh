#!/bin/bash

# Quick installation script for Mac/Linux users
# This script installs all dependencies and system requirements

echo ""
echo "======================================"
echo "RAG Tutoring Chatbot - Full Setup"
echo "======================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    OS="unknown"
fi

echo "Detected OS: $OS"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.8+ first."
    exit 1
fi

echo "[1/3] Updating pip..."
python3 -m pip install --upgrade pip
if [ $? -ne 0 ]; then
    echo "ERROR: pip update failed"
    exit 1
fi

echo ""
echo "[2/3] Installing Python dependencies..."
pip3 install -r requirements_full.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Python dependencies installation failed"
    exit 1
fi

echo ""
echo "[3/3] Installing FFmpeg..."

if [ "$OS" = "mac" ]; then
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    echo "Installing FFmpeg via Homebrew..."
    brew install ffmpeg
elif [ "$OS" = "linux" ]; then
    if [ -f /etc/debian_version ]; then
        echo "Installing FFmpeg via apt..."
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif [ -f /etc/redhat-release ]; then
        echo "Installing FFmpeg via yum..."
        sudo yum install -y ffmpeg
    else
        echo "Could not detect package manager. Please install FFmpeg manually:"
        echo "  Visit: https://ffmpeg.org/download.html"
    fi
else
    echo "Unknown OS. Please install FFmpeg manually:"
    echo "  Visit: https://ffmpeg.org/download.html"
fi

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Verify installation:"
echo "  python3 -c \"from faster_whisper import WhisperModel; print('✓ faster-whisper OK')\""
echo "  ffmpeg -version"
echo ""
echo "Start the server:"
echo "  uvicorn main:app --reload"
echo ""
echo "Then visit: http://localhost:8000/docs"
echo ""
