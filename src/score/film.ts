// The film's map: its parts in order and how many bars each one lasts. Every
// frame of kaomoji.exe is placed relative to the part it belongs to —
// partFrame('break', 2, 0.5) is the break's bar 2, the & of beat 1 — so bars
// can be inserted between (or added to) parts by editing FILM alone: every
// later part, and everything placed in it, moves with it.
//
// Positions: `bar` is 1-based inside the part (bar parts.bars + 1, beat 0, is the
// part's end = the next part's first frame); `beat` is 0-based and may be
// fractional, exactly as in barFrame (src/score/grid.ts), whose arithmetic
// partFrame uses on the part's film bar. A position outside its part throws.
// The film's sections (intro, build = swiss + riso, transition, drop1 = cosmos
// + bridgeA + club, break, drop2, bridgeB, outro) are derived from FILM in src/score/shots.ts.
//
// A part that grew keeps what it had in its first bars (its `built` bars: every
// position written from its start stays) and holds its last built frame over
// the new bars at its end, its tail, until they are built: builtEnd() is where
// its content ends, partTail() the held bars (src/scenes/hold.ts draws them,
// heldFrame() says which instant they show). A builder who fills the tail
// raises (or removes) `built`, and the hold is gone.
//
// A stub (`stub: true`, the v08 bridges) is a part inserted between two built
// parts and not built yet: its picture and camera hold the last built frame of
// the part before it (heldFrame, STUBS), nothing of its own is drawn or heard
// in it (isHeld: no drums, no events), and, unlike a held tail, it is NOT
// gated to silence: whatever the parts around it ring or pre-lap into it is
// heard (scripts/audio/sections/bridgeA.mjs, bridgeB.mjs). A builder who
// builds it removes `stub` (output/qa/v08/MAP-CONTRACT.md).
//
// Random draws (a shake, a spark, the film grain) are seeded by seedFrame():
// the frame's place on the map they were approved on, so inserting or growing
// parts never re-rolls an approved picture or sound.
// tests/filmMap.test.ts pins today's map; tests/film.test.ts the rules.
// Plain Node loads this file: erasable TypeScript only, no three / remotion /
// react imports.
import { BEATS_PER_BAR, FRAMES_PER_BAR, FRAMES_PER_BEAT, barFrame } from './grid.ts';

export type PartId = 'intro' | 'swiss' | 'riso' | 'transition' | 'cosmos' | 'bridgeA' | 'club' | 'break' | 'drop2' | 'bridgeB' | 'outro';
/**
 * A part: `bars` long; when its last bars are not built yet, only its first `built` bars have content (the rest hold). A `stub` is not
 * built at all: it holds the last built frame of the part before it (STUBS).
 */
export type Part = { readonly id: PartId; readonly bars: number; readonly built?: number; readonly stub?: true };

/**
 * The parts of the film, in order (63 bars: the story bible docs/2026-10-01-virus-story.md, 新结构, with bars 1–12 grown to 1–14 by the
 * bars 1–14 design: the intro's RAIN bar and the Swiss SCAN bar, each inserted INSIDE its part — see SEED_NEW_BARS; the outro grown to
 * 5 bars (U5, the 61-bar map); and v08's two bridges inserted BETWEEN parts, a bar each (the v07 review, 10-03: the cosmos turned into the comic too fast,
 * and the transition into the ending was too short; output/qa/v08/MAP-CONTRACT.md): bridgeA after the cosmos, bridgeB after drop 2).
 */
