// S31V VOXEL, drop2 13.1–14.1 − 1 (3D) (builder A · ARCADE+VOXEL; build sheet notes/bid2/drop2-sheet2.md §3 "drop2 13", §5 #15–#16,
// §6.3; design notes/extend/drop2-final.md §4.10). The arcade stands up: on 13.1 the camera swings from the flat cabinet glass to a
// 3/4 diorama view (pitch 0 → 22°, yaw 0 → 20°: the builder's ruling, logged in tests/drop2Arcade.test.ts, so the stack and his face in it
// read whole) and every lit game pixel of the arcade's last frame rises as a cube where it was (voxelFrom(arcadeAt(13.1 − 1)): nothing
// jumps), extruding in a wave from the floor up. On 13.1& the walls of a well slam up and the invaders lock into its bottom rows as solid
// blocks (each still wearing his face in relief); a hard-drop every 8th fills the well, the cells over his ghost portrait locking cyan,
// the rest white, so his face appears in the stack; Defender pushes up red garbage rows (13.2, 13.3); the pieces touching the upper pair
// infect it (amber ω tops spreading from the touch, 13.2&); the I-piece spawns under the mothership (13.3&) and hard-drops down column 10
// (13.3& + 6); on 13.4 four rows clear: they glow, then ≈ 1 500 cubes blow past the lens. 13.4& → 14.1: the colours swap on the 32nds,
// the floor goes white, the camera flattens to isometric (a dolly zoom), the blocks swell into solids and he hard-drops himself down the
// centre to 600 px (voxelStateAt → the Memphis set).
// World: the flat world's axes (x right, y up, z toward the frontal camera; 1 unit = 1 px at z = 0 under it). Pure: Node tests import it.
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { FLAT_LOOK, type Look } from '../engine/types.ts';
import { ARCADE, COLOUR_BLIPS, GARBAGE, HARD_DROPS, KICKS2, LINE_CLEAR, STOMP, TOTEM, VOXEL_MORPH, VOXEL_TILT, WELL } from '../score/drop2.ts';
import { type ArcadeFrame, type Ink, type Px, arcadeAt } from './drop2Arcade.ts';
import { GP, HERO_BITMAP, MOTHERSHIP, litOf } from './drop2ArcadeSprites.ts';
import { FOV, FRONT } from './swiss.ts';
import { drop2Segment } from './drop2Shared.ts';

/** A cube: centre (world px), size per axis, ink; rotation (radians, three's XYZ Euler). */
export type Cube = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ink: Ink; rot?: readonly [number, number, number]; id: number };
type V3 = [number, number, number];

/** The voxel bar's span (drop2 13.1 → 14.1). */
export const VOXEL = { from: VOXEL_TILT.from, to: TOTEM } as const;
const struck = (at: number, f: number): boolean => at - 0.25 <= f;

/** Layout px → world (x right, y up). */
export const wx = (x: number): number => x - 960;
export const wy = (y: number): number => 540 - y;

/**
 * voxelFrom (contract §6.3, 1151 → 1152): every lit game pixel of an arcade frame as one cube at the same (x, y), `depth` deep (0 = the
 * flat picture), its back face on the playfield (z = 0).
 */
export function voxelFrom(a: ArcadeFrame, depth = GP): Cube[] {
  return a.px.map((p: Px) => {
    const h = p.h ?? p.s;
    return { x: wx(p.x + p.s / 2), y: wy(p.y + h / 2), z: depth / 2, sx: p.s, sy: h, sz: depth, ink: p.ink, id: p.id };
  });
}

// ——— The camera ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The voxel camera: an orbit about `pivot` (world), pitch (the camera rises above the playfield's top), yaw, distance, field of view (°). */
export type VoxelCam = { pitch: number; yaw: number; dist: number; fov: number; pivot: readonly [number, number, number] };
const deg = (d: number): number => (d * Math.PI) / 180;
/** The isometric view the morph lands on: the true isometric elevation, 45° yaw, a near-orthographic lens (a dolly zoom to 1.2°). */
const ISO = { pitch: deg(35.264), yaw: deg(45), fov: 1.2 };
/** The diorama: the well seen whole from above and to the right, its blocks' tops and sides lit, his face in the stack readable. */
export const DIORAMA = { pitch: deg(22), yaw: deg(20), dist: 3420, pivot: [30, -40, 0] as const };

/**
 * The arcade's camera (drop2 12; round 2, R2-05: it was locked for the whole bar, drop 2's lowest-energy bar right where the music goes
 * double time): the frontal camera on 12.1 (the wave's game pixels land on the formation's cells), then a push that never stops — a slow
 * drift at first, gathering speed through the bar (3 %), the playfield tilting a little away (pitch 4.5°, yaw 0.8°), swaying with the
 * march — so 13.1's tilt is its climax (voxelCam starts where it ends); a punch on every 8th (kicks 1.8 %, &s 0.9 %), and the stomp
 * (12.4) shakes it (± 16 px, gone in ≈ 12 f). The cabinet's HUD and ground line stay in frame throughout.
 */
export function arcadeCam(f: number): VoxelCam {
  const span = ARCADE.to - ARCADE.from;
  const t = clamp((f - ARCADE.from) / span);
  const g = 0.55 * t + 0.45 * t ** 3;
  // A punch on every 8th (the kicks 1.8 %, the snares' &s 0.9 %), struck half a shutter early.
  let punch = 0;
  for (let k = ARCADE.from + 12; k < ARCADE.to; k += 12) {
    const s = f - k + 0.25;
    if (s >= 0) punch = Math.max(punch, (KICKS2.includes(k) ? 0.018 : 0.009) * Math.exp(-s / 5) * clamp(s / 0.5));
  }
  const sh = f >= STOMP - 0.25 ? Math.exp(-Math.max(0, f - STOMP) / 4) : 0;
  // It sways with the march (34 px across and back, two beats a swing, turning on the kicks; the playfield's own plane, so the picture
  // slides), and dips 13 px on every 8th. (The push stays small: the cabinet's HUD and its ground line stay in frame.)
  const sway = 17 * (1 - Math.cos((2 * Math.PI * (f - ARCADE.from)) / 48)) - 23 + 24 * g;
  let dip = 0;
  for (let k = ARCADE.from + 12; k < ARCADE.to; k += 12) {
    const s = f - k + 0.25;
    if (s >= 0 && s < 12) dip = Math.max(dip, 13 * Math.sin((Math.PI / 2) * clamp(s / 1.5)) * Math.exp(-Math.max(0, s - 1.5) / 3.5));
  }
  return {
    pitch: deg(4.5) * g,
    yaw: deg(0.8) * g,
    dist: FRONT * (1 - 0.03 * g) * (1 - punch),
    fov: FOV,
    pivot: [sway * clamp((f - ARCADE.from) / 12) + 16 * sh * Math.sin((f - STOMP + 0.25) * 2.3), 4 * g + dip + 11 * sh * Math.sin((f - STOMP + 0.25) * 3.1 + 1.2), 0],
  };
}

