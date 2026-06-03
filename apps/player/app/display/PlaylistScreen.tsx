"use client";

import { useEffect } from "react";
import { LayoutRenderer } from "@conduit/ui";
import type { PlayerManifest } from "@/lib/manifest";
import { usePlaylistRunner, type SlotView } from "@/lib/playlist";

export function PlaylistScreen({
  manifest,
  online,
  onLayoutChange,
}: {
  manifest: PlayerManifest;
  online: boolean;
  onLayoutChange?: (layoutId: string | null) => void;
}) {
  const { slots, currentLayoutId } = usePlaylistRunner(manifest);

  useEffect(() => {
    onLayoutChange?.(currentLayoutId);
  }, [currentLayoutId, onLayoutChange]);

  const hasPlaylist = !!manifest.playlist && manifest.playlist.entries.length > 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {hasPlaylist ? (
        slots.map((slot, i) => <Slot key={i} slot={slot} manifest={manifest} />)
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
          <p className="text-sm uppercase tracking-widest text-white/50">Conduit · paired</p>
          <h1 className="text-3xl font-semibold">{manifest.name ?? manifest.screenId}</h1>
          <p className="text-white/60">{manifest.location ?? "—"}</p>
          <p className="mt-2 text-white/40">No playlist assigned yet.</p>
        </div>
      )}

      {!online && (
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 text-xs text-amber-400/80">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          connection lost
        </div>
      )}
    </div>
  );
}

function Slot({ slot, manifest }: { slot: SlotView; manifest: PlayerManifest }) {
  const layers = slot.layoutId ? (manifest.layouts[slot.layoutId]?.layers ?? []) : [];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: slot.opacity,
        transition: `opacity ${slot.transMs}ms ease-in-out`,
      }}
    >
      {slot.layoutId && <LayoutRenderer layers={layers} />}
    </div>
  );
}
