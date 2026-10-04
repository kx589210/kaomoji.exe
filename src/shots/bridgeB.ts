// X03, bridge B (v08): THE CRASH TAKES TIME — the pure pieces of the bar between the bullet time and the blue screen (the schedule:
// src/score/bridgeB.ts). The bridge draws drop 2's crash shot (src/shots/drop2Crash.ts: THE FRAME front-on, its drain, his condense, his
// blue spot) on its own clocks, and these are what it adds to it:
//   the clocks       inBridge / programAt / crashClockB / lookClockB: from the bridge's first instant the crash runs on the program's
//                    falling frame rate (programFrame), TAPE_LAG frames later on the crash clock (the tape stop's); its look (the CRT,
//                    the glow) on the film's own time;
//   the drain        a ring a stage, from the edges in (drainAt, drainedBy), a cell up to 2 frames late (bit errors: drainJitter);
//   the glitches     the vertical slip on the landing (slipRows), the tears in bands of rows (tearDx), the corrupted blocks printing the
//                    field's bytes in hex, some blue, some shifted (corruptBlocks, blockAt), the aberration pulsing on each (aberrationAt),
//                    the `not responding` veil (veilAt);
//   the blue         his heart's blue glow (heartGlowB), the blue leaking out of his spot (leakPx, leakTint, leakGlow) — on the film's
//                    time, the system moving while the program is frozen — and drawn back in with the spot on the inhale (inhaleU);
//   the fps line     the camera's, honest (cameraLineText), and both lines fading with the inhale (lineFade).
// Pure: Node tests import it (tests/bridgeB.test.ts). Layout px: 1920 × 1080, origin top-left, y down (the crash's), except where a
// shape is built (the flat world: X, Y).
import { cameraLine, hexOf } from '../content/bridgeB.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import {
  BRIDGE_B_START,
  CORRUPT_WAVES,
  DRAIN_RINGS,
  FREEZE,
  HEART_B,
  INHALE,
  LEAKS,
  MUSIC_BOX_B,
  SLIP,
  STAGES,
  TAPE_LAG,
  TEARS,
  VEIL,
  cameraFps,
  cameraTime,
  programFrame,
} from '../score/bridgeB.ts';
import { crashClock } from '../score/drop2.ts';
import { T7_GRID } from './drop2Shared.ts';
import { OUTRO_HEX } from './outroShared.ts';

/** Layout px → the flat world (centred, y up), as src/shots/drop2Overload.ts X / Y (not imported: that module reads this one). */
const X = (x: number): number => x - 960;
const Y = (y: number): number => 540 - y;

// ——— The clocks ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The bridge's first instant: its first output frame's earliest sub-frame. Before it the crash shot runs as drop 2 built it. */
export const BRIDGE_FROM = BRIDGE_B_START - 0.5;
export const inBridge = (f: number): boolean => f >= BRIDGE_FROM;
/** The program's instant at film instant `f`: `f` before the bridge; in it, the falling frame rate's (src/score/bridgeB.ts programFrame). */
export const programAt = (f: number): number => (inBridge(f) ? programFrame(f) : f);
/**
 * The crash shot's clock (src/score/drop2.ts crashClock) at film instant `f`: as built up to the bridge; in it on the program's frames,
 * TAPE_LAG later — the tape stop took 12 frames more to land front-on — so drop 2's last instant (the bullet time handing back on its
 * camera's time, drop2 20.4& − ½) and the bridge's first are one instant of the crash.
 */
export const crashClockB = (f: number): number => (inBridge(f) ? crashClock(programFrame(f)) - TAPE_LAG : crashClock(f));
/** The same on the film's own time: the CRT and the glow (the tube refreshes while the picture is stuck). */
export const lookClockB = (f: number): number => (inBridge(f) ? crashClock(f) - TAPE_LAG : crashClock(f));
/**
 * The bullet time's camera time at film instant `f` (src/scenes/drop2Bullet.ts, drop 2's last beat): the film's own until drop2 20.4, then
 * the tape stop's (cameraTime) on the program's frames (from 20.4& every other one repeats), landing on drop2 20.4& — the bullet time's
 * landing, front-on, at rest — on the bridge's downbeat.
 */
