"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, UserRole, TaskStatus } from "@/lib/types";
import StatusBadge from "@/components/task/StatusBadge";

interface Props {
  task: Task;
  viewerRole: UserRole;
  canDelete: boolean;
  allMembers: { id: string; initial: string }[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onMove: (taskId: string, toMemberId: string) => void;
  onStatusChange: (taskId: string, currentStatus: TaskStatus) => void;
}

interface MenuPos { top: number; right: number }

function formatDeadline(deadline: string): { text: string; overdue: boolean } {
  const d = new Date(deadline);
  const now = new Date();
  const overdue = d < now && d.toDateString() !== now.toDateString();
  const text = d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return { text, overdue };
}

function linkify(text: string) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);
  return parts.map((part, i) =>
    urlPattern.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] underline">
        {part}
      </a>
    ) : part
  );
}

export default function TaskCard({
  task, viewerRole, canDelete, allMembers, onEdit, onDelete, onMove, onStatusChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, right: 0 });
  const [expanded, setExpanded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLead = viewerRole === "team-lead";
  const isBoss = viewerRole === "boss";
  const isDone = task.status === "done";
  
  const canEditTask = isLead && (task.edit_count ?? 0) < 2;
  const deadline = task.deadline ? formatDeadline(task.deadline) : null;

  // ─── DND-KIT HOOK ───
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    disabled: false 
  });

  // Consolidated Style Object to prevent JSX Duplicate Attribute Error
  const combinedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : (isDone ? 0.6 : 1),
    zIndex: isDragging ? 100 : 1,
    position: 'relative' as 'relative',
    background: isDone ? "rgba(20,20,31,0.6)" : "rgba(30,30,46,0.8)", 
    border: "1px solid #2a2a3d", 
    backdropFilter: "blur(8px)",
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const openMenu = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMoveOpen(false);
    setMenuOpen(true);
  };

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) document.addEventListener("mousedown", handleOutsideClick);
    else document.removeEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen, handleOutsideClick]);

  const DropdownMenu = menuOpen
    ? createPortal(
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden shadow-2xl"
          style={{
            position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 999999,
            minWidth: "160px", background: "#13131f", border: "1px solid rgba(255,107,0,0.25)",
          }}
        >
          {canEditTask && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setMenuOpen(false); onEdit(task); }}
              className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#FF6B00]/10 text-[#e0e0f0] border-b border-white/5"
            >
              <span className="text-[#FF6B00]">✎</span>&nbsp; Edit ({2 - (task.edit_count ?? 0)} left)
            </button>
          )}

          {(isBoss || isLead) && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMoveOpen((v) => !v)}
              className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#00D4FF]/10 text-[#00D4FF] border-b border-white/5"
              style={{ background: moveOpen ? "rgba(0,212,255,0.06)" : "transparent" }}
            >
              ⇄&nbsp; Reassign {moveOpen ? "▲" : "▼"}
            </button>
          )}

          {moveOpen && allMembers.filter((m) => m.id !== task.assigned_to).map((m) => (
            <button
              key={m.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setMenuOpen(false); onMove(task.id, m.id); }}
              className="w-full text-left px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#FF6B00]/10 text-[#FF6B00] border-b border-white/5"
            >
              → {m.initial}
            </button>
          ))}

          {canDelete && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setMenuOpen(false); onDelete(task.id); }}
              className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#FF2D55] hover:bg-[#FF2D55]/10"
            >
              ✕&nbsp; Delete
            </button>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      className="relative rounded-xl p-4 transition-all duration-200 group"
    >
      <div className="mb-3" onMouseDown={(e) => e.stopPropagation()}>
        <p className="text-sm leading-relaxed cursor-pointer text-[#e0e0f0]" onClick={() => setExpanded((v) => !v)}>
          {expanded || task.description.length <= 80 ? linkify(task.description) : (
            <>{linkify(task.description.slice(0, 80))}<span className="text-[#6b6b8a]">… <span className="underline">more</span></span></>
          )}
        </p>
      </div>

      {deadline && (
        <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: deadline.overdue ? "#FF2D55" : "#6b6b8a" }}>
          <span style={{ fontFamily: "var(--font-barlow-condensed)" }}>{deadline.overdue ? "OVERDUE · " : ""}{deadline.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={task.status} />

        <div className="flex items-center gap-1.5">
          {!isLead && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onStatusChange(task.id, task.status)}
              className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 border"
              style={{
                background: isDone ? "transparent" : task.status === "assigned" ? "rgba(42, 42, 61, 0.8)" : "linear-gradient(135deg, #FF6B00, #FF8C33)",
                borderColor: isDone ? "#3d3d5c" : task.status === "assigned" ? "#3d3d5c" : "#FF6B00",
                color: isDone ? "#6b6b8a" : task.status === "assigned" ? "#6b6b8a" : "#0a0a0f",
              }}
            >
              {isDone ? "Reset Status" : task.status === "assigned" ? "Start Task" : "Update Status"}
            </button>
          )}

          {(isBoss || isLead) && (
            <div className="relative">
              <button
                ref={btnRef} 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={openMenu}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ background: "rgba(42,42,61,0.8)", color: "#6b6b8a" }}
              >
                ⋯
              </button>
              {DropdownMenu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}