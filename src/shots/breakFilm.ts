// E6, the soap film (break 6.3 to the break's end, and the state drop 2 pops on its downbeat): the screen the system gave him after the glass
// broke ("[ OK ] restart #1 · screen replaced", break 5.1) turns into a soap film — the break's one real-3D moment (S26). Owned by the launch
// builder (build sheet notes/break/break-sheet.md §4.12, §7.3). Drop 2 imports this module READ-ONLY to draw the pop on
// drop 2's first beat (drop2 1.1–1.2); a change drop 2 needs goes through the launch builder.
//
// Everything is a pure function of the frame (held at its values on the break's last frame for any later frame) and of a point of the film, given in film
// coordinates = layout px of the screen at rest (1920 × 1080, origin top-left, y down):
//   - filmAt(f): amount (its colour fading in over break 6.3 + 3 to 6.3e + 5: 6.3's hit frame is the band's), depth D (px into the screen at its deepest point), apex (where that point
//     is seen: his ω's ink centre on screen, camera and punches included), anchor (that point's film coordinates), blackPx / black (the
//     black spot's radius on screen / in film px), tremble (px, from break 6.4&, a new offset every 2 frames), flow (the marbling's phase) and
//     pulse (the marbling swelling on each hat);
//   - filmDepth / filmGradient: the membrane, held by the frame's four edges, displaced away from us toward him:
//     depth = D · b(x; 0, anchor.x, 1920) · b(y; 0, anchor.y, 1080), b = sin^1.5 of a quarter wave up to the anchor and down after it;
//   - filmPoint / project: a film point's 3D position (engine units: origin at the frame's centre, y up, z toward the camera, which
//     sits at (0, 0, FILM_FRONT) with FOV 20 and fills the frame at z = 0) and where the camera sees it;
//   - filmThickness (nm): thin at the drained top, thick below, stretched thin where the membrane is steep (so the fringes contour the
//     bulge), finely marbled and flowing up (racing through the held breath, swelling on the hats), and a black spot (< 30 nm) round
//     his ω from break 6.4& — round on screen (filmSeen, filmBlack), so its ring is concentric with his ω's ink;
//     filmHalo(dist, r) / FILM_HALO_GLSL: the black spot's crisp silver-gold ring (the clear black film itself cannot be seen; its ring can);
//   - filmOver(base, …) / FILM_OVER_GLSL: what the film does to the picture behind it — colour only where it is thin, nothing on ink,
//     nothing on his face (his mask) or inside the black spot, the world seen 1:1 (a soap film has no lens);
//   - thinFilmRGB(d, cosθ): two-beam thin-film interference (n = 1.33) integrated over the visible spectrum → linear RGB reflectance,
//     stylised (physical neutral reflectance, boosted colour where thin, none where thick); filmLUT() is it as the texture the shader samples; filmEnv(dir) the studio it reflects (two softboxes,
//     thin strips in drop 2's worlds' colours that only the bulge finds) and FILM_ENV_GLSL the same studio for a shader;
//   - filmText(f): the window (E5) printed on the film, every glyph with its film place and where it is seen, for drop 2 to tear off.
// The film and the window printed on it are the screen: they ignore the rig (the scene draws them at its inverse); only the world behind
// them punches. Plain Node imports it (tests, drop 2): no three / remotion / react imports.
import type { RGB } from '../engine/color.ts';
import { linear } from '../engine/color.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import * as BR from '../score/break.ts';
import { flow as sine, frameOf, launchL, snap } from './breakShared.ts';
import { AFTER_HIT, LAUNCH_V2, creepAt, omegaInkOnScreen, omegaInkOnScreenV2, windowAt, windowAtV2 } from './breakLaunch.ts';
import { FRONT } from './swiss.ts';

/** The camera's distance from the screen plane (engine units = px at z = 0): FOV 20 filling 1080 px. */
export const FILM_FRONT = FRONT;
const C: readonly [number, number] = [960, 540];
const LAST = BR.BREAK_END - 1;

/** The film's numbers (§4.12, tuned on --final stills where noted). */
export const FILM = {
  /** Refractive index of soapy water. */
  n: 1.33,
  /** Thickness (nm) at the bottom of a flat, unstretched film; the top drains to `drainTop` of it, fastest near the top (drain(y) =
   * drainTop + (1 − drainTop)·(1 − (1 − y/1080)²)): as on a standing soap film, a band of colour at the top, clear below (R2-01). */
  thick: 1300,
  drainTop: 0.38,
  /** Stretch thinning: × 1 / (1 + stretch · |∇depth|²) (the sheet's 6 thinned the whole bulge to clear film at D = 0.30·FRONT, slopes ≈ 2.5; 0.8 keeps colour bands contouring it). */
  stretch: 0.8,
  /** Marbling: ± nm, its scale (px: fine fringes, not 260 px blotches, R2-01c), its upward flow (noise units a frame, ≈ 5 px), ×race
   * through the held breath, +40 % on each hat (decaying over `hatDecay` frames). */
  marble: 220,
  marbleScale: 120,
  flow: 0.04,
  race: 3,
  hat: 0.4,
  hatDecay: 2,
  /** The bulges (× FRONT) on break 6.4 and 6.4e (launches) and each creep of the held breath (2-frame snaps). */
  bulges: [0.1, 0.08],
  creep: 0.03,
  /**
   * The black spot (R2-02), round on screen about his ω's ink centre: its radius on the break's last frame (screen px: past his ω's ink, inside his
   * eyes — on that frame's still the clear annulus between them is 179–191 px), its thickness (nm), its anti-aliased edge (px); `halo` the
   * width (px) of the crisp silver-gold ring just outside it, `light` the ring's peak (1: no bloom, a line, not a glow).
   */
  black: { radius: 180, nm: 20, edge: 1.5, halo: 9, light: 1 },
  /**
   * The ring's colours: silver-white on its inside, gold on its outside (the black film's first order, drawn as a flat band), blending
   * across `split` of its width; over his ink and amber it shows at only `overHero` (the window onto his face stays clear).
   */
  ring: { silver: '#F4F6FF', gold: '#FFC845', split: [0.35, 0.65], overHero: 0.25 },
  /** Colour only where thin (R2-01): the interference colour fades out between these optical thicknesses (nm); thicker film is clear. */
  clear: [450, 900],
  /** Ink stays ink (R2-01): the film's light rides on the picture's lightness — none below `ink[0]` (linear luminance: #111 is 0.0056),
   * full from `ink[1]` (the violet ground is 0.34). */
  ink: [0.012, 0.08],
  /** The tremble (± px) through the held breath. */
  tremble: 2,
  /** Stylised reflectance: the physical neutral part (2r² ≈ 0.04 × the interference term) plus this much of its colour (chroma). */
  neutral: 0.0398,
  chroma: 0.3,
  /** No lens (R2-01): a soap film is two parallel surfaces a micron apart, so the world behind is seen 1:1, every channel registered. */
  lens: 0,
  /** How much the film's reflectance (per channel) takes from the world seen through it (stylised: 0.5, so its colours read as a light
   * iridescent sheen over the violet, never as dark murky bands). */
  dim: 0.5,
  /** A neutral specular on top of the interference (so the softboxes read white). */
  spec: 0.06,
  /** The light sweep's start: the studio's lights begin this far right (tangent-plane units) and glide into place as the colour fades in. */
  sweep: 0.9,
  /** The share of the film's light on ink (R2-01: none — outlines stay pure #111; `ink` sets the ramp). */
  onInk: 0,
} as const;

