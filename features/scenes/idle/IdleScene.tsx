"use client";

/**
 * Attract screen.
 *
 * Ported from `src/luke_java/IdleScene.pde`. This scene lives outside the
 * carousel — `DisplayManager` held it in its own field and swapped to it
 * whenever a session timed out or the carousel wrapped around untouched.
 * Any tap starts a session.
 *
 * The Processing version bounced the prompt by nudging `textY` a few pixels per
 * frame; a CSS keyframe animation does the same job here without a draw loop.
 */
export function IdleScene() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-6 px-6 pt-[10%] text-center text-[var(--luke-purple)]">
      <h1 className="text-[clamp(1.75rem,9vw,4rem)] font-semibold leading-tight">
        Hi, I&apos;m L.U.K.E.!
      </h1>
      <p className="text-[clamp(1.25rem,6vw,2.5rem)] leading-snug">
        The Lipscomb University
        <br />
        Kiosk Experience!
      </p>
      <p className="mt-[8%] animate-[luke-float_3s_ease-in-out_infinite] text-[clamp(1.25rem,6vw,2.5rem)]">
        Touch anywhere to begin!
      </p>
    </div>
  );
}
