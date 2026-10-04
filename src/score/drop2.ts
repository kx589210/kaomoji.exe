// Events of drop 2, the film's part 'drop2' (20 bars, src/score/film.ts): "THE VIRUS WAR". Build sheet
// notes/bid2/drop2-sheet2.md (from the final design notes/extend/drop2-final.md and the story bible
// docs/2026-10-01-virus-story.md: 先保留、再加). Positions are drop 2's own bars (`drop2 1.1` = its downbeat;
// at(bar, beat) below), so drop 2 moves with its part when bars are inserted before it.
//
// The shape of the 20 bars (sheet §2):
//   ACT 1, the rampage (1–8): the eight approved bars of the 36-bar master, KEPT and given room — bars 1–4 where they were (the pop and
//   S27 SLASH, S28 STYLE CUBE, S29 Z-BUFFER with the donut and bar 4's blink), the game S30 opened up to two bars (5 the crane and a new
//   chart, 6 the built FULL COMBO bar), S31 OVERFLOW (7), then the new KERNEL bar (8): the wrap lands him in Defender's home and topples
//   its 16 processes like dominoes; a red hairline that filled all act long lifts into "installing Defender v2.0".
//   THE SWITCH (9): one half-time bar in Defender v2.0's eyes: the X-ray deepens to cyanotype, his font is exploded and his bytes read
//   (the film's one SIGNATURE MATCH), a red box, a held breath, amber copies spill from every box, compass arcs draft a wave.
//   ACT 2, five defence layers (10–17): the woodblock wave (10–11, with its small kaomoji mountain), the 8-bit arcade (12) stood up
//   as voxels (13), the Memphis firewall (14), the Olympic pictograms (15), the mirror trap (16–17): the brightest frame, ∞ copies, the
//   clamp, `[DEFENDER] giving up`.
//   FINALE (18–20): the built reel (18) and the stuck-ASCII overload with its honest fps and the crash (19), KEPT; the program freezes,
//   the camera does not: a 360° bullet-time orbit through glass droplets with a music box (19.4&–20.4&); the built drain (20.4&–21.1).
//
// KEEP-FIRST (the bible's hard rule): the approved bars are not rebuilt. Their events below keep their names and are moved by whole bars
// (CARRIED says where from), so their shots — which read these names — draw what they drew in the v04 master at the new places; the map's
// seeds follow (src/score/film.ts SEED_NEW_BARS: drop 2's new bars 5, 8–17 and 20), so every random draw is v04's too. The drain moves
// 12 bars inside the crash bar's hold: CRASH_CLOCK / crashClock() give the crash shot its v04 clock around the bullet time.
//
// Rules (tests/drop2.test.ts audits them): every exported frame is a multiple of 3 (the 32nd-note grid); export only numbers, number
// arrays, { from, to } objects (frame fields only) and arrays of objects whose frame fields are named at / from / to / until. Windows are
// { from, to } with `to` exclusive. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports. The picture
// (src/scenes/drop2*.ts, src/shots/drop2*.ts) and the music (scripts/audio/sections/drop2*.mjs) read these lists, so every hit lands on
// the same frame.
import type { GlyphFlash } from './cuts.ts';
import type { EnergyAccent } from './energy.ts';
import { builtEnd, partEnd, partFrame, partStart, seedFrame } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** Drop 2's bar `bar`, beat `beat` (both 1-based; drop2 1.1& is at(1, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
/** Every beat of drop 2's bars `bars` (each bar's 4 downbeats), from `beat` (1-based, default 1) on. */
const beatsOf = (bars: readonly number[], offset = 0): number[] => bars.flatMap((b) => [1, 2, 3, 4].map((k) => at(b, k) + offset));
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sorted = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);

// ——— Bounds ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Drop 2 runs from its downbeat, drop2 1.1 (the break hands over through the soap film), to the end of its content: the outro's downbeat,
 * once the part is built through (src/score/film.ts `built`: the skeleton covers all 20 bars, new bars with their stubs).
 */
export const DROP2_START = partStart('drop2');
export const DROP2_END = builtEnd('drop2');

// ——— KEEP-FIRST: the approved bars and where they came from (sheet §1) ——————————————————————————————————————————————————————————

/**
 * The v04 master's frame of drop2 1.1 (output/kaomoji-full-v04-4k.mp4, film frame 2496): where drop 2's random draws were approved. The
 * identity proof compares every carried frame with output/frames/kaomoji-full-v04/f<v04>.jpeg.
 */
const V04_START = seedFrame(DROP2_START);

/**
 * The approved bars of the v04 master, each with the span of drop 2 that now draws it ({ from, to }, film frames) and the v04 frame its
 * first frame was (`v04`). `keep`: 'identical' — byte-identical 4K frames at the new place (an additive overlay excepted, inside its own
 * box); 'changed' — rebuilt on purpose (the review fixes the task lists, the new chart), its changes logged in the sheet's §1.
 */
export type Carried = { shot: string; what: string; from: number; to: number; v04: number; keep: 'identical' | 'changed' };
export const CARRIED: readonly Carried[] = [
  { shot: 'S27', what: 'E6 the pop + S27 SLASH', from: at(1), to: at(2), v04: V04_START, keep: 'identical' },
  { shot: 'S28', what: 'S28 STYLE CUBE', from: at(2), to: at(3), v04: V04_START + 96, keep: 'identical' },
  { shot: 'S29', what: 'S29 Z-BUFFER, the donut, bar 4’s blink, the collapse (review fixes: ZBUF2)', from: at(3), to: at(5), v04: V04_START + 192, keep: 'changed' },
  { shot: 'S30', what: 'S30 FULL COMBO: the built game bar, its notes, PERFECTs, the lens, the whip-tilt', from: at(6), to: at(7), v04: V04_START + 384, keep: 'changed' },
  { shot: 'S31', what: 'S31 OVERFLOW (to the wrap; the whip-pan now lands in the kernel)', from: at(7), to: at(8), v04: V04_START + 480, keep: 'identical' },
  { shot: 'S32', what: 'S32 the reel', from: at(18), to: at(19), v04: V04_START + 576, keep: 'identical' },
  { shot: 'S32', what: 'S32 stuck in ASCII (E9 honest fps, E10 the last drop), the crash, the sort, THE FRAME', from: at(19), to: at(19, 4.5), v04: V04_START + 672, keep: 'identical' },
  // v08: its frames are the bullet time's tape stop now (the drain is bridge B's); its seeds stay v04's.
  { shot: 'T7', what: 'T7 the drain and the condense into the ending’s (×ω×) (v08: moved into bridge B)', from: at(20, 4.5), to: at(21), v04: V04_START + 756, keep: 'changed' },
];

/** The v04 frame that film frame `frame` carries (fractional frames keep their fraction), or null where drop 2 draws something new. */
export function v04Of(frame: number): number | null {
  const c = CARRIED.find((x) => frame >= x.from - 0.5 && frame < x.to - 0.5);
  return c ? c.v04 + (frame - c.from) : null;
}

// ——— Drums (sheet §6.2; the music bible §4.7 and the design §8.2): the carried bars' hits where they were, the new bars' grooves ——————

/**
 * A kick on every beat, but: bar 9 is half time (9.1, a light one on 9.2&), bar 19 races on the 8ths to the crash (19.1–19.2&, as built),
 * bar 20 has none (heartbeats, HEARTBEATS). Acts 1 and 2 keep the kick on the beats in every groove (the bible's rule 2).
 */
export const KICKS2: readonly number[] = sorted([...beatsOf([...range(1, 8), ...range(10, 18)]), at(9), at(9, 2.5), ...steps(at(19), at(19, 3), EIGHTH)]);
/** Kicks at gain 0.75 (as built): the downbeats that open a world (and the FULL COMBO). */
export const BIG_KICKS2: readonly number[] = [at(1), at(3), at(5), at(6, 4), at(7), at(8), at(18)];
/**
 * The design's kick gains where they are not 0.55 / BIG_KICKS2's 0.75: 9.1 the half-time downbeat, 9.2& the light one, 10.1 the film's
 * loudest hit, 17.4 the give-up. 10.1 1 → 0.75 (v07, the review: a short, heavy hit at the wave's start read as noise — at full gain it drove the group clip ≈ 4.6 dB deep
 * and the clip's gain rode every bright bus with it — fuzz in 0.8–3 kHz; 10.1 is loud by arrangement now, scripts/audio/drop2Edo.mjs).
 */
