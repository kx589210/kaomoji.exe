// E2 MONITOR, outro 2.2 → 3.1 (OutroMonitor; build sheet notes/b58/ending-sheet.md §3.2 rows 2.2 → 2.4a, §4, §7 E2). Pure.
// The squeezed CRT line (the v04 power-off, kept) is a heart monitor's flatline: white-hot on 2.2, cooling, its tips drawing in,
// floating, a write head sweeping it; behind it the phosphor ghost of the blue screen and, centred under it, the antivirus's last word
// (`[DEFENDER] threat removed ✓`), both decaying. On 2.3 the beep: one heartbeat runs in from the left and stops at the centre, the
// trace dipping into his ω (the v04 line's ω: he's alive). On 2.3& the trace curls into a circle of its own length about its centroid
// (an arc whose window — the segment between arc and chord — opens onto the terminal, his (×ω×) inside), turning DEFENDER red: a red
// ring round his face; his eyes twitch. On 2.4 the ring closes on him (the cartoon iris-out) to a red dot; two knocks from inside (tok on
// 2.4&, tok! on 2.4a: the lub-dub back), the second leaving his fingertips on the dot, and the pry starts: the dot stretches sideways
// into DOT_AT_OPEN, where OutroIris takes it. Screen space (layout px, y down); the push (1.00 → 1.12 about the centre) scales the
// line, the ghost and the last word; the curl, the ring and the dot are measured on screen.
import { HERO_OUT, STAGED } from '../content/outro.ts';
import { scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Segment, type Temporal, struck } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { BEEP, CLOSE, CURL, ENTER, KNOCKS, LAST_WORD, LINE, MONITOR_PUSH, OPEN, OUTRO_SEGMENT, PULSE, TWITCH } from '../score/outro.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { TERMINAL_CURVATURE, terminalLook } from '../worlds/terminal.ts';
import { APERTURE_NONE, type ApertureState, OMEGA_DEPTH, OMEGA_HALF, ghostAlpha } from './outroAperture.ts';
import { INKS, X, Y, faceGlyphs, glow, inkRuns, monoLine } from './outroKit.ts';
import { DOT_AT_OPEN, MONITOR, springL } from './outroShared.ts';

export { OMEGA_DEPTH, OMEGA_HALF, omega } from './outroAperture.ts';

/** The push: 1.00 → 1.12 about (960, 540), linear from the line to the iris-out (then held). */
export const monitorZoom = (f: number): number => 1 + 0.12 * clamp((f - MONITOR_PUSH.from) / (MONITOR_PUSH.to - MONITOR_PUSH.from));
/** The line floats ±4 px about y 540 (down +), one sine every 28 frames from the line: never still. */
export const LINE_FLOAT = { amount: 4, period: 28 } as const;
/** The trace's half-length in layout px (before the push): full width on the line, 750 (1500 px) by the beep, drawing in faster as it goes (u(1+u)/2). */
export function traceHalf(f: number): number {
  const u = clamp((f - LINE) / (BEEP - LINE));
  return lerp(960, 750, (u * (1 + u)) / 2);
}
/** The write head's sweep (layout x, before the push): 210 → 1710 over the line's beat; on the beep it leads the pulse (its right end). */
export const HEAD = { from: 210, to: 1710, core: 6, glow: 30 } as const;
/** The pulse's centre (layout x): in from the trace's left end at the beep, settling at the centre by 2.3& (x_p = 210 + 750·(1 − (1 − t)³)). */
export function pulseX(f: number): number {
  const t = clamp((f - BEEP) / (PULSE.to - PULSE.from));
  return 210 + 750 * (1 - (1 - t) ** 3);
}
export function headX(f: number): number {
  if (f < BEEP) return lerp(HEAD.from, HEAD.to, clamp((f - LINE) / (BEEP - LINE)));
  return pulseX(f) + OMEGA_HALF;
}
/** The head's light: on through the sweep and the pulse, fading over the 32nd after it rests. */
export const headLight = (f: number): number => (f < LINE ? 0 : 1 - clamp((f - PULSE.to) / 6));
/** The trace's heat: white-hot on the line (×2.2), cooling (τ 10 f) toward 1; a flare (+0.4) as the pulse arrives. */
export function traceHeat(f: number): number {
  const cool = 1 + 1.2 * Math.exp(-Math.max(0, f - LINE) / 10);
  const arrive = PULSE.to - 3;
  const flare = f >= arrive ? 0.4 * Math.exp(-(f - arrive) / 4) : 0;
  return cool + flare;
}
/** The old trace's level ahead of the head: 100 % on the line, settling to 35 % (τ 16). */
export const oldTrace = (f: number): number => 0.35 + 0.65 * Math.exp(-Math.max(0, f - LINE) / 16);
/** How far the halo has turned from the blue's light (#9DB6FF) to the terminal's mint (τ 10). */
export const haloMint = (f: number): number => 1 - Math.exp(-Math.max(0, f - LINE) / 10);

