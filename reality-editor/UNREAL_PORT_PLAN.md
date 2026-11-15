# Reality Editor — Unreal Engine 5.9 port plan

> **Status of the current build:** the browser prototype in this folder is **not** an Unreal Engine build and **cannot be submitted** to the 2026 Epic AI MegaJam, which requires Unreal Engine or UEFN. This document is the plan for rebuilding the finished design in UE 5.9.

The good news is that the design was written to be cheap to port: the game is **not** a physics simulation. Every moving prop is a pure function of one clock, and every cut is an entry in a log with a timestamp. That maps to Unreal as *driven actors + one clock subsystem*, not as replication, not as physics, and not as save-states.

---

## 1. What is being ported

| Browser system | File | Must survive the port |
|---|---|---|
| Footage clock, tape, cut log, puzzle mechanism | `src/world.js` | Yes — this is the game |
| Player movement | `src/player.js` | Yes, re-expressed with CharacterMovement |
| Level layout & puzzle geometry | `src/level.js` | Yes, as a data asset + map |
| Cut-and-rewind presentation | `src/render.js` | Visuals only — redone in 3D |
| Input | `src/input.js` | Replaced by Enhanced Input |
| HUD / screens / tutorial | `src/render.js` (HUD section) | Rebuilt in UMG |
| Synthesised SFX | `src/audio.js` | Replaced by MetaSounds/cues |
| Tuning numbers | `src/config.js` | Yes, as a `UDataAsset` |

**Do not port:** the Canvas2D renderer, the WebAudio synth, the DOM input layer.

---

## 2. Core architecture in Unreal

```
URealityClockSubsystem (GameInstanceSubsystem)
 ├─ float FootageTime          // seconds of "tape"
 ├─ float TapeRemaining
 ├─ TArray<FEditEvent> Edits   // { Time, FBox2D Rect, TArray<FName> Ids }
 └─ bool  bRewinding

ARealityGameMode → ARealityPlayerController → ARealityCharacter
                     │                         └─ UCutToolComponent (drag rect → edits)
                     └─ URealityHUD (UMG)

Props: AActor + UFootageComponent (pure) + UEditTargetComponent (cuttable)
```

### 2.1 The clock (the one rule that matters)

`URealityClockSubsystem` owns `FootageTime`. It advances at 1x in `Tick`, or backwards at `RewindRate` while the rewind input is held and tape remains. It broadcasts `OnFootageTimeChanged(float NewTime, bool bRewinding)`.

Every driven actor implements:

```cpp
UCLASS(Abstract)
class UFootageComponent : public UActorComponent
{
  virtual FTransform StateAt(float Time) const PURE_VIRTUAL(, return FTransform::Identity);
};
```

- Dolly / load / shutter subclasses implement `StateAt` with the same maths as `stateAt()` in `world.js` (linear clamp, sine, crane line).
- **Never** drive these actors with physics or with accumulated deltas. Rewinding must reproduce forward play exactly; a delta-based prop desynchronises the instant you scrub.

### 2.2 The edit log

Cuts are data, not destruction:

```cpp
USTRUCT()
struct FEditEvent { float Time; FBox2D Rect; TArray<FName> TargetIds; };
```

`ARealityGameMode::ApplyCut(FBox2D WorldRect)` stamps the current `FootageTime` and collects every `UEditTargetComponent` whose **actor bounds centre** is inside the rect (same anchor rule as the browser build).

A target is *alive* iff no edit with `Time <= FootageTime` names it. Each tick, the game mode diffs alive-ness and calls:

```cpp
SetActorHiddenInGame(!bAlive);
SetActorEnableCollision(bAlive);
```

Not `Destroy()` — a rewind past the cut must bring the crate back without re-spawning. This is the single most important implementation detail of the port.

### 2.3 The mechanism (puzzle 3)

