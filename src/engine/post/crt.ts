import { Effect } from 'postprocessing';
import * as THREE from 'three';

/**
 * A CRT screen: barrel curvature, scanlines that thicken on bright lines, an
 * aperture grille one logical pixel per stripe, and black rounded corners.
 * `amount` 0 leaves the image untouched.
 */
export class CrtEffect extends Effect {
  constructor() {
    super(
      'CrtEffect',
      /* glsl */ `
      uniform float amount;
      uniform float curvature;
      uniform float scanlines;
      uniform float lines;
      uniform float grille;
      uniform float band;

      void mainUv(inout vec2 uv) {
        vec2 c = uv * 2.0 - 1.0;
        c *= 1.0 + curvature * amount * (c.yx * c.yx);
        uv = c * 0.5 + 0.5;
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;
        float luma = clamp(dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
        float s = 0.5 + 0.5 * cos(uv.y * lines * 6.28318530718);
        float beam = pow(s, mix(1.6, 0.35, luma)) * 1.25;
        col *= mix(1.0, beam, scanlines * amount);
        float x = floor(gl_FragCoord.x * 1920.0 / resolution.x);
        float phase = mod(x, 3.0);
        vec3 stripe = vec3(phase < 0.5 ? 1.0 : 0.7, phase > 0.5 && phase < 1.5 ? 1.0 : 0.7, phase > 1.5 ? 1.0 : 0.7) * 1.16;
        col *= mix(vec3(1.0), stripe, grille * amount);
        // A brighter refresh band rolls down the tube (secondary motion; spec §3.1 rule 6).
        float bd = abs(fract(uv.y - (1.0 - band) + 0.5) - 0.5);
        col *= 1.0 + 0.08 * amount * exp(-bd * bd / 0.0018);
        float aspect = resolution.x / resolution.y;
        vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
        vec2 d = abs(p) - (vec2(0.5 * aspect, 0.5) - 0.035);
        float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.035;
        float inside = 1.0 - smoothstep(-0.0025, 0.0, dist);
        col *= mix(1.0, inside, amount);
        // Scanline and grille gains can lift a channel past 1 again; keep the hue.
        col /= max(1.0, max(col.r, max(col.g, col.b)));
        outputColor = vec4(col, inputColor.a);
      }`,
      {
        uniforms: new Map([
          ['amount', new THREE.Uniform(0)],
          ['curvature', new THREE.Uniform(0)],
          ['scanlines', new THREE.Uniform(0)],
          ['lines', new THREE.Uniform(360)],
          ['grille', new THREE.Uniform(0)],
          ['band', new THREE.Uniform(0)],
        ]),
      },
    );
  }

  configure(c: { amount: number; curvature: number; scanlines: number; lines: number; grille: number; band?: number } | undefined): void {
    const u = this.uniforms;
    u.get('amount')!.value = c?.amount ?? 0;
    u.get('curvature')!.value = c?.curvature ?? 0;
    u.get('scanlines')!.value = c?.scanlines ?? 0;
    u.get('lines')!.value = c?.lines ?? 360;
    u.get('grille')!.value = c?.grille ?? 0;
    u.get('band')!.value = c?.band ?? 0;
  }
}