/** The curl's progress c (0 → 1): launched on 2.3& (¾ by + 3), round by CURL.to. */
export const curlAt = (f: number): number => (f < CURL.from ? 0 : ease.outQuint(clamp((f - CURL.from) / (CURL.to - CURL.from))));
/** The ω flattens into the arc over the curl's first 6 frames. */
export const curlFlatten = (f: number): number => (f < CURL.from ? 1 : 1 - ease.outCubic(clamp((f - CURL.from) / 6)));
/**
 * The curl, exactly (design §7 E2): the trace (on-screen length Lp) bends into an arc of half-angle θ = π·c and radius R whose centroid
 * stays on (960, 540): its centre of curvature C = (960, 540 − R·sinθ/θ). R = Lp/(2θ), eased from there to MONITOR.ring (260) by
 * CURL.to, so at c = 1 it is the ring about the centre.
 */
export function curlGeometry(f: number, Lp: number): { c: number; theta: number; R: number; cx: number; cy: number } {
  const c = curlAt(f);
  const theta = Math.PI * Math.max(c, 1e-4);
  const settle = clamp((f - CURL.from) / (CURL.to - CURL.from));
  const R = (Lp / (2 * theta)) * lerp(1, MONITOR.ring / (Lp / (2 * Math.PI)), settle * settle);
  return { c, theta, R, cx: 960, cy: 540 - (R * Math.sin(theta)) / theta };
}
/** The ring breathes after it settles: ±6 px a beat with ±2 px an 8th on top (a held ring measured dead frames at ±4). */
export const ringBreath = (f: number): number => {
  const t = f - CURL.to;
  return t < 0 ? 0 : (6 * Math.sin((2 * Math.PI * t) / FRAMES_PER_BEAT) + 2 * Math.sin((4 * Math.PI * t) / FRAMES_PER_BEAT)) * clamp(t / 3);
};
/** The iris-out (I): r = 14 + 246·(1 − u³) over 2.4 → + 9: 251 on + 3, 187 on + 6, 87 on + 8, 14 on + 9. */
export function closeRadius(f: number): number {
  if (f < CLOSE.from) return MONITOR.ring + ringBreath(f);
  const u = clamp((f - CLOSE.from) / (CLOSE.to - CLOSE.from));
  return 14 + 246 * (1 - u * u * u);
}
/** The dot's width (px; the core is white-hot, the halo red): 28 from the close, recoiling 28 → 32 → 28 to the first knock. */
const DOT = MONITOR.dot.core;
/** A knock (L): the dot bulges to `peak` in 3 f and springs back to `back` over the rest of its 16th. */
function knock(f: number, at: number, peak: number, back: number): number {
  if (f < at - 1) return 0;
  const t = f - (at - 1);
  return t < 3 ? (peak - DOT) * ease.outCubic(t / 3) : lerp(peak - DOT, back - DOT, ease.inOutSine(clamp((t - 3) / 3)));
}
/** The dot (w × h px): 28 from the close (a recoil to 32 and back before tok); the knocks bulge it to 45, then 56; the pry stretches it to 64 × 56 by 3.1 − 1. */
export function dotSize(f: number): { w: number; h: number } {
  if (f < CLOSE.to) return { w: 0, h: 0 };
  // Between the knocks he strains from inside: the dot trembles ±1.5 px on the 32nds (never on a knock's own frames).
  const knocking = KNOCKS.some((at) => f >= at - 1 && f < at + 6);
  const tremor = knocking || f >= KNOCKS[1] - 1 ? 0 : 1.5 * Math.sin((2 * Math.PI * (f - CLOSE.to)) / 3) * clamp((f - CLOSE.to) / 2);
  let d = DOT + 4 * Math.sin(Math.PI * clamp((f - CLOSE.to) / (KNOCKS[0] - 1 - CLOSE.to))) + tremor;
  if (f >= KNOCKS[1] - 1) d = DOT + knock(f, KNOCKS[1], 56, 56);
  else if (f >= KNOCKS[0] - 1 && f < KNOCKS[0] + 6) d = DOT + knock(f, KNOCKS[0], 45, 28);
  // The pry: from the creak (tok! + 3) the dot stretches sideways, whole on the frame before the tonic (the hand-off, DOT_AT_OPEN).
  const pry = clamp((f - (KNOCKS[1] + 3)) / (OPEN - 1 - (KNOCKS[1] + 3)));
  return { w: lerp(d, DOT_AT_OPEN.w, ease.inCubic(pry)), h: f >= KNOCKS[1] - 1 ? lerp(d, DOT_AT_OPEN.h, pry) : d };
}
/** The knocks' ripples: a 1.5 px red ring each, r 14 → 110 (tok) / 150 (tok!), α 0.6 → 0 over 6 f. */
export function ripples(f: number): { r: number; a: number }[] {
  return KNOCKS.map((at, i) => {
    const u = (f - at) / 6;
    if (u < 0 || u >= 1) return { r: 0, a: 0 };
    return { r: lerp(14, i === 0 ? 110 : 150, ease.outCubic(u)), a: 0.75 * (1 - u) };
  });
}
/** The dot's halo strains with him: it swells 1 → 1.6 from the close to the pry, flickering ±20 % on the 32nds between the knocks. */
export function dotGlow(f: number): number {
  if (f < CLOSE.to) return 1;
  const build = 1 + 0.6 * ease.inCubic(clamp((f - CLOSE.to) / (OPEN - CLOSE.to)));
  return build * (1 + 0.2 * Math.sin((2 * Math.PI * (f - CLOSE.to)) / 3 + 1));
}
/** His two fingertips on the dot (amber notches at ±30° from the top), from tok! on: held into the pry. */
export const notches = (f: number): number => (f < KNOCKS[1] - 0.25 ? 0 : 1);
/** The ring's last positions linger as a red phosphor trail (τ 10, so the dot is never alone on black between the knocks): the close's radii on its + 3, + 6, + 8. */
export function closeTrail(f: number): { r: number; a: number }[] {
  return [3, 6, 8].map((k) => {
    const at = CLOSE.from + k;
    if (f < at) return { r: 0, a: 0 };
    const u = k / 9;
    // Each afterimage drifts outward as it fades (a dissipating shock), so the dot is never alone on a still black.
    return { r: (14 + 246 * (1 - u * u * u)) * (1 + 0.015 * (f - at)), a: 0.55 * Math.exp(-(f - at) / 10) };
  });
}

