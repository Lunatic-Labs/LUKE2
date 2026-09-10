import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";

/**
 * L.U.K.E. Directory
 *
 * The largest scene upstream: Options parsed majors, floors, and professors from three text files into a Professor model plus a category dropdown. Port the parsers into this feature and the data into a route handler.
 */
export function DirectoryScene() {
  return (
    <SceneFrame>
      <ScenePlaceholder
        title="L.U.K.E. Directory"
        description="Majors, professors, and a floor-by-floor building directory, filtered by category."
        source="DirectoryScene.pde, DirectoryMajors.pde, DirectoryProfessors.pde, DirectoryMap.pde, DirectoryFloor.pde, DirectoryCredits.pde"
      />
    </SceneFrame>
  );
}
