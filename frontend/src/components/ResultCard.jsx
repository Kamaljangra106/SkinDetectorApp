const SEVERITY_COLOR = {
  none: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  mild: 'text-amber-700 bg-amber-50 border-amber-200',
  moderate: 'text-orange-700 bg-orange-50 border-orange-200',
  severe: 'text-red-700 bg-red-50 border-red-200',
}

const FITZ_LABEL = {
  I: 'Very fair',
  II: 'Fair',
  III: 'Medium',
  IV: 'Olive / light brown',
  V: 'Brown',
  VI: 'Dark brown / black',
}

export default function ResultCard({ result, onRetake }) {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
      {result.accuracy_disclaimer && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex gap-2">
          <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
          <p className="text-amber-800 text-sm">Redness detection may be less accurate for deeper skin tones (Fitzpatrick {result.fitzpatrick_estimate}).</p>
        </div>
      )}

      {/* Main result card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-5 py-4">
          <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Analysis Complete</p>
          <p className="text-white text-lg font-semibold capitalize mt-0.5">{result.skin_type} skin</p>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <Row label="Acne severity">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${SEVERITY_COLOR[result.acne_severity] || 'text-slate-700 bg-slate-100 border-slate-200'}`}>
              {result.acne_severity}
            </span>
          </Row>
          <Row label="Skin tone">
            <span className="text-slate-800 text-sm font-medium">
              Type {result.fitzpatrick_estimate} — {FITZ_LABEL[result.fitzpatrick_estimate] || ''}
            </span>
          </Row>
          <Row label="Confidence">
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(result.confidence * 100)}%` }} />
              </div>
              <span className="text-slate-700 text-sm font-semibold">{Math.round(result.confidence * 100)}%</span>
            </div>
          </Row>

          {result.primary_concerns.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Concerns</p>
              <div className="flex flex-wrap gap-1.5">
                {result.primary_concerns.map(c => (
                  <span key={c} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full capitalize border border-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-slate-400 text-xs border-t border-slate-100 pt-3">
            Analyzed in {result.elapsed_ms}ms · Image not stored
          </p>
        </div>
      </div>

      {/* Recommended ingredients */}
      {result.recommendations?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <p className="text-slate-700 text-xs font-semibold uppercase tracking-wide">Recommended Ingredients</p>
          </div>
          <div className="p-5 flex flex-col gap-3.5">
            {result.recommendations.map(r => (
              <div key={r.key} className="flex flex-col gap-0.5">
                <span className="text-slate-900 text-sm font-semibold">{r.name}</span>
                <span className="text-slate-500 text-xs leading-relaxed">{r.benefit}</span>
              </div>
            ))}
            <p className="text-slate-400 text-xs pt-2 border-t border-slate-100">Raw ingredients only · No brand recommendations</p>
          </div>
        </div>
      )}

      {/* AI recommendations */}
      {result.ai_recommendations?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-blue-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
            <p className="text-blue-800 text-xs font-semibold uppercase tracking-wide">Personalised for you</p>
            <span className="text-blue-600 text-xs bg-white border border-blue-200 px-2 py-0.5 rounded-full font-semibold">AI</span>
          </div>
          <div className="p-5 flex flex-col gap-3.5">
            {result.ai_recommendations.map((r, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-slate-900 text-sm font-semibold">{r.name}</span>
                <span className="text-slate-500 text-xs leading-relaxed">{r.benefit}</span>
              </div>
            ))}
            <p className="text-slate-400 text-xs pt-2 border-t border-slate-100">Generated by AI · Always consult a dermatologist</p>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {result.conflicts?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50">
            <p className="text-amber-700 text-xs font-semibold uppercase tracking-wide">Ingredient Conflicts</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {result.conflicts.map((c, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-slate-900 text-sm font-semibold">
                  {c.ingredient_a.replace(/_/g, ' ')} + {c.ingredient_b.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-500 text-xs leading-relaxed">{c.reason}</span>
                <span className="text-amber-700 text-xs font-medium">{c.timing_advice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onRetake}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-sm transition-colors shadow-md"
      >
        Analyze again
      </button>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      {children}
    </div>
  )
}
