import { Client, Account, Databases, Storage } from "appwrite";

/** Web SDK client for browser use (auth session + Realtime). */
export function createBrowserClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

export const PUBLIC_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "conduit";

/** Public storage view URL (the media bucket is read("any")). */
export function fileViewUrl(bucketId: string, fileId: string): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${project}`;
}
