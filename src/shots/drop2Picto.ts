// S31P PICTOGRAMS, drop2 15.1–16.1 − 1 (2D, with a 3D hinge on its last 8th), layer 4/5 `pictograms.svg` (builder act2b; build sheet
// notes/bid2/drop2-sheet2.md §3 bar 15, §4.12, §5 #18–#21; the design notes/extend/drop2-final.md §4.12, its frames − 3264 = local).
// Pure: Node tests import it.
//
// An Aicher sheet seen from above: light blue, a white 45°/90° construction grid, a 10-lane track whose lane numbers are his signature's
// bytes. He is an amber pictogram (head disc 240 px with his #111 face, one 72 px stroke, round caps, every limb on a 45° step) and moves
// the way the system draws: each limb turns one 45° quantum a 16th (a 4-frame snap with a 6° overshoot).
//   15.1  the crane lands: sprinting; Defender's red athlete (head (￣▽￣)) just behind; the track streams past at 40 px a frame.
//   15.1& en garde (he turns to face it), limbs stepping on the 16ths.
//   15.2  LUNGE, touché: his foil on its chest, a white burst; its head (￣▽￣) → (￣ω￣): Defender re-infected on screen.
//   15.2& the approach; Defender's red scan bar rises on two white uprights.
//   15.3  THE FLOP: the whole world rolls round him in 45° snaps on the 16ths (180° on 15.3a); he stays upright; the bar bends into an ω.
//   15.4  THE CONTACT SHEET: 3 × 3 at 1.35×; him upright in the centre tile, his flop frozen at 0°…315° round it, on Aicher's colours.
//   15.4& THE HINGE: the eight outer tiles hinge up into a mirror tube round us while we push into his head (130 → 520 px); light at the
//         tube's end, the frame mean 0.45 → 0.88 by 16.1 − 1; on 16.1 the kaleidoscope's white.
// Layout px (1920 × 1080, origin top-left, y down) are converted to the flat world (origin centre, y up) at the end (X, Y).
import { GUEST, GUEST_INFECTED } from '../content/castDrop2.ts';
import { HERO2, SIGNATURE } from '../content/drop2.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD, type Segment, type Temporal, struck } from '../engine/temporal.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { BAR_RISE, DRUMLINE2, HINGE, KICKS2, LIGHT, PICTO, SHEET, TOUCHE, WORLD_ROLL } from '../score/drop2.ts';
import { LAW, PALETTES, drop2Segment, flow, impact, springL } from './drop2Shared.ts';

const TAU = 2 * Math.PI;
const DEG = Math.PI / 180;
const SIXTEENTH = 6;
const X = (x: number): number => x - 960;
const Y = (y: number): number => 540 - y;

/** The part's span: the crane lands on 15.1; the light on 16.1 is the kaleidoscope's. */
export const PIC = { from: PICTO, to: LIGHT.from } as const;

// ——— The layout only the browser can measure ————————————————————————————————————————————————————————————————————————————————

export type InkBox = { left: number; right: number; up: number; down: number };
export type PictoFont = 'rounded' | 'jp' | 'display';
export type PictoLayout = { advance: Readonly<Record<PictoFont, Advance>>; ink: ReadonlyMap<string, InkBox> };
export const inkKey = (font: PictoFont, text: string): string => `${font}|${text}`;
/** Every string the part draws, by atlas (src/content/drop2.ts lists each with this role). */
export const PICTO_STRINGS: Readonly<Record<PictoFont, readonly string[]>> = {
  rounded: [HERO2.base, GUEST.face, GUEST_INFECTED.face],
  jp: [],
  display: [...SIGNATURE.lanes],
};
/** Placed by their ink: his face on the head disc, Defender's face as its head. */
export const PICTO_INK: readonly [PictoFont, string][] = [
  ['rounded', HERO2.base],
  ['rounded', GUEST.face],
  ['rounded', GUEST_INFECTED.face],
];

// ——— Palette ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

const P = PALETTES.picto;
const lin = (hex: string, k = 1): RGB => linear(hex, k);
export const GROUND: RGB = lin(P.ground);
const WHITE: RGB = [1, 1, 1];
const INK = lin('#111111');
const AMBER = lin(LAW.hero);
const RED = lin(LAW.defender.print);
/** Aicher's five tile colours (the contact sheet). */
export const TILE_COLOURS: readonly RGB[] = [lin(P.ground), lin(P.green), lin(P.deep), lin(P.blue), lin(P.silver)];

// ——— The construction grid and the track (world: they scroll and roll; layout px at scroll 0, roll 0) ——————————————————————————————

/** The grid: 90° lines every 96 px through (960, 60) — the lane lines lie on it — and the 45° lines through the same nodes. */
export const GRID = { step: 96, x0: 960, y0: 60, alpha: 0.25, width: 2 } as const;
/** The track: 10 lanes, 96 px each, from y 60; the start line's x at 15.1 (it streams off left with the world). */
export const TRACK = { lanes: 10, top: 60, lane: 96, start: 760 } as const;

/** The run-up before 15.1 (frames): under the crane's landing the world already streams, accelerating from rest to the sprint's 40 px a frame. */
export const RUN_UP = 18;
/**
 * How far the world has streamed left (px): the sprint at 40 px a frame, braked into the en garde, a drift, the approach, the roll's crawl.
 * Before 15.1 (the Memphis grid snap draws this sheet): the run-up, 0 → 40 px a frame over RUN_UP frames, so 15.1 continues a motion.
 */
export function scrollAt(f: number): number {
  if (f < PIC.from) {
    const t = Math.max(0, f - (PIC.from - RUN_UP));
    return -(40 / (2 * RUN_UP)) * (RUN_UP * RUN_UP - t * t);
  }
  const keys: readonly [number, number][] = [
    [PIC.from, 40],
    [PIC.from + 9, 40],
    [PIC.from + 18, 3],
    [BAR_RISE, 3],
    [WORLD_ROLL[0], 22],
    [WORLD_ROLL[3] + 2, 2],
    [SHEET, 2],
  ];
  // The integral of the speed, piecewise linear between the keys.
  let x = 0;
  for (let i = 0; i < keys.length; i++) {
    const [a, va] = keys[i];
    const [b, vb] = i + 1 < keys.length ? keys[i + 1] : [Infinity, va];
    if (f <= a) break;
    const t = Math.min(f, b) - a;
    const span = b - a;
    x += va * t + (Number.isFinite(span) && span > 0 ? ((vb - va) * t * t) / (2 * span) : 0);
  }
  return x;
}

