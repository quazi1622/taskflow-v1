"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push";

interface PushContextValue {
  sendTaskNotification: (
    recipientId: string,
    description: string,
    deadline?: string | null
  ) => Promise<void>;
}

const PushContext = createContext<PushContextValue>({
  sendTaskNotification: async () => {},
});

export function usePush() {
  return useContext(PushContext);
}

interface Props {
  userId: string;
  children: ReactNode;
}

export function PushProvider({ userId, children }: Props) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
      return;
    }

    async function setup() {
      try {
        // 1. Register service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        await navigator.serviceWorker.ready;

        // 2. Check for existing subscription first
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // 3. Request permission
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("[Push] Notification permission denied.");
            return;
          }

          // 4. Subscribe with VAPID key
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
          });
        }

        // 5. Save subscription to Supabase via API
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, subscription }),
        });

        subscribed.current = true;
        console.log("[Push] Subscription active for:", userId);
      } catch (err) {
        console.error("[Push] Setup failed:", err);
      }
    }

    setup();
  }, [userId]);

  async function sendTaskNotification(
    recipientId: string,
    description: string,
    deadline?: string | null
  ) {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, description, deadline }),
      });
    } catch (err) {
      console.error("[Push] Failed to send notification:", err);
    }
  }

  return (
    <PushContext.Provider value={{ sendTaskNotification }}>
      {children}
    </PushContext.Provider>
  );
}
