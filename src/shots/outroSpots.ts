// The spots (build sheet notes/b58/ending-sheet.md §3.3 row 3.4e → 3.4a, §7.1, R2): with friends 1 → 2 → 4 → 8 seven small irises
// open round the main one, each a window into a world he infected, drawn in that world's own Look (the new effects, run on the spot
// through EffectQuad): Swiss flat on its paper with the red lens's arc, Riso printed (its plates clacking into register on the 16ths),
// the transition's 8-bit waltz pixelated, the cosmos printed at night and powered into neon, the club inked with Ben-Day dots and focus
// lines, the interlude's flat paint fields with one glass glint, drop 2 every world at once in a kaleidoscope with its headliner on top,
// unmirrored. Each holds its world's headliner at 48 px in that world's ink (its ω amber: infected). Rims and pops are the aperture's
// (src/shots/outroAperture.ts); this module draws the interiors at rest and says how each is finished. Layout px (y down) for
// placement; content in the flat world (centre, y up). Pure.
import { HEADLINERS } from '../content/outro.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp } from '../engine/math.ts';
import type { ComicInkLook } from '../engine/post/comicModel.ts';
import type { KaleidoLook } from '../engine/post/kaleidoMath.ts';
import type { PixelLook } from '../engine/post/pixelMath.ts';
import type { RisoPrintLook } from '../engine/post/risoModel.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { struck } from '../engine/temporal.ts';
import { BURST, SPOTS } from '../score/outro.ts';
import { FRAMES_PER_BEAT } from '../score/tempo.ts';
import { misregistration } from '../worlds/riso.ts';
import { type ApertureSpot, MAX_SPOTS } from './outroAperture.ts';
import { INKS, type OmegaPlan, X, Y, wholeFace } from './outroKit.ts';
import { SPOT_AT, springL } from './outroShared.ts';

/** The world of each spot, in HEADLINERS' spot order (1 Swiss … 7 drop 2). */
export const SPOT_WORLDS = ['swiss', 'riso', 'transition', 'cosmos', 'club', 'interlude', 'drop2'] as const;
export type SpotWorld = (typeof SPOT_WORLDS)[number];
/** When each spot lights: Swiss with 2 (3.4e), Riso and the transition with 4 (3.4&), the other four with 8 (3.4a). */
export const SPOT_LIGHT: readonly number[] = [SPOTS[0], SPOTS[1], SPOTS[1], SPOTS[2], SPOTS[2], SPOTS[2], SPOTS[2]];
/** Each spot's headliner (HEADLINERS with a spot, in spot order). */
export const SPOT_FACES: readonly string[] = SPOT_WORLDS.map((_, i) => HEADLINERS.find((h) => h.spot === i + 1)!.face);
/** The friend's type size in its spot. */
export const FRIEND_EM = 48;
if (SPOT_AT.length !== MAX_SPOTS || SPOT_FACES.length !== MAX_SPOTS) throw new Error('outro: seven spots, seven headliners');

/** How open spot i is (0 → 1, a springy iris: ≈ 9 % past round, settled in 10 f) and its rim's light (1.8 → 1 over its first 6 frames). */
export function spotOpen(i: number, f: number): number {
  return springL(f, SPOT_LIGHT[i], 0.6);
}
/** On the burst each spot pops a little and is gone within 3 frames (its friend has already flown). */
export const SPOT_BURST = { frames: 3, scale: 1.12 } as const;
const rimFlare = (i: number, f: number): number => 1 + 0.8 * Math.exp(-Math.max(0, f - SPOT_LIGHT[i]) / 3);
/** The spots at instant f for the aperture (screen space): opening on their beats; on the burst (O4) their rims pop away (scale 1 → 1.12, α → 0 in 3 f: review F1, they lingered over the stage) and the interiors fade with them. */
export function spotsAt(f: number): ApertureSpot[] {
  return SPOT_AT.map((s, i) => {
    const open = spotOpen(i, f);
    const burst = f < BURST - 0.25 ? 0 : clamp((f - (BURST - 0.25)) / SPOT_BURST.frames);
    const lit = struck(SPOT_LIGHT[i], f);
    return {
      x: s.centre[0],
      y: s.centre[1],
      r: lit ? s.r : 0,
      scale: Math.max(1e-3, open) * (1 + (SPOT_BURST.scale - 1) * burst),
      rim: (lit ? rimFlare(i, f) : 0) * (1 - burst),
      inside: lit ? 1 - burst : 0,
      fx: SPOT_WORLDS[i] !== 'swiss' && SPOT_WORLDS[i] !== 'interlude',
    };
  });
}
/** The spots' lit frames for the effect passes: any spot open at output frame F. */
export const spotsLit = (F: number): boolean => F >= SPOT_LIGHT[0] && F < BURST + SPOT_BURST.frames + 1;

