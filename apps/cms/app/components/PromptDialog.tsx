"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@conduit/ui";

export interface PromptDialogProps {
  open: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  /** Allow submitting an empty value (e.g. clearing tags). Defaults to false. */
  allowEmpty?: boolean;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}

/** Lightweight in-page replacement for window.prompt — a single-input modal. */
export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = "",
  submitLabel = "Create",
  allowEmpty = false,
  onSubmit,
  onClose,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(defaultValue);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    const v = value.trim();
    if ((!v && !allowEmpty) || busy) return;
    setBusy(true);
    try {
      await onSubmit(v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm rounded-lg border bg-card p-5 text-card-foreground shadow-lg">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {label && (
            <label htmlFor="prompt-dialog-input" className="block text-xs text-muted-foreground">
              {label}
            </label>
          )}
          <input
            id="prompt-dialog-input"
            ref={inputRef}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={(!value.trim() && !allowEmpty) || busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
