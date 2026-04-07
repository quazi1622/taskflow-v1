"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import KanbanBoard from "@/components/board/KanbanBoard";
import { PushProvider, usePush } from "@/components/pwa/PushProvider";
import { Task, TeamMember, TaskStatus } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── Status mapping to match Supabase Check Constraint ──────────────────────
function toDbStatus(status: TaskStatus): string {
  if (status === "done") return "completed";
  if (status === "in_progress") return "in progress";
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

  // 1. Handle Assign Task (Dynamic Notification for any Member)
  async function handleAssignTask(memberId: string, description: string, deadline: string | null) {
    if (!isBossOrLead) return;

    const taskId = crypto.randomUUID();
    const today = new Date().toISOString().split("T")[0];
    const deadlineDate = deadline ? deadline.split("T")[0] : null;
    const recipient = memberId.trim().toUpperCase();

    const { error } = await supabase.from("tasks").insert({
      tasks: taskId,
      task_desc: description,
      created_at: today,
      assigned_to: recipient,
      status: toDbStatus("assigned"),
      deadline: deadlineDate,
      created_by: user.initial, 
      edit_count: 0,
    });

    if (error) {
      alert(`Database rejected assignment: ${error.message}`);
    } else {
      // DYNAMIC NOTIFICATION: Notify recipient if it's not the current user
      if (recipient !== user.initial?.toUpperCase()) {
        sendTaskNotification(
          recipient, 
          `${user.initial} assigned a task: ${description}`,
          deadline
        );
      }
    }
  }

  // 2. Handle Edit Task (Dynamic Notification for any Member)
  async function handleEditTask(task: Task, description: string, deadline: string | null) {
    if (!isLead) {
      alert("Unauthorized: Only the Team Lead can modify task details.");
      return;
    }

    if (task.edit_count >= 2) {
      alert("Restriction: This task has already been edited twice.");
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        task_desc: description,
        deadline: deadline ? deadline.split("T")[0] : null,
      })
      .eq("tasks", task.id)
      .select()
      .single();

    if (error) {
      alert(`Update failed: ${error.message}`);
      window.location.reload(); 
    } else if (data) {
      const recipient = task.assigned_to?.toUpperCase();
      
      // DYNAMIC NOTIFICATION: Notify owner of the change
      if (recipient && recipient !== user.initial?.toUpperCase()) {
        sendTaskNotification(
          recipient,
          `Task Details Updated: ${description}`,
          deadline
        );
      }
    }
  }

  // 3. Handle Status Change
  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (isLead) {
      alert("Unauthorized: Team Leads cannot modify task status.");
      return;
    }

    const currentMemberCol = members.find(m => m.tasks.some(t => t.id === taskId));
    const targetTask = currentMemberCol?.tasks.find(t => t.id === taskId);

    if (!targetTask) return;

    const myInitial = user.initial?.trim().toUpperCase();
    const taskAssignedTo = targetTask.assigned_to?.trim().toUpperCase();

    if (isMember && taskAssignedTo !== myInitial) {
      alert(`ACCESS DENIED\n\nYou are "${myInitial}", but task belongs to "${taskAssignedTo}".`);
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: toDbStatus(newStatus) })
      .eq("tasks", taskId);

    if (error) {
      alert(`Sync Failed: ${error.message}`);
      window.location.reload();
    }
  }

  // 4. Delete & Move Logic
  async function handleDeleteTask(taskId: string) {
    if (!isLead) return;
    const { error } = await supabase.from("tasks").delete().eq("tasks", taskId);
    if (error) alert(`Delete failed: ${error.message}`);
  }

  async function handleMoveTask(taskId: string, toMemberId: string) {
    if (!isBossOrLead) return;
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: toMemberId.toUpperCase() })
      .eq("tasks", taskId);
    if (error) alert(`Move failed: ${error.message}`);
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

// ─── Outer Shell — Data & Realtime Synchronization ────────────────────────────
function BoardPage() {
  const { user, logout } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Centralized data fetcher
  const fetchData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    
    try {
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
      setLoading(false);
    }
  }, [user]);

  // Realtime Subscription: Refresh UI whenever 'tasks' table changes
  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase
      .channel("board-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  if (!user) return <AuthModal />;
  if (loading) return <LoadingScreen />;

  return (
    // Pass user.initial (e.g., "AAN") to match the DB column exactly
    <PushProvider userId={user.initial.toUpperCase()}>
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