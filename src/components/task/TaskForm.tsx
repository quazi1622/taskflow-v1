"use client";

import { useState, FormEvent, useEffect } from "react";
import { Task } from "@/lib/types";

interface Props {
  assignedTo: string;
  assignedToInitial: string;
  existingTask?: Task | null;
  error?: string | null;
  onSubmit: (description: string, deadline: string | null) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({
  assignedToInitial,
  existingTask,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [description, setDescription] = useState(existingTask?.description ?? "");
  const [deadline, setDeadline] = useState(
    existingTask?.deadline ? existingTask.deadline.slice(0, 16) : ""
  );
  const [loading, setLoading] = useState(false);
  const isEdit = !!existingTask;

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    try {
      await onSubmit(description.trim(), deadline || null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-nfs-black/80 backdrop-blur-sm" />

      <div
        className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 slide-up"
        style={{
          border: "1px solid rgba(0,212,255,0.3)",
          boxShadow: "0 0 40px rgba(0,212,255,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-xl font-black uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                color: "#00D4FF",
                textShadow: "0 0 12px rgba(0,212,255,0.4)",
              }}
            >
              {isEdit ? "Edit Task" : "Assign Task"}
            </h2>
            <p
              className="text-xs tracking-widest uppercase mt-0.5"
              style={{ color: "#6b6b8a", fontFamily: "var(--font-barlow-condensed)" }}
            >
              → {assignedToInitial}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#6b6b8a", background: "rgba(42,42,61,0.5)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label
              className="block text-xs font-semibold tracking-widest uppercase mb-2"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                color: "#6b6b8a",
              }}
            >
              Description <span style={{ color: "#FF6B00" }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the task... URLs are supported."
              className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none transition-all duration-200"
              style={{
                background: "rgba(26,26,40,0.8)",
                border: "1px solid #2a2a3d",
                color: "#e0e0f0",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#00D4FF";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(0,212,255,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a3d";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Deadline */}
          <div>
            <label
              className="block text-xs font-semibold tracking-widest uppercase mb-2"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                color: "#6b6b8a",
              }}
            >
              Deadline <span style={{ color: "#6b6b8a" }}>(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(26,26,40,0.8)",
                border: "1px solid #2a2a3d",
                color: deadline ? "#e0e0f0" : "#6b6b8a",
                colorScheme: "dark",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#00D4FF";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(0,212,255,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a3d";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Edit count warning */}
          {isEdit && existingTask && (
            <p
              className="text-xs tracking-wide"
              style={{
                color:
                  existingTask.edit_count >= 1 ? "#FF6B00" : "#6b6b8a",
                fontFamily: "var(--font-barlow-condensed)",
              }}
            >
              {existingTask.edit_count === 0
                ? "Edit 1 of 2 remaining"
                : existingTask.edit_count === 1
                ? "⚠ Last edit remaining"
                : "✕ No edits remaining"}
            </p>
          )}

          {/* Save error */}
          {error && (
            <p
              className="text-xs font-bold tracking-wide text-center py-1"
              style={{ color: "#FF2D55", fontFamily: "var(--font-barlow-condensed)" }}
            >
              Save failed: {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-3 text-sm font-bold uppercase tracking-widest transition-colors"
              style={{
                background: "rgba(42,42,61,0.6)",
                color: "#6b6b8a",
                border: "1px solid #2a2a3d",
                fontFamily: "var(--font-barlow-condensed)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim() || (isEdit && existingTask!.edit_count >= 2)}
              className="flex-1 rounded-lg py-3 text-sm font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #FF6B00, #ff8c33)",
                color: "#0a0a0f",
                fontFamily: "var(--font-barlow-condensed)",
                boxShadow: "0 0 20px rgba(255,107,0,0.3)",
              }}
            >
              {loading ? "..." : isEdit ? "Save" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
