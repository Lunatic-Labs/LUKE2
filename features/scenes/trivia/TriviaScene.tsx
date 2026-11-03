"use client";

import { useEffect, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { pickRound, QUESTION_SECONDS, scoreForAnswer, type Engagement } from "./engagement";
import { TRIVIA_QUESTIONS } from "./questions";
import { DEFAULT_TAG, fetchLeaderboard, shiftLetter, submitScore, type Leaderboard } from "./scores";

/**
 * How long a result screen waits, untouched, before asking "Don't ghost the
 * quiz!". Kept under the kiosk's 60-second `sessionIdleSeconds`, which would
 * otherwise end the session first and the question would never be asked.
 */
export const RESULT_IDLE_SECONDS = 55;
/**
 * How long "Don't ghost the quiz!" waits before giving up and going back to
 * the main menu. Under 60 seconds for the same reason.
 */
export const GHOST_SECONDS = 55;
/** How long a chosen answer stays highlighted before the result screen. */
export const SELECTION_HOLD_MS = 400;

type Phase = "start" | "initials" | "question" | "result" | "ghost" | "end" | "leaderboard";
type ResultOutcome = "correct" | "wrong" | "timeout";

/**
 * Test Your Knowledge
 *
 * Ported from `TriviaScene.pde`. Upstream flattened a round into one array —
 * start screen, then (question, result) pairs for five questions, then an end
 * screen — and drove it with a single `currentEngagementIndex`. Here that
 * becomes an explicit `phase`, which reads more clearly in React. It keeps
 * upstream's `(secondsRemaining * 69) + 100` points for a correct answer.
 * Each question gets `QUESTION_SECONDS` (25s) rather than upstream's 15s.
 *
 * Upstream's result screens moved on by themselves after 40s (15s after a
 * timeout). Here they wait for "Next up"; left alone for
 * `RESULT_IDLE_SECONDS`, they ask "Don't ghost the quiz!", which returns to
 * the main menu if it's left alone for `GHOST_SECONDS` too.
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

  // Ticks once a second while a question is showing, and shows "Time's up!"
  // when the clock reaches zero. It stops while a chosen answer is
  // highlighted, so the clock can't run out after the visitor has answered.
  useEffect(() => {
    if (phase !== "question" || selected !== null) return;

    const tick = setTimeout(() => {
      if (timeLeft > 1) {
        setTimeLeft(timeLeft - 1);
        return;
      }
      setTimeLeft(0);
      setOutcome("timeout");
      setPhase("result");
    }, 1000);

    return () => clearTimeout(tick);
  }, [phase, selected, timeLeft]);

  // After the chosen answer has been highlighted, move on to its result.
  useEffect(() => {
    if (selected === null) return;
    const timer = setTimeout(() => {
      setSelected(null);
      setPhase("result");
    }, SELECTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  // A result screen left alone for `RESULT_IDLE_SECONDS` asks whether the
  // visitor is still there. Keyed on questionIndex so each result gets the
  // full wait.
  useEffect(() => {
    if (phase !== "result") return;
    const timer = setTimeout(() => setPhase("ghost"), RESULT_IDLE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [phase, questionIndex]);

  // "Don't ghost the quiz!" restarts the kiosk's idle clock, so the session
  // lasts long enough to show it, then gives up after `GHOST_SECONDS`.
  useEffect(() => {
    if (phase !== "ghost") return;
    handle.reportActivity();
    const timer = setTimeout(() => handle.goToMainMenu(), GHOST_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [phase, handle]);

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
    //
    // Every size below is in `--u` or `--v` rather than vw/dvh, so the screens
    // scale with the scene itself (a size container). `--u` is 1% of the
    // scene's width, unless the scene is too short for that: then it follows
    // the height instead, at 0.817cqh, the ratio of the 360×440 scene the
    // layout was designed in. Portrait looks exactly as designed; landscape
    // gets the same layout, scaled down to fit. `--v` stands in for dvh, and
    // equals 1dvh on the 360×640 kiosk screen.
    <SceneFrame className="bg-[#d9d9d9] bg-[url('/images/trivia-pattern.svg')] bg-[length:40%_auto] bg-repeat [container-type:size] [--u:min(1cqw,0.817cqh)] [--v:calc(var(--u)*16/9)]">
      {/* A portrait-shaped column: the full width in portrait, centred in
          landscape, so percentage widths keep their portrait proportions. It
          scrolls only as a last resort, if a long question wraps further
          than the layout allows for. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[calc(var(--u)*100)] flex-1 flex-col overflow-y-auto">
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

        {phase === "ghost" && <GhostScreen onContinue={continueRound} onExit={handle.goToMainMenu} />}

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
      </div>
    </SceneFrame>
  );
}

function ScoreBar({ score, phase, timeLeft }: { score: number; phase: Phase; timeLeft: number }) {
  // Only shown during a round: there's no score before it, and the end
  // screen shows the final score itself.
  if (phase !== "question" && phase !== "result" && phase !== "ghost") return null;

  // A purple card at the top, from the quiz mockup, with the score. Questions
  // also show a clock and the seconds left; result screens have no clock.
  return (
    <div className="flex shrink-0 justify-center pt-[min(2rem,calc(var(--v)*2.5))]">
      <div className="flex flex-col items-center rounded-[min(1.5rem,calc(var(--v)*2))] bg-[var(--luke-purple)] px-[min(5rem,calc(var(--u)*10))] py-[min(1rem,calc(var(--v)*1.25))] text-[length:min(2rem,calc(var(--u)*4))] leading-snug font-bold text-[var(--luke-gold)]">
        <span>Score: {score}</span>
        {phase === "question" && (
          <span className="flex items-center gap-[0.3em]">
            <ClockIcon />
            {timeLeft} {timeLeft === 1 ? "second" : "seconds"}
          </span>
        )}
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
    <div className="flex flex-1 flex-col items-center px-[12%] pt-[min(7rem,calc(var(--v)*10))]">
      <p className={`text-center ${HEADING_TEXT}`}>Think you got what it takes to ace this Lipscomb Trivia?</p>
      <div className="mt-[min(5rem,calc(var(--v)*7))] flex w-full flex-col items-center gap-[min(2rem,calc(var(--v)*2.5))]">
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
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[min(5rem,calc(var(--v)*7))]">
      <p className={`text-center ${HEADING_TEXT}`}>Enter your initials</p>
      <div className="mt-[min(2rem,calc(var(--v)*2.5))] flex justify-center gap-[min(1.5rem,calc(var(--u)*3))]">
        {[...tag].map((letter, position) => (
          <div
            key={position}
            role="group"
            aria-label={`Initial ${position + 1}`}
            className="flex flex-col items-center gap-[min(0.75rem,calc(var(--v)*1))]"
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
      <div className="mt-[min(4rem,calc(var(--v)*5))] flex w-full flex-col items-center gap-[min(2rem,calc(var(--v)*2.5))]">
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
    <div className="rounded-[min(1.75rem,calc(var(--v)*2.5))] border-[length:clamp(3px,calc(var(--u)*0.8),6px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] p-[clamp(2px,calc(var(--u)*0.6),4px)]">
      <div
        aria-live="polite"
        className="flex h-[min(10rem,calc(var(--u)*22))] w-[min(8rem,calc(var(--u)*18))] items-center justify-center rounded-[min(1.25rem,calc(var(--v)*1.75))] border-[length:clamp(1.5px,calc(var(--u)*0.4),3px)] border-[var(--luke-purple)] text-[length:min(5.5rem,calc(var(--u)*11))] font-medium text-[var(--luke-purple)]"
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
      className="w-[min(6rem,calc(var(--u)*13))] transition-[filter] active:brightness-90"
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
      className={`flex flex-1 flex-col items-center px-[8%] pt-[min(5rem,calc(var(--v)*7))] ${
        missed ? "gap-[min(2rem,calc(var(--v)*2.5))]" : "gap-[min(5rem,calc(var(--v)*7))]"
      }`}
    >
      <div className="flex flex-col items-center gap-[min(1.25rem,calc(var(--v)*1.5))] text-center font-bold text-[var(--luke-purple)]">
        <p
          className={`leading-tight ${
            missed ? "text-[length:min(4.5rem,calc(var(--u)*9))]" : "text-[length:min(3.25rem,calc(var(--u)*6.5))]"
          }`}
        >
          {RESULT_HEADINGS[outcome]}
        </p>
        {missed && (
          <p className="text-[length:min(3.25rem,calc(var(--u)*6.5))] leading-tight">Correct answer: {correctResponse}</p>
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

/**
 * Shown when a result screen has been left alone for `RESULT_IDLE_SECONDS`,
 * from the "ghost" mockup: a heading, a ghost, and two buttons. "Keep Going"
 * moves on as "Next up" would, and "I'm outta here!" goes back to the main
 * menu.
 */
function GhostScreen({ onContinue, onExit }: { onContinue: () => void; onExit: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[min(5rem,calc(var(--v)*7))]">
      <p className={`text-center ${HEADING_TEXT}`}>Don&apos;t ghost the quiz!</p>
      <p aria-hidden="true" className="mt-[min(1rem,calc(var(--v)*1.5))] text-[length:min(6rem,calc(var(--u)*13))] leading-none">
        👻
      </p>
      <div className="mt-[min(2rem,calc(var(--v)*2.5))] flex w-full flex-col items-center gap-[min(2rem,calc(var(--v)*2.5))]">
        <PillButton onClick={onContinue}>
          <span className="inline-flex items-center gap-[0.35em]">
            Keep Going
            <ArrowRightIcon />
          </span>
        </PillButton>
        <PillButton onClick={onExit}>I&apos;m outta here!</PillButton>
      </div>
    </div>
  );
}

/** Bold purple heading text shared by the start, initials, question, ghost, end and leader board screens. */
const HEADING_TEXT = "text-[length:min(3.25rem,calc(var(--u)*6.5))] leading-tight font-bold text-[var(--luke-purple)]";

/** The purple pill with gold text used for every button outside the answer grid. */
function PillButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[60%] rounded-full bg-[var(--luke-purple)] py-[min(1.25rem,calc(var(--v)*1.75))] text-center text-[length:min(2.75rem,calc(var(--u)*5.5))] font-bold text-[var(--luke-gold)] transition-[filter] active:brightness-125"
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
    <div className="flex flex-1 flex-col px-[7%] pb-[min(3rem,calc(var(--v)*4))]">
      <p className={`px-[5%] pt-[min(3rem,calc(var(--v)*4))] text-center ${HEADING_TEXT}`}>
        {engagement.prompt}
      </p>
      <AnswerGrid responses={engagement.responses} selected={selected} onSelect={onAnswer} />
    </div>
  );
}

