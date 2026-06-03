import { NextResponse } from "next/server";
import { topics, type PlayerCommand } from "@conduit/types";
import { createUserClient } from "@/lib/appwrite-server";
import { publish } from "@/lib/mqtt";

const ACTIONS: PlayerCommand[] = ["reload", "update", "reboot", "screenshot"];

/** Publish a control command to a screen (or all screens via broadcast). */
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
    isBroadcast?: boolean;
    action?: PlayerCommand;
  };
  if (!b.action || !ACTIONS.includes(b.action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  if (!b.isBroadcast && !b.screenId) {
    return NextResponse.json({ error: "screenId or isBroadcast required" }, { status: 400 });
  }

  const topic = b.isBroadcast ? topics.broadcast() : topics.command(b.screenId!);
  try {
    await publish(topic, { action: b.action });
  } catch {
    /* non-fatal */
  }
  return NextResponse.json({ ok: true });
}
