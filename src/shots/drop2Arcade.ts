// S31E 8-BIT, drop2 12.1–13.1 − 1 (2D), layer 2/5 `8bit.rom` (builder A · ARCADE+VOXEL; build sheet notes/bid2/drop2-sheet2.md §3
// "drop2 12", §5 #14–#15, §6.3; design notes/extend/drop2-final.md §4.9). Shooting him makes more of him: the formation is his
// signature in binary (27 copies, src/shots/drop2ArcadeSprites.ts), Defender's red cannon fires on the &s and every hit splits a copy
// into a free cell beside it (27 → ≈ 74 of the 80 cells by 12.4&); the march quickens (quarters, 8ths, 16ths), the formation drops at
// the edge; the amber mothership (him) dives on 12.3& and stomps the cannon flat on 12.4; on 12.4& the bottom row lands on it.
// Round 2 (R2-05: the bar was drop 2's stillest where the music doubles): a camera that flows (arcadeCam, src/shots/drop2ArcadeVoxel.ts),
// a stadium wave through his copies on every 8th, a denser, faster starfield, a flickering tube, and a stomp that lands — shake, cracked
// bunkers and their debris, the formation thrown out, a shock ring, a phosphor bloom.
// The whole picture is a list of game pixels (6 px on the 320 × 180 grid, layout px y down) — `arcadeAt(f)` — so the voxel well
// (src/shots/drop2ArcadeVoxel.ts) can stand every one of them up as a cube on 13.1 (voxelFrom) and nothing jumps. Pure: Node tests
// import it.
import { GUEST_VARIANTS } from '../content/castDrop2.ts';
import { ARCADE_TEXT } from '../content/drop2.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { FLAT_LOOK, type Look } from '../engine/types.ts';
import { ARCADE, DIVE, INVASION, MARCH_NOTES, PEWS, ROW_DROPS, SPLITS, STOMP } from '../score/drop2.ts';
import { v07Frame } from '../score/film.ts';
import { COPY_H, COPY_SPRITE, COPY_W, FORMATION, GP, HERO_BITMAP, MOTHERSHIP, SIGNATURE_BITS, litOf, pixelText, pixelTextWidth } from './drop2ArcadeSprites.ts';
import { drop2Segment } from './drop2Shared.ts';
import type { SprayPixel } from './drop2Wave.ts';

/** A game pixel's ink: the arcade's sprite white (tinted by the cellophane bands), his amber, Defender's red. */
export type Ink = 'white' | 'cyan' | 'green' | 'amber' | 'red' | 'redDeep' | 'cream' | 'grey' | 'ghost' | 'black' | 'pink' | 'lemon' | 'turquoise' | 'mint' | 'cobalt' | 'ink' | 'cyanDeep' | 'silver' | 'wall' | 'cyanHot';
/** A lit pixel: top-left (x, y) in layout px, its size (px, square unless h), its ink; `id` keeps a cube's identity across frames. */
export type Px = { x: number; y: number; s: number; h?: number; ink: Ink; id: number };

/** The arcade's span (drop2 12.1 → 13.1). */
export const ARCADE_SPAN = ARCADE;
const B16 = 6;
const frameOf = (f: number): number => Math.floor(f + 0.25);

// ——— The formation: march, splits —————————————————————————————————————————————————————————————————————————————————————————

