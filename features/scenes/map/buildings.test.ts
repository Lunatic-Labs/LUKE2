import { CAMPUS_BUILDINGS, findNearestBuilding } from "./buildings";

describe("findNearestBuilding", () => {
  const buildings = [
    { id: "a", name: "A", description: "", x: 0.2, y: 0.2 },
    { id: "b", name: "B", description: "", x: 0.8, y: 0.8 },
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

  it("honours a widened radius", () => {
    expect(findNearestBuilding(buildings, 0.5, 0.5, 0.5)).not.toBeNull();
  });

  it("returns null for an empty marker set", () => {
    expect(findNearestBuilding([], 0.5, 0.5)).toBeNull();
  });

  it("ships sample markers with unique ids", () => {
    const ids = CAMPUS_BUILDINGS.map((building) => building.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
