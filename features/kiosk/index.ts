export { KioskShell } from "./components/KioskShell";
export { SceneErrorBoundary } from "./components/SceneErrorBoundary";
export { IDLE_SCENE, SCENES } from "./registry";
export {
  BOTTOM_BAR_HEIGHT_RATIO,
  DEFAULT_OPTIONS,
  bottomBarHeight,
  parseOptions,
} from "./options";
export { SessionTracker, consoleSessionSink } from "./session-log";
export type { KioskOptions } from "./options";
export type { SessionRecord, SessionErrorRecord, SessionSink } from "./session-log";
export type {
  SceneBounds,
  SceneComponent,
  SceneComponentProps,
  SceneDefinition,
  SceneHandle,
} from "./types";
