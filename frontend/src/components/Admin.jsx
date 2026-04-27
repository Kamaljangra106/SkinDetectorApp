import { useEffect, useState } from 'react'
import { authHeaders } from '../api'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-1">
      <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">{label}</p>
      <p className="text-slate-900 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-slate-400 text-xs">{sub}</p>}
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function Admin({ onBack }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: authHeaders() }),
          fetch('/api/admin/users', { headers: authHeaders() }),
        ])
        if (!statsRes.ok || !usersRes.ok) throw new Error('Failed to load admin data')
        const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()])
        setStats(statsData)
        setUsers(usersData)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const topSkinType = stats
    ? Object.entries(stats.skin_type_breakdown).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-6 bg-slate-50">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Admin</h1>
        <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full font-medium ml-1">Dashboard</span>
      </div>

      {loading && <p className="text-slate-400 text-sm mt-8">Loading…</p>}
      {error && <p className="text-red-500 text-sm mt-8">{error}</p>}

      {!loading && !error && stats && (
        <>
          {/* Stats cards */}
          <div className="w-full max-w-2xl grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total users"
              value={stats.total_users}
            />
            <StatCard
              label="Analyses run"
              value={stats.total_analyses}
            />
            <StatCard
              label="Avg confidence"
              value={`${Math.round(stats.avg_confidence * 100)}%`}
            />
            <StatCard
              label="Top skin type"
              value={topSkinType ? topSkinType[0] : '—'}
              sub={topSkinType ? `${topSkinType[1]} analyses` : null}
            />
          </div>

          {/* Skin type breakdown */}
          {Object.keys(stats.skin_type_breakdown).length > 0 && (
            <div className="w-full max-w-2xl bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-4">Skin type breakdown</p>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.skin_type_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const pct = stats.total_analyses > 0
                      ? Math.round((count / stats.total_analyses) * 100)
                      : 0
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-slate-600 text-sm capitalize w-24 shrink-0">{type}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-xs w-12 text-right">{count} ({pct}%)</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">
                Registered users <span className="text-slate-300 font-normal">({users.length})</span>
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {users.length === 0 && (
                <p className="text-slate-400 text-sm px-5 py-4">No users yet.</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-slate-900 text-sm truncate">{u.email}</span>
                    <span className="text-slate-400 text-xs">Joined {formatDate(u.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {u.is_admin && (
                      <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full font-medium">Admin</span>
                    )}
                    <span className="text-slate-400 text-xs text-right">
                      {u.analysis_count} {u.analysis_count === 1 ? 'analysis' : 'analyses'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
