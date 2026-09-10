/**
 * Layout wrapper giving a scene its drawing area.
 *
 * The Processing scenes each received `Init(x_min, y_min, x_max, y_max)` and
 * were responsible for staying inside those bounds. Here the shell reserves the
 * space and this frame fills it, so scenes lay out with normal CSS instead of
 * arithmetic against `width`/`height`.
 */

export interface SceneFrameProps {
  children: React.ReactNode;
  /** Extra classes for the scrollable content area. */
  className?: string;
}

export function SceneFrame({ children, className = "" }: SceneFrameProps) {
  return (
    <section className={`flex h-full w-full flex-col overflow-hidden bg-white ${className}`}>
      {children}
    </section>
  );
}
