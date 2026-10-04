// The RAIN bar (intro 2, S02R) and the rain sky over the highway (intro 3) as pure functions of the frame: the bars 1–14 design
// (notes/b112/final.md §3.2, §4.1; prototype b112/w/src/j2.js) and the build sheet (notes/b114/sheet.md §3.2, W1).
//
// The camera tilts up off the frozen log into six walls of falling kaomoji (the Matrix homage: vertical columns, a white-hot head,
// phosphor trails, flicker), dollies in, and cranes down onto the highway. A red scan plane sweeps the walls top to bottom and tags
// every glyph it crosses but one amber column: his bytes, `E2 80 A2 20 CF 89 20 E2 80 A2` (• ω •), complete on 162 = 0x00A2.
//
// World: x right, y forward (up the page), z up out of the page; the log page is the floor z = 0. The walls stand in x–z planes at
// y = RAIN_WORLD.walls, facing the camera. The rain's GlyphField and the scan lines' ShapeField are turned +90° about x
// (src/scenes/intro.ts), so their local (x, y, z) is the world's (x, z, −y): `cell()` writes that.
// Plain Node loads this file (tests): no three / remotion / react at runtime.
import { INTRO_THREADS, RAIN_CAMERA, RAIN_FACES, RAIN_FLANK_GLYPHS, RAIN_GLYPHS, RAIN_HUD, RAIN_INK, RAIN_WORLD, READOUT_SLOT, SCAN_PLANE, SIG_BYTES } from '../content/boot.ts';
import type { Pose, Vec3 } from '../engine/camera.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, prog, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD } from '../engine/temporal.ts';
import { CRANE, HIGHWAY_START, RAIN, RAIN_FACE_SPAWNS, RAIN_HUD_FADE, RAIN_NEAR_OUT, RAIN_SKY_OUT, RAIN_WAVES, SCAN_HUD_CELLS, SCAN_HUD_TYPE, SCAN_RAIN, SCAN_SHEEN, SIG_RAIN, ZERO_RAIN } from '../score/intro.ts';
import { INK, PALETTE } from '../worlds/terminal.ts';

const D2R = Math.PI / 180;
const THIRTY_SECOND = 3;

// ——— The camera ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A camera as a position and angles (degrees): pitch up from the horizontal, yaw right of +y, roll counter-clockwise on screen; `aim`
 * is how far ahead its Pose's target sits (only the direction matters to the scene; the energy audit reads it as the subject's distance).
 */
export type Euler = { x: number; y: number; z: number; pitch: number; yaw: number; roll: number; fov: number; aim?: number };

/** The default `aim`: wall 1's distance from the RAIN bar's camera. */
const AIM = 1100;

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** The camera's forward and (un-rolled) up for a pitch and yaw. */
const basis = (pitch: number, yaw: number): { f: Vec3; u: Vec3 } => {
  const p = pitch * D2R;
  const w = yaw * D2R;
  return { f: [Math.sin(w) * Math.cos(p), Math.cos(w) * Math.cos(p), Math.sin(p)], u: [-Math.sin(w) * Math.sin(p), -Math.cos(w) * Math.sin(p), Math.cos(p)] };
};

/** The Pose of an Euler camera (looking straight down, pitch −90°, its up is +y rolled: what aimPose gives S01). */
export function eulerPose(e: Euler): Pose {
  const { f, u } = basis(e.pitch, e.yaw);
  const r = cross(f, u);
  const c = Math.cos(e.roll * D2R);
  const s = Math.sin(e.roll * D2R);
  const aim = e.aim ?? AIM;
  return {
    position: [e.x, e.y, e.z],
    target: [e.x + f[0] * aim, e.y + f[1] * aim, e.z + f[2] * aim],
    up: [u[0] * c + r[0] * s, u[1] * c + r[1] * s, u[2] * c + r[2] * s],
    fov: e.fov,
  };
}

/** The angles of a Pose (its up taken square to the view, as three's lookAt does). */
export function poseEuler(p: Pose): Euler {
  const v: Vec3 = [p.target[0] - p.position[0], p.target[1] - p.position[1], p.target[2] - p.position[2]];
  const f = unit(v);
  const pitch = Math.asin(clamp(f[2], -1, 1)) / D2R;
  const yaw = Math.abs(f[0]) + Math.abs(f[1]) < 1e-12 ? 0 : Math.atan2(f[0], f[1]) / D2R;
  const { u } = basis(pitch, yaw);
  const r = cross(f, u);
  const k = dot(p.up, f);
  const up = unit([p.up[0] - k * f[0], p.up[1] - k * f[1], p.up[2] - k * f[2]]);
  return { x: p.position[0], y: p.position[1], z: p.position[2], pitch, yaw, roll: Math.atan2(dot(up, r), dot(up, u)) / D2R, fov: p.fov, aim: Math.hypot(...v) };
}