export const KICK_GAINS2: readonly { at: number; gain: number }[] = [
  { at: at(9), gain: 0.9 },
  { at: at(9, 2.5), gain: 0.6 },
  { at: at(10), gain: 0.75 },
  { at: at(17, 4), gain: 0.9 },
];
/** Clap + snare on 2 and 4 (acts 1 and 2, the reel); 9.3 the half-time backbeat; 19.2 (as built). None in double time (12–13: SNARES2). */
export const CLAPS2: readonly number[] = sorted([...[...range(1, 8), 10, 11, 14, 15, 16, 17, 18].flatMap((b) => [at(b, 2), at(b, 4)]), at(9, 3), at(19, 2)]);
/** Snare alone: double time's backbeat on every & of bars 12–13. */
export const SNARES2: readonly number[] = [12, 13].flatMap((b) => [1, 2, 3, 4].map((k) => at(b, k + 0.5)));
/** Open hats on the &s: bars 1–8, 10–11, 14–18 (not in the half-time bar, not under double time's snares, not in the stuck bar). */
export const OPEN_HATS2: readonly number[] = beatsOf([...range(1, 8), 10, 11, ...range(14, 18)], EIGHTH);
/**
 * Closed hats on every 16th, drop2 1.1 to the crash (19.3) — but bar 9: 8ths to the backbeat (9.1–9.2&), nothing through the held breath
 * (9.3–9.3&), rising 16ths from the spill (9.4); none in the bullet time.
 */
export const HATS2: readonly number[] = sorted([...steps(at(1), at(9), SIXTEENTH), ...steps(at(9), at(9, 3), EIGHTH), ...steps(at(9, 4), at(19, 3), SIXTEENTH)]);
/**
 * The shaker doubles the hats in act 1 (1–8), on the wave (10–11) and in the finale's built bars (18–19.3) — and (v07, the carry into the
 * wave) from the spill (9.4), rising with the hats out of the held breath, so it is not a new voice on 10.1.
 */
export const SHAKER2: readonly number[] = HATS2.filter((h) => h < at(9) || (h >= at(9, 4) && h < at(12)) || h >= at(18));
/** Rims at kick + 18 (an 8th and a 16th after the beat), act 1's bars 1–7 (out under the kernel). */
export const RIMS2: readonly number[] = beatsOf(range(1, 7), 18);
/** Crashes: every world's downbeat (the carried ones as built) and the act 2 hits the design names. */
export const CRASHES2: readonly number[] = [at(1), at(2), at(3), at(4), at(5), at(6, 4), at(7), at(8), at(10), at(11), at(16), at(17), at(17, 4), at(18)];
/** Of those, the light ones (gain 0.15–0.18). */
export const LIGHT_CRASHES2: readonly number[] = [at(2), at(4)];
/** S28's tom fill (as built): 110, 140, 175, 220 Hz. */
export const TOMS2: readonly number[] = steps(at(2, 4), at(3), SIXTEENTH);
/** Bar 6's roll (as built, old bar 5): 16ths from 6.2&, 32nds from 6.3& — in the picture, Defender's red scan bars (SCAN_BARS). */
export const ROLL31: readonly number[] = [...steps(at(6, 2.5), at(6, 3.5), SIXTEENTH), ...steps(at(6, 3.5), at(6, 4), THIRTY_SECOND)];
/** Bar 7's snare 32nds into the wrap (as built). */
export const SNARE32_32: readonly number[] = steps(at(7, 4), at(8), THIRTY_SECOND);
/** The reel's snare (as built): 8ths → 16ths from 18.3 → 32nds under the blades. */
export const ROLL33: readonly number[] = sorted([...steps(at(18), at(18, 3), EIGHTH), ...steps(at(18, 3), at(19), SIXTEENTH), ...steps(at(18, 4.5), at(19), THIRTY_SECOND)]);
/** The stuck bar's snare 32nds to the crash (as built). */
export const ROLL34: readonly number[] = steps(at(19), at(19, 3), THIRTY_SECOND);

// Act 2's own drum parts (the music bible §4.7: a groove changes only on a bar line; the 8th before carries the J-cut).
/** Bar 9 (half time): the 8th hats to the backbeat, the held breath (sub swell + alarm only), the rising 16ths and the snare 16ths of the spill. */
export const HALF_TIME = { from: at(9), to: at(10) } as const;
export const HELD_BREATH = { from: at(9, 3.5), to: at(9, 4) } as const;
export const SPILL_SNARES: readonly number[] = steps(at(9, 4.5), at(10), SIXTEENTH);
/** Bars 10–11: a taiko DON on every kick. */
export const TAIKO2: readonly number[] = KICKS2.filter((k) => k >= at(10) && k < at(12));
/** Bars 12–13: the four-note march (D♯ C♯ B A♯): quarters, then 8ths from 12.3, then 16ths from 12.4 to the morph (13.4&). */
export const MARCH_NOTES: readonly number[] = [at(12), at(12, 2), ...steps(at(12, 3), at(12, 4), EIGHTH), ...steps(at(12, 4), at(13, 4.5), SIXTEENTH)];
/** Bar 14 (straight 80s): cowbell 8ths; the gated tom fill on 14.4e, 14.4&, 14.4a. */
export const COWBELL2: readonly number[] = steps(at(14), at(15), EIGHTH);
export const GATED_TOMS2: readonly number[] = [at(14, 4.25), at(14, 4.5), at(14, 4.75)];
/** Bar 15: the drumline's 16ths from the flop (15.3) to the light; the timpani roll from the contact sheet (15.4) into 16.1. */
export const DRUMLINE2: readonly number[] = steps(at(15, 3), at(16), SIXTEENTH);
export const TIMPANI2 = { from: at(15, 4), to: at(16) } as const;
/** Bars 16–17, the build: snare 8ths from 16.4&, 16ths from 17.2&, 32nds from 17.3&, the fill's 32nds from the give-up (17.4) to the whip. */
export const BUILD_SNARES2: readonly number[] = sorted([...steps(at(16, 4.5), at(17, 2.5), EIGHTH), ...steps(at(17, 2.5), at(17, 3.5), SIXTEENTH), ...steps(at(17, 3.5), at(17, 3.5) + 12, THIRTY_SECOND), ...steps(at(17, 4), at(17, 4) + 24, THIRTY_SECOND)]);

// ——— Harmony and the hook (sheet §6.1; the music bible §2.2, §3) ————————————————————————————————————————————————————————————————

/** The chords drop 2's music voices: F♯ major (drop 1 + 1), never its tonic (the film's one tonic is outro 3.1); the antivirus's chords borrowed from F♯ minor. */
export type Chord2 = 'IV' | 'Vsus' | 'V' | 'iii' | 'vi' | 'bVI' | 'iv' | 'V7b9' | 'bVII' | 'V7';
/**
 * The design's harmony, bar by bar (design §8.1): act 1 IV · Vsus→V · iii · vi twice; 9: ♭VI → iv (9.3) → V7♭9 (9.4), the antivirus's
 * (red minor → amber major on 10.1's IV); act 2 IV V iii vi IV V IV; 17: ♭VI → ♭VII (17.3) → V7 (17.4); the reel's IV (the launch,
 * re-voiced from the built iii); vi → Vsus (19.2); the frozen Vsus to the end. Every launch is V → IV.
 */
export const HARMONY2: readonly { at: number; chord: Chord2 }[] = [
  { at: at(1), chord: 'IV' },
  { at: at(2), chord: 'Vsus' },
  { at: at(2, 3), chord: 'V' },
  { at: at(3), chord: 'iii' },
  { at: at(4), chord: 'vi' },
  { at: at(5), chord: 'IV' },
  { at: at(6), chord: 'Vsus' },
  { at: at(6, 3), chord: 'V' },
  { at: at(7), chord: 'iii' },
  { at: at(8), chord: 'vi' },
  { at: at(9), chord: 'bVI' },
  { at: at(9, 3), chord: 'iv' },
  { at: at(9, 4), chord: 'V7b9' },
  { at: at(10), chord: 'IV' },
  { at: at(11), chord: 'V' },
  { at: at(12), chord: 'iii' },
  { at: at(13), chord: 'vi' },
  { at: at(14), chord: 'IV' },
  { at: at(15), chord: 'V' },
  { at: at(16), chord: 'IV' },
  { at: at(17), chord: 'bVI' },
  { at: at(17, 3), chord: 'bVII' },
  { at: at(17, 4), chord: 'V7' },
  { at: at(18), chord: 'IV' },
  { at: at(19), chord: 'vi' },
  { at: at(19, 2), chord: 'Vsus' },
];
/**
 * The chords as today's drop2.mjs voices them (its VOICINGS2 / ROOT2 know IV, Vsus, V, iii, vi): HARMONY2 with the borrowed chords left
 * out — the chord before holds through them — and V7 as V. The music builder voices HARMONY2 (♭VI D(add9), iv Bm(add9), V7♭9 C♯7♭9,
 * ♭VII E, V7 C♯7) and retires this list; until then every bar renders and nothing throws (other teams regenerate the whole film's music).
 */
