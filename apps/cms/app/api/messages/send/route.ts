import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, topics, type MessageStyle } from "@conduit/types";
import { createAdminClient, createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

interface Body {
  screenId?: string | null;
  groupId?: string | null;
  isBroadcast?: boolean;
  body?: string;
  style?: MessageStyle;
  showAt?: string | null;
  hideAt?: string | null;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
  const isBroadcast = !!b.isBroadcast;
  if (!isBroadcast && !b.screenId && !b.groupId) {
    return NextResponse.json({ error: "a target is required" }, { status: 400 });
  }
  const style: MessageStyle = b.style ?? "info";
  const showAt = b.showAt || null;
  const hideAt = b.hideAt || null;

  const { databases } = createAdminClient();
  const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.messages, ID.unique(), {
    screen_id: isBroadcast || b.groupId ? null : b.screenId,
    group_id: b.groupId ?? null,
    body: b.body.trim(),
    style,
    show_at: showAt,
    hide_at: hideAt,
    is_broadcast: isBroadcast,
  });

  const topic = isBroadcast
    ? topics.broadcast()
    : b.groupId
      ? topics.groupMessage(b.groupId)
      : topics.message(b.screenId!);
  try {
    await publish(topic, {
      action: "show",
      id: doc.$id,
      body: b.body.trim(),
      style,
      show_at: showAt,
      hide_at: hideAt,
    });
  } catch {
    /* non-fatal: device may pick it up later via history (future) */
  }

  return NextResponse.json({ ok: true, id: doc.$id });
}
