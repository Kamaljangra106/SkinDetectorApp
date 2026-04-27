import { useState } from 'react'
import { isLoggedIn, logout } from './api'
import AuthForm from './components/AuthForm'
import Camera from './components/Camera'
import History from './components/History'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn)
  const [screen, setScreen] = useState('camera') // 'camera' | 'history'

  function handleLogout() {
    logout()
    setAuthed(false)
    setScreen('camera')
  }

  if (!authed) {
    return <AuthForm onSuccess={() => setAuthed(true)} />
  }

  if (screen === 'history') {
    return <History onBack={() => setScreen('camera')} />
  }

  return <Camera onLogout={handleLogout} onHistory={() => setScreen('history')} />
}