/**
 * The 2x2 answer grid, from the quiz mockup: lavender cards with a thick
 * purple outline and rounded corners. A card darkens slightly while pressed,
 * like the kiosk's other buttons, and the tapped card stays darkened while
 * it's held on screen; the others are disabled. `onSelect` receives the
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
    <div className="mt-auto grid shrink-0 grid-cols-2 gap-[min(2rem,calc(var(--u)*4))] pt-[min(4rem,calc(var(--v)*6))]">
      {responses.map((response, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-pressed={selected === index}
          disabled={selected !== null && selected !== index}
          className={`flex min-h-[min(9rem,calc(var(--v)*11))] items-center justify-center rounded-[min(1.75rem,calc(var(--v)*2.5))] border-[length:clamp(3px,calc(var(--u)*0.8),6px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] px-2 py-2 text-center text-[length:min(2.5rem,calc(var(--u)*5))] leading-tight text-[var(--luke-purple)] transition-[filter] active:brightness-90 ${
            selected === index ? "brightness-90" : ""
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
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[min(4rem,calc(var(--v)*5))]">
      <p className={`text-center ${HEADING_TEXT}`}>Thank you for playing!</p>
      <div className="mt-[min(2rem,calc(var(--v)*2.5))] text-center text-[length:min(2.5rem,calc(var(--u)*4.75))] leading-snug font-bold text-[var(--luke-purple)]">
        <p>
          <span aria-hidden="true">🦬</span> That&apos;s a wrap, Bison!
        </p>
        <p>Your score was: {score}</p>
      </div>
      <div className="mt-[min(3rem,calc(var(--v)*3.5))] flex w-full flex-col items-center gap-[min(2rem,calc(var(--v)*2.5))]">
        <PillButton onClick={onPlayAgain}>Play again?</PillButton>
        <PillButton onClick={onLeaderboard}>Leader Board</PillButton>
        <PillButton onClick={onExit}>Exit</PillButton>
      </div>
    </div>
  );
}

/**
 * Lettering for the top three scores, from the leader board mockup: gold,
 * silver and bronze with a purple outline. `paint-order` draws the outline
 * behind the fill, so it thickens the letters instead of eating into them.
 */
