// Renderer C's screen overlay (cosmos 5–6; build sheet notes/bcos/sheet.md §7, §4.5–§4.6; design notes/cosmos3/final.md §7):
// pure. Everything drawn once per output frame after the Riso pass, clean of the print and of the motion blur: the Defender's red spot ink
// — his node's red ring and hex shield (flaring hexagon by hexagon where the wall's arcs strike, the red zap-backs), the scanline, the
// stamp `[SCAN] 0 THREATS ✓`, the reticle's 4-frame twitch onto the hero, the sandbox's red rim and his own small ring at his post, the
// red mono lines — each in-world red item placed with the output frame's camera and the rig's view applied (it stays glued through the
// punches on WALL, SCAN and SANDBOX); and the type: the level labels in tube outline (`10²⁴ m` up the left edge, rolling with the world;
// `10²⁶ m` on the right half, its exponent ticking until it lies down as ∞), the big counts (amber number, red word), `∞ THREATS`, and the
// party monitor (hud.ts's box, glyph for glyph) in its second window. Screen px at 1080p, origin at the centre, y up; colours linear.
import { INFINITY_SIGN, DEFENDER_TEXT, LEVEL_TYPE, MONITOR_TEXT, type Run, raisedRuns, scaleLabel, sciCount, threatWord } from '../content/cosmos.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import type { View } from '../engine/view.ts';
import { DEFENDER_LINES, EXPONENT, HORIZON, INFINITY, MATCH, MONITOR, MONITOR_WARN, RACK, RETICLE, SANDBOX, SCAN, STUTTER, WALL, WINK, stutterFrame, threatsAt } from '../score/cosmos.ts';
import { COLS, HUD, formatFriends, meter } from './hud.ts';
import { defenderRed, HEX } from './cosmosKit.ts';
import { HOLE, holePicture, sliceAt } from './cosmosHole.ts';
import { NODES, SHIELD_R, WALL_STRANDS, bolt, heroBob, impactI, launchL, nodeEm, nodeLook, nodeReach, project, scanY, scanned, webAnchors, webCamera } from './cosmosWeb.ts';
import { PALETTE } from '../worlds/terminal.ts';

export type OverlayAdvances = { display: Advance; mono: Advance; readout: Advance };
/** What the overlay draws at an output frame: dark (normal blend: backings, the stamp's box, the monitor) and light (added: red, type). */
export type OverlayFrame = {
  dark: Shape[];
  darkGlyphs: { display: Glyph[]; mono: Glyph[]; readout: Glyph[]; face: Glyph[] };
  light: Shape[];
  lightGlyphs: { display: Glyph[]; mono: Glyph[]; face: Glyph[] };
};

const AMBER = linear(HEX.AMBER, 1.5);
const CYAN_TUBE = linear(HEX.CYAN, 1.4);
const CYAN_CORE = linear('#E8FBFF', 1.6);
const BLACK: RGB = [0, 0, 0];
const KEYLINE: RGB = linear('#05040A');
/** The Defender's red as light (neon from the dial's half-way; drawn after the print, so it never prints). */
export const redAt = (frame: number, gain = 1.6): RGB => linear(defenderRed(frame), gain);

// ——— Placement under the rig ————————————————————————————————————————————————————————————————————————————————————————————————

/** Where an in-world point (screen px before the rig) shows once the rig's view moves the picture: zoom about the centre, roll, offset. */
export function rigPoint(v: View, x: number, y: number): [number, number] {
  const c = Math.cos(v.roll);
  const s = Math.sin(v.roll);
  return [v.zoom * (c * x - s * y) + v.x, v.zoom * (s * x + c * y) + v.y];
}

const seg = (x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha = 1, soft = 0): Shape => ({
  kind: 'segment',
  x: (x0 + x1) / 2,
  y: (y0 + y1) / 2,
  w: Math.hypot(x1 - x0, y1 - y0) + w,
  h: w,
  rot: Math.atan2(y1 - y0, x1 - x0),
  color,
  alpha,
  ...(soft > 0 ? { soft } : {}),
});

/** A red ring (a 3 px line, a faint glow) at (x, y) of radius r, under the rig. */
function redRing(v: View, x: number, y: number, r: number, color: RGB, w = 3): Shape[] {
  const [X, Y] = rigPoint(v, x, y);
  const R = r * v.zoom;
  return [
    { kind: 'ring', x: X, y: Y, w: 2 * R, h: 2 * R, r: w, color },
    { kind: 'ring', x: X, y: Y, w: 2 * (R + 8), h: 2 * (R + 8), r: 16, color: scaleRGB(color, 0.12), soft: 8 },
  ];
}

