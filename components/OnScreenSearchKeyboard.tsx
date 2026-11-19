"use client";

import { useId } from "react";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

export interface OnScreenSearchKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivity?: () => void;
  label?: string;
  placeholder?: string;
}

export function OnScreenSearchKeyboard({
  value,
  onChange,
  open,
  onOpenChange,
  onActivity,
  label = "Search",
  placeholder = "Search",
}: OnScreenSearchKeyboardProps) {
  const keyboardId = useId();

  return (
    <div className="shrink-0 space-y-2 border-t border-zinc-200 bg-white p-3">
      <div className="mx-auto flex w-full max-w-3xl gap-2">
        <input
          type="search"
          aria-label={label}
          aria-controls={keyboardId}
          placeholder={placeholder}
          value={value}
          readOnly
          onClick={() => {
            onActivity?.();
            onOpenChange(true);
          }}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--luke-purple)]"
        />
        <button
          type="button"
          aria-label={open ? "Hide keyboard" : "Show keyboard"}
          aria-controls={keyboardId}
          aria-expanded={open}
          onClick={() => {
            onActivity?.();
            onOpenChange(!open);
          }}
          className="rounded-md border border-[var(--luke-purple)] px-4 font-medium text-[var(--luke-purple)]"
        >
          {open ? "Hide" : "Search"}
        </button>
      </div>
      <div id={keyboardId} hidden={!open}>
        {open && (
          <OnScreenKeyboard
            onKey={(key) => {
              onActivity?.();
              onChange(value + key);
            }}
            onBackspace={() => {
              onActivity?.();
              onChange(value.slice(0, -1));
            }}
            onClear={() => {
              onActivity?.();
              onChange("");
            }}
          />
        )}
      </div>
    </div>
  );
}