/** The camera of drop2 12–13: the arcade's (arcadeCam) through bar 12; from 13.1 the tilt to the diorama, from where the arcade's ended. */
export function voxelCam(f: number): VoxelCam {
  if (f < VOXEL_TILT.from) return arcadeCam(f);
  const a = arcadeCam(VOXEL_TILT.from);
  const u = clamp((f - VOXEL_TILT.from) / (VOXEL_TILT.to - 1 - VOXEL_TILT.from));
  // 75 % by + 6, settled by + 20 (a sextic ease-out off the kick: its biggest step the one right after it; round 2: sextic, not quintic,
  // so the launch still stands out over bar 12's livelier end — R2-05 — as the tilt's climax).
  const p = 1 - (1 - u) ** 6;
  let cam: VoxelCam = {
    pitch: lerp(a.pitch, DIORAMA.pitch, p),
    yaw: lerp(a.yaw, DIORAMA.yaw, p),
    dist: lerp(a.dist, DIORAMA.dist, p),
    fov: FOV,
    pivot: [lerp(a.pivot[0], DIORAMA.pivot[0], p), lerp(a.pivot[1], DIORAMA.pivot[1], p), 0],
  };
  // A slow push while the well fills (a camera that never stops), yaw drifting on.
  const push = ease.inOutSine(clamp((f - VOXEL_TILT.to) / (LINE_CLEAR - VOXEL_TILT.to)));
  cam = { ...cam, dist: cam.dist * (1 - 0.05 * push), yaw: cam.yaw + deg(5) * push };
  // The clear kicks the camera back a little (the burst comes at it), settling over a beat.
  const kick = struck(LINE_CLEAR, f) ? Math.exp(-(f - LINE_CLEAR) / 7) * Math.sin(Math.min(Math.PI / 2, ((f - LINE_CLEAR) * Math.PI) / 6)) : 0;
  cam = { ...cam, dist: cam.dist * (1 + 0.05 * kick) };
  // The morph: perspective → isometric (a dolly zoom: the pivot's size kept while the lens narrows), pitch and yaw to the iso angles.
  const m = ease.inOutCubic(clamp((f - VOXEL_MORPH.from + 0.25) / (VOXEL_MORPH.to - VOXEL_MORPH.from)));
  if (m > 0) {
    const fov = Math.exp(lerp(Math.log(FOV), Math.log(ISO.fov), m));
    const keep = Math.tan(deg(FOV) / 2) / Math.tan(deg(fov) / 2);
    cam = { pitch: lerp(cam.pitch, ISO.pitch, m), yaw: lerp(cam.yaw, ISO.yaw, m), dist: cam.dist * keep * lerp(1, 1.05, m), fov, pivot: [lerp(cam.pivot[0], 0, m), lerp(cam.pivot[1], -120, m), 0] };
  }
  return cam;
}

/** The camera's pose (position, target, up) for three's PerspectiveCamera. */
export function camPose(c: VoxelCam): { position: V3; target: V3; up: V3; fov: number } {
  const [px, py, pz] = c.pivot;
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const cy = Math.cos(c.yaw);
  const sy = Math.sin(c.yaw);
  return {
    position: [px + c.dist * sy * cp, py + c.dist * sp, pz + c.dist * cy * cp],
    target: [px, py, pz],
    up: [-sy * sp, cp, -cy * sp],
    fov: c.fov,
  };
}

const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: readonly number[], b: readonly number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: readonly number[]): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const add = (a: readonly number[], b: readonly number[], k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** The camera's basis: right, up and back (toward the camera) unit vectors. */
export function camBasis(c: VoxelCam): { r: V3; u: V3; b: V3 } {
  const pose = camPose(c);
  const b = norm([pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]]);
  const r = norm(cross(pose.up, b));
  return { r, u: cross(b, r), b };
}

/** Where a world point lands on screen (layout px, y down) under the camera (the scene's projection, for tests and the hand-offs). */
export function project(c: VoxelCam, p: readonly [number, number, number], aspect = 16 / 9): [number, number] {
  const pose = camPose(c);
  const { r, u, b } = camBasis(c);
  const d = [p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]];
  const z = -dot(d, b);
  const t = Math.tan(deg(pose.fov) / 2);
  return [960 + (dot(d, r) / (z * t * aspect)) * 960, 540 - (dot(d, u) / (z * t)) * 540];
}

/**
 * A point that lands on screen at (960 + sx, sy) at the depth where `world` px span `px` px on screen, under the camera: the mothership
 * is placed in screen terms (his size and place are the shot's), so the camera can move under him and he never drifts.
 */
export function anchor(c: VoxelCam, sx: number, sy: number, world: number, px: number): { at: V3; k: number } {
  const pose = camPose(c);
  const { r, u, b } = camBasis(c);
  const t = Math.tan(deg(c.fov) / 2);
  const z = (world * 540) / (px * t);
  const k = 540 / (z * t);
  return { at: add(add(add(pose.position, b, -z), u, (540 - sy) / k), r, sx / k), k };
}

// ——— The well ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The well: 20 columns × 16 rows of cells, 72 × 54 px (12 × 9 game px), its floor the frame's bottom; column 17 (index 16) the I-piece's.
 * Ruling (builder A): the sheet's open column 10 ran through the middle of his portrait (the ω's cusp), leaving a black slit down his
 * face on 13.3, the bar's payoff; column 17 is never a stroke of the portrait (his right cheek), so the face reads whole.
 */
export const WELL_GRID = { cols: 20, rows: 16, cellW: 72, cellH: 54, left: 240, bottom: 1080, gapCol: 16 } as const;
/** A well cell's centre (world), row 0 at the bottom. */
export const wellCell = (col: number, row: number): [number, number] => [wx(WELL_GRID.left + (col + 0.5) * WELL_GRID.cellW), wy(WELL_GRID.bottom - (row + 0.5) * WELL_GRID.cellH)];
/** A locked block: 66 × 48 × 40 (a 6 / 6 px seam), its back on the playfield; his face in 5 px relief on its front, 4 px proud. */
const BLOCK = { w: 66, h: 48, d: 40, relief: 5, proud: 4 } as const;

