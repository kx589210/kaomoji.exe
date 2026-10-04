// E4 CURTAIN CALL + E5 BOWS → DIVE, outro 4.1 → 5.4 (OutroCompany; build sheet notes/b58/ending-sheet.md r4 §3.4–§3.6, §4 4.1 /
// 5.4, §5.1, §6.3, §7 E4 / E5; U5 (the curtain call into the cursor felt rushed), U6 (the end into the cursor felt cut off) and the lead's U5b: hold the
// bowed tableau half a beat, then the move over a beat and a half, landing on 5.4). Pure.
// outro 4, THE CURTAIN CALL, unhurried: the antivirus's rim bursts past the corners and the black becomes a stage; the seven friends fly
// out of their spots to their seats, shedding their worlds; every other face of the film prints in behind them on a raked wall over
// the first 8th, back row first (≈ 2.5 rows a frame), each bowing a 32nd after it prints; he opens his winking eye, the ✧ pops off and
// he hops down to the front row's centre (4.1e). Then the roll call reads like a line of text: one headliner an 8th, each on a drum
// hit of the encore, A1 → A4 along the top riser and B1 → B4 along the lower one, each lighting up with a pop and taking a real bow
// (0.35 em, held) a 32nd later, the wall's stadium wave trailing the calls; the kicks light the risers, the claps the follow-spot. The
// leads come on last: the guest saunters in from the left wing on 4.3 (a step an 8th, his empty glass held high), the cat dashes in
// from the right on 4.4, both planting on 4.4a while the wave rolls to the front.
// outro 5, THE BOWS → THE CURSOR: "ba-da-BUM" — the cat bows on 5.1, the guest on 5.1& (his glass tips and its last drop plinks onto
// W5 on 5.1a: `defender 0 threats (•ω•)`), he straightens and bows on 5.2: the button, and the whole company bows with him (the line
// bow). Every bow is real (0.4 em, his 0.45, squash, held). The bowed tableau holds, lit, half a beat (5.2e → 5.2&, U5b); then one
// continuous move of a beat and a half: the stage powers down like the CRT (its light falling ≈ (1 − u)², a vignette closing in on him,
// the follow-spot irising onto him) while the company streams home into him one after another (the wall's faces as sparks, from the
// outside in; the headliners hopping out over the top in call order; the guest and the cat rising out of their bows last, onto his
// shoulders), and the camera dives: the push's speed carried in, into him while he swells with them, through the fold (5.3& → 5.3a: his
// glyphs gathering into a █), and on into the █, which lands on S01's pose at frame −24 on 5.4 (OutroCursor's first frame).
// Layout px (y down) for placement; glyphs and shapes in the flat world (centre, y up) under the stage camera (stageAim); the stream in
// screen space.
import { DECODE } from '../content/boot.ts';
import { CAT_OUT, GUEST_OUT, HEADLINERS, HERO_OUT } from '../content/outro.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Segment, type Temporal, struck } from '../engine/temporal.ts';
import { cellWidth } from '../engine/textGrid.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { type Aim, aimPose, punch } from '../motion/hit.ts';
import { seedFrame } from '../score/film.ts';
import {
  ABSORB,
  ANTICIPATE,
  BOWS,
  BOW_WAVE,
  BURST,
  CALLS,
  CAT_DASH,
  CLAPS,
  DROP,
  FOLD,
  HOP,
  KICKS,
  OUTRO_SEGMENT,
  POWER_DOWN,
  PULLBACK,
  SLAM,
  STAGE_PUSH,
  STEPS,
  TABLEAU,
  WALK_ON,
  WALL_PRINT,
  at as outroAt,
} from '../score/outro.ts';
import { FRAMES_PER_BAR } from '../score/tempo.ts';
import { INK, TERM, TERMINAL_CURVATURE, terminalLook } from '../worlds/terminal.ts';
import { FOV, FRONT_DISTANCE } from './intro.ts';
import { APERTURE_NONE, type ApertureState } from './outroAperture.ts';
import { BASELINE, type BowState, HERO_BOW, LINE_BOW, WALL_BOW, baselineDrop, bowSquash, callPop, deepest, headlinerBow, kickBob, lineBow, principalBow, stepDip, wallBow } from './outroBows.ts';
import { ARMS, ARM_INK, armEnds, irisFace, irisRadius, irisZoom, layArm, starAt, starGlint, starGlyphs } from './outroIris.ts';
import { type CharPlan, FACE_TRACKING, INKS, type OmegaPlan, X, Y, charFace, faceOffsets, glow, wholeFace } from './outroKit.ts';
import { CURSOR_AT_SLAM, IRIS, SEATS, SPOT_AT, W5_BOX, flow, impact, seatAt, springL } from './outroShared.ts';
import { FRIEND_EM, SPOT_INK, SPOT_WORLDS, spotsAt } from './outroSpots.ts';
import { WALL_FACES } from './outroWall.ts';

// ——— The camera: the pull-back, the slow push (with the bows' nudges and the tilt onto the bow line), the dive ——————————————————————

/** The pull-back (L): from the iris's 1.04 about the centre to the whole stage, settled on 4.1&. */
export const pullZoom = (f: number): number => lerp(irisZoom(BURST), 1, springL(f, PULLBACK.from));
/** The stage push: 1.00 → 1.08 about (960, 760), log-linear from 4.1& to the band's stop (its speed carries into the dive). */
export const STAGE = { push: 1.08, about: [960, 760] as const } as const;
export const pushZoom = (f: number): number => STAGE.push ** clamp((f - STAGE_PUSH.from) / (STAGE_PUSH.to - STAGE_PUSH.from));
/** The aim's nudges on the bows (a screen offset, px, + right): 30 px toward the cat on 5.1 (L), 40 px toward the guest on 5.1& (L), back to him on the anticipation (I into his bow). */
export const NUDGE = { cat: -30, guest: 40 } as const;
export function nudge(f: number): number {
  const x = lerp(lerp(0, NUDGE.cat, springL(f, BOWS.cat)), NUDGE.guest, springL(f, BOWS.guest));
  return x * (1 - impact(f, BOWS.hero, BOWS.hero - ANTICIPATE));
}
/**
 * The camera tilts down onto the bow line as the leads walk on (the picture rises `px`, F over the two beats from 4.3 to the cat's bow,
 * 5.1): the principals bow a real 0.4 em (U5, R2-U5U6-NOTES) and the guest's lowest ink still clears W5 by ≥ 10 px (it would sink 26 px
 * into it). It stays: the dive starts from where it leaves him. (Round-2 fixer a: r4.1 tilted over the beat from 4.4a, so the picture
 * was still rising ≈ 1.8 px a frame through the cat's bow; once the bows became launches that bottom in 3–4 frames (R2T-1), the cat
 * drifted ≈ 10 px back up the screen after its bottom, a recoil that was the camera's. Now the frame is level in y from 5.1, so every
 * bow lands against a still frame.)
 */
export const LIFT = { px: 28, from: WALK_ON.from, frames: BOWS.cat - WALK_ON.from } as const;
export const lift = (f: number): number => LIFT.px * flow((f - LIFT.from) / LIFT.frames);
/** Two zooms (z1 about P1, then z2 about P2, screen layout px) and a screen offset (dx right, dy up) as one aim (screen = (world − aim) · zoom). */
function zoomsAim(z1: number, p1: readonly [number, number], z2: number, p2: readonly [number, number], dx: number, dy: number): Aim {
  const [P1, P2] = [
    [X(p1[0]), Y(p1[1])],
    [X(p2[0]), Y(p2[1])],
  ];
  const z = z1 * z2;
  const sx = P2[0] * (1 - z2) + P1[0] * (1 - z1) * z2 + dx;
  const sy = P2[1] * (1 - z2) + P1[1] * (1 - z1) * z2 + dy;
  return { zoom: z, x: -sx / z, y: -sy / z, roll: 0 };
}
/**
 * The carriage return's kick (review A3): 4.3 is the one kick of the encore with no clap, so the energy rig gives it no punch (the claps
 * on 4.2 and 4.4 have 0.02) and it was the weakest drum event of the bar; the stage camera gives it the same 0.02 punch about the screen's
 * centre (motion/hit.ts punch(): peak 1.5 frames in, nothing from + 14), so all four kicks of the roll call land alike.
 */
export const KICK_PUNCH = { at: KICKS[2], amount: 0.02 } as const;
/** The stage camera before the dive. */
const stageAimPre = (f: number): Aim => {
  const a = zoomsAim(pullZoom(f), [960, 540], pushZoom(f), STAGE.about, nudge(f), lift(f));
  return { ...a, zoom: a.zoom * (1 + KICK_PUNCH.amount * punch(f, KICK_PUNCH.at)) };
};
/** Where his cell lands on screen on 5.4 (S01's cursor at frame −24, U5b) and the zoom there. */
export const SLAM_TO = { at: CURSOR_AT_SLAM.at, zoom: CURSOR_AT_SLAM.zoom } as const;
/** The push's cruise speed (log zoom a frame), carried into the dive, and the dive's length (36 frames, U5b). */
const V0 = Math.log(STAGE.push) / (STAGE_PUSH.to - STAGE_PUSH.from);
const SLAM_LEN = SLAM.to - SLAM.from;
/**
 * The dive's curve k(u) = e·u² + (1 − e)·u³ (0 → 1 over its 36 frames; convex, so the camera only ever speeds up; no speed of its own at
 * the start, so the push's carries in). `early` 0.57 (U5b) keeps the push gentle while the company streams in (him ≈ 135 px an em on
 * 5.3, the stage still there round him) and ×3 on the fold (≈ 330 px), then rushes into the █: 10 → 18 % a frame over the last beat.
 */
export const DIVE = { early: 0.57 } as const;
export const slamK = (u: number): number => DIVE.early * u * u + (1 - DIVE.early) * u * u * u;
/** The dive's zoom: 1.08 · e^(v₀ t) · (Z / (1.08 · e^(36 v₀)))^k(u), Z S01's zoom on the landing (15.53). */
export function slamZoom(f: number): number {
  const t = clamp(f - SLAM.from, 0, SLAM_LEN);
  const u = t / SLAM_LEN;
  return STAGE.push * Math.exp(V0 * t) * (SLAM_TO.zoom / (STAGE.push * Math.exp(V0 * SLAM_LEN))) ** slamK(u);
}
/** His cell (layout px): his bowed centre, held from the bottom of his bow (5.2e) until he is the █ — where the company streams in, where he folds, what the dive rides. */
export const CELL = (): [number, number] => heroPlace(TABLEAU).centre;
/**
 * The landing's sideways carry (review A7): S01's flow drifts its cursor left (3.56 px a frame at frame −48, 3.77 at −24, U5b), while
 * the straight dive arrived moving right (13 px a frame in r4), so the █ bounced back on the landing. Over the dive's last `frames` its path bends right and
 * comes back in from the right, b(v) = B·v²·(1 − v) (no kink where it starts), with B set so it lands moving left at S01's own drift;
 * the landing point and the slam's vertical stop are untouched.
 */
export const DIVE_BEND = { frames: 6, drift: -3.77 } as const;
/** The straight dive's horizontal speed into the landing (px a frame): (s₁ − s₀) · k′(1) / 21. */
let diveSpeedCache: number | null = null;
const diveSpeedX = (): number => {
  if (diveSpeedCache === null) {
    const a0 = stageAimPre(SLAM.from);
    const s0x = (X(CELL()[0]) - a0.x) * a0.zoom;
    diveSpeedCache = ((X(SLAM_TO.at[0]) - s0x) * (2 * DIVE.early + 3 * (1 - DIVE.early))) / SLAM_LEN;
  }
  return diveSpeedCache;
};
export function diveBend(f: number): number {
  const v = clamp((f - (SLAM.to - DIVE_BEND.frames)) / DIVE_BEND.frames);
  const B = (diveSpeedX() - DIVE_BEND.drift) * DIVE_BEND.frames;
  return B * v * v * (1 - v);
}
/** The stage camera at instant f (screen = (world − aim) · zoom). From SLAM.from his cell rides lerp(s₀, s₁, k(u)) on screen (bent into the landing). */
export function stageAim(f: number): Aim {
  if (f < SLAM.from) return stageAimPre(f);
  const z = slamZoom(f);
  const u = clamp((f - SLAM.from) / SLAM_LEN);
  const [wx, wy] = [X(CELL()[0]), Y(CELL()[1])];
  const a0 = stageAimPre(SLAM.from);
  const s0 = [(wx - a0.x) * a0.zoom, (wy - a0.y) * a0.zoom];
  const s1 = [X(SLAM_TO.at[0]), Y(SLAM_TO.at[1])];
  const k = slamK(u);
  const s = [lerp(s0[0], s1[0], k) + diveBend(f), lerp(s0[1], s1[1], k)];
  return { zoom: z, x: wx - s[0] / z, y: wy - s[1] / z, roll: 0 };
}
/**
 * The █'s type size as a multiple of the terminal's 22 px: K0^(1 − k(u)^P) — born about his face's height on screen as the fold starts,
 * shrinking in the stage to S01's 22 px exactly as the dive's zoom takes over, so on screen it only grows (15.5 / 1.08 > K0).
 */
