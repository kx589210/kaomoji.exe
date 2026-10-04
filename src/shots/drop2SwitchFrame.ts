// S31S THE SWITCH: what each of the scene's layers draws at an instant (src/shots/drop2Switch.ts has the timing, the camera and the
// contracts; drop2SwitchType.ts the glyph plans; src/scenes/drop2Switch.ts copies this to the GPU). Pure. Back to front:
//   grid    (world, the ground as paper) the blueprint grid on the sheet, drawn out from his centre as the grade turns to v2.0;
//   light   (world, additive) the light leaking from his box's cracks — behind him, so his lines go dark against it (backlit);
//   fill    (world) the X-ray's filled face on 9.1 (the kernel's last picture), draining into the outline;
//   blue    (world) per plane, back to front: its acetate sheet, its outline, its handles and points, its construction; the labels;
//   red     (world) the quarantine boxes, their hatch and stamps, the scan sweeps, the failed boxes' debris;
//   scan    (screen) the POV's rolling scanlines;
//   amber   (world, then screen) his copies — drawn after the POV, which cannot render them — and the flood;
//   hud     (screen) the reticle(s), DEFENDER v2.0 and ● REC, SIGNATURE MATCH, the big line, the drafting arcs and the title block.
// Flat world: px at 1080p, origin at the frame's centre, y up. "Layout": top-left origin, y down (screen elements are specified so).
import { AVATAR, SIGNATURE, SWITCH_TEXT } from '../content/drop2.ts';
import type { Pose } from '../engine/camera.ts';
import { type RGB, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import { SWAP_LEAD } from '../engine/temporal.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { BOX, CYANOTYPE, EXPLODE, FLOOD, SWITCH } from '../score/drop2.ts';
import { textGlyphs, textWidth } from './common.ts';
import { impact, snap } from './drop2Shared.ts';
import { DRAFT_GROUPS, bez, draftScreen } from './drop2MochiKit.ts';
import * as S from './drop2Switch.ts';
import { type FacePlans, FACE_ADVANCE, FACE_PARTS, type Layer, type Pt, emToWorld } from './drop2SwitchType.ts';

/** Every string each atlas needs (the scene builds its atlases from these). */
export const SWITCH_STRINGS = {
  mono: [...SWITCH_TEXT.tags, ...SWITCH_TEXT.dims, SWITCH_TEXT.rec, SWITCH_TEXT.titleBlock, SIGNATURE.match, '▣'],
  display: ['DEFENDER v2.0', 'THREAT CONTAINED ✓', SWITCH_TEXT.failed(1), '0123456789'],
  jp: [AVATAR.clean],
  rounded: ['(', '•', 'ω', ')', '(•ω•)'],
} as const;

export type SwitchAdvances = { mono: Advance; display: Advance; jp: Advance; rounded: Advance };

export type SwitchFrame = {
  pose: Pose;
  ground: RGB;
  grid: Shape[];
  fill: Glyph[];
  blue: Shape[];
  blueText: Glyph[];
  red: Shape[];
  redText: Glyph[];
  light: Shape[];
  scan: Shape[];
  amber: Glyph[];
  flood: Glyph[];
  hud: Shape[];
  hudText: { display: Glyph[]; mono: Glyph[]; jp: Glyph[] };
};

const T0 = SWITCH.from;
/** The placement line of a rounded glyph sits 22/360 em above the brackets' ink middle (drop2Slash.ts MASTER_Y). */
const PLACE = 22 / 360;
const LAYER_INDEX: Readonly<Record<Layer, number>> = { brackets: 0, eyes: 1, mouth: 2 };

// ——— Shape helpers ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A line from (x0, y0) to (x1, y1), `w` wide with round caps. */
export function seg(x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha = 1, z = 0, soft = 0): Shape {
  const len = Math.hypot(x1 - x0, y1 - y0);
  return { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, w: len + w, h: w, rot: Math.atan2(y1 - y0, x1 - x0), color, alpha, soft };
}
const ring = (x: number, y: number, r: number, w: number, color: RGB, alpha = 1, z = 0): Shape => ({ kind: 'ring', x, y, z, w: 2 * r, h: 2 * r, r: w, color, alpha });
/** Layout px → the screen layer's world (SCREEN pose: origin centre, y up). */
const sx = (x: number): number => x - 960;
const sy = (y: number): number => 540 - y;
/** An L corner: from (x, y) `arm` along each axis, toward (dx, dy). */
function corner(out: Shape[], x: number, y: number, dx: number, dy: number, arm: number, w: number, color: RGB, alpha: number, under?: RGB): void {
  if (under) {
    out.push(seg(x, y, x + dx * arm, y, w + 4, under, alpha * 0.85));
    out.push(seg(x, y, x, y + dy * arm, w + 4, under, alpha * 0.85));
  }
  out.push(seg(x, y, x + dx * arm, y, w, color, alpha));
  out.push(seg(x, y, x, y + dy * arm, w, color, alpha));
}
/** The 45° hatch lines inside the box (cx, cy, hw, hh), `gap` apart. */
function hatch(out: Shape[], cx: number, cy: number, hw: number, hh: number, gap: number, w: number, color: RGB, alpha: number, z = 0): void {
  if (alpha <= 0.002) return;
  // Lines y − cy = (x − cx) + c, clipped to the box.
  const step = gap * Math.SQRT2;
  for (let c = -(hw + hh) + step / 2; c < hw + hh; c += step) {
    const x0 = Math.max(-hw, -hh - c);
    const x1 = Math.min(hw, hh - c);
    if (x1 - x0 < 2) continue;
    out.push(seg(cx + x0, cy + x0 + c, cx + x1, cy + x1 + c, w, color, alpha, z));
  }
}
/** A polyline (closed or not) as segments. */
function poly(out: Shape[], pts: readonly (readonly [number, number])[], w: number, color: RGB, alpha: number, z = 0): void {
  for (let i = 1; i < pts.length; i++) out.push(seg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, color, alpha, z));
}
/** A dashed line. */
function dashed(out: Shape[], x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha: number, z = 0, dash = 8, gap = 6): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let s = 0; s < len; s += dash + gap) {
    const e = Math.min(len, s + dash);
    out.push(seg(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len, x0 + ((x1 - x0) * e) / len, y0 + ((y1 - y0) * e) / len, w, color, alpha, z));
  }
}
/** A dimension line with 45° ticks at both ends. */
function dimension(out: Shape[], x0: number, y0: number, x1: number, y1: number, color: RGB, alpha: number, z = 0): void {
  out.push(seg(x0, y0, x1, y1, 1.25, color, alpha, z));
  for (const [x, y] of [[x0, y0], [x1, y1]]) out.push(seg(x - 6, y - 6, x + 6, y + 6, 1.5, color, alpha, z));
}

