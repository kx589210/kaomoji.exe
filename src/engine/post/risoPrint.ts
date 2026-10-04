import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import type { RGB } from '../color.ts';
import { DOT_SCREEN_GLSL, PRINT_HEIGHT } from './dotScreen.ts';
import {
  RISO_ABSORB, RISO_DETAIL_RADIUS, RISO_DUSK, RISO_GHOST_LINEAR, RISO_NEON_HUES, RISO_NEON_LINEAR, RISO_PAPER_LINEAR, RISO_PRINT_ANGLES, RISO_SEEDS,
  RISO_SPACE_T, RISO_VOID_ANGLE, RISO_VOID_LINEAR, type RisoLut, type RisoPrintLook, packRisoLut, resolveRiso, risoLut,
} from './risoModel.ts';

const v3 = (c: RGB): string => `vec3(${c.map((x) => x.toFixed(6)).join(', ')})`;
const f = (x: number): string => x.toFixed(6);

/** The shader; risoModel.ts risoPrintAt and its helpers are the same maths in TypeScript, function for function. */
const RISO_FRAG = /* glsl */ `
uniform float amount;
uniform float night;
uniform float power;
uniform float scale;
uniform float pitch;
uniform vec2 offPink;
uniform vec2 offBlue;
uniform vec2 offYellow;
uniform float inRegister;
uniform float exposure;
uniform float gamma;
uniform float clarity;
uniform float paperGrain;
uniform float mottle;
uniform vec4 anchor;
uniform vec4 lightZone;
uniform vec2 neonGain;
uniform float voidPitch;
uniform vec3 levelsGround;
uniform vec3 levelsPaper;
uniform float levelsAmount;
uniform float hdrGain;
uniform sampler2D lut;
uniform float lutSize;
${DOT_SCREEN_GLSL}
const vec3 RP_PAPER = ${v3(RISO_PAPER_LINEAR)};
const vec3 RP_VOID = ${v3(RISO_VOID_LINEAR)};
const vec3 RP_GHOST = ${v3(RISO_GHOST_LINEAR)};
const vec3 RP_DUSK = ${v3(RISO_DUSK)};
const vec3 RP_SPACE_T = ${v3(RISO_SPACE_T)};
const vec3 RP_ABSORB_PINK = ${v3(RISO_ABSORB[0])};
const vec3 RP_ABSORB_BLUE = ${v3(RISO_ABSORB[1])};
const vec3 RP_ABSORB_YELLOW = ${v3(RISO_ABSORB[2])};
const vec3 RP_NEON_PINK = ${v3(RISO_NEON_LINEAR[0])};
const vec3 RP_NEON_BLUE = ${v3(RISO_NEON_LINEAR[1])};
const vec3 RP_NEON_YELLOW = ${v3(RISO_NEON_LINEAR[2])};
const vec3 RP_ANGLES = vec3(${f(RISO_PRINT_ANGLES.pink)}, ${f(RISO_PRINT_ANGLES.blue)}, ${f(RISO_PRINT_ANGLES.yellow)});
const vec3 RP_SEEDS = vec3(${RISO_SEEDS.map((s) => s.toFixed(1)).join(', ')});

// The pass input as the press sees it: exposed, gamma'd, hue-clamped, display-encoded (risoSource).
vec3 rpSource(vec2 s) {
  vec3 c = max(texture2D(inputBuffer, kxUv(s, resolution)).rgb, 0.0);
  c = pow(c, vec3(gamma)) * exposure;
  c /= max(1.0, max(c.r, max(c.g, c.b)));
  return kxEncode(c);
}

// One separation table (0 day, 1 night) at display colour x (risoLutMode): bilinear inside a blue slice, mixed across two.
vec3 rpLutMode(vec3 x, float mode) {
  float n = lutSize - 1.0;
  vec3 g = clamp(x, 0.0, 1.0) * n;
  float b0 = min(floor(g.b), n - 1.0);
  float v = (mode * lutSize + g.g + 0.5) / (2.0 * lutSize);
  float w = lutSize * lutSize;
  vec3 lo = texture2D(lut, vec2((b0 * lutSize + g.r + 0.5) / w, v)).rgb;
  vec3 hi = texture2D(lut, vec2(((b0 + 1.0) * lutSize + g.r + 0.5) / w, v)).rgb;
  return mix(lo, hi, g.b - b0);
}

// Ink coverages (pink, blue, yellow) for display colour x (risoCoverage).
vec3 rpCoverage(vec3 x) {
  vec3 day = night < 1.0 ? rpLutMode(x, 0.0) : vec3(0.0);
  vec3 dark = night > 0.0 ? rpLutMode(x, 1.0) : vec3(0.0);
  return mix(day, dark, night);
}

// One plate's view of the source, its offset already applied to s (risoTaps).
void rpTaps(vec2 s, out vec3 cov, out vec3 mean, out vec3 variance, out vec3 col, out float lumMean) {
  col = rpSource(s);
  cov = rpCoverage(col);
  vec3 sum = cov;
  vec3 sq = cov * cov;
  float lum = dot(col, KX_LUMA);
  for (int i = 0; i < 4; i++) {
    vec2 d = vec2(i < 2 ? -1.0 : 1.0, (i == 0 || i == 2) ? -1.0 : 1.0) * ${f(RISO_DETAIL_RADIUS * Math.SQRT1_2)};
    vec3 x = rpSource(s + d);
    vec3 c = rpCoverage(x);
    sum += c;
    sq += c * c;
    lum += dot(x, KX_LUMA);
  }
  mean = sum / 5.0;
  variance = max(sq / 5.0 - mean * mean, 0.0);
  lumMean = lum / 5.0;
}

// Ink of one plate: screened tone, or solid line ink where the plate has fine detail (risoInk).
float rpInk(vec2 s, float c, float m, float variance, float angle, float seed, float px) {
  float sharp = clamp(c + clarity * (c - m), 0.0, 1.0);
  float detail = smoothstep(0.07, 0.17, sqrt(variance));
  float dots = kxScreen(kxPlane(s, anchor), sharp, pitch, angle, 1.0, px, 0.35, seed);
  return mix(dots, smoothstep(0.42, 0.58, sharp), detail);
}

// Ink density relative to a perfect press: mottle, roller banding, starved specks (risoDensity).
float rpDensity(vec2 q, float seed) {
  float n = 0.035 * kxNoise(q / 0.9, seed) + 0.022 * kxNoise(q / 28.0, seed + 1.0) + 0.015 * sin(q.y / 23.0 + seed);
  float voids = 1.0 - 0.7 * smoothstep(0.82, 0.9, kxNoise(q / 1.1, seed + 2.0));
  return clamp(1.0 + mottle * n, 0.0, 1.15) * mix(1.0, voids, min(mottle, 1.0));
}

// Hue in degrees of a display colour (hueOf).
float rpHue(vec3 x) {
  float mx = max(x.r, max(x.g, x.b));
  float d = mx - min(x.r, min(x.g, x.b));
  if (d < 1e-5) return 0.0;
  float h;
  if (mx == x.r) h = mod((x.g - x.b) / d, 6.0);
  else if (mx == x.g) h = (x.b - x.r) / d + 2.0;
  else h = (x.r - x.g) / d + 4.0;
  h *= 60.0;
  return h < 0.0 ? h + 360.0 : h;
}

// Which tubes a display colour lights: (pink, blue, yellow) (risoNeonWeights).
vec3 rpNeonWeights(vec3 x) {
  float mx = max(x.r, max(x.g, x.b));
  float mn = min(x.r, min(x.g, x.b));
  float sat = mx > 0.03 ? (mx - mn) / mx : 0.0;
  float conf = smoothstep(0.06, 0.16, sat);
  float h = rpHue(x);
  float wc = 0.0;
  float wp = 0.0;
  float wa = 0.0;
  if (h >= ${f(RISO_NEON_HUES.yellow)} && h < ${f(RISO_NEON_HUES.blue)}) {
    float t = (h - ${f(RISO_NEON_HUES.yellow)}) / ${f(RISO_NEON_HUES.blue - RISO_NEON_HUES.yellow)};
    wa = 1.0 - t;
    wc = t;
  } else if (h >= ${f(RISO_NEON_HUES.blue)} && h < ${f(RISO_NEON_HUES.pink)}) {
    float t = (h - ${f(RISO_NEON_HUES.blue)}) / ${f(RISO_NEON_HUES.pink - RISO_NEON_HUES.blue)};
    wc = 1.0 - t;
    wp = t;
  } else {
    float t = ((h < ${f(RISO_NEON_HUES.yellow)} ? h + 360.0 : h) - ${f(RISO_NEON_HUES.pink)}) / ${f(RISO_NEON_HUES.yellow + 360 - RISO_NEON_HUES.pink)};
    wp = 1.0 - t;
    wa = t;
  }
  float m = max(max(wc, wp), max(wa, 1e-4));
  return vec3(conf * smoothstep(0.25, 0.6, wp / m), conf * smoothstep(0.25, 0.6, wc / m) + (1.0 - conf), conf * smoothstep(0.25, 0.6, wa / m));
}

// How brightly one tube burns: bright strokes as tubes, bright areas as lit dots (risoGlow).
float rpGlow(vec3 x, float lumMean, float w, vec2 s, float angle, float seed, float px) {
  float y = dot(x, KX_LUMA);
  float stroke = w * smoothstep(0.03, 0.12, y - lumMean) * smoothstep(0.18, 0.5, y);
  float level = w * smoothstep(0.25, 0.8, lumMean);
  float lamps = kxScreen(kxPlane(s, anchor), 0.6 * level, pitch, angle, 1.0, px, 0.0, seed);
  return 0.845 * neonGain.x * stroke + 0.3 * neonGain.y * lamps;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 s = kxScreenPx(gl_FragCoord.xy, resolution);
  float px = scale * max(anchor.z, 1e-3);
  vec2 sP = s - offPink;
  vec2 sB = s - offBlue;
  vec2 sY = s - offYellow;
  vec3 covP; vec3 meanP; vec3 varP; vec3 colP; float lumP;
  vec3 covB; vec3 meanB; vec3 varB; vec3 colB; float lumB;
  vec3 covY; vec3 meanY; vec3 varY; vec3 colY; float lumY;
  rpTaps(sP, covP, meanP, varP, colP, lumP);
  if (inRegister > 0.5) {
    covB = covP; meanB = meanP; varB = varP; colB = colP; lumB = lumP;
    covY = covP; meanY = meanP; varY = varP; colY = colP; lumY = lumP;
  } else {
    rpTaps(sB, covB, meanB, varB, colB, lumB);
    rpTaps(sY, covY, meanY, varY, colY, lumY);
  }
  float inkP = rpInk(sP, covP.x, meanP.x, varP.x, RP_ANGLES.x, RP_SEEDS.x, px);
  float inkB = rpInk(sB, covB.y, meanB.y, varB.y, RP_ANGLES.y, RP_SEEDS.y, px);
  float inkY = rpInk(sY, covY.z, meanY.z, varY.z, RP_ANGLES.z, RP_SEEDS.z, px);

  // The ground: paper with fibre; powered, the room light goes out as a coarse printed screen, through a violet dusk to the void.
  vec2 q = kxPlane(s, anchor);
  float fib = 1.0 + paperGrain * (0.7 * kxNoise(q / vec2(3.5, 0.6), 101.0) + 0.35 * kxNoise(q / vec2(0.7, 2.5), 102.0) + 0.6 * kxNoise(q / 40.0, 103.0));
  float room = 1.0;
  if (power > 0.0) room = 1.0 - power * (lightZone.w > 0.0 ? smoothstep(lightZone.z, lightZone.w, length(s - lightZone.xy)) : 1.0);
  float lit = voidPitch > 0.0 ? 1.0 - kxScreen(q, 1.0 - room, voidPitch, ${f(RISO_VOID_ANGLE)}, 1.0, px, 0.0, 104.0) : room;
  vec3 print = mix(RP_VOID, RP_PAPER, pow(lit, 1.3)) * (1.0 + (RP_DUSK - 1.0) * (4.0 * lit * (1.0 - lit))) * fib;

  // The inks multiply onto it; in the dark the dots stay as unlit glass.
  vec3 tP = max(vec3(0.0), 1.0 - inkP * rpDensity(kxPlane(sP, anchor), RP_SEEDS.x) * RP_ABSORB_PINK);
  vec3 tB = max(vec3(0.0), 1.0 - inkB * rpDensity(kxPlane(sB, anchor), RP_SEEDS.y) * RP_ABSORB_BLUE);
  vec3 tY = max(vec3(0.0), 1.0 - inkY * rpDensity(kxPlane(sY, anchor), RP_SEEDS.z) * RP_ABSORB_YELLOW);
  print *= tP;
  print *= tB;
  print *= tY;
  print += RP_GHOST * ((1.0 - room) * min(1.0, inkP + inkB + inkY) * 0.7);

  // Re-levelled onto a stage: printed space → the ground, bare paper → the stage's paper, by the inks' transmission (risoPrintAt).
  if (levelsAmount > 0.0) {
    vec3 inkT = tP * tB * tY;
    vec3 g = levelsGround * fib;
    vec3 lo = g * inkT / RP_SPACE_T;
    vec3 hi = g + (levelsPaper * fib - g) * ((inkT - RP_SPACE_T) / (1.0 - RP_SPACE_T));
    print = mix(print, mix(hi, lo, step(inkT, RP_SPACE_T)), levelsAmount);
  }

  // Powered: the plates burn as neon where the room has gone dark (HDR; the look's bloom makes the glow).
  if (power > 0.0) {
    float vis = 1.0 - smoothstep(0.3, 0.8, room);
    float eP = rpGlow(colP, lumP, rpNeonWeights(colP).x, sP, RP_ANGLES.x, 51.0, px);
    float eB = rpGlow(colB, lumB, rpNeonWeights(colB).y, sB, RP_ANGLES.y, 52.0, px);
    float eY = rpGlow(colY, lumY, rpNeonWeights(colY).z, sY, RP_ANGLES.z, 53.0, px);
    float white = 0.8 * (max(eP - 0.7, 0.0) + max(eB - 0.7, 0.0) + max(eY - 0.7, 0.0));
    print += power * vis * (RP_NEON_PINK * eP + RP_NEON_BLUE * eB + RP_NEON_YELLOW * eY + white);
  }
  // The light the print cannot show, carried through (HDR: the bloom after the pass makes its glow).
  if (hdrGain > 0.0) print += hdrGain * max(inputColor.rgb - 1.0, 0.0);
  outputColor = vec4(mix(inputColor.rgb, print, amount), inputColor.a);
}
`;

