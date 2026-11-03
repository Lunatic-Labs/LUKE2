"use client";

import { useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { BuildingView } from "./BuildingView";
import { CreditsView } from "./CreditsView";
import { FacultyView } from "./FacultyView";
import { MajorsView } from "./MajorsView";

/**
 * L.U.K.E. Directory
 *
 * Ported from DirectoryScene.pde. Upstream's home screen was a welcome title
 * over a stack of large buttons, and `currentScreen` switched between the
 * sub-screens they opened. Here that is the `view` state; each sub-screen lives
 * in its own file and has a Back button that returns to this menu. Sub-screens
 * start fresh each time they're opened, as upstream reset them on entry.
 */

type DirectoryView = "home" | "majors" | "faculty" | "building" | "credits";

const MENU: { view: Exclude<DirectoryView, "home">; label: string; description: string }[] = [
  { view: "majors", label: "Our Majors", description: "The degree programs we offer" },
  { view: "faculty", label: "Our Faculty and Staff", description: "Who's who, filtered by department" },
  { view: "building", label: "Our Building", description: "What's on each floor of Fields" },
  { view: "credits", label: "Credits", description: "The students who built L.U.K.E." },
];

export function DirectoryScene({ handle }: SceneComponentProps) {
  const [view, setView] = useState<DirectoryView>("home");

  const goHome = () => setView("home");
  const reportActivity = () => handle.reportActivity();

  if (view === "majors") {
    return (
      <SceneFrame className="bg-white text-black">
        <MajorsView onBack={goHome} onActivity={reportActivity} />
      </SceneFrame>
    );
  }

  if (view === "faculty") {
    return (
      <SceneFrame className="bg-white text-black">
        <FacultyView onBack={goHome} onActivity={reportActivity} />
      </SceneFrame>
    );
  }

  if (view === "building") {
    return (
      <SceneFrame className="bg-white text-black">
        <BuildingView onBack={goHome} onActivity={reportActivity} />
      </SceneFrame>
    );
  }

  if (view === "credits") {
    return (
      <SceneFrame className="bg-white text-black">
        <CreditsView onBack={goHome} onActivity={reportActivity} />
      </SceneFrame>
    );
  }

  return (
    <SceneFrame className="bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">L.U.K.E.</p>
          <h1 className="text-2xl font-semibold text-black">Directory</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-8 py-7 sm:px-12 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="text-4xl font-semibold leading-tight text-[#2B0A54]">Welcome to the L.U.K.E. Directory!</h2>
          <div className="mt-4 h-1 w-full bg-[#AD8C45]" />

          <nav aria-label="Directory sections" className="mt-8 flex flex-col gap-4">
            {MENU.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => {
                  handle.reportActivity();
                  setView(item.view);
                }}
                className="rounded-md border border-[#2B0A54]/40 bg-white px-6 py-5 text-left transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]"
              >
                <span className="block text-2xl font-semibold text-[#2B0A54]">{item.label}</span>
                <span className="mt-1 block text-base text-black/70">{item.description}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </SceneFrame>
  );
}