/** The ghost of the blue screen: OutroBlue's frame ENTER − 1 (its last word already lifted out), its phosphor (outroAperture.ts ghostAlpha). */
export const GHOST_FRAME = ENTER - 1;
export { ghostAlpha };
/** The last word's level under the line: e^(−(f − LINE)/24), gone over the 32nd into the curl (CURL.from − 2 → + 1; ending fixer a, round 2: over the curl's first 4 frames the forming ring sliced through it, 2.3& + 1 … + 3; as built it faded over the 8th before LAST_WORD.to). */
export const lastWordLevel = (f: number): number => (f >= LAST_WORD.to ? 0 : Math.exp(-Math.max(0, f - LINE) / 24) * (1 - clamp((f - (LAST_WORD.to - 12)) / 12)) * (1 - smoothstep(CURL.from - 2, CURL.from + 1, f)));
/** The last word's place under the line (screen): centred at x 960, its baseline 660 and size 56 at zoom 1, scaled with the push about the centre. */
export function lastWordAt(f: number): { x: number; baseline: number; size: number } {
  const z = monitorZoom(f);
  return { x: 960, baseline: 540 + (660 - 540) * z, size: 56 * z };
}
/**
 * His answer: the promise under the line (ending fixer a, round 1, reviews F2 and R1 item 5). v04 left `next wink at frame N` glowing
 * alone under its flatline for 30-odd frames — the setup the wink pays off — and the as-built monitor had only the antivirus's last word
 * there, the promise a 5 % ghost. The power-off is v04's approved look and outside the new look's exception (the blue screen, the red circle
 * and the amber ✧), so it comes back, as an addition: the antivirus has the line's first beat (`[DEFENDER] threat removed ✓`, decaying);
 * on the beep, as the trace dips into his ω, `next wink at frame 5592` prints under it in v04's type (64 px, white, the number in his
 * amber, its centre 180 px under the line, riding the push), popping as v04's staged lines did (type 1.1 → 1, light 1.8 → 1 over 4 f) —
 * he answers. It holds through the beat; as the trace curls up into the ring it drops clear of the ring (a launch, to y 880 at 56 px)
 * and glows on there like phosphor (τ 30), gone by 3.1 − 3 (v04's `LAST_WORDS.out.to`), before the pry opens on the promised frame.
 */
