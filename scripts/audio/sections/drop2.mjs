// Drop 2's sound, the part 'drop2' (20 bars: "THE VIRUS WAR"), from its build sheet notes/bid2/drop2-sheet2.md (§3 the timeline,
// §8 the music plan), the music bible notes/prep/music.md (§4.7, §6.3) and the frames of src/score/drop2.ts, so every hit lands
// on the picture's frame (an event on frame f starts on sample f / 60 s × sr exactly). Positions are drop2 bar.beat.
// F♯ major, a semitone above drop 1: drop 1's VOICINGS + 1 (IV–V–iii–vi, the tonic held back for the ending), the antivirus's chords
// borrowed from F♯ minor while it holds the picture (9: ♭VI → iv → V7♭9, 17: ♭VI → ♭VII → V7; every launch V → IV).
//
// KEEP-FIRST (the story bible's 先保留、再加): the approved bars of the v04 master — 1–4 (the pop, SLASH, the cube, the Z-buffer), 6 (the
// built game bar), 7 (the overflow), 18 (the reel), 19 (stuck in ASCII, the crash) and the drain — play their as-built music, moved
// with their score names; every carried hit keeps its v04 seed (carriedSeed: its rank among the carried events is its v04 index), its
// vowel and its side. Added over them (logged in the sheet's §1.3, item MU; pad layer C, the air bed and the shine were added there too,
// and are gone with the rest of the bed since 2026-10-02: MUSIC CHANGE below): Defender's quiet thread (the game's scan-bar tinks), the fader and the drive into the group clip (CLIP, DRIVE: the
// +1.5 LU over drop 1), the lighter 1.1 slam, and for the delivery's AAC a 5 ms onset (ONSET) and a 16.5 kHz top (TOP). The new bars are in
// scripts/audio/drop2Act2.mjs (5, 8–17) and scripts/audio/drop2Bullet.mjs (the bullet time, 19.4& – 20.4&), their voices in
// scripts/audio/drop2Act2Voices.mjs.
//   1, SLASH: the slingshot fires through the break's soap film — kick, crash, impact, a sung IV chord, the band's snap, E6's pok, the
//   film's spray and its droplets, the swarm of the torn text — and every blade is a shing climbing F♯6 → F♯7; slammed 3 dB (finish()).
//   v08 (LANDING, BLOOM): no slam and no noise — the impact's tonal body (the boom), the spray as FALL's glass, the crash lighter, the
//   drive climbing by the beat, the band over 4 kHz blooming in over two beats.
//   2, STYLE CUBE: a swoosh into every face's landing and a thock on it, the LED's blip run, the neon's spark, the tom fill, the whip.
//   3–4, Z-BUFFER: the vwoom, the wobble, glints, the gulp into the torus and its reverse, FM pops on the march, S04's blink a semitone
//   up, the bitcrusher over the collapse (8 bits, then 4; 5.1 clean).
//   5, the crane bar (new) · 6, FULL COMBO: the game's start blip, the kana and the sparkles, Defender's probes and scan bars, E8's
//   scrub-ahead, the payout (a "hey!", a bell run, a swarm).
//   7, OVERFLOW: the odometer, the crack, the rubber's strain and twang (and since M3 the wall's creak and smash), two FATAL beeps, the
//   wrap's bwomp gliding into the kernel.
//   8–17 (new): the kernel, the switch (half time), the five worlds of act 2 (drop2Act2.mjs).
//   18, the reel: a ring on every world, a zap on every cut, the stutter, the blades, a riser to the crash and the master sweep.
//   19.1–19.2: the heart racing in 8ths, the scream gated on the 32nds, the guest's drop falling as a whistle.
//   19.3, the freeze: the music stops dead (S5, gated to the bullet time); on the post bus the CRT's thunk, the drop's plink, the
//   power-down, the sort's chatter, the frame's ring ticks; finish() replays the last 3 frames as a stuck buffer.
//   19.4& – 20.4&, the bullet time: music again (drop2Bullet.mjs): the frozen chord, heartbeats, the music box. 20.4&: the drain, then
//   six frames of digital zero (ZERO) before the ending's cut.
// Every voice is written into drop 2's own buffers and cut on the freeze, the bullet time's on ZERO, so nothing rings under a silence or
// into the ending. bgm.mjs reads the hooks below.
// MUSIC CHANGE (2026-10-02: the whole was too noisy, the chord held behind everything most of all, and there was room for more sync hits; KEEP-FIRST logged here):
// the sustained bed is gone from every bar, the carried ones included — pads A, B and C (three stacked supersaws on every chord from 1.1
// to the crash, the loudest thing in drop 2: −9.4 LUFS alone against the drums' −11.9), the 6–12 kHz air bed, the shine (a +4 dB shelf on
// the pads and the music bus) and the act-2 choirs (10.1 → 10.3, 15.4& → the reel). The harmony is carried by short-decay voices, one
// family a world (scripts/audio/drop2Worlds.mjs WORLD_VOICES), on the picture's events, modelled on break 1 FALL: the stabs and the arps
// (moved onto the chord bus, d2chords, which now holds only chord voices), the Z-buffer's FM pops, the blueprint's plucks, the koto's
// 16ths, the voxel bleeps, Memphis's marimba (in place of its stabs and arp), the pictograms' bells, the mirror trap's glass (in place of
// its arp). New sync hits: Defender's red rows, the boats' flung boxes, the cartouche re-signed, the star's shatter. The one swell left is
// the bullet time's frozen chord (drop2Bullet.mjs, 3 dB fainter), read from a pad rendered for it alone and never heard as a bed. The
// loudness the pads carried is given back to the drums, the hook and the chord voices (MAKEUP, ACT2_DRUMS_DB, KICK_DB, DRIVE, FADER, the
// 1.1 slam, the stuck buffer's BUZZ_DB: each says why), so drop 2 stays ≥ drop 1 + 1.5 LU and act 2 ≥ act 1 + 0.3 without a held chord.
// The checker's pass (2026-10-02): act 2's +3 dB put the hiss back (6–16 kHz +3 dB over v09 in 10–11): the kit's air takes only ACT2_AIR_DB
// (+1; the arcade's and the well's 8-bit kit excepted), its body hits keep +3, and act 2's kick (ACT2_KICK_DB) and fader give the loudness
// back. M3 (2026-10-02: a sync sound for the wall on the right being smashed out; KEEP-FIRST: added over the carried bar 7):
// the wall creaks as it bows (7.3) and is smashed out on the snap (7.3&) — a low thud, the CRT bezel's bitcrushed crack and its debris,
// on the right, the music ducked under it for a moment (WALL, WALL_DUCK; the voices in drop2Worlds.mjs).
// W (2026-10-03: on screen the bar reaches the wall in stages, so the music could hit each one): the bar goes through the monitor in stages, and
// each is hit — a push on 7.1 (256 %), 7.2 (the surge, 65,536 %) and 7.3 (into the wall, 16,777,216 %), each heavier, its crunch higher
// and the music ducked a little deeper (PUSHES), a crack step on each cell the border's crack widens (7.2e, 7.2&, 7.2a: CRACK_STEPS),
// the wall's creak now following its bow instead of swelling to the snap; the snap (7.3&) stays the biggest hit, the FATAL beeps (7.4) and
// the wrap (7.4&) their own sounds. W's fix round (the checker, same night: in the finished mix the pushes' energy went into the group
// clip and the limiter, 7.2 stayed the loudest stage, the 40 ms ducks left no dip, the crack steps sat 8–13 dB under the ticks): contrast
// instead of energy — a gap before each stage, deeper each time and deepest before the snap (GAP, SNAP_GAP), each push's pitched clank
// climbing the iii chord over the kick and the crash (PUSHES clank), the ducks held 120 ms (PUSH_DUCK), the crack steps 12–14 dB up.
// E (the same night: a more Edo sound for the print): the woodblock wave (10–11) is Edo — scripts/audio/drop2Edo.mjs.
// V07, the continuity plan (docs/2026-10-03-continuity-plan-v07.md, WP2: each part works alone, but joined up the music and picture
// need more continuity, and a short, heavy hit at the wave's start reads as noise). Drop 2's music, 4140 → 5400 only (3456–4139 byte-identical: the highway reads it):
//   the wave-start noise (§3): 10.1's impact and the foam's noise hits gone, the ō-daiko in place of the impact and the taiko's DON, the
//   kick 0.75, the drive 1.5 dB (reached by the downbeat), the slam 1 dB and only above SLAM_BURST.hz, the group clip in two bands over
//   10.1–10.2 (BAND_CLIP: the low drums no longer ride every bright bus); 10.1 loud by its voices (BURST_LIFT on the music and the Edo
//   one-shots, the koto's hook, the sung IV, the shamisen's string and then its chord; every Edo voice ≈ 4 dB up, drop2Edo.mjs);
//   the clip's heavy share held at the bible's (bar 11 and the arcade/well's drive 0.5 / 0.2 dB down under the louder hook);
//   the hook as one spine (FW1, HOOK_KINDS): the koto's ghost on the kernel's dominoes, its head on the spill, its rows louder on the wave;
//   the brass +6 dB; the octaves a little up;
//   the seams carried (FW3, VOICE_OF): the Edo pre-lap (the spill's koto, the arcs' hyoshigi, the sweep landing on 10.1, the shaker from
//   9.4), the closing ki and a D♯ crushed into the arcade and the ō-daiko's DON on 12.1, the marimba on the colour blips and the orch hit
//   reversed over 13.4, the chip kit two beats into Memphis, the drumline's tenors and roll on 14.4, the marimba ringing into 15.1, the
//   outro's heart in the bullet time (20.3's dub sagging to the outro's B1) and the music box's ghost on 5376;
//   the same room (FW4): the width ramped across 4224, 4320, 4512, 4704, 4896 and into the zero (WIDTH_RAMPS), the low band's balance
//   across 4224, 4320, 4512, 4704 (TONE_RAMPS), Memphis's presence (MEMPHIS_LIFT), the bullet time darkened into the outro (DARKEN).
import { hash } from '../../../src/engine/random.ts';
import { fromV07, partBar, partFrame, v07Frame } from '../../../src/score/film.ts';
import * as D from '../../../src/score/drop2.ts';
import { FPS, FRAMES_PER_BEAT } from '../../../src/score/tempo.ts';
import { renderNewBars } from '../drop2Act2.mjs';
import { chipNoise, cowbell, gatedHit, marchSnare, musicBox, taiko, tambourine, tenor, timpani } from '../drop2Act2Voices.mjs';
import { MUSIC_BOX_FLAT, MUSIC_BOX_ON, renderBullet } from '../drop2Bullet.mjs';
import { WORLD_VOICES, bezelCrack, clank, crackStep, debris, paneTink, pushHit, renderWorlds, wallCreak, wallThud } from '../drop2Worlds.mjs';
import { boom, buzzLoops, chopGate, crush, gulp, rim, scrubAhead, shaker, slam, sweep, sweepBus, trackingCut, voxLine, wobble, wobbleLfo } from '../drop2Voices.mjs';
import { blip, clap, click, hat, impact, kick, pop, riser, snare } from '../drums.mjs';
import { Biquad, SVF } from '../filters.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, crash, reverseCymbal, spark, swarm, whoosh } from '../fx.mjs';
import { LIMIT_DB, limit } from '../limiter.mjs';
import { addMono, duck, panGains, pingPong, stereo, truncate } from '../mix.mjs';
import { pluckBass, pulseArp, supersaw } from '../synth.mjs';
import { VOICINGS } from './drop1.mjs';

/** The music stops dead on the freeze (S5), comes back for the bullet time and stops again for the hand-off's zero: the plate restarts at each. */
export const CUTS = [D.CRASH, D.BULLET.from, D.ZERO.from];
/**
 * The freeze (S5, drop2 19.3 → 19.4&) is silent but for the post bus (the CRT, the sort, the ring ticks) and finish()'s stuck buffer;
 * the hand-off (ZERO, the last 16th before the ending) is digital zero, post bus and all.
 */
export const SILENCES = [{ from: D.SILENCE_S5.from, to: D.SILENCE_S5.to }, { from: D.ZERO.from, to: D.ZERO.to }];
/**
 * Drop 2's own buses: the master sweep and the crusher act on the four music buses; `d2air` carries the whooshes and the spray; `d2dry`
 * Defender (the bible's M9: the virus wet, the antivirus dry — its sends ≤ 0.05).
 */
export const SENDS = { d2chords: 0.4, d2music: 0.3, d2vox: 0.4, d2bass: 0, d2air: 0.22, d2dry: 0.03 };
/**
 * drop2 1.1's slam (sheet §4.0, +3 LU over the held breath at the same true peak): the finished mix of drop 2's first beat driven `db` into a
 * soft clip at the ceiling (drop2Voices.mjs slam), full until drop2 1.2 and easing back to the mix by 1.3. Music fix round 1 (R5): 2.1 →
 * 2.2 dB (with TOP.pre and the drive), so drop 2's first beat goes −7.40 → −7.28 LUFS momentary and stays ≥ cosmos 1.1 + 1.8 LU while the
 * cosmos's downbeat moves (−9.15 … −9.34 on 2026-10-02: +1.87 … +2.06), and 10.1 stays 0.35 LU over it. 2.2 → 2.35 dB on 2026-10-02: without the
 * pads under it the first beat fell to cosmos 1.1 + 1.78 LU. v08 (LANDING): 2.35 → 0 dB, off (finish() skips a slam of 0 dB) — the
 * landing read as a blast; its first beat is −8.5 LUFS now (cosmos 1.1 + 0.9, the fake drop's 8.2 + 2.5).
 */
export const SLAM ={ from: D.DROP2_START, to: D.BLADES[1], out: D.BLADES[2], db: 0 };
/**
 * v08, the landing out of the fake drop (the v07 review: after the slingshot the volume and the white noise
 * blast). Measured on v07's mix (scripts/audio/perceived.mjs, the plan's FW7): drop2 1.1 jumped out of the digital zero to −6.5 LUFS in its
 * first 100 ms, a broadband burst (spectral flatness 0.29) whose band over 6 kHz was 10 dB over the slingshot's: the impact's noise layer
 * and the film's spray (each −21 dB over 6 kHz, dry), the biggest crash of the film (0.5), the slam's +2.35 dB soft clip and the drive into
 * the group clip. Now the drop lands by its weight and its notes — the kick, the boom (the impact's tonal body: drop2Voices.mjs boom), the
 * sub, the sung IV, the stab, the hook — and the film's spray is FALL's glass: a pane tink per droplet down the IV's arpeggio (FALL's
 * notes a semitone up, as the mirror trap rings them; drop2Worlds.mjs paneTink), across the frame with the torn text. The slam is off
 * (SLAM.db 0), 1.1's crash `crash` (0.5 before), the drive into the group clip climbs by the beat (LANDING_DRIVE) and the air blooms in
 * (BLOOM). (A two-band clip as 10.1's was tried and dropped: its low band took 4 dB of the landing's weight.) The digital zero before it
 * (the joke) is untouched.
 */
export const LANDING = {
  boom: 0.36,
  crash: 0.3,
  /** The sung IV on 1.1 (0.24 before v08): the landing's body in the band the ear weighs most, where the noise was. */
  sung: 0.36,
  /** The droplets' panes: frames from 1.1 (the 32nd grid), MIDI (A♯6 F♯6 D♯6 B5 A♯5 F♯5 D♯5), pan, gain. */
  panes: [[0, 94, -0.7, 0.07], [3, 90, -0.45, 0.065], [6, 87, -0.2, 0.06], [9, 83, 0.05, 0.055], [12, 82, 0.3, 0.05], [15, 78, 0.5, 0.045], [18, 75, 0.7, 0.04]],
  paneDecayMs: 260,
  paneClick: 0.15,
};
/**
 * v08: the landing blooms (BLOOM) — over the finished mix, the band over `hz` starts `db` down on 1.1 and opens to the mix by `to` (a
 * raised cosine), so the drop's first beat hits with its lows and mids and its air arrives over two beats instead of all at once out of the
 * digital zero. A zero-phase high shelf (forward and back at half the gain each) crossfaded by the bloom's weight; nothing before 1.1 or
 * from `to` on changes.
 */
export const BLOOM = { from: D.DROP2_START, to: D.DROP2_START + 2 * FRAMES_PER_BEAT, hz: 4000, db: -3 };
/** v08: the landing's drive into the group clip (DRIVE's first keys, dB, each eased in over an 8th): 1.1, 1.2, then act 1's level on 1.3. */
export const LANDING_DRIVE = [
  { at: D.DROP2_START, db: 0.9 },
  { at: D.DROP2_START + FRAMES_PER_BEAT, db: 1.5 },
  { at: D.DROP2_START + 2 * FRAMES_PER_BEAT, db: 2.15 },
];
/**
 * The second slam (the bible §4.7): drop2 10.1, the burst into act 2, the film's loudest beat — full to 10.2, back by 10.3. Music fix round
 * 1: 2.6 → 2.7 dB, so 10.1 stays ≥ 1.1 + 0.3 LU (with margin) under the lighter drive.
 */
export const SLAM_BURST = { from: D.BURST, to: D.BURST + FRAMES_PER_BEAT, out: D.BURST + 2 * FRAMES_PER_BEAT, db: 1, hz: 250 };
// v07 (§3, the review: a short, heavy hit at the wave's start read as noise): 3 → 1 dB, and only above `hz` (slamAbove): the soft clip after
// the limiter was one of the wave-start's noises (with the impact, the foam, and the kick driven into the group clip) — its curve, ridden
// by the kick's and the ō-daiko's 41–46 Hz, modulated everything above them (at 1 dB still ≈ −22 dB of the kick's fuzz in 0.8–3 kHz). The
// band under `hz` is turned up `db` with it, unclipped; 10.1 is loud by its arrangement now.
/**
 * 10.1's slam ends in a low-pass (zero-phase, `poles` in all, at `hz`; faded in and out over `fadeMs` inside the slam, so nothing before it
 * changes): its soft clip throws splatter over 16.5 kHz that renderDrop2's TOP cannot reach (finish() runs on the finished mix), and on
 * 10.1& (an open hat, the hook's koto and the wave's plucks on the slammed beat) the delivery's AAC rang over its ceiling there: since
 * the wave went Edo (2026-10-03), +0.8 dBTP in both of the test's encodes and 4 in 10 over −1.55 across ten (0 in 10 with the cut).
 */
export const SLAM_TOP = { hz: 16500, poles: 8, fadeMs: 5 };
/**
 * The arcade and the well (12–13) lifted at the top on the finished mix (the whole-film mix pass, 2026-10-03): when the club was
 * restyled (house piano, horns, its hats' air) drop 1's centroid rose, and the 8-bit world fell to 0.906 × / 0.899 × drop 1's (the bible's
 * floor is 0.95 ×). It is short of the top octave (8–16 kHz held 21 % of its magnitude against drop 1's 28 %; its mids are already
 * brighter), so it gets a zero-phase high shelf of `db` at `hz` over its two bars (forward and back at half the gain each, so no phase
 * moves), faded in and out over `fadeMs` inside them; nothing outside them changes. A tone control, not a voice: the arrangement is as
 * built, its LFSR hats and chip squares just a little more open (+1.75 dB: 0.971 × / 0.963 ×). Then the same window's top is cut at
 * `top` (zero-phase, as SLAM_TOP): what the shelf lifted over 17.5 kHz is the clip's splatter, which made the delivery's AAC ring in
 * bar 13 (−1.46 dBTP in the test's KX-Drop2 encode with the shelf alone; ≤ −2.0 with the cut).
 */
