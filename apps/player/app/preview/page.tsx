"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutRenderer } from "@conduit/ui";
import type { Layer } from "@conduit/types";

function Preview() {
  const params = useSearchParams();
  const layoutId = params.get("layoutId");
  const [layers, setLayers] = useState<Layer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!layoutId) {
      setError("missing ?layoutId");
      return;
    }
    fetch(`/api/layouts/get?id=${encodeURIComponent(layoutId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { layers: Layer[] }) => setLayers(data.layers))
      .catch((e) => setError(e instanceof Error ? e.message : "failed to load"));
  }, [layoutId]);

  if (error) {
    return <div className="flex h-screen w-screen items-center justify-center text-red-400">{error}</div>;
  }
  if (!layers) {
    return <div className="flex h-screen w-screen items-center justify-center text-white/50">Loading…</div>;
  }
  return (
    <div className="h-screen w-screen">
      <LayoutRenderer layers={layers} />
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-black" />}>
      <Preview />
    </Suspense>
  );
}
