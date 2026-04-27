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
      if (!blob) { setError('Failed to capture frame. Try again.'); return }
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-sm mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-slate-900 font-semibold text-sm">SkinDetector</span>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={onHistory} className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
              History
            </button>
            {isAdmin() && (
              <button onClick={onAdmin} className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors">
                Admin
              </button>
            )}
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center px-4 py-6 gap-5 flex-1">
        {!result ? (
          <>
            <div className="w-full max-w-sm text-center">
              <h2 className="text-xl font-semibold text-slate-900">Skin Analysis</h2>
              <p className="text-slate-500 text-sm mt-1">Position your face in the oval guide and tap Analyze</p>
            </div>

            {/* Camera feed */}
            <div className="relative w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-300">
              {error ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                    <p className="text-white text-sm">{error}</p>
                  </div>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-60 rounded-full border-2 border-blue-400/70 border-dashed" />
                  </div>
                  {analyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white text-sm font-medium">Analyzing your skin…</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={capture}
              disabled={!ready || analyzing}
              className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 text-sm transition-colors shadow-md"
            >
              {analyzing ? 'Analyzing…' : 'Analyze skin'}
            </button>

            <p className="text-slate-400 text-xs text-center">Images are never stored · Analysis powered by Groq AI</p>
          </>
        ) : (
          <ResultCard result={result} onRetake={retake} />
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
