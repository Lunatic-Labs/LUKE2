"use client";

export interface OnScreenKeyboardProps {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => [...row]);

const KEY_CLASS =
  "flex min-h-12 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-white px-1 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--luke-purple)]";

export function OnScreenKeyboard({ onKey, onBackspace, onClear }: OnScreenKeyboardProps) {
  return (
    <div
      role="group"
      aria-label="On-screen keyboard"
      className="mx-auto w-full max-w-3xl space-y-2"
    >
      {KEY_ROWS.map((row, index) => (
        <div
          key={index}
          className={`mx-auto flex justify-center gap-1 sm:gap-2 ${index === 1 ? "w-[90%]" : index === 2 ? "w-[70%]" : "w-full"}`}
        >
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKey(key)}
              className={KEY_CLASS}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      ))}

      <div className="flex gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onBackspace}
          className={`${KEY_CLASS} basis-1/4`}
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={() => onKey(" ")}
          className={`${KEY_CLASS} basis-1/2`}
        >
          Space
        </button>
        <button
          type="button"
          onClick={onClear}
          className={`${KEY_CLASS} basis-1/4`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