// ——— The state of the film at an instant —————————————————————————————————————————————————————————————————————————————————————————

export type FilmState = {
  /** The instant (clamped to the break's last frame). */
  frame: number;
  /** How much of the film's light shows (0 → 1 over break 6.3 to 6.3e + 5). */
  amount: number;
  /** Px into the screen (away from us, toward him) at its deepest point. */
  depth: number;
  /** Where the deepest point is seen (screen px): his ω's ink centre. */
  apex: [number, number];
  /** The deepest point in film coordinates (pushed out from the centre so that, seen in perspective, it lands on the apex). */
  anchor: [number, number];
  /** The black spot's radius on screen (px about the apex: it is round where it is seen, about his ω's ink centre). */
  blackPx: number;
  /** The same spot in film px about the anchor (blackPx through the bulge's depth): where drop 2's hole starts. */
  black: number;
  /** The held breath's tremble (px), scaled down to 0 at the frame's edges by filmPoint. */
  tremble: [number, number];
  /** The marbling's phase (noise units; it flows upward) and swell (1, +40 % on a hat). */
  flow: number;
  pulse: number;
  /** The light sweep as the screen catches the light: every light of the studio shifted this far right (tangent-plane units), 0.9 → 0 over break 6.3 to 6.3e + 5. */
  sweep: number;
  /**
   * v2 only (break 8's suction, review round 1 F4): the iridescent rim the suction draws round him on the film — its radius on screen (px
   * about the apex) and how much of it shows (0 none). Absent (none) in v04's film and on the break's last frame.
   */
  rimPx?: number;
  rim?: number;
  /**
   * v2 only (the continuity plan v07 §2.7): the hole the break draws round his ω's ink (screen px), filled with drop 2's own world (HOLE) —
   * the black spot's own radius until it swallows his ω (HOLE.swallow). Absent before the black spot. `blackPx` / `black` stay the film's
   * spot (45 → 180 px), which drop 2 reads on the break's last frame to start its tear.
   */
  holePx?: number;
};

/** Hats from break 6.3 (the film is there): the marbling swells on each. */
const HATS: readonly number[] = [...BR.CLOSED_HATS, ...BR.OPEN_HATS].filter((h) => h >= BR.FILM.from).sort((a, b) => a - b);
/** The film catches the light a 32nd after break 6.3's hit (6.3 + 3, with the blocks' shear: the hit frame is the band's), full by 6.3e + 5. */
const LIGHT_FROM = AFTER_HIT;
const LIGHT_FULL = BR.FILM.to - 1;

/** The film at instant f (held at its values on the break's last frame after that). */
export function filmAt(f0: number): FilmState {
  if (LAUNCH_V2 && f0 >= BR.REVERSE) return filmAtV2(f0);
  const f = Math.min(f0, LAST);
  const amount = sine((f - LIGHT_FROM) / (LIGHT_FULL - LIGHT_FROM));
  const [b1, b2] = FILM.bulges;
  const depth =
    FILM_FRONT *
    (b1 * launchL(f - BR.SLINGSHOT[2]) + b2 * launchL(f - BR.SLINGSHOT[3]) + FILM.creep * BR.CREEP.reduce((a, at) => a + creepAt(f, at), 0));
  const apex = omegaInkOnScreen(f);
  const k = (FILM_FRONT + depth) / FILM_FRONT;
  const anchor: [number, number] = [C[0] + (apex[0] - C[0]) * k, C[1] + (apex[1] - C[1]) * k];
  // The black spot snaps a quarter wider on each 32nd of the held breath (the arp's notes, 2-frame snaps): it crosses his face fast
  // and holds round his ω from the break's last frame. Taken at the output frame — one sharp instant per frame — so its ring stays a crisp line.
  const blackPx = (FILM.black.radius / BR.CREEP.length) * BR.CREEP.reduce((a, at) => a + creepAt(frameOf(f), at), 0);
  const black = blackPx * k;
  const d = frameOf(f);
  const pair = Math.floor((d - BR.HELD) / 2);
  const tremble: [number, number] = d < BR.HELD ? [0, 0] : [FILM.tremble * (2 * hash(pair, 61) - 1), FILM.tremble * (2 * hash(pair, 62) - 1)];
  const flow = FILM.flow * (Math.min(f, BR.HELD) - BR.FILM.from) + FILM.flow * FILM.race * Math.max(0, f - BR.HELD);
  let pulse = 1;
  for (const h of HATS) if (h <= f) pulse = 1 + FILM.hat * Math.exp(-(f - h) / FILM.hatDecay);
  const sweep = FILM.sweep * (1 - sine((f - LIGHT_FROM) / (LIGHT_FULL - LIGHT_FROM)));
  return { frame: f, amount, depth, apex, anchor, blackPx, black, tremble, flow, pulse, sweep };
}

// ——— The membrane ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The profile across the frame: 0 at lo and hi, 1 at m, sin^1.5 of a quarter wave on each side. */
const profile = (t: number, m: number, hi: number): number => {
  const u = t <= m ? t / m : (hi - t) / (hi - m);
  return Math.sin((Math.PI / 2) * clamp(u)) ** 1.5;
};
/** Its slope (per px). */
const slope = (t: number, m: number, hi: number): number => {
  if (t <= 0 || t >= hi) return 0;
  const left = t <= m;
  const w = left ? m : hi - m;
  const a = (Math.PI / 2) * clamp(left ? t / w : (hi - t) / w);
  const d = 1.5 * Math.sqrt(Math.sin(a)) * Math.cos(a) * (Math.PI / 2 / w);
  return left ? d : -d;
};

