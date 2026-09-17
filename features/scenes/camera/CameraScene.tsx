import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Take a Picture!
 *
 * Upstream used Processing's Capture against a physical webcam. The browser equivalent is getUserMedia, which requires a secure context and an explicit permission prompt.
 */
export function CameraScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Take a Picture!"
        description="Live camera preview with a capture button; photos are saved and surfaced in the gallery."
        source="CameraScene.pde"
      />
    </SceneFrame>
  );
}
