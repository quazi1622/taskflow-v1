// TaskFlow Service Worker (public/sw.js)
// Optimized for PWA background notification delivery

const CACHE_NAME = "taskflow-v1";

// 1. Install & Activate - Ensure the SW takes control immediately
self.addEventListener("install", (event) => {
  // Forces the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Allows an active service worker to set itself as the controller for all clients within its scope.
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
    // Standard for your API route
    payload = event.data.json();
  } catch (err) {
    // Fallback if the payload is just a plain string
    payload = { 
      title: "TaskFlow Update", 
      body: event.data.text() 
    };
  }

  // ADDED: 'badge' and 'tag' to destructuring so they match your backend API
  const { title, body, icon, badge, tag, data } = payload;

  const options = {
    body: body || "You have a new task update.",
    icon: icon || "/icon-192.png",
    badge: badge || "/icon-192.png",   // The small icon for the Android status bar
    vibrate: [200, 100, 200],
    tag: tag || "taskflow-notif",      // Prevents notification stacking
    renotify: true,                    // Vibrate even if a notification with the same tag exists
    requireInteraction: true,          // Keeps it visible until the user clicks or dismisses
    data: data || {
      url: "/"
    },
  };

  event.waitUntil(
    self.registration.showNotification(title || "TaskFlow", options)
  );
});

// 3. Handle notification click — Focus the PWA or open a new window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Define where to go (default to root, or use custom URL from data)
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open at our origin, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window at the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});