/** The march notes of bar 12 (score MARCH_NOTES), the formation's offset after each (layout px): a step right, the edge (drop a row, reverse), the 16th row drops. */
const MARCH12 = MARCH_NOTES.filter((m) => m < ARCADE.to);
const OFFSETS: readonly [number, number][] = [
  [0, 0],
  [36, 0],
  [36, 54],
  [0, 54],
  [0, 108],
  [0, 162],
  [-36, 162],
  [-72, 162],
];
/** When the copies flap their arms: every 16th of the bar (R2-05: was every 8th; the holds stay alive) and every march step. */
const FLAPS: readonly number[] = [...new Set([...Array.from({ length: 16 }, (_, i) => ARCADE.from + 6 * i), ...MARCH12])].sort((a, b) => a - b);
/** The formation's offset and its arm frame (0 / 1, toggling on every flap) at f. */
export function marchAt(f: number): { dx: number; dy: number; arms: 0 | 1; step: number } {
  const k = MARCH12.filter((m) => m - 0.25 <= f).length - 1;
  const o = OFFSETS[Math.max(0, Math.min(OFFSETS.length - 1, k))];
  const flaps = FLAPS.filter((m) => m - 0.25 <= f).length;
  return { dx: o[0], dy: o[1], arms: (Math.max(0, flaps - 1) % 2) as 0 | 1, step: k };
}

/** The 27 copies' cells (col, row) of the signature formation. */
export const SIGNATURE_CELLS: readonly [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let c = 0; c < FORMATION.cols; c++) for (let r = 0; r < FORMATION.rows; r++) if (SIGNATURE_BITS[r][c]) out.push([c, r]);
  return out;
})();

/**
 * formationFromSpray (contract §6.3, 1055 → 1056): the copies the wave's game pixels become — every lit pixel (on ≈ 1) on a formation
 * cell's centre is that cell's copy. On the wave's last frame that is exactly the signature's 27 cells.
 */
export function formationFromSpray(spray: readonly SprayPixel[]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of spray) {
    if (p.on < 0.99) continue;
    const c = Math.round((p.x - FORMATION.left - (COPY_W * GP) / 2) / FORMATION.pitchX);
    const r = Math.round((p.y - FORMATION.top - (COPY_H * GP) / 2) / FORMATION.pitchY);
    if (c >= 0 && c < FORMATION.cols && r >= 0 && r < FORMATION.rows && !out.some(([a, b]) => a === c && b === r)) out.push([c, r]);
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** When each split lands and how many copies it adds (≈ 74 of the 80 cells by 12.4&): the hits on SPLITS, the cascade on the 16th row drops. */
const GROWTH: readonly { at: number; add: number }[] = [
  { at: SPLITS[0], add: 1 },
  { at: SPLITS[1], add: 3 },
  { at: SPLITS[2], add: 7 },
  { at: SPLITS[3], add: 12 },
  { at: ROW_DROPS[0], add: 8 },
  { at: ROW_DROPS[1], add: 6 },
  { at: INVASION, add: 6 },
  { at: INVASION + B16, add: 4 },
];
/** A copy: its cell, the frame it appeared (−∞ for the signature's), the cell it popped from. */
export type Copy = { c: number; r: number; born: number; from: [number, number] | null };

/** Every copy of the bar in the order they appear: the signature's 27, then each split's new copies, each in a free cell next to a copy (nearest the latest hit first). */
export const COPIES: readonly Copy[] = (() => {
  const out: Copy[] = SIGNATURE_CELLS.map(([c, r]) => ({ c, r, born: -Infinity, from: null }));
  const filled = new Set(out.map((k) => `${k.c},${k.r}`));
  let focus: [number, number] = [4, 7];
  for (const [gi, g] of GROWTH.entries()) {
    for (let n = 0; n < g.add; n++) {
      const cands: { c: number; r: number; from: [number, number]; d: number }[] = [];
      for (const k of out) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const c = k.c + dc;
          const r = k.r + dr;
          if (c < 0 || c >= FORMATION.cols || r < 0 || r >= FORMATION.rows || filled.has(`${c},${r}`)) continue;
          cands.push({ c, r, from: [k.c, k.r], d: Math.hypot(c - focus[0], r - focus[1]) + 0.3 * hash(c, r, gi) });
        }
      }
      if (cands.length === 0) break;
      cands.sort((a, b) => a.d - b.d);
      const pick = cands[0];
      filled.add(`${pick.c},${pick.r}`);
      out.push({ c: pick.c, r: pick.r, born: g.at, from: pick.from });
    }
    focus = gi < 3 ? [[5, 7], [3, 6], [6, 5]][gi] as [number, number] : [Math.round(10 * hash(gi, 9)), Math.round(7 * hash(gi, 10))];
  }
  return out;
})();

