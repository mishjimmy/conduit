"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import {
  COLLECTIONS,
  screensCollectionChannel,
  type Screen,
} from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";

function statusColor(status: string) {
  if (status === "active") return "text-green-600";
  if (status === "pairing") return "text-amber-600";
  return "text-muted-foreground";
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 90_000;
}

export default function ScreensPage() {
  const router = useRouter();
  const [screens, setScreens] = useState<Screen[]>([]);
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
        await load();
        unsub = client.subscribe(screensCollectionChannel, () => {
          void load();
        });
      })
      .catch(() => router.push("/login"));

    return () => unsub?.();
  }, [router]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Screens</h1>
        <div className="flex items-center gap-4">
          <Link className="text-sm text-primary underline" href="/layouts">
            Layouts
          </Link>
          <Link className="text-sm text-primary underline" href="/pair">
            Pair a screen
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : screens.length === 0 ? (
        <p className="text-muted-foreground">No screens yet. Boot a player to register one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {screens.map((s) => (
            <Card key={s.$id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{s.name ?? s.$id}</span>
                  <span className={`text-xs ${isOnline(s.last_seen) ? "text-green-600" : "text-muted-foreground"}`}>
                    {isOnline(s.last_seen) ? "● online" : "○ offline"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{s.$id}</div>
                <div>
                  Status: <span className={statusColor(s.status)}>{s.status}</span>
                  {s.status === "pairing" && s.pairing_code ? ` (${s.pairing_code})` : ""}
                </div>
                <div>Location: {s.location ?? "—"}</div>
                <div>MAC: {s.mac}</div>
                <div>Version: {s.player_version ?? "—"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
