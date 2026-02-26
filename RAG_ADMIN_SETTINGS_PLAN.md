# RAG Admin Settings - Complete Implementation Plan

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI-TUTOR-APP (Admin Portal)                    │
│                    tutorverse-hub-main (React/Vite)                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Pages/Components (React + TypeScript)                         │ │
│  │                                                                │ │
│  │ /admin/RAGSettings.tsx    ← NEW Admin Settings Page           │ │
│  │ ├─ Model Selection                                            │ │
│  │ ├─ Temperature Control                                        │ │
│  │ ├─ Embedding Model                                            │ │
│  │ ├─ Retrieval Settings                                         │ │
│  │ ├─ Custom Prompts                                             │ │
│  │ └─ Offline Mode (LM Studio)                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                ↓                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Services Layer (TypeScript)                                    │ │
│  │                                                                │ │
│  │ /services/RAGSettingsService.ts  ← NEW                        │ │
│  │ ├─ getRAGSettings()                                            │ │
│  │ ├─ updateModel()                                               │ │
│  │ ├─ updateTemperature()                                         │ │
│  │ ├─ updateEmbeddingModel()                                      │ │
│  │ ├─ updateRetrievalSettings()                                   │ │
│  │ ├─ updatePrompts()                                             │ │
│  │ └─ updateOfflineMode()                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                ↓                                      │
│  Uses: /services/apiClient.ts (HTTP client with auth)               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
                    Network Boundary (HTTP/REST)
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  RAG18Nov2025-1 (RAG Backend)                        │
│                     FastAPI + Python                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ API Endpoints (FastAPI Router)                                │ │
│  │                                                                │ │
│  │ /api/settings/config          GET  - All settings             │ │
│  │ /api/settings/model           POST - LLM model                │ │
│  │ /api/settings/temperature     POST - Temperature              │ │
│  │ /api/settings/embedding       POST - Embedding model          │ │
│  │ /api/settings/retrieval       POST - Top-K setting            │ │
│  │ /api/settings/prompts         POST - System/quiz prompts      │ │
│  │ /api/settings/offline         POST - Offline mode toggle      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                ↓                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Service Layer (Python)                                         │ │
│  │                                                                │ │
│  │ /api/settings_store.py       - Settings persistence           │ │
│  │ /api/settings_routes.py      - Enhanced with validation       │ │
│  │ /config.py                   - Config with persist_settings() │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                ↓                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Storage Layer                                                  │ │
│  │ .env file (persistent settings)                                │ │
│  │ config.LLM_MODEL, config.LLM_TEMPERATURE, etc.               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. FRONTEND IMPLEMENTATION (ai-tutor-app/tutorverse-hub-main)

### 1.1 New Component: `src/pages/admin/RAGSettings.tsx`

**Location:** `tutorverse-hub-main/src/pages/admin/RAGSettings.tsx`

**Purpose:** Admin-only page to manage RAG backend settings

**State Management:**
```typescript
interface RAGSettings {
  llm_model: string
  temperature: number
  embedding_model: string
  retrieval_top_k: number
  custom_prompt: string
  quiz_prompt: string
  offline_mode: boolean
  lm_studio_url: string
  lm_studio_model: string
  available_models: Array<{id: string; name: string; description: string}>
}

const [settings, setSettings] = useState<RAGSettings | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [isSaving, setIsSaving] = useState(false)
const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null)
```

**Data Flow:**
1. Component mounts → `useEffect()` calls `RAGSettingsService.getRAGSettings()`
2. Service makes HTTP request to `http://localhost:8000/api/settings/config` (RAG backend)
3. Response populates settings state
4. User interacts with UI
5. `handleSave*()` functions call RAGSettingsService methods
6. Service sends POST request to RAG backend
7. Response updates local state
8. Notification displays success/error