/** Where the world point `p` lands on screen (layout px) through `pose` (16:9, `pose.fov` vertical). */
export function project(pose: Pose, p: readonly [number, number, number]): [number, number] {
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;
  let fx = tx - px;
  let fy = ty - py;
  let fz = tz - pz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  const [ux, uy, uz] = pose.up;
  // right = forward × up; true up = right × forward.
  let rx = fy * uz - fz * uy;
  let ry = fz * ux - fx * uz;
  let rz = fx * uy - fy * ux;
  const rl = Math.hypot(rx, ry, rz);
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const vx = ry * fz - rz * fy;
  const vy = rz * fx - rx * fz;
  const vz = rx * fy - ry * fx;
  const dx = p[0] - px;
  const dy = p[1] - py;
  const dz = p[2] - pz;
  const zc = dx * fx + dy * fy + dz * fz;
  const k = 540 / Math.tan((pose.fov * Math.PI) / 360) / zc;
  return [960 + (dx * rx + dy * ry + dz * rz) * k, 540 - (dx * vx + dy * vy + dz * vz) * k];
}

// ——— The frame ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Everything the switch draws at instant `f` (content) with its camera at instant `cam` (the shutter-open instant on phosphor tails).
 * `draft`: what Defender drafts on the flood (9.4&) — v09's golden curl (the default) or, with DROP2_THREADS.waveStyle 'mochi', the mochi
 * wave's outline (src/shots/drop2MochiKit.ts draftScreen: exactly the key block the wave prints on 10.1).
 */
export function switchFrame(f: number, plans: FacePlans, adv: SwitchAdvances, cam = f, draft: 'curl' | 'mochi' = 'curl'): SwitchFrame {
  const grade = S.gradeAt(f);
  const ground = S.groundAt(f);
  const lineInk = mixRGB(S.INK.xray, S.INK.line, grade);
  const out: SwitchFrame = {
    pose: S.switchPose(cam),
    ground,
    grid: grid(f, grade),
    fill: [],
    blue: [],
    blueText: [],
    red: [],
    redText: [],
    light: [],
    scan: scanlines(f),
    amber: [],
    flood: [],
    hud: [],
    hudText: { display: [], mono: [], jp: [] },
  };
  // In the flood's light he is backlit: his lines go dark against the glow behind him, over a dark keyline (S.heroInk).
  hero(out, f, plans, adv, grade, lineInk, ground);
  boxes(out, f);
  light(out, f);
  amber(out, f);
  hud(out, f, adv, draft);
  return out;
}

/** The blueprint grid on the sheet (z 0): minor 24 px at 10 %, major 96 px at 22 %, drawn out from his centre as the grade turns. */
function grid(f: number, grade: number): Shape[] {
  const out: Shape[] = [];
  if (grade <= 0) return out;
  const R = 1700 * grade;
  const ink = S.INK.line;
  for (let v = -1440; v <= 1440; v += 24) {
    const major = v % 96 === 0;
    const a = (major ? 0.22 : 0.1) * clamp((R - Math.abs(v)) / 80);
    if (a <= 0.002) continue;
    const w = major ? 1.5 : 1;
    // Clipped to the growing circle: the grid boots outward from him.
    const h = Math.sqrt(Math.max(0, R * R - v * v));
    if (h < 1) continue;
    out.push(seg(v, -Math.min(h, 1000), v, Math.min(h, 1000), w, ink, a));
    if (Math.abs(v) <= 1000) out.push(seg(-Math.min(h, 1500), v, Math.min(h, 1500), v, w, ink, a));
  }
  return out;
}

/** The POV's scanlines: 2 px black at 35 % every 4 px, rolling 1 px a frame; the leaking light burns through them. */
function scanlines(f: number): Shape[] {
  const out: Shape[] = [];
  const roll = (((f - T0) % 4) + 4) % 4;
  const a = 0.35 * (1 - 0.5 * S.crackAt(f));
  for (let y = roll - 4; y < 1084; y += 4) out.push({ kind: 'rect', x: 0, y: sy(y + 1), w: 1920, h: 2, color: [0, 0, 0], alpha: a });
  return out;
}

