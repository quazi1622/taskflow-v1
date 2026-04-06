"use client";

import { Task, UserRole, TaskStatus } from "@/lib/types";
import TaskCard from "./TaskCard";

interface Props {
  memberId: string;
  memberInitial: string;
  tasks: Task[];
  viewerRole: UserRole;
  viewerId: string;
  canDelete: boolean;
  allMembers: { id: string; initial: string }[];
  onAddTask: (memberId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, toMemberId: string) => void;
  // Updated to TaskStatus to resolve the Type Mismatch
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export default function MemberColumn({
  memberId,
  memberInitial,
  tasks,
  viewerRole,
  viewerId,
  canDelete,
  allMembers,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onStatusChange,
}: Props) {
  const isBossOrLead = viewerRole === "boss" || viewerRole === "team-lead";

  return (
    <div
      className="flex flex-col w-72 flex-shrink-0 rounded-2xl"
      style={{
        background: "rgba(20, 20, 31, 0.5)",
        border: "1px solid rgba(42, 42, 61, 0.5)",
      }}
    >
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#1a1a28]">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
            style={{
              background: "linear-gradient(135deg, #FF6B00, #FF8C33)",
              color: "#0a0a0f",
              fontFamily: "var(--font-barlow-condensed)",
              boxShadow: "0 0 10px rgba(255, 107, 0, 0.2)",
            }}
          >
            {memberInitial}
          </div>
          <span
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#e0e0f0]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            {memberId === viewerId ? "My Space" : memberId}
          </span>
        </div>

        {/* Add Task Button (Lead/Boss Only) */}
        {isBossOrLead && (
          <button
            onClick={() => onAddTask(memberId)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#FF6B00] hover:bg-[#FF6B00]/10 transition-colors"
            style={{ border: "1px solid rgba(255, 107, 0, 0.3)" }}
          >
            +
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
        {tasks.length > 0 ? (
          tasks
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
            .map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                viewerRole={viewerRole}
                canDelete={canDelete}
                allMembers={allMembers}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onMove={onMoveTask}
                onStatusChange={onStatusChange}
              />
            ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 opacity-20">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#6b6b8a]">
              No Active Tasks
            </div>
          </div>
        )}
      </div>
    </div>
  );
}