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
