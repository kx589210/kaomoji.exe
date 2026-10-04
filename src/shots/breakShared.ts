// The break's shared pure helpers (the part 'break'), from the build sheet (notes/break/break-sheet.md §2, §4.1, §4.2, §4.6, §7).
// Owned by the flat builder; the fall and launch builders import it read-only (a change they need here is a HANDOFF to the flat
// builder). It holds:
//   - BREAK_HEX / BREAK_PALETTE: the break's colours (hex, and linear RGB for the GPU);
//   - the layout ↔ engine conversion (layout px: 1920 × 1080, origin top-left, y down; engine: origin at the centre, y up) and the
//     angle convention (the sheet's degrees are clockwise-positive on screen; engine `rot` is counter-clockwise radians);
//   - the motion vocabulary of §4.1 as pure curves of "frames since the event": L (launchL, softLaunch, bigLaunch), I (impact,
//     impactSquash), S (snap), F (flow), pop, press, and the living hold (breathe);
//   - the break's shot camera of §4.2 (breakCam: zoom, centre, roll and a screen nudge per instant; the stutter's freeze; the hang's
//     sag; the reset under the restart wipe) with toScreen() and the FlatLayer Pose (camPose);
//   - the hero's rest layout (ink centres, H, the slots), his style, and the block layouts of break bars 2 and 5 (bar 6 keeps bar 5's);
//   - BREAK_LOOK, the flat look every part ends in (only HDR highlights bloom: the cream ground must never glow).
// Plain Node imports it (tests): no three / remotion / react imports.
import type { Pose } from '../engine/camera.ts';
import { type RGB, linear } from '../engine/color.ts';
import { clamp, ease, smoothstep } from '../engine/math.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Look } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { FLAT_V2, HANG, STUTTER, STUTTER_END, WIPE_COVER, asBuiltHeld } from '../score/break.ts';
import { partFrame, seedFrame } from '../score/film.ts';
import { FOV, FRONT } from './swiss.ts';

/** The break's bar `bar` (1-based) plus `beat` beats (0-based, may be fractional), as a film frame. */
const brk = (bar: number, beat = 0): number => partFrame('break', bar, beat);

// ——— Palette (§2.1) ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

export const BREAK_HEX = {
  void: '#07060C',
  cream: '#FDF3D8',
  mint: '#5EE6A8',
  violet: '#A78BFA',
  yellow: '#FFD23F',
  coral: '#FF6B6B',
  ink: '#111111',
  amber: '#FFB23E',
  red: '#FF4A1C',
  tick: '#12A150',
  white: '#FFFFFF',
  crack: '#C9F2FF',
  termBg: '#0C0F0E',
  termText: '#D8F5E1',
  termGreen: '#4CF08C',
  termAmber: '#FFB23E',
  termPink: '#FF5FA2',
  galaxyCore: '#FFE2A0',
  galaxyViolet: '#8E6BFF',
  galaxyPink: '#FF6FB5',
  galaxyBlue: '#7FB8FF',
} as const;
export type BreakColor = keyof typeof BREAK_HEX;
/** The break's colours in linear light (`linear(hex)`), for shapes and glyphs. */
export const BREAK_PALETTE: Readonly<Record<BreakColor, RGB>> = Object.fromEntries(
  Object.entries(BREAK_HEX).map(([k, v]) => [k, linear(v)]),
) as Record<BreakColor, RGB>;
/** The four block / copy / confetti colours, in the sheet's usual order. */
export const BLOCK_COLORS = ['yellow', 'violet', 'mint', 'coral'] as const;
export type BlockColor = (typeof BLOCK_COLORS)[number];

// ——— Coordinates (§0 "Coordinates", "Angles") ————————————————————————————————————————————————————————————————————————————————————

/** Layout px (origin top-left, y down) → flat-world engine units (origin at the centre, y up; 1 unit = 1 px at z = 0). */
export const toEngine = (x: number, y: number): [number, number] => [x - 960, 540 - y];
export const fromEngine = (x: number, y: number): [number, number] => [x + 960, 540 - y];
/** The sheet's angle (degrees, clockwise-positive on screen) → engine `rot` (radians, counter-clockwise-positive). */
export const rotOf = (deg: number): number => (-deg * Math.PI) / 180;
/** Rotates the layout vector (x, y) by `deg` clockwise on screen: R(θ) = [[cos, −sin], [sin, cos]] on y-down coordinates. */
export const rotate = (x: number, y: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * x - s * y, s * x + c * y];
};
/** Discrete changes on a drum are taken at the output frame (GUIDE pitfall 3). */
export const frameOf = (f: number): number => Math.floor(f + 0.5);
/**
 * A sub-frame instant pulled toward its output frame by `k`: an element read at tighten(f, k) is exposed with k × the frame's shutter
 * (k 0: one sharp instant per frame). Hard-edged things that move hundreds of px a frame (the restart wipe's panels, the diamond) use it
 * so their ink edges and hard shadows survive the motion blur that the rest of the frame keeps.
 */
