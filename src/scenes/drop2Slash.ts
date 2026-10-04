// Drop 2's first part, drop2 1.1–3.1 − 1 (builder A · SLASH; build sheet notes/d2build/sheet.md §4.0, §4.2 rows drop2 1.1–2.4&, §5.0,
// §5.3–§5.5, §9 H0–H1). Its pure maths: src/shots/drop2Slash.ts (the seam, S27, the pop) and src/shots/drop2Cube.ts (the pop-out, S28).
// Every sub-frame:
//   S27 (to drop2 1.4&): the hero's mask (R = his coverage, G = the ω) through S27's camera; each world whose region is open drawn whole
//   into its own HalfFloat target — the break's violet world (its blocks through a sheared ShapeField, its own unwinding camera, the
//   band snapping into him), the terminal (the log column, then his ASCII fill: a cell pass over the mask's mip chain, embossed from
//   the upper left), Swiss, Riso (multiplied plates), neon (added tubes), LED (a dot pass over a white source) — each with him in
//   that world's dress; then the region compositor (the blades' half-planes revealed behind their tips, each piece sheared along its
//   blade, the seams, the tips' sparks, the rim glints). On the pop (to drop2 1.2 − 1) the compositor writes a slab instead, and over it go
//   the break's soap film with its hole (the break's own shading, frozen at the break's last frame, the hole ragged, a white-hot lip; never over him),
//   ≈ 2000 lens droplets refracting the slab, the E5 window's backing collapsing and its glyphs torn off at the camera.
//   The cube (from drop2 1.4&): the visible faces' worlds drawn in face space (S27's style frame itself into the slab while face A shows),
//   the orthographic cube on the terminal grid's backdrop (one shader: each face a vertical strip, shaded, cream edges), then the hero
//   in the landed face's dress with his hard shadow; from drop2 3.1 − 6 Drop2Zbuf.renderHero draws him (S29's character pass at yaw 0).
// The kit's Drop2Worlds is not used: these six worlds (and the cube's faces) are drawn here, in this part's own targets, so S27 and S28
// never wait on another builder's API (the slash builder's HANDOFFS); Drop2Zbuf is used for the pre-roll (drop2 3.1 − 6 … 3.1 − 1).
// The pop's film is the break's own shader (scenes/breakLaunch.ts FILM_VERT / FILM_FRAG, read-only) with the hole spliced in.
import * as THREE from 'three';
import { RAMP } from '../actors/asciiFace.ts';
import { frontal, type Pose } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { type FlatContent, FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { ShapeField } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { FILM, FILM_AMBIENT, FILM_FRONT, filmLUT } from '../shots/breakFilm.ts';
import { FILM_FRAG as BREAK_FILM_FRAG, FILM_VERT as BREAK_FILM_VERT } from './breakLaunch.ts';
import { BREAK_PALETTE, type BreakCam, FOV, FRONT, camPose, toEngine } from '../shots/breakShared.ts';
import * as CU from '../shots/drop2Cube.ts';
import { BLADE_LINES, LAW, PALETTES } from '../shots/drop2Shared.ts';
import * as SL from '../shots/drop2Slash.ts';
import type { Drop2Worlds } from './drop2Worlds.ts';
import type { Drop2Zbuf } from './drop2Zbuf.ts';
import { advanceOf } from './swiss.ts';

/** What Drop2Scene hands this part: the shared world drawers and S29's part (for the pre-roll). */
export type SlashKit = { worlds: Drop2Worlds; zbuf: Drop2Zbuf };

const SCREEN = frontal(FRONT, 0, 0, FOV);
const IDENTITY: BreakCam = { zoom: 1, cx: 960, cy: 540, roll: 0, dy: 0 };
const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };
const merge = (...cs: readonly FlatContent[]): FlatContent => {
  const glyphs: Record<string, Glyph[]> = {};
  for (const c of cs) for (const [k, g] of Object.entries(c.glyphs)) (glyphs[k] ??= []).push(...g);
  return { under: cs.flatMap((c) => c.under), glyphs, over: cs.flatMap((c) => c.over) };
};
const v3 = (hex: string, k = 1): THREE.Vector3 => new THREE.Vector3(...linear(hex, k));

/** The screen → layout map of a camera (its inverse), as a column-major mat3 on layout px (y down), and its forward linear part. */
function camMats(c: BreakCam): { toLayout: THREE.Matrix3; lin: number[] } {
  const a = (-c.roll * Math.PI) / 180;
  const co = Math.cos(a) / c.zoom;
  const si = Math.sin(a) / c.zoom;
  // layout = R(−roll)/zoom · (s − (960, 540 + dy)) + (cx, cy); rotate(x, y, deg) = [c x − s y, s x + c y].
  const tx = c.cx - (co * 960 - si * (540 + c.dy));
  const ty = c.cy - (si * 960 + co * (540 + c.dy));
  const toLayout = new THREE.Matrix3().set(co, -si, tx, si, co, ty, 0, 0, 1);
  const b = (c.roll * Math.PI) / 180;
  // Column-major: a layout vector (x, y) → screen R(roll)·zoom·(x, y) = (c x − s y, s x + c y)·zoom.
  return { toLayout, lin: [Math.cos(b) * c.zoom, Math.sin(b) * c.zoom, -Math.sin(b) * c.zoom, Math.cos(b) * c.zoom] };
}

