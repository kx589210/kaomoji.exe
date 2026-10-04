// T7, drop2 8.3–end − 1 (build sheet notes/d2build/sheet.md §4.2 rows drop2 8.3–8.4&, §5.11, §9 H5): the crash. The frame E10's last drop lands
// is the freeze — the field holds its drop2 8.3 glyphs (slipping two rows on the first frame, the CRT losing vertical hold) while the guest
// and the splash hang crisp over it; then the frozen type swirls round him and settles into rings of colour — the palest beside him,
// then green, cyan, violet and the film's pink toward the edges, the soap film's rainbow round its black spot (drop2 1.1's callback) —
// glowing toward him, his (×ω×) hot amber on a deep indigo spot at the centre ringed in silver, the hue rings drifting outward a ring a
// beat, glints twinkling, rings of light breathing out from him (the film's most beautiful frame, drop2 8.4–8.4& − 1); the colour drains from the edges in to the terminal's dim text while his cells condense
// into the crisp amber (×ω×) the ending starts from, the dim @ filling in where he was. Pure: Node tests import it
// (tests/drop2OverloadCrash.test.ts); the frozen field comes from the GPU (src/scenes/drop2Overload.ts) through buildField.
import { RAMP } from '../actors/asciiFace.ts';
import { aimPose } from '../motion/hit.ts';
import type { Pose } from '../engine/camera.ts';
import { type RGB, hue, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { BRIDGE_B_END, CONDENSE_B, FREEZE, INHALE, TINT } from '../score/bridgeB.ts';
import { CRASH, DRAIN, RINGS, SORT, crashClock } from '../score/drop2.ts';
import { PALETTES, T7_CONDENSED, T7_GRID, drop2Segment, flow, springL, t7CellCentre } from './drop2Shared.ts';
import { CLEARING, type Capsule, type FieldCell, HERO_HOT, HERO_SPOT, type OverloadLayout, X, Y, capsuleDistance, capsuleOf, clearing, heroField } from './drop2Overload.ts';
import {
  BLUE_TYPE,
  stadiumDistance,
  DRAIN_STEP,
  HEX_INK_GAIN,
  type Stadium,
  aberrationAt,
  blockAt,
  blockGround,
  corruptBlocks,
  crashClockB,
  drainAt,
  drainJitter,
  drainedBy,
  flareB,
  heartGlowB,
  hexChar,
  inhaleU,
  retractU,
  leakGlow,
  leakInk,
  leakPx,
  leakTint,
  lookClockB,
  programAt,
  slipRows,
  tearDx,
  veilShape,
} from './bridgeB.ts';
import { OUTRO_HEX, SEAM_SPOT } from './outroShared.ts';
import { FOV, FRONT } from './swiss.ts';
import { INK, terminalLook } from '../worlds/terminal.ts';

export { CLEARING, type Capsule, capsuleDistance, capsuleOf, heroSpans } from './drop2Overload.ts';

// ——— The crash clock (KEEP-FIRST, sheet §1.2 item 6 / §10 builder D) ————————————————————————————————————————————————————————————
// The bullet time (drop2 19.4&–20.4&) sits inside T7: the crash shot's content is held on its frame before it. So every curve here that
// runs ACROSS the bullet time (the drift, the CRT's band, the ring drift, the rings of light, the glints) reads the crash's own clock: f
// until the bullet time, held through it, f less its 96 frames after it (src/score/drop2.ts crashClock).
// v08, bridge B (src/score/bridgeB.ts; the v07 review found the transition into the ending too short): the drain no longer runs in drop 2's last half beat.
// The bullet time's camera runs down (the tape stop, drawn by src/scenes/drop2Bullet.ts on its camera's time) and lands front-on on the
// bridge's downbeat; the crash comes apart in the bridge, a stage a beat. From the bridge's first instant every curve reads the bridge's
// clocks (src/shots/bridgeB.ts): the program's falling frame rate (programAt) and the crash clock TAPE_LAG later (crashClockB); the look
// (the CRT, the glow) the film's own time (lookClockB); the blue spot and its leak the film's own time too (the system moves while the
// program is frozen). Every function below takes the FILM frame; the clocks are applied here.

/** The crash's own clock at film frame `f` (v04's T7 clock; in bridge B on the program's frames, the tape stop's 12 frames later). */
const clock = (f: number): number => crashClockB(f);
/** The drain's start on the crash clock: the bullet time's landing (v04's T7: the freeze → the drain 36 frames). */
const DRAIN_AT = crashClock(DRAIN.from);
/** v04's T7 end on the crash clock (the drain was 12 frames): the CRT's band rolled at this rate, and still does up to the landing. */
const V04_END = DRAIN_AT + 12;
/** The bridge's last frame and its freeze on the crash clock: the look (the film's time) settles by the one, the program's drift by the other. */
const END = lookClockB(BRIDGE_B_END - 1) + 1;
const END_P = clock(FREEZE) + 1;

// ——— The freeze ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The CRT loses vertical hold on the freeze: the whole field two rows (60 px) lower, on drop2 8.3 only (the guest and the splash over it hold still). */
export const slip = (f: number): number => (Math.round(f) === CRASH ? 2 * T7_GRID.cellH : 0);

// ——— His shape in the frozen field, and the rings round it (his capsule: capsuleOf / capsuleDistance, drop2Overload.ts) ——————————

/** The swirl runs on ellipses of this aspect round him (the frame's own, near enough). */
export const SWIRL_ASPECT = 1.8;
const polar = (x: number, y: number): { r: number; a: number } => ({ r: Math.hypot((x - 960) / SWIRL_ASPECT, y - 540), a: Math.atan2(y - 540, (x - 960) / SWIRL_ASPECT) });
const TAU = 2 * Math.PI;
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;

/** A colour's place in the rings, from him outward: the palest (his own light) first, then by hue — yellow-green, green, cyan, violet, pink, red — and the warm amber last. */
export const PALE = 0.35;
export function ringKey(ink: RGB): number {
  const mx = Math.max(ink[0], ink[1], ink[2]);
  const mn = Math.min(ink[0], ink[1], ink[2]);
  const sat = mx > 1e-6 ? (mx - mn) / mx : 0;
  if (sat < PALE) return sat - 1;
  const h = hue(ink);
  return h < 90 ? h + 360 : h;
}

// ——— The sort (drop2 8.3 + 3 … 8.4 − 1): a swirl into rings ——————————————————————————————————————————————————————————————————————————————

/**
 * Each cell's part in the sort: the cell whose place it takes (`to`, an index into the field), when it leaves (`t0`), how far it turns
 * round him on the way (radians, always the same way round: a swirl, not a shuffle), and the colour it settles to (`ink`: its own,
 * blended with its neighbours in the rings and saturated, before the frame's glow).
 */
export type Slot = { to: number; t0: number; turn: number; ink: RGB; rank?: number };
/** The rings are cut into this many bands of equal count; within a band the cells take the places nearest their own angle. */
export const BANDS = 24;
/** The sort leaves him ring by ring over 4 frames (inner first) and each cell takes 16 frames: every cell is home by drop2 8.4 − 1. */
export const SORT_STAGGER = 4;
export const SORT_FRAMES = 16;
/** The colours bleed into their neighbours in the rings (a moving average over this share of the cells), then saturate × 1.5: the bands become one spectrum. */
const BLEED = 0.04;
const SATURATION = 1.5;

/**
 * The sort plan of a frozen field (row-major, as buildField makes it). His cells and the cells inside his outline (the clearing) stay;
 * every other cell is ranked by ringKey and the places are ranked by their distance from his capsule, band by band, so the colours lie
 * in rings round him; within a band each cell takes the place that turns it least far the one way round. Ties keep their order, so the
 * plan is the same in every browser.
 */
export function sortPlan(field: readonly FieldCell[]): Slot[] {
  const plan: Slot[] = field.map((c, k) => ({ to: k, t0: SORT.from, turn: 0, ink: c.ink }));
  const m = clearing(field);
  const cap = capsuleOf(field);
  const movable: number[] = [];
  field.forEach((c, k) => {
    if (!c.hero && m[k] < 1) movable.push(k);
  });
  const n = movable.length;
  if (n === 0) return plan;
  const at = (k: number): [number, number] => t7CellCentre(field[k].col, field[k].row);
  const key = new Map(movable.map((k) => [k, ringKey(field[k].ink)]));
  const dist = new Map(movable.map((k) => [k, capsuleDistance(...at(k), cap)]));
  const angle = new Map(movable.map((k) => [k, polar(...at(k)).a]));
  const byKey = [...movable].sort((a, b) => key.get(a)! - key.get(b)! || a - b);
  const bySlot = [...movable].sort((a, b) => dist.get(a)! - dist.get(b)! || angle.get(a)! - angle.get(b)! || a - b);
  const slotRank = new Map(bySlot.map((k, i) => [k, i]));
  for (let j = 0; j < BANDS; j++) {
    const lo = Math.floor((j * n) / BANDS);
    const hi = Math.floor(((j + 1) * n) / BANDS);
    if (hi <= lo) continue;
    const cells = byKey.slice(lo, hi).sort((a, b) => angle.get(a)! - angle.get(b)! || a - b);
    const slots = bySlot.slice(lo, hi).sort((a, b) => angle.get(a)! - angle.get(b)! || a - b);
    const len = cells.length;
    let best = 0;
    let bestSum = Infinity;
    for (let s = 0; s < len; s++) {
      let sum = 0;
      for (let i = 0; i < len && sum < bestSum; i++) sum += wrap(angle.get(slots[(i + s) % len])! - angle.get(cells[i])!);
      if (sum < bestSum) {
        bestSum = sum;
        best = s;
      }
    }
    cells.forEach((k, i) => {
      const to = slots[(i + best) % len];
      plan[k] = { to, t0: SORT.from + (SORT_STAGGER * slotRank.get(to)!) / n, turn: wrap(angle.get(to)! - angle.get(k)!), ink: field[k].ink };
    });
  }
  // The colours bleed along the rings' order, then saturate; the outer rings turn the soap film's pink.
  const w = Math.max(1, Math.round(n * BLEED));
  const sum: [number, number, number][] = [[0, 0, 0]];
  for (const k of byKey) {
    const p = sum[sum.length - 1];
    const c = field[k].ink;
    sum.push([p[0] + c[0], p[1] + c[1], p[2] + c[2]]);
  }
  const profile: RGB[] = [];
  byKey.forEach((k, i) => {
    const a = Math.max(0, i - w);
    const b = Math.min(n, i + w + 1);
    const avg: RGB = [0, 1, 2].map((ch) => (sum[b][ch] - sum[a][ch]) / (b - a)) as unknown as RGB;
    const ink = mixRGB(saturated(avg), FILM_PINK, smoothstep(PINK_RANKS[0], PINK_RANKS[1], i / Math.max(1, n - 1)));
    profile.push(ink);
    plan[k] = { ...plan[k], ink, rank: i };
  });
  profiles.set(plan, profile);
  return plan;
}
/** A colour normalised to its brightest channel, its saturation × 1.5. */
function saturated(c: RGB): RGB {
  const mx = Math.max(c[0], c[1], c[2], 1e-6);
  return [0, 1, 2].map((ch) => clamp(1 - (1 - c[ch] / mx) * SATURATION)) as unknown as RGB;
}
/**
 * The outer rings are the soap film's magenta-pink (drop2 1.1's film round its black spot; #FF48B0, normalised): the last of the order — the
 * Swiss red, the amber, which at the frame's edge glow read as a dull maroon-brown (round 2, D2-CRASH-MUD) — turns pink over the
 * ranks 0.7 → 0.88 of the order, so the outermost tenth is pink, at the film's full saturation (≈ 1.3× the maroon's).
 */
export const FILM_PINK: RGB = (() => {
  const c = linear(PALETTES.riso.pink);
  const m = Math.max(...c);
  return [c[0] / m, c[1] / m, c[2] / m];
})();
export const PINK_RANKS = [0.62, 0.85] as const;
/** The ring inks of a plan in the rings' order (inner → outer): the colour each rank shows. */
const profiles = new WeakMap<readonly Slot[], readonly RGB[]>();

// ——— The rings drift (drop2 8.4 − 3 →): one ring a beat outward, the soap film's bands flowing from its black spot ——————————————————————

/** From the frame the swirl has all but settled, the hue rings drift outward. */
export const DRIFT_FROM = RINGS[0] - 3;
/** A ring is about a sixth of the order (pale, green, cyan, violet, magenta, pink): one a beat. */
export const RING_SHARE = 1 / 6;
/** How far (a share of the order) the rings have drifted out at `f`. */
export const ringDrift = (f: number): number => (RING_SHARE * Math.max(0, clock(f) - DRIFT_FROM)) / 24;
/** The rank whose colour cell `k` shows at `f` (its own until drop2 8.4 − 3, then one further in as the rings drift out; the palest rim widens). */
export function ringSource(plan: readonly Slot[], k: number, f: number): number {
  const r = plan[k].rank;
  if (r === undefined) return -1;
  const n = profiles.get(plan)?.length ?? 0;
  return Math.max(0, r - Math.floor(ringDrift(f) * n));
}
/** The ring ink cell `k` settles to at `f` (before the frame's glow): its rank's colour, drifting. */
export function ringInkAt(plan: readonly Slot[], k: number, f: number): RGB {
  const src = ringSource(plan, k, f);
  const profile = profiles.get(plan);
  return src < 0 || !profile ? plan[k].ink : profile[src];
}
/** How far a cell has swirled at `f` (0 at its start, 1 home): out at speed, settling (cubic-out) over SORT_FRAMES. */
export const swirl = (f: number, t0: number): number => 1 - (1 - clamp((f - t0) / SORT_FRAMES)) ** 3;
/** Where cell `k` is at `f` (layout px): on its spiral from its own place to its slot — radius and angle round him both easing. */
export function swirlPosition(f: number, k: number, field: readonly FieldCell[], plan: readonly Slot[]): [number, number] {
  const s = plan[k];
  const o = t7CellCentre(field[k].col, field[k].row);
  if (s.to === k) return o;
  const t = t7CellCentre(field[s.to].col, field[s.to].row);
  const p = swirl(f, s.t0);
  if (p <= 0) return o;
  if (p >= 1) return t;
  const a = polar(...o);
  const b = polar(...t);
  const r = lerp(a.r, b.r, p);
  const th = a.a + s.turn * p;
  return [960 + SWIRL_ASPECT * r * Math.cos(th), 540 + r * Math.sin(th)];
}

// ——— The frame (drop2 8.4–8.4& − 1), the drain and the condense (drop2 8.4&–end − 1) ——————————————————————————————————————————————————————————

/**
 * The frame's glow toward him: 1.35 (over the glow's threshold) beside his outline, falling to 0.13 at the frame's edges (≈ 360–650 px
 * out: lit enough that the outer rings read as the film's pink, not the maroon of round 1's 0.07); and the innermost rings run pale (the
 * soap film's silver rim round its black spot), a third white at his outline.
 */
export const FRAME_GLOW = { near: 1.35, edge: 0.2, reach: 265, white: 0.35, rim: 120 } as const;
export const glowAt = (d: number): number => FRAME_GLOW.edge + (FRAME_GLOW.near - FRAME_GLOW.edge) * Math.exp(-((Math.max(0, d) / FRAME_GLOW.reach) ** 2));
/** The silver rim sits just outside his black spot (round 2: past the clearing's feather, so the whitest ring is the one you see first). */
export const RIM_SHIFT = 60;
export const whiteAt = (d: number): number => FRAME_GLOW.white * Math.exp(-((Math.max(0, d - RIM_SHIFT) / FRAME_GLOW.rim) ** 2));
const WHITE: RGB = [1, 1, 1];
/**
 * Rings of light leave the rim of his black spot on RINGS and run outward 70 px a frame: + 40 % at the crest, so the frame visibly
 * breathes. Round 2: they start at the rim (90 px out), not at his outline, which is now inside the dark spot (a crest born there showed
 * a frame late).
 */
export const RING = { gain: 0.4, speed: 70, width: 70, from: 90 } as const;
export function ringGain(f: number, d: number): number {
  return ringGainAt(clock(f), d, RINGS);
}
/**
 * The rings of light at instant `t` of their own clock, launched on `waves`, each at its crest's `gains` (default RING.gain): the bullet
 * time keeps launching them, one every 6 frames.
 */
export function ringGainAt(t: number, d: number, waves: readonly number[], gains?: readonly number[]): number {
  let g = 1;
  waves.forEach((w, i) => {
    if (t >= w) g += (gains ? gains[i] : RING.gain) * Math.exp(-(((d - RING.from - RING.speed * (t - w)) / RING.width) ** 2));
  });
  return g;
}
/**
 * When a cell `d` px outside his outline starts draining, on the program's frames (v08, bridge B): a ring a stage — the edges (pink,
 * violet) on the landing, the middle (cyan, green) on the tear, the pale rim and his clearing on the corruption — each ring from its outer
 * edge in (src/shots/bridgeB.ts drainAt; in crashGlyphs a cell up to 2 frames late), each cell over DRAIN_STEP frames.
 */
export const drainStart = (d: number): number => drainAt(d);
/** The ink every cell drains to: the terminal's dim text, #D8F5E1 at 42 % (H5). */
export const DRAINED: RGB = linear(PALETTES.terminal.text, 0.42);
/**
 * His cells condense on the corruption (bridge 1.3, L on the program's frames: three pictures at 10 fps, then the 5 fps and the freeze):
 * scaled about (960, 540) by 1 → 0.43 and lifted to (960, 450); the crisp face crosses over its + 4 … + 9; the bridge's last frame is H5.
 */
export function condense(f: number): { scale: number; cy: number; crisp: number } {
  const t = programAt(f);
  const p = t < CONDENSE_B.from ? 0 : Math.min(1, springL(t, CONDENSE_B.from));
  const settle = f >= BRIDGE_B_END - 1 ? 1 : p;
  return { scale: lerp(1, T7_CONDENSED.width / 1020, settle), cy: lerp(540, T7_CONDENSED.centre[1], settle), crisp: clamp((t - (CONDENSE_B.from + 4)) / 5) };
}
/**
 * Where he was, the drained @ fills in as his cells leave, so drop 2's last frame is one even dim field under one face (the review: his emptied cells
 * left a dark stencil of the big face under the small one; dim =+* there still read as a darker face, being lighter type). Round 2: it
 * fills with the rest of his clearing (drop2 8.4& + 5 → end − 4, drainStart inside his outline) — filled earlier, on the black spot, it showed his old
 * face as a lit stencil. The hexdump still prints the =+* his cells held at the freeze (3d 2b 2a): the ending's decode brings his face
 * back in bytes.
 */
export const RESIDUE = { from: drainStart(0), to: drainStart(0) + DRAIN_STEP } as const;
const FILLED = RAMP[9];

/** The cells' row-major index by (col, row) on the terminal grid (as buildField lays the field out). */
const COLS = T7_GRID.cols[1] - T7_GRID.cols[0] + 1;
const cellIndex = (col: number, row: number): number => (row - T7_GRID.rows[0]) * COLS + (col - T7_GRID.cols[0]);
/** His clearing's stadium (his capsule + the spot's pad, centred (960, 540)): where the blue starts from and the corruption is placed round. */
export const clearStadium = (cap: Capsule): Stadium => ({ hw: cap.hx + HERO_SPOT.pad, hh: cap.hy + HERO_SPOT.pad, cy: 540 });
/** The blue's stadium now (the spot, the film's time), or his clearing's before it exists. */
const blueStadium = (f: number, cap: Capsule): Stadium => seamSpotAt(f, cap) ?? clearStadium(cap);

/**
 * The field's type at instant `f` of T7 into `out` (returns the count), screen-fixed on the terminal grid (the drift is the pose's):
 * every cell but his, held, then swirling into its ring, lit by the frame's glow and its rings, dark in his clearing, drained from the
 * edges in; and from the drain of his clearing his =+* in the drained text where his cells were. His own cells are crashHero's.
 * In bridge B (on the program's frames): the CRT's slip on the landing, the tears, the corrupted blocks — hex dumps of the field's own
 * characters, blue blocks, shifted ones — wherever the blue still reaches, and the blue leaking into the type round his spot (the film's time).
 */
export function crashGlyphs(f: number, field: readonly FieldCell[], plan: readonly Slot[], out: Glyph[]): number {
  let n = 0;
  const t = programAt(f);
  const dy = slip(t) + slipRows(t) * T7_GRID.cellH;
  const m = clearing(field);
  const cap = capsuleOf(field);
  const residue = clamp((t - RESIDUE.from) / (RESIDUE.to - RESIDUE.from));
  // WP6: under his blue spot (seamSpot) his clearing and his old cells stay clear; the @ fills in behind its edge as it draws in.
  const clear = (k: number): number => {
    const [x, y] = t7CellCentre(field[k].col, field[k].row);
    return 1 - spotCover(f, cap, x, y + dy);
  };
  const reach = blueStadium(f, cap);
  const leak = leakPx(f);
  const blocks = corruptBlocks(clearStadium(cap));
  const straight = retractU(f);
  const charAt = (row: number) => (col: number): string => {
    const c = field[cellIndex(col, row)];
    return c ? RAMP[c.i] : FILLED;
  };
  field.forEach((cell, k) => {
    if (cell.i <= 0) return;
    if (cell.hero) {
      const a = residue * clear(k);
      if (a > 0) {
        const [x, y] = t7CellCentre(cell.col, cell.row);
        out[n++] = { ch: FILLED, x: X(x), y: Y(y + dy), size: T7_GRID.fontPx, color: DRAINED, alpha: a };
      }
      return;
    }
    const s = plan[k];
    const [x, y] = swirlPosition(t, k, field, plan);
    const p = swirl(t, s.t0);
    // Its colour: its own (dark in the clearing at its old place) → its ring's, lit by the glow at its new place.
    const slot = field[s.to];
    const [sx, sy] = t7CellCentre(slot.col, slot.row);
    const d = capsuleDistance(sx, sy, cap);
    const from = scaleRGB(cell.ink, lerp(1, CLEARING, m[k]));
    const ring = scaleRGB(mixRGB(ringInkAt(plan, k, f), WHITE, whiteAt(d)), glowAt(d) * ringGain(f, d) * lerp(1, CLEARING, m[s.to]));
    const lit = mixRGB(from, ring, smoothstep(0, 1, p));
    const drained = drainedBy(t, drainAt(d, drainJitter(slot.col, slot.row)));
    let color = drained >= 1 ? DRAINED : mixRGB(lit, DRAINED, drained);
    let ch = RAMP[cell.i];
    let gx = x + tearDx(slot.row, t, straight);
    // The corruption (bridge 1.3 on), where the blue still reaches (the inhale takes it back with it).
    const b = leak > 0 ? blockAt(blocks, slot.col, slot.row, t, reach, leak) : null;
    if (b) {
      if (b.kind === 'shift') gx += b.shift * T7_GRID.cellW;
      else {
        ch = hexChar(b, slot.col, charAt(slot.row));
        color = b.kind === 'blue' ? BLUE_TYPE : scaleRGB(color, HEX_INK_GAIN);
      }
    }
    const tint = leakTint(gx, y + dy, f, reach);
    if (tint > 0 && b?.kind !== 'blue') color = leakInk(color, tint);
    if (ch === ' ') return;
    const glyph: Glyph = { ch, x: X(gx), y: Y(y + dy), size: T7_GRID.fontPx, color };
    if (m[s.to] > 0 && f >= SEAM_GLOW.from) glyph.alpha = clear(s.to);
    out[n++] = glyph;
  });
  return n;
}
/**
 * THE FRAME's glints (round 2, D2-CRASH-MUD): six sparkles on the rings — drop 1's galaxy's four-point stars, the soap film's specular
 * glints — twinkling in turn from drop2 8.4 − 3 (layout px; `size` the long ray, `phase` frames into the 14-frame twinkle) until the drain
 * reaches them. Small, warm white, over the type; never on him.
 */
export const GLINTS: readonly { x: number; y: number; size: number; phase: number }[] = [
  { x: 470, y: 262, size: 150, phase: 0 },
  { x: 1480, y: 282, size: 124, phase: 7 },
  { x: 1702, y: 742, size: 164, phase: 3 },
  { x: 312, y: 806, size: 116, phase: 10 },
  { x: 1104, y: 912, size: 134, phase: 5 },
  { x: 846, y: 158, size: 108, phase: 12 },
];
export const GLINT_FROM = DRIFT_FROM;
const GLINT_INK: RGB = [2.2, 2.0, 1.8];
/**
 * A glint's brightness at `f` (0 → 1 → 0 over a short twinkle every 14 frames), gone as the drain reaches its ring; in bridge B the music
 * box's last notes flare the ones still lit (as the bullet time's did: src/shots/bridgeB.ts flareB), on the program's frames.
 */
export function glintLevel(f: number, g: (typeof GLINTS)[number], cap: Capsule): number {
  const t = programAt(f);
  const level = glintAt(clock(f), t, g, cap);
  const flare = flareB(t);
  return flare > 0 ? Math.max(level, 0.9 * flare * glintFade(t, g, cap)) : level;
}
/** How much of a glint the drain has left at program frame `f` (1 until its ring drains). */
const glintFade = (f: number, g: (typeof GLINTS)[number], cap: Capsule): number => 1 - drainedBy(f, drainStart(capsuleDistance(g.x, g.y, cap)));
/** A glint at twinkle-clock instant `t` (the crash clock, or the bullet time's running one) and film frame `f` (for the drain). */
export function glintAt(t: number, f: number, g: (typeof GLINTS)[number], cap: Capsule): number {
  if (t < GLINT_FROM) return 0;
  const u = Math.sin((Math.PI * (t - GLINT_FROM + g.phase)) / GLINT_PERIOD);
  return u * u * glintFade(f, g, cap) * clamp((t - GLINT_FROM) / 2);
}
/** A glint's twinkle: 0 → 1 → 0 every 14 frames. */
export const GLINT_PERIOD = 14;
/** The glints as flat shapes (add, over the type; screen-fixed on the terminal grid like the type). */
export function glints(f: number, field: readonly FieldCell[]): Shape[] {
  const cap = capsuleOf(field);
  const out: Shape[] = [];
  for (const g of GLINTS) {
    const l = glintLevel(f, g, cap);
    if (l <= 0.01) continue;
    const at = { x: X(g.x), y: Y(g.y) };
    out.push({ kind: 'ellipse', ...at, w: 0.5 * g.size * l, h: 0.5 * g.size * l, color: scaleRGB(GLINT_INK, 0.3 * l), soft: 0.25 * g.size * l });
    for (const [len, rot] of [[g.size, 0], [g.size, Math.PI / 2], [0.42 * g.size, Math.PI / 4], [0.42 * g.size, -Math.PI / 4]] as const) {
      out.push({ kind: 'segment', ...at, w: len * (0.4 + 0.6 * l), h: 3.2, rot, color: scaleRGB(GLINT_INK, l), soft: 1.4 });
    }
  }
  return out;
}
/**
 * His (×ω×) through T7: his hot cells, his face filled in deep amber and his glow — on the frozen cells, condensing with them, fading as
 * the crisp face takes over. From the bullet time's landing (WP6) his indigo spot is seamSpot's, first under him: it turns blue (bridge B:
 * on his heart's lub) and closes on him. In bridge B the blue under the type comes with it, all additive (the field layer adds): the
 * blue leaking past the spot, his heart's blue glow, the blue blocks' ground, and the `not responding` veil over the frozen picture.
 */
export function crashHero(f: number, field: readonly FieldCell[], L: OverloadLayout): { under: Shape[]; bold: Glyph[]; rounded: Glyph[] } {
  const h = condense(f);
  const t = programAt(f);
  const cap = capsuleOf(field);
  const seam = seamSpot(f, cap);
  const hero = heroField(field, CRASH, L, { scale: h.scale, cy: h.cy, alpha: 1 - h.crisp, dy: slip(t) + slipRows(t) * T7_GRID.cellH, spot: seam ? 0 : spotAlpha(f) }, HERO_HOT);
  if (!seam) return hero;
  return { ...hero, under: [seam, ...blueUnder(f, cap), ...hero.under] };
}
/** Bridge B's blue under the type at `f` (none before it): the leak's glow, his heart's, the blue blocks' ground, the veil. */
export function blueUnder(f: number, cap: Capsule): Shape[] {
  const out: Shape[] = [];
  const reach = blueStadium(f, cap);
  const leak = leakPx(f);
  const glow = leakGlow(f, reach, SPOT_BLUE);
  if (glow) out.push(glow);
  const heart = heartGlowB(f, reach.cy);
  if (heart) out.push(heart);
  if (leak > 0) {
    const t = programAt(f);
    for (const b of corruptBlocks(clearStadium(cap))) {
      if (b.kind !== 'blue' || t < b.wave - 0.5 || stadiumDistance(b.cx, b.cy, reach) > leak) continue;
      out.push(blockGround(b, 1));
    }
  }
  const veil = veilShape(f);
  if (veil) out.push(veil);
  return out;
}
/** v06's indigo spot, draining with his clearing (drainStart inside his outline). Since WP6 the drain draws seamSpot instead. */
export const spotAlpha = (f: number): number => 1 - drainedBy(programAt(f), drainStart(0));

// ——— WP6 (v07): the blue spot — the seam into the ending (the review, 10-03: the transition from drop 2 into the ending was weak) ————————————————————————————
// v06 drained him into a grey field: his clearing showed as a black pill for five frames while he shrank, then six frames of a dead grey
// still under the digital zero, then the blue screen cut in from the top with a full-screen glyph chatter — three pictures in a quarter
// of a second, no motion carried, no anchor but the small face. Now his spot carries the blue screen in: through the drain it turns from
// indigo to the blue screen's blue and holds his clearing (the black pill is a blue one, the rainbow draining to dim text round it),
// then through the digital zero it inhales onto his crisp face (the wind-up), the dim text filling in behind its edge, and on outro 1.1
// the blue bursts out of it (src/shots/outroBlue.ts BURST): the bullet time's rings of light ran out of him every 6 frames; the blue
// screen is the last ring. The hand-off is outroShared.ts SEAM_SPOT.

/** The blue screen's blue (#1E4FD8), linear: the spot's ink, at `drained` once the drain has tinted it, rising to `held` as it lands. */
export const SPOT_BLUE: RGB = linear(OUTRO_HEX.blue);
/**
 * The spot's clock, on the film's own time (the system's: it moves while the program is frozen). From the bullet time's hand-back (its
 * last half frame, where it is v06's indigo spot exactly) it holds his clearing's size and place; v08 (bridge B): it stays indigo through
 * the landing and turns the blue screen's blue on his heart's lub (`tint`, over `tintFrames`; TINT: half way, the rest on the
 * corruption, when his crisp face takes over), the first of the blue,
 * leaking out of it on the stages after (src/shots/bridgeB.ts leakPx). Then the inhale (INHALE, the bridge's last 12 frames): it draws in
 * onto him (I, a quadratic ease-in: the wind-up before the burst, the last half under the digital zero), taking the leak and the
 * corruption back with it, and lands on outro 1.1 as SEAM_SPOT, brightening `drained` → `held`; the drained text fills in behind its
 * edge (crashGlyphs: a cell under the spot stays clear), so the bridge's last frame is his amber face on a clean blue spot in the dim
 * field: the blue screen's colours, a beat early (H5).
 */
export const SEAM_GLOW = { from: DRAIN.from - 0.5, tint: TINT.from, tintFrames: TINT.frames, inhale: INHALE.from, drained: 0.3, held: 0.5 } as const;
/** The spot's stadium at instant `f` (layout px; null before the hand-back): his clearing's (cap + HERO_SPOT.pad, centre y 540) → SEAM_SPOT. */
export function seamSpotAt(f: number, cap: Capsule): { hw: number; hh: number; cy: number; soft: number; ink: RGB } | null {
  if (f < SEAM_GLOW.from) return null;
  const u = inhaleU(f);
  const step = (at: number): number => smoothstep(0, 1, clamp((f - at + 0.5) / SEAM_GLOW.tintFrames));
  const tint = TINT.first * step(SEAM_GLOW.tint) + (1 - TINT.first) * step(TINT.full);
  return {
    hw: lerp(cap.hx + HERO_SPOT.pad, SEAM_SPOT.hw, u),
    hh: lerp(cap.hy + HERO_SPOT.pad, SEAM_SPOT.hh, u),
    cy: lerp(540, SEAM_SPOT.centre[1], u),
    soft: lerp(HERO_SPOT.soft, SEAM_SPOT.soft, u),
    ink: mixRGB(HERO_SPOT.ink, scaleRGB(SPOT_BLUE, lerp(SEAM_GLOW.drained, SEAM_GLOW.held, u)), tint),
  };
}
/** The spot at instant `f` (null before the drain: v06's spot, heroHalo's): a stadium under him, added to the ground (the field layer adds). */
export function seamSpot(f: number, cap: Capsule): Shape | null {
  const s = seamSpotAt(f, cap);
  return s && { kind: 'rect', x: X(SEAM_SPOT.centre[0]), y: Y(s.cy), w: 2 * s.hw, h: 2 * s.hh, r: s.hh, color: s.ink, alpha: 1, soft: s.soft };
}
/**
 * How much of the spot lies over layout point (x, y) at `f` (its alpha there: 0 at its edge, 1 `soft` inside), eased in over the drain's
 * first 3 frames so nothing pops on the hand-back: his clearing and his old cells stay clear under it instead of filling with the @.
 */
export function spotCover(f: number, cap: Capsule, x: number, y: number): number {
  const s = seamSpotAt(f, cap);
  if (!s) return 0;
  const d = Math.hypot(Math.max(0, Math.abs(x - SEAM_SPOT.centre[0]) - (s.hw - s.hh)), y - s.cy) - s.hh;
  return clamp(-d / s.soft) * clamp((f - SEAM_GLOW.from) / 3);
}
/** The crisp amber (×ω×) his cells condense into: M PLUS Rounded 1c ExtraBold, 440 px, centred (960, 450), fading in over drop2 8.4& + 4 … end − 3. */
export const CRISP_INK: RGB = scaleRGB(INK.amber, 0.7);
/**
 * Set exactly as the ending sets him on outro 1.1 (src/shots/outroLog.ts logHero: T7_CONDENSED.em, the parts typeset with 0.02 em tracking
 * and centred, their middle line on y 450), so drop 2's last frame → outro 1.1 is pixel-continuous.
 */
export function crispFace(f: number, L: OverloadLayout): Glyph[] {
  const a = condense(f).crisp;
  if (a <= 0) return [];
  const parts = [...T7_CONDENSED.face];
  const widths = parts.map((ch) => L.advance.rounded(ch));
  const total = widths.reduce((s, w) => s + w, 0) + 0.02 * (parts.length - 1);
  let x = -total / 2;
  return parts.map((ch, i) => {
    const dx = (x + widths[i] / 2) * T7_CONDENSED.em;
    x += widths[i] + 0.02;
    return { ch, x: X(T7_CONDENSED.centre[0]) + dx, y: Y(T7_CONDENSED.centre[1]), size: T7_CONDENSED.em, color: CRISP_INK, alpha: a };
  });
}

// ——— The camera, the finishing, the sub-frames ————————————————————————————————————————————————————————————————————————————————

/**
 * The view drifts 1.00 → 1.02 over the freeze, the sort and the frame (peaking two frames after the landing, so the frame never stops),
 * and eases back to exactly 1.00 by the program's freeze (bridge 1.4; R12: the ending starts at 1), on the program's frames.
 */
export function driftZoom(f: number): number {
  const c = clock(f);
  if (c < CRASH) return 1;
  if (c < DRAIN_AT + 2) return 1 + 0.02 * flow((c - CRASH) / (DRAIN_AT + 2 - CRASH));
  return 1 + 0.02 * (1 - flow((c - DRAIN_AT - 2) / (END_P - 1 - DRAIN_AT - 2)));
}
export const crashPose = (f: number): Pose => aimPose({ zoom: driftZoom(f), x: 0, y: 0, roll: 0 }, FRONT, FOV);
/**
 * The CRT thunks on with the freeze (curvature 0.02; the ending raises it to 0.045): the tube's surge brightens the frozen frame for a
 * moment (exposure and glow, never white), and its refresh band rolls down the screen at v04's rate (once over its T7) — in bridge B
 * on, three times in all, the last landing on the bridge's last frame, H5's look exactly. The rings glow wide while the frame holds (bloom
 * radius 0.9), and the scanlines ease off so THE FRAME's colour reads; the terminal's own glow returns as the bridge drains it, by the
 * freeze. On the film's own time (the tube refreshes while the picture is stuck); the bridge's glitches pulse its aberration.
 */
export function crashLook(f: number): Look {
  const c = lookClockB(f);
  const t = c - CRASH;
  const surge = t < 0 ? 0 : 0.5 * Math.exp(-t / 2);
  const look = terminalLook(1, surge, bandAt(c), 0.02);
  // The wall sits just under the glow's threshold until the sort lights the rings, then the terminal's own glow returns over the drain.
  const k = flow((c - DRAIN_AT) / (END_P - 1 - DRAIN_AT));
  const calm = clamp((c - SORT.from) / 6) * (1 - k);
  const crt = look.crt ? { ...look.crt, scanlines: lerp(look.crt.scanlines, 0.12, calm) } : undefined;
  const ab = aberrationAt(f);
  return {
    ...look,
    ...(ab > 0 ? { aberration: look.aberration * (1 + ab) } : {}),
    ...(crt ? { crt } : {}),
    // The vignette eases off with the scanlines, so THE FRAME's outer rings read as the film's pink to the corners (round 2).
    vignette: lerp(look.vignette, 0.3, calm),
    bloom: { ...look.bloom, threshold: lerp(0.98, look.bloom.threshold, k), intensity: lerp(1.45, look.bloom.intensity, k), radius: lerp(look.bloom.radius, 0.6, calm) },
  };
}
/**
 * Where the CRT's refresh band is at crash-clock instant `c` (0 top … 1 bottom): rolling at v04's rate from the freeze to the landing (as
 * built), then on, wrapping, so it has rolled three times in all on the bridge's last frame, where it is 0 (H5's look).
 */
export function bandAt(c: number): number {
  const t = c - CRASH;
  if (c >= END - 1) return 0;
  if (c < DRAIN_AT) return clamp(t / (V04_END - 1 - CRASH));
  const at = (DRAIN_AT - CRASH) / (V04_END - 1 - CRASH);
  const u = at + ((3 - at) * (c - DRAIN_AT)) / (END - 1 - DRAIN_AT);
  return u - Math.floor(u);
}
/** Sub-frames: 1 on the held freeze, 64 for the swirl's streaks, 8 on the frame, 16 over the drain and the condense. */
export function crashTemporal(f: number): Temporal {
  const c = clock(f);
  const samples = c < SORT.from ? 1 : c < SORT.to ? 64 : c < DRAIN_AT ? 8 : 16;
  return { samples, shutter: samples === 1 ? 0 : 0.5, persistence: 0 };
}
export const crashSegment = (f: number): Segment => drop2Segment(f);

/**
 * H5, the state the ending starts from on outro 1.1 (sheet §9, as amended): the field all @ in dim text — his former cells too (their
 * hexdump bytes are still the =+* they held at the freeze) — the crisp face, the view at 1; and (WP6) his blue spot behind the face,
 * clear of the @, inhaling onto him: it lands as SEAM_SPOT on outro 1.1, where the blue screen bursts out of it.
 */
export const H5 = {
  face: T7_CONDENSED.face,
  width: T7_CONDENSED.width,
  centre: T7_CONDENSED.centre,
  ink: CRISP_INK,
  field: { ch: FILLED, ink: DRAINED },
  his: { ch: FILLED, ink: DRAINED },
  spot: { ...SEAM_SPOT, ink: scaleRGB(SPOT_BLUE, SEAM_GLOW.held), landsOn: BRIDGE_B_END },
  zoom: 1,
  look: crashLook(BRIDGE_B_END - 1),
} as const;
