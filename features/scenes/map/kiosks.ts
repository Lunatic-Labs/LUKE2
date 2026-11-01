import { CAMPUS_BUILDINGS, type CampusBuilding } from "./buildings";

/**
 * The physical kiosks and where each one stands.
 *
 * Every kiosk runs the same build, so a kiosk's details live here and one
 * setting picks the active entry when the app starts, rather than each machine
 * carrying its own copy of a place, a door and a direction that could disagree.
 */
export interface Kiosk {
  /** The `places.json` id of the place the kiosk is installed in. */
  placeId: string;
  /** The entrance of that place visitors leave through; directions start here. */
  exitEntranceId: string;
  /**
   * Compass direction a visitor faces while looking at the screen, in degrees
   * clockwise from north. Null until measured: 0 would claim the screen faces
   * north, and direction cues would trust it.
   */
  headingDeg: number | null;
}

export const KIOSKS: Record<string, Kiosk> = {
  fields: {
    placeId: "fields-engineering-center",
    // The front entrance, facing the rest of campus.
    exitEntranceId: "front",
    headingDeg: null,
  },
};

/** The kiosk assumed when no setting names one. */
export const DEFAULT_KIOSK_ID = "fields";

/**
 * The kiosk a `KioskId` setting names. A typo in one machine's options
 * shouldn't take its map down, so an unknown id warns and uses the default.
 */
export function resolveKiosk(kioskId: string): Kiosk {
  if (Object.hasOwn(KIOSKS, kioskId)) return KIOSKS[kioskId];
  console.warn(`Unknown KioskId "${kioskId}"; using "${DEFAULT_KIOSK_ID}".`);
  return KIOSKS[DEFAULT_KIOSK_ID];
}

/**
 * Where a kiosk stands on the map. `MapScene.Init()` set this independently of
 * the building list (`mapMarX`/`mapMarY` = `x_max/3.4`, `y_max/16.84210526`)
 * but landed on Fields Engineering Center, where the physical kiosk is
 * installed — so it's derived from the kiosk's place's own (now-measured)
 * position here instead of carrying a second, separately-tunable coordinate
 * that can drift out of sync with it. Drawn with `markerTransparent.png`
 * regardless of what building is selected.
 */
export function kioskLocation(kioskId: string): CampusBuilding {
  const { placeId } = resolveKiosk(kioskId);
  return CAMPUS_BUILDINGS.find((building) => building.id === placeId)!;
}
