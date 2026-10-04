// S31X THE MIRROR TRAP, drop2 16.1–18.1 − 1, layer 5/5 `mirror.trap` (builder act2b; build sheet notes/bid2/drop2-sheet2.md §3 bars
// 16–17, §4.13, §5 #21–#23; the design notes/extend/drop2-final.md §4.13, its frames − 3264 = local). Pure: Node tests import it.
//
// The picture is three layers (src/scenes/drop2Kaleido.ts draws them in this order):
//   1. THE CHAMBER, a "source sheet" rendered to its own target: the worlds of act 2 as concentric bands born behind his face and flowing
//      outward (r = 260·2^(phase), one beat apart: PICTOGRAMS, MEMPHIS, VOXEL, WAVE, BLUEPRINT, then the cycle again), his small amber
//      copies on the wedge's bisector, Defender's reticles locking onto them, tumbling crystal shards that flare on the kicks, the clamp's
//      red chevron, its cracks and its shards. Everything is drawn as a fan out of the target's bottom-left corner along its diagonal
//      (CHAMBER), so the mirrors' wedge always lies inside the sheet out to r ≈ 1650 and the bands keep their place at every radius.
//   2. THE FOLD: post/kaleidoscope.ts run on the chamber with post/effectQuad.ts (N mirror pairs from MIRRORS, snapped on the beat with
//      a 3-frame impact; the spin; the whip's travelling centre).
//   2b. THE ∞ WALLPAPER (17.2 → 17.3): the whole picture so far — the mandala with him and his eyepiece in it — tiled in hex cells that
//      shrink 1080 → 270 px (TILE_FRAG), so every cell is him, and he stays in front at full size: ∞ copies, ∞ threats.
//   3. ON TOP, UNMIRRORED: his face (520 px, amber, 6 px #111 outline, breathing), the brass eyepiece ring with the ten bytes, the light's
//      veil, the burst's amber shockwave, `[DEFENDER] giving up ╮(￣ω￣;)╭` on its white pill (its own pass, over the ring's bytes), the
//      reticle that flies off (the guest's hat),
//      and in the whip the NEON card of the reel sliding in with his tube dress (the reel's first frame is the kept S32: Drop2Overload).
//
// Coordinates: the flat world (origin at the frame's centre, x right, y up, 1 unit = 1 px at 1080p). Angles in the chamber are the fold's:
// from 12 o'clock, counter-clockwise (post/kaleidoMath.ts).
import { GUEST_VARIANTS } from '../content/castDrop2.ts';
import { HERO2, SIGNATURE } from '../content/drop2.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { KaleidoLook } from '../engine/post/kaleidoMath.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Segment, type Temporal, struck } from '../engine/temporal.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { type Look, mixLook } from '../engine/types.ts';
import {
  BUILD_SNARES2,
  CLAMP,
  GIVING_UP,
  HAT_FLIGHT,
  KALEIDO_RINGS,
  KICKS2,
  LIGHT,
  MIRRORS,
  REEL,
  RETICLES_IN,
  ROSETTE_INFECTED,
  TARGET_LOCKS,
  WALLPAPER,
  WHIP_REEL,
} from '../score/drop2.ts';
import { FRAMES_PER_BEAT } from '../score/tempo.ts';
import { LAW, PALETTES, RETICLE_HAT, drop2Segment, flow, impact, springL } from './drop2Shared.ts';
import { NEON_ARCS, RUNNER, overloadLook } from './drop2Overload.ts';

type V2 = readonly [number, number];
const BEAT = FRAMES_PER_BEAT;
const TAU = 2 * Math.PI;

/** The part's span: the light on 16.1 to the reel's downbeat (exclusive). */
export const KAL = { from: LIGHT.from, to: REEL.from } as const;

// ——— The layout only the browser can measure ————————————————————————————————————————————————————————————————————————————————

/** A string's ink at 1 em: left / right of its start, up / down from the middle line (ems). */
export type InkBox = { left: number; right: number; up: number; down: number };
export type KaleidoFont = 'rounded' | 'jp' | 'display';
export type KaleidoLayout = { advance: Readonly<Record<KaleidoFont, Advance>>; ink: ReadonlyMap<string, InkBox> };
export const inkKey = (font: KaleidoFont, text: string): string => `${font}|${text}`;

/** The give-up line (READOUT2's big line on 17.4) and the avatar inside it. */
export const GIVING_UP_LINE = `[DEFENDER] giving up ${GUEST_VARIANTS[2].face}`;
/** Every string the part draws, by atlas (src/content/drop2.ts lists each with this role: tests/drop2Kaleido.test.ts checks it). */
export const KALEIDO_STRINGS: Readonly<Record<KaleidoFont, readonly string[]>> = {
  rounded: [HERO2.base, ...HERO2.brows],
  jp: ['つ'],
  display: [GIVING_UP_LINE, ...SIGNATURE.brass],
};
/** Faces drawn as one glyph each (his copies, the wave's rows): whole-string atlas entries. */
export const KALEIDO_WHOLE: readonly string[] = [HERO2.base];
/** The strings placed by their ink (the scene measures them). */
export const KALEIDO_INK: readonly [KaleidoFont, string][] = [['rounded', HERO2.base]];

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The mirrors' count on the instant `f`: MIRRORS, each change an impact over 3 frames that lands on its beat (I: never a strobe). */
export function facetsAt(f: number): number {
  let n = MIRRORS[0].n;
  for (const m of MIRRORS) {
    if (f >= m.at) n = m.n;
    else if (f > m.at - 3) return lerp(n, m.n, impact(f, m.at, 3));
  }
  return n;
}
/** Whether the wallpaper (hex tiles) is on (from its 16th-long pull-back into 17.2 until the clamp). */
const hexAt = (f: number): boolean => f >= WALLPAPER.from - WALLPAPER_IN && !struck(CLAMP.from, f);
/** The wallpaper's pull-back into 17.2 (frames: a 16th, landing on the kick). */
const WALLPAPER_IN = 6;

/**
 * Bar 17's ratchet (review R10, 2026-10-02): the build's hits from 17.1 to the clamp (BUILD_SNARES2: the 8ths, then the 16ths of 17.2&),
 * where the mandala's motion lands. Between two hits the pattern's time runs at ⅓ speed; it makes up the rest in the 2 frames into the next
 * hit (I, cubic: the biggest step is the hit's own frame). The flow outward and the wallpaper's zoom-out ride it, so the roll reads as
 * accents instead of a wash (bar 17 was the busiest bar of the drop, 2–3× any other, and its snares read 'none' in check-sync).
 */
export const RATCHET_HITS: readonly number[] = [...new Set(BUILD_SNARES2.filter((h) => h >= MIRRORS[4].at && h <= CLAMP.from))];
const CATCH_UP = 2;
/** The spin's idle between the hits (× its rate); the wallpaper's zoom idles at WALL_IDLE (the flow and the chamber's life at ⅓). */
const SPIN_IDLE = 0.1;
const WALL_IDLE = 0.15;
export function ratchet(f: number, idle = 1 / 3): number {
  const H = RATCHET_HITS;
  if (f <= H[0] || f >= H[H.length - 1]) return f;
  let i = 0;
  while (f >= H[i + 1]) i++;
  const [a, b] = [H[i], H[i + 1]];
  const c = Math.min(CATCH_UP, (b - a) / 2);
  if (f <= b - c) return a + (f - a) * idle;
  const w0 = a + (b - c - a) * idle;
  return w0 + (b - w0) * ((f - (b - c)) / c) ** 3;
}
/** The chamber's life clock: bar 17's ratchet, stopped under the clamp (17.3 → 17.4: nothing but its notches moves), running again on the burst. */
export function chamberClock(f: number): number {
  if (f < CLAMP.from) return ratchet(f);
  return f < GIVING_UP ? CLAMP.from : f - (GIVING_UP - CLAMP.from);
}
/**
 * The spin's pulse in bar 17 (×, on the base rate): a tenth off the hits, surging over the 2 frames into each hit (capped by spinAt's
 * 0.5 rev/s guard) — the turn of a fine radial pattern is what fills every pixel with change, so between the hits it all but stops (at ⅓
 * the bar still measured ≈ 22/255 a frame between its snares). Outside the ratchet's span, 1.
 */
function spinPulse(t: number): number {
  const H = RATCHET_HITS;
  if (t < H[0] - CATCH_UP || t >= H[H.length - 1] + 1) return 1;
  let k = 0;
  for (const h of H) if (t <= h) k = Math.max(k, clamp(1 - (h - t) / CATCH_UP));
  return SPIN_IDLE + 2.6 * k;
}

