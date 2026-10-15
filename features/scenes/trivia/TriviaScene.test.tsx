import { act, fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { SELECTION_HOLD_MS, TriviaScene } from "./TriviaScene";

// A fixed round, so tests know which answer is right and where it sits.
jest.mock("./engagement", () => {
  const actual = jest.requireActual("./engagement");
  const question = (n: number) => ({
    prompt: `Question ${n}?`,
    responses: ["Fields", "Swang", "Shamblin", "Collins"],
    correctIndex: 1,
    correctResponse: "Swang",
  });
  return { ...actual, pickRound: () => [1, 2, 3, 4, 5].map(question) };
});

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
  goToScene: jest.fn(),
};

function renderAndStart() {
  render(<TriviaScene bounds={{ width: 360, height: 640 }} handle={handle} />);
  fireEvent.click(screen.getByRole("button", { name: "Game on!" }));
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("TriviaScene", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("opens on the start screen with no score showing", () => {
    render(<TriviaScene bounds={{ width: 360, height: 640 }} handle={handle} />);

    expect(screen.getByText("Think you got what it takes to ace this Lipscomb Trivia?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Game on!" })).toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it("starts a round, with the score and timer, when Game on! is tapped", () => {
    renderAndStart();

    expect(handle.reportActivity).toHaveBeenCalled();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
    expect(screen.getByText("15 seconds")).toBeInTheDocument();
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Game on!" })).not.toBeInTheDocument();
  });

  it("counts the timer down a second at a time", async () => {
    renderAndStart();

    await advance(1000);
    expect(screen.getByText("14 seconds")).toBeInTheDocument();
  });

  it("highlights the chosen answer, then shows the result", async () => {
    renderAndStart();

    fireEvent.click(screen.getByRole("button", { name: "Swang" }));

    expect(screen.getByRole("button", { name: "Swang" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fields" })).toBeDisabled();
    // Scored at the tap, with the full 15 seconds left.
    expect(screen.getByText(`Score: ${15 * 69 + 100}`)).toBeInTheDocument();

    await advance(SELECTION_HOLD_MS);
    expect(screen.getByText("Correct! The answer is: Swang")).toBeInTheDocument();
  });

  it("stops the clock while the chosen answer is highlighted", async () => {
    renderAndStart();
    await advance(1000);

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    await advance(SELECTION_HOLD_MS - 1);

    expect(screen.getByText("14 seconds")).toBeInTheDocument();
  });

  it("takes only the first answer tapped", async () => {
    renderAndStart();

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    fireEvent.click(screen.getByRole("button", { name: "Swang" }));
    await advance(SELECTION_HOLD_MS);

    expect(screen.getByText("Wrong! The answer is: Swang")).toBeInTheDocument();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
  });
});
