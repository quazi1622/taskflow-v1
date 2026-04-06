"use client";

import { useState, useCallback } from "react";
import { Task, TeamMember, UserRole, TaskStatus } from "@/lib/types";
import MemberColumn from "./MemberColumn";
import TaskForm from "@/components/task/TaskForm";

interface Props {
  members: TeamMember[];
  viewerRole: UserRole;
  viewerId: string;
  viewerInitial: string;
  canDelete: boolean;
  onLogout: () => void;
  onAssignTask: (memberId: string, description: string, deadline: string | null) => Promise<void>;
  onEditTask: (task: Task, description: string, deadline: string | null) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onMoveTask: (taskId: string, toMemberId: string) => Promise<void>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export default function KanbanBoard({
  members,
  viewerRole,
  viewerId,
  viewerInitial,
  canDelete,
  onLogout,
  onAssignTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onStatusChange,
}: Props) {
  // ─── States ───
  const [formTarget, setFormTarget] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusUpdateTask, setStatusUpdateTask] = useState<Task | null>(null); // For Task-2 Modal
  const [formError, setFormError] = useState<string | null>(null);

  const allMembers = members.map((m) => ({ id: m.id, initial: m.initial }));

  // ─── Handlers ───
  const handleAddTask = useCallback((memberId: string) => {
    setEditingTask(null);
    setFormTarget(memberId);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setFormTarget(null);
    setEditingTask(task);
  }, []);

  const handleFormSubmit = useCallback(
    async (description: string, deadline: string | null) => {
      setFormError(null);
      try {
        if (editingTask) {
          await onEditTask(editingTask, description, deadline);
          setEditingTask(null);
        } else if (formTarget) {
          await onAssignTask(formTarget, description, deadline);
          setFormTarget(null);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed. Check console for details.");
      }
    },
    [editingTask, formTarget, onEditTask, onAssignTask]
  );

  const formMember = formTarget
    ? members.find((m) => m.id === formTarget)
    : editingTask
    ? members.find((m) => m.id === editingTask.assigned_to)
    : null;

  return (
    <div
      className="min-h-screen flex flex-col speed-lines"
      style={{ background: "#0a0a0f" }}
    >
      {/* ─── Header ─── */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0 relative z-[100]"
        style={{ borderBottom: "1px solid #1a1a28", background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-1.5 h-6 rounded-sm"
            style={{ background: "#FF6B00", boxShadow: "0 0 6px #FF6B00" }}
          />
          <h1
            className="text-2xl font-black uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              color: "#FF6B00",
              textShadow: "0 0 16px rgba(255,107,0,0.4)",
            }}
          >
            TASKFLOW
          </h1>
          <div
            className="w-1.5 h-6 rounded-sm"
            style={{ background: "#00D4FF", boxShadow: "0 0 6px #00D4FF" }}
          />
        </div>

        <div className="flex items-center gap-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              background:
                viewerRole === "boss" || viewerRole === "team-lead"
                  ? "rgba(255,107,0,0.15)"
                  : "rgba(0,212,255,0.15)",
              border:
                viewerRole === "boss" || viewerRole === "team-lead"
                  ? "1px solid rgba(255,107,0,0.4)"
                  : "1px solid rgba(0,212,255,0.4)",
              color: viewerRole === "boss" || viewerRole === "team-lead" ? "#FF6B00" : "#00D4FF",
              fontFamily: "var(--font-barlow-condensed)",
            }}
          >
            {viewerRole === "team-lead" ? "⚡ Team Lead" : viewerRole === "boss" ? "⚡ Boss" : `● ${viewerInitial}`}
          </span>

          <button
            onClick={onLogout}
            className="text-xs font-semibold uppercase tracking-widest transition-colors px-3 py-1 rounded-lg"
            style={{
              color: "#6b6b8a",
              fontFamily: "var(--font-barlow-condensed)",
              border: "1px solid #2a2a3d",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FF2D55";
              e.currentTarget.style.borderColor = "rgba(255,45,85,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#6b6b8a";
              e.currentTarget.style.borderColor = "#2a2a3d";
            }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* ─── Main Board ─── */}
      <main className="flex-1 overflow-x-auto p-6 relative">
        <div
          className="fixed pointer-events-none"
          style={{
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "800px",
            background: "radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 60%)",
            zIndex: 0,
          }}
        />

        <div className="flex gap-4 pb-4 relative z-10" style={{ width: "max-content" }}>
          {members.map((member) => (
            <MemberColumn
              key={member.id}
              memberId={member.id}
              memberInitial={member.initial}
              tasks={member.tasks}
              viewerRole={viewerRole}
              viewerId={viewerId}
              canDelete={canDelete}
              allMembers={allMembers}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={onDeleteTask}
              onMoveTask={onMoveTask}
              // Task-2: Open Status Modal for members/boss, lead logic handled in page.tsx
              onStatusChange={(taskId) => {
                const task = member.tasks.find(t => t.id === taskId);
                if (task) setStatusUpdateTask(task);
              }}
            />
          ))}
        </div>
      </main>

      {/* ─── Task-2: Status Update Modal (Z-INDEX 99999) ─── */}
      {statusUpdateTask && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
          style={{ zIndex: 99999 }}
        >
          <div className="w-full max-w-sm bg-[#1a1a28] rounded-2xl border border-[#00D4FF]/30 p-6 shadow-2xl animate-slide-up">
            <h2 className="text-xl font-black uppercase tracking-widest text-[#00D4FF] mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Update Progress
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b8a] mb-6 font-bold">
              Current: {statusUpdateTask.status.replace('_', ' ')}
            </p>

            <div className="space-y-3">
              {(["assigned", "in_progress", "done"] as TaskStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={async () => {
                    await onStatusChange(statusUpdateTask.id, status);
                    setStatusUpdateTask(null);
                  }}
                  className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.3em] transition-all duration-200 border ${
                    statusUpdateTask.status === status 
                    ? "bg-[#00D4FF] text-[#0a0a0f] border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                    : "bg-[#2a2a3d]/50 text-[#e0e0f0] border-[#2a2a3d] hover:border-[#00D4FF]/50"
                  }`}
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {status === "done" ? "Completed" : status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setStatusUpdateTask(null)}
              className="w-full mt-6 text-[#6b6b8a] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Task Add/Edit Modal (Z-INDEX 99999) ─── */}
      {(formTarget || editingTask) && formMember && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" 
          style={{ zIndex: 99999 }} 
        >
          <div className="w-full max-w-md animate-slide-up">
            <TaskForm
              assignedTo={formMember.id}
              assignedToInitial={formMember.initial}
              existingTask={editingTask}
              error={formError}
              onSubmit={handleFormSubmit}
              onClose={() => {
                setFormTarget(null);
                setEditingTask(null);
                setFormError(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}