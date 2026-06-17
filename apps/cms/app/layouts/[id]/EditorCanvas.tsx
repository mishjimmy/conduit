"use client";

import { useRef } from "react";
import { LayoutRenderer, type MediaResolver } from "@conduit/ui";
import type { Layer, LayerType, Position } from "@conduit/types";

const MIN = 5; // minimum layer size, in % of the stage
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** 8 resize handles: position classes + which edges each one drives. */
const HANDLES: { dir: string; cls: string; cursor: string }[] = [
  { dir: "nw", cls: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
  { dir: "n", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
  { dir: "ne", cls: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
  { dir: "e", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { dir: "se", cls: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  { dir: "s", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
  { dir: "sw", cls: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  { dir: "w", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

export interface EditorCanvasProps {
  renderLayers: Layer[];
  /** Interactive content layers (no backdrop), with derived z-index. */
  content: Layer[];
  selectedId: string | null;
  resolveMediaUrl?: MediaResolver;
  onSelect: (id: string | null) => void;
  onChangePosition: (id: string, pos: Position) => void;
  onDropNewLayer: (type: LayerType, point: { x: number; y: number }) => void;
}

export function EditorCanvas({
  renderLayers,
  content,
  selectedId,
  resolveMediaUrl,
  onSelect,
  onChangePosition,
  onDropNewLayer,
}: EditorCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  function dragGesture(e: React.PointerEvent, compute: (dx: number, dy: number) => void) {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      compute(dx, dy);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startMove(e: React.PointerEvent, layer: Layer) {
    onSelect(layer.id);
    const s = { ...layer.position };
    dragGesture(e, (dx, dy) =>
      onChangePosition(layer.id, {
        ...s,
        x: clamp(s.x + dx, 0, 100 - s.width),
        y: clamp(s.y + dy, 0, 100 - s.height),
      }),
    );
  }

  function startResize(e: React.PointerEvent, layer: Layer, dir: string) {
    onSelect(layer.id);
    const s = { ...layer.position };
    const L = dir.includes("w");
    const R = dir.includes("e");
    const T = dir.includes("n");
    const B = dir.includes("s");
    dragGesture(e, (dx, dy) => {
      let { x, y, width, height } = s;
      if (L) {
        x = clamp(s.x + dx, 0, s.x + s.width - MIN);
        width = s.width + (s.x - x);
      }
      if (R) width = clamp(s.width + dx, MIN, 100 - s.x);
      if (T) {
        y = clamp(s.y + dy, 0, s.y + s.height - MIN);
        height = s.height + (s.y - y);
      }
      if (B) height = clamp(s.height + dy, MIN, 100 - s.y);
      onChangePosition(layer.id, { x, y, width, height });
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-layer-type") as LayerType;
    const stage = stageRef.current;
    if (!type || !stage) return;
    const rect = stage.getBoundingClientRect();
    onDropNewLayer(type, {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }

  return (
    <section className="flex min-w-0 flex-1 items-center justify-center bg-neutral-900 p-6">
      <div
        ref={stageRef}
        className="relative aspect-video w-full max-w-5xl shadow-lg"
        onPointerDown={() => onSelect(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <LayoutRenderer layers={renderLayers} resolveMediaUrl={resolveMediaUrl} />

        {/* interaction overlay */}
        <div className="absolute inset-0">
          {content.map((layer) => {
            const sel = layer.id === selectedId;
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => startMove(e, layer)}
                style={{
                  position: "absolute",
                  left: `${layer.position.x}%`,
                  top: `${layer.position.y}%`,
                  width: `${layer.position.width}%`,
                  height: `${layer.position.height}%`,
                  zIndex: sel ? 9999 : layer.zIndex,
                  cursor: "move",
                  outline: sel ? "2px solid var(--primary)" : "1px dashed rgba(255,255,255,0.35)",
                }}
              >
                {sel &&
                  HANDLES.map((h) => (
                    <span
                      key={h.dir}
                      onPointerDown={(e) => startResize(e, layer, h.dir)}
                      style={{ cursor: h.cursor }}
                      className={`absolute size-2.5 rounded-sm border border-white bg-primary ${h.cls}`}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
