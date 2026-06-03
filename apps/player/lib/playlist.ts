"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerManifest } from "./manifest";

const TRANSITION_MS = 700;

export interface SlotView {
  layoutId: string | null;
  opacity: number;
  transMs: number;
}

export interface RunnerView {
  slots: [SlotView, SlotView];
  currentLayoutId: string | null;
}

const HIDDEN: SlotView = { layoutId: null, opacity: 0, transMs: 0 };

/**
 * Runs a playlist entirely locally: shows each entry's layout for its duration,
 * then advances with the entry's transition (hard cut / fade-to-black / crossfade),
 * looping if configured. Two stacked slots over a black stage give us both
 * crossfade (cross-dissolve) and fade-to-black (both slots to 0 = black) without
 * a separate overlay.
 */
export function usePlaylistRunner(manifest: PlayerManifest | null): RunnerView {
  const entries = manifest?.playlist?.entries ?? [];
  const loop = manifest?.playlist?.loop ?? true;
  const playlistId = manifest?.playlist?.id ?? null;

  const [slotA, setSlotA] = useState<SlotView>(HIDDEN);
  const [slotB, setSlotB] = useState<SlotView>(HIDDEN);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);

  const layoutRefA = useRef<string | null>(null);
  const layoutRefB = useRef<string | null>(null);
  const activeRef = useRef<"A" | "B">("A");
  const indexRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t);

    const setSlot = (which: "A" | "B", s: SlotView) => {
      if (which === "A") {
        layoutRefA.current = s.layoutId;
        setSlotA(s);
      } else {
        layoutRefB.current = s.layoutId;
        setSlotB(s);
      }
    };
    const layoutOf = (which: "A" | "B") =>
      which === "A" ? layoutRefA.current : layoutRefB.current;

    const scheduleNext = (i: number) => {
      if (entries.length <= 1) return; // single (or no) entry: nothing to rotate to
      const entry = entries[i];
      if (!entry) return;
      push(setTimeout(advance, Math.max(1, entry.duration_seconds) * 1000));
    };

    function advance() {
      const n = entries.length;
      if (n === 0) return;
      let j = indexRef.current + 1;
      if (j >= n) {
        if (!loop) return; // hold on the last layout
        j = 0;
      }
      const next = entries[j]!;
      const active = activeRef.current;
      const inactive = active === "A" ? "B" : "A";

      if (next.transition === "hard_cut") {
        setSlot(inactive, { layoutId: next.layout_id, opacity: 1, transMs: 0 });
        setSlot(active, { layoutId: layoutOf(active), opacity: 0, transMs: 0 });
        commit(inactive, j);
        scheduleNext(j);
      } else if (next.transition === "crossfade") {
        setSlot(inactive, { layoutId: next.layout_id, opacity: 0, transMs: 0 });
        push(
          setTimeout(() => {
            setSlot(inactive, { layoutId: next.layout_id, opacity: 1, transMs: TRANSITION_MS });
            setSlot(active, { layoutId: layoutOf(active), opacity: 0, transMs: TRANSITION_MS });
          }, 20),
        );
        commit(inactive, j);
        scheduleNext(j);
      } else {
        // fade_black: active fades out (screen → black), then next fades in
        setSlot(active, { layoutId: layoutOf(active), opacity: 0, transMs: TRANSITION_MS / 2 });
        setSlot(inactive, { layoutId: next.layout_id, opacity: 0, transMs: 0 });
        push(
          setTimeout(() => {
            setSlot(inactive, { layoutId: next.layout_id, opacity: 1, transMs: TRANSITION_MS / 2 });
            commit(inactive, j);
            scheduleNext(j);
          }, TRANSITION_MS / 2),
        );
      }
    }

    function commit(active: "A" | "B", j: number) {
      activeRef.current = active;
      indexRef.current = j;
      setCurrentLayoutId(entries[j]?.layout_id ?? null);
    }

    // (re)start whenever the assigned playlist changes
    clearTimers();
    const first = entries[0];
    if (!first) {
      setSlot("A", HIDDEN);
      setSlot("B", HIDDEN);
      setCurrentLayoutId(null);
      return clearTimers;
    }
    activeRef.current = "A";
    indexRef.current = 0;
    setSlot("A", { layoutId: first.layout_id, opacity: 1, transMs: 0 });
    setSlot("B", HIDDEN);
    setCurrentLayoutId(first.layout_id);
    scheduleNext(0);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId, entries.length, loop]);

  return { slots: [slotA, slotB], currentLayoutId };
}