export const ARCADE_TOP = { from: partFrame('drop2', 12), to: partFrame('drop2', 14), hz: 6000, db: 1.75, fadeMs: 20, top: { hz: 17500, poles: 8 } };
/** The stuck buffer's buzz starts a 16th after the freeze (iteration 2, ruling 12): the drop's plink is the crash's own sound. Frames. */
export const BUZZ_DELAY = 6;
/**
 * The stuck buffer's first loop (dB under the music it replays; the rest step down from it): since the bed went (2026-10-02) the stuck bar
 * is driven ≈ 3 dB harder (MAKEUP), so its replay starts 3 dB down — as loud as v09's, and under the ceiling over the post bus's crash.
 */
export const BUZZ_DB = -3;
/**
 * M3, the wall smash on drop2 7.3& (2026-10-02): the gains of its voices (drop2Worlds.mjs wallCreak, wallThud, bezelCrack, debris)
 * and the duck of the music under it — down `db` in `attackMs`, held `holdMs`, back with `releaseMs` (gone well before the FATAL of 7.4,
 * 200 ms later). W (2026-10-03): the thud 0.75 → 0.85 and the crack 0.9 → 1.2 (1.6 since the fix round, over the pushes' clanks), so
 * the snap stays over the pushes before it (PUSHES) in every band — overall, under 200 Hz, in 1–6 kHz and in 2.5–5 kHz.
 */
export const WALL = { creak: 0.8, thud: 0.85, crack: 1.6, debris: 0.9 };
export const WALL_DUCK = { db: -6, attackMs: 2, holdMs: 40, releaseMs: 25, buses: ['d2chords', 'd2music', 'd2vox', 'd2bass', 'sub'] };
/**
 * W, the stages of drop2 bar 7 (2026-10-03; measured on drop2-wip-v09: the bar's front lands on 7.1, surges 590 px over
 * 7.2 → 7.2 + 5, runs into the wall from 7.2a and hits it on 7.3, bows it out to + 3; then the snap): a push on each (drop2Worlds.mjs
 * pushHit), heavier and higher each — its body on the iii chord's A♯1, C♯2, E♯2, its crunch 1.15 → 1.65 → 2.35 kHz (the snap's crack
 * rings at 2.6 kHz and over), the music ducked `duckDb` (PUSH_DUCK's shape) out of a gap `gapDb` deep (GAP) — and pushed right with
 * the wall; its clank on `clank` (MIDI: A♯5, C♯6, E♯6) at `clankGain` (drop2Worlds.mjs clank). The third's tail is the wall's creak
 * (wallCreak, following the bow). The snap (WALL) stays the biggest hit, its duck (−6 dB) deeper than the heaviest push's (−4), its gap
 * (SNAP_GAP, −12) deeper than the third's (−8).
 */
export const PUSHES = [
  { at: D.SURF[0], freq: 58.27, crunch: 1150, gain: 0.36, crunchGain: 1.4, tailMs: 140, duckDb: -1.5, gapDb: -4, clank: 82, clankGain: 0.42, pan: 0.1 },
  { at: D.SURF[1], freq: 69.3, crunch: 1650, gain: 0.46, crunchGain: 1.3, tailMs: 140, duckDb: -2.5, gapDb: -6, clank: 85, clankGain: 0.42, pan: 0.25 },
  { at: D.BOW, freq: 87.31, crunch: 2350, gain: 0.56, crunchGain: 1.1, tailMs: 0, duckDb: -4, gapDb: -8, clank: 89, clankGain: 0.44, pan: 0.4 },
];
/**
 * W's fix round (the checker, 2026-10-03: in the finished mix the pushes added energy the group clip and the limiter took back — 7.2 stayed
 * the loudest stage, the 40 ms ducks left no dip in 100 ms loudness — so the ear could not count them): contrast instead of energy.
 *   GAP: before each stage (its last 32nd, from `frames` before it) all of drop 2 but the post bus — the music, the drums and the crash's
 *   tail, the ticks, the air — drops PUSHES' `gapDb` (−4, −6, −8 dB; SNAP_GAP before the snap: the deepest), in `attackMs`, and is
 *   back on the hit (`releaseMs`, ending on its sample), so each stage lands out of a deeper hole.
 *   PUSH_DUCK: under each push the music buses stay down `duckDb` for `holdMs` (WALL_DUCK held 40 ms: no dip a listener hears), the
 *   giving way heard; where a duck meets the next gap the deeper wins.
 *   Each push's clank (drop2Worlds.mjs clank): a pitched, bitcrushed steel clank climbing the iii chord (A♯5 → C♯6 → E♯6; PUSHES
 *   `clank`, `clankGain`), most of it in 2.5–5 kHz where the kick, the crash and the clap leave room; the snap's crack tops it.
 */
export const GAP = { frames: FRAMES_PER_BEAT / 8, attackMs: 4, releaseMs: 1.5 };
export const SNAP_GAP = { db: -12 };
export const PUSH_DUCK = { attackMs: 2, holdMs: 120, releaseMs: 25 };
/**
 * The border's crack widens a cell a 16th from the clap (7.2e, 7.2&, 7.2a; the front gains 40 px with each): a crack step, higher and
 * louder each — raised 12–14 dB in the fix round (at 0.07–0.1 they sat 8–13 dB under the rest in 2–5 kHz, under the odometer's ticks).
 */
export const CRACK_STEPS = [6, 12, 18].map((d, k) => ({ at: D.CRACK + d, freq: [2700, 3200, 3800][k], gain: [0.36, 0.38, 0.4][k] }));
/** E8's skip (iteration 2, ruling 12): 40 ms of drop2 6.4 reversed at −6 dB in place of the bed, then 30 ms of silence. */
export const SCRUB_SKIP = { ms: 40, db: -6, gapMs: 30 };
/**
 * E10's whistle (iteration 3; verify: still 12.9 dB under the rest of the mix in its band, masked): its gain, and the duck of the bed
 * under it — a cut gliding with it (drop2Voices.mjs trackingCut, 2400 → 600 Hz over DRIP–CRASH) on the music buses (the pads, the
 * arp and stabs, the scream), so the race keeps its lows, its drums and its air while the drop is heard falling through it.
 */
export const WHISTLE = { gain: 0.2, from: 2400, to: 600 };
export const WHISTLE_DUCK = { db: -6, q: 1.2, fadeMs: 20, buses: ['d2chords', 'd2music', 'd2vox'] };
/** Seams as their own WAV, spectrogram and loudness entry (film bars): the fake drop into drop2 1; the kernel → the switch → act 2; the crash into the ending. */
export const PREVIEWS = [
  { id: 'drop2-seam', fromBar: partBar('break', 7), toBar: partBar('drop2', 1) },
  { id: 'drop2-switch', fromBar: partBar('drop2', 8), toBar: partBar('drop2', 10) },
  { id: 'drop2-crash', fromBar: partBar('drop2', 18), toBar: partBar('outro', 1) },
];

// ——— v07, the continuity plan (docs/2026-10-03-continuity-plan-v07.md, WP2): drop 2's seams heard as one song ————————————————————————
/**
 * The hook's voices (FW1, the one melodic spine): every kind that sings or plays the hook, for the seam checks' hook level per bar. The
 * koto's kind is every koto statement of it — the kernel's ghost on the dominoes (8), the spill's head (9.4) and the wave's rows (10–11).
 */
export const HOOK_KINDS = ['d2lead', 'd2harmony', 'd2kfrag', 'd2koto', 'd2chip', 'd2voxhalf', 'd2brass', 'd2octaves', 'd2climb', 'd2glide', 'd2stutter', 'd2musicbox'];
/**
 * The voice behind kinds named for their picture event (FW3: a voice that arrives early or rings on carries the seam, whatever its
 * event is called). Kinds not listed are their own voice.
 */
export const VOICE_OF = {
  d2gliss: 'koto', d2infect: 'koto', d2koto: 'koto',
  d2block: 'hyoshigi', d2ki: 'hyoshigi',
  d2taiko: 'taiko', d2odaiko: 'taiko',
  d2hat: 'hats', d2shaker: 'hats', d2openhat: 'hats', d2chipshaker: 'hats', d2tamb: 'hats',
  d2tenor: 'drumline', d2drumline: 'drumline', d2timpani: 'drumline',
  d2orchrev: 'orch', d2orch: 'orch',
  // Defender's dry squares on C (the install's 32nds carry his voice into the switch, 4224).
  d2install: 'defender', d2v2ready: 'defender', d2figure: 'defender', d2scannote: 'defender', d2bytes: 'defender', d2alarm: 'defender',
  // FALL's glass: the hinge's tones and shimmer (15.4&) are the mirror trap's panes arriving early (4896).
  d2shimmer: 'glass', d2light: 'glass', d2pane: 'glass', d2mirror: 'glass',
  d2heart: 'heart', d2musicbox: 'music box',
};
/**
 * Seam 4704 (v07): the arcade's chip kit (its LFSR hats, its chip shaker) carries `frames` into Memphis, fading out as Memphis's hats come
 * in, and the tambourine fades in under it (at 14.1 it is `tamb` down: 1 − tamb of its level).
 */
export const CHIP_CARRY = { frames: 2 * FRAMES_PER_BEAT, tamb: 0.5 };
/**
 * Seam 4800 (v07): the drumline arrives on 14.4 — its tenors on the fill's three 16ths (`tenors`, Hz: B3 F♯3 D♯3, at `tenorGain`) and its
 * snare roll on the grid's 32nds into 15.1 (`roll`: its first and last level).
 */
export const DRUMLINE_IN = { tenors: [246.94, 185.0, 155.56], tenorGain: 0.42, roll: [0.12, 0.24] };
/**
 * Seam 5376 (v07): the music box's hanging C♯6 comes back after the zero as a ghost on the outro's downbeat, `db` under the tine (its
 * flattened pitch, MUSIC_BOX_FLAT's last), ringing `decay` s and gone in `frames` (a beat): dry, on the post bus, over the outro's
 * e-piano IV (top voice C♯5).
 */
export const MUSIC_BOX_GHOST = { db: -12, decay: 0.16, frames: FRAMES_PER_BEAT };
/**
 * FW4, the same room across a line (v07): side gain ramps on the finished mix (finish(); the plate's room included). Each { keys }: [frame,
 * dB] points, linear in dB between them, 0 dB outside the first and last; fitted to the mix's own width a beat either side of the seam
 * (its side/mid, a beat's mean, within 3 dB of the next beat's; the width a curve through the seam, not a step on its downbeat):
 *   4224: the kernel's hang narrows a little sooner and the switch's first beat opens a little (it fell 8.7 dB on 9.1);
 *   4320: the spill opens as the amber copies pour out of the boxes, and the wave's first 8th opens from there (+9.4 dB on 10.1);
 *   4512, 4704: a beat's lean either side (+4.0, −4.0 dB);
 *   4896: the width opens over the 15.4 timpani roll instead of on 16.1 (+7.9 dB: the roll was narrow to its last 16th, 16.1 wide at once;
 *   the side's gain turns down on 16.1 where the bells and the crash come in, so the width itself does not jump);
 *   5376 (the plan): the space collapses with the picture's condense, −6 dB over 5352 – 5364 and held to the zero.
 * The frames are the 61-bar v07 map's, where they were fitted (drop 2 on 3456–5375); fromV07 moves them with drop 2 (v08: +96, after
 * bridge A), and the last seam is drop 2's end (DROP2_END: the outro's downbeat then, bridge B's now).
 */
const v07Keys = (keys) => keys.map(([f, v]) => [fromV07(f), v]);
export const WIDTH_RAMPS = [
  { seam: fromV07(4224), keys: v07Keys([[4194, 0], [4206, -4], [4218, -5], [4224, -1], [4230, 3], [4236, 4], [4254, 0]]) },
  { seam: fromV07(4320), keys: v07Keys([[4290, 0], [4302, 4], [4312, 6], [4319, 0], [4326, -3], [4332, -4], [4338, -4], [4356, 0]]) },
  { seam: fromV07(4512), keys: v07Keys([[4488, 0], [4500, 2], [4506, 0], [4518, 0], [4524, -2], [4536, 0]]) },
  { seam: fromV07(4704), keys: v07Keys([[4680, 0], [4692, -2], [4698, 0], [4710, 0], [4716, 2], [4728, 0]]) },
  { seam: fromV07(4896), keys: v07Keys([[4872, 0], [4884, 5], [4895, 6], [4896, -4], [4908, -3], [4920, 0]]) },
  // v08: held to the hand-off's zero, now bridge B's last 16th (D.ZERO), so the width does not spring back under the bridge.
  { seam: D.DROP2_END, keys: [...v07Keys([[5352, 0], [5364, -6]]), [D.ZERO.from, -6]] },
];
/**
 * FW4, the same room across a line (v07): the tonal balance under `hz` (the kick, the sub, the drums' bodies), ramped on the finished mix
 * (zero-phase: the band under `hz` split off and its gain moved, keys [frame, dB] as WIDTH_RAMPS's), so the power-weighted centroid of
 * the beat either side of a seam moves ½ octave or less (FW4) where the worlds' own balance jumped:
 *   4224: the kernel's hang a little fuller and the switch's half-time downbeat a little lighter under 250 Hz (−1.18 octave);
 *   4320: the spill's held breath a little lighter under it (+0.58: the wave's downbeat, its drums' low band clipped on its own, is bright);
 *   4512: Defender's downsample thins the wave's lows as it quantises it (+0.74 into the 8-bit arcade);
 *   4704: the voxel well's line clear a little heavier and Memphis's landing a little lighter (−1.30 into the totem's slap bass).
 * At each line the gain changes with the new world's first hit (its downbeat), never inside a held sound.
 */
export const TONE_RAMPS = {
  hz: 250,
  ramps: [
    { seam: fromV07(4224), keys: v07Keys([[4188, 0], [4200, 2], [4223, 2], [4224, -3], [4236, -3], [4248, 0]]) },
    { seam: fromV07(4320), keys: v07Keys([[4296, 0], [4302, -2.5], [4317, -2.5], [4320, 0]]) },
    { seam: fromV07(4512), keys: v07Keys([[4482, 0], [4494, -3], [4511, -3], [4512, 0]]) },
    { seam: fromV07(4704), keys: v07Keys([[4674, 0], [4686, 3], [4703, 3], [4704, -2], [4716, -2], [4728, 0]]) },
  ],
};
/**
 * Seam 5376 (v07, FW4: the outro starts dark — the heart, the e-piano — under drop 2's glass): as the space collapses, the finished mix
 * closes a low-pass over 20.4 (`from` → `to`, `hz` → its last), so the music box and the crown are already in the outro's room when the zero
 * comes.
 */
export const DARKEN = { from: fromV07(5346), to: fromV07(5370), hold: D.ZERO.from, hz: [16000, 2200] }; // v07 frames (fromV07: they move with drop 2); v08: held at its last through bridge B to the zero
/**
 * Seam 4704 (v07): Memphis's 2.5–8 kHz (its presence) on the finished mix: a band gain (dB, zero-phase high shelves at `lo` up and `hi`
 * back down; `keys` [frame, dB] as WIDTH_RAMPS's) — the voxel well's last 32nds a little under, Memphis's landing lifted most and the bar
 * kept a little brighter to its end (faded out over `fadeMs` before 15.1) — so the band stays within 6 dB across the seam.
 */
export const MEMPHIS_LIFT = { keys: v07Keys([[4680, 0], [4698, -3], [4703, -3], [4704, 8], [4728, 6], [4796, 5], [4800, 0]]), lo: 2500, hi: 8000 }; // v07 frames (fromV07)
/**
 * §3 (v07): 10.1's beat lifted `db` on its voices' buses — the music buses and the Edo one-shots' (the fx bus: the blocks' hyoshigi, the
 * tsuzumi; the chime bus: the ink's koto) — in over the spill's last 8th, held to 10.2, out over its 8th: the beat is loud by its voices,
 * the drums (the kick, the ō-daiko) and the sub as they were.
 */
export const BURST_LIFT = { db: 3.8, from: D.BURST - 12, full: D.BURST, hold: D.BURST + FRAMES_PER_BEAT, to: D.BURST + FRAMES_PER_BEAT + 12, buses: ['d2chords', 'd2music', 'd2vox', 'd2bass', 'fx', 'chime'] };

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const SIXTEENTH = FRAMES_PER_BEAT / 4;
const steps = (a, b, step) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
export { WORLD_VOICES };
/** Drop 2's bar `bar` (1-based) and beat (0-based): part-local, so drop 2 moves with its part. */
const bar2 = (bar, beat = 0) => partFrame('drop2', bar, beat);
/** Whether frame `f` lies in drop 2's bar `bar`. */
const inBar = (f, bar) => f >= bar2(bar) && f < bar2(bar + 1);

/**
 * The upper voices of each chord (the roots go in the sub): drop 1's VOICINGS + 1 — Bmaj9 · C♯9sus4 · C♯9 · A♯m9 · D♯m9 — and the
 * antivirus's borrowed chords, voice-led from the chord before (no voice moves more than 3 semitones): ♭VI D(add9), iv Bm(add9), V7♭9
 * (C♯7♭9), ♭VII E(add9), V7 (C♯9).
 */
export const VOICINGS2 = {
  ...Object.fromEntries(Object.entries(VOICINGS).map(([name, v]) => [name, v.map((m) => m + 1)])),
  bVI: [62, 64, 66, 69],
  iv: [61, 62, 66, 71],
  V7b9: [62, 65, 68, 71],
  bVII: [64, 66, 68, 71],
  V7: [63, 65, 68, 71],
};
/** The chord's root for the sub (B1, C♯2, A♯1, D♯2; D2, B1, C♯2, E2, C♯2): drop 1's + 1 and the borrowed chords'. */
export const ROOT2 = { IV: 35, Vsus: 37, V: 37, iii: 34, vi: 39, bVI: 38, iv: 35, V7b9: 37, bVII: 40, V7: 37 };
/** The chord sounding at `frame` (the score's HARMONY2). */
export const chordAt2 = (frame) => {
  let name = D.HARMONY2[0].chord;
  for (const c of D.HARMONY2) if (c.at <= frame) name = c.chord;
  return name;
};
/** F♯ major's pitch classes, from its tonic. */
export const SCALE = [6, 8, 10, 11, 1, 3, 5];
/** The note a diatonic third below `m` in F♯ major (the hook's harmony). */
export const thirdBelow = (m) => {
  const i = SCALE.indexOf(((m % 12) + 12) % 12);
  if (i < 0) throw new Error(`drop2: ${m} is not in F♯ major`);
  const below = SCALE[(i + 5) % 7];
  return m - (((((m % 12) - below) % 12) + 12) % 12);
};
/** The blades' shings (S27, sheet §6.5): F♯6 A♯6 C♯7 D♯7 F♯7, panned around the frame. */
export const BLADE_NOTES = [90, 94, 97, 99, 102];
const BLADE_PANS = [-0.4, 0.5, -0.6, 0.3, 0.6];
/** The world rings of the reel and the reel blades' shings: G♯6 B♯6 D♯7 G♯7. */
export const RING_NOTES = [92, 96, 99, 104];
/** The FM pops on the conveyor's march kicks (drop2 4; with ZBUF2 live, from the 3.4 re-form): C♯6 E♯6 G♯6 B6. */
export const MARCH_NOTES = [85, 89, 92, 95];
/** The reel's stutter: the hook's first syllable on 8ths, then 16ths, a step higher each beat (D♯6 E♯6 F♯6 G♯6). */
export const STUTTER = [
  { at: D.VOX_STUTTER.from, every: 12, midi: 87 },
  { at: D.CUTS2[1], every: 12, midi: 89 },
  { at: D.CUTS2[2], every: 6, midi: 90 },
  { at: D.CUTS2[3], every: 6, midi: 92 },
];
/**
 * The fader on drop 2's four music buses (dB, from each key's frame, eased in over an 8th; the bible §6.3 lever 2: at most +3 dB over the
 * as-built mix). Act 1 as built (+0.6 from the overflow, +0.6 more over the reel to the stuck bar); the kernel holds the overflow's; the
 * switch dips by its arrangement; act 2 stands above act 1 (the bible: ≥ act 1 + 0.3 LU). 2026-10-02 (the bed gone): act 2's worlds a
 * little higher each (the wave 2.0 → 2.4, the arcade and the well 1.8, Memphis 2.4, the pictograms 2.8, the stack 1.8), so each world's
 * own voice and hook are heard without a pad to sit on.
 */
