import { Client, Account, Databases } from "appwrite";

/** Web SDK client for browser use (auth session + Realtime). */
export function createBrowserClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
  };
}

export const PUBLIC_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "conduit";
