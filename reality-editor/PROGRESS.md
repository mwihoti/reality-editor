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

## Tuning findings from playing it through

- **Tape was too short.** The intended route costs roughly 6s of tape rewinding the dolly and 7s parking the load, and the bot run with a 20s budget ran dry inside scene 3. `maxTape` is now **30**, which keeps the pressure without making the last puzzle unaffordable.
- **Cutting during a rewind is rejected** (`commitCut` returns `reason: 'rewinding'`), so the wheel has to be cut right after letting go of R — that is the intended beat, but it is worth a clearer HUD nudge if playtests show people missing it.

## Known limits / blockers

- **Not an Unreal build.** The jam requires Unreal Engine 5.9 or UEFN; this is a browser prototype plus a port plan.
- Audio was not listened to — it is synthesised and was only verified not to throw. Levels need a human ear.
- Touch layout is drawn and wired but was not exercised on a real touch device.
- The win state is reachable only through the intended puzzle order (the corridor is gated); if a player exhausts all tape in scene 3 they restart with Backspace, which is always available.
- The sensor window in scene 3 is generous (80px), but the load leaves it again as soon as the clock runs forward, so the cut has to land while the load is parked over the pad.

## Next steps

1. Play the three scenes by hand and tune tape/blade numbers (config only).
2. Add a second room if the mechanics hold up.
3. Start the Unreal port from `UNREAL_PORT_PLAN.md`.
