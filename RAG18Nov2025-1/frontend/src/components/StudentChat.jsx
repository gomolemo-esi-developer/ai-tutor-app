import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Settings, X } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

function StudentChat() {
  const [documents, setDocuments] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [currentModel, setCurrentModel] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [quizPrompt, setQuizPrompt] = useState('')
  const [retrievalTopK, setRetrievalTopK] = useState(15)
  const [offlineMode, setOfflineMode] = useState(false)
  const [lmStudioUrl, setLmStudioUrl] = useState('http://192.168.0.134:1234/v1')
  const [lmStudioModel, setLmStudioModel] = useState('openai/gpt-oss-20b')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadDocuments()
    loadConfig()
    loadModels()
    loadPrompts()
    loadRetrievalConfig()
    loadOfflineConfig()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/documents`)
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/health/config`)
      const data = await response.json()
      setConfig(data)
      setCurrentModel(data.llm_model)
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const loadModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/models`)
      const data = await response.json()
      setAvailableModels(data.available)
      setCurrentModel(data.current)
    } catch (error) {
      console.error('Error loading models:', error)
    }
  }

  const loadPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/prompts`)
      const data = await response.json()
      setCustomPrompt(data.custom_prompt || '')
      setQuizPrompt(data.quiz_prompt || '')
    } catch (error) {
      console.error('Error loading prompts:', error)
    }
  }

  const loadRetrievalConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/retrieval`)
      const data = await response.json()
      setRetrievalTopK(data.top_k || 15)
    } catch (error) {
      console.error('Error loading retrieval config:', error)
    }
  }

  const loadOfflineConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/offline`)
      const data = await response.json()
      setOfflineMode(data.offline_mode || false)
      setLmStudioUrl(data.lm_studio_url || 'http://192.168.0.134:1234/v1')
      setLmStudioModel(data.lm_studio_model || 'openai/gpt-oss-20b')
    } catch (error) {
      console.error('Error loading offline config:', error)
    }
  }

  const handleModelChange = async (modelId) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      })
      const data = await response.json()
      if (data.success) {
        setCurrentModel(modelId)
        loadConfig()
      }
    } catch (error) {
      console.error('Error updating model:', error)
    }
  }

  const handleSavePrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_prompt: customPrompt,
          quiz_prompt: quizPrompt
        })
      })
      const data = await response.json()
      if (data.success) {
        alert('Prompts saved successfully!')
      }
    } catch (error) {
      console.error('Error saving prompts:', error)
    }
  }

  const handleSaveRetrievalConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/retrieval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_k: retrievalTopK })
      })
      const data = await response.json()
      if (data.success) {
        alert('Retrieval settings saved successfully!')
      }
    } catch (error) {
      console.error('Error saving retrieval config:', error)
    }
  }

  const handleSaveOfflineConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offline_mode: offlineMode,
          lm_studio_url: lmStudioUrl,
          lm_studio_model: lmStudioModel
        })
      })
      const data = await response.json()
      if (data.success) {
        alert('Offline mode settings saved successfully!')
        loadConfig()
      }
    } catch (error) {
      console.error('Error saving offline config:', error)
    }
  }

  const toggleDocument = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map(doc => doc.id))
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || selectedDocs.length === 0 || isLoading) return

    const userMessage = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/student/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: inputMessage,
          document_ids: selectedDocs,
          chat_history: messages
        })
      })

      const data = await response.json()
      const assistantMessage = { 
        role: 'assistant', 
        content: data.answer,
        responseTime: data.response_time 
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Failed to get response from server.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full bg-slate-950 text-slate-50">
      <aside className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold mb-2">📚 Document Sources</h2>
          <p className="text-sm text-slate-400 mb-4">
            {selectedDocs.length} of {documents.length} selected
          </p>
          <button
            onClick={selectAll}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-medium transition-colors"
          >
            {selectedDocs.length === documents.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <p>No documents available</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 p-3 rounded-md hover:bg-slate-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => toggleDocument(doc.id)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm flex-1 cursor-pointer" onClick={() => toggleDocument(doc.id)}>
                  {doc.name}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Model: {currentModel || 'Loading...'}</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="text-xs text-slate-400">
            DB: {config?.vector_db || 'Loading...'}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🤖 RAG Tutoring Chatbot</h1>
            <p className="text-sm text-slate-400 mt-1">
              AI-powered tutoring with dynamic document selection
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
              title="Clear conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
              <p className="text-slate-400 max-w-md">
                Select one or more documents from the sidebar and ask any question
                about their content.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.responseTime && (
                      <p className="text-xs mt-2 opacity-70">
                        ⚡ {msg.responseTime.toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-slate-800 bg-slate-900 p-4">
          {selectedDocs.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-2">
              ⚠️ Please select at least one document to start chatting
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the selected documents..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '...' : <Send size={20} />}
              </button>
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">⚙️ Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  AI Model
                </label>
                <select
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  Custom System Prompt (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add custom instructions for the AI tutor..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be added to the system prompt for chat responses
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  Quiz Generation Prompt (Optional)
                </label>
                <textarea
                  value={quizPrompt}
                  onChange={(e) => setQuizPrompt(e.target.value)}
                  placeholder="Instructions for generating quiz questions..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be used when generating quiz questions from documents
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  Number of Retrieved Chunks
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={retrievalTopK}
                  onChange={(e) => setRetrievalTopK(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Higher values provide more context but may be slower. Default: 15
                </p>
                <button
                  onClick={handleSaveRetrievalConfig}
                  className="mt-2 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Save Retrieval Settings
                </button>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-4">🔌 Offline Mode (LM Studio)</h4>
                
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-800 rounded-md">
                  <span className="text-sm text-slate-300">Enable Offline Mode</span>
                  <button
                    onClick={() => setOfflineMode(!offlineMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      offlineMode ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        offlineMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {offlineMode && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        LM Studio Base URL
                      </label>
                      <input
                        type="text"
                        value={lmStudioUrl}
                        onChange={(e) => setLmStudioUrl(e.target.value)}
                        placeholder="http://192.168.0.134:1234/v1"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Model Name
                      </label>
                      <input
                        type="text"
                        value={lmStudioModel}
                        onChange={(e) => setLmStudioModel(e.target.value)}
                        placeholder="openai/gpt-oss-20b"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Uses your local LM Studio server instead of OpenAI API
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSaveOfflineConfig}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Save Offline Settings
                </button>
              </div>

              <button
                onClick={handleSavePrompts}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Save Prompts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentChat

