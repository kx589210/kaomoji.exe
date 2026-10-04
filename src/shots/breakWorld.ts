// The flat world around the hero, break bars 2–5 (src/score/break.ts FLAT), as pure functions of the frame. Owned by the flat builder (build
// sheet notes/break/break-sheet.md §2.3, §3 break bars 2–5, §4.6, §4.7, §4.9, §4.10). Layout px (1920 × 1080, origin top-left, y
// down), angles in degrees clockwise; the scene converts (src/shots/breakShared.ts). It holds:
//   - the 33 landed blank pieces of glass (LANDED: the fall's landings, from the sheet's exact formulas, Appendix B);
//   - worldAt(f): the SDF world the scene's shader draws — the landed polygons, the pooling morph (from break 2.2, 20 frames: the pieces stream by
//     colour into the four blocks and smooth-min into them, the four smallest into the confetti), the presses, the living hold, the
//     confetti snaps of break bar 3, the diamond wipe (the mint block becomes the ground), the cream square, break bar 5's clean relayout;
//   - the ground, the hang's wash, the shockwave rings, the colour-stack restart wipe (screen) and the glitch slices;
//   - the peekers (one at a time), the shocked faces of the hang, the dancers of break bar 5 with the cat and the guest;
//   - the repeater of break bar 5: the fan, its breaths and stagger-wave, the outline ripple;
//   - flatTemporal(f) and flatSegment(f).
// v2 (build sheet notes/bid2/break-sheet2.md §3, §6.4–§6.5; the design's §5.4): the second half of this file — the floor band that
// tilts like a tray and slides the world into a heap, the yellow pill knocked off its perch, the far blobs of the back depth, the confetti
// on the front depth, the world that re-rolls with his eyes and lands wrong (the tofu block), the bigger sag and the tipping coral, the
// v2 peeks and the spying guest the ripple infects. Every v04 function keeps its v04 result by default (`v2` false): the identity layer.
// Faces come from src/content/castBreak.ts. Plain Node imports it (tests): no three / remotion / react imports.
import { CAT, DANCERS, GUEST_INFECTED, GUEST_SPY as GUEST_SPY_FACE, GUEST_WAVE, SHOCKED } from '../content/castBreak.ts';
import { PEEK_FACES, PEEK_FACES_V2, WAVER } from '../content/break.ts';
import { type RGB, mixRGB } from '../engine/color.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import { SWAP_LEAD, type Segment, type Temporal } from '../engine/temporal.ts';
import {
  BRACKET_LAUNCH,
  CLOSED_HATS,
  CREAM_SQUARE,
  DANCERS_LAND,
  DANCER_SWAPS,
  DIAMOND,
  FAN,
  FAN_BREATHS,
  FAN_FOLD,
  FRIENDS,
  FRIENDS_DUCK,
  GALAXY,
  HANG,
  IMPACT,
  LOCK,
  MATCH_CUT,
  MORPH,
  OPEN_HATS,
  PEEKS,
  PEEK_WAVES,
  POP_OUT,
  PRESSES,
  REVEAL,
  RIPPLE,
  SHOCKED as SHOCKED_AT,
  STRIKES,
  STUTTER,
  STUTTER_END,
  WAVE,
  WIPE,
  WIPE_COVER,
  BREAK_START,
  CONFETTI_SNAPS,
  CALLOUT,
  FAR_BLOBS,
  FLOOR_BAND,
  GUEST_DUCK,
  GUEST_SPY,
  GUEST_WAVE_V2,
  HEAP,
  INFECT,
  INFECT_FLASH,
  PEEKS_V2,
  PILL_DROP,
  POV_SWEEP,
  REROLL,
  SKID,
  TILT,
  TOFU,
} from '../score/break.ts';
import { PIECES, PIECE_LANDING } from './breakFall.ts';
import { SHARDS } from './glass.ts';
import {
  BAR22_BLOCKS,
  BAR25_BLOCKS,
  BLOCK_COLORS,
  BREAK_PALETTE,
  type Block,
  type BlockColor,
  type BreakColor,
  CONFETTI,
  CONFETTI_FORM,
  breathe,
  flatTime,
  frameOf,
  launchL,
  liveTime,
  pop,
  press,
  rotate,
  snap,
  spring,
  tighten,
  DEPTH,
  V2_PALETTE,
  flatCamV2,
  fromDepth,
  impactSquash,
} from './breakShared.ts';

type V2 = readonly [number, number];

// ——— The landed glass (§4.3, §7.1, Appendix B) ————————————————————————————————————————————————————————————————————————————————————

/** A cell's resting outline and centroid in layout px (SHARDS are engine px: origin at the centre, y up). */
export const restCell = (k: number): { pts: V2[]; c: V2 } => {
  const s = SHARDS[k];
  return { pts: s.pts.map(([x, y]) => [x + 960, 540 - y] as const), c: [s.c[0] + 960, 540 - s.c[1]] };
};

export type Landed = { cell: number; color: BlockColor; at: V2; angle: number; pts: readonly V2[]; lands: number };
/**
 * The 33 visible blank pieces as they lie on break 2.1: landed centroid, clockwise angle, outline (layout px), landing frame. They are the
 * fall's PIECE_LANDING (src/shots/breakFall.ts), imported read-only, so both parts land the same pieces in the same places (§7.1).
 */
export const LANDED: readonly Landed[] = PIECE_LANDING.map((l, i) => ({ cell: l.k, color: l.paint, at: l.centroid, angle: l.angle, pts: l.pts, lands: PIECES[i].land }));

// ——— Grading: the hang's wash ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The hang's wash, 0 → 1 over the hang's first 6 frames, held until the restart wipe has covered the frame. */
export const washAt = (f: number): number => (f < HANG || f >= WIPE_COVER ? 0 : clamp((f - HANG) / 6));
/** A colour under the wash: −40 % saturation, then +25 % white. */
export const grade = (c: RGB, w: number): RGB => {
  if (w <= 0) return c;
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const d = mixRGB(c, [l, l, l], 0.4 * w);
  return mixRGB(d, [1, 1, 1], 0.25 * w);
};
const P = (name: BreakColor, f: number): RGB => grade(BREAK_PALETTE[name], washAt(f));

/** The ground: cream; mint once the diamond has covered the frame (break 4.1 + 10); cream again from under the restart wipe's cover. */
export const groundAt = (f: number): 'cream' | 'mint' => (f >= DIAMOND + 10 && f < WIPE_COVER ? 'mint' : 'cream');
export const groundColor = (f: number): RGB => P(groundAt(f), f);

// ——— The SDF world (the scene's shader) ———————————————————————————————————————————————————————————————————————————————————————————

/** Shape kinds of an SDF item: none (polygons only), rounded rect, circle, squiggle, zigzag. */
export type SdfShape = 0 | 1 | 2 | 3 | 4;
/**
 * One item of the world: its field is the smooth-min (radius `k`) of its polygons (indices into WorldFrame.polys) and its shape,
 * drawn in `color` with an `outline` (px, inside the edge) in ink and a hard shadow at `shadow` (px, layout). Items draw in order.
 */
export type SdfItem = {
  /** What it is: a landed piece of glass, a block, a confetto, the cream square. */
  role: 'piece' | 'block' | 'confetti' | 'square';
  colorName: BreakColor;
  color: RGB;
  polys: readonly number[];
  k: number;
  shape: SdfShape;
  /** The shape: centre, half size, corner radius, rotation (degrees clockwise) and scale (about its centre). */
  x: number;
  y: number;
  hx: number;
  hy: number;
  r: number;
  rot: number;
  scale: number;
  outline: number;
  shadow: V2;
  alpha: number;
  /** v2: the block this item is (its colourName changes when the world re-rolls). */
  base?: BlockColor | 'cream';
  /** v2: the slot-machine reel spinning in this block's window (the scene's shader fills it from the strip; `color` is then unused). */
  reel?: Reel;
};
export type WorldFrame = { polys: readonly (readonly V2[])[]; items: readonly SdfItem[] };

/** Which landed cells become the four confetti (the four smallest), in CONFETTI's order. */
const CONFETTI_CELLS: readonly number[] = CONFETTI.map((c) => c.cell);
const SHAPE_OF = { dot: 2, squiggle: 3, zigzag: 4, pill: 1 } as const;
/** A confetto's shape at `at` (layout), turned `rot` degrees, scaled `scale`. */
const confettoShape = (i: number, at: V2, rot: number, scale: number): Pick<SdfItem, 'shape' | 'x' | 'y' | 'hx' | 'hy' | 'r' | 'rot' | 'scale'> => {
  const c = CONFETTI[i];
  // CONFETTI_FORM (breakShared.ts), shared with break bar 6: a line's SDF radius is half its colour stroke plus its ink border.
  const F = CONFETTI_FORM;
  const line = F.stroke / 2 + F.border;
  const base =
    c.kind === 'dot'
      ? { hx: F.dot.r, hy: F.dot.r, r: F.dot.r }
      : c.kind === 'pill'
        ? { hx: F.pill.w / 2, hy: F.pill.h / 2, r: F.pill.h / 2 }
        : c.kind === 'squiggle'
          ? { hx: F.squiggle.half, hy: F.squiggle.amp + line, r: line }
          : { hx: F.zigzag.half, hy: F.zigzag.amp + line, r: line };
  const turn = c.kind === 'pill' ? F.pill.turn : 0;
  return { shape: SHAPE_OF[c.kind], x: at[0], y: at[1], ...base, rot: rot + turn, scale };
};