export const CHORDS2: readonly { at: number; chord: 'IV' | 'Vsus' | 'V' | 'iii' | 'vi' }[] = HARMONY2.flatMap((c) =>
  c.chord === 'V7' ? [{ at: c.at, chord: 'V' as const }] : c.chord === 'bVI' || c.chord === 'iv' || c.chord === 'V7b9' || c.chord === 'bVII' ? [] : [{ at: c.at, chord: c.chord }],
);
/**
 * The sung hook, drop 1's HOOK + 1 semitone, one row a bar (`midi` the note, `len` in 16ths): bars 1–4 rows 1–4 (as built), bar 5 a new
 * row — row 4's figure a diatonic third up (its five notes after the downbeat are the game's VOX kana, VOX_KANA) — and bar 6 row 5 (as
 * built; the VOX lane's faced notes, NOTES_VOX).
 */
export const HOOK2: readonly { at: number; midi: number; len: number }[] = (
  [
    [at(1), 80, 2], [at(1, 1.5), 78, 1], [at(1, 1.75), 80, 2], [at(1, 2.5), 83, 2], [at(1, 3), 82, 3], [at(1, 3.75), 80, 1], [at(1, 4), 78, 2], [at(1, 4.5), 77, 2],
    [at(2), 80, 2], [at(2, 1.5), 82, 1], [at(2, 1.75), 85, 2], [at(2, 2.5), 83, 2], [at(2, 3), 82, 4], [at(2, 4), 80, 2], [at(2, 4.5), 82, 2],
    [at(3), 82, 2], [at(3, 1.5), 85, 1], [at(3, 1.75), 87, 2], [at(3, 2.5), 85, 2], [at(3, 3), 89, 4], [at(3, 4), 87, 2], [at(3, 4.5), 85, 2],
    [at(4), 87, 2], [at(4, 1.5), 85, 1], [at(4, 1.75), 87, 2], [at(4, 2.5), 90, 2], [at(4, 3), 89, 3], [at(4, 3.75), 87, 1], [at(4, 4), 85, 2], [at(4, 4.5), 87, 2],
    [at(5), 90, 2], [at(5, 1.5), 89, 1], [at(5, 1.75), 90, 2], [at(5, 2.5), 94, 2], [at(5, 3), 92, 3], [at(5, 3.75), 90, 1], [at(5, 4), 89, 2], [at(5, 4.5), 90, 2],
    [at(6), 87, 2], [at(6, 1.5), 90, 1], [at(6, 1.75), 92, 2], [at(6, 2.5), 90, 2], [at(6, 3), 89, 4], [at(6, 4), 87, 2], [at(6, 4.5), 85, 2],
  ] as const
).map(([f, midi, len]) => ({ at: f, midi, len }));
/**
 * Act 2's hook (design §8.1: each world gives the hook one new timbre and drops the last), from the same rows: 10–11 koto (rows 1–2),
 * 12–13 the chip square's 16th arpeggios (rows 3–4), 14 the vox at half speed (row 1's first half), 15 the synth-brass stabs on the beats
 * (row 2's notes), 16 every lead in octaves (row 5), 17 the hook's top note on 17.2. `voice` names the timbre; the music builder voices it.
 */
export type HookVoice = 'koto' | 'chip' | 'voxHalf' | 'brass' | 'octaves';
export const HOOK2_ACT2: readonly { at: number; midi: number; len: number; voice: HookVoice }[] = [
  ...HOOK2.filter((n) => n.at < at(3)).map((n) => ({ at: n.at + (at(10) - at(1)), midi: n.midi, len: n.len, voice: 'koto' as const })),
  ...HOOK2.filter((n) => n.at >= at(3) && n.at < at(5)).map((n) => ({ at: n.at + (at(12) - at(3)), midi: n.midi, len: n.len, voice: 'chip' as const })),
  { at: at(14), midi: 80, len: 4, voice: 'voxHalf' },
  { at: at(14, 2), midi: 78, len: 2, voice: 'voxHalf' },
  { at: at(14, 2.5), midi: 80, len: 4, voice: 'voxHalf' },
  { at: at(14, 4), midi: 83, len: 4, voice: 'voxHalf' },
  ...[80, 85, 83, 82].map((midi, k) => ({ at: at(15, k + 1), midi, len: 2, voice: 'brass' as const })),
  ...HOOK2.filter((n) => n.at >= at(6) && n.at < at(7)).map((n) => ({ at: n.at + (at(16) - at(6)), midi: n.midi, len: n.len, voice: 'octaves' as const })),
  { at: at(17, 2), midi: 92, len: 4, voice: 'octaves' },
];
/** Drop 2's bar 7 (as built): one long "aa" climbing a semitone per kick (D♯6 → F♯6), then gliding down two octaves into the wrap. */
export const VOX_CLIMB: readonly number[] = [at(7), at(7, 2), at(7, 3), at(7, 4)];
export const VOX_GLIDE = { from: at(7, 4.5), to: at(8) } as const;
/** The reel (18, as built): the hook's first syllable retriggered (8ths, then 16ths); 19.1–19.2: the scream, gated on the 32nds. */
export const VOX_STUTTER = { from: at(18), to: at(19) } as const;
export const SCREAM = { from: at(19), to: at(19, 3) } as const;
/** Defender's own figure in the switch (no hook there): a low dry square D · C♮ · B · A♯, one a beat (the bible's M8). */
export const DEFENDER_FIGURE: readonly { at: number; midi: number }[] = [
  { at: at(9), midi: 50 },
  { at: at(9, 2), midi: 48 },
  { at: at(9, 3), midi: 47 },
  { at: at(9, 4), midi: 46 },
];
/** Infection = "wa" (the bible's M7), on the frames something of Defender's turns into him. */
export const WA2: readonly number[] = [at(8), at(8, 3), at(10, 2.5), at(11, 2), at(12, 2), at(13, 1.5), at(14, 2.5), at(15, 2), at(16, 3.5)];

// ——— Act 1 · drop2 1: the pop (E6) and S27 SLASH (as built) ——————————————————————————————————————————————————————————————————————

/** The break's soap film tears on the downbeat; drop 2 draws the pop and its droplets and torn text until drop2 1.2. */
export const FILM_POP = { from: at(1), to: at(1, 2) } as const;
/** The film's rim retracts past every frame corner a 16th after the downbeat. */
export const RIM = { from: at(1), to: at(1) + SIXTEENTH } as const;
/** S27's blades C1–C5 (each a shing): the band's line on the downbeat, then the kicks and the & (as built; KEEP-FIRST: not re-keyed). */
export const BLADES: readonly number[] = [at(1), at(1, 2), at(1, 3), at(1, 3.5), at(1, 4)];
/**
 * The party monitor's windows (src/shots/drop2Monitor.ts): W1 types in after the break's window has collapsed; W3 folds as the camera lands
 * in intro bar 4's frame; W4 is not drawn (S30's frame has no free corner): its last line opens S31's full-screen box.
 */
export const W1 = { from: at(1) + SIXTEENTH, to: at(1, 3) + 12 } as const;
export const W2 = { from: at(2, 3), to: at(3) } as const;
export const W3 = { from: at(4, 2), to: at(4, 4) } as const;
export const W4 = { from: at(6, 2), to: at(6, 4.5) } as const;
/** Defender's red rows inside the party monitor (additive, sheet §7.2): 1.2 `sandbox breached`, 2.4e `4 scans · 0 matches`, 4.2e `2D scanner · axis z unsupported`. */
export const DEFENDER_ROWS: readonly number[] = [at(1, 2), at(2, 4) + SIXTEENTH, at(4, 2) + SIXTEENTH];

// ——— Act 1 · drop2 2: S28 STYLE CUBE (as built) —————————————————————————————————————————————————————————————————————————————————

