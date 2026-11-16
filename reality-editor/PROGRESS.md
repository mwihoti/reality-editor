# Reality Editor — build progress

Browser prototype in `reality-editor/`. **Not an Unreal Engine build** — see `UNREAL_PORT_PLAN.md`.

Run it: `python3 -m http.server 8000` in this folder, then open `http://localhost:8000/`.
Run the tests: `tests/run-tests.sh` (headless Chromium + Node).

---

## Phase 1 — audit and hardening (M0–M2 → solid base)

| Item | Result |
|---|---|
| Reviewed the slice (9 source files + shell page) | Found and fixed the issues below |
| Physics / collision / jump / camera / input | Movement re-derived from one config block; jump cut, coyote time and buffered jump kept; camera clamps + eases; drag input now cancels cleanly |
| Cut / rewind / restore / tape bugs | See fixes below |
| Tuning centralised | `src/config.js` holds physics, camera, rules, mechanism, feel, UI rects |
| Verified on real animation frames | `tests/loop.html` driven over CDP: 300 frames, walked, cut, rewound with the real `requestAnimationFrame` loop |

### Fixes made in Phase 1
- **Clock had no headroom at 0** — a cut made at t=0 could never be rewound past. The scene now starts at `startTime` (30s), so there is always footage behind you.
- **Holding rewind at the head of the tape crept forward** (the clock advanced and rewound on alternate frames). Rewinding at the head now parks the clock.
- **HUD text was invisible over the cream stage floor** — the tape meter and key hints now sit on dark plates.
- **Cut flash whited out the hole** — 0.5 alpha for 0.22s instead of 0.85 for 0.3s.
- **Removed `game.js`/`main.js` coupling**: the game is now `createGame()` (step/draw) with `main.js` owning only timing, so the exact gameplay path can be stepped deterministically by tests.
- **Touch mode could hijack mouse clicks** — pointer handling distinguishes on-screen buttons from stage drags, and a drag that never moves becomes a UI click.

## Phase 2 — M3: three puzzles

1. **The impossible wall** (860–1160, 4 crates high): too tall to jump, blocks the corridor. Drag a rectangle over it — all twelve crates are stamped with one cut, a chime and shake fire, `PATH OPEN` toast, a lamp lights. Tests confirm the wall stops the player at x=816 and the corridor opens after the cut.
2. **The moving dolly**: a 500px gap the player cannot jump (measured: 234px max jump). The dolly has already run to the far side; rewinding walks it back to the ledge at 75px/s, the player boards it and rides across. Tests confirm the gap is uncrossable without it and that riding carries the player 216px to the far stage.
3. **The final edit**: a load hangs from a rail driven by a cuttable wheel. It starts parked at the end stop, so the sensor only lights when you **rewind** the load onto it — and it drifts away again as soon as time runs forward. **Cutting the drive wheel** freezes the line with the load on the sensor, which opens the exit shutter. Cutting the wheel first freezes it in the wrong place (recoverable by rewinding past the cut — the blade is refunded).

## Phase 3 — game experience

- Title screen with Start (click or Space), subtitle, verb summary.
- Contextual tutorial: move → drag-to-cut → rewind → the final-edit rule, each hint disappearing as the action is performed.
- Smooth camera: eased follow with velocity lookahead, clamp to the room, 0.94 zoom while rewinding, 1.04 on the win card.
- Puzzle feedback: cut flash + dashed hole frame, chime/shake per scene cleared, `PATH OPEN`, sensor + shutter animation, toasts.
- Pause (Esc/P or the PAUSE button) with Resume / Restart; Backspace restarts the room at any time; checkpoint respawn on falls.
- Victory card with run time, blades and tape left; Play Again restarts.
- Audio: synthesised cut, jump, land, clunk, door, chime, win and rewind whirr (no assets).
- Touch controls: left/right/jump/rewind buttons on coarse pointers, drag-to-cut anywhere else.
- Performance: fixed 120Hz simulation with up to 8 steps per frame, one draw per frame, DPR capped at 2, gradients only for the backdrop/shadow.

## Phase 4 — tests

`tests/run-tests.sh` runs both layers. Latest run:

```
== deterministic suite (tests.html) ==
ok   TESTS PASS 78/78
== real animation-frame loop (loop.html) ==
     frames=183 state=playing moved=true cut=true rewinding=true x=250.9 time=18.27 tape=22.58 blades=4
ok   the game runs on real requestAnimationFrame frames
RESULT: PASS
```

The real-loop check runs the actual `main.js` animation loop in headless Chromium over CDP (no manual stepping), holds real keys, cuts, and rewinds.

