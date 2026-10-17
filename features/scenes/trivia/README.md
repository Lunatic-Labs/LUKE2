# Trivia scene ("Test Your Knowledge")

Port of `TriviaScene.pde`, `TriviaEngagement.pde` and
`data/triviaQuestions.txt` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). Visitors play a
five-question round against a 15-second clock and see their score on a
saved leaderboard at the end. This page outlines how a round works, where
scores are saved, what each file does, and how the scene has changed from
the original and in the redesign.

## How a round works

```
start ──Game on!──▶ question ──answer──▶ result ──Next up──▶ question …
                       │                    ▲
                       └──15s runs out──────┘
                                            after question 5 ──▶ end ──Play again?──▶ start
                                                                     └──Exit──▶ kiosk main menu
```

1. **Start:** "Think you got what it takes to ace this Lipscomb Trivia?" with
   a "Game on!" button. No score is shown yet.
2. **Question:** the question with four answers in a 2×2 grid, under a
   purple card showing the score and a 15-second countdown. The tapped
   answer turns yellow for 0.4 seconds (`SELECTION_HOLD_MS`) before the
   result appears. Only the first tap counts.
3. **Result:** "Nailed it!" after a right answer. After a wrong answer it
   shows "Oops!", or "Time's up!" if the clock ran out, with "Correct
   answer: …" underneath. Each has a "Next up →" button.
4. Steps 2 and 3 repeat for five questions.
5. **End:** the score is saved, and the screen shows "Thank you for
   playing!", "🦬 That's a wrap, Bison!", the visitor's score, and three
   buttons:
   - **Play again?** goes back to the start screen.
   - **Score Board** does nothing yet. It will open the saved leaderboard.
   - **Exit** goes back to the kiosk's main menu (the page of all kiosk
     pages). The visitor's session carries on; it doesn't return to the
     welcome screen.

### Timing

| Screen                         | How long before it moves on by itself |
| ------------------------------ | -------------------------------------- |
| Question                       | 15 seconds, then "Time's up!"          |
| Chosen answer highlighted      | 0.4 seconds; the clock is paused       |
| Result after answering         | 40 seconds                             |
| Result after the clock ran out | 15 seconds                             |
| Start and end                  | Never; they wait for a tap             |

The kiosk's own idle clock still applies on top of this: a scene left alone
for 30 seconds advances the carousel (see `features/kiosk/KioskShell`). Each
tap in the scene calls `handle.reportActivity()` to reset it.

### Scoring

A correct answer scores `(seconds left × 69) + 100`, so answering instantly
is worth 1,135 points and answering at the last second is worth 100. The
score uses the seconds left at the moment of the tap; the short
highlight afterwards doesn't cost anything, because the clock is paused. A wrong
answer or a timeout scores nothing. This is the original formula, unchanged.

### Saved scores and the leaderboard

**Every finished round's score is saved.** When the end screen appears, the
scene sends the score to `POST /api/scores`, which adds it as a new row of a
table on the kiosk's disk. The leaderboard is then read back from that table,
so it's shared by every visitor and survives page reloads, sessions ending
and kiosk restarts.

```
TriviaScene ──submitScore──▶ POST /api/scores ──saveScore──▶ TRIVIA_SCORES_DIR/scores.csv
     ▲                                                              │
     └──────────── top 5, with your row marked ◀── readScores ──────┘
```

**Where:** `data/trivia-scores/scores.csv`, relative to the folder the app
runs from, next to the camera's `data/camera-pics`. Set the
`TRIVIA_SCORES_DIR` environment variable to use another folder. The `data/`
folder is gitignored, so scores never end up in a commit. In Docker the
folder is the `trivia-scores` volume (see `docker-compose.yml`), so scores
survive rebuilding the image.

**What's in the table:** a CSV file, which opens in Excel or any text editor,
with one row per finished round, oldest first:

```csv
tag,score
TST,100
TST,1135
```

- **`tag`:** exactly three capital letters, A-Z. No lowercase letters,
  spaces, digits or symbols, and never blank. Every score is saved as `TST`
  for now (`DEFAULT_TAG` in `scores.ts`), until visitors can type their own.
- **`score`:** a whole number from 0 to 5,675, the most a round can score
  (`MAX_SCORE`: five questions answered the instant they appear).

The server checks both before writing, and rejects anything else with a 400
error, so the table only ever holds valid rows. When reading, rows that
don't fit (the header, a lowercase tag, or a line damaged by hand-editing)
are skipped rather than breaking the board.

**The leaderboard:** not shown on screen at the moment. The end screen's
"Score Board" button is a placeholder until the score board screen is built.
The pieces for it are ready: `GET /api/scores` returns the top five scores
(`LEADERBOARD_SIZE`), highest first, and `buildLeaderboard()` ranks them.
Equal scores keep the order they were saved in, so an earlier score stays
above a later one that ties it. After a save, the response also says where
the new score landed (`yours`), for marking the visitor's row. Every round is
kept in the file, not only the top five, so the board size can change later
without losing scores.