/** The prototype's damped spring (j2 `L`): 0 → 1, about 75 % three frames after release, a ~6 % overshoot, settled by about 12. */
export function tiltSpring(t: number): number {
  if (t <= 0) return 0;
  const z = 0.67;
  const w = 0.674;
  const d = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(d * t) + ((z * w) / d) * Math.sin(d * t));
}

/**
 * The dolly in (world units along +y): from intro 2.1&, 7 a frame, surging ×1.8 on each beat wave (intro 2.2 and 2.3, decaying τ 10):
 * the walls rush in on the beats. (The prototype's 4 a frame read as a hold: the cruise measured 7 of motion, the bar 11.5 against the
 * 13–16 its gate asks; the design's 9 a frame pushed his column off its place, which the camera's lock-on now holds — see lockYaw.)
 */
export const DOLLY = { speed: 7, surge: 0.8, tau: RAIN_CAMERA.surge.tau } as const;
export function rainDolly(frame: number): number {
  let d = DOLLY.speed * Math.max(0, frame - RAIN_FACE_SPAWNS[0]);
  for (const b of RAIN_WAVES) if (frame > b) d += DOLLY.speed * DOLLY.surge * DOLLY.tau * (1 - Math.exp(-(frame - b) / DOLLY.tau));
  return d;
}

/** The cruise's focal length in 1080p px (FOV 42°). */
const CRUISE_K = 540 / Math.tan((RAIN_CAMERA.fov[1] * D2R) / 2);
/** Wall 2's y and its column pitch: his column stands there. */
const SIG_WALL_Y = RAIN_WORLD.walls[RAIN_WORLD.sig.wall - 1];

/** His column's x on wall 2: the grid column nearest screen x +240 when its first byte prints (intro 2.1&), from the cruise with no yaw. */
export function sigColumnX(from: Euler): number {
  const d = SIG_WALL_Y - (from.y + rainDolly(SIG_RAIN[0]));
  const want = from.x + (RAIN_WORLD.sig.screenX * d) / CRUISE_K;
  const x0 = RAIN_X - HALF_WIDTH;
  return x0 + RAIN_WORLD.cols[1] * Math.round((want - x0) / RAIN_WORLD.cols[1]);
}

/**
 * The cruise's yaw (degrees): as it dollies in, the camera turns to keep his column at screen x +240 — the lens locks onto his bytes
 * while the scanner sweeps past them — eased in over the eighth round intro 2.1& (it is 5° right by 2.4).
 */
function lockYaw(frame: number, from: Euler, y: number): number {
  const w = prog(frame, SIG_RAIN[0] - 4, SIG_RAIN[0] + 8, ease.inOutSine);
  if (w === 0) return 0;
  const bearing = Math.atan2(sigColumnX(from) - from.x, SIG_WALL_Y - y);
  return (w * (bearing - Math.atan(RAIN_WORLD.sig.screenX / CRUISE_K))) / D2R;
}

/**
 * The RAIN bar's camera from `from` (S01's pose on intro 2.1, looking straight down at the log) to `land` (the highway's pose on intro
 * 3.1). Held at S01's position, it tilts up (a launch: pitch −92° → 0° after S01's 2° wind-up, 75 % in three frames, a small overshoot;
 * FOV 20 → 42 over the first eighth), then cruises in (the dolly surging on the beat waves, turning to keep his column in place); on intro 2.4 it cranes down
 * onto the highway — an impact, easing in from the cruise and landing exactly on `land` on intro 3.1.
 */
