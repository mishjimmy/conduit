"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import {
  cameraPlaybackUrl,
  createCamera,
  deleteCamera,
  listCameras,
  saveCamera,
  type Camera,
} from "@/lib/cameras";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";
const labelCls = "text-xs text-muted-foreground";

export default function CamerasPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    setCameras(await listCameras());
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account.get().then(refresh).catch(() => router.push("/login"));
  }, [router]);

  function patch(id: string, p: Partial<Camera>) {
    setCameras((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }

  async function onCreate() {
    setNote(null);
    try {
      await createCamera("New camera");
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not add camera");
    }
  }

  async function onSave(c: Camera) {
    setNote(null);
    try {
      await saveCamera(c);
      await refresh();
      setNote(`Saved "${c.name}".`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onDelete(c: Camera) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await deleteCamera(c.id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cameras</h1>
        <Button onClick={onCreate}>Add camera</Button>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Enter a <strong>go2rtc stream name</strong> (e.g. <code>front-door</code>) for the
        lowest latency — it&apos;s played through go2rtc&apos;s WebRTC/MSE player. Or paste a
        full <strong>HLS URL</strong> to proxy that instead. Then pick the camera in a video/pip
        layer in the layout builder. (go2rtc needs <code>GO2RTC_UPSTREAM</code> set in the server
        env.)
      </p>
      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : cameras.length === 0 ? (
        <p className="text-muted-foreground">No cameras yet. Add one to use it in a layout.</p>
      ) : (
        <div className="space-y-3">
          {cameras.map((c) => {
            const url = cameraPlaybackUrl(c);
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>
                    <input
                      className={inputCls}
                      value={c.name}
                      onChange={(e) => patch(c.id, { name: e.target.value })}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <label className="block">
                    <span className={labelCls}>go2rtc stream name (or full HLS URL)</span>
                    <input
                      className={inputCls}
                      value={c.sourceUrl}
                      placeholder="front-door  —or—  http://192.168.1.50:8080/live/index.m3u8"
                      onChange={(e) => patch(c.id, { sourceUrl: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Slug (used in the playback URL)</span>
                    <input
                      className={inputCls}
                      value={c.slug}
                      onChange={(e) => patch(c.id, { slug: e.target.value })}
                    />
                  </label>
                  <div className="break-all text-xs text-muted-foreground">
                    Playback URL: {url ? <code>{url}</code> : "— set a source URL —"}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" onClick={() => onSave(c)}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