// ——— Type: a line of runs (raised exponents at 0.55 em on the cap line), turned about its anchor ——————————————————————————————————

export type SetOpts = { x: number; y: number; size: number; advance: Advance; align?: number; rot?: number; color: (run: Run, i: number) => RGB; outline?: number; outlineColor?: RGB; alpha?: number; tracking?: number };

/** Glyphs for runs of type anchored at (x, y) (the baseline's middle line), `align` 0 left … 1 right, turned by `rot` about the anchor. */
export function setRuns(runs: readonly Run[], o: SetOpts): Glyph[] {
  const sizes = runs.map((r) => (r.raised ? 0.55 : 1) * o.size);
  const widths = runs.map((r, i) => typeset(r.text, o.advance, o.tracking ?? 0).width * sizes[i]);
  const total = widths.reduce((a, b) => a + b, 0) + o.size * 0.02 * Math.max(0, runs.length - 1);
  let pen = -(o.align ?? 0) * total;
  const c = Math.cos(o.rot ?? 0);
  const s = Math.sin(o.rot ?? 0);
  const out: Glyph[] = [];
  runs.forEach((r, i) => {
    const line = typeset(r.text, o.advance, o.tracking ?? 0);
    const lift = r.raised ? o.size * 0.3 : 0;
    for (const ch of line.chars) {
      if (ch.ch === ' ') continue;
      const lx = pen + ch.x * sizes[i];
      const ly = lift;
      out.push({ ch: ch.ch, x: o.x + c * lx - s * ly, y: o.y + s * lx + c * ly, size: sizes[i], color: o.color(r, i), rot: o.rot ?? 0, ...(o.alpha !== undefined ? { alpha: o.alpha } : {}), ...(o.outline ? { outline: o.outline, outlineColor: o.outlineColor } : {}) });
    }
    pen += widths[i] + o.size * 0.02;
  });
  return out;
}

/** The label in tube outline: a wide soft glow line and a thin hot core line round each letter (the fill adds no light). */
function tubeLabel(runs: readonly Run[], o: Omit<SetOpts, 'color' | 'outline' | 'outlineColor'> & { tube?: RGB; core?: RGB }): Glyph[] {
  const glow = setRuns(runs, { ...o, color: () => BLACK, outline: 0.075, outlineColor: scaleRGB(o.tube ?? CYAN_TUBE, 0.35) });
  const core = setRuns(runs, { ...o, color: () => BLACK, outline: 0.026, outlineColor: o.core ?? CYAN_CORE });
  return [...glow, ...core];
}

/** The scale exponent the odometer shows at output frame `out` (score EXPONENT), and how far its digits have rolled toward the next (0–1). */
export function exponentAt(out: number): { e: number; roll: number } {
  let row = EXPONENT[0];
  for (const x of EXPONENT) if (out >= x.from) row = x;
  if (out >= row.to || row.a === row.b) return { e: out >= row.to ? row.b : row.a, roll: 0 };
  const steps = Math.abs(row.b - row.a);
  // The horizon's row ticks one value a 16th (26 · 27 · 28 · 29) until ∞ takes over.
  if (row.from === HORIZON.at) return { e: Math.min(row.b, row.a + Math.floor((out - row.from) / 6)), roll: 0 };
  const u = clamp((out - row.from) / (row.to - row.from)) * steps;
  const k = Math.min(steps, Math.floor(u));
  return { e: row.a + Math.sign(row.b - row.a) * k, roll: k < steps ? u - k : 0 };
}

/** A count as runs: an amber number (raised exponent) and a red THREAT(S). */
function countRuns(n: number): Run[] {
  const num = Number.isFinite(n) ? raisedRuns(sciCount(n)) : [{ text: INFINITY_SIGN, raised: false }];
  return [...num, { text: ` ${threatWord(n)}`, raised: false }];
}

// ——— Bar 5's overlay: the red shield, the scan, the stamp, the reticle; the label and the counter ——————————————————————————————

/** The hexagons of the shield (centres in px from its middle, flat grid) and the ones the wall's three arcs strike. */
export const SHIELD_HEXES: readonly { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  const a = 17;
  for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) {
    const x = (i + (j % 2 ? 0.5 : 0)) * a * Math.sqrt(3);
    const y = j * a * 1.5;
    if (Math.hypot(x, y) < SHIELD_R - 8) out.push({ x, y });
  }
  return out;
})();

