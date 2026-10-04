// Renderer B's light grammar (cosmos 3.1 → 5.1; build sheet notes/bcos/sheet.md §4.7, design notes/cosmos3/final.md §3.1, the
// timing in src/shots/cosmosSolarKit.ts), drawn as HOT light in the screen overlay — after the Riso pass and before the bloom, so it
// burns past the printed paper instead of being printed down to it: the level downbeat's PASTE FLARE (a 6-ray starburst Ø 900 → 0 over
// 12 f round a white-hot heart, an anamorphic streak, four Riso hexagon lens ghosts along the flare's axis through the centre; cream and
// amber, the heart white-hot), the clap's SHOCK RING (a thin hot ring carrying a rosette of halftone dots in the level's ink, r 0 → 1,300
// in 10 f), the open hat's GLINTS (24–60 four-point ✦, 20–70 px, HDR), the 16th's SPARKS (a 3-frame ✧ on each newly infected face), the
// EAMES square closing on him and blinking twice, and the slingshot burst (3.3, reserved). `Pen` draws into a SegField under the rig's
// view (the energy's punches), each sample at its share of the output frame.
import { type RGB, linear } from '../engine/color.ts';
import { hash } from '../engine/random.ts';
import { IDENTITY_VIEW, type View } from '../engine/view.ts';
import { eamesAt, glintAt, pasteFlareAt, shockRingAt, slingBurstAt } from '../shots/cosmosSolarKit.ts';
import type { SegField } from './cosmosBFields.ts';

export const CREAM = linear('#FFE2B4');
export const AMBER = linear('#FFB23E');
export const HOT = linear('#FFE9C0');
/**
 * The white-hot heart of a flare and the jets' centre line (not the galaxy's core or the tilt's streak: those burn amber-cream). The finish's hue clamp keeps every HDR colour's hue (an HDR cream stays
 * cream, luma ≈ 228), so only a neutral white reaches the frame's top luma; this one is a touch cool, drawn far above 1, so the warm light
 * round it (its own bloom, the cream and amber glows) sums to white-hot in its middle instead of tinting it.
 */
export const WHITE_HOT: RGB = [1, 1.01, 1.04];
const INKS: Readonly<Record<'pink' | 'cyan' | 'amber', RGB>> = { pink: linear('#FF48B0'), cyan: linear('#3FE0FF'), amber: AMBER };
/** The hexagon ghosts' inks (the Riso's Y, P, B) and radii (px), at shares of the way from the flare through the frame centre and beyond. */
const GHOSTS: readonly { ink: RGB; r: number; at: number }[] = [
  { ink: linear('#FFE800'), r: 60, at: 1.35 },
  { ink: linear('#FF48B0'), r: 110, at: 1.75 },
  { ink: linear('#0078BF'), r: 160, at: 2.2 },
  { ink: linear('#FFE800'), r: 220, at: 2.75 },
];
export const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/**
 * Draws light into a SegField through the rig's view (the picture's screen-space punch at this instant: zoom about the centre, roll, move),
 * every stroke at `weight` (its sample's share of the output frame).
 */
export class Pen {
  field!: SegField;
  private c = 1;
  private s = 0;
  private z = 1;
  private tx = 0;
  private ty = 0;
  weight = 1;

  to(field: SegField, view: View = IDENTITY_VIEW, weight = 1): this {
    this.field = field;
    this.z = view.zoom;
    this.c = Math.cos(view.roll) * view.zoom;
    this.s = Math.sin(view.roll) * view.zoom;
    this.tx = view.x;
    this.ty = view.y;
    this.weight = weight;
    return this;
  }

  seg(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, color: RGB, a = 1): void {
    const { c, s } = this;
    this.field.push(c * x0 - s * y0 + this.tx, s * x0 + c * y0 + this.ty, c * x1 - s * y1 + this.tx, s * x1 + c * y1 + this.ty, w0 * this.z, w1 * this.z, color, a * this.weight);
  }

  dot(x: number, y: number, r: number, color: RGB, a = 1): void {
    this.seg(x, y, x, y, r, r, color, a);
  }

  /** A four-point star ✦ of light, `l` px from the centre to each tip. */
  star4(x: number, y: number, l: number, ink: RGB, a: number, thin = 0.06): void {
    this.seg(x - l, y, x + l, y, l * thin, l * thin, ink, a);
    this.seg(x, y - l, x, y + l, l * thin, l * thin, ink, a);
    this.dot(x, y, l * 0.16, ink, 0.6 * a);
  }

  /** A polygon's (or circle's) outline of light: `n` sides, radius r, turned by `rot`. */
  ring(x: number, y: number, r: number, n: number, w: number, ink: RGB, a: number, rot = 0): void {
    for (let k = 0; k < n; k++) {
      const a0 = rot + (k * 2 * Math.PI) / n;
      const a1 = rot + ((k + 1) * 2 * Math.PI) / n;
      this.seg(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, w, w, ink, a);
    }
  }
}

/** Where the light lands at an output frame: the SUBJECT (its centre and size, px) and the points that catch glints and sparks. */
export type LightInput = { subject: { x: number; y: number; r: number }; glints: readonly (readonly [number, number])[]; sparks: readonly (readonly [number, number])[] };

