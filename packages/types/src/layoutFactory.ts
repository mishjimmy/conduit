import { layerSchema, type Layer, type LayerType } from "./layout";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

const DEFAULT_POSITION = { x: 10, y: 10, width: 30, height: 30 };

/** Backdrop covers the whole stage and renders below everything else. */
export const BACKDROP_POSITION = { x: 0, y: 0, width: 100, height: 100 };
export const BACKDROP_Z = 0;

/** A blank black backdrop — the layout's background layer. */
export function createBackdrop(): Extract<Layer, { type: "backdrop" }> {
  return {
    id: newId(),
    position: { ...BACKDROP_POSITION },
    zIndex: BACKDROP_Z,
    type: "backdrop",
    color: "#000000",
    mediaId: "",
    fit: "cover",
  };
}

/** A sensible blank layer of the given type for the builder's "add layer". */
export function createLayer(type: LayerType, zIndex: number): Layer {
  const base = { id: newId(), position: { ...DEFAULT_POSITION }, zIndex };
  switch (type) {
    case "backdrop":
      return createBackdrop();
    case "slideshow":
      return { ...base, type, items: [], crossfadeSeconds: 0.5 };
    case "video":
      return { ...base, type, hlsUrl: "" };
    case "pip":
      return { ...base, type, hlsUrl: "", streamId: "", pipCorner: "BR" };
    case "graphic":
      return { ...base, type, mediaId: "" };
    case "message":
      return { ...base, type, color: "#ffffff", fontSize: 5 };
    case "weather":
      return { ...base, type, location: "London", units: "metric", color: "#ffffff", fontSize: 10 };
    case "clock":
      return { ...base, type, format: "24h", showDate: true, color: "#ffffff", fontSize: 12 };
    case "embed":
      return { ...base, type, url: "" };
    case "label":
      return {
        ...base,
        type,
        text: "Label",
        color: "#ffffff",
        fontSize: 8,
        fontFamily: "sans-serif",
        fontWeight: "bold",
        align: "center",
      };
  }
}

/** Parse the `layers` column (stored as JSON text) into a typed array. */
export function parseLayers(raw: unknown): Layer[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  // Parse per-element so one unknown/removed layer type (e.g. a legacy
  // camera-grid) is dropped instead of discarding the whole layout.
  return value.flatMap((item) => {
    const result = layerSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

/** Serialize a layer array for storage in the `layers` text column. */
export function serializeLayers(layers: Layer[]): string {
  return JSON.stringify(layers);
}

export const LAYER_TYPES: LayerType[] = [
  "slideshow",
  "video",
  "pip",
  "graphic",
  "message",
  "weather",
  "clock",
  "embed",
  "label",
];
