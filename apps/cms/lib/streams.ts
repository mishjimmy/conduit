import { ID } from "appwrite";
import { COLLECTIONS } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

/** A single RTSP camera, exposed by go2rtc as HLS. Grids are assembled in layouts. */
export interface StreamDoc {
  id: string;
  name: string;
  rtspUrl: string;
  hlsUrl: string;
}

function go2rtcBase(): string {
  return process.env.NEXT_PUBLIC_GO2RTC_URL ?? "http://localhost:1984";
}

/** go2rtc serves each stream as HLS keyed by name (we use the doc id). */
export function streamHlsUrl(id: string): string {
  return `${go2rtcBase()}/api/stream.m3u8?src=${id}`;
}

function toStream(doc: Record<string, unknown>): StreamDoc {
  const id = doc.$id as string;
  return {
    id,
    name: (doc.name as string) ?? "",
    rtspUrl: (doc.rtsp_url as string) ?? "",
    hlsUrl: (doc.hls_output_url as string) || streamHlsUrl(id),
  };
}

export async function listStreams(): Promise<StreamDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams);
  return res.documents.map((d) => toStream(d as unknown as Record<string, unknown>));
}

export async function createStream(name: string): Promise<StreamDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, ID.unique(), {
    name,
    composite_type: "single",
    rtsp_url: null,
    composite_config: "{}",
    hls_output_url: null,
  });
  const created = toStream(doc as unknown as Record<string, unknown>);
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, created.id, {
    hls_output_url: streamHlsUrl(created.id),
  });
  created.hlsUrl = streamHlsUrl(created.id);
  return created;
}

export async function saveStream(s: StreamDoc): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, s.id, {
    name: s.name,
    rtsp_url: s.rtspUrl,
    hls_output_url: streamHlsUrl(s.id),
  });
}

export async function deleteStream(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, id);
}