export const tighten = (f: number, k: number): number => {
  const o = frameOf(f);
  return o + (f - o) * k;
};

// ——— Motion vocabulary (§4.1). Every curve takes t = frames since its event. ————————————————————————————————————————————————————

/** A damped spring's step response 0 → 1 (ζ, ω in rad/frame), exactly 1 from `settle` (blended in over its last quarter). */
export const spring = (t: number, zeta: number, w: number, settle: number): number => {
  if (t <= 0) return 0;
  if (t >= settle) return 1;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const x = 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  const fade = smoothstep(0.75 * settle, settle, t);
  return x + (1 - x) * fade;
};
/** L, launch: off at full speed on its event, 75 % in 3 frames, ≈ 6 % overshoot, settled by 12. */
export const launchL = (t: number): number => spring(t, 0.67, 0.674, 12);
/** Soft L (ζ 0.75, ≈ 2.8 % overshoot). */
export const softLaunch = (t: number): number => spring(t, 0.75, 0.674, 12);
/** Big L (ζ 0.6, ≈ 9 % overshoot): the fan. */
export const bigLaunch = (t: number): number => spring(t, 0.6, 0.674, 14);

/** I, impact: position progress, cubic in over `lead` frames, exactly 1 on the beat (t = 0) and after. */
export const impact = (t: number, lead: number): number => (t >= 0 ? 1 : t <= -lead ? 0 : (1 + t / lead) ** 3);
/** I's squash on and after the beat: [along the motion, across it], 1.06 / 0.94 on the beat, ringing back to 1 over ≈ 8 f. */
export const impactSquash = (t: number, amount = 0.06): [number, number] => {
  if (t < 0 || t >= 14) return [1, 1];
  const k = amount * Math.exp(-0.45 * t) * Math.cos(0.9 * t) * (1 - smoothstep(9, 14, t));
  return [1 + k, 1 - k];
};
/** S, snap: cubic-out to 104 % over 6 f, then back to 100 % over 2 f. `frames` 2 is the 2-frame snap with no overshoot. */
export const snap = (t: number, frames = 6): number => {
  if (t <= 0) return 0;
  if (frames <= 2) return t >= frames ? 1 : ease.outCubic(t / frames);
  if (t < frames) return 1.04 * ease.outCubic(t / frames);
  if (t < frames + 2) return 1.04 - 0.04 * ease.inOutSine((t - frames) / 2);
  return 1;
};
/** F, flow: sine in-out of a progress u (clamped). */
export const flow = (u: number): number => ease.inOutSine(clamp(u));
/** Pop: a scale 0.6 → 1.05 → 1.0 over 5 f (cubic-out, then sine); 0 (not there yet) before its event. */
export const pop = (t: number): number => {
  if (t < 0) return 0;
  if (t < 3) return 0.6 + 0.45 * ease.outCubic(t / 3);
  if (t < 5) return 1.05 - 0.05 * ease.inOutSine((t - 3) / 2);
  return 1;
};
/** Press (blocks, on a kick): 0 → 1 in 2 f, back to 0 over 8 f (F). Offset (+8, +8)·p; shadow 12 − 8·p. */
export const press = (t: number): number => (t < 0 || t >= 10 ? 0 : t < 2 ? ease.outCubic(t / 2) : 1 - ease.inOutSine((t - 2) / 8));
/** The living hold: a slow ±1 sine over 96 f (blocks breathe ±2° and ±2 % since review round 1, R1-11), phase-shifted by `seed`; on seedFrame, so a moved break breathes exactly as approved. */
export const breathe = (f: number, seed = 0): number => Math.sin((2 * Math.PI * (seedFrame(f) + seed * 17)) / 96);

// ——— The shot camera (§4.2) ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** The camera at an instant: screen = R(roll)·zoom·(p − (cx, cy)) + (960, 540) + (0, dy), layout px; roll in degrees clockwise. */
export type BreakCam = { zoom: number; cx: number; cy: number; roll: number; dy: number };

/** The content time of the flat world: the stutter shows break 3.4's state on each of its four 32nds (STUTTER to STUTTER_END). */
export const flatTime = (f: number): number => (f >= STUTTER[0] && f < STUTTER_END ? STUTTER[0] : f);
/**
 * The flat world's animation clock: flatTime, and the hang — every velocity falls linearly to 0 by break 4.4 + 3 (HANG + 3) and the
 * picture holds there (the clock stops at HANG + 1.5) until the restart wipe has covered the frame (WIPE_COVER), where bar 5's state
 * starts.
 */
export const liveTime = (f: number): number => {
  const t = flatTime(f);
  if (t < HANG || t >= WIPE_COVER) return t;
  const u = Math.min(t - HANG, 3);
  return HANG + u - (u * u) / 6;
};

