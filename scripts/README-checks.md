# Review checks

Scripts that measure a rendered cut or a soundtrack the way one would check it by hand: picture-to-drum sync, photosensitive flashes, the seams between shots or sections (the picture, and since v07 the music across them), and loudness; and one that cuts seam clips to look at and listen to. Each one prints a table, can write everything it measured as JSON (`--json FILE`), and exits with code 1 when something is over a limit. Every limit is an option.

Run them from the repository root. File arguments may be given relative to the working directory or to the repository root. Shared code is in `lib/review.mjs`. The tests are in `tests/checkTools.test.mjs` and `tests/seamAudio.test.mjs` (the v07 seam tools). They use small synthetic clips, WAVs and event lists, with no renders.

## Where a clip sits in the film

- The checks read the film map from `src/score/film.ts` (the parts: intro, swiss, riso, cosmos, club, break, drop2, outro). If that file does not exist, they fall back to the section table (`SECTIONS` in `src/score/shots.ts`). Rows are labelled `bar  part bar.beat`, for example `23 break 3.1`, with `+N` for N frames past the beat.
- `--start` gives the film frame of the clip's first frame. It takes a number, or a part or section id, which means that part's first frame. It defaults to 0, the whole film. For a section render use `--start break`.
- `--section ID` (repeatable) and `--bars A-B` limit the check to those film frames. Results are grouped by part, or by section with `--by sections`.
- Frames are exact. Decoding uses Remotion's own ffmpeg with input seeking and pass-through timing, and the tests check that a seek returns the frame that was asked for.

## check-sync.mjs: does the picture hit the drums?

```bash
node scripts/check-sync.mjs output/kaomoji-full-v04-1080p.mp4
node scripts/check-sync.mjs output/break-wip-v04-1x.mp4 --start break
node scripts/check-sync.mjs FILE.mp4 --section drop2 --region centre --quiet
```

- **Picture change.** For each frame f, the mean |Δ luma| (Rec. 709, 0–255) between frames f − 1 and f, at 384 × 216. It covers the whole frame, or with `--region centre` the middle half.
- **Drum events.** These come from the soundtrack's own event list (`renderStems` in `scripts/audio/bgm.mjs`, which takes about 7 s). The kinds kept are those ending in kick, clap, snare, ghost or heart, except reversed sounds, and they are merged per frame. `--kinds REGEX` changes the filter. `--events FILE.json` uses a list of frames, `[frame, kind]` pairs or `{ frame, kind }` objects instead. `--save-events FILE` writes the list out.
- **Accent.** A frame whose change is a local maximum and at least `--accent` (1.35) × the base. The base is the median change over f − 14 … f − 4, the motion before the drum, and is at least 0.05.

**Verdicts:**

| Verdict | Meaning |
|---|---|
| hit | The drum frame is the accent, or it carries ≥ 0.8 of the largest change within ±`--window` (4) frames. |
| close | The accent is one frame off. +1 is a launch whose first full step lands on the frame after the drum, which is the house style in the approved bars 1–20. −1 is early. |
| miss | The nearest accent is 2–4 frames off. |
| none | Nothing in ±4 frames stands out. |
| edge | The clip has no frame before or after the drum. |

- **Fails when** a part has an on-beat share ((hit + close) / events) under `--min-on-beat` (0.8), or more misses than `--max-miss` (no limit by default). In v04 the approved parts score 80–100 %.
- **Caveats.** The measure sees changes across the whole frame (or the centre). A small element popping on the beat inside a busy shot may read as `none`, so check it by eye. Inside Drop 1's stutter, the audio events are in content time.

## check-flash.mjs: photosensitive flashes

```bash
node scripts/check-flash.mjs output/kaomoji-full-v04-1080p.mp4
node scripts/check-flash.mjs FILE.mp4 --section drop2 --grids 1,3     # the WCAG-sized test only
```

This approximates the general-flash and red-flash tests of WCAG 2.2 (2.3.1) and the Harding / Ofcom guidance. It is not a certified flash analyser.

