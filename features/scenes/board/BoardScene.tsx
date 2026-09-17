import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * Draw
 *
 * Upstream drew straight into the Processing canvas. Port to a <canvas> with pointer events, clearing on scene enable.
 */
export function BoardScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="Draw"
        description="Free-draw whiteboard with an erase control."
        source="BoardScene.pde, Erase.pde"
      />
    </SceneFrame>
  );
}
