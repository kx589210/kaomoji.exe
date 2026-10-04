// S31U UKIYO-E · THE MOCHI WAVE, drop2 10.1–12.1 − 1, with DROP2_THREADS.waveStyle 'mochi' (src/shots/drop2Threads.ts; the film's default
// since 2026-10-03; 'v09' draws v09's wave, src/shots/drop2Wave.ts). The redesign of 2026-10-03 (the 4-direction design round, chosen
// over the old wave): output/qa/wave-lab/final/ (index.html, port-spec.md, note.md, the stills). Defender
// v2.0 prints a woodblock: the key block on 10.1, the baren rubs the sky in (10.1e), then the pale (10.1&), Prussian (10.1a) and red (10.2)
// plates drop off register and snap home; he is amber from the first frame. A round mochi wave with stepped blue bands and a smooth white
// cap: he rides it (24–60), the push-in and the indigo iris mie (72, 10.4), the launch and flip (84), the flop into a halftone white-out
// (96, 11.1, ザッパーン), the drain in steps (102 / 108 / 114), the stacked-mochi stage lift and the byte seal (120, 11.2: every plate but
// the stage lifts off and re-registers on 126 / 132), the rowers infected (144–156), the spin mie on the apex (168, 11.4) — and then the
// film's own hand-off (the lead's ruling 1): he leaps from the apex to the arcade's mothership while Defender downsamples the world.
// Rulings 2–4: the katakana lettering behind DROP2_THREADS.mochiSfx; the rowers (the film's guest variants), the cartouche, the byte
// stamp, the small (•ω•) mountain and the scoreboard's dock (src/shots/drop2SwitchSlot.ts) kept, restyled; the 11.1 white-out kept.
// Every function here is pure in the instant: the drawing goes to VecItem layers (src/shots/drop2MochiPen.ts); the halftone's dots, the
// mie's indigo and the paper are drawn by the scene's print pass (src/scenes/drop2WaveMochi.ts) from the numbers this frame hands it.
// Local frames as in drop2MochiKit.ts: 0 = drop2 10.1 (BURST).
import { MOCHI_CARTOUCHE, MOCHI_FUJI_FACE, MOCHI_ROWERS, MOCHI_SFX } from '../content/drop2Mochi.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { FLAT_LOOK, type Look } from '../engine/types.ts';
import { BURST, DOWNSAMPLE } from '../score/drop2.ts';
import { v07Frame } from '../score/film.ts';
import { GP, HERO_BITMAP, MOTHERSHIP, SIGNATURE_BITS, cellCentre, litOf } from './drop2ArcadeSprites.ts';
import { LAW, drop2Segment } from './drop2Shared.ts';
import { LAST, boxBurstAt, crackBeams, switchLook, toScreen as switchScreen } from './drop2Switch.ts';
import { type SprayPixel, type WaveCam, type WaveFrame, type WaveLayer, LEAP_DROPS, MOTHERSHIP_WIDTH, defaultRounded, derezAt, downsampleCell, dropAt, scanLineY } from './drop2Wave.ts';
import { MOUNTAIN, MOUNTAIN_FACES } from './drop2WaveGeom.ts';
import {
  BURSTS,
  BYTES,
  CART,
  COL_FOOT,
  COL_SEA,
  COL_X,
  HERO_PX,
  type HeroState,
  IMPACT,
  LANDINGS,
  LEAP,
  type MochiCam,
  N,
  type OPt,
  type Plate,
  type PlateState,
  POSES,
  type Pose,
  TIERS,
  type XY,
  atU,
  barenPos,
  birdOffsets,
  burstOrigin,
  camera,
  capTh,
  clamp,
  colStack,
  domeR,
  drainY,
  easeIn,
  fromScreen,
  heroState,
  hitPop,
  hop8,
  kick,
  landEase,
  lerp,
  mainA,
  mainPose,
  mulberry32,
  planeMatrix,
  plateAt,
  rebA,
  reboundPose,
  ring,
  rowerFace,
  smooth,
  toScreen,
  track,
  whirlAngle,
  WT,
} from './drop2MochiKit.ts';
import { type Fonts, Path, Pen, capsuleP, circleP, clampInto, clipConvex, convexHull, dashRuns, domeP, mochiP, path, polyP, rrectP, runsInside } from './drop2MochiPen.ts';

// ——— §9 Colours (the prototype's; the hero's amber and Defender's red are the film's LAW) ————————————————————————————————————————

const HEX = {
  paper: '#F3EAD3',
  paperD: '#E4D6B4',
  ink: '#1B2546',
  inkH: '#22160A',
  b0: '#B9DFF5',
  b1: '#8CC1EA',
  b2: '#5F98D4',
  b3: '#3E70B5',
  b4: '#264B8E',
  sea0: '#1C3770',
  sea1: '#284F92',
  sky0: '#132650',
  sky1: '#1C3770',
  sky2: '#284F92',
  glow: '#CDE6F0',
  foam: '#FFFDF6',
  white: '#FFFFFF',
  mist: '#EAD8A9',
  mist2: '#F2E6C4',
  mistE: '#C9AE72',
  mtn: '#5C7DB6',
  mtnL: '#9FB9DE',
  mtnFace: '#EEF4FC',
  red: LAW.defender.print,
  redS: '#B9311F',
  amber: LAW.hero,
  baren: '#26345E',
  barenR: '#3B4E86',
  barenH: '#4A5F98',
  sw1: '#2E5DA0',
  sw2: '#244E91',
  sw3: '#1B3C78',
  whirl: '#142955',
  whirlArm: '#7FB0E0',
  wavelet: '#F0F8FF',
  swellHi: '#CDE6F0',
  cart: '#F7EEDB',
  sfxBlue: '#9CCBEE',
} as const;
type InkName = keyof typeof HEX;
/** Defender's 8-bit downgrade of the same print (the downsample, 11.4: drawn on black, then quantised above the scan line). */
const GAME: Partial<Record<InkName, string>> = {
  paper: '#000000',
  paperD: '#0A1440',
  ink: '#000000',
  inkH: '#000000',
  b0: '#3BD6FF',
  b1: '#3BD6FF',
  b2: '#1F6FD6',
  b3: '#1A3BB0',
  b4: '#1A3BB0',
  sea0: '#0A1440',
  sea1: '#1A3BB0',
  sky0: '#000000',
  sky1: '#000000',
  sky2: '#000000',
  glow: '#000000',
  foam: '#F2F2F2',
  white: '#F2F2F2',
  mist: '#0A1440',
  mist2: '#0A1440',
  mistE: '#0A1440',
  mtn: '#1F6FD6',
  mtnL: '#3BD6FF',
  mtnFace: '#F2F2F2',
  sw1: '#1A3BB0',
  sw2: '#1A3BB0',
  sw3: '#0A1440',
  whirl: '#0A1440',
  whirlArm: '#1F6FD6',
  wavelet: '#3BD6FF',
  swellHi: '#3BD6FF',
  cart: '#000000',
};
const PRINT_INK = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, linear(v)])) as Record<InkName, RGB>;
const GAME_INK = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, linear(GAME[k as InkName] ?? v)])) as Record<InkName, RGB>;
/** The mochi's inks, sRGB hex (for tests: the colour law). */
export const MOCHI_HEX = HEX;
const BANDS: readonly InkName[] = ['b0', 'b1', 'b2', 'b3', 'b4'];
/** M PLUS Rounded 1c Black's word space (em): the byte seal's spacing (its atlas holds no space). */
export const ROUNDED_SPACE = 0.298;

// ——— The frame's context ——————————————————————————————————————————————————————————————————————————————————————————————————

type Ctx = {
  pen: Pen;
  I: Record<InkName, RGB>;
  /** Overlay and camera time (local frames) and the world's time (WT). */
  f: number;
  t: number;
  cam: MochiCam;
  PL: Record<Plate, PlateState>;
  PLS: Record<Plate, PlateState>;
  stage: boolean;
  sfx: boolean;
};
const PLATES: readonly Plate[] = ['key', 'sky', 'pale', 'deep', 'red'];
const plate = (x: Ctx, name: Plate): PlateState => (x.stage ? x.PLS : x.PL)[name];
const applyCam = (x: Ctx, p: number): void => x.pen.setTransform(planeMatrix(x.cam, p));

/** Fill on a plate: unprinted = bare paper (it still hides what is behind it); printed = its colour, off register while it snaps. */
function pfill(x: Ctx, name: Plate, color: RGB, p: Path | readonly XY[], opaque = true, alpha = 1): void {
  const s = plate(x, name);
  const fill = (q: Path | readonly XY[], c: RGB, a: number): void => (q instanceof Path ? x.pen.fill(q, c, a) : x.pen.fillPts(q, c, a));
  if (!s.on) {
    if (opaque) fill(p, x.I.paper, 1);
    return;
  }
  if (s.dx || s.dy) {
    if (opaque) fill(p, x.I.paper, 1);
    x.pen.save();
    x.pen.translate(s.dx, s.dy);
    fill(p, color, alpha);
    x.pen.restore();
  } else fill(p, color, alpha);
}
/** pfill of a shape clipped to `clip` (the prototype's clip(): the shape, off register while it snaps, cut to the unmoved clip). */
function pfillClip(x: Ctx, name: Plate, color: RGB, pts: readonly XY[], clip: readonly XY[], opaque = true, alpha = 1, convex = false): void {
  const s = plate(x, name);
  const cut = (q: readonly XY[]): XY[] => (convex ? clipConvex(q, clip) : clampInto(q, clip));
  if (!s.on) {
    if (opaque) x.pen.fillPts(cut(pts), x.I.paper, 1);
    return;
  }
  if (opaque && (s.dx || s.dy)) x.pen.fillPts(cut(pts), x.I.paper, 1);
  const moved = s.dx || s.dy ? pts.map((q) => [q[0] + s.dx, q[1] + s.dy] as XY) : pts;
  x.pen.fillPts(cut(moved), color, alpha);
}
function pstroke(x: Ctx, name: Plate, color: RGB, lw: number, p: Path | readonly XY[], alpha = 1): void {
  const s = plate(x, name);
  if (!s.on) return;
  x.pen.save();
  x.pen.translate(s.dx, s.dy);
  if (p instanceof Path) x.pen.stroke(p, lw, color, alpha);
  else x.pen.strokePts(p, lw, color, alpha);
  x.pen.restore();
}
function ptext(x: Ctx, name: Plate, color: RGB, s: string, px: number, py: number, size: number, align: 'left' | 'center' = 'center'): void {
  const st = plate(x, name);
  if (!st.on) return;
  x.pen.text('rounded', s, px + st.dx, py + st.dy, size, color, { align });
}
const keyline = (x: Ctx, p: Path | readonly XY[], lw = 5, col?: RGB): void => {
  if (p instanceof Path) x.pen.stroke(p, lw, col ?? x.I.ink);
  else x.pen.strokePts(p, lw, col ?? x.I.ink);
};
/** A foam drop with an ink ring (no inner highlight). */
function drop(x: Ctx, px: number, py: number, r: number, col: RGB, lw = 3): void {
  if (r <= 0.4) return;
  const c = circleP(px, py, r);
  x.pen.fill(c, col);
  x.pen.stroke(c, lw, x.I.ink);
}

