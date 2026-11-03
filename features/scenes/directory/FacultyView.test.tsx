import { fireEvent, render, screen } from "@testing-library/react";
import { FacultyView } from "./FacultyView";

// These two tests moved here from DirectoryScene.test.tsx along with the staff code.
describe("FacultyView", () => {
  const onBack = jest.fn();
  const onActivity = jest.fn();

  afterEach(() => {
    onBack.mockClear();
    onActivity.mockClear();
  });

  it("renders the faculty and staff directory and filters by category", () => {
    render(<FacultyView onBack={onBack} onActivity={onActivity} />);

    expect(screen.getByText("Our Faculty and Staff")).toBeInTheDocument();
    expect(screen.getByText("David Elrod II")).toBeInTheDocument();

    const categoryFilter = screen.getByRole("button", { name: /Filter by category/i });
    fireEvent.click(categoryFilter);
    expect(categoryFilter).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "School of Computing" }));
    expect(categoryFilter).toHaveAttribute("aria-expanded", "false");

    expect(screen.getByText("Amy Algood")).toBeInTheDocument();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Bryan Crawley")).toBeInTheDocument();
    expect(screen.getByText("2 / 7")).toBeInTheDocument();
  });

  it("shows Jacob Dyer under both engineering categories", () => {
    render(<FacultyView onBack={onBack} onActivity={onActivity} />);

    const categoryFilter = screen.getByRole("button", { name: /Filter by category/i });
    fireEvent.click(categoryFilter);
    expect(screen.queryByRole("button", { name: "Electrical & Computer Engineering" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Electrical Engineering" }));
    expect(screen.getByText("Jacob Dyer")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(categoryFilter);
    fireEvent.click(screen.getByRole("button", { name: "Computer Engineering" }));
    expect(screen.getByText("Jacob Dyer")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("calls onBack when Back is tapped", () => {
    render(<FacultyView onBack={onBack} onActivity={onActivity} />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});