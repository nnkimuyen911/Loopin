/*
  Loopin Service Worker
  - Receives push events
  - Displays desktop notifications
  - Handles notification click to focus/open app
*/

const SW_VERSION = "loopin-sw-v2-debug";

function swLog(...args) {
  console.log(`[Loopin Push][SW ${SW_VERSION}]`, ...args);
}

self.addEventListener("install", (event) => {
  swLog("install event fired");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  swLog("activate event fired");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  swLog("push event received", {
    hasData: Boolean(event.data)
  });

  let payload = {
    title: "🔥 Loopin Reminder",
    body: "Time to complete your habit!",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23FFB6C1'/%3E%3Cstop offset='1' stop-color='%23E6A8FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect rx='26' width='128' height='128' fill='url(%23g)'/%3E%3Ctext x='64' y='80' text-anchor='middle' font-size='56'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E",
    url: "/"
  };

  try {
    if (event.data) {
      const text = event.data.text();
      swLog("push event raw data text:", text);

      if (text) {
        payload = JSON.parse(text);
      }
    }
  } catch (error) {
    swLog("payload parse failed, using fallback payload", error);
    // If payload isn't JSON, fallback safely.
    payload.body = payload.body || "Time to complete your habit!";
  }

  if (!payload || typeof payload !== "object") {
    payload = {
      title: "🔥 Loopin Reminder",
      body: "Time to complete your habit!",
      icon: payload && payload.icon,
      url: "/"
    };
  }

  const title = payload.title || "🔥 Loopin Reminder";
  const body = payload.body || "Time to complete your habit!";
  const icon = payload.icon || undefined;
  const targetUrl = payload.url || "/";

  const options = {
    body,
    icon,
    badge: icon,
    tag: payload.tag || "loopin-push-reminder",
    renotify: true,
    data: {
      url: targetUrl,
      debugPayload: payload
    }
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        swLog("showNotification called successfully", { title, body, targetUrl });
      })
      .catch((error) => {
        swLog("showNotification failed", error);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  swLog("notificationclick fired", event.notification && event.notification.data);
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          swLog("Focusing existing client", client.url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        swLog("Opening new window", targetUrl);
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});

self.addEventListener("message", (event) => {
  swLog("message received from page", event.data);
});