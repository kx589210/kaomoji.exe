// The interlude's sound, the part 'break' (8 bars), from its build sheet (notes/bid2/break-sheet2.md §3, §10; the design
// notes/extend/interlude-final.md §8; the music bible notes/prep/music.md §4.6, which wins on music) and the frames of
// src/score/break.ts, so every hit lands on the picture's frame (an event on frame f starts on sample f / 60 s × sr exactly).
// Positions below are break bar.beat (break 2.1 is the impact).
//   Break 1, FALL (as built): no drums — the glass is the rhythm. A sub thoom on 1.1, then a tink on every pane that lets go, pitched down
//   a B♭maj9 arpeggio and doubling every beat (1, 2, 4, 8 releases), a plip under every landing climbing like a bottle filling, a glass pad,
//   and a cascade rising in 32nds into the impact with a reverse cymbal, a sub swell and a swarm of glass grains.
//   Break 2–4 (as built, plus the antivirus's hand): half time. Drop 1's hook comes back on a tuned glass bell as his face is rebuilt — two
//   notes, then four, then six — over drop 1's own voicings (VOICINGS: IV–V–iii–vi in F), the glass keeping time on the offbeats; E2's
//   knocks, the "ow!", the dizzy "uwa~", the 3.4 stutter, the card flip, the 8-bit arp, E3's re-roll ticks, tofu thunk, fetch and galaxy
//   streak, the rescan; then the hang: the music bends down an octave in a tape stop and stops dead under the restart wipe. v2 adds the
//   antivirus's dry clicks, the creak, the torn work orders, the thuds, the skid, its one beat of POV (a hum, a chirp, lock beeps riding
//   the stutter, a CRT tick), the reels, the crash-zoom whoosh.
//   Break 5, WHOLE (as built, plus): four on the floor, HOOK[3] sung (the bell an octave up); v2 adds the pull-out's fwoom, the guest's
//   infection (the Defender's dry C beep bending to C♯, then "wa": the music bible's M7 and M8), the marquee zip, the chip keys and the
//   editor's UI pop (J-cut into 6.1).
//   Break 6, GRAPH (new): the coaster's four on the floor and a 16th kick fill, HOOK[4] whole on vox + bell over C9sus4 → C9 — its G6
//   scooped −7 st into the first bottom, its E6 bent −5 st into the second — the rail roar following his speed, plunge whistles, sparks
//   on the bottoms, the chain lift's ratchet, the airtime whoosh, the rewind and the whip (peaking on the hidden cut).
//   Break 7, SLING: the catch (car crunch, band boing), v04's bar-6 system sounds one bar later (brows, error chime, LOUDER, root, sudo,
//   the password, access granted — now in F), a climbing vox step per notch (A5 C6 D6 F6) with a band creak, the glass motif reversed and
//   rising on sudo, the link ticks, the bonked cursor, the denied buzz, the [ROOT] blip; Am9 → C9sus4, the riser and the rubber band.
//   Break 8, FAKE DROP: v04's held breath, 1.5 bars later — the pivot (every voice glides up a semitone to C♯9sus4 over a C♯2 drone), the
//   motif a semitone up, the steps G♯5 B5 C♯6 D♯6, the accelerating kicks, the 32nd race, "hup!" as the drums stop, the lows sucked out —
//   then the RELEASE on 8.3: every music bus cut dead, a thwang and a whoosh at the camera, the bwomp as the film catches him, and from the
//   look on 8.3& (S4) digital silence to drop2 1.1.
// Every voice is written into the break's own buses (SENDS), in takes: what starts before the restart wipe is stuttered and tape-stopped
// and silent from the wipe on; what starts from the wipe on plays to the release; the vox and the bell keep what they sing and ring from
// the wipe until the pivot (8.1) in a take of their own, whose last 8th goes to a drier send and fades out over the pivot's first 16th, so
// no F or G natural rings into the C♯ bar (review R1-11); what starts on the release (the thwang, the whoosh, the bwomp) plays to the look.
// KEEP-FIRST (sheet §4): the twelve as-built buses carry v04's sounds of bars 1–5 byte for byte (tests/breakAudio.test.mjs pins them);
// every v2 addition there is on the new buses (brDef, brFoley, brChop), and only two v04 sounds are re-voiced, both logged below.
// Seeds hashed from a frame take seedFrame (src/score/film.ts): v04's sounds keep the draws they were approved with wherever the map
// moves them (bar 7 is v04's bar 6; bar 8's held breath reads v04's 6.3–6.4&); the new bar 6 seeds part-locally.
// SOUND CHANGE LOG (KEEP-FIRST: every change to a built shot's sound, and why; the sheet's §4.4 #13 in detail):
//   S1 4.3 the rescan (brrescan): v04's sine 400 → 1600 Hz on brFx → a square C5 → C7 on brDef. Design §8.1 (2832): the rescan is
//      the antivirus's scan, "re-voiced harsher"; red/its sounds belong only to the antivirus, dry and on C (music bible M8, M9).
//   S2 5.4& the callout keys (brcallout, 5.4& + 6/8/10, off the 32nd grid) → two chip keys on 5.4& + 6 and + 9 (brchipkey; design §8.1
//      2970 / 2973). The picture's callout became the red marquee select (sheet §4.4 #3), so its keys follow it onto the grid.
//   S3 bar 7 (v04's bar 6, carried): v04's sounds keep their samples (proved; tests pin them), but the bed under them is the design's
//      Am9 → C9sus4 on 7.3 (A1 → C2; v04: C9sus4 throughout, pivot on its 6.3). The pivot moved to 8.1 with the picture's reverse angle.
//   S4 bar 7 access granted: v04's C♯5 → F♯5 (after its pivot) → C5 → F5, in key (design §8.1 3144; the semitone lift is 8.1 now).
//   S5 bar 7.4: the kick and clap ring out — v04 cut them 18 frames in with its held breath's HP suck (identical up to there).
//   S6 v04's held breath (its 6.3 → 7.1: steps G♯5 B5 C♯6 D♯6, motif, race, hup, the suck) → bar 8, 1.5 bars later, same draws.
//   S7 the build's air (v2 sounds only; the resumed audio build, 2026-10-02): the first 8-bar mix lost air in the coaster and the sling
//      (−1.3 dB above 4 kHz against break 5; the centroid fell 6268 → 5612 → 5333 → 5040 Hz into the release, where the design's §8.3
//      wants it rising). The hats v2 adds (bar 6, 7.3& on, bar 8: 0.17, HP 9.5 kHz; open 0.14, 8.5 kHz), the coaster's crashes (0.14),
//      the roar's wind on the plunges, the coaster's pad a little lower (0.108), the held breath's pad from 0.13, and the riser
//      (breakSfx lift: its air by 7.3, where drums.mjs's p² riser, stretched to 144 frames, stayed dark through the sling). Now: centroid
//      6268 → 6511 Hz into the coaster; the sling's catch a breath darker, then the air rises every half bar from 7.3 to the release
//      (tests/breakAudio "the build opens"). v04's bar-6 hats in 7.1–7.3e are untouched.
//   S8 S4's dead air (+738–767; review F8, round 1): the mix was already digital zero there, but the WAVs carried the 16-bit dither's
//      ±1 LSB (12,085 of break.wav's 48,000 samples; about −96 dBFS rms). DIGITAL_ZERO now has bgm.mjs write it as exact zeros (sheet
//      §10.4, §11.3 at +744). Inaudible; only those 30 frames' bytes change (bgm.wav, break.wav, drop2-seam.wav), every other byte of
//      every WAV as before (proved by writing one render both ways; tests/breakAudio "S4 is written as exact zeros").
//   S9 v08, the fake drop's riser (bar 8 only; the v07 review: after the slingshot the volume and the white
//      noise blast). Measured on v07's bgm.wav: from 8.1 the mix's band over 6 kHz climbed 10 dB in a beat and a half (−32 → −22 dB a 16th,
//      the film's loudest high band outside drop 2's reel), almost all of it the riser's noise (breakSfx lift: a band of noise sweeping on to
//      12 kHz and swelling +2.8 dB into the release); 8.2's sharpness reached the film's 95th percentile (scripts/audio/perceived.mjs).
//      From 8.1 the riser is RISER_V08's: its noise band stops at 10 kHz, and from 8.1e its level eases 2.5 dB down instead of swelling —
//      the band over 6 kHz now peaks ≈ 4 dB lower (−26 dB a 16th) and 8.2's sharpness is back near the film's median (2.30 → 2.12
//      acum), while the air still rises every half bar into the release, on the race, the hats and the motif. The hiss was also what
//      ARC_RIDE rode down on 8.2: its key there −0.45 → −0.05 dB, so 8.2 stays the interlude's loudest beat and bar 8 over bar 7 (LUFS).
//      Bar 7's samples of the riser are as built (the same draws, the same filter: tests/breakAudio pins them).
//   Kept, against the sheet's §10.5 step 5: break 5's sung HOOK[3] as built (AS_BUILT_HOOK3). v04's vowel/pan lookup never matched
//   (HOWTO-insert §7), so it sang every note on 'a' with the bell panned 0.3 — that is the bar as kept; fixing the lookup would
//   change it. Break 6 binds its vowels and bends by index, as the design asks.
import { hash, rng } from '../../../src/engine/random.ts';
import { SIGNATURE } from '../../../src/content/break.ts';
import * as BR from '../../../src/score/break.ts';
import { partBar, partFrame, seedFrame } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BAR, barFrame, barOfFrame } from '../../../src/score/tempo.ts';
import { boing, bonk, bwomp, chain, creak, crtTick, crunch, fwoom, hum, links, reverseNoise, rewind, rip, roar, shimmer, skid, sparks, thud, thwang, tick, uiPop } from '../breakSfx.mjs';
import { chip, chirp, gloop, knock, pad, plip, powerUp, rubberBand, sing, slap, stutterSlices, sweepHighpass, tapeStop, tink, tinkSwarm, wobbleBell, zip } from '../breakVoices.mjs';
import { clap, click, hat, impact, kick, press, snare } from '../drums.mjs';
import { SVF } from '../filters.mjs';
import { fmBell } from '../fm.mjs';
import { Osc } from '../osc.mjs';
import { WHOOSH_PEAK, crash, flutter, reverseCymbal, spark, whoosh } from '../fx.mjs';
import { keyPan, keyPress } from '../keys.mjs';
import { addMono, duck, pingPong, stereo, truncate } from '../mix.mjs';
import { pluckBass, subPulse } from '../synth.mjs';
import { HOOK, VOICINGS } from './drop1.mjs';

/** The break's first note — the sub thoom and the first tink on break 1.1 — where the music comes back after the club's hit (bgm.mjs gates the mix silent from the hit up to here). */
export const BREAK_MUSIC = BR.BREAK_START;
/**
 * Where the reverb restarts: the restart wipe (break 4.4&: no tail of the hang under it), the release (8.3: the music cut dead, so no pad
 * tail survives it), the look (8.3&: S4 begins) and drop2 1.1 (drop 2's downbeat).
 */
export const CUTS = [BR.WIPE.from, BR.RELEASE, BR.LOOK, BR.BREAK_END_V2];
/** S4, the fake drop's dead air (music bible §5): from the look to drop 2's downbeat the whole mix is digital zero (no pip). */
export const SILENCES = [{ from: BR.SILENCE.from, to: BR.SILENCE.to }];
/**
 * … and written as digital zero (sheet §10.4, §11.3 at +744: "the audio exact zeros"): bgm.mjs writes these frames without the 16-bit
 * dither (wav.mjs `silent`) in every WAV that holds them — bgm.wav, break.wav and drop 2's `drop2-seam` preview, the fake drop itself.
 * Review F8 (round 1): the dither had left ±1 LSB (about −96 dBFS rms) in the dead air. Every other byte of every file is unchanged.
 */
