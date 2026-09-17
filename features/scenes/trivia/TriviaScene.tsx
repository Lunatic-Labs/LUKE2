"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import {
  DEFAULT_LEADERBOARD,
  pickRound,
  scoreForAnswer,
  updateLeaderboard,
  type Engagement,
} from "./engagement";
import { TRIVIA_QUESTIONS } from "./questions";

const QUESTION_SECONDS = 15;
const ANSWERED_RESULT_SECONDS = 40;
const TIMEOUT_RESULT_SECONDS = 15;

type Phase = "start" | "question" | "result" | "end";
type ResultOutcome = "correct" | "wrong" | "timeout";

/**
 * Test Your Knowledge
 *
 * Ported from `TriviaScene.pde`. Upstream flattened a round into one array —
 * start screen, then (question, result) pairs for five questions, then an end
 * screen — and drove it with a single `currentEngagementIndex`. Here that
 * becomes an explicit `phase`, which reads more clearly in React but preserves
 * every timing rule: 15s per question, 40s on a result screen reached by
 * answering, 15s on one reached by timing out (so "Time is UP!" doesn't linger
 * as long as "Correct!"/"Wrong!" does), and `(secondsRemaining * 69) + 100`
 * points for a correct answer.
 *
 * `TriviaGameManager.pde`'s `Game` class was dead code upstream (nothing ever
 * constructed one) and has no counterpart here — see `engagement.ts`.
 */
