// The comic club "INK"'s dispatcher, pure: which part draws each instant (src/score/club.ts INK_PARTS), how each output frame is
// photographed (its part's sub-frames inside the club's segments) and finished (its part's look), the glass beat (the v04 glass, re-keyed
// to the club's hit with v04's own draws), and the club's camera energy for the KX-ClubInk preview (the rig over CLUB_ACCENTS; the film's
// src/score/energy.ts takes the same list when the club goes live). src/scenes/clubInk.ts is its GPU half. Build sheet
// notes/b58/club-sheet.md §9. Plain Node loads this file: no three / remotion / react imports.
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { type View, covered } from '../engine/view.ts';
import { flash, punch, shake } from '../motion/hit.ts';
import { CLUB, CLUB_ACCENTS, HIT, INK_PARTS, SEGMENTS, clubRigInstant } from '../score/club.ts';
import { seedFrame } from '../score/film.ts';
import { BAR } from './clubInkBar.ts';
import { FLIGHT } from './clubInkFlight.ts';
import { INCIDENT } from './clubInkIncident.ts';
import type { InkPart } from './clubInkKit.ts';
import { LENS_PART } from './clubInkLens.ts';
import { RECORD_PART } from './clubInkRecord.ts';
import { SPLASH } from './clubInkSplash.ts';
import { GLASS, clubTemporal } from './glass.ts';
import { CLUB_BLOOM } from './lines.ts';

export type InkPartId = (typeof INK_PARTS)[number]['id'];

/** The parts by id; the glass is the v04 code path (drawn by the scene from src/shots/glass.ts), not a part. */
export const PARTS: Readonly<Record<Exclude<InkPartId, 'glass'>, InkPart>> = { splash: SPLASH, record: RECORD_PART, bar: BAR, lens: LENS_PART, incident: INCIDENT, flight: FLIGHT };

/** The part that draws instant `f` (a sub-frame instant routes by itself; instants outside the club clamp to its first or last part). */
export function inkPartAt(f: number): InkPartId {
  for (const p of INK_PARTS) if (f >= p.from && f < p.to) return p.id;
  return f < CLUB.from ? INK_PARTS[0].id : INK_PARTS[INK_PARTS.length - 1].id;
}

/** The segment that holds output frame `frame`: sub-frames never cross the club's cuts (src/score/club.ts SEGMENTS). */
export function inkSegment(frame: number): Segment {
  for (const [from, to] of SEGMENTS) if (frame >= from && frame < to) return { from, to };
  return frame < CLUB.from ? { from: SEGMENTS[0][0], to: SEGMENTS[0][1] } : { from: SEGMENTS[SEGMENTS.length - 1][0], to: SEGMENTS[SEGMENTS.length - 1][1] };
}

// ——— The glass beat (club 6.4 → break 1.1): v04's 1896–1919, unchanged ——————————————————————————————————————————————————————————

/**
 * The instant of the v04 glass code path (src/shots/glass.ts glassFrame, clubTemporal) that the club's glass shows at instant `f`: the
 * same time after the hit (GLASS.hit, the v04 club's, still drawn by the film today), and so the same jitter draws, which glass.ts seeds by
 * seedFrame of that instant — v04's 1896 + k for the club's HIT + k, whatever the map (both move with the club). If src/shots/glass.ts is
 * ever re-keyed onto the club's hit, this offset becomes 0 and glass.ts must seed its jitter as old 1896 + (f − HIT) (tests/clubInk.test.ts).
 */
export const glassInstant = (f: number): number => f - (HIT - GLASS.hit);
/** The glass's finishing: the club neon look, exactly v04's (src/scenes/club.ts look()). */
export const GLASS_LOOK: Look = { toneMapping: 'linear', exposure: 1, bloom: CLUB_BLOOM, aberration: 0, grain: 0.05, vignette: 0.22 };

// ——— Photography and finishing per output frame ————————————————————————————————————————————————————————————————————————————

/** Sub-frames of output frame `frame`: its part's (the glass: v04's 96 @ 0.5 on the hit's first 5 frames, then 24 @ 0.5). */
export function inkTemporal(frame: number): Temporal {
  const id = inkPartAt(frame);
  return id === 'glass' ? clubTemporal(glassInstant(frame)) : PARTS[id].temporal(frame);
}

/** The look of output frame `frame`: its part's (printed; the lens unprinted; the glass the club neon). */
export function inkLookAt(frame: number): Look {
  const id = inkPartAt(frame);
  return id === 'glass' ? GLASS_LOOK : PARTS[id].look(frame);
}

// ——— The camera energy (for KX-ClubInk now; src/score/energy.ts merges CLUB_ACCENTS when the club goes live) ————————————————————————

const SHAKE_PX = 16;
const SHAKE_ROLL = 0.006;

/** The club's screen-space rig at instant `at`, exactly as energy.ts rigAt over CLUB_ACCENTS (each shake seeded by its `seed`, else seedFrame(at)). */
export function inkRigAt(at: number): View {
  let zoom = 1;
  let x = 0;
  let y = 0;
  let roll = 0;
  for (const a of CLUB_ACCENTS) {
    if ((a.punch ?? 0) > 0 && at > a.at && at < a.at + 14) zoom += a.punch! * punch(at, a.at);
    const s = a.shake ?? 0;
    if (s <= 0 || at <= a.at || at >= a.at + 16 || at >= (a.until ?? Infinity)) continue;
    const [sx, sy, sr] = shake(at, a.at, a.seed ?? seedFrame(a.at));
    x += s * SHAKE_PX * sx;
    y += s * SHAKE_PX * sy;
    roll += s * SHAKE_ROLL * sr;
  }
  return covered({ zoom, x, y, roll });
}

/** How white output frame `frame` flashes from the club's accents: never (the glass makes its own smack). */
export const inkFlashAt = (frame: number): number => CLUB_ACCENTS.reduce((m, a) => ((a.flash ?? 0) > 0 ? Math.max(m, a.flash! * flash(frame, a.at)) : m), 0);

/**
 * The preview's energy (src/director.ts Energy): the rig and the flashes, no character flash (drop 1 never flashes). The rig is taken at the
 * output frame before the hit (clubRigInstant, as the film's ENERGY), per instant on the glass beat.
 */
export const INK_ENERGY = { view: (at: number): View => inkRigAt(clubRigInstant(at)), flash: inkFlashAt };
