import { NextResponse } from "next/server";
import { topics } from "@conduit/types";
import { createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await createUserClient(jwt).account.get();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as {
    screenId?: string | null;
    groupId?: string | null;
    isBroadcast?: boolean;
  };
  if (!b.isBroadcast && !b.screenId && !b.groupId) {
    return NextResponse.json({ error: "a target is required" }, { status: 400 });
  }

  const topic = b.isBroadcast
    ? topics.broadcast()
    : b.groupId
      ? topics.groupMessage(b.groupId)
      : topics.message(b.screenId!);
  try {
    await publish(topic, { action: "clear" });
  } catch {
    /* non-fatal */
  }
  return NextResponse.json({ ok: true });
}
