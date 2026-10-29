# Trivia scene ("Test Your Knowledge")

Port of `TriviaScene.pde`, `TriviaEngagement.pde` and
`data/triviaQuestions.txt` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). Visitors play a
five-question round against a 25-second clock, and at the end can check
their score against a saved leaderboard. This page outlines how a round works, where
scores are saved, what each file does, and how the scene has changed from
the original and in the redesign.

## How a round works

```
start ──Let's go!──▶ initials ──Game on!──▶ question ──answer──▶ result ──Next up──▶ question …
  │ ▲                   │                       │                    ▲
  │ └───────Back────────┘                       └──25s runs out──────┘  │ 55s untouched
  └──Score Board──▶ leader board ──Back──▶ start                              ▼
                                                  Don't ghost the quiz! ──Keep Going──▶ next question
                                                       ├──I'm outta here!──▶ kiosk main menu
                                                       └──55s untouched────▶ kiosk main menu
                                            after question 5 ──▶ end ──Play again?──▶ start
                                                                  │ ├──Exit──▶ kiosk main menu
                                                                  │ └──Leader Board──▶ leader board
                                                                  └────────────Back────────────┘
```

1. **Start:** "Think you got what it takes to ace this Lipscomb Trivia?" with
   a "Let's go! →" button and a "Score Board" button. No score is shown yet.
   "Score Board" opens the leader board (step 7), whose "Back" returns here.
2. **Initials:** "Enter your initials" over three letter boxes, starting at
   `AAA`, each with a gold arrow above and below it. The lower arrow steps
   the letter forward (A → B → C …) and the upper arrow steps it back (A → Z
   → Y …); both wrap around. "Game on!" starts the round, and the initials
   are saved with the score at the end. "Back" returns to the start screen.
   The initials are kept for "Play again?", so a returning player doesn't
   have to enter them again.
3. **Question:** the question with four answers in a 2×2 grid, under a
   purple card showing the score and a 25-second countdown. An answer
   darkens slightly while pressed, and the tapped answer stays darkened for
   0.4 seconds (`SELECTION_HOLD_MS`) before the result appears. Only the first tap counts.
4. **Result:** "Nailed it!" after a right answer. After a wrong answer it
   shows "Oops!", or "Time's up!" if the clock ran out, with "Correct
   answer: …" underneath. Each has a "Next up →" button. The score card
   shows the score only, with no timer, and the screen waits for a tap.
   - **Don't ghost the quiz!:** if a result screen is left alone for 55
     seconds (`RESULT_IDLE_SECONDS`), it's replaced by "Don't ghost the
     quiz!" with a ghost (👻), the score card, and two buttons. **Keep Going
     →** moves on exactly as "Next up" would (to the next question, or to
     the end screen after question 5). **I'm outta here!** goes back to the
     kiosk's main menu. Left alone for another 55 seconds (`GHOST_SECONDS`),
     it goes back to the main menu by itself. Leaving this way doesn't save
     the round's score, since the round wasn't finished.
5. Steps 3 and 4 repeat for five questions.
6. **End:** the score is saved, and the screen shows "Thank you for
   playing!", "🦬 That's a wrap, Bison!", the visitor's score, and three
   buttons:
   - **Play again?** goes back to the start screen.
   - **Leader Board** opens the leader board (step 7).
   - **Exit** goes back to the kiosk's main menu (the page of all kiosk
     pages). The visitor's session carries on; it doesn't return to the
     welcome screen.
7. **Leader Board:** a large "Leader Board" heading over a box listing the
   top 50 saved scores as `TAG - score` (for example `TST - 1025`), highest
   first. The top three are in gold, silver and bronze lettering with a
   purple outline, with a solid purple line between them and the rest. The
   box shows about eight rows and scrolls to reach the others. Under it is a
   "Back" button that returns to whichever screen opened it: the start
   screen or the end screen. The scores are loaded fresh
   each time it opens, so the visitor's just-saved score is included. Going
   back and forth doesn't save the score again.

### Timing

