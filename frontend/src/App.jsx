import { useState } from 'react'
import { isLoggedIn, logout } from './api'
import AuthForm from './components/AuthForm'
import Camera from './components/Camera'
import History from './components/History'
import Admin from './components/Admin'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn)
  const [screen, setScreen] = useState('camera') // 'camera' | 'history' | 'admin'

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

  if (screen === 'admin') {
    return <Admin onBack={() => setScreen('camera')} />
  }

  return (
    <Camera
      onLogout={handleLogout}
      onHistory={() => setScreen('history')}
      onAdmin={() => setScreen('admin')}
    />
  )
}