export const FILM: readonly Part[] = [
  { id: 'intro', bars: 5 }, // S01 boot · S02R the RAIN bar (new, intro 2) · S02 highway · S03 typing · S04 ASCII face; T1 into the Swiss world
  { id: 'swiss', bars: 5 }, // S05 the lens · S06 split · S07 glass · S07B the SCAN bar (new, swiss 4) · S08 infection; T2 (the tile flip) in its last two beats
  { id: 'riso', bars: 4 }, // S09–S12: the Riso print; sucked into the sun
  { id: 'transition', bars: 2 }, // X01: plates → star gate → the sun collapses → the held breath (a near-black stub until built)
  { id: 'cosmos', bars: 6 }, // S13–S16, S16W, S16H: drop 1's Big Bang, Powers of Ten out to the galaxy, the lightning web and the event horizon (built through, 2026-10-02: notes/bcos/sheet.md)
  { id: 'bridgeA', bars: 1 }, // X02 (v08): the cosmos → the comic club, one bar (+1.6 s) so the event horizon's amber point becomes the club's eye without a rush; built (src/score/bridgeA.ts): the breath that prints the club round his eye
  { id: 'club', bars: 6 }, // C1–C6: the comic club INK (notes/b58/club-sheet.md): the dot inks, the page, the record, the bar, SPLASH!, out of the page into the v04 glass
  { id: 'break', bars: 8 }, // S21–S25 FALL IRIS LOOP STEPS WHOLE; S26G GRAPH (new, break 6); S26S SLING; S26 FAKE DROP (notes/bid2/break-sheet2.md)
  { id: 'drop2', bars: 20 }, // drop 2, THE VIRUS WAR (notes/bid2/drop2-sheet2.md): S27–S32 kept and moved; new bars 5, 8–17, 20, all built (bar 8, S31K KERNEL: round 1, 2026-10-02)
  { id: 'bridgeB', bars: 1 }, // X03 (v08): the bullet time → the blue screen, one bar (+1.6 s) so the crash lands instead of cutting off; built (src/score/bridgeB.ts): the crash takes time — the camera runs down, the picture comes apart a stage a beat, the blue gathers in him
  { id: 'outro', bars: 5 }, // the ending, built through (notes/b58/ending-sheet.md r4): blue screen, monitor, iris, the curtain call, the bows → cursor (U5: 4 → 5 bars)
];

export const TOTAL_BARS = FILM.reduce((n, p) => n + p.bars, 0);
export const TOTAL_FRAMES = TOTAL_BARS * FRAMES_PER_BAR;

/** First film bar of each part. */
const FIRST_BAR: ReadonlyMap<PartId, number> = (() => {
  const m = new Map<PartId, number>();
  let bar = 1;
  for (const p of FILM) {
    if (p.built !== undefined && !(Number.isInteger(p.built) && p.built >= 1 && p.built <= p.bars)) throw new RangeError(`film.ts: ${p.id} is built for ${p.built} of its ${p.bars} bars (1–${p.bars})`);
    if (p.stub && (p.built !== undefined || p === FILM[0])) throw new RangeError(`film.ts: ${p.id} is a stub, so it holds the part before it: it cannot be the first part or be built for some bars`);
    m.set(p.id, bar);
    bar += p.bars;
  }
  return m;
})();

function partOf(id: PartId): Part {
  const p = FILM.find((x) => x.id === id);
  if (!p) throw new RangeError(`film.ts: there is no part '${String(id)}' (parts: ${FILM.map((x) => x.id).join(', ')})`);
  return p;
}

/** The film bar (1-based) of the part's `bar` (1-based; `bars + 1` is the bar after the part). */
export function partBar(id: PartId, bar = 1): number {
  const p = partOf(id);
  if (!Number.isInteger(bar) || bar < 1 || bar > p.bars + 1) throw new RangeError(`film.ts: ${id} has bars 1–${p.bars} (and ${p.bars + 1}, its end); got bar ${bar}`);
  return FIRST_BAR.get(id)! + bar - 1;
}

/** The film bars of a part, in order (for loops that walk a part bar by bar). */
export const partBars = (id: PartId): number[] => Array.from({ length: partOf(id).bars }, (_, i) => partBar(id, 1 + i));

/** The frame of the part's `bar` (1-based), plus `beat` beats (0-based, may be fractional, 0–4): barFrame on the part's film bar. */
export function partFrame(id: PartId, bar: number, beat = 0): number {
  const p = partOf(id);
  const filmBar = partBar(id, bar);
  if (!(beat >= 0 && beat <= BEATS_PER_BAR) || (bar === p.bars + 1 && beat !== 0)) throw new RangeError(`film.ts: ${id} bar ${bar}, beat ${beat} lies outside ${id}`);
  return barFrame(filmBar, beat);
}

/** The part's first frame. */
export const partStart = (id: PartId): number => partFrame(id, 1);

/** The frame after the part's last (exclusive end): the next part's first frame, or TOTAL_FRAMES. */
export const partEnd = (id: PartId): number => partFrame(id, partOf(id).bars + 1);

/**
 * Where `frame` sits: its part, the part-local bar (1-based) and the beat inside that bar (0-based, fractional), so that
 * partFrame(id, bar, beat) gives `frame` back. Frames before the film count back from the first part (bar 0, −1 …), frames after it
 * on from the last part (bar `bars + 1` …).
 */
export function locate(frame: number): { id: PartId; bar: number; beat: number } {
  let part = FILM[0];
  for (const p of FILM) if (frame >= barFrame(FIRST_BAR.get(p.id)!)) part = p;
  const start = barFrame(FIRST_BAR.get(part.id)!);
  const bar = Math.floor((frame - start) / FRAMES_PER_BAR) + 1;
  return { id: part.id, bar, beat: (frame - start - (bar - 1) * FRAMES_PER_BAR) / FRAMES_PER_BEAT };
}

