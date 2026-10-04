// The transition's screen-space light on the GPU (the part 'transition'; pure maths in src/shots/transitionGate.ts): two fullscreen
// passes composited premultiplied-over (an opaque paint and an added light in one pass). `under` draws what lies behind the films: the
// press passes' printed space (each pass's dark ground inside its front, the paper outside it left to the page drawn before; paper
// specks; in the vacuum the specks drift inward) and the sun as light (its glow, the yellow disc, the pink core, the white-hot middle,
// a faint keyline). `over` draws the lens over them: the flare (a paper knock-out in print, a white line of light behind the passes),
// the four Riso hexagon ghosts on its axis, the sun's singing rings; on 2.4 the ✦ cross (the frozen flat page squashed into a slit,
// hotter as it narrows, with its pink and blue fringes, crossed by the flare) and on 2.4& the point (the core, the warm halo, a faint ✦).
// Light is drawn as optics, not as flat shapes: the sun as light has a corona hugging its limb and a radial heat; the flare (as light)
// and both arms of the ✦ taper to their tips; the crossing and the point burn with a white-hot glare (an inverse-square core).
// Logical px, origin at the frame centre, y up.
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { HEX } from '../shots/cosmosKit.ts';
import type { GateFrame } from '../shots/transitionGate.ts';
import { GROUND_HEX } from '../shots/transitionGate.ts';
import { SCREEN } from '../worlds/riso.ts';

const v3 = (hex: string, k = 1): THREE.Vector3 => new THREE.Vector3(...(linear(hex, k) as [number, number, number]));

/** v07, the slam: the squashed page's light (1 whole, rising as it narrows: width^−½, so it heads for the slit's heat without blowing out). */
export const squashGain = (width: number): number => Math.max(width, 1e-3) ** -0.5;

const COMMON = /* glsl */ `
  #define PI 3.14159265
  varying vec2 vUv;
  uniform vec2 uLogical;   // 1920, 1080
  uniform float uDpl;      // device px per logical px
  float hash2(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  // Coverage of a disc of radius r at distance d (px, anti-aliased over one device px).
  float disc(float d, float r) { return clamp((r - d) * uDpl + 0.5, 0.0, 1.0); }
  float band(float x, float a, float b) { return clamp((x - a) * uDpl + 0.5, 0.0, 1.0) * clamp((b - x) * uDpl + 0.5, 0.0, 1.0); }
  // The engine's soft light sprite (the prototype's blob): the colour at the centre, 60 % by a quarter of the radius, 0 at it.
  float blob(float d, float r) {
    float t = d / max(r, 1e-3);
    return t >= 1.0 ? 0.0 : t < 0.25 ? mix(1.0, 0.6, t / 0.25) : 0.6 * (1.0 - (t - 0.25) / 0.75);
  }
  void over(inout vec4 acc, vec3 col, float a) { acc = vec4(acc.rgb * (1.0 - a) + col * a, acc.a * (1.0 - a) + a); }
`;

