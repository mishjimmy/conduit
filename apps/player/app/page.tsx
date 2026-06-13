"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import { POLL_INTERVAL_MS, type ScreenInitResult } from "@conduit/types";
import type { MediaResolver, StreamResolver } from "@conduit/ui";
import {
  baseMessageTopics,
  connectMqtt,
  createMessageSubscription,
  groupMessageTopics,
  startHeartbeat,
  subscribeCommands,
  subscribeState,
  type MessageSubscription,
} from "@/lib/mqtt";
import { readManifest, writeManifest } from "@/lib/cache";
import { prefetchMedia } from "@/lib/mediaCache";
import { useMessageController } from "@/lib/messages";
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
  const msgSubRef = useRef<MessageSubscription | null>(null);
  const stopHeartbeatRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLayoutIdRef = useRef<string | null>(null);
  const attachedRef = useRef(false);
  const { active: activeMessage, handle: handleMessage } = useMessageController();

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
        msgSubRef.current?.add(groupMessageTopics(manifest.groupIds ?? []));
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

      const msgSub = createMessageSubscription(client, handleMessage);
      msgSub.add(baseMessageTopics(screenId));
      msgSubRef.current = msgSub;

      subscribeCommands(client, screenId, (cmd) => {
        // The browser handles reload/update (fetch the new bundle); reboot and
        // screenshot are handled by the device-side listener (M9 image).
        if (cmd.action === "reload" || cmd.action === "update") {
          window.location.reload();
        }
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
        msgSubRef.current?.add(groupMessageTopics(cached.groupIds ?? []));
        void loadManifest(cached.screenId);
        return;
      }

      try {
        // The kiosk launches with the device's real MAC in the URL; fall back to
        // the local device-info endpoint (dev mock) when it isn't supplied.
        const macParam = new URLSearchParams(window.location.search).get("mac");
        const mac =
          macParam ??
          (await fetch("/api/device-info").then((r) => r.json() as Promise<{ mac: string }>)).mac;
        const init = (await fetch("/api/screens/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mac }),
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
  const resolveStreamUrl: StreamResolver = (streamId) => manifest.streams?.[streamId];

  return (
    <PlaylistScreen
      manifest={manifest}
      online={online}
      onLayoutChange={onLayoutChange}
      resolveMediaUrl={resolveMediaUrl}
      resolveStreamUrl={resolveStreamUrl}
      message={activeMessage}
    />
  );
}