/** The copies alive at f (struck on their drum frame). */
export const copiesAt = (f: number): Copy[] => COPIES.filter((k) => k.born - 0.25 <= f);

/** A copy cell's top-left at f (layout px), with its split pop sliding it out of its parent's cell over 4 frames. */
export function copyAt(k: Copy, f: number): [number, number] {
  const m = marchAt(f);
  const x = FORMATION.left + m.dx + k.c * FORMATION.pitchX;
  const y = FORMATION.top + m.dy + k.r * FORMATION.pitchY;
  if (!k.from || f >= k.born + 4) return [x, y];
  const u = ease.outCubic(clamp((f - k.born + 0.25) / 4));
  const px = FORMATION.left + m.dx + k.from[0] * FORMATION.pitchX;
  const py = FORMATION.top + m.dy + k.from[1] * FORMATION.pitchY;
  return [GP * Math.round(lerp(px, x, u) / GP), GP * Math.round(lerp(py, y, u) / GP)];
}

// ——— Defender: the cannon, its bolts, the bunkers —————————————————————————————————————————————————————————————————————————————

/** The cannon (15 × 6) and a bunker (20 × 13): bitmaps. */
const CANNON: readonly string[] = ['.......#.......', '......###......', '......###......', '.#############.', '###############', '###############'];
const BUNKER: readonly string[] = [
  '....############....',
  '...##############...',
  '..################..',
  '.##################.',
  '####################',
  '####################',
  '####################',
  '####################',
  '####################',
  '#####..........#####',
  '####............####',
  '###..............###',
  '###..............###',
];
/** The ω notches the stomp bites out of each bunker's top (5 × 3 game px, at its centre). */
const NOTCH: readonly string[] = ['#.#.#', '#.#.#', '.#.#.'];
export const BUNKERS_X: readonly number[] = [348, 720, 1140, 1512];
export const BUNKER_Y = 864;
/** The cannon's centre x at f: it slides to aim before each shot; flattened on the stomp. */
const AIM: readonly { at: number; x: number }[] = [
  { at: ARCADE.from, x: 960 },
  { at: PEWS[0], x: 960 },
  { at: PEWS[1], x: 1044 },
  { at: PEWS[2], x: 900 },
];
export function cannonX(f: number): number {
  let x = AIM[0].x;
  for (let i = 1; i < AIM.length; i++) {
    const u = clamp((f - (AIM[i].at - 9)) / 9);
    x = lerp(x, AIM[i].x, ease.inOutSine(u));
  }
  return GP * Math.round(x / GP);
}
export const CANNON_Y = 990;

/** Defender's bolts: fired on PEWS from the cannon's barrel, each hitting the lowest copy above it on the split 12 frames later. */
export function boltsAt(f: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  PEWS.forEach((p, i) => {
    const t = f - p;
    if (t < 0 || t >= 12) return;
    const x = cannonX(p);
    const target = i === 2 ? 560 : 880;
    out.push({ x, y: GP * Math.round(lerp(CANNON_Y - 30, target, t / 12) / GP) });
  });
  return out;
}

// ——— Him: the mothership ———————————————————————————————————————————————————————————————————————————————————————————————