export const FADER = [
  { at: D.DROP2_START, db: 0 },
  { at: D.SURF[0], db: 0.6 },
  { at: D.SWITCH.from, db: 0 },
  // v07 (§3): the wave's level reached by the downbeat (eased in over the spill's last 8th; it was eased in from 10.1 itself). The burst's
  // own lift is BURST_LIFT.
  { at: D.BURST - 12, db: 2.4 },
  { at: bar2(11), db: 2.8 },
  { at: D.ARCADE.from, db: 1.8 },
  { at: D.TOTEM, db: 2.8 },
  { at: D.PICTO, db: 3 },
  { at: bar2(16), db: 2.2 },
  { at: D.REEL.from, db: 0.6, rampTo: { at: D.LATCH, db: 1.2 } },
];
/** The fader's gain (dB) at frame `f`. */
export const faderDb = (f) => {
  let db = 0;
  let prev = 0;
  for (let k = 0; k < FADER.length; k++) {
    const key = FADER[k];
    if (f < key.at) break;
    if (key.rampTo && f >= key.rampTo.at) {
      db = key.rampTo.db;
      continue;
    }
    if (key.rampTo) {
      db = key.db + (key.rampTo.db - key.db) * ((f - key.at) / (key.rampTo.at - key.at));
      continue;
    }
    const before = k ? (FADER[k - 1].rampTo ? FADER[k - 1].rampTo.db : FADER[k - 1].db) : 0;
    prev = before;
    db = prev + (key.db - prev) * Math.min(1, (f - key.at) / 12);
  }
  return db;
};
/**
 * The stabs' rhythm (drop 1's), in 16ths of a bar, and drop 2's bars that play them (as built: 1, 2, the game, the overflow, the reel; new:
 * the crane, the kernel, the stack). Memphis's chord voice is its marimba (drop2Worlds.mjs), so 14 is no longer one of them.
 */
const STABS = [0, 3, 6, 8, 10, 13];
const STAB_BARS = [1, 2, 5, 6, 7, 8, 16, 17, 18];
const VOWELS = ['a', 'i', 'u', 'e', 'o'];
/** The kana あ い う え お the game's VOX lane sings on drop2 5 (VOX_KANA). */
const KANA = ['a', 'i', 'u', 'e', 'o'];
/** The 8-bit arp's pattern over the voicing and its duty cycle. */
const PATTERN = [0, 1, 2, 3, 2, 1, 3, 1];
const DUTIES = [0.125, 0.25, 0.5, 0.25];
/** drop2 19's racing heart: the kicks' gains, one per eighth. */
const HEART = [0.5, 0.55, 0.6, 0.62];
/** Each crash's gain: the drop's (and the burst's) the biggest, full on the worlds' downbeats, lighter on drop2 2.1 and 4.1 (§6.5). */
const CRASH_GAIN = (f) => (D.LIGHT_CRASHES2.includes(f) ? (f === D.LIGHT_CRASHES2[0] ? 0.22 : 0.24) : f === D.BURST ? BURST_CRASH.gain : f === D.DROP2_START ? LANDING.crash : D.BIG_KICKS2.includes(f) ? 0.36 : 0.3);
/** 10.1's crash (0.5, as 1.1's, before v07). */
export const BURST_CRASH = { gain: 0.5 };
/** The sort's chatter: the V chord's tones (C♯ E♯ G♯ B), octaves 6–7, one per row being sorted. */
const SORT_NOTES = [85, 89, 92, 95, 97, 101, 104, 107];
/**
 * Width (the bible §6.3 lever 6: "for size, not for LUFS"; correlation over the section 0.70–0.78): an M/S rotation of the `buses` over
 * drop 2's bars [from, to) (widen(): in the band above `hz` the side raised by `db`, the mid lowered by what keeps each bar's K-weighted
 * power where it was — so it costs no LUFS; music fix R7, which replaced a side lift that added power: +1.5 dB of it pushed the loudest
 * bar from −7.80 to −7.71). The drums, the vocals, the bass, the sub, the air and Defender's dry bus keep their image.
 */
export const WIDTH = { db: 3, hz: 300, from: 10, to: 18, buses: ['d2chords', 'd2music'] };

/** WIDTH's last run, for QA and tests: per bus of `buses`, the gain on the mid's high band per bar (dB; widen()). */
export const WIDTH_REPORT = { mid: [] };
/**
 * The group's clip (clipGroup() below; the bible §6.3, levers 1, 2 and 5): drop 2's buses summed as the master will sum them, and that
 * sum's sample peaks bent softly under `ceiling` (linear, before the plate and the master's limiter) from `kneeDb` under it — one gain per
 * sample on every bus alike, so it acts on the transients only (measured: over 1 dB on about 2 % of the samples). The master's limiter
 * then meets a lower crest and stops pulling the 80 ms after every kick down: the beat stands up instead of pumping. It replaces a
 * 10 ms-release glue limiter that bought the same loudness with 6 dB of gain reduction all the time (crushed, not loud).
 */
export const CLIP = { on: true, ceiling: 0.9, kneeDb: 3, lookMs: 0, releaseMs: 0 };
/**
 * v07 (§3, the wave-start noise): over 10.1's two beats the group clip works in two bands, split at `hz` (above the kick's 215 Hz start) —
 * the low band (the kick, the ō-daiko's 41 Hz, the sub) bent on its own peaks (`low`; the two together stay near the group's ceiling), the
 * band above on its own (`high`, a little over the group clip's knee and ceiling: the two together near the master's) —
 * faded in over `fadeInMs` from the downbeat itself (the split is zero-phase: started any earlier, the bands' different gains would let
 * the low band's smear sound before 10.1) and out over `fadeMs`. In one band the low drums, swinging ±0.7 under the whole beat, set the clip's gain at their pitch and it
 * rode every bright bus with it (sidebands on the koto, the shamisen and the voices: the "fuzz" in 0.8–3 kHz); split, they only bend
 * themselves (harmonics at 80–250 Hz: a thicker drum) and the music keeps its own headroom.
 */
export const BAND_CLIP = [{ from: D.BURST, to: D.BURST + 2 * FRAMES_PER_BEAT, hz: 250, low: { knee: 0.25, ceiling: 0.35 }, high: { knee: 0.7, ceiling: 0.95 }, fadeInMs: 1, fadeMs: 8 }];
/**
 * The make-up (dB, over drop 2 to the freeze, before the fader's music buses meet the clip): the loudness the bed took with it (the pads were
 * the loudest thing in drop 2), given back to the voices that stayed — the drums, the hook and the worlds' chord voices — so drop 2 stays
 * ≥ drop 1 + 1.5 LU without a held chord. And the kick 1.5 dB lower into a drive about as much harder (KICK_DB, DRIVE): its peak meets the
 * clip where it did, the rest of the beat comes up under it.
 */
export const MAKEUP = { drums: 1.5, d2chords: 2, d2music: 2, d2vox: 3 };
/**
 * Act 2's grooves (10–17: the taiko, the chip kit, the 80s kit, the drumline, the stack) this much more (dB), the kick excepted: act 2
 * ≥ act 1 + 0.3 LU without the pads and choirs that used to carry it; the chip snares and the drumline spread wider (±0.35, ±0.4).
 * The body hits take it all (the taiko, the snares and claps, the chip snares, the gated toms, the drumline's accents, the cowbell); the
 * air of the kit only ACT2_AIR_DB (the hats open and closed, the shaker, the tambourine, the crashes, the drumline's 16ths between its
 * accents): at +3 they filled the 6–16 kHz band the air bed had left (+3 dB there in 10–11 against v09, 97 % of it drums) and raised the
 * floor between the hits — hissier and busier, against FALL's space (checker, 2026-10-02). The arcade and the well (12–13) keep their
 * whole kit at +3 (its LFSR hats and shakers, its crash): their band sat at v09's (−26.2 / −25.8 dB against −26.3 / −25.9), and it is the
 * 8-bit world's top (their centroids fell under 0.95 × drop 1's at +1).
 */
export const ACT2_DRUMS_DB = 3;
export const ACT2_AIR_DB = 1;
/**
 * Act 2's kick (dB over act 1's; the arcade and the well, whose air stays, as act 1): the loudness the kit's air gave back when it came down
 * to ACT2_AIR_DB (act 2 fell to act 1 + 0.26 LU), taken in the kick — the energy in the drums and the sub, not in the hiss.
 */
export const ACT2_KICK_DB = 1.5;
export const KICK_DB = -1.5;
/**
 * The drive into the clip (dB on every bus of drop 2, from each key, eased over an 8th): the part's loudness (the bible §6.3: drop 2
 * ≥ drop 1 + 1.5 LU at the same ceiling, no bar over −7.8, no beat over −6.8, the master's limiter ≤ 3 dB mean a bar) — act 1, the
 * switch the one dip (its spill lighter still, 9.4 ≤ −10), act 2 a plateau a little over act 1 (≥ +0.3 LU) whose worlds are each held
 * level, the mirror trap and the reel a touch under it (they stack the most). Music fix round 1 (R6): the two loudest bars, 10 (from 10.2:
 * the burst's own beat keeps its drive) and 18, 0.15 dB under their neighbours, so neither sits on the −7.8 cap (they measured −7.801 and
 * −7.802); and every key 0.15 dB lower, what TOP.pre gave back (the clip and the limiter no longer spend headroom on the top octave).
 * 2026-10-02 (the bed gone): every key about 1 dB harder (the burst's at the bible's 3 dB; MAKEUP and ACT2_DRUMS_DB carry the rest), the
 * kick 1.5 dB lower into it (KICK_DB); 19 as built + 0.15, so the stuck buffer replays what it did. The overflow (7) and the arcade and
 * the well (12–13) ≈ 0.5 dB under their neighbours: there the delivery's AAC rang over −1.55 dBTP at the neighbours' drive.
 * The whole-film mix pass (2026-10-03): the arcade and the well 2 → 2.5 dB. ARCADE_TOP's shelf met the limiter and cost act 2 0.02 LU
 * (act 1 + 0.29); +0.5 dB here gives it back (+0.33). Through the delivery's trim (scripts/lib/encode.mjs DELIVERY_TRIM_DB) and
 * ARCADE_TOP's 17.5 kHz cut, bars 12–13 measured ≤ −2.0 dBTP in both of the delivery test's encodes.
 */
export const DRIVE = [
  // v08 (LANDING): the landing's drive climbs by the beat to act 1's 2.15 dB (it was 2.15 from 1.1's first 8th): drop 2 comes out of the
  // digital zero a little under its level and reaches it on 1.3 — with the bloom, a ramp in, not a slam — and its first two beats bend the
  // group clip less (it rode every bright bus with the kick and the boom).
  ...LANDING_DRIVE,
  { at: D.SURF[0], db: 1.85 },
  { at: D.KERNEL.from, db: 2.15 },
  { at: D.SWITCH.from, db: -0.1 },
  { at: D.SPILL[0], db: -0.9 },
  // v07 (§3): 10.1's beat 3 → 1.5 dB into the clip (its kick, driven, bent the group clip ≈ 4.6 dB deep and every bright bus with it),
  // reached by the downbeat (eased in over the spill's last 8th, as the fader; it was eased in from 10.1 itself, so the downbeat met −0.9).
  { at: D.BURST - 12, db: 1.5 },
  { at: D.BURST + FRAMES_PER_BEAT, db: 2.4 },
  // v07: bar 11 2.6 → 2.1 dB (the koto's louder hook and the Edo voices bend the clip enough there: its heavy share stays the bible's).
  { at: bar2(11), db: 2.1 },
  // v07: the arcade and the well 2.5 → 2.3 dB (the chip hook's 2 dB lift bent the clip there; its heavy share stays the bible's).
  { at: D.ARCADE.from, db: 2.3 },
  { at: D.TOTEM, db: 2.8 },
  { at: bar2(16), db: 2.2 },
  { at: D.REEL.from, db: 1.9 },
  { at: bar2(19), db: 0.9 },
];
/**
 * The top of drop 2 (to the freeze; 0 Hz: off): a low-pass (`poles` of Butterworth) at `hz` on every bus after the clip, and `pre` one
 * before it. The clip's bends and the shine put energy up to 24 kHz that the delivery's AAC strips, and its peaks ring over the ceiling
 * where it does: measured over four AAC block alignments, frames over −1.6 dBTP 15 → 5 at 18 kHz, for −0.05 LU (the bible §6.4's delivery
 * check: take high-frequency content out). Music fix round 1 (R1-T15, R6: the delivered AAC still peaked −1.553 dBTP in bar 2, −1.514 in
 * bar 6 in the film, 0.05 dB from the −1.5 limit, and widening made it worse): `pre`, an 8-pole cut at 16.5 kHz before the clip, takes
 * out the top octave the coder rings on (over ten encodes at five block alignments, the ten worst bars −1.38 → −1.65 dBTP on average with
 * the width on) and gives the clip and the limiter that headroom back (+0.05 LU); 16.5 kHz and up is air, not brightness: the bible's
 * centroid (to 16 kHz) moves 1.068 → 1.065 × drop 1's. After the clip the 4-pole at 18 kHz stays for its splatter. (8 poles after the clip
 * cost 0.05 LU: the steep filter rings and the limiter pays for it.)
 */
export const TOP = { hz: 18000, poles: 4, pre: { hz: 16500, poles: 8 } };
/** The biquads' Q of a Butterworth low-pass of 4, 6 and 8 poles. */
const BUTTERWORTH_Q = { 4: [0.5412, 1.3066], 6: [0.5176, 0.7071, 1.9319], 8: [0.5098, 0.6013, 0.9, 2.5629] };
/**
 * The first `ms` of drop 2 fade in (a raised cosine on every bus): its downbeat comes out of the fake drop's digital zero with every hit at
 * once (kick click, crash, impact, the spray's noise), and the delivery's AAC rang up to 1.5 dB over that onset at some block alignments
 * (measured: 0 and 2 ms fades fail at 2 of 6 alignments, 5 ms passes all six). 5 ms is under the kick's 3 ms click plus its first cycle.
 */
export const ONSET = { ms: 5 };
/** The clip's last run, for QA and tests: from sample `a`, the clip's own gain per sample (`clip`) and the whole gain, drive and clip (`gain`). */
export const CLIP_REPORT = { a: 0, clip: null, gain: null };
/** A table of { at, db } keys (each eased in over an 8th from the level before it) read at frame `f`. */
export const stepDb = (table, f) => {
  let db = 0;
  let before = 0;
  for (const key of table) {
    if (f < key.at) break;
    db = before + (key.db - before) * Math.min(1, (f - key.at) / 12);
    before = key.db;
  }
  return db;
};

/** Whether a frame is one of the v04 master's (a carried bar; src/score/drop2.ts CARRIED). */
const isCarried = (f) => D.v04Of(f) !== null;
/** The frame's place in the v04 master's drop 2 (its local frame there), for a carried frame. */
const v04Local = (f) => D.v04Of(f) - D.CARRIED[0].v04;
/**
 * A seed per event of `list`: a carried event keeps its as-built seed (`base` + its rank among the list's carried events, which is its
 * index in v04's list), a new bar's event takes a fresh one (`fresh` + its rank among the new ones).
 */
const carriedSeed = (list, base, fresh) => {
  const kept = list.filter(isCarried);
  const added = list.filter((f) => !isCarried(f));
  return (f) => (isCarried(f) ? base + kept.indexOf(f) : fresh + added.indexOf(f));
};

/**
 * The finished mix's edits (after bgm.mjs's limiter): the two slams (drop2 1.1 and 10.1: soft-clipped at the master ceiling and
 * re-limited under it, nothing before them changes), E8's scrub-ahead — a real skip on 6.3: the bed drops out for 40 ms of 6.4's own
 * audio, reversed, at −6 dB, then 30 ms of silence (SCRUB_SKIP) — and the stuck buffer on the freeze: a 16th after 19.3 (BUZZ_DELAY, so
 * the plink is the crash's sound) the last 3 frames before it replayed 8 times, each 2.5 dB quieter and darker, the only music in the
 * gated window; re-limited so it stays under the limit (LIMIT_DB; bgm.mjs limits the whole mix once more after every finish()).
 */
