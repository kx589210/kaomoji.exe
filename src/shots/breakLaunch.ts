// Break bar 6, the slingshot (src/score/break.ts LAUNCH), as pure functions of the frame. Owned by the launch builder (build sheet
// notes/break/break-sheet.md §2.4, §3 break bar 6, §4.5 (brows, uppercut, slingshot), §4.6 (break bar 6), §4.7 (extrude, band, peg), §4.8
// (the window), §4.10 (the contact ✧), §7.2, §7.3). Positions are layout px (1920 × 1080, origin top-left, y down) unless a name says
// engine; the world is seen through launchCam (breakCam of src/shots/breakShared.ts, reshaped from break 6.2&), the window is screen-fixed.
//   - the hard match cut into the callout on break 6.1: (ง•ω•)ง✧ with its ω on the frame centre at zoom 1.60, the camera pulling back to
//     1.10 and turning −4° over the bar;
//   - the extrude stack (8 coloured copies of his face core at (−9k, +9k) and a 9th in ink) breathing 9 → 11 → 13 px, its colours
//     chasing one copy deeper on every 16th; his brows dropping in on break 6.1e and 6.1&; his right fist uppercutting [ LOUDER ] on 6.2;
//   - break 6.3: ─=≡Σ((( つ•ω•)つ steps back 90 / 80 / 70 / 60 px on the slingshot's steps (his body squashing to x 0.82 / y 1.10 on each
//     hit frame, his •ω• kept round) and creeps on the 32nds of the held breath; on 6.3's own frame the copies drop their faces whole
//     (no fade, no smear) and their ")" fly out as the band — links at 0.55 his size strung on an ink cord from his fist to a bold
//     anchor post that pops in front of him — widening on every step, rippling a frame per link; tension pulses run post → him on 6.3,
//     6.3& and every 32nd of 6.4 and the held breath; after the hit (6.3 + 3) the blocks (break bar 5's places, the violet one cream) shear −10° toward him;
//   - the camera: breakCam's through the uppercut and on the break's last frame (drop 2's hand-off); between, it pulls back with the slingshot (revealing
//     the band and the peg), kicks its roll on break 6.3& / 6.4 / 6.4e and pushes in through the held breath, so the energy rises into drop2 1.1;
//   - E5's window (screen, the system's one voice): party too loud → LOUDER → requires root → sudo make it louder (a word per 16th) →
//     the password with ONE frame of 150bpm!! → access granted ヽ(°〇°)ﾉ → the volume gauge running away and [WARN] party overload.
// launchAt(f, L) turns all of it into FlatContent for src/scenes/breakLaunch.ts; drop 2 reads the state on the break's last frame from here (§7.3) and the
// film from src/shots/breakFilm.ts. Strings come from src/content/break.ts and castBreak.ts. Plain Node imports it: no three / remotion /
// react imports.
import { CURSOR, GAUGES, QUESTION, SPARKLE, WINDOW_TEXTS, WINDOW_TEXTS_V2 } from '../content/break.ts';
import { BROWS, DIALOG_FACE, HERO_FACES, HERO_FACES_V2, PAWS } from '../content/castBreak.ts';
import type { Pose } from '../engine/camera.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD, type Segment, type Temporal } from '../engine/temporal.ts';
import { layoutLines, lineWidth } from '../engine/textGrid.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import * as BR from '../score/break.ts';
// (v04's held instants: BR.asBuiltHeld — heldFrame, and v04's last frame from BR.BREAK_END on; skeleton wiring, sheet notes/bid2/break-sheet2.md §4.3)
import { rigAt } from '../score/energy.ts';
import { partFrame } from '../score/film.ts';
import {
  BAR25_BLOCKS,
  BAR25_CONFETTI,
  CONFETTI_FORM,
  BLOCK_STYLE,
  BREAK_LOOK,
  BREAK_PALETTE as P,
  type BreakCam,
  type BreakColor,
  HERO_ADVANCE,
  HERO_EM,
  HERO_STYLE,
  breakCam,
  breathe,
  camPose,
  flow,
  frameOf,
  fromScreen,
  impact,
  impactSquash,
  launchL,
  pop,
  rotOf,
  rotate,
  snap,
  spring,
  tighten,
  toScreen,
} from './breakShared.ts';
import { meter } from './hud.ts';

/** What only the browser can measure: the hero font's advances (ems). Tests pass a fake. */
export type LaunchLayout = { advance: Advance };

const READY = HERO_FACES.ready; // (ง•ω•)ง✧ — the brows ˋ ˊ drop onto it
const ZOOM = HERO_FACES.zoom; // ─=≡Σ((( つ•ω•)つ
/** His face core, bracket to bracket: what every copy of the stack and the band shows. */
const CORE = '(•ω•)';
const EM = HERO_EM; // 360

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const LAST = BR.BREAK_END - 1;

// ——— The camera ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Cubic Hermite from (t0, v0, slope m0) to (t1, v1, slope m1), slopes per frame. */
const hermite = (t: number, t0: number, v0: number, m0: number, t1: number, v1: number, m1: number): number => {
  const d = t1 - t0;
  const u = clamp((t - t0) / d);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * d * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * d * m1;
};
/** From break 6.2& (the root flip) the launch reshapes breakCam's pull-back; through the uppercut it is breakCam's own. */
const RESHAPE = BR.ROOT;
/** How wide the pull-back goes by break 6.4& (the band and the peg in view), before the held breath pushes in to breakCam's value on the break's last frame. */
const ZOOM_LOW = 1.045;
const baseZoom = (f: number): number => breakCam(f).zoom;
const Z0 = baseZoom(RESHAPE);
const M0 = (baseZoom(RESHAPE + 1e-3) - baseZoom(RESHAPE - 1e-3)) / 2e-3;
const Z_END = baseZoom(LAST);
/** The bar's zoom: on from the uppercut's 1.45 (with its speed) to 1.045 on break 6.4&, then a push that gathers speed into the break's last frame. */
const launchZoom = (f: number): number =>
  f < BR.HELD ? hermite(f, RESHAPE, Z0, M0, BR.HELD, ZOOM_LOW, 0) : hermite(f, BR.HELD, ZOOM_LOW, 0, LAST, Z_END, (2 * (Z_END - ZOOM_LOW)) / (LAST - BR.HELD));
/** Roll kicks (degrees, anticlockwise like the bar's turn) on the steps of break 6.3&, 6.4 and 6.4e: bigger each time. */
const KICKS: readonly (readonly [number, number])[] = [
  [BR.SLINGSHOT[1], -0.8],
  [BR.SLINGSHOT[2], -1.2],
  [BR.SLINGSHOT[3], -1.6],
];
/** A kick's shape: off at full speed on its frame, peaking ≈ 1.8 frames in, exactly 0 from 11 frames. */
const kickShape = (t: number): number => (t <= 0 ? 0 : (1 - Math.exp(-t / 1.2)) * Math.exp(-t / 4) * (1 - smoothstep(6, 11, t)));
const KICK_PEAK = Math.max(...Array.from({ length: 400 }, (_, i) => kickShape(i / 40)));
const rollKick = (f: number): number => sum(KICKS.map(([at, a]) => (a * kickShape(f - at)) / KICK_PEAK));

/**
 * Break bar 6's shot camera: breakCam's (the cut at 1.60, the pull-back, the −4° turn) through the uppercut and exactly on the break's last frame (drop 2
 * reads breakCam there); in between the pull-back runs on with the slingshot to 1.045 on break 6.4& (revealing the band and the peg as he
 * steps back), the roll kicks on break 6.3& / 6.4 / 6.4e, and the held breath pushes in, faster and faster, to the last frame's 1.10013.
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function launchCam(at: number): BreakCam {
  if (seamV2(at)) return launchCamV2(at);
  const f = BR.asBuiltHeld(at);
  const c = breakCam(f);
  if (f < RESHAPE || f >= LAST) return c;
  return { ...c, zoom: launchZoom(f), roll: c.roll + rollKick(f) };
}

// ——— The hero ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Which face he wears: (ง•ω•)ง✧ from the cut, ─=≡Σ((( つ•ω•)つ from break 6.3 (swapped at the output frame: whole on 6.3's frame). */
export const heroText = (f: number): string => (frameOf(f) >= BR.SLINGSHOT[0] ? ZOOM : READY);

/** How far back each slingshot step takes his ω (px), how much each squashes his body in x, and each creep of the held breath. */
const STEP_PX: readonly number[] = [90, 80, 70, 60];
const SQUASH_X: readonly number[] = [0.06, 0.04, 0.04, 0.04];
const SQUASH_Y = 0.025;
const SAG_PX = 2;
const CREEP_PX = 4;
/** His face core (the eyes and the ω) keeps only this share of the body's squash: the ω stays a ω (≥ 0.92 as wide), never a "w". */
const FACE_SQUASH = 0.2;
const FACE = new Set(['•', 'ω']);
/** A step's squash overshoots by this share of itself on its hit frame, then rings back (I's spring). */
const SQUASH_RING = 0.5;

/**
 * Each slingshot step's launch at instant f, seen `lag` frames late: an L that is off at full speed on the step's own hit frame (taken
 * at the output frame, a frame into the L there), so the K + C lands on a picture already moving, not on one at rest.
 */
const stepsAt = (f: number, lag = 0): number[] => BR.SLINGSHOT.map((at) => (frameOf(f - lag) < at ? 0 : launchL(f - lag - at + 1)));
/** Each step's squash: taken at the output frame (whole on its hit frame, half again over), ringing back to 1 over ≈ 10 f. */
const squashAt = (f: number, at: number): number => {
  if (frameOf(f) < at) return 0;
  const t = Math.max(0, f - at);
  return 1 + SQUASH_RING * Math.exp(-0.45 * t) * Math.cos(0.9 * t) * (1 - smoothstep(9, 14, t));
};
/**
 * A creep of the held breath at instant f: a 2-frame snap that lands on its 32nd (the arp's note) — a frame into it on its own frame
 * (taken at the output frame: none of it the frame before), whole a frame later, so the break's last frame holds exactly its numbers. The film's depth
 * and its black spot creep on the same frames (src/shots/breakFilm.ts).
 */
export const creepAt = (f: number, at: number): number => (frameOf(f) < at ? 0 : snap(f - at + 1, 2));
const creepsAt = (f: number): number[] => BR.CREEP.map((at) => creepAt(f, at));
/** His ω's x when the steps are seen `lag` frames late (the band's ripple). */
const heroX = (f: number, lag = 0): number => 960 - sum(stepsAt(f, lag).map((v, i) => STEP_PX[i] * v)) - CREEP_PX * sum(creepsAt(f));

/** His face, his ω's placement point (layout px), his body's squash (x, y), his face core's (fx, fy), and his em. */
export type HeroPose = { text: string; omega: [number, number]; sx: number; sy: number; fx: number; fy: number; em: number };
export function heroPose(f: number): HeroPose {
  if (seamV2(f)) return heroPoseV2(f);
  const q = BR.SLINGSHOT.map((at) => squashAt(f, at));
  const sx = 1 - sum(q.map((v, i) => SQUASH_X[i] * v));
  const sy = 1 + SQUASH_Y * sum(q);
  return {
    text: heroText(f),
    omega: [heroX(f), 540 + SAG_PX * sum(stepsAt(f))],
    sx,
    sy,
    fx: 1 - FACE_SQUASH * (1 - sx),
    fy: 1 + FACE_SQUASH * (sy - 1),
    em: EM,
  };
}

/** Each character of `text` with its centre's offset from the ω's centre in px, every advance squashed by its own part (face or body). */
function around(text: string, advance: Advance, h: { sx: number; fx: number } = { sx: 1, fx: 1 }): { ch: string; o: number }[] {
  const chars = [...text];
  const iw = chars.indexOf('ω');
  let x = 0;
  const centres = chars.map((ch) => {
    const a = advance(ch) * EM * (FACE.has(ch) ? h.fx : h.sx);
    const c = x + a / 2;
    x += a;
    return c;
  });
  return chars.map((ch, j) => ({ ch, o: centres[j] - centres[iw] }));
}

/** A character placed in the world (layout px): size in px, horizontal stretch, rotation in degrees clockwise; dx/dy the uppercut's share. */
export type PlacedChar = { ch: string; x: number; y: number; size: number; stretch: number; rot: number; dx: number; dy: number; alpha?: number };

// E5's uppercut: the second ง of (ง•ω•)ง✧ (his right fist) alone moves.
/**
 * The top of ง's ink, ems above its placement point: Noto Sans Thai Looped's ง reaches 0.562 em over the baseline and the rounded
 * stack's 'middle' sits 0.377 em over it (both read from the font files with opentype.js; 0.3 left the fist ≈ 45 px short on screen).
 */
export const FIST_TOP = 0.185;
/** The fist tilts in (anticlockwise) as it rises. */
const FIST_ROT = -12;
/** The sheet's window, in screen px: JetBrains Mono Bold 26 px on a 15.6 × 34 px cell, 50 columns from (1094, 46). */
export const WIN = { x0: 1094, y0: 46, cols: 50, cell: 15.6, row: 34, size: 26 } as const;
const rowY = (r: number): number => WIN.y0 + WIN.row * r + WIN.row / 2;
const colX = (c: number, w = 1): number => WIN.x0 + (c + w / 2) * WIN.cell;
/** [ LOUDER ] sits on row 3, columns 30–39: its centre and its bottom edge (screen px). */
export const LOUDER_BUTTON = { x: colX(30, 10), y: rowY(3), bottom: rowY(3) + WIN.row / 2 } as const;

/** How far into the uppercut the fist is: 0 until break 6.1a, eased in (cubic) to 1 on 6.2, back to rest with an L by 6.2&. */
export function uppercut(f: number): number {
  const lead = 6;
  if (f <= BR.LOUDER - lead) return 0;
  if (f <= BR.LOUDER) return ((f - (BR.LOUDER - lead)) / lead) ** 3;
  return 1 - launchL(f - BR.LOUDER);
}

/**
 * The world offset (layout px) that puts the fist's ink top on [ LOUDER ]'s bottom edge on break 6.2, solved in screen px: the button is
 * screen-fixed, so its edge is taken back through the rig's punch and the launch's camera into the world.
 */
function fistReach(L: LaunchLayout): [number, number] {
  const h = heroPose(BR.LOUDER);
  const fist = around(READY, L.advance, h)[6];
  const rest: [number, number] = [h.omega[0] + fist.o, h.omega[1]];
  const a = (FIST_ROT * Math.PI) / 180;
  const t = FIST_TOP * EM * h.sy;
  const z = rigAt(BR.LOUDER).zoom;
  const [tx, ty] = fromScreen(launchCam(BR.LOUDER), 960 + (LOUDER_BUTTON.x - 960) / z, 540 + (LOUDER_BUTTON.bottom - 540) / z);
  return [tx - rest[0] - Math.sin(a) * t, ty - rest[1] + Math.cos(a) * t];
}

/** Every visible character of his face at instant f (no spaces), squashed about his ω (his face core lightly, his body fully); the fist carries the uppercut. */
export function heroChars(f: number, L: LaunchLayout): PlacedChar[] {
  if (seamV2(f)) return heroCharsV2(f, L);
  const h = heroPose(f);
  const p = h.text === READY ? uppercut(f) : 0;
  const reach = p !== 0 ? fistReach(L) : [0, 0];
  return around(h.text, L.advance, h).flatMap(({ ch, o }, j) => {
    if (ch.trim() === '') return [];
    const fist = h.text === READY && j === 6;
    const dx = fist ? reach[0] * p : 0;
    const dy = fist ? reach[1] * p : 0;
    const [sx, sy] = FACE.has(ch) ? [h.fx, h.fy] : [h.sx, h.sy];
    return [{ ch, x: h.omega[0] + o + dx, y: h.omega[1] + dy, size: EM * sy, stretch: sx / sy, rot: fist ? FIST_ROT * p : 0, dx, dy }];
  });
}

/** The brows' placement over the eyes' centres (ems: ˋ ˊ sit high in their em box, so their ink lands ≈ 0.35 em above the eye) and the fall they drop in on (px, over BROW_LEAD frames, an impact). */
const BROW_LIFT = 0.12;
const BROW_DROP = 120;
const BROW_LEAD = 5;
/** His brows, ˋ over the left eye (lands break 6.1e) and ˊ over the right (6.1&), dropping in from above with a 1.06 squash. */
export function brows(f: number, L: LaunchLayout): PlacedChar[] {
  if (seamV2(f)) return browsV2(f, L);
  const h = heroPose(f);
  const eyes = around(h.text, L.advance, h).filter((c) => c.ch === '•');
  const out: PlacedChar[] = [];
  BR.BROWS.forEach((land, i) => {
    const t = f - land;
    if (t < -BROW_LEAD) return;
    const u = impact(t, BROW_LEAD);
    const [along, across] = impactSquash(t);
    out.push({
      ch: BROWS[i],
      x: h.omega[0] + eyes[i].o,
      y: h.omega[1] - BROW_LIFT * EM * h.fy - BROW_DROP * (1 - u),
      size: EM * h.fy * along,
      stretch: ((h.fx / h.fy) * across) / along,
      rot: 0,
      dx: 0,
      dy: 0,
      alpha: clamp((t + BROW_LEAD) / 1.5),
    });
  });
  return out;
}

// ——— The extrude stack → the band; the peg ——————————————————————————————————————————————————————————————————————————————————————

export type CopyColor = 'cream' | 'yellow' | 'mint' | 'coral' | 'ink';
const COPY_COLORS: readonly CopyColor[] = ['cream', 'yellow', 'mint', 'coral'];
/**
 * One copy of his face core. (x, y) is its ω's placement point, (bx, by) its ")" (the band is made of these), `core` whether the rest
 * of the face shows (1 in the stack, 0 — whole, on break 6.3's own frame — once it is a band link), `scale` its size (1 in the stack, LINK
 * as a link; the ink copy goes to 0 on break 6.3), its squash, its outline (px), whether a tension pulse lights its outline, and its turn
 * (degrees clockwise: a link lies across the cord).
 */
export type Copy = { k: number; x: number; y: number; bx: number; by: number; core: number; color: CopyColor; scale: number; sx: number; sy: number; outline: number; white: boolean; rot: number };

/** The ")" of (•ω•) sits this many ems right of the ω's centre (the sheet's measured advances: ω/2 + • + )/2). */
export const BRACKET_O = HERO_ADVANCE['ω'] / 2 + HERO_ADVANCE['•'] + HERO_ADVANCE[')'] / 2;
/** The band's links: the copies' ")" at this share of his size, so they read as links of a band, not as more of him. */
export const LINK = 0.55;
/**
 * The anchor peg the band is hooked on (layout px; r its radius): right of his fist and level with its lower edge, clear of the cream
 * block above it and the mint block below it, on screen from break 6.3's hit (x ≈ 1860 at zoom 1.33) to the break's last frame (≈ (1700, 650)). It pops in on
 * break 6.3 on his fist's tip (drawn in front of him: the band's pin) and he pulls away from it; from 6.3& + 4 it stands clear of his fist.
 */
