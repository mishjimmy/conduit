import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { BUCKETS, COLLECTIONS, DATABASE_ID } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";

/**
 * The device-side screenshot handler (M9) captures the display and POSTs it
 * here as multipart form-data: `screenId` + `file`. We store it in the
 * screenshots bucket and point the screen doc at the latest capture.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected multipart form-data" }, { status: 400 });

  const screenId = form.get("screenId");
  const file = form.get("file");
  if (typeof screenId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "screenId and file are required" }, { status: 400 });
  }

  const { databases, storage } = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await storage.createFile(
    BUCKETS.screenshots,
    ID.unique(),
    InputFile.fromBuffer(buffer, `${screenId}-${Date.now()}.png`),
  );

  await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, screenId, {
    last_screenshot: uploaded.$id,
  });

  return NextResponse.json({ ok: true, fileId: uploaded.$id });
}
