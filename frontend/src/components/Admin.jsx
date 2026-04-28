import { useState, useEffect } from 'react'
import { authHeaders } from '../api'

export default function Admin({ token }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: authHeaders() }),
          fetch('/api/admin/users', { headers: authHeaders() }),
        ])
        if (statsRes.ok) {
          const raw = await statsRes.json()
          // Backend returns skin_type_breakdown as object {combination: 5, normal: 3}
          // Convert to array [{type, count}] and derive top_skin_type
          const breakdown = raw.skin_type_breakdown || {}
          const breakdownArray = Object.entries(breakdown).map(([type, count]) => ({ type, count }))
          const topEntry = breakdownArray.reduce((a, b) => (b.count > a.count ? b : a), { type: 'N/A', count: 0 })
          setStats({
            ...raw,
            skin_type_breakdown: breakdownArray,
            top_skin_type: raw.top_skin_type || (topEntry.count > 0 ? topEntry.type : 'N/A'),
          })
        }
        if (usersRes.ok) {
          setUsers(await usersRes.json())
        }
      } catch {
        console.error('Failed to fetch admin data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const totalBreakdownCount = stats?.skin_type_breakdown.reduce((sum, item) => sum + item.count, 0) || 1

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-teal-500 to-cyan-500',
      bgLight: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Analyses Run',
      value: stats?.total_analyses || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Avg Confidence',
      value: stats?.avg_confidence ? `${Math.round(stats.avg_confidence * 100)}%` : 'N/A',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-sky-500 to-cyan-500',
      bgLight: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
    {
      label: 'Top Skin Type',
      value: stats?.top_skin_type || 'N/A',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-12">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-white/20 text-white rounded-full backdrop-blur-sm">
                Internal
              </span>
            </div>
            <p className="text-teal-100">Monitor system metrics and manage users</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-[3px] border-teal-500/30" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-teal-500 animate-spin" />
            </div>
            <p className="text-slate-500 mt-4">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 hover:shadow-xl transition-shadow">
                  <div className={`w-12 h-12 rounded-xl ${card.bgLight} flex items-center justify-center mb-4`}>
                    <span className={card.iconColor}>{card.icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent mt-1`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Two Column Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Skin Type Breakdown */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <h2 className="font-semibold text-slate-800">Skin Type Breakdown</h2>
                </div>
                <div className="p-6 space-y-5">
                  {stats?.skin_type_breakdown.length > 0 ? (
                    stats.skin_type_breakdown.map((item, idx) => {
                      const pct = (item.count / totalBreakdownCount) * 100
                      const colors = [
                        'from-teal-500 to-cyan-500',
                        'from-emerald-500 to-teal-500',
                        'from-sky-500 to-cyan-500',
                        'from-amber-500 to-orange-500',
                        'from-rose-500 to-pink-500',
                      ]
                      return (
                        <div key={item.type}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700 capitalize">{item.type}</span>
                            <span className="text-sm text-slate-500">
                              {item.count} <span className="text-slate-400">({Math.round(pct)}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500">No data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h2 className="font-semibold text-slate-800">Registered Users</h2>
                  </div>
                  <span className="text-sm text-slate-400">{users.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Analyses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-white">{user.email.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]" title={user.email}>
                                    {user.email}
                                  </span>
                                  {user.is_admin && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full">
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 text-sm font-medium text-teal-700 bg-teal-50 rounded-full">
                              {user.analysis_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">No users found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