/** His face: the X-ray fill draining, then the blueprint on its planes. */
function hero(out: SwitchFrame, f: number, plans: FacePlans, adv: SwitchAdvances, grade: number, baseInk: RGB, ground: RGB): void {
  const ink = S.heroInk(f);
  const lineInk = mixRGB(baseInk, S.INK.onBlue, ink.dark);
  const breath = S.breathAt(f);
  const width = S.HERO_WIDTH * breath;
  const em = width / FACE_ADVANCE;
  const at = emToWorld({ cx: 0, cy: 0, width });
  const red = S.outlineRed(f);
  // The X-ray fill (v1, the kernel's last picture): a light face, his ω the hot spot, draining into the outline as v2.0 boots.
  const fillA = 1 - grade;
  if (fillA > 0.002) {
    for (const p of FACE_PARTS) {
      const [x] = at([p.x + plans.glyphs[p.ch].advance / 2, 0]);
      out.fill.push({ ch: p.ch, x, y: PLACE * em, size: em, color: p.ch === 'ω' ? S.INK.hot : S.INK.xray, alpha: fillA });
    }
  }
  const parts = f >= FLOOD ? [...FACE_PARTS, ...plans.brows] : FACE_PARTS;
  const browPop = f >= FLOOD ? Math.min(1, snap(f, FLOOD)) : 1;
  for (const layer of ['brackets', 'eyes', 'mouth'] as const) {
    const k = LAYER_INDEX[layer];
    const z = S.liftAt(layer, f);
    const inspect = clamp((f - EXPLODE[k]) / 4) * (1 - impact(f, BOX, 6));
    const mine = parts.filter((p) => p.layer === layer);
    // The layer's ink box (world), for its sheet, its sweep and its labels.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of mine) {
      if (p.part.startsWith('brow')) continue;
      const b = plans.glyphs[p.ch].box;
      const [ax, ay] = at([p.x + b[0], b[1]]);
      const [bx, by] = at([p.x + b[2], b[3]]);
      x0 = Math.min(x0, ax);
      y0 = Math.min(y0, ay);
      x1 = Math.max(x1, bx);
      y1 = Math.max(y1, by);
    }
    const m = 36;
    // The acetate sheet the plane is drawn on (when lifted).
    const sheet = clamp((f - EXPLODE[k]) / 3) * (1 - impact(f, BOX, 6));
    if (sheet > 0.002) {
      // The exploded view's ghost: the plane's outline left on the sheet, and dashed leaders from the sheet's corners up to the plane's.
      for (const p of mine) {
        if (p.part.startsWith('brow')) continue;
        for (const c of plans.glyphs[p.ch].contours) poly(out.blue, c.poly.map((q) => at([p.x + q[0], q[1]])), 1.25, lineInk, 0.3 * sheet, 0);
      }
      for (const [cx, cy] of [[x0 - m, y0 - m], [x1 + m, y0 - m], [x0 - m, y1 + m], [x1 + m, y1 + m]]) {
        const [ax, ay] = project(out.pose, [cx, cy, 0]);
        const [bx, by] = project(out.pose, [cx, cy, z]);
        dashed(out.hud, sx(ax), sy(ay), sx(bx), sy(by), 1, lineInk, 0.55 * sheet, 0, 5, 5);
      }
      out.blue.push({ kind: 'rect', x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m, color: S.INK.panel, alpha: 0.38 * sheet, outline: 1.25, outlineColor: lineInk });
      for (const [cx, cy] of [[x0 - m, y0 - m], [x1 + m, y0 - m], [x0 - m, y1 + m], [x1 + m, y1 + m]]) {
        out.blue.push(seg(cx - 9, cy, cx + 9, cy, 1.25, lineInk, sheet, z), seg(cx, cy - 9, cx, cy + 9, 1.25, lineInk, sheet, z));
      }
    }
    // The outline, its points and (inspected) its handles.
    const lineA = grade;
    const pointBg = mixRGB(ground, S.INK.panel, 0.38 * sheet);
    // A brow pops out of its eye's centre.
    const pinOf = (p: (typeof mine)[number]) => (q: Pt): [number, number] => {
      const g = plans.glyphs[p.ch];
      const w = at([p.x + q[0], q[1]]);
      if (!p.part.startsWith('brow')) return w;
      const c = at([p.x + (g.box[0] + g.box[2]) / 2, (plans.glyphs['•'].box[1] + plans.glyphs['•'].box[3]) / 2]);
      return [lerp(c[0], w[0], browPop), lerp(c[1], w[1], browPop)];
    };
    // Hardened on the flood: every contour's dark keyline first (under all the plane's lines), then the lines.
    if (ink.keyline > 0) for (const p of mine) for (const c of plans.glyphs[p.ch].contours) poly(out.blue, c.poly.map(pinOf(p)), ink.width + ink.keyline, S.INK.onBlue, lineA, z);
    for (const p of mine) {
      const g = plans.glyphs[p.ch];
      const pin = pinOf(p);
      for (const c of g.contours) {
        const pts = c.poly.map(pin);
        poly(out.blue, pts, ink.width, red ? S.INK.red : lineInk, red ? 1 : lineA, z);
        // On-curve points: open squares (filled with what is behind them), appearing round each contour as the grade turns.
        const n = c.on.length;
        for (let i = 0; i < n; i++) {
          const t = CYANOTYPE.from + ((CYANOTYPE.to - CYANOTYPE.from) * i) / n;
          const a = clamp((f - t) / 2) * (f < BOX ? 1 : 0.55);
          if (a <= 0.002) continue;
          const s = 7 * lerp(1.8, 1, clamp((f - t) / 2));
          const [px, py] = pin(c.on[i]);
          out.blue.push({ kind: 'rect', x: px, y: py, z, w: s, h: s, color: pointBg, alpha: a, outline: 1.25, outlineColor: red ? S.INK.red : lineInk });
        }
        if (inspect > 0.002) {
          for (const h of c.handles) {
            const [hx, hy] = pin(h.at);
            const [ax, ay] = pin(h.from);
            const [bx, by] = pin(h.to);
            out.blue.push(seg(ax, ay, hx, hy, 1, lineInk, 0.6 * inspect, z), seg(hx, hy, bx, by, 1, lineInk, 0.6 * inspect, z));
            out.blue.push(ring(hx, hy, 3.5, 1.25, lineInk, inspect, z));
          }
        }
      }
    }
    if (inspect > 0.002) construction(out, layer, f, plans, at, em, z, inspect, lineInk, adv, [x0, y0, x1, y1], m);
    // The scan note's sweep: a red line down the plane's sheet over 6 f, a soft trail behind it.
    const u = (f - EXPLODE[k]) / 6;
    if (u >= 0 && u < 1 && f < BOX) {
      const y = lerp(y1 + m, y0 - m, u);
      out.red.push(seg(x0 - m, y, x1 + m, y, 2.5, S.INK.red, 1 - 0.4 * u, z));
      out.light.push({ kind: 'rect', x: (x0 + x1) / 2, y: y + 14, z, w: x1 - x0 + 2 * m, h: 28, color: scaleRGB(S.INK.red, 0.35), alpha: 1 - u, soft: 14 });
    }
  }
}