// ——— The worlds' grounds and friends (drawn at rest, screen space) ————————————————————————————————————————————————————————————————

const hex = (h: string, k = 1): RGB => linear(h, k);
const disc = (x: number, y: number, r: number, color: RGB, alpha = 1): Shape => ({ kind: 'ellipse', x: X(x), y: Y(y), w: 2 * r, h: 2 * r, color, alpha });
const rect = (x: number, y: number, w: number, h: number, color: RGB, rot = 0, alpha = 1): Shape => ({ kind: 'rect', x: X(x), y: Y(y), w, h, color, rot, alpha });
const SIXTEENTH = FRAMES_PER_BEAT / 4;
/** A friend's life inside its spot: a bob of ±3 px on the 16ths (struck) — the world dancing. */
const bob = (i: number, F: number): number => 3 * Math.sin((Math.PI / 2) * Math.floor((F - SPOT_LIGHT[i]) / SIXTEENTH) + i);

/** The world ink each friend is printed in (its ω re-inked amber), and the ground it stands on. */
export const SPOT_INK: Readonly<Record<SpotWorld, RGB>> = {
  swiss: hex('#141414'),
  riso: hex('#1B1B2E'),
  // eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
  transition: hex('#FFE3A3', 1.2),
  cosmos: hex('#F1EEE7', 1.3),
  club: hex('#101010'),
  interlude: hex('#2A2440'),
  drop2: hex('#FFFFFF', 1.4),
};

/** Spot i's world at output frame F: its ground and its friend (the drop 2 headliner goes over the kaleidoscope: `over`). */
export function spotWorld(i: number, F: number, plan: OmegaPlan): { under: Shape[]; faces: Glyph[]; over: Glyph[] } {
  const [cx, cy] = SPOT_AT[i].centre;
  const r = SPOT_AT[i].r;
  const world = SPOT_WORLDS[i];
  const under: Shape[] = [];
  const t = (F - SPOT_LIGHT[i]) / FRAMES_PER_BEAT;
  switch (world) {
    case 'swiss':
      under.push(disc(cx, cy, r + 8, hex('#F2EDE4')));
      for (const dx of [-60, 0, 60]) under.push(rect(cx + dx, cy, 2, 2 * r + 16, hex('#141414'), 0, 0.14));
      under.push(disc(cx + 0.62 * r, cy - 0.62 * r, 0.62 * r, hex('#E8402B')));
      break;
    case 'riso':
      under.push(disc(cx, cy, r + 8, hex('#F2EDE3')));
      under.push(disc(cx - 40, cy - 34, 62, hex('#FF48B0')));
      under.push(rect(cx + 30, cy + 40, 2.4 * r, 46, hex('#0078BF'), -0.5));
      under.push(disc(cx + 58, cy - 52, 26, hex('#FFE800')));
      break;
    case 'transition': {
      under.push(disc(cx, cy, r + 8, hex('#121B3E')));
      // The waltz's floor: chip-coloured bands sliding a step a beat, and a few square stars.
      const bands = ['#A78BFA', '#3FE0FF', '#FFB23E', '#FF5FA2'];
      bands.forEach((b, k) => under.push(rect(cx, cy + 30 + 22 * k - ((Math.floor(t * 4) * 6) % 22), 2 * r + 16, 10, hex(b), 0, 0.85)));
      for (let k = 0; k < 9; k++) under.push(rect(cx - r + 2 * r * hash(k, 51), cy - r + 0.9 * r * hash(k, 52), 6, 6, hex('#F1EEE7', 1.2)));
      break;
    }
    case 'cosmos':
      under.push(disc(cx, cy, r + 8, hex('#000000')));
      under.push(disc(cx + 48, cy + 58, 70, hex('#FF7A2E', 1.1)));
      under.push(disc(cx + 30, cy + 42, 56, hex('#FFB23E', 1.3), 0.7));
      for (let k = 0; k < 24; k++) under.push(disc(cx - r + 2 * r * hash(k, 61), cy - r + 2 * r * hash(k, 62), 1 + 2 * hash(k, 63), hex('#FFFFFF', 1.6)));
      break;
    case 'club':
      under.push(disc(cx, cy, r + 8, hex('#FFD23F')));
      under.push(disc(cx - 46, cy + 40, 60, hex('#FF3D8B')));
      under.push(disc(cx + 60, cy - 50, 44, hex('#18A8E0')));
      break;
    case 'interlude':
      under.push(disc(cx, cy, r + 8, hex('#BFD7F2')));
      under.push(disc(cx - 50, cy + 46, 66, hex('#C9B8F0')));
      under.push(rect(cx + 40, cy - 30, 2.4 * r, 34, hex('#A8E6C9'), 0.35));
      // One glass glint: a white diagonal crossing on the beat.
      under.push(rect(cx - r + ((t * 120) % (2.4 * r)), cy, 10, 2.4 * r, hex('#FFFFFF', 1.3), -0.6, 0.55));
      break;
    case 'drop2': {
      // Every world at once: wedges of drop 2's palettes for the kaleidoscope to fold.
      under.push(disc(cx, cy, r + 8, hex('#121B3E')));
      const cols = ['#FF4A1C', '#FFE800', '#3FE0FF', '#FF5FA2', '#4CF08C', '#0078BF', '#F1EEE7', '#FFB23E'];
      cols.forEach((c, k) => under.push(rect(cx + 24 + 16 * k, cy - 70 + 18 * (k % 3), 18, 2 * r, hex(c), 0.4 + 0.2 * k, 0.9)));
      under.push(disc(cx + 52, cy - 40, 30, hex('#FFFFFF', 1.2)));
      break;
    }
  }
  const face = SPOT_FACES[i];
  const glyphs = wholeFace(face, { centre: [cx, cy + bob(i, F)], em: FRIEND_EM, ink: SPOT_INK[world], omega: INKS.amber, plan });
  return world === 'drop2' ? { under, faces: [], over: glyphs } : { under, faces: glyphs, over: [] };
}
/** Every spot's world at output frame F (the lit ones), for one draw into the spots' texture; without their friends once they have flown (the burst). */
export function spotsContent(F: number, plan: OmegaPlan, friends = true): { plain: FlatContent; over: FlatContent } {
  const under: Shape[] = [];
  const faces: Glyph[] = [];
  const over: Glyph[] = [];
  SPOT_WORLDS.forEach((_, i) => {
    if (F < SPOT_LIGHT[i] - 1) return;
    const w = spotWorld(i, F, plan);
    under.push(...w.under);
    if (!friends) return;
    faces.push(...w.faces);
    over.push(...w.over);
  });
  return { plain: { under, glyphs: { faces }, over: [] }, over: { under: [], glyphs: { faces: over }, over: [] } };
}

