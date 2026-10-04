// Renderer A's GPU fields (the cosmos, bars 1–2; build sheet notes/bcos/sheet.md §10.1): instanced cards of print (a rounded card of
// ink with a face knocked out of it, or a bare glyph, a sprite, a dot, a glint), written on the CPU each sub-frame from the pure shots
// (src/shots/cosmosBang.ts, cosmosEarth.ts); Earth's 24,000 double-sided cards, static on the GPU, flipped by the wave in the vertex
// shader (the shot's L curve, line for line); tapered speed ribbons; his ream as a real box (his face on its ends, 343 printed sheet
// edges down its sides); the sky; and the slice's split. Everything here is drawn into the HDR that the Riso print re-prints (night).
// Constructible in Node: no GL before a field is made (the part makes them in init()).
import * as THREE from 'three';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { SDF_EDGE } from '../engine/sdf.ts';
import { REAM_DIR, REAM_STEPS } from '../shots/cosmosBang.ts';

type V3 = readonly [number, number, number];
type RGBA = readonly [number, number, number, number];

/** GLSL: the launch curve of src/shots/cosmosBang.ts L(), line for line. */
export const GLSL_L = /* glsl */ `
  float launchL(float t) {
    if (t <= 0.0) return 0.0;
    return 1.0 - exp(-0.5625 * t) * (cos(0.496 * t) + 1.134 * sin(0.496 * t));
  }`;

/** Card modes: a glyph (on its card when it has one), a sprite from the sprite sheet, a round dot, a four-point glint. */
export const CARD_MODE = { glyph: 0, sprite: 1, dot: 2, glint: 3 } as const;

/** One card as the field draws it. Right and up are half-extents (world units); their cross product is its front. */
export type ACard = {
  centre: V3;
  right: V3;
  up: V3;
  /** Atlas or sprite rect: u0, v0 (top), u1, v1 (bottom). */
  uv: readonly [number, number, number, number];
  ink: RGBA;
  /** The card's colour; alpha 0 = no card (a bare glyph). */
  bg: RGBA;
  /** The glyph's half-height (card-local, the card is 2 high), the corner radius (local), the mode, the glyph quad's width / height. */
  glyph: number;
  radius: number;
  mode: number;
  aspect: number;
  /** Screen target (NDC centre x, y and half-size x, y) and how far the card is pulled onto it (0 in the world … 1 flat on the screen). */
  flat?: readonly [number, number, number, number];
  mix?: number;
};

/**
 * Instanced print cards. `blend` 'opaque' cards write depth and cut their edge (alpha to coverage under MSAA), so they need no sort;
 * 'add' cards are light (glints, glows): they test depth but never write it. Two textures: the glyph atlas (SDF) and an RGBA sprite sheet.
 */
export class ACardField {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private readonly geo: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  private readonly attrs: Record<string, THREE.InstancedBufferAttribute> = {};
  private count = 0;

