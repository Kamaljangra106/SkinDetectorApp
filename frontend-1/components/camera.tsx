"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface AnalysisResult {
  id?: string;
  skin_type: string;
  acne_severity: "none" | "mild" | "moderate" | "severe";
  fitzpatrick_type: number;
  fitzpatrick_label: string;
  confidence: number;
  concerns: string[];
  ingredients: Array<{ name: string; benefit: string }>;
  ai_recommendations: Array<{ name: string; benefit: string }>;
  conflicts: Array<{
    pair: [string, string];
    reason: string;
    timing_advice: string;
  }>;
  analysis_time_ms: number;
  created_at?: string;
}

interface CameraProps {
  token: string;
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export function Camera({ token, onAnalysisComplete }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch {
      setCameraError(
        "Camera access denied. Please enable camera permissions to continue."
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image to match video display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsAnalyzing(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Analysis failed");
        }

        const result: AnalysisResult = await res.json();
        onAnalysisComplete(result);
      } catch {
        setCameraError("Analysis failed. Please try again.");
      } finally {
        setIsAnalyzing(false);
      }
    }, "image/jpeg");
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-8 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Camera Feed */}
      <div className="flex-1 flex flex-col">
        <div
          className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/50"
          style={{ aspectRatio: "3/4", maxHeight: "75vh" }}
        >
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-sm border border-white/10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-white/90 text-base leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={startCamera}
                  className="mt-6 px-6 py-2.5 bg-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/30 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Gradient overlays for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />

              {/* Oval Face Guide */}
              <div className="absolute inset-8 flex items-center justify-center pointer-events-none">
                <div
                  className="border-[3px] border-dashed border-teal-400/60 dark:border-teal-300/60 rounded-full shadow-[0_0_40px_rgba(20,184,166,0.15)] max-h-full max-w-full"
                  style={{ width: "75%", height: "85%" }}
                />
              </div>

              {/* Corner guides */}
              <div className="absolute top-6 left-6 w-8 h-8 border-t-[3px] border-l-[3px] border-white/40 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-[3px] border-r-[3px] border-white/40 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-[3px] border-l-[3px] border-white/40 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-[3px] border-r-[3px] border-white/40 rounded-br-lg" />

              {/* Camera ready indicator */}
              {cameraReady && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/90 font-medium">
                    Camera active
                  </span>
                </div>
              )}

              {/* Analyzing Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-[3px] border-teal-500/30" />
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-transparent border-t-teal-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-teal-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white text-lg font-medium mt-6">
                    Analyzing your skin...
                  </p>
                  <p className="text-white/60 text-sm mt-2">
                    This may take a few seconds
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Right Panel */}
      <div className="lg:w-96 flex flex-col">
        <div className="bg-card rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-border p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              AI Skin Analysis
            </h2>
          </div>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Position your face inside the oval guide for the best results. Make
            sure you have good lighting.
          </p>

          <button
            onClick={captureAndAnalyze}
            disabled={!cameraReady || isAnalyzing}
            className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 disabled:shadow-none"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Start Analysis
              </span>
            )}
          </button>

          <div className="mt-8 pt-6 border-t border-border space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What we analyze
            </h3>
            {[
              { label: "Skin type", desc: "Oily, dry, combination, or normal" },
              { label: "Acne severity", desc: "None to severe assessment" },
              { label: "Skin tone", desc: "Fitzpatrick scale classification" },
              {
                label: "Recommendations",
                desc: "Personalized ingredient suggestions",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-teal-600 dark:text-teal-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 px-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Images never stored</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