- **Blocks.** The frame is decoded at 384 × 216 and cut into blocks: the whole frame, 3 × 3 (each about the 10° field WCAG measures, so this is the standard test) and 6 × 6 (a stricter local test). `--grids` chooses which.
- **Transitions.** Each block's mean relative luminance (linear light, 0–1) is followed frame by frame. A transition is a swing of at least `--delta` (0.1) from the last extreme, with the darker side under `--dark` (0.8).
- **Red flashes.** Each pixel's WCAG red value is (R − G − B) × 320 where R / (R + G + B) ≥ 0.8. It is averaged per block, and a swing of `--red-delta` (20) counts as a transition. `--no-red` turns this off.
- **Flashes.** One flash is two opposite transitions. A block fails when any 1 s window (60 frames) holds more than `--max-flashes` (3) flashes, which means 8 transitions or more.
- **Output.** Every failing span, with its worst block (`6×6 r2c0` is row 2, column 0), followed by each part's busiest 1 s window per grid.

## check-seams.mjs: do the hand-offs line up?

```bash
node scripts/check-seams.mjs output/kaomoji-full-v04-1080p.mp4                 # part boundaries
node scripts/check-seams.mjs output/kaomoji-full-v04-1080p.mp4 --seams shots   # every shot boundary
node scripts/check-seams.mjs FILE.mp4 --start break --seams 2112,2208:cut
node scripts/check-seams.mjs --render --seams 1920,2496 [--draft] [--no-energy] [--context] [--scale 1]
```

**What is measured** for each seam frame f, on frames f − 1 and f:

| Measure | Meaning |
|---|---|
| change | Mean \|Δ\| of the 8 × 8 block averages over R, G and B (0–255). |
| overlap | Pixels bright (luma ≥ `--floor`, 170) in both frames, divided by pixels bright in either. These are the face, the outlines and the cracks that a hand-off or a match cut keeps in place. It is `—` when neither frame has bright pixels. |
| motion, jump | From a cut, or with `--context`: the median change of the frame pairs at f − 3 … f + 3, and change ÷ motion. A jump near 1 means the seam moves no more than the shot around it. |

**Which seams** (`--seams`):

- `parts` (the default): the part boundaries, where one team's section hands over to the next. All are judged.
- `shots`: every shot boundary. Those whose outgoing exit is `continuous` or `match` are judged. The rest (cut, whip, punch, stutter, T1–T7, which may flash or wipe on purpose) are only reported.
- A list of film frames. Add `:cut` to report a seam without judging it.

**Verdict.** A judged seam passes when change ≤ `--max-change` (3), or overlap ≥ `--min-overlap` (0.5), or jump ≤ `--max-jump` (1.5).

**Sheets.** Each seam gets a sheet, f − 1 | f | bright strokes. White is bright in both frames, red only in f − 1, green only in f. Sheets go in `--save` (default `output/qa/check-seams/<name>/`); `--no-sheets` skips them.

**`--render` mode** renders f − 1 and f from the section compositions that hold them, at final quality with the camera energy on, as in the film. `--no-energy` matches the older continuity checks (`check-drop1.mjs`, `check-build.mjs`). It takes about 30 s for two seams.

**`--seams plan`** checks the continuity plan's seams (`docs/2026-10-03-continuity-plan-v07.md`; `PLAN_SEAMS` in `check-seam-audio.mjs`): the intro's bar lines, every part line, the break's inner lines, drop 2's world lines and the loop. On a whole film the loop seam (5856) reads frame 5855 → frame 0.

**Two more reports from a cut** (v07, FW5). `--no-anchors` and `--no-dead` turn them off, and `--strict` makes them fail the check:

| Report | Meaning |
|---|---|
| anchor (hold) | What holds its place across the line. Over f − 12 … f + 12, decoded at 480 × 270, it tracks the centroid of each colour class: the hero's amber (hue 25–50°, saturated, bright) and the Defender's red (hue ≥ 350° or ≤ 10°). The hold is the longest run of frames that holds f − 1 and f and keeps the class within `--anchor-tol` (40) px of its place on f − 1. FW5 asks for `--anchor-min` (12). `amber 0 f (jump 284 px)` means it moved at the line, `(gone)` that it vanished, and `none` that neither class is on f − 1. It sees colour only: a hero drawn in another world's colours reads `none`, so look at the sheet. |
| dead picture under live music | Runs of `--dead-frames` (12) or more frames whose picture change (check-sync's mean \|Δ luma\| at 384 × 216) is ≤ `--dead-change` (2) while the mix (100 ms RMS round each frame) is above `--dead-db` (−30 dBFS). The mix is the cut's own soundtrack, or `--audio WAV` (the film's, read from film frame 0). Frames in `--dead-allow` (`2677-2711`, the glass's held hit) never count. |

## check-seam-audio.mjs: does the music cross the seam?

```bash
node scripts/check-seam-audio.mjs                                   # public/audio/bgm.wav, the plan's seams
node scripts/check-seam-audio.mjs --render --seams 2112,4320,4704   # a builder's mix, rendered and mixed in memory
node scripts/check-seam-audio.mjs output/kaomoji-full-v07-1x.mp4 --json out.json
```

This is the continuity plan's audio check (FW1–FW4). The mix is a WAV, a cut's soundtrack, or, with `--render`, the source tree's soundtrack rendered and mixed in memory (nothing is written; about 45 s). The events and the hook's stems are always rendered in memory from the source tree: `renderStems` takes about 20 s, and the second render without the hook voices another 20 s (`--no-hook` skips it). `--events FILE.json` reads the events from a file instead (`[{ frame, kind }]`, `[[frame, kind]]`, or `at` in samples).

**Per seam S** (one beat = 24 frames, one bar = 96):

| Column | Meaning |
|---|---|
| carry | **L tail**: tonal kinds of the old world (heard in the bar before S, before its last beat) that sound again in S … S + 2 beats. **J pre-lap**: tonal kinds first heard in the beat before S that the new bar keeps. Kinds drop their section's prefix (`cskick`, `clkick`, `d2kick` → `kick`), and drums (kick, hat, snare, clap, roll, crash, taiko …) never count. One or more passes. So does a designed **breath**: a section's `SILENCES` window within two beats before S, or the mix under `--silence-db` (−60 dBFS) for 50 ms there. |
| new@1 | Kinds starting on the downbeat (S − 1 … S + 2) that the bar before did not have: at most `--max-new` (4). |
| kick | The kick spine, reported only: a kick within two beats on each side when the bar before had one. `gap` means a side has none, `—` that the bar before had no kick. |
| Δcentroid, Δside/mid, ΔLUFS-M | The beat before S against the beat after it: the mid's spectral centroid (octaves, 60 Hz – 16 kHz), side over mid (dB, broadband) and the momentary loudness (the K-weighted level of the 400 ms beat). A change ramped over the bridging beat has already moved the beat before, so it shows as a small step; one jumped on the downbeat shows whole. Pass: \|Δ side/mid\| ≤ `--max-side` (3 dB) and \|Δ centroid\| ≤ `--max-centroid` (0.5 octave). |
| hook ←, → | The hook's level (below) in the bar before and the bar after. |

- **Plate restarts.** bgm.mjs restarts the plate reverb at each section's `CUTS` and at the held tails' edges. The check rebuilds that list from the same modules and measures the mix 30 ms before and after each cut. A restart is **hot** when both are above `--silence-db` and no designed silence (a `SILENCES` window) starts there or ends within 12 frames before it: the plate's tail vanishes under live music. A hot restart within a beat of a seam fails the seam.
- **Exemptions.** The event seams (1536 the bang, 2688 the shatter, 3456 the slam: the jump is the hit; `F:event` marks another) and seams after a breath are exempt from new@1 and the room.
- **Which seams are judged.** With `--seams plan` (the default) the plan's §2 seams are judged (`FIX_SEAMS`: 2112, 3456, 4224, 4320, 4512, 4704, 4800, 4896, 5376) and its keep list is reported as `keep: …`, with what would fail there. `--judge-all` judges every seam. A frame given with `--seams` is judged unless it is on the keep list.
- **The hook (FW1).** Bar by bar from 1536 to 5231, the hook against the mix in 500 Hz – 4 kHz, from the dry stems summed (no reverb). The hook is the mix minus the mix rendered again without the hook voices: `HOOK_KINDS` plus any kind with `hook` in its name (`--hook-kinds K,…` replaces the list, `+K,…` adds to it). It is judged as the plan's table sets it: drop 2 bars 10–18 at `--hook-target` (−6 dB) or louder (`LOW` under it), drop 2 bar 8 at `--hook-ghost` (−14 dB) or louder (`QUIET`), and drop 2 bar 9 with a hook note on 9.4 (`NONE` without). Other bars are reported against the ghost level (`quiet`; `--hook-all` judges them too), except the FALL glass world (break 1, `exempt`) and bars holding a designed breath (`breath`).
- **Fails when** a judged seam or a judged hook bar fails (exit code 1).
- **JSON** (`--json`): per seam the kinds (`tail`, `prelap`, `fresh`), `room` (the steps) and each side's own room (`roomBefore`, `roomAfter`: centroid in Hz, side/mid and level in dB; for an absolute target such as the club's "bar 1 side/mid −17 dB or wider"), the hook rows, and every plate restart.
- The hook's second render uses the section renderers' `solo` option. `renderStemsSolo` in the script mirrors the list in `bgm.mjs` `renderStems`: keep the two in step.

