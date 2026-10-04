// Renderer B's HOT light (cosmos 3.1 → 5.1): everything on bars 3–4 that must burn past the print, drawn in the screen overlay — after
// the Riso pass and before the bloom, so the bloom turns it into glow, while the printed world under it keeps its paper and ink. The
// overlay is drawn once per output frame, so this renderer samples the frame's own shutter itself (src/shots/cosmosGalaxyLook.ts
// hotSamples) and draws its moving light at each instant, at that instant's share and through the rig's view: the light is motion-blurred
// with the picture under it and punched with it.
//
// Bar 3: the SPIROGRAPH — one continuous trail per glyph cluster (8 rings × 24) through the past camera, a 4 px HDR core in a glow, so a
// whip curls them into a guilloche of light (src/shots/cosmosSolar.ts spiroTrails); his face on the Sun once it has turned over
// (✺◟( • ω • )◞✺, amber emissive, ≥ 60 % of the disc); the slingshot burst; the six stamps of E11 (once per output frame).
// Bar 4: his amber light wake (a cone of rays and streaks of his light streaming back past the lens) and his face, burning; the paste
// flare he is born out of; the dust punch's hot ring; the neon power-up (the core's small amber-white point, the ignition's coloured
// tubes and ring front, +30 % coloured light in the centre for 8 f; never white); the light bursts; the quasar's 40 px jets; the tilt's
// anamorphic streak (the band's amber-cream heart).
// Both bars: the light grammar (src/scenes/cosmosBLight.ts).
import type * as THREE from 'three';
import { HERO_FACES, REAM_FACES } from '../content/castCosmos.ts';
import { type RGB, linear } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Quality } from '../engine/types.ts';
import type { View } from '../engine/view.ts';
import { FLING, ORBIT_LAND, QUASAR, REVEAL, SLINGSHOT, cs } from '../score/cosmos.ts';
import { ENERGY } from '../score/energy.ts';
import { FOV, FRONT } from '../shots/cosmosKit.ts';
import * as G from '../shots/cosmosGalaxy.ts';
import { hotSamples } from '../shots/cosmosGalaxyLook.ts';
import * as S from '../shots/cosmosSolar.ts';
import { clamp01, pulseAt } from '../shots/cosmosSolarKit.ts';
import { SegField } from './cosmosBFields.ts';
import { AMBER, CREAM, HOT, Pen, WHITE_HOT, drawGrammar, drawSlingBurst, scale } from './cosmosBLight.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const TAU = Math.PI * 2;
const CYAN = linear('#3FE0FF');
const PINK = linear('#FF3D8B');
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** The galaxy's core in neon (design §8 palette: paper / core → #FFE2B4): HDR, the hue clamp shows it amber-white at full brightness. */
const CORE_NEON = CREAM;
/** The ignition's colour (the ring front's amber between its pink and cyan glows): the core's point burns in it for the power-up. */
const IGNITE = mixRGB(AMBER, PINK, 0.35);
/** The power-up's coloured light round the centre: amber (≈ 230 px) inside pink (≈ 420 px), their alphas at its peak (≈ +30 % centre). */
export const POWER_UP = { amber: 0.66, pink: 0.24 } as const;
/** The ignition ring's swept band: its light at the leading edge (linear, under 1: a wash, not a glow source). */
const IGNITE_WASH = 0.35;
/** The band width (px) the wash keeps its full light over; a wider sweep shares the same light out. */
const IGNITE_WASH_PX = 48;
/** The tilt's streak: the band's heart as C prints it (BAND_INK through its neon print, ≈ #FFC380): cream toward amber. */
const STREAK_INK = mixRGB(CREAM, AMBER, 0.6);
/** The rings' host inks as light (amber is his). */
const RING_INK: Readonly<Record<S.Ink, RGB>> = {
  amber: AMBER,
  pink: linear('#FF48B0'),
  cyan: CYAN,
  cream: linear('#E9E2D2'),
  ice: linear('#C9D6E6'),
  rose: linear('#FFB0D8'),
};
/** The stamps: copies of the infected Earth (A's amber globe, its cyan rim) with his face. */
const STAMP_GLOBE = linear('#E8892E', 0.95);
const STAMP_FACE = linear('#FFF1DC', 1.3);

