import { useState } from 'react'
import { isLoggedIn, isAdmin, logout } from './api'
import AuthForm from './components/AuthForm'
import NavBar from './components/NavBar'
import Camera from './components/Camera'
import ResultCard from './components/ResultCard'
import History from './components/History'
import Admin from './components/Admin'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn)
  const [screen, setScreen] = useState('camera') // 'camera' | 'result' | 'history' | 'admin'
  const [analysisResult, setAnalysisResult] = useState(null)

  const token = localStorage.getItem('token') || ''
  const adminUser = isAdmin()

  function handleLogout() {
    logout()
    setAuthed(false)
    setScreen('camera')
    setAnalysisResult(null)
  }

  function handleCameraClick() {
    setScreen('camera')
    setAnalysisResult(null)
  }

  if (!authed) {
    return <AuthForm onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <NavBar
        currentScreen={screen === 'result' ? 'camera' : screen}
        isAdmin={adminUser}
        onCameraClick={handleCameraClick}
        onHistoryClick={() => setScreen('history')}
        onAdminClick={() => setScreen('admin')}
        onSignOut={handleLogout}
      />
      <main className="flex-1 flex flex-col">
        {screen === 'camera' && (
          <Camera
            token={token}
            onAnalysisComplete={(result) => {
              setAnalysisResult(result)
              setScreen('result')
            }}
          />
        )}
        {screen === 'result' && analysisResult && (
          <ResultCard
            result={analysisResult}
            onAnalyzeAgain={handleCameraClick}
          />
        )}
        {screen === 'history' && <History token={token} />}
        {screen === 'admin' && <Admin token={token} />}
      </main>
    </div>
  )
}