export const bulletTimeAt = (f: number): number => cameraTime(programFrame(f));

// ——— The drain: a ring a stage, from the edges in —————————————————————————————————————————————————————————————————————————————————

/** Within its stage a ring drains from its outer edge in over RIPPLE frames; each cell takes DRAIN_STEP frames (a quarter on its first). */
export const RIPPLE = 4;
export const DRAIN_STEP = 4;
/** The program frame a cell `d` px outside his outline starts draining (`jitter` frames late): its ring's stage, its outer cells first. */
export function drainAt(d: number, jitter = 0): number {
  const r = DRAIN_RINGS.find((x) => d >= x.from && d < x.to) ?? DRAIN_RINGS[DRAIN_RINGS.length - 1];
  const lo = Number.isFinite(r.from) ? r.from : -60;
  const hi = Number.isFinite(r.to) ? r.to : lo + 300;
  return r.at + RIPPLE * (1 - clamp((d - lo) / (hi - lo))) + jitter;
}
/** How far a cell starting at `start` has drained at program instant `p` (0 … 1): a quarter on its first frame, all of it by its fourth. */
export const drainedBy = (p: number, start: number): number => clamp((p - start + 1) / DRAIN_STEP);
/** A cell's bit-error lateness (0 … 2 frames), seeded (bridge B's seeds 9100–9199). */
export const drainJitter = (col: number, row: number): number => 2 * hash(col, row, 9101);

// ——— The glitches ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The CRT's vertical hold on his heart's lub: the field one row (30 px) down while the program shows SLIP's picture. */
export const slipRows = (p: number): number => (p >= SLIP.from - 0.5 && p < SLIP.to - 0.5 ? 1 : 0);

/** The tears (TEARS): each band of rows thrown sideways by up to `amp` cells, settling with `tau` (frames); `zero` of the bands hold. */
export const TEAR = { amp: [6, 10, 4], tau: 7, zero: 0.45 } as const;
/** The bands of rows (2–5 rows each, seeded), over the field's rows: the band index of each row. */
const BAND_OF: ReadonlyMap<number, number> = (() => {
  const m = new Map<number, number>();
  let band = 0;
  let left = 0;
  for (let row = T7_GRID.rows[0]; row <= T7_GRID.rows[1]; row++) {
    if (left === 0) {
      band++;
      left = 2 + Math.floor(4 * hash(band, 9102));
    }
    m.set(row, band);
    left--;
  }
  return m;
})();
/** Band `b`'s throw on tear `j` (−1 … 1, cells × TEAR.amp[j]; 0 for the bands that hold). */
const throwOf = (b: number, j: number): number => (hash(b, j, 9103) < TEAR.zero ? 0 : 2 * hash(b, j, 9104) - 1);
/**
 * How far row `row` is torn sideways at program instant `p` (layout px, whole cells): each tear's throw decaying; the freeze's held until
 * the inhale (`straight`, 0 … 1 from INHALE: the blue draws the picture straight as it takes it in).
 */
export function tearDx(row: number, p: number, straight = 0): number {
  const b = BAND_OF.get(row) ?? 0;
  let dx = 0;
  TEARS.forEach((t0, j) => {
    if (p < t0 - 0.5) return;
    const k = t0 === FREEZE ? 1 - straight : Math.exp(-Math.max(0, p - t0) / TEAR.tau);
    dx += TEAR.amp[j] * throwOf(b, j) * k;
  });
  return Math.round(dx) * T7_GRID.cellW;
}