// ——— Shaders ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const SCREEN_PX = /* glsl */ `vec2 screenPx(vec2 uv) { return vec2(uv.x * 1920.0, (1.0 - uv.y) * 1080.0); }
vec2 uvOf(vec2 s) { return vec2(s.x / 1920.0, 1.0 - s.y / 1080.0); }`;

/** The region compositor: which world each pixel shows (the blades' half-planes behind their tips), its shear, the seams. */
const COMPOSE_FRAG = /* glsl */ `
uniform sampler2D w0; uniform sampler2D w1; uniform sampler2D w2; uniform sampler2D w3; uniform sampler2D w4; uniform sampler2D w5;
uniform mat3 toLayout;
uniform mat2 lin;
uniform float zoom;
uniform float pxPerLayout;
uniform vec4 bl[5];
uniform float tip[5];
uniform float reach[5];
uniform float head[5];
uniform float spark[5];
uniform float slant;
uniform float shear[5];
uniform float seamW[5];
uniform vec3 seamC[5];
uniform vec4 glint;
varying vec2 vUv;
${SCREEN_PX}
float lineX(vec4 b, float y) { return b.x + (b.z - b.x) * (y - b.y) / (b.w - b.y); }
bool rev(vec4 b, float r, vec2 p) { vec2 d = normalize(b.zw - b.xy); vec2 q = p - b.xy; return dot(q, d) + slant * abs(d.x * q.y - d.y * q.x) < r; }
vec3 pick(int r, vec2 uv) {
  if (r == 1) return texture2D(w1, uv).rgb;
  if (r == 2) return texture2D(w2, uv).rgb;
  if (r == 3) return texture2D(w3, uv).rgb;
  if (r == 4) return texture2D(w4, uv).rgb;
  if (r == 5) return texture2D(w5, uv).rgb;
  return texture2D(w0, uv).rgb;
}
float segDist(vec2 p, vec2 a, vec2 b) { vec2 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0); return length(p - a - ab * h); }
void main() {
  vec2 s = screenPx(vUv);
  vec2 p = (toLayout * vec3(s, 1.0)).xy;
  int r = 0;
  vec2 off = vec2(0.0);
  if (tip[0] > 0.0 && p.y < bl[0].y && rev(bl[0], reach[0], p)) {
    off += normalize(bl[0].zw - bl[0].xy) * shear[0];
    if (tip[1] > 0.0 && p.x > lineX(bl[1], p.y) && rev(bl[1], reach[1], p)) { r = 2; off += normalize(bl[1].zw - bl[1].xy) * shear[1]; }
    else if (tip[3] > 0.0 && p.x < lineX(bl[3], p.y) && rev(bl[3], reach[3], p)) { r = 4; off += normalize(bl[3].zw - bl[3].xy) * shear[3]; }
    else r = 1;
  } else if (p.y >= bl[0].y) {
    if (tip[2] > 0.0 && p.x < lineX(bl[2], p.y) && rev(bl[2], reach[2], p)) { r = 3; off += normalize(bl[2].zw - bl[2].xy) * shear[2]; }
    else if (tip[4] > 0.0 && p.x > lineX(bl[4], p.y) && rev(bl[4], reach[4], p)) { r = 5; off += normalize(bl[4].zw - bl[4].xy) * shear[4]; }
  }
  vec3 col = pick(r, uvOf(s - lin * off));
  float aa = 0.75 / pxPerLayout;
  for (int k = 0; k < 5; k++) {
    if (tip[k] <= 0.0) continue;
    vec4 b = bl[k];
    vec2 d = b.zw - b.xy;
    float L = length(d);
    vec2 e = b.xy + d / L * head[k];
    float hw = 0.5 * seamW[k];
    float dist = segDist(p, b.xy, e);
    col = mix(col, seamC[k], 1.0 - smoothstep(hw - aa, hw + aa, dist));
    if (spark[k] > 0.0) {
      // The head: a white-hot spark with a streak behind it along the blade.
      vec2 q = p - e;
      float along = dot(q, d / L);
      float across = dot(q, vec2(-d.y, d.x) / L);
      float trail = along < 0.0 ? exp(along / 160.0) : exp(-along * along / 90.0);
      float s = trail * exp(-(across * across) / 14.0) + 0.7 * exp(-dot(q, q) / 420.0);
      col += vec3(4.0, 3.8, 3.4) * s * spark[k];
    }
  }
  if (glint.z > 0.5) {
    int k = int(glint.x + 0.5);
    vec4 b = bl[0];
    if (k == 1) b = bl[1]; else if (k == 2) b = bl[2]; else if (k == 3) b = bl[3]; else if (k == 4) b = bl[4];
    vec2 a = mix(b.xy, b.zw, clamp(glint.y - 0.3, 0.0, 1.0));
    vec2 e = mix(b.xy, b.zw, clamp(glint.y, 0.0, 1.0));
    float dist = segDist(p, a, e);
    col = mix(col, vec3(2.6), 1.0 - smoothstep(1.5 - aa, 1.5 + aa, dist));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/** The terminal's ASCII fill: per cell of the world grid, his coverage and an emboss from the mask's mip chain pick a ramp glyph. */
const ASCII_FRAG = /* glsl */ `
uniform sampler2D mask;
uniform sampler2D ramp;
uniform mat3 toLayout;
uniform mat3 toScreen;
uniform vec2 cell;
uniform float lod;
uniform float amount;
uniform vec3 ink;
uniform vec3 hi;
uniform vec3 pink;
uniform float scan;
uniform float rampN;
varying vec2 vUv;
${SCREEN_PX}
float cov(vec2 layoutP, float l) { vec2 s = (toScreen * vec3(layoutP, 1.0)).xy; return textureLod(mask, uvOf(s), l).r; }
void main() {
  vec2 s = screenPx(vUv);
  vec2 p = (toLayout * vec3(s, 1.0)).xy;
  vec2 id = floor(p / cell);
  vec2 c = (id + 0.5) * cell;
  vec2 sc = (toScreen * vec3(c, 1.0)).xy;
  vec4 m = textureLod(mask, uvOf(sc), lod - 1.0);
  float a = 0.0;
  vec3 col = vec3(0.0);
  if (m.r >= 0.3 && amount > 0.0) {
    float h = cov(c, lod + 0.6);
    float gx = cov(c + vec2(cell.x, 0.0), lod + 0.6) - cov(c - vec2(cell.x, 0.0), lod + 0.6);
    float gy = cov(c + vec2(0.0, cell.y), lod + 0.6) - cov(c - vec2(0.0, cell.y), lod + 0.6);
    vec3 n = normalize(vec3(-gx * 1.6, gy * 1.6, 1.0));
    float lum = clamp(0.3 + 0.7 * max(0.0, dot(n, normalize(vec3(-0.5, 0.6, 0.62)))) * (0.75 + 0.25 * h), 0.0, 1.0);
    float idx = clamp(floor(lum * 9.0 + 0.5), 1.0, 9.0);
    vec2 f = fract(p / cell);
    float g = texture2D(ramp, vec2((idx + f.x) / rampN, 1.0 - f.y)).r;
    a = g * amount * smoothstep(0.3, 0.45, m.r);
    col = m.g > 0.45 * m.r ? pink : mix(ink, hi, smoothstep(0.55, 1.0, lum));
  }
  // Behind the characters a faint phosphor of his silhouette (so the face reads at a glance), and the scanlines (18 %) everywhere else.
  float line = 0.5 + 0.5 * cos(6.2831853 * s.y / 3.0);
  float body = smoothstep(0.25, 0.6, textureLod(mask, uvOf(s), 1.0).r) * amount;
  vec3 back = mix(vec3(0.0), ink * 0.1, body);
  float backA = max(body * 0.85, scan * line * (1.0 - body));
  gl_FragColor = vec4(mix(back, col, a), max(a, backA));
}`;

/**
 * The LED dot pass: the world (or the hero) sampled at a 12 px dot pitch — lit amber dots with a glow, unlit dots on the board. The
 * source's colour picks the dot's: white amber, [1, 1, 0] pink (his ω on S27's board), [1, 0, 1] Defender's red (the infected guest in
 * S28's marquee, sheet §1.3 B; drop2Cube LED_CODE).
 */
const LED_FRAG = /* glsl */ `
uniform sampler2D src;
uniform mat3 toLayout;
uniform mat3 toScreen;
uniform float pitch;
uniform float overlay;
uniform float flash;
uniform float scanX;
uniform float pxPerLayout;
uniform vec3 lit;
uniform vec3 pink;
uniform vec3 defender;
uniform vec3 unlit;
uniform vec3 ground;
varying vec2 vUv;
${SCREEN_PX}
void main() {
  vec2 s = screenPx(vUv);
  vec2 p = (toLayout * vec3(s, 1.0)).xy;
  vec2 id = floor(p / pitch);
  float aa = 0.75 / pxPerLayout;
  vec3 col = ground;
  if ((id.x + 0.5) * pitch > scanX) { gl_FragColor = vec4(ground, overlay > 0.5 ? 0.0 : 1.0); return; }
  float alpha = overlay > 0.5 ? 0.0 : 1.0;
  float glow = 0.0;
  vec3 glowC = lit;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = (id + vec2(float(i), float(j)) + 0.5) * pitch;
      vec4 m = texture2D(src, uvOf((toScreen * vec3(c, 1.0)).xy));
      bool on = m.a > 0.45;
      vec3 tone = (m.g > 0.5 && m.b < 0.5) ? pink : (m.g < 0.5 && m.b > 0.5) ? defender : lit;
      float d = length(p - c);
      if (i == 0 && j == 0) {
        float r = on ? 4.6 : 4.0;
        float k = 1.0 - smoothstep(r - aa, r + aa, d);
        if (on) { col = mix(col, tone * (1.6 + flash), k); alpha = max(alpha, k); }
        else if (overlay < 0.5) col = mix(col, unlit, k);
      }
      if (on) { glow += exp(-d * d / 60.0) * 0.22; glowC = tone; }
    }
  }
  col += glowC * glow * (1.0 + flash);
  alpha = max(alpha, clamp(glow * 2.0, 0.0, 1.0) * overlay);
  gl_FragColor = vec4(col, alpha);
}`;

/** The orthographic style cube on the terminal grid: each visible face a vertical strip, sampled from its world in face space. */
const CUBE_FRAG = /* glsl */ `
uniform sampler2D face0; uniform sampler2D face1;
uniform vec4 span0; uniform vec4 span1;   // x0, x1, shade, mode (0 face world, 1 S27's frame, 2 terminal grid, -1 none)
uniform vec3 boxv;                        // h, cy, edge px
uniform mat3 toLayout;
uniform float pxPerLayout;
uniform vec3 ground; uniform vec3 dotC; uniform vec3 edge; uniform float edgeA;
varying vec2 vUv;
${SCREEN_PX}
vec3 grid(vec2 p) {
  vec2 c = (floor(p / vec2(12.0, 22.0)) + 0.5) * vec2(12.0, 22.0);
  float d = length((p - c) * vec2(1.0, 1.0));
  float aa = 0.75 / pxPerLayout;
  return mix(ground, dotC, 1.0 - smoothstep(1.3 - aa, 1.3 + aa, d));
}
vec3 faceAt(sampler2D t, vec4 sp, vec2 p) {
  float u = (p.x - sp.x) / max(sp.y - sp.x, 1e-4);
  float v = (p.y - (boxv.y - 0.5 * boxv.x)) / boxv.x;
  vec2 lp = sp.w > 0.5 && sp.w < 1.5 ? vec2(u * 1920.0, v * 1080.0) : vec2(210.0 + u * 1500.0, 138.0 + v * 844.0);
  vec3 c = sp.w > 1.5 ? grid(lp) : texture2D(t, uvOf(lp)).rgb;
  return c * sp.z;
}
void main() {
  vec2 s = screenPx(vUv);
  vec2 p = (toLayout * vec3(s, 1.0)).xy;
  vec3 col = grid(p);
  float top = boxv.y - 0.5 * boxv.x;
  float bot = boxv.y + 0.5 * boxv.x;
  float aa = 0.75 / pxPerLayout;
  float hw = 0.5 * boxv.z;
  if (p.y > top - hw - aa && p.y < bot + hw + aa) {
    float inY = p.y >= top && p.y <= bot ? 1.0 : 0.0;
    float e = 1e9;
    if (span0.w > -0.5) {
      if (inY > 0.5 && p.x >= span0.x && p.x <= span0.y) col = faceAt(face0, span0, p);
      if (p.x > span0.x - hw && p.x < span0.y + hw) e = min(e, min(abs(p.y - top), abs(p.y - bot)));
      if (p.y > top - hw && p.y < bot + hw) e = min(e, min(abs(p.x - span0.x), abs(p.x - span0.y)));
    }
    if (span1.w > -0.5) {
      if (inY > 0.5 && p.x >= span1.x && p.x <= span1.y) col = faceAt(face1, span1, p);
      if (p.x > span1.x - hw && p.x < span1.y + hw) e = min(e, min(abs(p.y - top), abs(p.y - bot)));
      if (p.y > top - hw && p.y < bot + hw) e = min(e, min(abs(p.x - span1.x), abs(p.x - span1.y)));
    }
    col = mix(col, edge, edgeA * (1.0 - smoothstep(hw - aa, hw + aa, e)));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * E6's remnant: the break's own film shader (scenes/breakLaunch.ts FILM_VERT / FILM_FRAG, read-only), so the film around the pop is
 * shaded exactly as the break left it, with drop 2's additions spliced in: a ragged hole about the black spot (the rim sampled at 64
 * angles), a 6 px white-hot lip outside it, and never over him (alpha 1 − his mask). Returns null if the break's shader no longer has
 * the shape this splice expects (then the remnant is skipped: the pop still reads from the lip-less hole in the slab).
 */
function remnantShader(frag: string): string | null {
  const main = frag.lastIndexOf('void main() {');
  const out = /gl_FragColor\s*=\s*vec4\(([\s\S]*),\s*1\.0\);\s*\}\s*$/.exec(frag);
  if (main < 0 || !out) return null;
  const head = `uniform sampler2D kxHero;
uniform float kxRim[64];
float kxRimAt(float th) {
  float u = fract(th / 6.2831853) * 64.0;
  float i = floor(u);
  float a = 0.0; float b = 0.0;
  for (int k = 0; k < 64; k++) { if (float(k) == i) a = kxRim[k]; if (float(k) == mod(i + 1.0, 64.0)) b = kxRim[k]; }
  return mix(a, b, u - i);
}
`;
  const open = `void main() {
  vec2 kxQ = vRest - anchor;
  float kxGap = length(kxQ) - kxRimAt(atan(kxQ.y, kxQ.x));
  if (kxGap < 0.0) discard;
`;
  const body = frag.slice(main + 'void main() {'.length, out.index);
  const tail = `vec3 kxCol = ${out[1]};
  float kxLip = 1.0 - smoothstep(0.0, 6.0, kxGap);
  kxCol = mix(kxCol, vec3(1.5), 0.6 * kxLip);
  gl_FragColor = vec4(kxCol, 1.0 - texture2D(kxHero, gl_FragCoord.xy / resolution).r);
}`;
  return frag.slice(0, main) + head + open + body + tail;
}

/** E6's droplets: flat lens discs over the slab — the picture behind them inverted and magnified 1.6×, a specular dot, a dark rim. */
const DROP_VERT = /* glsl */ `
attribute vec4 aDrop;   // x, y, r, alpha
attribute vec2 aNorm;
varying vec2 vQ;
varying vec4 vDrop;
varying vec2 vNorm;
void main() {
  vQ = position.xy * 2.0;
  vDrop = aDrop;
  vNorm = aNorm;
  vec2 p = aDrop.xy + vQ * aDrop.z;
  gl_Position = vec4(p.x / 960.0 - 1.0, 1.0 - p.y / 540.0, 0.0, 1.0);
}`;
const DROP_FRAG = /* glsl */ `
uniform sampler2D slab;
varying vec2 vQ;
varying vec4 vDrop;
varying vec2 vNorm;
void main() {
  float l = length(vQ);
  float aa = 1.5 / max(vDrop.z, 1.0);
  float a = 1.0 - smoothstep(1.0 - aa, 1.0, l);
  if (a <= 0.0) discard;
  // The lens: the picture beside it, inverted and magnified 1.6×; a soap-film rim (its colour turning with the angle, the film's own
  // fringes), a dark edge, and a white-hot specular up-left — so a 3–10 px drop reads as a drop, not as the picture it refracts.
  vec2 c = vDrop.xy - vNorm * vDrop.z * 1.5 - vQ * vDrop.z / 1.6;
  vec3 col = texture2D(slab, vec2(c.x / 1920.0, 1.0 - c.y / 1080.0)).rgb * 1.1;
  float ang = atan(vQ.y, vQ.x);
  vec3 fringe = 0.55 + 0.45 * cos(6.2831853 * (ang / 6.2831853 + vec3(0.0, 0.33, 0.67)));
  float rimK = smoothstep(0.55, 0.85, l);
  col = mix(col, fringe * 1.5, 0.7 * rimK);
  col = mix(col, vec3(0.0), 0.3 * smoothstep(0.9, 1.0, l));
  float spec = 1.0 - smoothstep(0.18, 0.34, length(vQ - vec2(-0.36, -0.36)));
  col = mix(col, vec3(3.0), spec);
  gl_FragColor = vec4(col, a * vDrop.w);
}`;

const BLIT_FRAG = /* glsl */ `uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }`;

// ——— The part ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

type Atlases = Record<SL.AtlasKey, GlyphAtlas>;
const WORLD_INDEX: Readonly<Record<SL.WorldName, number>> = { interlude: 0, terminal: 1, swiss: 2, riso: 3, neon: 4, led: 5 };
const MAX_DROPS = SL.DROPLETS;

export class Drop2Slash implements Renderable {
  readonly kit: SlashKit;
  private layout: SL.SlashLayout | null = null;
  private flat: FlatLayer | null = null;
  private light: FlatLayer | null = null;
  private ink: FlatLayer | null = null;
  private blocks: ShapeField | null = null;
  private worlds: THREE.WebGLRenderTarget[] = [];
  private faces: THREE.WebGLRenderTarget[] = [];
  private mask: THREE.WebGLRenderTarget | null = null;
  private ledSrc: THREE.WebGLRenderTarget | null = null;
  private slab: THREE.WebGLRenderTarget | null = null;
  private compose: FullscreenQuad | null = null;
  private ascii: FullscreenQuad | null = null;
  private led: FullscreenQuad | null = null;
  private cube: FullscreenQuad | null = null;
  private blit: FullscreenQuad | null = null;
  private readonly filmScene = new THREE.Scene();
  private readonly filmCamera = new THREE.PerspectiveCamera(20, 16 / 9, 10, 20000);
  private filmMaterial: THREE.ShaderMaterial | null = null;
  private readonly dropScene = new THREE.Scene();
  private dropGeo: THREE.InstancedBufferGeometry | null = null;
  private dropMaterial: THREE.ShaderMaterial | null = null;
  private height = 1080;
  private readonly owned: { dispose(): void }[] = [];

  constructor(kit: SlashKit) {
    this.kit = kit;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.height = size.height;
    const atlases = this.buildAtlases();
    this.layout = { rounded: advanceOf(atlases.rounded), jp: advanceOf(atlases.jp), mono: advanceOf(atlases.mono), display: advanceOf(atlases.display), dot: advanceOf(atlases.dot) };
    const aspect = size.width / size.height;
    const layer = (blend: 'normal' | 'add' | 'multiply') => new FlatLayer({ atlases, blend, aspect, shapes: 4096, glyphs: 4096 });
    this.flat = layer('normal');
    this.light = layer('add');
    this.ink = layer('multiply');
    // Region 0's blocks lean through their own field's model matrix (a shear about the world origin), drawn after the paper.
    this.blocks = new ShapeField({ capacity: 32, blend: 'normal' });
    this.blocks.mesh.renderOrder = -0.5;
    this.blocks.mesh.matrixAutoUpdate = false;
    this.blocks.mesh.visible = false;
    this.flat.scene.add(this.blocks.mesh);
    for (const a of Object.values(atlases)) this.owned.push(a.texture);
    this.owned.push(this.flat, this.light, this.ink, this.blocks);

    const rt = (o: THREE.RenderTargetOptions = {}) => {
      const t = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false, ...o });
      this.owned.push(t);
      return t;
    };
    this.worlds = SL.S27_WORLDS.map(() => rt());
    this.faces = [rt(), rt()];
    this.slab = rt();
    this.ledSrc = rt({ type: THREE.UnsignedByteType });
    this.mask = rt({ type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });

    const ramp = this.buildRamp();
    this.owned.push(ramp);
    const quad = (frag: string, uniforms: Record<string, THREE.IUniform>, blend: boolean) => {
      const q = new FullscreenQuad(
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: FULLSCREEN_VERT,
          fragmentShader: frag,
          depthTest: false,
          depthWrite: false,
          transparent: blend,
          blending: blend ? THREE.NormalBlending : THREE.NoBlending,
        }),
      );
      this.owned.push(q);
      return q;
    };
    const res = new THREE.Vector2(size.width, size.height);
    this.compose = quad(
      COMPOSE_FRAG,
      {
        ...Object.fromEntries(this.worlds.map((w, i) => [`w${i}`, { value: w.texture }])),
        toLayout: { value: new THREE.Matrix3() },
        lin: { value: new THREE.Matrix2() },
        zoom: { value: 1 },
        pxPerLayout: { value: size.height / 1080 },
        bl: { value: BLADE_LINES.map(() => new THREE.Vector4()) },
        tip: { value: [0, 0, 0, 0, 0] },
        reach: { value: [0, 0, 0, 0, 0] },
        head: { value: [0, 0, 0, 0, 0] },
        spark: { value: [0, 0, 0, 0, 0] },
        slant: { value: SL.WAKE.slant },
        shear: { value: [0, 0, 0, 0, 0] },
        seamW: { value: [0, 0, 0, 0, 0] },
        seamC: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3()) },
        glint: { value: new THREE.Vector4() },
      },
      false,
    );
    this.ascii = quad(
      ASCII_FRAG,
      {
        mask: { value: this.mask.texture },
        ramp: { value: ramp },
        toLayout: { value: new THREE.Matrix3() },
        toScreen: { value: new THREE.Matrix3() },
        cell: { value: new THREE.Vector2(9.6, 19.2) },
        lod: { value: Math.log2(19.2 * (size.height / 1080)) },
        amount: { value: 1 },
        ink: { value: v3(PALETTES.terminal.green, 1.4) },
        hi: { value: v3(PALETTES.terminal.text, 1.7) },
        pink: { value: v3(PALETTES.terminal.pink, 1.3) },
        scan: { value: 0.18 },
        rampN: { value: RAMP.length },
      },
      true,
    );
    this.led = quad(
      LED_FRAG,
      {
        src: { value: this.ledSrc.texture },
        toLayout: { value: new THREE.Matrix3() },
        toScreen: { value: new THREE.Matrix3() },
        pitch: { value: 12 },
        overlay: { value: 0 },
        flash: { value: 0 },
        scanX: { value: 1e9 },
        pxPerLayout: { value: size.height / 1080 },
        lit: { value: v3(PALETTES.led.amber) },
        pink: { value: v3(PALETTES.led.pink) },
        defender: { value: v3(LAW.defender.emissive) },
        unlit: { value: v3(PALETTES.led.unlit) },
        ground: { value: v3(PALETTES.led.ground) },
      },
      true,
    );
    this.cube = quad(
      CUBE_FRAG,
      {
        face0: { value: this.faces[0].texture },
        face1: { value: this.faces[1].texture },
        span0: { value: new THREE.Vector4(0, 0, 1, -1) },
        span1: { value: new THREE.Vector4(0, 0, 1, -1) },
        boxv: { value: new THREE.Vector3(844, 560, 3) },
        toLayout: { value: new THREE.Matrix3() },
        pxPerLayout: { value: size.height / 1080 },
        ground: { value: v3(CU.GRID.ground) },
        dotC: { value: v3(CU.GRID.dot, CU.GRID.alpha) },
        edge: { value: v3(CU.CUBE_EDGE.color) },
        edgeA: { value: CU.CUBE_EDGE.alpha },
      },
      false,
    );
    this.blit = quad(BLIT_FRAG, { map: { value: this.slab.texture } }, false);
    this.initFilm(size, res);
    this.initDrops();
  }

  /** The five atlases: M PLUS Rounded 800 (the master, neon), Noto Sans JP 900, JetBrains Mono 700, Inter Tight 900, DotGothic16. */
  private buildAtlases(): Atlases {
    const { rounded, jp, mono, display, dot } = SL.SLASH_ATLAS;
    return {
      rounded: buildGlyphAtlas(rounded, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 24, size: 4096 }),
      jp: buildGlyphAtlas(jp, (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 128, radius: 16, size: 4096 }),
      mono: buildGlyphAtlas(mono, (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 2048 }),
      display: buildGlyphAtlas(display, (px) => `900 ${px}px ${cssStack('display')}`, { fontPx: 256, radius: 24, size: 2048 }),
      dot: buildGlyphAtlas(dot, (px) => `400 ${px}px ${cssStack('dot')}`, { fontPx: 96, radius: 8, size: 2048 }),
    };
  }

  /** The terminal's ramp ` .:-=+*#%@` in JetBrains Mono, one 1:2 cell per character, as an R8 texture (rows top-down). */
  private buildRamp(): THREE.DataTexture {
    const cw = 48;
    const ch = 96;
    const canvas = document.createElement('canvas');
    canvas.width = cw * RAMP.length;
    canvas.height = ch;
    const g = canvas.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 92px ${cssStack('mono')}`;
    [...RAMP].forEach((c, i) => g.fillText(c, cw * (i + 0.5), ch / 2));
    const rgba = g.getImageData(0, 0, canvas.width, ch).data;
    const data = new Uint8Array(canvas.width * ch);
    for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3];
    const t = new THREE.DataTexture(data, canvas.width, ch, THREE.RedFormat, THREE.UnsignedByteType);
    t.flipY = false;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }

  /** The break's membrane, frozen in its last-frame shape (breakFilm.ts), with the break's own shading and drop 2's hole. */
  private initFilm(size: { width: number; height: number }, res: THREE.Vector2): void {
    const s = SL.popFilm();
    const l = filmLUT();
    const lut = new THREE.DataTexture(Uint16Array.from(l.data, (v) => THREE.DataUtils.toHalfFloat(v)), l.size, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    lut.minFilter = THREE.LinearFilter;
    lut.magFilter = THREE.LinearFilter;
    lut.needsUpdate = true;
    this.owned.push(lut);
    const GX = 192;
    const GY = 108;
    const geo = new THREE.PlaneGeometry(1920, 1080, GX, GY);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
    const rest = new Float32Array(pos.count * 2);
    const stretch = new Float32Array(pos.count);
    const prof = (t: number, m: number, hi: number): [number, number] => {
      const left = t <= m;
      const w = left ? m : hi - m;
      const a = (Math.PI / 2) * Math.min(1, Math.max(0, left ? t / w : (hi - t) / w));
      const sn = Math.sin(a);
      const d = t <= 0 || t >= hi ? 0 : 1.5 * Math.sqrt(sn) * Math.cos(a) * (Math.PI / 2 / w);
      return [sn ** 1.5, left ? d : -d];
    };
    for (let j = 0; j <= GY; j++) {
      for (let i = 0; i <= GX; i++) {
        const k = j * (GX + 1) + i;
        const x = (1920 * i) / GX;
        const y = (1080 * j) / GY;
        const [bx, sx] = prof(x, s.anchor[0], 1920);
        const [by, sy] = prof(y, s.anchor[1], 1080);
        const b = bx * by;
        const gx = s.depth * sx * by;
        const gy = s.depth * bx * sy;
        rest.set([x, y], 2 * k);
        pos.setXYZ(k, x + s.tremble[0] * b - 960, 540 - (y + s.tremble[1] * b), -s.depth * b);
        const nl = Math.hypot(gx, gy, 1);
        nor.setXYZ(k, gx / nl, -gy / nl, 1 / nl);
        stretch[k] = 1 / (1 + FILM.stretch * (gx * gx + gy * gy));
      }
    }
    geo.setAttribute('aRest', new THREE.BufferAttribute(rest, 2));
    geo.setAttribute('aStretch', new THREE.BufferAttribute(stretch, 1));
    const frag = remnantShader(BREAK_FILM_FRAG);
    if (!frag) return;
    const none = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
    none.needsUpdate = true;
    this.owned.push(none);
    this.filmMaterial = new THREE.ShaderMaterial({
      uniforms: {
        backplate: { value: this.slab!.texture },
        printed: { value: none },
        // The break's own mask is not drawn here: kxHero keeps the film off him instead.
        heroMask: { value: null },
        heroOn: { value: 0 },
        // The black spot and its ring, round on screen about his ω's ink as the break left them (the hole starts at the same spot in film px, s.black).
        apex: { value: new THREE.Vector2(...s.apex) },
        blackPx: { value: s.blackPx },
        lut: { value: lut },
        resolution: { value: res },
        amount: { value: s.amount },
        lutMax: { value: l.maxNm },
        lutSize: { value: l.size },
        anchor: { value: new THREE.Vector2(...s.anchor) },
        black: { value: s.black },
        blackNm: { value: FILM.black.nm },
        blackEdge: { value: FILM.black.edge },
        blackHalo: { value: (FILM.black.halo * s.black) / FILM.black.radius },
        haloLight: { value: FILM.black.light },
        lens: { value: FILM.lens },
        spec: { value: FILM.spec },
        dim: { value: FILM.dim },
        ambient: { value: FILM_AMBIENT.front },
        onInk: { value: FILM.onInk },
        camZ: { value: FILM_FRONT },
        thick: { value: FILM.thick },
        drainTop: { value: FILM.drainTop },
        marbleAmp: { value: FILM.marble },
        marbleScale: { value: FILM.marbleScale },
        flowPhase: { value: s.flow },
        pulse: { value: s.pulse },
        sweep: { value: s.sweep },
        ior: { value: FILM.n },
        kxHero: { value: this.mask!.texture },
        kxRim: { value: new Array(64).fill(0) },
      },
      vertexShader: BREAK_FILM_VERT,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(geo, this.filmMaterial);
    mesh.frustumCulled = false;
    this.filmScene.add(mesh);
    this.owned.push(geo, this.filmMaterial);
    this.filmCamera.aspect = size.width / size.height;
    this.filmCamera.position.set(0, 0, FILM_FRONT);
    this.filmCamera.lookAt(0, 0, 0);
    this.filmCamera.updateProjectionMatrix();
  }

  private initDrops(): void {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('aDrop', new THREE.InstancedBufferAttribute(new Float32Array(MAX_DROPS * 4), 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aNorm', new THREE.InstancedBufferAttribute(new Float32Array(MAX_DROPS * 2), 2).setUsage(THREE.DynamicDrawUsage));
    geo.instanceCount = 0;
    this.dropGeo = geo;
    this.dropMaterial = new THREE.ShaderMaterial({
      uniforms: { slab: { value: this.slab!.texture } },
      vertexShader: DROP_VERT,
      fragmentShader: DROP_FRAG,
      // The quad is placed straight in clip space with y flipped (screen px, y down): its winding turns, so draw both sides.
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(geo, this.dropMaterial);
    mesh.frustumCulled = false;
    this.dropScene.add(mesh);
    this.owned.push(geo, base, this.dropMaterial);
  }

  // ——— Drawing helpers ——————————————————————————————————————————————————————————————————————————————————————————————————————————

  private clear(gl: THREE.WebGLRenderer, t: THREE.WebGLRenderTarget): void {
    const c = gl.getClearColor(new THREE.Color());
    const a = gl.getClearAlpha();
    gl.setRenderTarget(t);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    gl.setClearColor(c, a);
  }

  private pass(gl: THREE.WebGLRenderer, q: FullscreenQuad, t: THREE.WebGLRenderTarget): void {
    const auto = gl.autoClear;
    gl.autoClear = false;
    q.render(gl, t);
    gl.autoClear = auto;
  }

  private setCam(q: FullscreenQuad, c: BreakCam): void {
    const u = (q.mesh.material as THREE.ShaderMaterial).uniforms;
    const { toLayout } = camMats(c);
    u.toLayout.value = toLayout;
    if (u.toScreen) u.toScreen.value = toLayout.clone().invert();
  }

  /** The hero's mask (R his coverage, G the ω) through `pose`, with its mips for the ASCII emboss. */
  private drawMask(gl: THREE.WebGLRenderer, pose: Pose, hero: readonly SL.HeroChar[]): void {
    this.clear(gl, this.mask!);
    const g = SL.dressHero(hero, 'mask').normal;
    this.flat!.draw(gl, this.mask!, pose, { under: [], glyphs: { rounded: g }, over: [] }, null);
  }

  /** One S27 world, whole, into its target: ground, motif, and him in its dress (`heroAlpha` of him). */
  private drawWorld(gl: THREE.WebGLRenderer, w: SL.WorldName, f: number, c: BreakCam, base: BreakCam, hero: readonly SL.HeroChar[], heroAlpha: number): void {
    const L = this.layout!;
    const t = this.worlds[WORLD_INDEX[w]];
    const pose = camPose(c);
    const paper = (hex: string) => ({ color: linear(hex), grain: 0 });
    if (w === 'interlude') {
      const r0 = SL.region0(f);
      const m = this.blocks!.mesh;
      r0.blocks.forEach((s, i) => this.blocks!.set(i, s));
      this.blocks!.commit(r0.blocks.length);
      m.matrix.set(1, -r0.shear, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      m.matrixWorldNeedsUpdate = true;
      m.visible = true;
      const r0Pose = camPose(SL.r0Cam(f, base));
      this.flat!.draw(gl, t, r0Pose, { under: [...r0.confetti, ...r0.cord], glyphs: {}, over: [] }, { color: BREAK_PALETTE.violet, grain: 0 });
      m.visible = false;
      const band = f < SL.copyHome(8) ? SL.bandCopies(f, L.rounded) : [];
      const d = SL.dressHero(hero, 'interlude', heroAlpha, f);
      this.flat!.draw(gl, t, pose, { under: [], glyphs: { rounded: [...band, ...d.normal] }, over: [] }, null);
      // The post over the links and him, as the break draws it (the band's pin), through region 0's camera.
      if (r0.peg.length > 0) this.flat!.draw(gl, t, r0Pose, { under: [], glyphs: {}, over: r0.peg }, null);
    } else if (w === 'terminal') {
      this.flat!.draw(gl, t, pose, SL.terminalRegion(f, L), paper(PALETTES.terminal.ground));
      const u = (this.ascii!.mesh.material as THREE.ShaderMaterial).uniforms;
      this.setCam(this.ascii!, c);
      u.amount.value = heroAlpha;
      this.pass(gl, this.ascii!, t);
    } else if (w === 'swiss') {
      // World layers, then the hero (sheet §3.3): one draw per layer, since one FlatLayer draw orders its atlases by key, not by intent.
      SL.swissDraws(f, L, hero, heroAlpha).forEach((c, i) => this.flat!.draw(gl, t, pose, c, i === 0 ? paper(PALETTES.swiss.ground) : null));
    } else if (w === 'riso') {
      const r = SL.risoRegion(f, L);
      const d = SL.dressHero(hero, 'riso', heroAlpha, f);
      this.flat!.draw(gl, t, pose, r.normal, { color: linear(PALETTES.riso.ground), grain: 0.035 });
      this.ink!.draw(gl, t, pose, merge(r.multiply, { under: [], glyphs: { rounded: d.multiply }, over: [] }), null);
    } else if (w === 'neon') {
      const r = SL.neonRegion(f, L);
      const d = SL.dressHero(hero, 'neon', heroAlpha, f);
      this.flat!.draw(gl, t, pose, r.normal, paper(PALETTES.neon.ground));
      this.light!.draw(gl, t, pose, merge(r.add, { under: [], glyphs: { rounded: d.add }, over: [] }), null);
    } else {
      const src = SL.ledRegionSource(f, L);
      const d = SL.dressHero(hero, 'mask', heroAlpha);
      this.clear(gl, this.ledSrc!);
      this.flat!.draw(gl, this.ledSrc!, pose, merge(src.content, { under: [], glyphs: { rounded: d.normal }, over: [] }), null);
      this.ledPass(gl, t, c, 0, src.flash, SL.ledScan(f));
    }
  }

  private ledPass(gl: THREE.WebGLRenderer, t: THREE.WebGLRenderTarget, c: BreakCam, overlay: number, flash: number, scanX = 1e9): void {
    const u = (this.led!.mesh.material as THREE.ShaderMaterial).uniforms;
    this.setCam(this.led!, c);
    u.overlay.value = overlay;
    u.flash.value = flash;
    u.scanX.value = scanX;
    (this.led!.mesh.material as THREE.ShaderMaterial).blending = overlay > 0.5 ? THREE.NormalBlending : THREE.NoBlending;
    this.pass(gl, this.led!, t);
  }

  /** The worlds S27 shows at instant f, composited by the blades into `out` through camera `c` (`layout` mode: no camera, for the cube's face A). */
  private drawS27(gl: THREE.WebGLRenderer, f: number, c: BreakCam, out: THREE.WebGLRenderTarget, heroAlpha: number): void {
    const L = this.layout!;
    const hero = SL.heroS27(f, L.rounded);
    const pose = camPose(c);
    this.drawMask(gl, pose, hero);
    const tips = SL.bladeStates(f);
    const open: SL.WorldName[] = ['interlude', ...SL.S27_WORLDS.slice(1).filter((_, k) => tips[k].tip > 0)];
    for (const w of open) this.drawWorld(gl, w, f, c, c, hero, heroAlpha);
    const u = (this.compose!.mesh.material as THREE.ShaderMaterial).uniforms;
    const { toLayout, lin } = camMats(c);
    u.toLayout.value = toLayout;
    (u.lin.value as THREE.Matrix2).fromArray(lin);
    u.zoom.value = c.zoom;
    u.pxPerLayout.value = (this.height / 1080) * c.zoom;
    SL.S27_WORLDS.slice(1).forEach((_, k) => {
      const b = BLADE_LINES[k];
      (u.bl.value as THREE.Vector4[])[k].set(b.from[0], b.from[1], b.to[0], b.to[1]);
      (u.tip.value as number[])[k] = tips[k].tip;
      (u.reach.value as number[])[k] = tips[k].reach;
      (u.head.value as number[])[k] = tips[k].head;
      (u.spark.value as number[])[k] = tips[k].spark;
      (u.shear.value as number[])[k] = tips[k].shear;
      (u.seamW.value as number[])[k] = tips[k].width;
      (u.seamC.value as THREE.Vector3[])[k].set(...tips[k].color);
    });
    const g = SL.rimGlint(f);
    (u.glint.value as THREE.Vector4).set(g ? g.blade : 0, g ? g.u : 0, g ? 1 : 0, 0);
    this.pass(gl, this.compose!, out);
  }

  // ——— Render ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    if (!CU.cubeDraws(f)) this.renderS27(gl, f, target);
    else this.renderCube(gl, f, target);
  }

  private renderS27(gl: THREE.WebGLRenderer, f: number, target: THREE.WebGLRenderTarget): void {
    const c = SL.slashCam(f);
    const pop = f < SL.POP_END;
    this.drawS27(gl, f, c, pop ? this.slab! : target, 1);
    if (!pop) return;
    // E6: the slab, the film's remnant outside the hole, the droplets, the window's backing and its torn glyphs.
    this.pass(gl, this.blit!, target);
    if (f < SL.RIM_GONE + 0.5 && this.filmMaterial) {
      (this.filmMaterial.uniforms.kxRim.value as number[]).splice(0, 64, ...SL.rimProfile(f));
      const auto = gl.autoClear;
      gl.autoClear = false;
      gl.setRenderTarget(target);
      gl.render(this.filmScene, this.filmCamera);
      gl.autoClear = auto;
    }
    const drops = SL.droplets(f);
    const geo = this.dropGeo!;
    const a = geo.getAttribute('aDrop') as THREE.InstancedBufferAttribute;
    const n = geo.getAttribute('aNorm') as THREE.InstancedBufferAttribute;
    drops.forEach((d, i) => {
      a.setXYZW(i, d.x, d.y, d.r, d.alpha);
      n.setXY(i, d.nx, d.ny);
    });
    a.needsUpdate = true;
    n.needsUpdate = true;
    geo.instanceCount = drops.length;
    if (drops.length > 0) {
      const auto = gl.autoClear;
      gl.autoClear = false;
      gl.setRenderTarget(target);
      gl.render(this.dropScene, this.compose!.camera);
      gl.autoClear = auto;
    }
    const back = SL.windowBacking(f);
    const under = back ? [screenRect(back)] : [];
    const torn = SL.tornGlyphs(f).map((g) => SL.lGlyph({ ch: g.ch, x: g.x, y: g.y, size: g.size, rot: g.rot, color: g.color, alpha: g.alpha }));
    this.flat!.draw(gl, target, SCREEN, { under, glyphs: { mono: torn }, over: [] }, null);
  }

  private renderCube(gl: THREE.WebGLRenderer, f: number, target: THREE.WebGLRenderTarget): void {
    const L = this.layout!;
    const c = SL.slashCam(f);
    const faces = CU.visibleFaces(f);
    const u = (this.cube!.mesh.material as THREE.ShaderMaterial).uniforms;
    const spans = [u.span0.value as THREE.Vector4, u.span1.value as THREE.Vector4];
    spans.forEach((s) => s.set(0, 0, 1, -1));
    faces.slice(0, 2).forEach((fc, i) => {
      let mode = 0;
      if (fc.world === 'A') {
        mode = 1;
        this.drawS27(gl, f, IDENTITY, this.slab!, CU.s27HeroShare(f));
        u[`face${i}`].value = this.slab!.texture;
      } else if (fc.world === 'terminal') mode = 2;
      else {
        this.drawFace(gl, fc.world, f, this.faces[i]);
        u[`face${i}`].value = this.faces[i].texture;
      }
      spans[i].set(fc.x0, fc.x1, fc.shade, mode);
    });
    const b = CU.box(f);
    (u.boxv.value as THREE.Vector3).set(b.h, b.cy, CU.CUBE_EDGE.px);
    this.setCam(this.cube!, c);
    u.pxPerLayout.value = (this.height / 1080) * c.zoom;
    this.pass(gl, this.cube!, target);
    if (CU.zbufDrawsHero(f)) {
      this.kit.zbuf.renderHero(gl, f, target);
      return;
    }
    this.drawCubeHero(gl, f, c, target);
    void L;
  }

  /** A cube face's world in face space (layout px of the face at rest). */
  private drawFace(gl: THREE.WebGLRenderer, w: CU.FaceWorld, f: number, t: THREE.WebGLRenderTarget): void {
    const L = this.layout!;
    const pose = SCREEN;
    if (w === 'swiss') this.flat!.draw(gl, t, pose, CU.swissFace(f, L), { color: linear(PALETTES.swiss.ground), grain: 0 });
    else if (w === 'riso') {
      this.flat!.draw(gl, t, pose, EMPTY, { color: linear(PALETTES.riso.ground), grain: 0.035 });
      this.ink!.draw(gl, t, pose, CU.risoFace(f, L), null);
    } else if (w === 'neon') {
      const n = CU.neonFace(f, L);
      this.flat!.draw(gl, t, pose, n.normal, { color: linear(PALETTES.neon.ground), grain: 0 });
      this.light!.draw(gl, t, pose, n.add, null);
    } else if (w === 'led') {
      const src = CU.ledFaceSource(f, L);
      this.clear(gl, this.ledSrc!);
      this.flat!.draw(gl, this.ledSrc!, pose, src.content, null);
      this.ledPass(gl, t, IDENTITY, 0, src.flash);
    }
  }

  /** The hero in front of the cube: his hard shadow, then the landed face's dress, through S28's camera. */
  private drawCubeHero(gl: THREE.WebGLRenderer, f: number, c: BreakCam, target: THREE.WebGLRenderTarget): void {
    const h = CU.cubeHero(f, this.layout!);
    if (h.alpha <= 0.001) return;
    const d = CU.dressCubeHero(h);
    const pose = camPose(c);
    const key = d.atlas;
    this.flat!.draw(gl, target, pose, { under: [], glyphs: { [key]: [...d.shadow, ...d.normal] }, over: [] }, null);
    if (d.multiply.length > 0) this.ink!.draw(gl, target, pose, { under: [], glyphs: { [key]: d.multiply }, over: [] }, null);
    if (d.add.length > 0) this.light!.draw(gl, target, pose, { under: [], glyphs: { [key]: d.add }, over: [] }, null);
    if (d.led.length > 0) {
      this.clear(gl, this.ledSrc!);
      this.flat!.draw(gl, this.ledSrc!, pose, { under: [], glyphs: { [key]: d.led }, over: [] }, null);
      this.ledPass(gl, target, c, 1, 0);
    }
  }

  look(frame: number): Look {
    return SL.slashLook(frame);
  }

  temporal(frame: number): Temporal {
    return SL.slashTemporal(frame);
  }

  segment(frame: number): Segment {
    return SL.slashSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}

/** A rectangle in screen px (centre, size) as an engine shape. */
const screenRect = (r: { x: number; y: number; w: number; h: number; color: readonly [number, number, number]; alpha: number }) => {
  const [x, y] = toEngine(r.x, r.y);
  return { kind: 'rect' as const, x, y, w: r.w, h: r.h, color: r.color, alpha: r.alpha };
};
