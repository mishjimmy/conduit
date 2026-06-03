"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { createLayout, deleteLayout, listLayouts, type LayoutDoc } from "@/lib/layouts";

export default function LayoutsPage() {
  const router = useRouter();
  const [layouts, setLayouts] = useState<LayoutDoc[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLayouts(await listLayouts());
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
    const name = window.prompt("Layout name", "New layout");
    if (!name) return;
    const layout = await createLayout(name.trim());
    router.push(`/layouts/${layout.id}`);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this layout?")) return;
    await deleteLayout(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Layouts</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/screens">
            Screens
          </Link>
          <Button onClick={onCreate}>New layout</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : layouts.length === 0 ? (
        <p className="text-muted-foreground">No layouts yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {layouts.map((l) => (
            <Card key={l.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{l.name}</span>
                  <span className="text-xs text-muted-foreground">{l.layers.length} layers</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4 text-sm">
                <Link className="text-primary underline" href={`/layouts/${l.id}`}>
                  Edit
                </Link>
                <button className="text-destructive underline" onClick={() => onDelete(l.id)}>
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
