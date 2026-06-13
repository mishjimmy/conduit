"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { createStream, deleteStream, listStreams, saveStream, type StreamDoc } from "@/lib/streams";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

export default function StreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    setStreams(await listStreams());
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account.get().then(refresh).catch(() => router.push("/login"));
  }, [router]);

  async function sync(action: "upsert" | "delete", s: { id: string; rtspUrl?: string }) {
    const { account } = createBrowserClient();
    const jwt = await account.createJWT();
    const res = await fetch("/api/streams/sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt.jwt}` },
      body: JSON.stringify({ action, id: s.id, rtspUrl: s.rtspUrl }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `go2rtc sync failed (${res.status})`);
    }
  }

  function patch(id: string, p: Partial<StreamDoc>) {
    setStreams((ss) => ss.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }

  async function onCreate() {
    const name = window.prompt("Camera name", "Lobby camera");
    if (!name) return;
    await createStream(name.trim());
    await refresh();
  }

  async function onSave(s: StreamDoc) {
    setNote(null);
    try {
      await saveStream(s);
      await sync("upsert", { id: s.id, rtspUrl: s.rtspUrl });
      setNote(`Saved "${s.name}" and applied to go2rtc.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onDelete(s: StreamDoc) {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    await deleteStream(s.id);
    await sync("delete", { id: s.id }).catch(() => undefined);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cameras</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/screens">
            Screens
          </Link>
          <Button onClick={onCreate}>Add camera</Button>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Each camera is an RTSP source exposed by go2rtc. Saving applies it live — no
        restart. Build a multiview by adding a <strong>camera-grid</strong> layer in a
        layout and picking cameras.
      </p>
      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : streams.length === 0 ? (
        <p className="text-muted-foreground">No cameras yet.</p>
      ) : (
        <div className="space-y-3">
          {streams.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle>
                  <input
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={s.name}
                    onChange={(e) => patch(s.id, { name: e.target.value })}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <label className="block">
                  <span className="text-xs text-muted-foreground">RTSP URL</span>
                  <input
                    className={inputCls}
                    value={s.rtspUrl}
                    placeholder="rtsp://user:pass@ip:554/stream"
                    onChange={(e) => patch(s.id, { rtspUrl: e.target.value })}
                  />
                </label>
                <div className="break-all text-xs text-muted-foreground">HLS: {s.hlsUrl}</div>
                <div className="flex items-center gap-3 pt-1">
                  <Button size="sm" onClick={() => onSave(s)}>
                    Save
                  </Button>
                  <button className="text-xs text-destructive underline" onClick={() => onDelete(s)}>
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
