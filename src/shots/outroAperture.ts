// The ending's aperture (build sheet notes/b58/ending-sheet.md §3, §4 inside the ending, §7 E1–E4): what of the tube each part
// still shows, as plain data a part fills in for the instant, so the two parts on either side of a seam evaluate one curve and hand
// over without a seam. The GPU pass (src/scenes/outroAperture.ts) evaluates the same shapes from the GLSL kept beside them here.
//   squeeze  E1, Enter → 2.2: the blue picture squeezed about y 540 (I into the line), brightening to white-hot (OutroBlue: its own pass)
//   trace    E2, 2.2 → 2.3&: the flatline (drawing in, floating), its write head, his ω travelling in on the beep (OutroMonitor)
//   curl     E2, 2.3& → 2.3& + 9: the trace bending into a circle of its own length about its centroid (the arc–chord segment is the window)
//   ring     E2, → 3.1: the ring round him, the iris-out to a red dot, the knocks bulging it, their ripples, the close's red trail
//   iris     E3, 3.1 → 4.1: a polar r(θ) pried open (spring), breathing, straining on the 16ths, dented where his left hand lets go,
//            with up to seven spots (small irises onto the worlds he infected) in union with it (OutroIris)
//   burst    E4, 4.1 →: the rim launched past the corners, thinning and fading; the spots' rims popping (OutroCompany)
// The look of every rim is the v04 line's (kept, as approved): a 2 px white-hot core and a two-scale halo; the antivirus's ring and
// rim turn it DEFENDER red. Layout px: 1920 × 1080, origin top-left, y down. Pure.
import { clamp } from '../engine/math.ts';
import type { RGB } from '../engine/color.ts';
import { BEEP, CURL, ENTER, LINE } from '../score/outro.ts';

// ——— His ω (the v04 line's mouth, kept) ——————————————————————————————————————————————————————————————————————————————————————————

/** The ω the pulse is shaped like (his mouth): depth 56, half-width 300 (the v04 line's ω). */
export const OMEGA_DEPTH = 56;
export const OMEGA_HALF = 300;
const OMEGA_CUSP = 0.3;
/** The ω's centreline as a depth profile over s ∈ [−1, 1] (0 at the line, 1 at its bowls; the cusp raised to 0.3): the v04 line's. */
export function omega(s: number): number {
  const t = Math.abs(s);
  if (t >= 1) return 0;
  if (t < 0.5) return OMEGA_CUSP + (1 - OMEGA_CUSP) * Math.sin(Math.PI * t);
  return 0.5 + 0.5 * Math.cos(2 * Math.PI * (t - 0.5));
}
export const OMEGA_GLSL = /* glsl */ `
float omegaDepth(float s) {
  float t = abs(s);
  if (t >= 1.0) return 0.0;
  if (t < 0.5) return ${OMEGA_CUSP.toFixed(2)} + ${(1 - OMEGA_CUSP).toFixed(2)} * sin(3.14159265 * t);
  return 0.5 + 0.5 * cos(6.28318531 * (t - 0.5));
}`;

// ——— Squeeze (E1, Enter → 2.2) ———————————————————————————————————————————————————————————————————————————————————————————————

/** The picture squeezed about y 540 to `sy` of its height, its colour × `gain` plus `white` (white-hot), its closing edges glowing (`edge`). */
export type Squeeze = { sy: number; gain: number; white: number; edge: number };
/** The CRT power-off (the v04 one, kept): s_y = 1 − 0.996·u³ into the line, brightening as it closes; only the last thin band burns white. */
export function squeezeAt(f: number): Squeeze {
  if (f < ENTER) return { sy: 1, gain: 1, white: 0, edge: 0 };
  const u = clamp((f - ENTER) / (LINE - ENTER));
  const sy = 1 - 0.996 * u * u * u;
  return { sy, gain: 1 + u * u, white: 1.2 * clamp((0.1 - sy) / 0.1) ** 1.5, edge: u * u * u };
}
/** The squeeze in GLSL: a fragment `p` (layout px, y down) of the screen → the picture's colour through the aperture. Needs `pic(vec2)`. */
export const SQUEEZE_GLSL = /* glsl */ `
vec3 squeezed(vec2 p, float sy, float gain, float white, float edge, float px, vec3 core, vec3 glow) {
  float half_ = 540.0 * sy;
  float d = abs(p.y - 540.0);
  float inside = 1.0 - smoothstep(half_ - 0.5 * px, half_ + 0.5 * px, d);
  vec2 q = vec2(p.x, 540.0 + (p.y - 540.0) / max(sy, 1e-4));
  vec3 col = (pic(q) * gain + core * white) * inside;
  float rd = abs(d - half_);
  col += (core * (1.0 - smoothstep(0.5, 1.5, rd)) * 1.2 + glow * (0.5 * exp(-rd / 4.0) + 0.12 * exp(-rd / 20.0))) * edge;
  return col;
}`;