/** Px into the screen at film point (x, y): 0 on the frame's edges, `depth` at the anchor. */
export const filmDepth = (x: number, y: number, s: FilmState): number =>
  s.depth === 0 ? 0 : s.depth * profile(x, s.anchor[0], 1920) * profile(y, s.anchor[1], 1080);

/** ∂depth/∂x and ∂depth/∂y at film point (x, y) (film coordinates, y down). */
export const filmGradient = (x: number, y: number, s: FilmState): [number, number] =>
  s.depth === 0
    ? [0, 0]
    : [s.depth * slope(x, s.anchor[0], 1920) * profile(y, s.anchor[1], 1080), s.depth * profile(x, s.anchor[0], 1920) * slope(y, s.anchor[1], 1080)];

/** The film point (x, y) in 3D (engine units: centre origin, y up, z toward the camera): displaced away from us, trembling with its depth. */
export function filmPoint(x: number, y: number, s: FilmState, tremble = true): [number, number, number] {
  const d = filmDepth(x, y, s);
  const k = tremble && s.depth > 0 ? d / s.depth : 0;
  return [x + s.tremble[0] * k - C[0], C[1] - (y + s.tremble[1] * k), -d];
}

/** Where the camera at (0, 0, FILM_FRONT) sees a 3D point, in screen px (layout, y down). */
export function project(p: readonly [number, number, number]): [number, number] {
  const k = FILM_FRONT / (FILM_FRONT - p[2]);
  return [C[0] + p[0] * k, C[1] - p[1] * k];
}

/** Where film point (x, y) is seen on screen (layout px): the membrane displaced and trembling, through the camera. */
export const filmSeen = (x: number, y: number, s: FilmState): [number, number] => project(filmPoint(x, y, s));

// ——— Thickness ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Smooth 2D value noise in [−1, 1] (hashed lattice, quintic fade). */
function vnoise(x: number, y: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const h = (a: number, b: number) => 2 * hash(a, b, seed) - 1;
  const a = h(i, j) + (h(i + 1, j) - h(i, j)) * u;
  const b = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * u;
  return a + (b - a) * v;
}

/**
 * The marbling at noise coordinates (u, v), in about [−1, 1]: two smooth octaves swirled by a domain warp, plus a ridged third (1 − 2|n|,
 * sharp creases) that draws the fine filaments a soap film's flow leaves — so its colour bands have sharp edges, not blotches (R2-01c).
 */
export function marbling(u: number, v: number): number {
  const wx = vnoise(u * 0.7 + 3.1, v * 0.7, 71);
  const wy = vnoise(u * 0.7, v * 0.7 + 5.7, 72);
  const p = u + 0.9 * wx;
  const q = v + 0.9 * wy;
  return 0.7 * vnoise(p, q, 73) + 0.3 * vnoise(2.1 * p + 1.3, 2.1 * q, 74) + 0.3 * (1 - 2 * Math.abs(vnoise(4.3 * p - 2.7, 4.3 * q + 1.1, 75)));
}

/**
 * The marbling as GLSL (WebGL2: `float marbling(vec2 uv)`), a line-for-line port of vnoise / marbling above with the same integer
 * hash (src/engine/random.ts `hash`), so the shader's swirls are this module's swirls.
 */
export const FILM_MARBLE_GLSL = /* glsl */ `
uint kxMix(uint h, int n) {
  h = (h ^ uint(n)) * 0x01000193u;
  h ^= h >> 13u;
  h *= 0x5bd1e995u;
  h ^= h >> 15u;
  return h;
}
float kxHash(int a, int b, int seed) {
  return float(kxMix(kxMix(kxMix(0x811c9dc5u, a), b), seed)) / 4294967296.0;
}
float kxNoise(vec2 p, int seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  int x = int(i.x);
  int y = int(i.y);
  float h00 = 2.0 * kxHash(x, y, seed) - 1.0;
  float h10 = 2.0 * kxHash(x + 1, y, seed) - 1.0;
  float h01 = 2.0 * kxHash(x, y + 1, seed) - 1.0;
  float h11 = 2.0 * kxHash(x + 1, y + 1, seed) - 1.0;
  float a = h00 + (h10 - h00) * u.x;
  float b = h01 + (h11 - h01) * u.x;
  return a + (b - a) * u.y;
}
float marbling(vec2 uv) {
  float wx = kxNoise(vec2(uv.x * 0.7 + 3.1, uv.y * 0.7), 71);
  float wy = kxNoise(vec2(uv.x * 0.7, uv.y * 0.7 + 5.7), 72);
  vec2 p = uv + 0.9 * vec2(wx, wy);
  return 0.7 * kxNoise(p, 73) + 0.3 * kxNoise(vec2(2.1 * p.x + 1.3, 2.1 * p.y), 74) + 0.3 * (1.0 - 2.0 * abs(kxNoise(vec2(4.3 * p.x - 2.7, 4.3 * p.y + 1.1), 75)));
}`;

/** The stretch thinning at film point (x, y): 1 / (1 + k · |∇depth|²). */
export function filmStretch(x: number, y: number, s: FilmState): number {
  const [gx, gy] = filmGradient(x, y, s);
  return 1 / (1 + FILM.stretch * (gx * gx + gy * gy));
}

/** The film's thickness (nm) at film point (x, y) without the black spot: drained, stretched, marbled. */
export function filmBase(x: number, y: number, s: FilmState): number {
  const stretch = filmStretch(x, y, s);
  const drain = FILM.drainTop + (1 - FILM.drainTop) * (1 - (1 - clamp(y / 1080)) ** 2);
  const marble = FILM.marble * s.pulse * marbling(x / FILM.marbleScale, y / FILM.marbleScale + s.flow);
  return Math.max(0, (FILM.thick * drain + marble) * stretch);
}

/** The black spot at screen distance `dist` (px) from the apex, radius r: 1 inside, 0 outside, anti-aliased over FILM.black.edge. */
export const filmBlack = (dist: number, r: number): number => (r <= 0 ? 0 : 1 - smoothstep(r - FILM.black.edge, r, dist));
/** How much of the black spot covers film point (x, y): round where it is seen, about the apex (his ω's ink centre). */
export function blackMask(x: number, y: number, s: FilmState): number {
  if (s.blackPx <= 0) return 0;
  const [sx, sy] = filmSeen(x, y, s);
  return filmBlack(Math.hypot(sx - s.apex[0], sy - s.apex[1]), s.blackPx);
}

