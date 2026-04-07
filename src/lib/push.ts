// @/lib/push.ts
// Helper utilities for Web Push VAPID key conversion

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 * This is strictly required by the browser's PushManager.subscribe() 
 * method for the applicationServerKey property.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // 1. Handle empty keys gracefully to prevent atob crashes
  if (!base64String) {
    console.error("[Push] VAPID Public Key is missing from environment variables.");
    return new Uint8Array(0);
  }

  // 2. Add necessary padding for standard base64 decoding
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  // 3. Decode the base64 string
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  // 4. Map characters to their 8-bit unsigned integer equivalents
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}