/** A block's corner radius as drawn (a pill's is half its height). */
const blockItem = (color: BlockColor | 'cream', b: Block, f: number, o: { dx?: number; dy?: number; rot?: number; scale?: number; shadow?: number; x?: number; y?: number } = {}): SdfItem => ({
  role: 'block',
  colorName: color,
  color: P(color, f),
  polys: [],
  k: 0,
  shape: 1,
  x: (o.x ?? b.x) + (o.dx ?? 0),
  y: (o.y ?? b.y) + (o.dy ?? 0),
  hx: b.w / 2,
  hy: b.h / 2,
  r: b.r,
  rot: o.rot ?? b.rot,
  scale: o.scale ?? 1,
  outline: 6,
  shadow: [o.shadow ?? 12, o.shadow ?? 12],
  alpha: 1,
});

/**
 * A struck press (iteration 2, ruling 3): fully down from a quarter frame before its kick (SWAP_LEAD), so the kick's own frame is whole and
 * the frame before untouched; held 2 frames, back up over 8 (F). The kicks the picture used to miss (STRIKES) take it instead of the
 * launched press(), whose first frame showed only a third of the move.
 */
const strike = (t: number): number => (t < -SWAP_LEAD || t >= 10 ? 0 : t < 2 ? 1 : 1 - ease.inOutSine((t - 2) / 8));
/** How far the blocks are pressed into their shadows (0–1) at clock `t`. */
const pressAt = (t: number): number => Math.max(0, ...PRESSES.map((at) => (STRIKES.includes(at) ? strike(t - at) : press(t - at))));
/** The struck 45° confetti tick of a STRIKES kick: 0 → 1 a quarter frame before it, so its frame is whole (ruling 3). */
const tick = (t: number, at: number): number => (t >= at - SWAP_LEAD ? 1 : 0);
/** The pooling spring: 75 % 3 frames into the morph, ≈ 8 % overshoot, settled 20 frames in. */
const pool = (t: number): number => spring(t, 0.63, 0.66, 20);
/**
 * A confetto's turn at clock `t`: the living hold (1° a frame) plus break bar 3's 45° snaps on every 8th, and a struck 45° tick on each of
 * STRIKES (the break 2.2& ghost kick; 3.2&, whose 8th snap it replaces: whole on the kick's frame, ruling 3).
 */
const confettoTurn = (i: number, t: number): number =>
  LIVING_TURN * (t - IMPACT) +
  45 * CONFETTI_SNAPS.filter((at) => !STRIKES.includes(at)).reduce((s, at) => s + snap(t - at, 3), 0) +
  45 * STRIKES.reduce((s, at) => s + tick(t, at), 0) +
  37 * i;
/** The living hold (R1-11): blocks breathe ±2° and ±2 %, confetti turn 1° a frame. */
const BREATH_DEG = 2;
const BREATH_SCALE = 0.02;
const LIVING_TURN = 1;
/** Break bar 5's closed 16ths, which its confetti tick on (15°, a 2-frame snap) and its dancers dip on (R1-03). */
const BAR25_HATS: readonly number[] = CLOSED_HATS.filter((h) => h >= REVEAL && h < MATCH_CUT);

/**
 * The SDF world at instant `f` (layout px): break bar 2–4's landed glass, pooled blocks and confetti, or break bar 5's relayout. Polygons are
 * drawn one by one (each with its own outline and shadow, in landing order) until the morph, then pooled by colour.
 */
export function worldAt(f: number, v2 = false): WorldFrame {
  if (v2) return worldAtV2(f);
  const t = liveTime(f);
  const polys: (readonly V2[])[] = [];
  const items: SdfItem[] = [];
  if (f >= WIPE_COVER) return bar25World(f);
  // Before the morph: the landed polygons as they slapped down, each its own item.
  if (t < MORPH.from) {
    const bob = Math.sin((2 * Math.PI * (t - IMPACT)) / 48);
    LANDED.forEach((l, i) => {
      const dy = 2 * bob * Math.sin(1.7 * i);
      polys.push(l.pts.map(([x, y]) => [x, y + dy] as const));
      items.push({ role: 'piece', colorName: l.color, color: P(l.color, f), polys: [i], k: 0, shape: 0, x: 0, y: 0, hx: 0, hy: 0, r: 0, rot: 0, scale: 1, outline: 6, shadow: [12, 12], alpha: 1 });
    });
    return { polys, items };
  }
  const pr = pressAt(t);
  const morphing = t < MORPH.to;
  // The blocks: break bar 2's places, breathing; the pooling spring grows each out of its centre while its pieces stream in.
  BLOCK_COLORS.forEach((c, ci) => {
    const b = BAR22_BLOCKS[c];
    const grow = morphing ? Math.max(0.02, pool(t - MORPH.from)) : 1;
    const breath = (1 + BREATH_SCALE * breathe(t, ci)) * grow;
    const rot = b.rot + BREATH_DEG * breathe(t, ci + 0.37);
    let item = blockItem(c, b, f, { dx: 8 * pr, dy: 8 * pr, rot, scale: breath, shadow: 12 - 8 * pr });
    // Read at the output frame: its edges cross ~300 px a frame, which any shutter smears past its 6 px ink edge (R1-08); one sharp
    // instant a frame keeps it a hard-edged neo-brutal shape, as the restart wipe's panels are.
    const d = liveTime(tighten(f, 0));
    if (c === 'mint' && d >= DIAMOND) {
      // The diamond wipe: +45°, ×6, to the frame's centre; from break 4.1 + 10 it is the ground. A launch on break 4.1's kick (cubic-out, a frame
      // into it on the kick's own frame, whole by 4.1 + 9), so the kick lands on a shape already off at full speed (integration, v02).
      if (t >= DIAMOND + 10) return; // the sub-frame instant, as groundAt: no sub-frame between the diamond and the mint ground
      const u = ease.outCubic(clamp((d - DIAMOND + 1) / 10));
      item = blockItem(c, b, f, { x: lerp(b.x, 960, u), y: lerp(b.y, 560, u), rot: b.rot + 45 * u, scale: lerp(1, 6, u) });
    }
    if (morphing) {
      // Each piece of this colour streams to the block's centre (L, staggered 0–6 frames by distance, nearest first), shrinking
      // into it; the smooth-min (k 60) pulls liquid necks between them.
      const mine = LANDED.map((l, i) => ({ l, i })).filter(({ l }) => l.color === c && !CONFETTI_CELLS.includes(l.cell));
      const d = mine.map(({ l }) => Math.hypot(b.x - l.at[0], b.y - l.at[1]));
      const [lo, hi] = [Math.min(...d), Math.max(...d)];
      const idx = mine.map(({ l }, j) => {
        const s = hi > lo ? (6 * (d[j] - lo)) / (hi - lo) : 0;
        const u = launchL(t - MORPH.from - s);
        const k = 1 - 0.75 * clamp(u);
        polys.push(l.pts.map(([x, y]) => [lerp(l.at[0], b.x, u) + (x - l.at[0]) * k, lerp(l.at[1], b.y, u) + (y - l.at[1]) * k] as const));
        return polys.length - 1;
      });
      item = { ...item, polys: idx, k: 60 * clamp((t - MORPH.from) / 3) };
    }
    items.push(item);
  });
  // The diamond grows UNDER the other blocks: it is the new ground spreading, not a block covering the world.
  const mi = items.findIndex((i) => i.colorName === 'mint' && i.role === 'block');
  if (liveTime(tighten(f, 0)) >= DIAMOND && mi > 0) items.unshift(...items.splice(mi, 1));
  // The cream square in the mint block's old place (break 4.1e), springing in.
  if (t >= CREAM_SQUARE) {
    const s = launchL(t - CREAM_SQUARE);
    items.push({ ...blockItem('cream', { x: 1650, y: 960, w: 200, h: 200, r: 32, rot: 12 }, f, { scale: s * (1 + BREATH_SCALE * breathe(t, 5)), rot: 12 + BREATH_DEG * breathe(t, 5.37) }), role: 'square', colorName: 'cream' });
  }
  // The confetti: the four smallest pieces stream into them during the morph.
  CONFETTI.forEach((c, i) => {
    const turn = confettoTurn(i, t);
    const grow = morphing ? pop(t - MORPH.from - 6) : 1;
    let item: SdfItem = { role: 'confetti', colorName: c.color, color: P(c.color, f), polys: [], k: 0, ...confettoShape(i, c.at, turn, grow), outline: CONFETTI_FORM.border, shadow: [CONFETTI_FORM.shadow, CONFETTI_FORM.shadow], alpha: 1 };
    if (morphing) {
      const li = LANDED.findIndex((l) => l.cell === c.cell);
      const l = LANDED[li];
      const u = launchL(t - MORPH.from - 2);
      const k = 1 - 0.85 * clamp(u);
      polys.push(l.pts.map(([x, y]) => [lerp(l.at[0], c.at[0], u) + (x - l.at[0]) * k, lerp(l.at[1], c.at[1], u) + (y - l.at[1]) * k] as const));
      const tint = clamp((t - MORPH.from) / 10);
      item = { ...item, color: mixRGB(P(l.color, f), P(c.color, f), tint), polys: [polys.length - 1], k: 30 * clamp((t - MORPH.from) / 3) };
    }
    items.push(item);
  });
  return { polys, items };
}

