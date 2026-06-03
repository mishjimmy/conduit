import { ID } from "appwrite";
import { COLLECTIONS } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "./appwrite-browser";

export type StreamType = "single" | "grid" | "pip";
export type PipCorner = "TR" | "TL" | "BR" | "BL";

export interface StreamDoc {
  id: string;
  name: string;
  type: StreamType;
  rtspUrl: string;
  sources: string[]; // grid: 4 rtsp urls
  main: string; // pip
  pip: string; // pip
  corner: PipCorner; // pip
  hlsUrl: string;
}

function go2rtcBase(): string {
  return process.env.NEXT_PUBLIC_GO2RTC_URL ?? "http://localhost:1984";
}

/** go2rtc exposes every stream as HLS keyed by the stream name (we use the doc id). */
export function streamHlsUrl(id: string): string {
  return `${go2rtcBase()}/api/stream.m3u8?src=${id}`;
}

function toStream(doc: Record<string, unknown>): StreamDoc {
  const id = doc.$id as string;
  const cfg = ((): { sources?: string[]; main?: string; pip?: string; corner?: PipCorner } => {
    try {
      return JSON.parse((doc.composite_config as string) || "{}");
    } catch {
      return {};
    }
  })();
  return {
    id,
    name: (doc.name as string) ?? "",
    type: (doc.composite_type as StreamType) ?? "single",
    rtspUrl: (doc.rtsp_url as string) ?? "",
    sources: cfg.sources ?? ["", "", "", ""],
    main: cfg.main ?? "",
    pip: cfg.pip ?? "",
    corner: cfg.corner ?? "BR",
    hlsUrl: (doc.hls_output_url as string) || streamHlsUrl(id),
  };
}

export async function listStreams(): Promise<StreamDoc[]> {
  const { databases } = createBrowserClient();
  const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams);
  return res.documents.map((d) => toStream(d as unknown as Record<string, unknown>));
}

export async function createStream(name: string, type: StreamType): Promise<StreamDoc> {
  const { databases } = createBrowserClient();
  const doc = await databases.createDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, ID.unique(), {
    name,
    composite_type: type,
    rtsp_url: null,
    composite_config: "{}",
    hls_output_url: null,
  });
  const created = toStream(doc as unknown as Record<string, unknown>);
  // Persist the computed HLS URL now that we have the id.
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
    composite_type: s.type,
    rtsp_url: s.type === "single" ? s.rtspUrl : null,
    composite_config:
      s.type === "grid"
        ? JSON.stringify({ sources: s.sources })
        : s.type === "pip"
          ? JSON.stringify({ main: s.main, pip: s.pip, corner: s.corner })
          : "{}",
    hls_output_url: streamHlsUrl(s.id),
  });
}

export async function deleteStream(id: string): Promise<void> {
  const { databases } = createBrowserClient();
  await databases.deleteDocument(PUBLIC_DATABASE_ID, COLLECTIONS.go2rtcStreams, id);
}
