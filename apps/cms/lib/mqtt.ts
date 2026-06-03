import mqtt, { type MqttClient } from "mqtt";

let client: MqttClient | null = null;

function getClient(): MqttClient {
  if (client) return client;
  client = mqtt.connect(process.env.MQTT_URL ?? "mqtt://localhost:1883", {
    reconnectPeriod: 2000,
    clientId: `conduit-cms-${Math.random().toString(16).slice(2, 8)}`,
  });
  return client;
}

/** Publish a JSON payload to a topic (fire-and-forget, QoS 1). */
export function publish(topic: string, payload: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    getClient().publish(topic, JSON.stringify(payload), { qos: 1 }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}
