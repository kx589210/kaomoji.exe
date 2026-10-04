// Renderer A, cosmos bar 2 on the GPU: "CITY LIGHTS → SUNRISE · 10⁷ m" (build sheet notes/bcos/sheet.md §4.2; the pure shot is
// src/shots/cosmosEarth.ts). One 3D Earth seen by one camera: the sky of printed space and nebula streaks, the dark body, the face cards
// flipped by the stadium wave (lamps burning amber on dark cards at night, flashbulbs in the day; the design's 24,000 up close, a coarse
// globe from the crane), the cyan atmosphere, the Sun breaking the limb on the crane's kick, the Moon card above it and the beam; the paste
// flare on the landing, glints on the open hats, shock rings on the claps; the printed label `10⁷ m`. Light is drawn over 1 (HDR): the print
// carries it through (cosmosLook's `hdr`), so the lamps, the Sun, its streak, the atmosphere, the flares, glints and the beam shine. On 2.4&
// the whip pans the sky while Earth leaves six crisp Ctrl+V stamps of itself along its trail (a deterministic snapshot of the globe,
// rendered once into a target and stamped as a sprite).
import * as THREE from 'three';
import { HERO_FACES, MOON_FACES } from '../content/castCosmos.ts';
import { LEVEL_TYPE, MOON_ZZZ, raisedRuns } from '../content/cosmos.ts';
import { type RGB, linear, transmit } from '../engine/color.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { HATS, KICKS, LANDING, LEVELS, MOON_BEAM, OPEN_HATS, OUTRUN, PREDAWN, SHOCK_RINGS, SUNRISE, TILT_UP, WHIP } from '../score/cosmos.ts';
import { FOV, FRONT, frameOf } from '../shots/cosmosKit.ts';
import { type V3, Im, LK, LK_LEAD, basis, clamp01, cO, env, lerp, project } from '../shots/cosmosBang.ts';
import {
  CARD_SIDE, COARSE_SIDE, EARTH_FOCAL, MOON_CARD, STAMP_AT, SUN_DISC, atmosphere, beamAt, coarseCards, coarseFade, dawn, earthCamera, seaPaste, eclipseAt, earthCards, flinchBand, litFront,
  globeOnScreen, hookBob, lightDirection, moonFace, moonPosition, rayThrough, stampLayout, sunScreen, terminator, topFlash, trailGlobe, type EarthCard,
} from '../shots/cosmosEarth.ts';
import { ACardField, CARD_MODE, GlowQuad } from './cosmosAFields.ts';
import { EarthBody, type EarthCardData, EarthCardField, type EarthPalette, SkyDome } from './cosmosAEarthFields.ts';
import { type AKit, aim, fitGlyph } from './cosmosAKit.ts';
import { scaleLabel } from './cosmosABang.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const v3 = (c: RGB, k = 1): V3 => [c[0] * k, c[1] * k, c[2] * k];

/**
 * Earth's palette (linear; tuned on final stills). Ink and paper stay at or under 1 (the print knocks them out to paper); light goes over
 * it and the print carries it through: the lamps (the ω face and the rim of a dark card burning amber, ≥ 3× the night side), the glints.
 */
const PALETTE: EarthPalette = {
  ocean: v3(linear('#2FA8FF')),
  land: v3(linear('#FF48B0')),
  cloud: v3(linear('#F1E8D6')),
  paper: v3(linear('#FFF6EC')),
  cloudInk: v3(linear('#2F7FD8')),
  lampBg: v3(linear('#24130A')),
  lamp: v3(linear('#FFC23E', 1.7)),
  lampRim: v3(linear('#FFC23E', 1.05)),
  dayBg: v3(linear('#FFD24A', 1.0)),
  dayInk: v3(linear('#3A1A00')),
  glint: v3(linear('#FFF1DC', 2.8)),
  ghostPink: v3(linear('#FF48B0', 0.9)),
  ghostBlue: v3(linear('#2FA8FF', 0.9)),
  night: 0.3,
  oceanNight: 0.5,
  cloudNight: 0.34,
};
const BODY_NIGHT: RGB = [0.004, 0.003, 0.016];
const CYAN: RGB = linear('#3FE0FF', 1.0);
const CYAN_HOT: RGB = linear('#3FE0FF', 1.5);
// the Sun: a white-hot disc (r ≥ 60 px, light ×20: white through the paper's tint and the bloom's warmth), a warm halo and a wide glow round it (screen space: they spill over the limb)
const SUN_CORE: RGB = linear('#FFFFFF', 20);
const SUN_HALO: RGB = linear('#FFF1DC', 1.8);
const SUN_GLOW: RGB = linear('#FFD9A0', 0.7);
const STREAK: RGB = linear('#FFFFFF', 16);
const STREAK_WING: RGB = linear('#FFB23E', 1.1);
const AMBER: RGB = linear('#FFB23E', 3.4);
const AMBER_SOFT: RGB = linear('#FFB23E', 1.3);
const CORE: RGB = linear('#FFE2B4', 3);
const MOON_INK: RGB = linear('#D8E6F0', 1.0);
// the Moon is one card (a host's pale card, a dark face); infected, it turns his amber
const MOON_PALE: RGB = linear('#C4D3E8', 1.0);
const MOON_FACE: RGB = linear('#1A1440');
const MOON_AMBER: RGB = linear('#FFD24A', 1.0);
const GLINT: RGB = linear('#FFF1DC', 2.8);
const PAPER_INK: RGB = linear('#FFF6EC', 1.0);
const PINK_INK: RGB = linear('#FFB0D8', 1.0);