// ——— §4 The mochi ————————————————————————————————————————————————————————————————————————————————————————————————————————————

function bodyPoly(A: readonly OPt[], by: number, lift: number): XY[] {
  const n = A.length;
  return [[A[0].x - 400, by + lift], ...A.map((p) => [p.x, p.y] as XY), [A[n - 1].x + 400, by + lift], [A[n - 1].x + 400, by + 420], [A[0].x - 400, by + 420]];
}
function drawWave(x: Ctx, t: number, P: Pose, A: readonly OPt[]): void {
  if (!P.vis || P.g <= 0.01) return;
  const n = A.length;
  const gs = Math.max(0.4, Math.min(1.1, P.g * Math.pow(P.sy, 0.3)));
  const body = bodyPoly(A, P.by, 40);
  pfill(x, 'pale', x.I.b0, body);
  // The stepped woodblock bokashi: nested copies of the outline, each lower and further back, each a step deeper (inside the body).
  for (let k = 1; k <= 4; k++) {
    const sxk = 1 - 0.05 * k;
    const syk = 1 - 0.165 * k;
    const ox = -34 * k * P.g;
    const copy: XY[] = [[A[0].x - 400, P.by + 60], ...A.map((q) => [P.bx + (q.x - P.bx) * sxk + ox, P.by + (q.y - P.by) * syk] as XY), [A[n - 1].x + 400, P.by + 60], [A[n - 1].x + 400, P.by + 420], [A[0].x - 400, P.by + 420]];
    pfillClip(x, k === 1 ? 'pale' : 'deep', x.I[BANDS[k]], copy, body);
  }
  // Two white flow streams riding the band steps up the back into the crown (the dashes travel: the water climbs).
  for (const [k, sp, ph] of [
    [1.5, 5.2, 0],
    [3.4, 4.2, 140],
  ]) {
    const sxk = 1 - 0.05 * k;
    const syk = 1 - 0.165 * k;
    const ox = -34 * k * P.g;
    const line: XY[] = [];
    for (const q of A) if (q.u >= 0.1 && q.u <= 0.62) line.push([P.bx + (q.x - P.bx) * sxk + ox, P.by + (q.y - P.by) * syk]);
    for (const run of dashRuns(line, 150 * gs + 30, 70 * gs + 20, -t * sp - ph)) pstroke(x, 'pale', x.I.foam, 11 * gs, run, 0.9);
  }
  // The mochi shine: a soft gummy highlight on the back.
  {
    const line: XY[] = [];
    for (const q of A) if (q.u >= 0.17 && q.u <= 0.29) line.push([q.x - q.nx * 46 * gs, q.y - q.ny * 46 * gs]);
    pstroke(x, 'pale', x.I.white, 26 * gs, line, 0.55);
    const d = atU(A, 0.315);
    pfill(x, 'pale', x.I.white, circleP(d.x - d.nx * 46 * gs, d.y - d.ny * 46 * gs, 13 * gs), false, 0.55);
  }
  // The white cap, its keyline and a white piping line under it.
  const cap = A.filter((p) => p.u >= 0.33 && p.u <= 0.8);
  const breathe = 1 + 0.08 * Math.max(0, ring(t, 48, 14, 5)) + 0.06 * Math.max(0, ring(t, 24, 14, 5));
  const th = (p: OPt): number => capTh(p.u, gs) * breathe;
  const capPts: XY[] = [...cap.map((p) => [p.x + p.nx * 10, p.y + p.ny * 10] as XY), ...[...cap].reverse().map((p) => [p.x - p.nx * th(p), p.y - p.ny * th(p)] as XY)];
  pfillClip(x, 'pale', x.I.foam, capPts, body);
  const inner: XY[] = [];
  for (const p of cap) if (th(p) >= 1) inner.push([p.x - p.nx * th(p), p.y - p.ny * th(p)]);
  keyline(x, inner, 5);
  const pipe: XY[] = [];
  for (const p of cap) if (p.u >= 0.45 && p.u <= 0.72) pipe.push([p.x - p.nx * (th(p) + 20 * gs), p.y - p.ny * (th(p) + 20 * gs)]);
  pstroke(x, 'pale', x.I.foam, 7 * gs, pipe, 0.95);
  // The outline.
  const out: XY[] = [[A[0].x - 400, P.by + 40], [A[0].x, A[0].y + 2], ...A.map((p) => [p.x, p.y] as XY), [A[n - 1].x + 400, P.by + 40]];
  keyline(x, out, 7);
}

// ——— The seri: a kagami-mochi stack of water tiers ——————————————————————————————————————————————————————————————————————————

function drawTier(x: Ctx, f: number, cx: number, y: number, w: number, h: number, k: number, lift: number): void {
  const r = h * 0.46;
  const sqz = 0.14 * ring(f, lift, 12, 4) + 0.08 * ring(f, lift + 2, 12, 4);
  const ww = w * (1 + sqz);
  const hh = h * (1 - sqz * 0.8);
  const x0 = cx - ww / 2;
  const y0 = y + (h - hh);
  const shape = (ins: number, dy: number): XY[] => domeP(path(), x0 + ins, y0 + dy, ww - 2 * ins, hh - dy + 40, Math.max(8, r - ins * 0.5), 26 - ins * 0.4).pts;
  const body = shape(0, 0);
  pfill(x, 'pale', x.I.b0, body);
  const hull = convexHull(body);
  for (let b = 1; b <= 3; b++) pfillClip(x, b === 1 ? 'pale' : 'deep', x.I[BANDS[Math.min(4, b + (k > 0 ? 1 : 0))]], shape(b * 16, b * 30 + 16), hull, true, 1, true);
  // The white rim on the tier's top.
  const rim = path().ellipse(cx, y0 - 6, ww * 0.5 + 10, 40, 0, 0, Math.PI * 2).pts;
  pfillClip(x, 'pale', x.I.foam, rim, hull, true, 1, true);
  const rl = path().ellipse(cx, y0 - 6, ww * 0.5 + 10, 40, 0, 0.12, Math.PI - 0.12).pts;
  for (const run of runsInside(rl, body)) keyline(x, run, 4.5);
  // A gummy shine.
  const sh = path().moveTo(x0 + ww * 0.14, y0 + hh * 0.5).quadraticCurveTo(x0 + ww * 0.13, y0 + hh * 0.28, x0 + ww * 0.24, y0 + hh * 0.24);
  pstroke(x, 'pale', x.I.white, 14, sh.pts, 0.6);
  keyline(x, [...body, body[0]], 7);
}
function drawColumn(x: Ctx, f: number): void {
  if (f < 103 || f > 146) return;
  const S = colStack(f);
  if (S.e[0] < 2) return;
  x.stage = true;
  // A flared foot of water where the stack leaves the sea; the newest (widest) tier at the bottom, the first one on top.
  const fy = COL_SEA - COL_FOOT + 820 * easeIn((f - 128) / 14, 1.8);
  const fw = 300 + 30 * ring(f, 120, 12, 4);
  const foot = path()
    .moveTo(COL_X - fw - 120, 1300)
    .quadraticCurveTo(COL_X - fw - 10, fy + 40, COL_X - fw + 40, fy)
    .quadraticCurveTo(COL_X, fy - 40, COL_X + fw - 40, fy)
    .quadraticCurveTo(COL_X + fw + 10, fy + 40, COL_X + fw + 120, 1300)
    .closePath();
  pfill(x, 'deep', x.I.b3, foot);
  keyline(x, foot, 7);
  for (let k = TIERS.length - 1; k >= 0; k--) {
    if (S.e[k] < 1) continue;
    const g = S.e[k] / (TIERS[k].h - 26);
    drawTier(x, f, COL_X, S.ys[k], TIERS[k].w * (1 + 0.18 * (1 - Math.min(1, g))), S.e[k] + 26, k, TIERS[k].at);
  }
  x.stage = false;
}

// ——— Sky, baren, mist ———————————————————————————————————————————————————————————————————————————————————————————————————————

