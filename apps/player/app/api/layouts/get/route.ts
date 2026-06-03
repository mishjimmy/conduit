import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, parseLayers } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";

/** Fetch a layout (with parsed layers) for the player to render. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { databases } = createAdminClient();
  try {
    const doc = (await databases.getDocument(DATABASE_ID, COLLECTIONS.layouts, id)) as unknown as {
      $id: string;
      name: string;
      layers: string;
    };
    return NextResponse.json({ id: doc.$id, name: doc.name, layers: parseLayers(doc.layers) });
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }
}
