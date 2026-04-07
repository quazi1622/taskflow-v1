"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push";

interface PushContextValue {
  permission: NotificationPermission;
  isSubscribed: boolean; // NEW: Tracks if the DB has a record
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>; // NEW: Ability to unsubscribe
  sendTaskNotification: (recipientId: string, description: string, deadline?: string | null) => Promise<void>;
}

const PushContext = createContext<PushContextValue | null>(null);

export function usePush() {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within a PushProvider");
  return ctx;
}

export function PushProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const setupAttempted = useRef(false);

  // 1. Initial State Sync
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // 2. Helper: Sync with Supabase
  const updateDbSubscription = async (sub: PushSubscription | null) => {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, subscription: sub ? sub.toJSON() : null }),
    });
    setIsSubscribed(!!sub);
  };

  useEffect(() => {
    if (setupAttempted.current || typeof window === "undefined") return;
    const setup = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        
        // Auto-refresh DB if already granted
        if (Notification.permission === "granted" && sub) {
          await updateDbSubscription(sub);
        }
        setupAttempted.current = true;
      } catch (err) { console.error("[Push] Setup error:", err); }
    };
    setup();
  }, [userId]);

  // 3. Logic: Enable
  const enablePush = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as any,
      });
      await updateDbSubscription(sub);
    }
  };

  // 4. Logic: Disable (The Toggle Off)
  const disablePush = async () => {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe(); // Kill it in the browser
      await updateDbSubscription(null); // Kill it in Supabase
    }
  };

  async function sendTaskNotification(recipientId: string, description: string, deadline?: string | null) {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, description, deadline }),
    });
  }

  return (
    <PushContext.Provider value={{ permission, isSubscribed, enablePush, disablePush, sendTaskNotification }}>
      {children}
    </PushContext.Provider>
  );
}