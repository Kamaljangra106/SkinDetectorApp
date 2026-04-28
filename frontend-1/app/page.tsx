"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthForm } from "@/components/auth-form";
import { NavBar } from "@/components/nav-bar";
import { Camera, type AnalysisResult } from "@/components/camera";
import { ResultCard } from "@/components/result-card";
import { History } from "@/components/history";
import { Admin } from "@/components/admin";

type Screen = "auth" | "camera" | "result" | "history" | "admin";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setIsAdmin(payload.is_admin || false);
          setScreen("camera");
        } else {
          localStorage.removeItem("token");
        }
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, []);

  const handleAuthSuccess = useCallback((newToken: string, admin: boolean) => {
    setToken(newToken);
    setIsAdmin(admin);
    setScreen("camera");
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAdmin(false);
    setAnalysisResult(null);
    setScreen("auth");
  }, []);

  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
    setScreen("result");
  }, []);

  const handleAnalyzeAgain = useCallback(() => {
    setAnalysisResult(null);
    setScreen("camera");
  }, []);

  // Auth screen
  if (screen === "auth") {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Get current nav screen for highlighting
  const navScreen =
    screen === "result" ? "camera" : (screen as "camera" | "history" | "admin");

  // Main app layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30 flex flex-col">
      <NavBar
        currentScreen={navScreen}
        isAdmin={isAdmin}
        onCameraClick={() => {
          setAnalysisResult(null);
          setScreen("camera");
        }}
        onHistoryClick={() => setScreen("history")}
        onAdminClick={() => setScreen("admin")}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex">
        {screen === "result" && analysisResult ? (
          <ResultCard
            result={analysisResult}
            onAnalyzeAgain={handleAnalyzeAgain}
          />
        ) : screen === "history" && token ? (
          <History token={token} />
        ) : screen === "admin" && token && isAdmin ? (
          <Admin token={token} />
        ) : (
          token && (
            <Camera token={token} onAnalysisComplete={handleAnalysisComplete} />
          )
        )}
      </main>
    </div>
  );
}
