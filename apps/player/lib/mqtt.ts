"use client";

import mqtt, { type MqttClient } from "mqtt";
import { HEARTBEAT_INTERVAL_MS, topics, type Heartbeat } from "@conduit/types";

const PLAYER_VERSION = process.env.NEXT_PUBLIC_PLAYER_VERSION ?? "0.0.0";

/** Connect to the broker over WebSocket (Mosquitto websockets listener). */
export function connectMqtt(): MqttClient {
  const url = process.env.NEXT_PUBLIC_MQTT_WS_URL ?? "ws://localhost:9001";
  return mqtt.connect(url, {
    reconnectPeriod: 2000,
    clientId: `conduit-player-${Math.random().toString(16).slice(2, 8)}`,
  });
}

/** Subscribe to this screen's state topic; `onState` fires with parsed JSON. */
export function subscribeState(
  client: MqttClient,
  screenId: string,
  onState: (payload: unknown) => void,
): void {
  const topic = topics.state(screenId);
  client.subscribe(topic, { qos: 1 });
  client.on("message", (t, buf) => {
    if (t !== topic) return;
    try {
      onState(JSON.parse(buf.toString()));
    } catch {
      /* ignore malformed payloads */
    }
  });
}

/** Begin publishing heartbeats every 30s. Returns a stop function. */
export function startHeartbeat(
  client: MqttClient,
  screenId: string,
  getCurrentLayoutId: () => string | null,
): () => void {
  const send = () => {
    const hb: Heartbeat = {
      screenId,
      online: true,
      currentLayoutId: getCurrentLayoutId(),
      playerVersion: PLAYER_VERSION,
      ts: new Date().toISOString(),
    };
    client.publish(topics.heartbeat(screenId), JSON.stringify(hb), { qos: 1 });
  };
  send();
  const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(id);
}
