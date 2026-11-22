import { fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { GalleryScene } from "./GalleryScene";

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
  goToScene: jest.fn(),
  goToMainMenu: jest.fn(),
};

const bounds = { width: 1920, height: 1080 };

function mockFetchResolving(images: string[]) {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ images }),
  }) as jest.Mock;
}

describe("GalleryScene", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading state before the gallery listing resolves", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<GalleryScene bounds={bounds} handle={handle} />);

    expect(screen.getByText(/Loading gallery/)).toBeInTheDocument();
  });

  it("renders a cell per photo once the listing loads", async () => {
    mockFetchResolving(["/gallery/a.jpg", "/gallery/b.jpg"]);

    render(<GalleryScene bounds={bounds} handle={handle} />);

    expect(await screen.findAllByRole("button")).toHaveLength(2);
  });

  it("paints a solid background over the shell's skyline", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    const { container } = render(<GalleryScene bounds={bounds} handle={handle} />);

    expect(container.querySelector("section")).toHaveClass("bg-[var(--luke-grey)]");
  });

  it("lays photos out as spaced, rounded, bordered cells three to a row", async () => {
    mockFetchResolving(["/gallery/a.jpg", "/gallery/b.jpg", "/gallery/c.jpg"]);

    render(<GalleryScene bounds={bounds} handle={handle} />);
    const cells = await screen.findAllByRole("button");

    expect(cells[0].parentElement).toHaveClass("gap-[var(--gap)]");
    for (const cell of cells) {
      expect(cell).toHaveClass(
        "w-[calc((100%-2*var(--gap))/3)]",
        "rounded-[clamp(0.5rem,2.5vw,1.5rem)]",
        "border-[var(--luke-purple)]",
      );
    }
  });

  async function openFirstPhoto() {
    mockFetchResolving(["/gallery/a.jpg"]);
    const utils = render(<GalleryScene bounds={bounds} handle={handle} />);
    fireEvent.click((await screen.findAllByRole("button"))[0]);
    return utils;
  }

  it("enlarges a photo on tap", async () => {
    const { container } = await openFirstPhoto();

    expect(handle.reportActivity).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Enlarged photo" })).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(2); // grid cell + enlarged view
  });

  it("exits the enlarged view when the X is clicked", async () => {
    const { container } = await openFirstPhoto();

    fireEvent.click(screen.getByRole("button", { name: "Close enlarged photo" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("exits the enlarged view when clicking outside the box", async () => {
    const { container } = await openFirstPhoto();

    fireEvent.click(screen.getByRole("dialog", { name: "Enlarged photo" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("stays open when the enlarged photo itself is clicked", async () => {
    await openFirstPhoto();

    fireEvent.click(screen.getByTestId("enlarged-photo"));

    expect(screen.getByRole("dialog", { name: "Enlarged photo" })).toBeInTheDocument();
  });

  it("stays open when the purple border around the photo is clicked", async () => {
    await openFirstPhoto();

    fireEvent.click(screen.getByTestId("enlarged-photo-box"));

    expect(screen.getByRole("dialog", { name: "Enlarged photo" })).toBeInTheDocument();
  });
});
