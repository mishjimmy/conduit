import { type NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";

/**
 * Proxies a camera's HLS (often http://) over this app's https origin so it
 * isn't blocked as mixed content. Maps /cam/<slug>/<path> -> <sourceDir>/<path>,
 * where <sourceDir> is the camera's source URL minus its filename — so relative
 * segment URLs in the playlist resolve back through here. Range requests are
 * forwarded for fMP4. Slug→source is cached briefly to avoid a lookup per segment.
 */
const cache = new Map<string, { url: string; exp: number }>();
const TTL_MS = 30_000;

async function resolveSource(slug: string): Promise<string | null> {
  const hit = cache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { databases } = createAdminClient();
  // List + match in code so we don't depend on a `slug` index existing.
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.cameras, [Query.limit(100)]);
  const doc = res.documents.find((d) => (d as { slug?: string }).slug === slug) as
    | { source_url?: string }
    | undefined;
  const url = doc?.source_url || null;
  if (url) cache.set(slug, { url, exp: Date.now() + TTL_MS });
  return url;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path } = await params;
  const source = await resolveSource(slug);
  if (!source) return new Response("camera not found", { status: 404 });

  let target: string;
  try {
    const u = new URL(source);
    const dir = u.pathname.slice(0, u.pathname.lastIndexOf("/") + 1);
    target = `${u.origin}${dir}${path.join("/")}${req.nextUrl.search}`;
  } catch {
    return new Response("camera source is not a valid URL", { status: 502 });
  }

  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: range ? { range } : undefined, cache: "no-store" });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  const headers = new Headers({ "cache-control": "no-store" });
  for (const h of ["content-type", "content-range", "accept-ranges", "content-length"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
