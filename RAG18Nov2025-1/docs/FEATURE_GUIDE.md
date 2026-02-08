# RAG Chatbot - Feature Guide

## New Features Added

### 1. 📤 Document Upload

**How to Use:**
1. Click the blue **"+"** button in the sidebar
2. Select a file (PDF, DOCX, or TXT)
3. Wait for the upload to complete
4. The document list refreshes automatically

**Details:**
- Supported formats: `.pdf`, `.docx`, `.txt`
- Files are automatically vectorized and added to ChromaDB
- Upload shows loading state ("..." on button)
- Document becomes available for selection immediately

### 2. 🗑️ Document Delete

**How to Use:**
1. Find the document you want to remove
2. Click the red **"✕"** button next to it
3. Confirm the deletion in the dialog
4. Document is removed from ChromaDB and UI

**Details:**
- Confirmation dialog prevents accidental deletion
- If document was selected, it's automatically unselected
- Deletion removes all vectors from ChromaDB
- Document list updates automatically

### 3. ⚙️ Settings Modal - AI Model Selection

**How to Use:**
1. Click the **⚙️** (gear icon) at the bottom of the sidebar
2. Browse available AI models
3. Click on any model to switch to it
4. Modal closes automatically
5. Current model displays at bottom of sidebar

**Available Models:**
- **GPT-5** - Latest, best quality
- **GPT-5 Mini** - Fast, cheaper
- **GPT-5 Nano** - Fastest, cheapest
- **GPT-4.1 Nano** - Current default
- **GPT-4.1 Mini** - Fast & cheap
- **GPT-4o** - Optimized GPT-4
- **GPT-4o Mini** - Very cheap
- **GPT-4** - Best GPT-4
- **GPT-4 Turbo** - Faster GPT-4

**Details:**
- Current model is highlighted in blue
- Model selection updates instantly
- No page reload required
- Settings are persistent during session

## API Endpoints (Backend)

### Document Upload
```
POST /educator/upload
Content-Type: multipart/form-data
Body: file (PDF/DOCX/TXT)
```

### Document Delete
```
DELETE /educator/delete/{document_id}
```

### List Documents
```
GET /api/documents
Response: [{"id": "doc_id", "name": "Document Name"}, ...]
```

### Get Available Models
```
GET /api/settings/models
Response: {
  "current": "gpt-4.1-nano",
  "available": [...]
}
```

### Update Model
```
POST /api/settings/model
Body: {"model_id": "gpt-5"}
Response: {"success": true, "model": "gpt-5"}
```

## UI/UX Design Principles

### Minimal Code
- Each feature uses minimal code
- Easy to debug and modify
- No unnecessary complexity

### Hidden Settings
- Settings icon (⚙️) is subtle but accessible
- Modal appears only when needed
- Clean, uncluttered interface

### Instant Feedback
- Upload shows loading state
- Delete requires confirmation
- Model changes update immediately
- All operations show visual feedback

### Consistent Design
- ShadCN-inspired dark theme
- Blue for primary actions (upload, selected model)
- Red for destructive actions (delete)
- Gray for neutral actions (select all)

## File Structure

```
frontend/src/App.jsx - All UI logic
├── Upload handler (handleFileUpload)
├── Delete handler (handleDeleteDocument)
├── Model selection (handleModelChange)
├── Settings modal state (showSettings)
└── File input ref (fileInputRef)

backend/
├── config.py - AVAILABLE_MODELS list
├── 2_api/settings_routes.py - Settings endpoints
└── main.py - Router registration
```

## Testing Checklist

- [x] Upload PDF file
- [x] Upload DOCX file
- [x] Upload TXT file
- [x] Delete document (with confirmation)
- [x] Open settings modal
- [x] Select different model
- [x] Verify model display updates
- [x] Close settings modal
- [x] Upload during active chat
- [x] Delete document that's selected

## Troubleshooting

### Upload Not Working
1. Check file format (PDF, DOCX, TXT only)
2. Verify backend is running
3. Check browser console for errors
4. Ensure file size is reasonable

### Delete Not Working
1. Confirm deletion in dialog
2. Check backend is running
3. Verify document ID is valid

### Model Selection Not Working
1. Check backend `/api/settings/models` endpoint
2. Verify model ID is in AVAILABLE_MODELS
3. Check browser console for errors

### Settings Modal Won't Open
1. Click the ⚙️ icon at bottom of sidebar
2. Check console for JavaScript errors
3. Refresh page and try again

## Best Practices

### For Educators
1. Upload documents before students join
2. Test RAG responses after upload
3. Delete outdated materials regularly
4. Use descriptive file names

### For Students
1. Select relevant documents before asking
2. Try different document combinations
3. Check which model is active
4. Use faster models for quick queries

### For Developers
1. Keep code modular and minimal
2. Test upload with various file sizes
3. Verify deletion removes all vectors
4. Test model switching during active chat

## Future Enhancements

Potential additions (not yet implemented):
- Bulk document upload
- Document preview before upload
- Model performance metrics
- Export chat history
- Document categorization/tags
- Advanced model settings (temperature, etc.)

## Support

- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Config: `config.py`
- Main code: `frontend/src/App.jsx`

