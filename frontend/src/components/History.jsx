import { useEffect, useState } from 'react'
import { authHeaders } from '../api'

const SEVERITY_COLOR = {
  none: 'text-green-400',
  mild: 'text-yellow-400',
  moderate: 'text-orange-400',
  severe: 'text-red-400',
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
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-4">
      <div className="w-full max-w-sm flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-white">Past analyses</h1>
      </div>

      {loading && <p className="text-zinc-500 text-sm mt-8">Loading…</p>}
      {error && <p className="text-red-400 text-sm mt-8">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-zinc-500 text-sm mt-8">No analyses yet. Go analyze your skin!</p>
      )}

      <div className="w-full max-w-sm flex flex-col gap-3">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-zinc-900 rounded-2xl p-4 cursor-pointer"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            {/* Summary row */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-white text-sm font-medium capitalize">
                  {item.skin_type} skin · <span className={SEVERITY_COLOR[item.acne_severity]}>{item.acne_severity} acne</span>
                </span>
                <span className="text-zinc-500 text-xs">{formatDate(item.created_at)}</span>
              </div>
              <span className="text-zinc-400 text-xs">Type {item.fitzpatrick_estimate}</span>
            </div>

            {/* Expanded detail */}
            {expanded === item.id && (
              <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800 pt-4">
                {item.primary_concerns.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.primary_concerns.map(c => (
                      <span key={c} className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-full capitalize">{c}</span>
                    ))}
                  </div>
                )}

                {item.recommendations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-zinc-500 text-xs uppercase tracking-wide">Ingredients</p>
                    {item.recommendations.map(r => (
                      <div key={r.key} className="flex flex-col">
                        <span className="text-white text-xs font-medium">{r.name}</span>
                        <span className="text-zinc-500 text-xs">{r.benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-zinc-600 text-xs">
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