export const CURSOR_K0 = 7.6;
/**
 * … along k(u)^CURSOR_P (review F2: an impact into the landing): with k(u) itself (P 1) the █'s on-screen growth fell to 4 % a frame
 * after the fold and the tick only stopped it; at P ½ it is born a little smaller than him (≈ his face's height, not his em) and
 * grows 7.7 → 11.3 % a frame into the landing (U5b: 5.4), faster on every frame.
 */
export const CURSOR_P = 0.5;
export const cursorScale = (f: number): number => CURSOR_K0 ** (1 - slamK(clamp((f - SLAM.from) / SLAM_LEN)) ** CURSOR_P);
export const stagePose = (f: number) => aimPose(stageAim(f), FRONT_DISTANCE, FOV);
/**
 * The stage camera's own exposure from the button to the fold (review A2): its sub-frame instants pulled halfway toward the output
 * frame (× `k`), so the zoom's acceleration does not smear the wall into vertical streaks while it is still the company in its seats;
 * the stream and the fold keep their own shutters, and from FOLD.from the dive's full blur carries the rush into the █.
 */
export const STAGE_CAM = { k: 0.5 } as const;
export function stageCam(t: number): number {
  const F = Math.round(t);
  return F >= BOWS.hero && F < FOLD.from ? F + (t - F) * STAGE_CAM.k : t;
}
/** A layout point of the stage on screen at instant f (layout px). */
export function onScreen(f: number, [x, y]: readonly [number, number]): [number, number] {
  const a = stageAim(f);
  return [960 + (X(x) - a.x) * a.zoom, 540 - (Y(y) - a.y) * a.zoom];
}

// ——— The burst ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The rim launches from the iris's strained radius past the corners (L: 75 % by + 3, past 1101 by + 6), thinning 3 → 1 px and fading. */
export function burstRadius(f: number): number {
  const r0 = irisRadius(BURST - 1);
  return lerp(r0, 1300, springL(f, BURST, 0.9));
}
export function companyAperture(f: number): ApertureState {
  const u = clamp((f - BURST) / 8);
  return { ...APERTURE_NONE, mode: 'burst', inside: 1, irisR: burstRadius(f), rimWidth: lerp(3, 1, u), rimLevel: (1 - u) * glow(f, BURST, 0.6, 3), spots: spotsAt(f) };
}

// ——— The power-down (U6): the stage's light falls like a CRT's onto him; nothing of it before his bow ————————————————————————————————

const powerU = (f: number): number => clamp((f - POWER_DOWN.from) / (POWER_DOWN.to - POWER_DOWN.from));
/**
 * The stage's light from his bow: (1 − u)² (a CRT's power-off, fastest first) to half way, then on at the same rate of loss (−4 per u,
 * ≈ 15 % a frame), so it never loses more than a quarter of itself in a frame and never steps; ≈ 3 % on the landing, where OutroCursor's
 * S01 (the same ground and haze) takes over.
 */
export function stageLevel(f: number): number {
  const u = powerU(f);
  return u <= 0.5 ? (1 - u) ** 2 : 0.25 * Math.exp(-4 * (u - 0.5));
}
/** The vignette closing in on him (screen px): the stage keeps its light within VIGNETTE.inner · R of him, none beyond R. */
export const VIGNETTE = { from: 2800, to: 420, inner: 0.45 } as const;
export const vignetteR = (f: number): number => VIGNETTE.to + (VIGNETTE.from - VIGNETTE.to) * (1 - clamp((f - POWER_DOWN.from) / (FOLD.from - POWER_DOWN.from))) ** 2;
/** How much of its light the stage keeps at screen point (sx, sy) at instant f: the level times the vignette about his cell on screen. */
export function stageDim(f: number, sx: number, sy: number): number {
  if (f < POWER_DOWN.from) return 1;
  const [hx, hy] = onScreen(f, heroPlace(f).centre);
  const R = vignetteR(f);
  return stageLevel(f) * (1 - smoothstep(VIGNETTE.inner * R, R, Math.hypot(sx - hx, sy - hy)));
}
/** W5 powers down with the tube: its light as the stage's at its centre, out by the fold. */
export const W5_CENTRE = [(W5_BOX.x0 + W5_BOX.x1) / 2, (W5_BOX.y0 + W5_BOX.y1) / 2] as const;
export const w5Level = (f: number): number => (f < POWER_DOWN.from ? 1 : stageDim(f, W5_CENTRE[0], W5_CENTRE[1]) * (1 - smoothstep(FOLD.from - 3, FOLD.from, f)));

// ——— The wall: every other face of the film, a raked stadium (6 → 20 px), printed back row first ——————————————————————————————————

/** A wall face: its place, size, row, print frame, and the frames its three waves bow it (the call passes A and B, the roll to the front). */
export type WallFace = { face: string; x: number; baseline: number; size: number; row: number; at: number; waves: readonly [number, number, number] };
/** The wall's frame on the page: y 40 → 545, x 40 → 1880; sizes geometric in y up to 20 px; a 0.6 em gap. */
export const WALL = { top: 40, bottom: 545, left: 40, right: 1880, max: 20, gap: 0.6, pitch: 1.3, roll: 0.3 } as const;
const faceEm = (face: string): number => [...face].reduce((a, ch) => a + cellWidth(ch), 0) * 0.6;
function wallLayout(min: number): { faces: Omit<WallFace, 'at' | 'waves'>[]; bottom: number } {
  const faces: Omit<WallFace, 'at' | 'waves'>[] = [];
  const size = (y: number) => min * (WALL.max / min) ** clamp((y - WALL.top) / (WALL.bottom - WALL.top));
  let top = WALL.top;
  let k = 0;
  let row = 0;
  while (k < WALL_FACES.length) {
    const s = size(top);
    const line: { face: string; w: number }[] = [];
    let w = 0;
    while (k < WALL_FACES.length) {
      const fw = (faceEm(WALL_FACES[k]) + WALL.gap) * s;
      if (line.length > 0 && w + fw > WALL.right - WALL.left) break;
      line.push({ face: WALL_FACES[k], w: fw });
      w += fw;
      k++;
    }
    const spare = k < WALL_FACES.length ? (WALL.right - WALL.left - w) / Math.max(1, line.length) : 0;
    let x = k < WALL_FACES.length ? WALL.left : (WALL.left + WALL.right - w) / 2;
    const baseline = top + s;
    for (const it of line) {
      faces.push({ face: it.face, x: x + (it.w + spare) / 2, baseline, size: s, row });
      x += it.w + spare;
    }
    top += s * WALL.pitch;
    row++;
  }
  return { faces, bottom: top };
}
/** Piecewise-linear through points [x, t] (x ascending), extended flat past the ends. */
const through = (pts: readonly (readonly [number, number])[], x: number): number => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts.at(-1)![1];
};
/**
 * The stadium wave (U5): the wall's faces bow a 32nd after the call head passes over them — along riser A on beats 1–2 (from 4.1&: the
 * left of the wall with A2), along riser B on beats 3–4 — then, from the last call, the roll runs from the back rows to the front,
 * cresting with the front row's bottom on the cat's bow (5.1).
 */
const PASS_A: readonly (readonly [number, number])[] = [
  [WALL.left, BOW_WAVE.from],
  [SEATS.x[1], BOW_WAVE.from],
  [SEATS.x[2], CALLS[2]],
  [SEATS.x[3], CALLS[3]],
  [WALL.right, CALLS[3] + 4],
];
const PASS_B: readonly (readonly [number, number])[] = [
  [WALL.left, CALLS[4]],
  [SEATS.x[0], CALLS[4]],
  [SEATS.x[1], CALLS[5]],
  [SEATS.x[2], CALLS[6]],
  [SEATS.x[3], CALLS[7]],
  [WALL.right, CALLS[7] + 4],
];
/** The wall: the largest back-row size for which every face fits above y 545 (it fills its frame; ≈ 10 px for today's 725 faces). */
export const WALL_FACES_LAID: readonly WallFace[] = (() => {
  let lo = 4;
  let hi: number = WALL.max;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (wallLayout(mid).bottom <= WALL.bottom) lo = mid;
    else hi = mid;
  }
  const faces = wallLayout(lo).faces;
  const rows = (faces.at(-1)?.row ?? 0) + 1;
  const len = WALL_PRINT.to - WALL_PRINT.from;
  const rollFrom = CALLS[7] + 3;
  const rollTo = BOWS.cat - WALL_BOW.down;
  return faces.map((w) => ({
    ...w,
    at: WALL_PRINT.from + Math.floor((w.row * len) / rows),
    waves: [through(PASS_A, w.x) + 3, through(PASS_B, w.x) + 3, lerp(rollFrom, rollTo, w.row / Math.max(1, rows - 1))] as const,
  }));
})();
export const WALL_ROWS = (WALL_FACES_LAID.at(-1)?.row ?? 0) + 1;
/** A wall face's bow at instant f: the print wave (a 32nd after it prints) and the stadium wave's three passes, the deepest of them. */
export const wallBowAt = (w: WallFace, f: number): BowState =>
  deepest([wallBow(f, w.at + 3), wallBow(f, w.waves[0]), wallBow(f, w.waves[1]), wallBow(f, w.waves[2], WALL.roll), lineBow(f, BOWS.hero, LINE_BOW.wallDip)]);
const DECODE_LIST = [...DECODE];
/** The wall's ink by depth: #D8F5E1 at 35 % (back) → 70 % (front). */
const wallInk = (row: number): RGB => linear('#D8F5E1', 0.35 + 0.35 * (row / Math.max(1, WALL_ROWS - 1)));
const wallOmega = (row: number): RGB => scaleRGB(INKS.amber, 0.5 + 0.5 * (row / WALL_ROWS));
/** The wall at instant f (flat world): each face from its print frame (a DECODE glyph on it, final the next with a pop of light), bowing in its waves, dimmed by `dim` (layout point → level); off it once `left(i)` (it has let go and is streaming home). */
export function wallContent(f: number, plan: OmegaPlan, left: (i: number) => boolean, dim: (x: number, y: number) => number): { wall: Glyph[]; mono: Glyph[] } {
  const F = Math.round(f);
  const wall: Glyph[] = [];
  const mono: Glyph[] = [];
  WALL_FACES_LAID.forEach((w, i) => {
    if (!struck(w.at, f) || left(i)) return;
    const level = dim(w.x, w.baseline - 0.3 * w.size);
    if (level <= 0.002) return;
    const ink = wallInk(w.row);
    if (F < w.at + 1) {
      mono.push({ ch: DECODE_LIST[Math.floor(hash(w.x, w.baseline, seedFrame(F), 77) * DECODE_LIST.length)], x: X(w.x), y: Y(w.baseline - 0.3 * w.size), size: w.size, color: scaleRGB(ink, 1.8 * level) });
      return;
    }
    const b = wallBowAt(w, f);
    const light = glow(f, w.at + 1, 0.8, 3) * b.light * level;
    const cy = w.baseline - 0.3 * w.size + (b.dip + baselineDrop(b.sy, BASELINE.mono)) * w.size;
    wall.push(...wholeFace(w.face, { centre: [w.x, cy], em: w.size, ink: scaleRGB(ink, light), omega: scaleRGB(wallOmega(w.row), level), plan, squash: b.sy }));
  });
  return { wall, mono };
}
/** How many wall faces have printed by output frame F (W5 counts them, honestly). */
export const wallPrinted = (F: number): number => WALL_FACES_LAID.filter((w) => F >= w.at + 1).length;

// ——— The headliners: the boot's prints in, the seven friends fly to their seats; the roll call ————————————————————————————————————————

