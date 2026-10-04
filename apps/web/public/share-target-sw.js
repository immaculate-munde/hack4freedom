/**
 * Web Share Target handler. Imported by both service workers.
 *
 * Chrome posts shared text to /share. This handler stores it in Cache Storage
 * and redirects to the page. It never calls fetch(), so the message stays
 * on the phone. Keep the cache name and path in sync with lib/share-target.ts.
 */
const SHARE_CACHE = "pesasense-share";
const SHARE_PENDING = "/share-pending";
const SHARE_PATH = "/share";
const SHARE_MAX_CHARS = 200000;

function shareField(form, name) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function shareBody(form) {
  const title = shareField(form, "title");
  const text = shareField(form, "text");
  const link = shareField(form, "url");
  const parts = [];
  if (text) parts.push(text);
  if (title && !text.includes(title)) parts.push(title);
  if (link && !parts.some((part) => part.includes(link))) parts.push(link);
  return parts.join("\n\n").trim();
}

function shareRedirect(query) {
  const path = query ? `${SHARE_PATH}?${query}` : SHARE_PATH;
  return Response.redirect(new URL(path, self.location.origin), 303);
}

function isShareTargetPost(request) {
  if (request.method !== "POST") return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin && url.pathname === SHARE_PATH;
}

async function handleShareTarget(request) {
  try {
    const form = await request.formData();
    const body = shareBody(form);
    if (!body) return shareRedirect("");
    if (body.length > SHARE_MAX_CHARS) return shareRedirect("large=1");
    const cache = await caches.open(SHARE_CACHE);
    await cache.put(
      SHARE_PENDING,
      new Response(body, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    );
    return shareRedirect("");
  } catch {
    return shareRedirect("local=0");
  }
}