// ——— The phosphor ghost (E1 squeeze → E2): what the beam stopped refreshing keeps glowing ————————————————————————————————————

/**
 * From Enter the beam stops refreshing all but the squeezing band, so the rest of the tube shows the last picture's phosphor: its bright
 * strokes only (the luma thresholded: the type, his face — never the blue ground), tinted by the blue's light, α 0.35 · e^(−(f − ENTER)/14),
 * gone by the curl. OutroBlue draws it round the squeeze, OutroMonitor (from its cached frame ENTER − 1) under the line: one curve.
 */
export const ghostAlpha = (f: number): number => (f < ENTER ? 0 : 0.35 * Math.exp(-(f - ENTER) / 14) * (1 - clamp((f - BEEP) / (CURL.from - BEEP))));
/** The ghost's light from a picture's colour (GLSL; the tint is applied by the caller). */
export const GHOST_GLSL = /* glsl */ `
vec3 phosphorOf(vec3 g) {
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  return g * smoothstep(0.18, 0.9, l);
}`;

// ——— The aperture after the line (E2–E4) ———————————————————————————————————————————————————————————————————————————————————————

export const APERTURE_MODE = { trace: 1, curl: 2, ring: 3, iris: 4, burst: 5 } as const;
export type ApertureMode = keyof typeof APERTURE_MODE;
/** The most spots the pass composites (sheet §7.1: seven, one per world he infected). */
export const MAX_SPOTS = 7;
/** A spot: centre (layout px), radius, pop scale about its centre, rim alpha, whether its interior shows (and from which texture). */
export type ApertureSpot = { x: number; y: number; r: number; scale: number; rim: number; inside: number; fx: boolean };

/**
 * One instant of the aperture (screen space, layout px, y down). Fields a mode does not read are ignored. Colours are linear and may
 * exceed 1 (bloom). `inside` (0–1) says whether the interior picture shows through the opening at all.
 */
export type ApertureState = {
  mode: ApertureMode;
  inside: number;
  // trace (mode 1) — and the ω the curl carries in its first frames
  lineY: number;
  half: number;
  pulse: number;
  depth: number;
  omegaHalf: number;
  head: number;
  headSpeed: number;
  headLight: number;
  heat: number;
  old: number;
  /** The halo's colour: the blue's light → the terminal's mint (haloMint 0 → 1), amber over the pulse's span, red as it curls. */
  haloMint: number;
  // curl (mode 2)
  c: number;
  theta: number;
  R: number;
  cx: number;
  cy: number;
  flatten: number;
  // ring (mode 3)
  ring: number;
  dot: { w: number; h: number };
  /** The dot's red halo gain (1 = as built): it strains with him between the knocks. */
  dotGlow: number;
  ripples: readonly { r: number; a: number }[];
  trail: readonly { r: number; a: number }[];
  // iris / burst (modes 4, 5)
  /** The main rim's radius about (960, 540) (breath, strain and push included), its dent (px, at angle `dentAt` from the top, clockwise). */
  irisR: number;
  dent: number;
  dentAt: number;
  /** The main rim's width (3 px; thinning on the burst) and level (fading on the burst). */
  rimWidth: number;
  rimLevel: number;
  spots: readonly ApertureSpot[];
  // the ghost of the blue screen (E2: the frame the beam just left), scaled about the centre by `zoom`
  ghost: number;
  zoom: number;
};

/** An aperture with nothing open and nothing lit (the defaults each part overrides). */
export const APERTURE_NONE: ApertureState = {
  mode: 'trace',
  inside: 0,
  lineY: 540,
  half: 0,
  pulse: -1e4,
  depth: 0,
  omegaHalf: 300,
  head: -1e4,
  headSpeed: 1,
  headLight: 0,
  heat: 1,
  old: 1,
  haloMint: 1,
  c: 0,
  theta: 1e-4,
  R: 1e6,
  cx: 960,
  cy: 540,
  flatten: 0,
  ring: 0,
  dot: { w: 0, h: 0 },
  dotGlow: 1,
  ripples: [],
  trail: [],
  irisR: 0,
  dent: 0,
  dentAt: 0,
  rimWidth: 3,
  rimLevel: 1,
  spots: [],
  ghost: 0,
  zoom: 1,
};