function drawSky(x: Ctx, f: number): void {
  const s = x.PL.sky;
  if (!s.on) return;
  const b = f < 12 ? barenPos(f) : null;
  const R = b ? b.r * 1.1 : 0;
  const xr = (y: number): number => (b ? b.x + (Math.abs(y - b.y) < R ? Math.sqrt(R * R - (y - b.y) ** 2) : 0) : 1920 + 900);
  x.pen.save();
  x.pen.translate(s.dx, s.dy);
  x.pen.straight = true;
  const I = x.I;
  x.pen.gradRows(
    [
      [-900, I.sky0, 1],
      [-260, I.sky0, 1],
      [-260 + 0.36 * 680, I.sky1, 1],
      [-260 + 0.66 * 680, I.sky2, 0.5],
      [420, I.sky2, 0],
    ],
    -900,
    xr,
    b ? 6 : 0,
  );
  x.pen.gradRows(
    [
      [430, I.glow, 0],
      [660, I.glow, 0.95],
      [690, I.glow, 0.95],
    ],
    -900,
    xr,
    b ? 6 : 0,
  );
  x.pen.straight = false;
  x.pen.restore();
}
function drawBaren(x: Ctx, f: number): void {
  if (f < 5 || f > 12) return;
  const b = barenPos(f);
  // The rubbing marks it leaves behind.
  const r = mulberry32(3);
  for (let i = 0; i < 9; i++) {
    const px = b.x - 140 - i * 120 - r() * 40;
    const py = b.y + (r() - 0.5) * 160;
    const rx = 60 + r() * 50;
    const ry = 24 + r() * 16;
    const a0 = r() * 6;
    const a1 = r() * 6 + 3.6;
    if (px < -200) continue;
    x.pen.strokePts(path().ellipse(px, py, rx, ry, 0.2, a0, a1).pts, 6, x.I.white, 0.22 * (1 - i / 9));
  }
  x.pen.save();
  x.pen.translate(b.x, b.y);
  x.pen.rotate(b.rot);
  x.pen.scale(1.05, 0.92);
  // The printer's tool, not the print: its handle is drawn straight on purpose (D3's furniture).
  x.pen.straight = true;
  const disc = circleP(0, 0, b.r);
  x.pen.fill(disc, x.I.baren);
  keyline(x, disc, 6);
  for (const rr of [92, 64, 36]) x.pen.stroke(circleP(0, 0, rr), 6, x.I.barenR);
  // The twisted bamboo-sheath handle.
  const h = capsuleP(path(), -86, -20, 172, 40);
  x.pen.fill(h, x.I.barenH);
  x.pen.stroke(h, 5, x.I.ink);
  for (let k = -3; k <= 3; k++) x.pen.strokePts([[k * 22 - 8, -18], [k * 22 + 8, 18]], 3, x.I.ink);
  x.pen.straight = false;
  x.pen.restore();
}
function mistBand(x: Ctx, px: number, py: number, bars: readonly (readonly number[])[], col: RGB, edge: RGB): void {
  const p = path();
  for (const [dx, dy, w, h] of bars) capsuleP(p, px + dx, py + dy, w, h);
  x.pen.straight = true;
  pfill(x, 'pale', col, p, false);
  if (plate(x, 'pale').on) x.pen.stroke(p, 2.5, edge, 0.5);
  x.pen.straight = false;
}
function drawMistHigh(x: Ctx, t: number): void {
  const sx = track(t, [[12, 700], [18, 0]], 0.12) + Math.sin(t / 40) * 6 + 5 * ring(t, 168, 14, 6) + 4 * ring(t, 132, 12, 5);
  mistBand(x, 980 + sx, 205, [[0, 0, 520, 34], [120, 30, 640, 34], [-160, 30, 220, 34], [380, -30, 300, 34]], x.I.mist2, x.I.mistE);
  const sx2 = track(t, [[12, -700], [18, 0]], 0.12) - Math.sin(t / 46) * 6 - 4 * ring(t, 156, 12, 5);
  mistBand(x, -60 + sx2, 300, [[0, 0, 420, 30], [150, 26, 380, 30]], x.I.mist2, x.I.mistE);
}
function drawMistLow(x: Ctx, t: number): void {
  const sx = track(t, [[12, -900], [18, 0]], 0.12) + Math.sin(t / 37) * 8 + 5 * ring(t, 144, 14, 6);
  mistBand(x, 1000 + sx, 632, [[0, 0, 360, 22], [240, 20, 420, 22], [520, -2, 240, 22]], x.I.mist, x.I.mistE);
}

// ——— The small kaomoji mountain: the film's seven rows of (•ω•) and the amber • on its peak, in the print's Fuji (ruling 3) —————————

/**
 * THE SMALL KAOMOJI MOUNTAIN (ruling 3; tests/drop2Wave.test.ts 'THE SMALL KAOMOJI MOUNTAIN'): the film's layout
 * — seven rows of tiny (•ω•), row k holding k + 1 (MOUNTAIN_FACES, 35 faces, edge to edge), the top two in the snow, and one amber • on
 * the peak — set inside the prototype's Fuji: its silhouette (sized by the prototype's 23 px face, `sil`), its three-lobed snow cap and
 * its palette (#EEF4FC faces on the #9FB9DE → #5C7DB6 body, #5C7DB6 on the snow). The rows climb the flanks at the Fuji's own slope,
 * each ≥ 7 px inside them. Printed on 24 … 30, bottom row first (the • with the top row); a stadium wave 143 → 161; the top row and the
 * • hop on 48 / 120 / 168. Plane 0.55; `y0` the top row's middle, `rh` the row pitch, `pitch` a face's (its 12.5 px width).
 */
export const FUJI = { cx: 1240, base: 642, top: 500, sil: 23, fs: 12.5, pitch: 34.5, y0: 515, rh: 16.2, peak: 22 } as const;
const MOUNTAIN_PITCH = MOUNTAIN.width / (MOUNTAIN.rows + 1);
/** The silhouette's half widths (base and summit) from the prototype's face width `gw` (its 23 px (•ω•) + 6). */
const fujiGeom = (gw: number): { top: number; hw: number; tw: number } => ({ top: FUJI.top, hw: 2.55 * gw, tw: gw * 0.62 });
/** The mountain's faces at rest on its plane (0.55): MOUNTAIN_FACES' rows and columns at the Fuji's pitch. */
export const FUJI_FACES: readonly { x: number; y: number; row: number }[] = MOUNTAIN_FACES.map((m) => ({
  x: FUJI.cx + ((m.x - MOUNTAIN.x) / MOUNTAIN_PITCH) * FUJI.pitch,
  y: FUJI.y0 + (m.row - 1) * FUJI.rh,
  row: m.row,
}));
/** The faces' [x, y] (the downsample's game pixels). */
export const fujiFaces = (): XY[] => FUJI_FACES.map((m) => [m.x, m.y]);
/** The amber • on the peak (its middle, at rest). */
export const FUJI_PEAK: XY = [FUJI.cx, FUJI.top - 7];
function drawMountain(x: Ctx, t: number): void {
  const { cx, base, fs } = FUJI;
  const pen = x.pen;
  pen.save();
  const sq = 0.06 * ring(t, 24, 12, 4) + 0.05 * ring(t, 120, 12, 4) + 0.04 * ring(t, 168, 12, 4);
  pen.translate(cx, base);
  pen.scale(1 + sq, 1 - sq);
  pen.translate(-cx, -base);
  const gw = pen.measure('rounded', MOCHI_FUJI_FACE, FUJI.sil) + 6;
  const { top, hw, tw } = fujiGeom(gw);
  // Near-straight flanks (a touch concave at the foot) so every row of faces sits inside the mountain.
  // (The flanks sag 7 px, the prototype's straight lines bowed a hair so D3 sees no straight cut; the foot runs on 70 px under the
  // horizon, so when the camera's push parts the planes the base is under the sea, never a straight cut.)
  const fl = (x0: number, y0: number, x1: number, y1: number): [number, number] => [(x0 + x1) / 2, (y0 + y1) / 2 + 14];
  const L0 = fl(cx - hw + 30, base - 34, cx - tw, top + 8);
  const R0 = fl(cx + tw, top + 8, cx + hw - 30, base - 34);
  const sil = path()
    .moveTo(cx - hw - 70, base + 70)
    .quadraticCurveTo(cx - hw - 20, base + 20, cx - hw - 40, base + 2)
    .quadraticCurveTo(cx - hw + 6, base - 14, cx - hw + 30, base - 34)
    .quadraticCurveTo(L0[0], L0[1], cx - tw, top + 8)
    .quadraticCurveTo(cx, top - 10, cx + tw, top + 8)
    .quadraticCurveTo(R0[0], R0[1], cx + hw - 30, base - 34)
    .quadraticCurveTo(cx + hw - 6, base - 14, cx + hw + 40, base + 2)
    .quadraticCurveTo(cx + hw + 20, base + 20, cx + hw + 70, base + 70)
    .quadraticCurveTo(cx, base + 76, cx - hw - 70, base + 70)
    .closePath();
  const silPts = sil.pts;
  const deep = plate(x, 'deep');
  if (!deep.on) pen.fillPts(silPts, x.I.paper);
  else {
    if (deep.dx || deep.dy) pen.fillPts(silPts, x.I.paper);
    pen.save();
    pen.translate(deep.dx, deep.dy);
    // The gradient down to the horizon in strips; under it (the foot under the sea) one fill of the foot's blue.
    pen.fillPts(silPts, x.I.mtn);
    pen.gradFill(clipConvex(silPts, [[cx - 900, top - 100], [cx + 900, top - 100], [cx + 900, base], [cx - 900, base]]), top, base, x.I.mtnL, x.I.mtn, 5);
    pen.restore();
  }
  // The snow cap with three round lobes over the top two rows (the film's two snow rows), inside the silhouette; the lobes dip between
  // the second and third rows.
  const sy = FUJI.y0 + FUJI.rh * (MOUNTAIN.snowRows - 0.55);
  const scallop = path().moveTo(cx - 220, sy);
  for (let i = 0; i < 3; i++) {
    const x0 = cx - gw * 1.25 + (i * gw * 2.5) / 3;
    const x1 = x0 + (gw * 2.5) / 3;
    if (i === 0) scallop.lineTo(x0, sy);
    scallop.quadraticCurveTo((x0 + x1) / 2, sy + (i % 2 ? 10 : 6), x1, sy);
  }
  scallop.lineTo(cx + 220, sy);
  const capPts: XY[] = [[cx - 220, top - 30], ...scallop.pts, [cx + 220, top - 30]];
  pfillClip(x, 'pale', x.I.foam, capPts, convexHull(silPts.filter((p) => p[1] < base - 20)), true, 1, true);
  for (const run of runsInside(scallop.pts, silPts)) keyline(x, run, 3);
  keyline(x, sil, 4);
  // The faces: printed on 24 … 30, bottom row first; a stadium wave after the stamp; the top row hops on the beats with the •.
  const topHop = Math.max(0, ring(t, 48, 12, 4) + ring(t, 120, 12, 4) + ring(t, 168, 12, 4)) * 8;
  for (const m of FUJI_FACES) {
    const i = m.row - 1;
    const at = 24 + (MOUNTAIN.rows - m.row);
    if (t < at) continue;
    // (A smaller overshoot than the prototype's .35: these faces sit edge to edge, and a fat pop runs them into each other.)
    const ap = hitPop(t, at, 0.22);
    const u = (m.x - (cx - hw)) / (2 * hw);
    const hopY = Math.max(0, ring(t, 143 + u * 18, 12, 4)) * 9 + (i === 0 ? topHop : 0) + Math.max(0, ring(t, 96 + i, 12, 4)) * 4;
    pen.save();
    pen.translate(m.x, m.y - hopY);
    pen.scale(ap, ap);
    pen.text('rounded', MOCHI_FUJI_FACE, 0, 0, fs, !deep.on ? x.I.ink : m.row <= MOUNTAIN.snowRows ? x.I.mtn : x.I.mtnFace);
    pen.restore();
  }
  // His amber • on the peak (the film's), printed with the top row.
  const atPeak = 24 + MOUNTAIN.rows - 1;
  if (t >= atPeak) {
    const ap = hitPop(t, atPeak, 0.5);
    pen.save();
    pen.translate(FUJI_PEAK[0], FUJI_PEAK[1] - topHop);
    pen.scale(ap, ap);
    pen.text('rounded', '•', 0, 0, FUJI.peak, x.I.amber);
    pen.restore();
  }
  pen.restore();
}