export function rainCamera(frame: number, from: Euler, land: Euler): Pose {
  const [, cruisePitch] = RAIN_CAMERA.pitch;
  const [fov0, fov1] = RAIN_CAMERA.fov;
  const wound = -90 - RAIN_CAMERA.windup;
  const cruise: Euler = {
    x: from.x,
    y: from.y + rainDolly(frame),
    z: from.z,
    pitch: wound + (cruisePitch - wound) * tiltSpring(frame - RAIN.from),
    yaw: lockYaw(frame, from, from.y + rainDolly(frame)),
    roll: 0,
    fov: lerp(fov0, fov1, prog(frame, RAIN.from, RAIN_FACE_SPAWNS[0], ease.inOutSine)),
    aim: from.aim ?? from.z,
  };
  if (frame < CRANE.from) return eulerPose(cruise);
  const u = clamp((frame - CRANE.from) / (CRANE.to - CRANE.from));
  // The descent lands firmly on intro 3.1 (a third of j2's impact: still dropping ~19 units a frame as it touches the floor's height,
  // where the dome's launch takes the bounce); the backing, the turn and the lens flow into the highway's own move (eased in and out:
  // v04's highway carries on from a camera coming to rest there, not from one still rushing back 130 units a frame).
  const e = u * u;
  const es = u * u * (3 - 2 * u);
  const eh = 0.35 * (e * (2 - e) * 0.3 + e * 0.7) + 0.65 * es;
  return eulerPose({
    x: lerp(cruise.x, land.x, es),
    y: lerp(cruise.y, land.y, es),
    z: lerp(cruise.z, land.z, eh),
    pitch: lerp(cruise.pitch, land.pitch, es),
    yaw: lerp(cruise.yaw, land.yaw, es),
    roll: lerp(cruise.roll, land.roll, es),
    fov: lerp(cruise.fov, land.fov, es),
    aim: lerp(cruise.aim ?? AIM, land.aim ?? AIM, es),
  });
}

// ——— The walls ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** x of the walls' middle: the highway's column (src/shots/intro.ts HIGHWAY_X). */
export const RAIN_X = -620;
/** Half the walls' width: RAIN_WORLD.x for the RAIN bar's own view, wider so the far walls fill the highway's 55° sky to its edges. */
const HALF_WIDTH = 4000;
const [WALL_Z0, WALL_Z1] = RAIN_WORLD.z;
/** Cell pitch down a column (world units); cell k (0 at the top) is centred at z = WALL_Z1 − PITCH·k − PITCH/2. */
const PITCH = 64;
const CELLS = Math.floor((WALL_Z1 - WALL_Z0) / PITCH) + 1;
const cellZ = (k: number): number => WALL_Z1 - PITCH * k - PITCH / 2;

/** The rain's capacity (glyphs a sub-frame), for its GlyphField. */
export const RAIN_CAPACITY = 12000;
/** The scan lines' capacity (shapes a sub-frame). */
export const SCAN_CAPACITY = 64;

/** A column of rain: its wall, x, speed (cells per 32nd), phase, cycle and trail (cells), em, and role (0 rain, 1 beside the signature, 2 the signature). */
type Column = { n: number; wall: number; x: number; speed: number; phase: number; cycle: number; trail: number; em: number; role: 0 | 1 | 2 };
type Wave = { n: number; column: Column; at: number; k: number };
type FaceColumn = { face: string; chars: string[]; wall: number; x: number; spawn: number; land: number; k0: number };
export type RainLayout = {
  columns: readonly Column[];
  /** The signature column (wall 2): x and its first cell. */
  sig: { x: number; k: number };
  waves: readonly Wave[];
  faces: readonly FaceColumn[];
};

const SPEEDS = RAIN_WORLD.speeds.map(([cells, frames]) => (cells * THIRTY_SECOND) / frames);
const COLUMNS: readonly Column[] = (() => {
  const out: Column[] = [];
  RAIN_WORLD.walls.forEach((_, wall) => {
    const step = RAIN_WORLD.cols[wall === 0 ? 0 : 1];
    for (let x = RAIN_X - HALF_WIDTH; x <= RAIN_X + HALF_WIDTH; x += step) {
      const n = out.length;
      out.push({
        n,
        wall,
        x,
        speed: SPEEDS[Math.floor(hash(n, 101) * SPEEDS.length)],
        phase: Math.floor(hash(n, 102) * 96),
        cycle: 56 + Math.floor(hash(n, 103) * 40),
        trail: RAIN_WORLD.trail[0] + Math.floor(hash(n, 104) * (RAIN_WORLD.trail[1] - RAIN_WORLD.trail[0] + 1)),
        em: lerp(RAIN_WORLD.px[0], RAIN_WORLD.px[1], hash(n, 105)),
        role: 0,
      });
    }
  });
  return out;
})();

/** Where a world point lands on screen (1080p px, origin the centre, y up) through `cam`, and its distance along the view; null behind it. */
export function project(cam: Pose, x: number, y: number, z: number): { sx: number; sy: number; depth: number } | null {
  const f = unit([cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]]);
  const k = dot(cam.up, f);
  const u = unit([cam.up[0] - k * f[0], cam.up[1] - k * f[1], cam.up[2] - k * f[2]]);
  const r = cross(f, u);
  const d: Vec3 = [x - cam.position[0], y - cam.position[1], z - cam.position[2]];
  const depth = dot(d, f);
  if (depth < 1) return null;
  const s = 540 / Math.tan((cam.fov * D2R) / 2) / depth;
  return { sx: dot(d, r) * s, sy: dot(d, u) * s, depth };
}