export const DIGITAL_ZERO = SILENCES;
/** The as-built buses (v04's twelve: their bars 1–5 are byte for byte v04's) … */
export const V04_BUSES = ['brDrums', 'brGlass', 'brBell', 'brPad', 'brBass', 'brSub', 'brArp', 'brVox', 'brFx', 'brRiser', 'brDry', 'brEgg'];
/**
 * … and v2's: brDef, the antivirus's hand (its clicks, the scanner, the beeps, the rewind) — dry and narrow, its notes on C (music bible
 * M8, M9); brFoley, the world's new sounds (creaks, rips, thuds, the coaster, the slingshot, the film, and the release's thwang, whoosh
 * and bwomp, which play past the cut); brChop, the virus's new vocal chop (the infection's "wa"), wet like the vox.
 */
export const V2_BUSES = ['brDef', 'brFoley', 'brChop'];
/**
 * The break's own buses and their reverb sends. brDry: the vox and the bell of the last 8th before the pivot (less plate to ring on).
 * brEgg: the sounds that must be heard over the build — sudo's keys and the "hup!" (iteration 2, ruling 5) — kept apart so the bed can
 * duck under them.
 */
export const SENDS = { brDrums: 0.08, brGlass: 0.32, brBell: 0.2, brPad: 0.25, brBass: 0, brSub: 0, brArp: 0.15, brVox: 0.4, brFx: 0.22, brRiser: 0.12, brDry: 0.08, brEgg: 0.15, brDef: 0.04, brFoley: 0.18, brChop: 0.4 };
/** No preview of its own: drop 2's `drop2-seam` (break 7 → drop2 1) is the music bible's `fake` preview, the fake drop with its pop. */
export const PREVIEWS = [];
/**
 * The arc's ride (the whole-film mix pass, 2026-10-03; the pending rule "break 6–8 stay under drop 1 by 0.5 LU"): the restyled, quieter
 * drop 1 (the cosmos −11.1 LUFS once the chord bed went, the club restyled without one) left break 8 — the build to the held breath, 8.1 →
 * the release — at −10.84 LUFS, level with drop 1's −10.91 (cosmos → club 3). Drop 1 cannot come up (drop 2 must stay ≥ drop 1 + 1.5 LU,
 * and it sits on its own caps), so the end of the build comes down on the finished mix, a fader ridden by the beat (`keys`: each level
 * reached on its frame over the 16th before it, `rampFrames`, on a raised cosine; the last held through the release and its gloat to the
 * look, S4's dead air, digital zero after): 7.4 a little (so it stays under 8.2), 8.1 the most, 8.2 — the hup and the race, the
 * interlude's loudest beat — less, a push into the release. The interlude still builds bar by bar (bar 7 over bar 6 by more than 0.5 LU,
 * bar 8 over bar 7 by more than 0.2), and 8.2 is still its loudest beat. v08 (change log S9): 8.2 −0.45 → −0.05 dB — what the ride
 * took off 8.2 was mostly the riser's hiss, which S9 takes out at its source; with the hiss gone 8.2 needs the level to stay the
 * interlude's loudest beat and bar 8 over bar 7, and the fader no longer has to hold it down.
 */
