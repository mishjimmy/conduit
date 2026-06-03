import { ID } from "appwrite";
import {
  COLLECTIONS,
  parseEntries,
  serializeEntries,
  type PlaylistEntry,
} from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export interface PlaylistDoc {
  id: string;
  name: string;
  entries: PlaylistEntry[];
  loop: boolean;
}

function toPlaylist(doc: Record<string, unknown>): PlaylistDoc {
  return {
    id: doc.$id as string,
    name: (doc.name as string) ?? "Untitled",
    entries: parseEntries(doc.entries),
    loop: (doc.loop as boolean) ?? true,
  };
}

export async function listPlaylists(): Promise<PlaylistDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.playlists);
  return res.documents.map(toPlaylist);
}

export async function getPlaylist(id: string): Promise<PlaylistDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.getDocument(PUBLIC_DATABASE_ID, COLLECTIONS.playlists, id);
  return toPlaylist(doc as unknown as Record<string, unknown>);
}

export async function createPlaylist(name: string): Promise<PlaylistDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.playlists, ID.unique(), {
    name,
    entries: "[]",
    loop: true,
  });
  return toPlaylist(doc as unknown as Record<string, unknown>);
}

export async function savePlaylist(
  id: string,
  name: string,
  entries: PlaylistEntry[],
  loop: boolean,
): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.playlists, id, {
    name,
    entries: serializeEntries(entries),
    loop,
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.playlists, id);
}