/** A glyph placed through the rig's view (its centre moved, its size zoomed, turned with the roll). */
function rigGlyph(g: Glyph, v: View): Glyph {
  const c = Math.cos(v.roll) * v.zoom;
  const s = Math.sin(v.roll) * v.zoom;
  return { ...g, x: c * g.x - s * g.y + v.x, y: s * g.x + c * g.y + v.y, size: g.size * v.zoom, rot: (g.rot ?? 0) + v.roll };
}

export class HotRenderer {
  /** Thin light: trails, rays, tubes, rings, glints (a white core inside a halo). */
  private readonly light = new SegField(520000);
  /** Broad light: the jets' 40 px cores, the knots, his glow (a wide core in a halo). */
  private readonly broad = new SegField(30000, { core: 0.6, halo: 0.22 });
  /** White-hot plateaus (the bulge, the streak, the band's heart): no halo, so a light far above 1 ends in a clean falloff (its glow is drawn apart, soft). */
  private readonly white = new SegField(64, { core: 0.45, halo: 0 });
  private readonly pen = new Pen();
  /** The output frame's white-hot hearts (the paste flares'), through the frame's rig. */
  private readonly heart = new Pen();
  private faces: FlatLayer | null = null;
  private stamps: FlatLayer | null = null;
  private atlas: GlyphAtlas | null = null;

  init(atlases: { face: GlyphAtlas }, size: { width: number; height: number }): void {
    const aspect = size.width / size.height;
    this.atlas = atlases.face;
    this.faces = new FlatLayer({ atlases: { face: atlases.face }, blend: 'add', aspect, shapes: 4, glyphs: 64 });
    this.stamps = new FlatLayer({ atlases: { face: atlases.face }, blend: 'normal', aspect, shapes: 8, glyphs: 8 });
  }

  /** The hot light of output frame `frame` into `target` (the summed, printed picture; never clears). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number, quality: Quality): void {
    const bar3 = frame < cs(4);
    const pen = this.pen;
    this.light.begin();
    this.broad.begin();
    this.white.begin();
    // The moving light at each of the frame's own instants (its share, the rig at that instant).
    const samples = hotSamples(frame, quality, bar3 ? 8 : 12);
    for (const s of samples) {
      const v = ENERGY.view(s.cam);
      if (s.frame < cs(4)) this.solarAt(pen.to(this.light, v, s.weight), s.frame);
      else this.galaxyAt(pen.to(this.light, v, s.weight), this.broad, this.white, v, s.weight, s.frame);
    }
    // The light of the output frame itself (the grammar, the bursts, the power-up): crisp, through the frame's rig.
    const v = ENERGY.view(frame);
    pen.to(this.light, v, 1);
    this.heart.to(this.white, v, 1);
    const glyphs: Glyph[] = [];
    if (bar3) this.solarFrame(pen, frame, glyphs);
    else this.galaxyFrame(pen, frame, glyphs, [Math.min(...samples.map((s) => s.frame)), Math.max(...samples.map((s) => s.frame))]);
    this.broad.draw(gl, target);
    this.white.draw(gl, target);
    this.light.draw(gl, target);
    if (glyphs.length) this.faces!.draw(gl, target, SCREEN, { under: [], glyphs: { face: glyphs.map((g) => rigGlyph(g, v)) }, over: [] }, null);
    if (bar3) this.drawStamps(gl, target, frame);
  }

  // ——— Bar 3 ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

  /**
   * The spirograph at instant `f`: every cluster's trail through the past camera, a 4 px HDR core and a soft glow, fading with its age;
   * the trails grow out of the landing (none older than 3.1), pump with the kick, burn brighter on the lap and fade with the fling.
   */
  private solarAt(pen: Pen, f: number): void {
    if (f < ORBIT_LAND.at || f >= FLING.from + 1) return;
    // Gone as the fling throws the camera back: its past camera would stretch every trail into one radial burst (a flash).
    const gain = S.trailGain(f) * S.kickPump(f) * (1 - clamp01((f - FLING.from + 1) / 2));
    if (gain <= 0) return;
    for (const t of S.spiroTrails(f)) {
      const n = t.n;
      const ink = t.amber ? AMBER : RING_INK[S.RINGS[t.ring].ink];
      const core = scale(ink, 2.3 * gain);
      for (let k = 1; k < n; k++) {
        const x0 = t.x[k - 1];
        const y0 = t.y[k - 1];
        const x1 = t.x[k];
        const y1 = t.y[k];
        if (Math.max(Math.abs(x0), Math.abs(x1)) > 1300 || Math.max(Math.abs(y0), Math.abs(y1)) > 800) continue;
        const u0 = (k - 1) / t.K;
        const u1 = k / t.K;
        const fade = (1 - u0) ** 1.25;
        pen.seg(x0, y0, x1, y1, 4.2 * (1 - 0.45 * u0), 4.2 * (1 - 0.45 * u1), core, fade);
        pen.seg(x0, y0, x1, y1, 14, 14, ink, 0.06 * gain * fade);
      }
    }
  }

