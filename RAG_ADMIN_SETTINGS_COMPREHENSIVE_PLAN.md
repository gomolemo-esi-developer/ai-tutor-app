# RAG Admin Settings - Comprehensive Implementation Plan

**Single Source of Truth for RAG Settings Management Integration**

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Frontend Implementation](#2-frontend-implementation)
3. [Backend Middleware Implementation](#3-backend-middleware-implementation)
4. [RAG Service Implementation](#4-rag-service-implementation)
5. [File Modifications Summary](#5-file-modifications-summary)
6. [Implementation Sequence](#6-implementation-sequence)
7. [Environment Configuration](#7-environment-configuration)
8. [API Specifications](#8-api-specifications)
9. [Data Flow Examples](#9-data-flow-examples)
10. [Testing Checklist](#10-testing-checklist)
11. [Deployment & Docker](#11-deployment--docker)
12. [Troubleshooting](#12-troubleshooting)
13. [Completion Criteria](#13-completion-criteria)

---

## 1. System Architecture

### Plug-and-Play Design
The implementation follows your existing architecture where all components communicate via HTTP REST with configurable URLs and enable/disable flags.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ADMIN PORTAL (ai-tutor-app)                       │
│                   tutorverse-hub-main (React/Vite/TS)               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Pages/Components                                               │ │
│  │ src/pages/admin/RAGSettings.tsx  ← NEW                         │ │
│  │  ├─ Model Selection                                            │ │
│  │  ├─ Temperature Control                                        │ │
│  │  ├─ Embedding Model                                            │ │
│  │  ├─ Retrieval Settings                                         │ │
│  │  ├─ Custom Prompts                                             │ │
│  │  └─ Offline Mode (LM Studio)                                   │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐ │
│  │ Services (TypeScript)                                         │ │
│  │ src/services/RAGSettingsService.ts  ← NEW                     │ │
│  │  └─ Calls: POST/GET http://localhost:3000/api/rag/settings/* │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│                       │ HTTP (VITE_API_URL)                         │
│                       │                                             │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
        ┌───────────────▼──────────────┐
        │   BACKEND MIDDLEWARE         │
        │ (ai-tutor-app/backend)       │
        │ Express/Node.js/TypeScript   │
        │ Port: 3000                   │
        │                              │
        │ ┌──────────────────────────┐ │
        │ │ RAG Settings Routes       │ │
        │ │ src/routes/rag-settings.ts│─┼─ NEW
        │ │                          │ │
        │ │ GET  /api/rag/settings/config        │
        │ │ POST /api/rag/settings/model         │
        │ │ POST /api/rag/settings/temperature   │
        │ │ POST /api/rag/settings/embedding     │
        │ │ POST /api/rag/settings/retrieval     │
        │ │ POST /api/rag/settings/prompts       │
        │ │ POST /api/rag/settings/offline       │
        │ │                          │ │
        │ │ Features:                │ │
        │ │ ├─ RAG_ENABLE check      │ │
        │ │ ├─ RAG_SERVICE_URL proxy │ │
        │ │ ├─ Error handling        │ │
        │ │ └─ Retry logic           │ │
        │ └──────────┬───────────────┘ │
        │            │                  │
        │            │ HTTP (RAG_SERVICE_URL: http://rag-service:8000)
        │            │                  │
        └────────────┼──────────────────┘
                     │
        ┌────────────▼──────────────────┐
        │   RAG SERVICE                 │
        │ (RAG18Nov2025-1)              │
        │ FastAPI/Python                │
        │ Port: 8000                    │
        │                               │
        │ ┌─────────────────────────── │
        │ │ Settings API Endpoints     │ │
        │ │ /api/settings/config   ← GET
        │ │ /api/settings/model    ← POST
        │ │ /api/settings/temperature
        │ │ /api/settings/embedding
        │ │ /api/settings/retrieval
        │ │ /api/settings/prompts
        │ │ /api/settings/offline
        │ │                        │ │
        │ │ src/api/settings_routes.py
        │ │ src/api/settings_store.py  ├─ ENHANCED
        │ │ src/config.py              │ │
        │ └────────────────────────────┘ │
        │            │                    │
        │            ▼                    │
        │    ┌────────────────┐           │
        │    │ .env file      │           │
        │    │ Persistent     │           │
        │    │ Settings       │           │
        │    └────────────────┘           │
        │                                 │
        └─────────────────────────────────┘
```

### Key Architecture Principles (Plug-and-Play)
1. **RAG Service Optional**: Backend checks `RAG_ENABLE` flag
2. **Configurable URL**: Uses `RAG_SERVICE_URL` environment variable
3. **Service Discovery**: Works with docker-compose service names
4. **Graceful Degradation**: Admin gets error message if RAG unavailable
5. **No Code Changes**: All configuration via environment variables

---

## 2. Frontend Implementation

### 2.1 New Component: `tutorverse-hub-main/src/pages/admin/RAGSettings.tsx`

**Location:** `ai-tutor-app/tutorverse-hub-main/src/pages/admin/RAGSettings.tsx`

**Purpose:** Dedicated admin page for managing RAG system settings

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
const [isSaving, setIsSaving] = useState<string | null>(null) // which setting is saving
const [notification, setNotification] = useState<Notification | null>(null)
const { user } = useAuthContext()
```

**Lifecycle:**
1. Component mounts
2. useEffect checks user.role === 'admin', redirects if not
3. useEffect calls RAGSettingsService.getRAGSettings()
4. isLoading = true, displays skeleton loaders
5. Settings loaded, state updates, isLoading = false
6. User interacts with controls
7. handleSave* methods call RAGSettingsService
8. isSaving = 'modelId', button disabled
9. Response received, state updates
10. Success notification displayed (2-3 seconds)
11. isSaving = null, button re-enabled

**UI Sections:**

**Section 1: LLM Model Selection**
```
┌─ 🤖 LLM Model Selection ────────────────────┐
│                                             │
│  Current: gpt-4.1-nano                      │
│  ┌─────────────────────────────────────┐   │
│  │ ▼ Select Model                      │   │
│  │ • GPT-5                             │   │
│  │ • GPT-5 Mini                        │   │
│  │ • gpt-4.1-nano (current)            │   │
│  │ • gpt-4o                            │   │
│  │ • ...                               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Description: Current default model         │
│  Cost: ~$0.0001/1K tokens                  │
│                                             │
└─────────────────────────────────────────────┘
```

**Section 2: Temperature (Creativity)**
```
┌─ 🎛️ Temperature (Creativity) ──────────────┐
│                                             │
│  Current: 0.7                               │
│  ├─ 0.0 ━━━━━●━━━━━━━━ 1.0                 │
│                                             │
│  Lower (0.0) = Predictable, focused         │
│  Higher (1.0) = Creative, random            │
│                                             │
│  [Save Temperature] ← Save button            │
└─────────────────────────────────────────────┘
```

**Section 3: Embedding Model (Info Only)**
```
┌─ 📥 Embedding Model ───────────────────────┐
│                                             │
│  Current: text-embedding-3-small            │
│                                             │
│  ⚠️ Warning: Changing this requires         │
│  re-vectorizing all uploaded documents.     │
│  Only change if you understand the impact.  │
│                                             │
│  [More Info] button (optional)              │
└─────────────────────────────────────────────┘
```

**Section 4: Retrieval Settings**
```
┌─ 🔍 Retrieval Settings ────────────────────┐
│                                             │
│  Top-K Documents: [30]                      │
│  (How many chunks to retrieve)              │
│                                             │
│  Range: 5 - 100                             │
│  Higher values = more context but slower    │
│                                             │
│  [Save Retrieval Settings]                  │
└─────────────────────────────────────────────┘
```

**Section 5: Custom Prompts**
```
┌─ 📝 System Prompt ─────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ You are a comprehensive AI tutor... │   │
│  │ Provide detailed explanations...    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  This is prepended to all chat requests     │
│  Leave empty to use default                 │
│                                             │
└─────────────────────────────────────────────┘

┌─ 🎯 Quiz Generation Prompt ────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Generate quiz questions about...    │   │
│  │ Create multiple choice format...    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Used when generating quiz questions        │
│                                             │
│  [Save Prompts] (saves both together)       │
└─────────────────────────────────────────────┘
```

**Section 6: Offline Mode**
```
┌─ 🔌 Offline Mode (LM Studio) ──────────────┐
│                                             │
│  Use local LM Studio instead of OpenAI API  │
│  ☐ Enable Offline Mode ← Toggle switch      │
│                                             │
│  [When enabled, shows:]                     │
│  ┌─────────────────────────────────────┐   │
│  │ LM Studio URL:                      │   │
│  │ [http://192.168.0.134:1234/v1]      │   │
│  │                                     │   │
│  │ LM Studio Model:                    │   │
│  │ [openai/gpt-oss-20b]                │   │
│  │                                     │   │
│  │ ⚠️ Requires LM Studio running       │   │
│  │ Ensure URL is accessible            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Save Offline Settings]                    │
└─────────────────────────────────────────────┘
```

**Styling (Tailwind - matches ai-tutor-app):**
```typescript
// Container
className="min-h-screen bg-slate-950 text-slate-50"

// Header
className="bg-slate-900 border-b border-slate-800 p-6"

// Sections
className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6"

// Labels
className="text-sm font-semibold text-slate-300 mb-2 block"

// Inputs/Selects
className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"

// Buttons
className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"

// Helper text
className="text-xs text-slate-500 mt-2"

// Error message
className="text-red-400 text-sm mt-2"

// Success notification
className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg"
```

**Error Handling:**
- All API calls wrapped in try-catch
- Network errors: "Failed to connect to RAG service"
- Validation errors: "Invalid value: must be between 5 and 100"
- Timeout errors: "Request timed out (RAG service may be unavailable)"
- Show errors in red toast notification
- Log to console for debugging

**Access Control:**
```typescript
useEffect(() => {
  if (!user || user.role !== 'admin') {
    navigate('/dashboard')
    return
  }
}, [user, navigate])
```

### 2.2 New Service: `tutorverse-hub-main/src/services/RAGSettingsService.ts`

**Location:** `ai-tutor-app/tutorverse-hub-main/src/services/RAGSettingsService.ts`

**Purpose:** Handle all RAG settings API communication with backend middleware

**Implementation:**
```typescript
import { createApiClient } from './apiClient'

const apiClient = createApiClient()

export class RAGSettingsService {
  /**
   * Get all RAG settings
   * Calls: GET /api/rag/settings/config
   */
  static async getRAGSettings() {
    try {
      const response = await apiClient.get('/rag/settings/config')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to load settings:', error)
      throw new Error(
        error instanceof Error ? error.message : 'Failed to load RAG settings'
      )
    }
  }

  /**
   * Update LLM model
   * Calls: POST /api/rag/settings/model
   */
  static async updateModel(modelId: string) {
    try {
      const response = await apiClient.post('/rag/settings/model', {
        model_id: modelId
      })
      if (!response.success) throw new Error('Failed to update model')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update model:', error)
      throw error
    }
  }

  /**
   * Update temperature
   * Calls: POST /api/rag/settings/temperature
   */
  static async updateTemperature(temperature: number) {
    try {
      if (temperature < 0 || temperature > 1) {
        throw new Error('Temperature must be between 0 and 1')
      }
      const response = await apiClient.post('/rag/settings/temperature', {
        temperature
      })
      if (!response.success) throw new Error('Failed to update temperature')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update temperature:', error)
      throw error
    }
  }

  /**
   * Update embedding model
   * Calls: POST /api/rag/settings/embedding
   */
  static async updateEmbeddingModel(embeddingModel: string) {
    try {
      const response = await apiClient.post('/rag/settings/embedding', {
        embedding_model: embeddingModel
      })
      if (!response.success) throw new Error('Failed to update embedding model')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update embedding model:', error)
      throw error
    }
  }

  /**
   * Update retrieval settings
   * Calls: POST /api/rag/settings/retrieval
   */
  static async updateRetrievalSettings(topK: number) {
    try {
      if (topK < 5 || topK > 100) {
        throw new Error('Top-K must be between 5 and 100')
      }
      const response = await apiClient.post('/rag/settings/retrieval', {
        top_k: topK
      })
      if (!response.success) throw new Error('Failed to update retrieval settings')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update retrieval settings:', error)
      throw error
    }
  }

  /**
   * Update custom prompts
   * Calls: POST /api/rag/settings/prompts
   */
  static async updatePrompts(customPrompt: string, quizPrompt: string) {
    try {
      const response = await apiClient.post('/rag/settings/prompts', {
        custom_prompt: customPrompt || null,
        quiz_prompt: quizPrompt || null
      })
      if (!response.success) throw new Error('Failed to update prompts')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update prompts:', error)
      throw error
    }
  }

  /**
   * Update offline mode
   * Calls: POST /api/rag/settings/offline
   */
  static async updateOfflineMode(
    offlineMode: boolean,
    lmStudioUrl?: string,
    lmStudioModel?: string
  ) {
    try {
      const response = await apiClient.post('/rag/settings/offline', {
        offline_mode: offlineMode,
        lm_studio_url: lmStudioUrl || null,
        lm_studio_model: lmStudioModel || null
      })
      if (!response.success) throw new Error('Failed to update offline mode')
      return response
    } catch (error) {
      console.error('[RAGSettingsService] Failed to update offline mode:', error)
      throw error
    }
  }
}
```

**Features:**
- Client-side validation before API calls
- Descriptive error messages
- Console logging for debugging
- Uses existing apiClient (handles auth, timeouts)
- Returns typed responses

### 2.3 Update Navigation

**Modify:** `tutorverse-hub-main/src/components/layout/LeftSidebar.tsx`

Add to admin section:
```typescript
{
  icon: Settings,
  label: 'RAG Settings',
  path: '/admin/rag-settings',
  requiredRole: 'admin'
}
```

### 2.4 Add Route

**Modify:** `tutorverse-hub-main/src/App.tsx`

```typescript
import RAGSettings from './pages/admin/RAGSettings'

// In router configuration:
{
  path: '/admin/rag-settings',
  element: <AdminRoute><RAGSettings /></AdminRoute>
}
```

---

## 3. Backend Middleware Implementation

### 3.1 New File: `ai-tutor-app/backend/src/routes/rag-settings.ts`

**Location:** `ai-tutor-app/backend/src/routes/rag-settings.ts`

**Purpose:** Proxy settings requests to RAG service with validation and error handling

**Implementation:**
```typescript
import { Router, Request, Response } from 'express'
import axios, { AxiosError } from 'axios'
import { environment } from '../config/environment'

const router = Router()

// RAG Service configuration
const RAG_SERVICE_URL = environment.RAG_SERVICE_URL || 'http://localhost:8000'
const RAG_ENABLED = environment.RAG_ENABLE !== 'false'
const RAG_TIMEOUT = parseInt(environment.RAG_TIMEOUT || '600000', 10)

// Axios instance for RAG service
const ragClient = axios.create({
  baseURL: RAG_SERVICE_URL,
  timeout: RAG_TIMEOUT,
  validateStatus: () => true // Don't throw on any status code
})

// Middleware: Check if RAG is enabled
const checkRAGEnabled = (req: Request, res: Response, next: Function) => {
  if (!RAG_ENABLED) {
    return res.status(503).json({
      error: 'RAG service is not enabled',
      message: 'Set RAG_ENABLE=true to enable RAG settings'
    })
  }
  next()
}

// Helper: Proxy error handler
const handleRAGError = (error: AxiosError, res: Response) => {
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'RAG service unavailable',
      message: `Cannot connect to RAG service at ${RAG_SERVICE_URL}`,
      details: 'Ensure RAG service is running and accessible'
    })
  }

  if (error.code === 'ECONNABORTED') {
    return res.status(504).json({
      error: 'RAG service timeout',
      message: `Request to RAG service timed out after ${RAG_TIMEOUT}ms`,
      details: 'The RAG service may be overloaded or unresponsive'
    })
  }

  if (error.response?.status === 404) {
    return res.status(404).json({
      error: 'RAG endpoint not found',
      message: 'The requested RAG settings endpoint does not exist'
    })
  }

  return res.status(error.response?.status || 500).json({
    error: 'RAG service error',
    message: error.response?.data?.detail || error.message,
    status: error.response?.status
  })
}

/**
 * GET /api/rag/settings/config
 * Get all RAG settings
 */
router.get('/settings/config', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    console.log('[RAG Settings] GET /api/settings/config')
    
    const response = await ragClient.get('/api/settings/config')
    
    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error fetching config:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/model
 * Update LLM model
 */
router.post('/settings/model', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { model_id } = req.body

    if (!model_id || typeof model_id !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'model_id is required and must be a string'
      })
    }

    console.log(`[RAG Settings] POST /api/settings/model (${model_id})`)

    const response = await ragClient.post('/api/settings/model', { model_id })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating model:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/temperature
 * Update temperature
 */
router.post('/settings/temperature', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { temperature } = req.body

    if (temperature === undefined || typeof temperature !== 'number') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'temperature is required and must be a number'
      })
    }

    if (temperature < 0 || temperature > 1) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'temperature must be between 0 and 1'
      })
    }

    console.log(`[RAG Settings] POST /api/settings/temperature (${temperature})`)

    const response = await ragClient.post('/api/settings/temperature', { temperature })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating temperature:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/embedding
 * Update embedding model
 */
router.post('/settings/embedding', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { embedding_model } = req.body

    if (!embedding_model || typeof embedding_model !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'embedding_model is required and must be a string'
      })
    }

    console.log(`[RAG Settings] POST /api/settings/embedding (${embedding_model})`)

    const response = await ragClient.post('/api/settings/embedding', { embedding_model })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating embedding model:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/retrieval
 * Update retrieval settings
 */
router.post('/settings/retrieval', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { top_k } = req.body

    if (top_k === undefined || typeof top_k !== 'number') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'top_k is required and must be a number'
      })
    }

    if (top_k < 5 || top_k > 100) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'top_k must be between 5 and 100'
      })
    }

    console.log(`[RAG Settings] POST /api/settings/retrieval (${top_k})`)

    const response = await ragClient.post('/api/settings/retrieval', { top_k })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating retrieval settings:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/prompts
 * Update custom prompts
 */
router.post('/settings/prompts', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { custom_prompt, quiz_prompt } = req.body

    // Both can be null/undefined, but if provided must be strings
    if (custom_prompt !== undefined && typeof custom_prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'custom_prompt must be a string'
      })
    }

    if (quiz_prompt !== undefined && typeof quiz_prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'quiz_prompt must be a string'
      })
    }

    console.log('[RAG Settings] POST /api/settings/prompts')

    const response = await ragClient.post('/api/settings/prompts', {
      custom_prompt,
      quiz_prompt
    })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating prompts:', error)
    handleRAGError(error as AxiosError, res)
  }
})

/**
 * POST /api/rag/settings/offline
 * Update offline mode
 */
router.post('/settings/offline', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { offline_mode, lm_studio_url, lm_studio_model } = req.body

    if (typeof offline_mode !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'offline_mode must be a boolean'
      })
    }

    if (lm_studio_url !== undefined && typeof lm_studio_url !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'lm_studio_url must be a string'
      })
    }

    if (lm_studio_model !== undefined && typeof lm_studio_model !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'lm_studio_model must be a string'
      })
    }

    console.log(`[RAG Settings] POST /api/settings/offline (${offline_mode})`)

    const response = await ragClient.post('/api/settings/offline', {
      offline_mode,
      lm_studio_url,
      lm_studio_model
    })

    if (response.status >= 400) {
      return handleRAGError(response as any, res)
    }

    res.json(response.data)
  } catch (error) {
    console.error('[RAG Settings] Error updating offline mode:', error)
    handleRAGError(error as AxiosError, res)
  }
})

export default router
```

**Key Features:**
- Checks `RAG_ENABLED` flag before processing
- Uses `RAG_SERVICE_URL` from environment
- Validates input on backend before forwarding
- Handles connection errors gracefully
- Timeout handling
- Descriptive error messages
- Logging for debugging
- Returns proxy response directly

### 3.2 Register Route in Main App

**Modify:** `ai-tutor-app/backend/src/app.ts`

```typescript
import ragSettingsRouter from './routes/rag-settings'

// After other route registrations:
app.use('/api', ragSettingsRouter)
```

---

## 4. RAG Service Implementation

### 4.1 Create: `RAG18Nov2025-1/api/settings_store.py`

```python
from pathlib import Path
from dotenv import set_key
import os

class SettingsStore:
    """Manage persistent settings storage in .env file"""
    
    def __init__(self, env_file_path: str = ".env"):
        self.env_file = Path(env_file_path)
        if not self.env_file.exists():
            self.env_file.touch()
    
    def save_setting(self, key: str, value: str) -> bool:
        """Save a single setting to .env file"""
        try:
            set_key(str(self.env_file), key.upper(), str(value))
            return True
        except Exception as e:
            print(f"[SettingsStore] Error saving {key}: {e}")
            return False
    
    def save_settings(self, settings: dict) -> bool:
        """Save multiple settings"""
        try:
            for key, value in settings.items():
                set_key(str(self.env_file), key.upper(), str(value))
            return True
        except Exception as e:
            print(f"[SettingsStore] Error saving settings: {e}")
            return False
```

### 4.2 Enhance: `RAG18Nov2025-1/config.py`

Add persistence function:
```python
def persist_setting(key: str, value) -> bool:
    """Save a setting to persistent storage (.env file)"""
    try:
        from dotenv import set_key
        env_path = Path(__file__).parent / ".env"
        set_key(str(env_path), key.upper(), str(value))
        print(f"[Config] Persisted {key.upper()} = {value}")
        return True
    except Exception as e:
        print(f"[Config] Error persisting {key}: {e}")
        return False
```

### 4.3 Enhance: `RAG18Nov2025-1/api/settings_routes.py`

Complete implementation:
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

# ============ POST Endpoints ============

@router.post("/model")
async def update_model(update: ModelUpdate):
    """Update LLM model"""
    try:
        valid_models = [m['id'] for m in config.AVAILABLE_MODELS]
        if update.model_id not in valid_models:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model: {update.model_id}. Valid options: {valid_models}"
            )
        
        config.LLM_MODEL = update.model_id
        config.persist_setting("LLM_MODEL", update.model_id)
        
        print(f"[Settings] Model updated to: {update.model_id}")
        return {"success": True, "model": config.LLM_MODEL}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Settings] Error updating model: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating model: {str(e)}")

@router.post("/temperature")
async def update_temperature(update: TemperatureUpdate):
    """Update LLM temperature (0.0-1.0)"""
    try:
        config.LLM_TEMPERATURE = update.temperature
        config.persist_setting("LLM_TEMPERATURE", str(update.temperature))
        
        print(f"[Settings] Temperature updated to: {update.temperature}")
        return {"success": True, "temperature": config.LLM_TEMPERATURE}
    except Exception as e:
        print(f"[Settings] Error updating temperature: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating temperature: {str(e)}")

@router.post("/embedding")
async def update_embedding_model(update: EmbeddingUpdate):
    """Update embedding model"""
    try:
        config.EMBEDDING_MODEL = update.embedding_model
        config.persist_setting("EMBEDDING_MODEL", update.embedding_model)
        
        print(f"[Settings] Embedding model updated to: {update.embedding_model}")
        return {"success": True, "embedding_model": config.EMBEDDING_MODEL}
    except Exception as e:
        print(f"[Settings] Error updating embedding model: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating embedding model: {str(e)}"
        )

@router.post("/retrieval")
async def update_retrieval_config(update: RetrievalUpdate):
    """Update retrieval settings (top_k)"""
    try:
        config.RETRIEVAL_TOP_K = update.top_k
        config.persist_setting("RETRIEVAL_TOP_K", str(update.top_k))
        
        print(f"[Settings] Retrieval top_k updated to: {update.top_k}")
        return {"success": True, "top_k": config.RETRIEVAL_TOP_K}
    except Exception as e:
        print(f"[Settings] Error updating retrieval config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating retrieval config: {str(e)}"
        )

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
        
        print(f"[Settings] Prompts updated")
        return {
            "success": True,
            "custom_prompt": config.CUSTOM_SYSTEM_PROMPT or "",
            "quiz_prompt": config.QUIZ_GENERATION_PROMPT or ""
        }
    except Exception as e:
        print(f"[Settings] Error updating prompts: {e}")
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
        try:
            import modules.shared.openai_client as client_module
            client_module._online_client = None
            client_module._offline_client = None
        except ImportError:
            pass
        
        print(f"[Settings] Offline mode updated to: {update.offline_mode}")
        return {
            "success": True,
            "offline_mode": config.OFFLINE_MODE,
            "lm_studio_url": config.LM_STUDIO_BASE_URL,
            "lm_studio_model": config.LM_STUDIO_MODEL
        }
    except Exception as e:
        print(f"[Settings] Error updating offline config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating offline config: {str(e)}"
        )
```

---

## 5. File Modifications Summary

### Frontend (ai-tutor-app/tutorverse-hub-main)
| File | Action | Details |
|------|--------|---------|
| `src/pages/admin/RAGSettings.tsx` | CREATE | Admin settings page component |
| `src/services/RAGSettingsService.ts` | CREATE | Service for RAG API communication |
| `src/App.tsx` | MODIFY | Add route: `/admin/rag-settings` |
| `src/components/layout/LeftSidebar.tsx` | MODIFY | Add navigation link to RAG Settings |
| `.env.local` | NO CHANGE | Already has `VITE_API_URL` |

### Backend Middleware (ai-tutor-app/backend)
| File | Action | Details |
|------|--------|---------|
| `src/routes/rag-settings.ts` | CREATE | Proxy routes to RAG service |
| `src/app.ts` | MODIFY | Register RAG settings router |

### RAG Service (RAG18Nov2025-1)
| File | Action | Details |
|------|--------|---------|
| `api/settings_store.py` | CREATE | Persistent settings manager |
| `api/settings_routes.py` | ENHANCE | Add validation, persistence |
| `config.py` | ENHANCE | Add `persist_setting()` function |
| `.env` | UPDATE | Settings persist here |

---

## 6. Implementation Sequence

### Phase 1: RAG Backend (RAG18Nov2025-1)

**Step 1.1:** Create settings_store.py
```bash
cd RAG18Nov2025-1
# Copy the code from section 4.1
# File: api/settings_store.py
```

**Step 1.2:** Enhance config.py
```python
# Add persist_setting() function from section 4.2
```

**Step 1.3:** Enhance settings_routes.py
```python
# Replace entire file with code from section 4.3
```

**Step 1.4:** Test RAG endpoints
```bash
# Start RAG service
python main.py

# In another terminal:
curl http://localhost:8000/api/settings/config
```

**Expected response:**
```json
{
  "success": true,
  "llm_model": "gpt-4.1-nano",
  "temperature": 0.7,
  ...
}
```

### Phase 2: Backend Middleware (ai-tutor-app/backend)

**Step 2.1:** Create rag-settings.ts
```bash
cd ai-tutor-app/backend
# Copy code from section 3.1 to: src/routes/rag-settings.ts
```

**Step 2.2:** Register in app.ts
```typescript
// Add to src/app.ts after line ~30:
import ragSettingsRouter from './routes/rag-settings'
app.use('/api', ragSettingsRouter)
```

**Step 2.3:** Test backend routes
```bash
# Start backend
npm run dev

# In another terminal:
curl http://localhost:3000/api/rag/settings/config
```

**Expected response:**
```json
{
  "success": true,
  "llm_model": "gpt-4.1-nano",
  ...
}
```

### Phase 3: Frontend Service (ai-tutor-app/tutorverse-hub-main)

**Step 3.1:** Create RAGSettingsService.ts
```bash
cd ai-tutor-app/tutorverse-hub-main
# Copy code from section 2.2 to: src/services/RAGSettingsService.ts
```

**Step 3.2:** Test service
```typescript
// In browser console:
import { RAGSettingsService } from './services/RAGSettingsService'
const settings = await RAGSettingsService.getRAGSettings()
console.log(settings)
```

### Phase 4: Frontend Component (ai-tutor-app/tutorverse-hub-main)

**Step 4.1:** Create RAGSettings.tsx
```bash
# Copy code from section 2.1 to: src/pages/admin/RAGSettings.tsx
```

**Step 4.2:** Update navigation
```typescript
// Modify: src/components/layout/LeftSidebar.tsx
// Add RAG Settings link to admin section
```

**Step 4.3:** Add route
```typescript
// Modify: src/App.tsx
// Add route for /admin/rag-settings
```

**Step 4.4:** Test in browser
```
http://localhost:3000/admin/rag-settings
```

### Phase 5: Integration Testing

**Test 1:** Change model
1. Load RAGSettings page
2. Select different model
3. Click save
4. Verify notification shows success
5. Refresh page, verify model persists
6. Stop RAG backend, restart, verify model loaded from .env

**Test 2:** Test RAG disabled
1. Set `RAG_ENABLE=false` in docker-compose
2. Restart backend
3. Navigate to RAGSettings
4. Verify error message: "RAG service is not enabled"

**Test 3:** Test RAG unavailable
1. Stop RAG service
2. Try to save setting
3. Verify error message: "RAG service unavailable"

---

## 7. Environment Configuration

### Development (.env.local files)

**ai-tutor-app/tutorverse-hub-main/.env.local**
```env
VITE_API_URL=http://localhost:3000
# Backend automatically proxies to RAG via RAG_SERVICE_URL
```

**ai-tutor-app/backend/.env**
```env
RAG_SERVICE_URL=http://localhost:8000
RAG_ENABLE=true
RAG_TIMEOUT=600000
```

**RAG18Nov2025-1/.env**
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

### Docker Compose (Production)

**docker-compose.yml** (updated)
```yaml
services:
  frontend:
    environment:
      - VITE_API_URL=http://backend:3000

  backend:
    environment:
      - RAG_SERVICE_URL=http://rag-service:8000
      - RAG_ENABLE=true
      - RAG_TIMEOUT=600000
    depends_on:
      rag-service:
        condition: service_healthy

  rag-service:
    env_file:
      - ./RAG18Nov2025-1/.env
    volumes:
      - ./RAG18Nov2025-1/chroma_db:/app/chroma_db
```

---

## 8. API Specifications

### Request/Response Format

**GET /api/rag/settings/config**
```
Request:
GET /api/rag/settings/config

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
    {"id": "gpt-4o", "name": "GPT-4o", "description": "Optimized GPT-4"},
    ...
  ]
}

Response 503 (RAG disabled):
{
  "error": "RAG service is not enabled",
  "message": "Set RAG_ENABLE=true to enable RAG settings"
}

Response 503 (RAG unavailable):
{
  "error": "RAG service unavailable",
  "message": "Cannot connect to RAG service at http://rag-service:8000",
  "details": "Ensure RAG service is running and accessible"
}
```

**POST /api/rag/settings/model**
```
Request:
{
  "model_id": "gpt-4o"
}

Response 200:
{
  "success": true,
  "model": "gpt-4o"
}

Response 400 (Invalid model):
{
  "error": "Invalid input",
  "message": "Invalid model: gpt-invalid"
}
```

**POST /api/rag/settings/temperature**
```
Request:
{
  "temperature": 0.5
}

Response 200:
{
  "success": true,
  "temperature": 0.5
}

Response 400 (Out of range):
{
  "error": "Invalid input",
  "message": "temperature must be between 0 and 1"
}
```

All other endpoints follow same pattern (see section 3.1 for full details).

---

## 9. Data Flow Examples

### Example 1: User Changes Model

```
1. Admin clicks model dropdown in UI
   └─ UI state updates: currentModel = "gpt-4o"

2. User clicks [Save Model] button
   └─ Calls: RAGSettingsService.updateModel("gpt-4o")

3. Service makes HTTP request
   └─ POST http://localhost:3000/api/rag/settings/model
   └─ Body: {"model_id": "gpt-4o"}

4. Backend middleware receives request
   └─ Checks RAG_ENABLE=true ✓
   └─ Validates input ✓
   └─ Proxies to RAG: POST http://rag-service:8000/api/settings/model

5. RAG backend processes
   └─ Validates model in AVAILABLE_MODELS ✓
   └─ Sets config.LLM_MODEL = "gpt-4o"
   └─ Persists to .env: set_key(".env", "LLM_MODEL", "gpt-4o")

6. Response travels back
   └─ RAG → Backend → Frontend
   └─ Response: {"success": true, "model": "gpt-4o"}

7. Frontend updates state
   └─ setSettings({...settings, llm_model: "gpt-4o"})
   └─ Shows toast: "✓ Model updated"

8. Next chat request uses new model
   └─ config.LLM_MODEL = "gpt-4o" when processing chat
```

### Example 2: RAG Service Unavailable

```
1. Admin tries to change temperature
   └─ RAGSettingsService.updateTemperature(0.5)

2. Backend receives request
   └─ Checks RAG_ENABLE=true ✓
   └─ Validates input ✓
   └─ Tries to proxy: POST http://rag-service:8000/api/settings/temperature
   └─ ERROR: Connection refused (RAG not running)

3. Backend catches error
   └─ handleRAGError(error, res)
   └─ Returns 503: "RAG service unavailable"

4. Frontend receives error
   └─ catch block in RAGSettingsService
   └─ Shows toast: "❌ RAG service unavailable"
   └─ UI remains unchanged

5. Admin sees error, checks RAG service
```

### Example 3: RAG Disabled

```
1. Docker-compose has RAG_ENABLE=false

2. Admin navigates to RAGSettings page
   └─ Component mounts
   └─ Calls RAGSettingsService.getRAGSettings()

3. Backend receives GET request
   └─ Middleware checks: RAG_ENABLE=false ✗
   └─ Middleware doesn't proxy, returns 503 immediately

4. Frontend receives 503
   └─ Catch block: "RAG service is not enabled"
   └─ Shows error message on page
   └─ Disables all controls

5. Admin can't change any settings
   └─ Must enable RAG and restart to manage settings
```

---

## 10. Testing Checklist

### Unit Tests (RAG Backend)

- [ ] `POST /api/settings/model` with valid model saves to .env
- [ ] `POST /api/settings/model` with invalid model returns 400
- [ ] `POST /api/settings/temperature` validates 0.0-1.0 range
- [ ] `POST /api/settings/temperature` saves and persists
- [ ] `POST /api/settings/retrieval` validates 5-100 range
- [ ] `POST /api/settings/embedding` persists change
- [ ] `POST /api/settings/prompts` saves both or partial
- [ ] `POST /api/settings/offline` toggles and resets clients
- [ ] `GET /api/settings/config` returns all current values
- [ ] Settings reload from .env on backend restart

### Integration Tests (Backend Middleware)

- [ ] `GET /api/rag/settings/config` proxies to RAG correctly
- [ ] `POST /api/rag/settings/model` proxies with validation
- [ ] 503 returned when `RAG_ENABLE=false`
- [ ] 503 returned when RAG service unavailable
- [ ] Error messages are user-friendly
- [ ] Timeout errors handled (504)
- [ ] All validation passes through before proxying

### UI Component Tests (Frontend)

- [ ] RAGSettings page loads for admin users only
- [ ] Non-admin redirected to dashboard
- [ ] Settings load on mount
- [ ] Skeleton loaders show while loading
- [ ] Model dropdown renders all models
- [ ] Temperature slider works (0.0-1.0)
- [ ] Retrieval input validates (5-100)
- [ ] Prompts textareas accept input
- [ ] Offline toggle shows/hides conditional inputs
- [ ] Each save button sends correct POST request
- [ ] Success toast shows after save
- [ ] Error toast shows on failure
- [ ] Button disabled during save (isSaving state)

### Service Tests (RAGSettingsService)

- [ ] `getRAGSettings()` calls correct endpoint
- [ ] `updateModel()` sends model_id in correct format
- [ ] `updateTemperature()` validates client-side
- [ ] `updateTemperature()` sends float to backend
- [ ] `updateRetrievalSettings()` validates 5-100 range
- [ ] All methods use correct HTTP verbs
- [ ] Error handling returns descriptive messages
- [ ] Timeout errors caught
- [ ] Network errors caught

### End-to-End Tests

- [ ] **Test 1: Change and Persist**
  1. Change model in UI
  2. Verify save button disabled
  3. Verify success toast
  4. Refresh page
  5. Verify model still shows new value
  
- [ ] **Test 2: Backend Restart**
  1. Change temperature to 0.3
  2. Stop backend container
  3. Restart backend
  4. Verify temperature is 0.3 (loaded from .env)
  
- [ ] **Test 3: RAG Unavailable**
  1. Stop RAG container
  2. Try to change model
  3. Verify error: "RAG service unavailable"
  4. Verify UI not changed
  5. Start RAG container
  6. Try again, should work
  
- [ ] **Test 4: RAG Disabled**
  1. Set `RAG_ENABLE=false`
  2. Restart backend
  3. Try to load RAGSettings
  4. Verify error: "RAG service is not enabled"
  5. All controls disabled

---

## 11. Deployment & Docker

### Docker Compose Changes

The existing `docker-compose.yml` already has correct setup:

```yaml
rag-service:
  environment:
    - PYTHONUNBUFFERED=1
    - ENVIRONMENT=production
    - CHROMA_PERSIST_DIR=/app/chroma_db
  env_file:
    - ./RAG18Nov2025-1/.env
  volumes:
    - ./RAG18Nov2025-1/chroma_db:/app/chroma_db
```

**No changes needed** - it already:
- Mounts `.env` file
- Persists chroma_db volume
- Sets correct CHROMA_PERSIST_DIR

### Ensuring .env Persistence

For settings to survive restarts, the RAG `chroma_db` volume should be persisted. This is already configured.

**To persist settings across deployments:**
1. Commit changes to git: `git add RAG18Nov2025-1/.env && git commit -m "Updated RAG settings"`
2. Or use volume mount with named volume for production

### Production Checklist

- [ ] Set `RAG_ENABLE=true` in backend
- [ ] Set correct `RAG_SERVICE_URL` (internal network URL or external)
- [ ] Set `OPENAI_API_KEY` in RAG .env
- [ ] All settings saved to .env and committed to git
- [ ] Volume mounted for `chroma_db` persistence
- [ ] Backend has correct `VITE_API_URL`
- [ ] Frontend built with production configuration

---

## 12. Troubleshooting

### Issue: "RAG service is not enabled"

**Cause:** `RAG_ENABLE=false` in backend

**Fix:**
```bash
# In docker-compose.yml or backend .env:
RAG_ENABLE=true

# Restart backend
docker-compose restart backend
```

### Issue: "RAG service unavailable"

**Cause:** RAG service not running or wrong URL

**Fix:**
```bash
# Check if RAG is running:
docker-compose ps | grep rag-service

# If not running:
docker-compose up rag-service

# Check logs:
docker-compose logs rag-service

# Verify URL in backend:
echo $RAG_SERVICE_URL  # Should be http://rag-service:8000 (docker) or http://localhost:8000 (local)
```

### Issue: Settings not persisting after restart

**Cause:** .env file not mounted or persisted

**Fix:**
1. Check volume mount in docker-compose
2. Ensure RAG_ENABLE is set BEFORE making changes
3. Verify .env file exists: `ls -la RAG18Nov2025-1/.env`
4. Check file permissions: `chmod 644 RAG18Nov2025-1/.env`

### Issue: Temperature change doesn't affect responses

**Cause:** Cached client or in-flight requests

**Fix:**
1. Settings apply to **new** requests only
2. Stop current chat and start new chat
3. Check `config.LLM_TEMPERATURE` in RAG logs
4. Verify response: `curl http://localhost:8000/api/settings/config`

### Issue: Model not in available_models list

**Cause:** Model not in `config.AVAILABLE_MODELS`

**Fix:**
1. Edit `RAG18Nov2025-1/config.py`
2. Add model to `AVAILABLE_MODELS` list
3. Restart RAG service

### Debug Commands

```bash
# Check settings via backend:
curl http://localhost:3000/api/rag/settings/config

# Check settings directly on RAG:
curl http://localhost:8000/api/settings/config

# Check .env file was updated:
cat RAG18Nov2025-1/.env | grep LLM_MODEL

# Check backend logs:
docker-compose logs backend | grep "RAG Settings"

# Check RAG logs:
docker-compose logs rag-service | grep "Settings"
```

---

## 13. Completion Criteria

### ✅ Implementation Complete When:

**Backend Middleware (ai-tutor-app/backend)**
- ✅ `src/routes/rag-settings.ts` created with all endpoints
- ✅ Route registered in `src/app.ts`
- ✅ All endpoints proxy to RAG service with validation
- ✅ Error handling for RAG unavailable/disabled
- ✅ Tested with curl: settings can be read and written

**RAG Service (RAG18Nov2025-1)**
- ✅ `api/settings_store.py` created
- ✅ `config.py` has `persist_setting()` function
- ✅ `api/settings_routes.py` enhanced with all endpoints
- ✅ All endpoints validate input
- ✅ All changes persist to `.env` file
- ✅ Settings survive RAG service restart

**Frontend (ai-tutor-app/tutorverse-hub-main)**
- ✅ `src/pages/admin/RAGSettings.tsx` created
- ✅ `src/services/RAGSettingsService.ts` created
- ✅ Route added to `/admin/rag-settings`
- ✅ Navigation link added for admins
- ✅ Component loads settings on mount
- ✅ All controls functional and save correctly
- ✅ Success/error notifications working
- ✅ Admin-only access enforced

**Integration & Testing**
- ✅ End-to-end: Change setting in UI → verified in .env
- ✅ Settings persist across service restarts
- ✅ RAG_ENABLE=false gracefully disables settings
- ✅ RAG unavailable shows user-friendly error
- ✅ All validation working (model list, temp range, top_k range)
- ✅ Tested with docker-compose

**Documentation**
- ✅ This plan document complete
- ✅ Code comments added where needed
- ✅ Environment variables documented
- ✅ API endpoints documented
- ✅ Troubleshooting guide included

---

## Summary

This comprehensive plan provides a **production-ready implementation** of RAG settings management that:

1. **Maintains Plug-and-Play Architecture** - All communication through environment variables and HTTP
2. **Respects Separation of Concerns** - Frontend, Backend, RAG all have clear responsibilities
3. **Graceful Degradation** - Works with or without RAG service
4. **Persistent Settings** - Changes saved to `.env` and survive restarts
5. **Full Error Handling** - User-friendly messages for all failure scenarios
6. **Security** - Admin-only access control on frontend
7. **Testability** - Clear testing checklist and debugging commands
8. **Single File Documentation** - Everything in this one markdown file

**Total Implementation Time:** ~4-6 hours (backend) + ~3-4 hours (frontend) + ~1-2 hours (testing)

Start with Phase 1 (RAG Backend) and work through sequentially. All code is provided - copy and adapt as needed for your specific implementation details.
