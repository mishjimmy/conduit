import { COLLECTIONS, DATABASE_ID } from "@conduit/types";
import { createAdminClient } from "@/lib/appwrite-server";
import { generateGo2rtcYaml, type GenStream } from "@/lib/go2rtc";

function parseConfig(raw: string): { sources?: string[]; main?: string; pip?: string; corner?: GenStream["corner"] } {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Generate go2rtc.yml from the configured streams (download/copy to the broker host). */
export async function GET() {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.go2rtcStreams);

  const streams: GenStream[] = res.documents.map((d) => {
    const doc = d as unknown as Record<string, unknown>;
    const cfg = parseConfig((doc.composite_config as string) ?? "{}");
    return {
      id: doc.$id as string,
      name: (doc.name as string) ?? "",
      type: ((doc.composite_type as string) ?? "single") as GenStream["type"],
      rtspUrl: (doc.rtsp_url as string) ?? "",
      sources: cfg.sources ?? [],
      main: cfg.main ?? "",
      pip: cfg.pip ?? "",
      corner: cfg.corner ?? "BR",
    };
  });

  return new Response(generateGo2rtcYaml(streams), {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      "content-disposition": 'attachment; filename="go2rtc.yml"',
    },
  });
}
