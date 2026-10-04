// Renderer A, cosmos bar 1 on the GPU: "PRINTED BIG BANG · BULLET TIME · 10⁻⁷ m" (build sheet notes/bcos/sheet.md §4.1; the pure
// shot is src/shots/cosmosBang.ts). One 3D blast seen by the bullet-time camera: the printed space and its pink halftone glow behind O,
// the three halftone domes, the frozen speed ribbons, 5,100 pieces of debris (face-part cards, ink splats, torn strips, ✦), his ream as a
// real box, the 36 label fragments hung for the anamorphic lock, the card fountain; over it, in screen space but still printed, the white
// of 1.1, the shock ring, the shell's guilloche, the sweep, the slice's line and sparks, the Powers-of-Ten squares and the flat label.
// The slice splits the finished bar through an offscreen target; the crash zoom-out draws the whole bang shrunk into a rect over Earth
// (the projection scaled about the centre, scissored), so the explosion becomes the spark on his tile.
import * as THREE from 'three';
import { BANG_PARTS, HERO_FACES, REAM_FACES } from '../content/castCosmos.ts';
import { MINUS } from '../content/cosmos.ts';
import { type RGB, linear, transmit } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { EXPONENT, HATS, KICKS, LEVELS, LOCK, OPEN_HATS, POWERS, REAM, SLICE, TIME } from '../score/cosmos.ts';
import { FOV, FRONT, frameOf } from '../shots/cosmosKit.ts';
import {
  BANG_FOCAL, CARD, COPY_LAG, type Debris, reamOffset, cardShield, labelBlockers, shieldFade, REAM_PITCH, type V3, basis, bangDebris, bangPose, clearCone, copyAppears, crashZoom, debrisCentre, debrisFrame,
  domeDot, domeRadius, DOMES, env, fountainCard, fountainRelease, fragmentGlow, fragmentsShown, L, labelFragments, lerp, project, reamBreath,
  reamCount, reamLeft, regather, ribbonPieces, shellAlpha, shellRadius, sliceAt, SLICE_LINE, sparkBurst, sparkGlow, sweepX, tauAt, waving, whiteAt, expansion,
} from '../shots/cosmosBang.ts';
import { ACardField, CARD_MODE, GlowQuad, ReamBox, RibbonField, SliceComposite } from './cosmosAFields.ts';
import { type AKit, aim, fitGlyph, uvOf } from './cosmosAKit.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };

// The inks as the night print should catch them (linear; tuned on final stills): pink, blue, paper; his yellow; the space's black. The
// print carries light above 1 through (cosmosLook's `hdr`), so only light is drawn over 1: ink and paper stay at or under it (the print
// knocks them out to paper already), the glints, the spark, the slice's core and the kick's pulse on him go over it and glow.
const INK: readonly RGB[] = [linear('#FF48B0', 1.0), linear('#36B4FF', 1.0), linear('#FFF8EC', 1.04)];
const CARD_PAPER: RGB = linear('#E8DCC6', 1.0);
const YELLOW: RGB = linear('#FFE800', 1.0);
const PAPER: RGB = linear('#FFF6EC', 1.05);
const EDGE: RGB = linear('#E6B800');
const REAM_INK: RGB = linear('#5A2A08');
const PINK_GLOW: RGB = linear('#FF48B0', 0.55);
/** The bang's white: paper and a touch over (the print knocks it out to bare paper with a little light on it, ≈ #F0ECE2 under the vignette, the frame ≈ 0.75–0.8 relative luminance with his face). */
const WHITE: RGB = [1.1, 1.1, 1.1];
const FACE_INK: RGB = [0, 0, 0];
const CREAM: RGB = linear('#F6EFDF', 1.0);
const SHADOW_PINK: RGB = linear('#FF48B0', 1.0);
const AMBER: RGB = linear('#FFC23E', 2.6);
const DOT_INK: readonly RGB[] = [linear('#FF48B0', 0.9), linear('#36B4FF', 0.85), linear('#EFE6D2', 1.0)];
const GLINT: RGB = linear('#FFF1DC', 2.6);
const STRIP: RGB = linear('#F4EEE2', 1.0);
const FRAG_WALL = [0.12, 0.03, 0.09, 1] as const;

const rgba = (c: RGB, a = 1): [number, number, number, number] => [c[0], c[1], c[2], a];
const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** The latest of `list` at or before `f` (−1e9 when none). */
const lastOf = (list: readonly number[], f: number): number => {
  let k = -1e9;
  for (const v of list) if (v <= f && v > k) k = v;
  return k;
};

