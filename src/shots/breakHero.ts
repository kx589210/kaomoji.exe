// The hero in the flat world, break bars 2–5 (src/score/break.ts FLAT), as pure functions of the frame. Owned by the flat builder (build
// sheet notes/break/break-sheet.md §2.4, §3 break bars 2–5, §4.5, §4.10). Layout px, degrees clockwise (src/shots/breakShared.ts).
//   - FRAGMENTS: his 36 face cells of the glass (SHARDS) in five groups — "(", ×L, ω, ×R, ")". A fragment is its cell inset by half
//     the seam gap along the cuts inside its group and reaching out elsewhere, drawn with its group's glyph from the expression
//     texture at its REST place, so every swap changes the glyph in every piece at once and the pieces always reassemble into the true
//     glyph. Each group's glyph lives in its own tile of the texture (TILES), so a wide eye never spills onto the ω's pieces.
//   - heroAt(f): every fragment's affine (rest → world) and seams, the tinted copies (the loop's echoes, the walk's onion skins), the
//     expression texture(s) and the rescan's clip, and from break 5.1 + 8 his plain glyph string;
//   - the moves: the slap (the fall's FACE_LANDING, from the sheet's formulas), the twitch, the iris and its lock (with E2's shard,
//     taken over edge-on on break 2.2a), the "(" loop, wrong slot and card flip, the ")" walk, E3's re-roll to tofu and the /dev/galaxy eye,
//     the rescan, the pop-out, the hang, the heal and the zip, the blink and break bar 5's faces;
//   - heroFx(f): what rides on him — trails, slabs, the ✓, the galaxy, the rescan bar, the tofu's kicked-off sides, glints, the ☆.
// v2 (sheet notes/bid2/break-sheet2.md §3): every function takes `v2` (default false: v04 exactly, the identity layer). v2 changes only
// what the design changes on him: E2's shard flies home to its slot's LIVE screen place under the travelling camera (§7.2); dizzy after
// the slam he wobbles ±4° (the floor tilts, the camera never rolls); the rescan bar is the antivirus's red; selected on 5.4& he is
// (⊙ω⊙), eyes popping (C6). partAt(f, part) gives his parts' places to the antivirus's hand and its POV.
// Faces come from src/content/castBreak.ts. Plain Node imports it (tests): no three / remotion / react imports.
import { SPARKLE, STAR, TICK, TOFU_ROWS } from '../content/break.ts';
import { HERO_FACES, HERO_FACES_V2 } from '../content/castBreak.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import {
  BLINK,
  CARD_FLIP,
  CLOSED_HATS,
  DIZZY,
  FAN,
  GALAXY,
  GHOST_SNARES,
  GLASS_HATS,
  GLINT,
  HEAL,
  HOPS,
  HOP_HOME,
  IMPACT,
  IRIS_CLOSE,
  IRIS_OPEN,
  LOCK,
  POP_OUT,
  RED_BLINK,
  RESCAN,
  REROLL,
  REVEAL,
  RIPPLE,
  SHARD_FLIGHT,
  SHARD_STAYS,
  SPIN_STOP,
  TOFU,
  TWITCH,
  WAVE,
  WIPE_COVER,
  BRACKET_LAUNCH,
  APEX,
  LOOP,
  SELECT,
  WOBBLE,
} from '../score/break.ts';
import { partFrame } from '../score/film.ts';
import { FACE_LANDING, shardAt } from './breakFall.ts';
import { SHARDS } from './glass.ts';
import {
  BREAK_PALETTE,
  type BreakColor,
  H,
  HERO_ADVANCE,
  HERO_EM,
  HERO_EM_WHOLE,
  type HeroPart,
  breakCam,
  flatCam,
  flatTime,
  flow,
  frameOf,
  impactSquash,
  lGlyph,
  lSegment,
  lShape,
  launchL,
  liveTime,
  snap,
  tighten,
  toScreen,
  HERO_REST,
} from './breakShared.ts';
import { grade, washAt } from './breakWorld.ts';

type V2 = readonly [number, number];
/** The break's bar `bar` (1-based) plus `beat` beats (0-based, may be fractional), as a film frame. */
const brk = (bar: number, beat = 0): number => partFrame('break', bar, beat);

// ——— Affine maps (layout px): x' = a·x + c·y + e, y' = b·x + d·y + f ————————————————————————————————————————————————————————————

export type Aff = readonly [number, number, number, number, number, number];
export const apply = (m: Aff, p: V2): [number, number] => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const compose = (a: Aff, b: Aff): Aff => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const chain = (...ms: Aff[]): Aff => ms.reduce(compose);
export const T = (x: number, y: number): Aff => [1, 0, 0, 1, x, y];
/** Clockwise on screen by `deg` (y down). */
export const R = (deg: number): Aff => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
};
export const S = (sx: number, sy = sx): Aff => [sx, 0, 0, sy, 0, 0];
const about = (p: V2, m: Aff): Aff => chain(T(p[0], p[1]), m, T(-p[0], -p[1]));
export const invert = (m: Aff): Aff => {
  const det = m[0] * m[3] - m[1] * m[2];
  const [a, b, c, d] = [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};
/** The flat shot camera as an affine map, world → screen (layout px); v2's travelling camera when `v2`. */
const camAff = (f: number, v2 = false): Aff => {
  const c = flatCam(f, v2);
  return chain(T(960, 540 + c.dy), R(c.roll), S(c.zoom), T(-c.cx, -c.cy));
};

// ——— The fragments ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

const GROUP_CELLS: Readonly<Record<HeroPart, readonly number[]>> = {
  mouth: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 25, 26, 27, 28],
  eyeL: [21, 22, 23, 36, 37, 38],
  eyeR: [29, 30, 44],
  open: [51, 52, 53],
  close: [45, 59],
};
const groupOf = (k: number): HeroPart | null => (Object.keys(GROUP_CELLS) as HeroPart[]).find((g) => GROUP_CELLS[g].includes(k)) ?? null;
/** The cell across each edge of cell k (−1: none), in SHARDS' vertex order. */
const neighbours = (k: number): number[] => {
  const r = Math.floor(k / 15);
  const i = k % 15;
  const at = (rr: number, ii: number) => (rr < 0 || rr > 4 ? -1 : rr * 15 + ((ii + 15) % 15));
  return r === 0 ? [at(0, i - 1), at(1, i), at(0, i + 1)] : [at(r, i - 1), at(r + 1, i), at(r, i + 1), at(r - 1, i)];
};

export type Fragment = { k: number; group: HeroPart; pts: readonly V2[]; c: V2; same: readonly boolean[] };
/** His 36 face cells: rest outline and centroid (layout px), and which edges are cuts inside his own group. */
export const FRAGMENTS: readonly Fragment[] = (Object.keys(GROUP_CELLS) as HeroPart[]).flatMap((group) =>
  GROUP_CELLS[group].map((k) => {
    const s = SHARDS[k];
    return {
      k,
      group,
      pts: s.pts.map(([x, y]) => [x + 960, 540 - y] as const),
      c: [s.c[0] + 960, 540 - s.c[1]] as const,
      same: neighbours(k).map((n) => n >= 0 && groupOf(n) === group),
    };
  }),
);
const FRAG = new Map(FRAGMENTS.map((f) => [f.k, f]));

/** How far a fragment reaches past the edges that are not cuts of its own group (px): room for wider eyes. */
const REACH = 220;
const lineX = (n1: V2, k1: number, n2: V2, k2: number): V2 | null => {
  const det = n1[0] * n2[1] - n1[1] * n2[0];
  if (Math.abs(det) < 1e-9) return null;
  return [(k1 * n2[1] - k2 * n1[1]) / det, (n1[0] * k2 - n2[0] * k1) / det];
};
/**
 * Fragment `fr`'s outline at seam gap `gap`: each cut inside its group moved in by gap / 2, every other edge moved out by up to REACH
 * (never so far that its neighbours' lines cross). `seams[i]` marks edge i (from pts[i] to pts[i + 1]) as a cut.
 */
