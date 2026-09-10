/**
 * Core kiosk contracts.
 *
 * Ported from the L.U.K.E. Processing sketch (`src/luke_java/Scene.pde`), where
 * every screen implemented a `Scene` interface with Init/Enable/Pause/Draw/
 * Update/Click. React already owns rendering and input, so the interface splits
 * into two parts: a `SceneDefinition` (static metadata the carousel needs before
 * the scene mounts) and a `SceneComponent` (the screen itself, which receives
 * its bounds and a handle back to the shell).
 */

/** Bounds a scene is rendered into — the React form of `Init(x_min, y_min, x_max, y_max)`. */
export interface SceneBounds {
  width: number;
  height: number;
}

/** Handle passed into every scene so it can talk back to the shell. */
export interface SceneHandle {
  /**
   * Reset the idle countdown. The Processing build got this for free because
   * `DisplayManager.Click()` saw every tap; here a scene reports its own
   * interaction so auto-advance does not fire mid-use.
   */
  reportActivity: () => void;
  /** Advance the carousel (`DisplayManager.NextScene(false)`). */
  nextScene: () => void;
  /** Step back through the carousel (`DisplayManager.NextScene(true)`). */
  previousScene: () => void;
  /** Abandon the session and return to idle (`DisplayManager.ExitCarousel()`). */
  exitCarousel: () => void;
}

export interface SceneComponentProps {
  bounds: SceneBounds;
  handle: SceneHandle;
}

export type SceneComponent = React.ComponentType<SceneComponentProps>;

/**
 * A scene registered on the carousel.
 *
 * `id` is stable and used for session logging; `name` is the human-facing label
 * the BottomBar renders, matching `SetName()` in `DisplayManager.BuildDisplay()`.
 */
export interface SceneDefinition {
  id: string;
  name: string;
  Component: SceneComponent;
  /**
   * Marks a scene as scaffolded-but-not-built. The carousel still shows it so
   * the shell can be exercised end to end; set to false as each is implemented.
   */
  placeholder?: boolean;
}
