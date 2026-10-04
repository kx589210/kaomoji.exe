// The kit renderer B's two bars share (the part 'cosmos', bars 3–4: the slingshot spirograph and the warp to the neon spiral; build sheet
// notes/bcos/sheet.md §4.3–§4.7, design notes/cosmos3/final.md §3.1 and §4 bars 17–18, prototype cosmos3/w/j1.js, j4.js, j5.js,
// j6.js): the prototype's exact motion curves (L, the launch; Im, the impact; and its easings), the light grammar's clocks on these bars
// (the kick's emissive pulse, the clap's shock ring, the open hat's glints, the 16th's sparks, the downbeat's paste flare and Eames square),
// the hook's bob and poses, and where the bars' type sits (the Powers-of-Ten label, its caption and legend, the threat count).
// Every time is an instant of the film (fractional during the sub-frames) and every position comes from the score's names, never a film
// frame. Plain Node loads this file (tests): no three / remotion / react imports.
import { CROWDS, GALAXY_STARS, HERO_FACES, PLANETS, REAM_FACES, SUN_FACE } from '../content/castCosmos.ts';
import { CLAPS, EAMES, HOOK, HOOK_TOPS, KICKS, OPEN_HATS, PASTE_FLARES, PULSES, SHOCK_RINGS, SLINGSHOT, cs } from '../score/cosmos.ts';

// ——— The prototype's curves (j1.js), exact ———————————————————————————————————————————————————————————————————————————————————————

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Cosine ease in-out over [0, 1] (j1 sF). */
export const sF = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
/** Cubic ease-out (j1 cO). */
export const cO = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
/** Cubic ease-in (j1 cI). */
export const cI = (t: number): number => clamp01(t) ** 3;
/** Launch (j1 L): starts on t = 0 at full speed, 75 % of the move in 3 f, a < 3 % rebound, settled by ≈ 12 f. 0 before. */
export const L = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-0.5625 * t) * (Math.cos(0.496 * t) + 1.134 * Math.sin(0.496 * t)));
/** Impact (j1 Im): accelerates into t = n (exactly 1 there), then a 2 % rebound over 6 f. 0 before t = 0. */
export const Im = (t: number, n: number): number => (t <= 0 ? 0 : t < n ? (t / n) ** 2.4 : 1 + 0.02 * Math.sin(Math.PI * clamp01((t - n) / 6)));
/** A decaying envelope: 1 on t = 0, (1 − t/n)² to 0 at n (j1 env). */
export const env = (t: number, n: number): number => (t < 0 || t >= n ? 0 : (1 - t / n) ** 2);
/** The latest of `list` at or before `f` (−1e9 when none). */
export const lastOf = (list: readonly number[], f: number): number => {
  let k = -1e9;
  for (const v of list) if (v <= f && v > k) k = v;
  return k;
};
/** The output frame an instant belongs to: drum-timed swaps land whole on their drum's frame (sheet §0). */
export const outFrame = (f: number): number => Math.floor(f + 0.5);
/** Keyframes [frame, value] linearly interpolated, held outside (j1 keys). */
export function keys(ks: readonly (readonly [number, number])[], t: number): number {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t < ks[i][0]) {
      const [a, va] = ks[i - 1];
      const [b, vb] = ks[i];
      return lerp(va, vb, (t - a) / (b - a));
    }
  }
  return ks[ks.length - 1][1];
}

// ——— This renderer's span ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** Renderer B draws cosmos 3.1 → 5.1 (COSMOS_PARTS 'B'). */
export const SPAN = { from: cs(3), to: cs(5) } as const;
const inSpan = (f: number): boolean => f >= SPAN.from - 24 && f < SPAN.to + 24;
const spanList = (xs: readonly number[]): number[] => xs.filter(inSpan);
const B_KICKS = spanList(KICKS);
const B_PULSES = spanList(PULSES);
const B_CLAPS = spanList(CLAPS);
const B_OPEN_HATS = spanList(OPEN_HATS);

// ——— The light grammar (design §3.1, sheet §4.7) ————————————————————————————————————————————————————————————————————————————————

/** The kick's PULSE on the SUBJECT: its emissive ×1.35 for 2 f from the kick's output frame, back to ×1 over the next 10 f. */
export function pulseAt(f: number): number {
  const k = lastOf(B_PULSES, outFrame(f) + 0.49);
  // The kick's own output frame shows it whole (its early sub-frames included).
  const t = Math.max(0, f - k);
  if (t < 0 || t >= 12) return 1;
  if (t < 2) return 1.35;
  return 1 + 0.35 * (1 - (t - 2) / 10) ** 2;
}
/** The kick's surge of the three layers (FG particles past the lens ×1.6, BG specks +20 %) over 8 f: 1 on the kick, 0 after. */
export function kickSurge(f: number): number {
  const k = lastOf(B_KICKS, f + 0.25);
  return env(f - k, 8);
}
/** The kick that last struck (output-frame quantised), for anything that steps on the beat. */
export const lastKick = (f: number): number => lastOf(B_KICKS, outFrame(f));

