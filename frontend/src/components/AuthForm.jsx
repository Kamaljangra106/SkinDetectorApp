import { useState } from 'react'
import { login, register } from '../api'

export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await register(email, password)
        await login(email, password)
      } else {
        await login(email, password)
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-1">SkinDetector</h1>
        <p className="text-zinc-400 text-sm mb-6">
          {mode === 'login' ? 'Sign in to analyze your skin' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-zinc-500 text-sm mt-6 text-center">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-violet-400 hover:text-violet-300"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