/** drop2 1.4&: the sliced frame shrinks into the cube's front; turn 1 starts. */
export const POP_OUT = at(1, 4.5);
/** The cube turns −90° per beat: launched on each &, landing on the next kick. */
export const TURNS: readonly { from: number; to: number }[] = [at(1, 4.5), at(2, 1.5), at(2, 2.5), at(2, 3.5)].map((f) => ({ from: f, to: f + EIGHTH }));
/** The whip onto the terminal face: the cube unwinds +360° and slams onto drop2 3.1 (fastest on its last frame). */
export const WHIP = { from: at(2, 4.5), to: at(3) } as const;

// ——— Act 1 · drop2 3–4: S29 Z-BUFFER (as built; ZBUF2 the review fixes) ————————————————————————————————————————————————————————————

/** The hero is drawn through S29's character pass from here (yaw 0, no extrusion), over the whipping cube. */
export const PREROLL = at(3) - SIXTEENTH;
/** The dimension pop: the extrusion launches and the dolly-zoom starts. */
export const POP = at(3);
/** The RISO dialect sweeps through him back → front, landing on the clap. */
export const SWEEPS: readonly { from: number; to: number }[] = [{ from: at(3, 2) - 9, to: at(3, 2) }];
/** The character cells change size on these kicks. */
export const RES_STEPS: readonly number[] = [at(3, 2), at(3, 3), at(3, 4), at(4, 4), at(4, 4.5)];
/** E7 (as built): he swallows himself into the torus (smooth-min, 12 f) and spins as donut.c … (ZBUF2.donut: one beat) */
export const SWALLOW = { from: at(3, 3), to: at(3, 3.5) } as const;
export const DONUT = { from: at(3, 3), to: at(4, 1.5) } as const;
/** … takes the drop2 3.4 kick as a spin accent … */
export const SPIN_ACCENT = at(3, 4);
/** … and re-forms on drop2 4.1, straight into the conveyor. */
export const REFORM = { from: at(4), to: at(4, 1.5) } as const;
/** The conveyor's states march in on these kicks (front / mid / back dialects). */
export const MARCH: readonly number[] = [at(4), at(4, 2), at(4, 3)];
/** The wobble bass under drop2 bars 3–4, and its filter LFO's period (frames) from each `at`: the bass and the depth bands' ripple share it. */
export const WOBBLE = { from: at(3), to: at(5) } as const;
export const WOBBLE_RATES: readonly { at: number; every: number }[] = [
  { at: at(3), every: EIGHTH },
  { at: at(4, 3), every: 8 },
  { at: at(4, 4), every: SIXTEENTH },
];
/**
 * The wobble's filter LFO at film frame `frame` (fractional allowed), in −1 … 1: +1 on every period start of WOBBLE_RATES (12 f from
 * drop2 3.1, 8 f from 4.3, 6 f from 4.4), −1 halfway, a cosine between; 0 outside WOBBLE. One definition: the bass's filter
 * (scripts/audio/drop2Voices.mjs re-exports it) and S29's depth bands' ripple both read it.
 */
export function wobbleLfo(frame: number): number {
  if (frame < WOBBLE.from || frame >= WOBBLE.to) return 0;
  let r = WOBBLE_RATES[0];
  for (const x of WOBBLE_RATES) if (x.at <= frame) r = x;
  const ph = ((((frame - r.at) % r.every) + r.every) % r.every) / r.every;
  return Math.cos(2 * Math.PI * ph);
}
/** He sees us: the pupils slide toward the lens. */
export const PUPILS = at(4, 3.5);
/** The camera swings onto intro bar 4's framing (an impact, lead 9 f) … */
export const SWING = { from: at(4, 4) - 9, to: at(4, 4) } as const;
/** … where he holds, front-on, in S04's giant ASCII face … */
export const BAR4 = { from: at(4, 4), to: at(4, 4.5) } as const;
/** … and blinks with both eyes in S04's rhythm (close, shut, open, done) on the 3-frame grid. Not a wink (the film has one, the ending's). */
export const BLINK2 = { close: at(4, 4), shut: at(4, 4) + THIRTY_SECOND, open: at(4, 4) + SIXTEENTH, done: at(4, 4.5) } as const;
/** The collapse: SWISS sweeps through every band, the extrusion and FOV go flat, the face pulls back to 560 px, the cells turn to paper. */
export const COLLAPSE = { from: at(4, 4.5), to: at(5) - THIRTY_SECOND } as const;
export const SWISS_SWEEP = { from: at(4, 4.5), to: at(4, 4.5) + SIXTEENTH } as const;
/** The music buses crunch to 8 bits, then 4; drop2 5.1 is clean. */
export const BITCRUSH: readonly number[] = [at(4, 4.5), at(4, 4.5) + SIXTEENTH];

/**
 * S29's review fixes (the task's list; design §3.1 bars 37–38, §4.3), for the Z-buffer builder: the donut one beat (swallowed on 3.3,
 * re-formed on the 3.4 clap straight into the conveyor), a new conveyor step on 4.1 (MARCH 0, the old 4.1 re-form's band set), the hat-
 * ratcheted orbit (yaw keys ±25°, YAW below), the dolly-zoom to 1250 px (65 % of the width) by 3.1&, the ground tinted per renderer
 * (GROUNDS: two light beats, Riso pink on 3.2 and Brutal cream on 4.2), the 2D scan line on 3.2 (Defender's beat: `scan 2D · z?`).
 * Until ZBUF2_LIVE is true the as-built names above drive S29 (and its rig accents); the Z-buffer builder switches to these and asks for
 * ZBUF2_LIVE (its rig accents, ZBUF2_ACCENTS, then replace the as-built ones in DROP2_ACCENTS). Live since 2026-10-02 (the integrator,
 * on builder Z's request): the picture already draws ZBUF2, so the rig and the music (the re-form, the march pops, the scan tick) follow it.
 */
export const ZBUF2_LIVE = true;
export const ZBUF2 = {
  donut: { from: at(3, 3), to: at(3, 4) },
  swallow: { from: at(3, 3), to: at(3, 3) + 6 },
  reform: { from: at(3, 4) - 6, to: at(3, 4) },
  scan: { from: at(3, 2), to: at(3, 2.5) },
  sizeBy: at(3, 1.5),
} as const;
/** The conveyor's states (design §3.1): the re-form into LED/NEON/BRUTAL on 3.4, MARCH 0 on 4.1 (NEON/LED/RISO), 4.2 (BRUTAL), 4.3 (TERMINAL). */
export const ZBUF2_MARCH: readonly number[] = [at(3, 4), at(4), at(4, 2), at(4, 3)];
/** The orbit's yaw keys (degrees, Catmull-Rom; the swing into bar 4's frame an impact with 9 f lead); each 16th hat adds +3° (2 f launch, 6 f decay). */
export const ZBUF2_YAW: readonly { at: number; deg: number }[] = [
  { at: at(3), deg: 0 },
  { at: at(3, 2), deg: 25 },
  { at: at(3, 3), deg: 0 },
  { at: at(3, 4), deg: -25 },
  { at: at(4), deg: -15 },
  { at: at(4, 2), deg: 25 },
  { at: at(4, 3), deg: -10 },
  { at: at(4, 4), deg: 0 },
];
/** The ground follows the front band's dialect: each change a radial cell wipe from his centre landing on its beat (`at`), begun 6 f before. */
export type Ground2 = 'terminal' | 'riso' | 'donut' | 'led' | 'neon' | 'brutal' | 'bar4' | 'swiss';
export const ZBUF2_GROUNDS: readonly { at: number; ground: Ground2 }[] = [
  { at: at(3), ground: 'terminal' },
  { at: at(3, 2), ground: 'riso' },
  { at: at(3, 3), ground: 'donut' },
  { at: at(3, 4), ground: 'led' },
  { at: at(4), ground: 'neon' },
  { at: at(4, 2), ground: 'brutal' },
  { at: at(4, 3), ground: 'terminal' },
  { at: at(4, 4), ground: 'bar4' },
  { at: at(5) - THIRTY_SECOND, ground: 'swiss' },
];

// ——— Act 1 · drop2 5–6: S30 FULL COMBO (the built game, opened to two bars) —————————————————————————————————————————————————————————

