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
    // 1. Safety Checks: Only run in browser and don't run twice
    if (setupAttempted.current || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[Push] Browser does not support Web Push.");
      return;
    }

    const setupPush = async () => {
      try {
        // 2. REGISTER the Service Worker (Crucial: This looks for /public/sw.js)
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        
        // 3. WAIT for the worker to be ready
        const registration = await navigator.serviceWorker.ready;
        
        // 4. Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // 5. The Auto-Request Logic (Triggered on first screen tap)
        const requestAndSave = async () => {
          try {
            const permission = await Notification.permission;
            
            // If already denied, we can't show the popup; just exit
            if (permission === "denied") {
              console.warn("[Push] Permission denied. Check browser settings.");
              return;
            }

            const newPermission = await Notification.requestPermission();
            if (newPermission !== "granted") return;

            // FIX: Explicitly cast to 'any' to bypass the SharedArrayBuffer type mismatch
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as any,
            });

            // Save the subscription to Supabase via your API
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                userId, 
                subscription: subscription.toJSON() 
              }),
            });
            
            console.log("[Push] Auto-subscribed successful for:", userId);
          } catch (err) {
            console.error("[Push] Interaction request failed:", err);
          }
        };

        if (!subscription) {
          // Listen for the very first click on the window to trigger the popup
          console.log("[Push] Waiting for first click to request permission...");
          window.addEventListener("click", requestAndSave, { once: true });
        } else {
          // If already subscribed, refresh the DB entry silently to prevent NULL columns
          console.log("[Push] Refreshing existing subscription for:", userId);
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId, 
              subscription: subscription.toJSON() 
            }),
          });
        }
        
        setupAttempted.current = true;
      } catch (err) {
        console.error("[Push] Setup error:", err);
      }
    };

    setupPush();
    
    // Cleanup: Remove listener if component unmounts before click
    return () => window.removeEventListener("click", () => {});
  }, [userId]);

  /**
   * Function used by the Kanban Board to trigger a notification
   * to a specific recipient (e.g., "MPM")
   */
  async function sendTaskNotification(recipientId: string, description: string, deadline?: string | null) {
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, description, deadline }),
      });
      if (!res.ok) console.error("[Push] Failed to trigger send API");
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