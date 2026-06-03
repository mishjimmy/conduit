import { DATABASE_ID, COLLECTIONS } from "./constants";

/**
 * MQTT topic builders. `screenId` is the screen's human-readable Appwrite `$id`
 * (e.g. `brave-otter`), so topics read like `screens/brave-otter/state`.
 */
export const topics = {
  state: (screenId: string) => `screens/${screenId}/state`,
  message: (screenId: string) => `screens/${screenId}/message`,
  command: (screenId: string) => `screens/${screenId}/command`,
  heartbeat: (screenId: string) => `screens/${screenId}/heartbeat`,
  broadcast: () => `screens/broadcast`,
  groupMessage: (groupId: string) => `groups/${groupId}/message`,
} as const;

/** Wildcard subscription for the bridge to ingest every screen's heartbeat. */
export const HEARTBEAT_WILDCARD = "screens/+/heartbeat";

export type PlayerCommand = "reload" | "update" | "reboot" | "screenshot";

/** Payload published over MQTT to a screen's command topic (or broadcast). */
export interface CommandMessage {
  action: PlayerCommand;
}

/** Appwrite Realtime channel for a single screen document (CMS browser use). */
export const screenDocChannel = (screenId: string) =>
  `databases.${DATABASE_ID}.collections.${COLLECTIONS.screens}.documents.${screenId}`;

/** Appwrite Realtime channel for all screen documents. */
export const screensCollectionChannel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.screens}.documents`;
