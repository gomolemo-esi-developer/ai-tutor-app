# Admin Settings Page Implementation Plan

## Overview
Add a dedicated admin settings page to manage LLM models, temperature, offline mode, retrieval settings, and custom prompts. The implementation will be integrated into the existing React + Vite + Tailwind frontend and FastAPI backend architecture.

---

## 1. FRONTEND IMPLEMENTATION

### 1.1 New Component: `AdminSettings.jsx`

**Location:** `frontend/src/components/AdminSettings.jsx`

**Responsibilities:**
- Display all configurable settings in organized sections
- Fetch current settings from backend on mount
- Handle user interactions and state updates
- Provide success/error feedback to users
- Persist changes via API calls

**State Variables:**
```javascript
const [currentModel, setCurrentModel] = useState('')
const [availableModels, setAvailableModels] = useState([])
const [temperature, setTemperature] = useState(0.7)
const [retrievalTopK, setRetrievalTopK] = useState(30)
const [customPrompt, setCustomPrompt] = useState('')
const [quizPrompt, setQuizPrompt] = useState('')
const [offlineMode, setOfflineMode] = useState(false)
const [lmStudioUrl, setLmStudioUrl] = useState('')
const [lmStudioModel, setLmStudioModel] = useState('')
const [embeddingModel, setEmbeddingModel] = useState('')
const [isLoading, setIsLoading] = useState(true)
const [isSaving, setIsSaving] = useState(false)
const [notification, setNotification] = useState(null)
```

**Data Load Functions (on mount):**
- `loadModels()` - GET `/api/settings/models` - fetch available models and current selection
- `loadPrompts()` - GET `/api/settings/prompts` - fetch custom system and quiz prompts
- `loadRetrievalConfig()` - GET `/api/settings/retrieval` - fetch top_k setting
- `loadOfflineConfig()` - GET `/api/settings/offline` - fetch offline mode settings
- `loadTemperature()` - GET `/api/settings/temperature` (needs backend implementation)
- `loadEmbeddingModel()` - GET `/api/settings/embedding` (needs backend implementation)

**Save Functions (on user action):**
- `handleModelChange(modelId)` - POST `/api/settings/model` with `{model_id: modelId}`
- `handleTemperatureChange(value)` - POST `/api/settings/temperature` with `{temperature: value}`
- `handleRetrievalChange()` - POST `/api/settings/retrieval` with `{top_k: retrievalTopK}`
- `handlePromptsChange()` - POST `/api/settings/prompts` with custom and quiz prompts
- `handleOfflineModeChange()` - POST `/api/settings/offline` with offline config
- `handleEmbeddingModelChange()` - POST `/api/settings/embedding` with `{embedding_model: value}`

**Notification System:**
- Display temporary toast notifications (2-3 seconds) for save success/failure
- Follow existing component patterns (StudentChat uses `alert()`)
- Show loading spinner during API calls

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Admin Settings                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🤖 LLM Model Selection                                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Current: gpt-4.1-nano                                │   │
│ │ <select> dropdown with all available models           │   │
│ │ <p> Description of selected model                     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 🎛️ Temperature (Creativity)                                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Slider: 0.0 ----●──── 1.0                            │   │
│ │ Current Value: 0.7                                    │   │
│ │ <p> Explanation text                                  │   │
│ │ [Save Temperature] button                             │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 📥 Embedding Model                                          │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Current: text-embedding-3-small                       │   │
│ │ <select> dropdown (if multiple available)             │   │
│ │ <p> Used for document vectorization                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 🔍 Retrieval Settings                                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Top-K Documents: <input type="number"> (5-50)         │   │
│ │ <p> How many chunks to retrieve (higher = more context) │   │
│ │ Current: 30                                           │   │
│ │ [Save Retrieval Settings] button                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 📝 Custom System Prompt                                     │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ <textarea> for custom system instructions             │   │
│ │ <p> Will be prepended to all chat requests            │   │
│ │ [Save Prompts] button (shared with quiz prompt)       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 🎯 Quiz Generation Prompt                                   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ <textarea> for quiz generation instructions           │   │
│ │ <p> Custom rules for generating quiz questions        │   │
│ │ [Save Prompts] button (shared with system prompt)     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 🔌 Offline Mode (LM Studio)                                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☐ Enable Offline Mode (toggle switch)                │   │
│ │ [Shows only when toggled ON]:                         │   │
│ │   LM Studio URL: <input>                              │   │
│ │   LM Studio Model: <input>                            │   │
│ │   <p> Uses local LM Studio instead of OpenAI API      │   │
│ │ [Save Offline Settings] button                        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Styling (Tailwind Classes):**
- Container: `bg-slate-950 text-slate-50 h-full flex flex-col`
- Header: `bg-slate-900 border-b border-slate-800 p-6`
- Main content: `flex-1 overflow-y-auto p-6`
- Sections: `bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4`
- Labels: `text-sm font-semibold text-slate-300 mb-2 block`
- Inputs/Selects: `w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100`
- Buttons: `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50`
- Toggle Switch: `relative inline-flex h-6 w-11 items-center rounded-full` (already in StudentChat)
- Helper text: `text-xs text-slate-500 mt-1`