/**
 * His ghost portrait (design §4.10): (•ω•) on 20 × 10 cells (rows from the face's bottom): brackets in columns 1–2 and 19–20, the eyes
 * 2 × 2 at 6–7 and 14–15 (rows 7–8), the ω across 7–14 (rows 2–4), its cusp in column 10–11. Strings top row (10) first.
 */
export const GHOST: readonly string[] = [
  '.##..............##.',
  '##................##',
  '##...##......##...##',
  '##...##......##...##',
  '##................##',
  '##................##',
  '##....#......#....##',
  '##.....#.##.#.....##',
  '##......#..#......##',
  '.##..............##.',
];
/** Whether face row `fr` (1 = the face's bottom) column `col` (0-based) is a stroke of his portrait. */
export const ghostAt = (fr: number, col: number): boolean => fr >= 1 && fr <= 10 && GHOST[10 - fr][col] === '#';

/** His face, small (11 × 7), as each block's relief. */
const CELL_SPRITE = litOf(['..#.....#..', '.#.......#.', '#..#...#..#', '#.........#', '#..#.#.#..#', '.#..#.#..#.', '..#.....#..']);

/** Tetromino shapes (cells as [col, row] offsets, row up), every distinct rotation. */
const SHAPES: Readonly<Record<'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J', readonly (readonly [number, number])[][]>> = (() => {
  const base: Record<string, [number, number][]> = {
    I: [[0, 0], [0, 1], [0, 2], [0, 3]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[0, 0], [1, 0], [1, 1], [2, 1]],
    Z: [[1, 0], [2, 0], [0, 1], [1, 1]],
    L: [[0, 0], [0, 1], [0, 2], [1, 0]],
    J: [[1, 0], [1, 1], [1, 2], [0, 0]],
  };
  const out: Record<string, [number, number][][]> = {};
  for (const [k, cells] of Object.entries(base)) {
    const rots: [number, number][][] = [];
    let cur = cells;
    for (let r = 0; r < 4; r++) {
      const mx = Math.min(...cur.map((c) => c[0]));
      const my = Math.min(...cur.map((c) => c[1]));
      const n2 = cur.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      if (!rots.some((q) => JSON.stringify(q) === JSON.stringify(n2))) rots.push(n2);
      cur = cur.map(([x, y]) => [y, -x]);
    }
    out[k] = rots;
  }
  return out as Record<'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J', [number, number][][]>;
})();
export type PieceType = keyof typeof SHAPES;

/** A piece: its type, its cells (col, stack row before any garbage), the hard-drop it lands on. */
export type Piece = { id: number; type: PieceType; cells: [number, number][]; drop: number };

/** Tiles the rectangle cols [c0, c1) × rows [r0, r0 + 4) with tetrominoes (deterministic backtracking, varied types). */
function tile(c0: number, c1: number, r0: number, seed: number): { type: PieceType; cells: [number, number][] }[] {
  const W = c1 - c0;
  const H = 4;
  const grid: boolean[] = new Array(W * H).fill(false);
  const out: { type: PieceType; cells: [number, number][] }[] = [];
  const order: PieceType[] = ['T', 'S', 'L', 'Z', 'J', 'O', 'I'];
  const solve = (depth: number): boolean => {
    const k = grid.indexOf(false);
    if (k < 0) return true;
    const x0 = k % W;
    const y0 = Math.floor(k / W);
    const types = [...order].sort((a, b) => hash(seed, depth, order.indexOf(a)) - hash(seed, depth, order.indexOf(b)));
    for (const t of types) {
      for (const rot of SHAPES[t]) {
        const ax = x0 - rot[0][0];
        const ay = y0 - rot[0][1];
        const cells = rot.map(([x, y]) => [ax + x, ay + y] as [number, number]);
        if (cells.some(([x, y]) => x < 0 || x >= W || y < 0 || y >= H || grid[y * W + x])) continue;
        for (const [x, y] of cells) grid[y * W + x] = true;
        out.push({ type: t, cells: cells.map(([x, y]) => [c0 + x, r0 + y]) });
        if (solve(depth + 1)) return true;
        out.pop();
        for (const [x, y] of cells) grid[y * W + x] = false;
      }
    }
    return false;
  };
  solve(0);
  return out;
}

/**
 * The pieces his mothership throws (HARD_DROPS): rows 5–8 of his face (stack rows 4–7), the left half, then the right (either side of the
 * open column 17); rows 9–12 (stack rows 8–11, the top two above the face), left, then right; the I-piece down column 17 on the last.
 * Rows 1–4 are the invaders.
 */
export const PIECES: readonly Piece[] = (() => {
  const out: Piece[] = [];
  const g = WELL_GRID.gapCol;
  const bands: [number, number, number, number][] = [
    [0, 8, 4, HARD_DROPS[0]],
    [8, g, 4, HARD_DROPS[1]],
    [g + 1, WELL_GRID.cols, 4, HARD_DROPS[1]],
    [0, 8, 8, HARD_DROPS[2]],
    [8, g, 8, HARD_DROPS[3]],
    [g + 1, WELL_GRID.cols, 8, HARD_DROPS[3]],
  ];
  bands.forEach(([c0, c1, r0, drop], b) => tile(c0, c1, r0, 31 + b).forEach((p) => out.push({ id: out.length, type: p.type, cells: p.cells, drop })));
  out.push({ id: out.length, type: 'I', cells: [0, 1, 2, 3].map((k) => [g, k - 2] as [number, number]), drop: HARD_DROPS[4] });
  return out;
})();
/** The I-piece down column 10 (the last piece; the bands' own I-pieces are ordinary pieces). */
export const I_PIECE: Piece = PIECES[PIECES.length - 1];
/** The I-piece spawns under the mothership a 16th before it drops (13.3&), popping in (no blink: a blink would flicker, check-flash). */
export const I_SPAWN = HARD_DROPS[4] - 6;

