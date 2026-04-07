"use client";

import { usePush } from "@/context/PushContext";

export default function NotificationBanner() {
  const { permission, enablePush } = usePush();

  // Don't show anything if permission is already granted or denied
  if (permission !== "default") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] w-full max-w-md px-4 animate-bounce-subtle">
      <div 
        className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border"
        style={{
          background: "rgba(10, 10, 15, 0.9)",
          borderColor: "rgba(0, 212, 255, 0.4)",
          boxShadow: "0 0 20px rgba(0, 212, 255, 0.15)"
        }}
      >
        <div className="flex gap-3 items-center">
          <div className="w-1 h-8 bg-[#00D4FF] rounded-full shadow-[0_0_8px_#00D4FF]" />
          <div>
            <h4 className="text-[10px] font-black tracking-[0.2em] text-[#00D4FF] uppercase">
              System Update
            </h4>
            <p className="text-[11px] text-[#6b6b8a] uppercase tracking-wider font-semibold">
              Enable alerts for task assignments
            </p>
          </div>
        </div>

        <button
          onClick={enablePush}
          className="px-4 py-2 bg-transparent border border-[#00D4FF] text-[#00D4FF] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#00D4FF] hover:text-black transition-all duration-300 active:scale-95"
          style={{ boxShadow: "inset 0 0 10px rgba(0, 212, 255, 0.2)" }}
        >
          Enable
        </button>
      </div>
    </div>
  );
}