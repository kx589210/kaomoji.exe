// The antivirus in the flat bars (break 2–5, v2): its hand and what it writes, as pure functions of the frame. Owned by the flat builder
// (build sheet notes/bid2/break-sheet2.md §3, §5, §9; the design notes/extend/interlude-final.md §5.2–§5.6 and its widget
// extend/iw/src/a.js, b.js). The story bible: the "repair" was never a repair — the antivirus is taking him apart. Red #FF4A1C is only it.
//   - the red cursor (its hand: a 72 px arrow, 4 px ink stroke, (6, 6) shadow), on the screen: the iris marquee's rotate, the bracket's
//     drag and slam, T3's click, the re-roll's reels and the delete, the frenzy's three cursors frozen into busy-spinners, the selection;
//   - the marquees (screen, marching ants): the iris selection of 2.2 that he spirals out of (its dashes scatter), and the selection of
//     5.4& that C6 carries into the graph editor (selectMarquee: the graph builder draws the same, pixel for pixel);
//   - the work orders T0–T7 (world tags: red mono on white, an ink ID chip each — T0 → T9 spell his signature) and their tears: the halves
//     flip and flutter down onto the floor band and stay there as litter, sliding with the tilt into the heap, until the restart wipe;
//   - the POV of 3.3& → 3.4& (its schedule: the scan-wipe, the reticle's locks, the exploded-view labels, the readout).
// Layout px (y down), degrees clockwise. Plain Node imports it (tests): no three / remotion / react imports.
import { ORDER_TEXTS, POV_LABELS, POV_LOCK_TEXTS, POV_READOUT, SIGNATURE, orderId } from '../content/break.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import {
  BRACKET_LAUNCH,
  CURSOR_ACTS,
  DIAMOND,
  DIZZY,
  HANG,
  IRIS_CLOSE,
  IRIS_OPEN,
  MARQUEE,
  ORDER_COPIES,
  ORDER_RETYPES,
  ORDERS,
  POV,
  POV_SWEEP,
  REROLL,
  SELECT,
  SELECT_CHIP,
  SELECT_EDGES,
  SHARD_FLIGHT,
  SKID,
  STUTTER,
  TEARS,
  TOFU,
  TRIPLE,
  WIPE,
  WIPE_COVER,
} from '../score/break.ts';
import { partFrame, v07Frame } from '../score/film.ts';
import { shardLowerLeft } from './breakFall.ts';
import { type Part, partAt, shardScreen } from './breakHero.ts';
import { H, flatCamV2, frameOf, fromScreen, launchL, liveTime, pop, rotate, toScreen } from './breakShared.ts';
import { FLOOR, floorTilt, hangSag, onFloor, skidE } from './breakWorld.ts';

type V2 = readonly [number, number];
const cam = (f: number) => flatCamV2(f);
/** A world point on screen under the v2 camera at instant f. */
const scr = (f: number, p: V2): [number, number] => toScreen(cam(f), p[0], p[1]);
const lerp2 = (a: V2, b: V2, u: number): [number, number] => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ——— The red cursor (screen) —————————————————————————————————————————————————————————————————————————————————————————————————————

/** Its arrow (the widget's, ×1.15 ≈ 72 px tall), tip at (0, 0); 4 px of ink either side of its edge; a (6, 6) ink shadow. */
export const CURSOR_POLY: readonly V2[] = [[0, 0], [0, 54], [13, 42], [23, 63], [33, 58], [23, 38], [40, 38]].map(([x, y]) => [x * 1.15, y * 1.15] as const);
export const CURSOR_STYLE = { stroke: 4, shadow: 6 } as const;
/** A cursor on screen: the arrow (tip at x, y), or the hang's busy-spinner (centred there) turning by `spin` steps. */
export type CursorDraw = { kind: 'arrow' | 'spinner'; x: number; y: number; scale: number; rot: number; spin: number };
/** A click: the arrow dips to 0.88 on the click's frame and springs back over 4 frames. */
const clickScale = (f: number, clicks: readonly number[]): number => {
  let s = 1;
  for (const c of clicks) {
    const k = f - c;
    if (k >= -0.5 && k < 4) s = Math.min(s, 1 - 0.12 * (1 - clamp(k / 4)));
  }
  return s;
};
/** Where the arrow's tip grips a part: a little up-left of its ink centre, so the arrow lies over the part's edge, not its middle. */
const GRIP: V2 = [-34, -40];
const grip = (p: V2): [number, number] => [p[0] + GRIP[0], p[1] + GRIP[1]];
/**
 * The iris marquee's bottom handle at instant f (screen) — the one the cursor turns the selection by (ruling R-F1: as the selection
 * turns −70° under the push to his eye, its corners and top-right handle leave the frame; the bottom handle swings right and up and stays
 * in it, so the tug-of-war reads: the hand drags, the box turns).
 */
