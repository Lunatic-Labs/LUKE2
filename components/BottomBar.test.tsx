import { fireEvent, render, screen } from "@testing-library/react";
import { BottomBar } from "./BottomBar";

describe("BottomBar", () => {
  function renderBar(overrides: Partial<React.ComponentProps<typeof BottomBar>> = {}) {
    const props = {
      sceneName: "You Are Here",
      onNext: jest.fn(),
      onPrevious: jest.fn(),
      height: 71,
      ...overrides,
    };
    render(<BottomBar {...props} />);
    return props;
  }

  it("shows the active scene name", () => {
    renderBar();
    expect(screen.getByText("You Are Here")).toBeInTheDocument();
  });

  it("maps the left arrow to previous and the right arrow to next", () => {
    // BottomBar.pde put previous on the left fifth and next on the right fifth.
    const props = renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Previous scene" }));
    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Next scene" }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it("applies the derived bar height", () => {
    renderBar({ height: 120 });
    expect(screen.getByRole("navigation")).toHaveStyle({ height: "120px" });
  });
});
