"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@conduit/ui";
import {
  COLLECTIONS,
  screensCollectionChannel,
  type Screen,
} from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";
import { listPlaylists, type PlaylistDoc } from "@/lib/playlists";

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

function StatusBadge({ status, code }: { status: string; code?: string | null }) {
  const cls =
    status === "active"
      ? "bg-green-500/15 text-green-600"
      : status === "pairing"
        ? "bg-amber-500/15 text-amber-600"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", cls)}>
      {status}
      {status === "pairing" && code ? ` · ${code}` : ""}
    </span>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
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

  function openScreen(id: string) {
    router.push(`/screens/${id}`);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Screens</h1>
        <p className="text-sm text-muted-foreground">
          Select a screen to view its settings, controls, and remote view.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : screens.length === 0 ? (
        <p className="text-muted-foreground">No screens yet. Boot a player to register one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {screens.map((s) => {
            const online = isOnline(s.last_seen);
            return (
              <Card
                key={s.$id}
                role="link"
                tabIndex={0}
                onClick={() => openScreen(s.$id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openScreen(s.$id);
                  }
                }}
                className="group cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate group-hover:underline">{s.name ?? s.$id}</span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 text-xs font-medium",
                        online ? "text-green-600" : "text-muted-foreground",
                      )}
                    >
                      <span className={cn("size-2 rounded-full", online ? "bg-green-500" : "bg-muted-foreground/40")} />
                      {online ? "Online" : "Offline"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <StatusBadge status={s.status} code={s.pairing_code} />

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Meta label="Location" value={s.location ?? "—"} />
                    <Meta label="MAC" value={s.mac} mono />
                    <Meta label="Version" value={s.player_version ?? "—"} />
                    <Meta label="Resolution" value={s.resolution ?? "—"} />
                  </dl>

                  {s.status === "active" && (
                    <div
                      className="flex items-center gap-2 border-t pt-3"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
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
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
