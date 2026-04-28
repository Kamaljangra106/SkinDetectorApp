"use client";

import { useState, useEffect } from "react";
import type { AnalysisResult } from "./camera";

const SEVERITY_COLORS = {
  none: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  mild: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  moderate: {
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  severe: {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

interface HistoryProps {
  token: string;
}

export function History({ token }: HistoryProps) {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalyses(data);
        }
      } catch {
        console.error("Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Analysis History</h1>
          <p className="text-teal-100">
            Review your past skin analyses and track your progress over time
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-[3px] border-teal-500/30" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-teal-500 animate-spin" />
            </div>
            <p className="text-slate-500 mt-4">Loading your history...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              No analyses yet
            </h2>
            <p className="text-slate-500 max-w-sm">
              Start your first skin analysis to see your history here. Track
              your skin health journey over time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis, idx) => {
              const severity = SEVERITY_COLORS[analysis.acne_severity];
              const isExpanded = expandedId === (analysis.id || String(idx));

              return (
                <div
                  key={analysis.id || idx}
                  className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all hover:shadow-xl"
                >
                  {/* Summary Row */}
                  <button
                    onClick={() =>
                      setExpandedId(
                        isExpanded ? null : analysis.id || String(idx)
                      )
                    }
                    className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Skin Type Badge */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">
                        {analysis.skin_type.charAt(0)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">
                          {analysis.skin_type}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${severity.text} ${severity.bg} ${severity.border}`}
                        >
                          {analysis.acne_severity.charAt(0).toUpperCase() +
                            analysis.acne_severity.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>{formatDate(analysis.created_at)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Type {analysis.fitzpatrick_type}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-teal-600 font-medium">
                          {Math.round(analysis.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-100 bg-slate-50/30">
                      <div className="grid gap-6 lg:grid-cols-2 pt-6">
                        {/* Concerns */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Concerns
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.concerns.length > 0 ? (
                              analysis.concerns.map((concern) => (
                                <span
                                  key={concern}
                                  className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white rounded-full border border-slate-200"
                                >
                                  {concern}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">
                                None detected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Recommended Ingredients
                          </h4>
                          <div className="space-y-2">
                            {analysis.ingredients.map((item, i) => (
                              <div
                                key={i}
                                className="text-sm text-slate-700 flex items-start gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                                <span>
                                  <span className="font-medium">
                                    {item.name}
                                  </span>{" "}
                                  - {item.benefit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      <div className="mt-6">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded">
                            AI
                          </span>
                          Personalized Recommendations
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {analysis.ai_recommendations.map((item, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-gradient-to-br from-teal-50/50 to-cyan-50/50 border border-teal-100 text-sm"
                            >
                              <span className="font-medium text-slate-800">
                                {item.name}
                              </span>
                              <span className="text-slate-500">
                                {" "}
                                - {item.benefit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conflicts */}
                      <div className="mt-6">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                          Ingredient Conflicts
                        </h4>
                        {analysis.conflicts.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-emerald-700 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            No conflicts detected
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {analysis.conflicts.map((conflict, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm"
                              >
                                <span className="font-medium text-slate-800">
                                  {conflict.pair[0]} + {conflict.pair[1]}
                                </span>
                                <span className="text-slate-600">
                                  {" "}
                                  - {conflict.reason}
                                </span>
                                <span className="text-amber-700 font-medium">
                                  {" "}
                                  ({conflict.timing_advice})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                        <span>Analysis ID: {analysis.id || `#${idx + 1}`}</span>
                        <span>{analysis.analysis_time_ms}ms</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
