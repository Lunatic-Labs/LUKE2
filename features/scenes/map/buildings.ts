import placesData from "./data/places.json";

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
 * They live in `data/places.json` as each place's `map` position.
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

/**
 * What sort of place an entry is. An office is a destination inside another
 * building; a venue or field is somewhere people go that isn't an enclosed
 * building (an amphitheater, a square, a ballpark).
 */
export const PLACE_KINDS = ["building", "office", "venue", "field"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

/**
 * The section a place is listed under on the Find screen. One per place, so
 * every place appears exactly once in the grouped list; a search for a
 * generic word like "dorm" can match a whole category.
 */
export const PLACE_CATEGORIES = [
  "admissions-visitors",
  "academics",
  "student-life",
  "athletics",
  "housing",
  "admin",
  "arts",
  "health",
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export interface CampusPlace {
  id: string;
  name: string;
  kind: PlaceKind;
  category: PlaceCategory;
  /** For an office inside another place: that place's id. Unset for standalone offices. */
  withinBuildingId?: string;
  aliases: string[];
  /** Departments in this place, written as the detail card should show them. */
  departments?: string[];
  map: { x: number; y: number };
  /** Real-world position of the place's centre. */
  geo: { lat: number; lng: number };
  entrances?: Entrance[];
  /** Path under `public/` to a photo of the main entrance. Deferred; unset for now. */
  photo?: string;
}

/** A door visitors can use to get into a place. */
export interface Entrance {
  /** Unique within its place, e.g. "front" or "north". */
  id: string;
  /** How a visitor recognizes it, e.g. "Front entrance, facing Bison Square". */
  label?: string;
  /** Real-world position; where QR directions and routes end. */
  geo: { lat: number; lng: number };
  /** Position on the map image, as fractions of its width and height. */
  map?: { x: number; y: number };
  /** The default door for the place; exactly one per place. */
  primary?: boolean;
  /** Deferred until accessibility data is collected. */
  accessible?: boolean;
}

/**
 * Every place in `data/places.json`, in file order.
 *
 * TypeScript types a JSON file's strings as plain `string`, so `"kind":
 * "building"` can't be checked against `PlaceKind` at compile time and the
 * file has to be cast. `validatePlaces` is what makes that cast safe: the
 * tests run it over this list, so a typo in the JSON fails `npm test` rather
 * than reaching the kiosk.
 */
export const CAMPUS_PLACES = placesData as CampusPlace[];

const PLACE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isFraction(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 1;
}

/**
 * A box around campus with a little margin. Anything outside it is a mistake,
 * most likely a typo or lat and lng swapped, which would otherwise send a
 * visitor's directions somewhere else entirely.
 */
const CAMPUS_BOUNDS = { minLat: 36.099, maxLat: 36.111, minLng: -86.804, maxLng: -86.789 };

function isOnCampus(geo: { lat: number; lng: number } | undefined): boolean {
  return (
    typeof geo?.lat === "number" &&
    typeof geo.lng === "number" &&
    geo.lat >= CAMPUS_BOUNDS.minLat &&
    geo.lat <= CAMPUS_BOUNDS.maxLat &&
    geo.lng >= CAMPUS_BOUNDS.minLng &&
    geo.lng <= CAMPUS_BOUNDS.maxLng
  );
}

/**
 * Everything wrong with a list of places, one readable message per problem;
 * an empty list means the data is valid. Checks what the types can't: values
 * from the allowed lists, unique ids and names, aliases written the way
 * search expects, positions on the map, and references between places.
 *
 * Whether an alias may be shared by two places is a judgment call, so that
 * check lives in the tests next to the list of deliberate exceptions.
 */
export function validatePlaces(places: CampusPlace[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const place of places) {
    if (!PLACE_ID.test(place.id)) {
      problems.push(`"${place.id}": id must be lowercase words joined by dashes`);
    }
    if (ids.has(place.id)) problems.push(`"${place.id}": id is used more than once`);
    ids.add(place.id);

    const name = place.name?.trim() ?? "";
    if (!name) problems.push(`"${place.id}": name is empty`);
    if (names.has(name)) problems.push(`"${place.id}": name "${name}" is used more than once`);
    names.add(name);
  }

  for (const place of places) {
    const where = `"${place.id}"`;

    if (!(PLACE_KINDS as readonly string[]).includes(place.kind)) {
      problems.push(`${where}: unknown kind "${place.kind}"`);
    }
    if (!(PLACE_CATEGORIES as readonly string[]).includes(place.category)) {
      problems.push(`${where}: unknown category "${place.category}"`);
    }

    if (place.withinBuildingId !== undefined) {
      if (place.withinBuildingId === place.id) {
        problems.push(`${where}: withinBuildingId points to itself`);
      } else if (!ids.has(place.withinBuildingId)) {
        problems.push(`${where}: withinBuildingId "${place.withinBuildingId}" is not a place`);
      }
      if (place.kind !== "office") {
        problems.push(`${where}: only an office can have withinBuildingId`);
      }
    }

    if (!Array.isArray(place.aliases)) {
      problems.push(`${where}: aliases must be a list`);
    } else {
      const seen = new Set<string>();
      for (const alias of place.aliases) {
        if (typeof alias !== "string" || !alias.trim()) {
          problems.push(`${where}: has an empty alias`);
          continue;
        }
        // Search compares lowercase text, so anything else would never match.
        if (alias !== alias.trim().toLowerCase()) {
          problems.push(`${where}: alias "${alias}" must be lowercase with no outer spaces`);
        }
        if (seen.has(alias)) problems.push(`${where}: alias "${alias}" is listed twice`);
        seen.add(alias);
        if (alias === place.name?.toLowerCase()) {
          problems.push(`${where}: alias "${alias}" just repeats the name`);
        }
      }
    }

    if (place.departments !== undefined) {
      const seen = new Set<string>();
      for (const department of place.departments) {
        if (typeof department !== "string" || !department.trim()) {
          problems.push(`${where}: has an empty department`);
          continue;
        }
        if (department !== department.trim()) {
          problems.push(`${where}: department "${department}" has outer spaces`);
        }
        if (seen.has(department)) problems.push(`${where}: department "${department}" is listed twice`);
        seen.add(department);
      }
    }

    if (!isFraction(place.map?.x) || !isFraction(place.map?.y)) {
      problems.push(`${where}: map x and y must be numbers from 0 to 1`);
    }

    if (!isOnCampus(place.geo)) {
      problems.push(`${where}: geo must be a lat and lng on campus`);
    }

    if (place.entrances !== undefined) {
      if (place.entrances.length === 0) {
        problems.push(`${where}: entrances is empty; leave it out until there is one`);
      }
      const entranceIds = new Set<string>();
      for (const entrance of place.entrances) {
        const door = `${where} entrance "${entrance.id}"`;
        if (entranceIds.has(entrance.id)) problems.push(`${door}: id is used more than once`);
        entranceIds.add(entrance.id);
        if (!isOnCampus(entrance.geo)) {
          problems.push(`${door}: geo must be a lat and lng on campus`);
        }
        if (entrance.map !== undefined && (!isFraction(entrance.map.x) || !isFraction(entrance.map.y))) {
          problems.push(`${door}: map x and y must be numbers from 0 to 1`);
        }
      }
      const primaries = place.entrances.filter((entrance) => entrance.primary).length;
      if (place.entrances.length > 0 && primaries !== 1) {
        problems.push(`${where}: needs exactly one primary entrance, has ${primaries}`);
      }
    }
  }

  return problems;
}

/**
 * The places as flat (id, name, x, y) markers: the shape the scene and
 * `findNearestBuilding` were written against. Derived from `CAMPUS_PLACES`,
 * so `data/places.json` is the only list to edit.
 */
export const CAMPUS_BUILDINGS: CampusBuilding[] = CAMPUS_PLACES.map((place) => ({
  id: place.id,
  name: place.name,
  x: place.map.x,
  y: place.map.y,
}));

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
 * Which way true north points on `LUJustMap.jpg`, in degrees clockwise from the
 * top of the image: north is about 10 degrees to the left of straight up, as the
 * compass drawn on the map shows. Measured by fitting each place's `map` position
 * to its `geo`; the tests repeat the fit, so this can't drift from the data.
 */
export const MAP_NORTH_DEG = -10.4;

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
