"use client";

import { useEffect, useState } from "react";
import { CampusBackdrop } from "@/components/CampusBackdrop";
import { MENU_ITEMS } from "@/features/kiosk/menu-items";
import type { SceneComponentProps } from "@/features/kiosk/types";

/**
 * How long the menu ignores taps after it appears. A visitor who taps the
 * attract screen twice in quick succession would otherwise land on whichever
 * page happened to sit under their finger.
 */
export const MENU_INPUT_DELAY_MS = 500;

/**
 * Main menu, shown once per session straight after the attract screen.
 *
 * Not in the Processing build, which dropped visitors onto the first carousel
 * scene. Follows the main menu mockup: the `NavMenu` pages in the same order,
 * as a two-column grid of rounded buttons over the attract screen's campus
 * backdrop, each jumping into the carousel at that page.
 */
export function MainMenuScene({ handle }: SceneComponentProps) {
  const [acceptingInput, setAcceptingInput] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAcceptingInput(true), MENU_INPUT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <CampusBackdrop />

      <nav
        aria-label="Main menu"
        className="relative grid grid-cols-2 gap-x-[18%] gap-y-[clamp(0.5rem,2.5dvh,2rem)] px-[14%] pt-[clamp(1rem,4dvh,3rem)]"
      >
        {MENU_ITEMS.map(({ sceneId, label }) => (
          <button
            key={sceneId}
            type="button"
            onClick={() => handle.goToScene(sceneId)}
            // Disabled without any change in look, so the grid does not flicker
            // when it starts accepting taps.
            disabled={!acceptingInput}
            className="flex aspect-[4/3] items-center justify-center rounded-[22%] border-[clamp(3px,0.8vw,8px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] text-[clamp(0.875rem,5vw,2.5rem)] leading-tight text-[var(--luke-purple)] transition-[filter] active:brightness-90"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
