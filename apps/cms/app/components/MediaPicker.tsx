"use client";

import { useEffect, useState } from "react";
import { listMedia, type MediaDoc } from "@/lib/media";

/** Modal media browser. Calls onSelect with the chosen media doc id. */
export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaDoc) => void;
}) {
  const [media, setMedia] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listMedia()
      .then(setMedia)
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose media</h2>
          <button className="text-sm text-muted-foreground underline" onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : media.length === 0 ? (
          <p className="text-muted-foreground">No media yet — upload some on the Media page.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((m) => (
              <button
                key={m.id}
                className="overflow-hidden rounded-md border border-border hover:ring-2 hover:ring-primary"
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
              >
                <div className="flex aspect-video items-center justify-center bg-neutral-900">
                  {m.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover" muted />
                  )}
                </div>
                <div className="truncate p-1 text-xs" title={m.name}>
                  {m.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
