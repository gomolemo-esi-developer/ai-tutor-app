import { useState, useEffect } from 'react'
import { FileText, Plus, Download, CheckCircle, XCircle } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

function QuizGenerator() {
  const [documents, setDocuments] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [generating, setGenerating] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [showJson, setShowJson] = useState(false)
  
  const [formData, setFormData] = useState({
    moduleId: 'module_001',
    contentId: 'content_001',
    title: '',
    numQuestions: 5
  })

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/documents`)
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleDocToggle = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const handleGenerate = async () => {
    if (selectedDocs.length === 0) {
      alert('Please select at least one document')
      return
    }

    setGenerating(true)
    setQuiz(null)

    try {
      const payload = {
        moduleId: formData.moduleId,
        contentId: formData.contentId,
        title: formData.title || 'Generated Quiz',
        documentIds: selectedDocs,
        numQuestions: formData.numQuestions
      }

      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        setQuiz(data)
      } else {
        alert(`Error: ${data.detail || 'Generation failed'}`)
      }
    } catch (error) {
      console.error('Error generating:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz_${formData.contentId}.json`
    a.click()
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white">🎯 Quiz Generator</h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate AI-powered quizzes from your documents using RAG
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">⚙️ Configuration</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Module ID
                </label>
                <input
                  type="text"
                  value={formData.moduleId}
                  onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  placeholder="module_001"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Content ID
                </label>
                <input
                  type="text"
                  value={formData.contentId}
                  onChange={(e) => setFormData({ ...formData, contentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  placeholder="content_001"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.numQuestions}
                  onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">📚 Select Documents</h2>
              <div className="text-sm text-slate-400 mb-3">
                {selectedDocs.length} of {documents.length} selected
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center p-3 bg-slate-800 hover:bg-slate-750 rounded-md cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleDocToggle(doc.id)}
                      className="mr-3"
                    />
                    <FileText className="text-blue-400 mr-2 flex-shrink-0" size={18} />
                    <span className="text-sm text-white truncate">{doc.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || selectedDocs.length === 0}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {generating ? 'Generating Quiz...' : 'Generate Quiz'}
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  📝 Generated Quiz
                </h2>
                {quiz && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowJson(!showJson)}
                      className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                    >
                      {showJson ? 'Show Preview' : 'Show JSON'}
                    </button>
                    <button
                      onClick={downloadJson}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1"
                    >
                      <Download size={16} />
                      Download JSON
                    </button>
                  </div>
                )}
              </div>

              {!quiz && !generating && (
                <div className="text-center py-12 text-slate-400">
                  <p>Configure settings and select documents, then click Generate Quiz</p>
                </div>
              )}

              {generating && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="text-slate-400 mt-4">Generating quiz from course materials...</p>
                </div>
              )}

              {showJson && quiz && (
                <div className="bg-slate-950 p-4 rounded border border-slate-700 overflow-auto max-h-[600px]">
                  <pre className="text-sm text-slate-300 font-mono">
                    {JSON.stringify(quiz, null, 2)}
                  </pre>
                </div>
              )}

              {!showJson && quiz && (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-700">
                    <h3 className="text-xl font-semibold text-white">{quiz.quiz.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Module: {quiz.quiz.moduleId} | Content: {quiz.quiz.contentId}
                    </p>
                  </div>

                  {quiz.quiz.questions.map((q, index) => (
                    <div key={index} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-white font-medium flex-1">
                          {index + 1}. {q.question}
                        </h4>
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          {q.points} pts
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {q.options?.map((option, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded ${
                              option === q.correctAnswer
                                ? 'bg-green-950 border border-green-700 text-green-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center">
                              {option === q.correctAnswer ? (
                                <CheckCircle size={16} className="mr-2 text-green-400" />
                              ) : (
                                <XCircle size={16} className="mr-2 text-slate-500" />
                              )}
                              {option}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-slate-400 italic">
                        💡 {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizGenerator

