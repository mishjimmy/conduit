"use client";

import * as React from "react";
import type { Layer } from "@conduit/types";
import { passthroughMediaResolver, type MediaResolver } from "./media";

const fill: React.CSSProperties = { width: "100%", height: "100%" };
const center: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url);
}

/* ---------------- clock ---------------- */

function ClockLayer({ layer }: { layer: Extract<Layer, { type: "clock" }> }) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: layer.format === "12h",
  });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ ...fill, ...center, flexDirection: "column", color: "#fff" }}>
      <div style={{ fontSize: "12cqh", fontWeight: 700, lineHeight: 1.1 }}>{time}</div>
      {layer.showDate && <div style={{ fontSize: "4cqh", opacity: 0.8 }}>{date}</div>}
    </div>
  );
}

/* ---------------- weather ---------------- */

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

function WeatherLayer({ layer }: { layer: Extract<Layer, { type: "weather" }> }) {
  const [data, setData] = React.useState<WeatherData | null>(null);
  const [error, setError] = React.useState(false);
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  React.useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      layer.location,
    )}&units=${layer.units}&appid=${apiKey}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { main: { temp: number }; weather: { description: string; icon: string }[] }) => {
        if (cancelled) return;
        setData({
          temp: Math.round(j.main.temp),
          description: j.weather[0]?.description ?? "",
          icon: j.weather[0]?.icon ?? "01d",
        });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [apiKey, layer.location, layer.units]);

  const unit = layer.units === "imperial" ? "°F" : "°C";

  return (
    <div style={{ ...fill, ...center, flexDirection: "column", color: "#fff", gap: "1cqh" }}>
      <div style={{ fontSize: "3.5cqh", opacity: 0.8 }}>{layer.location}</div>
      {data ? (
        <>
          <div style={{ fontSize: "10cqh", fontWeight: 700 }}>
            {data.temp}
            {unit}
          </div>
          <div style={{ fontSize: "3cqh", opacity: 0.8, textTransform: "capitalize" }}>
            {data.description}
          </div>
        </>
      ) : (
        <div style={{ fontSize: "3cqh", opacity: 0.5 }}>
          {error ? "weather unavailable" : !apiKey ? "set OPENWEATHER key" : "loading…"}
        </div>
      )}
    </div>
  );
}

/* ---------------- slideshow ---------------- */

function SlideshowLayer({
  layer,
  resolve,
}: {
  layer: Extract<Layer, { type: "slideshow" }>;
  resolve: MediaResolver;
}) {
  const [index, setIndex] = React.useState(0);
  const items = layer.items;

  React.useEffect(() => {
    if (items.length <= 1) return;
    const current = items[index];
    if (!current) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % items.length),
      current.durationSeconds * 1000,
    );
    return () => clearTimeout(id);
  }, [index, items]);

  if (items.length === 0) {
    return <PlaceholderBox label="slideshow (no items)" />;
  }

  return (
    <div style={{ ...fill, position: "relative", overflow: "hidden", background: "#000" }}>
      {items.map((item, i) => {
        const url = resolve(item.mediaId);
        const visible = i === index;
        return (
          <div
            key={`${item.mediaId}-${i}`}
            style={{
              ...fill,
              position: "absolute",
              inset: 0,
              opacity: visible ? 1 : 0,
              transition: `opacity ${layer.crossfadeSeconds}s ease-in-out`,
            }}
          >
            {url ? (
              isVideoUrl(url) ? (
                <video src={url} autoPlay muted loop playsInline style={{ ...fill, objectFit: "cover" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" style={{ ...fill, objectFit: "cover" }} />
              )
            ) : (
              <PlaceholderBox label={`media: ${item.mediaId}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- graphic / embed / message ---------------- */

function GraphicLayer({
  layer,
  resolve,
}: {
  layer: Extract<Layer, { type: "graphic" }>;
  resolve: MediaResolver;
}) {
  const url = resolve(layer.mediaId);
  if (!url) return <PlaceholderBox label={`graphic: ${layer.mediaId}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={{ ...fill, objectFit: "contain" }} />;
}

function EmbedLayer({ layer }: { layer: Extract<Layer, { type: "embed" }> }) {
  return <iframe src={layer.url} style={{ ...fill, border: "none" }} />;
}

/** The message zone is empty when idle; the messages system (M5) fills it. */
function MessageLayer() {
  return null;
}

/* ---------------- video placeholders (server compositing arrives M7) -------- */

function VideoPlaceholder({ label, url }: { label: string; url?: string }) {
  return (
    <div style={{ ...fill, ...center, flexDirection: "column", background: "#111", color: "#888", gap: "1cqh" }}>
      <div style={{ fontSize: "4cqh" }}>▶ {label}</div>
      {url && <div style={{ fontSize: "2cqh", opacity: 0.6, wordBreak: "break-all", padding: "0 4cqw" }}>{url}</div>}
    </div>
  );
}

function PlaceholderBox({ label }: { label: string }) {
  return (
    <div
      style={{
        ...fill,
        ...center,
        background: "#1a1a1a",
        color: "#666",
        fontSize: "2.5cqh",
        outline: "1px dashed #333",
        wordBreak: "break-all",
        padding: "0 2cqw",
      }}
    >
      {label}
    </div>
  );
}

/* ---------------- dispatcher ---------------- */

export function LayerView({
  layer,
  resolveMediaUrl,
}: {
  layer: Layer;
  resolveMediaUrl?: MediaResolver;
}) {
  const resolve = resolveMediaUrl ?? passthroughMediaResolver;
  switch (layer.type) {
    case "clock":
      return <ClockLayer layer={layer} />;
    case "weather":
      return <WeatherLayer layer={layer} />;
    case "slideshow":
      return <SlideshowLayer layer={layer} resolve={resolve} />;
    case "graphic":
      return <GraphicLayer layer={layer} resolve={resolve} />;
    case "embed":
      return <EmbedLayer layer={layer} />;
    case "message":
      return <MessageLayer />;
    case "video":
      return <VideoPlaceholder label="video" url={layer.hlsUrl} />;
    case "camera-grid":
      return <VideoPlaceholder label="camera grid" url={layer.hlsUrl} />;
    case "pip":
      return <VideoPlaceholder label="picture-in-picture" url={layer.hlsUrl} />;
    default:
      return null;
  }
}