/** The palette the pass lights the rims with (linear; set once by the scene). */
export type AperturePalette = { white: RGB; mint: RGB; band: RGB; amber: RGB; red: RGB; green: RGB };

/** The iris's polar angle of a layout point about (960, 540): 0 straight up, clockwise positive (radians, −π … π). */
export const polarAngle = (x: number, y: number): number => Math.atan2(x - 960, -(y - 540));
/** The main rim's radius at angle θ (from the top, clockwise): the base radius less the dent's Gaussian (width 0.5 rad). */
export const irisRadiusAt = (s: Pick<ApertureState, 'irisR' | 'dent' | 'dentAt'>, theta: number): number => {
  let d = theta - s.dentAt;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return s.irisR - s.dent * Math.exp(-((d / 0.5) ** 2));
};
/** Whether a layout point is inside the opening (main iris or any spot), for tests. */
export function insideIris(s: ApertureState, x: number, y: number): boolean {
  const r = Math.hypot(x - 960, y - 540);
  if (r < irisRadiusAt(s, polarAngle(x, y))) return true;
  return s.spots.some((sp) => sp.inside > 0 && Math.hypot(x - sp.x, y - sp.y) < sp.r * sp.scale);
}

/**
 * The compositor in GLSL. Reads `pic(vec2)` (the interior, screen layout px), `spotPic(vec2, float fx)` and `ghost(vec2)`; writes the
 * frame's colour for fragment `p`. The rims all share one profile: the v04 line's 2 px white-hot core with a halo of 5 and 26 px.
 */
