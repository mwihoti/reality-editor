# Reality Editor — hackathon submission pack

Everything below is copy-paste ready for a Devpost-style form. Facts are current as of
build **v0.1.2**; every claim in here was verified by running the game and its tests.

| | |
|---|---|
| **Project** | Reality Editor |
| **Play** | https://mwihoti.itch.io/reality-editor |
| **Code** | https://github.com/mwihoti/reality-editor |
| **Theme** | DIRECTOR'S CUT |
| **Platform** | Browser (desktop + touch), no install |
| **Session** | 5–15 minutes for all nine scenes |

---

## ⚠️ Read this before you submit

**Check the hackathon's engine rules.** This is a browser prototype — Canvas 2D, ES
modules, no engine. It is *not* an Unreal Engine or UEFN build. If the hackathon requires
Unreal/UEFN deliverables, this build cannot be entered as-is; the port plan is in
[`reality-editor/UNREAL_PORT_PLAN.md`](reality-editor/UNREAL_PORT_PLAN.md) and it is
written to be cheap (driven actors + one clock, no physics).

Two other things only you can do:

- **AI disclosure.** Answer the form honestly: code, visuals and audio were produced with
  an AI coding agent, with no third-party IP, no external assets, no licensed art or sound.
- **License.** The repo has no `LICENSE` file. Many hackathons require an OSI license.
  Pick one (MIT/Apache-2.0 are the usual choices) — that is your call, so I have not added one.

---

## Tagline (one line, 60 chars)

> You are not the actor. You are the editor.

## Elevator pitch (one paragraph)

Reality Editor is a side-view puzzle platformer where the room is footage. You cannot fight
the level — you **cut** pieces of the set out with a razor and **rewind** the recording to
put moving props where you need them. Your character stands outside the tape: the world
rewinds, you don't. Nine short scenes, each with one new contraption, built in Canvas 2D
with zero dependencies and no art or audio files.

## Inspiration

Time-manipulation games usually let you undo your own mistakes. That is a safety net, not a
mechanic. The DIRECTOR'S CUT theme suggested the opposite framing: what if you were the
person *editing* the scene rather than living in it? Then "rewind" is not a checkpoint — it
is a scrub wheel, and the world is raw material. Once the room is a recording, two verbs do
all the work: delete a thing (a cut), and move time (a scrub).

## What it does

Nine scenes, each teaching one contraption:

| # | Scene | The idea |
|---|---|---|
| 1 | THE STUDIO | three beats: cut the crate wall, ride the dolly across a gap, park the load and cut the drive wheel |
| 2 | THE CLEARING | **gate** — a bar drops across the walk; rewind until it lifts |
| 3 | THE STREAM | **lift** — it hangs in a hole in the floor; drop it, ride it to a high door |
| 4 | SCAFFOLD | **pressure plate** — the door only holds while weight sits on it |
| 5 | THE HOIST | **load line** — parked is not enough, the wheel has to be cut too |
| 6 | CROSSING | gate, then lift |
| 7 | THE ALLEY | pad, then gate |
| 8 | THE TIDE | lift up to the hoist deck |
| 9 | LAST TAKE | pad, gate, lift |

Four rules, taught in-fiction once and never repeated:

1. **The room is a recording.** Every prop's position is a pure function of one clock.
2. **You are off-tape.** The player and camera never rewind.
3. **A cut is an edit with a timestamp.** Scrub back past it and the prop comes back.
4. **Tape and blades are finite.** Four cuts, thirty seconds of tape. Bad edits cost time,
   not the run — a fully spent tape refills so you can never soft-lock.

The signature puzzle is scene 5: rewind the load onto the sensor, then **cut the drive
wheel** to freeze it there. Time first, blade second.

## How we built it

No engine, no framework, no build step: a static folder of ES modules served over HTTP.

- **One clock.** `world.time` is the footage time. Every moving prop exposes `stateAt(t)` —
  a pure function, not an integration. Rewinding therefore reproduces forward play exactly,
  by construction rather than by correction.
- **Cuts are data.** `cuts = [{t, rect, ids}]`. A prop is alive iff no cut at or before the
  current time names it. Rewinding past a cut un-cuts it for free — no undo stack, no
  save-states.
- **Mechanisms are compositions of that rule.** The drive wheel is itself a cuttable prop,
  so the hoist resolves as `lineTime = min(time, earliestCutOfWheel)`. Cut first and the
  load freezes in the wrong place; cut after parking and it holds the sensor.
