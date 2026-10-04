// Renderer B, bar 3 of the cosmos on the GPU (cosmos 3.1 → 4.1: "SLINGSHOT SPIROGRAPH · 10¹³ m"; the pure half and its sources:
// src/shots/cosmosSolar.ts). Real 3D, the printed world: eight rings of kinetic type round the Sun — bands of upright cards, the planet's
// name alternating with its face, flanked by two rows of micro-type — seen by the solar camera from low on Earth's ring; the faint orbits
// under them; the overtype cursors rewriting the rings into amber; the Sun as a big billboard with its 48-ray corona, turning over into him
// inside the slingshot's peak blur and erupting its coronal mass ejection; Earth's ring pasting itself out of the drag trail; the belt, the
// far specks and the motes past the lens (three layers that answer every kick). All of it is added as light over the printed ground and
// re-printed by the Look's RisoPrint pass (cosmosKit cosmosLook). The light that must burn past the print — the spirograph's trails, his
// face on the Sun, the slingshot burst, the stamps of E11 and the light grammar — is drawn after the print (src/scenes/cosmosBHot.ts).
import * as THREE from 'three';
import { type RGB, linear } from '../engine/color.ts';
import { type Card, CardField } from '../engine/cardField.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { CURSORS, LAP } from '../score/cosmos.ts';
import { FOV, FRONT, GROUNDS } from '../shots/cosmosKit.ts';
import * as S from '../shots/cosmosSolar.ts';
import { L, kickSurge, outFrame, pulseAt } from '../shots/cosmosSolarKit.ts';
import { SegField } from './cosmosBFields.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const TAU = Math.PI * 2;

/** The inks as light (linear). Hosts: pink, cyan, cream (and their pale ice and rose); amber is his. */
export const INK: Readonly<Record<S.Ink, RGB>> = {
  amber: linear('#FFB23E'),
  pink: linear('#FF48B0'),
  cyan: linear('#3FE0FF'),
  cream: linear('#E9E2D2'),
  ice: linear('#C9D6E6'),
  rose: linear('#FFB0D8'),
};
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const GROUND = linear(GROUNDS[2]);
const SPECK_INKS: readonly RGB[] = [linear('#E9E2D2'), linear('#3FE0FF'), linear('#FF48B0')];
const BELT_INK = linear('#8C7FD0');
const EARTH_BLUE = linear('#2F86D6');
const SUN_PRE = { disc: linear('#F6D9E4'), face: linear('#9A1E58'), glow: linear('#FFB0D8'), ray: linear('#FFE2EC') };
const SUN_HIM = { disc: linear('#7A2A06', 0.9), face: linear('#FFE9C0', 2.2), glow: linear('#FFB23E'), ray: linear('#FFD27A') };

/** The far specks (a sphere round the system), the belt's dots and the motes near the lens, made once. */
type Speck = { p: S.V3; r: number; ink: RGB; tw: number };
const SPECKS: readonly Speck[] = Array.from({ length: 900 }, (_, i) => {
  const u = 2 * hash(i, 1) - 1;
  const a = TAU * hash(i, 2);
  const s = Math.sqrt(1 - u * u);
  return { p: [40 * s * Math.cos(a), 40 * u, 40 * s * Math.sin(a)], r: 0.8 + 1.4 * hash(i, 3) ** 3, ink: SPECK_INKS[i % 3], tw: hash(i, 4) };
});
const BELT_DOTS = Array.from({ length: S.BELT.count }, (_, i) => ({ a: TAU * hash(i, 31), r: S.BELT.r0 + (S.BELT.r1 - S.BELT.r0) * hash(i, 32), y: (hash(i, 33) - 0.5) * 0.05 }));
const MOTES: readonly S.V3[] = Array.from({ length: 70 }, (_, i) => {
  const r = 0.6 + 4.5 * hash(i, 41);
  const a = TAU * hash(i, 42);
  return [r * Math.cos(a), (hash(i, 43) - 0.3) * 2.2, -r * Math.sin(a)];
});

type Atlases = { face: GlyphAtlas; word: GlyphAtlas };

