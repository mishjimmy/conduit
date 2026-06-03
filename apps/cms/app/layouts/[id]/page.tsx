"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, LayoutRenderer } from "@conduit/ui";
import {
  createLayer,
  LAYER_TYPES,
  type Layer,
  type LayerType,
} from "@conduit/types";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { getLayout, saveLayout } from "@/lib/layouts";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";
const labelCls = "text-xs text-muted-foreground";

export default function LayoutBuilderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved">("loading");

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(async () => {
        const layout = await getLayout(id);
        setName(layout.name);
        setLayers(layout.layers);
        setSelectedId(layout.layers[0]?.id ?? null);
        setStatus("ready");
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  function patchLayer(layerId: string, patch: Record<string, unknown>) {
    setLayers((ls) => ls.map((l) => (l.id === layerId ? ({ ...l, ...patch } as Layer) : l)));
    setStatus("ready");
  }

  function patchPosition(layerId: string, axis: "x" | "y" | "width" | "height", value: number) {
    setLayers((ls) =>
      ls.map((l) =>
        l.id === layerId ? ({ ...l, position: { ...l.position, [axis]: value } } as Layer) : l,
      ),
    );
    setStatus("ready");
  }

  function addLayer(type: LayerType) {
    const nextZ = layers.reduce((max, l) => Math.max(max, l.zIndex), 0) + 1;
    const layer = createLayer(type, nextZ);
    setLayers((ls) => [...ls, layer]);
    setSelectedId(layer.id);
    setStatus("ready");
  }

  function removeLayer(layerId: string) {
    setLayers((ls) => ls.filter((l) => l.id !== layerId));
    if (selectedId === layerId) setSelectedId(null);
    setStatus("ready");
  }

  async function save() {
    setStatus("saving");
    await saveLayout(id, name, layers);
    setStatus("saved");
  }

  if (status === "loading") {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="flex h-screen flex-col">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-border p-3">
        <button className="text-sm text-primary underline" onClick={() => router.push("/layouts")}>
          ← Layouts
        </button>
        <input
          className="max-w-xs flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <a
          className="text-sm text-primary underline"
          href={`http://localhost:3001/preview?layoutId=${id}`}
          target="_blank"
          rel="noreferrer"
        >
          Open on player ↗
        </a>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Unsaved changes"}
          </span>
          <Button onClick={save} disabled={status === "saving"}>
            Save
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left panel */}
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border p-3">
          <div className="mb-3">
            <label className={labelCls}>Add layer</label>
            <select
              className={inputCls}
              value=""
              onChange={(e) => {
                if (e.target.value) addLayer(e.target.value as LayerType);
                e.target.value = "";
              }}
            >
              <option value="">+ choose type…</option>
              {LAYER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <ul className="mb-4 space-y-1">
            {layers.map((l) => (
              <li key={l.id}>
                <button
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm ${
                    l.id === selectedId ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedId(l.id)}
                >
                  <span>
                    {l.type} <span className="text-xs text-muted-foreground">z{l.zIndex}</span>
                  </span>
                </button>
              </li>
            ))}
            {layers.length === 0 && <li className="text-sm text-muted-foreground">No layers yet.</li>}
          </ul>

          {selected && (
            <LayerFields
              layer={selected}
              onPatch={(p) => patchLayer(selected.id, p)}
              onPatchPos={(axis, v) => patchPosition(selected.id, axis, v)}
              onRemove={() => removeLayer(selected.id)}
            />
          )}
        </aside>

        {/* preview */}
        <section className="flex min-w-0 flex-1 items-center justify-center bg-neutral-900 p-6">
          <div className="aspect-video w-full max-w-5xl shadow-lg">
            <LayoutRenderer layers={layers} showZoneOutlines />
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------------- per-layer field editor ---------------- */

function LayerFields({
  layer,
  onPatch,
  onPatchPos,
  onRemove,
}: {
  layer: Layer;
  onPatch: (patch: Record<string, unknown>) => void;
  onPatchPos: (axis: "x" | "y" | "width" | "height", value: number) => void;
  onRemove: () => void;
}) {
  const num = (v: string) => Math.max(0, Math.min(100, Number(v) || 0));

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium capitalize">{layer.type}</h3>
        <button className="text-xs text-destructive underline" onClick={onRemove}>
          Remove
        </button>
      </div>

      {/* position */}
      <div className="grid grid-cols-2 gap-2">
        {(["x", "y", "width", "height"] as const).map((axis) => (
          <label key={axis} className="block">
            <span className={labelCls}>{axis} %</span>
            <input
              type="number"
              className={inputCls}
              value={layer.position[axis]}
              onChange={(e) => onPatchPos(axis, num(e.target.value))}
            />
          </label>
        ))}
        <label className="block">
          <span className={labelCls}>z-index</span>
          <input
            type="number"
            className={inputCls}
            value={layer.zIndex}
            onChange={(e) => onPatch({ zIndex: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <TypeFields layer={layer} onPatch={onPatch} />
    </div>
  );
}

function TypeFields({
  layer,
  onPatch,
}: {
  layer: Layer;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  switch (layer.type) {
    case "clock":
      return (
        <div className="space-y-2">
          <label className="block">
            <span className={labelCls}>Format</span>
            <select
              className={inputCls}
              value={layer.format}
              onChange={(e) => onPatch({ format: e.target.value })}
            >
              <option value="24h">24h</option>
              <option value="12h">12h</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={layer.showDate}
              onChange={(e) => onPatch({ showDate: e.target.checked })}
            />
            Show date
          </label>
        </div>
      );
    case "weather":
      return (
        <div className="space-y-2">
          <label className="block">
            <span className={labelCls}>Location</span>
            <input
              className={inputCls}
              value={layer.location}
              onChange={(e) => onPatch({ location: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Units</span>
            <select
              className={inputCls}
              value={layer.units}
              onChange={(e) => onPatch({ units: e.target.value })}
            >
              <option value="metric">metric (°C)</option>
              <option value="imperial">imperial (°F)</option>
            </select>
          </label>
        </div>
      );
    case "embed":
      return (
        <label className="block">
          <span className={labelCls}>URL</span>
          <input
            className={inputCls}
            value={layer.url}
            placeholder="https://…"
            onChange={(e) => onPatch({ url: e.target.value })}
          />
        </label>
      );
    case "graphic":
      return (
        <label className="block">
          <span className={labelCls}>Image URL (media library in M4)</span>
          <input
            className={inputCls}
            value={layer.mediaId}
            placeholder="https://…/logo.png"
            onChange={(e) => onPatch({ mediaId: e.target.value })}
          />
        </label>
      );
    case "video":
    case "camera-grid":
    case "pip":
      return (
        <label className="block">
          <span className={labelCls}>HLS URL (server compositing in M7)</span>
          <input
            className={inputCls}
            value={layer.hlsUrl}
            placeholder="https://…/stream.m3u8"
            onChange={(e) => onPatch({ hlsUrl: e.target.value })}
          />
        </label>
      );
    case "slideshow":
      return <SlideshowFields layer={layer} onPatch={onPatch} />;
    case "message":
      return <p className={labelCls}>Driven by the messages system (M5). Empty when idle.</p>;
    default:
      return null;
  }
}

function SlideshowFields({
  layer,
  onPatch,
}: {
  layer: Extract<Layer, { type: "slideshow" }>;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const items = layer.items;
  const setItems = (next: typeof items) => onPatch({ items: next });

  return (
    <div className="space-y-2">
      <label className="block">
        <span className={labelCls}>Crossfade (s)</span>
        <input
          type="number"
          step="0.1"
          className={inputCls}
          value={layer.crossfadeSeconds}
          onChange={(e) => onPatch({ crossfadeSeconds: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input
              className={inputCls}
              placeholder="image/video URL"
              value={item.mediaId}
              onChange={(e) =>
                setItems(items.map((it, j) => (j === i ? { ...it, mediaId: e.target.value } : it)))
              }
            />
            <input
              type="number"
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={item.durationSeconds}
              onChange={(e) =>
                setItems(
                  items.map((it, j) =>
                    j === i ? { ...it, durationSeconds: Math.max(1, Number(e.target.value) || 1) } : it,
                  ),
                )
              }
            />
            <button
              className="px-1 text-destructive"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-primary underline"
        onClick={() => setItems([...items, { mediaId: "", durationSeconds: 8 }])}
      >
        + add item
      </button>
    </div>
  );
}
