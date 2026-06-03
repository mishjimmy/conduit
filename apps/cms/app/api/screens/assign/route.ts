import { NextResponse } from "next/server";
import { COLLECTIONS, DATABASE_ID, topics } from "@conduit/types";
import { createAdminClient, createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

/** Assign (or clear) a screen's playlist and push the change to the device. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { screenId?: string; playlistId?: string | null };
  if (!body.screenId) return NextResponse.json({ error: "screenId is required" }, { status: 400 });
  const playlistId = body.playlistId ?? null;

  const { databases } = createAdminClient();
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, body.screenId, {
    playlist_id: playlistId,
  });

  try {
    await publish(topics.state(body.screenId), {
      type: "state",
      status: "active",
      screenId: body.screenId,
      playlistId,
    });
  } catch {
    // Non-fatal: the player's polling fallback will pick up the change.
  }

  return NextResponse.json({ ok: true });
}