const bar = (f: number, from: number, a: number, b: number): number => a + (b - a) * flow((f - from) / 96);
/** Cubic Hermite through keys [frame, value, slope per frame]. */
const hermite = (t: number, keys: readonly (readonly [number, number, number])[]): number => {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, v0, m0] = keys[i];
  const [t1, v1, m1] = keys[i + 1];
  const d = t1 - t0;
  const u = clamp((t - t0) / d);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * d * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * d * m1;
};
/**
 * The push of break bars 1–4, one smooth curve whose speed never drops to zero on a downbeat (a per-bar sine would stall the camera at
 * every bar line), easing to rest on the hang: 1.000 on break 1.1 (from a standstill: the break's first frame is drop 1's last) → 1.035
 * on 1.3 — iteration 2's ruling 1, a +3.5 % push into the glass, so the hold after drop 1 reads as the glass letting go, not as a stall —
 * creeping on through the face's fall to 1.043 on 2.1 and 1.05 on 2.3 (the fall's E2 slot reads it), then 1.06 → 1.12 → 1.18 as before.
 * The slopes between the new keys are Fritsch–Carlson's (monotone: the push never backs off); from break 3.1 on the curve is the one
 * bars 3–4 always had.
 */
const PUSH: readonly (readonly [number, number, number])[] = (() => {
  const keys: readonly (readonly [number, number])[] = [[brk(1), 1], [brk(1, 2), 1.035], [brk(2), 1.043], [brk(2, 2), 1.05], [brk(3), 1.06]];
  const d = keys.slice(1).map(([t, v], i) => (v - keys[i][1]) / (t - keys[i][0]));
  const slopes = keys.map((_, i) => (i === 0 ? 0 : i === keys.length - 1 ? (1.12 - 1.04) / 144 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  return [...keys.map(([t, v], i) => [t, v, slopes[i]] as const), [brk(4), 1.12, (1.18 - 1.06) / 168], [HANG, 1.18, 0]];
})();
const pushZoom = (t: number): number => hermite(t, PUSH);
/** A slow sideways drift of the aim from break 2.3 to the hang (±3 px about x 963), so a held face is never framed dead still. */
const DRIFT_FROM = brk(2, 2);
const drift = (t: number): number => (t < DRIFT_FROM ? 0 : 3 * (1 - Math.cos((2 * Math.PI * (Math.min(t, HANG) - DRIFT_FROM)) / 144)));
/**
 * R2-04: break bar 3's camera follows the flying "(" up: its aim rises 90 px (and leans 24 px left) with the climb, break 3.1 → 3.2 (F,
 * from a standstill on the kick, so it never fights the 3.1 punch), holds through the loop's hang and whip, and comes back down with
 * the dive over 3.2& → 3.3 (F), landing exactly on the dizzy slam. The loop then hangs whole in the frame, and his face drops ≈ 95 px.
 */
export const LOOP_TILT = { from: brk(3), top: brk(3, 1), back: brk(3, 1.5), to: brk(3, 2), rise: 90, lean: 24 } as const;
export const loopFollow = (t: number): number => {
  const L = LOOP_TILT;
  if (t <= L.from || t >= L.to) return 0;
  return t < L.back ? flow((t - L.from) / (L.top - L.from)) : 1 - flow((t - L.back) / (L.to - L.back));
};
/** breakCam's keys: its bars, the break 1.4 tilt down, the 2.3 nudge, the dizzy sway (3.3 to 3.4) and its echo (from 3.4&). */
const CAM = {
  tilt: brk(1, 3),
  bar2: brk(2),
  nudge: brk(2, 2),
  bar3: brk(3),
  sway: brk(3, 2),
  swayEnd: brk(3, 3),
  echo: brk(3, 3.5),
  bar4: brk(4),
  bar5: brk(5),
  bar6: brk(6),
} as const;
/**
 * The break's shot camera (punches are the rig's, never here): break bar 1's dolly push 1.000 → 1.035 (1.3) → 1.043 with the aim
 * drifting down to (960, 560) over 1.4; on to 1.05 → 1.06 → 1.12 → 1.18 over bars 2–4 about (960, 560), the break 2.3 nudge (4 px down,
 * one output frame), the dizzy sway and its echo; frozen through the hang while everything sags 20 px; reset under the restart wipe
 * (zoom 1, centre (1000, 540), a ±1 % breath); bar 5's flow 1.00 → 1.08 drifting to (960, 540); bar 6's pull-back 1.60 → 1.10 with a −4°
 * roll.
 */
export function breakCam(at: number): BreakCam {
  // From v04's end (BREAK_END) on, v04's last frame (asBuiltHeld, as a held tail): drop 2 reads it on drop2 1.1 − 1.
  const f = asBuiltHeld(at);
  if (f < CAM.bar2) {
    const cy = 540 + 20 * flow((f - CAM.tilt) / 24);
    return { zoom: pushZoom(f), cx: 960, cy, roll: 0, dy: 0 };
  }
  if (f < CAM.bar3) return { zoom: pushZoom(f), cx: 960 + drift(f), cy: 560, roll: 0, dy: frameOf(f) === CAM.nudge ? 4 : 0 };
  if (f < CAM.bar4) {
    const t = flatTime(f);
    const roll = t >= CAM.sway && t < CAM.swayEnd ? -8 * Math.sin((Math.PI * (t - CAM.sway)) / 24) : t >= CAM.echo ? 3 * Math.sin((Math.PI * (t - CAM.echo)) / 12) : 0;
    const k = loopFollow(t);
    return { zoom: pushZoom(t), cx: 960 + drift(t) - LOOP_TILT.lean * k, cy: 560 - LOOP_TILT.rise * k, roll, dy: 0 };
  }
  if (f < HANG) return { zoom: pushZoom(f), cx: 960 + drift(f), cy: 560, roll: 0, dy: 0 };
  if (f < WIPE_COVER) return { zoom: 1.18, cx: 960 + drift(HANG), cy: 560, roll: 0, dy: 20 * ease.inCubic(clamp((f - HANG) / 12)) };
  if (f < CAM.bar5) return { zoom: 1 + 0.005 * (1 - Math.cos((2 * Math.PI * (f - WIPE_COVER)) / 6)), cx: 1000, cy: 540, roll: 0, dy: 0 };
  if (f < CAM.bar6) return { zoom: bar(f, CAM.bar5, 1, 1.08), cx: 1000 - 40 * ease.outCubic(clamp((f - CAM.bar5) / 24)), cy: 540, roll: 0, dy: 0 };
  const u = flow((f - CAM.bar6) / 96);
  return { zoom: 1.6 - 0.5 * u, cx: 960, cy: 540, roll: -4 * u, dy: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — the interlude's flat bars 2–5 (build sheet notes/bid2/break-sheet2.md §3, §6; the design notes/extend/interlude-final.md
// §3.2–§3.5, §3.10): the travelling camera, three depths. The v04 functions above are the carried-over baseline and stay exactly as
// built (breakCam is also read by the fall, the carried launch and drop 2); the flat scene draws the v2 layers on top when FLAT_V2.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The flat bars' v2 switch (sheet §4.1: "the v2 layers must be switchable"). On: the travelling camera, the depths, the floor and its
 * mess, the antivirus's hand (cursor, marquee, work orders), its POV, the re-voiced monitor, the infected guest, the selection into C6.
 * Off: every frame of break bars 2–5 is v04's, byte for byte (the proof bundles with __KX_FLAT_V04__ = true; nothing else changes).
 * Defined in src/score/break.ts with the other two, so the rig (BREAK_ACCENTS) follows it.
 */
export { FLAT_V2 };

/** The v2 colours (design §7): the floor band, the far blobs' tints, the POV's X-ray ramp. Red #FF4A1C (BREAK_HEX.red) is only the antivirus. */
export const V2_HEX = {
  floor: '#EFE0BC',
  blobYellow: '#FCE7A6',
  blobMint: '#C2F3DC',
  blobViolet: '#DCD1FC',
  xGround: '#22343C',
  xDark: '#3A4D56',
  xLight: '#6E828B',
  xInk: '#D7ECF2',
  xHero: '#E9F6FA',
  // The re-roll's reels (keep-fixer round 1): each spins colours of one lightness (relative luminance, Rec. 709) and never the mint ground.
  reelSky: '#A9DEFF', // 0.679, beside yellow 0.677 and lilac 0.678
  reelLilac: '#DCD1FC', // 0.678
  reelBlue: '#6E96FF', // 0.323, beside violet 0.336 and coral 0.328
  reelIce: '#E4EEFF', // 0.849, beside cream 0.899 and butter 0.870
  reelButter: '#FFF0B8', // 0.870
} as const;
export const V2_PALETTE: Readonly<Record<keyof typeof V2_HEX, RGB>> = Object.fromEntries(Object.entries(V2_HEX).map(([k, v]) => [k, linear(v)])) as Record<keyof typeof V2_HEX, RGB>;

/**
 * A camera key of the v2 flat camera (break-local frames; `ease` how it travels from the value before: F flow, L launch, L6 a 6-frame
 * launch, LD a launch with a drift tail, O an ease-out, IO cubic in-out).
 */
type CamKey = { from: number; to: number; zoom: number; cx: number; cy: number; ease: 'F' | 'L' | 'L6' | 'LD' | 'O' | 'IO' };
/**
 * The v2 camera keys (sheet §6.1; break 2.1 → 6.1): push and track to his left eye; ease back and drift; follow the bracket up; come down
 * onto the floor; the antivirus's POV (×1.08, robotic steps: flatCamV2); wide and low; the pan; the crash zoom into the tofu eye; the
 * pull back; the drift into the hang; the reset under the restart wipe's cover; the pull-out on 5.1's kick; the lateral arc; the size match
 * into C6. Between keys the camera holds (the floor tilts under a still camera, 3.3: the camera never rolls in v2).
 *
 * Keep-fixer round 1 (review rev1-break F11 / SYNC-1, 2026-10-02): bar 3's three moves were sine flows that ran straight into the kicks
 * (3.1 measured 'none' against v04's 'close +1'; 3.3's tilt was buried under the move onto the floor). Now: the ease back from +150 lands
 * by +184 (O: soft start, a long landing), so 3.1's last 8 frames are still; the follow-up launches on the 3.1 kick (LD: 85 % as an L, the
 * rest a drift to the apex); the move down launches on the 3.2& kick and settles by +234 (L6; an 8-frame launch measured 'miss +2' on
 * 3.2&), so +235–239 hold still under the living picture and the floor's −10° tilt on the 3.3 clap is the change on its frame.
 *
 * Keep-fixer round 2 (review rev2-taste LOCK-CLIPPED, 2026-10-02): the push ended on C.x 680, the design's centre on his left eye, and
 * held there through the IRIS LOCK, so the built and liked (>ω<) lost its right eye "<" off the right edge from +142 to about +152 (its ink,
 * outline and hard shadow span world x 499–1435; at Z 1.30 × the rig's 2.44 % LOCK punch that is screen x 719–1965). The push now ends on
 * C.x 790 (PUSH_EYE_X): still a push and track toward the eye (eye.L lands left of centre, at screen x ≈ 746, and the shard still flies
 * home to its slot's live place), and the whole lock sits in frame from its first frame with a 5 % margin at the punch's peak (screen
 * x ≈ 573–1819). Same zoom, same keys, same timing; the ease back from +150 starts 110 px nearer its target. FLAT_V2 only.
 */
/** Where the push to the eye ends (world x, Z 1.30, from +140): the nearest the eye can be framed with the whole (>ω<) in frame. */
export const PUSH_EYE_X = 790;
export const FLAT_CAM_V2: readonly CamKey[] = [
  { from: brk(2), to: brk(2) + 44, zoom: 1.3, cx: PUSH_EYE_X, cy: 510, ease: 'F' },
  { from: brk(2) + 54, to: brk(2) + 88, zoom: 1.12, cx: 1000, cy: 560, ease: 'O' },
  { from: brk(3), to: brk(3, 1), zoom: 1.15, cx: 760, cy: 380, ease: 'LD' },
  { from: brk(3, 1.5), to: brk(3, 1.5) + 6, zoom: 1.18, cx: 960, cy: 600, ease: 'L6' },
  { from: brk(4), to: brk(4) + 12, zoom: 0.9, cx: 1150, cy: 640, ease: 'L' },
  { from: brk(4) + 12, to: brk(4, 1.5), zoom: 0.9, cx: 1050, cy: 640, ease: 'F' },
  { from: brk(4, 1.5), to: brk(4, 1.75), zoom: 1.65, cx: 1290, cy: 560, ease: 'L6' },
  { from: brk(4, 2), to: brk(4, 2.5), zoom: 1.15, cx: 980, cy: 570, ease: 'L' },
  { from: brk(4, 2.5), to: HANG, zoom: 1.17, cx: 994, cy: 566, ease: 'F' },
  { from: brk(5), to: brk(5, 0.5), zoom: 1, cx: 960, cy: 540, ease: 'L' },
  // The lateral arc (ruling R-F2): out to the left under the blink and the fan, back on 5.3's kick, so the built frame of 5.3–5.4 (the cat
  // at the right edge, the dancer at the left, (*≧ω≦*) 1650 px wide) stays whole; the design's arc to 905 at Z 1.08 cropped them.
  { from: brk(5, 0.5), to: brk(5, 1.5), zoom: 1.04, cx: 905, cy: 540, ease: 'F' },
  { from: brk(5, 1.5), to: brk(5, 2), zoom: 1.04, cx: 960, cy: 540, ease: 'F' },
  { from: brk(5, 2), to: brk(5, 3.5), zoom: 1.06, cx: 960, cy: 540, ease: 'F' },
  { from: brk(5, 3.5), to: brk(5, 3.5) + 8, zoom: 0.85, cx: 960, cy: 540, ease: 'IO' },
];
/** The reset under the restart wipe's cover (v2: tight, so 5.1's pull-out has somewhere to pull from). */
export const RESET_V2 = { zoom: 1.45, cx: 980, cy: 540 } as const;
const camEase = (k: CamKey, t: number): number => {
  const u = (t - k.from) / (k.to - k.from);
  if (k.ease === 'L') return launchL(t - k.from);
  if (k.ease === 'L6') return launchL(2 * (t - k.from));
  // LD: 85 % of the move as an L launched on the key's frame, the last 15 % a flow to `to` (the camera keeps drifting: a living hold).
  if (k.ease === 'LD') return 0.85 * launchL(t - k.from) + 0.15 * flow(u);
  if (k.ease === 'O') {
    // 1 − (1 − u)³(1 + 3u): starts at rest, peaks a third of the way in, lands with its speed falling as (1 − u)².
    const v = clamp(u);
    return 1 - (1 - v) ** 3 * (1 + 3 * v);
  }
  if (k.ease === 'IO') return ease.inOutCubic(clamp(u));
  return flow(u);
};
/** The v2 key camera (no POV, no hang, no reset) at instant t, from break 2.1 (where it takes over breakCam's push exactly). */
function keyCam(t: number): { zoom: number; cx: number; cy: number } {
  const v0 = breakCam(brk(2));
  let v = { zoom: v0.zoom, cx: v0.cx, cy: v0.cy };
  // Each key starts from where the one before it ended (a launch's `to` is where its spring has settled); 5.1 starts from the reset.
  for (const k of FLAT_CAM_V2) {
    if (t < k.from) break;
    if (k.from === brk(5)) v = { ...RESET_V2 };
    const e = camEase(k, t);
    v = { zoom: v.zoom + (k.zoom - v.zoom) * e, cx: v.cx + (k.cx - v.cx) * e, cy: v.cy + (k.cy - v.cy) * e };
    if (t < k.to) break;
  }
  return v;
}
/** The antivirus's POV (break 3.3& → 3.4&, sheet §3): the camera's ×1.08, centred on what its reticle aims at, in robotic 2-frame snaps every 6 frames, frozen with the content through the stutter. */
export const POV_V2 = { from: brk(3, 2.5), to: brk(3, 3.5), zoom: 1.08, steps: [brk(3, 2.5), brk(3, 2.75), brk(3, 3)] } as const;
/** The POV's aim targets (world layout px, his slot places): the ω, the flipped "(", eye.L — the reticle's three locks. */
export const POV_AIMS: readonly (readonly [number, number])[] = [
  [957, 597],
  [397, 582],
  [625, 582],
];
/** How far each robotic step moves the aim toward its target (the base aim is the floor framing, (960, 600)). */
const POV_PULL = 0.12;
function povCam(t: number): { zoom: number; cx: number; cy: number } {
  const base = keyCam(POV_V2.from);
  const w = POV_AIMS[0];
  // ×1.08 about the ω, so on the scan-wipe his ω holds the same pixel (C2: 0 px), locking in under the scanline's sweep (3 f, cubic out).
  const z = base.zoom * (1 + (POV_V2.zoom - 1) * ease.outCubic(clamp((t - POV_V2.from) / 3)));
  const k = base.zoom / z;
  let cx = w[0] - k * (w[0] - base.cx);
  let cy = w[1] - k * (w[1] - base.cy);
  const tt = t >= STUTTER[0] ? STUTTER[0] : t;
  POV_V2.steps.forEach((s, i) => {
    if (i === 0 || tt < s) return;
    const e = ease.outCubic(clamp((tt - s) / 2));
    const [ax, ay] = POV_AIMS[i];
    const [px, py] = POV_AIMS[i - 1];
    cx += POV_PULL * (ax - px) * e;
    cy += POV_PULL * (ay - py) * e;
  });
  return { zoom: z, cx, cy };
}
/**
 * The v2 flat camera (break 2.1 → 6.1, sheet §6.1; roll always 0): the keys above; the as-built one-frame 4 px nudge on 2.3; the POV;
 * the hang (frozen where the drift left it, sagging 20 px with the picture, as built); the reset under the restart wipe's cover with the
 * as-built ±1 % breath. Equal to breakCam on break 2.1, so the fall hands over without a step.
 */
export function flatCamV2(f: number): BreakCam {
  if (f < brk(2)) return breakCam(f);
  if (f >= POV_V2.from && f < POV_V2.to) return { ...povCam(f), roll: 0, dy: 0 };
  if (f >= HANG && f < WIPE_COVER) {
    const h = keyCam(HANG);
    return { ...h, roll: 0, dy: 20 * ease.inCubic(clamp((f - HANG) / 12)) };
  }
  if (f >= WIPE_COVER && f < brk(5)) return { zoom: RESET_V2.zoom * (1 + 0.005 * (1 - Math.cos((2 * Math.PI * (f - WIPE_COVER)) / 6))), cx: RESET_V2.cx, cy: RESET_V2.cy, roll: 0, dy: 0 };
  const k = keyCam(f);
  return { ...k, roll: 0, dy: frameOf(f) === CAM.nudge ? 4 : 0 };
}
/** The flat bars' shot camera as drawn: v2's when `v2`, else v04's breakCam (the identity layer). */
export const flatCam = (f: number, v2: boolean = FLAT_V2): BreakCam => (v2 ? flatCamV2(f) : breakCam(f));

/** The depths (sheet §6.5; engine z, toward the lens positive): the far blobs at the back, the confetti at the front. */
export const DEPTH = { back: -900, mid: 0, front: 600 } as const;
/** The scale at which a camera of zoom `zoom` (at FRONT / zoom from the world plane) shows a plane at depth z: ≈ 0.77× at −900, 1.24× at +600 (zoom 1). */
export const depthZoom = (zoom: number, z: number): number => FRONT / (FRONT / zoom - z);
/**
 * A point q (layout px) of the plane at depth z, moved onto the world plane (z = 0) so camera c shows it in the same place: c's aim plus
 * (q − aim) × depthZoom / zoom. Items of the front depth are drawn on the world plane this way (one pass, exact parallax: the camera only
 * dollies and tracks, never turns, so every plane maps affinely); `s` is the size factor that goes with it.
 */
export const fromDepth = (c: BreakCam, z: number, x: number, y: number): { x: number; y: number; s: number } => {
  const s = depthZoom(c.zoom, z) / c.zoom;
  return { x: c.cx + (x - c.cx) * s, y: c.cy + (y - c.cy) * s, s };
};

/** Where layout point (x, y) of the world lands on screen (layout px) under camera `c`. */
export const toScreen = (c: BreakCam, x: number, y: number): [number, number] => {
  const [rx, ry] = rotate(c.zoom * (x - c.cx), c.zoom * (y - c.cy), c.roll);
  return [rx + 960, ry + 540 + c.dy];
};
/** The world point (layout px) that camera `c` shows at screen point (sx, sy): the inverse of toScreen. */
export const fromScreen = (c: BreakCam, sx: number, sy: number): [number, number] => {
  const [x, y] = rotate(sx - 960, sy - 540 - c.dy, -c.roll);
  return [x / c.zoom + c.cx, y / c.zoom + c.cy];
};
/** The FlatLayer pose of camera `c` (the flat world on z = 0, FOV 20, frame-filling at FRONT): identical to toScreen at z = 0. */
export const camPose = (c: BreakCam): Pose => {
  const r = rotOf(c.roll);
  // The screen nudge dy, moved into the world: the target shifts by R(−roll)·(0, dy)/zoom (in y-up engine units).
  const [nx, ny] = rotate(0, c.dy / c.zoom, -c.roll);
  const [ax, ay] = toEngine(c.cx - nx, c.cy - ny);
  return aimPose({ zoom: c.zoom, x: ax, y: ay, roll: r }, FRONT, FOV);
};
export { FOV, FRONT };

// ——— Layout px → the flat engine's shapes and glyphs ————————————————————————————————————————————————————————————————————————————

/** A shape placed in layout px (centre (x, y), y down, `rot` degrees clockwise), as the FlatLayer's engine Shape. */
export const lShape = (s: Omit<Shape, 'x' | 'y' | 'rot'> & { x: number; y: number; rot?: number }): Shape => {
  const [x, y] = toEngine(s.x, s.y);
  return { ...s, x, y, rot: rotOf(s.rot ?? 0) };
};
/** A capsule from (x0, y0) to (x1, y1) (layout px), `width` thick; null when it has no length. */
export const lSegment = (x0: number, y0: number, x1: number, y1: number, width: number, color: RGB, alpha = 1): Shape | null => {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1e-6 && width <= 0) return null;
  const [cx, cy] = toEngine((x0 + x1) / 2, (y0 + y1) / 2);
  return { kind: 'segment', x: cx, y: cy, w: len + width, h: width, rot: Math.atan2(-(y1 - y0), x1 - x0), color, alpha };
};
/** A glyph placed in layout px (its placement point: the advance box's centre, text-middle), `rot` degrees clockwise. */
export const lGlyph = (g: Omit<Glyph, 'x' | 'y' | 'rot'> & { x: number; y: number; rot?: number }): Glyph => {
  const [x, y] = toEngine(g.x, g.y);
  return { ...g, x, y, rot: rotOf(g.rot ?? 0) };
};

// ——— The hero (§2.4, §4.5) ————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His rest layout on drop 1's last frame (em 360, stretch 1.3, em-box centre (960, 540)): the ink centres of "(", ×L, ω, ×R, ")". */
export const HERO_REST = {
  open: [397, 562],
  eyeL: [625, 562],
  mouth: [957, 577],
  eyeR: [1290, 562],
  close: [1522, 562],
} as const satisfies Record<string, readonly [number, number]>;
export type HeroPart = keyof typeof HERO_REST;
/** The slot centre: his em-box centre 20 px below the glass's (break bars 2–4). */
export const H: readonly [number, number] = [960, 560];
/** Each part's slot (break bars 2–4): its rest ink centre 20 px lower. */
export const HERO_SLOTS: Readonly<Record<HeroPart, readonly [number, number]>> = Object.fromEntries(
  Object.entries(HERO_REST).map(([k, [x, y]]) => [k, [x, y + 20]]),
) as unknown as Record<HeroPart, readonly [number, number]>;
/** His type and size: M PLUS Rounded ExtraBold, em 360 stretched 1.3 wide (break bars 1–4), em 414 from break 5.1 (stretch 1.3 → 1.0 by 5.1&). */
export const HERO_EM = 360;
export const HERO_EM_WHOLE = 414;
export const HERO_STRETCH = 1.3;
/** Measured advances (ems) of M PLUS Rounded 1c ExtraBold (ง and ✧ from their fallbacks). */
export const HERO_ADVANCE = { '(': 0.412, ')': 0.412, '•': 0.526, ω: 0.822, '×': 0.595, ง: 0.519, '✧': 0.87, '⌒': 1, ﾉ: 0.5, '・': 1 } as const;
/** His look once flat: amber fill, an 8 px ink outline, a (14, 14) ink hard shadow. Fragments' seam lines are 4 px ink. */
export const HERO_STYLE = { fill: 'amber', outline: 8, shadow: [14, 14], seam: 4 } as const;

// ——— The world's blocks (§4.6) ————————————————————————————————————————————————————————————————————————————————————————————————————

/** A block: centre (x, y), size w × h, corner radius r (a pill when r = h / 2), rotation in degrees clockwise. Layout px. */
export type Block = { x: number; y: number; w: number; h: number; r: number; rot: number };
/** Break bar 2's four blocks, which the landed polygons pool into (from break 2.2, 20 frames); 6 px ink outline, (12, 12) hard shadow. */
export const BAR22_BLOCKS: Readonly<Record<BlockColor, Block>> = {
  yellow: { x: 180, y: 70, w: 700, h: 220, r: 110, rot: -8 },
  violet: { x: 1760, y: 200, w: 300, h: 520, r: 56, rot: 10 },
  coral: { x: 250, y: 1010, w: 620, h: 300, r: 64, rot: -6 },
  mint: { x: 1650, y: 960, w: 420, h: 420, r: 56, rot: 12 },
};
/** Break bar 5's clean relayout on the 12-column grid (bar 6 keeps these places; there the violet block is cream). */
export const BAR25_BLOCKS: Readonly<Record<BlockColor, Block>> = {
  yellow: { x: 300, y: 220, w: 400, h: 140, r: 70, rot: 0 },
  violet: { x: 1710, y: 340, w: 300, h: 440, r: 48, rot: 0 },
  coral: { x: 440, y: 990, w: 640, h: 220, r: 40, rot: 0 },
  mint: { x: 1580, y: 960, w: 360, h: 320, r: 48, rot: 0 },
};
/** The four confetti (Memphis accents, (6, 6) shadows) and the cells they come from: break bar 2's places and bar 5's re-pops. */
export const CONFETTI = [
  { kind: 'dot', color: 'ink', cell: 18, at: [640, 90], at25: [640, 110] },
  { kind: 'squiggle', color: 'mint', cell: 42, at: [1300, 110], at25: [1260, 140] },
  { kind: 'zigzag', color: 'yellow', cell: 19, at: [1240, 1010], at25: [1180, 1020] },
  { kind: 'pill', color: 'violet', cell: 17, at: [700, 1015], at25: [860, 1030] },
] as const;
export const BAR25_CONFETTI: readonly (readonly [number, number])[] = CONFETTI.map((c) => c.at25);
/**
 * The confetti's one form (layout px, §4.6), so break bars 2–5 (breakWorld's SDF shapes) and bar 6 (breakLaunch's shapes) draw them alike:
 * an ink dot; a squiggle of 3 waves and a zigzag of 4 segments, each a colour line `stroke` wide inside a `border` of ink each side
 * (the zigzag 130 px long, the squiggle 150 px; both start upward from their left end); a 120 × 44 mini-pill turned +30° with the same
 * ink border; (6, 6) hard shadows.
 */
export const CONFETTI_FORM = {
  dot: { r: 20 },
  squiggle: { half: 75, amp: 12, waves: 3 },
  zigzag: { half: 65, amp: 16, segments: 4 },
  pill: { w: 120, h: 44, turn: 30 },
  stroke: 12,
  border: 4,
  shadow: 6,
} as const;
/** Blocks: 6 px ink outline, (12, 12) ink hard shadow. */
export const BLOCK_STYLE = { outline: 6, shadow: 12 } as const;

// ——— The look (§7.1) ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The flat break look: linear, exposure 1, only HDR highlights bloom (glints, stars, `access granted`), faint grain and vignette. */
export const BREAK_LOOK: Look = {
  toneMapping: 'linear',
  exposure: 1,
  bloom: { intensity: 0.35, threshold: 1.0, smoothing: 0.1, radius: 0.7 },
  aberration: 0,
  grain: 0.03,
  vignette: 0.06,
};