export const PEG = { x: 1615, y: 690, r: 30 } as const;
/** つ's advance (M PLUS Rounded 1c ExtraBold, measured with opentype like HERO_ADVANCE): his right fist's place without the browser. */
const TSU_ADVANCE = 1;
/** Where the cord leaves his fist: inside his right つ, low (ems from つ's placement point; x squashed with him). */
const GRIP = { x: 0.12, y: 0.3 } as const;
/** The cord: ink, thinning from 10 to 6 px as it stretches to 380 px. */
const CORD = { w0: 10, w1: 6, len: 380 } as const;
/** The links trail one another: by half a frame in their flight on break 6.3 (out in 5 frames, cubic-out: no overshoot), by a frame in the ripple of each step. */
const FLIGHT = { frames: 5, stagger: 0.5 } as const;
const STAGGER = 1;
/** The band's sag (px) while it is slack, gone as it pulls taut. */
const SAG = 12;
/** The tension pulses: a white outline running peg → him on break 6.3's two steps and on every 32nd of 6.4 and the held breath. */
const PULSES: readonly number[] = [BR.SLINGSHOT[0], BR.SLINGSHOT[1], ...BR.TENSION, ...BR.CREEP];
/** The stack's step (px per copy): 9, breathing to 11 on break 6.1& and to 13 on 6.2&. */
export const stackStep = (f: number): number => 9 + sum(BR.STACK_BREATHS.map((at) => 2 * launchL(f - at)));
/** How many 16ths the colour chase has stepped (0 on the cut, 7 from break 6.2a). */
export const chaseOf = (f: number): number => Math.max(0, BR.STACK_CHASE.filter((at) => at <= frameOf(f)).length - 1);
/** Which copies a tension pulse lights on output frame d: peg → him over 3 frames ({6,7,8}, {3,4,5}, {1,2}) from each pulse. */
function pulsed(f: number, k: number): boolean {
  const d = frameOf(f);
  for (const t of PULSES) {
    const j = d - t;
    if (j < 0 || j > 2) continue;
    return k > 8 - (8 * (j + 1)) / 3 + 1e-9 && k <= 8 - (8 * j) / 3 + 1e-9;
  }
  return false;
}

/** The cord's near end, the grip in his right つ, at instant f with his steps seen `lag` frames late (the ripple). */
function gripAt(f: number, lag = 0): [number, number] {
  const h = heroPose(f);
  const tsu = ((HERO_ADVANCE['ω'] / 2 + HERO_ADVANCE['•']) * h.fx + (HERO_ADVANCE[')'] + TSU_ADVANCE / 2 + GRIP.x) * h.sx) * EM;
  return [heroX(f, lag) + tsu, h.omega[1] + GRIP.y * EM * h.sy];
}

/** The band's cord at instant f (layout px, w its width): from the grip in his fist to the peg, from break 6.3 on. */
export function bandCord(f: number): { x0: number; y0: number; x1: number; y1: number; w: number } | null {
  if (seamV2(f)) return bandCordV2(f);
  if (frameOf(f) < BR.SLINGSHOT[0]) return null;
  const [x0, y0] = gripAt(f);
  const len = Math.hypot(PEG.x - x0, PEG.y - y0);
  return { x0, y0, x1: PEG.x, y1: PEG.y, w: CORD.w0 - (CORD.w0 - CORD.w1) * clamp(len / CORD.len) };
}

/**
 * The nine copies, nearest first. Until break 6.3 the extrude stack: face cores at (−step·k, +step·k) behind him, the 9th in ink. On 6.3's
 * own frame every face drops whole (no fade, no smear), the ink copy goes and each ")" snaps to a LINK; the links fly (cubic-out,
 * half a frame later per link, already off on the hit frame) into their places on the band: evenly along the cord from his grip to
 * the peg, k − ½ eighths of the way, with a sag while slack, re-spreading a frame late per link on each step back (a ripple running to the peg). The links squash
 * with his body (a stretched band thins).
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function bandAt(at: number): Copy[] {
  if (seamV2(at)) return bandAtV2(at);
  const f = BR.asBuiltHeld(at);
  const h = heroPose(f);
  const n = chaseOf(f);
  const step = stackStep(f);
  const sling = BR.SLINGSHOT[0];
  const folded = frameOf(f) >= sling;
  const bo = BRACKET_O * EM;
  const out: Copy[] = [];
  for (let k = 1; k <= 9; k++) {
    const stack: [number, number] = [h.omega[0] - step * k, h.omega[1] + step * k];
    if (k === 9) {
      out.push({ k, x: stack[0], y: stack[1], bx: stack[0] + bo, by: stack[1], core: folded ? 0 : 1, color: 'ink', scale: folded ? 0 : 1, sx: 1, sy: 1, outline: 3, white: false, rot: 0 });
      continue;
    }
    const color = COPY_COLORS[(((k - 1 - n) % 4) + 4) % 4];
    if (!folded) {
      out.push({ k, x: stack[0], y: stack[1], bx: stack[0] + bo, by: stack[1], core: 1, color, scale: 1, sx: 1, sy: 1, outline: 3, white: false, rot: 0 });
      continue;
    }
    // Its place on the band: k − ½ eighths of the way from the grip (his steps seen a frame later per link) to the peg.
    const [gx, gy] = gripAt(f, (k - 1) * STAGGER);
    const len = Math.hypot(PEG.x - gx, PEG.y - gy);
    const t = (k - 0.5) / 8;
    const sag = SAG * (1 - clamp(len / CORD.len)) * Math.sin(Math.PI * t);
    const band: [number, number] = [lerp(gx, PEG.x, t), lerp(gy, PEG.y, t) + sag];
    // The flight: off at full speed on the hit frame (a frame in there, so it is already moving), half a frame later per link.
    const u = ease.outCubic(clamp((f - sling + 1 - (k - 1) * FLIGHT.stagger) / FLIGHT.frames));
    const v = u;
    out.push({
      k,
      x: stack[0],
      y: stack[1],
      bx: lerp(stack[0] + bo, band[0], u),
      by: lerp(stack[1], band[1], u),
      core: 0,
      color,
      scale: LINK,
      sx: lerp(1, h.sx, v),
      sy: lerp(1, h.sy, v),
      outline: 5,
      white: pulsed(f, k),
      rot: v * (Math.atan2(PEG.y - gy, PEG.x - gx) * 180) / Math.PI,
    });
  }
  return out;
}

/** The anchor peg: pops (0.6 → 1.05 → 1) on break 6.3's own frame and stays. `r` its radius. */
export function pegAt(f: number): { x: number; y: number; scale: number; r: number } | null {
  if (seamV2(f)) return null;
  return frameOf(f) < BR.SLINGSHOT[0] ? null : { x: PEG.x, y: PEG.y, scale: pop(f - BR.SLINGSHOT[0] + SWAP_LEAD), r: PEG.r };
}

/** A rounded rect of the peg (layout px: centre, size, corner radius). */
export type PegPart = { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; color: 'ink' | 'cream' };
/**
 * The peg, back to front (layout px; drop 2 draws the same): a post seen from the side — never a disc with a dot in it, which reads as
 * a third eye — 2r wide and 5.4r tall about (x, y): its hard shadow (+10, +10), the ink post, a cream ring round it a third of the way
 * down, and a cream highlight down its left side.
 */
export function pegParts(p: { x: number; y: number; scale: number; r?: number }): PegPart[] {
  const r = (p.r ?? PEG.r) * p.scale;
  const s = r / PEG.r;
  const h = 5.4 * r;
  const part = (dx: number, dy: number, w: number, hh: number, rr: number, color: 'ink' | 'cream'): PegPart => ({ kind: 'rect', x: p.x + dx, y: p.y + dy, w, h: hh, r: rr, color });
  return [
    part(10 * s, 10 * s, 2 * r, h, r, 'ink'),
    part(0, 0, 2 * r, h, r, 'ink'),
    // The ring a quarter of the way down, and the highlight well below it (touching, the two read as a letter T).
    part(0, -1.25 * r, 2 * r, 0.55 * r, 0, 'cream'),
    part(-0.45 * r, 1.2 * r, 0.28 * r, 1.9 * r, 0.14 * r, 'cream'),
  ];
}

// ——— The world: blocks and confetti ——————————————————————————————————————————————————————————————————————————————————————————————

/** break 6.3's hit frame is the band's: the world's own reactions (the blocks' shear, the confetti's first drift, the film's light) wait a 32nd. */
export const AFTER_HIT = BR.SLINGSHOT[0] + 3;

export type BlockOut = { color: 'yellow' | 'cream' | 'mint' | 'coral'; x: number; y: number; w: number; h: number; r: number; rot: number };
/**
 * Break bar 5's blocks at their places (the violet one cream on the violet ground), breathing; `shear` = tan of the lean toward him (tops left).
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function blocksAt(at: number): { blocks: BlockOut[]; shear: number } {
  if (seamV2(at)) return { blocks: forkBlocks(at), shear: 0 };
  const f = BR.asBuiltHeld(at);
  const blocks = (['yellow', 'violet', 'coral', 'mint'] as const).map((c, i): BlockOut => {
    const b = BAR25_BLOCKS[c];
    const k = 1 + 0.01 * breathe(f, i + 3);
    return { color: c === 'violet' ? 'cream' : c, x: b.x, y: b.y, w: b.w * k, h: b.h * k, r: b.r * k, rot: b.rot + breathe(f, i) };
  });
  return { blocks, shear: Math.tan((10 * Math.PI) / 180) * launchL(f - AFTER_HIT) };
}

/** The confetti's drift: 30 px left a 32nd after break 6.3 and on each later step (a snap). */
const DRIFTS: readonly number[] = [AFTER_HIT, ...BR.SLINGSHOT.slice(1)];
const confettiDrift = (f: number): number => -30 * sum(DRIFTS.map((at) => snap(f - at)));

// ——— E5: the window (screen px) ——————————————————————————————————————————————————————————————————————————————————————————————————

export type WinGlyph = { ch: string; x: number; y: number; size: number; color: RGB; alpha: number; stretch: number; rot: number; atlas: 'mono' | 'hero'; outline?: number; outlineColor?: RGB };
export type WinRect = { x: number; y: number; w: number; h: number; color: RGB; alpha: number };
/** The window on the screen at an instant: its box (screen px), backing and blocks, glyphs, the text of its rows (for tests and drop 2), LOUDER pressed. */
export type WindowState = { box: { x0: number; y0: number; x1: number; y1: number } | null; rects: WinRect[]; glyphs: WinGlyph[]; lines: string[]; pressed: boolean };

const TEXT = P.termText;
const DIM = 0.55;
const GREEN_HOT = scaleRGB(P.termGreen, 1.4);
const WIN_CENTRE: [number, number] = [WIN.x0 + (WIN.cols * WIN.cell) / 2, rowY(2)];
/** `access granted ヽ(°〇°)ﾉ`: JetBrains Mono Bold 50 px, centred on the old rows 1–3. */
const BIG = { size: 50, cell: 30 } as const;
/** `[WARN] party overload`: Bold 22 px on a 30 px strip, 6 px under the box. */
const WARN = { size: 22, h: 30, gap: 6 } as const;
/** The `[sudo] password for (•ω•): ` prompt is followed by its field. */
const passwordField = (d: number): string => (d === BR.PASSWORD ? WINDOW_TEXTS.plain : WINDOW_TEXTS.stars);

/**
 * E5's window at instant f. Discrete changes (rows, words, the plaintext frame, the gauge) at the output frame; the motion (pop, flip, slam, growth) on the instant.
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function windowAt(frame: number): WindowState {
  if (seamV2(frame)) return windowAtV2(frame);
  const f = BR.asBuiltHeld(frame);
  const d = frameOf(f);
  if (d < BR.DIALOG) return { box: null, rects: [], glyphs: [], lines: [], pressed: false };
  const scale = pop(f - BR.DIALOG + SWAP_LEAD);
  const grow = d >= BR.OVERLOAD ? launchL(f - BR.OVERLOAD) : 0;
  const y1 = WIN.y0 + 5 * WIN.row + WIN.row * grow;
  const pressed = d >= BR.LOUDER && d < BR.LOUDER + 6;
  // The flip of rows 1–3 (scale-y 1 → 0 → 1 about the window's middle row, swapping on break 6.2& + 3).
  const u = clamp((f - BR.ROOT) / 6);
  const flipY = f >= BR.ROOT && f < BR.ROOT + 6 ? Math.abs(1 - 2 * ease.inOutCubic(u)) : 1;

  const rects: WinRect[] = [];
  const glyphs: WinGlyph[] = [];
  const lines: string[] = [];
  /** Places a row of text from column `col` on row y; `fy` squeezes it vertically about the window's middle row. */
  const row = (text: string, col: number, y: number, color: RGB, alpha = 1, fy = 1, sink = 0): void => {
    for (const c of layoutLines([text])) {
      if (c.ch.trim() === '') continue;
      glyphs.push({ ch: c.ch, x: colX(col + c.col, c.width) + sink, y: WIN_CENTRE[1] + (y + sink - WIN_CENTRE[1]) * fy, size: WIN.size * fy, color, alpha, stretch: 1 / Math.max(fy, 1e-3), rot: 0, atlas: 'mono' });
    }
  };
  const block = (col: number, cols: number, y: number, color: RGB, fy = 1): void => {
    rects.push({ x: colX(col, cols), y: WIN_CENTRE[1] + (y - WIN_CENTRE[1]) * fy, w: cols * WIN.cell, h: (WIN.row - 6) * fy, color, alpha: 1 });
  };

  // The backing (opaque: in linear light the sheet's 94 % let 6 % of the cream block and the confetti through, which reads as them
  // lying on top of the window), the frame (dim), the title (green).
  rects.push({ x: WIN_CENTRE[0], y: (WIN.y0 + y1) / 2, w: WIN.cols * WIN.cell, h: y1 - WIN.y0, color: P.termBg, alpha: 1 });
  const title = WINDOW_TEXTS.title;
  row(`╔═${' '.repeat(lineWidth(title))}${'═'.repeat(WIN.cols - 3 - lineWidth(title))}╗`, 0, rowY(0), TEXT, DIM);
  row(title, 2, rowY(0), P.termGreen);
  const bottomY = rowY(4) + WIN.row * grow;
  for (let r = 1; r <= 4; r++) {
    const y = r === 4 ? rowY(4) : rowY(r);
    if (r === 4 && grow <= 0) continue;
    row('║', 0, y, TEXT, DIM * (r === 4 ? clamp(grow * 2) : 1), r <= 3 ? flipY : 1);
    row('║', WIN.cols - 1, y, TEXT, DIM * (r === 4 ? clamp(grow * 2) : 1), r <= 3 ? flipY : 1);
  }
  row(`╚${'═'.repeat(WIN.cols - 2)}╝`, 0, bottomY, TEXT, DIM);

  if (d < BR.ROOT + 3) {
    // The dialog: (；・∀・) party too loud, [ OK ] (the default, inverse video) and [ LOUDER ].
    const rest = WINDOW_TEXTS.dialog.slice(DIALOG_FACE.length);
    row(DIALOG_FACE, 2, rowY(1), P.termAmber, 1, flipY);
    row(rest, 2 + lineWidth(DIALOG_FACE), rowY(1), TEXT, 1, flipY);
    block(12, 6, rowY(3), TEXT, flipY);
    row(WINDOW_TEXTS.ok, 12, rowY(3), P.termBg, 1, flipY);
    const sink = pressed && d < BR.LOUDER + 2 ? 3 : 0;
    if (pressed) block(30, 10, rowY(3) + sink, P.termPink, flipY);
    row(WINDOW_TEXTS.louder, 30, rowY(3), pressed ? P.termBg : P.termPink, 1, flipY, sink);
    lines.push(WINDOW_TEXTS.dialog, '', `${WINDOW_TEXTS.ok}  ${WINDOW_TEXTS.louder}`);
  } else if (d < BR.GRANTED) {
    // LOUDER requires root; sudo make it louder, a word per 16th; the password (one frame of plaintext).
    row(WINDOW_TEXTS.root, 2, rowY(1), P.termPink, 1, flipY);
    const [prompt, ...words] = WINDOW_TEXTS.sudo;
    const typed = BR.SUDO.filter((at) => at <= d).length;
    const sudo = typed > 0 ? [prompt, ...words.slice(0, typed)].join(' ') : '';
    if (sudo) row(sudo, 2, rowY(2), TEXT, 1, flipY);
    const pw = d >= BR.PASSWORD ? WINDOW_TEXTS.password + passwordField(d) : '';
    if (pw) row(pw, 2, rowY(3), TEXT, 1, flipY);
    // The cursor follows the last line typed, 6 frames on, 6 off.
    const on = typed > 0 && (d - BR.SUDO[0]) % 12 < 6;
    if (on) row(CURSOR, pw ? 2 + lineWidth(pw) : 2 + lineWidth(sudo), rowY(pw ? 3 : 2), TEXT);
    lines.push(WINDOW_TEXTS.root, sudo, pw);
  } else {
    // access granted ヽ(°〇°)ﾉ slams in across rows 1–3 (an impact: squashed wide on its frame, ringing back), green, blooming.
    const text = WINDOW_TEXTS.granted;
    const [along, across] = impactSquash(f - BR.GRANTED + SWAP_LEAD);
    const x0 = WIN_CENTRE[0] - (lineWidth(text) * BIG.cell * along) / 2;
    for (const c of layoutLines([text])) {
      if (c.ch.trim() === '') continue;
      glyphs.push({ ch: c.ch, x: x0 + (c.col + c.width / 2) * BIG.cell * along, y: WIN_CENTRE[1], size: BIG.size * across, color: GREEN_HOT, alpha: 1, stretch: along / across, rot: 0, atlas: 'mono' });
    }
    lines.push(text);
  }
  if (d >= BR.OVERLOAD) {
    // The volume gauge runs away (+3 % on each creep of the held breath) and the overload warning blinks under the box.
    const v = 113 + 3 * BR.CREEP.filter((at) => at <= d).length;
    const vol = `${GAUGES.volume} ${meter(v)} ${v}%`;
    row(vol, 2, rowY(4), P.termPink, clamp(grow * 2));
    lines.push(vol);
    // [WARN] party overload: JetBrains Mono Bold 22 px on a strip of the window's own dark right under the box (amber on the violet
    // ground could not be read), blinking 3 on / 3 off with its strip (never a bare dark bar).
    const warn = WINDOW_TEXTS.overload;
    const cell = (WIN.cell * WARN.size) / WIN.size;
    const wy = y1 + WARN.gap + WARN.h / 2;
    const ww = (lineWidth(warn) + 2) * cell;
    if (Math.floor((d - BR.OVERLOAD) / 3) % 2 === 0) {
      rects.push({ x: WIN.x0 + ww / 2, y: wy, w: ww, h: WARN.h, color: P.termBg, alpha: 1 });
      for (const c of layoutLines([warn])) {
        if (c.ch.trim() === '') continue;
        glyphs.push({ ch: c.ch, x: WIN.x0 + (1 + c.col + c.width / 2) * cell, y: wy, size: WARN.size, color: P.termAmber, alpha: 1, stretch: 1, rot: 0, atlas: 'mono' });
      }
      lines.push(warn);
    }
  }
  // The ✧ pops where his fist hits [ LOUDER ] (in front of the window), whole on the hit frame itself: 1.35 → 1.0 over 3 f, turning
  // +45°, shrinking away over break 6.2e to 6.2&.
  if (d >= BR.LOUDER && f - BR.LOUDER < 12) {
    const t = Math.max(0, f - BR.LOUDER);
    const s = t < 3 ? 1.35 - 0.35 * ease.inOutSine(t / 3) : t < 6 ? 1 : 1 - ease.inCubic((t - 6) / 6);
    if (s > 0.01) glyphs.push({ ch: SPARKLE, x: LOUDER_BUTTON.x, y: LOUDER_BUTTON.bottom, size: 70 * s, color: P.white, alpha: 1, stretch: 1, rot: 45 * clamp(t / 12), atlas: 'hero', outline: 3 / (70 * s), outlineColor: P.ink });
  }

  // The pop scales the whole window about its centre.
  const c = WIN_CENTRE;
  const at = (x: number, y: number): [number, number] => [c[0] + (x - c[0]) * scale, c[1] + (y - c[1]) * scale];
  for (const r of rects) {
    [r.x, r.y] = at(r.x, r.y);
    r.w *= scale;
    r.h *= scale;
  }
  for (const g of glyphs) {
    [g.x, g.y] = at(g.x, g.y);
    g.size *= scale;
  }
  const [bx0, by0] = at(WIN.x0, WIN.y0);
  const [bx1, by1] = at(WIN.x0 + WIN.cols * WIN.cell, y1);
  return { box: { x0: bx0, y0: by0, x1: bx1, y1: by1 }, rects, glyphs, lines, pressed };
}

// ——— Where his ω is on screen (the film's apex follows it) ———————————————————————————————————————————————————————————————————————

