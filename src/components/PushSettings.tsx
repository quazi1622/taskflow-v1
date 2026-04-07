"use client";

import { usePush } from "@/components/pwa/PushProvider";

export default function PushSettings() {
  const { permission, isSubscribed, enablePush, disablePush } = usePush();

  // Handle the "Denied" state (The user blocked it in the browser)
  if (permission === "denied") {
    return (
      <div className="text-[10px] text-red-500 uppercase font-black tracking-tighter opacity-70">
        Alerts Blocked in Browser
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5">
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase text-[#6b6b8a] tracking-[0.1em]">
          Push Notifications
        </span>
        <span className={`text-[10px] font-bold uppercase ${isSubscribed ? 'text-[#00D4FF]' : 'text-white/40'}`}>
          {isSubscribed ? "Active" : "Disabled"}
        </span>
      </div>

      <button
        onClick={isSubscribed ? disablePush : enablePush}
        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isSubscribed ? 'bg-[#00D4FF]' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isSubscribed ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}