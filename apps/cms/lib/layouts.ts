import { ID } from "appwrite";
import { COLLECTIONS, parseLayers, serializeLayers, type Layer } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export interface LayoutDoc {
  id: string;
  name: string;
  resolution: string;
  layers: Layer[];
}

function toLayout(doc: Record<string, unknown>): LayoutDoc {
  return {
    id: doc.$id as string,
    name: (doc.name as string) ?? "Untitled",
    resolution: (doc.resolution as string) ?? "1920x1080",
    layers: parseLayers(doc.layers),
  };
}

export async function listLayouts(): Promise<LayoutDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.layouts);
  return res.documents.map(toLayout);
}

export async function getLayout(id: string): Promise<LayoutDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.getDocument(PUBLIC_DATABASE_ID, COLLECTIONS.layouts, id);
  return toLayout(doc as unknown as Record<string, unknown>);
}

export async function createLayout(name: string): Promise<LayoutDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.layouts, ID.unique(), {
    name,
    resolution: "1920x1080",
    layers: "[]",
  });
  return toLayout(doc as unknown as Record<string, unknown>);
}

export async function saveLayout(id: string, name: string, layers: Layer[]): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.layouts, id, {
    name,
    layers: serializeLayers(layers),
  });
}

export async function deleteLayout(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.layouts, id);
}
