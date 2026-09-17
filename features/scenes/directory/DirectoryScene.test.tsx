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

    fireEvent.change(screen.getByLabelText(/Filter by category/i), {
      target: { value: "Computing" },
    });

    expect(screen.getByText("Amy Algood")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Bryan Crawley")).toBeInTheDocument();
  });
});
