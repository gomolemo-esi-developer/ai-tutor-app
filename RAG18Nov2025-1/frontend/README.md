# RAG Tutoring Chatbot - React Frontend

Modern, responsive React frontend for the RAG Tutoring Chatbot with ShadCN-inspired dark theme.

## Features

- 🎨 Clean, modern UI with dark theme
- 📱 Fully responsive design
- ⚡ Real-time document selection with checkboxes
- 💬 Interactive chat interface with typing indicators
- 🔍 Dynamic RAG document filtering
- ⏱️ Response time benchmarking
- 🎯 Select All / Deselect All functionality

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build
```

## Architecture

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **ShadCN-inspired** - Beautiful component design system

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000`:
- `/api/documents` - Get available documents
- `/health/config` - Get system configuration
- `/student/chat` - Send chat messages

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles with Tailwind
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind configuration
└── vite.config.js       # Vite configuration
```

## Development

Make sure the FastAPI backend is running on port 8000 before starting the frontend:

```bash
# Terminal 1: Start backend
cd ..
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.
