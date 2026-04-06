"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const { login } = useAuth();
  const [initial, setInitial] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Block ESC key
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    // Safety check
    if (!initial.trim() || !password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      await login(initial.trim().toUpperCase(), password);
    } catch (err) {
      triggerDenied(err instanceof Error ? err.message.toUpperCase() : "ACCESS DENIED");
    } finally {
      setLoading(false);
    }
  }

  function triggerDenied(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Background Layer: Speed Lines */}
      <div className="absolute inset-0 speed-lines opacity-40 pointer-events-none" />

      {/* Background Layer: Dark Overlay */}
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />

      {/* Background Layer: Radial spotlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,107,0,0.1) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* Foreground: Auth panel */}
      <div
        ref={panelRef}
        className={`relative glass-panel rounded-2xl p-8 w-full max-w-sm mx-4 slide-up z-10 ${
          shake ? "shake" : ""
        }`}
        style={{
          border: "1px solid rgba(255,107,0,0.3)",
          boxShadow: "0 0 40px rgba(255,107,0,0.1), 0 0 80px rgba(255,107,0,0.05)",
          pointerEvents: "auto", // Ensure the panel itself allows clicks
        }}
      >
        {/* Logo / Title */}
        <div className="mb-8 text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 mb-2">
            <div
              className="w-2 h-8 rounded-sm"
              style={{ background: "#FF6B00", boxShadow: "0 0 8px #FF6B00" }}
            />
            <h1
              className="text-4xl font-black tracking-widest uppercase"
              style={{
                color: "#FF6B00",
                textShadow: "0 0 20px rgba(255,107,0,0.5)",
              }}
            >
              TASKFLOW
            </h1>
            <div
              className="w-2 h-8 rounded-sm"
              style={{ background: "#00D4FF", boxShadow: "0 0 8px #00D4FF" }}
            />
          </div>
          <p className="text-xs tracking-[0.3em] uppercase text-[#6b6b8a]">
            Identify yourself
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-20">
          {/* Initial field */}
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2 text-[#6b6b8a]">
              Initial
            </label>
            <input
              type="text"
              maxLength={4}
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              className="w-full rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-widest outline-none transition-all duration-200"
              style={{
                background: "rgba(26,26,40,0.8)",
                border: "1px solid #2a2a3d",
                color: "#e0e0f0",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00D4FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a3d")}
              placeholder="e.g. JD"
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2 text-[#6b6b8a]">
              Access Code
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(26,26,40,0.8)",
                border: "1px solid #2a2a3d",
                color: "#e0e0f0",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00D4FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a3d")}
              placeholder="••••••••"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs font-bold tracking-widest uppercase text-center py-1 text-[#FF2D55] animate-pulse">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !initial.trim() || !password.trim()}
            className="w-full rounded-lg py-3 mt-2 text-sm font-black uppercase tracking-widest transition-all duration-200 
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            style={{
              background: loading
                ? "rgba(255,107,0,0.4)"
                : "linear-gradient(135deg, #FF6B00, #ff8c33)",
              color: "#0a0a0f",
              boxShadow: loading ? "none" : "0 0 20px rgba(255,107,0,0.4)",
              position: "relative",
              zIndex: 30, // Ensure button is at the very top
            }}
          >
            {loading ? "VERIFYING..." : "ENTER"}
          </button>
        </form>
      </div>
    </div>
  );
}