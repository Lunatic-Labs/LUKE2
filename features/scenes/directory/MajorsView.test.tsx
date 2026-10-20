import { fireEvent, render, screen } from "@testing-library/react";
import { MajorsView } from "./MajorsView";
import { MAJORS } from "./majors";

describe("MajorsView", () => {
  const onBack = jest.fn();
  const onActivity = jest.fn();

  afterEach(() => {
    onBack.mockClear();
    onActivity.mockClear();
  });

  it("flips through majors with Prev and Next, wrapping at the ends", () => {
    render(<MajorsView onBack={onBack} onActivity={onActivity} />);

    expect(screen.getByRole("heading", { name: MAJORS[0].name })).toBeInTheDocument();
    expect(screen.getByText(MAJORS[0].description)).toBeInTheDocument();
    expect(screen.getByText(`1 / ${MAJORS.length}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: MAJORS[1].name })).toBeInTheDocument();
    expect(onActivity).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(screen.getByRole("heading", { name: MAJORS[MAJORS.length - 1].name })).toBeInTheDocument();
  });

  it("calls onBack when Back is tapped", () => {
    render(<MajorsView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});