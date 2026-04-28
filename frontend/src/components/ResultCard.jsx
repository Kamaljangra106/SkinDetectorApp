const SEVERITY_COLORS = {
  none: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  mild: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  moderate: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  severe: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
}

export default function ResultCard({ result, onAnalyzeAgain }) {
  const severityStyle = SEVERITY_COLORS[result.acne_severity] || SEVERITY_COLORS.none

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Analysis Complete</h1>
        <p className="text-slate-500">Here are your personalized skin analysis results</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Skin Type Card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-6">
              <p className="text-xs font-semibold text-teal-100 uppercase tracking-wider mb-1">Your Skin Type</p>
              <h2 className="text-3xl font-bold text-white">{result.skin_type}</h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Acne Severity</span>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${severityStyle.text} ${severityStyle.bg} ${severityStyle.border}`}>
                  {result.acne_severity.charAt(0).toUpperCase() + result.acne_severity.slice(1)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Skin Tone</span>
                <span className="text-sm font-semibold text-slate-800">{result.fitzpatrick_type}</span>
              </div>

              {result.fitzpatrick_label && result.fitzpatrick_label !== result.fitzpatrick_type && (
                <p className="text-xs text-slate-400 text-right">{result.fitzpatrick_label}</p>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Confidence</span>
                  <span className="text-sm font-bold text-teal-600">{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Concerns */}
          {result.concerns && result.concerns.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Detected Concerns</h3>
              <div className="flex flex-wrap gap-2">
                {result.concerns.map((concern) => (
                  <span key={concern} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-full">
                    {concern}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onAnalyzeAgain}
            className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Analyze Again
            </span>
          </button>

          <p className="text-xs text-center text-slate-400">Analyzed in {result.analysis_time_ms}ms</p>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Recommended Ingredients */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800">Recommended Ingredients</h3>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {(result.ingredients || []).map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <p className="text-sm text-slate-500 mt-1">{item.benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          {result.ai_recommendations && result.ai_recommendations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-teal-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center gap-3">
                <div className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-md">AI</div>
                <h3 className="font-semibold text-slate-800">Personalized Recommendations</h3>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.ai_recommendations.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-teal-50/50 to-cyan-50/50 border border-teal-100">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <p className="text-sm text-slate-500 mt-1">{item.benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ingredient Conflicts */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-amber-100 overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800">Ingredient Conflicts</h3>
            </div>
            <div className="p-6">
              {(!result.conflicts || result.conflicts.length === 0) ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-emerald-800">No conflicts detected</p>
                    <p className="text-sm text-emerald-600">All recommended ingredients are safe to use together</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                      <p className="font-semibold text-slate-800">{conflict.pair[0]} + {conflict.pair[1]}</p>
                      <p className="text-sm text-slate-600 mt-1">{conflict.reason}</p>
                      <div className="flex items-center gap-2 mt-3 text-sm text-amber-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{conflict.timing_advice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