**Error Handling:**
- Wrap all API calls in try-catch
- Log errors to console
- Show user-friendly error messages in notifications
- Disable buttons during save operations
- Revert state on failed saves

### 1.2 Modify `App.jsx`

**Change:** Add "⚙️ Admin Settings" tab to navigation

```javascript
<button
  onClick={() => setActiveTab('admin')}
  className={`px-6 py-4 font-medium transition-colors border-b-2 ${
    activeTab === 'admin'
      ? 'text-blue-400 border-blue-400'
      : 'text-slate-400 border-transparent hover:text-slate-300'
  }`}
>
  ⚙️ Admin Settings
</button>
```

**Change:** Add conditional render for AdminSettings component

```javascript
{activeTab === 'admin' && <AdminSettings />}
```

### 1.3 Modify `StudentChat.jsx` (Optional)

**Note:** The StudentChat component already has a modal settings dialog for basic settings. Two options:

**Option A (Recommended):** Leave StudentChat settings as-is (for quick toggles) and make AdminSettings the comprehensive dashboard

**Option B:** Remove settings modal from StudentChat and route to AdminSettings tab

Current plan uses **Option A** to minimize refactoring.

---

## 2. BACKEND IMPLEMENTATION

### 2.1 Enhance `api/settings_routes.py`

**Current Status:** Endpoints exist but only update in-memory config. Need to add:

**New/Enhanced Endpoints:**

1. **GET `/api/settings/config`** (NEW)
   - Return all current settings in one call
   - Reduces frontend API calls on page load
   ```python
   @router.get("/config")
   async def get_all_settings():
       return {
           "llm_model": config.LLM_MODEL,
           "temperature": config.LLM_TEMPERATURE,
           "embedding_model": config.EMBEDDING_MODEL,
           "retrieval_top_k": config.RETRIEVAL_TOP_K,
           "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
           "quiz_prompt": config.QUIZ_GENERATION_PROMPT,
           "offline_mode": config.OFFLINE_MODE,
           "lm_studio_url": config.LM_STUDIO_BASE_URL,
           "lm_studio_model": config.LM_STUDIO_MODEL,
           "available_models": config.AVAILABLE_MODELS
       }
   ```

2. **POST `/api/settings/temperature`** (NEW)
   - Set LLM temperature (0.0 to 1.0)
   - Validate range
   - Persist to storage
   ```python
   class TemperatureUpdate(BaseModel):
       temperature: float  # 0.0 to 1.0
   
   @router.post("/temperature")
   async def update_temperature(update: TemperatureUpdate):
       if not (0.0 <= update.temperature <= 1.0):
           raise HTTPException(status_code=400, detail="Temperature must be between 0.0 and 1.0")
       config.LLM_TEMPERATURE = update.temperature
       save_config_to_persistent_storage(config)
       return {"success": True, "temperature": config.LLM_TEMPERATURE}
   ```