/** Break bar 5's world: clean blocks springing in from the centre out (coral, mint, yellow, violet), the confetti re-popping, all breathing. */
function bar25World(f: number): WorldFrame {
  const t = f;
  const items: SdfItem[] = [];
  const order: readonly [BlockColor, number][] = [['coral', REVEAL + 2], ['mint', REVEAL + 4], ['yellow', REVEAL + 6], ['violet', REVEAL + 8]];
  for (const c of BLOCK_COLORS) {
    const at = order.find(([o]) => o === c)![1];
    if (t < at) continue;
    const ci = BLOCK_COLORS.indexOf(c);
    items.push(blockItem(c, BAR25_BLOCKS[c], f, { scale: launchL(t - at) * (1 + BREATH_SCALE * breathe(t, ci)), rot: BREATH_DEG * breathe(t, ci + 0.37) }));
  }
  // The confetti re-pop once the blocks are in, 10 frames after the reveal.
  const repop = REVEAL + 10;
  if (t >= repop) {
    // They turn 1° a frame and tick 15° on every closed 16th (R1-03), the way break bar 3's tick on its 8ths.
    const tick = 15 * BAR25_HATS.filter((h) => h > repop).reduce((sum, h) => sum + snap(t - h, 2), 0);
    CONFETTI.forEach((c, i) => {
      items.push({ role: 'confetti', colorName: c.color, color: P(c.color, f), polys: [], k: 0, ...confettoShape(i, c.at25, LIVING_TURN * (t - repop) + tick + 37 * i, pop(t - repop - i)), outline: CONFETTI_FORM.border, shadow: [CONFETTI_FORM.shadow, CONFETTI_FORM.shadow], alpha: 1 });
    });
  }
  return { polys: [], items };
}

/** Where a block is at instant `f` (for things standing on it or hiding behind it): its centre, half size, rotation, scale. */
export function blockAt(f: number, c: BlockColor | 'cream', v2 = false): SdfItem | undefined {
  if (v2) return worldAt(f, true).items.find((i) => (i.role === 'block' || i.role === 'square') && i.base === c);
  return worldAt(f).items.find((i) => (i.role === 'block' || i.role === 'square') && i.colorName === c);
}
/** A point on block `b` in its own frame: (u, v) in −1…1 of its half size, turned and scaled with it. */
export const onBlock = (b: SdfItem, u: number, v: number): [number, number] => {
  const [x, y] = rotate(u * b.hx * b.scale, v * b.hy * b.scale, b.rot);
  return [b.x + x, b.y + y];
};

// ——— Rings ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Ring = { x: number; y: number; r: number; width: number; color: 'ink' | 'white'; alpha: number };
/** The black shockwave of the slap (break 2.1) and the white ring of the iris lock (2.3), in the world. */
export function ringsAt(f: number): Ring[] {
  const out: Ring[] = [];
  const t0 = f - IMPACT;
  if (t0 >= 0 && t0 < 12) out.push({ x: 960, y: 600, r: lerp(150, 1100, ease.outCubic(t0 / 12)), width: 6, color: 'ink', alpha: 1 - clamp((t0 - 6) / 6) });
  const t1 = f - LOCK;
  if (t1 >= 0 && t1 < 8) out.push({ x: 960, y: 560, r: lerp(200, 700, ease.outCubic(t1 / 8)), width: 4, color: 'white', alpha: 1 - clamp((t1 - 4) / 4) });
  return out;
}

// ——— Peekers, the shocked, the dancers ————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A face peeking out (Noto Sans JP Black). `key` is its atlas string (a whole face, or a piece of one that moves on its own);
 * world faces are in layout px and hide behind a block (the scene draws them under the world); `screen` ones come in from the frame's
 * edge in screen px (the scene draws them over the world, fixed to the screen). `shown` is how much of the face is out (0–1); `knock`
 * the ground-coloured knock-out round it (px), so it reads over whatever it overlaps.
 */
export type Peek = {
  face: string;
  key: string;
  x: number;
  y: number;
  size: number;
  rot: number;
  color: 'ink' | 'red';
  screen: boolean;
  shown: number;
  knock: number;
  parts?: { key: string; x: number; y: number; rot: number }[];
};

/**
 * How each peeker comes out (R1-06, R1-13): over a block's top edge (`up`: it rises until its whole face clears the edge), out of a
 * block's side (`side`: it slides out by `out` of its width, its hidden end behind the block), or in from a frame edge (`edge`: screen
 * px, its anchor on the edge, moving along `dir` until `out` of it is in). Each place is clear of the party monitor, the tags, the loose
 * brackets' paths and the tofu box's row, so every face is read whole — eyes and mouth — for at least six frames.
 */
type PeekSpot =
  | { kind: 'up'; block: BlockColor; u: number }
  | { kind: 'side'; block: BlockColor; v: number; dir: 1 | -1; out: number }
  | { kind: 'edge'; at: V2; dir: V2; out: number };
const SPOTS: readonly PeekSpot[] = [
  // ▼・ᴥ・▼ rises over the coral block's top, right of the loose "(" and above the monitor.
  { kind: 'up', block: 'coral', u: 0.72 },
  // ( ° ∀ ° )ﾉﾞ rises over the mint block's top, far from the loop's path, its hand free to wave.
  { kind: 'up', block: 'mint', u: -0.32 },
  // The guest, all of |_￣)) in from the frame's left edge.
  { kind: 'edge', at: [0, 700], dir: [1, 0], out: 1 },
  // (・_・;) out of the violet block's left side, sweat drop and all.
  { kind: 'side', block: 'violet', v: 0.25, dir: -1, out: 0.92 },
  // ┬┴┬┴┤(･_├┬┴┬┴ up from the frame's bottom edge, below his face and clear of the tofu box's row: a whole wall, not a ruler line.
  { kind: 'edge', at: [1070, 1080], dir: [0, -1], out: 1 },
  // (´･_･`) out of the violet block's left side, below tag T5's leader.
  { kind: 'side', block: 'violet', v: 0.72, dir: -1, out: 0.9 },
];
const PEEK_SIZE = 80;
/** Sizes (px): the table-flip peeker comes up bigger (90), so its box-drawing wall reads as a wall, not a ruler line, and its face is big enough to find; it still fits between the monitor and the walking ")". */
const PEEK_SIZES: readonly number[] = [80, 72, 80, 80, 90, 80];
/** A peeker's ink height (ems): the band it must clear to show its whole face. */
const FACE_H = 0.95;
const PEEK_KNOCK = 6;
/** The jp type's advance of a whole face (ems), as the atlas measures it; tests pass a fake. */
export type FaceAdvance = (face: string) => number;
let faceAdvance: FaceAdvance = (s) => 0.62 * [...s].length;
/** The scene hands over the measured advances of the jp atlas (whole-face keys). */
export const setFaceAdvance = (a: FaceAdvance): void => {
  faceAdvance = a;
};
/** The second peeker's waving hand is its own key, so it can turn (the two pieces are content's WAVER). */
export { WAVER };

/**
 * The visible peeker at instant `f` (one at a time): coming out (L, 4 f), bobbing 2 px on the 16ths, going back (cubic-in, 4 f). The
 * guest comes all the way in, his own "|" against the frame's edge.
 */
export function peekAt(f: number, v2 = false): Peek[] {
  const t = flatTime(f);
  // v2: four peeks (the 4.2& and 4.3& peekers cut); the guest moved to 3.2&, gone under the POV's scan-wipe (we are him).
  const peeks = v2 ? PEEKS_V2 : PEEKS;
  const faces = v2 ? PEEK_FACES_V2 : PEEK_FACES;
  for (let i = 0; i < peeks.length; i++) {
    const p = peeks[i];
    const face = faces[i];
    const guest = i === 2;
    const end = guest ? (v2 ? POV_SWEEP.to : STUTTER_END) : p.to + 4;
    if (t < p.from || f >= end) continue;
    const size = PEEK_SIZES[i] ?? PEEK_SIZE;
    const w = faceAdvance(face) * size;
    const h = FACE_H * size;
    const prog = launchL((t - p.from) * 3) * (guest ? 1 : 1 - ease.inCubic(clamp((t - p.to) / 4)));
    const bob = 2 * Math.sin((2 * Math.PI * (t - p.from)) / 6);
    const color = guest ? 'red' : 'ink';
    const s = SPOTS[i];
    if (s.kind === 'edge') {
      // Along its direction from fully outside the frame to `out` of it inside (plus 4 px of air for a face that comes all the way in).
      const len = s.dir[0] !== 0 ? w : h;
      // A face coming up from the bottom edge stands 16 px clear of it; one coming in from a side, 4 px.
      const d = -(len / 2 + 10) + (s.out * len + (s.dir[1] !== 0 ? 26 : 14)) * prog;
      const x = s.at[0] + s.dir[0] * d;
      const y = s.at[1] + s.dir[1] * d + bob;
      return [{ face, key: face, x, y, size, rot: 0, color, screen: true, shown: clamp((d + len / 2) / len), knock: PEEK_KNOCK }];
    }
    const b = blockAt(f, s.block, v2)!;
    let ax: number;
    let ay: number;
    let lx: number;
    let ly: number;
    let shown: number;
    if (s.kind === 'up') {
      // From just hidden under the top edge (its top 6 px below it) to its whole face 8 px above it, along the block's own up.
      [ax, ay] = onBlock(b, s.u, -1);
      const rise = -(h / 2 + 6) + (h + 14) * prog;
      [lx, ly] = [0, -rise - bob];
      shown = clamp((rise + h / 2) / h);
    } else {
      [ax, ay] = onBlock(b, s.dir > 0 ? 0.97 : -0.97, s.v);
      const slide = -(w / 2 + 10) + (s.out * w + 10) * prog;
      [lx, ly] = [s.dir * slide, bob];
      shown = clamp((slide + w / 2) / w);
    }
    const [dx, dy] = rotate(lx, ly, b.rot);
    const peek: Peek = { face, key: face, x: ax + dx, y: ay + dy, size, rot: b.rot, color, screen: false, shown, knock: PEEK_KNOCK };
    if (face.startsWith(WAVER.body)) {
      // ( ° ∀ ° )ﾉﾞ: the hand waves +15° on break 3.1a and −15° on 3.2 (PEEK_WAVES), about its lower end.
      const bw = faceAdvance(WAVER.body) * size;
      const hw = faceAdvance(WAVER.hand) * size;
      const wave = 15 * Math.sin(Math.PI * clamp((t - PEEK_WAVES[0]) / 6)) - 15 * Math.sin(Math.PI * clamp((t - PEEK_WAVES[1]) / 6));
      const [bx, by] = rotate(-w / 2 + bw / 2, 0, b.rot);
      const [hx, hy] = rotate(-w / 2 + bw + hw / 2, 0, b.rot);
      peek.parts = [
        { key: WAVER.body, x: peek.x + bx, y: peek.y + by, rot: b.rot },
        { key: WAVER.hand, x: peek.x + hx, y: peek.y + hy, rot: b.rot + wave },
      ];
    }
    return [peek];
  }
  return [];
}