export const PROMISE = { line: STAGED[2], size: 64, below: 180, settled: { y: 880, size: 56 }, tau: 30, out: { from: OPEN - 15, to: OPEN - 3 } } as const;
export function promiseState(f: number): { y: number; size: number; level: number } | null {
  if (f < BEEP - 0.25 || f >= PROMISE.out.to) return null;
  const t = Math.max(0, f - BEEP);
  const z = monitorZoom(f);
  const drop = springL(f, CURL.from);
  const y = lerp(540 + PROMISE.below * z, PROMISE.settled.y, drop);
  const size = lerp(PROMISE.size * z, PROMISE.settled.size, drop) * (1 + 0.1 * Math.exp(-t / 3));
  const light = (1 + 0.8 * Math.exp(-t / 4)) * Math.exp(-Math.max(0, f - CURL.to) / PROMISE.tau) * (1 - smoothstep(PROMISE.out.from, PROMISE.out.to, f));
  return { y, size, level: light };
}
/** The promise's glyphs (the bold atlas: the staged line's own characters), centred at x 960 on its centre line y. */
export function promiseGlyphs(f: number, bold: Advance): Glyph[] {
  const s = promiseState(f);
  if (!s) return [];
  const ink = inkRuns(PROMISE.line.inks.map((r) => ({ ...r, ink: r.ink === 'amber' ? INKS.hero : INKS.text })), INKS.text);
  return monoLine(PROMISE.line.text, { x: 960, centre: true, baseline: s.y + 0.3 * s.size, size: s.size, advance: bold, ink: (j, ch) => scaleRGB(ink(j, ch), s.level) });
}

/** His face inside the ring: (×ω×), with the twitch's (+ω+) for one 32nd. */
export const ringFace = (f: number): string => (struck(TWITCH, f) && !struck(TWITCH + 3, f) ? HERO_OUT.twitch : HERO_OUT.crashed);
/** The window onto the terminal opens with the curl. */
export const INTERIOR_FROM = CURL.from;

