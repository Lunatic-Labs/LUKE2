/**
 * Stand-in for a scene that is registered on the carousel but not yet built.
 *
 * The Processing build wrapped every scene construction in its own try/catch so
 * one broken screen could not take down the kiosk. Placeholders serve the same
 * end during the port: the carousel, timers, and navigation can be exercised
 * end to end before any individual scene exists.
 */

export interface ScenePlaceholderProps {
  title: string;
  /** What this scene does, once implemented. */
  description: string;
  /** Source file in the Processing repo this scene is ported from. */
  source: string;
}

export function ScenePlaceholder({ title, description, source }: ScenePlaceholderProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center">
      <h2 className="text-3xl font-semibold text-[var(--luke-purple)]">{title}</h2>
      <p className="max-w-md text-lg leading-7 text-zinc-600">{description}</p>
      <p className="rounded-full bg-zinc-100 px-4 py-1 font-mono text-xs text-zinc-500">
        not yet ported &middot; {source}
      </p>
    </div>
  );
}