/** The highest cell of wall `wall` in view at `cam` (the top edge of the frame on the wall). */
function topCell(cam: Pose, wall: number): number {
  const e = poseEuler(cam);
  const top = (e.pitch + e.fov / 2) * D2R;
  const z = e.z + (RAIN_WORLD.walls[wall] - e.y) * Math.tan(top);
  return clamp(Math.floor((WALL_Z1 - z) / PITCH), 0, CELLS - 1);
}

/**
 * Builds the RAIN bar's layout from its camera `cam(f)`: the signature column where wall 2 shows at screen x +240 on intro 2.1& (its
 * neighbours drop • ω ･), the beat waves' columns (8 a wall, in view on their beat), and the 8 face columns (two an eighth, spread
 * across the frame, on walls 1–2, from their wall's top edge in view).
 */
export function rainLayout(cam: (frame: number) => Pose): RainLayout {
  const columns = COLUMNS.map((c) => ({ ...c }));
  const at108 = cam(SIG_RAIN[0]);
  const wall2 = columns.filter((c) => c.wall === RAIN_WORLD.sig.wall - 1);
  // His column: the one the camera locks onto (rainCamera), nearest screen x +240 as his first byte prints.
  const e96 = poseEuler(cam(RAIN.from));
  const sigX = sigColumnX({ ...e96, pitch: 0 });
  const sig = wall2.reduce((a, c) => (Math.abs(c.x - sigX) < Math.abs(a.x - sigX) ? c : a));
  sig.role = 2;
  for (const c of wall2) if (Math.abs(c.x - sig.x) === RAIN_WORLD.cols[1]) c.role = 1;
  const waves: Wave[] = [];
  for (const at of RAIN_WAVES) {
    const c = cam(at);
    RAIN_WORLD.walls.forEach((_, wall) => {
      const k = topCell(c, wall);
      columns
        .filter((col) => col.wall === wall && col.role === 0)
        .filter((col) => {
          const p = project(c, col.x, RAIN_WORLD.walls[wall], cellZ(k));
          return p !== null && Math.abs(p.sx) < 900;
        })
        .sort((a, b) => hash(a.n, at, 106) - hash(b.n, at, 106))
        .slice(0, RAIN_WORLD.waveHeads)
        .forEach((column, i) => waves.push({ n: 5000 + waves.length + i, column, at, k }));
    });
  }
  // Two faces an eighth (108, 120, 132, 144), alternating walls 1 and 2, spread across the frame (screen px at their spawn).
  const SX = [-640, 560, -330, 700, -90, -600, 600, -380];
  const faces: FaceColumn[] = RAIN_FACES.map((face, m) => {
    const spawn = RAIN_FACE_SPAWNS[Math.floor(m / 2)];
    const wall = RAIN_WORLD.faceWalls[m % 2] - 1;
    const c = cam(spawn);
    const e = poseEuler(c);
    const depth = RAIN_WORLD.walls[wall] - e.y;
    const chars = [...face];
    return {
      face,
      chars,
      wall,
      x: e.x + (SX[m] * depth * Math.tan((e.fov * D2R) / 2)) / 540,
      spawn,
      land: ZERO_RAIN + Math.round(2.5 * m),
      k0: topCell(c, wall) + chars.length,
    };
  });
  // His column hangs centred on the camera's height, so all ten bytes are in view from the first (108) through the completion (162).
  const sigTop = poseEuler(at108).z + (SIG_BYTES.length / 2) * PITCH;
  return { columns, sig: { x: sig.x, k: Math.round((WALL_Z1 - PITCH / 2 - sigTop) / PITCH) }, waves, faces };
}

// ——— Inks ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const HEAD: RGB = linear(RAIN_INK.head, RAIN_INK.headGain);
const TRAIL: RGB = linear(RAIN_INK.trail);
/** DEFENDER red on the terminal: the antivirus's tags, its scan plane, its readout's `[SCAN]` and ✓. */
export const DEFENDER_INK: RGB = linear('#E8402B', 1.7);
const SIG_INK: RGB = linear(PALETTE.amber, 1.7 * RAIN_WORLD.sig.amber);
/** The signature's bytes as atlas keys (two characters each, drawn whole). */
export const SIG_KEYS: readonly string[] = [...new Set(SIG_BYTES)];
const SIG_EM = 46;
const FACE_EM = 54;
/** A face's length along its column, in ems a character (the mono advance; its CJK marks run a little wider, its combining marks narrower). */
const FACE_ADVANCE = 0.62;
/** The faces' pink, a little hotter than the log's so a falling face reads over the rain. */
const FACE_INK: RGB = scaleRGB(INK.pink, 1.15);
const SPLASH = '✧°´';
const GLYPHS = [...RAIN_GLYPHS];
const FLANK = [...RAIN_FLANK_GLYPHS];

