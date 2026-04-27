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
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">SkinDetector</h1>
          <p className="text-slate-500 text-sm">
            {mode === 'login' ? 'Sign in to analyze your skin' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-slate-100 text-slate-900 placeholder-slate-400 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-slate-100 text-slate-900 placeholder-slate-400 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors mt-1"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-slate-400 text-sm mt-6 text-center">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
