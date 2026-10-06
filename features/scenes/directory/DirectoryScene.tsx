"use client";

import { useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import { ScenePlaceholder } from "@/components/ScenePlaceholder";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { CreditsView } from "./CreditsView";

/**
 * L.U.K.E. Directory
 *
 * The largest scene upstream: Options parsed majors, floors, and professors from three text files into a Professor model plus a category dropdown. Port the parsers into this feature and the data into a route handler.
 *
 * Upstream switched between Directory's sub-screens with `currentScreen`; here
 * that is the `view` state. Credits is ported; the rest is still a placeholder.
 */
type DirectoryView = "home" | "credits";

export function DirectoryScene({ handle }: SceneComponentProps) {
  const [view, setView] = useState<DirectoryView>("home");

  if (view === "credits") {
    return (
      <SceneFrame>
        <CreditsView onBack={() => setView("home")} onActivity={() => handle.reportActivity()} />
      </SceneFrame>
    );
  }

    return (
    <SceneFrame>
      <ScenePlaceholder
        title="L.U.K.E. Directory"
        description="Majors, professors, and a floor-by-floor building directory, filtered by category."
        source="DirectoryScene.pde, DirectoryMajors.pde, DirectoryProfessors.pde, DirectoryMap.pde, DirectoryFloor.pde"
      />
      <div className="mt-auto flex justify-center px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={() => {
            handle.reportActivity();
            setView("credits");
          }}
          className="rounded-full border border-[var(--luke-purple)] px-6 py-2 font-medium text-[var(--luke-purple)]"
        >
          Credits
        </button>
      </div>
    </SceneFrame>
  );
}