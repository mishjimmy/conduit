import { z } from "zod";
import { layerSchema, type Layer, type LayerType } from "./layout";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

const DEFAULT_POSITION = { x: 10, y: 10, width: 30, height: 30 };

/** A sensible blank layer of the given type for the builder's "add layer". */
export function createLayer(type: LayerType, zIndex: number): Layer {
  const base = { id: newId(), position: { ...DEFAULT_POSITION }, zIndex };
  switch (type) {
    case "slideshow":
      return { ...base, type, items: [], crossfadeSeconds: 0.5 };
    case "video":
      return { ...base, type, hlsUrl: "" };
    case "camera-grid":
      return { ...base, type, hlsUrl: "", streamId: "" };
    case "pip":
      return { ...base, type, hlsUrl: "", streamId: "", pipCorner: "BR" };
    case "graphic":
      return { ...base, type, mediaId: "" };
    case "message":
      return { ...base, type };
    case "weather":
      return { ...base, type, location: "London", units: "metric" };
    case "clock":
      return { ...base, type, format: "24h", showDate: true };
    case "embed":
      return { ...base, type, url: "" };
  }
}

const layersArraySchema = z.array(layerSchema);

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
  const result = layersArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

/** Serialize a layer array for storage in the `layers` text column. */
export function serializeLayers(layers: Layer[]): string {
  return JSON.stringify(layers);
}

export const LAYER_TYPES: LayerType[] = [
  "slideshow",
  "video",
  "camera-grid",
  "pip",
  "graphic",
  "message",
  "weather",
  "clock",
  "embed",
];