/** A number as a GLSL float literal. */
function glslNum(v: number): string {
  return Number.isInteger(v) ? `${v}.0` : `${v}`;
}

/** The film's thickness (nm) at film point (x, y). */
export const filmThickness =(x: number, y: number, s: FilmState): number => {
  const m = blackMask(x, y, s);
  const b = filmBase(x, y, s);
  return b + (FILM.black.nm - b) * m;
};

const RING_SILVER = linear(FILM.ring.silver);
const RING_GOLD = linear(FILM.ring.gold);
/** The ring's anti-aliasing (px either side of each edge). */
const RING_AA = 0.75;
/**
 * The black spot's ring (R2-02) at screen distance `dist` (px) from the apex, the spot's radius r: one crisp band FILM.black.halo px
 * wide just outside the spot, silver-white on its inside and gold on its outside, never brighter than 1 (a line, not a bloom); nothing
 * inside the spot and nothing beyond the band. `alpha` is how much of the picture it covers.
 */
export function filmHalo(dist: number, r: number): { alpha: number; color: RGB } {
  if (r <= 0) return { alpha: 0, color: [0, 0, 0] };
  const w = FILM.black.halo;
  const t = dist - r;
  const alpha = smoothstep(-RING_AA, RING_AA, t) * (1 - smoothstep(w - RING_AA, w + RING_AA, t));
  const g = smoothstep(FILM.ring.split[0], FILM.ring.split[1], t / w);
  const color = [0, 1, 2].map((i) => FILM.black.light * (RING_SILVER[i] + (RING_GOLD[i] - RING_SILVER[i]) * g)) as unknown as RGB;
  return { alpha, color };
}
/**
 * The suction's rim (v2, review round 1 F4): on break 8 the film is drawn toward him in a dimple, and the dimple's rim — where the film
 * stretches thinnest — shows as one crisp iridescent band round him on screen: `w` px either side of its radius, gold inside through
 * magenta and cyan to a pale lilac outside (the soap film's second-order colours), never brighter than 1 (a line, not a bloom). It never
 * shows on ink (the film's light rides on the picture's lightness: FILM.ink) nor on his face (his mask).
 */
export const FILM_RIM = { w: 28, gold: '#FFC845', magenta: '#FF5FD0', cyan: '#5FE8FF', lilac: '#F2E8FF', edge: [0.55, 1] } as const;
const RIM_RGB = [FILM_RIM.gold, FILM_RIM.magenta, FILM_RIM.cyan, FILM_RIM.lilac].map((h) => linear(h));
/** The rim at screen distance `dist` (px) from the apex, its radius r and amount `amt`: its colour and how much of the picture it covers. */
export function filmRim(dist: number, r: number, amt: number): { alpha: number; color: RGB } {
  if (amt <= 0 || r <= 0) return { alpha: 0, color: [0, 0, 0] };
  const t = (dist - r) / FILM_RIM.w;
  const alpha = amt * (1 - smoothstep(FILM_RIM.edge[0], FILM_RIM.edge[1], Math.abs(t)));
  const [a, b, u] = t < -1 / 3 ? [0, 1, (t + 1) / (2 / 3)] : t < 1 / 3 ? [1, 2, (t + 1 / 3) / (2 / 3)] : [2, 3, (t - 1 / 3) / (2 / 3)];
  const k = clamp(u);
  const color = [0, 1, 2].map((i) => RIM_RGB[a][i] + (RIM_RGB[b][i] - RIM_RGB[a][i]) * k) as unknown as RGB;
  return { alpha, color };
}
/** filmRim as GLSL (`vec4 filmRim(float dist, float r, float amt)`: rgb + alpha), from the same constants. */
export const FILM_RIM_GLSL = /* glsl */ `
vec4 filmRim(float dist, float r, float amt) {
  if (amt <= 0.0 || r <= 0.0) return vec4(0.0);
  float t = (dist - r) / ${glslNum(FILM_RIM.w)};
  float a = amt * (1.0 - smoothstep(${glslNum(FILM_RIM.edge[0])}, ${glslNum(FILM_RIM.edge[1])}, abs(t)));
  vec3 c0 = vec3(${RIM_RGB[0].map(glslNum).join(', ')});
  vec3 c1 = vec3(${RIM_RGB[1].map(glslNum).join(', ')});
  vec3 c2 = vec3(${RIM_RGB[2].map(glslNum).join(', ')});
  vec3 c3 = vec3(${RIM_RGB[3].map(glslNum).join(', ')});
  vec3 c = t < -0.3333333 ? mix(c0, c1, clamp((t + 1.0) * 1.5, 0.0, 1.0)) : t < 0.3333333 ? mix(c1, c2, clamp((t + 0.3333333) * 1.5, 0.0, 1.0)) : mix(c2, c3, clamp((t - 0.3333333) * 1.5, 0.0, 1.0));
  return vec4(c, a);
}`;

/** filmBlack and filmHalo as GLSL (`float filmBlack(float dist, float r)`, `vec4 filmHalo(float dist, float r)`: rgb + alpha), from the same constants. */
export const FILM_HALO_GLSL = /* glsl */ `
float filmBlack(float dist, float r) {
  return r <= 0.0 ? 0.0 : 1.0 - smoothstep(r - ${glslNum(FILM.black.edge)}, r, dist);
}
vec4 filmHalo(float dist, float r) {
  if (r <= 0.0) return vec4(0.0);
  float t = dist - r;
  float a = smoothstep(${glslNum(-RING_AA)}, ${glslNum(RING_AA)}, t) * (1.0 - smoothstep(${glslNum(FILM.black.halo - RING_AA)}, ${glslNum(FILM.black.halo + RING_AA)}, t));
  float g = smoothstep(${glslNum(FILM.ring.split[0])}, ${glslNum(FILM.ring.split[1])}, t / ${glslNum(FILM.black.halo)});
  vec3 silver = vec3(${RING_SILVER.map(glslNum).join(', ')});
  vec3 gold = vec3(${RING_GOLD.map(glslNum).join(', ')});
  return vec4(${glslNum(FILM.black.light)} * mix(silver, gold, g), a);
}`;

/**
 * What the film lays over one point of the picture: its interference colour `film` (reflectance), the light it reflects `refl`, how far
 * its colour has faded in (`amount`), how much of his face is there (`hero`: his mask), how much black spot (`black`), and the ring.
 */
