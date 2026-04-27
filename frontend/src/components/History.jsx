import { useEffect, useState } from 'react'
import { authHeaders } from '../api'

const SEVERITY_COLOR = {
  none: 'text-emerald-600',
  mild: 'text-amber-600',
  moderate: 'text-orange-600',
  severe: 'text-red-600',
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
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-4 bg-slate-50">
      <div className="w-full max-w-sm flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Past analyses</h1>
      </div>

      {loading && <p className="text-slate-400 text-sm mt-8">Loading…</p>}
      {error && <p className="text-red-500 text-sm mt-8">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-slate-400 text-sm mt-8">No analyses yet. Go analyze your skin!</p>
      )}

      <div className="w-full max-w-sm flex flex-col gap-3">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 cursor-pointer shadow-sm border border-slate-100 hover:border-slate-200 transition-colors"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            {/* Summary row */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-slate-900 text-sm font-medium capitalize">
                  {item.skin_type} skin · <span className={SEVERITY_COLOR[item.acne_severity]}>{item.acne_severity} acne</span>
                </span>
                <span className="text-slate-400 text-xs">{formatDate(item.created_at)}</span>
              </div>
              <span className="text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-full">Type {item.fitzpatrick_estimate}</span>
            </div>

            {/* Expanded detail */}
            {expanded === item.id && (
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
                {item.primary_concerns.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.primary_concerns.map(c => (
                      <span key={c} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full capitalize">{c}</span>
                    ))}
                  </div>
                )}

                {item.recommendations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Ingredients</p>
                    {item.recommendations.map(r => (
                      <div key={r.key} className="flex flex-col">
                        <span className="text-slate-900 text-xs font-medium">{r.name}</span>
                        <span className="text-slate-500 text-xs">{r.benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.ai_recommendations?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Personalised</p>
                      <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full font-medium">AI</span>
                    </div>
                    {item.ai_recommendations.map((r, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-slate-900 text-xs font-medium">{r.name}</span>
                        <span className="text-slate-500 text-xs">{r.benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.conflicts?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-amber-600 text-xs uppercase tracking-wide font-medium">Conflicts</p>
                    {item.conflicts.map((c, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-slate-900 text-xs font-medium">
                          {c.ingredient_a.replace(/_/g, ' ')} + {c.ingredient_b.replace(/_/g, ' ')}
                        </span>
                        <span className="text-amber-700 text-xs">{c.timing_advice}</span>
                      </div>
                    ))}
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
    </div>
  )
}
