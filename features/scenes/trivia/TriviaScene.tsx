"use client";

import { useEffect, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { pickRound, QUESTION_SECONDS, scoreForAnswer, type Engagement } from "./engagement";
import { TRIVIA_QUESTIONS } from "./questions";
import { DEFAULT_TAG, fetchLeaderboard, shiftLetter, submitScore, type Leaderboard } from "./scores";

const ANSWERED_RESULT_SECONDS = 40;
const TIMEOUT_RESULT_SECONDS = 15;
/** How long a chosen answer stays highlighted before the result screen. */
export const SELECTION_HOLD_MS = 400;

type Phase = "start" | "initials" | "question" | "result" | "end" | "leaderboard";
type ResultOutcome = "correct" | "wrong" | "timeout";

/**
 * Test Your Knowledge
 *
 * Ported from `TriviaScene.pde`. Upstream flattened a round into one array —
 * start screen, then (question, result) pairs for five questions, then an end
 * screen — and drove it with a single `currentEngagementIndex`. Here that
 * becomes an explicit `phase`, which reads more clearly in React. It keeps
 * upstream's 40s on a result screen reached by answering, 15s on one reached
 * by timing out (so "Time's up!" doesn't linger as long as "Nailed it!"/"Oops!"
 * does), and `(secondsRemaining * 69) + 100` points for a correct answer.
 * Each question gets `QUESTION_SECONDS` (25s) rather than upstream's 15s.
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
  /** The visitor's three initials, saved with their score. Kept for "Play again?". */
  const [tag, setTag] = useState(DEFAULT_TAG);
  /** The screen the leader board's Back button returns to. */
  const [leaderboardReturn, setLeaderboardReturn] = useState<"start" | "end">("end");
  /** The saved scores, once loaded for the leader board. */
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  /** True if loading the leader board failed. */
  const [leaderboardFailed, setLeaderboardFailed] = useState(false);
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

  // Load the saved scores whenever the leader board opens. It's cleared when
  // the board is opened, so only the response's state updates happen here.
  useEffect(() => {
    if (phase !== "leaderboard") return;
    let cancelled = false;

    fetchLeaderboard().then(
      (board) => {
        if (!cancelled) setLeaderboard(board);
      },
      (error: unknown) => {
        console.error("TriviaScene: could not load the leader board", error);
        if (!cancelled) setLeaderboardFailed(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [phase]);

  function openInitials() {
    handle.reportActivity();
    setPhase("initials");
  }

  function closeInitials() {
    handle.reportActivity();
    setPhase("start");
  }

  function shiftInitial(position: number, step: number) {
    handle.reportActivity();
    setTag((current) =>
      [...current].map((letter, i) => (i === position ? shiftLetter(letter, step) : letter)).join(""),
    );
  }

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
      // Saved here, once per round, rather than whenever the end screen
      // shows: the leader board's Back button returns to the end screen. A
      // failure is only logged, so the visitor's round still ends normally.
      submitScore({ tag, score }).catch((error: unknown) => {
        console.error("TriviaScene: could not save score", error);
      });
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

  function openLeaderboard(from: "start" | "end") {
    handle.reportActivity();
    setLeaderboard(null);
    setLeaderboardFailed(false);
    setLeaderboardReturn(from);
    setPhase("leaderboard");
  }

  function closeLeaderboard() {
    handle.reportActivity();
    setPhase(leaderboardReturn);
  }

  return (
    // Tiled question-mark pattern from the trivia mockup. Each tile holds two
    // columns, so 40% gives five columns across at any screen width. Opaque,
    // so it also covers the shell's skyline here.
    <SceneFrame className="bg-[#d9d9d9] bg-[url('/images/trivia-pattern.svg')] bg-[length:40%_auto] bg-repeat">
      <ScoreBar score={score} phase={phase} timeLeft={timeLeft} />

      {phase === "start" && <StartScreen onStart={openInitials} onLeaderboard={() => openLeaderboard("start")} />}

      {phase === "initials" && (
        <InitialsScreen tag={tag} onShift={shiftInitial} onStart={startRound} onBack={closeInitials} />
      )}

      {phase === "question" && current && (
        <QuestionScreen engagement={current} selected={selected} onAnswer={answer} />
      )}

      {phase === "result" && outcome && current && (
        <ResultScreen outcome={outcome} correctResponse={current.correctResponse} onContinue={continueRound} />
      )}

      {finished && (
        <EndScreen
          score={score}
          onPlayAgain={playAgain}
          onLeaderboard={() => openLeaderboard("end")}
          onExit={handle.goToMainMenu}
        />
      )}

      {phase === "leaderboard" && (
        <LeaderboardScreen leaderboard={leaderboard} failed={leaderboardFailed} onBack={closeLeaderboard} />
      )}
    </SceneFrame>
  );
}

function ScoreBar({ score, phase, timeLeft }: { score: number; phase: Phase; timeLeft: number }) {
  // Only shown during a round: there's no score before it, and the end
  // screen shows the final score itself.
  if (phase !== "question" && phase !== "result") return null;

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
 * upper part of the scene, with "Let's go!" (on to the initials screen) and
 * "Score Board" (the leader board) under it.
 */
function StartScreen({ onStart, onLeaderboard }: { onStart: () => void; onLeaderboard: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center px-[12%] pt-[clamp(2rem,10dvh,7rem)]">
      <p className={`text-center ${HEADING_TEXT}`}>Think you got what it takes to ace this Lipscomb Trivia?</p>
      <div className="mt-[clamp(2rem,7dvh,5rem)] flex w-full flex-col items-center gap-[clamp(0.75rem,2.5dvh,2rem)]">
        <PillButton onClick={onStart}>
          <span className="inline-flex items-center gap-[0.35em]">
            Let&apos;s go!
            <ArrowRightIcon />
          </span>
        </PillButton>
        <PillButton onClick={onLeaderboard}>Score Board</PillButton>
      </div>
    </div>
  );
}

/**
 * Where the visitor picks the three initials saved with their score, from the
 * initials mockup. Each letter sits between two gold arrows: the lower one
 * steps forward through the alphabet (A, B, C…) and the upper one steps back
 * (A, Z, Y…). "Game on!" starts the round and "Back" returns to the start.
 */
function InitialsScreen({
  tag,
  onShift,
  onStart,
  onBack,
}: {
  tag: string;
  onShift: (position: number, step: number) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[clamp(1.5rem,7dvh,5rem)]">
      <p className={`text-center ${HEADING_TEXT}`}>Enter your initials</p>
      <div className="mt-[clamp(0.75rem,2.5dvh,2rem)] flex justify-center gap-[clamp(0.5rem,3vw,1.5rem)]">
        {[...tag].map((letter, position) => (
          <div
            key={position}
            role="group"
            aria-label={`Initial ${position + 1}`}
            className="flex flex-col items-center gap-[clamp(0.25rem,1dvh,0.75rem)]"
          >
            <ArrowButton
              direction="up"
              label={`Initial ${position + 1}: previous letter`}
              onClick={() => onShift(position, -1)}
            />
            <LetterBox letter={letter} />
            <ArrowButton
              direction="down"
              label={`Initial ${position + 1}: next letter`}
              onClick={() => onShift(position, 1)}
            />
          </div>
        ))}
      </div>
      <div className="mt-[clamp(1.5rem,5dvh,4rem)] flex w-full flex-col items-center gap-[clamp(0.75rem,2.5dvh,2rem)]">
        <PillButton onClick={onStart}>Game on!</PillButton>
        <PillButton onClick={onBack}>Back</PillButton>
      </div>
    </div>
  );
}

/**
 * One initial: a lavender card with a thick purple outline and a thinner
 * purple line inside it, from the mockup.
 */
function LetterBox({ letter }: { letter: string }) {
  return (
    <div className="rounded-[clamp(0.75rem,2.5dvh,1.75rem)] border-[clamp(3px,0.8vw,6px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] p-[clamp(2px,0.6vw,4px)]">
      <div
        aria-live="polite"
        className="flex h-[clamp(4rem,22vw,10rem)] w-[clamp(3.25rem,18vw,8rem)] items-center justify-center rounded-[clamp(0.5rem,1.75dvh,1.25rem)] border-[clamp(1.5px,0.4vw,3px)] border-[var(--luke-purple)] text-[clamp(2rem,11vw,5.5rem)] font-medium text-[var(--luke-purple)]"
      >
        {letter}
      </div>
    </div>
  );
}

/** A gold triangle with a purple outline that steps one initial up or down. */
function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "up" | "down";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-[clamp(2.5rem,13vw,6rem)] transition-[filter] active:brightness-90"
    >
      <svg viewBox="0 0 40 30" className="block w-full" aria-hidden="true">
        <polygon
          points={direction === "up" ? "20,3 37,27 3,27" : "3,3 37,3 20,27"}
          fill="var(--luke-gold)"
          stroke="var(--luke-purple)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const RESULT_HEADINGS: Record<ResultOutcome, string> = {
  correct: "Nailed it!",
  wrong: "Oops!",
  timeout: "Time's up!",
};

/**
 * The screen after each question, from the result mockups: a short heading
 * ("Nailed it!" or "Oops!") in the upper part of the scene, then the "Next up"
 * button. A wrong answer or a timeout also shows the correct answer, under a
 * larger heading.
 */
function ResultScreen({
  outcome,
  correctResponse,
  onContinue,
}: {
  outcome: ResultOutcome;
  correctResponse: string;
  onContinue: () => void;
}) {
  const missed = outcome !== "correct";

  return (
    <div
      className={`flex flex-1 flex-col items-center px-[8%] pt-[clamp(2rem,7dvh,5rem)] ${
        missed ? "gap-[clamp(0.75rem,2.5dvh,2rem)]" : "gap-[clamp(2rem,7dvh,5rem)]"
      }`}
    >
      <div className="flex flex-col items-center gap-[clamp(0.25rem,1.5dvh,1.25rem)] text-center font-bold text-[var(--luke-purple)]">
        <p
          className={`leading-tight ${
            missed ? "text-[clamp(1.75rem,9vw,4.5rem)]" : "text-[clamp(1.25rem,6.5vw,3.25rem)]"
          }`}
        >
          {RESULT_HEADINGS[outcome]}
        </p>
        {missed && (
          <p className="text-[clamp(1.25rem,6.5vw,3.25rem)] leading-tight">Correct answer: {correctResponse}</p>
        )}
      </div>
      <PillButton onClick={onContinue}>
        <span className="inline-flex items-center gap-[0.35em]">
          Next up
          <ArrowRightIcon />
        </span>
      </PillButton>
    </div>
  );
}

/** Bold purple heading text shared by the start, question, end and leader board screens. */
const HEADING_TEXT = "text-[clamp(1.25rem,6.5vw,3.25rem)] leading-tight font-bold text-[var(--luke-purple)]";

/** The purple pill with gold text used for every button outside the answer grid. */
function PillButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[60%] rounded-full bg-[var(--luke-purple)] py-[clamp(0.5rem,1.75dvh,1.25rem)] text-center text-[clamp(1.125rem,5.5vw,2.75rem)] font-bold text-[var(--luke-gold)] transition-[filter] active:brightness-125"
    >
      {children}
    </button>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1em] w-[1em]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="14,5 21,12 14,19" />
    </svg>
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
      <p className={`px-[5%] pt-[clamp(1rem,4dvh,3rem)] text-center ${HEADING_TEXT}`}>
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
 * be clickable; here `StartScreen` and `ResultScreen` each show a single
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

/**
 * The end of a round, from the end-screen mockup: a thank-you heading, the
 * final score, and three buttons. "Play again?" goes back to the start
 * screen, "Leader Board" opens the saved scores, and "Exit" goes back to the
 * kiosk's main menu.
 */
function EndScreen({
  score,
  onPlayAgain,
  onLeaderboard,
  onExit,
}: {
  score: number;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[clamp(1.5rem,5dvh,4rem)]">
      <p className={`text-center ${HEADING_TEXT}`}>Thank you for playing!</p>
      <div className="mt-[clamp(0.75rem,2.5dvh,2rem)] text-center text-[clamp(1rem,4.75vw,2.5rem)] leading-snug font-bold text-[var(--luke-purple)]">
        <p>
          <span aria-hidden="true">🦬</span> That&apos;s a wrap, Bison!
        </p>
        <p>Your score was: {score}</p>
      </div>
      <div className="mt-[clamp(1rem,3.5dvh,3rem)] flex w-full flex-col items-center gap-[clamp(0.75rem,2.5dvh,2rem)]">
        <PillButton onClick={onPlayAgain}>Play again?</PillButton>
        <PillButton onClick={onLeaderboard}>Leader Board</PillButton>
        <PillButton onClick={onExit}>Exit</PillButton>
      </div>
    </div>
  );
}

/**
 * The saved top scores, from the leader board mockup: a heading, a lavender
 * box with a thick purple outline listing each score as `TAG - score`, and a
 * Back button at the bottom that returns to the end screen.
 */
function LeaderboardScreen({
  leaderboard,
  failed,
  onBack,
}: {
  leaderboard: Leaderboard | null;
  failed: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[clamp(1rem,4dvh,3rem)] pb-[clamp(1.5rem,5dvh,4rem)]">
      <p className={`text-center ${HEADING_TEXT}`}>Leader Board</p>
      <div className="mt-[clamp(0.75rem,2dvh,1.5rem)] h-[clamp(11rem,45dvh,32rem)] w-[65%] rounded-[clamp(0.75rem,2.5dvh,1.75rem)] border-[clamp(3px,0.8vw,6px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] px-[6%] py-[clamp(0.5rem,2dvh,1.5rem)] text-center text-[clamp(1.125rem,6vw,3rem)] leading-tight font-bold text-[var(--luke-purple)]">
        {failed ? (
          <p className="text-[0.6em]">Sorry, the leader board couldn&apos;t be loaded.</p>
        ) : leaderboard === null ? (
          <p className="text-[0.6em]">Loading&hellip;</p>
        ) : leaderboard.scores.length === 0 ? (
          <p className="text-[0.6em]">No scores yet. Be the first!</p>
        ) : (
          <ol>
            {leaderboard.scores.map(({ tag, score }, i) => (
              <li key={i}>
                {tag} - {score}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="mt-auto flex w-full justify-center pt-[clamp(1rem,3dvh,2rem)]">
        <PillButton onClick={onBack}>Back</PillButton>
      </div>
    </div>
  );
}