The 78 assertions cover: boot/start, walk, jump, landing, drag-cut pruning, cut eligibility by prop anchor, blade spend/refund/exhaustion, rewind rate (1.6x +-0.06 measured 1.58), tape spend and floor, restore-on-rewind, re-apply-on-play, pure prop motion, moving props ghosting while rewinding, player not rewound, all three puzzles end to end, shutter/sensor state, win state, pause freeze, restart, start button, and fall respawn.

Screenshots: `shot-title.png`, `shot-wall.png`, `shot-gap.png`, `shot-final.png`, `shot-won.png`, `shot-pause.png`, `shot-touch.png` (produced from `tests/stage.html`, which sets up each state and draws it).

Recording: `gameplay.webm` (VP9, 1280x577, ~36s) — a bot (`tests/demo.html`) plays the real game: the title, the wall cut, rewinding the dolly back and riding it, then rewinding the load onto the sensor and cutting the drive wheel, ending as the exit shutter lifts. It does **not** capture the final walk through the door; the win card is in `shot-won.png` and in the test suite.

## Gap fixes from playtesting (scene 2)

A player reported being unable to cross the gap. Three separate faults, all fixed:

1. **The dolly vanished from collision while you scrubbed.** Moving props are ghosts during a
   rewind, so the platform under your feet stopped being solid the moment you held R, and you
   fell through it. The prop you are standing on now stays solid (`solids(groundedOn)`), and the
   carry runs backwards too, so riding the dolly back while rewinding works.
2. **A deep rewind stranded the dolly at the ledge, motionless.** The dolly is parked at the
   ledge for every clock time before its take, so boarding it after a long rewind left you
   standing on a platform that would not move for seconds. Boarding a parked dolly now starts
   its run from that moment (`world.dollyBoard`).
3. **Falling in the gap cost 320px of walking.** There is now a checkpoint on the near ledge
   (x=1560), so a fall puts you back at the gap in under a second.

A riding hint (`STAND STILL — IT CARRIES YOU`) appears while you stand on the dolly. Walking
forward off its front edge mid-ride is still a fall — the checkpoint makes it cheap, and the
hint tells you not to.

## Dead-end fixed: tape can be refilled (scene 3)

A second playtest screenshot showed a run that could not be finished: the drive
wheel had been cut while the load was **off** the sensor, so the line was frozen
in the wrong place, and the tape was at 0.0 — with no way to rewind past the cut
and undo it. The only escape was Backspace, which throws away scenes 1 and 2.

- Tape now recovers at **0.4 s per second of forward play** (`rules.tapeRefill`), so
a spent tape is a delay, not a dead run. It is still a hard budget *in the moment*:
while you hold R nothing refills.
- The HUD says `TAPE SPENT — LET THE TAKE RUN TO REFILL` instead of pointing at a reset.
- When the drive wheel is cut and the sensor is not loaded, the hint says so:
`THE LINE IS FROZEN OFF THE SENSOR` — *rewind past the cut* (or wait for tape).

## The shoot list and the save file

- **Nine scenes.** The studio plus eight, over forest / city / town / beach backdrops
(`src/themes.js`, painted per location, still no image assets). Clearing a scene shows
`SCENE CLEARED — n in the can · m to go` and loads the next; the ninth ends on the wrap card.
- **Tape only refills once fully spent** (`world.rescue` latch), so the budget still bites.
- **Progress is saved** to `localStorage` under `reality-editor.v1`: `unlocked` (furthest
scene index), `cleared`, `best` (fastest full run) and `finished`. The title screen shows
`CONTINUE · SCENE 0N` once anything is unlocked, and the wrap screen shows `BEST RUN`.
- Every save read is validated and stored in a try/catch, so private mode, a strict itch
iframe, corrupt JSON or a hand-edited entry all degrade to a blank save instead of a crash.

## The eight new contraptions (redesign)

Scenes 2–8 originally restaged the studio: a crate wall, a dolly ride, a hoist. They are now
distinct objects with distinct verbs, and nothing after scene 1 repeats a studio beat.

