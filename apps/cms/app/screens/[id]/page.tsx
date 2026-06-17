"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import {
  BUCKETS,
  COLLECTIONS,
  screenDocChannel,
  type PlayerCommand,
  type Screen,
} from "@conduit/types";
import { createBrowserClient, fileViewUrl, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";

const NOVNC_TEMPLATE =
  process.env.NEXT_PUBLIC_NOVNC_URL_TEMPLATE ?? "http://{host}:6080/vnc.html?autoconnect=1&resize=scale";

function online(lastSeen: string | null) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export default function ScreenDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [vncHost, setVncHost] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const { account, databases, client } = createBrowserClient();
    let unsub: (() => void) | undefined;

    async function load() {
      const doc = (await databases.getDocument(PUBLIC_DATABASE_ID, COLLECTIONS.screens, id)) as unknown as Screen;
      setScreen(doc);
      setVncHost(doc.vnc_host ?? "");
    }

    account
      .get()
      .then(async () => {
        await load();
        unsub = client.subscribe(screenDocChannel(id), () => void load());
      })
      .catch(() => router.push("/login"));

    return () => unsub?.();
  }, [id, router]);

  async function command(action: PlayerCommand) {
    setNote(null);
    const { account } = createBrowserClient();
    const jwt = await account.createJWT();
    const res = await fetch("/api/screens/command", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt.jwt}` },
      body: JSON.stringify({ screenId: id, action }),
    });
    setNote(res.ok ? `Sent "${action}".` : `Failed to send "${action}".`);
  }

  async function saveVncHost() {
    const { databases } = createBrowserClient();
    await databases.updateDocument(PUBLIC_DATABASE_ID, COLLECTIONS.screens, id, {
      vnc_host: vncHost || null,
    });
    setNote("Saved VNC host.");
  }

  if (!screen) return <main className="p-6 text-muted-foreground">Loading…</main>;

  const vncUrl = screen.vnc_host ? NOVNC_TEMPLATE.replace("{host}", screen.vnc_host) : null;
  const shotUrl = screen.last_screenshot ? fileViewUrl(BUCKETS.screenshots, screen.last_screenshot) : null;

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/screens")}>
          ← Screens
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{screen.name ?? screen.$id}</h1>
        <span className={`text-xs ${online(screen.last_seen) ? "text-green-600" : "text-muted-foreground"}`}>
          {online(screen.last_seen) ? "● online" : "○ offline"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-mono text-xs text-muted-foreground">{screen.$id}</div>
            <div>Status: {screen.status}</div>
            <div>Location: {screen.location ?? "—"}</div>
            <div>MAC: {screen.mac}</div>
            <div>Version: {screen.player_version ?? "—"}</div>
            <div>Resolution: {screen.resolution ?? "—"}</div>
            <div>Last seen: {screen.last_seen ? new Date(screen.last_seen).toLocaleString() : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => command("reload")}>
                Reload
              </Button>
              <Button size="sm" onClick={() => command("update")}>
                Push update
              </Button>
              <Button size="sm" variant="outline" onClick={() => command("screenshot")}>
                Screenshot
              </Button>
              <Button size="sm" variant="destructive" onClick={() => command("reboot")}>
                Reboot
              </Button>
            </div>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
            <p className="text-xs text-muted-foreground">
              Reload/update reload the kiosk page; reboot &amp; screenshot are handled by the
              device-side agent (M9).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest screenshot</CardTitle>
        </CardHeader>
        <CardContent>
          {shotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shotUrl} alt="latest screenshot" className="w-full rounded-md border border-border" />
          ) : (
            <p className="text-sm text-muted-foreground">
              No screenshot yet. Use the Screenshot command (device agent uploads it).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remote screen (noVNC over Tailscale)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="text-xs text-muted-foreground">VNC host (Tailscale IP or name)</span>
              <input
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={vncHost}
                placeholder="100.x.y.z"
                onChange={(e) => setVncHost(e.target.value)}
              />
            </label>
            <Button size="sm" onClick={saveVncHost}>
              Save
            </Button>
          </div>
          {vncUrl ? (
            <iframe src={vncUrl} className="h-[480px] w-full rounded-md border border-border" />
          ) : (
            <p className="text-sm text-muted-foreground">Set a VNC host to embed the remote screen.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
