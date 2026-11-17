import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { VideoProgress, formatTime } from "./VideoProgress";

// Test videos don't really play, so give each one a fake clock that the
// seek bar can read and write.
function fakeClock(video: HTMLElement, currentTime: number, duration: number) {
  let time = currentTime;
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => time,
    set: (value: number) => {
      time = value;
    },
  });
  Object.defineProperty(video, "duration", { configurable: true, value: duration });
  return { get time() { return time; } };
}

// A video with its seek bar, the way the player renders them, plus a button
// that swaps in a new video element like Next does.
function Harness({ onSeek }: { onSeek?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState("a.mp4");
  return (
    <div>
      <video key={file} ref={videoRef} data-testid="video" />
      <VideoProgress key={`progress-${file}`} videoRef={videoRef} onSeek={onSeek} />
      <button type="button" onClick={() => setFile("b.mp4")}>
        Swap
      </button>
    </div>
  );
}

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(83.4)).toBe("1:23");
    expect(formatTime(600)).toBe("10:00");
  });

  it("shows 0:00 for missing or invalid times", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});

describe("VideoProgress", () => {
  it("shows nothing until the video's length is known", () => {
    render(<Harness />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("shows the elapsed and total time as the video plays", async () => {
    render(<Harness />);
    fakeClock(screen.getByTestId("video"), 50, 200);

    expect(await screen.findByText("0:50")).toBeInTheDocument();
    expect(screen.getByText("3:20")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Seek video" })).toHaveValue("50");
  });

  it("jumps the video when the slider moves, and reports the activity", async () => {
    const onSeek = jest.fn();
    render(<Harness onSeek={onSeek} />);
    const clock = fakeClock(screen.getByTestId("video"), 0, 200);

    const slider = await screen.findByRole("slider", { name: "Seek video" });
    fireEvent.change(slider, { target: { value: "120" } });

    expect(clock.time).toBe(120);
    expect(await screen.findByText("2:00")).toBeInTheDocument();
    expect(onSeek).toHaveBeenCalled();
  });

  it("follows the new video after a swap", async () => {
    render(<Harness />);
    fakeClock(screen.getByTestId("video"), 50, 200);
    expect(await screen.findByText("0:50")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Swap" }));
    fakeClock(screen.getByTestId("video"), 10, 90);
    expect(await screen.findByText("0:10")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });
});