// ——— The sea ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

function drawFarSea(x: Ctx, t: number): void {
  const s = plate(x, 'deep');
  const pen = x.pen;
  const rect = (dx: number, dy: number, grad: boolean): void => {
    pen.save();
    pen.translate(dx, dy);
    pen.straight = true;
    if (grad)
      pen.gradRows(
        [
          [640, x.I.sea0, 1],
          [840, x.I.sea1, 1],
          [1240, x.I.sea1, 1],
        ],
        -500,
        () => 1920 + 500,
      );
    else pen.fillPts([[-500, 640], [2420, 640], [2420, 1240], [-500, 1240]], x.I.paper);
    pen.straight = false;
    pen.restore();
  };
  if (!s.on) rect(0, 0, false);
  else {
    if (s.dx || s.dy) rect(0, 0, false);
    rect(s.dx, s.dy, true);
  }
  pen.straight = true;
  keyline(x, [[-500, 641], [2420, 641]], 4);
  pen.straight = false;
  const rows: readonly (readonly number[])[] = [
    [664, 84, 6, 2.4],
    [694, 110, 8, 2.8],
    [732, 140, 11, 3.4],
  ];
  rows.forEach(([y, sp, r, lw], k) => {
    const off = (t * (0.25 + k * 0.12) + k * 37) % sp;
    const hy = (k % 2 ? hop8(t, 1) : hop8(t, 0)) * 3;
    for (let px = -500 - off; px < 1920 + 500; px += sp) {
      const jit = ((((Math.round(px - off) * 7919 + k * 31) % 41) + 41) % 41) - 20;
      pstroke(x, 'pale', x.I.wavelet, lw, path().arc(px + jit, y - hy, r, Math.PI * 1.08, Math.PI * 1.92).pts, 0.85);
    }
  });
}
/** A row of round chibi swells; the bumps hop on alternate 8ths. */
function swellRow(x: Ctx, t: number, y: number, w: number, h: number, col: RGB, phase: number, seed: number): void {
  const r = mulberry32(seed);
  const off = (t * 0.9 * (phase ? -1 : 1) + seed * 13) % w;
  const xs: number[] = [];
  for (let px = -500 - w - off; px < 1920 + 500 + w; px += w) xs.push(px);
  const p = path().moveTo(xs[0], 1080 + 400);
  const bumps: [number, number][] = [];
  xs.forEach((px, i) => {
    const hh = h * (0.8 + 0.4 * r()) * (1 + 0.32 * hop8(t, (i + phase) % 2));
    p.lineTo(px, y);
    p.bezierCurveTo(px + w * 0.12, y - hh * 1.25, px + w * 0.62, y - hh * 1.15, px + w, y, 16);
    bumps.push([px, hh]);
  });
  p.lineTo(xs[xs.length - 1] + w, 1080 + 400).closePath();
  pfill(x, 'deep', col, p);
  // One white highlight arc on each bump (no curls).
  for (const [px, hh] of bumps) {
    if (hh < 8) continue;
    pstroke(x, 'pale', x.I.swellHi, 7, path().moveTo(px + w * 0.2, y - hh * 0.55).quadraticCurveTo(px + w * 0.34, y - hh * 0.96, px + w * 0.52, y - hh * 0.9, 10).pts, 0.95);
  }
  keyline(x, p, 5);
}
/** A Naruto whirlpool (opens with a hit pop). */
function drawWhirl(x: Ctx, cx: number, cy: number, r0: number, ang: number, open: number): void {
  if (open <= 0.01) return;
  const r = r0 * open;
  const sy = 0.36;
  const disc = path().ellipse(cx, cy, r * 1.06, r * sy * 1.06, 0, 0, Math.PI * 2).closePath();
  pfill(x, 'deep', x.I.whirl, disc);
  keyline(x, disc, 4.5);
  for (let arm = 0; arm < 2; arm++) {
    const pts: XY[] = [];
    for (let i = 0; i <= 46; i++) {
      const u = i / 46;
      const th = u * Math.PI * 3.1;
      const rr = r * (0.08 + 0.9 * u);
      const a = ang + th + arm * Math.PI;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * sy]);
    }
    keyline(x, pts, Math.max(4, r * 0.11));
    pstroke(x, 'pale', arm ? x.I.whirlArm : x.I.foam, Math.max(2, r * 0.06), pts);
  }
}

// ——— Defender's boats: red hulls, two rowers each (the film's guest variants in mochi pills) ——————————————————————————————————

const ROWER = MOCHI_ROWERS;
function drawFace(x: Ctx, kind: 'rest' | 'shock' | 'inf', px: number, py: number): void {
  if (kind === 'inf') {
    // His amber ω has got into Defender's face (the film's infected guest).
    const [a, m, b] = ['(￣', 'ω', '￣)'];
    const wa = x.pen.measure('rounded', a, 34);
    const wm = x.pen.measure('rounded', m, 34);
    const wb = x.pen.measure('rounded', b, 34);
    const x0 = px - (wa + wm + wb) / 2;
    ptext(x, 'red', x.I.red, a, x0, py, 34, 'left');
    ptext(x, 'red', x.I.red, b, x0 + wa + wm, py, 34, 'left');
    x.pen.text('rounded', m, x0 + wa, py, 34, x.I.amber, { align: 'left', outline: 2.5, outlineColor: x.I.inkH });
    return;
  }
  ptext(x, 'red', x.I.red, ROWER[kind], px, py, 34);
}
function drawBoat(x: Ctx, bx: number, by: number, rot: number, s: number, t: number, id: number, tossed: number): void {
  const pen = x.pen;
  pen.save();
  pen.translate(bx, by);
  pen.rotate(rot);
  pen.scale(s, s);
  const heads = [-92, 92];
  heads.forEach((hx, k) => {
    // Oars stroke on the 8ths.
    const ph = hop8(t, (k + id) % 2);
    const a = 0.5 + 0.42 * Math.tanh(ph * 2) - tossed * 0.9 * Math.sin(t * 0.5 + k) + (t >= 168 ? -1.4 * Math.max(0, ring(t, 168, 24, 8)) : 0);
    pen.save();
    pen.translate(hx + 30, -20);
    pen.rotate(a);
    keyline(x, [[0, 0], [0, 86]], 6);
    const bl = path().ellipse(0, 88, 8, 18, 0, 0, Math.PI * 2).closePath();
    pfill(x, 'pale', x.I.paperD, bl);
    keyline(x, bl, 3);
    pen.restore();
  });
  heads.forEach((hx, k) => {
    const face = rowerFace(t, id);
    const infAt = 144 + (2 - id) * 6;
    const bob = -4 * hop8(t, (k + id + 1) % 2) - tossed * 12 * Math.abs(Math.sin(t * 0.4 + k * 1.3)) - (t >= infAt ? 16 * kick(t, infAt, 3) : 0);
    const pop = t >= infAt ? hitPop(t, infAt, 0.28) : face === 'shock' ? hitPop(t, 96, 0.22) : 1;
    pen.save();
    pen.translate(hx, -58 + bob);
    pen.scale(pop, pop);
    const pill = mochiP(path(), -86, -34, 172, 68, 0.07);
    pfill(x, 'pale', x.I.foam, pill);
    keyline(x, pill, 4.5);
    drawFace(x, face, 0, 2);
    if (t >= infAt && t < infAt + 9) {
      const d = t - infAt;
      const R = 84 + 70 * (1 - Math.exp(-d / 2.5));
      const lw = 12 * Math.exp(-d / 3);
      const e = path().ellipse(0, 0, R, R * 0.6, 0, 0, Math.PI * 2).closePath();
      pen.stroke(e, lw + 6, x.I.inkH);
      pen.stroke(e, lw, x.I.amber);
    }
    pen.restore();
  });
  const hull = path().moveTo(-226, -36).quadraticCurveTo(0, -8, 232, -48).bezierCurveTo(200, 10, 118, 34, 0, 34).bezierCurveTo(-120, 34, -194, 10, -226, -36).closePath();
  pfill(x, 'red', x.I.red, hull);
  const bot = path().moveTo(-260, 10).quadraticCurveTo(0, 24, 260, 6).lineTo(260, 70).lineTo(-260, 70).closePath();
  // (The band lies under the hull's sagging top edge, where the hull is convex: clipped to its hull.)
  pfillClip(x, 'red', x.I.redS, bot.pts, convexHull(hull.pts), false, 1, true);
  pstroke(x, 'pale', x.I.foam, 6, path().moveTo(-200, -22).quadraticCurveTo(0, 4, 206, -32).pts);
  keyline(x, hull, 5.5);
  pen.restore();
}

// ——— Plovers (nami-chidori) ———————————————————————————————————————————————————————————————————————————————————————————————

