// Renderer B, the arm and the galaxy on the GPU (cosmos 3.4& → 5.1; the pure half and its sources: src/shots/cosmosGalaxy.ts). One
// world, one camera: through the fling the arm's star systems recede round the shrinking solar system; from 4.1 he bursts out of his star
// and the camera chases him down the arm — every star streaking past toward the lens, flipping amber as he passes, a ring of flips popping
// round him on every 16th, the dust wall looming and punched open on the clap — then the snap carries the camera 2,000 arm units out and
// up in 4 frames onto the whole spiral, which powers up into neon core → rim (the arms' spines lit as tubes, light bursts racing out each
// arm, the host arms flipping amber), the core fires the quasar's jets along the galaxy's axis, and the tilt drops the camera into the
// disc's plane until its light is one blazing band across the centre: C's filament on 5.1 (bandProfile, the match cut).
import * as THREE from 'three';
import { type RGB, linear } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Shape } from '../engine/shapeField.ts';
import { HERO_FACES } from '../content/castCosmos.ts';
import { DUST, FLING, IGNITION, QUASAR, REVEAL, WARP } from '../score/cosmos.ts';
import { BAND_INK } from '../shots/cosmosWeb.ts';
import { FOV, FRONT, GROUNDS } from '../shots/cosmosKit.ts';
import * as G from '../shots/cosmosGalaxy.ts';
import { type Cam, project } from '../shots/cosmosSolar.ts';
import { cO, clamp01, kickSurge, pulseAt, sF } from '../shots/cosmosSolarKit.ts';
import { DustField, SpiralField, TunnelField } from './cosmosBArm.ts';
import { SegField } from './cosmosBFields.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const GROUND = linear(GROUNDS[3]);
const AMBER = linear('#FFB23E');
const CYAN = linear('#3FE0FF');
const PINK = linear('#FF3D8B');
const CREAM = linear('#E9E2D2');
const CORE = linear('#FFE2B4');
const UNLIT = linear('#B4AAF0', 0.6);
const HOT = linear('#FFE9C0');
/** The dust sheet: a dark lane printed over with the pink and blue plates' halftone (the Riso's own inks, as dust). */
const SHEET_DARK = linear('#1A0F3A');
const SHEET_PINK = linear('#FF48B0', 0.55);
const SHEET_BLUE = linear('#0078BF', 0.7);
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