| Screen                         | How long before it moves on by itself |
| ------------------------------ | -------------------------------------- |
| Question                       | 25 seconds, then "Time's up!"          |
| Chosen answer highlighted      | 0.4 seconds; the clock is paused       |
| Result (after answering or a timeout) | 55 seconds, then "Don't ghost the quiz!" |
| Don't ghost the quiz!          | 55 seconds, then the kiosk's main menu |
| Start, initials, end, leader board | Never; they wait for a tap         |

The two 55-second waits are `RESULT_IDLE_SECONDS` and `GHOST_SECONDS` in
`TriviaScene.tsx`; the question timer is `QUESTION_SECONDS` in
`engagement.ts`.

The kiosk's own idle clock still applies on top of this: a session left
alone for 60 seconds (`sessionIdleSeconds`) ends and the welcome screen
returns (see `features/kiosk/KioskShell`). Each tap in the scene calls
`handle.reportActivity()` to reset it. That's why both waits are 55 seconds
rather than a full minute: a 60-second wait on a result screen would lose
the race with the kiosk's clock, and "Don't ghost the quiz!" would never
appear. "Don't ghost the quiz!" also calls `handle.reportActivity()` when it
appears, so the kiosk's clock starts again and the screen gets its full 55
seconds.

### Scoring

A correct answer scores `(seconds left × 69) + 100`, so answering instantly
is worth 1,825 points and answering at the last second is worth 100. The
score uses the seconds left at the moment of the tap; the short
highlight afterwards doesn't cost anything, because the clock is paused. A wrong
answer or a timeout scores nothing. This is the original formula, unchanged,
but with a 25-second clock instead of the original 15, so scores run higher
than upstream's.

### Saved scores and the leaderboard

**Every finished round's score is saved.** As the last question's result
moves on to the end screen, the scene sends the score to `POST /api/scores`,
which adds it as a new row of a table on the kiosk's disk. The leader board
screen reads the top scores back from that table, so the board is shared by
every visitor and survives page reloads, sessions ending and kiosk restarts.

```
round ends ──submitScore──▶ POST /api/scores ──saveScore──▶ TRIVIA_SCORES_DIR/scores.csv
                                                                     │
Leader Board ──fetchLeaderboard──▶ GET /api/scores ◀──readScores─────┘
     ▲                                  │
     └──────────── top 50 ──────────────┘
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
TST,1825
```

- **`tag`:** exactly three capital letters, A-Z. No lowercase letters,
  spaces, digits or symbols, and never blank. The visitor picks it on the
  initials screen, which starts at `AAA` (`DEFAULT_TAG` in `scores.ts`), so
  a visitor who doesn't change it is saved as `AAA`. Rows saved as `TST`
  come from before the initials screen existed.
- **`score`:** a whole number from 0 to 9,125, the most a round can score
  (`MAX_SCORE`: five questions answered the instant they appear).

The server checks both before writing, and rejects anything else with a 400
error, so the table only ever holds valid rows. When reading, rows that
don't fit (the header, a lowercase tag, or a line damaged by hand-editing)
are skipped rather than breaking the board.

**The leaderboard:** the start screen's "Score Board" button and the end
screen's "Leader Board" button open it. It
loads `GET /api/scores`, which returns the top 50 scores
(`LEADERBOARD_SIZE`), highest first, and shows each as `TAG - score`. The
box scrolls, so the list can be longer than the box. Equal
scores keep the order they were saved in, so an earlier score stays above a
later one that ties it. Every round is kept in the file, not only the top
50, so the board size can change later without losing scores. (After a
save, the server's response also says where the new score landed, `yours`;
the screen doesn't use it yet, but it could mark the visitor's row.)