/** Packs the separation tables into the texture the shader reads (see packRisoLut). */
export function risoLutTexture(lut: RisoLut): THREE.DataTexture {
  const texture = new THREE.DataTexture(packRisoLut(lut), lut.size * lut.size, 2 * lut.size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The Riso print as a post pass (story bible §宇宙, todo B2 "Riso 印刷（含"通电"）"; the model and every knob: risoModel.ts). A scene
 * asks for it in its Look with a RisoPrintLook: `{ amount: 1 }` is the default day print; `night: 1` prints space as solid
 * pink over blue; `offsets: misregistration(frame, strong)` (src/worlds/riso.ts) lets the plates drift and clack into register on
 * the strong beats; `power` 0 → 1 switches the room light off and the plates on as neon; `screen` makes the dots ride the camera;
 * `levels` lands printed space and bare paper on a stage's ground and paper (the cosmos's grounds); `hdr` carries light above 1 through.
 *
 * It samples other pixels (five taps per plate for detail; the plates' offsets), so it is a convolution effect and needs an
 * EffectPass of its own. Integration (pipeline.ts / types.ts, not done here):
 * - Look gets `riso?: RisoPrintLook`; mixLook gets `...(m ? { riso: m } : {})` with `m = mixRisoPrint(a.riso, b.riso, t)`.
 * - The pass goes right after the TextureInputPass, before the main pass, so the look's bloom turns the neon (HDR) into glow and
 *   its grain and vignette land on the paper; `pass.enabled = riso.configure(look.riso)` in applyLook (false: the composer skips
 *   it and the frame is exactly as without it). It reads the exposed HDR sum and hue-clamps it itself.
 * - The screen overlay (the readout) is drawn into the sum before the composer, so the print takes it too. To keep the readout
 *   clean, the integrator can draw the overlay after this pass (render this pass into the sum before `screenOverlay`).
 * - The matching finishing is risoLook() (bloom 0) while printed; raise the bloom with `power` (cosmos2 §4.5's p dial).
 * The two 17³ separation tables are built on the first frame that prints (pure, about 0.3 s, once per tab). Cost: three plates ×
 * five taps (one when the plates are in register), measured with readback at about 6 ms a 1080p frame and 35 ms a 4K frame
 * (ANGLE/D3D11, RTX 5080).
 */
export class RisoPrintEffect extends Effect {
  private readonly makeLut: () => RisoLut;
  private lutTexture: THREE.DataTexture | null = null;

  constructor(makeLut: () => RisoLut = risoLut) {
    super('RisoPrintEffect', RISO_FRAG, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['amount', new THREE.Uniform(0)],
        ['night', new THREE.Uniform(0)],
        ['power', new THREE.Uniform(0)],
        ['scale', new THREE.Uniform(1)],
        ['pitch', new THREE.Uniform(10)],
        ['offPink', new THREE.Uniform(new THREE.Vector2())],
        ['offBlue', new THREE.Uniform(new THREE.Vector2())],
        ['offYellow', new THREE.Uniform(new THREE.Vector2())],
        ['inRegister', new THREE.Uniform(1)],
        ['exposure', new THREE.Uniform(1)],
        ['gamma', new THREE.Uniform(1)],
        ['clarity', new THREE.Uniform(0)],
        ['paperGrain', new THREE.Uniform(0)],
        ['mottle', new THREE.Uniform(0)],
        ['anchor', new THREE.Uniform(new THREE.Vector4(0, 0, 1, 0))],
        ['lightZone', new THREE.Uniform(new THREE.Vector4())],
        ['neonGain', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['voidPitch', new THREE.Uniform(40)],
        ['levelsGround', new THREE.Uniform(new THREE.Vector3())],
        ['levelsPaper', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['levelsAmount', new THREE.Uniform(0)],
        ['hdrGain', new THREE.Uniform(0)],
        ['lut', new THREE.Uniform(null)],
        ['lutSize', new THREE.Uniform(2)],
      ]),
    });
    this.makeLut = makeLut;
  }

  /** Lengths are given at 1080p; a frame `height` device px tall scales them. */
  override setSize(_width: number, height: number): void {
    this.uniforms.get('scale')!.value = height / PRINT_HEIGHT;
  }

  /** Sets up the print of one output frame; returns whether it draws anything (the pipeline skips the pass when not). */
  configure(look: RisoPrintLook | undefined): boolean {
    const u = this.uniforms;
    const amount = look ? Math.min(1, Math.max(0, look.amount)) : 0;
    u.get('amount')!.value = amount;
    if (!look || amount <= 0) return false;
    const st = resolveRiso(look);
    if (!this.lutTexture) {
      const lut = this.makeLut();
      this.lutTexture = risoLutTexture(lut);
      u.get('lut')!.value = this.lutTexture;
      u.get('lutSize')!.value = lut.size;
    }
    u.get('night')!.value = st.night;
    u.get('power')!.value = st.power;
    u.get('pitch')!.value = st.pitch;
    const { pink, blue, yellow } = st.offsets;
    (u.get('offPink')!.value as THREE.Vector2).set(pink[0], pink[1]);
    (u.get('offBlue')!.value as THREE.Vector2).set(blue[0], blue[1]);
    (u.get('offYellow')!.value as THREE.Vector2).set(yellow[0], yellow[1]);
    u.get('inRegister')!.value = pink[0] === blue[0] && pink[1] === blue[1] && pink[0] === yellow[0] && pink[1] === yellow[1] ? 1 : 0;
    u.get('exposure')!.value = st.exposure;
    u.get('gamma')!.value = st.gamma;
    u.get('clarity')!.value = st.clarity;
    u.get('paperGrain')!.value = st.paperGrain;
    u.get('mottle')!.value = st.mottle;
    (u.get('anchor')!.value as THREE.Vector4).set(st.screen.x, st.screen.y, st.screen.zoom, st.screen.roll);
    const l = st.light;
    (u.get('lightZone')!.value as THREE.Vector4).set(l?.x ?? 0, l?.y ?? 0, l?.r0 ?? 0, l?.r1 ?? 0);
    (u.get('neonGain')!.value as THREE.Vector2).set(st.neon.strokes, st.neon.dots);
    u.get('voidPitch')!.value = st.voidPitch;
    const lv = st.levels;
    (u.get('levelsGround')!.value as THREE.Vector3).set(lv?.ground[0] ?? 0, lv?.ground[1] ?? 0, lv?.ground[2] ?? 0);
    (u.get('levelsPaper')!.value as THREE.Vector3).set(lv?.paper[0] ?? 1, lv?.paper[1] ?? 1, lv?.paper[2] ?? 1);
    u.get('levelsAmount')!.value = lv?.amount ?? 0;
    u.get('hdrGain')!.value = st.hdr;
    return true;
  }

  override dispose(): void {
    this.lutTexture?.dispose();
    this.lutTexture = null;
    this.uniforms.get('lut')!.value = null;
    super.dispose();
  }
}
