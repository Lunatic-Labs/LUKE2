import {
  createEngagement,
  DEFAULT_LEADERBOARD,
  pickRound,
  scoreForAnswer,
  shuffle,
  updateLeaderboard,
} from "./engagement";
import { TRIVIA_QUESTIONS } from "./questions";

describe("createEngagement", () => {
  it("tracks the correct answer's index after shuffling", () => {
    const engagement = createEngagement("Q?", ["Right", "Wrong1", "Wrong2", "Wrong3"]);

    expect(engagement.correctResponse).toBe("Right");
    expect(engagement.responses[engagement.correctIndex]).toBe("Right");
    expect(engagement.responses).toHaveLength(4);
    expect(new Set(engagement.responses)).toEqual(new Set(["Right", "Wrong1", "Wrong2", "Wrong3"]));
  });
});

describe("pickRound", () => {
  it("returns the requested number of engagements", () => {
    const round = pickRound(TRIVIA_QUESTIONS, 5);
    expect(round).toHaveLength(5);
  });

  it("draws distinct questions from the bank", () => {
    const round = pickRound(TRIVIA_QUESTIONS, 5);
    const prompts = round.map((engagement) => engagement.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("only ever asks questions that exist in the bank", () => {
    const round = pickRound(TRIVIA_QUESTIONS, 5);
    const bankPrompts = new Set(TRIVIA_QUESTIONS.map((q) => q.prompt));
    for (const engagement of round) {
      expect(bankPrompts.has(engagement.prompt)).toBe(true);
    }
  });
});

describe("scoreForAnswer", () => {
  it("matches TriviaScene.pde's (time * 69) + 100 formula", () => {
    expect(scoreForAnswer(15)).toBe(15 * 69 + 100);
    expect(scoreForAnswer(0)).toBe(100);
  });
});

describe("updateLeaderboard", () => {
  it("replaces the smallest entry and re-sorts, as moveToNextEngagement() did", () => {
    const board = updateLeaderboard(DEFAULT_LEADERBOARD, 4000);
    expect(board).toEqual([2560, 2580, 3000, 4000, 5620, 7500]);
  });

  it("keeps a low score in last place instead of losing it", () => {
    const board = updateLeaderboard(DEFAULT_LEADERBOARD, 1);
    expect(board[0]).toBe(1);
  });

  it("does not mutate the board passed in", () => {
    const board = [...DEFAULT_LEADERBOARD];
    updateLeaderboard(board, 4000);
    expect(board).toEqual(DEFAULT_LEADERBOARD);
  });
});

describe("shuffle", () => {
  it("preserves every element", () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input).sort()).toEqual(input.sort());
  });

  it("does not mutate the source array", () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });
});
