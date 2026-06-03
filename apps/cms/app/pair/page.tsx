"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { createBrowserClient } from "@/lib/appwrite-browser";

function PairForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { account } = createBrowserClient();
      // Authenticate to the server route with a short-lived JWT.
      const jwt = await account.createJWT();
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${jwt.jwt}` },
        body: JSON.stringify({ code: code.trim().toUpperCase(), name, location }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Pairing failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("missing scope")) {
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Pairing failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Screen paired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The screen has been assigned and will switch over momentarily.
          </p>
          <Button onClick={() => router.push("/screens")}>Back to screens</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Pair a screen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            className="rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
            placeholder="Pairing code (e.g. WOLF-3847)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Name (e.g. Lobby North)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Location (e.g. Floor 1)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Pairing…" : "Pair screen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PairPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <PairForm />
      </Suspense>
    </main>
  );
}
