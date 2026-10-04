// Bridge A, X02 (v08, the part 'bridgeA': the bar between the event horizon's point and the comic club's first dot; score
// src/score/bridgeA.ts), pure: the draw list of an instant, how each output frame is photographed and finished, and the pieces the tests
// read. The v07 review found the turn from the cosmos to the comic too fast: the point became the club's eye and the page printed in within a beat.
//
// The camera never leaves the point — his left • eye, the anchor at the frame's centre on every frame — and pushes in on it from the
// cosmos's scale (the point r 17 px, the club's eye at 17/60 of its club 1.1 size) to the club's, rolling clockwise as the stutter turned,
// while the club's own splash world (src/shots/clubInkA.ts: the same face, the same burst lattice, the same pen and camera model, so club
// 1.1 is the next frame of what this shows) is printed round it a layer a beat:
//   beat 1  the breath: the stutter's three Ben-Day rings ripple out, still turning clockwise and fading to paper; the eye's halftone glow
//           goes; the point blinks (shut on 1&, open on 1a: it is an eye).
//   beat 2  the plates land on the kick: (•ω•) round the eye — the key (K) and the shadow in register, the amber a little off, cyan and pink
//           plates well off one way and the other (the eye itself is the registration point: in register from the first frame); the pen
//           draws the page's border clockwise from its top-left corner, a crop mark popping at each corner it turns; a register step on 2&.
//   beat 3  register: the plates snap onto the key (a hair past, back); the register targets pop; the Ben-Day burst's dots start printing
//           from the eye outward, a ring further on each sixteenth.
//   beat 4  the dots print a ring further on each hit of the fill as the push speeds up; the border, its marks and the targets leave the
//           frame; club 1.1's burst (front 1150 px, its fourteen spikes) lands from a disc of dots already printed.
// Every kick from beat 2 is the club's print bump (the page drops and punches on its own frame). The face and the eye are drawn by the
// output frame's camera (crisp: no blur smear on a face); the dots, the border and the rings by each sub-frame's (they streak with the push).
// Units: the splash world (y down, the prototype's units; clubInkA.ts), screen px at 1080p for the screen-space pieces. Plain Node loads
// this file: no three / remotion / react imports.
import { linear, scaleRGB } from '../engine/color.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { HERO_INK } from '../content/castClub.ts';
import { BLINK, BRIDGE_A_END, BRIDGE_A_START, DOTS, KICKS, PEN, PLATES, REGISTER, REGISTER_STEP, TARGETS } from '../score/bridgeA.ts';
import { STUTTER_RINGS, pointEye } from './cosmosHole.ts';
import {
  INKS_NO_RED,
  Pen,
  SPLASH_EM as EM1,
  SPLASH_EYE as E,
  SPLASH_ZOOM as ZB,
  type SplashCam as Cam,
  aimOf,
  anchorOf,
  cposX,
  ctxOf,
  ell,
  inkType,
  layout,
  poseOf,
  seg,
  still,
} from './clubInkA.ts';
import { AMBER, CYAN, INK_FINISH, type InkDraw, type InkLayout, K, NIGHT, PAPER, PINK, PLATE_REST, SCREEN, VOID, comicPrint, dropPose, frameOf, shutter } from './clubInkKit.ts';

const PI = Math.PI;
const D2R = PI / 180;
const cl = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
const lr = (a: number, b: number, t: number): number => a + (b - a) * t;
const sF = (t: number): number => 0.5 - 0.5 * Math.cos(PI * cl(t));
const S = BRIDGE_A_START;
const BAR = BRIDGE_A_END - BRIDGE_A_START;

// ——— The camera: the push in on the eye and the roll ————————————————————————————————————————————————————————————————————————

/** The push, as a share of the club's own zoom on club 1.1 (ZB): from the point's scale (r 17 px against the eye's 60) to 1. */
export const PUSH = { from: 17 / 60, slow: 0.1, power: 2.2 } as const;
/**
 * The push's share at instant `f` (log-zoom): a slow drift through the breath (PUSH.slow of the way, evenly), the rest accelerating
 * (u^PUSH.power) into club 1.1, where it lands on the club's zoom moving about 2.7 % a frame — a landing on the downbeat's burst (the
 * club's camera creeps on from rest and its punch takes the hit).
 */