/** How far (rows) the garbage has pushed the stack up at f: 2 on 13.2, 4 on 13.3, each rising over the 4 frames before its kick. */
export const garbageLift = (f: number): number => GARBAGE.reduce((s, g) => s + 2 * ease.inCubic(clamp((f - (g - 4)) / 4)), 0);
/** The rows the clear removes (stack rows after both garbages: the upper red pair and the face's rows 1–2). */
export const CLEARED = [2, 3, 4, 5] as const;
const GLOW = 4;
/** The rows above the clear fall 4 rows over 6 frames from the burst (gravity). */
const clearFall = (f: number): number => 4 * clamp((f - (LINE_CLEAR + GLOW)) / 6) ** 2;

/** The gap of each garbage pair: the I's column (17) for the first (the upper pair after both), column 4 for the second (the I rests on it). */
export const GARBAGE_GAPS = [WELL_GRID.gapCol, 3] as const;

/** The invaders' well cells: the arcade's copies (≈ 74), in its order, into stack rows 0–3 (face rows 1–4), column 10 left open. */
export const INVADER_CELLS: readonly [number, number][] = (() => {
  const cells: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < WELL_GRID.cols; c++) if (c !== WELL_GRID.gapCol) cells.push([c, r]);
  return cells;
})();

/** The stack's recoil (world px, down) after each landing on its 8th: 6 px, back in ≈ 4 frames; 14 px for the I-piece; a lift on the garbage. */
export function stackRecoil(f: number): number {
  let y = 0;
  for (const d of HARD_DROPS) if (struck(d, f)) y += (d === HARD_DROPS[4] ? 14 : 6) * Math.exp(-(f - d) / 2);
  for (const g of GARBAGE) if (struck(g, f)) y -= 8 * Math.exp(-(f - g) / 2);
  return y;
}

export type WellFrame = { cubes: Cube[]; ghost: { x: number; y: number; w: number; h: number; alpha: number }[]; walls: number; floorMix: number; floorReach: number };

/**
 * The floor's white (13.4& → 14.1): not a fade through grey but a wipe from his drop line, the white spreading outward from the frame's
 * centre line across the playfield (world px either side of the camera's centre plane), done by 14.1 − 2.
 */
export const floorReach = (f: number): number => 9000 * ease.inOutCubic(clamp((f - VOXEL_MORPH.from + 0.25) / (VOXEL_MORPH.to - 2 - VOXEL_MORPH.from))) ** 1.6;

/** The Memphis inks the blocks take on the 32nds (13.4& → 14.1). */
const MEMPHIS: readonly Ink[] = ['pink', 'lemon', 'turquoise', 'mint', 'cobalt', 'ink'];
/** A locked block's relief ink (a shade of its own). */
const reliefOf = (ink: Ink): Ink => (ink === 'cyan' || ink === 'cyanHot' ? 'cyanDeep' : ink === 'white' ? 'silver' : ink === 'cream' ? 'white' : ink);

/**
 * A locked block at (x, y): the block, and his face in relief on its front (gone as the morph swells it into a solid, `solid` 0 → 1);
 * `pop` > 1 swells it on its landing frame.
 */
function pushBlock(out: Cube[], x: number, y: number, ink: Ink, id: number, solid: number, pop = 1): void {
  const w = lerp(BLOCK.w, WELL_GRID.cellW, solid) * pop;
  const h = lerp(BLOCK.h, WELL_GRID.cellH, solid) * pop;
  const d = lerp(BLOCK.d, 60, solid) * pop;
  out.push({ x, y, z: d / 2, sx: w, sy: h, sz: d, ink, id: id * 64 + 63 });
  if (solid >= 1) return;
  const k = (1 - solid) * pop;
  const r = BLOCK.relief * k;
  for (const [i, [sx, sy]] of CELL_SPRITE.entries()) out.push({ x: x + (sx - 5) * r, y: y - (sy - 3) * r, z: d + (BLOCK.proud * k) / 2, sx: r, sy: r, sz: BLOCK.proud * k, ink: reliefOf(ink), id: id * 64 + i });
}

/** The infection front on the upper garbage pair: from the column the 13.2& band touched, a column every 0.75 frame each way. */
const INFECT_FROM = { at: HARD_DROPS[2], col: 4 } as const;

/**
 * The well at f: the walls, the invaders sliding into their cells and locking (13.1&), the pieces falling and locking on their drops,
 * the garbage, the I-piece, the clear (a cream glow, then the burst), the morph. Returns the cubes in world px, the ghost portrait's
 * quads, the walls' rise (0 → 1) and the floor's white.
 */