export type FilmLayer = { film: RGB; refl: RGB; amount: number; hero: number; black: number; halo: { alpha: number; color: RGB } };
/**
 * The picture seen through the film (R2-01, R2-02): the film's light rides on the picture's lightness, so ink (#111 outlines, hard
 * shadows, the window's backing) stays ink; his face and the black spot pass through untouched; elsewhere the picture is dimmed by what
 * the film reflects and the reflection is added; over it all the black spot's ring, faint where it crosses him.
 */
export function filmOver(base: RGB, o: FilmLayer): RGB {
  const lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
  const ride = smoothstep(FILM.ink[0], FILM.ink[1], lum) * (1 - o.hero) * (1 - o.black);
  const a = o.halo.alpha * (1 - (1 - FILM.ring.overHero) * o.hero);
  return [0, 1, 2].map((i) => {
    const lit = base[i] * (1 - o.amount * FILM.dim * o.film[i]) + o.amount * o.refl[i];
    const c = ride === 0 ? base[i] : base[i] + (lit - base[i]) * ride;
    return a === 0 ? c : c + (o.halo.color[i] - c) * a;
  }) as unknown as RGB;
}
/** filmOver as GLSL (`vec3 filmOver(vec3 base, vec3 film, vec3 refl, float amount, float hero, float black, vec4 halo)`), from the same constants. */
export const FILM_OVER_GLSL = /* glsl */ `
vec3 filmOver(vec3 base, vec3 film, vec3 refl, float amount, float hero, float black, vec4 halo) {
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  float ride = smoothstep(${glslNum(FILM.ink[0])}, ${glslNum(FILM.ink[1])}, lum) * (1.0 - hero) * (1.0 - black);
  vec3 lit = base * (1.0 - amount * ${glslNum(FILM.dim)} * film) + amount * refl;
  vec3 c = mix(base, lit, ride);
  return mix(c, halo.rgb, halo.a * (1.0 - ${glslNum(1 - FILM.ring.overHero)} * hero));
}`;

// ——— Colour —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

// CIE 1931 colour matching, the multi-lobe Gaussian fit of Wyman, Sloan & Shirley (2013).
const lobe = (l: number, mu: number, s1: number, s2: number): number => Math.exp(-0.5 * ((l - mu) / (l < mu ? s1 : s2)) ** 2);
const cmf = (l: number): [number, number, number] => [
  1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
  0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
  1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8),
];
const LAMBDAS: readonly number[] = Array.from({ length: 81 }, (_, i) => 380 + 5 * i);
const CMF = LAMBDAS.map(cmf);
const toRGB = ([x, y, z]: readonly number[]): [number, number, number] => [
  3.2406 * x - 1.5372 * y - 0.4986 * z,
  -0.9689 * x + 1.8758 * y + 0.0415 * z,
  0.0557 * x - 0.204 * y + 1.057 * z,
];
/** Linear RGB of a reflectance spectrum `r(λ)`, white-balanced so that a flat spectrum of 1 is (1, 1, 1). */
function spectrumRGB(r: (l: number) => number): [number, number, number] {
  const xyz = [0, 0, 0];
  LAMBDAS.forEach((l, i) => {
    const v = r(l);
    for (let c = 0; c < 3; c++) xyz[c] += v * CMF[i][c];
  });
  return toRGB(xyz);
}
const WHITE = spectrumRGB(() => 1);
/** Two-beam interference of a free-standing film (one reflection phase-flipped): 1 − cos δ, δ = 4π n e / λ; 0 for a vanishing film. */
const rawFilm = (e: number): [number, number, number] => {
  const c = spectrumRGB((l) => 1 - Math.cos((4 * Math.PI * FILM.n * e) / l));
  return [Math.max(0, c[0] / WHITE[0]), Math.max(0, c[1] / WHITE[1]), Math.max(0, c[2] / WHITE[2])];
};
/**
 * The film's reflectance (linear RGB) at physical thickness `d` nm seen at cos `cosI` from its normal: its optical path shrinks by the
 * refracted angle's cosine (Snell, n = 1.33). Stylised: the neutral part is physical (≈ 4 % for a thick film, a little brighter for
 * first-order white), only the colour is boosted — so a thick film is nearly invisible and a thin one shows strong soap colours. Black
 * film: none under ~25 nm (a clean black below 22 nm, full from 50 nm).
 */
export function thinFilmRGB(d: number, cosI = 1): RGB {
  const cosT = Math.sqrt(1 - (1 - cosI * cosI) / (FILM.n * FILM.n));
  const e = Math.max(0, d * cosT);
  const c = rawFilm(e);
  const mean = (c[0] + c[1] + c[2]) / 3;
  const k = smoothstep(22, 50, e);
  // Colour only where thin (R2-01): the stylised colour fades out between FILM.clear's thicknesses, so thick film is all but clear.
  const thin = 1 - smoothstep(FILM.clear[0], FILM.clear[1], e);
  const ch = (v: number): number => k * Math.max(0, FILM.neutral * mean + FILM.chroma * thin * (v - mean));
  return [ch(c[0]), ch(c[1]), ch(c[2])];
}

/** thinFilmRGB(d) for d = 0 … maxNm over `size` texels, RGBA float (A = 1): the texture the film's shader samples. */
export function filmLUT(size = 2048, maxNm = 2600): { data: Float32Array; size: number; maxNm: number } {
  const data = new Float32Array(size * 4);
  for (let i = 0; i < size; i++) {
    const c = thinFilmRGB((i / (size - 1)) * maxNm);
    data.set([c[0], c[1], c[2], 1], 4 * i);
  }
  return { data, size, maxNm };
}

// ——— The studio it reflects ———————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A light seen in reflection: a soft-edged box in the tangent plane of directions toward the viewer — (x, y) = (r.x / r.z, r.y / r.z),
 * engine axes (x right, y up, z toward us) — centred on (x, y) with half sizes (w, h), its edge `soft` wide.
 */
export type FilmLight = { x: number; y: number; w: number; h: number; soft: number; color: string; intensity: number };
/**
 * Two big white softboxes (the key, up left, which the flat film shows as a soft white pane in its upper left; a tall fill on the right),
 * and thin strips in the colours of drop 2's worlds — Swiss red, Riso pink, neon cyan, LED amber, terminal green — further out, where
 * only the bulge's slopes look: the coming worlds glint on it as it stretches.
 */