/** Each plane's drafting when it is inspected: the em box and `1.000 em` (brackets), construction circles and `Ø 0.31 em` (eyes), the code points. */
function construction(out: SwitchFrame, layer: Layer, f: number, plans: FacePlans, at: (p: Pt) => [number, number], em: number, z: number, a: number, ink: RGB, adv: SwitchAdvances, box: readonly [number, number, number, number], m: number): void {
  const [x0, , x1] = box;
  const label = (text: string, x: number, y: number, align = 0): void => {
    out.blueText.push(...textGlyphs(text, { x, y, z, size: 20, color: ink, advance: adv.mono, align, alpha: a }));
  };
  if (layer === 'brackets') {
    for (const p of FACE_PARTS.filter((q) => q.layer === 'brackets')) {
      const g = plans.glyphs[p.ch];
      const [ex0, ey0] = at([p.x, -0.125]);
      const [ex1, ey1] = at([p.x + g.advance, 0.875]);
      dashed(out.blue, ex0, ey0, ex1, ey0, 1, ink, 0.7 * a, z);
      dashed(out.blue, ex0, ey1, ex1, ey1, 1, ink, 0.7 * a, z);
      dashed(out.blue, ex0, ey0, ex0, ey1, 1, ink, 0.7 * a, z);
      dashed(out.blue, ex1, ey0, ex1, ey1, 1, ink, 0.7 * a, z);
      // The baseline.
      const [bx0, by] = at([p.x - 0.05, 0]);
      const [bx1] = at([p.x + g.advance + 0.05, 0]);
      out.blue.push(seg(bx0, by, bx1, by, 1, ink, 0.5 * a, z));
    }
    const [dx, dy0] = at([-0.12, -0.125]);
    const [, dy1] = at([-0.12, 0.875]);
    dimension(out.blue, dx, dy0, dx, dy1, ink, a, z);
    label(SWITCH_TEXT.dims[0], dx - 10, (dy0 + dy1) / 2, 1);
    label(SWITCH_TEXT.tags[0], x0 - m + 4, box[1] - m - 22);
  } else if (layer === 'eyes') {
    const eye = plans.glyphs['•'];
    const r = (0.31 / 2) * em;
    for (const p of FACE_PARTS.filter((q) => q.layer === 'eyes')) {
      const [cx, cy] = at([p.x + (eye.box[0] + eye.box[2]) / 2, (eye.box[1] + eye.box[3]) / 2]);
      out.blue.push(ring(cx, cy, r, 1, ink, 0.8 * a, z), ring(cx, cy, r * 1.7, 1, ink, 0.35 * a, z));
      out.blue.push(seg(cx - r * 2, cy, cx + r * 2, cy, 1, ink, 0.5 * a, z), seg(cx, cy - r * 2, cx, cy + r * 2, 1, ink, 0.5 * a, z));
    }
    const left = FACE_PARTS.find((q) => q.part === 'eyeL')!;
    const [cx, cy] = at([left.x + (eye.box[0] + eye.box[2]) / 2, (eye.box[1] + eye.box[3]) / 2]);
    dimension(out.blue, cx - r, cy + r + 26, cx + r, cy + r + 26, ink, a, z);
    label(SWITCH_TEXT.dims[1], cx, cy + r + 48, 0.5);
    label(SWITCH_TEXT.tags[1], (x0 + x1) / 2, box[1] - m - 22, 0.5);
  } else {
    label(SWITCH_TEXT.tags[2], (x0 + x1) / 2, box[1] - m - 22, 0.5);
  }
}

