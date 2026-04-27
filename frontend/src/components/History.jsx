import { useEffect, useState } from 'react'
import { authHeaders } from '../api'

const SEVERITY_COLOR = {
  none: 'text-emerald-700 bg-emerald-50',
  mild: 'text-amber-700 bg-amber-50',
  moderate: 'text-orange-700 bg-orange-50',
  severe: 'text-red-700 bg-red-50',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function History({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/history', { headers: authHeaders() })
        if (!res.ok) throw new Error('Failed to load history')
        setItems(await res.json())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-slate-900 font-semibold text-base">Past Analyses</h1>
        </div>
      </header>

      <main className="flex flex-col items-center px-4 py-5 gap-3 flex-1">
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading your history…</p>
          </div>
        )}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full max-w-sm">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">No analyses yet</p>
            <p className="text-slate-400 text-sm">Go back and analyze your skin to get started.</p>
          </div>
        )}

        <div className="w-full max-w-sm flex flex-col gap-3">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-200 transition-colors"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              {/* Summary row */}
              <div className="p-4 flex justify-between items-center gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-slate-900 text-sm font-semibold capitalize">{item.skin_type} skin</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEVERITY_COLOR[item.acne_severity] || 'text-slate-600 bg-slate-100'}`}>
                      {item.acne_severity} acne
                    </span>
                    <span className="text-slate-400 text-xs">{formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-500 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    Type {item.fitzpatrick_estimate}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div className="border-t border-slate-100 px-4 py-4 flex flex-col gap-4 bg-slate-50">
                  {item.primary_concerns.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Concerns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.primary_concerns.map(c => (
                          <span key={c} className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full capitalize">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.recommendations.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Ingredients</p>
                      <div className="flex flex-col gap-2">
                        {item.recommendations.map(r => (
                          <div key={r.key} className="flex flex-col">
                            <span className="text-slate-800 text-xs font-semibold">{r.name}</span>
                            <span className="text-slate-500 text-xs">{r.benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.ai_recommendations?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Personalised</p>
                        <span className="text-blue-600 text-xs bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">AI</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {item.ai_recommendations.map((r, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-slate-800 text-xs font-semibold">{r.name}</span>
                            <span className="text-slate-500 text-xs">{r.benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.conflicts?.length > 0 && (
                    <div>
                      <p className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-2">Conflicts</p>
                      <div className="flex flex-col gap-2">
                        {item.conflicts.map((c, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-slate-800 text-xs font-semibold">
                              {c.ingredient_a.replace(/_/g, ' ')} + {c.ingredient_b.replace(/_/g, ' ')}
                            </span>
                            <span className="text-amber-700 text-xs">{c.timing_advice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-slate-400 text-xs">
                    Confidence {Math.round(item.confidence * 100)}% · {item.elapsed_ms}ms
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
