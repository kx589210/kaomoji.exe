import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { BAYER4, OKLAB_LAB, OKLAB_LMS, PIXEL_MAX_COLOURS, PIXEL_SALT, type PixelLook, resolvePixel } from './pixelMath.ts';

const glslFloat = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const glslVec3 = (v: readonly number[]): string => `vec3(${v.map(glslFloat).join(', ')})`;

/**
 * The fragment shader of the 8-bit look, built from pixelMath.ts's constants (the CPU reference, pixelShade, is the same maths step
 * for step). Constants carry a PX_ prefix: postprocessing prefixes an effect's uniforms and functions when it merges a pass, but not
 * its constants. Exported so a test can pin that the generated constants are in it.
 */
export const PIXEL_FRAGMENT = /* glsl */ `
uniform float amount;
uniform float cellPx;
uniform int mode;
uniform vec3 palette[${PIXEL_MAX_COLOURS}];
uniform vec3 paletteLin[${PIXEL_MAX_COLOURS}];
uniform int count;
uniform float levels;
uniform float dither;
uniform float scanlines;
uniform float grid;
uniform float gap;

const float PX_BAYER[16] = float[16](${BAYER4.map((v) => glslFloat((v + 0.5) / 16)).join(', ')});
const vec3 PX_LMS0 = ${glslVec3(OKLAB_LMS[0])};
const vec3 PX_LMS1 = ${glslVec3(OKLAB_LMS[1])};
const vec3 PX_LMS2 = ${glslVec3(OKLAB_LMS[2])};
const vec3 PX_LAB0 = ${glslVec3(OKLAB_LAB[0])};
const vec3 PX_LAB1 = ${glslVec3(OKLAB_LAB[1])};
const vec3 PX_LAB2 = ${glslVec3(OKLAB_LAB[2])};

uint pxPcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

vec3 pxToDisplay(vec3 c) {
  c = max(c, 0.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 pxToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 pxOklab(vec3 c) {
  vec3 lms = pow(max(vec3(dot(PX_LMS0, c), dot(PX_LMS1, c), dot(PX_LMS2, c)), 0.0), vec3(1.0 / 3.0));
  return vec3(dot(PX_LAB0, lms), dot(PX_LAB1, lms), dot(PX_LAB2, lms));
}

float pxGap(float lp, float size) {
  return clamp(min(lp + 1.0, gap * size) - max(lp, 0.0), 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centre = floor(resolution * 0.5);
  vec2 cell = floor((gl_FragCoord.xy - centre) / cellPx);
  ivec2 ic = ivec2(cell) + 65536;
  float pick = float(pxPcg(uint(ic.x) ^ pxPcg(uint(ic.y) ^ ${PIXEL_SALT}u)) >> 8) / 16777216.0;
  if (pick >= amount) {
    outputColor = inputColor;
    return;
  }
  vec2 origin = centre + cell * cellPx;
  vec3 sum = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 p = clamp(origin + cellPx * (vec2(float(i), float(j)) + 0.5) / 3.0, origin + 0.5, origin + cellPx - 0.5);
      sum += textureLod(inputBuffer, p / resolution, 0.0).rgb;
    }
  }
  vec3 col = max(sum / 9.0, 0.0);
  if (mode != 0) {
    float o = 0.0;
    if (dither > 0.0) o = (PX_BAYER[int(mod(cell.y, 4.0)) * 4 + int(mod(cell.x, 4.0))] - 0.5) * dither;
    vec3 shown = clamp(pxToDisplay(col) + o, 0.0, 1.0);
    if (mode == 2) {
      col = pxToLinear(floor(shown * (levels - 1.0) + 0.5) / (levels - 1.0));
    } else {
      vec3 lab = pxOklab(pxToLinear(shown));
      float best = 1e9;
      int k = 0;
      for (int i = 0; i < ${PIXEL_MAX_COLOURS}; i++) {
        if (i >= count) break;
        vec3 d = palette[i] - lab;
        float e = dot(d, d);
        if (e < best) {
          best = e;
          k = i;
        }
      }
      col = paletteLin[k];
    }
  }
  vec2 lp = gl_FragCoord.xy - 0.5 - origin;
  float shade = (1.0 - scanlines * pxGap(lp.y, cellPx)) * (1.0 - grid * pxGap(lp.x, cellPx));
  if (shade < 1.0) col = pxToLinear(pxToDisplay(col) * shade);
  outputColor = vec4(col, inputColor.a);
}`;