// ——— Built bars and held tails ——————————————————————————————————————————————————————————————————————————————————————————————————

/** How many of the part's bars have content: its first `built` (all of them for a part built through). */
export const builtBars = (id: PartId): number => partOf(id).built ?? partOf(id).bars;

/** The part's built film bars, in order (partBars without the held tail). */
export const builtPartBars = (id: PartId): number[] => partBars(id).slice(0, builtBars(id));

/** Where the part's content ends (exclusive): the first frame of its held tail, or partEnd for a part built through. */
export const builtEnd = (id: PartId): number => partFrame(id, builtBars(id) + 1);

/** A part's held tail: its unbuilt bars, [from, to) in film frames. */
export type Tail = { readonly id: PartId; readonly from: number; readonly to: number };

/** The part's held tail, or null when it is built through. */
export function partTail(id: PartId): Tail | null {
  const from = builtEnd(id);
  const to = partEnd(id);
  return from < to ? { id, from, to } : null;
}

/** Every held tail, in film order. */
export const TAILS: readonly Tail[] = FILM.map((p) => partTail(p.id)).filter((t): t is Tail => t !== null);

/** The held tail that instant `frame` lies in, if any. */
const tailAt = (frame: number): Tail | undefined => TAILS.find((t) => frame >= t.from && frame < t.to);

/** A stub (a part not built yet, between two built ones): its frames [from, to), the part it holds and the frame it holds, that part's last built frame. */
export type Stub = { readonly id: PartId; readonly from: number; readonly to: number; readonly holds: PartId; readonly frame: number };

/** Every stub, in film order (the v08 bridges until they are built). */
export const STUBS: readonly Stub[] = FILM.flatMap((p, i): Stub[] => {
  if (!p.stub) return [];
  const holds = FILM[i - 1].id;
  return [{ id: p.id, from: partStart(p.id), to: partEnd(p.id), holds, frame: builtEnd(holds) - 1 }];
});

/** The stub that instant `frame` lies in, if any. */
const stubAt = (frame: number): Stub | undefined => STUBS.find((s) => frame >= s.from && frame < s.to);

/** Whether the part is a stub (not built: it holds the part before it). */
export const isStub = (id: PartId): boolean => partOf(id).stub === true;

/**
 * Whether instant `frame` lies in a held tail or a stub (where nothing new is drawn and no drum or event of its own falls). A held tail
 * is also silent (scripts/audio/bgm.mjs gates TAILS to digital zero); a stub is not (what rings or pre-laps into it is heard).
 */
export const isHeld = (frame: number): boolean => tailAt(frame) !== undefined || stubAt(frame) !== undefined;

/**
 * The instant a held frame shows: inside a tail, the matching instant of the part's last built frame; inside a stub, of the last built
 * frame of the part before it (its output frame's offset kept, so its sub-frames are that frame's sub-frames, within half a frame of it);
 * elsewhere `frame` itself.
 */
export function heldFrame(frame: number): number {
  const t = tailAt(frame);
  if (t) return t.from - 1 + (frame - Math.round(frame));
  const s = stubAt(frame);
  return s ? s.frame + (frame - Math.round(frame)) : frame;
}

// ——— Seeds —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The map the film's random draws were approved on: the 36-bar v04 master (output/kaomoji-full-v04-4k.mp4, 2026-10-01). Not a map of
 * the film: only where each of these parts started then.
 */
const SEED_MAP: readonly Part[] = [
  { id: 'intro', bars: 4 },
  { id: 'swiss', bars: 4 },
  { id: 'riso', bars: 4 },
  { id: 'cosmos', bars: 4 },
  { id: 'club', bars: 4 },
  { id: 'break', bars: 6 },
  { id: 'drop2', bars: 8 },
  { id: 'outro', bars: 2 },
];

/** How far each part has moved since SEED_MAP (frames); a part that is not on it (the transition, the bridges) seeds with its own frames. */
const SEED_SHIFT: ReadonlyMap<PartId, number> = (() => {
  const m = new Map<PartId, number>();
  let start = 0;
  for (const p of SEED_MAP) {
    if (FIRST_BAR.has(p.id)) m.set(p.id, partStart(p.id) - start);
    start += p.bars * FRAMES_PER_BAR;
  }
  return m;
})();