  /** Bar 3's light of output frame `frame`: the grammar on Earth (then the Sun), the slingshot burst, his face on the Sun. */
  private solarFrame(pen: Pen, frame: number, glyphs: Glyph[]): void {
    const subject = solarSubjectAt(frame);
    drawGrammar(pen, frame, { subject, glints: S.solarGlints(frame), sparks: S.solarSparks(frame) }, this.heart);
    const cam = S.solarCamera(frame);
    const sun = S.project(cam, [0, 0, 0]);
    if (!sun) return;
    const R = S.SUN.r * sun.k;
    drawSlingBurst(pen, frame, { x: sun.x, y: sun.y, r: R });
    if (S.sunIsHim(frame) && frame < FLING.from + 4) {
      // His face on the Sun, burning amber: ≥ 60 % of the disc's width, pulsing with the kicks. The printed card turns over inside the
      // peak blur; his light is whole on the kick's own frame (the reveal is the hit), then follows the card's last quarter-turn.
      const face = HERO_FACES.sun;
      const adv = this.atlas!.entries.get(face)!.advance;
      const squash = frame <= SLINGSHOT ? 1 : Math.max(0.7, Math.abs(Math.cos(S.sunTurn(frame))));
      const fade = 1 - clamp01((frame - FLING.from) / 4);
      glyphs.push({ ch: face, x: sun.x, y: sun.y + S.bob(frame), size: (S.SUN_FACE_WIDTH * 2 * R) / adv, stretch: squash, color: scale(AMBER, 2.6 * pulseAt(frame)), alpha: fade });
      // Its emissive heart: the disc glows from inside.
      pen.dot(sun.x, sun.y, R * 0.95, scale(AMBER, 0.55), 0.5 * fade);
    }
  }

  /**
   * E11, the morph cut, once per output frame (outside the sub-frame sum: the six crisp stamps): copies of the infected Earth as A laid
   * them, shrunk on 3.1 to min(90, 0.6 r) px, then glided onto their slots riding Earth's ring, shrinking to a ring tile and fading.
   */
  private drawStamps(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const under: Shape[] = [];
    const glyphs: Glyph[] = [];
    const face = S.earthFace(frame);
    const adv = this.atlas!.entries.get(face)!.advance;
    for (let k = 0; k < 6; k++) {
      const st = S.stampAt(k, frame);
      if (!st || st.alpha <= 0) continue;
      under.push({ kind: 'ellipse', x: st.x, y: st.y, w: 2 * st.r, h: 2 * st.r, color: STAMP_GLOBE, alpha: st.alpha, outline: Math.max(1.5, 0.05 * st.r), outlineColor: CYAN });
      glyphs.push({ ch: face, x: st.x, y: st.y, size: (1.3 * st.r) / adv, color: STAMP_FACE, alpha: st.alpha });
    }
    if (under.length === 0) return;
    this.stamps!.draw(gl, target, SCREEN, { under, glyphs: { face: glyphs }, over: [] }, null);
  }