/** The hard match cut into the game (zbuf paper → game paper, Δ 0 px): the game renderer starts here (the design's GAME_START). */
export const GAME = at(5);
/** Bar 5 (new): the crane from plan view (pitch 90°) into the road (32°): 75 % by + 6, settled on 5.2. */
export const CRANE = { from: at(5), to: at(5, 2) } as const;
/** Bar 5 (new): Defender's first probes in the CLAP lane (5.2, 5.4): caught, each stamped with his ω. */
export const PROBES: readonly number[] = [at(5, 2), at(5, 4)];
/** Bar 5 (new): the VOX kana あ い う え お on the hook's new row (HOOK2 bar 5, its notes after the downbeat). */
export const VOX_KANA: readonly number[] = HOOK2.filter((n) => n.at > at(5) && n.at < at(5, 4)).map((n) => n.at);
/** Bar 5 (new): the signature's ten bytes ride the HAT lane, one per 16th as each crosses the rule, from 5.2&. */
export const HAT_BYTES: readonly number[] = steps(at(5, 2.5), at(5, 2.5) + 10 * SIXTEENTH, SIXTEENTH);
/** The notes with faces (bar 6, as built: every note is a real drum hit of the built game bar). */
export const NOTES_KICK: readonly number[] = [at(6), at(6, 2), at(6, 3), at(6, 4)];
export const NOTES_CLAP: readonly number[] = [at(6, 2), at(6, 4)];
export const NOTES_VOX: readonly number[] = HOOK2.filter((n) => n.at >= at(6) && n.at < at(7)).map((n) => n.at);
/** Defender's red scan bars (bar 6): the built roll chips, re-skinned. */
export const SCAN_BARS: readonly number[] = ROLL31;
/** E8: a 40 ms reversed grain of drop2 6.4's own audio, heard on 6.3 — the future, for a moment. */
export const SCRUB = at(6, 3);
/** Defender's lens (the Swiss red disc) falls onto his head: FULL COMBO. */
export const DISC = { from: at(6, 4) - 15, to: at(6, 4) } as const;
export const FULL_COMBO = at(6, 4);
/** The whip-tilt down into the party monitor, slammed onto drop2 7.1. */
export const TILT = { from: at(6, 4.5), to: at(7) } as const;

// ——— Act 1 · drop2 7: S31 OVERFLOW (as built) ——————————————————————————————————————————————————————————————————————————————————

/** The gauge's fill front lands on each kick: 256 %, 65,536 %, 16,777,216 %, 2,147,483,647 %. */
export const SURF: readonly number[] = [at(7), at(7, 2), at(7, 3), at(7, 4)];
export const CRACK = at(7, 2);
export const BOW = at(7, 3);
export const SNAP = at(7, 3.5);
/** +1 wraps the integer to −2,147,483,648 % = 0x80000000: the first address of kernel space. */
export const WRAP = at(7, 4.5);
/** The friends counter rolls: ∞+1, ∞×2, ∞^∞, NaN. */
export const FRIENDS_ROLLS: readonly number[] = [at(7, 1.5), at(7, 2.5), at(7, 3.5), at(7, 4.5)];
/** The whip-pan left, slammed onto drop2 8.1: it lands in the kernel (the built pan's last frames show the new world). */
export const PAN = { from: at(7, 4.5), to: at(8) } as const;

// ——— Act 1 · drop2 8: KERNEL (new) and the hairline that becomes the install bar ————————————————————————————————————————————————

/**
 * The act's quiet thread (design §4.4): a 2 px DEFENDER red line at 70 % along the bottom edge, growing from the left on each downbeat to
 * `pct` of the width (its tag `defender updating n%`), full on 8.4 (`defender v2.0 downloaded`). It lifts into the install bar (INSTALL).
 */
export const HAIRLINE: readonly { at: number; pct: number }[] = [
  { at: at(1, 1.5), pct: 4 },
  { at: at(2), pct: 11 },
  { at: at(3), pct: 23 },
  { at: at(4), pct: 38 },
  { at: at(5), pct: 52 },
  { at: at(6), pct: 67 },
  { at: at(7), pct: 81 },
  { at: at(8), pct: 94 },
  { at: at(8, 4), pct: 100 },
];
/** The kernel: the whip lands him in Defender's nave at 0x80000000 (8.1); the dolly forward lands on 8.3, framing him in the core ring. */
export const KERNEL = { from: at(8), to: at(9) } as const;
export const KERNEL_DOLLY = { from: at(8), to: at(8, 3) } as const;
/** The dominoes: the left row's 8 pillars land on the 16ths from 8.1&, the right row's a 32nd later; each flips ║ → ω base-up over 6 f. */
export const DOMINOES_L: readonly number[] = steps(at(8, 1.5), at(8, 1.5) + 8 * SIXTEENTH, SIXTEENTH);
export const DOMINOES_R: readonly number[] = DOMINOES_L.map((f) => f + THIRTY_SECOND);
/**
 * The hook's ghost through the kernel (v07 FW1: from 8.1 to 10.1 the hook was missing): the left row's pillars pluck hook row 1 as they
 * land, one note a pillar (G♯5 F♯5 G♯5 B5 A♯5 G♯5 F♯5 E♯5); the right row plays a third below (the music's thirdBelow). Audio only.
 */
export const DOMINO_HOOK: readonly { at: number; midi: number }[] = DOMINOES_L.map((f, k) => ({ at: f, midi: HOOK2.filter((n) => n.at < at(2))[k].midi }));
/** Defender scans a beat late (8.2): `[SCAN] 1 threat`; the core ring cracks into an ω (8.3a). */
export const KERNEL_SCAN = at(8, 2);
export const CORE_CRACK = at(8, 3.75);
/** The hang (8.4): v1 not responding; the mix muffles (low-pass 18 kHz → 900 Hz) to 8.4&. */
export const HANG = { from: at(8, 4), to: at(8, 4.5) } as const;
/** The install (8.4&): the hairline lifts to the frame's middle and fills on the 32nds; its edge wipes the picture to the slate X-ray; on 9.1 − 1 it folds into the reticle's crosshair. */
export const INSTALL = { from: at(8, 4.5), to: at(9) } as const;
export const INSTALL_STEPS: readonly number[] = steps(at(8, 4.5), at(9), THIRTY_SECOND);
/** The sub glides D♯1 → D1 under the install, landing on the switch. */
export const SUB_GLIDE = { from: at(8, 4.5) + SIXTEENTH, to: at(9) } as const;

// ——— The switch · drop2 9: Defender v2.0's POV, half time (new) ————————————————————————————————————————————————————————————————————

/** The whole bar is Defender's POV: the slate X-ray the audience knows (9.1, 2 f), deepening to v2.0's cyanotype (to 9.1 + 12). */
export const SWITCH = { from: at(9), to: at(10) } as const;
export const XRAY = { from: at(9), to: at(9) + 3 } as const;
export const CYANOTYPE = { from: at(9) + 3, to: at(9) + 12 } as const;
/** `v2.0 ready`: dry square C5 → C6. The alarm (two-tone, −18 dB) runs to the spill. */
export const V2_READY: readonly number[] = [at(9), at(9) + THIRTY_SECOND];
export const ALARM = { from: at(9), to: at(9, 4) } as const;
/** The exploded scan, one layer an 8th: the brackets (9.1&), the eyes (9.2), the ω (9.2&). */
export const EXPLODE: readonly number[] = [at(9, 1.5), at(9, 2), at(9, 2.5)];
/** The one reading of his bytes in the film (threads (b) rule 3): `SIGNATURE MATCH  E2 80 A2 20 CF 89 20 E2 80 A2  100%`, a byte a frame; the lock. */
export const SIGNATURE_MATCH = { from: at(9, 2.5), to: at(9, 2.5) + 12 } as const;
/** The quarantine box closes on the half-time backbeat (9.3); `THREAT CONTAINED ✓` (9.3&); the box's corner bulges (9.3& + 9). */
export const BOX = at(9, 3);
export const CONTAINED = at(9, 3.5);
export const BULGE = at(9, 3.5) + 9;
/** The spill: amber copies squeeze out of the boxes' corners on the 32nds (1 → 2 → 4 → 8 → 16); `quarantine failed ×n` in place of the ✓. */
export const SPILL: readonly number[] = steps(at(9, 4), at(9, 4) + 4 * THIRTY_SECOND, THIRTY_SECOND);
/**
 * The spill's copies pop out as the koto's hook head (v07 seam 4320, the Edo pre-lap; bar 9's one statement of the hook): G♯5 F♯5 G♯5 B5,
 * one a copy. Audio only.
 */