function drawBird(x: Ctx, bx: number, by: number, s: number, flap: number, tilt: number): void {
  const pen = x.pen;
  pen.save();
  pen.translate(bx, by);
  pen.rotate(tilt);
  pen.scale(s, s);
  const wing = (b0: number, tipx: number, tipy: number): void => {
    const p = path().moveTo(b0, -6).quadraticCurveTo(b0 + (tipx - b0) * 0.3, tipy * 0.9 - 4, tipx, tipy, 10).pts;
    keyline(x, p, 15);
    pstroke(x, 'deep', x.I.sea1, 8, p);
  };
  wing(-4, -26, -10 - 34 * flap);
  const tail = polyP([
    [-18, -2],
    [-36, -12],
    [-32, 6],
  ]);
  pfill(x, 'deep', x.I.sea0, tail);
  keyline(x, tail, 3);
  const body = path().ellipse(0, 0, 23, 15, 0, 0, Math.PI * 2).closePath();
  pfill(x, 'deep', x.I.sea0, body);
  pfillClip(x, 'pale', x.I.foam, path().ellipse(3, 9, 22, 10, 0, 0, Math.PI * 2).pts, body.pts, false, 1, true);
  keyline(x, body, 3);
  const head = circleP(19, -7, 10);
  pfill(x, 'deep', x.I.sea0, head);
  keyline(x, head, 3);
  pen.fillPts(
    [
      [27, -9],
      [38, -6],
      [27, -3],
    ],
    x.I.ink,
  );
  wing(2, 14, -12 - 38 * flap);
  pen.restore();
}
function drawChidori(x: Ctx, t: number, heroL: XY): void {
  const fx = lerp(180, 1300, t / 191);
  const fy = 300 - 40 * Math.sin(t / 60);
  const jump = -70 * Math.max(0, ring(t, 96, 30, 10)) - 18 * Math.max(0, ring(t, 72, 20, 6)) - 18 * Math.max(0, ring(t, 120, 20, 6));
  const offs = birdOffsets(t, heroL);
  const ph = [0, 5, 9, 3, 7];
  const sz = [1, 0.86, 0.76, 0.84, 0.74];
  offs.forEach(([dx, dy, abs], i) => {
    const g = (((t + ph[i]) % 12) + 12) % 12;
    const flap = g < 3 ? lerp(1, -0.45, g / 3) : lerp(-0.45, 1, 1 - Math.pow(1 - (g - 3) / 9, 2));
    const bob = 6 * Math.sin((t + ph[i] * 4) / 7);
    const bx = lerp(fx + dx, dx, abs || 0);
    const by = lerp(fy + dy + bob + jump * (0.7 + ph[i] / 20), dy + bob, abs || 0);
    drawBird(x, bx, by, sz[i] * 0.95, flap, -0.08 + 0.05 * Math.sin((t + ph[i]) / 9));
  });
}

// ——— The hero (the film's rounded face, amber, a dark outline, a hard shadow; his board) ——————————————————————————————————————

function drawHero(x: Ctx, f: number, h: HeroState): void {
  if (h.s <= 0) return;
  const pen = x.pen;
  const I = x.I;
  pen.save();
  if (h.screen) pen.setTransform([1, 0, 0, 1, 0, 0]);
  else applyCam(x, 1);
  pen.translate(h.x, h.y);
  pen.rotate(h.rot);
  pen.scale(h.s * h.sqx, h.s * h.sqy);
  if (h.board > 0.01) {
    pen.save();
    pen.scale(h.board, h.board);
    const b = path()
      .moveTo(-152, 50)
      .quadraticCurveTo(0, 66, 152, 50)
      .arc(152, 68, 18, -Math.PI / 2, Math.PI / 2)
      .quadraticCurveTo(0, 102, -152, 86)
      .arc(-152, 68, 18, Math.PI / 2, Math.PI * 1.5)
      .closePath();
    pen.save();
    pen.translate(8, 9);
    pen.fill(b, I.ink);
    pen.restore();
    pen.fill(b, I.foam);
    keyline(x, b, 10, I.inkH);
    pen.strokePts(path().moveTo(-134, 66).quadraticCurveTo(0, 84, 134, 66, 16).pts, 11, I.amber);
    pen.restore();
  }
  const [L, M, R] = POSES[h.pose];
  const sz = HERO_PX;
  const wl = L ? pen.measure('hero', L, sz) : 0;
  const wm = pen.measure('hero', M, sz);
  const wr = R ? pen.measure('hero', R, sz) : 0;
  const x0 = -(wl + wm + wr) / 2;
  const wv = Math.sin((f * Math.PI) / 12);
  const armA = h.pose === 'ride' ? 0.2 : h.pose === 'mie' ? 0.05 : 0.15;
  const paint = (dx: number, dy: number, fill: RGB, stroke: RGB): void => {
    const o = { align: 'left' as const, outline: 9, outlineColor: stroke };
    if (L) {
      pen.save();
      pen.translate(x0 + wl + dx, 6 + dy);
      pen.rotate(-armA * wv);
      pen.text('hero', L, -wl, -6, sz, fill, o);
      pen.restore();
    }
    pen.text('hero', M, x0 + wl + dx, dy, sz, fill, o);
    if (R) {
      pen.save();
      pen.translate(x0 + wl + wm + dx, 6 + dy);
      pen.rotate(armA * wv);
      pen.text('hero', R, 0, -6, sz, fill, o);
      pen.restore();
    }
  };
  paint(9, 10, I.ink, I.ink);
  paint(0, 0, I.amber, I.inkH);
  if (h.brows > 0) {
    // Kabuki brows (a kumadori flick) over the eyes.
    const lead = M.indexOf('•');
    const second = M.indexOf('•', lead + 1);
    const eye = (i: number): number => x0 + wl + pen.measure('hero', M.slice(0, i), sz) + pen.measure('hero', '•', sz) / 2;
    if (lead >= 0 && second >= 0) {
      const e1 = eye(lead);
      const e2 = eye(second);
      for (const [ax, ay, bx, by] of [
        [e1 - 26, -70, e1 + 14, -52],
        [e2 + 26, -70, e2 - 14, -52],
      ]) {
        pen.strokePts([[ax, ay], [bx, by]], 26, I.inkH);
        pen.strokePts([[ax, ay], [bx, by]], 10, I.amber);
      }
    }
  }
  if (h.spark > 0.01) {
    // ✧ glint.
    pen.save();
    pen.translate(x0 + wl + wm - 4, -70);
    pen.scale(h.spark, h.spark);
    pen.rotate(f * 0.05);
    const star: XY[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 ? 9 : 34;
      star.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    pen.fillPts(star, I.amber);
    pen.strokePts(star, 6, I.inkH, 1, true);
    pen.restore();
  }
  pen.restore();
}
/** His carve: an amber streak on the wave's skin behind the board, 3 → 18 px with an ink edge. */
function drawWake(x: Ctx, f: number, h: HeroState): void {
  if (!h.wake) return;
  const A = h.wake.which === 'main' ? mainA(WT(f)) : rebA(WT(f));
  const u1 = h.wake.u;
  const u0 = Math.max(0.05, u1 - 0.12);
  const n = 18;
  const pts: XY[] = [];
  const ws: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = atU(A, lerp(u0, u1, i / n));
    pts.push([a.x - a.nx * 8, a.y - a.ny * 8]);
    ws.push(3 + 15 * (i / n));
  }
  x.pen.strokeVar(pts, ws.map((w) => w + 6), x.I.inkH);
  x.pen.strokeVar(pts, ws, x.I.amber);
}

// ——— Spray, landing splashes ———————————————————————————————————————————————————————————————————————————————————————————————

function drawSpray(x: Ctx, f: number): void {
  for (const [f0, kind, n, sp, a0, aw, seed, sz] of BURSTS) {
    const d = f - f0;
    if (d < 0 || d > 34) continue;
    const o = burstOrigin(kind, f0);
    const r = mulberry32(seed);
    for (let i = 0; i < n; i++) {
      const side = kind === 'col' ? (i % 2 ? 1 : -1) : 0;
      const a = a0 + (r() - 0.5) * aw + side * 0.9;
      const v = sp * (0.55 + r() * 0.6);
      const ox = side * 190;
      const px = o[0] + ox + Math.cos(a) * v * d * (1 - d / 110);
      const py = o[1] + Math.sin(a) * v * d + 0.42 * d * d;
      const s = sz * (0.5 + r() * 0.7) * (1 - smooth(14, 34, d));
      drop(x, px, py, s, x.I.foam, 3);
    }
  }
}
/** A landing splash: round-tipped foam tongues fanned off both rails of the board, fattest ON the beat, then shrinking away. */
function drawLandRings(x: Ctx, f: number): void {
  for (const [at, k] of LANDINGS) {
    const d = f - at;
    if (d < 0 || d > 8) continue;
    const o = burstOrigin('hero', at);
    const h = heroState(at);
    const s = k * (1 - smooth(1, 8, d));
    const grow = 0.75 + 0.5 * (1 - Math.exp(-d / 2));
    if (s < 0.05) continue;
    const ca = Math.cos(h.rot);
    const sa = Math.sin(h.rot);
    for (const side of [-1, 1])
      for (let i = 0; i < 2; i++) {
        const bx = o[0] + ca * side * (128 + i * 30);
        const by = o[1] + sa * side * (128 + i * 30) - 6;
        const a = h.rot - Math.PI / 2 + side * (0.7 + i * 0.5);
        const L = (44 - i * 12) * grow * k;
        const w = (21 - i * 4) * s;
        const tx = bx + Math.cos(a) * L;
        const ty = by + Math.sin(a) * L;
        const px = -Math.sin(a);
        const py = Math.cos(a);
        const p = path()
          .moveTo(bx + px * w * 0.5, by + py * w * 0.5)
          .lineTo(tx + px * w, ty + py * w)
          .arc(tx, ty, w, a + Math.PI / 2, a - Math.PI / 2, true)
          .lineTo(bx - px * w * 0.5, by - py * w * 0.5)
          .closePath();
        keyline(x, p, 8);
        x.pen.fill(p, x.I.foam);
      }
  }
}

// ——— The cartouche and the byte seal ———————————————————————————————————————————————————————————————————————————————————————