function webOverlay(out: number, v: View, adv: OverlayAdvances, o: OverlayFrame): void {
  const red = redAt(out);
  const anchors = webAnchors(out);
  // The Defender's node: his red ring and his hex shield, a sphere of hexagons (bulged toward its rim), 25 % until hit.
  if (anchors.defender) {
    const [dx, dy] = anchors.defender;
    o.light.push(...redRing(v, dx, dy, 70, red));
    const hit = out - WALL;
    const impacts = WALL_STRANDS.map((s) => {
      const p = webAnchorOf(out, s);
      return p ? Math.atan2(p[1] - dy, p[0] - dx) : Math.PI * (0.7 + 0.3 * s);
    });
    for (const h of SHIELD_HEXES) {
      const d = Math.hypot(h.x, h.y) / SHIELD_R;
      const bulge = Math.sin((d * Math.PI) / 2) / Math.max(d, 1e-3);
      const hx = h.x * bulge * 0.92;
      const hy = h.y * bulge * 0.92;
      const sz = 15 * (1 - 0.45 * d * d);
      let a = 0.25 * (1 - 0.5 * d);
      if (hit >= 0 && hit < 14) {
        // Each strike flares the hexagons near its point on the rim, then a wave of them across the sphere.
        for (const an of impacts) {
          const ix = SHIELD_R * Math.cos(an);
          const iy = SHIELD_R * Math.sin(an);
          const near = Math.hypot(hx - ix, hy - iy);
          const front = hit * 22;
          a = Math.max(a, (1 - hit / 14) * Math.exp(-((near - front) ** 2) / 900) * 1.2, near < 40 ? (1 - hit / 10) * 1.4 : 0);
        }
      }
      // A struck hexagon burns: a red glow fills it as the outline flares.
      if (a > 0.45) {
        const [cx, cy] = rigPoint(v, dx + hx, dy + hy);
        o.light.push({ kind: 'ellipse', x: cx, y: cy, w: 1.9 * sz * v.zoom, h: 1.9 * sz * v.zoom, color: scaleRGB(red, 0.55), alpha: clamp(a - 0.45), soft: sz * 0.7 * v.zoom });
      }
      for (let k = 0; k < 6; k++) {
        const t0 = (k * Math.PI) / 3 + Math.PI / 6;
        const t1 = t0 + Math.PI / 3;
        const [x0, y0] = rigPoint(v, dx + hx + sz * Math.cos(t0), dy + hy + sz * Math.sin(t0));
        const [x1, y1] = rigPoint(v, dx + hx + sz * Math.cos(t1), dy + hy + sz * Math.sin(t1));
        o.light.push(seg(x0, y0, x1, y1, (a > 0.5 ? 3 : 2.2) * v.zoom, red, clamp(a)));
      }
    }
    // The strikes: a red star at each impact and the sphere's rim flaring, 8 f.
    if (hit >= 0 && hit < 8) {
      const g = 1 - hit / 8;
      o.light.push(...redRing(v, dx, dy, SHIELD_R, scaleRGB(red, 0.4 + 0.8 * g), 2 + 2 * g));
      for (const an of impacts) {
        const ix = dx + SHIELD_R * Math.cos(an);
        const iy = dy + SHIELD_R * Math.sin(an);
        for (let k = 0; k < 4; k++) {
          const q = an + (k * Math.PI) / 2 + Math.PI / 4;
          const len = (40 + 80 * g) * (k % 2 ? 0.55 : 1);
          const [x0, y0] = rigPoint(v, ix, iy);
          const [x1, y1] = rigPoint(v, ix + len * Math.cos(q), iy + len * Math.sin(q));
          o.light.push(seg(x0, y0, x1, y1, 3, scaleRGB(red, 1.4), g), seg(x0, y0, x1, y1, 14, scaleRGB(red, 0.5), 0.5 * g, 6));
        }
      }
    }
    // The zap-backs: red bolts thrown back along the strands, their heads running all the way to the node the arc came from in 4 f.
    if (hit >= 0 && hit < 7) {
      WALL_STRANDS.forEach((s, k) => {
        const p = webAnchorOf(out, s);
        const an = impacts[k];
        const ix = dx + SHIELD_R * Math.cos(an);
        const iy = dy + SHIELD_R * Math.sin(an);
        const reach = 0.35 + 0.65 * Math.min(1, launchL(hit + 1));
        const tx = p ? lerp(ix, p[0], reach) : ix + 300 * reach * Math.cos(an);
        const ty = p ? lerp(iy, p[1], reach) : iy + 300 * reach * Math.sin(an);
        const { trunk, branches } = bolt([ix, iy], [tx, ty], 97 * k + hit);
        const g = hit < 4 ? 1 : 1 - (hit - 3) / 4;
        for (const line of [trunk, ...branches]) {
          for (let i = 1; i < line.length; i++) {
            const [x0, y0] = rigPoint(v, line[i - 1][0], line[i - 1][1]);
            const [x1, y1] = rigPoint(v, line[i][0], line[i][1]);
            o.light.push(seg(x0, y0, x1, y1, 3, scaleRGB(red, 1.3), g), seg(x0, y0, x1, y1, 16, red, 0.28 * g, 7));
          }
        }
        // The head: a red spark where the zap is running.
        const [hx, hy] = rigPoint(v, tx, ty);
        if (hit < 5) o.light.push({ kind: 'ellipse', x: hx, y: hy, w: 34, h: 34, color: scaleRGB(red, 1.2), alpha: g, soft: 15 });
      });
    }
    // THE JOKE: the red stamp beside his node at −4°, slammed in (L) on the hat, until the sandbox opens.
    const stamp = DEFENDER_LINES.find((l) => l.text === 'stamp')!;
    if (out >= stamp.from && out < stamp.to) {
      const k = 1 + 0.4 * (1 - Math.min(1, launchL(out - stamp.from)));
      const size = 26 * k * v.zoom;
      const [sx, sy] = rigPoint(v, dx + 92, dy + 78);
      const rot = (-4 * Math.PI) / 180 + v.roll;
      const text = DEFENDER_TEXT.stamp;
      const w = typeset(text, adv.mono).width * size;
      const cx = sx + Math.cos(rot) * (w / 2);
      const cy = sy + Math.sin(rot) * (w / 2);
      o.dark.push({ kind: 'rect', x: cx, y: cy, w: w + 24 * k, h: size * 1.7, rot, color: linear('#140404'), alpha: 0.85 });
      o.light.push({ kind: 'rect', x: cx, y: cy, w: w + 24 * k, h: size * 1.7, rot, color: [0, 0, 0], alpha: 1, outline: 2.2, outlineColor: red });
      o.lightGlyphs.mono.push(...setRuns([{ text, raised: false }], { x: sx, y: sy, size, advance: adv.mono, rot, color: () => red }));
    }
  }
  // His node's face, a clean neon tube over the print (the bead the eye holds through the roll and the drift). While he plays dead it is
  // not drawn at all: the picture shows his disguise, a dim cyan host face printed like every other (nodeLook), and nothing of his amber
  // is left on screen for the scan to find; on the relight he is back, winking, and innocent again as the reticle twitches onto him.
  if (anchors.hero) {
    const cam = webCamera(out);
    const hp = project(cam, NODES[0].p);
    if (hp && Math.abs(hp.x) < 1100 && Math.abs(hp.y) < 640) {
      const em = nodeEm(NODES[0], hp.k);
      const look = nodeLook(NODES[0], out, hp.y + heroBob(out) + nodeReach(em));
      if (!look.dead) neonFace(o, v, look.face, hp.x, hp.y + heroBob(out), em, scaleRGB(AMBER, 1.25));
    }
  }
  // THE SCAN: one red line sweeping top → bottom in 12 f, a 40 px soft trail behind it.
  if (out >= SCAN.from && out < SCAN.to) {
    const y = scanY(out);
    const [x0, y0] = rigPoint(v, -1100, y);
    const [x1, y1] = rigPoint(v, 1100, y);
    o.light.push(seg(x0, y0, x1, y1, 3, red), seg(x0, y0 + 20, x1, y1 + 20, 40, scaleRGB(red, 0.35), 1, 20));
  }
  // THE HINT: his reticle ⊕ twitches onto the hero's node for 4 f.
  if (out >= RETICLE && out < RETICLE + 4 && anchors.hero) {
    const [hx, hy] = anchors.hero;
    const jit = out === RETICLE ? 6 : 0;
    o.light.push(...redRing(v, hx + jit, hy - jit, 46, red));
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [x0, y0] = rigPoint(v, hx + jit + ux * 36, hy - jit + uy * 36);
      const [x1, y1] = rigPoint(v, hx + jit + ux * 60, hy - jit + uy * 60);
      o.light.push(seg(x0, y0, x1, y1, 3, red));
    }
  }
  // The label: `10²⁴ m` up the left edge in cyan tube outline, in the world (it rolls with it to the top, reading left → right).
  const { e } = exponentAt(out);
  const land = 1 + 0.06 * (1 - Math.min(1, launchL(out - MATCH)));
  const rot = Math.PI / 2 - anchors.roll;
  // It rolls with the world about the centre and slides right as it does, so on top it clears the hero for the reticle’s hint.
  const [rx0, ly] = rollAbout(-392, 0, anchors.roll);
  const lx = rx0 + 300 * (anchors.roll / (Math.PI / 2));
  const label = raisedRuns(scaleLabel(e));
  const g = labelGain(out);
  o.lightGlyphs.display.push(...tubeLabel(label, { x: lx, y: ly, size: 300 * land, advance: adv.display, align: 0.5, rot, ...labelTube(g) }));
  const [cx, cy] = rollAbout(-420, -470, anchors.roll);
  const cap = `${LEVEL_TYPE.web.caption} · ${LEVEL_TYPE.web.legend}`;
  o.lightGlyphs.mono.push(...setRuns([{ text: cap, raised: false }], { x: cx, y: cy, size: 22, advance: adv.mono, rot: -anchors.roll, color: () => linear(HEX.CYAN, 1.2 * g) }));
  // The counter: lower-left, slammed on 5.3& and on the relight's 2.0×10³⁶, climbing the whole time — its number plays dead too as the
  // line passes it (dim cyan, still climbing), and comes back amber with the slam.
  if (out >= RACK.to && out < HORIZON.at) {
    const slamAt = out >= WINK ? WINK : RACK.to;
    const k = 1 + 0.3 * (1 - Math.min(1, launchL(out - slamAt)));
    const runs = countRuns(threatsAt(out));
    const opts = { x: COUNTER.x, y: COUNTER.y, size: 120 * k, advance: adv.display, align: 0 };
    o.darkGlyphs.display.push(...setRuns(runs, { ...opts, color: () => KEYLINE, outline: 0.09, outlineColor: KEYLINE }));
    const lit = setRuns(runs, { ...opts, color: (r, i) => (i === runs.length - 1 ? redAt(out) : AMBER) });
    o.lightGlyphs.display.push(...lit.map((gl) => (gl.color === AMBER && scanned(out, gl.y + 0.5 * gl.size) ? { ...gl, color: DEAD_COUNT } : gl)));
  }
}

