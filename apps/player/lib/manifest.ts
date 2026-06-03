import type { Layer, PlaylistEntry } from "@conduit/types";

/** Everything the player needs to run its assigned playlist locally + offline. */
export interface PlayerManifest {
  screenId: string;
  name: string | null;
  location: string | null;
  playlist: { id: string; entries: PlaylistEntry[]; loop: boolean } | null;
  layouts: Record<string, { name: string; layers: Layer[] }>;
}
