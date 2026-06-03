const CACHE_NAME = "emotion-s2-v30";
const CHAT_DEEP_LINK = "/?tab=chat";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];
const STATIC_ASSET_PREFIX = "/assets/";

function isSameOriginRequest(request) {
  return new URL(request.url).origin === self.location.origin;
}

function shouldCacheRuntimeResponse(request, response) {
  if (!response || response.status !== 200 || !isSameOriginRequest(request)) {
    return false;
  }

  const url = new URL(request.url);
  return url.pathname.startsWith(STATIC_ASSET_PREFIX) || APP_SHELL.includes(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !isSameOriginRequest(event.request)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (shouldCacheRuntimeResponse(event.request, response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }

          return response;
        })
        .catch(() => caches.match(event.request));
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "정서 S2 민혁";
  const options = {
    badge: "/icon-192.png",
    body: payload.body || "상대가 콕 찔렀어요",
    data: {
      url: payload.url || CHAT_DEEP_LINK,
    },
    icon: "/icon-192.png",
    renotify: true,
    tag: payload.tag || "couple-poke",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || CHAT_DEEP_LINK, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clientList) => {
        const matchingClient = clientList.find((client) => new URL(client.url).origin === self.location.origin);
        if (matchingClient) {
          matchingClient.postMessage({ type: "open-tab", tab: "chat" });
          return matchingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