/** The 32nd a sub-frame instant shows (the rain steps on the 32nd grid, each step taken SWAP_LEAD early so a whole frame shows it). */
const step32 = (frame: number): number => Math.floor((frame + SWAP_LEAD) / THIRTY_SECOND);

/** The scan plane's height at `frame` (2600 → 0 over intro 2.3 → 2.3&), or null outside the sweep and its landing. */
export function scanZ(frame: number): number | null {
  if (frame < SCAN_RAIN.from || frame >= SCAN_SHEEN.to) return null;
  return WALL_Z1 * (1 - clamp((frame - SCAN_RAIN.from) / (SCAN_RAIN.to - SCAN_RAIN.from)));
}
/** Whether the scan plane has crossed height `z` within its last SCAN_PLANE.tagFrames frames (the glyph there flashes red). */
function tagged(frame: number, z: number): boolean {
  const now = scanZ(frame);
  if (now === null || frame >= SCAN_RAIN.to + SCAN_PLANE.tagFrames) return false;
  const before = scanZ(Math.max(SCAN_RAIN.from, frame - SCAN_PLANE.tagFrames)) ?? now;
  return z > now - SCAN_PLANE.reach && z < before + SCAN_PLANE.reach;
}

/** The near walls (1–2) fade out through the crane; the far ones (3–6) dim to the highway's sky over it. */
const nearFade = (frame: number): number => 1 - prog(frame, RAIN_NEAR_OUT.from, RAIN_NEAR_OUT.to, ease.linear);
const skyDim = (frame: number): number => prog(frame, RAIN_NEAR_OUT.from + 4, HIGHWAY_START, ease.inOutSine);

/** The rain's flares: its heads ×(1 + k) on the beat wave (intro 2.2) and, harder, on the all-clear (2.4: the scanner lets go), decaying τ 3 — the bar's accents with the scan on 2.3. */
export const RAIN_FLARES: readonly { at: number; k: number }[] = [
  { at: RAIN_WAVES[0], k: 1.2 },
  { at: ZERO_RAIN, k: 2 },
];
export const rainFlare = (frame: number): number => {
  let k = 1;
  for (const f of RAIN_FLARES) if (frame >= f.at - SWAP_LEAD) k += f.k * Math.exp(-Math.max(0, frame - f.at) / 3);
  return k;
};

/** The rain sky's beat on the highway (intro 3): 2/3 of its cap between the beats, the cap itself on each (up over 1.5 frames, τ 6). */
const skyBeat = (frame: number): number => {
  const t = (((frame - HIGHWAY_START) % 24) + 24) % 24;
  return 2 / 3 + (1 / 3) * smoothstep(0, 1.5, t) * Math.exp(-t / 6) / Math.exp(-1.5 / 6);
};

/**
 * Writes the rain at `frame` (seen through `cam`, for culling) into `out` from index `n`, in the rain field's local coordinates (world
 * x, z, −y), and returns the new count. The RAIN bar: all six walls, the beat waves, the face columns and their landings, the signature
 * column, the scan's red tags. The highway (intro 3, the sky): walls 3–6 only, their heads at ≤ 45 % and trails at ≤ 20 %, gone over
 * the whip's first sixteenth. Nothing before intro 2.1 or after the sky is gone.
 */
