"use client";

import type { CampusPlace } from "./buildings";

export interface DetailCardProps {
  place: CampusPlace;
  /** Clear the selection. */
  onClose: () => void;
  /** Go back to the Find screen. */
  onFindAnother: () => void;
}

/**
 * The card describing the selected place.
 *
 * Today it shows only the name, as `display_text()` in `MapScene.pde` did
 * ("Currently displaying: " + label), and doesn't offer `onClose` or
 * `onFindAnother` yet. Track D of the Step 2 plan adds the entrance label,
 * departments and buttons, behind the same props.
 */
export function DetailCard({ place }: DetailCardProps) {
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[var(--luke-purple)]/95 p-3 text-center text-white shadow-lg">
      <p className="font-semibold text-[var(--luke-gold)]">
        Currently displaying:
        <br />
        {place.name}
      </p>
    </div>
  );
}
