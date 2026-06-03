import { z } from "zod";
import { appwriteDocFields } from "./common";

export const transitionSchema = z.enum(["hard_cut", "fade_black", "crossfade"]);
export type Transition = z.infer<typeof transitionSchema>;

/** Shape of an entry inside a playlist's embedded `entries[]` JSON. */
export const playlistEntrySchema = z.object({
  layout_id: z.string(),
  duration_seconds: z.number().positive(),
  transition: transitionSchema,
});
export type PlaylistEntry = z.infer<typeof playlistEntrySchema>;

export const playlistSchema = z.object({
  ...appwriteDocFields,
  name: z.string(),
  entries: z.array(playlistEntrySchema),
  loop: z.boolean().default(true),
});
export type Playlist = z.infer<typeof playlistSchema>;

const entriesArraySchema = z.array(playlistEntrySchema);

/** Parse the `entries` column (stored as JSON text) into a typed array. */
export function parseEntries(raw: unknown): PlaylistEntry[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  const result = entriesArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

/** Serialize playlist entries for storage in the `entries` text column. */
export function serializeEntries(entries: PlaylistEntry[]): string {
  return JSON.stringify(entries);
}

export const TRANSITIONS: Transition[] = ["hard_cut", "fade_black", "crossfade"];
