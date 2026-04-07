// TaskFlow Service Worker (public/sw.js)
// Optimized for PWA background notification delivery

const CACHE_NAME = "taskflow-v1";

// 1. Install & Activate - Ensure the SW takes control immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// 2. Handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.warn("[SW] Push event received but no data found.");
    return;
  }

  let payload;
  try {
    // Try to parse as JSON (standard for your API route)
    payload = event.data.json();
  } catch (err) {
    // Fallback if the payload is just a plain string
    payload = { 
      title: "TaskFlow Update", 
      body: event.data.text() 
    };
  }

  const { title, body, icon, data } = payload;

  const options = {
    body: body || "You have a new task update.",
    icon: icon || "/icon-192x192.png", // Ensure this exists in your public folder
    badge: "/icon-192x192.png",       // Small monochrome icon for status bar
    vibrate: [200, 100, 200],         // Pattern: Vibration, Pause, Vibration
    tag: "taskflow-notif",            // Groups notifications so they don't stack infinitely
    renotify: true,                   // Alert even if a previous notification is still visible
    requireInteraction: true,         // Keeps the notification on screen until user clicks it
    data: data || {
      url: self.location.origin
    },
  };

  event.waitUntil(
    self.registration.showNotification(title || "TaskFlow", options)
  );
});

// 3. Handle notification click — Focus the PWA or open a new window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window at the root
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});