export function pushAt(f: number): number {
  const u = cl((f - S) / BAR);
  const w = PUSH.slow * u + (1 - PUSH.slow) * u ** PUSH.power;
  return PUSH.from ** (1 - w);
}
/**
 * The roll (degrees; positive turns the world clockwise on screen, as in clubInkA.ts): from ROLL.from to the splash camera's −2° on club
 * 1.1, easing out — clockwise all the way, as the stutter turned the disc and as club 1.1's camera rolls on (−2° → −1° over its beat).
 */
export const ROLL = { from: -10, to: -2 } as const;
export const rollAt = (f: number): number => ROLL.to + (ROLL.from - ROLL.to) * (1 - cl((f - S) / BAR)) ** 2;
/** The camera at instant `f`: on the eye (the splash world's E), at the push's zoom and the roll. */
export const bridgeCam = (f: number): Cam => ({ z: ZB * pushAt(f), cx: E[0], cy: E[1], ro: rollAt(f) * D2R });
/** Where a splash-world point lies on screen under camera `c` (px from the centre, y down). */
export function onScreenAt(c: Cam, x: number, y: number): [number, number] {
  const dx = x - c.cx;
  const dy = y - c.cy;
  return [c.z * (Math.cos(c.ro) * dx - Math.sin(c.ro) * dy), c.z * (Math.sin(c.ro) * dx + Math.cos(c.ro) * dy)];
}

// ——— Beat 1: the stutter's rings ripple out, the glow goes, the point blinks ————————————————————————————————————————————————————

/**
 * The stutter's three Ben-Day rings (src/shots/cosmosHole.ts STUTTER_RINGS, held through the point) are the landing's accent: on the
 * landing (the piano's IV) they jump out (RIPPLE.jump of their radius, most of it on the landing's own frame), then drift on out
 * (RIPPLE.drift a frame), the outer ones further (RIPPLE.spread a ring), turning on clockwise from the stutter's 10° a frame (RIPPLE.spin°,
 * the club's burst spin's τ) into a crawl, while their dots dissolve (gone by RIPPLE.gone: the frame is the point's alone, breathing,
 * when the plates land) and go from the cosmos's 80 % soft paper to the print's paper.
 */
export const RIPPLE = { jump: 0.22, tau: 0.8, drift: 0.012, spread: 0.15, spin: 40, spinTau: 4, crawl: 0.8, gone: 22 } as const;
export const rippleScale = (t: number, ring: number): number =>
  t < 0 ? 1 : 1 + (1 + RIPPLE.spread * ring) * (RIPPLE.jump * (1 - Math.exp(-(t + 1) / RIPPLE.tau)) + RIPPLE.drift * t);
