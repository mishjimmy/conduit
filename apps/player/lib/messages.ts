"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageCommand } from "@conduit/types";
import type { ActiveMessage } from "@conduit/ui";

export interface MessageController {
  active: ActiveMessage | null;
  handle: (cmd: MessageCommand) => void;
}

/**
 * Tracks the currently-displayed message. Honors `show_at` (scheduled display),
 * `hide_at` (auto-dismiss), and `clear`. `handle` is stable so it can be wired
 * into the MQTT subscription once.
 */
export function useMessageController(): MessageController {
  const [active, setActive] = useState<ActiveMessage | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = hideTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const handle = useCallback(
    (cmd: MessageCommand) => {
      if (cmd.action === "clear") {
        clearTimers();
        setActive(null);
        return;
      }
      if (cmd.action !== "show" || !cmd.body) return;

      clearTimers();
      const body = cmd.body;
      const style = cmd.style ?? "info";

      const show = () => {
        setActive({ body, style });
        if (cmd.hide_at) {
          const ms = new Date(cmd.hide_at).getTime() - Date.now();
          if (ms <= 0) setActive(null);
          else hideTimer.current = setTimeout(() => setActive(null), ms);
        }
      };

      if (cmd.show_at) {
        const delay = new Date(cmd.show_at).getTime() - Date.now();
        if (delay > 0) {
          showTimer.current = setTimeout(show, delay);
          return;
        }
      }
      show();
    },
    [clearTimers],
  );

  return { active, handle };
}
