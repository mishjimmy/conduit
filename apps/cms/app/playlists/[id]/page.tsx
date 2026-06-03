"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@conduit/ui";
import { TRANSITIONS, type PlaylistEntry, type Transition } from "@conduit/types";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { getPlaylist, savePlaylist } from "@/lib/playlists";
import { listLayouts, type LayoutDoc } from "@/lib/layouts";

const inputCls = "rounded-md border border-input bg-background px-2 py-1 text-sm";

export default function PlaylistEditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [loop, setLoop] = useState(true);
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [layouts, setLayouts] = useState<LayoutDoc[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved">("loading");

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(async () => {
        const [pl, lays] = await Promise.all([getPlaylist(id), listLayouts()]);
        setName(pl.name);
        setLoop(pl.loop);
        setEntries(pl.entries);
        setLayouts(lays);
        setStatus("ready");
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  function update(i: number, patch: Partial<PlaylistEntry>) {
    setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)));
    setStatus("ready");
  }
  function move(i: number, dir: -1 | 1) {
    setEntries((es) => {
      const j = i + dir;
      if (j < 0 || j >= es.length) return es;
      const next = [...es];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
    setStatus("ready");
  }
  function remove(i: number) {
    setEntries((es) => es.filter((_, j) => j !== i));
    setStatus("ready");
  }
  function add() {
    const first = layouts[0];
    setEntries((es) => [
      ...es,
      { layout_id: first?.id ?? "", duration_seconds: 30, transition: "hard_cut" },
    ]);
    setStatus("ready");
  }

  async function save() {
    setStatus("saving");
    await savePlaylist(id, name, entries, loop);
    setStatus("saved");
  }

  if (status === "loading") {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <button className="text-sm text-primary underline" onClick={() => router.push("/playlists")}>
          ← Playlists
        </button>
        <input
          className="max-w-xs flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Unsaved changes"}
          </span>
          <Button onClick={save} disabled={status === "saving"}>
            Save
          </Button>
        </div>
      </div>

      {layouts.length === 0 && (
        <p className="mb-3 text-sm text-amber-600">
          No layouts exist yet — create one under Layouts first.
        </p>
      )}

      <ol className="space-y-2">
        {entries.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 rounded-md border border-border p-2">
            <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>

            <select
              className={`${inputCls} flex-1`}
              value={entry.layout_id}
              onChange={(e) => update(i, { layout_id: e.target.value })}
            >
              {layouts.length === 0 && <option value="">(no layouts)</option>}
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="number"
                className={`${inputCls} w-20`}
                value={entry.duration_seconds}
                onChange={(e) =>
                  update(i, { duration_seconds: Math.max(1, Number(e.target.value) || 1) })
                }
              />
              s
            </label>

            <select
              className={inputCls}
              value={entry.transition}
              onChange={(e) => update(i, { transition: e.target.value as Transition })}
            >
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 text-muted-foreground">
              <button className="px-1" onClick={() => move(i, -1)} title="Move up">
                ↑
              </button>
              <button className="px-1" onClick={() => move(i, 1)} title="Move down">
                ↓
              </button>
              <button className="px-1 text-destructive" onClick={() => remove(i)} title="Remove">
                ✕
              </button>
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="text-sm text-muted-foreground">No entries yet.</li>}
      </ol>

      <button className="mt-3 text-sm text-primary underline" onClick={add} disabled={layouts.length === 0}>
        + add entry
      </button>

      <p className="mt-6 text-xs text-muted-foreground">
        Assign this playlist to a screen from the Screens page.
      </p>
    </main>
  );
}