const irisHandle = (f: number): [number, number] => {
  const q = irisCorners(f);
  return q ? lerp2(q[2], q[3], 0.5) : scr(f, [H[0], H[1] + IRIS_RECT.hh]);
};
/** Slides from `a` to `b` over [from, to] (cubic out). */
const slide = (f: number, from: number, to: number, a: V2, b: V2): [number, number] => lerp2(a, b, ease.outCubic(clamp((f - from) / (to - from))));

/**
 * The antivirus's hand at instant f (screen layout px), its acts in order (sheet §3; CURSOR_ACTS):
 *   2.2  in from the bottom right, grabs the marquee's bottom handle (click), turns the selection −70°; 2.2& he pulls back and it is
 *        flung off, spinning, up and out;
 *   2.4& in from the left toward the loose "(", grabs it on 3.1 (click) and drags it round the loop, half a frame ahead of it; slams
 *        it in on 3.3 (click) and goes off left, toward the guest;
 *   4.1& clicks T3 onto the walking ")"; 4.2 clicks each reel of the re-roll and, on 4.2&, the delete; the crash zoom throws it off;
 *   4.3a three of them jitter round his face — the frenzy — and on the hang freeze into busy-spinners (swept by the restart wipe);
 *   5.4& in from the bottom right onto the selection's bottom-right handle (click), holding it across C6 (the graph builder lets go).
 */
export function cursorsAt(f: number): CursorDraw[] {
  const arrow = (p: V2, scale = 1, rot = 0): CursorDraw => ({ kind: 'arrow', x: p[0], y: p[1], scale, rot, spin: 0 });
  const clicks = CURSOR_CLICKS_V2;
  // 2.2: the marquee's rotate.
  if (f >= MARQUEE.from - 4 && f < IRIS_CLOSE.from + 12) {
    if (f < MARQUEE.from) return [arrow(slide(f, MARQUEE.from - 4, MARQUEE.from, [2060, 1200], irisHandle(MARQUEE.from)))];
    if (f < IRIS_CLOSE.from) return [arrow(irisHandle(f), clickScale(f, clicks))];
    // He pulls back: the cursor loses its grip and is flung up and right, spinning a turn (ease-in), off the frame by 2.2& + 12.
    const u = (f - IRIS_CLOSE.from) / 12;
    const p0 = irisHandle(IRIS_CLOSE.from);
    return [arrow([p0[0] + 900 * u * u + 160 * u, p0[1] - 800 * u * u - 60 * u], 1, 360 * ease.inCubic(u))];
  }
  // 2.4& → 3.3&: the bracket's drag.
  const drag = CURSOR_ACTS[1];
  if (f >= drag.from && f < drag.to) {
    if (f < BRACKET_LAUNCH) {
      const target = grip(scr(f, partAt(BRACKET_LAUNCH, 'open')));
      return [arrow(slide(f, drag.from, BRACKET_LAUNCH, [-120, 1140], target))];
    }
    if (f < DIZZY) return [arrow(grip(scr(f, partAt(Math.min(f + 0.5, DIZZY), 'open'))), clickScale(f, clicks))];
    // The slam's click, then off to the left edge, toward the guest peeking in there (ease-in).
    const p0 = grip(scr(DIZZY, partAt(DIZZY, 'open')));
    const u = clamp((f - DIZZY - 3) / (drag.to - DIZZY - 3));
    return [arrow(lerp2(p0, [-140, 700], ease.inCubic(u)), clickScale(f, clicks))];
  }
  // 4.1&: T3 onto the walking ")" (in from the bottom right, a click, back out).
  const t3 = CURSOR_ACTS[2];
  if (f >= t3.from - 6 && f < t3.to + 6) {
    const p = grip(scr(f, partAt(t3.from, 'close')));
    if (f < t3.from) return [arrow(slide(f, t3.from - 6, t3.from, [2040, 1160], p))];
    if (f < t3.to) return [arrow(p, clickScale(f, clicks))];
    return [arrow(lerp2(p, [2040, 1160], ease.inCubic(clamp((f - t3.to) / 6))))];
  }
  // 4.2 → 4.2&: each reel of the re-roll on his right eye, a click a 32nd, the delete on 4.2& — then the crash zoom flings it off.
  const reel = CURSOR_ACTS[3];
  if (f >= reel.from - 6 && f < reel.to) {
    const p = grip(scr(f, partAt(Math.min(f, TOFU), 'eyeR')));
    if (f < reel.from) return [arrow(slide(f, reel.from - 6, reel.from, [2040, 1160], p))];
    if (f < TOFU + 1) return [arrow(p, clickScale(f, clicks))];
    const u = clamp((f - TOFU - 1) / (reel.to - TOFU - 1));
    return [arrow([p[0] + 900 * u * u, p[1] - 700 * u * u], 1, 200 * u)];
  }
  // 4.3a: the frenzy — three cursors pop in round his face and jitter; frozen into busy-spinners on the hang, until the wipe covers them.
  if (f >= TRIPLE && f < WIPE.from + 6) {
    const hung = f >= HANG;
    const at = hung ? HANG : f;
    return TRIPLE_SPOTS.map((spot, i) => {
      const p = scr(at, spot);
      // (Hashed on the frame as approved on the 61-bar map: v07Frame, so v08's bridge A, which moved the break a bar, re-rolls no jitter.)
      const j = hung ? [0, 0] : [10 * (hash(v07Frame(frameOf(f)), i, 61) - 0.5), 10 * (hash(v07Frame(frameOf(f)), i, 62) - 0.5)];
      const s = Math.max(0.01, pop(f - TRIPLE - i));
      // A busy-spinner turns a step every 3 frames (the one thing still moving in the hang, with the gasp).
      return hung ? { kind: 'spinner' as const, x: p[0], y: p[1], scale: 1, rot: 0, spin: Math.floor((f - HANG) / 3) + 2 * i } : arrow([p[0] + j[0], p[1] + j[1]], s, TRIPLE_TURN[i]);
    });
  }
  // 5.4&: onto the selection's bottom-right handle; held across C6.
  if (f >= SELECT.from - 6 && f < partFrame('break', 6)) {
    const at: V2 = [SELECT_RECT.x1 + 8, SELECT_RECT.y1 + 8];
    if (f < SELECT.from) return [arrow(slide(f, SELECT.from - 6, SELECT.from, [2000, 900], at))];
    return [arrow(at, clickScale(f, clicks))];
  }
  return [];
}
/** The clicks (CURSOR_CLICKS, those of bars 2–5). */
export const CURSOR_CLICKS_V2: readonly number[] = [MARQUEE.from, BRACKET_LAUNCH, DIZZY, CURSOR_ACTS[2].from, ...REROLL, TOFU, TRIPLE, SELECT.from];
/** The frenzy's three cursors: round his face (world), each turned a little. */
const TRIPLE_SPOTS: readonly V2[] = [
  [700, 300],
  [1240, 330],
  [990, 840],
];
const TRIPLE_TURN: readonly number[] = [-12, 18, 160];