export const APERTURE_GLSL = /* glsl */ `
${OMEGA_GLSL}
uniform float uMode;
uniform float uInside;
uniform float uPx;
uniform float uLineY;
uniform float uHalf;
uniform float uPulse;
uniform float uDepth;
uniform float uOmegaHalf;
uniform float uHead;
uniform float uHeadSpeed;
uniform float uHeadLight;
uniform float uHeat;
uniform float uOld;
uniform float uHaloMint;
uniform float uC;
uniform vec4 uCurl;
uniform float uFlatten;
uniform float uRing;
uniform vec2 uDot;
uniform float uDotGlow;
uniform vec4 uRipples;
uniform vec3 uTrailR;
uniform vec3 uTrailA;
uniform float uIrisR;
uniform vec2 uDent;
uniform vec2 uRim;
uniform vec4 uSpot[${MAX_SPOTS}];
uniform vec4 uSpotK[${MAX_SPOTS}];
uniform float uGhost;
uniform float uZoom;
uniform vec3 uWhite;
uniform vec3 uMint;
uniform vec3 uBand;
uniform vec3 uAmber;
uniform vec3 uRed;
uniform vec3 uGreen;

// The v04 line's light: a 2 px core and a halo, at distance rd (screen px) from the curve.
float lineCore(float rd) { return 1.0 - smoothstep(1.0 - 0.5 * uPx, 1.0 + 0.5 * uPx, rd); }
float lineHalo(float rd) { return 0.5 * exp(-rd / 5.0) + 0.16 * exp(-rd / 26.0); }
// The antivirus's rim: a band w px wide, its 1 px white-hot middle and an 18 px glow.
vec3 redRim(float rd, float w, float level) {
  float band = 1.0 - smoothstep(0.5 * w - 0.5 * uPx, 0.5 * w + 0.5 * uPx, rd);
  float core = 1.0 - smoothstep(0.5 - 0.5 * uPx, 0.5 + 0.5 * uPx, rd);
  float glow = 0.45 * exp(-rd / 5.0) + 0.1 * exp(-rd / 16.0);
  return (uRed * (band * 0.9 + glow) + uWhite * core * 1.4) * level;
}
float traceY(float x) { return uLineY + uDepth * omegaDepth((x - uPulse) / uOmegaHalf); }
vec3 haloColour(float x) {
  vec3 h = mix(uBand, uMint, uHaloMint);
  float w = omegaDepth((x - uPulse) / uOmegaHalf) * step(0.5, uDepth);
  return mix(h, uAmber, clamp(w * 1.6, 0.0, 1.0));
}
float polarAngle(vec2 p) { return atan(p.x - 960.0, -(p.y - 540.0)); }
float irisR(vec2 p) {
  float d = polarAngle(p) - uDent.y;
  d = atan(sin(d), cos(d));
  return uIrisR - uDent.x * exp(-(d / 0.5) * (d / 0.5));
}

vec3 aperture(vec2 p) {
  vec2 c = vec2(960.0, 540.0);
  // Outside: black, and the blue screen's ghost under the push (E2).
  vec3 col = vec3(0.0);
  if (uGhost > 0.0) col += ghost(c + (p - c) / uZoom) * uBand * uGhost;
  if (uMode < 1.5) {
    // The trace: y(x) with the ω dip, measured along its normal; its tips round.
    float hx = clamp(p.x, 960.0 - uHalf, 960.0 + uHalf);
    float e = 0.75;
    float y = traceY(hx);
    float s = (traceY(hx + e) - traceY(hx - e)) / (2.0 * e);
    float rd = abs(p.x - hx) > 0.0 ? length(vec2(p.x - hx, p.y - y)) : abs(p.y - y) / sqrt(1.0 + s * s);
    // How lit this stretch is: written by the head (fresh, decaying τ 16 f) behind it, the old trace ahead of it.
    float age = (uHead - hx) / max(uHeadSpeed, 1e-3);
    float level = hx <= uHead ? mix(uOld, 1.0, exp(-age / 16.0)) : uOld;
    col += (uWhite * lineCore(rd) * 1.6 * uHeat + haloColour(hx) * lineHalo(rd) * 0.8 * uHeat) * level;
    // The write head: a 6 px white core and a 30 px mint glow on the trace.
    float hd = length(p - vec2(uHead, traceY(uHead)));
    col += (uWhite * (1.0 - smoothstep(3.0 - 0.5 * uPx, 3.0 + 0.5 * uPx, hd)) * 1.4 + uMint * (0.6 * exp(-hd / 10.0) + 0.25 * exp(-hd / 30.0))) * uHeadLight;
    return col;
  }
  if (uMode < 2.5) {
    // The curl: an arc of half-angle θ and radius R about C, its middle at the bottom; the window is the segment between arc and chord.
    float theta = uCurl.x;
    float R = uCurl.y;
    vec2 C = uCurl.zw;
    vec2 d = p - C;
    float phi = atan(d.x, d.y);
    float r = length(d);
    // The ω flattening into the arc at its bottom, outward.
    float sArc = phi * R;
    float rr = R + uDepth * uFlatten * omegaDepth(sArc / uOmegaHalf);
    float rd = abs(phi) <= theta ? abs(r - rr) : min(length(p - (C + R * vec2(sin(theta), cos(theta)))), length(p - (C + R * vec2(-sin(theta), cos(theta)))));
    float chord = C.y + R * cos(theta);
    float aa = uPx;
    float win = smoothstep(-0.5 * aa, 0.5 * aa, rr - r) * smoothstep(-0.5 * aa, 0.5 * aa, p.y - chord);
    col = mix(col, pic(p), win * uInside);
    vec3 halo = mix(haloColour(960.0 + sArc), uRed, smoothstep(0.2, 1.0, uC));
    vec3 trace = (uWhite * lineCore(rd) * 1.6 * uHeat + halo * lineHalo(rd) * 0.8 * uHeat) * uOld;
    col += mix(trace, redRim(rd, 3.0, 1.0), smoothstep(0.55, 1.0, uC));
    return col;
  }
  if (uMode < 3.5) {
    // The ring round him and its iris-out; then the dot, the knocks' ripples, the close's red trail.
    float r = length(p - c);
    if (uRing > 0.0) {
      float aa = uPx;
      col = mix(col, pic(p), (1.0 - smoothstep(uRing - 0.5 * aa, uRing + 0.5 * aa, r)) * uInside);
      col += redRim(abs(r - uRing), 3.0, 1.0);
    }
    col += uRed * (uTrailA.x * exp(-abs(r - uTrailR.x) / 2.5) + uTrailA.y * exp(-abs(r - uTrailR.y) / 2.5) + uTrailA.z * exp(-abs(r - uTrailR.z) / 2.5)) * 0.8;
    for (int i = 0; i < 2; i++) {
      float rr = i == 0 ? uRipples.x : uRipples.z;
      float a = i == 0 ? uRipples.y : uRipples.w;
      if (a > 0.0) {
        float rd = abs(r - rr);
        col += uRed * a * ((1.0 - smoothstep(0.75 - 0.5 * uPx, 0.75 + 0.5 * uPx, rd)) + 0.35 * exp(-rd / 4.0));
      }
    }
    if (uDot.x > 0.0) {
      // The dot: an ellipse w × h with a white-hot core and a 40 px red halo.
      vec2 q = (p - c) / (0.5 * uDot);
      float e = length(q);
      float dd = (e - 1.0) * 0.5 * min(uDot.x, uDot.y);
      float core = 1.0 - smoothstep(-0.5 * uPx, 0.5 * uPx, dd);
      float halo = max(dd, 0.0);
      col += uWhite * core * (1.6 + 0.8 * (1.0 - min(e, 1.0))) + uRed * (0.95 * exp(-halo / 7.0) + 0.3 * uDotGlow * exp(-halo / (20.0 * uDotGlow))) * (1.0 - core * 0.5);
    }
    return col;
  }
  // The iris (mode 4) and the burst (mode 5): the main opening in union with the spots.
  float r = length(p - c);
  float R = irisR(p);
  float aa = uPx;
  float inMain = (1.0 - smoothstep(R - 0.5 * aa, R + 0.5 * aa, r)) * uInside;
  vec3 inner = pic(p);
  float win = inMain;
  vec3 rims = redRim(abs(r - R), uRim.x, uRim.y);
  for (int i = 0; i < ${MAX_SPOTS}; i++) {
    vec4 sp = uSpot[i];
    vec4 k = uSpotK[i];
    if (sp.z <= 0.0) continue;
    float rs = sp.z * sp.w;
    float ds = length(p - sp.xy);
    float m = (1.0 - smoothstep(rs - 0.5 * aa, rs + 0.5 * aa, ds)) * k.y;
    // In the iris a spot shows where the main opening does not; on the burst the main opening covers the spots, and their worlds lie
    // over the stage while they pop away.
    float over = uMode > 4.5 ? 1.0 : 1.0 - inMain;
    if (m > 0.0 && over > 0.0) {
      vec2 q = sp.xy + (p - sp.xy) / sp.w;
      inner = mix(inner, spotPic(q, k.z), m * over);
      win = max(win, m);
    }
    float rd = abs(ds - rs);
    rims += (uGreen * (1.0 - smoothstep(0.75 - 0.5 * uPx, 0.75 + 0.5 * uPx, rd)) * 1.2 + uGreen * 0.3 * exp(-rd / 5.0)) * k.x;
  }
  col = mix(col, inner, clamp(win, 0.0, 1.0));
  col += rims;
  return col;
}`;

