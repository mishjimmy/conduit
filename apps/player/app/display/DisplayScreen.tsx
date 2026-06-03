"use client";

import type { CachedManifest } from "@/lib/cache";

/**
 * M1 placeholder for the assigned state. The real playlist runner + layout
 * renderer land in M2/M3; for now we confirm the device is paired and live.
 */
export function DisplayScreen({ manifest, online }: { manifest: CachedManifest; online: boolean }) {
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">Conduit · paired</p>
        <h1 className="mt-2 text-4xl font-semibold">{manifest.name ?? manifest.screenId}</h1>
        <p className="mt-1 text-white/60">{manifest.location ?? "—"}</p>
      </div>
      <p className="font-mono text-xs text-white/40">{manifest.screenId}</p>
      <p className="text-white/50">
        Playlist: {manifest.playlistId ?? "none assigned yet"}
      </p>

      {!online && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-amber-400/80">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          connection lost
        </div>
      )}
    </main>
  );
}
