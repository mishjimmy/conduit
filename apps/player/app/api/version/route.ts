import { NextResponse } from "next/server";

/**
 * Current player bundle version. The device's boot-update script (M9) compares
 * this to its locally stored version and pulls a new bundle when they differ.
 */
export function GET() {
  return NextResponse.json({ version: process.env.NEXT_PUBLIC_PLAYER_VERSION ?? "0.0.0" });
}
