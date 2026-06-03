"use client";

import * as React from "react";
import type { Layer } from "@conduit/types";
import { LayerView, type ActiveMessage } from "./layers";
import type { MediaResolver } from "./media";

export interface LayoutRendererProps {
  layers: Layer[];
  resolveMediaUrl?: MediaResolver;
  /** Active message rendered on message-type layers (null when idle). */
  message?: ActiveMessage | null;
  /** Draw a dashed outline + label around each zone (builder aid). */
  showZoneOutlines?: boolean;
}

/**
 * Renders a stack of layers as absolutely-positioned zones on a 16:9 stage.
 * Positions are percentage-based, so the stage scales to its container with no
 * JS math; layer text uses container-query units (cqh/cqw) to scale with it.
 * The stage fills its parent — give the parent a 16:9 box (or a fullscreen
 * element on the player).
 */
export function LayoutRenderer({
  layers,
  resolveMediaUrl,
  message,
  showZoneOutlines,
}: LayoutRendererProps) {
  const ordered = React.useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#000",
        containerType: "size",
      }}
    >
      {ordered.map((layer) => (
        <div
          key={layer.id}
          style={{
            position: "absolute",
            left: `${layer.position.x}%`,
            top: `${layer.position.y}%`,
            width: `${layer.position.width}%`,
            height: `${layer.position.height}%`,
            zIndex: layer.zIndex,
            outline: showZoneOutlines ? "1px dashed rgba(255,255,255,0.4)" : undefined,
          }}
        >
          <LayerView layer={layer} resolveMediaUrl={resolveMediaUrl} message={message} />
          {showZoneOutlines && (
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                fontSize: "2cqh",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "0.3cqh 0.6cqh",
                pointerEvents: "none",
              }}
            >
              {layer.type}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
