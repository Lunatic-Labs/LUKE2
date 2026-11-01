import { CAMPUS_PLACES } from "./buildings";
import { DEFAULT_KIOSK_ID, KIOSKS } from "./kiosks";

describe("KIOSKS", () => {
  it("includes the default kiosk", () => {
    expect(KIOSKS[DEFAULT_KIOSK_ID]).toBeDefined();
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

  it.each(Object.entries(KIOSKS))("gives %s a compass heading, once measured", (_id, kiosk) => {
    if (kiosk.headingDeg !== null) {
      expect(kiosk.headingDeg).toBeGreaterThanOrEqual(0);
      expect(kiosk.headingDeg).toBeLessThan(360);
    }
  });
});
