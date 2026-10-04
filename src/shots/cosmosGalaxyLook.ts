// Renderer B's finishing (cosmos 3.1 → 5.1; build sheet notes/bcos/sheet.md §5, §9.2–§9.3): the look of every output frame (the
// cosmos's night Riso print with the power dial, cosmosKit cosmosLook), its sub-frames (the score's SUBFRAMES, raised where its moves
// are faster than the house rule), and the instants its HOT light is drawn at (`hotSamples`): the light the print must not dim — the
// spirograph, the flares, his wake, the bulge, the jets, the streak — is drawn in the screen overlay, after the Riso pass and before the
// bloom, so it burns past the paper; the overlay samples the output frame's own shutter itself, so that light is motion-blurred with the
// picture under it. Pure.
import { type Segment, type Temporal, temporalSamples } from '../engine/temporal.ts';
import { type Look, type Quality, mixLook } from '../engine/types.ts';
import { DIVE, DUST, FLING, LAP, REVEAL, SLINGSHOT, SLOWMO, cosmosSegment } from '../score/cosmos.ts';
import { cosmosLook, cosmosTemporal } from './cosmosKit.ts';
import { TILT_LAND } from './cosmosGalaxy.ts';
import { cLook } from './cosmosWebPart.ts';

/**
 * The look of output frame `frame` on bars 3–4: the cosmos's (the night print, the power dial, the bars' bloom). The neon power-up (4.3,
 * reserved) is light, not exposure: the hot overlay's coloured glow round the core and the ignition's tubes (an exposure bump would lift
 * the printed room with it, the opposite of neon in the dark). E15 (BC1): as the tilt lands the look hands over to renderer C's entry
 * look (src/shots/cosmosWebPart.ts cLook, the one its 5.1 prints the band with), so the band B draws to C's profile on its last frames is
 * printed exactly as C's is on the other side of the cut. The spiral (from the snap's first in-between frame) keeps the bar's bloom but
 * a shorter reach (SPIRAL_BLOOM_RADIUS).
 */
export function bLook(frame: number): Look {
  const u = Math.min(1, Math.max(0, (frame - (TILT_LAND - 4)) / 4));
  if (u <= 0) return spiralLook(frame);
  if (u >= 1) return cLook(frame);
  return mixLook(spiralLook(frame), cLook(frame), u * u * (3 - 2 * u));
}

/**
 * The bloom's reach on the spiral (4.3 − 3 → the hand-over; round 2, b-galaxy-ignition-white-milky): its mip chain's radius 0.42, not
 * the cosmos's 0.75. The ignition lights thousands of px of HDR tube (and the jets), and at the full reach their summed glow veils the
 * whole frame — the space between the arms went milky (darkest 15 % at 22–27 luma with no white core at all; 17–18 at 0.5 under the
 * jets). At 0.42 the tubes keep a tight neon glow and the ground stays the stage's (darkest 15 % ≤ 15 luma, as on bars 1–3).
 * Intensity and knee stay the bar's (design §8: 0.85 → 1.0). The change lands inside the snap (E14, an impact), where the frame is
 * one streak.
 */
export const SPIRAL_BLOOM_RADIUS = 0.42;
export function spiralLook(frame: number): Look {
  const look = cosmosLook(frame);
  return frame >= REVEAL - 3 ? { ...look, bloom: { ...look.bloom, radius: SPIRAL_BLOOM_RADIUS } } : look;
}

/**
 * The sub-frames of output frame `frame` on bars 3–4: the score's, but the snap's three in-between frames (REVEAL − 3 … − 1) keep their
 * 64 samples on a shorter shutter (0.2 f): the camera crosses a factor of ten in scale within one frame there, and a half-frame shutter
 * averages the arm, his stretch and the disc into one grey smear; at 0.2 each frame keeps its scale legible, still streaked. After the
 * slingshot's peak the 6-frame shutter closes to 0.5 by the slow-mo (`exitShutter`).
 */
export function bTemporal(frame: number): Temporal {
  let t = cosmosTemporal(frame);
  if (frame >= REVEAL - 3 && frame < REVEAL) return { ...t, samples: Math.max(t.samples, 64), shutter: 0.2 };
  if (frame > SLINGSHOT && frame < LAP.at) t = { ...t, shutter: Math.min(t.shutter, exitShutter(frame)) };
  // Faster than the house rule's 20 px a frame (sheet §5): the dive's second half before the slingshot's window, the lap's eve and tail
  // and the dust punch's bank — at least 48 / 32 sub-frames.
  if (frame >= DIVE.from + 6 && frame < SLINGSHOT - 9) t = { ...t, samples: Math.max(t.samples, 48) };
  if ((frame >= LAP.at - 1 && frame < FLING.from) || (frame >= DUST.punch - 1 && frame < DUST.punch + 9)) t = { ...t, samples: Math.max(t.samples, 32) };
  return t;
}

/**
 * The slow-mo exit's shutter (SLINGSHOT → SLOWMO.from): the whip's 6 f closing to the house 0.5 f, eased, then held to the lap. The
 * spirograph itself is the trails' geometry (their past camera), so it holds; what the long shutter would add after the peak is the
 * near rings' own spin and the exit's rise smeared into mud over the Sun — the design's "ribbons decompress into readable rings of type".
 */
export function exitShutter(frame: number): number {
  const u = Math.min(1, Math.max(0, (frame - SLINGSHOT) / (SLOWMO.from - SLINGSHOT)));
  return 6 - 5.5 * (0.5 - 0.5 * Math.cos(Math.PI * u));
}

/** An instant the hot light is drawn at: the film instant, its share of the output frame, the instant its camera rig is taken at. */
export type HotSample = { frame: number; weight: number; cam: number };
/**
 * The instants the hot overlay draws output frame `frame` at: the picture's own sub-frames (bTemporal through the score's segments; one
 * sample in a draft), thinned evenly to at most `max` (the light's geometry is cheap but its trails are long), the weights summing to 1.
 */
export function hotSamples(frame: number, quality: Quality, max = 12, segment: Segment = cosmosSegment(frame)): HotSample[] {
  if (quality !== 'final') return [{ frame, weight: 1, cam: frame }];
  const all = temporalSamples(frame, bTemporal(frame), segment);
  if (all.length <= max) return all.map((s) => ({ frame: s.frame, weight: s.weight, cam: s.cam }));
  return Array.from({ length: max }, (_, i) => {
    const s = all[Math.min(all.length - 1, Math.round(((i + 0.5) * all.length) / max - 0.5))];
    return { frame: s.frame, weight: 1 / max, cam: s.cam };
  });
}