/**
 * The 8-bit look (todo B2 "8-bit 像素"; drop 2's 8-bit invasion world, the blade wipe's pixel-amber cell): the finished picture cut
 * into square game pixels on a grid centred on the frame (`cell` px at 1080p, scaled with the render), each the average of 3 × 3 taps
 * across its area, optionally snapped to a game palette by OKLab distance (or posterised per channel), with an optional 4 × 4 Bayer
 * ordered dither per game pixel and optional dark scanline / column gaps (exact box coverage, so 4K averages to the previews).
 * `amount` below 1 turns only that share of the game pixels — a fixed scattered set, salted apart from the character flash's.
 * The config is PixelLook (pixelMath.ts: what a scene puts in its Look); `configure` returns whether the pass draws anything.
 *
 * Where it goes (for the integrator; pipeline.ts is not edited here): it samples other pixels (EffectAttribute.CONVOLUTION), so it
 * needs its own EffectPass, after the main pass (it snaps display colours: after tone mapping, flash, vignette and grain) and before
 * the character flash and the CRT (which then bends the game pixels like any picture). Like the flash, the pass is enabled only
 * while `configure(look.pixel)` returns true, so at amount 0 a frame costs and looks exactly as without it. Cost when on: 9 taps,
 * one OKLab conversion and ≤ 16 distance tests a device pixel. No textures, nothing lazy to build.
 *
 * A scene can also run it on its own render target (a feed it pixelates before drawing over it): src/engine/post/effectQuad.ts.
 */
export class PixelEffect extends Effect {
  private height = 1080;

  constructor() {
    super('PixelEffect', PIXEL_FRAGMENT, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['amount', new THREE.Uniform(0)],
        ['cellPx', new THREE.Uniform(1)],
        ['mode', new THREE.Uniform(0)],
        ['palette', new THREE.Uniform(Array.from({ length: PIXEL_MAX_COLOURS }, () => new THREE.Vector3()))],
        ['paletteLin', new THREE.Uniform(Array.from({ length: PIXEL_MAX_COLOURS }, () => new THREE.Vector3()))],
        ['count', new THREE.Uniform(0)],
        ['levels', new THREE.Uniform(2)],
        ['dither', new THREE.Uniform(0)],
        ['scanlines', new THREE.Uniform(0)],
        ['grid', new THREE.Uniform(0)],
        ['gap', new THREE.Uniform(0.25)],
      ]),
    });
  }

  override setSize(_width: number, height: number): void {
    this.height = height;
  }

  /** Sets up the look of one output frame; returns whether it draws anything (the pipeline skips the pass when not). */
  configure(p: PixelLook | undefined): boolean {
    const P = resolvePixel(p, this.height);
    const u = this.uniforms;
    u.get('amount')!.value = P?.amount ?? 0;
    if (!P) return false;
    u.get('cellPx')!.value = P.cellPx;
    u.get('mode')!.value = P.mode;
    const lab = u.get('palette')!.value as THREE.Vector3[];
    const lin = u.get('paletteLin')!.value as THREE.Vector3[];
    for (let i = 0; i < PIXEL_MAX_COLOURS; i++) {
      lab[i].set(...((P.labs[i] ?? [0, 0, 0]) as [number, number, number]));
      lin[i].set(...((P.colours[i] ?? [0, 0, 0]) as [number, number, number]));
    }
    u.get('count')!.value = P.colours.length;
    u.get('levels')!.value = P.levels;
    u.get('dither')!.value = P.dither;
    u.get('scanlines')!.value = P.scanlines;
    u.get('grid')!.value = P.grid;
    u.get('gap')!.value = P.gap;
    return true;
  }
}