/**
 * How far the bands have flowed (in doublings of their radius): one doubling every two beats through bar 16, every beat in bar 17's build,
 * stopped by the clamp (17.3) and resumed at 3× by the burst (17.4).
 */
export function flowPhase(f: number): number {
  return flowLinear(ratchet(f));
}
/** The flow on a steady clock (flowPhase runs it on bar 17's ratchet). */
function flowLinear(f: number): number {
  const keys: readonly [number, number][] = [
    [KAL.from - 48, 1 / 48],
    [MIRRORS[4].at, 1 / 24],
    [CLAMP.from, 0],
    [GIVING_UP, 3 / 24],
  ];
  let p = 0;
  for (let i = 0; i < keys.length; i++) {
    const [a, rate] = keys[i];
    const b = i + 1 < keys.length ? keys[i + 1][0] : Infinity;
    if (f <= a) break;
    p += (Math.min(f, b) - a) * rate;
  }
  return p;
}
/** Where a band is born (its inner edge on its birth beat), px. */
export const BIRTH_RADIUS = 260;
/**
 * The bands: KALEIDO_RINGS (the design's five), then the cycle again on every beat until the clamp; none while the clamp holds the flow;
 * from the burst one a 16th (the flow at 3×: each 2^0.75 wider than the next), so the unfold and the whip always have worlds to show —
 * BURST_WORLDS, the colour coming back with Memphis and darkening into the reel (R10: the light pictograms' band was born on 17.4a and
 * the two-mirror unfold showed it as a light blob on the right through the whip, a flash pair on 17.4 + 19 / + 21 in the 3 × 3 test).
 */
export const BURST_WORLDS: readonly World[] = ['memphis', 'voxel', 'blueprint', 'wave'];
export type World = (typeof KALEIDO_RINGS)[number]['world'];
const LAST_RING = KALEIDO_RINGS[KALEIDO_RINGS.length - 1].at;
export const BANDS: readonly { at: number; world: World }[] = [
  ...KALEIDO_RINGS,
  ...Array.from({ length: (CLAMP.from - LAST_RING) / BEAT - 1 }, (_, i) => ({ at: LAST_RING + (i + 1) * BEAT, world: KALEIDO_RINGS[i % KALEIDO_RINGS.length].world })),
  ...Array.from({ length: (REEL.from - GIVING_UP) / 6 }, (_, i) => ({ at: GIVING_UP + 6 * i, world: BURST_WORLDS[i % BURST_WORLDS.length] })),
];
/** A band's inner radius at `f` (px in the chamber, before the wallpaper's scale). */
export const bandRadius = (born: number, f: number): number => BIRTH_RADIUS * 2 ** (flowPhase(f) - flowPhase(born));

/** The photosensitivity guard on the mandala's spin (rev/s). */
export const SPIN_GUARD = 0.5;
/**
 * The spin of the finished mandala, radians: 0.15 rev/s through bar 16 (its inner ring seems to counter-rotate against the flow), easing to
 * 0.3 rev/s from 16.4& (the build), slowed to a strain under the clamp, flung at 0.45 rev/s by the burst and settling (≤ 0.5 rev/s, the
 * photosensitivity guard).
 */
export function spinAt(f: number): number {
  const rate = (t: number): number => {
    const base = t < KAL.from + 84 ? 0.15 : t < MIRRORS[4].at + 12 ? lerp(0.15, 0.3, (t - (KAL.from + 84)) / 36) : t < CLAMP.from ? 0.3 : t < GIVING_UP ? 0.04 : lerp(0.45, 0.2, clamp((t - GIVING_UP) / 24));
    // Bar 17's build: ⅓ speed between the hits, a surge into each (R10), never over the guard.
    const rev = t >= RATCHET_HITS[0] - CATCH_UP && t < CLAMP.from ? Math.min(SPIN_GUARD, base * spinPulse(t)) : base;
    return (rev * TAU) / 60;
  };
  // Midpoint rule on whole frames, then the fraction of the last one (pure, the same at any sub-frame).
  let s = 0;
  const end = Math.max(KAL.from, f);
  let t = KAL.from;
  for (; t + 1 <= end; t++) s += rate(t + 0.5);
  return s + (end - t) * rate(t + (end - t) / 2);
}

// ——— The chamber's geometry ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The chamber's origin (the fold's `source`): just inside the sheet's bottom-left corner; its axis runs up the diagonal. */
export const CHAMBER = { origin: [-960 + 6, -540 + 6] as V2, axis: Math.atan2(-(1920 - 12), 1080 - 12) } as const;
const dir = (b: number): [number, number] => [-Math.sin(b), Math.cos(b)];
/** The chamber point at radius `rho` and fold angle `b`. */
export const chamberPoint = (rho: number, b: number): [number, number] => {
  const d = dir(b);
  return [CHAMBER.origin[0] + rho * d[0], CHAMBER.origin[1] + rho * d[1]];
};
/** A fold angle's on-sheet rotation for a shape drawn along it (rot is CCW from +x; the radial direction of angle b is b + π/2). */
const radialRot = (b: number): number => b + Math.PI / 2;

/** The wedge's start (the fold's `turn`): centred on the chamber's axis, with a slow shimmer of the slice under the mirrors. */
export function turnAt(f: number): number {
  const n = facetsAt(f);
  return CHAMBER.axis - Math.PI / (2 * n) + 0.025 * Math.sin((TAU * (f - KAL.from)) / 96);
}
/** The wedge's bisector (where his copies and the reticles sit, so each is its own mirror image). */
export const bisectorAt = (f: number): number => turnAt(f) + Math.PI / (2 * facetsAt(f));

/**
 * The ∞ wallpaper (17.2 → 17.3): the hex cell (1080p px between centres) and the scale every cell shows the picture at; the lattice collapses
 * back into one mandala as the clamps pull in, landing on 17.3 (I). Null outside it. A continuous zoom-out (§5 #22; R10, 2026-10-02): at the
 * open cell the scale is 1 (the tiling is the picture itself), and the reach each cell shows shrinks with the cell from the whole mandala
 * (± 1200 px) to its heart (± 540: him in his eyepiece) at the smallest cell — so the copies first carry the navy mandala and only turn into
 * the light tiles of his face as they multiply (it used to crop to his eyepiece and its light ring on the kick: a navy → light-blue swap).
 */
export function wallpaperAt(f: number): { cell: number; scale: number } | null {
  if (!hexAt(f)) return null;
  const cell = wallpaperCell(f);
  return { cell, scale: wallpaperScale(cell) };
}
/** A hex cell wider than the frame: the tiling is the radial mandala itself (N = 30 is hex-safe), so it switches on and off unseen. */
const OPEN_CELL = 2400;
/** The smallest wallpaper cell (the photosensitivity guard's 270 px). */
export const MIN_CELL = 270;
/** The reach (picture px from the centre) a cell shows: the whole mandala at the open cell, his eyepiece's heart at the smallest. */
const REACH = { open: OPEN_CELL / 2, min: 540 } as const;
/** The scale a cell of `cell` px shows the picture at (1 at the open cell; the reach eased in log size between the two). */
export function wallpaperScale(cell: number): number {
  const t = clamp(Math.log(cell / MIN_CELL) / Math.log(OPEN_CELL / MIN_CELL));
  const reach = REACH.min * (REACH.open / REACH.min) ** t;
  return Math.min(1, cell / (2 * reach));
}
/**
 * The wallpaper's cell: open → 1080 over the 16th into 17.2 (I), 1080 → 270 on the ratchet (it multiplies on 17.2& and 17.2a, idling
 * between), held to the clamp, which collapses the lattice into one mandala on its own instant (hexAt): the collapse and the clamp are one
 * slam on 17.3 (R10: the collapse used to smear 6 frames of light ahead of it, two bursts on 17.3 − 2 and 17.3).
 */
function wallpaperCell(f: number): number {
  if (f < WALLPAPER.from) return lerp(OPEN_CELL, 1080, impact(f, WALLPAPER.from, WALLPAPER_IN));
  return 1080 * (MIN_CELL / 1080) ** clamp((ratchet(f, WALL_IDLE) - WALLPAPER.from) / (SHRUNK - WALLPAPER.from));
}
/** The last hit before the clamp: the cells are at their smallest there. */
const SHRUNK = RATCHET_HITS.filter((h) => h < CLAMP.from).slice(-1)[0];

