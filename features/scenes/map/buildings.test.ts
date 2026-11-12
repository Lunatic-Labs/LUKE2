import fs from "fs";
import path from "path";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_PLACES,
  findNearestBuilding,
  fitToAspectRatio,
  MAP_ASPECT_RATIO,
  MAP_NORTH_DEG,
  validatePlaces,
  type CampusPlace,
} from "./buildings";

const MAP_ASSETS = path.join(__dirname, "../../../public/map");

/**
 * Pixel size of a baseline or progressive JPEG, read from its SOF segment so
 * the test needs no image library.
 */
function jpegSize(file: string): { width: number; height: number } {
  const data = fs.readFileSync(file);
  let offset = 2; // skip the SOI marker
  while (offset < data.length) {
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    // SOF0-SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`No SOF segment found in ${file}`);
}

describe("findNearestBuilding", () => {
  const buildings = [
    { id: "a", name: "A", x: 0.2, y: 0.2 },
    { id: "b", name: "B", x: 0.8, y: 0.8 },
  ];

  it("selects the closest marker to the tap", () => {
    expect(findNearestBuilding(buildings, 0.22, 0.22)?.id).toBe("a");
    expect(findNearestBuilding(buildings, 0.75, 0.79)?.id).toBe("b");
  });

  it("returns null when the tap lands on empty map", () => {
    // MapScene.Click() only accepted a marker within a threshold, so a stray
    // tap does not select something across campus.
    expect(findNearestBuilding(buildings, 0.5, 0.5)).toBeNull();
  });

  it("sums horizontal and vertical offsets rather than a straight-line distance", () => {
    // MapScene.Click(): abs(x - buttonX)/width + abs(y - buttonY)/y_max,
    // accepted within a combined 0.1 — not Euclidean distance.
    const onlyBuilding = [{ id: "a", name: "A", x: 0.2, y: 0.2 }];
    // Euclidean distance here is ~0.099 (within a 0.12 radius), but the
    // Manhattan sum is 0.14 — past the upstream threshold.
    expect(findNearestBuilding(onlyBuilding, 0.13, 0.13)).toBeNull();
    // Within the combined-offset threshold.
    expect(findNearestBuilding(onlyBuilding, 0.25, 0.22)?.id).toBe("a");
  });

  it("honours a widened threshold", () => {
    // Manhattan distance from (0.5, 0.5) to either marker is 0.6.
    expect(findNearestBuilding(buildings, 0.5, 0.5, 0.7)).not.toBeNull();
  });

  it("accepts a tap exactly on the threshold", () => {
    // The comparison is `<=`, so a tap at exactly the threshold still counts.
    // 0.125 is used because it is exact in binary floating point (0.1 is not).
    const onlyBuilding = [{ id: "a", name: "A", x: 0.5, y: 0.5 }];
    expect(findNearestBuilding(onlyBuilding, 0.5, 0.625, 0.125)?.id).toBe("a");
    expect(findNearestBuilding(onlyBuilding, 0.5, 0.75, 0.125)).toBeNull();
  });

  it("returns null for an empty marker set", () => {
    expect(findNearestBuilding([], 0.5, 0.5)).toBeNull();
  });

  it("ships all 50 buildings from MapButtons.pde with unique ids", () => {
    const ids = CAMPUS_BUILDINGS.map((building) => building.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CAMPUS_BUILDINGS).toHaveLength(50);
  });

  it("gives every building a unique, non-empty name", () => {
    // The Key screen lists buildings by name, so two identical labels would
    // be indistinguishable there.
    const names = CAMPUS_BUILDINGS.map((building) => building.name.trim());
    expect(names.every((name) => name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("selects each building when its own marker is tapped", () => {
    // Fails if two buildings share coordinates: the second one could never be
    // selected from the map, only from the Key screen.
    for (const building of CAMPUS_BUILDINGS) {
      expect(findNearestBuilding(CAMPUS_BUILDINGS, building.x, building.y)?.id).toBe(building.id);
    }
  });

  it("keeps every marker's coordinates within the map image", () => {
    for (const building of CAMPUS_BUILDINGS) {
      expect(building.x).toBeGreaterThanOrEqual(0);
      expect(building.x).toBeLessThanOrEqual(1);
      expect(building.y).toBeGreaterThanOrEqual(0);
      expect(building.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("CAMPUS_PLACES", () => {
  /**
   * Aliases deliberately given to more than one place. Search offers every
   * place listed, so each entry is a decision rather than an accident; add to
   * this list only on purpose.
   */
  const SHARED_ALIASES: Record<string, string[]> = {
    "health sciences building": [
      "a-m-burton-health-sciences-center",
      "nursing-and-health-sciences-center",
    ],
    dining: ["bennett-campus-center", "student-activities-center"],
    food: ["bennett-campus-center", "student-activities-center"],
    eat: ["bennett-campus-center", "student-activities-center"],
    // Placeholder until we know whether these are boys' or girls' halls.
    dorm: ["bison-hall-and-bison-inn", "sewell-hall"],
    "girls dorm": ["elam-hall", "fanning-hall", "johnson-hall"],
  };

  it("passes validation", () => {
    expect(validatePlaces(CAMPUS_PLACES)).toEqual([]);
  });

  it("gives every building an entrance, apart from those still to be found", () => {
    // Directions need a door, so a new building can't be added without one. Remove
    // each building from this list as its entrance is added.
    const ENTRANCE_STILL_TO_FIND = [
      "acuff-chapel",
      "advancement-office",
      "alumni-relations",
      "graduate-admissions",
      "harding-hall",
      "honors-college",
      "lipscomb-family-therapy-center",
      "lipscomb-online",
      "mccadams-athletic-center",
      "sewell-hall",
      "the-village",
      "university-health-services",
      "university-theatre",
      "veterans-resource-center",
    ];
    const missing = CAMPUS_PLACES.filter((place) => place.kind === "building" && !place.entrances);
    expect(missing.map((place) => place.id)).toEqual(ENTRANCE_STILL_TO_FIND);
  });

  it("shares an alias between places only where listed in SHARED_ALIASES", () => {
    const owners = new Map<string, string[]>();
    for (const place of CAMPUS_PLACES) {
      for (const alias of place.aliases) {
        owners.set(alias, [...(owners.get(alias) ?? []), place.id]);
      }
    }
    const shared = Object.fromEntries(
      [...owners].filter(([, ids]) => ids.length > 1).map(([alias, ids]) => [alias, ids.sort()]),
    );
    expect(shared).toEqual(SHARED_ALIASES);
  });
});

describe("validatePlaces", () => {
  const place = (overrides: Partial<CampusPlace> = {}): CampusPlace => ({
    id: "test-hall",
    name: "Test Hall",
    kind: "building",
    category: "academics",
    aliases: [],
    map: { x: 0.5, y: 0.5 },
    geo: { lat: 36.105, lng: -86.798 },
    ...overrides,
  });
  const entrance = { id: "front", geo: { lat: 36.1, lng: -86.8 } };

  it("accepts a valid place", () => {
    expect(validatePlaces([place()])).toEqual([]);
  });

  it("rejects duplicate ids and names", () => {
    expect(validatePlaces([place(), place()])).toEqual([
      '"test-hall": id is used more than once',
      '"test-hall": name "Test Hall" is used more than once',
    ]);
  });

  it("rejects ids that aren't lowercase and dash-separated", () => {
    expect(validatePlaces([place({ id: "Test Hall" })])).toHaveLength(1);
  });

  it("rejects a kind or category outside the allowed lists", () => {
    const bad = place({ kind: "dorm" as CampusPlace["kind"], category: "dining" as CampusPlace["category"] });
    expect(validatePlaces([bad])).toEqual([
      '"test-hall": unknown kind "dorm"',
      '"test-hall": unknown category "dining"',
    ]);
  });

  it("rejects aliases search could never match", () => {
    const problems = validatePlaces([place({ aliases: ["Test", " test ", "", "x", "x", "test hall"] })]);
    expect(problems).toEqual([
      '"test-hall": alias "Test" must be lowercase with no outer spaces',
      '"test-hall": alias " test " must be lowercase with no outer spaces',
      '"test-hall": has an empty alias',
      '"test-hall": alias "x" is listed twice',
      '"test-hall": alias "test hall" just repeats the name',
    ]);
  });

  it("rejects blank, untrimmed and repeated departments", () => {
    expect(validatePlaces([place({ departments: ["English", "Bible and Theology"] })])).toEqual([]);
    expect(validatePlaces([place({ departments: ["", " English", "Math", "Math"] })])).toEqual([
      '"test-hall": has an empty department',
      '"test-hall": department " English" has outer spaces',
      '"test-hall": department "Math" is listed twice',
    ]);
  });

  it("rejects a marker outside the map image", () => {
    expect(validatePlaces([place({ map: { x: 1.2, y: 0.5 } })])).toEqual([
      '"test-hall": map x and y must be numbers from 0 to 1',
    ]);
  });

  it("rejects coordinates off campus, including lat and lng swapped", () => {
    expect(validatePlaces([place({ geo: { lat: 36.105, lng: -86.798 } })])).toEqual([]);
    for (const geo of [
      { lat: -86.798, lng: 36.105 },
      { lat: 36.105, lng: 86.798 },
      { lat: 37.105, lng: -86.798 },
    ]) {
      expect(validatePlaces([place({ geo })])).toEqual([
        '"test-hall": geo must be a lat and lng on campus',
      ]);
    }
  });

  it("checks withinBuildingId points to another place, from an office", () => {
    const office = place({ id: "test-office", name: "Test Office", kind: "office" });
    expect(validatePlaces([place(), { ...office, withinBuildingId: "test-hall" }])).toEqual([]);
    expect(validatePlaces([{ ...office, withinBuildingId: "missing" }])).toEqual([
      '"test-office": withinBuildingId "missing" is not a place',
    ]);
    expect(validatePlaces([place({ kind: "building", withinBuildingId: "test-hall" })])).toEqual([
      '"test-hall": withinBuildingId points to itself',
      '"test-hall": only an office can have withinBuildingId',
    ]);
  });

  it("requires exactly one primary entrance, with valid coordinates", () => {
    expect(validatePlaces([place({ entrances: [{ ...entrance, primary: true }] })])).toEqual([]);
    expect(validatePlaces([place({ entrances: [entrance] })])).toEqual([
      '"test-hall": needs exactly one primary entrance, has 0',
    ]);
    expect(
      validatePlaces([place({ entrances: [{ ...entrance, primary: true, geo: { lat: 136, lng: 0 } }] })]),
    ).toEqual(['"test-hall" entrance "front": geo must be a lat and lng on campus']);
  });

  it("rejects an empty entrance list and repeated entrance ids", () => {
    expect(validatePlaces([place({ entrances: [] })])).toEqual([
      '"test-hall": entrances is empty; leave it out until there is one',
    ]);
    expect(
      validatePlaces([place({ entrances: [{ ...entrance, primary: true }, entrance] })]),
    ).toEqual(['"test-hall" entrance "front": id is used more than once']);
  });
});

describe("map georeferencing", () => {
  // Worked out from their map position, so checking them against it proves nothing.
  const POSITIONED_FROM_MAP = [
    "alumni-relations",
    "lipscomb-family-therapy-center",
    "reese-smith-athletic-complex",
    "thomas-james-mcmeen-music-center",
    "university-theatre",
    "veterans-resource-center",
  ];
  // The map squeezes the far east of campus to fit McCadams on the page, and the
  // Tennis Center's marker sits at one end of a long row of courts.
  const OFF_THE_FIT = ["mccadams-athletic-center", "huston-marsh-griffith-tennis-center"];
  const MAX_ERROR_METERS = 30;

  const METERS_PER_DEGREE_LAT = 111320;
  const METERS_PER_DEGREE_LNG = METERS_PER_DEGREE_LAT * Math.cos((36.105 * Math.PI) / 180);

  /** Map position in units of the image's height, so both axes share a scale. */
  const imagePoint = (place: CampusPlace) => [place.map.x * MAP_ASPECT_RATIO, place.map.y, 1];
  const east = (place: CampusPlace) => place.geo.lng * METERS_PER_DEGREE_LNG;
  const north = (place: CampusPlace) => place.geo.lat * METERS_PER_DEGREE_LAT;

  /** Solves a small linear system by Gaussian elimination with pivoting. */
  function solve(matrix: number[][], values: number[]): number[] {
    const rows = matrix.map((row, i) => [...row, values[i]]);
    rows.forEach((_, i) => {
      const pivot = rows.slice(i).reduce((best, row) => (Math.abs(row[i]) > Math.abs(best[i]) ? row : best));
      const pivotIndex = rows.indexOf(pivot);
      [rows[i], rows[pivotIndex]] = [rows[pivotIndex], rows[i]];
      for (let below = i + 1; below < rows.length; below++) {
        const factor = rows[below][i] / rows[i][i];
        rows[below] = rows[below].map((cell, column) => cell - factor * rows[i][column]);
      }
    });
    const answer = new Array<number>(rows.length).fill(0);
    for (let i = rows.length - 1; i >= 0; i--) {
      const known = answer.reduce((sum, value, column) => sum + (column > i ? rows[i][column] * value : 0), 0);
      answer[i] = (rows[i][rows.length] - known) / rows[i][i];
    }
    return answer;
  }

  /** Least-squares coefficients taking an image point to one ground coordinate. */
  function fit(places: CampusPlace[], ground: (place: CampusPlace) => number): number[] {
    const matrix = [0, 1, 2].map((a) =>
      [0, 1, 2].map((b) => places.reduce((sum, place) => sum + imagePoint(place)[a] * imagePoint(place)[b], 0)),
    );
    const values = [0, 1, 2].map((a) =>
      places.reduce((sum, place) => sum + imagePoint(place)[a] * ground(place), 0),
    );
    return solve(matrix, values);
  }

  const apply = (coefficients: number[], place: CampusPlace) =>
    imagePoint(place).reduce((sum, value, i) => sum + coefficients[i] * value, 0);

  const measured = CAMPUS_PLACES.filter((place) => !POSITIONED_FROM_MAP.includes(place.id));
  const fitted = measured.filter((place) => !OFF_THE_FIT.includes(place.id));
  const toEast = fit(fitted, east);
  const toNorth = fit(fitted, north);

  const errorMeters = (place: CampusPlace) =>
    Math.hypot(apply(toEast, place) - east(place), apply(toNorth, place) - north(place));

  it.each(fitted.map((place) => place.id))("places %s where the map shows it", (id) => {
    // A mistyped coordinate or a marker on the wrong building lands far from the fit.
    const place = fitted.find((candidate) => candidate.id === id)!;
    expect(errorMeters(place)).toBeLessThan(MAX_ERROR_METERS);
  });

  it("still needs both exceptions", () => {
    // If either starts fitting, it should stop being excused.
    for (const id of OFF_THE_FIT) {
      const place = measured.find((candidate) => candidate.id === id)!;
      expect(errorMeters(place)).toBeGreaterThan(MAX_ERROR_METERS);
    }
  });

  it("records which way north is on the image", () => {
    // Invert the fit: the image direction whose ground movement is due north.
    const determinant = toEast[0] * toNorth[1] - toEast[1] * toNorth[0];
    const imageX = -toEast[1] / determinant;
    const imageY = toEast[0] / determinant;
    const degrees = (Math.atan2(imageX, -imageY) * 180) / Math.PI;
    expect(Math.abs(degrees - MAP_NORTH_DEG)).toBeLessThan(1);
  });
});

describe("map assets", () => {
  it.each(["LUJustMap.jpg", "markerTransparent.png"])(
    "ships %s where MapScene loads it from",
    (file) => {
      expect(fs.existsSync(path.join(MAP_ASSETS, file))).toBe(true);
    },
  );

  it("matches MAP_ASPECT_RATIO to the real map image", () => {
    // Building coordinates are fractions of this image, and MapScene sizes the
    // map box from MAP_ASPECT_RATIO. If the image is swapped for one of a
    // different shape, every marker drifts off its building.
    const { width, height } = jpegSize(path.join(MAP_ASSETS, "LUJustMap.jpg"));
    expect(width / height).toBeCloseTo(MAP_ASPECT_RATIO, 4);
  });
});

describe("fitToAspectRatio", () => {
  it("letterboxes at the bottom when the container is narrower than the image", () => {
    // A tall, narrow container (kiosk-shaped) against a near-square image.
    const box = fitToAspectRatio(360, 640, 4663 / 4800);
    expect(box.width).toBe(360);
    expect(box.height).toBeCloseTo(360 / (4663 / 4800));
    expect(box.height).toBeLessThan(640);
  });

  it("letterboxes on the sides when the container is wider than the image", () => {
    // A wide desktop-browser-shaped container against the same image.
    const box = fitToAspectRatio(1600, 900, 4663 / 4800);
    expect(box.height).toBe(900);
    expect(box.width).toBeCloseTo(900 * (4663 / 4800));
    expect(box.width).toBeLessThan(1600);
  });

  it("fills exactly when the container already matches the aspect ratio", () => {
    const box = fitToAspectRatio(466.3, 480, 4663 / 4800);
    expect(box.width).toBeCloseTo(466.3);
    expect(box.height).toBeCloseTo(480);
  });

  it("returns a zero box for a not-yet-measured (zero-size) container", () => {
    expect(fitToAspectRatio(0, 0, 4663 / 4800)).toEqual({ width: 0, height: 0 });
  });
});
