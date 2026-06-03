import type { PlayerManifest } from "./manifest";

const KEY = "conduit.player.manifest";

/**
 * Minimal local cache (M1/M3 use localStorage; the device image will back this
 * with on-disk storage + media files). Lets a returning device skip pairing and
 * resume its playlist immediately, even with no server contact.
 */
export function readManifest(): PlayerManifest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayerManifest) : null;
  } catch {
    return null;
  }
}

export function writeManifest(m: PlayerManifest): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable — playback still proceeds from memory */
  }
}

export function clearManifest(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
