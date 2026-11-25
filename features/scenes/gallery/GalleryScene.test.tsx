import { act, fireEvent, render, screen } from "@testing-library/react";
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
const originalFetch = global.fetch;

function mockFetchResolving(images: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve({ images }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderGallery() {
  return render(<GalleryScene bounds={bounds} handle={handle} />);
}

/** Grid cells only; the enlarged view's X is a button too. */
function findCells() {
  return screen.findAllByRole("button", { name: /^Enlarge gallery photo/ });
}

/**
 * The image path a cell or the enlarged view asks for. `next/image` rewrites
 * `src` to an optimizer URL (`/_next/image?url=<path>&w=…`), so read `url` back.
 */
function requestedPath(img: HTMLImageElement): string {
  const src = img.getAttribute("src") ?? "";
  return new URL(src, "http://localhost").searchParams.get("url") ?? src;
}

function cellPaths(cells: HTMLElement[]) {
  return cells.map((cell) => requestedPath(cell.querySelector("img")!));
}

function enlargedImg() {
  return screen.getByTestId("enlarged-photo").querySelector("img")!;
}

async function openFirstPhoto(images = ["/gallery/a.jpg"]) {
  mockFetchResolving(images);
  const utils = renderGallery();
  fireEvent.click((await findCells())[0]);
  return utils;
}

describe("GalleryScene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  describe("loading the listing", () => {
    it("asks /api/gallery for the listing once per visit", async () => {
      const fetchMock = mockFetchResolving(["/gallery/a.jpg"]);

      const { rerender } = renderGallery();
      await findCells();
      rerender(<GalleryScene bounds={bounds} handle={handle} />);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/gallery");
    });

    it("shows a loading state until the listing resolves", () => {
      global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

      renderGallery();

      expect(screen.getByText(/Loading gallery/)).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders a cell per photo once the listing loads", async () => {
      mockFetchResolving(["/gallery/a.jpg", "/gallery/b.jpg"]);

      renderGallery();

      expect(await findCells()).toHaveLength(2);
      expect(screen.queryByText(/Loading gallery/)).not.toBeInTheDocument();
    });

    it("says there are no photos when the listing is empty", async () => {
      mockFetchResolving([]);

      renderGallery();

      expect(await screen.findByText("No photos yet.")).toBeInTheDocument();
    });

    it("shows an error, not 'no photos', when the listing can't be fetched", async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as jest.Mock;

      renderGallery();

      expect(await screen.findByText(/couldn.t be loaded/)).toBeInTheDocument();
      expect(screen.queryByText("No photos yet.")).not.toBeInTheDocument();
    });

    it("shows an error when the listing route answers with an error status", async () => {
      mockFetchResolving(["/gallery/a.jpg"], { ok: false, status: 500 });

      renderGallery();

      expect(await screen.findByText(/couldn.t be loaded/)).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows an error when the listing body is malformed", async () => {
      mockFetchResolving("not-a-list");

      renderGallery();

      expect(await screen.findByText(/couldn.t be loaded/)).toBeInTheDocument();
    });

    it("shows a duplicated URL only once", async () => {
      mockFetchResolving(["/gallery/a.jpg", "/gallery/a.jpg", "/gallery/b.jpg"]);

      renderGallery();

      expect(await findCells()).toHaveLength(2);
    });
  });

  describe("ordering", () => {
    const listing = ["/gallery/a.jpg", "/gallery/b.jpg", "/gallery/c.jpg", "/api/photos/screen-x.jpg"];

    it("shuffles the listing, showing every photo exactly once", async () => {
      // Math.random() of 0 swaps every element with the first: a real reorder.
      jest.spyOn(Math, "random").mockReturnValue(0);
      mockFetchResolving(listing);

      renderGallery();
      const order = cellPaths(await findCells());

      expect(order).not.toEqual(listing);
      expect([...order].sort()).toEqual([...listing].sort());
    });

    it("numbers cells by their on-screen position, not their listing position", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0);
      mockFetchResolving(listing);

      renderGallery();
      const cells = await findCells();

      cells.forEach((cell, index) => {
        expect(cell).toHaveAccessibleName(`Enlarge gallery photo ${index + 1}`);
      });
    });
  });

  describe("image sources and sizing", () => {
    it("passes photo URLs through unchanged, including encoded names and camera photos", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.999); // keeps the listing order
      const listing = ["/gallery/my%20photo.jpg", "/api/photos/screen-2026-01-01T00-00-00-000Z.jpg"];
      mockFetchResolving(listing);

      renderGallery();

      expect(cellPaths(await findCells())).toEqual(listing);
    });

    it("requests grid images sized for a third (portrait) or fifth (landscape) of the screen", async () => {
      mockFetchResolving(["/gallery/a.jpg"]);

      renderGallery();
      const img = (await findCells())[0].querySelector("img")!;

      expect(img).toHaveAttribute("sizes", "(orientation: landscape) 20vw, 33vw");
      // A srcset lets the browser pick a small file for a small cell instead
      // of downloading the full-resolution original for every thumbnail.
      expect(img.getAttribute("srcset")).toMatch(/\d+w/);
    });

    it("loads the enlarged view from the tapped photo's own URL, at a larger size", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.999);
      await openFirstPhoto(["/gallery/a.jpg", "/gallery/b.jpg"]);

      expect(requestedPath(enlargedImg())).toBe("/gallery/a.jpg");
      expect(enlargedImg()).toHaveAttribute("sizes", "85vw");
    });
  });

  describe("photos that fail to load", () => {
    it("drops a corrupt or missing photo from the grid", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.999);
      mockFetchResolving(["/gallery/a.jpg", "/gallery/corrupt.jpg"]);

      renderGallery();
      const cells = await findCells();
      fireEvent.error(cells[1].querySelector("img")!);

      expect(cellPaths(await findCells())).toEqual(["/gallery/a.jpg"]);
    });

    it("says there are no photos when every photo fails to load", async () => {
      mockFetchResolving(["/gallery/a.jpg"]);

      renderGallery();
      fireEvent.error((await findCells())[0].querySelector("img")!);

      expect(screen.getByText("No photos yet.")).toBeInTheDocument();
    });

    it("closes the enlarged view if its photo was deleted after the grid loaded", async () => {
      await openFirstPhoto(["/gallery/a.jpg", "/gallery/b.jpg"]);

      fireEvent.error(enlargedImg());

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(await findCells()).toHaveLength(1);
    });
  });

  describe("layout", () => {
    // jsdom does no layout, so these pin the classes that produce it; the
    // look itself is checked in the browser.
    it("paints a solid background over the shell's skyline", () => {
      global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

      const { container } = renderGallery();

      expect(container.querySelector("section")).toHaveClass("bg-[var(--luke-grey)]");
    });

    it("lays photos out as spaced, rounded, bordered cells three to a row", async () => {
      mockFetchResolving(["/gallery/a.jpg", "/gallery/b.jpg", "/gallery/c.jpg"]);

      renderGallery();
      const cells = await findCells();

      expect(cells[0].parentElement).toHaveClass("gap-[var(--gap)]");
      for (const cell of cells) {
        expect(cell).toHaveClass(
          "aspect-square",
          "w-[calc((100%-2*var(--gap))/3)]",
          "rounded-[clamp(0.5rem,2.5vw,1.5rem)]",
          "border-[var(--luke-purple)]",
        );
      }
    });

    it("keeps the enlarged box at fixed 5:6 proportions", async () => {
      await openFirstPhoto();

      expect(screen.getByTestId("enlarged-photo-box")).toHaveClass("aspect-[5/6]");
    });
  });

  describe("enlarged view", () => {
    it("enlarges a photo on tap and reports activity", async () => {
      const { container } = await openFirstPhoto();

      expect(handle.reportActivity).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "Enlarged photo" })).toBeInTheDocument();
      expect(container.querySelectorAll("img")).toHaveLength(2); // grid cell + enlarged view
    });

    it("exits the enlarged view when the X is clicked", async () => {
      const { container } = await openFirstPhoto();

      fireEvent.click(screen.getByRole("button", { name: "Close enlarged photo" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(container.querySelectorAll("img")).toHaveLength(1);
      expect(handle.reportActivity).toHaveBeenCalledTimes(2); // open + close
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

    it("can open a different photo after closing the first", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.999);
      await openFirstPhoto(["/gallery/a.jpg", "/gallery/b.jpg"]);

      fireEvent.click(screen.getByRole("button", { name: "Close enlarged photo" }));
      fireEvent.click((await findCells())[1]);

      expect(requestedPath(enlargedImg())).toBe("/gallery/b.jpg");
    });
  });

  describe("leaving and returning (scene changes)", () => {
    // React 19 silently drops updates to an unmounted component, so this can't
    // tell whether the effect's `cancelled` guard ran; it checks that a late
    // listing neither throws nor logs.
    it("doesn't crash or log when the listing arrives after the visitor has left", async () => {
      let resolveFetch!: (value: unknown) => void;
      global.fetch = jest.fn(
        () => new Promise((resolve) => (resolveFetch = resolve)),
      ) as unknown as typeof fetch;
      const consoleError = jest.spyOn(console, "error");

      const { unmount } = renderGallery();
      unmount();
      await act(async () => {
        resolveFetch({ ok: true, status: 200, json: () => Promise.resolve({ images: ["/gallery/a.jpg"] }) });
      });

      expect(consoleError).not.toHaveBeenCalled();
    });

    it("removes the enlarged view along with the scene", async () => {
      const { unmount } = await openFirstPhoto();

      unmount();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("picks up photos added since the last visit when the scene is revisited", async () => {
      mockFetchResolving(["/gallery/a.jpg"]);
      const first = renderGallery();
      expect(await findCells()).toHaveLength(1);
      first.unmount();

      mockFetchResolving(["/gallery/a.jpg", "/api/photos/screen-new.jpg"]);
      renderGallery();

      expect(await findCells()).toHaveLength(2);
    });

    it("drops photos deleted since the last visit when the scene is revisited", async () => {
      mockFetchResolving(["/gallery/a.jpg", "/gallery/b.jpg"]);
      const first = renderGallery();
      expect(await findCells()).toHaveLength(2);
      first.unmount();

      mockFetchResolving(["/gallery/a.jpg"]);
      renderGallery();

      expect(cellPaths(await findCells())).toEqual(["/gallery/a.jpg"]);
    });
  });
});