export function wellAt(f: number): WellFrame {
  const cubes: Cube[] = [];
  const lift = garbageLift(f);
  const cleared = struck(LINE_CLEAR + GLOW, f);
  const fall = cleared ? clearFall(f) : 0;
  const morph = clamp((f - VOXEL_MORPH.from + 0.25) / (VOXEL_MORPH.to - VOXEL_MORPH.from));
  const blips = COLOUR_BLIPS.filter((b) => struck(b, f)).length;
  const glow = struck(LINE_CLEAR, f) && !cleared;
  const recoil = stackRecoil(f);
  const solid = smoothstep(0.15, 0.8, morph);
  const inClear = (row: number): boolean => (CLEARED as readonly number[]).includes(Math.round(row));
  // A stack row (before garbage) → its row now.
  const rowNow = (r: number): number => {
    const w = r + lift;
    return cleared && w > 5.5 ? w - fall : w;
  };
  // 13.3&: as the I-piece spawns, his face in the stack lights up (the cyan blocks flare for 3 frames): complete but one column.
  const flare = struck(I_SPAWN, f) && f < I_SPAWN + 3;
  const inkFor = (base: Ink, key: number): Ink => {
    if (flare && base === 'cyan') return 'cyanHot';
    if (blips === 0) return base;
    // The swaps: the whites (and the walls) first, then the cyans, then the reds.
    const order: Ink[][] = [['white', 'wall'], ['cyan'], ['red']];
    const k = order.findIndex((o) => o.includes(base));
    return k >= 0 && blips > k ? MEMPHIS[Math.floor(hash(key, 3) * MEMPHIS.length)] : base;
  };
  const cellY = (row: number): number => wellCell(0, row)[1] - recoil;

  // The walls: the well's sides and floor, slamming up out of the playfield on 13.1& (overshoot, settled in 6 f), gone in the morph.
  const walls = ease.outBack(clamp((f - (WELL - 3)) / 6)) * (1 - smoothstep(0.1, 0.6, morph));
  if (walls > 0.001) {
    const d = 64 * walls;
    for (let r = -1; r < WELL_GRID.rows; r++) {
      for (const c of r < 0 ? Array.from({ length: WELL_GRID.cols + 2 }, (_, i) => i - 1) : [-1, WELL_GRID.cols]) {
        const [x] = wellCell(c, 0);
        cubes.push({ x, y: cellY(r), z: d / 2, sx: 68, sy: 50, sz: d, ink: inkFor('wall', 900 + c * 31 + r), id: 50000 + (r + 1) * 40 + c + 1 });
      }
    }
  }

  // The invaders: from where the arcade left them, sliding into their cells over the 6 frames before the slam, locking as blocks on it.
  const arcade = arcadeAt(VOXEL.from - 1);
  const byCopy = new Map<number, Px[]>();
  for (const p of arcade.px) {
    if (p.id < 200000 || p.id >= 300000) continue;
    const key = Math.floor((p.id - 200000) / 200);
    if (!byCopy.has(key)) byCopy.set(key, []);
    byCopy.get(key)!.push(p);
  }
  // The formation's bottom rows first, so the lowest copies take the lowest cells.
  const keys = [...byCopy.keys()].sort((a, b) => (b % 8) - (a % 8) || Math.floor(a / 8) - Math.floor(b / 8));
  const slide = ease.inCubic(clamp((f - (WELL - 6)) / 6));
  const locked = struck(WELL, f);
  keys.forEach((key, i) => {
    const cell = INVADER_CELLS[i];
    if (!cell) return;
    const [c, r0] = cell;
    const row = rowNow(r0);
    if (cleared && inClear(r0 + lift)) return;
    const [tx] = wellCell(c, 0);
    const ty = cellY(row);
    const ink: Ink = ghostAt(r0 + 1, c) ? 'cyan' : 'white';
    if (!locked) {
      // Still the arcade's copy, moving to its cell (each copy's pixels as cubes, extruded as the tilt left them).
      const ps = byCopy.get(key)!;
      const ax = wx(ps.reduce((s, p) => s + p.x, 0) / ps.length + GP / 2);
      const ay = wy(ps.reduce((s, p) => s + p.y, 0) / ps.length + GP / 2);
      const dx = (tx - ax) * slide;
      const dy = (ty - ay) * slide;
      for (const p of ps) {
        const dep = extrudeAt(f, p.y);
        cubes.push({ x: wx(p.x + GP / 2) + dx, y: wy(p.y + GP / 2) + dy, z: dep / 2, sx: GP, sy: GP, sz: dep, ink: p.ink, id: p.id });
      }
    } else {
      const g = glow && inClear(r0 + lift);
      const pop = 1 + 0.18 * Math.exp(-(f - WELL) / 1.5);
      pushBlock(cubes, tx, ty, g ? 'cream' : inkFor(ink, c * 31 + r0), 7000 + c * 20 + r0, solid, pop);
    }
  });

  // The pieces: hanging over their slots, then slammed down (6 frames, a cubic slam, landing on their drop), then locked. The I-piece pops in under him
  // on 13.3& and hard-drops in the 3 frames before its kick into stack rows 2–5.
  for (const p of PIECES) {
    const isI = p === I_PIECE;
    const spawn = isI ? I_SPAWN : p.drop - 6;
    if (!struck(spawn, f)) continue;
    const landed = struck(p.drop, f);
    const rMin = Math.min(...p.cells.map((q) => q[1]));
    p.cells.forEach(([c, r], k) => {
      const target = isI ? r + 4 : r + lift;
      if (landed && cleared && (isI || inClear(target))) return;
      let row: number;
      if (landed) row = cleared && target > 5.5 ? target - fall : target;
      else {
        // From a few rows over where it lands, not the top of the well (R9, round 1: the drops through the black above the stack flickered
        // the top-right of the frame, 4 swings a second on the strict 6 × 6 test): the hard drop is short and fast.
        const low = rMin + (isI ? 4 : lift);
        const from = Math.min(16.5, low + (isI ? 6 : 1.6)) + (r - rMin);
        const u = isI ? clamp((f - (p.drop - 3)) / 3) : clamp((f - spawn) / (p.drop - spawn));
        row = lerp(from, target, u * u * u);
      }
      const [x] = wellCell(c, 0);
      const y = landed ? cellY(row) : wellCell(0, row)[1];
      const base: Ink = isI ? (landed ? 'cyan' : 'cyanHot') : ghostAt(r + 1, c) ? 'cyan' : 'white';
      const g = glow && landed && (isI || inClear(target));
      const ink = g ? 'cream' : inkFor(base, p.id * 7 + c);
      const pop = landed ? 1 + 0.4 * Math.exp(-(f - p.drop) / 1.5) : isI ? 1 + 0.5 * Math.exp(-(f - I_SPAWN) / 1.2) : 0.05 + 0.95 * ease.outCubic(clamp((f - spawn + 0.25) / 3));
      pushBlock(cubes, x, y, ink, 9000 + p.id * 8 + k, landed ? solid : 0, pop);
    });
  }

  // Defender's garbage: red bricks rising out of the floor (two rows on each kick), each row with its gap; the upper pair infected (amber
  // ω tops) from 13.2&, the infection spreading from where the band touched it.
  GARBAGE.forEach((g, gi) => {
    const rise = ease.inCubic(clamp((f - (g - 4)) / 4));
    if (rise <= 0 || (cleared && gi === 0)) return;
    const below = gi === 0 ? 2 * ease.inCubic(clamp((f - (GARBAGE[1] - 4)) / 4)) : 0;
    for (let k = 0; k < 2; k++) {
      const row = k + below - 2 * (1 - rise);
      // Still under the floor until it rises: the part below the floor's top is not drawn (squashed up against it).
      const vis = clamp(row + 1);
      if (vis <= 0) continue;
      const y = cellY(row) + ((1 - vis) * WELL_GRID.cellH) / 2;
      for (let c = 0; c < WELL_GRID.cols; c++) {
        if (c === GARBAGE_GAPS[gi]) continue;
        const [x] = wellCell(c, 0);
        const ink = glow && gi === 0 ? 'cream' : inkFor('red', 500 + gi * 40 + k * 20 + c);
        cubes.push({ x, y, z: 21, sx: 66, sy: 48 * vis, sz: 42, ink, id: 60000 + gi * 100 + k * 20 + c });
        const t0 = INFECT_FROM.at + Math.abs(c - INFECT_FROM.col) * 0.75;
        if (gi === 0 && f >= t0 - 0.25 && !glow && blips < 3 && vis >= 1) {
          // The ω the pieces bit into its face: five amber cubes, popping in.
          const s = 8 * ease.outBack(clamp((f - t0 + 0.25) / 3));
          for (const [ox, oy] of [[-18, 6], [-9, -6], [0, 4], [9, -6], [18, 6]] as const) cubes.push({ x: x + ox, y: y + oy, z: 45, sx: s, sy: s, sz: 6, ink: 'amber', id: 61000 + gi * 1000 + k * 100 + c * 5 + ox });
        }
      }
    }
  });

  // The burst: the cleared rows' cubes thrown at the lens (from the glow's end), the nearest passing it within 5 frames.
  if (cleared) cubes.push(...burstAt(f));

  // The ghost portrait on the playfield (cream 30 %), from the slam, rising with the stack.
  const ghost: WellFrame['ghost'] = [];
  const ga = 0.3 * smoothstep(WELL - 1, WELL + 3, f) * (1 - morph);
  if (ga > 0)
    for (let fr = 1; fr <= 10; fr++)
      for (let c = 0; c < 20; c++) {
        if (!ghostAt(fr, c) || (cleared && inClear(fr - 1 + lift))) continue;
        const [x] = wellCell(c, 0);
        ghost.push({ x, y: cellY(rowNow(fr - 1)), w: WELL_GRID.cellW - 4, h: WELL_GRID.cellH - 4, alpha: ga });
      }
  return { cubes, ghost, walls, floorMix: smoothstep(0, 1, morph), floorReach: floorReach(f) };
}