/** The world's roll (radians, CCW): four 45° snaps (S: 2 frames, 6° over) on the 16ths of 15.3, held at 180°, back to 0 under the sheet. */
export function rollAt(f: number): number {
  if (struck(SHEET, f)) return 0;
  let a = 0;
  for (const at of WORLD_ROLL) {
    const t = f - at;
    if (t <= 0) break;
    const s = t < 2 ? (t / 2) * (51 / 45) : t < 4 ? lerp(51 / 45, 1, (t - 2) / 2) : 1;
    a += 45 * s;
  }
  return a * DEG;
}
/** His centre, the roll's pivot (layout px). */
export const PIVOT: readonly [number, number] = [960, 620];
/** A world point (layout px at scroll 0, roll 0) where it shows at `f`. */
export function worldToScreen(x: number, y: number, f: number): [number, number] {
  const sx = x - scrollAt(f);
  const a = rollAt(f);
  const [dx, dy] = [sx - PIVOT[0], y - PIVOT[1]];
  // CCW on screen with y down: x' = x cos a + y sin a, y' = −x sin a + y cos a.
  return [PIVOT[0] + dx * Math.cos(a) + dy * Math.sin(a), PIVOT[1] - dx * Math.sin(a) + dy * Math.cos(a)];
}

// ——— The pictogram rig ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** A pose: each limb's two segments as absolute angles (degrees; 0 = straight down, 90 = forward, ±180 up); the torso's lean. */
export type Pose = { torso: number; armF: readonly [number, number]; armB: readonly [number, number]; legF: readonly [number, number]; legB: readonly [number, number] };
export const POSES = {
  runA: { torso: 0, armF: [45, 135], armB: [-45, -90], legF: [90, 0], legB: [-45, -90] },
  runB: { torso: 0, armF: [-45, -90], armB: [45, 135], legF: [-45, -90], legB: [90, 0] },
  garde: { torso: 0, armF: [45, 90], armB: [-135, 180], legF: [45, 0], legB: [-45, 0] },
  lunge: { torso: 45, armF: [90, 90], armB: [-90, -135], legF: [90, 0], legB: [-45, -45] },
  stand: { torso: 0, armF: [0, 0], armB: [0, 0], legF: [0, 0], legB: [0, 0] },
  victory: { torso: 0, armF: [135, 135], armB: [-135, -135], legF: [45, 0], legB: [-45, 0] },
  // Airborne over the bar: arms flung up and out in a V, the front leg tucked, the back leg kicked up behind (the arms clear of the head).
  flop: { torso: 0, armF: [135, 135], armB: [-135, -135], legF: [90, 45], legB: [-45, -135] },
  beaten: { torso: -45, armF: [-45, -45], armB: [45, 45], legF: [0, 0], legB: [-45, -45] },
} as const satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;

/** One snap of a 45° quantum: 0 → 51° in 2 frames, settling to 45° by + 4 (S, a 6° overshoot). */
const quantum = (t: number): number => (t <= 0 ? 0 : t < 2 ? (t / 2) * (51 / 45) : t < 4 ? lerp(51 / 45, 1, (t - 2) / 2) : 1);
/** An angle stepping from `a0` to `a1` one 45° quantum a 16th from `at` (a snap each), or all at once when `whole`. */
function stepAngle(a0: number, a1: number, at: number, f: number, whole: boolean): number {
  if (f <= at) return a0;
  if (whole) return a0 + (a1 - a0) * quantum((f - at) * 1.5);
  const n = Math.round(Math.abs(a1 - a0) / 45);
  if (n === 0) return a1;
  const k = Math.min(n, Math.floor((f - at) / SIXTEENTH));
  const t = f - at - k * SIXTEENTH;
  const done = k >= n ? n : k + quantum(t);
  return a0 + Math.sign(a1 - a0) * 45 * Math.min(n, done);
}
/** A rig's schedule: from each `at`, the pose it turns to (`whole`: every limb in one snap; else a 45° quantum a 16th). */
export type Key = { at: number; pose: PoseName; whole?: boolean; facing?: 1 | -1 };
/** Interpolated pose at `f` along `keys` (each limb steps from where the previous key left it). */
export function poseAt(keys: readonly Key[], f: number): { pose: Pose; facing: number } {
  let from: Pose = POSES[keys[0].pose];
  let facing = keys[0].facing ?? 1;
  let cur: Pose = from;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.at) break;
    const next = keys[i + 1];
    const end = next && f >= next.at ? next.at : f;
    const to = POSES[k.pose];
    const lerpPair = (a: readonly [number, number], b: readonly [number, number]): [number, number] => [stepAngle(a[0], b[0], k.at, end, !!k.whole), stepAngle(a[1], b[1], k.at, end, !!k.whole)];
    cur = { torso: stepAngle(from.torso, to.torso, k.at, end, !!k.whole), armF: lerpPair(from.armF, to.armF), armB: lerpPair(from.armB, to.armB), legF: lerpPair(from.legF, to.legF), legB: lerpPair(from.legB, to.legB) };
    from = cur;
    if (k.facing) facing = k.facing;
  }
  return { pose: cur, facing };
}