/** A corrupted block of cells [c0, c1] × [r0, r1]: printed from program frame `wave`, `edge` px outside his clearing's stadium. */
export type Block = { c0: number; c1: number; r0: number; r1: number; wave: number; kind: 'hex' | 'blue' | 'shift'; shift: number; edge: number; cx: number; cy: number };
/** The corruption: BLOCKS blocks, a third a wave (CORRUPT_WAVES), each wave further out (`band` px apart from `inner`): 5–14 cells wide, 1–3 rows. */
export const CORRUPT = { blocks: 18, inner: 14, band: 58, wide: [5, 14] as const, tall: [1, 3] as const } as const;
/** His clearing's stadium (his capsule + the spot's pad, centred (960, 540)): where the blue starts from. */
export type Stadium = { hw: number; hh: number; cy: number };
export const stadiumDistance = (x: number, y: number, s: Stadium): number => Math.hypot(Math.max(0, Math.abs(x - 960) - Math.max(0, s.hw - s.hh)), y - s.cy) - s.hh;
const cellCentre = (col: number, row: number): [number, number] => [T7_GRID.left + (col + 0.5) * T7_GRID.cellW, T7_GRID.top + (row + 0.5) * T7_GRID.cellH];
const blocksCache = new Map<string, Block[]>();
/**
 * The blocks round a clearing `clear` (deterministic: seeded 9105–9112): each placed by trial on the level line `edge` px out at a
 * hashed angle, inside the field, none overlapping the one before it by more than a row.
 */
export function corruptBlocks(clear: Stadium): Block[] {
  const key = `${clear.hw.toFixed(2)},${clear.hh.toFixed(2)},${clear.cy.toFixed(2)}`;
  const hit = blocksCache.get(key);
  if (hit) return hit;
  const out: Block[] = [];
  const per = Math.ceil(CORRUPT.blocks / CORRUPT_WAVES.length);
  for (let k = 0; k < CORRUPT.blocks; k++) {
    const w = Math.floor(k / per);
    const edge = CORRUPT.inner + CORRUPT.band * (w + hash(k, 9105));
    const wide = CORRUPT.wide[0] + Math.floor((CORRUPT.wide[1] - CORRUPT.wide[0] + 1) * hash(k, 9106));
    const tall = CORRUPT.tall[0] + Math.floor((CORRUPT.tall[1] - CORRUPT.tall[0] + 1) * hash(k, 9107));
    const r = hash(k, 9108);
    const kind: Block['kind'] = r < 0.55 ? 'hex' : r < 0.8 ? 'blue' : 'shift';
    const shift = (hash(k, 9109) < 0.5 ? -1 : 1) * (2 + Math.floor(4 * hash(k, 9110)));
    // The point `edge` px out from the stadium at angle a (from its centre), found along the ray.
    const a = 2 * Math.PI * hash(k, 9111);
    let lo = 0;
    let hi = 2000;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (stadiumDistance(960 + m * Math.cos(a), clear.cy + m * Math.sin(a), clear) < edge) lo = m;
      else hi = m;
    }
    const x = 960 + lo * Math.cos(a);
    const y = clear.cy + lo * Math.sin(a);
    const col = Math.round((x - T7_GRID.left) / T7_GRID.cellW - 0.5 - wide / 2);
    const row = Math.round((y - T7_GRID.top) / T7_GRID.cellH - 0.5 - (tall - 1) / 2);
    const c0 = Math.max(T7_GRID.cols[0], Math.min(T7_GRID.cols[1] - wide + 1, col));
    const r0 = Math.max(T7_GRID.rows[0], Math.min(T7_GRID.rows[1] - tall + 1, row));
    const [cx, cy] = cellCentre(c0 + (wide - 1) / 2, r0 + (tall - 1) / 2);
    out.push({ c0, c1: c0 + wide - 1, r0, r1: r0 + tall - 1, wave: CORRUPT_WAVES[Math.min(w, CORRUPT_WAVES.length - 1)], kind, shift, edge: stadiumDistance(cx, cy, clear), cx, cy });
  }
  blocksCache.set(key, out);
  return out;
}
/**
 * The block that cell (col, row) prints in at program instant `p`, if any, while the blue still reaches it (`reach`: the blue's
 * stadium now, `leak` px past it): the last block printed over it wins.
 */
