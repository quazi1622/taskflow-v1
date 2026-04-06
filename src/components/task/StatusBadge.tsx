import { TaskStatus } from "@/lib/types";

const CONFIG: Record<
  TaskStatus,
  { label: string; color: string; glow: string; dot: string }
> = {
  assigned: {
    label: "Assigned",
    color: "rgba(255,107,0,0.15)",
    glow: "rgba(255,107,0,0.4)",
    dot: "#FF6B00",
  },
  in_progress: {
    label: "In Progress",
    color: "rgba(0,212,255,0.15)",
    glow: "rgba(0,212,255,0.4)",
    dot: "#00D4FF",
  },
  done: {
    label: "Done",
    color: "rgba(0,255,135,0.15)",
    glow: "rgba(0,255,135,0.4)",
    dot: "#00FF87",
  },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: cfg.color,
        border: `1px solid ${cfg.dot}`,
        boxShadow: `0 0 8px ${cfg.glow}`,
        color: cfg.dot,
        fontFamily: "var(--font-barlow-condensed)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full pulse-glow"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}