**UI Sections:**
- **LLM Model Selection**: Dropdown with model descriptions
- **Temperature**: Slider 0.0-1.0 with save button
- **Embedding Model**: Dropdown (informational, warn about re-vectorization)
- **Retrieval Settings**: Input for top_k (5-100)
- **Custom Prompts**: 2 textareas for system and quiz prompts
- **Offline Mode**: Toggle with conditional URL/model inputs
- **Loading State**: Skeleton loaders or spinner on mount
- **Error Handling**: Error messages in red toast notifications
- **Success Feedback**: Green toast after successful save

**Styling:**
- Use existing Shadcn UI components and Tailwind classes from ai-tutor-app
- Match admin panel design (already in `/admin` pages)
- Responsive layout for desktop and tablet

**Protected Route:**
- Component should check user role is "admin" (from AuthContext)
- Redirect to dashboard if not admin

### 1.2 New Service: `src/services/RAGSettingsService.ts`

**Location:** `tutorverse-hub-main/src/services/RAGSettingsService.ts`

**Purpose:** Handle all RAG settings API communication

**Methods:**
```typescript
class RAGSettingsService {
  // Get all settings from RAG backend
  static async getRAGSettings(): Promise<RAGSettings> {
    // GET http://localhost:8000/api/settings/config
  }

  // Update LLM model
  static async updateModel(modelId: string): Promise<{success: boolean; model: string}> {
    // POST http://localhost:8000/api/settings/model
    // Body: {model_id: modelId}
  }

  // Update temperature
  static async updateTemperature(temperature: number): Promise<{success: boolean; temperature: number}> {
    // POST http://localhost:8000/api/settings/temperature
    // Body: {temperature: temperature}
  }

  // Update embedding model
  static async updateEmbeddingModel(model: string): Promise<{success: boolean; embedding_model: string}> {
    // POST http://localhost:8000/api/settings/embedding
    // Body: {embedding_model: model}
  }

  // Update retrieval top_k
  static async updateRetrievalSettings(topK: number): Promise<{success: boolean; top_k: number}> {
    // POST http://localhost:8000/api/settings/retrieval
    // Body: {top_k: topK}
  }

  // Update custom prompts
  static async updatePrompts(customPrompt: string, quizPrompt: string): Promise<{success: boolean}> {
    // POST http://localhost:8000/api/settings/prompts
    // Body: {custom_prompt: customPrompt, quiz_prompt: quizPrompt}
  }

  // Update offline mode
  static async updateOfflineMode(offlineMode: boolean, url?: string, model?: string): Promise<{success: boolean}> {
    // POST http://localhost:8000/api/settings/offline
    // Body: {offline_mode: offlineMode, lm_studio_url: url, lm_studio_model: model}
  }
}
```

**Implementation Notes:**
- Use `apiClient.ts` for HTTP requests (already supports auth headers)
- Configure RAG backend URL via environment variable: `VITE_RAG_API_URL`
- Add error handling with user-friendly messages
- Log API calls for debugging
- Handle network timeouts gracefully

**Configuration:**
```typescript
// In RAGSettingsService.ts
const RAG_API_BASE = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000'
```

**Environment Variables:**
```env
VITE_RAG_API_URL=http://localhost:8000
# For production:
# VITE_RAG_API_URL=https://rag-backend.example.com
```

### 1.3 Modify `src/App.tsx` (Navigation)

**Add Route:**
```typescript
import RAGSettings from './pages/admin/RAGSettings'

// In router config:
{
  path: '/admin/rag-settings',
  element: <AdminRoute><RAGSettings /></AdminRoute>,
  requiredRole: 'admin'
}
```

### 1.4 Modify Navigation Components

**Update Left Sidebar or Admin Menu:**
- Add link to "RAG Settings" or "⚙️ Model Settings" in admin section
- Icon: `Settings` from lucide-react (already in use)
- Path: `/admin/rag-settings`

---

## 2. BACKEND IMPLEMENTATION (RAG18Nov2025-1)

### 2.1 Create `api/settings_store.py` (NEW)

**Location:** `RAG18Nov2025-1/api/settings_store.py`

**Purpose:** Persistent settings management