/** His schedule: the sprint (a stride a 16th), en garde, the lunge on 15.2, the approach, the flop under the roll, upright in the sheet. */
const RUN_SWAPS = (from: number, to: number): Key[] => Array.from({ length: Math.ceil((to - from) / SIXTEENTH) }, (_, i) => ({ at: from + i * SIXTEENTH, pose: i % 2 ? 'runB' : 'runA', whole: true }) as Key);
export const HERO_KEYS: readonly Key[] = [
  ...RUN_SWAPS(PIC.from, PIC.from + 12),
  { at: PIC.from + 12, pose: 'garde', facing: -1 },
  { at: TOUCHE - 2, pose: 'lunge', whole: true, facing: -1 },
  ...RUN_SWAPS(BAR_RISE, WORLD_ROLL[0]).map((k) => ({ ...k, facing: 1 as const })),
  { at: WORLD_ROLL[0], pose: 'flop', whole: true, facing: 1 },
  { at: SHEET, pose: 'victory', whole: true, facing: 1 },
];
/** Defender's athlete: sprinting just behind, en garde facing him, hit on 15.2, beaten. */
export const RED_KEYS: readonly Key[] = [
  ...RUN_SWAPS(PIC.from, PIC.from + 12).map((k, i) => ({ ...k, pose: (i % 2 ? 'runA' : 'runB') as PoseName })),
  { at: PIC.from + 12, pose: 'garde', facing: 1 },
  { at: TOUCHE + 1, pose: 'beaten', whole: true, facing: 1 },
];

/** The figure's proportions at scale 1 (layout px): his head 240 (face 200), one 72 px stroke, 880 px from head top to toe. */
export const FIG = { head: 240, face: 200, stroke: 72, torsoStroke: 84, neck: 46, torso: 250, upper: 150, fore: 140, thigh: 160, shin: 150 } as const;
/** Where his head sits on 15.1 (the crane's landing: HANDOFFS PICTO). */
export const HEAD_AT: readonly [number, number] = [960, 300];

export type Limbs = { head: [number, number]; joints: { a: [number, number]; b: [number, number]; w: number }[]; hand: [number, number]; foilDir: number };
/** The segments of a figure (layout px): head centre at `head`, scale `k`, facing ±1. */
export function rig(pose: Pose, head: readonly [number, number], k: number, facing: number): Limbs {
  const d = (a: number): [number, number] => [facing * Math.sin(a * DEG), Math.cos(a * DEG)];
  const add = (p: readonly [number, number], a: number, len: number): [number, number] => [p[0] + d(a)[0] * len * k, p[1] + d(a)[1] * len * k];
  const S = add(head, pose.torso, FIG.head / 2 + FIG.neck);
  const H = add(S, pose.torso, FIG.torso);
  const joints: Limbs['joints'] = [{ a: S, b: H, w: FIG.torsoStroke * k }];
  const limb = (p: readonly [number, number], a: readonly [number, number], l0: number, l1: number): [number, number] => {
    const m = add(p, a[0], l0);
    const e = add(m, a[1], l1);
    joints.push({ a: [p[0], p[1]], b: m, w: FIG.stroke * k }, { a: m, b: e, w: FIG.stroke * k });
    return e;
  };
  limb(H, pose.legB, FIG.thigh, FIG.shin);
  limb(H, pose.legF, FIG.thigh, FIG.shin);
  limb(S, pose.armB, FIG.upper, FIG.fore);
  const hand = limb(S, pose.armF, FIG.upper, FIG.fore);
  return { head: [head[0], head[1]], joints, hand, foilDir: pose.armF[1] };
}

// ——— The beats ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The touché's step: he lunges 120 px toward Defender (L on 15.2), then recovers as the bar rises. */
const lungeStep = (f: number): number => -110 * impact(f, TOUCHE, 3) * (1 - flow(clamp((f - BAR_RISE) / 12)));
/** The red bar rising on its uprights (L from 15.2&): 0 on the ground → 1 at its height. */
export const barRise = (f: number): number => clamp(springL(f, BAR_RISE, 0.75));
/** The bar's height (layout y) once risen: above his shoulders, so after the 180° roll it lies under his hips (cleared). */
export const BAR = { y: 430, x0: 700, x1: 1220, uprightW: 18, w: 26, ground: 1060 } as const;
/** The bar bends into an ω (amber: infected) as the roll lands on 180° (15.3a, the boing). */
export const barBend = (f: number): number => smoothstep(WORLD_ROLL[3], WORLD_ROLL[3] + 4, f);
/** The red athlete's place (layout px, its head centre) and scale: just behind him, smaller, sliding back from the touché. */
export function redPlace(f: number): { head: [number, number]; k: number } {
  const back = 140 * springL(f, TOUCHE + 1) + 30 * clamp((f - (TOUCHE + 12)) / 30);
  return { head: [470 - back, 420], k: 0.74 };
}
/** Defender's head: (￣▽￣) until the touché's clap, (￣ω￣) — red with an amber ω — from it (taken half a shutter early: the clap's frame is all infected). */
export const redFace = (f: number): string => (struck(TOUCHE, f) ? GUEST_INFECTED.face : GUEST.face);

// ——— Glyph helpers ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Glyphs of `text`, its ink `width` wide centred on layout (cx, cy). */
export function inkText(L: PictoLayout, font: PictoFont, text: string, cx: number, cy: number, width: number, color: (i: number, ch: string) => RGB, extra: Partial<Glyph> = {}): Glyph[] {
  const box = L.ink.get(inkKey(font, text));
  if (!box) throw new Error(`no ink box for ${font} "${text}"`);
  const em = width / (box.right - box.left);
  const line = typeset(text, L.advance[font]);
  const left = cx - (em * (box.left + box.right)) / 2;
  const mid = cy - (em * (box.down - box.up)) / 2;
  const out: Glyph[] = [];
  line.chars.forEach((ch, i) => {
    if (ch.ch.trim() === '') return;
    out.push({ ch: ch.ch, x: X(left + em * ch.x), y: Y(mid), size: em, color: color(i, ch.ch), ...extra });
  });
  return out;
}

// ——— Drawing ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Draw = { shapes: Shape[]; rounded: Glyph[]; display: Glyph[] };
const empty = (): Draw => ({ shapes: [], rounded: [], display: [] });
/** A capsule between two layout points. */
const capsule = (a: readonly [number, number], b: readonly [number, number], w: number, color: RGB, alpha = 1): Shape => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { kind: 'segment', x: X((a[0] + b[0]) / 2), y: Y((a[1] + b[1]) / 2), w: len + w, h: w, rot: -Math.atan2(b[1] - a[1], b[0] - a[0]), color, alpha };
};