  // ——— Bar 4 ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

  /** Bar 4's moving light at instant `f`: his wake, the bulge, the ignition, the bursts, the jets, the streak. */
  private galaxyAt(pen: Pen, broad: SegField, white: SegField, v: View, w: number, f: number): void {
    const bp = new Pen().to(broad, v, w);
    const wp = new Pen().to(white, v, w);
    const h = G.heroScreen(f);
    if (h && h.alpha > 0) this.wake(pen, bp, f, h);
    const snap = G.snapAt(f);
    if (snap <= 0.15) return;
    const cam = G.galaxyCamera(f);
    const spin = G.spinAt(f);
    const alpha = clamp01(snap / 0.15) * G.discFade(f);
    const pt = (r: number, a: number, z = 0) => S.project(cam, G.galaxyPoint(r, a + spin / Math.sqrt(Math.max(r, 0.05)), z));
    const core = S.project(cam, G.PLACEMENT.core);
    // The ignition: inside its ring every arm's spine burns as a coloured tube, the ring's front brightest (the power-up's coloured light).
    const ig = Math.min(G.ignitionAt(f), G.SPIRAL.rMax);
    if (ig > G.SPIRAL.r0 && alpha > 0) {
      const flip = G.flipRadius(f);
      for (let arm = 0; arm < G.SPIRAL.arms; arm++) {
        let prev: { x: number; y: number } | null = null;
        // From the bulge's edge out (inside it the core burns white-hot: no coloured tube tints it).
        for (let r = G.BULGE_R; r <= ig + 1e-9; r += 0.01) {
          const q = pt(r, G.armAngle(arm, r));
          if (q && prev && Math.abs(q.x) < 2400 && Math.abs(prev.x) < 2400) {
            const ink = arm % 2 === 0 || r < flip ? AMBER : arm === 1 ? CYAN : PINK;
            const front = clamp01(1 - (ig - r) / 0.08);
            pen.seg(prev.x, prev.y, q.x, q.y, 2.6 + 3 * front, 2.6 + 3 * front, scale(ink, (1.9 + 2.2 * front) * alpha), 1);
            pen.seg(prev.x, prev.y, q.x, q.y, 16 + 20 * front, 16 + 20 * front, ink, (0.09 + 0.18 * front) * alpha);
          }
          prev = q;
        }
      }
    }
    // The light bursts racing out every arm, core → rim, one a 16th.
    for (const b of G.burstsAt(f)) {
      for (let arm = 0; arm < G.SPIRAL.arms; arm++) {
        const q = pt(b.r, G.armAngle(arm, b.r));
        if (!q) continue;
        const ink = arm % 2 ? CYAN : AMBER;
        pen.dot(q.x, q.y, 70, scale(ink, 1.2), b.a * alpha);
        pen.star4(q.x, q.y, 46, scale(HOT, 2.4), b.a * alpha);
      }
    }
    if (!core) return;
    // The core: a small amber-white point (G.CORE_POINT: ≈ 60 → 70 px, a steep falloff) in a tight amber glow, pulsing with the kicks once
    // the core is the subject (from the quasar). The neon power-up (4.3, its 8 f): the point burns in the ignition's colour, +30 %, and
    // a coloured light — amber inside pink — swells round the centre and eases back; never white, and never a disc whose bloom fogs the
    // frame (round 2: the 26× white plateau of ≈ 300 px read as a flat white disc in a milky haze).
    const bulge = G.bulgeAt(f);
    const bc = f < REVEAL ? S.project(G.galaxyCamera(REVEAL), G.PLACEMENT.core) : core;
    if (bulge > 0 && bc) {
      const pulse = f >= QUASAR.at - 2 ? 1 + 0.15 * (pulseAt(f) - 1) : 1;
      const up = G.powerUpAt(f);
      const ink = mixRGB(CORE_NEON, IGNITE, 0.7 * up);
      wp.dot(bc.x, bc.y, G.corePointRadius(f) * pulse, scale(ink, G.CORE_POINT.gain * (1 + 0.3 * up)), bulge);
      pen.dot(bc.x, bc.y, 150 * pulse, AMBER, 0.2 * bulge);
      if (up > 0) {
        pen.dot(bc.x, bc.y, 230, AMBER, POWER_UP.amber * up * bulge);
        pen.dot(bc.x, bc.y, 420, PINK, POWER_UP.pink * up * bulge);
      }
    }
    // The quasar's jets: a 40 px core of his light round a white-hot line, in a wide amber glow; knots riding out.
    const t = f - QUASAR.at;
    const base = 1 + 0.5 * Math.max(0, 1 - t / 6);
    for (const j of G.quasarJets(f)) {
      const sp = j.spine;
      if (sp.length < 2) continue;
      const px0 = sp[0].px;
      const sc = (p: G.JetPoint) => Math.min(2, Math.max(0.4, p.px / px0));
      for (let i = 1; i < sp.length; i++) {
        const p = sp[i - 1];
        const q = sp[i];
        const s0 = sc(p);
        const s1 = sc(q);
        const open0 = Math.min(1, p.z / 0.05);
        const open1 = Math.min(1, q.z / 0.05);
        const fade = j.a * (1 - 0.25 * (i / sp.length));
        bp.seg(p.x, p.y, q.x, q.y, 20 * s0 * open0 + 2, 20 * s1 * open1 + 2, scale(AMBER, 1.15 * base), fade);
        pen.seg(p.x, p.y, q.x, q.y, 2.2 * s0 + 1, 2.2 * s1 + 1, scale(WHITE_HOT, 2.2 * base), fade);
        pen.seg(p.x, p.y, q.x, q.y, 60 * s0 * open0 + 4, 60 * s1 * open1 + 4, AMBER, 0.05 * fade);
      }
      for (const k of j.knots) {
        const r = 16 * sc(k) + 5;
        bp.dot(k.x, k.y, r, scale(HOT, 1.6), j.a);
        pen.ring(k.x, k.y, r * 1.5, 18, 1.6, scale(HOT, 1.8), j.a);
      }
    }
    // The tilt's anamorphic streak through the core, widening to the frame and beyond: a ≈ 10 px line of the band's own blazing amber-cream
    // (C's 5.1 band and its paste flare's 10 px streak print ≈ #FFC380 at their heart) in a thin glow. Round 2: no white plateau and no
    // wide HDR (the 50 px white-hot line's bloom laid a grey haze over the band's frames, p10 22–37 against C's 19), so 5.1 − 1 → 5.1
    // matches on value: the same amber line on the same dark ground.
    const streak = G.streakAt(f);
    if (streak.a > 0) {
      wp.seg(core.x - streak.half, core.y, core.x + streak.half, core.y, 10, 10, scale(STREAK_INK, 2.4), streak.a);
      pen.seg(core.x - streak.half, core.y, core.x + streak.half, core.y, 26, 26, STREAK_INK, 0.08 * streak.a);
    }
  }

