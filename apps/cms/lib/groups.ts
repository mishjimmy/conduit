import { ID } from "appwrite";
import { COLLECTIONS } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export interface GroupDoc {
  id: string;
  name: string;
  description: string | null;
}

function toGroup(doc: Record<string, unknown>): GroupDoc {
  return {
    id: doc.$id as string,
    name: (doc.name as string) ?? "Untitled",
    description: (doc.description as string | null) ?? null,
  };
}

export async function listGroups(): Promise<GroupDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.groups);
  return res.documents.map((d) => toGroup(d as unknown as Record<string, unknown>));
}

export async function createGroup(name: string, description: string): Promise<GroupDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.groups, ID.unique(), {
    name,
    description: description || null,
  });
  return toGroup(doc as unknown as Record<string, unknown>);
}

export async function deleteGroup(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.groups, id);
}