/** The burst's cubes at f: every block of the cleared rows shattered (its chunks and its face's relief) on a ballistic path toward the camera of the clear, spinning. */
export function burstAt(f: number): Cube[] {
  const t = f - (LINE_CLEAR + GLOW);
  if (t < 0 || t > 24) return [];
  const cam = camPose(voxelCam(LINE_CLEAR));
  const out: Cube[] = [];
  let id = 0;
  for (const row of CLEARED) {
    for (let c = 0; c < WELL_GRID.cols; c++) {
      const [x, y] = wellCell(c, row);
      const red = row <= 3 && c !== GARBAGE_GAPS[0];
      const parts = red ? 8 : 8 + CELL_SPRITE.length;
      for (let k = 0; k < parts; k++) {
        const h1 = hash(row, c, k, 1);
        const h2 = hash(row, c, k, 2);
        const h3 = hash(row, c, k, 3);
        const chunk = k < 8;
        const ox = chunk ? ((k % 4) - 1.5) * 16 : (CELL_SPRITE[k - 8][0] - 5) * BLOCK.relief;
        const oy = chunk ? (Math.floor(k / 4) - 0.5) * 22 : -(CELL_SPRITE[k - 8][1] - 3) * BLOCK.relief;
        const p0: V3 = [x + ox, y + oy, chunk ? 20 : 42];
        // Toward the lens, spread wide; speed so the nearest reach it in ≈ 5 frames.
        const d = [cam.position[0] - p0[0], cam.position[1] - p0[1], cam.position[2] - p0[2]];
        const L = Math.hypot(d[0], d[1], d[2]);
        const speed = (L / 5.5) * (0.35 + 0.75 * h1);
        const spread = 0.55;
        const dir = norm([d[0] / L + spread * (h2 - 0.5) * 2, d[1] / L + spread * (h3 - 0.5) * 2, d[2] / L + 0.3]);
        const drag = (1 - Math.exp(-0.12 * t)) / 0.12;
        const pos = [p0[0] + dir[0] * speed * drag, p0[1] + dir[1] * speed * drag - 1.2 * t * t, p0[2] + dir[2] * speed * drag];
        const size = chunk ? (red ? 18 : 14) : BLOCK.relief + 1;
        const face = ghostAt(row - 1, c) || c === GARBAGE_GAPS[0];
        const ink: Ink = red ? 'red' : chunk ? (face ? 'cyan' : 'white') : face ? 'cyanDeep' : 'silver';
        out.push({ x: pos[0], y: pos[1], z: pos[2], sx: size, sy: size, sz: size, ink, rot: [t * (h1 - 0.5) * 0.9, t * (h2 - 0.5) * 0.9, t * (h3 - 0.5) * 0.6], id: 80000 + id++ });
      }
    }
  }
  return out;
}

// ——— Him: the mothership in 3D ——————————————————————————————————————————————————————————————————————————————————————————————

/** Rodrigues: v rotated by angle a about the unit axis k. */
function rotate(v: readonly number[], k: readonly number[], a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}
/** Euler XYZ (three's order) of the rotation whose columns are r, u, b. */
function eulerOf(r: readonly number[], u: readonly number[], b: readonly number[]): [number, number, number] {
  const m13 = b[0];
  const y = Math.asin(clamp(m13, -1, 1));
  if (Math.abs(m13) < 0.9999) return [Math.atan2(-b[1], b[2]), y, Math.atan2(-u[0], r[0])];
  return [Math.atan2(u[2], u[1]), y, 0];
}

/** His world scale in the voxel bar (of the arcade's 42 px a pixel): he is built small and near the lens. */
export const HERO_NEAR = 0.45;

