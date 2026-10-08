/**
 * Scene carousel registration.
 *
 * The factory half of `DisplayManager.BuildDisplay()`: it named each scene and
 * pushed it onto the carousel in a fixed order. Order here matches upstream —
 * Video, Map, Camera, Gallery, Draw, Trivia, Feedback, Directory — with Idle
 * held separately, exactly as `DisplayManager` kept it outside `sceneList`.
 *
 * Upstream wrapped each scene's construction in its own try/catch so one bad
 * screen could not take down the kiosk. Construction is free here, so that
 * protection moved to render time in `SceneErrorBoundary`.
 */

import { IdleScene } from "@/features/scenes/idle";
import { MainMenuScene } from "@/features/scenes/main-menu";
import { MapScene } from "@/features/scenes/map";
import { VideoScene } from "@/features/scenes/video";
import { CameraScene } from "@/features/scenes/camera";
import { GalleryScene } from "@/features/scenes/gallery";
import { BoardScene } from "@/features/scenes/board";
import { TriviaScene } from "@/features/scenes/trivia";
import { FeedbackScene } from "@/features/scenes/feedback";
import { DirectoryScene } from "@/features/scenes/directory";
import type { SceneDefinition } from "./types";

/**
 * The attract screen. Not part of the carousel — the shell swaps to it when a
 * session times out, and any tap leaves it.
 */
export const IDLE_SCENE: SceneDefinition = {
  id: "idle",
  name: "Touch Anywhere to Begin!",
  Component: IdleScene,
};

/**
 * Where a session lands after the attract screen. Also held outside the
 * carousel: auto-advance never drifts onto it, the bottom bar cannot reach it,
 * and it is left out of `MENU_ITEMS`, so a visitor sees it once per session.
 */
export const MAIN_MENU_SCENE: SceneDefinition = {
  id: "main-menu",
  name: "Main Menu",
  Component: MainMenuScene,
};

export const SCENES: SceneDefinition[] = [
  { id: "video", name: "Video Player", Component: VideoScene, placeholder: true },
  { id: "map", name: "You Are Here", Component: MapScene },
  { id: "camera", name: "Take a Picture!", Component: CameraScene},
  { id: "gallery", name: "Browse the Gallery", Component: GalleryScene},
  { id: "board", name: "Draw", Component: BoardScene },
  { id: "trivia", name: "Test Your Knowledge", Component: TriviaScene, placeholder: true },
  { id: "feedback", name: "Leave Some Feedback?", Component: FeedbackScene },
  { id: "directory", name: "L.U.K.E. Directory", Component: DirectoryScene, placeholder: true },
];

export { MENU_ITEMS } from "./menu-items";