export const rippleSpin = (t: number): number => (t <= 0 ? 0 : RIPPLE.spin * (1 - Math.exp(-t / RIPPLE.spinTau)) + RIPPLE.crawl * t);
/** The rings' dots at output frame `F` (screen px, y up from the centre; `d` the dot's diameter, `paper` 0.8 → 1, `soft` 0.8 → 0): none once off the frame. */
export function rippleDots(F: number): { x: number; y: number; d: number; paper: number; soft: number }[] {
  const t = F - S;
  const out: { x: number; y: number; d: number; paper: number; soft: number }[] = [];
  if (t < 0 || t >= RIPPLE.gone) return out;
  const u = cl(t / 16);
  const left = 1 - sF(t / RIPPLE.gone);
  const turn = -rippleSpin(t) * D2R;
  STUTTER_RINGS.r.forEach((r0, k) => {
    const sc = rippleScale(t, k);
    for (let row = 0; row < STUTTER_RINGS.rows; row++) {
      const rr = (r0 + row * STUTTER_RINGS.pitch * 0.87) * sc;
      if (rr > 1150) continue;
      const m = Math.round((2 * PI * (r0 + row * STUTTER_RINGS.pitch * 0.87)) / STUTTER_RINGS.pitch);
      for (let i = 0; i < m; i++) {
        const th = (2 * PI * (i + 0.5 * row)) / m + 0.1 * k + turn;
        out.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), d: STUTTER_RINGS.dot * (row === 0 ? 1 : 0.7) * Math.sqrt(sc) * left, paper: lr(0.8, 1, u), soft: lr(0.8, 0, u) });
      }
    }
  });
  return out;
}
/** The point's halftone glow (cosmosHole.ts pointEye on its last frame), its dots shrinking away over the blink's first frames. */
export const GLOW_GONE = BLINK.from;
export function glowDots(F: number): { x: number; y: number; d: number }[] {
  const s = 1 - cl((F - S) / (GLOW_GONE - S));
  if (s <= 0) return [];
  return pointEye(S - 1).glow.map((g) => ({ x: g.x, y: g.y, d: g.d * s }));
}
/** The eye's ink: the cosmos lit the point at 85 % under its bloom; it comes up to the print's full amber as the bloom goes (beat 1's first half). */
export const eyeInk = (F: number): number => lr(0.85, 1, sF((F - S) / 12));
/** The eye's openness at output frame `F` (1 open, BLINK_SHUT shut): closing over 2 frames from 1&, held, open again over 3 from 1a. */
export const BLINK_SHUT = 0.12;
export function eyeOpen(F: number): number {
  const t = F - BLINK.from;
  if (t < 0) return 1;
  if (t < 2) return lr(1, BLINK_SHUT, sF(t / 2));
  if (F < BLINK.to) return BLINK_SHUT;
  return lr(BLINK_SHUT, 1, sF((F - BLINK.to + 1) / 3));
}

// ——— Beats 2–3: the plates, the register, the pen —————————————————————————————————————————————————————————————————————————————

/** The plates' offsets from the key when they land (screen px, y down): cyan up-left, pink down-right, the amber a little off. */
export const PLATE_OFF = { cyan: [-38, -26], pink: [34, 28], amber: [10, -8] } as const;
/**
 * How far off register the plates are at output frame `F` (1 as they land, 0 in register): off from PLATES, half on the register step
 * (2&), snapped on at REGISTER — a hair past (−6 %), settled by 6 frames later. Each step lands most of its way on its own frame.
 */
export function plateShare(F: number): number {
  if (F < PLATES) return 1;
  const snap = (t: number): number => 1 - Math.exp(-(t + 0.5) / 0.6);
  if (F < REGISTER_STEP) return 1;
  if (F < REGISTER) return lr(1, 0.5, snap(F - REGISTER_STEP));
  const t = F - REGISTER;
  return t >= 6 ? 0 : lr(0.5, 0, snap(t)) - 0.06 * Math.sin(PI * cl(t / 6));
}
/** The page: its border round the eye (world units, half sizes), the crop marks off its corners, the targets off its sides. */
export const PAGE = { w: 950, h: 534, line: 8, mark: { gap: 26, len: 74 }, target: { off: 96, r: 34, arm: 52 } } as const;
/** The pen's progress round the border at output frame `F` (0 → 1, clockwise from the top-left corner), easing out over PEN. */
export const penAt = (F: number): number => (F < PEN.from ? 0 : 1 - (1 - cl((F - PEN.from) / (PEN.to - PEN.from))) ** 1.6);
/** The border's corners in pen order (world, y down): top-left, top-right, bottom-right, bottom-left. */
export const CORNERS: readonly (readonly [number, number])[] = [
  [E[0] - PAGE.w, E[1] - PAGE.h],
  [E[0] + PAGE.w, E[1] - PAGE.h],
  [E[0] + PAGE.w, E[1] + PAGE.h],
  [E[0] - PAGE.w, E[1] + PAGE.h],
];
const PERIMETER = 4 * (PAGE.w + PAGE.h);
/** Where along the pen's way (0–1) it turns corner `k` (0 = the start). */
export const cornerAt = (k: number): number => [0, 2 * PAGE.w, 2 * PAGE.w + 2 * PAGE.h, 4 * PAGE.w + 2 * PAGE.h][k] / PERIMETER;

