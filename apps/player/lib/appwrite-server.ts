import { Client, Databases } from "node-appwrite";

/**
 * Privileged client used by the player's *server* routes (these run on the
 * Conduit server, not on the device, so they hold the full API key). The
 * device's own baked PLAYER_API_KEY is separate and only reads Storage.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return { client, databases: new Databases(client) };
}