  /**
   * His light at instant `f` through the chase: a burning glow round him, a cone of ten slow-turning rays to the frame's edges, and his wake —
   * streaks of his light streaming back past the lens, faster with the warp's speed.
   */
  private wake(pen: Pen, bp: Pen, f: number, h: { x: number; y: number; em: number; alpha: number }): void {
    const k = h.em / G.HERO.em;
    const pulse = pulseAt(f);
    const a = h.alpha;
    bp.dot(h.x, h.y, 120 * k, scale(AMBER, 0.55 * (1 + 0.35 * (pulse - 1))), a);
    pen.dot(h.x, h.y, 260 * k, AMBER, 0.22 * a);
    for (let r = 0; r < 10; r++) {
      const q = (r * TAU) / 10 + 0.3 + f * 0.01;
      const c = Math.cos(q);
      const s = Math.sin(q);
      pen.seg(h.x + c * 70 * k, h.y + s * 70 * k, h.x + c * 2200, h.y + s * 2200, 2 * k, 90, AMBER, 0.05 * a);
      pen.seg(h.x + c * 70 * k, h.y + s * 70 * k, h.x + c * 1400, h.y + s * 1400, 1.2, 3, scale(AMBER, 1.4), 0.3 * a);
    }
    const T = G.travel(f);
    const v = Math.min(3, Math.abs(G.speed(f)) / 0.55);
    for (let i = 0; i < 48; i++) {
      const q = TAU * hash(i, 61);
      const ph = (hash(i, 62) + T * 0.05) % 1;
      const r0 = (110 + 1500 * ph ** 1.7) * k;
      const r1 = r0 * (1.12 + 0.18 * v);
      const c = Math.cos(q);
      const s = Math.sin(q);
      pen.seg(h.x + c * r0, h.y + s * r0, h.x + c * r1, h.y + s * r1, 1 + 2.5 * ph, 1.5 + 6 * ph, scale(AMBER, 2.2), 0.55 * a * (1 - ph ** 2));
    }
  }