If there are no scores yet, the box says "No scores yet. Be the first!". If
they can't be loaded, it says "Sorry, the leader board couldn't be loaded."
Either way the Back button still works.

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
and an index into it; here a `phase` state (`start`, `initials`, `question`,
`result`, `ghost`, `end`, `leaderboard`) says which screen is showing. A
`tag` state holds the visitor's initials. One effect runs the question clock,
ticking `timeLeft` down every second and showing "Time's up!" when it
reaches zero. A `selected` state holds the answer just tapped; while it's
set, the clock is paused, and a second effect moves to the result screen
after `SELECTION_HOLD_MS`. Two more effects handle a visitor walking away:
one moves a result screen to `ghost` after `RESULT_IDLE_SECONDS`, and the
other, on `ghost`, resets the kiosk's idle clock and calls
`handle.goToMainMenu()` after `GHOST_SECONDS`.

It is split into small components, one per part of the screen:

- **`StartScreen`:** the opening heading, the "Let's go! →" button (to the
  initials screen) and the "Score Board" button (to the leader board).
- **`InitialsScreen`:** "Enter your initials", the three `LetterBox`es with
  an `ArrowButton` above and below each, "Game on!" and "Back". The arrows
  call `shiftLetter()` from `scores.ts` with -1 (upper) or +1 (lower).
- **`ScoreBar`:** a purple card with gold text: "Score: N", with a clock
  icon and "N seconds" under it on question screens only. Shown on question,
  result and "Don't ghost the quiz!" screens.
- **`QuestionScreen`** and **`AnswerGrid`:** the question and its four
  answers as lavender cards with thick purple outlines. A card darkens
  slightly while pressed (`active:brightness-90`); the tapped card stays
  darkened (`brightness-90`) and the other three are disabled.
- **`ResultScreen`:** the result after each question: a heading from
  `RESULT_HEADINGS`, the correct answer after a miss, and the "Next up"
  button.
- **`GhostScreen`:** "Don't ghost the quiz!", the ghost, "Keep Going →"
  (which calls the same `continueRound()` as "Next up") and "I'm outta
  here!" (which calls `handle.goToMainMenu()`).
- **`PillButton`:** the purple pill with gold text used for every button
  outside the answer grid: "Let's go!", "Score Board", "Game on!", "Next
  up", "Keep Going", "I'm outta here!", the end screen's three buttons and
  both "Back" buttons. `HEADING_TEXT` is the bold purple heading style used
  by the start, initials, question, ghost, end and leader board screens. The result screen's
  text uses the same size, written out in `ResultScreen`.
- **`EndScreen`:** the thank-you heading, the final score and the three
  buttons. "Play again?" sets the phase back to `start`; "Leader Board" sets
  it to `leaderboard`; "Exit" calls `handle.goToMainMenu()`.
- **`LeaderboardScreen`:** the heading, the box of scores, and "Back", which
  sets the phase back to `start` or `end`, whichever opened it
  (`leaderboardReturn`).

The score is saved in `advance()`, at the moment the last question's result
moves on to the end screen, with `submitScore({ tag, score })`.
That runs once per round; saving whenever the end screen appeared would save
again each time the visitor came back from the leader board. A failure is
only logged. An effect loads the leaderboard with `fetchLeaderboard()` each
time the phase becomes `leaderboard`.

### [engagement.ts](engagement.ts)

The game logic, with no React in it, so it can be tested on its own:

- `createEngagement()` shuffles a question's answers and records where the
  correct one landed.
- `pickRound()` shuffles the whole bank and takes the first five, so a round
  never repeats a question.