/** The track's layers, in drawing order (the Memphis grid snap reveals them one by one: src/shots/drop2Memphis.ts). */
export type TrackLayers = { grid90: Draw; grid45: Draw; lanes: Draw; start: Draw; bar: Draw; red: Draw; foils: Draw; hero: Draw };
export const TRACK_ORDER: readonly (keyof TrackLayers)[] = ['grid90', 'grid45', 'lanes', 'start', 'bar', 'red', 'foils', 'hero'];
/** The grid and the track (world elements) through `map` (layout → layout: the scroll and the roll), clipped to a box around the frame. */
function track(G: Pick<TrackLayers, 'grid90' | 'grid45' | 'lanes' | 'start'>, f: number, map: (x: number, y: number) => [number, number], L: PictoLayout, alpha = 1): void {
  const s = scrollAt(f);
  const reach = 1500;
  let out = G.grid90;
  const line = (x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, a: number) => out.shapes.push(capsule(map(x0, y0), map(x1, y1), w, color, a * alpha));
  // The grid's lines near the screen (world x around the scroll).
  const g = GRID.step;
  const cx = PIVOT[0] + s;
  const i0 = Math.floor((cx - reach - GRID.x0) / g);
  const i1 = Math.ceil((cx + reach - GRID.x0) / g);
  for (let i = i0; i <= i1; i++) line(GRID.x0 + i * g, PIVOT[1] - reach, GRID.x0 + i * g, PIVOT[1] + reach, GRID.width, WHITE, GRID.alpha);
  for (let j = -16; j <= 26; j++) line(cx - reach, GRID.y0 + j * g, cx + reach, GRID.y0 + j * g, GRID.width, WHITE, GRID.alpha);
  out = G.grid45;
  for (let i = i0 - 16; i <= i1 + 16; i++) {
    const x = GRID.x0 + i * g;
    line(x - reach, GRID.y0 - reach, x + reach, GRID.y0 + reach, GRID.width, WHITE, GRID.alpha * 0.8);
    line(x - reach, GRID.y0 + reach, x + reach, GRID.y0 - reach, GRID.width, WHITE, GRID.alpha * 0.8);
  }
  // The lanes: 11 white lines, a tick every 2 grid steps (the stream shows), the start line and its numbers (the signature's bytes).
  out = G.lanes;
  for (let k = 0; k <= TRACK.lanes; k++) {
    const y = TRACK.top + k * TRACK.lane;
    line(cx - reach, y, cx + reach, y, 5, WHITE, 0.92);
    if (k < TRACK.lanes) for (let i = Math.floor((cx - reach) / (2 * g)); i <= Math.ceil((cx + reach) / (2 * g)); i++) line(i * 2 * g + (k % 2) * g, y + 8, i * 2 * g + (k % 2) * g, y + 26, 5, WHITE, 0.8);
  }
  const sx = TRACK.start;
  out = G.start;
  line(sx, TRACK.top, sx, TRACK.top + TRACK.lanes * TRACK.lane, 12, WHITE, 1);
  SIGNATURE.lanes.forEach((byte, k) => {
    const [px, py] = map(sx + 70, TRACK.top + (k + 0.5) * TRACK.lane);
    const a = rollAt(f);
    const tl = typeset(byte, L.advance.display);
    const size = 40;
    tl.chars.forEach((ch) => {
      const dx = (ch.x - tl.width / 2) * size;
      out.display.push({ ch: ch.ch, x: X(px + dx * Math.cos(a)), y: Y(py - dx * Math.sin(a)), size, rot: a, color: WHITE, alpha });
    });
  });
}

/** A figure's strokes (and his head disc and face, or Defender's face as its head) through `map`, at scale k. */
function figure(out: Draw, L: PictoLayout, limbs: Limbs, k: number, color: RGB, head: { face: string; faceColor: (i: number, ch: string) => RGB }, map: (x: number, y: number) => [number, number], rot: number, alpha = 1): void {
  for (const j of limbs.joints) out.shapes.push(capsule(map(j.a[0], j.a[1]), map(j.b[0], j.b[1]), j.w, color, alpha));
  const [hx, hy] = map(limbs.head[0], limbs.head[1]);
  out.shapes.push({ kind: 'ellipse', x: X(hx), y: Y(hy), w: FIG.head * k, h: FIG.head * k, color, alpha });
  const width = FIG.face * k;
  out.rounded.push(...inkText(L, 'rounded', head.face, hx, hy, width, head.faceColor, { rot, alpha }).map((g) => rotateAbout(g, hx, hy, rot)));
}
/** A glyph turned about layout (cx, cy) by `rot` (its own rot is already set). */
function rotateAbout(g: Glyph, cx: number, cy: number, rot: number): Glyph {
  if (rot === 0) return g;
  const [dx, dy] = [g.x - X(cx), g.y - Y(cy)];
  return { ...g, x: X(cx) + dx * Math.cos(rot) - dy * Math.sin(rot), y: Y(cy) + dx * Math.sin(rot) + dy * Math.cos(rot) };
}

/** His figure on the track at `f` (layout px, not rolled: he stays upright). */
export function heroLimbs(f: number, k = 1): Limbs {
  const { pose, facing } = poseAt(HERO_KEYS, f);
  const bob = f < PIC.from + 12 ? -10 * Math.abs(Math.sin(((f - PIC.from) * Math.PI) / SIXTEENTH)) : 0;
  return rig(pose, [HEAD_AT[0] + lungeStep(f), HEAD_AT[1] + bob], k, facing);
}

/**
 * The plan view's landing on 15.1 (review R4; the Memphis grid snap slams the sheet in on this frame): `spread` — the lanes, the start line
 * and the bytes are drawn that much wider about the frame's centre on 15.1 and are home on + 1 (a one-frame settle into register); `stomp`
 * — the figures land squashed on their feet (STOMP: 3 % short, 4 % wide at 1) and spring back, settled by + 6 (a small punch on the kick;
 * continuity plan v07, seam 4800: 6 % dipped his head 46 px under the face block it continues, so the anchor jumped on the cut — at 3 %
 * the head, his run's bob and the rebound included, stays within 40 px over a 12-frame window across the line, 15.1 − 2 … 15.1 + 9).
 * 0 before the snap's instant (SWAP_LEAD early, as the snap), so the sub-frames of 15.1 that the Memphis part draws land the same way.
 */
