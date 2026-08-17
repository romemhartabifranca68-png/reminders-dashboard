/* BSCS 1-A RST Hub — lightweight service worker */
const CACHE = "bscs1a-rst-hub-v3";
const PRECACHE = ["./", "./index.html", "./game.js", "./logo.png", "./manifest.webmanifest"];

/** Never intercept / cache these (AI API, Firebase, Google APIs) */
function shouldBypass(urlString) {
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".vercel.app")) return true;
    if (host === "reminders-dashboard-eosin.vercel.app") return true;
    if (host.includes("googleapis.com")) return true;
    if (host.includes("gstatic.com")) return true;
    if (host.includes("firebaseio.com")) return true;
    if (host.includes("firebase.com")) return true;
    if (host.includes("firebasestorage.googleapis.com")) return true;
    if (u.pathname.startsWith("/api/")) return true;
  } catch (e) {
    /* ignore */
  }
  return false;
}

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

  // Bypass: non-GET (POST/PUT/OPTIONS) and external AI/API hosts
  if (req.method !== "GET") return;
  if (shouldBypass(req.url)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && req.url.includes(self.location.origin)) {
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
  const target =
    (event.notification.data && event.notification.data.url) ||
    new URL("./index.html#officer-updates", self.location.href).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if (client.navigate) client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_UPDATE" && data.title) {
    const icon = data.icon || new URL("./logo.png", self.location.href).href;
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body || "May bagong update sa BSCS 1-A hub.",
        icon,
        badge: icon,
        tag: data.tag || "bscs1a-hub-update",
        renotify: true,
        data: { url: data.url || new URL("./index.html#officer-updates", self.location.href).href }
      })
    );
  }
});
