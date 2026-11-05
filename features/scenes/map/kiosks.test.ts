import { DEFAULT_OPTIONS } from "@/features/kiosk/options";
import { CAMPUS_BUILDINGS, CAMPUS_PLACES, findNearestBuilding } from "./buildings";
import { DEFAULT_KIOSK_ID, kioskLocation, KIOSKS, resolveKiosk } from "./kiosks";

describe("resolveKiosk", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the named kiosk without warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveKiosk("fields")).toBe(KIOSKS.fields);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["nowhere", "constructor", ""])("falls back to the default with a warning for %j", (id) => {
    // "constructor" exists on every object, so a plain KIOSKS[id] would find it.
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveKiosk(id)).toBe(KIOSKS[DEFAULT_KIOSK_ID]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`"${id}"`));
  });
});

describe("kioskLocation", () => {
  it("is the kiosk's place's own marker rather than a separate copy", () => {
    // Re-measuring the building must move the "You are here" pin with it.
    const fields = CAMPUS_BUILDINGS.find(
      (building) => building.id === "fields-engineering-center",
    );
    expect(kioskLocation("fields")).toBe(fields);
  });

  it("selects the kiosk's place when its own pin is tapped", () => {
    const { x, y } = kioskLocation("fields");
    expect(findNearestBuilding(CAMPUS_BUILDINGS, x, y)?.id).toBe("fields-engineering-center");
  });
});

describe("KIOSKS", () => {
  it("includes the default kiosk", () => {
    expect(KIOSKS[DEFAULT_KIOSK_ID]).toBeDefined();
  });

  it("uses the same default as the kiosk options", () => {
    // options.ts stays free of scene imports, so the default is written in both
    // places; this keeps them from drifting apart.
    expect(DEFAULT_OPTIONS.kioskId).toBe(DEFAULT_KIOSK_ID);
  });

  it("installs the Fields kiosk at Fields Engineering Center, leaving by the front entrance", () => {
    expect(KIOSKS.fields.placeId).toBe("fields-engineering-center");
    expect(KIOSKS.fields.exitEntranceId).toBe("front");
  });

  it.each(Object.entries(KIOSKS))("places %s in a real place", (_id, kiosk) => {
    expect(CAMPUS_PLACES.map((place) => place.id)).toContain(kiosk.placeId);
  });

  it.each(Object.entries(KIOSKS))("exits %s through one of its place's entrances", (_id, kiosk) => {
    // Places gain entrances gradually, so this only applies once the kiosk's
    // place has some.
    const entrances = CAMPUS_PLACES.find((place) => place.id === kiosk.placeId)?.entrances;
    if (entrances) {
      expect(entrances.map((entrance) => entrance.id)).toContain(kiosk.exitEntranceId);
    }
  });

  it("records which way the Fields exit faces", () => {
    expect(KIOSKS.fields.exitHeadingDeg).toBe(186);
  });

  it.each(Object.entries(KIOSKS))("gives %s a compass heading, once measured", (_id, kiosk) => {
    if (kiosk.headingDeg !== null) {
      expect(kiosk.headingDeg).toBeGreaterThanOrEqual(0);
      expect(kiosk.headingDeg).toBeLessThan(360);
    }
    if (kiosk.exitHeadingDeg !== null) {
      expect(kiosk.exitHeadingDeg).toBeGreaterThanOrEqual(0);
      expect(kiosk.exitHeadingDeg).toBeLessThan(360);
    }
  });
});