/** The grammar's light on output frame `frame` (the flare, the ring, glints, sparks, the Eames square), through `pen`. */
export function drawGrammar(pen: Pen, frame: number, input: LightInput, heart?: Pen): void {
  const { x, y, r } = input.subject;

  // The paste flare: a white-hot heart, the cream starburst, the amber anamorphic streak, the hexagon ghosts.
  const flare = pasteFlareAt(frame);
  if (flare) {
    const R = flare.d / 2;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.26;
      pen.seg(x, y, x + Math.cos(a) * R, y + Math.sin(a) * R, 9, 0.6, scale(CREAM, 2.2), flare.a);
      pen.seg(x, y, x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.85, 34, 4, CREAM, 0.16 * flare.a);
    }
    // The heart: a white-hot plateau ≈ 300 px across on the hit (no halo of its own: `heart` draws it), shrinking fast with the burst; a
    // soft cream glow round it.
    (heart ?? pen).dot(x, y, (40 + 140 * flare.a ** 2) / 0.58, scale(WHITE_HOT, 14), flare.a);
    pen.dot(x, y, 200 + 0.3 * R, CREAM, 0.35 * flare.a);
    pen.seg(x - 820, y, x + 820, y, 6, 6, scale(AMBER, 2.4), flare.a);
    pen.seg(x - 820, y, x + 820, y, 26, 26, AMBER, 0.16 * flare.a);
    // Along the axis from the flare through the centre and beyond (a flare on the centre throws them down and to the left).
    const d = Math.hypot(x, y);
    const [ux, uy] = d > 40 ? [-x / d, -y / d] : [-0.62, -0.78];
    const reach = Math.max(d, 300);
    for (const g of GHOSTS) {
      const gx = x + ux * reach * g.at;
      const gy = y + uy * reach * g.at;
      pen.ring(gx, gy, g.r, 6, 2.6, scale(g.ink, 1.3), 0.7 * flare.a, Math.PI / 6);
      pen.dot(gx, gy, g.r * 0.85, g.ink, 0.1 * flare.a);
    }
  }

  // The clap's shock ring: a thin hot ring and a rosette of halftone dots in the level's ink racing out from the subject.
  const ring = shockRingAt(frame);
  if (ring && ring.a > 0) {
    const ink = INKS[ring.ink];
    pen.ring(x, y, ring.r, 120, 2.2, scale(HOT, 1.6), ring.a);
    const n = 120;
    for (let k = 0; k < n; k++) {
      const a = (k * 2 * Math.PI) / n;
      const wob = 1 + 0.04 * Math.sin(a * 6 + ring.at);
      pen.dot(x + Math.cos(a) * ring.r * wob * 0.97, y + Math.sin(a) * ring.r * wob * 0.97, 4 + 2.5 * (k % 2), scale(ink, 1.6), 0.9 * ring.a);
      pen.dot(x + Math.cos(a + 0.026) * ring.r * 0.91, y + Math.sin(a + 0.026) * ring.r * 0.91, 2.5, ink, 0.7 * ring.a);
    }
  }

  // The open hat's glints on the light-catching points: 24–60 of them, 20–70 px tip to tip, HDR, 6 f.
  const glint = glintAt(frame);
  if (glint.a > 0 && input.glints.length > 0) {
    // Each a crisp HDR ✦ with thin arms (its light < 0.5 % of a block: a sparkle, never a flash of the block).
    const n = Math.min(40, Math.max(24, input.glints.length));
    for (let i = 0; i < n; i++) {
      const k = Math.floor(hash(i, glint.at, 3) * input.glints.length);
      const [gx, gy] = input.glints[k];
      pen.star4(gx, gy, 10 + 25 * hash(i, glint.at, 4), scale(HOT, 2.2), glint.a, 0.045);
    }
  }
  // The 16th's sparks on the newly infected faces.
  for (const [sx, sy] of input.sparks) pen.star4(sx, sy, 18, scale(AMBER, 2.5), 1, 0.08);

  // The Eames square closing on him (four cream L marks, 3 px, 40 px arms) and blinking twice.
  const eames = eamesAt(frame);
  if (eames && eames.on) {
    const h = Math.max(40, r * 1.25) * eames.scale;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const cx = x + sx * h;
      const cy = y + sy * h;
      pen.seg(cx, cy, cx - sx * 40, cy, 1.6, 1.6, scale(CREAM, 1.6), 1);
      pen.seg(cx, cy, cx, cy - sy * 40, 1.6, 1.6, scale(CREAM, 1.6), 1);
    }
  }
}

/**
 * The slingshot burst (reserved; slingBurstAt) on whole output frames — whole on the kick's frame through the 6-frame shutter: a second
 * corona of sixteen long amber rays shooting out round the Sun as it turns into him, a ring of light at its limb and one thrown out from
 * it, and a glow, fading over 10 f. `sun` is the Sun on screen (px).
 */
export function drawSlingBurst(pen: Pen, frame: number, sun: { x: number; y: number; r: number }): void {
  const b = slingBurstAt(frame);
  if (!b) return;
  const { x, y, r } = sun;
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12 + 0.1;
    const l = r * (1.9 + 1.8 * hash(k, 51)) * b.reach;
    pen.seg(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, x + Math.cos(a) * l, y + Math.sin(a) * l, 22, 1, scale(AMBER, 2.2), b.a);
    pen.seg(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, x + Math.cos(a) * l * 0.85, y + Math.sin(a) * l * 0.85, 3.5, 0.6, scale(HOT, 2.6), b.a);
  }
  // The limb's ring of white-hot light, one thrown out from it, and the corona's glow: the burst (reserved), whole on the kick.
  const thrown = 1.08 + 0.9 * (1 - b.a ** 0.5);
  pen.ring(x, y, r * 1.04, 96, 6, scale(HOT, 3), b.a);
  pen.ring(x, y, r * thrown, 96, 7, scale(AMBER, 2), 0.8 * b.a);
  pen.dot(x, y, r * 2.4, AMBER, 0.6 * b.a);
}
