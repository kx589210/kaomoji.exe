// The ending's aperture, outro 1.1–end − 1 (builder O · OUTRO; build sheet notes/d2build/sheet.md §5.13, §9 H6): what of the picture the
// screen still shows. Until Enter, the whole log picture; on Enter the CRT squeezes it to a line about y 540 (an impact into LINE),
// brightening toward white-hot; the line shrinks 1920 → 1500 px and dips into a wide, flat ω — his mouth (E12); on outro 2.1 the line is
// pried open from inside into a lens (a vesica: two circular arcs), its lower lid starting as the ω and relaxing into its arc — the
// mouth becomes an eye; the lens breathes, and a bright chase runs once round its rim on outro 2.3&. One pure function of the frame, so the
// two parts that draw it (OutroLog until outro 2.1 − 1, OutroLens from outro 2.1) share it and hand over without a seam; the GPU pass
// (src/scenes/outroScreen.ts) evaluates the same curves from OUTRO_SCREEN_GLSL. Layout px: 1920 × 1080, origin top-left, y down.
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { SWAP_LEAD, struck } from '../engine/temporal.ts';
import { CHASE, DIP, ENTER, LINE, OPEN, OUTRO_END, RELEASE, SHRINK, SQUEEZE, TICKS } from '../score/outroV04.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { springL } from './drop2Shared.ts';

/** How deep the line dips into his ω (px), and the half-width of the ω: it is his mouth, in the middle of the line (R-O1). */
export const OMEGA_DEPTH = 56;
export const OMEGA_HALF = 300;
/** Where the ω's middle cusp sits, as a share of its depth. */
const OMEGA_CUSP = 0.3;
/** The lens, settled: 1640 × 440, centred (960, 540); its height breathes ±12 px once a beat (R1-bar36-quiet: ±6 read as a still). */
export const LENS = { w: 1640, h: 440, cx: 960, cy: 540, breath: 12 } as const;
/** The lens floats ±8 px (down +) over two beats, its turns where the breath is fastest (OPEN + 12 + 24k), so wherever the breath
 *  turns the whole rim is still moving (R1-bar36-quiet: the breath's turns measured as dead frames). Rim and picture float together. */
export const LENS_FLOAT = { amount: 8, period: 2 * FRAMES_PER_BEAT } as const;
/** outro bar 2's push about (960, 540): 1.00 → 1.05 (R1-bar36-quiet: 1.03 was too small to read). */
export const LENS_PUSH = 0.05;
/** The push's launch: its speed ramps up over the first quarter of the bar, then cruises to the last frame (never an ease-out stall). */
const PUSH_LAUNCH = 0.25;
const cruise = (t: number): number => {
  const u = clamp(t);
  return (u < PUSH_LAUNCH ? (u * u) / (2 * PUSH_LAUNCH) : u - PUSH_LAUNCH / 2) / (1 - PUSH_LAUNCH / 2);
};
/**
 * The film's last sound, seen (R-OUT-BUTTON): the mix stops dead on outro 2.3& and S01's tick lands alone on outro 2.4; with it the rim flares
 * +45 % — up over the frame before (whole on the tick's own frame), then dying away with τ 2 f, gone in ≈ 6 f. Only the rim: the
 * lens's look does not swell with it (a bloom swell lifted the black round the lens to a grey wash).
 */
export const TICK_PULSE = { gain: 0.45, attack: 1, tau: 2 } as const;
const LAST_TICK = TICKS[TICKS.length - 1];
export function tickPulse(f: number): number {
  const t = f - (LAST_TICK - TICK_PULSE.attack);
  if (t <= 0) return 0;
  return t < TICK_PULSE.attack ? Math.sin((Math.PI / 2) * (t / TICK_PULSE.attack)) : Math.exp(-(t - TICK_PULSE.attack) / TICK_PULSE.tau);
}

/**
 * The button, seen (round 2: OUT-BUTTON-UNSEEN, SYNC2-02). On outro 2.3& the whole mix chokes over a 32nd (outro 2.3&–2.3& + 3) and stays digitally
 * silent to outro 2.4 − 1; S01's tick alone breaks the silence on outro 2.4. The picture stops with the sound and starts with the tick:
 * - outro 2.3& (struck, so every sub-frame of outro 2.3& shows it): a shutter click, the lens's height × 0.94 for two output frames, then back;
 * - the rim dims to 40 % over the choke (most of the way on outro 2.3& itself), and the chase's head enters bright on outro 2.3& and runs round the
 *   dim rim, the only thing that moves;
 * - the lens's breath, float and push hold still from outro 2.3& to 2.4 − 1 (`lensClock`; outroLens.ts holds his breath, his rise and the ✧'s
 *   spin on the same clock, and drops the ✧'s twinkle on outro 2.3&);
 * - outro 2.4: the tick relights the rim, back to full with the +45 % TICK_PULSE on top (the same attack, up over outro 2.4 − 1), and the clock runs
 *   on from where it stopped.
 * Off, chase, on — as you hear stop, silence, tick. The look (bloom) does not change (E6). (The review asked for ≈ 55 %; the rim's 2 px
 * core is overdriven, so 55 % only thinned its glow — measured −25 % of the light across the lid — and the line stayed white; at 40 %
 * the line itself greys and the relight on the tick reads as on.)
 */