export function finish(L, R, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  // v08: 1.1 lands without a slam (LANDING: SLAM.db 0) and blooms (BLOOM).
  if (at(BLOOM.to) + Math.round(0.05 * sr) <= L.length) bloom(L, R, sr, at(BLOOM.from), at(BLOOM.to), BLOOM);
  for (const s of [SLAM, SLAM_BURST]) {
    if (!s.db || at(s.out) + Math.round(0.1 * sr) > L.length) continue;
    if (s.hz) slamAbove(L, R, sr, { from: at(s.from), to: at(s.to), out: at(s.out), db: s.db, ceilingDb: LIMIT_DB, hz: s.hz });
    else slam(L, R, sr, { from: at(s.from), to: at(s.to), out: at(s.out), db: s.db, ceilingDb: LIMIT_DB });
    if (s === SLAM_BURST) topCut(L, R, sr, at(s.from), at(s.out), SLAM_TOP);
    const [a, b] = [at(s.from), at(s.out) + Math.round(0.1 * sr)];
    limit(L.subarray(a, b), R.subarray(a, b), sr, { ceilingDb: LIMIT_DB });
  }
  scrubAhead(L, R, sr, { from: at(D.FULL_COMBO), to: at(D.SCRUB), ...SCRUB_SKIP });
  if (at(ARCADE_TOP.to) <= L.length) {
    topLift(L, R, sr, at(ARCADE_TOP.from), at(ARCADE_TOP.to), ARCADE_TOP);
    topCut(L, R, sr, at(ARCADE_TOP.from), at(ARCADE_TOP.to), { ...ARCADE_TOP.top, fadeMs: ARCADE_TOP.fadeMs });
  }
  // v07: Memphis's presence lifted (MEMPHIS_LIFT), and the width ramped across 4512, 4896 and into the zero (WIDTH_RAMPS).
  if (at(MEMPHIS_LIFT.keys[MEMPHIS_LIFT.keys.length - 1][0]) <= L.length) bandGain(L, R, sr, MEMPHIS_LIFT);
  for (const t of TONE_RAMPS.ramps) if (at(t.keys[t.keys.length - 1][0]) <= L.length) lowGain(L, R, sr, t.keys, TONE_RAMPS.hz);
  for (const w of WIDTH_RAMPS) if (at(w.keys[w.keys.length - 1][0]) <= L.length) sideRamp(L, R, sr, w.keys);
  // (It lets go over 1.5 ms ending on DARKEN.hold, the zero's first sample: nothing of it reaches the hand-off's digital zero. v08: the
  // sweep is v07's, ending 1.5 ms before DARKEN.to, then held at its last through bridge B to the zero.)
  if (at(DARKEN.hold) <= L.length) {
    const x = Math.round(0.0015 * sr);
    lowpassSweep({ L, R }, sr, at(DARKEN.from), at(DARKEN.to) - x, at(DARKEN.hold) - x, DARKEN.hz[0], DARKEN.hz[1]);
  }
  const from = at(D.CRASH);
  const start = at(D.CRASH + BUZZ_DELAY);
  const slice = from - at(D.CRASH - 3);
  if (start + 8 * slice > L.length) return;
  // The loops built on a copy of the slice and added at BUZZ_DB (buzzLoops adds them at full level, in place).
  const span = start + 8 * slice - (from - slice);
  const tl = new Float32Array(span);
  const tr = new Float32Array(span);
  tl.set(L.subarray(from - slice, from));
  tr.set(R.subarray(from - slice, from));
  buzzLoops(tl, tr, sr, { from: slice, slice, start: start - from + slice, loops: 8, stepDb: -2.5, lp: [12000, 2000], fadeMs: 1.5 });
  const g = 10 ** (BUZZ_DB / 20);
  for (let i = slice; i < span; i++) {
    L[from - slice + i] += g * tl[i];
    R[from - slice + i] += g * tr[i];
  }
  const a = from - Math.round(0.01 * sr);
  const b = Math.min(L.length, at(D.BULLET.from));
  limit(L.subarray(a, b), R.subarray(a, b), sr, { ceilingDb: LIMIT_DB });
}

/**
 * The slam (drop2Voices.mjs slam: `db` into a soft clip at the ceiling, eased back by `out`) on the band above `hz` only (SLAM_BURST.hz),
 * in place: the finished mix split zero-phase at `hz` (a 2-pole Butterworth low-pass run forward and back over the window and 50 ms either
 * side; the high band the mix less it), the high band slammed, the low band turned up the same `db` on the same envelope but not clipped
 * (the slam's curve with its ceiling 40 dB up), the two summed. The limiter after it (finish()) holds the ceiling.
 */
function slamAbove(L, R, sr, { from, to, out, db, ceilingDb, hz }) {
  const pad = Math.round(0.05 * sr);
  const [s0, s1] = [Math.max(0, from - pad), Math.min(L.length, out + pad)];
  for (const ch of [L, R]) {
    const low = Float64Array.from(ch.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const f = Biquad.lowpass(sr, hz, Math.SQRT1_2);
      if (dir === 1) for (let i = 0; i < low.length; i++) low[i] = f.process(low[i]);
      else for (let i = low.length - 1; i >= 0; i--) low[i] = f.process(low[i]);
    }
    const lo = Float32Array.from(low);
    const hi = Float32Array.from(ch.subarray(s0, s1), (v, i) => v - lo[i]);
    const one = new Float32Array(lo.length);
    slam(hi, one, sr, { from: from - s0, to: to - s0, out: out - s0, db, ceilingDb });
    slam(lo, one, sr, { from: from - s0, to: to - s0, out: out - s0, db, ceilingDb: ceilingDb + 40 });
    for (let i = from; i < out; i++) ch[i] = lo[i - s0] + hi[i - s0];
  }
}

/**
 * BLOOM on samples [a, b) of both channels, in place: a high shelf of `db` at `hz` (Butterworth Q, run forward and back at half the gain
 * each over the window and 50 ms after it: zero phase), mixed in by a weight easing 1 → 0 over the window (raised cosine) — the band over
 * `hz` starts `db` down on `a` and is the mix's own by `b`. Nothing outside [a, b) is written.
 */
function bloom(L, R, sr, a, b, { hz, db }) {
  const pad = Math.round(0.05 * sr);
  const s1 = Math.min(L.length, b + pad);
  for (const ch of [L, R]) {
    const y = Float64Array.from(ch.subarray(a, s1));
    for (const dir of [1, -1]) {
      const f = Biquad.highShelf(sr, hz, Math.SQRT1_2, db / 2);
      if (dir === 1) for (let i = 0; i < y.length; i++) y[i] = f.process(y[i]);
      else for (let i = y.length - 1; i >= 0; i--) y[i] = f.process(y[i]);
    }
    for (let i = a; i < b; i++) {
      const w = 0.5 + 0.5 * Math.cos((Math.PI * (i - a)) / (b - a));
      ch[i] += w * (y[i - a] - ch[i]);
    }
  }
}

/**
 * A zero-phase low-pass on samples [a, b) of both channels, in place (SLAM_TOP): Butterworth (`poles` / 2 run forward and back over the
 * window and 20 ms either side), crossfaded in from `a` and out to `b` over `fadeMs`; nothing outside the window changes.
 */
function topCut(L, R, sr, a, b, { hz, poles, fadeMs }) {
  const pad = Math.round(0.02 * sr);
  const fade = Math.max(1, Math.round((fadeMs / 1000) * sr));
  const [s0, s1] = [Math.max(0, a - pad), Math.min(L.length, b + pad)];
  for (const ch of [L, R]) {
    const y = Float64Array.from(ch.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const f = BUTTERWORTH_Q[poles / 2].map((q) => Biquad.lowpass(sr, hz, q));
      if (dir === 1) for (let i = 0; i < y.length; i++) y[i] = f.reduce((v, st) => st.process(v), y[i]);
      else for (let i = y.length - 1; i >= 0; i--) y[i] = f.reduce((v, st) => st.process(v), y[i]);
    }
    for (let i = a; i < b; i++) {
      const w = Math.min(1, (i - a) / fade, (b - i) / fade);
      ch[i] = w * y[i - s0] + (1 - w) * ch[i];
    }
  }
}

/**
 * A band's gain over time on the finished mix, in place (MEMPHIS_LIFT): `keys` [frame, dB] (linear in dB between them; 0 outside), the band
 * between `lo` and `hi` (high shelves of ±6 dB at `lo` and ∓6 dB at `hi`, each run forward and back at half its gain over the keys and
 * 20 ms either side: zero-phase), each sample moved from the mix towards the band's +6 dB or −6 dB copy by what gives its key's gain.
 * Nothing outside the keys changes.
 */
function bandGain(L, R, sr, { keys, lo, hi }) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const [a, b] = [at(keys[0][0]), Math.min(L.length, at(keys[keys.length - 1][0]))];
  const pad = Math.round(0.02 * sr);
  const [s0, s1] = [Math.max(0, a - pad), Math.min(L.length, b + pad)];
  const G = 10 ** (6 / 20);
  const shelved = (x, db) => {
    const y = Float64Array.from(x.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const fs = [Biquad.highShelf(sr, lo, Math.SQRT1_2, db / 2), Biquad.highShelf(sr, hi, Math.SQRT1_2, -db / 2)];
      const step = (v) => fs.reduce((u, f) => f.process(u), v);
      if (dir === 1) for (let i = 0; i < y.length; i++) y[i] = step(y[i]);
      else for (let i = y.length - 1; i >= 0; i--) y[i] = step(y[i]);
    }
    return y;
  };
  const dbAt = (i) => {
    const f = (i / sr) * FPS;
    for (let k = 0; k + 1 < keys.length; k++) if (f >= keys[k][0] && f < keys[k + 1][0]) return keys[k][1] + ((keys[k + 1][1] - keys[k][1]) * (f - keys[k][0])) / (keys[k + 1][0] - keys[k][0]);
    return 0;
  };
  for (const ch of [L, R]) {
    const [up, dn] = [shelved(ch, 6), shelved(ch, -6)];
    for (let i = a; i < b; i++) {
      const g = 10 ** (dbAt(i) / 20);
      const x = ch[i];
      ch[i] = g >= 1 ? x + ((g - 1) / (G - 1)) * (up[i - s0] - x) : x + ((1 - g) / (1 - 1 / G)) * (dn[i - s0] - x);
    }
  }
}

/**
 * The band under `hz` of the finished mix moved by a gain curve (TONE_RAMPS), in place: `keys` [frame, dB] (linear in dB between them, 0
 * outside), the band split off zero-phase (a 2-pole Butterworth low-pass run forward and back over the keys and 50 ms either side; the rest
 * is the mix less it), each sample the mix plus (gain − 1) × its low band. Nothing outside the keys changes.
 */
function lowGain(L, R, sr, keys, hz) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const [a, b] = [at(keys[0][0]), Math.min(L.length, at(keys[keys.length - 1][0]))];
  const pad = Math.round(0.05 * sr);
  const [s0, s1] = [Math.max(0, a - pad), Math.min(L.length, b + pad)];
  const dbAt = (i) => {
    const f = (i / sr) * FPS;
    for (let k = 0; k + 1 < keys.length; k++) if (f >= keys[k][0] && f < keys[k + 1][0]) return keys[k][1] + ((keys[k + 1][1] - keys[k][1]) * (f - keys[k][0])) / (keys[k + 1][0] - keys[k][0]);
    return 0;
  };
  for (const ch of [L, R]) {
    const low = Float64Array.from(ch.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const f = Biquad.lowpass(sr, hz, Math.SQRT1_2);
      if (dir === 1) for (let i = 0; i < low.length; i++) low[i] = f.process(low[i]);
      else for (let i = low.length - 1; i >= 0; i--) low[i] = f.process(low[i]);
    }
    for (let i = a; i < b; i++) ch[i] += (10 ** (dbAt(i) / 20) - 1) * low[i - s0];
  }
}

/**
 * The side of the finished mix scaled by a gain curve (WIDTH_RAMPS): `keys` [frame, dB], linear in dB between them (a jump where two keys
 * sit a frame apart), in place over the first key to the last; the mid untouched, nothing outside the keys changes.
 */
function sideRamp(L, R, sr, keys) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const [a0, b0] = [at(keys[0][0]), Math.min(L.length, at(keys[keys.length - 1][0]))];
  if (b0 <= a0) return;
  // The mid gives back (or takes) what the side's gain changes in power, over 20 ms (a one-pole run forward and back on each's power):
  // the width moves, the loudness does not (as widen()), and a wider beat does not peak higher into the limiter.
  const n = b0 - a0;
  const pm = new Float64Array(n);
  const ps = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    pm[i] = (0.5 * (L[a0 + i] + R[a0 + i])) ** 2;
    ps[i] = (0.5 * (L[a0 + i] - R[a0 + i])) ** 2;
  }
  const k1 = Math.exp(-1 / (0.02 * sr));
  for (const p of [pm, ps]) {
    for (let i = 1; i < n; i++) p[i] = k1 * p[i - 1] + (1 - k1) * p[i];
    for (let i = n - 2; i >= 0; i--) p[i] = k1 * p[i + 1] + (1 - k1) * p[i];
  }
  for (let k = 0; k + 1 < keys.length; k++) {
    const [[f0, d0], [f1, d1]] = [keys[k], keys[k + 1]];
    const [a, b] = [at(f0), Math.min(L.length, at(f1))];
    for (let i = a; i < b; i++) {
      const g = 10 ** ((d0 + ((d1 - d0) * (i - a)) / (b - a)) / 20);
      const j = i - a0;
      const gm = Math.sqrt(Math.max(0.5, 1 + ((1 - g * g) * ps[j]) / (pm[j] + 1e-12)));
      const m = 0.5 * (L[i] + R[i]) * Math.min(1.12, gm);
      const s = 0.5 * (L[i] - R[i]) * g;
      L[i] = m + s;
      R[i] = m - s;
    }
  }
}

/**
 * A zero-phase high shelf (ARCADE_TOP: `db` at `hz`, run forward and back at half the gain each, over the window and 20 ms either side)
 * on samples [a, b) of both channels, in place, crossfaded in from `a` and out to `b` over `fadeMs`; nothing outside the window changes.
 */
function topLift(L, R, sr, a, b, { hz, db, low = null, fadeMs }) {
  const pad = Math.round(0.02 * sr);
  const fade = Math.max(1, Math.round((fadeMs / 1000) * sr));
  const [s0, s1] = [Math.max(0, a - pad), Math.min(L.length, b + pad)];
  // A low shelf of low.db (< 0) at low.hz: a high shelf of −low.db there, the whole turned down by low.db.
  const lowGain = low ? 10 ** (low.db / 40) : 1;
  for (const ch of [L, R]) {
    const y = Float64Array.from(ch.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const fs = [Biquad.highShelf(sr, hz, Math.SQRT1_2, db / 2), ...(low ? [Biquad.highShelf(sr, low.hz, Math.SQRT1_2, -low.db / 2)] : [])];
      const step = (v) => lowGain * fs.reduce((x, f) => f.process(x), v);
      if (dir === 1) for (let i = 0; i < y.length; i++) y[i] = step(y[i]);
      else for (let i = y.length - 1; i >= 0; i--) y[i] = step(y[i]);
    }
    for (let i = a; i < b; i++) {
      const w = Math.min(1, (i - a) / fade, (b - i) / fade);
      ch[i] = w * y[i - s0] + (1 - w) * ch[i];
    }
  }
}

/**
 * Renders drop 2 into `stems` (bgm.mjs's buses plus SENDS's) at sample rate `sr`. Returns every placed event as { kind, at } (at in
 * samples; a whoosh's is its peak, a reversed swell's its end). `solo(kind, frame)` picks which sounds are rendered (tests measure one
 * kind, or one hit, alone): a voice without an event of its own answers to its group's name (`d2chord`, `d2sub`, `d2riser`, …); a
 * whole layer (the pads, the arp) is asked without a frame. Stems may be shorter than the film: every write clips.
 */
