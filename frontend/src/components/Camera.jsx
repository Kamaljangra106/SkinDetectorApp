import { useEffect, useRef, useState } from 'react'
import { analyzeImage, isAdmin } from '../api'
import ResultCard from './ResultCard'

export default function Camera({ onLogout, onHistory, onAdmin }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      } catch {
        setError('Camera access denied. Please allow camera permission and refresh.')
      }
    }
    startCamera()
    return () => stream?.getTracks().forEach(t => t.stop())
  }, [])

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    canvas.toBlob(async blob => {
      if (!blob) { setError('Failed to capture frame. Try again.'); return; }
      setAnalyzing(true)
      setError('')
      try {
        const data = await analyzeImage(blob)
        setResult(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setAnalyzing(false)
      }
    }, 'image/jpeg', 0.92)
  }

  function retake() {
    setResult(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-6 gap-6 bg-slate-50">
      {/* Header */}
      <div className="w-full max-w-sm flex justify-between items-center">
        <h1 className="text-lg font-semibold text-slate-900">SkinDetector</h1>
        <div className="flex gap-4 items-center">
          <button onClick={onHistory} className="text-slate-500 hover:text-slate-800 text-sm transition-colors">
            History
          </button>
          {isAdmin() && (
            <button onClick={onAdmin} className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              Admin
            </button>
          )}
          <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      {!result ? (
        <>
          {/* Camera feed — stays dark for contrast */}
          <div className="relative w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-red-400 text-sm">
                {error}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 rounded-full border-2 border-blue-400/60 border-dashed" />
                </div>
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <p className="text-white text-sm animate-pulse">Analyzing…</p>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-slate-400 text-sm">Position your face in the oval, then tap Analyze</p>

          <button
            onClick={capture}
            disabled={!ready || analyzing}
            className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            {analyzing ? 'Analyzing…' : 'Analyze skin'}
          </button>
        </>
      ) : (
        <ResultCard result={result} onRetake={retake} />
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