// ——— The marquees (screen, marching ants) ————————————————————————————————————————————————————————————————————————————————————————

/** The marching ants: 4 px red dashes, 12 on 8 off, marching 2 px a frame. */
export const ANTS = { width: 4, on: 12, off: 8, march: 2 } as const;
/** A handle: a 14 px white square with a 3 px red outline. */
export const HANDLE = { size: 14, outline: 3 } as const;
/**
 * The dashes along a polyline from `a` to `b` (screen px), the pattern measured from `a` and marching by `phase` px (the dash that
 * leaves `a` is cut where the pattern says): every dash as a segment [p, q].
 */
export function antsAlong(a: V2, b: V2, phase: number): [V2, V2][] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.5) return [];
  const period = ANTS.on + ANTS.off;
  const out: [V2, V2][] = [];
  const at = (s: number): V2 => [a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len];
  let s0 = -(((phase % period) + period) % period);
  for (; s0 < len; s0 += period) {
    const from = Math.max(0, s0);
    const to = Math.min(len, s0 + ANTS.on);
    if (to > from + 0.25) out.push([at(from), at(to)]);
  }
  return out;
}

/** The iris selection (world): a rect round his core (the ω and the inner halves of his eyes), centred on his slots' centre H. */
const IRIS_RECT = { hw: 470, hh: 210 } as const;
/** Its four corners on screen at instant f (TL, TR, BR, BL), turning −70° with the iris (the handles pulling out ×1.04), or null. */
function irisCorners(f: number): [number, number][] | null {
  if (f < MARQUEE.from || f >= IRIS_CLOSE.from) return null;
  const t = liveTime(f);
  const u = ease.inOutSine(clamp((t - IRIS_OPEN.from) / 12));
  // It snaps round his core (L, from ×1.12) as the cursor grabs it.
  const snapIn = 1 + 0.12 * (1 - launchL((f - MARQUEE.from) * 2));
  const k = (1 + 0.04 * u) * snapIn;
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const [x, y] = rotate(sx * IRIS_RECT.hw * k, sy * IRIS_RECT.hh * k, -70 * u);
    return scr(f, [H[0] + x, H[1] + y]);
  });
}
/** A marquee as drawn: its dashes, its handles (centre and scale), the dim outside it (0–0.15), its chip (T8 on the selection). */
export type Marquee = { dashes: [V2, V2][]; handles: { x: number; y: number; s: number }[]; dim: number; rect?: { x0: number; y0: number; x1: number; y1: number } };
/**
 * The iris marquee (2.2 → 2.2&, then scattering to 2.3): marching ants round his core with 8 handles, turned by the cursor; on 2.2& he
 * spirals home and the selection snaps — every dash flies outward from his centre, tumbling and falling, gone by the lock. Drawn at the
 * output frame's instant (sharp: screen UI), whatever sub-frame instant asks.
 */
