import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import mqtt from "mqtt";
import { Client, Databases, AppwriteException } from "node-appwrite";

// The bridge runs via tsx, which doesn't auto-load env files like Next does.
// Load the monorepo-root .env.local then .env (first definition wins).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
loadEnv({ path: [path.join(repoRoot, ".env.local"), path.join(repoRoot, ".env")] });
import {
  COLLECTIONS,
  DATABASE_ID,
  HEARTBEAT_WILDCARD,
  heartbeatSchema,
} from "@conduit/types";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";

const appwrite = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);
const databases = new Databases(appwrite);

function log(...args: unknown[]) {
  console.log(`[bridge ${new Date().toISOString()}]`, ...args);
}

/** screenId is the second path segment of `screens/{id}/heartbeat`. */
function screenIdFromTopic(topic: string): string | null {
  const parts = topic.split("/");
  return parts[0] === "screens" && parts[2] === "heartbeat" ? (parts[1] ?? null) : null;
}

async function handleHeartbeat(topic: string, raw: Buffer) {
  const screenId = screenIdFromTopic(topic);
  if (!screenId) return;

  const parsed = heartbeatSchema.safeParse(JSON.parse(raw.toString()));
  if (!parsed.success) {
    log("ignoring malformed heartbeat on", topic);
    return;
  }

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.screens, screenId, {
      last_seen: new Date().toISOString(),
      player_version: parsed.data.playerVersion,
    });
  } catch (err) {
    // A heartbeat from an unknown/deleted screen is non-fatal.
    if (err instanceof AppwriteException && err.code === 404) {
      log("heartbeat for unknown screen", screenId);
      return;
    }
    log("failed to update", screenId, err);
  }
}

function main() {
  log("connecting to", MQTT_URL);
  const client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `conduit-bridge-${Math.random().toString(16).slice(2, 8)}`,
  });

  client.on("connect", () => {
    log("connected; subscribing to heartbeats");
    client.subscribe(HEARTBEAT_WILDCARD, { qos: 1 });
  });
  client.on("reconnect", () => log("reconnecting…"));
  client.on("error", (err) => log("mqtt error", err.message));
  client.on("message", (topic, payload) => {
    void handleHeartbeat(topic, payload);
  });
}

main();
