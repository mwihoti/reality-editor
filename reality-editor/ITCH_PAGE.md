# itch.io release — Reality Editor

Everything needed for the page is built by `python3 tools/make_itch_release.py`:

| File | What it is | Where it goes on itch |
|---|---|---|
| `dist/RealityEditor_web.zip` (26 KiB) | The HTML5 build, `index.html` at the top level, 13 files total | Uploads → check **“This file will be played in the browser”** |
| `dist/itch-media/cover.png` (630×500) | Cover art | Cover image |
| `dist/itch-media/screen-wall.png` … `screen-title.png` (1280×720) | Five screenshots | Screenshots |
| `gameplay.webm` (~36 s, 1280×577) | Gameplay clip | **Not directly uploadable** — see *Video* below |

Verified locally: the zip unpacked to a clean folder, served over HTTP, `index.html` → 200, `src/main.js` → `text/javascript`, and the game booted to the title screen with 4 blades.

---

## 1. Project settings

- **Title:** Reality Editor
- **Project URL:** `<yourname>.itch.io/reality-editor`
- **Classification:** Game
- **Kind of project:** **HTML**
- **Pricing:** No payments (or “$0 or donate” if you want a tip jar)
- **Uploads:** `RealityEditor_web.zip` → tick **This file will be played in the browser**
- **Embed options:** “Embed in page”, **enable the fullscreen button**, and set the viewport to **1280 × 720**
- **Genre:** Platformer (or Puzzle)
- **Tags:** `puzzle-platformer`, `time-manipulation`, `2d`, `short`, `singleplayer`, `browser`, `keyboard`, `touch`
- **Inputs:** Keyboard, Mouse, Touch
- **Languages:** English
- **Status:** Released · **Release date:** 2026-11-15
- **Average session:** A few minutes
- **Visibility:** Draft → then **Publish** (that button is yours; nothing here is public yet)

## 2. Page description

Paste this into the description editor. It uses only formatting itch renders reliably
(`**bold**`, `-` bullets, blank lines).

```text
**You are not the actor. You are the editor.**

The room is footage. You have a razor blade, a scrub wheel and a timecode. Everything on
the set — a wall of crates, a camera dolly, a load hanging from a rail — is recorded
material, and recorded material can be cut and scrubbed.

Nine short scenes, one new idea each, in nine locations: a studio, a forest clearing, a
ravine stream, a scaffolding gap, a hook lot, a town crossing, an alley, a tidal flat and a
last take. Each scene hands you a full tape and four blades — spend them badly and you wait
for the tape to come back.

**1. The impossible wall**

Four crates tall. You can't jump it. Drag a box over it and it's gone from the footage.

**2. The moving dolly**

The dolly has already rolled to the far side of the gap. Rewind the footage and it rolls
back to you. You stay put — you're outside the tape.

**3. The final edit**

A load hangs from a rail driven by a drive wheel. Rewind it onto the sensor, then cut the
wheel to freeze it there. That's the only way the exit opens.

**Controls**

- Move: A / D or arrow keys
- Jump: Space
- Cut: hold the left mouse button, drag a box, release
- Rewind: hold R (or Shift)
- Pause: Esc or P — Restart: Backspace

On a phone the movement, jump and rewind buttons appear on screen; drag anywhere else to cut.
Click the game once so it has keyboard focus.

**About**

A browser prototype: Canvas 2D, no engine, no libraries, no image assets — every sound is
synthesised in code. Nine scenes over four backdrop sets (studio, forest, city, town,
beach), about five to fifteen minutes in total. Progress and your best full run are saved in
your browser, so CONTINUE on the title screen picks up at the last scene you reached. Built
as a design proof for a larger version, so the scenes are short on purpose.
```

## 3. Video

itch page videos must be a **YouTube or Vimeo link** — it will not embed a local `.webm`.

Two options:
1. Upload `gameplay.webm` to YouTube (unlisted is fine — no editing needed, YouTube accepts WebM) and paste the link into the project's **Video** field.
2. Attach `gameplay.webm` as a second **Upload** (untick “play in browser”), so people can download the clip.

The clip shows the wall cut, the dolly rewind and ride, and the sensor cut that lifts the shutter. It stops just before the final walk through the door.

## 4. What you still have to do yourself

Only the account-owned actions — I can't sign in as you, and I won't ask for credentials:

1. **Log in to itch.io** (or create the account) and create the project.
2. **Upload** `dist/RealityEditor_web.zip` and tick the browser-playable box.
3. **Upload the media**: cover, the nine screenshots, and the video link (after putting the clip on YouTube).
4. **Fill the metadata** listed in section 1 — genre, tags, inputs, session length, release date.
5. **Answer itch's AI-content disclosure** honestly. The truthful answer: the code, visuals and audio were produced with an AI coding agent, with no third-party IP. That question is on you to answer, not me.
6. **Publish.** Publish sets the page live; a draft is invisible, so nothing is exposed until you press it.
7. **Check the live embed once** — click it, confirm keyboard focus works and the game fills the frame. That's the one thing I can't verify from here: itch serves games from a sandboxed iframe on its own CDN, which a local server doesn't reproduce.

### Optional: publish from the command line instead

Faster for updates and it handles the HTML5 channel properly:

```bash
butler login
butler push dist/RealityEditor_web.zip <yourname>/reality-editor:html5 --userversion 0.1.0
```

You still have to create the project page and add the cover, screenshots and metadata on the site.