3. **POST `/api/settings/embedding`** (NEW)
   - Set embedding model
   - Validate against known models
   ```python
   class EmbeddingUpdate(BaseModel):
       embedding_model: str
   
   @router.post("/embedding")
   async def update_embedding_model(update: EmbeddingUpdate):
       config.EMBEDDING_MODEL = update.embedding_model
       save_config_to_persistent_storage(config)
       return {"success": True, "embedding_model": config.EMBEDDING_MODEL}
   ```

4. **Enhance Existing POST Endpoints:**
   - Add `save_config_to_persistent_storage()` call to each save endpoint
   - Validate inputs before updating
   - Return consistent response format
   - Add try-catch with proper error messages

**Validation Helpers:**
```python
def validate_model(model_id: str) -> bool:
    valid_ids = [m['id'] for m in config.AVAILABLE_MODELS]
    return model_id in valid_ids

def validate_temperature(value: float) -> bool:
    return 0.0 <= value <= 1.0

def validate_retrieval_top_k(value: int) -> bool:
    return 5 <= value <= 100
```

### 2.2 Create `api/settings_store.py` (NEW)

**Purpose:** Handle persistent storage of settings

**Implementation:**
```python
from pathlib import Path
from dotenv import load_dotenv, set_key
import json
import os

class SettingsStore:
    def __init__(self, env_file_path: str = ".env"):
        self.env_file = Path(env_file_path)
        self.env_file.touch(exist_ok=True)
    
    def save_settings(self, settings: dict) -> bool:
        """
        Save settings to .env file.
        
        Args:
            settings: Dict with keys matching config.py variables
        
        Returns:
            True if successful, False otherwise
        """
        try:
            for key, value in settings.items():
                # Convert to environment variable format
                env_key = key.upper()
                set_key(str(self.env_file), env_key, str(value))
            return True
        except Exception as e:
            print(f"Error saving settings: {e}")
            return False
    
    def load_settings(self) -> dict:
        """Load settings from .env file"""
        load_dotenv(self.env_file)
        return {
            "LLM_MODEL": os.getenv("LLM_MODEL"),
            "LLM_TEMPERATURE": float(os.getenv("LLM_TEMPERATURE", 0.7)),
            "EMBEDDING_MODEL": os.getenv("EMBEDDING_MODEL"),
            "RETRIEVAL_TOP_K": int(os.getenv("RETRIEVAL_TOP_K", 30)),
            # ... other settings
        }
```

**Alternative:** Store in Chroma DB metadata table (if preferred, but .env is simpler)

### 2.3 Modify `config.py`

**Change 1:** Initialize from persistent storage

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Load from environment (which comes from .env file)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# These can now be modified by admin and persist
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4.1-nano")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "30"))
# ... etc
```

**Change 2:** Add helper function for persistence

```python
def persist_settings(key: str, value: str) -> bool:
    """Save a single setting to persistent storage"""
    try:
        from dotenv import set_key
        env_path = Path(__file__).parent / ".env"
        set_key(str(env_path), key.upper(), str(value))
        return True
    except Exception as e:
        print(f"Error persisting setting {key}: {e}")
        return False
