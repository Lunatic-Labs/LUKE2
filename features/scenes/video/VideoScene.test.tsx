import { fireEvent, render, screen } from "@testing-library/react";
import { SWIPE_MIN_PX, VideoScene } from "./VideoScene";
import { titleFromFile, toKioskVideo } from "./videos";

const FILES = ["0_FieldsWalkthrough_Floor2.mp4", "HIGHLIGHT_VIDEO.mp4", "Z_FieldsWalkthrough_Floor1.mp4"];
const TITLES = FILES.map((file) => toKioskVideo(file).title);

// jsdom has no PointerEvent, so fireEvent.pointerDown would drop clientX/clientY.
// A MouseEvent carries them, which is all the swipe handling reads.
beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    window.PointerEvent = class PointerEvent extends MouseEvent {} as typeof window.PointerEvent;
  }
});

describe("VideoScene", () => {
  const handle = {
    reportActivity: jest.fn(),
    nextScene: jest.fn(),
    previousScene: jest.fn(),
    exitCarousel: jest.fn(),
    goToScene: jest.fn(),
    goToMainMenu: jest.fn(),
  };
  const originalFetch = global.fetch;

  // Stands in for /api/videos so the tests don't need real video files.
  function servePlaylist(files: string[]) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files }),
    }) as unknown as typeof fetch;
  }

  async function renderScene(files = FILES) {
    servePlaylist(files);
    render(<VideoScene bounds={{ width: 1200, height: 800 }} handle={handle} />);
    await screen.findByRole("heading", { name: TITLES[0] });
  }

  /** Drags across the videos from one x position to another, then lets go. */
  function swipe(fromX: number, toX: number, y = 300) {
    const area = screen.getByTestId("video-swipe-area");
    fireEvent.pointerDown(area, { clientX: fromX, clientY: y });
    fireEvent.pointerUp(area, { clientX: toX, clientY: y });
  }

  afterEach(() => {
    global.fetch = originalFetch;
    handle.reportActivity.mockClear();
  });

  it("titles the current video and shows the neighbours on either side", async () => {
    await renderScene();

    expect(screen.getByRole("heading", { name: "Fields Walkthrough: Floor 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Previous video: ${TITLES[2]}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Next video: ${TITLES[1]}` })).toBeInTheDocument();
  });

  it("shows which video this is out of how many", async () => {
    await renderScene();

    expect(screen.getByText("1 / 3")).toBeVisible();
  });

  it("names the next and previous videos below the title, following the current one", async () => {
    await renderScene();

    expect(screen.getByText(`next: ${TITLES[1]}`)).toBeInTheDocument();
    expect(screen.getByText(`previous: ${TITLES[2]}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Next video/ }));
    expect(screen.getByText(`next: ${TITLES[2]}`)).toBeInTheDocument();
    expect(screen.getByText(`previous: ${TITLES[0]}`)).toBeInTheDocument();
  });

  it("switches videos with the next and previous arrows, wrapping at the ends", async () => {
    await renderScene();

    fireEvent.click(screen.getByRole("button", { name: /^Next video/ }));
    expect(screen.getByRole("heading", { name: TITLES[1] })).toBeInTheDocument();
    expect(handle.reportActivity).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Previous video/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Previous video/ }));
    expect(screen.getByRole("heading", { name: TITLES[2] })).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("jumps to the next video on a left swipe and the previous one on a right swipe", async () => {
    await renderScene();

    swipe(300, 300 - SWIPE_MIN_PX - 10);
    expect(screen.getByRole("heading", { name: TITLES[1] })).toBeInTheDocument();
    expect(handle.reportActivity).toHaveBeenCalled();

    swipe(100, 100 + SWIPE_MIN_PX + 10);
    swipe(100, 100 + SWIPE_MIN_PX + 10);
    expect(screen.getByRole("heading", { name: TITLES[2] })).toBeInTheDocument();
  });

  it("ignores short drags and mostly vertical ones", async () => {
    await renderScene();

    swipe(300, 300 - SWIPE_MIN_PX / 2);
    const area = screen.getByTestId("video-swipe-area");
    fireEvent.pointerDown(area, { clientX: 300, clientY: 100 });
    fireEvent.pointerUp(area, { clientX: 250, clientY: 300 });

    expect(screen.getByRole("heading", { name: TITLES[0] })).toBeInTheDocument();
  });

  it("doesn't also switch again when a swipe ends on an arrow", async () => {
    await renderScene();

    const nextArrow = screen.getByRole("button", { name: /^Next video/ });
    fireEvent.pointerDown(nextArrow, { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(nextArrow, { clientX: 200, clientY: 300 });
    fireEvent.click(nextArrow);

    expect(screen.getByRole("heading", { name: TITLES[1] })).toBeInTheDocument();
  });

  it("says so when the video folder is empty", async () => {
    servePlaylist([]);
    render(<VideoScene bounds={{ width: 1200, height: 800 }} handle={handle} />);

    expect(await screen.findByText(/No videos found/)).toBeInTheDocument();
  });

  it("makes readable titles for videos without one", () => {
    expect(titleFromFile("5_NewBuilding_Tour2026.mp4")).toBe("New Building Tour 2026");
  });
});
