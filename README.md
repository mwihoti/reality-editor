# Reality Editor

A three-scene browser puzzle platformer about editing the room around you: cut pieces of
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

## The three scenes

1. **The impossible wall** — four crates tall, unjumpable. Drag a box over them and they're
   gone from the footage.
2. **The moving dolly** — the dolly has already rolled to the far side of the gap. Rewind
   the footage and it rolls back; you stay still, because you're outside the tape.
3. **The final edit** — a load hangs from a rail driven by a cuttable wheel. Rewind it onto
   the sensor, then cut the wheel to freeze it there and open the exit.

## Tests

```bash
cd reality-editor
./tests/run-tests.sh
```

72 assertions over the mechanics and the three puzzle solutions, plus a check that runs
the real `requestAnimationFrame` loop in headless Chromium and plays it with real input.

## Layout

```
reality-editor/
  index.html      the game page
  src/            config, level, world (clock + cuts), player, input, render, game, audio
  tests/          assertions, real-loop check, staged screenshot scenes, recording bot
  dist/           itch.io release zip, cover and screenshots
  PROGRESS.md     build log, test evidence, known limits
  UNREAL_PORT_PLAN.md
  ITCH_PAGE.md
```
