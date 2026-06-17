import { ID } from "appwrite";
import { COLLECTIONS } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

/** A camera registered for HLS playback. The player/CMS proxy its (often http)
 *  source over https at /cam/<slug>/… so it isn't blocked as mixed content. */
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
  if (!camera.sourceUrl) return "";
  let basename = "index.m3u8";
  try {
    const path = new URL(camera.sourceUrl).pathname;
    basename = path.slice(path.lastIndexOf("/") + 1) || "index.m3u8";
  } catch {
    /* keep default */
  }
  return `/cam/${camera.slug}/${basename}`;
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
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.cameras, ID.unique(), {
    name,
    slug: slugify(name),
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