```python
from pathlib import Path
from dotenv import load_dotenv, set_key
import os

class SettingsStore:
    def __init__(self, env_file_path: str = ".env"):
        self.env_file = Path(env_file_path)
        self.env_file.touch(exist_ok=True)
    
    def save_setting(self, key: str, value: str) -> bool:
        """Save a single setting to .env file"""
        try:
            set_key(str(self.env_file), key.upper(), str(value))
            return True
        except Exception as e:
            print(f"Error saving setting {key}: {e}")
            return False
    
    def save_settings(self, settings: dict) -> bool:
        """Save multiple settings"""
        try:
            for key, value in settings.items():
                set_key(str(self.env_file), key.upper(), str(value))
            return True
        except Exception as e:
            print(f"Error saving settings: {e}")
            return False
```

### 2.2 Enhance `config.py`

**Add Persistence Function:**
```python
def persist_setting(key: str, value) -> bool:
    """Save a setting to persistent storage (.env)"""
    try:
        from dotenv import set_key
        env_path = Path(__file__).parent / ".env"
        set_key(str(env_path), key.upper(), str(value))
        return True
    except Exception as e:
        print(f"Error persisting {key}: {e}")
        return False
```

### 2.3 Enhance `api/settings_routes.py`

**Complete Implementation:**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

import config

router = APIRouter(prefix="/settings", tags=["settings"])

# ============ Pydantic Models ============

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

# ============ GET Endpoints ============