/** Headliner k's seat (layout baseline point, em) and its call frame. */
export const headlinerSeat = (k: number): { at: readonly [number, number]; em: number; call: number } => ({ ...seatAt(HEADLINERS[k].seat), call: CALLS[k] });
/** The friends' flight (L, ¾ by + 3, settled by 4.1&) from their spot's centre (screen, frozen at the burst) to the seat (stage). */
const flight = (f: number): number => springL(f, BURST);
function spotOnStage(i: number): [number, number] {
  const a = stageAim(BURST);
  const [sx, sy] = SPOT_AT[i].centre;
  return [960 + (X(sx) / a.zoom + a.x), 540 - (Y(sy) / a.zoom + a.y)];
}
/** A headliner waits dim in its seat until its call lights it (the roll call reads like a line of text): its level as it flies in, then seated. */
export const WAIT = { flying: 0.9, seated: 0.5 } as const;
/** The headliners' ink: terminal phosphor #D8F5E1 ×1.14. */
const HEAD_INK = linear('#D8F5E1', 1.2 * 0.95);
/**
 * Headliner k at instant f: its face, centre (layout, middle line), em (its height) and emX (its width), squash, ink, how much of its
 * world it still wears (1 → 0 over the flight's first 4 frames), its light, its level (dim until its call) and its call's pop.
 */
export function headlinerAt(
  k: number,
  f: number,
): { face: string; centre: [number, number]; em: number; emX: number; sy: number; sx: number; ink: RGB; world: number; light: number; level: number; pop: number } | null {
  const h = HEADLINERS[k];
  const seat = headlinerSeat(k);
  const settled: [number, number] = [seat.at[0], seat.at[1] - 0.3 * seat.em];
  const p = callPop(f, seat.call);
  const b = deepest([headlinerBow(f, seat.call), lineBow(f, BOWS.hero)]);
  const called = struck(seat.call, f);
  const level = called ? 1 : lerp(WAIT.flying, WAIT.seated, smoothstep(BURST, PULLBACK.to, f));
  const light = p.light * b.light;
  const drop = (b.dip + baselineDrop(b.sy, BASELINE.mono)) * seat.em * p.scale;
  if (h.spot === null) {
    if (!struck(BURST, f)) return null;
    const em = seat.em * p.scale;
    return { face: h.face, centre: [settled[0], settled[1] + drop], em: em * b.sy, emX: em * b.sx, sy: b.sy, sx: b.sx, ink: HEAD_INK, world: 0, light, level, pop: p.scale };
  }
  const i = h.spot - 1;
  const u = flight(f);
  const from = spotOnStage(i);
  const world = 1 - clamp((f - BURST) / 4);
  const em = lerp(FRIEND_EM, seat.em, u) * p.scale;
  const centre: [number, number] = [lerp(from[0], settled[0], u), lerp(from[1], settled[1], u) + drop];
  return { face: h.face, centre, em: em * b.sy, emX: em * b.sx, sy: b.sy, sx: b.sx, ink: mixRGB(HEAD_INK, SPOT_INK[SPOT_WORLDS[i]], world), world, light, level, pop: p.scale };
}
/**
 * Each call flashes its headliner in its own world (review A4: the roll call as the film's worlds taking their bows, not a monochrome
 * twinkle): for `frames` from its call the face wears its world's key ink, decaying back to phosphor ((1 − t/frames)², with the pop),
 * over a little burst of that world's signature, drawn in the stage's own additive light: Swiss its red lens; Riso its pink and blue
 * plates printing out of register into one; the transition's 8-bit chip palette cycling a frame a colour with square pixel sparks;
 * the cosmos powered into neon with a Jupiter glow; the club's Ben-Day dots under comic focus lines; the interlude's flat paint fields
 * with one glass glint; drop 2's kaleidoscope (six turned ghosts of the face). The boot's call is the burst: it prints in (DECODE).
 */
export const WORLD_FLASH = { frames: 5, ghost: 0.7 } as const;
const hexInk = (h: string, k = 1): RGB => linear(h, k);
const WORLD_KEY: Readonly<Record<string, RGB>> = {
  swiss: hexInk('#F2EDE4', 1.2),
  riso: hexInk('#FFE800', 1.1),
  cosmos: hexInk('#FF7A2E', 1.8),
  club: hexInk('#FFFFFF', 1.15),
  interlude: hexInk('#BFD7F2', 1.25),
  drop2: hexInk('#FFFFFF', 1.3),
};
const CHIPS = ['#A78BFA', '#3FE0FF', '#FFB23E', '#FF5FA2'].map((h) => hexInk(h, 1.3));
const DROP2_INKS = ['#FF4A1C', '#FFE800', '#3FE0FF', '#FF5FA2', '#4CF08C', '#0078BF'].map((h) => hexInk(h, 1.1));
/** How much of its world headliner k wears at instant f (1 on its call → 0 by + frames; 0 for the boot's). */
export function worldK(k: number, f: number): number {
  const t = f - CALLS[k];
  if (k === 0 || t < -0.25 || t >= WORLD_FLASH.frames) return 0;
  return (1 - clamp(t / WORLD_FLASH.frames)) ** 2;
}
/** Headliner k's world flash at instant f: the ink its face wears (mixed in by `mix`), the signature's shapes, and ghost faces (flat world). */
export function worldFlash(
  k: number,
  f: number,
  h: { face: string; centre: readonly [number, number]; em: number; emX: number },
  plan: OmegaPlan,
): { ink: RGB; mix: number; shapes: Shape[]; ghosts: Glyph[] } {
  const a = worldK(k, f);
  const world = HEADLINERS[k].world;
  const out = { ink: WORLD_KEY[world] ?? HEAD_INK, mix: a, shapes: [] as Shape[], ghosts: [] as Glyph[] };
  if (a <= 0) return out;
  const t = Math.max(0, f - CALLS[k]);
  const [cx, cy] = h.centre;
  const w = half(h.face) * h.emX;
  const e = h.em;
  const disc = (x: number, y: number, r: number, color: RGB, alpha: number, soft = 0): Shape => ({ kind: 'ellipse', x: X(x), y: Y(y), w: 2 * r, h: 2 * r, color, alpha, ...(soft ? { soft } : {}) });
  const ghost = (dx: number, dy: number, ink: RGB, alpha: number, rot = 0, em = e): Glyph[] => wholeFace(h.face, { centre: [cx + dx, cy + dy], em, ink, alpha, rot, plan });
  switch (world) {
    case 'swiss':
      // The red lens: a flat red disc behind its upper right, popping 1.25 → 1.
      out.shapes.push(disc(cx + 0.55 * w, cy - 0.35 * e, 0.62 * e * (1 + 0.25 * a), hexInk('#E8402B', 1.1), 0.9 * a));
      break;
    case 'riso': {
      // Two plates printing out of register (pink up-left, blue down-right), sliding into one.
      const d = 0.12 * e * a + 2;
      out.ghosts.push(...ghost(-d, -0.6 * d, hexInk('#FF48B0', 1.2), 0.85 * a), ...ghost(d, 0.6 * d, hexInk('#0078BF', 1.6), 0.85 * a));
      break;
    }
    case 'transition': {
      // The waltz's chip palette, a colour a frame; square pixels flying off its ends.
      out.ink = CHIPS[Math.floor(t) % CHIPS.length];
      for (let j = 0; j < 6; j++) {
        const side = j % 2 ? 1 : -1;
        const r = w + 8 + 30 * (1 - a) + 10 * (j >> 1);
        const y = cy + (j >> 1) * 0.3 * e - 0.3 * e;
        out.shapes.push({ kind: 'rect', x: X(cx + side * r), y: Y(y), w: 7, h: 7, color: CHIPS[(j + Math.floor(t)) % CHIPS.length], alpha: a });
      }
      break;
    }
    case 'cosmos':
      // Printed at night, powered into neon: a Jupiter glow behind it and a few stars.
      out.shapes.push(disc(cx + 0.2 * w, cy + 0.1 * e, 1.15 * w, hexInk('#FF7A2E', 1.1), 0.32 * a, 0.5 * w));
      for (let j = 0; j < 7; j++) out.shapes.push(disc(cx + (hash(k, j, 61) - 0.5) * 2.6 * w, cy + (hash(k, j, 62) - 0.5) * 2.2 * e, 1.5 + 2 * hash(k, j, 63), hexInk('#FFFFFF', 1.6), a));
      break;
    case 'club': {
      // Ben-Day dots under it and comic focus lines round it.
      for (let gx = -4; gx <= 4; gx++)
        for (let gy = -2; gy <= 2; gy++) {
          const [x, y] = [cx + gx * 0.26 * w + (gy % 2 ? 0.13 * w : 0), cy + gy * 0.24 * e];
          if ((gx / 4.2) ** 2 + (gy / 2.4) ** 2 <= 1) out.shapes.push(disc(x, y, 3.2, hexInk('#FFD23F', 1.1), 0.75 * a));
        }
      for (let j = 0; j < 12; j++) {
        // On an ellipse round the face (rx, ry), each line along its own radius, pushed out as it fades.
        const ang = (j / 12) * Math.PI * 2 + 0.2;
        const push = 14 * (1 - a);
        const [rx, ry] = [w + 12 + push, 0.75 * e + 8 + push];
        const len = 18 + 14 * a;
        const phi = Math.atan2(Math.sin(ang) * ry, Math.cos(ang) * rx);
        const [x, y] = [cx + Math.cos(ang) * rx + (Math.cos(phi) * len) / 2, cy - Math.sin(ang) * ry - (Math.sin(phi) * len) / 2];
        out.shapes.push({ kind: 'segment', x: X(x), y: Y(y), w: len, h: 2, rot: phi, color: hexInk('#FFFFFF', 1.1), alpha: 0.7 * a });
      }
      break;
    }
    case 'interlude':
      // Flat paint fields, and one glass glint crossing it.
      out.shapes.push({ kind: 'rect', x: X(cx - 0.2 * w), y: Y(cy + 0.15 * e), w: 1.5 * w, h: 0.55 * e, rot: 0.3, color: hexInk('#C9B8F0', 0.9), alpha: 0.55 * a });
      out.shapes.push({ kind: 'rect', x: X(cx + 0.35 * w), y: Y(cy - 0.2 * e), w: 1.2 * w, h: 0.32 * e, rot: -0.25, color: hexInk('#A8E6C9', 0.9), alpha: 0.5 * a });
      out.shapes.push({ kind: 'rect', x: X(cx - w + 2 * w * (1 - a)), y: Y(cy), w: 6, h: 1.4 * e, rot: -0.6, color: hexInk('#FFFFFF', 1.3), alpha: 0.7 * a });
      break;
    case 'drop2':
      // Every world at once: six turned ghosts of the face, a palette each, turning as they fade into the one.
      for (let j = 0; j < 6; j++) out.ghosts.push(...ghost(0, 0, DROP2_INKS[j], 0.3 * a, (j * Math.PI) / 3 + 0.5 * (1 - a), e * WORLD_FLASH.ghost));
      break;
  }
  return out;
}
/** A whole-face glyph set squashed y `sy` and stretched x `sx` (wholeFace keeps the width under a squash; this widens it by sx too). */
function bowFace(face: string, o: { centre: readonly [number, number]; em: number; sy: number; sx: number; ink: RGB; omega?: RGB; plan?: OmegaPlan; alpha?: number }): Glyph[] {
  const cx = X(o.centre[0]);
  return wholeFace(face, { centre: o.centre, em: o.em, ink: o.ink, omega: o.omega, plan: o.plan, alpha: o.alpha, squash: o.sy }).map((g) => ({ ...g, x: cx + (g.x - cx) * o.sx, stretch: (g.stretch ?? 1) * o.sx }));
}

// ——— The principals ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The front row: the guest, him, the cat (layout x of each face's centre; middle lines on y 790), em 96, and the wings they come from.
 * The guest starts at −130 (review F3): his leading `)` is inside the frame on 4.3, so the carriage return to B1 finds his first step
 * on the same downbeat (from −260 his first ink showed on 4.3 + 4).
 */
export const FRONT = { y: 790, em: 96, guest: 515, hero: 960, cat: 1400, wings: { guest: -130, cat: 2200 } } as const;
/**
 * Him at instant f: his hop (ballistic, 80 px above the straight path) from the iris to the front row's centre, landing (I) on 4.1e
 * with a squash 1.12 / 0.88 recovering by 4.1&; the anticipation (he straightens, y 1 → 1.05 over the 32nd before the button); his bow
 * (HERO_BOW: a launch from the button, down outCubic in 4 frames to 0.45 em — 58 % on + 1, 88 % on + 2 — the squash 0.8 / 1.06 about
 * his baseline leading it, settled on the tableau, + 6; round-2 reviews R2T-1 / a1), held until he folds. `sy` / `sx` scale his glyphs.
 */