/** A cast figure. `behind`: drawn under the world (hidden by the blocks); `knock`: the ground-coloured knock-out round it (px). */
export type Figure = { key: string; x: number; y: number; size: number; rot: number; sx: number; sy: number; color: 'ink' | 'red' | 'amber'; behind: boolean; knock: number };
/**
 * The gasp of break 4.4 + 3 (R1-13): four shocked faces pop up into the free band below his frozen face (L, 2 f: up 40 px, 0.6 → 1), a
 * crowd gasping at the hang. They are drawn in front of everything but the screen, each with a knock-out, clear of one another, of
 * his brackets, of the monitor and of every tag and its copies.
 */
export function shockedAt(f: number): Figure[] {
  if (f < SHOCKED_AT || f >= WIPE_COVER) return [];
  // The gasp is the hang's one movement (everything else has stopped): they pop on real time.
  const u = launchL((f - SHOCKED_AT) * 3);
  const spots: readonly V2[] = [
    [839, 919],
    [1212, 783],
    [445, 796],
    [1263, 919],
  ];
  return SHOCKED.map((key, i) => {
    const [x, y] = spots[i];
    const s = 0.6 + 0.4 * u;
    return { key, x, y: y + 40 * (1 - u), size: 72 * s, rot: 0, sx: 1, sy: 1, color: 'ink', behind: false, knock: 6 };
  });
}

/** The dancers of break bar 5 per block: their faces on break 5.3, then on 5.3& (DANCER_SWAPS: the mint pair swap places). The third face of each was 5.4's, before ruling 4 gave 5.4 to the ripple alone. */
const DANCE: readonly { block: BlockColor; u: number; faces: readonly [string, string, string] }[] = [
  { block: 'coral', u: -0.55, faces: [DANCERS.coral[0], DANCERS.coral[2], DANCERS.coral[4]] },
  { block: 'coral', u: 0.55, faces: [DANCERS.coral[1], DANCERS.coral[3], DANCERS.coral[5]] },
  { block: 'mint', u: -0.83, faces: [DANCERS.mint[0], DANCERS.mint[1], DANCERS.mint[2]] },
  { block: 'mint', u: 0.9, faces: [DANCERS.mint[1], DANCERS.mint[0], DANCERS.mint[3]] },
  { block: 'yellow', u: 0, faces: [DANCERS.yellow[0], DANCERS.yellow[1], DANCERS.yellow[1]] },
  { block: 'violet', u: 0, faces: [CAT, CAT, CAT] },
];
const DANCER_SIZE = 52;
/** The open hats' bounce (+14 px up, an 8-frame sine). */
const danceBob = (t: number): number => Math.max(0, ...OPEN_HATS.filter((h) => h < MATCH_CUT).map((h) => (t >= h && t < h + 8 ? 14 * Math.sin((Math.PI * (t - h)) / 8) : 0)));
/** The cream knock-out round every dancer (px), so they read over anything (R1-07). */
const DANCER_KNOCK = 7;
const MINT_SINK = 12;
const MINT_BOUNCE = 8 / 14;

/**
 * The friends of break bar 5, on break 5.3 only (iteration 2, ruling 4: one decoration a beat — the fan has folded into him, the ripple waits for
 * break 5.4): they jump up from behind the block tops on 5.3 (up 60 px over their stand, landing on 5.3e), bounce on 5.3&'s open hat where
 * they change faces, and duck back behind their blocks over break 5.3's last 16th; the guest slides out beside the cat and waves back,
 * forgiven, as he waves (⌒ω⌒)ﾉ, and slides back in with them.
 */
export function dancersAt(f: number, v2 = false): Figure[] {
  if (f < FRIENDS.from || f >= FRIENDS.to) return [];
  const t = f;
  const out: Figure[] = [];
  // The mint block sits right under his ")": its pair stands 12 px lower (feet over the block's top edge, under their knock-outs) and
  // bounces 8 px, so his bracket's tip and its shadow never reach their eyes (R1-07).
  const stand = (b: SdfItem, u: number): [number, number] => {
    const top = b.y - b.hy * b.scale;
    return [b.x + u * b.hx * b.scale, top - 6 - 0.3 * DANCER_SIZE + (b.colorName === 'mint' ? MINT_SINK : 0)];
  };
  // The swap is whole on its frame: taken at the output frame (GUIDE pitfall 3), so no sub-frame shows two poses at once.
  const now = frameOf(f);
  const pose = (faces: readonly [string, string, string]): string => faces[now >= DANCER_SWAPS[0] ? 1 : 0];
  const swapPop = Math.max(0, ...DANCER_SWAPS.map((s) => (t >= s - 0.5 && t < s + 5 ? 0.1 * (1 - clamp((t - s) / 5)) : 0)));
  /** How far they have ducked back behind their blocks (0–1, cubic in over FRIENDS_DUCK). */
  const duck = ease.inCubic(clamp((t - FRIENDS_DUCK.from) / (FRIENDS_DUCK.to - FRIENDS_DUCK.from)));
  DANCE.forEach((d) => {
    const b = blockAt(f, d.block);
    if (!b) return;
    const [sx, sy] = stand(b, d.u);
    // Wholly hidden behind the block's top edge.
    const hidden = sy + DANCER_SIZE * 1.1;
    let y: number;
    let behind = true;
    let squash: [number, number] = [1, 1];
    if (t < DANCERS_LAND) {
      // The jump: up from behind the block, 60 px over the stand, then down onto it on break 5.3e.
      const u = (t - FRIENDS.from) / (DANCERS_LAND - FRIENDS.from);
      y = u < 0.5 ? lerp(hidden, sy - 60, ease.outCubic(u * 2)) : lerp(sy - 60, sy, ease.inCubic((u - 0.5) * 2));
      behind = u < 0.5;
    } else {
      const k = t - DANCERS_LAND;
      const s = k < 8 ? 0.08 * Math.exp(-k / 2.5) * Math.cos(0.9 * k) : 0;
      squash = [1 + s, 1 - s];
      const standing = sy - danceBob(t) * (d.block === 'mint' ? MINT_BOUNCE : 1) + DANCER_SIZE * 0.3 * (1 - squash[1]);
      y = lerp(standing, hidden, duck);
      behind = duck > 0;
    }
    const face = pose(d.faces);
    const scale = 1 + swapPop;
    out.push({ key: face, x: sx, y, size: DANCER_SIZE * scale, rot: 0, sx: squash[0], sy: squash[1], color: 'ink', behind, knock: DANCER_KNOCK });
  });
  // The guest, forgiven: the peeker of break 3.3& slides out from behind the violet block's left side, beside the cat, and waves back.
  // (v2: no forgiveness — he spies and is infected, guestAt.)
  const b = v2 ? undefined : blockAt(f, 'violet');
  if (b) {
    const w = faceAdvance(GUEST_WAVE) * DANCER_SIZE;
    const [ex, ey] = onBlock(b, -1, -0.45);
    const u = launchL((t - WAVE) * 2) * (1 - duck);
    const wave = 10 * Math.sin((2 * Math.PI * (t - WAVE)) / 12) * clamp((t - WAVE) / 4);
    out.push({ key: GUEST_WAVE, x: ex + w / 2 + 10 - (w + 30) * u, y: ey - danceBob(t), size: DANCER_SIZE, rot: wave, sx: 1, sy: 1, color: 'red', behind: true, knock: DANCER_KNOCK });
  }
  return out;
}

// ——— The repeater (break bar 5) ——————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A copy of his face core. `angle` (degrees clockwise) turns it about `pivot`, `scale` grows it about the pivot; `fill`: a coloured
 * copy with an ink outline `stroke` px wide; otherwise an outline only, `stroke` px of colour (on screen, whatever its scale).
 */
export type Copy = { angle: number; color: BlockColor; scale: number; alpha: number; pivot: V2; stroke: number; fill: boolean };
/**
 * The fan's pivot, 10 000 px above his face (R1-07): the copies spread sideways like a hand of cards held from far above, each tilted
 * by a hair. Any tilt drops one end of a 1100 px face by 520·sin θ, and his brackets already end at the friends' heads; at ≤ 1.8° the
 * inner ends dip ≤ 16 px, so no copy reaches a friend standing on a block top, and the spread is calm (the integrator's note).
 */
export const FAN_PIVOT: V2 = [960, -9500];
/** The four pairs' angles, widest first (drawn back to front): ±79 / 158 / 237 / 315 px of spread at his face. */
const FAN_ANGLES: readonly number[] = [1.8, 1.35, 0.9, 0.45];
/** The copies' colours, widest pair first; they chase one pair inward on every 16th (R1-03), as break bar 6's extrude stack does. */
const CHASE: readonly BlockColor[] = ['yellow', 'coral', 'mint', 'violet'];
/** The 16ths since the fan opened, taken at the output frame, so each chase step is whole on its frame. */
const fanStep = (f: number): number => Math.max(0, Math.floor((frameOf(f) - FAN) / 6));
/** Big L (≈ 9 % overshoot). */
const big = (t: number): number => spring(t, 0.6, 0.674, 14);
/** The copies' ink outline: lighter than his own 8 px, so he stays the one subject (R1-06). */
const COPY_STROKE = 4;