/** The uniforms' values for a state (the scene copies them; the tests read them back). */
export function apertureUniforms(s: ApertureState): Record<string, number | readonly number[]> {
  const spots = Array.from({ length: MAX_SPOTS }, (_, i) => s.spots[i]);
  return {
    uMode: APERTURE_MODE[s.mode],
    uInside: s.inside,
    uLineY: s.lineY,
    uHalf: s.half,
    uPulse: s.pulse,
    uDepth: s.depth,
    uOmegaHalf: s.omegaHalf,
    uHead: s.head,
    uHeadSpeed: s.headSpeed,
    uHeadLight: s.headLight,
    uHeat: s.heat,
    uOld: s.old,
    uHaloMint: s.haloMint,
    uC: s.c,
    uCurl: [s.theta, s.R, s.cx, s.cy],
    uFlatten: s.flatten,
    uRing: s.ring,
    uDot: [s.dot.w, s.dot.h],
    uDotGlow: s.dotGlow,
    uRipples: [s.ripples[0]?.r ?? 0, s.ripples[0]?.a ?? 0, s.ripples[1]?.r ?? 0, s.ripples[1]?.a ?? 0],
    uTrailR: [0, 1, 2].map((i) => s.trail[i]?.r ?? 0),
    uTrailA: [0, 1, 2].map((i) => s.trail[i]?.a ?? 0),
    uIrisR: s.irisR,
    uDent: [s.dent, s.dentAt],
    uRim: [s.rimWidth, s.rimLevel],
    uSpot: spots.flatMap((sp) => (sp ? [sp.x, sp.y, sp.r, sp.scale] : [0, 0, 0, 1])),
    uSpotK: spots.flatMap((sp) => (sp ? [sp.rim, sp.inside, sp.fx ? 1 : 0, 0] : [0, 0, 0, 0])),
    uGhost: s.ghost,
    uZoom: s.zoom,
  };
}