export function heroPlace(f: number): { centre: [number, number]; em: number; sy: number; sx: number } {
  const from: [number, number] = [IRIS.hero.centre[0], IRIS.hero.risen];
  const to: [number, number] = [FRONT.hero, FRONT.y];
  const p = ease.inOutSine(clamp((f - HOP.from) / (HOP.to - HOP.from)));
  const arc = 80 * 4 * p * (1 - p);
  const em = lerp(IRIS.hero.em, FRONT.em, p);
  const land = f >= HOP.to - 0.25 ? Math.exp(-(f - HOP.to) / 2.2) * Math.cos(clamp((f - HOP.to) / (PULLBACK.to - HOP.to)) * Math.PI * 0.5) : 0;
  const bow = principalBow(f, BOWS.hero, HERO_BOW);
  const rise = f < BOWS.hero ? Math.sin((Math.PI / 2) * clamp((f - ANTICIPATE) / (BOWS.hero - ANTICIPATE))) : Math.max(0, 1 - bowSquash(f, BOWS.hero, HERO_BOW.settle, HERO_BOW.squash));
  const sy = (1 - 0.12 * land) * (1 + 0.05 * rise) * bow.sy;
  const sx = (1 + 0.12 * land) * bow.sx;
  const y = lerp(from[1], to[1], p) - arc + (bow.dip + baselineDrop(sy, BASELINE.rounded)) * em;
  return { centre: [lerp(from[0], to[0], p), y], em, sy, sx };
}
/** The face he wears: the wink opens on the burst (< → •), then (•ω•); his bow (－ω－) from the button. */
export const heroFace = (f: number): string => (struck(BOWS.hero, f) ? HERO_OUT.bow : struck(BURST + 2, f) ? HERO_OUT.alive : HERO_OUT.wink);
/**
 * His closed eyes (review A1): the rounded `－` is a full em, so (－ω－) set as typed was ≈ 1.47 × (•ω•)'s width and his `)` ran into
 * the cat's `(` on the button. Each `－` is set and drawn at half its width: (－ω－) is then (•ω•) + 6 %, the swap on the button closes
 * his eyes in place, and the dash is about the • it replaces.
 */
export const HERO_DASH = 0.5;
/** His glyphs' advances (ems) as he sets them: the font's, each `－` narrowed to HERO_DASH. */
export const heroAdvances = (chars: readonly string[], rounded: Advance): number[] => chars.map((ch) => rounded(ch) * (ch === '－' ? HERO_DASH : 1));
/** His face's set width at instant f, in ems of his em (before his swell and squash). */
export const heroFaceEm = (f: number, rounded: Advance): number => {
  const w = heroAdvances([...heroFace(f)], rounded);
  return w.reduce((a, b) => a + b, 0) + FACE_TRACKING * (w.length - 1);
};
/** His ω's living hold: a 3 px dip on each kick of the encore from 4.2 to 5.1 (not the button: that is his bow). */
const BOB_KICKS = KICKS.filter((k) => k > BURST && k < BOWS.hero);

/**
 * The guest and the cat (U5: the leads come on last). The guest saunters in from the left wing from 4.3 (≈ 20 px a frame, easing as he
 * reaches his mark; a 6 px dip on each 8th, his glass swaying with it); the cat dashes in from the right from 4.4 (≈ 44 px a frame, low
 * — squash 0.88 — and leaning, hopping on the 32nds, rearing up as it brakes); both plant on 4.4a (squash 1.08 / 0.92, recovering in 6)
 * and flare 1.6 → 1 (6 frames); walking in they are lit by the follow-spot's spill. Their bows (PRINCIPAL) on 5.1 and 5.1&, held.
 * `y` is the face's middle line (layout), `on` whether it has come on.
 */
export function walkOn(f: number, who: 'guest' | 'cat'): { x: number; y: number; sy: number; sx: number; rot: number; light: number; on: boolean } {
  const from = who === 'guest' ? WALK_ON.from : CAT_DASH.from;
  const v = clamp((f - from) / (WALK_ON.to - from));
  const s = who === 'guest' ? 1.3 * v - 0.3 * v * v : 1 - (1 - v) ** 1.2;
  const x = lerp(FRONT.wings[who], FRONT[who], s);
  const dash = who === 'cat' && f >= CAT_DASH.from ? 1 - smoothstep(WALK_ON.to - 3, WALK_ON.to, f) : 0;
  const t = f - WALK_ON.to;
  const land = t >= -0.25 ? Math.exp(-Math.max(0, t) / 2) * (1 - smoothstep(8, 12, t)) : 0;
  const bow = principalBow(f, BOWS[who]);
  const sy = (1 - 0.12 * dash) * (1 - 0.08 * land) * bow.sy;
  const sx = (1 + 0.1 * dash) * (1 + 0.08 * land) * bow.sx;
  const hop = who === 'cat' ? 6 * Math.abs(Math.sin((Math.PI * Math.max(0, f - CAT_DASH.from)) / 3)) * dash : 0;
  const step = who === 'guest' ? stepDip(f, STEPS) : 0;
  const y = FRONT.y + step - hop + (bow.dip + baselineDrop(sy, BASELINE.mono)) * FRONT.em;
  const spill = spillAt(f, x);
  const flare = t < 0 ? spill : t < 2 ? lerp(spill, 1.6, t / 2) : lerp(1.6, 1, clamp((t - 2) / 4));
  return { x, y, sy, sx, rot: 0.1 * dash, light: flare * bow.light, on: f >= from };
}
/** The cat's eyes close for its bow (=^-ω-^=), and stay closed (it is taken home bowing). */
export const catFace = (f: number): string => (struck(BOWS.cat, f) ? CAT_OUT.bow : CAT_OUT.face);
/** The guest, still bowed, peeks up smug on the plink: his ￣ lift 2 px for 6 frames. */
export const guestPeek = (f: number): number => 2 * smoothstep(0, 1, f - DROP.to) * (1 - smoothstep(5, 6, f - DROP.to));
const GUEST_INK = INKS.red;
const CAT_INK = INKS.mint;

// ——— The glass and its last drop ——————————————————————————————————————————————————————————————————————————————————————————————

/** The empty glass on the guest's ヽ: his hand relative to his face's centre, then (relative to the hand) the rim 44 px wide, the bowl's apex, the foot; it tips about his hand. */
export const GLASS = { hand: [318 - FRONT.guest, 760 - FRONT.y] as const, rim: -44, half: 22, apex: -20, foot: 0, tip: (70 * Math.PI) / 180 } as const;
/** The glass's tip angle: 0 → 70° outward about his hand on his bow (L, ¾ by + 3), staying tipped (it is empty); it sways with his steps. */
export const glassTip = (f: number): number => GLASS.tip * springL(f, BOWS.guest, 0.75) + 0.08 * (stepDip(f, STEPS) / 6);
/** A point of the glass (layout) at instant f, for the guest at (gx, gy), from its upright offset relative to his hand. */
function glassPoint(f: number, gx: number, gy: number, [dx, dy]: readonly [number, number]): [number, number] {
  const [hx, hy] = [gx + GLASS.hand[0], gy + GLASS.hand[1]];
  const a = glassTip(f);
  return [hx + dx * Math.cos(a) + dy * Math.sin(a), hy - dx * Math.sin(a) + dy * Math.cos(a)];
}
/** The glass as tube segments (#FF3D8B, a white-hot core), on the guest's raised hand. */
export function glassShapes(f: number, gx: number, gy: number, light: number): Shape[] {
  const P = (dx: number, dy: number) => glassPoint(f, gx, gy, [dx, dy]);
  const segs: [[number, number], [number, number]][] = [
    [P(-GLASS.half, GLASS.rim), P(GLASS.half, GLASS.rim)],
    [P(-GLASS.half, GLASS.rim), P(0, GLASS.apex)],
    [P(GLASS.half, GLASS.rim), P(0, GLASS.apex)],
    [P(0, GLASS.apex), P(0, GLASS.foot)],
    [P(-10, GLASS.foot), P(10, GLASS.foot)],
  ];
  const out: Shape[] = [];
  for (const [[x0, y0], [x1, y1]] of segs) {
    const base = { kind: 'segment' as const, x: X((x0 + x1) / 2), y: Y((y0 + y1) / 2), w: Math.hypot(x1 - x0, y1 - y0) + 3, rot: Math.atan2(-(y1 - y0), x1 - x0) };
    out.push({ ...base, h: 3.4, color: scaleRGB(INKS.pink, light) }, { ...base, h: 1, color: scaleRGB(INKS.hot, 0.6 * light) });
  }
  return out;
}
/** The glass's lip (its rim's outer end), layout, at instant f. */
export function glassLip(f: number): [number, number] {
  const g = walkOn(f, 'guest');
  return glassPoint(f, g.x, g.y, [-GLASS.half, GLASS.rim]);
}
/** Where the drop lands: W5's title bar (layout, screen space). */
export const DROP_AT = [240, W5_BOX.rows.title] as const;
/** The last drop (screen space, layout px): flicked off the lip two frames into the tip, falling with drop 2's gravity (1.07 px/f²), landing on W5 on DROP.to. */
export function dropAt(f: number): { x: number; y: number; vy: number } | null {
  const t0 = DROP.from + 2;
  if (f < t0 || f >= DROP.to) return null;
  const [lx, ly] = onScreen(t0, glassLip(t0));
  const T = DROP.to - t0;
  const g = 1.07;
  const vy0 = (DROP_AT[1] - ly - 0.5 * g * T * T) / T;
  const t = f - t0;
  return { x: lerp(lx, DROP_AT[0], t / T), y: ly + vy0 * t + 0.5 * g * t * t, vy: vy0 + g * t };
}
/**
 * The plink, played in the picture (review A6: at 6 × 14 px with a 26 px crown it vanished against W5's title rule and read only through
 * the text flip and the sound): the drop is a 15 px teardrop; its crown of five droplets flies out to r 44 over 6 frames; the ═ under it
 * dips 5 px (a ripple ± `reach` px along the rule, down in 1.5 frames and back by + 6), and a pink flare runs along the title rule for
 * 4 frames.
 */
export const PLINK = { drop: 15, crown: 44, droplet: 6, dip: 5, reach: 70, flare: { frames: 4, reach: 220, alpha: 0.55 } } as const;
/** The plink's splash crown and its flare on W5 (screen space). */
export function splash(f: number): Shape[] {
  const t = f - DROP.to;
  if (t < -0.25 || t >= 6) return [];
  const u = clamp(t / 6);
  const out: Shape[] = [];
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (0.15 + 0.7 * (k / 4));
    const r = PLINK.crown * ease.outCubic(u);
    const [x, y] = [DROP_AT[0] + r * Math.cos(a), DROP_AT[1] - r * Math.sin(a) + 40 * u * u];
    out.push({ kind: 'ellipse', x: X(x), y: Y(y), w: PLINK.droplet, h: PLINK.droplet, color: INKS.pink, alpha: 1 - u });
  }
  out.push({ kind: 'ellipse', x: X(DROP_AT[0]), y: Y(DROP_AT[1]), w: 46 * u + 9, h: 8, color: INKS.pink, alpha: 0.7 * (1 - u) });
  const flare = plinkFlare(f);
  if (flare > 0) out.push({ kind: 'ellipse', x: X(DROP_AT[0]), y: Y(DROP_AT[1]), w: 2 * PLINK.flare.reach, h: 14, color: INKS.pink, alpha: PLINK.flare.alpha * flare, soft: 6 });
  return out;
}
/** The pink flare on the title rule: (1 − t/4)² from the plink. */
export const plinkFlare = (f: number): number => {
  const t = f - DROP.to;
  return t < -0.25 || t >= PLINK.flare.frames ? 0 : (1 - clamp(t / PLINK.flare.frames)) ** 2;
};
/** The title rule under the plink at layout x (W5's title row): how far it dips (px, down) and how pink it flares (0 → 1). */
export function plinkRule(f: number, x: number): { dip: number; flare: number } {
  const t = f - DROP.to;
  if (t < -0.25 || t >= 6) return { dip: 0, flare: 0 };
  const near = smoothstep(PLINK.reach, 0, Math.abs(x - DROP_AT[0]));
  const k = t < 1.5 ? Math.max(0, t + 0.25) / 1.75 : (1 - (t - 1.5) / 4.5) ** 2;
  return { dip: PLINK.dip * k * near, flare: plinkFlare(f) * smoothstep(PLINK.flare.reach, 0, Math.abs(x - DROP_AT[0])) };
}

// ——— The follow-spot and the stage lines (the kit made visible) ———————————————————————————————————————————————————————————————————

