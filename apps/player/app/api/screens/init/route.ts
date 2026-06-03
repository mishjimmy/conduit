import { NextResponse } from "next/server";
import { AppwriteException, Query } from "node-appwrite";
import {
  COLLECTIONS,
  DATABASE_ID,
  PAIRING_CODE_TTL_MS,
  type ScreenInitResult,
} from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";
import { generateScreenSlug } from "@/lib/slug";
import { generatePairingCode } from "@/lib/pairing";

interface ScreenDoc {
  $id: string;
  status: ScreenInitResult["status"];
  pairing_code: string;
  pairing_expires_at: string | null;
  playlist_id: string | null;
}

function toResult(doc: ScreenDoc): ScreenInitResult {
  const pairing = doc.status === "pairing";
  return {
    screenId: doc.$id,
    status: doc.status,
    pairingCode: pairing ? doc.pairing_code : null,
    pairingExpiresAt: pairing ? doc.pairing_expires_at : null,
    playlistId: doc.playlist_id,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { mac?: string };
  const mac = body.mac?.trim().toUpperCase();
  if (!mac) return NextResponse.json({ error: "mac is required" }, { status: 400 });

  const { databases } = createAdminClient();

  // Existing screen for this MAC?
  const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.screens, [
    Query.equal("mac", mac),
    Query.limit(1),
  ]);
  const doc = existing.documents[0] as ScreenDoc | undefined;

  if (doc) {
    // Regenerate an expired pairing code so a stale screen recovers.
    if (doc.status === "pairing") {
      const expired = doc.pairing_expires_at && new Date(doc.pairing_expires_at).getTime() < Date.now();
      if (expired) {
        const updated = (await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, doc.$id, {
          pairing_code: generatePairingCode(),
          pairing_expires_at: new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString(),
        })) as unknown as ScreenDoc;
        return NextResponse.json(toResult(updated));
      }
    }
    return NextResponse.json(toResult(doc));
  }

  // New screen: create with a human-readable slug id, retrying on collisions.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = (await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.screens,
        generateScreenSlug(),
        {
          mac,
          status: "pairing",
          pairing_code: generatePairingCode(),
          pairing_expires_at: new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString(),
          group_ids: [],
        },
      )) as unknown as ScreenDoc;
      return NextResponse.json(toResult(created));
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 409) {
        // Either a slug collision (retry) or a concurrent create for this MAC.
        const race = await databases.listDocuments(DATABASE_ID, COLLECTIONS.screens, [
          Query.equal("mac", mac),
          Query.limit(1),
        ]);
        const raced = race.documents[0] as ScreenDoc | undefined;
        if (raced) return NextResponse.json(toResult(raced));
        continue; // slug clash — try another slug
      }
      throw err;
    }
  }

  return NextResponse.json({ error: "Could not allocate a screen id" }, { status: 500 });
}