export function irisMarquee(instant: number): Marquee | null {
  // Screen UI: one sharp instant per output frame (as the restart wipe's panels, R1-08); his core turns under it with its blur.
  const f = frameOf(instant);
  if (f < MARQUEE.from || f >= MARQUEE.to) return null;
  const phase = ANTS.march * (f - MARQUEE.from);
  if (f < IRIS_CLOSE.from) {
    const q = irisCorners(f)!;
    const dashes = q.flatMap((p, i) => antsAlong(p, q[(i + 1) % 4], phase));
    const mids = q.map((p, i) => lerp2(p, q[(i + 1) % 4], 0.5));
    const handles = [...q, ...mids].map(([x, y]) => ({ x, y, s: 1 }));
    return { dashes, handles, dim: 0 };
  }
  // The snap: the dashes of the last whole frame fly apart (radially from his centre on screen, falling), shrinking to nothing.
  const at = IRIS_CLOSE.from - 1;
  const q = irisCorners(at)!;
  const c = scr(at, H);
  const k = f - IRIS_CLOSE.from;
  const u = clamp(k / (MARQUEE.to - IRIS_CLOSE.from));
  const dashes = q.flatMap((p, i) => antsAlong(p, q[(i + 1) % 4], ANTS.march * (at - MARQUEE.from))).map(([a, b], j): [V2, V2] => {
    const m = lerp2(a, b, 0.5);
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]) || 1;
    const v = 10 + 14 * hash(j, 71);
    const ox = ((m[0] - c[0]) / d) * v * k;
    const oy = ((m[1] - c[1]) / d) * v * k + 0.9 * k * k;
    const spin = (hash(j, 72) - 0.5) * 40 * k;
    const half = (1 - u) * 0.5;
    const [hx, hy] = rotate((b[0] - a[0]) * half, (b[1] - a[1]) * half, spin);
    return [[m[0] + ox - hx, m[1] + oy - hy], [m[0] + ox + hx, m[1] + oy + hy]];
  });
  return { dashes: dashes.filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5), handles: [], dim: 0 };
}

/** The selection of 5.4& (screen): the rect C6 carries pixel for pixel into the graph editor (sheet §7.2). */
export const SELECT_RECT = { x0: 300, y0: 250, x1: 1620, y1: 830 } as const;
/** T8, its chip: the tag's top-left (screen), typed 4 characters a frame from SELECT_CHIP. */
export const SELECT_TAG = { x: 300, y: 202, perFrame: 4 } as const;
/**
 * The selection at frame f (screen; valid from SELECT.from on, for the graph builder too): the corner brackets snap in (L) on 5.4&, the
 * edges draw out of them from SELECT_EDGES (6 f), the handles pop on SELECT_CHIP, the 15 % dim outside rises over 9 f from 5.4& + 2
 * (whole on the cut); its ants march 2 px a frame from 5.4&. Its chip T8 is selectChip(f).
 */
