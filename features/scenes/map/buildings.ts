/**
 * Campus map markers.
 *
 * The Processing build hard-coded `ClickableButton`s against pixel coordinates
 * on a fixed-size `LUJustMap.jpg`. Coordinates here are fractions of the map
 * area (0-1) so markers stay put at any kiosk resolution, and the data is
 * separated from the scene so it can move to a route handler or CMS later.
 */
export interface CampusBuilding {
  id: string;
  name: string;
  description: string;
  /** Horizontal position as a fraction of map width. */
  x: number;
  /** Vertical position as a fraction of map height. */
  y: number;
}

/** Sample data — replace with the real marker set from the kiosk repo. */
export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    id: "fields",
    name: "Fields Engineering Center",
    description: "Home of the Raymond B. Jones College of Engineering, labs and design studios.",
    x: 0.34,
    y: 0.42,
  },
  {
    id: "bennett",
    name: "Bennett Campus Center",
    description: "Dining, the bookstore, and student services.",
    x: 0.58,
    y: 0.3,
  },
  {
    id: "beaman",
    name: "Beaman Library",
    description: "Study space, research help, and the university archives.",
    x: 0.46,
    y: 0.62,
  },
  {
    id: "allen",
    name: "Allen Arena",
    description: "Athletics, chapel, and commencement.",
    x: 0.7,
    y: 0.72,
  },
];

/**
 * Nearest marker to a point, or null if nothing is within `radius`.
 *
 * `MapScene.Click()` did this with a running minimum over every button; the
 * threshold keeps a tap on empty map from selecting something across campus.
 */
export function findNearestBuilding(
  buildings: CampusBuilding[],
  x: number,
  y: number,
  radius = 0.12,
): CampusBuilding | null {
  let nearest: CampusBuilding | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const building of buildings) {
    const distance = Math.hypot(building.x - x, building.y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = building;
    }
  }

  return nearestDistance <= radius ? nearest : null;
}
