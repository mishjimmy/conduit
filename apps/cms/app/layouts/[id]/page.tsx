"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants, cn, type MediaResolver } from "@conduit/ui";
import {
  BACKDROP_POSITION,
  createBackdrop,
  createLayer,
  LAYER_TYPES,
  type Layer,
  type LayerType,
  type Position,
} from "@conduit/types";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { getLayout, saveLayout } from "@/lib/layouts";
import { listMedia, type MediaDoc } from "@/lib/media";
import { cameraPlaybackUrl, listCameras, type Camera } from "@/lib/cameras";
import { MediaPicker } from "@/app/components/MediaPicker";
import { EditorCanvas } from "./EditorCanvas";
import { LayerIcon } from "./icons";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";
const labelCls = "text-xs text-muted-foreground";
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Kiosk-safe font families (each carries a generic fallback). */
const FONT_OPTIONS = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
  { label: "System UI", value: "system-ui" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

type Backdrop = Extract<Layer, { type: "backdrop" }>;
type OpenPicker = (apply: (mediaId: string) => void) => void;

export default function LayoutBuilderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [backdrop, setBackdrop] = useState<Backdrop | null>(null);
  const [content, setContent] = useState<Layer[]>([]); // bottom→top, no backdrop
  const [media, setMedia] = useState<MediaDoc[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved">("loading");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingApply = useRef<((mediaId: string) => void) | null>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(async () => {
        const [layout, mediaList, cameraList] = await Promise.all([
          getLayout(id),
          listMedia(),
          listCameras(),
        ]);
        const bd = layout.layers.find((l): l is Backdrop => l.type === "backdrop");
        const rest = layout.layers
          .filter((l) => l.type !== "backdrop")
          .sort((a, b) => a.zIndex - b.zIndex);
        setName(layout.name);
        setBackdrop(bd ?? createBackdrop());
        setContent(rest);
        setSelectedId(rest[0]?.id ?? null);
        setMedia(mediaList);
        setCameras(cameraList);
        setStatus("ready");
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  const resolveMediaUrl: MediaResolver = useMemo(() => {
    const map = new Map(media.map((m) => [m.id, m.url]));
    return (mediaId) =>
      map.get(mediaId) ?? (/^(https?:)?\/\//.test(mediaId) || mediaId.startsWith("/") ? mediaId : undefined);
  }, [media]);

  /** Content with derived z-index (array order = stacking, bottom→top). */
  const contentWithZ = useMemo(() => content.map((l, i) => ({ ...l, zIndex: i + 1 })), [content]);

  /** Everything the renderer draws: backdrop at the bottom, then content. */
  const renderLayers = useMemo<Layer[]>(() => {
    const out: Layer[] = [];
    if (backdrop) out.push({ ...backdrop, zIndex: 0, position: { ...BACKDROP_POSITION } });
    return out.concat(contentWithZ);
  }, [backdrop, contentWithZ]);

  const selected = content.find((l) => l.id === selectedId) ?? null;

  const openPicker: OpenPicker = (apply) => {
    pendingApply.current = apply;
    setPickerOpen(true);
  };

  function touch() {
    setStatus("ready");
  }

  function patchLayer(layerId: string, patch: Record<string, unknown>) {
    setContent((ls) => ls.map((l) => (l.id === layerId ? ({ ...l, ...patch } as Layer) : l)));
    touch();
  }
  function changePosition(layerId: string, position: Position) {
    setContent((ls) => ls.map((l) => (l.id === layerId ? ({ ...l, position } as Layer) : l)));
    touch();
  }
  function addLayer(type: LayerType, center?: { x: number; y: number }) {
    const layer = createLayer(type, content.length + 1);
    if (center) {
      const { width: w, height: h } = layer.position;
      layer.position = {
        ...layer.position,
        x: clamp(center.x - w / 2, 0, 100 - w),
        y: clamp(center.y - h / 2, 0, 100 - h),
      };
    }
    setContent((ls) => [...ls, layer]);
    setSelectedId(layer.id);
    touch();
  }
  function removeLayer(layerId: string) {
    setContent((ls) => ls.filter((l) => l.id !== layerId));
    if (selectedId === layerId) setSelectedId(null);
    touch();
  }
  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setContent((ls) => {
      const from = ls.findIndex((l) => l.id === draggedId);
      const to = ls.findIndex((l) => l.id === targetId);
      if (from < 0 || to < 0) return ls;
      const next = [...ls];
      const [moved] = next.splice(from, 1);
      if (!moved) return ls;
      next.splice(to, 0, moved);
      return next;
    });
    touch();
  }
  function updateBackdrop(patch: Partial<Backdrop>) {
    setBackdrop((b) => (b ? { ...b, ...patch } : b));
    touch();
  }
  async function save() {
    setStatus("saving");
    await saveLayout(id, name, renderLayers);
    setStatus("saved");
  }

  if (status === "loading") {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }

  // Layer panel lists top layer first (reverse of stacking order).
  const panelLayers = [...contentWithZ].reverse();

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border p-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/layouts")}>
          ← Layouts
        </Button>
        <input
          className="max-w-xs flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            touch();
          }}
        />
        <a
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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
        {/* left: palette + background */}
        <aside className="w-60 shrink-0 space-y-4 overflow-y-auto border-r border-border p-3">
          <div>
            <h3 className="mb-2 text-sm font-medium">Add layer</h3>
            <p className="mb-2 text-xs text-muted-foreground">Drag onto the canvas, or click to add.</p>
            <div className="grid grid-cols-2 gap-2">
              {LAYER_TYPES.map((t) => (
                <button
                  key={t}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-layer-type", t);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addLayer(t)}
                  className="flex cursor-grab flex-col items-center gap-1 rounded-md border border-border bg-card px-2 py-2 text-xs capitalize hover:border-primary/50 hover:bg-accent active:cursor-grabbing"
                >
                  <LayerIcon type={t} className="size-5 text-muted-foreground" />
                  {t}
                </button>
              ))}
            </div>
          </div>

          {backdrop && (
            <BackgroundPanel
              backdrop={backdrop}
              resolveMediaUrl={resolveMediaUrl}
              onChange={updateBackdrop}
              openPicker={openPicker}
            />
          )}
        </aside>

        <EditorCanvas
          renderLayers={renderLayers}
          content={contentWithZ}
          selectedId={selectedId}
          resolveMediaUrl={resolveMediaUrl}
          onSelect={setSelectedId}
          onChangePosition={changePosition}
          onDropNewLayer={addLayer}
        />

        {/* right: layers panel + inspector */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border">
          <div className="border-b border-border p-3">
            <h3 className="mb-2 text-sm font-medium">Layers</h3>
            <ul className="space-y-1">
              {panelLayers.map((l) => (
                <li
                  key={l.id}
                  draggable
                  onDragStart={() => (dragId.current = l.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId.current) reorder(dragId.current, l.id);
                    dragId.current = null;
                  }}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    l.id === selectedId ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <span className="cursor-grab text-muted-foreground active:cursor-grabbing">⠿</span>
                  <LayerIcon type={l.type} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate capitalize">{l.type}</span>
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(l.id);
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {panelLayers.length === 0 && (
                <li className="text-sm text-muted-foreground">No layers yet. Drag one in from the left.</li>
              )}
            </ul>
          </div>

          <div className="p-3">
            {selected ? (
              <LayerInspector
                layer={selected}
                onPatch={(p) => patchLayer(selected.id, p)}
                onChangePosition={(pos) => changePosition(selected.id, pos)}
                onRemove={() => removeLayer(selected.id)}
                openPicker={openPicker}
                cameras={cameras}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a layer to edit it.</p>
            )}
          </div>
        </aside>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) => pendingApply.current?.(m.id)}
      />
    </main>
  );
}