/** A world point (layout px) on screen at instant f: through the shot camera, then the rig's punch about the frame centre. */
const onScreen = (f: number, x: number, y: number): [number, number] => {
  const [sx, sy] = toScreen(launchCam(f), x, y);
  const z = rigAt(f).zoom;
  return [960 + (sx - 960) * z, 540 + (sy - 540) * z];
};

/**
 * His ω on screen at instant f (layout px): its glyph placement point, through the shot camera and the rig's punch.
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function omegaOnScreen(at: number): [number, number] {
  if (seamV2(at)) return omegaOnScreenV2(at);
  const f = BR.asBuiltHeld(at);
  const h = heroPose(f);
  return onScreen(f, h.omega[0], h.omega[1]);
}

/**
 * His ω's ink centre sits this many ems (of his size, squashed with his face) under its placement point: the canvas's 'middle'
 * baseline sits above the ω's ink (measured on the --final stills: the amber fill's box centre is 49.5 px under the placement point on
 * the frame before break 6.3 at 484 px a em, 44 px on the break's last frame at 404).
 */
export const OMEGA_INK = 0.105;
/**
 * His ω's ink centre on screen at instant f (layout px): what the film's black spot and its ring are round about (R2-02).
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function omegaInkOnScreen(at: number): [number, number] {
  if (seamV2(at)) return omegaInkOnScreenV2(at);
  const f = BR.asBuiltHeld(at);
  const h = heroPose(f);
  return onScreen(f, h.omega[0], h.omega[1] + OMEGA_INK * h.em * h.fy);
}

// ——— Everything as flat content ——————————————————————————————————————————————————————————————————————————————————————————————————

/** Atlas keys: the hero's rounded type (him, the copies, the brows, the ✧), the system's mono type (the window). */
export const LAUNCH_ATLAS = {
  hero: [READY, ZOOM, CORE, ...BROWS, SPARKLE],
  mono: ['╔═╗║╚╝', ...Object.values(WINDOW_TEXTS).flat(), GAUGES.volume, '@0123456789%', CURSOR],
} as const;

/**
 * One frame of break bar 6 for the scene. `blocks` are drawn through a shear about the world origin (engine x' = x − shear·y), so each
 * block's centre is pre-moved to keep it in place; `back` (confetti, the band's cord, then the copies / links) and `front` (his shadow,
 * him, his brows, the fist's glint; over them the anchor post) are world content seen through `pose`; `window` is screen content (engine units, frontal pose), drawn at the inverse
 * of the rig because it is printed on the screen.
 */
export type LaunchFrame = { cam: BreakCam; pose: Pose; blocks: { shapes: Shape[]; shear: number }; back: FlatContent; front: FlatContent; window: FlatContent };

const ink = P.ink;
const toE = (x: number, y: number): [number, number] => [x - 960, 540 - y];
/** A placed character as an engine glyph. */
const glyphOf = (c: PlacedChar, color: RGB, outlinePx: number, outlineColor: RGB, ox = 0, oy = 0): Glyph => {
  const [x, y] = toE(c.x + ox, c.y + oy);
  return { ch: c.ch, x, y, size: c.size, stretch: c.stretch, rot: rotOf(c.rot), color, alpha: c.alpha ?? 1, outline: outlinePx / c.size, outlineColor };
};

/** A copy of his face core as placed characters: its ")" at (bx, by); the rest (and his brows, once they have landed on him) folding away with `core`. */
function copyChars(c: Copy, f: number, L: LaunchLayout): PlacedChar[] {
  const size = EM * c.sy * c.scale;
  const rest = around(CORE, L.advance);
  const out: PlacedChar[] = [];
  // The face is all there or not at all (core is 0 or 1: it drops whole on break 6.3's own frame).
  const face = c.core >= 0.5;
  for (const { ch, o } of rest) {
    if (ch === ')') out.push({ ch, x: c.bx, y: c.by, size, stretch: c.sx / c.sy, rot: c.rot, dx: 0, dy: 0 });
    else if (face) out.push({ ch, x: c.x + o * c.sx * c.scale, y: c.y, size, stretch: c.sx / c.sy, rot: 0, dx: 0, dy: 0 });
  }
  if (face) {
    const eyes = rest.filter((x) => x.ch === '•');
    BR.BROWS.forEach((land, i) => {
      if (frameOf(f) >= land) out.push({ ch: BROWS[i], x: c.x + eyes[i].o * c.sx * c.scale, y: c.y - BROW_LIFT * size, size, stretch: c.sx / c.sy, rot: 0, dx: 0, dy: 0 });
    });
  }
  return out;
}

/** A capsule from (x0, y0) to (x1, y1), layout px, `w` thick. */
const seg = (x0: number, y0: number, x1: number, y1: number, w: number, color: RGB): Shape => {
  const [ax, ay] = toE(x0, y0);
  const [bx, by] = toE(x1, y1);
  return { kind: 'segment', x: (ax + bx) / 2, y: (ay + by) / 2, w: Math.hypot(bx - ax, by - ay) + w, h: w, rot: Math.atan2(by - ay, bx - ax), color };
};

/** The four confetti of break bar 5 (a dot, a squiggle, a zigzag, a mini-pill — cream here), drifting left on the steps and turning slowly. */
function confetti(f: number): Shape[] {
  const out: Shape[] = [];
  const shadow: Shape[] = [];
  const dx = confettiDrift(f);
  const turn = 0.5 * (f - BR.MATCH_CUT);
  BAR25_CONFETTI.forEach(([cx, cy], i) => {
    const x = cx + dx;
    const a = (turn * (i % 2 === 0 ? 1 : -1) * Math.PI) / 180;
    const pt = (u: number, v: number): [number, number] => [x + Math.cos(a) * u - Math.sin(a) * v, cy + Math.sin(a) * u + Math.cos(a) * v];
    // CONFETTI_FORM (breakShared.ts): the same form break bars 2–5 draw — a colour line inside an ink border, (6, 6) shadows.
    const F = CONFETTI_FORM;
    const sh = F.shadow;
    const line = (pts: [number, number][], color: RGB) => {
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        shadow.push(seg(x0 + sh, y0 + sh, x1 + sh, y1 + sh, F.stroke + 2 * F.border, ink));
        out.push(seg(x0, y0, x1, y1, F.stroke + 2 * F.border, ink));
      }
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        out.push(seg(x0, y0, x1, y1, F.stroke, color));
      }
    };
    if (i === 0) {
      const [ex, ey] = toE(x, cy);
      shadow.push({ kind: 'ellipse', x: ex + sh, y: ey - sh, w: 2 * F.dot.r, h: 2 * F.dot.r, color: ink });
      out.push({ kind: 'ellipse', x: ex, y: ey, w: 2 * F.dot.r, h: 2 * F.dot.r, color: ink });
    } else if (i === 1) {
      const { half, amp, waves } = F.squiggle;
      line(Array.from({ length: 19 }, (_, j) => [-half + (2 * half * j) / 18, -amp * Math.sin((2 * Math.PI * waves * j) / 18)] as [number, number]), P.mint);
    } else if (i === 2) {
      const { half, amp, segments } = F.zigzag;
      line(Array.from({ length: segments + 1 }, (_, s) => [-half + (2 * half * s) / segments, s % 2 === 0 ? -amp : amp] as [number, number]), P.yellow);
    } else {
      const [ex, ey] = toE(x, cy);
      const rot = rotOf(F.pill.turn) - a;
      shadow.push({ kind: 'rect', x: ex + sh, y: ey - sh, w: F.pill.w, h: F.pill.h, r: F.pill.h / 2, rot, color: ink });
      out.push({ kind: 'rect', x: ex, y: ey, w: F.pill.w, h: F.pill.h, r: F.pill.h / 2, rot, color: P.cream, outline: F.border, outlineColor: ink });
    }
  });
  return [...shadow, ...out];
}

/**
 * Break bar 6 at instant f, ready to draw.
 * Held: from v04's end (BR.BREAK_END) on, v04's last frame (BR.asBuiltHeld) — the frame the skeleton holds in break 8, which drop 2 reads on drop2 1.1 − 1.
 */
export function launchAt(at: number, L: LaunchLayout): LaunchFrame {
  if (seamV2(at)) return launchAtSeam(at, L);
  const f = BR.asBuiltHeld(at);
  const cam = launchCam(f);
  const pose = camPose(cam);

  // The blocks, pre-moved against the shear about the world origin so each keeps its centre.
  const { blocks, shear } = blocksAt(f);
  const shapes: Shape[] = [];
  const sh = (x: number, y: number): [number, number] => {
    const [ex, ey] = toE(x, y);
    return [ex + shear * ey, ey];
  };
  for (const b of blocks) {
    const [sx, sy] = sh(b.x + BLOCK_STYLE.shadow, b.y + BLOCK_STYLE.shadow);
    shapes.push({ kind: 'rect', x: sx, y: sy, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot), color: ink });
  }
  for (const b of blocks) {
    const [bx, by] = sh(b.x, b.y);
    shapes.push({ kind: 'rect', x: bx, y: by, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot), color: P[b.color], outline: BLOCK_STYLE.outline, outlineColor: ink });
  }

  // Behind him: the band's cord (from the grip in his fist to the peg), then the copies / links, deepest first (the ink copy, then 8 … 1).
  const behind = confetti(f);
  const cord = bandCord(f);
  if (cord) behind.push(seg(cord.x0, cord.y0, cord.x1, cord.y1, cord.w, ink));
  const copies: Glyph[] = [];
  for (const c of [...bandAt(f)].reverse()) {
    if (c.scale <= 0.02) continue;
    const fill = P[c.color];
    const line = c.white ? P.white : ink;
    for (const ch of copyChars(c, f, L)) copies.push(glyphOf(ch, fill, c.outline, line));
  }

  // In front: his hard shadow, him, his brows, the glint on his fist; over him the peg (the band's pin: nothing of his covers it).
  const me = [...heroChars(f, L), ...brows(f, L)];
  const [shx, shy] = HERO_STYLE.shadow;
  const hero: Glyph[] = [
    ...me.map((c) => glyphOf(c, ink, HERO_STYLE.outline, ink, shx, shy)),
    ...me.map((c) => glyphOf(c, P[HERO_STYLE.fill], HERO_STYLE.outline, ink)),
  ];
  const s = fistGlint(f);
  if (s > 0 && heroText(f) === ZOOM) {
    const hand = heroChars(f, L).at(-1)!;
    const g = f - BR.FIST_GLINT;
    const [x, y] = toE(hand.x + 0.28 * EM * heroPose(f).sx, hand.y - 0.32 * EM);
    hero.push({ ch: SPARKLE, x, y, size: 120 * s, color: scaleRGB(P.white, 1.6), rot: rotOf(30 * g), outline: 3 / (120 * s), outlineColor: ink });
  }
  const over: Shape[] = [];
  const peg = pegAt(f);
  if (peg && peg.scale > 0.01) {
    for (const d of pegParts(peg)) {
      const [px, py] = toE(d.x, d.y);
      over.push({ kind: 'rect', x: px, y: py, w: d.w, h: d.h, r: d.r, color: d.color === 'ink' ? ink : P.cream });
    }
  }

  // The window, in screen engine units.
  const w = windowAt(f);
  const win: FlatContent = {
    under: w.rects.map((r) => {
      const [x, y] = toE(r.x, r.y);
      return { kind: 'rect', x, y, w: r.w, h: r.h, color: r.color, alpha: r.alpha };
    }),
    glyphs: {
      mono: w.glyphs.filter((x) => x.atlas === 'mono').map((x) => winGlyph(x)),
      hero: w.glyphs.filter((x) => x.atlas === 'hero').map((x) => winGlyph(x)),
    },
    over: [],
  };

  return {
    cam,
    pose,
    blocks: { shapes, shear },
    back: { under: behind, glyphs: { hero: copies }, over: [] },
    front: { under: [], glyphs: { hero }, over },
    window: win,
  };
}

const GLINT_FRAMES = 4.5;
/** The ✧ glint on his right fist (scale, 0 when off): 0 → 1.2 → 0 over break 6.4a to 6.4a + 4.5, so the break's last frame hands drop 2 a clean fist (§7.3). */
export function fistGlint(f: number): number {
  const g = f - BR.FIST_GLINT;
  return g > 0 && g < GLINT_FRAMES ? 1.2 * Math.sin((Math.PI * g) / GLINT_FRAMES) : 0;
}

const winGlyph = (x: WinGlyph): Glyph => {
  const [ex, ey] = toE(x.x, x.y);
  return { ch: x.ch, x: ex, y: ey, size: x.size, color: x.color, alpha: x.alpha, stretch: x.stretch, rot: rotOf(x.rot), ...(x.outline ? { outline: x.outline, outlineColor: x.outlineColor } : {}) };
};

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const within = (f: number, a: number, b: number): boolean => f >= a && f <= b;
/**
 * Break bar 6's shutter (R2-01): 0.35 of a frame, not the default 0.5 — the camera pulls back all bar long and the slingshot's steps fly
 * 70–90 px, and at 0.5 the whole world's 8 px ink outlines smeared under the film. Swaps stay whole on their frames (struck() leads by
 * a quarter frame, more than half this shutter).
 */
export const LAUNCH_SHUTTER = 0.35;
/** 32 sub-frames on the uppercut and on the slingshot's steps with the film's bulge; 16 elsewhere (the held breath's tremble is taken at the output frame). */
export function launchTemporal(f: number): Temporal {
  const fast = within(f, BR.LOUDER - 6, BR.ROOT) || within(f, BR.SLINGSHOT[0], BR.TENSION.at(-1)!);
  return { samples: fast ? 32 : 16, shutter: LAUNCH_SHUTTER, persistence: 0 };
}

/** From the match cut to drop 2: no sub-frame crosses break 6.1. */
export const launchSegment = (): Segment => ({ from: BR.MATCH_CUT, to: BR.BREAK_END });

/** The break's flat look (only HDR highlights bloom: the granted line, the glints). */
export const launchLook = (): Look => BREAK_LOOK;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — THE INTERLUDE's break 7 SLING and break 8 FAKE DROP, drawn natively (build sheet notes/bid2/break-sheet2.md §3 bars 7–8,
// §5 C7–C9, §6, §7.2–§7.3, §8.2; the design notes/extend/interlude-final.md §3.7–§3.8, §4.2–§4.3, and its widget's bar33 / bar34).
// Everything above is v04's bar 6, kept exactly as approved: with LAUNCH_V2 false the dispatcher (src/scenes/break.ts) draws it one bar
// later through the skeleton's stub, pixel for pixel (the KEEP-FIRST proof). The v2 code reuses its pieces one bar later where the design
// carries them over — the stack's breaths and colour chase (stackStep, chaseOf), the brows' drop (BROW_*), the uppercut and its solve
// (uppercut, FIST_TOP, LOUDER_BUTTON, re-solved with this camera), the window's rows (WIN, layoutLines), the links' flight (FLIGHT), the
// tension pulses, the confetti's form — and adds the rest:
//   break 7 SLING (whip tail 6.4a → 8.1): the whip lands on the kick; the four cars ram his back and concertina into the extrude stack;
//     one notch per kick (7.2, 7.3, 7.4, 7.4&) — he steps back into depth (em 360 → 236) while the camera pulls back (Z 1.55 → 0.62)
//     until the braced Y fork (built from the world's blocks), the V of two cords and the eight bracket links read whole; the red cursor
//     goes for [ OK ], is bonked by the uppercut, hovers, turns ⊘ on `access granted` and drops; `[ROOT] uid=0 (•ω•)`.
//   break 8 FAKE DROP (8.1 → drop 2): the reverse angle (the shot from the target: the fork faces us); he creeps back into the depth while
//     the film forms and sucks toward him; the held breath; the release on 8.3 — he flies at us, the band snaps into one straight line at
//     y 540 and is plucked; the film flips into a dome and catches him, face squashed and paws flat on it; the gloat; dead silence; the
//     look ( ・ω・)?; he gets it — brows down, and his ω eats a black spot into the film (breakFilm.ts filmAtV2), which drop 2 pops.
// Review round 1 (the sling fixer, logged here and in the report):
//   F2  C7's after side is pure whip: the ground whip-streaked (GROUND_STREAKS) and the cords twanging under the 64 sub-frames, him
//       sharp (one instant per frame, whipPose); the cars whip in under him, line up sharp on 7.1 − 1 and pile up on the kick, where the
//       stack bursts out of him (the concertina a frame in) and the streaks snap back (trailAt). Resumed round 1: on the cut frame the
//       ground streaks come in at half strength (STREAK_CUT_ALPHA: the cut's Δ 43.1 → 38.6, under the whip's start on 6.4a (+570), 42.4)
//       and the lane starts at x 860 (gap 290), so all four cars are in frame on 7.1 − 1 (the cream one was cut by the edge).
//   F4 / SYNC-3  break 8's hits are draw-back notches (HITS8): pulses, the prongs' flex, the links' clack, the camera's 2 % steps (the
//       aim now an L done by 8.1&), the creep's squash; on the film the suction's rim, the marbling's jump, half its speed (breakFilm.ts).
//   F7 / GLOAT-ROW-CLIP  the window's grown rows pop with their box (a 2-frame snap) and show only inside it.
// Review round 2 (the sling fixer):
//   CONCERTINA-SCALE  bar 7's signature move reads: the cars are the widget's train — riders half his size at his eye line, rushing in
//       from frame-right behind his )ง — and ram his back one a frame on the four crunch thumps (CAR_RAMS: 7.1 − 2 … 7.1 + 1, the third
//       with the burst), each sharp and squashed 0.62 on its frame; from the next its rider is a stack layer of its own colour (snapIn),
//       so the stack builds yellow, mint, coral, cream (packed tight, PACK_STEP, until the concertina bursts on the catch). Was: a row of
//       toy cars (em 110 px) at the bottom edge, piled up for one frame on 7.1, gone as the stack burst out at full size.
// Positions are layout px of the shot's own world (1920 × 1080 frame, y down), seen through launchCamV2; the window and the cursor are
// screen px.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The switch (sheet §4.1, §4.3): true draws break 7–8 natively from these v2 functions, and the break's state read on drop 2's downbeat
 * − 1 (launchAt, heroChars, bandAt, bandCord, blocksAt, windowAt, launchCam, omegaOnScreen …, and breakFilm.ts filmAt / filmText) is the
 * v2 last frame (sheet §7.3). false: the skeleton's stub draws v04's bar 6 one bar later and the seam reads v04's last frame (the
 * identity proof: a bundle with __KX_LAUNCH_V04__ = true, render, byte-compare). Defined in src/score/break.ts with the other two, so the
 * rig (BREAK_ACCENTS: the carried punches when off) follows it.
 */
export const LAUNCH_V2: boolean = BR.LAUNCH_V2;

const BAR = 96;
const ONE = BR.SLING.from; // break 7.1, the catch
const EIGHT = BR.REVERSE; // break 8.1, C8
const LAST_V2 = BR.BREAK_END_V2 - 1;

/** His parts, as drop 2's master names them (drop2Slash HeroPart), so it can map his last-frame characters without counting them. */
export type HeroPartV2 = 'open' | 'eyeL' | 'mouth' | 'eyeR' | 'close' | 'arm' | 'speed' | 'tsu' | 'paw' | 'mark' | 'brow';
/** A placed character with its part (v2). */
export type PartChar = PlacedChar & { part: HeroPartV2 };

const FRONTAL = HERO_FACES_V2.frontal; // (ง•ω•)ง
const FLYING = HERO_FACES_V2.flying; // (っ≧ω≦)っ
const SQUASHED = HERO_FACES_V2.squashed; // (≧ω≦)
/** The look, his ( ・ω・)? without its ? (which pops on its own, a 32nd later): laid out in (•ω•)'s glyph slots. Taken from the cast so
 *  the hero's look stays one face in the film (castCosmos exempts the hero's look; a bare literal of it would read as the cosmos's web face). */
