import { fireEvent, render, screen } from "@testing-library/react";
import { BuildingView } from "./BuildingView";
import { BUILDING_NAME, FLOORS } from "./building";

describe("BuildingView", () => {
  const onBack = jest.fn();
  const onActivity = jest.fn();

  afterEach(() => {
    onBack.mockClear();
    onActivity.mockClear();
  });

  it("lists the floors and prompts for a tap", () => {
    render(<BuildingView onBack={onBack} onActivity={onActivity} />);

    expect(screen.getByRole("heading", { name: BUILDING_NAME })).toBeInTheDocument();
    for (const floor of FLOORS) {
      expect(screen.getByRole("button", { name: floor.name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Tap a floor/)).toBeInTheDocument();
  });

  it("shows a floor's description and amenities when tapped, and clears on a second tap", () => {
    render(<BuildingView onBack={onBack} onActivity={onActivity} />);

    const floor2 = screen.getByRole("button", { name: "Floor 2" });
    fireEvent.click(floor2);
    expect(floor2).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(FLOORS[1].description)).toBeInTheDocument();
    expect(screen.getByText("Restrooms")).toBeInTheDocument();
    expect(screen.getByText("Water fountain")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(onActivity).toHaveBeenCalled();

    fireEvent.click(floor2);
    expect(floor2).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Tap a floor/)).toBeInTheDocument();
  });

  it("shows no amenity tags for a floor without any", () => {
    render(<BuildingView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Basement" }));
    expect(screen.getByText(FLOORS[3].description)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Amenities on this floor" })).not.toBeInTheDocument();
  });

  it("calls onBack when Back is tapped", () => {
    render(<BuildingView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});