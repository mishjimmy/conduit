import type { ScreenInitResult } from "@conduit/types";

const KEY = "conduit.player.manifest";

export interface CachedManifest {
  screenId: string;
  status: ScreenInitResult["status"];
  name: string | null;
  location: string | null;
  playlistId: string | null;
  updatedAt: string;
}

/**
 * Minimal local cache (M1 uses localStorage; the device image will back this with
 * on-disk storage). Lets a returning device skip pairing and resume immediately.
 */
export function readManifest(): CachedManifest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedManifest) : null;
  } catch {
    return null;
  }
}

export function writeManifest(m: CachedManifest): void {
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