/** The mothership's centre, its squash (x, y) and tilt (radians) at f: idle bob on the beats, the dive (12.3&, −8° anticipation), the stomp (12.4, a pixel pancake on the cannon), the bounce back (12.4&). */
export function mothershipAt(f: number): { cx: number; cy: number; sx: number; sy: number; tilt: number } {
  // The hover (a mothership never sits still; R9, round 1: the 6 px-stepped hop and sway left the bar 9 % dead between the march
  // steps): a sway either side of the centre (24 px, two beats a swing) and a bob that lifts off on every beat (6 px, a beat a cycle),
  // in quadrature, so he is always moving (≥ 1.5 px a frame). Not snapped to the game grid: the 6 px pixel pass averages each game
  // pixel's area, so his edges shimmer smoothly from cell to cell. 0 on 12.1 (HANDOFFS) and settled to 0 by the dive's wind-up.
  const th = f - ARCADE.from;
  const live = 1 - ease.inOutSine(clamp((f - (DIVE - 8)) / 4));
  const sway = 24 * Math.sin((2 * Math.PI * th) / 48) * live;
  const bob = -GP * Math.sin((2 * Math.PI * th) / 24) * live;
  if (f < DIVE - 4) return { cx: MOTHERSHIP.cx + sway, cy: MOTHERSHIP.cy + bob, sx: 1, sy: 1, tilt: 0 };
  const land = { x: cannonX(STOMP), y: CANNON_Y - 40 };
  if (f < DIVE) {
    // Anticipation: tilt back and rise.
    const u = (f - (DIVE - 4)) / 4;
    return { cx: MOTHERSHIP.cx, cy: MOTHERSHIP.cy - 18 * Math.sin((Math.PI / 2) * u), sx: 1, sy: 1, tilt: (8 * Math.PI * u) / 180 };
  }
  if (f < STOMP) {
    // The dive: off on the &, falling onto the kick (gravity: quadratic in, fastest on the impact).
    const u = (f - DIVE) / (STOMP - DIVE);
    const p = u * u;
    return { cx: lerp(MOTHERSHIP.cx, land.x, p), cy: lerp(MOTHERSHIP.cy - 18, land.y - 189, p), sx: 1 - 0.12 * p, sy: 1 + 0.18 * p, tilt: lerp(8, -4, p) * (Math.PI / 180) };
  }
  if (f < INVASION) {
    // The pancake: squashed flat on the cannon, springing back a little.
    const t = f - STOMP;
    const k = Math.exp(-t / 4) * Math.cos(t / 1.6);
    const sy = 0.42 + 0.58 * (1 - Math.exp(-t / 5)) * 0.35 - 0.06 * k;
    return { cx: land.x, cy: land.y - (378 * sy) / 2, sx: 1.45 - 0.2 * (1 - Math.exp(-t / 5)), sy, tilt: 0 };
  }
  // The bounce back to his place (L on 12.4&, home by 13.1 − 2, so the tilt starts from exactly where the arcade began: nothing jumps).
  const t = f - INVASION;
  const p = ease.outCubic(clamp(t / 9));
  const sy0 = 0.42 + 0.58 * (1 - Math.exp(-12 / 5)) * 0.35;
  const arc = 60 * Math.sin(Math.PI * clamp(t / 9));
  return { cx: lerp(land.x, MOTHERSHIP.cx, p), cy: lerp(land.y - (378 * sy0) / 2, MOTHERSHIP.cy, p) - arc, sx: lerp(1.25, 1, p), sy: lerp(sy0, 1, p), tilt: 0 };
}

// ——— The frame —————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The arcade at f: its game pixels (bottom to top), its HUD lines and the cannon's face (drawn in DotGothic16 over the pixels). */
export type ArcadeFrame = {
  px: Px[];
  hud: { text: string; x: number; y: number; size: number; align: number; ink: Ink }[];
};

/** The cellophane bands of the cabinet: white sprites inside them print cyan (the middle) or green (the bottom). */
export const BANDS = { cyan: [300, 560] as const, green: [820, 1080] as const };
const tint = (ink: Ink, y: number): Ink => (ink !== 'white' ? ink : y >= BANDS.cyan[0] && y < BANDS.cyan[1] ? 'cyan' : y >= BANDS.green[0] && y < BANDS.green[1] ? 'green' : 'white');

/** Every copy sprite's pixel offsets (game px) per arm frame. */
const COPY_LIT = COPY_SPRITE.map((rows) => litOf(rows));
const HERO_LIT = litOf(HERO_BITMAP);
const CANNON_LIT = litOf(CANNON);

