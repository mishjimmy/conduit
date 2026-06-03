import { NextResponse } from "next/server";
import { COLLECTIONS, DATABASE_ID, topics } from "@conduit/types";
import { createAdminClient, createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

/** Set a screen's group memberships and nudge it to re-pull its manifest. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as { screenId?: string; groupIds?: string[] };
  if (!b.screenId) return NextResponse.json({ error: "screenId is required" }, { status: 400 });
  const groupIds = Array.isArray(b.groupIds) ? b.groupIds : [];

  const { databases } = createAdminClient();
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, b.screenId, {
    group_ids: groupIds,
  });

  // Trigger a manifest reload so the player re-subscribes to its group topics.
  try {
    await publish(topics.state(b.screenId), { type: "state", status: "active", screenId: b.screenId });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true });
}