export const SPILL_HOOK: readonly { at: number; midi: number }[] = SPILL.map((f, k) => ({ at: f, midi: [80, 78, 80, 83][k] }));
/** The flood (9.4&): every satellite box fails; the drafting arcs of the wave's curl, one a 32nd (WAVE_CURL is the wave builder's). */
export const FLOOD = at(9, 4.5);
export const ARCS: readonly number[] = steps(at(9, 4.5), at(9, 4.5) + 4 * THIRTY_SECOND, THIRTY_SECOND);

// ——— Act 2 · drop2 10–11: the woodblock wave, layer 1/5 `ukiyoe.print` (new) ———————————————————————————————————————————————————————

/** The burst + inversion cut, act 2's downbeat and the film's loudest hit: the box blows open, the blueprint prints as a woodblock, he erupts. */
export const BURST = at(10);
/** The print prints block by block on the 16ths: keyline, pale blue, Prussian, the sky (and the small kaomoji mountain), the boats + the cartouche frame. */
export const BLOCKS: readonly number[] = steps(at(10), at(10, 2) + 1, SIXTEENTH);
/**
 * The infection as ink (D1: no kaomoji in the water): on each 16th from 10.1& to 10.2& his amber seeps into one more of the
 * wave's white flow lines where he is and bleeds along it (the wave's blooms; the music's infection ticks). The name is the old plan's
 * ("rows of tiny (•ω•)", struck by D1), kept because the music and its tests read it.
 */
export const INFECT_ROWS: readonly number[] = steps(at(10, 1.5), at(10, 3), SIXTEENTH);
/** The lip's fingers turn toward Defender's boats (10.2&: the zing; no つ hands, D1); he lands on the crest (10.3); into the barrel (10.4 → 11.1). */
export const CLAWS = at(10, 2.5);
export const CREST = at(10, 3);
export const BARREL = { from: at(10, 4), to: at(11) } as const;
/** The crash on Defender's boats (11.1); spat out (11.1&); the boats come up infected and his seal stamps (11.2); the prow (11.2&). */
export const WAVE_CRASH = at(11);
export const SEAL = at(11, 2);
export const PROW = at(11, 2.5);
/** Defender downsamples the world: a red scan line sweeps down 11.4 → 12.1; the print quantises a step a 16th (and the music bus with it). */
export const DOWNSAMPLE = { from: at(11, 4), to: at(12) } as const;
export const DOWNSAMPLE_STEPS: readonly number[] = steps(at(11, 4), at(12), SIXTEENTH);

// ——— Act 2 · drop2 12: the 8-bit arcade, layer 2/5 `8bit.rom` (new) ————————————————————————————————————————————————————————————————

export const ARCADE = { from: at(12), to: at(13) } as const;
/** The formation steps 16 px on every march note (MARCH_NOTES to 12.4); from 12.4 a row drop every 16th. */
export const ROW_DROPS: readonly number[] = [at(12, 4), at(12, 4.25)];
/** Defender's cannon fires (12.1&, 12.2&, 12.3&); every hit splits a copy (12.2 … 12.3&): shooting him makes more of him. */
export const PEWS: readonly number[] = [at(12, 1.5), at(12, 2.5), at(12, 3.5)];
export const SPLITS: readonly number[] = [at(12, 2), at(12, 2.5), at(12, 3), at(12, 3.5)];
/** The mothership dives (12.3&) and stomps the cannon (12.4); the bottom row lands (12.4&). */
export const DIVE = at(12, 3.5);
export const STOMP = at(12, 4);
export const INVASION = at(12, 4.5);

// ——— Act 2 · drop2 13: the voxel well (new) ——————————————————————————————————————————————————————————————————————————————————————

/** The tilt: the flat arcade stands up as voxels (camera only; 75 % by + 6, settled by + 20). */
export const VOXEL_TILT = { from: at(13), to: at(13) + 21 } as const;
/** The well's walls slam up (13.1&); a hard-drop every 8th to the I-piece (13.3& + 6); Defender's garbage rows (13.2, 13.3); the four-line clear (13.4). */
export const WELL = at(13, 1.5);
export const HARD_DROPS: readonly number[] = [...steps(at(13, 1.5), at(13, 3.5), EIGHTH), at(13, 3.5) + SIXTEENTH];
export const GARBAGE: readonly number[] = [at(13, 2), at(13, 3)];
export const LINE_CLEAR = at(13, 4);
/** Into Memphis (13.4& → 14.1): the cubes' colours swap on the 32nds; the floor goes white on one eased ramp; the pieces morph into solids. */
export const VOXEL_MORPH = { from: at(13, 4.5), to: at(14) } as const;
export const COLOUR_BLIPS: readonly number[] = [at(13, 4.5), at(13, 4.5) + 3, at(13, 4.5) + 6];

// ——— Act 2 · drop2 14: Memphis, layer 3/5 `memphis.css` (new) ———————————————————————————————————————————————————————————————————————

/** He lands as the totem's face block (14.1); the slabs pop up on the 16ths, the props drop on the 8ths. */
export const TOTEM = at(14);
export const SLABS: readonly number[] = steps(at(14), at(14, 2), SIXTEENTH);
export const PROPS: readonly number[] = steps(at(14), at(14, 3), EIGHTH);
/** The firewall panels slam (14.2, 14.2e); the ω laminate climbs them (14.2&); the set rotates 90° (14.3, launched 6 f before). */
export const PANELS: readonly number[] = [at(14, 2), at(14, 2.25)];
export const SET_ROTATE = { from: at(14, 3) - SIXTEENTH, to: at(14, 3) } as const;
/** The crane up to plan view (14.4 → 15.1); the grid snap on the 32nd ruler clicks (14.4&). */
export const CRANE_UP = { from: at(14, 4), to: at(15) } as const;
export const GRID_SNAP: readonly number[] = steps(at(14, 4.5), at(15), THIRTY_SECOND);

// ——— Act 2 · drop2 15: the pictograms, layer 4/5 `pictograms.svg` (new) ————————————————————————————————————————————————————————————

/** Plan view lands (15.1); touché (15.2): the one on-screen re-infection; the red bar rises (15.2&). */
export const PICTO = at(15);
export const TOUCHE = at(15, 2);
export const BAR_RISE = at(15, 2.5);
/** The flop: the world rolls round him in 45° snaps on the 16ths (15.3 → 180° on 15.3a); the bar bends into an ω. */
export const WORLD_ROLL: readonly number[] = steps(at(15, 3), at(15, 4), SIXTEENTH);
/** The contact sheet (15.4); the tiles hinge into an eight-mirror tube and the light ramps (15.4& → 16.1). */
export const SHEET = at(15, 4);
export const HINGE = { from: at(15, 4.5), to: at(16) } as const;

// ——— Act 2 · drop2 16–17: the mirror trap, layer 5/5 `mirror.trap` (new) —————————————————————————————————————————————————————————————

/** The film's brightest frames (16.1, 2 f: the picture, not the rig); the mandala crystallises outward to + 12. */
export const LIGHT = { from: at(16), to: at(16) + 3 } as const;
/** The kaleidoscope's mirror count (N facets) from each `at` (design §4.13); `hex` the ∞ wallpaper (N = 30, hex-safe), shrinking 1080 → 270 px. */
export const MIRRORS: readonly { at: number; n: number; hex?: true }[] = [
  { at: at(16), n: 8 },
  { at: at(16, 2), n: 12 },
  { at: at(16, 3), n: 16 },
  { at: at(16, 4), n: 24 },
  { at: at(17), n: 30 },
  { at: at(17, 2), n: 30, hex: true },
  { at: at(17, 3), n: 30 },
  { at: at(17, 4.25), n: 12 },
  { at: at(17, 4.5), n: 6 },
  { at: at(17, 4.75), n: 2 },
];
/** The rings born at the centre behind his face, flowing outward: PICTOGRAMS, MEMPHIS, VOXEL, WAVE, BLUEPRINT (Defender's last). */
export const KALEIDO_RINGS: readonly { at: number; world: 'picto' | 'memphis' | 'voxel' | 'wave' | 'blueprint' }[] = [
  { at: at(16), world: 'picto' },
  { at: at(16, 2), world: 'memphis' },
  { at: at(16, 3), world: 'voxel' },
  { at: at(16, 4), world: 'wave' },
  { at: at(17), world: 'blueprint' },
];
/** Defender's reticle slides in and is mirrored into a red rosette (16.2&); the rosette is infected (16.3&). */
export const RETICLES_IN = at(16, 2.5);
export const ROSETTE_INFECTED = at(16, 3.5);
/** Target lock on the 16ths (17.1); the ∞ wallpaper (17.2 → 17.3); the clamp: the red star (17.3); the give-up (17.4). */
export const TARGET_LOCKS: readonly number[] = steps(at(17), at(17, 1.75), SIXTEENTH);
export const WALLPAPER = { from: at(17, 2), to: at(17, 3) } as const;
export const CLAMP = { from: at(17, 3), to: at(17, 4) } as const;
export const GIVING_UP = at(17, 4);
/** The one reticle that doesn't fall: unmirrored, it spins off past the top-right corner (17.4 → 17.4 + 9) — the guest's party hat on 19.1. */
export const HAT_FLIGHT = { from: at(17, 4), to: at(17, 4) + 9 } as const;
/** The unfold and the whip-pan left into the reel (17.4& → 18.1, slammed). */
export const WHIP_REEL = { from: at(17, 4.5), to: at(18) } as const;