export function blockAt(blocks: readonly Block[], col: number, row: number, p: number, reach: Stadium, leak: number): Block | null {
  let hit: Block | null = null;
  for (const b of blocks) {
    if (p < b.wave - 0.5 || col < b.c0 || col > b.c1 || row < b.r0 || row > b.r1) continue;
    if (stadiumDistance(b.cx, b.cy, reach) > leak) continue;
    hit = b;
  }
  return hit;
}
/** The character a hex block prints in cell `col` of its row: the row's characters as hex bytes ("40 40 3d …"), one character a cell. */
export function hexChar(b: Block, col: number, chars: (col: number) => string): string {
  const k = col - b.c0;
  const byte = Math.floor(k / 3);
  if (k % 3 === 2) return ' ';
  return hexOf(chars(b.c0 + byte))[k % 3];
}
/** A hex block's ink: the drained text, brighter (a dump highlighted); a blue block's: the blue screen's dim type on its ground. */
export const HEX_INK_GAIN = 1.9;
export const BLUE_TYPE: RGB = linear(OUTRO_HEX.blueDim, 0.5);
export const BLUE_GROUND: RGB = scaleRGB(linear(OUTRO_HEX.blue), 0.3);
/** A blue block's ground: a rect of the blue screen's blue (additive, under the type), at `alpha`. */
export function blockGround(b: Block, alpha: number): Shape {
  const x0 = T7_GRID.left + b.c0 * T7_GRID.cellW;
  const y0 = T7_GRID.top + b.r0 * T7_GRID.cellH;
  const w = (b.c1 - b.c0 + 1) * T7_GRID.cellW;
  const h = (b.r1 - b.r0 + 1) * T7_GRID.cellH;
  return { kind: 'rect', x: X(x0 + w / 2), y: Y(y0 + h / 2), w, h, color: BLUE_GROUND, alpha, soft: 2 };
}

/** The look's chromatic aberration pulses on the slip and each tear (× 1 + `k`, decaying over `tau` frames; the film's time). */
export const ABERRATION = { k: [2, 4, 6, 3], tau: 6 } as const;
export function aberrationAt(f: number): number {
  let g = 0;
  [SLIP.from, ...TEARS].forEach((t0, j) => {
    if (f >= t0 - 0.5) g += ABERRATION.k[j] * Math.exp(-Math.max(0, f - t0) / ABERRATION.tau);
  });
  return g;
}
/** The `not responding` veil (the kernel's HANG, drop2 8.4, as a milky lift: additive grey, the crisp face drawn over it): its level at `f`. */
export const VEIL_INK: RGB = [0.011, 0.012, 0.012];
export const veilAt = (f: number): number => smoothstep(VEIL.from - 0.5, VEIL.to, f) * (1 - retractU(f));
/** The veil as a shape over the whole frame (and a margin: the camera's drift). */
export const veilShape = (f: number): Shape | null => {
  const a = veilAt(f);
  return a > 0.001 ? { kind: 'rect', x: 0, y: 0, w: 2200, h: 1300, color: VEIL_INK, alpha: a } : null;
};

// ——— The blue: the system, on the film's own time ————————————————————————————————————————————————————————————————————————————————

