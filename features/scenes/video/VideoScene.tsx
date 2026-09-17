import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Video Player
 *
 * Upstream read its playlist from disk via readDir.pde and rebuilt it on error (DisplayManager.ReloadMovies). A web port should serve the playlist from a route handler under app/ and use a plain <video> element.
 */
export function VideoScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Video Player"
        description="Cycles through promotional videos loaded from the video directory, with tap-to-select playback."
        source="VideoScene.pde, VideoPlayerScene.pde"
      />
    </SceneFrame>
  );
}
