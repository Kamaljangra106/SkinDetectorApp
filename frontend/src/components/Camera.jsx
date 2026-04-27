import { useEffect, useRef, useState } from 'react'
import { analyzeImage } from '../api'
import ResultCard from './ResultCard'

export default function Camera({ onLogout, onHistory }) {
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
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-6 gap-6">
      {/* Header */}
      <div className="w-full max-w-sm flex justify-between items-center">
        <h1 className="text-lg font-semibold text-white">SkinDetector</h1>
        <div className="flex gap-4">
          <button onClick={onHistory} className="text-zinc-400 hover:text-white text-sm transition-colors">
            History
          </button>
          <button onClick={onLogout} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      {!result ? (
        <>
          {/* Camera feed */}
          <div className="relative w-full max-w-sm aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden">
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
                  <div className="w-48 h-60 rounded-full border-2 border-violet-400/60 border-dashed" />
                </div>
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <p className="text-white text-sm animate-pulse">Analyzing…</p>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-zinc-500 text-sm">Position your face in the oval, then tap Analyze</p>

          <button
            onClick={capture}
            disabled={!ready || analyzing}
            className="w-full max-w-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-3 text-sm transition-colors"
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