// ——— Each world's Look (EffectQuad on its spot) ————————————————————————————————————————————————————————————————————————————————

export type SpotLook = { riso?: RisoPrintLook; comic?: ComicInkLook; pixel?: PixelLook; kaleido?: KaleidoLook };
/** The Riso's plates clack into register on the 16ths (src/worlds/riso.ts misregistration, the Riso world's own). */
const RISO_STRONG = (F: number): number[] => Array.from({ length: 16 }, (_, k) => SPOTS[0] + k * SIXTEENTH).filter((a) => a <= F + 2 * FRAMES_PER_BEAT);
/** Spot i's Look at output frame F (none for Swiss and the interlude: flat already). Centres in the flat world (centre, y up). */
export function spotLook(i: number, F: number): SpotLook | null {
  const [cx, cy] = SPOT_AT[i].centre;
  const c: [number, number] = [X(cx), Y(cy)];
  switch (SPOT_WORLDS[i]) {
    case 'riso': {
      const m = misregistration(F, RISO_STRONG(F), 3);
      return { riso: { amount: 1, night: 0, pitch: 8, offsets: m } };
    }
    case 'transition':
      return { pixel: { amount: 1, cell: 6, palette: 'film16', dither: 0.15 } };
    case 'cosmos':
      return { riso: { amount: 1, night: 1, power: 1, pitch: 8 } };
    case 'club':
      return { comic: { amount: 1, pitch: 10, lines: { kind: 'focus', x: c[0], y: c[1], count: 48, width: 6, inner: 40, seed: Math.floor((F - SPOT_LIGHT[i]) / SIXTEENTH), amount: 0.6 } } };
    case 'drop2':
      return { kaleido: { amount: 1, facets: 6, spin: ((F - SPOT_LIGHT[i]) / FRAMES_PER_BEAT) * (Math.PI / 2), centre: c, source: c } };
    default:
      return null;
  }
}
/** Spot i's box in layout px (x0, y0, x1, y1): the effect pass is scissored to it (the pop's overshoot included). */
export const spotBox = (i: number): [number, number, number, number] => {
  const [cx, cy] = SPOT_AT[i].centre;
  const r = SPOT_AT[i].r * 1.35 + 8;
  return [Math.max(0, cx - r), Math.max(0, cy - r), Math.min(1920, cx + r), Math.min(1080, cy + r)];
};
/** Every face the spots draw (the `faces` atlas). */
export const SPOT_STRINGS: readonly string[] = SPOT_FACES;
