#!/bin/bash

echo "=================================="
echo "RAG Tutoring Chatbot Setup"
echo "=================================="
echo ""

echo "Step 1: Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "Step 2: Checking .env file..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "📝 Please edit .env and add your API key:"
    echo "   - OPENAI_API_KEY (only one needed!)"
    echo ""
    echo "✅ ChromaDB runs locally - no cloud account needed!"
else
    echo "✅ .env file exists"
fi

echo ""
echo "Step 3: Creating data directories..."
mkdir -p 0_data/input
mkdir -p 0_data/processed
echo "✅ Data directories created"

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys"
echo "2. Run: uvicorn main:app --reload"
echo "3. Visit: http://localhost:8000/docs"
echo ""
echo "To run tests:"
echo "  python 3_tests/3.1_test_document_upload.py"
echo "  python 3_tests/3.2_test_vectorization.py"
echo "  python 3_tests/3.3_test_metadata_filter.py  # CRITICAL TEST"
echo ""

