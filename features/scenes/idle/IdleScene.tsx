"use client";

import { CampusBackdrop } from "@/components/CampusBackdrop";

/**
 * Attract screen.
 *
 * Ported from `src/luke_java/IdleScene.pde`. This scene lives outside the
 * carousel — `DisplayManager` held it in its own field and swapped to it
 * whenever a session timed out or the carousel wrapped around untouched.
 * Any tap starts a session.
 *
 * The redesign replaces the Processing version's bouncing text with a static
 * welcome over a lilac-washed photo of the campus entrance (`CampusBackdrop`).
 */
export function IdleScene() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <CampusBackdrop />

      <div className="relative flex flex-col items-center pt-[18%] text-center text-[var(--luke-purple)]">
        <h1 className="text-[clamp(2.5rem,15vw,7rem)] leading-none font-extrabold tracking-tight">
          WELCOME!
        </h1>
        <p className="mt-2 text-[clamp(1rem,5vw,2.25rem)] font-bold">tap to start</p>
      </div>
    </div>
  );
}
