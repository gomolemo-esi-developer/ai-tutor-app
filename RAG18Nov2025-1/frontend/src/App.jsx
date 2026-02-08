import { useState } from 'react'
import StudentChat from './components/StudentChat'
import EducatorDashboard from './components/EducatorDashboard'
import QuizGenerator from './components/QuizGenerator'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('student')

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'student'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            🎓 Student Chat
          </button>
          <button
            onClick={() => setActiveTab('educator')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'educator'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            👨‍🏫 Educator Dashboard
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'quiz'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            🎯 Quiz Generator
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'student' && <StudentChat />}
        {activeTab === 'educator' && <EducatorDashboard />}
        {activeTab === 'quiz' && <QuizGenerator />}
      </div>
    </div>
  )
}

export default App