const LOOKING = HERO_FACES_V2.look.replace(/\?$/u, ''); // ( ・ω・)
const GETS_IT_FACE = HERO_FACES_V2.getsIt; // (•ω•)
/** The parts of each face, character by character (spaces skipped). */
const PARTS: Readonly<Record<string, readonly HeroPartV2[]>> = {
  [READY]: ['open', 'arm', 'eyeL', 'mouth', 'eyeR', 'close', 'arm', 'mark'],
  [ZOOM]: ['speed', 'speed', 'speed', 'speed', 'speed', 'speed', 'open', 'tsu', 'eyeL', 'mouth', 'eyeR', 'close', 'tsu'],
  [FRONTAL]: ['open', 'arm', 'eyeL', 'mouth', 'eyeR', 'close', 'arm'],
  [FLYING]: ['open', 'arm', 'eyeL', 'mouth', 'eyeR', 'close', 'arm'],
  [SQUASHED]: ['open', 'eyeL', 'mouth', 'eyeR', 'close'],
  [CORE]: ['open', 'eyeL', 'mouth', 'eyeR', 'close'],
};

/** Each character's centre offset from the ω's (px), every advance at `em`, squashed by its own part (face fx, body sx). */
function aroundEm(text: string, advance: Advance, em: number, sx = 1, fx = 1): { ch: string; o: number }[] {
  const chars = [...text];
  const iw = chars.indexOf('ω');
  let x = 0;
  const centres = chars.map((ch) => {
    const a = advance(ch) * em * (FACE.has(ch) ? fx : sx);
    const c = x + a / 2;
    x += a;
    return c;
  });
  return chars.map((ch, j) => ({ ch, o: centres[j] - centres[iw] }));
}

// ——— Break 7: the notches ———————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The sling's keys (design §3.7, `notches.mjs`): on the catch and on each notch's kick — the camera (Z, centre), his ω in the world and his
 * em (each step back is a step into depth). His ω on screen: (900, 560) → (860, 600) → (810, 640) → (760, 640) → (720, 640).
 */
export const SLING_KEYS: readonly { at: number; zoom: number; cx: number; cy: number; wx: number; wy: number; em: number }[] = [
  { at: BR.CATCH, zoom: 1.55, cx: 1000 + 60 / 1.55, cy: 560 - 20 / 1.55, wx: 1000, wy: 560, em: 360 },
  { at: BR.NOTCHES[0], zoom: 1.2, cx: 880 + 100 / 1.2, cy: 590 - 60 / 1.2, wx: 880, wy: 590, em: 324 },
  { at: BR.NOTCHES[1], zoom: 0.95, cx: 770 + 150 / 0.95, cy: 620 - 100 / 0.95, wx: 770, wy: 620, em: 292 },
  { at: BR.NOTCHES[2], zoom: 0.76, cx: 670 + 200 / 0.76, cy: 645 - 100 / 0.76, wx: 670, wy: 645, em: 262 },
  { at: BR.NOTCHES[3], zoom: 0.62, cx: 580 + 240 / 0.62, cy: 665 - 100 / 0.62, wx: 580, wy: 665, em: 236 },
];
/** A notch's launch at instant f: an L off at full speed on its kick's frame (taken at the output frame, a frame in), none before. */
const notchL = (f: number, at: number): number => (frameOf(f) < at ? 0 : launchL(f - at + 1));
/** The whip's tail (6.4a → 7.1, behind the hidden cut): the camera still whipping left with him at 120 px a frame on screen. */
const WHIP_PX = 120;
/**
 * The whip's tail pushes in: the camera's zoom on 6.4a, crashing in (log-linear, a cubic landing) to the catch's 1.55 on 7.1's kick.
 * Not lower: below ≈ 1.3 the fork (off-frame right until the notches reveal it, sheet §7.2) would enter the frame.
 */
export const WHIP_IN_ZOOM = 1.3;
/**
 * His ω on screen over the whip's tail: from (1000, 580) on 6.4a — exactly where the graph side's whip holds it (breakGraph.ts graphCam:
 * the eye trace across C7 is 0 px) — to the catch's (900, 560), at a constant speed (he still flies when the band catches him).
 */
const WHIP_SLIDE = { from: [1000, 580], to: [900, 560] } as const;
/** The whip's tail is exposed like the graph side's whip (shutter 0.5 on 64 sub-frames), so the blur carries across C7; 0.35 from the catch. */
export const WHIP_SHUTTER = 0.5;
/**
 * The whip's streaks: the air rushing past on C7's after side, where the violet above and below him is empty (the graph side streaks its
 * grid) — cream dashes with 6 px ink edges, placed on screen (y, the x of their tail end at 6.4a, length, width), rushing right at
 * TRAIL_SPEED px a frame, behind him. On the catch they shorten to nothing over 4 frames (cubic out): the stop is the kick's.
 */
export const TRAIL: readonly { y: number; x: number; len: number; w: number }[] = [
  { y: 96, x: -300, len: 820, w: 8 },
  { y: 188, x: 520, len: 560, w: 12 },
  { y: 262, x: -760, len: 980, w: 6 },
  { y: 836, x: 300, len: 700, w: 10 },
  { y: 918, x: -520, len: 1040, w: 7 },
  { y: 1006, x: 760, len: 520, w: 12 },
];
export const TRAIL_SPEED = 260;
/** Frames the streaks take to retract on the catch (taken at the output frame: 30 % left on the kick's own frame, gone by its third). */
const TRAIL_GONE = 3;
/**
 * The speed lines' (and the ground's streaks') length share at instant f: whole through the whip's tail; on the catch they snap back
 * (cubic out, a frame in on the kick's own frame, at the output frame: the stop is the kick's — review round 1 F2).
 */
export const trailAt = (f: number): number => {
  if (f < BR.WHIP_CUT) return 0;
  const d = frameOf(f);
  return d < BR.CATCH ? 1 : 1 - ease.outCubic(clamp((d - BR.CATCH + 1) / TRAIL_GONE));
};
/**
 * The ground whip-streaked (review round 1 F2): on C7's after side the flat violet ground shows the whip as streaks of its own tints and
 * of the editor's torn chrome (cream, mint, yellow) and a few ink speed lines, screen-placed and rushing right with the world (he and the
 * camera whip left) at GROUND_SPEED px a frame; each drawn soft (three widths, fainter outward), so its shutter's half on the cut frame
 * (the segment holds it on 6.4a's own instant) still reads as a smear. They retract with the speed lines on the catch.
 */
export type GroundStreak = { y: number; x: number; len: number; w: number; tone: 'light' | 'dark' | 'cream' | 'mint' | 'yellow' | 'ink'; a: number };
export const GROUND_SPEED = 150;
const STREAK_COUNT = 60;
export const GROUND_STREAKS: readonly GroundStreak[] = Array.from({ length: STREAK_COUNT }, (_, i): GroundStreak => {
  const h = (k: number): number => hash(i, k, 733);
  const p = h(4);
  const tone: GroundStreak['tone'] = p < 0.36 ? 'light' : p < 0.66 ? 'dark' : p < 0.8 ? 'cream' : p < 0.88 ? 'mint' : p < 0.95 ? 'yellow' : 'ink';
  return {
    y: -20 + ((i + 0.5 + 0.8 * (h(0) - 0.5)) * 1120) / STREAK_COUNT,
    x: -1700 + 3600 * h(3),
    len: 420 + 1300 * h(1) ** 0.7,
    w: tone === 'ink' ? 3 + 3 * h(2) : 8 + 30 * h(2) ** 1.5,
    tone,
    a: tone === 'ink' ? 0.45 : 0.6 + 0.35 * h(5),
  };
});
const STREAK_TONES: Readonly<Record<GroundStreak['tone'], RGB>> = { light: linear('#D6C8FE'), dark: linear('#7552E8'), cream: P.cream, mint: P.mint, yellow: P.yellow, ink: P.ink };
/** The catch: he carries on 40 px on screen (L-out over 3 f) and the band pulls him back (L) — the band's first visible stretch. */
const CARRY_PX = 40;
const carry = (f: number): number => {
  const e = f - BR.CATCH;
  if (e <= 0) return 0;
  return e < 3 ? ease.outCubic(e / 3) : 1 - launchL(e - 3);
};
/**
 * Between the kicks a held camera still lives: each notch is WOUND UP (v07 WP5, continuity plan §7, FW5 / FW6 inside break 7). v06's held
 * camera only drifted 8 px and crept 0.8 % in a sine bump (0 on both kicks, still at its peak, and pulling against the next notch's
 * pull-back): 3322–3335 was 14 frames of dead picture under the sling's music. Now from WIND_LEAD frames after a kick to the next kick he
 * and the camera creep WIND_UP of the next step (the band drawing tighter: moving from the start, faster toward the kick), and the kick's
 * L carries the rest — the hit still the biggest step. Not before the last notch (its hold, 12 frames, is the previous kick's settle).
 */
export const WIND_UP = 0.3;
const WIND_LEAD = 3;
const windSpan = (i: number): readonly [number, number] => [(i === 1 ? BR.CATCH : SLING_KEYS[i - 1].at) + WIND_LEAD, SLING_KEYS[i].at];
/** The share of notch i's step (SLING_KEYS[i]) the wind-up creeps: 0 where its hold is too short to wind up in. */
export const windUpShare = (i: number): number => {
  const [a, b] = windSpan(i);
  return b - a >= 12 ? WIND_UP : 0;
};
/** How much of notch i's step the wind-up has crept by instant f: 0 → windUpShare(i) (0.7 linear + 0.3 t²), whole on the kick. */
export function windUp(f: number, i: number): number {
  const k = windUpShare(i);
  if (k === 0) return 0;
  const [a, b] = windSpan(i);
  const t = clamp((f - a) / (b - a));
  return k * (0.7 * t + 0.3 * t * t);
}

/** The state of break 7 at instant f: the camera (zoom, centre) and his ω (world) and em. */
export type SlingState = { zoom: number; cx: number; cy: number; wx: number; wy: number; em: number };
export function slingState(f: number): SlingState {
  const K = SLING_KEYS;
  if (f < BR.CATCH) {
    // The whip's tail (C7's after side): he flies left through the world (WHIP_PX a frame on screen at the catch's zoom), the camera
    // whipping with him but lagging, his ω sliding from (1000, 580) to the catch's (900, 560) on screen at a constant speed — and the
    // camera pushing in from WHIP_IN_ZOOM to the catch's zoom, landing on 7.1's kick.
    const k = K[0];
    const u = clamp((f - BR.WHIP_CUT) / (BR.CATCH - BR.WHIP_CUT));
    const sx = lerp(WHIP_SLIDE.from[0], WHIP_SLIDE.to[0], u);
    const sy = lerp(WHIP_SLIDE.from[1], WHIP_SLIDE.to[1], u);
    // v07 WP5: an ease-out quad (was a cubic): it leaves the cut at the graph side's landing speed (breakGraph.ts whipZoom), no stop at C7.
    const zoom = Math.exp(lerp(Math.log(WHIP_IN_ZOOM), Math.log(k.zoom), 1 - (1 - u) ** 2));
    const wx = k.wx + (WHIP_PX / k.zoom) * (BR.CATCH - f);
    const wy = k.wy;
    return { zoom, cx: wx - (sx - 960) / zoom, cy: wy - (sy - 540) / zoom, wx, wy, em: k.em };
  }
  const s = { zoom: K[0].zoom, cx: K[0].cx, cy: K[0].cy, wx: K[0].wx, wy: K[0].wy, em: K[0].em };
  for (let i = 1; i < K.length; i++) {
    // v07 WP5: the wind-up creeps WIND_UP of the step before the kick; the kick's L carries the rest (exactly v06's from the kick's settle).
    const a = windUp(f, i);
    const l = (1 - windUpShare(i)) * notchL(f, K[i].at) + a;
    if (l === 0) continue;
    s.zoom += (K[i].zoom - K[i - 1].zoom) * l;
    s.cx += (K[i].cx - K[i - 1].cx) * l;
    s.cy += (K[i].cy - K[i - 1].cy) * l;
    s.wx += (K[i].wx - K[i - 1].wx) * l;
    s.wy += (K[i].wy - K[i - 1].wy) * l;
    s.em += (K[i].em - K[i - 1].em) * l;
  }
  s.wx -= (CARRY_PX / K[0].zoom) * carry(f);
  return s;
}
/** Break 7's shot camera (the rig's punches are the pipeline's). */
export const slingCam = (f: number): BreakCam => {
  const s = slingState(f);
  return { zoom: s.zoom, cx: s.cx, cy: s.cy, roll: 0, dy: 0 };
};

// ——— Break 8: the reverse angle's camera ——————————————————————————————————————————————————————————————————————————————————————————

/**
 * Break 8's K + C hits (8.1, 8.1&, 8.2, 8.2e — accelerating: 8th, 8th, 16th): each one a draw-back notch on its own frame (review round
 * 1 F4, SYNC-3) — a white tension pulse down each arm, the prongs flexing in 2° and springing back; after the cut also the links
 * clacking a step out along the arms, the camera stepping in, his creep landing as an impact squash, and on the film the suction
 * stepping deeper, its marbling jumping and its rim tightening (breakFilm.ts HITS_8).
 */
export const HITS8: readonly number[] = BR.KICKS_V2.filter((k) => k >= BR.REVERSE && k < BR.HELD_V2);
/** The camera's step in on each hit after the cut: 1.00 → 1.02 → 1.04 → 1.06 (an L each, two frames in on its frame: its biggest step is the hit's), then the held breath's push to 1.10. */
export const AIM_NOTCH = 0.02;
/**
 * A hit's launch at instant f: an L two frames in on the hit's own frame (taken at the output frame; none before it) — 0.47 of the step
 * on the hit frame, the rest a smaller step a frame after, so the hit frame carries the move (review round 1 SYNC-3: a frame-in L's
 * second step, 0.31 against 0.17, put every bar-8 hit's peak one frame late).
 */
const hitL = (f: number, at: number): number => (frameOf(f) < at ? 0 : launchL(f - at + 2));
const AIM_PUSH = 0.04;
/**
 * Break 8's shot camera (sheet §6.1, re-timed in review round 1 F4 / SYNC-3): on the cut the reverse angle's framing (v06: C (1140, 448)
 * at Z 1; v07: anchor-locked on him by open8, below); it settles into the aim with an L off the cut (done by 8.1&, so 8.1& + 3 → 8.2 is a living hold with the film shimmering), steps in 2 % on
 * each later hit (an L a frame in on its frame), pushes in faster and faster through the held breath to 1.10, flinches on the release,
 * creeps in the silence.
 */
export function fakeCam(f: number): BreakCam {
  const u = launchL(f - BR.REVERSE);
  let cx = lerp(1140, 960, u);
  let cy = lerp(448, 540, u);
  // v07 WP5: the opening matched to break 7's last frame (open8), settling with a frame-in L (OPEN_L: 0 on the cut, its biggest step the
  // kick's next frame, the house's +1, so 8.1's hit stays the cut and the push it launches); v06's camera exactly once both are home.
  let open = 1;
  if (f < BR.AIM.to) {
    const o = open8();
    const r = 1 - openL(f);
    cx += (o.cx - 1140) * r;
    cy += (o.cy - 448) * r;
    open = 1 + (o.zoom - 1) * r;
  }
  const steps = 1 + AIM_NOTCH * sum(HITS8.slice(1).map((at) => hitL(f, at)));
  let zoom: number;
  if (f < BR.HELD_V2) zoom = steps * open;
  else if (f < BR.RELEASE) zoom = steps + AIM_PUSH * ease.inCubic(clamp((f - BR.HELD_V2) / (BR.RELEASE - 1 - BR.HELD_V2)));
  else if (f < BR.SPLAT) zoom = Z_RELEASE - (Z_RELEASE - 1.02) * ease.outCubic((f - BR.RELEASE) / (BR.SPLAT - BR.RELEASE));
  else if (f < CREEP_FROM) zoom = 1.02;
  else zoom = 1.02 + (0.03 * (f - CREEP_FROM)) / (LAST_V2 - CREEP_FROM);
  return { zoom, cx, cy, roll: 0, dy: 0 };
}
/**
 * v07 WP5 (continuity plan §7, FW5 at C8): the reverse angle opens on him where break 7 left him. v06 opened at Z 1 on C (1140, 448): his
 * ω 60 px right of where break 7's last frame had it and 64 % bigger (em 146 → 240 px on screen) in one frame, the fork re-laid out round
 * a different place — it read as a new clip. Now the cut's first frame puts his ω on break 7's last pixel at break 7's last size (so the
 * frontal slingshot is seen whole round him: the same yellow / cream prongs and mint stem, turned to face us) and the camera settles into
 * the aim with the cut's own L — the change spread over the beat after the line, his face the anchor across it.
 */
/** The opening's settle at instant f: launchL a frame in, renormalised to 0 on the cut (37 % the next frame, 92 % by + 3, home by + 11). */
const OPEN_L1 = launchL(1);
export const openL = (f: number): number => (f <= BR.REVERSE ? 0 : (launchL(f - BR.REVERSE + 1) - OPEN_L1) / (1 - OPEN_L1));
let open8Cache: { zoom: number; cx: number; cy: number } | null = null;
export function open8(): { zoom: number; cx: number; cy: number } {
  if (open8Cache) return open8Cache;
  const f = EIGHT - 1;
  const s = slingState(f);
  const [x, y] = toScreen(slingCam(f), s.wx, s.wy);
  const zoom = (s.em * s.zoom) / EM_CUT;
  open8Cache = { zoom, cx: OMEGA_AIM[0] - (x - 960) / zoom, cy: OMEGA_AIM[1] - (y - 540) / zoom };
  return open8Cache;
}
/** The held breath's last zoom (every step settled): where the flinch starts. */
const Z_RELEASE = 1 + AIM_NOTCH * 3 + AIM_PUSH;
/** The creep of the dead air: Z 1.02 → 1.05 from break 8.3& to the last frame. */
const CREEP_FROM = partFrame('break', 8, 2.5);

/** The launch's shot camera, v2: the whip's tail and break 7 (the notches), then the reverse angle. */
export const launchCamV2 = (f: number): BreakCam => (f < EIGHT ? slingCam(f) : fakeCam(f));

/** A world point on screen at instant f (layout px): the shot camera, then the rig's punch about the frame centre. */
const onScreenV2 = (f: number, x: number, y: number): [number, number] => {
  const [sx, sy] = toScreen(launchCamV2(f), x, y);
  const z = rigAt(f).zoom;
  return [960 + (sx - 960) * z, 540 + (sy - 540) * z];
};

// ——— His pose, v2 ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His pose v2: his face, his ω's placement point (world), squash (body sx sy, face fx fy), em, and his head's tilt (° clockwise, about his ω). */
export type HeroPoseV2 = HeroPose & { tilt: number };

/** Break 7: the catch squeezes him (he stops dead in the band) and each notch squashes his body as v04's steps did (face lightly). */
const NOTCH_SQUASH_X: readonly number[] = SQUASH_X;
/** Break 8: the em of each creep back into the depth (CREEPS), from 240 on the cut; the flight; the splat. */
const EM_CUT = 240;
const EM_CREEPS: readonly number[] = [230, 220, 212, 206, 200, 194, 188];
const EM_SPLAT = 440;
/** The impact squash each hit's creep lands with (break 8). */
const CREEP_SQUASH = 0.07;
/** His ω (world) in break 8: behind the fork's plane; on the film after the splat (screen (960, 580) at Z 1.05). */
const OMEGA_AIM: readonly [number, number] = [960, 548];
const OMEGA_FILM: readonly [number, number] = [960, 578];
/** The splat's squash (sx, sy) on 8.3e, relaxing over 18 f to the pressed-in rest drop 2 inherits. */
const SPLAT_SQUASH = { from: [1.16, 0.86], rest: [1.06, 0.95], frames: 18 } as const;
/** The look's head tilt (° clockwise, L) and its return (frames). */
const TILT = 6;
const TILT_BACK = 6;

/**
 * C7's after side (6.4a → 7.1), him: sharp — one instant per frame (review round 1 F2, as the graph side's whip). His place and size on
 * SCREEN are taken at the output frame and held through all its sub-frames, while the camera — and the world through it — keeps moving
 * under the 64-sub-frame shutter: the world, the cords and the cars entering streak, he does not. Stretched along his flight (body
 * 1.06 / 0.97 on 6.4a, easing to 1 by the catch; the face lightly). On the catch's own early sub-frames (output frame 7.1), the catch.
 */