/** The quarantine boxes (world): his (corners flying in, edges drawn, hatch, stamps, bulge, swell), the copies', and the debris of the failed ones. */
function boxes(out: SwitchFrame, f: number): void {
  const RED = S.INK.red;
  const ON = S.INK.onBlue;
  const mb = S.mainBox(f);
  if (f >= BOX - 6) {
    const z = S.switchCam(f).zoom;
    const hw = S.MAIN.hw;
    const hh = S.MAIN.hh;
    const [tx, ty] = mb.tremble;
    const b = mb.bulge / Math.SQRT2;
    // The four corners (TR carries the bulge), flying in from the screen's corners.
    const corners: [number, number, number, number][] = [
      [hw + b, hh + b, 1, 1],
      [-hw, hh, -1, 1],
      [-hw, -hh, -1, -1],
      [hw, -hh, 1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      const fx = lerp((dx * 960 * 0.97) / z, cx + dx * mb.swell, mb.corner) + tx;
      const fy = lerp((dy * 540 * 0.95) / z, cy + dy * mb.swell, mb.corner) + ty;
      corner(out.red, fx, fy, -dx, -dy, 64, 6, RED, 1, ON);
    }
    if (mb.edges > 0) {
      // Each edge grows from its corners to its middle, then bows out (the swell) and near TR (the bulge).
      const P = (u: number, v: number): [number, number] => {
        // (u, v) ∈ [-1, 1]² on the box's outline.
        const nx = Math.abs(u) === 1 ? u : 0;
        const ny = Math.abs(v) === 1 ? v : 0;
        const along = nx !== 0 ? v : u;
        const bow = mb.swell * Math.cos((Math.PI / 2) * along);
        const near = Math.max(0, 1 - Math.hypot(u - 1, v - 1) / 0.9);
        const bump = mb.bulge * near * near;
        return [u * hw + nx * bow + (bump / Math.SQRT2) * (nx || 0.6) + tx, v * hh + ny * bow + (bump / Math.SQRT2) * (ny || 0.6) + ty];
      };
      const N = 10;
      const edgesUV: [(t: number) => [number, number]][] = [[(t) => [-1 + 2 * t, 1]], [(t) => [1, 1 - 2 * t]], [(t) => [1 - 2 * t, -1]], [(t) => [-1, -1 + 2 * t]]];
      for (const [e] of edgesUV) {
        const pts = Array.from({ length: N + 1 }, (_, i) => P(...e(i / N)));
        const half = Math.round((N / 2) * mb.edges);
        for (const part of [pts.slice(0, half + 1), pts.slice(N - half)]) {
          poly(out.red, part, 4 + 4 * mb.weight, ON, 0.85);
          poly(out.red, part, 4 * mb.weight, RED, 1);
        }
      }
      hatch(out.red, tx, ty, hw + mb.swell * 0.6, hh + mb.swell * 0.6, 18, 2, RED, mb.hatch);
    }
    // The clang's shock: the box's outline thrown off it, growing and fading.
    const shock = S.shockAt(f);
    if (shock) {
      const [w, h] = [hw * shock.scale, hh * shock.scale];
      poly(out.red, [[-w, h], [w, h], [w, -h], [-w, -h], [-w, h]], 3 + 5 * shock.alpha, RED, shock.alpha);
    }
    if (mb.stamps > 0) {
      const s = 30 * lerp(1.6, 1, mb.stamps);
      for (const [cx, cy, dx, dy] of corners) out.redText.push({ ch: '▣', x: cx + dx * (mb.swell + 24) + tx, y: cy + dy * (mb.swell + 24) + ty, size: s, color: RED, alpha: mb.stamps });
    }
  }
  // The copies' boxes, and when they fail, their debris.
  for (const q of S.boxesAt(f)) {
    if (q.main) continue;
    if (q.fail <= 0) {
      const pts: [number, number][] = [
        [q.cx - q.hw, q.cy + q.hh],
        [q.cx + q.hw, q.cy + q.hh],
        [q.cx + q.hw, q.cy - q.hh],
        [q.cx - q.hw, q.cy - q.hh],
        [q.cx - q.hw, q.cy + q.hh],
      ];
      poly(out.red, pts, 6, ON, 0.85);
      poly(out.red, pts, 3, RED, q.snap);
      hatch(out.red, q.cx, q.cy, q.hw, q.hh, 14, 1.5, RED, 0.3 * q.snap);
      for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) corner(out.red, q.cx + dx * (q.hw + 10), q.cy + dy * (q.hh + 10), -dx, -dy, 22, 4, RED, q.snap);
    } else {
      const t = q.fail;
      const a = 1 - clamp(t / 10);
      if (a <= 0.002) continue;
      // Failing, it flashes white-hot on the snare (filled), its lines white-hot for 2 f, then fall away red.
      const flash = S.failFlash(f);
      if (flash > 0.002) out.red.push({ kind: 'rect', x: q.cx, y: q.cy, w: 2 * q.hw * (1 + 0.15 * (1 - flash)), h: 2 * q.hh * (1 + 0.15 * (1 - flash)), color: S.INK.crack, alpha: flash });
      const ink = mixRGB(RED, S.INK.crack, 1 - clamp(t / 2));
      const sides: [number, number, number, number][] = [
        [q.cx - q.hw, q.cy + q.hh, q.cx + q.hw, q.cy + q.hh],
        [q.cx + q.hw, q.cy + q.hh, q.cx + q.hw, q.cy - q.hh],
        [q.cx + q.hw, q.cy - q.hh, q.cx - q.hw, q.cy - q.hh],
        [q.cx - q.hw, q.cy - q.hh, q.cx - q.hw, q.cy + q.hh],
      ];
      for (const [i, [ax, ay, bx, by]] of sides.entries()) {
        const cut = 0.3 + 0.4 * hash(q.id, i, 3);
        for (const [s0, s1, j] of [[0, cut, 0], [cut, 1, 1]] as const) {
          const mx = lerp(ax, bx, (s0 + s1) / 2);
          const my = lerp(ay, by, (s0 + s1) / 2);
          const len = Math.hypot(bx - ax, by - ay) * (s1 - s0);
          const ang = Math.atan2(by - ay, bx - ax);
          const vx = Math.sign(mx - q.cx || 1) * (3 + 4 * hash(q.id, i, j, 5));
          const vy = 2 + 3 * hash(q.id, i, j, 7);
          const spin = 0.35 * (hash(q.id, i, j, 9) - 0.5);
          const x = mx + vx * t;
          const y = my + vy * t - 0.9 * t * t;
          const r = ang + spin * t;
          out.red.push(seg(x - (Math.cos(r) * len) / 2, y - (Math.sin(r) * len) / 2, x + (Math.cos(r) * len) / 2, y + (Math.sin(r) * len) / 2, 3, ink, a));
        }
      }
    }
  }
}