const lastOf = (list: readonly number[], f: number): number => {
  let k = -1e9;
  for (const v of list) if (v <= f && v > k) k = v;
  return k;
};

export class EarthRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.002, 300);
  private readonly shotScene = new THREE.Scene();
  private readonly shotCamera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  private kit!: AKit;
  private cards!: EarthCardField;
  private coarse!: EarthCardField;
  private body!: EarthBody;
  private sky!: SkyDome;
  private props!: ACardField;
  private lights!: ACardField;
  private sunCards!: ACardField;
  private readonly sunScene = new THREE.Scene();
  private stamps!: ACardField;
  private glow!: GlowQuad;
  private snapshot: THREE.WebGLRenderTarget | null = null;
  private snapshotReady = false;
  private snapshotFov = 40;
  private aspect = 16 / 9;
  private heightPx = 1080;
  private widthPx = 1920;
  private readonly owned: { dispose(): void }[] = [];

  init(kit: AKit, size: { width: number; height: number }): void {
    this.kit = kit;
    this.aspect = size.width / size.height;
    this.heightPx = size.height;
    this.widthPx = size.width;
    const face = kit.face;
    const fit = (s: string) => {
      const g = fitGlyph(face, s, 1, 0.74);
      return { uv: g.uv, glyph: g.glyph, aspect: g.aspect };
    };
    const data = (cards: readonly EarthCard[]): EarthCardData[] =>
      cards.map((c, i) => ({
        p: c.p,
        up: c.up,
        right: c.right,
        host: fit(c.host),
        twin: fit(c.twin),
        flinch: fit(c.flinch ?? c.host),
        kind: i === 0 ? 3 : c.ink === 'ocean' ? 0 : c.ink === 'land' ? 1 : 2,
        flip: c.flip - LEVELS.earth,
        theta: c.theta,
        seed: hash(i, 5),
      }));
    this.cards = new EarthCardField(data(earthCards()), face, CARD_SIDE, PALETTE, 0);
    this.coarse = new EarthCardField(data(coarseCards()), face, COARSE_SIDE, PALETTE, 1);
    this.body = new EarthBody();
    this.sky = new SkyDome();
    this.props = new ACardField({ capacity: 64, atlas: face, blend: 'opaque' });
    this.lights = new ACardField({ capacity: 1200, atlas: face, blend: 'add' });
    this.sunCards = new ACardField({ capacity: 4, atlas: face, blend: 'add' });
    // the Sun's disc and the Moon card are drawn after the Sun's glow (depth-tested against Earth), so the glow never washes them out
    this.sunScene.add(this.sunCards.mesh, this.props.mesh);
    this.stamps = new ACardField({ capacity: 16, atlas: face, blend: 'over', depthTest: false });
    this.glow = new GlowQuad();
    this.sky.mesh.renderOrder = -10;
    this.props.mesh.renderOrder = 20;
    this.sunCards.mesh.renderOrder = 15;
    this.lights.mesh.renderOrder = 40;
    this.scene.add(this.sky.mesh, this.body.body, ...this.cards.meshes, ...this.coarse.meshes, this.body.air, this.lights.mesh);
    (this.body.bodyMaterial.uniforms.uColor.value as THREE.Vector3).set(...BODY_NIGHT);
    (this.body.airMaterial.uniforms.uColor.value as THREE.Vector3).set(...CYAN);
    const su = this.sky.material.uniforms;
    (su.uPink.value as THREE.Vector3).set(...v3(linear('#FF48B0'), 0.3));
    (su.uBlue.value as THREE.Vector3).set(...v3(linear('#3FE0FF'), 0.26));
    (su.uSpeck.value as THREE.Vector3).set(...v3(linear('#F2EDE3'), 1.0));
    // the snapshot the whip stamps: Earth alone, centred, at 2.4&
    const s = Math.min(2048, Math.round(1024 * (size.height / 1080)));
    this.snapshot = new THREE.WebGLRenderTarget(s, s, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
    this.stamps.material.uniforms.sprites.value = this.snapshot.texture;
    this.owned.push(this.cards, this.coarse, this.body, this.sky, this.props, this.lights, this.sunCards, this.stamps, this.glow, this.snapshot);
  }

  /** Draws Earth at instant `f` (from the crash zoom-out under the bang's inset to the whip's end) into `target`. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const cam = earthCamera(f);
    const out = frameOf(f);
    aim(this.camera, cam.pose, 0.002, 300, this.aspect);
    const whip = f >= WHIP.from;
    if (whip) this.ensureSnapshot(gl);
    this.setUniforms(f, out, cam.pose);
    // the whip: Earth's 3D cards give way to its stamps; the sky pans (blurred by the sub-frames)
    const fade = coarseFade(f);
    this.cards.show(!whip && fade < 1);
    this.coarse.show(!whip && fade > 0);
    this.body.body.visible = !whip;
    this.body.air.visible = !whip;
    this.writeProps(f, cam.pose);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
    if (!whip) this.drawSun(gl, target, f, cam.pose);
    else {
      this.sunCards.begin();
      this.sunCards.end();
      this.drawFront(gl, target);
      this.drawTrail(gl, target, f);
    }
    this.drawScreen(gl, target, f, cam.pose);
  }

  private setUniforms(f: number, out: number, pose: Pose): void {
    const kick = lastOf(KICKS, out);
    const pulse = f - kick < 2 ? 1 : env(f - kick - 2, 10);
    const top = topFlash(out);
    const topFace = fitGlyph(this.kit.face, HERO_FACES.top, 1, 0.74);
    const t = f - LEVELS.earth;
    const u = {
      time: t,
      sun: lightDirection(),
      threshold: terminator(f),
      dawn: dawn(f),
      pulse,
      bob: hookBob(f),
      front: litFront(out),
      band: flinchBand(out),
      // the faces ahead of the front flinch on 2.2's clap, jumping at once (LK)
      lift: out >= OUTRUN ? Math.min(1, LK(f - OUTRUN)) : 0,
      top: { from: top ? top.from - LEVELS.earth : 0, to: top ? top.to - LEVELS.earth : 0, on: top !== null, uv: topFace.uv, glyph: topFace.glyph, aspect: topFace.aspect },
      focalPx: EARTH_FOCAL * (this.heightPx / 1080),
      pxScale: this.heightPx / 1080,
      hat: { index: HATS.indexOf(lastOf(HATS, out)), age: f - lastOf(HATS, out) },
      fade: coarseFade(f),
      // a new dither every sub-frame, so the sum of the sub-frames blends the two globes
      dither: (f * 61.73) % 97,
      wipe: seaPaste(f) * (this.heightPx / 1080),
      wipeAt: [this.widthPx / 2, this.heightPx / 2] as const,
    };
    this.cards.set(u, [0.007, -0.009]);
    this.coarse.set(u, [0.007, -0.009]);
    // the atmosphere: asleep at night, waking from the pre-dawn, burning toward the Sun once it is up (a cyan band over 1 on the limb)
    const air = this.body.airMaterial.uniforms;
    air.uAmount.value = 0.75 * atmosphere(f);
    air.uHot.value = 4.5 * dawn(f);
    if (f >= SUNRISE.at - LK_LEAD) {
      const s = sunScreen(f);
      const d = rayThrough(pose, s.x, s.y);
      const at = new THREE.Vector3(pose.position[0] + d[0] * 100, pose.position[1] + d[1] * 100, pose.position[2] + d[2] * 100).normalize();
      at.transformDirection(this.camera.matrixWorldInverse);
      (air.uSunV.value as THREE.Vector3).copy(at);
    }
    const hat = lastOf(HATS, out);
    this.sky.material.uniforms.uSwell.value = 1 + 0.2 * env(f - kick, 8) + (f - hat < 3 ? 0.04 : 0);
  }

  /** The Moon card (and its zzZ); the glints on the open hats; the Moon's flip glint. */
  private writeProps(f: number, pose: Pose): void {
    const { r, u } = basis(pose);
    this.props.begin();
    if (f >= TILT_UP - 6) {
      const m = moonPosition(f);
      const dist = Math.hypot(m[0] - pose.position[0], m[1] - pose.position[1], m[2] - pose.position[2]);
      const em = (MOON_CARD.em / EARTH_FOCAL) * dist;
      const a = clamp01((f - (TILT_UP - 6)) / 10);
      const faceKey = moonFace(f);
      const g = fitGlyph(this.kit.face, faceKey, 3.2, 0.78);
      const hw = em * 1.6;
      const hh = hw / 3.2;
      const bg = faceKey === MOON_FACES.host ? MOON_PALE : MOON_AMBER;
      this.props.push({ centre: m, right: [r[0] * hw, r[1] * hw, r[2] * hw], up: [u[0] * hh, u[1] * hh, u[2] * hh], uv: g.uv, ink: [MOON_FACE[0], MOON_FACE[1], MOON_FACE[2], 1], bg: [bg[0], bg[1], bg[2], a], glyph: g.glyph, radius: 0.35, mode: CARD_MODE.glyph, aspect: g.aspect });
      if (faceKey !== MOON_FACES.host) {
        const z = fitGlyph(this.kit.face, MOON_ZZZ, 1.6, 0.8);
        const zc: V3 = [m[0] + r[0] * hw * 1.25, m[1] + r[1] * hw * 1.25 + u[1] * hh * 0.6, m[2] + r[2] * hw * 1.25];
        const zw = hw * 0.45;
        this.props.push({ centre: zc, right: [r[0] * zw, r[1] * zw, r[2] * zw], up: [u[0] * zw / 1.6, u[1] * zw / 1.6, u[2] * zw / 1.6], uv: z.uv, ink: [MOON_INK[0], MOON_INK[1], MOON_INK[2], 1], bg: [0, 0, 0, 0], glyph: z.glyph, radius: 0, mode: CARD_MODE.glyph, aspect: z.aspect });
      }
    }
    this.props.end();
    // glints on the open hats: lamps catching the light (24–60 ✦, 6 f, light over 1); the Moon's flip glint
    this.lights.begin();
    const out = frameOf(f);
    const oh = lastOf(OPEN_HATS, out);
    if (f >= LEVELS.earth && f - oh < 6 && f < WHIP.from) {
      const cards = coarseFade(f) >= 1 ? coarseCards() : earthCards();
      const n = 24 + Math.floor(36 * hash(oh, 1));
      const a = 1 - (f - oh) / 6;
      let placed = 0;
      for (let k = 0; k < 900 && placed < n; k++) {
        const i = Math.floor(hash(oh, k, 3) * cards.length);
        const c = cards[i];
        if (c.flip > f - 3) continue;
        const p: V3 = [c.p[0] * 1.004, c.p[1] * 1.004, c.p[2] * 1.004];
        const toCam: V3 = [pose.position[0] - p[0], pose.position[1] - p[1], pose.position[2] - p[2]];
        if (toCam[0] * c.p[0] + toCam[1] * c.p[1] + toCam[2] * c.p[2] <= 0) continue;
        const sp = project(pose, p, EARTH_FOCAL);
        if (!sp || Math.abs(sp.x) > 1000 || Math.abs(sp.y) > 580) continue;
        const px = 20 + 50 * hash(oh, k, 4);
        const s = (px / EARTH_FOCAL) * sp.z * 0.5;
        this.lights.push({ centre: p, right: [r[0] * s, r[1] * s, r[2] * s], up: [u[0] * s, u[1] * s, u[2] * s], uv: [0, 0, 0, 0], ink: [GLINT[0], GLINT[1], GLINT[2], 0.9 * a], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glint, aspect: 1 });
        placed++;
      }
    }
    if (f >= MOON_BEAM + 3 && f < MOON_BEAM + 8) {
      const m = moonPosition(f);
      const dist = Math.hypot(m[0] - pose.position[0], m[1] - pose.position[1], m[2] - pose.position[2]);
      const s = (70 / EARTH_FOCAL) * dist;
      this.lights.push({ centre: m, right: [r[0] * s, r[1] * s, r[2] * s], up: [u[0] * s, u[1] * s, u[2] * s], uv: [0, 0, 0, 0], ink: [GLINT[0], GLINT[1], GLINT[2], 0.95], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.glint, aspect: 1 });
    }
    this.lights.end();
  }

  /**
   * The pre-dawn's cyan glow on the limb; then THE SUNRISE, a light event on 2.3's kick: the Sun breaking the limb (a white-hot disc, hung
   * far along the ray through its point so Earth hides what is still under the limb), its halo and glow, a long anamorphic streak along
   * the horizon, its rays and the Riso lens ghosts — all light over 1, flaring long on the kick and settling; the Moon beam on 2.3&.
   */
  private drawSun(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, pose: Pose): void {
    this.sunCards.begin();
    this.sunCards.end();
    const g = globeOnScreen(pose);
    if (f >= PREDAWN && f < SUNRISE.at + 8) {
      const a = clamp01((f - PREDAWN) / (SUNRISE.at - PREDAWN)) * (1 - clamp01((f - SUNRISE.at) / 8));
      this.glow.draw(gl, target, g.x, g.top, 520, CYAN_HOT, 0.45 * a, 1.8, 170);
    }
    if (f < SUNRISE.at - LK_LEAD) {
      this.drawFront(gl, target);
      return;
    }
    const sun = sunScreen(f);
    // the break on the kick: everything flares long for the sunrise's first beat, then settles
    const flare = env(f - (SUNRISE.at - LK_LEAD), 20);
    const burst = 1 + 0.5 * flare;
    // the eclipse dims the day round the covered Sun (the sky darkens), so its corona can shine
    const ecl = eclipseAt(f);
    const dimSun = 1 - 0.72 * ecl;
    this.glow.draw(gl, target, sun.x, sun.y, 360 * burst, SUN_GLOW, 0.6 * dimSun, 3);
    this.glow.draw(gl, target, sun.x, sun.y, 220 * burst, SUN_HALO, 0.9 * dimSun, 1.6);
    // the disc: white-hot cards far along the ray through the Sun's point (Earth hides what is still under the limb)
    {
      const { r, u: up } = basis(pose);
      const dir = rayThrough(pose, sun.x, sun.y);
      const dist = 100;
      const centre = (k: number): V3 => [pose.position[0] + dir[0] * dist * k, pose.position[1] + dir[1] * dist * k, pose.position[2] + dir[2] * dist * k];
      const card = (px: number, k: number, ink: RGB, a: number) => {
        const h = (px / EARTH_FOCAL) * dist * k;
        this.sunCards.push({ centre: centre(k), right: [r[0] * h, r[1] * h, r[2] * h], up: [up[0] * h, up[1] * h, up[2] * h], uv: [0, 0, 0, 0], ink: [ink[0], ink[1], ink[2], a], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.dot, aspect: 1 });
      };
      this.sunCards.begin();
      // a white-hot disc, its whole r (the halo under it gives it its warmth)
      card(SUN_DISC.r, 1, SUN_CORE, dimSun);
      this.sunCards.end();
    }
    const light: Shape[] = [];
    // nine rays fanning up from the limb (the sunrise's starburst; Earth hides the rest), long and short, turning slowly
    for (let i = 0; i < 9; i++) {
      const q = 0.18 + (i * (Math.PI - 0.36)) / 8 + 0.004 * (f - SUNRISE.at);
      const len = (i % 2 ? 380 : 760) * burst;
      light.push({ kind: 'segment', x: sun.x + Math.cos(q) * (SUN_DISC.r + len / 2), y: sun.y + Math.sin(q) * (SUN_DISC.r + len / 2), w: len, h: i % 2 ? 4 : 7, rot: q, color: linear('#FFE6C8', 2.2), alpha: 0.5 * dimSun, soft: 3 });
    }
    // the anamorphic streak along the horizon: a white-hot 10 px core 1600 px long (the whole frame on the kick), an amber body, a soft wing
    light.push({ kind: 'rect', x: sun.x, y: sun.y, w: 1600 * burst * burst, h: 14, color: STREAK, alpha: 1, soft: 2 });
    light.push({ kind: 'rect', x: sun.x, y: sun.y, w: 2400 * burst, h: 36, color: STREAK_WING, alpha: 0.5, soft: 16 });
    light.push({ kind: 'rect', x: sun.x, y: sun.y, w: 2600, h: 140, color: SUN_GLOW, alpha: 0.22 * burst, soft: 70 });
    // the Riso lens ghosts down the flare's axis (the Sun through the frame's centre): halftone hexes in Y, P, B, P
    [0.55, 1.15, 1.6, 2.15].forEach((k, i) => {
      const rr = [64, 110, 160, 230][i];
      const col = [linear('#FFE800', 1.3), linear('#FF48B0', 1.3), linear('#2FA8FF', 1.3), linear('#FF48B0', 1.3)][i];
      light.push({ kind: 'ellipse', x: sun.x * (1 - k), y: sun.y * (1 - k), w: 2 * rr, h: 2 * rr, color: col, alpha: 0.09 * dimSun * (0.6 + 0.4 * burst), tint: 0.5, screen: 9, angle: 0.3 });
    });
    // 2.4: the infected Moon eclipses the Sun on THREATS's slam — a corona hugging the card, its cross flaring as the band crosses the disc
    const moon = ecl > 0 ? project(pose, moonPosition(f), EARTH_FOCAL) : null;
    if (moon) {
      const e2 = ecl * ecl;
      light.push({ kind: 'rect', x: moon.x, y: moon.y, w: 2 * MOON_CARD.hw + 26, h: 2 * MOON_CARD.hh + 26, r: 30, color: linear('#FFF1DC', 2.6), alpha: 0.9 * ecl, soft: 12 });
      light.push({ kind: 'rect', x: moon.x, y: moon.y, w: 2 * MOON_CARD.hw + 120, h: 2 * MOON_CARD.hh + 120, r: 70, color: linear('#FFD9A0', 1.0), alpha: 0.35 * ecl, soft: 55 });
      light.push({ kind: 'segment', x: moon.x, y: moon.y, w: 1500 * e2 + 200, h: 5, color: linear('#FFF1DC', 2.4), alpha: e2, soft: 2 });
      light.push({ kind: 'segment', x: moon.x, y: moon.y, w: 420 * e2 + 80, h: 4, rot: Math.PI / 2, color: linear('#FFF1DC', 2.4), alpha: e2, soft: 2 });
    }
    // the Moon beam (the 2001 alignment): amber light, a 6 px core and its glow, from the limb straight up through the Sun to the Moon in 6 f
    const beam = beamAt(f);
    if (beam) {
      const m = project(pose, moonPosition(f), EARTH_FOCAL);
      if (m) {
        const y0 = g.top;
        const y1 = lerp(y0, m.y - MOON_CARD.hh * 0.8, beam.reach);
        light.push({ kind: 'rect', x: sun.x, y: (y0 + y1) / 2, w: 6, h: Math.max(1, y1 - y0), color: AMBER, alpha: beam.alpha });
        light.push({ kind: 'rect', x: sun.x, y: (y0 + y1) / 2, w: 34, h: Math.max(1, y1 - y0), color: AMBER_SOFT, alpha: 0.45 * beam.alpha, soft: 14 });
        light.push({ kind: 'ellipse', x: sun.x, y: y1, w: 150, h: 150, color: AMBER_SOFT, alpha: 0.7 * beam.alpha, soft: 70 });
      }
    }
    this.kit.light.draw(gl, target, SCREEN, { under: light, glyphs: {}, over: [] }, null);
    // the disc and the Moon card over the flare (the card hides the corona's middle: the eclipse)
    this.drawFront(gl, target);
  }

  /** The Sun's disc and the Moon card, over the glow, depth-tested against Earth (the main pass's depth). */
  private drawFront(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget): void {
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.sunScene, this.camera);
    gl.autoClear = auto;
  }

  /** Renders Earth once into the snapshot (deterministic: the content of instant 2.4& − 1, the coarse globe), centred, for the drag trail's stamps. */
  private ensureSnapshot(gl: THREE.WebGLRenderer): void {
    if (this.snapshotReady || !this.snapshot) return;
    const at = WHIP.from - 1;
    const pose = earthCamera(at).pose;
    const d = Math.hypot(...pose.position);
    const alpha = Math.asin(1 / d);
    this.snapshotFov = (2 * alpha * 1.12 * 180) / Math.PI;
    this.shotCamera.position.set(...pose.position);
    this.shotCamera.up.set(...pose.up);
    this.shotCamera.lookAt(0, 0, 0);
    this.shotCamera.fov = this.snapshotFov;
    this.shotCamera.aspect = 1;
    this.shotCamera.near = 0.01;
    this.shotCamera.far = 50;
    this.shotCamera.updateProjectionMatrix();
    this.shotCamera.updateMatrixWorld();
    this.setUniforms(at, at, pose);
    this.coarse.show(true);
    this.body.body.visible = true;
    this.body.air.visible = true;
    this.shotScene.add(this.body.body, ...this.coarse.meshes, this.body.air);
    const clear = new THREE.Color();
    gl.getClearColor(clear);
    const ca = gl.getClearAlpha();
    gl.setRenderTarget(this.snapshot);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(this.shotScene, this.shotCamera);
    gl.setClearColor(clear, ca);
    // back into the main scene
    this.scene.add(this.body.body, ...this.coarse.meshes, this.body.air);
    this.snapshotReady = true;
  }

  /** The drag trail: the six crisp stamps laid one every 2 f, the live globe gliding along them (blurred by the sub-frames). */
  private drawTrail(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const globe = globeOnScreen(earthCamera(WHIP.from).pose);
    const layout = stampLayout(globe);
    const alpha = Math.asin(1 / Math.hypot(...earthCamera(WHIP.from - 1).pose.position));
    const k = Math.tan((this.snapshotFov * Math.PI) / 360) / Math.tan(alpha);
    const sprite = (c: { x: number; y: number; r: number }) => {
      const h = c.r * k;
      this.stamps.push({ centre: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], uv: [0, 1, 1, 0], ink: [1, 1, 1, 1], bg: [0, 0, 0, 0], glyph: 1, radius: 0, mode: CARD_MODE.sprite, aspect: 1, flat: [c.x / 960, c.y / 540, h / 960, h / 540], mix: 1 });
    };
    this.stamps.begin();
    const laid = STAMP_AT.filter((s) => f >= s).length;
    for (let i = 0; i < laid; i++) sprite(layout[i]);
    sprite(trailGlobe(f, layout, globe));
    this.stamps.end();
    gl.setRenderTarget(target);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.render(this.stamps.mesh, new THREE.Camera());
    gl.autoClear = auto;
    // a cyan rim round each stamp, a 2-frame glint as each is laid
    const light: Shape[] = [];
    for (let i = 0; i < laid; i++) {
      const c = layout[i];
      light.push({ kind: 'ring', x: c.x, y: c.y, w: 2 * c.r, h: 2 * c.r, r: 3, color: CYAN, alpha: 0.8 });
      if (f - STAMP_AT[i] < 2) light.push({ kind: 'ellipse', x: c.x, y: c.y, w: Math.min(240, c.r * 1.4), h: Math.min(240, c.r * 1.4), color: GLINT, alpha: 0.6, soft: Math.min(120, c.r * 0.7) });
    }
    this.kit.light.draw(gl, target, SCREEN, { under: light, glyphs: {}, over: [] }, null);
  }

  /** The bar's screen marks: the landing's paste flare, the claps' shock rings, the printed label with its caption. */
  private drawScreen(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, pose: Pose): void {
    const out = frameOf(f);
    // from 2.1's output frame (its first sub-frame included: the flare and the label take over from the bang on the frame itself)
    if (out < LEVELS.earth) return;
    const light: Shape[] = [];
    const ink: Shape[] = [];
    // the paste flare on his tile (a 6-ray starburst Ø 900 → 0 over 12 f, an anamorphic streak, a core, the Riso lens ghosts; cream and
    // amber light, never white; the central block's one reserved flash)
    const t = f - LANDING + LK_LEAD;
    if (t >= 0 && t < 14) {
      const a = 1 - t / 14;
      const R = 450 * (1 - cO(t / 12));
      // six wedge rays: a hot core down each and a wide soft body, tapering out
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3 + 0.3;
        for (const [k, w, c, al, soft] of [[1, 54, linear('#FFE2B4', 1.4), 0.55, 20], [0.94, 14, CORE, 0.9, 4]] as const) {
          const len = R * k;
          light.push({ kind: 'segment', x: (Math.cos(q) * len) / 2, y: (Math.sin(q) * len) / 2, w: len, h: w * a + 3, rot: q, color: c, alpha: al * a, soft });
        }
      }
      light.push({ kind: 'rect', x: 0, y: 0, w: 1600, h: 10, color: AMBER, alpha: 0.95 * a, soft: 4 });
      light.push({ kind: 'rect', x: 0, y: 0, w: 1900, h: 48, color: AMBER_SOFT, alpha: 0.45 * a, soft: 22 });
      light.push({ kind: 'ellipse', x: 0, y: 0, w: 640, h: 640, color: linear('#FFE2B4', 1.7), alpha: 0.8 * a, soft: 300 });
      light.push({ kind: 'ellipse', x: 0, y: 0, w: 150, h: 150, color: CORE, alpha: a, soft: 60 });
      [60, 110, 160, 220].forEach((r, i) => {
        const col = [linear('#FFE800', 1.3), linear('#FF48B0', 1.3), linear('#2FA8FF', 1.3), linear('#FF48B0', 1.3)][i];
        const x = -(180 + 190 * i) * (i % 2 ? -1 : 1);
        light.push({ kind: 'ellipse', x, y: 0, w: 2 * r, h: 2 * r, color: col, alpha: 0.12 * a, tint: 0.5, screen: 9, angle: 0.3 });
      });
    }
    // the claps' shock rings, launched on the clap's frame (taken at the output frame: a crisp ring each frame, already 30 % out on the
    // clap): a rosette of pink halftone dots and a ring of light, from the wave's front (2.2) and from the globe (2.4)
    for (const ring of SHOCK_RINGS) {
      const tt = out - ring.at;
      if (ring.at >= LEVELS.solar || ring.at < LEVELS.earth || tt < 0 || tt >= 12) continue;
      const anchor = ring.at === OUTRUN ? this.frontOnScreen(out) : (() => {
        const gg = globeOnScreen(pose);
        return { x: gg.x, y: gg.y };
      })();
      const r = 1300 * Math.min(1, LK(tt + 0.5) * 1.03);
      const a = 1 - tt / 12;
      const n = Math.floor(r / 9);
      for (let i = 0; i < Math.min(n, 400); i++) {
        const q = (i / Math.min(n, 400)) * Math.PI * 2;
        ink.push({ kind: 'rect', x: anchor.x + r * Math.cos(q), y: anchor.y + r * Math.sin(q), w: 7, h: 7, rot: q, color: transmit(linear('#FF48B0'), 0.85 * a) });
      }
      light.push({ kind: 'ring', x: anchor.x, y: anchor.y, w: 2 * (r - 10), h: 2 * (r - 10), r: 3, color: linear('#FFF1DC', 1.8), alpha: 0.7 * a });
      // the refraction band behind the front of the ring (60 px wide: light bent toward its edge)
      light.push({ kind: 'ring', x: anchor.x, y: anchor.y, w: 2 * (r - 34), h: 2 * (r - 34), r: 60, color: linear('#FFF1DC', 0.5), alpha: 0.8 * a, soft: 26 });
    }
    if (light.length) this.kit.light.draw(gl, target, SCREEN, { under: light, glyphs: {}, over: [] }, null);
    if (ink.length) this.kit.ink.draw(gl, target, SCREEN, { under: ink, glyphs: {}, over: [] }, null);
    // the printed label `10⁷ m` slamming top-left on the landing, its caption and legend under it (the exponent rolls 7 → 13 in the whip)
    const pop = 1 + 0.3 * (1 - Math.min(1, Im(f - LANDING + 3, 3)));
    const size = 275 * pop;
    const label = scaleLabel(this.kit, f, { left: -912, baseline: 240, size });
    const glyphs: Glyph[] = [...(label.glyphs.display ?? [])];
    const mono: Glyph[] = [];
    const line = (text: string, x0: number, y: number, s: number, color: RGB) => {
      let x = x0;
      for (const run of raisedRuns(text)) {
        const rs = run.raised ? s * 0.6 : s;
        const ry = run.raised ? y + s * 0.38 : y;
        for (const ch of run.text) {
          const w = this.kit.advMono(ch) * rs;
          if (ch.trim() !== '') mono.push({ ch, x: x + w / 2, y: ry, size: rs, color });
          x += w;
        }
      }
    };
    const capY = 240 - size * 0.32 - 22;
    line(LEVEL_TYPE.earth.caption ?? '', -912, capY, 28, PAPER_INK);
    line(LEVEL_TYPE.earth.legend, -912, capY - 36, 22, PINK_INK);
    this.kit.screen.draw(gl, target, SCREEN, { under: [], glyphs: { display: glyphs, mono }, over: [] }, null);
  }

  /** Where the wave's front stands on screen at output frame `frame` (on the camera's meridian; clamped into the frame). */
  private frontOnScreen(frame: number): { x: number; y: number } {
    const th = (litFront(frame) * Math.PI) / 180;
    const p = project(earthCamera(frame).pose, [Math.sin(th), Math.cos(th), 0], EARTH_FOCAL);
    return p ? { x: Math.max(-900, Math.min(900, p.x)), y: Math.max(-500, Math.min(480, p.y)) } : { x: 0, y: 200 };
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