```

### 2.4 Update `api/settings_routes.py` - Complete Implementation

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

import config
from api.settings_store import SettingsStore

router = APIRouter(prefix="/settings", tags=["settings"])
store = SettingsStore(Path(__file__).parent.parent / ".env")

# Pydantic models
class ModelUpdate(BaseModel):
    model_id: str

class TemperatureUpdate(BaseModel):
    temperature: float = Field(ge=0.0, le=1.0)

class EmbeddingUpdate(BaseModel):
    embedding_model: str

class RetrievalUpdate(BaseModel):
    top_k: int = Field(ge=5, le=100)

class PromptUpdate(BaseModel):
    custom_prompt: Optional[str] = None
    quiz_prompt: Optional[str] = None

class OfflineModeUpdate(BaseModel):
    offline_mode: bool
    lm_studio_url: Optional[str] = None
    lm_studio_model: Optional[str] = None

# GET Endpoints
@router.get("/config")
async def get_all_settings():
    """Get all current settings"""
    return {
        "llm_model": config.LLM_MODEL,
        "temperature": config.LLM_TEMPERATURE,
        "embedding_model": config.EMBEDDING_MODEL,
        "retrieval_top_k": config.RETRIEVAL_TOP_K,
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT,
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL,
        "available_models": config.AVAILABLE_MODELS
    }

@router.get("/models")
async def get_available_models():
    return {
        "current": config.LLM_MODEL,
        "available": config.AVAILABLE_MODELS
    }

@router.get("/prompts")
async def get_prompts():
    return {
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }

@router.get("/retrieval")
async def get_retrieval_config():
    return {"top_k": config.RETRIEVAL_TOP_K}

@router.get("/offline")
async def get_offline_config():
    return {
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }

# POST Endpoints
@router.post("/model")
async def update_model(update: ModelUpdate):
    """Update LLM model"""
    valid_models = [m['id'] for m in config.AVAILABLE_MODELS]
    if update.model_id not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model: {update.model_id}")
    
    config.LLM_MODEL = update.model_id
    config.persist_settings("LLM_MODEL", update.model_id)
    
    return {"success": True, "model": config.LLM_MODEL}

@router.post("/temperature")
async def update_temperature(update: TemperatureUpdate):
    """Update LLM temperature"""
    config.LLM_TEMPERATURE = update.temperature
    config.persist_settings("LLM_TEMPERATURE", str(update.temperature))
    
    return {"success": True, "temperature": config.LLM_TEMPERATURE}

@router.post("/embedding")
async def update_embedding_model(update: EmbeddingUpdate):
    """Update embedding model"""
    config.EMBEDDING_MODEL = update.embedding_model
    config.persist_settings("EMBEDDING_MODEL", update.embedding_model)
    
    return {"success": True, "embedding_model": config.EMBEDDING_MODEL}

@router.post("/retrieval")
async def update_retrieval_config(update: RetrievalUpdate):
    """Update retrieval top-k"""
    config.RETRIEVAL_TOP_K = update.top_k
    config.persist_settings("RETRIEVAL_TOP_K", str(update.top_k))
    
    return {"success": True, "top_k": config.RETRIEVAL_TOP_K}

@router.post("/prompts")
async def update_prompts(update: PromptUpdate):
    """Update custom prompts"""
    if update.custom_prompt is not None:
        config.CUSTOM_SYSTEM_PROMPT = update.custom_prompt
        config.persist_settings("CUSTOM_SYSTEM_PROMPT", update.custom_prompt)
    
    if update.quiz_prompt is not None:
        config.QUIZ_GENERATION_PROMPT = update.quiz_prompt
        config.persist_settings("QUIZ_GENERATION_PROMPT", update.quiz_prompt)
    
    return {
        "success": True,
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT,
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT
    }

@router.post("/offline")
async def update_offline_config(update: OfflineModeUpdate):
    """Update offline mode settings"""
    config.OFFLINE_MODE = update.offline_mode
    config.persist_settings("OFFLINE_MODE", str(update.offline_mode))
    
    if update.lm_studio_url:
        config.LM_STUDIO_BASE_URL = update.lm_studio_url
        config.persist_settings("LM_STUDIO_BASE_URL", update.lm_studio_url)
    
    if update.lm_studio_model:
        config.LM_STUDIO_MODEL = update.lm_studio_model
        config.persist_settings("LM_STUDIO_MODEL", update.lm_studio_model)
    
    # Reset clients when offline mode changes
    import modules.shared.openai_client as client_module
    client_module._online_client = None
    client_module._offline_client = None
    
    return {
        "success": True,
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }
```

---

## 3. INTEGRATION POINTS