/** The light leaking through his box (world, additive): cracks along its bars, beams out of them, the box's inside and the whole frame lifting toward the burst. */
function light(out: SwitchFrame, f: number): void {
  const c = S.crackAt(f);
  if (c <= 0) return;
  const pulse = 1 + S.lightPulse(f) * 2;
  const mb = S.mainBox(f);
  const hw = S.MAIN.hw + mb.swell;
  const hh = S.MAIN.hh + mb.swell;
  const [tx, ty] = mb.tremble;
  const L = S.INK.crack;
  // The inside glows behind him; the whole frame lifts (the frame's mean climbs toward the burst's paper).
  out.light.push({ kind: 'ellipse', x: tx, y: ty, w: 2 * hw + 80, h: 2 * hh + 80, color: scaleRGB(L, 0.22 * c * pulse), alpha: 1, soft: 120 });
  out.light.push({ kind: 'ellipse', x: 0, y: 0, w: 2600, h: 1700, color: scaleRGB(L, 0.075 * c * c), alpha: 1, soft: 760 });
  for (const b of S.crackBeams(f)) {
    const { i, x, y, nx, ny, g } = b;
    // A zig-zag hairline across the bar.
    const len = 10 + 34 * g;
    const zig: [number, number][] = [];
    for (let j = 0; j <= 4; j++) {
      const t = (j / 4 - 0.5) * len;
      const w = (j % 2 ? 1 : -1) * 4 * hash(i, j, 43);
      zig.push([x + (ny !== 0 ? t : w), y + (nx !== 0 ? t : w)]);
    }
    poly(out.light, zig, 2 + c, scaleRGB(L, 0.5 + 0.8 * c), g);
    // The beam out of it: from the crack outward, away from his centre.
    out.light.push(seg(x, y, b.bx, b.by, b.wide, scaleRGB(L, 0.13 * c * g * pulse), 1, 0, b.wide / 2));
  }
}

/** His copies (world, drawn after the POV) and the flood (screen). */
function amber(out: SwitchFrame, f: number): void {
  const AMB = S.INK.amber;
  for (const c of S.SPILL_COPIES) {
    const at = S.copyAt(c, f);
    if (!at) continue;
    // On the flood each copy bursts into the flood (it swells and goes over 2 f).
    const burst = f >= FLOOD - SWAP_LEAD ? clamp((f - (FLOOD - SWAP_LEAD)) / 2) : 0;
    if (burst >= 1) continue;
    const em = (at.size * (1 + 0.4 * burst)) / FACE_ADVANCE;
    out.amber.push({ ch: '(•ω•)', x: at.x, y: at.y + PLACE * em, size: em, color: AMB, alpha: 1 - burst, stretch: at.stretch });
  }
  for (const p of S.floodAt(f)) {
    const em = p.size / FACE_ADVANCE;
    out.flood.push({ ch: '(•ω•)', x: sx(p.x), y: sy(p.y) + PLACE * em, size: em, color: AMB, alpha: p.alpha, rot: p.rot });
  }
}

