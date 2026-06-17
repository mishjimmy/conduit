import type { Layer, PlaylistEntry } from "@conduit/types";

export interface MediaRef {
  url: string;
  type: "image" | "video";
}

/** Everything the player needs to run its assigned playlist locally + offline. */
export interface PlayerManifest {
  screenId: string;
  name: string | null;
  location: string | null;
  groupIds: string[];
  playlist: { id: string; entries: PlaylistEntry[]; loop: boolean } | null;
  layouts: Record<string, { name: string; layers: Layer[] }>;
  /** Resolved media referenced by the layouts, keyed by the layer's mediaId. */
  media: Record<string, MediaRef>;
}
