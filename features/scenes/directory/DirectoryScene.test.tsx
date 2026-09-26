import { fireEvent, render, screen } from "@testing-library/react";
import { DirectoryScene } from "./DirectoryScene";

describe("DirectoryScene", () => {
  const handle = {
    reportActivity: jest.fn(),
    nextScene: jest.fn(),
    previousScene: jest.fn(),
    exitCarousel: jest.fn(),
  };

  it("renders the faculty and staff directory and filters by category", () => {
    render(<DirectoryScene bounds={{ width: 1200, height: 800 }} handle={handle} />);

    expect(screen.getByText("Our Faculty and Staff")).toBeInTheDocument();
    expect(screen.getByText("Amy Algood")).toBeInTheDocument();

    const categoryFilter = screen.getByRole("button", { name: /Filter by category/i });
    fireEvent.click(categoryFilter);
    expect(categoryFilter).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Computing", exact: true }));
    expect(categoryFilter).toHaveAttribute("aria-expanded", "false");

    expect(screen.getByText("Amy Algood")).toBeInTheDocument();
    expect(screen.getByText("1 / 6")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Bryan Crawley")).toBeInTheDocument();
    expect(screen.getByText("2 / 6")).toBeInTheDocument();
  });

  it("shows Jacob Dyer under both engineering categories", () => {
    render(<DirectoryScene bounds={{ width: 1200, height: 800 }} handle={handle} />);

    const categoryFilter = screen.getByRole("button", { name: /Filter by category/i });
    expect(screen.queryByRole("button", { name: "Electrical & Computer Engineering" })).not.toBeInTheDocument();

    fireEvent.click(categoryFilter);
    fireEvent.click(screen.getByRole("button", { name: "Electrical Engineering", exact: true }));
    expect(screen.getByText("Jacob Dyer")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    fireEvent.click(categoryFilter);
    fireEvent.click(screen.getByRole("button", { name: "Computer Engineering", exact: true }));
    expect(screen.getByText("Jacob Dyer")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });
});
