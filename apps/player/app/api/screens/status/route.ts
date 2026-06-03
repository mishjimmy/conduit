import { NextResponse } from "next/server";
import { AppwriteException, Query } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, type ScreenInitResult } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";

interface ScreenDoc {
  $id: string;
  status: ScreenInitResult["status"];
  pairing_code: string;
  pairing_expires_at: string | null;
  playlist_id: string | null;
  name: string | null;
  location: string | null;
}

function toResult(doc: ScreenDoc) {
  const pairing = doc.status === "pairing";
  return {
    screenId: doc.$id,
    status: doc.status,
    name: doc.name,
    location: doc.location,
    playlistId: doc.playlist_id,
    pairingCode: pairing ? doc.pairing_code : null,
    pairingExpiresAt: pairing ? doc.pairing_expires_at : null,
  };
}

/**
 * Polling fallback for the pairing/assignment transition when MQTT is down.
 * Prefer `?screenId=` (the device has it from init); `?code=` works pre-pairing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const screenId = url.searchParams.get("screenId");
  const code = url.searchParams.get("code")?.toUpperCase();
  const { databases } = createAdminClient();

  if (screenId) {
    try {
      const doc = (await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.screens,
        screenId,
      )) as unknown as ScreenDoc;
      return NextResponse.json(toResult(doc));
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      throw err;
    }
  }

  if (code) {
    const found = await databases.listDocuments(DATABASE_ID, COLLECTIONS.screens, [
      Query.equal("pairing_code", code),
      Query.limit(1),
    ]);
    const doc = found.documents[0] as ScreenDoc | undefined;
    if (doc) return NextResponse.json(toResult(doc));
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