function cartXf(x: Ctx, f: number): void {
  const { x: cx, y, w, h } = CART;
  const sw = 0.025 * ring(f, 18, 22, 9) + 0.02 * ring(f, 72, 18, 7) + 0.05 * ring(f, 96, 20, 8) - 0.025 * ring(f, 120, 16, 6);
  x.pen.translate(cx + w / 2, y + h);
  x.pen.rotate(sw);
  x.pen.translate(-(cx + w / 2), -(y + h));
}
function drawCartouche(x: Ctx, f: number): void {
  const { x: cx, y, w, h } = CART;
  x.stage = true;
  x.pen.save();
  cartXf(x, f);
  const box = rrectP(path(), cx, y, w, h, 16);
  x.pen.straight = true;
  pfill(x, 'pale', x.I.cart, box);
  keyline(x, box, 6);
  pstroke(x, 'red', x.I.red, 3, rrectP(path(), cx + 11, y + 11, w - 22, h - 22, 9));
  x.pen.straight = false;
  const colR = MOCHI_CARTOUCHE.title;
  const colL = MOCHI_CARTOUCHE.version;
  for (let i = 0; i < colR.length; i++) ptext(x, 'red', x.I.red, colR[i], cx + w * 0.66, y + 50 + i * 44, 40);
  for (let i = 0; i < colL.length; i++) ptext(x, 'red', x.I.red, colL[i], cx + w * 0.29, y + 50 + i * 44, 32);
  x.pen.restore();
  // Defender's own seal stamps on 24 (防 = defend).
  if (f >= 24) {
    const sc = hitPop(f, 24, 0.35);
    x.pen.save();
    x.pen.translate(cx - 46, y + h - 44);
    x.pen.rotate(-0.05);
    x.pen.scale(sc, sc);
    x.pen.straight = true;
    pfill(x, 'red', x.I.red, rrectP(path(), -36, -36, 72, 72, 8), false);
    x.pen.straight = false;
    ptext(x, 'red', x.I.cart, MOCHI_CARTOUCHE.seal, 0, 3, 50);
    x.pen.restore();
  }
  x.stage = false;
}
function drawSeal(x: Ctx, f: number): void {
  if (f < 116) return;
  const { x: cx0, y: cy0, w, h } = CART;
  const pen = x.pen;
  const fall = f < 120 ? -480 * (1 - easeIn((f - 116) / 4, 3)) : 0;
  const sqz = f < 120 ? 0 : 0.14 * kick(f, 120, 2.6) + 0.05 * ring(f, 120, 10, 4);
  pen.save();
  cartXf(x, f);
  const cx = cx0 + w / 2;
  const cy = cy0 + h / 2;
  if (f < 120) pen.fill(path().ellipse(cx, cy, w * 0.6, h * 0.5 * easeIn((f - 116) / 4), 0, 0, Math.PI * 2).closePath(), x.I.ink, 0.25 * easeIn((f - 116) / 4));
  pen.translate(cx, cy + fall);
  pen.rotate(-0.045);
  pen.scale((1 + sqz) * (f < 120 ? 1.1 : 1), (1 - sqz) * (f < 120 ? 1.1 : 1));
  pen.translate(-cx, -cy);
  const r = mulberry32(77);
  const sx = cx0 - 4;
  const sy = cy0 + 18;
  const sw = w + 8;
  const sh = h - 36;
  const slab: XY[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i / 12;
    const [px, py]: XY = i < 12 ? [sx + sw * t, sy] : i < 24 ? [sx + sw, sy + sh * (t - 1)] : i < 36 ? [sx + sw * (3 - t), sy + sh] : [sx, sy + sh * (4 - t)];
    const j = (r() - 0.5) * 8;
    slab.push([px + j, py + j]);
  }
  pen.straight = true;
  pen.save();
  pen.translate(8, 10);
  pen.fillPts(slab, x.I.ink);
  pen.restore();
  pen.fillPts(slab, x.I.amber);
  pen.strokePts(slab, 6, x.I.inkH, 1, true);
  pen.straight = false;
  // Set as the prototype's fillText sets them: the font's own word space (M PLUS Rounded 1c Black, 0.298 em), so `E2 80 A2` is 131 px
  // wide on the 148 px slab, ≈ 8 px clear of its ink edge each side (the atlas's 0.6 em fallback space pushed it onto the edges).
  BYTES.forEach((b, i) => pen.text('rounded', b, cx0 + w / 2, cy0 + 72 + i * 67, 29, x.I.inkH, { space: ROUNDED_SPACE }));
  pen.restore();
  // Amber ink splats from the slam, born on the seal's rim and flung outward.
  if (f >= 120 && f < 140) {
    const rr = mulberry32(91);
    for (let i = 0; i < 12; i++) {
      const a = rr() * Math.PI * 2;
      const d = 50 + rr() * 110;
      const t = 1 - Math.exp(-(f - 120) / 2.5);
      const s = (6 + rr() * 10) * (1 - smooth(128, 140, f));
      drop(x, cx + Math.cos(a) * (w * 0.62 + d * t), cy + Math.sin(a) * (h * 0.52 + d * t), s, x.I.amber, 3);
    }
  }
}

// ——— §7 Kabuki punctuation ——————————————————————————————————————————————————————————————————————————————————————————————

function drawRings(x: Ctx, f: number, at: number, cx: number, cy: number, R0 = 170): void {
  if (f < at || f > at + 9) return;
  for (let k = 0; k < 2; k++) {
    const d = f - at - k * 2;
    if (d < 0) continue;
    const R = R0 + 380 * (1 - Math.exp(-d / 4));
    const lw = 26 * Math.exp(-d / 2.6);
    if (lw < 3) continue;
    const c = circleP(cx, cy, R);
    x.pen.stroke(c, lw + 8, x.I.ink);
    x.pen.stroke(c, lw, x.I.foam);
  }
}
/** Manga focus lines in navy ink (screen space): strongest on the strike, pulled back to the edges over `life`. */
function focusLines(x: Ctx, f: number, at: number, cx: number, cy: number, r0: number, life = 8, n = 70): void {
  const d = f - at;
  if (d < 0 || d >= life) return;
  const r = mulberry32(at * 13 + 5);
  const pull = Math.pow(d / life, 1.6);
  x.pen.straight = true;
  for (let i = 0; i < n; i++) {
    const a = ((i + r() * 0.8) / n) * Math.PI * 2;
    const w = 6 + r() * 22;
    const ri = r0 * (0.9 + r() * 0.5) + pull * 1100;
    const ro = 1500;
    if (ri >= ro) continue;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    x.pen.fillPts(
      [
        [cx + ca * ri, cy + sa * ri],
        [cx + ca * ro - sa * w, cy + sa * ro + ca * w],
        [cx + ca * ro + sa * w, cy + sa * ro - ca * w],
      ],
      x.I.ink,
    );
  }
  x.pen.straight = false;
}
function drawBrackets(x: Ctx, f: number, cx: number, cy: number, hw: number, hh: number): void {
  if (f < 118 || f >= 132) return;
  const inn = f < 120 ? 1 + 1.4 * (1 - easeIn((f - 118) / 2, 2)) : f < 126 ? 1 + 0.12 * Math.cos(((f - 120) * Math.PI) / 2.4) * Math.exp(-(f - 120) / 2) : 1 + 1.8 * easeIn((f - 126) / 6, 2);
  const L = 84;
  x.pen.straight = true;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const px = cx + sx * hw * inn;
    const py = cy + sy * hh * inn;
    const p: XY[] = [
      [px, py - sy * L],
      [px, py],
      [px - sx * L, py],
    ];
    keyline(x, p, 26, x.I.ink);
    x.pen.strokePts(p, 9, x.I.foam);
  }
  x.pen.straight = false;
}
/** The 168 mini mie: a small ink starburst round him. */
function drawStar(x: Ctx, f: number, at: number, cx: number, cy: number): void {
  const d = f - at;
  if (d < 0 || d > 10) return;
  const r = mulberry32(at);
  const s = hitPop(f, at, 0.3) * (1 - smooth(6, 10, d));
  x.pen.straight = true;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    const r0 = 230 + r() * 40;
    const r1 = r0 + (70 + r() * 70) * s;
    const w = 9 * s;
    x.pen.fillPts(
      [
        [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8],
        [cx + Math.cos(a) * r1 - Math.sin(a) * w, cy + Math.sin(a) * r1 * 0.8 + Math.cos(a) * w],
        [cx + Math.cos(a) * r1 + Math.sin(a) * w, cy + Math.sin(a) * r1 * 0.8 - Math.cos(a) * w],
      ],
      x.I.ink,
    );
  }
  x.pen.straight = false;
}
/** ザッパーン (ruling 2: behind DROP2_THREADS.mochiSfx): pops ON 96; each letter shrinks away as the drain line passes it. */
export const SFX_TEXT = MOCHI_SFX;
function drawSFX(x: Ctx, f: number): void {
  if (!x.sfx || f < 96 || f >= 116) return;
  // The prototype's (250, 232), moved down clear of the scoreboard's dock (top left, src/shots/drop2SwitchSlot.ts WAVE_BOX).
  const x0 = 250;
  const y0 = 300;
  const ydS = toScreen(x.cam, 1, 0, drainY(f))[1];
  const pen = x.pen;
  SFX_TEXT.forEach((ch, i) => {
    const px = x0 + i * 146;
    const y0i = y0 + i * 18;
    const s = hitPop(f, 96, 0.34 + i * 0.03) * smooth(ydS - 20, ydS + 150, y0i);
    const py = y0i + 6 * Math.sin(f * 0.9 + i);
    const rot = -0.12 + 0.08 * (i % 2 ? 1 : -1) + 0.03 * Math.sin(f * 0.7 + i);
    if (s < 0.03) return;
    pen.save();
    pen.setTransform([1, 0, 0, 1, 0, 0]);
    pen.translate(px, py);
    pen.rotate(rot);
    pen.scale(s, s);
    pen.text('hero', ch, 10, 12, 150, x.I.sfxBlue, { outline: 17, outlineColor: x.I.sfxBlue });
    pen.text('hero', ch, 0, 0, 150, x.I.ink, { outline: 11, outlineColor: x.I.foam });
    pen.restore();
  });
}
// ——— The hand-off from the switch (continuity plan v07, seam 4320) ——————————————————————————————————————————————————————————————

/**
 * The print wipe: on 10.1 the woodblock does not replace the blueprint in one frame (a navy → cream inversion of the whole screen); it is
 * pressed out from the red box's centre like a baren's disc — a circle of print over the switch's own picture (the scene draws the switch
 * under it: src/scenes/drop2WaveMochi.ts), radius R on each output frame of 10.1 … 10.1 + 2 (frame-whole, a crisp edge), the paper
 * everywhere from + 3 (4323). Its rim is a sumi ring. A launch, so the downbeat carries the biggest change (check-sync: 10.1 is the hit,
 * not the frame after it): R 620, 880, 1040 px on + 0, + 1, + 2 print 55 %, 85 % and 99 % of the frame (the corners at 1102 px).
 */
export const WIPE = { frames: 4, radii: [620, 880, 1040], rim: 9 } as const;
/** The wipe at sub-frame instant `film` (film frames): centre and radius on screen (layout px), null when the print covers the frame. */
export function wipeAt(film: number): { cx: number; cy: number; R: number } | null {
  const k = Math.round(film) - BURST;
  if (k < 0 || k >= WIPE.frames - 1) return null;
  const c = boxBurstAt(LAST).centre;
  return { cx: c[0], cy: c[1], R: WIPE.radii[k] };
}
/** The share of the screen the print covers under the wipe (a 40 px grid). */
export function wipeCover(film: number): number {
  const w = wipeAt(film);
  if (!w) return Math.round(film) < BURST ? 0 : 1;
  let n = 0;
  let k = 0;
  for (let y = 20; y < 1080; y += 40)
    for (let x = 20; x < 1920; x += 40) {
      n++;
      if (Math.hypot(x - w.cx, y - w.cy) <= w.R) k++;
    }
  return k / n;
}
/**
 * The baren's press lines: the switch's last light beams (drop2Switch.ts crackBeams(LAST), on screen as the switch showed them) carried
 * into the print as paper-dark streaks along the same rays, from the box's cracks out past the frame, fading by + 12 (local frames).
 */
