import { act, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_OPTIONS } from "../options";
import type { SessionSink } from "../session-log";
import { KioskShell } from "./KioskShell";

/** Silent sink so tests do not depend on console output. */
const sink: SessionSink = { writeSession: jest.fn(), writeError: jest.fn() };

function advanceSeconds(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

function touchScreen() {
  fireEvent.pointerDown(screen.getByRole("main"));
}

describe("KioskShell", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts on the idle scene with no navigation bar", () => {
    render(<KioskShell sessionSink={sink} />);

    expect(screen.getByText("WELCOME!")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("enters the carousel at the first scene on any touch", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    // BuildDisplay() registered Video first, and a tap on idle landed on it.
    expect(screen.getByRole("navigation")).toHaveTextContent("Video Player");
  });

  it("advances the carousel from the bottom bar", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    fireEvent.click(screen.getByRole("button", { name: "Next scene" }));
    expect(screen.getByRole("navigation")).toHaveTextContent("You Are Here");

    fireEvent.click(screen.getByRole("button", { name: "Previous scene" }));
    expect(screen.getByRole("navigation")).toHaveTextContent("Video Player");
  });

  it("auto-advances a scene left untouched", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds);
    expect(screen.getByRole("navigation")).toHaveTextContent("You Are Here");
  });

  it("keeps a scene while it is being used", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    // Interaction just before the threshold restarts the countdown.
    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds - 1);
    touchScreen();
    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds - 1);

    expect(screen.getByRole("navigation")).toHaveTextContent("Video Player");
  });

  it("returns to idle once the carousel wraps back to where it went idle", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    // Eight scenes, each drifting after sceneIdleSeconds.
    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds * 8);

    expect(screen.getByText("WELCOME!")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("logs the session once it ends", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds * 8);
    expect(sink.writeSession).toHaveBeenCalledTimes(1);
  });

  it("credits attended time to the scene in view", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();

    advanceSeconds(5);
    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds * 8);

    const record = (sink.writeSession as jest.Mock).mock.calls[0][0];
    expect(record.sceneSeconds.video).toBeGreaterThan(0);
  });
});
