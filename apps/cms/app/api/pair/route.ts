import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, topics } from "@conduit/types";
import { createAdminClient, createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

export async function POST(req: Request) {
  // 1. Authenticate the operator via their JWT.
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate input.
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    name?: string;
    location?: string;
    playlistId?: string | null;
  };
  const code = body.code?.trim().toUpperCase();
  if (!code || !body.name?.trim()) {
    return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
  }

  // 3. Look up the pairing screen by code (privileged).
  const { databases } = createAdminClient();
  const found = await databases.listDocuments(DATABASE_ID, COLLECTIONS.screens, [
    Query.equal("pairing_code", code),
    Query.equal("status", "pairing"),
    Query.limit(1),
  ]);
  const screen = found.documents[0];
  if (!screen) {
    return NextResponse.json({ error: "Invalid or already-used code" }, { status: 404 });
  }

  // 4. Reject expired codes.
  const expiresAt = (screen as { pairing_expires_at?: string | null }).pairing_expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired — a new one is shown on the screen" }, { status: 410 });
  }

  // 5. Assign and invalidate the code (single-use).
  const playlistId = body.playlistId ?? null;
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, screen.$id, {
    name: body.name.trim(),
    location: body.location?.trim() || null,
    playlist_id: playlistId,
    status: "active",
    pairing_code: "",
    pairing_expires_at: null,
  });

  // 6. Push the new state to the device (bridge is the fallback path).
  try {
    await publish(topics.state(screen.$id), {
      type: "state",
      status: "active",
      screenId: screen.$id,
      name: body.name.trim(),
      location: body.location?.trim() || null,
      playlistId,
    });
  } catch {
    // Non-fatal: the player's polling fallback will pick up the change.
  }

  return NextResponse.json({ ok: true, screenId: screen.$id });
}