export const WHIP_STRETCH = 0.06;
function whipPose(f: number): HeroPoseV2 {
  const F = Math.max(BR.WHIP_CUT, frameOf(f));
  const c = slingCam(f);
  const place = (p: HeroPoseV2, s: SlingState): HeroPoseV2 => {
    const [x, y] = toScreen({ zoom: s.zoom, cx: s.cx, cy: s.cy, roll: 0, dy: 0 }, p.omega[0], p.omega[1]);
    return { ...p, omega: fromScreen(c, x, y), em: (p.em * s.zoom) / c.zoom };
  };
  // The catch's own early sub-frames: the catch's pose (its squash included), where the catch puts him.
  if (F >= BR.CATCH) return place(slingPose(BR.CATCH), slingState(BR.CATCH));
  const s = slingState(F);
  const u = 1 - (F - BR.WHIP_CUT) / (BR.CATCH - BR.WHIP_CUT);
  const sx = 1 + WHIP_STRETCH * u;
  const sy = 1 - 0.5 * WHIP_STRETCH * u;
  return place({ text: READY, omega: [s.wx, s.wy], sx, sy, fx: 1 - FACE_SQUASH * (1 - sx), fy: 1 + FACE_SQUASH * (sy - 1), em: s.em, tilt: 0 }, s);
}
/** Break 7 from the catch: the band's pose (the catch's squeeze, each notch's squash) at his place in the world. */
function slingPose(f: number): HeroPoseV2 {
  const s = slingState(f);
  const q = BR.NOTCHES.map((at) => squashAt(f, at));
  const [along, across] = impactSquash(f - BR.CATCH, 0.05);
  const sx = (1 - sum(q.map((v, i) => NOTCH_SQUASH_X[i] * v))) * across;
  const sy = (1 + SQUASH_Y * sum(q)) * along;
  return { text: frameOf(f) >= BR.GRIP ? ZOOM : READY, omega: [s.wx, s.wy], sx, sy, fx: 1 - FACE_SQUASH * (1 - sx), fy: 1 + FACE_SQUASH * (sy - 1), em: s.em, tilt: 0 };
}

export function heroPoseV2(f: number): HeroPoseV2 {
  const d = frameOf(f);
  if (f < EIGHT) return f < BR.CATCH ? whipPose(f) : slingPose(f);
  if (d < BR.RELEASE) {
    const em = EM_CUT - BR.CREEPS.reduce((a, at, i) => a + ((i === 0 ? EM_CUT : EM_CREEPS[i - 1]) - EM_CREEPS[i]) * creepAt(f, at), 0);
    // Each hit's creep lands as an impact squash (I: 1.07 / 0.93 on its frame, ringing back) — review round 1 SYNC-3.
    let k = 0;
    for (const at of HITS8.slice(1)) if (d >= at) k += impactSquash(Math.max(0, f - at), CREEP_SQUASH)[0] - 1;
    const sx = 1 + k;
    const sy = 1 - k;
    return { text: FRONTAL, omega: [OMEGA_AIM[0], OMEGA_AIM[1]], sx, sy, fx: 1 - FACE_SQUASH * (1 - sx), fy: 1 + FACE_SQUASH * (sy - 1), em, tilt: 0 };
  }
  if (d < BR.SPLAT) {
    // A constant-speed approach seen in perspective: 1/em runs linearly from the release to the splat, so his size grows ever faster
    // (and from the release's own frame on, outrunning the camera's flinch: he never shrinks while he flies at us). His ω slides
    // to the film's point in step with his size.
    const t = clamp((f - BR.RELEASE) / (BR.SPLAT - BR.RELEASE));
    const em0 = EM_CREEPS.at(-1)!;
    const em = 1 / lerp(1 / em0, 1 / EM_SPLAT, t);
    const u = (em - em0) / (EM_SPLAT - em0);
    return { text: FLYING, omega: [OMEGA_AIM[0], lerp(OMEGA_AIM[1], OMEGA_FILM[1], u)], sx: 1, sy: 1, fx: 1, fy: 1, em, tilt: 0 };
  }
  const q = flow((f - BR.SPLAT) / SPLAT_SQUASH.frames);
  const sx = lerp(SPLAT_SQUASH.from[0], SPLAT_SQUASH.rest[0], q);
  const sy = lerp(SPLAT_SQUASH.from[1], SPLAT_SQUASH.rest[1], q);
  // The tilt: an L in on the look; back to 0 by 8.4& + 6 (sine), so the last frames are square to the camera.
  const tilt = f < BR.LOOK ? 0 : f < BR.GETS_IT ? TILT * launchL(f - BR.LOOK) : TILT * (1 - flow((f - BR.GETS_IT) / TILT_BACK));
  const text = d < BR.LOOK ? SQUASHED : d < BR.GETS_IT ? LOOKING : GETS_IT_FACE;
  return { text, omega: [OMEGA_FILM[0], OMEGA_FILM[1]], sx, sy, fx: sx, fy: sy, em: EM_SPLAT, tilt };
}

/** The uppercut, v2: v04's own curve (cubic in to [ LOUDER ] on the kick, back with an L), one bar later. */
const uppercutV2 = (f: number): number => uppercut(f - BAR);
/** The world offset that puts the fist's ink top on [ LOUDER ]'s bottom edge on break 7.2 (v04's solve with this frame's camera and step). */
function fistReachV2(L: LaunchLayout): [number, number] {
  const h = heroPoseV2(BR.LOUDER_V2);
  const fist = aroundEm(READY, L.advance, h.em, h.sx, h.fx)[6];
  const rest: [number, number] = [h.omega[0] + fist.o, h.omega[1]];
  const a = (FIST_ROT * Math.PI) / 180;
  const t = FIST_TOP * h.em * h.sy;
  const z = rigAt(BR.LOUDER_V2).zoom;
  const [tx, ty] = fromScreen(slingCam(BR.LOUDER_V2), 960 + (LOUDER_BUTTON.x - 960) / z, 540 + (LOUDER_BUTTON.bottom - 540) / z);
  return [tx - rest[0] - Math.sin(a) * t, ty - rest[1] + Math.cos(a) * t];
}

/** The look's ( ・ω・) in (•ω•)'s glyph slots (design §9.2: the wide space would push its brackets under his hands). */
const LOOK_SLOTS: readonly (readonly [string, number])[] = [
  ['(', 0],
  ['・', 1],
  ['ω', 2],
  ['・', 3],
  [')', 4],
];
/** The ? pops beside his ")" a 32nd after the eyes (Pop) and pops out over 3 f when he gets it. */
const qmarkScale = (f: number): number => (f < BR.QMARK - SWAP_LEAD ? 0 : f < BR.GETS_IT ? pop(f - BR.QMARK + SWAP_LEAD) : clamp(1 - (f - BR.GETS_IT) / 3));
/**
 * His paws flat on the film (from the splat): っ っ just outside his brackets, low (±1.6 em, 0.35 em down, 0.6 em, turned ∓12°) — clear of
 * the brackets so each reads as a hand, under the band's line so the links stay clear; they never turn with his head.
 */
const PAW = { x: 1.6, y: 0.35, size: 0.6, rot: 12 } as const;
/**
 * The look's ?: just past his ")" and 0.42 em up (ems about his ω), 0.46 em, turned 8.6°, upright while his head tilts (a thought, not a
 * feature) — between the window's bottom edge and the band's links, the one free spot beside a face 1320 px wide.
 */
const QMARK_AT = { x: 1.44, y: -0.42, size: 0.46, rot: 8.6 } as const;

/** Rotates the point (x, y) about (cx, cy) by `deg` clockwise. */
const turnAbout = (x: number, y: number, cx: number, cy: number, deg: number): [number, number] => {
  if (deg === 0) return [x, y];
  const [rx, ry] = rotate(x - cx, y - cy, deg);
  return [cx + rx, cy + ry];
};

/** Every visible character of his face at instant f (v2), with its part: squashed about his ω, the fist carrying the uppercut, the head's tilt. */
export function heroCharsV2(f: number, L: LaunchLayout): PartChar[] {
  const h = heroPoseV2(f);
  const [ox, oy] = h.omega;
  const out: PartChar[] = [];
  const put = (ch: string, part: HeroPartV2, x: number, y: number, size: number, stretch: number, rot = 0, extra: Partial<PlacedChar> = {}): void => {
    const [tx, ty] = turnAbout(x, y, ox, oy, h.tilt);
    out.push({ ch, part, x: tx, y: ty, size, stretch, rot: rot + h.tilt, dx: 0, dy: 0, ...extra });
  };
  if (h.text === LOOKING) {
    // The look: (•ω•)'s slots; on 8.3a itself still ≧ ≦, squeezed small; then ・ ・ growing to full.
    const slots = aroundEm(CORE, L.advance, h.em, h.sx, h.fx);
    const squeezed = frameOf(f) === BR.LOOK;
    const s = squeezed ? 0.55 : lerp(0.6, 1, clamp((f - BR.LOOK - 1) / 2));
    const eyes = squeezed ? ['≧', '≦'] : ['・', '・'];
    for (const [ch0, i] of LOOK_SLOTS) {
      const eye = i === 1 || i === 3;
      const ch = eye ? eyes[i === 1 ? 0 : 1] : ch0;
      const part = PARTS[CORE][i];
      put(ch, part, ox + slots[i].o, oy, h.em * h.sy * (eye ? s : 1), h.sx / h.sy);
    }
  } else {
    const parts = PARTS[h.text];
    let j = 0;
    const p = h.text === READY ? uppercutV2(f) : 0;
    const reach = p !== 0 ? fistReachV2(L) : [0, 0];
    for (const { ch, o } of aroundEm(h.text, L.advance, h.em, h.sx, h.fx)) {
      if (ch.trim() === '') continue;
      const part = parts[j];
      const fist = h.text === READY && j === 6;
      j++;
      const [sx, sy] = FACE.has(ch) ? [h.fx, h.fy] : [h.sx, h.sy];
      const dx = fist ? reach[0] * p : 0;
      const dy = fist ? reach[1] * p : 0;
      const [tx, ty] = turnAbout(ox + o + dx, oy + dy, ox, oy, h.tilt);
      out.push({ ch, part, x: tx, y: ty, size: h.em * sy, stretch: sx / sy, rot: (fist ? FIST_ROT * p : 0) + h.tilt, dx, dy });
    }
  }
  // The ? (the look) and the paws (from the splat: fixed, never turned with his head).
  const q = qmarkScale(f);
  if (q > 0.01 && f >= BR.LOOK) {
    out.push({ ch: QUESTION, part: 'mark', x: ox + QMARK_AT.x * h.em * h.sx, y: oy + QMARK_AT.y * h.em * h.sy, size: QMARK_AT.size * h.em * q, stretch: 1, rot: QMARK_AT.rot, dx: 0, dy: 0 });
  }
  if (frameOf(f) >= BR.SPLAT) {
    for (const side of [-1, 1]) {
      out.push({ ch: PAWS, part: 'paw', x: ox + side * PAW.x * h.em * h.sx, y: oy + PAW.y * h.em * h.sy, size: PAW.size * h.em, stretch: 1, rot: side * PAW.rot, dx: 0, dy: 0 });
    }
  }
  return out;
}

/** His brows, v2: ˋ ˊ dropping in on break 7.1e and 7.1& (v04's drop, a bar later) and riding his face to the release; then gone (≧ ≦); popping back on 8.4& and 8.4& + 3. */
export function browsV2(f: number, L: LaunchLayout): PartChar[] {
  const h = heroPoseV2(f);
  if (h.text === FLYING || h.text === SQUASHED || h.text === LOOKING) return [];
  const eyes = aroundEm(h.text, L.advance, h.em, h.sx, h.fx).filter((c) => c.ch === '•');
  const out: PartChar[] = [];
  const lands = h.text === GETS_IT_FACE ? BR.BROWS_34 : BR.BROWS_V2;
  lands.forEach((land, i) => {
    const t = f - land;
    if (h.text === GETS_IT_FACE) {
      const s = pop(t + SWAP_LEAD);
      if (s <= 0) return;
      const [x, y] = turnAbout(h.omega[0] + eyes[i].o, h.omega[1] - BROW_LIFT * h.em * h.fy, h.omega[0], h.omega[1], h.tilt);
      out.push({ ch: BROWS[i], part: 'brow', x, y, size: h.em * h.fy * s, stretch: h.fx / h.fy, rot: h.tilt, dx: 0, dy: 0 });
      return;
    }
    if (t < -BROW_LEAD) return;
    const u = impact(t, BROW_LEAD);
    const [along, across] = impactSquash(t);
    out.push({
      ch: BROWS[i],
      part: 'brow',
      x: h.omega[0] + eyes[i].o,
      y: h.omega[1] - BROW_LIFT * h.em * h.fy - BROW_DROP * (h.em / EM) * (1 - u),
      size: h.em * h.fy * along,
      stretch: ((h.fx / h.fy) * across) / along,
      rot: 0,
      dx: 0,
      dy: 0,
      alpha: clamp((t + BROW_LEAD) / 1.5),
    });
  });
  return out;
}

// ——— The braced Y fork (break 7, side on) and the frontal fork (break 8) ———————————————————————————————————————————————————————————

/** A fork: its crotch, its two tips (U the upper / left, yellow; L the lower / right, cream), its stem's end, its base (break 7 only). */
export type Fork = { view: 'side' | 'front'; crotch: [number, number]; U: [number, number]; L: [number, number]; stem: [number, number]; base: { x: number; y: number; w: number; h: number; r: number } | null };
/** Break 7's fork at full draw (design §3.7: braced back 14.7°, the prongs bent 3° toward him); the bend grows with the notches. */
const FORK7 = { crotch: [1945, 870], U: [1790, 213], L: [2403, 375], stem: [1846, 1244], base: { x: 1822, y: 1302, w: 710, h: 177, r: 40 }, bend: 3 } as const;
/** Break 8's: frontal, the target's view (design §3.8, §4.3). */
const FORK8 = { crotch: [960, 1060], U: [110, 540], L: [1810, 540], stem: [960, 1700] } as const;
/** Its prongs and stem: pills 120 px wide; ink knots (the old handle grips, r 30) on the tips; 6 px outlines, (12, 12) shadows. */
export const FORK_STYLE = { width: 120, knot: 30, outline: 6, shadow: 12 } as const;

/**
 * Break 8's prongs flex in toward the pouch on each hit (review round 1 F4): 2° about the crotch, whole on the hit's own frame, ringing
 * back (I's spring) — settled 14 frames later (8.2e + 14), so before the release (and on the break's last frame) the fork is FORK8 exactly.
 */
export const FORK_FLEX = 2;
export function forkFlex(f: number): number {
  let a = 0;
  for (const at of HITS8) {
    if (frameOf(f) < at) continue;
    const t = Math.max(0, f - at);
    a += Math.exp(-0.45 * t) * Math.cos(0.9 * t) * (1 - smoothstep(9, 14, t));
  }
  return FORK_FLEX * a;
}

/** The fork at instant f (world px of the shot): from the whip's tail through break 7 (bending 3° toward him over the four notches), frontal in break 8 (flexing on its hits). */
export function forkAt(f: number): Fork {
  if (f >= EIGHT) {
    const a = forkFlex(f);
    const [cx, cy] = FORK8.crotch;
    // Positive turns clockwise on screen: the left (yellow) tip swings right, toward him; the right (cream) tip the other way.
    return { view: 'front', crotch: [cx, cy], U: turnAbout(FORK8.U[0], FORK8.U[1], cx, cy, a), L: turnAbout(FORK8.L[0], FORK8.L[1], cx, cy, -a), stem: [...FORK8.stem], base: null };
  }
  const k = sum(BR.NOTCHES.map((at) => notchL(f, at))) / BR.NOTCHES.length;
  // The given tips are at full draw: unbend them by the bend still to come (the prongs turn anticlockwise toward him as he draws).
  const back = FORK7.bend * (1 - k);
  const [cx, cy] = FORK7.crotch;
  const tip = (p: readonly [number, number]): [number, number] => turnAbout(p[0], p[1], cx, cy, back);
  return { view: 'side', crotch: [cx, cy], U: tip(FORK7.U), L: tip(FORK7.L), stem: [...FORK7.stem], base: { ...FORK7.base } };
}

/** A part of the fork as drawn (world px): a pill from a to b (`w` wide) or the base's rounded rect, its colour; or a knot. */
export type ForkPart =
  | { kind: 'pill'; a: [number, number]; b: [number, number]; w: number; color: 'yellow' | 'cream' | 'mint' }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; color: 'coral' }
  | { kind: 'knot'; x: number; y: number; r: number };
/** The fork's parts back to front: base, stem, the cream (lower / right) prong, the yellow (upper / left) prong, the two knots. */
export function forkParts(k: Fork): ForkPart[] {
  const W = FORK_STYLE.width;
  const out: ForkPart[] = [];
  if (k.base) out.push({ kind: 'rect', ...k.base, color: 'coral' });
  out.push({ kind: 'pill', a: [...k.crotch], b: [...k.stem], w: W, color: 'mint' });
  out.push({ kind: 'pill', a: [...k.crotch], b: [...k.L], w: W, color: 'cream' });
  out.push({ kind: 'pill', a: [...k.crotch], b: [...k.U], w: W, color: 'yellow' });
  for (const t of [k.U, k.L]) out.push({ kind: 'knot', x: t[0], y: t[1], r: FORK_STYLE.knot });
  return out;
}
/** A pill from a to b as a block (centre, length + width, width, turn ° clockwise): what drop 2's region-0 world draws as the break's blocks. */
const pillBlock = (a: readonly [number, number], b: readonly [number, number], w: number, color: BlockOut['color']): BlockOut => ({
  color,
  x: (a[0] + b[0]) / 2,
  y: (a[1] + b[1]) / 2,
  w: Math.hypot(b[0] - a[0], b[1] - a[1]) + w,
  h: w,
  r: w / 2,
  rot: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
});

// ——— The band: the cords (break 7), the arms and the straight line (break 8) ————————————————————————————————————————————————————

/** The pouch, hidden behind his ")": his ω + (1.13, 0.07) em (break 7); in break 8 (frontal) each arm ends in one of his fists, the two ง. */
const POUCH7 = { x: 1.13, y: 0.07 } as const;
const POUCH8 = { left: -(HERO_ADVANCE['ω'] / 2 + HERO_ADVANCE['•'] + HERO_ADVANCE['ง'] / 2), right: HERO_ADVANCE['ω'] / 2 + HERO_ADVANCE['•'] + HERO_ADVANCE[')'] + HERO_ADVANCE['ง'] / 2, y: 0.1 } as const;
/** The cords' width on screen (px; drawn in the world at px / Z so it reads at every zoom): 14 slack, thin 10 on the catch's stretch, 12 → 11 → 10 → 9 over the notches. */
export function cordPx(f: number): number {
  const stretch = f < BR.CATCH ? 0 : (f - BR.CATCH < 3 ? ease.outCubic((f - BR.CATCH) / 3) : 1 - launchL(f - BR.CATCH - 3));
  return 14 - 4 * stretch - 2 * notchL(f, BR.NOTCHES[0]) - notchL(f, BR.NOTCHES[1]) - notchL(f, BR.NOTCHES[2]) - notchL(f, BR.NOTCHES[3]);
}
/** The band in break 8: 9 px arms (as the cords left it), the straight line after the release 6.4 px on screen at the last frame's zoom. */
const ARM8_PX = 9;
export const LINE_PX = 6.4;

/**
 * His glyph ink boxes in ─=≡Σ((( つ•ω•)つ (ems about his ω's placement point, y down; measured from the project's fonts, design
 * `sling.mjs`), less the speed lines: what the cords are hidden behind. Each link sits on the visible arm — from where its cord leaves his
 * silhouette (these boxes plus his 8 px outline) to its tip — at k / 5 of the way (design §3.7: the pitch is the visible arm ÷ 5).
 */
