import type { ReactNode } from "react";
import type { LayerType } from "@conduit/types";

/** Inline, dependency-free icons for each layer type (stroke = currentColor). */
const PATHS: Record<LayerType, ReactNode> = {
  backdrop: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m3 16 5-4 4 3 4-5 5 6" />
    </>
  ),
  slideshow: (
    <>
      <rect x="7" y="3" width="14" height="12" rx="2" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  pip: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="12.5" y="12" width="6.5" height="5.5" rx="1" />
    </>
  ),
  graphic: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.8" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  weather: <path d="M16 17a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 17z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  embed: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m9 10-2 2 2 2M15 10l2 2-2 2" />
    </>
  ),
  label: (
    <>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>
  ),
};

export function LayerIcon({ type, className }: { type: LayerType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[type]}
    </svg>
  );
}