export function landing(f: number): { spread: number; stomp: number } {
  if (!struck(PIC.from, f)) return { spread: 0, stomp: 0 };
  const t = Math.max(0, f - PIC.from);
  return { spread: 0.04 * clamp(1 - t), stomp: t < 8 ? Math.exp(-0.5 * t) * Math.cos(0.9 * t) : 0 };
}
/** The figures' stomp: their squash at 1 (y short, x wide) about the pivot under their feet (layout px). */
export const STOMP = { short: 0.03, wide: 0.04, pivot: [960, 1060] as const } as const;
/** A drawing scaled by (kx, ky) about layout point `p`: shapes (a stroke's axis and length follow its ends), glyphs. */
function scaleDraw(d: Draw, p: readonly [number, number], kx: number, ky: number): void {
  if (kx === 1 && ky === 1) return;
  const [px, py] = [X(p[0]), Y(p[1])];
  const at = (x: number, y: number): [number, number] => [px + (x - px) * kx, py + (y - py) * ky];
  const k = Math.sqrt(kx * ky);
  d.shapes.forEach((s, i) => {
    const [x, y] = at(s.x, s.y);
    if (s.kind === 'segment') {
      const r = s.rot ?? 0;
      const half = (s.w - s.h) / 2;
      const [ax, ay] = [Math.cos(r) * half * kx, Math.sin(r) * half * ky];
      const h = s.h * k;
      d.shapes[i] = { ...s, x, y, w: 2 * Math.hypot(ax, ay) + h, h, rot: Math.atan2(ay, ax) };
    } else d.shapes[i] = { ...s, x, y, w: s.w * kx, h: s.h * ky };
  });
  for (const list of [d.rounded, d.display])
    list.forEach((g, i) => {
      const [x, y] = at(g.x, g.y);
      list[i] = { ...g, x, y, size: g.size * k };
    });
}

/** The track bar (15.1 → 15.4 − 1) layer by layer: the world (rolling), the bar, the red athlete, the foils and the touché, him. */
export function trackLayers(f: number, L: PictoLayout): TrackLayers {
  const G: TrackLayers = { grid90: empty(), grid45: empty(), lanes: empty(), start: empty(), bar: empty(), red: empty(), foils: empty(), hero: empty() };
  const map = (x: number, y: number) => worldToScreen(x, y, f);
  const roll = rollAt(f);
  track(G, f, map, L);
  const land = landing(f);
  if (land.spread > 0) for (const d of [G.lanes, G.start]) scaleDraw(d, [960, 540], 1 + land.spread, 1 + land.spread);
  let out = G.bar;
  // The uprights and Defender's red bar (in the world: they roll), the bar bending into an amber ω as the roll lands.
  const rise = barRise(f);
  if (rise > 0) {
    const s = scrollAt(BAR_RISE + 6);
    const top = lerp(BAR.ground, BAR.y - 40, rise);
    for (const x of [BAR.x0, BAR.x1]) out.shapes.push(capsule(map(x + s, BAR.ground), map(x + s, top), BAR.uprightW, WHITE));
    const bend = barBend(f);
    const y = lerp(BAR.ground, BAR.y, rise);
    if (bend < 1) out.shapes.push(capsule(map(BAR.x0 + s, y), map(BAR.x1 + s, y), BAR.w, RED, 1 - bend));
    if (bend > 0) {
      const [cx, cy] = map((BAR.x0 + BAR.x1) / 2 + s, y);
      // Upright on screen (the world is upside down by then: rolled with it, his ω would read as an m).
      out.rounded.push({ ch: 'ω', x: X(cx), y: Y(cy), size: (BAR.x1 - BAR.x0) * 0.95 * (0.7 + 0.3 * bend), stretch: 1, rot: 0, color: scaleRGB(AMBER, 1), alpha: bend });
    }
  }
  // Defender's athlete (in the world).
  // It runs at his speed, so in the world it rides the scroll; it rolls with the world.
  out = G.red;
  const rp = redPlace(f);
  const red = poseAt(RED_KEYS, f);
  const rl = rig(red.pose, [rp.head[0] + scrollAt(f), rp.head[1]], rp.k, red.facing);
  const face = redFace(f);
  const omega = [...face].indexOf('ω');
  figure(out, L, rl, rp.k, RED, { face, faceColor: (i) => (i === omega ? AMBER : WHITE) }, map, roll);
  // Its foil (red) and his (white), en garde → the touché.
  out = G.foils;
  const garde = f >= PIC.from + 12;
  if (garde) {
    const foil = (hand: readonly [number, number], dirDeg: number, facing: number, len: number, color: RGB, m: (x: number, y: number) => [number, number]) => {
      const tip: [number, number] = [hand[0] + facing * Math.sin(dirDeg * DEG) * len, hand[1] + Math.cos(dirDeg * DEG) * len];
      out.shapes.push(capsule(m(hand[0], hand[1]), m(tip[0], tip[1]), 10, color));
      const [gx, gy] = m(hand[0] + facing * 14, hand[1]);
      out.shapes.push({ kind: 'ellipse', x: X(gx), y: Y(gy), w: 34, h: 34, color });
      return tip;
    };
    if (f < TOUCHE + 1) foil(rl.hand, rl.foilDir, red.facing, 220 * rp.k, RED, map);
    const me = heroLimbs(f);
    const meF = poseAt(HERO_KEYS, f).facing;
    if (f < BAR_RISE) {
      // His foil follows his forearm, and through the lunge swings onto Defender's chest: the tip lands on it on the clap.
      const chestAt = (g: number): [number, number] => {
        const r = rig(poseAt(RED_KEYS, g).pose, [redPlace(g).head[0] + scrollAt(g), redPlace(g).head[1]], redPlace(g).k, poseAt(RED_KEYS, g).facing).joints[0];
        return worldToScreen((r.a[0] + r.b[0]) / 2, r.a[1] * 0.6 + r.b[1] * 0.4, g);
      };
      const lunge = impact(f, TOUCHE, 4);
      const target = chestAt(Math.min(f, TOUCHE));
      const fore: [number, number] = [meF * Math.sin(me.foilDir * DEG), Math.cos(me.foilDir * DEG)];
      const want: [number, number] = [target[0] - me.hand[0], target[1] - me.hand[1]];
      const wl = Math.hypot(want[0], want[1]);
      const dirX = lerp(fore[0], want[0] / wl, lunge);
      const dirY = lerp(fore[1], want[1] / wl, lunge);
      const dl = Math.hypot(dirX, dirY);
      const len = lerp(260, Math.min(wl, 420), lunge);
      const tip: [number, number] = [me.hand[0] + (dirX / dl) * len, me.hand[1] + (dirY / dl) * len];
      out.shapes.push(capsule(me.hand, tip, 10, WHITE));
      out.shapes.push({ kind: 'ellipse', x: X(me.hand[0] + meF * 14), y: Y(me.hand[1]), w: 34, h: 34, color: WHITE });
      // The touché: a white burst at the tip on 15.2 (the clap), gone in 8 frames.
      const t = f - TOUCHE;
      if (t >= 0 && t < 10) {
        const e = 1 - t / 10;
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8 + 0.3;
          const r0 = 20 + 30 * (1 - e);
          out.shapes.push(capsule([tip[0] + Math.cos(a) * r0, tip[1] + Math.sin(a) * r0], [tip[0] + Math.cos(a) * (r0 + 60 * e), tip[1] + Math.sin(a) * (r0 + 60 * e)], 12 * e + 2, WHITE));
        }
        out.shapes.push({ kind: 'ellipse', x: X(tip[0]), y: Y(tip[1]), w: 70 * e, h: 70 * e, color: WHITE });
      }
    }
  }
  // Him: upright, never rolled, drawn last.
  const me = heroLimbs(f);
  figure(G.hero, L, me, 1, AMBER, { face: HERO2.base, faceColor: () => INK }, (x, y) => [x, y], 0);
  if (land.stomp !== 0) for (const d of [G.red, G.foils, G.hero]) scaleDraw(d, STOMP.pivot, 1 + STOMP.wide * land.stomp, 1 - STOMP.short * land.stomp);
  return G;
}
/** The layers concatenated in their order, as flat content. */
export function joinLayers(G: TrackLayers, which: readonly (keyof TrackLayers)[] = TRACK_ORDER): FlatContent {
  const out = empty();
  for (const k of which) {
    out.shapes.push(...G[k].shapes);
    out.rounded.push(...G[k].rounded);
    out.display.push(...G[k].display);
  }
  return { under: out.shapes, glyphs: { rounded: out.rounded, display: out.display }, over: [] };
}
/** The track bar as flat content. */
const trackFrame = (f: number, L: PictoLayout): FlatContent => joinLayers(trackLayers(f, L));