export const ZOOM_INK: readonly (readonly [number, number, number, number])[] = [
  [-3.403, -3.087, -0.411, 0.544],
  [-2.991, -2.675, -0.411, 0.544],
  [-2.579, -2.263, -0.411, 0.544],
  [-1.851, -1.012, -0.349, 0.383],
  [-0.821, -0.527, -0.153, 0.141],
  [-0.365, 0.365, -0.161, 0.369],
  [0.527, 0.821, -0.153, 0.141],
  [0.973, 1.288, -0.411, 0.544],
  [1.435, 2.274, -0.349, 0.383],
];
/** Whether world point (x, y) is under his ink (break 7's wound-up face at instant f), his outline included. */
function underHim(f: number, x: number, y: number, h = heroPoseV2(f)): boolean {
  const pad = HERO_STYLE.outline;
  for (const [x0, x1, y0, y1] of ZOOM_INK) {
    const a = h.omega[0] + x0 * h.em * h.sx - pad;
    const b = h.omega[0] + x1 * h.em * h.sx + pad;
    const c = h.omega[1] + y0 * h.em * h.sy - pad;
    const d = h.omega[1] + y1 * h.em * h.sy + pad;
    if (x >= a && x <= b && y >= c && y <= d) return true;
  }
  return false;
}
/** A cord of break 7: from the pouch to its tip; `exit` the point where it leaves his silhouette (the visible arm runs from there). */
export type Cord = { from: [number, number]; to: [number, number]; exit: [number, number]; w: number };
/** Break 7's two cords at instant f (U first): world px, `w` world width. `lag` reads his step that many frames late (the links' ripple). */
export function slingCords(f: number, lag = 0): Cord[] | null {
  if (f < BR.WHIP_CUT) return null;
  const g = f - lag;
  const h = heroPoseV2(g);
  const fork = forkAt(f);
  const P: [number, number] = [h.omega[0] + POUCH7.x * h.em * h.sx, h.omega[1] + POUCH7.y * h.em * h.sy];
  const w = cordPx(f) / slingCam(f).zoom;
  const wound = h.text === ZOOM;
  return [fork.U, fork.L].map((T) => {
    const len = Math.hypot(T[0] - P[0], T[1] - P[1]);
    let t = 0;
    if (wound) {
      // March out from the pouch (2 px a step) to the last point under him.
      const reach = Math.min(len, 2.5 * h.em);
      for (let s = 0; s <= reach; s += 2) if (underHim(g, P[0] + ((T[0] - P[0]) * s) / len, P[1] + ((T[1] - P[1]) * s) / len, h)) t = s;
    }
    const exit: [number, number] = [P[0] + ((T[0] - P[0]) * t) / len, P[1] + ((T[1] - P[1]) * t) / len];
    return { from: P, to: [T[0], T[1]], exit, w };
  });
}
/** Break 8's arms' ends at instant f (left, right): his fists (he holds the band in both, aimed at us). */
const pouch8 = (h: HeroPoseV2): [[number, number], [number, number]] => [
  [h.omega[0] + POUCH8.left * h.em, h.omega[1] + POUCH8.y * h.em],
  [h.omega[0] + POUCH8.right * h.em, h.omega[1] + POUCH8.y * h.em],
];
/** The pluck of the straight line (px): 40 → 0 over three half-cycles from the fork pass, flat from 8.4. */
export function lineY(f: number, x: number): number {
  if (f < BR.FORK_PASS || f >= BR.PLUCK.to) return 540;
  const u = (f - BR.FORK_PASS) / (BR.PLUCK.to - BR.FORK_PASS);
  return 540 + 40 * (1 - u) * Math.cos((Math.PI * (f - BR.FORK_PASS)) / 7) * Math.sin((Math.PI * (x - FORK8.U[0])) / (FORK8.L[0] - FORK8.U[0]));
}
/** The band of break 8 as a polyline (world px) and its world width: two arms to his sides; the snap (8.3 → the fork pass); the plucked line. */
export function band8(f: number): { pts: [number, number][]; w: number }[] {
  const cam = fakeCam(f);
  const d = frameOf(f);
  if (d < BR.RELEASE) {
    const [a, b] = pouch8(heroPoseV2(f));
    const w = ARM8_PX / cam.zoom;
    const k = forkAt(f);
    return [
      { pts: [[...k.U], a], w },
      { pts: [[...k.L], b], w },
    ];
  }
  const w = lerp(ARM8_PX / fakeCam(BR.RELEASE - 1).zoom, LINE_PX / fakeCam(LAST_V2).zoom, ease.outCubic(clamp((f - BR.RELEASE) / 3)));
  if (d < BR.FORK_PASS) {
    const [a, b] = pouch8(heroPoseV2(BR.RELEASE - 1));
    const u = ease.outCubic((f - BR.RELEASE) / (BR.FORK_PASS - BR.RELEASE));
    return [{ pts: [[...FORK8.U], [a[0], lerp(a[1], 540, u)], [b[0], lerp(b[1], 540, u)], [...FORK8.L]], w }];
  }
  const n = 34;
  const pts = Array.from({ length: n + 1 }, (_, i): [number, number] => {
    const x = lerp(FORK8.U[0], FORK8.L[0], i / n);
    return [x, lineY(f, x)];
  });
  return [{ pts, w }];
}

// ——— The copies: the stack (7.1 → 7.3), the links (7.3 → the end) ——————————————————————————————————————————————————————————————————

/**
 * The four cars of the coaster's train, his copies riding them (yellow, mint, coral, violet — cream on the violet ground), C7's after
 * side. Review round 2 CONCERTINA-SCALE (the sling fixer): the bar's signature move is the cars folding into the rainbow stack, so the
 * train is the widget's (extend/iw/src/d.js bar33): half his size, at his eye line, slamming into his back one a frame. Flung after him,
 * they rush in from frame-right behind his )ง, under him, nose to tail (streaked by the whip's 64 sub-frames); each stops dead on its own
 * crunch thump — CAR_RAMS, the audio's CRUNCH (scripts/audio/sections/break.mjs: four thumps a frame apart from 7.1 − 2): car 1 on
 * 7.1 − 2, car 2 on 7.1 − 1, car 3 on the catch with the burst, car 4 on 7.1 + 1 — sharp and squashed against his back (0.62, nose
 * held), and is gone from the next frame: its rider has snapped into the stack layers of its own chase colour (bandAtV2, snapIn), so
 * the stack visibly builds from the cars (yellow, mint, coral, cream), the ink 9th with the burst.
 */
const CAR_COLORS: readonly CopyColor[] = ['yellow', 'mint', 'coral', 'cream'];
/** Each car's ram (output frame): one a frame from 7.1 − 2, the third on the catch — on the four crunch thumps. */
export const CAR_RAMS: readonly number[] = CAR_COLORS.map((_, i) => BR.CATCH - 2 + i);
/** The output frame a stack copy of `color` is there from: the frame after its car rammed him; the ink 9th with the burst (the catch). */
export const snapIn = (color: CopyColor): number => (color === 'ink' ? BR.CATCH : CAR_RAMS[CAR_COLORS.indexOf(color)] + 1);
/** The stack's step before the catch (world px at em 360): the snapped-in layers packed tight behind him, a sliver each, until it bursts. */
export const PACK_STEP = 3;
/**
 * The concertina (design §3.7, 33.1): the copies spring out from behind him, the step 0 → 13 → 9 px (a loose spring, 6 f), on the catch —
 * a frame in on the kick's own frame (review round 1 F2: the stack bursts out on the kick's frame, not two later). Before it, from the
 * first car's snap (review round 2), the packed step: the layers the cars have rammed in so far, folded tight.
 */
const concertina = (f: number): number => {
  const d = frameOf(f);
  if (d < BR.CATCH) return d >= CAR_RAMS[0] + 1 ? PACK_STEP : 0;
  return 9 * spring(tighten(f, 0.25) - BR.CATCH + 1, 0.25, 1.2, 14);
};
/** The stack's step (world px at em 360): the concertina, then v04's breaths a bar later (9 → 11 on 7.1&, → 13 on 7.2&). */
export const stackStepV2 = (f: number): number => concertina(f) + (stackStep(f - BAR) - 9);
/** The colour chase, v04's a bar later (one copy deeper on every 16th from 7.1 to 7.2a). */
export const chaseV2 = (f: number): number => chaseOf(f - BAR);
/** The link em (world): break 7's (0.55 × his 292 on the grip), break 8's (0.55 × his 240 on the cut). */
export const LINK7 = 160;
export const LINK8 = 132;
/** Break 8: where link k (1 nearest him) rests on each arm before the release (a share of pouch → tip), and on the straight line after it (bunched toward its tip). */
const ARM_AT = (k: number): number => 0.3 + 0.2 * (k - 1);
const LINE_X = (k: number, right: boolean): number => (right ? FORK8.L[0] - 36 * (5 - k) : FORK8.U[0] + 36 * (5 - k));
/**
 * The links clack a step out along the arms on each hit after the cut (review round 1 F4: an L each, 75 % in 3 frames, hitL: two frames
 * in on its own frame): each moves CLACK of the way still left to its tip — the band stretching as he is drawn back.
 */
const CLACK = 0.1;
const clacksAt = (f: number): number => sum(HITS8.slice(1).map((at) => hitL(f, at)));
/** The links' ripple on 7.3& (a 10 px sideways wave, a frame late per link). */
const RIPPLE_PX = 10;

/** Which links a tension pulse lights on output frame d (per side, 4 links): fork → him over 3 frames ({3, 4}, {2}, {1}). */
function pulsedV2(d: number, k: number, pulses: readonly number[]): boolean {
  for (const t of pulses) {
    const j = d - t;
    if (j < 0 || j > 2) continue;
    return k > 4 - (4 * (j + 1)) / 3 + 1e-9 && k <= 4 - (4 * j) / 3 + 1e-9;
  }
  return false;
}

/**
 * The nine copies at instant f (v2), nearest first, as v04's Copy (scale is a share of em 360, as v04's) with the bracket each shows.
 * Break 7.1 → 7.3: the extrude stack behind him at (−step·k, +step·k) (the step scaled with his em), full size, the 9th in ink; on 7.3's own
 * frame every face drops whole and the ink copy goes; copies 1–4's "(" fly to the upper (yellow) cord, 5–8's ")" to the lower (cream)
 * one (v04's flight: cubic out over 5 f, half a frame later per link), at link em 160, each turned across its cord, centred on the visible
 * arm's k / 5 points — the pitch widening as he steps away, re-spreading a frame late per link (a ripple running out to the fork).
 * Break 8: on the two arms, then on the straight line (turned 0°), link em 132.
 */
export function bandAtV2(f: number): (Copy & { ch: '(' | ')' })[] {
  const d = frameOf(f);
  const out: (Copy & { ch: '(' | ')' })[] = [];
  if (d < CAR_RAMS[0] + 1) return out;
  const n = chaseV2(f);
  const colorOf = (k: number): CopyColor => COPY_COLORS[(((k - 1 - n) % 4) + 4) % 4];
  if (f >= EIGHT) {
    // Break 8: the links keep their colours and sides (C8).
    const h = heroPoseV2(f);
    const [pa, pb] = pouch8(d < BR.RELEASE ? h : heroPoseV2(BR.RELEASE - 1));
    const u = d < BR.RELEASE ? 0 : ease.outCubic(clamp((f - BR.RELEASE) / 3));
    const pulses = [...HITS8, ...BR.TENSION_34];
    const fork = forkAt(d < BR.RELEASE ? f : BR.RELEASE - 1);
    const clacks = clacksAt(d < BR.RELEASE ? f : BR.RELEASE - 1);
    for (let k = 1; k <= 8; k++) {
      const right = k > 4;
      const j = right ? k - 4 : k;
      const P = right ? pb : pa;
      const T = right ? fork.L : fork.U;
      const s = ARM_AT(j) + (1 - ARM_AT(j)) * CLACK * clacks;
      const arm: [number, number] = [lerp(P[0], T[0], s), lerp(P[1], T[1], s)];
      const rot = (Math.atan((T[1] - P[1]) / (T[0] - P[0])) * 180) / Math.PI;
      const lx = LINE_X(j, right);
      const x = lerp(arm[0], lx, u);
      const y = lerp(arm[1], lineY(Math.max(f, BR.FORK_PASS), lx), u);
      const white = d < BR.RELEASE && pulsedV2(d, j, pulses);
      out.push({ k, ch: right ? ')' : '(', x, y, bx: x, by: y, core: 0, color: colorOf(k), scale: LINK8 / EM, sx: 1, sy: 1, outline: 5, white, rot: rot * (1 - u) });
    }
    out.push({ k: 9, ch: ')', x: 960, y: 540, bx: 960, by: 540, core: 0, color: 'ink', scale: 0, sx: 1, sy: 1, outline: 3, white: false, rot: 0 });
    return out;
  }
  // Break 7.
  const h = heroPoseV2(f);
  const step = stackStepV2(f) * (h.em / EM);
  const folded = d >= BR.GRIP;
  const s0 = folded ? heroPoseV2(BR.GRIP - 1) : h;
  const step0 = folded ? stackStepV2(BR.GRIP - 1) * (s0.em / EM) : step;
  const scale = (folded ? s0.em : h.em) / EM;
  for (let k = 1; k <= 9; k++) {
    const stack: [number, number] = [(folded ? s0 : h).omega[0] - (folded ? step0 : step) * k, (folded ? s0 : h).omega[1] + (folded ? step0 : step) * k];
    if (k === 9) {
      out.push({ k, ch: ')', x: stack[0], y: stack[1], bx: stack[0], by: stack[1], core: folded ? 0 : 1, color: 'ink', scale: folded || d < snapIn('ink') ? 0 : scale, sx: 1, sy: 1, outline: 3, white: false, rot: 0 });
      continue;
    }
    const upper = k <= 4;
    const ch = upper ? '(' : ')';
    const em = (folded ? s0 : h).em;
    const bo = (upper ? -1 : 1) * BRACKET_O * em;
    if (!folded) {
      // A layer is there from its car's snap (review round 2: the stack builds from the cars — yellow, mint, coral, cream).
      const there = d >= snapIn(colorOf(k));
      out.push({ k, ch, x: stack[0], y: stack[1], bx: stack[0] + bo, by: stack[1], core: 1, color: colorOf(k), scale: there ? scale : 0, sx: 1, sy: 1, outline: 3, white: false, rot: 0 });
      continue;
    }
    // Its place on its cord: the visible arm's j / 5 point, his step seen (j − 1) frames late; the ripple of 7.3&.
    const j = upper ? k : k - 4;
    const c = slingCords(f, j - 1)![upper ? 0 : 1];
    const t = j / 5;
    const along: [number, number] = [lerp(c.exit[0], c.to[0], t), lerp(c.exit[1], c.to[1], t)];
    const len = Math.hypot(c.to[0] - c.exit[0], c.to[1] - c.exit[1]) || 1;
    const nx = -(c.to[1] - c.exit[1]) / len;
    const ny = (c.to[0] - c.exit[0]) / len;
    const rip = RIPPLE_PX * Math.sin(Math.PI * clamp((f - BR.LINK_RIPPLE - j) / 6));
    const place: [number, number] = [along[0] + nx * rip, along[1] + ny * rip];
    const u = ease.outCubic(clamp((f - BR.GRIP + 1 - (k - 1) * FLIGHT.stagger) / FLIGHT.frames));
    const rot = (Math.atan((c.to[1] - c.exit[1]) / (c.to[0] - c.exit[0])) * 180) / Math.PI;
    out.push({
      k,
      ch,
      x: stack[0],
      y: stack[1],
      bx: lerp(stack[0] + bo, place[0], u),
      by: lerp(stack[1], place[1], u),
      core: 0,
      color: colorOf(k),
      scale: lerp(scale, LINK7 / EM, u),
      sx: 1,
      sy: 1,
      outline: lerp(3, 5, u),
      white: pulsedV2(d, j, BR.TENSION_V2),
      rot: rot * u,
    });
  }
  return out;
}

// ——— The cars (the whip's tail: they ram his back, one a crunch) ——————————————————————————————————————————————————————————————————

/**
 * The lane (review round 2 CONCERTINA-SCALE), in his em on screen on the ram's frame: a rider's em (0.53: ≈ 280–296 px); the ram point
 * — the unsquashed rider's ω — right of his ω (his back: the rider sits on his )ง) and up from it, at his brow line (his face's band;
 * the widget's ω.y − 40 put the rider wholly behind his )ง at this framing, so it is lifted until the rider's face clears his fist and
 * reads, the car itself staying behind him); the train's speed (screen px a frame); the ram's squash (x) and the car's half-length in
 * rider em (carContent's pill: 2.4 em), so the nose stays on his back as it squashes; the ram's tilt per car; how much of the shutter an
 * incoming car is exposed for (tighten: hard ink edges streak a little, not into a ghost).
 */
export const CAR_LANE = { em: 0.53, dx: 1.06, dy: -0.3, speed: 560, squash: 0.62, nose: 1.2, tilt: [-5, 4, -4, 5], exposure: 0.4 } as const;
/** A car at instant f (world): its rider's ω, em, colour, its squash (x) and turn (° clockwise). */
export type CarState = { x: number; y: number; em: number; color: CopyColor; sx: number; rot: number };
/**
 * The cars at instant f (world), in drawing order — the farthest first, so the rammed one is on top: rushing in from frame-right behind
 * him (moving through the shutter: streaked), each stopped dead and squashed against his back on its ram frame (sharp: one instant per
 * frame, placed by his own place that frame), gone from the next.
 */
export function carsAt(f: number): CarState[] {
  const d = frameOf(f);
  if (f < BR.WHIP_CUT || d > CAR_RAMS[CAR_RAMS.length - 1]) return [];
  const c = launchCamV2(f);
  // His ω and em on screen this output frame (he is sharp on the whip's tail: whipPose), so a rammed car sits still against him.
  const h = heroPoseV2(d);
  const hc = launchCamV2(d);
  const [ox, oy] = toScreen(hc, h.omega[0], h.omega[1]);
  const em = h.em * hc.zoom;
  const r = CAR_LANE.em * em;
  const out: CarState[] = [];
  for (let i = CAR_COLORS.length - 1; i >= 0; i--) {
    const ram = CAR_RAMS[i];
    if (d > ram) continue; // its rider is in the stack (bandAtV2)
    const rammed = d === ram;
    const sx = rammed ? CAR_LANE.squash : 1;
    const x = ox + CAR_LANE.dx * em + (1 - sx) * CAR_LANE.nose * r + (rammed ? 0 : CAR_LANE.speed * (ram - tighten(f, CAR_LANE.exposure)));
    const [wx, wy] = fromScreen(c, x, oy + CAR_LANE.dy * em);
    out.push({ x: wx, y: wy, em: r / c.zoom, color: CAR_COLORS[i], sx, rot: rammed ? CAR_LANE.tilt[i] : 0 });
  }
  return out;
}

// ——— The red cursor (the antivirus's hand, screen px) ———————————————————————————————————————————————————————————————————————————————

