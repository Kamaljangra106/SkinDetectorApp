import { useEffect, useState } from 'react'
import { authHeaders } from '../api'

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-violet-50 border-violet-200 text-violet-700',
  }
  return (
    <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200 flex flex-col gap-1">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-violet-600'}`}>
        {value}
      </p>
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-slate-900 font-semibold text-base">Admin Dashboard</h1>
          <span className="text-blue-600 text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold ml-1">
            Internal
          </span>
        </div>
      </header>

      <main className="flex flex-col items-center px-4 py-6 gap-6 flex-1">
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading dashboard…</p>
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full max-w-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* Stats grid */}
            <div className="w-full max-w-2xl grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total users" value={stats.total_users} color="blue" />
              <StatCard label="Analyses run" value={stats.total_analyses} color="green" />
              <StatCard
                label="Avg confidence"
                value={`${Math.round(stats.avg_confidence * 100)}%`}
                color="purple"
              />
              <StatCard
                label="Top skin type"
                value={topSkinType ? topSkinType[0] : '—'}
                sub={topSkinType ? `${topSkinType[1]} scans` : null}
                color="amber"
              />
            </div>

            {/* Skin type breakdown */}
            {Object.keys(stats.skin_type_breakdown).length > 0 && (
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                  <p className="text-slate-700 text-xs font-semibold uppercase tracking-wide">Skin Type Breakdown</p>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {Object.entries(stats.skin_type_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const pct = stats.total_analyses > 0
                        ? Math.round((count / stats.total_analyses) * 100)
                        : 0
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-slate-600 text-sm capitalize font-medium w-24 shrink-0">{type}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-500 text-xs w-16 text-right shrink-0">{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Users table */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-slate-700 text-xs font-semibold uppercase tracking-wide">Registered Users</p>
                <span className="text-slate-500 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {users.length} total
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-3 px-5 py-2.5 border-b border-slate-100 bg-slate-50">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Email</span>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Joined</span>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide text-right">Analyses</span>
              </div>

              <div className="divide-y divide-slate-50">
                {users.length === 0 && (
                  <p className="text-slate-400 text-sm px-5 py-4">No users yet.</p>
                )}
                {users.map(u => (
                  <div key={u.id} className="grid grid-cols-3 items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-slate-800 text-sm truncate">{u.email}</span>
                      {u.is_admin && (
                        <span className="text-blue-600 text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-sm">{formatDate(u.created_at)}</span>
                    <span className="text-slate-600 text-sm font-semibold text-right">{u.analysis_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