/** The counter's anchor (its glyphs' middle line, 1080p px, y up): lower-left, its slam's ×1.3 still clear of the bottom edge. */
export const COUNTER = { x: -900, y: -420 } as const;
/** The counter's number while it plays dead under the scan: 35 % of its light, in cyan. */
const DEAD_COUNT: RGB = linear(HEX.CYAN, 1.2 * 0.35);
/**
 * The level label's light: full on its landing (cosmos 5.1, L), easing to 70 % once it has landed (5.1& → 5.2) and held there through the
 * horizon — it is the scale, not the subject (the lightning is; then the disc). `labelGain` 1 → LABEL_HOLD; at the hold the tube's glow
 * is 70 % of its landing light and its hot core peaks at 0.8 (under the display's clip and near the bloom's threshold: 70 % of the clipped
 * white it lands as, not a white that still clips).
 */
export const LABEL_HOLD = 0.7;
export const labelGain = (out: number): number => 1 - (1 - LABEL_HOLD) * smoothstep(MATCH + 12, MATCH + 24, out);
const CORE_HOLD = 0.8 / Math.max(...CYAN_CORE);
/** The label's tube colours at gain `g` (labelGain: 1 on landing … LABEL_HOLD held). */
export function labelTube(g: number): { tube: RGB; core: RGB } {
  const u = (1 - g) / (1 - LABEL_HOLD);
  return { tube: scaleRGB(CYAN_TUBE, g), core: scaleRGB(CYAN_CORE, 1 + (CORE_HOLD - 1) * u) };
}

