/**
 * Development service worker.
 * Chrome only offers an install dialog when some fetch handler is registered.
 * Ordinary requests are left on the network. A share POST is stored on device.
 */
importScripts("/share-target-sw.js");

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!isShareTargetPost(event.request)) return;
  event.respondWith(handleShareTarget(event.request));
});