export function renderDrop2(stems, sr, { solo = () => true } = {}) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const n = stems.sub.length;
  const events = [];
  // Every voice goes into drop 2's own buffers first: the music buses are swept and crushed there, and everything is cut on the freeze.
  const own = {
    drums: stereo(n), fx: stereo(n), chime: stereo(n), post: stereo(n),
    d2chords: stereo(n), d2music: stereo(n), d2vox: stereo(n), d2bass: stereo(n), d2air: stereo(n), d2dry: stereo(n), sub: new Float32Array(n),
  };
  const on = (kind, frame) => solo(kind, frame);
  const mark = (kind, frame) => {
    if (on(kind, frame)) events.push({ kind, at: at(frame) });
  };
  const place = (bus, frame, dur, draw, { pan = 0, kind, group = kind } = {}) => {
    if (!on(group, frame)) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(bus, buf, { at: at(frame), pan });
    if (kind) mark(kind, frame);
  };
  /** A whoosh on `bus` (the air bus unless named) whose loudest point lands on `peak`; `pan` may be a function of its progress 0…1. */
  const swoosh = (peak, frames, o, { kind, group = kind, pan = 0, bus = own.d2air } = {}) => {
    if (!on(group, peak)) return;
    const buf = new Float32Array(Math.round((frames / FPS) * sr));
    whoosh(buf, 0, buf.length, sr, o);
    addPanned(bus, buf, at(peak - WHOOSH_PEAK * frames), typeof pan === 'function' ? pan : () => pan);
    if (kind) mark(kind, peak);
  };
  const seconds = (frames) => frames / FPS;
  const kicks = D.KICKS2;
  const vox = stereo(n);
  /** The stutter and the scream stay dry, so no echo fills their gaps. */
  const dry = stereo(n);
  const sing = (frame, o, pan = 0, bus = vox) => {
    const buf = new Float32Array(o.len + Math.round(0.03 * sr));
    voxLine(buf, 0, sr, o);
    addMono(bus, buf, { at: at(frame), pan });
  };
  const ctx = { sr, n, at, own, vox, dry, events, on, mark, place, swoosh, sing, seconds, midi, addPanned, mixInto, chordAt2, VOICINGS2, ROOT2, thirdBelow, bar2, inBar };

  // ——— Drums ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  /**
   * The kit's air (hats, shaker, tambourine, crashes, the drumline's 16ths): the drums bus, lifted less in act 2 (ACT2_AIR_DB) — but in
   * the arcade and the well (12–13), whose kit keeps the whole lift (ACT2_DRUMS_DB).
   */
  const air = stereo(n);
  const arcadeWell = (f) => inBar(f, 12) || inBar(f, 13);
  const airBus = (f) => (arcadeWell(f) ? own.drums : air);
  /** How much of the arcade's chip kit is still in Memphis at frame `f` (CHIP_CARRY: 1 on 14.1, gone by 14.3; 0 elsewhere). */
  const chipCarry = (f) => (f >= D.TOTEM && f < D.TOTEM + CHIP_CARRY.frames ? 1 - (f - D.TOTEM) / CHIP_CARRY.frames : 0);
  const kickSeed = carriedSeed(kicks, 4000, 8200);
  kicks.forEach((f) => {
    const set = D.KICK_GAINS2.find((k) => k.at === f);
    const heart = D.SATURATE.indexOf(f);
    // ACT2_DRUMS_DB lifts act 2's grooves; its kick takes ACT2_KICK_DB of it (the centre would only narrow the field).
    const act2 = f >= D.BURST && f < D.REEL.from ? 10 ** (((arcadeWell(f) ? 0 : ACT2_KICK_DB) - ACT2_DRUMS_DB) / 20) : 1;
    const gain = act2 * (set ? set.gain : heart >= 0 ? HEART[heart] : D.BIG_KICKS2.includes(f) ? 0.75 : 0.55);
    // In the arcade and the well (12–13) every kick also fires an 8-bit thump (a short LFSR burst): the same pulse, in the world's grain.
    const chip = inBar(f, 12) || inBar(f, 13);
    place(own.drums, f, 1, (b) => {
      kick(b, 0, sr, { gain: gain * 10 ** (KICK_DB / 20), f0: 215, f1: 46, pitchMs: 36, decayMs: heart >= 0 ? 180 : 250 }, kickSeed(f));
      // (Seeded by the kick's frame on the 61-bar map, where it was approved: v07Frame, so v08's bridge A does not re-roll the thump.)
      if (chip) chipNoise(b, 0, sr, { gain: 0.12, clockHz: 3000, decayMs: 25 }, 8300 + (v07Frame(f) % 97));
    }, { kind: 'd2kick' });
  });
  const clapSeed = carriedSeed(D.CLAPS2, 0, 0);
  D.CLAPS2.forEach((f) => {
    const s = clapSeed(f);
    if (f === D.BOX) {
      // 9.3, the half-time backbeat: snare and clap, gated and huge (the box shuts on it) — huge against the switch's near-silence, not
      // against the ceiling (at full level it rode the limiter and the delivery's AAC rang 0.9 dB over the master's peak on it).
      place(own.drums, f, 0.3, (b) => gatedHit(b, 0, sr, { gain: 0.42, gateMs: 180, tone: 200 }, 8400), { kind: 'd2snare' });
      place(own.drums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.52, tone: 1500 }, 8401), { pan: -0.15, group: 'd2snare' });
      place(own.drums, f + 0.15, 0.6, (b) => clap(b, 0, sr, { gain: 0.42, tone: 1900 }, 8402), { pan: 0.18, group: 'd2snare' });
      return;
    }
    if (inBar(f, 14)) {
      // Memphis's 80s backbeat: the gated clap.
      place(own.drums, f, 0.3, (b) => gatedHit(b, 0, sr, { gain: 0.42, gateMs: 150, tone: 230 }, 8403 + s), { kind: 'd2snare' });
      place(own.drums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.5, tone: 1700 }, 8410 + s), { pan: -0.12, group: 'd2snare' });
      return;
    }
    const base = isCarried(f) ? 4040 : 8420;
    place(own.drums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.36, tone: 235, decayMs: 150 }, base + s), { kind: 'd2snare' });
    place(own.drums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.62, tone: 1650 }, base + 20 + s), { pan: -0.15, group: 'd2snare' });
    place(own.drums, f + 0.15, 0.6, (b) => clap(b, 0, sr, { gain: 0.45, tone: 1950 }, base + 40 + s), { pan: 0.18, group: 'd2snare' });
  });
  // The hats: 16ths, accented on the & of each beat; in the arcade and the well, the LFSR's metallic noise instead; in the switch, 8ths
  // to the backbeat, then (from the spill) 16ths rising out of the held breath.
  const hatSeed = carriedSeed(D.HATS2, 4100, 8500);
  D.HATS2.forEach((f) => {
    const k = Math.round((f - D.DROP2_START) / SIXTEENTH);
    const accent = k % 4 === 2 ? 0.28 : k % 2 ? 0.18 : 0.23;
    const pan = k % 2 ? 0.28 : -0.22;
    const chipHat = (g) => place(airBus(f), f, 0.15, (b) => chipNoise(b, 0, sr, { gain: 0.5 * accent * g, clockHz: 32000, decayMs: 18, short: true }, hatSeed(f)), { pan, kind: 'd2hat' });
    if (inBar(f, 12) || inBar(f, 13)) {
      chipHat(1);
      return;
    }
    // v07 (seam 4704): the chip hats carry two beats into Memphis, crossfading into its hats and the tambourine (CHIP_CARRY).
    const carry = chipCarry(f);
    if (carry > 0) {
      chipHat(carry);
      if (1 - carry > 0) place(airBus(f), f, 0.25, (b) => hat(b, 0, sr, { gain: accent * (1 - carry), decayMs: 40, cutoff: 9500 }, hatSeed(f)), { pan, group: 'd2hat' });
      return;
    }
    const rise = f >= D.SPILL[0] && f < D.BURST ? 0.45 + 0.75 * ((f - D.SPILL[0]) / (D.BURST - D.SPILL[0])) : 1;
    place(airBus(f), f, 0.25, (b) => hat(b, 0, sr, { gain: accent * rise, decayMs: 40, cutoff: 9500 }, hatSeed(f)), { pan, kind: 'd2hat' });
  });
  // (The spill's shakers take their own seeds, so the wave's keep theirs.)
  const spillShaker = (f) => f >= D.SPILL[0] && f < D.BURST;
  const shakerSeedWave = carriedSeed(D.SHAKER2.filter((f) => !spillShaker(f)), 4220, 8600);
  const shakerSeed = (f) => (spillShaker(f) ? 8690 + D.SHAKER2.filter(spillShaker).indexOf(f) : shakerSeedWave(f));
  D.SHAKER2.forEach((f) => {
    const k = Math.round((f - D.DROP2_START) / SIXTEENTH);
    // v07: from the spill (9.4) the shaker rises with the hats out of the held breath (SHAKER2), the wave's air arriving a beat early.
    const rise = f >= D.SPILL[0] && f < D.BURST ? 0.3 + 0.7 * ((f - D.SPILL[0]) / (D.BURST - D.SPILL[0])) : 1;
    place(airBus(f), f, 0.2, (b) => shaker(b, 0, sr, { gain: rise * (k % 2 ? 0.12 : 0.09), decayMs: 38 }, shakerSeed(f)), { pan: k % 2 ? -0.35 : 0.35, kind: 'd2shaker' });
  });
  const openSeed = carriedSeed(D.OPEN_HATS2, 4370, 8700);
  D.OPEN_HATS2.forEach((f) => place(airBus(f), f, 0.6, (b) => hat(b, 0, sr, { gain: 0.26, decayMs: 140, cutoff: 8000 }, openSeed(f)), { pan: 0.1, kind: 'd2openhat' }));
  const rimSeed = carriedSeed(D.RIMS2, 4340, 8750);
  D.RIMS2.forEach((f) => place(own.drums, f, 0.1, (b) => rim(b, 0, sr, { gain: 0.2 }, rimSeed(f)), { pan: 0.25, kind: 'd2rim' }));
  const crashSeed = carriedSeed(D.CRASHES2, 4400, 8780);
  D.CRASHES2.forEach((f) => {
    const s = crashSeed(f);
    place(airBus(f), f, 5, (b) => crash(b, 0, sr, { gain: CRASH_GAIN(f), decay: D.LIGHT_CRASHES2.includes(f) ? 1.1 : 1.7 }, s), { pan: s % 2 ? 0.25 : -0.25, kind: 'd2crash' });
  });
  // The tom fill climbing 110 → 220 Hz on the 16ths: short, so each hit stands apart from the last.
  D.TOMS2.forEach((f, i) => {
    const f1 = [110, 140, 175, 220][i];
    place(own.drums, f, 0.7, (b) => kick(b, 0, sr, { gain: 0.38, f0: 2 * f1, f1, pitchMs: 24, decayMs: 75 }, 4410 + i), { pan: -0.3 + 0.2 * i, kind: 'd2tom' });
  });
  // The rolls: bar 6's (16ths into 32nds), bar 7's 32nds, the reel's 8ths → 16ths → 32nds, bar 19's 32nds; each run climbs in level and pitch.
  const rolls = [D.ROLL31, D.SNARE32_32, D.ROLL33, D.ROLL34];
  [...new Set(rolls.flat())].sort((a, b) => a - b).forEach((f, i) => {
    const run = rolls.find((r) => r.includes(f));
    const p = run.length > 1 ? run.indexOf(f) / (run.length - 1) : 1;
    const base = run === D.ROLL34 ? 0.22 : 0.13;
    place(own.drums, f, 0.4, (b) => snare(b, 0, sr, { gain: base + 0.2 * p, tone: 230 + 60 * p, decayMs: 60 }, 4420 + i), { pan: i % 2 ? 0.15 : -0.15, kind: 'd2roll' });
  });
  // Act 2's own drums (the bible §4.7: the groove changes with each world; the kick stays on the beats in every one).
  // The switch's spill: snare 16ths rising to the burst.
  D.SPILL_SNARES.forEach((f, k) => {
    const p = k / (D.SPILL_SNARES.length - 1);
    place(own.drums, f, 0.4, (b) => snare(b, 0, sr, { gain: 0.1 + 0.2 * p, tone: 240 + 50 * p, decayMs: 55 }, 8800 + k), { pan: k % 2 ? 0.15 : -0.15, kind: 'd2spillsnare' });
  });
  // The wave: a taiko DON on every kick (10–11) — but 10.1, where the ō-daiko stands in for it (v07, §3: drop2Edo.mjs ODAIKO).
  D.TAIKO2.forEach((f, k) => {
    if (f === D.BURST) return;
    place(own.drums, f, 2, (b) => taiko(b, 0, sr, { freq: k % 4 === 0 ? 58 : 66, gain: f === D.WAVE_CRASH ? 0.5 : 0.36 }, 8810 + k), { pan: k % 2 ? 0.1 : -0.1, kind: 'd2taiko' });
  });
  // The arcade and the well: the 8-bit snare on every & (double time), the LFSR's long noise over a square's thump.
  D.SNARES2.forEach((f, k) => place(own.drums, f, 0.3, (b) => {
    chipNoise(b, 0, sr, { gain: 0.32, clockHz: 14000, decayMs: 60 }, 8830 + k);
    sweep(b, 0, sr, { from: 220, to: 110, ms: 40, gain: 0.18, wave: 'square', decayMs: 35 });
  }, { pan: k % 2 ? 0.35 : -0.35, kind: 'd2chipsnare' }));
  // Memphis (14): the cowbell on the 8ths and a tambourine on the 16ths (the 80s kit's air, in place of the shaker), leaning on the
  // backbeat. v07 (seam 4704): the cowbell from 14.1& (14.1 is the face's landing: the orch hit, the slap, the hook), and the tambourine fading
  // in under the arcade's chip kit as it crossfades out over the first two beats (CHIP_CARRY: its hats above, its shaker below).
  D.COWBELL2.forEach((f, k) => {
    if (f === D.TOTEM) return;
    place(own.drums, f, 0.5, (b) => cowbell(b, 0, sr, { gain: k % 2 ? 0.08 : 0.11 }), { pan: 0.35, kind: 'd2cowbell' });
  });
  steps(D.TOTEM, D.PICTO, SIXTEENTH).forEach((f, k) => {
    const g = (k % 8 === 4 ? 0.16 : k % 2 ? 0.07 : 0.1) * (1 - CHIP_CARRY.tamb * chipCarry(f));
    place(airBus(f), f, 0.17, (b) => tambourine(b, 0, sr, { gain: g }, 8940 + k), { pan: k % 2 ? -0.4 : 0.3, kind: 'd2tamb' });
  });
  // The arcade and the well (12–13): the LFSR's white noise as a shaker on the 16ths between the beats (the shaker's air, in its grain);
  // v07: on two beats into Memphis, fading (CHIP_CARRY).
  steps(D.ARCADE.from, D.TOTEM + CHIP_CARRY.frames, SIXTEENTH).forEach((f, k) => {
    if (k % 4 === 0) return;
    const g = f < D.TOTEM ? 1 : chipCarry(f);
    place(airBus(f), f, 0.1, (b) => chipNoise(b, 0, sr, { gain: g * (k % 4 === 2 ? 0.12 : 0.08), clockHz: 40000, decayMs: 14 }, 8960 + k), { pan: k % 2 ? 0.4 : -0.4, kind: 'd2chipshaker' });
  });
  // 14.4's fill (14.4e, 14.4&, 14.4a; it was a gated 80s tom fill on B2, F♯2, D♯2): v07 (seam 4800) the drumline's tenors, its first accents —
  // B3, F♯3, D♯3, dry and tight — and over the ruler's 32nds (GRID_SNAP: the grid snaps) its snare roll into 15.1, swelling (DRUMLINE_IN).
  D.GATED_TOMS2.forEach((f, k) => place(own.drums, f, 0.3, (b) => tenor(b, 0, sr, { freq: DRUMLINE_IN.tenors[k], gain: DRUMLINE_IN.tenorGain }, 8850 + k), { pan: 0.35 - 0.35 * k, kind: 'd2tenor' }));
  D.GRID_SNAP.forEach((f, k) => {
    const p = k / (D.GRID_SNAP.length - 1);
    place(own.drums, f, 0.3, (b) => marchSnare(b, 0, sr, { gain: DRUMLINE_IN.roll[0] + (DRUMLINE_IN.roll[1] - DRUMLINE_IN.roll[0]) * p }, 8855 + k), { pan: k % 2 ? 0.3 : -0.3, kind: 'd2drumline' });
  });
  // The pictograms (15): the drumline's 16ths from the flop to the light, accented on the beats and swelling; the timpani roll on C♯
  // from the contact sheet into 16.1.
  D.DRUMLINE2.forEach((f, k) => {
    const p = k / (D.DRUMLINE2.length - 1);
    const accent = (f - D.DRUMLINE2[0]) % FRAMES_PER_BEAT === 0 ? 1.3 : 1;
    place(accent > 1 ? own.drums : airBus(f), f, 0.3, (b) => marchSnare(b, 0, sr, { gain: (0.12 + 0.14 * p) * accent }, 8860 + k), { pan: k % 2 ? 0.4 : -0.4, kind: 'd2drumline' });
  });
  place(own.drums, D.TIMPANI2.from, seconds(D.TIMPANI2.to - D.TIMPANI2.from) + 1.3, (b) => timpani(b, 0, at(D.TIMPANI2.to) - at(D.TIMPANI2.from), sr, { freq: midi(37), gain: 0.28, rate: 18 }, 8900), { kind: 'd2timpani' });
  // The mirror trap's build: snare 8ths from 16.4&, 16ths, 32nds, the give-up's fill — climbing in level and pitch.
  D.BUILD_SNARES2.forEach((f, k) => {
    const p = k / (D.BUILD_SNARES2.length - 1);
    place(own.drums, f, 0.4, (b) => snare(b, 0, sr, { gain: 0.12 + 0.22 * p, tone: 230 + 70 * p, decayMs: 60 }, 8910 + k), { pan: k % 2 ? 0.15 : -0.15, kind: 'd2buildsnare' });
  });

  // ——— Chords: the stabs, the sub, the pluck (no pad since 2026-10-02 — the worlds' chord voices are drop2Worlds.mjs) ——————————————————
  const changes = D.HARMONY2.map((c, i) => ({ ...c, to: i + 1 < D.HARMONY2.length ? D.HARMONY2[i + 1].at : D.CRASH }));
  /**
   * The bullet time's frozen chord reads its grains from the pads as they were (A + B, before any ducking) over the half second before
   * the crash: they are rendered here for it alone, into `padsDry`, and never mixed into a bus (drop2Bullet.mjs FREEZE_AT).
   */
  const padsDry = stereo(n);
  if (on('d2freeze', D.BULLET.from)) {
    supersaw(padsDry.L, padsDry.R, changes.map((c) => {
      const v = VOICINGS2[c.chord];
      return { at: at(c.at), len: at(c.to) - at(c.at), freqs: [...v, v[2] + 12, v[3] + 12, v[3] + 24].map(midi) };
    }), sr, { gain: 0.2, cutoff: () => 10000, q: 0.7, spread: 1, seed: 4800 });
    supersaw(padsDry.L, padsDry.R, changes.map((c) => ({ at: at(c.at), len: at(c.to) - at(c.at), freqs: VOICINGS2[c.chord].map((m) => midi(m + 12)) })), sr, { gain: 0.12, voices: 5, detune: 0.28, cutoff: () => 14000, q: 0.7, spread: 1, seed: 4801 });
  }

  if (on('d2stab')) {
    const list = [];
    for (const b of STAB_BARS) {
      for (const s of STABS) {
        const f = bar2(b) + s * SIXTEENTH;
        const v = VOICINGS2[chordAt2(f)];
        list.push({ at: at(f), len: at(f + 4) - at(f), freqs: [...v.map((m) => m + 12), v[3] + 24].map(midi) });
      }
    }
    const starts = list.map((c) => c.at);
    let si = 0;
    const stabs = stereo(n);
    supersaw(stabs.L, stabs.R, list, sr, {
      gain: 0.14,
      q: 1.1,
      spread: 1,
      seed: 4802,
      cutoff: (i) => {
        while (si + 1 < starts.length && starts[si + 1] <= i) si++;
        const t = (i - starts[si]) / sr;
        return t < 0 ? 800 : 1000 + 10000 * Math.exp(-t / 0.06);
      },
    });
    mixInto(own.d2chords, stabs);
  }

  // 19.1–19.2, stuck in ASCII (2026-10-02): a chord stab on each frame-rate drop (30 → 20 → 15 → 10 fps on the 8ths, the racing heart's
  // kicks), each darker than the last — the bar's chords (vi → Vsus) heard whole, now that no pad holds them.
  if (on('d2fps')) {
    const list = D.SATURATE.map((f) => {
      const v = VOICINGS2[chordAt2(f)];
      return { at: at(f), len: at(f + 4) - at(f), freqs: [...v.map((m) => m + 12), v[3] + 24].map(midi) };
    });
    const starts = list.map((c) => c.at);
    let si = 0;
    const fps = stereo(n);
    supersaw(fps.L, fps.R, list, sr, {
      gain: 0.13,
      q: 1.1,
      spread: 1,
      seed: 9300,
      cutoff: (i) => {
        while (si + 1 < starts.length && starts[si + 1] <= i) si++;
        const t = (i - starts[si]) / sr;
        return t < 0 ? 800 : 900 + 9000 * 0.6 ** si * Math.exp(-t / 0.06);
      },
    });
    mixInto(own.d2chords, fps);
    D.SATURATE.forEach((f) => mark('d2fps', f));
  }

  // The sub: the chord's root, saturated a little, ducked hard by every kick; gliding D♯ → D into the switch (SUB_GLIDE) and swelling
  // under the held breath (9.3&: the sub and the alarm alone).
  if (on('d2sub')) {
    const subDuck = duck(n, kicks.map(at), sr, { depth: 0.85, attackMs: 2, releaseMs: 120 });
    const glide = [at(D.SUB_GLIDE.from), at(D.SUB_GLIDE.to)];
    const breath = [at(D.HELD_BREATH.from), at(D.HELD_BREATH.to)];
    let ph = 0;
    for (let i = at(D.DROP2_START); i < Math.min(n, at(D.CRASH)); i++) {
      let m = ROOT2[chordAt2((i / sr) * FPS)];
      if (i >= glide[0] && i < glide[1]) m = ROOT2.vi + (ROOT2.bVI - ROOT2.vi) * ((i - glide[0]) / (glide[1] - glide[0]));
      ph += midi(m) / sr;
      const env = Math.min(1, (i - at(D.DROP2_START)) / (0.004 * sr));
      const p = (i - breath[0]) / (breath[1] - breath[0]);
      const swell = p >= 0 && p < 1 ? 1 + 0.5 * Math.sin((Math.PI * p) / 2) ** 2 : p >= 1 && p < 2 ? 1 + 0.5 * Math.cos((Math.PI * (p - 1)) / 2) ** 2 : 1;
      own.sub[i] += 0.27 * env * swell * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph)) * subDuck[i];
    }
  }

  // The pluck on the offbeats, an octave above the sub — out under 3–4's wobble and Memphis's slap bass; doubled two octaves up in the
  // overflow (as built) and in act 2's straight bars (the bible §6.3 lever 4).
  if (on('d2pluck')) {
    const plucked = D.OPEN_HATS2.filter((f) => (f < D.POP || f >= D.GAME) && !inBar(f, 14));
    const doubled = plucked.filter((f) => (f >= D.SURF[0] && f < D.PAN.to) || inBar(f, 10) || inBar(f, 11) || inBar(f, 15) || inBar(f, 16) || inBar(f, 17));
    const pb = new Float32Array(n);
    pluckBass(pb, plucked.map((f) => ({ at: at(f), len: at(f + 9) - at(f), freq: midi(ROOT2[chordAt2(f)] + 12) })), sr, { gain: 0.22, bright: 2400 });
    pluckBass(pb, doubled.map((f) => ({ at: at(f), len: at(f + 9) - at(f), freq: midi(ROOT2[chordAt2(f)] + 24) })), sr, { gain: 0.13, bright: 3200 });
    addMono(own.d2bass, pb);
  }

  // The wobble (3–4): A♯2, then D♯3 (from 4.1), its filter on the LFO the picture ripples on, ducked by the kick.
  if (on('d2wobble')) {
    const wb = new Float32Array(n);
    const notes = [D.WOBBLE.from, bar2(4)].map((f, k) => ({ at: at(f), len: at(k ? D.WOBBLE.to : bar2(4)) - at(f), freq: midi(ROOT2[chordAt2(f)] + 12) }));
    wobble(wb, notes, sr, { gain: 0.24, lfo: (i) => wobbleLfo((i / sr) * FPS) });
    const wbDuck = duck(n, kicks.map(at), sr, { depth: 0.7, attackMs: 2, releaseMs: 130 });
    for (let i = 0; i < n; i++) wb[i] *= wbDuck[i];
    addMono(own.d2bass, wb);
    mark('d2wobble', D.WOBBLE.from);
  }

  // The 8-bit arp on every 16th, two octaves over the voicing (softer under the 3D of 3–4); the overflow jumps an octave per kick
  // (+12 … +48, the top with a square duty and a 6 kHz cutoff). Out in the switch, under the koto's 16ths (10–11) and the drumline (15),
  // and (2026-10-02) out of Memphis (its marimba) and the mirror trap (its glass); in its own world in 12–13 (louder, an octave up in the
  // well and louder again there since 2026-10-02: the well's top, with the shine gone). On the chord bus: it is a chord voice. The
  // overflow's part 0.1 → 0.08 (2026-10-02): on the chord bus it takes the make-up (MAKEUP), and its top octave is where the AAC rang.
  if (on('d2arp')) {
    const overflow = (f) => (f >= D.SURF[0] && f < D.PAN.to ? 12 * D.SURF.filter((s) => s <= f).length : inBar(f, 13) ? 36 : 24);
    const parts = [
      { from: D.DROP2_START, to: D.POP, gain: 0.08 },
      { from: D.POP, to: D.GAME, gain: 0.05 },
      { from: D.GAME, to: D.SURF[0], gain: 0.08 },
      { from: D.SURF[0], to: D.PAN.to, gain: 0.08 },
      { from: D.KERNEL.from, to: D.HANG.from, gain: 0.08 },
      { from: D.ARCADE.from, to: bar2(13), gain: 0.1 },
      { from: bar2(13), to: D.TOTEM, gain: 0.14 },
      { from: D.REEL.from, to: D.CRASH, gain: 0.08 },
    ];
    const top = [at(D.SURF[3]), at(D.PAN.to)];
    for (const part of parts) {
      const sides = [[], []];
      for (let f = part.from, k = (part.from - D.DROP2_START) / SIXTEENTH; f < part.to; f += SIXTEENTH, k++) {
        const up = overflow(f);
        sides[k % 2].push({ at: at(f), len: at(f + 4) - at(f), freq: midi(VOICINGS2[chordAt2(f)][PATTERN[k % 8]] + up), duty: up === 48 ? 0.5 : DUTIES[k % 4] });
      }
      sides.forEach((list, side) => {
        const buf = new Float32Array(n);
        pulseArp(buf, list, sr, { gain: part.gain, cutoff: (i) => (i >= top[0] && i < top[1] ? 6000 : 9000) });
        addMono(own.d2chords, buf, { pan: side ? 0.65 : -0.65 });
      });
    }
    mark('d2arp', D.DROP2_START);
  }

  // ——— Vocals ———————————————————————————————————————————————————————————————————————————————————————————————————————————————
  // 1.1: the sung IV chord, an octave up, "a → o" (up front: with the crash and the impact it fills the drop's first 100 ms).
  if (on('d2sung')) VOICINGS2.IV.forEach((m, k) => sing(D.DROP2_START, { len: at(20), note: () => m + 12, vowel: 'a', to: 'o', gain: LANDING.sung, seed: 4600 + k }, -0.3 + 0.2 * k));
  // The hook (bars 1–6) with its harmony a diatonic third below at 0.7 ×, panned opposite; a scoop into each note, vibrato on the long
  // ones. A carried note sings with its v04 vowel, seed and side; the crane bar's new row sings the game's kana (VOX_KANA: あいうえお).
  {
    const kept = D.HOOK2.filter((h) => isCarried(h.at));
    D.HOOK2.forEach((h) => {
      const carried = isCarried(h.at);
      const v = carried ? kept.indexOf(h) : 100 + D.HOOK2.indexOf(h);
      const len = Math.round((h.len * SIXTEENTH * 0.95 * sr) / FPS);
      const local = carried ? v04Local(h.at) : h.at - D.DROP2_START;
      const side = Math.floor(local / (4 * FRAMES_PER_BEAT)) % 2 ? 1 : -1;
      const shape = (m) => (t) => m - 0.6 * Math.max(0, 1 - t / 0.05);
      const vib = h.len >= 3 ? 0.15 : 0;
      const kana = D.VOX_KANA.indexOf(h.at);
      const vowel = kana >= 0 ? KANA[kana] : VOWELS[v % 5];
      const to = kana >= 0 ? KANA[kana] : VOWELS[(v + 2) % 5];
      if (on('d2lead', h.at)) sing(h.at, { len, note: shape(h.midi), vowel, to, gain: 0.3, vibrato: vib, seed: (carried ? 4610 : 8100) + v }, -0.1 * side);
      if (on('d2harmony', h.at)) sing(h.at, { len, note: shape(thirdBelow(h.midi)), vowel, to, gain: 0.21, vibrato: vib, seed: (carried ? 4660 : 8150) + v }, 0.25 * side);
      mark('d2lead', h.at);
      mark('d2harmony', h.at);
    });
  }
  // 6.4: "hey!" on the FULL COMBO.
  if (on('d2hey')) {
    sing(D.FULL_COMBO, { len: at(8), note: (t) => 82 + 3 * Math.min(1, t / 0.12), vowel: 'e', to: 'i', gain: 0.28, seed: 4700 }, 0);
    mark('d2hey', D.FULL_COMBO);
  }
  // Bar 7: one long "aa" climbing a semitone per kick (with a 2-frame portamento), then gliding down two octaves into the wrap.
  if (on('d2climb')) {
    const climb = (t) => {
      const f = D.SURF[0] + t * FPS;
      if (f >= D.VOX_GLIDE.from) return 90 - 24 * Math.min(1, (f - D.VOX_GLIDE.from) / (D.VOX_GLIDE.to - D.VOX_GLIDE.from));
      const k = Math.min(3, Math.floor((f - D.SURF[0]) / FRAMES_PER_BEAT));
      return 87 + k - (k > 0 ? Math.max(0, 1 - (f - D.VOX_CLIMB[k]) / 2) : 0);
    };
    sing(D.SURF[0], { len: at(D.VOX_GLIDE.to) - at(D.SURF[0]), note: climb, vowel: 'a', gain: 0.33, vibrato: 0.12, breath: 0.05, seed: 4701 }, 0);
    D.VOX_CLIMB.forEach((f) => mark('d2climb', f));
    events.push({ kind: 'd2glide', at: at(D.VOX_GLIDE.from) });
  }
  // The reel: the hook's first syllable retriggered, 8ths then 16ths, a step higher each beat; alternating a little left and right.
  if (on('d2stutter')) {
    let hit = 0;
    STUTTER.forEach((s, k) => {
      const end = k + 1 < STUTTER.length ? STUTTER[k + 1].at : D.VOX_STUTTER.to;
      for (let f = s.at; f < end; f += s.every, hit++) {
        sing(f, { len: at(0.75 * s.every), note: () => s.midi, vowel: 'a', gain: 0.36, seed: 4710 + hit }, hit % 2 ? 0.15 : -0.15, dry);
        mark('d2stutter', f);
      }
    });
  }
  // 19.1–19.2: the scream — one continuous line gliding G♯6 → A♯6 (a beat) → B6, gated on the 32nds (each chop's attack restarted).
  if (on('d2scream')) {
    const len = at(D.SCREAM.to) - at(D.SCREAM.from);
    const buf = new Float32Array(len + Math.round(0.03 * sr));
    const half = FRAMES_PER_BEAT;
    const note = (t) => {
      const f = t * FPS;
      return f < half ? 92 + (2 * f) / half : 94 + (f - half) / (D.SCREAM.to - D.SCREAM.from - half);
    };
    voxLine(buf, 0, sr, { len, note, vowel: 'a', gain: 0.38, breath: 0.08, vibrato: 0.2, seed: 4740 });
    const g = chopGate(buf.length, at(3), sr, { attackMs: 1.5, duty: 0.7 });
    for (let i = 0; i < buf.length; i++) buf[i] *= i < len ? g[i] : 0;
    addMono(dry, buf, { at: at(D.SCREAM.from) });
    mark('d2scream', D.SCREAM.from);
  }

  // ——— 1.1: the drop (the pop, the release, the first blade) ———————————————————————————————————————————————————————————————
  // v08 (LANDING): the impact's tonal body alone — its noise layer was half the white noise of the landing.
  place(own.drums, D.DROP2_START, 1.8, (b) => boom(b, 0, sr, { gain: LANDING.boom }), { kind: 'd2drop' });
  // The band snaps: a saw falling 2400 → 600 Hz in 30 ms, gone in 120 ms.
  place(own.fx, D.DROP2_START, 0.2, (b) => sweep(b, 0, sr, { from: 2400, to: 600, ms: 30, holdMs: 90, decayMs: 40, wave: 'saw', gain: 0.12 }), { kind: 'd2snap', pan: 0.2 });
  // E6's pok: a pop at 420 Hz and a 30 ms burst of noise at 2 kHz.
  place(own.fx, D.FILM_POP.from, 0.1, (b) => {
    pop(b, 0, sr, { freq: 420, gain: 0.12 });
    const bp = new SVF(sr);
    for (let i = 0; i < 0.03 * sr; i++) {
      bp.process(2 * hash(i, 4501) - 1, 2000, 2);
      b[i] += 0.06 * bp.bp * (1 - i / (0.03 * sr));
    }
  }, { kind: 'd2pok' });
  // The droplet spray: 30 tiny high blips spread over the rim's run (RIM: 1.1 and the 5 frames after it), panned wide …
  for (let k = 0; k < 30; k++) {
    const f = D.RIM.from + (D.RIM.to - D.RIM.from) * hash(k, 4502);
    place(own.fx, f, 0.01, (b) => blip(b, 0, sr, { freq: 4000 + 5000 * hash(k, 4503), ms: 2 + hash(k, 4504), gain: 0.015 }), { pan: 1.6 * hash(k, 4505) - 0.8, group: 'd2droplets' });
  }
  // … and the film's spray itself. v08 (LANDING): it was a burst of noise falling 11 → 2.5 kHz (gain 0.7: with the impact's noise, the
  // landing's white noise); now FALL's glass — a pane tink per droplet down the IV's arpeggio on the 32nds, flying left to right with the
  // torn text, the race's glass of break 8 answered across the digital zero.
  LANDING.panes.forEach(([d, m, pan, gain], k) => place(own.chime, D.FILM_POP.from + d, 0.8, (b) => paneTink(b, 0, sr, { freq: midi(m), gain, decayMs: LANDING.paneDecayMs, click: LANDING.paneClick, seed: 4560 + k }), { pan, group: 'd2droplets' }));
  mark('d2droplets', D.FILM_POP.from);
  // The torn text flying past: a swarm swept left → right over FILM_POP (1.1–1.2).
  if (on('d2swarm')) {
    const s = stereo(n);
    swarm(s.L, s.R, at(D.FILM_POP.from), at(D.FILM_POP.to) - at(D.FILM_POP.from), sr, { gain: 0.06, density: 600, seed: 4506 });
    const a = at(D.FILM_POP.from);
    const m = Float32Array.from({ length: Math.max(0, Math.min(n, at(D.FILM_POP.to)) - a) }, (_, i) => s.L[a + i] + s.R[a + i]);
    addPanned(own.d2air, m, a, (p) => -0.8 + 1.6 * p);
  }
  // The blades: each a shing — an FM bell up the chord on the blade, and a whoosh 9 → 3 kHz peaking 2 frames after it.
  const shing = (kind, f, note, pan, gain, seed) => {
    swoosh(f + 2, 8, { from: 9000, to: 3000, q: 2, gain: 2 * gain, seed }, { pan, group: `${kind}air` });
    place(own.chime, f, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(note), ratio: 3.5, index: 4, decay: 0.5, gain }), { pan, kind });
  };
  D.BLADES.forEach((f, k) => shing('d2shing', f, BLADE_NOTES[k], BLADE_PANS[k], 0.06, 4510 + k));
  // Into the pop-out: a reversed cymbal into 2.1 and the take-off whoosh peaking on it.
  place(own.fx, D.BLADES[4], seconds(D.TURNS[0].to - D.BLADES[4]), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.22, seed: 4515 }), { group: 'd2reverse' });
  swoosh(D.TURNS[0].to, 14, { from: 600, to: 6000, gain: 0.18, q: 1.3, seed: 4516 }, { kind: 'd2takeoff' });

  // ——— Bar 2: the style cube ——————————————————————————————————————————————————————————————————————————————————————————————————
  D.TURNS.forEach((t, k) => {
    swoosh(t.to, 12, { from: 600, to: 4000, gain: 0.14, q: 1.4, seed: 4520 + k }, { pan: k % 2 ? 0.3 : -0.3, group: 'd2turnair' });
    place(own.drums, t.to, 0.5, (b) => fmBell(b, 0, sr, { freq: 420, ratio: 2.7, index: 3, decay: 0.06, gain: 0.12 }), { kind: 'd2turn', pan: k % 2 ? 0.15 : -0.15 });
  });
  place(own.fx, D.W2.from, 0.1, (b) => {
    for (let k = 0; k < 3; k++) blip(b, at(k), sr, { freq: 2400, ms: 12, gain: 0.04 });
  }, { kind: 'd2ledrun', pan: 0.3 });
  place(own.fx, D.TOMS2[0], 0.1, (b) => spark(b, 0, sr, { gain: 0.2, tone: 4800 }, 4525), { kind: 'd2ignite', pan: -0.3 });
  place(own.fx, D.TOMS2[0], seconds(D.WHIP.to - D.TOMS2[0]), (b) => riser(b, 0, b.length, sr, { gain: 0.18 }, 4526), { group: 'd2riser' });
  place(own.fx, D.TOMS2[0], seconds(D.WHIP.to - D.TOMS2[0]), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.24, seed: 4527 }), { group: 'd2reverse' });
  swoosh(D.WHIP.to, 14, { from: 300, to: 7000, gain: 0.26, q: 1.2, seed: 4528 }, { kind: 'd2whip' });

  // ——— Bars 3–4: the Z-buffer, donut.exe, (intro) bar 4 — with ZBUF2 live, the donut one beat and Defender's 2D scan line on 3.2 ————
  place(own.drums, D.POP, 1.8, (b) => impact(b, 0, sr, { gain: 0.3 }, 4530), { kind: 'd2pop' });
  place(own.fx, D.POP, 0.35, (b) => sweep(b, 0, sr, { from: 80, to: 400, ms: (15 / FPS) * 1000, holdMs: 60, gain: 0.25, attackMs: 3 }), { group: 'd2pop' });
  swoosh(D.POP + 12, 18, { from: 500, to: 2500, gain: 0.1, q: 1, seed: 4531 }, { pan: 0.2, group: 'd2dolly' });
  [D.RES_STEPS[0], D.SPIN_ACCENT].forEach((f, k) => {
    const top = VOICINGS2[chordAt2(f)][3] + 24;
    place(own.chime, f, 2, (b) => fmBell(b, 0, sr, { freq: midi(top), index: 3, decay: 0.7, gain: 0.06 }), { kind: 'd2glint', pan: k ? 0.35 : -0.35 });
  });
  place(own.fx, D.SWALLOW.from, 0.3, (b) => gulp(b, 0, sr, { from: 300, to: 90, ms: (9 / FPS) * 1000, gain: 0.12 }), { kind: 'd2gulp' });
  swoosh(D.SPIN_ACCENT + 4, 6, { from: 1200, to: 3000, gain: 0.06, q: 1.5, seed: 4532 }, { group: 'd2spin' });
  mark('d2spin', D.SPIN_ACCENT);
  const reform = D.ZBUF2_LIVE ? D.ZBUF2.reform.to : D.REFORM.from;
  place(own.fx, reform, 0.3, (b) => gulp(b, 0, sr, { from: 90, to: 300, ms: (9 / FPS) * 1000, gain: 0.1 }), { kind: 'd2reform' });
  (D.ZBUF2_LIVE ? D.ZBUF2_MARCH : D.MARCH).forEach((f, k) => place(own.chime, f, 1.5, (b) => fmBell(b, 0, sr, { freq: midi(MARCH_NOTES[k]), index: 2, decay: 0.3, gain: 0.07 }), { kind: 'd2fmpop', pan: -0.3 + 0.2 * k }));
  // ZBUF2 (once live): Defender's flat scan line on 3.2, a dry square on C6 panned with the line (top → bottom: centre, a little right).
  if (D.ZBUF2_LIVE) place(own.d2dry, D.ZBUF2.scan.from, seconds(D.ZBUF2.scan.to - D.ZBUF2.scan.from), (b) => sweep(b, 0, sr, { from: midi(84), to: midi(84), ms: 150, gain: 0.04, wave: 'square', attackMs: 2 }), { kind: 'd2zscan', pan: 0.1 });
  // Bar 4's blink: S04's blips a semitone up (932 Hz shut, 1245 Hz open).
  place(own.fx, D.BLINK2.close, 0.05, (b) => blip(b, 0, sr, { freq: 932, ms: 25, gain: 0.07 }), { kind: 'd2blink', pan: -0.2 });
  place(own.fx, D.BLINK2.open, 0.05, (b) => blip(b, 0, sr, { freq: 1245, ms: 25, gain: 0.07 }), { kind: 'd2blink', pan: 0.2 });
  place(own.fx, D.BAR4.from, seconds(D.GAME - D.BAR4.from), (b) => riser(b, 0, b.length, sr, { gain: 0.2 }, 4533), { group: 'd2riser' });
  place(own.fx, D.BAR4.from, seconds(D.GAME - D.BAR4.from), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.24, seed: 4534 }), { group: 'd2reverse' });
  D.BITCRUSH.forEach((f) => mark('d2crush', f));

  // ——— Bars 5–6: the rhythm game (5 the crane bar: drop2Act2.mjs) ——————————————————————————————————————————————————————————————
  place(own.fx, D.GAME, 0.06, (b) => blip(b, 0, sr, { freq: 1760, ms: 40, gain: 0.08 }), { kind: 'd2gamestart' });
  D.NOTES_VOX.forEach((f, k) => {
    const note = D.HOOK2.find((h) => h.at === f).midi;
    place(own.chime, f, 1, (b) => fmBell(b, 0, sr, { freq: midi(note + 24), index: 2.5, decay: 0.35, gain: 0.03 }), { kind: 'd2sparkle', pan: k % 2 ? 0.4 : -0.4 });
  });
  place(own.fx, D.ROLL31[0] - 12, seconds(D.FULL_COMBO - D.ROLL31[0] + 12), (b) => riser(b, 0, b.length, sr, { gain: 0.2 }, 4540), { group: 'd2riser' });
  mark('d2scrub', D.SCRUB);
  place(own.drums, D.FULL_COMBO, 1.8, (b) => impact(b, 0, sr, { gain: 0.3 }, 4541), { kind: 'd2combo' });
  VOICINGS2.IV.map((m) => m + 24).forEach((m, k) => place(own.chime, D.FULL_COMBO + 2 * k, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.07, decay: 0.9, index: 2.2 }), { pan: -0.5 + 0.33 * k, group: 'd2bellrun' }));
  if (on('d2payout')) swarm(own.chime.L, own.chime.R, at(D.FULL_COMBO), at(D.FULL_COMBO + 42) - at(D.FULL_COMBO), sr, { gain: 0.08, density: 900, seed: 4542 });
  // The whip-tilt slams into 7.1 (iteration 2, ruling 7): its whoosh peaks on the landing, as the whip into 3.1's does.
  swoosh(D.TILT.to, 12, { from: 7000, to: 400, gain: 0.22, q: 1.2, seed: 4543 }, { kind: 'd2tilt' });

  // ——— Bar 7: overflow (its pan now lands in the kernel, 8.1) ———————————————————————————————————————————————————————————————
  steps(D.SURF[0], D.PAN.to, SIXTEENTH).forEach((f, k) => place(own.fx, f, 0.05, (b) => click(b, 0, sr, { gain: 0.07, tone: 6000 }, 4550 + k), { kind: 'd2tick', pan: k % 2 ? 0.3 : -0.1 }));
  place(own.fx, D.CRACK, 0.05, (b) => spark(b, 0, sr, { gain: 0.18, tone: 4500 }, 4570), { kind: 'd2crack', pan: 0.2 });
  // The rubber strains (180 → 120 Hz, a 12 Hz vibrato) as the wall bows, and twangs as it snaps (a saw pluck 220 → 110 Hz) with 3 sparks.
  place(own.fx, D.BOW, seconds(D.SNAP - D.BOW), (b) => sweep(b, 0, sr, { from: 180, to: 120, ms: ((D.SNAP - D.BOW) / FPS) * 1000, gain: 0.08, attackMs: 8, vibrato: { hz: 12, semitones: 0.6 }, drive: 1.5 }), { kind: 'd2strain', pan: 0.4 });
  place(own.fx, D.SNAP, 1.2, (b) => sweep(b, 0, sr, { from: 220, to: 110, ms: 40, holdMs: 900, decayMs: 300, wave: 'saw', gain: 0.18 }), { kind: 'd2twang', pan: 0.4 });
  for (let k = 0; k < 3; k++) place(own.fx, D.SNAP + 2 * k, 0.05, (b) => spark(b, 0, sr, { gain: 0.12, tone: 5200 + 600 * k }, 4571 + k), { pan: 0.4 + 0.2 * k, group: 'd2twang' });
  // W (2026-10-03: the bar goes through in stages, each hit): a push on each stage — heavier, higher, the music ducked deeper
  // (PUSHES) — and a crack step on each cell the border's crack widens (CRACK_STEPS).
  PUSHES.forEach((p, k) => place(own.drums, p.at, 0.4, (b) => pushHit(b, 0, sr, { freq: p.freq, crunch: p.crunch, gain: p.gain, crunchGain: p.crunchGain, tailMs: p.tailMs, seed: 9240 + k }), { kind: 'd2push', pan: p.pan }));
  PUSHES.forEach((p, k) => place(own.fx, p.at, 0.4, (b) => clank(b, 0, sr, { freq: midi(p.clank), gain: p.clankGain, seed: 9260 + k }), { group: 'd2pushclank', pan: p.pan + 0.1 }));
  CRACK_STEPS.forEach((c, k) => place(own.fx, c.at, 0.05, (b) => crackStep(b, 0, sr, { freq: c.freq, gain: c.gain, seed: 9250 + k }), { kind: 'd2crackstep', pan: 0.2 + 0.05 * k }));
  // M3 (2026-10-02: a sync sound for the wall on the right being smashed out; KEEP-FIRST: added over the as-built strain, twang and
  // sparks): the wall creaks as it bows (7.3 → 7.3&: following its motion, loud as it is slammed out, W), and on the snap it is smashed
  // out — a low thud, the CRT bezel cracking (bitcrushed: the terminal's grain) and its debris clattering away right with the gush, the
  // music buses ducked under it for a moment (WALL_DUCK). The FATAL beeps on 7.4 stay their own sound (the duck is back by then).
  place(own.fx, D.BOW, seconds(D.SNAP - D.BOW), (b) => wallCreak(b, 0, sr, { len: b.length, gain: WALL.creak, seed: 9200 }), { kind: 'd2wallcreak', pan: 0.45 });
  place(own.drums, D.SNAP, 0.5, (b) => wallThud(b, 0, sr, { gain: WALL.thud, seed: 9210 }), { kind: 'd2wallsmash', pan: 0.2 });
  place(own.fx, D.SNAP, 0.1, (b) => bezelCrack(b, 0, sr, { gain: WALL.crack, seed: 9220 }), { group: 'd2wallsmash', pan: 0.55 });
  if (on('d2wallsmash', D.SNAP)) {
    const b = new Float32Array(Math.round(0.5 * sr));
    debris(b, 0, sr, { gain: WALL.debris, seed: 9230 });
    addPanned(own.fx, b, at(D.SNAP), (p) => 0.4 + 0.5 * Math.min(1, 2.5 * p));
  }
  [D.SURF[3], D.SURF[3] + SIXTEENTH].forEach((f) => place(own.fx, f, 0.08, (b) => blip(b, 0, sr, { freq: 1109, ms: 60, gain: 0.07 }), { kind: 'd2fatal', pan: -0.2 }));
  place(own.fx, D.WRAP, 0.4, (b) => sweep(b, 0, sr, { from: 69, to: 35, ms: 250, gain: 0.35, attackMs: 2, drive: 1.2 }), { kind: 'd2bwomp' });
  swoosh(D.PAN.to, 12, { from: 5000, to: 600, gain: 0.24, q: 1.2, seed: 4575 }, { kind: 'd2pan', pan: (p) => -0.6 + 0.6 * p });
  place(own.fx, D.SURF[3], seconds(D.PAN.to - D.SURF[3]), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.26, seed: 4576 }), { group: 'd2reverse' });
  place(own.fx, D.BOW, seconds(D.PAN.to - D.BOW), (b) => riser(b, 0, b.length, sr, { gain: 0.22 }, 4577), { group: 'd2riser' });

  // ——— Bars 5, 8–17: the crane bar, the kernel, the switch, act 2 (scripts/audio/drop2Act2.mjs) ———————————————————————————————————
  renderNewBars(ctx);
  // ——— The worlds' chord voices and the new sync hits (scripts/audio/drop2Worlds.mjs) ———————————————————————————————————————————————
  renderWorlds(ctx);

  // ——— Bar 18: the reel ————————————————————————————————————————————————————————————————————————————————————————————————————
  place(own.drums, D.REEL.from, 1.8, (b) => impact(b, 0, sr, { gain: 0.2 }, 4580), { group: 'd2impact' });
  [D.REEL.from, ...D.CUTS2.slice(1)].forEach((f, k) => place(own.chime, f, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(RING_NOTES[k]), ratio: 3.5, index: 4, decay: 0.5, gain: 0.07 }), { kind: 'd2ring', pan: k % 2 ? 0.3 : -0.3 }));
  // Each hard cut's zap: a low thump, a click and an electric spit (a square falling 3 kHz → 300 Hz in 30 ms).
  D.CUTS2.slice(1).forEach((f, k) => place(own.drums, f, 1.8, (b) => {
    impact(b, 0, sr, { gain: 0.12 }, 4581 + k);
    click(b, 0, sr, { gain: 0.2, tone: 1800 }, 4584 + k);
    sweep(b, 0, sr, { from: 3000, to: 300, ms: 30, holdMs: 5, wave: 'square', gain: 0.1, attackMs: 0.3 });
  }, { kind: 'd2zap' }));
  // The wipes: the LED's columns (a blip a frame, climbing), the Riso plates' flap and clack, the stars' streak.
  place(own.fx, D.WIPES[0], 0.12, (b) => {
    for (let k = 0; k < 6; k++) blip(b, at(k), sr, { freq: 2000 * 1.8 ** (k / 5), ms: 10, gain: 0.03 });
  }, { kind: 'd2wipe', pan: -0.3 });
  swoosh(D.WIPES[1] + 3, 12, { from: 2000, to: 600, gain: 0.12, q: 0.9, seed: 4587 }, { kind: 'd2wipe', pan: (p) => -0.4 + 0.8 * p });
  place(own.fx, D.REGISTER, 0.1, (b) => {
    click(b, 0, sr, { gain: 0.25, tone: 900 }, 4588);
    pop(b, 0, sr, { freq: 600, gain: 0.06 });
  }, { kind: 'd2clack' });
  swoosh(D.WIPES[2] + 3, 9, { from: 9000, to: 2500, gain: 0.14, q: 1.6, seed: 4589 }, { kind: 'd2wipe', pan: (p) => -0.7 + 1.4 * p });
  D.REEL_BLADES.forEach((f, k) => shing('d2reelshing', f, RING_NOTES[k], BLADE_PANS[k], 0.08, 4590 + k));
  place(own.fx, D.REEL.from, seconds(D.CRASH - D.REEL.from), (b) => riser(b, 0, b.length, sr, { gain: 0.3 }, 4595), { group: 'd2riser' });

  // ——— 19.1–19.2: the race and the last drop ———————————————————————————————————————————————————————————————————————————————
  // E10's drop falling as a whistle (raised in iterations 2 and 3, the bed ducked under it: WHISTLE, WHISTLE_DUCK below).
  place(own.fx, D.DRIP, seconds(D.CRASH - D.DRIP), (b) => sweep(b, 0, sr, { from: WHISTLE.from, to: WHISTLE.to, ms: ((D.CRASH - D.DRIP) / FPS) * 1000, gain: WHISTLE.gain, attackMs: 20 }), { kind: 'd2whistle', pan: 0.55 });

  // ——— The freeze, 19.3: the post bus ————————————————————————————————————————————————————————————————————————————————————
  place(own.post, D.CRASH, 0.8, (b) => {
    impact(b, 0, sr, { gain: 0.25 }, 4900);
    click(b, 0, sr, { gain: 0.3, tone: 1200 }, 4901);
  }, { kind: 'd2thunk' });
  // The drop lands: the plink is the crash's own sound (+12 dB, iteration 2, ruling 12; the buzz waits a 16th, BUZZ_DELAY).
  place(own.post, D.CRASH, 2, (b) => fmBell(b, 0, sr, { freq: midi(90), ratio: 3.5, index: 3, decay: 0.4, gain: 0.24 }), { kind: 'd2plink', pan: 0.55 });
  place(own.post, D.CRASH, seconds(D.SORT.to - D.CRASH), (b) => sweep(b, 0, sr, { from: 90, to: 25, ms: ((D.SORT.to - D.CRASH) / FPS) * 1000, gain: 0.3, attackMs: 3 }), { kind: 'd2powerdown' });
  for (let k = 0, f = D.SORT.from; f < D.SORT.to; k++, f += 1.5) {
    place(own.post, f, 0.02, (b) => blip(b, 0, sr, { freq: midi(SORT_NOTES[Math.floor(hash(k, 4902) * SORT_NOTES.length)]), ms: 12, gain: 0.05 }), { pan: k % 2 ? 0.4 : -0.4, group: 'd2sort' });
  }
  mark('d2sort', D.SORT.from);
  D.RINGS.forEach((f, k) => place(own.post, f, 0.05, (b) => click(b, 0, sr, { gain: 0.08, tone: 2000 }, 4903 + k), { kind: 'd2ringtick' }));
  // T7's drain (as built, moved past the bullet time): v08, the drain is bridge B's, a ring a stage, and so are its whoosh and its falling
  // blips (sections/bridgeB.mjs bbdrain, bbfall: on the landing and the tear).
  mark('d2buzz', D.CRASH + BUZZ_DELAY);

  // ——— Drop 2's buses: the fader, the bitcrusher over the collapse, the kernel's hang, the downsample, the arcade's grain, the master
  // sweep through the reel, the high-pass from 19.1 ———————————————————————————————————————————————————————————————————————————————
  const music = [own.d2chords, own.d2music, own.d2vox, own.d2bass];
  pingPong(vox, sr, { time: 0.2, feedback: 0.28, mix: 0.24 });
  mixInto(own.d2vox, vox);
  mixInto(own.d2vox, dry);
  // M3: the music ducks under the wall smash (WALL_DUCK), back before the FATAL beeps of 7.4. W (fix round): before each stage all of drop
  // 2 but the post bus drops into its gap (GAP: PUSHES' gapDb, SNAP_GAP before the snap) and the drums, the fx and the air are back on the
  // hit; the music crosses from its gap into the duck under the push (PUSH_DUCK) or the smash (WALL_DUCK). One gain curve for the music
  // buses and one for the rest over bar 7; where two shapes meet the deeper wins.
  {
    const musicBuses = WALL_DUCK.buses.map((name) => (name === 'sub' ? own.sub : own[name]));
    // (The kit's air — the hats, the shaker, the crash's tail — joins the drums bus further down.)
    const restBuses = [...Object.keys(own).filter((k) => k !== 'post' && !WALL_DUCK.buses.includes(k)).map((name) => own[name]), air];
    const [w0, w1] = [at(D.SURF[0] - 2 * GAP.frames), Math.min(n, at(D.SURF[3]))];
    const gm = new Float32Array(Math.max(0, w1 - w0)).fill(1);
    const gr = new Float32Array(Math.max(0, w1 - w0)).fill(1);
    const lin = (db) => 10 ** (db / 20);
    const into = (g, i, v) => {
      if (i >= w0 && i < w1) g[i - w0] = Math.min(g[i - w0], v);
    };
    // The gap: down `db` over the 32nd before `frame`; the rest back on the hit's sample, the music held there for the duck to take over.
    const gap = (frame, db) => {
      const [a, b] = [at(frame - GAP.frames), at(frame)];
      const [att, rel, low] = [(GAP.attackMs / 1000) * sr, (GAP.releaseMs / 1000) * sr, lin(db)];
      for (let i = a; i < b; i++) {
        const down = Math.min(1, (i - a) / att);
        into(gm, i, 1 - (1 - low) * down);
        into(gr, i, 1 - (1 - low) * Math.min(down, (b - i) / rel));
      }
    };
    // The duck on the music: from the gap's level to `db` in attackMs, held holdMs, back with releaseMs.
    const duck = (frame, fromDb, db, { attackMs, holdMs, releaseMs }) => {
      const [a, att, hold, rel] = [at(frame), (attackMs / 1000) * sr, (holdMs / 1000) * sr, (releaseMs / 1000) * sr];
      const [from, low] = [lin(fromDb), lin(db)];
      for (let i = a; i < a + Math.round(att + hold + 6 * rel); i++) {
        const k = i - a;
        into(gm, i, k < att ? from + (low - from) * (k / att) : 1 - (1 - low) * (k < att + hold ? 1 : Math.exp(-(k - att - hold) / rel)));
      }
    };
    for (const p of PUSHES) {
      if (!on('d2push', p.at)) continue;
      gap(p.at, p.gapDb);
      duck(p.at, p.gapDb, p.duckDb, PUSH_DUCK);
    }
    if (on('d2wallsmash', D.SNAP)) {
      gap(D.SNAP, SNAP_GAP.db);
      duck(D.SNAP, SNAP_GAP.db, WALL_DUCK.db, WALL_DUCK);
    }
    for (const [names, g] of [[musicBuses, gm], [restBuses, gr]]) {
      for (const bus of names) for (const x of bus instanceof Float32Array ? [bus] : [bus.L, bus.R]) for (let i = w0; i < w1; i++) x[i] *= g[i - w0];
    }
  }
  const fade = new Float32Array(Math.max(0, Math.min(n, at(D.CRASH)) - at(D.DROP2_START)));
  for (let k = 0; k < fade.length; k++) fade[k] = 10 ** (faderDb(((k + at(D.DROP2_START)) / sr) * FPS) / 20);
  // Act 2's drums lifted (ACT2_DRUMS_DB on the body hits, ACT2_AIR_DB on the kit's air), the air then joining the drums bus.
  {
    const [a, b, ramp] = [at(D.BURST), at(D.REEL.from), Math.round(0.005 * sr)];
    for (const [bus, db] of [[own.drums, ACT2_DRUMS_DB], [air, ACT2_AIR_DB]]) {
      const g = 10 ** (db / 20) - 1;
      for (const x of [bus.L, bus.R]) for (let i = a; i < Math.min(n, b); i++) x[i] *= 1 + g * Math.min(1, (i - a + 1) / ramp, (b - i) / ramp);
    }
    mixInto(own.drums, air);
  }
  // The make-up (MAKEUP): what the bed's loudness took with it, given back to the voices that stayed, over drop 2 to the freeze.
  for (const [name, db] of Object.entries(MAKEUP)) {
    if (db) for (const x of [own[name].L, own[name].R]) for (let i = at(D.DROP2_START); i < Math.min(n, at(D.CRASH)); i++) x[i] *= 10 ** (db / 20);
  }
  // BURST_LIFT: 10.1's voices up for their beat (the music buses with the fader, the fx and chime buses on their own).
  {
    const w = BURST_LIFT;
    const lift = (f) => 10 ** ((w.db * Math.max(0, Math.min(1, (f - w.from) / (w.full - w.from), (w.to - f) / (w.to - w.hold)))) / 20);
    for (const name of w.buses) {
      for (let i = at(w.from); i < Math.min(n, at(w.to)); i++) {
        const g = lift((i / sr) * FPS);
        own[name].L[i] *= g;
        own[name].R[i] *= g;
      }
    }
  }
  for (const bus of music) {
    for (let k = 0, i = at(D.DROP2_START); k < fade.length; k++, i++) {
      bus.L[i] *= fade[k];
      bus.R[i] *= fade[k];
    }
    crush(bus.L, bus.R, at(D.BITCRUSH[0]), at(D.BITCRUSH[1]), sr, { bits: 8, holdHz: 16000 });
    crush(bus.L, bus.R, at(D.BITCRUSH[1]), at(D.GAME), sr, { bits: 4, holdHz: 8000 });
    // Defender downsamples the world (11.4): a step a 16th, coarser each (the print quantising in the picture); 12.1 is clean 8-bit.
    D.DOWNSAMPLE_STEPS.forEach((f, k) => crush(bus.L, bus.R, at(f), at(D.DOWNSAMPLE_STEPS[k + 1] ?? D.DOWNSAMPLE.to), sr, { bits: [10, 8, 6, 5][k], holdHz: [16000, 8000, 4000, 2000][k] }));
    sweepBus(bus, sr, at(D.REEL.from), at(D.CRASH), { peak: [500, 12000], q: 2.5, gainDb: 6, shelfDb: 5, shelfHz: 8000, hp: { from: at(D.SCREAM.from), hz: [20, 280] } });
  }
  // Width (WIDTH): the chord voices and the music bus wider over act 2, each bar's power kept (an M/S rotation).
  WIDTH_REPORT.mid = [];
  if (WIDTH.db) {
    const edges = Array.from({ length: WIDTH.to - WIDTH.from + 1 }, (_, k) => at(bar2(WIDTH.from + k)));
    for (const name of WIDTH.buses) WIDTH_REPORT.mid.push(widen(own[name], sr, edges, WIDTH));
  }
  // The arcade and the well: the chord voices in the world's grain (a 16 kHz sample-and-hold, no bit loss: its images glitter, its top survives).
  crush(own.d2chords.L, own.d2chords.R, at(D.ARCADE.from), at(D.TOTEM), sr, { bits: 16, holdHz: 16000 });
  // The kernel's hang (8.4): the mix muffles, 18 kHz → 900 Hz, and stays muffled through the install into the switch (Defender's beeps,
  // the riser and the air stay clear).
  for (const bus of [own.drums, own.fx, own.chime, ...music]) lowpassSweep(bus, sr, at(D.HANG.from), at(D.HANG.to), at(D.SWITCH.from), 18000, 900);
  sweepBus({ L: own.sub, R: new Float32Array(n) }, sr, at(D.SCREAM.from), at(D.CRASH), { peak: [500, 500], q: 2.5, gainDb: 0, shelfDb: 0, hp: { from: at(D.SCREAM.from), hz: [20, 280] } });
  // E10: the bed ducks where the whistle is, gliding down with it (iteration 3).
  for (const name of WHISTLE_DUCK.buses) trackingCut(own[name], sr, at(D.DRIP), at(D.CRASH), { from: WHISTLE.from, to: WHISTLE.to, db: WHISTLE_DUCK.db, q: WHISTLE_DUCK.q, fadeMs: WHISTLE_DUCK.fadeMs });

  // Glue: the drums' stacked hits (kick, impact, two claps, a snare) peak far over their level, and left alone they would pull the
  // whole mix down at the limiter; a soft clip rounds those peaks off first.
  soften(own.drums, 1.1);
  // The group's drive and clip (CLIP, DRIVE): the transients of drop 2's summed buses bent under the ceiling, the part driven into it.
  /** A Butterworth low-pass ({ hz, poles }) on every bus but the post bus, over drop 2 to the freeze. */
  const topPass = ({ hz, poles }) => {
    for (const [name, bus] of Object.entries(own)) {
      if (name === 'post') continue;
      for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) {
        const f = BUTTERWORTH_Q[poles].map((q) => Biquad.lowpass(sr, hz, q));
        for (let i = at(D.DROP2_START); i < Math.min(n, at(D.CRASH)); i++) x[i] = f.reduce((y, s) => s.process(y), x[i]);
      }
    }
  };
  if (TOP.hz && TOP.pre) topPass(TOP.pre);
  if (CLIP.on) clipGroup(own, sr, at(D.DROP2_START), Math.min(n, at(D.CRASH)), { ...CLIP, drive: (i) => stepDb(DRIVE, (i / sr) * FPS), bands: BAND_CLIP });
  if (TOP.hz) topPass(TOP);
  if (ONSET.ms) {
    const len = Math.round((ONSET.ms / 1000) * sr);
    for (const [name, bus] of Object.entries(own)) {
      for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) {
        for (let k = 0; k < len; k++) x[at(D.DROP2_START) + k] *= 0.5 - 0.5 * Math.cos((Math.PI * k) / len);
      }
    }
  }

  // ——— Everything is cut on the freeze (the post bus at the hand-off); then the bullet time, on the music buses again ———————————————
  for (const [name, bus] of Object.entries(own)) {
    if (name === 'post') continue;
    for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) truncate(x, at(D.CRASH), sr);
  }
  renderBullet(ctx, padsDry);
  for (const [name, bus] of Object.entries(own)) {
    for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) truncate(x, at(D.ZERO.from), sr);
    if (name === 'sub') {
      for (let i = 0; i < n; i++) stems.sub[i] += bus[i];
      continue;
    }
    if (stems[name]) mixInto(stems[name], bus);
  }
  // v07 (seam 5376): after the zero, the music box's hanging C♯6 comes back as a ghost on the outro's downbeat (MUSIC_BOX_GHOST), dry on the
  // post bus — the old world's last voice ringing a beat into the new one — gone within the beat. v08: the zero is bridge B's last 16th,
  // so the ghost is back on outro 1.1 (the zero's end), where v07 had it.
  const box = D.MUSIC_BOX[D.MUSIC_BOX.length - 1];
  const ghostAt = D.ZERO.to;
  if (MUSIC_BOX_ON && on('d2musicbox', ghostAt) && stems.post) {
    const len = at(ghostAt + MUSIC_BOX_GHOST.frames) - at(ghostAt);
    const g = new Float32Array(len);
    musicBox(g, 0, sr, { freq: midi(box.midi + MUSIC_BOX_FLAT[MUSIC_BOX_FLAT.length - 1] / 100), gain: 0.15 * 10 ** (MUSIC_BOX_GHOST.db / 20), decay: MUSIC_BOX_GHOST.decay });
    const fade = Math.round(0.03 * sr);
    for (let i = len - fade; i < len; i++) g[i] *= (len - i) / fade;
    addMono(stems.post, g, { at: at(ghostAt), pan: 0.1 });
    mark('d2musicbox', ghostAt);
  }
  return events;
}