**All scores are real.** The board starts empty and only ever shows scores
from rounds actually played. The made-up starting scores
(`2560`, `2580`, `3000`, `5620`, `7500`) from the Processing version are
gone. Scores saved while testing on a development machine stay in that
machine's `data/trivia-scores` folder, not on the kiosk.

**If saving fails** (for example, the disk is full), the error is logged
to the browser console. The end screen looks the same either way, so the
visitor isn't interrupted.

**Managing the table:**

- **Clear the board:** delete `scores.csv`. A new one is created with the
  next score.
- **Remove one score:** delete its row in a text editor. Keep the
  `tag,score` header.
- **Back up or export:** copy `scores.csv`. In Docker, copy it out of the
  container with `docker compose cp web:/app/data/trivia-scores/scores.csv .`

**Security:** `/api/scores` has no login, like `/api/photos`. Anyone who can
reach the server could post a made-up score, within the valid range. This
is safe only because the server listens on localhost (see the port notes in
`docker-compose.yml`). Don't open it to the network without adding
authentication.

## Files in this folder

### [TriviaScene.tsx](TriviaScene.tsx)

The screen itself. Upstream drove the round with one flat array of screens
and an index into it; here a `phase` state (`start`, `question`, `result`,
`end`) says which screen is showing. Two effects run the clock: one ticks
`timeLeft` down every second on question and result screens, the other acts
when it reaches zero. A `selected` state holds the answer just tapped; while
it's set, the clock is paused, and a third effect moves to the result screen
after `SELECTION_HOLD_MS`.

It is split into small components, one per part of the screen:

- **`StartScreen`:** the opening heading and the "Game on!" button.
- **`ScoreBar`:** on question and result screens, a purple card with gold
  text: "Score: N" above a clock icon and "N seconds". Hidden on the start
  and end screens.
- **`QuestionScreen`** and **`AnswerGrid`:** the question and its four
  answers as lavender cards with thick purple outlines. The tapped card turns
  yellow and the other three are disabled.
- **`ResultScreen`:** the result after each question: a heading from
  `RESULT_HEADINGS`, the correct answer after a miss, and the "Next up"
  button.
- **`PillButton`:** the purple pill with gold text shared by "Game on!" and
  "Next up". `HEADING_TEXT` is the bold purple heading style shared by the
  start, question and result screens.
- **`EndScreen`:** the thank-you heading, the final score and the three
  buttons. "Play again?" sets the phase back to `start`; "Exit" calls
  `handle.goToMainMenu()`; "Score Board" has no click handler yet.

An effect saves the score when the phase becomes `end`, with
`submitScore({ tag: DEFAULT_TAG, score })`. It only logs a failure.

### [engagement.ts](engagement.ts)

The game logic, with no React in it, so it can be tested on its own:

- `createEngagement()` shuffles a question's answers and records where the
  correct one landed.
- `pickRound()` shuffles the whole bank and takes the first five, so a round
  never repeats a question.
- `scoreForAnswer()` is the scoring formula above.
- `QUESTION_SECONDS` (15) and `ROUND_LENGTH` (5) are the clock and round
  size. They live here, not in the scene, because the server also needs
  them to work out the highest possible score.

The name "engagement" comes from upstream's `Engagement` class, one question
with its shuffled answers. Upstream's `TriviaGameManager.pde` was never used,
so it has no counterpart here.

### [scores.ts](scores.ts)

Saved-score rules shared by the browser and the server, plus the browser's
call to save a score. Safe to import anywhere.

- `isValidTag()` and `isValidScore()`: the rules for a row (three capital
  letters, A-Z; a whole number from 0 to `MAX_SCORE`).
- `DEFAULT_TAG` (`"TST"`), `LEADERBOARD_SIZE` (5) and `MAX_SCORE` (5,675).
- `buildLeaderboard()`: picks the top scores from the table and works out
  where the visitor's new score landed.
- `submitScore()`: posts a score to `/api/scores` and returns the updated
  leaderboard.

### [score-store.ts](score-store.ts)

Reads and writes `scores.csv`, like `camera/photo-store.ts` does for photos.
**Server-only:** it uses the file system, so only `app/api/scores` may import
it. Keep it out of `index.ts` so it's never bundled for the browser.

- `scoresDir()`: `TRIVIA_SCORES_DIR` if set, otherwise
  `data/trivia-scores`.
- `saveScore()`: appends a row, creating the folder and the file with its
  header the first time. Refuses an invalid tag or score.
- `readScores()`: every valid row, oldest first. A missing file is an empty
  table.

### [`app/api/scores/route.ts`](../../../app/api/scores/route.ts)

The route the browser talks to:

- `GET /api/scores` returns the current leaderboard.
- `POST /api/scores` with `{ "tag": "TST", "score": 100 }` validates and saves
  the score, then returns the updated leaderboard with the new row's
  position in `yours`. It answers 400 for an invalid tag, score or body, and
  413 for a body over 1 KB.

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
  the banner the old end screen showed. The redesigned end screen doesn't
  use it, so it can be deleted unless the score board screen needs it.

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
- **Score card:** on question and result screens, the score and timer sit
  in a purple card with rounded corners and bold gold text, centred at the
  top, with a clock icon before the seconds. It's not shown on the start
  screen, since no round has begun.
- **Question screen:** the question is in the same bold purple as the start
  heading. The answers are a 2×2 grid of lavender cards with thick purple
  outlines and rounded corners, in the lower part of the scene. The tapped
  card turns a soft yellow (`#e7cb7d`).
- **Result screen:** under the score card, a bold purple heading in the
  upper part of the scene, then a "Next up →" pill button styled like
  "Game on!". After a right answer the heading is "Nailed it!", the same
  size as the other headings. After a miss it is a larger "Oops!" (or
  "Time's up!") with "Correct answer: …" under it at the normal heading
  size, and the button sits closer underneath.
- **End screen:** "Thank you for playing!" in the shared heading style,
  then "🦬 That's a wrap, Bison!" and "Your score was: N" in smaller bold
  purple, then three purple pill buttons stacked down the middle: "Play
  again?", "Score Board" and "Exit". The score card is hidden here, since
  the score is shown in the text.

## Tests

- **[engagement.test.ts](engagement.test.ts):** answer shuffling keeps track
  of the right answer, rounds have five different questions from the bank,
  and the scoring formula.
- **[TriviaScene.test.tsx](TriviaScene.test.tsx):** uses a fixed round
  (by mocking `pickRound`) and fake timers to check that:
  - the start screen shows the heading and "Game on!" with no score;
  - tapping "Game on!" starts a round with the score and timer showing;
  - the timer counts down a second at a time;
  - a tapped answer is highlighted, scored at the tap, and followed by the
    result;
  - the clock is paused while the answer is highlighted;
  - only the first answer tapped counts;
  - a right answer shows "Nailed it!" without the correct answer, a wrong
    one shows "Oops!" with it, and a timeout shows "Time's up!" with it;
  - "Next up" moves to the next question with the clock reset;
  - the end screen saves the score under `TST`, and the round still ends
    normally if saving fails. Saving is faked here;
  - the end screen shows the thank-you, the score and its three buttons,
    with no score card;
  - "Play again?" returns to the start screen, "Exit" calls
    `goToMainMenu`, and "Score Board" does nothing.
- **[scores.test.ts](scores.test.ts):** which tags and scores are valid, and
  how the leaderboard is ranked and marked.
- **[score-store.test.ts](score-store.test.ts):** the table's format, the
  folder and header being created, invalid rows refused on write and skipped
  on read, and `TRIVIA_SCORES_DIR`. Uses a temporary folder.
- **[`app/api/scores/route.test.ts`](../../../app/api/scores/route.test.ts):**
  saving and reading through the route, and every kind of bad request being
  rejected without writing anything.

Run them with `npx jest features/scenes/trivia app/api/scores`.

## Differences from the Processing version

- Upstream drew four identical "Tap to Play" / "Tap to Continue" buttons on
  non-question screens, because each quarter of the screen had to be
  tappable. Here those screens have a single button.
- The start screen's "Care for some trivia? Tap the button to play!" and
  "Tap to Play" became "Think you got what it takes to ace this Lipscomb
  Trivia?" and "Game on!", and the score is hidden there.
- Upstream's leaderboard lived in memory, held six scores seeded with
  made-up ones, and was lost when the program closed. Scores are now saved
  to `scores.csv` with a three-letter tag, and the board shows only real
  ones.
- Upstream's end screen showed "Good game!", the score and the leaderboard,
  and a tap anywhere played again. It now has separate "Play again?",
  "Score Board" and "Exit" buttons, and the leaderboard has moved behind
  "Score Board". Exit returning to the main menu is new; upstream had no way
  back to a menu.
- Upstream went straight to the result screen when an answer was tapped.
  Here the answer is highlighted for 0.4 seconds first, with the clock
  paused.
- The answer buttons were checkerboarded purple and gold; they're now
  matching lavender cards.
- The result messages "Correct! The answer is: …", "Wrong! The answer is:
  …" and "Time is UP!" became "Nailed it!", "Oops! / Correct answer: …" and
  "Time's up! / Correct answer: …". A timeout now shows the correct answer
  too. "Tap to Continue" became "Next up →".

## Status

The scene is still registered with `placeholder: true` in
`features/kiosk/registry.ts`. It's fully playable. What's left is the score
board screen behind the end screen's "Score Board" button; remove the flag
once that's done.