export const ARC_RIDE = {
  keys: [
    { at: partFrame('break', 7, 3), db: -0.3 },
    { at: BR.REVERSE, db: -1.1 },
    { at: partFrame('break', 8, 1), db: -0.05 },
  ],
  to: BR.LOOK,
  rampFrames: 6,
};
/** ARC_RIDE's gain (dB) at film frame `f` (fractional): 0 before the first ramp and from LOOK; each key's level from its frame. */
export function arcRideDb(f) {
  const { keys, to, rampFrames } = ARC_RIDE;
  if (f >= to) return 0;
  let db = 0;
  for (const k of keys) {
    if (f < k.at - rampFrames) break;
    const u = Math.min(1, (f - (k.at - rampFrames)) / rampFrames);
    db += (k.db - db) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  return db;
}
/** ARC_RIDE's gain at film frame `f`, linear. */
export const arcRide = (f) => 10 ** (arcRideDb(f) / 20);
/**
 * The finished mix's edit (bgm.mjs runs every section's finish() after the limiter): only the arc's ride (ARC_RIDE), cuts, so nothing
 * goes over. The stutter, the tape stop and the release are made in the break's own buses. In place.
 */
export function finish(L, R, sr) {
  const a = Math.round(((ARC_RIDE.keys[0].at - ARC_RIDE.rampFrames) / FPS) * sr);
  const b = Math.min(L.length, Math.round((ARC_RIDE.to / FPS) * sr));
  for (let i = a; i < b; i++) {
    const g = arcRide((i / sr) * FPS);
    L[i] *= g;
    R[i] *= g;
  }
}

/**
 * Iteration 2, ruling 5: the eggs' sound halves were 17–26 dB under the mix (the review's solo-against-mix test), so sudo's four keys and
 * the "hup!" are raised by these many dB over v01's gains (keys 0.12, hup 0.38) …
 */
export const EGG_RAISE_DB = { brsudo: 12, brhup: 14 };
/**
 * … and the bed — every bus of the break but the drums (sudo's first key lands with a kick and clap), the sub drone (lows do not mask them)
 * and the eggs' own — ducks under each: down by `depthDb` over the `leadMs` before its onset, held `holdMs`, back over `releaseMs`.
 */
export const EGG_DUCKS = {
  brsudo: { depthDb: 7, leadMs: 3, holdMs: 35, releaseMs: 15 },
  brhup: { depthDb: 9, leadMs: 4, holdMs: 60, releaseMs: 30 },
};
const raised = (gain, kind) => gain * 10 ** (EGG_RAISE_DB[kind] / 20);

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
/** A seed in the break's range (3000–3999) for voice `v` on frame `f`: the approved draw (seedFrame). */
const seed = (v, f) => 3000 + Math.floor(hash(v, seedFrame(f), 3000) * 1000);
/** The new bar 6's seeds: part-local, so inserting bars before the break never re-rolls them (seedFrame seeds an inserted bar absolutely). */
const seedLocal = (v, f) => 3000 + Math.floor(hash(v, f - BR.BREAK_START, 3002) * 1000);
const steps = (a, b, step) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** A frame of the break: its bar (1-based) and beat (0-based, as partFrame). */
const br = (bar, beat = 0) => partFrame('break', bar, beat);
/** The downbeats of the break's eight bars (the score's BREAK_BARS_V2). */
const [, BAR2, BAR3, BAR4, BAR5, BAR6, BAR7, BAR8] = BR.BREAK_BARS_V2;
/** v04's held breath (its 6.3 → 7.1) plays 1.5 bars later, on 8.1 → 8.3: bar 8 reads its draws from this many frames earlier. */
const HELD_SHIFT = BR.REVERSE - BR.SLINGSHOT[0] - FRAMES_PER_BAR;
/**
 * The seed of voice `v` on frame `f`: v04's draw where the sound is v04's — bars 1–5 in place, bar 7 (v04's bar 6 one bar later, which
 * seedFrame maps), bar 8 (v04's 6.3–6.4&, read HELD_SHIFT frames earlier, in bar 7) — and the part-local one in the new bar 6.
 */
const seedOf = (v, f) => (f >= BAR6 && f < BAR7 ? seedLocal(v, f) : seed(v, f >= BAR8 ? f - HELD_SHIFT : f));

/** 2.1's suck: the reverse cymbal, the swarm and the sub swell stop this long (s) before the impact, so the break's first drum slaps. */
const SUCK_S = 0.025;
/** The impact's kick and slap (the impact only; break 2's other kicks keep KICK's gain). */
const IMPACT_GAIN = { kick: 0.45, slap: 0.45 };
/** 8.1, the pivot: every voice glides up a semitone to C♯9sus4 (the reverse angle, the film, the new chapter: music bible §2.2). */
const PIVOT = BR.REVERSE;

/** The chord of each change of the score's CHORDS_V2 (drop 1's VOICINGS; the sub plays their roots, SUB below). */
const CHORD = { [br(2)]: 'Vsus', [br(2, 2)]: 'V', [br(3)]: 'iii', [br(4)]: 'vi', [br(5)]: 'IV', [br(6)]: 'Vsus', [br(6, 2)]: 'V', [br(7)]: 'iii', [br(7, 2)]: 'Vsus' };

/**
 * The hook notes the score's HOOK_V2 plays, from drop 1's HOOK: break 2 plays row 0 … break 6 row 4 (whole), each note the one drop 1
 * plays on that sixteenth: { frame, bar (the film bar), midi, len } (len in frames).
 */
export function hookNotes() {
  return BR.HOOK_V2.map((frame) => {
    const bar = barOfFrame(frame);
    const s = (frame - barFrame(bar)) / 6;
    const note = HOOK[bar - partBar('break', 2)]?.find(([x]) => x === s);
    if (!note) throw new Error(`break: frame ${frame} is not a note of drop 1's hook`);
    return { frame, bar, midi: note[1], len: note[2] * 6 };
  });
}

/**
 * Break 6's sung HOOK[4], bound to it by index (design §8): each note's vowel, and the bends the coaster gives two of them — HOOK[4][2]
 * scooped −7 semitones into the first bottom (6.2) and back a 16th later, HOOK[4][4] bent −5 semitones over the plunge into the second
 * (6.3& → 6.4). A bend starts and ends on a hook note: it is a gesture, not a new melody. Each is { from, to, by } in frames from the note.
 */
export const HOOK6 = {
  vowels: ['e', 'o', 'a', 'i', 'o', 'e', 'u'],
  bends: { 2: { down: [0, BR.BOTTOMS[0] - BR.PLUNGES[0].from], back: [BR.BOTTOMS[0] - BR.PLUNGES[0].from, 2 * (BR.BOTTOMS[0] - BR.PLUNGES[0].from)], by: -7 }, 4: { down: [BR.PLUNGES[1].from - BR.CREST, BR.BOTTOMS[1] - BR.CREST], by: -5 } },
};
/** Break 5's sung HOOK[3] as built (v04): every note on 'a' and every bell an octave up panned 0.3 — v04's index lookup never found its note (HOWTO-insert §7), and what it sang is kept (KEEP-FIRST; sheet §10.5 step 5: logged, not fixed). */
const AS_BUILT_HOOK3 = { vowel: 'a', bellPan: 0.3 };

/** The coaster's track (the design's ride, extend/interlude-final-work/ride.mjs, for the sound): GRAPH_KEYS[0..8] at SIGNATURE's values, eased per segment. */
const EASE = {
  inCubic: (u) => u ** 3,
  outQuad: (u) => 1 - (1 - u) ** 2,
  inQuart: (u) => u ** 4,
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  inSine: (u) => 1 - Math.cos((u * Math.PI) / 2),
  outBack: (u) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
  outElastic: (u) => (u === 0 ? 0 : u === 1 ? 1 : 2 ** (-10 * u) * Math.sin(((u * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
};
const RIDE = ['inCubic', 'outQuad', 'inQuart', 'inOutSine', 'inSine', 'inCubic', 'outBack', 'outElastic'];
/** His track value (0–255) at frame f of the ride. */
export const trackValue = (f) => {
  const keys = BR.GRAPH_KEYS.slice(0, RIDE.length + 1);
  const val = (k) => parseInt(SIGNATURE[k], 16);
  for (let k = 0; k < RIDE.length; k++) {
    if (f <= keys[k + 1]) return val(k) + (val(k + 1) - val(k)) * EASE[RIDE[k]](Math.max(0, Math.min(1, (f - keys[k]) / (keys[k + 1] - keys[k]))));
  }
  return val(RIDE.length);
};
/** His track speed (px/f): 24 px/f along the graph, the value's slope × 3.6 px a step up it. */
export const trackSpeed = (f) => Math.hypot(24, (3.6 * (trackValue(f + 0.25) - trackValue(f - 0.25))) / 0.5);

// ——— Break 1: what each pane plays (break-sheet §5.3; pans from the cells' x, (x − 960) / 960 × 0.9) ———————————————————————————————————

/** Each release's tink: [MIDI, pan] — down a B♭maj9 arpeggio (A6 F6 D6 B♭5 A5 F5 D5), then the cascade rising in 32nds into 2.1. */
const TINKS = {
  [br(1)]: [93, 0.04], [br(1, 1)]: [89, -0.84], [br(1, 1.5)]: [86, 0.96], [br(1, 2)]: [82, -0.26], [br(1, 2.25)]: [81, 0.1], [br(1, 2.5)]: [77, 0.02], [br(1, 2.75)]: [74, -0.18],
  [br(1, 3)]: [82, 0], [br(1, 3.125)]: [86, -0.02], [br(1, 3.25)]: [89, -0.01], [br(1, 3.375)]: [93, -0.02], [br(1, 3.5)]: [94, 0.22], [br(1, 3.625)]: [98, -0.04], [br(1, 3.75)]: [101, 0.2], [br(1, 3.875)]: [105, -0.23],
};
/** Each landing's plip: [Hz, pan] — climbing 600 → 1120 Hz as the paint rises. */
const PLIPS = {
  [br(1, 1.25)]: [600, 0.08], [br(1, 1.75)]: [640, 0.05], [br(1, 2.25)]: [680, -0.8], [br(1, 2.5)]: [720, 0.6], [br(1, 2.75)]: [760, 0.02], [br(1, 3)]: [800, -0.19],
  [br(1, 3.25)]: [850, 0.01], [br(1, 3.375)]: [900, -0.02], [br(1, 3.5)]: [950, -0.01], [br(1, 3.625)]: [1000, -0.02], [br(1, 3.75)]: [1060, 0.26], [br(1, 3.875)]: [1120, -0.04],
};
/** The corner chips' key presses (TL, TR, BR, BL). */
const CHIP_PANS = [-0.9, 0.9, 0.9, -0.9];
/** The glass hats of break 2–4: a short tink on a chord tone (MIDI), alternating sides. */
const GLASS_HAT = {
  [br(2, 0.5)]: 88, [br(2, 1.5)]: 91, [br(2, 2.5)]: 94, [br(2, 3.5)]: 96, [br(3, 0.5)]: 88, [br(3, 1.5)]: 91, [br(3, 2.5)]: 93, [br(3, 3.5)]: 96,
  [br(4, 0.5)]: 89, [br(4, 1.5)]: 93, [br(4, 2.5)]: 96,
};
/**
 * The pluck bass (MIDI): break 3–4 under the half time, the offbeats of 5 (as built); C3 under the coaster (6.1&, 6.3&); A2 A2 C3 C3 on
 * the sling's offbeats; v04's two C♯3s after the pivot (its 6.3e, 6.3a), now on 8.1e and 8.1a.
 */
const PLUCKS = {
  [br(3)]: 33, [br(3, 1)]: 45, [br(3, 1.5)]: 33, [br(3, 2.5)]: 40, [br(3, 3.5)]: 43, [br(4)]: 38, [br(4, 1)]: 50, [br(4, 1.5)]: 38, [br(4, 2.5)]: 33,
  [br(5, 0.5)]: 46, [br(5, 1.5)]: 46, [br(5, 2.5)]: 46, [br(5, 3.5)]: 46,
  ...Object.fromEntries(BR.BASS_V2.map((f, k) => [f, [48, 48, 45, 45, 48, 48][k]])),
  [br(8, 0.25)]: 49, [br(8, 0.75)]: 49,
};
/** The glass motif of 1.3 (B♭5 A5 F5 D5) reversed and rising on sudo, in F (D5 F5 A5 B♭5); a semitone up on the pivot (D♯5 F♯5 A♯5 B5); then the 32nd race an octave up. */
const MOTIF_F = [74, 77, 81, 82];
const MOTIF = [75, 78, 82, 83];
const RACE = [75, 78, 82, 83, 87, 90, 94, 95];
/** The climbing steps, one per notch (A5 C6 D6 F6): MIDI, vowel, length in frames, gain. */
const CLIMB = [[81, 'e', 18, 0.38], [84, 'o', 18, 0.38], [86, 'a', 10, 0.34], [89, 'i', 10, 0.32]];
/** v04's steps of the slingshot (G♯5 B5 C♯6 D♯6), now bar 8's: MIDI, vowel, length in frames. */
const STEPS = [[80, 'u', 12], [83, 'e', 12], [85, 'o', 6], [87, 'a', 6]];

/** The sling's riser (breakSfx lift, as the build placed it: CATCH → RELEASE): its gain, curve, first and last band, and saw share. */
export const RISER = { gain: 0.22, curve: 1.2, f0: 800, top: 12000, saw: 0.25 };
/**
 * Change log S9 (v08), the riser in bar 8: its noise band follows the as-built sweep but stops at `capHz` (as built it went on to 12 kHz
 * on the release), and its level follows the as-built swell only to `hold` (8.1e) and from there eases `noiseDb` down to the release
 * (raised cosine; as built it swelled on +2.8 dB). Its pitched saw (110 Hz × 8^u) is as built. The air over 4 kHz still rises every half
 * bar into the release (tests/breakAudio "the build opens"), now on the race, the hats and the motif more than on the hiss.
 */
export const RISER_V08 = { from: BR.REVERSE, hold: partFrame('break', 8, 0.25), capHz: 10000, noiseDb: -2.5 };
/**
 * The riser of the sling and the fake drop into `out` (from sample 0, `len` samples: CATCH → RELEASE); `cut` and `hold` are RISER_V08's
 * `from` and `hold` in its samples. Up to `cut`, breakSfx lift's own arithmetic, sample for sample (the same draws, filter and
 * oscillator: bar 7 as built); from it, S9's noise.
 */
export function riser(out, len, cut, hold, sr, seed) {
  const { gain, curve, f0, top, saw } = RISER;
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  const held = (hold / len) ** curve;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if (i < cut) {
      f.process(r() * 2 - 1, f0 * (top / f0) ** u, 3);
      out[i] += gain * u ** curve * (f.bp + saw * o.saw(110 * 8 ** u));
      continue;
    }
    const w = i < hold ? 0 : 0.5 - 0.5 * Math.cos((Math.PI * (i - hold)) / Math.max(1, len - hold));
    f.process(r() * 2 - 1, Math.min(f0 * (top / f0) ** u, RISER_V08.capHz), 3);
    const noise = (i < hold ? u ** curve : held) * 10 ** ((RISER_V08.noiseDb * w) / 20);
    out[i] += gain * (noise * f.bp + u ** curve * saw * o.saw(110 * 8 ** u));
  }
}

/**
 * Renders the break into `stems` (bgm.mjs's buses plus SENDS's) at `sr`. Returns every event as { kind, at } (at in samples: the frame's
 * first sample; a whoosh's is its peak, a reversed sound's the frame it swells into). `solo(kind, frame)` picks which sounds are rendered
 * (tests render them one at a time); the bus edits (stutter, tape stop, suck, the cut on the release and the look, and — unless `ducks`
 * is false — the bed's ducks under the eggs, keyed on the eggs' frames whether they are rendered or not) always run. Stems may be shorter
 * than the film: what lies past their end is not rendered.
 */
export function renderBreak(stems, sr, { solo = () => true, ducks = true } = {}) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const n = stems.sub ? stems.sub.length : stems[Object.keys(SENDS)[0]].L.length;
  const base = at(BR.BREAK_START);
  const len = at(BR.BREAK_END_V2) - base;
  const active = n > base;
  const rel = (frame) => at(frame) - base;
  const frameAt = (i) => ((base + i) / sr) * FPS;
  const events = [];
  const seen = new Set();
  const mark = (kind, frame) => {
    if (!solo(kind, frame) || seen.has(`${kind}@${frame}`)) return false;
    seen.add(`${kind}@${frame}`);
    events.push({ kind, at: at(frame) });
    return true;
  };
  // Takes of each bus: before the wipe (stuttered, tape-stopped, silent from the wipe on), from the wipe to the release, the vox's and the
  // bell's from the wipe until the pivot (faded out on it), and the release's (from the cut to the look).
  const takes = [{}, {}, {}, {}];
  const takeOf = (name, frame) => (frame < BR.WIPE.from ? 0 : frame >= BR.RELEASE ? 3 : frame < PIVOT && (name === 'brVox' || name === 'brBell') ? 2 : 1);
  const bus = (name, frame) => (takes[takeOf(name, frame)][name] ??= stereo(len));
  /** 2.1's suck (a sample of the break's buffers): silent from here to the impact. */
  const suck = rel(BR.IMPACT) - Math.round(SUCK_S * sr);
  /** One mono voice: `draw(buf)` writes it from 0; it starts on `start` (frame), belongs to the event (kind, frame). */
  const place = (name, frame, dur, draw, { kind, pan = 0, start = frame } = {}) => {
    if (!solo(kind, frame)) return;
    mark(kind, frame);
    if (!active) return;
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(bus(name, frame), buf, { at: at(start) - base, pan });
  };
  /** A whoosh whose loudest point lands on `peak`. */
  const swoosh = (name, peak, frames, o, { kind, pan = 0 }) => place(name, peak, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { kind, pan, start: peak - WHOOSH_PEAK * frames });
  const kicks = [...BR.KICKS_V2, ...BR.GHOST_KICKS_V2].sort((a, b) => a - b);
  const barGain = (f, gains) => gains[Math.min(gains.length - 1, Math.max(0, Math.floor((f - BR.BREAK_START) / FRAMES_PER_BAR)))];

  // ——— Break 1: the glass is the rhythm ——————————————————————————————————————————————————————————————————————————————————————————
  place('brSub', BR.BREAK_START, 1.6, (b) => subPulse(b, 0, sr, { freq: midi(34), gain: 0.26, decayMs: 240 }), { kind: 'brthoom' });
  place('brFx', BR.MONITOR_FALL.from, 0.4, (b) => chirp(b, 0, sr, { from: 880, to: 220, ms: 330, wave: 'square', gain: 0.035, decayMs: 200 }), { kind: 'brfallblip', pan: -0.75 });
  for (const f of BR.FALL_TINKS) {
    const [m, pan] = TINKS[f];
    const cascade = f > BR.FACE_FALL.from;
    place('brGlass', f, 1.4, (b) => tink(b, 0, sr, { freq: midi(m), gain: cascade ? 0.075 : 0.095, decayMs: cascade ? 300 : 600, seed: seed(1, f) }), { kind: 'brtink', pan });
  }
  BR.PLIPS.forEach((f) => place('brFx', f, 0.15, (b) => plip(b, 0, sr, { freq: PLIPS[f][0], gain: 0.07 }), { kind: 'brplip', pan: PLIPS[f][1] }));
  BR.CHIPS.forEach((f, k) => place('brFx', f, 0.3, (b) => keyPress(b, 0, sr, { gain: 0.16, seed: seed(2, f) }), { kind: 'brchip', pan: CHIP_PANS[k] }));
  // The reverse cymbal swells into 2.1's suck and stops dead there (a 2 ms ramp, no click in the gap).
  place('brFx', BR.REVERSE_CYMBAL.to, (suck - rel(BR.REVERSE_CYMBAL.from)) / sr, (b) => {
    reverseCymbal(b, b.length, b.length, sr, { gain: 0.16, seed: seed(3, 0) });
    truncate(b, b.length, sr, 2);
  }, { kind: 'brrevcym', start: BR.REVERSE_CYMBAL.from });
  place('brGlass', BR.SHARD_STAYS, 0.2, (b) => {
    click(b, 0, sr, { gain: 0.16, tone: 4800 }, seed(4, 0));
    hat(b, 0, sr, { gain: 0.12, decayMs: 10, cutoff: 2000 }, seed(4, 1));
  }, { kind: 'brcrack', pan: -0.1 });
  if (mark('brswarm', BR.SWARM.from) && active) {
    const b = bus('brGlass', BR.SWARM.from);
    const s = stereo(len);
    const tones = [86, 89, 93, 94, 96, 98, 101, 105].map(midi);
    tinkSwarm(s.L, s.R, rel(BR.SWARM.from), at(BR.SWARM.to) - at(BR.SWARM.from), sr, { tones, from: 10, to: 60, gain: 0.03, seed: seed(5, 0) });
    // Cut with its ringing grains at 2.1's suck.
    for (const [x, y] of [[s.L, b.L], [s.R, b.R]]) {
      truncate(x, suck, sr, 2);
      for (let i = 0; i < suck; i++) y[i] += x[i];
    }
  }

  // ——— Drums (from 2.1: half time, four on the floor in 5–7, the coaster's fill, the accelerating 8; none from 8.2&) ——————————————————
  const KICK = [0, 0.3, 0.34, 0.4, 0.46, 0.52, 0.52, 0.54];
  BR.KICKS_V2.forEach((f) => place('brDrums', f, 0.6, (b) => kick(b, 0, sr, { gain: f === BR.IMPACT ? IMPACT_GAIN.kick : barGain(f, KICK), f0: 150, f1: 45, pitchMs: 20, decayMs: 110 }, seedOf(6, f)), { kind: 'brkick' }));
  BR.GHOST_KICKS_V2.forEach((f) => place('brDrums', f, 0.5, (b) => kick(b, 0, sr, { gain: 0.45 * barGain(f, KICK), f0: 140, f1: 45, pitchMs: 18, decayMs: 80 }, seed(6, f)), { kind: 'brghost' }));
  const CLAP = [0, 0.27, 0.29, 0.32, 0.37, 0.4, 0.4, 0.42];
  BR.CLAPS_V2.forEach((f) => {
    place('brDrums', f, 0.6, (b) => clap(b, 0, sr, { gain: barGain(f, CLAP), tone: 1200, tailMs: 55 }, seedOf(7, f)), { kind: 'brclap', pan: -0.12 });
    place('brDrums', f, 0.6, (b) => clap(b, 0, sr, { gain: 0.7 * barGain(f, CLAP), tone: 1450, tailMs: 45 }, seedOf(8, f)), { kind: 'brclap', pan: 0.14 });
  });
  BR.GHOST_SNARES_V2.forEach((f) => place('brDrums', f, 0.6, (b) => snare(b, 0, sr, { gain: 0.16, tone: 190, decayMs: 100, noise: 0.7 }, seed(9, f)), { kind: 'brsnare', pan: 0.1 }));
  /** Bar 8's 32nd hats into the held breath are tighter (v04's tension hats). */
  const TIGHT_HATS = BR.ARP_RACE_V2[0];
  /**
   * The build's air (change log S7): the hats v2 adds — the coaster's, the sling's from 7.3& (v04's bar-6 hats up to 7.3e play as built)
   * and the fake drop's — ring louder and thinner (HP 9.5 kHz, open 8.5 kHz) than the as-built ones, so the coaster is as airy as the
   * reveal and the air climbs from 7.3 to the release.
   */
  const builtHat = (f) => f < BAR6 || (f >= BAR7 && f < br(7, 2.5));
  BR.CLOSED_HATS_V2.forEach((f, i) => place('brDrums', f, 0.25, (b) => hat(b, 0, sr, { gain: (builtHat(f) ? (f >= BAR5 ? 0.13 : 0.11) : 0.17) * (i % 2 ? 0.8 : 1), decayMs: f >= TIGHT_HATS ? 24 : 32, cutoff: builtHat(f) ? 8500 : 9500 }, seedOf(10, f)), { kind: 'brhat', pan: i % 2 ? 0.25 : -0.2 }));
  BR.OPEN_HATS_V2.forEach((f) => place('brDrums', f, 1, (b) => hat(b, 0, sr, { gain: builtHat(f) ? 0.11 : 0.14, decayMs: 160, cutoff: builtHat(f) ? 7500 : 8500 }, seedOf(11, f)), { kind: 'brohat', pan: 0.12 }));
  BR.GLASS_HATS.forEach((f, i) => place('brDrums', f, 0.6, (b) => tink(b, 0, sr, { freq: midi(GLASS_HAT[f]), gain: 0.06, decayMs: 150, seed: seed(12, f) }), { kind: 'brglasshat', pan: i % 2 ? 0.4 : -0.4 }));
  // The crashes: v04's (the impact, the loop's launch, the reveal), then the coaster's lighter ones (its top and two bottoms: 0.14 to the
  // reveal's 0.2 — light, but the ride's air; change log S7).
  [[BR.IMPACT, 0.13, 1.4], [BR.BRACKET_LAUNCH, 0.1, 1.1], [BR.REVEAL, 0.2, 1.6], [BR.GRAPH.from, 0.14, 1], ...BR.BOTTOMS.map((f) => [f, 0.14, 1])].forEach(([f, g, d]) => place('brDrums', f, 4 * d, (b) => crash(b, 0, sr, { gain: g, decay: d }, seedOf(13, f)), { kind: 'brcrash', pan: 0.2 }));
  place('brDrums', BR.IMPACT, 0.15, (b) => slap(b, 0, sr, { gain: IMPACT_GAIN.slap, seed: seed(14, 0) }), { kind: 'brslap' });

  // ——— The sub: the roots held under the chords, ducked by every kick; the swell into 2.1; the C♯ drone from 8.1 to the release ————————
  // Ruling 1: the thoom's low tail holds under the fall (in over its first 12 frames as the thoom decays, easing 0.035 → 0.028), one
  // tone with the swell, which grows out of it into 2.1's suck.
  const TAIL = [0.035, 0.028];
  const tailIn = (f) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (f - BR.SUB_TAIL.from) / 12));
  /** The swell's first frame (1.3, the reverse cymbal's): it grows over the 48 frames into the impact. */
  const SWELL = BR.REVERSE_CYMBAL.from;
  const SUB = [
    { kind: 'brsubtail', from: BR.SUB_TAIL.from, to: BR.SUB_TAIL.to, root: 34, level: (f) => tailIn(f) * (TAIL[0] + (TAIL[1] - TAIL[0]) * ((f - BR.SUB_TAIL.from) / (BR.SUB_TAIL.to - BR.SUB_TAIL.from))) },
    { kind: 'brswell', from: SWELL, to: BR.IMPACT, root: 34, level: (f) => TAIL[1] * (1 - (f - SWELL) / 48) + 0.12 * ((f - SWELL) / 48) ** 2 },
    { kind: 'brsub', from: BAR2, to: BAR3, root: 36, level: () => 0.115 },
    { kind: 'brsub', from: BAR3, to: BAR4, root: 33, level: () => 0.135 },
    { kind: 'brsub', from: BAR4, to: BR.WIPE.from, root: 38, level: () => 0.16 },
    { kind: 'brsub', from: BAR5, to: BAR6, root: 34, level: () => 0.19 },
    { kind: 'brsub', from: BAR6, to: BAR7, root: 36, level: () => 0.2 },
    { kind: 'brsub', from: BAR7, to: br(7, 2), root: 33, level: () => 0.2 },
    { kind: 'brsub', from: br(7, 2), to: PIVOT, root: 36, level: () => 0.205 },
    { kind: 'brsub', from: PIVOT, to: BR.RELEASE, root: 37, glide: 36, level: () => 0.21 },
  ];
  const subOn = SUB.map((s) => mark(s.kind, s.from));
  if (active && subOn.some(Boolean)) {
    const x = new Float32Array(len);
    const ducked = duck(len, kicks.map(rel), sr, { depth: 0.85, attackMs: 2, releaseMs: 120 });
    // 2.1's suck: the swell fades out over 4 ms into it and the sub comes back over 3 ms on the impact (where the kick ducks it).
    const [fade, back, hit] = [Math.round(0.004 * sr), Math.round(0.003 * sr), rel(BR.IMPACT)];
    const sucked = (i) => {
      if (i < suck - fade || i >= hit + back) return 1;
      if (i < suck) return 0.5 + 0.5 * Math.cos((Math.PI * (i - suck + fade)) / fade);
      return i < hit ? 0 : (i - hit) / back;
    };
    // The tail runs in phase into the swell: the swell, and every sub after it, starts on the phase it had before the tail (v01's), so
    // the sub under the kicks of break 2–5 is sample for sample what it was.
    let ph = -((rel(BR.SUB_TAIL.to) - rel(BR.SUB_TAIL.from)) * midi(34)) / sr;
    let k = 0;
    for (let i = rel(SUB[0].from); i < len; i++) {
      const f = frameAt(i);
      while (k + 1 < SUB.length && f >= SUB[k + 1].from) k++;
      const s = SUB[k];
      if (f >= s.to || f < s.from) continue;
      const glide = s.glide ? Math.min(1, (f - s.from) / 6) : 1;
      const m = s.glide ? s.glide + (s.root - s.glide) * glide * glide * (3 - 2 * glide) : s.root;
      ph += midi(m) / sr;
      if (!subOn[k]) continue;
      // 3 ms edges, except where two segments that both sound join (the swell into 2.1, the bar lines, the glide): one continuous tone.
      const joinedIn = k > 0 && SUB[k - 1].to === s.from && subOn[k - 1];
      const joinedOut = k + 1 < SUB.length && SUB[k + 1].from === s.to && subOn[k + 1];
      const edge = Math.min(1, joinedIn ? 1 : (i - rel(s.from)) / (0.003 * sr), joinedOut ? 1 : (rel(s.to) - i) / (0.003 * sr));
      x[i] = edge * sucked(i) * s.level(f) * ducked[i] * (Math.tanh(1.5 * Math.sin(2 * Math.PI * ph)) / Math.tanh(1.5));
    }
    const pre = bus('brSub', BR.BREAK_START);
    const post = bus('brSub', BR.WIPE.from);
    for (let i = 0; i < len; i++) {
      const t = i < rel(BR.WIPE.from) ? pre : post;
      t.L[i] += x[i];
      t.R[i] += x[i];
    }
  }

  // ——— The pads: the glass pad under the fall; drop 1's voicings from 2.1, opening bar by bar; the glide up to C♯9sus4 ————————————
  /** E3's re-roll: the pad and the arp warble ±40 cents at 6 Hz (and the arp is crushed) from the first swap to the tofu. */
  const warbling = (f) => f >= BR.REROLL[0] && f < BR.TOFU;
  const warble = (f) => (warbling(f) ? 0.4 * Math.sin(2 * Math.PI * 6 * ((f - BR.REROLL[0]) / FPS)) : 0);
  const glide = (f) => (f < PIVOT ? 0 : Math.min(1, (f - PIVOT) / 6) ** 2 * (3 - 2 * Math.min(1, (f - PIVOT) / 6)));
  const cutoff = (f) => {
    if (f < BAR2) return 700 + 500 * Math.min(1, Math.max(0, (f - BR.GLASS_PAD.from) / 96));
    if (f < BAR3) return 900;
    if (f < BAR4) return 1100 + 300 * ((f - BAR3) / 96);
    if (f < BAR5) return 1400 + 600 * Math.min(1, (f - BAR4) / 72);
    if (f < BAR6) return 2500 + 1500 * Math.min(1, (f - BAR5) / 12);
    // v2: the coaster's pad at 4 kHz, the sling's Am9 at 5 kHz opening to 8 kHz on C9sus4, 8 → 9 kHz into the held breath, then open.
    if (f < BAR7) return 4000 + 500 * ((f - BAR6) / 96);
    if (f < br(7, 2)) return 5000;
    if (f < PIVOT) return 8000;
    if (f < BR.HELD_V2) return 8000 + 1000 * ((f - PIVOT) / (BR.HELD_V2 - PIVOT));
    return 9000 + 11000 * Math.min(1, (f - BR.HELD_V2) / 3);
  };
  const PAD21 = [0.07, 0.125];
  const padLevel = (f) => {
    // Ruling 1: from 1.1, PAD21[0] under the first pane, swelling to PAD21[1] into the impact.
    if (f < BAR2) return PAD21[0] + (PAD21[1] - PAD21[0]) * Math.min(1, Math.max(0, (f - BR.GLASS_PAD.from) / 96)) ** 1.5;
    if (f < BAR3) return 0.04;
    if (f < BAR4) return 0.05;
    if (f < BAR5) return 0.063;
    if (f < BAR6) return 0.09;
    // v2 (change log S7): the coaster's pad a little under the first mix's (0.112), so the build's air sits over it.
    if (f < BAR7) return 0.108;
    if (f < PIVOT) return 0.135 + 0.01 * ((f - BAR7) / 96);
    return 0.13 + 0.02 * Math.min(1, (f - PIVOT) / (BR.HELD_V2 - PIVOT));
  };
  let padDuck = null;
  const padDucked = (i) => (padDuck ??= duck(len, kicks.map(rel), sr, { depth: 0.6, attackMs: 3, releaseMs: 150 }))[i];
  const chordOf = (name, octave) => [...VOICINGS[name], ...(octave ? VOICINGS[name].map((m) => m + 12) : [])].map(midi);
  const pads = [
    { take: 0, voices: 3, chords: [{ kind: 'brglasspad', from: BR.GLASS_PAD.from, to: BR.GLASS_PAD.to, freqs: chordOf('IV') }] },
    { take: 0, voices: 5, chords: [[BAR2, br(2, 2)], [br(2, 2), BAR3], [BAR3, BAR4], [BAR4, BR.WIPE.from]].map(([from, to]) => ({ kind: 'brchord', from, to, freqs: chordOf(CHORD[from]) })) },
    { take: 1, voices: 7, chords: [[BAR5, BAR6], [BAR6, br(6, 2)], [br(6, 2), BAR7], [BAR7, br(7, 2)], [br(7, 2), BR.RELEASE]].map(([from, to]) => ({ kind: 'brchord', from, to, freqs: chordOf(CHORD[from], true) })) },
  ];
  mark('brglide', PIVOT);
  for (const p of pads) {
    const chords = p.chords.filter((c) => mark(c.kind, c.from));
    if (!active || !chords.length) continue;
    const out = stereo(len);
    pad(out.L, out.R, chords.map((c) => ({ at: rel(c.from), len: at(c.to) - at(c.from), freqs: c.freqs })), sr, {
      voices: p.voices,
      detune: 0.14,
      spread: 0.6,
      gain: (i) => padLevel(frameAt(i)) * (frameAt(i) >= BR.IMPACT && frameAt(i) < BR.HELD_V2 ? padDucked(i) : 1),
      cutoff: (i) => cutoff(frameAt(i)),
      bend: (i) => warble(frameAt(i)) + glide(frameAt(i)),
      attackMs: 30,
      releaseMs: p.take ? 200 : 120,
      seed: seed(15, p.voices),
    });
    // Since the glass pad sounds from 1.1 and swells to the impact (ruling 1), it is sucked out of 2.1's last 25 ms with the rest of
    // the swells (a 4 ms fade), so the slap still lands on silence (R1-12).
    if (chords[0].kind === 'brglasspad') {
      const fade = Math.round(0.004 * sr);
      for (const x of [out.L, out.R]) for (let i = Math.max(0, suck - fade); i < len; i++) x[i] *= i < suck ? 0.5 + 0.5 * Math.cos((Math.PI * (i - suck + fade)) / fade) : 0;
    }
    const b = bus('brPad', p.take ? BR.WIPE.from : BR.BREAK_START);
    for (let i = 0; i < len; i++) {
      b.L[i] += out.L[i];
      b.R[i] += out.R[i];
    }
  }
  // 2.2: the shapes pool into blocks — a gloop through the stab chord, a soft FM chord on top.
  place('brPad', BR.MORPH.from, 0.5, (b) => gloop(b, 0, sr, { freqs: [60, 62, 65, 70, 72].map(midi), gain: 0.2, seed: seed(16, 0) }), { kind: 'brstab' });
  place('brBell', BR.MORPH.from, 2, (b) => [60, 62, 65, 70, 72].forEach((m) => fmBell(b, 0, sr, { freq: midi(m + 12), gain: 0.025, decay: 0.3, ratio: 2, index: 1 })), { kind: 'brstab', pan: 0.15 });

  // ——— Bass ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  for (const [f, m] of Object.entries(PLUCKS).map(([f, m]) => [+f, m])) {
    place('brBass', f, 0.5, (b) => pluckBass(b, [{ at: 0, len: at(10), freq: midi(m) }], sr, { gain: f >= BAR5 ? 0.24 : 0.2, bright: 1800 }), { kind: 'brpluck' });
  }

  // ——— The hook: on the glass bell in break 2–4 (the dizzy note wobbling), sung in 5 (as built) and 6 (whole, riding the coaster) —————
  const NEXT = { a: 'i', i: 'u', u: 'e', e: 'o', o: 'a' };
  const smooth = (u) => u * u * (3 - 2 * u);
  const notes = hookNotes();
  const bar6 = notes.filter((x) => x.bar === partBar('break', 6));
  notes.forEach((h, i) => {
    if (h.bar <= partBar('break', 4)) {
      const draw = h.frame === BR.DIZZY
        ? (b) => wobbleBell(b, 0, sr, { freq: midi(h.midi), gain: 0.15, decay: 0.32, hz: 6, cents: 50 })
        : (b) => fmBell(b, 0, sr, { freq: midi(h.midi), gain: 0.15, decay: 0.32, ratio: 3.5, index: 2.5 });
      place('brBell', h.frame, 1.7, draw, { kind: 'brhook', pan: i % 2 ? 0.12 : -0.12 });
      return;
    }
    if (h.bar === partBar('break', 5)) {
      place('brVox', h.frame, (h.len + 6) / FPS, (b) => sing(b, 0, sr, { freq: midi(h.midi), len: Math.round(at(h.len) * 0.92), vowel: AS_BUILT_HOOK3.vowel, to: AS_BUILT_HOOK3.vowel, gain: 0.3, seed: seed(17, h.frame) }), { kind: 'brhook', pan: (hash(seedFrame(h.frame), 3017) - 0.5) * 0.2 });
      place('brBell', h.frame, 1.5, (b) => fmBell(b, 0, sr, { freq: midi(h.midi + 12), gain: 0.06, decay: 0.28, ratio: 3.5, index: 2 }), { kind: 'brhook', pan: AS_BUILT_HOOK3.bellPan });
      return;
    }
    // Break 6: HOOK[4] whole, each note on its own vowel, two of them bent by the ride.
    const k = bar6.findIndex((x) => x.frame === h.frame);
    const vowel = HOOK6.vowels[k];
    const sungLen = Math.round(at(h.len) * 0.92);
    const bend = HOOK6.bends[k];
    // A bend in frames from the note's start (u runs 0 → 1 over its sung length).
    const pitch = !bend
      ? () => 0
      : (u) => {
          const t = (u * sungLen * FPS) / sr;
          const down = smooth(Math.max(0, Math.min(1, (t - bend.down[0]) / (bend.down[1] - bend.down[0]))));
          const back = bend.back ? smooth(Math.max(0, Math.min(1, (t - bend.back[0]) / (bend.back[1] - bend.back[0])))) : 0;
          return bend.by * (down - back);
        };
    place('brVox', h.frame, (h.len + 6) / FPS, (b) => sing(b, 0, sr, { freq: midi(h.midi), len: sungLen, vowel, to: NEXT[vowel], pitch, gain: 0.36, seed: seedOf(17, h.frame) }), { kind: 'brhook', pan: (hash(h.frame - BR.BREAK_START, 3017) - 0.5) * 0.2 });
    place('brBell', h.frame, 1.5, (b) => fmBell(b, 0, sr, { freq: midi(h.midi + 12), gain: 0.06, decay: 0.28, ratio: 3.5, index: 2 }), { kind: 'brhook', pan: k % 2 ? 0.3 : -0.3 });
  });

  // ——— E2: the shard on our side (he knocks from behind, it pops back through and home) ————————————————————————————————————————
  BR.KNOCKS.forEach((f) => place('brFx', f, 0.12, (b) => knock(b, 0, sr, { gain: 0.1, seed: seed(18, f) }), { kind: 'brknock', pan: -0.36 }));
  place('brFx', BR.SHARD_FLIGHT.from, 0.06, (b) => chirp(b, 0, sr, { from: 600, to: 300, ms: 40, gain: 0.07 }), { kind: 'brthwip', pan: -0.36 });
  place('brGlass', BR.LOCK, 0.4, (b) => tink(b, 0, sr, { freq: midi(88), gain: 0.07, decayMs: 80, seed: seed(19, 0) }), { kind: 'brglasspop', pan: -0.36 });

  // ——— Reactions and the system ———————————————————————————————————————————————————————————————————————————————————————————————
  place('brVox', BR.LOCK, 0.25, (b) => sing(b, 0, sr, { freq: midi(72), len: at(8), vowel: 'a', to: 'u', pitch: (u) => -3 * smooth(u), gain: 0.24, seed: seed(20, 0) }), { kind: 'brouch' });
  place('brDrums', BR.LOCK, 0.05, (b) => click(b, 0, sr, { gain: 0.22, tone: 2400 }, seed(21, 0)), { kind: 'brsnap' });
  [[BR.MONITOR.from, 1320], [BR.MONITOR.from + 6, 1760]].forEach(([f, hz]) => place('brFx', f, 0.05, (b) => chirp(b, 0, sr, { from: hz, ms: 40, wave: 'square', gain: 0.035 }), { kind: 'brblip', pan: -0.7 }));
  place('brVox', BR.DIZZY, 0.4, (b) => sing(b, 0, sr, { freq: midi(69), len: at(18), vowel: 'u', to: 'a', pitch: (u) => 3 * smooth(u), hz: 7, cents: 40, gain: 0.24, seed: seed(22, 0) }), { kind: 'bruwa' });
  [BR.DIZZY, BR.STUTTER_END].forEach((f) => place('brDrums', f, 0.05, (b) => click(b, 0, sr, { gain: 0.2, tone: 2400 }, seed(23, f)), { kind: 'brclick', pan: 0.1 }));
  // 3.4: the stutter's source — a clap tail and a hat with the hook's G5 — sliced on each 32nd below; the error buzz over it.
  place('brDrums', BR.STUTTER[0], 0.4, (b) => {
    clap(b, 0, sr, { gain: 0.42, tone: 1200, tailMs: 90 }, seed(24, 0));
    hat(b, 0, sr, { gain: 0.11, decayMs: 32, cutoff: 8500 }, seed(24, 1));
  }, { kind: 'brstutter' });
  BR.STUTTER.slice(1).forEach((f) => mark('brstutter', f));
  place('brFx', BR.STUTTER[2], 0.08, (b) => chirp(b, 0, sr, { from: 110, ms: 60, wave: 'square', gain: 0.05 }), { kind: 'brbuzz', pan: 0.2 });
  place('brFx', BR.REVERSE_SNARE.to, (BR.REVERSE_SNARE.to - BR.REVERSE_SNARE.from) / FPS, (b) => {
    const fwd = new Float32Array(b.length);
    snare(fwd, 0, sr, { gain: 0.3, tone: 200, decayMs: 70, noise: 0.9 }, seed(25, 0));
    for (let i = 0; i < b.length; i++) b[i] = fwd[b.length - 1 - i] * Math.min(1, (b.length - 1 - i) / 24);
  }, { kind: 'brrevsnare', start: BR.REVERSE_SNARE.from, pan: 0.15 });
  place('brDrums', BR.CARD_FLIP.to, 0.06, (b) => click(b, 0, sr, { gain: 0.3, tone: 900 }, seed(26, 0)), { kind: 'brclack' });
  place('brBell', BR.CARD_FLIP.to, 1.2, (b) => fmBell(b, 0, sr, { freq: midi(100), gain: 0.05, decay: 0.22, ratio: 3.5, index: 2 }), { kind: 'brding', pan: -0.3 });

  // ——— E3: the tofu eye, /dev/galaxy ————————————————————————————————————————————————————————————————————————————————————————
  mark('brwarble', BR.REROLL[0]);
  BR.REROLL.forEach((f) => place('brFx', f, 0.03, (b) => chirp(b, 0, sr, { from: 3500, ms: 15, gain: 0.03 }), { kind: 'brtick', pan: 0.3 }));
  place('brFx', BR.TOFU, 0.12, (b) => {
    chirp(b, 0, sr, { from: 140, to: 70, ms: 60, gain: 0.12 });
    const sq = new Float32Array(b.length);
    chirp(sq, 0, sr, { from: 207.65, ms: 80, wave: 'square', gain: 0.06, decayMs: 50 });
    const lp = new SVF(sr);
    for (let i = 0; i < b.length; i++) {
      lp.process(sq[i], 900, 0.7);
      b[i] += lp.lp;
    }
  }, { kind: 'brtofu', pan: 0.35 });
  [BR.FETCH, BR.FETCH + 3].forEach((f) => place('brFx', f, 0.03, (b) => chirp(b, 0, sr, { from: 2000, ms: 20, wave: 'square', gain: 0.025 }), { kind: 'brfetch', pan: 0.6 }));
  swoosh('brFx', BR.GALAXY.to, (BR.GALAXY.to - BR.GALAXY.from) / WHOOSH_PEAK, { from: 300, to: 6000, gain: 0.12, q: 1.2, seed: seed(27, 0) }, { kind: 'brstreak', pan: 0.45 });
  place('brFx', BR.GALAXY.to, (2 * (BR.GALAXY.to - BR.GALAXY.from)) / FPS, (b) => flutter(b, 0, b.length, sr, { gain: 0.05, rate: 24, tone: 2600, seed: seed(28, 0) }), { kind: 'brstreak', start: BR.GALAXY.from, pan: 0.45 });
  place('brVox', BR.RESCAN.from, 0.3, (b) => sing(b, 0, sr, { freq: midi(62), len: at(12), vowel: 'o', to: 'e', gain: 0.2, seed: seed(29, 0) }), { kind: 'brhm' });
  // v2 (logged: change log S1 above): the rescan is the antivirus's — its square, dry, on C (C5 → C7), not v04's sine 400 → 1600 Hz on brFx.
  place('brDef', BR.RED_RESCAN.from, 0.12, (b) => chirp(b, 0, sr, { from: midi(72), to: midi(96), ms: 100, wave: 'square', gain: 0.03 }), { kind: 'brrescan', pan: 0.25 });
  place('brFx', BR.POP_OUT, 3 / FPS, (b) => {
    const fwd = new Float32Array(b.length);
    click(fwd, 0, sr, { gain: 0.25, tone: 3000 }, seed(30, 0));
    for (let i = 0; i < b.length; i++) b[i] = fwd[b.length - 1 - i];
  }, { kind: 'brrevclick', start: BR.POP_OUT - 3, pan: -0.4 });
  place('brGlass', BR.POP_OUT, 0.6, (b) => tink(b, 0, sr, { freq: midi(100), gain: 0.06, decayMs: 200, seed: seed(31, 0) }), { kind: 'brpopout', pan: -0.4 });
  BR.TAG_COPIES.forEach((f) => place('brFx', f, 0.03, (b) => chirp(b, 0, sr, { from: 2000, ms: 20, wave: 'square', gain: 0.025 }), { kind: 'brtag', pan: 0.2 }));

  // ——— The hang, the restart ———————————————————————————————————————————————————————————————————————————————————————————————————
  mark('brtapestop', BR.TAPE_STOP.from);
  place('brFx', BR.HUNG_BUZZ.from, (BR.HUNG_BUZZ.to - BR.HUNG_BUZZ.from) / FPS + 0.01, (b) => chirp(b, 0, sr, { from: 1000, ms: ((BR.HUNG_BUZZ.to - BR.HUNG_BUZZ.from) / FPS) * 1000, wave: 'square', gain: 0.025 }), { kind: 'brhung' });
  [0, 1, 2, 3].forEach((k) => place('brFx', BR.RESTARTING + k, 0.25, (b) => keyPress(b, 0, sr, { gain: 0.12, seed: seed(32, k) }), { kind: 'brrestart', pan: -0.3 + 0.2 * k }));
  [0, 1, 2, 3].forEach((k) => {
    swoosh('brFx', BR.WIPE.from + 3 + k, 8, { from: 500, to: 4000, gain: 0.1, q: 1.3, seed: seed(33, k) }, { kind: 'brwipein', pan: -0.6 + 0.4 * k });
    swoosh('brFx', BR.WIPE.from + 9 + k, 8, { from: 4000, to: 700, gain: 0.08, q: 1.3, seed: seed(34, k) }, { kind: 'brwipeout', pan: -0.6 + 0.4 * k });
  });
  place('brFx', BR.POWER_ON.from, (BR.POWER_ON.to - BR.POWER_ON.from) / FPS, (b) => powerUp(b, 0, b.length, sr, { gain: 0.1 }), { kind: 'brpower' });

  // ——— Break 5: whole ——————————————————————————————————————————————————————————————————————————————————————————————————————————
  place('brDrums', BR.REVEAL, 1.7, (b) => impact(b, 0, sr, { gain: 0.3 }, seed(35, 0)), { kind: 'brimpact' });
  [94, 98, 101].forEach((m, k) => place('brBell', BR.REVEAL, 1.6, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.06, decay: 0.3, ratio: 3.5, index: 2 }), { kind: 'brwhole', pan: -0.35 + 0.35 * k }));
  [[BR.GLINT, 2793.8, 0.3], [BR.WAVE, 2637, 0.5], [BR.LOUDER_V2, 3500, 0.55]].forEach(([f, tone, pan]) => place('brFx', f, 0.05, (b) => spark(b, 0, sr, { gain: 0.12, tone }, seed(36, f)), { kind: 'brspark', pan }));
  place('brFx', BR.BLINK, 0.04, (b) => chirp(b, 0, sr, { from: 600, to: 900, ms: 30, gain: 0.06 }), { kind: 'brblink' });
  place('brFx', BR.FAN, 0.12, (b) => zip(b, 0, sr, { from: 1000, to: 4000, ms: 100, gain: 0.12, seed: seed(37, 0) }), { kind: 'brfan' });
  // v2 (logged: change log S2 above): v04's callout keys (5.4& + 6, + 8, + 10: off the grid) are the select chip's two keys on the 32nds.
  BR.CHIP_KEYS.forEach((f, k) => place('brFoley', f, 0.25, (b) => keyPress(b, 0, sr, { gain: 0.1, seed: seed(38, k) }), { kind: 'brchipkey', pan: -0.5 }));

  // ——— Break 7: v04's bar-6 system sounds one bar later (E5), the sling's steps ———————————————————————————————————————————————————————
  BR.BROWS_V2.forEach((f, k) => place('brFx', f, 0.04, (b) => chirp(b, 0, sr, { from: 600, to: 900, ms: 30, gain: 0.05 }), { kind: 'brbrow', pan: k ? 0.2 : -0.2 }));
  place('brFx', BR.DIALOG_V2, 0.1, (b) => {
    chirp(b, 0, sr, { from: 880, ms: 40, wave: 'square', gain: 0.03 });
    chirp(b, Math.round(0.04 * sr), sr, { from: 660, ms: 40, wave: 'square', gain: 0.03 });
  }, { kind: 'brerror', pan: 0.5 });
  place('brFx', BR.LOUDER_V2, 0.3, (b) => {
    keyPress(b, 0, sr, { gain: 0.14, kind: 'enter', seed: seed(39, 0) });
    press(b, 0, sr, { gain: 0.25 }, seed(39, 1));
  }, { kind: 'brpress', pan: 0.5 });
  place('brFx', BR.ROOT_V2, 0.08, (b) => zip(b, 0, sr, { from: 3000, to: 800, ms: 60, gain: 0.07, seed: seed(40, 0) }), { kind: 'brzip', pan: 0.5 });
  const WORDS = ['sudo', 'make', 'it', 'louder'];
  BR.SUDO_V2.forEach((f, k) => place('brEgg', f, 0.25, (b) => keyPress(b, 0, sr, { gain: raised(0.12, 'brsudo'), seed: seed(41, k) }), { kind: 'brsudo', pan: keyPan(WORDS[k][0]) }));
  place('brFx', BR.PASSWORD_V2, 0.3, (b) => keyPress(b, 0, sr, { gain: 0.12, kind: 'enter', seed: seed(42, 0) }), { kind: 'brenter', pan: keyPan('\n') });
  // The climbing steps, one per notch (A5 C6 D6 F6): F major still — the semitone lift waits for 8.1.
  BR.VOX_STEPS_V2.forEach((f, k) => {
    const [m, v, l, g] = CLIMB[k];
    place('brVox', f, (l + 6) / FPS, (b) => sing(b, 0, sr, { freq: midi(m), len: Math.round(at(l) * 0.92), vowel: v, to: NEXT[v], gain: g, seed: seedLocal(43, f) }), { kind: 'brclimb' });
  });
  // v04's steps (G♯5 B5 C♯6 D♯6, its 6.3 → 6.4e) climb bar 8 on the kicks into the held breath.
  BR.VOX_34.forEach((f, k) => {
    const [m, v, l] = STEPS[k];
    place('brVox', f, (l + 6) / FPS, (b) => sing(b, 0, sr, { freq: midi(m), len: Math.round(at(l) * 0.92), vowel: v, to: NEXT[v], gain: 0.38, seed: seedOf(43, f) }), { kind: 'brstep' });
  });
  place('brEgg', BR.HUP_V2, 0.3, (b) => sing(b, 0, sr, { freq: midi(85), len: at(10), vowel: 'u', to: 'a', pitch: (u) => 5 * smooth(Math.min(1, 1.6 * u)), gain: raised(0.38, 'brhup'), seed: seed(44, 0) }), { kind: 'brhup' });
  // Access granted, in key: C5 → F5 (v04's C♯5 → F♯5 came after its pivot; the semitone lift is 8.1 now).
  BR.GRANTED_CHIME.forEach((f, k) => place('brBell', f, 1.5, (b) => fmBell(b, 0, sr, { freq: midi([72, 77][k]), gain: 0.1, decay: 0.3, ratio: 3.5, index: 2.5 }), { kind: 'brgranted', pan: k ? 0.35 : 0.25 }));
  [BR.OVERLOAD_V2, BR.HELD_V2].forEach((f) => place('brFx', f, 0.04, (b) => chirp(b, 0, sr, { from: 3000, ms: 30, wave: 'square', gain: 0.03 }), { kind: 'brbeep', pan: 0.5 }));
  place('brFx', BR.FIST_GLINT_V2, 0.05, (b) => spark(b, 0, sr, { gain: 0.08, tone: 6000 }, seed(45, 0)), { kind: 'brglint', pan: 0.3 });
  // The rubber band: from the catch, a semitone higher on each notch and each creep, swelling to the release.
  place('brFx', BR.RUBBER_BAND_V2.from, (BR.RUBBER_BAND_V2.to - BR.RUBBER_BAND_V2.from) / FPS, (b) => rubberBand(b, 0, b.length, sr, { from: 300, to: 1100, steps: [...BR.NOTCHES, ...BR.CREEPS].map((f) => at(f) - at(BR.RUBBER_BAND_V2.from)), g0: 0.012, g1: 0.06 }), { kind: 'brband', pan: -0.1 });
  // The riser, the catch → the release (change log S7: breakSfx's lift, whose air comes in by 7.3, for drums.mjs's p² riser; S9: from 8.1
  // its noise stops climbing and its pitch carries the rise).
  place('brRiser', BR.RISER_V2.from, (BR.RISER_V2.to - BR.RISER_V2.from) / FPS, (b) => riser(b, b.length, at(RISER_V08.from) - at(BR.RISER_V2.from), at(RISER_V08.hold) - at(BR.RISER_V2.from), sr, seed(46, 0)), { kind: 'brriser' });
  mark('brsuck', BR.HP_SUCK_V2.from);
  // The glass motif reversed and rising: on sudo in F, on the pivot a semitone up; doubled on the glass, an octave up in the race.
  BR.MOTIF_UP_V2.forEach((f, k) => place('brGlass', f, 0.6, (b) => tink(b, 0, sr, { freq: midi(MOTIF_F[k] + 12), gain: 0.04, decayMs: 250, seed: seedLocal(47, f) }), { kind: 'brmotif', pan: -0.3 + 0.2 * k }));
  BR.MOTIF_34.forEach((f, k) => place('brGlass', f, 0.6, (b) => tink(b, 0, sr, { freq: midi(MOTIF[k] + 12), gain: 0.04, decayMs: 250, seed: seedOf(47, f) }), { kind: 'brmotif', pan: -0.3 + 0.2 * k }));
  BR.ARP_RACE_V2.forEach((f, k) => place('brGlass', f, 0.5, (b) => tink(b, 0, sr, { freq: midi(RACE[k] + 12), gain: 0.045, decayMs: 200, seed: seedOf(48, f) }), { kind: 'brrace', pan: -0.4 + 0.11 * k }));

  // ——— The 8-bit arp (break 4 to the hang, 5, the coaster, the sling), then the motif and the race: two sides, alternating notes ————————
  const ARP = [
    ...steps(BR.ARPS_V2[0].from, BR.ARPS_V2[0].to, 6).map((f, k) => ({ kind: 'brarp', f, m: [74, 77, 81, 84][k % 4], len: 4 })),
    ...steps(BR.ARPS_V2[1].from, BR.ARPS_V2[1].to, 6).map((f, k) => ({ kind: 'brarp', f, m: [74, 77, 81, 84][[0, 1, 2, 3, 2, 1, 3, 1][k % 8]], len: 4 })),
    ...steps(BR.ARPS_V2[2].from, BR.ARPS_V2[2].to, 6).map((f, k) => ({ kind: 'brarp', f, m: [72, 74, 77, 82][k % 4], len: 4 })),
    ...steps(BR.ARPS_V2[3].from, BR.ARPS_V2[3].to, 6).map((f, k) => ({ kind: 'brarp', f, m: [72, 76, 79, 83][k % 4], len: 4 })),
    ...steps(BR.ARPS_V2[4].from, BR.ARPS_V2[4].to, 6).map((f, k) => ({ kind: 'brarp', f, m: [72, 74, 77, 82][k % 4], len: 4 })),
    ...BR.MOTIF_UP_V2.map((f, k) => ({ kind: 'brmotif', f, m: MOTIF_F[k], len: 4 })),
    ...BR.MOTIF_34.map((f, k) => ({ kind: 'brmotif', f, m: MOTIF[k], len: 4 })),
    ...BR.ARP_RACE_V2.map((f, k) => ({ kind: 'brrace', f, m: RACE[k], len: 2.5 })),
  ]
    .map((a, k) => ({ ...a, side: k % 2, duty: [0.125, 0.25, 0.5, 0.25][k % 4] }))
    .filter((a) => mark(a.kind, a.f));
  if (active && ARP.length) {
    const arpCut = (f) => (f < BAR5 ? 2000 : f < BAR6 ? 6000 : f < BAR7 ? 7000 : f < BR.HELD_V2 ? 8000 : 16000);
    const arpGain = (f) => (f < BAR5 ? 0.06 : f < BAR6 ? 0.08 : f < BAR7 ? 0.09 : 0.1);
    for (const side of [0, 1]) {
      for (const take of [0, 1]) {
        const notesOf = ARP.filter((a) => a.side === side && (a.f < BR.WIPE.from ? 0 : 1) === take);
        if (!notesOf.length) continue;
        const out = new Float32Array(len);
        chip(out, notesOf.map((a) => ({ at: rel(a.f), len: at(a.len), freq: midi(a.m), duty: a.duty })), sr, {
          gain: 1,
          cutoff: (i) => arpCut(frameAt(i)),
          bend: (i) => warble(frameAt(i)),
          crushHz: (i) => (warbling(frameAt(i)) ? 6000 : 0),
        });
        for (let i = 0; i < len; i++) out[i] *= arpGain(frameAt(i));
        addMono(bus('brArp', take ? BR.WIPE.from : BR.BREAK_START), out, { pan: side ? 0.4 : -0.4 });
      }
    }
  }

  // ═══ v2: the antivirus's hand and the world's new sounds in bars 2–5 (brDef, brFoley, brChop: none of them on an as-built bus) ═══════
  /** The cursor's dry clicks (C7), panned where it acts; the frenzy's three cursors click 1 frame apart. */
  const CURSOR_PAN = { [BR.MARQUEE.from]: 0.25, [br(3)]: -0.6, [br(4, 0.5)]: 0.35, [BR.TRIPLE]: 0, [BR.SELECT.from]: 0, [BR.GRAPH.from]: -0.2, [BR.REWIND.from]: 0.3 };
  BR.CURSOR_CLICKS.forEach((f) => place('brDef', f, 0.06, (b) => {
    for (let c = 0; c < (f === BR.TRIPLE ? 3 : 1); c++) tick(b, Math.round((c * sr) / FPS), sr, { gain: 0.05, seed: seedOf(60, f) + c });
  }, { kind: 'brcursor', pan: CURSOR_PAN[f] ?? (f >= BR.REROLL[0] && f <= BR.REROLL.at(-1) ? 0.3 : 0) }));
  BR.CREAKS.forEach((f) => place('brFoley', f, 0.14, (b) => creak(b, 0, sr, { gain: 0.04, seed: seedOf(61, f) }), { kind: 'brcreak', pan: 0.15 }));
  /** The torn work orders: two at once on 2.3 and 4.3, one on 3.4a and on the whip (T9). */
  const TORN = { [BR.TEARS[0]]: [[-0.45, 0], [-0.2, 0.004]], [BR.TEARS[1]]: [[-0.55, 0]], [BR.TEARS[2]]: [[0.3, 0], [0.5, 0.005]], [BR.TEARS[3]]: [[0.35, 0]] };
  BR.TEARS.forEach((f) => TORN[f].forEach(([pan, delay], k) => place('brFoley', f, 0.07, (b) => rip(b, Math.round(delay * sr), sr, { gain: 0.06, seed: seedOf(62, f) + k }), { kind: 'brrip', pan })));
  BR.THUDS.forEach((f) => place('brFoley', f, 0.2, (b) => {
    const heap = f === BR.HEAP;
    thud(b, 0, sr, { gain: heap ? 0.156 : 0.12, seed: seedOf(63, f) });
    if (heap) thud(b, Math.round(0.02 * sr), sr, { gain: 0.09, from: 80, to: 55, seed: seedOf(63, f) + 1 });
  }, { kind: 'brthud', pan: f === BR.HEAP ? -0.35 : 0.3 }));
  // The floor tilts on the clap; the litter skids downhill (2 frames late) into the heap.
  const SKID_START = BR.SKID.from + 2;
  place('brFoley', SKID_START, (BR.SKID.to - SKID_START) / FPS, (b) => skid(b, 0, b.length, sr, { gain: 0.05, seed: seedOf(64, SKID_START) }), { kind: 'brskid', pan: -0.2 });
  // The antivirus's POV, one beat: its hum (J-cut a 32nd early), the scanner switching on, lock beeps riding the stutter, the CRT tick off.
  place('brDef', BR.SCANNER_HUM.from, (BR.SCANNER_HUM.to - BR.SCANNER_HUM.from) / FPS, (b) => hum(b, 0, b.length, sr, { gain: 0.02 }), { kind: 'brhum' });
  place('brDef', BR.POV.from, 0.05, (b) => chirp(b, 0, sr, { from: midi(96), to: midi(60), ms: 40, gain: 0.05 }), { kind: 'brscan' });
  BR.POV_LOCKS.slice(1).forEach((f) => place('brDef', f, 0.03, (b) => chirp(b, 0, sr, { from: midi(96), ms: 15, wave: 'square', gain: 0.03 }), { kind: 'brlock' }));
  place('brDef', BR.STUTTER_END, 0.03, (b) => crtTick(b, 0, sr, { gain: 0.05, seed: seedOf(65, 0) }), { kind: 'brcrt' });
  BR.WORLD_REROLL.forEach((f) => place('brFoley', f, 0.02, (b) => chirp(b, 0, sr, { from: 1200, ms: 12, gain: 0.02 }), { kind: 'brreel', pan: -0.25 }));
  swoosh('brFoley', BR.CRASH_WHOOSH.to, (BR.CRASH_WHOOSH.to - BR.CRASH_WHOOSH.from) / WHOOSH_PEAK, { from: 400, to: 5000, gain: 0.09, q: 1.3, seed: seedOf(66, 0) }, { kind: 'brzoom', pan: 0.35 });
  place('brFoley', BR.PULL_OUT.from, (BR.PULL_OUT.to - BR.PULL_OUT.from) / FPS + 0.07, (b) => fwoom(b, 0, at(BR.PULL_OUT.to - BR.PULL_OUT.from), sr, { gain: 0.08, seed: seedOf(67, 0) }), { kind: 'brfwoom' });
  // The infection (music bible M7, M8): the Defender's dry beep on C bends up to C♯ as the ripple crosses the guest, then his "wa".
  place('brDef', BR.INFECT_FLASH.from, 0.07, (b) => chirp(b, 0, sr, { from: midi(96), to: midi(97), ms: ((BR.INFECT - BR.INFECT_FLASH.from) / FPS) * 1000 + 15, wave: 'square', gain: 0.03 }), { kind: 'brinfect', pan: 0.4 });
  place('brChop', BR.INFECT, 0.25, (b) => sing(b, 0, sr, { freq: midi(VOICINGS.IV.at(-1) + 12), len: at(9), vowel: 'u', to: 'a', gain: 0.14, seed: seedOf(68, 0) }), { kind: 'brwa', pan: 0.3 });
  place('brDef', BR.SELECT.from, 0.08, (b) => zip(b, 0, sr, { from: 2500, to: 5000, ms: 60, gain: 0.03, seed: seedOf(69, 0) }), { kind: 'brmarquee' });
  place('brFoley', BR.UI_POP, 0.04, (b) => uiPop(b, 0, sr, { gain: 0.07, seed: seedOf(70, 0) }), { kind: 'bruipop', pan: -0.1 });

  // ═══ Break 6: the coaster ════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (mark('brroar', BR.RAIL_ROAR.from) && active) {
    const b = new Float32Array(at(BR.RAIL_ROAR.to) - at(BR.RAIL_ROAR.from));
    // His speed, smoothed over ~25 ms so the roar never clicks on a key; the wind rushes on the plunges (change log S7).
    const sp = new Float32Array(b.length);
    let s = trackSpeed(BR.RAIL_ROAR.from);
    const a = 1 - Math.exp(-1 / (0.025 * sr));
    for (let i = 0; i < b.length; i++) sp[i] = s += a * (trackSpeed(BR.RAIL_ROAR.from + (i * FPS) / sr) - s);
    roar(b, 0, b.length, sr, { speed: (i) => sp[i], gain: 0.03, wind: 3, seed: seedOf(71, BR.RAIL_ROAR.from) });
    addMono(bus('brFoley', BR.RAIL_ROAR.from), b, { at: rel(BR.RAIL_ROAR.from), pan: -0.2 });
  }
  BR.PLUNGES.forEach((p) => place('brFoley', p.from, (p.to - p.from) / FPS + 0.01, (b) => chirp(b, 0, sr, { from: 2400, to: 600, ms: ((p.to - p.from) / FPS) * 1000, gain: 0.025 }), { kind: 'brplunge', pan: -0.2 }));
  BR.BOTTOMS.forEach((f) => place('brFoley', f, 0.05, (b) => sparks(b, 0, sr, { gain: 0.05, seed: seedOf(72, f) }), { kind: 'brsparks', pan: -0.25 }));
  BR.CHAIN_CLICKS.forEach((f, k) => place('brFoley', f, 0.03, (b) => chain(b, 0, sr, { gain: 0.05, seed: seedOf(73, f) }), { kind: 'brchain', pan: -0.2 + 0.05 * k }));
  swoosh('brFoley', BR.CREST, 9, { from: 800, to: 800, gain: 0.04, q: 1.5, seed: seedOf(74, 0) }, { kind: 'brair', pan: -0.15 });
  place('brDef', BR.REWIND.from, (BR.REWIND.to - BR.REWIND.from) / FPS, (b) => rewind(b, 0, b.length, sr, { from: midi(84), to: midi(60), gain: 0.08, seed: seedOf(75, 0) }), { kind: 'brrewind', pan: 0.3 });
  // The whip: one whoosh over its 64 sub-frames (6.4& + 3 → 7.1), loudest on the hidden cut.
  swoosh('brFoley', BR.WHIP_CUT, (BR.WHIP_CUT - BR.WHIP.from) / WHOOSH_PEAK, { from: 300, to: 3500, gain: 0.12, q: 1.2, seed: seedOf(76, 0) }, { kind: 'brwhip', pan: -0.3 });

  // ═══ Break 7: the catch, the notches, the cursor's last tries ═════════════════════════════════════════════════════════════════════
  /** The car crunch: four thumps a frame apart, the third on the catch. */
  const CRUNCH = BR.CATCH - 2;
  place('brFoley', CRUNCH, 0.12, (b) => crunch(b, 0, sr, { gain: 0.08, seed: seedOf(77, 0) }), { kind: 'brcrunch', pan: 0.25 });
  place('brFoley', BR.CATCH, 0.22, (b) => boing(b, 0, sr, { gain: 0.12 }), { kind: 'brboing', pan: 0.1 });
  place('brDef', BR.CURSOR_OK.from, 0.15, (b) => whoosh(b, 0, b.length, sr, { from: 2000, to: 5000, gain: 0.03, q: 1.6, seed: seedOf(78, 0) }), { kind: 'brslide', pan: 0.55 });
  place('brDef', BR.BONK.from, 0.07, (b) => bonk(b, 0, sr, { gain: 0.05, seed: seedOf(79, 0) }), { kind: 'brbonk', pan: 0.6 });
  BR.NOTCHES.forEach((f, k) => place('brFoley', f, 0.09, (b) => creak(b, 0, sr, { freq: 500 * 2 ** (k / 12), q: 8, am: 26, ms: 80, gain: 0.04, seed: seedOf(80, f) }), { kind: 'brbandcreak', pan: -0.1 }));
  place('brFoley', BR.GRIP, 0.06, (b) => links(b, 0, sr, { gain: 0.02 }), { kind: 'brlinks', pan: -0.05 });
  place('brDef', BR.DENIED.from, 0.07, (b) => chirp(b, 0, sr, { from: midi(48), ms: 60, wave: 'square', gain: 0.04 }), { kind: 'brdenied', pan: 0.55 });
  place('brFoley', BR.ROOT_ROW, 0.04, (b) => chirp(b, 0, sr, { from: midi(89), ms: 30, wave: 'square', gain: 0.04 }), { kind: 'brroot', pan: 0.5 });

  // ═══ Break 8: the film, the fake drop ═════════════════════════════════════════════════════════════════════════════════════════════
  // The film catching the light, J-cut a 32nd before the reverse angle: a C♯/F/G♯ bell cluster swelling to 8.1&, then a glassy pad to the cut.
  if (mark('brshimmer', BR.SHIMMER.from) && active) {
    const b = bus('brFoley', BR.SHIMMER.from);
    shimmer(b.L, b.R, rel(BR.SHIMMER.from), at(BR.RELEASE) - at(BR.SHIMMER.from), at(BR.SHIMMER.to) - at(BR.SHIMMER.from), sr, { freqs: [97, 101, 104].map(midi), gain: 0.012 });
  }
  place('brFoley', BR.SUCTION.from, 0.07, (b) => chirp(b, 0, sr, { from: 900, to: 1400, ms: 60, gain: 0.03 }), { kind: 'brsqueak', pan: 0.1 });
  // The reversed crash rises from 8.1& into the release (on the riser's bus: the high-pass suck goes round it).
  place('brRiser', BR.REV_CRASH.to, (BR.REV_CRASH.to - BR.REV_CRASH.from) / FPS, (b) => reverseNoise(b, b.length, b.length, sr, { freq: 6000, gain: 0.1, seed: seedOf(81, 0) }), { kind: 'brrevcrash', start: BR.REV_CRASH.from, pan: 0.1 });
  // The release: the music is cut dead (the bus edits below); the thwang and the whoosh at the camera, then the bwomp as the film catches him.
  place('brFoley', BR.RELEASE, 0.26, (b) => thwang(b, 0, sr, { freq: midi(37), gain: 0.45 }), { kind: 'brthwang' });
  swoosh('brFoley', BR.WHOOSH_AT_CAM.to, (BR.WHOOSH_AT_CAM.to - BR.WHOOSH_AT_CAM.from) / WHOOSH_PEAK, { from: 400, to: 4000, gain: 0.2, q: 1.2, seed: seedOf(82, 0) }, { kind: 'brcam' });
  place('brFoley', BR.SPLAT, 0.16, (b) => bwomp(b, 0, sr, { gain: 0.5, seed: seedOf(83, 0) }), { kind: 'brbwomp' });

  if (!active) return events;

  // ——— Bus edits: echoes on the vox; the stutter and the tape stop of the first take; the pivot; the eggs' ducks; the suck; the cuts ——————
  for (const t of takes) for (const name of ['brVox', 'brChop']) if (t[name]) pingPong(t[name], sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  const [pre, post, held] = takes;
  // The pivot (8.1): the coaster's and the sling's hook sings and rings F and G naturals up to it (the climb's F6 on 7.4&, access
  // granted's F5, with their echoes and bell tails) while every other voice glides up a semitone. Their last 8th cross-fades to the drier
  // send (brDry: buses that sum alike, so the dry mix is unchanged — only less plate rings on), and all of it fades out over the pivot's
  // first 16th.
  if (held.brVox || held.brBell) {
    const dry = (held.brDry = stereo(len));
    const [w0, w1, g0, g1] = [PIVOT - 18, PIVOT - 12, PIVOT, PIVOT + 6].map(rel);
    const cos = (i, a, b) => 0.5 + 0.5 * Math.cos((Math.PI * (i - a)) / (b - a));
    for (const b of [held.brVox, held.brBell]) {
      if (!b) continue;
      for (const [x, d] of [[b.L, dry.L], [b.R, dry.R]]) {
        for (let i = w0; i < len; i++) {
          const wet = i < w1 ? cos(i, w0, w1) : 0;
          const g = i < g0 ? 1 : i < g1 ? cos(i, g0, g1) : 0;
          d[i] += x[i] * g * (1 - wet);
          x[i] *= g * wet;
        }
      }
    }
  }
  // Ruling 5: the bed ducks under each egg (the eggs' own bus, the drums and the sub drone excepted).
  if (ducks) {
    const g = new Float32Array(len).fill(1);
    for (const [kind, frames] of [['brsudo', BR.SUDO_V2], ['brhup', [BR.HUP_V2]]]) {
      const d = EGG_DUCKS[kind];
      const floor = 10 ** (-d.depthDb / 20);
      const [lead, hold, release] = [d.leadMs, d.holdMs, d.releaseMs].map((ms) => Math.round((ms / 1000) * sr));
      for (const f of frames) {
        const on = rel(f);
        for (let i = Math.max(0, on - lead); i < Math.min(len, on + hold + release); i++) {
          const k = i < on ? (on - i) / lead : i < on + hold ? 0 : (i - on - hold) / release;
          g[i] = Math.min(g[i], floor + (1 - floor) * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k))));
        }
      }
    }
    for (const t of takes) {
      for (const [name, b] of Object.entries(t)) {
        if (name === 'brDrums' || name === 'brSub' || name === 'brEgg') continue;
        for (const x of [b.L, b.R]) for (let i = 0; i < len; i++) x[i] *= g[i];
      }
    }
  }
  // The first take: stuttered on 3.4 and tape-stopped on the hang — all but the fx (v04's and v2's: the POV's beeps ride on top).
  const gateLen = Math.round(0.045 * sr);
  for (const [name, b] of Object.entries(pre)) {
    if (name === 'brFx' || V2_BUSES.includes(name)) continue;
    for (const x of [b.L, b.R]) {
      stutterSlices(x, BR.STUTTER.map(rel), rel(BR.STUTTER_END), gateLen, [1, 0.85, 0.7, 0.55], sr);
      tapeStop(x, rel(BR.TAPE_STOP.from), rel(BR.TAPE_STOP.to), sr, { semitones: 12, lpFrom: 8000, lpTo: 300 });
    }
  }
  // The held breath's last 32nd sucks the lows out of everything but the riser and the reversed crash, into the release.
  for (const [name, b] of Object.entries(post)) if (name !== 'brRiser') for (const x of [b.L, b.R]) sweepHighpass(x, rel(BR.HP_SUCK_V2.from), rel(BR.RELEASE), sr, 20, 400);
  // The cuts: every take but the release's ends dead on the release (1.5 ms); the release's on the look. Then into the stems.
  const ramp = Math.round(0.0015 * sr);
  takes.forEach((t, k) => {
    const end = k === 3 ? rel(BR.LOOK) : rel(BR.RELEASE);
    for (const [name, b] of Object.entries(t)) {
      const dst = (stems[name] ??= stereo(n));
      for (const [src, out] of [[b.L, dst.L], [b.R, dst.R]]) {
        for (let i = Math.max(0, end - ramp); i < len; i++) src[i] *= i < end ? (end - i) / ramp : 0;
        for (let i = 0; i < len && base + i < n; i++) out[base + i] += src[i];
      }
    }
  });
  return events;
}