/** The follow-spot's sizes: on him, the whole front row (from 4.4&), on one lead; its light (+ 8 % mint, + 15 % on a clap); it irises down onto him from the button. */
export const SPOT = { w: 520, h: 220, wide: 1300, alpha: 0.08, clap: 0.07, iris: { h: 130, alpha: 0.13 } } as const;
/** His width (layout px) with the whole company in him: the spot's last size. */
const HIS_WIDTH = 2.46 * FRONT.em * 1.15;
const CURTAIN_CLAPS = CLAPS.filter((c) => c < BOWS.cat);
/** The follow-spot at instant f (layout centre x, y; size; alpha), null before it blooms on his landing and once it has closed onto him. */
export function followSpot(f: number): { x: number; y: number; w: number; h: number; alpha: number; warm: number } | null {
  if (f < HOP.to - 0.25 || f >= FOLD.from + 3) return null;
  const back = impact(f, BOWS.hero, BOWS.hero - ANTICIPATE);
  const x = lerp(lerp(lerp(FRONT.hero, FRONT.cat, springL(f, BOWS.cat)), FRONT.guest, springL(f, BOWS.guest)), FRONT.hero, back);
  const close = ease.inOutSine(clamp((f - POWER_DOWN.from) / (FOLD.from - POWER_DOWN.from)));
  const open = lerp(lerp(SPOT.w, SPOT.wide, springL(f, CALLS[7])), SPOT.w, springL(f, BOWS.cat));
  const w = lerp(open, HIS_WIDTH, close);
  const h = lerp(SPOT.h, SPOT.iris.h, close);
  let clap = 0;
  for (const c of CURTAIN_CLAPS) if (f >= c - 0.25 && f < c + 4) clap = Math.max(clap, (1 - clamp((f - c) / 4)) ** 2);
  const alpha = (lerp(SPOT.alpha, SPOT.iris.alpha, close) * springL(f, HOP.to) + SPOT.clap * clap) * (1 - clamp((f - FOLD.from) / 3));
  return { x, y: lerp(FRONT.y + 10, heroPlace(f).centre[1], close), w, h, alpha, warm: close };
}
/** How lit a walker at layout x is by the spot's spill (0.3 in the dark wings → 1 inside it). */
function spillAt(f: number, x: number): number {
  const s = followSpot(f);
  if (!s) return 0.3;
  return 0.3 + 0.7 * smoothstep(s.w / 2 + 260, s.w / 2 - 40, Math.abs(x - s.x));
}
/** The stage lines (1 px mint 12 %) under riser A, under riser B, and the lip; each kick of 4.2 → 5.1 lights them + 40 % (gone in 6). */
export const LINES = { ys: [618, 706, 846] as const, x0: 120, x1: 1800, alpha: 0.12, kick: 0.4, segment: 60 } as const;
const LINE_KICKS = KICKS.filter((k) => k >= outroAt(4, 2) && k <= BOWS.cat);
const kickFlash = (f: number): number => {
  let k = 0;
  for (const at of LINE_KICKS) if (f >= at - 0.25 && f < at + 6) k = Math.max(k, (1 - clamp((f - at) / 6)) ** 2);
  return k;
};
/**
 * The carriage return (review A3): on 4.3 riser B's line flashes + 80 % instead of + 40 %, brightest at its left end (× 1 → × 0.55
 * along it), and a pool of light blooms under B1 for 6 frames, so the light itself pulls the eye from A4 back to the left of the
 * second row, where B1 pops and the guest's first step lands on the same downbeat.
 */
export const RETURN = { at: KICKS[2], flash: 0.8, lean: 0.45, pool: { w: 460, h: 54, alpha: 0.14 } } as const;
export const returnFlash = (f: number): number => (f >= RETURN.at - 0.25 && f < RETURN.at + 6 ? (1 - clamp((f - RETURN.at) / 6)) ** 2 : 0);

// ——— The company comes home (U1, U6): from the button everyone streams into him; he folds into the █ alone ———————————————————————————
// No hem (R15): the stage is not wiped, it powers down while the company streams in. Nothing leaves in the held tableau (U5b, 5.2e →
// 5.2&). From 5.2& the wall lets go from the outside in (each face lights where it stands, condenses into a phosphor spark, curls in,
// warming to his amber, shrinking, fading into him), home 5.2& + 4 → 5.3 + 5; the headliners hop out of their seats in call order, a
// frame and a half apart, and come home over the top one after another (the farther, the higher their arc), each onto its own
// place along the top of his head (left to right in call order), readable at ≥ 40 % of its size until its last two frames; the guest
// and the cat rise out of their bows last and land on his left and right shoulders, the guest (warming to amber: nothing red after the
// fold starts) three frames before the cat, whose landing is the fold's first frame. Every face's flight ≥ 8 frames; everyone is home
// by FOLD.from, so the fold is him alone. The stream has short shutters of its own (STREAM.shutter: a spark's trail ≤ 40 px, a face
// legible in flight). (Ending fixer a, reviews F1 / A2 / A5: in r4 the faces all left within two frames and landed on one point above
// his head on 5796–5797 as one knot, and the wall began to melt two frames before his bow bottomed.)

/**
 * The stream's rates: how long each lights in place before it moves (a face also hops `lift` em and comes home over an arc `arcPx`
 * high — the headliners over the top, the guest and the cat lower, rising beside him — landing `headroom` px above his face at
 * `land`: the headliners spread ± `span` of his em along the top of his head in call order, the guest and the cat on his
 * shoulders, ∓ `shoulder`), the wall's flights (the farthest spark's, the nearest's), the sparks' curl, the spark's size, the
 * shrinks (a face to `faceShrink` over its way; then, over its `last` frames, the gulp: into his outline's ink at contactOf, shrinking
 * as (1 − e)^`gulp` to nothing, fading only at the very end — review a2), the shutters;
 * when each kind lets go (the wall: `lag` after the button, from the outside in over `spread`, `jitter` among neighbours; the
 * headliners `lead` after the button, `step` apart, each `flight` long; the guest and the cat `after` the tableau, home `home`
 * before / on the fold) and the flare each principal lights.
 */
export const STREAM = {
  hold: { wall: 0.6, face: 0.9 },
  lift: 0.18,
  arcPx: { headliner: 160, lead: 70, reach: 0.41 },
  headroom: 4,
  land: { span: 0.8, shoulder: 1.5 },
  flight: { far: 7, near: 5 },
  swirl: { wall: 0.7 },
  spark: 0.5,
  condense: 2,
  shrink: 0.2,
  faceShrink: 0.4,
  gulp: 1.3,
  last: 4,
  reach: 1,
  shutter: { spark: 0.12, face: 0.05 },
  wall: { lag: 0.5, spread: 11, jitter: 1 },
  headliner: { lead: 0, step: 1.5, flight: 9 },
  after: { guest: 10.5, cat: 12 },
  home: { guest: -3, cat: 0 },
  carry: 0.45,
  letGo: 0.35,
  flare: 0.1,
  flareMax: 0.35,
} as const;
/** Who a member of the company is. */
export type MemberKind = 'wall' | 'headliner' | 'cat' | 'guest';
/** A member as it lets go: kind, atlas, face, stage centre (layout), em, inks, weight in his charge, its index (wall) / call order, its wall row, when it lets go (td) and is home (ta). */
export type Member = { kind: MemberKind; atlas: 'wall' | 'faces'; face: string; centre: [number, number]; em: number; sy: number; sx: number; ink: RGB; omega: RGB; weight: number; glass: boolean; order: number; row: number; near: number; td: number };
let membersCache: Member[] | null = null;
/** The whole company: the wall's faces, the eight headliners, the guest (with his glass) and the cat. */
export function companyMembers(): readonly Member[] {
  if (membersCache) return membersCache;
  // The wall lets go from the outside in: the farthest from him first (the back rows' corners), the nearest last — a CRT's light
  // collapsing to its centre, which is him. Paced by ink, not by count: a face's place in the order (`near`, 0 → 1) is the share of
  // the wall's ink (size² × width) farther out than it, so the stage's light leaves at an even rate (sheet §3.5: ≤ 25 % a frame).
  const cell = CELL();
  const far = WALL_FACES_LAID.map((w) => Math.hypot(w.x - cell[0], w.baseline - 0.3 * w.size - cell[1]));
  const weight = WALL_FACES_LAID.map((w) => w.size * w.size * faceEm(w.face));
  const total = weight.reduce((a, b) => a + b, 0);
  const near: number[] = [];
  let acc = 0;
  for (const i of far.map((_, i) => i).sort((a, b) => far[b] - far[a])) {
    near[i] = (acc + weight[i] / 2) / total;
    acc += weight[i];
  }
  const out: Member[] = WALL_FACES_LAID.map((w, i) => ({
    kind: 'wall',
    atlas: 'wall',
    face: w.face,
    centre: [w.x, w.baseline - 0.3 * w.size],
    em: w.size,
    sy: 1,
    sx: 1,
    ink: wallInk(w.row),
    omega: wallOmega(w.row),
    weight: 1,
    glass: false,
    order: i,
    row: w.row,
    near: near[i],
    td: ABSORB.from + STREAM.wall.lag + STREAM.wall.spread * near[i] + STREAM.wall.jitter * hash(i, 911),
  }));
  HEADLINERS.forEach((_, k) => {
    const td = ABSORB.from + STREAM.headliner.lead + STREAM.headliner.step * k;
    const h = headlinerAt(k, td)!;
    out.push({ kind: 'headliner', atlas: 'faces', face: h.face, centre: h.centre, em: h.em, sy: h.sy, sx: h.sx, ink: scaleRGB(h.ink, h.light), omega: INKS.amber, weight: 8, glass: false, order: k, row: -1, near: 0, td });
  });
  for (const who of ['guest', 'cat'] as const) {
    const td = ABSORB.from + STREAM.after[who];
    const p = walkOn(td, who);
    const face = who === 'guest' ? GUEST_OUT.onStage : CAT_OUT.bow;
    out.push({ kind: who, atlas: 'faces', face, centre: [p.x, p.y], em: FRONT.em * p.sy, sy: p.sy, sx: p.sx, ink: scaleRGB(who === 'guest' ? GUEST_INK : CAT_INK, p.light), omega: scaleRGB(INKS.amber, p.light), weight: 30, glass: who === 'guest', order: 0, row: -1, near: 0, td });
  }
  membersCache = out;
  return out;
}
const byKind = (kind: MemberKind, order = 0): Member => companyMembers().find((m) => m.kind === kind && (kind === 'wall' || kind === 'headliner' ? m.order === order : true))!;
/** When a member lets go of its place. */
export const departAt = (m: Member): number => m.td;
/** Whether a member has let go by instant f (it is streaming in, or home). */
export const gone = (f: number, m: Member): boolean => f >= m.td;
/** Where a member was on screen when it let go, where he was, the zoom then, and when it reaches him (memoized: pure). */
type Flight = { td: number; ta: number; at0: [number, number]; him0: [number, number]; zoom: number; dist: number; carry: number };
const flightCache = new Map<Member, Flight>();
export function flightOf(m: Member): Flight {
  const hit = flightCache.get(m);
  if (hit) return hit;
  const td = m.td;
  const at0 = onScreen(td, m.centre);
  const him0 = onScreen(td, CELL());
  const dist = Math.hypot(at0[0] - him0[0], at0[1] - him0[1]);
  const ta =
    m.kind === 'wall'
      ? Math.min(FOLD.from - 0.5, td + lerp(STREAM.flight.far, STREAM.flight.near, m.near))
      : m.kind === 'headliner'
        ? td + STREAM.headliner.flight
        : FOLD.from + STREAM.home[m.kind];
  const carry = Math.max(STREAM.carry, m.kind === 'wall' ? stageLevel(td) : stageDim(td, at0[0], at0[1]));
  const out = { td, ta, at0, him0, zoom: stageAim(td).zoom, dist, carry };
  flightCache.set(m, out);
  return out;
}
/** When a member reaches him. */
export const arriveAt = (m: Member): number => flightOf(m).ta;
const holdOf = (m: Member): number => (m.kind === 'wall' ? STREAM.hold.wall : STREAM.hold.face);
/**
 * How far in a member is at instant f (0 → 1): held in place for its first holdOf(m) frames, then an S-curve home — a spark to his
 * centre by its arrival, a face to its place above his head STREAM.reach frames before it (review a2: its gulp then has it inside his
 * outline on its last drawn frame; ending at the arrival, a headliner from the far end of a riser was still ≈ 40 px above him).
 */
