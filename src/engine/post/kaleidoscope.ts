import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { type KaleidoLook, resolveKaleido } from './kaleidoMath.ts';

/**
 * The fragment shader of the kaleidoscope: kaleidoMath.ts's kaleidoSource, kaleidoLocal, kaleidoFold and kaleidoUv line for line,
 * in logical 1080p px (device px / (height / 1080)), so a 4K frame is the 1080p one, scaled. Constants carry a KL_ prefix
 * (postprocessing prefixes an effect's uniforms and functions when it merges a pass, not its constants).
 */
export const KALEIDO_FRAGMENT = /* glsl */ `
uniform float amount;
uniform float facets;
uniform float spin;
uniform float turn;
uniform float zoom;
uniform vec2 centre;
uniform vec2 source;
uniform int lattice;
uniform vec2 cell;
uniform float seamWidth;
uniform vec3 seamColor;
uniform float seamAlpha;

const float KL_PI = 3.141592653589793;
const float KL_SQRT3 = 1.7320508075688772;

vec2 klRotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float klFold(float a, float n) {
  float w = KL_PI / n;
  float t = mod(abs(a), 2.0 * w);
  return min(t, 2.0 * w - t);
}

// The point relative to its cell's centre (xy) and its distance to the cell border (z).
vec3 klLocal(vec2 q) {
  if (lattice == 1) {
    vec2 l = 0.5 * cell - abs(mod(q + 0.5 * cell, 2.0 * cell) - cell);
    vec2 room = 0.5 * cell - abs(l);
    return vec3(l, min(room.x, room.y));
  }
  if (lattice == 2) {
    vec2 s = vec2(cell.x, cell.x * KL_SQRT3);
    vec2 a = mod(q, s) - 0.5 * s;
    vec2 b = mod(q - 0.5 * s, s) - 0.5 * s;
    vec2 l = dot(a, a) < dot(b, b) ? a : b;
    float reach = max(abs(l.x), max(abs(0.5 * l.x + 0.5 * KL_SQRT3 * l.y), abs(-0.5 * l.x + 0.5 * KL_SQRT3 * l.y)));
    return vec3(l, 0.5 * cell.x - reach);
  }
  return vec3(q, 1e9);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float k = resolution.y / 1080.0;
  vec2 P = (gl_FragCoord.xy - 0.5 * resolution) / k;
  vec3 local = klLocal(klRotate(P - centre, -spin));
  vec2 q = local.xy;
  float r = length(q);
  float f = klFold(r > 0.0 ? atan(-q.x, q.y) : 0.0, facets);
  float beta = turn + f;
  vec2 src = source + (r / zoom) * vec2(-sin(beta), cos(beta));
  vec2 suv = 1.0 - abs(mod(src * k / resolution + 0.5, 2.0) - 1.0);
  vec3 col = mix(inputColor.rgb, textureLod(inputBuffer, suv, 0.0).rgb, amount);
  if (seamAlpha > 0.0) {
    float w = KL_PI / facets;
    float d = min(r * sin(min(f, w - f)), local.z) * k;
    float cover = clamp(0.5 * seamWidth * k - d + 0.5, 0.0, 1.0);
    col = mix(col, seamColor, seamAlpha * cover * amount);
  }
  outputColor = vec4(col, inputColor.a);
}`;

/**
 * The kaleidoscope (todo B2 "万花筒"; drop 2's mandala, the club's Berkeley floor): the frame mirrored into N-fold radial symmetry —
 * two mirrors π/N apart about `centre`, N whole or morphing, the pattern spinning (`spin`), flowing (`turn`, the picture turning
 * under the mirrors) and zooming — or, with `tile`, a wallpaper of mandalas in rect or hex cells. Seamless: the fold is continuous
 * for every setting it accepts (kaleidoMath.ts proves it in node), and samples outside the picture reflect back in. The config is
 * KaleidoLook (kaleidoMath.ts: what a scene puts in its Look); `configure` returns whether the pass draws anything.
 *
 * Where it goes (for the integrator; pipeline.ts is not edited here): it samples other pixels (EffectAttribute.CONVOLUTION), so it
 * needs its own EffectPass — first, right after the input pass and before the main one, so it mirrors the scene's HDR picture and
 * the bloom, vignette and grain land on the mandala afterwards (after them, the vignette's dark corners would be folded into dark
 * petals and the grain mirrored). Enabled only while `configure(look.kaleido)` returns true, so at amount 0 a frame costs and looks
 * exactly as without it. Cost when on: one atan, a few sines and one or two taps a device pixel. It folds the summed sub-frames,
 * so motion blur is mirrored with the picture (each petal blurs the way its slice moves); the root's screenOverlay (the readout) is
 * already in that sum, so it is mirrored too — keep readouts off while it is on, or fold a feed with EffectQuad instead.
 *
 * Things drawn over the mandala unmirrored (the hero at its centre, a rim of text) cannot come from a whole-frame effect: a scene
 * renders the feed to its own target, runs the fold with EffectQuad (src/engine/post/effectQuad.ts), then draws them on top.
 */
export class KaleidoscopeEffect extends Effect {
  constructor() {
    super('KaleidoscopeEffect', KALEIDO_FRAGMENT, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['amount', new THREE.Uniform(0)],
        ['facets', new THREE.Uniform(1)],
        ['spin', new THREE.Uniform(0)],
        ['turn', new THREE.Uniform(0)],
        ['zoom', new THREE.Uniform(1)],
        ['centre', new THREE.Uniform(new THREE.Vector2())],
        ['source', new THREE.Uniform(new THREE.Vector2())],
        ['lattice', new THREE.Uniform(0)],
        ['cell', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['seamWidth', new THREE.Uniform(0)],
        ['seamColor', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['seamAlpha', new THREE.Uniform(0)],
      ]),
    });
  }

  /** Sets up the look of one output frame; returns whether it draws anything (the pipeline skips the pass when not). */
  configure(k: KaleidoLook | undefined): boolean {
    const K = resolveKaleido(k);
    const u = this.uniforms;
    u.get('amount')!.value = K?.amount ?? 0;
    if (!K) return false;
    u.get('facets')!.value = K.facets;
    u.get('spin')!.value = K.spin;
    u.get('turn')!.value = K.turn;
    u.get('zoom')!.value = K.zoom;
    (u.get('centre')!.value as THREE.Vector2).set(K.centre[0], K.centre[1]);
    (u.get('source')!.value as THREE.Vector2).set(K.source[0], K.source[1]);
    u.get('lattice')!.value = K.lattice;
    (u.get('cell')!.value as THREE.Vector2).set(Math.max(K.cell[0], 1), Math.max(K.cell[1], 1));
    u.get('seamWidth')!.value = K.seamWidth;
    (u.get('seamColor')!.value as THREE.Vector3).set(K.seamColor[0], K.seamColor[1], K.seamColor[2]);
    u.get('seamAlpha')!.value = K.seamWidth > 0 ? K.seamAlpha : 0;
    return true;
  }
}
