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
    await createCamera("New camera");
    await refresh();
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
        Register an HLS source (http or https). Conduit proxies it over https at the playback
        URL shown below, so it isn&apos;t blocked as mixed content — pick the camera in a
        video/pip layer in the layout builder. Sources whose playlist uses relative segment
        paths work out of the box.
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
                    <span className={labelCls}>Source HLS URL</span>
                    <input
                      className={inputCls}
                      value={c.sourceUrl}
                      placeholder="http://192.168.1.50:8080/live/index.m3u8"
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
