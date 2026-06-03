"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import { POLL_INTERVAL_MS, type ScreenInitResult } from "@conduit/types";
import type { MediaResolver } from "@conduit/ui";
import { connectMqtt, startHeartbeat, subscribeState } from "@/lib/mqtt";
import { readManifest, writeManifest } from "@/lib/cache";
import { prefetchMedia } from "@/lib/mediaCache";
import type { PlayerManifest } from "@/lib/manifest";
import { PairingScreen } from "./pairing/PairingScreen";
import { PlaylistScreen } from "./display/PlaylistScreen";

const isUrl = (s: string) => /^(https?:)?\/\//.test(s) || s.startsWith("/");

type View =
  | { kind: "loading" }
  | { kind: "pairing"; screenId: string; code: string }
  | { kind: "assigned"; manifest: PlayerManifest }
  | { kind: "error"; message: string };

export default function PlayerPage() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [online, setOnline] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const mqttRef = useRef<MqttClient | null>(null);
  const stopHeartbeatRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLayoutIdRef = useRef<string | null>(null);
  const attachedRef = useRef(false);

  const onLayoutChange = useCallback((id: string | null) => {
    currentLayoutIdRef.current = id;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Fetch the latest manifest; cache it; show it. Falls back to cache offline.
    async function loadManifest(screenId: string) {
      try {
        const res = await fetch(`/api/player/manifest?screenId=${encodeURIComponent(screenId)}`);
        if (!res.ok) return;
        const manifest = (await res.json()) as PlayerManifest;
        if (cancelled) return;
        writeManifest(manifest);
        setView({ kind: "assigned", manifest });
        // Warm the offline media cache, then expose object URLs to the renderer.
        const items = Object.entries(manifest.media ?? {}).map(([mediaId, m]) => ({ mediaId, url: m.url }));
        prefetchMedia(items).then((urls) => !cancelled && setMediaUrls(urls));
      } catch {
        /* offline — keep whatever is already showing (cache) */
      }
    }

    // Wire MQTT + heartbeat + polling fallback once we know our screenId.
    function attach(screenId: string) {
      if (attachedRef.current) return;
      attachedRef.current = true;

      const client = connectMqtt();
      mqttRef.current = client;
      client.on("connect", () => setOnline(true));
      client.on("close", () => setOnline(false));
      client.on("error", () => setOnline(false));

      subscribeState(client, screenId, (payload) => {
        const p = payload as { status?: string };
        if (p.status === "active") void loadManifest(screenId);
      });

      stopHeartbeatRef.current = startHeartbeat(client, screenId, () => currentLayoutIdRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/screens/status?screenId=${encodeURIComponent(screenId)}`);
          if (!res.ok) return;
          const data = (await res.json()) as { status: ScreenInitResult["status"] };
          if (data.status === "active") void loadManifest(screenId);
        } catch {
          /* offline */
        }
      }, POLL_INTERVAL_MS);
    }

    async function bootstrap() {
      // Returning device: resume from cached manifest immediately, then reconcile.
      const cached = readManifest();
      if (cached) {
        setView({ kind: "assigned", manifest: cached });
        const items = Object.entries(cached.media ?? {}).map(([mediaId, m]) => ({ mediaId, url: m.url }));
        prefetchMedia(items).then((urls) => !cancelled && setMediaUrls(urls));
        attach(cached.screenId);
        void loadManifest(cached.screenId);
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
          attach(init.screenId);
          await loadManifest(init.screenId);
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

  const manifest = view.manifest;
  const resolveMediaUrl: MediaResolver = (mediaId) =>
    mediaUrls[mediaId] ?? manifest.media?.[mediaId]?.url ?? (isUrl(mediaId) ? mediaId : undefined);

  return (
    <PlaylistScreen
      manifest={manifest}
      online={online}
      onLayoutChange={onLayoutChange}
      resolveMediaUrl={resolveMediaUrl}
    />
  );
}
