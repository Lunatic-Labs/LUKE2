import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Leave Some Feedback?
 *
 * Registered but commented out of BuildDisplay() upstream, so it never shipped. Kept on the carousel here as a scaffold — remove it from the registry if it is not wanted.
 */
export function FeedbackScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Leave Some Feedback?"
        description="Short prompt collecting a visitor rating before the session ends."
        source="FeedbackScene.pde"
      />
    </SceneFrame>
  );
}