export function rainGlyphs(frame: number, L: RainLayout, cam: Pose, out: Glyph[], n = 0): number {
  if (frame < RAIN.from) return n;
  const sky = frame >= HIGHWAY_START;
  if (sky && (!INTRO_THREADS.rainSky || frame >= RAIN_SKY_OUT.to)) return n;
  const q = step32(frame);
  const skyOut = sky ? 1 - prog(frame, RAIN_SKY_OUT.from, RAIN_SKY_OUT.to, ease.linear) : 1;
  const dim = sky ? 1 : skyDim(frame);
  const near = sky ? 0 : nearFade(frame);
  // The sky twinkles on the highway's beats: its heads rest at two thirds of their cap and flare to it on each beat (≤ 45 % of the near rows).
  const beat = sky ? skyBeat(frame) : 1;
  const headSky = ((RAIN_INK.skyHead * INK.text[1]) / HEAD[1]) * beat;
  const trailSky = RAIN_INK.skyTrail * beat;
  const wallAlpha = (wall: number, head: boolean): number => {
    if (wall < 2) return near;
    const k = head ? headSky : trailSky;
    return skyOut * lerp(1, k, dim);
  };
  const cell = (ch: string, x: number, wall: number, z: number, em: number, color: RGB, alpha: number, rot = 0): void => {
    if (alpha < 0.004 || ch === ' ') return;
    out[n++] = { ch, x, y: z, z: -RAIN_WORLD.walls[wall], size: em, color, alpha, ...(rot ? { rot } : {}) };
  };
  const scanning = !sky && scanZ(frame) !== null;
  // The flares: on the beat wave (2.2) and on the all-clear (2.4) every head flashes white-hot and the trails brighten (τ 3).
  const f = sky ? 1 : rainFlare(frame);
  const headInk = f === 1 ? HEAD : scaleRGB(HEAD, f);
  const trailInk = f === 1 ? TRAIL : scaleRGB(TRAIL, 1 + 0.5 * (f - 1));
  // The walls' columns: a head stepping down on the 32nds, a trail above it re-rolling on 1 in 6 of the 32nds.
  for (const c of L.columns) {
    if (c.role === 2 || (sky && c.wall < 2)) continue;
    const headA = wallAlpha(c.wall, true);
    const trailA = wallAlpha(c.wall, false);
    if (headA < 0.004 && trailA < 0.004) continue;
    const p = project(cam, c.x, RAIN_WORLD.walls[c.wall], cam.position[2]);
    if (!p || Math.abs(p.sx) > 1100 + c.em * (540 / p.depth)) continue;
    const pool = c.role === 1 ? FLANK : GLYPHS;
    const head = (Math.floor(q * c.speed) + c.phase) % c.cycle;
    for (let i = 0; i < c.trail; i++) {
      const k = head - i;
      if (k < 0) break;
      if (k >= CELLS) continue;
      const z = cellZ(k);
      const roll = i === 0 ? q : Math.floor((q + Math.floor(hash(c.n, k, 107) * RAIN_WORLD.flicker)) / RAIN_WORLD.flicker);
      const ch = pool[Math.floor(hash(c.n, k, roll, 108) * pool.length)];
      if (scanning && tagged(frame, z)) cell(ch, c.x, c.wall, z, c.em, DEFENDER_INK, 1);
      else if (i === 0) cell(ch, c.x, c.wall, z, c.em, headInk, headA);
      else cell(ch, c.x, c.wall, z, c.em, trailInk, trailA * (RAIN_INK.trailAlpha[0] * (1 - i / c.trail) + RAIN_INK.trailAlpha[1]));
    }
  }
  if (sky) return n;
  // The beat waves: 8 new heads a wall together on intro 2.2 (and under the scan on 2.3), falling two cells a 32nd.
  for (const w of L.waves) {
    if (frame < w.at - SWAP_LEAD) continue;
    const a = wallAlpha(w.column.wall, true);
    const head = w.k + 2 * (q - step32(w.at));
    for (let i = 0; i < 12; i++) {
      const k = head - i;
      if (k < w.k) break;
      if (k >= CELLS) continue;
      const z = cellZ(k);
      const ch = GLYPHS[Math.floor(hash(w.n, k, i === 0 ? q : Math.floor(q / RAIN_WORLD.flicker), 109) * GLYPHS.length)];
      if (scanning && tagged(frame, z)) cell(ch, w.column.x, w.column.wall, z, w.column.em, DEFENDER_INK, 1);
      else cell(ch, w.column.x, w.column.wall, z, w.column.em, i === 0 ? headInk : trailInk, i === 0 ? a : wallAlpha(w.column.wall, false) * (RAIN_INK.trailAlpha[0] * (1 - i / 12) + RAIN_INK.trailAlpha[1]));
    }
  }
  // The face columns: whole faces falling sideways (the face turned 90° clockwise as one glyph, as kaomoji are set in vertical
  // Japanese text, so each column reads as a face), slow, in the log's pink, a short trail above them; landing on the floor through
  // the crane and splashing.
  for (const F of L.faces) {
    if (frame < F.spawn - SWAP_LEAD) continue;
    if (frame < F.land) {
      const k = Math.round(lerp(F.k0, CELLS - 1, clamp((q - step32(F.spawn)) / (step32(F.land) - step32(F.spawn)))));
      const length = FACE_ADVANCE * FACE_EM * F.chars.length;
      const bottom = cellZ(k) - PITCH / 2;
      const zc = bottom + length / 2;
      if (zc > WALL_Z0) {
        const tag = scanning && tagged(frame, zc);
        cell(F.face, F.x, F.wall, zc, FACE_EM, tag ? DEFENDER_INK : FACE_INK, tag ? 1 : near, -Math.PI / 2);
      }
      const top = Math.ceil(length / PITCH);
      for (let i = 1; i < 7; i++) {
        const kk = k - top - i + 1;
        if (kk < 0) break;
        const z = cellZ(kk);
        const ch = GLYPHS[Math.floor(hash(900 + i, kk, Math.floor(q / RAIN_WORLD.flicker), 110) * GLYPHS.length)];
        cell(ch, F.x, F.wall, z, RAIN_WORLD.px[0], scanning && tagged(frame, z) ? DEFENDER_INK : TRAIL, scanning && tagged(frame, z) ? 1 : near * 0.55 * (1 - i / 7));
      }
    } else {
      // The landing: three glyphs spray out of the face's cell at the floor and fade in 18 frames.
      const t = (frame - F.land) / 18;
      if (t >= 1) continue;
      for (let i = 0; i < 3; i++) {
        out[n++] = {
          ch: SPLASH[i],
          x: F.x + (i - 1) * 110 * t,
          y: 10 + 70 * Math.sin(Math.PI * t) * (1 - (i % 2) * 0.4),
          z: -(RAIN_WORLD.walls[F.wall] - 40 * t),
          size: 40,
          color: INK.pink,
          alpha: (1 - t) * near,
        };
      }
    }
  }
  // His column: one amber byte a sixteenth from intro 2.1&, top-down; never flickers, never tagged; it falls in the crane.
  if (frame >= SIG_RAIN[0] - SWAP_LEAD) {
    const fall = frame >= ZERO_RAIN ? Math.floor(26 * ease.inCubic(clamp((q * THIRTY_SECOND - ZERO_RAIN) / 20))) : 0;
    SIG_BYTES.forEach((b, i) => {
      if (frame < SIG_RAIN[i] - SWAP_LEAD) return;
      const k = L.sig.k + i + fall;
      if (k >= CELLS) return;
      cell(b, L.sig.x, RAIN_WORLD.sig.wall - 1, cellZ(k), SIG_EM, SIG_INK, near);
    });
  }
  return n;
}

