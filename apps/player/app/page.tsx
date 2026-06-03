"use client";

import { useEffect, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import { POLL_INTERVAL_MS, type ScreenInitResult } from "@conduit/types";
import { connectMqtt, startHeartbeat, subscribeState } from "@/lib/mqtt";
import { readManifest, writeManifest, type CachedManifest } from "@/lib/cache";
import { PairingScreen } from "./pairing/PairingScreen";
import { DisplayScreen } from "./display/DisplayScreen";

type View =
  | { kind: "loading" }
  | { kind: "pairing"; screenId: string; code: string }
  | { kind: "assigned"; manifest: CachedManifest }
  | { kind: "error"; message: string };

export default function PlayerPage() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [online, setOnline] = useState(true);

  // Long-lived handles cleaned up on unmount.
  const mqttRef = useRef<MqttClient | null>(null);
  const stopHeartbeatRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function manifestFrom(r: {
      screenId: string;
      status: ScreenInitResult["status"];
      name?: string | null;
      location?: string | null;
      playlistId: string | null;
    }): CachedManifest {
      return {
        screenId: r.screenId,
        status: r.status,
        name: r.name ?? null,
        location: r.location ?? null,
        playlistId: r.playlistId,
        updatedAt: new Date().toISOString(),
      };
    }

    function goAssigned(m: CachedManifest) {
      writeManifest(m);
      if (!cancelled) setView({ kind: "assigned", manifest: m });
    }

    // Wire MQTT + heartbeat + polling fallback once we know our screenId.
    function attach(screenId: string) {
      const client = connectMqtt();
      mqttRef.current = client;
      client.on("connect", () => setOnline(true));
      client.on("close", () => setOnline(false));
      client.on("error", () => setOnline(false));

      subscribeState(client, screenId, (payload) => {
        const p = payload as { status?: string; name?: string | null; location?: string | null; playlistId?: string | null };
        if (p.status === "active") {
          goAssigned(manifestFrom({ screenId, status: "active", name: p.name, location: p.location, playlistId: p.playlistId ?? null }));
        }
      });

      stopHeartbeatRef.current = startHeartbeat(client, screenId, () => null);

      // Polling fallback (works even if MQTT never connects).
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/screens/status?screenId=${encodeURIComponent(screenId)}`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            status: ScreenInitResult["status"];
            name: string | null;
            location: string | null;
            playlistId: string | null;
          };
          if (data.status === "active") {
            goAssigned(manifestFrom({ screenId, ...data }));
          }
        } catch {
          /* offline — keep current view */
        }
      }, POLL_INTERVAL_MS);
    }

    async function bootstrap() {
      // Returning device: resume from cache, skip pairing.
      const cached = readManifest();
      if (cached && cached.status === "active") {
        setView({ kind: "assigned", manifest: cached });
        attach(cached.screenId);
        return;
      }

      try {
        const di = await fetch("/api/device-info").then((r) => r.json() as Promise<{ mac: string }>);
        const init = (await fetch("/api/screens/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mac: di.mac }),
        }).then((r) => r.json())) as ScreenInitResult;

        if (cancelled) return;

        if (init.status === "active") {
          goAssigned(manifestFrom(init));
          attach(init.screenId);
          return;
        }

        setView({ kind: "pairing", screenId: init.screenId, code: init.pairingCode ?? "------" });
        attach(init.screenId);
      } catch (err) {
        if (!cancelled) setView({ kind: "error", message: err instanceof Error ? err.message : "Boot failed" });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      stopHeartbeatRef.current?.();
      if (pollRef.current) clearInterval(pollRef.current);
      void mqttRef.current?.endAsync(true).catch(() => undefined);
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-white/60">
        Starting Conduit…
      </main>
    );
  }
  if (view.kind === "error") {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-red-400">
        {view.message}
      </main>
    );
  }
  if (view.kind === "pairing") {
    return <PairingScreen code={view.code} online={online} />;
  }
  return <DisplayScreen manifest={view.manifest} online={online} />;
}