export const PRESS = { fade: 12, alpha: 0.5, start: 0.22, end: 6, reach: 1500 } as const;
export function pressLines(f: number): { a: XY; b: XY; w0: number; w1: number; alpha: number }[] {
  if (f < 0 || f >= PRESS.fade) return [];
  const alpha = PRESS.alpha * (1 - smooth(2, PRESS.fade, f));
  return crackBeams(LAST).map((b) => {
    const a: XY = [...switchScreen(LAST, b.x, b.y)];
    const dx = Math.cos(b.dir);
    const dy = -Math.sin(b.dir);
    return { a, b: [a[0] + dx * PRESS.reach, a[1] + dy * PRESS.reach] as XY, w0: PRESS.start * b.wide, w1: PRESS.end, alpha: alpha * b.g };
  });
}
function drawPress(x: Ctx, f: number): void {
  const lines = pressLines(f);
  if (!lines.length) return;
  x.pen.save();
  x.pen.setTransform([1, 0, 0, 1, 0, 0]);
  // The printer's marks, not the print: straight on purpose (D3's furniture, like the baren and the focus lines).
  x.pen.straight = true;
  for (const l of lines) {
    // A streak: from a point at the crack, widest a third of the way out (the beam's width × start), thinning to `end` off the frame.
    const [dx, dy] = [l.b[0] - l.a[0], l.b[1] - l.a[1]];
    const len = Math.hypot(dx, dy);
    const [nx, ny] = [-dy / len, dx / len];
    const at = (u: number, w: number, side: number): XY => [l.a[0] + dx * u + side * nx * w * 0.5, l.a[1] + dy * u + side * ny * w * 0.5];
    const m = 0.3;
    x.pen.fillPts([at(0, 3, 1), at(m, l.w0, 1), at(1, l.w1, 1), at(1, l.w1, -1), at(m, l.w0, -1), at(0, 3, -1)], x.I.paperD, l.alpha);
  }
  x.pen.straight = false;
  x.pen.restore();
}

/** The mie on 72: the iris round him (R) — outside it the world is an indigo print (the scene's pass), its ink and white rims here. */
export function mieAt(f: number): number | null {
  if (f < 72 || f >= 84) return null;
  return f < 76 ? 370 + 18 * ring(f, 72, 8, 3) : lerp(370, 2300, Math.pow(landEase((f - 76) / 8), 1.35));
}

// ——— The frame ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The halftone's numbers for the scene's pass (the dots on the wave's plane, 94 → 119). */
export type Halftone = { R: number; yd: number; impact: XY; breathe: number; polka: number; polkaPop: number; ring: { R: number; band: number; d: number } | null };
export type MochiFrame = WaveFrame & {
  /** The world's layers (what the 72 mie's indigo and the halftone go over) are layers[0 … world − 1]; the overlays follow. */
  world: number;
  /** The mie on 72: the iris on screen, null when off. */
  mie: { cx: number; cy: number; R: number } | null;
  halftone: Halftone | null;
  /** The camera of the wave's plane (the halftone's dots are on it). */
  mcam: MochiCam;
  /** Local time of the frame (0 = 10.1) after the shutter mapping. */
  local: number;
  /** The print wipe out of the switch on 10.1 … 10.1 + 2 (layout px): outside its circle the scene shows the switch's own picture. */
  wipe: { cx: number; cy: number; R: number } | null;
};

/**
 * The instant the prototype is taken at for sub-frame instant `film` (film frames): every sub-frame of output frame F sees F or a little
 * after it (F … F + 0.1), never before. A hit keyed to F is whole on F (SWAP_LEAD's rule), a draft frame is the prototype's frame F, and
 * the world keeps the prototype's crispness (it was judged frame by frame, unblurred): only a hint of a trail, the camera energy's blur on
 * the film's accents aside.
 */
export function mochiTime(film: number): number {
  const F = Math.round(film);
  return Math.min(F + Math.max(0, film - F) * 0.4 - BURST, N - 0.25);
}

export type MochiLayout = Fonts;
export const defaultMochiFonts: Fonts = { rounded: defaultRounded, hero: defaultRounded };

/** The mochi wave's frame at sub-frame instant `film` (film frames), as the print ('print') or Defender's 8-bit version of it ('game'). */
export function mochiFrame(film: number, fonts: Fonts = defaultMochiFonts, mode: 'print' | 'game' = 'print', o: { sfx?: boolean } = {}): MochiFrame {
  const f = mochiTime(film);
  const t = WT(f);
  const cam = camera(f);
  const PL = Object.fromEntries(PLATES.map((k) => [k, plateAt(k, f, false)])) as Record<Plate, PlateState>;
  const PLS = Object.fromEntries(PLATES.map((k) => [k, plateAt(k, f, true)])) as Record<Plate, PlateState>;
  const pen = new Pen(fonts);
  const x: Ctx = { pen, I: mode === 'game' ? GAME_INK : PRINT_INK, f, t, cam, PL, PLS, stage: false, sfx: o.sfx ?? true };
  const h = heroState(f);
  const hs: XY = h.screen ? [h.x, h.y] : toScreen(cam, 1, h.x, h.y);
  const at = (p: number, draw: () => void): void => {
    pen.save();
    applyCam(x, p);
    draw();
    pen.restore();
  };

  // The world.
  at(0.25, () => {
    drawSky(x, f);
    drawBaren(x, f);
  });
  at(0.4, () => drawMistHigh(x, t));
  const heroL = fromScreen(cam, 0.5, hs[0], hs[1]);
  at(0.5, () => drawChidori(x, t, heroL));
  at(0.55, () => {
    drawMountain(x, t);
    drawMistLow(x, t);
  });
  at(0.7, () => {
    drawFarSea(x, t);
    drawWhirl(x, 1700, 722, 62, -whirlAngle(t, 0.09), t >= 30 ? hitPop(t, 30, 0.25) : 0);
  });
  const toss = smooth(94, 100, t) * (1 - smooth(116, 132, t));
  const bob = (ph: number, id: number): number => -7 * hop8(t, ph) + 26 * ring(t, 108 + id * 2, 20, 7) - 34 * toss * Math.abs(Math.sin(t * 0.3 + id)) - 14 * kick(t, 144 + (2 - id) * 6, 3);
  at(0.85, () => {
    swellRow(x, t, 812, 230, 34, x.I.sw1, 0, 3);
    drawWhirl(x, 1560, 880, 112, whirlAngle(t, 0.1) * 1.2, t >= 132 ? hitPop(t, 132, 0.3) : 0);
    drawBoat(x, 1110, 806 + bob(0, 0), 0.05 * ring(t, 36, 24, 10) + 0.05 * Math.sin(t / 9) + toss * 0.4 * Math.sin(t * 0.5), 0.78, t, 0, toss);
    drawBoat(x, 1500, 846 + bob(1, 1), 0.06 * Math.sin(t / 8 + 1) - toss * 0.35 * Math.sin(t * 0.45), 0.9, t, 1, toss);
  });
  at(1, () => {
    const mp = mainPose(t);
    if (mp.vis && mp.g > 0.01) drawWave(x, t, mp, mainA(t));
    const rp = reboundPose(t);
    if (rp.vis && rp.g > 0.01) drawWave(x, t, rp, rebA(t));
    drawWake(x, f, h);
    drawLandRings(x, f);
    swellRow(x, t, 905, 260, 46, x.I.sw2, 1, 7);
    drawBoat(x, 1800, 930 + bob(0, 2), 0.05 * Math.sin(t / 10 + 2) + toss * 0.5 * Math.sin(t * 0.4 + 1), 1.06, t, 2, toss);
    drawColumn(x, f);
  });
  at(1.15, () => {
    swellRow(x, t, 1035, 300, 58, x.I.sw3, 0, 9);
    drawWhirl(x, 1420, 966, 150, whirlAngle(t, 0.07) + (t > 96 ? (t - 96) * 0.05 : 0), t >= 36 ? hitPop(t, 36, 0.3) : 0);
    drawWhirl(x, 230, 992, 96, -whirlAngle(t, 0.08), t >= 36 ? hitPop(t, 36, 0.3) : 0);
  });
  at(1, () => drawSpray(x, f));
  at(0.3, () => drawCartouche(x, f));
  if (mode === 'print') drawPress(x, f);
  pen.newLayer();
  const world = pen.layers.length - 1;

  // The overlays (over the mie's indigo and the halftone).
  const R = mode === 'print' ? mieAt(f) : null;
  if (R !== null) {
    pen.strokePts(circleP(hs[0], hs[1], R).pts, 14, x.I.ink, 1, true);
    pen.strokePts(circleP(hs[0], hs[1], R - 12).pts, 4, x.I.foam, 0.9, true);
  }
  focusLines(x, f, 72, hs[0], hs[1], 330);
  focusLines(x, f, 96, hs[0], hs[1], 300, 8, 80);
  at(0.3, () => drawSeal(x, f));
  const cs = toScreen(cam, 0.3, CART.x + CART.w / 2, CART.y + CART.h / 2);
  drawRings(x, f, 120, cs[0], cs[1], 230);
  drawRings(x, f, 72, hs[0], hs[1], 180);
  drawSFX(x, f);
  drawStar(x, f, 168, hs[0], hs[1]);
  if (f >= 118 && f < 132) {
    const h0 = heroState(120);
    const b = toScreen(cam, 1, h0.x, h0.y);
    drawBrackets(x, f, b[0], b[1] + 10, 250 * cam.z * h0.s, 150 * cam.z * h0.s);
  }
  // From the bitmap's frame the mothership is the arcade's, drawn over the quantised picture (the top layer).
  const bitmap = f >= LEAP.bitmap - 0.25;
  if (!bitmap) drawHero(x, f, h);

  // The halftone.
  let halftone: Halftone | null = null;
  if (mode === 'print' && f >= 94 && f < 120) {
    const d = f - 96;
    halftone = {
      R: domeR(f),
      yd: drainY(f),
      impact: IMPACT,
      breathe: f - 96,
      polka: f - 94,
      polkaPop: hitPop(f, 96, 0.4),
      ring: f >= 96 && f < 103 ? { R: 140 + 1500 * (1 - Math.exp(-d / 2.6)), band: 70 + 20 * d, d } : null,
    };
  }

  // The downsample (11.4 → 12.1) and what goes over it: the film's own (src/shots/drop2Wave.ts), fed this world's picture and spray.
  const F = BURST + f;
  const line = scanLineY(F);
  const cell = downsampleCell(F);
  const top: WaveLayer = { vec: [], glyphs: { rounded: [], jp: [], hero: [] } };
  const scan = linear(LAW.defender.emissive, LAW.defender.emissiveGain * 1.6);
  const wipe = mode === 'print' ? wipeAt(film) : null;
  if (wipe) {
    // The wipe's rim: a sumi ring on the edge of the print, over the switch's picture outside it.
    const n = 96;
    const ring = Array.from({ length: n }, (_, i) => [wipe.cx + wipe.R * Math.cos((2 * Math.PI * i) / n), wipe.cy + wipe.R * Math.sin((2 * Math.PI * i) / n)]).flat();
    top.vec.push({ kind: 'stroke', pts: ring, widths: Array(n).fill(WIPE.rim), color: x.I.ink, alpha: 1, closed: true });
  }
  if (mode === 'print') {
    if (line !== null) {
      // (Flickering on the frame as approved on the 61-bar map: v07Frame, v08's bridge A moved drop 2 a bar.)
      const glow = F < DOWNSAMPLE.from ? 0.5 + 0.5 * Math.sin(v07Frame(F) * 1.7) : 1;
      top.vec.push({ kind: 'stroke', pts: [-20, line, 1940, line], widths: [5, 5], color: scan, alpha: glow, closed: false, straight: true });
      top.vec.push({ kind: 'stroke', pts: [-20, line - 7, 1940, line - 7], widths: [10, 10], color: scan, alpha: 0.18 * glow, closed: false, straight: true });
    }
    const white = linear('#F2F2F2');
    for (const s of mochiSprayAt(F)) top.vec.push({ kind: 'fill', pts: [s.x, s.y, s.x + GP, s.y, s.x + GP, s.y + GP, s.x, s.y + GP], color: white, alpha: s.on, straight: true });
    if (bitmap) {
      const amber = linear(LAW.hero);
      for (const [bx, by] of litOf(HERO_BITMAP)) {
        const x0 = MOTHERSHIP.cx - MOTHERSHIP_WIDTH / 2 + bx * MOTHERSHIP.px;
        const y0 = MOTHERSHIP.cy - (HERO_BITMAP.length * MOTHERSHIP.px) / 2 + by * MOTHERSHIP.px;
        top.vec.push({ kind: 'fill', pts: [x0, y0, x0 + MOTHERSHIP.px, y0, x0 + MOTHERSHIP.px, y0 + MOTHERSHIP.px, x0, y0 + MOTHERSHIP.px], color: amber, alpha: 1, straight: true });
      }
    }
  }
  const wcam: WaveCam = { fx: cam.x, fy: cam.y, zoom: cam.z, roll: cam.r };
  return {
    layers: pen.layers,
    world,
    downsample: line !== null && cell > 0 ? { lineY: line, cell, derez: derezAt(F) } : null,
    top,
    cam: wcam,
    mcam: cam,
    mie: R !== null ? { cx: hs[0], cy: hs[1], R } : null,
    halftone,
    local: f,
    wipe,
  };
}

