// A flat vector painter for drop 2's act-2 worlds (builder U / A): filled polygons (ear-clipped by three's ShapeUtils), four-corner
// gradients (each corner its own colour and, optionally, alpha: soft-edged ribbons) and antialiased strokes with a width per point, in layout px (1920 × 1080, y down), drawn in order with straight alpha
// through the flat world's frontal camera (1 unit = 1 px at 1080p, any device size). Its content is the pure shots' VecItem lists
// (src/shots/drop2Wave.ts). Rebuilt on every draw; never clears the target.
import * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import type { RGB } from '../engine/color.ts';
import type { VecItem } from '../shots/drop2Wave.ts';

const VERT = /* glsl */ `
  attribute vec2 aEdge;
  attribute vec4 aColor;
  varying vec2 vEdge;
  varying vec4 vColor;
  void main() {
    vEdge = aEdge;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// A stroke quad carries its signed distance across the line (vEdge.x) and its half width (vEdge.y): coverage over one device pixel.
// Fills carry a huge half width, so they are solid.
const FRAG = /* glsl */ `
  varying vec2 vEdge;
  varying vec4 vColor;
  void main() {
    float aa = max(fwidth(vEdge.x), 1e-4);
    float a = clamp((vEdge.y - abs(vEdge.x)) / aa + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(vColor.rgb, vColor.a * a);
  }`;

const FOV = 20;
export const SCREEN_POSE = frontal(fillDistance(1080, FOV), 0, 0, FOV);
const SOLID = 1e6;

export class VectorMesh {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly geo = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly pos: THREE.BufferAttribute;
  private readonly edge: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  private readonly capacity: number;
  private n = 0;
  private warned = false;

  constructor(aspect: number, capacity = 600_000) {
    this.capacity = capacity;
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, 1, 60000);
    this.pos = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.edge = new THREE.BufferAttribute(new Float32Array(capacity * 2), 2).setUsage(THREE.DynamicDrawUsage);
    this.color = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.pos);
    this.geo.setAttribute('aEdge', this.edge);
    this.geo.setAttribute('aColor', this.color);
    this.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.geo, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  private vert(x: number, y: number, d: number, half: number, c: RGB, a: number): void {
    if (this.n >= this.capacity) return;
    const i = this.n++;
    const p = this.pos.array as Float32Array;
    const e = this.edge.array as Float32Array;
    const k = this.color.array as Float32Array;
    p[3 * i] = x - 960;
    p[3 * i + 1] = 540 - y;
    p[3 * i + 2] = 0;
    e[2 * i] = d;
    e[2 * i + 1] = half;
    k[4 * i] = c[0];
    k[4 * i + 1] = c[1];
    k[4 * i + 2] = c[2];
    k[4 * i + 3] = a;
  }

  private fill(pts: readonly number[], c: RGB, a: number): void {
    const n = pts.length / 2;
    if (n < 3) return;
    const contour: THREE.Vector2[] = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(pts[2 * i], pts[2 * i + 1]));
    let tris: number[][];
    try {
      tris = THREE.ShapeUtils.triangulateShape(contour, []);
    } catch {
      return;
    }
    for (const t of tris) for (const k of t) this.vert(contour[k].x, contour[k].y, 0, SOLID, c, a);
  }

  private quad(pts: readonly number[], cs: readonly RGB[], a: number, as?: readonly number[]): void {
    const v = (k: number): void => this.vert(pts[2 * k], pts[2 * k + 1], 0, SOLID, cs[k], a * (as ? as[k] : 1));
    v(0);
    v(1);
    v(2);
    v(0);
    v(2);
    v(3);
  }

  /** One segment, `w0` → `w1` wide, with a 1 px fringe and caps half its width long (so the joints of a polyline close). */
  private segment(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c: RGB, a: number): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1e-6) return;
    const tx = (x1 - x0) / len;
    const ty = (y1 - y0) / len;
    const h0 = w0 / 2;
    const h1 = w1 / 2;
    const o0 = h0 + 1;
    const o1 = h1 + 1;
    const ax = x0 - tx * h0 * 0.5;
    const ay = y0 - ty * h0 * 0.5;
    const bx = x1 + tx * h1 * 0.5;
    const by = y1 + ty * h1 * 0.5;
    this.vert(ax - ty * o0, ay + tx * o0, o0, h0, c, a);
    this.vert(bx - ty * o1, by + tx * o1, o1, h1, c, a);
    this.vert(bx + ty * o1, by - tx * o1, -o1, h1, c, a);
    this.vert(ax - ty * o0, ay + tx * o0, o0, h0, c, a);
    this.vert(bx + ty * o1, by - tx * o1, -o1, h1, c, a);
    this.vert(ax + ty * o0, ay - tx * o0, -o0, h0, c, a);
  }

  private stroke(pts: readonly number[], widths: readonly number[], c: RGB, a: number, closed: boolean): void {
    const n = pts.length / 2;
    for (let i = 0; i + 1 < n; i++) this.segment(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], widths[i] ?? widths[0], widths[i + 1] ?? widths[0], c, a);
    if (closed && n > 2) this.segment(pts[2 * n - 2], pts[2 * n - 1], pts[0], pts[1], widths[n - 1] ?? widths[0], widths[0], c, a);
  }

  /** Draws `items` in order over `target` (layout px), through the frontal flat camera. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null, items: readonly VecItem[]): void {
    if (items.length === 0) return;
    this.n = 0;
    for (const it of items) {
      if (it.alpha <= 0) continue;
      if (it.kind === 'fill') this.fill(it.pts, it.color, it.alpha);
      else if (it.kind === 'quad') this.quad(it.pts, it.colors, it.alpha, it.alphas);
      else this.stroke(it.pts, it.widths, it.color, it.alpha, it.closed);
    }
    if (this.n >= this.capacity && !this.warned) {
      this.warned = true;
      console.warn(`VectorMesh: full (${this.capacity} vertices)`);
    }
    for (const a of [this.pos, this.edge, this.color]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * a.itemSize);
      a.needsUpdate = true;
    }
    this.geo.setDrawRange(0, this.n);
    this.camera.position.set(...SCREEN_POSE.position);
    this.camera.up.set(...SCREEN_POSE.up);
    this.camera.lookAt(...SCREEN_POSE.target);
    this.camera.fov = SCREEN_POSE.fov;
    this.camera.updateProjectionMatrix();
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