/** A face as a clean neon tube over the print, under the rig: a dark keyline round it (so it reads over the brightest light), a soft glow
 * line, the tube with its white-hot middle. */
function neonFace(o: OverlayFrame, v: View, text: string, x: number, y: number, em: number, color: RGB, alpha = 1): void {
  const [X, Y] = rigPoint(v, x, y);
  const size = em * v.zoom;
  o.darkGlyphs.face.push({ ch: text, x: X, y: Y, size, color: KEYLINE, alpha: 0.9 * alpha, outline: 0.09, outlineColor: KEYLINE, rot: v.roll });
  o.lightGlyphs.face.push({ ch: text, x: X, y: Y, size, color: BLACK, alpha, outline: 0.07, outlineColor: scaleRGB(color, 0.3), rot: v.roll }, { ch: text, x: X, y: Y, size, color, alpha, tube: 0.02, rot: v.roll });
}

/** A screen point turned clockwise by the world's roll about the frame centre (his node, where the roll is anchored). */
function rollAbout(x: number, y: number, roll: number): [number, number] {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return [x * c + y * s, -x * s + y * c];
}

/** Where node `i` is on screen at output frame `out` (the pinhole camera), or null. */
function webAnchorOf(out: number, i: number): [number, number] | null {
  const a = webAnchors(out, i);
  return a.node;
}

// ——— Bar 6's overlay: the sandbox's rim, his post, the red lines; the label, ∞ THREATS, the monitor ————————————————————————————————

