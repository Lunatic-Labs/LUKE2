import { fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { GalleryScene } from "./GalleryScene";

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
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

  it("enlarges a photo on tap and dismisses it on a second tap", async () => {
    mockFetchResolving(["/gallery/a.jpg"]);

    const { container } = render(<GalleryScene bounds={bounds} handle={handle} />);
    const cell = (await screen.findAllByRole("button"))[0];

    fireEvent.click(cell);
    expect(handle.reportActivity).toHaveBeenCalled();
    expect(container.querySelectorAll("img")).toHaveLength(2); // grid cell + enlarged view

    fireEvent.click(screen.getByRole("button", { name: "Close enlarged photo" }));
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