/**
 * The starfield behind the game: 240 game pixels streaming down at three speeds (parallax; the near layer bright), wrapping, gathering
 * speed through the bar (2.5 × by 13.1: R2-05, the holds stay alive); a few twinkle on the beats.
 */
export function starsAt(f: number): Px[] {
  const out: Px[] = [];
  const t = f - ARCADE.from;
  const run = t + (0.75 * t * t) / (ARCADE.to - ARCADE.from);
  for (let i = 0; i < 240; i++) {
    const layer = i % 3;
    const v = [0.9, 2.0, 4.2][layer];
    const x = GP * Math.floor((320 * hash(i, 71)) % 320);
    const y = (((1080 * hash(i, 72) + v * run) % 1080) + 1080) % 1080;
    const beat = Math.floor((t + 0.25) / 24);
    const twinkle = hash(i, beat, 73) < 0.12;
    // The near layer: bright, 2 × 2 game px.
    out.push({ x, y: GP * Math.floor(y / GP), s: layer === 2 ? 2 * GP : GP, ink: layer === 2 || twinkle ? 'silver' : 'grey', id: 700000 + i });
  }
  return out;
}

export function arcadeAt(f: number): ArcadeFrame {
  const px: Px[] = [...starsAt(f)];
  const m = marchAt(f);
  const stomped = f >= STOMP - 0.25;
  // The bunkers (with their ω notches from the stomp).
  BUNKERS_X.forEach((bx, bi) => {
    const x0 = bx - (BUNKER[0].length * GP) / 2;
    BUNKER.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '#') return;
        if (stomped) {
          const nx = x - 7 + (bi % 2);
          if (nx >= 0 && nx < 5 && y < 3 && NOTCH[y][nx] === '#') return;
          if (y < 3 && hash(bi, x, y) < 0.4) return;
          // R2-05: the stomp cracks it — a jagged crack from its top down through the arch.
          if (y < 9 && Math.abs(x - crackX(bi, y)) < 0.6) return;
        }
        px.push({ x: x0 + x * GP, y: BUNKER_Y + y * GP, s: GP, ink: 'red', id: 100000 + bi * 1000 + y * 40 + x });
      }),
    );
  });
  // The stomp's debris (R2-05): red game pixels thrown up out of the bunkers' cracks, falling back over 16 frames.
  if (stomped && f < STOMP + 16) {
    const t = f - STOMP + 0.25;
    BUNKERS_X.forEach((bx, bi) => {
      for (let q = 0; q < 10; q++) {
        const a = Math.PI * (1.15 + 0.7 * hash(bi, q, 61));
        const v = 9 + 9 * hash(q, bi, 62);
        const x = bx + Math.cos(a) * v * t;
        const y = BUNKER_Y + Math.sin(a) * v * t + 0.9 * t * t;
        if (y < BUNKER_Y + 80) px.push({ x: GP * Math.round(x / GP), y: GP * Math.round(y / GP), s: GP, ink: 'red', id: 140000 + bi * 100 + q });
      }
    });
  }
  // The ground line.
  for (let x = 0; x < 320; x += 1) px.push({ x: x * GP, y: 1044, s: GP, ink: 'red', id: 120000 + x });
  // The cannon (flattened under the stomp; the bottom row swarms it on the invasion); it kicks down a game pixel on each shot (R9).
  const cx = cannonX(f);
  const flat = stomped ? 0.34 : 1;
  const kick = stomped ? 0 : recoilAt(f);
  for (const [x, y] of CANNON_LIT) {
    const yy = stomped ? Math.max(0, Math.round((y - 5) * flat) + 5) : y;
    px.push({ x: cx - 7 * GP + x * GP, y: CANNON_Y + yy * GP + kick, s: GP, ink: 'red', id: 130000 + y * 20 + x });
  }
  const startle = flinchAt(f);
  // The copies.
  for (const k of copiesAt(f)) {
    const [x0, y0] = copyAt(k, f);
    // The invasion: the bottom row lands on the cannon (12.4&).
    const wave = rippleAt(k.c, f, k.r);
    let dy = startle - 2 * GP * wave;
    // The stomp scatters them (R2-05): every copy thrown out from the cannon 2 game pixels and up 2, back over 8 frames.
    let dx = 0;
    if (stomped && f < STOMP + 8) {
      const d = 1 - clamp((f - STOMP + 0.25) / 8);
      dx = GP * Math.round(2 * d * Math.sign(k.c - 4.5));
      dy -= GP * Math.round(2 * d);
    }
    if (k.r === FORMATION.rows - 1 && f >= INVASION - 6) dy = GP * Math.round((lerp(0, CANNON_Y - 6 - y0 - COPY_H * GP, ease.inCubic(clamp((f - (INVASION - 6)) / 6)))) / GP);
    for (const [x, y] of COPY_LIT[(m.arms + wave) % 2]) {
      const yy = y0 + dy + y * GP;
      px.push({ x: x0 + dx + x * GP, y: yy, s: GP, ink: tint('white', yy), id: 200000 + (k.c * 8 + k.r) * 200 + y * 16 + x });
    }
    // A new copy's pop: 12 pixel particles thrown sideways.
    if (k.from && f >= k.born - 0.25 && f < k.born + 10) {
      const t = f - k.born;
      for (let q = 0; q < 12; q++) {
        const a = 2 * Math.PI * hash(k.c, k.r, q);
        const v = 6 + 10 * hash(q, k.r, k.c);
        const x = x0 + 45 + Math.cos(a) * v * t;
        const y = y0 + 21 + Math.sin(a) * v * t + 0.8 * t * t;
        px.push({ x: GP * Math.round(x / GP), y: GP * Math.round(y / GP), s: GP, ink: tint('white', y), id: 300000 + (k.c * 8 + k.r) * 16 + q });
      }
    }
  }
  // Defender's bolts, and the muzzle flash on each shot (the snare): a red star at the barrel for 3 frames.
  for (const b of boltsAt(f)) for (let k = 0; k < 6; k++) px.push({ x: b.x, y: b.y + k * GP, s: GP, ink: 'red', id: 400000 + k + b.x });
  for (const [pi, p] of PEWS.entries()) {
    const t = f - p + 0.25;
    if (t < 0 || t >= 5) continue;
    const x0 = cannonX(p);
    // The shot's shock ring: red game pixels round the barrel, opening 0 → 150 px over 5 frames.
    const rr = 30 + 30 * t;
    const n = Math.max(12, Math.round((2 * Math.PI * rr) / (2 * GP)));
    for (let q = 0; q < n; q++) {
      const a = (2 * Math.PI * q) / n;
      px.push({ x: GP * Math.round((x0 + rr * Math.cos(a)) / GP), y: GP * Math.round((CANNON_Y - 6 * GP + 0.6 * rr * Math.sin(a)) / GP), s: GP, ink: 'red', id: 450000 + pi * 1000 + q });
    }
    if (t >= 3) continue;
    const r = [5, 3, 1][Math.floor(t)];
    for (let k = -r; k <= r; k++) {
      px.push({ x: x0 + k * GP, y: CANNON_Y - 6 * GP, s: GP, ink: 'red', id: 410000 + pi * 100 + k + 50 });
      if (k !== 0) px.push({ x: x0, y: CANNON_Y - 6 * GP + k * GP, s: GP, ink: 'red', id: 420000 + pi * 100 + k + 50 });
      if (Math.abs(k) <= r - 1 && k !== 0) {
        px.push({ x: x0 + k * GP, y: CANNON_Y - 6 * GP + k * GP, s: GP, ink: 'red', id: 430000 + pi * 100 + k + 50 });
        px.push({ x: x0 + k * GP, y: CANNON_Y - 6 * GP - k * GP, s: GP, ink: 'red', id: 440000 + pi * 100 + k + 50 });
      }
    }
  }
  // The stomp's shock ring (R2-05): amber game pixels on an ellipse opening from the cannon to past the frame over 10 frames, thinning.
  if (stomped && f < STOMP + 10) {
    const t = f - STOMP + 0.25;
    const rr = 60 + 110 * t;
    const n = Math.round((2 * Math.PI * rr) / (3 * GP));
    for (let q = 0; q < n; q++) {
      if (hash(q, 63) > 1 - t / 11) continue;
      const a = (2 * Math.PI * q) / n;
      px.push({ x: GP * Math.round((cx + rr * Math.cos(a)) / GP), y: GP * Math.round((CANNON_Y - 20 + 0.55 * rr * Math.sin(a)) / GP), s: GP, ink: 'amber', id: 460000 + q });
    }
  }
  // Him: the mothership (amber, its own layer, never tinted).
  const ms = mothershipAt(f);
  const P = MOTHERSHIP.px;
  const w = HERO_BITMAP[0].length;
  const h = HERO_BITMAP.length;
  const c = Math.cos(ms.tilt);
  const s = Math.sin(ms.tilt);
  // Hovering he is placed off the game grid (the pixel pass averages his edges smoothly, R9); from the dive's wind-up on, snapped.
  const snap = f >= DIVE - 4 ? (v: number): number => GP * Math.round(v / GP) : (v: number): number => v;
  for (const [x, y] of HERO_LIT) {
    const lx = (x - w / 2) * P * ms.sx;
    const ly = (y - h / 2) * P * ms.sy;
    const rx = lx * c - ly * s;
    const ry = lx * s + ly * c;
    px.push({ x: snap(ms.cx + rx), y: snap(ms.cy + ry), s: GP * Math.round((P * ms.sx) / GP), h: GP * Math.max(1, Math.round((P * ms.sy) / GP)), ink: 'amber', id: 500000 + y * 16 + x });
  }
  // The HUD, in the cabinet's 5 × 7 pixel font (game pixels, so they stand up in the tilt too): SCORE (Defender's: every hit scores,
  // and every hit makes more of him), HI-SCORE (the signature's first three bytes), Defender's lives (one lost to the stomp).
  for (const [k, line] of hudLines(f).entries()) {
    const x0 = line.align === 1 ? line.x - pixelTextWidth(line.text) * GP : line.x;
    for (const [x, y] of pixelText(line.text)) px.push({ x: x0 + x * GP, y: line.y + y * GP, s: GP, ink: line.ink, id: 600000 + k * 4000 + y * 400 + x });
  }
  // The cannon's face (the guest's sweat variant, Noto Sans JP over the pixels).
  const hud: ArcadeFrame['hud'] = [{ text: GUEST_SWEAT, x: cx, y: CANNON_Y - (stomped ? 10 : 34), size: 44, align: 0.5, ink: 'red' }];
  return { px, hud };
}