`UCraneLineComponent::StateAt(Time)` returns the load position from `min(Time, EarliestSurvivingCutTime(DriveWheelId))` — exactly the `lineTime()` rule in `world.js`. Cut the drive wheel and the line freezes at that moment; rewind past the cut and the wheel is alive again, so the line resumes. No special-case code, no save states.

### 2.4 Player

`ARealityCharacter : ACharacter` with `UCharacterMovementComponent`:
- Plane constraint: `bConstrainToPlane = true`, plane normal `(0,1,0)` for a side-scroller; camera orthographic-ish.
- Air control 0.55, gravity scale ~1.6, jump velocity tuned to 155cm equivalent (~`JumpZVelocity` 700 with gravity 1.6) so the 4-crate wall stays impossible.
- The character is **off-tape**: it never rewinds. Ensure the rewind code cannot touch character movement.
- Coyote time / jump buffer: implement in the character (no built-in equivalent worth using).

### 2.5 Cut tool

`UCutToolComponent` on the player controller:
1. `IA_Cut` pressed → record screen position, begin drag.
2. While held → draw a UMG rectangle (or a material on a full-screen widget).
3. Released → deproject the rectangle corners to the gameplay plane (`DeprojectScreenToWorld` + plane intersect), build the world `FBox2D`, call `ApplyCut`.
4. Ignore input while the clock is rewinding (same guard as the browser build).

Highlight candidates before release with a custom depth pass or a translucent material — the browser version's dashed outline can become a simple unlit outline post-process in the box region if time allows.

### 2.6 Camera

