import { ID } from "appwrite";
import { COLLECTIONS } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

/**
 * A camera. `sourceUrl` is either a **go2rtc stream name** (e.g. `front-door`),
 * played via go2rtc's low-latency player (WebRTC/MSE) under /go2rtc/, or a full
 * **HLS URL**, proxied over https at /cam/<slug>/… to avoid mixed content.
 */
export interface Camera {
  id: string;
  name: string;
  slug: string;
  sourceUrl: string;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "camera"
  );
}

/** The relative, https-safe URL to put in a layer (resolves on player + CMS). */
export function cameraPlaybackUrl(camera: Pick<Camera, "slug" | "sourceUrl">): string {
  const s = camera.sourceUrl.trim();
  if (!s) return "";
  // A full URL is a raw HLS source -> proxy it. Anything else is a go2rtc stream
  // name -> go2rtc's player (lowest latency it can negotiate: WebRTC, then MSE).
  if (/^https?:\/\//i.test(s)) {
    let basename = "index.m3u8";
    try {
      const path = new URL(s).pathname;
      basename = path.slice(path.lastIndexOf("/") + 1) || "index.m3u8";
    } catch {
      /* keep default */
    }
    return `/cam/${camera.slug}/${basename}`;
  }
  // Force WebRTC for the lowest latency (no MSE/HLS fallback).
  return `/go2rtc/stream.html?src=${encodeURIComponent(s)}&mode=webrtc`;
}

function toCamera(doc: Record<string, unknown>): Camera {
  return {
    id: doc.$id as string,
    name: (doc.name as string) ?? "",
    slug: (doc.slug as string) ?? "",
    sourceUrl: (doc.source_url as string) ?? "",
  };
}

export async function listCameras(): Promise<Camera[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.cameras);
  return res.documents.map((d) => toCamera(d as unknown as Record<string, unknown>));
}

export async function createCamera(name: string): Promise<Camera> {
  const { databases } = createBrowserClient();
  // Ensure a unique slug so multiple cameras (all named "New camera" by default)
  // don't collide on their playback path.
  const used = new Set((await listCameras()).map((c) => c.slug));
  const base = slugify(name);
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.cameras, ID.unique(), {
    name,
    slug,
    source_url: "",
  });
  return toCamera(doc as unknown as Record<string, unknown>);
}

export async function saveCamera(c: Camera): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.cameras, c.id, {
    name: c.name,
    slug: slugify(c.slug || c.name),
    source_url: c.sourceUrl,
  });
}

export async function deleteCamera(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.cameras, id);
}