/** The interior (screen space): his face, em 160, phosphor amber at 70 %, centred (960, 540); a small sway inside the ring, a pulse on each knock. */
export function monitorInterior(f: number, rounded: Advance): FlatContent {
  if (f < INTERIOR_FROM - 0.25) return { under: [], glyphs: {}, over: [] };
  const light = 0.7 * Math.max(glow(f, KNOCKS[0], 0.6, 4), glow(f, KNOCKS[1], 0.8, 4));
  const sway = 0.05 * Math.sin((2 * Math.PI * (f - CURL.from)) / FRAMES_PER_BEAT);
  const em = MONITOR.face.em * (1 + 0.02 * Math.sin((2 * Math.PI * (f - CURL.from - 6)) / FRAMES_PER_BEAT));
  const glyphs = faceGlyphs(ringFace(f), { centre: MONITOR.centre, em, advance: rounded, ink: () => scaleRGB(INKS.hero, light), rot: sway });
  return { under: [], glyphs: { rounded: glyphs }, over: [] };
}
/** His fingertips: two short amber bars on the dot's rim at ±30° from the top, from tok! (screen space). */
export function monitorNotches(f: number): Shape[] {
  if (!notches(f)) return [];
  const { w, h } = dotSize(f);
  const out: Shape[] = [];
  for (const s of [-1, 1]) {
    const a = (s * Math.PI) / 6;
    const [x, y] = [960 + (w / 2 + 3) * Math.sin(a), 540 - (h / 2 + 3) * Math.cos(a)];
    out.push({ kind: 'segment', x: X(x), y: Y(y), w: 14, h: 5, rot: Math.atan2(Math.cos(a), Math.sin(a)), color: INKS.hero });
  }
  return out;
}

/** The CRT: scanlines off on the bare line (as built), back to 0.3 as the window opens; the band rolling once a bar; Enter's lift dying away. */
export function monitorLook(frame: number): Look {
  const F = Math.round(frame);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const look = terminalLook(1, glow(F, ENTER, 0.25, 4) - 1, band, TERMINAL_CURVATURE);
  return { ...look, crt: { ...look.crt!, scanlines: 0.3 * clamp((F - CURL.from) / 6) } };
}
/** 32 sub-frames through the pulse, the curl, the close and the knocks (fast shapes); 16 on the line's sweep. */
export const monitorTemporal = (frame: number): Temporal => ({ samples: frame >= BEEP - 1 ? 32 : 16, shutter: 0.5, persistence: 0 });
export const monitorSegment = (): Segment => ({ from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to });

/** The aperture at instant `f` (screen layout px, y down): the trace until the curl, the curl, then the ring, its close and the dot. */
export function monitorAperture(f: number): ApertureState {
  const z = monitorZoom(f);
  const lineY = 540 + z * LINE_FLOAT.amount * Math.sin((2 * Math.PI * (f - LINE)) / LINE_FLOAT.period);
  const half = traceHalf(f) * z;
  const pulseOn = f >= BEEP;
  const common: ApertureState = {
    ...APERTURE_NONE,
    lineY,
    half,
    pulse: pulseOn ? 960 + (pulseX(f) - 960) * z : -1e4,
    depth: pulseOn ? OMEGA_DEPTH * z : 0,
    omegaHalf: OMEGA_HALF * z,
    head: 960 + (headX(f) - 960) * z,
    headSpeed: f < BEEP ? ((HEAD.to - HEAD.from) / (BEEP - LINE)) * z : 30 * z,
    headLight: headLight(f),
    heat: traceHeat(f),
    old: oldTrace(f),
    haloMint: haloMint(f),
    ghost: ghostAlpha(f),
    zoom: z,
  };
  if (f < CURL.from) return { ...common, mode: 'trace' };
  if (f < CURL.to) {
    // The trace's on-screen length at the curl: the pushed 1500 px.
    const g = curlGeometry(f, 2 * traceHalf(CURL.from) * monitorZoom(CURL.from));
    return { ...common, mode: 'curl', inside: 1, c: g.c, theta: g.theta, R: g.R, cx: g.cx, cy: g.cy, flatten: curlFlatten(f), old: 1 };
  }
  return { ...common, mode: 'ring', inside: 1, ring: f < CLOSE.to ? closeRadius(f) : 0, dot: dotSize(f), dotGlow: dotGlow(f), ripples: ripples(f), trail: closeTrail(f) };
}

/** Every character the monitor draws per atlas (its face; the last word is OutroBlue's, in its bold atlas). */
export const MONITOR_STRINGS = { rounded: [HERO_OUT.crashed, HERO_OUT.twitch] } as const;