export function TriviaScene({ handle }: SceneComponentProps) {
  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState<Engagement[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [score, setScore] = useState(0);
  const [outcome, setOutcome] = useState<ResultOutcome | null>(null);
  const [leaderboard, setLeaderboard] = useState<number[]>(DEFAULT_LEADERBOARD);

  const finished = phase === "end";
  const current = round[questionIndex];

  // Ticks whenever a question or a result screen is showing. Keyed on
  // (phase, questionIndex) rather than `timeLeft` so it restarts exactly once
  // per screen instead of on every second.
  useEffect(() => {
    if (phase !== "question" && phase !== "result") return;

    const interval = setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, questionIndex]);

  useEffect(() => {
    if (timeLeft > 0) return;
    if (phase === "question") {
      setOutcome("timeout");
      setTimeLeft(TIMEOUT_RESULT_SECONDS);
      setPhase("result");
    } else if (phase === "result") {
      advance();
    }
    // advance() closes over state that's current as of this render; the effect
    // re-runs whenever any of it changes, so this is safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  function startRound() {
    handle.reportActivity();
    setRound(pickRound(TRIVIA_QUESTIONS));
    setQuestionIndex(0);
    setScore(0);
    setOutcome(null);
    setTimeLeft(QUESTION_SECONDS);
    setPhase("question");
  }

  function answer(responseIndex: number) {
    handle.reportActivity();
    if (!current) return;

    const correct = responseIndex === current.correctIndex;
    if (correct) setScore((s) => s + scoreForAnswer(timeLeft));
    setOutcome(correct ? "correct" : "wrong");
    setTimeLeft(ANSWERED_RESULT_SECONDS);
    setPhase("result");
  }

  function continueRound() {
    handle.reportActivity();
    advance();
  }

  function advance() {
    if (questionIndex >= round.length - 1) {
      setLeaderboard((board) => updateLeaderboard(board, score));
      setPhase("end");
      return;
    }
    setQuestionIndex((i) => i + 1);
    setOutcome(null);
    setTimeLeft(QUESTION_SECONDS);
    setPhase("question");
  }

  function playAgain() {
    handle.reportActivity();
    setPhase("start");
  }

  return (
    <SceneFrame>
      <ScoreBar score={score} phase={phase} timeLeft={timeLeft} />

      {phase === "start" && (
        <PromptScreen
          prompt="Care for some trivia? Tap a button to play!"
          buttonLabel="Tap to Play"
          onSelect={startRound}
        />
      )}

      {phase === "question" && current && (
        <QuestionScreen engagement={current} onAnswer={answer} />
      )}

      {phase === "result" && (
        <PromptScreen
          prompt={resultMessage(outcome, current)}
          buttonLabel="Tap to Continue"
          onSelect={continueRound}
        />
      )}

      {finished && <EndScreen score={score} leaderboard={leaderboard} onSelect={playAgain} />}
    </SceneFrame>
  );
}

function resultMessage(outcome: ResultOutcome | null, engagement: Engagement | undefined): string {
  if (outcome === "timeout" || !engagement) return "Time is UP!";
  const prefix = outcome === "correct" ? "Correct!" : "Wrong!";
  return `${prefix} The answer is: ${engagement.correctResponse}`;
}

function ScoreBar({ score, phase, timeLeft }: { score: number; phase: Phase; timeLeft: number }) {
  return (
    <div className="shrink-0">
      <div className="flex items-center justify-center bg-[var(--luke-gold)] px-4 py-3 text-[var(--luke-purple)]">
        {phase === "end" ? (
          <span className="text-center font-semibold">Thanks for playing!</span>
        ) : (
          <span className="font-semibold">Score: {score}</span>
        )}
      </div>
      {phase !== "start" && phase !== "end" && (
        <div className="flex items-center justify-center bg-white px-4 py-2 text-[var(--luke-purple)]">
          <span className="font-medium">Time remaining: {timeLeft}</span>
        </div>
      )}
      {phase === "end" && (
        <div className="flex items-center justify-center bg-white px-4 py-2 text-center text-[var(--luke-purple)]">
          <span className="font-medium">Tap anywhere to play again!</span>
        </div>
      )}
    </div>
  );
}

function PromptScreen({
  prompt,
  buttonLabel,
  onSelect,
}: {
  prompt: string;
  buttonLabel: string;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="flex-1 px-6 py-8 text-center text-xl leading-8 whitespace-pre-line text-[var(--luke-purple)]">
        {prompt}
      </p>
      <AnswerGrid
        responses={[buttonLabel, buttonLabel, buttonLabel, buttonLabel]}
        onSelect={onSelect}
      />
    </div>
  );
}

function QuestionScreen({
  engagement,
  onAnswer,
}: {
  engagement: Engagement;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="flex-1 px-6 py-8 text-center text-xl leading-8 text-[var(--luke-purple)]">
        {engagement.prompt}
      </p>
      <AnswerGrid responses={engagement.responses} onSelect={onAnswer} />
    </div>
  );
}

/**
 * The 2x2 answer grid, checkerboarded purple/gold exactly as `DrawButtons()`
 * did: top-left and bottom-right are purple-on-gold, top-right and
 * bottom-left are gold-on-purple. `onSelect` receives the button's index in
 * `responses`, matching `Click()`'s quadrant-to-answer-index mapping.
 */
function AnswerGrid({
  responses,
  onSelect,
}: {
  responses: string[];
  onSelect: (index: number) => void;
}) {
  const swapped = [false, true, true, false];

  return (
    <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-1 p-1">
      {responses.map((response, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={`rounded-lg px-3 py-6 text-center font-semibold ${
            swapped[index]
              ? "bg-[var(--luke-gold)] text-[var(--luke-purple)]"
              : "bg-[var(--luke-purple)] text-[var(--luke-gold)]"
          }`}
        >
          {response}
        </button>
      ))}
    </div>
  );
}

function EndScreen({
  score,
  leaderboard,
  onSelect,
}: {
  score: number;
  leaderboard: number[];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-1 flex-col items-center gap-4 px-6 py-6 text-center"
    >
      <p className="text-lg font-semibold text-[var(--luke-purple)]">Good game!</p>
      <p className="text-[var(--luke-purple)]">Your score was: {score}</p>

      <div className="relative h-24 w-full max-w-xs">
        <Image src="/trivia/triviaHeader.jpg" alt="" fill className="object-contain" sizes="320px" />
      </div>

      <div className="w-full max-w-xs text-[var(--luke-purple)]">
        <p className="mb-1 font-semibold">Leaderboard:</p>
        <ul className="space-y-1">
          {leaderboardRows(leaderboard, score).map(({ entry, isYou }, i) => (
            <li key={i}>
              {entry}
              {isYou ? " <- You!" : ""}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

/**
 * Descending display order dropping the smallest entry, exactly as the
 * `for (i = 5; i > 0; i--)` loop in `moveToNextEngagement()` did. Only the
 * first row matching the just-finished score is marked "You!" — a tie
 * further down the board doesn't get relabeled (`markedYou` upstream).
 */
function leaderboardRows(leaderboard: number[], score: number) {
  let markedYou = false;
  return [...leaderboard]
    .slice(1)
    .reverse()
    .map((entry) => {
      const isYou = !markedYou && entry === score;
      if (isYou) markedYou = true;
      return { entry, isYou };
    });
}