/** Where he is on screen (centre, layout px) and how wide, how far he is turned off the lens (radians), his squash, at f. */
export function mothershipScreen(f: number): { x: number; y: number; width: number; yaw: number; pitch: number; squash: number } {
  // 13.1: where the arcade left him (546 px at (960, 230)); he rises toward the lens with the tilt to 600 px at (960, 124), cropped by
  // the top edge, clear of the stack and his face in it.
  const rise = 1 - (1 - clamp((f - VOXEL_TILT.from) / 20)) ** 3;
  const from = arcadeHero();
  // A beat's sway (he hovers, turned a little so his sides show) and a dip as he lets each piece go.
  const beat = (f - VOXEL.from) / 24;
  const yaw0 = rise * (deg(-16) + deg(7) * Math.sin(beat * Math.PI * 2));
  const pitch0 = rise * (deg(12) + deg(3) * Math.cos(beat * Math.PI * 2));
  const squash = HARD_DROPS.some((d) => f >= d - 4.25 && f < d - 0.25) ? 0.92 : 1;
  const bob = 8 * rise * Math.sin(beat * Math.PI * 2);
  let y = lerp(from.y, 124, rise) + bob;
  let width = lerp(from.width, 600, rise);
  const x = lerp(from.x, 0, rise);
  let yaw = yaw0;
  let pitch = pitch0;
  // His hard drop (13.4& → 14.1, edit #16; R1-T12, round 1: it read as a fade in place): a 2-frame wind-up (up 14 px, squashed 0.94),
  // then straight down x 960 on the slam curve (gravity, fastest at the end), arriving at (960, 420) at 600 px ON 14.1 − 1, turning flat
  // to the lens as he falls; on 14.1's clean cut the Memphis set lands his face block in the same place and size (FACE in drop2Memphis).
  const drop = dropAt(f);
  if (drop > 0) {
    const wind = Math.sin(Math.PI * clamp(drop / DROP_WIND));
    const fall = clamp((drop - DROP_WIND / 2) / (1 - DROP_WIND / 2));
    const e = fall ** 2.2;
    y = lerp(y, DROP_TO.y, e) - 14 * wind * (drop < DROP_WIND ? 1 : 0);
    width = lerp(width, DROP_TO.width, e);
    yaw = lerp(yaw, 0, ease.inOutCubic(drop));
    pitch = lerp(pitch, 0, ease.inOutCubic(drop));
    return { x, y, width, yaw, pitch, squash: drop < DROP_WIND ? 1 - 0.06 * wind : 1 + 0.04 * e };
  }
  return { x, y, width, yaw, pitch, squash };
}

/**
 * Where the arcade left him on screen (round 2: its camera moves now): his bitmap's centre and width at home (MOTHERSHIP, 546 px) under
 * the arcade's camera at 13.1 — the voxel mothership starts there, so nothing jumps.
 */
let ARCADE_HERO: { x: number; y: number; width: number } | null = null;
function arcadeHero(): { x: number; y: number; width: number } {
  if (!ARCADE_HERO) {
    const cam = arcadeCam(VOXEL_TILT.from);
    const half = (HERO_BITMAP[0].length * MOTHERSHIP.px) / 2;
    const c = project(cam, [wx(MOTHERSHIP.cx), wy(MOTHERSHIP.cy), 0]);
    const l = project(cam, [wx(MOTHERSHIP.cx - half), wy(MOTHERSHIP.cy), 0]);
    const rr = project(cam, [wx(MOTHERSHIP.cx + half), wy(MOTHERSHIP.cy), 0]);
    ARCADE_HERO = { x: c[0] - 960, y: c[1], width: Math.hypot(rr[0] - l[0], rr[1] - l[1]) };
  }
  return ARCADE_HERO;
}

/** The hard drop's progress 0 → 1: from 13.4& to 14.1 − 1 (whole on that frame's closing sub-frame), so 14.1 cuts to the landed block. */
export const dropAt = (f: number): number => clamp((f - VOXEL_MORPH.from + 0.25) / (VOXEL_MORPH.to - 1 - VOXEL_MORPH.from + 0.25));
/** The share of the drop that is wind-up. */
const DROP_WIND = 0.16;
/** Where the drop lands: the totem's face (drop2Memphis FACE: 600 px of face at (960, 420), drawn 1.12 wide on 14.1's squash: 672). */
export const DROP_TO = { y: 420, width: 640 } as const;
/**
 * As he drops his pixel face fills into a solid amber block and the face's own pixels turn ink (#111): the totem's face block (an amber
 * block, his (•ω•) in ink) assembling in the fall, cell by cell from the face's centre out, 13.4& + 3 → + 9 (each cell pops in 2 f).
 */
export function slabFill(f: number, x: number, y: number): number {
  const d = Math.hypot((x - 6) / 6.5, (y - 4) / 4.5) / Math.SQRT2;
  const t0 = VOXEL_MORPH.from + 3 + 6 * d;
  return ease.outCubic(clamp((f - t0 + 0.25) / 2));
}

/**
 * The mothership in 3D: his 13 × 9 bitmap as 42 px cubes, extruding as the camera tilts (0 → 42 px deep), placed by mothershipScreen
 * under the camera (so the world tilts under him and he never drifts), turned a little off the lens so his sides show.
 */
export function mothershipCubes(f: number): Cube[] {
  const lit = litOf(HERO_BITMAP);
  const P = MOTHERSHIP.px;
  const w = HERO_BITMAP[0].length;
  const h = HERO_BITMAP.length;
  const cam = voxelCam(f);
  const s = mothershipScreen(f);
  // He is built at 0.45 of the arcade's scale and placed nearer the lens to match on screen (a flat picture is the same at any depth):
  // in front of the playfield and its blocks, near the lens, whatever the camera does.
  const q = HERO_NEAR;
  const { at } = anchor(cam, s.x, s.y, w * P * q, s.width);
  const B = camBasis(cam);
  // Turned off the lens: yaw about the camera's up, then pitch about his right.
  const r = norm(rotate(B.r, B.u, s.yaw));
  const b1 = rotate(B.b, B.u, s.yaw);
  const u = norm(rotate(B.u, r, s.pitch));
  const b = norm(rotate(b1, r, s.pitch));
  const rot = eulerOf(r, u, b);
  const Q = P * q;
  const depth = Q * clamp((f - VOXEL_TILT.from) / 10);
  const cube = (x: number, y: number, k: number, ink: Ink, scale = 1): Cube => {
    const lx = (x - (w - 1) / 2) * Q;
    const ly = -(y - (h - 1) / 2) * Q * s.squash;
    const lz = -depth / 2;
    return { x: at[0] + r[0] * lx + u[0] * ly + b[0] * lz, y: at[1] + r[1] * lx + u[1] * ly + b[1] * lz, z: at[2] + r[2] * lx + u[2] * ly + b[2] * lz, sx: Q * scale, sy: Q * s.squash * scale, sz: Math.max(0.01, depth), ink, rot, id: 90000 + k };
  };
  const out = lit.map(([x, y], k) => cube(x, y, k, slabFill(f, x, y) >= 0.5 ? 'ink' : 'amber'));
  // The block assembling round his face in the hard drop (13.4& → 14.1): the unlit cells pop in amber, with a margin column each side
  // (15 × 9 cells: 690 × 415 px round his 600 px face, the totem block's 720 × 400 front).
  if (f >= VOXEL_MORPH.from) {
    for (let y = 0; y < h; y++)
      for (let x = -1; x <= w; x++) {
        if (HERO_BITMAP[y][x] === '#') continue;
        const k = slabFill(f, x, y);
        if (k > 0.01) out.push(cube(x, y, 200 + y * (w + 2) + x + 1, 'amber', k));
      }
  }
  return out;
}

