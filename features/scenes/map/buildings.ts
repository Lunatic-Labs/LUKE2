/**
 * Campus map markers.
 *
 * `src/luke_java/MapButtons.pde` hard-codes a (label, x, y) triple per
 * building, but those coordinates turned out not to line up with the real
 * `LUJustMap.jpg` — clicking a numbered building on the map (per the
 * `LUKey.jpg` legend) could select a name several buildings away. The X
 * values were close; Y was consistently off by roughly the same factor for
 * every building checked, as if measured against a taller reference frame
 * than the image itself ever rendered at (upstream's own click math used the
 * canvas height as the denominator, not the image's — see the discussion this
 * replaced in git history). Rather than guess at a correction factor, these
 * coordinates were re-measured directly from the shipped `LUJustMap.jpg`:
 * each of the 50 numbered markers was located by color-based blob detection,
 * then matched to its name via `LUKey.jpg`'s legend. `x`/`y` are fractions
 * of the image's own width/height, so they stay correct at any render size.
 *
 * Upstream had no per-building description; `display_text()` only ever showed
 * the name ("Currently displaying: " + label), so none is invented here either.
 */
export interface CampusBuilding {
  id: string;
  name: string;
  /** Horizontal position as a fraction of map width. */
  x: number;
  /** Vertical position as a fraction of map height. */
  y: number;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: "a-m-burton-health-sciences-center", name: "A.M. Burton Health Sciences Center", x: 0.28587, y: 0.395 },
  { id: "acuff-chapel", name: "Acuff Chapel", x: 0.61763, y: 0.23813 },
  { id: "advancement-office", name: "Advancement Office", x: 0.41969, y: 0.19062 },
  { id: "allen-arena", name: "Allen Arena", x: 0.37701, y: 0.61146 },
  { id: "allen-bell-tower", name: "Allen Bell Tower", x: 0.27622, y: 0.54854 },
  { id: "alumni-relations", name: "Alumni Relations", x: 0.7508, y: 0.21833 },
  { id: "beaman-library", name: "Beaman Library", x: 0.19773, y: 0.50083 },
  { id: "bennett-campus-center", name: "Bennett Campus Center", x: 0.41711, y: 0.38167 },
  { id: "bison-hall-and-bison-inn", name: "Bison Hall & Bison Inn", x: 0.35149, y: 0.15229 },
  { id: "bison-square-and-osman-fountain", name: "Bison Square & Osman Fountain", x: 0.36908, y: 0.40437 },
  { id: "collins-alumni-auditorium", name: "Collins Alumni Auditorium", x: 0.31546, y: 0.39333 },
  { id: "contemporary-music-house", name: "Contemporary Music House", x: 0.6558, y: 0.43625 },
  { id: "crisman-administration-building", name: "Crisman Administration Building", x: 0.24383, y: 0.31375 },
  { id: "draper-diamond", name: "Draper Diamond", x: 0.22089, y: 0.73625 },
  { id: "dugan-field", name: "Dugan Field", x: 0.40682, y: 0.75646 },
  { id: "elam-hall", name: "Elam Hall", x: 0.41668, y: 0.28125 },
  { id: "ezell-center", name: "Ezell Center", x: 0.20437, y: 0.58167 },
  { id: "fanning-hall", name: "Fanning Hall", x: 0.30603, y: 0.28813 },
  { id: "fields-engineering-center", name: "Fields Engineering Center", x: 0.29166, y: 0.10437 },
  { id: "flatt-amphitheater", name: "Flatt Amphitheater", x: 0.41647, y: 0.41833 },
  { id: "george-shinn-center", name: "George Shinn Center", x: 0.21789, y: 0.62583 },
  { id: "graduate-admissions", name: "Graduate Admissions", x: 0.40532, y: 0.16271 },
  { id: "gymnasium", name: "Gymnasium", x: 0.65323, y: 0.23521 },
  { id: "harding-hall", name: "Harding Hall", x: 0.54793, y: 0.24229 },
  { id: "high-rise-hall", name: "High Rise Hall", x: 0.5149, y: 0.57875 },
  { id: "honors-college", name: "Honors College", x: 0.40725, y: 0.12687 },
  { id: "huston-marsh-griffith-tennis-center", name: "Huston-Marsh-Griffith Tennis Center", x: 0.28179, y: 0.71208 },
  { id: "intramural-field", name: "Intramural Field", x: 0.56101, y: 0.38875 },
  { id: "james-d-hughes-center", name: "James D. Hughes Center", x: 0.23719, y: 0.19104 },
  { id: "johnson-hall", name: "Johnson Hall", x: 0.37701, y: 0.48896 },
  { id: "lipscomb-family-therapy-center", name: "Lipscomb Family Therapy Center", x: 0.7062, y: 0.17146 },
  { id: "lipscomb-online", name: "Lipscomb Online", x: 0.38966, y: 0.18313 },
  { id: "mccadams-athletic-center", name: "McCadams Athletic Center", x: 0.83809, y: 0.30146 },
  { id: "mcfarland-science-center", name: "McFarland Science Center", x: 0.17757, y: 0.29375 },
  { id: "mcquiddy-gym", name: "McQuiddy Gym", x: 0.32275, y: 0.59167 },
  { id: "music-wing", name: "Music Wing", x: 0.49818, y: 0.24208 },
  { id: "nursing-and-health-sciences-center", name: "Nursing & Health Sciences Center", x: 0.23333, y: 0.1525 },
  { id: "pharmaceutical-sciences-research-center", name: "Pharmaceutical Sciences Research Center", x: 0.2389, y: 0.22937 },
  { id: "reese-smith-athletic-complex", name: "Reese Smith Athletic Complex", x: 0.83959, y: 0.36229 },
  { id: "sewell-hall", name: "Sewell Hall", x: 0.48252, y: 0.48812 },
  { id: "shamblin-theatre", name: "Shamblin Theatre", x: 0.47652, y: 0.37771 },
  { id: "soccer-complex", name: "Soccer Complex", x: 0.20995, y: 0.87021 },
  { id: "student-activities-center", name: "Student Activities Center", x: 0.28394, y: 0.60354 },
  { id: "swang-business-center", name: "Swang Business Center", x: 0.30431, y: 0.48896 },
  { id: "the-village", name: "The Village", x: 0.35921, y: 0.22458 },
  { id: "thomas-james-mcmeen-music-center", name: "Thomas James McMeen Music Center", x: 0.32018, y: 0.41667 },
  { id: "university-health-services", name: "University Health Services", x: 0.43491, y: 0.14062 },
  { id: "university-theatre", name: "University Theatre", x: 0.51319, y: 0.50875 },
  { id: "veterans-resource-center", name: "Veterans' Resource Center", x: 0.41047, y: 0.22062 },
  { id: "ward-hall", name: "Ward Hall", x: 0.21252, y: 0.27333 },
];