export function selectMarquee(f: number): Marquee | null {
  if (f < SELECT.from) return null;
  const R = SELECT_RECT;
  const e = f - SELECT.from;
  const k = Math.min(1.05, launchL(e * 1.5));
  const g = clamp((f - SELECT_EDGES) / 6);
  const phase = ANTS.march * e;
  const hw = (R.x1 - R.x0) / 2;
  const hh = (R.y1 - R.y0) / 2;
  const dashes: [V2, V2][] = [];
  for (const [cx, cy, dx, dy] of [[R.x0, R.y0, 1, 1], [R.x1, R.y0, -1, 1], [R.x0, R.y1, 1, -1], [R.x1, R.y1, -1, -1]] as const) {
    const ax = (60 + (hw - 60) * g) * k;
    const ay = (60 + (hh - 60) * g) * k;
    dashes.push(...antsAlong([cx, cy], [cx + dx * ax, cy], phase), ...antsAlong([cx, cy], [cx, cy + dy * ay], phase));
  }
  const handles = f < SELECT_CHIP ? [] : ([[R.x0, R.y0], [R.x0 + hw, R.y0], [R.x1, R.y0], [R.x1, R.y0 + hh], [R.x1, R.y1], [R.x0 + hw, R.y1], [R.x0, R.y1], [R.x0, R.y0 + hh]] as const).map(([x, y]) => ({ x, y, s: Math.max(0.01, pop(f - SELECT_CHIP)) }));
  return { dashes, handles, dim: 0.15 * clamp((f - SELECT.from - 2) / 9), rect: { ...R } };
}
/** T8 on the selection (screen): `select (•ω•) · threats 2` typed 4 a frame from SELECT_CHIP; its ID chip #80. */
export function selectChip(f: number): { x: number; y: number; text: string; full: string; id: string } | null {
  if (f < SELECT_CHIP) return null;
  const full = ORDER_TEXTS[8][0];
  return { x: SELECT_TAG.x, y: SELECT_TAG.y, text: full.slice(0, Math.ceil((f - SELECT_CHIP + 1) * SELECT_TAG.perFrame)), full, id: orderId(8) };
}

// ——— The work orders (world tags) and their tears ———————————————————————————————————————————————————————————————————————————————

/** A tag's look (the widget's): JetBrains Mono Bold 22 px, a white tag 36 tall, 3 px ink border, (4, 4) ink shadow, the text from x 12, an ink ID chip 46 × 26 at its right end. */
export const ORDER_TAG = { size: 22, h: 36, pad: 12, tail: 82, chip: { w: 46, h: 26, right: 6, size: 17 }, border: 3, shadow: 4 } as const;
let charW = 0.6 * ORDER_TAG.size;
/** The scene hands over the mono bold atlas's advance (tests keep JetBrains Mono's 0.6 em). */
export const setOrderAdvance = (w: number): void => {
  charW = w;
};
/** A tag's width for its text. */
export const tagWidth = (text: string): number => [...text].length * charW + ORDER_TAG.tail;

/** Where each work order hangs (world, its top-left) and what its leader points at (a world point at instant f; null: no leader). */
type OrderSpec = { x: number; y: number; to: (f: number) => V2 | null };
const ORDER_SPECS: readonly OrderSpec[] = [
  // T0: by the shard on our side of the screen — its leader on the shard's lower-left corner (taken back into the world through the camera), then on the shard in flight.
  { x: 150, y: 300, to: (f) => (f < SHARD_FLIGHT.from + 6 ? fromScreen(cam(f), ...shardLowerLeft(f)) : fromScreen(cam(f), ...shardScreen(f, true).centre)) },
  // T1: above his core.
  { x: 1040, y: 236, to: (f) => partAt(f, 'mouth') },
  // T2: by the loose "(" (its leader rides the bracket through the loop).
  { x: 260, y: 640, to: (f) => partAt(f, 'open') },
  // T3: on the walking ")".
  { x: 1520, y: 720, to: (f) => partAt(f, 'close') },
  // T4: by his eyes.
  { x: 1060, y: 236, to: (f) => partAt(f, 'eyeR') },
  // T5–T7: the top row, one cluster (the frenzy's three).
  { x: 1440, y: 236, to: (f) => partAt(f, 'eyeR') },
  { x: 330, y: 330, to: (f) => partAt(f, 'eyeL') },
  { x: 800, y: 150, to: (f) => partAt(f, 'mouth') },
];

/** An intact work order on screen: its typed text, ID, place (world top-left), scale (its pop), its leader, its copies. */
export type OrderDraw = { i: number; text: string; full: string; id: string; x: number; y: number; w: number; scale: number; leader: [V2, V2] | null; copies: number; split: boolean };
/** The tear frame that ends order i (or its sweep by the restart wipe: null). */
const tearOf = (i: number): number | null => (i <= 1 ? TEARS[0] : i === 2 ? TEARS[1] : i <= 4 ? TEARS[2] : null);
/** Its text and retypes: (frame, text) pairs, the first on its pop. */
const textsOf = (i: number): [number, string][] => {
  const o = ORDERS[i];
  const t = ORDER_TEXTS[i];
  if (i === 2) return [[o.from, t[0]], [ORDER_RETYPES[0], t[1]]];
  if (i === 4) return t.map((s, k) => [k === 0 ? o.from : ORDER_RETYPES[k], s]);
  return [[o.from, t[0]]];
};
/**
 * The intact work orders at instant f (T0–T7; T8 is the selection's chip): each pops (0.6 → 1.05 → 1) and types a character a frame (a
 * retype keeps the common prefix), its 2 px ink leader drawing out to a 6 px dot on the part it works on; T7 copies itself on ORDER_COPIES
 * (+10, +10, a one-frame RGB split). A torn order is gone from its tear frame (litterAt has its halves); T5–T7 stay until the wipe covers them.
 */
