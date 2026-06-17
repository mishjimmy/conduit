"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import {
  deleteMedia,
  listMedia,
  updateMediaTags,
  uploadMedia,
  type MediaDoc,
} from "@/lib/media";
import { PromptDialog } from "@/app/components/PromptDialog";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / 1_000_000;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default function MediaPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagEdit, setTagEdit] = useState<MediaDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setMedia(await listMedia());
    setLoading(false);
  }

  useEffect(() => {
    const { account } = createBrowserClient();
    account
      .get()
      .then(refresh)
      .catch(() => router.push("/login"));
  }, [router]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(file);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveTags(value: string) {
    if (!tagEdit) return;
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await updateMediaTags(tagEdit.id, tags);
    await refresh();
    setTagEdit(null);
  }

  async function onDelete(m: MediaDoc) {
    if (!window.confirm(`Delete "${m.name}"?`)) return;
    await deleteMedia(m);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : media.length === 0 ? (
        <p className="text-muted-foreground">No media yet. Upload images or videos to get started.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border border-border">
              <div className="flex aspect-video items-center justify-center bg-neutral-900">
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <video src={m.url} className="h-full w-full object-cover" muted />
                )}
              </div>
              <div className="space-y-1 p-2 text-xs">
                <div className="truncate font-medium" title={m.name}>
                  {m.name}
                </div>
                <div className="text-muted-foreground">
                  {m.type} · {formatSize(m.size)}
                </div>
                <div className="truncate text-muted-foreground" title={m.tags.join(", ")}>
                  {m.tags.length ? m.tags.join(", ") : "no tags"}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setTagEdit(m)}>
                    Tags
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDelete(m)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromptDialog
        open={tagEdit !== null}
        title="Edit tags"
        label="Tags (comma-separated)"
        placeholder="lobby, promo"
        defaultValue={tagEdit?.tags.join(", ") ?? ""}
        submitLabel="Save"
        allowEmpty
        onSubmit={saveTags}
        onClose={() => setTagEdit(null)}
      />
    </main>
  );
}
