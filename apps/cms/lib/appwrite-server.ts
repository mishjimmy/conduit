import { Client, Databases, Account } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const project = process.env.APPWRITE_PROJECT_ID!;

/** Privileged client (API key) for server-side writes. */
export function createAdminClient() {
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(process.env.APPWRITE_API_KEY!);
  return { client, databases: new Databases(client) };
}

/** Client scoped to a caller's JWT — used to authenticate incoming requests. */
export function createUserClient(jwt: string) {
  const client = new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt);
  return { client, account: new Account(client) };
}