export function ordersAt(f: number): OrderDraw[] {
  const out: OrderDraw[] = [];
  const t = frameOf(f);
  for (let i = 0; i < ORDER_SPECS.length; i++) {
    const o = ORDERS[i];
    const end = tearOf(i) ?? WIPE_COVER;
    if (t < o.from || t >= end) continue;
    const texts = textsOf(i);
    const k = texts.filter(([a]) => a <= t).length - 1;
    const [at, full] = texts[k];
    const prev = k > 0 ? texts[k - 1][1] : '';
    let common = 0;
    while (common < prev.length && common < full.length && prev[common] === full[common]) common++;
    const text = [...full].slice(0, Math.min([...full].length, common + (t - at) + 1)).join('');
    const s = ORDER_SPECS[i];
    const w = tagWidth(full);
    const dot = s.to(f);
    const reach = clamp((t - o.from + 1) / 4);
    let leader: [V2, V2] | null = null;
    if (dot) {
      // From the dot toward the tag's nearest point.
      const nx = clamp(dot[0], s.x, s.x + w);
      const ny = clamp(dot[1], s.y, s.y + ORDER_TAG.h);
      leader = [dot, [dot[0] + (nx - dot[0]) * reach, dot[1] + (ny - dot[1]) * reach]];
    }
    const copies = i === 7 ? ORDER_COPIES.filter((c) => t >= c).length : 0;
    out.push({ i, text, full, id: orderId(i), x: s.x, y: s.y + hangSag(f), w, scale: Math.max(0.01, pop(f - o.from)), leader, copies, split: i === 7 && ORDER_COPIES.includes(t) });
  }
  return out;
}

/** A half of a torn order: its outline and characters in its own frame (origin its pivot), and where that frame is in the world now. */
export type Litter = {
  i: number;
  half: 0 | 1;
  /** Outline about the pivot (px), the jagged tear on one side. */
  pts: readonly V2[];
  /** Its characters (x about the pivot, on the tag's text line) and, on the right half, the ID chip. */
  chars: readonly { ch: string; x: number }[];
  chip: { x: number; id: string } | null;
  /** The pivot in the world, the turn (degrees), the flip (scale-x: −1 … 1; below 0 its blank back is up). */
  x: number;
  y: number;
  rot: number;
  sx: number;
};
/** Where each torn half comes to rest (floor-local, level: the band's frame) and how it lies; the heap is where the skid leaves it. */
const REST: Readonly<Record<number, readonly [{ x: number; y: number; rot: number }, { x: number; y: number; rot: number }]>> = {
  0: [{ x: 300, y: 955, rot: 14 }, { x: 520, y: 1000, rot: -9 }],
  1: [{ x: 1130, y: 975, rot: -12 }, { x: 1350, y: 948, rot: 17 }],
  2: [{ x: 330, y: 1010, rot: 8 }, { x: 560, y: 968, rot: -15 }],
  3: [{ x: 1430, y: 1000, rot: -7 }, { x: 1660, y: 1030, rot: 11 }],
  4: [{ x: 1050, y: 1020, rot: 16 }, { x: 1250, y: 1045, rot: -6 }],
};
/** The heap the tilt slides T0's and T1's halves into (floor-local), against the coral and the mint at the low end. */
const HEAP_REST: Readonly<Record<number, readonly [V2, V2]>> = {
  0: [[250, 930], [420, 965]],
  1: [[590, 940], [770, 972]],
};
/** How long each half flutters down (frames), by order and half. */
const fallFrames = (i: number, h: number): number => 20 + Math.round(10 * hash(i, h, 81));

/** The tear of order i: its text cut between two characters at about 45 %, the left half's outline (a jagged edge), the right's. */
function tearShape(i: number): { w: number; xt: number; left: V2[]; right: V2[]; split: number; text: string } {
  const text = ORDER_TEXTS[i][ORDER_TEXTS[i].length - 1];
  const n = [...text].length;
  const split = Math.max(2, Math.round(0.45 * n));
  const w = tagWidth(text);
  const xt = ORDER_TAG.pad + split * charW;
  const H36 = ORDER_TAG.h;
  const j = [5, -6, 6, -5, 4].map((d, k) => d + 3 * (hash(i, k, 91) - 0.5));
  const edge: V2[] = j.map((d, k) => [xt + d, (k * H36) / 4]);
  return { w, xt, split, text, left: [[0, 0], ...edge, [0, H36]], right: [[w, 0], [w, H36], ...[...edge].reverse()] };
}