// ——— The floor ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The fallen rain: a carpet of dim kaomoji parts lying flat on the floor between the page's far edge and wall 1 (world y, x half-width, pitch). */
export const FLOOR = { from: 560, to: 1260, half: 2400, pitch: 64, em: 46, alpha: [0.16, 0.34], sparkle: 0.06 } as const;
/** The floor glyphs' capacity (a sub-frame). */
export const FLOOR_CAPACITY = Math.ceil((FLOOR.to - FLOOR.from) / FLOOR.pitch + 1) * Math.ceil((2 * FLOOR.half) / FLOOR.pitch + 1);

/**
 * The rain that has landed, lying on the floor (z = 0) between the log page and wall 1, for the terminal's field (world coordinates,
 * flat on the page plane like the log): dim trail-green parts re-rolling on the 32nds, one in sixteen sparking white-hot as a drop lands.
 * The tilt sweeps across it from the page to the walls, so no frame of the whip looks at an empty floor; the crane lands past it; it
 * leaves with walls 1–2 (nothing from intro 3.1, so the highway's floor is v04's). Writes from index `n`; returns the new count.
 */
export function rainFloor(frame: number, out: Glyph[], n = 0): number {
  if (frame < RAIN.from || frame >= HIGHWAY_START) return n;
  const near = nearFade(frame);
  if (near < 0.004) return n;
  const q = step32(frame);
  let j = 0;
  for (let y = FLOOR.from; y <= FLOOR.to; y += FLOOR.pitch, j++) {
    let i = 0;
    for (let x = RAIN_X - FLOOR.half; x <= RAIN_X + FLOOR.half; x += FLOOR.pitch, i++) {
      if (hash(i, j, 120) < 0.25) continue;
      const roll = Math.floor((q + Math.floor(hash(i, j, 121) * RAIN_WORLD.flicker)) / RAIN_WORLD.flicker);
      const ch = GLYPHS[Math.floor(hash(i, j, roll, 122) * GLYPHS.length)];
      const spark = hash(i, j, q, 123) < FLOOR.sparkle;
      const a = lerp(FLOOR.alpha[0], FLOOR.alpha[1], hash(i, j, 124));
      out[n++] = { ch, x, y, size: FLOOR.em, color: spark ? HEAD : TRAIL, alpha: near * (spark ? 0.8 : a) };
    }
  }
  return n;
}

/** How many of his bytes are up at `frame` (the signature column; 10 = complete, on 162). */
export const sigBytesAt = (frame: number): number => SIG_RAIN.filter((f) => frame >= f - SWAP_LEAD).length;

/**
 * The scan plane where it cuts each wall (the rain field's local coordinates): a 4 px red line and its 40 px glow across the wall, from
 * the top down over intro 2.3 → 2.3&; on the floor it glows out over SCAN_SHEEN (the page scanned). Edge-on as it passes the camera's
 * height (about 150), every wall's line meets in one red line across the frame.
 */
