const SEVERITY_COLOR = {
  none: 'text-green-400',
  mild: 'text-yellow-400',
  moderate: 'text-orange-400',
  severe: 'text-red-400',
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
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-xl px-4 py-3 text-yellow-300 text-sm">
          Note: Redness detection may be less accurate for deeper skin tones (Fitzpatrick {result.fitzpatrick_estimate}).
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-4">
        <Row label="Skin type" value={result.skin_type} className="capitalize" />
        <Row
          label="Acne severity"
          value={result.acne_severity}
          className={`capitalize ${SEVERITY_COLOR[result.acne_severity] || 'text-white'}`}
        />
        <Row
          label="Skin tone"
          value={`Type ${result.fitzpatrick_estimate} — ${FITZ_LABEL[result.fitzpatrick_estimate] || ''}`}
        />
        <Row
          label="Confidence"
          value={`${Math.round(result.confidence * 100)}%`}
        />

        {result.primary_concerns.length > 0 && (
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">Concerns</p>
            <div className="flex flex-wrap gap-2">
              {result.primary_concerns.map(c => (
                <span key={c} className="bg-zinc-800 text-zinc-200 text-xs px-3 py-1 rounded-full capitalize">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-zinc-600 text-xs">Analyzed in {result.elapsed_ms}ms · Image not stored</p>
      </div>

      {result.recommendations?.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-6 flex flex-col gap-3">
          <p className="text-zinc-400 text-xs uppercase tracking-wide">Recommended ingredients</p>
          {result.recommendations.map(r => (
            <div key={r.key} className="flex flex-col gap-0.5">
              <span className="text-white text-sm font-medium">{r.name}</span>
              <span className="text-zinc-400 text-xs">{r.benefit}</span>
            </div>
          ))}
          <p className="text-zinc-600 text-xs mt-1">Raw ingredients only · No brand recommendations</p>
        </div>
      )}

      <button
        onClick={onRetake}
        className="bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg py-3 text-sm transition-colors"
      >
        Analyze again
      </button>
    </div>
  )
}

function Row({ label, value, className = 'text-white capitalize' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${className}`}>{value}</span>
    </div>
  )
}
