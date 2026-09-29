/**
 * Campus map markers.
 *
 * Ported from the `buttons` array in `src/luke_java/MapButtons.pde` — the 50
 * buildings `MapScene` and (unused, see below) `MapAIScene` share. Each
 * upstream `ClickableButton` also carried a `key_scale_*` pair: a pixel
 * hit-region tuned to make a name on the printed legend image `LUKey.jpg`
 * tappable, at one specific screen resolution — the region's position was a
 * fraction of the full canvas height while the image itself rendered at
 * whatever height its aspect ratio produced, so the hit-boxes only lined up
 * with the printed text at the resolution they were eyeballed against. That
 * coupling has no reliable counterpart at arbitrary viewport sizes, so this
 * port replaces the Key screen with a real, accessible list instead of
 * invisible hit-boxes over a JPEG: tapping a name in that list does what
 * `on_key_button_click()` did, selecting the building and switching back to
 * the map. Only `map_scale_*` (kept as `x`/`y`, resolution-independent by
 * construction) survives into the port.
 *
 * Upstream had no per-building description; `display_text()` only ever showed
 * the name ("Currently displaying: " + label), so none is invented here either.
 */
export interface CampusBuilding {
  id: string;
  name: string;
  /** Horizontal position as a fraction of map width (`map_scale_width`). */
  x: number;
  /** Vertical position as a fraction of map height (`map_scale_height`). */
  y: number;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: "allen-arena", name: "Allen Arena", x: 0.37778, y: 0.352378 },
  { id: "draper-diamond", name: "Draper Diamond", x: 0.22222, y: 0.425 },
  { id: "dugan-field", name: "Dugan Field", x: 0.407741, y: 0.43611 },
  { id: "huston-marsh-griffith-tennis-center", name: "Huston-Marsh-Griffith Tennis Center", x: 0.28272, y: 0.41111 },
  { id: "intramural-field", name: "Intramural Field", x: 0.5605, y: 0.2243 },
  { id: "mcquiddy-gym", name: "McQuiddy Gym", x: 0.32222, y: 0.34167 },
  { id: "soccer-complex", name: "Soccer Complex", x: 0.20988, y: 0.50278 },
  { id: "student-activities-center", name: "Student Activities Center", x: 0.28399, y: 0.35 },
  { id: "bison-hall-and-bison-inn", name: "Bison Hall & Bison Inn", x: 0.35185, y: 0.0875 },
  { id: "elam-hall", name: "Elam Hall", x: 0.41728, y: 0.1625 },
  { id: "fanning-hall", name: "Fanning Hall", x: 0.30617, y: 0.16597 },
  { id: "high-rise", name: "High Rise", x: 0.51481, y: 0.33333 },
  { id: "johnson-hall", name: "Johnson Hall", x: 0.37778, y: 0.28125 },
  { id: "sewell-hall", name: "Sewell Hall", x: 0.48272, y: 0.28056 },
  { id: "the-village", name: "The Village", x: 0.35926, y: 0.12917 },
  { id: "acuff-chapel", name: "Acuff Chapel", x: 0.61852, y: 0.13611 },
  { id: "academy-gymnasium", name: "Academy Gymnasium", x: 0.65185, y: 0.13542 },
  { id: "harding-hall", name: "Harding Hall", x: 0.54815, y: 0.13889 },
  { id: "mccadams-athletic-center", name: "McCadams Athletic Center", x: 0.83951, y: 0.17361 },
  { id: "music-wing", name: "Music Wing", x: 0.49753, y: 0.13958 },
  { id: "reese-smith-athletic-complex", name: "Reese Smith Athletic Complex", x: 0.83951, y: 0.20833 },
  { id: "advancement-office", name: "Advancement Office", x: 0.41975, y: 0.10972 },
  { id: "allen-bell-tower", name: "Allen Bell Tower", x: 0.27531, y: 0.31667 },
  { id: "alumni-relations", name: "Alumni Relations", x: 0.75185, y: 0.125 },
  { id: "a-m-burton-health-sciences-center", name: "A.M. Burton Health Sciences Center", x: 0.28519, y: 0.22639 },
  { id: "beaman-library", name: "Beaman Library", x: 0.19753, y: 0.28889 },
  { id: "bennet-campus-center", name: "Bennet Campus Center", x: 0.41643, y: 0.21944 },
  { id: "bison-square-and-osman-fountain", name: "Bison Square & Osman Fountain", x: 0.36914, y: 0.23333 },
  { id: "collins-alumni-auditorium", name: "Collins Alumni Auditorium", x: 0.31667, y: 0.22639 },
  { id: "contemporary-music-house", name: "Contemporary Music House", x: 0.65556, y: 0.25139 },
  { id: "crisman-administration-building", name: "Crisman Administration Building", x: 0.24444, y: 0.18056 },
  { id: "ezell-center", name: "Ezell Center", x: 0.20494, y: 0.33611 },
  { id: "fields-engineering-center", name: "Fields Engineering Center", x: 0.29307, y: 0.05972 },
  { id: "flatt-ampitheater", name: "Flatt Ampitheater", x: 0.41641, y: 0.24167 },
  { id: "george-shinn-center", name: "George Shinn Center", x: 0.21852, y: 0.36181 },
  { id: "graduate-admissions", name: "Graduate Admissions", x: 0.40556, y: 0.09375 },
  { id: "honors-college", name: "Honors College", x: 0.40741, y: 0.07292 },
  { id: "james-d-hughes-center", name: "James D. Hughes Center", x: 0.23704, y: 0.10972 },
  { id: "lipscomb-family-therapy-center", name: "Lipscomb Family Therapy Center", x: 0.70556, y: 0.09861 },
  { id: "lipscomb-online", name: "Lipscomb Online", x: 0.39012, y: 0.10556 },
  { id: "mcfarland-science-center", name: "McFarland Science Center", x: 0.17778, y: 0.16944 },
  { id: "nursing-and-health-sciences-center", name: "Nursing & Health Sciences Center", x: 0.23333, y: 0.08819 },
  { id: "pharmaceutical-sciences-research-center", name: "Pharmaceutical Sciences Research Center", x: 0.23951, y: 0.13264 },
  { id: "shamblin-theatre", name: "Shamblin Theatre", x: 0.47531, y: 0.21736 },
  { id: "swang-business-center", name: "Swang Business Center", x: 0.30556, y: 0.28194 },
  { id: "thomas-james-mcmeen-music-center", name: "Thomas James McMeen Music Center", x: 0.32099, y: 0.24097 },
  { id: "university-health-services", name: "University Health Services", x: 0.43457, y: 0.08056 },
  { id: "university-theatre", name: "University Theatre", x: 0.51358, y: 0.29375 },
  { id: "veterans-resource-center", name: "Veterans' Resource Center", x: 0.40988, y: 0.12604 },
  { id: "ward-hall", name: "Ward Hall", x: 0.21235, y: 0.15764 },
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
