"use client";

import Image from "next/image";

/**
 * Attract screen.
 *
 * Ported from `src/luke_java/IdleScene.pde`. This scene lives outside the
 * carousel — `DisplayManager` held it in its own field and swapped to it
 * whenever a session timed out or the carousel wrapped around untouched.
 * Any tap starts a session.
 *
 * The redesign replaces the Processing version's bouncing text with a static
 * welcome over a lilac-washed photo of the campus entrance. The shell's
 * skyline backdrop sits underneath scenes, so this scene paints its own copy
 * on top of the photo.
 */
export function IdleScene() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src="/images/lipscomb-entrance.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Tint: lilac over the whole photo, deepening at the very bottom. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#8f7eb3_87%,#3e364d_100%)] opacity-50" />
      {/* Extra lilac behind the heading, fading out to reveal the photo. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#8f7eb3_23%,rgb(255_255_255/0)_39%)] opacity-25" />
      <Image
        src="/images/nashville-skyline.png"
        alt=""
        width={482}
        height={119}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full"
      />

      <div className="relative flex flex-col items-center pt-[18%] text-center text-[var(--luke-purple)]">
        <h1 className="text-[clamp(2.5rem,15vw,7rem)] leading-none font-extrabold tracking-tight">
          WELCOME!
        </h1>
        <p className="mt-2 text-[clamp(1rem,5vw,2.25rem)] font-bold">tap to start</p>
      </div>
    </div>
  );
}
