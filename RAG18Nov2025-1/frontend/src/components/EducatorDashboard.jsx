import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, FileText, CheckCircle, AlertCircle, Eye, X } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

function EducatorDashboard() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/educator/documents`)
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const allowedTypes = [
      '.pdf', '.txt', '.docx', '.md', '.csv',
      '.mp3', '.wav', '.m4a', '.flac', '.ogg',
      '.mp4', '.avi', '.mov', '.mkv', '.webm',
      '.pptx', '.ppt',
      '.cs', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.rb',
      '.php', '.swift', '.kt', '.scala', '.r', '.m', '.mm',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'
    ]
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!allowedTypes.includes(fileExt)) {
      alert(`File type not supported. Supported types: Audio (mp3, wav), Video (mp4, avi), Documents (pdf, docx, pptx), Code, Images`)
      return
    }

    setUploading(true)
    setUploadProgress({ name: file.name, status: 'uploading', progress: 0, message: 'Starting upload...' })
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/educator/upload`, {
        method: 'POST',
        body: formData
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.status === 'error') {
              setUploadProgress({ 
                name: file.name, 
                status: 'error', 
                error: data.message,
                progress: 0 
              })
              setTimeout(() => setUploadProgress(null), 5000)
              setUploading(false)
              return
            }

            if (data.status === 'complete') {
              setUploadProgress({ 
                name: file.name, 
                status: 'success', 
                chunks: data.chunks,
                id: data.document_id,
                progress: 100,
                message: data.message,
                fileType: data.file_type,
                textLength: data.text_length
              })
              setTimeout(() => {
                setUploadProgress(null)
                loadDocuments()
              }, 3000)
            } else {
              setUploadProgress({ 
                name: file.name, 
                status: data.status, 
                progress: data.progress || 0,
                message: data.message || 'Processing...'
              })
            }
          } catch (e) {
            console.error('Error parsing progress:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadProgress({ name: file.name, status: 'error', error: error.message, progress: 0 })
      setTimeout(() => setUploadProgress(null), 5000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handlePreviewDocument = async (filename) => {
    setLoadingPreview(true)
    try {
      const response = await fetch(`${API_BASE}/educator/preview/${encodeURIComponent(filename)}`)
      const data = await response.json()
      
      if (response.ok) {
        setPreviewData(data)
      } else {
        alert(`Error: ${data.detail || 'Failed to load preview'}`)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
      alert(`Error loading preview: ${error.message}`)
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setPreviewData(null)
  }

  const handleDeleteDocument = async (docName) => {
    if (!confirm(`Delete "${docName}"? This action cannot be undone.`)) return

    try {
      const response = await fetch(`${API_BASE}/educator/documents/${encodeURIComponent(docName)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.message) {
        loadDocuments()
      } else {
        alert(`Error: ${data.detail || 'Failed to delete document'}`)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert(`Error deleting document: ${error.message}`)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white">📚 Educator Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload and manage course documents for RAG vectorization
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">📤 Upload Documents</h2>
            
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.md,.csv,.mp3,.wav,.m4a,.mp4,.avi,.mov,.pptx,.ppt,.cs,.py,.java,.cpp,.js,.ts,.jsx,.tsx,.jpg,.jpeg,.png,.gif,.bmp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={20} />
                {uploading ? 'Processing...' : 'Choose File'}
              </button>
              
              <p className="text-sm text-slate-400 mt-3">
                Supported formats: Audio (MP3, WAV), Video (MP4, AVI), Documents (PDF, DOCX, PPTX), Code, Images
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Files will be automatically converted, vectorized and added to the knowledge base
              </p>
            </div>

            {uploadProgress && (
              <div className={`mt-4 p-4 rounded-lg border ${
                uploadProgress.status === 'success' || uploadProgress.status === 'complete'
                  ? 'bg-green-950 border-green-800' 
                  : uploadProgress.status === 'error'
                  ? 'bg-red-950 border-red-800'
                  : 'bg-blue-950 border-blue-800'
              }`}>
                <div className="flex items-center gap-3">
                  {(uploadProgress.status === 'success' || uploadProgress.status === 'complete') && (
                    <CheckCircle className="text-green-400" size={20} />
                  )}
                  {uploadProgress.status === 'error' && <AlertCircle className="text-red-400" size={20} />}
                  {uploadProgress.status !== 'success' && uploadProgress.status !== 'complete' && uploadProgress.status !== 'error' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  )}
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{uploadProgress.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{uploadProgress.message}</p>
                    
                    {uploadProgress.status === 'success' || uploadProgress.status === 'complete' ? (
                      <div className="mt-2 text-xs text-slate-400">
                        <div>✓ File type: {uploadProgress.fileType}</div>
                        <div>✓ Extracted {uploadProgress.textLength?.toLocaleString()} characters</div>
                        <div>✓ Created {uploadProgress.chunks} chunks</div>
                      </div>
                    ) : uploadProgress.status === 'error' ? (
                      <p className="text-xs text-red-400 mt-1">
                        Error: {uploadProgress.error || 'Processing failed'}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.progress || 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{uploadProgress.progress || 0}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">📂 Document Library</h2>
              <span className="text-sm text-slate-400">{documents.length} documents</span>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-xs mt-2 text-slate-500">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors border border-slate-700"
                  >
                    <FileText className="text-blue-400 flex-shrink-0" size={24} />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{doc.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        ID: {doc.id.substring(0, 8)}...
                      </p>
                    </div>

                    <button
                      onClick={() => handlePreviewDocument(doc.name)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950 rounded-md transition-colors"
                      title="Preview converted text"
                      disabled={loadingPreview}
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => handleDeleteDocument(doc.name)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded-md transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{previewData.filename}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {previewData.file_type} • {previewData.length.toLocaleString()} characters • {previewData.lines.toLocaleString()} lines
                  {previewData.file_size_mb && ` • ${previewData.file_size_mb} MB`}
                </p>
                {previewData.is_truncated && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ Preview truncated - showing excerpt only
                  </p>
                )}
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded border border-slate-800">
                {previewData.text}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EducatorDashboard





