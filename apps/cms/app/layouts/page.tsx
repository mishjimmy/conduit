"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";
import { createLayout, deleteLayout, listLayouts, type LayoutDoc } from "@/lib/layouts";
import { PromptDialog } from "@/app/components/PromptDialog";

export default function LayoutsPage() {
  const router = useRouter();
  const [layouts, setLayouts] = useState<LayoutDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  async function onCreate(name: string) {
    const layout = await createLayout(name);
    router.push(`/layouts/${layout.id}`);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this layout?")) return;
    await deleteLayout(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Layouts</h1>
        <Button onClick={() => setCreateOpen(true)}>New layout</Button>
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
              <CardContent className="flex items-center gap-2">
                <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/layouts/${l.id}`}>
                  Edit
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(l.id)}
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
        title="New layout"
        label="Layout name"
        defaultValue="New layout"
        submitLabel="Create"
        onSubmit={onCreate}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  );
}