  /**
   * `outline`: bare glyphs get an outline `width` field units (atlas radii) wide just outside their edge, in `color` (linear) — type that must
   * read over anything (the ring-counter's amber digits over the amber globe).
   */
  constructor(o: { capacity: number; atlas: GlyphAtlas; sprites?: THREE.Texture | null; blend: 'opaque' | 'add' | 'over'; depthTest?: boolean; outline?: { width: number; color: readonly [number, number, number] } }) {
    this.capacity = o.capacity;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const sizes: Record<string, number> = { aC: 3, aR: 3, aU: 3, aUv: 4, aInk: 4, aBg: 4, aP: 4, aFlat: 4, aMix: 1 };
    for (const [k, n] of Object.entries(sizes)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(o.capacity * n), n).setUsage(THREE.DynamicDrawUsage);
      this.attrs[k] = a;
      this.geo.setAttribute(k, a);
    }
    const opaque = o.blend === 'opaque';
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: o.atlas.texture },
        sprites: { value: o.sprites ?? null },
        uGain: { value: 1 },
        uUnmirror: { value: 0 },
        uOutW: { value: o.outline?.width ?? 0 },
        uOutC: { value: new THREE.Vector3(...(o.outline?.color ?? [0, 0, 0])) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aC; attribute vec3 aR; attribute vec3 aU;
        attribute vec4 aUv; attribute vec4 aInk; attribute vec4 aBg; attribute vec4 aP; attribute vec4 aFlat; attribute float aMix;
        varying vec2 vL; varying vec2 vG; varying float vAspect; varying vec4 vUv; varying vec4 vInk; varying vec4 vBg; varying vec4 vP;
        void main() {
          vec3 world = aC + position.x * aR + position.y * aU;
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
          if (aMix > 0.0) {
            vec2 flatNdc = aFlat.xy + position.xy * aFlat.zw;
            vec2 ndc = clip.xy / max(clip.w, 1e-5);
            float z = clip.z / max(clip.w, 1e-5);
            clip = vec4(mix(ndc, flatNdc, aMix), mix(z, -0.999, aMix), 1.0);
          }
          gl_Position = clip;
          float lr = length(aR);
          float lu = max(length(aU), 1e-6);
          vAspect = lr / lu;
          vL = position.xy;
          // the glyph quad: half-height aP.x (local y units), half-width aP.x * aspect (in y units) → local x units / card aspect
          float gh = max(aP.x, 1e-4);
          vG = vec2(position.x * vAspect / (gh * aP.w), position.y / gh);
          vUv = aUv; vInk = aInk; vBg = aBg; vP = aP;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform sampler2D sprites;
        uniform float uGain;
        uniform float uUnmirror;
        uniform float uOutW; uniform vec3 uOutC;
        varying vec2 vL; varying vec2 vG; varying float vAspect; varying vec4 vUv; varying vec4 vInk; varying vec4 vBg; varying vec4 vP;
        float glyphAt(float edge) {
          vec2 gg = vG;
          if (uUnmirror > 0.5 && !gl_FrontFacing) gg.x = -gg.x;
          if (abs(gg.x) > 1.0 || abs(gg.y) > 1.0) return 0.0;
          vec2 uv = vec2(mix(vUv.x, vUv.z, gg.x * 0.5 + 0.5), mix(vUv.w, vUv.y, gg.y * 0.5 + 0.5));
          float m = texture2D(atlas, uv).r;
          float aa = max(fwidth(m), 1e-4) * 0.7;
          return smoothstep(edge - aa, edge + aa, m);
        }
        float glyphA() { return glyphAt(${SDF_EDGE.toFixed(4)}); }
        void main() {
          int mode = int(vP.z + 0.5);
          vec4 c = vec4(0.0);
          if (mode == 0) {
            float g = glyphA() * vInk.a;
            if (vBg.a > 0.0) {
              vec2 q = abs(vec2(vL.x * vAspect, vL.y)) - vec2(vAspect - vP.y, 1.0 - vP.y);
              float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vP.y;
              float aa = max(fwidth(d), 1e-4);
              float card = (1.0 - smoothstep(-aa, aa, d)) * vBg.a;
              c = vec4(mix(vBg.rgb, vInk.rgb, g), max(card, g));
            } else if (uOutW > 0.0) {
              float o = glyphAt(${SDF_EDGE.toFixed(4)} - uOutW) * vInk.a;
              c = vec4(mix(uOutC, vInk.rgb, g / max(vInk.a, 1e-4)), o);
            } else c = vec4(vInk.rgb, g);
          } else if (mode == 1) {
            vec2 uv = vec2(mix(vUv.x, vUv.z, vL.x * 0.5 + 0.5), mix(vUv.w, vUv.y, vL.y * 0.5 + 0.5));
            vec4 s = texture2D(sprites, uv);
            c = vec4(s.rgb * vInk.rgb, s.a * vInk.a);
          } else if (mode == 2) {
            float d = length(vL);
            float aa = max(fwidth(d), 1e-4);
            c = vec4(vInk.rgb, (1.0 - smoothstep(1.0 - aa, 1.0, d)) * vInk.a);
          } else {
            vec2 p = abs(vL);
            float ray = pow(max(0.0, 1.0 - p.x), 3.0) * exp(-p.y * p.y * 900.0) + pow(max(0.0, 1.0 - p.y), 3.0) * exp(-p.x * p.x * 900.0);
            float core = exp(-dot(vL, vL) * 40.0);
            c = vec4(vInk.rgb, clamp(ray + core, 0.0, 1.0) * vInk.a);
          }
          #ifdef OPAQUE
            if (c.a < 0.5) discard;
            gl_FragColor = vec4(c.rgb * uGain, 1.0);
          #else
            if (c.a < 0.003) discard;
            gl_FragColor = vec4(c.rgb * c.a * uGain, c.a);
          #endif
        }`,
      defines: opaque ? { OPAQUE: '' } : {},
      blending: o.blend === 'add' ? THREE.AdditiveBlending : o.blend === 'over' ? THREE.CustomBlending : THREE.NoBlending,
      ...(o.blend === 'over' ? { blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation } : {}),
      premultipliedAlpha: !opaque,
      depthTest: o.depthTest ?? true,
      depthWrite: opaque,
      transparent: !opaque,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    base.dispose();
  }

  /** Starts a new list of cards. */
  begin(): void {
    this.count = 0;
  }

  /** Adds one card (throws when full). */
  push(c: ACard): void {
    if (this.count >= this.capacity) throw new Error(`card field is full (${this.capacity})`);
    const i = this.count++;
    const a = this.attrs;
    (a.aC.array as Float32Array).set(c.centre, 3 * i);
    (a.aR.array as Float32Array).set(c.right, 3 * i);
    (a.aU.array as Float32Array).set(c.up, 3 * i);
    (a.aUv.array as Float32Array).set(c.uv, 4 * i);
    (a.aInk.array as Float32Array).set(c.ink, 4 * i);
    (a.aBg.array as Float32Array).set(c.bg, 4 * i);
    const p = a.aP.array as Float32Array;
    p[4 * i] = c.glyph;
    p[4 * i + 1] = c.radius;
    p[4 * i + 2] = c.mode;
    p[4 * i + 3] = c.aspect;
    (a.aFlat.array as Float32Array).set(c.flat ?? [0, 0, 0, 0], 4 * i);
    (a.aMix.array as Float32Array)[i] = c.mix ?? 0;
  }

  /** Uploads what was pushed since begin() and draws that many. */
  end(): void {
    this.geo.instanceCount = this.count;
    for (const a of Object.values(this.attrs)) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
      a.needsUpdate = true;
    }
  }

  get size(): number {
    return this.count;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** Tapered halftone ribbons (the frozen speed trails): each from a head (full width) to a tail (a point), camera-facing. */
export class RibbonField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  private readonly head: THREE.InstancedBufferAttribute;
  private readonly tail: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;
  private readonly capacity: number;
  private count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    const attr = (n: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * n), n).setUsage(THREE.DynamicDrawUsage);
    this.head = attr(4); // xyz, half-width
    this.tail = attr(4); // xyz, unused
    this.color = attr(4);
    this.geo.setAttribute('aHead', this.head);
    this.geo.setAttribute('aTail', this.tail);
    this.geo.setAttribute('aColor', this.color);
    this.geo.instanceCount = 0;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: { uPitch: { value: 0.18 } },
      vertexShader: /* glsl */ `
        attribute vec4 aHead; attribute vec4 aTail; attribute vec4 aColor;
        varying vec2 vP; varying vec4 vColor;
        void main() {
          vec4 h = modelViewMatrix * vec4(aHead.xyz, 1.0);
          vec4 t = modelViewMatrix * vec4(aTail.xyz, 1.0);
          vec3 along = t.xyz - h.xyz;
          vec3 side = normalize(cross(along, vec3(0.0, 0.0, 1.0)) + vec3(1e-6));
          float u = position.x * 0.5 + 0.5;
          vec3 p = mix(h.xyz, t.xyz, u) + side * position.y * aHead.w * (1.0 - u);
          gl_Position = projectionMatrix * vec4(p, 1.0);
          vP = vec2(u, position.y);
          vColor = aColor;
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vP; varying vec4 vColor;
        void main() {
          // halftone dots along the trail, shrinking toward the tail
          float k = 1.0 - vP.x;
          float cell = fract(vP.x * 14.0) - 0.5;
          float r = 0.42 * k;
          float d = length(vec2(cell, vP.y * 0.5 * k));
          float aa = max(fwidth(d), 1e-3);
          float a = (1.0 - smoothstep(r - aa, r + aa, d)) * vColor.a;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor.rgb * a, a);
        }`,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      premultipliedAlpha: true,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  begin(): void {
    this.count = 0;
  }

  push(head: V3, tail: V3, halfWidth: number, color: RGBA): void {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    (this.head.array as Float32Array).set([head[0], head[1], head[2], halfWidth], 4 * i);
    (this.tail.array as Float32Array).set([tail[0], tail[1], tail[2], 0], 4 * i);
    (this.color.array as Float32Array).set(color, 4 * i);
  }

  end(): void {
    this.geo.instanceCount = this.count;
    for (const a of [this.head, this.tail, this.color]) a.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** GLSL: src/shots/cosmosBang.ts reamOffsetLength(), from the same step table. */
const GLSL_REAM_OFF = (() => {
  let code = 'float reamOff(float k) { k = max(k, 0.0); float m = 0.0; float n = 0.0;';
  let from = 0;
  for (const s of REAM_STEPS) {
    const span = s.upto === Infinity ? 1e6 : s.upto - from;
    code += ` n = min(k, ${span.toFixed(1)}); m += n * ${s.pitch.toFixed(6)}; k -= n;`;
    from = s.upto;
  }
  return `${code} return m; }`;
})();

/**
 * His ream as a box: 1 W wide, 0.42 W tall, its depth the sheets behind him (scaled each sub-frame), sheared down-left sheet by sheet
 * along REAM_DIR (the misregistered Ctrl+V copies: reamOffset, so off-axis the stack reads as a fat drop shadow). Its front and back are
 * his card (Riso yellow, his face knocked out in paper; the back reads as him too); its four sides are the sheets' edges in bands wide
 * enough to survive the print's screen: the first six copies one stripe each (pink, blue, yellow: the rainbow), the next 42 in pairs and
 * the last 294 in sevens, each band yellow, paper, pink or blue by hash, a paper line between bands and a sliver of a different ω face.
 */
export class ReamBox {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geo: THREE.BoxGeometry;

  constructor(atlas: GlyphAtlas) {
    this.geo = new THREE.BoxGeometry(1, 0.42, 1, 1, 1, 96);
    this.geo.translate(0, 0, -0.5); // the front at z = 0, the depth along −z (96 slices: the shear follows the offset's knees)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas.texture },
        uFace: { value: new THREE.Vector4() },
        uFaceAspect: { value: 1 },
        uFaceH: { value: 0.62 },
        uDepth: { value: 0.0001 },
        uPitch: { value: 0.002 },
        uYellow: { value: new THREE.Color() },
        uPaper: { value: new THREE.Color() },
        uEdge: { value: new THREE.Color() },
        uPink: { value: new THREE.Color() },
        uBlue: { value: new THREE.Color() },
        uDir: { value: new THREE.Vector2(REAM_DIR[0], REAM_DIR[1]) },
        uGlow: { value: 0 },
        uBreath: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform float uDepth; uniform float uPitch; uniform vec2 uDir;
        varying vec3 vObj; varying vec3 vN;
        ${GLSL_REAM_OFF}
        void main() {
          vec3 p = position; p.z *= uDepth;
          vObj = p; vN = normal;
          p.xy += uDir * reamOff(-p.z / uPitch);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform vec4 uFace; uniform float uFaceAspect; uniform float uFaceH;
        uniform float uDepth; uniform float uPitch; uniform float uGlow; uniform float uBreath;
        uniform vec3 uYellow; uniform vec3 uPaper; uniform vec3 uEdge; uniform vec3 uPink; uniform vec3 uBlue;
        varying vec3 vObj; varying vec3 vN;
        float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
        void main() {
          vec3 n = normalize(vN);
          vec3 col;
          if (abs(n.z) > 0.5) {
            // an end: his card. x in [-0.5, 0.5], y in [-0.21, 0.21]; the back mirrors x so he reads from behind too
            float x = n.z > 0.0 ? vObj.x : -vObj.x;
            vec2 local = vec2(x / 0.21, vObj.y / 0.21);
            vec2 g = vec2(local.x / (uFaceH * uFaceAspect), local.y / uFaceH);
            float m = 0.0;
            if (abs(g.x) <= 1.0 && abs(g.y) <= 1.0) {
              vec2 uv = vec2(mix(uFace.x, uFace.z, g.x * 0.5 + 0.5), mix(uFace.w, uFace.y, g.y * 0.5 + 0.5));
              float s = texture2D(atlas, uv).r;
              float aa = max(fwidth(s), 1e-4) * 0.7;
              m = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, s);
            }
            // a keyline round the card
            float edge = max(smoothstep(0.488, 0.5, abs(vObj.x)), smoothstep(0.198, 0.21, abs(vObj.y)));
            col = mix(mix(uYellow, uEdge, edge * 0.6), uPaper, m);
          } else {
            // a side: the sheets' edges in bands (one stripe each for the first six copies, then pairs, then sevens)
            float s = -vObj.z / (uPitch * uBreath);
            float g = s < 6.0 ? 1.0 : s < 48.0 ? 2.0 : 7.0;
            float b0 = s < 6.0 ? floor(s) : s < 48.0 ? 6.0 + 2.0 * floor((s - 6.0) / 2.0) : 48.0 + 7.0 * floor((s - 48.0) / 7.0);
            float f = (s - b0) / g;
            float hb = h1(b0 * 0.731 + 3.0);
            vec3 band = hb < 0.46 ? uYellow : hb < 0.6 ? uPaper : hb < 0.8 ? uPink : uBlue;
            if (s < 6.0) { float r = mod(b0, 3.0); band = r < 0.5 ? uYellow : r < 1.5 ? uPink : uBlue; }
            col = f > (s < 6.0 ? 0.8 : 0.78) ? uPaper : band;
            // a sliver of a different ω face: dark specks at hashed heights
            float across = abs(n.x) > 0.5 ? vObj.y / 0.42 + 0.5 : vObj.x + 0.5;
            float speck = step(abs(across - (0.25 + 0.5 * h1(b0))), 0.02 + 0.025 * h1(b0 + 7.0)) * step(f, 0.7);
            col = mix(col, uEdge * 0.5, speck);
          }
          gl_FragColor = vec4(col * (1.0 + uGlow), 1.0);
        }`,
      side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** A screen-space radial glow (linear light, smooth: the Riso print screens it into dots) drawn as a quad at a 1080p-px centre and radius. */
export class GlowQuad {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geo: THREE.PlaneGeometry;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-960, 960, 540, -540, -1, 1);

  constructor() {
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector4(1, 1, 1, 1) }, uPower: { value: 1.6 } },
      vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec4 uColor; uniform float uPower;
        varying vec2 vP;
        void main() {
          float d = length(vP);
          float a = pow(max(0.0, 1.0 - d), uPower) * uColor.a;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor.rgb * a, a);
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.scene.add(this.mesh);
  }

  /** Adds a glow of linear colour `rgb` × `alpha` at (x, y) px (y up), radius r px (ry for an ellipse), falloff power `power`. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, x: number, y: number, r: number, rgb: readonly number[], alpha: number, power = 1.6, ry = r): void {
    if (alpha <= 0 || r <= 0) return;
    this.mesh.position.set(x, y, 0);
    this.mesh.scale.set(r, ry, 1);
    this.material.uniforms.uColor.value.set(rgb[0], rgb[1], rgb[2], alpha);
    this.material.uniforms.uPower.value = power;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** The slice (cosmos 1.4): the finished frame split along a line, the halves slid apart along it (src/shots/cosmosBang.ts sliceAt). */
export class SliceComposite {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly material: THREE.ShaderMaterial;
  private readonly geo: THREE.BufferGeometry;

  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, uLine: { value: new THREE.Vector4() }, uOffset: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec4 uLine;  // point (px, y up, centre origin), direction (unit)
        uniform float uOffset;
        varying vec2 vUv;
        void main() {
          vec2 px = (vUv - 0.5) * vec2(1920.0, 1080.0);
          vec2 d = uLine.zw;
          vec2 n = vec2(-d.y, d.x);
          float side = sign(dot(px - uLine.xy, n));
          vec2 src = px - side * uOffset * d;
          gl_FragColor = texture2D(map, src / vec2(1920.0, 1080.0) + 0.5);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  draw(gl: THREE.WebGLRenderer, source: THREE.Texture, target: THREE.WebGLRenderTarget, line: { x: number; y: number; angle: number }, offset: number): void {
    this.material.uniforms.map.value = source;
    this.material.uniforms.uLine.value.set(line.x, line.y, Math.cos(line.angle), Math.sin(line.angle));
    this.material.uniforms.uOffset.value = offset;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