export const FILM_LIGHTS: readonly FilmLight[] = [
  { x: -0.2, y: 0.1, w: 0.1, h: 0.065, soft: 0.03, color: '#FFFFFF', intensity: 1.8 },
  { x: 0.245, y: -0.02, w: 0.03, h: 0.12, soft: 0.02, color: '#FFFFFF', intensity: 1.4 },
  { x: -0.58, y: 0, w: 0.025, h: 0.5, soft: 0.015, color: '#E8402B', intensity: 1.3 },
  { x: 0.6, y: 0.05, w: 0.025, h: 0.45, soft: 0.015, color: '#3FE0FF', intensity: 1.3 },
  { x: 0, y: 0.42, w: 0.45, h: 0.022, soft: 0.015, color: '#FF48B0', intensity: 1.3 },
  { x: 0, y: -0.46, w: 0.45, h: 0.022, soft: 0.015, color: '#4CF08C', intensity: 1.3 },
  { x: 0.52, y: 0.5, w: 0.06, h: 0.05, soft: 0.02, color: '#FFB23E', intensity: 1.3 },
  // Two wide soft lights far off-axis (55–65°): only the bulge's flanks turn far enough to catch them, as long curved glints.
  { x: -1.7, y: 1.2, w: 0.7, h: 0.5, soft: 0.35, color: '#FFFFFF', intensity: 1.2 },
  { x: 1.9, y: -1.1, w: 0.6, h: 0.7, soft: 0.35, color: '#FFF1DC', intensity: 0.9 },
];
/** The studio's ambient: a bright even grey all round (about as bright as the world behind the film, so a neutral film vanishes and only its colours show), a little brighter above. */
export const FILM_AMBIENT = { front: 0.4, sky: 0.1, behind: 0.4 } as const;
const AMBIENT = FILM_AMBIENT;
const LIGHTS = FILM_LIGHTS.map((l) => ({ ...l, rgb: linear(l.color, l.intensity) }));

/**
 * Radiance (linear RGB) the film reflects toward the camera along direction `dir` (engine axes; need not be normalised). `blur` widens
 * every light's soft edge (tangent-plane units): the shader passes the reflection's footprint per pixel, so where the dimple minifies the
 * studio its lights blur into blobs instead of aliasing into lines.
 */
export function filmEnv(dir: readonly [number, number, number], blur = 0, sweep = 0): RGB {
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const [rx, ry, rz] = [dir[0] / len, dir[1] / len, dir[2] / len];
  const front = smoothstep(0, 0.15, rz);
  const out = [AMBIENT.behind, AMBIENT.behind, AMBIENT.behind];
  if (front > 0) {
    const x = rx / Math.max(rz, 1e-3);
    const y = ry / Math.max(rz, 1e-3);
    const amb = AMBIENT.front + AMBIENT.sky * clamp(y);
    const c = [amb, amb, amb];
    for (const l of LIGHTS) {
      const e = l.soft + blur;
      const a = smoothstep(-e, e, l.w - Math.abs(x - l.x - sweep)) * smoothstep(-e, e, l.h - Math.abs(y - l.y));
      for (let i = 0; i < 3; i++) c[i] += a * l.rgb[i];
    }
    for (let i = 0; i < 3; i++) out[i] += (c[i] - out[i]) * front;
  }
  return [out[0], out[1], out[2]];
}

const glslFloat = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
/** filmEnv as GLSL (`vec3 filmEnv(vec3 dir, float blur, float sweep)`), written from the same constants. */
export const FILM_ENV_GLSL = /* glsl */ `
vec3 filmEnv(vec3 dir, float blur, float sweep) {
  vec3 r = normalize(dir);
  float front = smoothstep(0.0, 0.15, r.z);
  vec3 outc = vec3(${glslFloat(AMBIENT.behind)});
  if (front > 0.0) {
    vec2 t = r.xy / max(r.z, 1e-3);
    vec3 c = vec3(${glslFloat(AMBIENT.front)} + ${glslFloat(AMBIENT.sky)} * clamp(t.y, 0.0, 1.0));
${LIGHTS.map(
  (l) =>
    `    c += smoothstep(-${glslFloat(l.soft)} - blur, ${glslFloat(l.soft)} + blur, ${glslFloat(l.w)} - abs(t.x - sweep - (${glslFloat(l.x)}))) * smoothstep(-${glslFloat(l.soft)} - blur, ${glslFloat(l.soft)} + blur, ${glslFloat(l.h)} - abs(t.y - (${glslFloat(l.y)}))) * vec3(${l.rgb.map(glslFloat).join(', ')});`,
).join('\n')}
    outc = mix(outc, c, front);
  }
  return outc;
}`;

// ——— The window printed on it ————————————————————————————————————————————————————————————————————————————————————————————————————

