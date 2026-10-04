/**
 * PesaSense service worker.
 * Caches the app shell and static files. Never caches /api or non-GET requests,
 * except the share-target POST, which stays in Cache Storage on this phone.
 * Bump VERSION when the precache list changes. Old pesasense-* caches are deleted on activate.
 * pesasense-share is kept so an in-flight share is not wiped during an update.
 */
importScripts("/share-target-sw.js");

const VERSION = "v1";
const SHELL = `pesasense-shell-${VERSION}`;
const PAGES = `pesasense-pages-${VERSION}`;
const STATIC = `pesasense-static-${VERSION}`;
const CURRENT = new Set([SHELL, PAGES, STATIC, "pesasense-share"]);

const PRECACHE = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pesasense-") && !CURRENT.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (isShareTargetPost(request)) {
    event.respondWith(handleShareTarget(request));
    return;
  }
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname === "/share-target-sw.js") return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const destination = request.destination;
  if (
    destination === "style" ||
    destination === "script" ||
    destination === "font" ||
    destination === "image" ||
    destination === "manifest"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.headers.get("RSC") === "1" || url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirstData(request));
  }
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic" && !response.headers.has("Set-Cookie")) {
      const cache = await caches.open(PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function networkFirstData(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic" && !response.headers.has("Set-Cookie")) {
      const cache = await caches.open(PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const response = await fetching;
  if (response) return response;
  return new Response("", { status: 503 });
}
