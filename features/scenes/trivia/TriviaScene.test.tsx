import { fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { TriviaScene } from "./TriviaScene";

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
  goToScene: jest.fn(),
};

describe("TriviaScene", () => {
  it("opens on the start screen with no score showing", () => {
    render(<TriviaScene bounds={{ width: 360, height: 640 }} handle={handle} />);

    expect(screen.getByText("Think you got what it takes to ace this Lipscomb Trivia?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Game on!" })).toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it("starts a round, with the score and timer, when Game on! is tapped", () => {
    render(<TriviaScene bounds={{ width: 360, height: 640 }} handle={handle} />);

    fireEvent.click(screen.getByRole("button", { name: "Game on!" }));

    expect(handle.reportActivity).toHaveBeenCalled();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
    expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Game on!" })).not.toBeInTheDocument();
  });
});
