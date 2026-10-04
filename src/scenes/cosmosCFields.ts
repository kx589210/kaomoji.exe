// Two instanced fields renderer C draws its light with (cosmos 5–6; build sheet notes/bcos/sheet.md §10.1): TextRunField, runs of
// his signature typeset along the web's filaments (one quad a run, the text a repeating strip of `E2 80 A2 20 CF 89 20 E2 80 A2 ` in
// JetBrains Mono, so a filament costs one instance however long it is), and SpriteField, soft sprites from a small painted atlas (a
// node's two-armed spiral impostor, a glow, a four-point ✦ glint, a spark square, a halftone hexagon ghost). Both draw light ('add'),
// in screen px at 1080p (origin at the centre, y up) under the flat world's frontal camera, like a FlatLayer's fields, whose scene they
// join (src/scenes/cosmosCWeb.ts). GPU objects are made in the constructors, which only the renderers' init() calls.
import * as THREE from 'three';
import type { RGB } from '../engine/color.ts';
import { cssStack } from '../engine/fonts.ts';
import { SIGNATURE } from '../content/cosmos.ts';

/** The repeating text: the signature and a space (11 bytes, 33 characters). */
const STRIP_TEXT = `${SIGNATURE} `;
const STRIP_PX = 64;

/** A run of text for the GPU: endpoints (px), its height (px), its first byte (fractional), colour (linear light × alpha). */
export type RunInstance = { x0: number; y0: number; x1: number; y1: number; h: number; u0: number; color: RGB };

/**
 * Text along segments. Each instance is a quad from (x0, y0) to (x1, y1), `h` tall, sampling the strip from byte `u0` at the run's
 * start; a run that points left is drawn from its other end, so the text always reads left to right and upright to its line.
 */
