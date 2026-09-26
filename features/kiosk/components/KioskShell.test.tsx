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

  it("opens and closes the menu from the header chevron", () => {
    const { container } = render(<KioskShell sessionSink={sink} />);
    touchScreen();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("#kiosk-nav-menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("#kiosk-nav-menu")).not.toBeInTheDocument();
  });

  it("jumps to a page from the menu and closes it", () => {
    const { container } = render(<KioskShell sessionSink={sink} />);
    touchScreen();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    fireEvent.click(screen.getByRole("button", { name: "Map" }));

    expect(screen.getByRole("navigation")).toHaveTextContent("You Are Here");
    expect(container.querySelector("#kiosk-nav-menu")).not.toBeInTheDocument();
  });

  it("closes the menu when the bottom bar's arrows are used", () => {
    const { container } = render(<KioskShell sessionSink={sink} />);
    touchScreen();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Next scene" }));
    expect(container.querySelector("#kiosk-nav-menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous scene" }));
    expect(container.querySelector("#kiosk-nav-menu")).not.toBeInTheDocument();
  });

  it("marks the page on screen in the menu", () => {
    render(<KioskShell sessionSink={sink} />);
    touchScreen();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("button", { name: "Video" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Map" })).not.toHaveAttribute("aria-current");
  });

  it("closes the menu when the session ends", () => {
    const { container } = render(<KioskShell sessionSink={sink} />);
    touchScreen();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    advanceSeconds(DEFAULT_OPTIONS.sceneIdleSeconds * 8);
    expect(screen.getByText("WELCOME!")).toBeInTheDocument();
    touchScreen();

    expect(container.querySelector("#kiosk-nav-menu")).not.toBeInTheDocument();
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
