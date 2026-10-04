// The light grammar of renderer C's two bars (build sheet notes/bcos/sheet.md §4.7; design notes/cosmos3/final.md §3.1): pure.
// What each drum lights besides the picture's own events — the level downbeat's PASTE FLARE (a 6-ray starburst, an anamorphic streak,
// four Riso hexagon ghosts along the flare axis through the centre; cream and amber, never white) and the EAMES SQUARE closing on him and
// blinking twice; the clap's SHOCK RING (a thin ring carrying a rosette of halftone dots in the level's ink); the open hats' GLINTS
// (four-point ✦ on the light-catching specks, 6 f); the stutter's local neon crackles — and the horizon's own furniture in light: his ride
// on the disc, the Defender at his post, the stardust in the VOID corners, the spaghetti streaks across the horizon on the kicks.
// Shapes in screen px at 1080p (origin at the centre, y up); inks are the roles src/scenes/cosmosCWeb.ts maps to light.
import { clamp, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { EAMES, HORIZON, KICKS, MATCH, OPEN_HATS, PASTE_FLARES, ROLL, SCAN, SHOCK_RINGS, STUTTER, STUTTER_SLICES } from '../score/cosmos.ts';
import { HOLE, HOLE_OPEN_HATS, type HolePicture, projectDisc, spaghettiAt, stutterRingDots } from './cosmosHole.ts';
import { type Ink, type WebPicture, launchL, lastOf } from './cosmosWeb.ts';

/** A shape of light: its geometry (colour set by the scene from its ink and gain). */
export type LightShape = { shape: Omit<Shape, 'color'>; ink: Ink; gain: number };
/** A face or a ✦ in light. */
export type LightFace = { text: string; x: number; y: number; em: number; ink: Ink; glow: number; alpha: number; rot?: number };
export type Lights = { backing: Shape[]; faces: LightFace[]; shapes: LightShape[] };

const seg = (x0: number, y0: number, x1: number, y1: number, w: number, ink: Ink, gain: number, soft = 0): LightShape => ({
  shape: { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.hypot(x1 - x0, y1 - y0) + w, h: w, rot: Math.atan2(y1 - y0, x1 - x0), ...(soft > 0 ? { soft } : {}) },
  ink,
  gain,
});

/**
 * The paste flare `t` frames after its downbeat at anchor (x, y), scaled by `gain` (design §3.1): the starburst shrinks Ø 900 → 0 over
 * 12 f, the anamorphic streak (1600 px, a 10 px core; amber, or `streak`) and the four hexagon ghosts (amber, pink, cyan, pink
 * halftone) fade over 14 f.
 */
export function pasteFlare(t: number, x: number, y: number, gain: number, hole = 0, streak: Ink = 'amber'): LightShape[] {
  if (t < 0 || t >= 14) return [];
  const a = (1 - t / 14) * gain;
  const R = 450 * (1 - clamp(t / 12) ** 0.6);
  const out: LightShape[] = [];
  for (let i = 0; i < 6; i++) {
    const q = (i * Math.PI) / 3 + 0.3;
    if (R <= hole) continue;
    const x0 = x + hole * Math.cos(q);
    const y0 = y + hole * Math.sin(q);
    out.push(seg(x0, y0, x + R * Math.cos(q), y + R * Math.sin(q), 26, 'core', 0.22 * a, 12), seg(x0, y0, x + R * 0.8 * Math.cos(q), y + R * 0.8 * Math.sin(q), 5, 'core', 0.7 * a));
  }
  out.push(seg(x - 800, y, x + 800, y, 10, streak, 0.9 * a), seg(x - 800, y, x + 800, y, 40, streak, 0.22 * a, 18));
  if (hole <= 0) out.push({ shape: { kind: 'ellipse', x, y, w: 320, h: 320, soft: 150 }, ink: 'core', gain: 0.5 * a });
  const ghosts: [number, Ink][] = [[60, 'amber'], [110, 'pink'], [160, 'cyan'], [220, 'pink']];
  ghosts.forEach(([r, ink], i) => {
    const k = -0.4 - 0.45 * i;
    out.push({ shape: { kind: 'ellipse', x: x * k, y: y * k, w: 2 * r, h: 2 * r, tint: 0.45, screen: 9, angle: 0.4 + i }, ink, gain: 0.3 * a });
  });
  return out;
}

/** The Eames square closing on (x, y) (four L marks, 3 px, 40 px arms) to a size `s` around him, blinking twice after 10 f; 22 f long. */
export function eamesSquare(t: number, x: number, y: number, s: number): LightShape[] {
  if (t < 0 || t >= 22) return [];
  if (t >= 10 && Math.floor((t - 10) / 3) % 2 === 0) return [];
  const h = lerp(560, Math.max(40, s * 0.7), Math.min(1, launchL(t)));
  const w = h * 1.25;
  const out: LightShape[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x + sx * w;
    const py = y + sy * h;
    out.push(seg(px - sx * 40, py, px, py, 3, 'cream', 1.1), seg(px, py, px, py - sy * 40, 3, 'cream', 1.1));
  }
  return out;
}

/** The clap's shock ring at (x, y), `t` frames on: r 0 → 1300 in 10 f (L), a thin cream ring and a rosette of halftone dots in `ink`. */
export function shockRingFlat(t: number, x: number, y: number, ink: Ink): LightShape[] {
  if (t < 0 || t >= 12) return [];
  const r = 1300 * Math.min(1, launchL(t) * 1.05);
  const a = 1 - t / 12;
  const out: LightShape[] = [{ shape: { kind: 'ring', x, y, w: 2 * r, h: 2 * r, r: 2.5 }, ink: 'cream', gain: 0.55 * a }];
  const n = Math.min(240, Math.floor(r / 9));
  for (let i = 0; i < n; i++) {
    const q = (i / n) * Math.PI * 2;
    const d = 24 * Math.sin(i * 2.399);
    out.push({ shape: { kind: 'ellipse', x: x + (r - 12 + d) * Math.cos(q), y: y + (r - 12 + d) * Math.sin(q), w: 7, h: 7 }, ink, gain: 0.8 * a });
  }
  return out;
}

/** A four-point ✦ (a glint), as a face of the face atlas. */
export const glint = (x: number, y: number, size: number, a: number, rot = 0): LightFace => ({ text: '✦', x, y, em: size, ink: 'core', glow: 0.9 * a, alpha: 1, ...(rot ? { rot } : {}) });

// ——— The horizon's lights (cosmos 6) ——————————————————————————————————————————————————————————————————————————————————————————

/** Everything renderer C draws as flat light over the disc at output instant `f` (with its picture `pic`). */
export function holeLights(f: number, pic: HolePicture): Lights {
  const backing: Shape[] = [];
  const faces: LightFace[] = [];
  const shapes: LightShape[] = [];
  const cf = pic.cf;
  // Him, riding the disc inward (a dark backing so he reads over the bright gas), the bar's pulse on his kicks.
  if (pic.hero) {
    const h = pic.hero;
    backing.push({ kind: 'ellipse', x: h.x, y: h.y, w: h.em * 3.4, h: h.em * 1.9, color: [0.0022, 0.0018, 0.0045], alpha: 0.88, soft: h.em * 0.5 });
    shapes.push({ shape: { kind: 'ellipse', x: h.x, y: h.y, w: h.em * 3.6, h: h.em * 2.1, soft: h.em * 0.9 }, ink: 'amber', gain: 0.12 });
    // (His face itself is the overlay's: clean neon over the print, src/shots/cosmosWebOverlay.ts.)
  }
  // The Defender at his post over the arch: cream, calm (his red ring is the overlay's).
  if (pic.defender) {
    const d = pic.defender;
    backing.push({ kind: 'ellipse', x: d.x, y: d.y, w: d.em * 3.2, h: d.em * 1.7, color: [0.0022, 0.0018, 0.0045], alpha: 0.75 * d.alpha, soft: d.em * 0.5 });

  }
  // The stardust in the VOID the suck leaves.
  for (const s of pic.dust) {
    if (Math.hypot(s.x / 1.15, s.y / 0.7) < (pic.disc.rout * pic.cam.zoom) * 0.9 && pic.slice < 0) continue;
    shapes.push({ shape: { kind: 'ellipse', x: s.x, y: s.y, w: 3, h: 3 }, ink: s.cyan ? 'cyan' : 'cream', gain: 0.9 * s.a });
  }
  // The open hats' glints: ✦ on specks of the disc catching the light.
  const oh = lastOf(HOLE_OPEN_HATS, cf);
  if (oh > -Infinity && cf - oh < 6 && cf < STUTTER.from) {
    const a = 1 - (cf - oh) / 6;
    const n = 26 + Math.floor(20 * hash(oh, 1));
    for (let i = 0; i < n; i++) {
      const r = lerp(HOLE.photon * 1.6, Math.min(pic.disc.rout, 1500), hash(oh, i, 2) ** 0.7);
      const th = Math.PI * 2 * hash(oh, i, 3);
      const p = projectDisc(pic.cam, r * Math.cos(th), r * Math.sin(th));
      if (Math.abs(p.x) > 1000 || Math.abs(p.y) > 580) continue;
      faces.push(glint(p.x, p.y, 18 + 46 * hash(oh, i, 4), a, hash(oh, i, 5) < 0.5 ? Math.PI / 4 : 0));
    }
  }
  // The kicks' spaghettification: streams of the innermost light fall in along the flow (clockwise spirals), across the photon ring
  // into the void, each a bright head with a fading tail; the photon ring's amber pulse is the lensing pass's.
  const sp = pic.slice < 0 ? spaghettiAt(cf) : 0;
  if (sp > 0.01) {
    const k = lastOf(KICKS, cf);
    const u = clamp((cf - k) / 12);
    const streams = 12;
    for (let i = 0; i < streams; i++) {
      const th0 = Math.PI * 2 * ((i + hash(k, i, 7)) / streams);
      const r0 = HOLE.rin * (2.1 + 0.9 * hash(k, i, 8));
      const r1 = HOLE.shadow * 0.7;
      const turn = 1.1 + 0.6 * hash(k, i, 9);
      // The head runs from r0 to r1 over the 12 f; the tail trails 40 % of the path behind it.
      const head = Math.min(1, u * 1.25);
      const tail = Math.max(0, head - 0.4);
      let prev: { x: number; y: number } | null = null;
      for (let s = 0; s <= 8; s++) {
        const w = tail + ((head - tail) * s) / 8;
        const r = lerp(r0, r1, w * w);
        const th = th0 - turn * w;
        const p = projectDisc(pic.cam, r * Math.cos(th), r * Math.sin(th));
        if (prev) {
          const g = sp * (0.35 + 0.65 * (s / 8));
          shapes.push(seg(prev.x, prev.y, p.x, p.y, 2.6, 'amber', 1.6 * g), seg(prev.x, prev.y, p.x, p.y, 12, 'amber', 0.2 * g, 5));
        }
        prev = p;
      }
    }
  }
  // The level's downbeat: the paste flare (reduced: +0.15 in the central block) on the opening void and the Eames square on him.
  const flare = PASTE_FLARES.find((p) => p.at === HORIZON.at)!;
  // Its rays burst out round the opening void (they never cross it: no crosshair over the sandbox).
  shapes.push(...pasteFlare(cf - flare.at, 0, 0, flare.gain, HOLE.photon * 1.3 * pic.cam.zoom));
  if (pic.hero && EAMES.includes(HORIZON.at)) shapes.push(...eamesSquare(cf - HORIZON.at, pic.hero.x, pic.hero.y, pic.hero.em * 2.2));
  // The stutter: a neon crackle round the ring at each slice's start (local, 3 f).
  const slice = STUTTER_SLICES[pic.slice];
  if (slice && pic.slice < 5 && f - slice.at < 3) {
    const a = 1 - (f - slice.at) / 3;
    const R = (slice.r === 'point' ? 0 : slice.r) * 0.25 + 30;
    for (let i = 0; i < 10; i++) {
      const th = Math.PI * 2 * hash(slice.at, i, 11);
      const r0 = R * (0.8 + 0.5 * hash(slice.at, i, 12));
      const r1 = r0 + 18 + 30 * hash(slice.at, i, 13);
      shapes.push(seg(r0 * Math.cos(th), r0 * Math.sin(th), r1 * Math.cos(th + 0.2), r1 * Math.sin(th + 0.2), 2.5, i % 2 ? 'cyan' : 'amber', 1.6 * a));
    }
  }
  // Continuity plan v07 §2.3 (WP1): the club's Ben-Day rings pre-lapped into the stutter, a ring a cell (cosmosHole.ts stutterRingDots).
  if (!pic.point) for (const d of stutterRingDots(f)) shapes.push({ shape: { kind: 'ellipse', x: d.x, y: d.y, w: d.d, h: d.d }, ink: 'cream', gain: 1.1 });
  return { backing, faces, shapes };
}

// ——— The web's lights (cosmos 5) ———————————————————————————————————————————————————————————————————————————————————————————————

/** The open hats' glints on the web, as a share of a glint's light elsewhere (they land with the hops' arcs, which outshine them). */
export const WEB_GLINT = 0.65;

/** Everything renderer C draws as flat light over the web at instant `f`: the match cut's paste flare and Eames square on his node, the
 * roll's shock ring (pink) from him, the open hats' glints on the lit faces. */
export function webLights(f: number, pic: WebPicture): Lights {
  const shapes: LightShape[] = [];
  const faces: LightFace[] = [];
  const h = pic.hero;
  const flare = PASTE_FLARES.find((p) => p.at === MATCH)!;
  // The flare's streak is the match: it runs through his node, level with the band, in the band's own light (BAND_INK, his cream-amber),
  // so the band B hands over keeps its colour through the cut instead of tinting amber under the streak.
  shapes.push(...pasteFlare(f - flare.at, h ? h.x : 0, h ? h.y : 0, flare.gain, 0, 'band'));
  if (h && EAMES.includes(MATCH)) shapes.push(...eamesSquare(f - MATCH, h.x, h.y, h.em * 2.4));
  const ring = SHOCK_RINGS.find((s) => s.at === ROLL.at)!;
  if (h) shapes.push(...shockRingFlat(f - ring.at, h.x, h.y, ring.ink));
  const oh = lastOf(OPEN_HATS, f);
  if (oh >= MATCH && f - oh < 6 && f < SCAN.from) {
    // Under the arcs' light (the &s are hops too): the lightning is the brightest thing on the frame.
    const a = WEB_GLINT * (1 - (f - oh) / 6);
    const lit = pic.faces.filter((x) => x.role === 'infected' || x.role === 'wink');
    const n = Math.min(lit.length, 24 + Math.floor(20 * hash(oh, 1)));
    for (let i = 0; i < n; i++) {
      const x = lit[Math.floor(hash(oh, i, 3) * lit.length)];
      faces.push(glint(x.x + x.em * 0.9 * (hash(oh, i, 4) - 0.5), x.y + x.em * 0.5 * (hash(oh, i, 5) - 0.5), 16 + 40 * hash(oh, i, 6), a, hash(oh, i, 7) < 0.5 ? Math.PI / 4 : 0));
    }
  }
  return { backing: [], faces, shapes };
}
