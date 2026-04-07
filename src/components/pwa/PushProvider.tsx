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

export function PushProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const setupAttempted = useRef(false);

  useEffect(() => {
    if (setupAttempted.current || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setupPush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // 1. Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // 2. The Auto-Request Logic (Triggered on first screen tap)
        const requestAndSave = async () => {
          try {
            const permission = await Notification.permission;
            
            // If already denied, we can't show the popup; just exit
            if (permission === "denied") return;

            const newPermission = await Notification.requestPermission();
            if (newPermission !== "granted") return;

            // FIX: Explicitly cast to 'any' to bypass the SharedArrayBuffer type mismatch
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as any,
            });

            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
            });
            
            console.log("[Push] Auto-subscribed successful for:", userId);
          } catch (err) {
            console.error("[Push] Interaction request failed:", err);
          }
        };

        if (!subscription) {
          // Listen for the very first click on the window to trigger the popup
          window.addEventListener("click", requestAndSave, { once: true });
        } else {
          // If already subscribed, refresh the DB entry silently
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
          });
        }
        
        setupAttempted.current = true;
      } catch (err) {
        console.error("[Push] Setup error:", err);
      }
    };

    setupPush();
    
    return () => window.removeEventListener("click", () => {});
  }, [userId]);

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
    <PushContext.Provider value={{ sendTaskNotification }}>
      {children}
    </PushContext.Provider>
  );
}