/* ---------------- background panel ---------------- */

function BackgroundPanel({
  backdrop,
  resolveMediaUrl,
  onChange,
  openPicker,
}: {
  backdrop: Backdrop;
  resolveMediaUrl: MediaResolver;
  onChange: (patch: Partial<Backdrop>) => void;
  openPicker: OpenPicker;
}) {
  const url = backdrop.mediaId ? resolveMediaUrl(backdrop.mediaId) : undefined;
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <h3 className="text-sm font-medium">Background</h3>

      <label className="flex items-center gap-2">
        <input
          type="color"
          className="size-8 cursor-pointer rounded border border-input bg-background"
          value={backdrop.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
        <input
          className={inputCls}
          value={backdrop.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </label>

      <div className="space-y-1">
        <span className={labelCls}>Image / video</span>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-16 w-full rounded-md border border-border object-cover" />
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openPicker((mediaId) => onChange({ mediaId }))}>
            {backdrop.mediaId ? "Change" : "Pick image"}
          </Button>
          {backdrop.mediaId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange({ mediaId: "" })}
            >
              Clear
            </Button>
          )}
        </div>
        {backdrop.mediaId && (
          <label className="block pt-1">
            <span className={labelCls}>Fit</span>
            <select
              className={inputCls}
              value={backdrop.fit}
              onChange={(e) => onChange({ fit: e.target.value as Backdrop["fit"] })}
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
              <option value="fill">fill (stretch)</option>
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

/* ---------------- per-layer inspector ---------------- */

function LayerInspector({
  layer,
  onPatch,
  onChangePosition,
  onRemove,
  openPicker,
  cameras,
}: {
  layer: Layer;
  onPatch: (patch: Record<string, unknown>) => void;
  onChangePosition: (pos: Position) => void;
  onRemove: () => void;
  openPicker: OpenPicker;
  cameras: Camera[];
}) {
  const num = (v: string) => Math.max(0, Math.min(100, Number(v) || 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium capitalize">{layer.type}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["x", "y", "width", "height"] as const).map((axis) => (
          <label key={axis} className="block">
            <span className={labelCls}>{axis} %</span>
            <input
              type="number"
              className={inputCls}
              value={Math.round(layer.position[axis])}
              onChange={(e) => onChangePosition({ ...layer.position, [axis]: num(e.target.value) })}
            />
          </label>
        ))}
      </div>

      <TypeFields layer={layer} onPatch={onPatch} openPicker={openPicker} cameras={cameras} />
    </div>
  );
}

