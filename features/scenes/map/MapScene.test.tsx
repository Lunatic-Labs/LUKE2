import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { CAMPUS_BUILDINGS, MAP_ASPECT_RATIO } from "./buildings";
import { MapScene } from "./MapScene";

// jsdom has no layout engine, so every element measures 0x0 and MapScene would
// never draw the map (it waits for a non-zero box). Give every element a box
// already shaped like the map image, so fitToAspectRatio returns it unchanged
// and a click at (x * MAP_WIDTH, y * MAP_HEIGHT) lands on map fraction (x, y).
const MAP_HEIGHT = 480;
const MAP_WIDTH = MAP_HEIGHT * MAP_ASPECT_RATIO;

function building(id: string) {
  const match = CAMPUS_BUILDINGS.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`No building with id "${id}"`);
  return match;
}

describe("MapScene", () => {
  beforeEach(() => {
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ left: 0, top: 0, width: MAP_WIDTH, height: MAP_HEIGHT } as DOMRect);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderScene() {
    const handle: SceneHandle = {
      reportActivity: jest.fn(),
      nextScene: jest.fn(),
      previousScene: jest.fn(),
      exitCarousel: jest.fn(),
      goToScene: jest.fn(),
    };
    render(<MapScene bounds={{ width: MAP_WIDTH, height: MAP_HEIGHT }} handle={handle} />);
    return handle;
  }

  function tapMap(x: number, y: number) {
    fireEvent.click(screen.getByAltText("Lipscomb University campus map"), {
      clientX: x * MAP_WIDTH,
      clientY: y * MAP_HEIGHT,
    });
  }

  /** The "Currently displaying:" banner, or null when nothing is selected. */
  function selectionBanner() {
    return screen.queryByText(/Currently displaying:/);
  }

  it("shows the map and the kiosk's own marker", () => {
    renderScene();

    expect(screen.getByAltText("Lipscomb University campus map")).toBeInTheDocument();
    expect(screen.getByAltText("You are here")).toBeInTheDocument();
    expect(selectionBanner()).not.toBeInTheDocument();
  });

  it("selects the building under a tap", () => {
    renderScene();
    const arena = building("allen-arena");

    tapMap(arena.x, arena.y);

    expect(selectionBanner()).toHaveTextContent(arena.name);
  });

  it("clears the selection when a tap lands on empty map", () => {
    renderScene();
    const arena = building("allen-arena");
    tapMap(arena.x, arena.y);

    // The far bottom-right corner is nowhere near any marker.
    tapMap(0.99, 0.99);

    expect(selectionBanner()).not.toBeInTheDocument();
  });

  it("lists every building on the Key screen", () => {
    renderScene();

    fireEvent.click(screen.getByRole("button", { name: "Key" }));

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("button")).toHaveLength(CAMPUS_BUILDINGS.length);
    expect(screen.queryByAltText("Lipscomb University campus map")).not.toBeInTheDocument();
  });

  it("returns to the map with the building selected when one is picked from the Key", () => {
    renderScene();
    const library = building("beaman-library");

    fireEvent.click(screen.getByRole("button", { name: "Key" }));
    fireEvent.click(screen.getByRole("button", { name: library.name }));

    expect(screen.getByAltText("Lipscomb University campus map")).toBeInTheDocument();
    expect(selectionBanner()).toHaveTextContent(library.name);
  });

  it("toggles back to the map without changing the selection", () => {
    renderScene();
    const arena = building("allen-arena");
    tapMap(arena.x, arena.y);

    fireEvent.click(screen.getByRole("button", { name: "Key" }));
    fireEvent.click(screen.getByRole("button", { name: "Map" }));

    expect(selectionBanner()).toHaveTextContent(arena.name);
  });

  it("reports activity on every interaction so the idle timer does not advance mid-use", () => {
    const handle = renderScene();
    const arena = building("allen-arena");

    tapMap(arena.x, arena.y);
    expect(handle.reportActivity).toHaveBeenCalledTimes(1);

    tapMap(0.99, 0.99);
    expect(handle.reportActivity).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Key" }));
    expect(handle.reportActivity).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: arena.name }));
    expect(handle.reportActivity).toHaveBeenCalledTimes(4);

    expect(handle.nextScene).not.toHaveBeenCalled();
    expect(handle.exitCarousel).not.toHaveBeenCalled();
  });
});
