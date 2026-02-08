# React Frontend Guide

## Overview
Modern, responsive React frontend with ShadCN-inspired dark theme for the RAG Tutoring Chatbot.

## Features
- 📚 Real-time document selection with checkboxes
- 💬 Interactive chat interface
- ⚡ Response time benchmarking
- 🎨 Beautiful dark theme (slate-950 background)
- 🔄 Dynamic document filtering
- 📱 Fully responsive design

## Quick Start

### Terminal 1 - Backend
```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG"
source venv/bin/activate
uvicorn main:app --reload
```

### Terminal 2 - Frontend
```bash
cd "/Users/riteshkanjee/Library/CloudStorage/GoogleDrive-rkanjee@augmentedstartups.com/My Drive/Jobs/TuT/RAG/frontend"
npm run dev
```

### Open Browser
Navigate to: http://localhost:5173

## Architecture

### Tech Stack
- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS v3** - Utility-first styling
- **FastAPI Backend** - http://localhost:8000

### File Structure
```
frontend/
├── src/
│   ├── App.jsx          # Main component (all logic here)
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind base styles
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind v3 config
├── postcss.config.js    # PostCSS config
├── vite.config.js       # Vite config with proxy
└── package.json         # Dependencies
```

## Component Breakdown

### App.jsx Structure

**State Management:**
- `documents` - List of available documents from API
- `selectedDocs` - Array of selected document IDs
- `messages` - Chat history
- `inputMessage` - Current message input
- `isLoading` - Loading state for API calls
- `config` - System configuration (model, DB)

**Key Functions:**
- `loadDocuments()` - Fetch documents from `/api/documents`
- `loadConfig()` - Fetch config from `/health/config`
- `toggleDocument(id)` - Toggle document selection
- `selectAll()` - Select/deselect all documents
- `sendMessage()` - Send chat message to `/student/chat`

**Layout:**
- **Sidebar** (320px width):
  - Document selection UI
  - Select All button
  - Status indicators (model, DB)
- **Main Area**:
  - Header with title
  - Chat messages display
  - Input field with Send button

## API Integration

### Endpoints Used
```javascript
// Get available documents
GET http://localhost:8000/api/documents
Response: [{"id": "doc_id", "name": "Document Name"}, ...]

// Get system configuration
GET http://localhost:8000/health/config
Response: {"llm_model": "gpt-4.1-nano", "vector_db": "ChromaDB (Local)", ...}

// Send chat message
POST http://localhost:8000/student/chat
Body: {
  "question": "Your question",
  "document_ids": ["doc_id_1", "doc_id_2"],
  "chat_history": [...]
}
Response: {
  "answer": "AI response",
  "response_time": 2.63
}
```

## Styling Guide

### Color Palette (Tailwind)
- Background: `bg-slate-950` (very dark blue-gray)
- Cards: `bg-slate-900` (slightly lighter)
- Borders: `border-slate-800`
- Text: `text-slate-50` (primary), `text-slate-400` (muted)
- Accent: `bg-blue-600` (user messages, buttons)
- Success: `bg-green-500` (status indicators)

### Key Classes
- Sidebar: `w-80 border-r border-slate-800 bg-slate-900`
- Chat bubbles (user): `bg-blue-600 text-white rounded-lg p-4`
- Chat bubbles (AI): `bg-slate-800 text-slate-100 rounded-lg p-4`
- Input field: `bg-slate-800 border-slate-700 focus:ring-blue-500`
- Buttons: `bg-slate-800 hover:bg-slate-700` (secondary), `bg-blue-600 hover:bg-blue-700` (primary)

## Customization

### Change Model Display
Edit the status indicator in the sidebar to show different info.

### Add More Features
The component is modular - easy to add:
- Export chat history button
- Clear chat button
- Document upload UI
- Settings panel

### Change Theme Colors
Update Tailwind classes in `App.jsx`:
- Replace `slate-*` with `zinc-*`, `gray-*`, etc.
- Replace `blue-*` with `purple-*`, `green-*`, etc.

## Troubleshooting

### Documents Not Loading
1. Check backend is running: `curl http://localhost:8000/health`
2. Check browser console (F12) for errors
3. Verify CORS is enabled in backend

### Styling Not Applying
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Restart dev server: `npm run dev`
3. Check Tailwind config is correct

### Port Already in Use
Vite will auto-select another port or:
```bash
npm run dev -- --port 3000
```

## Testing

### Manual Testing Checklist
- [ ] Documents load on page load
- [ ] Can select individual documents
- [ ] Can select all/deselect all
- [ ] Selection count updates correctly
- [ ] Warning shows when no documents selected
- [ ] Can type and send messages
- [ ] Messages appear in chat area
- [ ] Loading indicator shows during API call
- [ ] Response time displays with answer
- [ ] Chat history persists during session
- [ ] Status shows correct model and DB

### Browser Testing
Tested and working on:
- Chrome/Edge (Chromium)
- Safari
- Firefox

## Production Build

```bash
cd frontend
npm run build
```

This creates a `dist/` folder with optimized static files.

To preview production build:
```bash
npm run preview
```

## Next Steps (Future Enhancements)

1. **Add Document Upload UI**
   - File upload component
   - Progress indicators
   - Success/error toasts

2. **Add Summary Mode**
   - Toggle between Chat and Summary modes
   - Call `/student/summary` endpoint

3. **Add Export Functionality**
   - Export chat as PDF
   - Export chat as TXT

4. **Add Settings Panel**
   - Change model selection
   - Adjust chunk size
   - Toggle insights mode

5. **Add User Authentication**
   - Login/signup forms
   - Session management
   - Role-based access (educator vs student)

## Support

For issues or questions:
1. Check `START_HERE.md` for setup
2. Review `README.md` for architecture
3. Check browser console for errors
4. Verify backend logs for API issues

## Success! ✅

The React frontend is fully functional and tested with:
- Single document queries
- Multi-document queries
- Response time benchmarking
- Dynamic document selection

Ready for client demo!

