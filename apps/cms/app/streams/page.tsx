"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import {
  createStream,
  deleteStream,
  listStreams,
  saveStream,
  type PipCorner,
  type StreamDoc,
  type StreamType,
} from "@/lib/streams";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";
const labelCls = "text-xs text-muted-foreground";
const CORNERS: PipCorner[] = ["TR", "TL", "BR", "BL"];

export default function StreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamDoc[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setStreams(await listStreams());
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(refresh)
      .catch(() => router.push("/login"));
  }, [router]);

  function patch(id: string, p: Partial<StreamDoc>) {
    setStreams((ss) => ss.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }
  function patchSource(id: string, i: number, value: string) {
    setStreams((ss) =>
      ss.map((s) => (s.id === id ? { ...s, sources: s.sources.map((u, j) => (j === i ? value : u)) } : s)),
    );
  }

  async function onCreate() {
    const name = window.prompt("Stream name", "Lobby camera");
    if (!name) return;
    const type = (window.prompt("Type: single, grid, or pip", "single") ?? "single").trim() as StreamType;
    await createStream(name.trim(), ["single", "grid", "pip"].includes(type) ? type : "single");
    await refresh();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Streams</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/screens">
            Screens
          </Link>
          <a className="text-sm text-primary underline" href="/api/go2rtc/config" target="_blank" rel="noreferrer">
            Download go2rtc.yml
          </a>
          <Button onClick={onCreate}>New stream</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : streams.length === 0 ? (
        <p className="text-muted-foreground">
          No streams yet. Add RTSP cameras and composites, then download go2rtc.yml for the broker host.
        </p>
      ) : (
        <div className="space-y-4">
          {streams.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <input
                    className="max-w-xs flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={s.name}
                    onChange={(e) => patch(s.id, { name: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">{s.type}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.type === "single" && (
                  <label className="block">
                    <span className={labelCls}>RTSP URL</span>
                    <input
                      className={inputCls}
                      value={s.rtspUrl}
                      placeholder="rtsp://user:pass@ip:554/stream"
                      onChange={(e) => patch(s.id, { rtspUrl: e.target.value })}
                    />
                  </label>
                )}

                {s.type === "grid" && (
                  <div className="space-y-1">
                    <span className={labelCls}>4 RTSP sources (2×2)</span>
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        className={inputCls}
                        value={s.sources[i] ?? ""}
                        placeholder={`rtsp source ${i + 1}`}
                        onChange={(e) => patchSource(s.id, i, e.target.value)}
                      />
                    ))}
                  </div>
                )}

                {s.type === "pip" && (
                  <div className="space-y-1">
                    <label className="block">
                      <span className={labelCls}>Main RTSP</span>
                      <input className={inputCls} value={s.main} onChange={(e) => patch(s.id, { main: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>PiP RTSP</span>
                      <input className={inputCls} value={s.pip} onChange={(e) => patch(s.id, { pip: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Corner</span>
                      <select
                        className={inputCls}
                        value={s.corner}
                        onChange={(e) => patch(s.id, { corner: e.target.value as PipCorner })}
                      >
                        {CORNERS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <div className="break-all text-xs text-muted-foreground">HLS: {s.hlsUrl}</div>

                <div className="flex items-center gap-3 pt-1">
                  <Button size="sm" onClick={() => saveStream(s)}>
                    Save
                  </Button>
                  <button
                    className="text-xs text-destructive underline"
                    onClick={async () => {
                      if (window.confirm("Delete this stream?")) {
                        await deleteStream(s.id);
                        await refresh();
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