/** The inhale's progress at `f` (0 … 1, quadratic: accelerating onto his face, landing on outro 1.1). */
export const inhaleU = (f: number): number => clamp((f - INHALE.from) / (INHALE.to - INHALE.from)) ** 2;
/** What the blue drew out of the spot (its leak, the corruption, the veil, the freeze's tear) goes back in faster: all of it by the bridge's last frame but one. */
export const retractU = (f: number): number => clamp((f - INHALE.from) / (INHALE.to - 2 - INHALE.from)) ** 2;
/** A launch: ¾ of the way in 3 frames, then settling (the film's accent grammar). */
const launch = (t: number): number => (t <= 0 ? 0 : t < 3 ? 0.75 * (t / 3) : 0.75 + 0.25 * (1 - Math.exp(-(t - 3) / 4)));
/** How far (px) the blue has leaked past his clearing at `f`: a step on the lub and on each stage after it, drawn back in by the inhale. */
export const leakPx = (f: number): number => LEAKS.reduce((s, l) => s + l.px * launch(f - l.at), 0) * (1 - retractU(f));
/** How blue a cell at (x, y) is (0 … LEAK_TINT): the leak's reach past the spot `spot`, strongest at its edge, none under it. */
export const LEAK_TINT = 0.7;
export function leakTint(x: number, y: number, f: number, spot: Stadium): number {
  const r = leakPx(f);
  if (r <= 1) return 0;
  const d = stadiumDistance(x, y, spot);
  // Under the spot the type is cleared (src/shots/drop2Crash.ts spotCover): the blue tints only what lies outside it.
  return d < 0 || d >= r ? 0 : LEAK_TINT * (1 - d / r) ** 1.5;
}
/** The blue a leaked cell's type turns (the blue screen's dim type, as dim as the drained text). */
export const LEAK_INK: RGB = linear(OUTRO_HEX.blueDim, 0.45);
export const leakInk = (ink: RGB, tint: number): RGB => (tint > 0 ? mixRGB(ink, LEAK_INK, tint) : ink);
/** The leak's light under the type: a soft stadium of the blue, `leakPx` past the spot, faint (additive). */
export function leakGlow(f: number, spot: Stadium, blue: RGB): Shape | null {
  const r = leakPx(f);
  if (r <= 1) return null;
  return { kind: 'rect', x: X(960), y: Y(spot.cy), w: 2 * (spot.hw + r), h: 2 * (spot.hh + r), r: spot.hh + r, color: scaleRGB(blue, 0.09), alpha: 1, soft: r + 40 };
}
/** His heart (HEART_B): a wide soft glow of the blue beating out of him on the lub (the dub 60 %), gone within a beat. */
export const HEART_GLOW = { ink: scaleRGB(linear(OUTRO_HEX.blue), 0.07), w: 2400, h: 1500, soft: 700, decay: 3, span: 18, dub: 0.6 } as const;
export function heartPulseB(f: number): number {
  let p = 0;
  for (const [at, w] of [[HEART_B.lub, 1], [HEART_B.dub, HEART_GLOW.dub]] as const) {
    const t = f - at;
    if (t >= -0.5 && t < HEART_GLOW.span) p = Math.max(p, w * Math.exp(-Math.max(0, t) / HEART_GLOW.decay));
  }
  return p;
}
export function heartGlowB(f: number, cy: number): Shape | null {
  const p = heartPulseB(f);
  return p > 0.002 ? { kind: 'ellipse', x: X(960), y: Y(cy), w: HEART_GLOW.w, h: HEART_GLOW.h, color: scaleRGB(HEART_GLOW.ink, p), soft: HEART_GLOW.soft } : null;
}
/** The music box's notes in the bridge (MUSIC_BOX_B) flare the glints still lit (as the bullet time's did), on the program's frames. */
export function flareB(p: number): number {
  let g = 0;
  for (const n of MUSIC_BOX_B) {
    const t = p - n.at;
    if (t >= -0.5) g = Math.max(g, Math.exp(-Math.max(0, t) / 3.5));
  }
  return g;
}

// ——— The fps lines ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The camera's line at output frame `f` (src/content/bridgeB.ts cameraLine on the honest count), and its frozen state. */
export function cameraLineText(f: number): { text: string; fps: number; frozen: boolean } {
  const c = cameraFps(f);
  return { text: cameraLine(c.fps, c.frozen), ...c };
}
/** Both fps lines fade out with the inhale (gone on the bridge's last frame, H5, as they were gone on v07's). */
export const lineFade = (f: number): number => 1 - clamp((f - INHALE.from) / (INHALE.to - 1 - INHALE.from));
/** The freeze as a stage the picture can read (the veil, the camera line's state). */
export const frozenAt = (f: number): boolean => Math.round(f) >= FREEZE;
/** The stages, re-exported for the scene and the tests. */
export { STAGES };
