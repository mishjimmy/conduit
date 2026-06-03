import { z } from "zod";
import { appwriteDocFields } from "./common";

export const screenStatusSchema = z.enum(["pairing", "active", "disabled"]);
export type ScreenStatus = z.infer<typeof screenStatusSchema>;

/** A display device. Its Appwrite `$id` is a human-readable slug, e.g. `brave-otter`. */
export const screenSchema = z.object({
  ...appwriteDocFields,
  mac: z.string(),
  name: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  playlist_id: z.string().nullable().default(null),
  status: screenStatusSchema,
  pairing_code: z.string().default(""),
  pairing_expires_at: z.string().nullable().default(null),
  last_seen: z.string().nullable().default(null),
  player_version: z.string().nullable().default(null),
  group_ids: z.array(z.string()).default([]),
});
export type Screen = z.infer<typeof screenSchema>;

/** Response from POST /api/screens/init */
export const screenInitResultSchema = z.object({
  screenId: z.string(),
  status: screenStatusSchema,
  pairingCode: z.string().nullable(),
  pairingExpiresAt: z.string().nullable(),
  playlistId: z.string().nullable(),
});
export type ScreenInitResult = z.infer<typeof screenInitResultSchema>;

/** Heartbeat published by the player every 30s. */
export const heartbeatSchema = z.object({
  screenId: z.string(),
  online: z.literal(true),
  currentLayoutId: z.string().nullable(),
  playerVersion: z.string(),
  ts: z.string(),
});
export type Heartbeat = z.infer<typeof heartbeatSchema>;