/** The screen's layer: the reticle and its splits, DEFENDER v2.0 and ● REC, SIGNATURE MATCH, the big line, the drafting arcs, the title block. */
function hud(out: SwitchFrame, f: number, adv: SwitchAdvances, draft: 'curl' | 'mochi' = 'curl'): void {
  const RED = S.INK.red;
  const ON = S.INK.onBlue;
  const LINE = S.INK.line;
  const H = out.hud;
  const r = S.reticleAt(f);
  const [cx, cy] = [sx(r.centre[0]), sy(r.centre[1])];
  // The ring (over its #0B1650 keyline) and its ticks.
  H.push(ring(cx, cy, r.r + 2, r.stroke + 4, ON, 0.8), ring(cx, cy, r.r, r.stroke, RED, 1));
  for (let i = 0; i < r.ticks; i++) {
    const th = ((r.rot + i * 10) * Math.PI) / 180;
    const len = r.tick * (i % 3 === 0 ? 1.6 : 1);
    const r0 = lerp(r.r + 8, r.r - 8 - len, Math.min(1, r.inward));
    H.push(seg(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0, cx + Math.cos(th) * (r0 + len), cy + Math.sin(th) * (r0 + len), 2.5, RED, 1));
  }
  // The crosshair: the install bar's fold on 9.1, full width; its hairs retract to stubs off the ring over the first beat.
  const reach = lerp(1100, r.r + 110, clamp((f - T0) / 12) ** 0.6);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) H.push(seg(cx + dx * r.gap, cy + dy * r.gap, cx + dx * reach, cy + dy * reach, 2.5, RED, 0.9));
  // The brackets framing him (gone into the box's corners on 9.3).
  if (r.brackets.alpha > 0.002) {
    const { w, h, arm, alpha } = r.brackets;
    for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) corner(H, cx + (dx * w) / 2, cy + (dy * h) / 2, -dx, -dy, arm, 4, RED, alpha, ON);
  }
  // The split reticles, each locked round a copy's box.
  for (const s of S.splitReticles(f)) {
    if (s.main || s.alpha <= 0.002) continue;
    const x = sx(s.x);
    const y = sy(s.y);
    for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) corner(H, x + (dx * s.w) / 2, y + (dy * s.h) / 2, -dx, -dy, 18, 3, RED, s.alpha);
    H.push(seg(x - 6, y, x + 6, y, 1.5, RED, 0.7 * s.alpha), seg(x, y - 6, x, y + 6, 1.5, RED, 0.7 * s.alpha));
  }
  // DEFENDER v2.0, its avatar (clean again) and ● REC.
  const t = S.titleAt(f);
  if (t) {
    const size = t.size * t.scale;
    const tw = textWidth('DEFENDER v2.0', size, adv.display);
    out.hudText.display.push(...textGlyphs('DEFENDER v2.0', { x: sx(t.x), y: sy(t.y), size, color: RED, advance: adv.display, alpha: t.alpha }).map((g) => ({ ...g, outline: 2 / Math.max(size, 1), outlineColor: ON })));
    void tw;
    // Its avatar, clean again, on the REC line under the title; it flies down with the title into the slot's row 1 (drop2SwitchSlot.ts).
    out.hudText.jp.push(...textGlyphs(AVATAR.clean, { x: sx(t.avatar.x), y: sy(t.avatar.y), size: t.avatar.size, color: RED, advance: adv.jp, alpha: t.alpha }));
  }
  out.hudText.mono.push(...textGlyphs(SWITCH_TEXT.rec, { x: sx(70), y: sy(52), size: 28, color: RED, advance: adv.mono, alpha: S.recLit(f) ? 1 : 0.22 }));
  // SIGNATURE MATCH: the chip bottom right, its leader up to the ring.
  const chip = S.signatureChip(f);
  if (chip) {
    const size = 30;
    const full = textWidth(SIGNATURE.match, size, adv.mono);
    const right = 1880;
    const left = right - full - 32;
    const mid = 1030;
    H.push({ kind: 'rect', x: sx((left + right) / 2), y: sy(mid), w: right - left, h: 50, color: ON, alpha: 0.94, outline: 2, outlineColor: RED });
    const th = (70 * Math.PI) / 180;
    const lx = r.centre[0] + r.r * Math.cos(th);
    const ly = r.centre[1] + r.r * Math.sin(th);
    H.push(seg(sx(lx), sy(ly), sx(lx), sy(mid - 25), 2, RED, 1));
    H.push({ kind: 'ellipse', x: sx(lx), y: sy(ly), w: 9, h: 9, color: RED, alpha: 1 });
    out.hudText.mono.push(...textGlyphs(chip.text, { x: sx(left + 16), y: sy(mid), size, color: RED, advance: adv.mono }));
  }
  // The bytes as his box's label (rev 2): the chip's ten bytes stamped on the box's top edge, hung from it on two red tabs.
  const tag = S.sigTagAt(f);
  if (tag) {
    const k = tag.scale;
    const size = S.TAG.size * k;
    const w = textWidth(tag.text, size, adv.mono) + 2 * S.TAG.pad * k;
    const h = tag.h * k;
    H.push({ kind: 'rect', x: sx(tag.x), y: sy(tag.y), w, h, color: ON, alpha: 0.94 * tag.alpha, outline: 2, outlineColor: RED });
    for (const dx of [-1, 1]) {
      const x = tag.x + dx * (w / 2 - 22 * k);
      H.push(seg(sx(x), sy(tag.y + h / 2), sx(x), sy(tag.y + h / 2 + S.TAG.gap), 3, RED, tag.alpha));
    }
    out.hudText.mono.push(...textGlyphs(tag.text, { x: sx(tag.x), y: sy(tag.y), size, color: RED, advance: adv.mono, align: 0.5, alpha: tag.alpha }));
  }
  // The big line on its banner.
  const big = S.bigLine(f);
  if (big) {
    const size = 72 * (1 + 0.1 * big.pop);
    const w = textWidth(big.text, size, adv.display);
    const mid = 776;
    H.push({ kind: 'rect', x: 0, y: sy(mid), w: w + 48, h: 1.3 * size, color: ON, alpha: 0.88 });
    out.hudText.display.push(...textGlyphs(big.text, { x: 0, y: sy(mid), size, color: RED, advance: adv.display, align: 0.5, count: big.count }));
    // The cursor while the line is being typed or backspaced: a red block at its head.
    if (big.cursor) {
      const head = sx(960 - w / 2) + textWidth([...big.text].slice(0, big.count).join(''), size, adv.display);
      H.push({ kind: 'rect', x: head + 0.2 * size, y: sy(mid), w: 0.12 * size, h: 0.9 * size, color: RED, alpha: 1 });
    }
  }
  if (draft === 'mochi') mochiDraft(H, f, ON, LINE);
  else {
    // The drafting's construction: each arc's compass square (the golden rectangle's), ruled from the compass's centre round, just ahead of its arc.
    for (const [k, q] of S.CURL_SQUARES.entries()) {
      const p = S.squareDrawn(k, f);
      if (p <= 0) continue;
      const c = q.corners;
      for (let i = 0; i < 4; i++) {
        const [a0, b0] = c[i];
        const [a1, b1] = c[(i + 1) % 4];
        const u = clamp(4 * p - i);
        if (u <= 0) continue;
        H.push(seg(sx(a0), sy(b0), sx(lerp(a0, a1, u)), sy(lerp(b0, b1, u)), 1.5, LINE, 0.6));
      }
      // The square's diagonal from the compass's centre: the spiral's construction line.
      if (p >= 1) dashed(H, sx(c[0][0]), sy(c[0][1]), sx(c[2][0]), sy(c[2][1]), 1, LINE, 0.3, 0, 6, 6);
    }
    // The drafting: four compass arcs, a centre mark each, the compass's arm while it draws.
    for (const [k, a] of S.CURL_ARCS.entries()) {
      const d = S.arcDrawn(k, f);
      if (d <= 0) continue;
      const end = a.a0 + (a.a1 - a.a0) * d;
      const n = Math.max(2, Math.ceil((Math.abs(end - a.a0) * a.r) / 10));
      const pts = Array.from({ length: n + 1 }, (_, i) => {
        const th = a.a0 + ((end - a.a0) * i) / n;
        return [sx(a.centre[0] + a.r * Math.cos(th)), sy(a.centre[1] + a.r * Math.sin(th))] as [number, number];
      });
      const [mx, my] = [sx(a.centre[0]), sy(a.centre[1])];
      // The compass's whole circle, faint (construction), then the arc it keeps, bold.
      H.push(ring(mx, my, a.r, 1.25, LINE, 0.2 * Math.min(1, 3 * d)));
      // The arc it keeps, bold over a #0B1650 keyline (it reads through the leaking light), the pen's nib at its end while it draws.
      poly(H, pts, 10, ON, 0.55);
      poly(H, pts, 5, LINE, 1);
      if (d < 1) H.push({ kind: 'ellipse', x: pts[n][0], y: pts[n][1], w: 12, h: 12, color: S.INK.white, alpha: 1 });
      H.push(seg(mx - 10, my, mx + 10, my, 1.5, LINE, 0.9), seg(mx, my - 10, mx, my + 10, 1.5, LINE, 0.9), ring(mx, my, 5, 1.25, LINE, 0.9));
      if (d < 1) H.push(seg(mx, my, pts[n][0], pts[n][1], 1, LINE, 0.5));
    }
  }
  // The drafting's title block, bottom right.
  const tb = S.titleBlockAt(f);
  if (tb) {
    const [x0, y0, x1, y1] = [1500, 968, 1880, 1040];
    const p = tb.frame;
    const rect = (i: number, w: number, a: number): void => {
      const [a0, b0, a1, b1] = [x0 - i, y0 - i, x1 + i, y1 + i];
      H.push(seg(sx(a0), sy(b0), sx(lerp(a0, a1, p)), sy(b0), w, LINE, a), seg(sx(a1), sy(b1), sx(lerp(a1, a0, p)), sy(b1), w, LINE, a));
      H.push(seg(sx(a0), sy(b1), sx(a0), sy(lerp(b1, b0, p)), w, LINE, a), seg(sx(a1), sy(b0), sx(a1), sy(lerp(b0, b1, p)), w, LINE, a));
    };
    H.push({ kind: 'rect', x: sx((x0 + x1) / 2), y: sy((y0 + y1) / 2), w: (x1 - x0) * p, h: y1 - y0, color: S.groundAt(f), alpha: 0.9 * p });
    rect(0, 1.25, 1);
    rect(6, 2.5, 1);
    out.hudText.mono.push(...textGlyphs(SWITCH_TEXT.titleBlock, { x: sx((x0 + x1) / 2), y: sy((y0 + y1) / 2), size: 28, color: LINE, advance: adv.mono, align: 0.5, count: tb.count }));
  }
}

