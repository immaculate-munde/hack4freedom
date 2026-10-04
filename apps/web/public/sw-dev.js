/**
 * Development service worker.
 * Chrome only offers an install dialog when some fetch handler is registered.
 * This handler does not call respondWith, so dev requests stay on the network.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // The listener itself is the install signal. Do not handle the request.
});
