import { fireEvent, render, screen } from "@testing-library/react";
import { VideoScene } from "./VideoScene";
import { titleFromFile, toKioskVideo } from "./videos";

const FILES = ["0_FieldsWalkthrough_Floor2.mp4", "HIGHLIGHT_VIDEO.mp4", "Z_FieldsWalkthrough_Floor1.mp4"];
const TITLES = FILES.map((file) => toKioskVideo(file).title);

describe("VideoScene", () => {
  const handle = {
    reportActivity: jest.fn(),
    nextScene: jest.fn(),
    previousScene: jest.fn(),
    exitCarousel: jest.fn(),
  };
  const originalFetch = global.fetch;

  // Stands in for /api/videos so the tests don't need real video files.
  function servePlaylist(files: string[]) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files }),
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    global.fetch = originalFetch;
    handle.reportActivity.mockClear();
  });

  it("switches videos with the next and previous thumbnails, wrapping at the ends", async () => {
    servePlaylist(FILES);
    render(<VideoScene bounds={{ width: 1200, height: 800 }} handle={handle} />);

    expect(await screen.findByRole("heading", { name: TITLES[0] })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Next video/ }));
    expect(screen.getByRole("heading", { name: TITLES[1] })).toBeInTheDocument();
    expect(handle.reportActivity).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Previous video/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Previous video/ }));
    expect(screen.getByRole("heading", { name: TITLES[2] })).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
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