export function fragPolygon(fr: Fragment, gap: number): { pts: V2[]; seams: boolean[] } {
  const n = fr.pts.length;
  const lines = fr.pts.map((a, i) => {
    const b = fr.pts[(i + 1) % n];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (nx * (fr.c[0] - a[0]) + ny * (fr.c[1] - a[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { n: [nx, ny] as V2, k: nx * a[0] + ny * a[1] };
  });
  const offsets = lines.map((ln, i) => {
    // The fifteen ω cells round the hit meet at one point: their cuts open less, or the ω's middle would be all seam.
    if (fr.same[i]) return (gap / 2) * (fr.k < 15 ? 0.35 : 1);
    const p = lines[(i - 1 + n) % n];
    const q = lines[(i + 1) % n];
    const x = lineX(p.n, p.k, q.n, q.k);
    const out = x ? ln.k - (ln.n[0] * x[0] + ln.n[1] * x[1]) : -1;
    return -(out > 0 ? Math.min(REACH, 0.8 * out) : REACH);
  });
  const pts = fr.pts.map((v, i) => {
    const p = lines[(i - 1 + n) % n];
    const q = lines[i];
    return lineX(p.n, p.k + offsets[(i - 1 + n) % n], q.n, q.k + offsets[i]) ?? v;
  });
  return { pts, seams: [...fr.same] };
}

/** The pivot of a group that moves as one (its ink centre at rest, break-sheet §4.3), or the face's centre. */
export const pivotOf = (g: HeroPart): V2 => (g === 'open' ? [397, 562] : g === 'close' ? [1522, 562] : [960, 540]);

// ——— Landing, slots, errors ———————————————————————————————————————————————————————————————————————————————————————————————————

/** The fall's landings (src/shots/breakFall.ts FACE_LANDING, Appendix B), imported read-only: one truth for the break 2.1 hand-off. */
const LANDING = new Map(FACE_LANDING.map((l) => [l.k, { at: l.centroid, angle: l.angle, mirrored: l.mirrored }]));
/** A core piece as the fall lands it on break 2.1 (Appendix B): centroid, clockwise angle, mirrored. */
export const coreLanding = (k: number): { at: V2; angle: number; mirrored: boolean } => LANDING.get(k)!;
const M: Aff = S(-1, 1);
/** Where each piece lies on break 2.1 (the fall's FACE_LANDING): rest → landed. */
const landAff = (fr: Fragment): Aff => {
  if (fr.group === 'open') return chain(T(170, 800), R(25), M, T(-397, -562));
  if (fr.group === 'close') return chain(T(1790, 920), R(-20), T(-1522, -562));
  const l = coreLanding(fr.k);
  return chain(T(l.at[0], l.at[1]), R(l.angle), l.mirrored ? M : S(1), T(-fr.c[0], -fr.c[1]));
};
/** The lock error of a piece seated in its slot (±1.5°). */
const lockError = (k: number): number => 1.5 * (2 * hash(k, 551) - 1);
/** Seated: its rest place 20 px lower, turned by its lock error about its centroid. */
const slotAff = (fr: Fragment): Aff => (fr.group === 'open' || fr.group === 'close' ? T(0, 20) : chain(T(fr.c[0], fr.c[1] + 20), R(lockError(fr.k)), T(-fr.c[0], -fr.c[1])));

/** The seam gap: 8 px, 4 from the dizzy slam, 2 from the rescan, 0 once he is whole. */
export const seamGap = (f: number): number => (f >= WIPE_COVER ? 0 : f >= RESCAN.from ? 2 : f >= DIZZY ? 4 : 8);

// ——— The face's own motion, once pieces sit in their slots ————————————————————————————————————————————————————————————————————————

/** v2: dizzy after the slam, he wobbles ±4° (1.5 wobbles over the beat, dying away): the world is crooked under him, the camera level. */
export const wobbleAt = (t: number): number => {
  if (t < WOBBLE.from || t >= WOBBLE.to) return 0;
  const u = (t - WOBBLE.from) / (WOBBLE.to - WOBBLE.from);
  return 4 * Math.sin((2 * Math.PI * (t - WOBBLE.from)) / 16) * (1 - u);
};
/** The lock's squash (1.06 wide / 0.94 tall about H, springing back over 12 f), the dizzy recoil (+12 px), a ±2 px living bob; v2 his wobble. */
const faceAff = (t: number, v2 = false): Aff => {
  const [sx, sy] = impactSquash(t - LOCK);
  const r = t - DIZZY;
  const recoil = r > 0 && r < 12 ? 12 * (r / 2) * Math.exp(1 - r / 2) * (1 - clamp((r - 8) / 4)) : 0;
  const bob = 2 * Math.sin((2 * Math.PI * (t - LOCK)) / 48);
  // break 3.2: the face looks up at the bracket hanging at its apex — 4° anticlockwise and back by 3.2&.
  const tilt = t >= APEX && t < APEX + 12 ? -4 * Math.sin((Math.PI * (t - APEX)) / 12) : 0;
  // In pain after the lock, (>ω<) throbs on each glass hat (a 3 % kick peaking 2 frames after it, gone in 12), and between the
  // throbs it breathes (±0.8 % a beat) until break 3.1, so the held face never stands still.
  const kick = (x: number) => (x >= 0 && x < 12 ? (x / 2) * Math.exp(1 - x / 2) * (1 - clamp((x - 8) / 4)) : 0);
  const breath = t >= LOCK && t < BRACKET_LAUNCH ? 0.008 * Math.sin((2 * Math.PI * (t - LOCK)) / 24) : 0;
  // R1-07b / R1-11: the eye pops out on break 4.3& and the face recoils 6 px away from it; the 4.3& ghost snare pops the face 4 %.
  const pain = 6 * kick(t - POP_OUT);
  const throb = 1 + breath + THROBS.reduce((s, a) => s + 0.03 * kick(t - a), 0) + 0.04 * kick(t - SNARE_POP);
  return chain(T(recoil + pain, bob), about(H, R(tilt + (v2 ? wobbleAt(t) : 0))), about(H, S(sx * throb, sy * throb)));
};

/** The pain throbs of break 2.3&–2.4& (on the glass hats). */
const THROBS: readonly number[] = [brk(2, 2.5), brk(2, 3), brk(2, 3.5)];
/** The ghost snare of break 4.3& + 6, which the dangling eye and the face answer (R1-11). */
const SNARE_POP = GHOST_SNARES.find((g) => g > POP_OUT)!;
/** A twitch on `at`: toward the slot (cubic-out 3 f), back (6 f). */
const twitchAt = (t: number, at: number): number => {
  const u = t - at;
  return u < 0 || u >= 9 ? 0 : u < 3 ? ease.outCubic(u / 3) : 1 - ease.inOutSine((u - 3) / 6);
};
/** The twitch of break 2.1&, the system's first attempt (every piece, 10 px). */
const twitch = (t: number): number => twitchAt(t, TWITCH);
/** The loose brackets' living hold (R1-11): 10 px on break 2.1&, then 6 px toward their slots on the 2.3& and 2.4& glass hats. */
const BRACKET_TWITCHES: readonly number[] = GLASS_HATS.filter((h) => h > TWITCH && h < BRACKET_LAUNCH);
const bracketTwitch = (t: number): number => 10 * twitch(t) + 6 * BRACKET_TWITCHES.reduce((s, h) => s + twitchAt(t, h), 0);
/** A held piece's ±2 px bob (break bar 2–3's loose brackets). */
const holdBob = (t: number, seed: number): number => 2 * Math.sin((2 * Math.PI * (t - IMPACT)) / (44 + 8 * seed));

// ——— The iris (break 2.2–2.3) ———————————————————————————————————————————————————————————————————————————————————————————————————————

const polar = (p: V2): [number, number] => [(Math.atan2(p[1] - H[1], p[0] - H[0]) * 180) / Math.PI, Math.hypot(p[0] - H[0], p[1] - H[1])];
const wrap180 = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;
/** The mirrored core pieces turn back the right way round over 6 frames, from 4 frames into the iris's close. */
const UNFLIP = IRIS_CLOSE.from + 4;
/** A core piece's centroid, own angle and horizontal flip during the iris (t from break 2.2 to 2.3). */
function irisPose(fr: Fragment, t: number): { p: V2; angle: number; sx: number; e: number } {
  const l = coreLanding(fr.k);
  const [aL, rL] = polar(l.at);
  const [aS, rS] = polar([fr.c[0], fr.c[1] + 20]);
  const sx = !l.mirrored ? 1 : t < UNFLIP ? -1 : t < UNFLIP + 6 ? -Math.cos((Math.PI * (t - UNFLIP)) / 6) : 1;
  if (t < IRIS_CLOSE.from) {
    const u = flow((t - IRIS_OPEN.from) / 12);
    const a = aL - 70 * u;
    const r = rL * (1 + 0.04 * u);
    return { p: [H[0] + r * Math.cos((a * Math.PI) / 180), H[1] + r * Math.sin((a * Math.PI) / 180)], angle: l.angle - 70 * u, sx, e: 0 };
  }
  const e = clamp((t - IRIS_CLOSE.from) / 12) ** 3;
  const d = 70 + wrap180(aS - aL);
  const a = aL - 70 + d * e;
  const r = lerp(1.04 * rL, rS, e);
  return { p: [H[0] + r * Math.cos((a * Math.PI) / 180), H[1] + r * Math.sin((a * Math.PI) / 180)], angle: lerp(l.angle - 70, lockError(fr.k), e), sx, e };
}
/** The iris trail of one piece: its path over the last 35 % of the close, trimming to nothing by break 2.3 + 4. */
function irisTrail(fr: Fragment, t: number): V2[] {
  if (t < IRIS_CLOSE.from || t >= LOCK + 4) return [];
  const eNow = clamp((t - IRIS_CLOSE.from) / 12) ** 3;
  const e0 = t < LOCK ? Math.max(0, eNow - 0.35) : 0.65 + 0.35 * clamp((t - LOCK) / 4);
  const l = coreLanding(fr.k);
  const [aL, rL] = polar(l.at);
  const [aS, rS] = polar([fr.c[0], fr.c[1] + 20]);
  const d = 70 + wrap180(aS - aL);
  const out: V2[] = [];
  for (let i = 0; i <= 10; i++) {
    const e = lerp(e0, eNow, i / 10);
    const a = ((aL - 70 + d * e) * Math.PI) / 180;
    const r = lerp(1.04 * rL, rS, e);
    out.push([H[0] + r * Math.cos(a), H[1] + r * Math.sin(a)]);
  }
  return out;
}

// ——— E2: the shard comes back through the screen (break 2.2& to 2.3; drawn here from 2.2a, edge-on) ————————————————————————————————————

/**
 * The shard (cell 37) as a screen-space map (break-sheet §4.5 E2): frozen on our side (its rest outline scaled 1.01707 about the frame's
 * centre) until break 2.2&, then its centroid on a quadratic Bézier through (480, 380) to its slot as the camera shows it on 2.3, progress
 * u³; scale-x 1 → 0.08 → 1 (edge-on on break 2.2a); a pop to 1.08 (L) relaxing as it flies; its angle to its lock error.
 */
export function shardScreen(t: number, v2 = false): { m: Aff; sx: number; centre: V2 } {
  // The one path both parts read: the fall's shardAt (src/shots/breakFall.ts), imported read-only.
  const fr = FRAG.get(37)!;
  const a = shardAt(Math.max(t, SHARD_STAYS))!;
  let c: V2 = a.c;
  let scale = a.scale;
  if (v2 && t >= SHARD_FLIGHT.from) {
    // v2 (sheet §7.2): the flight ends on the slot's LIVE screen place under the travelling camera. The fall's path aims at v04's slot
    // (breakCam on 2.3); its end weight e² is moved to the live slot (and its zoom), so the path leaves the glass exactly as the fall drew it.
    const e = clamp((t - SHARD_FLIGHT.from) / (SHARD_FLIGHT.to - SHARD_FLIGHT.from)) ** 3;
    const cam = flatCam(t, true);
    const live = toScreen(cam, fr.c[0], fr.c[1] + 20);
    c = [a.c[0] + e * e * (live[0] - V04_SLOT[0]), a.c[1] + e * e * (live[1] - V04_SLOT[1])];
    scale = a.scale + e * (cam.zoom - V04_SLOT_CAM.zoom);
  }
  const m = chain(T(c[0], c[1]), R(a.rot), S(a.scaleX * scale, scale), T(-fr.c[0], -fr.c[1]));
  return { m, sx: a.scaleX, centre: c };
}
/** v04's slot for the shard on screen (the fall aims at it: breakCam on 2.3, the rest centroid 20 px lower). */
const V04_SLOT_CAM = breakCam(SHARD_FLIGHT.to);
const V04_SLOT: V2 = (() => {
  const fr = FRAG.get(37)!;
  return toScreen(V04_SLOT_CAM, fr.c[0], fr.c[1] + 20);
})();

// ——— The "(" loop (break bar 3) ————————————————————————————————————————————————————————————————————————————————————————————————————

const bez3 = (a: V2, b: V2, c: V2, d: V2, u: number): V2 => {
  const v = 1 - u;
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
};
const OPEN_SLOT: V2 = [397, 582];
/**
 * The loop (R2-04): its top is the apex, (380, 180); radius 170 about (380, 350). A little smaller and lower than the sheet's (r 200
 * about (380, 330), apex y 130): with the camera's tilt (breakShared LOOP_TILT) the bracket hangs whole in the frame, and the path
 * stays ≥ 15 px clear of the ">" as it whips round.
 */
export const LOOP_PATH = { apex: [380, 180] as V2, centre: [380, 350] as V2, r: 170 } as const;
/** The "(" ink centre and its turn (degrees) on its flight, t from break 3.1 to 3.3: a climb that launches and slows to the apex, the loop, the dive. */
function loopPose(t: number): { p: V2; rot: number } {
  const { apex, centre, r } = LOOP_PATH;
  if (t < APEX) {
    const u = clamp((t - BRACKET_LAUNCH) / 24);
    const s = 1 - (1 - u) ** 2.4;
    return { p: bez3([170, 800], [160, 540], [apex[0] - 200, apex[1]], apex, s), rot: 25 * (1 - flow(u)) };
  }
  if (t < LOOP.to) {
    const u = clamp((t - LOOP.from) / 18);
    const th = 450 * 0.5 * (1 - Math.cos(Math.PI * u ** 1.35));
    const a = ((-90 + th) * Math.PI) / 180;
    return { p: [centre[0] + r * Math.cos(a), centre[1] + r * Math.sin(a)], rot: 0.8 * th };
  }
  const u = clamp((t - LOOP.to) / 6);
  const exit: V2 = [centre[0] + r, centre[1]];
  return { p: bez3(exit, [exit[0], exit[1] + 130], [exit[0] - 120, 510], OPEN_SLOT, u * u * u), rot: 360 };
}
const openLanded = (t: number): Aff => chain(T(170, 800 + holdBob(t, 0.5)), R(25), M, T(-397, -562));

/** The "(" group's map at clock t, and how far it has turned in the card flip (scale-x: −1 mirrored … 1 right). */
function openAff(t: number, twitchTo: V2 | null, v2 = false): { m: Aff; sx: number } {
  if (t < BRACKET_LAUNCH) {
    let m = openLanded(t);
    if (twitchTo) {
      const [x, y] = apply(m, [397, 562]);
      const d = Math.hypot(twitchTo[0] - x, twitchTo[1] - y) || 1;
      const k = bracketTwitch(t);
      m = compose(T((k * (twitchTo[0] - x)) / d, (k * (twitchTo[1] - y)) / d), m);
    }
    return { m, sx: -1 };
  }
  if (t < DIZZY) {
    const { p, rot } = loopPose(t);
    return { m: chain(T(p[0], p[1]), R(rot), M, T(-397, -562)), sx: -1 };
  }
  const face = faceAff(t, v2);
  if (t < CARD_FLIP.from) {
    const [a, c] = impactSquash(t - DIZZY);
    return { m: chain(face, T(397, 582), S(c, a), M, T(-397, -562)), sx: -1 };
  }
  if (t < CARD_FLIP.to) {
    const s = 1 - 2 * ease.inOutCubic((t - CARD_FLIP.from) / 6);
    return { m: chain(face, T(397, 582), S(-s, 1), T(-397, -562)), sx: -s };
  }
  const [a, c] = impactSquash(t - CARD_FLIP.to, 0.04);
  return { m: chain(face, T(397, 582), S(a, c), T(-397, -562)), sx: 1 };
}

// ——— The ")" walk (break bar 4) ————————————————————————————————————————————————————————————————————————————————————————————————————————

const CLOSE_FROM: V2 = [1790, 920];
const CLOSE_SLOT: V2 = [1522, 582];
const STEP: V2 = [(CLOSE_SLOT[0] - CLOSE_FROM[0]) / 9, (CLOSE_SLOT[1] - CLOSE_FROM[1]) / 9];
/** The ")" ink centre and turn during the walk: hops 1–8 on the 16ths (2-frame snaps, 14 px arcs, ±8° rocks, unwinding 2.2° each), hop 9 cubic-in onto the clap. */
function walkPose(t: number): { p: V2; rot: number } {
  if (t < HOPS[0]) return { p: [CLOSE_FROM[0], CLOSE_FROM[1] + holdBob(t, 1.3)], rot: -20 };
  if (t < HOP_HOME - 2) {
    const k = Math.min(7, Math.floor((t - HOPS[0]) / 6));
    const h = t - HOPS[k];
    const u = snap(h, 2);
    const rock = (k % 2 === 0 ? 8 : -8) * Math.sin(Math.PI * clamp(h / 4));
    return { p: [CLOSE_FROM[0] + (k + u) * STEP[0], CLOSE_FROM[1] + (k + u) * STEP[1] - 14 * Math.sin(Math.PI * clamp(h / 2))], rot: -20 + 2.2 * (k + u) + rock };
  }
  if (t < HOP_HOME) {
    const u = ease.inCubic(clamp((t - (HOP_HOME - 2)) / 2));
    return { p: [CLOSE_FROM[0] + (8 + u) * STEP[0], CLOSE_FROM[1] + (8 + u) * STEP[1]], rot: lerp(-20 + 17.6, 0, u) };
  }
  // Landed with a 10 px overshoot toward H, settling over 6 frames.
  const o = 10 * Math.sin(Math.PI * clamp((t - HOP_HOME) / 6));
  const d = Math.hypot(H[0] - CLOSE_SLOT[0], H[1] - CLOSE_SLOT[1]);
  return { p: [CLOSE_SLOT[0] + (o * (H[0] - CLOSE_SLOT[0])) / d, CLOSE_SLOT[1] + (o * (H[1] - CLOSE_SLOT[1])) / d], rot: 0 };
}
function closeAff(t: number, twitchTo: V2 | null, v2 = false): Aff {
  if (t < HOPS[0]) {
    let m = chain(T(CLOSE_FROM[0], CLOSE_FROM[1] + holdBob(t, 1.3)), R(-20), T(-1522, -562));
    if (twitchTo) {
      const [x, y] = apply(m, [1522, 562]);
      const d = Math.hypot(twitchTo[0] - x, twitchTo[1] - y) || 1;
      const k = bracketTwitch(t);
      m = compose(T((k * (twitchTo[0] - x)) / d, (k * (twitchTo[1] - y)) / d), m);
    }
    return m;
  }
  const { p, rot } = walkPose(t);
  const m = chain(T(p[0], p[1]), R(rot), T(-1522, -562));
  return t >= HOP_HOME ? compose(faceAff(t, v2), T(p[0] - CLOSE_SLOT[0], p[1] - CLOSE_SLOT[1] + 20)) : m;
}

// ——— Break bar 5: whole ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His horizontal stretch: 1.3 until break 5.1, flowing to 1.0 by 5.1& (the un-squash). */
export const stretchAt = (f: number): number => (f < REVEAL ? 1.3 : 1.3 - 0.3 * flow((f - REVEAL) / (HEAL.to - HEAL.from)));
/** Break bar 5's whole face as a map of the rest layout: em 360 → 414, stretch 1.3 → the current one, about (960, 540). */
const wholeAff = (f: number): Aff => about([960, 540], S((HERO_EM_WHOLE / HERO_EM) * (stretchAt(f) / 1.3), HERO_EM_WHOLE / HERO_EM));
/** The zip: seams show only farther than this from the ω's centre (rest px): ω over break 5.1's first 2 frames, eyes the next 3, brackets the 3 after. */
const zipRadius = (f: number): number =>
  f < REVEAL ? 0 : f < REVEAL + 2 ? lerp(0, 200, (f - REVEAL) / 2) : f < REVEAL + 5 ? lerp(200, 480, (f - (REVEAL + 2)) / 3) : f < REVEAL + 8 ? lerp(480, 720, (f - (REVEAL + 5)) / 3) : 2000;

// ——— The heroAt frame ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** One fragment draw: piece k at map `m` (rest → world layout px); `tint` paints its glyph flat (a copy) instead of its texture. */
export type FragDraw = {
  k: number;
  m: Aff;
  gap: number;
  seam: 'ink' | 'white';
  seamWidth: number;
  /** Seams show only beyond this distance (rest px) from the face's centre (the zip). */
  zip: number;
  tint: RGB | null;
  alpha: number;
};
/** One glyph of his expression texture: drawn at its REST place (layout px) in its group's tile. */
export type TexGlyph = { group: HeroPart; ch: string; x: number; y: number; size: number; stretch: number; sy: number; rot: number; fill: RGB; outline: RGB; outlinePx: number };
/** E3's tofu box in the ×R tile: a cream box with a thick ink outline and the code point in two rows. */
export type TexTofu = { x: number; y: number; w: number; h: number; outlinePx: number; scale: number; rows: readonly [string, string]; digitSize: number };
export type HeroTex = { key: string; glyphs: TexGlyph[]; tofu: TexTofu | null };
/** A glyph of the whole hero (break 5.1 + 8 on): layout px, his amber with an 8 px ink outline; the scene adds the (14, 14) shadow. */
export type HeroGlyph = { ch: string; x: number; y: number; size: number; stretch: number; sy: number; rot: number };
export type HeroFrame = {
  /** His pieces, back to front (empty once he is drawn whole). */
  frags: FragDraw[];
  /** Flat copies of a group drawn under him: the loop's echoes, the walk's onion skins. */
  tints: FragDraw[];
  tex: HeroTex;
  /** The rescan (break 4.3): pieces below world y `clipY` show `texNew`, above it `tex`. */
  texNew: HeroTex | null;
  clipY: number;
  /** His plain glyph string from break 5.1 + 8 (null before). */
  glyphs: HeroGlyph[] | null;
  wash: number;
  /** The cream keyline outside his ink outline (px; 0: none). */
  keyline: number;
  /** The plate his copies are clipped by while he wears the keyline (R2-03), or null. */
  plate: HeroPlate | null;
};
/** The flying "(" keyline (px, outside its 8 px ink outline; R2-04). */
const LOOP_KEYLINE = 6;

/**
 * The ink box of each glyph of his break-bar-5 faces (and his eyes of break bars 2–4), in ems about its placement point (the advance box's
 * centre, Canvas text-middle; layout y down): [left, right, top, bottom]. Measured from M PLUS Rounded 1c ExtraBold
 * (public/fonts/mplus-rounded-1c-extrabold.ttf, opentype bounding boxes; text-middle = (hhea ascender 1.075 − descender 0.32) / 2 =
 * 0.3775 em over the baseline, as the sheet's ω ink centre 0.12 em below its placement confirms).
 */
const MIDDLE = 0.3775;
const ink = (adv: number, x1: number, x2: number, y1: number, y2: number): readonly [number, number, number, number] => [x1 - adv / 2, x2 - adv / 2, MIDDLE - y2, MIDDLE - y1];
export const INK_EM: Readonly<Record<string, readonly [number, number, number, number]>> = {
  '(': ink(0.412, 0.061, 0.377, -0.185, 0.77),
  ')': ink(0.412, 0.036, 0.351, -0.185, 0.77),
  ω: ink(0.822, 0.046, 0.776, -0.01, 0.52),
  '•': ink(0.526, 0.116, 0.41, 0.218, 0.512),
  '⌒': ink(1, 0.05, 0.95, 0.601, 0.837),
  '☆': ink(1, 0.068, 0.932, -0.008, 0.816),
  '≧': ink(0.756, 0.081, 0.675, -0.087, 0.69),
  '≦': ink(0.756, 0.081, 0.675, -0.087, 0.69),
  '*': ink(0.512, 0.041, 0.471, 0.336, 0.75),
  '－': ink(1, 0.163, 0.837, 0.296, 0.424),
  '>': ink(0.689, 0.086, 0.633, 0.013, 0.567),
  '<': ink(0.689, 0.056, 0.603, 0.013, 0.567),
};

/**
 * R2-03: the plate behind him (world layout px) while his copies fan, wave and ripple: the hole-filled hull of his face core — a
 * rounded rect from his "(" to his ")" placement over every core glyph's ink, PLATE_MARGIN px above and below. The scene clips every
 * copy by it (the copy shader discards what falls inside), and his own glyphs, outline and cream keyline cover the rest of his
 * silhouette: the copies show only outside him, never through the gaps between his glyphs. Only the copies are clipped — the world's
 * blocks and the dancers behind him are untouched (a cream plate drawn over the world cut into the violet block).
 */
export type HeroPlate = { x0: number; y0: number; x1: number; y1: number; r: number };
/** The fan's copies tilt ≤ 1.8° + 0.9° (the wave) about a pivot 10 000 px up: ≤ 28 px of rise across his face, plus their 4 px outline. */
const PLATE_MARGIN = 36;
export function plateAt(f: number, v2 = false): HeroPlate | null {
  if (keylineAt(f) <= 0) return null;
  const core = faceCore(f, v2);
  if (core.length === 0) return null;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const g of core) {
    const [, , t, b] = INK_EM[g.ch] ?? [0, 0, -0.5, 0.5];
    y0 = Math.min(y0, g.y + t * g.size * g.sy);
    y1 = Math.max(y1, g.y + b * g.size * g.sy);
  }
  return { x0: core[0].x, x1: core[core.length - 1].x, y0: y0 - PLATE_MARGIN, y1: y1 + PLATE_MARGIN, r: 48 };
}

const C = (name: BreakColor, f: number): RGB => grade(BREAK_PALETTE[name], washAt(f));

/** His glyph placements at rest (layout px; the eye-substitution rule keeps every eye on the × slots): typeset like the glass's face. */
export function restPlacement(advance: Advance = defaultAdvance): Record<HeroPart, number> {
  const line = typeset(HERO_FACES.dying, advance);
  const across = HERO_EM * 1.3;
  const x = (i: number) => 960 + (line.chars[i].x - line.width / 2) * across;
  return { open: x(0), eyeL: x(1), mouth: x(2), eyeR: x(3), close: x(4) };
}
const defaultAdvance: Advance = (ch) => (HERO_ADVANCE as Record<string, number>)[ch] ?? ([...'＠◎⊙●－☆⌒≧≦'].includes(ch) ? 1 : 0.6);
let advance: Advance = defaultAdvance;
/** The scene hands over the hero atlas's measured advances (tests keep the sheet's measured values). */
export const setHeroAdvance = (a: Advance): void => {
  advance = a;
};

/** Each group's tile in the expression texture: a TILE × TILE square of rest layout around its glyph, laid out 3 × 2. */
export const TILE = 640;
export const TILE_SHEET = { w: 3 * TILE, h: 2 * TILE } as const;
const TILE_CELL: Readonly<Record<HeroPart, V2>> = { open: [0, 0], eyeL: [1, 0], mouth: [2, 0], eyeR: [0, 1], close: [1, 1] };
/** Group g's tile: the rest-layout rectangle it holds (x0, y0, size) and where that sits in the sheet (sx, sy). */
export function tileOf(g: HeroPart): { x0: number; y0: number; sx: number; sy: number } {
  const x = restPlacement(advance)[g];
  return { x0: x - TILE / 2, y0: 560 - TILE / 2, sx: TILE_CELL[g][0] * TILE, sy: TILE_CELL[g][1] * TILE };
}

/** His eyes at instant `f` (taken at the output frame): left and right ('tofu' for E3's box). */
export function eyesAt(f: number): [string, string] {
  const t = flatTime(frameOf(f));
  if (t >= BLINK && t < FAN) return ['•', '•'];
  if (t >= FAN && t < WAVE) return ['☆', '☆'];
  if (t >= WAVE && t < RIPPLE) return ['⌒', '⌒'];
  if (t >= RIPPLE) return ['≧', '≦'];
  if (t >= RESCAN.from) return ['－', '－'];
  if (t >= TOFU) return ['•', 'tofu'];
  const r = REROLL.filter((s) => t >= s).length;
  if (r > 0) {
    const e = [...HERO_FACES.reroll[r - 1]][1];
    return [e, e];
  }
  if (t >= DIZZY) return ['＠', '＠'];
  if (t >= LOCK) return ['>', '<'];
  return ['×', '×'];
}

/** His eyes squeeze on break 2.4 (for 8 frames). */
const SQUEEZE = brk(2, 3);
/** The ＠ eyes' spin: −360° a beat from the dizzy slam, slowing to a stop over break 4.1–4.2. */
const spinAt = (t: number): number => {
  if (t < DIZZY) return 0;
  if (t < SPIN_STOP.from) return -15 * (t - DIZZY);
  const u = clamp((t - SPIN_STOP.from) / 24);
  return -720 - 15 * 24 * (u - (u * u) / 2);
};

/** The expression texture at instant `f`, or the face of the rescan's lower half (`dazed`). */
function texAt(f: number, dazed = false): HeroTex {
  const t = flatTime(f);
  const out = frameOf(f);
  const x = restPlacement(advance);
  const ink = C('ink', f);
  const white = C('white', f);
  const amber = C('amber', f);
  const red = C('red', f);
  const whole = f >= WIPE_COVER;
  const outlinePx = whole ? (8 * HERO_EM) / HERO_EM_WHOLE : 8;
  const flashOutline = out === IMPACT;
  // During the rescan the upper half is the tofu face with its box knocked off (the galaxy is that eye now). Taken at the output
  // frame, like every swap (R1-02b): no sub-frame of the break 4.3 clap may show the dazed face unmasked or the box half there.
  const rescanning = out >= RESCAN.from && out < RESCAN.to;
  const [el, er] = dazed || whole ? ['－', '－'] : rescanning ? ['•', 'none'] : eyesAt(f);
  const glyphs: TexGlyph[] = [];
  const put = (group: HeroPart, ch: string, o: Partial<TexGlyph> = {}) =>
    glyphs.push({ group, ch, x: x[group], y: 540, size: HERO_EM, stretch: 1.3, sy: 1, rot: 0, fill: amber, outline: flashOutline ? white : ink, outlinePx, ...o });
  // "(": red while it is the wrong piece (blinking 3/3 f from break 3.3&, steady through the flip), swelling to 10 px edge-on.
  let openOutline = flashOutline ? white : ink;
  let openPx = outlinePx;
  if (t >= RED_BLINK && t < CARD_FLIP.to) {
    const on = t >= CARD_FLIP.from || Math.floor((t - RED_BLINK) / 3) % 2 === 0;
    if (on) {
      openOutline = red;
      openPx = t >= CARD_FLIP.from ? 8 + 2 * (1 - Math.abs(1 - 2 * ease.inOutCubic((t - CARD_FLIP.from) / 6))) : 6;
    }
  }
  // R2-04: in flight (launch → slam) the "(" wears a 6 px cream keyline outside its ink outline, as he does in break bar 5, so the amber
  // bracket stays one clean silhouette over the yellow block it loops past. Taken at the output frame (on the kick, off on the slam).
  if (out >= BRACKET_LAUNCH && out < DIZZY) put('open', '(', { fill: C('cream', f), outline: C('cream', f), outlinePx: outlinePx + LOOP_KEYLINE });
  put('open', '(', { outline: openOutline, outlinePx: openPx });
  put('mouth', 'ω');
  put('close', ')');
  // The eyes: squeezed on break 2.4, spinning ＠, popping 1.08 on each re-roll swap; any eye wider than × is narrowed to the × slot.
  const fit = (ch: string) => 1.3 * Math.min(1, 0.62 / Math.max(0.3, advance(ch)));
  const squeeze = t >= SQUEEZE && t < SQUEEZE + 8 ? 0.85 + 0.15 * ease.outCubic((t - SQUEEZE) / 8) : 1;
  const popped = [...REROLL, TOFU].includes(out) ? 1.08 : 1;
  const spin = el === '＠' ? spinAt(t) : 0;
  const eye = (group: HeroPart, ch: string) => put(group, ch, { size: HERO_EM * popped, stretch: fit(ch), sy: squeeze, rot: spin });
  eye('eyeL', el);
  let tofu: TexTofu | null = null;
  if (er === 'tofu') {
    // E3: the tofu box — a drawn shape, never a missing glyph — with •'s code point; it pops (1.08) and settles outBack over 6 f.
    const k = t - TOFU;
    const settle = k < 1 ? 1.08 : 1 + 0.08 * (1 - ease.outBack(clamp((k - 1) / 6)));
    if (out < RESCAN.from) tofu = { x: x.eyeR, y: 552, w: 0.5 * HERO_EM * 1.3, h: 0.78 * HERO_EM, outlinePx: 0.055 * HERO_EM, scale: settle, rows: TOFU_ROWS, digitSize: 0.24 * HERO_EM };
  } else if (er !== 'none') eye('eyeR', er);
  const key = JSON.stringify([glyphs.map((g) => [g.ch, g.size, g.stretch, g.sy, g.rot, g.outline, g.outlinePx, g.fill]), tofu]);
  return { key, glyphs, tofu };
}

/** Every piece's map at clock t (layout px) and whether it is drawn now. */
function pieceAff(fr: Fragment, f: number, t: number, v2 = false): Aff | null {
  if (f >= WIPE_COVER) return wholeAff(f);
  if (fr.group === 'open') return openAff(t, apply(slotAff(fr), [397, 562]), v2).m;
  if (fr.group === 'close') return closeAff(t, [1522, 582], v2);
  if (fr.k === 37) {
    // E2's shard: on our side of the screen (the fall draws it) until it turns edge-on on break 2.2a; then it is ours.
    if (t < SHARD_FLIGHT.from + 6) return null;
    if (t < LOCK) return compose(invert(camAff(t, v2)), shardScreen(t, v2).m);
    const seated = compose(faceAff(t, v2), slotAff(fr));
    if (t < POP_OUT) return seated;
    // break 4.3&: it pops out again (L: 60 px up-left, a quarter turn anticlockwise) and dangles, bobbing on the 16ths.
    const u = launchL(t - POP_OUT);
    const dangle = 3 * Math.sin((2 * Math.PI * (t - POP_OUT)) / 6) * clamp((t - POP_OUT) / 6);
    // The ghost snare kicks it 10 px down and out (R1-11), springing back.
    const k = t - SNARE_POP;
    const kick = k >= 0 && k < 12 ? 10 * (k / 1.5) * Math.exp(1 - k / 1.5) * (1 - clamp((k - 8) / 4)) : 0;
    const [cx, cy] = apply(seated, fr.c);
    return chain(T(cx - 42.4 * u - 0.6 * kick, cy - 42.4 * u + dangle + 0.8 * kick), R(-90 * u), T(-cx, -cy), seated);
  }
  if (t < IRIS_OPEN.from) {
    const land = landAff(fr);
    const [x, y] = apply(land, fr.c);
    const tw = twitch(t);
    if (tw === 0) return land;
    const d = Math.hypot(fr.c[0] - x, fr.c[1] + 20 - y) || 1;
    return compose(T((10 * tw * (fr.c[0] - x)) / d, (10 * tw * (fr.c[1] + 20 - y)) / d), land);
  }
  if (t < LOCK) {
    const p = irisPose(fr, t);
    return chain(T(p.p[0], p.p[1]), R(p.angle), S(p.sx, 1), T(-fr.c[0], -fr.c[1]));
  }
  return compose(faceAff(t, v2), slotAff(fr));
}

const fragDraw = (k: number, m: Aff, f: number, tint: RGB | null = null, alpha = 1): FragDraw => {
  const out = frameOf(f);
  const white = f >= WIPE_COVER || out === LOCK || out === LOCK + 1;
  return { k, m, gap: seamGap(f), seam: white ? 'white' : 'ink', seamWidth: f >= WIPE_COVER ? 2 : 2.5, zip: zipRadius(f), tint, alpha };
};

/** The hero at instant `f` (break bars 2–5). */
export function heroAt(f: number, v2 = false): HeroFrame {
  const t = liveTime(f);
  const wash = washAt(f);
  const tex = texAt(f);
  const out = frameOf(f);
  const rescanning = out >= RESCAN.from && out < RESCAN.to;
  const texNew = rescanning ? texAt(f, true) : null;
  const keyline = keylineAt(f);
  if (f >= HEAL.from + 8) return { frags: [], tints: [], tex, texNew: null, clipY: 1e9, glyphs: wholeGlyphs(f, v2), wash, keyline, plate: plateAt(f, v2) };
  const frags: FragDraw[] = [];
  let shard: FragDraw | null = null;
  // break 4.3&: the eye fragment pops out white for one frame, as the 2.1 slap's pieces did (R1-07b).
  const flash = out === POP_OUT ? C('white', f) : null;
  for (const fr of FRAGMENTS) {
    const m = pieceAff(fr, f, t, v2);
    if (!m) continue;
    const d = fragDraw(fr.k, m, f, fr.k === 37 ? flash : null);
    if (fr.k === 37 && t < LOCK) shard = d;
    else frags.push(d);
  }
  if (shard) frags.push(shard);
  return { frags, tints: f < WIPE_COVER ? tintsAt(f, t, v2) : [], tex, texNew, clipY: rescanning ? rescanY(f) : 1e9, glyphs: null, wash, keyline, plate: null };
}

/**
 * The cream keyline (px, outside his 8 px ink outline) that holds him apart from his copies while they fan, wave and ripple behind him
 * (R1-06): it grows in with the fan (3 f) and shrinks away as the last ripple dies, so the match cut sees him as break bar 6 draws him.
 */
export const keylineAt = (f: number): number => {
  if (f < FAN || f >= RIPPLE + 20) return 0;
  return 10 * Math.min(ease.outCubic(clamp((f - FAN) / 3)), 1 - ease.inOutSine(clamp((f - (RIPPLE + 12)) / 6)));
};

/** The loop's echoes (yellow, mint, coral at 2, 4, 6 f lag, each popping away 3 f after it reaches the slot) and the walk's onion skins. */
function tintsAt(f: number, t: number, v2 = false): FragDraw[] {
  const out: FragDraw[] = [];
  const open = FRAGMENTS.filter((q) => q.group === 'open');
  const close = FRAGMENTS.filter((q) => q.group === 'close');
  ([[2, 'yellow'], [4, 'mint'], [6, 'coral']] as const).forEach(([lag, color]) => {
    const tl = t - lag;
    if (tl < BRACKET_LAUNCH || tl >= DIZZY + 3) return;
    const m = tl < DIZZY ? openAff(tl, null, v2).m : openAff(DIZZY - 1e-3, null, v2).m;
    const s = tl < DIZZY ? 1 : 1 - clamp((tl - DIZZY) / 3);
    const [px, py] = apply(m, [397, 562]);
    for (const q of open) out.push(fragDraw(q.k, compose(about([px, py], S(s)), m), f, C(color, f)));
  });
  const colors: readonly BreakColor[] = ['yellow', 'violet', 'coral', 'cream'];
  [...HOPS, HOP_HOME - 2].forEach((s0, i) => {
    const h = t - s0;
    if (h < 0 || h >= 9) return;
    const m = closeAff(s0, null, v2);
    const s = h < 6 ? 1 : h < 7.5 ? 1 + 0.15 * ((h - 6) / 1.5) : 1.15 * (1 - (h - 7.5) / 1.5);
    const [px, py] = apply(m, [1522, 562]);
    for (const q of close) out.push(fragDraw(q.k, compose(about([px, py], S(s)), m), f, C(colors[i % 4], f)));
  });
  return out;
}

/** The rescan bar's centre line (world y): 720 → 440 at constant speed over break 4.3's 16th, then 40 px more as it fades. */
export const rescanY = (f: number): number => (f < RESCAN.to ? lerp(720, 440, clamp((f - RESCAN.from) / 6)) : lerp(440, 400, clamp((f - RESCAN.to) / 4)));

/** His bop on the first closed 16th after he wakes (break 5.1& + 6). */
const BOP = CLOSED_HATS.find((h) => h > BLINK)!;
/** The eyes his break-bar-5 faces wear, and the advance (ems) they are narrowed to. */
const EYE_CHARS = ['•', '☆', '⌒', '≧', '≦'];
const EYE_FIT = 0.66;
/** His whole face from break 5.1 + 8: the eyes stay on the × slots until he blinks; from then each face is typeset with the ω on (960, 540). */
function wholeGlyphs(f: number, v2 = false): HeroGlyph[] {
  const out = frameOf(f);
  const t = f;
  const s = stretchAt(f);
  const em = HERO_EM_WHOLE;
  const glyphs: HeroGlyph[] = [];
  // Break bar 5's beats squash him (4 %); awake, he also bops 3 % on break 5.1&'s closed 16th (R1-03).
  const squash = Math.max(impactSquash(t - BOP, 0.03)[0], ...[FAN, WAVE, RIPPLE].map((k) => impactSquash(t - k, 0.04)[0]));
  const bob = 2 * Math.sin((2 * Math.PI * (t - REVEAL)) / 48);
  const y = 540 + bob;
  if (out < BLINK) {
    const x = restPlacement(advance);
    const k = (em / HERO_EM) * (s / 1.3);
    const at = (g: HeroPart) => 960 + (x[g] - 960) * k;
    const fit = (ch: string) => Math.min(s, 1.3 * Math.min(1, 0.62 / Math.max(0.3, advance(ch))) * (s / 1.3));
    glyphs.push({ ch: '(', x: at('open'), y, size: em, stretch: s, sy: 1, rot: 0 });
    glyphs.push({ ch: '－', x: at('eyeL'), y, size: em, stretch: fit('－'), sy: 1, rot: 0 });
    glyphs.push({ ch: 'ω', x: at('mouth'), y, size: em, stretch: s, sy: 1, rot: 0 });
    glyphs.push({ ch: '－', x: at('eyeR'), y, size: em, stretch: fit('－'), sy: 1, rot: 0 });
    glyphs.push({ ch: ')', x: at('close'), y, size: em, stretch: s, sy: 1, rot: 0 });
    return glyphs;
  }
  // v2: selected on 5.4& — "uh-oh" — (⊙ω⊙), the face C6 carries into the editor (eyes popping 0.6 → 1.15 → 1, settled by the cut).
  const seated = v2 && out >= SELECT.from;
  const face = seated ? HERO_FACES_V2.seated : out < FAN ? HERO_FACES.awake : out < WAVE ? HERO_FACES.starstruck : out < RIPPLE ? HERO_FACES.wave : HERO_FACES.squee;
  // Wide eyes (☆ ⌒ ≧ ≦, all full-width) are narrowed to the eye slot, so every face stays one compact silhouette inside the frame.
  const narrow = (ch: string): number => (EYE_CHARS.includes(ch) ? Math.min(1, EYE_FIT / Math.max(0.3, advance(ch))) : 1);
  const line = typeset(face, (ch) => advance(ch) * narrow(ch));
  const w = line.chars.find((c) => c.ch === 'ω')!;
  const blink = t - (seated ? SELECT.from : BLINK);
  const eyeScale = blink < 0 || blink >= 8 ? 1 : blink < 3 ? 0.6 + 0.55 * ease.outCubic(blink / 3) : 1.15 - 0.15 * ease.inOutSine((blink - 3) / 5);
  for (const c of line.chars) {
    const x = 960 + (c.x - w.x) * em * s * squash;
    const isEye = (c.ch === '•' && out < FAN) || (seated && c.ch === '⊙');
    let g: HeroGlyph = { ch: c.ch, x, y, size: em * (isEye ? eyeScale : 1), stretch: s * squash * narrow(c.ch), sy: 1 / squash, rot: 0 };
    if (c.ch === 'ﾉ') {
      // The wave: +15° on break 5.3, −15° on 5.3e, about the hand's lower end.
      const k = t - WAVE;
      const rot = k < 0 ? 0 : k < 6 ? 15 * Math.sin((Math.PI * k) / 6) : k < 12 ? -15 * Math.sin((Math.PI * (k - 6)) / 6) : 0;
      const [px, py] = [x, y + 0.35 * em];
      const a = (rot * Math.PI) / 180;
      g = { ...g, x: px + Math.sin(a) * 0.35 * em, y: py - Math.cos(a) * 0.35 * em, rot };
    }
    glyphs.push(g);
  }
  return glyphs;
}

/** His face core (bracket to bracket, no hand) for the repeater's copies: the glyphs of his current face, as wholeGlyphs lays them out. */
export function faceCore(f: number, v2 = false): HeroGlyph[] {
  return wholeGlyphs(f, v2).filter((g) => g.ch !== 'ﾉ');
}

// ——— Effects that ride on him (layout px → engine shapes/glyphs) ————————————————————————————————————————————————————————————————

export type GalaxyState = { x: number; y: number; size: number; turn: number; wind: number };
/** E3's arc: from the upper right, through (1640, 260), to his right eye (world layout px). */
const ARC: readonly [V2, V2, V2] = [[1740, 120], [1640, 260], [1290, 582]];
const onArc = (e: number): V2 => [
  (1 - e) ** 2 * ARC[0][0] + 2 * (1 - e) * e * ARC[1][0] + e * e * ARC[2][0],
  (1 - e) ** 2 * ARC[0][1] + 2 * (1 - e) * e * ARC[1][1] + e * e * ARC[2][1],
];
/** The full spiral holds in his eye for a 32nd after the clap, turning, then winds in over a 16th (R1-02a). */
const WIND_FROM = GALAXY.to + 3;
/**
 * E3: drop 1's galaxy as a little spiral — streaking from (1740, 120) to his right eye on an arc (position u³, landing on the break 4.3
 * clap), growing 40 → 220 px across and turning ¾ on the way; it holds there whole, still turning, until break 4.3 + 3, then winds into the
 * eye (wind 0 → 1 over 6 f). After that it is a faint glint turning inside the dazed pill, gone by break 4.4.
 */
export function galaxyAt(f: number): GalaxyState | null {
  if (f < GALAXY.from || f >= GALAXY.to + 24) return null;
  const u = clamp((f - GALAXY.from) / 6);
  const e = u ** 3;
  const [x, y] = onArc(e);
  const wind = clamp((f - WIND_FROM) / 6);
  return { x, y, size: 40 + 180 * u * u, turn: 0.75 * e + (0.5 * Math.max(0, f - GALAXY.to)) / 24, wind };
}
const GALAXY_DOTS = 400;
const ARM = [linear('#8E6BFF'), linear('#FF6FB5'), linear('#7FB8FF')];
const SPACE = linear('#0B0C0E');
export type GalaxyDot = { x: number; y: number; size: number; color: RGB; alpha: number };
export type GalaxyParts = {
  /** The patch of space it is drawn on: a dark disc with an ink rim, so drop 1's colours pop on the mint ground as they did on black. */
  disc: { x: number; y: number; d: number; rim: number; color: RGB; alpha: number };
  dots: GalaxyDot[];
  /** The white streak behind it along its arc (capsules, 6 px at the head tapering to 0 at the tail). */
  trail: { x0: number; y0: number; x1: number; y1: number; w: number }[];
};
/**
 * The galaxy at instant `f` (R1-02a): two log-spiral arms of dots (r ∝ e^(0.22θ)), ≥ 4 px and opaque, the core white → #FFE2A0 and
 * blooming (HDR ×1.5), the arms violet / pink / blue, on a space-dark disc 1.15 × its size; a white streak trails it while it flies.
 * While it is small only every n-th dot is drawn, so the arms still read. Winding in, the arms (and the disc) shrink into its core;
 * after that a faint white glint of the spiral turns inside the pill.
 */
export function galaxyParts(f: number): GalaxyParts | null {
  const g = galaxyAt(f);
  if (!g) return null;
  const wash = washAt(f);
  const wound = f >= WIND_FROM + 6;
  // Winding: the arms' radius × (1 − w)², down to a 12 % core; the disc shrinks with them and fades over the last 40 % of the wind.
  const k = wound ? 0.12 : Math.max(0.12, (1 - g.wind) ** 2);
  const glint = wound ? 0.5 * (1 - clamp((f - (WIND_FROM + 6)) / (GALAXY.to + 24 - (WIND_FROM + 6)))) : 1;
  const disc = {
    x: g.x,
    y: g.y,
    d: wound ? 0 : 1.15 * g.size * (1 - g.wind) ** 2,
    rim: 3,
    color: SPACE,
    alpha: wound ? 0 : 1 - ease.inOutSine(clamp((g.wind - 0.6) / 0.4)),
  };
  const stride = wound ? 3 : Math.max(1, Math.ceil(170 / g.size));
  const dots: GalaxyDot[] = [];
  for (let i = 0; i < GALAXY_DOTS; i += stride) {
    const arm = i % 2;
    const s = Math.floor(i / 2) / (GALAXY_DOTS / 2);
    const th = 4 * Math.PI * s + arm * Math.PI + 0.25 * (hash(i, 801) - 0.5);
    const r0 = (Math.exp(0.22 * th) - 1) / (Math.exp(0.22 * 4 * Math.PI) - 1);
    const r = (0.04 + 0.96 * r0) * k * (g.size / 2) * (0.92 + 0.16 * hash(i, 802));
    const a = th + 2 * Math.PI * g.turn;
    const size = wound ? 3 : 5 + 4 * hash(i, 803);
    const core = s < 0.15;
    const color = wound ? scaleRGB([1, 1, 1], 1.3) : core ? scaleRGB(mixRGB([1, 1, 1], linear('#FFE2A0'), s / 0.15), 1.5) : ARM[Math.floor(hash(i, 804) * 3)];
    dots.push({ x: g.x + r * Math.cos(a), y: g.y + r * Math.sin(a), size, color: grade(color, wash), alpha: wound ? glint : 1 });
  }
  // The streak: the arc behind it from where it started (retracting into it over the 32nd it holds), tapering 6 → 0 px.
  const trail: GalaxyParts['trail'] = [];
  const head = clamp((f - GALAXY.from) / 6) ** 3;
  const tail = head * clamp((f - GALAXY.to) / 3);
  if (head - tail > 0.004) {
    const n = 16;
    for (let j = 0; j < n; j++) {
      const [x0, y0] = onArc(lerp(tail, head, j / n));
      const [x1, y1] = onArc(lerp(tail, head, (j + 1) / n));
      trail.push({ x0, y0, x1, y1, w: 6 * ((j + 1) / n) });
    }
  }
  return { disc, dots, trail };
}
function galaxyShapes(f: number, out: Shape[]): void {
  const g = galaxyParts(f);
  if (!g) return;
  const white = scaleRGB(C('white', f), 1.2);
  for (const t of g.trail) {
    const sgm = lSegment(t.x0, t.y0, t.x1, t.y1, t.w, white);
    if (sgm) out.push(sgm);
  }
  const d = g.disc;
  if (d.alpha > 0.01 && d.d > 1) {
    out.push(lShape({ kind: 'ellipse', x: d.x, y: d.y, w: d.d + 2 * d.rim, h: d.d + 2 * d.rim, color: C('ink', f), alpha: d.alpha }));
    out.push(lShape({ kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d, color: d.color, alpha: d.alpha }));
  }
  for (const dot of g.dots) out.push(lShape({ kind: 'ellipse', x: dot.x, y: dot.y, w: dot.size, h: dot.size, color: dot.color, alpha: dot.alpha }));
}

/** E3: the tofu box's four sides, kicked off as strokes when the galaxy hits it (L outward 40 px, fading over 9 f), from the clap's output frame on (R1-02b). */
export function tofuSides(f: number, v2 = false): { x0: number; y0: number; x1: number; y1: number; alpha: number }[] {
  if (frameOf(f) < RESCAN.from || f >= RESCAN.from + 9) return [];
  const t = liveTime(f);
  const k = f - RESCAN.from;
  const o = 40 * launchL(k);
  const a = clamp(1 - k / 9);
  const [cx, cy] = apply(compose(faceAff(t, v2), T(0, 20)), [restPlacement(advance).eyeR, 552]);
  const [hw, hh] = [0.25 * HERO_EM * 1.3, 0.39 * HERO_EM];
  return [
    { x0: cx - hw - o, y0: cy - hh, x1: cx - hw - o, y1: cy + hh, alpha: a },
    { x0: cx + hw + o, y0: cy - hh, x1: cx + hw + o, y1: cy + hh, alpha: a },
    { x0: cx - hw, y0: cy - hh - o, x1: cx + hw, y1: cy - hh - o, alpha: a },
    { x0: cx - hw, y0: cy + hh + o, x1: cx + hw, y1: cy + hh + o, alpha: a },
  ];
}

/** Everything that rides on him at instant `f`: shapes (layout → engine) under his tags, and glyphs in his own type. */
export function heroFx(f: number, v2 = false): { shapes: Shape[]; glyphs: Glyph[] } {
  const t = liveTime(f);
  const shapes: Shape[] = [];
  const glyphs: Glyph[] = [];
  const ink = C('ink', f);
  const white = C('white', f);
  // The iris trails: 3 px ink, the last 35 % of each path, trimming off by break 2.3 + 4.
  if (t >= IRIS_CLOSE.from && t < LOCK + 4) {
    for (const fr of FRAGMENTS) {
      if (fr.group === 'open' || fr.group === 'close' || fr.k === 37) continue;
      const pts = irisTrail(fr, t);
      for (let i = 1; i < pts.length; i++) {
        const s = lSegment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 3, ink);
        if (s) shapes.push(s);
      }
    }
  }
  // The "(" loop's trail: a 10 px round-capped ink stroke, the last 30 % of its flight, retracting over break 3.3 + 6.
  if (t >= BRACKET_LAUNCH && t < DIZZY + 6) {
    const end = Math.min(t, DIZZY);
    const start = t < DIZZY ? BRACKET_LAUNCH + 0.7 * (t - BRACKET_LAUNCH) : lerp(BRACKET_LAUNCH + 0.7 * (DIZZY - BRACKET_LAUNCH), DIZZY, (t - DIZZY) / 6);
    let prev: V2 | null = null;
    for (let i = 0; i <= 24; i++) {
      const p = loopPose(lerp(start, end, i / 24)).p;
      if (prev) {
        const s = lSegment(prev[0], prev[1], p[0], p[1], 10, ink);
        if (s) shapes.push(s);
      }
      prev = p;
    }
  }
  // Edge-on slabs: the "(" mid-flip and E2's shard turning back through the screen — a 10 px ink slab with a white edge line.
  const slab = (x: number, y: number, h: number, rot: number) => {
    shapes.push(lShape({ kind: 'rect', x, y, w: 10, h, r: 2, rot, color: ink }));
    shapes.push(lShape({ kind: 'rect', x: x + 3, y, w: 2, h: h - 8, rot, color: white }));
  };
  if (t >= CARD_FLIP.from && t < CARD_FLIP.to) {
    const { m, sx } = openAff(t, null, v2);
    if (Math.abs(sx) < 0.18) {
      const [x, y] = apply(m, [397, 562]);
      slab(x, y, 330, 0);
    }
  }
  if (t >= SHARD_FLIGHT.from + 6 && t < LOCK) {
    const s = shardScreen(t, v2);
    if (s.sx < 0.2) {
      const [x, y] = apply(invert(camAff(t, v2)), s.centre);
      slab(x, y, 250 / flatCam(t, v2).zoom, 0);
    }
  }
  // break 3.4&: the big green ✓ for the bracket that is finally right.
  if (t >= CARD_FLIP.to && t < brk(4) + 6) {
    const s = t < brk(4) ? launchL((t - CARD_FLIP.to) * 2) : 1 - ease.inCubic((t - brk(4)) / 6);
    glyphs.push(lGlyph({ ch: TICK, x: 330, y: 420, size: 60 * s, color: C('termGreen', f), outline: 0.08, outlineColor: ink }));
  }
  // E3: the tofu box's four sides kick off as strokes when the galaxy hits it; the galaxy rides over them, the rescan bar over both.
  for (const sd of tofuSides(f, v2)) {
    const sg = lSegment(sd.x0, sd.y0, sd.x1, sd.y1, 0.055 * HERO_EM, ink, sd.alpha);
    if (sg) shapes.push(sg);
  }
  // The galaxy crosses 130–250 px a frame as it lands: exposed at a fifth of the shutter it stays a galaxy, not a smudge; its white
  // streak carries the motion (R1-02a).
  galaxyShapes(tighten(f, 0.2), shapes);
  // break 4.3&: a small white ring where the eye fragment pops out (R1-07b), as the slap's pieces popped on 2.1.
  if (f >= POP_OUT && f < POP_OUT + 8) {
    const fr = FRAG.get(37)!;
    const [x, y] = apply(compose(faceAff(POP_OUT), slotAff(fr)), fr.c);
    const k = (f - POP_OUT) / 8;
    const r = lerp(30, 150, ease.outCubic(k));
    shapes.push(lShape({ kind: 'ring', x, y, w: 2 * r, h: 2 * r, r: 4 * (1 - k) + 0.5, color: white, alpha: 1 - ease.inCubic(k) }));
  }
  // The rescan bar: yellow, 1700 × 16, a 4 px ink outline, sweeping up the eye band, then rising 40 px more as it fades. v2: the
  // antivirus's red #FF4A1C (RED_RESCAN: its answer to the fetch — sedate him).
  if (f >= RESCAN.from && f < RESCAN.to + 4) {
    const a = f < RESCAN.to ? 1 : 1 - (f - RESCAN.to) / 4;
    shapes.push(lShape({ kind: 'rect', x: 960, y: rescanY(f), w: 1700, h: 16, r: 0, color: C(v2 ? 'red' : 'yellow', f), outline: 4, outlineColor: ink, alpha: a }));
  }
  // break 5.1: a ✧ glints at the outer edge of ")" as the zip shuts (0 → 1.2 → 0 over 8 f, turning +45°).
  if (f >= GLINT && f < GLINT + 8) {
    const k = (f - GLINT) / 8;
    const s = 1.2 * Math.sin(Math.PI * k);
    const x = 960 + (restPlacement(advance).close - 960) * (HERO_EM_WHOLE / HERO_EM) * (stretchAt(f) / 1.3) + 0.22 * HERO_EM_WHOLE;
    glyphs.push(lGlyph({ ch: SPARKLE, x, y: 470, size: 60 * 1.6 * Math.max(0.01, s), color: scaleRGB(white, 1.6), outline: 0.05, outlineColor: ink, rot: 45 * k }));
  }
  // break 5.3: the ☆ he tosses off his waving hand — it pops out and arcs out of the frame's top right, spinning a full turn.
  if (f >= WAVE && f < WAVE + 15) {
    const hand = wholeGlyphs(WAVE).find((g) => g.ch === 'ﾉ');
    if (hand) {
      const u = (f - WAVE) / 14;
      const e = ease.outCubic(u) * 0.35 + u * 0.65;
      // Thrown up out of the frame's top right: the hand is near the right edge, so the arc goes mostly up.
      const p0: V2 = [hand.x + 10, hand.y - 150];
      const c: V2 = [hand.x + 40, hand.y - 620];
      const p2: V2 = [hand.x + 180, -320];
      const x = (1 - e) ** 2 * p0[0] + 2 * (1 - e) * e * c[0] + e * e * p2[0];
      const y = (1 - e) ** 2 * p0[1] + 2 * (1 - e) * e * c[1] + e * e * p2[1];
      const s = Math.min(1, launchL((f - WAVE) * 2));
      glyphs.push(lGlyph({ ch: STAR, x, y, size: 0.6 * HERO_EM_WHOLE * s, color: C('amber', f), outline: 0.04, outlineColor: ink, rot: 360 * u }));
    }
  }
  return { shapes, glyphs };
}

// ——— v2: where his parts are (for the antivirus's hand and its POV) ——————————————————————————————————————————————————————————————————

/** A part of him: his two brackets, his eyes, his ω. */
export type Part = HeroPart;
/**
 * The world place (layout px) of a part's ink centre at instant f, on the clock the picture uses (liveTime): the flying "(" on its loop,
 * the walking ")"; seated parts through his face's motion (the lock, the recoil, the bob, v2's wobble); whole from the restart on.
 */
export function partAt(f: number, part: Part, v2 = true): V2 {
  const t = liveTime(f);
  const rest = HERO_REST[part];
  if (f >= WIPE_COVER) return apply(wholeAff(f), rest);
  if (part === 'open') return apply(openAff(t, null, v2).m, rest);
  if (part === 'close') return apply(closeAff(t, null, v2), rest);
  return apply(compose(faceAff(t, v2), T(0, 20)), rest);
}