/**
 * Bars inserted INSIDE a part since SEED_MAP (part-local bar numbers on FILM), as opposed to bars added at a part's end: the intro's
 * RAIN bar (intro 2) and the Swiss SCAN bar (swiss 4) of the 60-bar map, the interlude's GRAPH bar (break 6), and drop 2's new bars (5
 * the game's crane; 8–17 the kernel, the switch and act 2; 20 the bullet time: src/score/drop2.ts CARRIED). They were never approved, so
 * they seed with their own frames; the part's later bars seed as the bars they were on SEED_MAP (intro 3–5 as v04's intro 2–4, swiss 5 as
 * v04's swiss 4, break 7 as v04's break 6: the slingshot, carried over one bar later, keeps its approved draws and grain; drop2 6–7 as
 * v04's drop2 5–6, drop2 18–19 as v04's drop2 7–8).
 */
const SEED_NEW_BARS: Readonly<Partial<Record<PartId, readonly number[]>>> = { intro: [2], swiss: [4], break: [6], drop2: [5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20] };

/**
 * The frame a random draw at `frame` is seeded with: its place on SEED_MAP (the part-local position, from where the part started on
 * that map, less any bars inserted inside the part before it). Shakes, sparks, glitches, scrambles and the grain hash this instead of
 * the film frame, so a part keeps every approved draw wherever the map moves it. An integer offset per bar: sub-frames, floor() and
 * round() keep their relations inside a bar. A bar inserted inside a part (SEED_NEW_BARS) and a part that is not on SEED_MAP (the
 * transition, the bridges) seed with their own frames — as they were on the 61-bar map where they were approved (v07Frame), so v08's
 * bridges, which moved break 6 and drop 2's new bars on by a bar, re-roll none of them.
 */
export const seedFrame = (frame: number): number => {
  const { id, bar } = locate(frame);
  const shift = SEED_SHIFT.get(id);
  if (shift === undefined) return v07Frame(frame);
  const inserted = SEED_NEW_BARS[id] ?? [];
  if (inserted.includes(bar)) return v07Frame(frame);
  return frame - shift - inserted.filter((b) => b < bar).length * FRAMES_PER_BAR;
};

// ——— The 61-bar map (v07) ——————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The map before v08's bridges (bridgeA, bridgeB) were inserted between parts: the 61-bar v07 film (output/kaomoji-full-v07-1x.mp4,
 * 2026-10-03). Not a map of the film: only where each of these parts started then.
 */
const V07_MAP: readonly Part[] = [
  { id: 'intro', bars: 5 },
  { id: 'swiss', bars: 5 },
  { id: 'riso', bars: 4 },
  { id: 'transition', bars: 2 },
  { id: 'cosmos', bars: 6 },
  { id: 'club', bars: 6 },
  { id: 'break', bars: 8 },
  { id: 'drop2', bars: 20 },
  { id: 'outro', bars: 5 },
];

/** How far each part has moved since V07_MAP (frames): one bar from the club to drop 2, two for the outro. */
const V07_SHIFT: ReadonlyMap<PartId, number> = (() => {
  const m = new Map<PartId, number>();
  let start = 0;
  for (const p of V07_MAP) {
    if (FIRST_BAR.has(p.id)) m.set(p.id, partStart(p.id) - start);
    start += p.bars * FRAMES_PER_BAR;
  }
  return m;
})();

/**
 * The frame instant `frame` was on the 61-bar v07 map: for code approved there that hashes, oscillates or prints its film frame itself
 * (hash(f), Math.sin(f / 19), noise1(f)) rather than seedFrame, so the bridges move its part without re-rolling its draws. An integer
 * offset per part (sub-frames, floor() and round() keep their relations); a part that is not on V07_MAP (a bridge) is its own frame.
 */
export const v07Frame = (frame: number): number => frame - (V07_SHIFT.get(locate(frame).id) ?? 0);

/**
 * The frame on today's map of instant `frame` on the 61-bar v07 map (v07Frame's inverse): for tables fitted there in film frames (the
 * v07 mix's automation keys). By the part `frame` lay in there: a frame on a part line belongs to the part that starts on it (5376, drop 2's
 * end and outro 1.1 there, is outro 1.1 here: write drop 2's end as partEnd('drop2')); frames before the film are the intro's, after it the
 * outro's.
 */
export function fromV07(frame: number): number {
  let id: PartId = V07_MAP[0].id;
  let start = 0;
  for (const p of V07_MAP) {
    if (frame >= start) id = p.id;
    start += p.bars * FRAMES_PER_BAR;
  }
  return frame + (V07_SHIFT.get(id) ?? 0);
}
