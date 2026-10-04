/**
 * On-device handoff for a Web Share Target.
 * The service worker writes the text. This page reads it once and deletes it.
 * Names match public/share-target-sw.js.
 */

export const SHARE_CACHE = "pesasense-share";
export const SHARE_PENDING = "/share-pending";

/** Read the shared text, then remove it so a later visit does not reuse it. */
export async function takeSharedText(): Promise<string | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(SHARE_CACHE);
  const pending = await cache.match(SHARE_PENDING);
  if (!pending) return null;
  const text = (await pending.text()).trim();
  await cache.delete(SHARE_PENDING);
  return text.length > 0 ? text : null;
}