- `scoreForAnswer()` is the scoring formula above.
- `QUESTION_SECONDS` (25) and `ROUND_LENGTH` (5) are the clock and round
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
- `DEFAULT_TAG` (`"AAA"`, the initials screen's starting letters),
  `LEADERBOARD_SIZE` (50) and `MAX_SCORE` (9,125).
- `shiftLetter()`: the letter one step forward or back from another,
  wrapping from Z to A and from A to Z. The initials screen's arrows use it.
- `buildLeaderboard()`: picks the top scores from the table and works out
  where the visitor's new score landed.
- `submitScore()`: posts a score to `/api/scores` and returns the updated
  leaderboard.
- `fetchLeaderboard()`: gets the current leaderboard from `/api/scores`,
  for the leader board screen.

### [score-store.ts](score-store.ts)

Reads and writes `scores.csv`, like `camera/photo-store.ts` does for photos.
**Server-only:** it uses the file system, so only `app/api/scores` may import
it. Keep it out of `index.ts` so it's never bundled for the browser.

- `scoresDir()`: `TRIVIA_SCORES_DIR` if set, otherwise
  `data/trivia-scores`.
- `saveScore()`: appends a row, creating the folder and the file with its
  header the first time. Refuses an invalid tag or score.
- `saveScoreAndRead()`: saves a score and reads the table back, returning
  the entries and the new row's index. Saves run one at a time, so no other
  save can land between the write and the read and be mistaken for this one.
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
  the banner the old end screen showed. Nothing uses it any more, so it can
  be deleted.

## Look and feel (redesign)

The redesign follows the trivia mockups. The full list of style changes, with
reasons, is in the repo's [`CSS.md`](../../../CSS.md).

- **Portrait and landscape:** the page is designed for the kiosk's portrait
  screen, and every screen also fits in landscape with all its buttons
  visible. Sizes scale with the scene rather than the browser window: two CSS
  units on the scene, `--u` and `--v`, follow its width in portrait and its
  height when it's too short (landscape). In portrait they match the
  original `vw`/`dvh` sizes exactly; in landscape the same layout is scaled
  down into a centred column. When changing a size, write it in these units
  (`calc(var(--u)*N)` for widths and text, `calc(var(--v)*N)` for vertical
  spacing), not in `vw` or `dvh`, or landscape will overflow again. See
  "Sizing" in `CSS.md` for the details.

- **Background:** a light grey (`#d9d9d9`) covered in tilted lavender-grey
  question marks, tiled from `trivia-pattern.svg`. Tiles are sized to 40% of
  the scene's width, so there are always five columns of marks. The
  background is opaque, so the shell's skyline doesn't show on this page.
- **Start screen:** a bold purple heading in the upper part of the scene,
  with two purple pill-shaped buttons with gold text under it: "Let's go! →"
  and "Score Board". Text sizes scale with the screen.
- **Initials screen:** "Enter your initials" in the shared heading style,
  then three lavender letter boxes side by side, each with a thick purple
  outline and a thinner purple line inside it, and a gold triangle with a
  purple outline above and below. "Game on!" and "Back" pill buttons are
  stacked underneath.
- **Score card:** the score sits in a purple card with rounded corners and
  bold gold text, centred at the top. On question screens the timer sits
  under it, with a clock icon before the seconds; result and "Don't ghost
  the quiz!" screens show the score alone. It's not shown on the start,
  initials, end or leader board screens.
- **Question screen:** the question is in the same bold purple as the start
  heading. The answers are a 2×2 grid of lavender cards with thick purple
  outlines and rounded corners, in the lower part of the scene. A card
  darkens slightly while pressed, like the kiosk's other buttons, and the
  tapped card stays darkened until the result appears.
- **Result screen:** under the score card, a bold purple heading in the
  upper part of the scene, then a "Next up →" pill button styled like
  "Let's go! →". After a right answer the heading is "Nailed it!", the same
  size as the other headings. After a miss it is a larger "Oops!" (or
  "Time's up!") with "Correct answer: …" under it at the normal heading
  size, and the button sits closer underneath.
- **End screen:** "Thank you for playing!" in the shared heading style,
  then "🦬 That's a wrap, Bison!" and "Your score was: N" in smaller bold
  purple, then three purple pill buttons stacked down the middle: "Play
  again?", "Leader Board" and "Exit". The score card is hidden here, since
  the score is shown in the text.
- **Leader board:** a "Leader Board" heading larger and heavier than the
  other headings, then a tall lavender box with a thick purple outline and
  rounded corners, 65% of the scene's width, listing the scores in large
  extra-bold purple text, centred. The top three rows are gold, silver and
  bronze with a purple outline, and a solid purple line runs across the box
  under them. The box scrolls when there are more scores than fit, with no
  visible scrollbar. The
  "Back" pill button sits near the bottom of the scene.

## Tests

- **[engagement.test.ts](engagement.test.ts):** answer shuffling keeps track
  of the right answer, rounds have five different questions from the bank,
  and the scoring formula.
- **[TriviaScene.test.tsx](TriviaScene.test.tsx):** uses a fixed round
  (by mocking `pickRound`) and fake timers to check that:
  - the start screen shows the heading, "Let's go!" and "Score Board" with
    no score;
  - "Let's go!" opens the initials screen at `AAA`; the lower arrows step a
    letter forward and the upper ones back, wrapping around; "Back" returns
    to the start screen;
  - the score is saved under the chosen initials;
  - "Score Board" opens the leader board, and its "Back" returns to the
    start screen;
  - tapping "Game on!" starts a round with the score and timer showing;
  - the timer counts down a second at a time;
  - a tapped answer is highlighted, scored at the tap, and followed by the
    result;
  - the clock is paused while the answer is highlighted;
  - only the first answer tapped counts;
  - a right answer shows "Nailed it!" without the correct answer, a wrong
    one shows "Oops!" with it, and a timeout shows "Time's up!" with it;
  - "Next up" moves to the next question with the clock reset;
  - a result screen shows the score with no timer and doesn't move on by
    itself;
  - a result screen left alone for `RESULT_IDLE_SECONDS`, after an answer
    or a timeout, shows "Don't ghost the quiz!" and resets the kiosk's idle
    clock;
  - "Keep Going" moves to the next question, "I'm outta here!" calls
    `goToMainMenu`, and so does leaving the screen alone for
    `GHOST_SECONDS`;
  - the end screen saves the score once, under `AAA` if the initials
    weren't changed, and the round still ends
    normally if saving fails. Saving is faked here;
  - the end screen shows the thank-you, the score and its three buttons,
    with no score card;
  - "Play again?" returns to the start screen and "Exit" calls
    `goToMainMenu`;
  - "Leader Board" shows "Loading…", then the scores as `TAG - score`,
    with no score card;
  - "Back" returns to the end screen without saving the score again;
  - the leader board lists every score in order, as two lists (the top
    three, then the rest from 4th) when there are more than three, and as
    one list otherwise;
  - the leader board's empty and failed-to-load messages.
- **[scores.test.ts](scores.test.ts):** which tags and scores are valid,
  `shiftLetter()` stepping and wrapping, and how the leaderboard is ranked
  and marked.
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
  Trivia?" with "Let's go! →" and "Score Board", and the score is hidden
  there. Entering initials before a round is new; upstream had no tags.
- Upstream's leaderboard lived in memory, held six scores seeded with
  made-up ones, and was lost when the program closed. Scores are now saved
  to `scores.csv` with a three-letter tag, and the board shows only real
  ones.
- Upstream's end screen showed "Good game!", the score and the leaderboard,
  and a tap anywhere played again. It now has separate "Play again?",
  "Leader Board" and "Exit" buttons, and the leaderboard has its own screen
  behind "Leader Board". Exit returning to the main menu is new; upstream had no way
  back to a menu.
- Each question gets 25 seconds instead of upstream's 15.
- Upstream went straight to the result screen when an answer was tapped.
  Here the answer is highlighted for 0.4 seconds first, with the clock
  paused.
- The answer buttons were checkerboarded purple and gold; they're now
  matching lavender cards.
- The result messages "Correct! The answer is: …", "Wrong! The answer is:
  …" and "Time is UP!" became "Nailed it!", "Oops! / Correct answer: …" and
  "Time's up! / Correct answer: …". A timeout now shows the correct answer
  too. "Tap to Continue" became "Next up →".
- Upstream's result screens moved on to the next question by themselves
  after 40 seconds (15 after a timeout). They now wait for "Next up", and a
  visitor who walks away gets "Don't ghost the quiz!", then the main menu.

## Status

Every screen has been redesigned from the mockups, and the scene is no
longer marked `placeholder: true` in `features/kiosk/registry.ts`.