const UNDER_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec4 uFront;     // radius, inner dark (0/1), outer dark (0/1), -
  uniform vec3 uGroundIn;
  uniform vec3 uGroundOut;
  uniform vec2 uVP;
  uniform vec4 uSpecks;    // alpha, scale, density (share of the cells with a speck), -
  uniform vec3 uPaper;
  uniform vec4 uSunA;      // x, y, r (yellow), core r
  uniform vec4 uSunB;      // pink dx, dy, yellow dx, dy
  uniform vec4 uSunC;      // yellow alpha, pink alpha, white r, white alpha
  uniform vec4 uSunD;      // hot, on (light mode), keyline r, keyline alpha
  uniform vec3 uSunCol[7]; // yellow, yellow hot, pink, pink hot, white, glow, keyline
  uniform vec2 uWhich;     // draw the printed space, draw the sun (the films' ink prints between the two)
  void main() {
    vec2 p = (vUv - 0.5) * uLogical;
    float inside = length(p - uVP) < uFront.x ? 1.0 : 0.0;
    float dark = mix(uFront.z, uFront.y, inside);
    vec3 ground = mix(uGroundOut, uGroundIn, inside);
    vec4 acc = vec4(0.0);
    if (dark > 0.5 && uWhich.x > 0.5) {
      // Printed space: the pass's paper, with the paper's specks (a faint printed starfield), drifting inward as the vacuum breathes.
      vec2 s = p / uSpecks.y / 10.0;
      vec2 cell = floor(s);
      float h = hash2(cell + 17.0);
      vec2 at = cell + 0.2 + 0.6 * vec2(hash2(cell + 3.1), hash2(cell + 9.7));
      float r = (0.1 + 0.13 * h);
      float sp = clamp((r - length(s - at)) * 10.0 * uSpecks.y * uDpl + 0.5, 0.0, 1.0) * (0.12 + 0.6 * h * h * h);
      sp *= step(hash2(cell + 41.0), uSpecks.z);
      acc = vec4(ground + uPaper * sp * uSpecks.x, 1.0);
    }
    if (uSunD.y > 0.5 && uWhich.y > 0.5) {
      vec2 c = uSunA.xy;
      float R = uSunA.z;
      float hot = uSunD.x;
      // The glow, then the discs (painted), then the white-hot middle.
      // A corona hugging the limb (light, not a brown wash on the dark) and a faint wide glow.
      float dl = max(length(p - c) - R, 0.0);
      acc.rgb += uSunCol[5] * ((0.5 + 0.4 * hot) * exp(-dl / (0.1 * R + 4.0)) + 0.03 * blob(length(p - c), 2.0 * R));
      // Each plate glows hotter toward the middle (a lamp, not a sticker).
      float dy = length(p - c - uSunB.zw);
      over(acc, mix(uSunCol[0], uSunCol[1], step(0.5, hot)) * (0.8 + 0.7 * pow(max(0.0, 1.0 - dy / max(R, 1.0)), 1.5)), disc(dy, R) * uSunC.x);
      float dp = length(p - c - uSunB.xy);
      over(acc, mix(uSunCol[2], uSunCol[3], step(0.5, hot)) * (0.85 + 0.8 * pow(max(0.0, 1.0 - dp / max(uSunA.w, 1.0)), 1.5)), disc(dp, uSunA.w * 1.03) * uSunC.y);
      over(acc, uSunCol[4], disc(length(p - c), uSunC.z) * uSunC.w);
      // A faint keyline of light round it.
      float k = clamp(1.0 - abs(length(p - c) - uSunD.z) / 3.0, 0.0, 1.0) * uSunD.w;
      acc.rgb += uSunCol[6] * k;
    }
    gl_FragColor = acc;
  }`;

const OVER_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uPaper;
  uniform vec3 uWhite;
  uniform vec3 uCore;
  uniform vec4 uFlare;     // half, width, on, light (0 paper knock-out, 1 light)
  uniform float uFlareGlow; // its soft glow round the streak (light)
  uniform vec4 uGhost[4];  // x, r, alpha, plate
  uniform vec3 uGhostInk[4];
  uniform float uGhostAngle[4];
  uniform vec4 uRing[4];   // r, width, alpha, on
  uniform vec4 uRingC;     // centre x, y, light, -
  uniform vec3 uRingInk;   // the print's orange (#F16944)
  uniform vec3 uRingLight; // #FFE6B0 as light
  uniform vec4 uSlit;      // width, half, on, gain
  uniform vec4 uSlitF;     // flare half, flare width, sun r, -
  uniform sampler2D uFrozen;
  uniform vec4 uPoint;     // dx, dy, halo, on
  uniform vec4 uPointB;    // star angle, breath, -, -
  uniform vec3 uFringeL;
  uniform vec3 uFringeR;
  uniform vec4 uChase[3];  // centre x, y, half w, half h
  uniform vec4 uChaseB[3]; // turn, rule width, hot, light
  uniform vec4 uRim;       // the press front's edge: radius, alpha, vanishing point x, y
  uniform vec4 uSquash;    // v07 the slam: the page's width (share of the frame), on, gain, -
  uniform vec4 uPlate[3];  // v07 the vacuum's plate rings: centre x, y, radius, alpha
  uniform vec3 uPlateInk[3];

  float hexagon(vec2 p, float R) {
    // A regular hexagon, pointy top (circumradius R): iq's flat-top SDF with x and y swapped.
    vec2 q = abs(p.yx);
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    float r = R * 0.866025404;
    q -= 2.0 * min(dot(k.xy, q), 0.0) * k.xy;
    q -= vec2(clamp(q.x, -k.z * r, k.z * r), r);
    return length(q) * sign(q.y);
  }
  float halftone(vec2 p, float tint, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 q = mat2(c, -s, s, c) * p / ${SCREEN.pitch.toFixed(1)};
    vec2 cell = fract(q) - 0.5;
    return clamp((sqrt(tint / PI) - length(cell)) * ${SCREEN.pitch.toFixed(1)} * uDpl + 0.5, 0.0, 1.0);
  }
  // A streak's profile along it: 1 at its middle, 0 at ±half (the tips of a lens's light taper, they do not end square).
  float taper(float x, float hl) {
    float t = clamp(abs(x) / max(hl, 1e-3), 0.0, 1.0);
    return pow(1.0 - t * t, 0.8);
  }
  // White-hot glare round a point of light: a sharp inverse-square core of radius r0 and a soft exponential bloom of radius r1.
  float glare(float d, float r0, float r1) { return 1.0 / (1.0 + (d / r0) * (d / r0)) + 0.3 * exp(-d / r1); }
  // A four-point star (the ✦: an astroid), radius R, turned a.
  // A glint ✦ of four thin rays (a glint, not a shape): each 3 px wide at the root, tapering to nothing at R, turned a.
  float star(vec2 p, float R, float a) {
    float c = cos(a);
    float s = sin(a);
    vec2 q = abs(mat2(c, -s, s, c) * p);
    float g = 0.0;
    for (int k = 0; k < 2; k++) {
      vec2 v = k == 0 ? q : q.yx;
      float t = clamp(v.x / R, 0.0, 1.0);
      float hw = 1.5 * (1.0 - t);
      g = max(g, clamp((hw - v.y) * uDpl + 0.5, 0.0, 1.0) * (1.0 - t) * step(v.x, R));
    }
    return g;
  }
  vec3 frozenColumn(float u0, float u1, float v) {
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float u = mix(u0, u1, (float(i) + 0.5) / 16.0);
      sum += textureLod(uFrozen, vec2(u, v), 0.0).rgb;
    }
    return sum / 16.0;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uLogical;
    vec4 acc = vec4(0.0);
    // v07, the slam: the frozen flat page squashed sideways about the axis (opaque over the printed space; whole at width 1), its light
    // gathering as it narrows, toward the slit's.
    if (uSquash.y > 0.5) {
      float s = max(uSquash.x, 1e-3);
      if (abs(p.x) < 0.5 * uLogical.x * s) {
        float u = 0.5 + p.x / (uLogical.x * s);
        float du = 0.5 / (uDpl * uLogical.x * s);
        vec3 col = frozenColumn(u - du, u + du, vUv.y) * uSquash.z;
        over(acc, col, 1.0);
      }
    }
    // The rings the sun sings (paint in print; light behind the passes).
    for (int i = 0; i < 4; i++) {
      vec4 r = uRing[i];
      if (r.w < 0.5) continue;
      float d = abs(length(p - uRingC.xy) - r.x);
      float c = clamp((r.y * 0.5 - d) * uDpl + 0.5, 0.0, 1.0) * r.z;
      if (uRingC.z > 0.5) acc.rgb += uRingLight * c;
      else over(acc, uRingInk, c);
    }
    // The press front's edge: the roller's line of light running out from the sun to the corners.
    if (uRim.y > 0.0) {
      float d = abs(length(p - uRim.zw) - uRim.x);
      acc.rgb += uPaper * 0.7 * uRim.y * clamp((2.0 - d) * uDpl + 0.5, 0.0, 1.0);
    }
    // The chase light: a lit film's rule, a paper-white rectangle racing from the sun to the lens.
    for (int i = 0; i < 3; i++) {
      vec4 r = uChase[i];
      vec4 b = uChaseB[i];
      if (b.z <= 0.0) continue;
      float c = cos(b.x);
      float s = sin(b.x);
      vec2 q = mat2(c, -s, s, c) * (p - r.xy);
      float d = abs(max(abs(q.x) - r.z, abs(q.y) - r.w));
      float hw = max(0.25 * b.y, 0.6 / uDpl);
      float a = clamp((hw - d) * uDpl + 0.5, 0.0, 1.0) * b.z;
      if (b.w > 0.5) acc.rgb += uPaper * 1.4 * a;
      else over(acc, uPaper, 0.92 * a);
    }
    // The ghosts: hexagons of halftone light along the flare's axis.
    for (int i = 0; i < 4; i++) {
      vec4 g = uGhost[i];
      if (g.z <= 0.0) continue;
      vec2 q = p - vec2(g.x, 0.0);
      float h = clamp(-hexagon(q, g.y) * uDpl + 0.5, 0.0, 1.0);
      if (h <= 0.0) continue;
      acc.rgb += uGhostInk[i] * halftone(q, 0.45, uGhostAngle[i]) * h * g.z * 1.4;
    }
    // The flare: the lens's horizontal line through the sun.
    if (uFlare.z > 0.5) {
      float core = band(p.x, -uFlare.x, uFlare.x) * band(p.y, -uFlare.y * 0.5, uFlare.y * 0.5);
      if (uFlare.w < 0.5) over(acc, uPaper, 0.95 * core);
      else {
        // As light it is an anamorphic streak: hottest and thickest through the sun, tapering to its tips.
        float tp = taper(p.x, uFlare.x);
        float w = uFlare.y * (0.4 + 0.6 * tp);
        float hot = band(p.y, -0.5 * w, 0.5 * w) * (0.45 + 0.55 * tp) * step(abs(p.x), uFlare.x);
        float soft = taper(p.x, uFlare.x * 1.1) * clamp(1.0 - abs(p.y) / (uFlare.y * 2.0), 0.0, 1.0);
        acc.rgb += uWhite * (2.2 * hot + uFlareGlow * soft);
      }
    }
    // The ✦ cross: the frozen flat page squashed into a vertical slit (both copies added, hotter as it narrows), the fringes, the flare.
    if (uSlit.z > 0.5) {
      float W = uSlit.x;
      float H = uSlit.y;
      if (abs(p.y) < H) {
        float v = 0.5 + p.y / (2.0 * H);
        float du = 0.5 / (uDpl * 3.0 * W);
        vec3 col = vec3(0.0);
        if (abs(p.x) < 1.5 * W) {
          float u = 0.5 + p.x / (3.0 * W);
          col += frozenColumn(u - du, u + du, v);
        }
        if (abs(p.x) < 0.5 * W) {
          float u = 0.5 + p.x / W;
          col += frozenColumn(u - 3.0 * du, u + 3.0 * du, v);
        }
        // The slit's light tapers to its tips like the flare's: the two arms of one ✦.
        float ty = taper(p.y, H);
        col *= uSlit.w * (0.25 + 0.75 * ty);
        float m = max(col.r, max(col.g, col.b));
        col = mix(col, vec3(m), clamp((m - 1.0) / 3.0, 0.0, 0.8));
        acc.rgb += col;
        acc.rgb += (uFringeL * 2.0 * band(p.x, -0.5 * W - 2.0, -0.5 * W) + uFringeR * 2.0 * band(p.x, 0.5 * W, 0.5 * W + 2.0)) * (0.3 + 0.7 * ty);
        acc.rgb += uWhite * 2.0 * band(p.x, -0.25 * W, 0.25 * W) * ty;
      }
      // The crossing burns white-hot: a glare whose core tightens with the cross.
      acc.rgb += uCore * 0.9 * glare(length(p), 4.0 + 0.012 * uSlitF.x, 0.08 * uSlitF.x);
      float tf = taper(p.x, uSlitF.x);
      float fw = uSlitF.y * (0.35 + 0.65 * tf);
      float fl = band(p.y, -0.5 * fw, 0.5 * fw) * tf;
      float fs = band(p.y, -1.5 * fw, 1.5 * fw) * tf;
      acc.rgb += uWhite * (1.6 * fl + 0.25 * fs);
      over(acc, uWhite * 2.2, disc(length(p), uSlitF.z));
    }
    // v07, the inhale: the sun's three shed plates as guilloche rings of light (two interlaced rules, nine lobes of ±9 px: the bang's
    // shock ring's at its 300 px start), misregistered, converging on the point.
    for (int i = 0; i < 3; i++) {
      vec4 pr = uPlate[i];
      if (pr.w <= 0.0) continue;
      vec2 q = p - pr.xy;
      float d = length(q);
      float an = atan(q.y, q.x);
      float c = 0.0;
      for (int k = 0; k < 2; k++) {
        float rr = pr.z + 9.0 * sin(an * 9.0 + float(k) * PI);
        c = max(c, clamp((2.5 - abs(d - rr)) * uDpl + 0.5, 0.0, 1.0));
      }
      acc.rgb += uPlateInk[i] * c * pr.w;
    }
    // The point: the warm halo, a faint ✦ turning, the white-hot core; trembling a pixel.
    if (uPoint.w > 0.5) {
      vec2 q = p - uPoint.xy;
      // The warm halo (its radius uPoint.z, 24 → 60) as a soft glare, not a disc; the faint ✦ (four rays, 40 px, 20 %) turning 2°/f.
      acc.rgb += uCore * 0.6 * exp(-3.0 * dot(q, q) / (uPoint.z * uPoint.z)) + uCore * 0.25 * glare(length(q), 3.0, 0.4 * uPoint.z) * step(length(q), 3.0 * uPoint.z);
      acc.rgb += uCore * 0.2 * star(q, 40.0, uPointB.x);
      over(acc, uWhite * 2.0, disc(length(q), 5.0));
    }
    gl_FragColor = acc;
  }`;

