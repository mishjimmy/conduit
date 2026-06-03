import { ID } from "appwrite";
import { BUCKETS, COLLECTIONS } from "@conduit/types";
import { createBrowserClient, fileViewUrl, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export interface MediaDoc {
  id: string;
  name: string;
  type: "image" | "video";
  fileId: string;
  size: number | null;
  tags: string[];
  url: string;
}

function toMedia(doc: Record<string, unknown>): MediaDoc {
  const fileId = doc.appwrite_file_id as string;
  return {
    id: doc.$id as string,
    name: (doc.name as string) ?? "",
    type: (doc.type as MediaDoc["type"]) ?? "image",
    fileId,
    size: (doc.size as number) ?? null,
    tags: (doc.tags as string[]) ?? [],
    url: fileViewUrl(BUCKETS.media, fileId),
  };
}

export async function listMedia(): Promise<MediaDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.media);
  return res.documents.map((d) => toMedia(d as unknown as Record<string, unknown>));
}

export async function uploadMedia(file: File): Promise<MediaDoc> {
  const { databases, storage } = createBrowserClient();
  const type: MediaDoc["type"] = file.type.startsWith("video") ? "video" : "image";
  const uploaded = await storage.createFile(BUCKETS.media, ID.unique(), file);
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.media, ID.unique(), {
    name: file.name,
    type,
    appwrite_file_id: uploaded.$id,
    size: (uploaded as { sizeOriginal?: number }).sizeOriginal ?? file.size,
    tags: [],
  });
  return toMedia(doc as unknown as Record<string, unknown>);
}

export async function updateMediaTags(id: string, tags: string[]): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.media, id, { tags });
}

export async function deleteMedia(media: MediaDoc): Promise<void> {
  const { databases, storage } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.media, media.id);
  try {
    await storage.deleteFile(BUCKETS.media, media.fileId);
  } catch {
    /* file may already be gone */
  }
}