/**
 * The litter at instant f: every torn half (T0 + T1 on the lock, T2 swatted by the card flip, T3 + T4 on 4.3), from its tear to the
 * restart wipe. A tear rips the tag on a jagged line (the halves jump apart ±12 px, ±10°, in 2 frames); each half flips and flutters down
 * (swinging ±20°, drifting, 20–30 frames) onto the floor band and lies there, ID up; the tilt carries the band's litter with it and the
 * skid slides T0's and T1's into the heap; on 4.1 the mint ground replaces the band and they drop level onto it (a 6 px bounce); the hang
 * sags them with the world.
 */
export function litterAt(f: number): Litter[] {
  const out: Litter[] = [];
  if (f >= WIPE_COVER) return out;
  const t = liveTime(f);
  for (let i = 0; i <= 4; i++) {
    const T = tearOf(i)!;
    if (f < T) continue;
    const shape = tearShape(i);
    const s = ORDER_SPECS[i];
    const chars = [...shape.text];
    for (const h of [0, 1] as const) {
      const pts = h === 0 ? shape.left : shape.right;
      const cx = h === 0 ? shape.xt / 2 : (shape.xt + shape.w) / 2;
      const cy = ORDER_TAG.h / 2;
      const local = pts.map(([x, y]) => [x - cx, y - cy] as const);
      const mine = chars.map((ch, k) => ({ ch, x: ORDER_TAG.pad + (k + 0.5) * charW - cx })).filter((_, k) => (h === 0 ? k < shape.split : k >= shape.split));
      const chip = h === 1 ? { x: shape.w - ORDER_TAG.chip.right - ORDER_TAG.chip.w / 2 - cx, id: orderId(i) } : null;
      const start: V2 = [s.x + cx, s.y + cy];
      const rest = REST[i][h];
      const D = fallFrames(i, h);
      const k = t - T;
      let x: number;
      let y: number;
      let rot: number;
      let sx = 1;
      if (k < D) {
        // The rip (2 f), then the flutter: drifting down (u^1.5), swinging ±20° (dying), turning over twice (face up when it lands).
        const u = k / D;
        const rip = ease.outCubic(clamp(k / 2));
        const dir = h === 0 ? -1 : 1;
        const landing = levelOrTilted(rest.x, rest.y, T + D);
        const swing = 20 * Math.sin(2 * Math.PI * 1.25 * u + i + h) * (1 - u);
        x = lerp(start[0] + dir * 12 * rip, landing[0], u) + 40 * Math.sin(2 * Math.PI * 1.5 * u + h) * (1 - u);
        y = lerp(start[1], landing[1], u ** 1.5);
        rot = dir * 10 * rip * (1 - u) + swing + lerp(0, rest.rot + landing[2], u);
        sx = Math.cos(2 * Math.PI * u);
      } else {
        const heap = HEAP_REST[i]?.[h];
        const lx = heap ? lerp(rest.x, heap[0], skidE(Math.min(t, DIAMOND))) : rest.x;
        const ly = heap ? lerp(rest.y, heap[1], skidE(Math.min(t, DIAMOND))) : rest.y;
        const p = levelOrTilted(lx, ly, f);
        // On 4.1 they drop level onto the mint ground: a 6 px settle bounce (291–297).
        const b = f >= DIAMOND + 3 && f < DIAMOND + 9 ? -6 * Math.sin((Math.PI * (f - DIAMOND - 3)) / 6) : 0;
        x = p[0];
        y = p[1] + b;
        rot = rest.rot + p[2];
      }
      out.push({ i, half: h, pts: local, chars: mine, chip, x, y: y + hangSag(f), rot, sx });
    }
  }
  return out;
}
/** A floor-local point at instant f: on the band (tilting from 3.3) until the diamond, then level on the mint ground (un-tilting over 4.1's first 9 frames). Returns [x, y, the turn]. */
function levelOrTilted(x: number, y: number, f: number): [number, number, number] {
  const t = liveTime(f);
  if (f < DIAMOND) {
    const deg = floorTilt(t);
    const [wx, wy] = onFloor(x, y, deg);
    return [wx, wy, deg];
  }
  const u = ease.outCubic(clamp((f - DIAMOND) / 9));
  const deg = FLOOR.tilt * (1 - u);
  const [wx, wy] = onFloor(x, y, deg);
  return [wx, wy, deg];
}
/** An amber spark (his mark: he did the tearing) where each order tears: a 4-point star popping 0 → 1.2 → 0 over 8 frames, turning. */
export function tearSparks(f: number): { x: number; y: number; s: number; rot: number }[] {
  const out: { x: number; y: number; s: number; rot: number }[] = [];
  for (let i = 0; i <= 4; i++) {
    const T = tearOf(i)!;
    const k = f - T;
    if (k < 0 || k >= 8) continue;
    const sh = tearShape(i);
    const s = ORDER_SPECS[i];
    out.push({ x: s.x + sh.xt, y: s.y + ORDER_TAG.h / 2, s: 1.2 * Math.sin((Math.PI * k) / 8), rot: 45 * (k / 8) });
  }
  return out;
}

