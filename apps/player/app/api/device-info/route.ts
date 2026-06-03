import { NextResponse } from "next/server";

/**
 * Local device endpoint. On a real Pi this is baked into the image and reads the
 * hardware MAC. In dev it accepts `?mac=` or falls back to DEVICE_MAC / a default.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const mac =
    url.searchParams.get("mac") ?? process.env.DEVICE_MAC ?? "AA:BB:CC:DD:EE:FF";
  return NextResponse.json({ mac: mac.toUpperCase() });
}