// ——— Beats 3–4: the Ben-Day dots print outward ———————————————————————————————————————————————————————————————————————————————

/** The print's front on screen (px from the eye) after each DOTS event: a ring further on each sixteenth, then on each hit of the fill. */
export const FRONT_PX: readonly number[] = [130, 200, 270, 350, 440, 540, 640, 720];
/** The front at output frame `F` (screen px): each step lands most of its way on its own event's frame (an impact, over ~2 frames). */
export function frontAt(F: number): number {
  let r = 0;
  DOTS.forEach((at, i) => {
    if (F < at) return;
    const prev = i ? FRONT_PX[i - 1] : 0;
    r += (FRONT_PX[i] - prev) * (1 - Math.exp(-(F - at + 1) / 1.2));
  });
  return r;
}
/** The burst's lattice (clubInkA.ts burst(): log-polar, 72 dots a ring 5° apart, ring j at 110 e^(0.09 j) px on club 1.1, dots 0.026 r). */
export const LATTICE = { r0: 110, k: 0.09, rings: 34, per: 72, dot: 0.026 } as const;

// ——— The draw list ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The print bump (src/shots/clubInkKit.ts PRINT_BUMP, the club's ink grammar) on the bridge's kicks from beat 2: { drop px, zoom }. */
export const BUMP = { drop: 6, zoom: 0.02, frames: 6 } as const;
export const BUMP_KICKS: readonly number[] = KICKS.filter((k) => k >= PLATES);
export function bumpAt(F: number): number {
  let k = -Infinity;
  for (const b of BUMP_KICKS) if (b <= F) k = b;
  const t = F - k;
  return t >= 0 && t < BUMP.frames ? (1 - t / BUMP.frames) ** 2 : 0;
}

/** The face's pieces (HERO_INK.inked, the club 1.1 face: clubInkA.ts face21): the type characters and the two eyes. */
const FACE = HERO_INK.inked;
/**
 * His eyes (world): the left is the point — r 60/ZB, the cosmos's point (17 px) at the push's first zoom — until it opens to the right
 * eye's 95/ZB on the register (3.1, as the face comes whole), over EYE_OPENS frames, easing out; club 1.1 shows it open (clubInkA.ts
 * face21, v08).
 */
export const EYE_R = { left: 60 / ZB, right: 95 / ZB } as const;
export const EYE_OPENS = 4;
export const leftEyeR = (F: number): number => lr(EYE_R.left, EYE_R.right, 1 - (1 - cl((F - REGISTER + 1) / EYE_OPENS)) ** 3);

function shape(p: Pen, s: Shape): void {
  p.shape(s);
}

