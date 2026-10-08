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

/** Render and let getUserMedia settle; by default the video then delivers its first frame. */
async function renderScene({ frameArrives = true } = {}) {
  const result = render(<CameraScene bounds={{ width: 360, height: 640 }} handle={handle} />);
  await act(async () => {});
  // The "Camera unavailable" screen has no video to fire on.
  const video = result.container.querySelector("video");
  if (frameArrives && video) fireEvent.loadedData(video);
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

/** The capture button is an icon; "Take picture" is its accessible name. */
function takePictureButton() {
  return screen.getByRole("button", { name: "Take picture" });
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

  it("enables the capture button once the camera is open", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    expect(takePictureButton()).toBeEnabled();
  });

  it("waits for the first video frame before accepting a tap", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    const { container } = await renderScene({ frameArrives: false });

    expect(takePictureButton()).toBeDisabled();
    fireEvent.click(takePictureButton());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.loadedData(container.querySelector("video")!);
    expect(takePictureButton()).toBeEnabled();
  });

  it("does not take a picture when the preview is tapped", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    const { container } = await renderScene();

    fireEvent.click(container.querySelector("video")!);
    await advance(COUNTDOWN_STEP_MS, 3);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(captureFrame).not.toHaveBeenCalled();
  });

  it("counts down, saves the photo, thanks the visitor, then resets", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    fireEvent.click(takePictureButton());
    expect(handle.reportActivity).toHaveBeenCalled();
    expect(takePictureButton()).toBeDisabled();
    // Each word is announced on its own, not the growing on-screen stack.
    expect(screen.getByRole("status")).toHaveTextContent(/^Ready$/);
    expect(screen.queryByText("Set")).not.toBeInTheDocument();

    await advance(COUNTDOWN_STEP_MS);
    expect(screen.getByRole("status")).toHaveTextContent(/^Set$/);
    await advance(COUNTDOWN_STEP_MS);
    expect(screen.getByRole("status")).toHaveTextContent(/^Pose!$/);
    expect(captureFrame).not.toHaveBeenCalled();

    await advance(COUNTDOWN_STEP_MS);
    expect(captureFrame).toHaveBeenCalledTimes(1);
    expect(uploadPhoto).toHaveBeenCalledTimes(1);
    expect(THANK_YOU_TEXT).toContain(screen.getByRole("status").textContent);

    await advance(COOLDOWN_MS);
    expect(takePictureButton()).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ignores taps while a picture is in progress", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    await renderScene();

    const target = takePictureButton();
    fireEvent.click(target);
    await advance(COUNTDOWN_STEP_MS);
    fireEvent.click(target);

    expect(screen.getByRole("status")).toHaveTextContent(/^Set$/);
    await advance(COUNTDOWN_STEP_MS, 2);
    expect(captureFrame).toHaveBeenCalledTimes(1);
  });

  it("tells the visitor when a photo fails to save", async () => {
    mockCamera(jest.fn().mockResolvedValue(fakeStream().stream));
    (uploadPhoto as jest.Mock).mockRejectedValue(new Error("disk full"));
    await renderScene();

    fireEvent.click(takePictureButton());
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
    expect(screen.getByText(/https or on localhost/)).toBeInTheDocument();
  });

  it("stops the camera when the scene leaves the screen", async () => {
    const { stream, track } = fakeStream();
    mockCamera(jest.fn().mockResolvedValue(stream));
    const { unmount } = await renderScene();

    unmount();

    expect(track.stop).toHaveBeenCalled();
  });
});