/**
 * The fan of break 5.2: eight copies of his face core spreading sideways (±79 / 158 / 237 / 315 px) about a point far above him (big L), their
 * colours chasing on the 16ths, breathing on the open hat, folding back into him over break 5.2's last 16th (FAN_FOLD), so 5.3 is the
 * friends' alone (iteration 2, ruling 4: one decoration a beat; the copies no longer stagger-wave on break 5.3).
 */
export function fanAt(f: number): Copy[] {
  if (f < FAN || f >= FAN_FOLD.to) return [];
  const t = f;
  const breath = 1 + 0.05 * Math.max(0, ...FAN_BREATHS.map((b) => (t >= b && t < b + 8 ? Math.sin((Math.PI * (t - b)) / 8) : 0)));
  const fold = 1 - ease.inOutCubic(clamp((t - FAN_FOLD.from) / (FAN_FOLD.to - FAN_FOLD.from)));
  const open = big(t - FAN);
  const step = fanStep(f);
  const out: Copy[] = [];
  FAN_ANGLES.forEach((a, ai) => {
    const color = CHASE[(ai + step) % CHASE.length];
    for (const s of [1, -1]) out.push({ angle: s * a * open * breath * fold, color, scale: 1, alpha: 1, pivot: FAN_PIVOT, stroke: COPY_STROKE, fill: true });
  });
  return out;
}

/**
 * The outline ripple of break 5.4 (R1-09): four opaque outlines in the four colours, 2 frames apart, each growing 1.0 → 1.45 about his
 * face (cubic-out, 12 f) while its 6 px stroke thins to nothing — no alpha fades, so it stays crisp and in frame.
 */
export function rippleAt(f: number): Copy[] {
  const colors: readonly BlockColor[] = ['yellow', 'violet', 'mint', 'coral'];
  const out: Copy[] = [];
  colors.forEach((color, k) => {
    const t = f - RIPPLE - 2 * k;
    if (t < 0 || t >= 12) return;
    const u = t / 12;
    out.push({ angle: 0, color, scale: 1 + 0.45 * ease.outCubic(u), alpha: 1, pivot: [960, 540], stroke: 6 * (1 - u), fill: false });
  });
  return out;
}

// ——— The colour-stack restart wipe and the glitch (screen) ——————————————————————————————————————————————————————————————————————

/**
 * The four panels, light to dark: in from the left one frame apart; the stack holds the frame covered up to break 5.1, its top three
 * creeping back from the left edge (`creep` px by then: the stack's colours show at the edge, the hold stays alive), then the whole stack
 * launches off together on break 5.1's kick — each trailing edge cubic-out over `exit` frames, the top fastest, so on 5.1 itself his face is
 * clear and a four-colour sliver at the right edge says where it went, gone a frame later (iteration 2, ruling 2: the top three used to peel off
 * over the cover's six frames (WIPE_COVER to break 5.1) and reveal him on the last three, before the kick).
 */
export const PANELS: readonly { color: BlockColor; in: number; out: number; exit: number; creep: number }[] = [
  { color: 'yellow', in: WIPE.from, out: WIPE.to - 1, exit: 1.6, creep: 0 },
  { color: 'mint', in: WIPE.from + 1, out: WIPE.to - 1, exit: 1.5, creep: 20 },
  { color: 'coral', in: WIPE.from + 2, out: WIPE.to - 1, exit: 1.4, creep: 40 },
  { color: 'violet', in: WIPE.from + 3, out: WIPE.to - 1, exit: 1.3, creep: 60 },
];
export type Panel = { color: BlockColor; x0: number; x1: number; leading: boolean };
/**
 * The panels as drawn on instant `f`: one sharp instant per output frame (R1-08). They cross 640 px a frame, which the frame's
 * shutter smeared into soft gradients; read at the output frame their 6 px ink edges and 12 px hard shadows stay hard.
 */
export const wipePanels = (f: number): Panel[] => panelsAt(frameOf(f));
/** The panels at instant `f` (screen px), bottom to top: each spans from its trailing to its leading edge, while any of it is on screen. */
export function panelsAt(f: number): Panel[] {
  const out: Panel[] = [];
  for (const p of PANELS) {
    const x1 = 1938 * ease.inOutCubic(clamp((f - p.in) / 3));
    const crept = p.creep * clamp((f - WIPE_COVER) / (p.out - WIPE_COVER));
    const x0 = crept + (1920 - crept) * ease.outCubic(clamp((f - p.out) / p.exit));
    if (x1 > x0 + 0.5 && x0 < 1919.5 && f >= p.in && f <= WIPE.to) out.push({ color: p.color, x0, x1, leading: f < p.out });
  }
  return out;
}

export type Band = { y0: number; y1: number; dx: number; split: number };
/** The glitch slices (screen px) on output frame `out`: the stutter's four 32nds and the hang's two pairs; none elsewhere. */
export function glitchAt(out: number): Band[] {
  const stutter = STUTTER.findIndex((s) => out >= s && out < s + 3);
  const hang = out === HANG || out === HANG + 1 ? 0 : out === SHOCKED_AT || out === SHOCKED_AT + 1 ? 1 : -1;
  if (stutter < 0 && hang < 0) return [];
  // The stutter's slices are fresh on each of its 32nds (the music repeats a slice there) and settle over the 32nd's other two frames
  // (offsets × 0.7, then × 0.45), so the four repeats read as four hits and no frame of the freeze is dead.
  const k = stutter >= 0 ? out - STUTTER[stutter] : 0;
  const seed = stutter >= 0 ? 7000 + 10 * stutter : 7100 + 10 * hang + (out % 2);
  const settle = [1, 0.7, 0.45][k];
  const n = stutter >= 0 ? 4 + Math.floor(3 * hash(seed, 1)) : 3 + Math.floor(3 * hash(seed, 1));
  const bands: Band[] = [];
  for (let i = 0; i < n; i++) {
    const h = stutter >= 0 ? lerp(12, 90, hash(seed, i, 2)) : lerp(12, 60, hash(seed, i, 2));
    const y0 = lerp(40, 1040 - h, hash(seed, i, 3));
    const mag = stutter >= 0 ? lerp(40, 120, hash(seed, i, 4)) : lerp(20, 60, hash(seed, i, 4));
    bands.push({ y0, y1: y0 + h, dx: (hash(seed, i, 5) < 0.5 ? -1 : 1) * mag * settle, split: stutter >= 0 ? 6 - 2 * k : 4 });
  }
  return bands;
}

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Windows that move fast enough for 32 sub-frames (break-sheet §4.2 "Motion blur"), plus the ☆ toss and the ripple. */
const FAST: readonly (readonly [number, number])[] = [
  [IMPACT, IMPACT + 4],
  [MORPH.from, LOCK + 4],
  [BRACKET_LAUNCH, STUTTER[0]],
  [DIAMOND, DIAMOND + 12],
  [GALAXY.from, GALAXY.to + 10],
  [POP_OUT, POP_OUT + 6],
  [REVEAL, REVEAL + 10],
  [FAN, FAN + 12],
  [WAVE, WAVE + 16],
  [RIPPLE, RIPPLE + 16],
];
/**
 * v2: the travelling camera's fast moves (sheet §6.3): the push to the eye, the iris and the ease back out; the follow up, the drag, the loop, the tilt and the
 * skid into the heap; the scan-wipe and the POV's robotic steps; wide and low; the crash zoom and the pull back; the pull-out; the fan;
 * the size match into C6.
 */
