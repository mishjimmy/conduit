"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { COLLECTIONS, type Screen } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";
import { createGroup, deleteGroup, listGroups, type GroupDoc } from "@/lib/groups";
import { listPlaylists, type PlaylistDoc } from "@/lib/playlists";
import { PromptDialog } from "@/app/components/PromptDialog";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function refresh() {
    const { databases } = createBrowserClient();
    const [g, p, s] = await Promise.all([
      listGroups(),
      listPlaylists(),
      databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.screens),
    ]);
    setGroups(g);
    setPlaylists(p);
    setScreens(s.documents as unknown as Screen[]);
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(refresh)
      .catch(() => router.push("/login"));
  }, [router]);

  async function post(path: string, payload: Record<string, unknown>) {
    const { account } = createBrowserClient();
    const jwt = await account.createJWT();
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${jwt.jwt}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json();
  }

  async function onCreate(name: string) {
    await createGroup(name, "");
    await refresh();
    setCreateOpen(false);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this group? (screens keep running)")) return;
    await deleteGroup(id);
    await refresh();
  }

  async function toggleMembership(screen: Screen, groupId: string, member: boolean) {
    const groupIds = member
      ? [...screen.group_ids, groupId]
      : screen.group_ids.filter((g) => g !== groupId);
    // optimistic
    setScreens((ss) => ss.map((s) => (s.$id === screen.$id ? { ...s, group_ids: groupIds } : s)));
    await post("/api/screens/groups", { screenId: screen.$id, groupIds });
  }

  async function bulkAssign(groupId: string, playlistId: string) {
    setNote(null);
    const res = (await post("/api/groups/assign-playlist", {
      groupId,
      playlistId: playlistId || null,
    })) as { count: number };
    setNote(`Assigned to ${res.count} screen(s).`);
  }

  const activeScreens = screens.filter((s) => s.status === "active");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
        <Button onClick={() => setCreateOpen(true)}>New group</Button>
      </div>

      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground">No groups yet. Create one to bulk-manage screens.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const members = activeScreens.filter((s) => s.group_ids.includes(g.id));
            return (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{g.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(g.id)}
                    >
                      Delete
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assign playlist to {members.length} member(s)</span>
                    <select
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      defaultValue=""
                      onChange={(e) => void bulkAssign(g.id, e.target.value)}
                    >
                      <option value="">— choose playlist —</option>
                      {playlists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Members</div>
                    {activeScreens.length === 0 ? (
                      <p className="text-muted-foreground">No active screens.</p>
                    ) : (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {activeScreens.map((s) => {
                          const member = s.group_ids.includes(g.id);
                          return (
                            <label key={s.$id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={member}
                                onChange={(e) => void toggleMembership(s, g.id, e.target.checked)}
                              />
                              {s.name ?? s.$id}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PromptDialog
        open={createOpen}
        title="New group"
        label="Group name"
        defaultValue="New group"
        submitLabel="Create"
        onSubmit={onCreate}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  );
}