// ——— The contact sheet (15.4) and the hinge (15.4& → 16.1) ————————————————————————————————————————————————————————————————————————

/**
 * The sheet: 3 × 3 tiles of the 1080p frame (640 × 360 each), white gutters, framed at 1.425× so the outer tiles are cropped and his head
 * in the centre tile is 130 px (HANDOFFS SHEET).
 */
export const SHEET_GRID = { cols: 3, rows: 3, w: 640, h: 360, gutter: 10, zoom: 1.425 } as const;
/** Each outer tile's flop angle (degrees, the world rolled): clockwise round the centre from the top-left. */
export const TILE_ANGLES: readonly { col: number; row: number; deg: number }[] = [
  { col: 0, row: 0, deg: 0 },
  { col: 1, row: 0, deg: 45 },
  { col: 2, row: 0, deg: 90 },
  { col: 2, row: 1, deg: 135 },
  { col: 2, row: 2, deg: 180 },
  { col: 1, row: 2, deg: 225 },
  { col: 0, row: 2, deg: 270 },
  { col: 0, row: 1, deg: 315 },
];
/** His head in the centre tile: 130 px on screen at the sheet's framing (HANDOFFS SHEET). */
export const SHEET_HEAD = 130;
/** The figures' scales in the sheet (sheet px): him in the centre tile (head 130 on screen), the flops in the outer tiles. */
const CENTRE_K = SHEET_HEAD / SHEET_GRID.zoom / FIG.head;
const OUTER_K = 0.3;
/** His head's place in the centre tile (sheet layout px). */
export const SHEET_HEAD_AT: readonly [number, number] = [960, 540 - 0.31 * SHEET_GRID.h];

/** One tile's content (sheet layout px → the flat world): its ground and its picture. */
function tile(out: Draw, col: number, row: number, L: PictoLayout): void {
  const { w, h, gutter } = SHEET_GRID;
  const cx = col * w + w / 2;
  const cy = row * h + h / 2;
  const i = TILE_ANGLES.findIndex((t) => t.col === col && t.row === row);
  const isCentre = i < 0;
  out.shapes.push({ kind: 'rect', x: X(cx), y: Y(cy), w: w - gutter, h: h - gutter, color: isCentre ? TILE_COLOURS[0] : TILE_COLOURS[(i % 4) + 1] });
  if (isCentre) {
    const limbs = rig(POSES.victory, [SHEET_HEAD_AT[0], SHEET_HEAD_AT[1]], CENTRE_K, 1);
    figure(out, L, limbs, CENTRE_K, AMBER, { face: HERO2.base, faceColor: () => INK }, (x, y) => [x, y], 0);
    return;
  }
  // The flop, frozen at the tile's angle: the bar, its uprights, him arched over it — all turned about the tile's centre.
  const a = TILE_ANGLES[i].deg * DEG;
  const m = (x: number, y: number): [number, number] => {
    const [dx, dy] = [x - cx, y - cy];
    return [cx + dx * Math.cos(a) + dy * Math.sin(a), cy - dx * Math.sin(a) + dy * Math.cos(a)];
  };
  // Its scene sits toward the sheet's centre (the framing crops the outer half of every outer tile).
  const ix = cx + Math.sign(1 - TILE_ANGLES[i].col) * w * 0.2;
  const iy = cy + Math.sign(1 - TILE_ANGLES[i].row) * h * 0.12;
  const head: [number, number] = [ix, iy - 0.2 * h];
  const by = head[1] + (BAR.y - HEAD_AT[1]) * OUTER_K;
  const mm = (x: number, y: number): [number, number] => {
    const [dx, dy] = [x - ix, y - iy];
    return [ix + dx * Math.cos(a) + dy * Math.sin(a), iy - dx * Math.sin(a) + dy * Math.cos(a)];
  };
  for (const x of [ix - 110, ix + 110]) out.shapes.push(capsule(mm(x, by - 8), mm(x, iy + h * 0.5), 6, WHITE));
  out.shapes.push(capsule(mm(ix - 125, by), mm(ix + 125, by), 9, RED));
  void m;
  figure(out, L, rig(POSES.flop, head, OUTER_K, 1), OUTER_K, WHITE, { face: HERO2.base, faceColor: () => lin(P.deep) }, mm, a);
}

