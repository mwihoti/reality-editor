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

## The nine scenes

Every scene hands you a full tape and four blades. Cutting spends a blade; rewinding
spends tape. The tape only comes back once you have spent all of it, so a bad edit costs
you a wait rather than the run.

| # | Scene | Location | The idea |
|---|---|---|---|
| 1 | THE STUDIO | studio | three beats in one room: cut the wall, rewind the dolly, park the load |
| 2 | THE CLEARING | forest | four crates tall, unjumpable — cut them out of the frame |
| 3 | THE STREAM | forest | the dolly has already rolled across the water; rewind it back and ride it |
| 4 | SCAFFOLD | city | a wall to cut and a dolly to rewind, in the same gap |
| 5 | THE HOIST | city | rewind the load onto the sensor, then cut the wheel to freeze it |
| 6 | CROSSING | town | wall, dolly and hoist in one street |
| 7 | THE ALLEY | town | cut the wall below, freeze the line above |
| 8 | THE TIDE | beach | the widest gap in the game |
| 9 | LAST TAKE | beach | everything at once, then the door |

Clearing a scene shows what's in the can and loads the next; the ninth ends on the wrap
screen. The backdrops are painted in `src/themes.js` — one per location, no image assets.

## Tests

```bash
cd reality-editor
./tests/run-tests.sh
```

94 assertions over the mechanics, all nine scenes and the progression between them, plus a
check that runs the real `requestAnimationFrame` loop in headless Chromium and plays it with
real input.

## Layout

```
reality-editor/
  index.html      the game page
  src/            config, levels (the shoot list), themes (backdrops), world (clock + cuts),
                  player, input, render, game, audio
  tests/          assertions, real-loop check, staged screenshot scenes, recording bot
  dist/           itch.io release zip, cover and screenshots
  PROGRESS.md     build log, test evidence, known limits
  UNREAL_PORT_PLAN.md
  ITCH_PAGE.md
```