/**
 * Where the kiosk itself stands, matching `mapMarX`/`mapMarY` in
 * `MapScene.Init()` (`x_max/3.4`, `y_max/16.84210526`) — coordinates that land
 * on Fields Engineering Center, where the physical kiosk is installed. Drawn
 * with `markerTransparent.png` regardless of what building is selected.
 */
export const KIOSK_LOCATION = { x: 1 / 3.4, y: 1 / 16.84210526 };

/**
 * Nearest marker to a tap, or null if nothing is close enough.
 *
 * `MapScene.Click()` summed the horizontal and vertical fractional offsets
 * separately (`abs(x - buttonX) / width`, `abs(y - buttonY) / y_max`, added
 * together) rather than a straight-line distance, and only accepted the
 * closest match within a combined 0.1 — kept here instead of switching to
 * Euclidean distance so the same tap accuracy upstream tuned still applies.
 */
export function findNearestBuilding(
  buildings: CampusBuilding[],
  x: number,
  y: number,
  threshold = 0.1,
): CampusBuilding | null {
  let nearest: CampusBuilding | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const building of buildings) {
    const distance = Math.abs(building.x - x) + Math.abs(building.y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = building;
    }
  }

  return nearestDistance <= threshold ? nearest : null;
}

/**
 * `LUJustMap.jpg`'s real pixel dimensions (4663x4800). `MapScene.pde` resized
 * the map to the full screen width and drew it unscaled from there, so its
 * displayed height was whatever this ratio produced — filling the scene area
 * exactly only on a screen shaped to match it.
 */
export const MAP_ASPECT_RATIO = 4663 / 4800;

/**
 * The largest box of `aspectRatio` that fits inside a `width` x `height` area
 * — letterboxed on whichever axis has slack, never stretched or cropped.
 *
 * Building coordinates are fractions of the map image itself, so the scene
 * has to render (and hit-test clicks against) this exact box rather than the
 * full scene area: any mismatch between the two — e.g. rendering with
 * `object-fit: contain` but reading clicks against the surrounding
 * container's full bounds — puts every selection off by however much
 * letterboxing there was.
 */
export function fitToAspectRatio(
  width: number,
  height: number,
  aspectRatio: number,
): { width: number; height: number } {
  if (!width || !height) return { width: 0, height: 0 };
  return width / height > aspectRatio
    ? { width: height * aspectRatio, height }
    : { width, height: width / aspectRatio };
}