/** The sheet's content (the flat world, 1 unit = 1 sheet px): `which` tiles — all, the centre alone, or the eight outer ones. */
export function sheetContent(L: PictoLayout, which: 'all' | 'centre' | 'outer' = 'all'): FlatContent {
  const out = empty();
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const centre = col === 1 && row === 1;
      if ((which === 'centre' && !centre) || (which === 'outer' && centre)) continue;
      tile(out, col, row, L);
    }
  return { under: out.shapes, glyphs: { rounded: out.rounded, display: out.display }, over: [] };
}

/** The camera over the sheet (15.4 → 15.4& − 1): framed at 1.425× with a breath of drift. */
export const sheetZoom = (f: number): number => SHEET_GRID.zoom * (1 + 0.012 * clamp((f - SHEET) / 12));
/** How far into the push we are (15.4& → 16.1): an impact into the light, with a launch's first shove (L then I). */
export const pushAt = (f: number): number => (f < HINGE.from ? 0 : clamp(0.55 * impact(f, HINGE.to, HINGE.to - HINGE.from) + 0.45 * springL(f, HINGE.from, 0.75)));
/** Where the camera looks (sheet layout px): the sheet's centre, sliding onto his head as we push in. */
export function sheetAim(f: number): [number, number] {
  return [960, lerp(540, SHEET_HEAD_AT[1], flow(pushAt(f)))];
}
/** His head in the centre tile, in the sheet's world (x, y from the frame centre, y up): the tube's axis. */
const HEAD_WORLD: readonly [number, number] = [SHEET_HEAD_AT[0] - 960, 540 - SHEET_HEAD_AT[1]];
/** The head's size in the sheet (px): the push scales it 130 → 520 on screen. */
const HEAD_SHEET = FIG.head * CENTRE_K;
/** The lens: 20° (the flat world's) widening to 40° as we push (a dolly-zoom: the tube's walls race past). */
export const TUBE_FOV = { from: 20, to: 40 } as const;
/**
 * The camera in the tube (15.4& → 16.1): the push grows his head 130 → 520 px on screen (log-linear) while the lens widens; its distance
 * follows from both. A perspective pose in the sheet's world (the flat layer and the walls share it).
 */
export function tubeCamera(f: number): { position: [number, number, number]; target: [number, number, number]; fov: number; head: number } {
  const p = pushAt(f);
  const z0 = sheetZoom(HINGE.from);
  const head = SHEET_HEAD * (z0 / SHEET_GRID.zoom) * (520 / (SHEET_HEAD * (z0 / SHEET_GRID.zoom))) ** p;
  const fov = lerp(TUBE_FOV.from, TUBE_FOV.to, flow(p));
  const distance = (HEAD_SHEET * 1080) / (2 * Math.tan((fov * DEG) / 2) * head);
  const aim = sheetAim(f);
  const [x, y] = [aim[0] - 960, 540 - aim[1]];
  return { position: [x, y, distance], target: [x, y, 0], fov, head };
}

/**
 * The tube the tiles fold into: a funnel of 8 mirrors round his head — its far end an octagon `end` px from his head's centre (in the
 * sheet), flaring to `far` at `depth` toward the camera, so the camera ends inside it and the walls stream past.
 */
export const TUBE = { end: 110, far: 760, depth: 1500 } as const;
/** How far tile `i` has folded (0 flat in the sheet → 1 a wall of the tube), staggered half a frame round the ring, all in by 16.1 − 1 (I). */
export const foldAt = (f: number, i: number): number => impact(f, HINGE.to - 1, HINGE.to - 1 - HINGE.from - i * 0.5);

/** One wall of the tube: its four corners in the sheet's world (x, y sheet px from the frame centre, y up; z toward the camera), its uv box. */
export type Wall = { corners: [number, number, number][]; uv: [number, number, number, number]; tile: number };
/**
 * The eight walls at `f`. Each outer tile's corners go from their place in the flat sheet to the matching place on the funnel's side that
 * faces its way out (its across position → along the octagon's side, its distance from the centre → up the funnel toward the camera),
 * swinging up through an arc as they fold; `uv` is the tile's box in the sheet (0–1, v up).
 */
