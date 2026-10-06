"use client";

import { MENU_ITEMS } from "@/features/kiosk/menu-items";
import type { SceneComponentProps } from "@/features/kiosk/types";

/**
 * Main menu, shown once per session straight after the attract screen.
 *
 * Not in the Processing build, which dropped visitors onto the first carousel
 * scene. It is the header's `NavMenu` laid out as a full screen: the same pill
 * buttons in the same order, each jumping into the carousel at that page.
 */
export function MainMenuScene({ handle }: SceneComponentProps) {
  return (
    <div className="flex h-full w-full flex-col items-center px-[12%] pt-[6%] select-none">
      <h1 className="text-[clamp(1.75rem,9vw,4.5rem)] leading-none font-extrabold tracking-tight text-[var(--luke-purple)]">
        Where to?
      </h1>
      <div className="mt-[clamp(0.75rem,3dvh,2.5rem)] flex w-full flex-col gap-[clamp(0.4rem,1.8dvh,1.5rem)]">
        {MENU_ITEMS.map(({ sceneId, label }) => (
          <button
            key={sceneId}
            type="button"
            onClick={() => handle.goToScene(sceneId)}
            className="w-full rounded-full border-2 border-[var(--luke-purple)] bg-[var(--luke-lavender)] py-[clamp(0.25rem,1dvh,0.75rem)] text-[clamp(1rem,5.5vw,2.5rem)] leading-tight font-bold text-[var(--luke-purple)] transition-[filter] active:brightness-90"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