export class TextRunField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly a: THREE.InstancedBufferAttribute;
  private readonly b: THREE.InstancedBufferAttribute;
  private readonly c: THREE.InstancedBufferAttribute;
  private readonly texture: THREE.CanvasTexture;
  readonly capacity: number;
  /** The strip's width over its height: px of text per px of height for one cycle. */
  private readonly cycle: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `500 ${STRIP_PX}px ${cssStack('mono')}`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(STRIP_TEXT).width);
    canvas.width = w;
    canvas.height = Math.round(STRIP_PX * 1.4);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(STRIP_TEXT, 0, canvas.height / 2);
    this.cycle = canvas.width / canvas.height;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.anisotropy = 8;
    this.texture.colorSpace = THREE.NoColorSpace;
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    const attr = (n: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * n), n).setUsage(THREE.DynamicDrawUsage);
    this.a = attr(4);
    this.b = attr(4);
    this.c = attr(3);
    this.geo.setAttribute('aEnds', this.a);
    this.geo.setAttribute('aRun', this.b);
    this.geo.setAttribute('aColor', this.c);
    this.geo.instanceCount = 0;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: { strip: { value: this.texture }, uCycle: { value: this.cycle } },
      vertexShader: /* glsl */ `
        attribute vec4 aEnds;  // x0, y0, x1, y1
        attribute vec4 aRun;   // height, u0 (cycles), length (px), alpha
        attribute vec3 aColor;
        uniform float uCycle;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          vec2 a = aEnds.xy;
          vec2 b = aEnds.zw;
          vec2 d = b - a;
          float len = max(length(d), 1e-3);
          vec2 along = d / len;
          vec2 across = vec2(-along.y, along.x);
          vec2 p = a + along * (position.x + 0.5) * len + across * position.y * aRun.x * 1.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
          vUv = vec2(aRun.y + (position.x + 0.5) * len / (aRun.x * 1.4 * uCycle), position.y + 0.5);
          vColor = aColor * aRun.w;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D strip;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          float m = texture2D(strip, vUv).a;
          if (m < 0.004) discard;
          gl_FragColor = vec4(vColor * m, m);
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Bytes of the signature per cycle of the strip. */
  static readonly BYTES = 11;

  write(runs: readonly RunInstance[]): void {
    const n = Math.min(runs.length, this.capacity);
    const a = this.a.array as Float32Array;
    const b = this.b.array as Float32Array;
    const c = this.c.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const r = runs[i];
      const len = Math.hypot(r.x1 - r.x0, r.y1 - r.y0);
      const left = r.x1 < r.x0;
      // Upright and left to right: a leftward run is drawn from its far end, its first byte moved there.
      const cycles = r.u0 / TextRunField.BYTES - (left ? len / (r.h * 1.4 * this.cycle) : 0);
      a.set(left ? [r.x1, r.y1, r.x0, r.y0] : [r.x0, r.y0, r.x1, r.y1], 4 * i);
      b.set([r.h, cycles, len, 1], 4 * i);
      c.set(r.color, 3 * i);
    }
    this.geo.instanceCount = n;
    this.a.needsUpdate = true;
    this.b.needsUpdate = true;
    this.c.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

export type SpriteKind = 'spiral' | 'blob' | 'glint' | 'square' | 'hexagon';
const KINDS: readonly SpriteKind[] = ['spiral', 'blob', 'glint', 'square', 'hexagon'];
const CELL = 128;

/** A sprite for the GPU: centre and radius (px), turn (radians, counter-clockwise), colour (linear light × gain). */
export type SpriteInstance = { kind: SpriteKind; x: number; y: number; r: number; rot: number; color: RGB };

/** Paints the sprite atlas: one 128 px cell per kind, white on transparent, light falling off to the cell's edge. */
function paintAtlas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CELL * KINDS.length;
  c.height = CELL;
  const x = c.getContext('2d')!;
  const h = CELL / 2;
  KINDS.forEach((k, i) => {
    x.save();
    x.translate(i * CELL + h, h);
    if (k === 'spiral') {
      // A small spiral galaxy seen face-on: a soft core and two log arms of dots and strokes.
      const g = x.createRadialGradient(0, 0, 0, 0, 0, h * 0.95);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.18, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(-h, -h, CELL, CELL);
      x.strokeStyle = '#fff';
      x.lineCap = 'round';
      for (const o of [0, Math.PI]) {
        x.beginPath();
        for (let t = 0; t < 3.6; t += 0.05) {
          const r = 6 + 15 * t;
          if (r > h - 6) break;
          x.lineTo(r * Math.cos(t + o), r * Math.sin(t + o) * 0.82);
        }
        x.lineWidth = 3.2;
        x.globalAlpha = 0.9;
        x.stroke();
        for (let t = 0.4; t < 3.6; t += 0.45) {
          const r = 6 + 15 * t;
          if (r > h - 8) break;
          x.beginPath();
          x.arc(r * Math.cos(t + o + 0.25), r * Math.sin(t + o + 0.25) * 0.82, 2.4, 0, Math.PI * 2);
          x.fillStyle = '#fff';
          x.globalAlpha = 0.7;
          x.fill();
        }
      }
    } else if (k === 'blob') {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(-h, -h, CELL, CELL);
    } else if (k === 'glint') {
      x.fillStyle = '#fff';
      for (let r = 0; r < 4; r++) {
        x.rotate(Math.PI / 2);
        x.beginPath();
        x.moveTo(0, -h + 2);
        x.quadraticCurveTo(3, -3, h - 2, 0);
        x.quadraticCurveTo(3, 3, 0, h - 2);
        x.quadraticCurveTo(-3, 3, -h + 2, 0);
        x.quadraticCurveTo(-3, -3, 0, -h + 2);
        x.fill();
      }
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 20);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(-20, -20, 40, 40);
    } else if (k === 'square') {
      x.fillStyle = '#fff';
      x.fillRect(-h * 0.7, -h * 0.7, h * 1.4, h * 1.4);
    } else {
      // A Riso hexagon lens ghost: a halftone of dots, denser at the rim.
      x.beginPath();
      for (let s = 0; s < 6; s++) x.lineTo((h - 3) * Math.cos(s * (Math.PI / 3) + Math.PI / 6), (h - 3) * Math.sin(s * (Math.PI / 3) + Math.PI / 6));
      x.closePath();
      x.clip();
      x.fillStyle = '#fff';
      for (let j = -8; j <= 8; j++) {
        for (let q = -8; q <= 8; q++) {
          const px = q * 8 + (j % 2) * 4;
          const py = j * 7;
          const d = Math.hypot(px, py) / h;
          x.beginPath();
          x.arc(px, py, 1 + 2.6 * d * d, 0, Math.PI * 2);
          x.fill();
        }
      }
    }
    x.restore();
  });
  return c;
}

/** Sprites drawn as light. */
export class SpriteField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly a: THREE.InstancedBufferAttribute;
  private readonly c: THREE.InstancedBufferAttribute;
  private readonly texture: THREE.CanvasTexture;
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.texture = new THREE.CanvasTexture(paintAtlas());
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.colorSpace = THREE.NoColorSpace;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.c = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aSprite', this.a);
    this.geo.setAttribute('aColor', this.c);
    this.geo.instanceCount = 0;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: this.texture }, uKinds: { value: KINDS.length } },
      vertexShader: /* glsl */ `
        attribute vec4 aSprite; // x, y, r, rot
        attribute vec4 aColor;  // r, g, b, kind
        uniform float uKinds;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          float c = cos(aSprite.w), s = sin(aSprite.w);
          vec2 p = aSprite.xy + mat2(c, s, -s, c) * position.xy * aSprite.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
          vUv = vec2((aColor.w + position.x * 0.5 + 0.5) / uKinds, position.y * 0.5 + 0.5);
          vColor = aColor.rgb;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          float m = texture2D(atlas, vUv).a;
          if (m < 0.003) discard;
          gl_FragColor = vec4(vColor * m, m);
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  write(sprites: readonly SpriteInstance[]): void {
    const n = Math.min(sprites.length, this.capacity);
    const a = this.a.array as Float32Array;
    const c = this.c.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const s = sprites[i];
      a[4 * i] = s.x;
      a[4 * i + 1] = s.y;
      a[4 * i + 2] = s.r;
      a[4 * i + 3] = s.rot;
      c[4 * i] = s.color[0];
      c[4 * i + 1] = s.color[1];
      c[4 * i + 2] = s.color[2];
      c[4 * i + 3] = KINDS.indexOf(s.kind);
    }
    this.geo.instanceCount = n;
    this.a.needsUpdate = true;
    this.c.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