/** The party monitor's second window (score MONITOR[1]) as the approved box draws it (src/shots/hud.ts: frame, rows, gauges). */
export function monitorRows(out: number): { frame: { col: number; text: string }[]; text: string; col: number; color: RGB }[] | null {
  const w = MONITOR[1];
  if (out < w.from || out >= w.to) return null;
  const GREEN = linear(PALETTE.green, 1.4);
  const DIM = linear(PALETTE.text, 0.55);
  const AMB = linear(PALETTE.amber, 1.5);
  const title = ' kaomoji.exe :: party monitor ';
  const side = (text: string, color: RGB) => ({ frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text, col: 2, color });
  const pct = (n: number) => `${String(n).padStart(3)}%`;
  const rows = [
    { frame: [{ col: 0, text: '╔═' + title + '═'.repeat(COLS - 3 - title.length) + '╗' }], text: '', col: 0, color: DIM },
    side(`friends  ${formatFriends(Infinity)}`, GREEN),
    side(`memory   ${meter(MONITOR_TEXT.memory)} ${pct(MONITOR_TEXT.memory)}`, MONITOR_TEXT.memory > 90 ? AMB : GREEN),
    side(`cpu      ${meter(MONITOR_TEXT.cpu)} ${pct(MONITOR_TEXT.cpu)}`, MONITOR_TEXT.cpu >= 100 ? AMB : GREEN),
    { frame: [{ col: 0, text: '╚' + '═'.repeat(COLS - 2) + '╝' }], text: '', col: 0, color: DIM },
  ];
  const content = stutterFrame(out);
  if (content >= MONITOR_WARN.from) rows.push({ frame: [], text: MONITOR_TEXT.warn, col: 2, color: AMB });
  return rows;
}

function monitorOverlay(out: number, adv: OverlayAdvances, o: OverlayFrame): void {
  const rows = monitorRows(out);
  if (!rows) return;
  const w = MONITOR[1];
  // Inside the stutter the box shows its content frame, like the picture; it closes on its window's end (output frame).
  const content = stutterFrame(out);
  const typed = clamp((content - w.from) / 8);
  const shown = smoothstep(-1, 1, content - w.from) * (1 - smoothstep(w.to - 3, w.to, out));
  const left = -960 + HUD.margin;
  const cell = adv.readout('═') * HUD.size;
  const bottom = -540 + HUD.margin;
  const top = bottom + HUD.pitch * rows.length;
  o.dark.push({ kind: 'rect', x: left - 6 + (COLS * cell + 12) / 2, y: (top + bottom) / 2, w: COLS * cell + 12, h: top - bottom + 8, color: linear('#06091C'), alpha: 0.62 * shown });
  const DIM = linear(PALETTE.text, 0.55);
  const put = (text: string, col: number, y: number, color: RGB, count: number) => {
    [...text].slice(0, count).forEach((ch, i) => {
      if (ch.trim() !== '') o.darkGlyphs.readout.push({ ch, x: left + (col + i + 0.5) * cell, y, size: HUD.size, color, alpha: shown });
    });
  };
  rows.forEach((r, i) => {
    // The warning blinks on the sixteenths: three frames on, three off.
    if (r.frame.length === 0 && Math.floor((content - MONITOR_WARN.from) / 3) % 2 === 1) return;
    const y = top - i * HUD.pitch - HUD.pitch / 2;
    const count = Math.ceil(typed * COLS * 1.5);
    for (const f of r.frame) put(f.text, f.col, y, DIM, Math.max(0, count - f.col));
    put(r.text, r.col, y, r.color, Math.max(0, count - r.col));
  });
}