/**
 * Drive and soft-clip the sum of drop 2's own buses (every bus but the post bus; the mono sub counts in both sides, as the master's mid
 * takes it) over samples [a, b), in place: every bus is turned up by `drive(i)` dB, then wherever the louder side of the sum peaks over
 * `ceiling` − `kneeDb` the sample's gain on every bus bends it towards `ceiling` (a tanh knee: slope 1 at the knee, never past the ceiling).
 * Both fade in and out over 5 ms at the edges.
 */
function clipGroup(own, sr, a, b, { ceiling, kneeDb, lookMs = 0, releaseMs = 0, drive = () => 0, bands = [] }) {
  const names = Object.keys(own).filter((k) => k !== 'post' && k !== 'sub');
  const len = b - a;
  if (len <= 0) return;
  const edge = Math.round(0.005 * sr);
  const knee = ceiling * 10 ** (-kneeDb / 20);
  const ramp = (i) => Math.min(1, i / edge, (len - i) / edge);
  // The drive per sample, and the clip's gain on the driven sum (1 under the knee).
  const d = new Float32Array(len);
  const c = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const j = a + i;
    d[i] = 1 + (10 ** (drive(j) / 20) - 1) * ramp(i);
    let l = own.sub[j];
    let r = l;
    for (const k of names) {
      l += own[k].L[j];
      r += own[k].R[j];
    }
    const p = d[i] * Math.max(Math.abs(l), Math.abs(r));
    const y = p <= knee ? p : knee + (ceiling - knee) * Math.tanh((p - knee) / (ceiling - knee));
    c[i] = p > 0 ? y / p : 1;
  }
  // Smoothed (lookMs, releaseMs): the gain falls linearly over the look-ahead to each sample's need and recovers exponentially, so it
  // never goes under the clip's and its own spectrum stays low (no splatter for the delivery's AAC to ring on).
  const g = Float32Array.from(c);
  const la = Math.round((lookMs / 1000) * sr);
  if (la > 0) {
    for (let j = 0; j < len; j++) {
      if (c[j] >= 1) continue;
      for (let k = 1; k <= la && j - k >= 0; k++) {
        const v = c[j] + ((1 - c[j]) * k) / (la + 1);
        if (v < g[j - k]) g[j - k] = v;
      }
    }
  }
  if (releaseMs > 0) {
    const rel = Math.exp(-1 / ((releaseMs / 1000) * sr));
    let cur = 1;
    for (let i = 0; i < len; i++) {
      cur = g[i] < cur ? g[i] : g[i] + (cur - g[i]) * rel;
      g[i] = cur;
    }
  }
  // BAND_CLIP's windows: the two-band clip, worked out on the buses before the one-band gain is applied below, crossfaded in after it.
  const banded = bands.map((w) => bandClip(own, names, sr, a, len, d, w)).filter(Boolean);
  const report = new Float32Array(len);
  const whole = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const j = a + i;
    report[i] = 1 + (g[i] - 1) * ramp(i);
    whole[i] = d[i] * report[i];
    own.sub[j] *= whole[i];
    for (const k of names) {
      own[k].L[j] *= whole[i];
      own[k].R[j] *= whole[i];
    }
  }
  for (const r of banded) {
    for (let j = r.w0; j < r.w1; j++) {
      const v = Math.min(1, (j - r.w0 + 1) / r.fadeIn, (r.w1 - j) / r.fade);
      const q = j - r.w0;
      own.sub[j] = v * r.sub[q] + (1 - v) * own.sub[j];
      for (const k of names) {
        own[k].L[j] = v * r.out[k].L[q] + (1 - v) * own[k].L[j];
        own[k].R[j] = v * r.out[k].R[q] + (1 - v) * own[k].R[j];
      }
      // The report: the high band's clip (what the music above the split meets) and its whole gain, where the two-band clip has taken over.
      report[j - a] = v * r.ch[q] + (1 - v) * report[j - a];
      whole[j - a] = d[j - a] * report[j - a];
    }
  }
  Object.assign(CLIP_REPORT, { a, clip: report, gain: whole, bands: banded.map((r) => ({ w0: r.w0, cl: r.cl, ch: r.ch, hz: r.hz })) });
}