- **The hoist demands the edit.** `exitOpen()` is now `sensorLoaded() && !driveRunning()`:
parking the load on the sensor is not enough, the wheel has to be cut to freeze it. Tests
assert both halves (parked alone → shut; parked + cut → open).
- **Gate** (`kind: 'gate'`, scene 2/6/7/9): a bar hanging in a doorway. New `cycle` motion
type — parked for `hold` of each period, then one smooth trip and back. A plain sine only
touches its extreme for a frame, which made the pass impossible to time; the dwell is what
makes it walkable.
- **Lift** (`kind: 'lift'`, scene 3/6/8/9): a platform on a vertical `cycle`. It has to hang
over a *hole in the floor*, otherwise the player just walks past it and never rides. Its top
sits 6px above the ledge — level with it, the rider's feet catch the ledge's side and the
ride never lands.
- **Pressure plate + relay door** (`kind: 'plate'` / `'relay'`, scene 4/7/9): `plateHeld()` is
true only while the dolly overlaps the pad, and the relay shutter is solid until then. The
dolly crossed the pad before the take starts, so the player rewinds it back on and dashes
through the door while it holds.
- The dolly now appears only as dead weight on a plate (aside from the studio's ride), and
crates only in the studio.

Bot results after the redesign (all through the real input path):

```
01 THE STUDIO   18.3s   02 THE CLEARING 26.7s   03 THE STREAM  17.9s
04 SCAFFOLD     10.7s   05 THE HOIST    11.2s   06 CROSSING    17.9s
07 THE ALLEY    13.7s   08 THE TIDE     32.2s   09 LAST TAKE   88.8s (won)
```

118 assertions plus the bot, all passing.

## Tuning pass: the finale's window and a gate that never gated

**The finale burned its whole tape.** LAST TAKE took the bot 88.8s and left tape at 0.0.
Two causes, both measured before touching anything:

- At the lip of the lift hole the bot's "no floor ahead → rewind for the dolly" branch
fired. In THE TIDE there is no dolly so it just waited; in the finale a dolly exists but is
dead weight 900px back on a pad, so the bot rewound the entire tape looking for a ride that
was never coming. The branch now only reaches for the dolly when there is no lift nearby.
- The pad window was 4s of clock (dolly at 90px/s across a 360px pad). Loosened to 6s by
slowing the dolly to 60: the door is now the most generous in the game, which is right for
the scene that stacks three objects. 88.8s/0.0 tape → **25.8s/24.2 tape**.

**Scene 2's gate never gated.** With phase 0.5 the bar's low window was world 30.3–32.8s,
while the player cannot reach x=1180 before ~33s. Measured: the walk cleared in 5.9s with the
bar above head height the whole way, and the rewind the hint advertises did nothing but cost
tape. Phase is now 0.24, so the bar is down when you arrive (blocked on arrival, ~1.9s pinned
if you wait) and a rewind into the dwell crosses in 3.9s versus 5.2s on foot. The scene is
always solvable by waiting, and the rewind is now the fast answer rather than a no-op.

The gate test learns the phase instead of assuming it: it derives the bar's lowest point from
the motion, checks the player is stopped while the bar is down, then checks the dwell actually
lets them through. That pair is what would have caught the decorative gate in the first place.

## Finale gate tuning, and how the obstacles actually time out

A timeline probe of LAST TAKE through the bot's own policy showed **12 seconds pinned at
the gate** (x=1656, t=8.5→20.5) with the bar's bottom hovering at 733 against a 726 head.
Two causes, only one of them the scene's:

- The bot rewound *into* the same blocked frames, walked forward, and repeated — 4 tape
spent without moving an inch. Gates now wait: the bar lifts on its own every cycle, so
standing is the reliable answer and scrubbing at a gate is now pointless.
- The finale's gate was `period 7, hold 0.42, phase 0.65`: a 2.4s block landing right where
the pad dash ends. Now `period 5, hold 0.55, phase 0.45` — down as you arrive, lifting
within about a second, blocked for only 1.3s of every 5.

Scene 9 went **38.7s → 21.0s** (tape 22.0 → 26.1); scene 2 went 28.7s → 8.0s because the
spin was most of its time.

### Hand-play at real speed (foreground tab, 60.4fps, inputs through the real loop)

| obstacle | measured |
| --- | --- |
| pad door, SCAFFOLD | 2.02s of R when started 260px out; ~0.7s from the door itself; 0.5s dash. Scene cleared in 5.97s |
| gate, THE CLEARING | 1.92s standing at the bar, then straight through. Scene cleared in 7.96s |
| lift, THE STREAM | 1.07s wait for it to descend, 2.25s ride, then step off. Scene cleared in 12.71s |

## The gate that would not open

Reported as "the gate does not open". Measured in the running page with real key events: in
SCAFFOLD, standing at the relay door and holding R for two full seconds left it shut. The pad
dolly only got back on the pad at world 24 — 6.2 world-seconds behind the player's arrival at
30.2, i.e. ~3.9s of holding — and the instant it opened was the window's *closing* edge, so
letting go when the door opened shut it again on the same frame. Two changes:

- The pad dolly rolls at 40 instead of 90 (all three pad scenes). It now leaves the pad at world
29, about a second in front of the player, so a 0.72s hold puts it back: door opens in every pad
scene for 0.7 tape instead of 3.9.
- The relay door is hydraulic: it holds open for `CONFIG.mechanism.relayGrace` (3s) of forward
time after the weight leaves the pad. Stopping the rewind the instant the door opens now leaves
runway to run instead of zero frames.

Measured after: shut on arrival in all three pad scenes, opens after 0.72s of R, crossed 0.60s
later with the door never shutting mid-dash. Tests pin the latch (shut before the pad, open on
weight, still open a second after it leaves, shut after four).

Scene 2's gate was checked the same way and is not the culprit: in the live page the bar drops to
the floor on arrival and rises clear after ~0.8s of R, and the player walks through.

## The crash that stopped cuts working, and the bot that now guards it

- `game.js` read `level.drive.id` on every successful cut. Only the studio and the hoist
scenes have a drive wheel, so the first cut in any other scene threw, which killed the
`requestAnimationFrame` loop — the game froze with the drag rectangle still on screen and no
cut applied. Fixed by guarding the field (`level.drive && ...`).
- The 404 in the console was the browser's automatic `/favicon.ico` request; `index.html` now
does not request one (inline data-URI icon).
- `tests/bot.html` is a play bot: it drives each scene with the real input path (key set for
walking/rewinding, `input.releasedRect` for drag-cuts) and only passes when the game reports
`cleared`/`won`. Because a throw inside `step()` aborts the page, it is also a regression
test for exactly the crash above. All nine scenes clear, the last one ends `won`.
- Bot policy, for the record: stand on the dolly until it reaches the far side; cut crates
only when actually blocked (a cut every frame burned all four blades); hop only at a dolly
parked within ~170px (a standing hop covers ~230px, so hopping at a dolly across the whole
gap lands in it); probe a short span ahead and probe the dolly's real bounds, because a
moving prop is a collision ghost while you rewind.
- New assertions: pressing CONTINUE with a real pointer event starts the saved scene; the run
timer counts up, resets to zero on a new run and climbs again; a save from a build with more
scenes is clamped so CONTINUE names the last real scene, and pressing it starts that scene.

## Tuning findings from playing it through

- **Tape was too short.** The intended route costs roughly 6s of tape rewinding the dolly and 7s parking the load, and the bot run with a 20s budget ran dry inside scene 3. `maxTape` is now **30**, which keeps the pressure without making the last puzzle unaffordable.
- **Cutting during a rewind is rejected** (`commitCut` returns `reason: 'rewinding'`), so the wheel has to be cut right after letting go of R — that is the intended beat, but it is worth a clearer HUD nudge if playtests show people missing it.
- **The sensor lied about the load.** `sensorHalfWindow` is 80, but the sensor pad was drawn only 84 wide (±42), so “SENSOR: LOADED” lit — and `exitOpen()` could be satisfied — while the crate visibly hung beside the pad, overlapping it by as little as 4px in the world units of the playthrough video.

  The first attempt narrowed the window to 42 to match the pad, which broke the scene in the opposite direction: the load travels at 45 units/s, so from the pad centre it left a ±42 zone in **0.93s**, less than a mouse drag takes, and a human could never land the wheel cut — “the load passes the sensor and the gate does not open”.

  The fix is to widen the pad **visual** to 160 (the trigger zone’s real width) rather than shrink the zone: `sensorHalfWindow` stays 80, the pad is drawn 160 wide in `levels.js` / `level.js`, and the chevrons in `render.js` fill it. LOADED now lights exactly when the crate is over the pad, and the cut has ~1.8s of slack from centre. Suite 123/123, bot 9/9.

## Known limits / blockers

- **Not an Unreal build.** The jam requires Unreal Engine 5.9 or UEFN; this is a browser prototype plus a port plan.
- Audio was not listened to — it is synthesised and was only verified not to throw. Levels need a human ear.
- Touch layout is drawn and wired but was not exercised on a real touch device.
- The win state is reachable only through the intended puzzle order (the corridor is gated); if a player exhausts all tape in scene 3 they restart with Backspace, which is always available.
- The sensor window is ±80 world units and the pad is drawn to match, but the load leaves it as soon as the clock runs forward (1.8s from centre), so the cut has to land while the load is parked over the pad.
- Save data is per browser and per origin. Local progress under `localhost:8124` does not
carry over to the itch embed, which runs on a different origin.
- The save has no in-game reset button yet; clearing site data is the only wipe.

## Next steps

1. Play all nine scenes by hand and tune tape/blade numbers (config only).
2. Playtest scenes 3–9 by hand at real speed and tune their gaps and tape costs.
3. Start the Unreal port from `UNREAL_PORT_PLAN.md`.