### Settings Affect System:
1. **Model Change**
   - Applies to next chat request
   - StudentChat component reloads config on change
   - No impact on in-flight requests

2. **Temperature Change**
   - Applies to next chat request
   - Affects randomness/creativity of responses

3. **Offline Mode Toggle**
   - Switches client from OpenAI to LM Studio
   - Resets client connections (see settings_routes.py)
   - Requires LM Studio to be running

4. **Retrieval Settings**
   - Affects next search query
   - Changes how many chunks are retrieved
   - May affect response quality and latency

5. **Embedding Model Change**
   - Note: Changing this requires re-vectorizing all documents
   - Warning message should be displayed to user
   - Not recommended during active use

---

## 4. FILE MODIFICATIONS SUMMARY

### Frontend (React/Vite)
| File | Action | Details |
|------|--------|---------|
| `frontend/src/components/AdminSettings.jsx` | CREATE | New admin settings component |
| `frontend/src/App.jsx` | MODIFY | Add "⚙️ Admin Settings" tab |
| `frontend/src/components/StudentChat.jsx` | NO CHANGE | Keep existing settings modal (optional quick access) |
| `frontend/src/index.css` | NO CHANGE | Reuse existing Tailwind styles |

### Backend (FastAPI)
| File | Action | Details |
|------|--------|---------|
| `api/settings_routes.py` | ENHANCE | Add persistence, validation, new endpoints |
| `api/settings_store.py` | CREATE | Persistent settings manager |
| `config.py` | ENHANCE | Add `persist_settings()` function |
| `.env` | UPDATE | Settings stored here after changes |

---

## 5. IMPLEMENTATION STEPS (SEQUENTIAL)

### Phase 1: Backend Foundation
1. Create `api/settings_store.py` with SettingsStore class
2. Enhance `config.py` with `persist_settings()` helper
3. Enhance `api/settings_routes.py` with validation and persistence
4. Test all endpoints with Postman/curl

### Phase 2: Frontend
1. Create `frontend/src/components/AdminSettings.jsx`
2. Implement all API call functions
3. Implement notification/feedback system
4. Style with Tailwind (match existing patterns)
5. Test component in isolation

### Phase 3: Integration
1. Modify `frontend/src/App.jsx` to add tab and route
2. Test tab navigation
3. Test end-to-end: change setting → verify persistence → restart → verify reload
4. Test StudentChat still works with settings changes

### Phase 4: Polish
1. Error handling review
2. Loading states
3. Toast notifications
4. UX improvements
5. Documentation

---

## 6. TESTING CHECKLIST

### Backend API Tests
- [ ] GET `/api/settings/config` returns all settings
- [ ] POST `/api/settings/model` with valid model ID saves and persists
- [ ] POST `/api/settings/model` with invalid model ID returns 400
- [ ] POST `/api/settings/temperature` with valid float (0-1) saves
- [ ] POST `/api/settings/temperature` with invalid range returns 400
- [ ] POST `/api/settings/retrieval` with valid top_k saves
- [ ] POST `/api/settings/retrieval` with invalid range returns 400
- [ ] POST `/api/settings/prompts` saves both prompts
- [ ] POST `/api/settings/offline` toggles offline mode and resets clients
- [ ] Settings persist to `.env` file
- [ ] Settings reload on backend restart

### Frontend Component Tests
- [ ] AdminSettings tab renders
- [ ] Initial load fetches and displays all settings
- [ ] Model dropdown changes and persists
- [ ] Temperature slider works (0.0 to 1.0)
- [ ] Prompts save correctly
- [ ] Retrieval top-k saves
- [ ] Offline mode toggle and conditional inputs work
- [ ] Error messages display on API failure
- [ ] Loading spinner shows during save
- [ ] Success notification shows after save

### Integration Tests
- [ ] Change model in AdminSettings → verify StudentChat sees change
- [ ] Change temperature → verify next chat response uses new temperature
- [ ] Toggle offline mode → verify StudentChat switches clients
- [ ] Change retrieval top-k → verify next search uses new value
- [ ] Settings survive app restart

