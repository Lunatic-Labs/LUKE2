import { fireEvent, render, screen } from "@testing-library/react";
import { CreditsView } from "./CreditsView";
import { CREDITS_PAGES } from "./credits";

describe("CreditsView", () => {
  const onBack = jest.fn();
  const onActivity = jest.fn();

  afterEach(() => {
    onBack.mockClear();
    onActivity.mockClear();
  });

  it("opens on the About page", () => {
    render(<CreditsView onBack={onBack} onActivity={onActivity} />);

    expect(screen.getByRole("heading", { name: "About L.U.K.E." })).toBeInTheDocument();
    expect(screen.getByText(`1 / ${CREDITS_PAGES.length}`)).toBeInTheDocument();
  });

  it("flips through the pages with Prev and Next, wrapping at the ends", () => {
    render(<CreditsView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: CREDITS_PAGES[1].title })).toBeInTheDocument();
    expect(screen.getAllByText("Justin T. Alexander").length).toBeGreaterThan(0);
    expect(onActivity).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    const last = CREDITS_PAGES[CREDITS_PAGES.length - 1];
    expect(screen.getByRole("heading", { name: last.title })).toBeInTheDocument();
  });

  it("calls onBack when Back is tapped", () => {
    render(<CreditsView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});