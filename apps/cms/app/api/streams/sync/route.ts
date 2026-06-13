import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/appwrite-server";
import { removeStream, upsertStream } from "@/lib/go2rtc-api";

/**
 * Push a camera's config into go2rtc live (no file copy / restart). The stream
 * is keyed in go2rtc by its Appwrite doc id; the player's HLS URL uses ?src=<id>.
 */
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
    action?: "upsert" | "delete";
    id?: string;
    rtspUrl?: string;
  };
  if (!b.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    if (b.action === "delete") {
      await removeStream(b.id);
    } else if (b.rtspUrl) {
      await upsertStream(b.id, b.rtspUrl);
    } else {
      // No source yet — make sure go2rtc isn't holding a stale entry.
      await removeStream(b.id);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "go2rtc sync failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