- **Deterministic loop.** Fixed 1/120 s simulation behind `requestAnimationFrame`, so the
  exact gameplay path can be stepped by tests without a browser.
- **Everything is drawn and synthesised.** Backdrops are painted per location in
  `themes.js` (canvas gradients and shapes); every sound is a WebAudio oscillator envelope.
  The shipped zip is 29 KiB.
- **Progress** saves to `localStorage`, validated on every read, degrading to a blank save
  in private mode or a sandboxed iframe.

## Challenges and how they were solved

The interesting bugs were all "the picture and the rule disagreed". Every one was found by
playing, then measured in the running page with real input events — not guessed at.

**A gate that was decorative.** Scene 2's bar was phased so its whole low window passed
before the player could physically arrive. The scene "worked" — you just walked through
while the hint told you to rewind. Fixing it meant learning the phase from the motion in
the test, so a gate that never gates now fails the suite.

**A door that shut on the frame it opened.** The pressure-plate dolly left the pad 6.2
world-seconds before the player arrived, so the door opened exactly on the closing edge of
the rewind window and shut again the instant you let go. Fixed twice over: the dolly now
leaves the pad about a second ahead of you, and relay doors are hydraulic — they hold for
three seconds of forward time after the weight leaves.

**A sensor that lied.** The hoist's "SENSOR: LOADED" readout lit while the crate visibly
hung *beside* the pad: the trigger window was ±80 but the pad was drawn 84 wide. The first
fix narrowed the window to match the pad — and made the scene unwinnable, because the load
then crossed the trigger zone in 0.93 s, less than a mouse drag takes, so a human could
never land the cut. The real fix was to widen the *pad* to the trigger zone's true width:
readable and honest, still 1.8 s of slack.

**A dead-end run.** A player cut the wheel with the load off the sensor, then ran out of
tape — the line was frozen in the wrong place with no way to rewind past the cut. Tape now
refills once fully spent, and the hint says what to do instead of pointing at a reset.

## Accomplishments

- A complete nine-scene game in **2,759 lines** of dependency-free JavaScript, shipping as
  a **29 KiB** zip with no image or audio assets.
- **123 assertions**, a real-`requestAnimationFrame` loop check in headless Chromium, and a
  **play bot that clears all nine scenes** through the real input path — walking, rewinding
  and drag-cutting exactly as a player would. The bot is also a crash regression test,
  because a throw inside `step()` aborts the run.
- Published and live: https://mwihoti.itch.io/reality-editor

## What we learned

- Purity pays. Making every prop a function of one clock deleted an entire class of rewind
  desync bugs before they could exist, and made the whole game testable without a browser
  renderer.
- Playtesting beats intuition. Every gate, door and sensor adjustment in the build log
  came from a measured playthrough with timings, not from tuning by feel. Three "working"
  obstacles were decoration until measured.
- Difficulty lives in the *window*, not the puzzle. The same hoist is unplayable at ±42 and
  comfortable at ±80 — with identical rules.

## What's next

- A UE 5.9 rebuild from `UNREAL_PORT_PLAN.md`: one `RealityClockSubsystem`, props as driven
  actors implementing `StateAt(Time)`, cuts as an edit log toggling hidden/collision rather
  than destroying actors.
- Copy/paste of a cut region — cutting a prop and stamping it elsewhere ("pick-up shot").
- An angle cut that makes a ramp instead of deleting geometry.

## Built with

`JavaScript` · `Canvas 2D` · `WebAudio` · `ES modules` (zero runtime dependencies) ·
`Python http.server` (serving) · `headless Chromium + Node` (tests) · `butler` (itch.io)

## Try it

```bash
git clone https://github.com/mwihoti/reality-editor
cd reality-editor
python3 -m http.server 8000
# open http://localhost:8000/
```

It must be served over HTTP (ES modules), not opened from the filesystem.

**Controls:** `A`/`D` move · `Space` jump · **hold LMB and drag a box** to cut ·
**hold `R`** to rewind · `Esc` pause · `Backspace` restart the room. Click the canvas once
so it has keyboard focus. On touch, on-screen buttons appear and dragging anywhere else cuts.

## Honest limitations

- **Not an Unreal build** — see the warning at the top.
- Audio is synthesised and was verified not to throw, but was not tuned by ear.
- Touch controls are drawn and wired but were not exercised on a real touch device.
- Progress does not carry between the local build and the itch embed (different origins).
- Scene difficulty was validated by a bot and by instrumented play, not by a broad
  human playtest cohort.