---

## 7. NOTES & CONSIDERATIONS

### Security
- Currently no authentication (all endpoints publicly accessible)
- Admin settings should probably require auth token in production
- Recommendation: Add optional auth middleware for future

### Performance
- Settings loaded once on component mount
- No real-time sync across tabs/sessions
- Acceptable for small number of concurrent admin users

### Edge Cases
- Changing embedding model: notify user that re-vectorization may be needed
- Offline mode without LM Studio running: show clear error message
- Temperature extremes (0.0 or 1.0): may cause LLM issues, document this

### Future Enhancements
- Settings audit log (track who changed what, when)
- Scheduled model warm-up on offline mode enable
- Settings versioning/rollback
- Per-document embedding model override
- A/B testing different model configurations

---

## 8. STYLING REFERENCE

**Color Palette (from existing code):**
- Background: `bg-slate-950` (#030712)
- Surface: `bg-slate-900` (#0f172a)
- Surface Light: `bg-slate-800` (#1e293b)
- Border: `border-slate-800` (#1e293b)
- Text: `text-slate-50` (#f8fafc)
- Text Secondary: `text-slate-400` (#94a3b8)
- Primary: `bg-blue-600`, `text-blue-400`, `focus:ring-blue-500`
- Success: `bg-green-600`
- Error: `bg-red-600`

**Typography:**
- Headings: `text-xl font-bold`, `text-lg font-semibold`
- Labels: `text-sm font-semibold text-slate-300`
- Helper text: `text-xs text-slate-500`
- Body: `text-sm text-slate-100`

**Components:**
- Card: `bg-slate-900 border border-slate-800 rounded-lg p-6`
- Input: `px-4 py-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500`
- Button: `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors`
- Slider/Input: Use native HTML with Tailwind styling

---

## 9. EXAMPLE API RESPONSE FLOWS

### Get All Settings
```
GET /api/settings/config

Response:
{
  "llm_model": "gpt-4.1-nano",
  "temperature": 0.7,
  "embedding_model": "text-embedding-3-small",
  "retrieval_top_k": 30,
  "custom_prompt": "",
  "quiz_prompt": "",
  "offline_mode": false,
  "lm_studio_url": "http://192.168.0.134:1234/v1",
  "lm_studio_model": "openai/gpt-oss-20b",
  "available_models": [
    {"id": "gpt-5", "name": "GPT-5", "description": "Latest, best quality"},
    ...
  ]
}
```

### Update Model (Success)
```
POST /api/settings/model
Body: {"model_id": "gpt-4o"}

Response:
{
  "success": true,
  "model": "gpt-4o"
}
```

### Update Model (Error)
```
POST /api/settings/model
Body: {"model_id": "invalid-model"}

Response 400:
{
  "detail": "Invalid model: invalid-model"
}
```

---

## 10. EXAMPLE UI FLOW

1. User clicks "⚙️ Admin Settings" tab
2. AdminSettings component mounts
3. useEffect triggers: `loadModels()`, `loadPrompts()`, `loadTemperatureConfig()`, etc.
4. isLoading = true, displays spinner
5. All 6 API calls complete, state updates with values
6. isLoading = false, UI renders with current settings
7. User changes model dropdown
8. handleModelChange() fires → POST /api/settings/model
9. isSaving = true, button disabled
10. Success response → notification shows "Model updated!"
11. isSaving = false, button enabled again
12. StudentChat component reloads config and uses new model

---

## COMPLETION CRITERIA

✅ AdminSettings component created with all controls
✅ All API endpoints enhanced with validation and persistence  
✅ Settings persist to .env file
✅ Frontend successfully loads and displays all settings
✅ Frontend can update all settings with success feedback
✅ Settings survive app restart
✅ StudentChat uses new settings on next request
✅ Styling matches existing design (Tailwind, color scheme)
✅ Error handling for API failures
✅ Loading states during API calls
✅ All controls properly labeled with helper text
✅ No breaking changes to existing features