/**
 * A clap's guilloche SHOCK RING on these bars: its radius (px, 0 → 1300 in 10 f, launched), strength and ink, or null. The launch's first
 * full step lands on the clap's own frame (taken a frame early), so the ring is already out on the clap, not a frame after it.
 */
export function shockRingAt(f: number): { r: number; a: number; ink: 'pink' | 'cyan' | 'amber'; at: number } | null {
  for (const s of SHOCK_RINGS) {
    const t = f - s.at + 1;
    if (s.at < SPAN.from || s.at >= SPAN.to || t < 0.75 || t >= 12) continue;
    return { r: 1300 * Math.min(1, L(t * 0.9)), a: 1 - clamp01((t - 6) / 6), ink: s.ink, at: s.at };
  }
  return null;
}
/** The open hat's GLINTS: ✦ sparkles on light-catching particles, 6 f from the hat (1 on it, fading); 0 off a hat. */
export function glintAt(f: number): { a: number; at: number } {
  const h = lastOf(B_OPEN_HATS, f + 0.25);
  const t = f - h;
  return { a: t < 0 || t >= 6 ? 0 : Math.sin(Math.PI * clamp01((t + 0.5) / 6)), at: h };
}
/** The level downbeat's PASTE FLARE at `at` (a level of this renderer): the starburst's diameter (900 → 0 over 12 f) and the light's
 * strength (1 on the hit, gone by 12 f), or null. */
export function pasteFlareAt(f: number): { at: number; d: number; a: number; gain: number } | null {
  for (const p of PASTE_FLARES) {
    const t = f - p.at;
    if (p.at < SPAN.from || p.at >= SPAN.to || t < -0.25 || t >= 12) continue;
    const u = clamp01(t / 12);
    return { at: p.at, d: 900 * (1 - cO(u)), a: (1 - u) ** 1.5 * p.gain, gain: p.gain };
  }
  return null;
}
/**
 * The Eames square (four cream L marks, 3 px, 40 px arms) on a lock of this renderer: it closes in on him over 6 f (from 2.2× its size),
 * blinks twice (off on frames 8–9 and 12–13) and is gone by 18 f; null otherwise. `size` scales the box his subject gives.
 */
export function eamesAt(f: number): { at: number; scale: number; on: boolean } | null {
  for (const at of EAMES) {
    const t = outFrame(f) - at;
    if (at < SPAN.from || at >= SPAN.to || t < 0 || t >= 18) continue;
    return { at, scale: lerp(2.2, 1, cO((f - at) / 6)), on: !(t >= 8 && t < 10) && !(t >= 12 && t < 14) };
  }
  return null;
}
/**
 * The slingshot burst (RESERVED_FLASHES, 3.3) at output frame `frame`: its strength (1 on the kick's frame, (1 − t/10)² after) and how far
 * its rays reach (shares of their full length: 0.6 on the kick, full by + 3). An overlay keyed to whole output frames: under the
 * slingshot's 6-frame shutter anything drawn in the picture smears in from 3.3 − 3, so the burst is the one light that hits on the frame.
 */
export function slingBurstAt(frame: number): { a: number; reach: number } | null {
  // It fades over 16 f (its rays carry the light on into the exit, so no block dips between the burst and the rings of the slow-mo).
  const t = Math.round(frame) - SLINGSHOT;
  if (t < 0 || t >= 16) return null;
  return { a: env(t, 16), reach: 0.6 + 0.4 * clamp01(t / 3) };
}
/** Claps on these bars (beats 2 and 4). */
export const claps = (): readonly number[] => B_CLAPS;

// ——— The hook (whatever carries him bobs on note starts; a pose on long notes; (>ω<) on the bar's top) ——————————————————————————

/** His bob (px, up) on the hook's note starts: +6 over the note's first 4 f (j5 HN). */
export function hookBob(f: number): number {
  for (const n of HOOK) {
    const t = f - n.at;
    if (t >= 0 && t < 4) return 6 * Math.sin(Math.PI * (t / 4));
  }
  return 0;
}
/** His face at instant `f` on these bars: the top note's (>ω<) for its first 6 f, else (•ω•) — scenes add their own poses on top. */
export function heroFace(f: number): string {
  const o = outFrame(f);
  for (const top of HOOK_TOPS) if (o >= top && o < top + 6) return HERO_FACES.top;
  return HERO_FACES.face;
}

// ——— What renderer B draws (its atlases) —————————————————————————————————————————————————————————————————————————————————————————

/** Every face card of bars 3–4 (M PLUS Rounded 1c ExtraBold, whole faces): his forms, the planets, the Sun, the CME, the galaxy's stars. */
export const B_FACES: readonly string[] = [
  ...new Set([
    ...Object.values(HERO_FACES),
    ...PLANETS.flatMap((p) => [p.host, p.infected]),
    SUN_FACE,
    ...REAM_FACES,
    ...GALAXY_STARS.flatMap((g) => [g.host, g.infected ?? g.host]),
    ...CROWDS.galaxy.flatMap((c) => [c.host, c.infected]),
  ]),
];
/** The planets' names on their rings (Inter Tight Black, whole words). */
export const B_WORDS: readonly string[] = PLANETS.map((p) => p.name);