export function wallsAt(f: number): Wall[] {
  const { w, h, gutter } = SHEET_GRID;
  const half = Math.tan(Math.PI / 8);
  return TILE_ANGLES.map((t, i) => {
    const k = foldAt(f, i);
    const x0 = t.col * w + gutter / 2 - 960;
    const x1 = (t.col + 1) * w - gutter / 2 - 960;
    const y0 = 540 - ((t.row + 1) * h - gutter / 2);
    const y1 = 540 - (t.row * h + gutter / 2);
    const o: [number, number] = [Math.sign(t.col - 1), -Math.sign(t.row - 1)];
    const n = Math.hypot(o[0], o[1]);
    const u: [number, number] = [o[0] / n, o[1] / n];
    const across: [number, number] = [-u[1], u[0]];
    const flat = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const;
    const al = flat.map(([x, y]) => x * u[0] + y * u[1]);
    const ac = flat.map(([x, y]) => x * across[0] + y * across[1]);
    const [a0, a1] = [Math.min(...al), Math.max(...al)];
    const [c0, c1] = [Math.min(...ac), Math.max(...ac)];
    const corners = flat.map(([x, y], j) => {
      const a = (al[j] - a0) / (a1 - a0);
      const s = (2 * (ac[j] - c0)) / (c1 - c0) - 1;
      const r = lerp(TUBE.end, TUBE.far, a);
      const end: [number, number, number] = [HEAD_WORLD[0] + u[0] * r + across[0] * s * r * half, HEAD_WORLD[1] + u[1] * r + across[1] * s * r * half, a * TUBE.depth];
      const lift = Math.sin(Math.PI * k) * a * 260;
      return [lerp(x, end[0], k), lerp(y, end[1], k), lerp(0, end[2], k) + lift] as [number, number, number];
    });
    return { corners, uv: [(x0 + 960) / 1920, (y0 + 540) / 1080, (x1 + 960) / 1920, (y1 + 540) / 1080] as [number, number, number, number], tile: i };
  });
}

/**
 * The light at the tube's end: 0 before the hinge, gathering with the push but held back (0.55 at most, his face still legible), so the
 * kaleidoscope's white on 16.1 is the step: the impact lands on the crash, not two frames early (review 2026-10-02: the sheet's
 * "0.45 → 0.88 by 1439" put the biggest change on 1438; now the frame mean is 0.45 → 0.66 by 1439, then 0.98 on 16.1).
 */
export const tubeLight = (f: number): number => (f < HINGE.from ? 0 : f >= HINGE.to ? 1 : 0.55 * clamp((f - HINGE.from) / (HINGE.to - HINGE.from)) ** 1.5);
/**
 * The light strikes half a shutter early (SWAP_LEAD): the tube's last half-frame burns white, so 16.1's whole shutter is the light (the
 * film's brightest frames: mean relative luminance ≥ 0.97 on 16.1 and 16.1 + 1) and 16.1 − 1 keeps the tube's 0.66.
 */
export const tubeWhite = (f: number): number => smoothstep(HINGE.to - SWAP_LEAD - 0.5, HINGE.to - SWAP_LEAD, f);

// ——— The frame ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Camera = { position: [number, number, number]; target: [number, number, number]; fov: number };
export type PictoFrame =
  | { mode: 'track'; ground: RGB; content: FlatContent }
  | { mode: 'sheet'; ground: RGB; camera: Camera; content: FlatContent }
  | { mode: 'tube'; ground: RGB; camera: Camera; sheet: FlatContent; centre: FlatContent; glow: FlatContent; walls: Wall[]; light: number };

/** The flat world's camera framing the sheet at `zoom`, aimed at sheet layout point `aim`. */
const frontalCamera = (zoom: number, aim: readonly [number, number]): Camera => {
  const d = 1080 / 2 / Math.tan((10 * Math.PI) / 180) / zoom;
  return { position: [aim[0] - 960, 540 - aim[1], d], target: [aim[0] - 960, 540 - aim[1], 0], fov: 20 };
};

/** The bar at instant `f`: the track (to 15.4), the contact sheet (15.4), the fold into the tube (15.4& → 16.1). */
export function pictoFrame(f: number, L: PictoLayout): PictoFrame {
  // The sheet cuts in on the kick, taken half a shutter early (SWAP_LEAD) so its frame is all sheet, the frame before all track.
  if (!struck(SHEET, f)) return { mode: 'track', ground: GROUND, content: trackFrame(f, L) };
  if (f < HINGE.from) return { mode: 'sheet', ground: lin('#F4F1EA'), camera: frontalCamera(sheetZoom(f), sheetAim(f)), content: sheetContent(L) };
  const l = tubeLight(f);
  const cam = tubeCamera(f);
  // The light gathers on his head at the tube's end (sheet px, round the axis), filling the frame toward 16.1.
  const r = HEAD_SHEET * (0.9 + 5 * l * l);
  const glow: FlatContent = { under: [{ kind: 'ellipse', x: HEAD_WORLD[0], y: HEAD_WORLD[1], w: 2 * r, h: 2 * r, color: [1.2 * l, 1.17 * l, 1.08 * l], soft: r * 0.8 }], glyphs: {}, over: [] };
  return { mode: 'tube', ground: lin(PALETTES.kaleido.rim), camera: cam, sheet: sheetContent(L, 'outer'), centre: sheetContent(L, 'centre'), glow, walls: wallsAt(f), light: l };
}

// ——— Photography ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Sub-frames (shutter 0.5): 48 under the roll's snaps and the hinge's push, 32 on the sprint (the track at 40 px a frame) and the touché, 24 elsewhere. */
export function pictoTemporal(f: number): Temporal {
  const T = (samples: number): Temporal => ({ samples, shutter: 0.5, persistence: 0 });
  if (f >= HINGE.from - 1) return T(48);
  if (f >= WORLD_ROLL[0] - 1 && f < WORLD_ROLL[3] + 5) return T(48);
  if (f < PIC.from + 18 || (f >= TOUCHE - 1 && f < TOUCHE + 6)) return T(32);
  return T(24);
}
export const pictoSegment = (f: number): Segment => drop2Segment(f);
/** Flat (Aicher's system is print), a breath of bloom for the light at the tube's end. */
export function pictoLook(f: number): Look {
  const l = tubeLight(f);
  return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.5 * l, threshold: 0.92, smoothing: 0.2, radius: 0.7 }, aberration: 0, grain: 0.03, vignette: 0 };
}

/** The drums the picture moves on (tests): the kicks, the drumline's 16ths under the roll. */
export const DRUMS = { kicks: KICKS2.filter((k) => k >= PIC.from && k < PIC.to), drumline: DRUMLINE2 } as const;
/** The face on his head disc and Defender's are the cast's (no new face). */
export const FACES = { hero: HERO2.base, defender: [GUEST.face, GUEST_INFECTED.face] } as const;
