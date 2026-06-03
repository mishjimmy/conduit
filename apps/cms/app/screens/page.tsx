"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import {
  COLLECTIONS,
  screensCollectionChannel,
  type Screen,
} from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";
import { listPlaylists, type PlaylistDoc } from "@/lib/playlists";

function statusColor(status: string) {
  if (status === "active") return "text-green-600";
  if (status === "pairing") return "text-amber-600";
  return "text-muted-foreground";
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export default function ScreensPage() {
  const router = useRouter();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { account, databases, client } = createBrowserClient();
    let unsub: (() => void) | undefined;

    async function load() {
      const res = await databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.screens);
      setScreens(res.documents as unknown as Screen[]);
      setLoading(false);
    }

    account
      .get()
      .then(async () => {
        await Promise.all([load(), listPlaylists().then(setPlaylists)]);
        unsub = client.subscribe(screensCollectionChannel, () => {
          void load();
        });
      })
      .catch(() => router.push("/login"));

    return () => unsub?.();
  }, [router]);

  async function assignPlaylist(screenId: string, playlistId: string) {
    // optimistic update
    setScreens((ss) =>
      ss.map((s) => (s.$id === screenId ? { ...s, playlist_id: playlistId || null } : s)),
    );
    const { account } = createBrowserClient();
    const jwt = await account.createJWT();
    await fetch("/api/screens/assign", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt.jwt}` },
      body: JSON.stringify({ screenId, playlistId: playlistId || null }),
    });
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Screens</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/layouts">
            Layouts
          </Link>
          <Link className="text-sm text-primary underline" href="/playlists">
            Playlists
          </Link>
          <Link className="text-sm text-primary underline" href="/groups">
            Groups
          </Link>
          <Link className="text-sm text-primary underline" href="/media">
            Media
          </Link>
          <Link className="text-sm text-primary underline" href="/streams">
            Streams
          </Link>
          <Link className="text-sm text-primary underline" href="/messages">
            Messages
          </Link>
          <Link className="text-sm text-primary underline" href="/pair">
            Pair a screen
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : screens.length === 0 ? (
        <p className="text-muted-foreground">No screens yet. Boot a player to register one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {screens.map((s) => (
            <Card key={s.$id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{s.name ?? s.$id}</span>
                  <span className={`text-xs ${isOnline(s.last_seen) ? "text-green-600" : "text-muted-foreground"}`}>
                    {isOnline(s.last_seen) ? "● online" : "○ offline"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{s.$id}</div>
                <div>
                  Status: <span className={statusColor(s.status)}>{s.status}</span>
                  {s.status === "pairing" && s.pairing_code ? ` (${s.pairing_code})` : ""}
                </div>
                <div>Location: {s.location ?? "—"}</div>
                <div>MAC: {s.mac}</div>
                <div>Version: {s.player_version ?? "—"}</div>
                {s.status === "active" && (
                  <label className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">Playlist</span>
                    <select
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={s.playlist_id ?? ""}
                      onChange={(e) => void assignPlaylist(s.$id, e.target.value)}
                    >
                      <option value="">(none)</option>
                      {playlists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
