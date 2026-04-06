// TaskFlow Service Worker
// Handles push notifications for task assignment and completion

const CACHE_NAME = "taskflow-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TaskFlow", body: event.data.text() };
  }

  const { title, body, icon, tag, data } = payload;

  const options = {
    body: body || "You have a new update.",
    icon: icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: tag || "taskflow-notification",
    data: data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title || "TaskFlow", options));
});

// Handle notification click — focus or open the PWA
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});