  /** Bar 4's light of output frame `frame`: the grammar on him (his star, the core), his face burning, the flip ring, the ignition ring. */
  private galaxyFrame(pen: Pen, frame: number, glyphs: Glyph[], span: readonly [number, number]): void {
    this.igniteRing(pen, frame, span);
    const h = G.heroScreen(frame);
    const sparks: [number, number][] = [];
    if (h && h.alpha > 0) {
      const pulse = pulseAt(frame);
      glyphs.push({ ch: G.heroFace(frame), x: h.x, y: h.y, size: h.em, color: scale(AMBER, 2.4 * pulse), alpha: h.alpha });
      const ring = G.flipRing(frame);
      if (ring) {
        for (let k = 0; k < 12; k++) {
          const q = (k * TAU) / 12 + ring.at * 0.37;
          const x = h.x + Math.cos(q) * (60 + 180 * ring.u) * (h.em / G.HERO.em);
          const y = h.y + Math.sin(q) * (50 + 150 * ring.u) * (h.em / G.HERO.em);
          if (ring.u < 0.5) sparks.push([x, y]);
          glyphs.push({ ch: REAM_FACES[(k + ring.at) % REAM_FACES.length], x, y, size: 18, color: scale(AMBER, 2), alpha: (1 - ring.u) * h.alpha });
        }
      }
    }
    drawGrammar(pen, frame, { subject: G.galaxySubject(frame), glints: G.galaxyGlints(frame), sparks }, this.heart);
    // The dust punch: the hole's rim burns as it bursts past the lens.
    const sheet = G.sheetAt(frame);
    if (sheet && sheet.hole > 0) {
      const a = sheet.alpha / 0.92;
      pen.ring(0, G.HERO.y, sheet.hole, 96, 3, scale(HOT, 2), a);
      pen.ring(0, G.HERO.y, sheet.hole * 0.96, 96, 12, CYAN, 0.25 * a);
    }
    // The Eames square's lock on 4.3 lands on his star with (>ω<).
    if (frame >= REVEAL && frame < REVEAL + 12) {
      const s = G.galaxySubject(frame);
      glyphs.push({ ch: HERO_FACES.top, x: s.x, y: s.y, size: 34, color: scale(AMBER, 2.6), alpha: 1 });
    }
  }