const PODIUM_TEXT = [
  "text-[var(--luke-gold)]",
  "text-[#b4b3bd]",
  "text-[#b0773a]",
].map((colour) => `${colour} [-webkit-text-stroke:0.12em_var(--luke-purple)] [paint-order:stroke_fill]`);

/**
 * The saved top scores, from the leader board mockup: a large heading, a
 * lavender box with a thick purple outline listing each score as
 * `TAG - score`, and a Back button at the bottom that returns to whichever
 * screen opened it. The top three are in gold, silver and bronze, with a
 * purple bar under them, and the box scrolls to reach the rest.
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
    <div className="flex flex-1 flex-col items-center px-[8%] pt-[min(3rem,calc(var(--v)*4))] pb-[min(4rem,calc(var(--v)*5))]">
      {/* Larger and heavier than the other headings, as in the mockup. */}
      <p className="text-center text-[length:min(5rem,calc(var(--u)*11))] leading-tight font-black text-[var(--luke-purple)]">
        Leader Board
      </p>
      <div className="mt-[min(1rem,calc(var(--v)*1.5))] h-[min(28rem,calc(var(--v)*40))] w-[65%] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[min(1.75rem,calc(var(--v)*2.5))] border-[length:clamp(3px,calc(var(--u)*0.8),6px)] border-[var(--luke-purple)] bg-[var(--luke-lavender)] py-[min(1.5rem,calc(var(--v)*2))] text-center text-[length:min(3rem,calc(var(--u)*6))] leading-tight font-extrabold text-[var(--luke-purple)]">
        {failed ? (
          <p className="px-[9%] text-[0.6em]">Sorry, the leader board couldn&apos;t be loaded.</p>
        ) : leaderboard === null ? (
          <p className="px-[9%] text-[0.6em]">Loading&hellip;</p>
        ) : leaderboard.scores.length === 0 ? (
          <p className="px-[9%] text-[0.6em]">No scores yet. Be the first!</p>
        ) : (
          <>
            <ol>
              {leaderboard.scores.slice(0, 3).map(({ tag, score }, i) => (
                <li key={i} className={PODIUM_TEXT[i]}>
                  {tag} - {score}
                </li>
              ))}
            </ol>
            {leaderboard.scores.length > 3 && (
              <>
                {/* The purple bar between the top three and the rest: a
                    solid rule across the whole box. */}
                <div
                  aria-hidden="true"
                  className="my-[0.25em] h-[clamp(3px,calc(var(--u)*0.9),7px)] bg-[var(--luke-purple)]"
                />
                <ol start={4}>
                  {leaderboard.scores.slice(3).map(({ tag, score }, i) => (
                    <li key={i}>
                      {tag} - {score}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </div>
      <div className="mt-auto flex w-full justify-center pt-[min(2rem,calc(var(--v)*3))]">
        <PillButton onClick={onBack}>Back</PillButton>
      </div>
    </div>
  );
}
