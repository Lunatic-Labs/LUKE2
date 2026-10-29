import { fireEvent, render, screen } from "@testing-library/react";
import { DirectoryScene } from "./DirectoryScene";

// The staff-page tests live in FacultyView.test.tsx; these cover the home menu.
describe("DirectoryScene", () => {
  const handle = {
    reportActivity: jest.fn(),
    nextScene: jest.fn(),
    previousScene: jest.fn(),
    exitCarousel: jest.fn(),
    goToScene: jest.fn(),
  };

  function renderDirectory() {
    render(<DirectoryScene bounds={{ width: 1200, height: 800 }} handle={handle} />);
  }

  function expectHome() {
    expect(screen.getByRole("heading", { name: "Welcome to the L.U.K.E. Directory!" })).toBeInTheDocument();
  }

  afterEach(() => handle.reportActivity.mockClear());

  it("opens on a menu of the four sections", () => {
    renderDirectory();

    expectHome();
    expect(screen.getByRole("button", { name: /^Our Majors/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Our Faculty and Staff/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Our Building/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Credits/ })).toBeInTheDocument();
  });

  it("opens the faculty and staff and returns to the menu", () => {
    renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: /^Our Faculty and Staff/ }));
    expect(screen.getByText("David Elrod II")).toBeInTheDocument();
    expect(handle.reportActivity).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectHome();
  });

  it("opens the majors and returns to the menu", () => {
    renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: /^Our Majors/ }));
    expect(screen.getByRole("heading", { name: "Civil Engineering" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectHome();
  });

  it("opens the building and returns to the menu", () => {
    renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: /^Our Building/ }));
    expect(screen.getByRole("heading", { name: "Fields Engineering Center" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectHome();
  });

  it("opens the credits and returns to the menu", () => {
    renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: /^Credits/ }));
    expect(screen.getByText("About L.U.K.E.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectHome();
  });
});