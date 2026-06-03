import { describe, it, expect } from "vitest";
import {
  layoutSchema,
  playlistSchema,
  screenSchema,
  topics,
  HEARTBEAT_WILDCARD,
} from "./index";

describe("topics", () => {
  it("builds screen-scoped topics from the human-readable id", () => {
    expect(topics.state("brave-otter")).toBe("screens/brave-otter/state");
    expect(topics.heartbeat("brave-otter")).toBe("screens/brave-otter/heartbeat");
    expect(topics.broadcast()).toBe("screens/broadcast");
  });

  it("exposes a heartbeat wildcard for the bridge", () => {
    expect(HEARTBEAT_WILDCARD).toBe("screens/+/heartbeat");
  });
});

describe("schemas", () => {
  it("parses a screen document", () => {
    const screen = screenSchema.parse({
      $id: "brave-otter",
      $createdAt: "2026-01-01T00:00:00.000Z",
      $updatedAt: "2026-01-01T00:00:00.000Z",
      mac: "AA:BB:CC:DD:EE:FF",
      status: "pairing",
      pairing_code: "WOLF-3847",
    });
    expect(screen.group_ids).toEqual([]);
    expect(screen.name).toBeNull();
  });

  it("validates a layout with a discriminated layer union", () => {
    const layout = layoutSchema.parse({
      $id: "lay1",
      $createdAt: "2026-01-01T00:00:00.000Z",
      $updatedAt: "2026-01-01T00:00:00.000Z",
      name: "Lobby",
      layers: [
        {
          id: "l1",
          type: "clock",
          position: { x: 0, y: 0, width: 20, height: 10 },
          zIndex: 1,
          format: "24h",
          showDate: true,
        },
      ],
    });
    expect(layout.layers[0]?.type).toBe("clock");
  });

  it("parses a playlist with embedded entries", () => {
    const playlist = playlistSchema.parse({
      $id: "lobby-rotation",
      $createdAt: "2026-01-01T00:00:00.000Z",
      $updatedAt: "2026-01-01T00:00:00.000Z",
      name: "Lobby rotation",
      entries: [{ layout_id: "4x-cameras", duration_seconds: 300, transition: "hard_cut" }],
      loop: true,
    });
    expect(playlist.entries).toHaveLength(1);
  });
});
