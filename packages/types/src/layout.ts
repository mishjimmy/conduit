import { z } from "zod";
import { appwriteDocFields, positionSchema } from "./common";

/** Fields shared by every layer. */
const baseLayer = {
  id: z.string(),
  position: positionSchema,
  zIndex: z.number().int(),
};

export const slideshowItemSchema = z.object({
  mediaId: z.string(),
  durationSeconds: z.number().positive(),
});

export const slideshowLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("slideshow"),
  items: z.array(slideshowItemSchema),
  crossfadeSeconds: z.number().min(0).default(0.5),
});

export const videoLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("video"),
  hlsUrl: z.string(),
});

export const cameraGridLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("camera-grid"),
  /** Resolved single HLS stream produced by FFmpeg xstack compositing. */
  hlsUrl: z.string(),
  streamId: z.string(),
});

export const pipPositionSchema = z.enum(["TR", "TL", "BR", "BL"]);
export const pipLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("pip"),
  hlsUrl: z.string(),
  streamId: z.string(),
  pipCorner: pipPositionSchema.default("BR"),
});

export const graphicLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("graphic"),
  mediaId: z.string(),
});

export const messageLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("message"),
});

export const weatherLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("weather"),
  location: z.string(),
  units: z.enum(["metric", "imperial"]).default("metric"),
});

export const clockLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("clock"),
  format: z.enum(["12h", "24h"]).default("24h"),
  showDate: z.boolean().default(true),
});

export const embedLayerSchema = z.object({
  ...baseLayer,
  type: z.literal("embed"),
  url: z.string(),
});

export const layerSchema = z.discriminatedUnion("type", [
  slideshowLayerSchema,
  videoLayerSchema,
  cameraGridLayerSchema,
  pipLayerSchema,
  graphicLayerSchema,
  messageLayerSchema,
  weatherLayerSchema,
  clockLayerSchema,
  embedLayerSchema,
]);
export type Layer = z.infer<typeof layerSchema>;
export type LayerType = Layer["type"];

export const layoutSchema = z.object({
  ...appwriteDocFields,
  name: z.string(),
  resolution: z.string().default("1920x1080"),
  layers: z.array(layerSchema),
});
export type Layout = z.infer<typeof layoutSchema>;