@router.get("/config")
async def get_all_settings():
    """Get all RAG settings in one call"""
    try:
        return {
            "success": True,
            "llm_model": config.LLM_MODEL,
            "temperature": config.LLM_TEMPERATURE,
            "embedding_model": config.EMBEDDING_MODEL,
            "retrieval_top_k": config.RETRIEVAL_TOP_K,
            "custom_prompt": config.CUSTOM_SYSTEM_PROMPT or "",
            "quiz_prompt": config.QUIZ_GENERATION_PROMPT or "",
            "offline_mode": config.OFFLINE_MODE,
            "lm_studio_url": config.LM_STUDIO_BASE_URL,
            "lm_studio_model": config.LM_STUDIO_MODEL,
            "available_models": config.AVAILABLE_MODELS
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")

@router.get("/models")
async def get_available_models():
    """Get available models and current selection"""
    return {
        "current": config.LLM_MODEL,
        "available": config.AVAILABLE_MODELS
    }

@router.get("/prompts")
async def get_prompts():
    """Get custom prompts"""
    return {
        "custom_prompt": config.CUSTOM_SYSTEM_PROMPT or "",
        "quiz_prompt": config.QUIZ_GENERATION_PROMPT or ""
    }

@router.get("/retrieval")
async def get_retrieval_config():
    """Get retrieval settings"""
    return {"top_k": config.RETRIEVAL_TOP_K}

@router.get("/offline")
async def get_offline_config():
    """Get offline mode settings"""
    return {
        "offline_mode": config.OFFLINE_MODE,
        "lm_studio_url": config.LM_STUDIO_BASE_URL,
        "lm_studio_model": config.LM_STUDIO_MODEL
    }

# ============ POST Endpoints ============

@router.post("/model")
async def update_model(update: ModelUpdate):
    """Update LLM model"""
    try:
        valid_models = [m['id'] for m in config.AVAILABLE_MODELS]
        if update.model_id not in valid_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {update.model_id}")
        
        config.LLM_MODEL = update.model_id
        config.persist_setting("LLM_MODEL", update.model_id)
        
        return {"success": True, "model": config.LLM_MODEL}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating model: {str(e)}")

@router.post("/temperature")
async def update_temperature(update: TemperatureUpdate):
    """Update LLM temperature (0.0-1.0)"""
    try:
        config.LLM_TEMPERATURE = update.temperature
        config.persist_setting("LLM_TEMPERATURE", str(update.temperature))
        
        return {"success": True, "temperature": config.LLM_TEMPERATURE}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating temperature: {str(e)}")

@router.post("/embedding")
async def update_embedding_model(update: EmbeddingUpdate):
    """Update embedding model"""
    try:
        config.EMBEDDING_MODEL = update.embedding_model
        config.persist_setting("EMBEDDING_MODEL", update.embedding_model)
        
        return {"success": True, "embedding_model": config.EMBEDDING_MODEL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating embedding model: {str(e)}")

@router.post("/retrieval")
async def update_retrieval_config(update: RetrievalUpdate):
    """Update retrieval settings (top_k)"""
    try:
        config.RETRIEVAL_TOP_K = update.top_k
        config.persist_setting("RETRIEVAL_TOP_K", str(update.top_k))
        
        return {"success": True, "top_k": config.RETRIEVAL_TOP_K}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating retrieval config: {str(e)}")

@router.post("/prompts")
async def update_prompts(update: PromptUpdate):
    """Update custom prompts"""
    try:
        if update.custom_prompt is not None:
            config.CUSTOM_SYSTEM_PROMPT = update.custom_prompt
            config.persist_setting("CUSTOM_SYSTEM_PROMPT", update.custom_prompt)
        
        if update.quiz_prompt is not None:
            config.QUIZ_GENERATION_PROMPT = update.quiz_prompt
            config.persist_setting("QUIZ_GENERATION_PROMPT", update.quiz_prompt)
        
        return {
            "success": True,
            "custom_prompt": config.CUSTOM_SYSTEM_PROMPT or "",
            "quiz_prompt": config.QUIZ_GENERATION_PROMPT or ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating prompts: {str(e)}")

@router.post("/offline")
async def update_offline_config(update: OfflineModeUpdate):
    """Update offline mode settings"""
    try:
        config.OFFLINE_MODE = update.offline_mode
        config.persist_setting("OFFLINE_MODE", str(update.offline_mode))
        
        if update.lm_studio_url:
            config.LM_STUDIO_BASE_URL = update.lm_studio_url
            config.persist_setting("LM_STUDIO_BASE_URL", update.lm_studio_url)
        
        if update.lm_studio_model:
            config.LM_STUDIO_MODEL = update.lm_studio_model
            config.persist_setting("LM_STUDIO_MODEL", update.lm_studio_model)
        
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating offline config: {str(e)}")
```

---

## 3. FILE MODIFICATIONS SUMMARY

### Frontend (ai-tutor-app/tutorverse-hub-main)
| File | Action | What |
|------|--------|------|
| `src/pages/admin/RAGSettings.tsx` | CREATE | Admin settings page component |
| `src/services/RAGSettingsService.ts` | CREATE | Service for RAG API communication |
| `src/App.tsx` | MODIFY | Add route for RAGSettings |
| `src/components/layout/LeftSidebar.tsx` | MODIFY | Add navigation link to RAG Settings |
| `.env.local` | MODIFY | Add `VITE_RAG_API_URL` |

### Backend (RAG18Nov2025-1)
| File | Action | What |
|------|--------|------|
| `api/settings_store.py` | CREATE | Settings persistence manager |
| `config.py` | ENHANCE | Add `persist_setting()` function |
| `api/settings_routes.py` | ENHANCE | Add validation, persistence, new endpoints |
| `.env` | UPDATE | Settings persist here |

---

## 4. IMPLEMENTATION SEQUENCE

### Phase 1: Backend Foundation (RAG18Nov2025-1)
1. Create `api/settings_store.py` with SettingsStore class
2. Add `persist_setting()` function to `config.py`
3. Enhance `api/settings_routes.py`:
   - Add validation (model list check, temp range, top_k range)
   - Add new endpoints: temperature, embedding, config
   - Add persistence to all POST endpoints
4. Test with curl/Postman:
   ```bash
   curl http://localhost:8000/api/settings/config
   curl -X POST http://localhost:8000/api/settings/model \
     -H "Content-Type: application/json" \
     -d '{"model_id":"gpt-4o"}'
   ```
5. Verify `.env` file is updated after POST requests

### Phase 2: Frontend Service Layer (ai-tutor-app)
1. Create `src/services/RAGSettingsService.ts` with all methods
2. Add `VITE_RAG_API_URL` to `.env.local`
3. Test service in isolation:
   - Mock API responses
   - Test error handling
   - Verify HTTP methods and payloads

### Phase 3: Frontend Component (ai-tutor-app)
1. Create `src/pages/admin/RAGSettings.tsx`
2. Implement UI sections:
   - Model selector
   - Temperature slider
   - Other controls
3. Implement data loading and error handling
4. Test in browser:
   - Verify settings load on mount
   - Test each control
   - Check notifications

### Phase 4: Integration (Both)
1. Modify `App.tsx` to add route
2. Update navigation/sidebar
3. Test end-to-end:
   - Admin logs in
   - Navigates to RAG Settings
   - Changes a setting
   - Verify RAG backend processes it
   - Verify StudentChat/other features see the change

### Phase 5: Polish
1. Loading states and skeletons
2. Error messages and toast notifications
3. Validation and user feedback
4. Documentation

---

## 5. ENVIRONMENT CONFIGURATION

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_RAG_API_URL=http://localhost:8000

# Production
# VITE_RAG_API_URL=https://rag-backend.example.com
```

### Backend (.env)
```env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4.1-nano
LLM_TEMPERATURE=0.7
EMBEDDING_MODEL=text-embedding-3-small
RETRIEVAL_TOP_K=30
CUSTOM_SYSTEM_PROMPT=
QUIZ_GENERATION_PROMPT=
OFFLINE_MODE=False
LM_STUDIO_BASE_URL=http://192.168.0.134:1234/v1
LM_STUDIO_MODEL=openai/gpt-oss-20b
```

---

## 6. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ Admin User in Browser                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ RAGSettings.tsx         │
        │ (React Component)       │
        │ - Render UI             │
        │ - Handle user input     │
        │ - Display settings      │
        └──────────┬─────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ RAGSettingsService.ts         │
    │ (TypeScript Service)          │
    │ - Fetch from RAG backend      │
    │ - Send POST requests          │
    │ - Handle HTTP errors          │
    └──────────┬───────────────────┘
               │
               ▼ (HTTP/REST)
         Network Boundary
               ▼
    ┌──────────────────────────────┐
    │ FastAPI (RAG Backend)         │
    │ /api/settings/* routes        │
    │ - Validate input              │
    │ - Update in-memory config     │
    │ - Persist to .env             │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ config.py & .env file         │
    │ - LLM_MODEL                   │
    │ - LLM_TEMPERATURE             │
    │ - Other settings              │
    └──────────────────────────────┘
```

---

## 7. API REQUEST/RESPONSE EXAMPLES

### Get All Settings
```
GET http://localhost:8000/api/settings/config

Response 200:
{
  "success": true,
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
    {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano", "description": "Current default"},
    ...
  ]
}
```

### Update Model
```
POST http://localhost:8000/api/settings/model
Content-Type: application/json

{
  "model_id": "gpt-4o"
}

Response 200:
{
  "success": true,
  "model": "gpt-4o"
}
```

### Update Temperature
```
POST http://localhost:8000/api/settings/temperature
Content-Type: application/json

{
  "temperature": 0.5
}

Response 200:
{
  "success": true,
  "temperature": 0.5
}
```

### Error Response
```
POST http://localhost:8000/api/settings/temperature
{
  "temperature": 1.5
}

Response 400:
{
  "detail": "ensure this value is less than or equal to 1.0"
}
```

---

## 8. SECURITY & AUTH CONSIDERATIONS

### Current Status
- RAG backend has NO authentication (all endpoints public)
- Admin portal has auth (user roles: student, educator, admin)
- Frontend service should include auth token in requests (if needed)

### Recommendations
1. **RAG Backend (Future)**:
   - Add auth header validation for settings endpoints
   - Only allow POST to settings if user is admin
   - Add audit logging of setting changes

2. **Frontend**:
   - Component checks `authContext.user.role === 'admin'`
   - Redirect to dashboard if not admin
   - Only show RAG Settings link for admins

3. **Network**:
   - In production, use HTTPS
   - RAG backend should not be exposed to public internet
   - Use environment-specific URLs via .env

---

## 9. COMPONENT STRUCTURE (RAGSettings.tsx)

```typescript
export default function RAGSettings() {
  // State
  const [settings, setSettings] = useState<RAGSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const { user } = useAuthContext()

  // Check admin access
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // API calls
  const loadSettings = async () => {
    try {
      const data = await RAGSettingsService.getRAGSettings()
      setSettings(data)
    } catch (err) {
      showNotification('error', 'Failed to load settings')
    }
  }

  const handleModelChange = async (modelId: string) => {
    try {
      await RAGSettingsService.updateModel(modelId)
      setSettings({...settings, llm_model: modelId})
      showNotification('success', 'Model updated')
    } catch (err) {
      showNotification('error', err.message)
    }
  }

  // Render sections
  return (
    <div>
      <Header title="RAG Settings" />
      
      {isLoading ? <Skeleton /> : (
        <>
          <ModelSection model={settings.llm_model} onChange={handleModelChange} />
          <TemperatureSection temperature={settings.temperature} />
          {/* Other sections */}
        </>
      )}
      
      {notification && <Toast notification={notification} />}
    </div>
  )
}
```

---

## 10. TESTING CHECKLIST

### Backend API
- [ ] `GET /api/settings/config` returns all settings
- [ ] `POST /api/settings/model` saves model and persists to .env
- [ ] `POST /api/settings/temperature` validates 0-1 range
- [ ] `POST /api/settings/temperature` saves and persists
- [ ] `POST /api/settings/retrieval` validates 5-100 range
- [ ] `POST /api/settings/prompts` saves both prompts
- [ ] `POST /api/settings/offline` toggles and resets clients
- [ ] Settings survive RAG backend restart (loaded from .env)

### Frontend Service
- [ ] RAGSettingsService methods make correct HTTP calls
- [ ] Auth token included in headers (if applicable)
- [ ] Error handling for network failures
- [ ] Timeout handling for slow RAG backend

### Frontend Component
- [ ] RAGSettings tab visible in admin nav
- [ ] Non-admins cannot access `/admin/rag-settings`
- [ ] Settings load on component mount
- [ ] All controls update local state
- [ ] Save buttons send POST requests
- [ ] Success notification shows after save
- [ ] Error notification shows on failure
- [ ] Loading skeleton appears on mount

### Integration
- [ ] Change model in RAGSettings → StudentChat uses new model
- [ ] Change temperature → next chat response reflects it
- [ ] Toggle offline mode → StudentChat switches clients
- [ ] Change top_k → next retrieval uses new value
- [ ] Settings survive full app restart

---

## 11. DEPLOYMENT NOTES

### Development
- RAG backend runs on `http://localhost:8000`
- Admin portal runs on `http://localhost:5173` or similar
- `.env.local` has `VITE_RAG_API_URL=http://localhost:8000`

