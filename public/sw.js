self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "macommande.shop", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: payload.badge || "/favicon.png",
    tag: payload.tag || "default",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title || "macommande.shop", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  if (data.type === "new_order" && data.slug) {
    url = `/pro/${data.slug}`;
  } else if (data.type === "new_order") {
    url = "/pro";
  } else if (data.type === "order_status" && data.orderId) {
    url = `/order/${data.orderId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