/**
 * The two-band clip of one BAND_CLIP window (clipGroup): every bus (and the sub, in both sides) split zero-phase at `hz` (a 2-pole
 * Butterworth low-pass run forward and back, 50 ms run-in either side; the high band is the bus less it), each band's driven sum bent on its
 * own peaks — the low band's from `low.knee` towards `low.ceiling`, the high band's from `high.knee` towards `high.ceiling` (tanh knees, as
 * the group clip's) — and each bus rebuilt as its two bands, each with its band's gain. Returns the window's buses (samples [w0, w1) of the
 * film) and the bands' gains, or null outside the run.
 */
function bandClip(own, names, sr, a, len, d, { from, to, hz, low, high, fadeInMs = 0, fadeMs }) {
  const [w0, w1] = [Math.max(a, Math.round((from / FPS) * sr)), Math.min(a + len, Math.round((to / FPS) * sr))];
  if (w1 <= w0) return null;
  const pad = Math.round(0.05 * sr);
  const [s0, s1] = [Math.max(0, w0 - pad), Math.min(own.sub.length, w1 + pad)];
  const split = (x) => {
    const lo = Float64Array.from(x.subarray(s0, s1));
    for (const dir of [1, -1]) {
      const f = Biquad.lowpass(sr, hz, Math.SQRT1_2);
      if (dir === 1) for (let i = 0; i < lo.length; i++) lo[i] = f.process(lo[i]);
      else for (let i = lo.length - 1; i >= 0; i--) lo[i] = f.process(lo[i]);
    }
    return lo;
  };
  const lows = Object.fromEntries(names.map((k) => [k, { L: split(own[k].L), R: split(own[k].R) }]));
  const subLow = split(own.sub);
  const n = w1 - w0;
  const bend = (p, { knee, ceiling }) => (p <= knee ? 1 : (knee + (ceiling - knee) * Math.tanh((p - knee) / (ceiling - knee))) / p);
  const cl = new Float32Array(n);
  const ch = new Float32Array(n);
  for (let q = 0; q < n; q++) {
    const j = w0 + q;
    const o = j - s0;
    let [ll, lr, hl, hr] = [subLow[o], subLow[o], own.sub[j] - subLow[o], own.sub[j] - subLow[o]];
    for (const k of names) {
      ll += lows[k].L[o];
      lr += lows[k].R[o];
      hl += own[k].L[j] - lows[k].L[o];
      hr += own[k].R[j] - lows[k].R[o];
    }
    const dd = d[j - a];
    cl[q] = bend(dd * Math.max(Math.abs(ll), Math.abs(lr)), low);
    ch[q] = bend(dd * Math.max(Math.abs(hl), Math.abs(hr)), high);
  }
  const out = {};
  for (const k of names) {
    out[k] = { L: new Float32Array(n), R: new Float32Array(n) };
    for (let q = 0; q < n; q++) {
      const [j, o, dd] = [w0 + q, w0 + q - s0, d[w0 + q - a]];
      out[k].L[q] = dd * (cl[q] * lows[k].L[o] + ch[q] * (own[k].L[j] - lows[k].L[o]));
      out[k].R[q] = dd * (cl[q] * lows[k].R[o] + ch[q] * (own[k].R[j] - lows[k].R[o]));
    }
  }
  const sub = new Float32Array(n);
  for (let q = 0; q < n; q++) {
    const [j, o, dd] = [w0 + q, w0 + q - s0, d[w0 + q - a]];
    sub[q] = dd * (cl[q] * subLow[o] + ch[q] * (own.sub[j] - subLow[o]));
  }
  return { w0, w1, fadeIn: Math.max(1, Math.round((fadeInMs / 1000) * sr)), fade: Math.max(1, Math.round((fadeMs / 1000) * sr)), out, sub, cl, ch, hz };
}

