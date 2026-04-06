"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import KanbanBoard from "@/components/board/KanbanBoard";
import { PushProvider, usePush } from "@/components/pwa/PushProvider";
import { Task, TeamMember, TaskStatus } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── Status mapping to match Supabase Check Constraint ──────────────────────
// Maps internal TaskStatus to DB: 'assigned', 'in progress', 'completed'
function toDbStatus(status: TaskStatus): string {
  if (status === "done") return "completed";
  if (status === "in_progress") return "in progress"; // Exact match for your ARRAY check
  return "assigned";
}

export function fromDbStatus(dbStatus: string): TaskStatus {
  if (dbStatus === "completed") return "done";
  if (dbStatus === "in progress") return "in_progress";
  return "assigned";
}

// ─── Loading Screen UI ──────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-[9999]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-7 bg-[#FF6B00] shadow-[0_0_8px_#FF6B00] rounded-sm" />
        <span className="text-3xl font-black uppercase tracking-widest text-[#FF6B00]">TASKFLOW</span>
        <div className="w-1.5 h-7 bg-[#00D4FF] shadow-[0_0_8px_#00D4FF] rounded-sm" />
      </div>
      <span className="text-xs uppercase tracking-widest text-[#6b6b8a] animate-pulse">Verifying session...</span>
    </div>
  );
}

// ─── Inner shell — Core Logic ────────────────────────────────────────────────
interface BoardShellProps {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  logout: () => void;
  members: TeamMember[];
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

function BoardShell({ user, logout, members, setMembers }: BoardShellProps) {
  const { sendTaskNotification } = usePush();

  const isBoss = user.role === "boss";
  const isLead = user.role === "team-lead";
  const isMember = user.role === "member";
  const isBossOrLead = isBoss || isLead;

  // 1. Handle Assign Task
  async function handleAssignTask(memberId: string, description: string, deadline: string | null) {
    if (!isBossOrLead) return;

    const taskId = crypto.randomUUID();
    const today = new Date().toISOString().split("T")[0];
    const deadlineDate = deadline ? deadline.split("T")[0] : null;

    const newTask: Task = {
      id: taskId, assigned_to: memberId, description, deadline: deadline ?? null,
      status: "assigned", edit_count: 0, priority: Date.now(), 
      created_at: today, updated_at: today,
    };

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, tasks: [...m.tasks, newTask] } : m));

    const { error } = await supabase.from("tasks").insert({
      tasks: taskId,
      task_desc: description,
      created_at: today,
      assigned_to: memberId,
      status: toDbStatus("assigned"),
      deadline: deadlineDate,
      created_by: user.initial, 
      edit_count: 0,
    });

    if (error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) } : m));
      alert(`Database rejected assignment: ${error.message}`);
    }
  }

  // 2. Handle Edit Task
  async function handleEditTask(task: Task, description: string, deadline: string | null) {
    if (!isLead) {
      alert("Unauthorized: Only the Team Lead can modify task details.");
      return;
    }
    if (task.edit_count >= 2) {
      alert("Restriction: This task has already been edited twice.");
      return;
    }

    const newEditCount = (task.edit_count || 0) + 1;
    setMembers(prev => prev.map(m => ({
      ...m, tasks: m.tasks.map(t => t.id === task.id ? { ...t, description, deadline, edit_count: newEditCount } : t)
    })));

    const { error } = await supabase.from("tasks").update({
      task_desc: description,
      deadline: deadline ? deadline.split("T")[0] : null,
      edit_count: newEditCount,
    }).eq("tasks", task.id);

    if (error) alert(`Update failed: ${error.message}`);
  }

  // 3. Handle Status Change (REVISED: Robust Identity Check + Sync Debugging)
  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (isLead) {
      alert("Unauthorized: Team Leads cannot modify task status.");
      return;
    }

    const currentMemberCol = members.find(m => m.tasks.some(t => t.id === taskId));
    const targetTask = currentMemberCol?.tasks.find(t => t.id === taskId);

    if (!targetTask) return;

    // --- IDENTITY CHECK ---
    const myInitial = user.initial?.trim().toUpperCase();
    const taskAssignedTo = targetTask.assigned_to?.trim().toUpperCase();

    if (isMember && taskAssignedTo !== myInitial) {
      alert(`ACCESS DENIED\n\nYou are "${myInitial}", but task belongs to "${taskAssignedTo}".`);
      return;
    }

    // Optimistic UI Update
    setMembers(prev => prev.map(m => ({
      ...m, tasks: m.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    })));

    // Backend Sync with specific Response verification
    const dbStatusValue = toDbStatus(newStatus);
    
    const { data, error, status } = await supabase
      .from("tasks")
      .update({ status: dbStatusValue })
      .eq("tasks", taskId) // Matches UUID column
      .select();

    if (error) {
      console.error("[TaskFlow] Sync Error:", error.message);
      alert(`Sync Failed: ${error.message}`);
      window.location.reload(); // Revert UI
    } else if (!data || data.length === 0) {
      // This case triggers if ID matches but RLS blocks the update
      alert("PERMISSION DENIED: Supabase RLS blocked the update. You don't have permission to write to this task.");
      window.location.reload();
    } else {
      console.log(`[TaskFlow] Successfully updated task ${taskId} to ${dbStatusValue}`);
    }
  }

  // 4. Delete/Move
  async function handleDeleteTask(taskId: string) {
    if (!isLead) return;
    setMembers(prev => prev.map(m => ({ ...m, tasks: m.tasks.filter(t => t.id !== taskId) })));
    await supabase.from("tasks").delete().eq("tasks", taskId);
  }

  async function handleMoveTask(taskId: string, toMemberId: string) {
    if (!isBossOrLead) return;
    setMembers(prev => {
      const source = prev.find(m => m.tasks.some(t => t.id === taskId));
      const task = source?.tasks.find(t => t.id === taskId);
      if (!task) return prev;
      return prev.map(m => {
        if (m.id === toMemberId) return { ...m, tasks: [...m.tasks, { ...task, assigned_to: toMemberId }] };
        return { ...m, tasks: m.tasks.filter(t => t.id !== taskId) };
      });
    });
    await supabase.from("tasks").update({ assigned_to: toMemberId }).eq("tasks", taskId);
  }

  return (
    <KanbanBoard
      members={members}
      viewerRole={user.role}
      viewerId={user.id}
      viewerInitial={user.initial}
      canDelete={isLead}
      onLogout={logout}
      onAssignTask={handleAssignTask}
      onEditTask={handleEditTask}
      onDeleteTask={handleDeleteTask}
      onMoveTask={handleMoveTask}
      onStatusChange={handleStatusChange}
    />
  );
}