/** The cursor at instant f: its tip (screen px), turn (° clockwise), whether it is ⊘, its colour and alpha; null when it is not there. */
export type CursorState = { x: number; y: number; rot: number; deny: boolean; color: RGB; alpha: number };
/** Where it heads: over [ LOUDER ] on 7.2 (it would have clicked [ OK ] three frames later); bonked away up-left; the hover by the window. */
const CURSOR_PATH = { from: [1990, 118], louder: [1650, 168], bonk: [-430, -300], hover: [1010, 300] } as const;
export function cursorAt(f: number): CursorState | null {
  const d = frameOf(f);
  if (f < BR.CURSOR_OK.from - SWAP_LEAD || d >= BR.DENIED.to) return null;
  const red = P.red;
  if (f < BR.LOUDER_V2) {
    const u = ease.outCubic(clamp((f - BR.CURSOR_OK.from) / (BR.LOUDER_V2 - BR.CURSOR_OK.from)));
    return { x: lerp(CURSOR_PATH.from[0], CURSOR_PATH.louder[0], u), y: lerp(CURSOR_PATH.from[1], CURSOR_PATH.louder[1], u), rot: 0, deny: false, color: red, alpha: 1 };
  }
  if (f < BR.HOVER.from) {
    // Bonked: it spins away up-left (two turns, cubic out).
    const u = ease.outCubic((f - BR.LOUDER_V2) / (BR.HOVER.from - BR.LOUDER_V2));
    return { x: CURSOR_PATH.louder[0] + CURSOR_PATH.bonk[0] * u, y: CURSOR_PATH.louder[1] + CURSOR_PATH.bonk[1] * u, rot: -720 * u, deny: false, color: red, alpha: 1 };
  }
  if (f < BR.DENIED.from) {
    // It comes back and hovers by the window, shaking ±4 px every 2 frames from the grip (nervous: it cannot click).
    const u = ease.outCubic(clamp((f - BR.HOVER.from) / (BR.HOVER.to - BR.HOVER.from)));
    const x0 = CURSOR_PATH.louder[0] + CURSOR_PATH.bonk[0];
    const y0 = CURSOR_PATH.louder[1] + CURSOR_PATH.bonk[1];
    const shake = d >= BR.HOVER.to ? (Math.floor(d / 2) % 2 === 0 ? -4 : 4) : 0;
    return { x: lerp(x0, CURSOR_PATH.hover[0], u) + shake, y: lerp(y0, CURSOR_PATH.hover[1], u), rot: 0, deny: false, color: red, alpha: 1 };
  }
  // access granted: ⊘, red for 3 frames, then grey, falling off the bottom.
  const u = (f - BR.DENIED.from) / (BR.DENIED.to - BR.DENIED.from);
  return { x: CURSOR_PATH.hover[0] + 20, y: CURSOR_PATH.hover[1] + 20 + 1000 * u * u, rot: 23 * u, deny: true, color: d < BR.DENIED.from + 3 ? red : linear('#8B8790'), alpha: 1 };
}
/** The arrow (screen px about its tip, y down, 72 px tall): a plain pointer. */
const ARROW: readonly (readonly [number, number])[] = [[0, 0], [0, 62], [15, 48], [26, 72], [38, 67], [26, 44], [46, 44]];
/** The cursor as screen shapes (engine units about the frame centre): its (6, 6) shadow, a red fill (scan-filled capsules), a 4 px ink outline; or ⊘. */
export function cursorShapes(c: CursorState): Shape[] {
  const out: Shape[] = [];
  const pt = (x: number, y: number, dx = 0): [number, number] => {
    const [rx, ry] = rotate(x, y, c.rot);
    return [c.x + rx + dx, c.y + ry + dx];
  };
  const segE = (a: [number, number], b: [number, number], w: number, color: RGB): Shape => ({ ...seg(a[0], a[1], b[0], b[1], w, color), alpha: c.alpha });
  if (c.deny) {
    for (const [dx, color, w] of [[6, ink, 18], [0, ink, 18], [0, c.color, 9]] as const) {
      const [x, y] = toE(c.x + dx, c.y + dx);
      out.push({ kind: 'ring', x, y, w: 58 + w - 9, h: 58 + w - 9, r: w, rot: 0, color, alpha: c.alpha });
      out.push(segE(pt(-19, 19, dx), pt(19, -19, dx), w, color));
    }
    return out;
  }
  // Fill: horizontal capsules across the polygon every 4 px (in its own frame), then the outline over it.
  const fillRows = (dx: number, color: RGB): void => {
    for (let y = 2; y < 72; y += 4) {
      const xs: number[] = [];
      for (let i = 0; i < ARROW.length; i++) {
        const [x0, y0] = ARROW[i];
        const [x1, y1] = ARROW[(i + 1) % ARROW.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.5) out.push(segE(pt(xs[i] + 1, y, dx), pt(xs[i + 1] - 1, y, dx), 5, color));
    }
  };
  const outline = (dx: number, w: number, color: RGB): void => {
    for (let i = 0; i < ARROW.length; i++) out.push(segE(pt(ARROW[i][0], ARROW[i][1], dx), pt(ARROW[(i + 1) % ARROW.length][0], ARROW[(i + 1) % ARROW.length][1], dx), w, color));
  };
  fillRows(6, ink);
  outline(6, 8, ink);
  fillRows(0, c.color);
  outline(0, 8, ink);
  return out;
}

// ——— The window, v2 (screen px; printed on the film in break 8) —————————————————————————————————————————————————————————————————————

/** The rows the window grows (a 2-frame snap each): [ROOT] (7.4e), the volume (7.4&), the gloat (8.3e). */
const GROWS: readonly number[] = [BR.ROOT_ROW, BR.OVERLOAD_V2, BR.GLOAT];
/** A grown row shows once the box's bottom border has passed it: this much clear (px) between its ink and the border's double line. */
const ROW_CLEAR = 11;
/** The volume: 113 % on full draw, 116 on 8.1 + 3 (so the window is pixel-identical across C8), 119, 122, 125. */
export const volumeV2 = (d: number): number => 113 + 3 * BR.VOLUME_STEPS.filter((at) => at <= d).length;
/**
 * [WARN] blinks 3 on / 3 off from full draw; its phase steps a frame on the cut so 8.1 − 1 and 8.1 match (both off). Integrator round 2
 * (review rev2-taste WARN-BLINK-SILENCE, I-7): it holds OFF from the music's cut (SILENCE.from, the look) to the end, so the film's tremble
 * and his look are the only motion in the dead air (a 10 Hz pink blink competed with ( ・ω・)?); the last frame stays off, as drop 2 reads it.
 */
export const warnOn = (d: number): boolean =>
  d >= BR.OVERLOAD_V2 && d < BR.SILENCE.from && Math.floor((d - BR.OVERLOAD_V2 - (d >= EIGHT ? 1 : 0)) / 3) % 2 === 0;
/** The gloat types 3 characters a frame from the splat. */
export const gloatTyped = (d: number): string => (d < BR.GLOAT ? '' : WINDOW_TEXTS_V2.gloat.slice(0, 3 * (d - BR.GLOAT + 1)));

/**
 * The window at instant f (v2): v04's rows and timing one bar later (the dialog, LOUDER pressed, root, sudo a word per 16th, ONE frame of
 * 150bpm!!, access granted), the dialog's face in the window's text colour (amber is his only), the [ROOT] row, the volume and [WARN] on
 * full draw (pink), the red gloat typed under the bwomp. Discrete changes at the output frame; the motion (pop, flip, slam, growth) on the instant.
 */
export function windowAtV2(f: number): WindowState {
  const d = frameOf(f);
  if (d < BR.DIALOG_V2) return { box: null, rects: [], glyphs: [], lines: [], pressed: false };
  const scale = pop(f - BR.DIALOG_V2 + SWAP_LEAD);
  // Each new row grows the box with a 2-frame snap a frame in on its own frame (≥ 0.8 of a row on it, whole the next: settled long
  // before C8). Review round 1 F7 / GLOAT-ROW-CLIP: with v2's first L (0.17 of a row on its frame) the row typed in under the box's
  // bottom border for two frames; now the box and its row pop together, the row on its own frame, clear of the border (rowFits).
  const grows = GROWS.map((at) => (d >= at ? snap(f - at + 1, 2) : 0));
  const grow = sum(grows);
  const y1 = WIN.y0 + 5 * WIN.row + WIN.row * grow;
  const pressed = d >= BR.LOUDER_V2 && d < BR.LOUDER_V2 + 6;
  const u = clamp((f - BR.ROOT_V2) / 6);
  const flipY = f >= BR.ROOT_V2 && f < BR.ROOT_V2 + 6 ? Math.abs(1 - 2 * ease.inOutCubic(u)) : 1;

  const rects: WinRect[] = [];
  const glyphs: WinGlyph[] = [];
  const lines: string[] = [];
  const row = (text: string, col: number, y: number, color: RGB, alpha = 1, fy = 1, sink = 0): void => {
    for (const c of layoutLines([text])) {
      if (c.ch.trim() === '') continue;
      glyphs.push({ ch: c.ch, x: colX(col + c.col, c.width) + sink, y: WIN_CENTRE[1] + (y + sink - WIN_CENTRE[1]) * fy, size: WIN.size * fy, color, alpha, stretch: 1 / Math.max(fy, 1e-3), rot: 0, atlas: 'mono' });
    }
  };
  const block = (col: number, cols: number, y: number, color: RGB, fy = 1): void => {
    rects.push({ x: colX(col, cols), y: WIN_CENTRE[1] + (y - WIN_CENTRE[1]) * fy, w: cols * WIN.cell, h: (WIN.row - 6) * fy, color, alpha: 1 });
  };

  rects.push({ x: WIN_CENTRE[0], y: (WIN.y0 + y1) / 2, w: WIN.cols * WIN.cell, h: y1 - WIN.y0, color: P.termBg, alpha: 1 });
  const title = WINDOW_TEXTS.title;
  row(`╔═${' '.repeat(lineWidth(title))}${'═'.repeat(WIN.cols - 3 - lineWidth(title))}╗`, 0, rowY(0), TEXT, DIM);
  row(title, 2, rowY(0), P.termGreen);
  const bottomY = rowY(4) + WIN.row * grow;
  for (let r = 1; r <= 3 + GROWS.length; r++) {
    const g = r <= 3 ? 1 : clamp((grow - (r - 4)) * 2);
    if (g <= 0) continue;
    row('║', 0, rowY(r), TEXT, DIM * g, r <= 3 ? flipY : 1);
    row('║', WIN.cols - 1, rowY(r), TEXT, DIM * g, r <= 3 ? flipY : 1);
  }
  row(`╚${'═'.repeat(WIN.cols - 2)}╝`, 0, bottomY, TEXT, DIM);

  if (d < BR.ROOT_V2 + 3) {
    const rest = WINDOW_TEXTS.dialog.slice(DIALOG_FACE.length);
    row(DIALOG_FACE, 2, rowY(1), TEXT, 1, flipY);
    row(rest, 2 + lineWidth(DIALOG_FACE), rowY(1), TEXT, 1, flipY);
    block(12, 6, rowY(3), TEXT, flipY);
    row(WINDOW_TEXTS.ok, 12, rowY(3), P.termBg, 1, flipY);
    const sink = pressed && d < BR.LOUDER_V2 + 2 ? 3 : 0;
    if (pressed) block(30, 10, rowY(3) + sink, P.termPink, flipY);
    row(WINDOW_TEXTS.louder, 30, rowY(3), pressed ? P.termBg : P.termPink, 1, flipY, sink);
    lines.push(WINDOW_TEXTS.dialog, '', `${WINDOW_TEXTS.ok}  ${WINDOW_TEXTS.louder}`);
  } else if (d < BR.GRANTED_V2) {
    row(WINDOW_TEXTS.root, 2, rowY(1), P.termPink, 1, flipY);
    const [prompt, ...words] = WINDOW_TEXTS.sudo;
    const typed = BR.SUDO_V2.filter((at) => at <= d).length;
    const sudo = typed > 0 ? [prompt, ...words.slice(0, typed)].join(' ') : '';
    if (sudo) row(sudo, 2, rowY(2), TEXT, 1, flipY);
    const pw = d >= BR.PASSWORD_V2 ? WINDOW_TEXTS.password + (d === BR.PASSWORD_V2 ? WINDOW_TEXTS.plain : WINDOW_TEXTS.stars) : '';
    if (pw) row(pw, 2, rowY(3), TEXT, 1, flipY);
    const on = typed > 0 && (d - BR.SUDO_V2[0]) % 12 < 6;
    if (on) row(CURSOR, pw ? 2 + lineWidth(pw) : 2 + lineWidth(sudo), rowY(pw ? 3 : 2), TEXT);
    lines.push(WINDOW_TEXTS.root, sudo, pw);
  } else {
    const text = WINDOW_TEXTS.granted;
    const [along, across] = impactSquash(f - BR.GRANTED_V2 + SWAP_LEAD);
    const x0 = WIN_CENTRE[0] - (lineWidth(text) * BIG.cell * along) / 2;
    for (const c of layoutLines([text])) {
      if (c.ch.trim() === '') continue;
      glyphs.push({ ch: c.ch, x: x0 + (c.col + c.width / 2) * BIG.cell * along, y: WIN_CENTRE[1], size: BIG.size * across, color: GREEN_HOT, alpha: 1, stretch: along / across, rot: 0, atlas: 'mono' });
    }
    lines.push(text);
  }
  /** Whether row r (4 …) is inside the grown box: its ink clear of the bottom border's double line. */
  const fits = (r: number): boolean => bottomY - ROW_CLEAR >= rowY(r) + ROW_CLEAR;
  if (d >= BR.ROOT_ROW && fits(4)) {
    // [ROOT] uid=0 (•ω•): the readout's milestone — the tag and his face in his amber, the rest the window's text.
    const a = clamp(grows[0] * 2);
    const [tag, rest] = [WINDOW_TEXTS_V2.rootRow.slice(0, 6), WINDOW_TEXTS_V2.rootRow.slice(6, -5)];
    row(tag, 2, rowY(4), P.termAmber, a);
    row(rest, 2 + lineWidth(tag), rowY(4), TEXT, a);
    row(CORE, 2 + lineWidth(tag) + lineWidth(rest), rowY(4), P.termAmber, a);
    lines.push(WINDOW_TEXTS_V2.rootRow);
  }
  if (d >= BR.OVERLOAD_V2) {
    const v = volumeV2(d);
    const vol = `${GAUGES.volume} ${meter(v)} ${v}%`;
    if (fits(5)) {
      row(vol, 2, rowY(5), P.termPink, clamp(grows[1] * 2));
      lines.push(vol);
    }
    const warn = WINDOW_TEXTS.overload;
    const cell = (WIN.cell * WARN.size) / WIN.size;
    const wy = y1 + WARN.gap + WARN.h / 2;
    const ww = (lineWidth(warn) + 2) * cell;
    if (warnOn(d)) {
      rects.push({ x: WIN.x0 + ww / 2, y: wy, w: ww, h: WARN.h, color: P.termBg, alpha: 1 });
      for (const c of layoutLines([warn])) {
        if (c.ch.trim() === '') continue;
        glyphs.push({ ch: c.ch, x: WIN.x0 + (1 + c.col + c.width / 2) * cell, y: wy, size: WARN.size, color: P.termPink, alpha: 1, stretch: 1, rot: 0, atlas: 'mono' });
      }
      lines.push(warn);
    }
  }
  if (d >= BR.GLOAT && fits(6)) {
    const g = gloatTyped(d);
    row(g, 2, rowY(6), P.red, clamp(grows[2] * 2));
    lines.push(g);
  }
  if (d >= BR.LOUDER_V2 && f - BR.LOUDER_V2 < 12) {
    const t = Math.max(0, f - BR.LOUDER_V2);
    const s = t < 3 ? 1.35 - 0.35 * ease.inOutSine(t / 3) : t < 6 ? 1 : 1 - ease.inCubic((t - 6) / 6);
    if (s > 0.01) glyphs.push({ ch: SPARKLE, x: LOUDER_BUTTON.x, y: LOUDER_BUTTON.bottom, size: 70 * s, color: P.white, alpha: 1, stretch: 1, rot: 45 * clamp(t / 12), atlas: 'hero', outline: 3 / (70 * s), outlineColor: P.ink });
  }
  const c = WIN_CENTRE;
  const at = (x: number, y: number): [number, number] => [c[0] + (x - c[0]) * scale, c[1] + (y - c[1]) * scale];
  for (const r of rects) {
    [r.x, r.y] = at(r.x, r.y);
    r.w *= scale;
    r.h *= scale;
  }
  for (const g of glyphs) {
    [g.x, g.y] = at(g.x, g.y);
    g.size *= scale;
  }
  const [bx0, by0] = at(WIN.x0, WIN.y0);
  const [bx1, by1] = at(WIN.x0 + WIN.cols * WIN.cell, y1);
  return { box: { x0: bx0, y0: by0, x1: bx1, y1: by1 }, rects, glyphs, lines, pressed };
}

// ——— The confetti (world), v2 ——————————————————————————————————————————————————————————————————————————————————————————————————

/** Confetti of break 7 (the open violet top-left of full draw) and break 8 (the corners of the target's view): kind, place, colour; v04's form. */
const CONFETTI7: readonly { kind: 0 | 1 | 2 | 3; x: number; y: number; color: BreakColor }[] = [
  { kind: 0, x: 260, y: 170, color: 'ink' },
  { kind: 1, x: 540, y: 80, color: 'mint' },
  { kind: 2, x: 120, y: 430, color: 'yellow' },
  { kind: 3, x: 720, y: 250, color: 'cream' },
  { kind: 1, x: -150, y: 120, color: 'coral' },
];
const CONFETTI8: readonly { kind: 0 | 1 | 2 | 3; x: number; y: number; color: BreakColor }[] = [
  { kind: 0, x: 230, y: 160, color: 'ink' },
  { kind: 2, x: 1710, y: 900, color: 'yellow' },
  { kind: 1, x: 330, y: 930, color: 'mint' },
  { kind: 3, x: 1760, y: 420, color: 'cream' },
];
/** The confetti at instant f (world shapes, shadows first): drifting (right 0.6 px a frame in break 7, down 0.4 in break 8) and turning 0.5° a frame. */
export function confettiV2(f: number): Shape[] {
  const out: Shape[] = [];
  const shadow: Shape[] = [];
  const list = f < EIGHT ? CONFETTI7 : CONFETTI8;
  const t = f - (f < EIGHT ? ONE : EIGHT);
  const F = CONFETTI_FORM;
  const sh = F.shadow;
  list.forEach((c, i) => {
    const x = c.x + (f < EIGHT ? 0.6 * t : 0);
    const y = c.y + (f < EIGHT ? 0 : 0.4 * t);
    const a = (0.5 * (f - BR.MATCH_CUT) * (i % 2 === 0 ? 1 : -1) * Math.PI) / 180;
    const pt = (uu: number, vv: number): [number, number] => [x + Math.cos(a) * uu - Math.sin(a) * vv, y + Math.sin(a) * uu + Math.cos(a) * vv];
    const color = P[c.color];
    const line = (pts: [number, number][]) => {
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        shadow.push(seg(x0 + sh, y0 + sh, x1 + sh, y1 + sh, F.stroke + 2 * F.border, ink));
        out.push(seg(x0, y0, x1, y1, F.stroke + 2 * F.border, ink));
      }
      for (let j = 1; j < pts.length; j++) {
        const [x0, y0] = pt(...pts[j - 1]);
        const [x1, y1] = pt(...pts[j]);
        out.push(seg(x0, y0, x1, y1, F.stroke, color));
      }
    };
    if (c.kind === 0) {
      const [ex, ey] = toE(x, y);
      shadow.push({ kind: 'ellipse', x: ex + sh, y: ey - sh, w: 2 * F.dot.r, h: 2 * F.dot.r, color: ink });
      out.push({ kind: 'ellipse', x: ex, y: ey, w: 2 * F.dot.r, h: 2 * F.dot.r, color: ink });
    } else if (c.kind === 1) {
      const { half, amp, waves } = F.squiggle;
      line(Array.from({ length: 19 }, (_, j) => [-half + (2 * half * j) / 18, -amp * Math.sin((2 * Math.PI * waves * j) / 18)] as [number, number]));
    } else if (c.kind === 2) {
      const { half, amp, segments } = F.zigzag;
      line(Array.from({ length: segments + 1 }, (_, s) => [-half + (2 * half * s) / segments, s % 2 === 0 ? -amp : amp] as [number, number]));
    } else {
      const [ex, ey] = toE(x, y);
      const rot = rotOf(F.pill.turn) - a;
      shadow.push({ kind: 'rect', x: ex + sh, y: ey - sh, w: F.pill.w, h: F.pill.h, r: F.pill.h / 2, rot, color: ink });
      out.push({ kind: 'rect', x: ex, y: ey, w: F.pill.w, h: F.pill.h, r: F.pill.h / 2, rot, color, outline: F.border, outlineColor: ink });
    }
  });
  return [...shadow, ...out];
}