export class GalaxyRenderer {
  private paper: FlatLayer | null = null;
  private dim: FlatLayer | null = null;
  private faces: FlatLayer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 2e5);
  private tunnel: TunnelField | null = null;
  private dust: DustField | null = null;
  private spiral: SpiralField | null = null;
  private readonly back = new SegField(6000);
  private readonly band = new SegField(8, { core: 1 / 3, halo: 0 });
  private readonly front = new SegField(4000);
  /** This sub-frame's SUBJECT, light-catching points and sparks (for the light grammar). */
  subject = { x: 0, y: 0, r: 60 };
  readonly glints: [number, number][] = [];
  readonly sparks: [number, number][] = [];

  init(_gl: THREE.WebGLRenderer, atlases: { face: GlyphAtlas }, size: { width: number; height: number }): void {
    const aspect = size.width / size.height;
    this.paper = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 4, glyphs: 1 });
    this.dim = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 8, glyphs: 1 });
    this.faces = new FlatLayer({ atlases: { face: atlases.face }, blend: 'add', aspect, shapes: 8, glyphs: 900 });
    this.tunnel = new TunnelField(
      atlases.face,
      G.TUNNEL_STARS.map((s) => ({ ...s, host: G.ARM_FACES[s.face].host, twin: G.ARM_FACES[s.face].infected })),
      G.TUNNEL.length,
      [CYAN, PINK, CREAM, AMBER],
    );
    this.dust = new DustField(G.WALL.count, [7, 4], [linear('#FF48B0', 0.9), linear('#0078BF', 0.9)]);
    this.spiral = new SpiralField(G.SPIRAL_STARS, { amber: AMBER, cyan: CYAN, pink: PINK, unlit: UNLIT });
    this.spiral.mesh.renderOrder = 0;
    this.tunnel.streaks.renderOrder = 1;
    this.tunnel.heads.renderOrder = 2;
    this.dust.mesh.renderOrder = 3;
    this.scene.add(this.spiral.mesh, this.tunnel.streaks, this.tunnel.heads, this.dust.mesh);
    this.camera.aspect = aspect;
  }

  /** The arm and the galaxy at instant `f` into `target` (never clears; brings its own ground). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const cam = G.galaxyCamera(f);
    const snap = G.snapAt(f);
    this.paper!.draw(gl, target, SCREEN, { under: [], glyphs: {}, over: [] }, { color: GROUND, grain: 0.03 });

    // ——— The 3D fields ———
    const fling = f < WARP;
    // The arm's star systems open round the shrinking system over the fling's 12 f (eased in, so its light rises as the system's light
    // shrinks into the centre: no swing of the frame's blocks), at three quarters of the chase's light.
    const tunnelAlpha = (fling ? 0.75 * sF((f - FLING.from) / 10) : 1) * (1 - clamp01((snap - 0.55) / 0.35));
    const behindWall = f >= DUST.punch ? 1 + 0.35 * clamp01((f - DUST.punch) / 6) : 1;
    const burst = G.heroBurst(f);
    // A bubble of dark round him (the chase) or round the shrinking solar system (the fling: one amber star with tiny rings).
    const clear: [number, number, number] = fling ? [0, 0, 190 * cO((f - FLING.from) / 6)] : [G.HERO.x * burst, G.HERO.y * burst, 210 * burst * (1 - clamp01(snap / 0.15))];
    this.tunnel!.set({ travel: G.travel(f), tail: Math.abs(G.speed(f)) * 2.4, amber: fling ? 0 : G.amberDepth(f), rosette: G.rosettes(f) ? 1 : 0, alpha: tunnelAlpha, gain: behindWall * (1 + 0.3 * kickSurge(f)), clear });
    const wall = G.wallAt(f);
    this.dust!.set(wall ? { depth: wall.depth, alpha: wall.alpha * 0.85, since: wall.since, hole: [0, (G.HERO.y * wall.depth) / G.TUNNEL.focal] } : { depth: 10, alpha: 0, since: -1, hole: [0, 0] });
    const P = G.PLACEMENT;
    const spiralAlpha = clamp01(snap / 0.15) * G.discFade(f);
    const ignition = G.ignitionAt(f);
    this.spiral!.set({ core: P.core, e1: P.e1, e2: P.e2, n: P.n, radius: P.radius, spin: G.spinAt(f), ignition, flip: G.flipRadius(f), wave: f >= IGNITION.from && f < IGNITION.to + 6 ? 1.6 * (1 - clamp01((f - IGNITION.to) / 6)) : 0, alpha: spiralAlpha * (1 + 0.25 * kickSurge(f) * (f >= REVEAL && f < IGNITION.to ? 0 : 1)), local: G.localAt(f), focal: cam.focal });
    this.camera.position.set(...cam.eye);
    this.camera.up.set(...cam.up);
    this.camera.lookAt(cam.eye[0] + cam.fwd[0], cam.eye[1] + cam.fwd[1], cam.eye[2] + cam.fwd[2]);
    this.camera.fov = (2 * Math.atan(540 / cam.focal) * 180) / Math.PI;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;

    // ——— The dust wall as a solid printed sheet (pink and blue plates over a dark lane), punched open round him on the clap ———
    const sheet = G.sheetAt(f);
    if (sheet && sheet.alpha > 0) {
      const k = burst * (G.TUNNEL.he / G.heroDistance(f));
      const cx = G.HERO.x * k;
      const cy = G.HERO.y * k;
      const R = 2600;
      const ring = (color: RGB, alpha: number, extra: Partial<Shape>): Shape => ({ kind: 'ring', x: cx, y: cy, w: 2 * R, h: 2 * R, r: R - sheet.hole, color, alpha, soft: sheet.hole > 0 ? 40 : 0, ...extra });
      this.dim!.draw(gl, target, SCREEN, {
        under: [
          ring(SHEET_DARK, 0.75 * sheet.alpha, {}),
          ring(SHEET_PINK, sheet.alpha, { tint: 0.62, screen: 11, angle: 1.31 }),
          ring(SHEET_BLUE, sheet.alpha, { tint: 0.5, screen: 13, angle: 0.26 }),
        ],
        glyphs: {},
        over: [],
      }, null);
    }

    // ——— Light behind the faces: his wake, the spiral's spines, bursts, jets, the core (the hot light is drawn after the print) ———
    const back = this.back;
    back.begin();
    const glyphs: Glyph[] = [];
    this.glints.length = 0;
    this.sparks.length = 0;
    this.subject = { x: 0, y: 0, r: 30 };
    if (fling) this.armGlints(f, cam);
    if (!fling && snap < 0.6) this.hero(f, snap, glyphs);
    if (spiralAlpha > 0) this.spiralLight(f, cam, spiralAlpha, ignition, glyphs);
    back.draw(gl, target);
    if (!fling && snap < 0.6) {
      const k = burst * (G.TUNNEL.he / G.heroDistance(f));
      this.dim!.draw(gl, target, SCREEN, { under: [{ kind: 'ellipse', x: G.HERO.x * k, y: G.HERO.y * k, w: 360 * k, h: 230 * k, color: GROUND, alpha: 0.85 * (1 - clamp01((snap - 0.3) / 0.3)), soft: 70 * k + 1 }], glyphs: {}, over: [] }, null);
    }
    this.faces!.draw(gl, target, SCREEN, { under: [], glyphs: { face: glyphs }, over: [] }, null);

    // ——— The band (C's filament's light) ———
    const b = G.bandAt(f);
    if (b > 0) {
      const band = this.band;
      band.begin();
      const core = project(cam, P.core);
      const y = core ? core.y : 0;
      // C's bandProfile as its three gaussians (a quad 3σ wide each side, so none is cut).
      for (const t of G.BAND_TERMS) band.push(-1100, y, 1100, y, 3 * t.sigma, 3 * t.sigma, scale(linear(BAND_INK), t.gain * b), 1);
      band.draw(gl, target);
    }
  }

  /** Him ahead of the camera: his face, the amber glow round him, the cone of light he trails past the lens, the ring of flips. */
  private hero(f: number, snap: number, glyphs: Glyph[]): void {
    const back = this.back;
    // Through the snap he stays on the vanishing point as the camera pulls away from it (smaller as it goes).
    const burst = G.heroBurst(f) * (G.TUNNEL.he / G.heroDistance(f));
    const fade = 1 - clamp01((snap - 0.3) / 0.3);
    const x = G.HERO.x * burst;
    const y = G.HERO.y * burst + G.heroBob(f);
    const pulse = pulseAt(f);
    // The printed under-layer of his light (his face, wake and flip ring burn in the hot overlay, src/scenes/cosmosBHot.ts).
    back.dot(x, y, 150 * (1 + 0.35 * (pulse - 1)) * burst, AMBER, 0.22 * fade);
    const face = G.heroFace(f);
    const em = G.HERO.em * burst;
    glyphs.push({ ch: face, x, y, size: em, color: scale(AMBER, 1.1 * pulse), alpha: fade });
    this.subject = { x, y, r: 0.6 * em };
    this.armGlints(f, G.galaxyCamera(f));
  }

  /** Light-catching points in the arm: the near stars' heads (on the CPU for 120 of them, from the same travel the GPU uses). */
  private armGlints(f: number, cam: Cam): void {
    const T = G.travel(f);
    for (let i = 0; i < G.TUNNEL_STARS.length && this.glints.length < 120; i += 37) {
      const s = G.TUNNEL_STARS[i];
      const dz = (((s.z - T) % G.TUNNEL.length) + G.TUNNEL.length) % G.TUNNEL.length;
      if (dz < 1 || dz > 25) continue;
      const q = project(cam, [s.r * Math.cos(s.a), s.r * Math.sin(s.a), -dz]);
      if (q && Math.abs(q.x) < 940 && Math.abs(q.y) < 520 && Math.hypot(q.x, q.y + 30) > 200) this.glints.push([q.x, q.y]);
    }
  }

  /** The spiral's light: the arms' spines (tubes inside the ignition ring, dashes outside), the light bursts, the core, the jets, his star. */
  private spiralLight(f: number, cam: Cam, alpha: number, ignition: number, glyphs: Glyph[]): void {
    const back = this.back;
    const spin = G.spinAt(f);
    const flip = G.flipRadius(f);
    const tilt = G.tiltAt(f);
    const pt = (r: number, a: number, z = 0) => project(cam, G.galaxyPoint(r, a + spin / Math.sqrt(Math.max(r, 0.05)), z));
    for (let arm = 0; arm < G.SPIRAL.arms; arm++) {
      let prev: { x: number; y: number } | null = null;
      let i = 0;
      for (let r = G.SPIRAL.r0; r <= G.SPIRAL.rMax; r += 0.015, i++) {
        const q = pt(r, G.armAngle(arm, r));
        // Inside the bulge the core burns white-hot (the hot overlay's): no spine tints it.
        if (q && prev && r > G.BULGE_R && Math.abs(q.x) < 3000 && Math.abs(prev.x) < 3000) {
          const ink = arm % 2 === 0 || r < flip ? AMBER : arm === 1 ? CYAN : PINK;
          if (r < ignition) {
            back.push(prev.x, prev.y, q.x, q.y, 2.6, 2.6, scale(ink, 1.5), alpha);
            back.push(prev.x, prev.y, q.x, q.y, 22, 22, ink, 0.07 * alpha);
          } else if (i % 2 === 0) back.push(prev.x, prev.y, q.x, q.y, 1.6, 1.6, UNLIT, 0.5 * alpha);
        }
        prev = q;
      }
    }
    for (const b of G.burstsAt(f)) {
      for (let arm = 0; arm < G.SPIRAL.arms; arm++) {
        const q = pt(b.r, G.armAngle(arm, b.r));
        if (!q) continue;
        back.dot(q.x, q.y, 90, arm % 2 ? CYAN : AMBER, b.a * alpha);
        back.push(q.x - 50, q.y, q.x + 50, q.y, 2, 2, HOT, b.a * alpha);
        back.push(q.x, q.y - 50, q.x, q.y + 50, 2, 2, HOT, b.a * alpha);
      }
    }
    const core = project(cam, G.PLACEMENT.core);
    if (core) {
      back.dot(core.x, core.y, 0.14 * G.PLACEMENT.radius * core.k * (1 + 0.12 * (pulseAt(f) - 1)), CORE, 0.55 * alpha);
      this.jets(f);
    }
    // His star (arm 0, r 0.4): (>ω<) on the top note as the Eames square locks on it; the named stars as faces inside the lit ring.
    const hs = pt(G.SPIRAL.star, G.armAngle(0, G.SPIRAL.star));
    if (core && f >= QUASAR.at - 2) this.subject = { x: core.x, y: core.y, r: 60 };
    else if (hs && f >= REVEAL - 4) this.subject = { x: hs.x, y: hs.y, r: 26 };
    if (hs) {
      back.dot(hs.x, hs.y, 50, AMBER, 0.6 * alpha * pulseAt(f));
      glyphs.push({ ch: f >= REVEAL && f < REVEAL + 12 ? HERO_FACES.top : HERO_FACES.face, x: hs.x, y: hs.y, size: 30 * (1 - 0.6 * tilt), color: scale(AMBER, 1.8), alpha });
    }
    for (const s of G.SPIRAL_STARS) {
      if (s.face < 0 || s.r > ignition) continue;
      const q = pt(s.r, s.a, s.z);
      if (!q || Math.abs(q.x) > 1000 || Math.abs(q.y) > 580) continue;
      const amber = G.spiralAmber(s.arm, s.r, f);
      const pair = G.ARM_FACES[s.face];
      glyphs.push({ ch: amber ? pair.infected : pair.host, x: q.x, y: q.y, size: 22 * (1 - 0.7 * tilt), color: scale(amber ? AMBER : s.arm === 1 ? CYAN : PINK, 1.3), alpha: alpha * 0.9 });
      this.glints.push([q.x, q.y]);
    }
  }

  /**
   * The quasar's jets (G.quasarJets: the spine of each, as this instant's camera sees it, and its knots), built for the print: RisoPrint
   * lights only strokes thinner than its 5 px detail kernel as neon tubes (a wider light prints as lit halftone), so each jet is a bundle
   * of five thin amber filaments ≈ 40 px across round a white-hot centre line, with a twisted pair of strands spiralling round the bundle
   * and the twist flowing outward; knots ride out along both jets as halftone discs ringed by a tube. The bundle widens toward the lens
   * and thins toward the far jet's vanishing point.
   */
  private jets(f: number): void {
    const back = this.back;
    const t = f - QUASAR.at;
    // The base burns brighter as the jets fire (on the kick), settling over 6 f.
    const base = 1 + 0.6 * Math.max(0, 1 - t / 6);
    for (const j of G.quasarJets(f)) {
      const sp = j.spine;
      if (sp.length < 2) continue;
      const px0 = sp[0].px;
      const sc = (p: G.JetPoint) => Math.min(2.5, Math.max(0.35, p.px / px0));
      for (let i = 1; i < sp.length; i++) {
        const p = sp[i - 1];
        const q = sp[i];
        const s0 = sc(p);
        const s1 = sc(q);
        const fade = j.a * (1 - 0.3 * (i / sp.length));
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l;
        const ny = dx / l;
        // The bundle opens from the core over its first stretch (a nozzle), then runs parallel.
        const open0 = Math.min(1, p.z / 0.06);
        const open1 = Math.min(1, q.z / 0.06);
        for (const o of [-2, -1, 0, 1, 2]) {
          const d0 = o * 6.5 * s0 * open0;
          const d1 = o * 6.5 * s1 * open1;
          const ink = o === 0 ? scale(HOT, 1.6 * base) : scale(AMBER, (o % 2 ? 1.5 : 1.2) * base);
          back.push(p.x + nx * d0, p.y + ny * d0, q.x + nx * d1, q.y + ny * d1, 1.3 * s0 + 0.4, 1.3 * s1 + 0.4, ink, (o === 0 ? 1 : 0.8) * fade);
        }
        for (const side of [0, Math.PI]) {
          const h = (z: number, k: number, op: number) => 21 * k * op * Math.sin((z / 0.1) * Math.PI * 2 - 0.8 * t + side);
          const h0 = h(p.z, s0, open0);
          const h1 = h(q.z, s1, open1);
          back.push(p.x + nx * h0, p.y + ny * h0, q.x + nx * h1, q.y + ny * h1, 1.2 * s0 + 0.4, 1.2 * s1 + 0.4, scale(AMBER, 1.8), 0.9 * fade);
        }
        back.push(p.x, p.y, q.x, q.y, 26 * s0, 26 * s1, AMBER, 0.035 * fade);
      }
      for (const k of j.knots) {
        const r = 15 * sc(k) + 4;
        back.dot(k.x, k.y, r, AMBER, 0.55 * j.a);
        for (let m = 0; m < 16; m++) {
          const a0 = (m / 16) * Math.PI * 2;
          const a1 = ((m + 1) / 16) * Math.PI * 2;
          const R = r * 1.35;
          back.push(k.x + Math.cos(a0) * R, k.y + Math.sin(a0) * R, k.x + Math.cos(a1) * R, k.y + Math.sin(a1) * R, 1.3, 1.3, scale(HOT, 1.4), j.a);
        }
      }
    }
  }

  dispose(): void {
    this.paper?.dispose();
    this.dim?.dispose();
    this.faces?.dispose();
    this.tunnel?.dispose();
    this.dust?.dispose();
    this.spiral?.dispose();
    this.back.dispose();
    this.band.dispose();
    this.front.dispose();
  }
}
