"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@conduit/ui";
import { COLLECTIONS, MESSAGE_STYLES, type MessageStyle, type Screen } from "@conduit/types";
import { createBrowserClient, PUBLIC_DATABASE_ID } from "@/lib/appwrite-browser";
import { listMessages, type MessageRow } from "@/lib/messages";
import { listGroups, type GroupDoc } from "@/lib/groups";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

const BROADCAST = "broadcast";

export default function MessagesPage() {
  const router = useRouter();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [history, setHistory] = useState<MessageRow[]>([]);
  const [target, setTarget] = useState<string>(BROADCAST);
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<MessageStyle>("info");
  const [scheduleAt, setScheduleAt] = useState("");
  const [autoDismiss, setAutoDismiss] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refreshHistory() {
    setHistory(await listMessages());
  }

  useEffect(() => {
    const { account, databases } = createBrowserClient();
    account
      .get()
      .then(async () => {
        const [res, grps] = await Promise.all([
          databases.listDocuments(PUBLIC_DATABASE_ID, COLLECTIONS.screens),
          listGroups(),
        ]);
        setScreens(res.documents as unknown as Screen[]);
        setGroups(grps);
        await refreshHistory();
      })
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
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
  }

  function targetPayload() {
    if (target === BROADCAST) return { isBroadcast: true, screenId: null, groupId: null };
    if (target.startsWith("group:")) {
      return { isBroadcast: false, screenId: null, groupId: target.slice(6) };
    }
    return { isBroadcast: false, screenId: target.replace(/^screen:/, ""), groupId: null };
  }

  function computeTimes() {
    const showAt = scheduleAt ? new Date(scheduleAt).toISOString() : null;
    const seconds = Number(autoDismiss);
    let hideAt: string | null = null;
    if (seconds > 0) {
      const base = showAt ? new Date(showAt).getTime() : Date.now();
      hideAt = new Date(base + seconds * 1000).toISOString();
    }
    return { showAt, hideAt };
  }

  async function send(overrideStyle?: MessageStyle, broadcastOverride?: boolean) {
    if (!body.trim()) {
      setNote("Enter a message body first.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const { showAt, hideAt } = computeTimes();
      const t = broadcastOverride ? { isBroadcast: true, screenId: null } : targetPayload();
      await post("/api/messages/send", {
        ...t,
        body: body.trim(),
        style: overrideStyle ?? style,
        showAt,
        hideAt,
      });
      setNote("Sent.");
      setBody("");
      await refreshHistory();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setNote(null);
    try {
      await post("/api/messages/clear", targetPayload());
      setNote("Cleared.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setBusy(false);
    }
  }

  const activeScreens = screens.filter((s) => s.status === "active");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Target</span>
              <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value={BROADCAST}>All screens (broadcast)</option>
                {groups.length > 0 && (
                  <optgroup label="Groups">
                    {groups.map((g) => (
                      <option key={g.id} value={`group:${g.id}`}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Screens">
                  {activeScreens.map((s) => (
                    <option key={s.$id} value={`screen:${s.$id}`}>
                      {s.name ?? s.$id}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Style</span>
              <select
                className={inputCls}
                value={style}
                onChange={(e) => setStyle(e.target.value as MessageStyle)}
              >
                {MESSAGE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">Message</span>
            <textarea
              className={`${inputCls} h-24 resize-none`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type the message to display…"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Schedule (optional)</span>
              <input
                type="datetime-local"
                className={inputCls}
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Auto-dismiss after (seconds)</span>
              <input
                type="number"
                className={inputCls}
                value={autoDismiss}
                onChange={(e) => setAutoDismiss(e.target.value)}
                placeholder="leave blank to keep until cleared"
              />
            </label>
          </div>

          {note && <p className="text-sm text-muted-foreground">{note}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => send()} disabled={busy}>
              Send
            </Button>
            <Button variant="outline" onClick={clear} disabled={busy}>
              Clear target
            </Button>
            <Button
              variant="destructive"
              onClick={() => send("emergency", true)}
              disabled={busy}
              title="Full-screen override on every screen"
            >
              🚨 Emergency broadcast
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-2 text-lg font-medium">Recent</h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground">No messages yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((m) => (
            <li key={m.id} className="rounded-md border border-border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.body}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {m.style} · {m.isBroadcast ? "broadcast" : `screen ${m.screenId}`}
                {m.showAt ? ` · scheduled ${new Date(m.showAt).toLocaleString()}` : ""}
                {m.hideAt ? ` · hides ${new Date(m.hideAt).toLocaleTimeString()}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
