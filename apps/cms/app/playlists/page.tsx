"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import {
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  type PlaylistDoc,
} from "@/lib/playlists";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistDoc[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setPlaylists(await listPlaylists());
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(refresh)
      .catch(() => router.push("/login"));
  }, [router]);

  async function onCreate() {
    const name = window.prompt("Playlist name", "New playlist");
    if (!name) return;
    const pl = await createPlaylist(name.trim());
    router.push(`/playlists/${pl.id}`);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this playlist?")) return;
    await deletePlaylist(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlists</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/screens">
            Screens
          </Link>
          <Link className="text-sm text-primary underline" href="/layouts">
            Layouts
          </Link>
          <Button onClick={onCreate}>New playlist</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : playlists.length === 0 ? (
        <p className="text-muted-foreground">No playlists yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {playlists.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.entries.length} entries{p.loop ? " · loops" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4 text-sm">
                <Link className="text-primary underline" href={`/playlists/${p.id}`}>
                  Edit
                </Link>
                <button className="text-destructive underline" onClick={() => onDelete(p.id)}>
                  Delete
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
