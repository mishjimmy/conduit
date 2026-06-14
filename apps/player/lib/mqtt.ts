"use client";

import mqtt, { type MqttClient } from "mqtt";
import {
  HEARTBEAT_INTERVAL_MS,
  topics,
  type CommandMessage,
  type Heartbeat,
  type MessageCommand,
} from "@conduit/types";

const COMMAND_ACTIONS = new Set(["reload", "update", "reboot", "screenshot"]);

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

export interface MessageSubscription {
  /** Subscribe to additional message topics (idempotent). */
  add: (topicList: string[]) => void;
}

/**
 * Installs a single message handler and lets the caller grow the set of
 * subscribed message topics over time (e.g. group topics once the manifest with
 * group memberships arrives).
 */
export function createMessageSubscription(
  client: MqttClient,
  onMessage: (cmd: MessageCommand) => void,
): MessageSubscription {
  const subscribed = new Set<string>();
  client.on("message", (t, buf) => {
    if (!subscribed.has(t)) return;
    try {
      onMessage(JSON.parse(buf.toString()) as MessageCommand);
    } catch {
      /* ignore malformed payloads */
    }
  });
  return {
    add(topicList) {
      for (const t of topicList) {
        if (!subscribed.has(t)) {
          subscribed.add(t);
          client.subscribe(t, { qos: 1 });
        }
      }
    },
  };
}

/** Subscribe to this screen's command topic (and broadcast) for control commands. */
export function subscribeCommands(
  client: MqttClient,
  screenId: string,
  onCommand: (cmd: CommandMessage) => void,
): void {
  const subs = [topics.command(screenId), topics.broadcast()];
  const set = new Set(subs);
  subs.forEach((t) => client.subscribe(t, { qos: 1 }));
  client.on("message", (t, buf) => {
    if (!set.has(t)) return;
    try {
      const cmd = JSON.parse(buf.toString()) as CommandMessage;
      if (cmd && COMMAND_ACTIONS.has(cmd.action)) onCommand(cmd);
    } catch {
      /* ignore non-command payloads (e.g. broadcast messages) */
    }
  });
}

/** Convenience: the base message topics every screen listens to. */
export function baseMessageTopics(screenId: string): string[] {
  return [topics.message(screenId), topics.broadcast()];
}

/** Group message topics for a screen's group memberships. */
export function groupMessageTopics(groupIds: string[]): string[] {
  return groupIds.map((g) => topics.groupMessage(g));
}

/** Begin publishing heartbeats every 30s. Returns a stop function. */
export function startHeartbeat(
  client: MqttClient,
  screenId: string,
  getCurrentLayoutId: () => string | null,
): () => void {
  const send = () => {
    // Physical panel resolution: CSS pixels scaled by the device pixel ratio.
    const dpr = window.devicePixelRatio || 1;
    const resolution = `${Math.round(window.screen.width * dpr)}x${Math.round(window.screen.height * dpr)}`;
    const hb: Heartbeat = {
      screenId,
      online: true,
      currentLayoutId: getCurrentLayoutId(),
      playerVersion: PLAYER_VERSION,
      resolution,
      ts: new Date().toISOString(),
    };
    client.publish(topics.heartbeat(screenId), JSON.stringify(hb), { qos: 1 });
  };
  send();
  const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(id);
}