/**
 * His rect on screen at output frame F (the scoreboard's dock ghosts out of his way, src/shots/drop2SwitchSlot.ts): centre, half width,
 * half height (his face with its arms and the board under it), null outside the wave.
 */
export function mochiHeroRect(F: number, fonts: Fonts = defaultMochiFonts): { x: number; y: number; hw: number; hh: number } | null {
  if (F < BURST || F >= BURST + N) return null;
  const f = F - BURST;
  if (f >= LEAP.bitmap) return null;
  const h = heroState(f);
  const cam = camera(f);
  const [X, Y] = h.screen ? [h.x, h.y] : toScreen(cam, 1, h.x, h.y);
  const k = h.s * (h.screen ? 1 : cam.z);
  const w = POSES[h.pose].reduce((a, s) => a + [...s].reduce((q, ch) => q + fonts.hero(ch), 0), 0) * HERO_PX;
  const hw = (Math.max(w, 340 * h.board) / 2) * k * h.sqx;
  const top = 62 * k * h.sqy;
  const bottom = (h.board > 0.01 ? 104 : 62) * k * h.sqy;
  return { x: X, y: Y + (bottom - top) / 2, hw, hh: (top + bottom) / 2 };
}

// ——— The hand-off's game pixels (the film's sprayAt contract, 1055 → 1056, for this world) ——————————————————————————————————

const CELLS: readonly { x: number; y: number; copy: boolean }[] = (() => {
  const out: { x: number; y: number; copy: boolean }[] = [];
  for (let c = 0; c < 10; c++)
    for (let r = 0; r < 8; r++) {
      const [x, y] = cellCentre(c, r);
      out.push({ x, y, copy: SIGNATURE_BITS[r][c] });
    }
  return out.sort((a, b) => Number(b.copy) - Number(a.copy));
})();
/**
 * Where his leap's splash is thrown up (the wave's plane): the rebound's crest under his apex, u .6 on 11.4, where the print's own 11.4
 * spray ('nose2' in BURSTS) leaves the water. He hangs at the apex and rises from it toward the mothership, so the splash is the water
 * he leaves behind, ≥ 100 px under him on every frame (thrown from his own centre, it sat on his face).
 */
export const LEAP_SPLASH: XY = (() => {
  const p = atU(rebA(LEAP.from), 0.6);
  return [p.x, p.y];
})();
/**
 * The game pixels of his leap's splash (off the rebound's crest, 11.4, on the world's camera) and of the mountain's faces once the scan
 * line has passed them; from 11.4& they fly to the formation's 80 cells (the copies' cells first), on the 6 px game grid; the ones bound
 * for an empty cell fade, so on drop2 12.1 − 1 exactly the 27 copies' cells hold a lit pixel (as v09's sprayAt). They are drawn over
 * him (the top layer) but never cross him: the splash and the formation's cells both lie under him.
 */
export function mochiSprayAt(F: number): SprayPixel[] {
  const line = scanLineY(F);
  if (line === null || F < DOWNSAMPLE.from) return [];
  const f = F - BURST;
  const cam = camera(f);
  const s0 = toScreen(cam, 1, LEAP_SPLASH[0], LEAP_SPLASH[1]);
  const sources: XY[] = [];
  for (const d of LEAP_DROPS) {
    const q = dropAt(d, Math.min(F, DOWNSAMPLE.from + 11));
    if (q) sources.push([s0[0] + q[0], s0[1] + q[1]]);
  }
  for (const m of fujiFaces()) sources.push(toScreen(cam, 0.55, m[0], m[1]));
  const gather = DOWNSAMPLE.from + 12;
  const out: SprayPixel[] = [];
  sources.forEach((s, i) => {
    if (s[1] > line) return;
    const cell = CELLS[i % CELLS.length];
    const u = clamp((F - gather) / (DOWNSAMPLE.to - 1 - gather));
    const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    const px = lerp(s[0], cell.x, e);
    const py = lerp(s[1], cell.y, e);
    const extra = i >= CELLS.length;
    const on = cell.copy && !extra ? 1 : 1 - e;
    if (on <= 0.01) return;
    out.push({ x: GP * Math.round(px / GP), y: GP * Math.round(py / GP), on, copy: cell.copy && !extra });
  });
  return out;
}

// ——— Look, photography, segment ————————————————————————————————————————————————————————————————————————————————————————————

/** The print: flat, the paper is the light (no bloom but the scan line's); the paper grain and the warm vignette are the scene's pass. */
export function mochiLook(F: number): Look {
  const scanning = F >= DOWNSAMPLE.from - 12;
  const look: Look = { ...FLAT_LOOK, grain: 0.03, vignette: 0.04, bloom: scanning ? { intensity: 0.6, threshold: 0.9, smoothing: 0.1, radius: 0.5 } : FLAT_LOOK.bloom };
  if (!wipeAt(F)) return look;
  // Under the wipe the switch's picture keeps its own finish (its exposure, its bloom, its grain and vignette) in the share of the frame the
  // print has not covered yet: the blueprint's light does not drop out from under it on the downbeat.
  const s = switchLook(LAST);
  const k = 1 - wipeCover(F);
  return {
    ...look,
    exposure: lerp(look.exposure, s.exposure, k),
    bloom: { intensity: lerp(look.bloom.intensity, s.bloom.intensity, k), threshold: lerp(look.bloom.threshold, s.bloom.threshold, k), smoothing: lerp(look.bloom.smoothing, s.bloom.smoothing, k), radius: lerp(look.bloom.radius, s.bloom.radius, k) },
    aberration: lerp(look.aberration, s.aberration, k),
    grain: lerp(look.grain, s.grain, k),
    vignette: lerp(look.vignette, s.vignette, k),
  };
}
/** The film's camera-energy accents in this world (src/score/drop2.ts DROP2_ACCENTS: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3), local frames. */
const ACCENTS = [0, 24, 48, 96, 120, 144] as const;
/**
 * 16 sub-frames (mochiTime puts half of them on the frame's own instant, the rest over its next quarter frame); 32 round the film's
 * camera-energy accents, whose punch and shake sweep the whole shutter (fewer samples there show as copies, not a blur).
 */
export function mochiTemporal(F: number): Temporal {
  const f = F - BURST;
  return { samples: ACCENTS.some((a) => f >= a - 1 && f <= a + 3) ? 32 : 16, shutter: 0.5, persistence: 0 };
}
export const mochiSegment = (F: number): Segment => drop2Segment(F);

/** Every string the mochi draws per atlas. */
export const MOCHI_STRINGS = {
  hero: [...new Set([...Object.values(POSES).flatMap((p) => [...p.join('')]), ...SFX_TEXT])],
  rounded: [...new Set([...MOCHI_FUJI_FACE, ...ROWER.rest, ...ROWER.shock, ...ROWER.inf, ...MOCHI_CARTOUCHE.title, ...MOCHI_CARTOUCHE.version, MOCHI_CARTOUCHE.seal, ...BYTES.join('')].filter((c) => c !== ' '))],
} as const;
