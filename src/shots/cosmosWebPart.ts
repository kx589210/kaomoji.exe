// Renderer C of the cosmos as a whole (cosmos 5–6; build sheet notes/bcos/sheet.md §4.5–§4.6, §5, §6.5, §9): pure. Its look per
// output frame (the kit's cosmosLook, overridden only where the sheet gives a reason: the point's last frames print no halftone), its
// sub-frames (the score's, raised where its moves are faster than the house rule: the rack focus's lens), each sub-frame's point on the
// lens, and the faces its atlas cuts. Plain Node loads this file: no three / remotion / react imports.
import { CROWDS, DEFENDER_FACE, HERO_FACES, WEB_NODES, WINKS } from '../content/castCosmos.ts';
import type { RisoPrintLook } from '../engine/post/risoModel.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { lerp, smoothstep } from '../engine/math.ts';
import { HOPS, MATCH, POINT, RACK, SCAN, cs } from '../score/cosmos.ts';
import { cosmosLook, cosmosTemporal, stageAt } from './cosmosKit.ts';
import { HERO_DISGUISE, lensIndex, vogel } from './cosmosWeb.ts';

/** Every face renderer C draws whole (its atlas's keys): the web's named nodes and crowd, the winks, his forms, the Defender, the glints. */
export function cFaces(): string[] {
  return [
    ...new Set([
      ...Object.values(HERO_FACES),
      HERO_DISGUISE,
      DEFENDER_FACE,
      ...WEB_NODES.flatMap((n) => [n.host, n.infected ?? n.host]),
      ...CROWDS.web.flatMap((c) => [c.host, c.infected]),
      ...WINKS,
      '✦',
      '✧',
      '▽',
    ]),
  ];
}

/** The rack focus samples the lens: 48 sub-frames from the wall to its close, so the soft strands are smooth discs, not copies. */
export const RACK_SAMPLES = 48;

/** C's sub-frames at output frame `frame`: the score's (cosmosTemporal), raised to RACK_SAMPLES through the rack. */
export function cTemporal(frame: number): Temporal {
  const t = cosmosTemporal(frame);
  if (frame >= RACK.from && frame < RACK.to && t.samples < RACK_SAMPLES) return { ...t, samples: RACK_SAMPLES };
  return t;
}

/** The lens point (unit disc) of the sub-frame at instant `f`: the i-th of its output frame's samples sits at Vogel point lensIndex(i). */
export function lensPoint(f: number): { x: number; y: number } | null {
  const out = Math.round(f);
  if (out < RACK.from || out >= RACK.to) return null;
  const t = cTemporal(out);
  const open = out - t.shutter / 2;
  const i = Math.min(t.samples - 1, Math.max(0, Math.round(((f - open) / t.shutter) * t.samples - 0.5)));
  const [x, y] = vogel(lensIndex(i, t.samples), t.samples);
  return { x, y };
}

/**
 * C's look at output frame `frame`: the kit's (night print, the power dial 0.9 → 1, the bars' bloom, grain, vignette and aberration)
 * with C's own print (exposure 0.7, gamma 1.5, the neon's gains, the web's HDR carry, the bloom at 0.7), except:
 * - on the match cut (E15, 5.1 → 5.1e): the print comes in on cosmos 4.4's stage (the kit's `stageAt`: its ground and paper levels,
 *   its HDR carry — what makes B's band white-hot) and hands it to C's own night over the band's resolve, so the band prints as it did;
 * - on the point (the last three frames): the print is off — the night print turns black into unlit glass (#1C1A24 dots), and the club's
 *   contract is the void itself, #07060C, with one amber point and its glow (bloom kept, so the glow is the neon's).
 */
export function cLook(frame: number): Look {
  const look = cosmosLook(frame);
  if (frame >= POINT.from) return { ...look, riso: { ...look.riso!, amount: 0 }, grain: 0, vignette: 0 };
  const riso: RisoPrintLook = { ...look.riso!, neon: neonAt(frame), exposure: 0.7, gamma: 1.5 };
  const entry = stageAt(MATCH - 1);
  const u = smoothstep(MATCH, MATCH + ENTRY, frame);
  if (entry.levels && u < 1) riso.levels = { ...entry.levels, amount: (entry.levels.amount ?? 1) * (1 - u) };
  const hdr = Math.max(look.riso!.hdr ?? 0, lerp(entry.hdr ?? 0, webHdrAt(frame), u));
  if (hdr > 0) riso.hdr = hdr;
  return { ...look, bloom: { ...look.bloom, intensity: look.bloom.intensity * 0.7 }, riso };
}

/** How long (f) the match cut takes to hand 4.4's stage over to C's night: the band's resolve into the strand (5.1 → 5.1e). */
export const ENTRY = 6;
/**
 * The web's HDR carry (RisoPrint `hdr`): the lightning's white-hot cores are light far above the print's cap; carried through they burn
 * over the printed neon and the bloom makes their glow — the brightest thing on the frame for their 4 f (nothing else in the web is drawn
 * much above 1). Full from the first hop (5.1e) to the scan; out under the scan (everything is dead and dim there), so the relight and the
 * twist (E18: the web's last frame on the disc) print as the horizon does.
 */
export const WEB_HDR = 0.55;
export function webHdrAt(frame: number): number {
  if (frame < MATCH || frame >= cs(6)) return 0;
  return WEB_HDR * Math.min(smoothstep(MATCH, HOPS[0], frame), 1 - smoothstep(SCAN.from, SCAN.from + 6, frame));
}

/**
 * The light gets louder every bar (design §1): the tubes and lamps of the neon print burn hotter through renderer C's bars — 1.3 / 1.2
 * on the web, rising to 1.7 / 1.5 by the stutter's slice 4 on the horizon (the tubes' middles go white-hot) — so the last two bars are
 * the brightest of the cosmos without a single flash (the print caps its own output).
 */
export function neonAt(frame: number): { strokes: number; dots: number } {
  const u = Math.min(1, Math.max(0, (frame - cs(6)) / (POINT.from - 3 - cs(6))));
  return frame < cs(6) ? { strokes: 1.3, dots: 1.2 } : { strokes: 1.45 + 0.25 * u, dots: 1.3 + 0.2 * u };
}

/** Cosmos 6's first frame: where the web hands over to the horizon. */
export const HORIZON_FROM = cs(6);