  /**
   * The ignition ring (4.3 → its rim), once per output frame over the frame's shutter span [fa, fb]: the band the front sweeps in the
   * shutter as a wash of the light it leaves behind — pink at its trailing edge rising to amber, sub-rings ≤ 4 px apart so it is one
   * smooth band — and at its leading edge the front itself: a hot amber line between a pink glow inside and a cyan glow outside (the
   * plates' three lights in one front), brightest over the power-up's 8 f. Round 2: drawn per hot sample, the front left twelve discrete
   * thin rings in a lavender-grey smear (the three glows summed) across the ignition's first frames.
   */
  private igniteRing(pen: Pen, frame: number, span: readonly [number, number]): void {
    const alpha = clamp01(G.snapAt(frame) / 0.15) * G.discFade(frame);
    const rb = G.ignitionAt(span[1]);
    if (alpha <= 0 || rb <= G.SPIRAL.r0 || rb >= G.SPIRAL.rMax) return;
    const ra = Math.max(G.SPIRAL.r0, Math.min(G.ignitionAt(span[0]), rb));
    const cam = G.galaxyCamera(frame);
    const up = Math.max(G.powerUpAt(frame), 0.6);
    // One ring of chords, each pulled in 0.27 w at both ends so neighbouring capsules' caps sum to the chord's own light at the joint
    // (no bead), and started at its own phase so the sub-rings' joints never line up into radial striations.
    const ring = (r: number, w: number, ink: RGB, a: number, phase = 0): void => {
      let prev: { x: number; y: number } | null = null;
      for (let s = 0; s <= 96; s++) {
        const q = S.project(cam, G.galaxyPoint(r, ((s + phase) / 96) * TAU));
        const l = q && prev ? Math.hypot(q.x - prev.x, q.y - prev.y) : 0;
        if (q && prev && l < 600) {
          const k = Math.min(0.45, (0.27 * w) / Math.max(l, 1e-6));
          const dx = (q.x - prev.x) * k;
          const dy = (q.y - prev.y) * k;
          pen.seg(prev.x + dx, prev.y + dy, q.x - dx, q.y - dy, w, w, ink, a);
        }
        prev = q;
      }
    };
    // The swept band: its width on screen (px, along the disc's x axis) sets how many sub-rings tile it.
    const qa = S.project(cam, G.galaxyPoint(ra, 0));
    const qb = S.project(cam, G.galaxyPoint(rb, 0));
    const px = qa && qb ? Math.hypot(qb.x - qa.x, qb.y - qa.y) : 0;
    const n = Math.min(64, Math.ceil(px / 4));
    // A motion blur spreads the same light over the band it sweeps: past IGNITE_WASH_PX of band each px of the wash and of the front's
    // glows gets proportionally less (the front's fastest frames, 4.3 + 1 … + 2, otherwise lit a ≈ 175 px annulus at full light: a swing
    // up on 4.3 + 1 and back down on + 2, one flash too many in the 6×6 test). The front's amber line stays whole: the edge the eye follows.
    const share = Math.min(1, IGNITE_WASH_PX / Math.max(px, 1));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      ring(ra + (rb - ra) * u, Math.max(3, (1.6 * px) / n), mixRGB(PINK, AMBER, u ** 1.5), alpha * IGNITE_WASH * share * (0.12 + 0.88 * u * u), (k * 0.618) % 1);
    }
    ring(rb * 0.97, 26, PINK, (0.16 + 0.14 * up) * alpha * share);
    ring(rb * 1.03, 26, CYAN, (0.16 + 0.14 * up) * alpha * share);
    ring(rb, 3, scale(AMBER, 1.6 + 1.4 * up), alpha);
  }

  dispose(): void {
    this.light.dispose();
    this.broad.dispose();
    this.white.dispose();
    this.faces?.dispose();
    this.stamps?.dispose();
  }
}

/** Where bar 3's SUBJECT is on screen at instant `f` (Earth, then the Sun), and its size (px), for the light grammar. */
export function solarSubjectAt(f: number): { x: number; y: number; r: number } {
  const cam = S.solarCamera(f);
  if (S.subjectIsSun(f)) {
    const q = S.project(cam, [0, 0, 0]);
    return q ? { x: q.x, y: q.y, r: S.SUN.r * q.k } : { x: 0, y: 0, r: 40 };
  }
  const q = S.project(cam, S.cardPos(S.EARTH_CARD, f));
  return q ? { x: q.x, y: q.y + S.EM.hero * 0.32 * 1.7 * q.k, r: 0.85 * S.EM.hero * q.k } : { x: 0, y: 0, r: 40 };
}
