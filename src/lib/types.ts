export type TaskStatus = "assigned" | "in_progress" | "done";
export type UserRole = "member" | "team-lead" | "boss";

export interface User {
  id: string;
  initial: string;
  role: UserRole;
  team_id?: string; // Made optional
  push_subscription?: object | null;
}

export interface Task {
  id: string;
  team_id?: string; // Made optional
  assigned_to: string;
  description: string;
  deadline?: string | null;
  status: TaskStatus;
  edit_count: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  initial: string;
  tasks: Task[];
}