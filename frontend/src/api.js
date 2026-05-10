const BASE = '/api'

export function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function register(email, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Registration failed')
  }
  return res.json()
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Login failed')
  }
  const data = await res.json()
  localStorage.setItem('token', data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem('token')
}

export function isLoggedIn() {
  const token = localStorage.getItem('token')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('token')
      return false
    }
    return true
  } catch {
    return false
  }
}

export function isAdmin() {
  const token = localStorage.getItem('token')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_admin === true
  } catch {
    return false
  }
}

export async function analyzeImage(blob) {
  const form = new FormData()
  form.append('file', blob, 'capture.jpg')
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (res.status === 401) {
    logout()
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Analysis failed')
  }
  return res.json()
}