export function inward(m: Member, f: number): number {
  const { td, ta } = flightOf(m);
  const hold = holdOf(m);
  const end = m.kind === 'wall' ? ta : ta - STREAM.reach;
  const u = clamp((f - td - hold) / (end - td - hold));
  return u * u * (3 - 2 * u);
}
/** The stream's own exposure: its instants pulled toward the output frame (× k), so its trails stay short. */
export const streamTime = (f: number, k: number = STREAM.shutter.spark): number => {
  const F = Math.round(f);
  return F + (f - F) * k;
};
/**
 * Where along the top of his head a face lands (ems of his em, + right): the headliners spread over ± STREAM.land.span in call order,
 * left to right; the guest on his left shoulder, the cat on his right (review F1: one point for all of them made a knot).
 */
export const landAt = (m: Member): number =>
  m.kind === 'guest' ? -STREAM.land.shoulder : m.kind === 'cat' ? STREAM.land.shoulder : m.kind === 'headliner' ? STREAM.land.span * (2 * m.order / (HEADLINERS.length - 1) - 1) : 0;
/** How far a face is into its gulp at instant f (0 → 1 over its last STREAM.last frames: it goes into his outline's ink). */
export const gulpOf = (m: Member, f: number): number => clamp((f - (flightOf(m).ta - STREAM.last)) / STREAM.last);
/**
 * A face's scale on its way home at instant f: steadily (linear in time, from its hop to its last frames) to faceShrink (A5: ≥ 40 %
 * until its gulp; even, so no frame takes half a big face's ink at once), then the gulp shrinks it to nothing as (1 − e)^gulp: on the
 * output frames of its last four, 69 → 41 → 17 % of its size as the gulp began (≈ 28 → 16 → 7 % of its size as it let go) while it
 * slides 23 → 68 → 99 % of the way into his ink, then gone (review a2: in r4.1 it still stood at a third of that, over half its stage
 * width with its glow, on its last frame; round 2's first try, a 3-frame gulp, went 59 % → hidden in his stroke in one frame).
 */
export function faceScale(m: Member, f: number): number {
  const { td, ta } = flightOf(m);
  const way = clamp((f - td - holdOf(m)) / (ta - STREAM.last - td - holdOf(m)));
  return lerp(1, STREAM.faceShrink, way) * (1 - gulpOf(m, f)) ** STREAM.gulp;
}
/**
 * Where a face goes into him (review a2: in r4.1 the guest and the cat sat 20–34 px above his brackets at half their size and blinked
 * out there): its contact point on his outline — the guest into the upper stroke of his `(`, the cat into his `)` (`bracket`: `up` em
 * above his middle line, `x` em toward the bracket's tip from its centre: on the stroke, near the tip the face comes down onto, wide of
 * his eyes); a headliner straight down from its landing place into the top of his head, `head` em above his middle line (inside his
 * outline, above his closed eyes). The gulp's way there is a smoothstep over the first `reach` of it, so on its last drawn frame a face
 * is ≥ 90 % of the way in. Its arrival lights a pulse there (contactPulse: up over `before` frames to the arrival, down over `after`):
 * the glyph it went into + `light`, and a soft glow `glow.r` of his em across, his own amber warmed `glow.hot` toward white.
 */
export const CONTACT = { bracket: { up: 0.26, x: 0.05 }, head: 0.22, reach: 0.8, before: 2, after: 3, light: 0.4, glow: { r: 0.5, alpha: 0.3, hot: 0.15 } } as const;
/** His glyphs' x offsets (ems of his em) as he is set at instant f. */
const heroOffsets = (f: number, rounded: Advance): number[] => {
  const chars = [...heroFace(f)];
  return faceOffsets(chars, rounded, heroAdvances(chars, rounded));
};
/** Which of his glyphs a face goes into: the guest his `(`, the cat his `)`, a headliner the one under its landing place. */
export function contactGlyph(m: Member, offs: readonly number[]): number {
  if (m.kind === 'guest') return 0;
  if (m.kind === 'cat') return offs.length - 1;
  const x = landAt(m);
  return offs.reduce((best, o, i) => (Math.abs(o - x) < Math.abs(offs[best] - x) ? i : best), 0);
}
/** A face's contact point on him at instant f: across his face (ems of his em, + right), up from his middle line (ems), and where (layout px). */
export function contactAt(m: Member, f: number, rounded: Advance): { x: number; up: number; at: [number, number] } {
  const pl = heroPlace(f);
  const swell = 1 + HOME.swell * charge(f);
  const offs = heroOffsets(f, rounded);
  const x = m.kind === 'headliner' ? landAt(m) : offs[contactGlyph(m, offs)] + (m.kind === 'guest' ? 1 : -1) * CONTACT.bracket.x;
  const up = m.kind === 'headliner' ? CONTACT.head : CONTACT.bracket.up;
  return { x, up, at: [pl.centre[0] + x * pl.em * swell * pl.sx, pl.centre[1] - up * pl.em * swell * pl.sy] };
}
/** The contact point on screen (screen layout px) at instant f. */
export const contactOf = (m: Member, f: number, rounded: Advance): [number, number] => onScreen(f, contactAt(m, f, rounded).at);
/** The pulse a face's arrival lights at its contact point (0 → 1 on its arrival → 0). */
export function contactPulse(m: Member, f: number): number {
  const t = f - flightOf(m).ta;
  if (t < -CONTACT.before || t >= CONTACT.after) return 0;
  return t < 0 ? smoothstep(-CONTACT.before, 0, t) : (1 - t / CONTACT.after) ** 2;
}
/**
 * Where a member comes home to at instant f (screen layout px): a wall spark to his centre; a face to its own place on the top of his
 * head (landAt) — just above his face (its half-height on screen, plus half its own em as it is drawn then), so it is never drawn over
 * his face on its way; from there its gulp takes it into his outline (contactOf).
 */
export function homeOf(m: Member, f: number): [number, number] {
  const him = onScreen(f, CELL());
  if (m.kind === 'wall') return him;
  const pl = heroPlace(f);
  const z = stageAim(f).zoom;
  const swell = 1 + HOME.swell * charge(f);
  const head = 0.45 * pl.em * swell * pl.sy * z;
  const own = 0.45 * m.em * flightOf(m).zoom * faceScale(m, f);
  return [him[0] + landAt(m) * pl.em * swell * pl.sx * z, him[1] - head - own - STREAM.headroom];
}
/**
 * One member coming home at instant f (screen layout px): its centre, em, turn, light, alpha, how far it has condensed into a spark;
 * null before it leaves and once it is home. A wall spark curls straight in to his centre (a drain: STREAM.swirl.wall). A face hops as
 * it lets go, then comes home OVER THE TOP: its way across closes on an S-curve while it rises on an arc (STREAM.arcPx, ≥ his
 * half-height) and drops onto the top of his head from above, readable most of the way (≥ 40 % of its size); over its last four
 * frames it is gulped: from its place above his head into his outline's ink at its contact point (smoothstep, on top of the rest of
 * its way), shrinking to nothing, gone on its arrival, which lights a pulse there (review a2). `rounded`: his glyphs' advance.
 */
export function streamAt(
  m: Member,
  f: number,
  rounded: Advance,
): { centre: [number, number]; em: number; rot: number; w: number; light: number; alpha: number; scale: number; spark: number; warm: number; from: { at: [number, number]; zoom: number } } | null {
  const fl = flightOf(m);
  if (!(f >= fl.td) || f >= fl.ta) return null;
  const w = inward(m, f);
  const wall = m.kind === 'wall';
  const light = (wall ? glow(f, fl.td, 0.6, 1.5) : glow(f, fl.td, STREAM.letGo, 2.5)) * fl.carry;
  // The guest turns amber over the first half of his way home (nothing red by the fold); the rest warm as they come in.
  const warm = m.kind === 'guest' ? smoothstep(0, 0.5, w) * 0.85 + 0.15 * clamp((f - fl.td) / holdOf(m)) : w;
  if (wall) {
    const him = onScreen(f, CELL());
    const [dx, dy] = [fl.at0[0] - fl.him0[0], -(fl.at0[1] - fl.him0[1])];
    const rot = STREAM.swirl.wall * w;
    const ox = (1 - w) * (dx * Math.cos(rot) - dy * Math.sin(rot));
    const oy = (1 - w) * (dx * Math.sin(rot) + dy * Math.cos(rot));
    const spark = ease.inOutSine(clamp((f - fl.td) / (holdOf(m) + STREAM.condense)));
    const scale = lerp(1, STREAM.spark, spark) * lerp(1, STREAM.shrink, w);
    return { centre: [him[0] + ox, him[1] - oy], em: m.em * fl.zoom * scale, rot: 0, w, light, alpha: 1 - smoothstep(0.7, 1, w), scale, spark, warm, from: { at: fl.at0, zoom: fl.zoom } };
  }
  // Its offset from him goes from where it stood (relative to him as it let go) to its landing place (relative to him now): across on
  // an S-curve, up and over on the arc.
  const him = onScreen(f, CELL());
  const home = homeOf(m, f);
  const across = smoothstep(0, 0.9, w);
  const ox = (fl.at0[0] - fl.him0[0]) * (1 - across) + (home[0] - him[0]) * across;
  // The farther a headliner flies, the higher it arcs (`reach` of its way across): the one from the far end of a riser passes over
  // the next one's hop instead of through it (F1 / A5: no two faces in one place).
  const arc = m.kind === 'headliner' ? Math.max(STREAM.arcPx.headliner, STREAM.arcPx.reach * Math.abs(fl.at0[0] - fl.him0[0])) : STREAM.arcPx.lead;
  const oy = (fl.at0[1] - fl.him0[1]) * (1 - w) + (home[1] - him[1]) * w - arc * Math.sin(Math.PI * w);
  const lift = STREAM.lift * m.em * fl.zoom * smoothstep(0, 1, (f - fl.td) / holdOf(m)) * (1 - w);
  const scale = faceScale(m, f);
  const e = gulpOf(m, f);
  const g = smoothstep(0, CONTACT.reach, e);
  const into = e > 0 ? contactOf(m, f, rounded) : home;
  const centre: [number, number] = [him[0] + ox + (into[0] - home[0]) * g, him[1] + oy - lift + (into[1] - home[1]) * g];
  return { centre, em: m.em * fl.zoom * scale, rot: 0, w, light, alpha: 1 - smoothstep(0.75, 1, e), scale, spark: 0, warm, from: { at: fl.at0, zoom: fl.zoom } };
}
/** Everything coming home at instant f, in screen space: the sparks and faces (wall atlas, faces atlas) and the guest's glass. */
export function streamers(f: number, L: { plan: OmegaPlan; wallPlan: OmegaPlan; chars: CharPlan; rounded: Advance }): { wall: Glyph[]; faces: Glyph[]; shapes: Shape[] } {
  const out = { wall: [] as Glyph[], faces: [] as Glyph[], shapes: [] as Shape[] };
  if (f < ABSORB.from || f >= FOLD.from + 0.25) return out;
  const [ts, tf] = [streamTime(f, STREAM.shutter.spark), streamTime(f, STREAM.shutter.face)];
  for (const m of companyMembers()) {
    const s = streamAt(m, m.kind === 'wall' ? ts : tf, L.rounded);
    if (!s) continue;
    if (m.kind === 'wall') {
      const ink = scaleRGB(mixRGB(m.ink, INKS.amber, s.warm), s.light * lerp(1, 1.3, s.spark));
      out.wall.push({ ch: m.face, x: X(s.centre[0]), y: Y(s.centre[1]), size: s.em, color: ink, alpha: s.alpha, morph: s.spark });
      continue;
    }
    const ink = scaleRGB(mixRGB(m.ink, INKS.amber, s.warm), s.light);
    const omega = scaleRGB(INKS.amber, s.light);
    // It leaves its seat as it stood there — bowed (squashed y, stretched x) — and straightens on its way (no pop on the hand-off).
    const straight = smoothstep(0, 0.6, s.w);
    const [sq, sx] = [lerp(m.sy, 1, straight), lerp(m.sx, 1, straight)];
    const em = s.em / m.sy;
    const cx = X(s.centre[0]);
    const widen = (q: Glyph): Glyph => ({ ...q, x: cx + (q.x - cx) * sx, stretch: (q.stretch ?? 1) * sx });
    if (m.kind === 'guest') out.faces.push(...charFace(m.face, { centre: s.centre, em, plan: L.chars, ink: (_, ch) => (ch === 'ω' ? omega : ink), alpha: s.alpha, rot: s.rot, squash: sq }).map(widen));
    else out.faces.push(...wholeFace(m.face, { centre: s.centre, em, ink, omega, alpha: s.alpha, rot: s.rot, plan: L.plan, squash: sq }).map(widen));
    if (m.glass) {
      // The glass goes with him: each tube segment as it stood when he let go, carried, turned and shrunk with his face, amber with him.
      const td = flightOf(m).td;
      const [c, sn] = [Math.cos(s.rot), Math.sin(s.rot)];
      for (const g of glassShapes(td, m.centre[0], m.centre[1], 1)) {
        const p = onScreen(td, [g.x + 960, 540 - g.y]);
        const [rx, ry] = [p[0] - s.from.at[0], -(p[1] - s.from.at[1])];
        const [qx, qy] = [s.scale * (rx * c - ry * sn), s.scale * (rx * sn + ry * c)];
        out.shapes.push({ ...g, x: X(s.centre[0]) + qx, y: Y(s.centre[1]) + qy, w: g.w * s.from.zoom * s.scale, h: g.h * s.from.zoom * s.scale, rot: (g.rot ?? 0) + s.rot, color: scaleRGB(mixRGB(g.color, INKS.amber, s.warm), s.light), alpha: (g.alpha ?? 1) * s.alpha });
      }
    }
  }
  return out;
}
/** How much of the company is in him by instant f (0 → 1, weighted: a wall face 1, a headliner 8, the guest and the cat 30 each). */
export function charge(f: number): number {
  let got = 0;
  let all = 0;
  for (const m of companyMembers()) {
    all += m.weight;
    const fl = flightOf(m);
    if (!(f >= fl.td)) continue;
    got += m.weight * (f >= fl.ta ? 1 : inward(m, f));
  }
  return all > 0 ? got / all : 0;
}
/** The flare each principal's and headliner's arrival lights in him: + 10 % each, decaying over ≈ 2 frames, saturating softly at + 35 % (ten arrive within two frames). */
export function arrivalFlare(f: number): number {
  let k = 0;
  for (const m of companyMembers()) {
    if (m.kind === 'wall') continue;
    const ta = flightOf(m).ta;
    if (f >= ta) k += STREAM.flare * Math.exp(-(f - ta) / 2);
  }
  return STREAM.flareMax * (1 - Math.exp(-k / STREAM.flareMax));
}

