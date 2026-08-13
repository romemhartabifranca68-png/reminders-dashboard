/* BSCS 1-A RST Hub — lightweight service worker */
const CACHE = "bscs1a-rst-hub-v1";
const PRECACHE = ["./", "./index.html", "./game.js", "./logo.png", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && (req.url.includes(self.location.origin))) {
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if (client.navigate) client.navigate("./index.html#officer-updates");
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html#officer-updates");
      }
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_UPDATE" && data.title) {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body || "May bagong update sa BSCS 1-A hub.",
        icon: "./logo.png",
        badge: "./logo.png",
        tag: data.tag || "bscs1a-hub-update",
        renotify: true,
        data: { url: data.url || "./index.html#officer-updates" }
      })
    );
  }
});