export type FilmGlyph = { ch: string; x: number; y: number; size: number; color: RGB; alpha: number; stretch: number; rot: number; atlas: 'mono' | 'hero'; screen: [number, number] };
/** The window's glyphs (E5) at instant f as printed on the film: film place (x, y), and where the bulge shows them (`screen`). */
export function filmText(f: number): FilmGlyph[] {
  if (LAUNCH_V2 && f >= BR.REVERSE) return filmTextV2(f);
  const s = filmAt(f);
  return windowAt(Math.min(f, LAST)).glyphs.map((g) => {
    const p = filmPoint(g.x, g.y, s);
    const flat = p[2] === 0 && p[0] === g.x - C[0] && p[1] === C[1] - g.y;
    return { ch: g.ch, x: g.x, y: g.y, size: g.size, color: g.color, alpha: g.alpha, stretch: g.stretch, rot: g.rot, atlas: g.atlas, screen: flat ? [g.x, g.y] : project(p) };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — the film of break 8, the FAKE DROP (sheet notes/bid2/break-sheet2.md §3 break 8, §7.3; design §3.8, §4.3). v04's film above
// (break 6.3 → v04's end) is kept as approved; filmAt / filmText read v2's from break 8.1 on when the launch is native (LAUNCH_V2), so
// drop 2, reading them on its downbeat − 1, pops the v2 film. Break 7 has no film: filmAtV2 there is amount 0, depth 0 — the film pass
// is then exactly the world with the window printed over it, so the reverse-angle cut (C8) keeps the window pixel-identical.
//   - the screen catches the light only after the cut (8.1 + 3 → 8.1&, sine), with v04's light sweep;
//   - SUCTION: it bulges toward him as he creeps back into the depth (+0.06·FRONT on 8.1&, +0.06 on 8.2, +0.04 on 8.2e, then +0.03 on
//     each 32nd of the held breath: 0.28·FRONT on 8.2a + 3), the fringes contouring the bulge;
//   - the release (8.3) relaxes it (sine, to 0 by 8.3 + 5); the SPLAT (8.3e) flips it into a dome toward us: −0.13·FRONT 3 f later,
//     rebounding to −0.08 (8.3e + 9), settling at −0.10 by 8.4 — a trampoline that keeps him;
//   - the marbling races through the held breath and calms to ×0.3 in the silence; the film trembles every 2 f from the look (v07: a
//     3.5 px step to he-gets-it, so the dead air holds its breath; ±2 px after, as built);
//   - the black spot his ω eats: 45 / 90 / 135 / 180 px on 8.4& and each 32nd after (one sharp step each), with the silver-gold ring;
//     v07 (HOLE): drawn as a hole onto drop 2's own world, swallowing his ω on the last two 32nds (400 / 440 px; holePx).
//   - review round 1 (F4, SYNC-3): under the drums the marbling flows at half speed and jumps on each K + C after the cut (HITS_8), the
//     suction's L steps land two frames in on their hits, and the suction shows as an iridescent rim round him (FILM_RIM, filmRimV2) that
//     snaps tighter on every hit and 32nd creep and flies out on the release (none on the last frame).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const LAST_V2 = BR.BREAK_END_V2 - 1;
/** The suction's steps (a share of FRONT each, an L on 8.1&, 8.2, 8.2e; a 2-frame snap on each 32nd creep of the held breath). */
const SUCK: readonly (readonly [number, number, 'L' | 'S'])[] = [
  [BR.CREEPS[0], 0.06, 'L'],
  [BR.CREEPS[1], 0.06, 'L'],
  [BR.CREEPS[2], 0.04, 'L'],
  ...BR.CREEPS.slice(3).map((at) => [at, 0.03, 'S'] as const),
];
/** The dome (shares of FRONT, negative: toward us) from the splat: keys [frames after 8.3e, depth]. */
const DOME_KEYS: readonly (readonly [number, number])[] = [
  [0, 0],
  [3, -0.13],
  [9, -0.08],
  [18, -0.1],
];
/** The suction at its peak, the instant before the release. */
// The hits' steps are L two frames in on their own frames (the bulge's biggest step is the hit's: review round 1 SYNC-3).
const suction = (f: number): number => FILM_FRONT * SUCK.reduce((a, [at, d, k]) => a + d * (k === 'L' ? (frameOf(f) < at ? 0 : launchL(f - at + 2)) : creepAt(f, at)), 0);
/** The film's depth (px, + into the screen) at instant f of break 8. */
export function filmDepthV2(f: number): number {
  if (f < BR.RELEASE) return suction(f);
  if (f < BR.SPLAT) return suction(BR.RELEASE - 0.5) * (1 - sine((f - BR.RELEASE) / (BR.SPLAT - 1 - BR.RELEASE)));
  const t = f - BR.SPLAT;
  let i = 0;
  while (i < DOME_KEYS.length - 2 && t >= DOME_KEYS[i + 1][0]) i++;
  const [t0, d0] = DOME_KEYS[i];
  const [t1, d1] = DOME_KEYS[i + 1];
  const u = clamp((t - t0) / (t1 - t0));
  const e = i === 0 ? 1 - (1 - u) ** 3 : sine(u);
  return FILM_FRONT * (d0 + (d1 - d0) * e);
}
/** Hats of break 8 (the marbling swells on each). */
const HATS_V2: readonly number[] = [...BR.CLOSED_HATS_V2, ...BR.OPEN_HATS_V2].filter((h) => h >= BR.REVERSE && h < BR.RELEASE).sort((a, b) => a - b);
/**
 * The K + C hits of break 8 after the cut (8.1&, 8.2, 8.2e): each one a draw-back notch (review round 1 F4, SYNC-3) — the suction steps
 * deeper, the marbling jumps (one sharp step at the output frame, the whole surface at once: the biggest on 8.2, the interlude's loudest
 * beat) and the rim snaps tighter.
 */
export const HITS_8: readonly number[] = BR.KICKS_V2.filter((k) => k > BR.REVERSE && k < BR.HELD_V2);
const MARBLE_JUMPS: readonly number[] = [0.7, 1.6, 0.8];
/** Under the drums (8.1 → the release) the marbling flows at half speed, so the hits stand out against it (review round 1 F4). */
export const MARBLE_UNDER_DRUMS = 0.5;
/** The marbling's phase: half v04's rate under the drums (racing ×3 of that through the held breath) with a jump on each hit, v04's rate after the release, ×0.3 in the silence. */
const flowV2 = (f: number): number => {
  const span = (a: number, b: number): number => Math.max(0, Math.min(f, b) - a);
  const k = MARBLE_UNDER_DRUMS;
  const jumps = HITS_8.reduce((a, at, i) => a + (frameOf(f) >= at ? MARBLE_JUMPS[i] : 0), 0);
  return FILM.flow * (k * span(BR.REVERSE, BR.HELD_V2) + k * FILM.race * span(BR.HELD_V2, BR.RELEASE) + span(BR.RELEASE, BR.LOOK) + 0.3 * span(BR.LOOK, Infinity)) + jumps;
};
/**
 * The suction's rim (FILM_RIM) on screen: it snaps in on 8.1& and tightens round him on every hit and every 32nd creep of the held breath
 * (a 2-frame snap each, a frame in on its own frame), flaring brighter on each; on the release the suction lets go — the rim flies out and fades
 * (sine, gone by 8.3 + 4).
 */
const RIM_STEPS: readonly (readonly [number, number])[] = [
  [HITS_8[0], 640],
  [HITS_8[1], 560],
  [HITS_8[2], 500],
  ...BR.CREEPS.slice(3).map((at, i) => [at, 470 - 18 * i] as const),
];
const RIM_FROM = 760;
export function filmRimV2(f: number): { px: number; amt: number } {
  const d = frameOf(f);
  if (d < RIM_STEPS[0][0] || f >= BR.RELEASE + 4) return { px: 0, amt: 0 };
  const g = Math.min(f, BR.RELEASE - 0.5);
  let px = RIM_FROM;
  let flare = 0;
  RIM_STEPS.forEach(([at, r], i) => {
    if (frameOf(g) < at) return;
    const prev = i === 0 ? RIM_FROM : RIM_STEPS[i - 1][1];
    // A 2-frame snap a frame in on its own frame (≈ 0.9 of the step on it): the ring tightens on the hit.
    px += (r - prev) * snap(g - at + 1, 2);
    flare = Math.exp(-Math.max(0, g - at) / 3);
  });
  let amt = 0.7 + 0.3 * flare;
  if (f >= BR.RELEASE) {
    const u = sine((f - BR.RELEASE) / 4);
    px += 420 * u;
    amt *= 1 - u;
  }
  return { px, amt };
}

/**
 * The hole his ω eats (the continuity plan v07 §2.7, seam 3456): from he-gets-it the black spot is a window onto drop 2's own world, not
 * onto the violet behind the film — drop 2's terminal ground `world` (#07060C) with its bubbles (lens rings drifting out from his ω,
 * `bubbles`) and him seen through it in drop 2's green glyph rows (his ω pink: `omega` is the ellipse about the ω's ink it covers), as drop
 * 2.1 + 2 draws him. It fills the black spot's first two 32nds (45, 90 px) and on the last two (8.4a, 8.4a + 3) swallows his ω and both
 * eyes (`swallow`, screen px), so drop 2's tear (drop2 1.1, drawn by drop 2 from blackPx's 180 px) goes on from a hole already open.
 * `tremble`: the dead air before it (the look → he-gets-it, 3426–3443) is a held breath, not a freeze — the film shakes a new
 * `tremble` px every 2 frames (a fixed length, a new direction each time); from he-gets-it on, v2's ±FILM.tremble as built (so the last
 * frame, which drop 2 pops, is unchanged).
 */
export const HOLE = {
  from: BR.GETS_IT,
  swallow: [400, 440],
  world: '#07060C',
  green: '#4CF08C',
  pink: '#FF5FA0',
  omega: [230, 170],
  bubbles: { cell: 72, share: 0.55, r: [5, 14], drift: 0.012 },
  glyph: { cell: [11, 17], dot: 3, retype: 3 },
  tremble: 3.5,
} as const;

/** The hole the break draws at instant f (screen px about his ω's ink; 0 before he gets it): the black spot, then the swallow. */
export function holePxAt(f: number): number {
  const d = frameOf(Math.min(f, LAST_V2));
  const n = BR.BLACK_STEPS.filter((at) => at <= d).length;
  if (n === 0) return 0;
  const k = n - (BR.BLACK_STEPS.length - HOLE.swallow.length);
  return k > 0 ? HOLE.swallow[k - 1] : (FILM.black.radius / BR.BLACK_STEPS.length) * n;
}

/** The film at instant f, v2 (break 7: none; break 8: the fake drop), held at its values on the break's last frame after that. */
export function filmAtV2(f0: number): FilmState {
  const f = Math.min(f0, LAST_V2);
  const apex = omegaInkOnScreenV2(f);
  if (f < BR.REVERSE) return { frame: f, amount: 0, depth: 0, apex, anchor: apex, blackPx: 0, black: 0, tremble: [0, 0], flow: 0, pulse: 1, sweep: FILM.sweep };
  const light = sine((f - BR.FILM_IN.from) / (BR.FILM_IN.to - BR.FILM_IN.from));
  const depth = filmDepthV2(f);
  const k = (FILM_FRONT + depth) / FILM_FRONT;
  const anchor: [number, number] = [C[0] + (apex[0] - C[0]) * k, C[1] + (apex[1] - C[1]) * k];
  const d = frameOf(f);
  const blackPx = (FILM.black.radius / BR.BLACK_STEPS.length) * BR.BLACK_STEPS.filter((at) => at <= d).length;
  const pair = Math.floor((d - BR.LOOK) / 2);
  // The held breath (the look → he-gets-it): HOLE.tremble px a step, a new direction every 2 frames; then v2's ±FILM.tremble as built.
  const turn = 2 * Math.PI * hash(pair, 65);
  const tremble: [number, number] =
    d < BR.LOOK
      ? [0, 0]
      : d < BR.GETS_IT
        ? [HOLE.tremble * Math.cos(turn), HOLE.tremble * Math.sin(turn)]
        : [FILM.tremble * (2 * hash(pair, 63) - 1), FILM.tremble * (2 * hash(pair, 64) - 1)];
  let pulse = 1;
  for (const h of HATS_V2) if (h <= f) pulse = 1 + FILM.hat * Math.exp(-(f - h) / FILM.hatDecay);
  const rim = filmRimV2(f);
  const holePx = holePxAt(f);
  const out: FilmState = { frame: f, amount: light, depth, apex, anchor, blackPx, black: blackPx * k, tremble, flow: flowV2(f), pulse, sweep: FILM.sweep * (1 - light), ...(holePx > 0 ? { holePx } : {}) };
  // The rim only while it shows (the break's last frame — drop 2's seam — carries none).
  return rim.amt > 0 ? { ...out, rimPx: rim.px, rim: rim.amt * light } : out;
}

/** The window's glyphs (v2) at instant f as printed on the film: film place (x, y), and where the film shows them (`screen`). */
export function filmTextV2(f: number): FilmGlyph[] {
  const s = filmAtV2(f);
  return windowAtV2(Math.min(f, LAST_V2)).glyphs.map((g) => {
    const p = filmPoint(g.x, g.y, s);
    const flat = p[2] === 0 && p[0] === g.x - C[0] && p[1] === C[1] - g.y;
    return { ch: g.ch, x: g.x, y: g.y, size: g.size, color: g.color, alpha: g.alpha, stretch: g.stretch, rot: g.rot, atlas: g.atlas, screen: flat ? [g.x, g.y] : project(p) };
  });
}

/**
 * The dome's glint (v2): while the film domes toward us (the trampoline that catches him), a crisp white arc printed on it round his
 * face's upper left — the soap bubble's highlight, the design's "white specular arc" (§10.3) — as strong as the dome is deep, gone flat.
 * Film coordinates (it bends with the film); never HDR (a line, not a flash), and clear of his face (700 px out from his ω's ink).
 */
export const DOME_GLINT = { r: 700, from: 200, to: 265, w: 14, alpha: 0.75 } as const;
export function domeGlint(s: FilmState): { x: number; y: number; r: number; from: number; to: number; w: number; alpha: number } | null {
  const a = DOME_GLINT.alpha * s.amount * clamp(-s.depth / (0.1 * FILM_FRONT));
  if (a <= 0.01) return null;
  return { x: s.anchor[0], y: s.anchor[1], r: DOME_GLINT.r, from: DOME_GLINT.from, to: DOME_GLINT.to, w: DOME_GLINT.w, alpha: a };
}
