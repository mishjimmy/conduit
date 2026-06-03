"use client";

const CACHE_NAME = "conduit-media-v1";

/**
 * Pre-fetch media into the Cache Storage API and return a map of mediaId →
 * object URL served from the cached blob. This means media plays from local
 * disk and keeps working across reloads with no network (the device image's
 * persistent storage backs Cache Storage). Anything that can't be cached is
 * omitted, so the caller falls back to the direct URL while online.
 */
export async function prefetchMedia(
  items: { mediaId: string; url: string }[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (items.length === 0) return out;

  let cache: Cache | null = null;
  try {
    if (typeof caches !== "undefined") cache = await caches.open(CACHE_NAME);
  } catch {
    cache = null;
  }

  await Promise.all(
    items.map(async ({ mediaId, url }) => {
      try {
        let res = cache ? await cache.match(url) : undefined;
        if (!res) {
          const net = await fetch(url, { mode: "cors" });
          if (net.ok) {
            if (cache) await cache.put(url, net.clone());
            res = net;
          }
        }
        if (res) {
          const blob = await res.blob();
          out[mediaId] = URL.createObjectURL(blob);
        }
      } catch {
        /* leave unset — resolver falls back to the direct URL while online */
      }
    }),
  );

  return out;
}
