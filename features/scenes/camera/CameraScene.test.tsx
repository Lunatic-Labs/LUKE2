import { act, fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { captureFrame, uploadPhoto } from "./capture";
import { CameraScene, COOLDOWN_MS, COUNTDOWN_STEP_MS, THANK_YOU_TEXT } from "./CameraScene";

jest.mock("./capture", () => ({
  captureFrame: jest.fn(),
  uploadPhoto: jest.fn(),
}));

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
};

function mockCamera(getUserMedia: jest.Mock | undefined) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: getUserMedia ? { getUserMedia } : undefined,
  });
}

function fakeStream() {
  const track = { stop: jest.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

async function renderScene() {
  const result = render(<CameraScene bounds={{ width: 360, height: 640 }} handle={handle} />);
  // Let the getUserMedia promise settle.
  await act(async () => {});
  return result;
}

/** Advance one timer at a time, since each countdown step is scheduled by the render before it. */
async function advance(ms: number, times = 1) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  }
}

describe("CameraScene", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    (captureFrame as jest.Mock).mockResolvedValue(new Blob(["jpeg"]));
    (uploadPhoto as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("prompts for a picture once the camera is open", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    expect(screen.getByText("Touch to take a picture!")).toBeInTheDocument();
  });

  it("counts down, saves the photo, thanks the visitor, then resets", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    fireEvent.click(screen.getByRole("button", { name: "Take a picture" }));
    expect(handle.reportActivity).toHaveBeenCalled();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("Set")).not.toBeInTheDocument();

    await advance(COUNTDOWN_STEP_MS);
    expect(screen.getByText("Set")).toBeInTheDocument();
    await advance(COUNTDOWN_STEP_MS);
    expect(screen.getByText("Pose!")).toBeInTheDocument();
    expect(captureFrame).not.toHaveBeenCalled();

    await advance(COUNTDOWN_STEP_MS);
    expect(captureFrame).toHaveBeenCalledTimes(1);
    expect(uploadPhoto).toHaveBeenCalledTimes(1);
    expect(THANK_YOU_TEXT).toContain(screen.getByRole("status").textContent);

    await advance(COOLDOWN_MS);
    expect(screen.getByText("Touch to take a picture!")).toBeInTheDocument();
  });

  it("ignores taps while a picture is in progress", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    const target = screen.getByRole("button", { name: "Take a picture" });
    fireEvent.click(target);
    await advance(COUNTDOWN_STEP_MS);
    fireEvent.click(target);

    expect(screen.getByText("Set")).toBeInTheDocument();
    await advance(COUNTDOWN_STEP_MS, 2);
    expect(captureFrame).toHaveBeenCalledTimes(1);
  });

  it("tells the visitor when a photo fails to save", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    (uploadPhoto as jest.Mock).mockRejectedValue(new Error("disk full"));
    await renderScene();

    fireEvent.click(screen.getByRole("button", { name: "Take a picture" }));
    await advance(COUNTDOWN_STEP_MS, 3);

    expect(screen.getByRole("status")).toHaveTextContent("didn't save");
  });

  it("explains when camera access is denied", async () => {
    mockCamera(jest.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")));
    await renderScene();

    expect(screen.getByText("Camera unavailable")).toBeInTheDocument();
    expect(screen.getByText(/blocked/)).toBeInTheDocument();
  });

  it("explains when the browser has no camera API", async () => {
    mockCamera(undefined);
    await renderScene();

    expect(screen.getByText("Camera unavailable")).toBeInTheDocument();
  });

  it("stops the camera when the scene leaves the screen", async () => {
    const { stream, track } = fakeStream();
    mockCamera(jest.fn().mockResolvedValue(stream));
    const { unmount } = await renderScene();

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });
});