// ——— Finale · drop2 18–19.4&: S32 OVERLOAD and T7 (as built) ———————————————————————————————————————————————————————————————————

/** Drop 2's bar 18: the reel — eight worlds, each by its signature move, the hero locked at the centre. */
export const REEL = { from: at(18), to: at(19) } as const;
/** The hard cuts carried with their shots (0 px match cuts): the zbuf → game cut (5.1) and the reel's three (18.2, 18.3, 18.4). */
export const CUTS2: readonly number[] = [at(5), at(18, 2), at(18, 3), at(18, 4)];
/** The wipes on the reel's &s (LED column scan, Riso plates, star streaks) and the Riso plates' snap into register. */
export const WIPES: readonly number[] = [at(18, 1.5), at(18, 2.5), at(18, 3.5)];
export const REGISTER = at(18, 2.5) + SIXTEENTH;
/** S27's blades return on four 32nds: C1, C2 + C3, C4, C5 (the bookend of drop2 1.1). */
export const REEL_BLADES: readonly number[] = steps(at(18, 4.5), at(19), THIRTY_SECOND);
/** E9: the honest fps line, bottom-left, from the reel until the drain empties it (plus the camera line from 20.1, CAMERA_LINE). */
export const READOUT = { from: at(18), to: DROP2_END } as const;
/** The picture sticks in ASCII: drop 2's own character field draws every frame from LATCH, the drop2 19.1 kick. */
export const LATCH = at(19);
/** The racing heart: each kick sends a saturation wave out from his face. */
export const SATURATE: readonly number[] = [at(19), at(19, 1.5), at(19, 2), at(19, 2.5)];
/** E10: the guest — infected, wearing the reticle as a party hat — drops into frame with a fresh cocktail; one drop leaves the glass. */
export const GUEST = at(19);
export const DRIP = at(19) + SIXTEENTH;
/** The crash: the frame the drop lands, the program freezes (a hit stop, a segment boundary). */
export const CRASH = at(19, 3);
/** T7: the frozen rows sort by brightness toward him; the frame's rings. */
export const SORT = { from: CRASH + THIRTY_SECOND, to: at(19, 4) } as const;
export const RINGS: readonly number[] = [at(19, 4), at(19, 4) + SIXTEENTH];

// ——— Finale · drop2 19.4&–20.4&: the bullet time (new) ——————————————————————————————————————————————————————————————————————————

/**
 * The bullet time: the program stays frozen, the camera doesn't. Its content clock (the crash shot's) is held at the frame before it
 * (CRASH_HOLD, crashClock): positions frozen, ring drift stopped; the ring pulse (6 f) and the glints run on. 96 frames = 16 pulses, so
 * the built drain resumes in phase.
 */
export const BULLET = { from: at(19, 4.5), to: at(20, 4.5) } as const;
export const CRASH_HOLD = BULLET;
/** The orbit: θ = 360° · (1 − cos πu) / 2, u = (f − from) / (to − from): 3° on 19.4&, 180° on 20.2 + 9, 360° on 20.4&; starts in THE FRAME's hold. */
export const ORBIT = { from: at(19, 4.25), to: at(20, 4.5) } as const;
/** The depth lifts ring by ring (19.4& → 20.1) and lands in 8 plates, outer first, one a frame from 20.4 (PLATES.from … + 7). */
export const DEPTH_LIFT = { from: at(19, 4.5), to: at(20) } as const;
export const PLATES = { from: at(20, 4), to: at(20, 4) + 9 } as const;
/** Heartbeats (lub-dub, C♯2 on the sub bus): 20.1 at −18 dBFS, 20.3 at −24. */
export const HEARTBEATS: readonly { at: number; dub: number; db: number }[] = [
  { at: at(20), dub: at(20) + SIXTEENTH, db: -18 },
  { at: at(20, 3), dub: at(20, 3) + SIXTEENTH, db: -24 },
];
/** The music box (M6; flag MUSIC_BOX in the music): F♯5 F♯5 A♯5 C♯6, the last left hanging. */
export const MUSIC_BOX: readonly { at: number; midi: number }[] = [
  { at: at(20), midi: 78 },
  { at: at(20, 2), midi: 78 },
  { at: at(20, 3), midi: 82 },
  { at: at(20, 4), midi: 85 },
];
/** The frozen droplets' tings on the 32nds as the crown passes (C♯ E♯ G♯ B D♯, never F♯). */
export const CROWN_TINGS: readonly number[] = steps(at(20, 1.5), at(20, 2.5) + 12, THIRTY_SECOND);
/** The second fps line types under the first: `camera 60.0 fps · still rolling`. */
export const CAMERA_LINE = { from: at(20), to: at(20) + SIXTEENTH } as const;

/**
 * The crash shot's content clock at film frame `frame` (fractional kept): the frame itself until the bullet time, then held on the frame
 * before it (its sub-frame offset kept, like a held tail), then the frame less the bullet time's length — so the drain and the condense run
 * exactly as built (v04's 3252–3263) and the ending's hand-off is unchanged.
 */
export function crashClock(frame: number): number {
  if (frame < CRASH_HOLD.from - 0.5) return frame;
  if (frame < CRASH_HOLD.to - 0.5) return CRASH_HOLD.from - 1 + (frame - Math.round(frame));
  return frame - (CRASH_HOLD.to - CRASH_HOLD.from);
}

// ——— Finale · drop2 20.4&–21.1: the drain (as built) ————————————————————————————————————————————————————————————————————————————

/**
 * T7's drain and condense into the outro's (×ω×): the built 12 frames, moved past the bullet time. v08: DRAIN.from is where the bullet
 * time lands front-on on its camera's time (the tape stop draws it on the bridge's downbeat) and the crash shot takes over; the drain and
 * the condense themselves are bridge B's, a stage a beat (src/score/bridgeB.ts DRAIN_RINGS, CONDENSE_B).
 */
export const DRAIN = { from: at(20, 4.5), to: DROP2_END } as const;
export const CONDENSE = { from: at(20, 4.5), to: DROP2_END } as const;
/**
 * The music's freeze (S5, the bible's silence device, on `post`), and the hand-off's digital zero before the ending's cut — v08: the last
 * 16th of bridge B (src/score/bridgeB.ts HAND_OFF_ZERO), so drop 2's last voices (the music box running down) ring into the bridge and
 * the zero still lands just before the blue screen.
 */
export const SILENCE_S5 = { from: CRASH, to: BULLET.from } as const;
export const ZERO = { from: partEnd('bridgeB') - SIXTEENTH, to: partEnd('bridgeB') } as const;