/**
 * The wallpaper's pass (src/scenes/drop2Kaleido.ts runs it on the finished picture): each pixel finds its hex cell (the fold's own lattice,
 * post/kaleidoMath.ts kaleidoLocal) and shows the picture's centre at `scale` there, mirror-repeated past its edges; a brass line rims each
 * cell (an eyepiece per copy). The CPU reference is tileSource.
 */
export const TILE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 resolution;
uniform float cell;
uniform float scale;
uniform vec3 rimColor;
uniform float rimAlpha;
varying vec2 vUv;
const float SQRT3 = 1.7320508075688772;
void main() {
  float k = resolution.y / 1080.0;
  vec2 P = (vUv - 0.5) * resolution / k;
  vec2 s = vec2(cell, cell * SQRT3);
  vec2 a = mod(P, s) - 0.5 * s;
  vec2 b = mod(P - 0.5 * s, s) - 0.5 * s;
  vec2 l = dot(a, a) < dot(b, b) ? a : b;
  float reach = max(abs(l.x), max(abs(0.5 * l.x + 0.5 * SQRT3 * l.y), abs(-0.5 * l.x + 0.5 * SQRT3 * l.y)));
  vec2 src = l / scale;
  vec2 suv = 1.0 - abs(mod(src * k / resolution + 0.5, 2.0) - 1.0);
  vec3 col = texture2D(map, suv).rgb;
  float edge = (0.5 * cell - reach) * k;
  float line = clamp(3.0 * k - edge + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(col, rimColor, rimAlpha * line), 1.0);
}`;
/** Where the wallpaper's pixel P (1080p px from the frame's centre, y up) samples the picture (same units), as TILE_FRAG does. */
export function tileSource(P: V2, cell: number, scale: number): [number, number] {
  const fmod = (x: number, y: number): number => x - y * Math.floor(x / y);
  const s: V2 = [cell, cell * Math.sqrt(3)];
  const a: V2 = [fmod(P[0], s[0]) - s[0] / 2, fmod(P[1], s[1]) - s[1] / 2];
  const b: V2 = [fmod(P[0] - s[0] / 2, s[0]) - s[0] / 2, fmod(P[1] - s[1] / 2, s[1]) - s[1] / 2];
  const l = a[0] * a[0] + a[1] * a[1] < b[0] * b[0] + b[1] * b[1] ? a : b;
  return [l[0] / scale, l[1] / scale];
}

// ——— The whip into the reel (17.4& → 18.1) ————————————————————————————————————————————————————————————————————————————————————

/** How far the camera has whip-panned left (px), I: cubic, 0 on 17.4&, its full length and its fastest on the reel's downbeat. */
export const WHIP_LENGTH = 2900;
export const whipPan = (f: number): number => (f <= WHIP_REEL.from ? 0 : WHIP_LENGTH * clamp((f - WHIP_REEL.from) / (WHIP_REEL.to - WHIP_REEL.from)) ** 3);

/** The fold at instant `f`: the KaleidoLook the scene runs on the chamber (amount 1 through the part). */
export function foldAt(f: number): KaleidoLook {
  return {
    amount: 1,
    facets: facetsAt(f),
    spin: spinAt(f),
    turn: turnAt(f),
    zoom: 1,
    centre: [whipPan(f), 0],
    source: CHAMBER.origin,
    seam: { width: 2, color: [1, 1, 1], alpha: 0.3 * (1 - lightVeil(f)) },
  };
}

// ——— The light (16.1) and the colour ————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The light from the tube's end: 1 on 16.1 and the frame after (the film's brightest frames: the chamber white, nothing on it), then it
 * falls as the mandala crystallises outward (16.1 + 2 → + 12) and is gone by + 16.
 */
export function lightVeil(f: number): number {
  if (f < KAL.from) return 1;
  if (f < LIGHT.from + 2) return 1;
  return 1 - flow(clamp((f - (LIGHT.from + 2)) / 14));
}
/** The crystallisation front (chamber px): the bands appear from his face outward over 16.1 + 2 → + 12. */
export const crystalFront = (f: number): number => (f < LIGHT.from + 2 ? 0 : lerp(BIRTH_RADIUS * 0.9, 1800, flow(clamp((f - (LIGHT.from + 2)) / 10))));

/** How grey the chamber is (0–1): the clamp drains half the colour from everything but him and the red star; the burst gives it back. */
export function desaturation(f: number): number {
  // On the clamp's instant, all at once (half a shutter early, as the slam: one burst with the collapse, R10).
  if (!struck(CLAMP.from, f)) return 0;
  if (f < GIVING_UP) return 0.5;
  return 0.5 * (1 - flow(clamp((f - GIVING_UP) / 6)));
}
const luma = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const grey = (c: RGB, d: number): RGB => (d <= 0 ? c : mixRGB(c, [luma(c), luma(c), luma(c)], d));
/** The whip's darkening: the mandala dims toward the reel's NEON ground as the dark slides over it. */
// Eased deeper toward the end (R10: at 0.55 the unfold's last two-mirror blur still blinked ± 0.12 in the strict 6 × 6 test on 17.4 + 17…21).
const whipDim = (f: number): number => 1 - 0.9 * flow(clamp((f - WHIP_REEL.from) / (WHIP_REEL.to - WHIP_REEL.from)));

// ——— The worlds' bands ———————————————————————————————————————————————————————————————————————————————————————————————————————

const P = PALETTES;
const lin = (hex: string, k = 1): RGB => linear(hex, k);
const WHITE: RGB = [1, 1, 1];
const INK = lin('#111111');
const AMBER = lin(LAW.hero);
const RED = lin(LAW.defender.emissive);
/** Each world's band: its ground (two alternating row tones) and its inks, graded so a band's passage is a change of hue, not a flash. */
const BAND_INK: Readonly<Record<World, { ground: readonly [RGB, RGB]; inks: readonly RGB[] }>> = {
  picto: { ground: [lin(P.picto.ground, 0.92), lin(P.picto.ground, 0.8)], inks: [lin(P.picto.green), lin(P.picto.deep), lin(P.picto.blue), lin(P.picto.silver), WHITE] },
  memphis: { ground: [lin(P.memphis.turquoise, 0.92), lin(P.memphis.cobalt)], inks: [INK, lin(P.memphis.magenta), lin(P.memphis.lemon), WHITE, lin(P.memphis.mint)] },
  voxel: { ground: [lin('#182044'), lin('#0E1430')], inks: [lin(P.arcade.sprite), lin(P.voxel.stroke), lin(P.arcade.green), lin(P.voxel.ghost)] },
  wave: { ground: [lin(P.ukiyoe.prussian), lin(P.ukiyoe.deep)], inks: [lin(P.ukiyoe.foam), lin(P.ukiyoe.rows), lin(P.ukiyoe.pale), lin(P.ukiyoe.light)] },
  blueprint: { ground: [lin(P.pov.cyan1), lin(P.pov.cyan0)], inks: [lin(P.pov.line), lin(P.pov.line, 0.6)] },
};
/** Act 1's fragments, riding the outer bands from 16.4 (terminal green, Riso pink and blue, Swiss black, LED pink — never amber). */
const FRAGMENTS: readonly RGB[] = [lin(P.terminal.green), lin(P.riso.pink), lin(P.riso.blue), INK, lin(LAW.program)];
const FRAGMENTS_FROM = KALEIDO_RINGS[3].at;

/** A motif's angular size in a band (radians): rows are this much apart in log radius, so the tiling is conformal (it scales as it flows). */
const ALPHA = 0.2;

type Sink = { back: Shape[]; glyphs: { rounded: Glyph[]; jp: Glyph[] }; light: Shape[] };

/**
 * Draws one piece of `world`'s "glass" at chamber radius `rho`, angle `b`, `s` px across, turned `turn` off the radial (`id` a stable
 * seed; `t` the instant, for its life; `d` the desaturation; `dim` the whip's dimming). Pieces lie obliquely and straddle the mirrors, so
 * the fold makes petals and chevrons of them (a band of radial-aligned motifs would already be symmetric: the mirrors would not show).
 */
function motif(out: Sink, world: World, rho: number, b: number, s: number, turn: number, id: number, t: number, d: number, dim: number): void {
  const [x, y] = chamberPoint(rho, b);
  const rot = radialRot(b) + turn;
  const h = (k: number) => hash(id, k);
  const ink = (c: RGB) => scaleRGB(grey(c, d), dim);
  const inks = BAND_INK[world].inks;
  const [c, sn] = [Math.cos(rot), Math.sin(rot)];
  const at = (ox: number, oy: number): [number, number] => [x + ox * c - oy * sn, y + ox * sn + oy * c];
  const stroke = (ox: number, oy: number, ang: number, len: number, w: number, color: RGB, alpha = 1) => {
    const a = rot + ang;
    const [px, py] = at(ox, oy);
    out.back.push({ kind: 'segment', x: px + (Math.cos(a) * len) / 2, y: py + (Math.sin(a) * len) / 2, w: len + w, h: w, rot: a, color, alpha });
  };
  switch (world) {
    case 'picto': {
      const kind = Math.floor(h(2) * 4);
      if (kind === 0) {
        // An Aicher tile with a white runner on it: head disc, five limbs on 45° steps, striding on the 8ths.
        out.back.push({ kind: 'rect', x, y, w: s, h: s, r: s * 0.08, rot, color: ink(inks[Math.floor(h(3) * 4)]) });
        const k = 0.3 * s;
        const step = Math.floor((t - KAL.from) / 12 + h(4) * 2) % 2 === 0 ? 1 : -1;
        const [hx, hy] = at(0.12 * k, 0.95 * k);
        out.back.push({ kind: 'ellipse', x: hx, y: hy, w: 0.42 * k, h: 0.42 * k, color: ink(WHITE) });
        const w = 0.24 * k;
        stroke(0, 0.55 * k, -Math.PI / 2 - 0.25, 1.1 * k, w, ink(WHITE));
        for (const sg of [1, -1]) {
          stroke(0, 0.5 * k, -Math.PI / 2 + (sg * step * Math.PI) / 4, 0.7 * k, w, ink(WHITE));
          stroke(0, -0.55 * k, -Math.PI / 2 + (sg * step * Math.PI) / 4, 0.8 * k, w, ink(WHITE));
        }
      } else if (kind === 1) {
        // The construction grid: three white lines on 45° steps.
        for (let i = 0; i < 3; i++) stroke(-0.6 * s, (i - 1) * 0.3 * s, (Math.PI / 4) * Math.floor(h(5 + i) * 4), 1.2 * s, 3, ink(WHITE), 0.7);
      } else out.back.push({ kind: 'rect', x, y, w: s * 0.7, h: s * 0.36, r: s * 0.18, rot, color: ink(inks[kind === 2 ? 4 : Math.floor(h(3) * 4)]), alpha: 0.9 });
      return;
    }
    case 'memphis': {
      const kind = Math.floor(h(2) * 6);
      if (kind === 0) out.glyphs.rounded.push({ ch: 'ω', x, y, size: s * 1.1, rot, color: ink(INK) });
      else if (kind === 1) out.back.push({ kind: 'rect', x, y, w: s * 0.62, h: s * 0.62, rot: rot + Math.PI / 4, color: ink(lin(P.memphis.magenta)), outline: s * 0.06, outlineColor: ink(INK) });
      else if (kind === 2) out.back.push({ kind: 'ellipse', x, y, w: s * 0.66, h: s * 0.66, color: ink(lin(P.memphis.lemon)), outline: s * 0.06, outlineColor: ink(INK) });
      else if (kind === 3) {
        const q = s * 0.24;
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            const [px, py] = at((i - 1) * q, (j - 1) * q);
            out.back.push({ kind: 'rect', x: px, y: py, w: q, h: q, rot, color: ink((i + j) % 2 ? INK : WHITE) });
          }
      } else if (kind === 4) {
        // A zigzag: four strokes at ±45°.
        for (let i = 0; i < 4; i++) stroke((i - 2) * 0.22 * s, i % 2 ? 0.1 * s : -0.1 * s, i % 2 ? -Math.PI / 4 : Math.PI / 4, 0.3 * s, 0.07 * s, ink(INK));
      } else out.back.push({ kind: 'ring', x, y, w: s * 0.75, h: s * 0.75, r: s * 0.15, color: ink(h(6) < 0.5 ? lin(P.memphis.cobalt) : WHITE) });
      return;
    }
    case 'voxel': {
      // A sprite of pixels (white or cyan; now and then one of Defender's red garbage cells with an amber notch).
      const q = s * 0.19;
      const bits = Math.floor(h(2) * 512) | 0b010101010;
      const red = h(3) < 0.12;
      const col = ink(red ? lin(LAW.defender.print) : h(3) < 0.62 ? inks[0] : inks[1]);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          if (bits & (1 << (i * 3 + j))) {
            const [px, py] = at((i - 1) * q * 1.12, (j - 1) * q * 1.12);
            out.back.push({ kind: 'rect', x: px, y: py, w: q, h: q, rot, color: col });
          }
      if (red) out.back.push({ kind: 'ellipse', x, y, w: q * 0.7, h: q * 0.7, color: ink(AMBER) });
      return;
    }
    case 'wave': {
      const kind = Math.floor(h(2) * 4);
      if (kind === 0) {
        out.back.push({ kind: 'ring', x, y, w: s * 0.9, h: s * 0.9, r: s * 0.1, color: ink(inks[0]) });
        const [ex, ey] = at(s * 0.14, s * 0.1);
        out.back.push({ kind: 'ellipse', x: ex, y: ey, w: s * 0.24, h: s * 0.24, color: ink(inks[0]) });
      } else if (kind === 1) {
        // A row of tiny infected faces riding the water.
        for (let i = -1; i <= 1; i++) {
          const [px, py] = at(i * 0.36 * s, 0);
          out.glyphs.rounded.push({ ch: HERO2.base, x: px, y: py, size: s * 0.13, rot, color: ink(inks[1]) });
        }
      } else if (kind === 2) out.glyphs.jp.push({ ch: 'つ', x, y, size: s * 0.8, rot, color: ink(inks[0]) });
      else stroke(-0.5 * s, 0, 0.3, s, 0.16 * s, ink(inks[2]), 0.85);
      return;
    }
    case 'blueprint': {
      const kind = Math.floor(h(2) * 3);
      if (kind === 0) out.back.push({ kind: 'ring', x, y, w: s * 0.9, h: s * 0.9, r: 2.5, color: ink(inks[0]), alpha: 0.75 });
      else if (kind === 1) {
        stroke(-0.5 * s, 0, 0, s, 2.5, ink(inks[0]), 0.7);
        for (const e of [-0.5, 0.5]) stroke(e * s - 0.06 * s, -0.06 * s, Math.PI / 4, 0.17 * s, 2.5, ink(inks[0]), 0.7);
      } else {
        stroke(-0.45 * s, 0, 0, 0.9 * s, 2, ink(inks[0]), 0.6);
        stroke(0, -0.45 * s, Math.PI / 2, 0.9 * s, 2, ink(inks[0]), 0.6);
        out.back.push({ kind: 'ring', x, y, w: s * 0.36, h: s * 0.36, r: 2, color: ink(inks[0]), alpha: 0.6 });
      }
      return;
    }
  }
}

/**
 * One band of `world` between radii `a` and `b` (chamber px): its rows (eccentric discs, outer first, so their edges cross the wedge
 * obliquely and the mirrors fold them into stars), then its glass — scattered, turned, of mixed sizes, only inside the angular window
 * `[w0, w1]` the mirrors see — and act 1's fragments in the outer bands from 16.4.
 */
function band(out: Sink, world: World, id: number, a: number, b: number, w0: number, w1: number, t: number, d: number, dim: number, front: number): void {
  const ground = BAND_INK[world].ground;
  const q = 1 + ALPHA;
  const rows = Math.max(1, Math.ceil(Math.log(b / a) / Math.log(q) - 1e-9));
  const perp = dir(CHAMBER.axis + Math.PI / 2);
  for (let j = rows - 1; j >= 0; j--) {
    const r0 = a * q ** j;
    const r1 = Math.min(b, r0 * q);
    if (r0 > front) continue;
    const R = Math.min(r1, front);
    const ecc = 0.16 * r0 * Math.sin(id * 1.7 + j * 2.3 + (t - KAL.from) / 40);
    out.back.push({ kind: 'ellipse', x: CHAMBER.origin[0] + ecc * perp[0], y: CHAMBER.origin[1] + ecc * perp[1], w: 2 * R, h: 2 * R, color: scaleRGB(grey(ground[j % 2], d), dim) });
  }
  for (let j = 0; j < rows; j++) {
    const r0 = a * q ** j;
    const r1 = Math.min(b, r0 * q);
    const rho0 = Math.sqrt(r0 * r1);
    if (rho0 > front) break;
    const k0 = Math.floor((w0 - CHAMBER.axis) / ALPHA) - 1;
    const k1 = Math.ceil((w1 - CHAMBER.axis) / ALPHA) + 1;
    for (let k = k0; k <= k1; k++) {
      for (let m = 0; m < 2; m++) {
        const key = id * 7919 + j * 131 + k * 7 + m;
        if (m === 1 && hash(key, 11) < 0.45) continue;
        const rho = rho0 * q ** (0.6 * (hash(key, 12) - 0.5));
        if (rho > front) continue;
        const bk = CHAMBER.axis + (k + hash(key, 13)) * ALPHA;
        const s = rho * ALPHA * lerp(0.6, 1.35, hash(key, 14));
        motif(out, world, rho, bk, s, (hash(key, 15) - 0.5) * 2.4, key, t, d, dim);
      }
      if (t >= FRAGMENTS_FROM && hash(id, j, k, 99) < 0.22) {
        const [fx, fy] = chamberPoint(rho0 * q ** 0.4, CHAMBER.axis + (k + hash(id, j, k, 97)) * ALPHA);
        const s = rho0 * ALPHA * 0.22;
        out.back.push({ kind: 'rect', x: fx, y: fy, w: s, h: s * (hash(id, j, k, 96) < 0.5 ? 1 : 0.3), rot: hash(id, j, k, 95) * TAU, color: scaleRGB(grey(FRAGMENTS[Math.floor(hash(id, j, k, 98) * FRAGMENTS.length)], d), dim) });
      }
    }
  }
}

// ——— His copies, Defender's reticles, the shards, the star ——————————————————————————————————————————————————————————————————

/** His amber copies on the bisector (one a wedge: the mirrors make N of them): radii (px) and when each row appears. */
export const COPY_ROWS: readonly { rho: number; from: number }[] = [
  { rho: 430, from: KAL.from },
  { rho: 640, from: TARGET_LOCKS[1] },
  { rho: 860, from: TARGET_LOCKS[2] },
];
/** A copy's size (px, its ink width): as wide as the wedge allows at its radius, so more mirrors make smaller copies. */
export const copyWidth = (rho: number, n: number): number => Math.min(150, 0.86 * rho * (Math.PI / n));

/** The reticle: ring, four crosshair ticks, four corner brackets (design §4.15: the hat is this at 30 %). Ø 140 at full size. */
function reticle(out: Shape[], cx: number, cy: number, size: number, rot: number, color: RGB, alpha = 1, ringOn = 1): void {
  if (size <= 0.5) return;
  const k = size / 140;
  const stroke = Math.max(2, 4 * k);
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  const p = (x: number, y: number): [number, number] => [cx + x * c - y * s, cy + x * s + y * c];
  if (ringOn > 0) out.push({ kind: 'ring', x: cx, y: cy, w: 2 * 27 * k * 1.6, h: 2 * 27 * k * 1.6, r: stroke, color, alpha: alpha * ringOn });
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const [x, y] = p(Math.cos(a) * 30 * k, Math.sin(a) * 30 * k);
    out.push({ kind: 'segment', x, y, w: 26 * k, h: stroke, rot: rot + a, color, alpha });
  }
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) {
    const [x0, y0] = [sx * 75 * k, sy * 55 * k];
    const [ax, ay] = p(x0 - (sx * 36 * k) / 2, y0);
    const [bx, by] = p(x0, y0 - (sy * 36 * k) / 2);
    out.push({ kind: 'segment', x: ax, y: ay, w: 36 * k, h: stroke, rot, color, alpha });
    out.push({ kind: 'segment', x: bx, y: by, w: 36 * k, h: stroke, rot: rot + Math.PI / 2, color, alpha });
  }
}

/** How locked a reticle row is: slides in on 16.2& from up the diagonal (L), locks on its copy by 16.3; the later rows snap in (S) on their 16th. */
function reticleState(row: number, f: number): { on: number; slide: number } {
  const at = row === 0 ? RETICLES_IN : COPY_ROWS[row].from;
  if (f < at - 1) return { on: 0, slide: 1 };
  if (row === 0) return { on: 1, slide: 1 - springL(f, at) };
  return { on: clamp((f - at + 1) / 3), slide: 0 };
}

/** The clamp's chevron (a wedge's share of the 30-point star): its tip on the first mirror, its inner corner on the second. */
export const STAR = { tip: 600, inner: 400, stroke: 8 } as const;
/**
 * The clamp cranks tighter: a notch on each hit of the hold (17.3e and the cracks' 32nds), each a hard step on its own frame (taken SWAP_LEAD
 * early), held — the hold is otherwise still (the chamber's clock stops under the clamp), so each snare is the frame that changes (R10: a
 * trembling star read 'none' on all five).
 */
export const STRAIN = { hits: BUILD_SNARES2.filter((h) => h > CLAMP.from && h < GIVING_UP), notch: 0.025 } as const;
export function strainAt(f: number): number {
  if (struck(GIVING_UP, f)) return 0;
  return STRAIN.notch * STRAIN.hits.filter((h) => struck(h, f)).length;
}

/** The crystal shards: 40, scattered through the wedge, tumbling, carried outward with the flow; each flares on the kicks. */
const SHARDS = 40;
function shards(out: Shape[], f: number, clock: number, w0: number, w1: number, scale: number, dim: number): void {
  const kick = KICKS2.filter((k) => k <= f).pop() ?? KAL.from;
  // The kicks flare them fully; bar 17's ratchet hits at 60 % (R10: the snares move the picture).
  const hit = RATCHET_HITS.filter((h) => h <= f).pop() ?? -Infinity;
  const flare = Math.max(Math.exp(-(f - kick) / 5), 0.6 * Math.exp(-(f - hit) / 4));
  for (let i = 0; i < SHARDS; i++) {
    const u = hash(i, 4101);
    const rho = 280 * 2 ** ((u * 4 + flowPhase(f) * 0.8) % 4) * scale;
    const b = lerp(w0, w1, hash(i, 4102));
    const [x, y] = chamberPoint(rho, b);
    const len = (14 + 30 * hash(i, 4103)) * scale * (rho / 600) ** 0.5;
    const rot = hash(i, 4104) * TAU + (clock - KAL.from) * (0.05 + 0.1 * hash(i, 4105));
    const level = (0.35 + 1.4 * flare) * dim;
    out.push({ kind: 'rect', x, y, w: len, h: len * 0.32, rot, color: [level, level * 0.97, level * 0.9], soft: len * 0.12 });
  }
}

// ——— The chamber ————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type KaleidoChamber = { ground: RGB; back: FlatContent; light: FlatContent };

/** The chamber at instant `f`: everything the mirrors fold. */
export function chamberAt(f: number): KaleidoChamber {
  const scale = 1;
  const n = facetsAt(f);
  const t0 = turnAt(f);
  const w0 = t0 - 0.12;
  const w1 = t0 + Math.PI / n + 0.12;
  const d = desaturation(f);
  const dim = whipDim(f);
  const veil = lightVeil(f);
  const out: Sink = { back: [], glyphs: { rounded: [], jp: [] }, light: [] };
  const front = crystalFront(f);
  // The chamber's own life (the rows' wobble, the glass's strides, the shards' tumble, the big fragment's turns) runs on bar 17's ratchet
  // too, so between the hits the whole mandala idles at ⅓ and everything lands on the snare (R10).
  const clock = chamberClock(f);
  // The bands, youngest (innermost) last so each covers the light behind it; the oldest fills out to the sheet's far corner.
  const live = BANDS.map((x, i) => ({ ...x, i })).filter((x) => x.at <= f);
  const R = live.map((x) => bandRadius(x.at, f) * scale);
  // The unfold closes the tube's dark core as the eyepiece fades: the youngest band fills in toward the centre, so no dark hole slides
  // through the whip (it is behind his face until then).
  const close = 1 - smoothstep(GIVING_UP + 6, WHIP_REEL.from + 3, f);
  if (R.length) R[R.length - 1] = Math.max(24, R[R.length - 1] * close);
  const far = 2300;
  for (let i = 0; i < live.length; i++) {
    const a = R[i];
    const b = i === 0 ? far : R[i - 1];
    if (a >= far || b <= a) continue;
    band(out, live[i].world, live[i].i + 1, a, Math.min(b, far), w0, w1, clock, d, dim, front);
  }
  // Inside the youngest band: the dark of the tube round his eyepiece.
  const core = live.length ? R[live.length - 1] : far;
  out.back.push({ kind: 'ellipse', x: CHAMBER.origin[0], y: CHAMBER.origin[1], w: 2 * core, h: 2 * core, color: scaleRGB(lin(PALETTES.kaleido.rim), dim) });
  // His copies on the bisector (60 % of his amber over the bands: they are him).
  const bis = bisectorAt(f);
  for (const row of COPY_ROWS) {
    if (f < row.from - 1) continue;
    const grow = clamp((f - row.from + 1) / 4);
    const rho = row.rho * scale;
    const [x, y] = chamberPoint(rho, bis);
    const w = copyWidth(row.rho, n) * scale * grow;
    // Glyph size from ink width: (•ω•) is ≈ 2.55 em of ink at 1 em (measured by the scene; this keeps a fixed proportion).
    const size = w / 2.55;
    out.glyphs.rounded.push({ ch: HERO2.base, x, y, size, rot: radialRot(bis) - Math.PI / 2, color: scaleRGB(AMBER, 0.95 * dim), alpha: 0.85, outline: 0.05, outlineColor: INK });
  }
  // Defender's reticles: one a copy, locking on; the rosette's rings bend into amber ωs on 16.3&; spinning loose in the wallpaper; shut by the clamp.
  const shut = 1 - impact(f, CLAMP.from, 3);
  const loose = f >= WALLPAPER.from + 12 ? (f - (WALLPAPER.from + 12)) * 0.22 : 0;
  const infected = clamp((f - (ROSETTE_INFECTED - 1)) / 4);
  COPY_ROWS.forEach((row, k) => {
    const st = reticleState(k, f);
    if (st.on <= 0 || shut <= 0) return;
    const rho = (row.rho + st.slide * 520) * scale;
    const b = bis - st.slide * 0.2;
    const [x, y] = chamberPoint(rho, b);
    const size = Math.max(copyWidth(row.rho, n) * 1.15, 60) * scale * st.on * shut;
    const color = scaleRGB(grey(RED, d * 0.2), 1.35 * dim);
    reticle(out.back, x, y, size, radialRot(b) - Math.PI / 2 + loose * (k % 2 ? -1 : 1), color, 1, 1 - infected);
    if (infected > 0) out.glyphs.rounded.push({ ch: 'ω', x, y: y + size * 0.02, size: size * 0.62 * (0.6 + 0.4 * infected), rot: radialRot(b) - Math.PI / 2, color: scaleRGB(AMBER, 1.2 * dim), alpha: infected });
  });
  // The crystal shards (light).
  shards(out.light, f, clock, w0, w1, scale, dim * (1 - 0.6 * d));
  // One big fragment that turns 15° a 16th (S): the petals shimmer.
  {
    const k = Math.floor((clock - KAL.from) / 6);
    const snapT = clamp((clock - KAL.from - k * 6) / 2);
    const rot = ((k - 1 + snapT) * 15 * Math.PI) / 180;
    const [x, y] = chamberPoint(560 * scale, bis + Math.PI / n / 3);
    out.light.push({ kind: 'rect', x, y, w: 120 * scale, h: 26 * scale, rot, color: scaleRGB([1, 0.96, 0.85], 0.5 * dim), soft: 8 * scale });
  }
  // The clamp: a red chevron per wedge (a 30-point star round his face), 6 px + a 20 % hatch; amber cracks on 17.3&; shattered on 17.4.
  if (struck(CLAMP.from, f) && f < GIVING_UP + 15) {
    // It lands home on 17.3 (a 4 % settle over 2 frames: the slam is its arrival, so the hold after it is calm); then the notches.
    const slam = 1 + 0.04 * (1 - clamp((f - CLAMP.from) / 2));
    const tremble = 1 - strainAt(f);
    const tip = chamberPoint(STAR.tip * slam * tremble, t0);
    const inner = chamberPoint(STAR.inner * slam * tremble, t0 + Math.PI / n);
    const red = scaleRGB(lin(LAW.defender.print), 1.15);
    if (f < GIVING_UP) {
      const len = Math.hypot(tip[0] - inner[0], tip[1] - inner[1]);
      const rot = Math.atan2(tip[1] - inner[1], tip[0] - inner[0]);
      // The hatch: radial strokes from his eyepiece out to the chevron (the mirrors fan them round the star).
      for (const u of [0.3, 0.75]) {
        const b = t0 + (Math.PI / n) * u;
        const r1 = lerp(STAR.tip, STAR.inner, u) * slam * tremble;
        const r0 = 372;
        const [x0, y0] = chamberPoint(r0, b);
        const [x1, y1] = chamberPoint(r1, b);
        out.back.push({ kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: r1 - r0, h: 5, rot: radialRot(b), color: red, alpha: 0.55 });
      }
      out.back.push({ kind: 'segment', x: (tip[0] + inner[0]) / 2, y: (tip[1] + inner[1]) / 2, w: len + STAR.stroke, h: STAR.stroke, rot, color: red });
      // The cracks: amber light along the chevron and out along its tip, a step a 32nd from 17.3&, each flaring as it runs.
      const cracks = f >= CLAMP.from + 12 ? Math.min(4, Math.floor((f - (CLAMP.from + 12)) / 3) + 1) : 0;
      if (cracks > 0) {
        const grow = cracks / 4;
        const out1 = chamberPoint(STAR.tip * slam * (1 + 0.5 * grow), t0);
        const g = scaleRGB(AMBER, 2.2);
        out.light.push({ kind: 'segment', x: (tip[0] + out1[0]) / 2, y: (tip[1] + out1[1]) / 2, w: Math.hypot(out1[0] - tip[0], out1[1] - tip[1]) + 4, h: 4, rot: Math.atan2(out1[1] - tip[1], out1[0] - tip[0]), color: g, soft: 1.5 });
        out.light.push({ kind: 'segment', x: lerp(inner[0], tip[0], 0.5 * grow), y: lerp(inner[1], tip[1], 0.5 * grow), w: len * grow + 4, h: 3, rot, color: g, soft: 1.2 });
      }
    } else {
      // Shattered: the chevron's shards fly out with the burst and fall (mirrored: a red rain), gone by 17.4 + 15.
      const u = (f - GIVING_UP) / 15;
      for (let i = 0; i < 6; i++) {
        const along = (i + 0.5) / 6;
        const [px, py] = [lerp(inner[0], tip[0], along), lerp(inner[1], tip[1], along)];
        const rho = Math.hypot(px - CHAMBER.origin[0], py - CHAMBER.origin[1]) * (1 + 1.4 * u + 0.4 * hash(i, 77) * u);
        const b = t0 + (Math.PI / n) * (1 - along) + 0.06 * (hash(i, 78) - 0.5) * u;
        const [x, y] = chamberPoint(rho, b);
        const size = 26 * (1 - u * 0.7);
        out.back.push({ kind: 'rect', x, y, w: size, h: size * 0.55, rot: hash(i, 79) * TAU + 9 * u, color: red, alpha: 1 - u });
      }
    }
  }
  // The burst's amber shockwave (17.4), in the chamber so the mirrors ring it.
  if (f >= GIVING_UP && f < GIVING_UP + 12) {
    const u = (f - GIVING_UP) / 12;
    const rho = lerp(300, 1500, 1 - (1 - u) ** 2) * scale;
    out.light.push({ kind: 'ring', x: CHAMBER.origin[0], y: CHAMBER.origin[1], w: 2 * rho, h: 2 * rho, r: lerp(60, 8, u), color: scaleRGB(AMBER, 2.4 * (1 - u)), soft: 20 });
  }
  // The light (16.1): the sheet is white, and the bands crystallise under it from his face outward.
  const ground = mixRGB(scaleRGB(lin('#120E2A'), dim), WHITE, veil);
  if (veil > 0) out.light.push({ kind: 'rect', x: 0, y: 0, w: 1920, h: 1080, color: [veil, veil * 0.985, veil * 0.94] });
  return {
    ground,
    back: { under: out.back, glyphs: { rounded: out.glyphs.rounded, jp: out.glyphs.jp }, over: [] },
    light: { under: out.light, glyphs: {}, over: [] },
  };
}

// ——— On top, unmirrored ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** His face over the mandala: ink width (px) and look at instant `f`. */
export const HERO_WIDTH = 520;
/** The reel's hero, as he lands on its NEON card (Drop2Overload: 600 px, an amber tube lit at 0.6 before its ignition pops on 18.1). */
export const REEL_WIDTH = 600;
export const REEL_LEVEL = 0.6;
/** How far into the tube dress he is (0 his flat amber, 1 the reel's NEON tube): inside the whip's blur. */
export const tubeMix = (f: number): number => smoothstep(WHIP_REEL.from + 4, WHIP_REEL.from + 9, f);
/** His face width at `f`: 520, breathing ±2 % on the beat (in on the kick), growing to the reel's 600 through the whip. */
export function heroWidth(f: number): number {
  const beat = ((f - KAL.from) % BEAT + BEAT) % BEAT;
  const breath = 1 + 0.02 * Math.cos((TAU * beat) / BEAT) * (f < WHIP_REEL.from ? 1 : 0);
  const grow = lerp(HERO_WIDTH, REEL_WIDTH, flow(clamp((f - WHIP_REEL.from) / (WHIP_REEL.to - 1 - WHIP_REEL.from))));
  return grow * breath;
}
/** He hardens (•̀ω•́) — S27's determined brows over his eyes — from the wallpaper (17.2) to the burst. */
export const browsOn = (f: number): boolean => f >= WALLPAPER.from && f < GIVING_UP + 12;
/** How visible he is (0 in the light, 1 from 16.1 + 9): he condenses out of the white. */
export const heroAlpha = (f: number): number => smoothstep(LIGHT.from + 1, LIGHT.from + 9, f);

/** Glyphs of `text` in `font`, its ink centred on world (cx, cy) and `width` px wide. */
export function inkGlyphs(L: KaleidoLayout, font: KaleidoFont, text: string, o: { cx: number; cy: number; width: number; color: (i: number, ch: string) => RGB; extra?: Partial<Glyph> }): Glyph[] {
  const box = L.ink.get(inkKey(font, text));
  if (!box) throw new Error(`no ink box for ${font} "${text}"`);
  const em = o.width / (box.right - box.left);
  const line = typeset(text, L.advance[font]);
  const left = o.cx - (em * (box.left + box.right)) / 2;
  // World y is up; the box's up / down are from the middle line (y down in layout): the ink's middle sits on cy.
  const mid = o.cy + (em * (box.down - box.up)) / 2;
  const out: Glyph[] = [];
  line.chars.forEach((ch, i) => {
    if (ch.ch.trim() === '') return;
    out.push({ ch: ch.ch, x: left + em * ch.x, y: mid, size: em, color: o.color(i, ch.ch), ...o.extra });
  });
  return out;
}

/** The ten bytes on the brass eyepiece ring, one a sector (36°), turning slowly against the mandala. */
export const BRASS = { inner: 300, outer: 352, rim: 10 } as const;

/**
 * back: the eyepiece, his face, the hat, the whip's card; type: the give-up pill and its line, drawn by their own pass after back so the
 * ring's engraved bytes (the same display atlas) never show through the pill; light: added last (the burst still flashes over the pill).
 */
export type KaleidoOver = { back: FlatContent; type: FlatContent; light: FlatContent };

/** Everything over the fold, unmirrored, at instant `f`. */
export function overAt(f: number, L: KaleidoLayout): KaleidoOver {
  const back: Shape[] = [];
  const over: Shape[] = [];
  const light: Shape[] = [];
  const rounded: Glyph[] = [];
  const display: Glyph[] = [];
  const roundedLight: Glyph[] = [];
  const pill: Shape[] = [];
  const pillType: Glyph[] = [];
  const pan = whipPan(f);
  const a = heroAlpha(f);
  const veil = lightVeil(f);
  // The brass eyepiece ring (the tube's rim, its bytes engraved), fading in with him and out with the unfold.
  const ringAlpha = a * (1 - smoothstep(MIRRORS[7].at, WHIP_REEL.from + 3, f));
  if (ringAlpha > 0) {
    const turn = -0.35 * spinAt(f);
    const brass = lin(PALETTES.kaleido.brass);
    const rim = lin(PALETTES.kaleido.rim);
    const mid = (BRASS.inner + BRASS.outer) / 2;
    // The lens: the light at the tube's end, a warm lightbox behind his face (no mirror seams cross it).
    back.push({ kind: 'ellipse', x: pan, y: 0, w: 2 * BRASS.inner + 4, h: 2 * BRASS.inner + 4, color: lin(PALETTES.kaleido.core, 0.95), alpha: ringAlpha });
    back.push({ kind: 'ellipse', x: pan, y: 0, w: 1.7 * BRASS.inner, h: 1.7 * BRASS.inner, color: WHITE, alpha: 0.75 * ringAlpha, soft: 0.75 * BRASS.inner });
    back.push({ kind: 'ring', x: pan, y: 0, w: 2 * (BRASS.outer + BRASS.rim), h: 2 * (BRASS.outer + BRASS.rim), r: BRASS.outer + BRASS.rim - (BRASS.inner - BRASS.rim), color: rim, alpha: ringAlpha });
    back.push({ kind: 'ring', x: pan, y: 0, w: 2 * BRASS.outer, h: 2 * BRASS.outer, r: BRASS.outer - BRASS.inner, color: brass, alpha: ringAlpha });
    back.push({ kind: 'ring', x: pan, y: 0, w: 2 * (BRASS.outer - 6), h: 2 * (BRASS.outer - 6), r: 2, color: scaleRGB(brass, 1.5), alpha: ringAlpha });
    const engraved = lin(PALETTES.kaleido.engraved);
    SIGNATURE.brass.forEach((byte, k) => {
      const b = turn + (k * TAU) / 10;
      const [dx, dy] = [-Math.sin(b), Math.cos(b)];
      const line = typeset(byte, L.advance.display);
      const size = 30;
      line.chars.forEach((ch) => {
        const along = (ch.x - line.width / 2) * size;
        // Set along the ring's tangent, reading clockwise, upright toward the outside.
        const [tx, ty] = [dy, -dx];
        display.push({ ch: ch.ch, x: pan + dx * mid + tx * along, y: dy * mid + ty * along, size, rot: Math.atan2(ty, tx), color: engraved, alpha: ringAlpha });
      });
      // A tick between sectors.
      const bt = b + TAU / 20;
      back.push({ kind: 'segment', x: pan - Math.sin(bt) * mid, y: Math.cos(bt) * mid, w: BRASS.outer - BRASS.inner - 14, h: 3, rot: bt + Math.PI / 2, color: engraved, alpha: ringAlpha });
    });
  }
  // His face: flat amber with a 6 px #111 outline, condensing out of the light; in the whip it becomes the reel's NEON tube.
  const width = heroWidth(f);
  const tube = tubeMix(f);
  if (a > 0) {
    const em = width / 2.55;
    const flat = inkGlyphs(L, 'rounded', HERO2.base, { cx: 0, cy: 0, width, color: () => mixRGB(WHITE, AMBER, a), extra: { outline: 6 / em, outlineColor: mixRGB(WHITE, INK, a), alpha: a * (1 - tube) } });
    if (tube < 1) rounded.push(...flat);
    if (browsOn(f)) {
      const eyes = flat.filter((g) => g.ch === '•');
      const [bl, br] = HERO2.brows;
      eyes.forEach((g, i) => rounded.push({ ...g, ch: i === 0 ? bl : br, x: g.x + (i === 0 ? 0.04 : -0.04) * g.size, y: g.y + 0.2 * g.size, size: g.size * 1.15, color: INK, outline: 0, alpha: a * (1 - tube) }));
    }
    if (tube > 0) {
      // The reel's tube: dark glass under, the amber light over (src/shots/drop2Overload.ts heroDraws 'neon'), lit to REEL_LEVEL.
      const glass = inkGlyphs(L, 'rounded', HERO2.base, { cx: 0, cy: 0, width, color: () => lin('#1C1A24'), extra: { tube: 0.026, alpha: tube } });
      rounded.push(...glass);
      roundedLight.push(...glass.map((g) => ({ ...g, color: scaleRGB(AMBER, REEL_LEVEL * 1.05 * tube) })));
      light.push({ kind: 'ellipse', x: 0, y: 0, w: width * 1.5, h: width * 0.8, color: scaleRGB(AMBER, 0.1 * REEL_LEVEL * tube), soft: width * 0.35 });
    }
  }
  // The burst (17.4): his amber ring blasts outward from the eyepiece.
  if (f >= GIVING_UP - 1 && f < GIVING_UP + 14) {
    const u = clamp((f - GIVING_UP) / 14);
    const r = lerp(BRASS.outer, 1500, 1 - (1 - u) ** 2.2);
    light.push({ kind: 'ring', x: pan, y: 0, w: 2 * r, h: 2 * r, r: lerp(70, 10, u), color: scaleRGB(AMBER, 1.8 * (1 - u) ** 1.5), soft: lerp(40, 6, u) });
  }
  // `[DEFENDER] giving up ╮(￣ω￣;)╭`: 96 px on a white pill, centre-bottom (baseline 900), slammed in on 17.4, riding the whip out.
  if (f >= GIVING_UP - 3) {
    const slam = 1 + 0.35 * (1 - impact(f, GIVING_UP, 3)) + 0.05 * Math.exp(-Math.max(0, f - GIVING_UP) / 2) * Math.cos(Math.max(0, f - GIVING_UP) * 1.4);
    const size = 96 * slam;
    const line = typeset(GIVING_UP_LINE, L.advance.display);
    const w = line.width * size;
    const cy = 540 - 900 + 0.32 * size;
    const alpha = clamp((f - (GIVING_UP - 3)) / 2);
    pill.push({ kind: 'rect', x: pan, y: cy, w: w + 64 * slam, h: size * 1.3, r: (size * 1.3) / 2, color: WHITE, alpha });
    const omega = [...GIVING_UP_LINE].lastIndexOf('ω');
    line.chars.forEach((ch, i) => {
      if (ch.ch.trim() === '') return;
      pillType.push({ ch: ch.ch, x: pan - w / 2 + ch.x * size, y: cy, size, color: i === omega ? AMBER : lin(LAW.defender.print), alpha });
    });
  }
  // The reticle that doesn't fall: unmirrored, it spins 2.5 turns and shrinks to 30 % on its way out past the top-right corner (the hat).
  if (f >= HAT_FLIGHT.from && f < HAT_FLIGHT.to + 1) {
    const u = clamp((f - HAT_FLIGHT.from) / (HAT_FLIGHT.to - HAT_FLIGHT.from));
    const e = springL(f, HAT_FLIGHT.from, 0.75);
    const from: V2 = [250, 110];
    const to: V2 = [1180, 760];
    const x = lerp(from[0], to[0], e);
    const y = lerp(from[1], to[1], e) + 60 * Math.sin(Math.PI * clamp(e));
    const size = 180 * lerp(1, RETICLE_HAT.scale, clamp(e));
    reticle(over, pan + x, y, size, RETICLE_HAT.turns * TAU * clamp(e), scaleRGB(RED, 1.4), 1 - smoothstep(0.85, 1, u) * 0, 1);
  }
  // The whip: the reel's NEON card slides in from the left — its dark ground, its cyan arcs, its runner, tube lines between (parallax).
  if (f > WHIP_REEL.from) {
    const left = -960 + pan - WHIP_LENGTH; // the card's left edge (world x): at the frame's left edge on 18.1
    const edge = left + 1920 + 320; // the dark's right edge: the card plus a margin of dark tube lines before the mandala
    // The dark ground of the card (and the gap of tube lines before the mandala), its right edge sweeping across the frame.
    back.push({ kind: 'rect', x: edge - 2400, y: 0, w: 4800, h: 1200, color: lin(PALETTES.neon.ground) });
    const cyan = lin(PALETTES.neon.cyan);
    const tubeLine = (x0: number, y0: number, x1: number, y1: number, w: number, hue: RGB, level: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const s: Shape = { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: len + w, h: w, rot: Math.atan2(y1 - y0, x1 - x0), color: lin('#1C1A24') };
      over.push(s);
      light.push({ ...s, h: w * 2.8, color: scaleRGB(hue, 0.12 * level), soft: w * 1.4 });
      light.push({ ...s, color: scaleRGB(hue, level) });
      light.push({ ...s, h: w * 0.4, w: len + w * 0.4, color: mixRGB(scaleRGB(hue, 0.9 * level), [level, level, level], 0.5) });
    };
    const X = (lx: number) => left + lx;
    const Y = (ly: number) => 540 - ly;
    for (const [x0, y0, x1, y1] of NEON_ARCS) tubeLine(X(x0), Y(y0), X(x1), Y(y1), 6, cyan, 1.1);
    for (const s of WHIP_STREAKS) {
      const x = left + 1920 + s.x * (1 + s.z);
      tubeLine(x, Y(s.y), x + s.len, Y(s.y), s.w, lin(s.hue === 'cyan' ? PALETTES.neon.cyan : s.hue === 'amber' ? PALETTES.neon.amber : PALETTES.neon.pink), 1.2);
    }
    // The runner, running in along the card's bottom (glass under, cyan light over), where the reel's first frame has it.
    const rx = RUNNER.x0 + RUNNER.speed * (f - REEL.from);
    for (const ch of typeset(RUNNER.face, L.advance.rounded).chars) {
      if (ch.ch.trim() === '') continue;
      const g: Glyph = { ch: ch.ch, x: X(rx + ch.x * RUNNER.size), y: Y(RUNNER.y), size: RUNNER.size, color: lin('#1C1A24'), tube: RUNNER_THIN.test(ch.ch) ? 0.001 : 0.018 };
      rounded.push(g);
      roundedLight.push({ ...g, color: scaleRGB(cyan, 1.15) });
    }
  }
  // The light (16.1): white over everything while it lasts (the brightest frames are the picture).
  if (veil > 0) light.push({ kind: 'rect', x: 0, y: 0, w: 1920, h: 1080, color: [veil * 0.6, veil * 0.59, veil * 0.55] });
  return {
    back: { under: back, glyphs: { rounded, display }, over },
    type: { under: pill, glyphs: { display: pillType }, over: [] },
    light: { under: light, glyphs: { rounded: roundedLight }, over: [] },
  };
}

/** The runner's thin strokes (ヽ ノ = 3) are hardly thinned as tubes (Drop2Overload's tubeOf). */
const RUNNER_THIN = /[─-╿｡-ﾟヽ〜~︵ノ＼／/|=3]/u;

/** Tube lines in the dark between the card and the mandala (offsets from the card's right edge, px; z > 0 nearer: they move faster). */
export const WHIP_STREAKS: readonly { x: number; y: number; len: number; z: number; hue: 'cyan' | 'pink' | 'amber'; w: number }[] = [
  { x: 40, y: 180, len: 260, z: 0.2, hue: 'pink', w: 5 },
  { x: 120, y: 330, len: 420, z: -0.1, hue: 'cyan', w: 6 },
  { x: 20, y: 520, len: 180, z: 0.35, hue: 'amber', w: 4 },
  { x: 90, y: 690, len: 360, z: 0.1, hue: 'pink', w: 6 },
  { x: 160, y: 880, len: 300, z: -0.2, hue: 'cyan', w: 5 },
  { x: 60, y: 1010, len: 240, z: 0.3, hue: 'cyan', w: 4 },
];

// ——— Photography —————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Sub-frames (shutter 0.5): 64 on the whip (and the unfold's last snaps under it), 32 on the light, the mirror snaps, the wallpaper's
 * zoom and the collapse, the clamp and the burst; 24 elsewhere (the mandala spins: ≈ 0.15–0.3 rev/s moves its rim ≈ 20–40 px a frame).
 */
export function kaleidoTemporal(f: number): Temporal {
  const T = (samples: number): Temporal => ({ samples, shutter: 0.5, persistence: 0 });
  if (f >= WHIP_REEL.from - 6) return T(64);
  if (f < LIGHT.from + 14) return T(32);
  if (MIRRORS.some((m) => f >= m.at - 4 && f <= m.at + 2)) return T(32);
  if (f >= WALLPAPER.from - 3 && f < CLAMP.from + 6) return T(32);
  if (f >= GIVING_UP - 3) return T(48);
  return T(24);
}
/** Drop 2's segments (no hard cut here: the push-through comes in, the whip goes out, both continuous). */
export const kaleidoSegment = (f: number): Segment => drop2Segment(f);

/** The kaleidoscope's finishing: a little bloom for the shards and the light; no vignette under the light; easing into the reel's NEON look in the whip. */
export const KALEIDO_LOOK: Look = { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.4, threshold: 0.9, smoothing: 0.25, radius: 0.7 }, aberration: 0, grain: 0.03, vignette: 0.12 };
export function kaleidoLook(f: number): Look {
  const veil = lightVeil(f);
  const base: Look = { ...KALEIDO_LOOK, vignette: KALEIDO_LOOK.vignette * (1 - veil), grain: KALEIDO_LOOK.grain * (1 - veil) };
  const w = clamp((f - WHIP_REEL.from) / (WHIP_REEL.to - WHIP_REEL.from));
  return w > 0 ? mixLook(base, overloadLook(REEL.from), flow(w)) : base;
}

/** The snare build (16.4& → the whip) — the shards also flare on its hits (tests read it to check the picture moves on every drum). */
export const DRUMS = { kicks: KICKS2.filter((k) => k >= KAL.from && k < KAL.to), snares: BUILD_SNARES2 } as const;