// ——— The antivirus's POV (3.3& → 3.4&) ——————————————————————————————————————————————————————————————————————————————————————————

/** The POV at output frame f: the scanline's screen y (X-ray above it; null once it has passed), the reticle, the exploded labels, the readout. */
export type Pov = {
  sweep: number | null;
  omega: V2;
  reticle: { x: number; y: number; r: number; label: string };
  labels: { anchor: V2; at: V2; text: string; shown: string }[];
  readout: string;
};
/** The reticle's locks (sheet §3 3.3&–3.4): the ω (access denied), the flipped bracket, then eye.L tightening on each 32nd of the stutter. */
const LOCKS: readonly { at: number; part: Part; r: number; label: string }[] = [
  { at: POV.from, part: 'mouth', r: 220, label: POV_LOCK_TEXTS[0] },
  { at: POV.from + 6, part: 'open', r: 200, label: POV_LOCK_TEXTS[1] },
  ...STUTTER.map((s, k) => ({ at: s, part: 'eyeL' as Part, r: 220 - 30 * k, label: POV_LOCK_TEXTS[2] })),
];
/** Each exploded-view label: the part, and where its label sits relative to the part on screen. */
const LABEL_OFFSETS: readonly { part: Part; text: string; d: V2 }[] = [
  { part: 'eyeL', text: POV_LABELS[0], d: [-120, -300] },
  { part: 'eyeR', text: POV_LABELS[1], d: [160, -300] },
  { part: 'mouth', text: POV_LABELS[2], d: [60, 330] },
  { part: 'open', text: POV_LABELS[3], d: [-40, -330] },
  { part: 'close', text: POV_LABELS[4], d: [-60, 340] },
];
/**
 * The POV at instant f (screen px), or null outside it: the red scanline sweeps down over POV_SWEEP (the X-ray above it); the reticle snaps
 * from lock to lock (a 2-frame robotic move) — the ω (220 px, `ω: ??? access denied`), the flipped bracket on + 6 (`bracket.L: flipped ✓`),
 * then eye.L tightening 220 → 130 on the stutter's four 32nds (`eye.L: next ✓`); the exploded-view labels type 3 characters a frame, one
 * part a frame; the readout `[SCAN] threats 1 · sig E2 80 A2 …` types at the bottom left.
 */
export function povAt(f: number): Pov | null {
  if (f < POV.from || f >= POV.to) return null;
  const t = liveTime(f);
  const c = (p: V2) => scr(f, p);
  const sweep = f < POV_SWEEP.to ? 1080 * clamp((f - POV_SWEEP.from) / (POV_SWEEP.to - POV_SWEEP.from)) : null;
  const k = LOCKS.filter((l) => frameOf(f) >= l.at).length - 1;
  const lock = LOCKS[Math.max(0, k)];
  const prev = LOCKS[Math.max(0, k - 1)];
  const mv = ease.outCubic(clamp((f - lock.at) / 2));
  const pa = c(partAt(prev.at, prev.part));
  const pb = c(partAt(lock.at, lock.part));
  const [rx, ry] = k <= 0 ? pb : lerp2(pa, pb, mv);
  const r = k <= 0 ? lock.r : lerp(prev.r, lock.r, mv);
  const labels = LABEL_OFFSETS.map((l, i) => {
    const anchor = c(partAt(t, l.part));
    const n = Math.max(0, Math.ceil((frameOf(f) - POV.from - i + 1) * 3));
    return { anchor, at: [anchor[0] + l.d[0], anchor[1] + l.d[1]] as V2, text: l.text, shown: l.text.slice(0, n) };
  });
  const n = Math.max(0, (frameOf(f) - POV.from + 1) * 3);
  return { sweep, omega: c(partAt(t, 'mouth')), reticle: { x: rx, y: ry, r, label: lock.label }, labels, readout: POV_READOUT.slice(0, n) };
}

/** The signature the IDs spell (for the tests): T0 → T9. */
export const ORDER_IDS: readonly string[] = SIGNATURE.map((_, i) => orderId(i));
void SKID;