/** Bridge A at instant `f`. */
export function bridgeAAt(f: number, L: InkLayout): InkDraw[] {
  const F = frameOf(f);
  const cam = bridgeCam(f);
  const camF = bridgeCam(F);
  const p = new Pen(poseOf(cam), VOID);
  const c = ctxOf(p, L, f, cam, camF);
  const Y = layout(L);

  // Screen-space: the stutter's rings rippling out, the eye's glow going (beat 1).
  const ring = rippleDots(F);
  const glow = glowDots(F);
  if (ring.length || glow.length) {
    const back = p.pose;
    p.at(SCREEN);
    for (const d of ring) shape(p, { kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d, color: linear('#FDF3D8', d.paper), ...(d.soft > 0.01 ? { soft: d.soft } : {}) });
    for (const d of glow) shape(p, { kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d, color: scaleRGB(AMBER, 0.55), soft: 0.6 });
    p.at(back);
  }

  // The Ben-Day dots, printed out to the front (each sub-frame's camera: they streak with the push).
  const front = frontAt(F);
  if (front > 0) {
    const Rw = front / camF.z;
    for (let j = 0; j < LATTICE.rings; j++) {
      const r = (LATTICE.r0 * Math.exp(LATTICE.k * j)) / ZB;
      if (r > Rw) break;
      const grow = cl((Rw - r) / (0.16 * Rw + 1e-6)) ** 0.7;
      const b = LATTICE.dot * r * grow;
      if (b * cam.z < 0.35) continue;
      for (let i = 0; i < LATTICE.per; i++) {
        const th = i * 5 * D2R;
        const x = E[0] + Math.cos(th) * r;
        const y = E[1] + Math.sin(th) * r;
        const [sx, sy] = onScreenAt(cam, x, y);
        if (Math.abs(sx) > 960 + b * cam.z + 2 || Math.abs(sy) > 540 + b * cam.z + 2) continue;
        ell(c, x, y, b, b, j === 0 ? AMBER : PAPER, { rot: th });
      }
    }
  }

  // The page: the border drawn by the pen, the crop marks, the targets (each sub-frame's camera).
  const pen = penAt(F);
  if (pen > 0) {
    let left = pen * PERIMETER;
    for (let k = 0; k < 4 && left > 0; k++) {
      const a = CORNERS[k];
      const b = CORNERS[(k + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u = Math.min(1, left / len);
      const x1 = lr(a[0], b[0], u);
      const y1 = lr(a[1], b[1], u);
      seg(c, a[0], a[1], x1, y1, PAGE.line, PAPER);
      if (u < 1) ell(c, x1, y1, 1.6 * PAGE.line, 1.6 * PAGE.line, PAPER);
      left -= len;
    }
    // A crop mark at each corner the pen has turned (and at its start), popping in.
    CORNERS.forEach(([x, y], k) => {
      const at = PEN.from + (PEN.to - PEN.from) * (1 - (1 - cornerAt(k)) ** (1 / 1.6));
      const s = F < at ? 0 : Math.min(1, 0.4 + 0.6 * ((F - at + 1) / 3));
      if (s <= 0) return;
      const sx = x < E[0] ? -1 : 1;
      const sy = y < E[1] ? -1 : 1;
      const g = PAGE.mark.gap;
      const l = PAGE.mark.len * s;
      seg(c, x + sx * g, y, x + sx * (g + l), y, PAGE.line * 0.7, PAPER);
      seg(c, x, y + sy * g, x, y + sy * (g + l), PAGE.line * 0.7, PAPER);
    });
  }
  if (F >= TARGETS) {
    const s = Math.min(1, 0.4 + 0.6 * ((F - TARGETS + 1) / 3)) * (1 + 0.12 * Math.sin(PI * cl((F - TARGETS) / 6)));
    const at: readonly (readonly [number, number])[] = [
      [E[0] - PAGE.w - PAGE.target.off, E[1]],
      [E[0] + PAGE.w + PAGE.target.off, E[1]],
      [E[0], E[1] - PAGE.h - PAGE.target.off],
    ];
    for (const [x, y] of at) {
      const r = PAGE.target.r * s;
      const a = PAGE.target.arm * s;
      ell(c, x, y, r + PAGE.line * 0.35, r + PAGE.line * 0.35, PAPER);
      ell(c, x, y, r - PAGE.line * 0.35, r - PAGE.line * 0.35, VOID);
      seg(c, x - a, y, x + a, y, PAGE.line * 0.6, PAPER);
      seg(c, x, y - a, x, y + a, PAGE.line * 0.6, PAPER);
    }
  }

  // The face (from the plates' landing) and the eye, by the output frame's camera.
  still(c, (s) => {
    const z = s.z;
    if (F >= PLATES) {
      const k = plateShare(F);
      const off = (o: readonly [number, number]): [number, number] => [(o[0] * k) / z, (o[1] * k) / z];
      const lw = Math.min(0.06 * EM1 * z, 40) / z;
      const sh = 21 / ZB;
      const chars = [...FACE];
      const xs = chars.map((_, i) => Y.HS[0] + cposX(L, FACE, i, EM1));
      const y = Y.HS[1];
      // The cyan and pink plates, off register (under the key: once on, the keyline covers them).
      for (const [color, o] of [[CYAN, PLATE_OFF.cyan], [PINK, PLATE_OFF.pink]] as const) {
        const [dx, dy] = off(o);
        for (const i of [0, 2, 4]) inkType(s, chars[i], xs[i] + dx, y + dy, EM1, { fl: color, lw: 0, boil: false });
        ell(s, xs[3] + dx, y + dy, EYE_R.right, EYE_R.right, color);
      }
      // The key, the shadow and the amber (the amber plate a little off), as club 1.1's face21 draws them.
      const pl = off(PLATE_OFF.amber);
      for (const i of [0, 2, 4]) inkType(s, chars[i], xs[i], y, EM1, { fl: AMBER, lw, sh: [sh, sh], pl });
      const r = EYE_R.right;
      const ew = 10 / ZB;
      ell(s, xs[3] + sh, y + sh, r + ew / 2, r + ew / 2, NIGHT);
      ell(s, xs[3], y, r + ew / 2, r + ew / 2, K);
      ell(s, xs[3] + pl[0], y + pl[1], r, r, AMBER, { outline: ew / 2 });
      ell(s, xs[3] - r * 0.38, y - r * 0.42, 11 / ZB, 5 / ZB, PAPER, { rot: -35 * D2R });
    }
    // The left eye: the point, in register from the first frame (the plates register to it), blinking on 1&.
    const r = leftEyeR(F);
    const open = eyeOpen(F);
    const ew = 10 / ZB;
    if (F >= PLATES) ell(s, E[0] + 21 / ZB, E[1] + 21 / ZB, r + ew / 2, r * open + ew / 2, NIGHT);
    ell(s, E[0], E[1], r + ew / 2, r * open + ew / 2, K);
    ell(s, E[0], E[1], r, r * open, scaleRGB(AMBER, eyeInk(F)), { outline: ew / 2 });
    if (open > 0.6) ell(s, E[0] - r * 0.38, E[1] - r * 0.42 * open, 11 / ZB, (5 / ZB) * open, PAPER, { rot: -35 * D2R });
  });

  // The print bump on the kicks from beat 2 (whole on the kick's own frame).
  const draws = p.done();
  const bump = bumpAt(F);
  return bump > 0 ? draws.map((d) => ({ ...d, pose: dropPose(d.pose, BUMP.drop * bump, BUMP.zoom * bump) })) : draws;
}

// ——— Photography and finishing ——————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The bridge's sub-frames: the print's 0.3 shutter (clubInkA.ts PRINT_SHUTTER: a blur summed before the comic pass beads every keyline),
 * 24 samples; 32 over the last beat's push (the dots streak radially up to ~25 px a frame).
 */
export const bridgeATemporal = (frame: number): Temporal => shutter(frame >= BRIDGE_A_END - 24 ? 32 : 24, 0.3);

/**
 * The bridge's finish: from the cosmos's point (its bloom 1.15 over 0.75, no grain, no print) to the club's print (INK_FINISH and the
 * comic pass as club 1.1 prints: the plates at rest, the dots riding the camera, red left out) — the bloom gone over the breath, the
 * print in by the plates' landing — and the print's dots spreading on the kicks as the club's do (pitch 16 → 18).
 */
export const COSMOS_BLOOM = { intensity: 1.15, threshold: 0.75, smoothing: 0.3, radius: 0.75 } as const;
export const PRINT_IN = { from: S + 16, to: PLATES } as const;
export function bridgeALook(frame: number): Look {
  const t = cl((frame - S) / (PLATES - S));
  const amount = cl((frame - PRINT_IN.from) / (PRINT_IN.to - PRINT_IN.from));
  const aim = aimOf(bridgeCam(frame));
  return {
    ...INK_FINISH,
    bloom: { ...COSMOS_BLOOM, intensity: COSMOS_BLOOM.intensity * (1 - sF(t)) },
    grain: INK_FINISH.grain * sF(t),
    comic: comicPrint(PLATE_REST, { amount, pitch: 16 + 2 * bumpAt(frame), screen: anchorOf(aim), inks: INKS_NO_RED }),
  };
}

/** The bridge's segment: its own bar (sub-frames never reach the cosmos's point or the club's dot). */
export const BRIDGE_A_SEGMENT = { from: BRIDGE_A_START, to: BRIDGE_A_END } as const;