/**
 * The snares of 12.1& and 12.2& (the first two pews; R9, round 1: they had no visible event): the shot startles the formation — every
 * copy hops up two game pixels on the snare's frame and drops back three frames later — and the cannon kicks down a game pixel (all three
 * pews). Struck half a shutter early, like every drum swap.
 */
/**
 * The formation's stadium wave (R2-05: between the march steps the picture all but stopped): on every 8th a wave runs through his copies
 * corner to corner (top left → bottom right, a diagonal every 0.6 f): as it passes, each copy hops two game pixels and throws its arms the
 * other way for 3 frames; until the dive (12.3&). 1 while the wave is on copy (c, r), else 0.
 */
export function rippleAt(c: number, f: number, r = 0): number {
  if (f >= DIVE - 0.25) return 0;
  const t = f - ARCADE.from + 0.25;
  const ph = t - 12 * Math.floor(t / 12) - 0.6 * (c + r);
  return ph >= 0 && ph < 3 ? 1 : 0;
}
/** The x (game px, in the bunker) of bunker bi's crack at its row y: a jag down from its top centre. */
const crackX = (bi: number, y: number): number => 9 + (bi % 2) + Math.round(2 * Math.sin(y * 1.7 + bi) + (hash(bi, y, 64) - 0.5));