export const BUTTON = { from: RELEASE, to: LAST_TICK, click: 0.94, clickFrames: 2, dim: 0.6 } as const;
const HOLD = { from: BUTTON.from - SWAP_LEAD, to: BUTTON.to - SWAP_LEAD } as const;
/** The lens's own time: the frame, held still over the button's silence (from outro 2.3&'s shutter to outro 2.4's), then running on 12 behind. */
export const lensClock = (f: number): number => f - clamp(f - HOLD.from, 0, HOLD.to - HOLD.from);
/** How far the rim is dimmed for the silence (0–1): 70 % → 100 % over the choke's 32nd from outro 2.3&'s shutter, relit with the tick. */
export function buttonDim(f: number): number {
  if (!struck(BUTTON.from, f)) return 0;
  const choke = 0.7 + 0.3 * ease.outCubic(clamp((f - HOLD.from) / 3));
  const t = f - (LAST_TICK - TICK_PULSE.attack);
  const relit = t <= 0 ? 0 : t < TICK_PULSE.attack ? Math.sin((Math.PI / 2) * (t / TICK_PULSE.attack)) : 1;
  return choke * (1 - relit);
}
/**
 * The chase's spark (the compositor draws it): its head adds `gain` × the full rim's light on top of whatever the rim is, so over
 * the silence (rim 40 %) the head burns at +80 % of the full rim, ≈ 4.5× the dim ring it runs round; a Gaussian head of `sigma` px and
 * a short tail at half strength, falling off over `tail` px behind it (cut at 5 × that), with a soft glow of its own (`glow` of the
 * rim's mint, `glowPx` wide). It starts at `start` of the way round from the left tip — the top of the lid, right above his face, so
 * the stop frame shows it where the eye is — runs clockwise at an even speed, passes under the cursor on the outro 2.4 tick, and is home
 * at the top by outro 2.4& − 1. (Scaling the rim's own light, as before, left the head no brighter than the full rim it replaced, and it
 * entered at the far-left tip: a faint glint.)
 */
export const CHASE_SPARK = { gain: 1.8 - (1 - BUTTON.dim), sigma: 24, tail: 120, glow: 0.3, glowPx: 16, start: 0.25 } as const;
/** The push runs on the lens's clock: it reaches its 1.05 on the last frame all the same. */
const PUSH_SPAN = FRAMES_PER_BAR - (BUTTON.to - BUTTON.from);
/**
 * The line's light (iteration 3: a beat for the line, a beat for the ω). It lands white-hot on LINE — the beam's whole energy in one
 * line — and cools toward the lens rim's light (1) with τ 10 f as its whine decays, ≈ 1.2 by outro 1.4; the ω's snap on outro 1.4 flares it
 * (+0.4, keyed SWAP_LEAD early like the dip, τ 4 f); from outro 1.4& it builds again, +0.03 a frame, with the inhale and the reversed
 * cymbal into the pry-open (≈ 1.38 by outro 2.1, a small step to the lens's rim). Every frame of the hold changes by ≥ 0.01: never a
 * still (the swell starts on its frame, not a quarter early, so the frame before it is still cooling).
 */
const LINE_GLOW = { hot: 2.2, cool: 1, tau: 10, flare: 0.4, flareTau: 4, swellFrom: DIP.from + FRAMES_PER_BEAT / 2, swell: 0.03 } as const;
function lineRim(f: number): number {
  const cool = LINE_GLOW.cool + (LINE_GLOW.hot - LINE_GLOW.cool) * Math.exp(-(f - LINE) / LINE_GLOW.tau);
  const d = f - (DIP.from - SWAP_LEAD);
  const flare = d <= 0 ? 0 : LINE_GLOW.flare * (d < 1 ? d : Math.exp(-(d - 1) / LINE_GLOW.flareTau));
  return cool + flare + LINE_GLOW.swell * Math.max(0, f - LINE_GLOW.swellFrom);
}
/**
 * The held line floats (iteration 3: two beats of line and ω measured 8 dead frames, at the ends of the holds, where its light changes
 * least): ±`amount` px about y 540 (down +), one sine every `period` frames from LINE — it sags first after the slam and is level again
 * on outro 2.1, where the lens's own float starts from 0 — so it moves fastest on outro 1.4 − 4, 1.4& − 2 and 2.1, the frames the light leaves still.
 */
