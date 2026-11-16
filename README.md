# Reality Editor

A nine-scene browser puzzle platformer about editing the room around you: cut pieces of
the set out of the footage, rewind the footage to move what's left, and reach the
director's exit.

Built for the **DIRECTOR'S CUT** theme. Canvas 2D, ES modules, no engine, no libraries, no
image assets — every sound is synthesised in code.

> This is a browser prototype, not an Unreal Engine or UEFN build. The port plan for a UE
> 5.9 version lives in [`reality-editor/UNREAL_PORT_PLAN.md`](reality-editor/UNREAL_PORT_PLAN.md).

## Play

```bash
cd reality-editor
python3 -m http.server 8000
# open http://localhost:8000/
```

It needs to be served over HTTP (it uses ES modules), not opened from the filesystem.

## Controls

| Action | Input |
|---|---|
| Move | `A` / `D` or `←` / `→` |
| Jump | `Space` |
| **Cut** | Hold the left mouse button, drag a box, release |
| **Rewind** | Hold `R` (or `Shift`) |
| Pause | `Esc` or `P` |
| Restart the room | `Backspace` |

On touch screens the move, jump and rewind buttons appear on screen; drag anywhere else to
cut. Falling respawns you at the last checkpoint — it does not reset your cuts or your tape.

## Progress

The game saves to the browser's `localStorage` (`reality-editor.v1`): the furthest scene
you unlocked, which scenes you have cleared, whether you finished, and your best full-run
time. The title screen grows a **CONTINUE · SCENE 0N** button once something is unlocked, and
the wrap screen shows your best run.

Storage is optional, never required: a blocked or full storage backend (private mode, a
strict iframe embed) means the game simply doesn't persist. Every read is validated, so a
corrupt or hand-edited entry falls back to a blank save. Clearing your browser's site data
wipes it; there is no other copy.

## The nine scenes

Every scene hands you a full tape and four blades. Cutting spends a blade; rewinding
spends tape. The tape only comes back once you have spent all of it, so a bad edit costs
you a wait rather than the run.

| # | Scene | Location | The idea |
|---|---|---|---|
| 1 | THE STUDIO | studio | three beats: cut the crate wall, ride the dolly across, park the load and cut the wheel |
| 2 | THE CLEARING | forest | **the gate** — a bar drops across the walk; rewind until it lifts |
| 3 | THE STREAM | forest | **the lift** — it hangs in a hole in the floor; drop it, ride it up to a high door |
| 4 | SCAFFOLD | city | **the pressure plate** — a door held open only by weight: put the dolly back on the pad |
| 5 | THE HOIST | city | **the load line** — parked on the sensor is not enough, the wheel has to be cut too |
| 6 | CROSSING | town | gate, then lift |
| 7 | THE ALLEY | town | pad, then gate |
| 8 | THE TIDE | beach | lift up to the hoist deck |
| 9 | LAST TAKE | beach | pad, gate, lift |

Only the studio uses crate cuts, and only the studio and the dolly scenes use the dolly as a vehicle:
the eight new scenes each introduce their own contraption rather than restaging the studio's.

Clearing a scene shows what's in the can and loads the next; the ninth ends on the wrap
screen. The backdrops are painted in `src/themes.js` — one per location, no image assets.

## Tests

```bash
cd reality-editor
./tests/run-tests.sh
```

123 assertions over the mechanics, all nine scenes, the progression between them, the title
buttons and the save file; a check that runs the real `requestAnimationFrame` loop in headless
Chromium with real input; and a play bot (`tests/bot.html`) that drives every one of the nine
scenes to its exit through the real input path — keys for walking and rewinding, a real
drag-and-release for every cut.

## Layout

```
reality-editor/
  index.html      the game page
  src/            config, levels (the shoot list), themes (backdrops), world (clock + cuts),
                  player, input, render, game, audio, save (localStorage progress)
  tests/          assertions, real-loop check, play bot, staged screenshot scenes, capture bot
  dist/           itch.io release zip, cover and screenshots
  PROGRESS.md     build log, test evidence, known limits
  UNREAL_PORT_PLAN.md
  ITCH_PAGE.md
```