export const flinchAt = (f: number): number => (PEWS.slice(0, 2).some((p) => f >= p - 0.25 && f < p + 2.75) ? -2 * GP : 0);
export const recoilAt = (f: number): number => (PEWS.some((p) => f >= p - 0.25 && f < p + 2.75) ? GP : 0);

/** Defender's score at f: 100 a hit (each split; the hits that make more of him). */
export function scoreAt(f: number): number {
  return 100 * SPLITS.filter((s) => s - 0.25 <= f).length;
}

/**
 * The HUD's three lines at f (layout px of their top left, or top right for align 1). The scores stack in the top-left corner (SCORE
 * over HI-SCORE, a 12 px leading) and Defender's lives sit top right, so nothing of the HUD is ever under the mothership (R1-T11, round
 * 1: HI-SCORE at x 630 ran under his top-left bracket, hiding the signature's 'S'; his hover keeps ≥ 16 px clear of every line).
 */
export function hudLines(f: number): { text: string; x: number; y: number; align: 0 | 1; ink: Ink }[] {
  const lives = f >= STOMP - 0.25 ? ARCADE_TEXT.lives[1] : ARCADE_TEXT.lives[0];
  return [
    { text: ARCADE_TEXT.score.replace(/\d+$/, String(scoreAt(f)).padStart(6, '0')), x: 48, y: 24, align: 0, ink: 'white' },
    { text: ARCADE_TEXT.hi, x: 48, y: 78, align: 0, ink: 'white' },
    { text: ARCADE_TEXT.defender.replace(ARCADE_TEXT.lives[0], lives), x: 1872, y: 24, align: 1, ink: 'red' },
  ];
}