// ——— Photography ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Sub-frames never cross these (design §4.17): the zbuf → game match cut (5.1), the burst + inversion (10.1), the reel's three hard cuts
 * and the freeze — and two slams that land on a new world's first frame (the integrator, 2026-10-02): the switch's 9.1 (DEFENDER v2.0's
 * POV and title slam in whole on the kick, not half-exposed over the kernel's last instant) and Memphis's 14.1 (the totem lands crisp;
 * the voxel well's last sub-frames no longer double-expose under it). Every other hand-off in drop 2 is continuous (whips, wipes, morphs,
 * the tilt, the crane, the push-through, the orbit).
 */
export const SEGMENT_CUTS: readonly number[] = sorted([...CUTS2, BURST, CRASH, SWITCH.from, TOTEM]);

/**
 * The picture's frame rate falling (E9, as built): from each `at` on, only every `every`-th frame is new (the rest repeat it), until the
 * next entry. drop2 18.4&: 20 fps under the reel blades; 19.1: 30 fps; 19.1&: 20; 19.2: 15; 19.2&: 10.
 */
export const STUTTER_RATES: readonly { at: number; every: number }[] = [
  { at: at(18, 4.5), every: 3 },
  { at: at(19), every: 2 },
  { at: at(19, 1.5), every: 3 },
  { at: at(19, 2), every: 4 },
  { at: at(19, 2.5), every: 6 },
];

/**
 * The content frame drop 2 shows at output frame `frame` (integer): itself until the reel; then the two frames before each of its hard
 * cuts hold the old shot's last clean frame (the renderer falling behind); then STUTTER_RATES; frozen from the crash.
 */
export function stutterFrame(frame: number): number {
  const f = Math.round(frame);
  if (f < REEL.from) return f;
  if (f >= CRASH) return CRASH;
  for (const c of CUTS2) if (c > REEL.from && (f === c - 2 || f === c - 1)) return c - 3;
  let rate: { at: number; every: number } | null = null;
  for (const r of STUTTER_RATES) if (r.at <= f) rate = r;
  return rate ? f - ((f - rate.at) % rate.every) : f;
}

/**
 * What E9's fps line prints at output frame `frame`: updated on the 8ths only. `fps` = the distinct content frames among the 60 output
 * frames up to the last 8th; `dropped` = the output frames from the reel on that repeat the frame before (nothing before it repeats);
 * `frozen` from the crash (`fps 0.0 · not responding`).
 */
export function honestFps(frame: number): { fps: number; dropped: number; frozen: boolean } {
  const e = Math.floor(Math.round(frame) / EIGHTH) * EIGHTH;
  if (e >= CRASH) return { fps: 0, dropped: honestFps(CRASH - 1).dropped, frozen: true };
  const shown = new Set<number>();
  for (let g = e - 59; g <= e; g++) shown.add(stutterFrame(g));
  let dropped = 0;
  for (let g = Math.max(DROP2_START, REEL.from - 1) + 1; g <= e; g++) if (stutterFrame(g) === stutterFrame(g - 1)) dropped++;
  return { fps: shown.size, dropped, frozen: false };
}

// ——— Camera energy and the character flash ———————————————————————————————————————————————————————————————————————————————————

/** S29's rig as built (bars 3–4) and with the review fix (a 0.05 punch on every kick of 3–4, the light bump on 3.1 only). */
const ZBUF_ACCENTS_BUILT: readonly EnergyAccent[] = [
  { at: POP, punch: 0.07, flash: 0.2 },
  ...[at(3, 2), at(3, 3), at(3, 4), at(4), at(4, 2), MARCH[2], at(4, 4)].map((f) => ({ at: f, punch: f === at(4) || f === MARCH[2] ? 0.05 : 0.04 })),
];
/** …live (ZBUF2_LIVE): 0.05 on every kick of 3–4, but bar 4's kept frame (4.4, BAR4: §1.3 D and P) keeps its as-built 0.04. */
export const ZBUF2_ACCENTS: readonly EnergyAccent[] = [{ at: POP, punch: 0.05, flash: 0.2 }, ...[at(3, 2), at(3, 3), at(3, 4), at(4), at(4, 2), at(4, 3), at(4, 4)].map((f) => ({ at: f, punch: f === BAR4.from ? 0.04 : 0.05 }))];

/**
 * Drop 2's camera energy, merged into the film's rig by src/score/energy.ts. The carried bars keep their accents (moved with them); the new
 * bars take the design's (§3 "Camera / rig"). One rig white (1.1, 0.8); light bumps ≤ 0.25 (3.1, the FULL COMBO, the give-up, the reel's
 * landing); 10.1's eruption and 16.1's light are pictures, not the rig. From the reel blades (18.4&) the rig adds nothing (E9's honest
 * stutter and E10's smooth drop; the bullet time's camera is its own).
 */
export const DROP2_ACCENTS: readonly EnergyAccent[] = [
  // Act 1 (as built): the drop, the slash, the cube, S29, the game, the overflow.
  { at: at(1), punch: 0.12, flash: 0.8, shake: 1 },
  ...[at(1, 2), at(1, 3), at(1, 4)].map((f) => ({ at: f, punch: 0.04 })),
  ...[at(2), at(2, 2), at(2, 3), at(2, 4)].map((f) => ({ at: f, punch: 0.03 })),
  ...(ZBUF2_LIVE ? ZBUF2_ACCENTS : ZBUF_ACCENTS_BUILT),
  { at: GAME, punch: 0.05 },
  ...[at(5, 2), at(5, 3), at(5, 4), at(6)].map((f) => ({ at: f, punch: 0.04 })),
  { at: at(6, 2), punch: 0.04 },
  { at: at(6, 3), punch: 0.04 },
  { at: FULL_COMBO, punch: 0.07, flash: 0.2, shake: 0.4 },
  { at: at(7), punch: 0.05, shake: 0.2 },
  { at: at(7, 2), punch: 0.05 },
  { at: at(7, 3), punch: 0.05 },
  { at: at(7, 4), punch: 0.05, shake: 0.25 },
  // The kernel: the whip lands, the dolly lands; the hang is a living hold.
  { at: at(8), punch: 0.06, shake: 0.3 },
  { at: at(8, 2), punch: 0.05 },
  { at: at(8, 3), punch: 0.06 },
  // The switch: the half-time downbeat and the box on the backbeat.
  { at: at(9), punch: 0.1, shake: 0.6 },
  { at: BOX, punch: 0.08, shake: 0.5 },
  // The wave: the eruption (no white: the paper is the light), the crest, the crash.
  { at: BURST, punch: 0.1, shake: 0.6 },
  { at: at(10, 2), punch: 0.04 },
  { at: CREST, punch: 0.06 },
  { at: WAVE_CRASH, punch: 0.1, shake: 0.8 },
  { at: SEAL, punch: 0.04 },
  { at: at(11, 3), punch: 0.04 },
  // The arcade: a punch a kick, the stomp's shake, the invasion.
  ...[at(12), at(12, 2), at(12, 3)].map((f) => ({ at: f, punch: 0.03 })),
  { at: STOMP, shake: 0.3 },
  { at: INVASION, punch: 0.04 },
  // The voxel well: the tilt's kick, the garbage shakes, the clear.
  { at: at(13), punch: 0.05 },
  ...GARBAGE.map((f) => ({ at: f, shake: 0.3 })),
  { at: LINE_CLEAR, punch: 0.08, shake: 0.5 },
  // Memphis: the landing, the panel slam.
  { at: TOTEM, punch: 0.06 },
  { at: at(14, 2), punch: 0.05 },
  // The pictograms: the plan view lands, the touché.
  { at: PICTO, punch: 0.04 },
  { at: TOUCHE, punch: 0.05 },
  // The mirror trap: the light (a punch only), the mirror steps, the push, the wallpaper's shake, the clamp, the give-up's light bump.
  { at: at(16), punch: 0.08 },
  ...[at(16, 2), at(16, 3), at(16, 4)].map((f) => ({ at: f, punch: 0.04 })),
  { at: at(17), punch: 0.05 },
  { at: at(17, 2), shake: 0.3 },
  // The clamp's shake 0.3 (was 0.6; integrator, round 1, act2b's hand-off 3): at 0.6 it rang through the hold (17.3 + 6 … + 18) and drowned
  // the hold's notch on each build snare; the punch carries the slam.
  { at: CLAMP.from, punch: 0.09, shake: 0.3 },
  { at: GIVING_UP, punch: 0.1, flash: 0.25, shake: 0.6 },
  // The reel (as built): the whip-pan lands; a punch on each hard cut.
  { at: at(18), punch: 0.08, flash: 0.2, shake: 0.6 },
  ...CUTS2.slice(1).map((f) => ({ at: f, punch: 0.06 })),
];

/**
 * Drop 2's character flashes (字符闪, src/score/cuts.ts), only where the renderer breaks (as built, the reel kept): the dark cut into the
 * reel's terminal card (18.4, the cut frame through + 3) and the crumble into the overload — ⅓, ⅔, then all of the cells, each on its reel
 * blade's own content frame, the last held through LATCH − 1 so the big change lands on the 19.1 kick. No ramp. Act 2's world changes are
 * moves, not breakages (no flash on 10.1, 12.1, 14.1 …).
 */
export const DROP2_GLYPHS: readonly GlyphFlash[] = [
  { at: CUTS2[3] },
  { at: REEL_BLADES[1], amount: 1 / 3 },
  { at: REEL_BLADES[2], amount: 2 / 3 },
  { at: REEL_BLADES[3], through: LATCH - 1 },
];