// ——— The bar's whole picture —————————————————————————————————————————————————————————————————————————————————————————————

/**
 * How deep a game pixel at layout row y has extruded at f: 13.1 flat (0), then a wave from the floor up: each row rising 0 → 18 px
 * (3 game px) over 6 frames, the bottom row first (on 13.1 + 1), the top row 6 frames later.
 */
export function extrudeAt(f: number, y: number): number {
  const start = VOXEL_TILT.from + 1 + 6 * (1 - y / 1080);
  return 18 * ease.outCubic(clamp((f - start) / 6));
}

/** A voxel frame: the world's cubes, and his (drawn last, over a cleared depth: nothing of the well ever cuts into him, R1-T12). */
export type VoxelFrame = { cam: VoxelCam; cubes: Cube[]; hero: Cube[]; ghost: WellFrame['ghost']; walls: number; floorMix: number; floorReach: number; hud: ArcadeFrame['hud']; flat: number };

/**
 * The voxel bar at f: the arcade's last frame stood up as cubes (extruding from 0 on 13.1, so 13.1 is the flat picture), its furniture
 * (bunkers, ground, cannon, HUD) sinking into the playfield as the walls rise on 13.1&; the well; the mothership over it; the LINES readout
 * on the glass from the clear.
 */
export function voxelFrame(f: number): VoxelFrame {
  const cam = voxelCam(f);
  const w = wellAt(f);
  const a = arcadeAt(VOXEL.from - 1);
  const isCopy = (p: Px): boolean => p.id >= 200000 && p.id < 300000;
  const sink = smoothstep(WELL - 8, WELL + 2, f);
  const stood = (p: Px): Cube => {
    const d = extrudeAt(f, p.y);
    const h = p.h ?? p.s;
    return { x: wx(p.x + p.s / 2), y: wy(p.y + h / 2), z: d / 2 - 260 * sink * sink, sx: p.s * (1 - 0.6 * sink), sy: h * (1 - 0.6 * sink), sz: d, ink: p.ink, id: p.id };
  };
  const furniture = sink < 1 ? a.px.filter((p) => p.ink !== 'amber' && !isCopy(p)).map(stood) : [];
  const hero = mothershipCubes(f);
  const lines = struck(LINE_CLEAR, f) ? [{ text: 'LINES CF89', x: 1872, y: 30, size: 44, align: 1, ink: 'white' as Ink }] : [];
  // From the hard drop on he is drawn over everything (the burst has passed the lens by then); before it he stands in the world.
  const over = f >= VOXEL_MORPH.from - 0.25;
  return { cam, cubes: over ? [...furniture, ...w.cubes] : [...furniture, ...w.cubes, ...hero], hero: over ? hero : [], ghost: w.ghost, walls: w.walls, floorMix: w.floorMix, floorReach: w.floorReach, hud: lines, flat: 1 - clamp((f - VOXEL_MORPH.from) / 8) };
}

/**
 * voxelStateAt (contract §6.3, 1247 → 1248, for the Memphis set's memphisSolidsFrom): the pieces left in the well — type, cells (column,
 * row from the floor), ink, centre on screen — his block (centre and width on screen), the floor and the camera (isometric).
 */
export function voxelStateAt(f: number): { pieces: { type: PieceType; cells: [number, number][]; ink: Ink; centre: [number, number] }[]; hero: { centre: [number, number]; width: number }; floor: string; camera: { pitch: number; yaw: number; ortho: boolean } } {
  const cam = voxelCam(f);
  const lift = garbageLift(f);
  const pieces = PIECES.filter((p) => p !== I_PIECE).map((p) => {
    const rows = p.cells.map(([c, r]) => {
      const w = r + lift;
      return [c, w > 5.5 ? w - 4 : w] as [number, number];
    });
    const cx = rows.reduce((s, [c, r]) => s + wellCell(c, r)[0], 0) / rows.length;
    const cy = rows.reduce((s, [c, r]) => s + wellCell(c, r)[1], 0) / rows.length;
    return { type: p.type, cells: rows, ink: MEMPHIS[Math.floor(hash(p.id * 7 + p.cells[0][0], 3) * MEMPHIS.length)], centre: project(cam, [cx, cy, 30]) };
  });
  const s = mothershipScreen(f);
  return { pieces, hero: { centre: [960 + s.x, s.y], width: s.width }, floor: '#FFFFFF', camera: { pitch: 35.264, yaw: 45, ortho: true } };
}

// ——— Look, photography, segment —————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The well: the arcade's pixel grid holds through the tilt (the cabinet still), then thins to a light grain so the cubes' edges stay
 * crisp; the CRT crumbles away through the morph; bloom on his amber.
 */
export function voxelLook(f: number): Look {
  const m = clamp((f - VOXEL_MORPH.from + 0.25) / (VOXEL_MORPH.to - VOXEL_MORPH.from));
  const crumble = 1 - smoothstep(0, 0.9, m);
  const grid = lerp(1, 0.35, smoothstep(VOXEL_TILT.from + 4, VOXEL_TILT.to, f)) * crumble;
  const look: Look = { ...FLAT_LOOK, vignette: 0.3 * crumble, bloom: { intensity: 0.45 * crumble + 0.1, threshold: 0.62, smoothing: 0.2, radius: 0.6 } };
  if (grid > 0) look.pixel = { amount: grid, cell: GP, scanlines: 0.2 * crumble };
  if (crumble > 0) look.crt = { amount: 0.5 * crumble, curvature: 0.03, scanlines: 0, lines: 180, grille: 0 };
  return look;
}

/** 64 sub-frames on the tilt and the burst, 32 on the hard drops and the morph, 16 else. */
export function voxelTemporal(f: number): Temporal {
  if ((f >= VOXEL_TILT.from && f < VOXEL_TILT.from + 12) || (f >= LINE_CLEAR && f < LINE_CLEAR + GLOW + 12)) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (f >= VOXEL_MORPH.from || HARD_DROPS.some((d) => f >= d - 6 && f <= d)) return { samples: 32, shutter: 0.5, persistence: 0 };
  return { samples: 16, shutter: 0.5, persistence: 0 };
}

export const voxelSegment = (f: number): Segment => drop2Segment(f);
