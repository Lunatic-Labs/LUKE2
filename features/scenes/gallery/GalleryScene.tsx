import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Browse the Gallery
 *
 * Upstream paged a grid of PImage cells loaded from the gallery directory. next/image plus a route handler listing the directory is the natural port.
 */
export function GalleryScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Browse the Gallery"
        description="Grid of photos taken at the kiosk, tap to enlarge."
        source="GalleryScene.pde, GalleryCell.pde"
      />
    </SceneFrame>
  );
}
