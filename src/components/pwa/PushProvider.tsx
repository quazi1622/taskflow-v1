"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push";

interface PushContextValue {
  permission: NotificationPermission;
  enablePush: () => Promise<void>;
  sendTaskNotification: (
    recipientId: string,
    description: string,
    deadline?: string | null
  ) => Promise<void>;
}

const PushContext = createContext<PushContextValue | null>(null);

export function usePush() {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within a PushProvider");
  return ctx;
}

export function PushProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const setupAttempted = useRef(false);

  // Sync initial permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeUser = async (registration: ServiceWorkerRegistration) => {
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as any,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription: sub.toJSON() }),
      });

      console.log("[Push] Subscription synced for:", userId);
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
    }
  };

  useEffect(() => {
    if (setupAttempted.current || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setup = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const registration = await navigator.serviceWorker.ready;

        // If permission is already granted, refresh the subscription silently
        if (Notification.permission === "granted") {
          const existingSub = await registration.pushManager.getSubscription();
          if (existingSub) {
            await subscribeUser(registration);
          }
        }
        setupAttempted.current = true;
      } catch (err) {
        console.error("[Push] SW Setup error:", err);
      }
    };

    setup();
  }, [userId]);

  const enablePush = async () => {
    if (!("Notification" in window)) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await subscribeUser(registration);
    }
  };

  async function sendTaskNotification(recipientId: string, description: string, deadline?: string | null) {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, description, deadline }),
      });
    } catch (err) {
      console.error("[Push] API call failed:", err);
    }
  }

  return (
    <PushContext.Provider value={{ permission, enablePush, sendTaskNotification }}>
      {children}
    </PushContext.Provider>
  );
}