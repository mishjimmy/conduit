/** Appwrite database + collection identifiers. Keep in sync with appwrite.json. */
export const DATABASE_ID = "conduit";

export const COLLECTIONS = {
  screens: "screens",
  groups: "groups",
  layouts: "layouts",
  playlists: "playlists",
  messages: "messages",
  media: "media",
  go2rtcStreams: "go2rtc_streams",
} as const;

export const BUCKETS = {
  media: "media",
  screenshots: "screenshots",
} as const;

/** Player heartbeat interval and pairing code lifetime. */
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const POLL_INTERVAL_MS = 30_000;
export const PAIRING_CODE_TTL_MS = 10 * 60_000;
