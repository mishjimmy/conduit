import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, topics } from "@conduit/types";
import { createAdminClient, createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

/** Assign a playlist to every active screen in a group (bulk). */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as { groupId?: string; playlistId?: string | null };
  if (!b.groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  const playlistId = b.playlistId ?? null;

  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.screens, [
    Query.contains("group_ids", [b.groupId]),
    Query.limit(200),
  ]);

  await Promise.all(
    res.documents.map(async (screen) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, screen.$id, {
        playlist_id: playlistId,
      });
      try {
        await publish(topics.state(screen.$id), {
          type: "state",
          status: "active",
          screenId: screen.$id,
          playlistId,
        });
      } catch {
        /* non-fatal */
      }
    }),
  );

  return NextResponse.json({ ok: true, count: res.documents.length });
}
