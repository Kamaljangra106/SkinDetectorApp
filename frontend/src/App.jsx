import { useState } from 'react'
import { isLoggedIn, isAdmin, logout } from './api'
import AuthForm from './components/AuthForm'
import NavBar from './components/NavBar'
import Camera from './components/Camera'
import ResultCard from './components/ResultCard'
import History from './components/History'
import Admin from './components/Admin'
import LandingPage from './components/LandingPage'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn)
  const [screen, setScreen] = useState('landing') // 'landing' | 'auth' | 'camera' | 'result' | 'history' | 'admin'
  const [analysisResult, setAnalysisResult] = useState(null)

  const token = localStorage.getItem('token') || ''
  const adminUser = isAdmin()

  function handleGetStarted() {
    if (isLoggedIn()) {
      setScreen('camera')
    } else {
      setScreen('auth')
    }
  }

  function handleLogout() {
    logout()
    setAuthed(false)
    setScreen('landing')
    setAnalysisResult(null)
  }

  function handleCameraClick() {
    setScreen('camera')
    setAnalysisResult(null)
  }

  // Auth is the only full-screen page with no nav
  if (screen === 'auth') {
    return (
      <AuthForm
        onSuccess={() => {
          setAuthed(true)
          setScreen('camera')
        }}
        onHomeClick={() => setScreen('landing')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <NavBar
        isAuthed={authed}
        currentScreen={screen === 'result' ? 'camera' : screen}
        isAdmin={adminUser}
        onHomeClick={() => setScreen('landing')}
        onCameraClick={handleCameraClick}
        onHistoryClick={() => setScreen('history')}
        onAdminClick={() => setScreen('admin')}
        onSignOut={handleLogout}
      />
      <main className="flex-1 flex flex-col">
        {(!authed || screen === 'landing') && (
          <LandingPage onGetStarted={handleGetStarted} isLoggedIn={authed} />
        )}
        {authed && screen === 'camera' && (
          <Camera
            token={token}
            onAnalysisComplete={(result) => {
              setAnalysisResult(result)
              setScreen('result')
            }}
            onSessionExpired={() => {
              setAuthed(false)
              setScreen('landing')
            }}
          />
        )}
        {authed && screen === 'result' && analysisResult && (
          <ResultCard
            result={analysisResult}
            onAnalyzeAgain={handleCameraClick}
          />
        )}
        {authed && screen === 'history' && <History token={token} />}
        {authed && screen === 'admin' && <Admin token={token} />}
      </main>
    </div>
  )
}