// ——— Where his ω is (screen), v2 ——————————————————————————————————————————————————————————————————————————————————————————————————

/** His ω's placement point on screen at instant f (v2): the shot camera and the rig's punch. */
export function omegaOnScreenV2(f: number): [number, number] {
  const h = heroPoseV2(f);
  return onScreenV2(f, h.omega[0], h.omega[1]);
}
/** His ω's ink centre on screen at instant f (v2): what the film's apex and its black spot are round about. */
export function omegaInkOnScreenV2(f: number): [number, number] {
  const h = heroPoseV2(f);
  const [x, y] = turnAbout(h.omega[0], h.omega[1] + OMEGA_INK * h.em * h.fy, h.omega[0], h.omega[1], h.tilt);
  return onScreenV2(f, x, y);
}

// ——— Everything as flat content, v2 ——————————————————————————————————————————————————————————————————————————————————————————————

/** Atlas keys, v2: the hero's rounded type (every face of bars 7–8, the copies and links, the cars' riders, the brows, ✧, ?, っ); the system's mono type. */
export const LAUNCH_ATLAS_V2 = {
  hero: [READY, ZOOM, CORE, FRONTAL, FLYING, SQUASHED, LOOKING, GETS_IT_FACE, PAWS, QUESTION, '・≧≦', ...BROWS, SPARKLE],
  mono: ['╔═╗║╚╝', ...Object.values(WINDOW_TEXTS).flat(), ...Object.values(WINDOW_TEXTS_V2), GAUGES.volume, '@0123456789%', CURSOR],
} as const;

/**
 * One frame of the launch v2 for the scene: `back` (behind him: the confetti, the fork and the band while they are behind him, the cars,
 * the copies / links), `front` (his hard shadow, him, his brows, paws, the ✧ glint; the film's mask of him), `top` (over him in break 8
 * until he passes the fork's plane: the band's arms and links, then the fork), all world content seen through `pose`; `window` the
 * screen (the window, the cursor), printed on the screen — and on the film in break 8.
 */
export type LaunchFrameV2 = { cam: BreakCam; pose: Pose; back: FlatContent; front: FlatContent; top: FlatContent; window: FlatContent };

/** The fork's parts as world shapes (shadows first, then fills; knots on top). */
function forkShapes(k: Fork): Shape[] {
  const shadow: Shape[] = [];
  const fill: Shape[] = [];
  const S = FORK_STYLE;
  for (const p of forkParts(k)) {
    if (p.kind === 'knot') {
      const [x, y] = toE(p.x, p.y);
      fill.push({ kind: 'ellipse', x, y, w: 2 * p.r, h: 2 * p.r, color: ink });
      continue;
    }
    const b = p.kind === 'pill' ? pillBlock(p.a, p.b, p.w, p.color) : { x: p.x, y: p.y, w: p.w, h: p.h, r: p.r, rot: 0, color: p.color };
    const [x, y] = toE(b.x, b.y);
    shadow.push({ kind: 'rect', x: x + S.shadow, y: y - S.shadow, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot), color: ink });
    fill.push({ kind: 'rect', x, y, w: b.w, h: b.h, r: b.r, rot: rotOf(b.rot), color: P[b.color], outline: S.outline, outlineColor: ink });
  }
  return [...shadow, ...fill];
}

/** A car of the train as world shapes and its rider (a copy of his face core on the car): an ink pill (as the graph side's) with a stripe in the rider's colour, two cream wheels; squashed and turned about the rider's ω. */
function carContent(c: CarState, L: LaunchLayout): { shapes: Shape[]; glyphs: Glyph[] } {
  const shapes: Shape[] = [];
  const at = (dx: number, dy: number): [number, number] => {
    const [rx, ry] = rotate(dx * c.sx, dy, c.rot);
    return toE(c.x + rx, c.y + ry);
  };
  const rot = rotOf(c.rot);
  const w = 2.4 * c.em * c.sx;
  const h = 0.5 * c.em;
  const [bx, by] = at(0, 0.66 * c.em);
  shapes.push({ kind: 'rect', x: bx + 10, y: by - 10, w, h, r: h / 2, rot, color: ink });
  shapes.push({ kind: 'rect', x: bx, y: by, w, h, r: h / 2, rot, color: ink });
  const [tx, ty] = at(0, 0.62 * c.em);
  shapes.push({ kind: 'rect', x: tx, y: ty, w: w * 0.8, h: 0.1 * c.em, r: 0.05 * c.em, rot, color: P[c.color === 'ink' ? 'yellow' : c.color] });
  for (const s of [-1, 1]) {
    const [wx, wy] = at(s * 0.8 * c.em, 0.92 * c.em);
    shapes.push({ kind: 'ellipse', x: wx, y: wy, w: 0.26 * c.em, h: 0.26 * c.em, color: P.cream, outline: 5, outlineColor: ink });
  }
  const glyphs = aroundEm(CORE, L.advance, c.em, c.sx, c.sx).map(({ ch, o }) => {
    const [gx, gy] = rotate(o, 0, c.rot);
    return glyphOf({ ch, x: c.x + gx, y: c.y + gy, size: c.em, stretch: c.sx, rot: c.rot, dx: 0, dy: 0 }, P[c.color === 'ink' ? 'ink' : c.color], 4, ink);
  });
  return { shapes, glyphs };
}

/** A copy (stack or link, v2) as placed characters: its bracket at (bx, by); its face (and the brows it wears once they landed on him) while core shows. */
function copyCharsV2(c: Copy & { ch: '(' | ')' }, f: number, L: LaunchLayout): PlacedChar[] {
  const size = EM * c.sy * c.scale;
  const rest = aroundEm(CORE, L.advance, size);
  const out: PlacedChar[] = [];
  const face = c.core >= 0.5;
  for (const { ch, o } of rest) {
    if (ch === c.ch && !face) out.push({ ch, x: c.bx, y: c.by, size, stretch: c.sx / c.sy, rot: c.rot, dx: 0, dy: 0 });
    else if (face) out.push({ ch, x: c.x + o * c.sx, y: c.y, size, stretch: c.sx / c.sy, rot: 0, dx: 0, dy: 0 });
  }
  if (face) {
    const eyes = rest.filter((x) => x.ch === '•');
    BR.BROWS_V2.forEach((land, i) => {
      if (frameOf(f) >= land) out.push({ ch: BROWS[i], x: c.x + eyes[i].o * c.sx, y: c.y - BROW_LIFT * size, size, stretch: c.sx / c.sy, rot: 0, dx: 0, dy: 0 });
    });
  }
  return out;
}

/** A polyline (world px) as capsules. */
const polyline = (pts: readonly (readonly [number, number])[], w: number, color: RGB): Shape[] => pts.slice(1).map((p, i) => seg(pts[i][0], pts[i][1], p[0], p[1], w, color));

/**
 * His outline (px) for a glyph `size` px an em: HERO_STYLE's 8 px, but never more than 0.1 em — the hero atlas's SDF reaches 0.15 em
 * (radius 24 at 160 px) and the engine allows 0.75 of it, so a popping ? or brow under ≈ 71 px would fill its whole quad with ink
 * (the dark square the --final still of 8.4& + 2 showed). Every face glyph (≥ 146 px on screen) keeps the full 8 px.
 */
export const heroOutline = (size: number): number => Math.min(HERO_STYLE.outline, 0.1 * size);

/** The whip's streaks (TRAIL) at instant f as world shapes behind him (placed on screen through the shot camera): ink edges, then cream. */
function trailShapes(f: number): Shape[] {
  const k = trailAt(f);
  if (k <= 0.001) return [];
  const c = slingCam(f);
  const t0 = f - BR.WHIP_CUT;
  const edge: Shape[] = [];
  const fill: Shape[] = [];
  for (const t of TRAIL) {
    // The head rushes right; the tail catches up with it on the catch.
    const head = t.x + t.len + TRAIL_SPEED * t0;
    const [ax, ay] = fromScreen(c, head - t.len * k, t.y);
    const [bx, by] = fromScreen(c, head, t.y);
    edge.push(seg(ax, ay, bx, by, (t.w + 12) / c.zoom, ink));
    fill.push(seg(ax, ay, bx, by, t.w / c.zoom, P.cream));
  }
  return [...edge, ...fill];
}

/**
 * The ground streaks' strength on the cut frame (WHIP_CUT, +573, the 32nd after 6.4a; output frame): the graph side's violet strip
 * lands flat, so the streaks come in at this share on the cut and whole from the frame after — the cut's change no bigger than the
 * whip's start on 6.4a (+570) (review round 1 F2's acceptance; 1.0 measured 43.1 against 42.4, 0.5 measures 38.6).
 */
const STREAK_CUT_ALPHA = 0.5;
/** The ground's whip streaks (GROUND_STREAKS) at instant f as world shapes under everything (placed on screen through the shot camera). */
function groundStreakShapes(f: number): Shape[] {
  const k = trailAt(f);
  if (k <= 0.001) return [];
  const c = slingCam(f);
  const t0 = f - BR.WHIP_CUT;
  const fade = frameOf(f) <= BR.WHIP_CUT ? STREAK_CUT_ALPHA : 1;
  const out: Shape[] = [];
  for (const layer of [[2.6, 0.18], [1.6, 0.35], [1, 1]] as const) {
    for (const t of GROUND_STREAKS) {
      if (t.tone === 'ink' && layer[1] < 1) continue;
      const head = t.x + t.len + GROUND_SPEED * t0;
      const [ax, ay] = fromScreen(c, head - t.len * k, t.y);
      const [bx, by] = fromScreen(c, head, t.y);
      out.push({ ...seg(ax, ay, bx, by, (t.w * layer[0]) / c.zoom, STREAK_TONES[t.tone]), alpha: t.a * layer[1] * fade });
    }
  }
  return out;
}
/**
 * The cords on the whip's tail (review round 1 F2: whip-streaked): each a bowed line twanging 2.7 times a frame (16 px on screen,
 * easing to 8 by the catch), so the 64 sub-frames smear it into a whip; straight and taut from the catch.
 */
const CORD_TWANG = { px: 16, rate: 2.7 } as const;
function cordShapes(f: number, c: Cord, i: number): Shape[] {
  if (f >= BR.CATCH) return [seg(c.from[0], c.from[1], c.to[0], c.to[1], c.w, ink)];
  const z = slingCam(f).zoom;
  const u = clamp((f - BR.WHIP_CUT) / (BR.CATCH - BR.WHIP_CUT));
  const A = (CORD_TWANG.px * (1 - 0.5 * u)) / z;
  const len = Math.hypot(c.to[0] - c.from[0], c.to[1] - c.from[1]) || 1;
  const nx = -(c.to[1] - c.from[1]) / len;
  const ny = (c.to[0] - c.from[0]) / len;
  const ph = 2 * Math.PI * CORD_TWANG.rate * (f - BR.WHIP_CUT) + 1.3 * i;
  const pts = Array.from({ length: 11 }, (_, j): [number, number] => {
    const s = j / 10;
    const b = A * Math.sin(Math.PI * s) * Math.sin(ph);
    return [lerp(c.from[0], c.to[0], s) + nx * b, lerp(c.from[1], c.to[1], s) + ny * b];
  });
  return polyline(pts, c.w, ink);
}

/** The ✧ glint on his right fist on the held breath (8.2a → +4.5): v04's, a bar later. */
const fistGlintV2 = (f: number): number => fistGlint(f - (BR.FIST_GLINT_V2 - BR.FIST_GLINT));

/** The launch at instant f (v2), ready to draw. */
export function launchAtV2(f: number, L: LaunchLayout): LaunchFrameV2 {
  const cam = launchCamV2(f);
  const pose = camPose(cam);
  const fork = forkAt(f);
  const behind: Shape[] = [...(f < EIGHT ? groundStreakShapes(f) : []), ...confettiV2(f)];
  const backGlyphs: Glyph[] = [];
  const topOver: Shape[] = [];
  const d = frameOf(f);

  const linkGlyphs = (list: (Copy & { ch: '(' | ')' })[]): Glyph[] => {
    const out: Glyph[] = [];
    for (const c of [...list].reverse()) {
      if (c.scale <= 0.02) continue;
      const fill = P[c.color];
      const line = c.white ? P.white : ink;
      for (const ch of copyCharsV2(c, f, L)) out.push(glyphOf(ch, fill, c.outline, line));
    }
    return out;
  };

  if (f < EIGHT) {
    // Break 7: the fork (behind everything of his), the cords, his speed lines, the cars, the stack / links.
    behind.push(...forkShapes(fork));
    behind.push(...trailShapes(f));
    const cords = slingCords(f);
    if (cords) {
      cords.forEach((c, i) => behind.push(...cordShapes(f, c, i)));
      // A tension pulse: a white streak runs down each cord from the fork to him over 3 frames.
      for (const p of BR.TENSION_V2) {
        const q = f - p;
        if (q < 0 || q >= 3) continue;
        for (const c of cords) {
          const t1 = 1 - q / 3;
          const t0 = Math.max(0, t1 - 0.22);
          const at = (t: number): [number, number] => [lerp(c.exit[0], c.to[0], t), lerp(c.exit[1], c.to[1], t)];
          const [a, b] = [at(t0), at(t1)];
          behind.push(seg(a[0], a[1], b[0], b[1], c.w * 0.5, P.white));
        }
      }
    }
    for (const car of carsAt(f)) {
      const c = carContent(car, L);
      behind.push(...c.shapes);
      backGlyphs.push(...c.glyphs);
    }
    backGlyphs.push(...linkGlyphs(bandAtV2(f)));
  } else {
    // Break 8: before the release the band and the fork are in front of him (he is behind the fork's plane); from the fork pass, behind.
    const bands = band8(f);
    const bandShapes = bands.flatMap((b) => polyline(b.pts, b.w, ink));
    // The tension pulses of the held breath: a white streak down each arm, fork → him, per 32nd.
    if (d < BR.RELEASE) {
      // The hits' pulses are bolder (twice as long, as wide as the arm): the drum's draw-back runs down the band (review round 1 F4).
      for (const p of [...HITS8, ...BR.TENSION_34]) {
        const q = f - p;
        if (q < 0 || q >= 3) continue;
        const hit = HITS8.includes(p);
        for (const b of bands) {
          const [T, Pp] = b.pts;
          const t0 = q / 3;
          const t1 = Math.min(1, t0 + (hit ? 0.3 : 0.15));
          bandShapes.push(seg(lerp(T[0], Pp[0], t0), lerp(T[1], Pp[1], t0), lerp(T[0], Pp[0], t1), lerp(T[1], Pp[1], t1), b.w * (hit ? 1 : 0.55), P.white));
        }
      }
    }
    // The band runs from the fork's tips (in front) back to his fists (he is behind the fork's plane): behind him, the fork over him
    // until he flies through its plane (the fork pass), then behind him too.
    behind.push(...bandShapes);
    backGlyphs.push(...linkGlyphs(bandAtV2(f)));
    if (d < BR.FORK_PASS) topOver.push(...forkShapes(fork));
    else behind.push(...forkShapes(fork));
  }

  // Him: his hard shadow, him, his brows (the shadow under all of it).
  const me: PlacedChar[] = [...heroCharsV2(f, L), ...browsV2(f, L)];
  const [shx, shy] = HERO_STYLE.shadow;
  const hero: Glyph[] = [...me.map((c) => glyphOf(c, ink, heroOutline(c.size), ink, shx, shy)), ...me.map((c) => glyphOf(c, P[HERO_STYLE.fill], heroOutline(c.size), ink))];
  // The ✧ glint on his right fist (break 8's held breath).
  const g = fistGlintV2(f);
  if (g > 0) {
    const fist = heroCharsV2(f, L).filter((c) => c.part === 'arm').at(-1);
    if (fist) {
      const [x, y] = toE(fist.x + 0.18 * fist.size, fist.y - 0.42 * fist.size);
      hero.push({ ch: SPARKLE, x, y, size: 0.4 * fist.size * g, color: scaleRGB(P.white, 1.6), rot: rotOf(30 * (f - BR.FIST_GLINT_V2)), outline: 3 / (0.4 * fist.size * g), outlineColor: ink });
    }
  }

  // The window and the cursor, screen.
  const w = windowAtV2(f);
  const cursor = cursorAt(f);
  const win: FlatContent = {
    under: w.rects.map((r) => {
      const [x, y] = toE(r.x, r.y);
      return { kind: 'rect', x, y, w: r.w, h: r.h, color: r.color, alpha: r.alpha };
    }),
    glyphs: {
      mono: w.glyphs.filter((x) => x.atlas === 'mono').map((x) => winGlyph(x)),
      hero: w.glyphs.filter((x) => x.atlas === 'hero').map((x) => winGlyph(x)),
    },
    over: cursor ? cursorShapes(cursor) : [],
  };

  return {
    cam,
    pose,
    back: { under: behind, glyphs: { hero: backGlyphs }, over: [] },
    front: { under: [], glyphs: { hero }, over: [] },
    top: { under: [], glyphs: {}, over: topOver },
    window: win,
  };
}

// ——— Time, v2 ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Sub-frames, v2 (sheet §6.3): the whip's tail on 64; 32 on the catch and the concertina, on each notch's launch, through full draw, and
 * on break 8 to the gloat; 16 elsewhere and through the silence. Bar 7 keeps v04's 0.35 shutter (R2-01: crisp ink), and so does the film.
 */
export function launchTemporalV2(f: number): Temporal {
  const whip = f < BR.CATCH;
  const fast = within(f, BR.CATCH, BR.CATCH + 12) || BR.NOTCHES.some((n) => within(f, n, n + 9)) || within(f, BR.OVERLOAD_V2, EIGHT - 1) || within(f, EIGHT, BR.LOOK - 7);
  return { samples: whip ? 64 : fast ? 32 : 16, shutter: whip ? WHIP_SHUTTER : LAUNCH_SHUTTER, persistence: 0 };
}
/** The launch's segments, v2: the whip's tail and break 7 [6.4a, 8.1), break 8 [8.1, drop 2) — C8 is a hard cut, so no sub-frame crosses it. */
export const launchSegmentV2 = (f: number): Segment => (f < EIGHT ? { from: BR.WHIP_CUT, to: EIGHT } : { from: EIGHT, to: BR.BREAK_END_V2 });

// ——— The seam: what the v04 exports return from break 8 on (drop 2 reads them on its downbeat − 1) ——————————————————————————————————

/** Whether the v04 exports read v2's state at instant `at`: break 8 on, when the launch is native (v04's instants never reach it). */
const seamV2 = (at: number): boolean => LAUNCH_V2 && at >= EIGHT;
/** v2's LaunchFrame in v04's shape (drop 2's tests read launchAt on the seam): no peg (the fork is the blocks), the links in `back`. */
function launchAtSeam(at: number, L: LaunchLayout): LaunchFrame {
  const v = launchAtV2(at, L);
  return { cam: v.cam, pose: v.pose, blocks: { shapes: [], shear: 0 }, back: v.back, front: v.front, window: v.window };
}
/** The band's line for drop 2 (bandCord's shape): break 8's first band polyline, end to end (the straight line at y 540 from the fork pass). */
function bandCordV2(f: number): { x0: number; y0: number; x1: number; y1: number; w: number } {
  const b = band8(f)[0];
  const e = b.pts[b.pts.length - 1];
  return { x0: b.pts[0][0], y0: b.pts[0][1], x1: e[0], y1: e[1], w: b.w };
}
/** The fork as blocks (blocksAt's shape, for drop 2's region-0 world): its pills (stem, cream prong, yellow prong) and its base when it has one. */
function forkBlocks(f: number): BlockOut[] {
  return forkParts(forkAt(f)).flatMap((p): BlockOut[] => (p.kind === 'pill' ? [pillBlock(p.a, p.b, p.w, p.color)] : p.kind === 'rect' ? [{ color: p.color, x: p.x, y: p.y, w: p.w, h: p.h, r: p.r, rot: 0 }] : []));
}