/**
 * The mochi's drafting (DROP2_THREADS.waveStyle 'mochi'): Defender rules the wave's six cubics with a spline pen instead of a compass, one
 * stroke a 32nd (S.ARCS' timing: the handles set just ahead of the stroke, as the compass squares were; the curve drawn over 3 frames,
 * the nib at its end), in the arcs' ink; on 10.1 the print's key block lands exactly on it.
 */
function mochiDraft(H: Shape[], f: number, ON: RGB, LINE: RGB): void {
  const segs = draftScreen();
  for (const [k, group] of DRAFT_GROUPS.entries()) {
    const p = S.squareDrawn(k, f);
    if (p > 0)
      for (const i of group) {
        const s = segs[i];
        // The two handles (end → control point), ruled out from the ends; a knob on each control point once it is set.
        for (const [a, b] of [
          [0, 2],
          [6, 4],
        ]) {
          const u = clamp(2 * p);
          if (u <= 0) continue;
          H.push(seg(sx(s[a]), sy(s[a + 1]), sx(lerp(s[a], s[b], u)), sy(lerp(s[a + 1], s[b + 1], u)), 1.5, LINE, 0.6));
          if (p >= 1) H.push(ring(sx(s[b]), sy(s[b + 1]), 6, 1.25, LINE, 0.9));
        }
        if (p >= 1) dashed(H, sx(s[2]), sy(s[3]), sx(s[4]), sy(s[5]), 1, LINE, 0.3, 0, 6, 6);
      }
    const d = S.arcDrawn(k, f);
    if (d <= 0) continue;
    // The stroke along the group's segments, as far as the pen has got.
    const pts: [number, number][] = [];
    const n = group.length;
    const reach = d * n;
    group.forEach((i, j) => {
      const part = clamp(reach - j);
      if (part <= 0) return;
      const m = Math.max(2, Math.ceil(40 * part));
      for (let q = j === 0 ? 0 : 1; q <= m; q++) {
        const [x, y] = bez(segs[i], (part * q) / m);
        pts.push([sx(x), sy(y)]);
      }
    });
    if (pts.length < 2) continue;
    poly(H, pts, 10, ON, 0.55);
    poly(H, pts, 5, LINE, 1);
    const [ex, ey] = pts[pts.length - 1];
    if (d < 1) H.push({ kind: 'ellipse', x: ex, y: ey, w: 12, h: 12, color: S.INK.white, alpha: 1 });
    // A tick on each end point (the spline's knots).
    for (const i of group)
      for (const a of [0, 6]) {
        const [kx, ky] = [sx(segs[i][a]), sy(segs[i][a + 1])];
        H.push(seg(kx - 8, ky, kx + 8, ky, 1.5, LINE, 0.9), seg(kx, ky - 8, kx, ky + 8, 1.5, LINE, 0.9));
      }
  }
}