const FAST_V2: readonly (readonly [number, number])[] = [
  [IMPACT, BRACKET_LAUNCH],
  [BRACKET_LAUNCH, STUTTER[0]],
  [DIAMOND, DIAMOND + 12],
  [GALAXY.from - 6, GALAXY.to + 12],
  // The re-roll's reels (keep-fixer round 1): 32 sub-frames blur their spin into one even colour per block.
  [REROLL[0], TOFU],
  [REVEAL, REVEAL + 12],
  [FAN, FAN + 12],
  [CALLOUT.from, CALLOUT.from + 8],
];
/** Sub-frames of the flat part: 16 (shutter 0.5), 32 on the fast moves, 48 on the restart wipe's panels, 1 in the stutter (no blur); v2 adds its camera's fast moves. */
export function flatTemporal(f: number, v2 = false): Temporal {
  const out = frameOf(f);
  if (out >= STUTTER[0] && out < STUTTER_END) return { samples: 1, shutter: 0, persistence: 0 };
  if (out >= WIPE.from && out < WIPE.to) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (FAST.some(([a, b]) => out >= a && out < b)) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (v2 && FAST_V2.some(([a, b]) => out >= a && out < b)) return { samples: 32, shutter: 0.5, persistence: 0 };
  return { samples: 16, shutter: 0.5, persistence: 0 };
}
/** One segment from break 1.1 (the shutter of 2.1's frame reaches back into the fall) to the stutter's end, where time jumps back; one from there to the match cut. */
export const flatSegment = (f: number): Segment => (frameOf(f) < STUTTER_END ? { from: BREAK_START, to: STUTTER_END } : { from: STUTTER_END, to: MATCH_CUT });

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — the world gets messier (the design's §5.4: "the more it repairs, the messier it gets", in the world, not only in the tags)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The floor band (sheet §3 break 2, §6.4): darker cream #EFE0BC with a 3 px ink top edge at 35 %, the settled edge of the paint pool. It
 * runs from world y 900 down past the lowest framing (so the tilted tray never shows the ground under it) and x −600 … 2600 (its tilted
 * ends stay off every frame); the coral and mint stand on it and the torn work orders lie on it. It tilts about (960, 1000).
 */
export const FLOOR = { x0: -600, x1: 2600, top: 900, bottom: 1800, pivot: [960, 1000] as V2, tilt: -10, edge: 3, edgeAlpha: 0.35 } as const;
/** The band rises in with the pool (the morph's spring, from FLOOR_BAND): 0 → 1 (≈ 8 % overshoot). */
export const floorRise = (t: number): number => (t < FLOOR_BAND ? 0 : pool(t - FLOOR_BAND));
/** The floor's tilt (degrees, clockwise +) at clock t: −10 (L) from TILT (3.3, the clap), the camera never rolling. */
export const floorTilt = (t: number): number => (t < TILT ? 0 : FLOOR.tilt * launchL(t - TILT));
/** A floor-local point (the band's own frame, level) at tilt `deg`: where it is in the world. */
export const onFloor = (x: number, y: number, deg: number): [number, number] => {
  const [px, py] = FLOOR.pivot;
  const [rx, ry] = rotate(x - px, y - py, deg);
  return [px + rx, py + ry];
};
/** The band is drawn from FLOOR_BAND until the diamond's mint ground has covered the frame (break 4.1 + 10); then the ground is mint. */
export const floorShown = (f: number): boolean => liveTime(f) >= FLOOR_BAND && f < DIAMOND + 10;
/** The band as drawn at instant f (world layout px): its centre, size and turn, and its top edge (a segment). */
export function floorBandAt(f: number): { x: number; y: number; w: number; h: number; rot: number; edge: [V2, V2]; rise: number } | null {
  if (!floorShown(f)) return null;
  const t = liveTime(f);
  const rise = floorRise(t);
  const deg = floorTilt(t);
  const top = FLOOR.top + 260 * (1 - rise);
  const [cx, cy] = onFloor((FLOOR.x0 + FLOOR.x1) / 2, (top + FLOOR.bottom) / 2, deg);
  const a = onFloor(FLOOR.x0, top, deg);
  const b = onFloor(FLOOR.x1, top, deg);
  return { x: cx, y: cy, w: FLOOR.x1 - FLOOR.x0, h: FLOOR.bottom - top, rot: deg, edge: [a, b], rise };
}

/** The skid (ease-in quad over SKID) that piles the floor into a heap at its low end, landing on HEAP. */
export const skidE = (t: number): number => (t < SKID.from ? 0 : clamp((t - SKID.from) / (SKID.to - SKID.from)) ** 2);
/**
 * Where the coral and the mint end up in the heap (floor-local offsets from their bar-2 places): the coral 120 px downhill (and 10 px more
 * when the mint slams into it), the mint all the way across, 1040 px, riding 30 px up the coral's flank and tumbling +16°.
 */
export const HEAP_OFFSET = { coral: { dx: -120, dy: 0, rot: 0, knock: -10 }, mint: { dx: 610 - 1650, dy: -30, rot: 16, knock: 0 } } as const;
/** The hang's extra sag of the world (v2: the world sags 60 px, he 20 — the camera's 20 plus this 40), ease-in over 12 frames, on real time. */
export const hangSag = (f: number): number => (f < HANG || f >= WIPE_COVER ? 0 : 40 * ease.inCubic(clamp((f - HANG) / 12)));
/** The crooked coral tips over 30° more (ease-in) about its low corner when everything hangs (mess 4). */
export const coralTip = (f: number): number => (f < HANG || f >= WIPE_COVER ? 0 : -30 * ease.inCubic(clamp((f - HANG) / 12)));

/** A floor block's pose (coral or mint) at clock t: its bar-2 item moved along the band into the heap and turned with the band. */
function onTheFloor(it: SdfItem, c: 'coral' | 'mint', t: number, deg: number): SdfItem {
  const o = HEAP_OFFSET[c];
  const e = skidE(t);
  const knock = t >= HEAP ? o.knock * ease.outCubic(clamp((t - HEAP) / 4)) : 0;
  const [x, y] = onFloor(it.x + o.dx * e + knock, it.y + o.dy * e, deg);
  // The heap lands (I): both squash 1.06 / 0.94 along the slide on HEAP and spring back.
  const [sa, sc] = impactSquash(t - HEAP);
  return { ...it, x, y, rot: it.rot + deg + o.rot * e, hx: it.hx * sa, hy: it.hy * sc };
}

/** The yellow pill knocked off its perch by the lock's ring (mess 1): 140 px down-right, turning −20° (ease-in), landing (I) on PILL_DROP.to; its shadow lifts and re-forms. */
function pillDrop(it: SdfItem, t: number): SdfItem {
  if (t < PILL_DROP.from) return it;
  const u = clamp((t - PILL_DROP.from) / (PILL_DROP.to - PILL_DROP.from));
  const e = u * u;
  const lift = 12 * Math.sin(Math.PI * u);
  const [sa, sc] = impactSquash(t - PILL_DROP.to);
  return { ...it, x: it.x + 99 * e, y: it.y + 99 * e, rot: it.rot - 20 * e, hx: it.hx * sa, hy: it.hy * sc, shadow: [it.shadow[0] + lift, it.shadow[1] + lift] };
}

/**
 * The world's colours re-roll with his eyes (mess 3) and land wrong on TOFU: yellow ↔ violet swapped, the coral as it was, the cream square a
 * tofu block. The landed fill a block wears at output frame `out`; before TOFU it is the block's own (the reels below draw the spin).
 */
export function rerollColor(base: BlockColor | 'cream', out: number): BlockColor | 'cream' {
  if (out < TOFU || out >= WIPE_COVER) return base;
  return base === 'yellow' ? 'violet' : base === 'violet' ? 'yellow' : base;
}
/**
 * The re-roll as a slot machine (keep-fixer round 1, review rev1-break REROLL-BLINK, 2026-10-02): each block is the window of a reel — a
 * vertical strip of colour symbols, two to a window, divided by ink lines and shaded like a drum — that spins down from REROLL[0], slows
 * (its speed falling quadratically to `crawl` symbols a frame) and scrolls the landing colour in over the last two frames, stopping on
 * TOFU's kick with a clunk (it runs on past the stop and is pulled back: ζ 0.55, ω 1.6 rad/f, settled by TOFU + REEL.settle). Read on the
 * sub-frame instant, so 32 sub-frames blur the spin.
 *
 * Photosensitivity (keeps ruling I-1's rule, not its blink): every spin colour of a reel has the block's own lightness (relative luminance
 * within 0.03: the light reel yellow / sky / lilac 0.677–0.679, the dark violet / blue / coral 0.323–0.336, the pale cream / butter / ice
 * 0.849–0.899), so a scrolling reel holds its block's light; the one light ↔ dark change is the landing, once per block. And no reel ever
 * shows the ground's mint (I-1's yellow ↔ mint partner made the pill vanish on the mint ground twice).
 */
export const REEL = { from: REROLL[0], land: TOFU, settle: 8, crawl: 0.85, line: 6, perWindow: 2 } as const;
type ReelColor = BlockColor | 'cream' | 'reelSky' | 'reelLilac' | 'reelBlue' | 'reelIce' | 'reelButter';
/** Each reel's three spin colours (symbols 0, 1, 2, 0, …: symbol 0 is the block's own), its landing colour (= rerollColor on TOFU) and how many symbols it travels. */
export const REELS: Readonly<Record<BlockColor | 'cream', { strip: number; spin: readonly [ReelColor, ReelColor, ReelColor]; land: BlockColor | 'cream'; symbols: number }>> = {
  yellow: { strip: 0, spin: ['yellow', 'reelSky', 'reelLilac'], land: 'violet', symbols: 13 },
  violet: { strip: 1, spin: ['violet', 'reelBlue', 'coral'], land: 'yellow', symbols: 15 },
  coral: { strip: 2, spin: ['coral', 'violet', 'reelBlue'], land: 'coral', symbols: 12 },
  cream: { strip: 3, spin: ['cream', 'reelIce', 'reelButter'], land: 'cream', symbols: 14 },
  mint: { strip: -1, spin: ['mint', 'mint', 'mint'], land: 'mint', symbols: 0 },
};
/**
 * A reel in an item's window: which strip; its position s (symbols travelled: a point y below the window's centre, the window H tall, shows
 * symbol ⌊s − y·perWindow/H + ½⌋; the first window, symbols ≤ 1, is the block's own colour); `land`, the first symbol of the landing colour
 * (at rest, s = symbols, the whole window is it); the drum's shading and lines, 0–1.
 */
export type Reel = { strip: number; s: number; land: number; shade: number };
/** The reel of block `base` at instant f, or null when it is not spinning (the mint is the ground, not a reel). */
export function reelAt(base: BlockColor | 'cream', f: number): Reel | null {
  const r = REELS[base];
  if (r.strip < 0 || f < REEL.from || f >= REEL.land + REEL.settle) return null;
  const T = REEL.land - REEL.from;
  const n = r.symbols;
  const v1 = REEL.crawl;
  // Speed v1 + (v0 − v1)(1 − t/T)²: s(T) = v1·T + (v0 − v1)·T/3 = n.
  const v0 = v1 + (3 * (n - v1 * T)) / T;
  let s: number;
  if (f < REEL.land) {
    const t = f - REEL.from;
    s = v1 * t + ((v0 - v1) * T * (1 - (1 - t / T) ** 3)) / 3;
  } else {
    // The clunk: on past the stop at the crawl's speed, pulled back (ζ 0.55, ω 1.6 rad/f), exactly n from REEL.settle.
    const t = f - REEL.land;
    const w = 1.6;
    const z = 0.55;
    const wd = w * Math.sqrt(1 - z * z);
    s = n + (v1 / wd) * Math.exp(-z * w * t) * Math.sin(wd * t) * (1 - smooth01((t - 0.6 * REEL.settle) / (0.4 * REEL.settle)));
  }
  // The drum's shading fades in over the first 2 frames and out over the clunk.
  const shade = clamp((f - REEL.from) / 2) * (1 - clamp((f - REEL.land) / REEL.settle));
  return { strip: r.strip, s, land: n - 1, shade };
}
const smooth01 = (u: number): number => {
  const v = clamp(u);
  return v * v * (3 - 2 * v);
};
/** The four strips' colours (spin 0, 1, 2, landing) at instant f, graded by the hang's wash: 16 linear RGBs in strip order. */
export function reelColors(f: number): RGB[] {
  const of = (c: ReelColor): RGB => grade(c in V2_PALETTE ? V2_PALETTE[c as keyof typeof V2_PALETTE] : BREAK_PALETTE[c as BreakColor], washAt(f));
  const out: RGB[] = [];
  for (const base of ['yellow', 'violet', 'coral', 'cream'] as const) {
    const r = REELS[base];
    out.push(...r.spin.map(of), of(r.land));
  }
  return out;
}
/** The cream square is a tofu block from TOFU to the restart: its ink X, corner to corner (world, drawn over the world). */
export function tofuCross(f: number): [V2, V2][] {
  if (frameOf(f) < TOFU || f >= WIPE_COVER) return [];
  const b = blockAt(f, 'cream', true);
  if (!b) return [];
  const k = 0.74;
  return [
    [onBlock(b, -k, -k), onBlock(b, k, k)],
    [onBlock(b, k, -k), onBlock(b, -k, k)],
  ];
}

/**
 * Bar 5's mint squiggle in v2 (world layout px, where the reference camera shows it): v04's (1260, 140) is inside the bigger guest's spot
 * (keep-fixer round 1, F5), so it re-pops between the ink dot and him, ≥ 40 px clear of his face as it turns.
 */
export const SQUIGGLE_V2: V2 = [800, 85];
/** The reference cameras the front-depth confetti are laid out from (they sit exactly where v04 put them under these, and parallax from there). */
const CONFETTI_REF = { bar2: MORPH.from, bar5: REVEAL + 10 } as const;
/** A confetto on the front depth (z +600), drawn on the world plane where that plane shows it now (fromDepth), sized and shadowed to match. */
function frontConfetto(it: SdfItem, f: number, ref: number, weight: number): SdfItem {
  if (weight <= 0) return it;
  const r = flatCamV2(ref);
  const k = fromDepth(r, DEPTH.front, r.cx, r.cy).s;
  // Its place on the front plane: the point that the reference camera shows where v04 drew it.
  const qx = r.cx + (it.x - r.cx) / k;
  const qy = r.cy + (it.y - r.cy) / k;
  const d = fromDepth(flatCamV2(f), DEPTH.front, qx, qy);
  const s = lerp(1, d.s / k, weight);
  return { ...it, x: lerp(it.x, d.x, weight), y: lerp(it.y, d.y, weight), scale: it.scale * s, shadow: [it.shadow[0] * s, it.shadow[1] * s] };
}

/**
 * The v2 world at instant f: v04's (the landed glass, the morph, the blocks breathing and pressing, the confetti, the cream square, bar 5's
 * relayout), with the mess on top — the pill drop, the tilt and the heap, the diamond leaping out of the heap, the re-roll and the tofu
 * block, the sag and the tip — and the confetti on the front depth. Items keep their `base` block (their colour may re-roll).
 */
function worldAtV2(f: number): WorldFrame {
  const w = worldAt(f);
  const t = liveTime(f);
  if (f >= WIPE_COVER) {
    const items = w.items.map((it) => {
      if (it.role !== 'confetti') return { ...it, base: it.colorName as BlockColor };
      // Bar 5's mint squiggle re-pops left of the guest's spot (keep-fixer round 1, F5): where v04 put it, it hung into his bigger face.
      const at = it.shape === SHAPE_OF.squiggle ? { x: SQUIGGLE_V2[0], y: SQUIGGLE_V2[1] } : {};
      return frontConfetto({ ...it, ...at }, f, CONFETTI_REF.bar5, 1);
    });
    return { polys: w.polys, items };
  }
  if (t < MORPH.from) return w;
  const out = frameOf(f);
  const deg = floorTilt(t);
  const sag = hangSag(f);
  const d = liveTime(tighten(f, 0));
  const items = w.items.map((it0): SdfItem => {
    const base = (it0.role === 'square' ? 'cream' : it0.colorName) as BlockColor | 'cream';
    let it: SdfItem = { ...it0, base };
    if (it.role === 'confetti') {
      // The confetti fly up off the pool to the front depth as they form (the morph), and stay there.
      it = frontConfetto(it, f, CONFETTI_REF.bar2, clamp((t - MORPH.from) / (MORPH.to - MORPH.from)));
      return sag > 0 ? { ...it, y: it.y + sag } : it;
    }
    if (it.role === 'block' && base === 'yellow') it = pillDrop(it, t);
    if (it.role === 'block' && base === 'coral') {
      it = onTheFloor(it, 'coral', t, d >= DIAMOND ? FLOOR.tilt : deg);
      const tip = coralTip(f);
      if (tip !== 0) {
        // About its low corner (its own lower-left): the corner stays, the block turns over it.
        const [cx, cy] = onBlock(it, -1, 1);
        const [rx, ry] = rotate(it.x - cx, it.y - cy, tip);
        it = { ...it, x: cx + rx, y: cy + ry, rot: it.rot + tip };
      }
    }
    if (it.role === 'block' && base === 'mint') {
      if (d < DIAMOND) it = onTheFloor(it, 'mint', t, deg);
      else {
        // C4: the mint leaps out of the heap — spinning +45°, ×8 (wide and low needs more than v04's ×6) — to the frame's centre, and
        // becomes the ground. Read at the output frame, as v04's diamond (one sharp instant a frame).
        const h = onTheFloor(blockItem('mint', BAR22_BLOCKS.mint, f), 'mint', DIAMOND - 1e-3, FLOOR.tilt);
        const u = ease.outCubic(clamp((d - DIAMOND + 1) / 10));
        it = { ...it, x: lerp(h.x, 960, u), y: lerp(h.y, 560, u), hx: BAR22_BLOCKS.mint.w / 2, hy: BAR22_BLOCKS.mint.h / 2, rot: h.rot + 45 * u, scale: lerp(1, 8, u) };
      }
    }
    const fill = rerollColor(base, out);
    if (fill !== base) it = { ...it, colorName: fill, color: P(fill, f) };
    // The slot machine (REEL): read on the sub-frame instant, so the spin blurs.
    const reel = it.role === 'block' || it.role === 'square' ? reelAt(base, f) : null;
    if (reel) it = { ...it, reel };
    return sag > 0 ? { ...it, y: it.y + sag } : it;
  });
  return { polys: w.polys, items };
}

/** A far blob of the back depth (z −900): layout px on its own plane, a pale tint of a block colour, its 3 px ink edge at 35 %, no shadow. */
export type Blob = { x: number; y: number; w: number; h: number; r: number; color: RGB; edge: RGB; z: number };
/**
 * The three far blobs (sheet §6.5): pale yellow 900 × 420 (r 120), violet 520 (r 140), a mint pill 1100 × 300, placed (on their own plane)
 * for bar 4's wide frame, none behind the monitor. They rise in on FAR_BLOBS (L, 12 f, staggered 2 f) and stay to the cut: the back of
 * the world, which the travelling camera slides past at ≈ 0.77× the speed of the middle.
 */
export const FAR_BLOB_LAYOUT = [
  { tint: 'blobYellow', x: 420, y: 300, w: 900, h: 420, r: 120 },
  { tint: 'blobViolet', x: 1900, y: 260, w: 520, h: 520, r: 140 },
  { tint: 'blobMint', x: 1560, y: 1180, w: 1100, h: 300, r: 150 },
] as const;
export function farBlobsAt(f: number): Blob[] {
  if (f < FAR_BLOBS || f >= MATCH_CUT) return [];
  const wash = washAt(f);
  const out: Blob[] = [];
  FAR_BLOB_LAYOUT.forEach((b, i) => {
    const t = f - FAR_BLOBS - 2 * i;
    if (t < 0) return;
    const u = launchL(t);
    const color = grade(V2_PALETTE[b.tint], wash);
    out.push({ x: b.x, y: b.y + 320 * (1 - u), w: b.w * (0.7 + 0.3 * u), h: b.h * (0.7 + 0.3 * u), r: b.r, color, edge: mixRGB(color, P('ink', f), FLOOR.edgeAlpha), z: DEPTH.back });
  });
  return out;
}


// ——— The guest, spying and infected (v2, sheet §3 break 5; keep-fixer round 1, review rev1-break F5) ———————————————————————————————————

/**
 * The guest's em and his spot (world layout px): high in the top band between the dot and the violet block, his feet clear of the hero's
 * head (world y 352 at its tallest), where the ripple's last outlines (×1.36–1.45, top edge at world y 322–308) reach his chin. Keep-fixer
 * round 1 (F5): the first build drew him at em 112 by the violet block from the jp font's glyphs, so (￣▽￣) read as hairline ￣ bars and
 * an outlined ▽ in the frame's corner while (*≧ω≦*) filled the frame; he is now a sticker 1.4× that size, nearer the centre.
 */
export const GUEST_V2 = { size: 156, x: 1180, y: 236 } as const;
/** His sticker style (the hero's language, a size down): red #FF4A1C, a 5 px ink outline, an 8 px ink hard shadow (screen px); the infection's amber halo outside the ink. */
export const GUEST_STICKER = { outline: 5, shadow: 8, halo: 12 } as const;
/**
 * His face, built (ems about his centre; y down): "(" and ")" from Noto Sans JP Black; the ￣ eyes as capsules 12 px thick inside their
 * outline; the ▽ as a filled triangle (the font's ▽ is a hairline outline); once infected, the hero's own ω (M PLUS Rounded) in amber,
 * where the ▽ was; his ノ hand beside ")".
 */
export const GUEST_FACE = {
  open: [-1.3, 0],
  close: [1.3, 0],
  eyes: { y: -0.25, from: 0.42, to: 0.95, core: 13 },
  mouth: [
    [-0.24, -0.02],
    [0.24, -0.02],
    [0, 0.38],
  ],
  omega: { at: [0, 0.1], size: 0.85 },
  hand: { at: [1.62, 0.3], arm: 0.35 },
} as const;
/** The keys he is drawn with: the jp atlas's brackets and hand, the hero atlas's ω. */
export const GUEST_PIECES = { open: '(', close: ')', mouth: 'ω', hand: 'ノ' } as const;
/** A piece of him: a glyph (jp or hero font), an eye (a capsule from a to b, `width` thick with its outline), the mouth (a triangle). */
export type GuestPiece =
  | { kind: 'glyph'; font: 'jp' | 'hero'; key: string; x: number; y: number; size: number; rot: number; color: 'red' | 'amber' }
  | { kind: 'bar'; a: V2; b: V2; width: number; color: 'red' }
  | { kind: 'tri'; pts: readonly V2[]; color: 'red' };
/** One ring of the infection's burst (world px): centre, outer radius, line width, alpha. */
export type GuestRing = { x: number; y: number; r: number; width: number; alpha: number };
/** One amber spark ✧ of the burst (world px): place, size (px), turn (degrees clockwise). */
export type GuestSpark = { x: number; y: number; size: number; rot: number };
/** The guest at an instant: his pieces; `halo` (0 or 1) whether the infection's amber flash is on him; the burst's rings and sparks. */
export type GuestFrame = { pieces: GuestPiece[]; halo: number; rings: GuestRing[]; sparks: GuestSpark[]; x: number; y: number; size: number };

/** The ω's pop on INFECT: 0.6 → 1.3 → 1 over 5 frames (cubic out to the peak in 2, sine back in 3); 0 before. */
export const infectPop = (t: number): number => {
  if (t < 0) return 0;
  if (t < 2) return 0.6 + 0.7 * ease.outCubic(t / 2);
  if (t < 5) return 1.3 - 0.3 * ease.inOutSine((t - 2) / 3);
  return 1;
};
/** The whole face's jolt on INFECT (I's squash, 1.06 / 0.94): he is hit. */
const infectJolt = (t: number): [number, number] => impactSquash(t);

/**
 * The guest, the antivirus's avatar (v2, sheet §3 break 5): red (￣▽￣) slides out from behind the violet block's left edge on 5.3 (L at
 * 1.5×, leaning into the slide) and spies, bobbing 4 px a beat; the ripple's outline nearest him flashes amber (the scene) and so does he
 * over INFECT_FLASH — an amber halo outside his ink, whole on each frame (ruling R-F3); on INFECT his ▽ becomes the hero's amber ω, popping
 * 0.6 → 1.3 → 1 while his face takes the hit (1.06 / 0.94) and an amber burst rings out (two rings, five sparks): the infection is its own
 * beat after the ripple's flash; on 5.4& + 3 his ノ comes up and waves once (+15° and back): (￣ω￣)ノ; then he ducks back behind the
 * block (cubic in) and is gone by GUEST_SPY.to. He is drawn behind the world (the block hides him as he slides).
 */
export function guestAt(f: number): GuestFrame | null {
  if (f < GUEST_SPY.from || f >= GUEST_SPY.to) return null;
  const S = GUEST_V2.size;
  const F = GUEST_FACE;
  const out = frameOf(f);
  const infected = out >= INFECT;
  const halfW = (F.hand.at[0] + 0.3) * S;
  const hidden = 1560 + halfW + 12;
  const comeOut = launchL((f - GUEST_SPY.from) * 1.5);
  const duck = ease.inCubic(clamp((f - GUEST_DUCK.from) / (GUEST_DUCK.to - GUEST_DUCK.from)));
  const x = lerp(hidden, GUEST_V2.x, comeOut * (1 - duck));
  const y = GUEST_V2.y + 4 * Math.sin((2 * Math.PI * (f - GUEST_SPY.from)) / 24);
  // He leans into the slide: −8° at full speed (toward his motion), level at rest.
  const v = (lerp(hidden, GUEST_V2.x, launchL((f + 0.5 - GUEST_SPY.from) * 1.5) * (1 - duck)) - lerp(hidden, GUEST_V2.x, launchL((f - 0.5 - GUEST_SPY.from) * 1.5) * (1 - duck)));
  const lean = clamp(v / 120, -1, 1) * 8;
  const halo = out >= INFECT_FLASH.from && out < INFECT_FLASH.to ? 1 : 0;
  // The hit: a squash about his centre on INFECT (taken a quarter frame early, as the ω's pop, so INFECT's whole shutter shows it).
  const [jx, jy] = infected ? infectJolt(f - INFECT + SWAP_LEAD) : [1, 1];
  const at = (u: number, w: number): V2 => {
    const [rx, ry] = rotate(u * S * jx, w * S * jy, lean);
    return [x + rx, y + ry];
  };
  const pieces: GuestPiece[] = [];
  const glyph = (font: 'jp' | 'hero', key: string, p: V2, size: number, color: 'red' | 'amber', rot = 0) => pieces.push({ kind: 'glyph', font, key, x: p[0], y: p[1], size, rot: lean + rot, color });
  glyph('jp', GUEST_PIECES.open, at(F.open[0], F.open[1]), S, 'red');
  glyph('jp', GUEST_PIECES.close, at(F.close[0], F.close[1]), S, 'red');
  for (const side of [-1, 1]) pieces.push({ kind: 'bar', a: at(side * F.eyes.from, F.eyes.y), b: at(side * F.eyes.to, F.eyes.y), width: F.eyes.core, color: 'red' });
  if (!infected) pieces.push({ kind: 'tri', pts: F.mouth.map(([u, w]) => at(u, w)), color: 'red' });
  // The infection's beat is read a quarter of the frame's shutter wide (the ripple's rule, R1-09): the pop and the burst stay crisp shapes.
  const crisp = tighten(f, 0.25);
  if (infected) glyph('hero', GUEST_PIECES.mouth, at(F.omega.at[0], F.omega.at[1]), F.omega.size * S * Math.max(0.01, infectPop(crisp - INFECT + SWAP_LEAD)), 'amber');
  if (f >= GUEST_WAVE_V2.from) {
    // ノ: up on the wave, +15° and back about its lower end (the forgiven guest's wave of v04, now the infected one's).
    const u = clamp((f - GUEST_WAVE_V2.from) / (GUEST_WAVE_V2.to - GUEST_WAVE_V2.from));
    const rot = 15 * Math.sin(Math.PI * u);
    const up = Math.max(0.01, Math.min(1, launchL((f - GUEST_WAVE_V2.from) * 2)));
    const [hx, hy] = at(F.hand.at[0], F.hand.at[1]);
    const a = ((rot + lean) * Math.PI) / 180;
    const arm = F.hand.arm * S;
    glyph('jp', GUEST_PIECES.hand, [hx + Math.sin(a) * arm, hy - Math.cos(a) * arm], S * up, 'red', rot);
  }
  // The burst out of his new ω: two amber rings (the second 2 frames behind) and five sparks, over 12 frames.
  const rings: GuestRing[] = [];
  const sparks: GuestSpark[] = [];
  const t = crisp - INFECT;
  if (t >= 0 && t < 12) {
    const [cx, cy] = at(F.omega.at[0], F.omega.at[1]);
    const ring = (t0: number, r0: number, r1: number, w0: number, w1: number, dur: number) => {
      const u = (t - t0) / dur;
      if (u < 0 || u >= 1) return;
      rings.push({ x: cx, y: cy, r: lerp(r0, r1, ease.outCubic(u)), width: lerp(w0, w1, u), alpha: 1 - clamp((u - 0.55) / 0.45) });
    };
    ring(0, 0.3 * S, 1.9 * S, 16, 3, 10);
    ring(2, 0.3 * S, 1.35 * S, 9, 2, 9);
    for (let k = 0; k < 5; k++) {
      const ang = ((-160 + 70 * k) * Math.PI) / 180;
      const u = clamp(t / 11);
      const d = lerp(0.55, 1.55, ease.outCubic(u)) * S;
      const size = 0.42 * S * (t < 3 ? ease.outCubic(t / 3) : 1 - ease.inCubic(clamp((t - 6) / 6)));
      if (size > 0.5) sparks.push({ x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d, size, rot: 90 * u + 37 * k });
    }
  }
  return { pieces, halo, rings, sparks, x, y, size: S };
}
/** Every key the v2 guest is drawn with from the jp atlas (the hero atlas holds his ω and the burst's ✧). */
export const GUEST_KEYS: readonly string[] = [GUEST_PIECES.open, GUEST_PIECES.close, GUEST_PIECES.hand];
/** The cast's faces he is built as: (￣▽￣) spying, (￣ω￣)ノ infected (src/content/castBreak.ts). */
export const GUEST_FACES = [GUEST_SPY_FACE, GUEST_INFECTED] as const;
