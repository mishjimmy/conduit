import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, parseEntries, parseLayers, type PlaylistEntry } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";
import type { PlayerManifest } from "@/lib/manifest";

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

  return NextResponse.json(manifest);
}
