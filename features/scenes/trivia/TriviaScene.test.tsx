import { act, fireEvent, render, screen } from "@testing-library/react";
import type { SceneHandle } from "@/features/kiosk/types";
import { QUESTION_SECONDS, scoreForAnswer } from "./engagement";
import { fetchLeaderboard, submitScore } from "./scores";
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

// No server in tests: saving a score is faked.
jest.mock("./scores", () => ({
  ...jest.requireActual("./scores"),
  submitScore: jest.fn(),
  fetchLeaderboard: jest.fn(),
}));

const handle: SceneHandle = {
  reportActivity: jest.fn(),
  nextScene: jest.fn(),
  previousScene: jest.fn(),
  exitCarousel: jest.fn(),
  goToScene: jest.fn(),
  goToMainMenu: jest.fn(),
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

/** Answer all five questions, the first `correct` of them right, to reach the end screen. */
async function playRound(correct: number) {
  for (let i = 0; i < 5; i++) {
    fireEvent.click(screen.getByRole("button", { name: i < correct ? "Swang" : "Fields" }));
    await advance(SELECTION_HOLD_MS);
    fireEvent.click(screen.getByRole("button", { name: "Next up" }));
  }
  // Let the save's promise settle.
  await act(async () => {});
}

describe("TriviaScene", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(fetchLeaderboard).mockResolvedValue({
      scores: [
        { tag: "TST", score: 1025 },
        { tag: "AAA", score: 450 },
      ],
      yours: null,
    });
    jest.mocked(submitScore).mockResolvedValue({
      scores: [
        { tag: "ACE", score: 5000 },
        { tag: "TST", score: 1135 },
      ],
      yours: 1,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
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
    expect(screen.getByText(`${QUESTION_SECONDS} seconds`)).toBeInTheDocument();
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Game on!" })).not.toBeInTheDocument();
  });

  it("counts the timer down a second at a time", async () => {
    renderAndStart();

    await advance(1000);
    expect(screen.getByText(`${QUESTION_SECONDS - 1} seconds`)).toBeInTheDocument();
  });

  it("highlights the chosen answer, then shows the result", async () => {
    renderAndStart();

    fireEvent.click(screen.getByRole("button", { name: "Swang" }));

    expect(screen.getByRole("button", { name: "Swang" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fields" })).toBeDisabled();
    // Scored at the tap, with the full clock left.
    expect(screen.getByText(`Score: ${scoreForAnswer(QUESTION_SECONDS)}`)).toBeInTheDocument();

    await advance(SELECTION_HOLD_MS);
    expect(screen.getByText("Nailed it!")).toBeInTheDocument();
    // The correct answer is only spelled out after a miss.
    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
  });

  it("stops the clock while the chosen answer is highlighted", async () => {
    renderAndStart();
    await advance(1000);

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    await advance(SELECTION_HOLD_MS - 1);

    expect(screen.getByText(`${QUESTION_SECONDS - 1} seconds`)).toBeInTheDocument();
  });

  it("takes only the first answer tapped", async () => {
    renderAndStart();

    fireEvent.click(screen.getByRole("button", { name: "Fields" }));
    fireEvent.click(screen.getByRole("button", { name: "Swang" }));
    await advance(SELECTION_HOLD_MS);

    expect(screen.getByText("Oops!")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: Swang")).toBeInTheDocument();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
  });

  it("shows the correct answer when the clock runs out", async () => {
    renderAndStart();

    for (let i = 0; i < QUESTION_SECONDS; i++) await advance(1000);

    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: Swang")).toBeInTheDocument();
  });

  it("moves to the next question from Next up", async () => {
    renderAndStart();
    fireEvent.click(screen.getByRole("button", { name: "Swang" }));
    await advance(SELECTION_HOLD_MS);

    fireEvent.click(screen.getByRole("button", { name: "Next up" }));

    expect(screen.getByText("Question 2?")).toBeInTheDocument();
    expect(screen.getByText(`${QUESTION_SECONDS} seconds`)).toBeInTheDocument();
  });

  it("saves the round's score under the TST tag", async () => {
    renderAndStart();
    await playRound(1);

    expect(submitScore).toHaveBeenCalledTimes(1);
    expect(submitScore).toHaveBeenCalledWith({ tag: "TST", score: scoreForAnswer(QUESTION_SECONDS) });
  });

  it("ends with a thank-you, the score and three buttons, and no score card", async () => {
    renderAndStart();
    await playRound(1);

    expect(screen.getByText("Thank you for playing!")).toBeInTheDocument();
    expect(screen.getByText(/That's a wrap, Bison!/)).toBeInTheDocument();
    expect(screen.getByText(`Your score was: ${scoreForAnswer(QUESTION_SECONDS)}`)).toBeInTheDocument();
    expect(screen.queryByText(/^Score:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leader Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit" })).toBeInTheDocument();
  });

  it("goes back to the start screen from Play again?", async () => {
    renderAndStart();
    await playRound(0);

    fireEvent.click(screen.getByRole("button", { name: "Play again?" }));

    expect(screen.getByRole("button", { name: "Game on!" })).toBeInTheDocument();
  });

  it("goes back to the main menu from Exit", async () => {
    renderAndStart();
    await playRound(0);

    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    expect(handle.goToMainMenu).toHaveBeenCalledTimes(1);
  });

  it("opens the leader board, listing scores as TAG - score", async () => {
    renderAndStart();
    await playRound(0);

    fireEvent.click(screen.getByRole("button", { name: "Leader Board" }));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await act(async () => {});

    expect(fetchLeaderboard).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Leader Board")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(["TST - 1025", "AAA - 450"]);
    expect(screen.queryByText("Thank you for playing!")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Score:/)).not.toBeInTheDocument();
  });

  it("goes back to the end screen from Back, without saving the score again", async () => {
    renderAndStart();
    await playRound(1);
    fireEvent.click(screen.getByRole("button", { name: "Leader Board" }));
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("Thank you for playing!")).toBeInTheDocument();
    expect(screen.getByText(`Your score was: ${scoreForAnswer(QUESTION_SECONDS)}`)).toBeInTheDocument();
    expect(submitScore).toHaveBeenCalledTimes(1);
  });

  it("says so when there are no scores yet", async () => {
    jest.mocked(fetchLeaderboard).mockResolvedValue({ scores: [], yours: null });
    renderAndStart();
    await playRound(0);

    fireEvent.click(screen.getByRole("button", { name: "Leader Board" }));
    await act(async () => {});

    expect(screen.getByText("No scores yet. Be the first!")).toBeInTheDocument();
  });

  it("says so when the leader board can't be loaded", async () => {
    jest.mocked(fetchLeaderboard).mockRejectedValue(new Error("offline"));
    renderAndStart();
    await playRound(0);

    fireEvent.click(screen.getByRole("button", { name: "Leader Board" }));
    await act(async () => {});

    expect(screen.getByText("Sorry, the leader board couldn't be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("still finishes the round normally when the score can't be saved", async () => {
    jest.mocked(submitScore).mockRejectedValue(new Error("offline"));
    renderAndStart();
    await playRound(0);

    expect(submitScore).toHaveBeenCalledWith({ tag: "TST", score: 0 });
    expect(console.error).toHaveBeenCalled();
    expect(screen.getByText("Thank you for playing!")).toBeInTheDocument();
  });
});
