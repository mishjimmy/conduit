"use client";

import { useEffect } from "react";
import {
  LayoutRenderer,
  type ActiveMessage,
  type MediaResolver,
  type StreamResolver,
} from "@conduit/ui";
import type { PlayerManifest } from "@/lib/manifest";
import { usePlaylistRunner, type SlotView } from "@/lib/playlist";

export function PlaylistScreen({
  manifest,
  online,
  onLayoutChange,
  resolveMediaUrl,
  resolveStreamUrl,
  message,
}: {
  manifest: PlayerManifest;
  online: boolean;
  onLayoutChange?: (layoutId: string | null) => void;
  resolveMediaUrl?: MediaResolver;
  resolveStreamUrl?: StreamResolver;
  message?: ActiveMessage | null;
}) {
  const { slots, currentLayoutId } = usePlaylistRunner(manifest);

  useEffect(() => {
    onLayoutChange?.(currentLayoutId);
  }, [currentLayoutId, onLayoutChange]);

  const hasPlaylist = !!manifest.playlist && manifest.playlist.entries.length > 0;
  // Emergency messages take over the whole screen; others render in the message zone.
  const zoneMessage = message && message.style !== "emergency" ? message : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {hasPlaylist ? (
        slots.map((slot, i) => (
          <Slot
            key={i}
            slot={slot}
            manifest={manifest}
            resolveMediaUrl={resolveMediaUrl}
            resolveStreamUrl={resolveStreamUrl}
            message={zoneMessage}
          />
        ))
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
          <p className="text-sm uppercase tracking-widest text-white/50">Conduit · paired</p>
          <h1 className="text-3xl font-semibold">{manifest.name ?? manifest.screenId}</h1>
          <p className="text-white/60">{manifest.location ?? "—"}</p>
          <p className="mt-2 text-white/40">No playlist assigned yet.</p>
        </div>
      )}

      {message?.style === "emergency" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-12 text-center"
          style={{ background: "rgba(220,38,38,0.97)", animation: "conduit-emergency-in 300ms ease-out" }}
        >
          <p className="text-6xl font-bold leading-tight text-white">{message.body}</p>
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

function Slot({
  slot,
  manifest,
  resolveMediaUrl,
  resolveStreamUrl,
  message,
}: {
  slot: SlotView;
  manifest: PlayerManifest;
  resolveMediaUrl?: MediaResolver;
  resolveStreamUrl?: StreamResolver;
  message?: ActiveMessage | null;
}) {
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
      {slot.layoutId && (
        <LayoutRenderer
          layers={layers}
          resolveMediaUrl={resolveMediaUrl}
          resolveStreamUrl={resolveStreamUrl}
          message={message}
        />
      )}
    </div>
  );
}