/** Reusable Color + Size inputs for any text-bearing layer. */
function ColorSizeFields({
  color,
  fontSize,
  onPatch,
}: {
  color: string;
  fontSize: number;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div>
        <span className={labelCls}>Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="size-8 cursor-pointer rounded border border-input bg-background"
            value={color}
            onChange={(e) => onPatch({ color: e.target.value })}
          />
          <input className={inputCls} value={color} onChange={(e) => onPatch({ color: e.target.value })} />
        </div>
      </div>
      <label className="block">
        <span className={labelCls}>Size (% of height)</span>
        <input
          type="number"
          step="0.5"
          min="1"
          className={inputCls}
          value={fontSize}
          onChange={(e) => onPatch({ fontSize: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>
    </>
  );
}

function TypeFields({
  layer,
  onPatch,
  openPicker,
  cameras,
}: {
  layer: Layer;
  onPatch: (patch: Record<string, unknown>) => void;
  openPicker: OpenPicker;
  cameras: Camera[];
}) {
  switch (layer.type) {
    case "clock":
      return (
        <div className="space-y-2">
          <label className="block">
            <span className={labelCls}>Format</span>
            <select className={inputCls} value={layer.format} onChange={(e) => onPatch({ format: e.target.value })}>
              <option value="24h">24h</option>
              <option value="12h">12h</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={layer.showDate} onChange={(e) => onPatch({ showDate: e.target.checked })} />
            Show date
          </label>
          <ColorSizeFields color={layer.color} fontSize={layer.fontSize} onPatch={onPatch} />
        </div>
      );
    case "weather":
      return (
        <div className="space-y-2">
          <label className="block">
            <span className={labelCls}>Location</span>
            <input className={inputCls} value={layer.location} onChange={(e) => onPatch({ location: e.target.value })} />
          </label>
          <label className="block">
            <span className={labelCls}>Units</span>
            <select className={inputCls} value={layer.units} onChange={(e) => onPatch({ units: e.target.value })}>
              <option value="metric">metric (°C)</option>
              <option value="imperial">imperial (°F)</option>
            </select>
          </label>
          <ColorSizeFields color={layer.color} fontSize={layer.fontSize} onPatch={onPatch} />
        </div>
      );
    case "embed":
      return (
        <label className="block">
          <span className={labelCls}>URL</span>
          <input className={inputCls} value={layer.url} placeholder="https://…" onChange={(e) => onPatch({ url: e.target.value })} />
        </label>
      );
    case "graphic":
      return (
        <div className="space-y-1">
          <span className={labelCls}>Image</span>
          <input
            className={inputCls}
            value={layer.mediaId}
            placeholder="media id or URL"
            onChange={(e) => onPatch({ mediaId: e.target.value })}
          />
          <Button variant="outline" size="sm" onClick={() => openPicker((mediaId) => onPatch({ mediaId }))}>
            Pick from media…
          </Button>
        </div>
      );
    case "video":
    case "pip":
      return (
        <div className="space-y-1">
          {cameras.length > 0 && (
            <>
              <span className={labelCls}>Camera</span>
              <select
                className={inputCls}
                value={cameras.find((c) => cameraPlaybackUrl(c) === layer.hlsUrl)?.id ?? ""}
                onChange={(e) => {
                  const cam = cameras.find((c) => c.id === e.target.value);
                  if (cam) onPatch({ hlsUrl: cameraPlaybackUrl(cam) });
                }}
              >
                <option value="">— pick a camera —</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <span className={labelCls}>or HLS URL (.m3u8)</span>
          <input
            className={inputCls}
            value={layer.hlsUrl}
            placeholder="https://…/stream.m3u8"
            onChange={(e) => onPatch({ hlsUrl: e.target.value })}
          />
        </div>
      );
    case "label":
      return (
        <div className="space-y-2">
          <label className="block">
            <span className={labelCls}>Text</span>
            <textarea
              className={inputCls}
              rows={2}
              value={layer.text}
              onChange={(e) => onPatch({ text: e.target.value })}
            />
          </label>
          <ColorSizeFields color={layer.color} fontSize={layer.fontSize} onPatch={onPatch} />
          <label className="block">
            <span className={labelCls}>Font</span>
            <select
              className={inputCls}
              value={layer.fontFamily}
              onChange={(e) => onPatch({ fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelCls}>Weight</span>
              <select
                className={inputCls}
                value={layer.fontWeight}
                onChange={(e) => onPatch({ fontWeight: e.target.value })}
              >
                <option value="normal">normal</option>
                <option value="bold">bold</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Align</span>
              <select
                className={inputCls}
                value={layer.align}
                onChange={(e) => onPatch({ align: e.target.value })}
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </label>
          </div>
        </div>
      );
    case "slideshow":
      return <SlideshowFields layer={layer} onPatch={onPatch} openPicker={openPicker} />;
    case "message":
      return (
        <div className="space-y-2">
          <p className={labelCls}>
            Text/urgency come from the Messages system; the background follows the message style.
            Color and size below style how messages render in this zone.
          </p>
          <ColorSizeFields color={layer.color} fontSize={layer.fontSize} onPatch={onPatch} />
        </div>
      );
    default:
      return null;
  }
}

function SlideshowFields({
  layer,
  onPatch,
  openPicker,
}: {
  layer: Extract<Layer, { type: "slideshow" }>;
  onPatch: (patch: Record<string, unknown>) => void;
  openPicker: OpenPicker;
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
          <div key={i} className="space-y-1 rounded-md border border-border p-1">
            <div className="flex gap-1">
              <input
                className={inputCls}
                placeholder="media id or URL"
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
              <button className="px-1 text-destructive" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => openPicker((mediaId) => setItems(items.map((it, j) => (j === i ? { ...it, mediaId } : it))))}
            >
              Pick from media…
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setItems([...items, { mediaId: "", durationSeconds: 8 }])}
      >
        + Add item
      </Button>
    </div>
  );
}