export class BangRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.005, 200);
  private kit!: AKit;
  private debris!: ACardField;
  private dots!: ACardField;
  private fountain!: ACardField;
  private frags!: ACardField;
  private glints!: ACardField;
  private ribbons!: RibbonField;
  private ream!: ReamBox;
  private glow!: GlowQuad;
  private slice!: SliceComposite;
  private sliceTarget: THREE.WebGLRenderTarget | null = null;
  private aspect = 16 / 9;
  private ribbonIdx: number[] = [];
  private readonly owned: { dispose(): void }[] = [];

  init(kit: AKit, size: { width: number; height: number }): void {
    this.kit = kit;
    this.aspect = size.width / size.height;
    this.debris = new ACardField({ capacity: 5200, atlas: kit.face, sprites: kit.sprites, blend: 'opaque' });
    this.dots = new ACardField({ capacity: 12000, atlas: kit.face, blend: 'opaque' });
    this.fountain = new ACardField({ capacity: 6600, atlas: kit.face, blend: 'opaque' });
    this.frags = new ACardField({ capacity: 120, atlas: kit.face, sprites: kit.label, blend: 'opaque' });
    this.glints = new ACardField({ capacity: 1200, atlas: kit.face, blend: 'add' });
    this.ribbons = new RibbonField(900);
    this.ream = new ReamBox(kit.hero);
    this.glow = new GlowQuad();
    this.slice = new SliceComposite();
    this.sliceTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: true });
    this.dots.mesh.renderOrder = 0;
    this.ribbons.mesh.renderOrder = 1;
    this.debris.mesh.renderOrder = 2;
    this.ream.mesh.renderOrder = 3;
    this.fountain.mesh.renderOrder = 4;
    this.frags.mesh.renderOrder = 5;
    this.glints.mesh.renderOrder = 6;
    this.scene.add(this.dots.mesh, this.ribbons.mesh, this.debris.mesh, this.ream.mesh, this.fountain.mesh, this.frags.mesh, this.glints.mesh);
    const m = this.ream.material.uniforms;
    m.uYellow.value.setRGB(...YELLOW);
    m.uPaper.value.setRGB(...PAPER);
    m.uEdge.value.setRGB(...EDGE);
    m.uPink.value.setRGB(...INK[0]);
    m.uBlue.value.setRGB(...INK[1]);
    m.uPitch.value = REAM_PITCH;
    this.ribbonIdx = ribbonPieces(bangDebris());
    this.owned.push(this.debris, this.dots, this.fountain, this.frags, this.glints, this.ribbons, this.ream, this.glow, this.slice, this.sliceTarget);
  }

  /**
   * Draws bar 1 at instant `f` into `target`. `zoom` < 1 shrinks the whole bang about the frame's centre into a rect (the crash zoom-out,
   * drawn over Earth); the slice runs through the offscreen target.
   */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const zoom = crashZoom(f);
    const cut = sliceAt(f);
    if (zoom < 1) {
      this.drawInset(gl, target, f, zoom);
      this.drawScreen(gl, target, f);
      return;
    }
    if (cut && this.sliceTarget) {
      gl.setRenderTarget(this.sliceTarget);
      gl.setClearColor(0x000000, 1);
      gl.clear(true, true, true);
      this.drawWorld(gl, this.sliceTarget, f, 1);
      this.slice.draw(gl, this.sliceTarget.texture, target, SLICE_LINE, cut.offset);
    } else this.drawWorld(gl, target, f, 1);
    this.drawScreen(gl, target, f);
  }

  /** The bang shrunk to `zoom` about the centre (its own black, scissored to its rect); its cream keyline is the screen overlay's (crisp, after the print). */
  private drawInset(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, zoom: number): void {
    const w = 1920 * zoom;
    const h = 1080 * zoom;
    // its own printed space under it
    this.kit.screen.draw(gl, target, SCREEN, { under: [{ kind: 'rect', x: 0, y: 0, w, h, color: [0, 0, 0] }], glyphs: {}, over: [] }, null);
    const k = target.height / 1080;
    const sx = Math.floor(target.width / 2 - (w / 2) * k);
    const sy = Math.floor(target.height / 2 - (h / 2) * k);
    target.scissor.set(sx, sy, Math.ceil(w * k) + 1, Math.ceil(h * k) + 1);
    target.scissorTest = true;
    gl.setRenderTarget(target);
    gl.clearDepth();
    try {
      this.drawWorld(gl, target, f, zoom);
    } finally {
      target.scissorTest = false;
    }
  }

  /** The 3D blast and its ground at instant `f`, its projection scaled by `zoom` about the frame's centre. */
  private drawWorld(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, zoom: number): void {
    const t = tauAt(f);
    const pose = bangPose(f);
    aim(this.camera, pose, 0.005, 200, this.aspect);
    if (zoom !== 1) this.camera.projectionMatrix.premultiply(new THREE.Matrix4().makeScale(zoom, zoom, 1));
    const eye = pose.position;
    const { r: camR, u: camU, f: camF } = basis(pose);
    const out = frameOf(f);
    const kick = lastOf(KICKS, out);
    const surge = 1 + 0.6 * env(f - kick, 8);
    const pulse = f - kick < 2 ? 1 : env(f - kick - 2, 10);

    // The ground: printed space (the cleared black) and a radial pink halftone glow behind O.
    const o = project(pose, [0, 0, 0], BANG_FOCAL);
    if (o) this.glow.draw(gl, target, o.x * zoom, o.y * zoom, 1350 * zoom, PINK_GLOW, 1, 1.4);

    // The domes (dotted shells round and behind the camera) and the far specks; every 16th from 1.1a breathes the dome dots.
    const hat = lastOf(HATS, out);
    const breath = f >= TIME.freeze + 12 && f - hat < 3 ? 1.08 : 1;
    const domeShield = cardShield(pose, REAM_PITCH * Math.max(0, reamLeft(f) - 1));
    this.dots.begin();
    for (let k = 0; k < DOMES.length; k++) {
      const R = domeRadius(k, t);
      const ink = rgba(DOT_INK[DOMES[k].ink]);
      for (let i = 0; i < DOMES[k].n; i++) {
        const d = domeDot(k, i);
        const c: V3 = [d.u[0] * R, d.u[1] * R, d.u[2] * R];
        const dz = (c[0] - eye[0]) * camF[0] + (c[1] - eye[1]) * camF[1] + (c[2] - eye[2]) * camF[2];
        if (dz < 0.05) continue;
        const rx = c[0] - eye[0];
        const ry = c[1] - eye[1];
        const rz = c[2] - eye[2];
        const sh = f >= TIME.freeze ? shieldFade(((rx * camR[0] + ry * camR[1] + rz * camR[2]) * BANG_FOCAL) / dz, ((rx * camU[0] + ry * camU[1] + rz * camU[2]) * BANG_FOCAL) / dz, dz, domeShield) : 1;
        if (sh < 0.05) continue;
        const s = (d.size / 2) * breath * sh;
        this.dots.push({ centre: c, right: [camR[0] * s, camR[1] * s, camR[2] * s], up: [camU[0] * s, camU[1] * s, camU[2] * s], uv: [0, 0, 0, 0], ink, bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.dot, aspect: 1 });
      }
    }
    // The far printed specks (the BG layer), swelling 20 % on each kick.
    const speckSwell = 1 + 0.2 * env(f - kick, 8);
    for (let i = 0; i < 1800; i++) {
      const z = 2 * hash(i, 71) - 1;
      const a = 2 * Math.PI * hash(i, 72);
      const q = Math.sqrt(1 - z * z);
      const c: V3 = [9 * q * Math.cos(a), 9 * z, 9 * q * Math.sin(a)];
      const dz = (c[0] - eye[0]) * camF[0] + (c[1] - eye[1]) * camF[1] + (c[2] - eye[2]) * camF[2];
      if (dz < 0.5) continue;
      const s = (0.006 + 0.01 * hash(i, 73)) * speckSwell;
      this.dots.push({ centre: c, right: [camR[0] * s, camR[1] * s, camR[2] * s], up: [camU[0] * s, camU[1] * s, camU[2] * s], uv: [0, 0, 0, 0], ink: rgba(DOT_INK[2], 1), bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.dot, aspect: 1 });
    }
    this.dots.end();

    // The blast: every piece a pure function of τ; the clear cone round the camera–card line; pieces too near the lens shrink away.
    const debris = bangDebris();
    const blockers = labelBlockers();
    const shieldBox = cardShield(pose, REAM_PITCH * Math.max(0, reamLeft(f) - 1));
    const shell = shellRadius(f);
    const sweep = sweepX(f);
    const oh = lastOf(OPEN_HATS, out);
    const ohOn = f >= TIME.freeze && f - oh < 6;
    this.debris.begin();
    this.glints.begin();
    const centres: (V3 | null)[] = new Array(debris.length).fill(null);
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i];
      const c = debrisCentre(d, t);
      if (blockers.has(i)) continue;
      let vis = clearCone(c, eye, d.fg);
      if (vis < 0.02) continue;
      const rel: V3 = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
      const dz = rel[0] * camF[0] + rel[1] * camF[1] + rel[2] * camF[2];
      if (dz < 0.02) continue;
      const px = (d.size * BANG_FOCAL) / dz;
      if (px > 300 && !d.fg) vis *= Math.max(0, 1 - (px - 300) / 200);
      if (!d.fg && f >= TIME.freeze) {
        const sxp = ((rel[0] * camR[0] + rel[1] * camR[1] + rel[2] * camR[2]) * BANG_FOCAL) / dz;
        const syp = ((rel[0] * camU[0] + rel[1] * camU[1] + rel[2] * camU[2]) * BANG_FOCAL) / dz;
        vis *= shieldFade(sxp, syp, dz, shieldBox);
      }
      if (vis < 0.02 || px < 0.8) continue;
      // depth: near pieces in full ink, far ones sinking into the printed space
      const depthK = Math.min(1.15, Math.max(0.38, 1.32 - 0.2 * dz));
      centres[i] = c;
      const fr = debrisFrame(d, t);
      if (d.kind === 'star') {
        const twinkle = f >= TIME.freeze + 12 && hash(i, lastOf(HATS, out)) < 0.25 ? 1.6 : 1;
        const s = (d.size / 2) * vis * 1.4;
        this.glints.push({ centre: c, right: [camR[0] * s, camR[1] * s, camR[2] * s], up: [camU[0] * s, camU[1] * s, camU[2] * s], uv: [0, 0, 0, 0], ink: rgba(GLINT, 0.75 * twinkle), bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glint, aspect: 1 });
        continue;
      }
      let hw = (d.size / 2) * vis;
      let hh = hw;
      if (d.kind === 'strip') {
        hw *= 1.6;
        hh = hw / 8;
      }
      const right: V3 = [fr.right[0] * hw, fr.right[1] * hw, fr.right[2] * hw];
      const up: V3 = [fr.up[0] * hh, fr.up[1] * hh, fr.up[2] * hh];
      if (d.kind === 'part') {
        const g = fitGlyph(this.kit.face, BANG_PARTS[d.variant], 1, 0.7);
        const ink = d.card ? (d.ink === 2 ? INK[1] : PAPER) : INK[d.ink];
        const bg = d.card ? rgba(d.ink === 2 ? CARD_PAPER : INK[d.ink]) : ([0, 0, 0, 0] as const);
        this.debris.push({ centre: c, right, up, uv: g.uv, ink: rgba(dim(ink, depthK)), bg: d.card ? rgba(dim(d.ink === 2 ? CARD_PAPER : INK[d.ink], depthK)) : bg, glyph: g.glyph, radius: 0.28, mode: CARD_MODE.glyph, aspect: g.aspect });
      } else {
        const uv = d.kind === 'splat' ? this.kit.splats[d.variant % 4] : this.kit.strips[d.variant % 2];
        const ink = d.kind === 'splat' ? INK[d.ink === 2 ? 0 : d.ink] : STRIP;
        this.debris.push({ centre: c, right, up, uv, ink: rgba(dim(ink, depthK)), bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.sprite, aspect: 1 });
      }
      // Light on the pieces: the shell's crossing, the sweep, the open hat's glints (≤ 8 % of a card's area).
      let gl2 = 0;
      if (shell > 0 && Math.abs(d.r * expansion(t) - shell) < 0.16) gl2 = (1 - Math.abs(d.r * expansion(t) - shell) / 0.16) * 0.8;
      if (sweep !== null) {
        const p = project(pose, c, BANG_FOCAL);
        if (p && Math.abs(p.x - sweep) < 110) gl2 = Math.max(gl2, 1 - Math.abs(p.x - sweep) / 110);
      }
      if (ohOn && d.kind === 'part' && d.size > 0.05 && hash(i, oh, 3) < 0.06) gl2 = Math.max(gl2, 1 - (f - oh) / 6);
      if (gl2 > 0.02) {
        const s = Math.min(hw * 0.9, 0.06) + 0.012;
        this.glints.push({ centre: c, right: [camR[0] * s, camR[1] * s, camR[2] * s], up: [camU[0] * s, camU[1] * s, camU[2] * s], uv: [0, 0, 0, 0], ink: rgba(GLINT, 0.9 * gl2), bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glint, aspect: 1 });
      }
    }
    this.debris.end();

    // The frozen speed ribbons toward O behind the biggest pieces (from the moment the blast has flown).
    this.ribbons.begin();
    if (t > 3) {
      for (const i of this.ribbonIdx) {
        const c = centres[i];
        if (!c) continue;
        const d: Debris = debris[i];
        this.ribbons.push(c, [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72], d.size * 0.32, rgba(INK[d.ink], 0.5));
      }
    }
    this.ribbons.end();

    // His ream: the box of sheets behind his card (it thins as the fountain fans the deck out), his face on its ends.
    const left = reamLeft(f);
    const um = this.ream.material.uniforms;
    um.uDepth.value = Math.max(0.0006, REAM_PITCH * (left - 1));
    um.uBreath.value = reamBreath(f);
    const face = this.kit.hero.entries.get(waving(f) ? HERO_FACES.wave : HERO_FACES.face)!;
    um.uFace.value.set(...uvOf(face));
    um.uFaceAspect.value = face.aspect;
    const fit = fitGlyph(this.kit.hero, waving(f) ? HERO_FACES.wave : HERO_FACES.face, CARD.w / CARD.h, 0.8);
    um.uFaceH.value = fit.glyph;
    um.uGlow.value = 0.35 * pulse;
    this.ream.mesh.visible = f >= TIME.freeze;

    // 1.3&: the ream's paper edges glint (40, along the edge-on block).
    if (f >= REAM && f < REAM + 6) {
      for (let i = 0; i < 40; i++) {
        const k = hash(i, 62) * (reamCount(f) - 1);
        const o = reamOffset(k);
        const c: V3 = [0.5 + o[0], 0.21 * (2 * hash(i, 61) - 1) + o[1], -REAM_PITCH * k];
        const s = 0.012 + 0.02 * hash(i, 63);
        this.glints.push({ centre: c, right: [camR[0] * s, camR[1] * s, camR[2] * s], up: [camU[0] * s, camU[1] * s, camU[2] * s], uv: [0, 0, 0, 0], ink: rgba(GLINT, 0.9 * (1 - (f - REAM) / 6)), bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glint, aspect: 1 });
      }
    }
    this.glints.end();

    // The card fountain: the ream's sheets fan out a quarter a fill snare, and every flung copy pastes copies of itself.
    this.fountain.begin();
    if (f >= SLICE.at) {
      const n = Math.round(reamCount(f));
      for (let i = 1; i < n; i++) {
        const t0 = f - fountainRelease(i);
        if (t0 < 0) continue;
        const faceKey = REAM_FACES[i % REAM_FACES.length];
        const g = fitGlyph(this.kit.face, faceKey, 2.29, 0.72);
        for (let c = 0; c <= 18; c++) {
          let tc = t0;
          if (c > 0) {
            const at = copyAppears(i, c);
            if (f < at) break;
            tc = t0 - COPY_LAG * c;
            if (tc < 0) continue;
          }
          const fc = fountainCard(i, tc);
          const jit = c > 0 ? 0.012 : 0;
          const centre: V3 = [fc.centre[0] + jit * (hash(i, c, 41) - 0.5), fc.centre[1] + jit * (hash(i, c, 42) - 0.5), fc.centre[2]];
          const tumble = 0.2 * tc;
          const cr = Math.cos(fc.roll);
          const sr = Math.sin(fc.roll);
          const ct = Math.cos(tumble);
          const st = Math.sin(tumble);
          // the first generation of copies full size; the later two (17k, 118k: inside the crash zoom-out) smaller and smaller
          const fresh = c > 0 ? f - copyAppears(i, c) : 2;
          const ghost = fresh < 2;
          // a fresh copy lands big (1.2 → 1 over its 2 frames: the paste's pop on the snare) as a misregistered ghost, its yellow barely
          // tinted toward pink or blue (thousands land on one snare: a stronger tint would dim the whole fountain for 2 frames, a flash)
          const gk = (c <= 6 ? 1 : c <= 12 ? 0.62 : 0.4) * (ghost ? 1.2 - 0.1 * fresh : 1);
          const hw = 0.07 * gk;
          const hh = 0.0305 * gk;
          const right: V3 = [cr * hw * ct, sr * hw, -cr * hw * st];
          const up: V3 = [-sr * hh, cr * hh, 0];
          const tint = hash(i, c) < 0.5 ? INK[0] : INK[1];
          const bg = ghost ? rgba([lerp(YELLOW[0], tint[0], 0.12), lerp(YELLOW[1], tint[1], 0.12), lerp(YELLOW[2], tint[2], 0.12)]) : rgba(YELLOW);
          this.fountain.push({ centre, right, up, uv: g.uv, ink: rgba(REAM_INK), bg, glyph: g.glyph, radius: 0.12, mode: CARD_MODE.glyph, aspect: g.aspect });
        }
      }
    }
    this.fountain.end();

    // The 36 fragments: hung through the frozen blast, lined up at V* on the lock, sheared apart, regathered flat on the slice.
    this.frags.begin();
    if (fragmentsShown(f)) {
      const mix = regather(f);
      const glow = 1 + fragmentGlow(f);
      const V = bangPose(LOCK.from, 70).position;
      for (const g of labelFragments()) {
        const W = 1440;
        const H = 460;
        const uv: [number, number, number, number] = [g.sx / W, 1 - g.sy / H, (g.sx + g.w) / W, 1 - (g.sy + g.h) / H];
        const flat: [number, number, number, number] = [g.flat.x / 960, g.flat.y / 540, g.flat.hw / 960, g.flat.hh / 540];
        this.frags.push({ centre: g.centre, right: g.right, up: g.up, uv, ink: [glow, glow, glow, 1], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.sprite, aspect: 1, flat, mix });
        if (mix > 0) continue;
        // two layers of side wall in darker ink, further along the same ray from V* (hidden behind the face from V* itself)
        for (const k of [1, 2]) {
          const s = (g.lam + 0.018 * k) / g.lam;
          const c: V3 = [V[0] + (g.centre[0] - V[0]) * s, V[1] + (g.centre[1] - V[1]) * s, V[2] + (g.centre[2] - V[2]) * s];
          this.frags.push({ centre: c, right: [g.right[0] * s, g.right[1] * s, g.right[2] * s], up: [g.up[0] * s, g.up[1] * s, g.up[2] * s], uv, ink: FRAG_WALL, bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.sprite, aspect: 1 });
        }
      }
    }
    this.frags.end();

    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
    // the surge's FG streaks are the debris' own blur; the kick's pulse lights his card (uGlow above)
    void surge;
  }

  /** The bar's screen-space marks, printed with it: the white, the shock ring, the shell's guilloche, the sweep, the slice, the squares, the label. */
  private drawScreen(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const kit = this.kit;
    const w = whiteAt(f);
    if (w) {
      const under: Shape[] = [];
      // bare paper to the solid core, then a fall-off the print screens into dots printing back in from the corners (dot gain), out to the
      // fireball's edge; outside it the blast, the debris streaking past the lens
      if (w.bright >= 2000) under.push({ kind: 'rect', x: 0, y: 0, w: 1960, h: 1120, color: WHITE });
      else if (w.bright > 0) under.push({ kind: 'ellipse', x: 0, y: 0, w: 2 * w.bright, h: 2 * w.bright, color: WHITE, soft: Math.max(1, w.bright - w.core) });
      const glyphs: Record<string, Glyph[]> = {};
      if (w.face > 0) {
        const e = kit.hero.entries.get(HERO_FACES.face)!;
        const size = w.face / e.advance;
        glyphs.hero = [{ ch: HERO_FACES.face, x: 0, y: 0, size, color: FACE_INK, alpha: w.faceAlpha }];
      }
      kit.screen.draw(gl, target, SCREEN, { under, glyphs: {}, over: [] }, null);
      // his Y/P/B ghosts (multiplied on the white), then his face in printed-space ink
      if (w.face > 0) {
        const e = kit.hero.entries.get(HERO_FACES.face)!;
        const size = w.face / e.advance;
        const g = w.ghost;
        const ghosts: Glyph[] = [
          { ch: HERO_FACES.face, x: -g, y: g * 0.4, size, color: transmit(linear('#FFE800'), 0.95) },
          { ch: HERO_FACES.face, x: g, y: -g * 0.5, size, color: transmit(linear('#FF48B0'), 0.9) },
          { ch: HERO_FACES.face, x: g * 0.3, y: g, size, color: transmit(linear('#36B4FF'), 0.9) },
        ];
        kit.ink.draw(gl, target, SCREEN, { under: [], glyphs: { hero: ghosts }, over: [] }, null);
        kit.screen.draw(gl, target, SCREEN, { under: [], glyphs, over: [] }, null);
      }
      if (w.ring !== null) {
        // the guilloche shock ring racing out (taken at the output frame, so each frame prints it crisp): two interlaced wobbling rules
        // and a rosette of halftone dots, in the pink plate
        const R = w.ring;
        const ink = transmit(linear('#FF48B0'), 0.92 * w.ringAlpha);
        const rings: Shape[] = [];
        for (const ph of [0, Math.PI]) {
          for (let i = 0; i < 160; i++) {
            const a0 = (i / 160) * Math.PI * 2;
            const a1 = ((i + 1) / 160) * Math.PI * 2;
            const r0 = R * (1 + 0.03 * Math.sin(a0 * 9 + ph));
            const r1 = R * (1 + 0.03 * Math.sin(a1 * 9 + ph));
            const x0 = r0 * Math.cos(a0);
            const y0 = r0 * Math.sin(a0);
            const x1 = r1 * Math.cos(a1);
            const y1 = r1 * Math.sin(a1);
            rings.push({ kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(x1 - x0, y1 - y0) + 3, h: 6, rot: Math.atan2(y1 - y0, x1 - x0), color: ink });
          }
        }
        for (let i = 0; i < 120; i++) {
          const an = (i / 120) * Math.PI * 2;
          const rr = R * (1 - 0.045 + 0.02 * Math.sin(an * 12));
          rings.push({ kind: 'ellipse', x: rr * Math.cos(an), y: rr * Math.sin(an), w: 13, h: 13, color: ink });
        }
        kit.ink.draw(gl, target, SCREEN, { under: rings, glyphs: {}, over: [] }, null);
      }
    }

    const light: Shape[] = [];
    const ink: Shape[] = [];
    // 1.2: the shell's silhouette — a guilloche of pink halftone dots round his card, two wobbling rings.
    const sr = shellRadius(f);
    if (sr > 0) {
      const pose = bangPose(f);
      const o = project(pose, [0, 0, 0], BANG_FOCAL);
      if (o) {
        const R = (sr * BANG_FOCAL) / o.z;
        const a = shellAlpha(f);
        for (let i = 0; i < 90; i++) {
          const an = (i / 90) * Math.PI * 2;
          const rr = R * (1 + 0.025 * Math.sin(an * 12 + f));
          ink.push({ kind: 'ellipse', x: o.x + rr * Math.cos(an), y: o.y + rr * Math.sin(an), w: 14, h: 14, color: transmit(linear('#FF48B0'), 0.9 * a) });
        }
        for (const ph of [0, Math.PI]) {
          for (let i = 0; i < 120; i++) {
            const a0 = (i / 120) * Math.PI * 2;
            const a1 = ((i + 1) / 120) * Math.PI * 2;
            const r0 = R * (1 + 0.04 * Math.sin(a0 * 9 + ph));
            const r1 = R * (1 + 0.04 * Math.sin(a1 * 9 + ph));
            const x0 = o.x + r0 * Math.cos(a0);
            const y0 = o.y + r0 * Math.sin(a0);
            const x1 = o.x + r1 * Math.cos(a1);
            const y1 = o.y + r1 * Math.sin(a1);
            light.push({ kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(x1 - x0, y1 - y0) + 3, h: 5, rot: Math.atan2(y1 - y0, x1 - x0), color: linear('#FFB0D8', 2.4), alpha: a });
          }
        }
      }
    }
    // 1.2&: the sweep — a thin specular band crossing the frozen field left to right in 6 f.
    const sx = sweepX(f);
    if (sx !== null) light.push({ kind: 'rect', x: sx, y: 0, w: 70, h: 1200, rot: 0.12, color: linear('#FFF1DC', 0.5), soft: 34 });
    // 1.4: the slice's hot line (a 4 px white-hot core in a 30 px pink glow, wiping across in 2 f) and its halftone sparks.
    const cut = sliceAt(f);
    if (cut && cut.glow > 0) {
      const dx = Math.cos(SLICE_LINE.angle);
      const dy = Math.sin(SLICE_LINE.angle);
      const len = 4400 * cut.reach;
      const cx = SLICE_LINE.x - dx * 2200 + (dx * len) / 2;
      const cy = SLICE_LINE.y - dy * 2200 + (dy * len) / 2;
      light.push({ kind: 'rect', x: cx, y: cy, w: len, h: 30, rot: SLICE_LINE.angle, color: linear('#FF48B0', 1.2), alpha: 0.5 * cut.glow, soft: 14 });
      light.push({ kind: 'rect', x: cx, y: cy, w: len, h: 4, rot: SLICE_LINE.angle, color: linear('#FFF6EC', 4), alpha: cut.glow });
      for (let i = 0; i < 70; i++) {
        const u = (hash(i, 51) - 0.5) * 2200;
        const v = (hash(i, 52) - 0.5) * 2 * cut.spread;
        ink.push({ kind: 'rect', x: SLICE_LINE.x + dx * u - dy * v, y: SLICE_LINE.y + dy * u + dx * v, w: 6, h: 6, rot: SLICE_LINE.angle, color: transmit(linear('#FF48B0'), cut.glow) });
      }
    }
    // 1.4a: the spark ignites whole on the fill snare, a burst of amber light with a ✦ first (the Eames squares rushing in and the one
    // closing on it are the screen overlay's: crisp cream rules after the print)
    const spark = sparkGlow(f);
    if (spark > 0) {
      const burst = sparkBurst(f);
      light.push({ kind: 'ellipse', x: 0, y: 0, w: 90 + 220 * burst, h: 90 + 220 * burst, color: AMBER, alpha: 0.55 + 0.3 * burst, soft: 40 + 100 * burst });
      light.push({ kind: 'ellipse', x: 0, y: 0, w: 26, h: 26, color: linear('#FFE2B4', 4), alpha: spark, soft: 9 });
      if (burst > 0) for (let i = 0; i < 4; i++) light.push({ kind: 'segment', x: 0, y: 0, w: (i % 2 ? 0.45 : 1) * (40 + 520 * burst), h: 5, rot: (i * Math.PI) / 4, color: linear('#FFF1DC', 3), alpha: burst, soft: 2 });
    }
    if (light.length) kit.light.draw(gl, target, SCREEN, { under: light, glyphs: {}, over: [] }, null);
    if (ink.length) kit.ink.draw(gl, target, SCREEN, { under: ink, glyphs: {}, over: [] }, null);

    // The flat label (printed): the fragments regathered top-left, from 1.4& its exponent an odometer rolling −7 → 7 (until 2.1's frame,
    // where Earth's label takes over: switched at the output frame, so no frame blends the two).
    if (f >= POWERS[0] && frameOf(f) < LEVELS.earth) kit.screen.draw(gl, target, SCREEN, scaleLabel(kit, f, { left: -907, baseline: 187, size: 275, slot: -7 }), null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}

/** The Eames square closing on him and blinking twice (four cream L marks, 3 px, 40 px arms): `t` frames after its downbeat. */
export function eamesSquare(t: number, target: number): Shape[] {
  if (t < 0 || t >= 22) return [];
  if (t >= 10 && Math.floor((t - 10) / 3) % 2 === 0) return [];
  const h = lerp(560, Math.max(40, target), Math.min(1, L(t)));
  const w = h * 1.25;
  const out: Shape[] = [];
  const c = linear('#F6EFDF', 1.5);
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const px = sx * w;
    const py = sy * h;
    out.push({ kind: 'rect', x: px - (sx * 20) + 0, y: py, w: 40, h: 3, color: c });
    out.push({ kind: 'rect', x: px, y: py - sy * 20, w: 3, h: 40, color: c });
  }
  return out;
}

