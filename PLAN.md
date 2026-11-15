# Reality Editor — MVP build plan

> **Status:** M0–M3 built in `reality-editor/`: walk/jump, CUT with drag rectangle and cut log, REWIND with tape budget, all three puzzles, title/tutorial/pause/win screens, touch controls, and a 72-assertion regression suite (`reality-editor/tests/run-tests.sh`). See `reality-editor/PROGRESS.md` for evidence and `reality-editor/UNREAL_PORT_PLAN.md` for the Unreal 5.9 port. The browser build is **not** an Unreal submission.

**Theme fit (DIRECTOR'S CUT):** you are not the actor, you are the editor. The room is footage. You have a timecode, a razor blade, and a scrub wheel.

**One-line pitch:** a side-view puzzle platformer where you delete pieces of the set with a razor and rewind the footage to put moving props where you need them — while you yourself stand outside the tape, unaffected.

**Assumption for this plan:** a browser prototype (Canvas 2D, ES modules, zero dependencies, runs from `python3 -m http.server`). It is playable today on this machine, and doubles as the design proof to port to Unreal/UEFN if the jam build is real. Port note at the end.

---

## 1. The three verbs and the world's rules

| Verb | Input | Effect |
|---|---|---|
| **CUT** | hold LMB, drag a rectangle, release | Every prop whose anchor point is inside the rectangle is deleted, stamped with `cutAt = worldTime` |
| **REWIND** | hold `R` | `worldTime` runs backwards at 1.6× for as long as tape remains |
| **WALK / JUMP** | `A`/`D` or `←`/`→`, `Space` | Player physics, always forward, never rewound |

Four rules, stated in-fiction once and never again:

1. **The room is a recording.** Every prop's position is a pure function of `worldTime`.
2. **You are off-tape.** The player's body and the camera are not affected by rewinding.
3. **A cut is an edit with a timestamp.** Scrub the clock back past a cut and the prop comes back — that is the whole game.
4. **Tape and blades are finite.** You start with **4 cuts** and **20 seconds of tape**. Neither regenerates; `Backspace` resets the whole room for free.

### Why rewind also restores (a scope decision)
The concept lists "restore objects that were deleted" as a third verb. It falls out of rule 3 for free: rewinding past a cut un-cuts it. That deletes a whole mechanic from the MVP while making the two remaining buttons deeper. Keep `RESTORE` as a stretch goal only if a puzzle genuinely needs a cut that survives time travel.

---

## 2. MVP scope

**In:** one continuous room, three puzzle beats, CUT, REWIND, walk/jump, cut economy, tape economy, free room reset, win card.

**Out (explicitly):** multiple rooms, save/load, menus, cutscene, voice, NPCs, combat, secrets, mobile touch, localization, netcode, level editor, scoring/ranking. No art assets — everything is drawn in code in the existing poster style (thick ink outlines, cream ground, coral/navy props).

---

## 3. The room and the three puzzles

One continuous studio set, 4200 × 1080 world units, floor at y = 820. Left to right:

```
  x=120       900        1500            2300            3200       3900
   |           |           |               |               |          |
   ### start ###
              [A]  corridor blocked by a prop wall (3 stacked crates)
                    [B]  8 m gap, one camera-dolly platform shuttling across
                                  [C]  belt + counterweight + pressure plate
                                                   [EXIT] shutter door
   ▁▁▁▁▁▁▁▁▁  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
```

### A — "Cut" (teaches CUT, costs 1 cut, 0 tape)
A wall of three crates fills the corridor. Hovering shows a dashed rectangle; dragging across all three and releasing deletes them with a film-burn flash. The dashed frame of the hole stays visible for two seconds — the signature image of the game.

Teaches: cutting deletes things; the hole is where a thing used to be.

### B — "Take two" (teaches REWIND, costs 0 cuts, ~5 s tape)
A gap with a single dolly platform (`period 7 s`, sine-eased between x=1520 and x=2060). The player arrives when the dolly is at the far end and drifting further. Hold `R`: the dolly runs backwards, props turn semi-transparent and stop colliding, the timecode counts down, the player can still walk to the edge. Release when the dolly is at your feet; it goes solid under you.

Teaches: the clock is a control, the world is not fixed, and you don't move when it does.

### C — "The final cut" (requires both, costs 1 cut, ~12 s tape)
The exit shutter is powered by a pressure plate. A **counterweight** rides a **conveyor** that has been running since t=0, so by the time you arrive the weight is far from the plate. The conveyor's drive wheel is a cuttable prop.

- Wrong order: cut the wheel first → the belt freezes where it is, weight stranded → you're out a cut and the door never opens.
- Right order: **rewind** until the weight is over the plate, **then cut the drive wheel** — the belt stops with the weight on the plate, the shutter opens, you walk out.

The aha is the ordering: time first, blade second. That is the whole pitch in one puzzle.

### Failure and recovery
No death. Falling into the gap respawns you at the last ledge (costs nothing but time — which the conveyor notices). Running out of tape or blades with a puzzle unsolvable is recoverable only with `Backspace` (instant, free, keeps a death/try counter). Ship the reset; puzzle prototypes die of tedium, not difficulty.

---

## 4. Technical design

Single-page, no build step, no dependencies.

```
index.html          canvas, HUD markup, module entry
src/main.js         boot, fixed-timestep loop, game state machine
src/input.js        keyboard + pointer normalisation, drag-rect mode
src/world.js        props, motion functions, cut log, alive() queries
src/player.js       AABB physics, coyote time, depenetration
src/render.js       canvas painting, camera, parallax, HUD, post-FX
src/level.js        the room as data
src/audio.js        WebAudio synth (no assets)
```

### The time model (the only part that must be right)
- `worldTime` — seconds of footage. Advances at 1× while playing; decreases at 1.6× while rewinding, floored at 0.
- Every moving prop exposes `stateAt(t)`, a **pure function** of footage time. No integration, no per-frame deltas: rewinding must reproduce exactly what playing forward produces.
- `cuts = [{ t, rect, ids }]`. A prop is alive iff no cut with `t <= worldTime` includes it. Scrub back and `alive` flips true again, automatically.
- Props with internal state (the conveyor) resolve as: `belt(t) = f(min(t, earliestSurvivingCutT))`. Cut once, then rewind past the cut, and the belt resumes — correct by construction, no special cases.

### Loop
`requestAnimationFrame` → clamped `dt` → fixed 1/120 s physics accumulator. Player integrates; world props are *evaluated*, not integrated. Camera follows with a deadzone and clamps to room bounds; zooms to 0.94 while rewinding.

### Cut interaction
Pointer drag in screen space → rectangle converted to world space → dashed outline preview, plus a live "will cut: N" counter. On release: if `N > 0` and `cutsLeft > 0`, commit. Anchors (prop centres) decide inclusion, so a partial rectangle either takes the whole prop or nothing — honest and predictable. `Esc` cancels. Cutting is disabled while rewinding.

### Collision
Player is an AABB with sweep-and-slide against static props and (when playing forward) moving props. During rewind, moving props are ghosts (no collision, 40% alpha) so the footage can't drag or crush you. On respawn or on a prop becoming solid inside the player, push out along the shortest axis.

### HUD
`CUTS 3/4` · `TAPE 00:12.4` · `TC 00:00:41:07` timecode counting up and down · a scene slate that reads `SCENE A — CUT`. When tape hits zero the rewind button greys out with a tape-reel spin-down, so the failure is legible before it's fatal.

### Feel (cheap, high value)
Film-burn flash and 250 ms frame-ghost on cut; VHS scanlines + horizontal displacement + reverse-whirr audio while rewinding; dust particles on land; a clapperboard wipe between scenes; a "THAT'S A WRAP" end card with your final cut/tape usage.

---

## 5. Milestones (≈ 4 h 30 m of focused work)

| # | Milestone | Time | Done when |
|---|---|---|---|
| M0 | Scaffold: canvas, letterbox, camera, fixed loop, walk/jump, floor collision, `Backspace` reset | 30 m | You can run and jump in an empty room, and reset it |
| M1 | Props + CUT: static crates, hover/drag rectangle, cut log, `alive()`, timecode HUD | 45 m | Cut the crates, they stay gone; the counter decrements |
| M2 | REWIND: clock scrub, motion reversal, ghosting, tape budget | 45 m | A moving platform visibly reverses and lands exactly where forward play would put it |
| M3 | Level A/B/C geometry and the belt puzzle wiring | 60 m | All three puzzles solvable in the intended order; wrong order in C fails visibly |
| M4 | Art pass in the poster style + cut-hole ghosts + rewind FX + WebAudio | 45 m | The three verbs feel different at a glance, with sound off |
| M5 | Tuning: economy numbers, gap widths, dolly period, tape cost per puzzle; one fresh-player test | 45 m | A first-time player finishes all three puzzles in under 8 minutes without prompting |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Rewind desyncs from forward play | Props are pure functions of `worldTime`; player is the only integrator; a debug key prints `worldTime` and every prop's resolved state |
| Player trapped inside a re-materialised prop | Depenetration push-out + free reset |
| Cut-economy soft lock in C | Keep 2 spare cuts of slack over the intended solution; show remaining counts at all times |
| The C ordering puzzle is unreadable | Make the belt *visibly* run and the weight *visibly* ride it; the drive wheel spins; add a "BELT: RUNNING/STOPPED" readout on the plate console |
| Scope creep into RESTORE / multi-room | Both are stretch only; the rewind-un-cuts rule already answers "restore" |

## 7. Stretch (only after M5)

1. `RESTORE` as a verb that survives rewind (permanent deletion) — needs a puzzle that punishes reversible cuts.
2. Second room: a cut that makes a ramp, i.e. cutting at an angle changes geometry rather than deleting it.
3. Copy/paste of a cut region ("pick-up shot") — you move a prop by cutting it and stamping it elsewhere.
4. Auto dev-log: dump every cut rect, timestamp, rewind span and solve time to JSON — free material for the Glass Box dev log.
5. Timecode-scored medal: time under tape.

## 8. Port note (if this becomes the jam build)

Unreal can't be built on this machine, so this prototype is the design/gameplay proof. In UE the mapping is direct: props become actors driven by a single `WorldClock` actor (`SetActorLocation` from a pure timeline function, not physics); the cut is a rectangle trace/decals with `DestroyComponent` on hit actors; rewind is `WorldClock` going negative — no physics rewind, no save states, which is exactly why the design is cheap to port. UEFN can do the same with Verse-driven prop translation and a private version code, minus the 2D camera.