## seam-clips.mjs: seam clips, the A/B reel, strips and spectrograms

```bash
node scripts/seam-clips.mjs --b-audio output/qa/v07/wp2/bgm-wp2.wav --seams 4224,4320,4512 --out output/qa/v07/wp2/ab   # a new mix on A's picture
node scripts/seam-clips.mjs --b output/kaomoji-full-v07-1x.mp4 --label-b v07 --out output/qa/v07/seam-reel          # every plan seam, A then B
node scripts/seam-clips.mjs --what strips,spec,bands,stems --seams 2112                                               # A alone, with the stems table
```

For every seam it takes the two bars round it (±`--span`, 96 frames) of film A and of film B. A is `--a` (`output/kaomoji-full-v06-proposed-1x.mp4` by default). B is another cut (`--b`), a new mix on A's picture (`--b-audio`: the listening preview of a music package, with nothing rendered), or A's picture with a package's re-rendered frames spliced in (`--b-frames DIR`, files `f<film frame>.png`; with A's sound, or `--b-audio`). Both films must be whole, because the loop seam wraps from the last bar to the first. `--what` picks the outputs (default `clips,reel,strips,spec`), written to `--out` (`output/qa/v07/seams`):

| Output | Meaning |
|---|---|
| `clip-S-A.mp4`, `clip-S-B.mp4` | The two bars with picture and sound at `--size` (960 × 540), H.264 + AAC. Each frame is labelled with its side, its label (`--label-a`, `--label-b`), the seam and the frame. The label turns red on the seam frame and the 5 after it. |
| `reel.mp4` | Every seam's A clip, then its B clip, in seam order. |
| `strip-S.png` | Every `--step`th (4th) frame of the two bars, the seam frame boxed in red; A's rows over B's. |
| `spec-S.png` | The two bars' spectrograms (the mid, 30 Hz – 20 kHz, log), A over B. The seam is a red line and each beat a tick. |
| `bands-S.txt` | Per 16th: level, six bands, side/mid, centroid, spectral flux and peak (A, then B). |
| `stems-S.txt` | Per beat (±2 bars), each bus's level from the source tree's stems, and the events round the seam (`renderStems` once, about 20 s). |

The clips are encoded from BMP frames piped to Remotion's ffmpeg, which has no raw-video demuxer. The labels are burnt in with the script's own 3 × 5 bitmap font.

## check-loudness.mjs: loudness per part and per bar

```bash
node scripts/check-loudness.mjs                         # public/audio/bgm.wav, per part
node scripts/check-loudness.mjs --bars                  # plus every bar, with the loudness arc
node scripts/check-loudness.mjs output/kaomoji-full-v04-1080p.mp4   # the AAC in a cut
node scripts/check-loudness.mjs public/audio/sections/break.wav --start break
node scripts/check-loudness.mjs --by sections --louder drop2,drop1,1        # drop 2 at least 1 LU louder than drop 1
```

**What is measured:**

| Measure | Meaning |
|---|---|
| LUFS-I | BS.1770-4 integrated loudness of the range: 400 ms blocks at 100 ms steps, gated at −70 LUFS and then 10 LU under the mean. The K-weighting is computed for any sample rate. |
| M max, S max | The loudest 400 ms (momentary) and 3 s (short-term) windows, at 10 ms steps. |
| TP | True peak: each channel rebuilt at 16 points a sample with a Kaiser-windowed sinc (`--taps` 128 a phase, β 10, flat to Nyquist). This takes about 7 s for the film. |
| SP | Sample peak. |
| clipped | Samples at 16-bit full scale. |

- **Ranges.** The parts of `src/score/film.ts` (`--by parts`, the default), or else `SECTIONS`; `--by sections` uses `SECTIONS`. The `whole file` row covers everything. `--bars` adds a row per bar, with a `#` per LU over −30 LUFS, so the loudness arc reads down the page.
- **Fails when** a range's true peak is over `--max-tp` (−1.0 dBTP), its LUFS-I is over `--max-lufs` (−8) or under `--min-lufs` (off), any sample is clipped (`--max-clipped` 0), or a `--louder A,B[,LU]` rule is broken.
- **Typing a negative limit.** `--max-tp -1.5` works as typed.
