import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import {
  BUCKETS,
  COLLECTIONS,
  DATABASE_ID,
  parseEntries,
  parseLayers,
  type Layer,
  type PlaylistEntry,
} from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";
import type { PlayerManifest } from "@/lib/manifest";

const isUrl = (s: string) => /^(https?:)?\/\//.test(s) || s.startsWith("/");

/** Collect the (non-URL) media doc ids referenced by a set of layers. */
function mediaIdsFromLayers(layers: Layer[]): string[] {
  const ids: string[] = [];
  for (const layer of layers) {
    if (layer.type === "graphic" && layer.mediaId) ids.push(layer.mediaId);
    if (layer.type === "slideshow") ids.push(...layer.items.map((i) => i.mediaId));
  }
  return ids.filter((id) => id && !isUrl(id));
}

/**
 * Everything the player needs to run its assigned playlist locally and offline:
 * the playlist entries plus every layout they reference, in one payload.
 */
export async function GET(req: Request) {
  const screenId = new URL(req.url).searchParams.get("screenId");
  if (!screenId) return NextResponse.json({ error: "screenId is required" }, { status: 400 });

  const { databases } = createAdminClient();

  let screen: { $id: string; name: string | null; location: string | null; playlist_id: string | null };
  try {
    screen = (await databases.getDocument(DATABASE_ID, COLLECTIONS.screens, screenId)) as never;
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }

  const manifest: PlayerManifest = {
    screenId: screen.$id,
    name: screen.name,
    location: screen.location,
    playlist: null,
    layouts: {},
    media: {},
  };

  if (!screen.playlist_id) return NextResponse.json(manifest);

  let entries: PlaylistEntry[] = [];
  let loop = true;
  try {
    const pl = (await databases.getDocument(DATABASE_ID, COLLECTIONS.playlists, screen.playlist_id)) as never as {
      $id: string;
      entries: string;
      loop: boolean;
    };
    entries = parseEntries(pl.entries);
    loop = pl.loop ?? true;
    manifest.playlist = { id: pl.$id, entries, loop };
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      return NextResponse.json(manifest); // playlist was deleted — treat as idle
    }
    throw err;
  }

  // Fetch each referenced layout once.
  const layoutIds = [...new Set(entries.map((e) => e.layout_id))];
  await Promise.all(
    layoutIds.map(async (lid) => {
      try {
        const doc = (await databases.getDocument(DATABASE_ID, COLLECTIONS.layouts, lid)) as never as {
          name: string;
          layers: string;
        };
        manifest.layouts[lid] = { name: doc.name, layers: parseLayers(doc.layers) };
      } catch (err) {
        if (!(err instanceof AppwriteException && err.code === 404)) throw err;
      }
    }),
  );

  // Resolve referenced media to public storage URLs (the media bucket is read("any")).
  const endpoint = process.env.APPWRITE_ENDPOINT!;
  const project = process.env.APPWRITE_PROJECT_ID!;
  const mediaIds = [
    ...new Set(Object.values(manifest.layouts).flatMap((l) => mediaIdsFromLayers(l.layers))),
  ];
  await Promise.all(
    mediaIds.map(async (mid) => {
      try {
        const doc = (await databases.getDocument(DATABASE_ID, COLLECTIONS.media, mid)) as never as {
          appwrite_file_id: string;
          type: "image" | "video";
        };
        manifest.media[mid] = {
          url: `${endpoint}/storage/buckets/${BUCKETS.media}/files/${doc.appwrite_file_id}/view?project=${project}`,
          type: doc.type,
        };
      } catch (err) {
        if (!(err instanceof AppwriteException && err.code === 404)) throw err;
      }
    }),
  );

  return NextResponse.json(manifest);
}