`ASideCameraActor` with a spring arm, `bDoCollisionTest = false`, and a custom `Tick` that lerps to `PlayerX + Lookahead*Velocity`, clamped to the room bounds. Rewind → interpolate FOV 90 → 96 (the browser's 0.94 zoom). Win → slow push-in.

---

## 3. Assets and actors to build

| Need | Plan |
|---|---|
| Stage room | Built from UE modeling tools (or Fab modular kit): stage floor, back wall, hanging rails, door frame. One `UWorld` map, no level streaming. |
| Cuttable wall | 12 `BP_Crate` actors (same 100cm grid as the browser build), each with `UEditTargetComponent` |
| Dolly | `BP_Dolly` + `UDollyMotionComponent` |
| Crane line, load, sensor, drive wheel | `BP_CraneLine`, `BP_Load`, `BP_SensorPad`, `BP_DriveWheel` (the wheel has `UEditTargetComponent` + a spinning static mesh component) |
| Shutter / exit | `BP_Shutter` (translating static mesh) + `BP_ExitTrigger` (box trigger) |
| Player character | Third-person Mannequin retargeted, or a Fab character; needs idle/walk/jump/land montages and a "rewind watching" idle |
| Sets/props | Fab, Quixel, or AI-generated (Meshy/Tripo/Hyper3D are jam partners) — list every third-party asset in the submission |

Everything above is a `UStaticMeshComponent` on a Blueprint deriving from `ARealityActor`; no skeletal meshes except the player.

---

## 4. Input mapping (Enhanced Input)

| Action | Type | Binding |
|---|---|---|
| `IA_Move` | Axis1D | A/D, ←/→, gamepad left stick, on-screen touch buttons |
| `IA_Jump` | Digital | Space, gamepad face button |
| `IA_Rewind` | Digital (hold) | R, Shift, gamepad shoulder |
| `IA_Cut` | Digital + drag | LMB drag on the stage |
| `IA_Pause` | Digital | Esc / P, gamepad start |
| `IA_Restart` | Digital | Backspace, gamepad select |

`IMC_Reality` context, priority 0. On touch platforms, add a `UUserWidget` with the same four buttons as the browser build (`CONFIG.ui.touch`) and route them into the same input actions via `UEnhancedInputComponent`.

---

## 5. UI widgets (UMG)

| Widget | Contents |
|---|---|
| `WBP_Title` | Title, subtitle, verb summary, START button (mouse + Space/gamepad) |
| `WBP_HUD` | Scene slate, blade pips, timecode (counts up/down), tape meter, PAUSE button |
| `WBP_Hint` | Contextual card with a pointer (replaces `hintFor()`), driven by a small state machine on `ARealityGameMode` |
| `WBP_Toast` | Scene-cleared / PATH OPEN banners |
| `WBP_Pause` | Resume / Restart |
| `WBP_Win` | "THAT'S A WRAP", run time, blades and tape left, Play Again |

Bindings: HUD timecode and tape bind to the clock subsystem (event-driven, not per-frame polling).

---

## 6. Migration sequence

1. **Grey box the room** in UE 5.9 with a character that can walk and jump. Accept: the 4-crate wall is unjumpable; the 500cm gap is uncrossable.
2. **Clock subsystem** with `FootageTime`, tape, and a debug readout on screen. Accept: holding rewind scrubs the number backwards at 1.6x and spends tape at 1x.
3. **One driven prop**: the dolly, using `StateAt(Time)`. Accept: rewinding shows the dolly travel backwards deterministically; forward play reproduces the same positions.
4. **Edit log + cut tool**: rectangle drag, anchor rule, hide/unhide, blade count. Accept: cutting the wall opens the corridor; rewinding past the cut restores all 12 crates and refunds the blade; the corridor blocks again when time passes the edit.
5. **Puzzle 3 mechanism**: crane line, sensor, drive wheel, shutter. Accept: rewind onto the sensor opens the exit; cutting the wheel freezes it; cutting first fails visibly and is recoverable.
6. **Progression, checkpoints, respawn, win state.** Accept: the three scenes clear in order and the exit screen reports stats.
7. **UMG pass**: title, HUD, hints, pause, win, touch buttons.
8. **Presentation pass**: cut flash + hole decal, rewind post-process (scanlines, chromatic shift, VHS jitter), audio (MetaSounds), camera polish.

Each step is shippable: if the jam deadline lands early, stop after step 5 and you still have a playable game.

---

## 7. Config mapping

`src/config.js` → `URealityConfig : UPrimaryDataAsset`:

| Field | Value | Note |
|---|---|---|
| `run` | 335 cm/s | `MaxWalkSpeed` |
| `jumpVelocity` | 905 | `JumpZVelocity` (verify against gravity scale) |
| `gravity` | 2600 | World gravity / gravity scale 1.6 |
| `maxCuts` | 4 | blades |
| `maxTape` | 20 s | tape |
| `rewindRate` | 1.6 | clock multiplier |
| `startTime` | 30 s | scene starts mid-footage |
| `sensorHalfWindow` | 80 cm | sensor tolerance |
| `load.speed` | 45 cm/s | crane line |

Units: the browser build uses 1 unit = 1 cm, so the numbers transfer directly.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Driven props fighting physics | All footage actors are `Mobility = Movable`, `Simulate Physics = false`, moved only from `StateAt` |
| Hiding actors breaks "un-cut" | Toggle hidden/collision from the edit log each tick; never destroy |
| Character accidentally rewound | Rewind path only touches the clock; character tick is independent |
| Cut rectangle deprojection off-plane | Use a fixed gameplay plane (Y=0) and an orthographic-ish camera so screen→world is stable |
| Performance | Twelve crates + five driven props: trivial. The rewind post-process is the only cost |
| Scope | Steps 1–5 are the submission-critical path; 6–8 are polish |
| Asset licensing | List every Fab/AI-generated asset in the submission; keep licences on file |

## 9. UEFN alternative

The same design works in UEFN with Verse: one `world_clock` manager advancing `FootageTime`, props moved in `OnBegin` per tick from pure functions of that clock, `edit_events` as an array of records, and the cut as a rectangle test over registered prop positions. UEFN cannot ship the 2D canvas look, so the art direction would need a stylised 3D pass, and the submission needs a **private version code** rather than a packaged build.

**Do not claim the browser prototype as an Unreal submission.** It is the design proof; the jam entry has to be rebuilt in UE 5.9 or UEFN.