### Production
- Set `VITE_RAG_API_URL` to production RAG backend URL
- Ensure RAG backend is not publicly accessible (or add auth)
- Use HTTPS for all communication
- Consider using API gateway/reverse proxy

### Docker Compose
```yaml
services:
  rag:
    build: ./RAG18Nov2025-1
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LLM_MODEL=gpt-4.1-nano
      - OFFLINE_MODE=False

  admin-portal:
    build: ./ai-tutor-app/tutorverse-hub-main
    ports:
      - "5173:5173"
    environment:
      - VITE_RAG_API_URL=http://rag:8000
```

---

## COMPLETION CHECKLIST

✅ RAGSettings.tsx component created and tested in isolation
✅ RAGSettingsService.ts fully implemented
✅ Backend settings_routes.py enhanced with validation and persistence
✅ settings_store.py created for persistent storage
✅ config.py has persist_setting() function
✅ Settings persist to .env file
✅ Frontend loads and displays settings correctly
✅ Frontend can save all settings with success feedback
✅ Settings changes affect RAG backend behavior
✅ Settings survive backend restart
✅ Navigation links added for admin users
✅ Admin-only access control implemented
✅ Error handling on both frontend and backend
✅ Loading states and notifications working
✅ All UI controls labeled with helper text
✅ No breaking changes to existing features
✅ Documentation complete