// ——— Him: the face, the arms on the burst, the ✧ popping off, the fold into the █ ——————————————————————————————————————————————————

/** What coming home does to him: his swell and his extra light with the whole company in him. */
export const HOME = { swell: 0.15, light: 0.35 } as const;
/**
 * The fold over a 16th (FOLD, U6): his glyphs slide to his centre and shrink on an S-curve (no step over 25 % of the way), while the █
 * grows out of his centre fast (31 % on + 1, 56 % on + 2, …): both read on + 1 … + 4, and the fold settles into the █ instead of
 * snapping.
 */
const foldU = (f: number): number => clamp((f - FOLD.from) / (FOLD.to - FOLD.from));
export const foldAt = (f: number): number => smoothstep(0, 1, foldU(f));
export const blockGrow = (f: number): number => 1 - (1 - foldU(f)) ** 2;
/**
 * Amber → green for the █: the channels amber has more of fall first, the ones green has more of rise later, so the turn passes
 * through a yellow-green, never through the pale yellow-white a straight mix of two over-bright inks clips to on its middle frame.
 * Its light is held between the two ends' luminance (integrator, v12): the channel-wise path alone dipped to ≈ 0.75 mid-turn, under
 * the terminal bloom's 0.85 threshold, and the █'s halo went out for one frame (5806) between two lit ones. It rises on an ease-in
 * (k², ending fixer a, F2): the █ brightens to the cursor's light with its last step of colour, on the tick, not a frame before it.
 */
const luma = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
export function coolInk(from: RGB, to: RGB, k: number): RGB {
  const down = smoothstep(0, 0.65, k);
  const up = smoothstep(0.35, 1, k);
  const ch = (i: number): number => lerp(from[i], to[i], from[i] > to[i] ? down : up);
  const c: RGB = [ch(0), ch(1), ch(2)];
  const got = luma(c);
  return got > 0 ? scaleRGB(c, lerp(luma(from), luma(to), k * k) / got) : c;
}
/**
 * His amber holds through the fold and the █'s first frames; the █ cools to the cursor's green over the dive's last `frames` on an
 * ease-in (u²: a quarter of the way on the landing − 1), so its change of identity lands on the tick (review F2): green for the first
 * time on the landing (5.4, U5b), OutroCursor's first frame, where in r4 the turn had finished two frames early and tick 1 only stopped.
 */
export const COOL = { frames: 2 } as const;
export const heroCool = (f: number): number => clamp((f - (SLAM.to - COOL.frames)) / COOL.frames) ** 2;
/** The arms on the burst (R2-ARMS-ATTACH): drawn back from the rim into the typed `ヽ(•ω•)ﾉ` (`retract`), whole for `hold`, gone by `fade`. */
export const ARMS_OFF = { retract: 2, hold: 1, fade: 1 } as const;
/**
 * The ✧ on the burst (review A8): it swells × 1.25 over 1.5 frames, then spins down to nothing by + 6, staying bright (α ≥ 0.6) with
 * its glint: a sparkle winking out. Faded by alpha alone, its additive amber went dark brown and sat over the Σ(°□°) seat on + 6.
 */
export const STAR_OUT = { frames: 6, swell: 0.25, spin: 1.4 } as const;
export const starOut = (t: number): number => (1 + STAR_OUT.swell * Math.sin(Math.PI * clamp(t / 3))) * (1 - smoothstep(1, STAR_OUT.frames, t));
export const ARMS_GONE = BURST + ARMS_OFF.retract + ARMS_OFF.hold + ARMS_OFF.fade;
/**
 * The █'s light: born with his (his button glow, his bow's + 50 %, the company's charge), so the fold hands his light to it instead of
 * dimming the frame (the fold's mean outside him fell 11 % in a frame with the r4 curve), easing to S01's lit cursor (1) by the turn to
 * green (COOL), whole on the landing.
 */
export const cursorLight = (f: number, his: number): number => lerp(his, 1, smoothstep(FOLD.from, SLAM.to - COOL.frames, f));
/** Him at instant f (rounded glyphs, flat world), the ✧ popping off (scale 1 → 1.4, α → 0, 6 f), his arms letting go on the burst, and the █. */
export function heroContent(f: number, rounded: Advance): { rounded: Glyph[]; cursor: Glyph | null; glint: Shape[] } {
  const pl = heroPlace(f);
  const fold = foldAt(f);
  const face = heroFace(f);
  const chars = [...face];
  const offs = faceOffsets(chars, rounded, heroAdvances(chars, rounded));
  const home = charge(f);
  const swell = 1 + HOME.swell * home;
  // His bow lights him + 50 % at its bottom, with the launch, held (U5b: through the held tableau he stays the brightest of the three bowing).
  const bowLight = principalBow(f, BOWS.hero, HERO_BOW).light;
  const light = glow(f, BOWS.hero, 0.6, 6) * bowLight * (f >= HOP.to ? glow(f, HOP.to, 0.3, 4) : 1) * (1 + HOME.light * home) * (1 + arrivalFlare(f));
  const cool = heroCool(f);
  const ink = scaleRGB(mixRGB(INKS.hero, INKS.green, cool), light);
  const bob = kickBob(f, BOB_KICKS);
  const [lookX, lookY] = face === HERO_OUT.alive ? glance(f) : [0, 0];
  const out: Glyph[] = [];
  // Each face coming home lights the glyph it goes into, and a soft glow where it went in (review a2: a contact, not a blink).
  const lit = chars.map(() => 0);
  const glows: Shape[] = [];
  if (f >= ABSORB.from && f < FOLD.to)
    for (const m of companyMembers()) {
      if (m.kind === 'wall') continue;
      const p = contactPulse(m, f);
      if (p <= 0) continue;
      const j = contactGlyph(m, offs);
      lit[j] = Math.max(lit[j], p);
      const c = contactAt(m, f, rounded);
      const size = pl.em * swell * (1 - fold * fold) * pl.sy;
      const r = CONTACT.glow.r * size;
      glows.push({ kind: 'ellipse', x: X(pl.centre[0] + c.x * pl.em * swell * pl.sx * (1 - fold)), y: Y(pl.centre[1]) + c.up * size, w: r, h: r, color: mixRGB(INKS.hero, INKS.hot, CONTACT.glow.hot), alpha: CONTACT.glow.alpha * p, soft: 0.45 * r });
    }
  if (fold < 1) {
    chars.forEach((ch, i) => {
      const dx = offs[i] * pl.em * swell * pl.sx * (1 - fold);
      const dy = ch === 'ω' && chars.length === 5 ? -bob : 0;
      const eye = ch === '•' ? [lookX * pl.em, lookY * pl.em] : [0, 0];
      out.push({ ch, x: X(pl.centre[0] + dx) + eye[0], y: Y(pl.centre[1]) + dy + eye[1], size: pl.em * swell * (1 - fold * fold) * pl.sy, stretch: (pl.sx / pl.sy) * (ch === '－' ? HERO_DASH : 1), color: lit[i] > 0 ? scaleRGB(ink, 1 + CONTACT.light * lit[i]) : ink });
    });
  }
  out.push(...heroArms(f, rounded, pl, offs, ink));
  out.push(...heroPumps(f, rounded, pl, offs, ink));
  const star = starAt(BURST - 1);
  const t = f - BURST;
  const popped = star && t < STAR_OUT.frames ? { ...star, size: star.size * starOut(t), rot: star.rot + STAR_OUT.spin * clamp(t / STAR_OUT.frames), twinkle: 0, pop: 1 - clamp(t / STAR_OUT.frames) } : null;
  out.push(...starGlyphs(popped, 1 - smoothstep(STAR_OUT.frames - 2, STAR_OUT.frames, t) * 0.4));
    const cursor: Glyph | null = fold > 0 ? { ch: '█', x: X(pl.centre[0]), y: Y(pl.centre[1]), size: TERM.fontPx * cursorScale(f) * blockGrow(f), color: scaleRGB(coolInk(INKS.hero, INK.green, cool), 1.1 * cursorLight(f, light)) } : null;
  return { rounded: out, cursor, glint: [...starGlint(popped, 1), ...glows] };
}
/**
 * His eyes follow the roll call (review A4: a visible reaction instead of an idle hold front-centre): on each call from 4.1& his •s
 * glance toward the seat just called (at most `x` em across and `y` em up, a saccade over `frames`), front again as the leads plant,
 * to the cat on 5.1 and to the guest on 5.1& as they bow, front on the anticipation. [x right, y up] in ems of his em.
 */
export const GLANCE = { x: 0.07, y: 0.05, frames: 2 } as const;
const GLANCES: readonly { at: number; to: readonly [number, number] }[] = [
  ...CALLS.slice(1).map((at, i) => {
    const [sx, sy] = headlinerSeat(i + 1).at;
    const [dx, dy] = [sx - FRONT.hero, sy - FRONT.y];
    const d = Math.hypot(dx, dy);
    return { at, to: [(GLANCE.x * dx) / d, (-GLANCE.y * dy) / d] as const };
  }),
  { at: WALK_ON.to, to: [0, 0] as const },
  { at: BOWS.cat, to: [GLANCE.x, 0] as const },
  { at: BOWS.guest, to: [-GLANCE.x, 0] as const },
  { at: ANTICIPATE, to: [0, 0] as const },
];
export function glance(f: number): [number, number] {
  let from: readonly [number, number] = [0, 0];
  let to: readonly [number, number] = [0, 0];
  let since = -Infinity;
  for (const g of GLANCES) {
    if (!struck(g.at, f)) break;
    from = to;
    to = g.to;
    since = g.at;
  }
  const u = ease.outCubic(clamp((f - since + 0.25) / GLANCE.frames));
  return [lerp(from[0], to[0], u), lerp(from[1], to[1], u)];
}
/** Where his typed arm ヽ / ﾉ sits (flat world x) beside his bracket, for his face's offsets `offs` at `across` px an em, centred on cx. */
function typedArmX(ch: 'ヽ' | 'ﾉ', cx: number, offs: readonly number[], across: number, rounded: Advance): number {
  const [slot, side] = ch === 'ヽ' ? [offs[0], -1] : [offs[offs.length - 1], 1];
  return cx + slot * across + side * (rounded(ch === 'ヽ' ? '(' : ')') / 2 + FACE_TRACKING + rounded(ch) / 2) * across;
}
/**
 * His arm pumps on the encore's claps, 4.2 and 4.4 (review A4): his own typed arms ヽ(•ω•)ﾉ pop up beside his brackets on the clap,
 * rise `rise` em tilting out (L, ¾ by + 2), and drop away by + `hold` + `out`. Nothing new: the arms he wore on the burst.
 */