// ─── Outer Shell ─────────────────────────────────────────────────────────────
function BoardPage() {
  const { user, logout } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setMembersLoading(true);
      try {
        if (!isSupabaseConfigured) return;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("users, sl")
          .eq("role", "member")
          .order("sl", { ascending: true });

        if (userError) throw userError;

        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*");

        if (tasksError) throw tasksError;

        const today = new Date().toISOString().split("T")[0];

        const teamMembers: TeamMember[] = (userData ?? []).map((row: any) => ({
          id: row.users,
          initial: row.users,
          tasks: (tasksData ?? [])
            .filter((t: any) => t.assigned_to?.toUpperCase() === row.users?.toUpperCase())
            .map((t: any) => ({
              id: t.tasks,
              description: t.task_desc,
              isOverdue: t.deadline && t.deadline < today && t.status !== "completed",
              created_at: t.created_at,
              updated_at: t.created_at,
              status: fromDbStatus(t.status),
              deadline: t.deadline,
              assigned_to: t.assigned_to,
              edit_count: t.edit_count || 0,
              priority: 0,
            })),
        }));

        setMembers(teamMembers);
      } catch (err: any) {
        console.error("[TaskFlow] Init failed:", err.message);
      } finally {
        setMembersLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (!user) return <AuthModal />;
  if (membersLoading) return <LoadingScreen />;

  return (
    <PushProvider userId={user.id}>
      <BoardShell user={user} logout={logout} members={members} setMembers={setMembers} />
    </PushProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <BoardPage />
    </AuthProvider>
  );
}