export function scanLines(frame: number): Shape[] {
  const z = scanZ(frame);
  if (z === null) return [];
  const fade = frame < SCAN_SHEEN.from ? 1 : 1 - (frame - SCAN_SHEEN.from) / (SCAN_SHEEN.to - SCAN_SHEEN.from);
  const out: Shape[] = [];
  RAIN_WORLD.walls.forEach((y) => {
    for (const [h, a, soft] of [
      [SCAN_PLANE.glow, 0.07, SCAN_PLANE.glow / 2],
      [14, 0.18, 7],
      [SCAN_PLANE.line, 1, 0],
    ] as const) {
      out.push({ kind: 'rect', x: RAIN_X, y: Math.max(z, h / 2), z: -y, w: 2 * HALF_WIDTH, h, color: DEFENDER_INK, alpha: a * fade, ...(soft ? { soft } : {}) });
    }
  });
  return out;
}

// ——— The readout ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A run of the readout and its ink. */
export type HudRun = { text: string; ink: 'red' | 'bone' };

/** The rain's readout at output frame `frame` (verbatim, design §6.3), its alpha and its brightening, or null when it is not up. */
export function rainHudAt(frame: number): { runs: HudRun[]; alpha: number; bright: number } | null {
  if (frame < SCAN_HUD_TYPE.from || frame >= RAIN_HUD_FADE.to) return null;
  const name = RAIN_HUD.tag.slice('[SCAN] '.length);
  const typed = Math.min(name.length, Math.ceil(((frame - SCAN_HUD_TYPE.from + 1) / (SCAN_HUD_TYPE.to - SCAN_HUD_TYPE.from)) * name.length));
  const cells = SCAN_HUD_CELLS.filter((f) => f <= frame).length;
  const runs: HudRun[] = [
    { text: '[SCAN]', ink: 'red' },
    { text: ` ${name.slice(0, typed)} ${RAIN_HUD.cell.repeat(cells)}`, ink: 'bone' },
  ];
  if (frame >= ZERO_RAIN) runs.push({ text: RAIN_HUD.verdict.slice(0, -1), ink: 'bone' }, { text: '✓', ink: 'red' });
  const alpha = frame < RAIN_HUD_FADE.from ? 1 : 1 - (frame - RAIN_HUD_FADE.from) / (RAIN_HUD_FADE.to - RAIN_HUD_FADE.from);
  return { runs, alpha, bright: frame >= ZERO_RAIN ? 1 + Math.exp(-(frame - ZERO_RAIN) / 3) : 1 };
}

const HUD_GROUND: RGB = linear(READOUT_SLOT.ground);

/**
 * The readout as flat content in screen px (1080p, origin the centre, y up): JetBrains Mono 19 px left-aligned from the readout slot,
 * over its dark ground at 62 %. `advance` is the mono atlas's advance in ems. Null when nothing is up.
 */
export function rainHud(frame: number, advance: (ch: string) => number): FlatContent | null {
  const hud = rainHudAt(frame);
  if (!hud) return null;
  const px = READOUT_SLOT.px;
  const glyphs: Glyph[] = [];
  let x = READOUT_SLOT.x;
  for (const run of hud.runs) {
    const ink = scaleRGB(run.ink === 'red' ? DEFENDER_INK : INK.text, hud.bright);
    for (const ch of run.text) {
      const w = advance(ch) * px;
      if (ch !== ' ') glyphs.push({ ch, x: x + w / 2, y: READOUT_SLOT.y, size: px, color: ink, alpha: hud.alpha });
      x += w;
    }
  }
  const left = READOUT_SLOT.x - 10;
  const right = x + 10;
  return {
    under: [{ kind: 'rect', x: (left + right) / 2, y: READOUT_SLOT.y, w: right - left, h: 36, color: HUD_GROUND, alpha: READOUT_SLOT.groundAlpha * hud.alpha }],
    glyphs: { mono: glyphs },
    over: [],
  };
}

/** Every string the rain draws, for the intro's atlas (after v04's characters): its glyphs, its faces, his bytes, the readout, the splash. */
export const RAIN_ATLAS: readonly string[] = [RAIN_GLYPHS, ...RAIN_FACES, RAIN_HUD.tag, RAIN_HUD.cell, RAIN_HUD.verdict, SPLASH];
/** The rain's whole-string atlas keys (after the characters): his bytes and the 8 faces, each drawn as one glyph. */
export const RAIN_KEYS: readonly string[] = [...SIG_KEYS, ...RAIN_FACES];
