# Trivia scene ("Test Your Knowledge")

Port of `TriviaScene.pde`, `TriviaEngagement.pde` and
`data/triviaQuestions.txt` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). Visitors play a
five-question round against a 15-second clock and see their score on a
leaderboard at the end. This page outlines how a round works, what each file
does, and how the scene has changed from the original and in the redesign.

## How a round works

```
start ──Game on!──▶ question ──answer──▶ result ──Tap to Continue──▶ question …
                       │                    ▲
                       └──15s runs out──────┘
                                            after question 5 ──▶ end ──tap──▶ start
```

1. **Start:** "Think you got what it takes to ace this Lipscomb Trivia?" with
   a "Game on!" button. No score is shown yet.
2. **Question:** the question with four answers in a 2×2 grid, and a
   15-second countdown under the score bar.
3. **Result:** "Correct! The answer is: …", "Wrong! The answer is: …", or
   "Time is UP!" if the clock ran out, with a "Tap to Continue" button.
4. Steps 2 and 3 repeat for five questions.
5. **End:** "Good game!", the visitor's score and the leaderboard. Tapping
   anywhere goes back to the start screen.

### Timing

| Screen                         | How long before it moves on by itself |
| ------------------------------ | -------------------------------------- |
| Question                       | 15 seconds, then "Time is UP!"         |
| Result after answering         | 40 seconds                             |
| Result after the clock ran out | 15 seconds                             |
| Start and end                  | Never; they wait for a tap             |

The kiosk's own idle clock still applies on top of this: a scene left alone
for 30 seconds advances the carousel (see `features/kiosk/KioskShell`). Each
tap in the scene calls `handle.reportActivity()` to reset it.

### Scoring

A correct answer scores `(seconds left × 69) + 100`, so answering instantly
is worth 1,135 points and answering at the last second is worth 100. A wrong
answer or a timeout scores nothing. This is the original formula, unchanged.

### Leaderboard

The board holds six scores and starts as `0, 2560, 2580, 3000, 5620, 7500`.
At the end of a round, the visitor's score replaces the lowest entry and the
board is re-sorted. The end screen shows the top five, highest first, and
marks the visitor's row with "<- You!".

The leaderboard lives in the scene's React state. It survives replays while
the visitor stays on the trivia page, but it resets to the defaults whenever
the scene leaves the screen. Upstream kept it for as long as the sketch ran;
saving it properly would need a route handler like the camera's `/api/photos`.

## Files in this folder

### [TriviaScene.tsx](TriviaScene.tsx)

The screen itself. Upstream drove the round with one flat array of screens
and an index into it; here a `phase` state (`start`, `question`, `result`,
`end`) says which screen is showing. Two effects run the clock: one ticks
`timeLeft` down every second on question and result screens, the other acts
when it reaches zero.

It is split into small components, one per part of the screen:

- **`StartScreen`:** the opening heading and the "Game on!" button.
- **`ScoreBar`:** the gold score strip and the white timer strip under it.
  Hidden on the start screen. On the end screen it reads "Thanks for
  playing!" and "Tap anywhere to play again!" instead.
- **`QuestionScreen`** and **`AnswerGrid`:** the question and its four
  answers, checkerboarded purple and gold as in the original.
- **`PromptScreen`:** a message and one button, used for the result screens.
- **`EndScreen`:** the final score, `public/trivia/triviaHeader.jpg` and the
  leaderboard, all inside one button so a tap anywhere plays again.

### [engagement.ts](engagement.ts)

The game logic, with no React in it, so it can be tested on its own:

- `createEngagement()` shuffles a question's answers and records where the
  correct one landed.
- `pickRound()` shuffles the whole bank and takes the first five, so a round
  never repeats a question.
- `scoreForAnswer()` is the scoring formula above.
- `DEFAULT_LEADERBOARD` and `updateLeaderboard()` hold and update the board.

The name "engagement" comes from upstream's `Engagement` class, one question
with its shuffled answers. Upstream's `TriviaGameManager.pde` was never used,
so it has no counterpart here.

### [questions.ts](questions.ts)

The question bank: 72 questions about Lipscomb, Nashville, engineering and
computing. Each has a prompt and four answers, and **the first answer is
always the correct one**. They're shuffled before they're shown. To add a
question, add a line in the same form.

The original text file had one line with a missing separator, which upstream
skipped. It's left out here too.

### [index.ts](index.ts)

Re-exports `TriviaScene` for `features/kiosk/registry.ts`.

### Assets outside this folder

- [`public/images/trivia-pattern.svg`](../../../public/images/trivia-pattern.svg):
  the repeating question-mark background tile.
- [`public/trivia/triviaHeader.jpg`](../../../public/trivia/triviaHeader.jpg):
  the banner on the end screen.

## Look and feel (redesign)

The redesign follows the trivia mockups. The full list of style changes, with
reasons, is in the repo's [`CSS.md`](../../../CSS.md).

- **Background:** a light grey (`#d9d9d9`) covered in tilted lavender-grey
  question marks, tiled from `trivia-pattern.svg`. Tiles are sized to 40% of
  the scene's width, so there are always five columns of marks. The
  background is opaque, so the shell's skyline doesn't show on this page.
- **Start screen:** a bold purple heading in the upper part of the scene,
  with a purple pill-shaped "Game on!" button with gold text under it. Text
  sizes scale with the screen.
- **Score bar:** no longer shown on the start screen, since no round has
  begun.
- The question, result and end screens still use their original colours and
  layout and haven't been redesigned yet.

## Tests

- **[engagement.test.ts](engagement.test.ts):** answer shuffling keeps track
  of the right answer, rounds have five different questions from the bank,
  the scoring formula, and leaderboard updates.
- **[TriviaScene.test.tsx](TriviaScene.test.tsx):** the start screen shows
  the heading and "Game on!" with no score, and tapping "Game on!" starts a
  round with the score and timer showing.

Run them with `npx jest features/scenes/trivia`.

## Differences from the Processing version

- Upstream drew four identical "Tap to Play" / "Tap to Continue" buttons on
  non-question screens, because each quarter of the screen had to be
  tappable. Here those screens have a single button.
- The start screen's "Care for some trivia? Tap the button to play!" and
  "Tap to Play" became "Think you got what it takes to ace this Lipscomb
  Trivia?" and "Game on!", and the score is hidden there.
- The leaderboard resets when the scene leaves the screen (see above).

## Status

The scene is still registered with `placeholder: true` in
`features/kiosk/registry.ts`. It's fully playable; remove that flag once the
remaining screens have been redesigned.
