/**
 * Entries in the header's drop-down menu and on the main menu, top to bottom,
 * following the navbar mockup rather than carousel order. Labels are shorter
 * than scene names so they fit the menus' pill buttons.
 *
 * Kept apart from `registry.ts` because the main menu scene renders this list,
 * and the registry imports that scene.
 */
export const MENU_ITEMS: { sceneId: string; label: string }[] = [
  { sceneId: "directory", label: "Faculty" },
  { sceneId: "video", label: "Video" },
  { sceneId: "map", label: "Map" },
  { sceneId: "camera", label: "Selfie" },
  { sceneId: "gallery", label: "Gallery" },
  { sceneId: "board", label: "Drawing" },
  { sceneId: "trivia", label: "Quizzes" },
  { sceneId: "feedback", label: "Feedback" },
];
