"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import {
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  type PlaylistDoc,
} from "@/lib/playlists";
import { PromptDialog } from "@/app/components/PromptDialog";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  async function onCreate(name: string) {
    const pl = await createPlaylist(name);
    router.push(`/playlists/${pl.id}`);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this playlist?")) return;
    await deletePlaylist(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
        <Button onClick={() => setCreateOpen(true)}>New playlist</Button>
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
              <CardContent className="flex items-center gap-2">
                <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/playlists/${p.id}`}>
                  Edit
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PromptDialog
        open={createOpen}
        title="New playlist"
        label="Playlist name"
        defaultValue="New playlist"
        submitLabel="Create"
        onSubmit={onCreate}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  );
}