/** The odometer's values (the cosmos's exponents run −7 … 29). */
const EXPONENT_RANGE = { lo: -7, hi: 29 } as const;
/** The exponent at instant `f` (the odometer: score EXPONENT rows; ≈ 2 values a 32nd, continuous for the strip). */
export function exponentAt(f: number): number {
  let e = EXPONENT[0].a;
  for (const row of EXPONENT) {
    if (f < row.from) break;
    if (f >= row.to) e = row.b;
    else e = lerp(row.a, row.b, (f - row.from) / (row.to - row.from));
  }
  return e;
}

/**
 * `10^e m` printed (cream with a pink misregistered shadow), the exponent a rolling strip of digits (the minus flicking away at 0): at
 * `left`, `baseline` (screen px, y up) and font `size` px (cap ≈ 0.73 size). `slot`: the exponent's slot is at least this value's
 * width, so the m holds still while the odometer rolls (the bang's −7 → 7: the m sliding in as the minus goes would flicker the corner).
 * The odometer is read at the output frame (every sub-frame prints the same strip, so it is sharp, never a blur of passing digits): the
 * nearest value whole-ish, rolled at most half a digit, its neighbour coming in at the edge of the slot.
 */
export function scaleLabel(kit: AKit, f: number, at: { left: number; baseline: number; size: number; alpha?: number; slot?: number }): FlatContent {
  const e = exponentAt(Math.floor(f + 0.5));
  const adv = kit.advDisplay;
  const s = at.size;
  const mid = at.baseline + s * 0.36;
  const glyphs: Glyph[] = [];
  const put = (ch: string, x: number, y: number, size: number, a = at.alpha ?? 1) => {
    glyphs.push({ ch, x: x + 0.055 * s, y: y - 0.055 * s, size, color: SHADOW_PINK, alpha: a });
    glyphs.push({ ch, x, y, size, color: CREAM, alpha: a });
  };
  let x = at.left;
  for (const ch of '10') {
    put(ch, x + (adv(ch) * s) / 2, mid, s);
    x += adv(ch) * s;
  }
  // the exponent: a strip of values sliding up through the raised slot
  const es = s * 0.55;
  const ey = at.baseline + s * 0.38 + es * 0.36;
  const v0 = Math.floor(e);
  const frac = e - v0;
  const near = Math.round(e);
  const roll = e - near;
  const textOf = (v: number) => `${v < 0 ? MINUS : ''}${Math.abs(v)}`;
  const widthOf = (v: number) => [...textOf(v)].reduce((w, ch) => w + adv(ch) * es, 0);
  // the nearest value at ≥ 60 % (rolled half the way at most), the next one in from the slot's edge
  const strip: (readonly [number, number])[] = Math.abs(roll) < 1e-6 ? [[near, 0]] : [[near, -roll * 0.6], [near + Math.sign(roll), Math.sign(roll) * (1 - Math.abs(roll)) * 0.9]];
  for (const [v, off] of strip) {
    if (v < Math.min(EXPONENT_RANGE.lo, v0) || v > EXPONENT_RANGE.hi) continue;
    const a = Math.max(0, 1 - Math.abs(off) * 1.4);
    if (a <= 0.01) continue;
    const text = textOf(v);
    let ex = x + 0.04 * s;
    for (const ch of text) {
      put(ch, ex + (adv(ch) * es) / 2, ey + off * es * 0.9, es, a * (at.alpha ?? 1));
      ex += adv(ch) * es;
    }
  }
  x += 0.04 * s + Math.max(lerp(widthOf(v0), widthOf(v0 + 1), frac), at.slot === undefined ? 0 : widthOf(at.slot)) + 0.26 * s;
  put('m', x + (adv('m') * s) / 2, mid, s);
  return { under: [], glyphs: { display: glyphs }, over: [] };
}

/** Exported for the tests (the pieces' kinds count the design's). */
export const BANG_EMPTY = EMPTY;