/** A soft clip of a stereo bus, in place: tanh(drive · x) / drive (unity for small signals, peaks rounded off). */
function soften(bus, drive) {
  for (const ch of [bus.L, bus.R]) for (let i = 0; i < ch.length; i++) ch[i] = Math.tanh(drive * ch[i]) / drive;
}

/** Adds stereo `src` into stereo `dst`, sample for sample. */
function mixInto(dst, src) {
  for (let i = 0; i < dst.L.length; i++) {
    dst.L[i] += src.L[i];
    dst.R[i] += src.R[i];
  }
}

/** BS.1770's K-weighting at 48 kHz (its two biquads, as meter.mjs): widen() keeps the power a loudness meter hears. */
const K48 = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];

/**
 * Width as an M/S rotation (WIDTH; music fix R7), in place, over the segments [edges[j], edges[j + 1]) (drop 2's bars): in the band
 * above `hz` (a 2-pole high-pass of the mid, h, and of the side, k) the side is raised by `db` (s' = s + (gs − 1) k) and the mid lowered
 * (m' = m + x h, x < 0) by what keeps the segment's K-weighted power where it was: P(m') + P(s') = P(m) + P(s), solved exactly (the
 * band's cross terms with the rest included), so BS.1770, which sums the channels' powers (L² + R² = 2 (m² + s²)), does not move. The
 * gains ease from segment to segment over 10 ms and in and out over 5 ms at the ends; every sample outside [edges[0], edges.at(-1))
 * stays. The filters run in over the 4096 samples before the first edge. Returns the gain on the mid's high band, 1 + x, per segment (dB;
 * 0 where the bus has no side to gain, or where the power cannot be kept).
 */
export function widen(bus, sr, edges, { db, hz }) {
  if (!db || edges.length < 2) return [];
  if (sr !== 48000) throw new Error('widen: the K-weighting is for 48 kHz');
  const a = edges[0];
  const b = Math.min(bus.L.length, edges[edges.length - 1]);
  const pre = Math.max(0, a - 4096);
  const len = b - pre;
  if (len <= 0) return [];
  const [fm, fs] = [Biquad.highpass(sr, hz), Biquad.highpass(sr, hz)];
  const m = new Float64Array(len);
  const s = new Float64Array(len);
  const h = new Float64Array(len);
  const k = new Float64Array(len);
  for (let j = 0; j < len; j++) {
    const i = pre + j;
    m[j] = 0.5 * (bus.L[i] + bus.R[i]);
    s[j] = 0.5 * (bus.L[i] - bus.R[i]);
    h[j] = fm.process(m[j]);
    k[j] = fs.process(s[j]);
  }
  const kw = (x) => {
    const st = K48.map(([b0, b1, b2, a1, a2]) => new Biquad(b0, b1, b2, a1, a2));
    return Float64Array.from(x, (v) => st[1].process(st[0].process(v)));
  };
  const [km, kh, ks, kk] = [kw(m), kw(h), kw(s), kw(k)];
  const gs = 10 ** (db / 20);
  const gm = [];
  for (let e = 0; e + 1 < edges.length; e++) {
    let [hh, mh, sk, kkp] = [0, 0, 0, 0];
    for (let j = Math.max(0, edges[e] - pre); j < Math.min(len, edges[e + 1] - pre); j++) {
      hh += kh[j] * kh[j];
      mh += km[j] * kh[j];
      sk += ks[j] * kk[j];
      kkp += kk[j] * kk[j];
    }
    // P(s') − P(s) = 2 (gs − 1) <s, k> + (gs − 1)² P(k); the mid gives it back: P(h) x² + 2 <m, h> x + that = 0, the root nearest 0.
    const c = 2 * (gs - 1) * sk + (gs - 1) ** 2 * kkp;
    const disc = mh * mh - hh * c;
    const x = hh > 0 && disc >= 0 ? (-mh + Math.sqrt(disc)) / hh : 0;
    gm.push(Math.max(0.5, 1 + x));
  }
  const ramp = Math.round(0.01 * sr);
  const edge = Math.round(0.005 * sr);
  for (let i = a; i < b; i++) {
    let e = 0;
    while (e + 2 < edges.length && i >= edges[e + 1]) e++;
    const into = i - edges[e];
    const g = e > 0 && into < ramp ? gm[e - 1] + ((gm[e] - gm[e - 1]) * (into + 1)) / ramp : gm[e];
    const w = Math.min(1, (i - a + 1) / edge, (b - i) / edge);
    const j = i - pre;
    const mid = m[j] + (g - 1) * w * h[j];
    const side = s[j] + (gs - 1) * w * k[j];
    bus.L[i] = mid + side;
    bus.R[i] = mid - side;
  }
  return gm.map((g) => 20 * Math.log10(g));
}

/**
 * A low-pass closing on a stereo bus, in place: off before sample `a`, its cutoff falling exponentially from `from` to `to` Hz by `b`,
 * held there until `c`, where it lets go over 1.5 ms. Coefficients are recomputed every 16 samples; it runs in over the 4096 before `a`.
 */
function lowpassSweep(bus, sr, a, b, c, from, to) {
  const x = Math.max(1, Math.round(0.0015 * sr));
  for (const ch of [bus.L, bus.R]) {
    const f = Biquad.lowpass(sr, from);
    const end = Math.min(ch.length, c + x);
    for (let i = Math.max(0, a - 4096); i < end; i++) {
      if ((i - a) % 16 === 0 && i >= a) {
        const next = Biquad.lowpass(sr, from * (to / from) ** Math.min(1, (i - a) / (b - a)));
        Object.assign(f, { b0: next.b0, b1: next.b1, b2: next.b2, a1: next.a1, a2: next.a2 });
      }
      const y = f.process(ch[i]);
      if (i < a) continue;
      const w = Math.min(1, (i - a + 1) / x, (c + x - i) / x);
      ch[i] = w * y + (1 - w) * ch[i];
    }
  }
}

/** Adds mono `src` into the stereo bus `dst` from sample `at`, its pan a function of its progress 0 … 1 (constant power). */
function addPanned(dst, src, at, pan) {
  for (let i = 0; i < src.length; i++) {
    const j = at + i;
    if (j < 0 || j >= dst.L.length) continue;
    const [l, r] = panGains(pan(i / src.length));
    dst.L[j] += src[i] * l;
    dst.R[j] += src[i] * r;
  }
}
