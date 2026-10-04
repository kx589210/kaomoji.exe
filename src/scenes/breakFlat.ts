// Break bars 2–5 (src/score/break.ts FLAT): the flat world. Owned by the flat builder (build sheet
// notes/break/break-sheet.md §3 break bars 2–5, §4.5–§4.10, §7.1–§7.2). Everything it draws is a pure function of the frame from
// src/shots/breakWorld.ts, breakHero.ts and breakSystem.ts; this class owns the GPU objects and draws, back to front (§2.3):
//   1. the ground (paper) and whatever hides behind the blocks (peekers, the gasp, dancers peeking up)          — FlatLayer `back`
//   2. the world: the landed glass, the pooling morph, blocks, confetti, the cream square — one SDF shader (smooth-min, outlines inside
//      the edge, hard shadows by offset sampling), on a plane in the world
//   3. the repeater's copies (fan, outline ripple): quads sampling a mask of his face core (R: fill; G: a 0–12 px distance ramp
//      outside it, so a copy's outline can be any width — 4 px on the fan, 6 → 0 px on the ripple)
//   4. his fragments: tinted copies (echoes, onion skins), the (14, 14) shadow pass, the pieces — meshes sampling the expression
//      texture (one tile per glyph group, rendered on change), cut by their polygons with seam lines; from break 5.1 + 8 his glyph string,
//      with a cream keyline while his copies are behind him; the copies are clipped by his plate (the hull of his face core, R2-03)
//   5. dancers standing on the blocks, peekers at the frame's edges, each with a ground-coloured knock-out        — FlatLayer `mid`
//   6. what rides on him and the patch tags                                                                       — FlatLayer `top`
//   6½. the gasp of the hang, over the tags (with knock-outs)                                                     — FlatLayer `mid`
//   7. the colour-stack restart wipe (screen), one sharp instant per frame                                        — FlatLayer `screen`
//   8. on the glitch frames the whole picture goes through a slice-and-split pass;
// and in screenOverlay, once per output frame and fixed to the screen: the party monitor and the callout.
// v2 (FLAT_V2, sheet notes/bid2/break-sheet2.md §3, §6): the same passes through the travelling camera (flatCam), plus — in their own
// layers and atlases, so the v04 layers draw exactly as built when the switch is off — the far blobs (back depth) and the floor band
// under the world, the guest behind it, the tofu block's X over it; the antivirus's hand (src/scenes/breakFlatV2.ts).
import * as THREE from 'three';
import { BREAK_TEXTS, ORDER_TEXTS, PEEK_FACES, PEEK_FACES_V2, POV_LABELS, POV_LOCK_TEXTS, POV_READOUT, SIGNATURE, SPARKLE, orderId } from '../content/break.ts';
import { CAT, DANCERS, GUEST_WAVE, SHOCKED } from '../content/castBreak.ts';
import { fillDistance, frontal } from '../engine/camera.ts';
import { type RGB, linear } from '../engine/color.ts';
import { type FlatContent, FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { BREAK_LOOK, BREAK_PALETTE, FLAT_V2, V2_PALETTE, camPose, flatCam, frameOf, fromScreen, lGlyph, lSegment, lShape, tighten } from '../shots/breakShared.ts';
import { FRAGMENTS, type FragDraw, type HeroPlate, type HeroTex, TILE, TILE_SHEET, faceCore, fragPolygon, heroAt, heroFx, setHeroAdvance, tileOf } from '../shots/breakHero.ts';
import { MONITOR_CHARS_V2, calloutContent, monitorContent, monitorContentV2, tagsContent } from '../shots/breakSystem.ts';
import { CURSOR_POLY, CURSOR_STYLE, type Litter, type Marquee, ORDER_TAG, type OrderDraw, type Pov, cursorsAt, irisMarquee, litterAt, ordersAt, povAt, selectChip, selectMarquee, setOrderAdvance, tearSparks } from '../shots/breakDefender.ts';
import { INFECT_FLASH } from '../score/break.ts';
import { type Poly, PolyField, PovPass } from './breakFlatV2.ts';
import {
  type Copy,
  type Figure,
  FLOOR,
  type GuestFrame,
  GUEST_KEYS,
  GUEST_STICKER,
  GUEST_V2,
  WAVER,
  dancersAt,
  farBlobsAt,
  floorBandAt,
  guestAt,
  tofuCross,
  fanAt,
  flatSegment,
  flatTemporal,
  glitchAt,
  grade,
  groundColor,
  peekAt,
  REEL,
  reelColors,
  rippleAt,
  ringsAt,
  setFaceAdvance,
  shockedAt,
  washAt,
  wipePanels,
  worldAt,
} from '../shots/breakWorld.ts';
import type { BreakPart } from './break.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const SHEET_POSE = frontal(fillDistance(TILE_SHEET.h, FOV), 0, 0, FOV);
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
const textsOf = (role: string): string[] => BREAK_TEXTS.filter((t) => t.role === role).map((t) => t.text);
/** Every whole face the jp atlas holds (each drawn as one glyph): the peekers (the waver also in its two moving pieces), the gasp, the dancers. */
const JP_FACES = [...new Set([...PEEK_FACES, WAVER.body, WAVER.hand, ...SHOCKED, ...Object.values(DANCERS).flat(), GUEST_WAVE, CAT])];
/** v2's jp atlas: v04's faces and the v2 peeks, the spying guest and the pieces he is drawn in once infected (a separate atlas: v04's stays as built). */
const JP_FACES_V2 = [...new Set([...JP_FACES, ...PEEK_FACES_V2, ...GUEST_KEYS])];
/** The flat bars' v2 layers on (the film) or off (the KEEP-FIRST identity proof). */
const V2 = FLAT_V2;

const MAX_ITEMS = 48;
const MAX_POLYS = 48;
const FRAG_POOL = 160;
const COPY_POOL = 16;
const MAX_BANDS = 8;
/** The copy mask's distance ramp: G falls from 1 at his edge to 0 this many px outside it. */
const RAMP_PX = 12;

// ——— The SDF world ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

const WORLD_VERT = /* glsl */ `
varying vec2 vL;
void main() {
  vL = vec2(position.x + 960.0, 540.0 - position.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const WORLD_FRAG = /* glsl */ `
#define MAXI ${MAX_ITEMS}
#define MAXP ${MAX_POLYS}
uniform vec4 uI[MAXI * 5];
uniform float uCount;
uniform vec4 uP[MAXP * 2];
uniform vec3 uInk;
varying vec2 vL;
float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float sdPoly(int pi, vec2 p) {
  vec2 v[4];
  v[0] = uP[pi * 2].xy; v[1] = uP[pi * 2].zw; v[2] = uP[pi * 2 + 1].xy; v[3] = uP[pi * 2 + 1].zw;
  vec2 c = 0.25 * (v[0] + v[1] + v[2] + v[3]);
  float d = -1e9;
  for (int i = 0; i < 4; i++) {
    vec2 a = v[i];
    vec2 b = v[(i + 1) % 4];
    vec2 e = b - a;
    float l = length(e);
    if (l < 1e-3) continue;
    vec2 n = vec2(e.y, -e.x) / l;
    if (dot(n, c - a) > 0.0) n = -n;
    d = max(d, dot(p - a, n));
  }
  return d;
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdShape(int i, vec2 p) {
  vec4 a = uI[i * 5];
  vec4 b = uI[i * 5 + 1];
  vec4 c = uI[i * 5 + 2];
  float kind = a.x;
  vec2 q = p - b.xy;
  float cs = cos(c.y), sn = sin(c.y);
  float sc = max(c.z, 1e-3);
  q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / sc;
  vec2 hs = b.zw;
  float r = c.x;
  float d;
  if (kind < 1.5) {
    vec2 k = abs(q) - hs + r;
    d = length(max(k, 0.0)) + min(max(k.x, k.y), 0.0) - r;
  } else if (kind < 2.5) {
    d = length(q) - r;
  } else if (kind < 3.5) {
    float A = hs.y - r;
    float w = 6.2831853 * 1.5 / hs.x;
    if (abs(q.x) <= hs.x) {
      float y = A * sin(w * q.x);
      float g = A * w * cos(w * q.x);
      d = abs(q.y - y) / sqrt(1.0 + g * g) - r;
    } else {
      vec2 e = vec2(sign(q.x) * hs.x, A * sin(w * sign(q.x) * hs.x));
      d = length(q - e) - r;
    }
  } else {
    float A = hs.y - r;
    d = 1e9;
    for (int s = 0; s < 4; s++) {
      vec2 p0 = vec2(-hs.x + float(s) * hs.x * 0.5, (s % 2 == 0 ? -A : A));
      vec2 p1 = vec2(-hs.x + float(s + 1) * hs.x * 0.5, (s % 2 == 0 ? A : -A));
      d = min(d, sdSeg(q, p0, p1));
    }
    d -= r;
  }
  return d * sc;
}
float field(int i, vec2 p) {
  vec4 a = uI[i * 5];
  int start = int(a.y + 0.5);
  int count = int(a.z + 0.5);
  float k = a.w;
  float d = 1e9;
  bool any = false;
  for (int j = 0; j < MAXP; j++) {
    if (j >= count) break;
    float dp = sdPoly(start + j, p);
    d = any ? smin(d, dp, k) : dp;
    any = true;
  }
  if (a.x > 0.5) {
    float ds = sdShape(i, p);
    d = any ? smin(d, ds, k) : ds;
  }
  return d;
}
void main() {
  vec2 p = vL;
  float aa = 0.75 * length(fwidth(p));
  int n = int(uCount + 0.5);
  float sh = 0.0;
  for (int i = 0; i < MAXI; i++) {
    if (i >= n) break;
    vec4 e = uI[i * 5 + 4];
    float al = uI[i * 5 + 3].w;
    sh = max(sh, al * clamp(0.5 - field(i, p - e.xy) / aa, 0.0, 1.0));
  }
  vec4 acc = vec4(uInk, 1.0) * sh;
  for (int i = 0; i < MAXI; i++) {
    if (i >= n) break;
    float al = uI[i * 5 + 3].w;
    float d = field(i, p);
    float cov = clamp(0.5 - d / aa, 0.0, 1.0) * al;
    if (cov <= 0.0) continue;
    float ol = uI[i * 5 + 2].w;
    float inner = clamp(0.5 - (d + ol) / aa, 0.0, 1.0);
    vec3 col = mix(uInk, uI[i * 5 + 3].rgb, inner);
    acc = vec4(col, 1.0) * cov + acc * (1.0 - cov);
  }
  if (acc.a <= 0.001) discard;
  gl_FragColor = acc;
}`;

/**
 * v2's world shader (keep-fixer round 1): v04's, plus the re-roll's slot-machine reels (src/shots/breakWorld.ts REEL). Up to four items are
 * reels (uR: item index or −1, position s in symbols, landing symbol, drum shading): their fill is the strip's symbol under each pixel
 * (each symbol the block's height, in the block's own frame), ink lines between symbols, darkened toward the top and bottom like a drum.
 * Every other item takes v04's fill. The v04 bars (FLAT_V2 off) compile WORLD_FRAG itself, untouched.
 */
const REEL_GLSL = /* glsl */ `
uniform vec4 uR[4];
uniform vec3 uRC[16];
uniform float uRLine;
uniform float uRWin;
vec3 reelFill(int i, vec2 p, float aa, vec3 base) {
  vec3 col = base;
  for (int j = 0; j < 4; j++) {
    if (abs(uR[j].x - float(i)) > 0.5) continue;
    vec4 b = uI[i * 5 + 1];
    vec4 c = uI[i * 5 + 2];
    vec2 q = p - b.xy;
    float cs = cos(c.y), sn = sin(c.y);
    float sc = max(c.z, 1e-3);
    q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y) / sc;
    float H = 2.0 * max(b.w, 1e-3);
    float h = H / uRWin;
    float u = uR[j].y - q.y / h + 0.5;
    float k = floor(u);
    float fr = u - k;
    float m = k - 3.0 * floor(k / 3.0);
    vec3 sym = k > uR[j].z - 0.5 ? uRC[j * 4 + 3] : (k < 1.5 || m < 0.5 ? uRC[j * 4] : (m < 1.5 ? uRC[j * 4 + 1] : uRC[j * 4 + 2]));
    float w = uR[j].w;
    float yy = clamp(2.0 * q.y / H, -1.0, 1.0);
    sym *= 1.0 - w * 0.3 * yy * yy;
    sym = mix(sym, vec3(1.0), w * 0.16 * exp(-((yy + 0.5) / 0.16) * ((yy + 0.5) / 0.16)));
    float dl = min(fr, 1.0 - fr) * h * sc;
    col = mix(sym, uInk, w * clamp(0.5 - (dl - 0.5 * uRLine) / aa, 0.0, 1.0));
  }
  return col;
}
void main() {`;
const WORLD_FRAG_V2 = WORLD_FRAG.replace('void main() {', REEL_GLSL).replace(
  'vec3 col = mix(uInk, uI[i * 5 + 3].rgb, inner);',
  'vec3 col = mix(uInk, reelFill(i, p, aa, uI[i * 5 + 3].rgb), inner);',
);
const REEL_SLOTS = 4;
/** How many of the stutter's glitch rows tear the X-ray inside the POV (R-1 condition 1: two per 32nd). */
const POV_TEARS = 2;

// ——— His fragments ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

const FRAG_VERT = /* glsl */ `
uniform mat3 uM;
uniform vec4 uBox;
uniform vec2 uShadow;
varying vec2 vRest;
varying vec2 vWorld;
void main() {
  vRest = uBox.xy + position.xy * uBox.zw;
  vec2 w = (uM * vec3(vRest, 1.0)).xy;
  vWorld = w;
  w += uShadow;
  gl_Position = projectionMatrix * viewMatrix * vec4(w.x - 960.0, 540.0 - w.y, 0.0, 1.0);
}`;
const FRAG_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uTex2;
uniform float uClipY;
uniform vec2 uPoly[4];
uniform float uSeam[4];
uniform float uN;
uniform vec2 uCentre;
uniform vec4 uTile;
uniform vec2 uSheet;
uniform float uMode;
uniform vec3 uTint;
uniform float uAlpha;
uniform vec3 uInk;
uniform vec3 uSeamColor;
uniform float uSeamW;
uniform float uZip;
varying vec2 vRest;
varying vec2 vWorld;
vec4 sampleAt(vec2 rest, bool lower) {
  vec2 o = rest - uTile.xy;
  if (o.x < 0.0 || o.y < 0.0 || o.x > ${TILE.toFixed(1)} || o.y > ${TILE.toFixed(1)}) return vec4(0.0);
  vec2 s = uTile.zw + o;
  vec2 uv = vec2(s.x / uSheet.x, 1.0 - s.y / uSheet.y);
  return lower ? texture2D(uTex2, uv) : texture2D(uTex, uv);
}
void main() {
  int n = int(uN + 0.5);
  float dmin = 1e9;
  float dseam = 1e9;
  for (int i = 0; i < 4; i++) {
    if (i >= n) break;
    vec2 a = uPoly[i];
    vec2 b = uPoly[(i + 1) % n];
    vec2 e = b - a;
    vec2 nn = normalize(vec2(-e.y, e.x));
    if (dot(nn, uCentre - a) < 0.0) nn = -nn;
    float d = dot(vRest - a, nn);
    dmin = min(dmin, d);
    if (uSeam[i] > 0.5) dseam = min(dseam, d);
  }
  float aa = max(fwidth(dmin), 1e-4);
  float cov = clamp(dmin / aa + 0.5, 0.0, 1.0);
  if (cov <= 0.0) discard;
  bool lower = vWorld.y > uClipY;
  vec4 c = sampleAt(vRest, lower);
  if (uMode > 1.5) { gl_FragColor = vec4(uTint, 1.0) * (c.a * cov * uAlpha); return; }
  if (uMode > 0.5) { gl_FragColor = vec4(uInk, 1.0) * (c.a * cov * uAlpha); return; }
  vec4 col = c;
  if (dseam < uSeamW + aa && abs(vRest.x - 960.0) > uZip) {
    float m = c.a;
    for (int k = 0; k < 8; k++) {
      float ang = 0.7853982 * float(k);
      m = max(m, sampleAt(vRest + 2.0 * vec2(cos(ang), sin(ang)), lower).a);
    }
    float s = clamp((uSeamW - dseam) / aa + 0.5, 0.0, 1.0) * smoothstep(0.02, 0.3, m);
    col = mix(col, vec4(uSeamColor, 1.0), s);
  }
  if (col.a * cov <= 0.002) discard;
  gl_FragColor = col * (cov * uAlpha);
}`;

// ——— The repeater's copies ——————————————————————————————————————————————————————————————————————————————————————————————————————

const COPY_VERT = /* glsl */ `
uniform mat3 uM;
varying vec2 vRest;
varying vec2 vWorld;
void main() {
  vRest = position.xy * vec2(1920.0, 1080.0);
  vec2 w = (uM * vec3(vRest, 1.0)).xy;
  vWorld = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w.x - 960.0, 540.0 - w.y, 0.0, 1.0);
}`;
const COPY_FRAG = /* glsl */ `
uniform sampler2D uMask;
uniform vec3 uFill;
uniform vec3 uInk;
uniform float uFillOn;
uniform float uStroke;
uniform float uAlpha;
uniform vec4 uHull;
uniform float uHullR;
varying vec2 vRest;
varying vec2 vWorld;
void main() {
  // R2-03: nothing of a copy inside his plate (the hull of his face core, world layout px): copies show only outside his silhouette.
  vec2 hc = 0.5 * (uHull.xy + uHull.zw);
  vec2 hh = 0.5 * (uHull.zw - uHull.xy);
  vec2 hq = abs(vWorld - hc) - hh + uHullR;
  float hd = length(max(hq, 0.0)) + min(max(hq.x, hq.y), 0.0) - uHullR;
  float outside = clamp(hd / max(fwidth(hd), 1e-4) + 0.5, 0.0, 1.0);
  if (outside <= 0.0) discard;
  vec4 m = texture2D(uMask, vec2(vRest.x / 1920.0, 1.0 - vRest.y / 1080.0));
  float fill = clamp(m.r, 0.0, 1.0);
  // px outside his edge (0 on and inside it), from the mask's distance ramp; the outline is the band d < uStroke.
  float d = ${RAMP_PX.toFixed(1)} * (1.0 - clamp(m.g, 0.0, 1.0));
  float band = clamp(uStroke - d + 0.5, 0.0, 1.0) * (1.0 - fill);
  vec4 c = uFillOn > 0.5 ? vec4(mix(uInk, uFill, fill), 1.0) * clamp(fill + band, 0.0, 1.0) : vec4(uFill, 1.0) * band;
  c *= uAlpha * outside;
  if (c.a <= 0.002) discard;
  gl_FragColor = c;
}`;

// ——— The glitch ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const GLITCH_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform vec4 uBands[${MAX_BANDS}];
uniform float uCount;
varying vec2 vUv;
void main() {
  float y = (1.0 - vUv.y) * 1080.0;
  float dx = 0.0;
  float split = 0.0;
  for (int i = 0; i < ${MAX_BANDS}; i++) {
    if (float(i) >= uCount) break;
    if (y >= uBands[i].x && y < uBands[i].y) { dx = uBands[i].z; split = uBands[i].w; }
  }
  float u = vUv.x - dx / 1920.0;
  float s = split / 1920.0;
  vec4 c = texture2D(uSrc, vec2(u, vUv.y));
  float r = texture2D(uSrc, vec2(u - s, vUv.y)).r;
  float b = texture2D(uSrc, vec2(u + s, vUv.y)).b;
  gl_FragColor = vec4(r, c.g, b, 1.0);
}`;

// Layout px (y down) map to engine units (y up), which mirrors every quad: draw both faces.
const premultiplied = { side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } as const;

type FragMesh = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial };
const affMat3 = (m: readonly number[], out: THREE.Matrix3): THREE.Matrix3 => out.set(m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1);

export class BreakFlat implements BreakPart {
  private back: FlatLayer | null = null;
  private mid: FlatLayer | null = null;
  private heroLayer: FlatLayer | null = null;
  private top: FlatLayer | null = null;
  private screen: FlatLayer | null = null;
  private overlayLayer: FlatLayer | null = null;
  private texLayer: FlatLayer | null = null;
  private maskLayer: FlatLayer | null = null;
  /** v2 only: the back layer (far blobs, floor band, faces behind the world) and the world's decorations (the tofu X), with the v2 jp atlas. */
  private backV2: FlatLayer | null = null;
  private midV2: FlatLayer | null = null;
  private decoV2: FlatLayer | null = null;
  /** v2 only: the guest, a sticker (the jp atlas's brackets and hand, the hero atlas's ω and sparks). */
  private guestV2: FlatLayer | null = null;
  /** v2 only: the work orders and what rides on him (the v2 bold mono atlas), the litter, the screen (cursors' spinners, the marquees), the readouts, the POV's marks. */
  private topV2: FlatLayer | null = null;
  private litterV2: FlatLayer | null = null;
  private screenV2: FlatLayer | null = null;
  private overlayV2: FlatLayer | null = null;
  private povV2: FlatLayer | null = null;
  private polys: PolyField | null = null;
  private povPass: PovPass | null = null;
  private post2: THREE.WebGLRenderTarget | null = null;
  private keep: FragMesh | null = null;
  private adv2: { mono: Advance; monoB: Advance } = { mono: () => 0.6, monoB: () => 0.6 };
  private readonly worldScene = new THREE.Scene();
  private worldMat: THREE.ShaderMaterial | null = null;
  private readonly fragScene = new THREE.Scene();
  private readonly frags: FragMesh[] = [];
  private readonly copyScene = new THREE.Scene();
  private readonly copies: FragMesh[] = [];
  private texA: THREE.WebGLRenderTarget | null = null;
  private texB: THREE.WebGLRenderTarget | null = null;
  private mask: THREE.WebGLRenderTarget | null = null;
  private readonly keys = { a: '', b: '', mask: '' };
  private post: THREE.WebGLRenderTarget | null = null;
  private glitch: FullscreenQuad | null = null;
  private adv: { hero: Advance; mono: Advance; monoB: Advance } = { hero: () => 0.6, mono: () => 0.6, monoB: () => 0.6 };
  private readonly polyCache = new Map<string, ReturnType<typeof fragPolygon>>();
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const hero = buildGlyphAtlas(chars(textsOf('rounded')), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 20, size: 2048 });
    // Radius 20: room for the cast's knock-outs (up to 0.156 em: 7 px round a 52 px dancer).
    const jp = buildGlyphAtlas(JP_FACES, (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 96, radius: 20, size: 4096 });
    const mono = buildGlyphAtlas(chars(textsOf('mono')), (px) => `600 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
    const monoB = buildGlyphAtlas(chars(textsOf('mono')), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
    this.owned.push(hero.texture, jp.texture, mono.texture, monoB.texture);
    this.adv = { hero: advanceOf(hero), mono: advanceOf(mono), monoB: advanceOf(monoB) };
    setHeroAdvance(advanceOf(hero));
    const jpAdv = advanceOf(jp);
    setFaceAdvance((s) => jpAdv(s));
    const aspect = size.width / size.height;
    this.back = new FlatLayer({ atlases: { jp }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
    this.mid = new FlatLayer({ atlases: { jp }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
    this.heroLayer = new FlatLayer({ atlases: { hero }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
    this.top = new FlatLayer({ atlases: { hero, monoB }, blend: 'normal', aspect, shapes: 2048, glyphs: 512 });
    this.screen = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 64 });
    this.overlayLayer = new FlatLayer({ atlases: { mono, monoB }, blend: 'normal', aspect, shapes: 64, glyphs: 1024 });
    this.texLayer = new FlatLayer({ atlases: { hero, monoB }, blend: 'normal', aspect: TILE_SHEET.w / TILE_SHEET.h, shapes: 16, glyphs: 32 });
    this.maskLayer = new FlatLayer({ atlases: { hero }, blend: 'add', aspect, shapes: 8, glyphs: 256 });
    this.owned.push(this.back, this.mid, this.heroLayer, this.top, this.screen, this.overlayLayer, this.texLayer, this.maskLayer);
    if (V2) {
      const jp2 = buildGlyphAtlas(JP_FACES_V2, (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 96, radius: 20, size: 4096 });
      this.owned.push(jp2.texture);
      const jp2Adv = advanceOf(jp2);
      setFaceAdvance((s) => jp2Adv(s));
      this.backV2 = new FlatLayer({ atlases: { jp: jp2 }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
      this.midV2 = new FlatLayer({ atlases: { jp: jp2 }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
      this.decoV2 = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 256 });
      this.guestV2 = new FlatLayer({ atlases: { jp: jp2, hero }, blend: 'normal', aspect, shapes: 64, glyphs: 64 });
      this.owned.push(this.backV2, this.midV2, this.decoV2, this.guestV2);
      // The v2 mono atlases (the work orders, the re-voiced monitor, the POV's labels and readout, the selection's chip), apart from v04's.
      const monoChars = chars([...textsOf('mono'), MONITOR_CHARS_V2, ...ORDER_TEXTS.flat(), ...SIGNATURE.map((_, i) => orderId(i)), ...POV_LOCK_TEXTS, ...POV_LABELS, POV_READOUT]);
      const mono2 = buildGlyphAtlas(monoChars, (px) => `600 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
      const monoB2 = buildGlyphAtlas(monoChars, (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
      this.owned.push(mono2.texture, monoB2.texture);
      this.adv2 = { mono: advanceOf(mono2), monoB: advanceOf(monoB2) };
      setOrderAdvance(this.adv2.monoB('a') * ORDER_TAG.size);
      this.topV2 = new FlatLayer({ atlases: { hero, monoB: monoB2 }, blend: 'normal', aspect, shapes: 2048, glyphs: 1024 });
      this.litterV2 = new FlatLayer({ atlases: { monoB: monoB2 }, blend: 'normal', aspect, shapes: 16, glyphs: 64 });
      this.screenV2 = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 1024 });
      this.overlayV2 = new FlatLayer({ atlases: { mono: mono2, monoB: monoB2 }, blend: 'normal', aspect, shapes: 1024, glyphs: 1024 });
      this.povV2 = new FlatLayer({ atlases: { mono: mono2 }, blend: 'normal', aspect, shapes: 256, glyphs: 512 });
      this.polys = new PolyField(48, aspect);
      this.povPass = new PovPass({ ground: V2_PALETTE.xGround, dark: V2_PALETTE.xDark, light: V2_PALETTE.xLight, ink: V2_PALETTE.xInk, hero: V2_PALETTE.xHero });
      this.owned.push(this.topV2, this.litterV2, this.screenV2, this.overlayV2, this.povV2, this.polys, this.povPass);
    }
    // Render targets in device px: the expression texture's tile sheet (two: the rescan shows one face above its bar, another below),
    // the repeater's mask, and (made on first use) the glitch's copy of the frame.
    const k = size.height / 1080;
    const rt = (w: number, h: number) => new THREE.WebGLRenderTarget(Math.round(w * k), Math.round(h * k), { type: THREE.HalfFloatType, depthBuffer: false });
    this.texA = rt(TILE_SHEET.w, TILE_SHEET.h);
    this.texB = rt(TILE_SHEET.w, TILE_SHEET.h);
    this.mask = rt(1920, 1080);
    this.owned.push(this.texA, this.texB, this.mask);
    // The world: one plane far bigger than any view of it.
    const reelUniforms: Record<string, THREE.IUniform> = V2
      ? {
          uR: { value: Array.from({ length: REEL_SLOTS }, () => new THREE.Vector4(-1, 0, 0, 0)) },
          uRC: { value: Array.from({ length: 4 * REEL_SLOTS }, () => new THREE.Vector3()) },
          uRLine: { value: REEL.line },
          uRWin: { value: REEL.perWindow },
        }
      : {};
    this.worldMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: new Float32Array(MAX_ITEMS * 5 * 4) }, uCount: { value: 0 }, uP: { value: new Float32Array(MAX_POLYS * 2 * 4) }, uInk: { value: new THREE.Vector3() }, ...reelUniforms },
      vertexShader: WORLD_VERT,
      fragmentShader: V2 ? WORLD_FRAG_V2 : WORLD_FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      ...premultiplied,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(9000, 7000), this.worldMat);
    plane.frustumCulled = false;
    this.worldScene.add(plane);
    this.owned.push(plane.geometry, this.worldMat);
    // A unit quad ([0, 1]²) every fragment and copy is drawn on.
    const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
    this.owned.push(quad);
    for (let i = 0; i < FRAG_POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uM: { value: new THREE.Matrix3() },
          uBox: { value: new THREE.Vector4() },
          uShadow: { value: new THREE.Vector2() },
          uTex: { value: this.texA.texture },
          uTex2: { value: this.texB.texture },
          uClipY: { value: 1e9 },
          uPoly: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
          uSeam: { value: [0, 0, 0, 0] },
          uN: { value: 4 },
          uCentre: { value: new THREE.Vector2() },
          uTile: { value: new THREE.Vector4() },
          uSheet: { value: new THREE.Vector2(TILE_SHEET.w, TILE_SHEET.h) },
          uMode: { value: 0 },
          uTint: { value: new THREE.Vector3() },
          uAlpha: { value: 1 },
          uInk: { value: new THREE.Vector3() },
          uSeamColor: { value: new THREE.Vector3() },
          uSeamW: { value: 3 },
          uZip: { value: 0 },
        },
        vertexShader: FRAG_VERT,
        fragmentShader: FRAG_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        ...premultiplied,
      });
      const mesh = new THREE.Mesh(quad, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = i;
      this.fragScene.add(mesh);
      this.frags.push({ mesh, mat });
      this.owned.push(mat);
    }
    for (let i = 0; i < COPY_POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uM: { value: new THREE.Matrix3() }, uMask: { value: this.mask.texture }, uFill: { value: new THREE.Vector3() }, uInk: { value: new THREE.Vector3() }, uFillOn: { value: 1 }, uStroke: { value: 4 }, uAlpha: { value: 1 }, uHull: { value: new THREE.Vector4(1e6, 1e6, -1e6, -1e6) }, uHullR: { value: 0 } },
        vertexShader: COPY_VERT,
        fragmentShader: COPY_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        ...premultiplied,
      });
      const mesh = new THREE.Mesh(quad, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = i;
      this.copyScene.add(mesh);
      this.copies.push({ mesh, mat });
      this.owned.push(mat);
    }
    if (V2) {
      // v2: the ripple's outline crossing the spying guest flashes his amber there (5.4 + 3 → + 6): one more copy, kept inside a circle round the guest.
      const mat = new THREE.ShaderMaterial({
        uniforms: { uM: { value: new THREE.Matrix3() }, uMask: { value: this.mask.texture }, uFill: { value: new THREE.Vector3() }, uInk: { value: new THREE.Vector3() }, uFillOn: { value: 0 }, uStroke: { value: 12 }, uAlpha: { value: 1 }, uHull: { value: new THREE.Vector4(1e6, 1e6, -1e6, -1e6) }, uHullR: { value: 0 }, uKeep: { value: new THREE.Vector3(GUEST_V2.x, GUEST_V2.y, 240) } },
        vertexShader: COPY_VERT,
        fragmentShader: COPY_FRAG.replace('uniform float uHullR;', 'uniform float uHullR;\nuniform vec3 uKeep;').replace('if (outside <= 0.0) discard;', 'if (outside <= 0.0 || length(vWorld - uKeep.xy) > uKeep.z) discard;'),
        depthTest: false,
        depthWrite: false,
        transparent: true,
        ...premultiplied,
      });
      const mesh = new THREE.Mesh(quad, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = COPY_POOL;
      mesh.visible = false;
      this.copyScene.add(mesh);
      this.keep = { mesh, mat };
      this.owned.push(mat);
    }
    this.glitch = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { uSrc: { value: null }, uBands: { value: Array.from({ length: MAX_BANDS }, () => new THREE.Vector4()) }, uCount: { value: 0 } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: GLITCH_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.owned.push(this.glitch);
  }

  // ——— Textures ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

  /** Renders his expression texture into `rt` unless it already holds `tex` (a deterministic cache: the same key draws the same pixels). */
  private drawTex(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, tex: HeroTex, slot: 'a' | 'b'): void {
    if (this.keys[slot] === tex.key) return;
    this.keys[slot] = tex.key;
    const glyphs: Glyph[] = [];
    const digits: Glyph[] = [];
    const under: Shape[] = [];
    const sheet = (g: Parameters<typeof tileOf>[0], x: number, y: number): [number, number] => {
      const t = tileOf(g);
      return [t.sx + (x - t.x0) - TILE_SHEET.w / 2, TILE_SHEET.h / 2 - (t.sy + (y - t.y0))];
    };
    for (const g of tex.glyphs) {
      const [x, y] = sheet(g.group, g.x, g.y);
      const size = g.size * g.sy;
      glyphs.push({ ch: g.ch, x, y, size, stretch: g.stretch / g.sy, rot: (-g.rot * Math.PI) / 180, color: g.fill, outline: g.outlinePx / size, outlineColor: g.outline });
    }
    if (tex.tofu) {
      const t = tex.tofu;
      const [x, y] = sheet('eyeR', t.x, t.y);
      under.push({ kind: 'rect', x, y, w: t.w * t.scale, h: t.h * t.scale, r: 6, color: BREAK_PALETTE.cream, outline: t.outlinePx * t.scale, outlineColor: BREAK_PALETTE.ink });
      t.rows.forEach((row, i) => {
        const cw = this.adv.monoB('0') * t.digitSize * t.scale;
        [...row].forEach((ch, j) => digits.push({ ch, x: x + (j - (row.length - 1) / 2) * cw, y: y + (i === 0 ? 1 : -1) * 0.36 * t.digitSize * t.scale, size: t.digitSize * t.scale, color: BREAK_PALETTE.ink }));
      });
    }
    gl.setRenderTarget(rt);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    this.texLayer!.draw(gl, rt, SHEET_POSE, { under, glyphs: { hero: glyphs, monoB: digits }, over: [] }, null);
  }

  /**
   * Renders the mask of his face core for the repeater, unless it holds that face already: R is the glyphs; G a distance ramp outside
   * them (RAMP_PX passes, each the glyphs dilated one more px, adding 1/RAMP_PX), so a copy draws an outline of any width up to it.
   */
  private drawMask(gl: THREE.WebGLRenderer, f: number): void {
    const core = faceCore(f, V2);
    const key = JSON.stringify(core.map((g) => [g.ch, g.x.toFixed(2), g.y.toFixed(2), g.size.toFixed(2), g.stretch.toFixed(4), g.sy.toFixed(4), g.rot.toFixed(2)]));
    if (this.keys.mask === key) return;
    this.keys.mask = key;
    const glyphs: Glyph[] = [];
    for (const g of core) {
      const size = g.size * g.sy;
      glyphs.push(lGlyph({ ch: g.ch, x: g.x, y: g.y, size, stretch: g.stretch / g.sy, rot: g.rot, color: [1, 0, 0] }));
    }
    const step: RGB = [0, 1 / RAMP_PX, 0];
    for (let k = 1; k <= RAMP_PX; k++) {
      for (const g of core) {
        const size = g.size * g.sy;
        glyphs.push(lGlyph({ ch: g.ch, x: g.x, y: g.y, size, stretch: g.stretch / g.sy, rot: g.rot, color: step, outline: k / size, outlineColor: step }));
      }
    }
    gl.setRenderTarget(this.mask);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    this.maskLayer!.draw(gl, this.mask!, SCREEN, { under: [], glyphs: { hero: glyphs }, over: [] }, null);
  }

  // ——— Drawing ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const cam = flatCam(ctx.cam, V2);
    const pose = camPose(cam);
    const wash = washAt(f);
    const ink = grade(BREAK_PALETTE.ink, wash);
    const hero = heroAt(f, V2);
    this.drawTex(gl, this.texA!, hero.tex, 'a');
    if (hero.texNew) this.drawTex(gl, this.texB!, hero.texNew, 'b');
    const fan = fanAt(f);
    // The ripple's outlines grow fast at first: a third of the frame's shutter keeps them crisp lines, not smears (R1-09).
    const ripple = rippleAt(tighten(f, 0.3));
    if (fan.length > 0 || ripple.length > 0) this.drawMask(gl, f);

    const pov = V2 ? povAt(f) : null;
    // Review round 1, ruling R-1 condition 1 (hand-off H-3; keep-fixer round 1): inside the POV the scanner's refresh tears only two rows
    // per 32nd — the tears were the interlude's one real local strobe (white slices on dark slate). v04's stutter (no POV) is untouched.
    const bands = pov ? glitchAt(frameOf(f)).slice(0, POV_TEARS) : glitchAt(frameOf(f));
    let dst = target;
    if (bands.length > 0 || pov) {
      this.post ??= new THREE.WebGLRenderTarget(target.width, target.height, { type: THREE.HalfFloatType, depthBuffer: false });
      dst = this.post;
      gl.setRenderTarget(dst);
      gl.setClearColor(0x000000, 1);
      gl.clear(true, false, false);
    }

    // 1. The ground and what hides behind the blocks. Every cast face carries a knock-out in the ground's colour (R1-06, R1-07).
    const ground = groundColor(f);
    const behind: Glyph[] = [];
    const front: Glyph[] = [];
    const gasp: Glyph[] = [];
    const knock = (px: number, size: number) => (px > 0 ? { outline: px / size, outlineColor: ground } : {});
    const figure = (fg: Figure, out: Glyph[], washed = 1) => {
      const size = fg.size * fg.sy;
      out.push(lGlyph({ ch: fg.key, x: fg.x, y: fg.y, size, stretch: fg.sx / fg.sy, rot: fg.rot, color: grade(fg.color === 'red' ? BREAK_PALETTE.red : BREAK_PALETTE.ink, wash * washed), ...knock(fg.knock, size) }));
    };
    for (const p of peekAt(f, V2)) {
      const color = grade(p.color === 'red' ? BREAK_PALETTE.red : BREAK_PALETTE.ink, wash);
      if (p.screen) {
        const [x, y] = fromScreen(cam, p.x, p.y);
        const size = p.size / cam.zoom;
        front.push(lGlyph({ ch: p.key, x, y, size, rot: -cam.roll, color, ...knock(p.knock / cam.zoom, size) }));
      } else if (p.parts) for (const q of p.parts) behind.push(lGlyph({ ch: q.key, x: q.x, y: q.y, size: p.size, rot: q.rot, color, ...knock(p.knock, p.size) }));
      else behind.push(lGlyph({ ch: p.key, x: p.x, y: p.y, size: p.size, rot: p.rot, color, ...knock(p.knock, p.size) }));
    }
    // The gasp is the hang's one live reaction: it keeps most of its ink through the wash, and stands over the tags (R1-13).
    for (const s of shockedAt(f)) figure(s, s.behind ? behind : gasp, 0.3);
    for (const d of dancersAt(f, V2)) figure(d, d.behind ? behind : front);
    let camera: THREE.Camera;
    if (V2) {
      // v2: the far blobs (back depth, z −900: real parallax under the dolly camera), the floor band, and the guest behind the world.
      const under: Shape[] = [];
      for (const b of farBlobsAt(f)) under.push(lShape({ kind: 'rect', x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, r: b.r, color: b.color, outline: 3, outlineColor: b.edge }));
      const band = floorBandAt(f);
      if (band) {
        under.push(lShape({ kind: 'rect', x: band.x, y: band.y, w: band.w, h: band.h, r: 0, rot: band.rot, color: grade(V2_PALETTE.floor, wash) }));
        const e = lSegment(band.edge[0][0], band.edge[0][1], band.edge[1][0], band.edge[1][1], FLOOR.edge, ink, FLOOR.edgeAlpha);
        if (e) under.push(e);
      }
      this.backV2!.draw(gl, dst, pose, { under, glyphs: { jp: behind }, over: [] }, { color: ground, grain: 0 });
      camera = this.backV2!.camera;
      const guest = guestAt(f);
      if (guest) this.drawGuest(gl, dst, pose, guest, cam.zoom, wash, ink);
    } else {
      this.back!.draw(gl, dst, pose, { under: [], glyphs: { jp: behind }, over: [] }, { color: ground, grain: 0 });
      camera = this.back!.camera;
    }

    // 2. The world.
    this.drawWorld(gl, dst, camera, f, ink);
    if (V2) {
      // v2: the world's decorations — the tofu block's ink X.
      const deco: Shape[] = [];
      for (const [a, b] of tofuCross(f)) {
        const sg = lSegment(a[0], a[1], b[0], b[1], 10, ink);
        if (sg) deco.push(sg);
      }
      if (deco.length > 0) this.decoV2!.draw(gl, dst, pose, { under: deco, glyphs: {}, over: [] }, null);
      // The litter: the torn work orders lying on the floor (each half its shadow, its paper and, face up, its words), under him.
      for (const l of litterAt(f)) this.drawLitter(gl, dst, pose, l, wash);
    }

    // 3. The repeater's copies (v2: and the ripple's amber flash on the guest).
    if (this.keep) this.keep.mesh.visible = false;
    if (V2 && f >= INFECT_FLASH.from && f < INFECT_FLASH.to + 1 && ripple.length > 0) {
      const c = ripple[0];
      const m = this.keep!.mat;
      affMat3([c.scale, 0, 0, c.scale, c.pivot[0] * (1 - c.scale), c.pivot[1] * (1 - c.scale)], m.uniforms.uM.value as THREE.Matrix3);
      (m.uniforms.uFill.value as THREE.Vector3).set(...BREAK_PALETTE.amber);
      m.uniforms.uStroke.value = Math.min(RAMP_PX, 12 / Math.max(c.scale, 1e-3));
      this.keep!.mesh.visible = true;
    }
    this.drawCopies(gl, dst, camera, fan, ripple, ink, f, hero.plate);

    // 4. Him.
    this.drawFragments(gl, dst, camera, hero, cam.zoom, ink, ground);
    if (hero.glyphs) {
      // While his copies fan and ripple behind him he wears a cream keyline outside his ink outline (a die-cut sticker: the hard
      // shadow is the keyline's), so he stays the one subject over the rainbow (R1-06).
      const shadow: Glyph[] = [];
      const line: Glyph[] = [];
      const body: Glyph[] = [];
      const amber = grade(BREAK_PALETTE.amber, wash);
      const cream = grade(BREAK_PALETTE.cream, wash);
      const off = 14 / cam.zoom;
      const halo = 8 + hero.keyline;
      for (const g of hero.glyphs) {
        const size = g.size * g.sy;
        const base = { ch: g.ch, size, stretch: g.stretch / g.sy, rot: g.rot };
        shadow.push(lGlyph({ ...base, x: g.x + off, y: g.y + off, color: ink, outline: halo / size, outlineColor: ink }));
        if (hero.keyline > 0.05) line.push(lGlyph({ ...base, x: g.x, y: g.y, color: cream, outline: halo / size, outlineColor: cream }));
        body.push(lGlyph({ ...base, x: g.x, y: g.y, color: amber, outline: 8 / size, outlineColor: ink }));
      }
      this.heroLayer!.draw(gl, dst, pose, { under: [], glyphs: { hero: [...shadow, ...line, ...body] }, over: [] }, null);
    }

    // 5. Dancers on the blocks (over him: their knock-outs keep them whole by his brackets' tips), peekers at the frame's edges.
    if (front.length > 0) (V2 ? this.midV2! : this.mid!).draw(gl, dst, pose, { under: [], glyphs: { jp: front }, over: [] }, null);

    // 6. What rides on him, the rings, the tags.
    const fx = heroFx(f, V2);
    const rings: Shape[] = ringsAt(f).map((r) => lShape({ kind: 'ring', x: r.x, y: r.y, w: 2 * r.r, h: 2 * r.r, r: r.width, color: r.color === 'ink' ? ink : BREAK_PALETTE.white, alpha: r.alpha }));
    if (V2) {
      // v2: the antivirus's work orders (red on white, ID chips) instead of the patch tags; the amber sparks of his tears.
      const orders = this.ordersContent(f, wash);
      const sparks = tearSparks(f).map((k) => lGlyph({ ch: SPARKLE, x: k.x, y: k.y, size: 64 * Math.max(0.01, k.s), color: grade(BREAK_PALETTE.amber, wash), outline: 0.08, outlineColor: ink, rot: k.rot }));
      this.topV2!.draw(gl, dst, pose, { under: [...rings, ...orders.under, ...fx.shapes], glyphs: { hero: [...fx.glyphs, ...sparks], monoB: orders.glyphs.monoB ?? [] }, over: [] }, null);
    } else {
      const tags = tagsContent(f, this.adv.monoB);
      this.top!.draw(gl, dst, pose, { under: [...rings, ...tags.under, ...fx.shapes], glyphs: { hero: fx.glyphs, monoB: tags.glyphs.monoB ?? [] }, over: [] }, null);
    }
    if (gasp.length > 0) (V2 ? this.midV2! : this.mid!).draw(gl, dst, pose, { under: [], glyphs: { jp: gasp }, over: [] }, null);

    // 6½ (v2). The antivirus's hand on the screen: the iris marquee, the busy-spinners, the red cursors.
    if (V2) this.drawHand(gl, dst, f);

    // 7. The colour-stack restart wipe, fixed to the screen: one sharp instant per output frame, so its ink edges and hard shadows
    // stay hard while the picture under it keeps its blur (R1-08).
    const panels = wipePanels(f);
    if (panels.length > 0) {
      const under: Shape[] = [];
      for (const p of panels) {
        under.push(lShape({ kind: 'rect', x: (p.x0 + p.x1) / 2, y: 540, w: p.x1 - p.x0, h: 1100, color: BREAK_PALETTE[p.color] }));
        if (p.leading) {
          under.push(lShape({ kind: 'rect', x: p.x1 + 6, y: 540, w: 12, h: 1100, color: BREAK_PALETTE.ink, alpha: 0.9 }));
          under.push(lShape({ kind: 'rect', x: p.x1 - 3, y: 540, w: 6, h: 1100, color: BREAK_PALETTE.ink }));
        }
        // Its trailing ink edge, once it has left the frame's left edge (the stack's creep under the cover, the launch off on break 5.1).
        if (p.x0 > 0.5) under.push(lShape({ kind: 'rect', x: p.x0 + 3, y: 540, w: 6, h: 1100, color: BREAK_PALETTE.ink }));
      }
      this.screen!.draw(gl, dst, SCREEN, { under, glyphs: {}, over: [] }, null);
    }

    // 8. The glitch: slices and an RGB split of the finished picture. v2: inside the POV it slices the X-ray (the scanner's refresh).
    if (dst !== target) {
      let src = dst;
      if (bands.length > 0) {
        const out = pov ? (this.post2 ??= new THREE.WebGLRenderTarget(target.width, target.height, { type: THREE.HalfFloatType, depthBuffer: false })) : target;
        const mat = this.glitch!.mesh.material as THREE.ShaderMaterial;
        mat.uniforms.uSrc.value = src.texture;
        const v = mat.uniforms.uBands.value as THREE.Vector4[];
        bands.slice(0, MAX_BANDS).forEach((b, i) => v[i].set(b.y0, b.y1, b.dx, b.split));
        mat.uniforms.uCount.value = Math.min(bands.length, MAX_BANDS);
        this.glitch!.render(gl, out);
        src = out;
      }
      // 9 (v2). The antivirus's POV: the X-ray above the scanline, then its marks (the scanline, the reticle, the labels, the readout).
      if (pov) {
        this.povPass!.render(gl, src, target, { sweep: pov.sweep ?? 1080, omega: pov.omega, frame: frameOf(f) });
        this.drawPov(gl, target, pov, f);
      }
    }
  }

  // ——— v2 drawing ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

  /** The work orders as world content (the v2 bold mono): shadow, white tag with a 3 px ink border, red words, the ink ID chip, the leader. */
  private ordersContent(f: number, wash: number): FlatContent {
    const P = (c: keyof typeof BREAK_PALETTE): RGB => grade(BREAK_PALETTE[c], wash);
    const under: Shape[] = [];
    const glyphs: Glyph[] = [];
    const cw = this.adv2.monoB('a') * ORDER_TAG.size;
    const T = ORDER_TAG;
    for (const o of ordersAt(f) as OrderDraw[]) {
      if (o.leader) {
        const [a, b] = o.leader;
        const sg = lSegment(a[0], a[1], b[0], b[1], 2, P('ink'));
        if (sg) under.push(sg);
        under.push(lShape({ kind: 'ellipse', x: a[0], y: a[1], w: 10, h: 10, color: P('ink') }));
      }
      const s = o.scale;
      const cx = o.x + o.w / 2;
      const cy = o.y + T.h / 2;
      for (let c = o.copies; c >= 0; c--) {
        const d = 10 * c;
        const x = cx + d + (o.w / 2) * (1 - s) * 0;
        if (o.split && c === o.copies) {
          under.push(lShape({ kind: 'rect', x: x - 6, y: cy + d, w: o.w * s, h: T.h * s, r: 2, color: linearPink, alpha: 0.85 }));
          under.push(lShape({ kind: 'rect', x: x + 6, y: cy + d, w: o.w * s, h: T.h * s, r: 2, color: linearCyan, alpha: 0.85 }));
        }
        under.push(lShape({ kind: 'rect', x: x + T.shadow, y: cy + d + T.shadow, w: o.w * s, h: T.h * s, r: 2, color: P('ink') }));
        under.push(lShape({ kind: 'rect', x, y: cy + d, w: o.w * s, h: T.h * s, r: 2, color: P('white'), outline: T.border, outlineColor: P('ink') }));
        under.push(lShape({ kind: 'rect', x: x + (o.w / 2 - T.chip.right - T.chip.w / 2) * s, y: cy + d, w: T.chip.w * s, h: T.chip.h * s, r: 2, color: P('ink') }));
      }
      const left = cx - (o.w / 2) * s;
      [...o.text].forEach((ch, k) => {
        if (ch !== ' ') glyphs.push(lGlyph({ ch, x: left + (T.pad + (k + 0.5) * cw) * s, y: cy, size: T.size * s, color: ch === '✓' ? P('tick') : P('red') }));
      });
      const chipX = cx + (o.w / 2 - T.chip.right - T.chip.w / 2) * s;
      const icw = this.adv2.monoB('0') * T.chip.size;
      [...o.id].forEach((ch, k) => glyphs.push(lGlyph({ ch, x: chipX + (k - (o.id.length - 1) / 2) * icw * s, y: cy, size: T.chip.size * s, color: P('white') })));
    }
    return { under, glyphs: { monoB: glyphs }, over: [] };
  }

  /** One torn half on the floor: its (4, 4) shadow, its paper (3 px ink edge, the jagged tear included), and face up its words and chip. */
  private drawLitter(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, pose: ReturnType<typeof camPose>, l: Litter, wash: number): void {
    const P = (c: keyof typeof BREAK_PALETTE): RGB => grade(BREAK_PALETTE[c], wash);
    const T = ORDER_TAG;
    const polys: Poly[] = [
      { pts: l.pts, at: [l.x + T.shadow, l.y + T.shadow], rot: l.rot, scale: [l.sx, 1], fill: P('ink') },
      { pts: l.pts, at: [l.x, l.y], rot: l.rot, scale: [l.sx, 1], fill: P('white'), line: T.border, lineColor: P('ink') },
    ];
    this.polys!.draw(gl, dst, pose, polys);
    if (l.sx <= 0.05) return;
    const a = (l.rot * Math.PI) / 180;
    const place = (lx: number, ly: number): [number, number] => [l.x + Math.cos(a) * lx * l.sx - Math.sin(a) * ly, l.y + Math.sin(a) * lx * l.sx + Math.cos(a) * ly];
    const under: Shape[] = [];
    const glyphs: Glyph[] = [];
    for (const c of l.chars) {
      if (c.ch === ' ') continue;
      const [x, y] = place(c.x, 0);
      glyphs.push(lGlyph({ ch: c.ch, x, y, size: T.size, stretch: l.sx, rot: l.rot, color: c.ch === '✓' ? P('tick') : P('red') }));
    }
    if (l.chip) {
      const [x, y] = place(l.chip.x, 0);
      under.push(lShape({ kind: 'rect', x, y, w: T.chip.w * l.sx, h: T.chip.h, r: 2, rot: l.rot, color: P('ink') }));
      const icw = this.adv2.monoB('0') * T.chip.size;
      [...l.chip.id].forEach((ch, k) => {
        const [gx, gy] = place(l.chip!.x + (k - (l.chip!.id.length - 1) / 2) * icw, 0);
        glyphs.push(lGlyph({ ch, x: gx, y: gy, size: T.chip.size, stretch: l.sx, rot: l.rot, color: P('white') }));
      });
    }
    this.litterV2!.draw(gl, dst, pose, { under, glyphs: { monoB: glyphs }, over: [] }, null);
  }

  /** The antivirus's hand on the screen (per sub-frame: it blurs as it moves): the iris marquee, busy-spinners, the cursors with their shadows. */
  /**
   * The guest as a sticker (keep-fixer round 1, F5), behind the world: the burst's rings, then his ink shadow (8 px on screen), the
   * infection's amber halo (12 px outside his ink, over INFECT_FLASH), and his red body with a 5 px ink outline — capsule eyes, bracket and
   * hand glyphs, the hero's amber ω once infected, the burst's sparks; his ▽ is a polygon drawn after (shadow, halo, body).
   */
  private drawGuest(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, pose: ReturnType<typeof camPose>, g: GuestFrame, zoom: number, wash: number, ink: RGB): void {
    const red = grade(BREAK_PALETTE.red, wash);
    const amber = grade(BREAK_PALETTE.amber, wash);
    const ol = GUEST_STICKER.outline / zoom;
    const off = GUEST_STICKER.shadow / zoom;
    const haloW = GUEST_STICKER.halo / zoom;
    const under: Shape[] = [];
    const jp: Glyph[] = [];
    const hero: Glyph[] = [];
    // The burst's rings: amber bands with 3 px ink edges (a sticker's ring, so amber reads on the cream).
    const edge = 3 / zoom;
    for (const r of g.rings) {
      under.push(lShape({ kind: 'ring', x: r.x, y: r.y, w: 2 * (r.r + edge), h: 2 * (r.r + edge), r: r.width + 2 * edge, color: ink, alpha: r.alpha }));
      under.push(lShape({ kind: 'ring', x: r.x, y: r.y, w: 2 * r.r, h: 2 * r.r, r: r.width, color: amber, alpha: r.alpha }));
    }
    for (const layer of ['shadow', 'halo', 'body'] as const) {
      if (layer === 'halo' && g.halo <= 0) continue;
      const d = layer === 'shadow' ? off : 0;
      const grow = layer === 'halo' ? ol + haloW : ol;
      for (const p of g.pieces) {
        if (p.kind === 'glyph') {
          const color = layer === 'shadow' ? ink : layer === 'halo' ? amber : p.color === 'amber' ? amber : red;
          const line = layer === 'halo' ? amber : ink;
          (p.font === 'jp' ? jp : hero).push(lGlyph({ ch: p.key, x: p.x + d, y: p.y + d, size: p.size, rot: p.rot, color, outline: grow / p.size, outlineColor: line }));
        } else if (p.kind === 'bar') {
          const color = layer === 'shadow' ? ink : layer === 'halo' ? amber : red;
          const sg = lSegment(p.a[0] + d, p.a[1] + d, p.b[0] + d, p.b[1] + d, p.width + 2 * grow, color);
          if (sg) under.push(layer === 'body' ? { ...sg, outline: ol, outlineColor: ink } : sg);
        }
      }
    }
    // Sparks: their ink line at most 0.07 em (the hero atlas allows 0.094: past it a ✧ fills its whole quad with ink).
    for (const k of g.sparks) hero.push(lGlyph({ ch: SPARKLE, x: k.x, y: k.y, size: k.size, color: amber, outline: Math.min(ol, 0.07 * k.size) / k.size, outlineColor: ink, rot: k.rot }));
    this.guestV2!.draw(gl, dst, pose, { under, glyphs: { jp, hero }, over: [] }, null);
    const tri = g.pieces.find((p) => p.kind === 'tri');
    if (tri && tri.kind === 'tri') {
      // Rounded 3 px at the corners; the ink line is the outer `ol` of the grown shape.
      const round = 3;
      const polys: Poly[] = [{ pts: tri.pts.map(([x, y]) => [x + off, y + off] as const), at: [0, 0], fill: ink, grow: round + ol }];
      if (g.halo > 0) polys.push({ pts: tri.pts, at: [0, 0], fill: amber, grow: round + ol + haloW });
      polys.push({ pts: tri.pts, at: [0, 0], fill: red, grow: round + ol, line: ol, lineColor: ink });
      this.polys!.draw(gl, dst, pose, polys);
    }
  }

  private drawHand(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, f: number): void {
    const red = BREAK_PALETTE.red;
    const ink = BREAK_PALETTE.ink;
    const under: Shape[] = [];
    const iris = irisMarquee(f);
    if (iris) under.push(...marqueeShapes(iris));
    const polys: Poly[] = [];
    for (const c of cursorsAt(f)) {
      if (c.kind === 'spinner') {
        // A busy-spinner: eight dots round a ring, the head biggest, turning a step every 3 frames.
        for (let k = 0; k < 8; k++) {
          const a = ((k + c.spin) * Math.PI) / 4;
          const r = 9 - k;
          under.push(lShape({ kind: 'ellipse', x: c.x + 26 * Math.cos(a), y: c.y + 26 * Math.sin(a), w: 2 * r + 6, h: 2 * r + 6, color: ink }));
          under.push(lShape({ kind: 'ellipse', x: c.x + 26 * Math.cos(a), y: c.y + 26 * Math.sin(a), w: 2 * r, h: 2 * r, color: red }));
        }
        continue;
      }
      const s = c.scale;
      polys.push({ pts: CURSOR_POLY, at: [c.x + CURSOR_STYLE.shadow, c.y + CURSOR_STYLE.shadow], rot: c.rot, scale: [s, s], fill: ink, grow: CURSOR_STYLE.stroke });
      polys.push({ pts: CURSOR_POLY, at: [c.x, c.y], rot: c.rot, scale: [s, s], fill: red, grow: CURSOR_STYLE.stroke, line: 2 * CURSOR_STYLE.stroke, lineColor: ink });
    }
    if (under.length > 0) this.screenV2!.draw(gl, dst, SCREEN, { under, glyphs: {}, over: [] }, null);
    this.polys!.draw(gl, dst, SCREEN, polys);
  }

  /** The POV's marks over the X-ray (screen): the red scanline (4 px, a soft glow) while it sweeps, the reticle and its lock label, the exploded-view labels, the readout. */
  private drawPov(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pov: Pov, f: number): void {
    const red = BREAK_PALETTE.red;
    const pale = V2_PALETTE.xInk;
    const dark = BREAK_PALETTE.termBg;
    const under: Shape[] = [];
    const glyphs: Glyph[] = [];
    const cw = this.adv2.mono('a');
    if (pov.sweep !== null) {
      under.push(lShape({ kind: 'rect', x: 960, y: pov.sweep - 6, w: 1920, h: 36, color: red, alpha: 0.45, soft: 16 }));
      under.push(lShape({ kind: 'rect', x: 960, y: pov.sweep, w: 1920, h: 4, color: red }));
    }
    for (const l of pov.labels) {
      if (!l.shown) continue;
      const sg = lSegment(l.anchor[0], l.anchor[1], l.at[0], l.at[1], 2, pale);
      if (sg) under.push(sg);
      under.push(lShape({ kind: 'ellipse', x: l.anchor[0], y: l.anchor[1], w: 10, h: 10, color: pale }));
      const w = [...l.text].length * cw * 20 + 16;
      under.push(lShape({ kind: 'rect', x: l.at[0], y: l.at[1], w, h: 32, r: 2, color: dark, alpha: 0.85, outline: 2, outlineColor: pale }));
      [...l.shown].forEach((ch, k) => ch !== ' ' && glyphs.push(lGlyph({ ch, x: l.at[0] - w / 2 + 8 + (k + 0.5) * cw * 20, y: l.at[1], size: 20, color: pale })));
    }
    const R = pov.reticle;
    under.push(lShape({ kind: 'ring', x: R.x, y: R.y, w: 2 * R.r, h: 2 * R.r, r: 3, color: red }));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const sg = lSegment(R.x + dx * (R.r - 18), R.y + dy * (R.r - 18), R.x + dx * (R.r + 18), R.y + dy * (R.r + 18), 3, red);
      if (sg) under.push(sg);
    }
    const b = R.r + 26;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      for (const sg of [lSegment(R.x + sx * b, R.y + sy * b, R.x + sx * (b - 34), R.y + sy * b, 3, red), lSegment(R.x + sx * b, R.y + sy * b, R.x + sx * b, R.y + sy * (b - 34), 3, red)]) if (sg) under.push(sg);
    }
    under.push(lShape({ kind: 'ellipse', x: R.x, y: R.y, w: 8, h: 8, color: red }));
    const lw = [...R.label].length * cw * 20 + 16;
    const lx = R.x + b + 8 + lw / 2;
    const ly = R.y + b - 16;
    under.push(lShape({ kind: 'rect', x: lx, y: ly, w: lw, h: 32, r: 2, color: dark, alpha: 0.9, outline: 2, outlineColor: red }));
    [...R.label].forEach((ch, k) => ch !== ' ' && glyphs.push(lGlyph({ ch, x: lx - lw / 2 + 8 + (k + 0.5) * cw * 20, y: ly, size: 20, color: red })));
    if (pov.readout) {
      const rw = [...POV_READOUT].length * cw * 22 + 20;
      under.push(lShape({ kind: 'rect', x: 46 + rw / 2, y: 1020, w: rw, h: 38, r: 2, color: dark, alpha: 0.9, outline: 2, outlineColor: red }));
      [...pov.readout].forEach((ch, k) => ch !== ' ' && glyphs.push(lGlyph({ ch, x: 56 + (k + 0.5) * cw * 22, y: 1020, size: 22, color: red })));
    }
    void f;
    this.povV2!.draw(gl, target, SCREEN, { under, glyphs: { mono: glyphs }, over: [] }, null);
  }

  private drawWorld(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, camera: THREE.Camera, f: number, ink: RGB): void {
    const w = worldAt(f, V2);
    const mat = this.worldMat!;
    const I = mat.uniforms.uI.value as Float32Array;
    const Pa = mat.uniforms.uP.value as Float32Array;
    const n = Math.min(w.items.length, MAX_ITEMS);
    for (let i = 0; i < n; i++) {
      const it = w.items[i];
      const o = i * 20;
      const start = it.polys.length > 0 ? it.polys[0] : 0;
      I.set([it.shape, start, it.polys.length, it.k], o);
      I.set([it.x, it.y, it.hx, it.hy], o + 4);
      I.set([it.r, (it.rot * Math.PI) / 180, it.scale, it.outline], o + 8);
      I.set([it.color[0], it.color[1], it.color[2], it.alpha], o + 12);
      I.set([it.shadow[0], it.shadow[1], 0, 0], o + 16);
    }
    w.polys.slice(0, MAX_POLYS).forEach((p, j) => {
      const q = p.length === 3 ? [...p, p[2]] : p;
      Pa.set([q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]], j * 8);
    });
    mat.uniforms.uCount.value = n;
    (mat.uniforms.uInk.value as THREE.Vector3).set(...ink);
    if (V2) {
      // The re-roll's reels: which items spin (up to REEL_SLOTS) and the four strips' colours.
      const R = mat.uniforms.uR.value as THREE.Vector4[];
      const C = mat.uniforms.uRC.value as THREE.Vector3[];
      const strips = reelColors(f);
      let slot = 0;
      for (let i = 0; i < n && slot < REEL_SLOTS; i++) {
        const r = w.items[i].reel;
        if (!r) continue;
        R[slot].set(i, r.s, r.land, r.shade);
        for (let k = 0; k < 4; k++) C[slot * 4 + k].set(...strips[r.strip * 4 + k]);
        slot++;
      }
      for (; slot < REEL_SLOTS; slot++) R[slot].set(-1, 0, 0, 0);
    }
    mat.uniformsNeedUpdate = true;
    this.renderScene(gl, dst, this.worldScene, camera);
  }

  private drawCopies(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, camera: THREE.Camera, fan: Copy[], ripple: Copy[], ink: RGB, f: number, plate: HeroPlate | null): void {
    const all = [...fan, ...ripple].map((c) => ({ c }));
    if (all.length === 0) return;
    const wash = washAt(f);
    this.copies.forEach(({ mesh, mat }, i) => {
      const e = all[i];
      mesh.visible = e !== undefined;
      if (!e) return;
      const { c } = e;
      // Turn by `angle` (clockwise) about the pivot, or scale about it.
      const a = (c.angle * Math.PI) / 180;
      const [px, py] = c.pivot;
      const s = c.scale;
      const m = [s * Math.cos(a), s * Math.sin(a), -s * Math.sin(a), s * Math.cos(a), 0, 0];
      m[4] = px - (m[0] * px + m[2] * py);
      m[5] = py - (m[1] * px + m[3] * py);
      affMat3(m, mat.uniforms.uM.value as THREE.Matrix3);
      (mat.uniforms.uFill.value as THREE.Vector3).set(...grade(BREAK_PALETTE[c.color], wash));
      (mat.uniforms.uInk.value as THREE.Vector3).set(...ink);
      mat.uniforms.uFillOn.value = c.fill ? 1 : 0;
      // The stroke is given on screen; the mask is drawn at his size, so a grown copy's band is narrowed by its scale.
      mat.uniforms.uStroke.value = Math.min(RAMP_PX, c.stroke / Math.max(c.scale, 1e-3));
      mat.uniforms.uAlpha.value = c.alpha;
      if (plate) (mat.uniforms.uHull.value as THREE.Vector4).set(plate.x0, plate.y0, plate.x1, plate.y1);
      else (mat.uniforms.uHull.value as THREE.Vector4).set(1e6, 1e6, -1e6, -1e6);
      mat.uniforms.uHullR.value = plate ? plate.r : 0;
    });
    this.renderScene(gl, dst, this.copyScene, camera);
  }

  private polygon(k: number, gap: number): ReturnType<typeof fragPolygon> {
    const key = `${k}:${gap}`;
    let p = this.polyCache.get(key);
    if (!p) {
      p = fragPolygon(FRAGMENTS.find((q) => q.k === k)!, gap);
      this.polyCache.set(key, p);
    }
    return p;
  }

  private drawFragments(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, camera: THREE.Camera, hero: ReturnType<typeof heroAt>, zoom: number, ink: RGB, ground: RGB): void {
    // Copies; then every piece's (14, 14) shadow; then each piece's whole silhouette in the ground's colour, so the shadows fall only
    // outside him and his seams' gaps show the ground; then the pieces.
    const draws: { d: FragDraw; mode: number }[] = [
      ...hero.tints.map((d) => ({ d, mode: 2 })),
      ...hero.frags.map((d) => ({ d, mode: 1 })),
      ...hero.frags.map((d) => ({ d: { ...d, gap: 0, tint: ground }, mode: 2 })),
      // A piece with a tint is drawn flat in it (break 4.3&'s one white frame of the popping eye).
      ...hero.frags.map((d) => ({ d, mode: d.tint ? 2 : 0 })),
    ];
    if (draws.length === 0) return;
    const white = BREAK_PALETTE.white;
    const shadow = 14 / zoom;
    this.frags.forEach(({ mesh, mat }, i) => {
      const e = draws[i];
      mesh.visible = e !== undefined;
      if (!e) return;
      const { d, mode } = e;
      const fr = FRAGMENTS.find((q) => q.k === d.k)!;
      const poly = this.polygon(d.k, d.gap);
      const u = mat.uniforms;
      affMat3(d.m, u.uM.value as THREE.Matrix3);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const P = u.uPoly.value as THREE.Vector2[];
      let cx = 0;
      let cy = 0;
      poly.pts.forEach(([x, y], j) => {
        P[j].set(x, y);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
        cx += x / poly.pts.length;
        cy += y / poly.pts.length;
      });
      (u.uBox.value as THREE.Vector4).set(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
      (u.uCentre.value as THREE.Vector2).set(cx, cy);
      u.uN.value = poly.pts.length;
      u.uSeam.value = [0, 1, 2, 3].map((j) => (poly.seams[j] && (d.gap > 0 || d.seam === 'white') ? 1 : 0));
      const t = tileOf(fr.group);
      (u.uTile.value as THREE.Vector4).set(t.x0, t.y0, t.sx, t.sy);
      u.uMode.value = mode;
      (u.uShadow.value as THREE.Vector2).set(mode === 1 ? shadow : 0, mode === 1 ? shadow : 0);
      (u.uTint.value as THREE.Vector3).set(...(d.tint ?? ink));
      u.uAlpha.value = d.alpha;
      (u.uInk.value as THREE.Vector3).set(...ink);
      (u.uSeamColor.value as THREE.Vector3).set(...(d.seam === 'white' ? white : ink));
      u.uSeamW.value = d.seamWidth;
      u.uZip.value = d.zip;
      u.uClipY.value = hero.texNew ? hero.clipY : 1e9;
      mesh.renderOrder = i;
    });
    this.renderScene(gl, dst, this.fragScene, camera);
  }

  private renderScene(gl: THREE.WebGLRenderer, dst: THREE.WebGLRenderTarget, scene: THREE.Scene, camera: THREE.Camera): void {
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(dst);
    gl.render(scene, camera);
    gl.autoClear = auto;
  }

  /** The party monitor and the callout, fixed to the screen, over the summed frame. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    if (V2) {
      // v2: the re-voiced monitor; the antivirus's selection (its dim, its ants, its handles) and T8 instead of the callout.
      const m = monitorContentV2(frame, this.adv2.mono);
      const sel = selectMarquee(frame);
      const under: Shape[] = [...(sel ? marqueeShapes(sel) : []), ...m.under];
      const glyphs: Glyph[] = [];
      const chip = selectChip(frame);
      if (chip) {
        const T = ORDER_TAG;
        const cw = this.adv2.monoB('a') * T.size;
        const w = [...chip.full].length * cw + T.tail;
        const cy = chip.y + T.h / 2;
        under.push(lShape({ kind: 'rect', x: chip.x + w / 2 + T.shadow, y: cy + T.shadow, w, h: T.h, r: 2, color: BREAK_PALETTE.ink }));
        under.push(lShape({ kind: 'rect', x: chip.x + w / 2, y: cy, w, h: T.h, r: 2, color: BREAK_PALETTE.white, outline: T.border, outlineColor: BREAK_PALETTE.ink }));
        under.push(lShape({ kind: 'rect', x: chip.x + w - T.chip.right - T.chip.w / 2, y: cy, w: T.chip.w, h: T.chip.h, r: 2, color: BREAK_PALETTE.ink }));
        [...chip.text].forEach((ch, k) => {
          if (ch !== ' ') glyphs.push(lGlyph({ ch, x: chip.x + T.pad + (k + 0.5) * cw, y: cy, size: T.size, color: BREAK_PALETTE.red }));
        });
        const icw = this.adv2.monoB('0') * T.chip.size;
        [...chip.id].forEach((ch, k) => glyphs.push(lGlyph({ ch, x: chip.x + w - T.chip.right - T.chip.w / 2 + (k - (chip.id.length - 1) / 2) * icw, y: cy, size: T.chip.size, color: BREAK_PALETTE.white })));
      }
      if (under.length === 0) return;
      this.overlayV2!.draw(gl, target, SCREEN, { under, glyphs: { mono: m.glyphs.mono ?? [], monoB: glyphs }, over: [] }, null);
      return;
    }
    const m = monitorContent(frame, this.adv.mono);
    const c = calloutContent(frame, this.adv.monoB);
    if (m.under.length + c.under.length === 0) return;
    const content: FlatContent = { under: [...c.under, ...m.under], glyphs: { mono: m.glyphs.mono ?? [], monoB: c.glyphs.monoB ?? [] }, over: [] };
    this.overlayLayer!.draw(gl, target, SCREEN, content, null);
  }

  look(): Look {
    return BREAK_LOOK;
  }

  temporal(frame: number): Temporal {
    return flatTemporal(frame, V2);
  }

  segment(frame: number): Segment {
    return flatSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.post?.dispose();
    this.post2?.dispose();
  }
}

/** The RGB split of T7's copy burst (the terminal's pink and a cyan), as v04's tags. */
const linearPink = linear('#FF5FA2');
const linearCyan = linear('#3FE0FF');
/** A marquee as screen shapes: the 15 % dim outside it, its red marching ants (4 px), its white handles (14 px, a 3 px red edge). */
export function marqueeShapes(m: Marquee): Shape[] {
  const out: Shape[] = [];
  const black: RGB = [0, 0, 0];
  if (m.dim > 0 && m.rect) {
    const c = m.rect;
    out.push(lShape({ kind: 'rect', x: 960, y: c.y0 / 2, w: 1920, h: c.y0, color: black, alpha: m.dim }));
    out.push(lShape({ kind: 'rect', x: 960, y: (c.y1 + 1080) / 2, w: 1920, h: 1080 - c.y1, color: black, alpha: m.dim }));
    out.push(lShape({ kind: 'rect', x: c.x0 / 2, y: (c.y0 + c.y1) / 2, w: c.x0, h: c.y1 - c.y0, color: black, alpha: m.dim }));
    out.push(lShape({ kind: 'rect', x: (c.x1 + 1920) / 2, y: (c.y0 + c.y1) / 2, w: 1920 - c.x1, h: c.y1 - c.y0, color: black, alpha: m.dim }));
  }
  for (const [a, b] of m.dashes) {
    const sg = lSegment(a[0], a[1], b[0], b[1], 4, BREAK_PALETTE.red);
    if (sg) out.push(sg);
  }
  for (const h of m.handles) out.push(lShape({ kind: 'rect', x: h.x, y: h.y, w: 14 * h.s, h: 14 * h.s, color: BREAK_PALETTE.white, outline: 3, outlineColor: BREAK_PALETTE.red }));
  return out;
}