/** The two lens passes (see the file header). */
export class LensPasses {
  private readonly underMat: THREE.ShaderMaterial;
  private readonly overMat: THREE.ShaderMaterial;
  private readonly under: FullscreenQuad;
  private readonly over: FullscreenQuad;

  constructor() {
    const blend = {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    } as const;
    const common = { uLogical: { value: new THREE.Vector2(1920, 1080) }, uDpl: { value: 1 } };
    this.underMat = new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        uFront: { value: new THREE.Vector4() },
        uGroundIn: { value: new THREE.Vector3() },
        uGroundOut: { value: new THREE.Vector3() },
        uVP: { value: new THREE.Vector2() },
        uSpecks: { value: new THREE.Vector4(0.35, 1, 0, 0) },
        uPaper: { value: v3(HEX.PAPER) },
        uSunA: { value: new THREE.Vector4() },
        uSunB: { value: new THREE.Vector4() },
        uSunC: { value: new THREE.Vector4() },
        uSunD: { value: new THREE.Vector4() },
        // The sun as light (prototype j2 sun(): SY / #FFC44A, SO / #FF8A5A, #FFF0DC, the glow #FFD9A0, a keyline of the blue plate).
        uSunCol: { value: [v3('#F0D54E', 1.35), v3('#FFC44A', 1.7), v3('#F16944', 1.35), v3('#FF8A5A', 1.7), v3('#FFFCF8', 3), v3('#FFD9A0'), v3(HEX.CYAN, 1.2)] },
        uWhich: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: UNDER_FRAG,
      ...blend,
    });
    this.overMat = new THREE.ShaderMaterial({
      uniforms: {
        uLogical: { value: new THREE.Vector2(1920, 1080) },
        uDpl: { value: 1 },
        uPaper: { value: v3(HEX.PAPER) },
        uWhite: { value: v3(HEX.WHITE_HOT) },
        uCore: { value: v3(HEX.CORE) },
        uFlare: { value: new THREE.Vector4() },
        uFlareGlow: { value: 0.35 },
        uGhost: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
        uGhostInk: { value: [v3(HEX.PRINT_YELLOW), v3(HEX.PRINT_PINK), v3(HEX.PRINT_BLUE), v3(HEX.PRINT_PINK)] },
        uGhostAngle: { value: [SCREEN.angle.yellow, SCREEN.angle.pink, SCREEN.angle.blue, SCREEN.angle.pink] },
        uRing: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
        uRingC: { value: new THREE.Vector4() },
        uRingInk: { value: v3('#F16944') },
        uRingLight: { value: v3('#FFE6B0', 1.2) },
        uSlit: { value: new THREE.Vector4() },
        uSlitF: { value: new THREE.Vector4() },
        uFrozen: { value: null },
        uPoint: { value: new THREE.Vector4() },
        uPointB: { value: new THREE.Vector4() },
        uFringeL: { value: v3(HEX.NEON_PINK) },
        uFringeR: { value: v3(HEX.CYAN) },
        uChase: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
        uChaseB: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
        uRim: { value: new THREE.Vector4() },
        uSquash: { value: new THREE.Vector4() },
        uPlate: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
        // The bang's ghost inks (cosmosABang: #FFE800, #FF48B0, #36B4FF), here as light on the vacuum's dark.
        uPlateInk: { value: [v3(HEX.PRINT_YELLOW, 1.1), v3(HEX.PRINT_PINK, 1.25), v3('#36B4FF', 1.25)] },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: OVER_FRAG,
      ...blend,
    });
    this.under = new FullscreenQuad(this.underMat);
    this.over = new FullscreenQuad(this.overMat);
  }

  /**
   * Behind the films: the printed space inside (and, once passed, outside) the press fronts, and the sun as light. `which` splits them,
   * so the films' ink can print on the printed space and the sun (the light at the end of the tunnel) shine over it.
   */
  drawUnder(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, g: GateFrame, dpl: number, which: { ground: boolean; sun: boolean } = { ground: true, sun: true }): void {
    const u = this.underMat.uniforms;
    u.uDpl.value = dpl;
    (u.uWhich.value as THREE.Vector2).set(which.ground ? 1 : 0, which.sun ? 1 : 0);
    const press = g.press;
    (u.uFront.value as THREE.Vector4).set(Number.isFinite(press.radius) ? press.radius : 1e9, press.inner > 0 ? 1 : 0, press.outer > 0 ? 1 : 0, 0);
    (u.uGroundIn.value as THREE.Vector3).copy(v3(GROUND_HEX[press.inner]));
    (u.uGroundOut.value as THREE.Vector3).copy(v3(GROUND_HEX[press.outer]));
    (u.uVP.value as THREE.Vector2).set(g.camera.vp[0], g.camera.vp[1]);
    (u.uSpecks.value as THREE.Vector4).set(g.specks.alpha, g.specks.scale, g.specks.density, 0);
    const s = g.sun;
    const on = s !== null && s.mode === 'light';
    if (s) {
      (u.uSunA.value as THREE.Vector4).set(s.x, s.y, s.r, s.core);
      (u.uSunB.value as THREE.Vector4).set(s.pink[0], s.pink[1], s.yellow[0], s.yellow[1]);
      (u.uSunC.value as THREE.Vector4).set(s.yellowAlpha, s.pinkAlpha, s.white.r, s.white.alpha);
      (u.uSunD.value as THREE.Vector4).set(s.hot, on ? 1 : 0, s.keyline.r, s.keyline.alpha);
    } else (u.uSunD.value as THREE.Vector4).set(0, 0, 0, 0);
    const ground = which.ground && (press.inner > 0 || press.outer > 0);
    if (!ground && !(which.sun && on)) return;
    gl.setRenderTarget(target);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.render(this.under.scene, this.under.camera);
    gl.autoClear = auto;
  }

  /** Over the films: the rings, the ghosts, the flare; the ✦ cross (sampling `frozen`) and the point. */
  drawOver(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, g: GateFrame, dpl: number, frozen: THREE.Texture | null, slitGain: number): void {
    const u = this.overMat.uniforms;
    u.uDpl.value = dpl;
    const light = g.sun ? g.sun.mode === 'light' : true;
    (u.uFlare.value as THREE.Vector4).set(g.flare?.half ?? 0, g.flare?.width ?? 0, g.flare ? 1 : 0, light ? 1 : 0);
    u.uFlareGlow.value = g.flare?.glow ?? 0;
    const ghosts = u.uGhost.value as THREE.Vector4[];
    ghosts.forEach((v, i) => {
      const x = g.ghosts[i];
      if (x) v.set(x.x, x.r, x.alpha, x.plate);
      else v.set(0, 0, 0, 0);
    });
    const rings = u.uRing.value as THREE.Vector4[];
    rings.forEach((v, i) => {
      const r = g.rings[i];
      if (r) v.set(r.r, r.width, r.alpha, 1);
      else v.set(0, 0, 0, 0);
    });
    (u.uRingC.value as THREE.Vector4).set(g.sun?.x ?? 0, g.sun?.y ?? 0, light ? 1 : 0, 0);
    const chase = u.uChase.value as THREE.Vector4[];
    const chaseB = u.uChaseB.value as THREE.Vector4[];
    chase.forEach((v, i) => {
      const c = g.chase[i];
      if (c) {
        v.set(c.x, c.y, c.hw, c.hh);
        chaseB[i].set(c.rot, c.width, c.hot, light ? 1 : 0);
      } else chaseB[i].set(0, 0, 0, 0);
    });
    const front = g.press;
    // The roller's edge on the passes that turn the inks to light (not the last, under the cross: a ring round a cross reads as a reticle, the Defender's).
    const rim = Number.isFinite(front.radius) && !g.slit && !g.point;
    (u.uRim.value as THREE.Vector4).set(rim ? front.radius : 0, rim ? 1 - 0.6 * Math.min(1, front.radius / 1150) : 0, g.camera.vp[0], g.camera.vp[1]);
    const sl = g.slit;
    (u.uSlit.value as THREE.Vector4).set(sl?.width ?? 0, sl?.half ?? 0, sl && frozen ? 1 : 0, slitGain);
    (u.uSlitF.value as THREE.Vector4).set(sl?.flareHalf ?? 0, sl?.flareWidth ?? 0, sl?.sunR ?? 0, 0);
    u.uFrozen.value = frozen;
    const pt = g.point;
    (u.uPoint.value as THREE.Vector4).set(pt?.dx ?? 0, pt?.dy ?? 0, pt?.halo ?? 0, pt ? 1 : 0);
    (u.uPointB.value as THREE.Vector4).set(pt?.star ?? 0, pt?.breath ?? 0, 0, 0);
    // v07: the slam (the frozen page squashed; its light gathers toward the slit's, ∝ width^−½) and the inhale's plate rings.
    const sq = g.squash !== null && frozen ? g.squash : null;
    (u.uSquash.value as THREE.Vector4).set(sq ?? 0, sq !== null ? 1 : 0, sq !== null ? squashGain(sq) : 0, 0);
    const plates = u.uPlate.value as THREE.Vector4[];
    plates.forEach((v, i) => {
      const r = g.plateRings[i];
      if (r) v.set(r.x, r.y, r.r, r.alpha);
      else v.set(0, 0, 0, 0);
    });
    if (!g.flare && g.ghosts.length === 0 && g.rings.length === 0 && g.chase.length === 0 && !Number.isFinite(front.radius) && !sl && !pt && sq === null && g.plateRings.length === 0) return;
    gl.setRenderTarget(target);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.render(this.over.scene, this.over.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.under.dispose();
    this.over.dispose();
  }
}