/** Defender's face on the cannon (its avatar after the first breach; Noto Sans JP, the cast's role). */
export const GUEST_SWEAT = GUEST_VARIANTS[0].face;

// ——— Look, photography, segment —————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The arcade: black, the game pixels re-gridded at 6 px with scanlines, the cabinet's CRT, bloom on his amber. R2-05: the tube is alive —
 * its phosphor flickers (± 3 % a frame) and its refresh band rolls down it; the stomp (12.4) blooms it (exposure + 35 %, bloom × 3,
 * fading over ≈ 10 f).
 */
export function arcadeLook(f: number): Look {
  const t = f - STOMP + 0.25;
  const hit = t >= 0 ? Math.exp(-t / 5) : 0;
  // (Hashed on the frame as approved on the 61-bar map: v07Frame, so v08's bridge A, which moved drop 2 a bar, re-rolls no flicker.)
  const flicker = 0.03 * (2 * hash(v07Frame(Math.floor(f + 0.25)), 919) - 1);
  return {
    ...FLAT_LOOK,
    exposure: 1 + flicker + 0.35 * hit,
    vignette: 0.3,
    bloom: { intensity: 0.5 + 1.1 * hit, threshold: 0.55, smoothing: 0.2, radius: 0.6 },
    pixel: { amount: 1, cell: GP, scanlines: 0.2 },
    crt: { amount: 0.5, curvature: 0.03, scanlines: 0, lines: 180, grille: 0, band: (((f - ARCADE.from) / 40) % 1 + 1) % 1 },
  };
}

/** Game pixels step: no motion blur but on the dive and the bounce (the mothership's flight, 16 sub-frames). */
export function arcadeTemporal(f: number): Temporal {
  if ((f >= DIVE && f < STOMP) || (f >= INVASION && f < INVASION + 10)) return { samples: 16, shutter: 0.5, persistence: 0 };
  return { samples: 1, shutter: 0, persistence: 0 };
}

export const arcadeSegment = (f: number): Segment => drop2Segment(f);
void frameOf;