export const LINE_FLOAT = { amount: 4, period: 28 } as const;
/** The line's widths: full width on LINE, 1500 px when it is pried open. */
const LINE_W = { from: 1920, to: 1500 } as const;

/**
 * What the screen shows at an instant. `picture`: the log picture, squeezed vertically about y 540 to `sy` of its height, its colour
 * × `gain` plus `white` (white-hot). `lens`: the picture inside a vesica `w` × `h` (h 0 is a line), each lid dipped into the ω by
 * `dipU` / `dipL` px, the whole aperture scaled by `zoom` about (960, 540), then moved down by `lift` px (its float); `chase` is
 * the rim's bright chase, 0–1 once round, −1 off; `rim` scales the rim's glow.
 */
export type ScreenState = {
  mode: 'picture' | 'lens';
  sy: number;
  gain: number;
  white: number;
  edge: number;
  w: number;
  h: number;
  dipU: number;
  dipL: number;
  zoom: number;
  lift: number;
  chase: number;
  rim: number;
};

/**
 * The ω's centreline as a depth profile, 0 at the line, 1 at the bottom of its bowls, over s ∈ [−1, 1] across the ω (OMEGA_HALF each way): two
 * round bowls meeting in a pointed cusp raised to OMEGA_CUSP in the middle, each flaring smoothly back into the line at its outer end.
 * Its slope is continuous everywhere but at the cusp (where it is symmetric), so the rim's slope-corrected distance never seams. 0 beyond.
 */
export function omega(s: number): number {
  const t = Math.abs(s);
  if (t >= 1) return 0;
  if (t < 0.5) return OMEGA_CUSP + (1 - OMEGA_CUSP) * Math.sin(Math.PI * t);
  return 0.5 + 0.5 * Math.cos(2 * Math.PI * (t - 0.5));
}

/** The same profile in GLSL (the compositor's lids), kept beside the JS so the two cannot drift. */
export const OMEGA_GLSL = /* glsl */ `
float omegaDepth(float s) {
  float t = abs(s);
  if (t >= 1.0) return 0.0;
  if (t < 0.5) return ${OMEGA_CUSP.toFixed(2)} + ${(1 - OMEGA_CUSP).toFixed(2)} * sin(3.14159265 * t);
  return 0.5 + 0.5 * cos(6.28318531 * (t - 0.5));
}`;

/** The squeeze on Enter: the picture's height scale, cubic-in so it lands on LINE as an impact (1 → 0.004). */
const squeezeU = (f: number): number => clamp((f - SQUEEZE.from) / (SQUEEZE.to - SQUEEZE.from));