export const PUMP = { rise: 0.12, tilt: 0.28, hold: 5, out: 4 } as const;
const PUMP_CLAPS = CLAPS.filter((c) => c > BURST && c < BOWS.cat);
function heroPumps(f: number, rounded: Advance, pl: ReturnType<typeof heroPlace>, offs: readonly number[], ink: RGB): Glyph[] {
  for (const c of PUMP_CLAPS) {
    const t = f - c;
    if (t < -0.25 || t >= PUMP.hold + PUMP.out) continue;
    const up = ease.outCubic(clamp((t + 0.25) / 2)) * (1 - smoothstep(PUMP.hold, PUMP.hold + PUMP.out, t));
    const alpha = 1 - smoothstep(PUMP.hold + 1, PUMP.hold + PUMP.out, t);
    const em = pl.em * (1 + HOME.swell * charge(f));
    const across = em * pl.sx;
    const [cx, cy] = [X(pl.centre[0]), Y(pl.centre[1])];
    return (['ヽ', 'ﾉ'] as const).map((ch) => ({
      ch,
      x: typedArmX(ch, cx, offs, across, rounded),
      y: cy + PUMP.rise * em * up,
      size: em * pl.sy,
      stretch: pl.sx / pl.sy,
      rot: (ch === 'ヽ' ? 1 : -1) * PUMP.tilt * up,
      color: ink,
      alpha,
    }));
  }
  return [];
}
/** His arms on the burst at instant f (rounded glyphs, flat world; `offs` and `ink` are his face's): see ARMS_OFF. */
function heroArms(f: number, rounded: Advance, pl: ReturnType<typeof heroPlace>, offs: readonly number[], ink: RGB): Glyph[] {
  if (f < BURST || f >= ARMS_GONE) return [];
  const irisFace0 = irisFace(BURST - 1, rounded);
  const [ix, iy] = irisFace0.centre;
  const [cx, cy] = [X(pl.centre[0]), Y(pl.centre[1])];
  const k = pl.em / IRIS.hero.em;
  const u = ease.outCubic(clamp((f - BURST) / ARMS_OFF.retract));
  const alpha = 1 - clamp((f - BURST - ARMS_OFF.retract - ARMS_OFF.hold) / ARMS_OFF.fade);
  const em = pl.em * (1 + HOME.swell * charge(f));
  const across = em * pl.sx;
  const typedX = (ch: 'ヽ' | 'ﾉ'): number => typedArmX(ch, cx, offs, across, rounded);
  return armEnds(BURST - 1, irisFace0).map((e) => {
    const ch = e.ch;
    const typed = { x: typedX(ch), y: cy, size: em * pl.sy, stretch: pl.sx / pl.sy, rot: 0 };
    if (u >= 1) return { ch, ...typed, color: ink, alpha };
    const rim = (p: readonly [number, number]): [number, number] => [cx + (p[0] - ix) * k, cy - (p[1] - iy) * k];
    const at = (p: readonly [number, number]): [number, number] => [typed.x + p[0] * typed.size * typed.stretch, typed.y + p[1] * typed.size];
    const [b0, t0, b1, t1] = [rim(e.base), rim(e.tip), at(ARM_INK[ch].base), at(ARM_INK[ch].tip)];
    const base: [number, number] = [lerp(b0[0], b1[0], smoothstep(0, 0.5, u)), lerp(b0[1], b1[1], smoothstep(0.4, 1, u))];
    const tip: [number, number] = [lerp(t0[0], t1[0], u), lerp(t0[1], t1[1], u)];
    return { ch, ...layArm(ch, base, tip, lerp(IRIS.hero.em * ARMS.scale[ch] * k, typed.size, u)), color: ink, alpha };
  });
}

// ——— The stage ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The stage at instant f, in the flat world under stagePose(f): the stage lines (lit by the kicks), the follow-spot, the wall, the
 * headliners, the guest with his glass and the cat (with its speed lines). From the button everything here powers down (stageDim:
 * the level times the vignette closing on him), and each member leaves it as it lets go (it is drawn by `streamers` from then on).
 */
export function stageContent(f: number, L: { rounded: Advance; mono: Advance; plan: OmegaPlan; wallPlan: OmegaPlan; chars: CharPlan }): { under: Shape[]; glyphs: Record<string, Glyph[]>; light: Shape[]; over: Shape[] } {
  const a = stageAim(f);
  const toScreen = (x: number, y: number): [number, number] => [960 + (X(x) - a.x) * a.zoom, 540 - (Y(y) - a.y) * a.zoom];
  const powered = f >= POWER_DOWN.from;
  const dim = (x: number, y: number): number => (powered ? stageDim(f, ...toScreen(x, y)) : 1);
  const under: Shape[] = [];
  const light: Shape[] = [];
  const over: Shape[] = [];
  const g: Record<string, Glyph[]> = { wall: [], faces: [], rounded: [], mono: [] };
  // The stage lines, in segments so the power-down's vignette falls along them.
  const base = clamp((f - BURST) / 4) * LINES.alpha;
  const kick = kickFlash(f);
  const ret = returnFlash(f);
  for (const y of LINES.ys)
    for (let x = LINES.x0; x < LINES.x1; x += LINES.segment) {
      const d = dim(x + LINES.segment / 2, y);
      const lean = 1 - RETURN.lean * ((x - LINES.x0) / (LINES.x1 - LINES.x0));
      const flash = y === LINES.ys[1] && ret > 0 ? Math.max(LINES.kick * kick, RETURN.flash * lean * ret) : LINES.kick * kick;
      if (d > 0.002) under.push({ kind: 'rect', x: X(x + LINES.segment / 2), y: Y(y), w: LINES.segment, h: 1.2, color: INKS.mint, alpha: base * (1 + flash) * d });
    }
  if (ret > 0) {
    const [bx] = headlinerSeat(4).at;
    light.push({ kind: 'ellipse', x: X(bx), y: Y(LINES.ys[1]), w: RETURN.pool.w, h: RETURN.pool.h, color: INKS.mint, alpha: RETURN.pool.alpha * ret, soft: RETURN.pool.h * 0.45 });
  }
  // The follow-spot (the light collapsing onto him: not dimmed, it closes).
  const spot = followSpot(f);
  if (spot && spot.alpha > 0) light.push({ kind: 'ellipse', x: X(spot.x), y: Y(spot.y), w: spot.w, h: spot.h, color: mixRGB(INKS.mint, INKS.amber, spot.warm), alpha: spot.alpha, soft: Math.min(90, spot.h * 0.4) });
  // The wall.
  const members = companyMembers();
  // The wall powers down with the tube's level only: the vignette closing on him is the wall itself letting go from the outside in
  // (each face carries its light in as a spark), not a shadow over faces still in their seats (review F1 / S1: the two together took
  // ≈ 30 % of the stage's lit ink in a frame).
  const wall = wallContent(f, L.wallPlan, (i) => gone(f, members[i]), (x, y) => (powered ? Math.max(stageLevel(f), dim(x, y)) : 1));
  g.wall.push(...wall.wall);
  g.mono.push(...wall.mono);
  // The headliners.
  HEADLINERS.forEach((_, k) => {
    const h = headlinerAt(k, f);
    if (!h || gone(f, byKind('headliner', k))) return;
    const d = dim(h.centre[0], h.centre[1]) * h.level;
    if (d <= 0.002) return;
    if (HEADLINERS[k].spot === null && Math.round(f) < BURST + 1) {
      g.mono.push({ ch: DECODE[Math.floor(hash(k, seedFrame(Math.round(f)), 79) * DECODE.length)], x: X(h.centre[0]), y: Y(h.centre[1]), size: h.em, color: scaleRGB(h.ink, 1.6 * d) });
      return;
    }
    const wf = worldFlash(k, f, h, L.plan);
    if (wf.mix > 0) {
      light.push(...wf.shapes.map((s) => ({ ...s, alpha: (s.alpha ?? 1) * d })));
      g.faces.push(...wf.ghosts.map((q) => ({ ...q, color: scaleRGB(q.color, d) })));
    }
    g.faces.push(...bowFace(h.face, { centre: h.centre, em: h.em / h.sy, sy: h.sy, sx: h.sx, ink: scaleRGB(mixRGB(h.ink, wf.ink, wf.mix), h.light * d), omega: scaleRGB(INKS.amber, d), plan: L.plan }));
  });
  // The guest (red, his ω amber) with the glass high on his ヽ.
  const guest = walkOn(f, 'guest');
  if (guest.on && !gone(f, byKind('guest'))) {
    const d = dim(guest.x, guest.y);
    const ink = scaleRGB(GUEST_INK, guest.light * d);
    const omega = scaleRGB(INKS.amber, Math.min(1, guest.light) * d);
    const peek = guestPeek(f);
    const cx = X(guest.x);
    g.faces.push(
      ...charFace(GUEST_OUT.onStage, { centre: [guest.x, guest.y], em: FRONT.em, plan: L.chars, ink: (_, ch) => (ch === 'ω' ? omega : ink), squash: guest.sy }).map((q) => ({
        ...q,
        x: cx + (q.x - cx) * guest.sx,
        y: q.ch === '￣' ? q.y + peek : q.y,
        stretch: (q.stretch ?? 1) * guest.sx,
      })),
    );
    over.push(...glassShapes(f, guest.x, guest.y, Math.max(0.3, guest.light) * d));
  }
  // The cat, and the speed lines of its dash.
  const cat = walkOn(f, 'cat');
  if (cat.on && !gone(f, byKind('cat'))) {
    const d = dim(cat.x, cat.y);
    const glyphs = bowFace(catFace(f), { centre: [cat.x, cat.y], em: FRONT.em, sy: cat.sy, sx: cat.sx, ink: scaleRGB(CAT_INK, cat.light * d), omega: scaleRGB(INKS.amber, Math.min(1, cat.light) * d), plan: L.plan });
    g.faces.push(...glyphs.map((q) => ({ ...q, rot: cat.rot })));
    const dash = 1 - smoothstep(WALK_ON.to - 3, WALK_ON.to, f);
    if (f >= CAT_DASH.from && dash > 0) {
      const right = cat.x + half(CAT_OUT.face) * FRONT.em * cat.sx;
      for (const dy of [-0.14, 0.12]) under.push({ kind: 'segment', x: X(right + 24 + 60), y: Y(cat.y + dy * FRONT.em), w: 120, h: 2, color: INKS.mint, alpha: 0.55 * dash });
    }
  }
  // (Him: heroContent, drawn last by the scene, over the stream: never dimmed.)
  return { under, glyphs: g, light, over };
}
/** A face's half-width in ems: its terminal cells at 0.6 em. */
const half = (face: string): number => faceEm(face) / 2;
/**
 * The iris's prompt and counter, swallowed on the burst: drawn from the iris at BURST − 1, α (1 − u)² over 4 f — a quarter left on + 2,
 * gone by + 4, before he falls through their line.
 */
export const swallow = (f: number): number => (1 - clamp((f - BURST) / 4)) ** 2;
/** The friends W5 counts from the burst: the eight, the boot's headliner, every wall face printed, the cat (as the leads plant), the guest's drop. */
export function companyFriends(F: number): number {
  return 8 + (F >= BURST + 1 ? 1 : 0) + wallPrinted(F) + (F >= WALK_ON.to ? 1 : 0) + (F >= DROP.to ? 1 : 0);
}

/** The terminal's finishing, the band rolling once a bar: S01's look (introLook at −24 is this), so the stage is the tube all along. */
export function companyLook(frame: number): Look {
  const F = Math.round(frame);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  return terminalLook(1, 0, band, TERMINAL_CURVATURE);
}
/** 32 sub-frames on the burst and its flights and from the walk-ons (the dash, the bows); 64 from the button through the dive; 24 between. */
export function companyTemporal(frame: number): Temporal {
  if (frame >= BOWS.hero - 1) return { samples: 64, shutter: 0.5, persistence: 0 };
  return { samples: frame <= BURST + 24 || frame >= WALK_ON.from - 1 ? 32 : 24, shutter: 0.5, persistence: 0 };
}
export const companySegment = (): Segment => ({ from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to });

/** Every string the company draws per atlas: the wall's faces; the headliners, the guest and the cat (whole faces); his faces; the cursor. */
export const COMPANY_STRINGS = {
  wall: WALL_FACES,
  faces: [...HEADLINERS.map((h) => h.face), GUEST_OUT.onStage, CAT_OUT.face, CAT_OUT.bow],
  rounded: [HERO_OUT.wink, HERO_OUT.alive, HERO_OUT.bow, HERO_OUT.star, 'ヽﾉ'],
  mono: [DECODE, '█'],
} as const;
