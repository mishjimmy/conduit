"use client";

import * as React from "react";
import Hls from "hls.js";
import type { Layer, MessageStyle } from "@conduit/types";
import { passthroughMediaResolver, type MediaResolver } from "./media";

/** A message to display on the message layer (null when idle). */
export interface ActiveMessage {
  body: string;
  style: MessageStyle;
}

const MESSAGE_BG: Record<MessageStyle, string> = {
  info: "rgba(37, 99, 235, 0.92)",
  alert: "rgba(217, 119, 6, 0.94)",
  emergency: "rgba(220, 38, 38, 0.96)",
};

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
    <div style={{ ...fill, ...center, flexDirection: "column", color: layer.color }}>
      <div style={{ fontSize: `${layer.fontSize}cqh`, fontWeight: 700, lineHeight: 1.1 }}>{time}</div>
      {layer.showDate && (
        <div style={{ fontSize: `${layer.fontSize / 3}cqh`, opacity: 0.8 }}>{date}</div>
      )}
    </div>
  );
}

/* ---------------- label (free text) ---------------- */

function LabelLayer({ layer }: { layer: Extract<Layer, { type: "label" }> }) {
  const justify =
    layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center";
  return (
    <div
      style={{
        ...fill,
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        textAlign: layer.align,
        color: layer.color,
        fontSize: `${layer.fontSize}cqh`,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        lineHeight: 1.15,
        padding: "0.5cqh 1cqw",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {layer.text}
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
  const fs = layer.fontSize;

  return (
    <div style={{ ...fill, ...center, flexDirection: "column", color: layer.color, gap: "1cqh" }}>
      <div style={{ fontSize: `${fs * 0.35}cqh`, opacity: 0.8 }}>{layer.location}</div>
      {data ? (
        <>
          <div style={{ fontSize: `${fs}cqh`, fontWeight: 700 }}>
            {data.temp}
            {unit}
          </div>
          <div style={{ fontSize: `${fs * 0.3}cqh`, opacity: 0.8, textTransform: "capitalize" }}>
            {data.description}
          </div>
        </>
      ) : (
        <div style={{ fontSize: `${fs * 0.3}cqh`, opacity: 0.5 }}>
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

/** Full-canvas background: a solid color with an optional image/video on top. */
function BackdropLayer({
  layer,
  resolve,
}: {
  layer: Extract<Layer, { type: "backdrop" }>;
  resolve: MediaResolver;
}) {
  const url = layer.mediaId ? resolve(layer.mediaId) : undefined;
  return (
    <div style={{ ...fill, background: layer.color, overflow: "hidden" }}>
      {url &&
        (isVideoUrl(url) ? (
          <video src={url} autoPlay muted loop playsInline style={{ ...fill, objectFit: layer.fit }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ ...fill, objectFit: layer.fit }} />
        ))}
    </div>
  );
}

/** The message zone is empty when idle; the messages system fills it. */
function MessageLayer({
  layer,
  message,
}: {
  layer: Extract<Layer, { type: "message" }>;
  message?: ActiveMessage | null;
}) {
  if (!message) return null;
  return (
    <div
      style={{
        ...fill,
        ...center,
        padding: "2cqh 3cqw",
        color: layer.color,
        fontWeight: 600,
        fontSize: `${layer.fontSize}cqh`,
        lineHeight: 1.2,
        background: MESSAGE_BG[message.style],
        borderRadius: "1.5cqh",
        animation: "conduit-msg-in 400ms ease-out",
      }}
    >
      {message.body}
    </div>
  );
}

/* ---------------- video (HLS via hls.js) ---------------- */

function VideoLayer({ url, label }: { url: string; label: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    let hls: Hls | null = null;

    // Safari/iOS play HLS natively; Chromium (the kiosk) needs hls.js.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        liveDurationInfinity: true,
        // Low-latency tuning: sit ~1 segment behind the live edge (default is 3)
        // and gently speed up to catch up when we fall behind, instead of letting
        // a 3-segment buffer accumulate ~15s of delay. lowLatencyMode uses LL-HLS
        // parts when the source provides them.
        lowLatencyMode: true,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 5,
        maxLiveSyncPlaybackRate: 1.5,
        backBufferLength: 15,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }

    return () => {
      hls?.destroy();
      video.removeAttribute("src");
    };
  }, [url]);

  if (!url) return <VideoPlaceholder label={label} />;
  return <video ref={ref} autoPlay muted playsInline style={{ ...fill, objectFit: "cover" }} />;
}

/**
 * A camera source: raw HLS (`.m3u8`) plays through hls.js; a go2rtc player page
 * (or any web player URL) renders in an iframe so it can use WebRTC/MSE.
 */
function CameraView({ url, label }: { url: string; label: string }) {
  if (!url) return <VideoPlaceholder label={label} />;
  const isEmbed = url.includes("/go2rtc/") || /\.html(\?|#|$)/.test(url);
  if (isEmbed) {
    return <iframe src={url} allow="autoplay; fullscreen" style={{ ...fill, border: "none" }} />;
  }
  return <VideoLayer url={url} label={label} />;
}

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
  message,
}: {
  layer: Layer;
  resolveMediaUrl?: MediaResolver;
  message?: ActiveMessage | null;
}) {
  const resolve = resolveMediaUrl ?? passthroughMediaResolver;
  switch (layer.type) {
    case "backdrop":
      return <BackdropLayer layer={layer} resolve={resolve} />;
    case "clock":
      return <ClockLayer layer={layer} />;
    case "label":
      return <LabelLayer layer={layer} />;
    case "weather":
      return <WeatherLayer layer={layer} />;
    case "slideshow":
      return <SlideshowLayer layer={layer} resolve={resolve} />;
    case "graphic":
      return <GraphicLayer layer={layer} resolve={resolve} />;
    case "embed":
      return <EmbedLayer layer={layer} />;
    case "message":
      return <MessageLayer layer={layer} message={message} />;
    case "video":
      return <CameraView url={layer.hlsUrl} label="video" />;
    case "pip":
      return <CameraView url={layer.hlsUrl} label="picture-in-picture" />;
    default:
      return null;
  }
}