/** The aperture at instant `f` (fractional; any frame of the ending). */
export function screenAt(f: number): ScreenState {
  const none = { w: 1920, h: 1080, dipU: 0, dipL: 0, zoom: 1, lift: 0, chase: -1, rim: 1 };
  if (f < ENTER) return { mode: 'picture', sy: 1, gain: 1, white: 0, edge: 0, ...none };
  if (f < LINE) {
    const u = squeezeU(f);
    const sy = 1 - 0.996 * u * u * u;
    // The picture brightens as it closes; only the last, thin band burns white (a uniform white earlier is a grey wash).
    return { mode: 'picture', sy, gain: 1 + u * u, white: 1.2 * clamp((0.1 - sy) / 0.1) ** 1.5, edge: u * u * u, ...none };
  }
  if (f < OPEN) {
    // The line (iteration 3: it holds the rest of outro 1.3, then the ω holds all of outro 1.4): full width on LINE, its tips drawing in from the
    // start (≈ 2.5 px a frame each, speeding up into the pry-open: u(1 + u)/2) to 1500 by outro 2.1; its ω snaps in over a 32nd from outro 1.4 (keyed SWAP_LEAD early, so
    // every sub-frame of outro 1.4 already bends) and holds.
    const u = clamp((f - SHRINK.from) / (SHRINK.to - SHRINK.from));
    const w = lerp(LINE_W.from, LINE_W.to, (u * (1 + u)) / 2);
    const dip = OMEGA_DEPTH * ease.outCubic(clamp((f - (DIP.from - SWAP_LEAD)) / (DIP.to - DIP.from)));
    const lift = LINE_FLOAT.amount * Math.sin((2 * Math.PI * (f - LINE)) / LINE_FLOAT.period);
    return { mode: 'lens', sy: 0, gain: 1, white: 0, edge: 0, w, h: 0, dipU: dip, dipL: dip, zoom: 1, lift, chase: -1, rim: lineRim(f) };
  }
  // outro 2.1: pried open — a launch keyed one frame early (75 % by outro 2.1 + 3, ≈ 470 on outro 2.1 + 5, settled by outro 2.1&), then breathing ±12 px; the
  // breath, the float and the push run on the lens's clock, so they hold still through the button's silence.
  const t = lensClock(f);
  const p = springL(t, OPEN);
  const settled = smoothstep(OPEN + 6, OPEN + 18, t);
  const breath = LENS.breath * Math.sin((2 * Math.PI * (t - (OPEN + 12))) / FRAMES_PER_BEAT) * settled;
  const lift = LENS_FLOAT.amount * Math.cos((2 * Math.PI * (t - (OPEN + 12))) / LENS_FLOAT.period) * settled;
  const relax = 1 - ease.outCubic(clamp((f - OPEN) / 6));
  const dipL = OMEGA_DEPTH * relax;
  const dipU = dipL * clamp(1 - p) ** 2;
  const zoom = 1 + LENS_PUSH * cruise((t - OPEN) / PUSH_SPAN);
  // The button's click: two output frames of a slightly closed lens, from outro 2.3&'s shutter (struck).
  const click = struck(BUTTON.from, f) && !struck(BUTTON.from + BUTTON.clickFrames, f) ? BUTTON.click : 1;
  // The chase starts with the stop, struck: outro 2.3&'s shutter already shows its head.
  const c0 = CHASE.from - SWAP_LEAD;
  const chase = f >= c0 && f < CHASE.to - SWAP_LEAD ? (f - c0) / (CHASE.to - CHASE.from) : -1;
  // The rim's glow dims to 40 % for the silence and is relit by the tick, flaring +45 % with it; then it dims toward 80 % over the last
  // beat, after the cursor's second blink lights.
  const rim = (1 - BUTTON.dim * buttonDim(f)) * (1 - 0.2 * smoothstep(LAST_TICK, OUTRO_END - 1, f)) * (1 + TICK_PULSE.gain * tickPulse(f));
  return { mode: 'lens', sy: 0, gain: 1, white: 0, edge: 0, w: lerp(LINE_W.to, LENS.w, p), h: Math.max(0, (LENS.h * p + breath) * click), dipU, dipL, zoom, lift, chase, rim };
}

/** Sagitta of a lid at horizontal offset `dx` from the centre: h/2 at the centre, 0 at the tips (a circular arc; stable as h → 0). */
export function sag(w: number, h: number, dx: number): number {
  if (h <= 0 || Math.abs(dx) >= w / 2) return 0;
  const R = (w * w + h * h) / (4 * h);
  return h / 2 - (dx * dx) / (R + Math.sqrt(Math.max(0, R * R - dx * dx)));
}

/** The y (layout px) of a lid at x, in the aperture's own space (before its zoom): the arc plus that lid's ω dip. */
export function lidY(s: ScreenState, x: number, lid: 'upper' | 'lower'): number {
  const dx = x - LENS.cx;
  const a = sag(s.w, s.h, dx);
  const dip = omega(dx / OMEGA_HALF);
  return lid === 'upper' ? LENS.cy - a + s.dipU * dip : LENS.cy + a + s.dipL * dip;
}

/** The lids in GLSL: the same arcs and dips (needs OMEGA_GLSL). */
export const LIDS_GLSL = /* glsl */ `
float lidSag(float w, float h, float dx) {
  if (h <= 0.0 || abs(dx) >= 0.5 * w) return 0.0;
  float R = (w * w + h * h) / (4.0 * h);
  return 0.5 * h - dx * dx / (R + sqrt(max(0.0, R * R - dx * dx)));
}
float upperLid(float w, float h, float dipU, float dx) { return 540.0 - lidSag(w, h, dx) + dipU * omegaDepth(dx / ${OMEGA_HALF.toFixed(1)}); }
float lowerLid(float w, float h, float dipL, float dx) { return 540.0 + lidSag(w, h, dx) + dipL * omegaDepth(dx / ${OMEGA_HALF.toFixed(1)}); }`;

/** The first frame the aperture is anything but the whole picture (for the scenes' cheap path). */
export const APERTURE_FROM = ENTER;