function holeOverlay(out: number, v: View, adv: OverlayAdvances, o: OverlayFrame): void {
  const pic = holePicture(out);
  const red = redAt(out);
  if (pic.point) return;
  // The sandbox's red rim round the void, and his own small ring at his post (both scale and turn with the stutter's content).
  if (pic.rim > 0.5) o.light.push(...redRing(v, 0, 0, pic.rim / v.zoom, red));
  if (pic.defender) o.light.push(...redRing(v, pic.defender.x, pic.defender.y, (HOLE.postRing * pic.cam.zoom) / v.zoom, red));
  // Him riding the disc and the Defender at his post, as clean neon tubes over the print: the one face the eye follows into the hole,
  // and the operator watching it.
  if (pic.hero) neonFace(o, v, pic.hero.face, pic.hero.x, pic.hero.y, pic.hero.em, scaleRGB(AMBER, 1.25));
  if (pic.defender) neonFace(o, v, pic.defender.face, pic.defender.x, pic.defender.y, pic.defender.em, linear('#FFF1DC', 1.5), pic.defender.alpha);
  // The operator's red mono under the vortex: `[DEFENDER] sandbox ▶` from the suck, its verdict `sandbox ✓` on the last slice but one.
  const line = DEFENDER_LINES.find((l) => l.text !== 'stamp' && out >= l.from && out < l.to);
  if (line) {
    const slice = sliceAt(out);
    const rd = slice >= 0 ? pic.cam.zoom * HOLE.shrinkTo : pic.disc.rout * pic.cam.zoom;
    const y = -Math.min(470, rd * Math.cos(pic.cam.tilt) * 0.95 + 56);
    // The operator types his command: the whole line in 6 f from its first frame (his verdict `sandbox ✓` lands whole: it has 3 f).
    const full = [...DEFENDER_TEXT[line.text]];
    const text = line.text === 'done' ? full.join('') : full.slice(0, Math.ceil((full.length * (out - line.from + 1)) / 6)).join('');
    const k = 1 + 0.12 * (1 - Math.min(1, launchL(out - line.from)));
    const [x, yy] = rigPoint(v, 0, y);
    o.lightGlyphs.mono.push(...setRuns([{ text, raised: false }], { x, y: yy, size: 24 * k, advance: adv.mono, align: 0.5, color: () => red }));
  }
  // (The web's counter is gone on the twist's drum frame — cut with the crash, never a cropped frame at the bottom edge; ∞ THREATS is the
  // horizon's count.)
  // The label on the right half until the stutter: `10²⁶ m`, the exponent ticking on the 16ths, then ∞ lying down on the clap — at the
  // web's held 70 %.
  const tube = labelTube(LABEL_HOLD);
  if (out < STUTTER.from) {
    const land = 1 + 0.08 * (1 - Math.min(1, launchL(out - HORIZON.at)));
    const size = 240 * land;
    if (out < INFINITY) {
      const { e } = exponentAt(out);
      const runs = raisedRuns(scaleLabel(e));
      // Carried over from the web's top (L): the label swings from where the roll left it to the right half as the disc twists in.
      const u = Math.min(1.02, launchL(out - HORIZON.at + 1));
      const sz = lerp(300, size, u);
      const width = (s: number) => runs.reduce((w, r) => w + typeset(r.text, adv.display).width * (r.raised ? 0.55 : 1) * s, 0);
      const cx = lerp(300, 900 - width(size) / 2, u);
      const cy = lerp(392, 270, u);
      const glyphs = tubeLabel(runs, { x: cx, y: cy, size: sz, advance: adv.display, align: 0.5, ...tube });
      o.lightGlyphs.display.push(...(out < TOPPLE ? glyphs : topple(glyphs, sz, impactI(out - TOPPLE + 1, INFINITY - TOPPLE + 1))));
    } else {
      // ∞ lands lying on its side on the clap, whole on the drum frame with ∞ THREATS (the exponent toppled into it), a 2 % bounce.
      const fall = impactI(out - TOPPLE + 1, INFINITY - TOPPLE + 1);
      const base = [{ text: '10', raised: false }];
      const tail = [{ text: ' m', raised: false }];
      const w10 = typeset('10', adv.display).width * size;
      const wm = typeset(' m', adv.display).width * size;
      const winf = typeset(INFINITY_SIGN, adv.display).width * size * 0.55;
      const left = 900 - (w10 + winf + wm + size * 0.04);
      o.lightGlyphs.display.push(...tubeLabel(base, { x: left, y: 270, size, advance: adv.display, align: 0, ...tube }));
      o.lightGlyphs.display.push(...tubeLabel([{ text: INFINITY_SIGN, raised: false }], { x: left + w10 + size * 0.02 + winf / 2, y: 270 + size * 0.3, size: size * 0.55, advance: adv.display, align: 0.5, rot: (Math.PI / 2) * (1 - fall), ...tube }));
      o.lightGlyphs.display.push(...tubeLabel(tail, { x: left + w10 + winf + size * 0.04, y: 270, size, advance: adv.display, align: 0, ...tube }));
    }
    o.lightGlyphs.mono.push(...setRuns([{ text: LEVEL_TYPE.horizon.legend, raised: false }], { x: 900, y: 270 - size * 0.62, size: 22, advance: adv.mono, align: 1, color: () => linear(HEX.CYAN, 1.2 * LABEL_HOLD) }));
  }
  // ∞ THREATS: huge, in tube outline, cropped by the right edge: the ∞ amber, the word red; slammed on 6.2. On the suck the sandbox
  // swallows it: letter by letter, nearest the hole first, each spirals in (accelerating, turning with the disc, shrinking and smearing
  // out) and is gone over the horizon by SUCKED.
  if (out >= INFINITY && out < SUCKED) {
    const k = 1 + 0.3 * (1 - Math.min(1, launchL(out - INFINITY)));
    const runs = countRuns(Infinity);
    const opts = { x: 1030, y: -400, size: 300 * k, advance: adv.display, align: 1 };
    const glyphs = [
      ...setRuns(runs, { ...opts, color: () => BLACK, outline: 0.07, outlineColor: scaleRGB(AMBER, 0.3) }).map((g, i) => (i === 0 ? g : { ...g, outlineColor: scaleRGB(red, 0.35) })),
      ...setRuns(runs, { ...opts, color: () => BLACK, outline: 0.022, outlineColor: AMBER }).map((g, i) => (i === 0 ? g : { ...g, outlineColor: red })),
    ];
    o.lightGlyphs.display.push(...(out < SANDBOX ? glyphs : suckGlyphs(glyphs, out)));
  }
}

