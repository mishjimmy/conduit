import { Query } from "appwrite";
import { COLLECTIONS, type MessageStyle } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export interface MessageRow {
  id: string;
  body: string;
  style: MessageStyle;
  screenId: string | null;
  isBroadcast: boolean;
  showAt: string | null;
  hideAt: string | null;
  createdAt: string;
}

export async function listMessages(): Promise<MessageRow[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.messages, [
    Query.orderDesc("$createdAt"),
    Query.limit(25),
  ]);
  return res.documents.map((d) => {
    const doc = d as unknown as Record<string, unknown>;
    return {
      id: doc.$id as string,
      body: (doc.body as string) ?? "",
      style: (doc.style as MessageStyle) ?? "info",
      screenId: (doc.screen_id as string | null) ?? null,
      isBroadcast: (doc.is_broadcast as boolean) ?? false,
      showAt: (doc.show_at as string | null) ?? null,
      hideAt: (doc.hide_at as string | null) ?? null,
      createdAt: doc.$createdAt as string,
    };
  });
}