export class SolarRenderer {
  private paper: FlatLayer | null = null;
  private sun: FlatLayer | null = null;
  private readonly back = new SegField(40000);
  private readonly front = new SegField(12000);
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(S.FOV_Y, 16 / 9, 0.01, 1e6);
  private words: CardField | null = null;
  private faces: CardField | null = null;
  private atlases: Atlases | null = null;
  // Per-card constants, made once.
  private readonly pasted: Float64Array;
  private readonly overtyped: Float64Array;

  constructor() {
    const n = S.SOLAR_CARDS.length;
    this.pasted = new Float64Array(n);
    this.overtyped = new Float64Array(n);
    S.SOLAR_CARDS.forEach((c, i) => {
      this.pasted[i] = S.pastedAt(c);
      this.overtyped[i] = Math.min(LAP.at, S.overtypedAt(c));
    });
  }

  init(atlases: Atlases, size: { width: number; height: number }): void {
    this.atlases = atlases;
    const aspect = size.width / size.height;
    this.paper = new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 4, glyphs: 1 });
    this.sun = new FlatLayer({ atlases: { face: atlases.face }, blend: 'normal', aspect, shapes: 16, glyphs: 4 });
    this.words = new CardField({ capacity: 2400, atlas: atlases.word, blend: 'add' });
    this.faces = new CardField({ capacity: 1400, atlas: atlases.face, blend: 'add' });
    this.scene.add(this.words.mesh, this.faces.mesh);
    this.camera.aspect = aspect;
  }

  /** Bar 3 at instant `f` into `target` (never clears); `paper` false leaves the ground to the caller (the fling draws the arm under it). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, o: { paper: boolean }): void {
    const A = this.atlases!;
    const cam = S.solarCamera(f);
    const surge = kickSurge(f);
    if (o.paper) this.paper!.draw(gl, target, SCREEN, { under: [], glyphs: {}, over: [] }, { color: GROUND, grain: 0.03 });

    // ——— The light behind the cards: far specks, the belt, the orbits, the Sun's glow and corona ———
    const back = this.back;
    back.begin();
    const proj = (p: S.V3) => S.project(cam, p);
    for (const s of SPECKS) {
      const q = proj(s.p);
      if (!q || Math.abs(q.x) > 1000 || Math.abs(q.y) > 600) continue;
      back.dot(q.x, q.y, s.r * (1 + 0.2 * surge), s.ink, 0.35 + 0.25 * (s.tw > 0.96 ? Math.sin(f * 0.9 + s.tw * 50) : 0));
    }
    const clock = S.solarClock(f);
    for (let i = 0; i < BELT_DOTS.length; i++) {
      const b = BELT_DOTS[i];
      const a = b.a + clock * 0.004;
      const q = proj([b.r * Math.cos(a), b.y, -b.r * Math.sin(a)]);
      if (!q || Math.abs(q.x) > 1000 || Math.abs(q.y) > 600) continue;
      back.dot(q.x, q.y, Math.max(0.9, 0.009 * q.k) * (1 + 0.2 * surge), BELT_INK, 0.8);
    }
    // The orbits: a faint full ring under each band (the trails ride on it).
    for (const r of S.RINGS) {
      let prev: { x: number; y: number } | null = null;
      // Earth's ring is his: an amber line under its band (the ring he sits on); the others faint in their inks.
      const his = r.i === S.EARTH || f >= LAP.at;
      for (let s = 0; s <= 160; s++) {
        const a = (s / 160) * TAU;
        const q = S.project(cam, [r.r * Math.cos(a), 0, -r.r * Math.sin(a)], 0.05);
        if (q && prev && Math.abs(q.x) < 4000 && Math.abs(prev.x) < 4000 && Math.hypot(q.x - prev.x, q.y - prev.y) < 900) back.push(prev.x, prev.y, q.x, q.y, his ? 2.4 : 1.6, his ? 2.4 : 1.6, his ? scale(INK.amber, 1.3) : INK[r.ink], (r.i === S.EARTH ? 0.55 : 0.18) * S.kickPump(f) ** 2);
        prev = q;
      }
    }
    // Earth's globes glow blue under their faces (the copies of the stamped Earth).
    const out = outFrame(f);
    for (let i = 0; i < S.SOLAR_CARDS.length; i++) {
      const c = S.SOLAR_CARDS[i];
      if (c.kind !== 'earth' || this.pasted[i] > out) continue;
      const q = proj(S.cardPos(c, f));
      if (!q || Math.abs(q.x) > 1200 || Math.abs(q.y) > 800) continue;
      const hero = c === S.EARTH_CARD;
      const H = (hero ? S.EM.hero : c.em) * q.k;
      if (H > 900) continue;
      back.dot(q.x, q.y + (hero ? S.bob(f) : 0) + H * 0.5, H * 0.75, EARTH_BLUE, hero ? 0.9 : 0.45);
    }
    const sunQ = proj([0, 0, 0]);
    const him = S.sunIsHim(f);
    const sunInk = him ? SUN_HIM : SUN_PRE;
    const pulse = S.subjectIsSun(f) ? pulseAt(f) : 1;
    if (sunQ) {
      const R = S.SUN.r * sunQ.k;
      back.dot(sunQ.x, sunQ.y, R * 2.4, sunInk.glow, 0.5 * pulse);
      const fl = S.coronaFlare(f);
      for (let i = 0; i < S.SUN.rays; i++) {
        const a = (i * TAU) / S.SUN.rays + f * 0.004;
        const l = R * (1.2 + 0.4 * hash(i, 41) * fl + 0.3 * (fl - 1) * hash(i, 42));
        const c = Math.cos(a);
        const s = Math.sin(a);
        back.push(sunQ.x + c * R * 1.04, sunQ.y + s * R * 1.04, sunQ.x + c * l, sunQ.y + s * l, R * 0.03, R * 0.004, sunInk.ray, 0.9 * pulse);
        const tip = R * 0.06 * (0.6 + hash(i, 43));
        back.push(sunQ.x + c * l - tip, sunQ.y + s * l, sunQ.x + c * l + tip, sunQ.y + s * l, tip * 0.3, tip * 0.3, sunInk.ray, 0.7);
        back.push(sunQ.x + c * l, sunQ.y + s * l - tip, sunQ.x + c * l, sunQ.y + s * l + tip, tip * 0.3, tip * 0.3, sunInk.ray, 0.7);
      }
    }
    back.draw(gl, target);

    // ——— The Sun's disc and face (turning over inside the slingshot's blur; once it is him his face burns in the hot overlay) ———
    if (sunQ) {
      const R = S.SUN.r * sunQ.k;
      const turn = S.sunTurn(f);
      const squash = Math.max(0.03, Math.abs(Math.cos(turn)));
      const y = sunQ.y + (him ? S.bob(f) : 0);
      const disc: Shape = { kind: 'ellipse', x: sunQ.x, y, w: 2 * R * squash, h: 2 * R, color: scale(sunInk.disc, pulse), outline: R * 0.06, outlineColor: him ? INK.amber : INK.pink };
      const glyphs = [];
      if (!him) {
        const face = S.sunFace(f);
        const adv = A.face.entries.get(face)!.advance;
        glyphs.push({ ch: face, x: sunQ.x, y, size: (1.5 * R) / adv, stretch: squash, color: sunInk.face });
      }
      this.sun!.draw(gl, target, SCREEN, { under: [disc], glyphs: { face: glyphs }, over: [] }, null);
    }

    // ——— The cards (and the CME) in 3D ———
    this.cards(f, out, cam, sunQ);
    this.camera.position.set(...cam.eye);
    this.camera.up.set(...cam.up);
    this.camera.lookAt(cam.eye[0] + cam.fwd[0], cam.eye[1] + cam.fwd[1], cam.eye[2] + cam.fwd[2]);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;

    // ——— The light in front: cursors, motes past the lens ———
    const front = this.front;
    front.begin();
    this.cursors(f, cam);
    for (let i = 0; i < MOTES.length; i++) {
      const q = proj(MOTES[i]);
      if (!q || Math.abs(q.x) > 1100 || Math.abs(q.y) > 700) continue;
      const r = Math.min(60, 0.03 * q.k);
      front.dot(q.x, q.y, r, SPECK_INKS[i % 3], (0.12 + 0.18 * surge) * Math.min(1, 6 / Math.max(1, r)) * (r > 2 ? 1 : 0.5));
    }
    front.draw(gl, target);
  }

  /**
   * The rings' cards — every row upright, facing the lens: the names and faces of the main row, the micro-type rows just inside and outside
   * it — Earth's globes, the overtype's pop and Ctrl+V ghost, and the CME.
   */
  private cards(f: number, out: number, cam: S.Cam, sunQ: { x: number; y: number; k: number } | null): void {
    const A = this.atlases!;
    const qWord = A.word.cellH / A.word.fontPx;
    const qFace = A.face.cellH / A.face.fontPx;
    const words: Card[] = [];
    const faces: Card[] = [];
    const n = S.SOLAR_CARDS.length;
    const right = cam.right;
    const pump = S.kickPump(f);
    const whip = S.whipness(f);
    for (let i = 0; i < n; i++) {
      const c = S.SOLAR_CARDS[i];
      if (this.pasted[i] > out) continue;
      const p = S.cardPos(c, f);
      const q = S.project(cam, p, 0.05);
      if (!q || Math.abs(q.x) > 1500 || Math.abs(q.y) > 900) continue;
      const amber = out >= this.overtyped[i];
      const since = f - this.overtyped[i];
      const pop = since >= 0 && since < 12 ? 1 + 0.25 * (1 - Math.min(1, L(since))) : 1;
      const isWord = c.kind === 'word' || c.kind === 'micro';
      const text = S.cardText(c, f);
      const hero = c === S.EARTH_CARD;
      const em = (hero ? S.EM.hero : c.em) * pop * (hero ? 1 : 1 + S.POP * (pump - 1));
      const H = em * (isWord ? qWord : qFace);
      const px = H * q.k;
      if (px < 1.2) continue;
      // Far type dims (the rings' far sides pile up along the horizon: a soft band, not a wall of type); the micro rows only read near.
      const far = c.row === 0 ? Math.min(1, Math.max(0.15, 1.7 - q.z / 3.5)) : Math.min(0.7, Math.max(0, 1.6 - q.z / 2.2));
      const fade = far * Math.min(1, (px - 1.2) / 3) * (px > 520 ? Math.max(0, 1 - (px - 520) / 380) : 1);
      if (fade <= 0.01) continue;
      const asp = (isWord ? A.word : A.face).entries.get(hero ? S.earthFace(f) : text)!.aspect;
      let ink = amber ? INK.amber : INK[S.RINGS[c.ring].ink];
      if (c.kind === 'earth') ink = INK.amber;
      const lift = hero ? S.bob(f) / q.k : 0;
      const centre: S.V3 = [p[0], p[1] + (c.row === 0 ? H * 0.32 : 0) + lift, p[2]];
      // Earth (him) faces the lens; every other card runs along its ring (the banners of type, in perspective).
      const run = hero ? right : S.cardRun(c, f, cam.eye);
      const r: S.V3 = [run[0] * H * asp * 0.5, run[1] * H * asp * 0.5, run[2] * H * asp * 0.5];
      const u: S.V3 = [0, H * 0.5, 0];
      const k = (c.kind === 'micro' ? 0.8 : hero ? 1.6 * (S.subjectIsSun(f) ? 1 : pulseAt(f)) : 1.25) * (1 - 0.9 * whip) * (hero ? 1 : pump);
      const card: Card = { face: hero ? S.earthFace(f) : text, centre, right: r, up: u, color: scale(ink, k), alpha: fade };
      (isWord ? words : faces).push(card);
      // The overtype's Ctrl+V ghost: two misregistered copies (pink, cyan) for 2 frames.
      if (out - this.overtyped[i] >= 0 && out - this.overtyped[i] < 2 && this.overtyped[i] > -Infinity && this.overtyped[i] < LAP.at) {
        const g = 7 / q.k;
        for (const [ink2, ox, oy] of [[INK.pink, g, -g * 0.7], [INK.cyan, -g * 0.8, g * 0.6]] as const) {
          (isWord ? words : faces).push({ ...card, centre: [centre[0] + run[0] * ox, centre[1] + oy, centre[2] + run[2] * ox], color: scale(ink2, 0.7), alpha: fade * 0.8 });
        }
      }
    }
    // The coronal mass ejection: three prominence loops of amber faces in the Sun's picture plane.
    if (sunQ) {
      for (const m of S.cme(f)) {
        const R = S.SUN.r;
        const H = m.em * R * qFace;
        const asp = A.face.entries.get(m.face)!.aspect;
        const centre: S.V3 = [cam.right[0] * m.x * R + cam.up[0] * m.y * R, cam.right[1] * m.x * R + cam.up[1] * m.y * R, cam.right[2] * m.x * R + cam.up[2] * m.y * R];
        faces.push({ face: m.face, centre, right: scale(cam.right, H * asp * 0.5) as S.V3, up: scale(cam.up, H * 0.5) as S.V3, color: scale(INK.amber, 1.6) });
      }
    }
    this.words!.write(words);
    this.faces!.write(faces);
  }

  /** The overtype cursors: an amber block ▌ racing round each ring with a bloom streak, and the sparks that paste them ring to ring. */
  private cursors(f: number, cam: S.Cam): void {
    const front = this.front;
    if (f >= LAP.at) return;
    for (const ring of S.RINGS) {
      if (ring.i === S.EARTH) continue;
      const ca = S.cursorAngle(ring.i, f);
      if (ca < 0 || ca >= TAU) continue;
      const card0 = S.SOLAR_CARDS.find((c) => c.ring === ring.i && c.row === 0 && c.j === 0)!;
      const a = S.cardAngle(card0, f) + ca;
      const q = S.project(cam, [ring.r * Math.cos(a), 0, -ring.r * Math.sin(a)], 0.05);
      if (!q) continue;
      const h = Math.min(260, S.EM.word * 0.73 * q.k);
      const y = q.y + h * 0.55;
      for (const dx of [-0.12, 0, 0.12]) front.push(q.x + dx * h, y - h * 0.5, q.x + dx * h, y + h * 0.5, h * 0.16, h * 0.16, INK.amber, 1.1);
      front.push(q.x - h * 2.2, y, q.x + h * 2.2, y, h * 0.05, h * 0.05, INK.amber, 0.35);
      front.dot(q.x, y, h * 0.9, INK.amber, 0.22);
    }
    // The 3-frame sparks that carry a cursor from Earth's ring to the next rings.
    for (const row of CURSORS) {
      const t = f - row.at + 3;
      if (t < 0 || t >= 3) continue;
      const from = S.project(cam, S.cardPos(S.EARTH_CARD, f));
      for (const name of row.rings) {
        const ring = S.RINGS.find((r) => r.name.toLowerCase() === name)!;
        const card0 = S.SOLAR_CARDS.find((c) => c.ring === ring.i && c.row === 0 && c.j === 0)!;
        const to = S.project(cam, S.cardPos(card0, f));
        if (!from || !to) continue;
        const u = t / 3;
        const x = from.x + (to.x - from.x) * u;
        const y = from.y + (to.y - from.y) * u + Math.sin(Math.PI * u) * 80;
        const u0 = Math.max(0, u - 0.18);
        const x0 = from.x + (to.x - from.x) * u0;
        const y0 = from.y + (to.y - from.y) * u0 + Math.sin(Math.PI * u0) * 80;
        front.push(x0, y0, x, y, 2, 7, INK.amber, 1.2);
        front.dot(x, y, 16, INK.amber, 0.6);
      }
    }
  }

  dispose(): void {
    this.paper?.dispose();
    this.sun?.dispose();
    this.back.dispose();
    this.front.dispose();
    this.words?.dispose();
    this.faces?.dispose();
  }
}