/** The exponent gives up: from here it topples over (I, accelerating) to land as ∞ on the clap. */
export const TOPPLE = INFINITY - 4;

/**
 * The exponent toppling (`u` 0 → 1, the impact's progress): the label's raised glyphs (the exponent's, under 0.6 of the label's
 * `size`) turn clockwise about their bottom-right corner, up to 80°, sinking as they go; the rest of the label stays.
 */
export function topple(glyphs: readonly Glyph[], size: number, u: number): Glyph[] {
  const raised = glyphs.filter((g) => g.size < 0.6 * size);
  if (raised.length === 0) return [...glyphs];
  const px = Math.max(...raised.map((g) => g.x)) + 0.3 * raised[0].size;
  const py = Math.min(...raised.map((g) => g.y)) - 0.35 * raised[0].size;
  const a = -(80 * Math.PI) / 180 * u;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return glyphs.map((g) => {
    if (g.size >= 0.6 * size) return g;
    const dx = g.x - px;
    const dy = g.y - py;
    return { ...g, x: px + c * dx - s * dy, y: py + s * dx + c * dy - 0.12 * size * u, rot: (g.rot ?? 0) + a };
  });
}
/** When the suck has swallowed the last letter of `∞ THREATS` (the sandbox's first 16 f). */
export const SUCKED = SANDBOX + 16;
/** The suck's progress for a letter `t` f after its own start: 0 → 1, accelerating into the horizon over 10 f. */
export const suckU = (t: number): number => clamp(t / 10) ** 2.2;

/**
 * The suck at output frame `out`: each letter (nearest the hole first, 0.8 f apart) spirals into (0, 0) along `suckU`, turning 100°
 * clockwise with the disc, shrinking and stretching, fading over its last stretch. The overlay is one sample a frame, so the flight is
 * averaged over 6 instants of the frame's shutter (light adds: the copies sum to the motion-blurred letter, never a printed double).
 */
export function suckGlyphs(glyphs: readonly Glyph[], out: number): Glyph[] {
  // A letter's glow and core share their rank (the same character at the same place).
  const keys = glyphs.map((g) => `${Math.round(g.x)}:${Math.round(g.y)}`);
  const places = [...new Set(keys)].sort((a, b) => {
    const [ax, ay] = a.split(':').map(Number);
    const [bx, by] = b.split(':').map(Number);
    return Math.hypot(ax, ay) - Math.hypot(bx, by);
  });
  const N = 6;
  const res: Glyph[] = [];
  glyphs.forEach((g, i) => {
    const rank = places.indexOf(keys[i]);
    const r0 = Math.hypot(g.x, g.y);
    const a0 = Math.atan2(g.y, g.x);
    for (let s = 0; s < N; s++) {
      // The frame's shutter, half a frame either side of the output frame (the drum frame already shows the first pull).
      const t = out - SANDBOX + 1 - 0.8 * rank + (s + 0.5) / N - 0.5;
      const u = suckU(t);
      const fade = 1 - smoothstep(0.75, 1, u);
      if (fade <= 0) continue;
      const turn = -1.75 * u;
      const r = r0 * (1 - u);
      res.push({ ...g, x: r * Math.cos(a0 + turn), y: r * Math.sin(a0 + turn), size: g.size * (1 - 0.85 * u), rot: (g.rot ?? 0) + turn, stretch: 1 + 1.4 * u, alpha: ((g.alpha ?? 1) * fade) / N });
    }
  });
  return res;
}

/** Renderer C's overlay at output frame `out`, under the rig's view `v`. */
export function cOverlay(out: number, v: View, adv: OverlayAdvances): OverlayFrame {
  const o: OverlayFrame = { dark: [], darkGlyphs: { display: [], mono: [], readout: [], face: [] }, light: [], lightGlyphs: { display: [], mono: [], face: [] } };
  if (out < HORIZON.at) webOverlay(out, v, adv, o);
  else holeOverlay(out, v, adv, o);
  monitorOverlay(out, adv, o);
  return o;
}
