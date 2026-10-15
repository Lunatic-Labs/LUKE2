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
/** How long a chosen answer stays highlighted before the result screen. */
export const SELECTION_HOLD_MS = 400;

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
  /** The answer just tapped, highlighted for `SELECTION_HOLD_MS` before the result. */
  const [selected, setSelected] = useState<number | null>(null);

  const finished = phase === "end";
  const current = round[questionIndex];

  // Ticks whenever a question or a result screen is showing. Keyed on
  // (phase, questionIndex) rather than `timeLeft` so it restarts exactly once
  // per screen instead of on every second. It stops while a chosen answer is
  // highlighted, so the clock can't run out after the visitor has answered.
  useEffect(() => {
    if (phase !== "question" && phase !== "result") return;
    if (selected !== null) return;

    const interval = setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, questionIndex, selected]);

  // After the chosen answer has been highlighted, move on to its result.
  useEffect(() => {
    if (selected === null) return;
    const timer = setTimeout(() => {
      setSelected(null);
      setTimeLeft(ANSWERED_RESULT_SECONDS);
      setPhase("result");
    }, SELECTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [selected]);

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
    // One answer per question: ignore taps while one is highlighted.
    if (!current || selected !== null) return;

    // Scored now, with the time left at the tap, not after the highlight.
    const correct = responseIndex === current.correctIndex;
    if (correct) setScore((s) => s + scoreForAnswer(timeLeft));
    setOutcome(correct ? "correct" : "wrong");
    setSelected(responseIndex);
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
    // Tiled question-mark pattern from the trivia mockup. Each tile holds two
    // columns, so 40% gives five columns across at any screen width. Opaque,
    // so it also covers the shell's skyline here.
    <SceneFrame className="bg-[#d9d9d9] bg-[url('/images/trivia-pattern.svg')] bg-[length:40%_auto] bg-repeat">
      <ScoreBar score={score} phase={phase} timeLeft={timeLeft} />

      {phase === "start" && <StartScreen onStart={startRound} />}

      {phase === "question" && current && (
        <QuestionScreen engagement={current} selected={selected} onAnswer={answer} />
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
  // No round has started yet, so there's no score to show.
  if (phase === "start") return null;

  if (phase === "end") {
    return (
      <div className="shrink-0">
        <div className="flex items-center justify-center bg-[var(--luke-gold)] px-4 py-3 text-[var(--luke-purple)]">
          <span className="text-center font-semibold">Thanks for playing!</span>
        </div>
        <div className="flex items-center justify-center bg-white px-4 py-2 text-center text-[var(--luke-purple)]">
          <span className="font-medium">Tap anywhere to play again!</span>
        </div>
      </div>
    );
  }

  // Question and result screens: a purple card at the top, from the quiz
  // mockup, with the score over a clock and the seconds left.
  return (
    <div className="flex shrink-0 justify-center pt-[clamp(0.75rem,2.5dvh,2rem)]">
      <div className="flex flex-col items-center rounded-[clamp(0.75rem,2dvh,1.5rem)] bg-[var(--luke-purple)] px-[clamp(1.5rem,10vw,5rem)] py-[clamp(0.375rem,1.25dvh,1rem)] text-[clamp(0.875rem,4vw,2rem)] leading-snug font-bold text-[var(--luke-gold)]">
        <span>Score: {score}</span>
        <span className="flex items-center gap-[0.3em]">
          <ClockIcon />
          {timeLeft} {timeLeft === 1 ? "second" : "seconds"}
        </span>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1em] w-[1em]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="12,6.5 12,12 15.5,14" />
    </svg>
  );
}

/**
 * The opening screen, from the trivia mockup: a bold purple question in the
 * upper part of the scene, with a purple pill button under it.
 */
function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-[clamp(2rem,7dvh,5rem)] px-[12%] pt-[clamp(2rem,10dvh,7rem)]">
      <p className="text-center text-[clamp(1.25rem,6.5vw,3.25rem)] leading-tight font-bold text-[var(--luke-purple)]">
        Think you got what it takes to ace this Lipscomb Trivia?
      </p>
      <button
        type="button"
        onClick={onStart}
        className="w-[60%] rounded-full bg-[var(--luke-purple)] py-[clamp(0.5rem,1.75dvh,1.25rem)] text-center text-[clamp(1.125rem,5.5vw,2.75rem)] font-bold text-[var(--luke-gold)] transition-[filter] active:brightness-125"
      >
        Game on!
      </button>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8">
      <p className="text-center text-xl leading-8 whitespace-pre-line text-[var(--luke-purple)]">
        {prompt}
      </p>
      <button
        type="button"
        onClick={onSelect}
        className="rounded-lg bg-[var(--luke-purple)] px-10 py-6 text-center text-lg font-semibold text-[var(--luke-gold)]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function QuestionScreen({
  engagement,
  selected,
  onAnswer,
}: {
  engagement: Engagement;
  selected: number | null;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-[7%] pb-[clamp(1rem,4dvh,3rem)]">
      <p className="px-[5%] pt-[clamp(1rem,4dvh,3rem)] text-center text-[clamp(1.25rem,6.5vw,3.25rem)] leading-tight font-bold text-[var(--luke-purple)]">
        {engagement.prompt}
      </p>
      <AnswerGrid responses={engagement.responses} selected={selected} onSelect={onAnswer} />
    </div>
  );
}

/**
 * The 2x2 answer grid, from the quiz mockup: lavender cards with a thick
 * purple outline and rounded corners. The tapped card turns yellow while it's
 * held on screen, and the others are disabled. `onSelect` receives the
 * button's index in `responses`, matching the quadrant-to-answer mapping of
 * upstream's `Click()`, which checkerboarded the four buttons purple and gold.
 *
 * Only question screens use this. Upstream drew four identical "Tap to Play" /
 * "Tap to Continue" buttons on the other screens because every quadrant had to
 * be clickable; here `StartScreen` and `PromptScreen` each show a single
 * button instead.
 */
function AnswerGrid({
  responses,
  selected,
  onSelect,
}: {
  responses: string[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-auto grid shrink-0 grid-cols-2 gap-[clamp(0.75rem,4vw,2rem)] pt-[clamp(1.5rem,6dvh,4rem)]">
      {responses.map((response, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-pressed={selected === index}
          disabled={selected !== null && selected !== index}
          className={`flex min-h-[clamp(4rem,11dvh,9rem)] items-center justify-center rounded-[clamp(0.75rem,2.5dvh,1.75rem)] border-[clamp(3px,0.8vw,6px)] border-[var(--luke-purple)] px-2 py-2 text-center text-[clamp(1rem,5vw,2.5rem)] leading-tight text-[var(--luke-purple)] ${
            selected === index ? "bg-[#e7cb7d]" : "bg-[var(--luke-lavender)]"
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
